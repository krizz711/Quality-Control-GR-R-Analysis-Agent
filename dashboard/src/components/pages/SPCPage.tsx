"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Plus, RotateCcw, Send } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getSPCHistory,
  showToast,
  submitSPCData,
  type SPCDataResponse,
  type SPCViolation,
} from "@/api/apiClient";
import { useRealtimeStream } from "@/api/realtime";

type ChartPoint = {
  index: number;
  value: number;
  violation?: SPCViolation;
};

const STORAGE_KEY = "arad-spc-active-process";

function formatNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value).toFixed(4) : "--";
}

function buildChartPoints(values: number[], violations: SPCViolation[]) {
  return values.map((value, index) => ({
    index,
    value,
    violation: violations.find((violation) => violation.index === index),
  }));
}

function SPCTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="elevated-card px-3.5 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
      <div className="stat-number text-sm" style={{ color: "var(--text-primary)" }}>
        {point.value.toFixed(4)}
      </div>
      <div className="mt-1" style={{ color: "var(--text-muted)" }}>
        Measurement {point.index + 1}
      </div>
      {point.violation ? (
        <div className="mt-2 max-w-56" style={{ color: "var(--critical-text)" }}>
          {point.violation.description}
        </div>
      ) : null}
    </div>
  );
}

type BaselineLimits = { ucl: number; lcl: number; target: number };

const BASELINE_KEY = "arad-spc-baseline";

