"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  TerminalSquare,
  Bot
} from "lucide-react";
import { useAppStore } from "@/lib/store";

type LogEntry = {
  id: string;
  time: string;
  text: string;
  type: "info" | "success" | "warning" | "error";
};

export default function DashboardPage() {
  const { setNotificationCount } = useAppStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setLogs((prev) => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      time: timeString,
      text,
      type
    }]);
  };

  const simulateGRRWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLogs([]);
    
    addLog("Agent triggered: Automated GR&R Analysis Workflow", "info");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("Connecting to Quality Management System (QMS)...", "info");
    await new Promise(r => setTimeout(r, 1200));
    
    addLog("Downloaded recent CMM-001 measurement data (10 parts, 3 operators, 3 trials)", "success");
    await new Promise(r => setTimeout(r, 800));
    
    addLog("Executing AIAG Xbar-R statistical calculations...", "info");
    await new Promise(r => setTimeout(r, 1500));
    
    addLog("Calculation complete. Total GR&R Variation: 24.7%", "warning");
    addLog("Number of Distinct Categories (NDC): 4", "warning");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("Validating against compliance standards...", "info");
    await new Promise(r => setTimeout(r, 800));
    
    addLog("Decision: CONDITIONAL ACCEPTANCE. Equipment requires human review.", "warning");
    await new Promise(r => setTimeout(r, 1200));
    
    addLog("Agent Action: Saving audit trail to TimescaleDB...", "success");
    await new Promise(r => setTimeout(r, 800));
    
    addLog("Agent Action: Triggering Slack webhook to #quality-team for review.", "info");
    setNotificationCount(1);
    setIsExecuting(false);
  };

  const simulateSPCWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLogs([]);
    
    addLog("Agent triggered: Real-Time SPC Monitoring", "info");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("Establishing connection to Manufacturing Execution System (MES) data feed...", "info");
    await new Promise(r => setTimeout(r, 1200));
    
    addLog("Ingesting live telemetry for Part: 90210, Characteristic: Bore Diameter", "success");
    await new Promise(r => setTimeout(r, 800));
    
    addLog("Applying statistical process control algorithms (Xbar-R chart)...", "info");
    await new Promise(r => setTimeout(r, 1500));
    
    addLog("Scanning for trends, shifts, and Nelson Rule violations...", "info");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("ANOMALY DETECTED: Nelson Rule 1 Violation (Point outside 3-sigma control limits)", "error");
    addLog("Measured value: 12.045mm (UCL: 12.030mm)", "error");
    await new Promise(r => setTimeout(r, 1200));
    
    addLog("Agent Action: Predicting potential root cause (Tool wear on cutting insert)", "info");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("Agent Action: Generating critical Slack & SMS alerts to production line manager.", "info");
    setNotificationCount(2);
    setIsExecuting(false);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto" style={{ background: "var(--bg-root)" }}>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <Bot size={28} style={{ color: "var(--accent)" }} />
          Arad Quality Agent Console
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          This console demonstrates the autonomous capabilities of the Arad Quality Agent. Click a workflow to see how the agent collects data, runs statistical analysis, and generates proactive alerts.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={simulateGRRWorkflow}
          disabled={isExecuting}
          className="relative overflow-hidden rounded-xl p-6 text-left transition-all duration-200 border group"
          style={{ 
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            opacity: isExecuting ? 0.5 : 1
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1 text-white flex items-center gap-2">
                Automated GR&R Study <Play size={14} className="group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Agent fetches historical QMS data, executes AIAG math, validates compliance, and generates human-review alerts.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={simulateSPCWorkflow}
          disabled={isExecuting}
          className="relative overflow-hidden rounded-xl p-6 text-left transition-all duration-200 border group"
          style={{ 
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            opacity: isExecuting ? 0.5 : 1
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1 text-white flex items-center gap-2">
                Real-Time SPC Monitor <Play size={14} className="group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Agent connects to live data feeds, runs control chart algorithms, detects anomalies, and escalates.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Terminal / Log Window */}
      <div 
        className="flex-1 rounded-xl border overflow-hidden flex flex-col relative"
        style={{ 
          background: "#0c0c12", // darker terminal background
          borderColor: "var(--border-strong)",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
          <TerminalSquare size={16} style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
            agent_execution.log
          </span>
          {isExecuting && (
            <span className="ml-auto flex items-center gap-2 text-xs font-mono text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Agent running...
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50" style={{ color: "var(--text-ghost)" }}>
              <Server size={32} className="mb-3" />
              <p>Agent is idle.</p>
              <p>Select a workflow above to begin execution.</p>
            </div>
          ) : (
            <AnimatePresence>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <span className="shrink-0 opacity-50" style={{ color: "var(--text-ghost)" }}>
                    [{log.time}]
                  </span>
                  
                  {log.type === "info" && <span className="text-blue-400">➜</span>}
                  {log.type === "success" && <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />}
                  {log.type === "warning" && <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                  {log.type === "error" && <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />}
                  
                  <span 
                    className="leading-relaxed"
                    style={{ 
                      color: log.type === "error" ? "#f87171" : 
                             log.type === "warning" ? "#fbbf24" :
                             log.type === "success" ? "#34d399" : "var(--text-primary)" 
                    }}
                  >
                    {log.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

    </div>
  );
}
