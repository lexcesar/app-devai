'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { TIMEZONE_OFFSET } from '@obrafacil/shared';
import 'react-day-picker/style.css';

/** Locale-safe YYYY-MM-DD (avoids toISOString UTC shift in negative offsets) */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AvailableDay {
  date: string;
  times: string[];
}

interface AgendarClientProps {
  professionalId: string;
  professionalName: string;
}

export function AgendarClient({ professionalId, professionalName }: AgendarClientProps) {
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeSlotsRef = useRef<HTMLElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiUrl}/v1/professionals/${professionalId}/availability`);
        if (!res.ok) throw new Error();
        const envelope = await res.json() as { data: AvailableDay[] };
        setAvailability(envelope.data);
      } catch {
        setError('Não foi possível carregar a agenda.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiUrl, professionalId]);

  // Dates that have available slots
  const availableDates = new Set(availability.map((d) => d.date));

  // Times for the selected date
  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : undefined;
  const timesForDay = availability.find((d) => d.date === selectedDateStr)?.times ?? [];

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);
    setError(null);

    const scheduledAt = new Date(`${selectedDateStr}T${selectedTime}:00${TIMEZONE_OFFSET}`).toISOString();

    try {
      const res = await fetch(`${apiUrl}/v1/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId,
          scheduledAt,
          address: address || undefined,
          notes: notes || undefined,
        }),
      });

      if (res.status === 409) {
        setError('Este horário já foi reservado. Escolha outro.');
        setSelectedTime(null);
        return;
      }

      if (!res.ok) {
        setError('Erro ao agendar. Tente novamente.');
        return;
      }

      router.push(`/agendar/confirmacao?profissional=${encodeURIComponent(professionalName)}&data=${selectedDateStr}&hora=${selectedTime}`);
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-3 border-slate-200 border-t-trust rounded-full animate-spin" />
      </div>
    );
  }

  if (availability.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">event_busy</span>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Agenda indisponível</h2>
        <p className="text-sm text-slate-500 mb-6">
          Este profissional ainda não configurou sua agenda. Envie uma mensagem para combinar.
        </p>
        <button
          onClick={() => router.back()}
          className="text-trust font-medium text-sm"
        >
          Voltar ao perfil
        </button>
      </div>
    );
  }

  // Format selected date for badge display
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="px-6 pb-32">
      {/* Hero */}
      <section className="mb-8 mt-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Escolha uma data</h2>
        <p className="text-slate-500 font-medium text-sm">Selecione o melhor dia e horário para receber nossa equipe.</p>
      </section>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm p-5 w-[80%] mx-auto">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date ?? undefined);
            setSelectedTime(null);
            if (date) {
              setTimeout(() => timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          }}
          weekStartsOn={1}
          locale={ptBR}
          disabled={(date) => !availableDates.has(toDateStr(date))}
          fromDate={new Date()}
          toDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
          classNames={{
            root: 'w-full [--rdp-accent-color:#1E40AF] [--rdp-accent-background-color:#1E40AF]',
            months: 'relative',
            month_caption: 'flex items-center mb-6',
            caption_label: 'text-lg font-bold text-slate-900',
            nav: 'absolute -top-2 right-0 flex gap-1',
            button_previous: 'p-2 rounded-full hover:bg-slate-100 transition-colors',
            button_next: 'p-2 rounded-full hover:bg-slate-100 transition-colors',
            weekdays: 'grid grid-cols-7 mb-2',
            weekday: 'text-slate-400 font-semibold text-xs uppercase tracking-wider text-center',
            weeks: 'grid gap-y-1',
            week: 'grid grid-cols-7',
            day: 'text-center py-2.5 text-sm font-medium',
            day_button: 'w-9 h-9 rounded-full mx-auto flex items-center justify-center transition-colors hover:bg-slate-100 cursor-pointer',
            selected: '[&>button]:!bg-[#1E40AF] [&>button]:!text-white [&>button]:shadow-md [&>button]:hover:!bg-[#1E40AF]',
            today: '[&>button]:font-bold [&>button]:text-[#1E40AF]',
            disabled: 'text-slate-300 [&>button]:cursor-default [&>button]:hover:bg-transparent',
            outside: 'text-slate-300',
          }}
        />
      </div>

      {/* Time slots */}
      {selectedDate && timesForDay.length > 0 && (
        <section ref={timeSlotsRef} className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Horários disponíveis</h3>
            <span className="text-sm font-semibold text-[#1E40AF] px-3 py-1 bg-blue-50 rounded-full capitalize">
              {selectedDateLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {timesForDay.map((time) => (
              <button
                key={time}
                onClick={() => {
                  setSelectedTime(time);
                  setTimeout(() => addressRef.current?.focus(), 150);
                }}
                className={`
                  p-4 rounded-xl text-center transition-all active:scale-95
                  ${selectedTime === time
                    ? 'bg-[#1E40AF] text-white shadow-lg border-2 border-[#1E40AF]'
                    : 'bg-white border-2 border-transparent hover:border-blue-100'
                  }
                `}
              >
                <span className="block text-lg font-bold">{time}</span>
                <span className={`text-xs font-medium ${selectedTime === time ? 'opacity-80' : 'text-emerald-600'}`}>
                  {selectedTime === time ? 'Selecionado' : 'Disponível'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Address + Notes form */}
      {selectedTime && (
        <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
          <h3 className="text-base font-bold text-slate-900 mb-3">Detalhes da visita</h3>

          <label className="block mb-3">
            <span className="text-xs font-medium text-slate-500 mb-1 block">Endereço da visita</span>
            <input
              ref={addressRef}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500 mb-1 block">Observações (opcional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva brevemente o serviço necessário..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] resize-none"
            />
          </label>
        </div>
      )}

      {/* Info card */}
      {selectedTime && (
        <div className="mt-6 bg-emerald-50/60 p-5 rounded-xl flex items-start gap-4">
          <span className="material-symbols-outlined text-emerald-600 text-2xl mt-0.5">info</span>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Aviso Importante</h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Sua visita terá duração estimada de 60 minutos. Certifique-se de estar no local 5 minutos antes do horário agendado.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-error text-center font-medium mt-3">{error}</p>
      )}

      {/* CTA */}
      {selectedTime && (
        <div className="fixed bottom-20 left-0 w-full p-4 bg-white/80 backdrop-blur-xl z-40">
          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full py-4 px-8 bg-[#1E40AF] text-white font-bold text-lg rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            {booking ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              'Confirmar Agendamento'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
