import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import type { Profile } from '@obrafacil/shared';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'client-1',
    clerk_id: 'c1',
    full_name: 'Carlos',
    avatar_url: null,
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
    service = new VisitsService(availabilityRepo as never, visitsRepo as never);
  });

  describe('findAll', () => {
    it('routes professional to findAllByProfessional', async () => {
      visitsRepo.findAllByProfessional.mockResolvedValue([{ id: 'v1' }]);
      const result = await service.findAll(
        makeProfile({ role: 'professional' }),
      );
      expect(visitsRepo.findAllByProfessional).toHaveBeenCalledWith('client-1');
      expect(visitsRepo.findAllByClient).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'v1' }]);
    });

    it('routes client to findAllByClient', async () => {
      visitsRepo.findAllByClient.mockResolvedValue([]);
      await service.findAll(makeProfile({ role: 'client' }));
      expect(visitsRepo.findAllByClient).toHaveBeenCalledWith('client-1');
      expect(visitsRepo.findAllByProfessional).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the visit when found', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1' });
      const r = await service.findById('v1');
      expect(r).toEqual({ id: 'v1' });
    });
    it('throws NotFound when missing', async () => {
      visitsRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('book', () => {
    const validInput = {
      professionalId: '12345678-1234-4234-8234-123456789012',
      scheduledAt: '2026-05-01T17:00:00.000Z',
      address: 'Rua Teste, 1',
    };

    it('creates the visit with sanitized payload', async () => {
      visitsRepo.create.mockResolvedValue({ id: 'v-new' });
      const result = await service.book('client-1', validInput);
      expect(visitsRepo.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        professionalId: validInput.professionalId,
        scheduledAt: validInput.scheduledAt,
        address: validInput.address,
        notes: undefined,
      });
      expect(result).toEqual({ id: 'v-new' });
    });

    it('translates unique-constraint (double booking) to Conflict', async () => {
      const err = Object.assign(new Error('duplicate'), { code: '23505' });
      visitsRepo.create.mockRejectedValue(err);
      await expect(service.book('client-1', validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows non-constraint errors', async () => {
      visitsRepo.create.mockRejectedValue(new Error('boom'));
      await expect(service.book('client-1', validInput)).rejects.toThrow(
        /boom/,
      );
    });

    it('rejects invalid Zod payload', async () => {
      await expect(service.book('client-1', {})).rejects.toThrow();
      expect(visitsRepo.create).not.toHaveBeenCalled();
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
      await expect(
        service.complete('v1', makeProfile({ role: 'client' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('professional transitions confirmed → completed', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'confirmed' });
      visitsRepo.updateStatus.mockResolvedValue({
        id: 'v1',
        status: 'completed',
      });
      await service.complete('v1', makeProfile({ role: 'professional' }));
      expect(visitsRepo.updateStatus).toHaveBeenCalledWith('v1', 'completed');
    });

    it('rejects completing a non-confirmed visit', async () => {
      visitsRepo.findById.mockResolvedValue({ id: 'v1', status: 'cancelled' });
      await expect(
        service.complete('v1', makeProfile({ role: 'professional' })),
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
