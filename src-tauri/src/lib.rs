mod error;
mod fwupd;
mod model;
mod permissions;
mod sysfs;
mod telemetry;

use error::AppResult;
use model::DeviceInfo;
use telemetry::TelemetrySnapshot;

#[derive(Debug, serde::Serialize)]
pub struct StartupStatus {
    pub module_loaded: bool,
    pub in_linuwu_sense_group: bool,
    pub device: Option<DeviceInfo>,
    pub fwupd_available: bool,
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

    Ok(StartupStatus {
        module_loaded,
        in_linuwu_sense_group,
        device,
        fwupd_available,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_startup_status,
            read_control,
            write_control,
            get_telemetry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
