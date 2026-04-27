// INT-02 — Perfil Completo do Profissional
// spec_ui.md: "Foco na credibilidade. Topo: Foto+Nome; Meio: Nota+Especialidades; Rodapé: CTA fixado"
// seed.sql: Ricardo Silva 4.9/128, José da Silva 4.9/142, Ana Rodrigues 4.7/89
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import { StarRating } from '@/components/ui/StarRating';
import { StickyBottomCTA } from '@/components/ui/StickyBottomCTA';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';

import { ShareButton, ReviewsSection } from './ProfissionalClient';

export default async function ProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const pro = await api.get<any>(`/v1/professionals/${id}`).catch(() => null);

  if (!pro) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pro as any;
  const profile = p.profiles;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allReviews: any[] = p.reviews ?? [];
  const totalReviews = allReviews.length;

  return (
    <div className="pb-32 md:pb-8 bg-[#f8f6f6] min-h-screen">
      {/* ── Back header ──────────────────────────────────────────── */}
      <PageHeader title="Perfil do Profissional" />

      {/* ── Desktop: 2-column grid ───────────────────────────────── */}
      <div className="md:grid md:grid-cols-[1fr_340px] md:gap-8 md:px-8 md:mt-6 md:items-start">

        {/* LEFT COLUMN: Profile card + metrics + reviews + bio */}
        <div>
          {/* ── Centered circular photo ─────────────────────────── */}
          <div className="flex flex-col items-center pt-6 pb-4 bg-white md:rounded-2xl md:border md:border-slate-100 md:shadow-sm">
            <div className="w-28 h-28 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-lg">
              <Avatar
                avatarId={profile?.avatar_id}
                src={profile?.avatar_url}
                name={profile?.full_name ?? 'Profissional'}
                size="xl"
              />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mt-3 text-center">{profile?.full_name}</h1>
            {p.specialty && (
              <p className="text-sm text-slate-500 uppercase tracking-wide mt-0.5 text-center">{p.specialty}</p>
            )}
            {p.is_verified && (
              <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-sm filled">verified</span>
                PROFISSIONAL VERIFICADO
              </div>
            )}
          </div>

          {/* ── Side-by-side metrics ────────────────────────────── */}
          <div className="px-4 md:px-0 mt-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Avaliação Média</p>
                  <p className="text-4xl font-black text-slate-900 mt-1">{p.rating_avg ?? '—'}</p>
                  <div className="flex justify-center mt-1">
                    <StarRating rating={p.rating_avg ?? 0} size="sm" />
                  </div>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Trabalhos Realizados</p>
                  <p className="text-4xl font-black text-slate-900 mt-1">{p.jobs_completed ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Share button */}
          <div className="flex justify-center mt-4">
            <ShareButton name={profile?.full_name ?? 'Profissional'} url={`/profissional/${id}`} />
          </div>

          {/* ── Reviews section ─────────────────────────────────── */}
          <ReviewsSection reviews={allReviews} totalReviews={totalReviews} />

          {/* ── Specialty chip ──────────────────────────────────── */}
          {p.specialty && (
            <div className="px-4 md:px-0 mt-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Especialidade</h2>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-[#1E40AF] bg-blue-50 px-3 py-1.5 rounded-full">{p.specialty}</span>
              </div>
            </div>
          )}

          {/* ── Bio ─────────────────────────────────────────────── */}
          {p.bio && (
            <div className="px-4 md:px-0 mt-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Sobre</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{p.bio}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Desktop CTA card (hidden on mobile) */}
        <div className="hidden md:block md:sticky md:top-20">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Agendar com {profile?.full_name?.split(' ')[0]}</h3>
            <p className="text-xs text-slate-400 mb-5">Escolha a melhor data para sua visita técnica</p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/agendar/${id}`}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all hover:scale-[0.98] bg-savings hover:bg-emerald-600 text-white"
              >
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                Agendar Visita
              </Link>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-base text-emerald-500">shield</span>
              Pagamento protegido pela plataforma
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA fixado no rodapé — mobile only ───────────────────── */}
      <div className="md:hidden">
        <StickyBottomCTA>
          <Link
            href={`/agendar/${id}`}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-2 font-semibold text-base transition-all active:scale-[0.98] bg-savings hover:bg-emerald-600 text-white"
          >
            <span className="material-symbols-outlined text-xl">calendar_month</span>
            Agendar Visita
          </Link>
        </StickyBottomCTA>
      </div>
    </div>
  );
}
