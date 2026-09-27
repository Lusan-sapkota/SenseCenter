import { invoke } from "@tauri-apps/api/core";
import type {
  BatteryHealth,
  BrightnessInfo,
  FirmwareDevice,
  RadioInfo,
  StartupStatus,
  TelemetrySnapshot,
  UpdateInfo,
} from "@/types";

export function tauriErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function getStartupStatus(): Promise<StartupStatus> {
  return invoke<StartupStatus>("get_startup_status");
}

export async function readControl(name: string): Promise<string> {
  return invoke<string>("read_control", { name });
}

const SAVED_CONTROLS_KEY = "sensecenter:saved-controls";
const LAST_RESTORE_BOOT_KEY = "sensecenter:last-restore-boot";
const ONE_SHOT_CONTROLS = new Set(["battery_calibration"]);

function savedControls(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_CONTROLS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export async function writeControl(name: string, value: string): Promise<void> {
  await invoke("write_control", { name, value });
  if (ONE_SHOT_CONTROLS.has(name)) return;
  try {
    localStorage.setItem(SAVED_CONTROLS_KEY, JSON.stringify({ ...savedControls(), [name]: value }));
  } catch {
    // settings just won't survive a reboot
  }
}

// Reapplies saved controls once per boot, so Fn-key changes made later in the session aren't reverted.
export async function restoreSavedControls(): Promise<void> {
  const bootId = await invoke<string>("get_boot_id").catch(() => "");
  try {
    if (!bootId || localStorage.getItem(LAST_RESTORE_BOOT_KEY) === bootId) return;
    localStorage.setItem(LAST_RESTORE_BOOT_KEY, bootId);
  } catch {
    return;
  }
  for (const [name, value] of Object.entries(savedControls())) {
    await invoke("write_control", { name, value }).catch(() => undefined);
  }
}

export async function getTelemetry(): Promise<TelemetrySnapshot> {
  return invoke<TelemetrySnapshot>("get_telemetry");
}

export async function listFirmwareDevices(): Promise<FirmwareDevice[]> {
  return invoke<FirmwareDevice[]>("list_firmware_devices");
}

export async function triggerFirmwareUpdate(deviceId: string): Promise<string> {
  return invoke<string>("trigger_firmware_update", { deviceId });
}

export async function thermalIsAvailable(): Promise<boolean> {
  return invoke<boolean>("thermal_is_available");
}

export async function listThermalProfiles(): Promise<string[]> {
  return invoke<string[]>("list_thermal_profiles");
}

export async function getThermalProfile(): Promise<string> {
  return invoke<string>("get_thermal_profile");
}

export async function setThermalProfile(profile: string): Promise<void> {
  return invoke("set_thermal_profile", { profile });
}

export async function getBrightness(): Promise<BrightnessInfo | null> {
  return invoke<BrightnessInfo | null>("get_brightness");
}

export async function setBrightness(device: string, value: number): Promise<void> {
  return invoke("set_brightness", { device, value });
}

export async function listRadios(): Promise<RadioInfo[]> {
  return invoke<RadioInfo[]>("list_radios");
}

export async function setRadioBlocked(name: string, blocked: boolean): Promise<void> {
  return invoke("set_radio_blocked", { name, blocked });
}

export async function getBatteryHealth(): Promise<BatteryHealth | null> {
  return invoke<BatteryHealth | null>("get_battery_health");
}

export async function getSecurityId(): Promise<string> {
  return invoke<string>("get_security_id");
}

export async function unlockPrivileged(): Promise<void> {
  return invoke("unlock_privileged");
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>("check_for_update");
}

export async function installUpdate(): Promise<void> {
  return invoke("install_update");
}
