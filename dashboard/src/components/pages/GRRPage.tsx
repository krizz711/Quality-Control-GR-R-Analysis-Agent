"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Download,
  FileUp,
  Gauge,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Table2,
  Upload,
  Wand2,
} from "lucide-react";
import {
  showToast,
  submitGRRAnalysis,
  type GRRAnalysisResponse,
  type GRRInputMeasurement,
} from "@/api/apiClient";
import { formatPercent, grrVerdict } from "@/lib/utils";

type Step = 1 | 2 | 3;

type MeasurementRow = GRRInputMeasurement;

type GRRFormValues = {
  operators: number;
  parts: number;
  trials: number;
  partTolerance?: number;
  processName: string;
  measurements: MeasurementRow[];
};

type AnalysisState = {
  result: GRRAnalysisResponse | null;
  loading: boolean;
  error: string | null;
};

const stepLabels = ["Setup", "Data Entry", "Analysis"] as const;

const defaultValues: GRRFormValues = {
  operators: 3,
  parts: 10,
  trials: 2,
  processName: "",
  partTolerance: undefined,
  measurements: [],
};

const inputClass =
  "w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20";

function formatTimestamp(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getGaugeColor(pct: number) {
  if (pct < 10) return "#22c55e";
  if (pct <= 30) return "#eab308";
  return "#ef4444";
}

function parseCsv(text: string) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row");
  }

  const headers = rows[0].split(",").map((value) => value.trim().toLowerCase());
  const required = ["operator", "part", "trial", "value"];
  for (const header of required) {
    if (!headers.includes(header)) {
      throw new Error(`CSV must include ${required.join(", ")} columns`);
    }
  }

  return rows.slice(1).map((row) => {
    const cells = row.split(",").map((value) => value.trim());
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });

    return {
      operator: record.operator,
      part: Number(record.part),
      trial: Number(record.trial),
      value: Number(record.value),
    };
  });
}

function createMeasurementRows(operators: number, parts: number, trials: number) {
  const rows: MeasurementRow[] = [];

  for (let operatorIndex = 1; operatorIndex <= operators; operatorIndex += 1) {
    for (let partIndex = 1; partIndex <= parts; partIndex += 1) {
      for (let trialIndex = 1; trialIndex <= trials; trialIndex += 1) {
        rows.push({
          operator: `Operator ${operatorIndex}`,
          part: partIndex,
          trial: trialIndex,
          value: "" as unknown as number,
        });
      }
    }
  }

  return rows;
}

function computeGrandMean(measurements: MeasurementRow[]) {
  const values = measurements.map((row) => row.value).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function GaugeChart({ value }: { value: number }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const angle = -90 + (clamped / 100) * 180;
  const color = getGaugeColor(clamped);

  return (
    <div className="relative mx-auto h-56 w-56">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 180deg, #22c55e 0deg 36deg, #eab308 36deg 108deg, #ef4444 108deg 180deg, transparent 180deg 360deg)",
          mask: "radial-gradient(circle at center, transparent 54%, black 55%)",
          WebkitMask: "radial-gradient(circle at center, transparent 54%, black 55%)",
        }}
      />
      <div className="absolute inset-6 rounded-full bg-slate-900 shadow-inner shadow-black/40" />
      <div
        className="absolute left-1/2 top-1/2 h-[92px] w-1 origin-bottom rounded-full bg-slate-100"
        style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950"
        style={{ background: color }}
      />
      <div className="absolute inset-x-0 bottom-10 text-center">
        <div className="text-4xl font-semibold text-slate-50">{clamped.toFixed(1)}%</div>
        <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">GR&R</div>
      </div>
    </div>
  );
}

