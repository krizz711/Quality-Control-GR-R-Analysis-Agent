"use client";

/* GR&R Studies — prototype-exact wizard + streamed results, wired to /api/v1/grr/analyze. */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  Check,
  CircleX,
  Download,
  FileCheck,
  Plus,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Upload,
  Zap,
} from "lucide-react";
import {
  getGRRHistory,
  showToast,
  submitGRRAnalysis,
  type GRRAnalysisResponse,
  type GRRInputMeasurement,
} from "@/api/apiClient";
import { useApi } from "@/api/apiClient";
import { Card, LoadingDots, MetricPill, SegmentedBar, StepDots, Stream } from "@/components/ui/kit";
import { toast } from "@/components/ui/fx";

type MeasurementRow = GRRInputMeasurement;

type GRRFormValues = {
  operators: number;
  parts: number;
  trials: number;
  partTolerance?: number;
  processName: string;
  measurements: MeasurementRow[];
};

const defaultValues: GRRFormValues = {
  operators: 3,
  parts: 10,
  trials: 2,
  processName: "",
  partTolerance: undefined,
  measurements: [],
};

function parseCsv(text: string) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row");

  const headers = rows[0].split(",").map((v) => v.trim().toLowerCase());
  const required = ["operator", "part", "trial", "value"];
  for (const header of required) {
    if (!headers.includes(header)) throw new Error(`CSV must include ${required.join(", ")} columns`);
  }

  return rows.slice(1).map((row) => {
    const cells = row.split(",").map((v) => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = cells[i] ?? "";
    });
    return { operator: record.operator, part: Number(record.part), trial: Number(record.trial), value: Number(record.value) };
  });
}

function createMeasurementRows(operators: number, parts: number, trials: number) {
  const rows: MeasurementRow[] = [];
  for (let o = 1; o <= operators; o += 1)
    for (let p = 1; p <= parts; p += 1)
      for (let t = 1; t <= trials; t += 1)
        rows.push({ operator: `Operator ${o}`, part: p, trial: t, value: "" as unknown as number });
  return rows;
}

function shortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

function verdictOf(pct: number) {
  if (pct < 10) return { key: "pass", label: "✓ Acceptable", sub: "Measurement system accepted for production use", color: "var(--success-text)", glow: "rgba(16,185,129,.5)", bg: "linear-gradient(135deg, rgba(16,185,129,.16), rgba(16,185,129,.04))", border: "rgba(16,185,129,.3)", icon: Check, iconC: "var(--success)" };
  if (pct <= 30) return { key: "conditional", label: "⚠ Conditional", sub: "Requires manager review before acceptance", color: "var(--warning-text)", glow: "rgba(245,158,11,.5)", bg: "linear-gradient(135deg, rgba(245,158,11,.16), rgba(245,158,11,.04))", border: "rgba(245,158,11,.3)", icon: TriangleAlert, iconC: "var(--warning)" };
  return { key: "fail", label: "✗ Not Acceptable", sub: "Measurement system must be improved and re-qualified", color: "var(--critical-text)", glow: "rgba(239,68,68,.5)", bg: "linear-gradient(135deg, rgba(239,68,68,.16), rgba(239,68,68,.04))", border: "rgba(239,68,68,.3)", icon: CircleX, iconC: "var(--critical)" };
}

/* ── CSV dropzone with drag + success states (real file handling) ── */
function DropZone({ fileName, onFile, onReset }: { fileName: string | null; onFile: (f: File) => void; onReset: () => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (fileName)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: "1px solid rgba(16,185,129,.4)",
          background: "rgba(16,185,129,.07)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          animation: "arad-result-in .25s var(--ease-out)",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(16,185,129,.15)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <FileCheck size={18} style={{ color: "var(--success)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--success)" }}>Loaded · values imported into the table</div>
        </div>
        <button onClick={onReset} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }} aria-label="Reset CSV">
          <RotateCcw size={15} />
        </button>
      </div>
    );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      style={{
        border: `1.5px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`,
        borderRadius: "var(--radius-md)",
        padding: 22,
        textAlign: "center",
        cursor: "pointer",
        background: drag ? "rgba(59,130,246,.06)" : "var(--bg-primary)",
        transition: "all .15s var(--ease-out)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <Upload size={20} style={{ color: drag ? "var(--accent)" : "var(--text-muted)", margin: "0 auto 8px", transform: drag ? "scale(1.15)" : "scale(1)", transition: "transform .15s var(--ease-out)" }} />
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: drag ? "var(--accent)" : "var(--text-secondary)" }}>
        {drag ? "Drop to upload" : "Drop CSV or click to upload"}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
        columns: operator, part, trial, value
      </div>
    </div>
  );
}

