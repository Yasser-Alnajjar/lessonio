export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          key: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          title?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          due_at: string
          id: string
          instructions: string | null
          published_at: string | null
          status: string
          teacher_class_id: string
          teacher_id: string
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at: string
          id?: string
          instructions?: string | null
          published_at?: string | null
          status?: string
          teacher_class_id: string
          teacher_id: string
          title: string
          total_points: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string
          id?: string
          instructions?: string | null
          published_at?: string | null
          status?: string
          teacher_class_id?: string
          teacher_id?: string
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_teacher_class_id_fkey"
            columns: ["teacher_class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          lesson_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: string
          lesson_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          lesson_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          status: string
          student_id: string
          teacher_class_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          status?: string
          student_id: string
          teacher_class_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          status?: string
          student_id?: string
          teacher_class_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_teacher_class_id_fkey"
            columns: ["teacher_class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_join_codes: {
        Row: {
          code: string
          created_at: string
          rotated_at: string
          teacher_class_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          rotated_at?: string
          teacher_class_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          rotated_at?: string
          teacher_class_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_join_codes_teacher_class_id_fkey"
            columns: ["teacher_class_id"]
            isOneToOne: true
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_occurrences: {
        Row: {
          attendance_status: string | null
          class_id: string
          created_at: string
          date: string
          duration_minutes: number
          exam_status: string
          id: string
          start_time: string
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_status?: string | null
          class_id: string
          created_at?: string
          date: string
          duration_minutes: number
          exam_status?: string
          id?: string
          start_time: string
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_status?: string | null
          class_id?: string
          created_at?: string
          date?: string
          duration_minutes?: number
          exam_status?: string
          id?: string
          start_time?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_occurrences_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_occurrences_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          meetings: Json
          subject_id: string
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          meetings: Json
          subject_id: string
          teacher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          meetings?: Json
          subject_id?: string
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          date: string
          id: string
          lesson_id: string
          percentage: number | null
          score: number | null
          subject_id: string
          title: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          lesson_id: string
          percentage?: number | null
          score?: number | null
          subject_id: string
          title: string
          total_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          lesson_id?: string
          percentage?: number | null
          score?: number | null
          subject_id?: string
          title?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          created_at: string
          flashcard_id: string
          id: string
          quality: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flashcard_id: string
          id?: string
          quality: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flashcard_id?: string
          id?: string
          quality?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          due_date: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          last_reviewed_at: string | null
          lesson_id: string
          repetitions: number
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          due_date?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          lesson_id: string
          repetitions?: number
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          due_date?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          lesson_id?: string
          repetitions?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_minutes: number
          created_at: string
          id: string
          period: string
          period_start: string
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_minutes?: number
          created_at?: string
          id?: string
          period: string
          period_start: string
          target_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_minutes?: number
          created_at?: string
          id?: string
          period?: string
          period_start?: string
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          completed: boolean
          created_at: string
          deadline: string
          id: string
          lesson_id: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          deadline: string
          id?: string
          lesson_id: string
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          deadline?: string
          id?: string
          lesson_id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          content_markdown: string
          created_at: string
          id: string
          lesson_id: string
          search_vector: unknown
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_markdown?: string
          created_at?: string
          id?: string
          lesson_id: string
          search_vector?: unknown
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_markdown?: string
          created_at?: string
          id?: string
          lesson_id?: string
          search_vector?: unknown
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_tags: {
        Row: {
          created_at: string
          lesson_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          lesson_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          lesson_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_tags_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_occurrence_id: string | null
          created_at: string
          date: string
          homework_status: string
          id: string
          is_archived: boolean
          review_status: string
          search_vector: unknown
          study_status: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_occurrence_id?: string | null
          created_at?: string
          date: string
          homework_status?: string
          id?: string
          is_archived?: boolean
          review_status?: string
          search_vector?: unknown
          study_status?: string
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_occurrence_id?: string | null
          created_at?: string
          date?: string
          homework_status?: string
          id?: string
          is_archived?: boolean
          review_status?: string
          search_vector?: unknown
          study_status?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_occurrence_id_fkey"
            columns: ["class_occurrence_id"]
            isOneToOne: false
            referencedRelation: "class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string | null
          emailed_at: string | null
          id: string
          link_path: string | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key?: string | null
          emailed_at?: string | null
          id?: string
          link_path?: string | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          emailed_at?: string | null
          id?: string
          link_path?: string | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          class_occurrences_materialized_at: string | null
          created_at: string
          grade_scale: Json
          locale: string
          notification_preferences: Json
          notifications_generated_at: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_occurrences_materialized_at?: string | null
          created_at?: string
          grade_scale?: Json
          locale?: string
          notification_preferences?: Json
          notifications_generated_at?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_occurrences_materialized_at?: string | null
          created_at?: string
          grade_scale?: Json
          locale?: string
          notification_preferences?: Json
          notifications_generated_at?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          lesson_id: string | null
          started_at: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          started_at?: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          started_at?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          credit_hours: number
          icon: string
          id: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          credit_hours?: number
          icon: string
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          credit_hours?: number
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          subject_label: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          subject_label?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          subject_label?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          progress: number
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_submit_assignment: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      create_teacher_class: {
        Args: {
          p_description?: string
          p_name: string
          p_subject_label?: string
        }
        Returns: string
      }
      current_app_role: { Args: never; Returns: string }
      generate_join_code: { Args: never; Returns: string }
      is_enrolled_in_class: { Args: { p_class_id: string }; Returns: boolean }
      is_teacher_of_assignment: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      is_teacher_of_class: { Args: { p_class_id: string }; Returns: boolean }
      join_class_by_code: { Args: { p_code: string }; Returns: string }
      leave_class: { Args: { p_class_id: string }; Returns: undefined }
      rotate_join_code: { Args: { p_class_id: string }; Returns: string }
      set_my_role: { Args: { p_role: string }; Returns: undefined }
      shares_teacher_class_with: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      sync_user_achievements: { Args: never; Returns: undefined }
      validate_class_meetings: { Args: { entries: Json }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
