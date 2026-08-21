"use client";

export function LessonioMark({
  className,
  loading = false,
}: {
  className?: string;
  /** Swaps the one-time draw-in intro for a continuous pulse, for use as a loading indicator. */
  loading?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
      style={
        loading
          ? { animation: "lessonio-pulse 1.1s ease-in-out infinite" }
          : undefined
      }
    >
      {/* Left page */}
      <path
        d="M18 25C28 20 38 22 46 29V70C37 63 27 61 18 66V25Z"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        pathLength={1}
        style={
          loading
            ? undefined
            : {
                strokeDasharray: 1,
                strokeDashoffset: 0,
                animation: "lessonio-draw 1s ease-out",
              }
        }
      />

      {/* Right page */}
      <path
        d="M78 25C68 20 58 22 50 29V70C59 63 69 61 78 66V25Z"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        pathLength={1}
        style={
          loading
            ? undefined
            : {
                strokeDasharray: 1,
                strokeDashoffset: 0,
                animation: "lessonio-draw 1s ease-out 0.15s both",
              }
        }
      />

      {/* Center spine */}
      <path
        d="M48 29V70"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Lesson highlight */}
      <circle cx="68" cy="39" r="5" fill="var(--color-highlighter)" />

      <circle
        cx="68"
        cy="39"
        r="9"
        stroke="var(--color-highlighter)"
        strokeWidth="1.5"
        opacity="0.35"
      />

      {!loading && (
        <style>
          {`
            @keyframes lessonio-draw {
              from {
                stroke-dashoffset: 1;
              }
              to {
                stroke-dashoffset: 0;
              }
            }
          `}
        </style>
      )}
    </svg>
  );
}

/** Drop-in loading indicator built from the Lessonio mark, for use anywhere a spinner icon (e.g. Loader2) was used. */
export function LessonioSpinner({
  className,
  loading = true,
}: {
  className?: string;
  loading?: boolean;
}) {
  return <LessonioMark loading={loading} className={className} />;
}
