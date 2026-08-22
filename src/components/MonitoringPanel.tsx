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
import { Activity, Fan, Network, Thermometer, Zap } from "lucide-react";
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

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
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

  const packageTemp = snapshot?.temps.find((r) => /package/i.test(r.label));
  const vramPct =
    snapshot?.gpu?.memory_used_mib != null && snapshot.gpu.memory_total_mib
      ? Math.round((snapshot.gpu.memory_used_mib / snapshot.gpu.memory_total_mib) * 100)
      : null;
  const totalPowerW = snapshot?.power.reduce((sum, r) => sum + r.value, 0) ?? null;

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
          value={packageTemp ? `${packageTemp.value.toFixed(1)}°C` : "—"}
        />
        <Stat
          icon={Thermometer}
          label="GPU temp"
          value={snapshot?.gpu?.temp_c != null ? `${snapshot.gpu.temp_c}°C` : "—"}
        />
        <Stat
          icon={Activity}
          label="GPU util / VRAM"
          value={
            snapshot?.gpu?.utilization_pct != null
              ? `${snapshot.gpu.utilization_pct}%${vramPct != null ? ` · ${vramPct}% VRAM` : ""}`
              : "—"
          }
        />
        <Stat
          icon={Zap}
          label="Total power"
          value={totalPowerW ? `${totalPowerW.toFixed(1)} W` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temperature history</CardTitle>
          <CardDescription>Package / composite sensors, polled every 2 seconds.</CardDescription>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fan className="size-4" />
              <CardTitle>Fans</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {snapshot && snapshot.fans.length > 0 ? (
              <div className="divide-y divide-border/60">
                {snapshot.fans.map((fan) => (
                  <div
                    key={`${fan.chip}-${fan.label}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{fan.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {fan.value.toFixed(0)} RPM
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No fan sensors reported.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="size-4" />
              <CardTitle>Power</CardTitle>
            </div>
            <CardDescription>CPU package power needs root — see DESIGN.md.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot && snapshot.power.length > 0 ? (
              <div className="divide-y divide-border/60">
                {snapshot.power.map((p) => (
                  <div
                    key={`${p.chip}-${p.label}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {p.value.toFixed(1)} W
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No power sensors reported.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="size-4" />
            <CardTitle>Network</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {snapshot && snapshot.network.length > 0 ? (
            <div className="divide-y divide-border/60">
              {snapshot.network.map((net) => (
                <div
                  key={net.interface}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{net.interface}</span>
                  <span className="tabular-nums text-muted-foreground">
                    ↓ {formatRate(net.rx_bytes_per_sec)} · ↑ {formatRate(net.tx_bytes_per_sec)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Collecting samples…</p>
          )}
        </CardContent>
      </Card>

      {snapshot && snapshot.temps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All sensors</CardTitle>
            <CardDescription>Full hwmon readout — matches what KDE System Monitor reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {snapshot.temps.map((t) => (
                <div
                  key={`${t.chip}-${t.label}`}
                  className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t.chip} · {t.label}
                  </span>
                  <span className="tabular-nums">{t.value.toFixed(1)}°C</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
