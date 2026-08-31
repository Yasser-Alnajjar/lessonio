import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  type ColumnDef,
} from "@tanstack/react-table";

import type { EmptyStateProps } from "@/components/ui-system/empty-state";

/**
 * Framework-agnostic table config and column-building helpers. Kept out of
 * `data-table.tsx` (which is `"use client"`) so Server Components can build
 * column definitions for server-fetched data without a client boundary.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

/**
 * Matches @tanstack/table-core's own `RowData` bound (`Record<string, any>`,
 * not `unknown`) — plain domain interfaces without index signatures only
 * satisfy a generic constraint whose value type is `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableRowData = Record<string, any>;

export function createDataTableColumnHelper<TData extends DataTableRowData>() {
  return createColumnHelper<typeof dataTableFeatures, TData>();
}

export type DataTableColumnDef<
  TData extends DataTableRowData,
  // Column value types differ per column; `any` mirrors ColumnDef's own
  // heterogeneous-array convention.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TValue = any,
> = ColumnDef<typeof dataTableFeatures, TData, TValue>;

export interface DataTableRowAction<TData> {
  label: string;
  onClick: (row: TData) => void;
  variant?: "default" | "destructive";
  /** Omits this action from a given row's menu — e.g. "Grade" before a student has submitted. */
  isHidden?: (row: TData) => boolean;
}

/**
 * Opts a `DataTable` into server-side pagination: `data` is treated as
 * exactly one page already fetched from the server, and the client
 * paginator is neutralized so it renders as a single client page.
 * `onPageChange` is expected to be wrapped in `useTransition` by the
 * caller — see the plan's per-view wiring snippet.
 */
export interface DataTableServerPagination {
  page: number;
  lastPage: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  perPageOptions?: number[];
}

export interface DataTableProps<TData extends DataTableRowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  isLoading?: boolean;
  emptyState: Pick<
    EmptyStateProps,
    "title" | "description" | "variant" | "action"
  >;
  rowActions?: DataTableRowAction<TData>[];
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedIds: string[]) => void;
  pageSize?: number;
  className?: string;
  /** When present, `data` is one server-fetched page and the footer paginates via `onPageChange` instead of client-side. */
  serverPagination?: DataTableServerPagination;
}
