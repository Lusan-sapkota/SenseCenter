use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};

const PREDATOR_SENSE: &str = "/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense";
const NITRO_SENSE: &str = "/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense";
const FOUR_ZONED_KB: &str = "/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/four_zoned_kb";

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductLine {
    Predator,
    Nitro,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub product_name: String,
    pub product_line: ProductLine,
    pub sense_base_path: PathBuf,
    pub available_controls: Vec<String>,
}

pub fn read_product_name() -> AppResult<String> {
    Ok(std::fs::read_to_string("/sys/class/dmi/id/product_name")?
        .trim()
        .to_string())
}

pub fn is_module_loaded() -> bool {
    Path::new("/sys/module/linuwu_sense").exists()
}

fn detect_product_line(product_name: &str) -> ProductLine {
    let lower = product_name.to_lowercase();
    if lower.contains("nitro") {
        ProductLine::Nitro
    } else {
        ProductLine::Predator
    }
}

fn sense_base_path(product_line: ProductLine) -> PathBuf {
    match product_line {
        ProductLine::Predator => PathBuf::from(PREDATOR_SENSE),
        ProductLine::Nitro => PathBuf::from(NITRO_SENSE),
    }
}

fn probe_available_controls(base: &Path) -> Vec<String> {
    let mut controls = Vec::new();

    if !base.is_dir() {
        return controls;
    }

    if let Ok(entries) = std::fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    controls.push(name.to_string());
                }
            } else if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    controls.push(format!("{name}/"));
                }
            }
        }
    }

    controls.sort();
    controls
}

pub fn detect_device() -> AppResult<DeviceInfo> {
    if !is_module_loaded() {
        return Err(AppError::ModuleNotLoaded);
    }

    let product_name = read_product_name()?;
    let product_line = detect_product_line(&product_name);
    let sense_base_path = sense_base_path(product_line);

    if !sense_base_path.is_dir() {
        return Err(AppError::SysfsNotFound(sense_base_path.display().to_string()));
    }

    let mut available_controls = probe_available_controls(&sense_base_path);
    if Path::new(FOUR_ZONED_KB).is_dir() {
        available_controls.push("four_zoned_kb/".to_string());
        available_controls.sort();
    }

    Ok(DeviceInfo {
        product_name,
        product_line,
        sense_base_path,
        available_controls,
    })
}
