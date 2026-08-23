import { memo, useMemo } from "react";
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

export const TemperatureChart = memo(function TemperatureChart({
  history,
}: TemperatureChartProps) {
  const labels = useMemo(
    () => [...new Set(history.map((p) => p.label).filter(Boolean))],
    [history],
  );

  const chartData = useMemo(() => buildChartData(history), [history]);

  if (chartData.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Collecting samples…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          {labels.map((label, i) => (
            <linearGradient
              key={label}
              id={`temp-grad-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={`var(--chart-${(i % 5) + 1})`}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={`var(--chart-${(i % 5) + 1})`}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          unit="°"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {labels.map((label, i) => (
          <Area
            key={label}
            type="monotone"
            dataKey={label}
            stroke={`var(--chart-${(i % 5) + 1})`}
            fill={`url(#temp-grad-${i})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});
