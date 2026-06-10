"""
LLM Analyst — Gemini-powered intelligence layer for quality control.

Responsibilities:
  1. Generate natural-language GR&R study narratives with root-cause suggestions.
  2. Interpret SPC violation patterns and explain their manufacturing significance.
  3. Produce executive-ready summaries for quality engineers.
  4. Recommend corrective actions based on statistical findings.

Uses the Gemini API directly for quality analysis.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# ── Gemini API constants ──────────────────────────────────────────────────────
_MODEL = "gemini-2.5-flash"
_MAX_TOKENS = 1024
_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# ── System prompt (manufacturing quality domain expert) ───────────────────────
_SYSTEM_PROMPT = """You are an expert manufacturing quality engineer specializing in
Measurement System Analysis (MSA), Statistical Process Control (SPC), and
Gauge Repeatability & Reproducibility (GR&R) studies.

You follow AIAG MSA 4th Edition standards. Your responses are:
- Concise and actionable (quality engineers are busy)
- Technically accurate with correct statistical terminology
- Structured: finding → interpretation → recommended action
- Free of filler phrases — every sentence must add value

Always quantify severity. Always recommend a specific next step."""


def _is_valid_llm_response(text: str) -> bool:
    """Return False if the text is a known error placeholder from _call_gemini."""
    return not text.startswith("[AI analysis unavailable")


def _sanitize_field(value: str) -> str:
    """Strip characters that can break prompt templates or enable injection."""
    return value.replace("{", "").replace("}", "").replace("`", "").replace("\\", "")


@dataclass
class GRRNarrative:
    """AI-generated narrative for a GR&R study result."""

    summary: str           # 2-3 sentence executive summary
    root_cause_analysis: str   # What is likely causing the GRR level
    recommendations: list[str]  # Ordered list of corrective actions
    risk_assessment: str   # Production risk if equipment is used as-is
    confidence: str        # high / medium / low based on data quality


@dataclass
class SPCNarrative:
    """AI-generated interpretation of SPC violations."""

    pattern_description: str    # What the Nelson rules reveal
    manufacturing_significance: str  # What this means on the shop floor
    likely_causes: list[str]    # Ranked probable root causes
    urgency: str                # immediate / monitor / investigate
    recommended_actions: list[str]


@dataclass
class PredictiveInsight:
    """AI-generated forward-looking quality prediction."""

    trend_summary: str
    predicted_violation_risk: str   # high / medium / low
    time_to_action: str             # e.g. "within 2 shifts", "within 24 hours"
    leading_indicators: list[str]   # What to watch
    preventive_actions: list[str]


@retry(
    retry=retry_if_exception_type(httpx.TransportError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=False,
)
async def _call_gemini_inner(
    user_message: str,
    api_key: str,
    *,
    system: str = _SYSTEM_PROMPT,
    max_tokens: int = _MAX_TOKENS,
) -> tuple[str, int, int]:
    """
    Inner call to Gemini REST API. Returns (text, input_tokens, output_tokens).
    API key is passed via x-goog-api-key header (not URL param).
    Retries up to 3× on transient transport errors.
    """
    url = f"{_GEMINI_BASE_URL}/{_MODEL}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        input_tokens = usage.get("promptTokenCount", 0)
        output_tokens = usage.get("candidatesTokenCount", 0)
        return text, input_tokens, output_tokens


async def _call_gemini(
    user_message: str,
    api_key: str,
    *,
    system: str = _SYSTEM_PROMPT,
    max_tokens: int = _MAX_TOKENS,
    use_case: str = "general",
) -> str:
    """
    Public wrapper. Never raises — returns an error placeholder on failure.
    Logs token usage via Prometheus and MLflow.
    """
    try:
        text, input_tokens, output_tokens = await _call_gemini_inner(
            user_message, api_key, system=system, max_tokens=max_tokens
        )
        _record_token_usage(use_case, input_tokens, output_tokens)
        return text
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini API HTTP error %s: %s", exc.response.status_code, exc.response.text)
        return f"[AI analysis unavailable: HTTP {exc.response.status_code}]"
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        return f"[AI analysis unavailable: {exc}]"


try:
    from prometheus_client import Counter as _PCounter

    _llm_tokens_total = _PCounter(
        "llm_tokens_total",
        "Total tokens used by the LLM layer",
        ["model", "use_case", "direction"],
    )
    _prometheus_available = True
except Exception:
    _prometheus_available = False


def _record_token_usage(use_case: str, input_tokens: int, output_tokens: int) -> None:
    """Record token counts to Prometheus. Best-effort — never raises."""
    if not _prometheus_available or (input_tokens == 0 and output_tokens == 0):
        return
    try:
        _llm_tokens_total.labels(model=_MODEL, use_case=use_case, direction="input").inc(input_tokens)
        _llm_tokens_total.labels(model=_MODEL, use_case=use_case, direction="output").inc(output_tokens)
    except Exception:
        pass


def _parse_json_response(raw: str, fallback_key: str = "content") -> dict[str, Any]:
    """
    Parse a JSON response from Gemini. If JSON is not found,
    wrap the raw text in a dict under fallback_key.
    """
    # Find the first { ... } block
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(raw[start:end])
        except json.JSONDecodeError:
            pass
    return {fallback_key: raw.strip()}


# ── GR&R Narrative ────────────────────────────────────────────────────────────

async def generate_grr_narrative(
    grr_result: dict[str, Any],
    verdict: dict[str, Any],
    equipment_id: str,
    characteristic_name: str,
    api_key: str,
) -> GRRNarrative:
    """
    Generate a natural-language GR&R narrative with root-cause analysis
    and corrective action recommendations.

    Parameters
    ----------
    grr_result : dict
        GRRResult fields serialized: total_grr, repeatability, reproducibility,
        part_variation, total_variation, ndc, details.
    verdict : dict
        AcceptanceVerdict fields: level, grr_percent, ndc, ndc_adequate, remarks.
    equipment_id : str
        Equipment under study (e.g. "CMM-001").
    characteristic_name : str
        The measured characteristic (e.g. "bore_diameter").
    api_key : str
        Gemini API key.

    Returns
    -------
    GRRNarrative
    """
    equipment_id = _sanitize_field(equipment_id)
    characteristic_name = _sanitize_field(characteristic_name)

    grr_pct = grr_result.get("total_grr", 0)
    ev = grr_result.get("repeatability", 0)
    av = grr_result.get("reproducibility", 0)
    pv = grr_result.get("part_variation", 0)
    tv = grr_result.get("total_variation", 1)
    ndc = grr_result.get("ndc", 0)
    acceptance = verdict.get("level", "unknown")

    # Compute dominant source
    ev_pct = (ev / tv * 100) if tv > 0 else 0
    av_pct = (av / tv * 100) if tv > 0 else 0
    dominant = "repeatability (EV)" if ev > av else "reproducibility (AV)"
    dominant_pct = ev_pct if ev > av else av_pct

    prompt = f"""Analyze this GR&R study and respond with a JSON object.

