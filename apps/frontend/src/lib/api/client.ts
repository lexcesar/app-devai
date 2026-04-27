// HTTP API client — wraps fetch with Clerk Bearer token injection
// All backend calls go through this client. Never call the backend directly.

import { ACTING_AS_HEADER, DEV_USER_ID_HEADER } from '@obrafacil/shared';
import { auth } from '@/lib/auth-bypass';
import { BYPASS_USER_CLERK_ID, isAuthBypassEnabled } from '@/lib/auth-bypass-config';
import { getActingAs, ACTING_AS_COOKIE } from '@/lib/acting-as';

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

async function getAuthHeaders(actingAsOverride?: string): Promise<Record<string, string>> {
  const { getToken } = await auth();
  const token = await getToken();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  if (isAuthBypassEnabled) {
    headers[DEV_USER_ID_HEADER] = BYPASS_USER_CLERK_ID;
  }
  // Inject the acting-as role header.
  // actingAsOverride takes priority; then cookie; then nothing.
  let actingAs: string | null | undefined = actingAsOverride ?? null;
  if (!actingAs) {
    if (typeof window === 'undefined') {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        actingAs = cookieStore.get(ACTING_AS_COOKIE)?.value ?? null;
      } catch {
        // Outside a request context (e.g. static generation) — skip header
      }
    } else {
      actingAs = getActingAs();
    }
  }
  if (actingAs) {
    headers[ACTING_AS_HEADER] = actingAs;
  }
  return headers;
}

export type RequestOverrides = { actingAs?: string };

async function request<T>(
  path: string,
  options: RequestInit = {},
  overrides?: RequestOverrides,
): Promise<T> {
  const authHeaders = await getAuthHeaders(overrides?.actingAs);
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
  get: <T>(path: string, overrides?: RequestOverrides) => request<T>(path, {}, overrides),
  post: <T>(path: string, body: unknown, overrides?: RequestOverrides) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, overrides),
  put: <T>(path: string, body: unknown, overrides?: RequestOverrides) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, overrides),
  patch: <T>(path: string, body: unknown, overrides?: RequestOverrides) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, overrides),
  delete: <T>(path: string, overrides?: RequestOverrides) => request<T>(path, { method: 'DELETE' }, overrides),
};
