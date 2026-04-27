interface BookingStepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { label: 'Data',     hint: 'Escolha o dia'     },
  { label: 'Horário',  hint: 'Escolha o horário' },
  { label: 'Detalhes', hint: 'Preencha os dados' },
] as const;

export function BookingStepIndicator({ currentStep }: BookingStepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 max-w-xs">
      {STEPS.map(({ label, hint }, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done   = step < currentStep;
        const active = step === currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done   ? 'bg-emerald-500 text-white' :
                  active ? 'bg-trust text-white shadow-md shadow-trust/30' :
                           'bg-slate-100 text-slate-400'
                }`}
              >
                {done
                  ? <span className="material-symbols-outlined text-sm leading-none">check</span>
                  : step
                }
              </span>
              <span className={`text-[10px] font-semibold leading-none hidden sm:block ${
                active ? 'text-trust' : done ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {label}
              </span>
              <span className={`text-[9px] leading-none hidden lg:block ${
                active ? 'text-slate-400' : 'text-transparent select-none'
              }`}>
                {hint}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                done ? 'bg-emerald-400' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
