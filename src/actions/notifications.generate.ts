import "server-only";

import { after } from "next/server";

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
import { addDays, daysBetween, localClock, localIsoDate } from "@/lib/notifications/dates";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { NotificationType } from "@/lib/types/notification";
import type { NotificationPreferences } from "@/lib/types/settings";
import type { AppLocale } from "@/i18n/routing";
import { ensureClassOccurrencesForUser } from "./class-occurrences.generate";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/** Lessons this far ahead of the user's local "today" produce an upcoming-lesson notice. */
const UPCOMING_LESSON_DAYS = 1;
/**
 * A class produces an upcoming-class notice once its start time is within
 * this many minutes. Because generation only runs when a signed-in user's
 * session triggers it — at most once per REFRESH_INTERVAL_MS, and never at
 * all if they don't open the app — this is a best-effort lead time, not a
 * guaranteed push a fixed number of minutes before start.
 */
const UPCOMING_CLASS_LEAD_MINUTES = 10;
/** Homework due within this many days of the user's local "today" is "due soon". */
const HOMEWORK_DUE_DAYS = 2;
/** A lesson must be at least this old before we nag about reviewing it. */
const REVIEW_AGE_DAYS = 7;
/** …and no older than this, so a long-abandoned lesson stops resurfacing forever. */
const REVIEW_MAX_AGE_DAYS = 60;
/** Cap review reminders per run — the point is a nudge, not an inbox flood. */
const REVIEW_REMINDERS_PER_RUN = 3;
/** How stale a user's notifications may get before the next read regenerates them. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

interface CreatedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link_path: string | null;
}

/** Everything a run needs about the user, read while claiming the run. */
interface GenerationClaim {
  locale: AppLocale;
  preferences: NotificationPreferences;
  timezone: string | null;
}

/**
 * Brings the signed-in user's notifications up to date, then returns.
 *
 * This is the whole scheduler: every path that reads notifications calls it
 * first, so a user who opens the app gets notifications generated from their
 * own lessons and homework, and a user who never opens it costs nothing. That
 * replaces the previous design — a Vercel Cron hitting a secret-protected
 * route hourly, which swept *every* user through the service-role client
 * whether or not they were ever coming back.
 *
 * Consequences worth knowing:
 * - Everything here runs under the caller's session, so RLS scopes each query
 *   to their own rows; the explicit `user_id` filters below are belt and
 *   braces, not the security boundary.
 * - Nothing is generated for a user who is not using the app, which also means
 *   no email lands until they next open it.
 * - It is called on a read path, so it must be cheap and it must never throw:
 *   a failure here degrades to "no new notifications this poll", never to a
 *   broken bell.
 */
export async function ensureNotificationsForUser(
  supabase: SupabaseServerClient,
  userId: string,
  email: string | null,
): Promise<void> {
  try {
    const claim = await claimRun(supabase, userId);
    if (!claim) return;

    const created = await generateNotifications(supabase, userId, claim);

    if (created.length === 0 || !claim.preferences.enabledInEmail || !email) return;

    // Sending is one HTTP round trip per notification. Nothing on screen is
    // waiting on it, so it happens once the response is already out the door.
    after(() => emailNotifications(supabase, email, claim.locale, created));
  } catch {
    // Deliberately swallowed — see the "must never throw" note above. The
    // stamp is already set, so the next attempt is one refresh interval away
    // rather than on the very next poll.
  }
}

/**
 * Decides whether this request is the one that regenerates, and returns the
 * user's settings if so.
 *
 * The bell polls once a minute from every open tab, so the common case has to
 * be a single cheap read that bails. When the stamp *is* stale, the update
 * that claims the run still filters on it being stale, making it a
 * compare-and-set: of two requests racing on the same user, only one update
 * matches a row and the other gets nothing back.
 */
