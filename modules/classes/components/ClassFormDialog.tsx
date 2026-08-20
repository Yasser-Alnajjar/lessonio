"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LABEL_KEYS, WEEKDAYS } from "@/lib/constants/classes";
import { createClassSchema } from "@/lib/validations/class";
import type {
  ClassWithSubject,
  CreateClassInput,
  CreateClassMeetingInput,
} from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";

export interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ClassWithSubject | null;
  subjects: Subject[];
  onSaved?: () => void;
}

function defaultMeeting(): CreateClassMeetingInput {
  return { dayOfWeek: WEEKDAYS[0], startTime: "16:00", durationMinutes: 60 };
}

/**
 * A class recurs weekly for as long as it exists, so there is no start or end
 * date to collect here — `isActive` is what pauses it.
 */
function defaultValues(subjects: Subject[]): CreateClassInput {
  return {
    subjectId: subjects[0]?.id ?? "",
    teacher: "",
    location: "",
    meetings: [defaultMeeting()],
    isActive: true,
  };
}

export function ClassFormDialog({
  open,
  onOpenChange,
  item,
  subjects,
  onSaved,
}: ClassFormDialogProps) {
  const t = useTranslations("classes.form");
  const tDays = useTranslations("classes.days");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(item);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createClassSchema(t), [t]);

  const form = useForm<CreateClassInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(subjects),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "meetings",
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        item
          ? {
              subjectId: item.subjectId,
              teacher: item.teacher ?? "",
              location: item.location ?? "",
              meetings: item.meetings.map((meeting) => ({
                dayOfWeek: meeting.dayOfWeek,
                startTime: meeting.startTime,
                durationMinutes: meeting.durationMinutes,
              })),
              isActive: item.isActive,
            }
          : defaultValues(subjects),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: (values: CreateClassInput) =>
      isEdit && item ? updateClass(item.id, values) : createClass(values),
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

  const meetingsError =
    form.formState.errors.meetings?.root?.message ??
    form.formState.errors.meetings?.message;

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
              <Label>{t("meetingsLabel")}</Label>

              {fields.map((entryField, index) => (
                <div
                  key={entryField.id}
                  className="flex flex-col gap-3 rounded-md border border-input p-3 sm:flex-row sm:items-start"
                >
                  <FormField
                    control={form.control}
                    name={`meetings.${index}.dayOfWeek`}
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
                    name={`meetings.${index}.startTime`}
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
                    name={`meetings.${index}.durationMinutes`}
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

              {meetingsError && (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {meetingsError}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => append(defaultMeeting())}
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
