#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .without_time()
        .init();

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Computer Guardian");
}
