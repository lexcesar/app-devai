/**
 * Client-side authenticated API hook.
 *
 * Unlike lib/api/client.ts (which is server-only and uses @clerk/nextjs/server),
 * this hook is designed for Client Components. It uses Clerk's useAuth() hook
 * to get a fresh Bearer token on every call, ensuring all requests are
 * authenticated in production.
 *
 * Usage:
 *   const api = useClientApi();
 *   const data = await api.get<SomeType>('/v1/some-endpoint');
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { ACTING_AS_HEADER, DEV_USER_ID_HEADER } from '@obrafacil/shared';
import { isAuthBypassEnabled, BYPASS_USER_CLERK_ID } from '@/lib/auth-bypass-config';
import { getActingAs } from '@/lib/acting-as';

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
    : '';

export type ClientApiEnvelope<T> = { data: T };

async function buildAuthHeaders(getToken: () => Promise<string | null>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // In production, inject Clerk Bearer token.
  if (!isAuthBypassEnabled) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // In local dev bypass mode, inject the dev user id header.
  if (isAuthBypassEnabled) {
    headers[DEV_USER_ID_HEADER] = BYPASS_USER_CLERK_ID;
  }

  // Inject the current acting-as role from the cookie.
  const actingAs = getActingAs();
  if (actingAs) {
    headers[ACTING_AS_HEADER] = actingAs;
  }

  return headers;
}

async function clientRequest<T>(
  getToken: () => Promise<string | null>,
  path: string,
  options: RequestInit = {},
  skipActingAs = false,
): Promise<T> {
  const headers = await buildAuthHeaders(getToken);
  if (skipActingAs) delete headers[ACTING_AS_HEADER];

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as { error?: string };
    const error = new Error(err.error ?? `HTTP ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  const envelope = (await res.json()) as ClientApiEnvelope<T>;
  return envelope.data;
}

export interface ClientApi {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body: unknown, skipActingAs?: boolean) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
  patch: <T>(path: string, body: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
}

/**
 * Returns an authenticated API client for use in Client Components.
 *
 * When NEXT_PUBLIC_DISABLE_CLERK_AUTH=true (CI / local bypass), useAuth() is
 * NOT called — so the component tree does NOT need to be wrapped in
 * ClerkProvider. isAuthBypassEnabled is a compile-time constant derived from
 * an env var, making the branch stable across all renders (hook rules hold).
 */
export function useClientApi(): ClientApi {
  // isAuthBypassEnabled is a build-time constant — branch is always the same.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const getToken = isAuthBypassEnabled ? async () => null : useAuth().getToken;

  return {
    get: <T>(path: string) => clientRequest<T>(getToken, path),
    post: <T>(path: string, body: unknown, skipActingAs = false) =>
      clientRequest<T>(getToken, path, { method: 'POST', body: JSON.stringify(body) }, skipActingAs),
    put: <T>(path: string, body: unknown) =>
      clientRequest<T>(getToken, path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      clientRequest<T>(getToken, path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) =>
      clientRequest<T>(getToken, path, { method: 'DELETE' }),
  };
}
