import { Actions } from "@/actions";
import { SearchResultsView } from "../csr/SearchResultsView";

interface SearchResultsProps {
  searchParams: Promise<{ q?: string }>;
}

export const SearchResults = async ({ searchParams }: SearchResultsProps) => {
  const { q } = await searchParams;
  const query = q ?? "";
  const { data } = await Actions.Search.search(query);
  const safeData = data ?? [];

  return <SearchResultsView data={safeData} query={query} />;
};
