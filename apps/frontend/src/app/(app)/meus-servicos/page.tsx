import { auth } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import type { WorkFull, UserRole } from '@obrafacil/shared';
import { ACTING_AS_COOKIE } from '@/lib/acting-as';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Agendada', color: 'text-blue-600', bg: 'bg-blue-50' },
  active:    { label: 'Em andamento', color: 'text-trust', bg: 'bg-orange-50' },
  completed: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: 'Cancelada', color: 'text-red-500', bg: 'bg-red-50' },
};

export default async function MeusServicosPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const cookieStore = await cookies();
  const actingAs = (cookieStore.get(ACTING_AS_COOKIE)?.value ?? 'professional') as UserRole;

  const works = await api.get<WorkFull[]>('/v1/works').catch(() => []);

  const active = works.filter((w) => w.status === 'active');
  const scheduled = works.filter((w) => w.status === 'scheduled');
  const completed = works.filter((w) => w.status === 'completed');
  const cancelled = works.filter((w) => w.status === 'cancelled');

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <PageHeader title="Meus Serviços" />

      <div className="px-4 mt-4 space-y-4">
        {works.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 block mb-3">
              build
            </span>
            <p className="text-sm font-medium text-slate-600">Nenhuma obra ainda</p>
            <p className="text-xs text-slate-400 mt-1">
              Suas obras aparecerão aqui após ser contratado por um cliente
            </p>
          </div>
        ) : (
          <>
            {/* Em andamento */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Em Andamento
                </h2>
                <div className="space-y-3">
                  {active.map((work) => (
                    <WorkCard key={work.id} work={work} actingAs={actingAs} />
                  ))}
                </div>
              </section>
            )}

            {/* Agendadas */}
            {scheduled.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Agendadas
                </h2>
                <div className="space-y-3">
                  {scheduled.map((work) => (
                    <WorkCard key={work.id} work={work} actingAs={actingAs} />
                  ))}
                </div>
              </section>
            )}

            {/* Concluídas */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Concluídas
                </h2>
                <div className="space-y-3 opacity-70">
                  {completed.slice(0, 5).map((work) => (
                    <WorkCard key={work.id} work={work} actingAs={actingAs} />
                  ))}
                </div>
              </section>
            )}

            {/* Canceladas */}
            {cancelled.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Canceladas
                </h2>
                <div className="space-y-3 opacity-60">
                  {cancelled.map((work) => (
                    <WorkCard key={work.id} work={work} actingAs={actingAs} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WorkCard({ work, actingAs }: { work: WorkFull; actingAs: UserRole }) {
  const status = STATUS_LABELS[work.status] ?? STATUS_LABELS.scheduled;
  const personName = actingAs === 'professional'
    ? (work.client?.full_name ?? null)
    : (work.professionals?.profiles?.full_name ?? null);

  return (
    <Link
      href={`/meus-servicos/${work.id}`}
      className="block bg-white rounded-xl border border-slate-100 shadow-sm p-4 active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {work.title ?? 'Obra sem título'}
          </p>
          {personName && (
            <p className="text-xs text-slate-500 mt-0.5">
              {actingAs === 'professional' ? 'Cliente' : 'Profissional'}: {personName}
            </p>
          )}
          {work.started_at && (
            <p className="text-xs text-slate-400 mt-0.5">
              Iniciada em:{' '}
              {new Date(work.started_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
          {work.next_step && (
            <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
              Prox: {work.next_step}
            </p>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${status.color} ${status.bg}`}
        >
          {status.label}
        </span>
      </div>

      {/* Progress bar para obras ativas */}
      {work.status === 'active' && typeof work.progress_pct === 'number' && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">Progresso</span>
            <span className="text-[10px] font-semibold text-trust">{work.progress_pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-trust rounded-full transition-all"
              style={{ width: `${work.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mt-2 gap-1 text-trust">
        <span className="text-[10px] font-medium">Ver detalhes</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </div>
    </Link>
  );
}
