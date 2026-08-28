import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import type { NextAuthRequest } from "next-auth";

import { auth } from "@auth";
import { routing } from "@/i18n/routing";
import { guardRequest } from "@/lib/auth/guard";

const intlMiddleware = createMiddleware(routing);

export default auth((request: NextAuthRequest) => {
  // Lands here after `OAuthController@callback` (Laravel) redirects back
  // with a one-time Sanctum token in the URL — exchange it for a real
  // session before anything else runs. See
  // `src/app/api/auth/oauth-callback/route.ts` and `src/auth.ts`'s
  // "oauth-token" provider.
  const token = request.nextUrl.searchParams.get("token");
  if (token) {
    const remaining = new URL(request.url);
    remaining.searchParams.delete("token");

    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/api/auth/oauth-callback";
    callbackUrl.search = "";
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set(
      "next",
      `${remaining.pathname}${remaining.search}`,
    );
    return NextResponse.redirect(callbackUrl);
  }

  const intlResponse = intlMiddleware(request);
  return guardRequest(request, intlResponse, request.auth);
});

export const config = {
  // Match all paths except static assets, Next internals, and API routes.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
