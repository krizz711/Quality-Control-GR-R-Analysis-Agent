# Arad Quality Agent

Manufacturing quality control agent with GR&R analysis, SPC charting, and intelligent alerting.

## Quick Start

```bash
# Install dependencies
make install

# Run the API server
make run-api

# Run tests
make test

# Lint
make lint
```

## Architecture

| Package | Purpose |
|---------|---------|
| `agent/` | LLM-powered orchestrator — Kafka consumer, event routing, alerting |
| `grr/` | Gauge Repeatability & Reproducibility (Xbar-R, ANOVA, acceptance) |
| `spc/` | Statistical Process Control (control charts, Nelson rules) |
| `api/` | FastAPI REST layer |

## Infrastructure

```bash
# Start Postgres, Kafka, and MLflow locally
docker compose up -d
```

Copy `.env.example` to `.env` and fill in your credentials.
