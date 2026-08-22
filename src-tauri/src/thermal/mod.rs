use crate::error::{AppError, AppResult};

const PLATFORM_PROFILE: &str = "/sys/firmware/acpi/platform_profile";
const PLATFORM_PROFILE_CHOICES: &str = "/sys/firmware/acpi/platform_profile_choices";

pub fn is_available() -> bool {
    std::path::Path::new(PLATFORM_PROFILE).exists()
}

pub fn list_profiles() -> AppResult<Vec<String>> {
    let raw = std::fs::read_to_string(PLATFORM_PROFILE_CHOICES)?;
    Ok(raw.split_whitespace().map(str::to_string).collect())
}

pub fn current_profile() -> AppResult<String> {
    Ok(std::fs::read_to_string(PLATFORM_PROFILE)?.trim().to_string())
}

pub fn set_profile(profile: &str) -> AppResult<()> {
    let available = list_profiles()?;
    if !available.iter().any(|p| p == profile) {
        return Err(AppError::Other(format!(
            "unsupported platform profile '{profile}', available: {}",
            available.join(", ")
        )));
    }

    std::fs::write(PLATFORM_PROFILE, profile).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            AppError::PermissionDenied(PLATFORM_PROFILE.to_string())
        } else {
            AppError::Io(e)
        }
    })
}