STUDY DATA:
Equipment: {equipment_id}
Characteristic: {characteristic_name}
Method: {grr_result.get("details", {}).get("method", "xbar_r").upper()}
%GR&R: {grr_pct:.2f}%
Acceptance: {acceptance}
EV (Repeatability): {ev:.6f} ({ev_pct:.1f}% of TV)
AV (Reproducibility): {av:.6f} ({av_pct:.1f}% of TV)
PV (Part Variation): {pv:.6f}
TV (Total Variation): {tv:.6f}
NDC: {ndc}
Dominant source: {dominant} at {dominant_pct:.1f}%
NDC adequate (≥5): {verdict.get("ndc_adequate", False)}
Operators: {grr_result.get("details", {}).get("n_operators", "unknown")}
Parts: {grr_result.get("details", {}).get("n_parts", "unknown")}
Trials: {grr_result.get("details", {}).get("n_trials", "unknown")}

Respond ONLY with this JSON (no markdown, no preamble):
{{
  "summary": "2-3 sentence executive summary of study outcome",
  "root_cause_analysis": "Specific technical explanation of why GR&R is at this level, referencing the dominant source",
  "recommendations": ["Action 1 (most impactful)", "Action 2", "Action 3"],
  "risk_assessment": "Concrete production risk if this equipment is used as-is",
  "confidence": "high|medium|low"
}}"""

    raw = await _call_gemini(prompt, api_key, use_case="grr_narrative")
    parsed = _parse_json_response(raw) if _is_valid_llm_response(raw) else {}

    return GRRNarrative(
        summary=parsed.get("summary", raw[:300]),
        root_cause_analysis=parsed.get("root_cause_analysis", "Analysis unavailable."),
        recommendations=parsed.get("recommendations", ["Review measurement system."]),
        risk_assessment=parsed.get("risk_assessment", "Risk assessment unavailable."),
        confidence=parsed.get("confidence", "medium"),
    )


# ── SPC Pattern Interpretation ────────────────────────────────────────────────

async def interpret_spc_violations(
    chart_type: str,
    part_number: str,
    characteristic_name: str,
    violated_rules: dict[str, list[int]],
    control_limits: dict[str, float],
    recent_values: list[float],
    api_key: str,
) -> SPCNarrative:
    """
    Generate a manufacturing-meaningful interpretation of SPC Nelson rule violations.

    Parameters
    ----------
    chart_type : str
        "xbar_r", "i_mr", or "p"
    part_number : str
        The part under monitoring.
    characteristic_name : str
        The measured characteristic.
    violated_rules : dict
        Mapping of rule name → list of violating point indices.
    control_limits : dict
        {"ucl": float, "cl": float, "lcl": float}
    recent_values : list[float]
        The last N chart values for context.
    api_key : str
        Gemini API key.

    Returns
    -------
    SPCNarrative
    """
    part_number = _sanitize_field(part_number)
    characteristic_name = _sanitize_field(characteristic_name)
    active_rules = {k: v for k, v in violated_rules.items() if v}
    rule_descriptions = {
        "rule_1": "Point beyond 3σ (extreme outlier — immediate special cause)",
        "rule_2": "9 points same side of CL (sustained process shift)",
        "rule_3": "6 points trending (monotonic drift — tool wear, temp drift)",
        "rule_4": "14 points alternating (systematic over-correction or two processes)",
        "rule_5": "2/3 points beyond 2σ same side (developing shift)",
        "rule_6": "4/5 points beyond 1σ same side (gradual shift onset)",
        "rule_7": "15 points within 1σ (stratification — mixed batches or gauge error)",
        "rule_8": "8 points outside 1σ both sides (mixture — two processes or setups)",
    }

    active_descriptions = [
        f"{rule}: {rule_descriptions.get(rule, rule)} — {len(indices)} point(s)"
        for rule, indices in active_rules.items()
    ]

    if not active_descriptions:
        return SPCNarrative(
            pattern_description="Process is in statistical control. No Nelson rule violations detected.",
            manufacturing_significance="Current production is stable. Continue routine monitoring.",
            likely_causes=[],
            urgency="monitor",
            recommended_actions=["Maintain current process parameters.", "Review at next scheduled audit."],
        )

    recent_str = ", ".join(f"{v:.4f}" for v in recent_values[-10:])
    cl = control_limits.get("cl", 0)
    ucl = control_limits.get("ucl", 0)
    lcl = control_limits.get("lcl", 0)

    prompt = f"""Interpret these SPC violations for a manufacturing engineer. Respond ONLY with JSON.

