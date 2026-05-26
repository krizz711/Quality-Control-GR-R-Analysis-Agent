"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  User,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Lightbulb,
  ArrowRight,
  XCircle,
  Gauge,
} from "lucide-react";
import { exampleChat, type ChatMessage } from "@/lib/mock-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const suggestions = [
  "Which equipment had worst GR&R this week?",
  "Why is CMM-001 showing control violations?",
  "Show all critical alerts from the last 24 hours",
  "What is the current Cpk for bore diameter on P-2847?",
  "Recommend corrective actions for VMM-003",
  "Generate a shift summary for quality team",
];

function MetricWidget({ data }: { data: Record<string, unknown> }) {
  const grr = data.grr_pct as number;
  const verdict = data.verdict as string;
  const evPct = data.ev_pct as number;
  const avPct = data.av_pct as number;
  const ndc = data.ndc as number;

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${verdict === "unacceptable" ? "rgba(248,113,113,0.15)" : "var(--border-subtle)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          GR&R Result
        </span>
        <span
          className={`badge ${
            verdict === "acceptable" ? "badge-success" : verdict === "conditional" ? "badge-warning" : "badge-critical"
          }`}
        >
          {verdict === "acceptable" ? <CheckCircle2 size={9} /> : verdict === "conditional" ? <AlertTriangle size={9} /> : <XCircle size={9} />}
          {verdict}
        </span>
      </div>
      <div className="flex items-end gap-3 mb-3">
        <span
          className="text-3xl font-black"
          style={{
            color: verdict === "acceptable" ? "var(--success)" : verdict === "conditional" ? "var(--warning)" : "var(--critical)",
          }}
        >
          {grr}%
        </span>
        <span className="text-[11px] pb-1" style={{ color: "var(--text-muted)" }}>GR&R</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "EV %", value: `${evPct}%`, sub: "Repeatability" },
          { label: "AV %", value: `${avPct}%`, sub: "Reproducibility" },
          { label: "NDC", value: ndc.toString(), sub: ndc >= 5 ? "Adequate" : "Low" },
        ].map((m, i) => (
          <div key={i} className="rounded-lg p-2.5" style={{ background: "var(--bg-hover)" }}>
            <div className="text-[9px] font-medium uppercase" style={{ color: "var(--text-ghost)" }}>{m.label}</div>
            <div className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>{m.value}</div>
            <div className="text-[9px]" style={{ color: "var(--text-ghost)" }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarkdownText({ content }: { content: string }) {
  // Simple markdown-like rendering
  const parts = content.split(/(\*\*.*?\*\*|\n)/g);
  return (
    <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Handle list items
        if (part.startsWith("- ") || part.match(/^\d+\. /)) {
          return <span key={i} className="block ml-3">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(exampleChat);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Map previous messages to the format expected by the backend
      const history = messages
        .filter(m => m.id !== "welcome") // ignore fake welcome messages if any
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Call the FastAPI backend /chat endpoint
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "dev-key-123", // Using a dummy dev key or whatever is configured
        },
        body: JSON.stringify({
          question: userText,
          conversation_history: history
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.answer || "I received empty response from the AI.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat API Error:", err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `**Error:** Failed to connect to the Arad Agent backend. Make sure the FastAPI server is running on port 8000.\n\nDetails: ${err}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="h-full flex flex-col"
      style={{ background: "var(--bg-root)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-dim))",
              boxShadow: "0 0 20px rgba(99,145,255,0.2)",
            }}
          >
            <Sparkles size={17} color="white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
              AI Quality Copilot
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Powered by Gemini · Full system context aware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span className="text-[11px] font-medium" style={{ color: "var(--success)" }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Welcome state if no messages */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
              style={{
                background: "var(--accent-bg)",
                border: "1px solid rgba(99,145,255,0.15)",
              }}
            >
              <Sparkles size={28} style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Quality Intelligence Copilot
            </h2>
            <p className="text-[13px] max-w-md mb-6" style={{ color: "var(--text-muted)" }}>
              Ask questions about GR&R studies, SPC violations, quality trends, or request analysis.
              I have full context of your manufacturing quality data.
            </p>
          </motion.div>
        )}

        {/* Message list */}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-1"
                style={{
                  background: msg.role === "assistant"
                    ? "linear-gradient(135deg, var(--accent), var(--accent-dim))"
                    : "var(--bg-elevated)",
                  border: msg.role === "user" ? "1px solid var(--border-default)" : "none",
                }}
              >
                {msg.role === "assistant" ? (
                  <Sparkles size={14} color="white" />
                ) : (
                  <User size={14} style={{ color: "var(--text-muted)" }} />
                )}
              </div>

              {/* Content */}
              <div
                className={`rounded-xl px-4 py-3.5 max-w-[600px] ${
                  msg.role === "user" ? "ml-auto" : ""
                }`}
                style={{
                  background: msg.role === "user" ? "var(--accent-bg-strong)" : "var(--bg-surface)",
                  border: `1px solid ${
                    msg.role === "user" ? "rgba(99,145,255,0.15)" : "var(--border-subtle)"
                  }`,
                }}
              >
                <MarkdownText content={msg.content} />

                {/* Widgets */}
                {msg.widgets?.map((widget, i) => (
                  <div key={i}>
                    {widget.type === "metric" && <MetricWidget data={widget.data} />}
                  </div>
                ))}

                {/* Actions for assistant messages */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    <button
                      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                      style={{ color: "var(--text-ghost)" }}
                      title="Copy"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                      style={{ color: "var(--text-ghost)" }}
                      title="Helpful"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                      style={{ color: "var(--text-ghost)" }}
                      title="Not helpful"
                    >
                      <ThumbsDown size={13} />
                    </button>
                    <button
                      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                      style={{ color: "var(--text-ghost)" }}
                      title="Regenerate"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-dim))",
                }}
              >
                <Sparkles size={14} color="white" />
              </div>
              <div
                className="rounded-xl px-4 py-3.5"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-6 pb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} style={{ color: "var(--text-ghost)" }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-ghost)" }}>
              Suggested Questions
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-5 pt-2 shrink-0">
        <div
          className="flex items-end gap-3 rounded-xl px-4 py-3 transition-all"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about quality metrics, GR&R studies, SPC violations..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] outline-none resize-none min-h-[24px] max-h-[120px]"
            style={{ color: "var(--text-primary)" }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0"
            style={{
              background: input.trim() ? "var(--accent)" : "var(--bg-elevated)",
              color: input.trim() ? "white" : "var(--text-ghost)",
              cursor: input.trim() ? "pointer" : "default",
            }}
          >
            <Send size={15} />
          </motion.button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: "var(--text-ghost)" }}>
          AI responses are based on live system data. Always verify critical decisions with raw measurements.
        </p>
      </div>
    </motion.div>
  );
}
