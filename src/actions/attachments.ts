import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Attachment } from "@/lib/types/attachment";
import type { Database } from "@/lib/types/database";
import { deleteAttachment, uploadAttachment } from "./attachments.mutations";

type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];
const BUCKET = "attachments";

/** SSR-facing surface for `Actions.Attachments.*`. Mutations re-export the real Server Actions. */
export const attachmentsActions = {
  async getAllForLesson(lessonId: string): Promise<ActionResult<Attachment[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const mapRow = (row: AttachmentRow): Attachment => ({
      id: row.id,
      lessonId: row.lesson_id,
      userId: row.user_id,
      kind: row.kind as Attachment["kind"],
      fileName: row.file_name,
      storagePath: row.storage_path,
      publicUrl: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
      sizeBytes: row.size_bytes,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    return { data: (rows ?? []).map(mapRow), error: null };
  },

  upload: uploadAttachment,
  remove: deleteAttachment,
};
