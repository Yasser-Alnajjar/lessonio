import { FolderOpen, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  /** "no-data": nothing exists yet. "no-results": search/filter matched nothing. */
  variant?: "no-data" | "no-results";
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: EmptyStateAction;
}

const DEFAULT_ICON = {
  "no-data": FolderOpen,
  "no-results": SearchX,
} as const;

export function EmptyState({
  variant = "no-data",
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const Icon = DEFAULT_ICON[variant];

  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={cn(
        "flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 p-10 text-center",
        className,
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Icon className="size-6" />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Button asChild size="sm" className="mt-2">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button size="sm" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
