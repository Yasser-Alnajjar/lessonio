import { z } from "zod";

import { SUBJECT_ICON_OPTIONS } from "@/lib/constants/subjects";
import type { SubjectIcon } from "@/lib/types/subject";

/**
 * Subject forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `subjects.form.errors`
 * namespace rather than a hardcoded string — see `createLoginSchema` for
 * the same convention.
 */
type Translator = (key: string) => string;

const iconOptions = SUBJECT_ICON_OPTIONS as [SubjectIcon, ...SubjectIcon[]];

export function createSubjectSchema(t: Translator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("errors.nameRequired"))
      .max(80, t("errors.nameMax")),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t("errors.colorInvalid")),
    icon: z.enum(iconOptions, { message: t("errors.iconRequired") }),
    creditHours: z
      .number(t("errors.creditHoursInvalid"))
      .positive(t("errors.creditHoursInvalid"))
      .max(20, t("errors.creditHoursMax")),
  });
}
