"""
FastAPI application — REST API for the Arad Quality Agent.

Endpoints:
  - POST /studies/grr       — Submit a new GR&R study
  - GET  /studies/{id}       — Retrieve study results
  - POST /spc/analyze        — Run SPC analysis on a dataset
  - GET  /health             — Health check
  - GET  /reviews            — List pending GR&R reviews
  - PATCH /reviews/{id}      — Approve or reject a review
"""

from __future__ import annotations

import logging
import time
from typing import Any

import uuid
import numpy as np
import pandas as pd
import mlflow
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status, Depends, Header
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field
from sqlalchemy import text

from agent.alert_engine import AlertEngine
from core.config import settings
from core.logging_config import setup_logging
from db.database import AsyncSessionLocal
from db.models import GrrStudy, QualityViolation, ReviewQueue
from grr.calculator import grr_xbar_r
from grr.acceptance import evaluate
from api.ai_routes import router as ai_router

setup_logging(level=settings.log_level)

logger = logging.getLogger(__name__)

async def verify_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_auth_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate API key",
        )

app = FastAPI(
    title="Arad Quality Agent API",
    description="Manufacturing quality control — GR&R analysis, SPC monitoring, and intelligent alerting.",
    version="0.1.0",
    dependencies=[Depends(verify_key)],
)

app.include_router(ai_router)


@app.middleware("http")
async def log_requests(request, call_next):
    import time
    import uuid

    request_id = str(uuid.uuid4())[:8]
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    logging.getLogger("api").info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


# Counter: total GRR studies run, labelled by acceptance level
grr_studies_total = Counter(
    "grr_studies_total",
    "Total GRR studies completed",
    ["acceptance_level"],
)

