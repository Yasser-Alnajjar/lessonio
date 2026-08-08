"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookText,
  Settings,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/user";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { LogoutButton } from "./logout-button";
import { StudyLineMark } from "./study-line-mark";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard/overview", key: "dashboard", icon: LayoutDashboard },
  { href: "/subjects/list", key: "subjects", icon: BookOpen },
  { href: "/lessons/list", key: "lessons", icon: NotebookText },
  { href: "/homework/list", key: "homework", icon: ClipboardList },
  { href: "/exams/list", key: "exams", icon: GraduationCap },
  { href: "/calendar/month", key: "calendar", icon: CalendarDays },
  { href: "/statistics/overview", key: "statistics", icon: BarChart3 },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  const domain = `/${href.split("/")[1]}`;
  return pathname === domain || pathname.startsWith(`${domain}/`);
}

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

interface NavBarProps {
  user: Pick<User, "fullName" | "email" | "avatarUrl">;
}

export function NavBar({ user }: NavBarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale();
  const isArabic = locale === "ar";
  const displayName = user.fullName ?? user.email;
  const initials = initialsOf(user.fullName, user.email);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          href="/dashboard/overview"
          className="flex items-center gap-2"
          aria-label={t("dashboard")}
        >
          <StudyLineMark className="h-6 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const active = isActivePath(pathname, href);
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

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <LanguageSwitch />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t("account")}
                dir={isArabic ? "rtl" : "ltr"}
              >
                <Avatar size="sm">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isArabic ? "start" : "end"}
              className="w-56"
            >
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer">
                  <Settings />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutButton
                variant="ghost"
                className="h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-sm font-normal"
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("openMenu")}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isArabic ? "left" : "right"}
              className="flex flex-col gap-6"
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <StudyLineMark className="h-6 w-auto" />
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-1">
                {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <SheetClose asChild key={key}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={2} />
                        {t(key)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <SheetFooter className="flex-row items-center">
                <ThemeToggle />
                <LanguageSwitch />
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
