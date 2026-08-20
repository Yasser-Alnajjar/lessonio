import { z } from "zod";

/**
 * Class forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `classes.form.errors`
 * namespace rather than a hardcoded string — see `createLessonSchema` for
 * the same convention.
 */
type Translator = (key: string) => string;

export function createClassSchema(t: Translator) {
  return z.object({
    subjectId: z.uuid(t("errors.subjectRequired")),
    classScheduleId: z.uuid().optional(),
    date: z.string().min(1, t("errors.dateRequired")),
    startTime: z.string().min(1, t("errors.timeRequired")),
    durationMinutes: z
      .number()
      .int(t("errors.durationInvalid"))
      .positive(t("errors.durationInvalid")),
    teacher: z.string().trim().max(120, t("errors.teacherMax")).optional(),
    location: z.string().trim().max(120, t("errors.locationMax")).optional(),
  });
}
