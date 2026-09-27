import { useState } from "react";
import { BatteryCharging, Download, Power, Sun, Wifi } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PanelCard } from "@/components/layout/AppShell";
import type { useSystemInfo } from "@/hooks/useSystemInfo";
import { checkForUpdate, installUpdate, tauriErrorMessage } from "@/lib/api";
import type { UpdateInfo } from "@/types";

type SystemInfo = ReturnType<typeof useSystemInfo>;

export function BrightnessCard({
  brightness,
  brightnessError,
  applyBrightness,
}: Pick<SystemInfo, "brightness" | "brightnessError" | "applyBrightness">) {
  if (!brightness) return null;
  const pct = Math.round((brightness.current / brightness.max) * 100);

  return (
    <PanelCard
      title="Display Luminance"
      description="Direct Linux video backlight sysfs interface"
      icon={Sun}
      action={
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="font-bold text-brand-teal tabular-nums">{pct}%</span>
          <span>({brightness.current} / {brightness.max})</span>
        </div>
      }
    >
      <div className="space-y-4">
        <Slider
          value={[brightness.current]}
          min={0}
          max={brightness.max}
          onValueChange={applyBrightness}
        />
        {brightnessError && <p className="font-mono text-xs text-rose-400">{brightnessError}</p>}
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
    <PanelCard title="Wireless RF Radios" description="Hardware and software rfkill subsystem" icon={Wifi}>
      <div className="space-y-2.5">
        {radios.map((radio) => (
          <div
            key={radio.name}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/25 px-4 py-3 transition-colors hover:border-white/10"
          >
            <div className="flex items-center gap-3">
              <span
                className={`size-2 rounded-full ${
                  radio.hard_blocked
                    ? "bg-rose-500"
                    : radio.soft_blocked
                      ? "bg-amber-400"
                      : "bg-brand-teal"
                }`}
              />
              <div>
                <p className="font-mono text-xs font-semibold text-foreground">{radio.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground uppercase">{radio.kind}</p>
              </div>
            </div>
            {radio.hard_blocked ? (
              <Badge variant="destructive" className="font-mono text-[10px] uppercase">Hardware Kill</Badge>
            ) : (
              <Switch checked={!radio.soft_blocked} onCheckedChange={() => toggleRadio(radio)} />
            )}
          </div>
        ))}
        {radioError && <p className="font-mono text-xs text-rose-400">{radioError}</p>}
      </div>
    </PanelCard>
  );
}

export function BatteryHealthCard({ battery }: Pick<SystemInfo, "battery">) {
  if (!battery) return null;
  return (
    <PanelCard
      title="Battery Health & Power Rails"
      icon={BatteryCharging}
      action={
        <Badge variant={/charging/i.test(battery.status) ? "emerald" : "outline"}>
          {battery.status}
        </Badge>
      }
    >
      <div className="grid grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 text-center shadow-inner">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current Charge
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-brand-teal">
            {battery.capacity_pct}%
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 text-center shadow-inner">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cell Health
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-400">
            {battery.health_pct != null ? `${battery.health_pct}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 text-center shadow-inner">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cycle Count
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-brand-violet">
            {battery.cycle_count ?? "—"}
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
    <PanelCard title="System Daemon & Autostart" icon={Power}>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/25 px-4 py-3.5">
        <div>
          <Label htmlFor="autostart-toggle" className="cursor-pointer font-mono text-xs font-semibold text-foreground">
            Launch SenseCenter at System Login
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">Enables background system tray monitoring</p>
        </div>
        <Switch id="autostart-toggle" checked={autostart} onCheckedChange={toggleAutostart} />
      </div>
      {autostartError && <p className="mt-2 font-mono text-xs text-rose-400">{autostartError}</p>}
    </PanelCard>
  );
}

export function UpdateCard() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState<"checking" | "installing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "checking" | "installing", task: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const check = () => run("checking", async () => setInfo(await checkForUpdate()));
  const install = () => run("installing", installUpdate);

  const status = !info
    ? "Check GitHub for a newer release"
    : info.available
      ? `Version ${info.latest} is available (you have ${info.current})`
      : `You're on the latest version (${info.current})`;

  return (
    <PanelCard title="Application Updates" icon={Download}>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/25 px-4 py-3.5">
        <div>
          <p className="font-mono text-xs font-semibold text-foreground">{status}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {busy === "installing"
              ? "Downloading and installing. SenseCenter will restart when it's done"
              : info?.available && !info.can_install
                ? "This build can't update itself. Download the new version from GitHub."
                : "The .deb update asks for your password; the AppImage updates in place"}
          </p>
        </div>
        {info?.available && info.can_install ? (
          <Button size="sm" disabled={busy != null} onClick={() => void install()} className="font-mono text-xs">
            {busy === "installing" ? "Updating…" : `Update to ${info.latest}`}
          </Button>
        ) : info?.available ? (
          <Button size="sm" variant="outline" onClick={() => void openUrl(info.release_url)} className="font-mono text-xs">
            Open release page
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy != null} onClick={() => void check()} className="font-mono text-xs">
            {busy === "checking" ? "Checking…" : "Check for updates"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 font-mono text-xs text-rose-400">{error}</p>}
    </PanelCard>
  );
}
