"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Radar,
  Server,
  ShieldAlert,
  Activity,
} from "lucide-react";
import {
  getAlerts,
  getAuditLog,
  getDashboardSummary,
  getGRRHistory,
  resolveAlert,
  showToast,
  type AlertItem,
  type AlertListResponse,
  type AuditLogItem,
  type DashboardSummaryResponse,
  type GRRHistoryItem,
} from "@/api/apiClient";
import { useRealtimeStream } from "@/api/realtime";

type DashboardPayload = {
  summary: DashboardSummaryResponse;
  grrHistory: GRRHistoryItem[];
  alerts: AlertListResponse;
  auditLog: AuditLogItem[];
};

const SEVERITY_ORDER: Record<AlertItem["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const VERDICT_LABELS: Record<GRRHistoryItem["verdict"], string> = {
  pass: "Excellent",
  acceptable: "Acceptable",
  fail: "Unacceptable",
};

const VERDICT_STYLES: Record<GRRHistoryItem["verdict"], string> = {
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  acceptable: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  fail: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTrend(current: number, previous: number) {
  if (!previous) {
    return { label: "New baseline", direction: "flat" as const };
  }

  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 1) {
    return { label: "Flat vs last week", direction: "flat" as const };
  }

  return {
    label: `${delta > 0 ? "+" : ""}${delta.toFixed(0)}% vs last week`,
    direction: delta > 0 ? ("up" as const) : ("down" as const),
  };
}

function getPassRateTone(passRate: number) {
  if (passRate > 70) {
    return "text-emerald-300 border-emerald-500/25 bg-emerald-500/10";
  }

  if (passRate >= 40) {
    return "text-amber-300 border-amber-500/25 bg-amber-500/10";
  }

  return "text-rose-300 border-rose-500/25 bg-rose-500/10";
}

function getSeverityTone(severity?: AlertItem["severity"]) {
  switch (severity) {
    case "critical":
      return "text-rose-300 bg-rose-500/10 border-rose-500/20";
    case "high":
      return "text-orange-300 bg-orange-500/10 border-orange-500/20";
    case "medium":
      return "text-amber-300 bg-amber-500/10 border-amber-500/20";
    default:
      return "text-sky-300 bg-sky-500/10 border-sky-500/20";
  }
}

