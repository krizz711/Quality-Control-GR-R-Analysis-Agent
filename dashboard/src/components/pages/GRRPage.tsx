"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  BarChart3,
  Users,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Play,
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useGRRReviews, useGRRNarrative, downloadGRRReport } from "@/lib/hooks";
import type { UIGRRStudy } from "@/lib/types";
import { formatPercent, grrVerdict, timeAgo } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-[11px]"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function GRRPage() {
  const { data: reviews, loading, error, retry } = useGRRReviews();
  const [selectedStudy, setSelectedStudy] = useState<UIGRRStudy | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Auto-select first study when data loads
  useEffect(() => {
    if (reviews && reviews.length > 0 && !selectedStudy) {
      setSelectedStudy(reviews[0]);
    }
  }, [reviews, selectedStudy]);

  const handleDownloadPDF = async () => {
    if (!selectedStudy) return;
    try {
      setDownloadingPdf(true);
      await downloadGRRReport(selectedStudy.id);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF report");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Fallback to mock data if no backend connection
  const studies = reviews || [];
  const currentStudy = selectedStudy || (studies.length > 0 ? studies[0] : null);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6" style={{ background: "var(--bg-root)" }}>
        <AlertTriangle size={48} style={{ color: "var(--critical)" }} className="mb-4" />
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Failed to Load GR&R Studies
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const varianceData = [
    { name: "EV", value: currentStudy?.ev || 0, label: "Repeatability" },
    { name: "AV", value: currentStudy?.av || 0, label: "Reproducibility" },
    { name: "PV", value: currentStudy?.pv || 0, label: "Part Variation" },
  ];

  const totalVar = (currentStudy?.ev || 0) + (currentStudy?.av || 0) + (currentStudy?.pv || 0);
  const contributionData = totalVar > 0 ? [
    { name: "Repeatability (EV)", value: parseFloat((((currentStudy?.ev || 0) / totalVar) * 100).toFixed(1)), fill: "var(--accent)" },
    { name: "Reproducibility (AV)", value: parseFloat((((currentStudy?.av || 0) / totalVar) * 100).toFixed(1)), fill: "var(--warning)" },
    { name: "Part Variation (PV)", value: parseFloat((((currentStudy?.pv || 0) / totalVar) * 100).toFixed(1)), fill: "var(--success)" },
  ] : [];

  const v = currentStudy ? grrVerdict(currentStudy.grr_pct) : { color: "gray", badge: "", label: "N/A" };

  const grrComparisonData = studies.map((s) => ({
    name: s.equipment_id,
    grr: s.grr_pct,
    fill: s.grr_pct <= 10 ? "var(--success)" : s.grr_pct <= 30 ? "var(--warning)" : "var(--critical)",
  }));

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
            GR&R Study Dashboard
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Gage Repeatability & Reproducibility · AIAG MSA 4th Edition
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={!currentStudy || downloadingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloadingPdf ? "Downloading..." : "Export PDF"}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            <Play size={14} /> New Study
          </button>
        </div>
      </motion.div>

        {/* Comparison bar chart */}
      <motion.div variants={item} className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Equipment GR&R Comparison
            </span>
          </div>
          <div className="flex items-center gap-3">
            {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>≤10%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>10-30%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--critical)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>&gt;30%</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={grrComparisonData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 50]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            {/* Reference lines for GRR thresholds */}
            <Bar dataKey="grr" radius={[6, 6, 0, 0]}>
              {grrComparisonData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Threshold lines visual */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
            ── 10% Acceptable threshold &nbsp; ── 30% Unacceptable threshold
          </span>
        </div>
      </motion.div>

      {/* Two columns: study list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Study List */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="surface-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Study History
              </span>
              {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {studies.length === 0 ? (
                <div className="px-5 py-8 text-center" style={{ color: "var(--text-ghost)" }}>
                  <p className="text-[12px]">No pending reviews</p>
                </div>
              ) : (
                studies.map((study) => {
                  const sv = grrVerdict(study.grr_pct);
                  const isSelected = selectedStudy?.id === study.id;
                  return (
                    <motion.div
                      key={study.id}
                      onClick={() => { setSelectedStudy(study); setShowNarrative(false); }}
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                      style={{
                        background: isSelected ? "var(--accent-bg)" : "transparent",
                        borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        style={{
                          background: study.acceptance === "acceptable" ? "var(--success-bg)" : study.acceptance === "conditional" ? "var(--warning-bg)" : "var(--critical-bg)",
                        }}
                      >
                        {study.acceptance === "acceptable" ? <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> :
                         study.acceptance === "conditional" ? <AlertCircle size={16} style={{ color: "var(--warning)" }} /> :
                         <XCircle size={16} style={{ color: "var(--critical)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {study.equipment_id} · {study.characteristic_name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                          {study.created_at ? timeAgo(study.created_at) : "Unknown date"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold" style={{ color: sv.color }}>{formatPercent(study.grr_pct)}</div>
                        <span className={`badge ${sv.badge}`} style={{ fontSize: "9px" }}>{sv.label}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>

        {/* Study Detail */}
        <motion.div variants={item} className="lg:col-span-3 space-y-4">
          {loading && !currentStudy ? (
            <div className="flex items-center justify-center p-8" style={{ background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
              <span className="ml-3" style={{ color: "var(--text-secondary)" }}>Loading study...</span>
            </div>
          ) : currentStudy ? (
            <>
              {/* Verdict hero */}
              <div
                className="relative overflow-hidden rounded-xl p-5"
                style={{
                  background: "var(--bg-surface)",
                  border: `1px solid ${v.color}22`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        {currentStudy.equipment_id}
                      </span>
                      <span className={`badge ${v.badge}`}>{v.label}</span>
                    </div>
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {currentStudy.characteristic_name} · {currentStudy.acceptance.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black tracking-tight" style={{ color: v.color }}>
                      {formatPercent(currentStudy.grr_pct)}
                    </div>
                    <div className="text-[11px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
                      %GR&R
                    </div>
                  </div>
                </div>

                {/* Key metrics row */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                  {[
                    { label: "EV (Repeat.)", value: (currentStudy.ev || 0).toFixed(5) },
                    { label: "AV (Reprod.)", value: (currentStudy.av || 0).toFixed(5) },
                    { label: "PV (Part Var.)", value: (currentStudy.pv || 0).toFixed(5) },
                    { label: "NDC", value: currentStudy.ndc.toString(), extra: currentStudy.ndc >= 5 ? "Adequate" : "Inadequate" },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                        {m.label}
                      </div>
                      <div className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                        {m.value}
                      </div>
                      {m.extra && (
                        <span
                          className="text-[9px] font-medium"
                          style={{ color: currentStudy.ndc >= 5 ? "var(--success)" : "var(--critical)" }}
                        >
                          {m.extra}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variance contribution chart */}
              <div className="surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} style={{ color: "var(--accent)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Variance Contribution
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={contributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {contributionData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center gap-3">
                    {contributionData.map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded" style={{ background: c.fill, opacity: 0.85 }} />
                        <div className="flex-1">
                          <div className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {c.name}
                          </div>
                          <div className="w-full h-1.5 rounded-full mt-1" style={{ background: "var(--bg-hover)" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${c.value}%` }}
                              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay: 0.2 + i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: c.fill }}
                            />
                          </div>
                        </div>
                        <span className="text-[12px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                          {c.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center" style={{ background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              <p style={{ color: "var(--text-secondary)" }}>No study selected</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
