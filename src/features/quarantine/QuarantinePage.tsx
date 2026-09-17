import { useState } from "react";
import { ArchiveRestore, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatBytes, formatModified, formatScanPath } from "../cleanup/scanPresentation";
import type { QuarantineEntry } from "./useQuarantine";

interface QuarantinePageProps {
  available: boolean;
  entries: QuarantineEntry[];
  loading: boolean;
  busyId: string | null;
  error: string | null;
  notice: string | null;
  onRestore: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export function QuarantinePage({ available, entries, loading, busyId, error, notice, onRestore, onRefresh }: QuarantinePageProps) {
  const [selected, setSelected] = useState<QuarantineEntry | null>(null);

  async function confirmRestore() {
    if (!selected) return;
    if (await onRestore(selected.id)) setSelected(null);
  }

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Quarantine</h1><p className="page-description">Restore reviewed items without permanent deletion.</p></div>
        <StatusBadge label={available ? `${entries.length} stored` : "Native app required"} tone={entries.length > 0 ? "attention" : "neutral"} />
      </header>

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {notice ? <p className="success-text" role="status">{notice}</p> : null}

      <section className="content-panel" aria-labelledby="quarantine-heading">
        <header className="content-panel__header">
          <div><h2 id="quarantine-heading">Restorable items</h2><p className="panel-note">Stored privately on this computer. Permanent deletion remains unavailable.</p></div>
          <Button onClick={() => void onRefresh()} disabled={!available || loading || busyId !== null}><RefreshCw size={16} aria-hidden="true" />{loading ? "Checking…" : "Refresh"}</Button>
        </header>

        {!available ? <EmptyState icon={ArchiveRestore} title="Open the native desktop app">The browser preview cannot access the private quarantine folder.</EmptyState>
          : loading && entries.length === 0 ? <EmptyState icon={ArchiveRestore} title="Checking Quarantine">The app is reading its local recovery records.</EmptyState>
            : entries.length === 0 ? <EmptyState icon={ShieldCheck} title="Quarantine is empty">Items you deliberately move from Cleanup will appear here with a Restore action.</EmptyState>
              : <div className="quarantine-list">{entries.map(entry => (
                <article className="quarantine-entry" key={entry.id}>
                  <div className="quarantine-entry__content">
                    <h3>{entry.name}</h3>
                    <p className="muted">{entry.kind === "folder" ? "Folder" : formatBytes(entry.bytes)} · moved {formatModified(entry.quarantinedAtEpochSecs)}</p>
                    <details className="path-details"><summary>Show original location</summary><code>{formatScanPath(entry.originalPath)}</code></details>
                    {entry.restoreStatus === "conflict" ? <p className="error-text">Restore is blocked because another item now exists at the original location.</p> : null}
                  </div>
                  <Button onClick={() => setSelected(entry)} disabled={busyId !== null || entry.restoreStatus === "conflict"}>{busyId === entry.id ? "Restoring…" : "Restore"}</Button>
                </article>
              ))}</div>}
      </section>

      {selected ? <Dialog title="Restore this item?" onClose={() => setSelected(null)}>
        <p><strong>{selected.name}</strong> will return to its original location.</p>
        <p className="panel-note">Restore stops safely if another item already uses that location. Nothing will be overwritten.</p>
        <div className="dialog__footer dialog__footer--split">
          <Button onClick={() => setSelected(null)} disabled={busyId !== null}>Cancel</Button>
          <Button variant="primary" onClick={() => void confirmRestore()} disabled={busyId !== null}>{busyId === selected.id ? "Restoring…" : "Restore item"}</Button>
        </div>
      </Dialog> : null}
    </div>
  );
}
