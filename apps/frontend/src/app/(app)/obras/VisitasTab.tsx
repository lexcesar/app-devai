'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { VISIT_STATUS_MAP } from '@/lib/visit-status';
import Link from 'next/link';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VisitasTab({ visits }: { visits: any[] }) {
  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">calendar_month</span>
        <p className="text-sm font-semibold text-slate-500">Nenhuma visita agendada</p>
        <p className="text-xs text-slate-400 mt-1">
          Busque um profissional e agende uma visita técnica.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 mt-3 flex flex-col gap-3">
      {visits.map((visit) => {
        const v = visit;
        const status = VISIT_STATUS_MAP[v.status] ?? { label: v.status, variant: 'agendado' as const };
        // Professional info (for clients) or client info (for professionals)
        const person = v.professionals?.profiles ?? v.client;
        const personName = person?.full_name ?? 'Usuário';
        const personAvatar = person?.avatar_url;
        const specialty = v.professionals?.specialty;

        const date = new Date(v.scheduled_at);
        const dateStr = date.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const timeStr = date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <Link
            key={v.id}
            href={`/visitas/${v.id}`}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 block active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar src={personAvatar} name={personName} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{personName}</p>
                  {specialty && <p className="text-xs text-slate-500">{specialty}</p>}
                </div>
              </div>
              <StatusBadge variant={status.variant} label={status.label} />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span className="capitalize">{dateStr}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{timeStr}</span>
              </div>
            </div>

            {v.address && (
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span className="truncate">{v.address}</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
