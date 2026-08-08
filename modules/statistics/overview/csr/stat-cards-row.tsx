"use client";

import { Award, BookOpen, CalendarCheck, ClipboardCheck, Clock, Flame } from "lucide-react";

import { StatisticCard } from "@/components/ui-system/statistic-card";
import type { StatCard } from "@/lib/types/statistics";

const ICONS_BY_KEY: Record<string, React.ReactNode> = {
  studyTimeThisMonth: <Clock className="size-4" />,
  attendanceRate: <CalendarCheck className="size-4" />,
  homeworkCompletion: <ClipboardCheck className="size-4" />,
  avgExamScore: <Award className="size-4" />,
  currentStreak: <Flame className="size-4" />,
  lessonsCompleted: <BookOpen className="size-4" />,
};

interface StatCardsRowProps {
  cards: StatCard[];
}

export function StatCardsRow({ cards }: StatCardsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((stat) => (
        <StatisticCard key={stat.key} stat={stat} icon={ICONS_BY_KEY[stat.key]} />
      ))}
    </div>
  );
}
