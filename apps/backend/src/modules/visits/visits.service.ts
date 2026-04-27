import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OwnershipService } from '../../core/authorization/ownership.service';
import { AvailabilityRepository, VisitsRepository } from './visits.repository';
import { WorksRepository } from '../works/works.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import {
  SetAvailabilitySchema,
  BookVisitSchema,
  TIMEZONE_OFFSET,
} from '@obrafacil/shared';
import type {
  AvailabilitySlot,
  Visit,
  VisitFull,
  Profile,
  UserRole,
} from '@obrafacil/shared';

@Injectable()
export class VisitsService {
  constructor(
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly visitsRepo: VisitsRepository,
    private readonly ownershipService: OwnershipService,
    private readonly notificationsService: NotificationsService,
    private readonly worksRepo: WorksRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
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

  async findAll(profileId: string, actingAs: UserRole): Promise<VisitFull[]> {
    return actingAs === 'professional'
      ? this.visitsRepo.findAllByProfessional(profileId)
      : this.visitsRepo.findAllByClient(profileId);
  }

  async findById(id: string, profile: Profile) {
    const visit = await this.visitsRepo.findById(id);
    // Return 404 for both "not found" and "not authorized" to avoid leaking existence
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (
      !this.ownershipService.canReadVisit(
        profile.id,
        visit as unknown as {
          client_id: string;
          professionals?: { profile_id?: string } | null;
        },
      )
    ) {
      throw new NotFoundException('Visita não encontrada');
    }
    return visit;
  }

  async book(clientProfile: Profile, rawInput: unknown): Promise<Visit> {
    const input = BookVisitSchema.parse(rawInput);

    // Prevent self-hire: check if the professional belongs to the booking client
    const pro = await this.professionalsRepo.findById(input.professionalId);
    if (!pro) {
      throw new NotFoundException('Profissional não encontrado');
    }
    if (pro.profile_id === clientProfile.id) {
      throw new ForbiddenException(
        'Você não pode contratar o seu próprio serviço.',
      );
    }

    let visit: Visit;
    try {
      visit = await this.visitsRepo.create({
        clientId: clientProfile.id,
        professionalId: input.professionalId,
        scheduledAt: input.scheduledAt,
        // Structured address
        street: input.street,
        streetNumber: input.streetNumber,
        complement: input.complement,
        neighborhood: input.neighborhood,
        cityName: input.cityName,
        stateCode: input.stateCode,
        // Booking metadata
        requesterName: input.requesterName,
        serviceType: input.serviceType,
        description: input.description,
        // Legacy fallback
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

    // Notify the professional about the new visit request (fire-and-forget)
    this.professionalsRepo
      .findById(input.professionalId)
      .then((pro) => {
        if (!pro) return;
        const scheduledDate = new Date(input.scheduledAt);
        const formattedDate = scheduledDate.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        });
        return this.notificationsService.notify({
          profileId: pro.profile_id,
          type: 'visit_requested',
          title: 'Nova solicitação de visita',
          message: `${clientProfile.full_name} solicitou uma visita técnica para ${formattedDate}.`,
          link: '/agenda',
          metadata: {
            visitId: visit.id,
            clientId: clientProfile.id,
            clientName: clientProfile.full_name,
            specialty: pro.specialty,
            scheduledAt: input.scheduledAt,
            address: input.address ?? null,
          },
        });
      })
      .catch((err: unknown) => {
        console.error(
          '[VisitsService] Failed to notify professional on book:',
          err,
        );
      });

    return visit;
  }

  async cancel(id: string, profile: Profile, reason?: string): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (!['pending', 'confirmed'].includes(visit.status)) {
      throw new ConflictException(
        'Apenas visitas pendentes ou confirmadas podem ser canceladas',
      );
    }
    const result = await this.visitsRepo.updateStatus(
      id,
      'cancelled',
      profile.id,
      reason,
    );
    // Cancel associated work (only if still scheduled)
    await this.worksRepo.cancelByVisitId(id);
    // Notify the other party
    const visitFull = visit as unknown as VisitFull;
    const professionalProfileId = visitFull.professionals?.profile_id;
    const isClient = profile.id === visit.client_id;
    const recipientId = isClient ? professionalProfileId : visit.client_id;
    if (recipientId) {
      await this.notificationsService.notify({
        profileId: recipientId,
        type: 'visit_cancelled',
        title: 'Visita cancelada',
        message: isClient
          ? 'O cliente cancelou a visita técnica agendada.'
          : 'O profissional cancelou a visita técnica agendada.',
        link: `/agenda`,
      });
    }
    return result;
  }

  async complete(id: string, actingAs: UserRole): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (visit.status !== 'confirmed') {
      throw new ConflictException(
        'Apenas visitas confirmadas podem ser concluídas',
      );
    }
    // Only professional can mark as complete
    if (actingAs !== 'professional') {
      throw new ForbiddenException(
        'Apenas o profissional pode concluir a visita',
      );
    }
    const result = await this.visitsRepo.updateStatus(id, 'completed');
    await this.notificationsService.notify({
      profileId: visit.client_id,
      type: 'visit_completed',
      title: 'Visita concluída',
      message: 'O profissional marcou a visita técnica como concluída.',
      link: `/agenda`,
    });
    return result;
  }

  async accept(id: string, profile: Profile): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (visit.status !== 'pending') {
      throw new ConflictException('Apenas visitas pendentes podem ser aceitas');
    }
    // Ensure the professional owns this visit
    const professional = (
      visit as unknown as { professionals?: { profile_id?: string } | null }
    ).professionals;
    if (!professional || professional.profile_id !== profile.id) {
      throw new ForbiddenException(
        'Você não tem permissão para aceitar esta visita',
      );
    }
    const result = await this.visitsRepo.updateStatus(id, 'confirmed');

    // Idempotently create the work linked to this visit
    await this.worksRepo.createFromVisit({
      id: visit.id,
      client_id: visit.client_id,
      professional_id: visit.professional_id,
      address: (visit as unknown as { address?: string | null }).address,
    });

    await this.notificationsService.notify({
      profileId: visit.client_id,
      type: 'visit_accepted',
      title: 'Visita confirmada!',
      message: 'O profissional aceitou sua solicitação de visita técnica.',
      link: `/agenda`,
    });
    return result;
  }

  async reject(id: string, profile: Profile, reason?: string): Promise<Visit> {
    const visit = await this.visitsRepo.findById(id);
    if (!visit) throw new NotFoundException('Visita não encontrada');
    if (visit.status !== 'pending') {
      throw new ConflictException(
        'Apenas visitas pendentes podem ser recusadas',
      );
    }
    // Ensure the professional owns this visit
    const professional = (
      visit as unknown as { professionals?: { profile_id?: string } | null }
    ).professionals;
    if (!professional || professional.profile_id !== profile.id) {
      throw new ForbiddenException(
        'Você não tem permissão para recusar esta visita',
      );
    }
    const result = await this.visitsRepo.updateStatus(
      id,
      'rejected',
      undefined,
      reason,
    );
    // Cancel associated work (only if still scheduled — defensive)
    await this.worksRepo.cancelByVisitId(id);
    await this.notificationsService.notify({
      profileId: visit.client_id,
      type: 'visit_rejected',
      title: 'Visita não aceita',
      message: reason
        ? `O profissional recusou a visita: ${reason}`
        : 'O profissional não pôde aceitar a visita técnica solicitada.',
      link: `/agenda`,
    });
    return result;
  }
}
