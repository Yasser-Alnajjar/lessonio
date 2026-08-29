"use server";

/**
 * Client-invokable attachment mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly
 * (`@/actions/attachments.mutations`) instead of the `@/actions` barrel.
 * `src/actions/attachments.ts` re-exports these under `Actions.Attachments.*`
 * for SSR use. Same pattern as `subjects.mutations.ts`.
 *
 * Uploads go through this Server Action (rather than a direct browser upload)
 * so every mutation keeps flowing through `Actions.*`, and so the bearer
 * token attached by `src/lib/client/index.ts`'s interceptor covers the
 * request. `next.config.ts` raises `serverActions.bodySizeLimit` to clear
 * the backend's 50 MB file cap.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import {
  attachmentKindForMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/constants/attachments";
import type { MutationResult } from "@/lib/types/common";
import type { Attachment } from "@/lib/types/attachment";

export type UploadAttachmentResult =
  | { success: true; error: null; attachment: Attachment }
  | { success: false; error: string; attachment: null };

export async function uploadAttachment(
  lessonId: string,
  file: File,
): Promise<UploadAttachmentResult> {
  // Fast client-side rejection before spending a network round trip — the
  // backend re-validates both independently and is the real authority.
  if (!attachmentKindForMimeType(file.type)) {
    return { success: false, error: "Unsupported file type.", attachment: null };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { success: false, error: "File is larger than the 50 MB limit.", attachment: null };
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await axios.post<{ data: Attachment }>(
      `/api/v1/lessons/${lessonId}/attachments`,
      formData,
    );
    revalidatePath("/", "layout");
    return { success: true, error: null, attachment: data.data };
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error), attachment: null };
  }
}

export async function deleteAttachment(id: string): Promise<MutationResult> {
  try {
    await axios.delete(`/api/v1/attachments/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
