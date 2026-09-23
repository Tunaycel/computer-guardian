use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
#[cfg(windows)]
use std::path::{Component, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_RESULTS: usize = 500;
const MAX_ENTRIES: u64 = 100_000;
const MAX_AGE_DAYS: u32 = 3650;
const MAX_EXCLUSIONS: usize = 50;
const MAX_EXCLUSION_LENGTH: usize = 512;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRules {
    pub screenshot_days: u32,
    pub download_days: u32,
    pub temporary_days: u32,
    pub excluded_paths: Vec<String>,
}

impl Default for ScanRules {
    fn default() -> Self {
        Self {
            screenshot_days: 30,
            download_days: 90,
            temporary_days: 14,
            excluded_paths: Vec::new(),
        }
    }
}

impl ScanRules {
    pub fn validate(&self) -> Result<(), String> {
        if [
            self.screenshot_days,
            self.download_days,
            self.temporary_days,
        ]
        .into_iter()
        .any(|days| !(1..=MAX_AGE_DAYS).contains(&days))
        {
            return Err(format!(
                "Every age threshold must be a whole number from 1 to {MAX_AGE_DAYS}."
            ));
        }
        if self.excluded_paths.len() > MAX_EXCLUSIONS {
            return Err(format!("Use no more than {MAX_EXCLUSIONS} exclusions."));
        }
        for raw_path in &self.excluded_paths {
            let path = raw_path.trim().replace('\\', "/");
            let segments: Vec<_> = path.split('/').collect();
            let has_drive = path.as_bytes().get(1) == Some(&b':');
            if path.is_empty() || path.len() > MAX_EXCLUSION_LENGTH {
                return Err(format!(
                    "Each exclusion must contain 1 to {MAX_EXCLUSION_LENGTH} characters."
                ));
            }
            if path.starts_with('/') || has_drive {
                return Err("Exclusions must be relative to the selected folder.".into());
            }
            if segments
                .iter()
                .any(|segment| segment.is_empty() || *segment == "." || *segment == "..")
            {
                return Err("Exclusions cannot contain empty, '.' or '..' path segments.".into());
            }
            if path.chars().any(|character| {
                character == '*' || character == '?' || character == ':' || character.is_control()
            }) {
                return Err(
                    "Exclusions cannot contain wildcards, control characters, or colons.".into(),
                );
            }
        }
        Ok(())
    }
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub files_seen: u64,
    pub folders_seen: u64,
    pub bytes_seen: u64,
    pub errors: u64,
    pub review_items_seen: u64,
}

impl ScanProgress {
    pub fn plus(&self, other: &Self) -> Self {
        Self {
            files_seen: self.files_seen.saturating_add(other.files_seen),
            folders_seen: self.folders_seen.saturating_add(other.folders_seen),
            bytes_seen: self.bytes_seen.saturating_add(other.bytes_seen),
            errors: self.errors.saturating_add(other.errors),
            review_items_seen: self
                .review_items_seen
                .saturating_add(other.review_items_seen),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Category {
    Screenshots,
    Downloads,
    TemporaryFiles,
    EmptyFolders,
    Other,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Classification {
    Review,
    Ignored,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanItem {
    pub candidate_id: String,
    pub path: String,
    pub bytes: u64,
    pub kind: &'static str,
    pub category: Category,
    pub classification: Classification,
    pub reason: String,
    pub modified_at_epoch_secs: Option<u64>,
    #[serde(skip_serializing)]
    pub modified_at_epoch_nanos: Option<u64>,
    #[serde(skip_serializing)]
    pub scan_root: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorySummary {
    pub category: Category,
    pub count: u64,
    pub bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: String,
    pub roots: Vec<String>,
    pub progress: ScanProgress,
    pub items: Vec<ScanItem>,
    pub category_summaries: Vec<CategorySummary>,
    pub cancelled: bool,
    pub truncated: bool,
    pub items_truncated: bool,
    pub rules_used: ScanRules,
}

#[derive(Default)]
struct Totals {
    screenshots: (u64, u64),
    downloads: (u64, u64),
    temporary_files: (u64, u64),
    empty_folders: (u64, u64),
}

impl Totals {
    fn add(&mut self, category: Category, bytes: u64) {
        let total = match category {
            Category::Screenshots => &mut self.screenshots,
            Category::Downloads => &mut self.downloads,
            Category::TemporaryFiles => &mut self.temporary_files,
            Category::EmptyFolders => &mut self.empty_folders,
            Category::Other => return,
        };
        total.0 += 1;
        total.1 = total.1.saturating_add(bytes);
    }

    fn summaries(self) -> Vec<CategorySummary> {
        [
            (Category::Screenshots, self.screenshots),
            (Category::Downloads, self.downloads),
            (Category::TemporaryFiles, self.temporary_files),
            (Category::EmptyFolders, self.empty_folders),
        ]
        .into_iter()
        .map(|(category, (count, bytes))| CategorySummary {
            category,
            count,
            bytes,
        })
        .collect()
    }
}

fn component_named(path: &Path, names: &[&str]) -> bool {
    path.components().any(|part| {
        let name = part.as_os_str().to_string_lossy().to_ascii_lowercase();
        names.contains(&name.as_str())
    })
}

fn age_days(modified: Option<SystemTime>, now: SystemTime) -> Option<u64> {
    modified
        .and_then(|time| now.duration_since(time).ok())
        .map(|age| age.as_secs() / 86_400)
}

fn classify_file(
    path: &Path,
    age: Option<u64>,
    rules: &ScanRules,
) -> (Category, Classification, String) {
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase();
    let extension = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase();
    let is_image = matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "heic"
    );
    let screenshot = is_image
        && (component_named(path, &["screenshots"])
            || name.contains("screenshot")
            || name.contains("screen shot"));
    let temporary = matches!(extension.as_str(), "tmp" | "temp")
        || component_named(path, &["temp", "tmp", "cache", "caches"]);
    let download = component_named(path, &["downloads"]);

    let (category, threshold, label) = if screenshot {
        (Category::Screenshots, rules.screenshot_days, "Screenshot")
    } else if temporary {
        (
            Category::TemporaryFiles,
            rules.temporary_days,
            "Temporary-file candidate",
        )
    } else if download {
        (Category::Downloads, rules.download_days, "Download")
    } else {
        return (
            Category::Other,
            Classification::Ignored,
            "No conservative review rule matched.".into(),
        );
    };

    match age {
        Some(days) if days >= u64::from(threshold) => (
            category,
            Classification::Review,
            format!(
                "{label} was last modified {days} days ago, meeting the configured {threshold}-day review threshold."
            ),
        ),
        Some(days) => (
            category,
            Classification::Ignored,
            format!(
                "{label} was last modified {days} days ago, within the configured {threshold}-day review threshold."
            ),
        ),
        None => (
            category,
            Classification::Ignored,
            format!("{label} age is unavailable, so it was not added for review."),
        ),
    }
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

pub(crate) fn protected(root: &Path) -> bool {
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

fn user_excluded(path: &Path, root: &Path, rules: &ScanRules) -> bool {
    let Ok(relative) = path.strip_prefix(root) else {
        return false;
    };
    let relative = relative
        .to_string_lossy()
        .replace('\\', "/")
        .to_ascii_lowercase();
    rules.excluded_paths.iter().any(|raw_path| {
        let exclusion = raw_path.trim().replace('\\', "/").to_ascii_lowercase();
        relative == exclusion || relative.starts_with(&format!("{exclusion}/"))
    })
}

pub fn scan<F: FnMut(ScanProgress)>(
    root: &Path,
    rules: &ScanRules,
    scan_id: &str,
    cancel: &AtomicBool,
    mut report: F,
) -> Result<ScanResult, String> {
    rules.validate()?;
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
        review_items_seen: 0,
    };
    let mut items = Vec::new();
    let mut totals = Totals::default();
    let mut stack = vec![root.clone()];
    let mut truncated = false;
    let mut items_truncated = false;
    let mut entries_seen = 0_u64;
    let now = SystemTime::now();
    while let Some(folder) = stack.pop() {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let mut entries = match fs::read_dir(&folder) {
            Ok(entries) => entries,
            Err(_) => {
                progress.errors += 1;
                continue;
            }
        };
        progress.folders_seen += 1;
        let mut folder_is_empty = true;
        while let Some(entry) = entries.next() {
            if cancel.load(Ordering::Relaxed) {
                break;
            }
            folder_is_empty = false;
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
            let path = entry.path();
            if excluded(&name) || user_excluded(&path, &root, rules) {
                continue;
            }
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
                let modified = metadata.modified().ok();
                let (category, classification, reason) =
                    classify_file(&path, age_days(modified, now), rules);
                if classification == Classification::Review {
                    progress.review_items_seen += 1;
                    totals.add(category, metadata.len());
                    if items.len() < MAX_RESULTS {
                        items.push(ScanItem {
                            candidate_id: format!("{scan_id}-{}", items.len()),
                            path: path.to_string_lossy().into_owned(),
                            bytes: metadata.len(),
                            kind: "file",
                            category,
                            classification,
                            reason,
                            modified_at_epoch_secs: modified
                                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                                .map(|duration| duration.as_secs()),
                            modified_at_epoch_nanos: modified
                                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                                .and_then(|duration| u64::try_from(duration.as_nanos()).ok()),
                            scan_root: root.to_string_lossy().into_owned(),
                        });
                    } else {
                        items_truncated = true;
                    }
                }
            }
            if entries_seen % 100 == 0 {
                report(progress.clone());
            }
        }
        if folder_is_empty && folder != root && !cancel.load(Ordering::Relaxed) {
            progress.review_items_seen += 1;
            totals.add(Category::EmptyFolders, 0);
            if items.len() < MAX_RESULTS {
                items.push(ScanItem {
                    candidate_id: format!("{scan_id}-{}", items.len()),
                    path: folder.to_string_lossy().into_owned(),
                    bytes: 0,
                    kind: "folder",
                    category: Category::EmptyFolders,
                    classification: Classification::Review,
                    reason: "The folder is empty. Some applications intentionally create empty folders, so review it individually.".into(),
                    modified_at_epoch_secs: None,
                    modified_at_epoch_nanos: None,
                    scan_root: root.to_string_lossy().into_owned(),
                });
            } else {
                items_truncated = true;
            }
        }
        if truncated {
            break;
        }
    }
    report(progress.clone());
    let root = root.to_string_lossy().into_owned();
    Ok(ScanResult {
        roots: vec![root.clone()],
        root,
        progress,
        items,
        category_summaries: totals.summaries(),
        cancelled: cancel.load(Ordering::Relaxed),
        truncated,
        items_truncated,
        rules_used: rules.clone(),
    })
}

pub fn merge(label: &str, results: Vec<ScanResult>, rules: &ScanRules) -> ScanResult {
    let mut progress = ScanProgress::default();
    let mut totals = Totals::default();
    let mut roots = Vec::new();
    let mut items = Vec::new();
    let mut cancelled = false;
    let mut truncated = false;
    let mut items_truncated = false;

    for result in results {
        progress = progress.plus(&result.progress);
        roots.extend(result.roots);
        cancelled |= result.cancelled;
        truncated |= result.truncated;
        items_truncated |= result.items_truncated;
        for summary in result.category_summaries {
            let target = match summary.category {
                Category::Screenshots => &mut totals.screenshots,
                Category::Downloads => &mut totals.downloads,
                Category::TemporaryFiles => &mut totals.temporary_files,
                Category::EmptyFolders => &mut totals.empty_folders,
                Category::Other => continue,
            };
            target.0 = target.0.saturating_add(summary.count);
            target.1 = target.1.saturating_add(summary.bytes);
        }
        let remaining = MAX_RESULTS.saturating_sub(items.len());
        if result.items.len() > remaining {
            items_truncated = true;
        }
        items.extend(result.items.into_iter().take(remaining));
    }

    ScanResult {
        root: label.into(),
        roots,
        progress,
        items,
        category_summaries: totals.summaries(),
        cancelled,
        truncated,
        items_truncated,
        rules_used: rules.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicBool;

    fn rules() -> ScanRules {
        ScanRules::default()
    }

    #[test]
    fn scans_only_selected_tree_and_skips_exclusions() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("selected");
        fs::create_dir(&root).unwrap();
        fs::write(root.join("sample.txt"), b"hello").unwrap();
        fs::create_dir(root.join(".git")).unwrap();
        fs::write(root.join(".git").join("secret"), b"hidden").unwrap();
        fs::write(temp.path().join("outside"), b"outside").unwrap();
        let result = scan(&root, &rules(), "test", &AtomicBool::new(false), |_| {}).unwrap();
        assert_eq!(result.progress.files_seen, 1);
        assert_eq!(result.progress.bytes_seen, 5);
        assert!(result.items.is_empty());
        assert!(!result.cancelled);
    }

    #[test]
    fn cancellation_does_not_report_complete() {
        let temp = tempfile::tempdir().unwrap();
        let result = scan(
            temp.path(),
            &rules(),
            "test",
            &AtomicBool::new(true),
            |_| {},
        )
        .unwrap();
        assert!(result.cancelled);
        assert_eq!(result.progress.files_seen, 0);
    }

    #[test]
    fn rejects_a_file_as_scan_root() {
        let temp = tempfile::tempdir().unwrap();
        let file = temp.path().join("file");
        fs::write(&file, b"data").unwrap();
        assert!(scan(&file, &rules(), "test", &AtomicBool::new(false), |_| {}).is_err());
    }

    #[test]
    fn rejects_filesystem_root_without_traversal() {
        let temp = tempfile::tempdir().unwrap();
        let filesystem_root = temp.path().ancestors().last().unwrap();
        assert!(protected(filesystem_root));
        assert!(scan(
            filesystem_root,
            &rules(),
            "test",
            &AtomicBool::new(false),
            |_| {}
        )
        .is_err());
    }

    #[test]
    fn stops_after_cancellation_during_progress() {
        let temp = tempfile::tempdir().unwrap();
        for index in 0..150 {
            fs::write(temp.path().join(format!("{index:03}.txt")), b"x").unwrap();
        }
        let cancel = AtomicBool::new(false);
        let result = scan(temp.path(), &rules(), "test", &cancel, |progress| {
            if progress.files_seen >= 99 {
                cancel.store(true, Ordering::Relaxed);
            }
        })
        .unwrap();
        assert!(result.cancelled);
        assert!(result.progress.files_seen < 150);
    }

    #[test]
    fn classifies_only_old_conservative_candidates_for_review() {
        let (category, state, reason) = classify_file(
            Path::new(r"C:\Users\Example\Pictures\Screenshots\Screenshot_1.png"),
            Some(31),
            &rules(),
        );
        assert_eq!(category, Category::Screenshots);
        assert_eq!(state, Classification::Review);
        assert!(reason.contains("30-day"));

        let (category, state, _) = classify_file(
            Path::new(r"C:\Users\Example\Downloads\notes.txt"),
            Some(91),
            &rules(),
        );
        assert_eq!(category, Category::Downloads);
        assert_eq!(state, Classification::Review);

        let (category, state, _) = classify_file(Path::new("session.tmp"), Some(15), &rules());
        assert_eq!(category, Category::TemporaryFiles);
        assert_eq!(state, Classification::Review);

        let (_, state, _) = classify_file(Path::new("recent.tmp"), Some(2), &rules());
        assert_eq!(state, Classification::Ignored);
        let (category, state, _) = classify_file(Path::new("report.pdf"), Some(500), &rules());
        assert_eq!(category, Category::Other);
        assert_eq!(state, Classification::Ignored);
    }

    #[test]
    fn reports_empty_folders_for_individual_review() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir(temp.path().join("empty")).unwrap();
        let result = scan(
            temp.path(),
            &rules(),
            "test",
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        assert_eq!(result.progress.review_items_seen, 1);
        assert_eq!(result.items.len(), 1);
        assert_eq!(result.items[0].kind, "folder");
        assert_eq!(result.items[0].category, Category::EmptyFolders);
        assert_eq!(result.items[0].classification, Classification::Review);
    }

    #[test]
    fn applies_custom_thresholds_and_preserves_them_in_results() {
        let custom = ScanRules {
            screenshot_days: 60,
            download_days: 120,
            temporary_days: 7,
            excluded_paths: vec!["private".into()],
        };
        let (_, old_state, _) = classify_file(Path::new("session.tmp"), Some(8), &custom);
        let (_, recent_state, _) = classify_file(Path::new("session.tmp"), Some(6), &custom);
        assert_eq!(old_state, Classification::Review);
        assert_eq!(recent_state, Classification::Ignored);

        let temp = tempfile::tempdir().unwrap();
        let result = scan(
            temp.path(),
            &custom,
            "test",
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        assert_eq!(result.rules_used, custom);
    }

    #[test]
    fn skips_configured_relative_paths_and_descendants() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(temp.path().join("visible.txt"), b"visible").unwrap();
        fs::create_dir(temp.path().join("private")).unwrap();
        fs::write(temp.path().join("private").join("secret.txt"), b"secret").unwrap();
        let custom = ScanRules {
            excluded_paths: vec!["private".into()],
            ..rules()
        };
        let result = scan(
            temp.path(),
            &custom,
            "test",
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        assert_eq!(result.progress.files_seen, 1);
        assert_eq!(result.progress.bytes_seen, 7);
    }

    #[test]
    fn rejects_unsafe_or_out_of_range_rules_before_traversal() {
        for exclusion in [r"C:\private", "../private", "private/*"] {
            let custom = ScanRules {
                excluded_paths: vec![exclusion.into()],
                ..rules()
            };
            assert!(custom.validate().is_err());
        }
        let custom = ScanRules {
            screenshot_days: 0,
            ..rules()
        };
        assert!(custom.validate().is_err());
    }
}
