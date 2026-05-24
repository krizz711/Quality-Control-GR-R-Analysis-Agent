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
    # 1. VALIDATE INPUT
    n_operators = data[operator_col].nunique()
    n_parts = data[part_col].nunique()

    if n_operators < 2 or n_parts < 2:
        raise ValueError("Data must have at least 2 unique operators and 2 unique parts.")

    trials_per_cell = data.groupby([operator_col, part_col]).size()
    k = int(trials_per_cell.iloc[0])
    if not (trials_per_cell == k).all():
        raise ValueError("Each operator-part combination must have the same number of trials.")

    # 2. COMPUTE RANGES PER OPERATOR-PART CELL
    ranges_series = (
        data.groupby([operator_col, part_col])[measurement_col].max()
        - data.groupby([operator_col, part_col])[measurement_col].min()
    )
    ranges = ranges_series.reset_index(name="range")

    # 3. COMPUTE R-BAR (average range)
    R_bar = ranges["range"].mean()

    # 4. COMPUTE X-BAR PER OPERATOR (average measurement per operator)
    x_bar_operator = data.groupby(operator_col)[measurement_col].mean()
    X_diff = x_bar_operator.max() - x_bar_operator.min()

    # 5. COMPUTE PART AVERAGES
    x_bar_part = data.groupby(part_col)[measurement_col].mean()
    R_p = x_bar_part.max() - x_bar_part.min()

    # 6. LOOK UP d2* CONSTANTS
    d2_star = {
        2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
        6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.179
    }

    try:
        d2_EV = d2_star[k]
        d2_AV = d2_star[n_operators]
        d2_PV = d2_star[n_parts]
    except KeyError as e:
        raise ValueError(f"Value not supported in d2* table: {e.args[0]}. Table supports values 2-10.")

    # 7. COMPUTE VARIANCE COMPONENTS
    EV = R_bar / d2_EV
    AV_squared = (X_diff / d2_AV)**2 - (EV**2 / (n_parts * k))
    AV = np.sqrt(max(0, AV_squared))
    PV = R_p / d2_PV
    GRR = np.sqrt(EV**2 + AV**2)
    TV = np.sqrt(GRR**2 + PV**2)

    # 8. COMPUTE %GRR
    if tolerance is not None:
        grr_percent = (GRR / (tolerance / 6)) * 100
    else:
        grr_percent = (GRR / TV) * 100

    # 9. COMPUTE NDC
    ndc = int(1.41 * (PV / GRR)) if GRR > 0 else 0

    # 10. RETURN GRRResult
    result = GRRResult(
        total_grr=round(grr_percent, 4),
        repeatability=round(EV, 6),
        reproducibility=round(AV, 6),
        part_variation=round(PV, 6),
        total_variation=round(TV, 6),
        ndc=ndc,
        details={
            "r_bar": R_bar,
            "x_diff": X_diff,
            "r_p": R_p,
            "n_operators": n_operators,
            "n_parts": n_parts,
            "n_trials": k,
            "method": "xbar_r"
        }
    )

    logger.info("Calculated GR&R Xbar-R successfully: %s", result)
    return result


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
