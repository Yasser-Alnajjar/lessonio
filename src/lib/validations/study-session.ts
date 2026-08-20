import { z } from "zod";

/**
 * Same convention as `createHomeworkSchema` — every message is a lookup key
 * into the `studySessions.log.errors` namespace, built at render time via
 * `useTranslations`.
 */
type Translator = (key: string) => string;

const MAX_MANUAL_DURATION_MINUTES = 12 * 60;

export function logStudySessionSchema(t: Translator) {
  return z.object({
    subjectId: z.uuid().optional().or(z.literal("")),
    lessonId: z.uuid().optional().or(z.literal("")),
    startedAt: z.string().min(1, t("errors.startedAtRequired")),
    durationMinutes: z
      .number(t("errors.durationRequired"))
      .int(t("errors.durationRequired"))
      .min(1, t("errors.durationRequired"))
      .max(MAX_MANUAL_DURATION_MINUTES, t("errors.durationMax")),
  });
}
