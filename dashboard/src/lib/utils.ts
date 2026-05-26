import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function timeAgo(date: Date): string {
  // Use a fixed reference time to prevent React hydration errors with mock data
  const now = new Date("2026-05-26T12:00:00Z");
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical": return "var(--critical)";
    case "warning": return "var(--warning)";
    case "success":
    case "pass": return "var(--success)";
    default: return "var(--text-muted)";
  }
}

export function grrVerdict(pct: number): { label: string; color: string; badge: string } {
  if (pct <= 10) return { label: "Acceptable", color: "var(--success)", badge: "badge-success" };
  if (pct <= 30) return { label: "Conditional", color: "var(--warning)", badge: "badge-warning" };
  return { label: "Unacceptable", color: "var(--critical)", badge: "badge-critical" };
}
