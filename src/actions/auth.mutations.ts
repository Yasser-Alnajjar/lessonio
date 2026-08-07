"use server";

/**
 * Client-invokable auth mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/auth.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other
 * domains' still-`server-only` stub actions into the client bundle.
 * `src/actions/auth.ts` re-exports these under `Actions.Auth.*` for SSR use.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { MutationResult } from "@/lib/types/common";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/lib/types/auth";

export async function login(input: LoginInput): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function register(input: RegisterInput): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function logout(): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
