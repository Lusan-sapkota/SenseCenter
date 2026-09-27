import { memo, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
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
      className="group relative cursor-pointer rounded-2xl p-2 transition-colors duration-150 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
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
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-3.5 shadow-inner transition-colors duration-150 hover:border-white/10 hover:bg-black/40">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-xl font-bold tabular-nums tracking-tight"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">{sub}</p>}
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

export const MonitoringPanel = memo(function MonitoringPanel({
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
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Sample Rate:
            </span>
            <Select value={String(pollMs)} onValueChange={(v) => v && onPollMsChange(Number(v))}>
              <SelectTrigger size="sm" aria-label="Polling interval" className="font-mono text-xs border-white/10 bg-white/[0.04]">
                <SelectValue>
                  {(v: string) =>
                    `${POLL_INTERVAL_OPTIONS.find((o) => o.value === v)?.label ?? `${Number(v) / 1000}s`}`
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0E131F] font-mono text-xs">
                {POLL_INTERVAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    Every {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="border-rose-500/30 bg-rose-500/10 font-mono text-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F1422] to-[#0A0D15] p-6 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
        aria-busy={snapshot == null}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,229,190,0.08),transparent_70%)]" />
        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-white/[0.06]">
          {snapshot == null ? (
            <>
              <div className="flex justify-center"><GaugeSkeleton label="CPU Temp" size={110} /></div>
              <div className="flex justify-center sm:pl-4"><GaugeSkeleton label="GPU Temp" size={110} /></div>
              <div className="flex justify-center sm:pl-4"><GaugeSkeleton label="RAM" size={110} /></div>
              <div className="flex justify-center sm:pl-4"><GaugeSkeleton label="CPU Usage" size={110} /></div>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <GaugeLink onClick={jumpToSensors} label="all temperature sensors">
                  <GaugeRing
                    value={cpuTemp ?? 0}
                    max={100}
                    label="CPU Temp"
                    unit="°C"
                    size={110}
                    color={cpuTemp != null ? tempColor(cpuTemp) : "var(--brand-teal)"}
                    valueColor={cpuTemp != null ? tempColor(cpuTemp) : undefined}
                  />
                </GaugeLink>
              </div>
              <div className="flex justify-center sm:pl-4">
                <GaugeLink onClick={jumpToGpuDetails} label="GPU details">
                  <GaugeRing
                    value={gpuTemp ?? 0}
                    max={100}
                    label="GPU Temp"
                    unit="°C"
                    size={110}
                    color={gpuTemp != null ? tempColor(gpuTemp) : "var(--brand-violet)"}
                    valueColor={gpuTemp != null ? tempColor(gpuTemp) : undefined}
                  />
                </GaugeLink>
              </div>
              <div className="flex justify-center sm:pl-4">
                <GaugeLink onClick={jumpToMemory} label="memory details">
                  <GaugeRing
                    value={memUsedPct ?? 0}
                    max={100}
                    label="RAM"
                    unit="%"
                    size={110}
                    color={memUsedPct != null ? usageColor(memUsedPct) : "var(--brand-teal)"}
                    valueColor={memUsedPct != null ? usageColor(memUsedPct) : undefined}
                  />
                </GaugeLink>
              </div>
              <div className="flex justify-center sm:pl-4">
                <GaugeLink onClick={jumpToChart} label="temperature history">
                  <GaugeRing
                    value={cpuLoad ?? 0}
                    max={100}
                    label="CPU Usage"
                    unit="%"
                    size={110}
                    color={cpuLoad != null ? loadColor(cpuLoad) : "var(--brand-violet)"}
                    valueColor={cpuLoad != null ? loadColor(cpuLoad) : undefined}
                  />
                </GaugeLink>
              </div>
            </>
          )}
        </div>
      </div>

      <PanelCard
        title="Temperature History"
        description="Package, composite, and GPU sensors over time"
        icon={Thermometer}
        id="chart-section"
        action={
          snapshot?.cpu.freq_mhz != null ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-brand-teal" />
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                {(snapshot.cpu.freq_mhz / 1000).toFixed(2)} GHz
              </span>
            </div>
          ) : undefined
        }
      >
        <div className="h-60 w-full pt-2">
          <TemperatureChart history={history} />
        </div>
      </PanelCard>

      {snapshot?.gpu && (
        <PanelCard
          id="gpu-details-section"
          title="GPU Telemetry Matrix"
          description="NVML readout  laptop GPU fan speed is EC-controlled, not exposed by NVIDIA"
          icon={Gauge}
        >
          <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <StatBlock
              label="Temperature"
              value={
                snapshot.gpu.temp_c != null ? `${snapshot.gpu.temp_c.toFixed(0)}°C` : ""
              }
              color={
                snapshot.gpu.temp_c != null ? tempColor(snapshot.gpu.temp_c) : undefined
              }
            />
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
              label="Graphics Clock"
              value={
                snapshot.gpu.clock_graphics_mhz != null
                  ? `${snapshot.gpu.clock_graphics_mhz} MHz`
                  : ""
              }
            />
            <StatBlock
              label="VRAM Allocation"
              value={vramPct != null ? `${vramPct}%` : ""}
              sub={
                snapshot.gpu.memory_used_mib != null && snapshot.gpu.memory_total_mib
                  ? `${snapshot.gpu.memory_used_mib} / ${snapshot.gpu.memory_total_mib} MiB`
                  : undefined
              }
              color={vramPct != null ? usageColor(vramPct) : undefined}
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
          </div>
        </PanelCard>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelCard title="Active Cooling Tachometers" icon={Fan}>
          {snapshot && snapshot.fans.length > 0 ? (
            <div className="space-y-4">
              {snapshot.fans.map((fan) => {
                const pct = Math.min((fan.value / 6000) * 100, 100);
                const color = fanColor(fan.value);
                const isSpinning = fan.value > 0;
                return (
                  <div
                    key={`${fan.chip}-${fan.label}`}
                    className="rounded-xl border border-white/[0.05] bg-black/20 p-4 transition-colors duration-150 hover:border-white/10"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex size-8 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Fan
                            className={cn(
                              "size-4",
                              isSpinning ? "text-brand-teal" : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-foreground">{fan.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{fan.chip}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="font-mono text-base font-bold tabular-nums"
                          style={{ color }}
                        >
                          {fan.value.toFixed(0)} RPM
                        </span>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {pct.toFixed(0)}% DUTY
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={pct}
                      color={color}
                      detailColor={color}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">No fan sensors reported.</p>
          )}
        </PanelCard>

        <PanelCard
          title="Power Distribution"
          icon={Zap}
          action={
            totalPowerW ? (
              <span
                className="font-mono text-sm font-bold tabular-nums"
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
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/25 px-4 py-3 transition-colors hover:border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="size-3.5 text-muted-foreground" />
                      <span className="font-mono text-xs font-medium text-foreground">{p.label}</span>
                    </div>
                    <span
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color }}
                    >
                      {p.value.toFixed(1)} W
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">
              No power sensors  unlock advanced features for CPU package power.
            </p>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelCard id="memory-section" title="Memory Allocation" icon={MemoryStick}>
          {memory ? (
            <div className="space-y-4">
              <ProgressBar
                label="Physical RAM"
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
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-3 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] uppercase tracking-wider">CPU Governor</span>
                  <span className="font-mono text-xs font-semibold text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded px-2 py-0.5">
                    {snapshot.cpu.governor}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">No memory data reported.</p>
          )}
        </PanelCard>

        <PanelCard title="Storage Volumes & Disk I/O" icon={HardDrive}>
          <div className="space-y-4">
            {snapshot && snapshot.disk_space.length > 0 && (
              <div className="space-y-3">
                {snapshot.disk_space.map((d) => {
                  const pct = Math.round((d.used_bytes / d.total_bytes) * 100);
                  return (
                    <ProgressBar
                      key={d.mount}
                      label={`Mount: ${d.mount}`}
                      detail={`${formatBytes(d.used_bytes)} / ${formatBytes(d.total_bytes)} (${pct}%)`}
                      value={pct}
                    />
                  );
                })}
              </div>
            )}
            {snapshot && snapshot.disks.length > 0 ? (
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                {snapshot.disks.map((disk) => (
                  <div
                    key={disk.device}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground/90">{disk.device}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      <span className="text-emerald-400">↓ {formatRate(disk.read_bytes_per_sec)}</span> ·{" "}
                      <span className="text-sky-400">↑ {formatRate(disk.write_bytes_per_sec)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Collecting I/O samples…</p>
            )}
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <PanelCard title="Network Interfaces" icon={Network}>
          {snapshot && snapshot.network.length > 0 ? (
            <div className="space-y-2.5">
              {snapshot.network.map((net) => (
                <div
                  key={net.interface}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/25 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-brand-teal" />
                    <span className="font-mono text-xs font-semibold text-foreground">{net.interface}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ArrowDown className="size-3" />
                      {formatRate(net.rx_bytes_per_sec)}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <ArrowUp className="size-3" />
                      {formatRate(net.tx_bytes_per_sec)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">Collecting network samples…</p>
          )}
        </PanelCard>

        <MetricCard
          icon={Activity}
          label="Uptime"
          value={snapshot?.uptime_secs != null ? formatUptime(snapshot.uptime_secs) : ""}
          className="h-full min-w-48"
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
});

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
    <div id="sensors-section" className="glass-panel overflow-hidden border-white/[0.08]">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04] text-brand-teal ring-1 ring-white/10">
            <Thermometer className="size-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">All Hardware Temperature Sensors</h3>
            <p className="font-mono text-[11px] text-muted-foreground">Full hwmon chip + coretemp enumeration</p>
          </div>
          <Badge variant="outline">{temps.length} SENSORS</Badge>
        </div>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="grid gap-x-8 border-t border-white/[0.06] bg-black/20 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {temps.map((t) => (
            <div
              key={`${t.chip}-${t.label}`}
              className="flex items-center justify-between border-b border-white/[0.04] py-2 text-sm"
            >
              <span className="truncate font-mono text-xs text-muted-foreground">
                <span className="text-white/40">{t.chip} ·</span> {t.label}
              </span>
              <span
                className="ml-2 shrink-0 font-mono text-xs font-semibold tabular-nums"
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
