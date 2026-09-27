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

const TICK_CACHE = new Map<number, Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }>>();

function getTicksForSize(size: number) {
  let cached = TICK_CACHE.get(size);
  if (!cached) {
    const stroke = 7;
    const radius = (size - stroke - 8) / 2;
    cached = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const tickR1 = radius + 5;
      const tickR2 = radius + (i % 3 === 0 ? 8 : 6);
      return {
        x1: size / 2 + tickR1 * Math.cos(rad),
        y1: size / 2 + tickR1 * Math.sin(rad),
        x2: size / 2 + tickR2 * Math.cos(rad),
        y2: size / 2 + tickR2 * Math.sin(rad),
        major: i % 3 === 0,
      };
    });
    TICK_CACHE.set(size, cached);
  }
  return cached;
}

export const Gauge = memo(function Gauge({
  value,
  max = 100,
  label,
  unit = "",
  color = "var(--brand-teal)",
  valueColor,
  size = 110,
  className,
}: GaugeProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const stroke = 7;
  const radius = (size - stroke - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const displayColor = valueColor ?? color;
  const ticks = getTicksForSize(size);

  return (
    <div className={cn("group flex flex-col items-center gap-2 select-none", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              strokeWidth={t.major ? 1.5 : 1}
              className={t.major ? "text-white/30" : "text-white/10"}
            />
          ))}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={stroke}
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
            className="transition-[stroke-dashoffset] duration-200 ease-out -rotate-90 origin-center"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-mono text-xl font-bold tabular-nums leading-none tracking-tight"
            style={{ color: displayColor }}
          >
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
          {unit && (
            <span className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wide text-foreground/80 group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
    </div>
  );
});

export function GaugeSkeleton({ label, size = 110 }: { label: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="animate-pulse rounded-full border border-white/5 bg-white/[0.03]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <span className="font-mono text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
