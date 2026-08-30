import {
  BookOpen,
  FileText,
  GraduationCap,
  NotebookText,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type {
  SearchResultItem as SearchResultItemType,
  SearchResultKind,
} from "@/lib/types/search";

export const SEARCH_RESULT_ICONS: Record<SearchResultKind, LucideIcon> = {
  subject: BookOpen,
  lesson: NotebookText,
  teacher: GraduationCap,
  note: FileText,
  tag: Tag,
};

/** Shared display order, used by both the results page and the command palette. */
export const SEARCH_RESULT_GROUP_ORDER: SearchResultKind[] = [
  "subject",
  "lesson",
  "note",
  "teacher",
  "tag",
];

export interface SearchResultItemProps {
  item: SearchResultItemType;
  onSelect?: () => void;
  className?: string;
}

export function SearchResultItem({
  item,
  onSelect,
  className,
}: SearchResultItemProps) {
  const Icon = SEARCH_RESULT_ICONS[item.kind];

  return (
    <Link
      href={item.path}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">
          {item.title}
        </span>
        {item.subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
