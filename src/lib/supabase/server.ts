import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Creates a new server-side Supabase client scoped to the current request's
 * cookies. Must be created fresh per request — never module-level singleton.
 *
 * Auth moved to Laravel/NextAuth (`src/auth.ts`); this client remains only
 * for the business-domain queries not yet ported off Supabase. No session
 * cookie ever gets set here anymore, so `setAll` failing on a Server
 * Component render (Next.js forbids setting cookies there) is harmless —
 * it's caught and ignored below.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render — safe to ignore, see
            // the file header comment above.
          }
        },
      },
    },
  );
}
