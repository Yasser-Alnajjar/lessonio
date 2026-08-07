import {
  BookOpen,
  Calculator,
  Code,
  Dumbbell,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Music,
  Palette,
  type LucideIcon,
} from "lucide-react";

import type { SubjectIcon } from "@/lib/types/subject";

/** Single source of truth for icon key -> component, shared by SubjectCard and the icon picker. */
export const SUBJECT_ICON_COMPONENTS: Record<SubjectIcon, LucideIcon> = {
  "book-open": BookOpen,
  calculator: Calculator,
  "flask-conical": FlaskConical,
  globe: Globe,
  landmark: Landmark,
  palette: Palette,
  code: Code,
  music: Music,
  dumbbell: Dumbbell,
  languages: Languages,
};

/** Matches the `icon in (...)` check constraint on public.subjects. */
export const SUBJECT_ICON_OPTIONS = Object.keys(
  SUBJECT_ICON_COMPONENTS,
) as SubjectIcon[];

/** Curated palette kept in sync with the `color ~ '^#[0-9A-Fa-f]{6}$'` check constraint. */
export const SUBJECT_COLOR_OPTIONS: string[] = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#84CC16", // lime
  "#22C55E", // green
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#64748B", // slate
];
