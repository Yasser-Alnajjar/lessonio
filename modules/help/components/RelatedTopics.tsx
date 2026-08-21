import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";

export interface RelatedTopicLink {
  slug: string;
  title: string;
  icon: LucideIcon;
}

export interface RelatedTopicsProps {
  label: string;
  topics: RelatedTopicLink[];
}

export function RelatedTopics({ label, topics }: RelatedTopicsProps) {
  if (topics.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/help/detail/${topic.slug}`}
            className="border-border bg-card hover:bg-accent flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <topic.icon className="size-3.5" />
            {topic.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
