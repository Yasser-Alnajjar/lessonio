"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { FileText, Plus } from "lucide-react";

import { createNote } from "@/actions/lesson-notes.mutations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { SearchInput } from "@/components/ui-system/search-input";
import { cn } from "@/lib/utils";
import type { LessonNote } from "@/lib/types/lesson-note";
import { NoteEditor } from "./NoteEditor";

export interface NotesPanelProps {
  lessonId: string;
  notes: LessonNote[];
}

export function NotesPanel({ lessonId, notes: initialNotes }: NotesPanelProps) {
  const t = useTranslations("lessons.notes");
  const [notes, setNotes] = useState(initialNotes);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNotes[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentMarkdown.toLowerCase().includes(query),
    );
  }, [notes, search]);

  const selected = notes.find((note) => note.id === selectedId) ?? null;

  const handleCreate = async () => {
    setCreating(true);
    const result = await createNote({
      lessonId,
      title: t("untitled"),
      contentMarkdown: "",
    });
    setCreating(false);
    if (result.success) {
      setNotes((prev) => [result.note, ...prev]);
      setSelectedId(result.note.id);
    }
  };

  const handleDeleted = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  if (notes.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={{ label: t("newNote"), onClick: () => void handleCreate() }}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchInput
            onSearch={setSearch}
            placeholder={t("searchPlaceholder")}
            containerClassName="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => void handleCreate()}
            disabled={creating}
            aria-label={t("newNote")}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {filtered.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              {t("noSearchResults")}
            </p>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setSelectedId(note.id)}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-start transition-colors hover:bg-accent",
                note.id === selectedId && "border-primary bg-primary/5",
              )}
            >
              <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{note.title}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(note.updatedAt), "MMM d, yyyy")}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4">
        {selected ? (
          <NoteEditor
            key={selected.id}
            setNotes={setNotes}
            note={selected}
            onDeleted={handleDeleted}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("selectPrompt")}</p>
        )}
      </Card>
    </div>
  );
}
