import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/utils";

/**
 * OAuth callback for Supabase's PKCE flow (Google, Microsoft/Azure, ...).
 * Lives outside `[locale]` under `/api` so `proxy.ts`'s matcher (which
 * excludes `api`) never runs the session/locale middleware against it —
 * there's no session yet for `updateSession` to check.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"), "/dashboard/overview");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
