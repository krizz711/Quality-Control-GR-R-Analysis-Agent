"""
Control Charts — Xbar-R, Xbar-S, Individual-MR, and p/np/c/u charts.

Provides functions to compute control limits and plot data for
real-time SPC monitoring on the manufacturing floor.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class ControlLimits:
    """Computed control limits for a chart."""

    ucl: float  # Upper Control Limit
    cl: float   # Center Line
    lcl: float  # Lower Control Limit
    sigma: float = 0.0


@dataclass
class ChartData:
    """Full chart output including limits and plotted points."""

    chart_type: str
    limits: ControlLimits
    points: list[float] = field(default_factory=list)
    out_of_control: list[int] = field(default_factory=list)  # indices
    metadata: dict[str, Any] = field(default_factory=dict)


def xbar_r_chart(
    data: pd.DataFrame,
    *,
    subgroup_col: str = "subgroup",
    value_col: str = "value",
) -> tuple[ChartData, ChartData]:
    """
    Compute Xbar and R charts for subgrouped data.

    Returns
    -------
    tuple[ChartData, ChartData]
        (xbar_chart, r_chart)
    """
    # TODO: Group data by subgroup, compute means and ranges
    # TODO: Calculate X-bar-bar and R-bar
    # TODO: Look up A2, D3, D4 constants based on subgroup size
    # TODO: Compute Xbar limits: UCL = X-bar-bar + A2*R-bar, LCL = X-bar-bar - A2*R-bar
    # TODO: Compute R limits: UCL = D4*R-bar, LCL = D3*R-bar
    # TODO: Identify out-of-control points
    logger.info("xbar_r_chart called (stub)")
    raise NotImplementedError("Xbar-R chart not yet implemented")


def individuals_mr_chart(
    values: list[float] | np.ndarray,
) -> tuple[ChartData, ChartData]:
    """
    Compute Individual (I) and Moving Range (MR) charts.

    Returns
    -------
    tuple[ChartData, ChartData]
        (i_chart, mr_chart)
    """
    # TODO: Compute moving ranges MR_i = |x_i - x_{i-1}|
    # TODO: Calculate MR-bar
    # TODO: I chart limits: UCL = X-bar + 2.66*MR-bar, LCL = X-bar - 2.66*MR-bar
    # TODO: MR chart limits: UCL = 3.267*MR-bar, LCL = 0
    # TODO: Identify out-of-control points
    logger.info("individuals_mr_chart called (stub)")
    raise NotImplementedError("I-MR chart not yet implemented")


def p_chart(
    defective_counts: list[int],
    sample_sizes: list[int],
) -> ChartData:
    """
    Compute a p-chart (proportion nonconforming).
    """
    # TODO: Compute p-bar = sum(defectives) / sum(sample_sizes)
    # TODO: Compute variable limits per subgroup (if sizes vary)
    # TODO: Identify out-of-control points
    logger.info("p_chart called (stub)")
    raise NotImplementedError("p-chart not yet implemented")
