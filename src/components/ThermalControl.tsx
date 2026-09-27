import { memo, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Flame, Leaf, Scale, Settings, VolumeX, Zap } from "lucide-react";
import {
  getThermalProfile,
  listThermalProfiles,
  setThermalProfile,
  tauriErrorMessage,
  thermalIsAvailable,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { PanelCard } from "@/components/layout/AppShell";

interface ThermalControlProps {
  disabled: boolean;
}

function titleCase(profile: string) {
  return profile.charAt(0).toUpperCase() + profile.slice(1).replace(/-/g, " ");
}

const profileIcons: Record<string, LucideIcon> = {
  "power-saver": Leaf,
  balanced: Scale,
  performance: Zap,
  quiet: VolumeX,
};

const profileAccents: Record<string, { color: string; border: string }> = {
  "power-saver": { color: "text-emerald-400", border: "border-emerald-500/40" },
  balanced: { color: "text-brand-teal", border: "border-brand-teal/40" },
  performance: { color: "text-amber-400", border: "border-amber-500/40" },
  quiet: { color: "text-sky-400", border: "border-sky-500/40" },
};

export const ThermalControl = memo(function ThermalControl({ disabled }: ThermalControlProps) {
  const [available, setAvailable] = useState(false);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    thermalIsAvailable().then(async (ok) => {
      setAvailable(ok);
      if (!ok) return;
      try {
        const [list, active] = await Promise.all([
          listThermalProfiles(),
          getThermalProfile(),
        ]);
        setProfiles(list);
        setCurrent(active);
      } catch (err) {
        setError(tauriErrorMessage(err));
      }
    });
  }, []);

  if (!available) return null;

  const onSelect = async (profile: string) => {
    setError(null);
    const prev = current;
    setCurrent(profile);
    try {
      await setThermalProfile(profile);
    } catch (err) {
      setCurrent(prev);
      setError(tauriErrorMessage(err));
    }
  };

  return (
    <PanelCard
      title="Platform Thermal Profile"
      description="Linux ACPI platform-profile switch for CPU/GPU governor and cooling tables"
      icon={Flame}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const active = current === profile;
          const Icon = profileIcons[profile] ?? Settings;
          const styling = profileAccents[profile] ?? {
            color: "text-brand-violet",
            border: "border-brand-violet/40",
          };

          return (
            <button
              key={profile}
              type="button"
              disabled={disabled}
              onClick={() => void onSelect(profile)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 text-left transition-colors duration-150 select-none",
                active
                  ? cn("bg-[#141A27] ring-1", styling.border)
                  : "border-white/[0.06] bg-black/25 hover:border-white/15 hover:bg-black/35",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150",
                  active
                    ? cn("bg-black/40", styling.color, styling.border)
                    : "border-white/[0.06] bg-white/[0.03] text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  {titleCase(profile)}
                </p>
                {active ? (
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase text-brand-teal">
                    <span className="size-1.5 rounded-full bg-brand-teal" />
                    ACTIVE PROFILE
                  </div>
                ) : (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">Select Profile</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 font-mono text-xs text-rose-400">{error}</p>}
    </PanelCard>
  );
});
