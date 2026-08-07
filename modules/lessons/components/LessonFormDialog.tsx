"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
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
import type { CreateLessonInput, LessonWithRelations } from "@/lib/types/lesson";
import type { Subject } from "@/lib/types/subject";
import type { Tag } from "@/lib/types/tag";
import { TagPicker } from "./TagPicker";

export interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: LessonWithRelations | null;
  subjects: Subject[];
  tags: Tag[];
  onTagCreated?: (tag: Tag) => void;
  onSaved?: () => void;
}

function defaultValues(subjects: Subject[]): CreateLessonInput {
  return {
    subjectId: subjects[0]?.id ?? "",
    title: "",
    teacher: "",
    location: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    durationMinutes: 60,
    tagIds: [],
  };
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  subjects,
  tags,
  onTagCreated,
  onSaved,
}: LessonFormDialogProps) {
  const t = useTranslations("lessons.form");
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
              title: lesson.title,
              teacher: lesson.teacher ?? "",
              location: lesson.location ?? "",
              date: lesson.date,
              time: lesson.time,
              durationMinutes: lesson.durationMinutes,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
                    <Input placeholder={t("titlePlaceholder")} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teacher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("teacherLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("teacherPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("locationLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("locationPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timeLabel")}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("durationLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending || subjects.length === 0}>
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
