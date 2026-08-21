import type { AuditFields, UUID } from "./common";

/**
 * A teacher's class — deliberately its own domain, not `Class`
 * (`src/lib/types/class.ts`), which is the student's recurring weekly
 * schedule. See the `teacher_classes` table comment in
 * `20260823120000_teacher_classes.sql` for why they can't be merged.
 */
export interface TeacherClass extends AuditFields {
  id: UUID;
  teacherId: UUID;
  name: string;
  subjectLabel: string | null;
  description: string | null;
  isArchived: boolean;
}

export interface TeacherClassWithStats extends TeacherClass {
  joinCode: string;
  studentCount: number;
}

export interface CreateTeacherClassInput {
  name: string;
  subjectLabel?: string;
  description?: string;
}

export type UpdateTeacherClassInput = Partial<CreateTeacherClassInput> & {
  isArchived?: boolean;
};
