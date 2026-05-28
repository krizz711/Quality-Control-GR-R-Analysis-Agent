"""
Async alerting via Slack webhooks and JIRA REST API.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

_SEVERITY_COLORS: dict[str, str] = {
    "info": "#36a64f",
    "warning": "#ffcc00",
    "critical": "#ff0000",
}


async def send_slack_alert(
    webhook_url: str,
    message: str,
    severity: str,
    study_id: str | None = None,
) -> bool | None:
    """
    Post a formatted attachment to a Slack incoming webhook.

    Returns True on success, None on missing config or failure (never raises).
    """
    if not webhook_url:
        logger.warning("SLACK_WEBHOOK_URL not configured")
        return None

    color = _SEVERITY_COLORS.get(severity, "#cccccc")
    text = message + (f"\nStudy ID: {study_id}" if study_id else "")
    payload = {
        "attachments": [
            {
                "color": color,
                "title": f"Quality Alert — {severity.upper()}",
                "text": text,
                "footer": "Arad Quality Agent",
                "ts": int(datetime.now(timezone.utc).timestamp()),
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload)
            response.raise_for_status()
        logger.info("Slack alert sent: %s — %s", severity, message[:60])
        return True
    except (httpx.HTTPError, Exception) as exc:
        logger.error("Failed to send Slack alert: %s", exc)
        return None


async def create_jira_ticket(
    jira_url: str,
    email: str,
    api_token: str,
    project_key: str,
    summary: str,
    description: str,
) -> str | None:
    """
    Create a JIRA issue via REST API v3.

    Returns the ticket key (e.g. QUAL-42) on success, None on failure (never raises).
    """
    if not jira_url or not api_token:
        logger.warning("JIRA URL or API token not configured")
        return None

    url = f"{jira_url.rstrip('/')}/rest/api/3/issue"
    auth = httpx.BasicAuth(email, api_token)
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}],
                    }
                ],
            },
            "issuetype": {"name": "Bug"},
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                url,
                json=payload,
                auth=auth,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            ticket_key = response.json()["key"]
        logger.info("JIRA ticket created: %s", ticket_key)
        return ticket_key
    except (httpx.HTTPError, Exception) as exc:
        logger.error("Failed to create JIRA ticket: %s", exc)
        return None


async def send_email_alert(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    from_address: str,
    recipients: list[str],
    subject: str,
    body: str,
) -> bool | None:
    """
    Send an alert email via SMTP.

    Returns True on success, None on missing config or failure (never raises).
    """
    if not smtp_host or not recipients:
        logger.warning("SMTP not configured — email alert skipped")
        return None

    import asyncio
    import email.mime.text as mt
    import smtplib

    def _send() -> bool:
        msg = mt.MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = ", ".join(recipients)

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                if smtp_port != 25:
                    server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(from_address, recipients, msg.as_string())
            return True
        except Exception as exc:
            logger.error("Failed to send email alert: %s", exc)
            return False

    try:
        result = await asyncio.to_thread(_send)
        if result:
            logger.info("Email alert sent to %s — %s", recipients, subject[:60])
        return result or None
    except Exception as exc:
        logger.error("Email alert thread failed: %s", exc)
        return None


async def send_sms_alert(
    webhook_url: str,
    auth_token: str,
    from_number: str,
    to_numbers: list[str],
    message: str,
) -> bool | None:
    """
    Send SMS alerts via a generic webhook (Twilio-compatible).

    Returns True on success, None on missing config or failure (never raises).
    """
    if not webhook_url or not to_numbers:
        logger.warning("SMS webhook not configured — SMS alert skipped")
        return None

    payload = {
        "from": from_number,
        "to": to_numbers,
        "body": message[:160],  # SMS max length
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload, headers=headers)
            response.raise_for_status()
        logger.info("SMS alert sent to %s — %s", to_numbers, message[:40])
        return True
    except (httpx.HTTPError, Exception) as exc:
        logger.error("Failed to send SMS alert: %s", exc)
        return None
