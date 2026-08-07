import "server-only";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { User } from "@/lib/types/user";
import * as authMutations from "./auth.mutations";

function mapUser(user: SupabaseUser): User {
  const metadata = user.user_metadata;
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const timezone =
    typeof metadata.timezone === "string" ? metadata.timezone : null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName,
    avatarUrl,
    timezone,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
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

    return { data: mapUser(data.user), error: null };
  },

  login: authMutations.login,
  register: authMutations.register,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  logout: authMutations.logout,
};
