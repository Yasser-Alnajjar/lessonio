"use server";

/**
 * Client-invokable, imported directly by `OnboardingRoleForm` (not through
 * the `Actions` barrel) — same reasoning as `auth.mutations.ts`. There's no
 * SSR read side to this domain, so unlike the domains in `src/actions/index.ts`
 * there's no companion `onboarding.ts` to pair it with.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { AppRole } from "@/lib/types/user";

/**
 * The OAuth path for choosing a role (API_CONTRACT.md USER-002). Laravel's
 * `RoleService::assign` does an atomic `UPDATE ... WHERE role IS NULL`, so a
 * second call after the first succeeds comes back `403` rather than
 * silently overwriting an already-set role.
 */
export async function setMyRole(role: AppRole): Promise<MutationResult> {
  try {
    await axios.post("/api/v1/users/me/role", { role });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
