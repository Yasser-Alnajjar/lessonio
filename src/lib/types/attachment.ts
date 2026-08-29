import type { AuditFields, UUID } from "./common";

export const ATTACHMENT_KINDS = ["image", "pdf", "video", "audio"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export interface Attachment extends AuditFields {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  kind: AttachmentKind;
  fileName: string;
  storagePath: string; // backend object storage path
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

/** Metadata for a public share link. Never carries the token — see `CreatedAttachmentShare`. */
export interface AttachmentShare {
  id: UUID;
  attachmentId: UUID;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Returned once, at creation — the plaintext token cannot be recovered afterwards. */
export interface CreatedAttachmentShare {
  id: UUID;
  attachmentId: UUID;
  token: string;
  url: string;
  expiresAt: string | null;
  createdAt: string;
}

/** Public, unauthenticated resolution of a share token (`/public/attachment-shares/{token}`). */
export interface SharedAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  url: string; // signed, short-lived (15 min) file URL
}
