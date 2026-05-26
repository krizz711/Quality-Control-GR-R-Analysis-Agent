"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useQualityViolations } from "@/lib/queries";
import Sidebar from "@/components/layout/Sidebar";
import CommandBar from "@/components/layout/CommandBar";
import DashboardPage from "@/components/pages/DashboardPage";
import GRRPage from "@/components/pages/GRRPage";
import SPCPage from "@/components/pages/SPCPage";
import AlertsPage from "@/components/pages/AlertsPage";
import ChatPage from "@/components/pages/ChatPage";

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  grr: GRRPage,
  spc: SPCPage,
  alerts: AlertsPage,
  chat: ChatPage,
};

export default function AppShell() {
  const { activePage, setNotificationCount } = useAppStore();
  const PageComponent = pages[activePage] || DashboardPage;

  const { data: violations } = useQualityViolations({ limit: 200, onlyUnack: false });

  useEffect(() => {
    if (!violations) return;
    const openCount = violations.filter((v) => !v.acknowledged_by).length;
    setNotificationCount(openCount);
  }, [violations, setNotificationCount]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-root)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <CommandBar />
        <main className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
