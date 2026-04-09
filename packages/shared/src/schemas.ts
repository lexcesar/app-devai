import { z } from 'zod';

// ── Professionals ────────────────────────────────────────────────────────────

export const SearchProfessionalsSchema = z.object({
  q: z.string().optional(),
  service: z.string().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchProfessionalsInput = z.infer<typeof SearchProfessionalsSchema>;

// ── Conversations ────────────────────────────────────────────────────────────

// Accept any 8-4-4-4-12 UUID format (including non-RFC-4122 demo seed values)
const uuidLike = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID format',
);

export const OpenConversationSchema = z.object({
  professionalProfileId: uuidLike,
});

export type OpenConversationInput = z.infer<typeof OpenConversationSchema>;

// ── Messages ─────────────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

// ── Material Lists ───────────────────────────────────────────────────────────

export const CreateMaterialListSchema = z.object({
  conversationId: z.string().uuid(),
});

export type CreateMaterialListInput = z.infer<typeof CreateMaterialListSchema>;

export const AddMaterialItemSchema = z.object({
  materialListId: z.string().uuid(),
  name: z.string().min(1).max(200),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(20).default('un'),
});

export type AddMaterialItemInput = z.infer<typeof AddMaterialItemSchema>;

// ── Orders ───────────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  storeId: z.string().uuid(),
  materialListId: z.string().uuid().optional(),
  totalAmount: z.coerce.number().positive(),
  orderNumber: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ── Availability / Visits ───────────────────────────────────────────────────

export const SetAvailabilitySchema = z.object({
  slots: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  })),
});

export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>;

export const BookVisitSchema = z.object({
  professionalId: uuidLike,
  scheduledAt: z.string().datetime(),
  address: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type BookVisitInput = z.infer<typeof BookVisitSchema>;
