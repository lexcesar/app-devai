'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/ui/StickyBottomCTA';
import { useClientApi } from '@/lib/api/client-api';

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface Slot {
  weekday: number;
  start_time: string;
  end_time: string;
}

export function DisponibilidadeClient({ initialSlots }: { initialSlots: Slot[] }) {
  const router = useRouter();
  const api = useClientApi();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addSlot = (weekday: number) => {
    setSlots([...slots, { weekday, start_time: '08:00', end_time: '12:00' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await api.put('/v1/availability', { slots });
      setMessage({ type: 'success', text: 'Disponibilidade salva com sucesso!' });
      router.refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const slotsForDay = (weekday: number) => {
    return slots
      .map((s, i) => ({ ...s, index: i }))
      .filter((s) => s.weekday === weekday);
  };

  return (
    <div className="px-4 pb-32 mt-4 space-y-4">
      {WEEKDAYS.map((day) => {
        const daySlots = slotsForDay(day.value);

        return (
          <div key={day.value} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">{day.label}</h3>
              <button
                onClick={() => addSlot(day.value)}
                className="text-trust text-xs font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Adicionar
              </button>
            </div>

            {daySlots.length === 0 ? (
              <p className="text-xs text-slate-400">Sem horários configurados</p>
            ) : (
              <div className="space-y-2">
                {daySlots.map(({ index, start_time, end_time }) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={start_time}
                      onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-trust/30"
                    />
                    <span className="text-xs text-slate-400">até</span>
                    <input
                      type="time"
                      value={end_time}
                      onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-trust/30"
                    />
                    <button
                      onClick={() => removeSlot(index)}
                      className="text-error"
                      aria-label="Remover horário"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {message && (
        <p className={`text-xs text-center font-medium ${message.type === 'success' ? 'text-savings' : 'text-error'}`}>
          {message.text}
        </p>
      )}

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 -mx-4">
        <PrimaryButton variant="trust" onClick={handleSave} loading={saving}>
          <span className="material-symbols-outlined text-xl">save</span>
          Salvar Disponibilidade
        </PrimaryButton>
      </div>
    </div>
  );
}
