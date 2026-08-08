import "server-only";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { User } from "@/lib/types/user";
import type { Database } from "@/lib/types/database";
import * as authMutations from "./auth.mutations";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Falls back to `user_metadata` only if the `profiles` row is missing —
 * it shouldn't be (see `handle_new_user()` in
 * supabase/migrations/20260807120002_profiles.sql), but a defensive default
 * is cheap and avoids a broken session for an edge case like a user created
 * before that trigger existed.
 */
function mapUser(authUser: SupabaseUser, profile: ProfileRow | null): User {
  const metadata = authUser.user_metadata;
  const metaFullName =
    typeof metadata.full_name === "string" ? metadata.full_name : null;
  const metaAvatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const metaTimezone =
    typeof metadata.timezone === "string" ? metadata.timezone : null;

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    fullName: profile?.full_name ?? metaFullName,
    avatarUrl: profile?.avatar_url ?? metaAvatarUrl,
    timezone: profile?.timezone ?? metaTimezone,
    createdAt: profile?.created_at ?? authUser.created_at,
    updatedAt: profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
  };
}

/**
 * SSR-facing surface for `Actions.Auth.*`. `getSession` is a plain
 * SSR-only read; the mutations are re-exported references to the real
 * Server Actions defined in `auth.mutations.ts` (imported directly by
 * Client Components — see that file's header comment for why).
 */
export const authActions = {
  async getSession(): Promise<ActionResult<User>> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return { data: null, error: null };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return { data: mapUser(data.user, profile), error: null };
  },

  login: authMutations.login,
  register: authMutations.register,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  updateProfile: authMutations.updateProfile,
  logout: authMutations.logout,
};
