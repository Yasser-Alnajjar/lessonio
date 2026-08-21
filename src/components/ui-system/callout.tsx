import { AlertTriangle, Info, Lightbulb, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CalloutProps extends React.ComponentProps<"div"> {
  /** "tip": a helpful shortcut. "note": neutral context. "important": read this before acting. "warning": something can't be undone. */
  variant?: "tip" | "note" | "important" | "warning";
  title?: string;
  icon?: React.ReactNode;
}

const DEFAULT_ICON = {
  tip: Lightbulb,
  note: Info,
  important: TriangleAlert,
  warning: AlertTriangle,
} as const;

const VARIANT_CLASSES: Record<NonNullable<CalloutProps["variant"]>, string> = {
  tip: "border-primary/25 bg-primary/5 text-foreground [&_[data-slot=callout-icon]]:text-primary",
  note: "border-border bg-muted/50 text-foreground [&_[data-slot=callout-icon]]:text-muted-foreground",
  important:
    "border-highlighter/40 bg-highlighter/10 text-foreground [&_[data-slot=callout-icon]]:text-highlighter-foreground",
  warning:
    "border-destructive/30 bg-destructive/5 text-foreground [&_[data-slot=callout-icon]]:text-destructive",
};

export function Callout({
  variant = "note",
  title,
  icon,
  className,
  children,
  ...props
}: CalloutProps) {
  const Icon = DEFAULT_ICON[variant];

  return (
    <div
      data-slot="callout"
      data-variant={variant}
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      <div data-slot="callout-icon" className="mt-0.5 shrink-0">
        {icon ?? <Icon className="size-4" />}
      </div>
      <div className="flex flex-col gap-1">
        {title && <p className="font-medium">{title}</p>}
        <div className="text-muted-foreground [&_a]:text-foreground text-sm text-balance [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </div>
    </div>
  );
}
