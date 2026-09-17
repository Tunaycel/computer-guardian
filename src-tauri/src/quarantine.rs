use crate::scanner::{self, ScanItem};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const INTENT_FILE: &str = "intent.json";
const PAYLOAD_NAME: &str = "payload";
const COMMITTED_MARKER: &str = "quarantined";
const RESTORED_MARKER: &str = "restored";

#[derive(Clone, Debug)]
pub struct CandidateSnapshot {
    pub id: String,
    pub source: PathBuf,
    pub scan_root: PathBuf,
    pub bytes: u64,
    pub kind: String,
    pub modified_at_epoch_nanos: Option<u64>,
}

impl CandidateSnapshot {
    pub fn from_scan_item(root: &str, item: &ScanItem) -> Self {
        Self {
            id: item.candidate_id.clone(),
            source: PathBuf::from(&item.path),
            scan_root: PathBuf::from(root),
            bytes: item.bytes,
            kind: item.kind.into(),
            modified_at_epoch_nanos: item.modified_at_epoch_nanos,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct QuarantineIntent {
    version: u8,
    id: String,
    original_path: String,
    scan_root: String,
    bytes: u64,
    kind: String,
    modified_at_epoch_nanos: Option<u64>,
    quarantined_at_epoch_secs: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuarantineEntry {
    pub id: String,
    pub original_path: String,
    pub name: String,
    pub bytes: u64,
    pub kind: String,
    pub quarantined_at_epoch_secs: u64,
    pub restore_status: String,
}

fn epoch_secs(time: SystemTime) -> Option<u64> {
    time.duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

fn epoch_nanos(time: SystemTime) -> Option<u64> {
    time.duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|duration| u64::try_from(duration.as_nanos()).ok())
}

fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 96
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
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

fn item_directory(root: &Path, id: &str) -> Result<PathBuf, String> {
    if !is_safe_id(id) {
        return Err("The quarantine identifier is invalid.".into());
    }
    Ok(root.join("items").join(id))
}

fn validate_private_directory(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| "The private quarantine folder cannot be inspected.")?;
    if !metadata.is_dir() || is_reparse_point(&metadata) {
        return Err("The private quarantine folder failed the safety check.".into());
    }
    Ok(())
}

fn prepare_items_root(root: &Path) -> Result<PathBuf, String> {
    let items_root = root.join("items");
    fs::create_dir_all(&items_root)
        .map_err(|_| "The private quarantine folder could not be created.")?;
    validate_private_directory(root)?;
    validate_private_directory(&items_root)?;
    Ok(items_root)
}

fn sync_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file =
        File::create(path).map_err(|_| "The quarantine journal could not be created.")?;
    file.write_all(bytes)
        .map_err(|_| "The quarantine journal could not be written.")?;
    file.sync_all()
        .map_err(|_| "The quarantine journal could not be secured on disk.".to_string())
}

fn load_intent(directory: &Path) -> Result<QuarantineIntent, String> {
    let bytes = fs::read(directory.join(INTENT_FILE))
        .map_err(|_| "The quarantine record cannot be read.")?;
    let intent: QuarantineIntent =
        serde_json::from_slice(&bytes).map_err(|_| "The quarantine record is damaged.")?;
    if intent.version != 1 || !is_safe_id(&intent.id) {
        return Err("The quarantine record version or identifier is invalid.".into());
    }
    Ok(intent)
}

fn entry_from_intent(intent: &QuarantineIntent, restore_status: &str) -> QuarantineEntry {
    let original = Path::new(&intent.original_path);
    QuarantineEntry {
        id: intent.id.clone(),
        original_path: intent.original_path.clone(),
        name: original
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        bytes: intent.bytes,
        kind: intent.kind.clone(),
        quarantined_at_epoch_secs: intent.quarantined_at_epoch_secs,
        restore_status: restore_status.into(),
    }
}

fn validate_candidate(candidate: &CandidateSnapshot) -> Result<fs::Metadata, String> {
    let root = candidate
        .scan_root
        .canonicalize()
        .map_err(|_| "The original scan folder is no longer available.")?;
    let source = candidate
        .source
        .canonicalize()
        .map_err(|_| "This item changed or no longer exists. Scan again before moving it.")?;
    if source == root || !source.starts_with(&root) || scanner::protected(&source) {
        return Err("This item is outside the approved scan folder or is protected.".into());
    }
    let metadata =
        fs::symlink_metadata(&source).map_err(|_| "This item changed or can no longer be read.")?;
    if is_reparse_point(&metadata) {
        return Err("Links and junctions cannot be quarantined.".into());
    }
    let kind_matches = (candidate.kind == "file" && metadata.is_file())
        || (candidate.kind == "folder" && metadata.is_dir());
    let size_matches = metadata.is_dir() || metadata.len() == candidate.bytes;
    let modified_matches = candidate.modified_at_epoch_nanos.is_none()
        || metadata.modified().ok().and_then(epoch_nanos) == candidate.modified_at_epoch_nanos;
    if !kind_matches || !size_matches || !modified_matches {
        return Err("This item changed after the scan. Scan again before moving it.".into());
    }
    if metadata.is_dir()
        && fs::read_dir(&source)
            .map_err(|_| "The folder can no longer be inspected.")?
            .next()
            .is_some()
    {
        return Err("The folder is no longer empty. Scan again before moving it.".into());
    }
    Ok(metadata)
}

pub fn quarantine(root: &Path, candidate: &CandidateSnapshot) -> Result<QuarantineEntry, String> {
    validate_candidate(candidate)?;
    prepare_items_root(root)?;
    let directory = item_directory(root, &candidate.id)?;
    if directory.exists() {
        return Err("A quarantine record for this item already exists.".into());
    }
    fs::create_dir_all(&directory)
        .map_err(|_| "The private quarantine folder could not be created.")?;
    validate_private_directory(&directory)?;
    let quarantined_at_epoch_secs = epoch_secs(SystemTime::now()).unwrap_or_default();
    let intent = QuarantineIntent {
        version: 1,
        id: candidate.id.clone(),
        original_path: candidate.source.to_string_lossy().into_owned(),
        scan_root: candidate.scan_root.to_string_lossy().into_owned(),
        bytes: candidate.bytes,
        kind: candidate.kind.clone(),
        modified_at_epoch_nanos: candidate.modified_at_epoch_nanos,
        quarantined_at_epoch_secs,
    };
    let journal = serde_json::to_vec_pretty(&intent)
        .map_err(|_| "The quarantine journal could not be prepared.")?;
    if let Err(error) = sync_write(&directory.join(INTENT_FILE), &journal) {
        let _ = fs::remove_dir(&directory);
        return Err(error);
    }

    let payload = directory.join(PAYLOAD_NAME);
    if let Err(error) = fs::rename(&candidate.source, &payload) {
        if candidate.source.exists() && !payload.exists() {
            let _ = fs::remove_dir_all(&directory);
        }
        return Err(if error.raw_os_error() == Some(17) {
            "This item is on another drive. Cross-drive quarantine is not enabled yet.".to_string()
        } else {
            "Windows could not move this item. It may be open or protected; nothing was deleted."
                .to_string()
        });
    }
    if candidate.source.exists() || !payload.exists() {
        return Err(
            "The move could not be verified. Use Quarantine to inspect recovery status.".into(),
        );
    }
    let _ = sync_write(&directory.join(COMMITTED_MARKER), b"1");
    Ok(entry_from_intent(&intent, "ready"))
}

pub fn list(root: &Path) -> Result<Vec<QuarantineEntry>, String> {
    let items_root = root.join("items");
    if !items_root.exists() {
        return Ok(Vec::new());
    }
    validate_private_directory(root)?;
    validate_private_directory(&items_root)?;
    let mut entries = Vec::new();
    for directory in
        fs::read_dir(&items_root).map_err(|_| "The private quarantine folder cannot be read.")?
    {
        let directory = directory.map_err(|_| "A quarantine record cannot be read.")?;
        let path = directory.path();
        let metadata =
            fs::symlink_metadata(&path).map_err(|_| "A quarantine record cannot be inspected.")?;
        if !metadata.is_dir() {
            continue;
        }
        if is_reparse_point(&metadata) {
            return Err("A quarantine record failed the safety check.".into());
        }
        let intent = load_intent(&path)?;
        let payload = path.join(PAYLOAD_NAME);
        let original = Path::new(&intent.original_path);
        if payload.exists() {
            let restore_status = if original.exists() {
                "conflict"
            } else {
                "ready"
            };
            if !path.join(COMMITTED_MARKER).exists() {
                let _ = sync_write(&path.join(COMMITTED_MARKER), b"recovered");
            }
            entries.push(entry_from_intent(&intent, restore_status));
        }
    }
    entries.sort_by(|left, right| {
        right
            .quarantined_at_epoch_secs
            .cmp(&left.quarantined_at_epoch_secs)
            .then_with(|| right.id.cmp(&left.id))
    });
    Ok(entries)
}

pub fn restore(root: &Path, id: &str) -> Result<(), String> {
    validate_private_directory(root)?;
    validate_private_directory(&root.join("items"))?;
    let directory = item_directory(root, id)?;
    validate_private_directory(&directory)?;
    let intent = load_intent(&directory)?;
    if intent.id != id {
        return Err("The quarantine record does not match this item.".into());
    }
    let payload = directory.join(PAYLOAD_NAME);
    let source = PathBuf::from(&intent.original_path);
    if source.exists() {
        return Err("Restore stopped because an item already exists at the original location. Nothing was overwritten.".into());
    }
    let metadata = fs::symlink_metadata(&payload)
        .map_err(|_| "The quarantined item is unavailable or was already restored.")?;
    if is_reparse_point(&metadata) {
        return Err("The quarantined item failed the safety check.".into());
    }
    let kind_matches = (intent.kind == "file" && metadata.is_file())
        || (intent.kind == "folder" && metadata.is_dir());
    let size_matches = metadata.is_dir() || metadata.len() == intent.bytes;
    if !kind_matches || !size_matches {
        return Err("The quarantined item changed and cannot be restored automatically.".into());
    }
    let parent = source
        .parent()
        .ok_or_else(|| "The original location is invalid.".to_string())?;
    let parent = parent
        .canonicalize()
        .map_err(|_| "The original parent folder no longer exists.")?;
    let scan_root = PathBuf::from(&intent.scan_root)
        .canonicalize()
        .map_err(|_| "The original scan folder no longer exists.")?;
    if !parent.starts_with(&scan_root) || scanner::protected(&source) {
        return Err("The original location no longer passes the safety check.".into());
    }
    fs::rename(&payload, &source)
        .map_err(|_| "Windows could not restore this item. Nothing was overwritten.".to_string())?;
    if !source.exists() || payload.exists() {
        return Err("The restore could not be verified. The quarantine record was kept.".into());
    }
    let _ = sync_write(&directory.join(RESTORED_MARKER), b"1");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file_candidate(scan_root: &Path, source: &Path, id: &str) -> CandidateSnapshot {
        let metadata = fs::metadata(source).unwrap();
        CandidateSnapshot {
            id: id.into(),
            source: source.into(),
            scan_root: scan_root.into(),
            bytes: metadata.len(),
            kind: "file".into(),
            modified_at_epoch_nanos: metadata.modified().ok().and_then(epoch_nanos),
        }
    }

    #[test]
    fn quarantines_and_restores_without_reading_file_contents() {
        let temp = tempfile::tempdir().unwrap();
        let scan_root = temp.path().join("scan");
        let vault = temp.path().join("vault");
        fs::create_dir(&scan_root).unwrap();
        let source = scan_root.join("old.tmp");
        fs::write(&source, b"synthetic").unwrap();
        let candidate = file_candidate(&scan_root, &source, "scan-1");

        let entry = quarantine(&vault, &candidate).unwrap();
        assert_eq!(entry.original_path, source.to_string_lossy());
        assert!(!source.exists());
        assert_eq!(list(&vault).unwrap().len(), 1);

        restore(&vault, &entry.id).unwrap();
        assert!(source.exists());
        assert!(list(&vault).unwrap().is_empty());
        assert_eq!(fs::read(source).unwrap(), b"synthetic");
    }

    #[test]
    fn rejects_a_candidate_changed_after_the_scan() {
        let temp = tempfile::tempdir().unwrap();
        let scan_root = temp.path().join("scan");
        let vault = temp.path().join("vault");
        fs::create_dir(&scan_root).unwrap();
        let source = scan_root.join("old.tmp");
        fs::write(&source, b"before").unwrap();
        let candidate = file_candidate(&scan_root, &source, "scan-2");
        fs::write(&source, b"after-change").unwrap();
        assert!(quarantine(&vault, &candidate).is_err());
        assert!(source.exists());
    }

    #[test]
    fn restore_never_overwrites_a_new_item() {
        let temp = tempfile::tempdir().unwrap();
        let scan_root = temp.path().join("scan");
        let vault = temp.path().join("vault");
        fs::create_dir(&scan_root).unwrap();
        let source = scan_root.join("old.tmp");
        fs::write(&source, b"original").unwrap();
        let candidate = file_candidate(&scan_root, &source, "scan-3");
        quarantine(&vault, &candidate).unwrap();
        fs::write(&source, b"replacement").unwrap();

        assert!(restore(&vault, "scan-3").is_err());
        assert_eq!(fs::read(&source).unwrap(), b"replacement");
        let entries = list(&vault).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].restore_status, "conflict");
        assert!(vault
            .join("items")
            .join("scan-3")
            .join(PAYLOAD_NAME)
            .exists());
    }

    #[test]
    fn quarantines_and_restores_an_empty_folder() {
        let temp = tempfile::tempdir().unwrap();
        let scan_root = temp.path().join("scan");
        let vault = temp.path().join("vault");
        let source = scan_root.join("empty");
        fs::create_dir_all(&source).unwrap();
        let candidate = CandidateSnapshot {
            id: "scan-4".into(),
            source: source.clone(),
            scan_root: scan_root.clone(),
            bytes: 0,
            kind: "folder".into(),
            modified_at_epoch_nanos: None,
        };

        quarantine(&vault, &candidate).unwrap();
        assert!(!source.exists());
        restore(&vault, "scan-4").unwrap();
        assert!(source.is_dir());
    }
}
