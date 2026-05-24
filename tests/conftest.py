"""
tests/conftest.py — shared pytest configuration.

pytest-asyncio is configured project-wide via pyproject.toml
(asyncio_mode = "auto"), so no explicit event-loop fixture is needed here.
This file exists to ensure the project root is on sys.path so that
all internal packages (core, db, schemas, …) are importable during tests.
"""

import sys
from pathlib import Path

# Make the project root importable when running pytest from any directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
