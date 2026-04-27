import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { auth } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import { isAuthBypassEnabled } from '@/lib/auth-bypass-config';
import { ACTING_AS_COOKIE } from '@/lib/acting-as';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { WorkActions } from './WorkActions';
import type { WorkFull } from '@obrafacil/shared';

const STATUS_MAP: Record<string, { label: string; variant: 'agendado' | 'ativo' | 'entregue' | 'cancelado' }> = {
  scheduled: { label: 'Agendada', variant: 'agendado' },
  active: { label: 'Em andamento', variant: 'ativo' },
  completed: { label: 'Concluída', variant: 'entregue' },
  cancelled: { label: 'Cancelada', variant: 'cancelado' },
};

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const work = await api.get<WorkFull>(`/v1/works/${id}`).catch(() => null);
  if (!work) notFound();

  const w = work as WorkFull & { client?: { full_name?: string; avatar_url?: string; phone?: string } };

  const status = STATUS_MAP[w.status] ?? { label: w.status, variant: 'agendado' as const };

  const pro = w.professionals?.profiles;
  const client = w.client;

  // Determine user role
  let userRole: 'professional' | 'client';
  if (isAuthBypassEnabled) {
    const cookieStore = await cookies();
    const actingAs = cookieStore.get(ACTING_AS_COOKIE)?.value;
    userRole = actingAs === 'professional' ? 'professional' : 'client';
  } else {
    const proClerkId = w.professionals?.profiles?.clerk_id;
    userRole = proClerkId === userId ? 'professional' : 'client';
  }

  const personToShow = userRole === 'professional' ? client : pro;
  const personLabel = userRole === 'professional' ? 'Cliente' : 'Profissional';

  return (
    <div className="pb-28 bg-surface min-h-screen">
      <PageHeader title="Detalhes da Obra" />

      <div className="px-4 mt-4 space-y-4">

        {/* Title + Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 leading-snug">{w.title}</h2>
            <StatusBadge variant={status.variant} label={status.label} />
          </div>
          {w.professionals?.specialty && (
            <p className="text-xs text-slate-500 mt-1">{w.professionals.specialty}</p>
          )}
        </div>

        {/* Progress (active only) */}
        {w.status === 'active' && typeof w.progress_pct === 'number' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Progresso</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Conclusão estimada</span>
              <span className="text-sm font-bold text-trust">{w.progress_pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-trust rounded-full transition-all"
                style={{ width: `${w.progress_pct}%` }}
              />
            </div>
            {w.next_step && (
              <p className="text-xs text-slate-500 mt-2 italic">
                Próx: {w.next_step}
              </p>
            )}
          </div>
        )}

        {/* Person card */}
        {personToShow && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">{personLabel}</p>
            <div className="flex items-center gap-3">
              <Avatar
                src={'avatar_url' in personToShow ? personToShow.avatar_url : undefined}
                name={('full_name' in personToShow ? personToShow.full_name : undefined) ?? ''}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {'full_name' in personToShow ? personToShow.full_name : '—'}
                </p>
                {'phone' in personToShow && personToShow.phone && (
                  <p className="text-xs text-slate-500 mt-0.5">{personToShow.phone}</p>
                )}
                {userRole === 'client' && w.professionals?.specialty && (
                  <p className="text-xs text-slate-500 mt-0.5">{w.professionals.specialty}</p>
                )}
              </div>
              {'phone' in personToShow && personToShow.phone && (
                <a
                  href={`tel:${personToShow.phone}`}
                  className="w-10 h-10 rounded-full bg-trust/10 flex items-center justify-center text-trust flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-xl">call</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Datas</p>
          {w.started_at && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-trust">play_circle</span>
              <div>
                <p className="text-xs text-slate-400">Início</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(w.started_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}
          {w.completed_at && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
              <div>
                <p className="text-xs text-slate-400">Conclusão</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(w.completed_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}
          {!w.started_at && !w.completed_at && (
            <p className="text-xs text-slate-400">Obra ainda não iniciada</p>
          )}
        </div>

        {/* Photos */}
        {Array.isArray(w.photos) && w.photos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Fotos</p>
            <div className="grid grid-cols-3 gap-2">
              {w.photos.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={url}
                    alt={`Foto ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 464px) 30vw, 120px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions (professional only, not for cancelled works) */}
        {userRole === 'professional' && w.status !== 'cancelled' && (
          <WorkActions
            workId={w.id}
            status={w.status}
            progressPct={w.progress_pct ?? 0}
          />
        )}
      </div>
    </div>
  );
}
