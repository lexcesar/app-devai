// INT-01 — Home / Dashboard (Visão Cliente)
// spec_ui.md: "Flat Design, extremamente limpa, carrossel de Profissionais super bem avaliados"
// prd.md RFN-01: profissionais ordenados por rating_avg desc
// Web: Desktop expands to bento 3-col grid; mobile preserves original layout.
import { auth, currentUser } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/client';
import { SearchBar } from '@/components/ui/SearchBar';
import { StarRating } from '@/components/ui/StarRating';
import { FAB } from '@/components/ui/FAB';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';

// ── Service type returned by GET /v1/services ────────────────────────────────
interface ServiceRow {
  id: string;
  name: string;
  icon_name: string;
  description: string | null;
  sort_order: number;
}

// ── Map icon_name → Tailwind color classes ───────────────────────────────────
// TODO: When professionals.service_id FK is added, filter by service_id instead
// of relying on the text-based normalizeAndMapTerm() mapping in the repository.
const SERVICE_COLORS: Record<string, { icon: string; desktop: string }> = {
  bolt:             { icon: 'bg-amber-50 text-amber-600',  desktop: 'from-amber-50 to-amber-100/60'   },
  electrical_services: { icon: 'bg-amber-50 text-amber-600', desktop: 'from-amber-50 to-amber-100/60' },
  water_drop:       { icon: 'bg-blue-50 text-blue-600',    desktop: 'from-blue-50 to-blue-100/60'     },
  format_paint:     { icon: 'bg-green-50 text-green-600',  desktop: 'from-green-50 to-green-100/60'   },
  cleaning_services:{ icon: 'bg-purple-50 text-purple-600',desktop: 'from-purple-50 to-purple-100/60' },
  construction:     { icon: 'bg-red-50 text-red-600',      desktop: 'from-red-50 to-red-100/60'       },
  chair:            { icon: 'bg-teal-50 text-teal-600',    desktop: 'from-teal-50 to-teal-100/60'     },
};

const FALLBACK_COLORS = { icon: 'bg-slate-50 text-slate-600', desktop: 'from-slate-50 to-slate-100/60' };

