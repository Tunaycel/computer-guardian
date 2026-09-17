import { useState } from "react";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ScanRules } from "../settings/useScanRules";

export interface ScanProgress {
  filesSeen: number;
  foldersSeen: number;
  bytesSeen: number;
  errors: number;
  reviewItemsSeen: number;
}

export type ReviewCategory = "screenshots" | "downloads" | "temporaryFiles" | "emptyFolders";

export interface ScanItem {
  candidateId: string;
  path: string;
  bytes: number;
  kind: "file" | "folder";
  category: ReviewCategory;
  classification: "review";
  reason: string;
  modifiedAtEpochSecs: number | null;
}

export interface ScanResult {
  root: string;
  progress: ScanProgress;
  items: ScanItem[];
  categorySummaries: { category: ReviewCategory; count: number; bytes: number }[];
  cancelled: boolean;
  truncated: boolean;
  itemsTruncated: boolean;
  rulesUsed: ScanRules;
}

export function useFolderScan(rules: ScanRules) {
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
      const next = await invoke<ScanResult>("start_scan", { root, rules, onProgress });
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

  return { available, running, progress, result, error, rules, selectAndScan, cancel };
}
