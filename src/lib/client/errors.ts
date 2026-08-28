import { isAxiosError } from "axios";

interface LaravelErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Laravel's error envelope (API_CONTRACT.md §4.1):
 * `{"message": "...", "errors": {"field": ["..."]}}`, `errors` present only
 * on 422. The first field error reads better as a single-line form banner
 * than the generic top-level "The given data was invalid." message.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!isAxiosError(error)) return fallback;

  // No `response` means the request never got an HTTP reply at all — the
  // backend is down, unreachable, or timed out (as opposed to a 4xx/5xx it
  // did answer with). The fallback message is identical either way for the
  // user, but that distinction is exactly what's needed to debug it, so log
  // it server-side rather than swallowing it silently.
  if (!error.response) {
    console.error(
      `API request failed with no response: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      error.message,
    );
    return fallback;
  }

  const data = error.response.data as LaravelErrorBody | undefined;
  const firstFieldError = data?.errors
    ? Object.values(data.errors)[0]?.[0]
    : undefined;

  return firstFieldError ?? data?.message ?? fallback;
}
