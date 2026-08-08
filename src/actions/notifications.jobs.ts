import "server-only";

import { sendEmail } from "@/lib/email";
import {
  dailyReminderCopy,
  homeworkDueCopy,
  type NotificationCopy,
  notificationTypeLabel,
  resolveLocale,
  reviewReminderCopy,
  upcomingLessonCopy,
} from "@/lib/notifications/copy";
import { addDays, daysBetween, localIsoDate } from "@/lib/notifications/dates";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types/database";
import type { NotificationType } from "@/lib/types/notification";
import type { AppLocale } from "@/i18n/routing";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/** Lessons this far ahead of a user's local "today" produce an upcoming-lesson notice. */
const UPCOMING_LESSON_DAYS = 1;
/** Homework due within this many days of a user's local "today" is "due soon". */
const HOMEWORK_DUE_DAYS = 2;
/** A lesson must be at least this old before we nag about reviewing it. */
const REVIEW_AGE_DAYS = 7;
/** …and no older than this, so a long-abandoned lesson stops resurfacing forever. */
const REVIEW_MAX_AGE_DAYS = 60;
/** Cap review reminders per user per run — the point is a nudge, not an inbox flood. */
const REVIEW_REMINDERS_PER_RUN = 3;

export interface NotificationsJobSummary {
  scanned: number;
  created: number;
  emailed: number;
  errors: string[];
}

function groupByUser<T extends { user_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const existing = grouped.get(row.user_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.user_id, [row]);
    }
  }

  return grouped;
}

/**
 * Generates notification rows for every user, then emails the ones the user
 * opted into. Safe to run as often as you like: every row carries a
 * `dedupe_key` and is inserted with `ON CONFLICT DO NOTHING`, so a second run
 * over unchanged data creates nothing.
 *
 * Runs on the service-role client because `notifications` grants
 * `authenticated` no insert policy — these rows are derived from a user's
 * data, not created by them. Every query below is therefore scoped by hand.
 *
 * Source data is fetched in a handful of bulk queries and grouped in memory
 * rather than per-user round trips, so the cost is flat in the number of users.
 */
