"use server";

/**
 * Client-invokable study-session mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/study-sessions.mutations`)
 * instead of the `@/actions` barrel. `src/actions/study-sessions.ts`
 * re-exports these under `Actions.StudySessions.*` for SSR use. Same pattern
 * as `homework.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type {
  LogStudySessionInput,
  StartStudySessionInput,
} from "@/lib/types/study-session";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

/** Verifies the lesson belongs to the user and returns its subject — never trust a client-supplied subject id. */
async function resolveSubjectFromLesson(
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

async function verifySubject(
  supabase: SupabaseServerClient,
  userId: string,
  subjectId: string,
): Promise<{ subjectId: string } | { error: string }> {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!subject) return { error: "Subject not found." };
  return { subjectId: subject.id };
}

/** Resolves the (subjectId, lessonId) pair to store, verifying ownership server-side. A lesson always wins over a bare subject id. */
async function resolveRelations(
  supabase: SupabaseServerClient,
  userId: string,
  input: { subjectId?: string; lessonId?: string },
): Promise<
  { subjectId: string | null; lessonId: string | null } | { error: string }
> {
  if (input.lessonId) {
    const lesson = await resolveSubjectFromLesson(
      supabase,
      userId,
      input.lessonId,
    );
    if ("error" in lesson) return { error: lesson.error };
    return { subjectId: lesson.subjectId, lessonId: input.lessonId };
  }

  if (input.subjectId) {
    const subject = await verifySubject(supabase, userId, input.subjectId);
    if ("error" in subject) return { error: subject.error };
    return { subjectId: subject.subjectId, lessonId: null };
  }

  return { subjectId: null, lessonId: null };
}

export async function startStudySession(
  input: StartStudySessionInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: running, error: runningError } = await supabase
    .from("study_sessions")
    .select("id")
    .eq("user_id", auth.userId)
    .is("ended_at", null)
    .maybeSingle();
  if (runningError) return { success: false, error: runningError.message };
  if (running)
    return { success: false, error: "A study session is already running." };

  const relations = await resolveRelations(supabase, auth.userId, input);
  if ("error" in relations) return { success: false, error: relations.error };

  const { error } = await supabase.from("study_sessions").insert({
    user_id: auth.userId,
    subject_id: relations.subjectId,
    lesson_id: relations.lessonId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function stopStudySession(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("study_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .is("ended_at", null);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Discards a session that was started by mistake — only while it's still running. */
export async function cancelStudySession(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId)
    .is("ended_at", null);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteStudySession(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Logs time already studied (offline, or forgotten to start the timer).
 * `duration_minutes` is a generated stored column on `study_sessions`
 * (`ended_at - started_at`) — it can't be inserted directly, so `endedAt`
 * is derived from `startedAt + durationMinutes` and the column fills itself.
 */
export async function logManualSession(
  input: LogStudySessionInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const relations = await resolveRelations(supabase, auth.userId, input);
  if ("error" in relations) return { success: false, error: relations.error };

  const startedAt = new Date(input.startedAt);
  if (Number.isNaN(startedAt.getTime())) {
    return { success: false, error: "Invalid start time." };
  }
  const endedAt = new Date(
    startedAt.getTime() + input.durationMinutes * 60_000,
  );

  const { error } = await supabase.from("study_sessions").insert({
    user_id: auth.userId,
    subject_id: relations.subjectId,
    lesson_id: relations.lessonId,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
export async function updateStudySession(
  id: string,
  input: LogStudySessionInput,
): Promise<MutationResult> {
  const supabase = await createClient();

  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const startedAt = new Date(input.startedAt);

  if (Number.isNaN(startedAt.getTime())) {
    return {
      success: false,
      error: "Invalid start time.",
    };
  }

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return {
      success: false,
      error: "Duration must be greater than zero.",
    };
  }

  const relations = await resolveRelations(supabase, auth.userId, input);

  if ("error" in relations) {
    return {
      success: false,
      error: relations.error,
    };
  }

  const endedAt = new Date(
    startedAt.getTime() + input.durationMinutes * 60_000,
  );

  const { data: updatedSession, error } = await supabase
    .from("study_sessions")
    .update({
      subject_id: relations.subjectId,
      lesson_id: relations.lessonId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
    })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (!updatedSession) {
    return {
      success: false,
      error: "Study session not found.",
    };
  }

  revalidatePath("/", "layout");

  return {
    success: true,
    error: null,
  };
}
