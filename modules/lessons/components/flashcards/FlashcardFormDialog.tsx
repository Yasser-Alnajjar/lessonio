"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import {
  createFlashcard,
  updateFlashcard,
} from "@/actions/flashcards.mutations";
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
import { Textarea } from "@/components/ui/textarea";
import { createFlashcardSchema } from "@/lib/validations/flashcard";
import type {
  CreateFlashcardInput,
  FlashcardWithRelations,
} from "@/lib/types/flashcard";

export interface FlashcardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  flashcard?: FlashcardWithRelations | null;
  onSaved?: () => void;
}

function defaultValues(lessonId: string): CreateFlashcardInput {
  return { lessonId, front: "", back: "" };
}

export function FlashcardFormDialog({
  open,
  onOpenChange,
  lessonId,
  flashcard,
  onSaved,
}: FlashcardFormDialogProps) {
  const t = useTranslations("flashcards.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(flashcard);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createFlashcardSchema(t), [t]);

  const form = useForm<CreateFlashcardInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(lessonId),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        flashcard
          ? { lessonId, front: flashcard.front, back: flashcard.back }
          : defaultValues(lessonId),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateFlashcardInput) =>
      isEdit && flashcard
        ? updateFlashcard(flashcard.id, {
            front: values.front,
            back: values.back,
          })
        : createFlashcard(values),
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
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("frontLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t("frontPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("backLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t("backPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending && <LessonioSpinner className="size-4" />}
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
