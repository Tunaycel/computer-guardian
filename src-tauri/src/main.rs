#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{ipc::Channel, State};

#[derive(Default)]
struct ScanState(Mutex<Option<Arc<AtomicBool>>>);

#[tauri::command]
async fn start_scan(
    root: String,
    rules: scanner::ScanRules,
    on_progress: Channel<scanner::ScanProgress>,
    state: State<'_, ScanState>,
) -> Result<scanner::ScanResult, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut running = state
            .0
            .lock()
            .map_err(|_| "Scanner state is unavailable.")?;
        if running.is_some() {
            return Err("A scan is already running.".into());
        }
        *running = Some(cancel.clone());
    }
    let result = tauri::async_runtime::spawn_blocking(move || {
        scanner::scan(std::path::Path::new(&root), &rules, &cancel, |progress| {
            let _ = on_progress.send(progress);
        })
    })
    .await
    .map_err(|_| "The scan worker stopped unexpectedly.".to_string());
    *state
        .0
        .lock()
        .map_err(|_| "Scanner state is unavailable.")? = None;
    result?
}

#[tauri::command]
fn cancel_scan(state: State<'_, ScanState>) -> Result<(), String> {
    if let Some(cancel) = state
        .0
        .lock()
        .map_err(|_| "Scanner state is unavailable.")?
        .as_ref()
    {
        cancel.store(true, Ordering::Relaxed);
    }
    Ok(())
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .without_time()
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ScanState::default())
        .invoke_handler(tauri::generate_handler![start_scan, cancel_scan])
        .run(tauri::generate_context!())
        .expect("error while running Computer Guardian");
}
