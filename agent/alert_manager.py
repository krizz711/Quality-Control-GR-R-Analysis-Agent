from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aioredis
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from core.config import settings
from agent import alerts as alerts_mod
from db.database import AsyncSessionLocal
from db.models import Alert, AuditLog, NotificationDelivery

logger = logging.getLogger(__name__)


@dataclass
class AlertEvent:
    type: str
    severity: str
    message: str
    process_name: str
    payload: Optional[Dict[str, Any]] = None
    grr_pct: Optional[float] = None


class AlertManager:
    """Central alert dispatch with dedupe, retries, DB audit, and multi-channel delivery.

    Usage: AlertManager().send(AlertEvent(...))
    """

    DEDUPE_TTL = 15 * 60

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.redis_url
        self._redis: Optional[aioredis.Redis] = None

    async def _redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = await aioredis.from_url(self.redis_url)
        return self._redis

    def _dedupe_key(self, ev: AlertEvent) -> str:
        h = hashlib.sha1(json.dumps({"type": ev.type, "proc": ev.process_name, "msg": ev.message}).encode())
        return f"alert:d:{h.hexdigest()}"

    async def _record_audit(self, session, actor: str, action: str, entity_type: str, entity_id: str, details: dict | None = None) -> None:
        session.add(
            AuditLog(
                actor=actor,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details or {},
            )
        )

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(5), retry=retry_if_exception_type(Exception))
    async def _send_slack_with_retry(self, webhook_url: str, payload: dict) -> Any:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(webhook_url, json=payload)
            r.raise_for_status()
            return r.json()

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(5), retry=retry_if_exception_type(Exception))
    async def _send_email_with_retry(self, *args, **kwargs):
        # delegate to existing helper which performs a thread call if needed
        return await alerts_mod.send_email_alert(*args, **kwargs)

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(5), retry=retry_if_exception_type(Exception))
    async def _send_sms_with_retry(self, *args, **kwargs):
        return await alerts_mod.send_sms_alert(*args, **kwargs)

    async def send(self, ev: AlertEvent) -> None:
        """Main entry: dedupe, persist alert record, dispatch channels, create Jira if required."""
        dedupe_key = self._dedupe_key(ev)
        redis = await self._redis()
        if await redis.get(dedupe_key):
            logger.info("Alert dedupe hit, skipping: %s %s", ev.type, ev.process_name)
            return

        # Persist alert record + mark dedupe key
        async with AsyncSessionLocal() as session:
            alert = Alert(
                type=ev.type,
                severity=ev.severity,
                message=ev.message,
                process_name=ev.process_name,
                payload=ev.payload or {},
            )
            session.add(alert)
            await session.commit()
            await session.refresh(alert)

            # Set dedupe key in Redis
            await redis.set(dedupe_key, str(alert.id), ex=self.DEDUPE_TTL)

            # Dispatch channels in parallel where applicable
            tasks: List[asyncio.Task] = []

            # Slack (all severities)
            if settings.slack_webhook_url:
                slack_payload = {
                    "attachments": [
                        {
                            "color": "#ff0000" if ev.severity == "critical" else "#ffcc00",
                            "title": f"Quality Alert — {ev.severity.upper()}",
                            "text": ev.message,
                            "ts": int(datetime.now(timezone.utc).timestamp()),
                        }
                    ]
                }

                async def _do_slack():
                    try:
                        await self._send_slack_with_retry(settings.slack_webhook_url, slack_payload)
                        session.add(
                            NotificationDelivery(alert_id=alert.id, channel="slack", status="sent", recipient=None)
                        )
                        await session.commit()
                        await self._record_audit(session, "system", "send_slack", "alert", str(alert.id), {"severity": ev.severity})
                    except Exception as exc:
                        session.add(
                            NotificationDelivery(alert_id=alert.id, channel="slack", status="failed", error_message=str(exc))
                        )
                        await session.commit()
                        logger.exception("Slack send failed for alert %s", alert.id)

                tasks.append(asyncio.create_task(_do_slack()))

            # Email
            if settings.smtp_host and settings.alert_email_recipients:
                recipients = [r.strip() for r in settings.alert_email_recipients.split(",") if r.strip()]

                async def _do_email():
                    try:
                        await self._send_email_with_retry(
                            settings.smtp_host,
                            settings.smtp_port,
                            settings.smtp_user,
                            settings.smtp_password,
                            settings.smtp_from_address,
                            recipients,
                            f"Quality Alert: {ev.process_name} ({ev.severity})",
                            ev.message,
                        )
                        session.add(NotificationDelivery(alert_id=alert.id, channel="email", status="sent", recipient=",".join(recipients)))
                        await session.commit()
                        await self._record_audit(session, "system", "send_email", "alert", str(alert.id), {"recipients": recipients})
                    except Exception as exc:
                        session.add(NotificationDelivery(alert_id=alert.id, channel="email", status="failed", error_message=str(exc), recipient=",".join(recipients)))
                        await session.commit()
                        logger.exception("Email send failed for alert %s", alert.id)

                tasks.append(asyncio.create_task(_do_email()))

            # SMS — critical only
            if ev.severity == "critical" and settings.sms_webhook_url and settings.sms_to_numbers:
                to_numbers = [n.strip() for n in settings.sms_to_numbers.split(",") if n.strip()]

                async def _do_sms():
                    try:
                        await self._send_sms_with_retry(settings.sms_webhook_url, settings.sms_auth_token, settings.sms_from_number, to_numbers, ev.message)
                        session.add(NotificationDelivery(alert_id=alert.id, channel="sms", status="sent", recipient=",".join(to_numbers)))
                        await session.commit()
                        await self._record_audit(session, "system", "send_sms", "alert", str(alert.id), {"recipients": to_numbers})
                    except Exception as exc:
                        session.add(NotificationDelivery(alert_id=alert.id, channel="sms", status="failed", error_message=str(exc), recipient=",".join(to_numbers)))
                        await session.commit()
                        logger.exception("SMS send failed for alert %s", alert.id)

                tasks.append(asyncio.create_task(_do_sms()))

            # Jira creation for GRR failures >30% or persistent SPC violations
            if (ev.grr_pct and ev.grr_pct > 30.0) or ev.type == "spc_violation":
                async def _do_jira():
                    try:
                        ticket = await alerts_mod.create_jira_ticket(
                            settings.jira_url,
                            settings.jira_email,
                            settings.jira_api_token,
                            settings.jira_project_key,
                            summary=f"Quality Alert: {ev.process_name} {ev.type}",
                            description=ev.message,
                        )
                        if ticket:
                            session.add(NotificationDelivery(alert_id=alert.id, channel="jira", status="created", response_reference=ticket))
                            await session.commit()
                            await self._record_audit(session, "system", "create_jira", "alert", str(alert.id), {"ticket": ticket})
                    except Exception:
                        logger.exception("Failed to create JIRA for alert %s", alert.id)

                tasks.append(asyncio.create_task(_do_jira()))

            # QMS integration (optional)
            qms_url = getattr(settings, "qms_api_url", "")
            if qms_url and ev.payload:
                async def _do_qms():
                    try:
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            await client.post(qms_url, json=ev.payload)
                        session.add(NotificationDelivery(alert_id=alert.id, channel="qms", status="sent"))
                        await session.commit()
                    except Exception:
                        logger.exception("Failed to post to QMS for alert %s", alert.id)

                tasks.append(asyncio.create_task(_do_qms()))

            # Wait for all tasks to finish and return
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
