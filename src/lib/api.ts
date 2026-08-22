import { invoke } from "@tauri-apps/api/core";
import type { FirmwareDevice, StartupStatus, TelemetrySnapshot } from "@/types";

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

export async function writeControl(name: string, value: string): Promise<void> {
  return invoke("write_control", { name, value });
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
