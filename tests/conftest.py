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
from httpx import AsyncClient
import asyncio


@pytest.fixture
async def fake_redis():
    """Provide a fresh fakeredis.aioredis.FakeRedis instance for each test."""
    try:
        import fakeredis.aioredis as fr
        r = fr.FakeRedis()
        yield r
        await r.flushall()
    except Exception:
        # Lightweight fallback for environments without fakeredis installed.
        import time
        import fnmatch

        class SimpleFakeRedis:
            def __init__(self):
                self.store = {}
                self.expiry = {}

            async def get(self, key):
                v = self.store.get(key)
                if v is None:
                    return None
                exp = self.expiry.get(key)
                if exp and time.time() > exp:
                    await self.delete(key)
                    return None
                return v

            async def set(self, key, value, ex=None):
                self.store[key] = value
                if ex:
                    self.expiry[key] = time.time() + ex
                return True

            async def keys(self, pattern):
                return [k for k in self.store.keys() if fnmatch.fnmatch(k, pattern)]

            async def ttl(self, key):
                exp = self.expiry.get(key)
                if not exp:
                    return -1
                return int(max(0, exp - time.time()))

            async def flushall(self):
                self.store.clear()
                self.expiry.clear()

            async def delete(self, key):
                self.store.pop(key, None)
                self.expiry.pop(key, None)

        r = SimpleFakeRedis()
        yield r
        await r.flushall()


@pytest.fixture
async def async_client():
    """Async HTTP client bound to the FastAPI app for integration tests."""
    try:
        from api.main import app
    except Exception:
        pytest.skip("api.main.app is not importable")

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client

# Make the project root importable when running pytest from any directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("API_AUTH_KEY", "test-api-key")

# On Windows, asyncpg works best with the SelectorEventLoop policy
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass


@pytest.fixture
async def db_conn(monkeypatch):
    """Provide a SQLAlchemy `AsyncSession` bound to a transactional connection.

    The transaction is rolled back after the test so tests can run against
    a real Postgres instance without mutating state.
    """
    try:
        from api.main import app
    except Exception:
        app = None

    # Use a fresh per-test engine with a NullPool so we don't reuse asyncpg
    # connections across event loops.
    from db import database as db_mod
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(os.environ["DATABASE_URL"], poolclass=NullPool, pool_pre_ping=False)
    conn = await engine.connect()
    trans = await conn.begin()

    # Create a session factory bound to the test connection. Each call to
    # this factory returns a fresh AsyncSession instance bound to the same
    # underlying connection. This avoids reusing the same AsyncSession
    # instance across coroutines while keeping all work inside the
    # transactional connection controlled by this fixture.
    Session = async_sessionmaker(bind=conn, expire_on_commit=False)

    def _make_session():
        return Session(bind=conn)

    # If FastAPI app is available, override dependency to use a fresh session
    # instance per dependency injection call.
    if app is not None:
        async def _get_test_session():
            s = _make_session()
            try:
                yield s
            finally:
                try:
                    await s.close()
                except Exception:
                    pass

        app.dependency_overrides[db_mod.get_session] = _get_test_session

    # Install the factory into the AsyncSessionLocal proxy so application
    # code calling `async with AsyncSessionLocal()` gets a fresh session
    # instance bound to our test connection.
    try:
        db_mod.AsyncSessionLocal.set_factory(lambda: _make_session())
    except Exception:
        # Fallback for older test runs where AsyncSessionLocal may be a plain
        # callable; assign a factory that creates fresh sessions.
        db_mod.AsyncSessionLocal = lambda: _make_session()

    try:
        session = _make_session()
        yield session
    finally:
        try:
            await session.close()
        except Exception:
            pass
        await trans.rollback()
        await conn.close()
        await engine.dispose()

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
