use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use serde::Serialize;

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize)]
pub struct SensorReading {
    pub chip: String,
    pub label: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuReading {
    pub temp_c: Option<u32>,
    pub utilization_pct: Option<u32>,
    pub memory_used_mib: Option<u64>,
    pub memory_total_mib: Option<u64>,
    pub power_w: Option<f64>,
    pub power_limit_w: Option<f64>,
    pub power_limit_min_w: Option<f64>,
    pub power_limit_max_w: Option<f64>,
    pub power_limit_default_w: Option<f64>,
    pub clock_graphics_mhz: Option<u32>,
    pub clock_graphics_max_mhz: Option<u32>,
    pub clock_memory_mhz: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NetReading {
    pub interface: String,
    pub rx_bytes_per_sec: f64,
    pub tx_bytes_per_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiskReading {
    pub device: String,
    pub read_bytes_per_sec: f64,
    pub write_bytes_per_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiskSpace {
    pub mount: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub avail_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SwapDevice {
    pub name: String,
    pub kind: String,
    pub size_kib: u64,
    pub used_kib: u64,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryInfo {
    pub total_kib: u64,
    pub available_kib: u64,
    pub swap_total_kib: u64,
    pub swap_free_kib: u64,
    pub swap_devices: Vec<SwapDevice>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuInfo {
    pub usage_pct: Option<f64>,
    pub freq_mhz: Option<f64>,
    pub governor: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TelemetrySnapshot {
    pub temps: Vec<SensorReading>,
    pub fans: Vec<SensorReading>,
    pub power: Vec<SensorReading>,
    pub network: Vec<NetReading>,
    pub disks: Vec<DiskReading>,
    pub disk_space: Vec<DiskSpace>,
    pub gpu: Option<GpuReading>,
    pub memory: Option<MemoryInfo>,
    pub cpu: CpuInfo,
    pub uptime_secs: Option<u64>,
}

fn read_trimmed(path: &Path) -> Option<String> {
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

fn read_f64(path: &Path) -> Option<f64> {
    read_trimmed(path)?.parse::<f64>().ok()
}

fn read_u64(path: &Path) -> Option<u64> {
    read_trimmed(path)?.parse::<u64>().ok()
}

fn sensor_label(dir: &Path, chip: &str, prefix: &str, index: &str) -> String {
    if chip == "acer" && prefix == "fan" {
        match index {
            "1" => return "CPU fan".to_string(),
            "2" => return "GPU fan".to_string(),
            _ => {}
        }
    }

    let label_path = dir.join(format!("{prefix}{index}_label"));
    read_trimmed(&label_path).unwrap_or_else(|| format!("{prefix}{index}"))
}

fn scan_sensors(dir: &Path, chip: &str, prefix: &str, scale: f64) -> Vec<SensorReading> {
    let mut readings = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return readings;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let Some(index) = name
            .strip_prefix(prefix)
            .and_then(|rest| rest.strip_suffix("_input"))
        else {
            continue;
        };

        if let Some(raw) = read_f64(&path) {
            readings.push(SensorReading {
                chip: chip.to_string(),
                label: sensor_label(dir, chip, prefix, index),
                value: raw * scale,
            });
        }
    }

    readings.sort_by(|a, b| a.label.cmp(&b.label));
    readings
}

pub fn read_temps_and_fans() -> AppResult<(Vec<SensorReading>, Vec<SensorReading>)> {
    let hwmon_root = Path::new("/sys/class/hwmon");
    let mut temps = Vec::new();
    let mut fans = Vec::new();

    let Ok(entries) = std::fs::read_dir(hwmon_root) else {
        return Ok((temps, fans));
    };

    for entry in entries.flatten() {
        let dir = entry.path();
        let chip = read_trimmed(&dir.join("name")).unwrap_or_else(|| {
            dir.file_name().and_then(|n| n.to_str()).unwrap_or("hwmon").to_string()
        });

        temps.extend(scan_sensors(&dir, &chip, "temp", 0.001));
        fans.extend(scan_sensors(&dir, &chip, "fan", 1.0));
    }

    Ok((temps, fans))
}

fn cpu_package_power() -> Option<SensorReading> {
    let path = Path::new("/sys/class/powercap/intel-rapl:0/energy_uj");
    let energy_uj = read_u64(path)?;

    static PREV: Mutex<Option<(Instant, u64)>> = Mutex::new(None);
    let mut prev = PREV.lock().ok()?;
    let now = Instant::now();
    let reading = prev.and_then(|(prev_time, prev_energy)| {
        let elapsed = now.duration_since(prev_time).as_secs_f64();
        if elapsed <= 0.0 || energy_uj < prev_energy {
            return None;
        }
        let watts = (energy_uj - prev_energy) as f64 / 1_000_000.0 / elapsed;
        Some(SensorReading {
            chip: "CPU".to_string(),
            label: "Package power".to_string(),
            value: watts,
        })
    });
    *prev = Some((now, energy_uj));
    reading
}

fn battery_power() -> Option<SensorReading> {
    let base = Path::new("/sys/class/power_supply");
    let entries = std::fs::read_dir(base).ok()?;

    for entry in entries.flatten() {
        let dir = entry.path();
        let name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if !name.starts_with("BAT") {
            continue;
        }

        if let Some(power_uw) = read_f64(&dir.join("power_now")) {
            return Some(SensorReading {
                chip: name,
                label: "Battery power".to_string(),
                value: power_uw / 1_000_000.0,
            });
        }

        let current_ua = read_f64(&dir.join("current_now"));
        let voltage_uv = read_f64(&dir.join("voltage_now"));
        if let (Some(current), Some(voltage)) = (current_ua, voltage_uv) {
            return Some(SensorReading {
                chip: name,
                label: "Battery power".to_string(),
                value: current * voltage / 1_000_000_000_000.0,
            });
        }
    }

    None
}

pub fn read_power(gpu_power_w: Option<f64>) -> Vec<SensorReading> {
    let mut readings = Vec::new();
    if let Some(reading) = cpu_package_power() {
        readings.push(reading);
    }
    if let Some(reading) = battery_power() {
        readings.push(reading);
    }
    if let Some(watts) = gpu_power_w {
        readings.push(SensorReading {
            chip: "GPU".to_string(),
            label: "GPU power".to_string(),
            value: watts,
        });
    }
    readings
}

pub fn read_network() -> Vec<NetReading> {
    let base = Path::new("/sys/class/net");
    let Ok(entries) = std::fs::read_dir(base) else {
        return Vec::new();
    };

    static PREV: Mutex<Option<HashMap<String, (Instant, u64, u64)>>> = Mutex::new(None);
    let now = Instant::now();
    let mut current: HashMap<String, (u64, u64)> = HashMap::new();

    for entry in entries.flatten() {
        let dir = entry.path();
        let name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.is_empty() || name == "lo" {
            continue;
        }

        let rx = read_u64(&dir.join("statistics/rx_bytes"));
        let tx = read_u64(&dir.join("statistics/tx_bytes"));
        if let (Some(rx), Some(tx)) = (rx, tx) {
            current.insert(name, (rx, tx));
        }
    }

    let Ok(mut prev_guard) = PREV.lock() else {
        return Vec::new();
    };

    let mut readings = Vec::new();
    if let Some(prev) = prev_guard.as_ref() {
        for (name, &(rx, tx)) in &current {
            if let Some(&(prev_time, prev_rx, prev_tx)) = prev.get(name) {
                let elapsed = now.duration_since(prev_time).as_secs_f64();
                if elapsed > 0.0 && rx >= prev_rx && tx >= prev_tx {
                    readings.push(NetReading {
                        interface: name.clone(),
                        rx_bytes_per_sec: (rx - prev_rx) as f64 / elapsed,
                        tx_bytes_per_sec: (tx - prev_tx) as f64 / elapsed,
                    });
                }
            }
        }
    }

    let next: HashMap<String, (Instant, u64, u64)> = current
        .into_iter()
        .map(|(name, (rx, tx))| (name, (now, rx, tx)))
        .collect();
    *prev_guard = Some(next);

    readings.sort_by(|a, b| a.interface.cmp(&b.interface));
    readings
}

pub fn read_memory() -> Option<MemoryInfo> {
    let content = std::fs::read_to_string("/proc/meminfo").ok()?;
    let mut values: HashMap<&str, u64> = HashMap::new();

    for line in content.lines() {
        let Some((key, rest)) = line.split_once(':') else {
            continue;
        };
        let Some(num) = rest.trim().split_whitespace().next() else {
            continue;
        };
        if let Ok(v) = num.parse::<u64>() {
            values.insert(key, v);
        }
    }

    Some(MemoryInfo {
        total_kib: *values.get("MemTotal")?,
        available_kib: *values.get("MemAvailable")?,
        swap_total_kib: values.get("SwapTotal").copied().unwrap_or(0),
        swap_free_kib: values.get("SwapFree").copied().unwrap_or(0),
        swap_devices: read_swap_devices(),
    })
}

fn read_swap_devices() -> Vec<SwapDevice> {
    let Ok(content) = std::fs::read_to_string("/proc/swaps") else {
        return Vec::new();
    };

    content
        .lines()
        .skip(1)
        .filter_map(|line| {
            let fields: Vec<&str> = line.split_whitespace().collect();
            Some(SwapDevice {
                name: (*fields.first()?).to_string(),
                kind: (*fields.get(1)?).to_string(),
                size_kib: fields.get(2)?.parse().ok()?,
                used_kib: fields.get(3)?.parse().ok()?,
                priority: fields.get(4)?.parse().ok()?,
            })
        })
        .collect()
}

fn parse_proc_stat_cpu_line(content: &str) -> Option<(u64, u64)> {
    let line = content.lines().next()?;
    let mut fields = line.split_whitespace();
    if fields.next()? != "cpu" {
        return None;
    }
    let values: Vec<u64> = fields.filter_map(|f| f.parse::<u64>().ok()).collect();
    if values.len() < 4 {
        return None;
    }
    let idle = values[3] + values.get(4).copied().unwrap_or(0);
    let total: u64 = values.iter().sum();
    Some((total, idle))
}

fn read_cpu_usage_pct() -> Option<f64> {
    let content = std::fs::read_to_string("/proc/stat").ok()?;
    let (total, idle) = parse_proc_stat_cpu_line(&content)?;

    static PREV: Mutex<Option<(u64, u64)>> = Mutex::new(None);
    let mut prev = PREV.lock().ok()?;
    let usage = prev.and_then(|(prev_total, prev_idle)| {
        let total_delta = total.checked_sub(prev_total)?;
        let idle_delta = idle.checked_sub(prev_idle)?;
        if total_delta == 0 {
            return None;
        }
        Some(100.0 * (1.0 - idle_delta as f64 / total_delta as f64))
    });
    *prev = Some((total, idle));
    usage
}

fn read_cpu_freq_and_governor() -> (Option<f64>, Option<String>) {
    let cpufreq_root = Path::new("/sys/devices/system/cpu");
    let Ok(entries) = std::fs::read_dir(cpufreq_root) else {
        return (None, None);
    };

    let mut freqs = Vec::new();
    let mut governor = None;

    for entry in entries.flatten() {
        let dir = entry.path();
        let Some(name) = dir.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if !name.starts_with("cpu") || name["cpu".len()..].parse::<u32>().is_err() {
            continue;
        }

        let cpufreq_dir = dir.join("cpufreq");
        if let Some(khz) = read_f64(&cpufreq_dir.join("scaling_cur_freq")) {
            freqs.push(khz);
        }
        if governor.is_none() {
            governor = read_trimmed(&cpufreq_dir.join("scaling_governor"));
        }
    }

    if freqs.is_empty() {
        return (None, governor);
    }
    let avg_mhz = (freqs.iter().sum::<f64>() / freqs.len() as f64) / 1000.0;
    (Some(avg_mhz), governor)
}

pub fn read_cpu() -> CpuInfo {
    let usage_pct = read_cpu_usage_pct();
    let (freq_mhz, governor) = read_cpu_freq_and_governor();
    CpuInfo { usage_pct, freq_mhz, governor }
}

pub fn read_uptime_secs() -> Option<u64> {
    let content = std::fs::read_to_string("/proc/uptime").ok()?;
    content.split_whitespace().next()?.split('.').next()?.parse().ok()
}

pub fn read_disk_space() -> Vec<DiskSpace> {
    let output = std::process::Command::new("df")
        .args(["-B1", "--output=size,used,avail,target", "/"])
        .output();

    let Ok(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let Some(data_line) = stdout.lines().nth(1) else {
        return Vec::new();
    };

    let fields: Vec<&str> = data_line.split_whitespace().collect();
    let (Some(total), Some(used), Some(avail), Some(mount)) =
        (fields.first(), fields.get(1), fields.get(2), fields.get(3))
    else {
        return Vec::new();
    };

    let (Ok(total_bytes), Ok(used_bytes), Ok(avail_bytes)) =
        (total.parse::<u64>(), used.parse::<u64>(), avail.parse::<u64>())
    else {
        return Vec::new();
    };

    vec![DiskSpace {
        mount: mount.to_string(),
        total_bytes,
        used_bytes,
        avail_bytes,
    }]
}

pub fn read_disks() -> Vec<DiskReading> {
    let base = Path::new("/sys/block");
    let Ok(entries) = std::fs::read_dir(base) else {
        return Vec::new();
    };

    static PREV: Mutex<Option<HashMap<String, (Instant, u64, u64)>>> = Mutex::new(None);
    let now = Instant::now();
    let mut current: HashMap<String, (u64, u64)> = HashMap::new();

    for entry in entries.flatten() {
        let dir = entry.path();
        let Some(name) = dir.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let is_real_disk = name.starts_with("nvme") || name.starts_with("sd") || name.starts_with("vd");
        if !is_real_disk {
            continue;
        }

        let Some(stat) = read_trimmed(&dir.join("stat")) else {
            continue;
        };
        let fields: Vec<&str> = stat.split_whitespace().collect();
        let sectors_read = fields.get(2).and_then(|s| s.parse::<u64>().ok());
        let sectors_written = fields.get(6).and_then(|s| s.parse::<u64>().ok());
        if let (Some(r), Some(w)) = (sectors_read, sectors_written) {
            current.insert(name.to_string(), (r * 512, w * 512));
        }
    }

    let Ok(mut prev_guard) = PREV.lock() else {
        return Vec::new();
    };

    let mut readings = Vec::new();
    if let Some(prev) = prev_guard.as_ref() {
        for (name, &(read_bytes, write_bytes)) in &current {
            if let Some(&(prev_time, prev_read, prev_write)) = prev.get(name) {
                let elapsed = now.duration_since(prev_time).as_secs_f64();
                if elapsed > 0.0 && read_bytes >= prev_read && write_bytes >= prev_write {
                    readings.push(DiskReading {
                        device: name.clone(),
                        read_bytes_per_sec: (read_bytes - prev_read) as f64 / elapsed,
                        write_bytes_per_sec: (write_bytes - prev_write) as f64 / elapsed,
                    });
                }
            }
        }
    }

    let next: HashMap<String, (Instant, u64, u64)> = current
        .into_iter()
        .map(|(name, (r, w))| (name, (now, r, w)))
        .collect();
    *prev_guard = Some(next);

    readings.sort_by(|a, b| a.device.cmp(&b.device));
    readings
}

fn nvml() -> Option<&'static nvml_wrapper::Nvml> {
    static NVML: OnceLock<Option<nvml_wrapper::Nvml>> = OnceLock::new();
    NVML.get_or_init(|| nvml_wrapper::Nvml::init().ok()).as_ref()
}

pub fn read_gpu() -> Option<GpuReading> {
    use nvml_wrapper::enum_wrappers::device::Clock;

    let gpu = nvml()?.device_by_index(0).ok()?;

    let temp_c = gpu.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).ok();
    let utilization_pct = gpu.utilization_rates().ok().map(|u| u.gpu);
    let memory = gpu.memory_info().ok();
    let power_w = gpu.power_usage().ok().map(|mw| mw as f64 / 1000.0);

    let power_limit_w = gpu.power_management_limit().ok().map(|mw| mw as f64 / 1000.0);
    let power_limit_default_w = gpu
        .power_management_limit_default()
        .ok()
        .map(|mw| mw as f64 / 1000.0);
    let constraints = gpu.power_management_limit_constraints().ok();
    let power_limit_min_w = constraints.as_ref().map(|c| c.min_limit as f64 / 1000.0);
    let power_limit_max_w = constraints.map(|c| c.max_limit as f64 / 1000.0);

    let clock_graphics_mhz = gpu.clock_info(Clock::Graphics).ok();
    let clock_graphics_max_mhz = gpu.max_clock_info(Clock::Graphics).ok();
    let clock_memory_mhz = gpu.clock_info(Clock::Memory).ok();

    Some(GpuReading {
        temp_c,
        utilization_pct,
        memory_used_mib: memory.as_ref().map(|m| m.used / (1024 * 1024)),
        memory_total_mib: memory.map(|m| m.total / (1024 * 1024)),
        power_w,
        power_limit_w,
        power_limit_min_w,
        power_limit_max_w,
        power_limit_default_w,
        clock_graphics_mhz,
        clock_graphics_max_mhz,
        clock_memory_mhz,
    })
}

pub fn snapshot() -> AppResult<TelemetrySnapshot> {
    let (temps, fans) = read_temps_and_fans().unwrap_or_default();
    let gpu = read_gpu();
    let power = read_power(gpu.as_ref().and_then(|g| g.power_w));
    let network = read_network();
    let disks = read_disks();
    let disk_space = read_disk_space();
    let memory = read_memory();
    let cpu = read_cpu();
    let uptime_secs = read_uptime_secs();

    Ok(TelemetrySnapshot {
        temps,
        fans,
        power,
        network,
        disks,
        disk_space,
        gpu,
        memory,
        cpu,
        uptime_secs,
    })
}
