"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import {
  logManualSession,
  updateStudySession,
} from "@/actions/study-sessions.mutations";
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
import { logStudySessionSchema } from "@/lib/validations/study-session";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { StudySessionWithRelations } from "@/lib/types/study-session";
import type { Subject } from "@/lib/types/subject";

const NO_SUBJECT = "";

interface LogSessionFormValues {
  subjectId?: string;
  lessonId?: string;
  startedAt: string;
  durationMinutes: number;
}

export interface LogSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  lessons: LessonWithRelations[];
  session?: StudySessionWithRelations | null;
  onSaved?: () => void;
}

function defaultValues(): LogSessionFormValues {
  const now = new Date();

  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return {
    subjectId: NO_SUBJECT,
    lessonId: NO_SUBJECT,
    startedAt: now.toISOString().slice(0, 16),
    durationMinutes: 30,
  };
}

function sessionValues(
  session: StudySessionWithRelations,
): LogSessionFormValues {
  const startedAt = new Date(session.startedAt);

  startedAt.setMinutes(startedAt.getMinutes() - startedAt.getTimezoneOffset());

  return {
    subjectId: session.subjectId ?? NO_SUBJECT,
    lessonId: session.lessonId ?? NO_SUBJECT,
    startedAt: startedAt.toISOString().slice(0, 16),
    durationMinutes: session.durationMinutes ?? 30,
  };
}

export function LogSessionDialog({
  open,
  onOpenChange,
  subjects,
  lessons,
  session,
  onSaved,
}: LogSessionDialogProps) {
  const t = useTranslations("studySessions.log");
  const locale = useLocale();
  const isArabic = locale === "ar";

  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = Boolean(session);

  const schema = useMemo(() => logStudySessionSchema(t), [t]);

  const form = useForm<LogSessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setFormError(null);

      form.reset(session ? sessionValues(session) : defaultValues());
    }
  }

  const subjectId = useWatch({
    control: form.control,
    name: "subjectId",
  });

  const lessonOptions =
    !subjectId || subjectId === NO_SUBJECT
      ? lessons
      : lessons.filter((lesson) => lesson.subjectId === subjectId);

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const payload = {
        subjectId: values.subjectId || undefined,
        lessonId: values.lessonId || undefined,
        startedAt: new Date(values.startedAt).toISOString(),
        durationMinutes: values.durationMinutes,
      };

      const result = session
        ? await updateStudySession(session.id, payload)
        : await logManualSession(payload);

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
            {isEditMode ? t("editTitle") : t("title")}
          </DialogTitle>

          <DialogDescription className="w-fit">
            {isEditMode ? t("editDescription") : t("description")}
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
                    value={field.value || NO_SUBJECT}
                    onValueChange={(value) => {
                      field.onChange(value);

                      form.setValue("lessonId", NO_SUBJECT);
                    }}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("subjectPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value={NO_SUBJECT}>
                        {t("noSubject")}
                      </SelectItem>

                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: subject.color,
                            }}
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
              name="lessonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lessonLabel")}</FormLabel>

                  <Select
                    value={field.value || NO_SUBJECT}
                    onValueChange={field.onChange}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("lessonPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value={NO_SUBJECT}>
                        {t("noLesson")}
                      </SelectItem>

                      {lessonOptions.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.title}
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
              name="startedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("startedAtLabel")}</FormLabel>

                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                      step={1}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber)
                      }
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className="gap-2"
              >
                {isPending && <LessonioSpinner className="size-4" />}

                {isPending
                  ? t("submitting")
                  : isEditMode
                    ? t("save")
                    : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
