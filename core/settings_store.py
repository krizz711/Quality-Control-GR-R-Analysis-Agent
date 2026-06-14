"""Runtime configuration store — integration credentials + LLM key.

Values are persisted in the ``system_settings`` table and *applied* onto the live
``settings`` singleton and ``os.environ`` at startup and after every save, so all
existing code that reads ``settings.*`` / ``os.environ`` (AlertManager, the Gemini
service, etc.) picks them up with no refactor. Secret values are encrypted at rest
with Fernet (key derived from JWT_SECRET).

This is single-tenant: one config set per deployment.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
from dataclasses import dataclass

from sqlalchemy import select

from core.config import settings
from db.database import AsyncSessionLocal
from db.models import SystemSetting

logger = logging.getLogger(__name__)

SECRET_SENTINEL = "********"  # what the UI shows / sends back for unchanged secrets


@dataclass(frozen=True)
class SettingSpec:
    key: str        # storage/UI key, e.g. "slack.webhook_url"
    attr: str       # settings attribute, e.g. "slack_webhook_url"
    env: str        # env var name, e.g. "SLACK_WEBHOOK_URL"
    secret: bool = False
    is_int: bool = False


SPEC: list[SettingSpec] = [
    SettingSpec("slack.webhook_url", "slack_webhook_url", "SLACK_WEBHOOK_URL", secret=True),
    SettingSpec("email.smtp_host", "smtp_host", "SMTP_HOST"),
    SettingSpec("email.smtp_port", "smtp_port", "SMTP_PORT", is_int=True),
    SettingSpec("email.smtp_user", "smtp_user", "SMTP_USER"),
    SettingSpec("email.smtp_password", "smtp_password", "SMTP_PASSWORD", secret=True),
    SettingSpec("email.from_address", "smtp_from_address", "SMTP_FROM_ADDRESS"),
    SettingSpec("email.recipients", "alert_email_recipients", "ALERT_EMAIL_RECIPIENTS"),
    SettingSpec("sms.webhook_url", "sms_webhook_url", "SMS_WEBHOOK_URL"),
    SettingSpec("sms.auth_token", "sms_auth_token", "SMS_AUTH_TOKEN", secret=True),
    SettingSpec("sms.from_number", "sms_from_number", "SMS_FROM_NUMBER"),
    SettingSpec("sms.to_numbers", "sms_to_numbers", "SMS_TO_NUMBERS"),
    SettingSpec("jira.url", "jira_url", "JIRA_URL"),
    SettingSpec("jira.email", "jira_email", "JIRA_EMAIL"),
    SettingSpec("jira.api_token", "jira_api_token", "JIRA_API_TOKEN", secret=True),
    SettingSpec("jira.project_key", "jira_project_key", "JIRA_PROJECT_KEY"),
    SettingSpec("qms.api_url", "qms_api_url", "QMS_API_URL"),
    SettingSpec("llm.gemini_api_key", "gemini_api_key", "GEMINI_API_KEY", secret=True),
]

_BY_KEY = {s.key: s for s in SPEC}


# ── Encryption ────────────────────────────────────────────────────────────────
def _fernet():
    from cryptography.fernet import Fernet

    secret = getattr(settings, "jwt_secret", "") or getattr(settings, "api_auth_key", "") or "dev-insecure-key"
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def _encrypt(plaintext: str) -> str:
    try:
        return "enc:" + _fernet().encrypt(plaintext.encode()).decode()
    except Exception:
        logger.warning("Encryption unavailable; storing secret unencrypted")
        return "plain:" + plaintext


def _decrypt(stored: str) -> str:
    if stored.startswith("enc:"):
        try:
            return _fernet().decrypt(stored[4:].encode()).decode()
        except Exception:
            logger.exception("Failed to decrypt a stored secret")
            return ""
    if stored.startswith("plain:"):
        return stored[len("plain:"):]
    return stored


# ── Persistence ───────────────────────────────────────────────────────────────
async def _load_rows() -> dict[str, SystemSetting]:
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(select(SystemSetting))).scalars().all()
    return {r.key: r for r in rows}


async def get_decrypted() -> dict[str, str]:
    """All stored settings with secrets decrypted (for runtime use / tests)."""
    rows = await _load_rows()
    out: dict[str, str] = {}
    for key, row in rows.items():
        if row.value is None:
            continue
        spec = _BY_KEY.get(key)
        out[key] = _decrypt(row.value) if (spec and spec.secret) else row.value
    return out


async def get_masked() -> list[dict]:
    """Settings for the admin UI — secret values never leave the server."""
    rows = await _load_rows()
    result: list[dict] = []
    for spec in SPEC:
        row = rows.get(spec.key)
        configured = bool(row and row.value)
        entry: dict = {"key": spec.key, "secret": spec.secret, "configured": configured}
        if not spec.secret:
            entry["value"] = (row.value if row else "") or ""
        result.append(entry)
    return result


async def set_many(updates: dict[str, str | None], updated_by: str | None = None) -> None:
    async with AsyncSessionLocal() as session:
        existing = {r.key: r for r in (await session.execute(select(SystemSetting))).scalars().all()}
        for key, raw in updates.items():
            spec = _BY_KEY.get(key)
            if spec is None:
                continue
            # For secrets, an empty value or the masked sentinel means "unchanged".
            if spec.secret and (raw is None or raw == "" or raw == SECRET_SENTINEL):
                continue
            stored = _encrypt(raw) if (spec.secret and raw) else (raw or "")
            row = existing.get(key)
            if row is None:
                session.add(
                    SystemSetting(key=key, value=stored, is_secret=spec.secret, updated_by=updated_by)
                )
            else:
                row.value = stored
                row.is_secret = spec.secret
                row.updated_by = updated_by
        await session.commit()
    await apply_to_runtime()


async def apply_to_runtime() -> None:
    """Push stored settings onto the live ``settings`` singleton + ``os.environ``."""
    try:
        values = await get_decrypted()
    except Exception:
        logger.exception("Could not load settings for runtime apply")
        return
    for spec in SPEC:
        val = values.get(spec.key)
        if not val:
            continue
        try:
            os.environ[spec.env] = val
            setattr(settings, spec.attr, int(val) if spec.is_int else val)
        except Exception:
            logger.debug("Could not apply setting %s to runtime", spec.key)


# ── Connection tests ──────────────────────────────────────────────────────────
async def test_channel(channel: str) -> tuple[bool, str]:
    """Best-effort live test of a configured integration."""
    import httpx

    cfg = await get_decrypted()

    if channel == "slack":
        url = cfg.get("slack.webhook_url") or settings.slack_webhook_url
        if not url:
            return False, "No Slack webhook URL configured."
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    url,
                    json={"text": "✅ Arad Quality — Slack integration test. You're connected."},
                )
            return (r.status_code < 400, f"Slack responded with HTTP {r.status_code}.")
        except Exception as exc:
            return False, f"Slack test failed: {exc}"

    if channel == "email":
        host = cfg.get("email.smtp_host") or settings.smtp_host
        if not host:
            return False, "No SMTP host configured."
        try:
            import aiosmtplib

            port = int(cfg.get("email.smtp_port") or settings.smtp_port or 587)
            smtp = aiosmtplib.SMTP(hostname=host, port=port, timeout=10)
            await smtp.connect()
            user = cfg.get("email.smtp_user") or settings.smtp_user
            pwd = cfg.get("email.smtp_password") or settings.smtp_password
            if user and pwd:
                await smtp.login(user, pwd)
            await smtp.quit()
            return True, f"Connected to {host}:{port}."
        except Exception as exc:
            return False, f"SMTP test failed: {exc}"

    if channel == "llm":
        key = cfg.get("llm.gemini_api_key") or os.environ.get("GEMINI_API_KEY", "")
        if not key:
            return False, "No Gemini API key configured."
        os.environ["GEMINI_API_KEY"] = key
        return True, "Gemini API key saved — AI analysis is enabled."

    if channel == "jira":
        url = cfg.get("jira.url") or settings.jira_url
        email = cfg.get("jira.email") or settings.jira_email
        token = cfg.get("jira.api_token") or settings.jira_api_token
        if not (url and email and token):
            return False, "JIRA URL, email, and API token are all required."
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{url.rstrip('/')}/rest/api/2/myself", auth=(email, token))
            return (r.status_code < 400, f"JIRA responded with HTTP {r.status_code}.")
        except Exception as exc:
            return False, f"JIRA test failed: {exc}"

    if channel == "qms":
        url = cfg.get("qms.api_url") or settings.qms_api_url
        if not url:
            return False, "No QMS API URL configured."
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(url)
            return (r.status_code < 500, f"QMS endpoint reachable (HTTP {r.status_code}).")
        except Exception as exc:
            return False, f"QMS test failed: {exc}"

    if channel == "sms":
        webhook = cfg.get("sms.webhook_url") or settings.sms_webhook_url
        to = cfg.get("sms.to_numbers") or settings.sms_to_numbers
        if not (webhook and to):
            return False, "SMS webhook and at least one recipient number are required."
        return True, "SMS credentials present (live send happens on critical alerts)."

    return False, f"Unknown channel '{channel}'."
