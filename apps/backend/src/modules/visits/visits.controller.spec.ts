import { Test, TestingModule } from '@nestjs/testing';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { ForbiddenException } from '@nestjs/common';
import type {
  Profile,
  AccountContext,
  ProfessionalWithProfile,
  AvailabilitySlot,
  VisitFull,
} from '@obrafacil/shared';

describe('VisitsController', () => {
  let controller: VisitsController;
  let service: jest.Mocked<VisitsService>;
  let proRepo: jest.Mocked<ProfessionalsRepository>;

  const mockProfile: Profile = {
    id: 'user-1',
    clerk_id: 'clerk-1',
    full_name: 'Alex',
    avatar_url: null,
    avatar_id: null,
    phone: null,
    role: 'professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAccount: AccountContext = {
    profile: mockProfile,
    roles: ['professional'],
    actingAs: 'professional',
  };

  const mockPro: ProfessionalWithProfile = {
    id: 'pro-1',
    profile_id: 'user-1',
    specialty: 'eletricista',
    bio: null,
    rating_avg: 5,
    jobs_completed: 10,
    is_verified: true,
    latitude: null,
    longitude: null,
    visibility_status: 'active',
    display_name: null,
    city: null,
    published_at: null,
    created_at: new Date().toISOString(),
    profiles: mockProfile,
  };

  const mockVisit: VisitFull = {
    id: 'v1',
    client_id: 'client-1',
    professional_id: 'pro-1',
    scheduled_at: new Date().toISOString(),
    status: 'confirmed',
    street: null,
    street_number: null,
    complement: null,
    neighborhood: null,
    city_name: null,
    state_code: null,
    requester_name: null,
    service_type: null,
    description: null,
    address: 'Street 1, City',
    notes: 'Gate code 1234',
    cancelled_by: null,
    rejection_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    professionals: mockPro,
    client: {
      ...mockProfile,
      id: 'client-1',
      role: 'client',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitsController],
      providers: [
        {
          provide: VisitsService,
          useValue: {
            getMyAvailability: jest.fn(),
            setAvailability: jest.fn(),
            getAvailableSlots: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            book: jest.fn(),
            cancel: jest.fn(),
            complete: jest.fn(),
          },
        },
        {
          provide: ProfessionalsRepository,
          useValue: {
            findByProfileId: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VisitsController>(VisitsController);
    service = module.get(VisitsService);
    proRepo = module.get(ProfessionalsRepository);
  });

  describe('availability', () => {
    it('should get professional availability', async () => {
      proRepo.findByProfileId.mockResolvedValue(mockPro);
      service.getMyAvailability.mockResolvedValue([]);

      const result = await controller.getMyAvailability(mockAccount);
      expect(result).toEqual([]);
      expect(proRepo.findByProfileId).toHaveBeenCalledWith('user-1');
      expect(service.getMyAvailability).toHaveBeenCalledWith('pro-1');
    });

    it('should throw Forbidden if not professional', async () => {
      const clientAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'client',
      };
      await expect(controller.getMyAvailability(clientAccount)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw Forbidden if professional profile not found', async () => {
      proRepo.findByProfileId.mockResolvedValue(null);
      await expect(controller.getMyAvailability(mockAccount)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should set availability', async () => {
      proRepo.findByProfileId.mockResolvedValue(mockPro);
      service.setAvailability.mockResolvedValue([] as AvailabilitySlot[]);

      const result = await controller.setAvailability(mockAccount, []);
      expect(result).toEqual([]);
      expect(service.setAvailability).toHaveBeenCalledWith('pro-1', []);
    });
  });

  describe('visits', () => {
    it('should return all visits for a profile', async () => {
      service.findAll.mockResolvedValue([] as VisitFull[]);
      const result = await controller.findAll(mockAccount);
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith('user-1', 'professional');
    });

    it('should find one visit by id', async () => {
      service.findById.mockResolvedValue(mockVisit);
      const result = await controller.findOne('v1', mockAccount);
      expect(result).toEqual(mockVisit);
    });

    it('should allow clients to book visits', async () => {
      const clientAccount: AccountContext = {
        profile: { ...mockProfile, id: 'client-1', role: 'client' },
        roles: ['client'],
        actingAs: 'client',
      };
      service.book.mockResolvedValue(mockVisit);

      const result = await controller.book(clientAccount, {
        date: 'today',
      } as any);
      expect(result).toEqual(mockVisit);
      expect(service.book).toHaveBeenCalledWith('client-1', { date: 'today' });
    });

    it('should block professionals from booking visits', () => {
      expect(() => controller.book(mockAccount, {} as any)).toThrow(
        ForbiddenException,
      );
    });

    it('should cancel a visit', async () => {
      service.cancel.mockResolvedValue({ ...mockVisit, status: 'cancelled' });
      const result = await controller.cancel('v1', mockAccount, {});
      expect(result).toEqual({ ...mockVisit, status: 'cancelled' });
    });

    it('should complete a visit', async () => {
      service.complete.mockResolvedValue({ ...mockVisit, status: 'completed' });
      const result = await controller.complete('v1', mockAccount);
      expect(result).toEqual({ ...mockVisit, status: 'completed' });
    });
  });
});
