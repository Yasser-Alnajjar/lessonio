import { cn } from "@/lib/utils";

export interface RingProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Percentage complete. Values outside 0-100 are clamped for the arc but still shown in the label. */
  value: number;
  size?: "sm" | "default" | "lg";
  label?: React.ReactNode;
  showValue?: boolean;
  strokeWidth?: number;
}

const SIZE_PX: Record<NonNullable<RingProps["size"]>, number> = {
  sm: 40,
  default: 56,
  lg: 88,
};

export function Ring({
  value,
  size = "default",
  label,
  showValue = true,
  strokeWidth = 6,
  className,
  ...props
}: RingProps) {
  const dimension = SIZE_PX[size];
  const radius = dimension / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const isOverflow = value > 100;
  const isUnderflow = value < 0;

  return (
    <div
      data-slot="ring"
      data-overflow={isOverflow || undefined}
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="-rotate-90"
        role="img"
        aria-label={typeof label === "string" ? label : `${Math.round(value)}%`}
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-primary/15"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "stroke-primary transition-[stroke-dashoffset] duration-500",
            isOverflow && "stroke-highlighter",
            isUnderflow && "stroke-muted-foreground",
          )}
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0 text-center">
          {showValue && (
            <span
              className={cn(
                "font-medium text-foreground tabular-nums",
                size === "sm" ? "text-[0.65rem]" : size === "lg" ? "text-lg" : "text-sm",
              )}
            >
              {Math.round(value)}%
            </span>
          )}
          {label && size !== "sm" && (
            <span className="text-[0.6rem] text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}
