"""Additional /api routes for GR&R, SPC, alerts, dashboard, and audit log."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text

from backend.services import gemini_service as geminiService
from db.database import AsyncSessionLocal
from db.models import Alert, AuditLog, GrrStudy, Measurement
from grr.acceptance import evaluate
from grr.calculator import grr_anova, grr_xbar_r

logger = logging.getLogger(__name__)

router = APIRouter(tags=["quality-api"])


class GRRMeasurementInput(BaseModel):
    operator: str = Field(..., min_length=1)
    part: int = Field(..., ge=1)
    trial: int = Field(..., ge=1)
    value: float

    @model_validator(mode="after")
    def validate_required_fields(self) -> "GRRMeasurementInput":
        if not self.operator.strip():
            raise ValueError("operator is required")
        return self


class GRRAnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    measurements: list[GRRMeasurementInput] = Field(..., min_length=1)
    part_tolerance: float | None = Field(default=None, alias="partTolerance")

    @model_validator(mode="after")
    def validate_sample_sizes(self) -> "GRRAnalyzeRequest":
        operators = {item.operator.strip() for item in self.measurements if item.operator.strip()}
        parts = {item.part for item in self.measurements}
        trials = {item.trial for item in self.measurements}

        if len(operators) < 2:
            raise ValueError("GR&R analysis requires at least 2 operators")
        if len(parts) < 5:
            raise ValueError("GR&R analysis requires at least 5 parts")
        if len(trials) < 2:
            raise ValueError("GR&R analysis requires at least 2 trials")

        return self


class GRRAnalyzeResponse(BaseModel):
    grr_percent: float
    repeatability: float
    reproducibility: float
    number_of_distinct_categories: int
    ai_analysis: str
    timestamp: datetime


class GRRHistoryItem(BaseModel):
    id: str
    timestamp: datetime
    grr_percent: float | None = None
    verdict: Literal["pass", "acceptable", "fail"]
    operator_count: int
    part_count: int


class SPCDataRequest(BaseModel):
    process_name: str = Field(..., min_length=1)
    measurements: list[float] = Field(..., min_length=1)
    ucl: float | None = None
    lcl: float | None = None
    target: float | None = None

    @model_validator(mode="after")
    def validate_measurements(self) -> "SPCDataRequest":
        if not self.process_name.strip():
            raise ValueError("process_name is required")
        if not self.measurements:
            raise ValueError("measurements must not be empty")
        return self


class SPCViolation(BaseModel):
    rule: str
    index: int
    value: float
    description: str


class SPCDataResponse(BaseModel):
    mean: float
    std_dev: float
    ucl: float
    lcl: float
    violations: list[SPCViolation]
    ai_analysis: str


class SPCHistoryPoint(BaseModel):
    timestamp: datetime
    value: float
    part_number: str | None = None
    characteristic_name: str | None = None


class SPCHistoryResponse(BaseModel):
    process_name: str
    points: list[SPCHistoryPoint]


class DashboardSummaryResponse(BaseModel):
    total_grr_analyses: int
    passing_rate: float
    active_alerts_count: int
    recent_violations: list[dict[str, Any]]
    last_updated: datetime


class AlertTriggerRequest(BaseModel):
    type: Literal["grr_fail", "spc_violation", "trend_detected"]
    severity: Literal["low", "medium", "high", "critical"]
    message: str = Field(..., min_length=1)
    process_name: str = Field(..., min_length=1)


class AlertResponse(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    process_name: str
    status: str
    created_at: datetime
    resolved_at: datetime | None = None


class AlertTriggerResponse(BaseModel):
    alert_id: str
    created_at: datetime


class AlertListResponse(BaseModel):
    items: list[AlertResponse]
    total: int
    limit: int


class AlertResolveResponse(BaseModel):
    alert_id: str
    resolved_at: datetime


class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any] | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _verdict_from_grr(grr_percent: float | None) -> Literal["pass", "acceptable", "fail"]:
    if grr_percent is None:
        return "fail"
    if grr_percent < 10.0:
        return "pass"
    if grr_percent <= 30.0:
        return "acceptable"
    return "fail"


def _detect_western_electric_rules(values: list[float], center_line: float, sigma: float) -> list[SPCViolation]:
    violations: list[SPCViolation] = []
    if sigma <= 0:
        return violations

    upper_1 = center_line + sigma
    lower_1 = center_line - sigma
    upper_2 = center_line + 2 * sigma
    lower_2 = center_line - 2 * sigma
    upper_3 = center_line + 3 * sigma
    lower_3 = center_line - 3 * sigma

    for index, value in enumerate(values):
        if value > upper_3 or value < lower_3:
            violations.append(
                SPCViolation(
                    rule="rule_1",
                    index=index,
                    value=value,
                    description="One point beyond 3 sigma",
                )
            )

    for index in range(len(values) - 2):
        window = values[index : index + 3]
        above_2 = sum(value > upper_2 for value in window)
        below_2 = sum(value < lower_2 for value in window)
        if above_2 >= 2 or below_2 >= 2:
            violations.append(
                SPCViolation(
                    rule="rule_2",
                    index=index,
                    value=window[-1],
                    description="Two of three consecutive points beyond 2 sigma on the same side",
                )
            )

    for index in range(len(values) - 4):
        window = values[index : index + 5]
        above_1 = sum(value > upper_1 for value in window)
        below_1 = sum(value < lower_1 for value in window)
        if above_1 >= 4 or below_1 >= 4:
            violations.append(
                SPCViolation(
                    rule="rule_3",
                    index=index,
                    value=window[-1],
                    description="Four of five consecutive points beyond 1 sigma on the same side",
                )
            )

    streak = 1
    direction: int | None = None
    for index, value in enumerate(values):
        current_direction = 1 if value > center_line else -1 if value < center_line else 0
        if current_direction == 0:
            streak = 1
            direction = None
            continue
        if direction == current_direction:
            streak += 1
        else:
            direction = current_direction
            streak = 1
        if streak >= 8:
            violations.append(
                SPCViolation(
                    rule="rule_4",
                    index=index - 7,
                    value=value,
                    description="Eight consecutive points on the same side of the center line",
                )
            )

    return violations


async def _audit(session, actor: str, action: str, entity_type: str, entity_id: str, details: dict[str, Any]) -> None:
    session.add(
        AuditLog(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )


@router.post(
    "/grr/analyze",
    response_model=GRRAnalyzeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_grr(body: GRRAnalyzeRequest) -> GRRAnalyzeResponse:
    try:
        df = pd.DataFrame([item.model_dump() for item in body.measurements])
        df = df.rename(columns={"value": "measurement"})

        try:
            result = grr_xbar_r(df, tolerance=body.part_tolerance)
        except ValueError:
            result = grr_anova(df, tolerance=body.part_tolerance)

        verdict = evaluate(result)
        ai_analysis = await geminiService.analyzeGRR(
            {
                "measurements": [item.model_dump() for item in body.measurements],
                "part_tolerance": body.part_tolerance,
                "grr_percent": result.total_grr,
                "repeatability": result.repeatability,
                "reproducibility": result.reproducibility,
                "number_of_distinct_categories": result.ndc,
                "verdict": verdict.level.value,
            }
        )

        study_id = uuid.uuid4()
        timestamp = _now()
        operators = {item.operator.strip() for item in body.measurements if item.operator.strip()}
        parts = {item.part for item in body.measurements}

        async with AsyncSessionLocal() as session:
            session.add(
                GrrStudy(
                    id=study_id,
                    equipment_id=body.measurements[0].operator,
                    characteristic_name="grr_analysis",
                    status=verdict.level.value,
                    ev=result.repeatability,
                    av=result.reproducibility,
                    pv=result.part_variation,
                    grr_pct=result.total_grr,
                    ndc=result.ndc,
                    operator_count=len(operators),
                    part_count=len(parts),
                    acceptance_decision=verdict.level.value,
                    started_at=timestamp,
                    completed_at=timestamp,
                )
            )
            await _audit(
                session,
                actor="system",
                action="api_grr_analyze",
                entity_type="grr_study",
                entity_id=str(study_id),
                details={
                    "grr_percent": result.total_grr,
                    "ndc": result.ndc,
                    "operator_count": len(operators),
                    "part_count": len(parts),
                    "verdict": verdict.level.value,
                },
            )
            await session.commit()

        return GRRAnalyzeResponse(
            grr_percent=result.total_grr,
            repeatability=result.repeatability,
            reproducibility=result.reproducibility,
            number_of_distinct_categories=result.ndc,
            ai_analysis=ai_analysis,
            timestamp=timestamp,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("GR&R analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GR&R analysis failed") from exc


@router.get("/grr/history", response_model=list[GRRHistoryItem])
async def get_grr_history() -> list[GRRHistoryItem]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                SELECT id, completed_at, created_at, grr_pct, acceptance_decision,
                       operator_count, part_count
                FROM grr_studies
                ORDER BY COALESCE(completed_at, created_at) DESC
                LIMIT 50
                """
            )
        )
        rows = result.mappings().all()

    history: list[GRRHistoryItem] = []
    for row in rows:
        grr_percent = row.get("grr_pct")
        history.append(
            GRRHistoryItem(
                id=str(row["id"]),
                timestamp=row.get("completed_at") or row.get("created_at") or _now(),
                grr_percent=grr_percent,
                verdict=_verdict_from_grr(grr_percent),
                operator_count=int(row.get("operator_count") or 0),
                part_count=int(row.get("part_count") or 0),
            )
        )
    return history


