import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";
import { ROLE_HOME } from "@/lib/constants/navigation";
import type { Database } from "@/lib/types/database";
import type { AppRole } from "@/lib/types/user";

/**
 * Path segments (locale prefix stripped) that never require a session.
 * Everything else is protected by default — new routes are gated unless
 * explicitly listed here.
 */
const PUBLIC_SEGMENTS = new Set<string>(["", "docs", "auth/reset-password"]);

/** Auth routes a signed-in user should be bounced away from. */
const SIGNED_OUT_ONLY_SEGMENTS = new Set<string>([
  "auth/login",
  "auth/register",
  "auth/forgot-password",
]);

/**
 * Segment prefix -> the role required under it. Gating on role alone, never
 * an enrollment count — an unenrolled student still loads every
 * `classroom/*` route normally.
 */
const ROLE_PREFIXES: Record<string, AppRole> = {
  teaching: "teacher",
  classroom: "student",
};

const ONBOARDING_SEGMENT = "onboarding/role";
const ROLE_NEUTRAL_ENTRY = "home";

/**
 * Whether resolving this request needs a role at all. Ordinary student
 * routes (lessons, subjects, ...) never hit this, so they cost exactly what
 * they cost before role existed.
 */
function isRoleRelevant(segment: string): boolean {
  if (segment === ROLE_NEUTRAL_ENTRY || segment === ONBOARDING_SEGMENT)
    return true;
  if (SIGNED_OUT_ONLY_SEGMENTS.has(segment)) return true;
  return Object.keys(ROLE_PREFIXES).some(
    (prefix) => segment === prefix || segment.startsWith(`${prefix}/`),
  );
}

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
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
  );
}

function isAppRole(value: unknown): value is AppRole {
  return value === "student" || value === "teacher";
}

type SupabaseMiddlewareClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Resolves the signed-in user's role for a role-relevant request.
 *
 * Prefers the `user_role` JWT claim the custom access token hook (see
 * `supabase/migrations/20260826130000_custom_access_token_hook.sql`) stamps
 * onto the token once enabled in the Supabase Dashboard — that costs
 * nothing beyond the token verification `updateSession()` already did via
 * `getClaims()`. The hook stamps a genuinely unset role as JSON `null`,
 * distinguishable from the claim being entirely absent (the hook isn't
 * enabled yet, or this token predates it), which is the fallback case: the
 * original `profiles` query, so this file degrades correctly whether or not
 * the Dashboard step has been done.
 */
async function resolveRole(
  supabase: SupabaseMiddlewareClient,
  userId: string,
  claims: Record<string, unknown> | null,
  segment: string,
): Promise<{ value: AppRole | null } | { error: true }> {
  const claimedRole = claims?.user_role;

  if (isAppRole(claimedRole)) {
    return { value: claimedRole };
  }
  if (claimedRole === null) {
    return { value: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // A failed lookup (network blip, pooler timeout, RLS/auth mismatch, ...)
  // is not the same as "row has no role" — treating it as null would send
  // a user who genuinely has a role into onboarding whenever this query
  // happens to fail. Fail open and log instead of misredirecting.
  if (profileError) {
    console.error("[middleware] profiles role lookup failed", {
      userId,
      segment,
      error: profileError,
    });
    return { error: true };
  }

  return { value: (profile?.role ?? null) as AppRole | null };
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

  // getClaims() (not getSession()) is what makes this trustworthy in
  // middleware: for this project's HS256-signed tokens it falls back to an
  // Auth-server getUser() call internally, the same revalidation getUser()
  // itself did — so identity verification costs exactly what it did before,
  // and the decoded payload (including a `user_role` claim, once the access
  // token hook is enabled) comes back as a side effect instead of requiring
  // a second round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;
  const userId = claims?.sub ?? null;

  const pathname = request.nextUrl.pathname;
  const localePrefix = getLocalePrefix(pathname);
  const segment = stripLocale(pathname, localePrefix);

  if (
    !userId &&
    !PUBLIC_SEGMENTS.has(segment) &&
    !SIGNED_OUT_ONLY_SEGMENTS.has(segment)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/auth/login`;
    const next = `${pathname}${request.nextUrl.search}`;
    if (isSafeNextPath(next)) {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  if (userId && isRoleRelevant(segment)) {
    const resolved = await resolveRole(supabase, userId, claims, segment);
    if ("error" in resolved) return response;

    const role = resolved.value;

    // A null role means onboarding was never finished (only reachable via
    // OAuth — see set_my_role() in the profiles_role migration). Every other
    // role-relevant branch below assumes role is non-null, so this check
    // must run first and short-circuit the rest.
    if (role === null && segment !== ONBOARDING_SEGMENT) {
      console.warn("[middleware] sending user to onboarding: no role found", {
        userId,
        segment,
      });
      const url = request.nextUrl.clone();
      url.pathname = `${localePrefix}/${ONBOARDING_SEGMENT}`;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (role !== null) {
      if (
        segment === ROLE_NEUTRAL_ENTRY ||
        SIGNED_OUT_ONLY_SEGMENTS.has(segment)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = `${localePrefix}${ROLE_HOME[role]}`;
        url.search = "";
        return NextResponse.redirect(url);
      }

      for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
        const inPrefix = segment === prefix || segment.startsWith(`${prefix}/`);
        if (inPrefix && role !== requiredRole) {
          const url = request.nextUrl.clone();
          url.pathname = `${localePrefix}${ROLE_HOME[role]}`;
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}
