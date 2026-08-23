import { useEffect, useState } from "react";
import { Palette, Sparkles } from "lucide-react";
import { readControl, tauriErrorMessage, writeControl } from "@/lib/api";
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
import { PanelCard } from "@/components/layout/AppShell";

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

const DIRECTIONS = [
  { value: "1", label: "Right → left" },
  { value: "2", label: "Left → right" },
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

function KeyboardPreview({ zones }: { zones: string[] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted/40 p-3">
      {zones.map((color, i) => (
        <div
          key={i}
          className="h-8 flex-1 rounded-md transition-all duration-300"
          style={{
            background: color,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
      ))}
    </div>
  );
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
      .catch(() => undefined);
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
    <PanelCard
      title="Keyboard RGB"
      description="Four-zone backlight  static per-zone colors or animated effects"
      icon={Palette}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Per-zone static color
          </Label>
          <KeyboardPreview zones={zones} />
          <div className="flex flex-wrap items-end gap-4">
            {zones.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className="relative overflow-hidden rounded-lg ring-2 ring-border/60 transition-all hover:ring-brand-teal/50"
                  style={{ background: color }}
                >
                  <input
                    type="color"
                    value={color}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...zones];
                      next[i] = e.target.value;
                      setZones(next);
                    }}
                    className="size-12 cursor-pointer opacity-0"
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Zone {i + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-48 flex-1 items-center gap-3">
              <span className="shrink-0 text-xs text-muted-foreground">Brightness</span>
              <Slider
                value={[zoneBrightness]}
                onValueChange={(v) => setZoneBrightness(firstOf(v))}
                min={0}
                max={100}
                disabled={disabled}
              />
              <span className="w-8 shrink-0 font-mono text-xs tabular-nums">
                {zoneBrightness}
              </span>
            </div>
            <Button size="sm" disabled={disabled} onClick={() => void applyZones()}>
              Apply static
            </Button>
          </div>
          {zoneError && <p className="text-sm text-destructive">{zoneError}</p>}
        </div>

        <div className="space-y-4 border-t border-border/40 pt-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-violet" />
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Animated effect
            </Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Mode</span>
              <Select value={mode} onValueChange={(v) => v && setMode(v)} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => EFFECT_MODES.find((m) => m.value === v)?.label ?? v}
                  </SelectValue>
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
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Direction</span>
              <Select
                value={direction}
                onValueChange={(v) => v && setDirection(v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => DIRECTIONS.find((d) => d.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Effect color</span>
              <div
                className="relative overflow-hidden rounded-lg ring-1 ring-border/60"
                style={{ background: effectColor }}
              >
                <input
                  type="color"
                  value={effectColor}
                  disabled={disabled}
                  onChange={(e) => setEffectColor(e.target.value)}
                  className="h-9 w-full cursor-pointer opacity-0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Speed · Brightness</span>
              <div className="space-y-2">
                <Slider
                  value={[speed]}
                  onValueChange={(v) => setSpeed(firstOf(v))}
                  min={0}
                  max={9}
                  disabled={disabled}
                />
                <Slider
                  value={[effectBrightness]}
                  onValueChange={(v) => setEffectBrightness(firstOf(v))}
                  min={0}
                  max={100}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          <Button size="sm" disabled={disabled} onClick={() => void applyEffect()}>
            Apply effect
          </Button>
          {effectError && <p className="text-sm text-destructive">{effectError}</p>}
        </div>
      </div>
    </PanelCard>
  );
}
