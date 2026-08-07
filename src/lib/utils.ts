import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Guards against open-redirect vectors when honoring a `?next=` query param
 * (e.g. after login). Only same-origin, root-relative paths are allowed.
 */
export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}
