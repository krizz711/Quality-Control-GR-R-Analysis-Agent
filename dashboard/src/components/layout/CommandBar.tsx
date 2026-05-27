"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Bell, Shield, Command, Zap, Network } from "lucide-react";
import { useAppStore } from "@/lib/store";
import IntegrationsModal from "./IntegrationsModal";

export default function CommandBar() {
  const { notificationCount, setActivePage, setChatOpen, setPendingChatPrompt } = useAppStore();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      setPendingChatPrompt(trimmedQuery);
      setActivePage("chat");
      setChatOpen(true);
      setQuery("");
    }
  };

  return (
    <>
      <header
        className="flex items-center h-14 px-4 border-b shrink-0 z-10"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
          <motion.div
            className="relative flex items-center"
            animate={{
              boxShadow: focused
                ? "0 0 0 2px rgba(99,145,255,0.15), 0 0 20px rgba(99,145,255,0.06)"
                : "none",
            }}
            style={{
              background: focused ? "var(--bg-surface)" : "var(--bg-primary)",
              border: `1px solid ${focused ? "rgba(99,145,255,0.3)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)",
            }}
          >
            {focused ? (
              <Sparkles size={15} className="ml-3 shrink-0" style={{ color: "var(--accent)" }} />
            ) : (
              <Search size={15} className="ml-3 shrink-0" style={{ color: "var(--text-ghost)" }} />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? "Ask the AI copilot anything..." : "Search or ask AI..."}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <div className="flex items-center gap-1 mr-2">
              <kbd
                className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-ghost)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Command size={10} />K
              </kbd>
            </div>
          </motion.div>
        </form>

        <div className="flex items-center gap-1 ml-4">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg mr-2"
            style={{
              background: "rgba(52, 211, 153, 0.06)",
              border: "1px solid rgba(52, 211, 153, 0.1)",
            }}
          >
            <div className="live-dot" style={{ width: 6, height: 6 }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--success)" }}>
              Live
            </span>
            <Zap size={11} style={{ color: "var(--success)" }} />
          </div>

          <button
            onClick={() => setIsIntegrationsOpen(true)}
            className="flex items-center justify-center gap-2 px-3 h-9 rounded-lg transition-colors border"
            style={{
              color: "var(--text-primary)",
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
            title="System Integrations & Architecture"
          >
            <Network size={14} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium">Integrations</span>
          </button>

          <button
            onClick={() => setActivePage("dashboard")}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors ml-1"
            style={{ color: "var(--text-muted)" }}
            title="API Security"
          >
            <Shield size={17} />
          </button>

          <button
            onClick={() => {
              if (notificationCount > 0) {
                setPendingChatPrompt(`Show my ${notificationCount} newest notifications.`);
                setActivePage("chat");
                setChatOpen(true);
              }
            }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Notifications"
          >
            <Bell size={17} />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 rounded-full text-[9px] font-bold px-1"
                style={{
                  background: "var(--critical)",
                  color: "white",
                  boxShadow: "0 0 8px rgba(248,113,113,0.4)",
                }}
              >
                {notificationCount}
              </motion.span>
            )}
          </button>

          <div
            className="flex items-center gap-2 ml-2 pl-3 border-l"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, var(--accent-dim), var(--accent))",
                color: "white",
              }}
            >
              QE
            </div>
            <AnimatePresence>
              <div className="hidden lg:flex flex-col">
                <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Quality Engineer
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Arad Group
                </span>
              </div>
            </AnimatePresence>
          </div>
        </div>
      </header>

      <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} />
    </>
  );
}
