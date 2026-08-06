import type { AuditFields, UUID } from "./common";

export interface User extends AuditFields {
  id: UUID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
}
