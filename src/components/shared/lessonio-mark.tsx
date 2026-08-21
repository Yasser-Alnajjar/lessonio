"use client";

export function LessonioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      {/* Left page */}
      <path
        d="M18 25C28 20 38 22 46 29V70C37 63 27 61 18 66V25Z"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 0,
          animation: "lessonio-draw 1s ease-out",
        }}
      />

      {/* Right page */}
      <path
        d="M78 25C68 20 58 22 50 29V70C59 63 69 61 78 66V25Z"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 0,
          animation: "lessonio-draw 1s ease-out 0.15s both",
        }}
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
    </svg>
  );
}
