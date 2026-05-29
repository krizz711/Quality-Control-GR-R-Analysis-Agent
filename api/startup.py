from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from typing import Any, AsyncIterator

import asyncpg
from fastapi import FastAPI
from sqlalchemy.engine import make_url

from agent.consumer import run_consumer
from api.realtime import state as realtime_state, start_realtime_runtime, stop_realtime_runtime
from core.config import settings
from db.database import engine
from db.models import Base

logger = logging.getLogger(__name__)

POOL_MIN_SIZE = 1
POOL_MAX_SIZE = 10


def _asyncpg_dsn() -> str:
    url = make_url(settings.database_url)
    if "+asyncpg" in url.drivername:
        url = url.set(drivername=url.drivername.replace("+asyncpg", ""))
    return url.render_as_string(hide_password=False)


async def _initialize_database_schema() -> None:
    if engine.url.drivername.startswith("sqlite"):
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)


async def _broadcast_drainer(stop_event: asyncio.Event) -> None:
    while True:
        if stop_event.is_set() and realtime_state.queue.empty():
            break

        batch: list[dict[str, Any]] = []
        try:
            batch.append(await asyncio.wait_for(realtime_state.queue.get(), timeout=0.05))
        except asyncio.TimeoutError:
            continue

        while len(batch) < 50:
            try:
                batch.append(realtime_state.queue.get_nowait())
            except asyncio.QueueEmpty:
                break

        results = await asyncio.gather(
            *(realtime_state.manager.broadcast(event) for event in batch),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                logger.warning("realtime_broadcast_failed error=%s", result)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    realtime_state.loop = asyncio.get_running_loop()
    await _initialize_database_schema()
    await start_realtime_runtime()

    pool = await asyncpg.create_pool(
        dsn=_asyncpg_dsn(),
        min_size=POOL_MIN_SIZE,
        max_size=POOL_MAX_SIZE,
    )

    stop_event = asyncio.Event()
    consumer_task = asyncio.create_task(
        run_consumer(
            pool=pool,
            broadcast_queue=realtime_state.queue,
            shutdown_event=stop_event,
            broadcast_sink="queue",
        ),
        name="kafka-consumer",
    )
    broadcast_task = asyncio.create_task(
        _broadcast_drainer(stop_event),
        name="realtime-broadcast-drainer",
    )

    app.state.db_pool = pool
    app.state.consumer_task = consumer_task
    app.state.broadcast_task = broadcast_task

    try:
        yield
    finally:
        stop_event.set()
        for task in (consumer_task, broadcast_task):
            task.cancel()
        await stop_realtime_runtime()
        for task in (consumer_task, broadcast_task):
            with suppress(asyncio.CancelledError, Exception):
                await task
        await pool.close()
        realtime_state.loop = None