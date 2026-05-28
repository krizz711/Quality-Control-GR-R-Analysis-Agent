import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from confluent_kafka import Consumer
from confluent_kafka.admin import AdminClient
from sqlalchemy import text


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.config import settings  # noqa: E402
from db.database import AsyncSessionLocal  # noqa: E402
from agent.orchestrator import QualityOrchestrator  # noqa: E402


TOPIC = "quality.measurements"
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
        :created_by
    )
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
        "created_by": message.get("created_by", "kafka_consumer"),
    }


async def insert_measurement(message: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(INSERT_MEASUREMENT_SQL, measurement_params(message))
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def process_message(consumer: Consumer, kafka_message, orchestrator: QualityOrchestrator) -> bool:
    raw_payload = kafka_message.value()

    try:
        payload = raw_payload.decode("utf-8") if isinstance(raw_payload, bytes) else raw_payload
        message = json.loads(payload)

        await insert_measurement(message)
        consumer.commit(message=kafka_message, asynchronous=False)
        
        # Trigger real-time SPC/GRR analysis via orchestrator
        await orchestrator.handle_measurement_event(message)

        print(
            "Inserted and processed: "
            f"{message.get('part_number')} | "
            f"{message.get('characteristic_name')} | "
            f"{message.get('measured_value')}"
        )
        return True
    except Exception:
        logging.exception("Failed to process Kafka message: %s", raw_payload)
        return False


async def main() -> None:
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(message)s")

    wait_for_topic(TOPIC)
    consumer = create_consumer()
    consumer.subscribe([TOPIC])
    inserted_count = 0
    orchestrator = QualityOrchestrator()

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

                if await process_message(consumer, kafka_message, orchestrator):
                    inserted_count += 1
            except KeyboardInterrupt:
                raise
            except Exception:
                logging.exception("Unexpected consumer loop error")
                await asyncio.sleep(0)
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("Stopping consumer...")
    finally:
        consumer.close()
        print(f"Total inserted count: {inserted_count}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
