import { useEffect, useState } from "react";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { BatteryCharging, Power, Sun, Wifi } from "lucide-react";
import {
  getBatteryHealth,
  getBrightness,
  listRadios,
  setBrightness,
  setRadioBlocked,
  tauriErrorMessage,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { BatteryHealth, BrightnessInfo, RadioInfo } from "@/types";

function firstOf(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function SystemControl() {
  const [brightness, setBrightnessState] = useState<BrightnessInfo | null>(null);
  const [brightnessError, setBrightnessError] = useState<string | null>(null);
  const [radios, setRadios] = useState<RadioInfo[]>([]);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryHealth | null>(null);
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [autostartError, setAutostartError] = useState<string | null>(null);

  useEffect(() => {
    getBrightness().then(setBrightnessState).catch(() => undefined);
    listRadios().then(setRadios).catch(() => undefined);
    getBatteryHealth().then(setBattery).catch(() => undefined);
    isAutostartEnabled().then(setAutostart).catch(() => undefined);
  }, []);

  const toggleAutostart = async (next: boolean) => {
    setAutostartError(null);
    setAutostart(next);
    try {
      if (next) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
    } catch (err) {
      setAutostart(!next);
      setAutostartError(tauriErrorMessage(err));
    }
  };

  const applyBrightness = async (value: number) => {
    if (!brightness) return;
    setBrightnessState({ ...brightness, current: value });
    setBrightnessError(null);
    try {
      await setBrightness(brightness.device, value);
    } catch (err) {
      setBrightnessError(tauriErrorMessage(err));
    }
  };

  const toggleRadio = async (radio: RadioInfo) => {
    setRadioError(null);
    const next = !radio.soft_blocked;
    setRadios((prev) =>
      prev.map((r) => (r.name === radio.name ? { ...r, soft_blocked: next } : r)),
    );
    try {
      await setRadioBlocked(radio.name, next);
    } catch (err) {
      setRadios((prev) =>
        prev.map((r) => (r.name === radio.name ? { ...r, soft_blocked: radio.soft_blocked } : r)),
      );
      setRadioError(`${radio.name}: ${tauriErrorMessage(err)}`);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {brightness && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="size-4" />
              <CardTitle>Screen brightness</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Slider
              value={[brightness.current]}
              min={0}
              max={brightness.max}
              onValueChange={(v) => void applyBrightness(firstOf(v))}
            />
            <p className="text-xs text-muted-foreground">
              {brightness.current} / {brightness.max}
            </p>
            {brightnessError && <p className="text-sm text-destructive">{brightnessError}</p>}
          </CardContent>
        </Card>
      )}

      {radios.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wifi className="size-4" />
              <CardTitle>Wireless radios</CardTitle>
            </div>
            <CardDescription>Toggling requires root — see DESIGN.md.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {radios.map((radio) => (
              <div
                key={radio.name}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{radio.name}</p>
                  <p className="text-xs text-muted-foreground">{radio.kind}</p>
                </div>
                {radio.hard_blocked ? (
                  <Badge variant="secondary">hardware off</Badge>
                ) : (
                  <Switch
                    checked={!radio.soft_blocked}
                    onCheckedChange={() => void toggleRadio(radio)}
                  />
                )}
              </div>
            ))}
            {radioError && <p className="text-sm text-destructive">{radioError}</p>}
          </CardContent>
        </Card>
      )}

      {battery && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BatteryCharging className="size-4" />
              <CardTitle>Battery health</CardTitle>
              <Badge variant="secondary">{battery.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Charge</p>
                <p className="tabular-nums">{battery.capacity_pct}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Health</p>
                <p className="tabular-nums">
                  {battery.health_pct != null ? `${battery.health_pct}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cycles</p>
                <p className="tabular-nums">{battery.cycle_count ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {autostart != null && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Power className="size-4" />
              <CardTitle>Launch at login</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="autostart-toggle">Start SenseCenter automatically</Label>
              <Switch
                id="autostart-toggle"
                checked={autostart}
                onCheckedChange={(v) => void toggleAutostart(v)}
              />
            </div>
            {autostartError && <p className="mt-2 text-sm text-destructive">{autostartError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
