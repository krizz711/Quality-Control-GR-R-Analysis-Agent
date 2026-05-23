"""
GR&R Calculator — ANOVA and Xbar-R methods for measurement system analysis.

References:
  - AIAG MSA Manual, 4th Edition
  - Montgomery, "Introduction to Statistical Quality Control", Ch. 8
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class GRRResult:
    """Container for GR&R study outputs."""

    total_grr: float  # %GR&R of total variation
    repeatability: float  # Equipment Variation (EV)
    reproducibility: float  # Appraiser Variation (AV)
    part_variation: float  # Part-to-part Variation (PV)
    total_variation: float  # Total Variation (TV)
    ndc: int  # Number of Distinct Categories
    details: dict[str, Any] | None = None


def grr_xbar_r(
    data: pd.DataFrame,
    *,
    part_col: str = "part",
    operator_col: str = "operator",
    measurement_col: str = "measurement",
    tolerance: float | None = None,
) -> GRRResult:
    """
    Perform a GR&R study using the Xbar-R (Average & Range) method.

    Parameters
    ----------
    data : pd.DataFrame
        Long-format dataframe with columns for part, operator, and measurement.
    part_col, operator_col, measurement_col : str
        Column name overrides.
    tolerance : float | None
        If provided, %GR&R is calculated relative to the tolerance band
        instead of total variation.

    Returns
    -------
    GRRResult
    """
    # TODO: Validate input shape (parts × operators × trials)
    # TODO: Compute range per operator-part combination
    # TODO: Calculate R-bar, X-bar-bar
    # TODO: Look up d2* constants based on number of trials
    # TODO: Compute EV = R-bar / d2
    # TODO: Compute AV = sqrt((X_diff / d2*)^2 - EV^2 / (n * r))
    # TODO: Compute PV = R_p / d2*
    # TODO: Compute TV = sqrt(EV^2 + AV^2 + PV^2)
    # TODO: Compute %GR&R = (GR&R / TV) * 100  (or vs tolerance)
    # TODO: Compute ndc = int(1.41 * PV / GR&R)
    logger.info("grr_xbar_r called (stub)")
    raise NotImplementedError("Xbar-R GR&R calculation not yet implemented")


def grr_anova(
    data: pd.DataFrame,
    *,
    part_col: str = "part",
    operator_col: str = "operator",
    measurement_col: str = "measurement",
    tolerance: float | None = None,
) -> GRRResult:
    """
    Perform a GR&R study using the ANOVA method.

    This method can also capture the operator × part interaction effect.

    Parameters
    ----------
    data : pd.DataFrame
        Long-format dataframe with columns for part, operator, and measurement.
    tolerance : float | None
        Optional tolerance band for %GR&R calculation.

    Returns
    -------
    GRRResult
    """
    # TODO: Build two-way ANOVA table (operator, part, operator×part)
    # TODO: Use scipy.stats or statsmodels for F-tests
    # TODO: Extract variance components from mean squares
    # TODO: If interaction is not significant (α > 0.05), pool into error
    # TODO: Compute EV, AV, interaction, PV from variance components
    # TODO: Compute TV, %GR&R, ndc
    logger.info("grr_anova called (stub)")
    raise NotImplementedError("ANOVA GR&R calculation not yet implemented")
