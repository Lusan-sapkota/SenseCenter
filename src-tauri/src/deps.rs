pub const REPO_URL: &str = "https://github.com/Lusan-sapkota/SenseCenter";

pub fn lm_sensors_installed() -> bool {
    matches!(
        std::process::Command::new("sensors").arg("-v").output(),
        Ok(_)
    )
}
