"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";

import { joinClass } from "@/actions/enrollments.mutations";
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
import { createJoinClassSchema } from "@/lib/validations/enrollment";
import type { JoinClassInput } from "@/lib/types/enrollment";

export interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: () => void;
}

export function JoinClassDialog({
  open,
  onOpenChange,
  onJoined,
}: JoinClassDialogProps) {
  const t = useTranslations("classroom.classes.join");
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createJoinClassSchema(t), [t]);

  const form = useForm<JoinClassInput>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFormError(null);
      form.reset({ code: "" });
    }
  }

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await joinClass(values.code);
      if (!result.data) {
        setFormError(
          result.error === "invalid_join_code"
            ? t("errors.codeNotFound")
            : result.error,
        );
        return;
      }
      onOpenChange(false);
      onJoined?.();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="w-fit">{t("title")}</DialogTitle>
          <DialogDescription className="w-fit">
            {t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("codeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("codePlaceholder")}
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest uppercase"
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
                {isPending ? <LessonioSpinner /> : <UserPlus />}
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
