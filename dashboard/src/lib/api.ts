/**
 * API Client Wrapper — Centralized requests to backend with auth & error handling
 */

const API_URL =
  typeof window === 'undefined'
    ? process.env.API_URL || 'http://localhost:8000'
    : '/api/backend';
const API_KEY = typeof window === 'undefined' ? process.env.API_AUTH_KEY || '' : '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    message?: string
  ) {
    super(message || detail);
    this.name = 'ApiError';
  }
}

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
}

async function apiCall<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...(fetchOptions.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch {
        // Fallback to status text if response isn't JSON
        detail = response.statusText || detail;
      }
      throw new ApiError(response.status, detail);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(0, 'Network error — backend may be unavailable');
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }

    throw error;
  }
}

export async function get<T>(path: string, timeout?: number): Promise<T> {
  return apiCall<T>(path, { method: 'GET', timeout });
}

export async function post<T>(
  path: string,
  body?: Record<string, unknown>,
  timeout?: number
): Promise<T> {
  return apiCall<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    timeout,
  });
}

export async function patch<T>(
  path: string,
  body?: Record<string, unknown>,
  timeout?: number
): Promise<T> {
  return apiCall<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    timeout,
  });
}

export async function getFile(path: string, timeout?: number): Promise<Blob> {
  const { timeout: _, ...options } = { timeout };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return await response.blob();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const api = {
  get,
  post,
  patch,
  getFile,
};
