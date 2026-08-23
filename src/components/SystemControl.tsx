import { BatteryCharging, Power, Sun, Wifi } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PanelCard } from "@/components/layout/AppShell";
import type { useSystemInfo } from "@/hooks/useSystemInfo";

type SystemInfo = ReturnType<typeof useSystemInfo>;

export function BrightnessCard({
  brightness,
  brightnessError,
  applyBrightness,
}: Pick<SystemInfo, "brightness" | "brightnessError" | "applyBrightness">) {
  if (!brightness) return null;
  return (
    <PanelCard
      title="Screen Brightness"
      icon={Sun}
      action={
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {brightness.current} / {brightness.max}
        </span>
      }
    >
      <div className="space-y-3">
        <Slider
          value={[brightness.current]}
          min={0}
          max={brightness.max}
          onValueChange={applyBrightness}
        />
        {brightnessError && <p className="text-sm text-destructive">{brightnessError}</p>}
      </div>
    </PanelCard>
  );
}

export function RadiosCard({
  radios,
  radioError,
  toggleRadio,
}: Pick<SystemInfo, "radios" | "radioError" | "toggleRadio">) {
  if (radios.length === 0) return null;
  return (
    <PanelCard title="Wireless Radios" description="Toggle requires privilege unlock" icon={Wifi}>
      <div className="space-y-2">
        {radios.map((radio) => (
          <div
            key={radio.name}
            className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{radio.name}</p>
              <p className="text-xs text-muted-foreground">{radio.kind}</p>
            </div>
            {radio.hard_blocked ? (
              <Badge variant="secondary">Hardware off</Badge>
            ) : (
              <Switch checked={!radio.soft_blocked} onCheckedChange={() => toggleRadio(radio)} />
            )}
          </div>
        ))}
        {radioError && <p className="text-sm text-destructive">{radioError}</p>}
      </div>
    </PanelCard>
  );
}

export function BatteryHealthCard({ battery }: Pick<SystemInfo, "battery">) {
  if (!battery) return null;
  return (
    <PanelCard
      title="Battery Health"
      icon={BatteryCharging}
      action={<Badge variant="secondary">{battery.status}</Badge>}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Charge
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {battery.capacity_pct}%
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Health
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {battery.health_pct != null ? `${battery.health_pct}%` : ""}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cycles
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {battery.cycle_count ?? ""}
          </p>
        </div>
      </div>
    </PanelCard>
  );
}

export function AutostartCard({
  autostart,
  autostartError,
  toggleAutostart,
}: Pick<SystemInfo, "autostart" | "autostartError" | "toggleAutostart">) {
  if (autostart == null) return null;
  return (
    <PanelCard title="Launch at Login" icon={Power}>
      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3">
        <Label htmlFor="autostart-toggle" className="text-sm">
          Start SenseCenter automatically
        </Label>
        <Switch id="autostart-toggle" checked={autostart} onCheckedChange={toggleAutostart} />
      </div>
      {autostartError && <p className="mt-2 text-sm text-destructive">{autostartError}</p>}
    </PanelCard>
  );
}
