use serde::Serialize;
use zbus::Connection;

use crate::error::{AppError, AppResult};

const FWUPD_DBUS_NAME: &str = "org.freedesktop.fwupd";
const FWUPD_DBUS_PATH: &str = "/org/freedesktop/fwupd";
const FWUPD_DBUS_INTERFACE: &str = "org.freedesktop.fwupd";

#[derive(Debug, Clone, Serialize)]
pub struct FirmwareDevice {
    pub id: String,
    pub name: String,
    pub version: String,
    pub update_available: bool,
}

/// Placeholder for fwupd device enumeration via D-Bus.
///
/// Full parsing of fwupd's variant-heavy GetDevices reply comes in a follow-up;
/// for init we verify the daemon is reachable.
pub async fn check_fwupd_available() -> AppResult<bool> {
    let connection = Connection::system().await?;
    let proxy = zbus::Proxy::new(
        &connection,
        FWUPD_DBUS_NAME,
        FWUPD_DBUS_PATH,
        FWUPD_DBUS_INTERFACE,
    )
    .await?;

    proxy.introspect().await.map_err(|_| {
        AppError::Other("fwupd D-Bus service is not available".into())
    })?;

    Ok(true)
}

pub async fn list_devices() -> AppResult<Vec<FirmwareDevice>> {
    let available = check_fwupd_available().await?;
    if !available {
        return Ok(Vec::new());
    }

    // TODO: call GetDevices and map a{sv} entries into FirmwareDevice
    Ok(Vec::new())
}
