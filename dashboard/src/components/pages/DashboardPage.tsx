"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  getAlertAccuracy,
  getAlerts,
  getAuditLog,
  getDashboardSummary,
  getGRRHistory,
  getSPCHistory,
  resolveAlert,
  submitSPCData,
  type AlertAccuracyResponse,
  type AlertItem,
  type AlertListResponse,
  type AuditLogItem,
  type DashboardSummaryResponse,
  type GRRHistoryItem,
  type SPCDataResponse,
} from "@/api/apiClient";
import { useRealtimeStream } from "@/api/realtime";
import { useAppStore } from "@/lib/store";
import { Card, DonutGauge, KPICard, Reveal, SPCChart, SectionTitle, StatusDot, type SPCChartPoint } from "@/components/ui/kit";

const SPC_STORAGE_KEY = "arad-spc-active-process";

type DashboardPayload = {
  summary: DashboardSummaryResponse;
  grrHistory: GRRHistoryItem[];
  alerts: AlertListResponse;
  auditLog: AuditLogItem[];
  accuracy: AlertAccuracyResponse | null;
};

type FeedEvent = {
  id: string;
  t: string;
  type: string;
  tone: "fail" | "info" | "conditional" | "purple";
  text: string;
  fresh?: boolean;
};

const SEVERITY_ORDER: Record<AlertItem["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const toneColor: Record<FeedEvent["tone"], string> = {
  fail: "var(--critical)",
  info: "var(--accent)",
  conditional: "var(--warning)",
  purple: "var(--accent-ai)",
};

const toneBadge: Record<FeedEvent["tone"], string> = {
  fail: "badge badge-critical",
  info: "badge badge-info",
  conditional: "badge badge-warning",
  purple: "badge badge-neutral",
};

function timeOf(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toTimeString().slice(0, 8);
}

function eventToneFor(text: string): FeedEvent["tone"] {
  const lower = text.toLowerCase();
  if (lower.includes("violation") || lower.includes("spc")) return "fail";
  if (lower.includes("alert")) return "conditional";
  if (lower.includes("review")) return "purple";
  return "info";
}

function auditToFeed(entries: AuditLogItem[]): FeedEvent[] {
  return entries.slice(0, 12).map((entry) => ({
    id: `audit-${entry.id}`,
    t: timeOf(entry.timestamp),
    type: entry.action,
    tone: eventToneFor(`${entry.action} ${entry.entity_type}`),
    text: `${entry.entity_type} · ${entry.entity_id} — by ${entry.actor || "system"}`,
  }));
}

