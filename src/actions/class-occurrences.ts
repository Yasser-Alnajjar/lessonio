import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type {
  ClassOccurrenceFilters,
  ClassOccurrenceWithRelations,
} from "@/lib/types/class-occurrence";
import { updateClassOccurrenceStatus } from "./class-occurrences.mutations";

/** How many of tomorrow's occurrences the agenda surfaces. */
const UPCOMING_LIMIT = 12;

export interface ClassAgenda {
  today: ClassOccurrenceWithRelations[];
  upcoming: ClassOccurrenceWithRelations[];
}

/**
 * SSR-facing surface for `Actions.ClassOccurrences.*` — the dated instances
 * of a recurring `Actions.Classes` entry, and the only place attendance and
 * exam state lives.
 *
 * Occurrences are derived, never hand-created. Laravel's
 * `ClassOccurrenceMaterializer` (API_CONTRACT.md OCCUR-005) materializes
 * them lazily inside `ClassOccurrenceService`'s read methods themselves, so
 * — unlike the old Supabase implementation — there is no more client-side
 * `ensureClassOccurrencesForUser()` call to make before each read here.
 */
export const classOccurrencesActions = {
  async getAll(
    filters?: ClassOccurrenceFilters,
  ): Promise<ActionResult<ClassOccurrenceWithRelations[]>> {
    try {
      const { data } = await axios.get<{
        data: ClassOccurrenceWithRelations[];
      }>("/api/v1/class-occurrences", {
        params: {
          classId: filters?.classId,
          subjectId: filters?.subjectId,
          attendanceStatus: filters?.attendanceStatus,
          examStatus: filters?.examStatus,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
        },
      });
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  async getById(
    id: string,
  ): Promise<ActionResult<ClassOccurrenceWithRelations>> {
    try {
      const { data } = await axios.get<{
        data: ClassOccurrenceWithRelations | null;
      }>(`/api/v1/class-occurrences/${id}`);
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  /**
   * Today's occurrences plus tomorrow's, in chronological order — what the
   * Classes page and the dashboard both show.
   *
   * NOTE (flagged for review): the old Supabase implementation deliberately
   * defined "upcoming" as *exactly tomorrow* — two separate queries, each
   * scoped to one date, so a day packed with classes could never crowd the
   * other bucket out. Laravel's `GET class-occurrences/agenda` (OCCUR-003,
   * `ClassOccurrenceService::agendaForCurrentUser()`) instead defines
   * "upcoming" as *any date strictly after today*, ordered by date then
   * start time and cut off at `upcomingLimit` — so on a day with few or no
   * tomorrow classes, `upcoming` can now spill into the day after tomorrow
   * and beyond. This is a real behavior change from the old frontend logic,
   * not a translation artifact — worth confirming this is the intended
   * definition before shipping.
   */
  async getAgenda(
    upcomingLimit: number = UPCOMING_LIMIT,
  ): Promise<ActionResult<ClassAgenda>> {
    try {
      const { data } = await axios.get<{ data: ClassAgenda }>(
        "/api/v1/class-occurrences/agenda",
        { params: { upcomingLimit } },
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  updateStatus: updateClassOccurrenceStatus,
};
