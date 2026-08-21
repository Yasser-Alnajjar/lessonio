import { env } from "@/lib/env";
import type { AppLocale } from "@/i18n/routing";
import { localeDirections } from "@/i18n/routing";

export interface NotificationEmailInput {
  title: string;
  body: string;
  linkPath: string | null;
  locale: AppLocale;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inline-styled, table-free HTML — deliberately minimal. Email clients strip
 * <style> blocks and external CSS, so every rule lives on the element.
 */
export function renderNotificationEmail({
  title,
  body,
  linkPath,
  locale,
}: NotificationEmailInput): string {
  const dir = localeDirections[locale];
  const href = linkPath
    ? `${env.NEXT_PUBLIC_APP_URL}/${locale}${linkPath}`
    : null;
  const ctaLabel = locale === "ar" ? "افتح Lessonio" : "Open Lessonio";
  const footer =
    locale === "ar"
      ? "أنت تتلقى هذه الرسالة لأن إشعارات البريد مفعّلة في إعدادات Lessonio."
      : "You're receiving this because email notifications are on in your Lessonio settings.";

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:24px;background:#f6f6f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#78716c;">Lessonio</p>
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c;">${escapeHtml(body)}</p>
      ${
        href
          ? `<a href="${escapeHtml(href)}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">${ctaLabel}</a>`
          : ""
      }
      <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">${footer}</p>
    </div>
  </body>
</html>`;
}
