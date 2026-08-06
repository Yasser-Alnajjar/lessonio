"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { SearchResultItem } from "@/lib/types/search";

interface SearchResultsViewProps {
  data: SearchResultItem[];
  query: string;
}

export const SearchResultsView = ({ data, query }: SearchResultsViewProps) => {
  return (
    <FeaturePlaceholder
      title="Search results"
      description={`Instant search results for "${query}" land in final polish phase.`}
      itemCount={data.length}
    />
  );
};
