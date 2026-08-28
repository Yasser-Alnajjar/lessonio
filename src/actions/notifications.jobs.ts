import "server-only";

import { sendEmail } from "@/lib/email";
import {
  dailyReminderCopy,
  homeworkDueCopy,
  type NotificationCopy,
  notificationTypeLabel,
  resolveLocale,
  reviewReminderCopy,
  upcomingClassCopy,
  upcomingLessonCopy,
} from "@/lib/notifications/copy";
import {
  addDays,
  daysBetween,
  localClock,
  localIsoDate,
} from "@/lib/notifications/dates";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClassMeeting } from "@/lib/types/class";
import type { Database } from "@/lib/types/database";
import type { NotificationType } from "@/lib/types/notification";
import type { AppLocale } from "@/i18n/routing";

type AdminClient = ReturnType<typeof createAdminClient>;
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
type ClassOccurrenceInsert =
  Database["public"]["Tables"]["class_occurrences"]["Insert"];

/** Lessons this far ahead of a user's local "today" produce an upcoming-lesson notice. */
const UPCOMING_LESSON_DAYS = 1;
/** A class produces an upcoming-class notice once its start time is within this many minutes. */
const UPCOMING_CLASS_LEAD_MINUTES = 10;
/** Homework due within this many days of a user's local "today" is "due soon". */
const HOMEWORK_DUE_DAYS = 2;
/** A lesson must be at least this old before we nag about reviewing it. */
const REVIEW_AGE_DAYS = 7;
/** …and no older than this, so a long-abandoned lesson stops resurfacing forever. */
const REVIEW_MAX_AGE_DAYS = 60;
/** Cap review reminders per user per run — the point is a nudge, not an inbox flood. */
const REVIEW_REMINDERS_PER_RUN = 3;
/**
 * Mirrors REFRESH_INTERVAL_MS in notifications.generate.ts — the two paths
 * claim the same `settings.notifications_generated_at` stamp, so whichever
 * one reaches a given user first (a bell poll or this sweep) is the one that
 * regenerates for that interval.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface NotificationsJobSummary {
  scanned: number;
  created: number;
  emailed: number;
  errors: string[];
}

function groupByUser<T extends { user_id: string }>(
  rows: T[],
): Map<string, T[]> {
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
 * Generates notification rows for every user whose throttle has gone stale,
 * then emails the ones who opted into email. Triggered on a schedule by
 * Supabase Cron (see supabase/migrations/*_notifications_cron_sweep.sql and
 * src/app/api/cron/notifications/route.ts) — this is what delivers
 * "class starts in 10 minutes" and similar notices to a user who isn't
 * actively using the app; ensureNotificationsForUser() in
 * notifications.generate.ts is the same logic's same-session fast path.
 *
 * Runs on the service-role client because `notifications` grants
 * `authenticated` no insert policy for rows a user didn't create — every
 * query below is therefore scoped by hand instead of relying on RLS.
 *
 * Safe to run as often as you like: every notification row carries a
 * `dedupe_key` and is inserted with `ON CONFLICT DO NOTHING`, and the
 * `notifications_generated_at` claim below is a compare-and-set, so an
 * overlapping run (or a bell poll racing this sweep) never double-generates
 * for the same user.
 */
