import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

describe('OrdersService', () => {
  let repo: {
    findAllByProfile: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let service: OrdersService;

  beforeEach(() => {
    repo = {
      findAllByProfile: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    service = new OrdersService(repo as unknown as OrdersRepository);
  });

  describe('findAllByProfile', () => {
    it('delegates to repository with the given profileId', async () => {
      const fake = [{ id: 'o1' }, { id: 'o2' }];
      repo.findAllByProfile.mockResolvedValue(fake);

      const result = await service.findAllByProfile('profile-a');

      expect(repo.findAllByProfile).toHaveBeenCalledWith('profile-a');
      expect(result).toBe(fake);
    });

    it('never leaks orders across profiles (unit contract)', async () => {
      repo.findAllByProfile.mockImplementation((pid: string) =>
        Promise.resolve([{ id: `o-${pid}`, client_id: pid }]),
      );

      const a = await service.findAllByProfile('A');
      const b = await service.findAllByProfile('B');

      expect(a.every((o) => o.client_id === 'A')).toBe(true);
      expect(b.every((o) => o.client_id === 'B')).toBe(true);
    });
  });

  describe('create', () => {
    it('validates input with Zod and forwards to repository', async () => {
      const created = { id: 'new-order' };
      repo.create.mockResolvedValue(created);

      const input = {
        storeId: '41d4e3b8-2c5f-4b7a-9c8e-1a2b3c4d5e6f',
        totalAmount: 150.5,
        orderNumber: '99001',
      };

      const result = await service.create('client-1', input);

      expect(repo.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        storeId: input.storeId,
        materialListId: undefined,
        totalAmount: input.totalAmount,
        orderNumber: input.orderNumber,
      });
      expect(result).toBe(created);
    });

    it('rejects invalid payload (missing required fields)', async () => {
      await expect(
        service.create('client-1', { totalAmount: 10 }),
      ).rejects.toThrow();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('forwards optional materialListId when present', async () => {
      repo.create.mockResolvedValue({ id: 'ok' });
      await service.create('client-1', {
        storeId: '41d4e3b8-2c5f-4b7a-9c8e-1a2b3c4d5e6f',
        materialListId: '72d4e3b8-2c5f-4b7a-9c8e-1a2b3c4d5e6f',
        totalAmount: 99,
        orderNumber: '99002',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          materialListId: '72d4e3b8-2c5f-4b7a-9c8e-1a2b3c4d5e6f',
        }),
      );
    });
  });
});
