"use server";

/**
 * Client-invokable homework mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/homework.mutations`) instead of the
 * `@/actions` barrel. `src/actions/homework.ts` re-exports these under
 * `Actions.Homework.*` for SSR use. Same pattern as `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateHomeworkInput, UpdateHomeworkInput } from "@/lib/types/homework";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type HomeworkUpdate = Database["public"]["Tables"]["homework"]["Update"];

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

/** Looks up the lesson's subject server-side — never trust a client-supplied subject id. */
async function resolveSubjectId(
  supabase: SupabaseServerClient,
  userId: string,
  lessonId: string,
): Promise<{ subjectId: string } | { error: string }> {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("subject_id")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!lesson) return { error: "Lesson not found." };
  return { subjectId: lesson.subject_id };
}

export async function createHomework(input: CreateHomeworkInput): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const subject = await resolveSubjectId(supabase, auth.userId, input.lessonId);
  if ("error" in subject) return { success: false, error: subject.error };

  const { error } = await supabase.from("homework").insert({
    user_id: auth.userId,
    lesson_id: input.lessonId,
    subject_id: subject.subjectId,
    title: input.title,
    deadline: input.deadline,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateHomework(
  id: string,
  input: UpdateHomeworkInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: HomeworkUpdate = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (input.completed !== undefined) patch.completed = input.completed;

  if (input.lessonId !== undefined) {
    const subject = await resolveSubjectId(supabase, auth.userId, input.lessonId);
    if ("error" in subject) return { success: false, error: subject.error };
    patch.lesson_id = input.lessonId;
    patch.subject_id = subject.subjectId;
  }

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("homework")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function toggleHomeworkCompleted(
  id: string,
  completed: boolean,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("homework")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteHomework(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
