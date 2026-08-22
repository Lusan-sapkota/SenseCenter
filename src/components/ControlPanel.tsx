import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RgbControl } from "@/components/RgbControl";
import { ThermalControl } from "@/components/ThermalControl";
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

const FAN_PRESETS = [
  { label: "Auto", value: "0,0" },
  { label: "Max", value: "100,100" },
];

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

export function ControlPanel({ device, controlsEnabled }: ControlPanelProps) {
  const [fanValue, setFanValue] = useState("0,0");
  const [fanLoading, setFanLoading] = useState(false);
  const [fanError, setFanError] = useState<string | null>(null);
  const [usbValue, setUsbValue] = useState("0");
  const [usbError, setUsbError] = useState<string | null>(null);

  const loadFan = useCallback(async () => {
    if (!hasControl(device, "fan_speed")) return;
    setFanLoading(true);
    try {
      // fan_speed is write-only; keep last preset selection in UI
      setFanError(null);
    } catch (err) {
      setFanError(tauriErrorMessage(err));
    } finally {
      setFanLoading(false);
    }
  }, [device]);

  useEffect(() => {
    if (!hasControl(device, "usb_charging")) return;
    readControl("usb_charging")
      .then((v) => setUsbValue(v.trim()))
      .catch((err) => setUsbError(tauriErrorMessage(err)));
  }, [device]);

  useEffect(() => {
    void loadFan();
  }, [loadFan]);

  const applyFan = async (value: string) => {
    setFanError(null);
    setFanValue(value);
    try {
      await writeControl("fan_speed", value);
    } catch (err) {
      setFanError(tauriErrorMessage(err));
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
            <CardDescription>
              Write-only control — format <code className="text-xs">cpu,gpu</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {FAN_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={fanValue === preset.value ? "default" : "outline"}
                  size="sm"
                  disabled={!controlsEnabled || fanLoading}
                  onClick={() => void applyFan(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={fanValue}
                onChange={(e) => setFanValue(e.target.value)}
                placeholder="50,70"
                disabled={!controlsEnabled}
              />
              <Button
                variant="secondary"
                disabled={!controlsEnabled}
                onClick={() => void applyFan(fanValue)}
              >
                Apply
              </Button>
            </div>
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
    </div>
  );
}
