import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { UserSettings } from "@/lib/types/settings";

/** TODO(Phase 16 — Settings): replace stubs with Supabase queries. */
export const settingsActions = {
  async get(): Promise<ActionResult<UserSettings>> {
    return { data: null, error: null };
  },

  async update(_input: Partial<UserSettings>): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 16." };
  },

  async exportData(): Promise<ActionResult<{ downloadUrl: string }>> {
    return { data: null, error: "Not implemented until Phase 16." };
  },

  async deleteAccount(): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 16." };
  },
};
