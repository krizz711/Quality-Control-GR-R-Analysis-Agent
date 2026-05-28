"""Gemini service helpers for quality analysis.

This module provides async-compatible Gemini wrappers for GR&R analysis,
SPC anomaly analysis, and full quality report generation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import Any, Callable, TypeVar

import google.generativeai as genai

logger = logging.getLogger(__name__)

# Lazy-initialized Gemini model. Do not crash on import when GEMINI_API_KEY is
# absent — initialize at call time to allow running the API without AI keys.
_model = None
MODEL_NAME = "gemini-1.5-flash"

if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def _ensure_model() -> None:
    """Ensure the global _model is configured. Raises ValueError if key missing."""
    global _model
    if _model is not None:
        return
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set; Gemini calls are disabled")
    genai.configure(api_key=api_key)
    _model = genai.GenerativeModel(MODEL_NAME)

_T = TypeVar("_T")


def _data_to_json(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=True, default=str)


def _build_prompt(task_name: str, payload: dict[str, Any], instructions: str) -> str:
    return (
        f"You are a manufacturing quality analysis assistant.\n\n"
        f"Task: {task_name}\n\n"
        f"Instructions:\n{instructions}\n\n"
        f"Input data (JSON):\n{_data_to_json(payload)}\n"
    )


async def _generate_text(prompt: str) -> str:
    """Call Gemini in a background thread and return the generated text."""

    logger.info("Calling Gemini model %s", MODEL_NAME)

    try:
        _ensure_model()
        response = await asyncio.to_thread(_model.generate_content, prompt)
        text = getattr(response, "text", None)
        if not text:
            raise ValueError("Gemini returned an empty response")
        return text
    except ValueError:
        # Propagate missing-key error to caller for explicit handling in tests
        raise
    except Exception as exc:
        logger.exception("Gemini call failed")
        return f"Error calling Gemini: {exc}"


async def analyze_grr(measurement_data: dict[str, Any]) -> str:
    """Analyze GR&R measurement data and return Gemini output text."""

    prompt = _build_prompt(
        "GR&R analysis",
        measurement_data,
        """
Analyze the GR&R measurement study in detail.
Focus on repeatability, reproducibility, part variation, total variation,
ndc, acceptance implications, and practical recommendations.
Return a concise but detailed manufacturing-quality explanation.
""".strip(),
    )
    return await _generate_text(prompt)


async def analyzeGRR(measurement_data: dict[str, Any]) -> str:
    """CamelCase alias for analyze_grr."""

    return await analyze_grr(measurement_data)


async def analyze_spc_anomaly(chart_data: dict[str, Any]) -> str:
    """Analyze SPC anomaly data and return Gemini output text."""

    prompt = _build_prompt(
        "SPC anomaly analysis",
        chart_data,
        """
Analyze the SPC chart data for anomalies, control-limit violations,
Nelson rule patterns, process drift, special causes, and suggested actions.
Return a detailed explanation for a manufacturing quality engineer.
""".strip(),
    )
    return await _generate_text(prompt)


async def analyzeSPCAnomaly(chart_data: dict[str, Any]) -> str:
    """CamelCase alias for analyze_spc_anomaly."""

    return await analyze_spc_anomaly(chart_data)


async def generate_quality_report(all_data: dict[str, Any]) -> str:
    """Generate a combined quality report and return Gemini output text."""

    prompt = _build_prompt(
        "quality report generation",
        all_data,
        """
Create a detailed quality report covering GR&R results, SPC findings,
trend observations, risks, and recommended next steps.
Structure the response clearly and make it suitable for a quality review.
""".strip(),
    )
    return await _generate_text(prompt)


async def generateQualityReport(all_data: dict[str, Any]) -> str:
    """CamelCase alias for generate_quality_report."""

    return await generate_quality_report(all_data)


def analyze_grr_sync(measurement_data: dict[str, Any]) -> str:
    """Synchronous wrapper for analyze_grr."""

    return asyncio.run(analyze_grr(measurement_data))


def analyzeGRR_sync(measurement_data: dict[str, Any]) -> str:
    """CamelCase alias for analyze_grr_sync."""

    return analyze_grr_sync(measurement_data)


def analyze_spc_anomaly_sync(chart_data: dict[str, Any]) -> str:
    """Synchronous wrapper for analyze_spc_anomaly."""

    return asyncio.run(analyze_spc_anomaly(chart_data))


def analyzeSPCAnomaly_sync(chart_data: dict[str, Any]) -> str:
    """CamelCase alias for analyze_spc_anomaly_sync."""

    return analyze_spc_anomaly_sync(chart_data)


def generate_quality_report_sync(all_data: dict[str, Any]) -> str:
    """Synchronous wrapper for generate_quality_report."""

    return asyncio.run(generate_quality_report(all_data))


def generateQualityReport_sync(all_data: dict[str, Any]) -> str:
    """CamelCase alias for generate_quality_report_sync."""

    return generate_quality_report_sync(all_data)


if __name__ == "__main__":
    sample_mode = sys.argv[1] if len(sys.argv) > 1 else "report"

    sample_grr = {
        "equipment_id": "CMM-001",
        "characteristic_name": "bore_diameter",
        "grr_percent": 18.4,
        "ndc": 7,
        "repeatability": 0.12,
        "reproducibility": 0.08,
        "part_variation": 1.95,
        "measurements": [
            {"part": "P1", "operator": "A", "value": 10.01},
            {"part": "P1", "operator": "B", "value": 10.03},
        ],
    }
    sample_spc = {
        "chart_type": "i_mr",
        "ucl": 10.5,
        "cl": 10.0,
        "lcl": 9.5,
        "recent_values": [9.9, 10.0, 10.1, 10.3, 10.4, 10.45],
        "violated_rules": {"rule_1": [5], "rule_2": []},
    }
    sample_report = {
        "grr": sample_grr,
        "spc": sample_spc,
        "summary": {"shift": "A", "line": "Line 3", "status": "review"},
    }

    if sample_mode == "grr":
        result = analyze_grr_sync(sample_grr)
    elif sample_mode == "spc":
        result = analyze_spc_anomaly_sync(sample_spc)
    else:
        result = generate_quality_report_sync(sample_report)

    print(result)
