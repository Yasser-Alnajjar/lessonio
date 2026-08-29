import { z } from "zod";

/** Only NEXT_PUBLIC_* vars belong here — this module is safe to bundle client-side. */
const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
