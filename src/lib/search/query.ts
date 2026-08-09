import type { createClient } from "@/lib/supabase/server";
import type { SearchResultItem } from "@/lib/types/search";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LESSONS_LIST_PATH = "/lessons/list";

/**
 * Shared core query, imported by both `search.ts` ("server-only", used by
 * the SSR results page) and `search.mutations.ts` ("use server", used by
 * the client-side command palette) — one implementation, no drift. Mirrors
 * `mapNotificationRow` in `src/lib/notifications/map.ts` living outside
 * either directive for the same reason.
 *
 * `subjects`/`tags` have no tsvector column (small flat tables — plain
 * `ilike` is enough); `lessons`/`lesson_notes` have generated weighted
 * `search_vector` columns with GIN indexes, so those use real Postgres
 * full-text search via `.textSearch(..., { type: "websearch" })`.
 */
export async function runSearchQuery(
  supabase: SupabaseServerClient,
  userId: string,
  query: string,
  limit = 8,
): Promise<SearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const likePattern = `%${trimmed}%`;

  const [
    { data: subjectRows },
    { data: lessonRows },
    { data: noteRows },
    { data: teacherRows },
    { data: tagRows },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", likePattern)
      .limit(limit),
    supabase
      .from("lessons")
      .select("id, title, teacher, location")
      .eq("user_id", userId)
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .limit(limit),
    supabase
      .from("lesson_notes")
      .select("id, title, lesson_id")
      .eq("user_id", userId)
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .limit(limit),
    supabase
      .from("lessons")
      .select("teacher")
      .eq("user_id", userId)
      .not("teacher", "is", null)
      .ilike("teacher", likePattern)
      .limit(limit * 3),
    supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", likePattern)
      .limit(limit),
  ]);

  const notes = noteRows ?? [];
  const lessonIdsForNotes = [...new Set(notes.map((row) => row.lesson_id))];
  const { data: noteLessonRows } =
    lessonIdsForNotes.length > 0
      ? await supabase.from("lessons").select("id, title").in("id", lessonIdsForNotes)
      : { data: [] as Array<{ id: string; title: string }> };
  const lessonTitleById = new Map((noteLessonRows ?? []).map((row) => [row.id, row.title]));

  const teacherNames = [...new Set((teacherRows ?? []).map((row) => row.teacher).filter(Boolean))]
    .slice(0, limit) as string[];

  const results: SearchResultItem[] = [
    ...(subjectRows ?? []).map((row) => ({
      id: row.id,
      kind: "subject" as const,
      title: row.name,
      subtitle: null,
      path: `/subjects/detail/${row.id}`,
    })),
    ...(lessonRows ?? []).map((row) => ({
      id: row.id,
      kind: "lesson" as const,
      title: row.title,
      subtitle: row.teacher ?? row.location,
      path: `/lessons/detail/${row.id}`,
    })),
    ...notes.map((row) => ({
      id: row.id,
      kind: "note" as const,
      title: row.title,
      subtitle: lessonTitleById.get(row.lesson_id) ?? null,
      path: `/lessons/detail/${row.lesson_id}`,
    })),
    ...teacherNames.map((teacher) => ({
      id: teacher,
      kind: "teacher" as const,
      title: teacher,
      subtitle: null,
      path: LESSONS_LIST_PATH,
    })),
    ...(tagRows ?? []).map((row) => ({
      id: row.id,
      kind: "tag" as const,
      title: row.name,
      subtitle: null,
      path: LESSONS_LIST_PATH,
    })),
  ];

  return results;
}
