"""
tests/conftest.py — shared pytest configuration.

pytest-asyncio is configured project-wide via pyproject.toml
(asyncio_mode = "auto"), so no explicit event-loop fixture is needed here.
This file exists to ensure the project root is on sys.path so that
all internal packages (core, db, schemas, …) are importable during tests.
"""

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Make the project root importable when running pytest from any directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("API_AUTH_KEY", "test-api-key")


@pytest.fixture
def mock_slack_client():
    """Mock httpx.AsyncClient for Slack webhook tests."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    with patch("agent.alerts.httpx.AsyncClient") as mock_ac:
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_ac.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_ac.return_value.__aexit__ = AsyncMock(return_value=None)
        yield mock_client
