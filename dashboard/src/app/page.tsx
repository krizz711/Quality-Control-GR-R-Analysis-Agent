"use client";

import { useAppStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import CommandBar from "@/components/layout/CommandBar";
import DashboardPage from "@/components/pages/DashboardPage";
import GRRPage from "@/components/pages/GRRPage";
import SPCPage from "@/components/pages/SPCPage";
import AlertsPage from "@/components/pages/AlertsPage";
import AuditPage from "@/components/pages/AuditPage";
import ChatPage from "@/components/pages/ChatPage";
import ReviewQueuePage from "@/components/pages/ReviewQueuePage";
import { CommandPalette, ToastViewport } from "@/components/ui/fx";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  grr: GRRPage,
  review: ReviewQueuePage,
  spc: SPCPage,
  alerts: AlertsPage,
  audit: AuditPage,
  chat: ChatPage,
};

export default function Home() {
  const { activePage, setActivePage, commandPaletteOpen, setCommandPaletteOpen, setPendingChatPrompt, setChatOpen } = useAppStore();
  const PageComponent = pages[activePage] || DashboardPage;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-root)" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
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

        {/* Trust footer — exact design-system copy */}
        <footer
          className="flex h-9 shrink-0 items-center gap-2 border-t px-6 text-xs"
          style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
        >
          <Lock size={12} />
          <span>All data encrypted in transit</span>
          <span className="opacity-50">·</span>
          <span>SOC 2 Type II</span>
          <span className="opacity-50">·</span>
          <span>Full audit trail</span>
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
