"use server";

/**
 * Client-invokable attachment mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly
 * (`@/actions/attachments.mutations`) instead of the `@/actions` barrel.
 * `src/actions/attachments.ts` re-exports these under `Actions.Attachments.*`
 * for SSR use. Same pattern as `subjects.mutations.ts`.
 *
 * Uploads go through this Server Action (rather than the browser Supabase
 * client) so every mutation keeps flowing through `Actions.*`, per the
 * architecture note in `lib/supabase/client.ts`. `next.config.ts` raises
 * `serverActions.bodySizeLimit` to clear the bucket's 50 MB file cap.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  attachmentKindForMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/constants/attachments";
import type { MutationResult } from "@/lib/types/common";
import type { Attachment } from "@/lib/types/attachment";

const BUCKET = "attachments";

export type UploadAttachmentResult =
  | { success: true; error: null; attachment: Attachment }
  | { success: false; error: string; attachment: null };

function publicUrlFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): string {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function uploadAttachment(
  lessonId: string,
  file: File,
): Promise<UploadAttachmentResult> {
  const kind = attachmentKindForMimeType(file.type);
  if (!kind) {
    return { success: false, error: "Unsupported file type.", attachment: null };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { success: false, error: "File is larger than the 50 MB limit.", attachment: null };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in.", attachment: null };
  }

  // Ownership of the lesson (and therefore the folder we're about to write
  // into) must be verified server-side before touching Storage — the RLS
  // policy on storage.objects only checks that the path's first segment is
  // the caller's own user id, not that lessonId actually belongs to them.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!lesson) {
    return { success: false, error: "Lesson not found.", attachment: null };
  }

  const storagePath = `${authData.user.id}/${lessonId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: uploadError.message, attachment: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("attachments")
    .insert({
      lesson_id: lessonId,
      user_id: authData.user.id,
      kind,
      file_name: file.name,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return {
      success: false,
      error: insertError?.message ?? "Failed to save attachment.",
      attachment: null,
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    error: null,
    attachment: {
      id: created.id,
      lessonId: created.lesson_id,
      userId: created.user_id,
      kind: created.kind as Attachment["kind"],
      fileName: created.file_name,
      storagePath: created.storage_path,
      publicUrl: publicUrlFor(supabase, created.storage_path),
      sizeBytes: created.size_bytes,
      mimeType: created.mime_type,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    },
  };
}

export async function deleteAttachment(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!attachment) return { success: false, error: "Attachment not found." };

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([attachment.storage_path]);
  if (storageError) return { success: false, error: storageError.message };

  const { error: deleteError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("user_id", authData.user.id);
  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
