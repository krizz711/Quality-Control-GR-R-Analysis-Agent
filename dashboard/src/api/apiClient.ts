"use client";

import { useEffect, useState } from "react";
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

export interface BackendErrorResponse {
  error?: boolean;
  message?: string;
  code?: string;
  detail?: string;
}

export interface ApiError {
  message: string;
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

export interface SPCHistoryResponse {
  process_name: string;
  points: SPCHistoryItem[];
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

export interface AlertFeedbackInput {
  is_relevant: boolean;
  category?: "true_positive" | "false_positive" | "duplicate" | "late" | "missing_context";
  notes?: string;
  submitted_by?: string;
}

export interface AlertFeedbackResponse {
  feedback_id: string;
  alert_id: string;
  is_relevant: boolean;
  created_at: string;
}

export interface AlertAccuracyResponse {
  feedback_count: number;
  relevant_count: number;
  false_positive_count: number;
  accuracy_rate: number | null;
  target_rate: number;
  target_met: boolean | null;
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

export const API_BASE_URL_STORAGE_KEY = "arad-api-base-url";
export const API_KEY_STORAGE_KEY = "arad-api-key";

export const resolveApiBaseUrl = () => {
  // User override from Settings takes precedence over build-time env values.
  const storedUrl =
    typeof window !== "undefined" ? window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) : null;
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

  return storedUrl || viteUrl || nextUrl || "http://127.0.0.1:8000";
};

export const resolveApiKey = () => {
  const storedKey =
    typeof window !== "undefined" ? window.localStorage.getItem(API_KEY_STORAGE_KEY) : null;
  const envKey =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          process?: { env?: { NEXT_PUBLIC_API_KEY?: string } };
        }).process?.env?.NEXT_PUBLIC_API_KEY
      : undefined;

  return storedKey || envKey || "";
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
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

function showToast(message: string, type: "success" | "error" | "warning" | "info" = "info") {
  if (typeof window === "undefined") {
    console.error(message);
    return;
  }

  // Prefer the Arad toast system when mounted (ToastViewport registers this bridge).
  const aradToast = (window as unknown as {
    __aradToast?: (t: { type?: string; title: string }) => void;
  }).__aradToast;
  if (aradToast) {
    aradToast({ type, title: message });
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
  // Base URL and API key can be changed at runtime from Settings.
  config.baseURL = resolveApiBaseUrl();
  const apiKey = resolveApiKey();
  if (apiKey) {
    config.headers["X-API-Key"] = apiKey;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    showToast(getErrorMessage(error), "error");
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
  async getFile(path: string, timeout?: number): Promise<Blob> {
    const API_URL = resolveApiBaseUrl();
    const API_KEY = resolveApiKey();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "X-API-Key": API_KEY,
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw { message: `Failed to fetch ${path}`, detail: text } as ApiError;
      }
      return await response.blob();
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

// GR&R
export const submitGRRAnalysis = (data: GRRInput) =>
  apiClient.post<GRRAnalysisResponse>("/api/v1/grr/analyze", data);

export const getGRRHistory = () => apiClient.get<GRRHistoryItem[]>("/api/v1/grr/history");

// SPC
export const submitSPCData = (data: SPCInput) =>
  apiClient.post<SPCDataResponse>("/api/v1/spc/data", data);

export const getSPCHistory = (processName: string) =>
  apiClient.get<SPCHistoryResponse>(`/api/v1/spc/history/${encodeURIComponent(processName)}`);

// Dashboard
export const getDashboardSummary = () =>
  apiClient.get<DashboardSummaryResponse>("/api/v1/dashboard/summary");

// Alerts
export const getAlerts = (params?: AlertFilters) =>
  apiClient.get<AlertListResponse>("/api/v1/alerts", { params });

export const resolveAlert = (id: string | number) =>
  apiClient.put<AlertResolveResponse>(`/api/v1/alerts/${id}/resolve`);

export const recordAlertFeedback = (id: string | number, data: AlertFeedbackInput) =>
  apiClient.post<AlertFeedbackResponse>(`/api/v1/alerts/${id}/feedback`, data);

export const getAlertAccuracy = () =>
  apiClient.get<AlertAccuracyResponse>("/api/v1/alerts/accuracy");

// Audit Log
export const getAuditLog = () => apiClient.get<AuditLogItem[]>("/api/v1/audit-log");

// Review Queue
export interface ReviewQueueItem {
  id: string;
  study_id: string;
  status: string;
  assigned_to?: string | null;
  due_at?: string | null;
  created_at?: string | null;
  grr_pct?: number | null;
  ndc?: number | null;
  equipment_id: string;
  characteristic_name: string;
}

export interface ReviewDecisionInput {
  decision: "approved" | "rejected";
  notes?: string;
  decided_by: string;
}

export const getReviews = () => apiClient.get<ReviewQueueItem[]>("/api/v1/reviews");

export const decideReview = (reviewId: string, data: ReviewDecisionInput) =>
  apiClient.patch<Record<string, unknown>>(`/api/v1/reviews/${reviewId}`, data);

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
