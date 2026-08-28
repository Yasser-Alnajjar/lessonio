"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import { submitAssignment } from "@/actions/submissions.mutations";
import { Badge } from "@/components/ui/badge";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { createSubmitAssignmentSchema } from "@/lib/validations/submission";
import type {
  MySubmission,
  SubmitAssignmentInput,
} from "@/lib/types/submission";

export interface SubmissionPanelProps {
  assignmentId: string;
  totalPoints: number;
  submission: MySubmission | null;
}

export function SubmissionPanel({
  assignmentId,
  totalPoints,
  submission,
}: SubmissionPanelProps) {
  const t = useTranslations("classroom.assignment.submission");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createSubmitAssignmentSchema(t), [t]);

  const form = useForm<SubmitAssignmentInput>({
    resolver: zodResolver(schema),
    defaultValues: { content: submission?.content ?? "" },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await submitAssignment(assignmentId, values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  });

  if (submission?.status === "graded") {
    return (
      <Card className="gap-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("yourSubmission")}</CardTitle>
          <Badge>
            {t("gradedScore", { score: submission.score ?? 0, totalPoints })}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm whitespace-pre-wrap text-foreground/90">
            {submission.content}
          </p>
          {submission.feedback && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("feedbackLabel")}
              </p>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {submission.feedback}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t("yourSubmission")}</CardTitle>
        {submission && (
          <span className="text-xs text-muted-foreground">
            {t("submittedAt", {
              date: format(
                parseISO(submission.submittedAt),
                "MMM d, yyyy · h:mm a",
              ),
            })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={t("contentPlaceholder")}
                      rows={6}
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

            <div>
              <Button type="submit" disabled={isPending}>
                {isPending && <LessonioSpinner />}
                {isPending
                  ? t("submitting")
                  : submission
                    ? t("resubmit")
                    : t("submit")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
