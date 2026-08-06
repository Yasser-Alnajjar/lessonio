"use client";

/**
 * The one signature element for Study Line: a hand-drawn-feeling line
 * tracing an ascending path, with a pen nib marking the current point —
 * a literal read of the product name and its core idea (visible momentum
 * over time). Used sparingly: hero moments and the dashboard greeting,
 * never as generic decoration. The stroke draws in once on mount and
 * respects prefers-reduced-motion (handled globally via CSS).
 */
export function StudyLineMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M4 78C48 78 60 30 96 30C124 30 128 62 156 62C184 62 190 20 224 20C250 20 254 44 280 44"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 0,
          animation: "study-line-draw 1.4s ease-out",
        }}
      />
      <circle cx="280" cy="44" r="5" fill="var(--color-highlighter)" />
      <circle
        cx="280"
        cy="44"
        r="9"
        stroke="var(--color-highlighter)"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <style>
        {`@keyframes study-line-draw {
            from { stroke-dashoffset: 1; }
            to { stroke-dashoffset: 0; }
          }`}
      </style>
    </svg>
  );
}
