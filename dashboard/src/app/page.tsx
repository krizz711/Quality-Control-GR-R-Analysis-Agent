"use client";

import { useAppStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import CommandBar from "@/components/layout/CommandBar";
import DashboardPage from "@/components/pages/DashboardPage";
import GRRPage from "@/components/pages/GRRPage";
import SPCPage from "@/components/pages/SPCPage";
import AlertsPage from "@/components/pages/AlertsPage";
import ChatPage from "@/components/pages/ChatPage";
import { motion, AnimatePresence } from "framer-motion";

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  grr: GRRPage,
  spc: SPCPage,
  alerts: AlertsPage,
  chat: ChatPage,
};

export default function Home() {
  const { activePage } = useAppStore();
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
      </div>
    </div>
  );
}
