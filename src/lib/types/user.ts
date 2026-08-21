import type { AuditFields, UUID } from "./common";

export const APP_ROLES = ["student", "teacher"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export interface User extends AuditFields {
  id: UUID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  role: AppRole | null;
}
