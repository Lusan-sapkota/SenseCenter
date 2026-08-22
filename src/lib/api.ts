import { invoke } from "@tauri-apps/api/core";
import type { StartupStatus, TelemetrySnapshot } from "@/types";

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
