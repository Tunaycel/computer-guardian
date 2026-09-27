import { useState } from "react";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ScanRules } from "../settings/useScanRules";

export interface DuplicateProgress {
  phase: "inventory" | "hashing" | "complete";
  filesSeen: number;
  foldersSeen: number;
  bytesSeen: number;
  candidateFiles: number;
  filesHashed: number;
  bytesHashed: number;
  errors: number;
}

export interface DuplicateFile {
  path: string;
  bytes: number;
  modifiedAtEpochSecs: number | null;
}

export interface DuplicateGroup {
  id: string;
  bytesPerFile: number;
  reclaimableBytes: number;
  fileCount: number;
  files: DuplicateFile[];
  filesTruncated: boolean;
}

export interface DuplicateResult {
  root: string;
  progress: DuplicateProgress;
  groups: DuplicateGroup[];
  duplicateFiles: number;
  reclaimableBytes: number;
  cancelled: boolean;
  truncated: boolean;
  groupsTruncated: boolean;
}

export function useDuplicateAnalysis(rules: ScanRules) {
  const available = isTauri();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<DuplicateProgress | null>(null);
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectAndAnalyze() {
    if (!available || running) return;
    setError(null);
    try {
      const root = await open({ directory: true, multiple: false, title: "Choose a folder for duplicate analysis" });
      if (!root || Array.isArray(root)) return;
      setResult(null);
      setProgress(null);
      setRunning(true);
      try {
        const onProgress = new Channel<DuplicateProgress>();
        onProgress.onmessage = setProgress;
        const next = await invoke<DuplicateResult>("start_duplicate_scan", { root, rules, onProgress });
        setResult(next);
        setProgress(next.progress);
      } catch (cause) {
        setError(typeof cause === "string" ? cause : "Duplicate analysis could not be completed.");
      } finally {
        setRunning(false);
      }
    } catch {
      setError("The folder picker could not be opened.");
    }
  }

  async function cancel() {
    try { await invoke("cancel_scan"); }
    catch { setError("Cancellation could not be requested."); }
  }

  return { available, running, progress, result, error, selectAndAnalyze, cancel };
}
