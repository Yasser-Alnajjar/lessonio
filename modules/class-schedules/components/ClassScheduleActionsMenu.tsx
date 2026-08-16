"use client";

import { MoreVertical, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClassScheduleWithSubject } from "@/lib/types/class-schedule";

export interface ClassScheduleActionsMenuProps {
  classSchedule: ClassScheduleWithSubject;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export function ClassScheduleActionsMenu({
  classSchedule,
  onEdit,
  onToggleActive,
  onDelete,
}: ClassScheduleActionsMenuProps) {
  const t = useTranslations("classSchedules.card");

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
        <DropdownMenuItem onSelect={onToggleActive}>
          {classSchedule.isActive ? <PowerOff /> : <Power />}
          {classSchedule.isActive ? t("deactivate") : t("activate")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
