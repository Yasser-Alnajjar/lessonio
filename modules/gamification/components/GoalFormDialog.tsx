"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { setCurrentGoal, updateGoal } from "@/actions/gamification.mutations";
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
import { createGoalSchema } from "@/lib/validations/goal";
import type { CreateGoalInput, Goal, GoalPeriod } from "@/lib/types/goal";

export interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  /** Which period to preselect when creating (ignored when editing — the period is fixed then). */
  defaultPeriod?: GoalPeriod;
  onSaved?: () => void;
}

const DEFAULT_TARGET_MINUTES = 300;

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  defaultPeriod = "weekly",
  onSaved,
}: GoalFormDialogProps) {
  const t = useTranslations("gamification.goals.form");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isEdit = Boolean(goal);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createGoalSchema(t), [t]);

  const form = useForm<CreateGoalInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      period: defaultPeriod,
      targetMinutes: DEFAULT_TARGET_MINUTES,
    },
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset(
        goal
          ? { period: goal.period, targetMinutes: goal.targetMinutes }
          : { period: defaultPeriod, targetMinutes: DEFAULT_TARGET_MINUTES },
      );
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        isEdit && goal
          ? await updateGoal(goal.id, { targetMinutes: values.targetMinutes })
          : await setCurrentGoal(values);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("periodLabel")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as GoalPeriod)
                    }
                    disabled={isEdit}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">{t("weekly")}</SelectItem>
                      <SelectItem value="monthly">{t("monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("targetMinutesLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder={t("targetMinutesPlaceholder")}
                      autoFocus
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
