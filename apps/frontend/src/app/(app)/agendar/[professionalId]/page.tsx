import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { AgendarClient } from './AgendarClient';

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { professionalId } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pro = await api.get<any>(`/v1/professionals/${professionalId}`).catch(() => null);
  if (!pro) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pro as any;
  const name = p.profiles?.full_name ?? 'Profissional';

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <PageHeader title="Agendar Visita" />

      {/* Professional info summary */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-slate-300">person</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{p.specialty}</p>
        </div>
      </div>

      <AgendarClient professionalId={professionalId} professionalName={name} />
    </div>
  );
}
