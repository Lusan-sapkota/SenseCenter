mod deps;
mod error;
mod fwupd;
mod model;
mod permissions;
mod sysfs;
mod telemetry;
mod thermal;

use error::AppResult;
use fwupd::FirmwareDevice;
use model::DeviceInfo;
use telemetry::TelemetrySnapshot;

#[derive(Debug, serde::Serialize)]
pub struct StartupStatus {
    pub module_loaded: bool,
    pub in_linuwu_sense_group: bool,
    pub device: Option<DeviceInfo>,
    pub fwupd_available: bool,
    pub lm_sensors_installed: bool,
    pub missing_dependencies: Vec<String>,
    pub repo_url: String,
}

#[tauri::command]
async fn get_startup_status() -> AppResult<StartupStatus> {
    let module_loaded = model::is_module_loaded();
    let in_linuwu_sense_group = permissions::is_user_in_linuwu_sense_group()?;
    let device = if module_loaded {
        model::detect_device().ok()
    } else {
        None
    };
    let fwupd_available = fwupd::check_fwupd_available().await.unwrap_or(false);
    let lm_sensors_installed = deps::lm_sensors_installed();

    let mut missing_dependencies = Vec::new();
    if !module_loaded {
        missing_dependencies.push("linuwu-sense".to_string());
    }
    if !lm_sensors_installed {
        missing_dependencies.push("lm-sensors".to_string());
    }

    Ok(StartupStatus {
        module_loaded,
        in_linuwu_sense_group,
        device,
        fwupd_available,
        lm_sensors_installed,
        missing_dependencies,
        repo_url: deps::REPO_URL.to_string(),
    })
}

#[tauri::command]
fn read_control(name: String) -> AppResult<String> {
    let device = model::detect_device()?;
    sysfs::read_control(&device.sense_base_path, &name)
}

#[tauri::command]
fn write_control(name: String, value: String) -> AppResult<()> {
    let device = model::detect_device()?;
    sysfs::write_control(&device.sense_base_path, &name, &value)
}

#[tauri::command]
fn get_telemetry() -> AppResult<TelemetrySnapshot> {
    telemetry::snapshot()
}

#[tauri::command]
async fn list_firmware_devices() -> AppResult<Vec<FirmwareDevice>> {
    fwupd::list_devices().await
}

#[tauri::command]
async fn trigger_firmware_update(device_id: String) -> AppResult<String> {
    fwupd::trigger_update(&device_id).await
}

#[tauri::command]
fn thermal_is_available() -> bool {
    thermal::is_available()
}

#[tauri::command]
fn list_thermal_profiles() -> AppResult<Vec<String>> {
    thermal::list_profiles()
}

#[tauri::command]
fn get_thermal_profile() -> AppResult<String> {
    thermal::current_profile()
}

#[tauri::command]
fn set_thermal_profile(profile: String) -> AppResult<()> {
    thermal::set_profile(&profile)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_startup_status,
            read_control,
            write_control,
            get_telemetry,
            list_firmware_devices,
            trigger_firmware_update,
            thermal_is_available,
            list_thermal_profiles,
            get_thermal_profile,
            set_thermal_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
