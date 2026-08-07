"use client";

import * as React from "react";
import { FilterIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterSidebarValue {
  statuses: string[];
  subjectIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

export const EMPTY_FILTER_VALUE: FilterSidebarValue = {
  statuses: [],
  subjectIds: [],
};

export interface FilterSidebarProps {
  value: FilterSidebarValue;
  onChange: (value: FilterSidebarValue) => void;
  statusOptions: FilterOption[];
  subjectOptions: FilterOption[];
  statusLabel?: string;
  subjectLabel?: string;
  dateRangeLabel?: string;
  className?: string;
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function activeFilterCount(value: FilterSidebarValue): number {
  return (
    value.statuses.length +
    value.subjectIds.length +
    (value.dateFrom ? 1 : 0) +
    (value.dateTo ? 1 : 0)
  );
}

export function FilterSidebar({
  value,
  onChange,
  statusOptions,
  subjectOptions,
  statusLabel = "Status",
  subjectLabel = "Subject",
  dateRangeLabel = "Date range",
  className,
}: FilterSidebarProps) {
  const [open, setOpen] = React.useState(false);
  const activeCount = activeFilterCount(value);

  const dateRange: DateRange | undefined = value.dateFrom
    ? { from: new Date(value.dateFrom), to: value.dateTo ? new Date(value.dateTo) : undefined }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <FilterIcon className="size-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="default" className="ms-0.5 px-1.5 py-0">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm" data-slot="filter-sidebar">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(EMPTY_FILTER_VALUE)}
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          {statusOptions.length > 0 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {statusLabel}
              </legend>
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    checked={value.statuses.includes(option.value)}
                    onCheckedChange={() =>
                      onChange({
                        ...value,
                        statuses: toggleValue(value.statuses, option.value),
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          )}

          {statusOptions.length > 0 && subjectOptions.length > 0 && <Separator />}

          {subjectOptions.length > 0 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {subjectLabel}
              </legend>
              {subjectOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    checked={value.subjectIds.includes(option.value)}
                    onCheckedChange={() =>
                      onChange({
                        ...value,
                        subjectIds: toggleValue(value.subjectIds, option.value),
                      })
                    }
                  />
                  {option.color && (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </label>
              ))}
            </fieldset>
          )}

          <Separator />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">
              {dateRangeLabel}
            </legend>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) =>
                onChange({
                  ...value,
                  dateFrom: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
                  dateTo: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
                })
              }
              numberOfMonths={1}
              className="p-0"
            />
          </fieldset>
        </div>

        <SheetFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
