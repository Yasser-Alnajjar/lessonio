"use client";

import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Presentation,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Copies `modules/settings/components/SettingsNav.tsx`'s tab-strip pattern. */
const ADMIN_NAV_ITEMS = [
  { href: "/admin/overview", key: "overview", icon: LayoutDashboard },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/teacher-classes", key: "classes", icon: Presentation },
  { href: "/admin/assignments", key: "assignments", icon: ClipboardList },
  { href: "/admin/notification-jobs", key: "jobs", icon: Bell },
  {
    href: "/admin/notification-settings",
    key: "notificationSettings",
    icon: ShieldCheck,
  },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="border-border flex flex-wrap gap-1 border-b pb-3"
    >
      {ADMIN_NAV_ITEMS.map(({ href, key, icon: Icon }) => {
        // Matches `/admin/users/[userId]` under the `/admin/users` tab too.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
            )}
          >
            <Icon className="size-4" strokeWidth={2} />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
