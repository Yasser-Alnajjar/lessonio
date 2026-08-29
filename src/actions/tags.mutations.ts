"use server";

/**
 * Client-invokable tag mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Same pattern as `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { Tag } from "@/lib/types/tag";

export type CreateTagResult =
  | { success: true; error: null; tag: Tag }
  | { success: false; error: string; tag: null };

/**
 * Find-or-create by name (tags are unique per user by name — see the
 * `unique (user_id, name)` constraint), so picking an already-typed tag
 * never creates a duplicate row. `POST /api/v1/tags` (TAG-002) does the
 * find-or-create server-side and always returns `200`, never `201`, since
 * the row may have already existed.
 *
 * `color` is **not** sent — Laravel derives it server-side from the name via
 * its own port of `colorForTagName()`; the client no longer chooses it.
 */
export async function createTag(name: string): Promise<CreateTagResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Tag name is required.", tag: null };
  }

  try {
    const { data } = await axios.post<{ data: Tag }>("/api/v1/tags", {
      name: trimmed,
    });

    revalidatePath("/", "layout");
    return { success: true, error: null, tag: data.data };
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error), tag: null };
  }
}
