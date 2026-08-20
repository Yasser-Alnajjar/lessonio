"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createLesson, updateLesson } from "@/actions/lessons.mutations";
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
import type { ClassWithRelations } from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";
import type { Tag } from "@/lib/types/tag";
import { TagPicker } from "./TagPicker";

/** Select value standing in for `classId: undefined` — "no linked class". */
const CLASS_UNSET_VALUE = "unset";

export interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: LessonWithRelations | null;
  subjects: Subject[];
  tags: Tag[];
  classes: ClassWithRelations[];
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

function classLabel(klass: ClassWithRelations): string {
  return `${klass.subjectName} · ${format(parseISO(klass.date), "MMM d, yyyy")} ${klass.startTime.slice(0, 5)}`;
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
              classId: lesson.classId ?? undefined,
              title: lesson.title,
              date: lesson.date,
              tagIds: lesson.tagIds,
            }
          : defaultValues(subjects),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateLessonInput) =>
      isEdit && lesson ? updateLesson(lesson.id, values) : createLesson(values),
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      onOpenChange(false);
      onSaved?.();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
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
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("classLabel")}</FormLabel>
                    <Select
                      value={field.value ?? CLASS_UNSET_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === CLASS_UNSET_VALUE ? undefined : value)
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
                        {classes.map((klass) => (
                          <SelectItem key={klass.id} value={klass.id}>
                            {classLabel(klass)}
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
                disabled={mutation.isPending || subjects.length === 0}
              >
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {mutation.isPending
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
