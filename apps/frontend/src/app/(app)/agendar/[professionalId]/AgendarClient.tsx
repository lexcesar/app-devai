'use client';

import { useRouter } from 'next/navigation';
import { useBookingFlow } from './useBookingFlow';
import { BookingStepIndicator } from './components/BookingStepIndicator';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { AvailableTimeSlots } from './components/AvailableTimeSlots';
import { VisitDetailsPanel } from './components/VisitDetailsPanel';


interface AgendarClientProps {
  professionalId: string;
  professionalName: string;
  currentUserProfessionalId?: string | null;
  professionalSpecialty?: string;
}

export function AgendarClient({
  professionalId,
  professionalName,
  currentUserProfessionalId,
  professionalSpecialty,
}: AgendarClientProps) {
  const router = useRouter();
  const flow = useBookingFlow({ professionalId, professionalName, currentUserProfessionalId, professionalSpecialty });
  // ── Early-exit guards ─────────────────────────────────────
  if (flow.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-3 border-slate-200 border-t-trust rounded-full animate-spin" />
      </div>
    );
  }

  if (flow.isSelfBooking) {
    return (
      <div className="px-4 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">block</span>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Não é possível agendar</h2>
        <p className="text-sm text-slate-500 mb-6">Você não pode contratar o seu próprio serviço.</p>
        <button onClick={() => router.back()} className="text-trust font-medium text-sm">Voltar</button>
      </div>
    );
  }

  if (flow.availability.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">event_busy</span>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Agenda indisponível</h2>
        <p className="text-sm text-slate-500 mb-6">
          Este profissional ainda não configurou sua agenda. Envie uma mensagem para combinar.
        </p>
        <button onClick={() => router.back()} className="text-trust font-medium text-sm">Voltar ao perfil</button>
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-12">
      {/* Stepper */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <BookingStepIndicator currentStep={flow.currentStep} />
      </div>

      {/* Main grid: LEFT (cal + times) | RIGHT (details panel) */}
      <div className="px-4 md:px-8 lg:grid lg:grid-cols-[1fr_400px] lg:gap-6 lg:items-start">

        {/* LEFT: single card with calendar + time slots
            At xl (≥1280px): side by side with divider
            At lg/mobile: stacked */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 lg:p-6 xl:p-8
                          xl:grid xl:grid-cols-[3fr_2fr] xl:divide-x xl:divide-slate-100">
            <div className="xl:pr-5">
              <ScheduleCalendar
                selectedDate={flow.selectedDate}
                availableDates={flow.availableDates}
                selectedDateLabel={flow.selectedDateLabel}
                onSelectDate={flow.handleSelectDate}
              />
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100
                            xl:mt-0 xl:pt-0 xl:border-t-0 xl:pl-5">
              <AvailableTimeSlots
                selectedDate={flow.selectedDate}
                times={flow.timesForDay}
                selectedTime={flow.selectedTime}
                slotsRef={flow.timeSlotsRef}
                onSelectTime={flow.handleSelectTime}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: sticky details panel with internal scroll */}
        <div className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <VisitDetailsPanel
              professionalName={professionalName}
              selectedDate={flow.selectedDate}
              selectedTime={flow.selectedTime}
              selectedDateLabel={flow.selectedDateLabel}
              street={flow.street} setStreet={flow.setStreet}
              streetNumber={flow.streetNumber} setStreetNumber={flow.setStreetNumber}
              complement={flow.complement} setComplement={flow.setComplement}
              neighborhood={flow.neighborhood} setNeighborhood={flow.setNeighborhood}
              cityName={flow.cityName} setCityName={flow.setCityName}
              stateCode={flow.stateCode} setStateCode={flow.setStateCode}
              requesterName={flow.requesterName} setRequesterName={flow.setRequesterName}
              serviceType={flow.serviceType} setServiceType={flow.setServiceType}
              description={flow.description} setDescription={flow.setDescription}
              fieldErrors={flow.fieldErrors}
              booking={flow.booking}
              error={flow.error}
              streetRef={flow.streetRef}
              inputClass={flow.inputClass}
              onBook={flow.handleBook}
            />
          </div>
        </div>
      </div>

      {/* Mobile CTA — fixed above bottom nav */}
      {flow.selectedTime && (
        <div className="lg:hidden fixed bottom-16 left-0 w-full px-4 pb-3 pt-2 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-40">
          <button
            onClick={flow.handleBook}
            disabled={flow.booking}
            className="w-full py-4 bg-[#1E40AF] text-white font-bold text-base rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {flow.booking ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">check_circle</span>
                Confirmar Agendamento
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
