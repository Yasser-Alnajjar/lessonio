"use server";

/**
 * Client-invokable live search, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components
 * import this module directly (`@/actions/search.mutations`) instead of the
 * `@/actions` barrel — the global search command palette polls this on
 * every keystroke. `liveSearch` is a read rather than a write, same
 * rationale as `getRecentNotifications` in `notifications.mutations.ts`.
 */

import { createClient } from "@/lib/supabase/server";
import { runSearchQuery } from "@/lib/search/query";
import type { ActionResult } from "@/lib/types/common";
import type { SearchResultItem } from "@/lib/types/search";

/** Smaller than the full results page — the palette only needs a quick preview per group. */
const PALETTE_LIMIT = 6;

export async function liveSearch(query: string): Promise<ActionResult<SearchResultItem[]>> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { data: [], error: null };
  }

  const data = await runSearchQuery(supabase, authData.user.id, query, PALETTE_LIMIT);
  return { data, error: null };
}
