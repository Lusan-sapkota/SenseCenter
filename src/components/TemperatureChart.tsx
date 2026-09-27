import { memo, useMemo, useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TelemetryPoint } from "@/types";

interface TemperatureChartProps {
  history: TelemetryPoint[];
}

function buildChartData(history: TelemetryPoint[]) {
  const byTime = new Map<number, Record<string, number | string>>();
  for (const point of history) {
    let row = byTime.get(point.time);
    if (!row) {
      row = { time: point.time };
      byTime.set(point.time, row);
    }
    row[point.label] = point.temp;
  }
  return Array.from(byTime.values());
}

const CHART_COLORS = [
  "#00E5BE",
  "#8065FF",
  "#38BDF8",
  "#F59E0B",
  "#F43F5E",
];

export const TemperatureChart = memo(function TemperatureChart({
  history,
}: TemperatureChartProps) {
  const labelsRef = useRef<string[]>([]);
  const labels = useMemo(() => {
    const current = labelsRef.current;
    const found = new Set<string>();
    for (const p of history) {
      if (p.label) found.add(p.label);
    }
    if (found.size === current.length && current.every((l) => found.has(l))) {
      return current;
    }
    const next = Array.from(found);
    labelsRef.current = next;
    return next;
  }, [history]);

  const chartData = useMemo(() => buildChartData(history), [history]);

  if (chartData.length < 2) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground/60 tracking-wider uppercase">
        Collecting telemetry samples…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {labels.map((label, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <linearGradient
                key={label}
                id={`temp-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="90%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono Variable" }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
        />
        <YAxis
          unit="°C"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono Variable" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          isAnimationActive={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-xl border border-white/10 bg-[#0C101A] p-3 shadow-2xl">
                <p className="border-b border-white/10 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Timestamp: {label}
                </p>
                <div className="mt-2 space-y-1">
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}:</span>
                      </div>
                      <span className="font-bold text-white">{Number(entry.value).toFixed(1)}°C</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontFamily: "JetBrains Mono Variable" }}
        />
        {labels.map((label, i) => (
          <Area
            key={label}
            type="linear"
            dataKey={label}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#temp-grad-${i})`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});
