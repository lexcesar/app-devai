import { z } from 'zod';
export declare const SearchProfessionalsSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    service: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type SearchProfessionalsInput = z.infer<typeof SearchProfessionalsSchema>;
/**
 * Validated when activating professional profile.
 * bio is required and must meet the minimum length for publication.
 */
export declare const ActivateProfessionalSchema: z.ZodObject<{
    specialty: z.ZodString;
    bio: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ActivateProfessionalInput = z.infer<typeof ActivateProfessionalSchema>;
/**
 * Validated when updating professional profile (all fields optional).
 * If bio is provided it must still meet the minimum length.
 */
export declare const UpdateProfessionalSchema: z.ZodObject<{
    specialty: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateProfessionalInput = z.infer<typeof UpdateProfessionalSchema>;
export declare const OpenConversationSchema: z.ZodObject<{
    professionalProfileId: z.ZodString;
}, z.core.$strip>;
export type OpenConversationInput = z.infer<typeof OpenConversationSchema>;
export declare const SendMessageSchema: z.ZodObject<{
    conversationId: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export declare const CreateMaterialListSchema: z.ZodObject<{
    conversationId: z.ZodString;
}, z.core.$strip>;
export type CreateMaterialListInput = z.infer<typeof CreateMaterialListSchema>;
export declare const AddMaterialItemSchema: z.ZodObject<{
    materialListId: z.ZodString;
    name: z.ZodString;
    quantity: z.ZodCoercedNumber<unknown>;
    unit: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type AddMaterialItemInput = z.infer<typeof AddMaterialItemSchema>;
export declare const CreateOrderSchema: z.ZodObject<{
    storeId: z.ZodString;
    materialListId: z.ZodOptional<z.ZodString>;
    totalAmount: z.ZodCoercedNumber<unknown>;
    orderNumber: z.ZodString;
}, z.core.$strip>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export declare const SetAvailabilitySchema: z.ZodObject<{
    slots: z.ZodArray<z.ZodObject<{
        weekday: z.ZodNumber;
        start_time: z.ZodString;
        end_time: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>;
export declare const BookVisitSchema: z.ZodObject<{
    professionalId: z.ZodString;
    scheduledAt: z.ZodString;
    street: z.ZodString;
    streetNumber: z.ZodString;
    complement: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodString;
    cityName: z.ZodString;
    stateCode: z.ZodString;
    requesterName: z.ZodString;
    serviceType: z.ZodString;
    description: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BookVisitInput = z.infer<typeof BookVisitSchema>;
export declare const RejectVisitSchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strip>;
export type RejectVisitInput = z.infer<typeof RejectVisitSchema>;
export declare const UpdateProfileSchema: z.ZodObject<{
    full_name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    avatar_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export declare const CreateReviewSchema: z.ZodObject<{
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
