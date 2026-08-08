"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createExam, updateExam } from "@/actions/exams.mutations";
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
import { createExamSchema } from "@/lib/validations/exam";
import type { CreateExamInput, ExamWithRelations } from "@/lib/types/exam";
import type { LessonWithRelations } from "@/lib/types/lesson";

export interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: ExamWithRelations | null;
  lessons: LessonWithRelations[];
  onSaved?: () => void;
}

function defaultValues(lessons: LessonWithRelations[]): CreateExamInput {
  return {
    lessonId: lessons[0]?.id ?? "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    totalScore: 100,
    score: undefined,
  };
}

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  lessons,
  onSaved,
}: ExamFormDialogProps) {
  const t = useTranslations("exams.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(exam);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createExamSchema(t), [t]);

  const form = useForm<CreateExamInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(lessons),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        exam
          ? {
              lessonId: exam.lessonId,
              title: exam.title,
              date: exam.date,
              totalScore: exam.totalScore,
              score: exam.score ?? undefined,
            }
          : defaultValues(lessons),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateExamInput) =>
      isEdit && exam ? updateExam(exam.id, values) : createExam(values),
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
          <DialogTitle className="w-fit">{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription className="w-fit">
            {isEdit ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="lessonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lessonLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("lessonPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: lesson.subjectColor }}
                          />
                          {lesson.subjectName} — {lesson.title}
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-1">
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
                name="totalScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("totalScoreLabel")}</FormLabel>
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
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("scoreLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={t("scorePlaceholder")}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : event.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending || lessons.length === 0}>
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
