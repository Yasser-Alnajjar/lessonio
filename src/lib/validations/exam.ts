import { z } from "zod";

/** Same convention as `createLessonSchema` — messages resolve through `exams.form.errors`. */
type Translator = (key: string) => string;

export function createExamSchema(t: Translator) {
  return z
    .object({
      lessonId: z.uuid(t("errors.lessonRequired")),
      title: z
        .string()
        .trim()
        .min(1, t("errors.titleRequired"))
        .max(160, t("errors.titleMax")),
      date: z.string().min(1, t("errors.dateRequired")),
      totalScore: z.number().positive(t("errors.totalScoreInvalid")),
      score: z.number().min(0, t("errors.scoreInvalid")).optional(),
    })
    .refine(
      (values) => values.score === undefined || values.score <= values.totalScore,
      { message: t("errors.scoreExceedsTotal"), path: ["score"] },
    );
}
