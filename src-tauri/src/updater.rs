use crate::error::{AppError, AppResult};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use tokio::process::Command;

const LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/Lusan-sapkota/SenseCenter/releases/latest";
const DOWNLOAD_PREFIX: &str = "https://github.com/Lusan-sapkota/SenseCenter/releases/download/";

#[derive(Debug, serde::Serialize)]
pub struct UpdateInfo {
    pub current: String,
    pub latest: String,
    pub available: bool,
    pub can_install: bool,
    pub release_url: String,
}

enum InstallKind {
    AppImage(PathBuf),
    Deb,
}

fn install_kind() -> Option<InstallKind> {
    if let Some(path) = std::env::var_os("APPIMAGE") {
        return Some(InstallKind::AppImage(path.into()));
    }
    let exe = std::env::current_exe().ok()?;
    (exe.starts_with("/usr/bin") && Path::new("/usr/bin/dpkg").exists()).then_some(InstallKind::Deb)
}

fn parse_version(v: &str) -> Option<(u64, u64, u64)> {
    let mut parts = v.trim_start_matches('v').split('.').map(|p| p.parse().ok());
    Some((parts.next()??, parts.next()??, parts.next()??))
}

fn other(msg: impl Into<String>) -> AppError {
    AppError::Other(msg.into())
}

async fn curl(args: &[&str]) -> AppResult<Vec<u8>> {
    let output = Command::new("curl")
        .args(["-fsSL", "--proto", "=https", "--max-time", "600"])
        .args(args)
        .output()
        .await?;
    if output.status.success() {
        Ok(output.stdout)
    } else {
        Err(other(format!(
            "Download failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )))
    }
}

async fn latest_release() -> AppResult<serde_json::Value> {
    let body = curl(&["-H", "Accept: application/vnd.github+json", LATEST_RELEASE_API]).await?;
    serde_json::from_slice(&body).map_err(|e| other(e.to_string()))
}

pub async fn check() -> AppResult<UpdateInfo> {
    let release = latest_release().await?;
    let current = env!("CARGO_PKG_VERSION").to_string();
    let latest = release["tag_name"].as_str().unwrap_or_default().trim_start_matches('v').to_string();
    let available = matches!(
        (parse_version(&latest), parse_version(&current)),
        (Some(l), Some(c)) if l > c
    );
    Ok(UpdateInfo {
        current,
        latest,
        available,
        can_install: install_kind().is_some(),
        release_url: release["html_url"].as_str().unwrap_or_default().to_string(),
    })
}

async fn verify_sha256(file: &Path, expected: &str) -> AppResult<()> {
    let output = Command::new("sha256sum").arg(file).output().await?;
    let actual = String::from_utf8_lossy(&output.stdout);
    if output.status.success() && actual.split_whitespace().next() == Some(expected) {
        Ok(())
    } else {
        let _ = std::fs::remove_file(file);
        Err(other("Downloaded update is corrupted (checksum mismatch)"))
    }
}

// Downloads and installs the latest release, returning the executable to relaunch.
pub async fn install() -> AppResult<PathBuf> {
    let kind = install_kind()
        .ok_or_else(|| other("Automatic updates only work for the .deb and AppImage builds"))?;
    let exe = std::env::current_exe()?;
    let release = latest_release().await?;

    let suffix = match kind {
        InstallKind::AppImage(_) => ".AppImage",
        InstallKind::Deb => "_amd64.deb",
    };
    let asset = release["assets"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|a| a["name"].as_str().is_some_and(|n| n.ends_with(suffix)))
        .ok_or_else(|| other(format!("The latest release has no {suffix} file")))?;
    let url = asset["browser_download_url"].as_str().unwrap_or_default();
    if !url.starts_with(DOWNLOAD_PREFIX) {
        return Err(other("Unexpected download URL in the release"));
    }

    let file = match &kind {
        InstallKind::AppImage(target) => PathBuf::from(format!("{}.new", target.display())),
        InstallKind::Deb => {
            let home = std::env::var_os("HOME").ok_or_else(|| other("HOME is not set"))?;
            let dir = std::env::var_os("XDG_CACHE_HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from(home).join(".cache"))
                .join("sensecenter");
            std::fs::create_dir_all(&dir)?;
            dir.join("SenseCenter-update.deb")
        }
    };
    let file_str = file.to_str().ok_or_else(|| other("Non-UTF-8 download path"))?;
    curl(&["-o", file_str, url]).await?;
    if let Some(sha) = asset["digest"].as_str().and_then(|d| d.strip_prefix("sha256:")) {
        verify_sha256(&file, sha).await?;
    }

    match kind {
        InstallKind::AppImage(target) => {
            std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o755))?;
            std::fs::rename(&file, &target)?;
            Ok(target)
        }
        InstallKind::Deb => {
            let output = Command::new("pkexec")
                .args(["apt-get", "install", "-y", file_str])
                .output()
                .await?;
            let _ = std::fs::remove_file(&file);
            if output.status.success() {
                Ok(exe)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                Err(other(if stderr.is_empty() {
                    "Authentication was cancelled".to_string()
                } else {
                    stderr
                }))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parse_version;

    #[test]
    fn compares_versions() {
        assert_eq!(parse_version("v0.1.0"), Some((0, 1, 0)));
        assert!(parse_version("0.10.0") > parse_version("0.9.9"));
        assert_eq!(parse_version("0.2.0-rc1"), None);
    }
}
