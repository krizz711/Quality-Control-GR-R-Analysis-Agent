"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  MessageSquare,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Wifi,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "grr", label: "GR&R Studies", icon: FlaskConical },
  { id: "spc", label: "SPC Monitor", icon: Activity },
  { id: "alerts", label: "Alert Inbox", icon: AlertTriangle, badge: 3 },
  { id: "chat", label: "AI Copilot", icon: MessageSquare },
];

const bottomItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help & Docs", icon: HelpCircle },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activePage, setActivePage } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
      className="relative flex flex-col h-full border-r z-20 shrink-0"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-dim))",
              boxShadow: "0 0 16px rgba(99,145,255,0.2)",
            }}
          >
            <Cpu size={16} color="white" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  Arad Quality
                </span>
                <span className="text-[10px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
                  Intelligence Platform
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* System Status */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-3 pb-1"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--accent-bg)", border: "1px solid rgba(99,145,255,0.08)" }}
            >
              <div className="live-dot" style={{ width: 6, height: 6 }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--accent-bright)" }}>
                All Systems Operational
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 pb-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-ghost)" }}>
                Navigation
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex items-center w-full rounded-lg transition-colors duration-150",
                sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
              )}
              style={{
                background: isActive ? "var(--accent-bg)" : "transparent",
                color: isActive ? "var(--accent-bright)" : "var(--text-secondary)",
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "var(--accent-bg)",
                    border: "1px solid rgba(99,145,255,0.1)",
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon size={18} className="relative z-10 shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 text-[13px] font-medium truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && !sidebarCollapsed && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-auto flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold"
                  style={{ background: "var(--critical)", color: "white" }}
                >
                  {item.badge}
                </motion.span>
              )}
              {item.badge && sidebarCollapsed && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ background: "var(--critical)" }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Active Agents */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pb-2"
          >
            <div className="px-3 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-ghost)" }}>
                Active Agents
              </span>
            </div>
            <div className="space-y-1 px-1">
              {[
                { name: "SPC Monitor", status: "running", icon: Wifi },
                { name: "Alert Engine", status: "running", icon: AlertTriangle },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="live-dot" style={{ width: 5, height: 5 }} />
                  <span className="text-[11px] truncate">{agent.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="px-2 py-2 border-t space-y-0.5" style={{ borderColor: "var(--border-subtle)" }}>
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex items-center w-full rounded-lg transition-colors duration-150",
              sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
            )}
            style={{ color: "var(--text-muted)" }}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon size={16} className="shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-[12px] truncate">{item.label}</span>
            )}
          </button>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex items-center justify-center w-6 h-6 rounded-full border z-30 transition-colors"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