async function claimRun(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<GenerationClaim | null> {
  const cutoffMs = Date.now() - REFRESH_INTERVAL_MS;
  const cutoff = new Date(cutoffMs).toISOString();

  const { data: settings } = await supabase
    .from("settings")
    .select("locale, notification_preferences, notifications_generated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) return null;

  const lastRun = settings.notifications_generated_at;

  // Compared as instants rather than strings: Postgres renders timestamptz
  // with an offset (`+00:00`) and `toISOString()` renders `Z`, so the two
  // formats do not sort against each other lexicographically.
  if (lastRun !== null && Date.parse(lastRun) > cutoffMs) return null;

  const { data: claimed } = await supabase
    .from("settings")
    .update({ notifications_generated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`notifications_generated_at.is.null,notifications_generated_at.lt.${cutoff}`)
    .select("user_id")
    .maybeSingle();

  if (!claimed) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();

  return {
    locale: resolveLocale(settings.locale),
    preferences: parseNotificationPreferences(settings.notification_preferences),
    timezone: profile?.timezone ?? null,
  };
}

/**
 * Derives this user's notification rows from their own data and inserts the
 * ones that don't exist yet.
 *
 * Because the run is scoped to one user, their timezone is known before the
 * queries are built — so each window is exact. (The old all-users job had to
 * widen every window by a day on each side of UTC to cover whichever
 * timezones its users happened to be in, then re-filter in memory.)
 */
async function generateNotifications(
  supabase: SupabaseServerClient,
  userId: string,
  claim: GenerationClaim,
): Promise<CreatedNotification[]> {
  const now = new Date();
  const today = localIsoDate(now, claim.timezone);

  // Materialization runs here too (not just on the classes/dashboard/calendar
  // read paths): a user whose bell polls before they ever open the classes
  // list or dashboard would otherwise see no upcoming_class notices.
  await ensureClassOccurrencesForUser(supabase, userId);

  const [
    { data: subjectRows },
    { data: lessonRows },
    { data: homeworkRows },
    { data: reviewRows },
    { data: classRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("user_id", userId),
    supabase
      .from("lessons")
      .select("id, subject_id, title, date")
      .eq("user_id", userId)
      .gte("date", today)
      .lte("date", addDays(today, UPCOMING_LESSON_DAYS)),
    supabase
      .from("homework")
      .select("id, subject_id, title, deadline")
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("deadline", today)
      .lte("deadline", addDays(today, HOMEWORK_DUE_DAYS)),
    supabase
      .from("lessons")
      .select("id, subject_id, title, date")
      .eq("user_id", userId)
      .neq("review_status", "reviewed")
      .gte("date", addDays(today, -REVIEW_MAX_AGE_DAYS))
      .lte("date", addDays(today, -REVIEW_AGE_DAYS))
      .order("date", { ascending: false })
      .limit(REVIEW_REMINDERS_PER_RUN),
    // Today's occurrences of the user's recurring classes. Teacher and
    // location are embedded from `classes` rather than stored per date —
    // the occurrence only owns what varies week to week.
    supabase
      .from("class_occurrences")
      .select("id, subject_id, start_time, classes (teacher, location)")
      .eq("user_id", userId)
      .eq("date", today),
  ]);

  const subjectNames = new Map((subjectRows ?? []).map((row) => [row.id, row.name]));
  const { locale } = claim;
  const subjectNameOf = (id: string) =>
    subjectNames.get(id) ?? (locale === "ar" ? "مادة غير معروفة" : "Unknown subject");

  const pending: NotificationInsert[] = [];
  const add = (type: NotificationType, dedupeKey: string, copy: NotificationCopy) => {
    if (!claim.preferences.types[type]) return;
    pending.push({
      user_id: userId,
      type,
      title: copy.title,
      body: copy.body,
      link_path: copy.linkPath,
      dedupe_key: dedupeKey,
    });
  };

  const lessons = lessonRows ?? [];
  const dueSoon = homeworkRows ?? [];

  for (const lesson of lessons) {
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

  for (const lesson of reviewRows ?? []) {
    add(
      "review_reminder",
      `review_reminder:${lesson.id}:${today}`,
      reviewReminderCopy(locale, {
        lessonTitle: lesson.title,
        subjectName: subjectNameOf(lesson.subject_id),
      }),
    );
  }

  const clock = localClock(now, claim.timezone);

  for (const occurrence of classRows ?? []) {
    const [hours = 0, minutes = 0] = occurrence.start_time.split(":").map(Number);
    const minutesUntil = hours * 60 + minutes - clock.minutesOfDay;
    if (minutesUntil < 0 || minutesUntil > UPCOMING_CLASS_LEAD_MINUTES) continue;

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

  add(
    "daily_reminder",
    `daily_reminder:${today}`,
    dailyReminderCopy(locale, {
      lessonCount: lessons.filter((lesson) => lesson.date === today).length,
      dueCount: dueSoon.length,
    }),
  );

  if (pending.length === 0) return [];

  // `ignoreDuplicates` turns this into ON CONFLICT DO NOTHING against
  // idx_notifications_dedupe, so `.select()` returns *only* rows that were
  // genuinely new — exactly the set that should trigger an email.
  const { data: inserted, error } = await supabase
    .from("notifications")
    .upsert(pending, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    .select("id, type, title, body, link_path");

  if (error) return [];

  return inserted ?? [];
}

/** Sends one email per new notification and stamps `emailed_at` on success. */
async function emailNotifications(
  supabase: SupabaseServerClient,
  recipient: string,
  locale: AppLocale,
  notifications: CreatedNotification[],
): Promise<void> {
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
}
