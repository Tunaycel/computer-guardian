#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod quarantine;
mod scanner;
mod storage;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{ipc::Channel, Manager, State};

#[derive(Default)]
struct AppState {
    running_scan: Mutex<Option<Arc<AtomicBool>>>,
    file_operation: Mutex<bool>,
    candidates: Mutex<HashMap<String, quarantine::CandidateSnapshot>>,
}

fn quarantine_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("quarantine"))
        .map_err(|_| "The private application data folder is unavailable.".into())
}

fn new_scan_id() -> String {
    format!(
        "{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default()
    )
}

fn begin_scan(state: &AppState) -> Result<Arc<AtomicBool>, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let operation = state
            .file_operation
            .lock()
            .map_err(|_| "File-operation state is unavailable.")?;
        if *operation {
            return Err("Wait for the current quarantine or restore operation to finish.".into());
        }
        let mut running = state
            .running_scan
            .lock()
            .map_err(|_| "Scanner state is unavailable.")?;
        if running.is_some() {
            return Err("A scan is already running.".into());
        }
        *running = Some(cancel.clone());
    }
    state
        .candidates
        .lock()
        .map_err(|_| "Candidate state is unavailable.")?
        .clear();
    Ok(cancel)
}

fn finish_scan(
    state: &AppState,
    result: Result<scanner::ScanResult, String>,
) -> Result<scanner::ScanResult, String> {
    *state
        .running_scan
        .lock()
        .map_err(|_| "Scanner state is unavailable.")? = None;
    let result = result?;
    if !result.cancelled {
        let candidates = result
            .items
            .iter()
            .map(|item| {
                (
                    item.candidate_id.clone(),
                    quarantine::CandidateSnapshot::from_scan_item(item),
                )
            })
            .collect();
        *state
            .candidates
            .lock()
            .map_err(|_| "Candidate state is unavailable.")? = candidates;
    }
    Ok(result)
}

#[tauri::command]
async fn start_scan(
    root: String,
    rules: scanner::ScanRules,
    on_progress: Channel<scanner::ScanProgress>,
    state: State<'_, AppState>,
) -> Result<scanner::ScanResult, String> {
    let cancel = begin_scan(&state)?;
    let scan_id = new_scan_id();
    let result = tauri::async_runtime::spawn_blocking(move || {
        scanner::scan(
            std::path::Path::new(&root),
            &rules,
            &scan_id,
            &cancel,
            |progress| {
                let _ = on_progress.send(progress);
            },
        )
    })
    .await
    .map_err(|_| "The scan worker stopped unexpectedly.".to_string())
    .and_then(|result| result);
    finish_scan(&state, result)
}

#[tauri::command]
async fn start_common_scan(
    rules: scanner::ScanRules,
    on_progress: Channel<scanner::ScanProgress>,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<scanner::ScanResult, String> {
    let locations = storage::approved_scan_locations(&app);
    if locations.is_empty() {
        return Err("No approved common folders are available on this account.".into());
    }
    let cancel = begin_scan(&state)?;
    let scan_id = new_scan_id();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let mut results = Vec::new();
        let mut completed = scanner::ScanProgress::default();
        let mut root_errors = 0_u64;
        for (index, location) in locations.into_iter().enumerate() {
            if cancel.load(Ordering::Relaxed) {
                break;
            }
            let base = completed.clone();
            let location_scan_id = format!("{scan_id}-{index}");
            match scanner::scan(
                std::path::Path::new(&location.path),
                &rules,
                &location_scan_id,
                &cancel,
                |progress| {
                    let _ = on_progress.send(base.plus(&progress));
                },
            ) {
                Ok(result) => {
                    completed = completed.plus(&result.progress);
                    let cancelled = result.cancelled;
                    results.push(result);
                    if cancelled {
                        break;
                    }
                }
                Err(_) => {
                    root_errors = root_errors.saturating_add(1);
                    completed.errors = completed.errors.saturating_add(1);
                    let _ = on_progress.send(completed.clone());
                }
            }
        }
        let mut merged = scanner::merge("Approved common locations", results, &rules);
        merged.progress.errors = merged.progress.errors.saturating_add(root_errors);
        merged.cancelled |= cancel.load(Ordering::Relaxed);
        Ok(merged)
    })
    .await
    .map_err(|_| "The common-folder scan worker stopped unexpectedly.".to_string())
    .and_then(|result| result);
    finish_scan(&state, result)
}

#[tauri::command]
async fn get_storage_overview(app: tauri::AppHandle) -> Result<storage::StorageOverview, String> {
    tauri::async_runtime::spawn_blocking(move || storage::overview(&app))
        .await
        .map_err(|_| "The storage measurement worker stopped unexpectedly.".to_string())?
}

#[tauri::command]
fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(cancel) = state
        .running_scan
        .lock()
        .map_err(|_| "Scanner state is unavailable.")?
        .as_ref()
    {
        cancel.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
async fn quarantine_candidate(
    candidate_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<quarantine::QuarantineEntry, String> {
    let candidate = state
        .candidates
        .lock()
        .map_err(|_| "Candidate state is unavailable.")?
        .get(&candidate_id)
        .cloned()
        .ok_or_else(|| {
            "This review item is no longer current. Scan again before moving it.".to_string()
        })?;
    let root = quarantine_root(&app)?;
    {
        let mut operation = state
            .file_operation
            .lock()
            .map_err(|_| "File-operation state is unavailable.")?;
        if *operation {
            return Err("Another file operation is already running.".into());
        }
        if state
            .running_scan
            .lock()
            .map_err(|_| "Scanner state is unavailable.")?
            .is_some()
        {
            return Err("Wait for the current scan to finish.".into());
        }
        *operation = true;
    }
    let result =
        tauri::async_runtime::spawn_blocking(move || quarantine::quarantine(&root, &candidate))
            .await
            .map_err(|_| "The quarantine worker stopped unexpectedly.".to_string());
    *state
        .file_operation
        .lock()
        .map_err(|_| "File-operation state is unavailable.")? = false;
    let entry = result??;
    state
        .candidates
        .lock()
        .map_err(|_| "Candidate state is unavailable.")?
        .remove(&candidate_id);
    Ok(entry)
}

#[tauri::command]
async fn list_quarantine(
    app: tauri::AppHandle,
) -> Result<Vec<quarantine::QuarantineEntry>, String> {
    let root = quarantine_root(&app)?;
    tauri::async_runtime::spawn_blocking(move || quarantine::list(&root))
        .await
        .map_err(|_| "The quarantine worker stopped unexpectedly.".to_string())?
}

#[tauri::command]
async fn restore_quarantine_item(
    id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = quarantine_root(&app)?;
    {
        let mut operation = state
            .file_operation
            .lock()
            .map_err(|_| "File-operation state is unavailable.")?;
        if *operation {
            return Err("Another file operation is already running.".into());
        }
        if state
            .running_scan
            .lock()
            .map_err(|_| "Scanner state is unavailable.")?
            .is_some()
        {
            return Err("Wait for the current scan to finish.".into());
        }
        *operation = true;
    }
    let result = tauri::async_runtime::spawn_blocking(move || quarantine::restore(&root, &id))
        .await
        .map_err(|_| "The restore worker stopped unexpectedly.".to_string());
    *state
        .file_operation
        .lock()
        .map_err(|_| "File-operation state is unavailable.")? = false;
    result?
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .without_time()
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            start_scan,
            start_common_scan,
            cancel_scan,
            get_storage_overview,
            quarantine_candidate,
            list_quarantine,
            restore_quarantine_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running Computer Guardian");
}
