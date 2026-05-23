# Project Progress

Last updated: May 24, 2026

## Completed So Far

### 1. Created the database migration folder

Created this folder:

```text
db/migrations/
```

### 2. Created the initial schema migration file

Created this file:

```text
db/migrations/001_initial_schema.sql
```

This file contains the SQL schema for the first version of the database.

### 3. Created the main database tables

The migration creates these three tables:

```text
measurements
grr_studies
quality_violations
```

### 4. Created the measurements table

The `measurements` table stores quality measurement data such as:

- part number
- characteristic name
- nominal value
- measured value
- unit
- operator ID
- equipment ID
- shift
- timestamp
- audit fields such as `created_at` and `created_by`

This table was also converted into a TimescaleDB hypertable using the `timestamp` column.

### 5. Created the grr_studies table

The `grr_studies` table stores Gauge R&R study information such as:

- equipment ID
- characteristic name
- study status
- EV, AV, PV
- GRR percentage
- NDC
- acceptance decision
- report path
- review information
- start and completion timestamps
- audit fields

### 6. Created the quality_violations table

The `quality_violations` table stores quality rule violations and alerts such as:

- part number
- characteristic name
- violation type
- severity
- measured value
- control limits
- alert status
- acknowledgement information
- timestamp

### 7. Added database indexes

Added indexes for faster lookup on:

```sql
measurements (part_number, timestamp DESC)
measurements (equipment_id)
quality_violations (part_number, timestamp DESC)
```

### 8. Enabled required PostgreSQL extensions

Enabled these extensions in the `arad_quality` database:

```text
timescaledb
pgcrypto
```

`timescaledb` is needed for hypertables.

`pgcrypto` is needed for `gen_random_uuid()`, which automatically creates UUID values for table IDs.

### 9. Applied the migration to Docker TimescaleDB

The schema was applied to the running Docker database:

```text
Database: arad_quality
User: arad
TimescaleDB container: arad-quality-agent-timescaledb-1
```

### 10. Verified the database setup

Verified that:

- all three tables exist
- `measurements` is a TimescaleDB hypertable
- the requested indexes exist
- the required extensions are enabled

### 11. Added Kafka services to Docker Compose

Updated `docker-compose.yml` to include these services:

```text
zookeeper
kafka
kafka-ui
```

The existing `timescaledb` and `pgadmin` services were kept unchanged.

### 12. Configured Kafka networking correctly

Kafka now has two listeners:

```text
INTERNAL://kafka:29092
EXTERNAL://localhost:9092
```

This allows:

- Docker containers to connect to Kafka using `kafka:29092`
- local scripts on Windows to connect using `localhost:9092`

Kafka UI is configured to use:

```text
kafka:29092
```

This fixed the Kafka UI issue where the Topics page kept loading forever because Kafka UI was trying to connect to `localhost:9092` from inside its own container.

### 13. Started and verified Kafka UI

Kafka UI is running at:

```text
http://localhost:8080
```

Verified that Kafka UI can connect to the Kafka cluster named:

```text
arad-local
```

### 14. Created the Kafka topic

Created and verified this Kafka topic:

```text
quality.measurements
```

### 15. Created the synthetic Kafka publisher script

Created this script:

```text
scripts/synthetic_publisher.py
```

The script:

- reads `KAFKA_BOOTSTRAP_SERVERS` from the environment
- defaults to `localhost:9092`
- uses `confluent-kafka` Producer
- publishes JSON measurement records to `quality.measurements`
- supports `--count`
- supports `--delay-ms`
- supports `--bootstrap-servers`
- prints progress every 100 records
- inserts an intentional out-of-control value every 200th record
- prints total count and elapsed time when finished

### 16. Verified Python dependency

Confirmed that `confluent-kafka` already exists in `pyproject.toml`:

```text
confluent-kafka = "^2.6"
```

### 17. Reapplied and verified the database schema after container recreation