export async function runScheduledNotificationsJob(): Promise<NotificationsJobSummary> {
  const supabase = createAdminClient();
  const summary: NotificationsJobSummary = {
    scanned: 0,
    created: 0,
    emailed: 0,
    errors: [],
  };

  const cutoff = new Date(Date.now() - REFRESH_INTERVAL_MS).toISOString();
  const staleFilter = `notifications_generated_at.is.null,notifications_generated_at.lt.${cutoff}`;

  const [{ data: staleRows, error: settingsError }, { data: profileRows }] =
    await Promise.all([
      supabase
        .from("settings")
        .select(
          "user_id, locale, notification_preferences, notifications_generated_at",
        )
        .or(staleFilter),
      supabase.from("profiles").select("id, timezone, role"),
    ]);

  if (settingsError) {
    summary.errors.push(`settings: ${settingsError.message}`);
    return summary;
  }

  const staleUsers = staleRows ?? [];
  summary.scanned = staleUsers.length;
  if (staleUsers.length === 0) return summary;

  const timezones = new Map(
    (profileRows ?? []).map((row) => [row.id, row.timezone]),
  );
  const roles = new Map((profileRows ?? []).map((row) => [row.id, row.role]));

  // Claim every stale user up front: an .in() + still-stale filter, so a
  // bell poll racing this sweep for the same user leaves exactly one of them
  // holding the row. Teachers are claimed too (their throttle stamp still
  // needs refreshing, or they'd get rescanned every tick forever) but are
  // filtered out below, before the expensive per-type queries — a teacher
  // structurally has none of lessons/homework/classes/reviews, so scanning
  // for them was always wasted work, and unconditionally adding a
  // "daily_reminder" at the end of the loop was actively wrong: it produced
  // a spurious "nothing scheduled today" notification for every teacher on
  // every stale cycle.
  const { data: claimedRows } = await supabase
    .from("settings")
    .update({ notifications_generated_at: new Date().toISOString() })
    .in(
      "user_id",
      staleUsers.map((row) => row.user_id),
    )
    .or(staleFilter)
    .select("user_id");

  const claimedIds = new Set((claimedRows ?? []).map((row) => row.user_id));
  const users = staleUsers.filter(
    (row) =>
      claimedIds.has(row.user_id) && roles.get(row.user_id) !== "teacher",
  );
  if (users.length === 0) return summary;

  const now = new Date();
  const utcToday = localIsoDate(now, "UTC");
  // Widened a day on each side of UTC so no user's local "today" falls
  // outside it, whatever their timezone offset.
  const windowStart = addDays(utcToday, -1);
  const lessonWindowEnd = addDays(utcToday, UPCOMING_LESSON_DAYS + 1);
  const homeworkWindowEnd = addDays(utcToday, HOMEWORK_DUE_DAYS + 1);
  const userIds = users.map((row) => row.user_id);

  // A user who never opens the app never runs ensureClassOccurrencesForUser,
  // so their class_occurrences rows for today may not exist yet — materialize
  // them here, otherwise upcoming_class can never fire for that user.
  await materializeTodayOccurrences(supabase, userIds, timezones, now);

  const [
    { data: subjectRows },
    { data: lessonRows },
    { data: homeworkRows },
    { data: reviewRows },
    { data: classOccurrenceRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name"),
    supabase
      .from("lessons")
      .select("id, user_id, subject_id, title, date")
      .in("user_id", userIds)
      .gte("date", windowStart)
      .lte("date", lessonWindowEnd),
    supabase
      .from("homework")
      .select("id, user_id, subject_id, title, deadline")
      .in("user_id", userIds)
      .eq("completed", false)
      .gte("deadline", windowStart)
      .lte("deadline", homeworkWindowEnd),
    supabase
      .from("lessons")
      .select("id, user_id, subject_id, title, date")
      .in("user_id", userIds)
      .neq("review_status", "reviewed")
      .gte("date", addDays(utcToday, -REVIEW_MAX_AGE_DAYS))
      .lte("date", addDays(utcToday, -REVIEW_AGE_DAYS))
      .order("date", { ascending: false }),
    supabase
      .from("class_occurrences")
      .select(
        "id, user_id, subject_id, start_time, date, classes (teacher, location)",
      )
      .in("user_id", userIds)
      .gte("date", windowStart)
      .lte("date", lessonWindowEnd),
  ]);

  const subjectNames = new Map(
    (subjectRows ?? []).map((row) => [row.id, row.name]),
  );
  const lessonsByUser = groupByUser(lessonRows ?? []);
  const homeworkByUser = groupByUser(homeworkRows ?? []);
  const reviewsByUser = groupByUser(reviewRows ?? []);
  const classOccurrencesByUser = groupByUser(classOccurrenceRows ?? []);

  const emailRecipients = new Map<string, string>();
  const wantsEmail = users.some(
    (row) =>
      parseNotificationPreferences(row.notification_preferences).enabledInEmail,
  );

  if (wantsEmail) {
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers({
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
    const preferences = parseNotificationPreferences(
      settings.notification_preferences,
    );
    const locale = resolveLocale(settings.locale);
    const timezone = timezones.get(userId) ?? null;
    const today = localIsoDate(now, timezone);
    const subjectNameOf = (id: string) =>
      subjectNames.get(id) ??
      (locale === "ar" ? "مادة غير معروفة" : "Unknown subject");

    const pending: NotificationInsert[] = [];
    const add = (
      type: NotificationType,
      dedupeKey: string,
      copy: NotificationCopy,
    ) => {
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

    const lessonsForUser = (lessonsByUser.get(userId) ?? []).filter(
      (lesson) => {
        const daysAway = daysBetween(today, lesson.date);
        return daysAway >= 0 && daysAway <= UPCOMING_LESSON_DAYS;
      },
    );

    for (const lesson of lessonsForUser) {
      add(
        "upcoming_lesson",
        `upcoming_lesson:${lesson.id}:${lesson.date}`,
        upcomingLessonCopy(locale, {
          lessonTitle: lesson.title,
          subjectName: subjectNameOf(lesson.subject_id),
          isToday: lesson.date === today,
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

    const clock = localClock(now, timezone);
    const classesToday = (classOccurrencesByUser.get(userId) ?? []).filter(
      (occurrence) => occurrence.date === today,
    );

    for (const occurrence of classesToday) {
      const [hours = 0, minutes = 0] = occurrence.start_time
        .split(":")
        .map(Number);
      const minutesUntil = hours * 60 + minutes - clock.minutesOfDay;
      if (minutesUntil < 0 || minutesUntil > UPCOMING_CLASS_LEAD_MINUTES)
        continue;

      add(
        "upcoming_class",
        `upcoming_class:${occurrence.id}:${today}`,
        upcomingClassCopy(locale, {
          subjectName: subjectNameOf(occurrence.subject_id),
          teacher: occurrence.classes?.teacher ?? null,
          location: occurrence.classes?.location ?? null,
          minutesUntil,
        }),
      );
    }

    const lessonsToday = lessonsForUser.filter(
      (lesson) => lesson.date === today,
    ).length;

    add(
      "daily_reminder",
      `daily_reminder:${today}`,
      dailyReminderCopy(locale, {
        lessonCount: lessonsToday,
        dueCount: dueSoon.length,
      }),
    );

    if (pending.length === 0) continue;

    // `ignoreDuplicates` turns this into ON CONFLICT DO NOTHING against
    // idx_notifications_dedupe, so `.select()` returns *only* rows that were
    // genuinely new — exactly the set that should trigger an email.
    const { data: inserted, error: insertError } = await supabase
      .from("notifications")
      .upsert(pending, {
        onConflict: "user_id,dedupe_key",
        ignoreDuplicates: true,
      })
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

    summary.emailed += await emailNotifications(
      supabase,
      recipient,
      locale,
      created,
    );
  }

  return summary;
}

/**
 * Materializes today's occurrence (in each user's own timezone) for every
 * active class belonging to the given users. Only "today" — this exists so
 * upcoming_class notices don't depend on the user having opened the app
 * recently enough for ensureClassOccurrencesForUser()'s rolling 30-day
 * window to still cover the current date; that function remains the one
 * that keeps the full window materialized for the calendar/dashboard views
 * whenever the user does visit.
 */
async function materializeTodayOccurrences(
  supabase: AdminClient,
  userIds: string[],
  timezones: Map<string, string | null>,
  now: Date,
): Promise<void> {
  if (userIds.length === 0) return;

  const { data: classRows } = await supabase
    .from("classes")
    .select("id, user_id, subject_id, meetings")
    .eq("is_active", true)
    .in("user_id", userIds);

  const rows: ClassOccurrenceInsert[] = [];

  for (const klass of classRows ?? []) {
    const today = localIsoDate(now, timezones.get(klass.user_id) ?? null);
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    // The `classes_meetings_valid` DB constraint guarantees this JSONB
    // column already holds well-formed ClassMeeting objects.
    const meetings = klass.meetings as unknown as ClassMeeting[];
    const meeting = meetings.find(
      (candidate) => candidate.dayOfWeek === weekday,
    );
    if (!meeting) continue;

    rows.push({
      user_id: klass.user_id,
      subject_id: klass.subject_id,
      class_id: klass.id,
      date: today,
      start_time: meeting.startTime,
      duration_minutes: meeting.durationMinutes,
    });
  }

  if (rows.length === 0) return;

  // `ignoreDuplicates` leaves any occurrence that already exists (including
  // recorded attendance) untouched — see materializeOccurrences() in
  // class-occurrences.generate.ts, which this mirrors for a single date.
  await supabase
    .from("class_occurrences")
    .upsert(rows, { onConflict: "class_id,date", ignoreDuplicates: true });
}

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
    const label = notificationTypeLabel(
      notification.type as NotificationType,
      locale,
    );
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
