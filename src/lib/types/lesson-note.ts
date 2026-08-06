import type { AuditFields, UUID } from "./common";

export interface LessonNote extends AuditFields {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  title: string;
  contentMarkdown: string;
}

export interface CreateLessonNoteInput {
  lessonId: UUID;
  title: string;
  contentMarkdown: string;
}

export type UpdateLessonNoteInput = Partial<
  Omit<CreateLessonNoteInput, "lessonId">
>;
