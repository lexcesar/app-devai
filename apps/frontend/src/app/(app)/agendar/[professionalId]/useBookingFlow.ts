'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TIMEZONE_OFFSET } from '@obrafacil/shared';
import { useClientApi } from '@/lib/api/client-api';

/** Locale-safe YYYY-MM-DD (avoids toISOString UTC shift in negative offsets) */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

export interface AvailableDay {
  date: string;
  times: string[];
}

export interface BookingFlowOptions {
  professionalId: string;
  professionalName: string;
  currentUserProfessionalId?: string | null;
  professionalSpecialty?: string;
}

export function useBookingFlow({
  professionalId,
  professionalName,
  currentUserProfessionalId,
  professionalSpecialty,
}: BookingFlowOptions) {
  const router = useRouter();
  const api = useClientApi();

  // ── Data layer ──────────────────────────────────────────────
  const [availability, setAvailability] = useState<AvailableDay[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Selection state ─────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // ── Address fields ───────────────────────────────────────────
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityName, setCityName] = useState('');
  const [stateCode, setStateCode] = useState('');

  // ── Service fields ───────────────────────────────────────────
  const [requesterName, setRequesterName] = useState('');
  const [serviceType, setServiceType] = useState(professionalSpecialty ?? '');
  const [description, setDescription] = useState('');

  // ── UI state ─────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────
  const timeSlotsRef = useRef<HTMLElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);

  // ── Derived values ───────────────────────────────────────────
  const isSelfBooking =
    !!currentUserProfessionalId && currentUserProfessionalId === professionalId;
  const availableDates = new Set(availability.map((d) => d.date));
  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : undefined;
  const timesForDay =
    availability.find((d) => d.date === selectedDateStr)?.times ?? [];
  const currentStep: 1 | 2 | 3 = !selectedDate ? 1 : !selectedTime ? 2 : 3;
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  // ── Load availability ────────────────────────────────────────
  async function loadAvailability() {
    try {
      const data = await api.get<AvailableDay[]>(
        `/v1/professionals/${professionalId}/availability`,
      );
      setAvailability(data);
    } catch {
      setError('Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, [professionalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────
  function handleSelectDate(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedTime(null);
    if (date) {
      setTimeout(
        () =>
          timeSlotsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          }),
        120,
      );
    }
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time);
    setTimeout(() => streetRef.current?.focus(), 220);
  }

  // ── Validation ───────────────────────────────────────────────
  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!street.trim()) errs.street = 'Rua obrigatória';
    if (!streetNumber.trim()) errs.streetNumber = 'Número obrigatório';
    if (!neighborhood.trim()) errs.neighborhood = 'Bairro obrigatório';
    if (!cityName.trim()) errs.cityName = 'Cidade obrigatória';
    if (!stateCode) errs.stateCode = 'Estado obrigatório';
    if (!requesterName.trim()) errs.requesterName = 'Nome do solicitante obrigatório';
    if (!serviceType.trim()) errs.serviceType = 'Tipo de serviço obrigatório';
    if (description.trim().length < 10)
      errs.description = 'Descreva o problema (mín. 10 caracteres)';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submission ───────────────────────────────────────────────
  async function handleBook() {
    if (!selectedDate || !selectedTime) return;
    if (!validateForm()) return;
    setBooking(true);
    setError(null);

    const scheduledAt = new Date(
      `${selectedDateStr}T${selectedTime}:00${TIMEZONE_OFFSET}`,
    ).toISOString();

    try {
      await api.post(
        '/v1/visits',
        {
          professionalId,
          scheduledAt,
          street: street.trim(),
          streetNumber: streetNumber.trim(),
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim(),
          cityName: cityName.trim(),
          stateCode: stateCode.toUpperCase(),
          requesterName: requesterName.trim(),
          serviceType: serviceType.trim(),
          description: description.trim(),
        },
        true, // skipActingAs — booking is always a client action
      );

      router.push(
        `/agendar/confirmacao?profissional=${encodeURIComponent(professionalName)}&data=${selectedDateStr}&hora=${selectedTime}`,
      );
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setError('Este horário já foi reservado. Escolha outro.');
        setSelectedTime(null);
        const data = await api
          .get<AvailableDay[]>(`/v1/professionals/${professionalId}/availability`)
          .catch(() => null);
        if (data) setAvailability(data);
      } else {
        setError('Erro ao agendar. Tente novamente.');
      }
    } finally {
      setBooking(false);
    }
  }

  // ── CSS helper ───────────────────────────────────────────────
  function inputClass(field: string) {
    return `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-trust/30 focus:border-trust transition-colors ${
      fieldErrors[field]
        ? 'border-red-300 bg-red-50/30'
        : 'border-slate-200 bg-white'
    }`;
  }

  return {
    // data
    availability,
    loading,
    // selection
    selectedDate,
    selectedTime,
    // address
    street, setStreet,
    streetNumber, setStreetNumber,
    complement, setComplement,
    neighborhood, setNeighborhood,
    cityName, setCityName,
    stateCode, setStateCode,
    // service
    requesterName, setRequesterName,
    serviceType, setServiceType,
    description, setDescription,
    // ui
    fieldErrors,
    booking,
    error,
    // refs
    timeSlotsRef,
    streetRef,
    // derived
    isSelfBooking,
    availableDates,
    timesForDay,
    currentStep,
    selectedDateLabel,
    // handlers
    handleSelectDate,
    handleSelectTime,
    handleBook,
    inputClass,
  };
}
