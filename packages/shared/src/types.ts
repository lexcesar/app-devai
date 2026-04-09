// ── Supabase Database TypeScript types ────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'client' | 'professional' | 'store';
export type MessageType = 'text' | 'image' | 'audio' | 'material_list';
export type MaterialListStatus = 'draft' | 'sent' | 'quoted';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';
export type WorkStatus = 'scheduled' | 'active' | 'completed';
export type VisitStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_id: string;
          full_name: string;
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
          professional_id: string;
          reviewer_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
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
        address: string | null;
        notes: string | null;
        cancelled_by: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        client_id: string;
        professional_id: string;
        scheduled_at: string;
        status?: VisitStatus;
        address?: string | null;
        notes?: string | null;
        cancelled_by?: string | null;
        created_at?: string;
        updated_at?: string;
      };
        Update: Partial<Database['public']['Tables']['visits']['Insert']>;
        Relationships: never[];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: never[] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
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

// ── Joined / convenience types ───────────────────────────────────────────────

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

export type AvailabilitySlot = Database['public']['Tables']['availability_slots']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];

export type VisitWithProfessional = Visit & {
  professionals: ProfessionalWithProfile;
};

export type VisitWithClient = Visit & {
  client: Profile;
};
