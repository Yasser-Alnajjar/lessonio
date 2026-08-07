import type { AttachmentKind } from "@/lib/types/attachment";

/** Matches the `attachments` Storage bucket's `allowed_mime_types` exactly (see the storage migration). */
export const ATTACHMENT_MIME_KIND: Record<string, AttachmentKind> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "pdf",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/wav": "audio",
  "audio/webm": "audio",
};

export const ACCEPTED_ATTACHMENT_MIME_TYPES = Object.keys(ATTACHMENT_MIME_KIND);

/** Matches the bucket's `file_size_limit` (50 MB). */
export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

export function attachmentKindForMimeType(mimeType: string): AttachmentKind | null {
  return ATTACHMENT_MIME_KIND[mimeType] ?? null;
}
