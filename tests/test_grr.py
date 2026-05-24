"""Tests for GR&R calculator and acceptance modules."""

from __future__ import annotations

import pandas as pd
import pytest

from grr.acceptance import AcceptanceLevel, evaluate
from grr.calculator import GRRResult, grr_anova, grr_xbar_r


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def aiag_data() -> pd.DataFrame:
    """AIAG MSA 4th Edition reference data."""
    data = {
      "operator": ["A"]*20 + ["B"]*20 + ["C"]*20,
      "part": [p for p in range(1, 11) for _ in range(2)] * 3,
      "measurement": [
        # Operator A Trial 1, Trial 2 (alternating by part)
        0.29, 0.41, -0.56, -0.68, 1.34, 1.17, 0.47, 0.50, -0.80, -0.92,
        0.02, 0.11, 0.59, 0.75, -0.31, -0.20, 2.26, 1.99, -1.36, -1.25,
        # Operator B
        0.08, 0.25, -0.47, -1.22, 1.19, 0.94, 0.01, 1.03, -0.56, -1.20,
        0.47, 0.39, 0.02, 1.20, -0.20, 0.22, 1.76, 2.17, -1.47, -1.59,
        # Operator C
        0.04, 0.34, -1.38, -1.13, 0.88, 1.09, 0.14, 0.20, -1.46, -1.07,
        0.08, -0.11, 0.67, 0.95, 0.01, 0.30, 2.19, 2.01, -2.16, -1.65,
      ]
    }
    return pd.DataFrame(data)


# ─── Calculator tests ───────────────────────────────────────────────────────

class TestGRRXbarR:
    """Tests for the Xbar-R GR&R method."""

    def test_xbar_r_returns_grr_result(self, aiag_data: pd.DataFrame) -> None:
        result = grr_xbar_r(aiag_data)
        assert isinstance(result, GRRResult)
        assert 0 < result.total_grr < 100
        assert result.ndc >= 1
        assert result.repeatability > 0
        assert result.total_variation > 0

    def test_xbar_r_aiag_reference_values(self, aiag_data: pd.DataFrame) -> None:
        result = grr_xbar_r(aiag_data)
        # AIAG reference: %GRR should be in range 20-30% for this dataset
        assert 15.0 < result.total_grr < 35.0, f"GRR% out of expected range: {result.total_grr}"
        # NDC should be >= 2 for this dataset
        assert result.ndc >= 2, f"NDC too low: {result.ndc}"

    def test_perfect_measurement_system(self) -> None:
        # If all measurements are identical — EV=0, AV=0, GRR=0
        perfect = []
        for op in ["A", "B", "C"]:
            for part in range(1, 6):
                for trial in range(2):
                    perfect.append({"operator": op, "part": str(part), "measurement": 10.0 + part * 0.5})
        result = grr_xbar_r(pd.DataFrame(perfect))
        assert result.total_grr < 1.0, "Perfect system should have near-zero GRR"

    def test_invalid_input_raises(self) -> None:
        with pytest.raises(ValueError):
            grr_xbar_r(pd.DataFrame({"operator": ["A"], "part": ["P1"], "measurement": [10.0]}))


class TestGRRANOVA:
    """Tests for the ANOVA GR&R method."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_basic_anova(self, aiag_data: pd.DataFrame) -> None:
        result = grr_anova(aiag_data)
        assert result.total_grr >= 0
        assert result.ndc >= 1


# ─── Acceptance tests ───────────────────────────────────────────────────────

class TestAcceptance:
    """Tests for the acceptance criteria evaluator."""

    def test_acceptance_pass(self) -> None:
        good = GRRResult(
            total_grr=8.5,
            repeatability=0.05,
            reproducibility=0.03,
            part_variation=0.45,
            total_variation=0.50,
            ndc=7,
        )
        verdict = evaluate(good)
        assert verdict.level == AcceptanceLevel.ACCEPTABLE
        assert verdict.requires_human_review is False

    def test_acceptance_conditional_triggers_human_review(self) -> None:
        medium = GRRResult(
            total_grr=18.5,
            repeatability=0.10,
            reproducibility=0.08,
            part_variation=0.40,
            total_variation=0.50,
            ndc=4,
        )
        verdict = evaluate(medium)
        assert verdict.level == AcceptanceLevel.CONDITIONAL
        assert verdict.requires_human_review is True

    def test_acceptance_fail(self) -> None:
        bad = GRRResult(
            total_grr=45.0,
            repeatability=0.30,
            reproducibility=0.15,
            part_variation=0.20,
            total_variation=0.50,
            ndc=1,
        )
        verdict = evaluate(bad)
        assert verdict.level == AcceptanceLevel.NOT_ACCEPTABLE
        assert verdict.ndc_adequate is False
