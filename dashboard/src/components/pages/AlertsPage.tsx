"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  Activity,
  TrendingUp,
  X,
  Info,
  Loader2
} from "lucide-react";
import { getAlerts, recordAlertFeedback, resolveAlert, showToast, type AlertItem } from "@/api/apiClient";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

function isToday(dateString: string | null | undefined) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function AlertIcon({ type }: { type: string }) {
  if (type === "grr_fail") return <AlertTriangle size={18} className="text-amber-500" />;
  if (type === "spc_violation") return <Activity size={18} className="text-rose-500" />;
  if (type === "trend_detected") return <TrendingUp size={18} className="text-sky-500" />;
  return <Info size={18} className="text-slate-500" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  };
  const color = colors[severity.toLowerCase()] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${color}`}>
      {severity}
    </span>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [search, setSearch] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const fetchAlerts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getAlerts({ limit: 100 });
      setAlerts(res.items);
    } catch (e) {
      console.error(e);
      if (!silent) showToast("Failed to fetch alerts");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Polling simulation every 15s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getAlerts({ limit: 100 });
        setAlerts(prev => {
          if (res.items.length > 0 && prev.length > 0) {
            const latestNew = res.items[0];
            const latestOld = prev[0];
            if (latestNew.id !== latestOld.id) {
              if (soundEnabled) {
                // Sound enabled - in a real app this would play an audio file
                // For this simulation we just show the toast
              }
              showToast(`New Alert: ${latestNew.message}`);
            }
          }
          return res.items;
        });
      } catch (e) {
        // ignore polling errors to prevent console spam
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resolveAlert(id);
      showToast("Alert resolved successfully");
      fetchAlerts(true);
      if (selectedAlert?.id === id) {
        setSelectedAlert(prev => prev ? { ...prev, status: "resolved", resolved_at: new Date().toISOString() } : null);
      }
    } catch (e) {
      // toast shown by interceptor
    }
  };

  const handleFeedback = async (alert: AlertItem, isRelevant: boolean) => {
    try {
      await recordAlertFeedback(alert.id, {
        is_relevant: isRelevant,
        category: isRelevant ? "true_positive" : "false_positive",
        submitted_by: "quality-engineer",
      });
      showToast(isRelevant ? "Alert marked relevant." : "Alert marked false positive.");
    } catch (e) {
      // toast shown by interceptor
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !a.process_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [alerts, statusFilter, severityFilter, search]);

  const stats = useMemo(() => {
    return {
      active: alerts.filter(a => a.status === "active").length,
      critical: alerts.filter(a => a.status === "active" && a.severity === "critical").length,
      resolvedToday: alerts.filter(a => a.status === "resolved" && isToday(a.resolved_at)).length,
    };
  }, [alerts]);

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        
        {/* Header & Stats Bar */}
        <header className="rounded-3xl border border-slate-800 bg-slate-900/95 px-6 py-5 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                    Alerts Management
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Monitor quality violations and system notifications.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2">
                <span className="text-xl font-bold text-amber-400">{stats.active}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Active</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2">
                <span className="text-xl font-bold text-rose-400">{stats.critical}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Critical</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2">
                <span className="text-xl font-bold text-emerald-400">{stats.resolvedToday}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Resolved Today</span>
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/95 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-700 bg-slate-950/50 p-1">
              {(["all", "active", "resolved"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-colors ${statusFilter === s ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex rounded-lg border border-slate-700 bg-slate-950/50 p-1">
              {(["all", "critical", "high", "medium", "low"] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-colors ${severityFilter === sev ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search alerts..."
                className="w-full sm:w-48 rounded-xl border border-slate-700 bg-slate-950/70 py-2 pl-9 pr-4 text-xs text-slate-100 outline-none focus:border-slate-500"
              />
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title={soundEnabled ? "Mute Notifications" : "Unmute Notifications"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Alert List */}
        <div className="grid gap-3">
          {loading && alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
              <Loader2 size={24} className="animate-spin mb-2" />
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
              No alerts found matching the current filters.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/80"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <AlertIcon type={alert.type} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-xs font-medium text-slate-400">
                        {alert.process_name}
                      </span>
                      {alert.status === "resolved" && (
                        <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed max-w-2xl">
                      {alert.message}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                      <Clock size={12} />
                      <span>{formatTimeAgo(alert.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                  {alert.status === "active" && (
                    <button
                      onClick={(e) => handleResolve(alert.id, e)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 size={14} /> Resolve
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                  >
                    <Info size={14} /> View Details
                  </button>
                  <button
                    onClick={() => void handleFeedback(alert, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                  >
                    Relevant
                  </button>
                  <button
                    onClick={() => void handleFeedback(alert, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    False Positive
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <AlertIcon type={selectedAlert.type} /> Alert Details
              </h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 space-y-6">
              <div className="flex gap-2">
                <SeverityBadge severity={selectedAlert.severity} />
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${selectedAlert.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  {selectedAlert.status}
                </span>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Process</div>
                <div className="text-base font-semibold text-slate-200">{selectedAlert.process_name}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Message</div>
                <div className="text-sm leading-relaxed text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  {selectedAlert.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Created</div>
                  <div className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-500" />
                    {new Date(selectedAlert.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedAlert.resolved_at && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Resolved</div>
                    <div className="text-sm text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {new Date(selectedAlert.resolved_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">
                  <Sparkles size={14} className="text-indigo-400" /> AI Analysis
                </div>
                <div className="text-sm leading-relaxed text-slate-300 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                  This alert was triggered by the automated monitoring system based on the severity and specific rules configured for <code className="text-indigo-300 bg-indigo-500/10 px-1 rounded">{selectedAlert.process_name}</code>. 
                  <br /><br />
                  <strong>Recommendation:</strong> Investigate the root cause immediately to ensure quality standards are met. If this is a recurring issue, consider adjusting the process control limits or retraining operators.
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 p-4 flex justify-end gap-3 bg-slate-900/50 rounded-b-3xl">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100"
              >
                Close
              </button>
              {selectedAlert.status === "active" && (
                <button
                  onClick={(e) => handleResolve(selectedAlert.id, e)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  <CheckCircle2 size={16} /> Resolve Alert
                </button>
              )}
              <button
                onClick={() => void handleFeedback(selectedAlert, true)}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
              >
                Relevant
              </button>
              <button
                onClick={() => void handleFeedback(selectedAlert, false)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                False Positive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
