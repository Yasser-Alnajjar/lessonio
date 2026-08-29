import "server-only";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { ActionResult } from "@/lib/types/common";
import type { Attachment, SharedAttachment } from "@/lib/types/attachment";
import {
  createAttachmentShare,
  deleteAttachment,
  listAttachmentShares,
  revokeAttachmentShare,
  uploadAttachment,
} from "./attachments.mutations";

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

  /** Public, unauthenticated lookup behind a share token — no session to attach. */
  async resolveShare(token: string): Promise<ActionResult<SharedAttachment>> {
    try {
      const { data } = await axios.get<{ data: SharedAttachment }>(
        `/api/v1/public/attachment-shares/${token}`,
      );
      return { data: data.data, error: null };
    } catch (error) {
      return { data: null, error: getApiErrorMessage(error, "This share link is invalid or has expired.") };
    }
  },

  upload: uploadAttachment,
  remove: deleteAttachment,
  listShares: listAttachmentShares,
  createShare: createAttachmentShare,
  revokeShare: revokeAttachmentShare,
};
