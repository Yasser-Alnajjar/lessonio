"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  defaultValue?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  containerClassName?: string;
}

export function SearchInput({
  value: controlledValue,
  defaultValue = "",
  onSearch,
  debounceMs = 300,
  className,
  containerClassName,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(
    controlledValue ?? defaultValue,
  );
  const value = controlledValue ?? internalValue;
  const debouncedValue = useDebouncedValue(value, debounceMs);

  React.useEffect(() => {
    onSearch(debouncedValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  return (
    <div className={cn("relative flex items-center", containerClassName)}>
      <SearchIcon className="pointer-events-none absolute start-3 size-4 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setInternalValue(event.target.value)}
        placeholder={placeholder}
        className={cn("ps-9", value && "pe-9", className)}
        {...props}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute end-1 text-muted-foreground hover:text-foreground"
          onClick={() => setInternalValue("")}
          aria-label="Clear search"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
