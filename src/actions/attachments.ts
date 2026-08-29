import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { Attachment } from "@/lib/types/attachment";
import { deleteAttachment, uploadAttachment } from "./attachments.mutations";

/** SSR-facing surface for `Actions.Attachments.*`. Mutations re-export the real Server Actions. */
export const attachmentsActions = {
  async getAllForLesson(lessonId: string): Promise<ActionResult<Attachment[]>> {
    try {
      const { data } = await axios.get<{ data: Attachment[] }>(
        `/api/v1/lessons/${lessonId}/attachments`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  upload: uploadAttachment,
  remove: deleteAttachment,
};
