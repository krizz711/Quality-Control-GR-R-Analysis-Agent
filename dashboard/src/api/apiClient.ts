"use client";

import { useEffect, useState } from "react";
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { toast as sonnerToast } from "sonner";

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

export const resolveApiBaseUrl = () => {
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

  // Force production client to use local backend when not otherwise provided.
  // Prefer Vite (dev), Next public env (build), fallback to loopback API port.
  return viteUrl || nextUrl || "http://127.0.0.1:8000";
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

function showToast(message: string) {
  sonnerToast(message);
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
  async getFile(path: string, timeout?: number): Promise<Blob> {
    const API_URL =
      typeof window !== "undefined"
        ? (window as any).NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
        : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const API_KEY =
      typeof window !== "undefined"
        ? (window as any).NEXT_PUBLIC_API_KEY || ""
        : process.env.NEXT_PUBLIC_API_KEY || "";

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
