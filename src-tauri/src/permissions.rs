use crate::error::{AppError, AppResult};

const LINUWU_SENSE_GROUP: &str = "linuwu_sense";

/// Returns true if the current user is listed in `/etc/group` for `linuwu_sense`.
///
/// We read the system group file rather than relying on process supplementary
/// groups so a stale session (group added but user not re-logged-in) is detected.
pub fn is_user_in_linuwu_sense_group() -> AppResult<bool> {
    let username = whoami::username().map_err(|e| AppError::Other(e.to_string()))?;
    let group_file = std::fs::read_to_string("/etc/group")?;

    for line in group_file.lines() {
        let Some((name, members)) = line.split_once(':').and_then(|(name, rest)| {
            let fields: Vec<&str> = rest.split(':').collect();
            if fields.len() >= 3 {
                Some((name, fields[2]))
            } else {
                None
            }
        }) else {
            continue;
        };

        if name == LINUWU_SENSE_GROUP {
            return Ok(members.split(',').any(|m| m == username));
        }
    }

    Ok(false)
}

pub fn require_linuwu_sense_group() -> AppResult<()> {
    if !is_user_in_linuwu_sense_group()? {
        return Err(AppError::NotInLinuwuSenseGroup);
    }
    Ok(())
}
