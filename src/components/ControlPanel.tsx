import { memo, useEffect, useState } from "react";
import {
  Loader2,
  Monitor,
  Palette,
  Power,
  Settings2,
  Usb,
  Wind,
  Zap,
} from "lucide-react";
import { readControl, tauriErrorMessage, writeControl } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  UpdateCard,
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

const USB_CHARGING_LEVELS = [
  { value: "0", label: "Off" },
  { value: "10", label: "Up to 10% battery" },
  { value: "20", label: "Up to 20% battery" },
  { value: "30", label: "Up to 30% battery" },
];

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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/25 px-4 py-3.5 transition-all hover:border-white/10 hover:bg-black/35">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full transition-colors duration-150 ${
              checked
                ? "bg-brand-teal"
                : "bg-white/20"
            }`}
          />
          <Label htmlFor={name} className="cursor-pointer font-mono text-sm font-semibold tracking-wide text-foreground">
            {label}
          </Label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground pl-3.5">{hint}</p>
        {error && <p className="mt-1 text-xs font-mono text-rose-400 pl-3.5">{error}</p>}
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
    <div className="space-y-2.5">
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

function parseFanSpeed(value: string): { mode: FanMode; cpu: number; gpu: number } {
  const parts = value.trim().split(",");
  const cpu = Number.parseInt(parts[0] ?? "", 10);
  const gpu = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(cpu) || !Number.isFinite(gpu)) {
    return { mode: "auto", cpu: 50, gpu: 50 };
  }
  if (cpu === 0 && gpu === 0) return { mode: "auto", cpu: 50, gpu: 50 };
  if (cpu === 100 && gpu === 100) return { mode: "max", cpu: 100, gpu: 100 };
  return {
    mode: "custom",
    cpu: Math.min(100, Math.max(1, cpu)),
    gpu: Math.min(100, Math.max(1, gpu)),
  };
}

function FanControl({ disabled }: { disabled: boolean }) {
  const [cpuFan, setCpuFan] = useState(50);
  const [gpuFan, setGpuFan] = useState(50);
  const [fanMode, setFanMode] = useState<FanMode | null>(null);
  const [fanError, setFanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readControl("fan_speed")
      .then((value) => {
        if (cancelled) return;
        const parsed = parseFanSpeed(value);
        setFanMode(parsed.mode);
        setCpuFan(parsed.cpu);
        setGpuFan(parsed.gpu);
        setFanError(null);
      })
      .catch((err) => {
        if (!cancelled) setFanError(tauriErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <PanelCard
      title="Active Fan Curves & Cooling"
      description="Direct write to linuwu_sense fan_speed sysfs node"
      icon={Wind}
    >
      <div className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand-teal" />
            Querying active cooling state...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(["auto", "max", "custom"] as FanMode[]).map((mode) => {
              const isActive = fanMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  onClick={() => void setFanModeAndApply(mode)}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-colors duration-150 ${
                    isActive
                      ? mode === "max"
                        ? "border-amber-500/50 bg-[#1A1820] text-amber-300 ring-1 ring-amber-500/40"
                        : "border-brand-teal/50 bg-[#121A24] text-brand-teal ring-1 ring-brand-teal/40"
                      : "border-white/[0.06] bg-black/25 text-muted-foreground hover:border-white/15 hover:bg-black/35 hover:text-foreground"
                  } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                >
                  {mode === "auto" && <Wind className="mb-2 size-5" />}
                  {mode === "max" && <Zap className="mb-2 size-5" />}
                  {mode === "custom" && <Settings2 className="mb-2 size-5" />}
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">{mode}</span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {mode === "auto" ? "Dynamic EC" : mode === "max" ? "100% Throttle" : "Bespoke %"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {fanMode === "custom" && (
          <div className="space-y-5 rounded-xl border border-white/[0.06] bg-black/30 p-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-medium text-foreground">CPU Fan Speed Target</span>
                <span className="font-bold tabular-nums text-brand-teal">{cpuFan}%</span>
              </div>
              <Slider
                value={[cpuFan]}
                min={1}
                max={100}
                disabled={disabled}
                onValueChange={(v) => {
                  const next = firstOf(v);
                  setCpuFan(next);
                  void applyFan(next, gpuFan);
                }}
              />
            </div>
            <div className="space-y-2.5 border-t border-white/[0.05] pt-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-medium text-foreground">GPU Fan Speed Target</span>
                <span className="font-bold tabular-nums text-brand-violet">{gpuFan}%</span>
              </div>
              <Slider
                value={[gpuFan]}
                min={1}
                max={100}
                disabled={disabled}
                onValueChange={(v) => {
                  const next = firstOf(v);
                  setGpuFan(next);
                  void applyFan(cpuFan, next);
                }}
              />
            </div>
          </div>
        )}
        {fanError && <p className="font-mono text-xs text-rose-400">{fanError}</p>}
      </div>
    </PanelCard>
  );
}

export const ControlPanel = memo(function ControlPanel({ device, controlsEnabled }: ControlPanelProps) {
  const [usbValue, setUsbValue] = useState("0");
  const [usbError, setUsbError] = useState<string | null>(null);
  const system = useSystemInfo();

  useEffect(() => {
    if (!hasControl(device, "usb_charging")) return;
    readControl("usb_charging")
      .then((v) => setUsbValue(v.trim()))
      .catch((err) => setUsbError(tauriErrorMessage(err)));
  }, [device]);

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
        <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/10 font-mono text-xs text-amber-300">
          <AlertDescription>
            Controls are read-only until the kernel module is active and linuwu_sense group privileges are loaded.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="performance">
        <TabsList className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-fit">
          <TabsTrigger value="performance">
            <Zap className="size-3.5 text-brand-teal" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="power">
            <Power className="size-3.5 text-amber-400" />
            <span>Power</span>
          </TabsTrigger>
          {hasRgb && (
            <TabsTrigger value="lighting">
              <Palette className="size-3.5 text-brand-violet" />
              <span>Lighting</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="system">
            <Settings2 className="size-3.5 text-sky-400" />
            <span>System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {hasControl(device, "fan_speed") && (
            <FanControl disabled={!controlsEnabled} />
          )}

          <ThermalControl disabled={!controlsEnabled} />

          {hasControl(device, "lcd_override") && (
            <PanelCard title="Display Latency" description="Hardware LCD overdrive" icon={Monitor}>
              <ToggleGroup
                device={device}
                names={["lcd_override"]}
                controlsEnabled={controlsEnabled}
              />
            </PanelCard>
          )}
        </TabsContent>

        <TabsContent value="power" className="space-y-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {(hasControl(device, "battery_limiter") ||
            hasControl(device, "battery_calibration")) && (
            <PanelCard title="Battery Conservation" description="linuwu-sense sysfs switches">
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
              <div className="flex flex-wrap items-center gap-4">
                <Select
                  value={usbValue}
                  disabled={!controlsEnabled}
                  onValueChange={(v) => {
                    if (v) void applyUsb(v);
                  }}
                >
                  <SelectTrigger className="w-full max-w-xs font-mono text-xs border-white/10 bg-black/30">
                    <SelectValue placeholder="Select level">
                      {(v: string) => USB_CHARGING_LEVELS.find((l) => l.value === v)?.label ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0E131F] font-mono text-xs">
                    {USB_CHARGING_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="font-mono text-xs text-muted-foreground">
                  Active threshold: {USB_CHARGING_LEVELS.find((l) => l.value === usbValue)?.label ?? usbValue}
                </span>
              </div>
              {usbError && <p className="mt-2 font-mono text-xs text-rose-400">{usbError}</p>}
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
          <TabsContent value="lighting" className="space-y-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <RgbControl disabled={!controlsEnabled} />
            {hasControl(device, "backlight_timeout") && (
              <PanelCard title="Keyboard Backlight Timer" description="linuwu-sense sysfs switch">
                <ToggleGroup
                  device={device}
                  names={["backlight_timeout"]}
                  controlsEnabled={controlsEnabled}
                />
              </PanelCard>
            )}
          </TabsContent>
        )}

        <TabsContent value="system" className="space-y-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {hasControl(device, "boot_animation_sound") && (
            <PanelCard title="BIOS Audio & Chime" description="linuwu-sense sysfs switch" icon={Power}>
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
          <UpdateCard />
        </TabsContent>
      </Tabs>
    </div>
  );
});
