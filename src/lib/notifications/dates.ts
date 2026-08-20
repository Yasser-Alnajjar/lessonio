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

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const CLOCK_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function clockFormatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = CLOCK_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    CLOCK_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

export interface LocalClock {
  /** 0 = Sunday .. 6 = Saturday, matching ClassMeeting.dayOfWeek. */
  weekday: number;
  /** Minutes since local midnight, 0-1439. */
  minutesOfDay: number;
}

/**
 * Resolves the weekday and minute-of-day for `instant` in `timeZone`, for
 * comparing against a class schedule's dayOfWeek/startTime. Falls back to
 * UTC when the stored timezone is absent or not one the runtime recognizes,
 * same as `localIsoDate`.
 */
export function localClock(instant: Date, timeZone: string | null): LocalClock {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = clockFormatterFor(timeZone ?? "UTC");
    formatter.format(instant);
  } catch {
    formatter = clockFormatterFor("UTC");
  }

  const parts = formatter.formatToParts(instant);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    weekday: WEEKDAY_INDEX[weekdayName] ?? 0,
    // Some ICU versions render midnight as hour "24" under hour12:false.
    minutesOfDay: (hour % 24) * 60 + minute,
  };
}
