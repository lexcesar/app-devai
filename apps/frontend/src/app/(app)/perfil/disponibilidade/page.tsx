import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-bypass';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { DisponibilidadeClient } from './DisponibilidadeClient';

export default async function DisponibilidadePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slots: any[] = await api.get<any[]>('/v1/availability').catch(() => []);

  return (
    <div className="pb-24 bg-surface min-h-screen">
      <PageHeader title="Minha Disponibilidade" />

      <div className="px-4 py-3 bg-blue-50 mx-4 mt-4 rounded-xl">
        <p className="text-xs text-trust leading-relaxed">
          Configure seus horários disponíveis para receber visitas técnicas. Os clientes verão esses horários ao agendar uma visita no seu perfil.
        </p>
      </div>

      <DisponibilidadeClient initialSlots={slots} />
    </div>
  );
}
