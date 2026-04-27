"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateReviewSchema = exports.UpdateProfileSchema = exports.RejectVisitSchema = exports.BookVisitSchema = exports.SetAvailabilitySchema = exports.CreateOrderSchema = exports.AddMaterialItemSchema = exports.CreateMaterialListSchema = exports.SendMessageSchema = exports.OpenConversationSchema = exports.UpdateProfessionalSchema = exports.ActivateProfessionalSchema = exports.SearchProfessionalsSchema = void 0;
const zod_1 = require("zod");
const visibility_1 = require("./visibility");
// ── Professionals ────────────────────────────────────────────────────────────
exports.SearchProfessionalsSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    service: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
/**
 * Validated when activating professional profile.
 * bio is required and must meet the minimum length for publication.
 */
exports.ActivateProfessionalSchema = zod_1.z.object({
    specialty: zod_1.z.string().min(2).max(100),
    bio: zod_1.z
        .string()
        .min(visibility_1.MIN_BIO_LENGTH, `Bio deve ter no mínimo ${visibility_1.MIN_BIO_LENGTH} caracteres`)
        .max(500),
    city: zod_1.z.string().max(100).optional(),
    display_name: zod_1.z.string().max(100).optional(),
});
/**
 * Validated when updating professional profile (all fields optional).
 * If bio is provided it must still meet the minimum length.
 */
exports.UpdateProfessionalSchema = zod_1.z.object({
    specialty: zod_1.z.string().min(2).max(100).optional(),
    bio: zod_1.z
        .string()
        .min(visibility_1.MIN_BIO_LENGTH, `Bio deve ter no mínimo ${visibility_1.MIN_BIO_LENGTH} caracteres`)
        .max(500)
        .optional(),
    city: zod_1.z.string().max(100).optional(),
    display_name: zod_1.z.string().max(100).optional(),
});
// ── Conversations ────────────────────────────────────────────────────────────
// Accept any 8-4-4-4-12 UUID format (including non-RFC-4122 demo seed values)
const uuidLike = zod_1.z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID format');
exports.OpenConversationSchema = zod_1.z.object({
    professionalProfileId: uuidLike,
});
// ── Messages ─────────────────────────────────────────────────────────────────
exports.SendMessageSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1).max(5000),
});
// ── Material Lists ───────────────────────────────────────────────────────────
exports.CreateMaterialListSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid(),
});
exports.AddMaterialItemSchema = zod_1.z.object({
    materialListId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(200),
    quantity: zod_1.z.coerce.number().positive(),
    unit: zod_1.z.string().min(1).max(20).default('un'),
});
// ── Orders ───────────────────────────────────────────────────────────────────
exports.CreateOrderSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid(),
    materialListId: zod_1.z.string().uuid().optional(),
    totalAmount: zod_1.z.coerce.number().positive(),
    orderNumber: zod_1.z.string().min(1),
});
// ── Availability / Visits ───────────────────────────────────────────────────
exports.SetAvailabilitySchema = zod_1.z.object({
    slots: zod_1.z.array(zod_1.z.object({
        weekday: zod_1.z.number().int().min(0).max(6),
        start_time: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
        end_time: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    })),
});
exports.BookVisitSchema = zod_1.z.object({
    professionalId: uuidLike,
    scheduledAt: zod_1.z.string().datetime(),
    // Structured address (required for new bookings)
    street: zod_1.z.string().min(1, 'Rua obrigatória').max(200),
    streetNumber: zod_1.z.string().min(1, 'Número obrigatório').max(20),
    complement: zod_1.z.string().max(100).optional(),
    neighborhood: zod_1.z.string().min(1, 'Bairro obrigatório').max(100),
    cityName: zod_1.z.string().min(1, 'Cidade obrigatória').max(100),
    stateCode: zod_1.z.string().length(2, 'Estado deve ter 2 caracteres').toUpperCase(),
    // Booking metadata
    requesterName: zod_1.z.string().min(1, 'Nome do solicitante obrigatório').max(100),
    serviceType: zod_1.z.string().min(1, 'Tipo de serviço obrigatório').max(100),
    description: zod_1.z.string().min(10, 'Descreva o problema (mín. 10 caracteres)').max(1000),
    // Deprecated — kept for backward compatibility
    address: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.RejectVisitSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, 'Motivo obrigatório').max(500),
});
// ── Profile ─────────────────────────────────────────────────────────────────
exports.UpdateProfileSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(1, 'Nome obrigatório').max(100).optional(),
    phone: zod_1.z.string().max(20).optional(),
    avatar_id: zod_1.z.string().max(100).nullable().optional(),
});
// ── Reviews ──────────────────────────────────────────────────────────────────
exports.CreateReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1, 'Selecione uma nota para continuar.').max(5),
    comment: zod_1.z.string().max(1000, 'Comentário muito longo (máx. 1000 caracteres)').optional(),
});
