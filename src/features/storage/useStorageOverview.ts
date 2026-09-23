import { useCallback, useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface DriveInfo {
  root: string;
  name: string;
  kind: "Fixed" | "Removable";
  totalBytes: number;
  freeBytes: number;
  isSystem: boolean;
}

export interface ApprovedLocation {
  id: string;
  label: string;
  path: string;
}

export interface StorageOverview {
  drives: DriveInfo[];
  approvedLocations: ApprovedLocation[];
  measuredAtEpochSecs: number;
}

export function useStorageOverview() {
  const available = isTauri();
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    setError(null);
    try {
      setOverview(await invoke<StorageOverview>("get_storage_overview"));
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "Storage information could not be measured.");
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { available, overview, loading, error, refresh };
}
