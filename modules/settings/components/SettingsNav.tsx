"use client";

import { Bell, Database, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const SETTINGS_NAV_ITEMS = [
  { href: "/settings/profile", key: "profile", icon: User },
  // { href: "/settings/appearance", key: "appearance", icon: Palette },
  {
    href: "/settings/notification-preferences",
    key: "notifications",
    icon: Bell,
  },
  { href: "/settings/data", key: "data", icon: Database },
] as const;

export function SettingsNav() {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="border-border flex flex-wrap gap-1 border-b pb-3"
    >
      {SETTINGS_NAV_ITEMS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href;
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
