"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  Play,
  ShieldCheck,
  Timer,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { downloadGRRReport, useGRRReviews } from "@/lib/hooks";
import { grrStudies } from "@/lib/mock-data";
import type { UIGRRStudy } from "@/lib/types";
import { formatPercent, grrVerdict, timeAgo } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const demoStudies: UIGRRStudy[] = grrStudies.map((study) => ({
  id: study.id,
  equipment_id: study.equipment_id,
  characteristic_name: study.characteristic_name,
  grr_pct: study.grr_pct,
  ndc: study.ndc,
  acceptance: study.verdict === "unacceptable" ? "not_acceptable" : study.verdict,
  ev: study.ev,
  av: study.av,
  pv: study.pv,
  created_at: study.created_at,
  ai_narrative: study.ai_narrative,
}));

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string; payload?: { fill?: string } }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg px-3 py-2 text-[11px]"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {label && (
        <div className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </div>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color || entry.payload?.fill || "var(--accent)" }}
          />
          <span style={{ color: "var(--text-secondary)" }}>
            {entry.name}: {entry.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
};

function StatusIcon({ acceptance }: { acceptance: UIGRRStudy["acceptance"] }) {
  if (acceptance === "acceptable") return <CheckCircle2 size={16} style={{ color: "var(--success)" }} />;
  if (acceptance === "conditional") return <AlertCircle size={16} style={{ color: "var(--warning)" }} />;
  return <XCircle size={16} style={{ color: "var(--critical)" }} />;
}

