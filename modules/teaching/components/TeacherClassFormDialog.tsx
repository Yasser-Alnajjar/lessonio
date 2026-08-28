"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import {
  createTeacherClass,
  updateTeacherClass,
} from "@/actions/teacher-classes.mutations";
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
import { createTeacherClassSchema } from "@/lib/validations/teacher-class";
import type {
  CreateTeacherClassInput,
  TeacherClassWithStats,
} from "@/lib/types/teacher-class";

export interface TeacherClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: TeacherClassWithStats | null;
  onSaved?: () => void;
}

function defaultValues(): CreateTeacherClassInput {
  return { name: "", subjectLabel: "", description: "" };
}

export function TeacherClassFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: TeacherClassFormDialogProps) {
  const t = useTranslations("teaching.classes.form");
  const isEdit = Boolean(item);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createTeacherClassSchema(t), [t]);

  const form = useForm<CreateTeacherClassInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        item
          ? {
              name: item.name,
              subjectLabel: item.subjectLabel ?? "",
              description: item.description ?? "",
            }
          : defaultValues(),
      );
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        isEdit && item
          ? await updateTeacherClass(item.id, values)
          : await createTeacherClass(values);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="w-fit">
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription className="w-fit">
            {isEdit ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subjectLabelLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("subjectLabelPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
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
              <Button type="submit" disabled={isPending}>
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
