"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Badge as BadgeIcon,
  CalendarDays,
  CalendarClock,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  duplicateLesson,
  toggleArchiveLesson,
} from "@/actions/lessons.mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Link, useRouter } from "@/i18n/navigation";
import type { Attachment } from "@/lib/types/attachment";
import type { LessonNote } from "@/lib/types/lesson-note";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { ClassWithRelations } from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";
import type { Tag } from "@/lib/types/tag";
import type { FlashcardWithRelations } from "@/lib/types/flashcard";
import { AttachmentsPanel } from "../../components/attachments/AttachmentsPanel";
import { DeleteLessonDialog } from "../../components/DeleteLessonDialog";
import { FlashcardsPanel } from "../../components/flashcards/FlashcardsPanel";
import { LessonFormDialog } from "../../components/LessonFormDialog";
import { LessonStatusControls } from "../../components/LessonStatusControls";
import { NotesPanel } from "../../components/notes/NotesPanel";

interface LessonsDetailViewProps {
  data: LessonWithRelations | null;
  lessonId: string;
  subjects: Subject[];
  tags: Tag[];
  notes: LessonNote[];
  attachments: Attachment[];
  flashcards: FlashcardWithRelations[];
  classes: ClassWithRelations[];
}

export const LessonsDetailView = ({
  data,
  subjects,
  tags: initialTags,
  notes,
  attachments,
  flashcards,
  classes,
}: LessonsDetailViewProps) => {
  const t = useTranslations("lessons.detail");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tags, setTags] = useState(initialTags);

  if (!data) {
    return (
      <div className="p-4">
        <EmptyState
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={{
            label: t("backToList"),
            onClick: () => router.push("/lessons/list"),
          }}
        />
      </div>
    );
  }

  const handleDuplicate = async () => {
    await duplicateLesson(data.id);
    router.push("/lessons/list");
  };

  const handleToggleArchive = async () => {
    await toggleArchiveLesson(data.id);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/lessons/list"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("backToList")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: data.subjectColor }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: data.subjectColor }}
            />
            {data.subjectName}
          </span>
          <h1 className="text-xl font-semibold text-foreground">
            {data.title}
          </h1>
          {data.isArchived && (
            <span className="text-xs text-muted-foreground">
              {t("archivedNote")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            {t("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDuplicate()}
          >
            <Copy />
            {t("duplicate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleToggleArchive()}
          >
            {data.isArchived ? <ArchiveRestore /> : <Archive />}
            {data.isArchived ? t("unarchive") : t("archive")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            {t("delete")}
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {format(parseISO(data.date), "MMM d, yyyy")}
          </span>
          {data.classId && (
            <Link
              href={`/classes/detail/${data.classId}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <CalendarClock className="size-4" />
              {t("linkedClass")}
            </Link>
          )}
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <BadgeIcon className="size-4 text-muted-foreground" />
            {data.tags.map((tagName) => (
              <Badge key={tagName} variant="outline">
                {tagName}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {t("statusTitle")}
        </h2>
        <LessonStatusControls
          lesson={data}
          onUpdated={() => router.refresh()}
        />
      </div>

      <Tabs defaultValue="notes" dir={isArabic ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="notes">
            {t("notesTab")} {notes.length > 0 && `(${notes.length})`}
          </TabsTrigger>
          <TabsTrigger value="attachments">
            {t("attachmentsTab")}{" "}
            {attachments.length > 0 && `(${attachments.length})`}
          </TabsTrigger>
          <TabsTrigger value="flashcards">
            {t("flashcardsTab")}{" "}
            {flashcards.length > 0 && `(${flashcards.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
          <NotesPanel lessonId={data.id} notes={notes} />
        </TabsContent>
        <TabsContent value="attachments">
          <AttachmentsPanel lessonId={data.id} attachments={attachments} />
        </TabsContent>
        <TabsContent value="flashcards">
          <FlashcardsPanel lessonId={data.id} flashcards={flashcards} />
        </TabsContent>
      </Tabs>

      <LessonFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lesson={data}
        subjects={subjects}
        tags={tags}
        classes={classes}
        onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
        onSaved={() => router.refresh()}
      />

      <DeleteLessonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        lesson={data}
        onDeleted={() => router.push("/lessons/list")}
      />
    </div>
  );
};
