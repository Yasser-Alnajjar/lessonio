import "server-only";

import { auth } from "@auth";
import type { AppRole } from "@/lib/types/user";

/**
 * Not a Server Action ("use server" would forbid the type exports below) —
 * plain server-only helpers. Reads the NextAuth session directly (`auth()`
 * from `@auth`, deduped per request by Next.js) instead of taking a Supabase
 * client param — there is no separate `profiles` lookup for the role
 * anymore, since `session.user.role` is already populated by the `session`
 * callback in `src/auth.ts`.
 *
 * These are UX conveniences only; the Laravel endpoints (`auth:sanctum`,
 * `role:teacher`, `role:student` middleware) are the real authorization
 * boundary, same as before.
 */

export async function requireUser(): Promise<
  { userId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }
  return { userId: session.user.id };
}

export async function requireRole(
  role: AppRole,
): Promise<{ userId: string; role: AppRole } | { error: string }> {
  const result = await requireUser();
  if ("error" in result) return result;

  const session = await auth();
  if (session?.user?.role !== role) {
    return { error: "You do not have access to this action." };
  }

  return { userId: result.userId, role };
}
