import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { WorksController } from './works.controller';
import { WorksRepository } from './works.repository';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import { OwnershipService } from '../../core/authorization/ownership.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import type {
  Profile,
  AccountContext,
  WorkFull,
  ProfessionalWithProfile,
} from '@obrafacil/shared';

describe('WorksController', () => {
  let controller: WorksController;
  let worksRepo: jest.Mocked<WorksRepository>;
  let professionalsRepo: jest.Mocked<ProfessionalsRepository>;

  const mockProfile: Profile = {
    id: 'profile-id',
    clerk_id: 'clerk-id',
    full_name: 'Test User',
    avatar_url: null,
    avatar_id: null,
    phone: null,
    role: 'client',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAccount: AccountContext = {
    profile: mockProfile,
    roles: ['client'],
    actingAs: 'client',
  };

  const mockProfessional: ProfessionalWithProfile = {
    id: 'prof-id',
    profile_id: 'profile-id',
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

  const mockWork: WorkFull = {
    id: 'work-id',
    client_id: 'profile-id',
    professional_id: 'prof-id',
    title: 'Test Work',
    status: 'active',
    progress_pct: 50,
    next_step: null,
    photos: [],
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    professionals: mockProfessional,
    client: mockProfile,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorksController],
      providers: [
        {
          provide: WorksRepository,
          useValue: {
            findAllByClient: jest.fn(),
            findAllByProfessional: jest.fn(),
            findById: jest.fn(),
            updateProgress: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: ProfessionalsRepository,
          useValue: {
            findByProfileId: jest.fn(),
          },
        },
        OwnershipService,
        {
          provide: NotificationsService,
          useValue: { notify: jest.fn() },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorksController>(WorksController);
    worksRepo = module.get(WorksRepository);
    professionalsRepo = module.get(ProfessionalsRepository);
  });

  describe('findAll', () => {
    it('should return works for client when role is client', async () => {
      worksRepo.findAllByClient.mockResolvedValue([mockWork]);
      const result = await controller.findAll(mockAccount);
      expect(result).toEqual([mockWork]);
      expect(worksRepo.findAllByClient).toHaveBeenCalledWith(mockProfile.id);
    });

    it('should return works for professional when role is professional', async () => {
      const proAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'professional',
      };
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);
      worksRepo.findAllByProfessional.mockResolvedValue([mockWork]);

      const result = await controller.findAll(proAccount);
      expect(result).toEqual([mockWork]);
      expect(professionalsRepo.findByProfileId).toHaveBeenCalledWith(
        mockProfile.id,
      );
      expect(worksRepo.findAllByProfessional).toHaveBeenCalledWith(
        mockProfessional.id,
      );
    });

    it('should return empty array if professional profile is not found', async () => {
      const proAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'professional',
      };
      professionalsRepo.findByProfileId.mockResolvedValue(null);

      const result = await controller.findAll(proAccount);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a work if caller is the client owner', async () => {
      worksRepo.findById.mockResolvedValue(mockWork);
      // mockProfile.id === mockWork.client_id === 'profile-id'
      const result = await controller.findOne('work-id', mockAccount);
      expect(result).toEqual(mockWork);
    });

    it('should return a work if caller is the professional', async () => {
      const proAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'professional',
      };
      worksRepo.findById.mockResolvedValue(mockWork);
      // mockWork.professionals.profiles.id === 'profile-id' === proAccount.profile.id
      const result = await controller.findOne('work-id', proAccount);
      expect(result).toEqual(mockWork);
    });

    it('should throw NotFoundException if work belongs to another user', async () => {
      const strangerAccount: AccountContext = {
        profile: { ...mockProfile, id: 'stranger-id' },
        roles: ['client'],
        actingAs: 'client',
      };
      worksRepo.findById.mockResolvedValue(mockWork);
      await expect(
        controller.findOne('work-id', strangerAccount),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if not found', async () => {
      worksRepo.findById.mockResolvedValue(null);
      await expect(controller.findOne('unknown', mockAccount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProgress', () => {
    it('should update progress if professional is authorized', async () => {
      const proAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'professional',
      };
      worksRepo.findById.mockResolvedValue(mockWork);
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);
      worksRepo.updateProgress.mockResolvedValue({
        ...mockWork,
        progress_pct: 75,
      });
      const result = await controller.updateProgress('work-id', proAccount, {
        progressPct: 75,
      });
      expect(result.progress_pct).toBe(75);
    });

    it('should throw BadRequestException if progressPct is invalid', async () => {
      await expect(
        controller.updateProgress('id', mockAccount, { progressPct: 150 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not a professional', async () => {
      worksRepo.findById.mockResolvedValue(mockWork);
      await expect(
        controller.updateProgress('work-id', mockAccount, { progressPct: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('status transitions', () => {
    const proAccount: AccountContext = {
      ...mockAccount,
      actingAs: 'professional',
    };

    it('should start a scheduled work', async () => {
      const scheduledWork = { ...mockWork, status: 'scheduled' as const };
      worksRepo.findById.mockResolvedValue(scheduledWork);
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);
      worksRepo.updateStatus.mockResolvedValue({
        ...scheduledWork,
        status: 'active',
      });
      await controller.start('work-id', proAccount);
      expect(worksRepo.updateStatus).toHaveBeenCalledWith('work-id', 'active');
    });

    it('should throw ConflictException when starting a non-scheduled work', async () => {
      worksRepo.findById.mockResolvedValue(mockWork); // active
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);

      await expect(controller.start('work-id', proAccount)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should complete an active work', async () => {
      worksRepo.findById.mockResolvedValue(mockWork); // active
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);
      worksRepo.updateStatus.mockResolvedValue({
        ...mockWork,
        status: 'completed',
      });
      await controller.complete('work-id', proAccount);
      expect(worksRepo.updateStatus).toHaveBeenCalledWith(
        'work-id',
        'completed',
      );
    });

    it('should throw ConflictException when completing a non-active work', async () => {
      const scheduledWork = { ...mockWork, status: 'scheduled' as const };
      worksRepo.findById.mockResolvedValue(scheduledWork);
      professionalsRepo.findByProfileId.mockResolvedValue(mockProfessional);

      await expect(controller.complete('work-id', proAccount)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