After recreating Docker services, the TimescaleDB container was fresh and empty.

The saved migration file was reapplied:

```text
db/migrations/001_initial_schema.sql
```

Verified again that:

- `measurements` exists
- `grr_studies` exists
- `quality_violations` exists
- `measurements` is a TimescaleDB hypertable

### 18. Added MLflow to Docker Compose

Added an `mlflow` service to `docker-compose.yml`.

MLflow is exposed at:

```text
http://localhost:5000
```

MLflow uses the existing TimescaleDB/PostgreSQL database as its backend store:

```text
postgresql://arad:arad_pass@timescaledb:5432/arad_quality
```

MLflow artifacts are stored locally in:

```text
mlflow-artifacts/
```

### 19. Fixed MLflow PostgreSQL driver issue

The first MLflow container exited because the base MLflow image did not include the PostgreSQL driver:

```text
No module named 'psycopg2'
```

Created this Dockerfile:

```text
docker/mlflow/Dockerfile
```

It builds from `ghcr.io/mlflow/mlflow:v2.18.0` and installs:

```text
psycopg2-binary
```

The `mlflow` service now builds a custom image:

```text
arad-quality-agent-mlflow:2.18.0
```

### 20. Verified MLflow

Rebuilt and restarted MLflow using:

```powershell
docker compose up -d --build mlflow
```

Verified that:

- the MLflow container stays running
- MLflow created its database tables
- `http://localhost:5000` returns HTTP 200

### 21. Created the MLflow setup script

Created this script:

```text
scripts/setup_mlflow.py
```

The script:

- loads `.env` using `python-dotenv`
- reads `MLFLOW_TRACKING_URI`
- defaults to `http://localhost:5000`
- creates the `grr_studies` experiment if missing
- creates the `spc_models` experiment if missing
- prints both experiment IDs
- creates a synthetic test run in `grr_studies`
- logs GR&R parameters
- logs GR&R metrics
- sets run tags
- retrieves the run by `run_id`
- verifies that `grr_pct` was logged as `18.5`
- prints the run ID and MLflow UI link

### 22. Verified the MLflow setup script

Ran:

```powershell
python scripts\setup_mlflow.py
```

Verified that the script completed successfully and created a run in MLflow.

The script used:

```text
grr_studies experiment ID: 1
spc_models experiment ID: 2
```

### 23. Added local environment file

Created a local `.env` file with:

```text
DATABASE_URL=postgresql+asyncpg://arad:arad_pass@localhost:5432/arad_quality
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
MLFLOW_TRACKING_URI=http://localhost:5000
SLACK_WEBHOOK_URL=
ANTHROPIC_API_KEY=
```

The `.env` file is ignored by Git, so it stays local and will not be pushed to GitHub.

## Important Note

The original requested schema used this for the `measurements` table:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

TimescaleDB rejected that because a hypertable primary key must include the time partition column.

So the final migration uses:

```sql
PRIMARY KEY (id, timestamp)
```

This keeps the UUID ID while making the table valid as a TimescaleDB hypertable.

## Current Status

The initial database schema is created, applied, and verified.

The Kafka stack is running and verified.

The synthetic measurement publisher script is created.

MLflow is running and verified.

The MLflow setup script is created and verified.

The local `.env` file is created and ignored by Git.

You can view it in pgAdmin under:

```text
Servers > timescalesDB > Databases > arad_quality > Schemas > public > Tables
```

You should see:

```text
measurements
grr_studies
quality_violations
```

You can view Kafka in Kafka UI at:

```text
http://localhost:8080
```

You should see the Kafka cluster:

```text
arad-local
```

You should also see the topic:

```text
quality.measurements
```

You can view MLflow at:

```text
http://localhost:5000
```

To publish synthetic measurement data, run:

```powershell
python scripts\synthetic_publisher.py --count 1000 --delay-ms 100
```

To verify MLflow experiments and create a test run, run:

```powershell
python scripts\setup_mlflow.py
```
