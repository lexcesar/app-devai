export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type UserRole = 'client' | 'professional' | 'store';
export type MessageType = 'text' | 'image' | 'audio' | 'material_list';
export type MaterialListStatus = 'draft' | 'sent' | 'quoted';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';
export type WorkStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type VisitStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
/**
 * Lifecycle status of a professional profile.
 * - draft    — created but missing required fields; hidden from public listings
 * - active   — all required fields present; visible in home/search/detail
 * - inactive — explicitly deactivated by the user; hidden; data preserved
 */
export type ProfessionalVisibilityStatus = 'draft' | 'active' | 'inactive';
/** An active role entry from account_roles table */
export interface AccountRole {
    id: string;
    profile_id: string;
    role: UserRole;
    is_active: boolean;
    is_primary: boolean;
    activated_at: string;
}
/**
 * Full account context attached to every authenticated request.
 * - `profile`   — the profile row for this Clerk user
 * - `roles`     — list of active roles for this account
 * - `actingAs`  — resolved role from X-Acting-As header (or primary fallback)
 */
export interface AccountContext {
    profile: Profile;
    roles: UserRole[];
    actingAs: UserRole;
}
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    clerk_id: string;
                    full_name: string;
                    avatar_id: string | null;
                    avatar_url: string | null;
                    phone: string | null;
                    role: UserRole;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    clerk_id: string;
                    full_name: string;
                    avatar_id?: string | null;
                    avatar_url?: string | null;
                    phone?: string | null;
                    role?: UserRole;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
                Relationships: never[];
            };
            professionals: {
                Row: {
                    id: string;
                    profile_id: string;
                    specialty: string;
                    bio: string | null;
                    rating_avg: number;
                    jobs_completed: number;
                    is_verified: boolean;
                    latitude: number | null;
                    longitude: number | null;
                    visibility_status: ProfessionalVisibilityStatus;
                    display_name: string | null;
                    city: string | null;
                    published_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    profile_id: string;
                    specialty: string;
                    bio?: string | null;
                    rating_avg?: number;
                    jobs_completed?: number;
                    is_verified?: boolean;
                    latitude?: number | null;
                    longitude?: number | null;
                    visibility_status?: ProfessionalVisibilityStatus;
                    display_name?: string | null;
                    city?: string | null;
                    published_at?: string | null;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['professionals']['Insert']>;
                Relationships: never[];
            };
            services: {
                Row: {
                    id: string;
                    name: string;
                    icon_name: string;
                    description: string | null;
                    sort_order: number;
                };
                Insert: {
                    id?: string;
                    name: string;
                    icon_name: string;
                    description?: string | null;
                    sort_order?: number;
                };
                Update: Partial<Database['public']['Tables']['services']['Insert']>;
                Relationships: never[];
            };
            reviews: {
                Row: {
                    id: string;
                    work_id: string | null;
                    professional_id: string;
                    reviewer_id: string;
                    rating: number;
                    comment: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    work_id?: string | null;
                    professional_id: string;
                    reviewer_id: string;
                    rating: number;
                    comment?: string | null;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
                Relationships: never[];
            };
            conversations: {
                Row: {
                    id: string;
                    client_id: string;
                    professional_id: string;
                    created_at: string;
                    last_message_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    professional_id: string;
                    created_at?: string;
                    last_message_at?: string;
                };
                Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
                Relationships: never[];
            };
            messages: {
                Row: {
                    id: string;
                    conversation_id: string;
                    sender_id: string;
                    content: string;
                    type: MessageType;
                    metadata: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    sender_id: string;
                    content: string;
                    type?: MessageType;
                    metadata?: Json | null;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['messages']['Insert']>;
                Relationships: never[];
            };
            material_lists: {
                Row: {
                    id: string;
                    conversation_id: string;
                    professional_id: string;
                    status: MaterialListStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    professional_id: string;
                    status?: MaterialListStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['material_lists']['Insert']>;
                Relationships: never[];
            };
            material_items: {
                Row: {
                    id: string;
                    material_list_id: string;
                    name: string;
                    quantity: number;
                    unit: string;
                    brand: string | null;
                    image_url: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    material_list_id: string;
                    name: string;
                    quantity: number;
                    unit?: string;
                    brand?: string | null;
                    image_url?: string | null;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['material_items']['Insert']>;
                Relationships: never[];
            };
            stores: {
                Row: {
                    id: string;
                    profile_id: string | null;
                    name: string;
                    address: string | null;
                    lat: number | null;
                    lng: number | null;
                    delivery_time: string | null;
                    logo_url: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    profile_id?: string | null;
                    name: string;
                    address?: string | null;
                    lat?: number | null;
                    lng?: number | null;
                    delivery_time?: string | null;
                    logo_url?: string | null;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['stores']['Insert']>;
                Relationships: never[];
            };
            store_offers: {
                Row: {
                    id: string;
                    store_id: string;
                    material_list_id: string;
                    total_price: number;
                    delivery_info: string | null;
                    is_best_price: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    store_id: string;
                    material_list_id: string;
                    total_price: number;
                    delivery_info?: string | null;
                    is_best_price?: boolean;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['store_offers']['Insert']>;
                Relationships: never[];
            };
            orders: {
                Row: {
                    id: string;
                    client_id: string;
                    store_id: string;
                    material_list_id: string | null;
                    status: OrderStatus;
                    total_amount: number;
                    order_number: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    store_id: string;
                    material_list_id?: string | null;
                    status?: OrderStatus;
                    total_amount: number;
                    order_number: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['orders']['Insert']>;
                Relationships: never[];
            };
            works: {
                Row: {
                    id: string;
                    client_id: string;
                    professional_id: string;
                    title: string;
                    status: WorkStatus;
                    progress_pct: number;
                    next_step: string | null;
                    photos: string[];
                    started_at: string | null;
                    completed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    professional_id: string;
                    title: string;
                    status?: WorkStatus;
                    progress_pct?: number;
                    next_step?: string | null;
                    photos?: string[];
                    started_at?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['works']['Insert']>;
                Relationships: never[];
            };
            availability_slots: {
                Row: {
                    id: string;
                    professional_id: string;
                    weekday: number;
                    start_time: string;
                    end_time: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    professional_id: string;
                    weekday: number;
                    start_time: string;
                    end_time: string;
                    created_at?: string;
                };
                Update: Partial<Database['public']['Tables']['availability_slots']['Insert']>;
                Relationships: never[];
            };
            visits: {
                Row: {
                    id: string;
                    client_id: string;
                    professional_id: string;
                    scheduled_at: string;
                    status: VisitStatus;
                    street: string | null;
                    street_number: string | null;
                    complement: string | null;
                    neighborhood: string | null;
                    city_name: string | null;
                    state_code: string | null;
                    requester_name: string | null;
                    service_type: string | null;
                    description: string | null;
                    address: string | null;
                    notes: string | null;
                    cancelled_by: string | null;
                    rejection_reason: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    professional_id: string;
                    scheduled_at: string;
                    status?: VisitStatus;
                    street?: string | null;
                    street_number?: string | null;
                    complement?: string | null;
                    neighborhood?: string | null;
                    city_name?: string | null;
                    state_code?: string | null;
                    requester_name?: string | null;
                    service_type?: string | null;
                    description?: string | null;
                    address?: string | null;
                    notes?: string | null;
                    cancelled_by?: string | null;
                    rejection_reason?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['visits']['Insert']>;
                Relationships: never[];
            };
        };
        Views: Record<string, {
            Row: Record<string, unknown>;
            Relationships: never[];
        }>;
        Functions: Record<string, {
            Args: Record<string, unknown>;
            Returns: unknown;
        }>;
        Enums: {
            user_role: UserRole;
            message_type: MessageType;
            material_list_status: MaterialListStatus;
            order_status: OrderStatus;
            work_status: WorkStatus;
            visit_status: VisitStatus;
        };
        CompositeTypes: Record<string, never>;
    };
}
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Professional = Database['public']['Tables']['professionals']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MaterialList = Database['public']['Tables']['material_lists']['Row'];
export type MaterialItem = Database['public']['Tables']['material_items']['Row'];
export type Store = Database['public']['Tables']['stores']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Work = Database['public']['Tables']['works']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type ProfileWithProfessional = Profile & {
    professionals: Professional | null;
};
export type ProfessionalWithProfile = Professional & {
    profiles: Profile;
};
/** Returned by computeCompleteness() — which fields are missing for publication */
export interface ProfessionalCompletenessResult {
    complete: boolean;
    missing: string[];
}
/** Response shape from activate/update professional endpoints */
export interface ProfessionalActivationResult {
    professionalId: string;
    roles: UserRole[];
    visibility_status: ProfessionalVisibilityStatus;
    is_complete: boolean;
    missing_fields: string[];
    message: string;
}
export type ReviewWithReviewer = Review & {
    profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
};
export type MessageWithSender = Message & {
    profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
};
export type StoreOfferWithStore = Database['public']['Tables']['store_offers']['Row'] & {
    stores: Store;
};
export type OrderWithStore = Order & {
    stores: Pick<Store, 'id' | 'name' | 'logo_url'>;
};
export type WorkWithProfessional = Work & {
    professionals: ProfessionalWithProfile;
};
/** Full work with both sides: professional data + client profile */
export type WorkFull = Work & {
    professionals: ProfessionalWithProfile;
    client: Profile;
};
export type AvailabilitySlot = Database['public']['Tables']['availability_slots']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type VisitWithProfessional = Visit & {
    professionals: ProfessionalWithProfile;
};
export type VisitWithClient = Visit & {
    client: Profile;
};
/** Full visit with both sides: professional data + client profile */
export type VisitFull = Visit & {
    professionals: ProfessionalWithProfile;
    client: Profile;
};
export type NotificationType = 'visit_requested' | 'visit_accepted' | 'visit_rejected' | 'visit_cancelled' | 'visit_completed' | 'work_started' | 'work_completed' | 'work_progress';
export interface Notification {
    id: string;
    profile_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    metadata: Record<string, unknown> | null;
    created_at: string;
}
