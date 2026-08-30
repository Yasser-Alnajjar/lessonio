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
import type { Subject } from "@/lib/types/subject";

export interface SubjectActionsMenuProps {
  subject: Subject;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

export function SubjectActionsMenu({
  subject,
  onEdit,
  onToggleArchive,
  onDelete,
}: SubjectActionsMenuProps) {
  const t = useTranslations("subjects.card");

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
        <DropdownMenuItem onSelect={onToggleArchive}>
          {subject.isArchived ? <ArchiveRestore /> : <Archive />}
          {subject.isArchived ? t("unarchive") : t("archive")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
