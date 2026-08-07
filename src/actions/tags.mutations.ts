"use server";

/**
 * Client-invokable tag mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Same pattern as `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { colorForTagName } from "@/lib/constants/tags";
import type { Tag } from "@/lib/types/tag";

export type CreateTagResult =
  | { success: true; error: null; tag: Tag }
  | { success: false; error: string; tag: null };

/**
 * Find-or-create by name (tags are unique per user by name — see the
 * `unique (user_id, name)` constraint), so picking an already-typed tag
 * never creates a duplicate row.
 */
export async function createTag(name: string): Promise<CreateTagResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Tag name is required.", tag: null };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in.", tag: null };
  }

  const { data: existing } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", authData.user.id)
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      error: null,
      tag: {
        id: existing.id,
        userId: existing.user_id,
        name: existing.name,
        color: existing.color,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      },
    };
  }

  const { data: created, error } = await supabase
    .from("tags")
    .insert({
      user_id: authData.user.id,
      name: trimmed,
      color: colorForTagName(trimmed),
    })
    .select("*")
    .single();

  if (error || !created) {
    return { success: false, error: error?.message ?? "Failed to create tag.", tag: null };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    error: null,
    tag: {
      id: created.id,
      userId: created.user_id,
      name: created.name,
      color: created.color,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    },
  };
}
