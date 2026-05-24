"""
FastAPI application — REST API for the Arad Quality Agent.

Endpoints:
  - POST /studies/grr       — Submit a new GR&R study
  - GET  /studies/{id}       — Retrieve study results
  - POST /spc/analyze        — Run SPC analysis on a dataset
  - GET  /health             — Health check
"""

from __future__ import annotations

import logging
from typing import Any

import uuid
import pandas as pd
import mlflow
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from db.database import AsyncSessionLocal
from db.models import GrrStudy, ReviewQueue
from grr.calculator import grr_xbar_r
from grr.acceptance import evaluate

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Arad Quality Agent API",
    description="Manufacturing quality control — GR&R analysis, SPC monitoring, and intelligent alerting.",
    version="0.1.0",
)


# ─── Request / Response schemas ──────────────────────────────────────────────

class GRRStudyRequest(BaseModel):
    """Request body for submitting a GR&R study."""

    part_ids: list[str] = Field(..., min_length=1)
    operator_ids: list[str] = Field(..., min_length=1)
    measurements: list[dict[str, Any]] = Field(
        ..., description="List of {part, operator, value} dicts"
    )
    method: str = Field("xbar_r", pattern="^(xbar_r|anova)$",
                        description="xbar_r = AIAG Xbar-R method, anova = Two-way ANOVA method")
    tolerance: float | None = None
    equipment_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class GRRStudyResponse(BaseModel):
    """Response body for a completed GR&R study."""

    study_id: str
    grr_percent: float
    acceptance: str
    ndc: int
    details: dict[str, Any] = {}


class SPCRequest(BaseModel):
    """Request body for SPC analysis."""

    values: list[float] = Field(..., min_length=2)
    chart_type: str = Field("xbar_r", pattern="^(xbar_r|i_mr|p)$")
    subgroup_size: int = Field(5, ge=2)


class SPCResponse(BaseModel):
    """Response body for SPC analysis."""

    chart_type: str
    ucl: float
    cl: float
    lcl: float
    out_of_control_indices: list[int] = []
    nelson_violations: dict[str, list[int]] = {}


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "0.1.0"


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse()


@app.post(
    "/studies/grr",
    response_model=GRRStudyResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["grr"],
)
async def create_grr_study(body: GRRStudyRequest) -> GRRStudyResponse:
    """
    Submit measurement data and run a GR&R study.
    """
    try:
        # 1. Convert body.measurements to DataFrame
        df = pd.DataFrame(body.measurements)
        if "value" in df.columns:
            df = df.rename(columns={"value": "measurement"})

        # 2. Call the appropriate calculator
        if body.method == "xbar_r":
            result = grr_xbar_r(df, tolerance=body.tolerance)
        elif body.method == "anova":
            from grr.calculator import grr_anova
            result = grr_anova(df, tolerance=body.tolerance)

        # 3. Evaluate results
        verdict = evaluate(result)

        # 4. Generate study_id
        study_id_str = str(uuid.uuid4())
        study_id = uuid.UUID(study_id_str)

        # 5. Save to grr_studies using AsyncSessionLocal
        equipment_id = body.equipment_id or (body.part_ids[0] if body.part_ids else "unknown")
        characteristic_name = body.metadata.get("characteristic_name", "unknown")
        now = datetime.now(timezone.utc)
        
        async with AsyncSessionLocal() as session:
            study = GrrStudy(
                id=study_id,
                equipment_id=equipment_id,
                characteristic_name=characteristic_name,
                status=verdict.level.value,
                ev=result.repeatability,
                av=result.reproducibility,
                pv=result.part_variation,
                grr_pct=result.total_grr,
                ndc=result.ndc,
                acceptance_decision=verdict.level.value,
                started_at=now,
                completed_at=now
            )
            session.add(study)

            # 6. Insert into review_queue if required
            if verdict.requires_human_review:
                review_item = ReviewQueue(
                    study_id=study_id,
                    status="pending"
                )
                session.add(review_item)

            await session.commit()

        # 7. Log to MLflow
        mlflow.set_experiment("grr_studies")
        with mlflow.start_run(run_name=study_id_str):
            mlflow.log_params({
                "method": body.method,
                "n_parts": len(body.part_ids),
                "n_operators": len(body.operator_ids)
            })
            mlflow.log_metrics({
                "grr_pct": result.total_grr,
                "ev": result.repeatability,
                "av": result.reproducibility,
                "ndc": result.ndc
            })
            mlflow.set_tag("acceptance", verdict.level.value)

        # 8. Return response
        return GRRStudyResponse(
            study_id=study_id_str,
            grr_percent=result.total_grr,
            acceptance=verdict.level.value,
            ndc=result.ndc,
            details=result.details or {}
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@app.get("/studies/{study_id}", response_model=GRRStudyResponse, tags=["grr"])
async def get_study(study_id: str) -> GRRStudyResponse:
    """
    Retrieve results for a previously submitted GR&R study.
    """
    try:
        study_uuid = uuid.UUID(study_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid study ID format")

    async with AsyncSessionLocal() as session:
        study = await session.get(GrrStudy, study_uuid)
        if not study:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Study not found"
            )
        
        return GRRStudyResponse(
            study_id=str(study.id),
            grr_percent=study.grr_pct,
            acceptance=study.acceptance_decision,
            ndc=study.ndc,
            details={
                "equipment_id": study.equipment_id,
                "characteristic_name": study.characteristic_name,
                "ev": study.ev,
                "av": study.av,
                "pv": study.pv,
                "status": study.status
            }
        )


@app.post("/spc/analyze", response_model=SPCResponse, tags=["spc"])
async def analyze_spc(body: SPCRequest) -> SPCResponse:
    """
    Run SPC control chart analysis and Nelson rule evaluation.
    """
    # TODO: Call spc.control_charts based on body.chart_type
    # TODO: Run spc.nelson_rules.evaluate_all_rules() on the chart data
    # TODO: Return SPCResponse with limits and violations
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="SPC analysis endpoint not yet implemented",
    )
