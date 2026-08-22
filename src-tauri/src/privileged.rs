use crate::error::{AppError, AppResult};

const RAPL_PACKAGE: &str = "/sys/class/powercap/intel-rapl:0/energy_uj";
const RAPL_CORE: &str = "/sys/class/powercap/intel-rapl:0:0/energy_uj";
const PLATFORM_PROFILE: &str = "/sys/firmware/acpi/platform_profile";
const RFKILL_DIR: &str = "/sys/class/rfkill";

fn rfkill_soft_paths() -> Vec<String> {
    let mut paths = Vec::new();
    let Ok(entries) = std::fs::read_dir(RFKILL_DIR) else {
        return paths;
    };

    for entry in entries.flatten() {
        let soft = entry.path().join("soft");
        if soft.exists() {
            paths.push(soft.display().to_string());
        }
    }
    paths
}

pub fn unlock_privileged_paths() -> AppResult<()> {
    let mut targets = vec![
        RAPL_PACKAGE.to_string(),
        RAPL_CORE.to_string(),
        PLATFORM_PROFILE.to_string(),
    ];
    targets.extend(rfkill_soft_paths());
    targets.retain(|p| std::path::Path::new(p).exists());

    if targets.is_empty() {
        return Ok(());
    }

    let mut args = vec!["chmod".to_string(), "0666".to_string()];
    args.extend(targets);

    let output = std::process::Command::new("pkexec")
        .args(&args)
        .output()
        .map_err(AppError::Io)?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        Err(AppError::Other(if stderr.trim().is_empty() {
            "Authentication was cancelled".to_string()
        } else {
            stderr
        }))
    }
}