function getServiceColors(iconName: string) {
  return SERVICE_COLORS[iconName] ?? FALLBACK_COLORS;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { service: selectedService } = await searchParams;

  // Build professional query — filters by service when selected
  const profParams = new URLSearchParams();
  if (selectedService) profParams.set('service', selectedService);
  const profQs = profParams.toString();

  const [user, profResult, servicesResult] = await Promise.all([
    currentUser(),
    api
      .get<{ professionals: any[]; total: number }>(
        `/v1/professionals${profQs ? '?' + profQs : ''}`,
      )
      .catch(() => ({ professionals: [] as any[], total: 0 })),
    // Services endpoint is public — no auth needed.
    api.get<ServiceRow[]>('/v1/services').catch(() => [] as ServiceRow[]),
  ]);

  const professionals = profResult.professionals;
  // servicesResult may be wrapped in { data: T } by the api client's envelope unwrap,
  // but GET /v1/services returns the array directly (no ResponseEnvelopeInterceptor on that endpoint).
  const services: ServiceRow[] = Array.isArray(servicesResult)
    ? servicesResult
    : ((servicesResult as any)?.data ?? []);

  const firstName = user?.firstName ?? 'você';

  const proSectionTitle = selectedService
    ? `Profissionais de ${selectedService}`
    : 'Profissionais de elite';
  const proSectionSubtitle = selectedService
    ? 'Filtrado por serviço'
    : 'Super bem avaliados perto de você';

  return (
    <div className="pb-24 md:pb-8 bg-[#f8f6f6] min-h-screen">

      {/* ═══════════════════════════════════════════════════════════
          MOBILE header (hidden on desktop — TopBar takes over)
          ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden px-4 pb-4 bg-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-slate-400 font-medium">Bem-vindo,</p>
            <h1 className="text-xl font-bold text-slate-800">{firstName}</h1>
          </div>
        </div>
        <div className="mt-3">
          <SearchBar />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP welcome banner (hidden on mobile)
          ═══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-on-surface">
          Bom dia, {firstName} 👋
        </h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          O que você precisa hoje?
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SERVICES SECTION
          Services are loaded dynamically from GET /v1/services.
          Clicking a card sets ?service=<name> on the home URL,
          which re-renders the professionals section filtered.
          Mobile:   2-col grid
          Desktop:  3-col bento cards (2 rows of 3 for 6 services)
          ═══════════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-8 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">Serviços</h2>
          {/* "Ver todos" chip — clears the service filter */}
          {selectedService ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#ec5b13] bg-orange-50 border border-[#ec5b13]/20 rounded-full px-3 py-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Limpar filtro
            </Link>
          ) : (
            <Link href="/busca" className="text-xs font-semibold text-[#ec5b13]">
              Ver todos →
            </Link>
          )}
        </div>

        {/* Mobile: 2-col */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {services.map((svc) => {
            const isActive = selectedService === svc.name;
            const colors = getServiceColors(svc.icon_name);
            // Toggle: clicking active service clears the filter
            const href = isActive ? '/' : `/?service=${encodeURIComponent(svc.name)}`;
            return (
              <Link
                key={svc.id}
                href={href}
                className={[
                  'flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border transition-all active:scale-[0.98]',
                  isActive
                    ? 'border-[#ec5b13] ring-2 ring-[#ec5b13]/20 shadow-md'
                    : 'border-slate-100',
                ].join(' ')}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                  <span className="material-symbols-outlined text-xl">{svc.icon_name}</span>
                </div>
                <span className="text-sm font-medium text-slate-800 leading-tight">{svc.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Desktop: 3-col bento */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {services.map((svc) => {
            const isActive = selectedService === svc.name;
            const colors = getServiceColors(svc.icon_name);
            const href = isActive ? '/' : `/?service=${encodeURIComponent(svc.name)}`;
            return (
              <Link
                key={svc.id}
                href={href}
                className={[
                  `relative flex flex-col gap-4 bg-gradient-to-br ${colors.desktop} rounded-2xl p-5 border shadow-[0px_4px_16px_rgba(0,40,142,0.06)] transition-all duration-200 group`,
                  isActive
                    ? 'border-[#ec5b13] ring-2 ring-[#ec5b13]/20 scale-[0.98] shadow-md'
                    : 'border-white/80 hover:scale-[0.98] hover:shadow-md',
                ].join(' ')}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors.icon} shadow-sm`}>
                  <span className="material-symbols-outlined text-2xl">{svc.icon_name}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{svc.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isActive ? 'Filtro ativo — clique para limpar' : 'Ver profissionais →'}
                  </p>
                </div>
                {isActive && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ec5b13] flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs">check</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PROFESSIONALS SECTION
          Mobile:   vertical list (existing)
          Desktop:  3-col grid with richer cards
          ═══════════════════════════════════════════════════════════ */}
      <div className="mt-6 px-4 md:px-8">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{proSectionTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{proSectionSubtitle}</p>
          </div>
          {selectedService && (
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
            >
              Ver todos
            </Link>
          )}
        </div>

        {/* Empty state — filtered but no results */}
        {selectedService && professionals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">search_off</span>
            <p className="text-sm font-semibold text-slate-500">
              Nenhum profissional encontrado para este serviço
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tente outro serviço ou{' '}
              <Link href="/" className="text-[#ec5b13] font-semibold">
                veja todos os profissionais
              </Link>
              .
            </p>
          </div>
        )}

        {/* Empty state — no filter, no professionals at all */}
        {!selectedService && professionals.length === 0 && (
          <p className="text-sm text-slate-400 py-4">Nenhum profissional encontrado.</p>
        )}

        {/* Mobile: vertical list */}
        <div className="flex flex-col gap-3 md:hidden">
          {professionals.map((pro) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = pro as any;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    avatarId={p.profiles?.avatar_id}
                    src={p.profiles?.avatar_url}
                    name={p.profiles?.full_name ?? 'Profissional'}
                    size="lg"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.profiles?.full_name ?? 'Profissional'}</p>
                    <p className="text-xs text-slate-400 truncate">{p.specialty ?? 'Especialista'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <StarRating rating={p.rating_avg ?? 0} size="sm" count={p.total_reviews ?? 0} />
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

        {/* Desktop: 3-col grid */}
        <div className="hidden md:grid md:grid-cols-3 xl:grid-cols-4 gap-4">
          {professionals.map((pro) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = pro as any;
            return (
              <Link
                key={p.id}
                href={`/profissional/${p.id}`}
                className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-[0px_4px_16px_rgba(0,40,142,0.04)] hover:shadow-[0px_8px_24px_rgba(0,40,142,0.1)] hover:scale-[0.99] transition-all duration-200 overflow-hidden"
              >
                {/* Avatar hero */}
                <div className="h-40 bg-gradient-to-br from-primary/5 to-primary-container/10 flex items-center justify-center">
                  <Avatar
                    avatarId={p.profiles?.avatar_id}
                    src={p.profiles?.avatar_url}
                    name={p.profiles?.full_name ?? 'Profissional'}
                    size="xl"
                    className="ring-4 ring-white shadow-lg"
                  />
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="font-bold text-on-surface truncate">{p.profiles?.full_name ?? 'Profissional'}</p>
                  <p className="text-sm text-on-surface-variant truncate mt-0.5">{p.specialty ?? 'Especialista'}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <StarRating rating={p.rating_avg ?? 0} size="sm" count={p.total_reviews ?? 0} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/15 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">{p.jobs_completed ?? 0} trabalhos</span>
                    {p.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-xs filled">verified</span>
                        Verificado
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          EMERGENCY BANNER
          ═══════════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-8 mt-6">
        <Link
          href="/perfil/ajuda"
          className="bg-brand rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] hover:scale-[0.99] transition-transform"
          aria-label="Atendimento de Emergencia"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-white">emergency</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Atendimento de Emergência</p>
            <p className="text-xs text-white/80 mt-0.5 leading-tight">
              Canal direto para urgências elétricas e hidráulicas.
            </p>
          </div>
          <span className="material-symbols-outlined text-white text-xl flex-shrink-0">chevron_right</span>
        </Link>
      </div>

      {/* FAB — mobile only (desktop has TopBar actions) */}
      <div className="md:hidden">
        <FAB
          icon="support_agent"
          variant="brand"
          ariaLabel="Suporte ou emergencia"
          href="/perfil/ajuda"
          className="fixed bottom-24 right-4 shadow-lg"
        />
      </div>
    </div>
  );
}


