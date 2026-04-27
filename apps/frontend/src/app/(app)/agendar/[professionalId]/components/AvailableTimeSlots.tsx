import { RefObject } from 'react';

interface AvailableTimeSlotsProps {
  selectedDate: Date | undefined;
  times: string[];
  selectedTime: string | null;
  slotsRef: RefObject<HTMLElement>;
  onSelectTime: (time: string) => void;
}

export function AvailableTimeSlots({
  selectedDate,
  times,
  selectedTime,
  slotsRef,
  onSelectTime,
}: AvailableTimeSlotsProps) {
  // No date selected — placeholder
  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center">
        <span className="material-symbols-outlined text-3xl text-slate-200 mb-2">calendar_month</span>
        <p className="text-xs font-semibold text-slate-400">Selecione uma data</p>
        <p className="text-[11px] text-slate-300 mt-0.5">Os horários aparecerão aqui</p>
      </div>
    );
  }

  // Date selected but no slots
  if (times.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center">
        <span className="material-symbols-outlined text-3xl text-slate-200 mb-2">event_busy</span>
        <p className="text-xs font-semibold text-slate-400">Nenhum horário disponível</p>
        <p className="text-[11px] text-slate-300 mt-0.5">Selecione outro dia</p>
      </div>
    );
  }

  const shortDate = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <section ref={slotsRef} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Horários</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
            {times.length} livre{times.length !== 1 ? 's' : ''} — <span className="text-trust font-medium">{shortDate}</span>
          </p>
        </div>
        {selectedTime && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
            ✓ {selectedTime}
          </span>
        )}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-3 gap-2 flex-1 content-start">
        {times.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <button
              key={time}
              onClick={() => onSelectTime(time)}
              className={`
                py-2.5 px-1 rounded-lg text-center transition-all active:scale-95 border
                ${isSelected
                  ? 'bg-trust text-white border-trust shadow-md shadow-trust/20 scale-105 font-bold'
                  : 'bg-white border-slate-200 hover:border-trust/40 hover:bg-blue-50/60 text-slate-700 font-semibold'
                }
              `}
            >
              <span className="block text-sm leading-none">{time}</span>
              {isSelected && (
                <span className="block text-[9px] text-blue-100 mt-1 leading-none">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      {selectedTime && (
        <p className="mt-3 text-[10px] text-slate-400 text-center">
          Preencha os dados no painel →
        </p>
      )}
    </section>
  );
}
