"use client";

import { useEffect, useMemo, useState } from "react";
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

type ChartPoint = {
  index: number;
  value: number;
  violation?: SPCViolation;
};

const STORAGE_KEY = "arad-spc-active-process";
const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20";

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
    <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-xl">
      <div className="font-mono text-sm font-semibold">{point.value.toFixed(4)}</div>
      <div className="mt-1 text-slate-500">Measurement {point.index + 1}</div>
      {point.violation ? (
        <div className="mt-2 max-w-56 text-rose-300">{point.violation.description}</div>
      ) : null}
    </div>
  );
}

export default function SPCPage() {
  const [processDraft, setProcessDraft] = useState("Torque Press Line 1");
  const [processName, setProcessName] = useState("");
  const [measurementDraft, setMeasurementDraft] = useState("");
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<SPCDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProcessName(stored);
      setProcessDraft(stored);
    }
  }, []);

  useEffect(() => {
    if (!processName) return;

    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const history = await getSPCHistory(processName);
        if (!active) return;

        const values = [...history.points]
          .reverse()
          .map((point) => Number(point.value))
          .filter(Number.isFinite)
          .slice(-50);

        setMeasurements(values);
        if (values.length >= 2) {
          const result = await submitSPCData({ process_name: processName, measurements: values });
          if (active) setAnalysis(result);
        } else if (active) {
          setAnalysis(null);
        }
      } catch (error) {
        if (active) showToast("SPC history could not be loaded.");
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      active = false;
    };
  }, [processName]);

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
    try {
      const result = await submitSPCData({
        process_name: processName,
        measurements: nextMeasurements,
      });
      setAnalysis(result);
      if (result.violations.length) {
        showToast(`${result.violations.length} SPC violation${result.violations.length === 1 ? "" : "s"} detected.`);
      }
    } catch (error) {
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
      setAnalysis(await submitSPCData({ process_name: processName, measurements: sample }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/95 px-6 py-5 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">SPC Control Monitor</h1>
                <p className="mt-1 text-sm text-slate-400">Manual process monitoring with live control limits and violation detection.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Process</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]" />
                {processName || "No process added"}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Add Process</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={processDraft}
                  onChange={(event) => setProcessDraft(event.target.value)}
                  className={inputClass}
                  placeholder="Torque Press Line 1"
                />
                <button
                  onClick={registerProcess}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 transition hover:bg-emerald-400"
                  title="Add process"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Submit Measurement</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={measurementDraft}
                  onChange={(event) => setMeasurementDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitMeasurement();
                  }}
                  type="number"
                  step="0.0001"
                  className={inputClass}
                  placeholder="5.012"
                />
                <button
                  onClick={() => void submitMeasurement()}
                  disabled={loading}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Submit measurement"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
              <button
                onClick={() => void loadSampleSet()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
              >
                <RotateCcw size={14} /> Load 15 baseline points
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Points" value={measurements.length} />
              <Metric label="Mean" value={formatNumber(analysis?.mean)} />
              <Metric label="UCL" value={formatNumber(analysis?.ucl)} />
              <Metric label="LCL" value={formatNumber(analysis?.lcl)} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Control Chart</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {historyLoading ? "Loading persisted history..." : `${chartPoints.length} measurements in the active window`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeViolations.length ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300">
                    <AlertTriangle size={14} /> {activeViolations.length} violation{activeViolations.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 size={14} /> In control
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 h-[430px] rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              {chartPoints.length >= 2 && analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 15, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                    <ReferenceArea y1={zoneOneUpper} y2={zoneOneLower} fill="rgba(34,197,94,0.04)" />
                    <ReferenceArea y1={zoneTwoUpper} y2={zoneOneUpper} fill="rgba(234,179,8,0.04)" />
                    <ReferenceArea y1={zoneOneLower} y2={zoneTwoLower} fill="rgba(234,179,8,0.04)" />
                    <ReferenceLine y={analysis.ucl} stroke="#f43f5e" strokeDasharray="8 4" label={{ value: "UCL", position: "right", fill: "#fb7185", fontSize: 11 }} />
                    <ReferenceLine y={centerLine} stroke="#22d3ee" strokeDasharray="4 4" label={{ value: "CL", position: "right", fill: "#67e8f9", fontSize: 11 }} />
                    <ReferenceLine y={analysis.lcl} stroke="#f43f5e" strokeDasharray="8 4" label={{ value: "LCL", position: "right", fill: "#fb7185", fontSize: 11 }} />
                    <XAxis dataKey="index" tickFormatter={(value) => String(Number(value) + 1)} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={62} tickFormatter={(value) => Number(value).toFixed(3)} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip content={<SPCTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22d3ee"
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
                            fill={point.violation ? "#fb7185" : "#22d3ee"}
                            stroke="#020617"
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
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-400">
                      <Activity size={18} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-200">Waiting for measurements</p>
                    <p className="mt-1 text-sm text-slate-500">Submit at least two values to render control limits.</p>
                  </div>
                </div>
              )}
            </div>

            {activeViolations.length ? (
              <div className="mt-4 space-y-2">
                {activeViolations.map((violation, index) => (
                  <div key={`${violation.rule}-${violation.index}-${index}`} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    <span className="font-semibold">{violation.rule}</span> at measurement {violation.index + 1}: {violation.description}
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}
