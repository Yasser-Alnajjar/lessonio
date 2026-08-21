"use server";

/**
 * Client-invokable, imported directly by `OnboardingRoleForm` (not through
 * the `Actions` barrel) — same reasoning as `auth.mutations.ts`. There's no
 * SSR read side to this domain, so unlike the domains in `src/actions/index.ts`
 * there's no companion `onboarding.ts` to pair it with.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { AppRole } from "@/lib/types/user";

/** The OAuth path for choosing a role — see set_my_role() in the profiles_role migration. */
export async function setMyRole(role: AppRole): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_role", { p_role: role });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