CHART: {chart_type.upper()} | Part: {part_number} | Characteristic: {characteristic_name}
UCL: {ucl:.4f} | CL: {cl:.4f} | LCL: {lcl:.4f}
Recent values (last 10): [{recent_str}]

ACTIVE NELSON RULE VIOLATIONS:
{chr(10).join(f"  - {d}" for d in active_descriptions)}

Respond ONLY with this JSON (no markdown, no preamble):
{{
  "pattern_description": "What the combination of violated rules reveals about the process",
  "manufacturing_significance": "What this means on the production floor right now",
  "likely_causes": ["Most probable cause", "Second cause", "Third cause"],
  "urgency": "immediate|monitor|investigate",
  "recommended_actions": ["Action 1 (do now)", "Action 2", "Action 3"]
}}"""

    raw = await _call_gemini(prompt, api_key, use_case="spc_interpret")
    parsed = _parse_json_response(raw) if _is_valid_llm_response(raw) else {}

    return SPCNarrative(
        pattern_description=parsed.get("pattern_description", "Pattern analysis unavailable."),
        manufacturing_significance=parsed.get("manufacturing_significance", "Significance unavailable."),
        likely_causes=parsed.get("likely_causes", ["Special cause variation detected."]),
        urgency=parsed.get("urgency", "investigate"),
        recommended_actions=parsed.get("recommended_actions", ["Investigate immediately."]),
    )


async def generate_spc_narrative(
    violations: dict[str, list[int]],
    chart_type: str,
    process_name: str,
    api_key: str,
    *,
    control_limits: dict[str, float] | None = None,
    recent_values: list[float] | None = None,
) -> SPCNarrative:
    """Generate a short SPC narrative from Nelson rule violations.

    This is the lightweight public helper used by tests and callers that only
    know the process name. The fuller ``interpret_spc_violations`` API remains
    available when part, characteristic, limits, and recent values are known.
    """
    return await interpret_spc_violations(
        chart_type=chart_type,
        part_number=process_name,
        characteristic_name="process characteristic",
        violated_rules=violations,
        control_limits=control_limits or {"ucl": 0.0, "cl": 0.0, "lcl": 0.0},
        recent_values=recent_values or [],
        api_key=api_key,
    )


# ── Predictive Monitoring ─────────────────────────────────────────────────────

async def generate_predictive_insight(
    part_number: str,
    characteristic_name: str,
    values_history: list[float],
    control_limits: dict[str, float],
    recent_grr_pct: float | None,
    api_key: str,
) -> PredictiveInsight:
    """
    Predict future quality risks based on measurement trends,
    even before Nelson rules fire.

    Parameters
    ----------
    values_history : list[float]
        Ordered measurement values (oldest to newest).
    control_limits : dict
        {"ucl": float, "cl": float, "lcl": float}
    recent_grr_pct : float | None
        Most recent GR&R percentage for this equipment, if available.
    api_key : str
        Gemini API key.

    Returns
    -------
    PredictiveInsight
    """
    if len(values_history) < 5:
        return PredictiveInsight(
            trend_summary="Insufficient data for predictive analysis (need ≥5 points).",
            predicted_violation_risk="unknown",
            time_to_action="N/A",
            leading_indicators=["Collect more data"],
            preventive_actions=["Continue monitoring"],
        )

    cl = control_limits.get("cl", 0)
    ucl = control_limits.get("ucl", 0)
    lcl = control_limits.get("lcl", 0)
    sigma = (ucl - cl) / 3 if ucl > cl else 1.0

    # Compute basic statistics Gemini can use
    import statistics
    recent = values_history[-10:]
    mean_recent = statistics.mean(recent)
    stdev_recent = statistics.stdev(recent) if len(recent) > 1 else 0
    distance_from_cl = mean_recent - cl
    sigma_distance = distance_from_cl / sigma if sigma > 0 else 0

    # Simple trend: are values moving toward a limit?
    if len(recent) >= 4:
        first_half = statistics.mean(recent[:len(recent)//2])
        second_half = statistics.mean(recent[len(recent)//2:])
        drift_direction = "toward UCL" if second_half > first_half else "toward LCL"
        drift_magnitude = abs(second_half - first_half)
    else:
        drift_direction = "stable"
        drift_magnitude = 0.0

    grr_context = f"Most recent GR&R: {recent_grr_pct:.1f}%" if recent_grr_pct else "No recent GR&R data"

    values_str = ", ".join(f"{v:.4f}" for v in values_history[-20:])

    prompt = f"""Predict future quality risks from this measurement history. Respond ONLY with JSON.

