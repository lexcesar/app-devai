import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { VISIT_STATUS_MAP } from '@/lib/visit-status';
import { VisitaActions } from './VisitaActions';

export default async function VisitaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visit = await api.get<any>(`/v1/visits/${id}`).catch(() => null);
  if (!visit) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = visit as any;
  const status = VISIT_STATUS_MAP[v.status] ?? { label: v.status, variant: 'agendado' as const };

  const pro = v.professionals?.profiles;
  const client = v.client;

  const date = new Date(v.scheduled_at);
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine if the current user is the professional by comparing Clerk IDs
  const proClerkId = v.professionals?.profiles?.clerk_id;
  const userRole = proClerkId === userId ? 'professional' : 'client';

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <PageHeader title="Detalhes da Visita" />

      <div className="px-4 mt-4 space-y-4">
        {/* Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Visita Técnica</h2>
            <StatusBadge variant={status.variant} label={status.label} />
          </div>
        </div>

        {/* Professional info */}
        {pro && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Profissional</p>
            <div className="flex items-center gap-3">
              <Avatar src={pro.avatar_url} name={pro.full_name} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{pro.full_name}</p>
                {v.professionals?.specialty && (
                  <p className="text-xs text-slate-500">{v.professionals.specialty}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Client info */}
        {client && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Cliente</p>
            <div className="flex items-center gap-3">
              <Avatar src={client.avatar_url} name={client.full_name} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{client.full_name}</p>
                {client.phone && <p className="text-xs text-slate-500">{client.phone}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Date/Time and Address */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-trust">calendar_month</span>
            <div>
              <p className="text-xs text-slate-400">Data</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{dateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-trust">schedule</span>
            <div>
              <p className="text-xs text-slate-400">Horário</p>
              <p className="text-sm font-medium text-slate-900">{timeStr}</p>
            </div>
          </div>

          {v.address && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-trust">location_on</span>
              <div>
                <p className="text-xs text-slate-400">Endereço</p>
                <p className="text-sm font-medium text-slate-900">{v.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {v.notes && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Observações</p>
            <p className="text-sm text-slate-700 leading-relaxed">{v.notes}</p>
          </div>
        )}

        {/* Actions */}
        <VisitaActions visitId={v.id} status={v.status} userRole={userRole} />
      </div>
    </div>
  );
}
