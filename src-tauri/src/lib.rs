mod deps;
mod error;
mod fwupd;
mod model;
mod permissions;
mod privileged;
mod sysfs;
mod system;
mod telemetry;
mod thermal;

use error::AppResult;
use fwupd::FirmwareDevice;
use model::DeviceInfo;
use system::{BatteryHealth, BrightnessInfo, RadioInfo};
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
fn get_boot_id() -> String {
    std::fs::read_to_string("/proc/sys/kernel/random/boot_id")
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
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
async fn get_telemetry() -> AppResult<TelemetrySnapshot> {
    tauri::async_runtime::spawn_blocking(telemetry::snapshot)
        .await
        .map_err(|err| crate::error::AppError::Other(err.to_string()))?
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

#[tauri::command]
fn get_brightness() -> Option<BrightnessInfo> {
    system::read_brightness()
}

#[tauri::command]
fn set_brightness(device: String, value: u32) -> AppResult<()> {
    system::set_brightness(&device, value)
}

#[tauri::command]
fn list_radios() -> Vec<RadioInfo> {
    system::read_radios()
}

#[tauri::command]
fn set_radio_blocked(name: String, blocked: bool) -> AppResult<()> {
    system::set_radio_blocked(&name, blocked)
}

#[tauri::command]
fn get_battery_health() -> Option<BatteryHealth> {
    system::read_battery_health()
}

#[tauri::command]
async fn get_security_id() -> AppResult<String> {
    fwupd::security_id().await
}

#[tauri::command]
async fn unlock_privileged() -> AppResult<()> {
    tauri::async_runtime::spawn_blocking(privileged::unlock_privileged_paths)
        .await
        .map_err(|e| crate::error::AppError::Other(e.to_string()))?
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;
    use tauri::Manager;

    let show_item = MenuItemBuilder::with_id("show", "Show SenseCenter").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show_item, &quit_item]).build()?;

    let mut tray = TrayIconBuilder::new();
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            use tauri::Manager;
            build_tray(app.handle())?;
            // Login autostart passes --minimized so the app starts straight in the tray.
            if !std::env::args().any(|a| a == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    window.show()?;
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_startup_status,
            get_boot_id,
            read_control,
            write_control,
            get_telemetry,
            list_firmware_devices,
            trigger_firmware_update,
            thermal_is_available,
            list_thermal_profiles,
            get_thermal_profile,
            set_thermal_profile,
            get_brightness,
            set_brightness,
            list_radios,
            set_radio_blocked,
            get_battery_health,
            get_security_id,
            unlock_privileged,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
