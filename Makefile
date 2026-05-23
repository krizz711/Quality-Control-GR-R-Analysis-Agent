.PHONY: install test lint run-api

# ─── Install all dependencies via Poetry ─────────────────────────────────────
install:
	poetry install

# ─── Run the test suite ──────────────────────────────────────────────────────
test:
	poetry run pytest -v

# ─── Lint & format with Ruff ─────────────────────────────────────────────────
lint:
	poetry run ruff check .
	poetry run ruff format --check .

# ─── Start the FastAPI dev server ────────────────────────────────────────────
run-api:
	poetry run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
