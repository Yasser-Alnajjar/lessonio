import "server-only";

import { createClient } from "@/lib/supabase/server";
import { runSearchQuery } from "@/lib/search/query";
import type { ActionResult } from "@/lib/types/common";
import type { SearchResultItem } from "@/lib/types/search";

const RESULTS_PAGE_LIMIT = 30;

/** SSR-facing search, used by the `/search/results` full-results page. */
export const searchActions = {
  async search(query: string): Promise<ActionResult<SearchResultItem[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const data = await runSearchQuery(supabase, authData.user.id, query, RESULTS_PAGE_LIMIT);
    return { data, error: null };
  },
};
