import json
import os
import hashlib
from typing import Any

from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from db.models import AuditEvent

SENSITIVE_KEYS = {"password", "ssn", "credit_card", "token", "auth", "secret", "credentials", "passwd"}


def _redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: (_redact(v) if k not in SENSITIVE_KEYS else "[REDACTED]") for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact(x) for x in obj]
    return obj


async def log_event(
    *,
    actor: str | None = "system",
    user_id: str | None = None,
    event_type: str,
    component: str | None = None,
    metadata: dict | None = None,
    algorithm_version: str | None = None,
    result_summary: dict | None = None,
    ip_address: str | None = None,
 ) -> None:
    """Append an audit event to the `audit_events` table.

    This function hashes the input payload and redacts obvious sensitive keys.
    It uses its own DB session so callers don't need to manage transactions.
    """
    redacted = _redact(metadata or {})
    payload_bytes = json.dumps(redacted, sort_keys=True, default=str).encode("utf-8")
    input_hash = hashlib.sha256(payload_bytes).hexdigest()

    # Use an independent engine/session for audit writes so test fixtures that
    # install transactional connections (overriding AsyncSessionLocal) are not
    # affected by commits here.
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Nothing we can do without a DB URL
        return

    engine = create_async_engine(database_url, pool_pre_ping=True, poolclass=NullPool)
    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)
    async with AsyncSession() as session:
        session.add(
            AuditEvent(
                actor=actor,
                user_id=user_id,
                event_type=event_type,
                component=component,
                input_hash=input_hash,
                algorithm_version=algorithm_version,
                result_summary=result_summary or (redacted if redacted else None),
                details=redacted,
                ip_address=ip_address,
            )
        )
        await session.commit()
    await engine.dispose()
