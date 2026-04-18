import { auth } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import { VisitActions, WorkActions } from './WorkActions';

type Dashboard = {
  profile: { id: string; full_name: string; avatar_url: string | null };
  professional: {
    id: string;
    rating: number | null;
    rating_count: number | null;
  };
  stats: {
    upcoming_visits: number;
    active_works: number;
    pending_conversations: number;
    completed_works: number;
  };
  upcoming_visits: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    address: string | null;
    client_name: string;
  }>;
  active_works: Array<{
    id: string;
    title: string;
    status: string;
    progress_pct: number | null;
    next_step: string | null;
    client_name: string;
  }>;
};

export default async function ProfissionalDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let data: Dashboard | null = null;
  let errorMsg: string | null = null;
  try {
    data = await api.get<Dashboard>('/v1/professionals/me/dashboard');
  } catch (err) {
    errorMsg = (err as Error).message;
  }

  if (errorMsg || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-surface">
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">
          lock
        </span>
        <p className="text-sm font-semibold text-slate-700">
          Dashboard disponível apenas para profissionais
        </p>
        <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
        <Link
          href="/"
          className="mt-6 text-xs font-semibold text-trust bg-blue-50 px-4 py-2 rounded-full"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <div className="bg-white">
        <div className="flex items-center px-4 pt-10 pb-3">
          <Link href="/" className="mr-3">
            <span className="material-symbols-outlined text-slate-700 text-xl">
              arrow_back
            </span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Meu Dashboard</h1>
        </div>
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-600">
            Olá, <span className="font-semibold">{data.profile.full_name}</span>
          </p>
          {data.professional.rating !== null && (
            <p className="text-xs text-slate-400 mt-0.5">
              ⭐ {Number(data.professional.rating).toFixed(1)} ·{' '}
              {data.professional.rating_count ?? 0} avaliações
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Visitas agendadas"
          value={data.stats.upcoming_visits}
          icon="event"
        />
        <StatCard
          label="Obras ativas"
          value={data.stats.active_works}
          icon="construction"
        />
        <StatCard
          label="Conversas"
          value={data.stats.pending_conversations}
          icon="chat"
        />
        <StatCard
          label="Concluídas"
          value={data.stats.completed_works}
          icon="task_alt"
        />
      </div>

      <div className="px-4 mt-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Próximas visitas
        </p>
        {data.upcoming_visits.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma visita agendada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.upcoming_visits.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {v.client_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(v.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {v.address && (
                      <p className="text-xs text-slate-400 mt-1">{v.address}</p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                      v.status === 'confirmed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <VisitActions visitId={v.id} status={v.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Obras ativas
        </p>
        {data.active_works.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma obra em andamento.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.active_works.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {w.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliente: {w.client_name}
                </p>
                {w.progress_pct !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-slate-500">
                        Progresso
                      </p>
                      <p className="text-[10px] font-bold text-slate-700">
                        {w.progress_pct}%
                      </p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-trust rounded-full"
                        style={{ width: `${w.progress_pct}%` }}
                      />
                    </div>
                  </div>
                )}
                {w.next_step && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    → {w.next_step}
                  </p>
                )}
                <WorkActions workId={w.id} status={w.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="material-symbols-outlined text-lg text-trust">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
