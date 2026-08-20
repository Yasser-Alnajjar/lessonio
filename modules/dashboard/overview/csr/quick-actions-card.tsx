"use client";

import { BookOpenCheck, CalendarDays, ClipboardList, PlusCircle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";

export function QuickActionsCard() {
  const t = useTranslate("dashboard.quickActions");

  const actions = [
    { href: "/lessons/list", label: t("addLesson"), icon: PlusCircle },
    { href: "/study-sessions/focus", label: t("startSession"), icon: BookOpenCheck },
    { href: "/homework/list", label: t("logHomework"), icon: ClipboardList },
    { href: "/calendar/month", label: t("viewCalendar"), icon: CalendarDays },
  ] as const;

  return (
    <Card data-slot="quick-actions-card" className="gap-4">
      <CardHeader>
        <CardTitle className="text-base font-medium">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button key={action.href} asChild variant="outline" className="h-auto justify-start gap-2 py-3">
            <Link href={action.href}>
              <action.icon className="size-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
