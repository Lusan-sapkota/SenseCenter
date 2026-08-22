import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { readControl, tauriErrorMessage, writeControl } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RgbControl } from "@/components/RgbControl";
import { ThermalControl } from "@/components/ThermalControl";
import { SystemControl } from "@/components/SystemControl";
import type { DeviceInfo } from "@/types";

interface ControlPanelProps {
  device: DeviceInfo | null;
  controlsEnabled: boolean;
}

const TOGGLE_CONTROLS: Record<string, string> = {
  battery_limiter: "Battery limiter (80% cap)",
  backlight_timeout: "Keyboard backlight timeout (30s)",
  boot_animation_sound: "Boot animation sound",
  lcd_override: "LCD latency override",
  battery_calibration: "Battery calibration cycle",
};

function hasControl(device: DeviceInfo | null, name: string) {
  return device?.available_controls.includes(name) ?? false;
}

function ToggleControl({
  name,
  label,
  disabled,
}: {
  name: string;
  label: string;
  disabled: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readControl(name)
      .then((value) => {
        if (!cancelled) {
          setChecked(value.trim() === "1");
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(tauriErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const onCheckedChange = async (next: boolean) => {
    setError(null);
    const prev = checked;
    setChecked(next);
    try {
      await writeControl(name, next ? "1" : "0");
    } catch (err) {
      setChecked(prev);
      setError(tauriErrorMessage(err));
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/50 px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor={name}>{label}</Label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          id={name}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => void onCheckedChange(v)}
        />
      )}
    </div>
  );
}

function firstOf(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

type FanMode = "auto" | "max" | "custom";

export function ControlPanel({ device, controlsEnabled }: ControlPanelProps) {
  const [cpuFan, setCpuFan] = useState(50);
  const [gpuFan, setGpuFan] = useState(50);
  const [fanMode, setFanMode] = useState<FanMode>("auto");
  const [fanError, setFanError] = useState<string | null>(null);
  const [usbValue, setUsbValue] = useState("0");
  const [usbError, setUsbError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasControl(device, "usb_charging")) return;
    readControl("usb_charging")
      .then((v) => setUsbValue(v.trim()))
      .catch((err) => setUsbError(tauriErrorMessage(err)));
  }, [device]);

  const applyFan = async (cpu: number, gpu: number) => {
    setFanError(null);
    try {
      await writeControl("fan_speed", `${cpu},${gpu}`);
    } catch (err) {
      setFanError(tauriErrorMessage(err));
    }
  };

  const setFanModeAndApply = async (mode: FanMode) => {
    setFanMode(mode);
    if (mode === "auto") {
      await applyFan(0, 0);
    } else if (mode === "max") {
      await applyFan(100, 100);
    } else {
      await applyFan(cpuFan, gpuFan);
    }
  };

  const applyUsb = async (value: string) => {
    setUsbError(null);
    setUsbValue(value);
    try {
      await writeControl("usb_charging", value);
    } catch (err) {
      setUsbError(tauriErrorMessage(err));
    }
  };

  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>Connect linuwu-sense to manage hardware settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const toggles = Object.entries(TOGGLE_CONTROLS).filter(([name]) =>
    hasControl(device, name),
  );

  return (
    <div className="space-y-4">
      {!controlsEnabled && (
        <Alert variant="destructive">
          <AlertDescription>
            Controls are read-only until the module is loaded and group permissions are active.
          </AlertDescription>
        </Alert>
      )}

      {toggles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Toggle linuwu-sense sysfs controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {toggles.map(([name, label]) => (
              <ToggleControl
                key={name}
                name={name}
                label={label}
                disabled={!controlsEnabled}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {hasControl(device, "fan_speed") && (
        <Card>
          <CardHeader>
            <CardTitle>Fan speed</CardTitle>
            <CardDescription>Write-only control — no RPM readback from this file itself.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={fanMode === "auto" ? "default" : "outline"}
                size="sm"
                disabled={!controlsEnabled}
                onClick={() => void setFanModeAndApply("auto")}
              >
                Auto
              </Button>
              <Button
                variant={fanMode === "max" ? "default" : "outline"}
                size="sm"
                disabled={!controlsEnabled}
                onClick={() => void setFanModeAndApply("max")}
              >
                Max
              </Button>
              <Button
                variant={fanMode === "custom" ? "default" : "outline"}
                size="sm"
                disabled={!controlsEnabled}
                onClick={() => void setFanModeAndApply("custom")}
              >
                Custom
              </Button>
            </div>
            {fanMode === "custom" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CPU fan</span>
                    <span className="tabular-nums">{cpuFan}%</span>
                  </div>
                  <Slider
                    value={[cpuFan]}
                    min={1}
                    max={100}
                    disabled={!controlsEnabled}
                    onValueChange={(v) => {
                      const next = firstOf(v);
                      setCpuFan(next);
                      void applyFan(next, gpuFan);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">GPU fan</span>
                    <span className="tabular-nums">{gpuFan}%</span>
                  </div>
                  <Slider
                    value={[gpuFan]}
                    min={1}
                    max={100}
                    disabled={!controlsEnabled}
                    onValueChange={(v) => {
                      const next = firstOf(v);
                      setGpuFan(next);
                      void applyFan(cpuFan, next);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  1% is the kernel module&apos;s documented minimum and isn&apos;t recommended for sustained use.
                </p>
              </>
            )}
            {fanError && <p className="text-sm text-destructive">{fanError}</p>}
          </CardContent>
        </Card>
      )}

      {hasControl(device, "usb_charging") && (
        <Card>
          <CardHeader>
            <CardTitle>USB charging while off</CardTitle>
            <CardDescription>Power USB ports when the laptop is shut down.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select
              value={usbValue}
              disabled={!controlsEnabled}
              onValueChange={(v) => {
                if (v) void applyUsb(v);
              }}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                <SelectItem value="10">Up to 10% battery</SelectItem>
                <SelectItem value="20">Up to 20% battery</SelectItem>
                <SelectItem value="30">Up to 30% battery</SelectItem>
              </SelectContent>
            </Select>
            {usbError && <p className="text-sm text-destructive">{usbError}</p>}
          </CardContent>
        </Card>
      )}

      {hasControl(device, "four_zoned_kb/") && (
        <RgbControl disabled={!controlsEnabled} />
      )}

      <ThermalControl disabled={!controlsEnabled} />

      <SystemControl />
    </div>
  );
}
