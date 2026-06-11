"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Plus, RotateCcw, Send } from "lucide-react";
import {
  getSPCHistory,
  showToast,
  submitSPCData,
  type SPCDataResponse,
  type SPCViolation,
} from "@/api/apiClient";
import { useRealtimeStream } from "@/api/realtime";
import { SPCChart, type SPCChartPoint } from "@/components/ui/kit";

const STORAGE_KEY = "arad-spc-active-process";

function formatNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value).toFixed(4) : "--";
}

function buildChartPoints(values: number[], violations: SPCViolation[]): SPCChartPoint[] {
  return values.map((value, index) => ({
    v: value,
    violation: violations.some((violation) => violation.index === index),
  }));
}

export default function SPCPage() {
  const [processDraft, setProcessDraft] = useState("Torque Press Line 1");
  const [processName, setProcessName] = useState("");
  const [measurementDraft, setMeasurementDraft] = useState("");
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<SPCDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [drawKey, setDrawKey] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!processName) {
      return;
    }

    setHistoryLoading(true);
    try {
      const history = await getSPCHistory(processName);
      const values = [...history.points]
        .reverse()
        .map((point) => Number(point.value))
        .filter(Number.isFinite)
        .slice(-50);

      setMeasurements(values);
      if (values.length >= 2) {
        setAnalysis(await submitSPCData({ process_name: processName, measurements: values }));
        setDrawKey((k) => k + 1);
      } else {
        setAnalysis(null);
      }
    } catch {
      showToast("SPC history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, [processName]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProcessName(stored);
      setProcessDraft(stored);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useRealtimeStream({
    enabled: Boolean(processName),
    onEvent: (event) => {
      const eventType = String(event.type || "");
      const eventProcess = String(event.process_name || event.characteristic_name || event.equipment_id || "");
      if (!processName || !eventProcess) {
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

  const centerLine = analysis ? (analysis.ucl + analysis.lcl) / 2 : 0;
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
      setDrawKey((k) => k + 1);
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
    if (!processName) {
      showToast("Add a process before loading sample data.");
      return;
    }

    setMeasurements(sample);
    setLoading(true);
    try {
      setAnalysis(await submitSPCData({ process_name: processName, measurements: sample }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-6" style={{ background: "var(--bg-root)" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">SPC Control Monitor</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Statistical process control with live limits and Nelson-rule violation detection.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className="status-dot"
              style={{ background: processName ? "var(--success)" : "var(--text-ghost)" }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{processName || "No process registered"}</span>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="panel p-5">
              <h2 className="section-label" style={{ color: "var(--text-secondary)" }}>Register Process</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={processDraft}
                  onChange={(event) => setProcessDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") registerProcess();
                  }}
                  className="input-field"
                  placeholder="Torque Press Line 1"
                />
                <button
                  onClick={registerProcess}
                  className="btn btn-primary h-[38px] w-[38px] shrink-0 !p-0"
                  title="Register process"
                  aria-label="Register process"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="section-label" style={{ color: "var(--text-secondary)" }}>Submit Measurement</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={measurementDraft}
                  onChange={(event) => setMeasurementDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitMeasurement();
                  }}
                  type="number"
                  step="0.0001"
                  className="input-field"
                  placeholder="5.012"
                />
                <button
                  onClick={() => void submitMeasurement()}
                  disabled={loading}
                  className="btn btn-secondary h-[38px] w-[38px] shrink-0 !p-0"
                  title="Submit measurement"
                  aria-label="Submit measurement"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <button onClick={() => void loadSampleSet()} className="btn btn-ghost mt-3 text-xs">
                <RotateCcw size={13} /> Load 15 baseline points
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Points" value={measurements.length} />
              <Metric label="Mean" value={formatNumber(analysis?.mean)} />
              <Metric label="UCL" value={formatNumber(analysis?.ucl)} />
              <Metric label="LCL" value={formatNumber(analysis?.lcl)} />
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="section-label" style={{ color: "var(--text-secondary)" }}>Control Chart</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {historyLoading ? "Loading persisted history..." : `${chartPoints.length} measurements in the active window`}
                </p>
              </div>
              {activeViolations.length ? (
                <span className="badge badge-critical">
                  <AlertTriangle size={11} /> {activeViolations.length} violation{activeViolations.length === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="badge badge-success">
                  <CheckCircle2 size={11} /> In control
                </span>
              )}
            </div>

            <div className="panel-inset mt-4 min-h-[330px] p-4">
              {chartPoints.length >= 2 && analysis ? (
                <SPCChart
                  data={chartPoints}
                  ucl={analysis.ucl}
                  cl={centerLine}
                  lcl={analysis.lcl}
                  height={300}
                  drawKey={drawKey}
                />
              ) : (
                <div className="flex items-center justify-center py-20 text-center">
                  <div>
                    <div
                      className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      <Activity size={18} />
                    </div>
                    <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Waiting for measurements</p>
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
                    className="rounded-lg border px-4 py-3 text-sm"
                    style={{ background: "var(--critical-bg)", borderColor: "rgba(217,122,122,0.22)", color: "var(--text-secondary)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--critical)" }}>{violation.rule}</span>
                    {" "}at measurement {violation.index + 1}: {violation.description}
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
    <div className="panel p-4">
      <div className="section-label">{label}</div>
      <div className="stat-number mt-1.5 text-lg" style={{ color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
