import { useEffect, useState } from "react";
import { Loader2, Monitor, Power, Settings2, Usb, Wind } from "lucide-react";
import { readControl, tauriErrorMessage, writeControl } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelCard, SectionHeader } from "@/components/layout/AppShell";
import { RgbControl } from "@/components/RgbControl";
import { ThermalControl } from "@/components/ThermalControl";
import {
  AutostartCard,
  BatteryHealthCard,
  BrightnessCard,
  RadiosCard,
} from "@/components/SystemControl";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import type { DeviceInfo } from "@/types";

interface ControlPanelProps {
  device: DeviceInfo | null;
  controlsEnabled: boolean;
}

const TOGGLE_CONTROLS: Record<string, { label: string; hint: string }> = {
  battery_limiter: {
    label: "Battery limiter",
    hint: "Cap charge at 80% to preserve battery health",
  },
  backlight_timeout: {
    label: "Keyboard backlight timeout",
    hint: "Turn off keyboard backlight after 30s idle",
  },
  boot_animation_sound: {
    label: "Boot animation sound",
    hint: "Play boot chime on startup",
  },
  lcd_override: {
    label: "LCD latency override",
    hint: "Reduce LCD ghosting at cost of power",
  },
  battery_calibration: {
    label: "Battery calibration",
    hint: "Full charge/discharge/recharge cycle",
  },
};

function hasControl(device: DeviceInfo | null, name: string) {
  return device?.available_controls.includes(name) ?? false;
}

function ToggleControl({
  name,
  label,
  hint,
  disabled,
}: {
  name: string;
  label: string;
  hint: string;
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
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3.5 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
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

function ToggleGroup({
  device,
  names,
  controlsEnabled,
}: {
  device: DeviceInfo | null;
  names: string[];
  controlsEnabled: boolean;
}) {
  const active = names.filter((name) => hasControl(device, name));
  if (active.length === 0) return null;
  return (
    <div className="space-y-2">
      {active.map((name) => (
        <ToggleControl
          key={name}
          name={name}
          label={TOGGLE_CONTROLS[name].label}
          hint={TOGGLE_CONTROLS[name].hint}
          disabled={!controlsEnabled}
        />
      ))}
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
  const system = useSystemInfo();

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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal/15 to-brand-violet/15 ring-1 ring-border/60">
          <Settings2 className="size-7 text-muted-foreground/60" />
        </div>
        <h2 className="font-heading text-lg font-semibold">No device detected</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Load the linuwu-sense kernel module and ensure your user is in the
          linuwu_sense group to access hardware controls.
        </p>
      </div>
    );
  }

  const hasRgb = hasControl(device, "four_zoned_kb/");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Hardware Controls"
        description="Direct sysfs control via linuwu-sense  no shell, no injection"
        icon={Settings2}
      />

      {!controlsEnabled && (
        <Alert variant="destructive">
          <AlertDescription>
            Controls are read-only until the module is loaded and group permissions are active.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="performance">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
          {hasRgb && <TabsTrigger value="lighting">Lighting</TabsTrigger>}
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {hasControl(device, "fan_speed") && (
            <PanelCard
              title="Fan Control"
              description="Auto (0), Max (100), or custom CPU/GPU percentages"
              icon={Wind}
            >
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(["auto", "max", "custom"] as FanMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant={fanMode === mode ? "default" : "outline"}
                      size="sm"
                      disabled={!controlsEnabled}
                      onClick={() => void setFanModeAndApply(mode)}
                      className="min-w-18 capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                {fanMode === "custom" && (
                  <div className="space-y-5 rounded-lg bg-muted/20 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">CPU Fan</span>
                        <span className="font-mono tabular-nums text-brand-teal">{cpuFan}%</span>
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
                        <span className="font-medium">GPU Fan</span>
                        <span className="font-mono tabular-nums text-brand-violet">{gpuFan}%</span>
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
                  </div>
                )}
                {fanError && <p className="text-sm text-destructive">{fanError}</p>}
              </div>
            </PanelCard>
          )}

          <ThermalControl disabled={!controlsEnabled} />

          {hasControl(device, "lcd_override") && (
            <PanelCard title="Display" description="Latency tuning" icon={Monitor}>
              <ToggleGroup
                device={device}
                names={["lcd_override"]}
                controlsEnabled={controlsEnabled}
              />
            </PanelCard>
          )}
        </TabsContent>

        <TabsContent value="power" className="space-y-4 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {(hasControl(device, "battery_limiter") ||
            hasControl(device, "battery_calibration")) && (
            <PanelCard title="Battery" description="linuwu-sense sysfs switches">
              <ToggleGroup
                device={device}
                names={["battery_limiter", "battery_calibration"]}
                controlsEnabled={controlsEnabled}
              />
            </PanelCard>
          )}

          {hasControl(device, "usb_charging") && (
            <PanelCard
              title="USB Charging While Off"
              description="Power USB ports when the laptop is shut down"
              icon={Usb}
            >
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
              {usbError && <p className="mt-2 text-sm text-destructive">{usbError}</p>}
            </PanelCard>
          )}

          <BatteryHealthCard battery={system.battery} />
          <BrightnessCard
            brightness={system.brightness}
            brightnessError={system.brightnessError}
            applyBrightness={system.applyBrightness}
          />
        </TabsContent>

        {hasRgb && (
          <TabsContent value="lighting" className="space-y-4 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <RgbControl disabled={!controlsEnabled} />
            {hasControl(device, "backlight_timeout") && (
              <PanelCard title="Keyboard Backlight" description="linuwu-sense sysfs switch">
                <ToggleGroup
                  device={device}
                  names={["backlight_timeout"]}
                  controlsEnabled={controlsEnabled}
                />
              </PanelCard>
            )}
          </TabsContent>
        )}

        <TabsContent value="system" className="space-y-4 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {hasControl(device, "boot_animation_sound") && (
            <PanelCard title="Startup" description="linuwu-sense sysfs switch" icon={Power}>
              <ToggleGroup
                device={device}
                names={["boot_animation_sound"]}
                controlsEnabled={controlsEnabled}
              />
            </PanelCard>
          )}
          <RadiosCard
            radios={system.radios}
            radioError={system.radioError}
            toggleRadio={system.toggleRadio}
          />
          <AutostartCard
            autostart={system.autostart}
            autostartError={system.autostartError}
            toggleAutostart={system.toggleAutostart}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
