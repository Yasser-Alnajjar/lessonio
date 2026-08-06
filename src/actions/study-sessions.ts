import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type {
  StartStudySessionInput,
  StudySession,
  StudySessionSummary,
} from "@/lib/types/study-session";

/** TODO(Phase 10 — Study Sessions): replace stubs with Supabase queries. */
export const studySessionsActions = {
  async getHistory(): Promise<ActionResult<StudySession[]>> {
    return { data: [], error: null };
  },

  async getSummary(): Promise<ActionResult<StudySessionSummary>> {
    return { data: null, error: null };
  },

  async start(_input: StartStudySessionInput): Promise<ActionResult<StudySession>> {
    return { data: null, error: "Not implemented until Phase 10." };
  },

  async stop(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 10." };
  },
};
