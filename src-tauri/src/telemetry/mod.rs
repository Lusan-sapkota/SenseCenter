use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize)]
pub struct HwmonReading {
    pub label: String,
    pub temp_c: Option<f64>,
    pub fan_rpm: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuReading {
    pub temp_c: Option<u32>,
    pub utilization_pct: Option<u32>,
    pub memory_used_mib: Option<u64>,
    pub memory_total_mib: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TelemetrySnapshot {
    pub hwmon: Vec<HwmonReading>,
    pub gpu: Option<GpuReading>,
}

pub fn read_hwmon() -> AppResult<Vec<HwmonReading>> {
    let hwmon_root = Path::new("/sys/class/hwmon");
    let mut readings = Vec::new();

    let entries = std::fs::read_dir(hwmon_root).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            AppError::Other("hwmon interface not available".into())
        } else {
            AppError::Io(e)
        }
    })?;

    for entry in entries.flatten() {
        let hwmon_dir = entry.path();
        let name = read_optional_string(&hwmon_dir.join("name")).unwrap_or_else(|_| {
            hwmon_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("hwmon")
                .to_string()
        });

        let temp_c = find_first_input(&hwmon_dir, "temp", "_input")
            .and_then(|p| read_optional_string(&p).ok())
            .and_then(|v| v.parse::<f64>().ok())
            .map(|millideg| millideg / 1000.0);

        let fan_rpm = find_first_input(&hwmon_dir, "fan", "_input")
            .and_then(|p| read_optional_string(&p).ok())
            .and_then(|v| v.parse::<u64>().ok());

        if temp_c.is_some() || fan_rpm.is_some() {
            readings.push(HwmonReading {
                label: name,
                temp_c,
                fan_rpm,
            });
        }
    }

    Ok(readings)
}

pub fn read_gpu() -> Option<GpuReading> {
    let device = nvml_wrapper::Nvml::init().ok()?;
    let gpu = device.device_by_index(0).ok()?;

    let temp_c = gpu.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).ok();
    let utilization_pct = gpu
        .utilization_rates()
        .ok()
        .map(|u| u.gpu);
    let memory = gpu.memory_info().ok();

    Some(GpuReading {
        temp_c,
        utilization_pct,
        memory_used_mib: memory.as_ref().map(|m| m.used / (1024 * 1024)),
        memory_total_mib: memory.map(|m| m.total / (1024 * 1024)),
    })
}

pub fn snapshot() -> AppResult<TelemetrySnapshot> {
    Ok(TelemetrySnapshot {
        hwmon: read_hwmon().unwrap_or_default(),
        gpu: read_gpu(),
    })
}

fn read_optional_string(path: &Path) -> AppResult<String> {
    Ok(std::fs::read_to_string(path)?.trim().to_string())
}

fn find_first_input(dir: &Path, prefix: &str, suffix: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    let mut matches: Vec<PathBuf> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with(prefix) && n.ends_with(suffix))
        })
        .collect();

    matches.sort();
    matches.into_iter().next()
}
