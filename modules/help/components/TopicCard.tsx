import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";

export interface TopicCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  summary: string;
}

export function TopicCard({
  href,
  icon: Icon,
  title,
  summary,
}: TopicCardProps) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:border-primary/40 hover:bg-accent/40 flex flex-col gap-3 rounded-2xl border p-5 transition-colors"
    >
      <div className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
        <Icon className="size-4.5" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm text-balance">{summary}</p>
      </div>
    </Link>
  );
}
