"use server";

/**
 * Client-invokable live search, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components
 * import this module directly (`@/actions/search.mutations`) instead of the
 * `@/actions` barrel — the global search command palette polls this on
 * every keystroke. `liveSearch` is a read rather than a write, same
 * rationale as `getRecentNotifications` in `notifications.mutations.ts`.
 */

import { runSearchQuery } from "@/lib/search/query";
import type { ActionResult } from "@/lib/types/common";
import type { SearchResultItem } from "@/lib/types/search";

export async function liveSearch(query: string): Promise<ActionResult<SearchResultItem[]>> {
  try {
    const data = await runSearchQuery("/api/v1/search/live", query);
    return { data, error: null };
  } catch {
    return { data: [], error: null };
  }
}
