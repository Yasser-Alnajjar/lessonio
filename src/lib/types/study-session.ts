import type { AuditFields, UUID } from "./common";

export interface StudySession extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID | null;
  lessonId: UUID | null;
  startedAt: string; // ISO datetime
  endedAt: string | null;
  durationMinutes: number | null;
}

export interface StartStudySessionInput {
  subjectId?: UUID;
  lessonId?: UUID;
}

export interface StudySessionSummary {
  totalMinutesThisWeek: number;
  totalMinutesToday: number;
  averageSessionMinutes: number;
  sessionsThisWeek: number;
}
