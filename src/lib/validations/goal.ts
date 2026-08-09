import { z } from "zod";

import { GOAL_PERIODS } from "@/lib/types/goal";

/**
 * Goal forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `gamification.goals.form.errors`
 * namespace — see `createSubjectSchema` for the same convention.
 */
type Translator = (key: string) => string;

export function createGoalSchema(t: Translator) {
  return z.object({
    period: z.enum(GOAL_PERIODS, { message: t("errors.periodRequired") }),
    targetMinutes: z
      .number(t("errors.targetRequired"))
      .int(t("errors.targetRequired"))
      .min(1, t("errors.targetMin")),
  });
}
