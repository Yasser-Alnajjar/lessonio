"use client";

import { useTransition } from "react";

import type { DataTableServerPagination } from "@/components/ui-system/data-table-core";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { PaginationMeta } from "@/lib/types/common";

/**
 * Wires a `PaginationMeta` from a server-fetched admin list page into
 * `DataTable`'s `serverPagination` prop. `useTransition` is required, not
 * optional — without it, the `?page=` change re-runs the RSC and each admin
 * page's `<Suspense fallback={<PageLoader />}>` flashes a full-page loader
 * on every page click. `createQueryFromObject` merges into the existing
 * query string, so `q`/`role`/etc. filters survive the page change.
 */
export function useAdminPagination(
  meta: PaginationMeta,
): DataTableServerPagination {
  const { createQueryFromObject } = useQueryParams();
  const [isPending, startTransition] = useTransition();

  return {
    page: meta.page,
    lastPage: meta.lastPage,
    perPage: meta.perPage,
    isPending,
    onPageChange: (page: number) => {
      startTransition(() => {
        createQueryFromObject({ page });
      });
    },
    // Changing the page size makes the current `page` number meaningless
    // against the new total page count, so it resets to page 1.
    onPerPageChange: (perPage: number) => {
      startTransition(() => {
        createQueryFromObject({ perPage, page: 1 });
      });
    },
  };
}