/* ── Run Analysis button: idle → loading (sweep) → complete ── */
function RunButton({ phase, onRun }: { phase: "idle" | "loading" | "complete"; onRun: () => void }) {
  const loading = phase === "loading";
  const complete = phase === "complete";
  return (
    <button
      onClick={phase === "idle" ? onRun : undefined}
      disabled={loading || complete}
      style={{
        height: 42,
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: phase === "idle" ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        background: complete ? "linear-gradient(180deg,#10b981,#059669)" : "linear-gradient(180deg,#3b82f6,#2563eb)",
        color: "#fff",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "background .3s var(--ease-out)",
        boxShadow: "0 1px 2px rgba(0,0,10,.4)",
        width: "100%",
      }}
    >
      {loading && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)",
            animation: "arad-runbar 1.6s linear infinite",
          }}
        />
      )}
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
        {complete ? (
          <>
            <Check size={17} /> Complete
          </>
        ) : loading ? (
          <>
            <LoadingDots /> Analyzing…
          </>
        ) : (
          <>
            <Zap size={16} /> Run Analysis
          </>
        )}
      </span>
    </button>
  );
}

function EmptyResults({ analyzing, count }: { analyzing?: boolean; count?: number }) {
  if (analyzing)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
        <div className="skeleton" style={{ height: 60, borderRadius: "var(--radius-lg)" }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ flex: 1, height: 64 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 28 }} />
        <div className="skeleton" style={{ height: 150, borderRadius: "var(--radius-lg)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--accent-ai)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
          <LoadingDots color="var(--accent-ai)" />
          Running Xbar-R analysis on {count ?? 0} measurements…
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 40, minHeight: 360, textAlign: "center" }}>
      <svg width="120" height="104" viewBox="0 0 120 104" fill="none" style={{ opacity: 0.5 }} aria-hidden="true">
        <defs>
          <linearGradient id="hexEmpty" x1="0" y1="0" x2="120" y2="104">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        {[[30, 26], [60, 9], [90, 26], [30, 60], [60, 43], [90, 60], [60, 77]].map(([cx, cy], i) => (
          <path key={i} d={`M${cx} ${cy - 14}l12 7v14l-12 7-12-7V${cy - 7}z`} stroke="url(#hexEmpty)" strokeWidth="1.4" fill="url(#hexEmpty)" fillOpacity={i === 3 ? 0.18 : 0.04} />
        ))}
      </svg>
      <div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>No results yet</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 6, maxWidth: 320 }}>
          Complete the study setup and run the analysis to see the acceptance verdict, variance decomposition, and AI narrative here.
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="section-label" style={{ fontSize: 11 }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--critical-text)" }}>{error}</span> : null}
    </label>
  );
}

