/**
 * Centralized API client.
 *
 * Every request goes through here so that three things are guaranteed:
 *  - cookies are sent (`withCredentials`), because auth is cookie-based;
 *  - the CSRF header required by the API is always present on mutations;
 *  - errors arrive as a single predictable shape for the UI to render.
 */
import axios from 'axios';

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) return '/api/v1';
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
}

const BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    // The API rejects cookie-authenticated mutations without this header
    // (see backend/src/middleware/csrf.js).
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/** One place to read the API's error envelope into something renderable. */
export class ApiError extends Error {
  constructor(message, { status, details, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 0;
    this.details = details ?? null;
    this.cause = cause;
  }

  /** Field-level messages, for wiring into form errors. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce((acc, d) => {
      if (d && d.field) acc[d.field] = d.message;
      return acc;
    }, {});
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isValidation() {
    return this.status === 422;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

let syncChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('foodkind_data_sync');
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'DATA_CHANGED') {
        window.dispatchEvent(new CustomEvent('foodkind:datachange', { detail: event.data }));
      }
    };
  }
} catch {
  // fallback for unsupported environments
}

export function broadcastDataChange(entity = 'all') {
  try {
    if (syncChannel) {
      syncChannel.postMessage({ type: 'DATA_CHANGED', entity, timestamp: Date.now() });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('foodkind:datachange', { detail: { entity, timestamp: Date.now() } }));
    }
  } catch {
    // ignore
  }
}

api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    if (method && method !== 'get') {
      broadcastDataChange();
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const isProxyError =
        status === 503 ||
        (status === 500 && typeof data === 'string' && (data.includes('ECONNREFUSED') || data.includes('proxy error')));
      const message =
        data?.error?.message ||
        data?.message ||
        (isProxyError
          ? 'Backend server is not reachable on port 5050. Please ensure the backend server is running.'
          : status === 429
            ? 'Too many requests. Please slow down and try again shortly.'
            : `Request failed (${status})`);
      throw new ApiError(message, { status, details: data?.error?.details ?? null });
    }
    if (error.code === 'ECONNABORTED') {
      throw new ApiError('The request timed out. Please try again.', { status: 0 });
    }
    throw new ApiError(
      'Cannot reach the Foodkind API. Check that the backend is running.',
      { status: 0 }
    );
  }
);

/** Unwrap the `{ success, data }` envelope the API returns. */
export function unwrap(response) {
  return response.data?.data;
}

/** Unwrap list responses, keeping pagination metadata. */
export function unwrapList(response) {
  const body = response.data || {};
  return {
    items: body.data ?? [],
    pagination: body.pagination ?? null,
    notice: body.notice ?? null,
    meta: body.meta ?? null,
  };
}

/** Build a query string, dropping empty values. */
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
