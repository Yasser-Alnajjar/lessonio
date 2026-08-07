import { z } from "zod";

/**
 * Lesson forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `lessons.form.errors`
 * namespace rather than a hardcoded string — see `createSubjectSchema` for
 * the same convention.
 */
type Translator = (key: string) => string;

export function createLessonSchema(t: Translator) {
  return z.object({
    subjectId: z.uuid(t("errors.subjectRequired")),
    title: z
      .string()
      .trim()
      .min(1, t("errors.titleRequired"))
      .max(160, t("errors.titleMax")),
    teacher: z.string().trim().max(120, t("errors.teacherMax")).optional(),
    location: z.string().trim().max(120, t("errors.locationMax")).optional(),
    date: z.string().min(1, t("errors.dateRequired")),
    time: z.string().min(1, t("errors.timeRequired")),
    durationMinutes: z
      .number()
      .int(t("errors.durationInvalid"))
      .positive(t("errors.durationInvalid")),
    tagIds: z.array(z.uuid()).optional(),
  });
}
