import type { AppLocale } from "@/i18n/routing";
import { defaultLocale, locales } from "@/i18n/routing";
import type { NotificationType } from "@/lib/types/notification";

/**
 * Copy for generated notifications.
 *
 * Deliberately *not* next-intl: a notification's title and body are persisted
 * to the database at generation time, and the job that writes them renders for
 * many users across both locales in a single pass, outside any one request's
 * locale scope. `getTranslations()` is request-scoped, so it's the wrong tool
 * here. UI chrome around the notifications (buttons, tabs, empty states) does
 * go through next-intl as usual — see the `notifications` key in messages/.
 */

export interface NotificationCopy {
  title: string;
  body: string;
  linkPath: string;
}

interface UpcomingLessonParams {
  lessonTitle: string;
  subjectName: string;
  isToday: boolean;
}

interface HomeworkDueParams {
  homeworkTitle: string;
  subjectName: string;
  daysUntilDue: number;
}

interface DailyReminderParams {
  lessonCount: number;
  dueCount: number;
}

interface ReviewReminderParams {
  lessonTitle: string;
  subjectName: string;
}

interface UpcomingClassParams {
  subjectName: string;
  teacher: string | null;
  location: string | null;
  /** Minutes from now until the class starts; 0 means it's starting now. */
  minutesUntil: number;
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  return locales.includes(value as AppLocale) ? (value as AppLocale) : defaultLocale;
}

export function upcomingLessonCopy(
  locale: AppLocale,
  { lessonTitle, subjectName, isToday }: UpcomingLessonParams,
): NotificationCopy {
  if (locale === "ar") {
    return {
      title: isToday ? "درس اليوم" : "درس غدًا",
      body: `${lessonTitle} (${subjectName}).`,
      linkPath: "/calendar/month",
    };
  }

  return {
    title: isToday ? "Lesson today" : "Lesson tomorrow",
    body: `${lessonTitle} (${subjectName}).`,
    linkPath: "/calendar/month",
  };
}

export function homeworkDueCopy(
  locale: AppLocale,
  { homeworkTitle, subjectName, daysUntilDue }: HomeworkDueParams,
): NotificationCopy {
  if (locale === "ar") {
    const when =
      daysUntilDue <= 0 ? "اليوم" : daysUntilDue === 1 ? "غدًا" : `خلال ${daysUntilDue} أيام`;

    return {
      title: daysUntilDue <= 0 ? "واجب مستحق اليوم" : "واجب قارب موعده",
      body: `${homeworkTitle} (${subjectName}) مستحق ${when}.`,
      linkPath: "/homework/list",
    };
  }

  const when =
    daysUntilDue <= 0 ? "today" : daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`;

  return {
    title: daysUntilDue <= 0 ? "Homework due today" : "Homework due soon",
    body: `${homeworkTitle} (${subjectName}) is due ${when}.`,
    linkPath: "/homework/list",
  };
}

export function dailyReminderCopy(
  locale: AppLocale,
  { lessonCount, dueCount }: DailyReminderParams,
): NotificationCopy {
  if (locale === "ar") {
    const parts: string[] = [];
    if (lessonCount > 0) parts.push(`${lessonCount} درس`);
    if (dueCount > 0) parts.push(`${dueCount} واجب مستحق`);

    return {
      title: "ملخص اليوم",
      body: parts.length > 0 ? `لديك ${parts.join(" و")} اليوم.` : "لا شيء مجدول اليوم — وقت ممتاز للمراجعة.",
      linkPath: "/dashboard/overview",
    };
  }

  const parts: string[] = [];
  if (lessonCount > 0) parts.push(`${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`);
  if (dueCount > 0) parts.push(`${dueCount} homework due`);

  return {
    title: "Today at a glance",
    body:
      parts.length > 0
        ? `You have ${parts.join(" and ")} today.`
        : "Nothing scheduled today — a good time to review.",
    linkPath: "/dashboard/overview",
  };
}

export function reviewReminderCopy(
  locale: AppLocale,
  { lessonTitle, subjectName }: ReviewReminderParams,
): NotificationCopy {
  if (locale === "ar") {
    return {
      title: "وقت المراجعة",
      body: `لم تراجع بعد "${lessonTitle}" (${subjectName}).`,
      linkPath: "/lessons/list",
    };
  }

  return {
    title: "Time to review",
    body: `You haven't reviewed "${lessonTitle}" (${subjectName}) yet.`,
    linkPath: "/lessons/list",
  };
}

export function upcomingClassCopy(
  locale: AppLocale,
  { subjectName, teacher, location, minutesUntil }: UpcomingClassParams,
): NotificationCopy {
  const details = [teacher, location].filter(Boolean).join(" · ");

  if (locale === "ar") {
    const when = minutesUntil <= 0 ? "الآن" : `خلال ${minutesUntil} دقيقة`;
    return {
      title: "حصة قادمة",
      body: details ? `${subjectName} تبدأ ${when} — ${details}.` : `${subjectName} تبدأ ${when}.`,
      linkPath: "/classes/list",
    };
  }

  const when = minutesUntil <= 0 ? "now" : `in ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"}`;
  return {
    title: "Upcoming class",
    body: details
      ? `${subjectName} starts ${when} — ${details}.`
      : `${subjectName} starts ${when}.`,
    linkPath: "/class-schedules/list",
  };
}

/** Localized label per type, used by the notifications center and email subject. */
const TYPE_LABELS: Record<AppLocale, Record<NotificationType, string>> = {
  en: {
    upcoming_lesson: "Upcoming lesson",
    homework_due: "Homework due",
    daily_reminder: "Daily reminder",
    upcoming_class: "Upcoming class",
    review_reminder: "Review reminder",
  },
  ar: {
    upcoming_lesson: "درس قادم",
    homework_due: "واجب مستحق",
    daily_reminder: "تذكير يومي",
    upcoming_class: "حصة قادمة",
    review_reminder: "تذكير بالمراجعة",
  },
};

export function notificationTypeLabel(type: NotificationType, locale: AppLocale): string {
  return TYPE_LABELS[locale][type];
}
