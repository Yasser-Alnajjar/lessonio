"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Creates a fresh browser Supabase client. Every mutation still goes through
 * `Actions.Auth.*` server actions per the mandatory architecture — this client
 * exists for client-only concerns like subscribing to `onAuthStateChange`.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
