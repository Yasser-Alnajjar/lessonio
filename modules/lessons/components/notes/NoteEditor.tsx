"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon, Loader2, Trash2 } from "lucide-react";

import { deleteNote, updateNote } from "@/actions/lesson-notes.mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LessonNote } from "@/lib/types/lesson-note";

export interface NoteEditorProps {
  note: LessonNote;
  onDeleted: (id: string) => void;
  setNotes: Dispatch<SetStateAction<LessonNote[]>>;
}

const AUTOSAVE_DEBOUNCE_MS = 800;

/** Minimal prose overrides — no typography plugin installed, so markdown elements get bare Tailwind targeting instead. */
const MARKDOWN_CLASSNAME =
  "min-h-64 max-w-none rounded-md border p-3 text-sm [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5";

export function NoteEditor({ note, setNotes, onDeleted }: NoteEditorProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const t = useTranslations("lessons.notes");
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.contentMarkdown);
  const [saved, setSaved] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const lastSaved = useRef({
    title: note.title,
    content: note.contentMarkdown,
  });

  const debouncedTitle = useDebouncedValue(title, AUTOSAVE_DEBOUNCE_MS);
  const debouncedContent = useDebouncedValue(content, AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    const trimmedTitle = debouncedTitle.trim();
    if (!trimmedTitle) return;
    if (
      debouncedTitle === lastSaved.current.title &&
      debouncedContent === lastSaved.current.content
    ) {
      return;
    }

    startSaving(async () => {
      const result = await updateNote(note.id, {
        title: debouncedTitle,
        contentMarkdown: debouncedContent,
      });
      if (result.success) {
        lastSaved.current = {
          title: debouncedTitle,
          content: debouncedContent,
        };
        setSaved(true);
        setNotes((prev) =>
          prev.map((item) =>
            item.id === note.id ? { ...item, title: debouncedTitle } : item,
          ),
        );
      }
    });
  }, [debouncedTitle, debouncedContent, note.id]);

  const handleDelete = async () => {
    const result = await deleteNote(note.id);
    if (result.success) onDeleted(note.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
          placeholder={t("titlePlaceholder")}
          className="flex-1"
        />
        <span className="w-20 shrink-0 text-xs whitespace-nowrap text-muted-foreground">
          {isSaving ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              {t("saving")}
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="size-3" />
              {t("saved")}
            </span>
          ) : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void handleDelete()}
          aria-label={t("delete")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Tabs defaultValue="write" dir={isArabic ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="write">{t("write")}</TabsTrigger>
          <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <Textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setSaved(false);
            }}
            placeholder={t("contentPlaceholder")}
            className="min-h-64 font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className={MARKDOWN_CLASSNAME}>
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">{t("nothingToPreview")}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
