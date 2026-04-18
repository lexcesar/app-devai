// HTTP API client — wraps fetch with Clerk Bearer token injection
// All backend calls go through this client. Never call the backend directly.

import { DEV_USER_ID_HEADER } from '@obrafacil/shared';
import { auth } from '@/lib/auth-bypass';
import { BYPASS_USER_CLERK_ID, isAuthBypassEnabled } from '@/lib/auth-bypass-config';

// Server-side uses INTERNAL_API_URL (Docker service name); browser uses NEXT_PUBLIC_API_URL (baked at build)
const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api');

export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  error: string;
  code?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { getToken } = await auth();
  const token = await getToken();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  if (isAuthBypassEnabled) {
    headers[DEV_USER_ID_HEADER] = BYPASS_USER_CLERK_ID;
  }
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const url = `${API_URL}${path}`;

  // Auth headers are applied AFTER caller-supplied options.headers so a caller
  // cannot override Authorization or X-Dev-User-Id by accident or by design.
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
      ...authHeaders,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: 'Erro desconhecido' }))) as ApiError;
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
