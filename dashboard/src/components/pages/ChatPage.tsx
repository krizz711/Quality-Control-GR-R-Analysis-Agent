"use client";

/* AI Assistant — prototype-exact chat with system-context sidebar, wired to /api/v1/chat. */

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, BarChart3, ClipboardCheck, Sparkles, TriangleAlert } from "lucide-react";
import { apiClient, getAlerts, getGRRHistory, getReviews } from "@/api/apiClient";
import { useAppStore } from "@/lib/store";

const SUGGESTED = [
  "Which equipment had the worst GR&R this week?",
  "Show me trends this week",
  "Which equipment needs review?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function timeStamp(d: Date) {
  return d.toTimeString().slice(0, 8);
}

function MarkdownText({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*|\n)/g);
  return (
    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("- ") || part.match(/^\d+\. /)) {
          return (
            <span key={i} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "var(--accent-ai)", flex: "none" }}>▸</span>
              <span>{part.replace(/^- /, "")}</span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent-ai)", animation: `arad-typing 1.2s ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

function AIMessage({ content, typing, ts }: { content?: string; typing?: boolean; ts?: Date }) {
  return (
    <div style={{ display: "flex", gap: 12, maxWidth: "80%", animation: "arad-reveal-up-sm .3s var(--ease-out)" }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <Sparkles size={15} style={{ color: "var(--accent-ai)" }} />
      </div>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderLeft: "3px solid var(--accent-ai)",
          borderRadius: "0 var(--radius-lg) var(--radius-lg) var(--radius-lg)",
          padding: "14px 16px",
        }}
      >
        {typing ? (
          <TypingDots />
        ) : (
          <>
            <MarkdownText content={content || ""} />
            {ts && (
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{timeStamp(ts)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserMessage({ text, ts }: { text: string; ts: Date }) {
  return (
    <div style={{ alignSelf: "flex-end", maxWidth: "70%", animation: "arad-reveal-up-sm .25s var(--ease-out)" }}>
      <div
        style={{
          background: "linear-gradient(180deg, #1e3a8a, #1e40af)",
          border: "1px solid rgba(59,130,246,.4)",
          borderRadius: "var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)",
          padding: "12px 16px",
          fontFamily: "var(--font-sans)",
          fontSize: 13.5,
          color: "#fff",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
      <div style={{ textAlign: "right", marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
        {timeStamp(ts)}
      </div>
    </div>
  );
}

function ContextCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        background: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function SuggestChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: `1px solid ${hover ? "var(--accent-ai)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: hover ? "var(--text-primary)" : "var(--text-secondary)",
        transition: "all 150ms ease-out",
      }}
    >
      {label}
    </button>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [spin, setSpin] = useState(false);
  const [focus, setFocus] = useState(false);
  const [typingIn, setTypingIn] = useState(false);
  const [context, setContext] = useState<{ studies: number | string; violations: number | string; reviews: number | string }>({
    studies: "—",
    violations: "—",
    reviews: "—",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const typeTimer = useRef<number | null>(null);
  const { pendingChatPrompt, setPendingChatPrompt } = useAppStore();

  // System context — live counts from the backend.
  useEffect(() => {
    let cancelled = false;
    const loadContext = async () => {
      const [history, alerts, reviews] = await Promise.all([
        getGRRHistory().catch(() => null),
        getAlerts({ status: "active", limit: 100 }).catch(() => null),
        getReviews().catch(() => null),
      ]);
      if (cancelled) return;
      setContext({
        studies: history ? history.length : "—",
        violations: alerts ? alerts.items.length : "—",
        reviews: reviews ? reviews.length : "—",
      });
    };
    void loadContext();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (prompt: string) => {
      const userText = prompt.trim();
      if (!userText) return;

      setInput("");
      setSpin(true);
      setTimeout(() => setSpin(false), 450);

      const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: "user", content: userText, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const data = await apiClient.post<{ answer: string; context_used: string[] }>("/api/v1/chat", {
          question: userText,
          conversation_history: history,
        });
        setMessages((prev) => [
          ...prev,
          { id: `msg-${Date.now() + 1}`, role: "assistant", content: data.answer || "I received an empty response.", timestamp: new Date() },
        ]);
      } catch (err) {
        console.error("Chat API Error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content: "**Connection error.** I could not reach the Arad Agent backend. Verify the API is running and check Settings (sidebar).",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [messages]
  );

  /* chip-to-input auto-typing, then send */
  const typeInto = useCallback(
    (text: string) => {
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
      setTypingIn(true);
      setInput("");
      let i = 0;
      const tick = () => {
        i++;
        setInput(text.slice(0, i));
        if (i < text.length) {
          typeTimer.current = window.setTimeout(tick, 22);
        } else {
          setTypingIn(false);
          typeTimer.current = window.setTimeout(() => void sendMessage(text), 280);
        }
      };
      typeTimer.current = window.setTimeout(tick, 120);
    },
    [sendMessage]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!pendingChatPrompt) return;
    const timer = window.setTimeout(() => {
      typeInto(pendingChatPrompt);
      setPendingChatPrompt("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingChatPrompt, typeInto, setPendingChatPrompt]);

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, background: "var(--bg-root)" }}>
      {/* System context sidebar */}
      <div
        className="hidden md:flex"
        style={{
          width: 280,
          flex: "none",
          borderRight: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          padding: 20,
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
        }}
      >
        <div className="section-label">System Context</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ContextCard icon={<BarChart3 size={16} />} label="GR&R Studies" value={context.studies} />
          <ContextCard icon={<TriangleAlert size={16} />} label="Open Alerts" value={context.violations} />
          <ContextCard icon={<ClipboardCheck size={16} />} label="Pending Reviews" value={context.reviews} />
        </div>
        <div className="section-label" style={{ marginTop: 4 }}>Suggested</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUGGESTED.map((q) => (
            <SuggestChip key={q} label={q} onClick={() => typeInto(q)} />
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.length === 0 && !isTyping && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--accent-ai-bg)",
                  border: "1px solid rgba(99,102,241,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Sparkles size={24} style={{ color: "var(--accent-ai)" }} />
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>AI Assistant</div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", maxWidth: 380, marginTop: 8, lineHeight: 1.6 }}>
                Ask about GR&R studies, SPC violations, quality trends, or request analysis. Answers are grounded in your live quality data.
              </p>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} text={m.content} ts={m.timestamp} />
            ) : (
              <AIMessage key={m.id} content={m.content} ts={m.timestamp} />
            )
          )}
          {isTyping && <AIMessage typing />}
        </div>

        {/* Composer */}
        <div style={{ borderTop: "1px solid var(--border-default)", padding: "16px 32px 12px", background: "var(--bg-surface)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div
              style={{
                flex: 1,
                position: "relative",
                borderRadius: "var(--radius-md)",
                boxShadow: focus ? "var(--ring-focus)" : "0 0 0 0 transparent",
                transition: "box-shadow .2s var(--ease-out)",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
                placeholder={typingIn ? "" : "Ask about quality data…"}
                rows={1}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                style={{
                  width: "100%",
                  resize: "none",
                  padding: "12px 14px",
                  background: "var(--bg-primary)",
                  border: `1px solid ${focus ? "var(--accent)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13.5,
                  outline: "none",
                  maxHeight: 120,
                  boxSizing: "border-box",
                  transition: "border-color .2s",
                }}
                aria-label="Chat message"
              />
            </div>
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim()}
              style={{
                width: 44,
                height: 44,
                flex: "none",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                background: "linear-gradient(180deg,#3b82f6,#2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: input.trim() ? 1 : 0.7,
                transition: "opacity .2s",
              }}
              aria-label="Send message"
            >
              <ArrowUp
                size={18}
                color="#fff"
                style={{ transform: spin ? "rotate(360deg)" : "none", transition: spin ? "transform .45s var(--ease-out)" : "transform .15s var(--ease-out)" }}
              />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, justifyContent: "center" }}>
            <Sparkles size={11} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)" }}>
              Powered by Gemini · responses may be inexact
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
