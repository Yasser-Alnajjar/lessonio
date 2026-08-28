import { NextResponse } from "next/server";
import { AuthError } from "next-auth";

import { signIn } from "@auth";
import { getSafeRedirectPath } from "@/lib/utils";

/**
 * Second half of the OAuth handoff (`src/proxy.ts` sends the request here
 * after catching `?token=` on the way back from Laravel). Exchanges the
 * one-time Sanctum token for a real NextAuth session via the "oauth-token"
 * credentials provider, then redirects to the original destination.
 *
 * Lives outside `[locale]` under `/api`, same reasoning as the old Supabase
 * callback: `proxy.ts`'s matcher excludes `api`, so there's no locale/auth
 * gating to interfere before the session exists.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const next = getSafeRedirectPath(searchParams.get("next"), "/home");

  if (!token) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
  }

  try {
    await signIn("oauth-token", { token, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}${next}`);
}
