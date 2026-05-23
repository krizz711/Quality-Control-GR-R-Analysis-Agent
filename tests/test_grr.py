"""Tests for GR&R calculator and acceptance modules."""

from __future__ import annotations

import pandas as pd
import pytest

from grr.acceptance import AcceptanceLevel, evaluate
from grr.calculator import GRRResult, grr_anova, grr_xbar_r


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_grr_data() -> pd.DataFrame:
    """
    Minimal GR&R dataset: 3 operators × 5 parts × 2 trials.
    Replace with realistic measurements when implementing.
    """
    rows = []
    for operator in ["A", "B", "C"]:
        for part in range(1, 6):
            for trial in range(1, 3):
                rows.append({
                    "operator": operator,
                    "part": f"P{part}",
                    "measurement": 10.0 + part * 0.1 + trial * 0.01,
                })
    return pd.DataFrame(rows)


@pytest.fixture
def mock_grr_result() -> GRRResult:
    """A pre-computed GR&R result for testing acceptance logic."""
    return GRRResult(
        total_grr=8.5,
        repeatability=5.2,
        reproducibility=3.1,
        part_variation=45.0,
        total_variation=50.0,
        ndc=7,
    )


# ─── Calculator tests ───────────────────────────────────────────────────────

class TestGRRXbarR:
    """Tests for the Xbar-R GR&R method."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_basic_xbar_r(self, sample_grr_data: pd.DataFrame) -> None:
        result = grr_xbar_r(sample_grr_data)
        assert result.total_grr >= 0
        assert result.ndc >= 1

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_xbar_r_with_tolerance(self, sample_grr_data: pd.DataFrame) -> None:
        result = grr_xbar_r(sample_grr_data, tolerance=1.0)
        assert result.total_grr >= 0


class TestGRRANOVA:
    """Tests for the ANOVA GR&R method."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_basic_anova(self, sample_grr_data: pd.DataFrame) -> None:
        result = grr_anova(sample_grr_data)
        assert result.total_grr >= 0
        assert result.ndc >= 1


# ─── Acceptance tests ───────────────────────────────────────────────────────

class TestAcceptance:
    """Tests for the acceptance criteria evaluator."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_acceptable(self, mock_grr_result: GRRResult) -> None:
        verdict = evaluate(mock_grr_result)
        assert verdict.level == AcceptanceLevel.ACCEPTABLE

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_not_acceptable(self) -> None:
        bad_result = GRRResult(
            total_grr=45.0,
            repeatability=30.0,
            reproducibility=15.0,
            part_variation=20.0,
            total_variation=50.0,
            ndc=2,
        )
        verdict = evaluate(bad_result)
        assert verdict.level == AcceptanceLevel.NOT_ACCEPTABLE
