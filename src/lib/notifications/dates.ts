/**
 * Date helpers for the notifications job.
 *
 * `lessons.date` and `homework.deadline` are Postgres `date` columns — plain
 * `yyyy-mm-dd` strings with no timezone. "Today" therefore has to be resolved
 * in the *user's* timezone (`profiles.timezone`), or a user in Riyadh gets
 * their daily reminder based on a UTC day boundary that's hours off.
 *
 * `Intl.DateTimeFormat` with the `en-CA` locale emits exactly `yyyy-mm-dd`,
 * which is why it's used here rather than pulling in `date-fns-tz` (this
 * project has `date-fns` but not its timezone companion).
 */

const ISO_DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = ISO_DATE_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    ISO_DATE_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

/**
 * Resolves `yyyy-mm-dd` for `instant` in `timeZone`, falling back to UTC when
 * the stored timezone is absent or not one the runtime recognizes.
 */
export function localIsoDate(instant: Date, timeZone: string | null): string {
  try {
    return formatterFor(timeZone ?? "UTC").format(instant);
  } catch {
    return formatterFor("UTC").format(instant);
  }
}

/** Adds whole days to a `yyyy-mm-dd` string, staying in calendar-date space. */
export function addDays(isoDate: string, days: number): string {
  const shifted = new Date(`${isoDate}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Whole days between two `yyyy-mm-dd` strings (`to - from`). */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
