import { memo } from "react";
import { cn } from "@/lib/utils";
import { usageColor } from "@/lib/format";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  detail?: string;
  color?: string;
  detailColor?: string;
  className?: string;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  label,
  detail,
  color,
  detailColor,
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color ?? usageColor(pct);
  const textColor = detailColor ?? usageColor(pct);

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || detail) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {detail && (
            <span
              className="font-mono tabular-nums transition-colors duration-300"
              style={{ color: textColor }}
            >
              {detail}
            </span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
});