@router.post("/spc/data", response_model=SPCDataResponse, status_code=status.HTTP_201_CREATED)
async def analyze_spc_data(body: SPCDataRequest) -> SPCDataResponse:
    try:
        values = [float(value) for value in body.measurements]
        mean_value = float(np.mean(values))
        std_dev = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0

        if body.ucl is not None and body.lcl is not None:
            ucl = float(body.ucl)
            lcl = float(body.lcl)
            sigma = abs(ucl - lcl) / 6 if ucl != lcl else std_dev
            center_line = float(body.target) if body.target is not None else mean_value
        else:
            sigma = std_dev
            center_line = float(body.target) if body.target is not None else mean_value
            ucl = center_line + 3 * sigma
            lcl = center_line - 3 * sigma

        violations = _detect_western_electric_rules(values, center_line, sigma)
        ai_analysis = await geminiService.analyzeSPCAnomaly(
            {
                "process_name": body.process_name,
                "measurements": values,
                "mean": mean_value,
                "std_dev": std_dev,
                "ucl": ucl,
                "lcl": lcl,
                "target": body.target,
                "violations": [violation.model_dump() for violation in violations],
            }
        )

        timestamp = _now()
        async with AsyncSessionLocal() as session:
            for value in values:
                session.add(
                    Measurement(
                        timestamp=timestamp,
                        part_number=body.process_name,
                        characteristic_name=body.process_name,
                        nominal_value=body.target,
                        measured_value=value,
                        unit=None,
                        operator_id="api_spc",
                        equipment_id=body.process_name,
                        shift=None,
                        created_by="api_spc",
                    )
                )

            await _audit(
                session,
                actor="system",
                action="api_spc_data",
                entity_type="spc_process",
                entity_id=body.process_name,
                details={
                    "mean": mean_value,
                    "std_dev": std_dev,
                    "ucl": ucl,
                    "lcl": lcl,
                    "violations": [violation.model_dump() for violation in violations],
                },
            )
            await session.commit()

        return SPCDataResponse(
            mean=mean_value,
            std_dev=std_dev,
            ucl=ucl,
            lcl=lcl,
            violations=violations,
            ai_analysis=ai_analysis,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("SPC analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="SPC analysis failed") from exc


@router.get("/spc/history/{process_name}", response_model=SPCHistoryResponse)
async def get_spc_history(process_name: str) -> SPCHistoryResponse:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                SELECT timestamp, measured_value, part_number, characteristic_name
                FROM measurements
                WHERE equipment_id = :process_name OR characteristic_name = :process_name
                ORDER BY timestamp DESC
                LIMIT 100
                """
            ),
            {"process_name": process_name},
        )
        rows = result.mappings().all()

    points = [
        SPCHistoryPoint(
            timestamp=row["timestamp"],
            value=float(row["measured_value"]),
            part_number=row.get("part_number"),
            characteristic_name=row.get("characteristic_name"),
        )
        for row in rows
    ]
    return SPCHistoryResponse(process_name=process_name, points=points)


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary() -> DashboardSummaryResponse:
    async with AsyncSessionLocal() as session:
        grr_result = await session.execute(
            text(
                "SELECT COUNT(*) AS count, AVG(CASE WHEN grr_pct < 10 THEN 1.0 ELSE 0.0 END) AS pass_rate FROM grr_studies"
            )
        )
        grr_row = grr_result.mappings().first() or {"count": 0, "pass_rate": 0.0}

        active_alerts_result = await session.execute(
            text("SELECT COUNT(*) AS count FROM alerts WHERE status = 'active'")
        )
        active_alerts_row = active_alerts_result.mappings().first() or {"count": 0}

        violations_result = await session.execute(
            text(
                """
                SELECT id, timestamp, part_number, characteristic_name, violation_type, severity, measured_value
                FROM quality_violations
                ORDER BY timestamp DESC
                LIMIT 5
                """
            )
        )
        violation_rows = violations_result.mappings().all()

    total = int(grr_row.get("count") or 0)
    pass_rate = float(grr_row.get("pass_rate") or 0.0) * 100.0 if total else 0.0

    return DashboardSummaryResponse(
        total_grr_analyses=total,
        passing_rate=pass_rate,
        active_alerts_count=int(active_alerts_row.get("count") or 0),
        recent_violations=[dict(row) for row in violation_rows],
        last_updated=_now(),
    )


@router.post("/alerts/trigger", response_model=AlertTriggerResponse, status_code=status.HTTP_201_CREATED)
async def trigger_alert(body: AlertTriggerRequest) -> AlertTriggerResponse:
    timestamp = _now()
    alert_id = uuid.uuid4()

    async with AsyncSessionLocal() as session:
        session.add(
            Alert(
                id=alert_id,
                type=body.type,
                severity=body.severity,
                message=body.message,
                process_name=body.process_name,
                status="active",
                payload={"source": "api", "triggered_by": "api"},
                created_at=timestamp,
            )
        )
        await _audit(
            session,
            actor="system",
            action="alert_triggered",
            entity_type="alert",
            entity_id=str(alert_id),
            details=body.model_dump(),
        )
        await session.commit()

    return AlertTriggerResponse(alert_id=str(alert_id), created_at=timestamp)


@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    status_filter: Literal["active", "resolved"] | None = Query(default=None, alias="status"),
    severity: Literal["critical", "high", "medium", "low"] | None = None,
    limit: int = Query(default=50, ge=1, le=50),
) -> AlertListResponse:
    conditions = []
    params: dict[str, Any] = {"limit": limit}
    if status_filter:
        conditions.append("status = :status")
        params["status"] = status_filter
    if severity:
        conditions.append("severity = :severity")
        params["severity"] = severity

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with AsyncSessionLocal() as session:
        count_result = await session.execute(
            text(f"SELECT COUNT(*) AS count FROM alerts {where_clause}"),
            {k: v for k, v in params.items() if k in {"status", "severity"}},
        )
        total_row = count_result.mappings().first() or {"count": 0}

        result = await session.execute(
            text(
                f"""
                SELECT id, type, severity, message, process_name, status, created_at, resolved_at
                FROM alerts
                {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
        rows = result.mappings().all()

    items: list[AlertResponse] = []
    for row in rows:
        row_data = dict(row)
        row_data["id"] = str(row_data["id"])
        items.append(AlertResponse.model_validate(row_data))

    return AlertListResponse(
        items=items,
        total=int(total_row.get("count") or 0),
        limit=limit,
    )


@router.put("/alerts/{alert_id}/resolve", response_model=AlertResolveResponse)
async def resolve_alert(alert_id: str) -> AlertResolveResponse:
    try:
        alert_uuid = uuid.UUID(alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid alert ID format") from exc

    resolved_at = _now()
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT * FROM alerts WHERE id = :id"), {"id": str(alert_uuid)})
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

        await session.execute(
            text(
                """
                UPDATE alerts
                SET status = 'resolved', resolved_at = :resolved_at, resolved_by = :resolved_by
                WHERE id = :id
                """
            ),
            {"resolved_at": resolved_at, "resolved_by": "api", "id": str(alert_uuid)},
        )
        await _audit(
            session,
            actor="system",
            action="alert_resolved",
            entity_type="alert",
            entity_id=str(alert_uuid),
            details={"status": "resolved"},
        )
        await session.commit()

    return AlertResolveResponse(alert_id=str(alert_uuid), resolved_at=resolved_at)


@router.get("/audit-log", response_model=list[AuditLogResponse])
async def get_audit_log() -> list[AuditLogResponse]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                SELECT id, created_at, actor, action, entity_type, entity_id, details
                FROM audit_logs
                ORDER BY created_at DESC
                LIMIT 200
                """
            )
        )
        rows = result.mappings().all()

    return [
        AuditLogResponse(
            id=str(row["id"]),
            timestamp=row["created_at"],
            actor=row["actor"],
            action=row["action"],
            entity_type=row["entity_type"],
            entity_id=row["entity_id"],
            details=row.get("details"),
        )
        for row in rows
    ]
