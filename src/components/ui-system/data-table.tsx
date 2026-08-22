"use client";

import * as React from "react";
import { useTable, type DisplayColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontal,
} from "lucide-react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  dataTableFeatures,
  type DataTableColumnDef,
  type DataTableProps,
  type DataTableRowData,
} from "@/components/ui-system/data-table-core";

const EMPTY_DATA: never[] = [];

export function DataTable<TData extends DataTableRowData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyState,
  rowActions,
  enableRowSelection = false,
  onRowSelectionChange,
  pageSize = 10,
  className,
}: DataTableProps<TData>) {
  const fullColumns = React.useMemo<DataTableColumnDef<TData>[]>(() => {
    const selectionColumn: DisplayColumnDef<typeof dataTableFeatures, TData> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsSomePageRowsSelected() &&
            !table.getIsAllPageRowsSelected()
              ? "indeterminate"
              : table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    };

    const actionsColumn: DisplayColumnDef<typeof dataTableFeatures, TData> = {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const visibleActions = (rowActions ?? []).filter(
          (action) => !action.isHidden?.(row.original),
        );
        if (visibleActions.length === 0) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  variant={
                    action.variant === "destructive" ? "destructive" : "default"
                  }
                  onClick={() => action.onClick(row.original)}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    };

    return [
      ...(enableRowSelection ? [selectionColumn] : []),
      ...columns,
      ...(rowActions ? [actionsColumn] : []),
    ] as DataTableColumnDef<TData>[];
  }, [columns, enableRowSelection, rowActions]);

  const table = useTable({
    features: dataTableFeatures,
    columns: fullColumns,
    data: data.length > 0 ? data : (EMPTY_DATA as TData[]),
    getRowId,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  React.useEffect(() => {
    if (!onRowSelectionChange) return;
    onRowSelectionChange(Object.keys(table.state.rowSelection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.state.rowSelection]);

  if (isLoading) {
    return (
      <DataTableSkeleton columns={fullColumns.length} className={className} />
    );
  }

  if (data.length === 0) {
    return <EmptyState {...emptyState} className={className} />;
  }

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-slot="data-table"
    >
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-start">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex   gap-1.5 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        {header.column.getIsSorted() === "asc" && (
                          <ArrowUp className="size-3.5" />
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <ArrowDown className="size-3.5" />
                        )}
                        {!header.column.getIsSorted() && (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Page {table.state.pagination.pageIndex + 1} of{" "}
          {Math.max(1, table.getPageCount())}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-4 rtl:rotate-180" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRightIcon className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DataTableSkeleton({
  columns,
  className,
}: {
  columns: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-slot="data-table-skeleton"
    >
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
