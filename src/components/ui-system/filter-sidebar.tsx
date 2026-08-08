"use client";

import * as React from "react";
import { FilterIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useLocale } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import useTranslate from "@/hooks/useTranslate";

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
  statusLabel,
  subjectLabel,
  dateRangeLabel,
  className,
}: FilterSidebarProps) {
  const t = useTranslate("filters");
  const locale = useLocale();

  const [open, setOpen] = React.useState(false);
  const activeCount = activeFilterCount(value);

  const isRtl = locale === "ar";

  const dateRange: DateRange | undefined = value.dateFrom
    ? {
        from: new Date(value.dateFrom),
        to: value.dateTo ? new Date(value.dateTo) : undefined,
      }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <FilterIcon className="size-4" />
          {t("title")}

          {activeCount > 0 && (
            <Badge variant="secondary" className="rounded-full px-2">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side={isRtl ? "left" : "right"}
        dir={isRtl ? "rtl" : "ltr"}
        className="flex flex-col min-w-xxs w-fit"
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => onChange(EMPTY_FILTER_VALUE)}
            >
              {t("clearAll")}
            </Button>
          )}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          {statusOptions.length > 0 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {statusLabel ?? t("status")}
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

          {statusOptions.length > 0 && subjectOptions.length > 0 && (
            <Separator />
          )}

          {subjectOptions.length > 0 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {subjectLabel ?? t("subject")}
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

          <fieldset className="flex flex-col gap-2 w-full">
            <legend className="mb-1 text-sm font-medium text-foreground">
              {dateRangeLabel ?? t("dateRange")}
            </legend>

            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) =>
                onChange({
                  ...value,
                  dateFrom: range?.from
                    ? range.from.toISOString().slice(0, 10)
                    : undefined,
                  dateTo: range?.to
                    ? range.to.toISOString().slice(0, 10)
                    : undefined,
                })
              }
              numberOfMonths={1}
              dir={isRtl ? "rtl" : "ltr"}
              className="p-0"
            />
          </fieldset>
        </div>

        <SheetFooter>
          <Button onClick={() => setOpen(false)}>{t("done")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
