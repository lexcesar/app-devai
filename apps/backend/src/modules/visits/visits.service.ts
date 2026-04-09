import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityRepository, VisitsRepository } from './visits.repository';
import {
  SetAvailabilitySchema,
  BookVisitSchema,
  TIMEZONE_OFFSET,
} from '@obrafacil/shared';
import type {
  AvailabilitySlot,
  Visit,
  VisitWithProfessional,
  VisitWithClient,
  Profile,
} from '@obrafacil/shared';

@Injectable()
export class VisitsService {
  constructor(
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly visitsRepo: VisitsRepository,
  ) {}

  // ── Availability ──────────────────────────────────────────────────────────

  async getMyAvailability(professionalId: string): Promise<AvailabilitySlot[]> {
    return this.availabilityRepo.findByProfessional(professionalId);
  }

  async setAvailability(
    professionalId: string,
    rawInput: unknown,
  ): Promise<AvailabilitySlot[]> {
    const { slots } = SetAvailabilitySchema.parse(rawInput);
    return this.availabilityRepo.replaceAll(professionalId, slots);
  }

  /**
   * Returns available time slots for the next 30 days.
   * Computes 1-hour slots from availability_slots minus booked visits.
   */
  async getAvailableSlots(
    professionalId: string,
  ): Promise<{ date: string; times: string[] }[]> {
    const [availability, visits] = await Promise.all([
      this.availabilityRepo.findByProfessional(professionalId),
      this.visitsRepo.findActiveByProfessional(professionalId),
    ]);

    if (availability.length === 0) return [];

    // Build a set of booked datetimes for quick lookup (query already excludes cancelled)
    const bookedSet = new Set(visits.map((v) => v.scheduled_at));

    // Build a map of weekday -> time ranges
    const slotsByDay = new Map<number, { start: string; end: string }[]>();
    for (const slot of availability) {
      const existing = slotsByDay.get(slot.weekday) ?? [];
      existing.push({ start: slot.start_time, end: slot.end_time });
      slotsByDay.set(slot.weekday, existing);
    }

    const result: { date: string; times: string[] }[] = [];
    const now = new Date();

    for (let d = 0; d < 30; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const weekday = date.getDay(); // 0=Sunday

      const ranges = slotsByDay.get(weekday);
      if (!ranges) continue;

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const times: string[] = [];

      for (const range of ranges) {
        const [startH, startM] = range.start.split(':').map(Number);
        const [endH, endM] = range.end.split(':').map(Number);
        const startMinutes = startH * 60 + (startM || 0);
        const endMinutes = endH * 60 + (endM || 0);

        for (let m = startMinutes; m + 60 <= endMinutes; m += 60) {
          const hour = Math.floor(m / 60);
          const min = m % 60;
          const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

          // Build full ISO datetime for comparison
          const slotDate = new Date(
            `${dateStr}T${timeStr}:00${TIMEZONE_OFFSET}`,
          );

          // Skip past slots
          if (slotDate <= now) continue;

          // Skip booked slots
          const isoKey = slotDate.toISOString();
          if (bookedSet.has(isoKey)) continue;

          times.push(timeStr);
        }
      }

      if (times.length > 0) {
        result.push({ date: dateStr, times });
      }
    }

    return result;
  }

  // ── Visits ────────────────────────────────────────────────────────────────

  async findAll(
    profile: Profile,
  ): Promise<VisitWithProfessional[] | VisitWithClient[]> {
    return profile.role === 'professional'
      ? this.visitsRepo.findAllByProfessional(profile.id)
      : this.visitsRepo.findAllByClient(profile.id);
  }

  async findById(id: string) {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    return visit;
  }

  async book(clientId: string, rawInput: unknown): Promise<Visit> {
    const input = BookVisitSchema.parse(rawInput);
    try {
      return await this.visitsRepo.create({
        clientId,
        professionalId: input.professionalId,
        scheduledAt: input.scheduledAt,
        address: input.address,
        notes: input.notes,
      });
    } catch (err: unknown) {
      // Unique constraint violation = double booking
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Este horário já foi reservado');
      }
      throw err;
    }
  }

  async cancel(id: string, profile: Profile): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (visit.status !== 'confirmed') {
      throw new ConflictException(
        'Apenas visitas confirmadas podem ser canceladas',
      );
    }
    return this.visitsRepo.updateStatus(id, 'cancelled', profile.id);
  }

  async complete(id: string, profile: Profile): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (visit.status !== 'confirmed') {
      throw new ConflictException(
        'Apenas visitas confirmadas podem ser concluídas',
      );
    }
    // Only professional can mark as complete
    if (profile.role !== 'professional') {
      throw new ForbiddenException(
        'Apenas o profissional pode concluir a visita',
      );
    }
    return this.visitsRepo.updateStatus(id, 'completed');
  }
}
