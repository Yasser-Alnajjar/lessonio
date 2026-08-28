"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";

import {
  createAssignment,
  updateAssignment,
} from "@/actions/assignments.mutations";
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
import { Textarea } from "@/components/ui/textarea";
import { createAssignmentSchema } from "@/lib/validations/assignment";
import type {
  AssignmentWithStats,
  CreateAssignmentInput,
} from "@/lib/types/assignment";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";

export interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AssignmentWithStats | null;
  classes: TeacherClassWithStats[];
  onSaved?: () => void;
}

function defaultValues(
  classes: TeacherClassWithStats[],
): CreateAssignmentInput {
  return {
    teacherClassId: classes[0]?.id ?? "",
    title: "",
    instructions: "",
    dueAt: "",
    totalPoints: 100,
  };
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  item,
  classes,
  onSaved,
}: AssignmentFormDialogProps) {
  const t = useTranslations("teaching.assignments.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(item);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createAssignmentSchema(t), [t]);

  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(classes),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        item
          ? {
              teacherClassId: item.teacherClassId,
              title: item.title,
              instructions: item.instructions ?? "",
              dueAt: format(parseISO(item.dueAt), "yyyy-MM-dd'T'HH:mm"),
              totalPoints: item.totalPoints,
            }
          : defaultValues(classes),
      );
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        isEdit && item
          ? await updateAssignment(item.id, {
              title: values.title,
              instructions: values.instructions,
              dueAt: values.dueAt,
              totalPoints: values.totalPoints,
            })
          : await createAssignment(values);
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
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="teacherClassId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("classLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("classPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((_class) => (
                        <SelectItem key={_class.id} value={_class.id}>
                          {_class.name}
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
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("instructionsLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("instructionsPlaceholder")}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dueAtLabel")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("totalPointsLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
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
            </div>

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
                disabled={isPending || classes.length === 0}
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
