"""Performance tests — T-P1 (API p99 ≤ 1s) and T-P2 (GRR runtime ≤ 5s).

Run locally:
    pytest tests/performance/ -v -s
"""
from __future__ import annotations

import os
import time
import statistics

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from grr.calculator import grr_xbar_r, grr_anova
from api.main import app


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

API_KEY = os.environ.get("API_AUTH_KEY", "test-api-key")
client = TestClient(app, headers={"x-api-key": API_KEY})


def _aiag_dataframe() -> pd.DataFrame:
    """AIAG MSA 4th edition reference dataset: 10 parts × 3 operators × 2 trials."""
    rows = []
    part_means = [2.7, 5.1, 5.8, 7.6, 3.9, 4.5, 6.2, 3.0, 5.5, 8.0]
    for op in ["A", "B", "C"]:
        for trial in range(2):
            for i, mean in enumerate(part_means):
                rows.append({
                    "part": f"P{i+1}",
                    "operator": op,
                    "measurement": round(mean + (0.1 * (ord(op) - 65)) + (0.05 * trial), 4),
                })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# T-P2: GRR calculation runtime ≤ 5 s
# ---------------------------------------------------------------------------

class TestGRRPerformance:
    """T-P2 — GRR calculation must complete within 5 seconds."""

    def test_xbar_r_runtime_within_sla(self):
        df = _aiag_dataframe()
        start = time.perf_counter()
        result = grr_xbar_r(df)
        elapsed = time.perf_counter() - start

        print(f"\n[T-P2] grr_xbar_r runtime: {elapsed * 1000:.1f} ms")
        assert result is not None
        assert elapsed < 5.0, f"grr_xbar_r took {elapsed:.3f}s — SLA is 5s"

    def test_anova_runtime_within_sla(self):
        df = _aiag_dataframe()
        start = time.perf_counter()
        result = grr_anova(df)
        elapsed = time.perf_counter() - start

        print(f"[T-P2] grr_anova runtime: {elapsed * 1000:.1f} ms")
        assert result is not None
        assert elapsed < 5.0, f"grr_anova took {elapsed:.3f}s — SLA is 5s"

    def test_anova_large_dataset_runtime(self):
        """50 parts × 3 operators × 3 trials via ANOVA (Xbar-R d2* table is capped at 10 parts)."""
        rows = []
        for part in range(1, 51):
            for op in ["A", "B", "C"]:
                for trial in range(3):
                    rows.append({
                        "part": f"P{part}",
                        "operator": op,
                        "measurement": round(part * 0.5 + 0.1 * (ord(op) - 65) + 0.05 * trial, 4),
                    })
        df = pd.DataFrame(rows)

        start = time.perf_counter()
        result = grr_anova(df)
        elapsed = time.perf_counter() - start

        print(f"[T-P2] grr_anova (50 parts × 3 ops × 3 trials): {elapsed * 1000:.1f} ms")
        assert result is not None
        assert elapsed < 5.0, f"grr_anova large dataset took {elapsed:.3f}s — SLA is 5s"


# ---------------------------------------------------------------------------
# T-P1: API p99 latency ≤ 1 s
# ---------------------------------------------------------------------------

class TestAPILatency:
    """T-P1 — 30 consecutive GRR analysis requests, p99 must be ≤ 1 second."""

    _PAYLOAD = {
        "part_ids": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
        "operator_ids": ["A", "B"],
        "measurements": [
            {"part": f"P{p}", "operator": op, "value": round(p * 0.5 + 0.05 * t, 4)}
            for p in range(1, 11)
            for op in ["A", "B"]
            for t in range(2)
        ],
        "method": "xbar_r",
    }

    def test_grr_api_p99_latency(self):
        REQUESTS = 30
        SLA_MS = 1000
        latencies: list[float] = []

        for i in range(REQUESTS):
            start = time.perf_counter()
            resp = client.post("/api/v1/studies/grr", json=self._PAYLOAD)
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies.append(elapsed_ms)
            assert resp.status_code in (200, 201), (
                f"Request {i} failed with {resp.status_code}: {resp.text[:200]}"
            )

        latencies.sort()
        p50 = statistics.median(latencies)
        p99_idx = int(len(latencies) * 0.99) - 1
        p99 = latencies[max(p99_idx, 0)]
        p_max = latencies[-1]

        print(f"\n[T-P1] {REQUESTS} requests — p50={p50:.0f}ms  p99={p99:.0f}ms  max={p_max:.0f}ms")
        assert p99 <= SLA_MS, f"p99 latency {p99:.0f}ms exceeds SLA of {SLA_MS}ms"

    def test_health_endpoint_latency(self):
        """Health endpoint must respond in < 200 ms (always)."""
        latencies: list[float] = []
        for _ in range(20):
            start = time.perf_counter()
            resp = client.get("/api/v1/health")
            latencies.append((time.perf_counter() - start) * 1000)
            assert resp.status_code == 200

        p99 = sorted(latencies)[int(len(latencies) * 0.99) - 1]
        print(f"\n[T-P1] /health p99={p99:.0f}ms")
        assert p99 <= 200, f"Health endpoint p99 {p99:.0f}ms exceeds 200ms"

    def test_spc_api_latency(self):
        """SPC analyze endpoint must respond within 1 s p99."""
        SLA_MS = 1000
        payload = {
            "chart_type": "xbar_r",
            "part_number": "PERF-TEST-001",
            "characteristic_name": "diameter_mm",
            "values": [10.0 + (i % 5) * 0.1 for i in range(50)],
            "subgroup_size": 5,
        }
        latencies: list[float] = []
        for _ in range(20):
            start = time.perf_counter()
            resp = client.post("/spc/analyze", json=payload)
            latencies.append((time.perf_counter() - start) * 1000)
            assert resp.status_code == 200, resp.text[:200]

        p99 = sorted(latencies)[int(len(latencies) * 0.99) - 1]
        print(f"[T-P1] /spc/analyze p99={p99:.0f}ms")
        assert p99 <= SLA_MS, f"SPC analyze p99 {p99:.0f}ms exceeds SLA of {SLA_MS}ms"
