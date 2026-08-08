import { getLocale } from "next-intl/server";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { NavBar } from "@/components/shared/nav-bar";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Defense in depth: `proxy.ts` already redirects a signed-out request away
 * from every route not in `PUBLIC_SEGMENTS`, but this checks again in case
 * the client navigated here via the App Router cache rather than a fresh
 * request through the middleware.
 */
export default async function AppLayout({ children }: AppLayoutProps) {
  const { data: user } = await Actions.Auth.getSession();

  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/auth/login", locale });
    return null;
  }

  // The bell lives in the nav on every page, so its browser-popup preference
  // is resolved once here rather than fetched per route.
  const { data: settings } = await Actions.Settings.get();

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <NavBar
        user={user}
        browserNotificationsEnabled={
          settings?.notificationPreferences.enabledInBrowser ?? true
        }
      />
      <main className="mx-auto w-full max-w-7xl flex-1">{children}</main>
    </div>
  );
}
