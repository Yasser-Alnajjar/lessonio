import { z } from "zod";

/**
 * Same convention as `createLessonSchema` — every message is a lookup key
 * into the `homework.form.errors` namespace, built at render time via
 * `useTranslations`.
 */
type Translator = (key: string) => string;

export function createHomeworkSchema(t: Translator) {
  return z.object({
    lessonId: z.uuid(t("errors.lessonRequired")),
    title: z
      .string()
      .trim()
      .min(1, t("errors.titleRequired"))
      .max(160, t("errors.titleMax")),
    deadline: z.string().min(1, t("errors.deadlineRequired")),
  });
}
