import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Tag } from "@/lib/types/tag";
import { createTag } from "./tags.mutations";

/** SSR-facing surface for `Actions.Tags.*` — read is a plain query, `create` re-exports the Server Action. */
export const tagsActions = {
  async getAll(): Promise<ActionResult<Tag[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("name", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: (rows ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      error: null,
    };
  },

  create: createTag,
};
