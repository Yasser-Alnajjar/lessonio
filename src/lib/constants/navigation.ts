import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  NotebookText,
  Percent,
  Settings,
  Target,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the primary application navigation, shared by
 * the sidebar (desktop persistent + mobile drawer). Order matters: it's the
 * order items render in.
 */
export const NAV_ITEMS = [
  { href: "/dashboard/overview", key: "dashboard", icon: LayoutDashboard },
  { href: "/subjects/list", key: "subjects", icon: BookOpen },
  { href: "/classes/list", key: "classes", icon: CalendarClock },
  { href: "/lessons/list", key: "lessons", icon: NotebookText },
  { href: "/flashcards/deck", key: "flashcards", icon: Layers },
  { href: "/study-sessions/focus", key: "studySessions", icon: Timer },
  { href: "/homework/list", key: "homework", icon: ClipboardList },
  { href: "/exams/list", key: "exams", icon: GraduationCap },
  { href: "/grades/overview", key: "grades", icon: Percent },
  { href: "/calendar/month", key: "calendar", icon: CalendarDays },
  { href: "/statistics/overview", key: "statistics", icon: BarChart3 },
  { href: "/gamification/goals", key: "goals", icon: Target },
  { href: "/gamification/achievements", key: "achievements", icon: Trophy },
  { href: "/notifications/center", key: "notifications", icon: Bell },
  { href: "/settings/profile", key: "settings", icon: Settings },
] as const satisfies readonly NavItem[];

const ALL_NAV_HREFS = NAV_ITEMS.map((item) => item.href);

/**
 * Matches on the first path segment ("domain") so any sub-route (e.g. a
 * lesson detail page) still highlights its domain's single list nav item.
 * When a domain has more than one nav entry (gamification/goals vs
 * gamification/achievements), that's too coarse — it would light up both —
 * so those domains additionally require the second segment to match.
 */
export function isActivePath(pathname: string, href: string): boolean {
  const domain = `/${href.split("/")[1]}`;
  const inDomain = pathname === domain || pathname.startsWith(`${domain}/`);
  if (!inDomain) return false;

  const siblings = ALL_NAV_HREFS.filter((h) => h.startsWith(`${domain}/`));
  if (siblings.length <= 1) return true;

  return pathname.split("/")[2] === href.split("/")[2];
}
