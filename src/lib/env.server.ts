import "server-only";

import { z } from "zod";

/**
 * Server-only secrets — the counterpart to `src/lib/env.ts`, which is imported
 * by the browser bundle and therefore holds NEXT_PUBLIC_* vars exclusively.
 *
 * Unlike that file, this schema is parsed *lazily* rather than at module load.
 * `next build` and `next dev` both import server modules eagerly, and a build
 * machine without a Resend key or service-role key is a normal state (the
 * features degrade gracefully) — an eager `parse()` would turn that into a
 * hard build failure. Callers ask for what they need at the point they need it.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  /** Authorizes requests to /api/cron/notifications — see that route. */
  CRON_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  cached ??= serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  return cached;
}
