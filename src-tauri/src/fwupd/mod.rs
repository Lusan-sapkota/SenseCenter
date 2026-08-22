use std::collections::HashMap;

use serde::Serialize;
use zbus::zvariant::OwnedValue;
use zbus::{Connection, Proxy};

use crate::error::{AppError, AppResult};

const FWUPD_DBUS_NAME: &str = "org.freedesktop.fwupd";
const FWUPD_DBUS_PATH: &str = "/";
const FWUPD_DBUS_INTERFACE: &str = "org.freedesktop.fwupd";

type PropMap = HashMap<String, OwnedValue>;

#[derive(Debug, Clone, Serialize)]
pub struct FirmwareDevice {
    pub id: String,
    pub name: String,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub update_available: bool,
}

async fn fwupd_proxy(connection: &Connection) -> AppResult<Proxy<'_>> {
    Proxy::new(connection, FWUPD_DBUS_NAME, FWUPD_DBUS_PATH, FWUPD_DBUS_INTERFACE)
        .await
        .map_err(AppError::Dbus)
}

pub async fn check_fwupd_available() -> AppResult<bool> {
    let connection = Connection::system().await?;
    let proxy = fwupd_proxy(&connection).await?;

    proxy
        .introspect()
        .await
        .map_err(|_| AppError::Other("fwupd D-Bus service is not available".into()))?;

    Ok(true)
}

fn prop_str(props: &PropMap, key: &str) -> Option<String> {
    props.get(key).and_then(|v| v.downcast_ref::<&str>().ok().map(str::to_string))
}

async fn has_pending_upgrade(proxy: &Proxy<'_>, device_id: &str) -> bool {
    proxy
        .call::<_, _, Vec<PropMap>>("GetUpgrades", &(device_id,))
        .await
        .map(|releases| !releases.is_empty())
        .unwrap_or(false)
}

pub async fn list_devices() -> AppResult<Vec<FirmwareDevice>> {
    let connection = Connection::system().await?;
    let proxy = fwupd_proxy(&connection).await?;

    let raw_devices: Vec<PropMap> = proxy.call("GetDevices", &()).await.map_err(AppError::Dbus)?;

    let mut devices = Vec::with_capacity(raw_devices.len());
    for props in raw_devices {
        let Some(id) = prop_str(&props, "DeviceId") else {
            continue;
        };
        let name = prop_str(&props, "Name").unwrap_or_else(|| id.clone());
        let vendor = prop_str(&props, "Vendor");
        let version = prop_str(&props, "Version");
        let update_available = has_pending_upgrade(&proxy, &id).await;

        devices.push(FirmwareDevice {
            id,
            name,
            vendor,
            version,
            update_available,
        });
    }

    Ok(devices)
}

pub async fn security_id() -> AppResult<String> {
    let connection = Connection::system().await?;
    let proxy = fwupd_proxy(&connection).await?;
    proxy
        .get_property::<String>("HostSecurityId")
        .await
        .map_err(AppError::Dbus)
}

pub async fn trigger_update(device_id: &str) -> AppResult<String> {
    let output = tokio::process::Command::new("fwupdmgr")
        .args(["update", device_id, "--assume-yes", "--no-reboot-check"])
        .output()
        .await
        .map_err(AppError::Io)?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(AppError::Other(if stderr.trim().is_empty() { stdout } else { stderr }))
    }
}