function StepBadge({ step, active }: { step: number; active: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
        active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-500"
      }`}
    >
      {step}
    </div>
  );
}

export default function GRRPage() {
  const [step, setStep] = useState<Step>(1);
  const [analysis, setAnalysis] = useState<AnalysisState>({ result: null, loading: false, error: null });
  const [tableReady, setTableReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<GRRFormValues>({
    defaultValues,
    mode: "onBlur",
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "measurements",
  });

  const measurements = useWatch({ control, name: "measurements" });
  const grandMean = useMemo(() => computeGrandMean(measurements || []), [measurements]);
  const currentAnalysis = analysis.result;
  const verdict = currentAnalysis ? grrVerdict(currentAnalysis.grr_percent) : null;
  const analysisPct = currentAnalysis?.grr_percent ?? 0;

  const operators = watch("operators");
  const parts = watch("parts");
  const trials = watch("trials");
  const processName = watch("processName");
  const partTolerance = watch("partTolerance");

  const step1Valid = async () => {
    return trigger(["operators", "parts", "trials", "processName", "partTolerance"]);
  };

  const generateTable = async () => {
    const valid = await step1Valid();
    if (!valid) {
      return;
    }

    const values = getValues();
    const rows = createMeasurementRows(values.operators, values.parts, values.trials);
    replace(rows);
    setTableReady(true);
    setStep(2);
    setAnalysis({ result: null, loading: false, error: null });
  };

  const fillMeasurementsFromCsv = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const importedRows = parseCsv(text);

      if (!fields.length) {
        throw new Error("Generate the measurement table before importing CSV data");
      }

      const nextRows = fields.map((field) => {
        const match = importedRows.find(
          (row) =>
            (row.operator === field.operator || `Operator ${row.operator}` === field.operator) &&
            row.part === field.part &&
            row.trial === field.trial,
        );
        return {
          operator: field.operator,
          part: field.part,
          trial: field.trial,
          value: match?.value ?? ("" as unknown as number),
        };
      });

      replace(nextRows);
      showToast("CSV imported into the measurement table.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      setImporting(false);
    }
  };

  const runAnalysis = async (values: GRRFormValues) => {
    if (!values.measurements.length) {
      setAnalysis({ result: null, loading: false, error: "Generate the measurement table first." });
      return;
    }

    const payload = {
      measurements: values.measurements.map((row) => ({
        operator: row.operator,
        part: row.part,
        trial: row.trial,
        value: row.value,
      })),
      part_tolerance: values.partTolerance,
    };

    setAnalysis({ result: null, loading: true, error: null });
    setStep(3);

    try {
      const result = await submitGRRAnalysis(payload);
      setAnalysis({ result, loading: false, error: null });
      setLastSavedAt(new Date());
    } catch (error) {
      setAnalysis({
        result: null,
        loading: false,
        error: error instanceof Error ? error.message : "GR&R analysis failed",
      });
    }
  };

  const retryAnalysis = () => {
    void handleSubmit(runAnalysis)();
  };

  const saveToHistory = () => {
    showToast("Analysis already saved to history by the backend.");
    setLastSavedAt(new Date());
  };

  const exportPdf = () => {
    showToast("PDF export coming soon.");
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/95 px-6 py-5 shadow-[0_18px_55px_rgba(2,6,23,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                    GR&R Analysis Form
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Three-step measurement system study with live calculations and backend analysis.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Current status</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]" />
                Ready for measurement entry
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {lastSavedAt ? `Last saved ${formatTimestamp(lastSavedAt)}` : "Analysis not yet run"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  step === index + 1
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <StepBadge step={index + 1} active={step === index + 1} />
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Step {index + 1}</div>
                  <div className="text-sm font-semibold text-slate-100">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit(runAnalysis)} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            {step === 1 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
                <SectionHeader
                  icon={<Wand2 size={16} />}
                  title="Step 1 - Setup"
                  description="Define the study size and process metadata before generating the table."
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Number of Operators" error={errors.operators?.message}>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      {...register("operators", {
                        valueAsNumber: true,
                        required: "Enter operator count",
                        min: { value: 2, message: "Minimum 2 operators" },
                        max: { value: 10, message: "Maximum 10 operators" },
                      })}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Number of Parts" error={errors.parts?.message}>
                    <input
                      type="number"
                      min={5}
                      max={25}
                      {...register("parts", {
                        valueAsNumber: true,
                        required: "Enter part count",
                        min: { value: 5, message: "Minimum 5 parts" },
                        max: { value: 25, message: "Maximum 25 parts" },
                      })}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Number of Trials" error={errors.trials?.message}>
                    <input
                      type="number"
                      min={2}
                      max={3}
                      {...register("trials", {
                        valueAsNumber: true,
                        required: "Enter trial count",
                        min: { value: 2, message: "Minimum 2 trials" },
                        max: { value: 3, message: "Maximum 3 trials" },
                      })}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Part Tolerance" error={errors.partTolerance?.message} optional>
                    <input
                      type="number"
                      step="0.0001"
                      {...register("partTolerance", {
                        setValueAs: (value) => (value === "" || value === null ? undefined : Number(value)),
                        min: { value: 0, message: "Tolerance must be positive" },
                      })}
                      className={inputClass}
                      placeholder="Optional"
                    />
                  </Field>

                  <Field className="md:col-span-2" label="Process Name" error={errors.processName?.message}>
                    <input
                      type="text"
                      placeholder="e.g. Bore Diameter"
                      {...register("processName", {
                        required: "Process name is required",
                        minLength: { value: 2, message: "Process name is too short" },
                      })}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void generateTable()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    <Table2 size={16} /> Generate Measurement Table
                  </button>
                  <div className="text-xs text-slate-500">Defaults: 3 operators, 10 parts, 2 trials</div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
                <SectionHeader
                  icon={<FileUp size={16} />}
                  title="Step 2 - Data Entry"
                  description="Fill every measurement cell, import CSV data, and preview the grand mean live."
                />

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="text-sm text-slate-300">
                    <span className="font-semibold text-slate-100">{processName || "Unnamed process"}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {operators} operators · {parts} parts · {trials} trials
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800">
                      {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Import CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void fillMeasurementsFromCsv(file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const valid = await trigger("measurements");
                        if (valid) setStep(3);
                        else showToast("Please fill out all measurements before proceeding.");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                    >
                      Review Analysis Step <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Grand Mean Preview</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-50">
                        {grandMean !== null ? grandMean.toFixed(4) : "—"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">Live preview updates as values are entered</div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Operator</th>
                          <th className="px-4 py-3 font-medium">Part #</th>
                          <th className="px-4 py-3 font-medium">Trial #</th>
                          <th className="px-4 py-3 font-medium">Measurement Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                        {fields.map((field, index) => (
                          <tr key={field.id} className="transition hover:bg-slate-900/50">
                            <td className="px-4 py-3 text-slate-300">{field.operator}</td>
                            <td className="px-4 py-3 text-slate-300">{field.part}</td>
                            <td className="px-4 py-3 text-slate-300">{field.trial}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.0001"
                                {...register(`measurements.${index}.value`, {
                                  valueAsNumber: true,
                                  required: "Measurement is required",
                                  validate: (v) => !Number.isNaN(v) || "Required",
                                })}
                                className={`${inputClass} ${errors.measurements?.[index]?.value ? "border-rose-500/50 bg-rose-500/10 focus:border-rose-400 focus:ring-rose-500/20" : ""}`}
                                placeholder="Enter value"
                              />
                            </td>
                          </tr>
                        ))}
                        {!fields.length ? (
                          <tr>
                            <td className="px-4 py-10 text-center text-slate-500" colSpan={4}>
                              Generate the measurement table to begin data entry.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    <ArrowLeft size={16} /> Back to Setup
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const valid = await trigger("measurements");
                      if (valid) setStep(3);
                      else showToast("Please fill out all measurements before proceeding.");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Proceed to Analysis <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
                <SectionHeader
                  icon={<Gauge size={16} />}
                  title="Step 3 - Analysis"
                  description="Run the backend GR&R analysis, then review the verdict and AI commentary."
                />

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={analysis.loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {analysis.loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    Run GR&R Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    <ArrowLeft size={16} /> Back to Data Entry
                  </button>
                  <div className="text-xs text-slate-500">POST /api/grr/analyze with {measurements?.length || 0} measurements</div>
                </div>

                {analysis.error && (
                  <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Analysis failed</div>
                        <div className="mt-1 text-rose-100/90">{analysis.error}</div>
                      </div>
                      <button
                        type="button"
                        onClick={retryAnalysis}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
                      >
                        <RefreshCw size={14} /> Retry
                      </button>
                    </div>
                  </div>
                )}

                {analysis.loading && (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin text-emerald-300" />
                    Running statistical analysis on the backend...
                  </div>
                )}

                {currentAnalysis && verdict && (
                  <div className="mt-6 grid gap-5 xl:grid-cols-[320px_1fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                      <GaugeChart value={analysisPct} />
                      <div className="mt-4 flex items-center justify-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            currentAnalysis.grr_percent < 10
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : currentAnalysis.grr_percent <= 30
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {verdict.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          { label: "Repeatability %", value: formatPercent(currentAnalysis.repeatability), tone: "text-emerald-300" },
                          { label: "Reproducibility %", value: formatPercent(currentAnalysis.reproducibility), tone: "text-amber-300" },
                          { label: "Distinct Categories", value: String(currentAnalysis.number_of_distinct_categories), tone: "text-sky-300" },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
                            <div className={`mt-2 text-2xl font-semibold ${metric.tone}`}>{metric.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">AI Analysis</h3>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {formatTimestamp(currentAnalysis.timestamp)}
                          </span>
                        </div>
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{currentAnalysis.ai_analysis}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={saveToHistory}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                          <Save size={16} /> Save to History
                        </button>
                        <button
                          type="button"
                          onClick={exportPdf}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                          <Download size={16} /> Export PDF Report
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                        >
                          <Plus size={16} /> Adjust Measurements
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!analysis.loading && !currentAnalysis && !analysis.error && (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-400">
                      <Gauge size={18} />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-200">Ready to analyze</h3>
                    <p className="mt-1 text-sm text-slate-500">Run the GR&R calculation after confirming the table data.</p>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-slate-300" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Study Summary</h2>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  { label: "Operators", value: operators },
                  { label: "Parts", value: parts },
                  { label: "Trials", value: trials },
                  { label: "Tolerance", value: partTolerance ?? "Optional" },
                  { label: "Process", value: processName || "Not set" },
                  { label: "Measurements", value: fields.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.35)]">
              <div className="flex items-center gap-2">
                <Table2 size={16} className="text-slate-300" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Data Integrity</h2>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <span className="text-slate-500">Entered values</span>
                  <span className="font-semibold text-slate-100">
                    {measurements?.filter((row) => Number.isFinite(row.value)).length || 0}/{fields.length}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <span className="text-slate-500">Grand mean</span>
                  <span className="font-semibold text-slate-100">{grandMean !== null ? grandMean.toFixed(4) : "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <span className="text-slate-500">Analysis ready</span>
                  <span className="font-semibold text-emerald-300">{tableReady ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-slate-300">
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  optional = false,
  className = "",
}: {
  label: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        {optional ? <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Optional</span> : null}
      </div>
      {children}
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
    </label>
  );
}
