import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import type { Profile } from '@obrafacil/shared';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: jest.Mocked<MessagesService>;

  const mockProfile: Profile = {
    id: 'user-1',
    clerk_id: 'clerk-1',
    full_name: 'Alex',
    avatar_url: null,
    avatar_id: null,
    phone: null,
    role: 'client',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: {
            findByConversation: jest.fn(),
            send: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get(MessagesService);
  });

  describe('findAll', () => {
    it('should delegate to service', async () => {
      service.findByConversation.mockResolvedValue([]);
      const result = await controller.findAll('conv-1', mockProfile, '20');
      expect(result).toEqual([]);
      expect(service.findByConversation).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        20,
      );
    });

    it('should use default limit if not provided', async () => {
      service.findByConversation.mockResolvedValue([]);
      await controller.findAll('conv-1', mockProfile);
      expect(service.findByConversation).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        50,
      );
    });
  });

  describe('send', () => {
    it('should delegate to service', async () => {
      const body = { content: 'Oi' };
      service.send.mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        type: 'text',
        metadata: null,
        created_at: new Date().toISOString(),
        ...body,
      });
      const result = await controller.send('conv-1', mockProfile, body);
      expect(result.content).toBe('Oi');
      expect(service.send).toHaveBeenCalledWith('user-1', {
        content: 'Oi',
        conversationId: 'conv-1',
      });
    });
  });
});
