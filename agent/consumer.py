import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from confluent_kafka import Consumer
from confluent_kafka.admin import AdminClient, NewTopic
from sqlalchemy import text


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.config import settings  # noqa: E402
from db.database import AsyncSessionLocal  # noqa: E402
from agent.orchestrator import QualityOrchestrator  # noqa: E402
from api.realtime import publish_dlq_event, publish_realtime_event  # noqa: E402


TOPIC = "quality.measurements"
DLQ_TOPIC = "quality.measurements.dlq"
TOPIC_WAIT_TIMEOUT_SECONDS = 60
TOPIC_WAIT_POLL_SECONDS = 2

INSERT_MEASUREMENT_SQL = text(
    """
    INSERT INTO measurements (
        timestamp,
        part_number,
        characteristic_name,
        nominal_value,
        measured_value,
        unit,
        operator_id,
        equipment_id,
        shift,
        source_event_id,
        created_by
    )
    VALUES (
        :timestamp,
        :part_number,
        :characteristic_name,
        :nominal_value,
        :measured_value,
        :unit,
        :operator_id,
        :equipment_id,
        :shift,
        :source_event_id,
        :created_by
    )
    """
)


INSERT_DUPLICATE_CHECK_SQL = text(
    """
    SELECT 1
    FROM measurements
    WHERE source_event_id = :source_event_id
    LIMIT 1
    """
)


ENSURE_SOURCE_EVENT_ID_COLUMN_SQL = text(
    """
    ALTER TABLE measurements
    ADD COLUMN IF NOT EXISTS source_event_id VARCHAR(64)
    """
)


ENSURE_SOURCE_EVENT_ID_INDEX_SQL = text(
    """
    CREATE UNIQUE INDEX IF NOT EXISTS uq_measurements_source_event_id
    ON measurements (source_event_id)
    """
)


def create_consumer() -> Consumer:
    return Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": "arad-quality-consumer",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )


def wait_for_topic(topic: str, *, timeout_seconds: int = TOPIC_WAIT_TIMEOUT_SECONDS) -> None:
    """Block until Kafka exposes the topic metadata for the consumer."""
    admin_client = AdminClient({"bootstrap.servers": settings.kafka_bootstrap_servers})
    deadline = time.monotonic() + timeout_seconds

    while True:
        metadata = admin_client.list_topics(topic=topic, timeout=5)
        if topic in metadata.topics and not metadata.topics[topic].error:
            logging.info("Kafka topic ready: %s", topic)
            return

        if time.monotonic() >= deadline:
            raise TimeoutError(f"Timed out waiting for Kafka topic: {topic}")

        logging.info("Waiting for Kafka topic to become ready: %s", topic)
        time.sleep(TOPIC_WAIT_POLL_SECONDS)


async def ensure_measurement_idempotency_schema() -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(ENSURE_SOURCE_EVENT_ID_COLUMN_SQL)
        await session.execute(ENSURE_SOURCE_EVENT_ID_INDEX_SQL)
        await session.commit()


def ensure_topic_exists(topic: str, *, num_partitions: int = 1, replication_factor: int = 1) -> None:
    admin_client = AdminClient({"bootstrap.servers": settings.kafka_bootstrap_servers})
    metadata = admin_client.list_topics(timeout=5)
    topic_meta = metadata.topics.get(topic)
    if topic_meta is not None and not topic_meta.error:
        return

    futures = admin_client.create_topics(
        [NewTopic(topic, num_partitions=num_partitions, replication_factor=replication_factor)]
    )
    future = futures[topic]
    try:
        future.result(timeout=10)
        logging.info("Kafka topic created: %s", topic)
    except Exception as exc:
        if "TopicAlreadyExists" in str(exc):
            logging.info("Kafka topic already exists: %s", topic)
            return
        raise


def parse_timestamp(value: Any) -> datetime | Any:
    if not isinstance(value, str):
        return value

    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def measurement_params(message: dict[str, Any]) -> dict[str, Any]:
    return {
        "timestamp": parse_timestamp(message.get("timestamp")),
        "part_number": message.get("part_number"),
        "characteristic_name": message.get("characteristic_name"),
        "nominal_value": message.get("nominal_value"),
        "measured_value": message.get("measured_value"),
        "unit": message.get("unit"),
        "operator_id": message.get("operator_id"),
        "equipment_id": message.get("equipment_id"),
        "shift": message.get("shift"),
        "source_event_id": message.get("event_id") or message.get("source_event_id"),
        "created_by": message.get("created_by", "kafka_consumer"),
    }


async def insert_measurement(message: dict[str, Any]) -> bool:
    params = measurement_params(message)
    async with AsyncSessionLocal() as session:
        try:
            source_event_id = params.get("source_event_id")
            if source_event_id:
                duplicate = await session.execute(INSERT_DUPLICATE_CHECK_SQL, {"source_event_id": source_event_id})
                if duplicate.first():
                    logging.info("Skipping duplicate measurement event: %s", source_event_id)
                    return False

            await session.execute(INSERT_MEASUREMENT_SQL, params)
            await session.commit()
            return True
        except Exception:
            await session.rollback()
            raise


