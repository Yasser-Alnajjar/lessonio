import type { AuditFields, UUID } from "./common";

export interface Tag extends AuditFields {
  id: UUID;
  userId: UUID;
  name: string;
  color: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
}
