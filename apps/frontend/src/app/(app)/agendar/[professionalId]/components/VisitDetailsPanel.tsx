import { RefObject, Dispatch, SetStateAction } from 'react';
import { BR_STATES } from '../useBookingFlow';

interface VisitDetailsPanelProps {
  // Context
  professionalName: string;
  selectedDate: Date | undefined;
  selectedTime: string | null;
  selectedDateLabel: string;
  // Address
  street: string; setStreet: Dispatch<SetStateAction<string>>;
  streetNumber: string; setStreetNumber: Dispatch<SetStateAction<string>>;
  complement: string; setComplement: Dispatch<SetStateAction<string>>;
  neighborhood: string; setNeighborhood: Dispatch<SetStateAction<string>>;
  cityName: string; setCityName: Dispatch<SetStateAction<string>>;
  stateCode: string; setStateCode: Dispatch<SetStateAction<string>>;
  // Service
  requesterName: string; setRequesterName: Dispatch<SetStateAction<string>>;
  serviceType: string; setServiceType: Dispatch<SetStateAction<string>>;
  description: string; setDescription: Dispatch<SetStateAction<string>>;
  // UI
  fieldErrors: Record<string, string>;
  booking: boolean;
  error: string | null;
  streetRef: RefObject<HTMLInputElement>;
  inputClass: (field: string) => string;
  onBook: () => void;
}

export function VisitDetailsPanel({
  professionalName,
  selectedDate,
  selectedTime,
  selectedDateLabel,
  street, setStreet,
  streetNumber, setStreetNumber,
  complement, setComplement,
  neighborhood, setNeighborhood,
  cityName, setCityName,
  stateCode, setStateCode,
  requesterName, setRequesterName,
  serviceType, setServiceType,
  description, setDescription,
  fieldErrors,
  booking,
  error,
  streetRef,
  inputClass,
  onBook,
}: VisitDetailsPanelProps) {
  // Step 1: no date
  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <span className="material-symbols-outlined text-4xl text-slate-200 mb-3">event_note</span>
        <p className="text-sm font-semibold text-slate-400">Aguardando seleção de data</p>
        <p className="text-xs text-slate-300 mt-1">Comece escolhendo um dia disponível</p>
      </div>
    );
  }

  // Step 2: date but no time
  if (!selectedTime) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <span className="material-symbols-outlined text-4xl text-slate-200 mb-3">schedule</span>
        <p className="text-sm font-semibold text-slate-400">
          {selectedDateLabel.charAt(0).toUpperCase() + selectedDateLabel.slice(1)} selecionado
        </p>
        <p className="text-xs text-slate-300 mt-1">Agora escolha um horário</p>
      </div>
    );
  }

  // Step 3: full form
  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="rounded-xl p-3 border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-trust text-lg mt-0.5">event_available</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium">Visita técnica agendada para</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">{selectedDateLabel}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-trust font-bold">
                <span className="material-symbols-outlined text-xs">schedule</span>
                {selectedTime}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span className="material-symbols-outlined text-xs">person</span>
                {professionalName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Address section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="material-symbols-outlined text-slate-400 text-sm">location_on</span>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Local da visita
          </h3>
        </div>
        <div className="space-y-2.5">
          {/* Street + Number */}
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div>
              <input
                ref={streetRef}
                type="text"
                placeholder="Rua / Avenida *"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className={inputClass('street')}
              />
              {fieldErrors.street && (
                <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.street}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                placeholder="Nº *"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                className={inputClass('streetNumber')}
              />
              {fieldErrors.streetNumber && (
                <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.streetNumber}</p>
              )}
            </div>
          </div>

          {/* Complement */}
          <input
            type="text"
            placeholder="Complemento (apto, bloco…)"
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            className={inputClass('complement')}
          />

          {/* Neighborhood */}
          <div>
            <input
              type="text"
              placeholder="Bairro *"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={inputClass('neighborhood')}
            />
            {fieldErrors.neighborhood && (
              <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.neighborhood}</p>
            )}
          </div>

          {/* City + State */}
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div>
              <input
                type="text"
                placeholder="Cidade *"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className={inputClass('cityName')}
              />
              {fieldErrors.cityName && (
                <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.cityName}</p>
              )}
            </div>
            <div>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className={inputClass('stateCode')}
              >
                <option value="">UF *</option>
                {BR_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {fieldErrors.stateCode && (
                <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.stateCode}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="material-symbols-outlined text-slate-400 text-sm">build</span>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Sobre o serviço
          </h3>
        </div>
        <div className="space-y-2.5">
          <div>
            <input
              type="text"
              placeholder="Seu nome completo *"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className={inputClass('requesterName')}
            />
            {fieldErrors.requesterName && (
              <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.requesterName}</p>
            )}
          </div>
          <div>
            <input
              type="text"
              placeholder="Tipo de serviço *"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={inputClass('serviceType')}
            />
            {fieldErrors.serviceType && (
              <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.serviceType}</p>
            )}
          </div>
          <div>
            <textarea
              placeholder="Descreva o que precisa ser feito *"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass('description')} resize-none`}
            />
            {fieldErrors.description && (
              <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3 bg-red-50 border border-red-100 flex items-start gap-2">
          <span className="material-symbols-outlined text-red-400 text-base mt-0.5">error</span>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* CTA — desktop only (mobile uses fixed bar in AgendarClient) */}
      <button
        onClick={onBook}
        disabled={booking}
        className="hidden lg:flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm bg-trust text-white hover:bg-trust/90 active:scale-[0.98] transition-all shadow-lg shadow-trust/25 disabled:opacity-60"
      >
        {booking ? (
          <>
            <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Agendando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">event_available</span>
            Confirmar agendamento
          </>
        )}
      </button>
    </div>
  );
}
