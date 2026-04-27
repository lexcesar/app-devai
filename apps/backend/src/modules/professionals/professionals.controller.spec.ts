import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import { DatabaseService } from '../../database/database.service';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import type {
  AccountContext,
  Profile,
  ProfessionalWithProfile,
} from '@obrafacil/shared';

describe('ProfessionalsController', () => {
  let controller: ProfessionalsController;
  let repo: jest.Mocked<ProfessionalsRepository>;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;
  let service: jest.Mocked<ProfessionalsService>;

  const mockProfile: Profile = {
    id: 'profile-uuid',
    clerk_id: 'clerk-001',
    full_name: 'Jackson Miranda',
    avatar_url: null,
    avatar_id: null,
    phone: null,
    role: 'professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAccount: AccountContext = {
    profile: mockProfile,
    roles: ['client', 'professional'],
    actingAs: 'professional',
  };

  const mockProfessional: ProfessionalWithProfile = {
    id: 'pro-uuid',
    profile_id: 'profile-uuid',
    specialty: 'Marceneiro',
    bio: 'Marceneiro com 10 anos de experiência em reformas.',
    rating_avg: 0,
    jobs_completed: 0,
    is_verified: false,
    latitude: null,
    longitude: null,
    visibility_status: 'active',
    display_name: null,
    city: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    profiles: mockProfile,
  };

  beforeEach(async () => {
    const dbMock = { query: jest.fn() };
    const repoMock = {
      findByProfileId: jest.fn(),
      findById: jest.fn(),
      search: jest.fn(),
      findByClerkId: jest.fn(),
      findByIdWithReviews: jest.fn(),
    };
    const serviceMock = {
      search: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalsController],
      providers: [
        { provide: ProfessionalsService, useValue: serviceMock },
        { provide: ProfessionalsRepository, useValue: repoMock },
        { provide: DatabaseService, useValue: dbMock },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfessionalsController>(ProfessionalsController);
    repo = module.get(ProfessionalsRepository);
    db = module.get(DatabaseService);
    service = module.get(ProfessionalsService);
  });

  // ── GET /me ───────────────────────────────────────────────────────────────

  describe('getMyProfile', () => {
    it('returns the professional profile for the authenticated user', async () => {
      repo.findByProfileId.mockResolvedValue(mockProfessional);

      const result = await controller.getMyProfile(mockAccount);

      expect(result).toEqual(mockProfessional);
      expect(repo.findByProfileId).toHaveBeenCalledWith(mockProfile.id);
    });

    it('returns profile data regardless of actingAs context', async () => {
      const clientModeAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'client',
      };
      repo.findByProfileId.mockResolvedValue(mockProfessional);

      const result = await controller.getMyProfile(clientModeAccount);

      // Profile data is returned even when actingAs is 'client'
      expect(result.specialty).toBe('Marceneiro');
      expect(result.visibility_status).toBe('active');
    });

    it('throws NotFoundException when no professional profile exists', async () => {
      repo.findByProfileId.mockResolvedValue(null);

      await expect(controller.getMyProfile(mockAccount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── PUT /me ────────────────────────────────────────────────────────────────

  describe('updateMyProfile', () => {
    it('updates only supplied fields — does not clear unsupplied fields', async () => {
      repo.findByProfileId
        .mockResolvedValueOnce(mockProfessional) // initial fetch
        .mockResolvedValueOnce({
          // post-update fetch
          ...mockProfessional,
          bio: 'Nova bio com mais de 10 caracteres',
        });
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await controller.updateMyProfile(mockAccount, {
        bio: 'Nova bio com mais de 10 caracteres',
        // specialty is NOT supplied
      });

      // specialty must remain unchanged
      expect(result.specialty).toBe('Marceneiro');
      // bio must be updated
      expect(result.bio).toBe('Nova bio com mais de 10 caracteres');

      // Verify that the UPDATE query does NOT set specialty
      const allCalls: unknown[][] = (db.query as jest.Mock).mock
        .calls as unknown[][];
      const updateCall: unknown[] | undefined = allCalls.find((call) =>
        (call[0] as string).trim().startsWith('UPDATE professionals'),
      );
      expect(updateCall).toBeDefined();
      const updateSql = updateCall![0] as string;
      expect(updateSql).not.toMatch(/specialty\s*=/);
    });

    it('updates specialty without touching bio', async () => {
      repo.findByProfileId
        .mockResolvedValueOnce(mockProfessional)
        .mockResolvedValueOnce({
          ...mockProfessional,
          specialty: 'Pedreiro',
        });
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await controller.updateMyProfile(mockAccount, {
        specialty: 'Pedreiro',
      });

      expect(result.specialty).toBe('Pedreiro');
      expect(result.bio).toBe(mockProfessional.bio);
    });

    it('does not overwrite fields with null when they are not in the request body', async () => {
      repo.findByProfileId
        .mockResolvedValueOnce(mockProfessional)
        .mockResolvedValueOnce(mockProfessional);
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await controller.updateMyProfile(mockAccount, {}); // empty body

      // No UPDATE query should have been made since nothing changed
      const updateCalls = (db.query as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.trim().startsWith('UPDATE professionals'),
      );
      // Either no update, or the update doesn't null any field
      const nullingCalls = updateCalls.filter(
        ([sql]: [string]) => sql.includes('= null') || sql.includes('= NULL'),
      );
      expect(nullingCalls).toHaveLength(0);
    });

    it('throws NotFoundException when no professional profile exists', async () => {
      repo.findByProfileId.mockResolvedValue(null);

      await expect(
        controller.updateMyProfile(mockAccount, { specialty: 'Pedreiro' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws Zod error when bio is too short', async () => {
      repo.findByProfileId.mockResolvedValue(mockProfessional);

      await expect(
        controller.updateMyProfile(mockAccount, { bio: 'curto' }),
      ).rejects.toThrow();
    });
  });

  // ── GET / (search) ────────────────────────────────────────────────────────

  describe('search', () => {
    it('returns only active professionals', async () => {
      const activeResult = {
        professionals: [mockProfessional],
        total: 1,
      };
      service.search.mockResolvedValue(activeResult);

      const result = await controller.search({}, mockAccount);

      expect(result).toEqual(activeResult);
      expect(service.search).toHaveBeenCalledWith({}, mockProfile.id);
    });

    it('passes query params to the service', async () => {
      service.search.mockResolvedValue({ professionals: [], total: 0 });

      await controller.search({ q: 'Marceneiro', limit: '10' }, mockAccount);

      expect(service.search).toHaveBeenCalledWith(
        { q: 'Marceneiro', limit: '10' },
        mockProfile.id,
      );
    });
  });
});
