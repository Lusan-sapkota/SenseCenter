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
  teal: "from-brand-teal/10 via-[#0F1420] to-[#0A0D15] border-brand-teal/30",
  violet: "from-brand-violet/10 via-[#0F1420] to-[#0A0D15] border-brand-violet/30",
  neutral: "from-white/[0.03] via-[#0E121C] to-[#090C14] border-white/[0.08]",
};

const iconStyles = {
  teal: "text-brand-teal bg-brand-teal/15 border-brand-teal/30",
  violet: "text-brand-violet bg-brand-violet/15 border-brand-violet/30",
  neutral: "text-muted-foreground bg-white/[0.04] border-white/[0.08]",
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
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors duration-150 hover:border-white/20",
        accentStyles[accent],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p
            className="mt-1.5 truncate font-mono text-2xl font-bold tabular-nums tracking-tight transition-colors duration-200"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </p>
          {sub && (
            <p
              className="mt-1 truncate font-mono text-xs text-muted-foreground transition-colors duration-300"
              style={valueColor ? { color: valueColor, opacity: 0.8 } : undefined}
            >
              {sub}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl border ring-1 ring-white/5 shadow-inner",
            valueColor ? "bg-white/[0.04] border-white/10" : iconStyles[accent],
          )}
          style={valueColor ? { color: valueColor } : undefined}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
});
