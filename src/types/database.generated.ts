export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_access_requests: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["admin_access_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["admin_access_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["admin_access_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          content_md: string | null
          cover_alt: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          og_image: string | null
          published_at: string | null
          reading_time_min: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          content_md?: string | null
          cover_alt?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          og_image?: string | null
          published_at?: string | null
          reading_time_min?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          content_md?: string | null
          cover_alt?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          og_image?: string | null
          published_at?: string | null
          reading_time_min?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["contact_status"]
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      question_answer: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_visible: boolean
          question: string
          services_categories_id: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_visible?: boolean
          question: string
          services_categories_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean
          question?: string
          services_categories_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answer_services_categories_id_fkey"
            columns: ["services_categories_id"]
            isOneToOne: false
            referencedRelation: "services_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          message: string
          name: string
          review_request_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          message: string
          name: string
          review_request_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          message?: string
          name?: string
          review_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      services_categories: {
        Row: {
          card_icon_key: string | null
          card_image: string | null
          created_at: string | null
          description: string | null
          hero_heading: string | null
          hero_image: string | null
          id: string
          is_published: boolean | null
          og_image: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          title: string | null
          type: Database["public"]["Enums"]["categories_type"]
          updated_at: string | null
        }
        Insert: {
          card_icon_key?: string | null
          card_image?: string | null
          created_at?: string | null
          description?: string | null
          hero_heading?: string | null
          hero_image?: string | null
          id?: string
          is_published?: boolean | null
          og_image?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["categories_type"]
          updated_at?: string | null
        }
        Update: {
          card_icon_key?: string | null
          card_image?: string | null
          created_at?: string | null
          description?: string | null
          hero_heading?: string | null
          hero_image?: string | null
          id?: string
          is_published?: boolean | null
          og_image?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["categories_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      services_item_details: {
        Row: {
          created_at: string | null
          cta_description: string | null
          description: string | null
          id: string
          is_published: boolean | null
          service_item_id: string
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cta_description?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          service_item_id: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cta_description?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          service_item_id?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_item_details_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "services_items"
            referencedColumns: ["id"]
          },
        ]
      }
      services_items: {
        Row: {
          category_id: string
          created_at: string | null
          cta_label: string | null
          cta_type: Database["public"]["Enums"]["cta_type"]
          description: string | null
          icon_key: string | null
          id: string
          is_published: boolean | null
          og_image: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          cta_label?: string | null
          cta_type?: Database["public"]["Enums"]["cta_type"]
          description?: string | null
          icon_key?: string | null
          id?: string
          is_published?: boolean | null
          og_image?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          cta_label?: string | null
          cta_type?: Database["public"]["Enums"]["cta_type"]
          description?: string | null
          icon_key?: string | null
          id?: string
          is_published?: boolean | null
          og_image?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_items_category_id_fkey1"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "services_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_order: number | null
          full_name: string
          id: string
          is_visible: boolean
          job_title: string
          nickname: string | null
          profile_id: string | null
          short_bio: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_order?: number | null
          full_name: string
          id?: string
          is_visible?: boolean
          job_title: string
          nickname?: string | null
          profile_id?: string | null
          short_bio?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_order?: number | null
          full_name?: string
          id?: string
          is_visible?: boolean
          job_title?: string
          nickname?: string | null
          profile_id?: string | null
          short_bio?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_admin_access_request: {
        Args: { p_role: Database["public"]["Enums"]["role"]; p_user_id: string }
        Returns: undefined
      }
      check_review_request_status: {
        Args: { p_token: string }
        Returns: string
      }
      current_role: { Args: never; Returns: string }
      ensure_admin_access_request: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_access_request_status"]
      }
      is_active_super_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_role: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_staff_role: { Args: never; Returns: boolean }
      reject_admin_access_request: {
        Args: { p_rejection_reason?: string; p_user_id: string }
        Returns: undefined
      }
      set_blog_post_published: {
        Args: { p_is_published: boolean; p_post_id: string }
        Returns: undefined
      }
      submit_review: {
        Args: {
          p_email: string
          p_message: string
          p_name: string
          p_token: string
        }
        Returns: string
      }
    }
    Enums: {
      admin_access_request_status: "pending" | "approved" | "rejected"
      blog_status: "draft" | "pending" | "published" | "rejected"
      categories_type: "primary" | "secondary"
      contact_status: "new" | "in_progress" | "replied" | "closed" | "spam"
      cta_type: "contact" | "detail"
      role: "super_admin" | "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_access_request_status: ["pending", "approved", "rejected"],
      blog_status: ["draft", "pending", "published", "rejected"],
      categories_type: ["primary", "secondary"],
      contact_status: ["new", "in_progress", "replied", "closed", "spam"],
      cta_type: ["contact", "detail"],
      role: ["super_admin", "admin", "staff"],
    },
  },
} as const
