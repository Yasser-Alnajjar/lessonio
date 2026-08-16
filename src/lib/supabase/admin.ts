import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "@/lib/types/database";

/**
 * Service-role Supabase client. **Bypasses Row Level Security entirely** — it
 * can read and write every user's rows, so every query made through it must
 * scope itself by `user_id` by hand.
 *
 * One caller, doing something a signed-in user's own policies structurally
 * cannot grant them: `src/actions/settings.mutations.ts` `deleteAccount` —
 * deleting an `auth.users` row requires the `auth.admin` API, which no RLS
 * policy on any table can expose to `authenticated`.
 *
 * Never import this from a Client Component, and never reach for it to work
 * around an RLS policy that is doing its job — use `createClient()` from
 * `./server.ts` for anything acting on behalf of the signed-in user.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — account deletion cannot run without it.",
    );
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
