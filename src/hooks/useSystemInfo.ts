import { useEffect, useState } from "react";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import {
  getBatteryHealth,
  getBrightness,
  listRadios,
  setBrightness,
  setRadioBlocked,
  tauriErrorMessage,
} from "@/lib/api";
import type { BatteryHealth, BrightnessInfo, RadioInfo } from "@/types";

function firstOf(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function useSystemInfo() {
  const [brightness, setBrightnessState] = useState<BrightnessInfo | null>(null);
  const [brightnessError, setBrightnessError] = useState<string | null>(null);
  const [radios, setRadios] = useState<RadioInfo[]>([]);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryHealth | null>(null);
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [autostartError, setAutostartError] = useState<string | null>(null);

  useEffect(() => {
    getBrightness().then(setBrightnessState).catch(() => undefined);
    listRadios().then(setRadios).catch(() => undefined);
    getBatteryHealth().then(setBattery).catch(() => undefined);
    isAutostartEnabled().then(setAutostart).catch(() => undefined);
  }, []);

  const toggleAutostart = async (next: boolean) => {
    setAutostartError(null);
    setAutostart(next);
    try {
      if (next) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
    } catch (err) {
      setAutostart(!next);
      setAutostartError(tauriErrorMessage(err));
    }
  };

  const applyBrightness = async (value: number) => {
    if (!brightness) return;
    setBrightnessState({ ...brightness, current: value });
    setBrightnessError(null);
    try {
      await setBrightness(brightness.device, value);
    } catch (err) {
      setBrightnessError(tauriErrorMessage(err));
    }
  };

  const toggleRadio = async (radio: RadioInfo) => {
    setRadioError(null);
    const next = !radio.soft_blocked;
    setRadios((prev) =>
      prev.map((r) => (r.name === radio.name ? { ...r, soft_blocked: next } : r)),
    );
    try {
      await setRadioBlocked(radio.name, next);
    } catch (err) {
      setRadios((prev) =>
        prev.map((r) => (r.name === radio.name ? { ...r, soft_blocked: radio.soft_blocked } : r)),
      );
      setRadioError(`${radio.name}: ${tauriErrorMessage(err)}`);
    }
  };

  return {
    brightness,
    brightnessError,
    applyBrightness: (v: number | readonly number[]) => void applyBrightness(firstOf(v)),
    radios,
    radioError,
    toggleRadio: (radio: RadioInfo) => void toggleRadio(radio),
    battery,
    autostart,
    autostartError,
    toggleAutostart: (next: boolean) => void toggleAutostart(next),
  };
}
