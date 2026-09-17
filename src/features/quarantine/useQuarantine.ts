import { useCallback, useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface QuarantineEntry {
  id: string;
  originalPath: string;
  name: string;
  bytes: number;
  kind: "file" | "folder";
  quarantinedAtEpochSecs: number;
  restoreStatus: "ready" | "conflict";
}

function messageFrom(cause: unknown, fallback: string) {
  return typeof cause === "string" ? cause : fallback;
}

export function useQuarantine() {
  const available = isTauri();
  const [entries, setEntries] = useState<QuarantineEntry[]>([]);
  const [loading, setLoading] = useState(available);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quarantinedCandidateIds, setQuarantinedCandidateIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await invoke<QuarantineEntry[]>("list_quarantine"));
    } catch (cause) {
      setError(messageFrom(cause, "Quarantine records could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function quarantine(candidateId: string) {
    if (!available || busyId) return false;
    setBusyId(candidateId);
    setError(null);
    setNotice(null);
    try {
      const entry = await invoke<QuarantineEntry>("quarantine_candidate", { candidateId });
      setEntries(current => [entry, ...current.filter(item => item.id !== entry.id)]);
      setQuarantinedCandidateIds(current => new Set(current).add(candidateId));
      setNotice(`${entry.name} was moved to Quarantine. You can restore it at any time.`);
      return true;
    } catch (cause) {
      await refresh();
      setError(messageFrom(cause, "This item could not be moved. Nothing was deleted."));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function restore(id: string) {
    if (!available || busyId) return false;
    setBusyId(id);
    setError(null);
    setNotice(null);
    const entry = entries.find(item => item.id === id);
    try {
      await invoke("restore_quarantine_item", { id });
      setEntries(current => current.filter(item => item.id !== id));
      setNotice(`${entry?.name ?? "The item"} was restored to its original location.`);
      return true;
    } catch (cause) {
      await refresh();
      setError(messageFrom(cause, "This item could not be restored. Nothing was overwritten."));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return {
    available,
    entries,
    loading,
    busyId,
    error,
    notice,
    quarantinedCandidateIds,
    quarantine,
    restore,
    refresh,
  };
}
