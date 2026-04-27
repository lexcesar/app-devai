import { auth } from '@/lib/auth-bypass';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/client';
import { VisitasTab } from './VisitasTab';

export default async function SolicitacoesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Force actingAs=client: this page always shows visits the user booked as a client.
  // Without this, users who have the professional role activated would get professional
  // visits (empty) instead of their own bookings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitsList = await api.get<any[]>('/v1/visits', { actingAs: 'client' }).catch(() => []);

  return (
    <div className="pb-24 bg-surface min-h-screen">
      {/* Header */}
      <div className="bg-white pb-2">
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="material-symbols-outlined text-trust text-xl">calendar_month</span>
          <h1 className="text-lg font-bold text-slate-900">Minhas Visitas</h1>
        </div>
      </div>

      <VisitasTab visits={visitsList} />
    </div>
  );
}
