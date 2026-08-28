"use server";

/**
 * Client-invokable auth mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/auth.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other
 * domains' still-`server-only` stub actions into the client bundle.
 * `src/actions/auth.ts` re-exports these under `Actions.Auth.*` for SSR use.
 */

import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import { getSafeRedirectPath } from "@/lib/utils";
import type { MutationResult } from "@/lib/types/common";
import type {
  ForgotPasswordInput,
  LoginInput,
  OAuthProvider,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "@/lib/types/auth";

/** Providers Laravel's `OAuthController` actually wires up (API_CONTRACT.md AUTH-005). */
const SUPPORTED_OAUTH_PROVIDERS: readonly OAuthProvider[] = ["google"];

export async function login(input: LoginInput): Promise<MutationResult> {
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Redirects to Laravel's OAuth entry point (`OAuthController@redirect`),
 * which redirects to the provider and, on the way back, appends a
 * short-lived Sanctum token to the URL of whatever `next` resolves to.
 * `src/proxy.ts` catches that `?token=` and exchanges it for a real session
 * — see `src/app/api/auth/oauth-callback/route.ts`.
 *
 * The target must be **browser-reachable**, unlike every other call in this
 * file — `BACKEND_URL` (used by `src/lib/client`) is only reachable from the
 * Next.js server process. `NEXT_PUBLIC_API_BASE_URL`, or a relative path
 * routed by nginx in production, is what the browser can actually follow.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  next?: string,
): Promise<MutationResult> {
  if (!SUPPORTED_OAUTH_PROVIDERS.includes(provider)) {
    return { success: false, error: "This provider isn't available yet." };
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const safeNext = getSafeRedirectPath(next, "/home");
  const redirectUrl = `${apiBase}/api/v1/auth/oauth/${provider}/redirect?next=${encodeURIComponent(safeNext)}`;

  redirect(redirectUrl as Route);
}

export async function register(input: RegisterInput): Promise<MutationResult> {
  // Whitelisted server-side even though the client already validates it —
  // mirrors the `role: in:student,teacher` rule in Laravel's
  // `RegisterRequest`, since client-supplied data is never trusted blindly.
  const role = input.role === "teacher" ? "teacher" : "student";

  try {
    await axios.post("/api/v1/auth/register", {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      role,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  return { success: true, error: null };
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<MutationResult> {
  try {
    await axios.post("/api/v1/auth/forgot-password", { email: input.email });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  return { success: true, error: null };
}

/**
 * Laravel's reset flow needs `token`/`email` from the emailed link — unlike
 * Supabase, there's no recovery session already established client-side
 * (API_CONTRACT.md AUTH-008, RISK-06). `ResetPasswordForm` reads them from
 * the URL and passes them through here rather than as form fields.
 */
export async function resetPassword(
  input: ResetPasswordInput,
  meta: { token: string; email: string },
): Promise<MutationResult> {
  try {
    await axios.post("/api/v1/auth/reset-password", {
      token: meta.token,
      email: meta.email,
      password: input.password,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<MutationResult> {
  try {
    await axios.patch("/api/v1/users/me", {
      fullName: input.fullName,
      timezone: input.timezone,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function logout(): Promise<MutationResult> {
  // Revoke the Sanctum token server-side first, while the axios interceptor
  // can still attach it from the (about to be cleared) NextAuth session.
  // A failure here (already-expired token) shouldn't block signing out of
  // the UI, so it's swallowed rather than surfaced.
  await axios.post("/api/v1/auth/logout").catch(() => {});
  await signOut({ redirect: false });

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
