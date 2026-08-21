import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/user";

/**
 * Not a Server Action ("use server" would forbid the type exports below) —
 * plain server-only helpers, same shape as the private `getAuthedUserId()`
 * in `classes.mutations.ts` so the ~27 sites inlining
 * `if (error || !data.user)` become a mechanical drop-in later. New teacher
 * code (Phase 2+) uses these; the existing sites are not refactored here.
 */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Deduped per request by `userId` (not by the `supabase` client instance,
 * which differs across call sites) — every `requireRole()` call in the same
 * render only hits `profiles` once.
 */
const getCachedRole = cache(async (userId: string): Promise<AppRole | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role ?? null) as AppRole | null;
});

export async function requireUser(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

export async function requireRole(
  supabase: SupabaseServerClient,
  role: AppRole,
): Promise<{ userId: string; role: AppRole } | { error: string }> {
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth;

  const actualRole = await getCachedRole(auth.userId);
  if (actualRole !== role) {
    return { error: "You do not have access to this action." };
  }

  return { userId: auth.userId, role: actualRole };
}
