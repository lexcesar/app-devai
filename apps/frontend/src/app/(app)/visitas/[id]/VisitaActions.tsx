'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/ui/StickyBottomCTA';
import { useClientApi } from '@/lib/api/client-api';
import { ReasonModal } from './ReasonModal';

interface VisitaActionsProps {
  visitId: string;
  status: string;
  userRole: string;
  clientName?: string;
}

export function VisitaActions({ visitId, status, userRole, clientName }: VisitaActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const api = useClientApi();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/v1/visits/${visitId}/accept`, {});
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao aceitar visita');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    await api.patch(`/v1/visits/${visitId}/reject`, { reason });
    setShowRejectModal(false);
    router.refresh();
  };

  const handleCancel = async (reason: string) => {
    await api.patch(`/v1/visits/${visitId}/cancel`, { reason });
    setShowCancelModal(false);
    router.refresh();
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/v1/visits/${visitId}/complete`, {});
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao concluir visita');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'pending' && userRole === 'professional') {
    return (
      <>
        <div className="flex flex-col gap-2 mt-6">
          <div className="flex gap-3">
            <PrimaryButton
              variant="trust"
              onClick={handleAccept}
              loading={loading}
            >
              <span className="material-symbols-outlined text-xl">check_circle</span>
              Aceitar Visita
            </PrimaryButton>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={loading}
              className="flex-1 h-12 rounded-xl border-2 border-error text-error font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Recusar
            </button>
          </div>
          {error && <p className="text-xs text-error text-center font-medium">{error}</p>}
        </div>

        {showRejectModal && (
          <ReasonModal
            title="Recusar visita"
            subtitle={clientName ?? 'Cliente'}
            placeholder="Ex: Horário indisponível, fora da área de atuação..."
            confirmLabel="Recusar visita"
            confirmClassName="bg-red-500 hover:bg-red-600"
            onConfirm={handleReject}
            onCancel={() => setShowRejectModal(false)}
          />
        )}
      </>
    );
  }

  if (status === 'pending' && userRole === 'client') {
    return (
      <>
        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="w-full h-12 rounded-xl border-2 border-error text-error font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">cancel</span>
            Cancelar Solicitação
          </button>
          {error && <p className="text-xs text-error text-center font-medium">{error}</p>}
        </div>

        {showCancelModal && (
          <ReasonModal
            title="Cancelar solicitação"
            subtitle="Informe o motivo do cancelamento"
            placeholder="Ex: Já resolvi o problema, mudei de planos..."
            confirmLabel="Cancelar visita"
            confirmClassName="bg-red-500 hover:bg-red-600"
            onConfirm={handleCancel}
            onCancel={() => setShowCancelModal(false)}
          />
        )}
      </>
    );
  }

  if (status !== 'confirmed') return null;

  return (
    <>
      <div className="flex flex-col gap-2 mt-6">
        {userRole === 'professional' && (
          <PrimaryButton
            variant="savings"
            onClick={handleComplete}
            loading={loading}
          >
            <span className="material-symbols-outlined text-xl">check_circle</span>
            Marcar como Concluída
          </PrimaryButton>
        )}

        <button
          onClick={() => setShowCancelModal(true)}
          disabled={loading}
          className="w-full h-12 rounded-xl border-2 border-error text-error font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">cancel</span>
          Cancelar Visita
        </button>

        {error && <p className="text-xs text-error text-center font-medium">{error}</p>}
      </div>

      {showCancelModal && (
        <ReasonModal
          title="Cancelar visita"
          subtitle="Informe o motivo do cancelamento"
          placeholder={userRole === 'professional'
            ? 'Ex: Tive um imprevisto, não poderei comparecer...'
            : 'Ex: Já resolvi o problema, mudei de planos...'}
          confirmLabel="Cancelar visita"
          confirmClassName="bg-red-500 hover:bg-red-600"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelModal(false)}
        />
      )}
    </>
  );
}