export default function GRRPage() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [method, setMethod] = useState("Xbar-R");
  const [csvName, setCsvName] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "complete">("idle");
  const [result, setResult] = useState<GRRAnalysisResponse | null>(null);
  const [rkey, setRkey] = useState(0);

  const history = useApi(getGRRHistory, [rkey]);

  const {
    register,
    control,
    trigger,
    getValues,
    reset: resetForm,
    formState: { errors },
  } = useForm<GRRFormValues>({ defaultValues, mode: "onBlur" });

  const { fields, replace } = useFieldArray({ control, name: "measurements" });
  const measurements = useWatch({ control, name: "measurements" });
  const operators = useWatch({ control, name: "operators" });
  const parts = useWatch({ control, name: "parts" });
  const trials = useWatch({ control, name: "trials" });
  const processName = useWatch({ control, name: "processName" });
  const partTolerance = useWatch({ control, name: "partTolerance" });

  const enteredCount = useMemo(() => (measurements || []).filter((r) => Number.isFinite(r.value)).length, [measurements]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const toData = async () => {
    const valid = await trigger(["operators", "parts", "trials", "processName", "partTolerance"]);
    if (!valid) return;
    const v = getValues();
    if (!fields.length || fields.length !== v.operators * v.parts * v.trials) {
      replace(createMeasurementRows(v.operators, v.parts, v.trials));
    }
    go(2);
  };

  const toRun = async () => {
    const valid = await trigger("measurements");
    if (!valid) {
      showToast("Fill every measurement cell (or import a CSV) before continuing.", "warning");
      return;
    }
    go(3);
  };

  const importCsv = async (file: File) => {
    try {
      const imported = parseCsv(await file.text());
      if (!fields.length) throw new Error("Set up the study first — the table is generated from Setup");
      const next = fields.map((f) => {
        const match = imported.find(
          (row) => (row.operator === f.operator || `Operator ${row.operator}` === f.operator) && row.part === f.part && row.trial === f.trial
        );
        return { operator: f.operator, part: f.part, trial: f.trial, value: match?.value ?? ("" as unknown as number) };
      });
      replace(next);
      setCsvName(file.name);
      toast({ type: "success", title: "CSV imported", msg: `${imported.length} rows parsed into the measurement table` });
    } catch (error) {
      toast({ type: "error", title: "CSV import failed", msg: error instanceof Error ? error.message : undefined });
    }
  };

  const run = async () => {
    const v = getValues();
    if (!v.measurements.length) return;

    setPhase("loading");
    setResult(null);
    try {
      const res = await submitGRRAnalysis({
        measurements: v.measurements.map((r) => ({ operator: r.operator, part: r.part, trial: r.trial, value: r.value })),
        part_tolerance: v.partTolerance,
      });
      setResult(res);
      setPhase("complete");
      setRkey((k) => k + 1);
      const verdict = verdictOf(res.grr_percent);
      toast({
        type: verdict.key === "pass" ? "success" : verdict.key === "conditional" ? "warning" : "error",
        title: `Analysis complete — ${verdict.label.slice(2)}`,
        msg: `%GR&R ${res.grr_percent.toFixed(1)}% · saved to history`,
      });
    } catch (error) {
      setPhase("idle");
      toast({ type: "error", title: "Analysis failed", msg: error instanceof Error ? error.message : undefined });
    }
  };

  const newStudy = () => {
    resetForm(defaultValues);
    setCsvName(null);
    setPhase("idle");
    setResult(null);
    setStep(1);
    setDir(-1);
  };

  const exportPdf = () => {
    if (!result) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!popup) {
      showToast("Popup blocked. Allow popups to export the report.", "warning");
      return;
    }
    const verdict = verdictOf(result.grr_percent);
    const title = `${processName || "GR&R"} Report`;
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}h1{margin:0 0 6px;font-size:26px}
      .muted{color:#6b7280;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:28px}
      .card{border:1px solid #d8d8d8;border-radius:6px;padding:16px}.label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px}
      .value{font-size:22px;font-weight:700}.full{grid-column:1/-1}pre{white-space:pre-wrap;word-break:break-word;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;margin:0}
    </style></head><body><h1>${title}</h1><div class="muted">Generated ${new Date().toLocaleString()} · Arad Quality Intelligence</div>
    <div class="grid"><div class="card"><div class="label">%GR&R</div><div class="value">${result.grr_percent.toFixed(1)}%</div></div>
    <div class="card"><div class="label">Verdict</div><div class="value">${verdict.label}</div></div>
    <div class="card"><div class="label">Repeatability (EV)</div><div class="value">${result.repeatability.toFixed(4)}</div></div>
    <div class="card"><div class="label">Reproducibility (AV)</div><div class="value">${result.reproducibility.toFixed(4)}</div></div>
    <div class="card full"><div class="label">AI Analysis</div><pre>${result.ai_analysis}</pre></div></div></body></html>`);
    popup.document.close();
    popup.focus();
    popup.onload = () => {
      popup.print();
      popup.onafterprint = () => popup.close();
    };
    toast({ type: "success", title: "Report exported", msg: `GR&R_${(processName || "study").replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.pdf` });
  };

  const verdict = result ? verdictOf(result.grr_percent) : null;
  const ev = result?.repeatability ?? 0;
  const av = result?.reproducibility ?? 0;
  const pv = Math.max(0, 100 - ev - av);

  return (
    <div className="arad-page min-h-full overflow-y-auto" style={{ background: "var(--bg-root)" }}>
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col px-6 py-6">
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 className="page-title">GR&R Studies</h1>
            <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Gauge repeatability &amp; reproducibility — measurement system analysis
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={newStudy} className="btn btn-primary">
            <Plus size={15} /> New Study
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.62fr_1fr]" style={{ alignItems: "start" }}>
          {/* Wizard */}
          <Card padding={20}>
            <div style={{ marginBottom: 18 }}>
              <StepDots step={step} />
            </div>
            <div key={step} style={{ animation: `${dir > 0 ? "arad-step-next" : "arad-step-prev"} .25s var(--ease-out)` }}>
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Process / Characteristic" error={errors.processName?.message}>
                    <input
                      className="input-field"
                      placeholder="Bore Diameter"
                      {...register("processName", { required: "Process name is required", minLength: { value: 2, message: "Too short" } })}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <Field label="Operators" error={errors.operators?.message}>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        className="input-field"
                        {...register("operators", { valueAsNumber: true, required: "Required", min: { value: 2, message: "Min 2" }, max: { value: 10, message: "Max 10" } })}
                      />
                    </Field>
                    <Field label="Parts" error={errors.parts?.message}>
                      <input
                        type="number"
                        min={5}
                        max={25}
                        className="input-field"
                        {...register("parts", { valueAsNumber: true, required: "Required", min: { value: 5, message: "Min 5" }, max: { value: 25, message: "Max 25" } })}
                      />
                    </Field>
                    <Field label="Trials" error={errors.trials?.message}>
                      <input
                        type="number"
                        min={2}
                        max={3}
                        className="input-field"
                        {...register("trials", { valueAsNumber: true, required: "Required", min: { value: 2, message: "Min 2" }, max: { value: 3, message: "Max 3" } })}
                      />
                    </Field>
                  </div>
                  <div>
                    <div className="section-label" style={{ fontSize: 11, marginBottom: 6 }}>Method</div>
                    <div style={{ display: "flex", background: "var(--bg-primary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: 3 }}>
                      {["Xbar-R", "ANOVA"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          style={{
                            flex: 1,
                            height: 30,
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontFamily: "var(--font-sans)",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "all 150ms ease-out",
                            background: method === m ? "var(--bg-elevated)" : "transparent",
                            color: method === m ? "var(--text-primary)" : "var(--text-muted)",
                            boxShadow: method === m ? "var(--shadow-sm)" : "none",
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => void toData()} className="btn btn-primary" type="button">
                    Next: Data →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Tolerance (optional)" error={errors.partTolerance?.message}>
                    <input
                      type="number"
                      step="0.0001"
                      className="input-field"
                      style={{ fontFamily: "var(--font-mono)" }}
                      placeholder="0.025"
                      {...register("partTolerance", {
                        setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
                        min: { value: 0, message: "Must be positive" },
                      })}
                    />
                  </Field>

                  <DropZone fileName={csvName} onFile={(f) => void importCsv(f)} onReset={() => setCsvName(null)} />

                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-bg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--accent)",
                    }}
                  >
                    {operators} × {parts} × {trials} = {fields.length} measurements · {enteredCount} entered
                  </div>

                  {/* Manual entry table */}
                  <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    <div style={{ maxHeight: 260, overflowY: "auto" }}>
                      <table className="data-table">
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <th>Operator</th>
                            <th>Part</th>
                            <th>Trial</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((field, index) => (
                            <tr key={field.id}>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{field.operator}</td>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{field.part}</td>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{field.trial}</td>
                              <td style={{ padding: "6px 16px" }}>
                                <input
                                  type="number"
                                  step="0.0001"
                                  {...register(`measurements.${index}.value`, {
                                    valueAsNumber: true,
                                    required: "Required",
                                    validate: (v) => !Number.isNaN(v) || "Required",
                                  })}
                                  className={`input-field !py-1.5 ${errors.measurements?.[index]?.value ? "input-error" : ""}`}
                                  style={{ fontFamily: "var(--font-mono)" }}
                                  placeholder="0.000"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => go(1)} className="btn btn-ghost" type="button">
                      ← Back
                    </button>
                    <button onClick={() => void toRun()} className="btn btn-primary" style={{ flex: 1 }} type="button">
                      Next: Run →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: 14,
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {[
                      ["Process", processName || "—"],
                      ["Method", method],
                      ["Operators", operators],
                      ["Parts", parts],
                      ["Trials", trials],
                      ["Tolerance", partTolerance ?? "—"],
                      ["Measurements", fields.length],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-sans)", fontSize: 12 }}>
                        <span style={{ color: "var(--text-muted)" }}>{k}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <RunButton phase={phase} onRun={() => void run()} />
                  {phase !== "loading" && (
                    <button onClick={() => go(2)} className="btn btn-ghost" type="button">
                      ← Back
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          <Card padding={result || phase === "loading" ? 20 : 0} style={{ minHeight: 380, display: "flex", flexDirection: "column" }}>
            {phase === "loading" ? (
              <EmptyResults analyzing count={fields.length} />
            ) : result && verdict ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "arad-result-in .4s var(--ease-out)" }}>
                {/* Verdict banner */}
                <div
                  style={
                    {
                      "--glow-c": verdict.glow,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      borderRadius: "var(--radius-lg)",
                      background: verdict.bg,
                      border: `1px solid ${verdict.border}`,
                      animation: "arad-glow-once 1.1s ease-out",
                    } as React.CSSProperties
                  }
                >
                  <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <verdict.icon size={22} style={{ color: verdict.iconC }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700, color: verdict.color }}>{verdict.label}</div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>{verdict.sub}</div>
                  </div>
                </div>

                {/* Metric pills */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <MetricPill
                    value={`${result.grr_percent.toFixed(1)}%`}
                    label="%GR&R"
                    tone={verdict.key === "pass" ? "success" : verdict.key === "conditional" ? "warning" : "critical"}
                    delay={0}
                  />
                  <MetricPill value={`${ev.toFixed(1)}%`} label="EV · Repeat." delay={50} />
                  <MetricPill value={`${av.toFixed(1)}%`} label="AV · Reprod." delay={100} />
                  <MetricPill
                    value={result.number_of_distinct_categories}
                    label="NDC"
                    tone={result.number_of_distinct_categories >= 5 ? "success" : "warning"}
                    delay={150}
                  />
                </div>

                {/* Variance decomposition */}
                <div>
                  <div className="section-label" style={{ marginBottom: 10 }}>Variance Decomposition</div>
                  <SegmentedBar
                    key={rkey}
                    animate
                    segments={[
                      { label: "EV (Repeatability)", value: ev },
                      { label: "AV (Reproducibility)", value: av },
                      { label: "PV (Part)", value: pv },
                    ]}
                  />
                </div>

                {/* AI analysis */}
                <div style={{ borderLeft: "3px solid var(--accent-ai)", background: "var(--bg-primary)", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0", padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <Sparkles size={16} style={{ color: "var(--accent-ai)" }} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>AI Analysis</span>
                    <div style={{ flex: 1 }} />
                    <span className={verdict.key === "fail" ? "badge badge-critical" : "badge badge-warning"}>
                      Risk: {verdict.key === "fail" ? "High" : verdict.key === "conditional" ? "Medium" : "Low"}
                    </span>
                  </div>
                  <Stream
                    restartKey={rkey}
                    items={result.ai_analysis
                      .split(/\n\n+/)
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i} style={{ margin: "0 0 12px", fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
                          {para}
                        </p>
                      ))}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={exportPdf} className="btn btn-primary">
                    <Download size={15} /> Download PDF Report
                  </button>
                  <button onClick={newStudy} className="btn btn-secondary">
                    <Plus size={14} /> New Study
                  </button>
                  <span style={{ alignSelf: "center", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
                    Saved to history automatically
                  </span>
                </div>
              </div>
            ) : (
              <EmptyResults />
            )}
          </Card>
        </div>

        {/* Study history */}
        <Card padding={0} style={{ marginTop: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-default)" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Study History</h2>
          </div>
          {history.data && history.data.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>%GR&R</th>
                    <th>Operators</th>
                    <th>Parts</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.slice(0, 8).map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{shortDate(r.timestamp)}</td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: r.grr_percent == null ? "var(--text-secondary)" : r.grr_percent > 30 ? "var(--critical)" : r.grr_percent > 10 ? "var(--warning)" : "var(--success)",
                          }}
                        >
                          {r.grr_percent != null ? `${r.grr_percent.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{r.operator_count}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{r.part_count}</td>
                      <td>
                        <span className={r.verdict === "pass" ? "badge badge-success" : r.verdict === "acceptable" ? "badge badge-warning" : "badge badge-critical"}>
                          {r.verdict === "pass" ? "Pass" : r.verdict === "acceptable" ? "Conditional" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 28, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
              {history.loading ? "Loading history..." : "Submit your first study to see results here."}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
