use serde::Serialize;
use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    pub root: String,
    pub name: String,
    pub kind: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub is_system: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedLocation {
    pub id: String,
    pub label: String,
    pub path: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageOverview {
    pub drives: Vec<DriveInfo>,
    pub approved_locations: Vec<ApprovedLocation>,
    pub measured_at_epoch_secs: u64,
}

pub fn approved_scan_locations(app: &tauri::AppHandle) -> Vec<ApprovedLocation> {
    let resolver = app.path();
    let mut candidates = Vec::new();
    if let Ok(path) = resolver.download_dir() {
        candidates.push(("downloads", "Downloads", path));
    }
    if let Ok(path) = resolver.desktop_dir() {
        candidates.push(("desktop", "Desktop", path));
    }
    if let Ok(path) = resolver.picture_dir() {
        candidates.push(("screenshots", "Screenshots", path.join("Screenshots")));
    }
    if let Ok(path) = resolver.temp_dir() {
        candidates.push(("temporary", "Windows temporary files", path));
    }

    let mut seen = HashSet::new();
    candidates
        .into_iter()
        .filter_map(|(id, label, path)| {
            if !path.is_dir() {
                return None;
            }
            let resolved = path.canonicalize().ok()?;
            let key = resolved.to_string_lossy().to_ascii_lowercase();
            if !seen.insert(key) {
                return None;
            }
            Some(ApprovedLocation {
                id: id.into(),
                label: label.into(),
                path: resolved.to_string_lossy().into_owned(),
            })
        })
        .collect()
}

pub fn overview(app: &tauri::AppHandle) -> Result<StorageOverview, String> {
    Ok(StorageOverview {
        drives: local_drives()?,
        approved_locations: approved_scan_locations(app),
        measured_at_epoch_secs: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or_default(),
    })
}

#[cfg(windows)]
fn local_drives() -> Result<Vec<DriveInfo>, String> {
    use std::ptr::null_mut;
    use windows_sys::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDriveStringsW, GetVolumeInformationW,
    };

    let roots = unsafe {
        let required = GetLogicalDriveStringsW(0, null_mut());
        if required == 0 {
            return Err("Windows could not enumerate local drives.".into());
        }
        let mut buffer = vec![0_u16; required as usize + 1];
        let written = GetLogicalDriveStringsW(buffer.len() as u32, buffer.as_mut_ptr());
        if written == 0 || written as usize > buffer.len() {
            return Err("Windows could not read the local drive list.".into());
        }
        parse_multi_string(&buffer[..written as usize])
    };

    let system_drive = std::env::var("SystemDrive")
        .unwrap_or_default()
        .trim_end_matches(['\\', '/'])
        .to_ascii_lowercase();
    let mut drives = Vec::new();
    for root in roots {
        let wide: Vec<u16> = root.encode_utf16().chain(Some(0)).collect();
        let drive_type = unsafe { GetDriveTypeW(wide.as_ptr()) };
        let kind = match drive_type {
            2 => "Removable",
            3 => "Fixed",
            _ => continue,
        };
        let mut available = 0_u64;
        let mut total = 0_u64;
        if unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut available, &mut total, null_mut()) }
            == 0
            || total == 0
        {
            continue;
        }

        let mut volume_name = vec![0_u16; 261];
        let named = unsafe {
            GetVolumeInformationW(
                wide.as_ptr(),
                volume_name.as_mut_ptr(),
                volume_name.len() as u32,
                null_mut(),
                null_mut(),
                null_mut(),
                null_mut(),
                0,
            )
        } != 0;
        let name = if named {
            let length = volume_name
                .iter()
                .position(|value| *value == 0)
                .unwrap_or(volume_name.len());
            String::from_utf16_lossy(&volume_name[..length])
        } else {
            String::new()
        };
        let normalized_root = root.trim_end_matches(['\\', '/']);
        drives.push(DriveInfo {
            root: root.clone(),
            name: if name.trim().is_empty() {
                format!("Local Disk ({normalized_root})")
            } else {
                format!("{} ({normalized_root})", name.trim())
            },
            kind: kind.into(),
            total_bytes: total,
            free_bytes: available,
            is_system: normalized_root.to_ascii_lowercase() == system_drive,
        });
    }
    drives.sort_by(|left, right| left.root.cmp(&right.root));
    Ok(drives)
}

#[cfg(not(windows))]
fn local_drives() -> Result<Vec<DriveInfo>, String> {
    Err("Storage overview is currently available on Windows only.".into())
}

#[cfg(windows)]
fn parse_multi_string(values: &[u16]) -> Vec<String> {
    values
        .split(|value| *value == 0)
        .filter(|part| !part.is_empty())
        .map(String::from_utf16_lossy)
        .collect()
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn parses_windows_multi_string_drive_list() {
        let values = [
            b'C' as u16,
            b':' as u16,
            b'\\' as u16,
            0,
            b'D' as u16,
            b':' as u16,
            b'\\' as u16,
            0,
            0,
        ];
        assert_eq!(parse_multi_string(&values), vec![r"C:\", r"D:\"]);
    }

    #[test]
    fn drive_measurements_are_internally_consistent() {
        for drive in local_drives().unwrap() {
            assert!(drive.total_bytes > 0);
            assert!(drive.free_bytes <= drive.total_bytes);
            assert!(drive.root.ends_with('\\'));
        }
    }
}
