"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { createHomework, updateHomework } from "@/actions/homework.mutations";
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
import { createHomeworkSchema } from "@/lib/validations/homework";
import type {
  CreateHomeworkInput,
  HomeworkWithRelations,
} from "@/lib/types/homework";
import type { LessonWithRelations } from "@/lib/types/lesson";

export interface HomeworkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework?: HomeworkWithRelations | null;
  lessons: LessonWithRelations[];
  onSaved?: () => void;
}

function defaultValues(lessons: LessonWithRelations[]): CreateHomeworkInput {
  return {
    lessonId: lessons[0]?.id ?? "",
    title: "",
    deadline: new Date().toISOString().slice(0, 10),
  };
}

export function HomeworkFormDialog({
  open,
  onOpenChange,
  homework,
  lessons,
  onSaved,
}: HomeworkFormDialogProps) {
  const t = useTranslations("homework.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(homework);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createHomeworkSchema(t), [t]);

  const form = useForm<CreateHomeworkInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(lessons),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        homework
          ? {
              lessonId: homework.lessonId,
              title: homework.title,
              deadline: homework.deadline,
            }
          : defaultValues(lessons),
      );
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        isEdit && homework
          ? await updateHomework(homework.id, values)
          : await createHomework(values);
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
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("deadlineLabel")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                disabled={isPending || lessons.length === 0}
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
