import { z } from "zod";

type Translator = (key: string) => string;

export function createAssignmentSchema(t: Translator) {
  return z.object({
    teacherClassId: z.uuid(t("errors.classRequired")),
    title: z
      .string()
      .trim()
      .min(1, t("errors.titleRequired"))
      .max(160, t("errors.titleMax")),
    instructions: z
      .string()
      .trim()
      .max(5000, t("errors.instructionsMax"))
      .optional(),
    dueAt: z.string().min(1, t("errors.dueAtRequired")),
    totalPoints: z
      .number()
      .positive(t("errors.totalPointsInvalid"))
      .max(1000, t("errors.totalPointsMax")),
  });
}
