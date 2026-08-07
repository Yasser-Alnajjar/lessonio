"use client";

import { Archive, ArchiveRestore, Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LessonWithRelations } from "@/lib/types/lesson";

export interface LessonActionsMenuProps {
  lesson: LessonWithRelations;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

export function LessonActionsMenu({
  lesson,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: LessonActionsMenuProps) {
  const t = useTranslations("lessons.card");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("actionsLabel")}
          className="bg-background/80 backdrop-blur-sm hover:bg-background"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleArchive}>
          {lesson.isArchived ? <ArchiveRestore /> : <Archive />}
          {lesson.isArchived ? t("unarchive") : t("archive")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
