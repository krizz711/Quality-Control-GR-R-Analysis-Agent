"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Activity,
  Bell,
  BarChart3,
  ClipboardCheck,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  BookOpen,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useBackendHealth } from "@/lib/useBackendHealth";
import { resolveApiBaseUrl } from "@/api/apiClient";
import SettingsModal from "./SettingsModal";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "grr", label: "GR&R Studies", icon: BarChart3 },
  { id: "review", label: "Review Queue", icon: ClipboardCheck },
  { id: "alerts", label: "Alerts", icon: Bell, showBadge: true },
  { id: "spc", label: "SPC Monitor", icon: Activity },
  { id: "chat", label: "AI Assistant", icon: Sparkles },
  { id: "audit", label: "Audit Log", icon: Shield },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activePage, setActivePage, notificationCount } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const health = useBackendHealth();

  const healthLabel =
    health === "online" ? "Backend connected" : health === "offline" ? "Backend unreachable" : "Checking backend...";
  const healthColor =
    health === "online" ? "var(--success)" : health === "offline" ? "var(--critical)" : "var(--text-muted)";

  const openDocs = () => {
    window.open(`${resolveApiBaseUrl()}/docs`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-20 flex h-full shrink-0 flex-col border-r"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-default)",
        }}
      >
        {/* Wordmark */}
        <div className="flex h-16 items-center border-b px-[18px]" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arad-mark.svg" width={28} height={28} alt="Arad" className="block shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap text-base"
                >
                  <span className="font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Arad</span>
                  <span style={{ color: "var(--text-secondary)" }}> QI</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Backend health — checked live against /health/live */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-1 pt-3"
            >
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)" }}
              >
                <span className="status-dot" style={{ background: healthColor }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {healthLabel}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 pb-2"
              >
                <span className="section-label">Navigation</span>
              </motion.div>
            )}
          </AnimatePresence>

          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const badgeCount = item.showBadge ? notificationCount : 0;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn(
                  "relative flex h-[38px] w-full cursor-pointer items-center overflow-hidden rounded-md transition-colors duration-150",
                  sidebarCollapsed ? "justify-center px-2" : "gap-[11px] px-3"
                )}
                style={{
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                }}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="absolute bottom-2 top-2 w-[3px] rounded-full transition-transform duration-150"
                  style={{
                    left: 0,
                    background: "var(--accent)",
                    transformOrigin: "left center",
                    transform: isActive ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
                <item.icon size={18} className="shrink-0" />
                {!sidebarCollapsed && (
                  <span className={cn("truncate text-sm", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                )}
                {badgeCount > 0 && !sidebarCollapsed && (
                  <span
                    className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-semibold"
                    style={{ fontFamily: "var(--font-mono)", background: "var(--critical)", color: "#fff" }}
                  >
                    {badgeCount}
                  </span>
                )}
                {badgeCount > 0 && sidebarCollapsed && (
                  <span className="absolute right-2 top-1.5 h-[7px] w-[7px] rounded-full" style={{ background: "var(--critical)" }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="space-y-0.5 border-t px-2 py-2" style={{ borderColor: "var(--border-default)" }}>
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex w-full cursor-pointer items-center rounded-md transition-colors duration-150 hover:text-[var(--text-primary)]",
              sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
            )}
            style={{ color: "var(--text-muted)" }}
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <Settings size={16} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate text-[12px]">Settings</span>}
          </button>
          <button
            onClick={openDocs}
            className={cn(
              "flex w-full cursor-pointer items-center rounded-md transition-colors duration-150 hover:text-[var(--text-primary)]",
              sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
            )}
            style={{ color: "var(--text-muted)" }}
            title={sidebarCollapsed ? "API Documentation" : undefined}
          >
            <BookOpen size={16} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate text-[12px]">API Documentation</span>}
          </button>
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex h-[34px] w-full cursor-pointer items-center rounded-md border transition-colors duration-150 hover:text-[var(--text-primary)]",
              sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-3"
            )}
            style={{ borderColor: "var(--border-default)", color: "var(--text-muted)", background: "transparent" }}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} className="shrink-0" /> : <ChevronLeft size={16} className="shrink-0" />}
            {!sidebarCollapsed && <span className="truncate text-[13px]">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
