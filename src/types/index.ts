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
  power_limit_w: number | null;
  power_limit_min_w: number | null;
  power_limit_max_w: number | null;
  power_limit_default_w: number | null;
  clock_graphics_mhz: number | null;
  clock_graphics_max_mhz: number | null;
  clock_memory_mhz: number | null;
}

export interface DiskReading {
  device: string;
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
}

export interface DiskSpace {
  mount: string;
  total_bytes: number;
  used_bytes: number;
  avail_bytes: number;
}

export interface SwapDevice {
  name: string;
  kind: string;
  size_kib: number;
  used_kib: number;
  priority: number;
}

export interface MemoryInfo {
  total_kib: number;
  available_kib: number;
  swap_total_kib: number;
  swap_free_kib: number;
  swap_devices: SwapDevice[];
}

export interface CpuInfo {
  usage_pct: number | null;
  freq_mhz: number | null;
  governor: string | null;
}

export interface TelemetrySnapshot {
  temps: SensorReading[];
  fans: SensorReading[];
  power: SensorReading[];
  network: NetReading[];
  disks: DiskReading[];
  disk_space: DiskSpace[];
  gpu: GpuReading | null;
  memory: MemoryInfo | null;
  cpu: CpuInfo;
  uptime_secs: number | null;
}

export interface TelemetryPoint {
  time: number;
  label: string;
  temp: number;
}

export interface BrightnessInfo {
  device: string;
  current: number;
  max: number;
}

export interface RadioInfo {
  name: string;
  kind: string;
  soft_blocked: boolean;
  hard_blocked: boolean;
}

export interface BatteryHealth {
  status: string;
  capacity_pct: number;
  cycle_count: number | null;
  health_pct: number | null;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  available: boolean;
  can_install: boolean;
  release_url: string;
}
