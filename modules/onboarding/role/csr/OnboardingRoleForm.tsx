"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { setMyRole } from "@/actions/onboarding.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { RolePickerCards } from "@/components/shared/role-picker-cards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import type { AppRole } from "@/lib/types/user";

/**
 * The OAuth path: `signInWithOAuth` has no form, so `profiles.role` lands
 * null and the middleware sends the user here once. Defaults to "student"
 * so a student finishes onboarding in a single click, matching the register
 * form's default.
 */
export const OnboardingRoleForm = () => {
  const t = useTranslations("onboarding.role");
  const router = useRouter();
  const [role, setRole] = useState<AppRole>("student");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => setMyRole(role),
    onSuccess: (result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/home");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RolePickerCards
          value={role}
          onChange={setRole}
          labels={{
            student: { label: t("roleStudent"), hint: t("roleStudentHint") },
            teacher: { label: t("roleTeacher"), hint: t("roleTeacherHint") },
          }}
        />

        {error && (
          <p role="alert" className="text-destructive text-sm font-medium">
            {error}
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-2"
        >
          {mutation.isPending ? <LessonioSpinner /> : <ArrowRight />}
          {mutation.isPending ? t("submitting") : t("submit")}
        </Button>
      </CardContent>
    </Card>
  );
};
