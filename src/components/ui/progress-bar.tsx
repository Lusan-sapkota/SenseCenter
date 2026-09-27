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
    <div className={cn("space-y-1.5 select-none", className)}>
      {(label || detail) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-mono text-[11px] font-medium tracking-wide text-foreground/90">{label}</span>}
          {detail && (
            <span
              className="font-mono text-[11px] font-bold tabular-nums transition-colors duration-300"
              style={{ color: textColor }}
            >
              {detail}
            </span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/[0.06] bg-black/40 p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  );
});
