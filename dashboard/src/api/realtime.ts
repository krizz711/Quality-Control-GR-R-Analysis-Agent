"use client";

import { useEffect, useRef } from "react";
import { resolveApiBaseUrl } from "@/api/apiClient";

export interface RealtimeEvent {
  type: string;
  timestamp?: string;
  process_name?: string;
  part_number?: string;
  characteristic_name?: string;
  equipment_id?: string;
  source_event_id?: string;
  [key: string]: unknown;
}

export interface UseRealtimeStreamOptions {
  path?: string;
  enabled?: boolean;
  heartbeatMs?: number;
  maxBackoffMs?: number;
  onEvent: (event: RealtimeEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

function buildWebSocketUrl(path: string) {
  const baseUrl = resolveApiBaseUrl();
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = path;
  return url.toString();
}

export function useRealtimeStream(options: UseRealtimeStreamOptions) {
  const onEventRef = useRef(options.onEvent);
  const onOpenRef = useRef(options.onOpen);
  const onCloseRef = useRef(options.onClose);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    onEventRef.current = options.onEvent;
    onOpenRef.current = options.onOpen;
    onCloseRef.current = options.onClose;
    onErrorRef.current = options.onError;
  }, [options.onEvent, options.onOpen, options.onClose, options.onError]);

  useEffect(() => {
    if (options.enabled === false || typeof window === "undefined") {
      return;
    }

    const path = options.path || "/api/v1/ws/measurements";
    const heartbeatMs = options.heartbeatMs ?? 25000;
    const maxBackoffMs = options.maxBackoffMs ?? 5000;
    const backoffBaseMs = 500;

    let socket: WebSocket | null = null;
    let heartbeatTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let cancelled = false;
    let backoffMs = backoffBaseMs;

    const clearTimers = () => {
      if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      reconnectTimer = window.setTimeout(() => {
        connect();
      }, backoffMs);
      backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
    };

    const connect = () => {
      if (cancelled) {
        return;
      }

      socket = new WebSocket(buildWebSocketUrl(path));
      socket.onopen = () => {
        backoffMs = backoffBaseMs;
        onOpenRef.current?.();
        clearTimers();
        heartbeatTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }));
          }
        }, heartbeatMs);
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as RealtimeEvent;
          onEventRef.current(payload);
        } catch {
          // Ignore malformed payloads.
        }
      };
      socket.onerror = (error) => {
        onErrorRef.current?.(error);
      };
      socket.onclose = () => {
        clearTimers();
        onCloseRef.current?.();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimers();
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      socket = null;
    };
  }, [options.enabled, options.heartbeatMs, options.maxBackoffMs, options.path]);
}
