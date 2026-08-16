"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  createClassSchedule,
  updateClassSchedule,
} from "@/actions/class-schedules.mutations";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LABEL_KEYS, WEEKDAYS } from "@/lib/constants/class-schedules";
import { createClassScheduleSchema } from "@/lib/validations/class-schedule";
import type {
  ClassScheduleWithSubject,
  CreateClassScheduleEntryInput,
  CreateClassScheduleInput,
} from "@/lib/types/class-schedule";
import type { Subject } from "@/lib/types/subject";

export interface ClassScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSchedule?: ClassScheduleWithSubject | null;
  subjects: Subject[];
  onSaved?: () => void;
}

function defaultScheduleEntry(): CreateClassScheduleEntryInput {
  return { dayOfWeek: WEEKDAYS[0], startTime: "16:00", durationMinutes: 60 };
}

function defaultValues(subjects: Subject[]): CreateClassScheduleInput {
  return {
    subjectId: subjects[0]?.id ?? "",
    teacher: "",
    location: "",
    schedules: [defaultScheduleEntry()],
    startsOn: new Date().toISOString().slice(0, 10),
    endsOn: "",
    isActive: true,
  };
}

export function ClassScheduleFormDialog({
  open,
  onOpenChange,
  classSchedule,
  subjects,
  onSaved,
}: ClassScheduleFormDialogProps) {
  const t = useTranslations("classSchedules.form");
  const tDays = useTranslations("classSchedules.days");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(classSchedule);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createClassScheduleSchema(t), [t]);

  const form = useForm<CreateClassScheduleInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(subjects),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedules",
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        classSchedule
          ? {
              subjectId: classSchedule.subjectId,
              teacher: classSchedule.teacher ?? "",
              location: classSchedule.location ?? "",
              schedules: classSchedule.schedules.map((entry) => ({
                dayOfWeek: entry.dayOfWeek,
                startTime: entry.startTime,
                durationMinutes: entry.durationMinutes,
              })),
              startsOn: classSchedule.startsOn,
              endsOn: classSchedule.endsOn ?? "",
              isActive: classSchedule.isActive,
            }
          : defaultValues(subjects),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateClassScheduleInput) =>
      isEdit && classSchedule
        ? updateClassSchedule(classSchedule.id, values)
        : createClassSchedule(values),
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

  const schedulesError =
    form.formState.errors.schedules?.root?.message ??
    form.formState.errors.schedules?.message;

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

            <div className="flex flex-col gap-3">
              <Label>{t("scheduleLabel")}</Label>

              {fields.map((entryField, index) => (
                <div
                  key={entryField.id}
                  className="flex flex-col gap-3 rounded-md border border-input p-3 sm:flex-row sm:items-start"
                >
                  <FormField
                    control={form.control}
                    name={`schedules.${index}.dayOfWeek`}
                    render={({ field }) => (
                      <FormItem className="sm:flex-1">
                        <FormLabel className="text-xs font-normal text-muted-foreground">
                          {t("dayLabel")}
                        </FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          dir={isArabic ? "rtl" : "ltr"}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                {tDays(WEEKDAY_LABEL_KEYS[day])}
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
                    name={`schedules.${index}.startTime`}
                    render={({ field }) => (
                      <FormItem className="sm:flex-1">
                        <FormLabel className="text-xs font-normal text-muted-foreground">
                          {t("startTimeLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`schedules.${index}.durationMinutes`}
                    render={({ field }) => (
                      <FormItem className="sm:flex-1">
                        <FormLabel className="text-xs font-normal text-muted-foreground">
                          {t("durationLabel")}
                        </FormLabel>
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

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("removeDay")}
                    disabled={fields.length === 1}
                    className="mt-1 shrink-0 self-end sm:self-start"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              {schedulesError && (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {schedulesError}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => append(defaultScheduleEntry())}
              >
                <Plus />
                {t("addDay")}
              </Button>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("startsOnLabel")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("endsOnLabel")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-input px-3 py-2">
                  <FormLabel className="cursor-pointer">
                    {t("activeLabel")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
