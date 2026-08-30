import { z } from "zod";

import { NOTIFICATION_TYPES } from "@/lib/types/notification";

const typePreferenceSchema = z.object({
  in_app: z.boolean(),
  email: z.boolean(),
});

/**
 * Schema factory matching `createGoalSchema` (`src/lib/validations/goal.ts`)
 * — built at render time, not module scope, so validation messages can be
 * translated. There's little to actually reject here (every field is a
 * boolean toggle); the schema exists mainly to guarantee the whole-object
 * shape the backend's `array:` validation expects.
 */
export function createNotificationPreferencesSchema() {
  return z.object({
    channels: z.object({
      in_app: z.boolean(),
      email: z.boolean(),
      push: z.boolean(),
    }),
    types: z.object(
      Object.fromEntries(
        NOTIFICATION_TYPES.map((type) => [type, typePreferenceSchema]),
      ) as Record<
        (typeof NOTIFICATION_TYPES)[number],
        typeof typePreferenceSchema
      >,
    ),
  });
}
