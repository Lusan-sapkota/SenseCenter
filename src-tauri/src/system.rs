use crate::error::{AppError, AppResult};

const BACKLIGHT_DIR: &str = "/sys/class/backlight";
const RFKILL_DIR: &str = "/sys/class/rfkill";
const POWER_SUPPLY_DIR: &str = "/sys/class/power_supply";

fn read_trimmed(path: &std::path::Path) -> Option<String> {
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct BrightnessInfo {
    pub device: String,
    pub current: u32,
    pub max: u32,
}

pub fn read_brightness() -> Option<BrightnessInfo> {
    let entries = std::fs::read_dir(BACKLIGHT_DIR).ok()?;
    for entry in entries.flatten() {
        let dir = entry.path();
        let current = read_trimmed(&dir.join("brightness"))?.parse::<u32>().ok()?;
        let max = read_trimmed(&dir.join("max_brightness"))?.parse::<u32>().ok()?;
        let device = dir.file_name()?.to_str()?.to_string();
        return Some(BrightnessInfo { device, current, max });
    }
    None
}

pub fn set_brightness(device: &str, value: u32) -> AppResult<()> {
    let path = std::path::Path::new(BACKLIGHT_DIR).join(device).join("brightness");
    std::fs::write(&path, value.to_string()).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            AppError::PermissionDenied(path.display().to_string())
        } else {
            AppError::Io(e)
        }
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RadioInfo {
    pub name: String,
    pub kind: String,
    pub soft_blocked: bool,
    pub hard_blocked: bool,
}

pub fn read_radios() -> Vec<RadioInfo> {
    let mut radios = Vec::new();
    let Ok(entries) = std::fs::read_dir(RFKILL_DIR) else {
        return radios;
    };

    for entry in entries.flatten() {
        let dir = entry.path();
        let Some(name) = read_trimmed(&dir.join("name")) else {
            continue;
        };
        let kind = read_trimmed(&dir.join("type")).unwrap_or_else(|| "unknown".to_string());
        let soft_blocked = read_trimmed(&dir.join("soft")).as_deref() == Some("1");
        let hard_blocked = read_trimmed(&dir.join("hard")).as_deref() == Some("1");
        radios.push(RadioInfo { name, kind, soft_blocked, hard_blocked });
    }

    radios.sort_by(|a, b| a.name.cmp(&b.name));
    radios
}

pub fn set_radio_blocked(name: &str, blocked: bool) -> AppResult<()> {
    let entries = std::fs::read_dir(RFKILL_DIR)?;
    for entry in entries.flatten() {
        let dir = entry.path();
        if read_trimmed(&dir.join("name")).as_deref() == Some(name) {
            let path = dir.join("soft");
            return std::fs::write(&path, if blocked { "1" } else { "0" }).map_err(|e| {
                if e.kind() == std::io::ErrorKind::PermissionDenied {
                    AppError::PermissionDenied(path.display().to_string())
                } else {
                    AppError::Io(e)
                }
            });
        }
    }
    Err(AppError::Other(format!("radio '{name}' not found")))
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct BatteryHealth {
    pub status: String,
    pub capacity_pct: u32,
    pub cycle_count: Option<u32>,
    pub health_pct: Option<u32>,
}

pub fn read_battery_health() -> Option<BatteryHealth> {
    let entries = std::fs::read_dir(POWER_SUPPLY_DIR).ok()?;
    for entry in entries.flatten() {
        let dir = entry.path();
        let name = dir.file_name()?.to_str()?.to_string();
        if !name.starts_with("BAT") {
            continue;
        }

        let status = read_trimmed(&dir.join("status")).unwrap_or_else(|| "Unknown".to_string());
        let capacity_pct = read_trimmed(&dir.join("capacity"))
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);
        let cycle_count = read_trimmed(&dir.join("cycle_count")).and_then(|s| s.parse::<u32>().ok());

        let full_now = read_trimmed(&dir.join("charge_full")).and_then(|s| s.parse::<f64>().ok());
        let full_design =
            read_trimmed(&dir.join("charge_full_design")).and_then(|s| s.parse::<f64>().ok());
        let health_pct = match (full_now, full_design) {
            (Some(now), Some(design)) if design > 0.0 => Some(((now / design) * 100.0) as u32),
            _ => None,
        };

        return Some(BatteryHealth { status, capacity_pct, cycle_count, health_pct });
    }
    None
}