function isWithinDays(timestamp: string, days: number, referenceTime: number) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return referenceTime - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-800/70 ${className}`} />;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadDashboard = useCallback(async () => {
    const hasExistingData = hasLoadedOnce;

    if (hasExistingData) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [summary, grrHistory, alerts, auditLog] = await Promise.all([
        getDashboardSummary(),
        getGRRHistory(),
        getAlerts({ status: "active", limit: 50 }),
        getAuditLog(),
      ]);

      const payload = { summary, grrHistory, alerts, auditLog };
        setData(payload);
        setHasLoadedOnce(true);
      setLastUpdated(new Date());
        setNow(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRealtimeStream({
    onEvent: (event) => {
      const eventType = String(event.type || "");
      if (["measurement.processed", "spc.analysis", "grr.analysis", "alert.created", "mes.event", "qms.event"].includes(eventType)) {
        void loadDashboard();
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

  const dashboard = data;
  const summary = dashboard?.summary;
  const grrHistory = dashboard?.grrHistory ?? [];
  const activeAlerts = [...(dashboard?.alerts.items ?? [])].sort(
    (left, right) => SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity]
  );
  const auditPreview = (dashboard?.auditLog ?? []).slice(0, 5);

  const totalThisWeek = grrHistory.filter((item) => isWithinDays(item.timestamp, 7, now)).length;
  const totalPrevWeek = grrHistory.filter((item) => {
    const age = now - new Date(item.timestamp).getTime();
    return age > 7 * 24 * 60 * 60 * 1000 && age <= 14 * 24 * 60 * 60 * 1000;
  }).length;
  const totalTrend = formatRelativeTrend(totalThisWeek, totalPrevWeek);

  const processesMonitored = useMemo(() => {
    const names = new Set<string>();

    for (const alert of activeAlerts) {
      if (alert.process_name) {
        names.add(alert.process_name);
      }
    }

    for (const entry of auditPreview) {
      if (entry.entity_type === "spc_process" && entry.entity_id) {
        names.add(entry.entity_id);
      }
    }

    return names.size;
  }, [activeAlerts, auditPreview]);

  const highestSeverity = activeAlerts[0]?.severity;
  const passRate = summary?.passing_rate ?? 0;
  const passRateTone = getPassRateTone(passRate);

  const showInitialLoading = loading && !dashboard;
  const hasInitialError = error && !dashboard;

  if (hasInitialError) {
    return (
      <div className="min-h-full bg-slate-900 px-6 py-8 text-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-3xl border border-rose-500/20 bg-slate-800/90 p-8 shadow-2xl shadow-black/30">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
              <AlertTriangle size={22} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Dashboard unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{error}</p>
            <button
              onClick={() => void loadDashboard()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-6 px-5 py-5 lg:px-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-800/95 px-6 py-5 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Radar size={22} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                    Quality Control AI Agent
                  </h1>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]" />
                    Backend connected
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                  Industrial quality operations dashboard with live GR&R, SPC, alerting, and audit visibility.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                <Clock3 size={13} /> Last updated
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {lastUpdated ? formatTimestamp(lastUpdated.toISOString()) : "Waiting for data"}
              </div>
              {refreshing ? <div className="mt-1 text-[11px] text-slate-500">Refreshing live data...</div> : null}
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <span>{error}</span>
              <button
                onClick={() => void loadDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total GR&R Analyses"
            value={summary?.total_grr_analyses ?? 0}
            icon={<Database size={18} />}
            tone="text-slate-100"
            accent="border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
            detail={totalTrend.label}
            trend={totalTrend.direction}
            loading={showInitialLoading}
          />
          <StatCard
            title="Current Pass Rate %"
            value={`${passRate.toFixed(1)}%`}
            icon={<CheckCircle2 size={18} />}
            tone={passRateTone.split(" ")[0]}
            accent={passRateTone}
            detail={passRate > 70 ? "Healthy process capability" : passRate >= 40 ? "Review recommended" : "Immediate attention"}
            loading={showInitialLoading}
          />
          <StatCard
            title="Active Alerts"
            value={summary?.active_alerts_count ?? 0}
            icon={<AlertTriangle size={18} />}
            tone="text-slate-100"
            accent={getSeverityTone(highestSeverity)}
            detail={highestSeverity ? `Highest severity: ${highestSeverity}` : "No active incidents"}
            loading={showInitialLoading}
          />
          <StatCard
            title="Processes Monitored"
            value={processesMonitored}
            icon={<Activity size={18} />}
            tone="text-slate-100"
            accent="border-slate-600 bg-slate-700/80 text-slate-300"
            detail="Monitored via alerts and audit trail"
            loading={showInitialLoading}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel title="Recent GR&R Results" icon={<Database size={16} />}>
            {showInitialLoading ? (
              <TableSkeleton rows={10} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
                  <thead className="bg-slate-800/80 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">GR&R %</th>
                      <th className="px-4 py-3 font-medium">Verdict</th>
                      <th className="px-4 py-3 font-medium">Operators</th>
                      <th className="px-4 py-3 font-medium">Parts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 bg-slate-900/40">
                    {grrHistory.slice(0, 10).map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-400">{formatTimestamp(item.timestamp)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">{item.grr_percent?.toFixed(1) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${VERDICT_STYLES[item.verdict]}`}>
                            {VERDICT_LABELS[item.verdict]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{item.operator_count}</td>
                        <td className="px-4 py-3 text-slate-300">{item.part_count}</td>
                      </tr>
                    ))}
                    {!grrHistory.length ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                          No GR&R analyses available.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Active Alerts" icon={<ShieldAlert size={16} />}>
            {showInitialLoading ? (
              <ListSkeleton rows={6} />
            ) : activeAlerts.length ? (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-600 hover:bg-slate-800/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSeverityTone(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            {alert.process_name}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{alert.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatTimestamp(alert.created_at)}</p>
                      </div>
                      <button
                        onClick={() => void handleResolveAlert(alert.id)}
                        disabled={resolvingId === alert.id}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resolvingId === alert.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CheckCircle2 size={18} />}
                title="No active alerts"
                description="All monitored processes are currently within control limits."
              />
            )}
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel title="SPC Chart" icon={<Radar size={16} />}>
            <div className="flex h-full min-h-[280px] flex-col rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">No process selected</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Add a monitored process to render live SPC charts and control-limit context.
                  </p>
                </div>
                <button
                  onClick={() => showToast("Process registration is not wired yet.")}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white"
                >
                  <Plus size={14} /> Add Process
                </button>
              </div>

              <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/60">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600 bg-slate-700/70 text-slate-400">
                    <Server size={24} />
                  </div>
                  <p className="mt-4 text-sm text-slate-300">SPC chart placeholder</p>
                  <p className="mt-1 text-xs text-slate-500">Awaiting process telemetry.</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Audit Log" icon={<FileText size={16} />}>
            {showInitialLoading ? (
              <ListSkeleton rows={5} />
            ) : auditPreview.length ? (
              <div className="space-y-3">
                {auditPreview.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{entry.action}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {entry.entity_type} · {entry.entity_id}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Actor: {entry.actor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText size={18} />}
                title="No audit entries"
                description="Audit logs will appear here after quality workflows run."
              />
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/90 p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/70 text-slate-300">
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
  tone,
  detail,
  trend,
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  tone: string;
  detail: string;
  trend?: "up" | "down" | "flat";
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/90 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">{title}</p>
          {loading ? (
            <SkeletonBlock className="mt-3 h-9 w-32" />
          ) : (
            <div className={`mt-3 text-3xl font-semibold tracking-tight ${tone}`}>{value}</div>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${accent}`}>{icon}</div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{detail}</span>
        {trend === "up" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <ArrowUpRight size={14} /> {detail === "New baseline" ? "" : "Up"}
          </span>
        ) : trend === "down" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
            <ArrowDownRight size={14} /> Down
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600 bg-slate-800 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700">
      <div className="grid grid-cols-5 gap-0 border-b border-slate-700 bg-slate-800/80 px-4 py-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-3 w-full" />
        ))}
      </div>
      <div className="divide-y divide-slate-700 bg-slate-900/40">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 px-4 py-4">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
