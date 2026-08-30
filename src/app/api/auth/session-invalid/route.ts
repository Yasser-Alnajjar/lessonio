import { NextResponse } from "next/server";

import { signOut } from "@auth";
import { getSafeRedirectPath } from "@/lib/utils";

/**
 * The NextAuth JWT session cookie is self-contained and never round-trips
 * to Laravel in `src/proxy.ts`/`src/lib/auth/guard.ts`, so it can outlive
 * the backend's own session (token revoked, user deleted). When
 * `Actions.Auth.getSession()` (`src/actions/auth.ts`) detects that mismatch
 * — `/api/v1/auth/me` returns `data: null` for a still-valid cookie —
 * callers must redirect here instead of straight to `/auth/login`: only a
 * Route Handler can clear the cookie (Server Components can't mutate
 * cookies during render). Redirecting straight to `/auth/login` without
 * clearing it left `guard.ts`'s `SIGNED_OUT_ONLY_SEGMENTS` check seeing a
 * still-authenticated request there and bouncing it right back, looping
 * forever between the protected route and the login page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = getSafeRedirectPath(searchParams.get("next"), "/home");

  await signOut({ redirect: false });

  const url = new URL("/auth/login", origin);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}
