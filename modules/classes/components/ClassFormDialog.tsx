"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createClass, updateClass } from "@/actions/classes.mutations";
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
import { createClassSchema } from "@/lib/validations/class";
import type { ClassWithRelations, CreateClassInput } from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";

export interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klass?: ClassWithRelations | null;
  subjects: Subject[];
  onSaved?: () => void;
}

function defaultValues(subjects: Subject[]): CreateClassInput {
  return {
    subjectId: subjects[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    durationMinutes: 60,
    teacher: "",
    location: "",
  };
}

export function ClassFormDialog({
  open,
  onOpenChange,
  klass,
  subjects,
  onSaved,
}: ClassFormDialogProps) {
  const t = useTranslations("classes.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(klass);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createClassSchema(t), [t]);

  const form = useForm<CreateClassInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(subjects),
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        klass
          ? {
              subjectId: klass.subjectId,
              date: klass.date,
              startTime: klass.startTime.slice(0, 5),
              durationMinutes: klass.durationMinutes,
              teacher: klass.teacher ?? "",
              location: klass.location ?? "",
            }
          : defaultValues(subjects),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateClassInput) =>
      isEdit && klass ? updateClass(klass.id, values) : createClass(values),
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
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subjectLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
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
                name="startTime"
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
                      <Input
                        placeholder={t("locationPlaceholder")}
                        {...field}
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
                disabled={mutation.isPending || subjects.length === 0}
              >
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
