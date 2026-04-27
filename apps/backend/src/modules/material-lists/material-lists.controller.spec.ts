import { Test, TestingModule } from '@nestjs/testing';
import { MaterialListsController } from './material-lists.controller';
import { MaterialListsService } from './material-lists.service';
import { StoreOffersRepository } from './store-offers.repository';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Profile, MaterialList, AccountContext } from '@obrafacil/shared';

describe('MaterialListsController', () => {
  let controller: MaterialListsController;
  let service: jest.Mocked<MaterialListsService>;
  let storeOffersRepo: jest.Mocked<StoreOffersRepository>;
  let professionalsRepo: jest.Mocked<ProfessionalsRepository>;

  const mockProfile: Profile = {
    id: 'prof-1',
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

  const mockList: MaterialList = {
    id: 'list-1',
    conversation_id: 'conv-1',
    professional_id: 'prof-1',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialListsController],
      providers: [
        {
          provide: MaterialListsService,
          useValue: {
            findAllByProfessional: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            addItem: jest.fn(),
          },
        },
        {
          provide: StoreOffersRepository,
          useValue: {
            findByList: jest.fn(),
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

    controller = module.get<MaterialListsController>(MaterialListsController);
    service = module.get(MaterialListsService);
    storeOffersRepo = module.get(StoreOffersRepository);
    professionalsRepo = module.get(ProfessionalsRepository);
    professionalsRepo.findByProfileId.mockResolvedValue({
      id: 'prof-1',
      profile_id: mockProfile.id,
      specialty: '',
      bio: null,
      rating_avg: 0,
      jobs_completed: 0,
      is_verified: false,
      latitude: null,
      longitude: null,
      visibility_status: 'active',
      display_name: null,
      city: null,
      published_at: null,
      created_at: new Date().toISOString(),
    } as never);
  });

  describe('findAll', () => {
    it('should return all lists for professional', async () => {
      service.findAllByProfessional.mockResolvedValue([mockList]);
      const result = await controller.findAll(mockAccount);
      expect(result).toEqual([mockList]);
    });

    it('should throw ForbiddenException for clients', async () => {
      const clientAccount: AccountContext = {
        ...mockAccount,
        actingAs: 'client',
      };
      await expect(controller.findAll(clientAccount)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a list if caller is the owner', async () => {
      service.findById.mockResolvedValue(mockList);
      const result = await controller.findOne(mockAccount, 'list-1');
      expect(result).toEqual(mockList);
      expect(service.findById).toHaveBeenCalledWith('list-1', mockProfile.id);
    });

    it('should propagate NotFoundException when caller is not owner', async () => {
      service.findById.mockRejectedValue(
        new NotFoundException('Lista não encontrada'),
      );
      await expect(controller.findOne(mockAccount, 'list-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should delegate creation to service', async () => {
      service.create.mockResolvedValue(mockList);
      const body = { conversationId: 'conv-1' };
      const result = await controller.create(mockAccount, body);
      expect(result).toEqual(mockList);
      expect(service.create).toHaveBeenCalledWith(mockProfile.id, body);
    });
  });

  describe('getOffers', () => {
    it('should validate ownership then delegate to storeOffersRepo', async () => {
      service.findById.mockResolvedValue(mockList);
      storeOffersRepo.findByList.mockResolvedValue([]);
      await controller.getOffers(mockAccount, 'list-1');
      expect(service.findById).toHaveBeenCalledWith('list-1', mockProfile.id);
      expect(storeOffersRepo.findByList).toHaveBeenCalledWith('list-1');
    });

    it('should propagate NotFoundException when caller is not owner', async () => {
      service.findById.mockRejectedValue(
        new NotFoundException('Lista não encontrada'),
      );
      await expect(controller.getOffers(mockAccount, 'list-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
