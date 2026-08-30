import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { AppRole, User } from "@/lib/types/user";
import * as authMutations from "./auth.mutations";

interface BackendUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  role: AppRole | null;
  createdAt: string;
  updatedAt: string;
}

function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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
    // No NextAuth session at all — skip the round trip. AUTH-001 (`/auth/me`)
    // also handles this itself (200 with `data: null`), but most SSR
    // components on public pages hit this, so it's worth the short-circuit.
    const session = await auth();
    if (!session?.jwt?.accessToken) return { data: null, error: null };

    try {
      const { data } = await axios.get<{ data: BackendUser | null }>(
        "/api/v1/auth/me",
      );

      // `data.data === null` means the NextAuth JWT cookie is still valid
      // (it's self-contained, unverified against the backend) but the
      // Sanctum token it carries has been revoked. This read-only action
      // can't clear that cookie itself — Server Components can't mutate
      // cookies during render — so it just reports "no user"; callers that
      // gate on this must route through `/api/auth/session-invalid` rather
      // than redirecting to `/auth/login` directly, or `guard.ts` will see
      // the still-valid cookie and immediately bounce them back in.
      return { data: data.data ? mapUser(data.data) : null, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  login: authMutations.login,
  signInWithOAuth: authMutations.signInWithOAuth,
  register: authMutations.register,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  updateProfile: authMutations.updateProfile,
  logout: authMutations.logout,
};
