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

### 24. Created async database connection module

Created this file:

```text
db/database.py
```

The module:

- loads `.env`
- reads `DATABASE_URL`
- creates an async SQLAlchemy engine
- creates `AsyncSessionLocal`
- exports `engine`, `AsyncSessionLocal`, and `get_session()`

### 25. Created Kafka-to-database consumer

Created this file:

```text
agent/consumer.py
```

The consumer:

- reads `KAFKA_BOOTSTRAP_SERVERS`
- subscribes to `quality.measurements`
- uses consumer group `arad-quality-consumer`
- disables auto commit
- inserts Kafka measurement messages into the `measurements` table
- commits the database transaction first
- commits the Kafka offset only after a successful insert
- continues running if an individual message fails
- closes cleanly on `KeyboardInterrupt`

### 26. Fixed consumer timestamp conversion

The Kafka publisher sends timestamps as ISO strings, but `asyncpg` expects a Python `datetime` object for `TIMESTAMPTZ`.

Updated the consumer to convert values like:

```text
2026-05-24T08:08:26.745123+00:00
```

into Python `datetime` values before inserting into PostgreSQL.

### 27. Verified Kafka-to-database flow

After checking the stack following `docker compose down`, verified that:

- all Docker services are running
- `quality.measurements` Kafka topic exists
- database extensions exist
- database tables exist
- MLflow responds on port `5000`
- pgAdmin responds on port `5050`
- MLflow setup script still works

Ran an end-to-end test:

```text
Before count: 40
After count: 43
Inserted during test: 3
```

This confirms the publisher-to-Kafka-to-consumer-to-TimescaleDB flow works.

## Architecture Decisions

### Deferred: Apache Flink
**Decision**: Flink stream processing deferred to Phase 3.
**Reason**: Phase 1 uses a simple Kafka consumer with direct TimescaleDB insert.
Phase 3 will add Flink for windowed SPC computations (1-hour sliding windows,
Xbar-R calculations across partitioned streams).
**Impact**: No impact on Phase 1 or Phase 2. GR&R studies read from TimescaleDB
directly, not from Flink.

### Decision: Stateless agent design
**Decision**: Each agent invocation is independent. No in-memory state between calls.
**Reason**: Full audit trail, reproducible results, simpler failure recovery.
Every GR&R study reads fresh from TimescaleDB on each run.

### Decision: Composite PK on measurements (id, timestamp)
**Decision**: TimescaleDB hypertable requires timestamp in all unique keys.
**Reason**: Hypertable partitions by timestamp column. PostgreSQL requires the
partition key in any primary key or unique constraint.
**Fix applied**: PRIMARY KEY (id, timestamp) instead of PRIMARY KEY (id).

## Current Status

The initial database schema is created, applied, and verified.

The Kafka stack is running and verified.

The synthetic measurement publisher script is created.

MLflow is running and verified.

The MLflow setup script is created and verified.

The local `.env` file is created and ignored by Git.

The async database module is created.

The Kafka consumer is created and verified.

