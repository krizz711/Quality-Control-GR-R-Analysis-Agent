import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from api.main import app

client = TestClient(app, headers={"x-api-key": "arad-secret-key"})

@patch("api.main.mlflow")
@patch("api.main.AsyncSessionLocal")
def test_create_grr_study_xbar_r(mock_session_local, mock_mlflow):
    payload = {
        "part_ids": ["P1", "P2"],
        "operator_ids": ["A", "B"],
        "measurements": [
            {"part": "P1", "operator": "A", "value": 1.0},
            {"part": "P1", "operator": "A", "value": 1.1},
            {"part": "P2", "operator": "A", "value": 2.0},
            {"part": "P2", "operator": "A", "value": 2.1},
            {"part": "P1", "operator": "B", "value": 1.2},
            {"part": "P1", "operator": "B", "value": 1.1},
            {"part": "P2", "operator": "B", "value": 2.2},
            {"part": "P2", "operator": "B", "value": 2.1},
        ],
        "method": "xbar_r"
    }

    # Mock the async session context manager
    mock_session = AsyncMock()
    mock_session_local.return_value.__aenter__.return_value = mock_session

    response = client.post("/studies/grr", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert "study_id" in data
    assert "grr_percent" in data
    assert "acceptance" in data
    assert "ndc" in data

    # Verify database session was used
    mock_session.add.assert_called()
    mock_session.commit.assert_called()

    # Verify mlflow was called
    mock_mlflow.set_experiment.assert_called_with("grr_studies")

@patch("api.main.mlflow")
@patch("api.main.AsyncSessionLocal")
def test_create_grr_study_invalid_method(mock_session_local, mock_mlflow):
    payload = {
        "part_ids": ["P1", "P2"],
        "operator_ids": ["A", "B"],
        "measurements": [
            {"part": "P1", "operator": "A", "value": 1.0},
            {"part": "P1", "operator": "A", "value": 1.1},
            {"part": "P2", "operator": "A", "value": 2.0},
            {"part": "P2", "operator": "A", "value": 2.1},
            {"part": "P1", "operator": "B", "value": 1.2},
            {"part": "P1", "operator": "B", "value": 1.1},
            {"part": "P2", "operator": "B", "value": 2.2},
            {"part": "P2", "operator": "B", "value": 2.1},
        ],
        "method": "invalid_method"
    }

    response = client.post("/studies/grr", json=payload)
    
    # Should be rejected by Pydantic validation before reaching our function
    assert response.status_code == 422
