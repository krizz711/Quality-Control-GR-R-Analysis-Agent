import argparse
import json
import os
import random
import time
from datetime import UTC, datetime

from confluent_kafka import Producer


TOPIC = "quality.measurements"


def parse_args() -> argparse.Namespace:
    default_bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

    parser = argparse.ArgumentParser(description="Publish synthetic quality measurements to Kafka.")
    parser.add_argument("--count", type=int, default=1000)
    parser.add_argument("--delay-ms", type=int, default=100)
    parser.add_argument("--bootstrap-servers", default=default_bootstrap_servers)
    return parser.parse_args()


def build_record(index: int) -> dict[str, object]:
    measured_value = 25.25 if index % 200 == 0 else round(random.normalvariate(25.0, 0.03), 4)

    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "part_number": f"PART-{(index % 20) + 1:03d}",
        "characteristic_name": "diameter",
        "nominal_value": 25.0,
        "measured_value": measured_value,
        "unit": "mm",
        "operator_id": f"OP-{(index % 5) + 1:03d}",
        "equipment_id": "CMM-001",
        "shift": ["A", "B", "C"][index % 3],
    }


def delivery_report(error, message) -> None:
    if error is not None:
        print(f"Delivery failed for record key {message.key()}: {error}")


def main() -> None:
    args = parse_args()
    producer = Producer({"bootstrap.servers": args.bootstrap_servers})
    delay_seconds = args.delay_ms / 1000
    start_time = time.perf_counter()

    for index in range(1, args.count + 1):
        record = build_record(index)
        producer.produce(
            TOPIC,
            key=record["part_number"],
            value=json.dumps(record),
            callback=delivery_report,
        )
        producer.poll(0)

        if index % 100 == 0:
            print(f"Published {index}/{args.count}...")

        if index < args.count:
            time.sleep(delay_seconds)

    producer.flush()
    elapsed_seconds = time.perf_counter() - start_time
    print(f"Published total {args.count} records in {elapsed_seconds:.2f} seconds")


if __name__ == "__main__":
    main()