The full publisher-to-database pipeline is working.

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
poetry run python scripts\synthetic_publisher.py --count 1000 --delay-ms 100
```

To run the Kafka database consumer, run:

```powershell
poetry run python -m agent.consumer
```

To verify MLflow experiments and create a test run, run:

```powershell
poetry run python scripts\setup_mlflow.py
```

### 28. Implemented GR&R Analytics Engine
Created the `grr_xbar_r` calculator logic following the AIAG MSA 4th Edition methodology, including %GRR, variance components (EV, AV, PV), and NDC calculations. Integrated this with dynamic acceptance logic (`evaluate()`) triggering human reviews for conditional outcomes.

### 29. Created Test Suite for GR&R
Built robust tests in `test_grr.py` using verified AIAG reference data (3 operators, 10 parts, 2 trials) ensuring standard outputs match exactly 24.29% GR&R. 

### 30. Designed PDF Report Generator
Implemented `create_pdf()` in `grr/report_generator.py` using `reportlab`. The module generates 2-page professional study reports visualizing variance component breakdowns and dynamically rendering conditional formatting (Green/Yellow/Red) based on the acceptance verdicts.

### 31. Built FastAPI GR&R Endpoint
Created the `POST /studies/grr` endpoint combining the full stack: 
- Parses payload to a Pandas DataFrame.
- Executes `grr_xbar_r` analytics.
- Inserts results safely into the `grr_studies` PostgreSQL table using `AsyncSessionLocal`.
- Forwards borderline studies to the `review_queue` table.
- Logs runtime parameters and computed metrics sequentially to `MLflow` under the `grr_studies` experiment.
- Fixed a trailing timezone-awareness SQLAlchemy mapping issue `(offset-naive vs offset-aware)`.
- Successfully verified the full data insertion chain!

### 32. Expanded API & ANOVA Method Support
- Implemented `GET /studies/{id}` endpoint in `api/main.py` to retrieve study results and details directly from PostgreSQL.
- Added `grr_anova` method to `calculator.py` to support two-way ANOVA analysis for GR&R datasets, specifically to handle scenarios with larger samples ($n > 10$).
- Handled edge cases by adding fallback error handling for unknown calculator methods.
- Optimized codebase and resolved Ruff linting warnings by removing unused variables.
- Configured FastAPI API tests (`tests/test_api_grr.py`) with `pytest` and `httpx` to verify payload submission, database interactions, and MLflow logging.

### 33. Implemented SPC Control Charts Engine
- Implemented `xbar_r_chart` in `spc/control_charts.py` for subgrouped data, utilizing AIAG A2, D3, D4 constants.
- Implemented `individuals_mr_chart` for non-subgrouped individual data utilizing a moving range approach (d2=1.128, multipliers 2.66 / 3.267).
- Implemented `p_chart` for defect proportion monitoring supporting variable subgroup sizes and calculating dynamic control limits per subgroup.
- Added comprehensive logging at `INFO` level and robust error/limit calculations for empty out-of-control conditions.

### 34. Developed Nelson Rules Engine
- Implemented all 8 Nelson rules in `spc/nelson_rules.py` for standard special-cause detection using sliding-window approaches.
- Created `evaluate_all_rules()` function to evaluate all 8 rules simultaneously on a dataset.
- Added full `INFO` level logging for reporting rule execution and violation summaries.

### 35. Integrated SPC Endpoint with Persistence
- Implemented `POST /spc/analyze` in `api/main.py` that dispatches to the correct SPC chart.
- Runs all 8 Nelson rules on the computed points.
- Automatically persists any critical (Nelson Rule 1) violations to the `quality_violations` TimescaleDB/PostgreSQL table with `severity="critical"`.
- Handled edge cases with robust try/except wrapping to return HTTP 422 on `ValueError`.

### 36. Completed SPC Test Suite & Validation
- Replaced all SPC stubs in `tests/test_spc.py` with 10 real passing tests covering:
  - `TestXbarRChart` limits and out-of-control detection.
  - `TestIMRChart` limits and outlier detection.
  - `TestNelsonRules` shift, trend, and outlier violation checks.
- Removed all `@pytest.mark.skip` decorators and verified a clean, passing test run.
- Completed e2e live request verification of the SPC endpoint.

### 37. SPC Bug Fixes & Expanded Test Coverage
- **Rule 4:** Fixed fragile alternating detection — use raw `diff` products instead of `np.sign` cross-products; skip flat (zero-delta) segments.
- **API Nelson evaluation:** Confirmed rules run on chart points (`primary_chart.points`) with chart `cl`/`sigma`, not raw request values; partial trailing subgroups truncated before `xbar_r` chart build.
- **`xbar_r_chart` validation:** Reject inconsistent subgroup sizes and unsupported sizes outside AIAG range (2–10); API enforces 2–10 for `xbar_r` only so `p` charts can use larger sample sizes.
- **Tests:** Added `TestPChart`, Nelson rules 4–8 unit tests, subgroup validation tests, and tightened false-positive Monte Carlo (chart-aligned Xbar data, threshold 0.20 → 0.10).
- **API tests:** Added `tests/test_api_spc.py` covering `xbar_r`, `i_mr`, `p`, partial-subgroup truncation, Rule 1 persistence, and invalid subgroup size (26 SPC tests passing).

