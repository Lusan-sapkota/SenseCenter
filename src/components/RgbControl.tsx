import { useEffect, useState } from "react";
import { readControl, tauriErrorMessage, writeControl } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EFFECT_MODES = [
  { value: "0", label: "Static" },
  { value: "1", label: "Breathing" },
  { value: "2", label: "Neon" },
  { value: "3", label: "Wave" },
  { value: "4", label: "Shifting" },
  { value: "5", label: "Zoom" },
  { value: "6", label: "Meteor" },
  { value: "7", label: "Twinkling" },
];

function firstOf(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

interface RgbControlProps {
  disabled: boolean;
}

export function RgbControl({ disabled }: RgbControlProps) {
  const [zones, setZones] = useState(["#1FCBB0", "#1FCBB0", "#7A63EE", "#7A63EE"]);
  const [zoneBrightness, setZoneBrightness] = useState(100);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const [mode, setMode] = useState("3");
  const [speed, setSpeed] = useState(4);
  const [effectBrightness, setEffectBrightness] = useState(100);
  const [direction, setDirection] = useState("1");
  const [effectColor, setEffectColor] = useState("#1FCBB0");
  const [effectError, setEffectError] = useState<string | null>(null);

  useEffect(() => {
    readControl("four_zoned_kb/per_zone_mode")
      .then((value) => {
        const parts = value.trim().split(",");
        if (parts.length === 5) {
          setZones(parts.slice(0, 4).map((z) => `#${z}`));
          setZoneBrightness(Number(parts[4]) || 100);
        }
      })
      .catch(() => {
        // no current value available yet — keep defaults
      });
  }, []);

  const applyZones = async () => {
    setZoneError(null);
    const value = [...zones.map((z) => z.replace("#", "")), zoneBrightness].join(",");
    try {
      await writeControl("four_zoned_kb/per_zone_mode", value);
    } catch (err) {
      setZoneError(tauriErrorMessage(err));
    }
  };

  const applyEffect = async () => {
    setEffectError(null);
    const [r, g, b] = hexToRgb(effectColor);
    const value = [mode, speed, effectBrightness, direction, r, g, b].join(",");
    try {
      await writeControl("four_zoned_kb/four_zone_mode", value);
    } catch (err) {
      setEffectError(tauriErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyboard RGB</CardTitle>
        <CardDescription>Four-zone backlight — static colors or an animated effect.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Per-zone color</Label>
          <p className="text-xs text-muted-foreground">
            Zones follow linuwu-sense's own left-to-right order (Zone 1 → Zone 4). Not
            hardware-verified on your keyboard — set one zone to a distinct color to confirm
            which physical section it maps to.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {zones.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={color}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = [...zones];
                    next[i] = e.target.value;
                    setZones(next);
                  }}
                  className="size-9 cursor-pointer rounded-md border border-border/60 bg-transparent"
                />
                <span className="text-[10px] text-muted-foreground">Zone {i + 1}</span>
              </div>
            ))}
            <div className="flex min-w-40 items-center gap-2">
              <span className="text-xs text-muted-foreground">Brightness</span>
              <Slider
                value={[zoneBrightness]}
                onValueChange={(v) => setZoneBrightness(firstOf(v))}
                min={0}
                max={100}
                disabled={disabled}
              />
            </div>
            <Button size="sm" disabled={disabled} onClick={() => void applyZones()}>
              Apply
            </Button>
          </div>
          {zoneError && <p className="text-sm text-destructive">{zoneError}</p>}
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <Label>Effect</Label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Mode</span>
              <Select value={mode} onValueChange={(v) => v && setMode(v)} disabled={disabled}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFECT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Direction</span>
              <Select value={direction} onValueChange={(v) => v && setDirection(v)} disabled={disabled}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Right → left</SelectItem>
                  <SelectItem value="2">Left → right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              type="color"
              value={effectColor}
              disabled={disabled}
              onChange={(e) => setEffectColor(e.target.value)}
              className="size-9 cursor-pointer rounded-md border border-border/60 bg-transparent"
            />
            <div className="flex min-w-32 items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed</span>
              <Slider
                value={[speed]}
                onValueChange={(v) => setSpeed(firstOf(v))}
                min={0}
                max={9}
                disabled={disabled}
              />
            </div>
            <div className="flex min-w-32 items-center gap-2">
              <span className="text-xs text-muted-foreground">Brightness</span>
              <Slider
                value={[effectBrightness]}
                onValueChange={(v) => setEffectBrightness(firstOf(v))}
                min={0}
                max={100}
                disabled={disabled}
              />
            </div>
            <Button size="sm" disabled={disabled} onClick={() => void applyEffect()}>
              Apply
            </Button>
          </div>
          {effectError && <p className="text-sm text-destructive">{effectError}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
