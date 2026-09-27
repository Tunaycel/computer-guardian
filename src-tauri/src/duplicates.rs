use crate::scanner::{excluded, is_reparse_point, protected, user_excluded, ScanRules};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::UNIX_EPOCH;

const MAX_ENTRIES: u64 = 100_000;
const MAX_HASH_BYTES: u64 = 50 * 1_000_000_000;
const MAX_GROUPS: usize = 200;
const MAX_FILES_PER_GROUP: usize = 50;
const BUFFER_SIZE: usize = 1024 * 1024;

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateProgress {
    pub phase: &'static str,
    pub files_seen: u64,
    pub folders_seen: u64,
    pub bytes_seen: u64,
    pub candidate_files: u64,
    pub files_hashed: u64,
    pub bytes_hashed: u64,
    pub errors: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateFile {
    pub path: String,
    pub bytes: u64,
    pub modified_at_epoch_secs: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub id: String,
    pub bytes_per_file: u64,
    pub reclaimable_bytes: u64,
    pub file_count: u64,
    pub files: Vec<DuplicateFile>,
    pub files_truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateResult {
    pub root: String,
    pub progress: DuplicateProgress,
    pub groups: Vec<DuplicateGroup>,
    pub duplicate_files: u64,
    pub reclaimable_bytes: u64,
    pub cancelled: bool,
    pub truncated: bool,
    pub groups_truncated: bool,
}

struct HashedFile {
    path: PathBuf,
    bytes: u64,
    modified_at_epoch_secs: Option<u64>,
}

fn hash_file(
    path: &Path,
    cancel: &AtomicBool,
    progress: &mut DuplicateProgress,
) -> Result<[u8; 32], String> {
    let file = File::open(path).map_err(|_| "A candidate file could not be opened.".to_string())?;
    let mut reader = BufReader::with_capacity(BUFFER_SIZE, file);
    let mut buffer = vec![0_u8; BUFFER_SIZE];
    let mut hasher = Sha256::new();
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let read = reader
            .read(&mut buffer)
            .map_err(|_| "A candidate file could not be read.".to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        progress.bytes_hashed = progress.bytes_hashed.saturating_add(read as u64);
    }
    Ok(hasher.finalize().into())
}

pub fn scan<F: FnMut(DuplicateProgress)>(
    root: &Path,
    rules: &ScanRules,
    cancel: &AtomicBool,
    mut report: F,
) -> Result<DuplicateResult, String> {
    rules.validate()?;
    let metadata = fs::symlink_metadata(root)
        .map_err(|_| "The selected folder cannot be read.".to_string())?;
    if !metadata.is_dir() || is_reparse_point(&metadata) {
        return Err("Select a regular folder, not a link or junction.".into());
    }
    let root = root
        .canonicalize()
        .map_err(|_| "The selected folder cannot be resolved.".to_string())?;
    if protected(&root) {
        return Err("This system folder is protected from analysis.".into());
    }

    let mut progress = DuplicateProgress {
        phase: "inventory",
        ..Default::default()
    };
    let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    let mut stack = vec![root.clone()];
    let mut entries_seen = 0_u64;
    let mut truncated = false;

    while let Some(folder) = stack.pop() {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let entries = match fs::read_dir(&folder) {
            Ok(entries) => entries,
            Err(_) => {
                progress.errors = progress.errors.saturating_add(1);
                continue;
            }
        };
        progress.folders_seen = progress.folders_seen.saturating_add(1);
        for entry in entries {
            if cancel.load(Ordering::Relaxed) {
                break;
            }
            if entries_seen >= MAX_ENTRIES {
                truncated = true;
                break;
            }
            entries_seen = entries_seen.saturating_add(1);
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => {
                    progress.errors = progress.errors.saturating_add(1);
                    continue;
                }
            };
            let name = entry.file_name().to_string_lossy().into_owned();
            let path = entry.path();
            if excluded(&name) || user_excluded(&path, &root, rules) {
                continue;
            }
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(_) => {
                    progress.errors = progress.errors.saturating_add(1);
                    continue;
                }
            };
            if is_reparse_point(&metadata) {
                continue;
            }
            if metadata.is_dir() {
                stack.push(path);
            } else if metadata.is_file() {
                progress.files_seen = progress.files_seen.saturating_add(1);
                progress.bytes_seen = progress.bytes_seen.saturating_add(metadata.len());
                if metadata.len() > 0 {
                    by_size.entry(metadata.len()).or_default().push(path);
                }
            }
            if entries_seen.is_multiple_of(100) {
                report(progress.clone());
            }
        }
        if truncated {
            break;
        }
    }

    let candidates: Vec<_> = by_size
        .into_values()
        .filter(|paths| paths.len() > 1)
        .flatten()
        .collect();
    progress.candidate_files = candidates.len() as u64;
    progress.phase = "hashing";
    report(progress.clone());

    let mut hashed: HashMap<(u64, [u8; 32]), Vec<HashedFile>> = HashMap::new();
    for path in candidates {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let before = match fs::symlink_metadata(&path) {
            Ok(metadata) if metadata.is_file() && !is_reparse_point(&metadata) => metadata,
            _ => {
                progress.errors = progress.errors.saturating_add(1);
                continue;
            }
        };
        if progress.bytes_hashed.saturating_add(before.len()) > MAX_HASH_BYTES {
            truncated = true;
            break;
        }
        let modified = before.modified().ok();
        let digest = match hash_file(&path, cancel, &mut progress) {
            Ok(digest) => digest,
            Err(error) if error == "cancelled" => break,
            Err(_) => {
                progress.errors = progress.errors.saturating_add(1);
                continue;
            }
        };
        let after = match fs::symlink_metadata(&path) {
            Ok(metadata) => metadata,
            Err(_) => {
                progress.errors = progress.errors.saturating_add(1);
                continue;
            }
        };
        if after.len() != before.len() || after.modified().ok() != modified {
            progress.errors = progress.errors.saturating_add(1);
            continue;
        }
        progress.files_hashed = progress.files_hashed.saturating_add(1);
        hashed
            .entry((before.len(), digest))
            .or_default()
            .push(HashedFile {
                path,
                bytes: before.len(),
                modified_at_epoch_secs: modified
                    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                    .map(|duration| duration.as_secs()),
            });
        report(progress.clone());
    }

    progress.phase = "complete";
    let mut matches: Vec<_> = hashed
        .into_values()
        .filter(|files| files.len() > 1)
        .collect();
    matches.sort_by_key(|files| {
        std::cmp::Reverse(files[0].bytes.saturating_mul((files.len() - 1) as u64))
    });
    let groups_truncated = matches.len() > MAX_GROUPS;
    let mut duplicate_files = 0_u64;
    let mut reclaimable_bytes = 0_u64;
    let groups = matches
        .into_iter()
        .take(MAX_GROUPS)
        .enumerate()
        .map(|(index, files)| {
            let file_count = files.len() as u64;
            let bytes_per_file = files[0].bytes;
            let reclaimable = bytes_per_file.saturating_mul(file_count.saturating_sub(1));
            duplicate_files = duplicate_files.saturating_add(file_count);
            reclaimable_bytes = reclaimable_bytes.saturating_add(reclaimable);
            let files_truncated = files.len() > MAX_FILES_PER_GROUP;
            DuplicateGroup {
                id: format!("duplicate-{}", index + 1),
                bytes_per_file,
                reclaimable_bytes: reclaimable,
                file_count,
                files: files
                    .into_iter()
                    .take(MAX_FILES_PER_GROUP)
                    .map(|file| DuplicateFile {
                        path: file.path.to_string_lossy().into_owned(),
                        bytes: file.bytes,
                        modified_at_epoch_secs: file.modified_at_epoch_secs,
                    })
                    .collect(),
                files_truncated,
            }
        })
        .collect();
    report(progress.clone());

    Ok(DuplicateResult {
        root: root.to_string_lossy().into_owned(),
        progress,
        groups,
        duplicate_files,
        reclaimable_bytes,
        cancelled: cancel.load(Ordering::Relaxed),
        truncated,
        groups_truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verifies_full_content_and_ignores_same_size_differences() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(temp.path().join("copy-a.bin"), b"matching-content").unwrap();
        fs::write(temp.path().join("copy-b.bin"), b"matching-content").unwrap();
        fs::write(temp.path().join("different.bin"), b"changed!-content").unwrap();
        fs::write(temp.path().join("empty-a"), b"").unwrap();
        fs::write(temp.path().join("empty-b"), b"").unwrap();

        let result = scan(
            temp.path(),
            &ScanRules::default(),
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.duplicate_files, 2);
        assert_eq!(result.groups[0].file_count, 2);
        assert_eq!(result.reclaimable_bytes, b"matching-content".len() as u64);
        assert_eq!(result.progress.files_hashed, 3);
    }

    #[test]
    fn honours_cancellation_before_traversal() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(temp.path().join("one.bin"), b"content").unwrap();
        let result = scan(
            temp.path(),
            &ScanRules::default(),
            &AtomicBool::new(true),
            |_| {},
        )
        .unwrap();
        assert!(result.cancelled);
        assert_eq!(result.progress.files_seen, 0);
    }

    #[test]
    fn applies_relative_path_exclusions() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir(temp.path().join("Excluded")).unwrap();
        fs::write(temp.path().join("visible.bin"), b"same-content").unwrap();
        fs::write(
            temp.path().join("Excluded").join("hidden.bin"),
            b"same-content",
        )
        .unwrap();
        let rules = ScanRules {
            excluded_paths: vec!["Excluded".into()],
            ..Default::default()
        };

        let result = scan(temp.path(), &rules, &AtomicBool::new(false), |_| {}).unwrap();
        assert!(result.groups.is_empty());
        assert_eq!(result.progress.files_seen, 1);
    }
}
