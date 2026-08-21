"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";

export interface TeacherClassCardProps extends React.ComponentProps<"div"> {
  item: TeacherClassWithStats;
  actions?: React.ReactNode;
}

export function TeacherClassCard({
  item,
  actions,
  className,
  ...props
}: TeacherClassCardProps) {
  const t = useTranslations("teaching.classes.card");

  return (
    <div className="relative h-full">
      <Card
        data-slot="teacher-class-card"
        className={cn(
          "h-full gap-3 transition-shadow",
          item.isArchived && "opacity-60",
          className,
        )}
        {...props}
      >
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/teaching/roster/${item.id}`}
                className="truncate text-sm font-medium text-foreground hover:underline"
              >
                {item.name}
              </Link>
              {item.isArchived && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {t("archived")}
                </Badge>
              )}
            </div>
            {item.subjectLabel && (
              <p className="truncate text-xs text-muted-foreground">
                {item.subjectLabel}
              </p>
            )}
          </div>
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
          {item.description && (
            <p className="line-clamp-2 text-foreground/80">
              {item.description}
            </p>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {t("studentCount", { count: item.studentCount })}
          </span>
        </CardContent>
      </Card>
      {actions && <div className="absolute inset-e-4 top-4">{actions}</div>}
    </div>
  );
}
