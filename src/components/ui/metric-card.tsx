import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  accent?: "teal" | "violet" | "neutral";
  className?: string;
}

const accentStyles = {
  teal: "from-brand-teal/15 to-brand-teal/5 border-brand-teal/20",
  violet: "from-brand-violet/15 to-brand-violet/5 border-brand-violet/20",
  neutral: "from-foreground/5 to-transparent border-border/60",
};

const iconStyles = {
  teal: "text-brand-teal",
  violet: "text-brand-violet",
  neutral: "text-muted-foreground",
};

export const MetricCard = memo(function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
  accent = "neutral",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm",
        accentStyles[accent],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p
            className="mt-1.5 truncate font-mono text-2xl font-semibold tabular-nums tracking-tight transition-colors duration-300"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </p>
          {sub && (
            <p
              className="mt-0.5 truncate text-xs text-muted-foreground transition-colors duration-300"
              style={valueColor ? { color: valueColor, opacity: 0.75 } : undefined}
            >
              {sub}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/40",
            valueColor ? "" : iconStyles[accent],
          )}
          style={valueColor ? { color: valueColor } : undefined}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
});
