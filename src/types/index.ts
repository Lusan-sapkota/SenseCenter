export type ProductLine = "predator" | "nitro";

export interface DeviceInfo {
  product_name: string;
  product_line: ProductLine;
  sense_base_path: string;
  available_controls: string[];
}

export interface StartupStatus {
  module_loaded: boolean;
  in_linuwu_sense_group: boolean;
  device: DeviceInfo | null;
  fwupd_available: boolean;
}

export interface HwmonReading {
  label: string;
  temp_c: number | null;
  fan_rpm: number | null;
}

export interface GpuReading {
  temp_c: number | null;
  utilization_pct: number | null;
  memory_used_mib: number | null;
  memory_total_mib: number | null;
}

export interface TelemetrySnapshot {
  hwmon: HwmonReading[];
  gpu: GpuReading | null;
}

export interface TelemetryPoint {
  time: number;
  label: string;
  temp: number;
}
