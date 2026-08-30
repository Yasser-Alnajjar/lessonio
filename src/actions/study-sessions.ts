import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type {
  StudySessionSummary,
  StudySessionWithRelations,
} from "@/lib/types/study-session";
import {
  cancelStudySession,
  deleteStudySession,
  logManualSession,
  startStudySession,
  stopStudySession,
} from "./study-sessions.mutations";

const EMPTY_SUMMARY: StudySessionSummary = {
  totalMinutesThisWeek: 0,
  totalMinutesToday: 0,
  averageSessionMinutes: 0,
  sessionsThisWeek: 0,
};

/** SSR-facing surface for `Actions.StudySessions.*`. Mutations re-export the real Server Actions. */
export const studySessionsActions = {
  /**
   * `GET /api/v1/study-sessions` (SESSION-001, soft-empty — API_CONTRACT.md
   * §3.5). `StudySessionService::history()` still excludes the running
   * session (`whereNotNull('ended_at')`), same as the old
   * `.not("ended_at", "is", null)` filter — the running session stays only
   * in `getRunning()`. Ordered `started_at DESC`.
   */
  async getHistory(): Promise<ActionResult<StudySessionWithRelations[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: StudySessionWithRelations[] }>(
        "/api/v1/study-sessions",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /** The single open session (`ended_at is null`), or null. Backs the Start/Stop timer UI. `GET /api/v1/study-sessions/running` (SESSION-002, soft-empty). */
  async getRunning(): Promise<ActionResult<StudySessionWithRelations | null>> {
    const session = await auth();
    if (!session?.user?.id) return { data: null, error: null };

    try {
      const { data } = await axios.get<{
        data: StudySessionWithRelations | null;
      }>("/api/v1/study-sessions/running");
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  /** `GET /api/v1/study-sessions/summary` (SESSION-003, soft-empty). */
  async getSummary(): Promise<ActionResult<StudySessionSummary>> {
    const session = await auth();
    if (!session?.user?.id) return { data: EMPTY_SUMMARY, error: null };

    try {
      const { data } = await axios.get<{ data: StudySessionSummary }>(
        "/api/v1/study-sessions/summary",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: EMPTY_SUMMARY, error: null };
    }
  },

  start: startStudySession,
  stop: stopStudySession,
  cancel: cancelStudySession,
  remove: deleteStudySession,
  logManual: logManualSession,
};
