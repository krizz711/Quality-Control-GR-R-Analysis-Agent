"""Tests for SPC control charts and Nelson rules."""

from __future__ import annotations

import numpy as np
import pytest

from spc.control_charts import ChartData, ControlLimits, individuals_mr_chart, xbar_r_chart
from spc.nelson_rules import evaluate_all_rules, rule_1_beyond_3sigma


# ─── Control chart tests ────────────────────────────────────────────────────

class TestXbarRChart:
    """Tests for Xbar-R control charts."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_basic_xbar_r(self) -> None:
        import pandas as pd

        data = pd.DataFrame({
            "subgroup": [1, 1, 1, 2, 2, 2, 3, 3, 3],
            "value": [10.1, 10.2, 10.0, 10.3, 10.1, 10.2, 9.9, 10.0, 10.1],
        })
        xbar, r = xbar_r_chart(data)
        assert xbar.limits.ucl > xbar.limits.cl > xbar.limits.lcl
        assert r.limits.ucl > 0


class TestIMRChart:
    """Tests for Individual-Moving Range charts."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_basic_imr(self) -> None:
        values = [10.1, 10.2, 10.0, 10.3, 10.1, 10.2, 9.9, 10.0, 10.1]
        i_chart, mr_chart = individuals_mr_chart(values)
        assert i_chart.limits.ucl > i_chart.limits.lcl
        assert mr_chart.limits.lcl == 0


# ─── Nelson rules tests ─────────────────────────────────────────────────────

class TestNelsonRules:
    """Tests for Nelson rule violation detection."""

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_rule_1_detects_outlier(self) -> None:
        values = np.array([10.0] * 20)
        values[10] = 100.0  # obvious outlier
        violations = rule_1_beyond_3sigma(values, cl=10.0, sigma=1.0)
        assert 10 in violations

    @pytest.mark.skip(reason="Stub — not yet implemented")
    def test_evaluate_all_returns_dict(self) -> None:
        values = np.random.normal(10.0, 1.0, 50)
        result = evaluate_all_rules(values, cl=10.0, sigma=1.0)
        assert isinstance(result, dict)
        assert "rule_1" in result
