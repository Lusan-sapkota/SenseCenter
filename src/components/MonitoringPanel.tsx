import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Fan, Thermometer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TelemetrySnapshot } from "@/types";

interface MonitoringPanelProps {
  snapshot: TelemetrySnapshot | null;
  history: Array<Record<string, number | string>>;
  error: string | null;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function MonitoringPanel({ snapshot, history, error }: MonitoringPanelProps) {
  const labels = [
    ...new Set(history.map((point) => String(point.label)).filter(Boolean)),
  ];

  const chartData = history.reduce<Array<Record<string, number | string>>>(
    (acc, point) => {
      const tick = point.time;
      let row = acc.find((r) => r.time === tick);
      if (!row) {
        row = { time: tick as number };
        acc.push(row);
      }
      row[String(point.label)] = point.temp as number;
      return acc;
    },
    [],
  );

  const primaryTemp = snapshot?.hwmon.find((r) => r.temp_c != null);
  const primaryFan = snapshot?.hwmon.find((r) => r.fan_rpm != null);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Thermometer}
          label="CPU temp"
          value={
            primaryTemp?.temp_c != null ? `${primaryTemp.temp_c.toFixed(1)}°C` : "—"
          }
        />
        <Stat
          icon={Thermometer}
          label="GPU temp"
          value={
            snapshot?.gpu?.temp_c != null ? `${snapshot.gpu.temp_c}°C` : "—"
          }
        />
        <Stat
          icon={Fan}
          label="Fan RPM"
          value={
            primaryFan?.fan_rpm != null ? `${primaryFan.fan_rpm}` : "—"
          }
        />
        <Stat
          icon={Activity}
          label="GPU util"
          value={
            snapshot?.gpu?.utilization_pct != null
              ? `${snapshot.gpu.utilization_pct}%`
              : "—"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temperature history</CardTitle>
          <CardDescription>Polling every 2 seconds from hwmon and NVML.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Collecting samples…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis
                  unit="°C"
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                {labels.map((label, i) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={`var(--chart-${(i % 5) + 1})`}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {snapshot && snapshot.hwmon.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>hwmon sensors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {snapshot.hwmon.map((reading) => (
                <div
                  key={reading.label}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{reading.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {reading.temp_c != null && `${reading.temp_c.toFixed(1)}°C`}
                    {reading.temp_c != null && reading.fan_rpm != null && " · "}
                    {reading.fan_rpm != null && `${reading.fan_rpm} RPM`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
