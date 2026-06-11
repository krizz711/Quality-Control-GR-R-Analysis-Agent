"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Bell, Network, ChevronRight, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getDashboardSummary } from "@/api/apiClient";
import { useBackendHealth } from "@/lib/useBackendHealth";
import { useRealtimeStream } from "@/api/realtime";
import IntegrationsModal from "./IntegrationsModal";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  grr: "GR&R Studies",
  review: "Review Queue",
  spc: "SPC Monitor",
  alerts: "Alerts",
  audit: "Audit Log",
  chat: "AI Assistant",
};

export default function CommandBar() {
  const { activePage, notificationCount, setNotificationCount, setActivePage, setChatOpen, setPendingChatPrompt, setCommandPaletteOpen } = useAppStore();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const health = useBackendHealth();

  // Keep the alert badge honest: sync with the backend count.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const summary = await getDashboardSummary();
        if (!cancelled) {
          setNotificationCount(summary.active_alerts_count);
        }
      } catch {
        // Backend offline — leave the badge at its last known value.
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [setNotificationCount]);

  useRealtimeStream({
    onEvent: (event) => {
      if (String(event.type || "") === "alert.created") {
        void getDashboardSummary()
          .then((summary) => setNotificationCount(summary.active_alerts_count))
          .catch(() => undefined);
      }
    },
  });

  // Ctrl/Cmd+K opens the command palette (prototype behavior).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      setPendingChatPrompt(trimmedQuery);
      setActivePage("chat");
      setChatOpen(true);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <>
      <header
        className="z-10 flex h-16 shrink-0 items-center gap-4 border-b px-6"
        style={{
          background: "rgba(10, 11, 15, 0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderColor: "var(--border-default)",
        }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Arad</span>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {PAGE_LABELS[activePage] || "Dashboard"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Ask AI */}
        <form onSubmit={handleSubmit} className="w-[280px]">
          <div
            className="relative flex h-9 items-center transition-shadow"
            style={{
              background: "var(--bg-primary)",
              border: `1px solid ${focused ? "var(--accent)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)",
              boxShadow: focused ? "var(--ring-focus)" : "none",
            }}
          >
            {focused ? (
              <Sparkles size={15} className="ml-3 shrink-0" style={{ color: "var(--accent)" }} />
            ) : (
              <Search size={15} className="ml-3 shrink-0" style={{ color: "var(--text-muted)" }} />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask AI..."
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
              aria-label="Ask the AI copilot"
            />
            <kbd className="kbd mr-2 hidden sm:inline-flex">⌘K</kbd>
          </div>
        </form>

        {/* Connection state */}
        {health === "online" ? (
          <span className="hidden items-center gap-2 md:inline-flex">
            <span className="live-dot" />
            <span className="text-xs font-semibold" style={{ color: "var(--success-text)" }}>Live</span>
          </span>
        ) : health === "offline" ? (
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <TriangleAlert size={14} style={{ color: "var(--critical)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--critical-text)" }}>Offline</span>
          </span>
        ) : (
          <span className="hidden items-center gap-2 md:inline-flex">
            <span className="status-dot status-dot-warning" />
            <span className="text-xs font-semibold" style={{ color: "var(--warning-text)" }}>Connecting…</span>
          </span>
        )}

        <button
          onClick={() => setIsIntegrationsOpen(true)}
          className="btn btn-secondary cursor-pointer"
          title="System integrations and architecture"
        >
          <Network size={14} style={{ color: "var(--accent)" }} />
          <span className="hidden lg:inline">Integrations</span>
        </button>

        <button
          onClick={() => setActivePage("alerts")}
          className="btn-icon relative cursor-pointer"
          title={notificationCount > 0 ? `${notificationCount} active alerts` : "Alert inbox"}
          aria-label="Open alert inbox"
        >
          <Bell size={17} />
          {notificationCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[11px] font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--critical)",
                color: "#fff",
                border: "2px solid var(--bg-root)",
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>

        <div
          className="flex h-8 w-8 cursor-default items-center justify-center rounded-full text-[13px] font-semibold"
          style={{ background: "var(--gradient-ai)", color: "#fff" }}
          title="Quality Engineer — Arad Group"
        >
          QE
        </div>
      </header>

      <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} />
    </>
  );
}
