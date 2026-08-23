use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("linuwu_sense kernel module is not loaded")]
    ModuleNotLoaded,

    #[error("user is not in the linuwu_sense group  log out and back in after being added")]
    NotInLinuwuSenseGroup,

    #[error("sysfs path not found: {0}")]
    SysfsNotFound(String),

    #[error("permission denied writing to {0}")]
    PermissionDenied(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("D-Bus error: {0}")]
    Dbus(#[from] zbus::Error),

    #[error("{0}")]
    Other(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
