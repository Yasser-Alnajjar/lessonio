import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

import { routing } from "@/i18n/routing";
import { ROLE_HOME } from "@/lib/constants/navigation";
import { APP_ROLES, type AppRole } from "@/lib/types/user";

/**
 * Path segments (locale prefix stripped) that never require a session.
 * Everything else is protected by default — new routes are gated unless
 * explicitly listed here.
 */
const PUBLIC_SEGMENTS = new Set<string>(["", "docs", "auth/reset-password"]);

/**
 * Segment prefixes that never require a session. Unlike `PUBLIC_SEGMENTS`,
 * these carry a variable suffix (a share token) so an exact match won't do.
 */
const PUBLIC_PREFIXES = ["share/"];

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
  admin: "admin",
};

const ONBOARDING_SEGMENT = "onboarding/role";
const ROLE_NEUTRAL_ENTRY = "home";

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
  return (APP_ROLES as readonly unknown[]).includes(value);
}

/**
 * Enforces the protected-route policy for `src/proxy.ts`. Role no longer
 * needs a database round trip the way the Supabase-era `updateSession()`
 * did (see git history / `resolveRole()`) — it's already embedded in the
 * session JWT at login time (`src/auth.ts`'s `jwt` callback), since that's
 * what Laravel's `/auth/login` response returns.
 */
export function guardRequest(
  request: NextRequest,
  intlResponse: NextResponse,
  session: Session | null,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const localePrefix = getLocalePrefix(pathname);
  const segment = stripLocale(pathname, localePrefix);
  const userId = session?.user?.id ?? null;

  if (
    !userId &&
    !PUBLIC_SEGMENTS.has(segment) &&
    !PUBLIC_PREFIXES.some((prefix) => segment.startsWith(prefix)) &&
    !SIGNED_OUT_ONLY_SEGMENTS.has(segment)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/auth/login`;
    const next = `${pathname}${request.nextUrl.search}`;
    url.search = "";
    if (isSafeNextPath(next)) {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  if (userId && isRoleRelevant(segment)) {
    const role = isAppRole(session?.user?.role) ? session.user.role : null;

    // A null role means onboarding was never finished (only reachable via
    // OAuth). Every other role-relevant branch below assumes role is
    // non-null, so this check must run first and short-circuit the rest.
    if (role === null && segment !== ONBOARDING_SEGMENT) {
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

  return intlResponse;
}
