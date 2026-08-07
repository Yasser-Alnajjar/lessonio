import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";
import type { Database } from "@/lib/types/database";

/**
 * Path segments (locale prefix stripped) that never require a session.
 * Everything else is protected by default — new routes are gated unless
 * explicitly listed here.
 */
const PUBLIC_SEGMENTS = new Set<string>(["", "auth/reset-password"]);

/** Auth routes a signed-in user should be bounced away from. */
const SIGNED_OUT_ONLY_SEGMENTS = new Set<string>([
  "auth/login",
  "auth/register",
  "auth/forgot-password",
]);

function getLocalePrefix(pathname: string): string {
  const [, maybeLocale] = pathname.split("/");
  const isLocale = (routing.locales as readonly string[]).includes(
    maybeLocale ?? "",
  );
  // localePrefix "as-needed" — the default locale never appears in the URL.
  return isLocale && maybeLocale !== routing.defaultLocale
    ? `/${maybeLocale}`
    : "";
}

function stripLocale(pathname: string, prefix: string): string {
  const withoutPrefix = prefix ? pathname.slice(prefix.length) : pathname;
  return withoutPrefix.replace(/^\/+/, "");
}

function isSafeNextPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

/**
 * Refreshes the Supabase session cookie and enforces the protected-route
 * policy above. Must run on every matched request — see the `matcher` in
 * `src/proxy.ts`. `intlResponse` is the response next-intl's middleware
 * already produced (locale redirect/rewrite), which we carry forward so
 * both concerns compose instead of one clobbering the other.
 */
export async function updateSession(
  request: NextRequest,
  intlResponse: NextResponse,
): Promise<NextResponse> {
  let response = intlResponse;

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser() (not getSession()) revalidates the token against Supabase Auth
  // on every call — required for middleware to trust the result.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const localePrefix = getLocalePrefix(pathname);
  const segment = stripLocale(pathname, localePrefix);

  if (!user && !PUBLIC_SEGMENTS.has(segment) && !SIGNED_OUT_ONLY_SEGMENTS.has(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/auth/login`;
    const next = `${pathname}${request.nextUrl.search}`;
    if (isSafeNextPath(next)) {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  if (user && SIGNED_OUT_ONLY_SEGMENTS.has(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/dashboard/overview`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
