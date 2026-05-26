import 'server-only';

import { notFound } from 'next/navigation';

const DEFAULT_DEV_API_URL = 'http://localhost:8000';

function getServerApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_DEV_API_URL;
  return raw.replace(/\/$/, '');
}

function getServerApiKey(): string {
  return process.env.NEXT_PUBLIC_API_KEY?.trim() || '';
}

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ServerApiError';
  }
}

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getServerApiBaseUrl()}${normalized}`;
}

/**
 * Server-only fetch for React Server Components.
 * Calls notFound() on 404 when notFoundOn404 is true (default).
 */
export async function serverGet<T>(
  path: string,
  options: { notFoundOn404?: boolean; timeout?: number } = {}
): Promise<T> {
  const { notFoundOn404 = true, timeout = 30000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(buildUrl(path), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(getServerApiKey() ? { 'X-API-Key': getServerApiKey() } : {}),
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404 && notFoundOn404) {
      notFound();
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        detail =
          typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
      } catch {
        detail = response.statusText || detail;
      }
      throw new ServerApiError(response.status, detail);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ServerApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ServerApiError(408, 'Request timeout');
    }
    throw error;
  }
}

/** Health check — does not trigger notFound on failure. */
export async function serverHealthCheck(): Promise<boolean> {
  try {
    await serverGet<{ status: string }>('/health', { notFoundOn404: false, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
