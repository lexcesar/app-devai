'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DEV_USER_ID_HEADER } from '@obrafacil/shared';
import {
  BYPASS_USER_CLERK_ID,
  isAuthBypassEnabled,
} from '@/lib/auth-bypass-config';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

type Action = 'start' | 'complete' | 'cancel';

async function callApi(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isAuthBypassEnabled) {
    headers[DEV_USER_ID_HEADER] = BYPASS_USER_CLERK_ID;
  }
  return fetch(`${API_URL}${path}`, { method: 'PATCH', headers });
}

export function WorkActions({
  workId,
  status,
}: {
  workId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handle(action: Extract<Action, 'start' | 'complete'>) {
    setError(null);
    const res = await callApi(`/v1/works/${workId}/${action}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-3 flex gap-2">
      {status === 'scheduled' && (
        <button
          onClick={() => void handle('start')}
          disabled={pending}
          className="text-xs font-bold text-white bg-trust px-3 py-2 rounded-lg active:scale-[0.98] disabled:opacity-50"
        >
          Iniciar obra
        </button>
      )}
      {status === 'active' && (
        <button
          onClick={() => void handle('complete')}
          disabled={pending}
          className="text-xs font-bold text-white bg-savings px-3 py-2 rounded-lg active:scale-[0.98] disabled:opacity-50"
        >
          Marcar como concluída
        </button>
      )}
      {error && <p className="text-[11px] text-error self-center">{error}</p>}
    </div>
  );
}

export function VisitActions({
  visitId,
  status,
}: {
  visitId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handle(action: 'complete' | 'cancel') {
    setError(null);
    const res = await callApi(`/v1/visits/${visitId}/${action}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  if (status !== 'confirmed') return null;

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => void handle('complete')}
        disabled={pending}
        className="text-xs font-bold text-white bg-savings px-3 py-2 rounded-lg active:scale-[0.98] disabled:opacity-50"
      >
        Concluir
      </button>
      <button
        onClick={() => void handle('cancel')}
        disabled={pending}
        className="text-xs font-bold text-error bg-error/10 border border-error/20 px-3 py-2 rounded-lg active:scale-[0.98] disabled:opacity-50"
      >
        Cancelar
      </button>
      {error && <p className="text-[11px] text-error self-center">{error}</p>}
    </div>
  );
}