def _delivery_report(error, message) -> None:
    if error is not None:
        logging.error("DLQ delivery failed for %s: %s", message.key(), error)
        return

    logging.info(
        "DLQ delivered to %s partition=%s offset=%s key=%s",
        message.topic(),
        message.partition(),
        message.offset(),
        message.key(),
    )


async def _publish_dlq(producer, kafka_message, error: str, payload: dict[str, Any]) -> None:
    dlq_payload = {
        "type": "measurement.dlq",
        "error": error,
        "payload": payload,
        "topic": TOPIC,
        "offset": kafka_message.offset(),
        "partition": kafka_message.partition(),
        "timestamp": payload.get("timestamp") if isinstance(payload, dict) else None,
    }
    logging.info("Publishing DLQ payload to %s offset=%s partition=%s key=%s", DLQ_TOPIC, dlq_payload.get("offset"), dlq_payload.get("partition"), kafka_message.key())
    try:
        producer.produce(
            DLQ_TOPIC,
            key=kafka_message.key(),
            value=json.dumps(dlq_payload, default=str),
            callback=_delivery_report,
        )
        # Force delivery before the consumer acknowledges the source message.
        producer.poll(0)
        producer.flush(10)
    except Exception:
        logging.exception("Failed to produce DLQ message")

    await publish_dlq_event(dlq_payload)


async def process_message(consumer: Consumer, kafka_message, orchestrator: QualityOrchestrator, producer) -> bool:
    raw_payload = kafka_message.value()
    started_at = time.perf_counter()

    try:
        payload = raw_payload.decode("utf-8") if isinstance(raw_payload, bytes) else raw_payload
        message = json.loads(payload)

        db_started_at = time.perf_counter()
        inserted = await insert_measurement(message)
        db_elapsed_ms = round((time.perf_counter() - db_started_at) * 1000, 2)
        if not inserted:
            consumer.commit(message=kafka_message, asynchronous=False)
            await publish_realtime_event(
                {
                    "type": "measurement.duplicate",
                    "source_event_id": message.get("event_id") or message.get("source_event_id"),
                    "process_name": message.get("equipment_id") or message.get("characteristic_name"),
                    "timestamp": message.get("timestamp"),
                }
            )
            return True

        analysis_started_at = time.perf_counter()
        analysis = await orchestrator.handle_measurement_event(message)
        analysis_elapsed_ms = round((time.perf_counter() - analysis_started_at) * 1000, 2)

        realtime_started_at = time.perf_counter()
        await publish_realtime_event(
            {
                "type": "measurement.processed",
                "source_event_id": message.get("event_id") or message.get("source_event_id"),
                "part_number": message.get("part_number"),
                "characteristic_name": message.get("characteristic_name"),
                "equipment_id": message.get("equipment_id"),
                "operator_id": message.get("operator_id"),
                "timestamp": message.get("timestamp"),
                "analysis": analysis,
            }
        )
        realtime_elapsed_ms = round((time.perf_counter() - realtime_started_at) * 1000, 2)
        consumer.commit(message=kafka_message, asynchronous=False)
        total_elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)

        logging.info(
            "Processed measurement timing ms db=%s analysis=%s realtime=%s total=%s key=%s offset=%s partition=%s",
            db_elapsed_ms,
            analysis_elapsed_ms,
            realtime_elapsed_ms,
            total_elapsed_ms,
            kafka_message.key(),
            kafka_message.offset(),
            kafka_message.partition(),
        )

        print(
            "Inserted and processed: "
            f"{message.get('part_number')} | "
            f"{message.get('characteristic_name')} | "
            f"{message.get('measured_value')}"
        )
        return True
    except Exception:
        logging.exception("Failed to process Kafka message: %s", raw_payload)
        try:
            payload = json.loads(raw_payload.decode("utf-8") if isinstance(raw_payload, bytes) else raw_payload)
        except Exception:
            payload = {"raw_payload": raw_payload.decode("utf-8", errors="ignore") if isinstance(raw_payload, bytes) else raw_payload}
        await _publish_dlq(producer, kafka_message, "processing_failed", payload)
        consumer.commit(message=kafka_message, asynchronous=False)
        return False


async def main() -> None:
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(message)s")

    wait_for_topic(TOPIC)
    await ensure_measurement_idempotency_schema()
    ensure_topic_exists(DLQ_TOPIC)
    consumer = create_consumer()
    consumer.subscribe([TOPIC])
    inserted_count = 0
    orchestrator = QualityOrchestrator()
    from confluent_kafka import Producer

    producer = Producer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "allow.auto.create.topics": True,
        }
    )

    try:
        while True:
            try:
                kafka_message = consumer.poll(timeout=1.0)

                if kafka_message is None:
                    await asyncio.sleep(0)
                    continue

                if kafka_message.error():
                    logging.error("Kafka consumer error: %s", kafka_message.error())
                    continue

                if await process_message(consumer, kafka_message, orchestrator, producer):
                    inserted_count += 1
            except KeyboardInterrupt:
                raise
            except Exception:
                logging.exception("Unexpected consumer loop error")
                await asyncio.sleep(0)
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("Stopping consumer...")
    finally:
        producer.flush(5)
        consumer.close()
        print(f"Total inserted count: {inserted_count}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
