import { axios } from "@/lib/client";
import type { SearchResultItem } from "@/lib/types/search";

/**
 * Shared core query, imported by both `search.ts` ("server-only", used by
 * the SSR results page) and `search.mutations.ts` ("use server", used by
 * the client-side command palette) — one implementation, no drift.
 *
 * The backend fixes the per-source limit (8) server-side and only accepts
 * `q` — there is no client-controlled `limit` param (API_CONTRACT.md §7.25),
 * so both callers hit the same endpoint with the same shape.
 */
export async function runSearchQuery(
  path: "/api/v1/search" | "/api/v1/search/live",
  query: string,
): Promise<SearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data } = await axios.get<{ data: SearchResultItem[] }>(path, {
    params: { q: trimmed },
  });
  return data.data;
}
