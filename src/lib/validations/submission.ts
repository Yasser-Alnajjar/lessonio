import { z } from "zod";

type Translator = (key: string) => string;

export function createSubmitAssignmentSchema(t: Translator) {
  return z.object({
    content: z
      .string()
      .trim()
      .min(1, t("errors.contentRequired"))
      .max(20000, t("errors.contentMax")),
  });
}

export function createGradeSubmissionSchema(t: Translator, maxPoints: number) {
  return z.object({
    score: z
      .number()
      .min(0, t("errors.scoreInvalid"))
      .max(maxPoints, t("errors.scoreMax")),
    feedback: z.string().trim().max(5000, t("errors.feedbackMax")).optional(),
  });
}
