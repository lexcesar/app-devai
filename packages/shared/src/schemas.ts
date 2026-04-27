import { z } from 'zod';
import { MIN_BIO_LENGTH } from './visibility';

// ── Professionals ────────────────────────────────────────────────────────────

export const SearchProfessionalsSchema = z.object({
  q: z.string().optional(),
  service: z.string().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchProfessionalsInput = z.infer<typeof SearchProfessionalsSchema>;

/**
 * Validated when activating professional profile.
 * bio is required and must meet the minimum length for publication.
 */
export const ActivateProfessionalSchema = z.object({
  specialty: z.string().min(2).max(100),
  bio: z
    .string()
    .min(MIN_BIO_LENGTH, `Bio deve ter no mínimo ${MIN_BIO_LENGTH} caracteres`)
    .max(500),
  city: z.string().max(100).optional(),
  display_name: z.string().max(100).optional(),
});

export type ActivateProfessionalInput = z.infer<typeof ActivateProfessionalSchema>;

/**
 * Validated when updating professional profile (all fields optional).
 * If bio is provided it must still meet the minimum length.
 */
export const UpdateProfessionalSchema = z.object({
  specialty: z.string().min(2).max(100).optional(),
  bio: z
    .string()
    .min(MIN_BIO_LENGTH, `Bio deve ter no mínimo ${MIN_BIO_LENGTH} caracteres`)
    .max(500)
    .optional(),
  city: z.string().max(100).optional(),
  display_name: z.string().max(100).optional(),
});

export type UpdateProfessionalInput = z.infer<typeof UpdateProfessionalSchema>;

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
  // Structured address (required for new bookings)
  street: z.string().min(1, 'Rua obrigatória').max(200),
  streetNumber: z.string().min(1, 'Número obrigatório').max(20),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(1, 'Bairro obrigatório').max(100),
  cityName: z.string().min(1, 'Cidade obrigatória').max(100),
  stateCode: z.string().length(2, 'Estado deve ter 2 caracteres').toUpperCase(),
  // Booking metadata
  requesterName: z.string().min(1, 'Nome do solicitante obrigatório').max(100),
  serviceType: z.string().min(1, 'Tipo de serviço obrigatório').max(100),
  description: z.string().min(10, 'Descreva o problema (mín. 10 caracteres)').max(1000),
  // Deprecated — kept for backward compatibility
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type BookVisitInput = z.infer<typeof BookVisitSchema>;

export const RejectVisitSchema = z.object({
  reason: z.string().min(1, 'Motivo obrigatório').max(500),
});

export type RejectVisitInput = z.infer<typeof RejectVisitSchema>;

// ── Profile ─────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Nome obrigatório').max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar_id: z.string().max(100).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ── Reviews ──────────────────────────────────────────────────────────────────

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Selecione uma nota para continuar.').max(5),
  comment: z.string().max(1000, 'Comentário muito longo (máx. 1000 caracteres)').optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