function EventRow({ e }: { e: FeedEvent }) {
  return (
    <div
      style={
        {
          position: "relative",
          display: "flex",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid var(--border-default)",
          "--flash-c": toneColor[e.tone],
          animation: e.fresh ? "arad-event-in .35s var(--ease-out), arad-border-flash .6s ease-out" : "none",
        } as React.CSSProperties
      }
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", flex: "none", paddingTop: 2 }}>
        {e.t}
      </span>
      <div style={{ minWidth: 0 }}>
        <span className={toneBadge[e.tone]} style={{ marginBottom: 6 }}>{e.type}</span>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, marginTop: 6 }}>
          {e.text}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { setActivePage } = useAppStore();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<FeedEvent[]>([]);

  // Live SPC monitor state
  const [spcProcess, setSpcProcess] = useState<string | null>(null);
  const [spcPoints, setSpcPoints] = useState<SPCChartPoint[]>([]);
  const [spcAnalysis, setSpcAnalysis] = useState<SPCDataResponse | null>(null);
  const [drawKey, setDrawKey] = useState(0);

  useEffect(() => {
    setSpcProcess(window.localStorage.getItem(SPC_STORAGE_KEY));
  }, []);

  const loadDashboard = useCallback(async () => {
    if (hasLoadedOnce) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [summary, grrHistory, alerts, auditLog, accuracy] = await Promise.all([
        getDashboardSummary(),
        getGRRHistory(),
        getAlerts({ status: "active", limit: 50 }),
        getAuditLog(),
        getAlertAccuracy().catch(() => null),
      ]);

      setData({ summary, grrHistory, alerts, auditLog, accuracy });
      setHasLoadedOnce(true);
      setAnimKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasLoadedOnce]);

  const loadSpcMonitor = useCallback(async () => {
    const processName = window.localStorage.getItem(SPC_STORAGE_KEY);
    setSpcProcess(processName);
    if (!processName) return;

    try {
      const history = await getSPCHistory(processName);
      const values = [...history.points]
        .reverse()
        .map((point) => Number(point.value))
        .filter(Number.isFinite)
        .slice(-24);

      if (values.length >= 2) {
        const analysis = await submitSPCData({ process_name: processName, measurements: values });
        setSpcAnalysis(analysis);
        setSpcPoints(
          values.map((v, index) => ({
            v,
            violation: analysis.violations.some((violation) => violation.index === index),
          }))
        );
        setDrawKey((k) => k + 1);
      } else {
        setSpcAnalysis(null);
        setSpcPoints([]);
      }
    } catch {
      // SPC monitor stays in its empty state when history is unavailable.
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadSpcMonitor();
  }, [loadDashboard, loadSpcMonitor]);

  useRealtimeStream({
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
    onEvent: (event) => {
      const eventType = String(event.type || "");
      if (!eventType || eventType === "ping") return;

      const text =
        typeof event.message === "string"
          ? event.message
          : [event.process_name, event.part_number, event.characteristic_name].filter(Boolean).join(" · ") || eventType;

      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setLiveEvents((prev) => [
        { id, t: timeOf(new Date()), type: eventType, tone: eventToneFor(eventType), text, fresh: true },
        ...prev,
      ].slice(0, 14));
      window.setTimeout(() => {
        setLiveEvents((prev) => prev.map((item) => (item.id === id ? { ...item, fresh: false } : item)));
      }, 700);

      if (["measurement.processed", "spc.analysis", "grr.analysis", "alert.created", "mes.event", "qms.event"].includes(eventType)) {
        void loadDashboard();
        void loadSpcMonitor();
      }
    },
  });

  const handleResolveAlert = useCallback(
    async (alertId: string) => {
      setResolvingId(alertId);
      try {
        await resolveAlert(alertId);
        await loadDashboard();
      } finally {
        setResolvingId(null);
      }
    },
    [loadDashboard]
  );

  const summary = data?.summary;
  const grrHistory = data?.grrHistory ?? [];
  const activeAlerts = [...(data?.alerts.items ?? [])].sort(
    (left, right) => SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity]
  );
  const accuracy = data?.accuracy ?? null;

  const feed = useMemo<FeedEvent[]>(() => {
    const auditFeed = auditToFeed(data?.auditLog ?? []);
    return [...liveEvents, ...auditFeed].slice(0, 14);
  }, [liveEvents, data?.auditLog]);

  const grrSpark = useMemo(() => {
    if (!grrHistory.length) return undefined;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const counts: number[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const cutoff = now - i * day;
      counts.push(grrHistory.filter((item) => new Date(item.timestamp).getTime() <= cutoff).length);
    }
    return counts;
  }, [grrHistory]);

  const studiesThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return grrHistory.filter((item) => new Date(item.timestamp).getTime() >= weekAgo).length;
  }, [grrHistory]);

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const passRate = summary?.passing_rate ?? 0;
  const accuracyRate = accuracy?.accuracy_rate ?? null;

  if (error && !data) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-8" style={{ background: "var(--bg-root)" }}>
        <Card padding={32} style={{ maxWidth: 440, textAlign: "center" }}>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ background: "var(--critical-bg)", color: "var(--critical)" }}
          >
            <AlertTriangle size={22} />
          </div>
          <h1 className="page-title">Dashboard unavailable</h1>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>{error}</p>
          <button onClick={() => void loadDashboard()} className="btn btn-primary mt-6">
            <RefreshCw size={15} /> Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="arad-page min-h-full overflow-y-auto" style={{ background: "var(--bg-root)" }}>
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-4 px-6 py-6">
        {/* Page header */}
        <div className="flex items-start">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Live GR&R, SPC, alerting, and audit visibility
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={() => void loadDashboard()} className="btn btn-secondary" disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>

        {error ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
            style={{ background: "var(--warning-bg)", borderColor: "rgba(245,158,11,0.3)", color: "var(--warning-text)" }}
          >
            <span>{error}</span>
            <button onClick={() => void loadDashboard()} className="btn btn-secondary">Retry</button>
          </div>
        ) : null}

        {/* KPI strip */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            id="k1"
            label="GR&R Studies"
            value={loading ? "—" : summary?.total_grr_analyses ?? 0}
            subtitle={studiesThisWeek ? `+${studiesThisWeek} this week` : "No studies this week"}
            subtitleTone={studiesThisWeek ? "success" : "muted"}
            spark={grrSpark}
            animateKey={animKey}
            delay={0}
          />
          <KPICard
            id="k2"
            label="Alert Accuracy"
            value={loading ? "—" : accuracyRate !== null ? accuracyRate.toFixed(1) : "—"}
            unit={accuracyRate !== null ? "%" : ""}
            subtitle={
              accuracyRate === null
                ? "Awaiting alert feedback"
                : accuracy?.target_met
                  ? "▲ vs 95% target"
                  : "▼ below 95% target"
            }
            subtitleTone={accuracyRate === null ? "muted" : accuracy?.target_met ? "success" : "critical"}
            animateKey={animKey}
            delay={60}
          />
          <KPICard
            id="k3"
            label="Active Alerts"
            value={loading ? "—" : summary?.active_alerts_count ?? 0}
            subtitle={criticalCount ? `${criticalCount} critical · ${activeAlerts.length} total` : "No critical alerts"}
            subtitleTone={criticalCount ? "critical" : "success"}
            animateKey={animKey}
            delay={120}
          />
          <KPICard
            id="k4"
            label="Pass Rate"
            value={loading ? "—" : passRate.toFixed(1)}
            unit="%"
            subtitle={passRate > 70 ? "✓ healthy capability" : passRate >= 40 ? "review recommended" : "attention required"}
            subtitleTone={passRate > 70 ? "success" : passRate >= 40 ? "warning" : "critical"}
            animateKey={animKey}
            delay={180}
          />
        </div>

        {/* Monitor + events */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Reveal delay={120}>
            <Card padding={20}>
              <SectionTitle
                right={
                  <button onClick={() => setActivePage("spc")} className="btn btn-secondary !h-[30px] !px-3 text-[13px]">
                    <Activity size={13} /> Open SPC Monitor
                  </button>
                }
              >
                Live Process Monitor{spcProcess ? ` · ${spcProcess}` : ""}
              </SectionTitle>

              {spcPoints.length >= 2 && spcAnalysis ? (
                <>
                  <SPCChart
                    data={spcPoints}
                    ucl={spcAnalysis.ucl}
                    cl={(spcAnalysis.ucl + spcAnalysis.lcl) / 2}
                    lcl={spcAnalysis.lcl}
                    drawKey={drawKey}
                  />
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {spcAnalysis.violations.length ? (
                      <span className="badge badge-critical">
                        {spcAnalysis.violations.length} violation{spcAnalysis.violations.length === 1 ? "" : "s"} detected
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        <CheckCircle2 size={11} /> In control
                      </span>
                    )}
                    <span className="badge badge-neutral">{spcPoints.length} measurements</span>
                  </div>

                  {spcAnalysis.ai_analysis ? (
                    <div
                      className="mt-4 rounded-r-md p-3.5"
                      style={{ borderLeft: "3px solid var(--accent-ai)", background: "var(--bg-primary)" }}
                    >
                      <button
                        onClick={() => setAiOpen((o) => !o)}
                        className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent p-0"
                      >
                        <Sparkles size={15} style={{ color: "var(--accent-ai)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Interpretation</span>
                        {spcAnalysis.violations.length > 0 && <span className="badge badge-critical">Urgent</span>}
                        <div className="flex-1" />
                        <ChevronRight
                          size={16}
                          style={{
                            color: "var(--text-muted)",
                            transform: aiOpen ? "rotate(90deg)" : "none",
                            transition: "transform 150ms ease-out",
                          }}
                        />
                      </button>
                      <div style={{ display: "grid", gridTemplateRows: aiOpen ? "1fr" : "0fr", transition: "grid-template-rows .25s var(--ease-out)" }}>
                        <div style={{ overflow: "hidden" }}>
                          <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {spcAnalysis.ai_analysis}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed text-center"
                  style={{ borderColor: "var(--border-strong)", background: "var(--bg-primary)" }}
                >
                  <Activity size={22} style={{ color: "var(--text-ghost)" }} />
                  <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {spcProcess ? "Waiting for measurements" : "No process registered"}
                  </p>
                  <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
                    {spcProcess
                      ? `Submit at least two measurements for ${spcProcess} to render control limits.`
                      : "Register a process on the SPC Monitor to start live control charting."}
                  </p>
                  <button onClick={() => setActivePage("spc")} className="btn btn-primary mt-4">
                    {spcProcess ? "Submit Measurements" : "Add a Process"} <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal delay={180}>
            <Card padding={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="m-0 text-base font-semibold" style={{ color: "var(--text-primary)" }}>Live Events</h2>
                <StatusDot tone={wsConnected ? "success" : "critical"} pulse={wsConnected} />
              </div>
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 432 }}>
                {feed.length ? (
                  feed.map((e) => <EventRow key={e.id} e={e} />)
                ) : (
                  <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-ghost)" }}>
                    Events appear here as quality workflows run.
                  </div>
                )}
              </div>
              <div
                className="flex items-center gap-2 border-t px-5 py-3"
                style={{ borderColor: "var(--border-default)", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}
              >
                <StatusDot tone={wsConnected ? "success" : "critical"} size={6} pulse={wsConnected} />
                {wsConnected ? "WebSocket connected" : "WebSocket disconnected"}
              </div>
            </Card>
          </Reveal>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal delay={220}>
            <Card padding={20} style={{ height: "100%" }}>
              <SectionTitle
                right={
                  grrHistory.length ? (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--accent)",
                        background: "var(--accent-bg)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {grrHistory.length}
                    </span>
                  ) : undefined
                }
              >
                Recent GR&R Studies
              </SectionTitle>
              <div className="flex flex-col gap-2.5">
                {grrHistory.slice(0, 3).map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 pb-2.5"
                    style={{ borderBottom: i < Math.min(grrHistory.length, 3) - 1 ? "1px solid var(--border-default)" : "none" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
                        {item.grr_percent !== null ? `${item.grr_percent.toFixed(1)}%` : "—"} GR&R
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.operator_count} ops · {item.part_count} parts ·{" "}
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            color:
                              item.verdict === "fail"
                                ? "var(--critical)"
                                : item.verdict === "acceptable"
                                  ? "var(--warning)"
                                  : "var(--success)",
                          }}
                        >
                          {item.verdict === "pass" ? "acceptable" : item.verdict === "acceptable" ? "conditional" : "unacceptable"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {!grrHistory.length && (
                  <div className="py-6 text-center text-sm" style={{ color: "var(--text-ghost)" }}>
                    No studies yet.
                  </div>
                )}
              </div>
              <button
                onClick={() => setActivePage("grr")}
                className="mt-3 cursor-pointer border-none bg-transparent p-0 text-[13px]"
                style={{ color: "var(--accent)" }}
              >
                {grrHistory.length ? `View all ${grrHistory.length} →` : "Run your first study →"}
              </button>
            </Card>
          </Reveal>

          <Reveal delay={260}>
            <Card padding={20} style={{ height: "100%" }}>
              <SectionTitle>Alert Accuracy</SectionTitle>
              {accuracyRate !== null ? (
                <div className="flex flex-col items-center gap-3">
                  <DonutGauge value={accuracyRate} animateKey={animKey} />
                  <div className="flex items-center gap-1.5">
                    {accuracy?.target_met ? (
                      <>
                        <Check size={14} style={{ color: "var(--success)" }} />
                        <span className="text-[13px] font-semibold" style={{ color: "var(--success)" }}>Target Met (95%)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
                        <span className="text-[13px] font-semibold" style={{ color: "var(--warning)" }}>Below 95% target</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {accuracy?.feedback_count ?? 0} feedback entries
                  </span>
                </div>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No feedback recorded yet. Mark alerts Relevant or False Positive in the inbox to start tracking accuracy.
                  </p>
                  <button onClick={() => setActivePage("alerts")} className="btn btn-secondary mt-4">
                    Open Alert Inbox
                  </button>
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal delay={300}>
            <Card padding={20} style={{ height: "100%" }}>
              <SectionTitle
                right={
                  activeAlerts.length ? (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--critical-text)",
                        background: "var(--critical-fill)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {activeAlerts.length}
                    </span>
                  ) : undefined
                }
              >
                Active Alerts
              </SectionTitle>
              <div className="flex flex-col gap-2.5">
                {activeAlerts.slice(0, 3).map((alert, i) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-2.5 pb-2.5"
                    style={{ borderBottom: i < Math.min(activeAlerts.length, 3) - 1 ? "1px solid var(--border-default)" : "none" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]" style={{ color: "var(--text-primary)" }}>{alert.message}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: alert.severity === "critical" ? "var(--critical)" : undefined }}>{alert.severity}</span>
                        {" · "}{alert.process_name}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleResolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="btn btn-success !h-[30px] !px-3 text-xs"
                    >
                      {resolvingId === alert.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Resolve
                    </button>
                  </div>
                ))}
                {!activeAlerts.length && (
                  <div className="py-6 text-center text-sm" style={{ color: "var(--text-ghost)" }}>
                    <CheckCircle2 size={18} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                    All processes within control limits.
                  </div>
                )}
              </div>
              {activeAlerts.length > 0 && (
                <button
                  onClick={() => setActivePage("alerts")}
                  className="mt-3 cursor-pointer border-none bg-transparent p-0 text-[13px]"
                  style={{ color: "var(--accent)" }}
                >
                  View all {activeAlerts.length} →
                </button>
              )}
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
