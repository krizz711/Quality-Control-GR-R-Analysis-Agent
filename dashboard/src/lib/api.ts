/**
 * API client — centralized fetch wrapper for the FastAPI backend.
 *
 * Configure via environment:
 *   NEXT_PUBLIC_API_URL  — e.g. http://localhost:8000 (dev) or https://api.yourdomain.com (prod)
 *   NEXT_PUBLIC_API_KEY  — must match API_AUTH_KEY on the backend
 */

const DEFAULT_DEV_API_URL = 'http://localhost:8000';

/** Resolved API base URL (no trailing slash). */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_DEV_API_URL;
  return raw.replace(/\/$/, '');
}

export const API_URL = getApiBaseUrl();

const API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim() || '';

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

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

function isLikelyCorsOrNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

async function apiCall<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(buildUrl(path), {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
        ...(fetchOptions.headers || {}),
      },
    });

    clearTimeout(timeoutId);

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

    if (isLikelyCorsOrNetworkError(error)) {
      throw new ApiError(
        0,
        `Cannot reach API at ${API_URL}. Check that the backend is running, CORS_ORIGINS includes your Next.js origin (e.g. http://localhost:3000), and NEXT_PUBLIC_API_KEY matches API_AUTH_KEY.`
      );
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

  try {
    const response = await fetch(buildUrl(path), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return await response.blob();
  } catch (error) {
    clearTimeout(timeoutId);
    if (isLikelyCorsOrNetworkError(error)) {
      throw new ApiError(0, `Cannot reach API at ${API_URL} (CORS or network).`);
    }
    throw error;
  }
}

export const api = {
  get,
  post,
  patch,
  getFile,
  getBaseUrl: getApiBaseUrl,
};
