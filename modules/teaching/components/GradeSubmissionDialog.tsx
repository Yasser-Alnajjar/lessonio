"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { gradeSubmission } from "@/actions/submissions.mutations";
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
import { Textarea } from "@/components/ui/textarea";
import { createGradeSubmissionSchema } from "@/lib/validations/submission";
import type { GradeSubmissionInput } from "@/lib/types/submission";
import type { SubmissionQueueEntry } from "@/lib/types/submission";

export interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SubmissionQueueEntry | null;
  totalPoints: number;
  onGraded?: () => void;
}

function defaultValues(
  entry: SubmissionQueueEntry | null,
): GradeSubmissionInput {
  return {
    score: entry?.submission?.score ?? 0,
    feedback: entry?.submission?.feedback ?? "",
  };
}

export function GradeSubmissionDialog({
  open,
  onOpenChange,
  entry,
  totalPoints,
  onGraded,
}: GradeSubmissionDialogProps) {
  const t = useTranslations("teaching.grading.dialog");
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () => createGradeSubmissionSchema(t, totalPoints),
    [t, totalPoints],
  );

  const form = useForm<GradeSubmissionInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(entry),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(defaultValues(entry));
    }
  }

  const mutation = useMutation({
    mutationFn: (values: GradeSubmissionInput) => {
      if (!entry?.submission) {
        throw new Error(t("noSubmission"));
      }
      return gradeSubmission(entry.submission.id, values);
    },
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      onOpenChange(false);
      onGraded?.();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

  if (!entry?.submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="w-fit">{t("title")}</DialogTitle>
          <DialogDescription className="w-fit">
            {entry.fullName ?? t("unnamedStudent")}
          </DialogDescription>
        </DialogHeader>

        <p className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground/90">
          {entry.submission.content}
        </p>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("scoreLabel", { totalPoints })}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={totalPoints}
                      step="0.5"
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

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedbackLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("feedbackPlaceholder")}
                      rows={4}
                      {...field}
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <LessonioSpinner />}
                {mutation.isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
