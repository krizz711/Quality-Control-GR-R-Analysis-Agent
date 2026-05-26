"""
Phase 6 API additions — AI-powered quality intelligence endpoints.

New endpoints:
  POST /studies/{study_id}/narrative   — Claude GR&R narrative + root cause
  POST /spc/predict                    — Predictive quality risk before violations
  POST /spc/interpret                  — NL interpretation of SPC violations
  POST /chat                           — Conversational quality engineering agent
  GET  /studies/{study_id}/report      — Download PDF report (fixes NotImplementedError)

Add these routes into api/main.py by importing from this module,
or paste the endpoint functions directly into main.py.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from agent.llm_analyst import (
    GRRNarrative,
    PredictiveInsight,
    SPCNarrative,
    answer_quality_question,
    generate_grr_narrative,
    generate_predictive_insight,
    interpret_spc_violations,
)
from core.config import settings
from db.database import AsyncSessionLocal
from db.models import GrrStudy
from grr.acceptance import AcceptanceVerdict, AcceptanceLevel
from grr.calculator import GRRResult
from grr.report_generator import create_pdf

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ─── Request / Response schemas ──────────────────────────────────────────────

class GRRNarrativeResponse(BaseModel):
    study_id: str
    equipment_id: str
    characteristic_name: str
    grr_percent: float
    acceptance: str
    narrative: dict[str, Any]


class SPCInterpretRequest(BaseModel):
    chart_type: str = "i_mr"
    part_number: str = "UNKNOWN"
    characteristic_name: str = "UNKNOWN"
    violated_rules: dict[str, list[int]]
    ucl: float
    cl: float
    lcl: float
    recent_values: list[float] = Field(..., min_length=2)


class SPCInterpretResponse(BaseModel):
    pattern_description: str
    manufacturing_significance: str
    likely_causes: list[str]
    urgency: str
    recommended_actions: list[str]


class PredictRequest(BaseModel):
    part_number: str
    characteristic_name: str
    values_history: list[float] = Field(..., min_length=5)
    ucl: float
    cl: float
    lcl: float
    recent_grr_pct: float | None = None


class PredictResponse(BaseModel):
    trend_summary: str
    predicted_violation_risk: str
    time_to_action: str
    leading_indicators: list[str]
    preventive_actions: list[str]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3)
    conversation_history: list[ChatMessage] = Field(default_factory=list)
    context_override: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    answer: str
    context_used: list[str]  # which data sources were included


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _check_api_key() -> str:
    """Return API key or raise 503 if not configured."""
    key = settings.gemini_api_key
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY not configured. Set it in .env to enable AI features.",
        )
    return key


async def _load_study(study_id: str) -> GrrStudy:
    """Load a GrrStudy by UUID or raise 404."""
    try:
        uid = uuid.UUID(study_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid study ID format")

    async with AsyncSessionLocal() as session:
        study = await session.get(GrrStudy, uid)
        if not study:
            raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
        return study


async def _build_system_context() -> dict[str, Any]:
    """
    Snapshot current system state to inject into the conversational agent.
    Pulls recent GR&R studies and unacknowledged violations from TimescaleDB.
    """
    context: dict[str, Any] = {}

    try:
        async with AsyncSessionLocal() as session:
            # Recent GR&R studies
            result = await session.execute(
                text("""
                    SELECT equipment_id, characteristic_name, grr_pct, ndc,
                           acceptance_decision, created_at
                    FROM grr_studies
                    ORDER BY created_at DESC
                    LIMIT 10
                """)
            )
            studies = [dict(row) for row in result.mappings().all()]
            context["recent_grr_studies"] = studies

            # Unacknowledged violations
            result = await session.execute(
                text("""
                    SELECT part_number, characteristic_name, violation_type,
                           severity, measured_value, ucl, lcl, created_at
                    FROM quality_violations
                    WHERE alert_sent = FALSE OR acknowledged_by IS NULL
                    ORDER BY created_at DESC
                    LIMIT 20
                """)
            )
            violations = [dict(row) for row in result.mappings().all()]
            context["open_violations"] = violations

            # Pending reviews
            result = await session.execute(
                text("""
                    SELECT rq.id, gs.equipment_id, gs.grr_pct, gs.acceptance_decision
                    FROM review_queue rq
                    JOIN grr_studies gs ON gs.id = rq.study_id
                    WHERE rq.status = 'pending'
                    ORDER BY rq.created_at DESC
                    LIMIT 5
                """)
            )
            reviews = [dict(row) for row in result.mappings().all()]
            context["pending_reviews"] = reviews

    except Exception as exc:
        logger.warning("Could not load full system context: %s", exc)
        context["error"] = "Partial context — database may be unavailable"

    return context


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/studies/{study_id}/narrative",
    response_model=GRRNarrativeResponse,
    summary="Generate AI narrative for a GR&R study",
    description=(
        "Uses Claude to generate a natural-language GR&R study report including "
        "root-cause analysis, corrective action recommendations, and production "
        "risk assessment. Study must already exist in the database."
    ),
)
async def get_grr_narrative(study_id: str) -> GRRNarrativeResponse:
    api_key = _check_api_key()
    study = await _load_study(study_id)

    # Reconstruct enough of GRRResult for the prompt
    grr_result_dict = {
        "total_grr": study.grr_pct or 0.0,
        "repeatability": study.ev or 0.0,
        "reproducibility": study.av or 0.0,
        "part_variation": study.pv or 0.0,
        "total_variation": (
            ((study.ev or 0) ** 2 + (study.av or 0) ** 2 + (study.pv or 0) ** 2) ** 0.5
        ),
        "ndc": study.ndc or 0,
        "details": {"method": "xbar_r"},
    }
    verdict_dict = {
        "level": study.acceptance_decision or "unknown",
        "grr_percent": study.grr_pct or 0.0,
        "ndc": study.ndc or 0,
        "ndc_adequate": (study.ndc or 0) >= 5,
    }

    narrative: GRRNarrative = await generate_grr_narrative(
        grr_result=grr_result_dict,
        verdict=verdict_dict,
        equipment_id=study.equipment_id,
        characteristic_name=study.characteristic_name,
        api_key=api_key,
    )

    return GRRNarrativeResponse(
        study_id=study_id,
        equipment_id=study.equipment_id,
        characteristic_name=study.characteristic_name,
        grr_percent=study.grr_pct or 0.0,
        acceptance=study.acceptance_decision or "unknown",
        narrative={
            "summary": narrative.summary,
            "root_cause_analysis": narrative.root_cause_analysis,
            "recommendations": narrative.recommendations,
            "risk_assessment": narrative.risk_assessment,
            "confidence": narrative.confidence,
        },
    )


@router.get(
    "/studies/{study_id}/report",
    summary="Download PDF report for a GR&R study",
    description="Generates and returns a PDF report for the specified study. Fixes the NotImplementedError in the base orchestrator.",
    response_class=Response,
)
async def download_grr_report(study_id: str) -> Response:
    """
    Generate a PDF report for a completed GR&R study.
    Returns raw PDF bytes with appropriate Content-Disposition header.
    """
    study = await _load_study(study_id)

    # Reconstruct GRRResult and AcceptanceVerdict from stored data
    ev = study.ev or 0.0
    av = study.av or 0.0
    pv = study.pv or 0.0
    grr_pct = study.grr_pct or 0.0
    ndc = study.ndc or 0
    tv = ((ev**2 + av**2 + pv**2) ** 0.5) if (ev or av or pv) else 1.0

    result = GRRResult(
        total_grr=grr_pct,
        repeatability=ev,
        reproducibility=av,
        part_variation=pv,
        total_variation=tv,
        ndc=ndc,
        details={"method": "xbar_r"},
    )

    acceptance_str = study.acceptance_decision or "not_acceptable"
    try:
        level = AcceptanceLevel(acceptance_str)
    except ValueError:
        level = AcceptanceLevel.NOT_ACCEPTABLE

    verdict = AcceptanceVerdict(
        level=level,
        grr_percent=grr_pct,
        ndc=ndc,
        ndc_adequate=ndc >= 5,
        remarks=[
            f"%GR&R = {grr_pct:.1f}% — {acceptance_str}",
            f"NDC = {ndc}",
            f"Equipment: {study.equipment_id}",
        ],
        requires_human_review=(level == AcceptanceLevel.CONDITIONAL),
    )

    from datetime import date
    metadata = {
        "Study Date": str(study.created_at.date() if study.created_at else date.today()),
        "Equipment ID": study.equipment_id,
        "Characteristic": study.characteristic_name,
        "Method": "Xbar-R",
        "Generated By": "Arad Quality Agent",
    }

    pdf_bytes = create_pdf(result, verdict, study_metadata=metadata)

    filename = f"grr_report_{study_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/spc/interpret",
    response_model=SPCInterpretResponse,
    summary="AI interpretation of SPC Nelson rule violations",
    description=(
        "Pass SPC violation data and receive a manufacturing-meaningful "
        "interpretation with likely root causes and recommended actions."
    ),
)
async def interpret_spc(body: SPCInterpretRequest) -> SPCInterpretResponse:
    api_key = _check_api_key()

    narrative: SPCNarrative = await interpret_spc_violations(
        chart_type=body.chart_type,
        part_number=body.part_number,
        characteristic_name=body.characteristic_name,
        violated_rules=body.violated_rules,
        control_limits={"ucl": body.ucl, "cl": body.cl, "lcl": body.lcl},
        recent_values=body.recent_values,
        api_key=api_key,
    )

    return SPCInterpretResponse(
        pattern_description=narrative.pattern_description,
        manufacturing_significance=narrative.manufacturing_significance,
        likely_causes=narrative.likely_causes,
        urgency=narrative.urgency,
        recommended_actions=narrative.recommended_actions,
    )


@router.post(
    "/spc/predict",
    response_model=PredictResponse,
    summary="Predict quality violations before they occur",
    description=(
        "Claude analyzes measurement trends and predicts future violations "
        "before Nelson rules fire. Acts as an early-warning system."
    ),
)
async def predict_violations(body: PredictRequest) -> PredictResponse:
    api_key = _check_api_key()

    insight: PredictiveInsight = await generate_predictive_insight(
        part_number=body.part_number,
        characteristic_name=body.characteristic_name,
        values_history=body.values_history,
        control_limits={"ucl": body.ucl, "cl": body.cl, "lcl": body.lcl},
        recent_grr_pct=body.recent_grr_pct,
        api_key=api_key,
    )

    return PredictResponse(
        trend_summary=insight.trend_summary,
        predicted_violation_risk=insight.predicted_violation_risk,
        time_to_action=insight.time_to_action,
        leading_indicators=insight.leading_indicators,
        preventive_actions=insight.preventive_actions,
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Conversational quality engineering agent",
    description=(
        "Ask quality engineering questions in plain English. "
        "Claude has access to current GR&R studies, SPC violations, "
        "and pending reviews. Maintains conversation context across turns."
    ),
)
async def chat_with_agent(body: ChatRequest) -> ChatResponse:
    api_key = _check_api_key()

    # Load live system context (or use override for testing)
    if body.context_override is not None:
        context = body.context_override
        context_sources = ["context_override"]
    else:
        context = await _build_system_context()
        context_sources = [k for k in context if k != "error"]

    history = [{"role": m.role, "content": m.content} for m in body.conversation_history]

    answer = await answer_quality_question(
        question=body.question,
        context=context,
        conversation_history=history,
        api_key=api_key,
    )

    return ChatResponse(answer=answer, context_used=context_sources)
