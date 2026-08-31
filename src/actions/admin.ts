import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type {
  AdminAssignmentRow,
  AdminClassRow,
  AdminOverview,
  AdminUserDetail,
  AdminUserRow,
  NotificationJobRow,
  NotificationJobStats,
} from "@/lib/types/admin";
import type { ActionResult, PaginatedResult } from "@/lib/types/common";
import type { NotificationPolicyEntry } from "@/lib/types/notification-policy";
import {
  changeUserRole,
  setClassArchived,
  unpublishAssignment,
  updateNotificationPolicy,
} from "./admin.mutations";

/** Never `null` on failure — list pages render an empty table, not an error page. */
function emptyPage<T>(): PaginatedResult<T> {
  return {
    data: [],
    meta: { page: 1, perPage: 25, total: 0, lastPage: 1, hasMore: false },
  };
}

export interface AdminListParams {
  page?: number;
  perPage?: number;
  [key: string]: string | number | boolean | undefined;
}

function toQueryParams(params: AdminListParams = {}): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query[key] = String(value);
    }
  }
  return query;
}

export const adminActions = {
  async getNotificationSettings(): Promise<
    ActionResult<NotificationPolicyEntry[]>
  > {
    try {
      const { data } = await axios.get<{ data: NotificationPolicyEntry[] }>(
        "/api/v1/admin/notification-settings",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  async getOverview(): Promise<ActionResult<AdminOverview>> {
    try {
      const { data } = await axios.get<{ data: AdminOverview }>(
        "/api/v1/admin/overview",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  async getUsers(
    params?: AdminListParams,
  ): Promise<PaginatedResult<AdminUserRow>> {
    try {
      const { data } = await axios.get<PaginatedResult<AdminUserRow>>(
        "/api/v1/admin/users",
        { params: toQueryParams(params) },
      );
      return data;
    } catch {
      return emptyPage();
    }
  },

  /**
   * Keyed on `userId` alone — `generateMetadata` and `AdminUserDetail` both
   * need the same user within one request-render. `cache()` is per-request
   * scoped, not a global store, so no session/token state may be closed
   * over here.
   */
  getUserById: cache(
    async (userId: string): Promise<ActionResult<AdminUserDetail>> => {
      try {
        const { data } = await axios.get<{ data: AdminUserDetail }>(
          `/api/v1/admin/users/${userId}`,
        );
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  async getClasses(
    params?: AdminListParams,
  ): Promise<PaginatedResult<AdminClassRow>> {
    try {
      const { data } = await axios.get<PaginatedResult<AdminClassRow>>(
        "/api/v1/admin/teacher-classes",
        { params: toQueryParams(params) },
      );
      return data;
    } catch {
      return emptyPage();
    }
  },

  async getAssignments(
    params?: AdminListParams,
  ): Promise<PaginatedResult<AdminAssignmentRow>> {
    try {
      const { data } = await axios.get<PaginatedResult<AdminAssignmentRow>>(
        "/api/v1/admin/assignments",
        { params: toQueryParams(params) },
      );
      return data;
    } catch {
      return emptyPage();
    }
  },

  async getNotificationJobs(
    params?: AdminListParams,
  ): Promise<PaginatedResult<NotificationJobRow>> {
    try {
      const { data } = await axios.get<PaginatedResult<NotificationJobRow>>(
        "/api/v1/admin/notification-jobs",
        { params: toQueryParams(params) },
      );
      return data;
    } catch {
      return emptyPage();
    }
  },

  async getNotificationJobStats(): Promise<ActionResult<NotificationJobStats>> {
    try {
      const { data } = await axios.get<{ data: NotificationJobStats }>(
        "/api/v1/admin/notification-jobs/stats",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  updateNotificationPolicy,
  changeUserRole,
  setClassArchived,
  unpublishAssignment,
};
