"""
Orchestrator — Central agent that coordinates quality-control workflows.

Responsibilities:
  1. Receive measurement events (Kafka / API).
  2. Dispatch to the appropriate analysis module (GR&R, SPC).
  3. Evaluate results against acceptance criteria.
  4. Trigger alerts (Slack, email) when out-of-spec conditions are detected.
  5. Log experiment runs to MLflow for traceability.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import mlflow
import numpy as np
import pandas as pd
from sqlalchemy import text

from agent.alert_engine import AlertEngine
from agent.alerts import send_slack_alert
from core.config import settings
from db.database import AsyncSessionLocal
from db.models import QualityViolation

logger = logging.getLogger(__name__)


# ─── Domain models ────────────────────────────────────────────────────────────

@dataclass
class MeasurementEvent:
    """Incoming measurement payload from the shop floor."""

    part_id: str
    operator_id: str
    values: list[float] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisResult:
    """Unified result envelope returned by every analysis module."""

    study_type: str  # "grr" | "spc"
    passed: bool
    summary: dict[str, Any] = field(default_factory=dict)
    alerts: list[str] = field(default_factory=list)


# ─── Orchestrator ─────────────────────────────────────────────────────────────

class QualityOrchestrator:
    """
    Main agent loop that ties together GR&R studies, SPC monitoring,
    acceptance gating, alerting, and experiment tracking.
    """

    def __init__(self) -> None:
        self.alert_engine = AlertEngine()
        self.logger = logging.getLogger(__name__)
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        self.logger.info("QualityOrchestrator initialised")

    # ── Kafka integration ────────────────────────────────────────────────────

    async def start_consumer_loop(self) -> None:
        """
        Long-running loop that polls Kafka for new measurement events
        and dispatches them to the appropriate handler.
        """
        from confluent_kafka import Consumer

        consumer = Consumer(
            {
                "bootstrap.servers": settings.kafka_bootstrap_servers,
                "group.id": "arad-quality-orchestrator",
                "auto.offset.reset": "earliest",
                "enable.auto.commit": False,
            }
        )
        consumer.subscribe(["quality.measurements"])

        self.logger.info("Kafka consumer loop started on topic quality.measurements")
        try:
            while True:
                kafka_message = consumer.poll(timeout=1.0)
                if kafka_message is None:
                    continue
                if kafka_message.error():
                    self.logger.error("Kafka consumer error: %s", kafka_message.error())
                    continue

                try:
                    raw = kafka_message.value()
                    payload = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                    event = json.loads(payload)
                    await self.handle_measurement_event(event)
                    consumer.commit(message=kafka_message, asynchronous=False)
                except Exception:
                    self.logger.exception("Failed to process Kafka message")
        finally:
            consumer.close()

    # ── Event handling ───────────────────────────────────────────────────────

    async def handle_measurement_event(self, event: dict) -> dict:
        """
        Main entry point. Called for every Kafka message.
        event dict has keys: part_number, characteristic_name,
        measured_value, nominal_value, equipment_id, operator_id,
        shift, timestamp, and optionally study_type.
        """
        study_type = event.get("study_type", "spc")

        if study_type == "spc":
            return await self._handle_spc_event(event)
        if study_type == "grr":
            return await self._handle_grr_event(event)

        self.logger.warning(f"Unknown study_type: {study_type}")
        return {"status": "skipped", "reason": f"unknown study_type: {study_type}"}

    async def handle_event(self, event: MeasurementEvent) -> AnalysisResult:
        """
        Legacy adapter for MeasurementEvent payloads (tests / older callers).
        """
        payload: dict[str, Any] = {
            "part_number": event.part_id,
            "operator_id": event.operator_id,
            "measured_value": event.values[-1] if event.values else 0.0,
            "study_type": event.metadata.get("study_type", "spc"),
            **event.metadata,
        }
        if event.metadata.get("study_type") == "grr" and event.values:
            payload["measurements"] = event.metadata.get("measurements", [])

        result = await self.handle_measurement_event(payload)
        passed = result.get("status") == "processed" and result.get(
            "acceptance", "acceptable"
        ) in ("acceptable",)
        return AnalysisResult(
            study_type=result.get("study_type", "unknown"),
            passed=passed,
            summary=result,
        )

    async def _handle_spc_event(self, event: dict) -> dict:
        """
        For a single measurement event:
        1. Pull last 30 measurements for same part+characteristic from TimescaleDB
        2. Append the new measurement
        3. Run individuals_mr_chart on the window
        4. Run evaluate_all_rules on I-chart values
        5. Persist any Rule 1 violations to quality_violations
        6. Run alert_engine.process_pending_violations()
        7. Return summary dict
        """
        from spc.control_charts import individuals_mr_chart
        from spc.nelson_rules import evaluate_all_rules

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT measured_value FROM measurements
                    WHERE part_number = :pn AND characteristic_name = :cn
                    ORDER BY timestamp DESC LIMIT 30
                """),
                {"pn": event["part_number"], "cn": event["characteristic_name"]},
            )
            rows = result.scalars().all()
            values = list(reversed(rows)) + [event["measured_value"]]

            if len(values) < 5:
                return {
                    "status": "skipped",
                    "reason": "insufficient_history",
                    "count": len(values),
                }

            i_chart, _ = individuals_mr_chart(values)
            chart_values = np.array(i_chart.points)
            sigma = i_chart.limits.sigma

            violations = evaluate_all_rules(
                chart_values, i_chart.limits.cl, sigma
            )

            rule1 = violations.get("rule_1", [])
            if rule1:
                now = datetime.now(timezone.utc)
                for idx in rule1:
                    session.add(
                        QualityViolation(
                            timestamp=now,
                            part_number=event["part_number"],
                            characteristic_name=event["characteristic_name"],
                            violation_type="nelson_rule_1",
                            severity="critical",
                            measured_value=float(chart_values[idx]),
                            ucl=i_chart.limits.ucl,
                            lcl=i_chart.limits.lcl,
                            alert_sent=False,
                        )
                    )
                await session.commit()

        await self.alert_engine.process_pending_violations()

        return {
            "status": "processed",
            "study_type": "spc",
            "values_used": len(values),
            "rule_1_violations": len(rule1),
            "total_violations": sum(len(v) for v in violations.values()),
        }

    async def _handle_grr_event(self, event: dict) -> dict:
        """
        For a GR&R trigger event:
        The event must have a 'measurements' key — list of
        {part, operator, value} dicts for the full study.
        1. Run grr_xbar_r
        2. Run evaluate
        3. Persist to grr_studies
        4. If CONDITIONAL: add to review_queue + alert
        5. Log to MLflow
        6. Return summary
        """
        from grr.acceptance import evaluate
        from grr.calculator import grr_xbar_r

        measurements = event.get("measurements", [])
        if not measurements:
            return {"status": "error", "reason": "no measurements in GRR event"}

        df = pd.DataFrame(measurements)
        df = df.rename(columns={"value": "measurement"})

        result = grr_xbar_r(df)
        verdict = evaluate(result)
        study_id = str(uuid.uuid4())

        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO grr_studies
                    (id, equipment_id, characteristic_name, status,
                     ev, av, pv, grr_pct, ndc, acceptance_decision,
                     started_at, completed_at, created_by)
                    VALUES (:id, :eq, :cn, :status,
                            :ev, :av, :pv, :grr, :ndc, :decision,
                            NOW(), NOW(), 'orchestrator')
                """),
                {
                    "id": study_id,
                    "eq": event.get("equipment_id", "unknown"),
                    "cn": event.get("characteristic_name", "unknown"),
                    "status": verdict.level.value,
                    "ev": result.repeatability,
                    "av": result.reproducibility,
                    "pv": result.part_variation,
                    "grr": result.total_grr,
                    "ndc": result.ndc,
                    "decision": verdict.level.value,
                },
            )

            if verdict.requires_human_review:
                await session.execute(
                    text("""
                        INSERT INTO review_queue (study_id, status, created_at)
                        VALUES (:sid, 'pending', NOW())
                    """),
                    {"sid": study_id},
                )
                await send_slack_alert(
                    settings.slack_webhook_url,
                    f"GR&R study requires human review.\n"
                    f"Equipment: {event.get('equipment_id')} | "
                    f"%GRR: {result.total_grr:.1f}% | NDC: {result.ndc}\n"
                    f"Review at: http://localhost:8000/docs#/reviews",
                    severity="warning",
                    study_id=study_id,
                )

            await session.commit()

        mlflow.set_experiment("grr_studies")
        with mlflow.start_run(run_name=study_id):
            mlflow.log_metrics(
                {
                    "grr_pct": result.total_grr,
                    "ndc": result.ndc,
                    "ev": result.repeatability,
                    "av": result.reproducibility,
                }
            )
            mlflow.set_tag("acceptance", verdict.level.value)
            mlflow.set_tag("equipment_id", event.get("equipment_id", "unknown"))

        return {
            "status": "processed",
            "study_type": "grr",
            "study_id": study_id,
            "grr_percent": result.total_grr,
            "acceptance": verdict.level.value,
            "requires_human_review": verdict.requires_human_review,
        }

    # ── Alerting ─────────────────────────────────────────────────────────────

    async def _send_alert(self, message: str, severity: str = "warning") -> None:
        """Dispatch an alert to configured channels (Slack webhook)."""
        await send_slack_alert(
            settings.slack_webhook_url,
            message,
            severity=severity,
        )

    # ── Reporting ────────────────────────────────────────────────────────────

    async def generate_report(self, study_id: str) -> bytes:
        """
        Build a PDF report for a completed study and return raw bytes.
        """
        raise NotImplementedError("Report generation not yet implemented")
