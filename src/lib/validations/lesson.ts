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
    classId: z.uuid().optional(),
    title: z
      .string()
      .trim()
      .min(1, t("errors.titleRequired"))
      .max(160, t("errors.titleMax")),
    date: z.string().min(1, t("errors.dateRequired")),
    tagIds: z.array(z.uuid()).optional(),
  });
}
