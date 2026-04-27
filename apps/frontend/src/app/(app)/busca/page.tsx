// Busca de Profissionais — accepts ?q= (text) and ?service= (category)
import { auth } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/client';
import { StarRating } from '@/components/ui/StarRating';
import { SearchBar } from '@/components/ui/SearchBar';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; service?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { q, service } = await searchParams;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (service) params.set('service', service);
  const qs = params.toString();
  const { professionals } = await api
    .get<{ professionals: any[]; total: number }>(`/v1/professionals${qs ? '?' + qs : ''}`)
    .catch(() => ({ professionals: [] as any[], total: 0 }));

  const title = q
    ? `Resultados para "${q}"`
    : service
      ? `Profissionais de ${service}`
      : 'Todos os profissionais';

  return (
    <div className="pb-24 md:pb-8 bg-[#f8f6f6] min-h-screen">
      {/* Header */}
      <div className="px-4 md:px-8 md:pt-6 pb-4 bg-white">
        <Link href="/" className="md:hidden flex items-center gap-1 text-sm text-slate-400 mb-3">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Voltar
        </Link>
        <h1 className="text-lg font-bold text-slate-900 mb-3">{title}</h1>
        <SearchBar />
      </div>

      {/* Results */}
      <div className="px-4 md:px-8 mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(!professionals || professionals.length === 0) && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">search_off</span>
            <p className="text-sm font-semibold text-slate-500">Nenhum profissional encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo ou categoria.</p>
          </div>
        )}
        {(professionals ?? []).map((pro) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = pro as any;
          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  avatarId={p.profiles?.avatar_id}
                  src={p.profiles?.avatar_url}
                  name={p.profiles?.full_name ?? 'Profissional'}
                  size="lg"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {p.profiles?.full_name ?? 'Profissional'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{p.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating rating={p.rating_avg ?? 0} size="sm" />
                    <span className="text-xs font-bold text-slate-700">{p.rating_avg ?? 0}</span>
                    <span className="text-[10px] text-slate-400">({p.jobs_completed ?? 0} trabalhos)</span>
                  </div>
                </div>
              </div>
              <Link
                href={`/profissional/${p.id}`}
                className="mt-3 block text-center text-sm font-semibold text-[#ec5b13] py-2 rounded-xl border border-[#ec5b13]/20 bg-orange-50 active:scale-[0.98] transition-transform"
              >
                Ver Perfil
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
