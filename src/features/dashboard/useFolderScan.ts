import { useState } from "react";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface ScanProgress {
  filesSeen: number;
  foldersSeen: number;
  bytesSeen: number;
  errors: number;
}

export interface ScanResult {
  root: string;
  progress: ScanProgress;
  files: { path: string; bytes: number }[];
  cancelled: boolean;
  truncated: boolean;
}

export function useFolderScan() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = isTauri();

  async function selectAndScan() {
    if (!available || running) return;
    setError(null);
    try {
      const root = await open({ directory: true, multiple: false, title: "Choose a folder to scan" });
      if (!root || Array.isArray(root)) return;
      setResult(null);
      setProgress(null);
      setRunning(true);
      const onProgress = new Channel<ScanProgress>();
      onProgress.onmessage = setProgress;
      const next = await invoke<ScanResult>("start_scan", { root, onProgress });
      setResult(next);
      setProgress(next.progress);
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "The scan could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  async function cancel() {
    try { await invoke("cancel_scan"); }
    catch { setError("Cancellation could not be requested."); }
  }

  return { available, running, progress, result, error, selectAndScan, cancel };
}
