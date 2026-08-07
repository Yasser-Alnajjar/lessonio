"use client";

import { useState } from "react";
import { TagIcon } from "lucide-react";

import { createTag } from "@/actions/tags.mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/lib/types/tag";

export interface TagPickerProps {
  tags: Tag[];
  value: string[];
  onChange: (tagIds: string[]) => void;
  onTagCreated?: (tag: Tag) => void;
  triggerLabel: string;
  newTagPlaceholder: string;
  emptyLabel: string;
}

export function TagPicker({
  tags,
  value,
  onChange,
  onTagCreated,
  triggerLabel,
  newTagPlaceholder,
  emptyLabel,
}: TagPickerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedTags = tags.filter((tag) => value.includes(tag.id));

  const toggle = (tagId: string) => {
    onChange(
      value.includes(tagId) ? value.filter((id) => id !== tagId) : [...value, tagId],
    );
  };

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name || creating) return;
    setCreating(true);
    const result = await createTag(name);
    setCreating(false);
    if (result.success) {
      onTagCreated?.(result.tag);
      onChange(value.includes(result.tag.id) ? value : [...value, result.tag.id]);
      setNewTagName("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-fit gap-2">
            <TagIcon className="size-4" />
            {triggerLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {tags.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
          )}
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={value.includes(tag.id)}
              onSelect={(event) => {
                event.preventDefault();
                toggle(tag.id);
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <div className="flex items-center gap-1 p-1">
            <Input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder={newTagPlaceholder}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTagName.trim() || creating}
              onClick={() => void handleCreate()}
            >
              +
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="gap-1.5"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
