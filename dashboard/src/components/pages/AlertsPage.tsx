"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Shield,
  Eye,
  MessageSquare,
  ArrowRight,
  XCircle,
  AlertCircle,
  Check,
} from "lucide-react";
import { qualityAlerts, systemMetrics, type QualityAlert } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function AlertDetailPanel({ alert }: { alert: QualityAlert }) {
  const [showAI, setShowAI] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full overflow-y-auto"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`badge ${alert.severity === "critical" ? "badge-critical" : "badge-warning"}`}
          >
            {alert.severity === "critical" ? <AlertTriangle size={10} /> : <AlertCircle size={10} />}
            {alert.severity}
          </span>
          <span
            className={`badge ${
              alert.status === "open"
                ? "badge-critical"
                : alert.status === "investigating"
                ? "badge-warning"
                : "badge-success"
            }`}
          >
            {alert.status}
          </span>
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          {alert.rule_label}
        </h2>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {alert.message}
        </p>
      </div>

      {/* Metadata */}
      <div className="px-6 py-4 border-b grid grid-cols-2 gap-3" style={{ borderColor: "var(--border-subtle)" }}>
        {[
          { label: "Machine", value: alert.machine_id },
          { label: "Part", value: alert.part_number },
          { label: "Characteristic", value: alert.characteristic },
          { label: "Detected", value: timeAgo(alert.created_at) },
          { label: "Assignee", value: alert.assignee || "Unassigned" },
          { label: "Rule", value: alert.rule.toUpperCase() },
        ].map((m, i) => (
          <div key={i}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--text-ghost)" }}>
              {m.label}
            </div>
            <div className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={() => setShowAI(!showAI)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              AI Root Cause Analysis
            </span>
          </div>
          <motion.div animate={{ rotate: showAI ? 180 : 0 }}>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </motion.div>
        </button>
        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="rounded-lg p-4 mb-3"
                style={{ background: "var(--accent-bg)", border: "1px solid rgba(99,145,255,0.08)" }}
              >
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {alert.ai_analysis}
                </p>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--success-bg)", border: "1px solid rgba(52,211,153,0.1)" }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--success)" }}>
                    Recommended Action
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {alert.recommended_action}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2">
          {alert.status === "open" && (
            <>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Check size={13} /> Acknowledge
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <User size={13} /> Assign
              </button>
            </>
          )}
          {alert.status === "investigating" && (
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium"
              style={{ background: "var(--success)", color: "white" }}
            >
              <CheckCircle2 size={13} /> Resolve
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <MessageSquare size={13} /> Comment
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<QualityAlert>(qualityAlerts[0]);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "warning">("all");
  const [search, setSearch] = useState("");

  const filtered = qualityAlerts.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !a.machine_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCount = qualityAlerts.filter((a) => a.status === "open").length;
  const criticalCount = qualityAlerts.filter((a) => a.severity === "critical" && a.status === "open").length;
  const investigatingCount = qualityAlerts.filter((a) => a.status === "investigating").length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="h-full flex flex-col"
      style={{ background: "var(--bg-root)" }}
    >
      {/* Header */}
      <motion.div variants={item} className="px-6 py-5 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Alert Inbox
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Quality violation monitoring · Incident response center
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Alert accuracy KPI */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--success-bg)", border: "1px solid rgba(52,211,153,0.1)" }}
            >
              <Shield size={13} style={{ color: "var(--success)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--success)" }}>
                {systemMetrics.alert_accuracy}% Accuracy
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                target &gt;95%
              </span>
            </div>
          </div>
        </div>

        {/* Stats + filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {[
              { label: "Open", count: openCount, color: "var(--critical)" },
              { label: "Critical", count: criticalCount, color: "var(--critical)" },
              { label: "Investigating", count: investigatingCount, color: "var(--warning)" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {s.count} {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <Search size={13} style={{ color: "var(--text-ghost)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts..."
                className="bg-transparent text-[12px] outline-none w-40"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
              {(["all", "critical", "warning"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className="px-2.5 py-1.5 text-[10px] font-medium capitalize transition-colors"
                  style={{
                    background: filterSeverity === f ? "var(--accent-bg)" : "var(--bg-surface)",
                    color: filterSeverity === f ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Alert list */}
        <motion.div
          variants={item}
          className="w-full lg:w-[420px] border-r overflow-y-auto shrink-0"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {filtered.map((alert) => {
            const isSelected = selectedAlert.id === alert.id;
            return (
              <motion.div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                whileHover={{ backgroundColor: "var(--bg-hover)" }}
                className="flex items-start gap-3 px-5 py-4 border-b cursor-pointer transition-colors"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: isSelected ? "var(--accent-bg)" : "transparent",
                  borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{
                    background: alert.severity === "critical" ? "var(--critical)" : "var(--warning)",
                    boxShadow: alert.status === "open" && alert.severity === "critical"
                      ? "0 0 8px rgba(248,113,113,0.4)"
                      : "none",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {alert.rule_label}
                    </span>
                    <span
                      className={`badge ${
                        alert.status === "open"
                          ? "badge-critical"
                          : alert.status === "investigating"
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                      style={{ fontSize: "9px" }}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed truncate" style={{ color: "var(--text-secondary)" }}>
                    {alert.message.slice(0, 90)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                      {alert.machine_id}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>•</span>
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                      {timeAgo(alert.created_at)}
                    </span>
                    {alert.assignee && (
                      <>
                        <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>•</span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <User size={9} /> {alert.assignee}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="mt-1 shrink-0" style={{ color: "var(--text-ghost)" }} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Detail pane */}
        <motion.div variants={item} className="hidden lg:block flex-1 min-w-0" style={{ background: "var(--bg-surface)" }}>
          <AlertDetailPanel alert={selectedAlert} />
        </motion.div>
      </div>
    </motion.div>
  );
}
