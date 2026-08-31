import type { useTranslations } from "next-intl";

import type { Notification } from "@/lib/types/notification";

type Translator = ReturnType<typeof useTranslations<"notifications">>;

/**
 * Renders from `type` + `data` through `notifications.content.<type>`
 * wherever that succeeds, falling back to the persisted `title`/`body`
 * for older rows or types this client doesn't have copy for yet — the
 * "Hybrid" copy strategy (backend still writes `title`/`body` so email and
 * pre-existing rows keep working; the frontend renders live/localized where
 * it can).
 *
 * `t.has(key)` only checks that the message key exists, not that `data`
 * carries every ICU placeholder it interpolates. next-intl doesn't throw
 * on a missing placeholder either — it logs a `FORMATTING_ERROR` via its
 * own `onError` and returns a degraded string, so a try/catch here would
 * never fire. A row with `data: {}` (a demo-seeded or otherwise
 * legacy-shaped row) has the key but none of the variables, so the actual
 * guard is: only attempt the templated render when there's at least one
 * data field to interpolate from.
 */
function renderContent(
  t: Translator,
  key: string,
  data: Record<string, unknown>,
  fallback: string,
): string {
  if (Object.keys(data).length === 0) return fallback;
  return t.has(key)
    ? t(key, data as Record<string, string | number>)
    : fallback;
}

export function renderNotificationTitle(
  t: Translator,
  notification: Notification,
): string {
  return renderContent(
    t,
    `content.${notification.type}.title`,
    notification.data,
    notification.title,
  );
}

export function renderNotificationBody(
  t: Translator,
  notification: Notification,
): string {
  return renderContent(
    t,
    `content.${notification.type}.body`,
    notification.data,
    notification.body,
  );
}
