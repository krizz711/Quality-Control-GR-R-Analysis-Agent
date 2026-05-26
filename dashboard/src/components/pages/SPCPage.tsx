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
import { spcCharts, type SPCChart } from "@/lib/mock-data";

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

function ControlChartCard({ chart, expanded, onExpand }: { chart: SPCChart; expanded: boolean; onExpand: () => void }) {
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
              dot={(props) => {
                if (props.cx == null || props.cy == null) return null;
                const isViolation = (props.payload as { violation?: string } | undefined)?.violation;
                if (isViolation) {
                  return (
                    <g key={props.index}>
                      <circle cx={props.cx} cy={props.cy} r={6} fill="var(--critical)" fillOpacity={0.2} stroke="none" />
                      <circle cx={props.cx} cy={props.cy} r={3.5} fill="var(--critical)" stroke="var(--bg-surface)" strokeWidth={1.5} />
                    </g>
                  );
                }
                return (
                  <circle
                    key={props.index}
                    cx={props.cx}
                    cy={props.cy}
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

  const filtered = filter === "violations" ? spcCharts.filter((c) => c.active_violations.length > 0) : spcCharts;

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
              const count = spcCharts.filter((c) => c.status === status).length;
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
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* Anomaly feed strip */}
      {spcCharts.some((c) => c.active_violations.length > 0) && (
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
            {spcCharts
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
      </motion.div>
    </motion.div>
  );
}
