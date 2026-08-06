import type { AuditFields, UUID } from "./common";

export const ATTACHMENT_KINDS = ["image", "pdf", "video", "audio"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export interface Attachment extends AuditFields {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  kind: AttachmentKind;
  fileName: string;
  storagePath: string; // Supabase Storage object path
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}
