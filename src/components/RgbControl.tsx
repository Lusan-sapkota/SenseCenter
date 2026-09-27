import { memo, useEffect, useState } from "react";
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

const PRESET_COLORS = [
  { label: "Teal", color: "#00E5BE" },
  { label: "Violet", color: "#8065FF" },
  { label: "Sky", color: "#38BDF8" },
  { label: "Red", color: "#EF4444" },
  { label: "Gold", color: "#F59E0B" },
  { label: "Ice", color: "#E0F2FE" },
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

const KeyboardDeckPreview = memo(function KeyboardDeckPreview({ zones }: { zones: string[] }) {
  const zoneNames = ["Zone 1 · WASD / Esc", "Zone 2 · Center Left", "Zone 3 · Center Right", "Zone 4 · Numpad"];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#06080E] p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        <span>PREDATOR 4-ZONE BACKLIT MATRIX</span>
        <span>RGB TELEMETRY</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {zones.map((color, i) => (
          <div
            key={i}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#0C1019] p-3 transition-colors duration-150"
            style={{
              borderColor: `${color}50`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/70">
                Z{i + 1}
              </span>
              <span
                className="size-2 rounded-full"
                style={{
                  background: color,
                }}
              />
            </div>
            <div className="my-3 grid grid-cols-3 gap-1 opacity-70">
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/10" />
              <div
                className="h-4 rounded"
                style={{
                  background: color,
                }}
              />
              <div className="h-4 rounded bg-white/10" />
            </div>
            <div className="truncate font-mono text-[10px] text-muted-foreground/80">
              {zoneNames[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const RgbControl = memo(function RgbControl({ disabled }: RgbControlProps) {
  const [zones, setZones] = useState(["#00E5BE", "#00E5BE", "#8065FF", "#8065FF"]);
  const [zoneBrightness, setZoneBrightness] = useState(100);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const [mode, setMode] = useState("3");
  const [speed, setSpeed] = useState(4);
  const [effectBrightness, setEffectBrightness] = useState(100);
  const [direction, setDirection] = useState("1");
  const [effectColor, setEffectColor] = useState("#00E5BE");
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

  const applyPresetToAll = (color: string) => {
    setZones([color, color, color, color]);
  };

  return (
    <PanelCard
      title="Four-Zone Keyboard RGB"
      description="Direct sysfs lighting engine  independent zones and hardware effects"
      icon={Palette}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Zone Illumination Deck
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase mr-1">Presets:</span>
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  title={`Apply ${p.label} to all zones`}
                  disabled={disabled}
                  onClick={() => applyPresetToAll(p.color)}
                  className="size-4 rounded-full border border-white/20 transition-transform hover:scale-125 focus-visible:outline-none"
                  style={{ background: p.color }}
                />
              ))}
            </div>
          </div>

          <KeyboardDeckPreview zones={zones} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {zones.map((color, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-2.5 transition-colors hover:border-white/15"
              >
                <div
                  className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-white/20 shadow-md"
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
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-foreground">Zone {i + 1}</p>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{color}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex min-w-48 flex-1 items-center gap-3">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">Backlight Brightness</span>
              <Slider
                value={[zoneBrightness]}
                onValueChange={(v) => setZoneBrightness(firstOf(v))}
                min={0}
                max={100}
                disabled={disabled}
              />
              <span className="w-10 shrink-0 font-mono text-xs font-bold tabular-nums text-brand-teal">
                {zoneBrightness}%
              </span>
            </div>
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => void applyZones()}
              className="bg-brand-teal text-black hover:bg-brand-teal/90 font-mono text-xs tracking-wider"
            >
              Apply Static
            </Button>
          </div>
          {zoneError && <p className="font-mono text-xs text-rose-400">{zoneError}</p>}
        </div>

        <div className="space-y-4 border-t border-white/[0.06] pt-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-violet" />
            <Label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Animated Hardware Effects
            </Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <span className="font-mono text-xs text-muted-foreground">Animation Pattern</span>
              <Select value={mode} onValueChange={(v) => v && setMode(v)} disabled={disabled}>
                <SelectTrigger className="font-mono text-xs border-white/10 bg-black/30">
                  <SelectValue>
                    {(v: string) => EFFECT_MODES.find((m) => m.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0E131F] font-mono text-xs">
                  {EFFECT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-xs text-muted-foreground">Wave Direction</span>
              <Select
                value={direction}
                onValueChange={(v) => v && setDirection(v)}
                disabled={disabled}
              >
                <SelectTrigger className="font-mono text-xs border-white/10 bg-black/30">
                  <SelectValue>
                    {(v: string) => DIRECTIONS.find((d) => d.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0E131F] font-mono text-xs">
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-xs text-muted-foreground">Effect Color</span>
              <div
                className="relative h-9 w-full overflow-hidden rounded-lg border border-white/20 shadow-inner"
                style={{ background: effectColor }}
              >
                <input
                  type="color"
                  value={effectColor}
                  disabled={disabled}
                  onChange={(e) => setEffectColor(e.target.value)}
                  className="size-full cursor-pointer opacity-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>Speed ({speed})</span>
                <span>Brightness ({effectBrightness}%)</span>
              </div>
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
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => void applyEffect()}
              className="bg-brand-violet text-white hover:bg-brand-violet/90 font-mono text-xs tracking-wider"
            >
              Apply Animated Effect
            </Button>
          </div>
          {effectError && <p className="font-mono text-xs text-rose-400">{effectError}</p>}
        </div>
      </div>
    </PanelCard>
  );
});
