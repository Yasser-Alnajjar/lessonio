/**
 * Hand-written to match `supabase/migrations/*.sql` exactly, in the same
 * shape `supabase gen types typescript` would produce. Once a live project
 * exists, run `npm run supabase:types` to regenerate this file from the
 * database itself — that output is authoritative; this one is a stand-in
 * until then. Row = a selected row's shape. Insert = the payload for `.insert()`
 * (fields with a DB default or that are nullable are optional; generated
 * columns don't appear at all — Postgres rejects writes to them). Update =
 * `.update()` payload (every field optional).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      lessons: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          teacher: string | null;
          location: string | null;
          date: string;
          time: string;
          duration_minutes: number;
          attendance_status: string;
          study_status: string;
          review_status: string;
          homework_status: string;
          exam_status: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          /** tsvector — not meaningfully typeable client-side; query via `.textSearch()`. */
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          title: string;
          teacher?: string | null;
          location?: string | null;
          date: string;
          time: string;
          duration_minutes: number;
          attendance_status?: string;
          study_status?: string;
          review_status?: string;
          homework_status?: string;
          exam_status?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          title?: string;
          teacher?: string | null;
          location?: string | null;
          date?: string;
          time?: string;
          duration_minutes?: number;
          attendance_status?: string;
          study_status?: string;
          review_status?: string;
          homework_status?: string;
          exam_status?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      lesson_tags: {
        Row: {
          lesson_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          lesson_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          lesson_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      lesson_notes: {
        Row: {
          id: string;
          lesson_id: string;
          user_id: string;
          title: string;
          content_markdown: string;
          created_at: string;
          updated_at: string;
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          user_id: string;
          title: string;
          content_markdown?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          user_id?: string;
          title?: string;
          content_markdown?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      attachments: {
        Row: {
          id: string;
          lesson_id: string;
          user_id: string;
          kind: string;
          file_name: string;
          storage_path: string;
          size_bytes: number;
          mime_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          user_id: string;
          kind: string;
          file_name: string;
          storage_path: string;
          size_bytes: number;
          mime_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          user_id?: string;
          kind?: string;
          file_name?: string;
          storage_path?: string;
          size_bytes?: number;
          mime_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          lesson_id: string | null;
          started_at: string;
          ended_at: string | null;
          /** Generated column — null while the session is still running. */
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          lesson_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          lesson_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      homework: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          subject_id: string;
          title: string;
          deadline: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          subject_id: string;
          title: string;
          deadline: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          subject_id?: string;
          title?: string;
          deadline?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      exams: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          subject_id: string;
          title: string;
          date: string;
          score: number | null;
          total_score: number;
          created_at: string;
          updated_at: string;
          /** Generated column — null until `score` is set. */
          percentage: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          subject_id: string;
          title: string;
          date: string;
          score?: number | null;
          total_score: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          subject_id?: string;
          title?: string;
          date?: string;
          score?: number | null;
          total_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          read_at: string | null;
          link_path: string | null;
          created_at: string;
          updated_at: string;
        };
        /** No RLS insert policy for `authenticated` — written by trusted server logic only. */
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          read_at?: string | null;
          link_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          read_at?: string | null;
          link_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      settings: {
        Row: {
          user_id: string;
          theme: string;
          locale: string;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        /** No RLS insert policy for `authenticated` — provisioned by handle_new_user_settings(). */
        Insert: {
          user_id: string;
          theme?: string;
          locale?: string;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          locale?: string;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      achievements: {
        Row: {
          id: string;
          key: string;
          title: string;
          description: string;
          icon: string;
          created_at: string;
        };
        /** No RLS write policy for `authenticated` at all — catalog is read-only reference data. */
        Insert: {
          id?: string;
          key: string;
          title: string;
          description: string;
          icon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          title?: string;
          description?: string;
          icon?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string | null;
          progress: number;
          created_at: string;
          updated_at: string;
        };
        /** No RLS write policy for `authenticated` — awarded via a trusted server process only. */
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: string | null;
          progress?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string | null;
          progress?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      goals: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          target_minutes: number;
          achieved_minutes: number;
          period_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period: string;
          target_minutes: number;
          achieved_minutes?: number;
          period_start: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period?: string;
          target_minutes?: number;
          achieved_minutes?: number;
          period_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
