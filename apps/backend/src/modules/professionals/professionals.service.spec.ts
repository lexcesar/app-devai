import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import type { ProfessionalWithProfile } from '@obrafacil/shared';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let repo: jest.Mocked<ProfessionalsRepository>;

  const mockProfessional: ProfessionalWithProfile = {
    id: 'prof-1',
    profile_id: 'profile-1',
    specialty: 'eletricista',
    bio: 'Expert',
    rating_avg: 4.5,
    jobs_completed: 20,
    is_verified: true,
    latitude: null,
    longitude: null,
    visibility_status: 'active',
    display_name: null,
    city: null,
    published_at: null,
    created_at: new Date().toISOString(),
    profiles: {
      id: 'profile-1',
      clerk_id: 'clerk-1',
      full_name: 'Alex Pro',
      avatar_url: null,
      avatar_id: null,
      phone: null,
      role: 'professional',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        {
          provide: ProfessionalsRepository,
          useValue: {
            search: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfessionalsService>(ProfessionalsService);
    repo = module.get(ProfessionalsRepository);
  });

  describe('search', () => {
    it('should return professionals and total count', async () => {
      repo.search.mockResolvedValue([mockProfessional]);
      const input = { q: 'Alex', limit: 10 };
      const result = await service.search(input);

      expect(result.professionals).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repo.search).toHaveBeenCalledWith({
        query: 'Alex',
        limit: 10,
        offset: 0,
        service: undefined,
        city: undefined,
      });
    });

    it('should throw Zod error for invalid input', async () => {
      const invalidInput = { limit: 'not-a-number' };
      await expect(service.search(invalidInput)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return professional if found', async () => {
      repo.findById.mockResolvedValue(mockProfessional);
      const result = await service.findById('prof-1');
      expect(result).toEqual(mockProfessional);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
