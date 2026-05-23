"""
Nelson Rules — Eight tests for special-cause variation detection.

Each rule returns a list of indices where the rule is violated.
Reference: Lloyd S. Nelson, "The Shewhart Control Chart—Tests for Special Causes",
           Journal of Quality Technology, 1984.
"""

from __future__ import annotations

import logging

import numpy as np

logger = logging.getLogger(__name__)


def rule_1_beyond_3sigma(values: np.ndarray, cl: float, sigma: float) -> list[int]:
    """Rule 1: One point beyond 3σ from the center line."""
    # TODO: Return indices where |value - cl| > 3 * sigma
    raise NotImplementedError


def rule_2_nine_same_side(values: np.ndarray, cl: float) -> list[int]:
    """Rule 2: Nine consecutive points on the same side of the center line."""
    # TODO: Sliding window of 9, check all above or all below cl
    raise NotImplementedError


def rule_3_six_trending(values: np.ndarray) -> list[int]:
    """Rule 3: Six consecutive points steadily increasing or decreasing."""
    # TODO: Check monotonic runs of length 6
    raise NotImplementedError


def rule_4_fourteen_alternating(values: np.ndarray) -> list[int]:
    """Rule 4: Fourteen consecutive points alternating up and down."""
    # TODO: Check alternating direction for 14 consecutive points
    raise NotImplementedError


def rule_5_two_of_three_beyond_2sigma(
    values: np.ndarray, cl: float, sigma: float
) -> list[int]:
    """Rule 5: Two of three consecutive points beyond 2σ (same side)."""
    # TODO: Sliding window of 3, count points beyond 2σ on same side
    raise NotImplementedError


def rule_6_four_of_five_beyond_1sigma(
    values: np.ndarray, cl: float, sigma: float
) -> list[int]:
    """Rule 6: Four of five consecutive points beyond 1σ (same side)."""
    # TODO: Sliding window of 5, count points beyond 1σ on same side
    raise NotImplementedError


def rule_7_fifteen_within_1sigma(
    values: np.ndarray, cl: float, sigma: float
) -> list[int]:
    """Rule 7: Fifteen consecutive points within 1σ of center line (stratification)."""
    # TODO: Sliding window of 15, all within ±1σ
    raise NotImplementedError


def rule_8_eight_beyond_1sigma(
    values: np.ndarray, cl: float, sigma: float
) -> list[int]:
    """Rule 8: Eight consecutive points beyond 1σ (on either side — mixture)."""
    # TODO: Sliding window of 8, all beyond ±1σ
    raise NotImplementedError


def evaluate_all_rules(
    values: np.ndarray, cl: float, sigma: float
) -> dict[str, list[int]]:
    """
    Run all eight Nelson rules and return a dict mapping rule names
    to lists of violating indices.
    """
    # TODO: Call each rule_* function and collect results
    # TODO: Return {"rule_1": [...], "rule_2": [...], ...}
    logger.info("evaluate_all_rules called (stub)")
    raise NotImplementedError("Nelson rules evaluation not yet implemented")
