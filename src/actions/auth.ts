import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { User } from "@/lib/types/user";

/**
 * TODO(Phase 4 — Authentication): replace every stub below with real
 * Supabase Auth calls (`createServerClient` from `@supabase/ssr`).
 */
export const authActions = {
  async getSession(): Promise<ActionResult<User>> {
    return { data: null, error: null };
  },

  async login(_email: string, _password: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 4." };
  },

  async register(
    _email: string,
    _password: string,
    _fullName: string,
  ): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 4." };
  },

  async requestPasswordReset(_email: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 4." };
  },

  async resetPassword(_token: string, _newPassword: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 4." };
  },

  async logout(): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 4." };
  },
};
