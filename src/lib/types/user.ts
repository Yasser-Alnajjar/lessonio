import type { AuditFields, UUID } from "./common";

export const APP_ROLES = ["student", "teacher", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/**
 * Roles a user can choose for themselves at registration/onboarding.
 * `admin` is deliberately excluded — it's granted only via
 * `php artisan lessonio:make-admin`, never through self-service signup.
 */
export const SELECTABLE_ROLES = ["student", "teacher"] as const;
export type SelectableAppRole = (typeof SELECTABLE_ROLES)[number];

export interface User extends AuditFields {
  id: UUID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  role: AppRole | null;
}
