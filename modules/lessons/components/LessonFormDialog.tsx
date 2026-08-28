"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { createLesson, updateLesson } from "@/actions/lessons.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLessonSchema } from "@/lib/validations/lesson";
import type {
  CreateLessonInput,
  LessonWithRelations,
} from "@/lib/types/lesson";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";
import type { Subject } from "@/lib/types/subject";
import type { Tag } from "@/lib/types/tag";
import { TagPicker } from "./TagPicker";

/** Select value standing in for `classOccurrenceId: undefined` — "no linked class". */
const CLASS_UNSET_VALUE = "unset";

export interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: LessonWithRelations | null;
  subjects: Subject[];
  tags: Tag[];
  classes: ClassOccurrenceWithRelations[];
  onTagCreated?: (tag: Tag) => void;
  onSaved?: () => void;
}

function defaultValues(subjects: Subject[]): CreateLessonInput {
  return {
    subjectId: subjects[0]?.id ?? "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    tagIds: [],
  };
}

function classLabel(occurrence: ClassOccurrenceWithRelations): string {
  return `${occurrence.subjectName} · ${format(parseISO(occurrence.date), "MMM d, yyyy")} ${occurrence.startTime.slice(0, 5)}`;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  subjects,
  tags,
  classes,
  onTagCreated,
  onSaved,
}: LessonFormDialogProps) {
  const t = useTranslations("lessons.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(lesson);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createLessonSchema(t), [t]);

  const form = useForm<CreateLessonInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(subjects),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        lesson
          ? {
              subjectId: lesson.subjectId,
              classOccurrenceId: lesson.classOccurrenceId ?? undefined,
              title: lesson.title,
              date: lesson.date,
              tagIds: lesson.tagIds,
            }
          : defaultValues(subjects),
      );
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        isEdit && lesson
          ? await updateLesson(lesson.id, values)
          : await createLesson(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      onOpenChange(false);
      onSaved?.();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="w-fit">
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription className="w-fit">
            {isEdit ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subjectLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("subjectPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("titleLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("titlePlaceholder")}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dateLabel")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {classes.length > 0 && (
              <FormField
                control={form.control}
                name="classOccurrenceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("classLabel")}</FormLabel>
                    <Select
                      value={field.value ?? CLASS_UNSET_VALUE}
                      onValueChange={(value) =>
                        field.onChange(
                          value === CLASS_UNSET_VALUE ? undefined : value,
                        )
                      }
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("classPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={CLASS_UNSET_VALUE}>
                          {t("classNone")}
                        </SelectItem>
                        {classes.map((_class) => (
                          <SelectItem key={_class.id} value={_class.id}>
                            {classLabel(_class)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tagsLabel")}</FormLabel>
                  <FormControl>
                    <TagPicker
                      tags={tags}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onTagCreated={onTagCreated}
                      triggerLabel={t("tagsTrigger")}
                      newTagPlaceholder={t("newTagPlaceholder")}
                      emptyLabel={t("noTags")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending || subjects.length === 0}
              >
                {isPending && <LessonioSpinner />}
                {isPending
                  ? t("submitting")
                  : isEdit
                    ? t("submitEdit")
                    : t("submitCreate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
