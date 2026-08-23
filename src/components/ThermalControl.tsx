import { useEffect, useState } from "react";
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

export function ThermalControl({ disabled }: ThermalControlProps) {
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
      title="Thermal Profile"
      description="Kernel platform-profile switch for models without a physical performance key"
      icon={Flame}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const active = current === profile;
          const Icon = profileIcons[profile] ?? Settings;
          return (
            <button
              key={profile}
              type="button"
              disabled={disabled}
              onClick={() => void onSelect(profile)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                active
                  ? "border-brand-violet/50 bg-gradient-to-r from-brand-teal/10 to-brand-violet/10 ring-1 ring-brand-violet/30"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  active
                    ? "bg-brand-violet/20 text-brand-violet"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{titleCase(profile)}</p>
                {active && (
                  <p className="text-[10px] text-brand-teal">Active</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </PanelCard>
  );
}
