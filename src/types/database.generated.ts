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
      blog_post_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          post_id: string
          snapshot: Json
          source_version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          post_id: string
          snapshot: Json
          source_version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          post_id?: string
          snapshot?: Json
          source_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          author_name: string | null
          category: string
          content_format: string
          content_format_version: number
          content_md: string | null
          cover_alt: string | null
          created_at: string | null
          created_by: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_featured: boolean
          og_image: string | null
          published_at: string | null
          published_by: string | null
          reading_time_min: number | null
          rejection_reason: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"] | null
          tags: string[]
          title: string | null
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          category?: string
          content_format?: string
          content_format_version?: number
          content_md?: string | null
          cover_alt?: string | null
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          og_image?: string | null
          published_at?: string | null
          published_by?: string | null
          reading_time_min?: number | null
          rejection_reason?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_status"] | null
          tags?: string[]
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          category?: string
          content_format?: string
          content_format_version?: number
          content_md?: string | null
          cover_alt?: string | null
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          og_image?: string | null
          published_at?: string | null
          published_by?: string | null
          reading_time_min?: number | null
          rejection_reason?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"] | null
          tags?: string[]
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived_at: string | null
          archived_by: string | null
          client_type: string
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_type: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_type?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      internal_services: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          summary: string | null
          updated_at: string
          updated_by: string | null
          version: number
          workflow_template_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workflow_template_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_services_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_services_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_activity_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          job_id: string
          job_step_id: string | null
          job_update_id: string | null
          new_values: Json
          old_values: Json
          reason: string | null
          task_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          job_id: string
          job_step_id?: string | null
          job_update_id?: string | null
          new_values?: Json
          old_values?: Json
          reason?: string | null
          task_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          job_id?: string
          job_step_id?: string | null
          job_update_id?: string | null
          new_values?: Json
          old_values?: Json
          reason?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_activity_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_activity_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_activity_logs_step_fkey"
            columns: ["job_id", "job_step_id"]
            isOneToOne: false
            referencedRelation: "job_steps"
            referencedColumns: ["job_id", "id"]
          },
          {
            foreignKeyName: "job_activity_logs_task_fkey"
            columns: ["job_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["job_id", "id"]
          },
          {
            foreignKeyName: "job_activity_logs_update_fkey"
            columns: ["job_id", "job_update_id"]
            isOneToOne: false
            referencedRelation: "job_updates"
            referencedColumns: ["job_id", "id"]
          },
        ]
      }
      job_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string
          file_name: string
          file_size_bytes: number | null
          google_file_id: string
          google_resource_key: string | null
          id: string
          job_drive_folder_id: string
          job_id: string
          last_synced_at: string | null
          mime_type: string | null
          source: string
          sync_status: string
          updated_at: string
          updated_by: string
          uploaded_at: string
          uploaded_by: string
          version: number
          web_view_url: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by: string
          file_name: string
          file_size_bytes?: number | null
          google_file_id: string
          google_resource_key?: string | null
          id?: string
          job_drive_folder_id: string
          job_id: string
          last_synced_at?: string | null
          mime_type?: string | null
          source?: string
          sync_status?: string
          updated_at?: string
          updated_by: string
          uploaded_at?: string
          uploaded_by: string
          version?: number
          web_view_url: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          file_size_bytes?: number | null
          google_file_id?: string
          google_resource_key?: string | null
          id?: string
          job_drive_folder_id?: string
          job_id?: string
          last_synced_at?: string | null
          mime_type?: string | null
          source?: string
          sync_status?: string
          updated_at?: string
          updated_by?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
          web_view_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_folder_fkey"
            columns: ["job_id", "job_drive_folder_id"]
            isOneToOne: false
            referencedRelation: "job_drive_folders"
            referencedColumns: ["job_id", "id"]
          },
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_drive_folders: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          connection_status: string
          created_at: string
          created_by: string
          folder_name: string
          google_drive_id: string
          google_folder_id: string
          id: string
          job_id: string
          last_synced_at: string | null
          updated_at: string
          updated_by: string
          version: number
          web_view_url: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          connection_status?: string
          created_at?: string
          created_by: string
          folder_name: string
          google_drive_id: string
          google_folder_id: string
          id?: string
          job_id: string
          last_synced_at?: string | null
          updated_at?: string
          updated_by: string
          version?: number
          web_view_url: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          connection_status?: string
          created_at?: string
          created_by?: string
          folder_name?: string
          google_drive_id?: string
          google_folder_id?: string
          id?: string
          job_id?: string
          last_synced_at?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
          web_view_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_drive_folders_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_drive_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_drive_folders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_drive_folders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_statuses: {
        Row: {
          code: string
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_statuses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_completed: boolean
          job_id: string
          name: string
          position: number
          replaced_at: string | null
          replaced_by: string | null
          template_step_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_completed?: boolean
          job_id: string
          name: string
          position: number
          replaced_at?: string | null
          replaced_by?: string | null
          template_step_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          job_id?: string
          name?: string
          position?: number
          replaced_at?: string | null
          replaced_by?: string | null
          template_step_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_steps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_task_statuses: {
        Row: {
          column_order: number
          created_at: string
          created_by: string
          id: string
          job_id: string
          task_status_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          column_order: number
          created_at?: string
          created_by: string
          id?: string
          job_id: string
          task_status_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          column_order?: number
          created_at?: string
          created_by?: string
          id?: string
          job_id?: string
          task_status_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_task_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_task_statuses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_task_statuses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_task_statuses_task_status_id_fkey"
            columns: ["task_status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_task_statuses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_updates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          job_id: string
          message: string
          performed_by: string | null
          progress_date: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          job_id: string
          message: string
          performed_by?: string | null
          progress_date: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          job_id?: string
          message?: string
          performed_by?: string | null
          progress_date?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          estimated_end_date: string | null
          id: string
          internal_service_id: string
          pic_id: string
          priority_id: string
          start_date: string | null
          started_at: string | null
          status_id: string
          status_reason: string | null
          title: string
          updated_at: string
          updated_by: string
          version: number
          workflow_template_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_end_date?: string | null
          id?: string
          internal_service_id: string
          pic_id: string
          priority_id: string
          start_date?: string | null
          started_at?: string | null
          status_id: string
          status_reason?: string | null
          title: string
          updated_at?: string
          updated_by: string
          version?: number
          workflow_template_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_end_date?: string | null
          id?: string
          internal_service_id?: string
          pic_id?: string
          priority_id?: string
          start_date?: string | null
          started_at?: string | null
          status_id?: string
          status_reason?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
          version?: number
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_internal_service_id_fkey"
            columns: ["internal_service_id"]
            isOneToOne: false
            referencedRelation: "internal_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pic_id_fkey"
            columns: ["pic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "job_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          code: string
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "priorities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priorities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
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
          archived_at: string | null
          archived_by: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          job_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_job_client_fkey"
            columns: ["job_id", "client_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "review_requests_job_client_fkey"
            columns: ["job_id", "client_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "review_requests_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          client_id: string | null
          created_at: string
          email: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          job_id: string | null
          message: string
          moderated_at: string | null
          moderated_by: string | null
          name: string
          review_request_id: string | null
          status: Database["public"]["Enums"]["review_moderation_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          job_id?: string | null
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          name: string
          review_request_id?: string | null
          status?: Database["public"]["Enums"]["review_moderation_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          job_id?: string | null
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          name?: string
          review_request_id?: string | null
          status?: Database["public"]["Enums"]["review_moderation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_client_fkey"
            columns: ["job_id", "client_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "reviews_job_client_fkey"
            columns: ["job_id", "client_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      sop_files: {
        Row: {
          bucket_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          file_type: string
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number
          sop_id: string
          sort_order: number
          storage_path: string
          title: string
          updated_at: string
          updated_by: string
          upload_status: string
          uploaded_at: string | null
          version: number
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_type: string
          id?: string
          mime_type: string
          original_filename: string
          size_bytes: number
          sop_id: string
          sort_order?: number
          storage_path: string
          title: string
          updated_at?: string
          updated_by: string
          upload_status?: string
          uploaded_at?: string | null
          version?: number
        }
        Update: {
          bucket_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_type?: string
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          sop_id?: string
          sort_order?: number
          storage_path?: string
          title?: string
          updated_at?: string
          updated_by?: string
          upload_status?: string
          uploaded_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_files_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_files_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_files_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_price_items: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string
          id: string
          item_name: string
          notes: string | null
          sop_id: string
          sort_order: number
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          item_name: string
          notes?: string | null
          sop_id: string
          sort_order?: number
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          item_name?: string
          notes?: string | null
          sop_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_price_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_price_items_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_price_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          internal_service_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          internal_service_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          internal_service_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_internal_service_id_fkey"
            columns: ["internal_service_id"]
            isOneToOne: true
            referencedRelation: "internal_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          code: string
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_statuses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          id: string
          job_id: string
          job_task_status_id: string
          position: number
          priority_id: string | null
          title: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          job_id: string
          job_task_status_id: string
          position?: number
          priority_id?: string | null
          title: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          job_id?: string
          job_task_status_id?: string
          position?: number
          priority_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_job_status_fkey"
            columns: ["job_id", "job_task_status_id"]
            isOneToOne: false
            referencedRelation: "job_task_statuses"
            referencedColumns: ["job_id", "id"]
          },
          {
            foreignKeyName: "tasks_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      workflow_template_steps: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
          updated_by: string | null
          version: number
          workflow_template_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          position: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          workflow_template_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_steps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_steps_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      job_overview: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_step_name: string | null
          description: string | null
          estimated_duration_days: number | null
          estimated_end_date: string | null
          id: string | null
          internal_service_id: string | null
          pic_id: string | null
          priority_id: string | null
          progress_percentage: number | null
          start_date: string | null
          started_at: string | null
          status_id: string | null
          status_reason: string | null
          task_count: number | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          workflow_template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_internal_service_id_fkey"
            columns: ["internal_service_id"]
            isOneToOne: false
            referencedRelation: "internal_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pic_id_fkey"
            columns: ["pic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "job_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_admin_access_request: {
        Args: { p_role: Database["public"]["Enums"]["role"]; p_user_id: string }
        Returns: undefined
      }
      archive_blog_post: {
        Args: { p_expected_version: number; p_post_id: string }
        Returns: number
      }
      archive_client: {
        Args: { p_client_id: string; p_expected_version: number }
        Returns: number
      }
      archive_job: {
        Args: { p_expected_version: number; p_job_id: string }
        Returns: number
      }
      archive_review: { Args: { p_review_id: string }; Returns: undefined }
      archive_review_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      change_job_status: {
        Args: {
          p_expected_version: number
          p_job_id: string
          p_reason?: string
          p_status_code: string
        }
        Returns: number
      }
      check_review_request_status: {
        Args: { p_token: string }
        Returns: string
      }
      complete_job_step: {
        Args: { p_expected_version: number; p_job_step_id: string }
        Returns: undefined
      }
      configure_job_task_statuses: {
        Args: { p_job_id: string; p_statuses: Json }
        Returns: undefined
      }
      create_blog_post: {
        Args: {
          p_category?: string
          p_content_html: string
          p_cover_alt?: string
          p_excerpt: string
          p_featured_image?: string
          p_reading_time_min: number
          p_seo_description?: string
          p_seo_title?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: string
      }
      create_client: {
        Args: {
          p_address?: string
          p_client_type: string
          p_contact_person?: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: string
      }
      create_job: {
        Args: {
          p_client_id: string
          p_description?: string
          p_estimated_end_date?: string
          p_internal_service_id: string
          p_pic_id?: string
          p_priority_id: string
          p_start_date?: string
          p_title: string
        }
        Returns: string
      }
      create_job_update: {
        Args: {
          p_job_id: string
          p_message: string
          p_performed_by?: string
          p_progress_date: string
        }
        Returns: string
      }
      create_job_with_client: {
        Args: {
          p_client_name: string
          p_client_type: string
          p_description?: string
          p_estimated_end_date?: string
          p_internal_service_id: string
          p_pic_id?: string
          p_priority_id: string
          p_start_date?: string
          p_title: string
        }
        Returns: string
      }
      create_review_request: {
        Args: {
          p_client_email?: string
          p_client_id?: string
          p_client_name?: string
          p_expires_in_days?: number
          p_job_id?: string
        }
        Returns: {
          request_id: string
          token: string
        }[]
      }
      create_task: {
        Args: {
          p_assignee_id?: string
          p_description?: string
          p_due_date?: string
          p_job_id: string
          p_job_task_status_id?: string
          p_priority_id?: string
          p_title?: string
        }
        Returns: string
      }
      create_workflow_template: {
        Args: {
          p_code: string
          p_description: string
          p_name: string
          p_steps: Json
        }
        Returns: string
      }
      current_role: { Args: never; Returns: string }
      delete_job_update: {
        Args: { p_expected_version: number; p_update_id: string }
        Returns: undefined
      }
      delete_task: {
        Args: { p_expected_version: number; p_task_id: string }
        Returns: undefined
      }
      ensure_admin_access_request: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_access_request_status"]
      }
      fail_sop_file_upload: {
        Args: { p_expected_version: number; p_file_id: string }
        Returns: number
      }
      finalize_sop_file_upload: {
        Args: { p_expected_version: number; p_file_id: string }
        Returns: number
      }
      is_active_super_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_role: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_staff_role: { Args: never; Returns: boolean }
      list_active_clients_for_job: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_assignable_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      list_job_activity: {
        Args: { p_before?: string; p_job_id: string; p_limit?: number }
        Returns: {
          action: string
          actor_id: string
          created_at: string
          id: string
          job_id: string
          job_step_id: string
          job_update_id: string
          new_values: Json
          old_values: Json
          reason: string
          task_id: string
        }[]
      }
      list_pending_admin_access_requests: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          requested_at: string
          user_id: string
        }[]
      }
      mark_sop_file_deleted: {
        Args: { p_expected_version: number; p_file_id: string }
        Returns: string
      }
      moderate_blog_post: {
        Args: {
          p_expected_version: number
          p_post_id: string
          p_rejection_reason?: string
          p_status: Database["public"]["Enums"]["blog_status"]
        }
        Returns: number
      }
      moderate_review: {
        Args: {
          p_is_featured?: boolean
          p_review_id: string
          p_status: Database["public"]["Enums"]["review_moderation_status"]
        }
        Returns: undefined
      }
      move_task: {
        Args: {
          p_expected_version: number
          p_job_task_status_id: string
          p_position?: number
          p_task_id: string
        }
        Returns: number
      }
      place_task_on_board: {
        Args: {
          p_before_task_id?: string
          p_expected_version: number
          p_job_task_status_id: string
          p_task_id: string
        }
        Returns: number
      }
      prepare_sop_file_upload: {
        Args: {
          p_file_type: string
          p_mime_type: string
          p_original_filename: string
          p_size_bytes: number
          p_sop_id: string
          p_sort_order?: number
          p_title: string
        }
        Returns: {
          bucket_id: string
          file_id: string
          storage_path: string
        }[]
      }
      reject_admin_access_request: {
        Args: { p_rejection_reason?: string; p_user_id: string }
        Returns: undefined
      }
      reopen_job: {
        Args: { p_expected_version: number; p_job_id: string; p_reason: string }
        Returns: number
      }
      restore_blog_post: {
        Args: { p_expected_version: number; p_post_id: string }
        Returns: number
      }
      restore_blog_post_revision: {
        Args: {
          p_expected_version: number
          p_post_id: string
          p_revision_id: number
        }
        Returns: number
      }
      restore_profile: { Args: { p_profile_id: string }; Returns: undefined }
      revert_last_job_step: {
        Args: { p_expected_version: number; p_job_step_id: string }
        Returns: undefined
      }
      revoke_review_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      save_internal_service: {
        Args: {
          p_code: string
          p_expected_version: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_summary?: string
          p_workflow_template_id?: string
        }
        Returns: string
      }
      save_job_status: {
        Args: {
          p_code: string
          p_color: string
          p_expected_version: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_sort_order?: number
        }
        Returns: string
      }
      save_priority: {
        Args: {
          p_code: string
          p_color: string
          p_expected_version: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_sort_order?: number
        }
        Returns: string
      }
      save_sop: {
        Args: {
          p_description: string
          p_expected_version?: number
          p_internal_service_id: string
        }
        Returns: string
      }
      save_sop_price_items: {
        Args: {
          p_items: Json
          p_sop_expected_version: number
          p_sop_id: string
        }
        Returns: number
      }
      save_task_status: {
        Args: {
          p_code: string
          p_color: string
          p_expected_version: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_sort_order?: number
        }
        Returns: string
      }
      save_workflow_template: {
        Args: {
          p_code: string
          p_description: string
          p_expected_version: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_steps: Json
        }
        Returns: string
      }
      set_blog_post_featured: {
        Args: {
          p_expected_version: number
          p_is_featured: boolean
          p_post_id: string
        }
        Returns: number
      }
      set_blog_post_published: {
        Args: { p_is_published: boolean; p_post_id: string }
        Returns: undefined
      }
      set_master_data_active: {
        Args: {
          p_entity: string
          p_expected_version: number
          p_id: string
          p_is_active: boolean
        }
        Returns: number
      }
      set_profile_active: {
        Args: { p_is_active: boolean; p_profile_id: string }
        Returns: undefined
      }
      set_profile_role: {
        Args: {
          p_profile_id: string
          p_role: Database["public"]["Enums"]["role"]
        }
        Returns: undefined
      }
      set_workflow_active: {
        Args: {
          p_expected_version: number
          p_is_active: boolean
          p_template_id: string
        }
        Returns: number
      }
      soft_delete_profile: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      submit_blog_post_for_review: {
        Args: { p_expected_version: number; p_post_id: string }
        Returns: number
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
      sync_own_profile_identity: { Args: never; Returns: undefined }
      update_blog_post: {
        Args: {
          p_category?: string
          p_content_html: string
          p_cover_alt?: string
          p_excerpt: string
          p_expected_version: number
          p_featured_image?: string
          p_post_id: string
          p_reading_time_min: number
          p_seo_description?: string
          p_seo_title?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: number
      }
      update_client: {
        Args: {
          p_address?: string
          p_client_id: string
          p_client_type: string
          p_contact_person?: string
          p_email?: string
          p_expected_version: number
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: number
      }
      update_job: {
        Args: {
          p_client_id: string
          p_description?: string
          p_estimated_end_date?: string
          p_expected_version: number
          p_internal_service_id: string
          p_job_id: string
          p_pic_id?: string
          p_priority_id: string
          p_start_date?: string
          p_title: string
        }
        Returns: number
      }
      update_job_update: {
        Args: {
          p_expected_version: number
          p_message: string
          p_performed_by?: string
          p_progress_date: string
          p_update_id: string
        }
        Returns: number
      }
      update_task: {
        Args: {
          p_assignee_id?: string
          p_description?: string
          p_due_date?: string
          p_expected_version: number
          p_priority_id?: string
          p_task_id: string
          p_title: string
        }
        Returns: number
      }
      update_unused_workflow_template: {
        Args: {
          p_description: string
          p_expected_version: number
          p_name: string
          p_steps: Json
          p_template_id: string
        }
        Returns: number
      }
    }
    Enums: {
      admin_access_request_status: "pending" | "approved" | "rejected"
      blog_status: "draft" | "pending" | "published" | "rejected"
      categories_type: "primary" | "secondary"
      contact_status: "new" | "in_progress" | "replied" | "closed" | "spam"
      cta_type: "contact" | "detail"
      review_moderation_status:
        | "PENDING"
        | "PUBLISHED"
        | "REJECTED"
        | "ARCHIVED"
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
      review_moderation_status: [
        "PENDING",
        "PUBLISHED",
        "REJECTED",
        "ARCHIVED",
      ],
      role: ["super_admin", "admin", "staff"],
    },
  },
} as const
