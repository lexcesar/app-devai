'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientApi } from '@/lib/api/client-api';
import { RejectModal } from './RejectModal';
import type { VisitFull, UserRole } from '@obrafacil/shared';

interface AgendaVisitCardProps {
  visit: VisitFull;
  actingAs: UserRole;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pendente',   color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  confirmed: { label: 'Confirmado', color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
  completed: { label: 'Concluído',  color: 'text-slate-600', bg: 'bg-slate-50',  border: 'border-slate-200' },
  cancelled: { label: 'Cancelado',  color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-200'   },
  rejected:  { label: 'Recusado',   color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-200'   },
};

export function AgendaVisitCard({ visit, actingAs }: AgendaVisitCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const api = useClientApi();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/v1/visits/${visit.id}/accept`, {});
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao aceitar visita');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (visitId: string, reason: string) => {
    await api.patch(`/v1/visits/${visitId}/reject`, { reason });
    setShowRejectModal(false);
    router.refresh();
  };

  const meta = STATUS_LABELS[visit.status] ?? STATUS_LABELS['pending'];
  const scheduledDate = visit.scheduled_at
    ? new Date(visit.scheduled_at).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data a definir';

  return (
    <>
      <Link
        href={`/visitas/${visit.id}`}
        className={`bg-white rounded-xl border shadow-sm p-4 block active:scale-[0.99] transition-transform ${meta.border}`}
        onClick={(e) => {
          // Don't navigate if user is clicking one of the action buttons
          const target = e.target as HTMLElement;
          if (target.closest('button')) e.preventDefault();
        }}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
            <span className={`material-symbols-outlined text-xl ${meta.color}`}>person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {actingAs === 'professional'
                ? (visit.client?.full_name ?? 'Cliente')
                : (visit.professionals?.profiles?.full_name ?? 'Profissional')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {scheduledDate}
            </p>
            {visit.notes && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{visit.notes}</p>
            )}
            {visit.address && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span className="truncate">{visit.address}</span>
              </p>
            )}
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border ${meta.bg} ${meta.color} ${meta.border}`}>
            {meta.label}
          </span>
        </div>

        {visit.status === 'pending' && (
          <div className="mt-3 space-y-1">
            {error && <p className="text-[10px] text-red-600 font-medium text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.preventDefault(); handleAccept(); }}
                disabled={loading}
                className="flex-1 h-9 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Aceitar
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setShowRejectModal(true); }}
                disabled={loading}
                className="flex-1 h-9 rounded-lg border border-red-400 text-red-500 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                Recusar
              </button>
            </div>
          </div>
        )}
      </Link>

      {showRejectModal && (
        <RejectModal
          visitId={visit.id}
          clientName={actingAs === 'professional'
            ? (visit.client?.full_name ?? 'Cliente')
            : (visit.professionals?.profiles?.full_name ?? 'Profissional')}
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}