CONTEXT:
Part: {part_number} | Characteristic: {characteristic_name}
{grr_context}
UCL: {ucl:.4f} | CL: {cl:.4f} | LCL: {lcl:.4f} | σ: {sigma:.4f}
Recent mean: {mean_recent:.4f} | Recent stdev: {stdev_recent:.4f}
Distance from CL: {sigma_distance:.2f}σ
Drift direction: {drift_direction} (magnitude: {drift_magnitude:.4f})
Last 20 values: [{values_str}]

Predict quality risks BEFORE Nelson rules fire. Respond ONLY with this JSON (no markdown):
{{
  "trend_summary": "Concise description of what the data trend shows",
  "predicted_violation_risk": "high|medium|low",
  "time_to_action": "Estimated time before intervention needed (e.g. '2-3 shifts', '24 hours', 'immediate')",
  "leading_indicators": ["Indicator 1 to watch", "Indicator 2", "Indicator 3"],
  "preventive_actions": ["Preventive action 1 (do now)", "Action 2", "Action 3"]
}}"""

    raw = await _call_gemini(prompt, api_key, use_case="spc_predict")
    parsed = _parse_json_response(raw) if _is_valid_llm_response(raw) else {}

    return PredictiveInsight(
        trend_summary=parsed.get("trend_summary", "Trend analysis unavailable."),
        predicted_violation_risk=parsed.get("predicted_violation_risk", "medium"),
        time_to_action=parsed.get("time_to_action", "Unknown"),
        leading_indicators=parsed.get("leading_indicators", ["Monitor closely"]),
        preventive_actions=parsed.get("preventive_actions", ["Review process parameters"]),
    )


# ── Conversational Agent ──────────────────────────────────────────────────────

async def answer_quality_question(
    question: str,
    context: dict[str, Any],
    conversation_history: list[dict[str, str]],
    api_key: str,
) -> str:
    """
    Answer a natural-language quality engineering question with full context.

    Parameters
    ----------
    question : str
        Engineer's question (e.g. "Why is CMM-001 failing GR&R?")
    context : dict
        Current system state — recent studies, violations, trends.
    conversation_history : list[dict]
        Prior turns: [{"role": "user"|"assistant", "content": "..."}]
    api_key : str
        Gemini API key.

    Returns
    -------
    str
        Conversational answer from Gemini.
    """
    context_str = json.dumps(context, indent=2, default=str)

    system = f"""{_SYSTEM_PROMPT}

You have access to the current quality system state below. Use it to answer 
the engineer's question accurately. Be concise. If data is missing, say so.
If a question falls outside quality engineering, redirect politely.

CURRENT SYSTEM STATE:
{context_str}"""

    # Build messages with history
    messages = []
    for turn in conversation_history[-6:]:  # keep last 6 turns for context window
        role = "model" if turn["role"] == "assistant" else "user"
        messages.append({"role": role, "parts": [{"text": turn["content"]}]})
    messages.append({"role": "user", "parts": [{"text": question}]})

    url = f"{_GEMINI_BASE_URL}/{_MODEL}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": messages,
        "generationConfig": {"maxOutputTokens": 600},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            usage = data.get("usageMetadata", {})
            _record_token_usage(
                "chat",
                usage.get("promptTokenCount", 0),
                usage.get("candidatesTokenCount", 0),
            )
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini chat error %s", exc.response.status_code)
        return f"I'm having trouble connecting right now (HTTP {exc.response.status_code}). Please try again."
    except Exception as exc:
        logger.error("Gemini chat failed: %s", exc)
        return "I'm temporarily unavailable. Please try again in a moment."
