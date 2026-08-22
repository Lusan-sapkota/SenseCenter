use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
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
}

#[derive(Debug, Clone, Serialize)]
pub struct NetReading {
    pub interface: String,
    pub rx_bytes_per_sec: f64,
    pub tx_bytes_per_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TelemetrySnapshot {
    pub temps: Vec<SensorReading>,
    pub fans: Vec<SensorReading>,
    pub power: Vec<SensorReading>,
    pub network: Vec<NetReading>,
    pub gpu: Option<GpuReading>,
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

fn sensor_label(dir: &Path, prefix: &str, index: &str) -> String {
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
                label: sensor_label(dir, prefix, index),
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

pub fn read_gpu() -> Option<GpuReading> {
    let nvml = nvml_wrapper::Nvml::init().ok()?;
    let gpu = nvml.device_by_index(0).ok()?;

    let temp_c = gpu.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).ok();
    let utilization_pct = gpu.utilization_rates().ok().map(|u| u.gpu);
    let memory = gpu.memory_info().ok();
    let power_w = gpu.power_usage().ok().map(|mw| mw as f64 / 1000.0);

    Some(GpuReading {
        temp_c,
        utilization_pct,
        memory_used_mib: memory.as_ref().map(|m| m.used / (1024 * 1024)),
        memory_total_mib: memory.map(|m| m.total / (1024 * 1024)),
        power_w,
    })
}

pub fn snapshot() -> AppResult<TelemetrySnapshot> {
    let (temps, fans) = read_temps_and_fans().unwrap_or_default();
    let gpu = read_gpu();
    let power = read_power(gpu.as_ref().and_then(|g| g.power_w));
    let network = read_network();

    Ok(TelemetrySnapshot {
        temps,
        fans,
        power,
        network,
        gpu,
    })
}
