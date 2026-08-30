import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  NotebookText,
  Percent,
  Presentation,
  Settings,
  ShieldCheck,
  Target,
  Timer,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { APP_ROLES, type AppRole } from "@/lib/types/user";

export interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
  roles: readonly AppRole[];
}

const STUDENT_ONLY: readonly AppRole[] = ["student"];
const TEACHER_ONLY: readonly AppRole[] = ["teacher"];
const ADMIN_ONLY: readonly AppRole[] = ["admin"];

/**
 * Single source of truth for the primary application navigation, shared by
 * the sidebar (desktop persistent + mobile drawer). Order matters: it's the
 * order items render in. `roles` is the only predicate for which items a
 * signed-in user sees — never an enrollment count or anything else.
 */
export const NAV_ITEMS = [
  {
    href: "/dashboard/overview",
    key: "dashboard",
    icon: LayoutDashboard,
    roles: STUDENT_ONLY,
  },
  {
    href: "/teaching/classes",
    key: "teachingClasses",
    icon: Presentation,
    roles: TEACHER_ONLY,
  },
  {
    href: "/teaching/assignments",
    key: "teachingAssignments",
    icon: ClipboardCheck,
    roles: TEACHER_ONLY,
  },
  {
    href: "/subjects/list",
    key: "subjects",
    icon: BookOpen,
    roles: STUDENT_ONLY,
  },
  {
    href: "/classes/list",
    key: "classes",
    icon: CalendarClock,
    roles: STUDENT_ONLY,
  },
  {
    href: "/classroom/classes",
    key: "classroomClasses",
    icon: Users,
    roles: STUDENT_ONLY,
  },
  {
    href: "/classroom/assignments",
    key: "classroomAssignments",
    icon: ClipboardCheck,
    roles: STUDENT_ONLY,
  },
  {
    href: "/lessons/list",
    key: "lessons",
    icon: NotebookText,
    roles: STUDENT_ONLY,
  },
  {
    href: "/flashcards/deck",
    key: "flashcards",
    icon: Layers,
    roles: STUDENT_ONLY,
  },
  {
    href: "/study-sessions/focus",
    key: "studySessions",
    icon: Timer,
    roles: STUDENT_ONLY,
  },
  {
    href: "/homework/list",
    key: "homework",
    icon: ClipboardList,
    roles: STUDENT_ONLY,
  },
  {
    href: "/exams/list",
    key: "exams",
    icon: GraduationCap,
    roles: STUDENT_ONLY,
  },
  {
    href: "/grades/overview",
    key: "grades",
    icon: Percent,
    roles: STUDENT_ONLY,
  },
  {
    href: "/calendar/month",
    key: "calendar",
    icon: CalendarDays,
    roles: STUDENT_ONLY,
  },
  {
    href: "/statistics/overview",
    key: "statistics",
    icon: BarChart3,
    roles: STUDENT_ONLY,
  },
  {
    href: "/gamification/goals",
    key: "goals",
    icon: Target,
    roles: STUDENT_ONLY,
  },
  {
    href: "/gamification/achievements",
    key: "achievements",
    icon: Trophy,
    roles: STUDENT_ONLY,
  },
  {
    href: "/admin/notification-settings",
    key: "adminNotificationSettings",
    icon: ShieldCheck,
    roles: ADMIN_ONLY,
  },
  {
    href: "/notifications/center",
    key: "notifications",
    icon: Bell,
    roles: APP_ROLES,
  },
  {
    href: "/settings/profile",
    key: "settings",
    icon: Settings,
    roles: APP_ROLES,
  },
  { href: "/help/list", key: "help", icon: HelpCircle, roles: APP_ROLES },
] as const satisfies readonly NavItem[];

/**
 * Each role's landing page. `teacher` points at a route that doesn't exist
 * until Phase 2 — Phase 1 registers no `teaching/*` pages, so a fresh
 * teacher signup 404s here on purpose (see the plan's Phase 1 exit
 * criteria) rather than silently falling back to the student dashboard.
 */
export const ROLE_HOME: Record<AppRole, string> = {
  student: "/dashboard/overview",
  teacher: "/teaching/classes",
  admin: "/admin/notification-settings",
};

const ALL_NAV_HREFS = NAV_ITEMS.map((item) => item.href);

/**
 * Matches on the first path segment ("domain") so any sub-route (e.g. a
 * lesson detail page) still highlights its domain's single list nav item.
 * When a domain has more than one nav entry (gamification/goals vs
 * gamification/achievements), that's too coarse — it would light up both —
 * so those domains additionally require the second segment to match.
 *
 * A domain can also have routes with *no* nav item of their own (e.g.
 * `/teaching/roster/[classId]`, reached only by clicking into a class, once
 * `/teaching/assignments` exists as a second `/teaching/*` sibling in
 * Phase 3). Falling through to "no match" there would light up nothing, so
 * when no sibling's second segment matches the current path, the domain's
 * first sibling is highlighted instead.
 */
export function isActivePath(pathname: string, href: string): boolean {
  const domain = `/${href.split("/")[1]}`;
  const inDomain = pathname === domain || pathname.startsWith(`${domain}/`);
  if (!inDomain) return false;

  const siblings = ALL_NAV_HREFS.filter((h) => h.startsWith(`${domain}/`));
  if (siblings.length <= 1) return true;

  const pathSecondSegment = pathname.split("/")[2];
  const matchesASibling = siblings.some(
    (sibling) => sibling.split("/")[2] === pathSecondSegment,
  );

  if (!matchesASibling) {
    return href === siblings[0];
  }

  return href.split("/")[2] === pathSecondSegment;
}
