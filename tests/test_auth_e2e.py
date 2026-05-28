import os
import subprocess
import time

# Point settings at the seeded sqlite DB and provide required secrets before importing app
os.environ.setdefault(
    "DATABASE_URL",
    "sqlite+aiosqlite:///" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_users.db")),
)
os.environ.setdefault("API_AUTH_KEY", "test-api-key")

# Ensure the seeded DB exists by running the seed script
seed_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts", "seed_users_db.py"))
subprocess.run(["python", seed_script], check=True)

from fastapi.testclient import TestClient
from jose import jwt

from api.main import app


def test_login_with_seeded_user():
    client = TestClient(app)
    resp = client.post("/api/v1/auth/token", json={"username": "admin", "password": "adminpass"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]
    payload = jwt.decode(token, "dev-jwt-secret-change-me", algorithms=["HS256"])
    assert payload.get("sub") == "admin"
    assert payload.get("role") == "admin"
