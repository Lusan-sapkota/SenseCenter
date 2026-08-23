import { memo } from "react";
import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color?: string;
  valueColor?: string;
  size?: number;
  className?: string;
}

export const Gauge = memo(function Gauge({
  value,
  max = 100,
  label,
  unit = "",
  color = "var(--brand-teal)",
  valueColor,
  size = 120,
  className,
}: GaugeProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const displayColor = valueColor ?? color;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-4 -z-10 rounded-full opacity-15 blur-xl transition-colors duration-300"
          style={{ background: displayColor }}
        />
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
            opacity={0.4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-2xl font-semibold tabular-nums leading-none transition-colors duration-300"
            style={{ color: displayColor }}
          >
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
          {unit && (
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
});

export function GaugeSkeleton({ label, size = 120 }: { label: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="animate-pulse rounded-full bg-muted/50"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