export async function runScheduledNotificationsJob(): Promise<NotificationsJobSummary> {
  const supabase = createAdminClient();
  const summary: NotificationsJobSummary = { scanned: 0, created: 0, emailed: 0, errors: [] };

  const [{ data: settingsRows, error: settingsError }, { data: profileRows }] = await Promise.all([
    supabase.from("settings").select("user_id, locale, notification_preferences"),
    supabase.from("profiles").select("id, timezone"),
  ]);

  if (settingsError) {
    summary.errors.push(`settings: ${settingsError.message}`);
    return summary;
  }

  const users = settingsRows ?? [];
  summary.scanned = users.length;
  if (users.length === 0) return summary;

  const timezones = new Map((profileRows ?? []).map((row) => [row.id, row.timezone]));

  // Widen the fetch window by a day on each side of UTC so no user's local
  // "today" falls outside it, whatever their timezone offset.
  const now = new Date();
  const utcToday = localIsoDate(now, "UTC");
  const windowStart = addDays(utcToday, -1);
  const lessonWindowEnd = addDays(utcToday, UPCOMING_LESSON_DAYS + 1);
  const homeworkWindowEnd = addDays(utcToday, HOMEWORK_DUE_DAYS + 1);

  const [
    { data: subjectRows },
    { data: lessonRows },
    { data: homeworkRows },
    { data: reviewRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name"),
    supabase
      .from("lessons")
      .select("id, user_id, subject_id, title, date, time")
      .gte("date", windowStart)
      .lte("date", lessonWindowEnd),
    supabase
      .from("homework")
      .select("id, user_id, subject_id, title, deadline")
      .eq("completed", false)
      .gte("deadline", windowStart)
      .lte("deadline", homeworkWindowEnd),
    supabase
      .from("lessons")
      .select("id, user_id, subject_id, title, date")
      .neq("review_status", "reviewed")
      .gte("date", addDays(utcToday, -REVIEW_MAX_AGE_DAYS))
      .lte("date", addDays(utcToday, -REVIEW_AGE_DAYS))
      .order("date", { ascending: false }),
  ]);

  const subjectNames = new Map((subjectRows ?? []).map((row) => [row.id, row.name]));
  const lessonsByUser = groupByUser(lessonRows ?? []);
  const homeworkByUser = groupByUser(homeworkRows ?? []);
  const reviewsByUser = groupByUser(reviewRows ?? []);

  const emailRecipients = new Map<string, string>();
  const wantsEmail = users.some(
    (row) => parseNotificationPreferences(row.notification_preferences).enabledInEmail,
  );

  if (wantsEmail) {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      summary.errors.push(`auth.listUsers: ${authError.message}`);
    } else {
      for (const user of authUsers.users) {
        if (user.email) emailRecipients.set(user.id, user.email);
      }
    }
  }

  for (const settings of users) {
    const userId = settings.user_id;
    const preferences = parseNotificationPreferences(settings.notification_preferences);
    const locale = resolveLocale(settings.locale);
    const today = localIsoDate(now, timezones.get(userId) ?? null);
    const subjectNameOf = (id: string) =>
      subjectNames.get(id) ?? (locale === "ar" ? "مادة غير معروفة" : "Unknown subject");

    const pending: NotificationInsert[] = [];
    const add = (type: NotificationType, dedupeKey: string, copy: NotificationCopy) => {
      if (!preferences.types[type]) return;
      pending.push({
        user_id: userId,
        type,
        title: copy.title,
        body: copy.body,
        link_path: copy.linkPath,
        dedupe_key: dedupeKey,
      });
    };

    for (const lesson of lessonsByUser.get(userId) ?? []) {
      const daysAway = daysBetween(today, lesson.date);
      if (daysAway < 0 || daysAway > UPCOMING_LESSON_DAYS) continue;

      add(
        "upcoming_lesson",
        `upcoming_lesson:${lesson.id}:${lesson.date}`,
        upcomingLessonCopy(locale, {
          lessonTitle: lesson.title,
          subjectName: subjectNameOf(lesson.subject_id),
          time: lesson.time,
          isToday: daysAway === 0,
        }),
      );
    }

    const dueSoon = (homeworkByUser.get(userId) ?? []).filter((homework) => {
      const daysUntilDue = daysBetween(today, homework.deadline);
      return daysUntilDue >= 0 && daysUntilDue <= HOMEWORK_DUE_DAYS;
    });

    for (const homework of dueSoon) {
      add(
        "homework_due",
        `homework_due:${homework.id}:${homework.deadline}`,
        homeworkDueCopy(locale, {
          homeworkTitle: homework.title,
          subjectName: subjectNameOf(homework.subject_id),
          daysUntilDue: daysBetween(today, homework.deadline),
        }),
      );
    }

    const staleReviews = (reviewsByUser.get(userId) ?? [])
      .filter((lesson) => daysBetween(lesson.date, today) >= REVIEW_AGE_DAYS)
      .slice(0, REVIEW_REMINDERS_PER_RUN);

    for (const lesson of staleReviews) {
      add(
        "review_reminder",
        `review_reminder:${lesson.id}:${today}`,
        reviewReminderCopy(locale, {
          lessonTitle: lesson.title,
          subjectName: subjectNameOf(lesson.subject_id),
        }),
      );
    }

    const lessonsToday = (lessonsByUser.get(userId) ?? []).filter(
      (lesson) => lesson.date === today,
    ).length;

    add(
      "daily_reminder",
      `daily_reminder:${today}`,
      dailyReminderCopy(locale, { lessonCount: lessonsToday, dueCount: dueSoon.length }),
    );

    if (pending.length === 0) continue;

    // `ignoreDuplicates` turns this into ON CONFLICT DO NOTHING against
    // idx_notifications_dedupe, so `.select()` returns *only* rows that were
    // genuinely new — exactly the set that should trigger an email.
    const { data: inserted, error: insertError } = await supabase
      .from("notifications")
      .upsert(pending, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .select("id, type, title, body, link_path");

    if (insertError) {
      summary.errors.push(`insert(${userId}): ${insertError.message}`);
      continue;
    }

    const created = inserted ?? [];
    summary.created += created.length;

    if (!preferences.enabledInEmail || created.length === 0) continue;

    const recipient = emailRecipients.get(userId);
    if (!recipient) continue;

    summary.emailed += await emailNotifications(supabase, recipient, locale, created);
  }

  return summary;
}

type AdminClient = ReturnType<typeof createAdminClient>;

interface EmailableNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link_path: string | null;
}

/** Sends one email per new notification and stamps `emailed_at` on success. */
async function emailNotifications(
  supabase: AdminClient,
  recipient: string,
  locale: AppLocale,
  notifications: EmailableNotification[],
): Promise<number> {
  const delivered: string[] = [];

  for (const notification of notifications) {
    const label = notificationTypeLabel(notification.type as NotificationType, locale);
    const result = await sendEmail({
      to: recipient,
      subject: `${label} — ${notification.title}`,
      html: renderNotificationEmail({
        title: notification.title,
        body: notification.body,
        linkPath: notification.link_path,
        locale,
      }),
    });

    // A missing API key fails every send identically; stop after the first
    // rather than hammering a misconfigured provider once per notification.
    if (!result.success) break;

    delivered.push(notification.id);
  }

  if (delivered.length > 0) {
    await supabase
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .in("id", delivered);
  }

  return delivered.length;
}
