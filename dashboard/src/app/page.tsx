"use client";

import { useAppStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import CommandBar from "@/components/layout/CommandBar";
import DashboardPage from "@/components/pages/DashboardPage";
import GRRPage from "@/components/pages/GRRPage";
import GagesPage from "@/components/pages/GagesPage";
import SPCPage from "@/components/pages/SPCPage";
import AlertsPage from "@/components/pages/AlertsPage";
import AlertRulesPage from "@/components/pages/AlertRulesPage";
import IntegrationsPage from "@/components/pages/IntegrationsPage";
import AuditPage from "@/components/pages/AuditPage";
import ChatPage from "@/components/pages/ChatPage";
import ReviewQueuePage from "@/components/pages/ReviewQueuePage";
import { CommandPalette, ToastViewport } from "@/components/ui/fx";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  grr: GRRPage,
  gages: GagesPage,
  review: ReviewQueuePage,
  spc: SPCPage,
  alerts: AlertsPage,
  "alert-rules": AlertRulesPage,
  integrations: IntegrationsPage,
  audit: AuditPage,
  chat: ChatPage,
};

export default function Home() {
  const { activePage, setActivePage, commandPaletteOpen, setCommandPaletteOpen, setPendingChatPrompt, setChatOpen } = useAppStore();
  const PageComponent = pages[activePage] || DashboardPage;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-root)" }}>
      {/* Ambient engineering-grid + aurora backdrop */}
      <div className="app-backdrop" aria-hidden />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 h-full">
        {/* Command Bar */}
        <CommandBar />

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Trust footer */}
        <footer
          className="glass flex h-9 shrink-0 items-center gap-2 border-t px-6 text-[11px] tracking-wide"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <Lock size={11} style={{ color: "var(--success)" }} />
          <span>All data encrypted in transit</span>
          <span className="opacity-40">·</span>
          <span>SOC 2 Type II</span>
          <span className="opacity-40">·</span>
          <span>Full audit trail</span>
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest opacity-60 sm:block">
            Arad Quality Intelligence · v0.1
          </span>
        </footer>
      </div>

      {/* Global FX layer */}
      <ToastViewport />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(page) => setActivePage(page)}
        onAsk={(question) => {
          if (!question) return;
          setPendingChatPrompt(question);
          setActivePage("chat");
          setChatOpen(true);
        }}
      />
    </div>
  );
}
