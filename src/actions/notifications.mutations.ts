"use server";

/**
 * Client-invokable notification Server Actions, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly
 * (`@/actions/notifications.mutations`) instead of the `@/actions` barrel.
 * `src/actions/notifications.ts` re-exports these under `Actions.Notifications.*`
 * for SSR use. Same pattern as `homework.mutations.ts`.
 *
 * `getRecent` is a read rather than a write, but it lives here because this
 * file's real subject is "things a Client Component may call" — the
 * notification bell polls it on an interval.
 */

import { revalidatePath } from "next/cache";

import { sendEmail } from "@/lib/email";
import { notificationTypeLabel, resolveLocale } from "@/lib/notifications/copy";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { mapNotificationRow } from "@/lib/notifications/map";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** How many notifications the bell keeps in memory per poll. */
const RECENT_LIMIT = 10;

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

export interface RecentNotifications {
  items: Notification[];
  unreadCount: number;
}

/** Polled by the notification bell — returns the latest few plus the badge count. */
export async function getRecentNotifications(): Promise<ActionResult<RecentNotifications>> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { data: null, error: auth.error };

  const [{ data: rows, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .is("read_at", null),
  ]);

  if (error) return { data: null, error: error.message };
  if (countError) return { data: null, error: countError.message };

  return {
    data: {
      items: (rows ?? []).map(mapNotificationRow),
      unreadCount: count ?? 0,
    },
    error: null,
  };
}

export async function markNotificationAsRead(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function markAllNotificationsAsRead(): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.userId)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Emails a single notification to the signed-in user on demand — the manual
 * counterpart to the job's automatic sends. Both the row lookup and the
 * recipient come from the session, so a user can only ever email themselves
 * their own notification.
 */
export async function sendNotificationToEmail(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user?.email) {
    return { success: false, error: "You must be signed in." };
  }

  const [{ data: row, error }, { data: settings }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", authData.user.id)
      .maybeSingle(),
    supabase.from("settings").select("locale").eq("user_id", authData.user.id).maybeSingle(),
  ]);

  if (error) return { success: false, error: error.message };
  if (!row) return { success: false, error: "Notification not found." };

  const notification = mapNotificationRow(row);
  const locale = resolveLocale(settings?.locale);

  const result = await sendEmail({
    to: authData.user.email,
    subject: `${notificationTypeLabel(notification.type, locale)} — ${notification.title}`,
    html: renderNotificationEmail({
      title: notification.title,
      body: notification.body,
      linkPath: notification.linkPath,
      locale,
    }),
  });

  if (!result.success) return result;

  await supabase
    .from("notifications")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", authData.user.id);

  return { success: true, error: null };
}
