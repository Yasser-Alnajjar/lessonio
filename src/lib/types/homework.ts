import type { AuditFields, UUID } from "./common";

export interface Homework extends AuditFields {
  id: UUID;
  userId: UUID;
  lessonId: UUID;
  subjectId: UUID;
  title: string;
  deadline: string; // ISO date
  completed: boolean;
}

export interface HomeworkWithRelations extends Homework {
  subjectName: string;
  subjectColor: string;
  lessonTitle: string;
}

export interface CreateHomeworkInput {
  lessonId: UUID;
  title: string;
  deadline: string;
}

export type UpdateHomeworkInput = Partial<CreateHomeworkInput> & {
  completed?: boolean;
};