# Histogram: GRR study duration in seconds
grr_study_duration = Histogram(
    "grr_study_duration_seconds",
    "Time taken to complete a GRR study",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

# Counter: quality violations detected, labelled by rule
violations_detected = Counter(
    "violations_detected_total",
    "Total quality violations detected",
    ["violation_type"],
)

# Gauge: current pending reviews in review_queue
pending_reviews = Gauge(
    "pending_reviews_count",
    "Number of GRR studies awaiting human review",
)

Instrumentator().instrument(app).expose(app)


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
    part_number: str = "UNKNOWN"
    characteristic_name: str = "UNKNOWN"


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


class ReviewDecision(BaseModel):
    """Request body for approving or rejecting a pending GR&R review."""

    decision: str
    notes: str = ""
    decided_by: str


class ReviewQueueResponse(BaseModel):
    """Pending review row joined with GR&R study summary for the dashboard."""

    id: uuid.UUID
    study_id: uuid.UUID
    status: str
    assigned_to: str | None = None
    due_at: datetime | None = None
    created_at: datetime | None = None
    grr_pct: float | None = None
    ndc: int | None = None
    equipment_id: str
    characteristic_name: str


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
    start_time = time.time()
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
        else:
            raise ValueError(f"Unknown method: {body.method}")

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

        duration = time.time() - start_time
        grr_study_duration.observe(duration)
        grr_studies_total.labels(acceptance_level=verdict.level.value).inc()
        if verdict.requires_human_review:
            pending_reviews.inc()

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
    try:
        from spc.nelson_rules import evaluate_all_rules

        values = np.array(body.values)

        # ── 1. Run the appropriate chart ─────────────────────────────────
        if body.chart_type == "i_mr":
            from spc.control_charts import individuals_mr_chart

            i_chart, mr_chart = individuals_mr_chart(values)
            primary_chart = i_chart
            sigma = i_chart.limits.sigma

        elif body.chart_type == "xbar_r":
            from spc.control_charts import xbar_r_chart

            n = body.subgroup_size
            if n < 2 or n > 10:
                raise ValueError(
                    f"subgroup_size {n} not supported for xbar_r (must be 2–10)"
                )
            n_full = (len(body.values) // n) * n
            values = np.array(body.values[:n_full])  # drop partial last subgroup
            
            rows = [{"subgroup": i // n, "value": v}
                    for i, v in enumerate(values)]
            df = pd.DataFrame(rows)
            xbar, r_chart = xbar_r_chart(df)
            primary_chart = xbar
            sigma = xbar.limits.sigma

        elif body.chart_type == "p":
            from spc.control_charts import p_chart

            counts = [int(v) for v in body.values]
            sizes = [body.subgroup_size] * len(counts)
            primary_chart = p_chart(counts, sizes)
            sigma = (primary_chart.limits.ucl - primary_chart.limits.cl) / 3

        else:
            raise ValueError(f"Unsupported chart_type: {body.chart_type}")

        # ── 2. Nelson rules on the primary chart points ──────────────────
        if not primary_chart.points:
            raise ValueError("Chart produced no points — check input data")
        chart_values = np.array(primary_chart.points)
        nelson_violations = evaluate_all_rules(chart_values, primary_chart.limits.cl, sigma)

        # ── 3. Persist Rule 1 violations (critical) ──────────────────────
        rule_1_indices = nelson_violations.get("rule_1", [])
        if rule_1_indices:
            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as session:
                for idx in rule_1_indices:
                    violation = QualityViolation(
                        timestamp=now,
                        part_number=body.part_number,
                        characteristic_name=body.characteristic_name,
                        violation_type="nelson_rule_1",
                        severity="critical",
                        measured_value=float(chart_values[idx]),
                        ucl=primary_chart.limits.ucl,
                        lcl=primary_chart.limits.lcl,
                        alert_sent=False,
                    )
                    session.add(violation)
                await session.commit()

            logger.info(
                "Persisted %d Nelson Rule 1 violations to quality_violations",
                len(rule_1_indices),
            )

        if rule_1_indices:
            sent = await AlertEngine().process_pending_violations()
            logger.info("Alert engine processed pending violations — sent %d", sent)

        for rule_name, indices in nelson_violations.items():
            if indices:
                violations_detected.labels(violation_type=rule_name).inc(len(indices))

        # ── 4. Return response ───────────────────────────────────────────
        return SPCResponse(
            chart_type=body.chart_type,
            ucl=primary_chart.limits.ucl,
            cl=primary_chart.limits.cl,
            lcl=primary_chart.limits.lcl,
            out_of_control_indices=primary_chart.out_of_control,
            nelson_violations=nelson_violations,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@app.get("/reviews", response_model=list[ReviewQueueResponse], tags=["reviews"])
async def list_pending_reviews() -> list[ReviewQueueResponse]:
    """Returns all pending review_queue rows for the quality engineer dashboard."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT rq.id, rq.study_id, rq.status, rq.assigned_to,
                       rq.due_at, rq.created_at,
                       gs.grr_pct, gs.ndc, gs.equipment_id, gs.characteristic_name
                FROM review_queue rq
                JOIN grr_studies gs ON gs.id = rq.study_id
                WHERE rq.status = 'pending'
                ORDER BY rq.created_at DESC
            """)
        )
        rows = result.mappings().all()
        return [ReviewQueueResponse.model_validate(row) for row in rows]


@app.patch("/reviews/{review_id}", tags=["reviews"])
async def decide_review(review_id: str, body: ReviewDecision) -> dict[str, Any]:
    """
    Quality engineer approves or rejects a CONDITIONAL GR&R study.
    Updates both review_queue and grr_studies tables.
    """
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="decision must be 'approved' or 'rejected'",
        )

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT * FROM review_queue WHERE id = :id"),
            {"id": review_id},
        )
        review = result.mappings().first()

        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review {review_id} not found",
            )

        if review["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Review already decided: {review['status']}",
            )

        await session.execute(
            text("""
                UPDATE review_queue
                SET status = :decision,
                    decision_notes = :notes,
                    decided_at = NOW(),
                    assigned_to = :decided_by
                WHERE id = :id
            """),
            {
                "decision": body.decision,
                "notes": body.notes,
                "decided_by": body.decided_by,
                "id": review_id,
            },
        )

        await session.execute(
            text("""
                UPDATE grr_studies
                SET status = :decision,
                    reviewed_by = :decided_by,
                    review_notes = :notes
                WHERE id = :study_id
            """),
            {
                "decision": body.decision,
                "decided_by": body.decided_by,
                "notes": body.notes,
                "study_id": str(review["study_id"]),
            },
        )

        await session.commit()

        return {
            "review_id": review_id,
            "study_id": str(review["study_id"]),
            "decision": body.decision,
            "decided_by": body.decided_by,
            "message": f"Study {body.decision} successfully",
        }
