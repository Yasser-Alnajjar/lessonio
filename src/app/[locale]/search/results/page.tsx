import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Search } from "@modules";

interface SearchResultsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default function SearchResultsPage({ searchParams }: SearchResultsPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Search.SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
