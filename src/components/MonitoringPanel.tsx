import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ChevronDown,
  Fan,
  Gauge,
  HardDrive,
  MemoryStick,
  Network,
  Thermometer,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Gauge as GaugeRing, GaugeSkeleton } from "@/components/ui/gauge";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PanelCard, SectionHeader } from "@/components/layout/AppShell";
import { TemperatureChart } from "@/components/TemperatureChart";
import type { TelemetryPoint, TelemetrySnapshot } from "@/types";
import {
  fanColor,
  formatBytes,
  formatKib,
  formatRate,
  formatUptime,
  loadColor,
  powerColor,
  tempColor,
  usageColor,
} from "@/lib/format";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const POLL_INTERVAL_OPTIONS = [
  { value: "1000", label: "1s" },
  { value: "2000", label: "2s" },
  { value: "5000", label: "5s" },
  { value: "10000", label: "10s" },
  { value: "30000", label: "30s" },
];

function GaugeLink({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Jump to ${label}`}
      className="cursor-pointer rounded-2xl transition-transform duration-200 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function StatBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-xl font-semibold tabular-nums transition-colors duration-300"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface MonitoringPanelProps {
  snapshot: TelemetrySnapshot | null;
  history: TelemetryPoint[];
  error: string | null;
  pollMs: number;
  onPollMsChange: (pollMs: number) => void;
}

export function MonitoringPanel({
  snapshot,
  history,
  error,
  pollMs,
  onPollMsChange,
}: MonitoringPanelProps) {
  const [sensorsOpen, setSensorsOpen] = useState(false);

  const jumpToSensors = useCallback(() => {
    setSensorsOpen(true);
    requestAnimationFrame(() => scrollToSection("sensors-section"));
  }, []);
  const jumpToGpuDetails = useCallback(() => scrollToSection("gpu-details-section"), []);
  const jumpToMemory = useCallback(() => scrollToSection("memory-section"), []);
  const jumpToChart = useCallback(() => scrollToSection("chart-section"), []);

  const packageTemp = snapshot?.temps.find((r) => /package/i.test(r.label));
  const cpuTemp = packageTemp?.value ?? null;
  const gpuTemp = snapshot?.gpu?.temp_c ?? null;
  const cpuLoad = snapshot?.cpu.usage_pct ?? null;

  const vramPct = useMemo(() => {
    if (snapshot?.gpu?.memory_used_mib == null || !snapshot.gpu.memory_total_mib) return null;
    return Math.round((snapshot.gpu.memory_used_mib / snapshot.gpu.memory_total_mib) * 100);
  }, [snapshot?.gpu?.memory_used_mib, snapshot?.gpu?.memory_total_mib]);

  const totalPowerW = useMemo(
    () => snapshot?.power.reduce((sum, r) => sum + r.value, 0) ?? null,
    [snapshot?.power],
  );

  const memory = snapshot?.memory ?? null;
  const memUsedKib = memory ? memory.total_kib - memory.available_kib : 0;
  const memUsedPct = memory ? Math.round((memUsedKib / memory.total_kib) * 100) : null;
  const swapUsedKib = memory ? memory.swap_total_kib - memory.swap_free_kib : null;
  const swapUsedPct =
    memory && memory.swap_total_kib > 0
      ? Math.round((swapUsedKib! / memory.swap_total_kib) * 100)
      : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live Dashboard"
        description={`Real-time hardware telemetry  polled every ${pollMs / 1000}s`}
        icon={Activity}
        action={
          <Select value={String(pollMs)} onValueChange={(v) => v && onPollMsChange(Number(v))}>
            <SelectTrigger size="sm" aria-label="Polling interval">
              <SelectValue>
                {(v: string) =>
                  `Every ${POLL_INTERVAL_OPTIONS.find((o) => o.value === v)?.label ?? `${Number(v) / 1000}s`}`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {POLL_INTERVAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className="glass-panel flex flex-wrap items-center justify-around gap-4 p-5"
        aria-busy={snapshot == null}
      >
        {snapshot == null ? (
          <>
            <GaugeSkeleton label="CPU Temp" size={96} />
            <GaugeSkeleton label="GPU Temp" size={96} />
            <GaugeSkeleton label="RAM" size={96} />
            <GaugeSkeleton label="CPU Usage" size={96} />
          </>
        ) : (
          <>
            <GaugeLink onClick={jumpToSensors} label="all temperature sensors">
              <GaugeRing
                value={cpuTemp ?? 0}
                max={100}
                label="CPU Temp"
                unit="°C"
                size={96}
                color={cpuTemp != null ? tempColor(cpuTemp) : "var(--brand-teal)"}
                valueColor={cpuTemp != null ? tempColor(cpuTemp) : undefined}
              />
            </GaugeLink>
            <GaugeLink onClick={jumpToGpuDetails} label="GPU details">
              <GaugeRing
                value={gpuTemp ?? 0}
                max={100}
                label="GPU Temp"
                unit="°C"
                size={96}
                color={gpuTemp != null ? tempColor(gpuTemp) : "var(--brand-violet)"}
                valueColor={gpuTemp != null ? tempColor(gpuTemp) : undefined}
              />
            </GaugeLink>
            <GaugeLink onClick={jumpToMemory} label="memory details">
              <GaugeRing
                value={memUsedPct ?? 0}
                max={100}
                label="RAM"
                unit="%"
                size={96}
                color={memUsedPct != null ? usageColor(memUsedPct) : "var(--brand-teal)"}
                valueColor={memUsedPct != null ? usageColor(memUsedPct) : undefined}
              />
            </GaugeLink>
            <GaugeLink onClick={jumpToChart} label="temperature history">
              <GaugeRing
                value={cpuLoad ?? 0}
                max={100}
                label="CPU Usage"
                unit="%"
                size={96}
                color={cpuLoad != null ? loadColor(cpuLoad) : "var(--brand-violet)"}
                valueColor={cpuLoad != null ? loadColor(cpuLoad) : undefined}
              />
            </GaugeLink>
          </>
        )}
      </div>

      <PanelCard
        title="Temperature History"
        description="Package, composite, and GPU sensors over time"
        icon={Thermometer}
        id="chart-section"
        action={
          snapshot?.cpu.freq_mhz != null ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {(snapshot.cpu.freq_mhz / 1000).toFixed(2)} GHz
            </span>
          ) : undefined
        }
      >
        <div className="h-56">
          <TemperatureChart history={history} />
        </div>
      </PanelCard>

      {snapshot?.gpu && (
        <PanelCard
          id="gpu-details-section"
          title="GPU Details"
          description="NVML readout  laptop GPU fan speed is EC-controlled, not exposed by NVIDIA"
          icon={Gauge}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatBlock
              label="Utilization"
              value={
                snapshot.gpu.utilization_pct != null ? `${snapshot.gpu.utilization_pct}%` : ""
              }
              color={
                snapshot.gpu.utilization_pct != null
                  ? usageColor(snapshot.gpu.utilization_pct)
                  : undefined
              }
            />
            <StatBlock
              label="Power Draw"
              value={
                snapshot.gpu.power_w != null ? `${snapshot.gpu.power_w.toFixed(1)} W` : ""
              }
              color={
                snapshot.gpu.power_w != null ? powerColor(snapshot.gpu.power_w) : undefined
              }
            />
            <StatBlock
              label="Power Limit"
              value={
                snapshot.gpu.power_limit_w != null
                  ? `${snapshot.gpu.power_limit_w.toFixed(0)} W`
                  : ""
              }
              sub={
                snapshot.gpu.power_limit_default_w != null
                  ? `Factory default ${snapshot.gpu.power_limit_default_w.toFixed(0)} W`
                  : undefined
              }
            />
            <StatBlock
              label="Graphics Clock"
              value={
                snapshot.gpu.clock_graphics_mhz != null
                  ? `${snapshot.gpu.clock_graphics_mhz} MHz`
                  : ""
              }
            />
            <StatBlock
              label="VRAM"
              value={vramPct != null ? `${vramPct}%` : ""}
              sub={
                snapshot.gpu.memory_used_mib != null && snapshot.gpu.memory_total_mib
                  ? `${snapshot.gpu.memory_used_mib} / ${snapshot.gpu.memory_total_mib} MiB`
                  : undefined
              }
              color={vramPct != null ? usageColor(vramPct) : undefined}
            />
          </div>
        </PanelCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Cooling" icon={Fan}>
          {snapshot && snapshot.fans.length > 0 ? (
            <div className="space-y-4">
              {snapshot.fans.map((fan) => {
                const pct = Math.min((fan.value / 6000) * 100, 100);
                const color = fanColor(fan.value);
                return (
                  <ProgressBar
                    key={`${fan.chip}-${fan.label}`}
                    label={fan.label}
                    detail={`${fan.value.toFixed(0)} RPM`}
                    value={pct}
                    color={color}
                    detailColor={color}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No fan sensors reported.</p>
          )}
        </PanelCard>

        <PanelCard
          title="Power Sources"
          icon={Zap}
          action={
            totalPowerW ? (
              <span
                className="font-mono text-sm font-semibold tabular-nums"
                style={{ color: powerColor(totalPowerW) }}
              >
                {totalPowerW.toFixed(1)} W total
              </span>
            ) : undefined
          }
        >
          {snapshot && snapshot.power.length > 0 ? (
            <div className="space-y-3">
              {snapshot.power.map((p) => {
                const color = powerColor(p.value);
                return (
                  <div
                    key={`${p.chip}-${p.label}`}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{p.label}</span>
                    <span
                      className="font-mono text-sm tabular-nums transition-colors duration-300"
                      style={{ color }}
                    >
                      {p.value.toFixed(1)} W
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No power sensors  unlock advanced features for CPU package power.
            </p>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard id="memory-section" title="Memory" icon={MemoryStick}>
          {memory ? (
            <div className="space-y-4">
              <ProgressBar
                label="RAM"
                detail={`${formatKib(memUsedKib)} / ${formatKib(memory.total_kib)} (${memUsedPct}%)`}
                value={memUsedPct ?? 0}
              />
              {memory.swap_devices.length > 0 ? (
                memory.swap_devices.map((dev) => {
                  const pct = dev.size_kib > 0 ? (dev.used_kib / dev.size_kib) * 100 : 0;
                  return (
                    <ProgressBar
                      key={dev.name}
                      label={`${dev.name.replace("/dev/", "")} (${dev.kind})`}
                      detail={`${formatKib(dev.used_kib)} / ${formatKib(dev.size_kib)}`}
                      value={pct}
                    />
                  );
                })
              ) : (
                <ProgressBar
                  label="Swap"
                  detail={`${formatKib(swapUsedKib ?? 0)} / ${formatKib(memory.swap_total_kib)}`}
                  value={swapUsedPct ?? 0}
                />
              )}
              {snapshot?.cpu.governor && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>CPU Governor</span>
                  <span className="font-mono">{snapshot.cpu.governor}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No memory data reported.</p>
          )}
        </PanelCard>

        <PanelCard title="Storage & Disk I/O" icon={HardDrive}>
          <div className="space-y-4">
            {snapshot && snapshot.disk_space.length > 0 && (
              <div className="space-y-3">
                {snapshot.disk_space.map((d) => {
                  const pct = Math.round((d.used_bytes / d.total_bytes) * 100);
                  return (
                    <ProgressBar
                      key={d.mount}
                      label={d.mount}
                      detail={`${formatBytes(d.used_bytes)} / ${formatBytes(d.total_bytes)} (${pct}%)`}
                      value={pct}
                    />
                  );
                })}
              </div>
            )}
            {snapshot && snapshot.disks.length > 0 ? (
              <div className="space-y-2 border-t border-border/40 pt-3">
                {snapshot.disks.map((disk) => (
                  <div
                    key={disk.device}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{disk.device}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      ↓ {formatRate(disk.read_bytes_per_sec)} · ↑{" "}
                      {formatRate(disk.write_bytes_per_sec)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Collecting I/O samples…</p>
            )}
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <PanelCard title="Network" icon={Network}>
          {snapshot && snapshot.network.length > 0 ? (
            <div className="space-y-2">
              {snapshot.network.map((net) => (
                <div
                  key={net.interface}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{net.interface}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    ↓ {formatRate(net.rx_bytes_per_sec)} · ↑{" "}
                    {formatRate(net.tx_bytes_per_sec)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Collecting samples…</p>
          )}
        </PanelCard>

        <MetricCard
          icon={Activity}
          label="Uptime"
          value={snapshot?.uptime_secs != null ? formatUptime(snapshot.uptime_secs) : ""}
          className="h-full min-w-45"
        />
      </div>

      {snapshot && snapshot.temps.length > 0 && (
        <SensorDisclosure
          temps={snapshot.temps}
          open={sensorsOpen}
          onOpenChange={setSensorsOpen}
        />
      )}
    </div>
  );
}

function SensorDisclosure({
  temps,
  open,
  onOpenChange,
}: {
  temps: TelemetrySnapshot["temps"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div id="sensors-section" className="glass-panel overflow-hidden">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            <Thermometer className="size-3.5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold">All Temperature Sensors</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Full hwmon enumeration</p>
          </div>
          <Badge variant="secondary">{temps.length}</Badge>
        </div>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="grid gap-x-8 border-t border-border/40 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {temps.map((t) => (
            <div
              key={`${t.chip}-${t.label}`}
              className="flex items-center justify-between border-b border-border/30 py-2 text-sm"
            >
              <span className="truncate text-muted-foreground">
                {t.chip} · {t.label}
              </span>
              <span
                className="ml-2 shrink-0 font-mono tabular-nums transition-colors duration-300"
                style={{ color: tempColor(t.value) }}
              >
                {t.value.toFixed(1)}°C
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
