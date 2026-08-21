"use client";

import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS, ROLE_HOME, isActivePath } from "@/lib/constants/navigation";
import type { AppRole, User } from "@/lib/types/user";
import type { Route } from "next";

import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { LogoutButton } from "./logout-button";
import { LessonioMark } from "./lessonio-mark";
import { ThemeToggle } from "./theme-toggle";
import { Settings } from "lucide-react";

function initialsOf(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    if (initials) return initials.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface AppSidebarProps {
  user: Pick<User, "fullName" | "email" | "avatarUrl" | "role">;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const t = useTranslations("nav");
  const tTheme = useTranslations("theme");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Falls back to "student" only as a rendering default — a null role here
  // means the middleware hasn't bounced this request to /onboarding/role
  // yet (e.g. an App Router cache navigation), not that the user is a
  // student. RLS, not this fallback, is the real access boundary.
  const role: AppRole = user.role ?? "student";
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const displayName = user.fullName ?? user.email;
  const initials = initialsOf(user.fullName, user.email);

  return (
    <Sidebar side={isArabic ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <Link
          href={ROLE_HOME[role] as Route}
          className="flex items-center gap-2 px-2 py-1"
          aria-label={t("dashboard")}
        >
          <LessonioMark className="h-6 w-auto shrink-0" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label={t("label")}>
              <SidebarMenu>
                {items.map(({ href, key, icon: Icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={t(key)}
                      >
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon />
                          <span>{t(key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar size="default">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>

                  <Settings className="ms-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side={isMobile ? "bottom" : "top"}
                align="end"
                sideOffset={8}
                className="w-56"
              >
                {/* User */}
                <div className="flex items-center gap-2 px-2 py-2">
                  <Avatar size="default">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </p>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Language */}
                <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                  <span className="text-sm">{t("language")}</span>
                  <LanguageSwitch />
                </div>

                {/* Theme */}
                <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                  <span className="text-sm">{tTheme("toggleLabel")}</span>
                  <ThemeToggle />
                </div>

                <DropdownMenuSeparator />

                {/* Logout */}
                <LogoutButton
                  variant="ghost"
                  showLabel
                  className="w-full justify-start"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarRail />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
