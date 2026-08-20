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

export interface StudySessionWithRelations extends StudySession {
  subjectName: string | null;
  subjectColor: string | null;
  lessonTitle: string | null;
}

export interface StartStudySessionInput {
  subjectId?: UUID;
  lessonId?: UUID;
}

/** For time already studied — the "log a past session" form. */
export interface LogStudySessionInput {
  subjectId?: UUID;
  lessonId?: UUID;
  startedAt: string; // ISO datetime
  durationMinutes: number;
}

export interface StudySessionSummary {
  totalMinutesThisWeek: number;
  totalMinutesToday: number;
  averageSessionMinutes: number;
  sessionsThisWeek: number;
}
