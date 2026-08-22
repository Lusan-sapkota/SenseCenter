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
import { Activity, Cpu, Fan, Gauge, HardDrive, MemoryStick, Network, Thermometer, Zap } from "lucide-react";
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

function formatBytes(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  if (gib < 1) return `${(bytes / (1024 * 1024)).toFixed(0)} MiB`;
  return `${gib.toFixed(1)} GiB`;
}

function formatKib(kib: number): string {
  if (kib < 1024) return `${kib.toFixed(0)} KiB`;
  if (kib < 1024 * 1024) return `${(kib / 1024).toFixed(1)} MiB`;
  return `${(kib / (1024 * 1024)).toFixed(1)} GiB`;
}

function formatUptime(secs: number): string {
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

  const memory = snapshot?.memory ?? null;
  const memUsedPct = memory
    ? Math.round(((memory.total_kib - memory.available_kib) / memory.total_kib) * 100)
    : null;
  const swapUsedKib = memory ? memory.swap_total_kib - memory.swap_free_kib : null;
  const swapUsedPct =
    memory && memory.swap_total_kib > 0
      ? Math.round((swapUsedKib! / memory.swap_total_kib) * 100)
      : null;

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
        <Stat
          icon={Cpu}
          label="CPU usage / freq"
          value={
            snapshot?.cpu.usage_pct != null
              ? `${snapshot.cpu.usage_pct.toFixed(0)}%${
                  snapshot.cpu.freq_mhz != null ? ` · ${(snapshot.cpu.freq_mhz / 1000).toFixed(2)} GHz` : ""
                }`
              : "—"
          }
        />
        <Stat
          icon={MemoryStick}
          label="RAM"
          value={memUsedPct != null ? `${memUsedPct}% used` : "—"}
        />
        <Stat
          icon={MemoryStick}
          label="Swap"
          value={
            swapUsedPct != null
              ? `${swapUsedPct}% · ${formatKib(swapUsedKib ?? 0)}`
              : memory?.swap_total_kib === 0
                ? "no swap"
                : "—"
          }
        />
        <Stat
          icon={Activity}
          label="Uptime"
          value={snapshot?.uptime_secs != null ? formatUptime(snapshot.uptime_secs) : "—"}
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

      {snapshot?.gpu && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="size-4" />
              <CardTitle>GPU</CardTitle>
            </div>
            <CardDescription>
              Fan speed isn&apos;t exposed by NVIDIA&apos;s driver for laptop GPUs — see the CPU/GPU
              fan RPMs below instead, read straight from the EC.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Power draw</p>
                <p className="tabular-nums">
                  {snapshot.gpu.power_w != null ? `${snapshot.gpu.power_w.toFixed(1)} W` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Power limit</p>
                <p className="tabular-nums">
                  {snapshot.gpu.power_limit_w != null
                    ? `${snapshot.gpu.power_limit_w.toFixed(0)} W`
                    : "—"}
                  {snapshot.gpu.power_limit_min_w != null && snapshot.gpu.power_limit_max_w != null && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({snapshot.gpu.power_limit_min_w.toFixed(0)}–
                      {snapshot.gpu.power_limit_max_w.toFixed(0)} W range)
                    </span>
                  )}
                </p>
                {snapshot.gpu.power_limit_default_w != null && (
                  <p className="text-xs text-muted-foreground">
                    Factory default {snapshot.gpu.power_limit_default_w.toFixed(0)} W
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Graphics clock</p>
                <p className="tabular-nums">
                  {snapshot.gpu.clock_graphics_mhz != null
                    ? `${snapshot.gpu.clock_graphics_mhz} MHz`
                    : "—"}
                  {snapshot.gpu.clock_graphics_max_mhz != null && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {snapshot.gpu.clock_graphics_max_mhz} max
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Memory clock</p>
                <p className="tabular-nums">
                  {snapshot.gpu.clock_memory_mhz != null ? `${snapshot.gpu.clock_memory_mhz} MHz` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MemoryStick className="size-4" />
              <CardTitle>Memory</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {memory ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">RAM used</span>
                  <span className="tabular-nums">
                    {formatKib(memory.total_kib - memory.available_kib)} / {formatKib(memory.total_kib)}
                  </span>
                </div>
                {memory.swap_devices.length > 0 ? (
                  <div className="space-y-1 border-t border-border/60 pt-2">
                    {memory.swap_devices.map((dev) => (
                      <div key={dev.name} className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {dev.name.replace("/dev/", "")} <span className="text-xs">({dev.kind}, prio {dev.priority})</span>
                        </span>
                        <span className="tabular-nums">
                          {formatKib(dev.used_kib)} / {formatKib(dev.size_kib)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Swap used</span>
                    <span className="tabular-nums">
                      {formatKib(swapUsedKib ?? 0)} / {formatKib(memory.swap_total_kib)}
                    </span>
                  </div>
                )}
                {snapshot?.cpu.governor && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CPU governor</span>
                    <span className="tabular-nums">{snapshot.cpu.governor}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No memory data reported.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="size-4" />
              <CardTitle>Disk</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot && snapshot.disk_space.length > 0 && (
              <div className="divide-y divide-border/60 border-b border-border/60 pb-1">
                {snapshot.disk_space.map((d) => {
                  const pct = Math.round((d.used_bytes / d.total_bytes) * 100);
                  return (
                    <div key={d.mount} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium">{d.mount}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatBytes(d.used_bytes)} / {formatBytes(d.total_bytes)} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {snapshot && snapshot.disks.length > 0 ? (
              <div className="divide-y divide-border/60">
                {snapshot.disks.map((disk) => (
                  <div
                    key={disk.device}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{disk.device}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ↓ {formatRate(disk.read_bytes_per_sec)} · ↑ {formatRate(disk.write_bytes_per_sec)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Collecting samples…</p>
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
