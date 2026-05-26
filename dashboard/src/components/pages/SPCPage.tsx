"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Maximize2,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
} from "recharts";
import {
  analyzeSPC,
  interpretSPCViolations,
  predictSPCViolations,
} from "@/lib/hooks";
import type { SPCResponse, SPCInterpretResponse, PredictResponse } from "@/lib/types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const SPCTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { value: number; violation?: string; index: number } }> }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-[11px]"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${d.violation ? "rgba(248,113,113,0.3)" : "var(--border-default)"}`,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>
        {d.value.toFixed(4)}
      </div>
      <div style={{ color: "var(--text-muted)" }}>Subgroup {d.index + 1}</div>
      {d.violation && (
        <div className="flex items-center gap-1 mt-1" style={{ color: "var(--critical)" }}>
          <AlertTriangle size={10} />
          <span className="font-semibold">Out of Control</span>
        </div>
      )}
    </div>
  );
};

type UIChartPoint = { index: number; value: number; violation?: string };
type UIControlChart = {
  id: string;
  machine_id: string;
  part_number: string;
  characteristic: string;
  chart_type: "xbar_r" | "i_mr" | "p";
  ucl: number;
  cl: number;
  lcl: number;
  data: UIChartPoint[];
  active_violations: { rule: string; points: number[]; severity: "critical" | "warning" }[];
  status: "stable" | "warning" | "critical";
};

function ControlChartCard({ chart, expanded, onExpand }: { chart: UIControlChart; expanded: boolean; onExpand: () => void }) {
  const sigma = (chart.ucl - chart.cl) / 3;
  const zone2Upper = chart.cl + 2 * sigma;
  const zone2Lower = chart.cl - 2 * sigma;
  const zone1Upper = chart.cl + sigma;
  const zone1Lower = chart.cl - sigma;

  const statusColor = chart.status === "critical" ? "var(--critical)" : chart.status === "warning" ? "var(--warning)" : "var(--success)";

  return (
    <motion.div
      layout
      variants={item}
      className={`surface-card overflow-hidden ${expanded ? "lg:col-span-2" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: statusColor,
              boxShadow: chart.status !== "stable" ? `0 0 8px ${statusColor}66` : "none",
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {chart.machine_id}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {chart.chart_type.toUpperCase().replace("_", "-")}
              </span>
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
              {chart.characteristic} · {chart.part_number}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chart.active_violations.length > 0 && (
            <span className={`badge ${chart.status === "critical" ? "badge-critical" : "badge-warning"}`}>
              <AlertTriangle size={9} />
              {chart.active_violations.map((v) => v.rule).join(", ")}
            </span>
          )}
          {chart.status === "stable" && (
            <span className="badge badge-success">
              <CheckCircle2 size={9} /> In Control
            </span>
          )}
          <button
            onClick={onExpand}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: "var(--text-ghost)", background: "var(--bg-hover)" }}
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={expanded ? 320 : 220}>
          <LineChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

            {/* Zone shading */}
            <ReferenceArea y1={zone1Upper} y2={zone1Lower} fill="rgba(99,145,255,0.02)" />
            <ReferenceArea y1={zone2Upper} y2={zone1Upper} fill="rgba(251,191,36,0.02)" />
            <ReferenceArea y1={zone1Lower} y2={zone2Lower} fill="rgba(251,191,36,0.02)" />

            {/* Control limits */}
            <ReferenceLine y={chart.ucl} stroke="var(--critical)" strokeDasharray="8 4" strokeWidth={1} opacity={0.6} label={{ value: "UCL", position: "right", fill: "var(--critical)", fontSize: 9 }} />
            <ReferenceLine y={chart.cl} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} label={{ value: "CL", position: "right", fill: "var(--accent)", fontSize: 9 }} />
            <ReferenceLine y={chart.lcl} stroke="var(--critical)" strokeDasharray="8 4" strokeWidth={1} opacity={0.6} label={{ value: "LCL", position: "right", fill: "var(--critical)", fontSize: 9 }} />

            <XAxis
              dataKey="index"
              tick={{ fill: "var(--text-ghost)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => String(v + 1)}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              width={55}
              tickFormatter={(v) => v.toFixed(3)}
            />
            <Tooltip content={<SPCTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={1.5}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props || {};
                if (typeof cx !== "number" || typeof cy !== "number") return null;
                const isViolation = payload?.violation;
                if (isViolation) {
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={6} fill="var(--critical)" fillOpacity={0.2} stroke="none" />
                      <circle cx={cx} cy={cy} r={3.5} fill="var(--critical)" stroke="var(--bg-surface)" strokeWidth={1.5} />
                    </g>
                  );
                }
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={2}
                    fill="var(--accent)"
                    stroke="var(--bg-surface)"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 4, fill: "var(--accent-bright)", stroke: "var(--bg-surface)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Control limit values */}
      <div className="flex items-center gap-4 px-5 py-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[1px]" style={{ background: "var(--critical)", opacity: 0.6 }} />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>
            UCL: {chart.ucl.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[1px]" style={{ background: "var(--accent)", opacity: 0.5 }} />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>
            CL: {chart.cl.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[1px]" style={{ background: "var(--critical)", opacity: 0.6 }} />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>
            LCL: {chart.lcl.toFixed(4)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
            {chart.data.length} subgroups
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function SPCPage() {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "violations">("all");

  const [machineId, setMachineId] = useState("CMM-001");
  const [partNumber, setPartNumber] = useState("P-2847");
  const [characteristic, setCharacteristic] = useState("Bore Diameter");
  const [chartType, setChartType] = useState<UIControlChart["chart_type"]>("xbar_r");
  const [subgroupSize, setSubgroupSize] = useState(5);
  const [valuesText, setValuesText] = useState("10.01, 10.02, 10.00, 10.03, 10.01, 10.04, 10.02, 10.01, 10.00, 10.05");

  const [charts, setCharts] = useState<UIControlChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [aiPrediction, setAiPrediction] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<null | "interpret" | "predict">(null);

  const parseValues = (raw: string): number[] => {
    return raw
      .split(/[\s,]+/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n));
  };

  const buildChart = (
    response: SPCResponse,
    values: number[]
  ): UIControlChart => {
    const violations = response.nelson_violations || {};
    const allViolationIndices = new Set<number>();
    for (const indices of Object.values(violations)) {
      for (const idx of indices) allViolationIndices.add(idx);
    }

    const active_violations: UIControlChart["active_violations"] = [];
    for (const [rule, indices] of Object.entries(violations)) {
      if (indices.length > 0) {
        active_violations.push({
          rule,
          points: indices,
          severity: rule === "rule_1" ? "critical" : "warning",
        });
      }
    }

    const status: UIControlChart["status"] =
      active_violations.some((v) => v.severity === "critical")
        ? "critical"
        : active_violations.length > 0
          ? "warning"
          : "stable";

    const data: UIChartPoint[] = values.map((v, i) => ({
      index: i,
      value: v,
      violation: allViolationIndices.has(i) ? "nelson" : undefined,
    }));

    return {
      id: `spc_${machineId}_${Date.now()}`,
      machine_id: machineId,
      part_number: partNumber,
      characteristic,
      chart_type: (chartType as UIControlChart["chart_type"]) || "xbar_r",
      ucl: response.ucl,
      cl: response.cl,
      lcl: response.lcl,
      data,
      active_violations,
      status,
    };
  };

  const handleAnalyze = async () => {
    const values = parseValues(valuesText);
    if (values.length < 5) {
      setError("Please enter at least 5 numeric values.");
      return;
    }
    setError(null);
    setAiInterpretation(null);
    setAiPrediction(null);
    setLoading(true);
    try {
      const res = await analyzeSPC(values, chartType, {
        subgroupSize,
        partNumber,
        characteristicName: characteristic,
      });
      const chart = buildChart(res, values);
      setCharts([chart, ...charts].slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const latest = charts[0] || null;

  const handleInterpret = async () => {
    if (!latest) return;
    const violatedRules: Record<string, number[]> = {};
    for (const v of latest.active_violations) {
      violatedRules[v.rule] = v.points;
    }
    setAiLoading("interpret");
    setAiInterpretation(null);
    try {
      const resp = await interpretSPCViolations(
        latest.chart_type,
        violatedRules,
        latest.ucl,
        latest.cl,
        latest.lcl,
        latest.data.map((d) => d.value).slice(-30)
      );
      const r = resp as SPCInterpretResponse;
      const lines = [
        `Pattern: ${r.pattern_description || ""}`,
        `Significance: ${r.manufacturing_significance || ""}`,
        `Urgency: ${r.urgency || ""}`,
        `Likely causes: ${(r.likely_causes || []).join("; ")}`,
        `Recommended actions: ${(r.recommended_actions || []).join("; ")}`,
      ].filter(Boolean);
      setAiInterpretation(lines.join("\n"));
    } catch (e) {
      setAiInterpretation(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(null);
    }
  };

  const handlePredict = async () => {
    if (!latest) return;
    setAiLoading("predict");
    setAiPrediction(null);
    try {
      const resp = await predictSPCViolations(
        latest.part_number,
        latest.characteristic,
        latest.data.map((d) => d.value),
        latest.ucl,
        latest.cl,
        latest.lcl
      );
      const p = resp as PredictResponse;
      const lines = [
        `Trend: ${p.trend_summary || ""}`,
        `Risk: ${p.predicted_violation_risk || ""}`,
        `Time to action: ${p.time_to_action || ""}`,
        `Leading indicators: ${(p.leading_indicators || []).join("; ")}`,
        `Preventive actions: ${(p.preventive_actions || []).join("; ")}`,
      ].filter(Boolean);
      setAiPrediction(lines.join("\n"));
    } catch (e) {
      setAiPrediction(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(null);
    }
  };

  const filtered = filter === "violations" ? charts.filter((c) => c.active_violations.length > 0) : charts;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="h-full overflow-y-auto p-6 space-y-5"
      style={{ background: "var(--bg-root)" }}
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            SPC Control Monitor
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Real-time Statistical Process Control · Nelson Rule Detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status summary */}
          <div className="hidden md:flex items-center gap-3 mr-4">
            {["critical", "warning", "stable"].map((status) => {
              const count = charts.filter((c) => c.status === status).length;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: status === "critical" ? "var(--critical)" : status === "warning" ? "var(--warning)" : "var(--success)",
                    }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    {count} {status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Filter */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border-default)" }}
          >
            {(["all", "violations"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: filter === f ? "var(--accent-bg)" : "var(--bg-surface)",
                  color: filter === f ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {f === "all" ? "All Charts" : "Violations Only"}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
          >
            {loading ? <Activity size={14} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </motion.div>

      {/* Analyze controls */}
      <motion.div variants={item} className="surface-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Machine</div>
            <input
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Part</div>
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Characteristic</div>
            <input
              value={characteristic}
              onChange={(e) => setCharacteristic(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Chart</div>
            <div className="flex gap-2">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as UIControlChart["chart_type"])}
                className="w-full rounded-lg px-3 py-2 text-[12px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="xbar_r">Xbar-R</option>
                <option value="i_mr">I-MR</option>
                <option value="p">P</option>
              </select>
              <input
                type="number"
                min={2}
                max={10}
                value={subgroupSize}
                onChange={(e) => setSubgroupSize(Number(e.target.value))}
                className="w-24 rounded-lg px-3 py-2 text-[12px]"
                title="Subgroup size"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Values (comma / space / newline separated)
          </div>
          <textarea
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            rows={3}
            className="w-full rounded-lg p-3 text-[12px]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {loading ? "Analyzing..." : "Analyze SPC"}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInterpret}
              disabled={!latest || aiLoading !== null}
              className="px-3 py-2 rounded-lg text-[12px] font-medium disabled:opacity-50"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              {aiLoading === "interpret" ? "Interpreting..." : "AI Interpret"}
            </button>
            <button
              onClick={handlePredict}
              disabled={!latest || aiLoading !== null}
              className="px-3 py-2 rounded-lg text-[12px] font-medium disabled:opacity-50"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              {aiLoading === "predict" ? "Predicting..." : "AI Predict"}
            </button>
          </div>
        </div>
        {error && (
          <div className="text-[12px]" style={{ color: "var(--critical)" }}>
            {error}
          </div>
        )}
        {(aiInterpretation || aiPrediction) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {aiInterpretation && (
              <pre className="rounded-lg p-3 text-[11px] whitespace-pre-wrap" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                {aiInterpretation}
              </pre>
            )}
            {aiPrediction && (
              <pre className="rounded-lg p-3 text-[11px] whitespace-pre-wrap" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                {aiPrediction}
              </pre>
            )}
          </div>
        )}
      </motion.div>

      {/* Anomaly feed strip */}
      {charts.some((c) => c.active_violations.length > 0) && (
        <motion.div variants={item}>
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-xl overflow-x-auto"
            style={{ background: "var(--critical-bg)", border: "1px solid rgba(248,113,113,0.12)" }}
          >
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle size={14} style={{ color: "var(--critical)" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--critical)" }}>
                Active Violations
              </span>
            </div>
            <div className="h-4 w-px" style={{ background: "rgba(248,113,113,0.2)" }} />
            {charts
              .filter((c) => c.active_violations.length > 0)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {c.machine_id}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--critical)" }}>
                    {c.active_violations.map((v) => v.rule).join(", ")}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>•</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Chart grid */}
      <motion.div variants={container} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((chart) => (
          <ControlChartCard
            key={chart.id}
            chart={chart}
            expanded={expandedChart === chart.id}
            onExpand={() => setExpandedChart(expandedChart === chart.id ? null : chart.id)}
          />
        ))}
        {filtered.length === 0 && (
          <motion.div variants={item} className="surface-card p-8 text-center lg:col-span-2">
            <div style={{ color: "var(--text-secondary)" }}>
              Run an analysis to populate the SPC dashboard.
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
