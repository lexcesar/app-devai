import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { OwnershipService } from '../../core/authorization/ownership.service';
import type { Profile } from '@obrafacil/shared';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'client-1',
    clerk_id: 'c1',
    full_name: 'Carlos',
    avatar_url: null,
    avatar_id: null,
    phone: null,
    role: 'client',
    created_at: '2026-04-18T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
    ...overrides,
  } as Profile;
}

describe('VisitsService', () => {
  let availabilityRepo: {
    findByProfessional: jest.Mock;
    replaceAll: jest.Mock;
  };
  let visitsRepo: {
    findAllByClient: jest.Mock;
    findAllByProfessional: jest.Mock;
    findActiveByProfessional: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
  };
  let worksRepo: {
    createFromVisit: jest.Mock;
    cancelByVisitId: jest.Mock;
  };
  let professionalsRepo: {
    findById: jest.Mock;
  };
  let service: VisitsService;

  beforeEach(() => {
    availabilityRepo = {
      findByProfessional: jest.fn(),
      replaceAll: jest.fn(),
    };
    visitsRepo = {
      findAllByClient: jest.fn(),
      findAllByProfessional: jest.fn(),
      findActiveByProfessional: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    worksRepo = {
      createFromVisit: jest.fn().mockResolvedValue({ id: 'work-1' }),
      cancelByVisitId: jest.fn().mockResolvedValue(undefined),
    };
    professionalsRepo = {
      findById: jest.fn(),
    };
    service = new VisitsService(
      availabilityRepo as never,
      visitsRepo as never,
      new OwnershipService(),
      { notify: jest.fn() } as never,
      worksRepo as never,
      professionalsRepo as never,
    );
  });

  describe('findAll', () => {
    it('routes professional to findAllByProfessional', async () => {
      visitsRepo.findAllByProfessional.mockResolvedValue([{ id: 'v1' }]);
      const result = await service.findAll('client-1', 'professional');
      expect(visitsRepo.findAllByProfessional).toHaveBeenCalledWith('client-1');
      expect(visitsRepo.findAllByClient).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'v1' }]);
    });

    it('routes client to findAllByClient', async () => {
      visitsRepo.findAllByClient.mockResolvedValue([]);
      await service.findAll('client-1', 'client');
      expect(visitsRepo.findAllByClient).toHaveBeenCalledWith('client-1');
      expect(visitsRepo.findAllByProfessional).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    const owner = makeProfile({ id: 'client-1', role: 'client' });
    const stranger = makeProfile({ id: 'other-user', role: 'client' });
    const visitData = {
      id: 'v1',
      client_id: 'client-1',
      professionals: { profile_id: 'pro-profile' },
    };

    it('returns the visit when caller is the client', async () => {
      visitsRepo.findById.mockResolvedValue(visitData);
      const r = await service.findById('v1', owner);
      expect(r).toEqual(visitData);
    });
    it('returns the visit when caller is the professional', async () => {
      const proProfile = makeProfile({
        id: 'pro-profile',
        role: 'professional',
      });
      visitsRepo.findById.mockResolvedValue(visitData);
      const r = await service.findById('v1', proProfile);
      expect(r).toEqual(visitData);
    });
    it('throws NotFound when visit belongs to another user', async () => {
      visitsRepo.findById.mockResolvedValue(visitData);
      await expect(service.findById('v1', stranger)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
    it('throws NotFound when visit does not exist', async () => {
      visitsRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing', owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('book', () => {
    const validInput = {
      professionalId: '12345678-1234-4234-8234-123456789012',
      scheduledAt: '2026-05-01T17:00:00.000Z',
      street: 'Rua Teste',
      streetNumber: '1',
      neighborhood: 'Centro',
      cityName: 'São Paulo',
      stateCode: 'SP',
      requesterName: 'Carlos',
      serviceType: 'Elétrica',
      description: 'Preciso instalar tomadas novas no escritório',
      address: 'Rua Teste, 1',
    };

    beforeEach(() => {
      professionalsRepo.findById.mockResolvedValue({
        id: 'pro-1',
        profile_id: 'pro-profile-1',
      });
    });

    it('creates the visit with sanitized payload', async () => {
      visitsRepo.create.mockResolvedValue({ id: 'v-new' });
      const result = await service.book(makeProfile(), validInput);
      expect(visitsRepo.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        professionalId: validInput.professionalId,
        scheduledAt: validInput.scheduledAt,
        street: validInput.street,
        streetNumber: validInput.streetNumber,
        complement: undefined,
        neighborhood: validInput.neighborhood,
        cityName: validInput.cityName,
        stateCode: 'SP',
        requesterName: validInput.requesterName,
        serviceType: validInput.serviceType,
        description: validInput.description,
        address: validInput.address,
        notes: undefined,
      });
      expect(result).toEqual({ id: 'v-new' });
    });

    it('translates unique-constraint (double booking) to Conflict', async () => {
      const err = Object.assign(new Error('duplicate'), { code: '23505' });
      visitsRepo.create.mockRejectedValue(err);
      await expect(service.book(makeProfile(), validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows non-constraint errors', async () => {
      visitsRepo.create.mockRejectedValue(new Error('boom'));
      await expect(service.book(makeProfile(), validInput)).rejects.toThrow(
        /boom/,
      );
    });

    it('rejects invalid Zod payload', async () => {
      await expect(service.book(makeProfile(), {})).rejects.toThrow();
      expect(visitsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    const proProfile = makeProfile({ id: 'pro-profile', role: 'professional' });
    const visitData = {
      id: 'v1',
      client_id: 'client-1',
      professional_id: 'pro-id',
      status: 'pending',
      address: 'Rua Teste, 1',
      professionals: { profile_id: 'pro-profile' },
    };

    it('confirms visit and creates a work record', async () => {
      visitsRepo.findById.mockResolvedValue(visitData);
      visitsRepo.updateStatus.mockResolvedValue({
        ...visitData,
        status: 'confirmed',
      });
      const result = await service.accept('v1', proProfile);
      expect(visitsRepo.updateStatus).toHaveBeenCalledWith('v1', 'confirmed');
      expect(worksRepo.createFromVisit).toHaveBeenCalledWith({
        id: 'v1',
        client_id: 'client-1',
        professional_id: 'pro-id',
        address: 'Rua Teste, 1',
      });
      expect(result.status).toBe('confirmed');
    });

    it('throws Conflict when visit is not pending', async () => {
      visitsRepo.findById.mockResolvedValue({
        ...visitData,
        status: 'confirmed',
      });
      await expect(service.accept('v1', proProfile)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(worksRepo.createFromVisit).not.toHaveBeenCalled();
    });

    it('throws Forbidden when caller is not the visit professional', async () => {
      const stranger = makeProfile({ id: 'other-pro', role: 'professional' });
      visitsRepo.findById.mockResolvedValue(visitData);
      await expect(service.accept('v1', stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(worksRepo.createFromVisit).not.toHaveBeenCalled();
    });

    it('throws NotFound when visit does not exist', async () => {
      visitsRepo.findById.mockResolvedValue(null);
      await expect(service.accept('v1', proProfile)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('is idempotent — createFromVisit always called (ON CONFLICT handles dedup)', async () => {
      visitsRepo.findById.mockResolvedValue(visitData);
      visitsRepo.updateStatus.mockResolvedValue({
        ...visitData,
        status: 'confirmed',
      });
      await service.accept('v1', proProfile);
      await service.accept('v1', proProfile);
      expect(worksRepo.createFromVisit).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel', () => {
    it('transitions confirmed → cancelled', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'confirmed' });
      visitsRepo.updateStatus.mockResolvedValue({
        id: 'v1',
        status: 'cancelled',
      });
      await service.cancel('v1', makeProfile());
      expect(visitsRepo.updateStatus).toHaveBeenCalledWith(
        'v1',
        'cancelled',
        'client-1',
      );
    });

    it('throws NotFound when visit does not exist', async () => {
      visitsRepo.findById.mockResolvedValue(null);
      await expect(service.cancel('v1', makeProfile())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Conflict when visit is not confirmed', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'completed' });
      await expect(service.cancel('v1', makeProfile())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('complete', () => {
    it('only professional can complete', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'confirmed' });
      await expect(service.complete('v1', 'client')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('professional transitions confirmed → completed', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'confirmed' });
      visitsRepo.updateStatus.mockResolvedValue({
        id: 'v1',
        status: 'completed',
      });
      await service.complete('v1', 'professional');
      expect(visitsRepo.updateStatus).toHaveBeenCalledWith('v1', 'completed');
    });

    it('rejects completing a non-confirmed visit', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'cancelled' });
      await expect(
        service.complete('v1', 'professional'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns empty array when professional has no availability', async () => {
      availabilityRepo.findByProfessional.mockResolvedValue([]);
      visitsRepo.findActiveByProfessional.mockResolvedValue([]);
      const r = await service.getAvailableSlots('pro-1');
      expect(r).toEqual([]);
    });

    it('excludes already-booked datetimes', async () => {
      // Availability: all weekdays 08:00-12:00 ensures a slot whatever day we pick.
      // Using BRT (-03:00) to match the service's TIMEZONE_OFFSET constant —
      // keeps the test timezone-independent so CI (UTC) and local (BRT) agree.
      availabilityRepo.findByProfessional.mockResolvedValue(
        [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          start_time: '08:00',
          end_time: '12:00',
        })),
      );

      // Pick a date 3 days out; book 09:00 BRT on it.
      const target = new Date();
      target.setDate(target.getDate() + 3);
      const dateStr = target.toISOString().split('T')[0];
      const bookedIso = new Date(`${dateStr}T09:00:00-03:00`).toISOString();

      visitsRepo.findActiveByProfessional.mockResolvedValue([
        { scheduled_at: bookedIso },
      ]);

      const r = await service.getAvailableSlots('pro-1');
      const entry = r.find((d) => d.date === dateStr);
      expect(entry).toBeDefined();
      expect(entry?.times).toContain('08:00');
      expect(entry?.times).not.toContain('09:00');
    });
  });
});
