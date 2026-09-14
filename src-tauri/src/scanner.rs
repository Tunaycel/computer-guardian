use serde::Serialize;
use std::fs;
use std::path::Path;
#[cfg(windows)]
use std::path::{Component, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

const MAX_RESULTS: usize = 500;
const MAX_ENTRIES: u64 = 100_000;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub files_seen: u64,
    pub folders_seen: u64,
    pub bytes_seen: u64,
    pub errors: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub path: String,
    pub bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: String,
    pub progress: ScanProgress,
    pub files: Vec<FileRecord>,
    pub cancelled: bool,
    pub truncated: bool,
}

fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        return metadata.file_attributes() & 0x400 != 0;
    }
    #[cfg(not(windows))]
    false
}

fn protected(root: &Path) -> bool {
    if root.parent().is_none() {
        return true;
    }
    #[cfg(windows)]
    {
        if root.components().count() <= 1 {
            return true;
        }
        if root
            .components()
            .find_map(|part| match part {
                Component::Normal(name) => Some(name.to_string_lossy().to_ascii_lowercase()),
                _ => None,
            })
            .is_some_and(|name| {
                matches!(
                    name.as_str(),
                    "windows" | "program files" | "program files (x86)" | "programdata"
                )
            })
        {
            return true;
        }
        for key in ["WINDIR", "ProgramFiles", "ProgramFiles(x86)", "ProgramData"] {
            if let Some(value) = std::env::var_os(key) {
                let candidate = PathBuf::from(value);
                if let Ok(path) = candidate.canonicalize() {
                    if root.starts_with(path) {
                        return true;
                    }
                }
            }
        }
    }
    false
}

fn excluded(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        ".git" | "node_modules" | ".venv" | "venv" | "$recycle.bin" | "system volume information"
    )
}

pub fn scan<F: FnMut(ScanProgress)>(
    root: &Path,
    cancel: &AtomicBool,
    mut report: F,
) -> Result<ScanResult, String> {
    let metadata = fs::symlink_metadata(root)
        .map_err(|_| "The selected folder cannot be read.".to_string())?;
    if !metadata.is_dir() || is_reparse_point(&metadata) {
        return Err("Select a regular folder, not a link or junction.".to_string());
    }
    let root = root
        .canonicalize()
        .map_err(|_| "The selected folder cannot be resolved.".to_string())?;
    if protected(&root) {
        return Err("This system folder is protected from scanning.".to_string());
    }
    let mut progress = ScanProgress {
        files_seen: 0,
        folders_seen: 0,
        bytes_seen: 0,
        errors: 0,
    };
    let mut files = Vec::new();
    let mut stack = vec![root.clone()];
    let mut truncated = false;
    let mut entries_seen = 0_u64;
    while let Some(folder) = stack.pop() {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let entries = match fs::read_dir(&folder) {
            Ok(entries) => entries,
            Err(_) => {
                progress.errors += 1;
                continue;
            }
        };
        progress.folders_seen += 1;
        for entry in entries {
            if cancel.load(Ordering::Relaxed) {
                break;
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => {
                    progress.errors += 1;
                    continue;
                }
            };
            if entries_seen >= MAX_ENTRIES {
                truncated = true;
                break;
            }
            entries_seen += 1;
            let name = entry.file_name().to_string_lossy().into_owned();
            if excluded(&name) {
                continue;
            }
            let path = entry.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(_) => {
                    progress.errors += 1;
                    continue;
                }
            };
            if is_reparse_point(&metadata) {
                continue;
            }
            if metadata.is_dir() {
                stack.push(path);
            } else if metadata.is_file() {
                progress.files_seen += 1;
                progress.bytes_seen = progress.bytes_seen.saturating_add(metadata.len());
                if files.len() < MAX_RESULTS {
                    files.push(FileRecord {
                        path: path.to_string_lossy().into_owned(),
                        bytes: metadata.len(),
                    });
                }
            }
            if entries_seen % 100 == 0 {
                report(progress.clone());
            }
        }
        if truncated {
            break;
        }
    }
    report(progress.clone());
    Ok(ScanResult {
        root: root.to_string_lossy().into_owned(),
        progress,
        files,
        cancelled: cancel.load(Ordering::Relaxed),
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicBool;

    #[test]
    fn scans_only_selected_tree_and_skips_exclusions() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("selected");
        fs::create_dir(&root).unwrap();
        fs::write(root.join("sample.txt"), b"hello").unwrap();
        fs::create_dir(root.join(".git")).unwrap();
        fs::write(root.join(".git").join("secret"), b"hidden").unwrap();
        fs::write(temp.path().join("outside"), b"outside").unwrap();
        let result = scan(&root, &AtomicBool::new(false), |_| {}).unwrap();
        assert_eq!(result.progress.files_seen, 1);
        assert_eq!(result.progress.bytes_seen, 5);
        assert_eq!(result.files.len(), 1);
        assert!(!result.cancelled);
    }

    #[test]
    fn cancellation_does_not_report_complete() {
        let temp = tempfile::tempdir().unwrap();
        let result = scan(temp.path(), &AtomicBool::new(true), |_| {}).unwrap();
        assert!(result.cancelled);
        assert_eq!(result.progress.files_seen, 0);
    }

    #[test]
    fn rejects_a_file_as_scan_root() {
        let temp = tempfile::tempdir().unwrap();
        let file = temp.path().join("file");
        fs::write(&file, b"data").unwrap();
        assert!(scan(&file, &AtomicBool::new(false), |_| {}).is_err());
    }

    #[test]
    fn rejects_filesystem_root_without_traversal() {
        let temp = tempfile::tempdir().unwrap();
        let filesystem_root = temp.path().ancestors().last().unwrap();
        assert!(protected(filesystem_root));
        assert!(scan(filesystem_root, &AtomicBool::new(false), |_| {}).is_err());
    }

    #[test]
    fn stops_after_cancellation_during_progress() {
        let temp = tempfile::tempdir().unwrap();
        for index in 0..150 {
            fs::write(temp.path().join(format!("{index:03}.txt")), b"x").unwrap();
        }
        let cancel = AtomicBool::new(false);
        let result = scan(temp.path(), &cancel, |progress| {
            if progress.files_seen >= 99 {
                cancel.store(true, Ordering::Relaxed);
            }
        })
        .unwrap();
        assert!(result.cancelled);
        assert!(result.progress.files_seen < 150);
    }
}
