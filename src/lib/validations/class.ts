import { z } from "zod";

import { WEEKDAYS } from "@/lib/types/class";

/**
 * Class forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `classes.form.errors`
 * namespace rather than a hardcoded string — see `createLessonSchema` for
 * the same convention.
 *
 * There is no start or end date: a class recurs weekly for as long as it
 * exists, and `isActive` is what pauses it. There is no occurrence schema
 * either — occurrences are derived from `meetings`, never entered by hand.
 */
type Translator = (key: string) => string;

const MIN_WEEKDAY = Math.min(...WEEKDAYS);
const MAX_WEEKDAY = Math.max(...WEEKDAYS);

export function createClassSchema(t: Translator) {
  const meetingSchema = z.object({
    dayOfWeek: z.number().int().min(MIN_WEEKDAY).max(MAX_WEEKDAY),
    startTime: z.string().min(1, t("errors.startTimeRequired")),
    durationMinutes: z
      .number()
      .int(t("errors.durationInvalid"))
      .positive(t("errors.durationInvalid")),
  });

  return z.object({
    subjectId: z.uuid(t("errors.subjectRequired")),
    teacher: z.string().trim().max(120, t("errors.teacherMax")).optional(),
    location: z.string().trim().max(120, t("errors.locationMax")).optional(),
    meetings: z
      .array(meetingSchema)
      .min(1, t("errors.daysRequired"))
      .refine(
        (entries) =>
          new Set(entries.map((entry) => entry.dayOfWeek)).size ===
          entries.length,
        { message: t("errors.duplicateDay") },
      ),
    isActive: z.boolean().optional(),
    teacherClassId: z.uuid().nullable().optional(),
  });
}
