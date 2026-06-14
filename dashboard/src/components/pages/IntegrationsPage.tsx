"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plug,
  MessageSquare,
  Mail,
  Smartphone,
  Ticket,
  Database,
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { getSettings, updateSettings, testIntegration, showToast } from "@/api/apiClient";

type Field = { key: string; label: string; secret?: boolean; placeholder?: string; type?: string };
type Group = {
  id: string;
  title: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  fields: Field[];
};

const GROUPS: Group[] = [
  {
    id: "slack",
    title: "Slack",
    detail: "Incoming webhook for quality alerts",
    icon: MessageSquare,
    fields: [{ key: "slack.webhook_url", label: "Webhook URL", secret: true, placeholder: "https://hooks.slack.com/services/…" }],
  },
  {
    id: "email",
    title: "Email (SMTP)",
    detail: "Outbound mail for alert escalation",
    icon: Mail,
    fields: [
      { key: "email.smtp_host", label: "SMTP host", placeholder: "smtp.gmail.com" },
      { key: "email.smtp_port", label: "Port", placeholder: "587", type: "number" },
      { key: "email.smtp_user", label: "Username", placeholder: "alerts@company.com" },
      { key: "email.smtp_password", label: "Password", secret: true },
      { key: "email.from_address", label: "From address", placeholder: "quality@company.com" },
      { key: "email.recipients", label: "Recipients (comma-separated)", placeholder: "qa-lead@company.com, supervisor@company.com" },
    ],
  },
  {
    id: "sms",
    title: "SMS (Twilio)",
    detail: "Critical-only escalation by text",
    icon: Smartphone,
    fields: [
      { key: "sms.webhook_url", label: "Twilio API URL", placeholder: "https://api.twilio.com/2010-04-01/Accounts/…/Messages.json" },
      { key: "sms.auth_token", label: "Auth token", secret: true },
      { key: "sms.from_number", label: "From number", placeholder: "+15550000000" },
      { key: "sms.to_numbers", label: "To numbers (comma-separated)", placeholder: "+15551111111, +15552222222" },
    ],
  },
  {
    id: "jira",
    title: "JIRA",
    detail: "Auto-create tickets on GR&R failures / persistent violations",
    icon: Ticket,
    fields: [
      { key: "jira.url", label: "Base URL", placeholder: "https://company.atlassian.net" },
      { key: "jira.email", label: "Account email", placeholder: "automation@company.com" },
      { key: "jira.api_token", label: "API token", secret: true },
      { key: "jira.project_key", label: "Project key", placeholder: "QUAL" },
    ],
  },
  {
    id: "qms",
    title: "QMS",
    detail: "Push quality events to your QMS",
    icon: Database,
    fields: [{ key: "qms.api_url", label: "QMS API URL", placeholder: "https://qms.company.com/api/events" }],
  },
  {
    id: "llm",
    title: "AI Analysis (Gemini)",
    detail: "Generates the narrative on GR&R results & alerts",
    icon: Sparkles,
    fields: [{ key: "llm.gemini_api_key", label: "Gemini API key", secret: true, placeholder: "AIza…" }],
  },
];

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [tested, setTested] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      const f: Record<string, string> = {};
      const c: Record<string, boolean> = {};
      for (const s of res.settings) {
        c[s.key] = s.configured;
        f[s.key] = s.secret ? "" : s.value ?? "";
      }
      setForm(f);
      setConfigured(c);
    } catch {
      showToast("Could not load settings — is the backend reachable?", "info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const save = async () => {
    // Non-secret values are always sent; secrets only when the user typed one.
    const payload: Record<string, string> = {};
    for (const g of GROUPS) {
      for (const fld of g.fields) {
        const v = form[fld.key] ?? "";
        if (fld.secret) {
          if (v.trim()) payload[fld.key] = v;
        } else {
          payload[fld.key] = v;
        }
      }
    }
    setSaving(true);
    try {
      const res = await updateSettings(payload);
      const c: Record<string, boolean> = {};
      for (const s of res.settings) c[s.key] = s.configured;
      setConfigured(c);
      // Clear typed secrets now that they're stored.
      setForm((p) => {
        const n = { ...p };
        for (const g of GROUPS) for (const fld of g.fields) if (fld.secret) n[fld.key] = "";
        return n;
      });
      showToast("Integration settings saved.", "success");
    } catch {
      showToast("Save failed — check your connection and permissions.", "info");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (groupId: string) => {
    setTesting(groupId);
    try {
      const res = await testIntegration(groupId);
      setTested((p) => ({ ...p, [groupId]: res }));
    } catch {
      setTested((p) => ({ ...p, [groupId]: { ok: false, message: "Test request failed." } }));
    } finally {
      setTesting(null);
    }
  };

  const groupConfigured = (g: Group) => g.fields.some((f) => configured[f.key]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-6" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="surface-card edge-glow px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  borderColor: "var(--accent-bg-strong)",
                  background: "var(--accent-bg)",
                  color: "var(--accent-bright)",
                  boxShadow: "0 0 24px -6px rgba(78,140,255,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <Plug size={20} />
              </div>
              <div>
                <h1 className="page-title md:text-[26px]">Integrations Setup</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Connect your own Slack, email, SMS, JIRA, QMS, and AI keys. Saved encrypted on your server.
                </p>
              </div>
            </div>
            <button onClick={() => void save()} disabled={saving || loading} className="btn btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 panel-inset px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <ShieldCheck size={14} style={{ color: "var(--success)" }} />
            Secrets are encrypted at rest and never shown again after saving. Changes take effect immediately.
          </div>
        </header>

        {loading ? (
          <div className="surface-card flex items-center justify-center gap-2 p-10 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={18} className="animate-spin" /> Loading configuration…
          </div>
        ) : (
          <div className="grid gap-4">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              const isConfigured = groupConfigured(g);
              const result = tested[g.id];
              return (
                <motion.section key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg border"
                        style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)", color: isConfigured ? "var(--accent-bright)" : "var(--text-muted)" }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{g.title}</h2>
                          <span className={`badge ${isConfigured ? "badge-success" : "badge-info"} h-5 px-1.5 text-[9.5px]`}>
                            {isConfigured ? "Configured" : "Not set"}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{g.detail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {result && (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs"
                          style={{ color: result.ok ? "var(--success-text)" : "var(--critical-text)" }}
                        >
                          {result.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {result.message}
                        </span>
                      )}
                      <button onClick={() => void runTest(g.id)} disabled={testing === g.id} className="btn btn-secondary h-8 px-3 text-xs">
                        {testing === g.id ? <Loader2 size={13} className="animate-spin" /> : null} Test
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {g.fields.map((fld) => (
                      <label key={fld.key} className="block">
                        <span className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{fld.label}</span>
                        <input
                          value={form[fld.key] ?? ""}
                          onChange={(e) => setField(fld.key, e.target.value)}
                          type={fld.secret ? "password" : fld.type ?? "text"}
                          autoComplete="off"
                          spellCheck={false}
                          className="input-field"
                          placeholder={fld.secret && configured[fld.key] ? "•••••••• (configured — leave blank to keep)" : fld.placeholder ?? ""}
                        />
                      </label>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
