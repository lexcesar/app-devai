'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientApi } from '@/lib/api/client-api';

interface OportunidadeActionsProps {
  visitId: string;
}

export function OportunidadeActions({ visitId }: OportunidadeActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useClientApi();

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/v1/visits/${visitId}/${action}`, {});
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao atualizar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && <p className="text-[10px] text-error font-medium text-center">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('accept')}
          disabled={loading}
          className="flex-1 h-9 rounded-lg bg-trust text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Aceitar
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="flex-1 h-9 rounded-lg border border-error text-error text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">cancel</span>
          Recusar
        </button>
      </div>
    </div>
  );
}
