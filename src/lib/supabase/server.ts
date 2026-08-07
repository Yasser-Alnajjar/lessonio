import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Creates a new server-side Supabase client scoped to the current request's
 * cookies. Must be created fresh per request — never module-level singleton.
 *
 * `setAll` can fail when called from a Server Component (not a Server
 * Action or Route Handler) because Next.js forbids setting cookies there.
 * That's fine as long as `proxy.ts` refreshes the session on every request
 * via `updateSession` — see `src/lib/supabase/middleware.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Called from a Server Component render — safe to ignore since
            // the middleware's updateSession keeps the session fresh.
          }
        },
      },
    },
  );
}
