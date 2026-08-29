/**
 * Standard envelope returned by every function in `src/actions/*`.
 * SSR components destructure `{ data }` and must fall back to a safe
 * default when `data` is null — never let a `null` reach a CSR component
 * that isn't expecting it.
 */
export interface ActionResult<T> {
  data: T | null;
  error: string | null;
}

/** Standard envelope for mutations that don't return a row. */
export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFields {
  createdAt: string;
  updatedAt: string;
}

export type UUID = string;

/** Generic JSON value — used for loosely-typed jsonb-shaped API fields. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
