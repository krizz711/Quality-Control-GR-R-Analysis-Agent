"use client";

/* Alerts — prototype-exact severity feed + accuracy tracker, wired to live endpoints. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Check, CheckCircle2, Loader2, X } from "lucide-react";
import {
  getAlertAccuracy,
  getAlerts,
  recordAlertFeedback,
  resolveAlert,
  type AlertAccuracyResponse,
  type AlertItem,
} from "@/api/apiClient";
import { useRealtimeStream } from "@/api/realtime";
import { useAppStore } from "@/lib/store";
import { Card, StatusDot } from "@/components/ui/kit";
import { toast } from "@/components/ui/fx";

type FeedbackState = "confirmed" | "false";

const FILTERS = ["All", "Critical", "High", "Medium", "Low"] as const;
type Filter = (typeof FILTERS)[number];

const sevConf: Record<string, { border: string; badge: string; label: string; filter: Filter; dot: "critical" | "warning" | "info" }> = {
  critical: { border: "#ef4444", badge: "badge badge-critical", label: "Critical", filter: "Critical", dot: "critical" },
  high: { border: "#ef4444", badge: "badge badge-critical", label: "High", filter: "High", dot: "critical" },
  medium: { border: "#f59e0b", badge: "badge badge-warning", label: "Medium", filter: "Medium", dot: "warning" },
  low: { border: "#3b82f6", badge: "badge badge-info", label: "Low", filter: "Low", dot: "info" },
};

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} d ago`;
}

function AlertCard({
  a,
  fresh,
  feedback,
  resolving,
  onConfirm,
  onFalse,
  onResolve,
}: {
  a: AlertItem;
  fresh: boolean;
  feedback?: FeedbackState;
  resolving: boolean;
  onConfirm: () => void;
  onFalse: () => void;
  onResolve: () => void;
}) {
  const c = sevConf[a.severity] || sevConf.low;
  const dim = feedback === "false";
  const borderC = feedback === "confirmed" ? "var(--success)" : c.border;

  return (
    <div
      style={
        {
          position: "relative",
          "--flash-c": c.border,
          "--glow-c": "rgba(239,68,68,.5)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderLeft: `3px solid ${borderC}`,
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          opacity: dim ? 0.5 : 1,
          transition: "opacity .3s var(--ease-out), border-color .3s var(--ease-out)",
          animation: fresh
            ? `arad-alert-in .4s var(--ease-out)${a.severity === "critical" ? ", arad-glow-once 1s ease-out, arad-border-flash .7s ease-out" : ", arad-border-flash .6s ease-out"}`
            : "none",
        } as React.CSSProperties
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <StatusDot tone={feedback === "confirmed" ? "success" : c.dot} pulse={!feedback && a.severity === "critical"} size={7} />
        <span className={c.badge}>{c.label}</span>
        <span className="badge badge-neutral">{a.type.replace(/_/g, " ")}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{a.process_name}</span>
        <div style={{ flex: 1 }} />
        {a.status === "resolved" && <span className="badge badge-success">Resolved</span>}
        {feedback === "confirmed" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--success)",
              animation: "arad-reveal-up-sm .25s var(--ease-out)",
            }}
          >
            <Check size={14} /> Confirmed
          </span>
        )}
        {feedback === "false" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            False Positive
          </span>
        )}
      </div>

      <div style={{ position: "relative", display: "inline-block", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
        {a.message}
        {dim && (
          <span
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              height: 1,
              background: "var(--text-muted)",
              width: "100%",
              transformOrigin: "left",
              animation: "arad-grow-x .3s var(--ease-out)",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(a.created_at)}</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {!feedback && (
            <>
              <button onClick={onConfirm} className="btn btn-secondary !h-[30px] !px-3 text-xs">
                <Check size={13} /> Confirm
              </button>
              <button onClick={onFalse} className="btn btn-ghost !h-[30px] !px-3 text-xs">
                <X size={14} /> False positive
              </button>
            </>
          )}
          {a.status === "active" && (
            <button onClick={onResolve} disabled={resolving} className="btn btn-success !h-[30px] !px-3 text-xs">
              {resolving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />} Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { setNotificationCount } = useAppStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [accuracy, setAccuracy] = useState<AlertAccuracyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, FeedbackState>>({});
  const [freshId, setFreshId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Sliding filter pill indicator
  const fRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const el = fRef.current[filter];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [filter]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [res, acc] = await Promise.all([getAlerts({ limit: 100 }), getAlertAccuracy().catch(() => null)]);
      setAlerts(res.items);
      setAccuracy(acc);
      setNotificationCount(res.items.filter((a) => a.status === "active").length);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [setNotificationCount]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeStream({
    onEvent: (event) => {
      if (String(event.type || "") === "alert.created") {
        void load(true);
        if (typeof event.message === "string") {
          toast({ type: "error", title: "New critical alert", msg: event.message });
        }
      }
    },
  });

  const handleFeedback = async (a: AlertItem, isRelevant: boolean) => {
    try {
      await recordAlertFeedback(a.id, {
        is_relevant: isRelevant,
        category: isRelevant ? "true_positive" : "false_positive",
        submitted_by: "quality-engineer",
      });
      setFeedbackGiven((prev) => ({ ...prev, [a.id]: isRelevant ? "confirmed" : "false" }));
      setAccuracy(await getAlertAccuracy().catch(() => accuracy));
      toast(
        isRelevant
          ? { type: "success", title: "Alert confirmed", msg: "Logged as true positive · accuracy updated" }
          : { type: "warning", title: "Marked false positive", msg: "Model feedback recorded for retraining" }
      );
    } catch {
      // interceptor surfaces the error toast
    }
  };

  const handleResolve = async (a: AlertItem) => {
    setResolvingId(a.id);
    try {
      await resolveAlert(a.id);
      await load(true);
      toast({ type: "success", title: "Alert resolved", msg: `${a.process_name} · audit entry recorded` });
    } catch {
      // interceptor surfaces the error toast
    } finally {
      setResolvingId(null);
    }
  };

  const visible = useMemo(
    () => alerts.filter((a) => filter === "All" || (sevConf[a.severity] || sevConf.low).filter === filter),
    [alerts, filter]
  );

  const accuracyRate = accuracy?.accuracy_rate ?? null;
  const tp = accuracy?.relevant_count ?? 0;
  const fp = accuracy?.false_positive_count ?? 0;

  return (
    <div className="arad-page min-h-full overflow-y-auto" style={{ background: "var(--bg-root)" }}>
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col px-6 py-6">
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Alert Feed</h1>
            <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              AI-detected SPC and GR&R violations, ordered by arrival
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {accuracyRate !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Activity size={14} style={{ color: "var(--success)" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>Accuracy</span>
              <span
                key={accuracyRate.toFixed(1)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--success)",
                  display: "inline-block",
                  animation: "arad-count-bounce .4s var(--ease-out)",
                }}
              >
                {accuracyRate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Sliding filter pills */}
        <div style={{ position: "relative", display: "inline-flex", gap: 6, marginBottom: 16, alignSelf: "flex-start" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: ind.left,
              width: ind.width,
              background: "var(--accent-bg)",
              border: "1px solid var(--accent)",
              borderRadius: 999,
              transition: "left .2s var(--ease-out), width .2s var(--ease-out)",
            }}
          />
          {FILTERS.map((f) => (
            <button
              key={f}
              ref={(el) => {
                fRef.current[f] = el;
              }}
              onClick={() => setFilter(f)}
              style={{
                position: "relative",
                height: 30,
                padding: "0 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid transparent",
                background: "transparent",
                color: filter === f ? "var(--accent)" : "var(--text-secondary)",
                transition: "color .2s",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Feed + tracker */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && alerts.length === 0 ? (
              <div className="flex flex-col items-center py-14" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={22} className="mb-2 animate-spin" /> Loading alerts...
              </div>
            ) : visible.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  border: "1px dashed var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                {filter === "All" ? "No alerts in the current window." : `No ${filter.toLowerCase()} alerts in the current window.`}
              </div>
            ) : (
              visible.map((a, i) => (
                <div key={a.id} style={{ animation: a.id !== freshId ? `arad-reveal-up-sm .3s ${i * 35}ms var(--ease-out) both` : "none" }}>
                  <AlertCard
                    a={a}
                    fresh={a.id === freshId}
                    feedback={feedbackGiven[a.id]}
                    resolving={resolvingId === a.id}
                    onConfirm={() => {
                      setFreshId(null);
                      void handleFeedback(a, true);
                    }}
                    onFalse={() => void handleFeedback(a, false)}
                    onResolve={() => void handleResolve(a)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Accuracy Tracker */}
          <Card padding={20}>
            <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              Accuracy Tracker
            </h2>
            {accuracyRate !== null ? (
              <>
                <div
                  key={accuracyRate.toFixed(1)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 32,
                    fontWeight: 600,
                    color: accuracyRate >= 95 ? "var(--success)" : "var(--warning)",
                    lineHeight: 1,
                    animation: "arad-flash-text .5s ease-out",
                  }}
                >
                  {accuracyRate.toFixed(1)}%
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {accuracy?.feedback_count ?? 0} feedback entries
                </div>
                <div style={{ height: 1, background: "var(--border-default)", margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-sans)", fontSize: 13 }}>
                    <span style={{ color: "var(--text-secondary)" }}>True positives</span>
                    <span
                      key={tp}
                      style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 600, display: "inline-block", animation: "arad-count-bounce .4s var(--ease-out)" }}
                    >
                      {tp}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-sans)", fontSize: 13 }}>
                    <span style={{ color: "var(--text-secondary)" }}>False positives</span>
                    <span
                      key={fp}
                      style={{ fontFamily: "var(--font-mono)", color: "var(--critical)", fontWeight: 600, display: "inline-block", animation: "arad-count-bounce .4s var(--ease-out)" }}
                    >
                      {fp}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: accuracy?.target_met ? "var(--success-fill)" : "var(--warning-fill)",
                    width: "100%",
                    boxSizing: "border-box",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} style={{ color: accuracy?.target_met ? "var(--success-text)" : "var(--warning-text)" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: accuracy?.target_met ? "var(--success-text)" : "var(--warning-text)" }}>
                    {accuracy?.target_met ? "On Track vs 95% target" : "Below 95% target"}
                  </span>
                </div>
              </>
            ) : (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                No feedback yet. Use <strong style={{ color: "var(--text-secondary)" }}>Confirm</strong> and{" "}
                <strong style={{ color: "var(--text-secondary)" }}>False positive</strong> on alerts to start tracking accuracy against the
                95% target.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
