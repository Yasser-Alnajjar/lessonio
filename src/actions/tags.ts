import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { Tag } from "@/lib/types/tag";
import { createTag } from "./tags.mutations";

/**
 * SSR-facing surface for `Actions.Tags.*` — read is a plain query against
 * `GET /api/v1/tags` (TAG-001, already ordered by name server-side), `create`
 * re-exports the Server Action.
 */
export const tagsActions = {
  async getAll(): Promise<ActionResult<Tag[]>> {
    try {
      const { data } = await axios.get<{ data: Tag[] }>("/api/v1/tags");
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  create: createTag,
};
