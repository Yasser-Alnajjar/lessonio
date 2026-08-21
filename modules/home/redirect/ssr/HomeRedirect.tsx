import { getLocale } from "next-intl/server";
import type { Route } from "next";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { ROLE_HOME } from "@/lib/constants/navigation";

/**
 * Role-neutral post-auth entry point: every sign-in/sign-up flow lands here,
 * and this immediately forwards to the role's actual home. `proxy.ts`
 * already does this redirect for a fresh request (see `ROLE_NEUTRAL_ENTRY`
 * in `middleware.ts`) — this is the same defense-in-depth as the `(app)`
 * layout's own auth guard, for an App-Router-cache navigation that skips
 * the middleware.
 */
export const HomeRedirect = async () => {
  const { data: user } = await Actions.Auth.getSession();
  const locale = await getLocale();

  const role = user?.role ?? "student";
  redirect({ href: ROLE_HOME[role] as Route, locale });
  return null;
};
