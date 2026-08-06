/**
 * Temporary Suspense fallback for Phase 2.
 * Replaced by the real Loading Skeleton components in Phase 6 (Reusable UI System).
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div
        className="border-muted-foreground/30 border-t-foreground h-8 w-8 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
