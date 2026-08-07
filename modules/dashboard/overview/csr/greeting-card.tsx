"use client";

import { useLocale } from "next-intl";
import useTranslate from "@/hooks/useTranslate";

interface GreetingCardProps {
  name: string;
}

function greetingKey(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function GreetingCard({ name }: GreetingCardProps) {
  const t = useTranslate("dashboard.greeting");
  const locale = useLocale();
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-3xl leading-tight font-medium text-balance">
        {t(greetingKey(now.getHours()), { name })}
      </h1>
      <p className="text-muted-foreground text-sm">
        {dateLabel} · {t("subtitle")}
      </p>
    </div>
  );
}
