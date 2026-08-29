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

import { auth } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type {
  LogStudySessionInput,
  StartStudySessionInput,
} from "@/lib/types/study-session";

/**
 * `POST /api/v1/study-sessions` (SESSION-004). Relation resolution
 * (`lessonId` wins over a bare `subjectId`, ownership verified) now happens
 * server-side in `StudySessionService::resolveRelations` — the client no
 * longer looks up the lesson's subject itself.
 *
 * The "only one running session" guard is **not enforced by the API**
 * (API_CONTRACT.md §7.20: "nothing enforces one running session per user —
 * there is no unique constraint... the UI prevents it, but the API does
 * not"), so this still checks `GET /study-sessions/running` first, exactly
 * as the Supabase version pre-checked before inserting.
 */
export async function startStudySession(
  input: StartStudySessionInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    const { data: running } = await axios.get<{ data: unknown | null }>(
      "/api/v1/study-sessions/running",
    );
    if (running.data) {
      return { success: false, error: "A study session is already running." };
    }
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  try {
    await axios.post("/api/v1/study-sessions", {
      subjectId: input.subjectId ?? null,
      lessonId: input.lessonId ?? null,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** `POST /api/v1/study-sessions/{id}/stop` (SESSION-005) — idempotent: a double-stop silently no-ops server-side. */
export async function stopStudySession(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.post(`/api/v1/study-sessions/${id}/stop`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Discards a session that was started by mistake — only while it's still running. `POST /api/v1/study-sessions/{id}/cancel` (SESSION-006) deletes the row rather than ending it. */
export async function cancelStudySession(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.post(`/api/v1/study-sessions/${id}/cancel`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteStudySession(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.delete(`/api/v1/study-sessions/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Logs time already studied (offline, or forgotten to start the timer).
 * `POST /api/v1/study-sessions/manual` (SESSION-007) — `endedAt` is computed
 * server-side from `startedAt + durationMinutes` since `duration_minutes` is
 * a generated column that can't be written directly.
 */
export async function logManualSession(
  input: LogStudySessionInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  if (Number.isNaN(new Date(input.startedAt).getTime())) {
    return { success: false, error: "Invalid start time." };
  }

  try {
    await axios.post("/api/v1/study-sessions/manual", {
      subjectId: input.subjectId ?? null,
      lessonId: input.lessonId ?? null,
      startedAt: input.startedAt,
      durationMinutes: input.durationMinutes,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * `PATCH /api/v1/study-sessions/{id}` (SESSION-008) — edits a logged
 * session; same fields as manual logging, re-deriving `endedAt` server-side.
 * **Not exported through the `Actions` barrel** — imported directly by
 * `modules/study-sessions/components/LogSessionDialog.tsx`.
 */
export async function updateStudySession(
  id: string,
  input: LogStudySessionInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  if (Number.isNaN(new Date(input.startedAt).getTime())) {
    return { success: false, error: "Invalid start time." };
  }

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return { success: false, error: "Duration must be greater than zero." };
  }

  try {
    await axios.patch(`/api/v1/study-sessions/${id}`, {
      subjectId: input.subjectId ?? null,
      lessonId: input.lessonId ?? null,
      startedAt: input.startedAt,
      durationMinutes: input.durationMinutes,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
