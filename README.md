# Arad Quality Agent

Manufacturing quality control platform for automated GR&R analysis, SPC monitoring, quality alerting, audit trails, and AI-assisted quality engineering review.

## Production Readiness

The app now has a production-oriented compose stack with:

- FastAPI API service with API-key protection for business endpoints
- public `/health` and `/metrics` endpoints for orchestration and Prometheus
- Kafka consumer service for real-time measurement ingestion
- TimescaleDB initialization from the checked-in migration
- dashboard service built with mock data disabled by default
- MLflow, Prometheus, Grafana, Kafka UI, and pgAdmin support services
- audit log persistence for GR&R completion and review decisions
- CI gates for backend tests and dashboard production build

Before a real production deployment, rotate every secret in `.env`, set `ENVIRONMENT=production`, and use a managed secret store or deployment platform secrets.

## Project layout

This repository has **one canonical root**. All commands (`docker compose`, `make`, `pytest`) run from here.

| Path | Role |
| --- | --- |
| `api/`, `agent/`, `grr/`, `spc/` | Backend application code |
| `dashboard/` | Next.js UI |
| `docker-compose.yml` | Full stack orchestration |
| `.env` | **Your secrets** (gitignored, root only) |
| `arad-quality-agent/` | **Legacy nested clone — do not use.** Gitignored. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md). |

## Quick Start

```bash
cp .env.example .env
# If migrating from arad-quality-agent/.env:
# python scripts/bootstrap_env.py

docker compose up --build
```

> **Deploying?** See [DEPLOYMENT.md](DEPLOYMENT.md) for the full production guide:
> single-VPS + TLS, managed-cloud options (Render/Railway/Fly/AWS/GCP), secret
> rotation, and the pre-go-live hardening checklist.

Services:

| Service | URL |
| --- | --- |
| Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| API health | http://localhost:8000/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 |
| Kafka UI | http://localhost:8080 |
| pgAdmin | http://localhost:5050 |
| MLflow | http://localhost:5000 |

## Local Development

```bash
make install
make run-api
```

Dashboard:

```bash
cd dashboard
npm install
npm run dev
```

## Verification

Normal release gate:

```bash
make prod-check
```

Live pipeline gate, requiring Docker services and the consumer:

```bash
docker compose up --build
python -m pytest -m integration -v
```

## Architecture

| Package | Purpose |
| --- | --- |
| `agent/` | Kafka consumer, orchestration, alerting, AI helpers |
| `grr/` | Gage Repeatability & Reproducibility calculations and acceptance |
| `spc/` | Statistical Process Control charts and Nelson rules |
| `api/` | FastAPI REST API |
| `db/` | SQLAlchemy models and database migration |
| `dashboard/` | Next.js manufacturing quality dashboard |

## Deployment Notes

- `API_AUTH_KEY` must be a strong random secret in production.
- `ALLOW_MOCK_DATA` and `NEXT_PUBLIC_ALLOW_MOCK_DATA` must stay `false` in production.
- `CORS_ORIGINS` must list exact dashboard origins and must not use `*`.
- Prometheus scrapes `api:8000/metrics` inside the compose network.
- Grafana is exposed on host port `3002` so the product dashboard can use `3000`.
- The checked-in `.env.example` contains placeholders only; never commit real `.env` values.
