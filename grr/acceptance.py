"""
Acceptance criteria evaluator for GR&R studies.

Industry-standard thresholds (AIAG MSA 4th Ed.):
  - %GR&R < 10%   → Acceptable
  - 10% ≤ %GR&R ≤ 30% → Conditionally acceptable (may require improvement)
  - %GR&R > 30%   → Not acceptable
  - ndc ≥ 5        → Adequate measurement discrimination
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum

from grr.calculator import GRRResult

logger = logging.getLogger(__name__)


class AcceptanceLevel(Enum):
    """AIAG-based acceptance classification."""

    ACCEPTABLE = "acceptable"
    CONDITIONAL = "conditional"
    NOT_ACCEPTABLE = "not_acceptable"


@dataclass
class AcceptanceVerdict:
    """Result of evaluating a GR&R study against acceptance criteria."""

    level: AcceptanceLevel
    grr_percent: float
    ndc: int
    ndc_adequate: bool
    remarks: list[str]


def evaluate(
    result: GRRResult,
    *,
    grr_threshold_accept: float = 10.0,
    grr_threshold_conditional: float = 30.0,
    min_ndc: int = 5,
) -> AcceptanceVerdict:
    """
    Evaluate a GR&R result against configurable acceptance thresholds.

    Parameters
    ----------
    result : GRRResult
        Output from `grr.calculator.grr_xbar_r` or `grr.calculator.grr_anova`.
    grr_threshold_accept : float
        %GR&R below this is fully acceptable (default 10%).
    grr_threshold_conditional : float
        %GR&R between accept and this threshold is conditionally acceptable.
    min_ndc : int
        Minimum number of distinct categories (default 5).

    Returns
    -------
    AcceptanceVerdict
    """
    # TODO: Calculate %GR&R from result.total_grr
    # TODO: Classify into AcceptanceLevel based on thresholds
    # TODO: Check ndc >= min_ndc
    # TODO: Build remarks list with human-readable explanations
    # TODO: Return AcceptanceVerdict
    logger.info("evaluate called (stub)")
    raise NotImplementedError("Acceptance evaluation not yet implemented")