export default function GRRPage() {
  const { data: reviews, loading, error, retry } = useGRRReviews();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const allowMockData =
    process.env.NEXT_PUBLIC_ALLOW_MOCK_DATA === "true" || process.env.NODE_ENV !== "production";
  const studies = reviews && reviews.length > 0 ? reviews : allowMockData ? demoStudies : [];
  const currentStudy = studies.find((study) => study.id === selectedId) || studies[0];
  const usingDemoData = studies.length > 0 && (!reviews || reviews.length === 0);

  useEffect(() => {
    if (!selectedId && studies.length > 0) {
      setSelectedId(studies[0].id);
    }
  }, [selectedId, studies]);

  const grrComparisonData = useMemo(
    () =>
      studies.map((study) => ({
        name: study.equipment_id,
        grr: study.grr_pct,
        fill:
          study.grr_pct <= 10
            ? "var(--success)"
            : study.grr_pct <= 30
              ? "var(--warning)"
              : "var(--critical)",
      })),
    [studies],
  );

  const contributionData = useMemo(() => {
    const ev = currentStudy?.ev || 0;
    const av = currentStudy?.av || 0;
    const pv = currentStudy?.pv || 0;
    const total = ev + av + pv;

    if (!total) return [];

    return [
      { name: "Repeatability", value: Number(((ev / total) * 100).toFixed(1)), fill: "var(--accent)" },
      { name: "Reproducibility", value: Number(((av / total) * 100).toFixed(1)), fill: "var(--warning)" },
      { name: "Part Variation", value: Number(((pv / total) * 100).toFixed(1)), fill: "var(--success)" },
    ];
  }, [currentStudy]);

  const handleDownloadPDF = async () => {
    if (!currentStudy) return;

    try {
      setDownloadingPdf(true);
      await downloadGRRReport(currentStudy.id);
    } catch {
      window.alert("PDF export requires a live backend study record.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const verdict = currentStudy
    ? grrVerdict(currentStudy.grr_pct)
    : { label: "No Data", color: "var(--text-muted)", badge: "badge-info" };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="h-full overflow-y-auto p-6"
      style={{ background: "var(--bg-root)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <motion.div variants={item} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FlaskConical size={18} style={{ color: "var(--accent)" }} />
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                GR&R Analysis Center
              </h1>
            </div>
            <p className="max-w-2xl text-[12px]" style={{ color: "var(--text-muted)" }}>
              Automated gage repeatability and reproducibility studies with AIAG MSA thresholds, review routing, and audit-ready reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {error && (
              <button
                onClick={retry}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
                style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid rgba(251,191,36,0.16)" }}
              >
                <AlertTriangle size={14} />
                Retry backend
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={!currentStudy || downloadingPdf || usingDemoData}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export PDF
            </button>
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <Play size={14} />
              New Study
            </button>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { label: "Completion Target", value: "<2h", icon: Timer, tone: "var(--success)" },
            { label: "AIAG Accept Limit", value: "<10%", icon: ShieldCheck, tone: "var(--success)" },
            { label: "Human Review Band", value: "10-30%", icon: Users, tone: "var(--warning)" },
            { label: "Active Records", value: String(studies.length), icon: FileText, tone: "var(--accent)" },
          ].map((metric) => (
            <div key={metric.label} className="surface-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                  {metric.label}
                </span>
                <metric.icon size={14} style={{ color: metric.tone }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: metric.tone }}>
                {metric.value}
              </div>
            </div>
          ))}
        </motion.div>

        {usingDemoData && (
          <motion.div
            variants={item}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-[12px]"
            style={{ background: "var(--info-bg)", border: "1px solid rgba(96,165,250,0.12)", color: "var(--text-secondary)" }}
          >
            <AlertCircle size={14} style={{ color: "var(--info)" }} />
            Showing production demo data until the backend returns pending review records.
          </motion.div>
        )}

        {!loading && studies.length === 0 && (
          <motion.div
            variants={item}
            className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center"
          >
            <FileText size={34} style={{ color: "var(--text-muted)" }} />
            <h2 className="mt-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              No live GR&R studies available
            </h2>
            <p className="mt-2 max-w-lg text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Production mode does not show demo data. Connect the API, submit a GR&R study, or set NEXT_PUBLIC_ALLOW_MOCK_DATA=true only for demo environments.
            </p>
            {error && (
              <button
                onClick={retry}
                className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Retry backend
              </button>
            )}
          </motion.div>
        )}

        {studies.length > 0 && (
        <motion.div variants={item} className="surface-card p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} style={{ color: "var(--accent)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Equipment GR&R Comparison
              </span>
              {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
            </div>
            <div className="flex items-center gap-4">
              {[
                ["Accept", "var(--success)", "<=10%"],
                ["Review", "var(--warning)", "10-30%"],
                ["Fail", "var(--critical)", ">30%"],
              ].map(([label, color, value]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={grrComparisonData} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 50]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="grr" name="%GR&R" radius={[6, 6, 0, 0]}>
                {grrComparisonData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        )}

        {studies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <motion.div variants={item} className="lg:col-span-2">
            <div className="surface-card overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Study Queue
                </span>
                <span className="badge badge-info">{usingDemoData ? "Demo" : "Live"}</span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {studies.map((study) => {
                  const studyVerdict = grrVerdict(study.grr_pct);
                  const selected = currentStudy?.id === study.id;

                  return (
                    <button
                      key={study.id}
                      onClick={() => setSelectedId(study.id)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                      style={{
                        background: selected ? "var(--accent-bg)" : "transparent",
                        borderLeft: selected ? "2px solid var(--accent)" : "2px solid transparent",
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                        <StatusIcon acceptance={study.acceptance} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                          {study.equipment_id} - {study.characteristic_name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                          {study.created_at ? timeAgo(study.created_at) : "Pending review"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold" style={{ color: studyVerdict.color }}>
                          {formatPercent(study.grr_pct)}
                        </div>
                        <span className={`badge ${studyVerdict.badge}`} style={{ fontSize: "9px" }}>
                          {studyVerdict.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="space-y-4 lg:col-span-3">
            {currentStudy && (
              <>
                <div className="surface-card p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {currentStudy.equipment_id}
                        </h2>
                        <span className={`badge ${verdict.badge}`}>{verdict.label}</span>
                      </div>
                      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        {currentStudy.characteristic_name} measurement system validation
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-4xl font-black" style={{ color: verdict.color }}>
                        {formatPercent(currentStudy.grr_pct)}
                      </div>
                      <div className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        total GR&R
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: "EV", value: (currentStudy.ev || 0).toFixed(5), helper: "Repeatability" },
                      { label: "AV", value: (currentStudy.av || 0).toFixed(5), helper: "Reproducibility" },
                      { label: "PV", value: (currentStudy.pv || 0).toFixed(5), helper: "Part variation" },
                      { label: "NDC", value: String(currentStudy.ndc), helper: currentStudy.ndc >= 5 ? "Adequate" : "Inadequate" },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                        <div className="mb-1 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                          {metric.label}
                        </div>
                        <div className="font-mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {metric.value}
                        </div>
                        <div className="text-[9px]" style={{ color: "var(--text-ghost)" }}>
                          {metric.helper}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="surface-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <BarChart3 size={14} style={{ color: "var(--accent)" }} />
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        Variance Contribution
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={contributionData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                          {contributionData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} fillOpacity={0.9} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-2">
                      {contributionData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded" style={{ background: entry.fill }} />
                          <span className="flex-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {entry.name}
                          </span>
                          <span className="font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>
                            {entry.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="surface-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} style={{ color: "var(--success)" }} />
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        Production Decision
                      </span>
                    </div>
                    <div className="rounded-lg p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {currentStudy.ai_narrative ||
                          (currentStudy.grr_pct <= 10
                            ? "Measurement system is acceptable for production release. Continue routine calibration and audit monitoring."
                            : currentStudy.grr_pct <= 30
                              ? "Measurement system is conditionally acceptable and should route to quality engineering review before unrestricted release."
                              : "Measurement system is not acceptable for production use. Remove from release path, correct the measurement source, and repeat GR&R.")}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
        )}
      </div>
    </motion.div>
  );
}
