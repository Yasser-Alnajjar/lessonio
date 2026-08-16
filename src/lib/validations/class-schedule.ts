import { z } from "zod";

import { WEEKDAYS } from "@/lib/types/class-schedule";

/**
 * Class schedule forms build their schema at render time via
 * `useTranslations`, so every message below is a lookup key into the
 * `classSchedules.form.errors` namespace rather than a hardcoded string —
 * see `createLessonSchema` for the same convention.
 */
type Translator = (key: string) => string;

const MIN_WEEKDAY = Math.min(...WEEKDAYS);
const MAX_WEEKDAY = Math.max(...WEEKDAYS);

export function createClassScheduleSchema(t: Translator) {
  const scheduleEntrySchema = z.object({
    dayOfWeek: z.number().int().min(MIN_WEEKDAY).max(MAX_WEEKDAY),
    startTime: z.string().min(1, t("errors.startTimeRequired")),
    durationMinutes: z
      .number()
      .int(t("errors.durationInvalid"))
      .positive(t("errors.durationInvalid")),
  });

  return z
    .object({
      subjectId: z.uuid(t("errors.subjectRequired")),
      teacher: z.string().trim().max(120, t("errors.teacherMax")).optional(),
      location: z.string().trim().max(120, t("errors.locationMax")).optional(),
      schedules: z
        .array(scheduleEntrySchema)
        .min(1, t("errors.daysRequired"))
        .refine(
          (entries) =>
            new Set(entries.map((entry) => entry.dayOfWeek)).size ===
            entries.length,
          { message: t("errors.duplicateDay") },
        ),
      startsOn: z.string().min(1, t("errors.startsOnRequired")),
      endsOn: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((values) => !values.endsOn || values.endsOn >= values.startsOn, {
      message: t("errors.endsOnInvalid"),
      path: ["endsOn"],
    });
}
