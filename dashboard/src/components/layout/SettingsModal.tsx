"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, Globe, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  API_BASE_URL_STORAGE_KEY,
  API_KEY_STORAGE_KEY,
  resolveApiBaseUrl,
  resolveApiKey,
  showToast,
} from "@/api/apiClient";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionState = "idle" | "checking" | "ok" | "failed";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("idle");

  useEffect(() => {
    if (isOpen) {
      setBaseUrl(resolveApiBaseUrl());
      setApiKey(resolveApiKey());
      setConnection("idle");
    }
  }, [isOpen]);

  const testConnection = async () => {
    setConnection("checking");
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health/live`, {
        signal: AbortSignal.timeout(5000),
      });
      setConnection(response.ok ? "ok" : "failed");
    } catch {
      setConnection("failed");
    }
  };

  const save = () => {
    const trimmedUrl = baseUrl.trim().replace(/\/$/, "");
    if (!trimmedUrl) {
      showToast("API base URL cannot be empty.");
      return;
    }

    window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, trimmedUrl);
    if (apiKey.trim()) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }

    showToast("Settings saved. New requests use the updated connection.");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.65)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Connection Settings
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  Backend endpoint and API credentials for this workstation
                </p>
              </div>
              <button onClick={onClose} className="btn-icon" aria-label="Close settings">
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  <Globe size={13} /> API Base URL
                </span>
                <input
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setConnection("idle");
                  }}
                  className="input-field"
                  placeholder="http://127.0.0.1:8000"
                  spellCheck={false}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  <KeyRound size={13} /> API Key
                </span>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-field"
                  placeholder="Sent as X-API-Key on every request"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="mt-1.5 block text-[11px]" style={{ color: "var(--text-ghost)" }}>
                  Stored locally in this browser only. Required for protected endpoints in production.
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button onClick={() => void testConnection()} className="btn btn-secondary" disabled={connection === "checking"}>
                  {connection === "checking" ? <Loader2 size={14} className="animate-spin" /> : null}
                  Test Connection
                </button>
                {connection === "ok" && (
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--success)" }}>
                    <CheckCircle2 size={14} /> Backend reachable
                  </span>
                )}
                {connection === "failed" && (
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--critical)" }}>
                    <AlertTriangle size={14} /> Backend unreachable
                  </span>
                )}
              </div>
            </div>

            <div
              className="flex justify-end gap-2 border-t px-5 py-4"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)" }}
            >
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={save} className="btn btn-primary">
                Save Settings
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
