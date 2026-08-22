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
  lm_sensors_installed: boolean;
  missing_dependencies: string[];
  repo_url: string;
}

export interface FirmwareDevice {
  id: string;
  name: string;
  vendor: string | null;
  version: string | null;
  update_available: boolean;
}

export interface SensorReading {
  chip: string;
  label: string;
  value: number;
}

export interface NetReading {
  interface: string;
  rx_bytes_per_sec: number;
  tx_bytes_per_sec: number;
}

export interface GpuReading {
  temp_c: number | null;
  utilization_pct: number | null;
  memory_used_mib: number | null;
  memory_total_mib: number | null;
  power_w: number | null;
}

export interface TelemetrySnapshot {
  temps: SensorReading[];
  fans: SensorReading[];
  power: SensorReading[];
  network: NetReading[];
  gpu: GpuReading | null;
}

export interface TelemetryPoint {
  time: number;
  label: string;
  temp: number;
}
