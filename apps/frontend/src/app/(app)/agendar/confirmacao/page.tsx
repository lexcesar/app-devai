import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-bypass';

export default async function ConfirmacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ profissional?: string; data?: string; hora?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { profissional, data, hora } = await searchParams;

  // Format date for display
  const dataFormatada = data
    ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-savings/10 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-savings filled">check_circle</span>
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-2">Visita Agendada!</h1>

      <p className="text-sm text-slate-500 mb-6">
        Sua visita técnica com <span className="font-semibold text-slate-700">{profissional}</span> foi confirmada.
      </p>

      {/* Visit details card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 w-full max-w-sm mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-trust">calendar_month</span>
          <div className="text-left">
            <p className="text-xs text-slate-400">Data</p>
            <p className="text-sm font-medium text-slate-900 capitalize">{dataFormatada}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-trust">schedule</span>
          <div className="text-left">
            <p className="text-xs text-slate-400">Horário</p>
            <p className="text-sm font-medium text-slate-900">{hora}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Link
          href="/obras"
          className="w-full h-14 rounded-xl bg-trust text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-xl">construction</span>
          Ver Minhas Visitas
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-500 font-medium py-2"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
