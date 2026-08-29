import "server-only";

import { runSearchQuery } from "@/lib/search/query";
import type { ActionResult } from "@/lib/types/common";
import type { SearchResultItem } from "@/lib/types/search";

/** SSR-facing search, used by the `/search/results` full-results page. */
export const searchActions = {
  async search(query: string): Promise<ActionResult<SearchResultItem[]>> {
    try {
      const data = await runSearchQuery("/api/v1/search", query);
      return { data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },
};