export default function SPCPage() {
  const [processDraft, setProcessDraft] = useState("Torque Press Line 1");
  const [processName, setProcessName] = useState("");
  const [measurementDraft, setMeasurementDraft] = useState("");
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<SPCDataResponse | null>(null);
  const [baseline, setBaseline] = useState<BaselineLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const persistBaseline = (name: string, limits: BaselineLimits | null) => {
    setBaseline(limits);
    if (limits) {
      window.localStorage.setItem(BASELINE_KEY, JSON.stringify({ process: name, ...limits }));
    } else {
      window.localStorage.removeItem(BASELINE_KEY);
    }
  };

  // Monotonic sequence so a slow earlier response can never overwrite the
  // result of a newer submission (Gemini narratives make latencies uneven).
  const analysisSeq = useRef(0);

  const loadHistory = useCallback(async () => {
    if (!processName) {
      return;
    }

    const seq = ++analysisSeq.current;
    setHistoryLoading(true);
    try {
      const history = await getSPCHistory(processName);
      const values = [...history.points]
        .reverse()
        .map((point) => Number(point.value))
        .filter(Number.isFinite)
        .slice(-50);

      if (seq !== analysisSeq.current) return;
      setMeasurements(values);
      if (values.length >= 2) {
        // Stats-only recompute: persist nothing (new_values: []).
        const result = await submitSPCData({
          process_name: processName,
          measurements: values,
          new_values: [],
          ...(baseline ? { ucl: baseline.ucl, lcl: baseline.lcl, target: baseline.target } : {}),
        });
        if (seq !== analysisSeq.current) return;
        setAnalysis(result);
      } else {
        setAnalysis(null);
      }
    } catch {
      showToast("SPC history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, [processName, baseline]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProcessName(stored);
      setProcessDraft(stored);
      try {
        const rawBaseline = window.localStorage.getItem(BASELINE_KEY);
        if (rawBaseline) {
          const parsed = JSON.parse(rawBaseline) as BaselineLimits & { process?: string };
          if (parsed.process === stored && Number.isFinite(parsed.ucl) && Number.isFinite(parsed.lcl)) {
            setBaseline({ ucl: parsed.ucl, lcl: parsed.lcl, target: parsed.target });
          }
        }
      } catch {
        // Ignore corrupted baseline cache.
      }
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useRealtimeStream({
    enabled: Boolean(processName),
    onEvent: (event) => {
      const eventType = String(event.type || "");
      if (!processName) {
        return;
      }

      // poll.tick is intentionally ignored here: reloading history mid-entry
      // would replace the operator's in-progress measurement window.
      const eventProcess = String(event.process_name || event.characteristic_name || event.equipment_id || "");
      if (!eventProcess) {
        return;
      }

      if (["measurement.processed", "spc.analysis", "mes.event", "qms.event"].includes(eventType) && eventProcess === processName) {
        void loadHistory();
      }
    },
  });

  const chartPoints = useMemo(
    () => buildChartPoints(measurements, analysis?.violations ?? []),
    [measurements, analysis?.violations],
  );

  const sigma = analysis ? (analysis.ucl - analysis.lcl) / 6 : 0;
  const centerLine = analysis ? (analysis.ucl + analysis.lcl) / 2 : 0;
  const zoneOneUpper = centerLine + sigma;
  const zoneOneLower = centerLine - sigma;
  const zoneTwoUpper = centerLine + 2 * sigma;
  const zoneTwoLower = centerLine - 2 * sigma;
  const activeViolations = analysis?.violations ?? [];

  const registerProcess = () => {
    const name = processDraft.trim();
    if (!name) {
      showToast("Enter a process name.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, name);
    setProcessName(name);
    setMeasurements([]);
    setAnalysis(null);
    persistBaseline(name, null);
    showToast(`${name} added to SPC monitor.`);
  };

  const submitMeasurement = async () => {
    if (!processName) {
      showToast("Add a process before submitting measurements.");
      return;
    }

    const value = Number(measurementDraft);
    if (!Number.isFinite(value)) {
      showToast("Enter a valid numeric measurement.");
      return;
    }

    const nextMeasurements = [...measurements, value].slice(-50);
    setMeasurements(nextMeasurements);
    setMeasurementDraft("");

    if (nextMeasurements.length < 2) {
      showToast("Add one more point to calculate limits.");
      return;
    }

    setLoading(true);
    const seq = ++analysisSeq.current;
    try {
      const result = await submitSPCData({
        process_name: processName,
        measurements: nextMeasurements,
        new_values: [value],
        // Judge new points against frozen baseline limits (Phase II SPC);
        // without this, drifting data inflates its own control limits.
        ...(baseline ? { ucl: baseline.ucl, lcl: baseline.lcl, target: baseline.target } : {}),
      });
      if (seq !== analysisSeq.current) return;
      setAnalysis(result);
      if (!baseline && nextMeasurements.length >= 15) {
        persistBaseline(processName, { ucl: result.ucl, lcl: result.lcl, target: result.mean });
        showToast("Control limits frozen from baseline. New points are judged against them.");
      }
      if (result.violations.length) {
        showToast(`${result.violations.length} SPC violation${result.violations.length === 1 ? "" : "s"} detected.`);
      }
    } catch {
      showToast("SPC analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleSet = async () => {
    const sample = [
      5.01, 4.99, 5.02, 5.0, 5.03, 4.98, 5.01, 5.02, 4.99, 5.0, 5.01, 5.03, 4.98, 5.02, 5.0,
    ];
    setMeasurements(sample);
    if (!processName) {
      showToast("Add a process before loading sample data.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitSPCData({ process_name: processName, measurements: sample, new_values: sample });
      setAnalysis(result);
      persistBaseline(processName, { ucl: result.ucl, lcl: result.lcl, target: result.mean });
      showToast("Baseline established — control limits frozen for live monitoring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-6" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="surface-card edge-glow px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ borderColor: "rgba(34,211,238,0.22)", background: "var(--live-bg)", color: "var(--live)" }}
              >
                <Activity size={20} />
              </div>
              <div>
                <h1 className="page-title md:text-[26px]">SPC Control Monitor</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Live statistical process control — Nelson rules, control limits, and violation detection.
                </p>
              </div>
            </div>
            <div className="panel-inset px-4 py-3">
              <div className="section-label text-[10px]">Active Process</div>
              <div className="mt-1.5 flex items-center gap-2.5 text-sm font-semibold" style={{ color: "var(--success-text)" }}>
                <span className="live-dot" style={{ width: 7, height: 7 }} />
                {processName || "No process added"}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="surface-card p-5">
              <h2 className="section-label">Add Process</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={processDraft}
                  onChange={(event) => setProcessDraft(event.target.value)}
                  className="input-field"
                  placeholder="Torque Press Line 1"
                />
                <button
                  onClick={registerProcess}
                  className="btn btn-primary h-[38px] w-[38px] shrink-0 !px-0"
                  title="Add process"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="surface-card p-5">
              <h2 className="section-label">Submit Measurement</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={measurementDraft}
                  onChange={(event) => setMeasurementDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitMeasurement();
                  }}
                  type="number"
                  step="0.0001"
                  className="input-field stat-number"
                  placeholder="5.0120"
                />
                <button
                  onClick={() => void submitMeasurement()}
                  disabled={loading}
                  className="btn btn-secondary h-[38px] w-[38px] shrink-0 !px-0"
                  style={{ color: "var(--live)" }}
                  title="Submit measurement"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <button onClick={() => void loadSampleSet()} className="btn btn-ghost mt-3 h-8 gap-2 px-2.5 text-xs">
                <RotateCcw size={13} /> Load 15 baseline points
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Points" value={measurements.length} />
              <Metric label="Mean" value={formatNumber(analysis?.mean)} />
              <Metric label="UCL" value={formatNumber(analysis?.ucl)} tone="var(--critical-text)" />
              <Metric label="LCL" value={formatNumber(analysis?.lcl)} tone="var(--critical-text)" />
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="section-label">Control Chart</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {historyLoading ? "Loading persisted history…" : `${chartPoints.length} measurements in the active window`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {baseline && (
                  <span className="badge badge-info h-7 gap-1.5 px-3" title={`Frozen limits — UCL ${baseline.ucl.toFixed(4)} · LCL ${baseline.lcl.toFixed(4)}`}>
                    Baseline locked
                  </span>
                )}
                {activeViolations.length ? (
                  <span className="badge badge-critical h-7 gap-1.5 px-3">
                    <AlertTriangle size={12} /> {activeViolations.length} violation{activeViolations.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="badge badge-success h-7 gap-1.5 px-3">
                    <CheckCircle2 size={12} /> In control
                  </span>
                )}
              </div>
            </div>

            <div className="panel-inset mt-5 h-[430px] p-4">
              {chartPoints.length >= 2 && analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 15, right: 24, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="spcLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <ReferenceArea y1={zoneOneUpper} y2={zoneOneLower} fill="rgba(16,185,129,0.045)" />
                    <ReferenceArea y1={zoneTwoUpper} y2={zoneOneUpper} fill="rgba(245,158,11,0.04)" />
                    <ReferenceArea y1={zoneOneLower} y2={zoneTwoLower} fill="rgba(245,158,11,0.04)" />
                    <ReferenceLine y={analysis.ucl} stroke="var(--critical)" strokeDasharray="8 4" label={{ value: "UCL", position: "right", fill: "var(--critical-text)", fontSize: 10 }} />
                    <ReferenceLine y={centerLine} stroke="var(--live)" strokeDasharray="4 4" label={{ value: "CL", position: "right", fill: "var(--live)", fontSize: 10 }} />
                    <ReferenceLine y={analysis.lcl} stroke="var(--critical)" strokeDasharray="8 4" label={{ value: "LCL", position: "right", fill: "var(--critical-text)", fontSize: 10 }} />
                    <XAxis dataKey="index" tickFormatter={(value) => String(Number(value) + 1)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} width={62} tickFormatter={(value) => Number(value).toFixed(3)} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip content={<SPCTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="url(#spcLine)"
                      strokeWidth={2}
                      dot={(props) => {
                        if (typeof props.cx !== "number" || typeof props.cy !== "number") return null;
                        const point = props.payload as ChartPoint;
                        return (
                          <circle
                            key={props.index}
                            cx={props.cx}
                            cy={props.cy}
                            r={point.violation ? 5 : 3}
                            fill={point.violation ? "var(--critical)" : "var(--live)"}
                            stroke="var(--bg-root)"
                            strokeWidth={2}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border"
                      style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      <Activity size={18} />
                    </div>
                    <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Waiting for measurements
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                      Submit at least two values to render control limits.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {activeViolations.length ? (
              <div className="mt-4 space-y-2">
                {activeViolations.map((violation, index) => (
                  <div
                    key={`${violation.rule}-${violation.index}-${index}`}
                    className="rounded-xl border px-4 py-3 text-sm"
                    style={{
                      borderColor: "rgba(239,68,68,0.22)",
                      background: "var(--critical-bg)",
                      color: "var(--text-primary)",
                      boxShadow: "inset 2.5px 0 0 var(--critical)",
                    }}
                  >
                    <span className="font-semibold" style={{ color: "var(--critical-text)" }}>
                      {violation.rule}
                    </span>{" "}
                    at measurement {violation.index + 1}: {violation.description}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="surface-card p-4">
      <div className="section-label text-[10px]">{label}</div>
      <div className="stat-number mt-2 text-xl" style={{ color: tone || "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
