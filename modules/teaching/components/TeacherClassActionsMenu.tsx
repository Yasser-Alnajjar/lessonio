"use client";

import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";

export interface TeacherClassActionsMenuProps {
  item: TeacherClassWithStats;
  onEdit: () => void;
  onToggleArchived: () => void;
  onDelete: () => void;
}

export function TeacherClassActionsMenu({
  item,
  onEdit,
  onToggleArchived,
  onDelete,
}: TeacherClassActionsMenuProps) {
  const t = useTranslations("teaching.classes.card");

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
        <DropdownMenuItem onSelect={onToggleArchived}>
          {item.isArchived ? <ArchiveRestore /> : <Archive />}
          {item.isArchived ? t("unarchive") : t("archive")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
