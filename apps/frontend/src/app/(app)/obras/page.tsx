// Minhas Obras + Visitas — work tracking and visit scheduling
import { auth } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import { ObrasVisitasWrapper } from './ObrasVisitasWrapper';

export default async function ObrasPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [worksList, visitsList] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any[]>('/v1/works').catch(() => []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any[]>('/v1/visits').catch(() => []),
  ]);

  return (
    <div className="pb-24 bg-surface min-h-screen">
      {/* Header */}
      <div className="bg-white">
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-trust text-xl">construction</span>
            <h1 className="text-lg font-bold text-slate-900">Minhas Obras</h1>
          </div>
          <Link href="/perfil/notificacoes" className="relative" aria-label="Notificacoes">
            <span className="material-symbols-outlined text-slate-500 text-2xl">notifications</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-trust rounded-full" />
          </Link>
        </div>

        <ObrasVisitasWrapper works={worksList} visits={visitsList} />
      </div>
    </div>
  );
}
