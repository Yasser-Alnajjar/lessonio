"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createSubject, updateSubject } from "@/actions/subjects.mutations";
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
  SUBJECT_COLOR_OPTIONS,
  SUBJECT_ICON_COMPONENTS,
  SUBJECT_ICON_OPTIONS,
} from "@/lib/constants/subjects";
import { cn } from "@/lib/utils";
import { createSubjectSchema } from "@/lib/validations/subject";
import type { CreateSubjectInput, Subject } from "@/lib/types/subject";

export interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
  onSaved?: () => void;
}

const DEFAULT_VALUES: CreateSubjectInput = {
  name: "",
  color: SUBJECT_COLOR_OPTIONS[0]!,
  icon: SUBJECT_ICON_OPTIONS[0]!,
};

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  onSaved,
}: SubjectFormDialogProps) {
  const t = useTranslations("subjects.form");
  const isEdit = Boolean(subject);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createSubjectSchema(t), [t]);

  const form = useForm<CreateSubjectInput>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset the form when the dialog transitions to open, rather than in a
  // useEffect — this is React's documented pattern for adjusting state in
  // response to a prop change without an extra render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        subject
          ? { name: subject.name, color: subject.color, icon: subject.icon }
          : DEFAULT_VALUES,
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateSubjectInput) =>
      isEdit && subject ? updateSubject(subject.id, values) : createSubject(values),
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
      <DialogContent>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("colorLabel")}</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          aria-pressed={field.value === color}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "size-8 rounded-full outline-offset-2 transition-transform hover:scale-105",
                            field.value === color && "outline-2 outline-foreground",
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("iconLabel")}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-5 gap-2">
                      {SUBJECT_ICON_OPTIONS.map((icon) => {
                        const Icon = SUBJECT_ICON_COMPONENTS[icon];
                        const selected = field.value === icon;
                        return (
                          <button
                            key={icon}
                            type="button"
                            aria-label={icon}
                            aria-pressed={selected}
                            onClick={() => field.onChange(icon)}
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                              selected && "border-primary bg-primary/10 text-primary",
                            )}
                          >
                            <Icon className="size-5" />
                          </button>
                        );
                      })}
                    </div>
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
              <Button type="submit" disabled={mutation.isPending}>
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
