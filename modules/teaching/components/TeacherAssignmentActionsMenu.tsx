"use client";

import { Eye, EyeOff, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssignmentWithStats } from "@/lib/types/assignment";

export interface TeacherAssignmentActionsMenuProps {
  item: AssignmentWithStats;
  onEdit: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}

export function TeacherAssignmentActionsMenu({
  item,
  onEdit,
  onTogglePublished,
  onDelete,
}: TeacherAssignmentActionsMenuProps) {
  const t = useTranslations("teaching.assignments.card");

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
        <DropdownMenuItem onSelect={onTogglePublished}>
          {item.status === "published" ? <EyeOff /> : <Eye />}
          {item.status === "published" ? t("unpublish") : t("publish")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
