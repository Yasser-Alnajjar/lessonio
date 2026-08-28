import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

/** All application data is authenticated and must never be indexed. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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

  // The bell lives in the header on every page, so its browser-popup
  // preference is resolved once here rather than fetched per route.
  const { data: settings } = await Actions.Settings.get();
  const t = await getTranslations("nav");

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="border-border bg-background/80 sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4 backdrop-blur-md">
          <SidebarTrigger aria-label={t("toggleSidebar")} />
          <div className="flex-1" />
          <GlobalSearch />
          <NotificationBell
            browserNotificationsEnabled={
              settings?.notificationPreferences.enabledInBrowser ?? true
            }
          />
        </header>
        <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 px-4 py-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
