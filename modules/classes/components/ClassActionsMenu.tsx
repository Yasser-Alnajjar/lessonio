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
import type { ClassWithSubject } from "@/lib/types/class";

export interface ClassActionsMenuProps {
  klass: ClassWithSubject;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export function ClassActionsMenu({
  klass,
  onEdit,
  onToggleActive,
  onDelete,
}: ClassActionsMenuProps) {
  const t = useTranslations("classes.card");

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
          {klass.isActive ? <PowerOff /> : <Power />}
          {klass.isActive ? t("deactivate") : t("activate")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
