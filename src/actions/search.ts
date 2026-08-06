import "server-only";

import type { ActionResult } from "@/lib/types/common";
import type { SearchResultItem } from "@/lib/types/search";

/** TODO(later polish phase): replace stub with a Postgres full-text search query. */
export const searchActions = {
  async search(_query: string): Promise<ActionResult<SearchResultItem[]>> {
    return { data: [], error: null };
  },
};
