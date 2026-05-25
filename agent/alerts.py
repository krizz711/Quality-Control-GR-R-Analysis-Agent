"""
Async alerting via Slack webhooks and JIRA REST API.
"""

from __future__ import annotations

import logging
import time

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
                "ts": int(time.time()),
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
