"use client";

import { useEffect, useState } from "react";
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

export interface BackendErrorResponse {
  error?: boolean;
  message?: string;
  code?: string;
  detail?: string;
}

export interface GRRInputMeasurement {
  operator: string;
  part: number;
  trial: number;
  value: number;
}

export interface GRRInput {
  measurements: GRRInputMeasurement[];
  part_tolerance?: number;
}

export interface GRRAnalysisResponse {
  grr_percent: number;
  repeatability: number;
  reproducibility: number;
  number_of_distinct_categories: number;
  ai_analysis: string;
  timestamp: string;
}

export interface GRRHistoryItem {
  id: string;
  timestamp: string;
  grr_percent: number | null;
  verdict: "pass" | "acceptable" | "fail";
  operator_count: number;
  part_count: number;
}

export interface SPCInput {
  process_name: string;
  measurements: number[];
  ucl?: number;
  lcl?: number;
  target?: number;
}

export interface SPCViolation {
  rule: string;
  index: number;
  value: number;
  description: string;
}

export interface SPCDataResponse {
  mean: number;
  std_dev: number;
  ucl: number;
  lcl: number;
  violations: SPCViolation[];
  ai_analysis: string;
}

export interface SPCHistoryItem {
  timestamp: string;
  value: number;
  part_number?: string | null;
  characteristic_name?: string | null;
}

export interface DashboardSummaryResponse {
  total_grr_analyses: number;
  passing_rate: number;
  active_alerts_count: number;
  recent_violations: Array<Record<string, unknown>>;
  last_updated: string;
}

export interface AlertFilters {
  status?: "active" | "resolved";
  severity?: "critical" | "high" | "medium" | "low";
  limit?: number;
}

export interface AlertItem {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  process_name: string;
  status: "active" | "resolved" | "acknowledged";
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface AlertListResponse {
  items: AlertItem[];
  total: number;
  limit: number;
}

export interface AlertResolveResponse {
  alert_id: string;
  resolved_at: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
}

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_BASE_URL = (() => {
  const viteUrl =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
      : undefined;
  const nextUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          process?: { env?: { NEXT_PUBLIC_API_URL?: string } };
        }).process?.env?.NEXT_PUBLIC_API_URL
      : undefined;

  return viteUrl || nextUrl || "http://localhost:3001";
})();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<BackendErrorResponse>(error)) {
    const payload = error.response?.data;
    return payload?.message || payload?.detail || error.message || "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
}

function showToast(message: string) {
  if (typeof window === "undefined") {
    console.error(message);
    return;
  }

  const containerId = "api-client-toast-container";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.top = "16px";
    container.style.right = "16px";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  toast.style.minWidth = "280px";
  toast.style.maxWidth = "420px";
  toast.style.padding = "12px 14px";
  toast.style.borderRadius = "12px";
  toast.style.background = "rgba(15, 23, 42, 0.96)";
  toast.style.color = "#ffffff";
  toast.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.25)";
  toast.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  toast.style.fontSize = "13px";
  toast.style.lineHeight = "1.4";
  toast.style.pointerEvents = "auto";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(-8px)";
  toast.style.transition = "opacity 160ms ease, transform 160ms ease";

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    window.setTimeout(() => toast.remove(), 180);
  }, 3000);
}

export { showToast };

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers || {};
  config.headers["Content-Type"] = "application/json";
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    showToast(getErrorMessage(error));
    return Promise.reject(error);
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return axiosInstance.request<T, T>(config);
}

export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: "GET", url });
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: "POST", url, data });
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: "PUT", url, data });
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: "PATCH", url, data });
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: "DELETE", url });
  },
};

// GR&R
export const submitGRRAnalysis = (data: GRRInput) =>
  apiClient.post<GRRAnalysisResponse>("/api/grr/analyze", data);

export const getGRRHistory = () => apiClient.get<GRRHistoryItem[]>("/api/grr/history");

// SPC
export const submitSPCData = (data: SPCInput) =>
  apiClient.post<SPCDataResponse>("/api/spc/data", data);

export const getSPCHistory = (processName: string) =>
  apiClient.get<SPCHistoryItem[]>(`/api/spc/history/${encodeURIComponent(processName)}`);

// Dashboard
export const getDashboardSummary = () =>
  apiClient.get<DashboardSummaryResponse>("/api/dashboard/summary");

// Alerts
export const getAlerts = (params?: AlertFilters) =>
  apiClient.get<AlertListResponse>("/api/alerts", { params });

export const resolveAlert = (id: string | number) =>
  apiClient.put<AlertResolveResponse>(`/api/alerts/${id}/resolve`);

// Audit Log
export const getAuditLog = () => apiClient.get<AuditLogItem[]>("/api/audit-log");

export function useApi<T>(apiCall: () => Promise<T>, deps: unknown[] = []): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [apiCall, refreshIndex, ...deps]);

  return {
    data,
    loading,
    error,
    refetch: () => setRefreshIndex((value) => value + 1),
  };
}
