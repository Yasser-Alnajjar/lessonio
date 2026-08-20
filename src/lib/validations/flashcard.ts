import { z } from "zod";

/** Same convention as `createHomeworkSchema` — messages resolve through `flashcards.form.errors`. */
type Translator = (key: string) => string;

export function createFlashcardSchema(t: Translator) {
  return z.object({
    lessonId: z.uuid(t("errors.lessonRequired")),
    front: z
      .string()
      .trim()
      .min(1, t("errors.frontRequired"))
      .max(500, t("errors.frontMax")),
    back: z
      .string()
      .trim()
      .min(1, t("errors.backRequired"))
      .max(1000, t("errors.backMax")),
  });
}
