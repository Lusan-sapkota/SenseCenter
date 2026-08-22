import { useEffect, useState } from "react";
import {
  getThermalProfile,
  listThermalProfiles,
  setThermalProfile,
  tauriErrorMessage,
  thermalIsAvailable,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ThermalControlProps {
  disabled: boolean;
}

function titleCase(profile: string) {
  return profile.charAt(0).toUpperCase() + profile.slice(1).replace(/-/g, " ");
}

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
    <Card>
      <CardHeader>
        <CardTitle>Thermal profile</CardTitle>
        <CardDescription>
          Kernel platform-profile switch — useful on models without a physical
          performance key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <RadioGroup
          value={current ?? undefined}
          onValueChange={(v) => v && void onSelect(v)}
          disabled={disabled}
          className="flex flex-wrap gap-4"
        >
          {profiles.map((profile) => (
            <label key={profile} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={profile} />
              <Label className="cursor-pointer">{titleCase(profile)}</Label>
            </label>
          ))}
        </RadioGroup>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
