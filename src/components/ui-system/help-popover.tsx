"use client";

import { HelpCircle } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface HelpPopoverProps {
  /** Shown as the popover's small heading, e.g. "What is Attendance?" */
  title: string;
  children: React.ReactNode;
  /** Accessible label for the trigger button, e.g. "What is this?" */
  triggerLabel: string;
  className?: string;
}

/**
 * A small "what is this?" trigger for contextual, in-place help. Content is
 * meant to be the same plain-language copy used in the Help Center, so the
 * explanation never drifts between the two places it's shown.
 */
export function HelpPopover({
  title,
  children,
  triggerLabel,
  className,
}: HelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
            className,
          )}
        >
          <HelpCircle className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-1.5">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground text-sm text-balance">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
