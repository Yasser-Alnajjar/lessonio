import { z } from "zod";

type Translator = (key: string) => string;

export function createTeacherClassSchema(t: Translator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("errors.nameRequired"))
      .max(120, t("errors.nameMax")),
    subjectLabel: z
      .string()
      .trim()
      .max(80, t("errors.subjectLabelMax"))
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, t("errors.descriptionMax"))
      .optional(),
  });
}
