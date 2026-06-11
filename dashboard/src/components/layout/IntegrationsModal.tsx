"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Server, Database, MessageSquare, Activity, X, ArrowRight, CheckCircle2 } from "lucide-react";

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>System Integrations Architecture</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>How the Frontend Dashboard connects to the Agent Backend</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-3 relative">
                  
                  {/* Backend / FastAPI */}
                  <div className="relative rounded-xl border p-5" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                      <Server size={20} />
                    </div>
                    <h3 className="mb-2 font-bold text-white">FastAPI Backend Agent</h3>
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      The core intelligence engine. Receives telemetry via Kafka, processes GR&R/SPC algorithms, and stores state in TimescaleDB.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <CheckCircle2 size={12} className="text-emerald-500" /> API Authentication via x-api-key
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <CheckCircle2 size={12} className="text-emerald-500" /> Automated Nelson Rule detection
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrows (Desktop) */}
                  <div className="hidden md:flex absolute top-[40%] left-[30%] right-[30%] justify-between px-8 z-10 pointer-events-none">
                    <ArrowRight className="text-blue-500/50" size={24} />
                    <ArrowRight className="text-blue-500/50" size={24} />
                  </div>

                  {/* Message Bus */}
                  <div className="relative rounded-xl border p-5" style={{ borderColor: "var(--border-accent)", background: "rgba(99, 145, 255, 0.03)" }}>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <Database size={20} />
                    </div>
                    <h3 className="mb-2 font-bold text-white">Data Synchronization</h3>
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      This Next.js UI fetches Live Data from the FastAPI Agent endpoints (`/spc/analyze`, `/grr/analyze`) using TanStack Query.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <CheckCircle2 size={12} className="text-blue-400" /> Real-time state syncing
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <CheckCircle2 size={12} className="text-blue-400" /> AI Analyst prompt routing
                      </div>
                    </div>
                  </div>

                  {/* External Systems */}
                  <div className="relative space-y-4">
                    {/* Slack */}
                    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                          <MessageSquare size={16} />
                        </div>
                        <h4 className="font-bold text-sm text-white">Slack Alerts</h4>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Critical SPC rule violations trigger webhooks that instantly push Alert Cards with AI Root Cause to the #quality-control channel.
                      </p>
                    </div>

                    {/* Grafana */}
                    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                          <Activity size={16} />
                        </div>
                        <h4 className="font-bold text-sm text-white">Grafana Metrics</h4>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        TimescaleDB exposes Prometheus metrics. Engineers can build deep-dive macro dashboards extending the Agent's insights.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 flex justify-end gap-3 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <button
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                  >
                    Close
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Understood
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
