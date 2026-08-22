use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};
use crate::permissions::require_linuwu_sense_group;

pub fn read_file(path: &Path) -> AppResult<String> {
    Ok(std::fs::read_to_string(path)?.trim().to_string())
}

pub fn write_file(path: &Path, value: &str) -> AppResult<()> {
    require_linuwu_sense_group()?;

    let mut file = OpenOptions::new().write(true).open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            AppError::PermissionDenied(path.display().to_string())
        } else {
            AppError::Io(e)
        }
    })?;

    file.write_all(value.as_bytes())?;
    Ok(())
}

pub fn control_path(base: &Path, name: &str) -> PathBuf {
    base.join(name)
}

pub fn read_control(base: &Path, name: &str) -> AppResult<String> {
    let path = control_path(base, name);
    if !path.exists() {
        return Err(AppError::SysfsNotFound(path.display().to_string()));
    }
    read_file(&path)
}

pub fn write_control(base: &Path, name: &str, value: &str) -> AppResult<()> {
    let path = control_path(base, name);
    if !path.exists() {
        return Err(AppError::SysfsNotFound(path.display().to_string()));
    }
    write_file(&path, value)
}
