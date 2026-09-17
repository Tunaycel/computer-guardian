import { useMemo, useState } from "react";
import { Archive, FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { Select } from "../../components/Select";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";
import type { ScanItem, ScanResult, ReviewCategory } from "../dashboard/useFolderScan";
import { CATEGORY_LABELS, formatBytes, formatModified, formatScanPath, formatScanRootName } from "./scanPresentation";

type Filter = "all" | ReviewCategory;
const MAX_VISIBLE_ITEMS = 100;

function resultLabel(result: ScanResult, remaining: number) {
  if (result.cancelled) return "Cancelled scan";
  if (result.truncated || result.progress.errors > 0) return "Partial scan";
  return `${remaining.toLocaleString()} to review`;
}

interface CleanupPageProps {
  result: ScanResult | null;
  running: boolean;
  quarantineAvailable: boolean;
  busyId: string | null;
  error: string | null;
  notice: string | null;
  quarantinedCandidateIds: Set<string>;
  onOpenDashboard: () => void;
  onQuarantine: (candidateId: string) => Promise<boolean>;
}

export function CleanupPage({ result, running, quarantineAvailable, busyId, error, notice, quarantinedCandidateIds, onOpenDashboard, onQuarantine }: CleanupPageProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ScanItem | null>(null);
  const availableItems = useMemo(
    () => result?.items.filter(item => !quarantinedCandidateIds.has(item.candidateId)) ?? [],
    [quarantinedCandidateIds, result],
  );
  const filtered = useMemo(() => {
    const matching = filter === "all" ? availableItems : availableItems.filter(item => item.category === filter);
    return matching.slice().sort((a, b) => b.bytes - a.bytes).slice(0, MAX_VISIBLE_ITEMS);
  }, [availableItems, filter]);
  const columns = useMemo(() => [
    { key: "path", label: "Item", render: (row: ScanItem) => <div className="review-item"><span className="file-path">{row.path}</span><span className="muted">{row.kind === "folder" ? "Folder" : "File"}</span></div> },
    { key: "category", label: "Category", render: (row: ScanItem) => CATEGORY_LABELS[row.category] },
    { key: "reason", label: "Why it needs review", render: (row: ScanItem) => <span className="review-reason">{row.reason}</span> },
    { key: "size", label: "Size", render: (row: ScanItem) => row.kind === "folder" ? "—" : formatBytes(row.bytes) },
    { key: "modified", label: "Modified", render: (row: ScanItem) => formatModified(row.modifiedAtEpochSecs) },
    { key: "action", label: "Action", render: (row: ScanItem) => <Button onClick={() => setSelected(row)} disabled={!quarantineAvailable || busyId !== null}>Quarantine</Button> },
  ], [busyId, quarantineAvailable]);

  async function confirmQuarantine() {
    if (!selected) return;
    if (await onQuarantine(selected.candidateId)) setSelected(null);
  }

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Cleanup</h1><p className="page-description">Understand why an item was identified before any future action.</p></div>
        <StatusBadge label={running ? "Scan in progress" : result ? resultLabel(result, availableItems.length) : "No scan data"} tone={availableItems.length > 0 ? "attention" : "neutral"} />
      </header>

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {notice ? <p className="success-text" role="status">{notice}</p> : null}

      {!result ? <section className="content-panel">
        <EmptyState icon={FileSearch} title={running ? "Scanning the selected folder" : "Scan a folder first"}>
          {running ? "Results will appear here when the read-only scan finishes." : "Open the Dashboard and choose a folder. No location is scanned automatically."}
        </EmptyState>
        <Button onClick={onOpenDashboard}>{running ? "View scan progress" : "Go to Dashboard"}</Button>
      </section> : <>
        <section className="content-panel review-intro" aria-labelledby="review-summary-heading">
          <header className="content-panel__header"><h2 id="review-summary-heading">Review summary</h2><span className="muted">Read-only · this session</span></header>
          <p><strong>{result.progress.reviewItemsSeen.toLocaleString()}</strong> items matched conservative review rules. Nothing here is described as unnecessary or safe to delete.</p>
          <p className="panel-note">Selected folder: <strong>{formatScanRootName(result.root)}</strong></p>
          <details className="path-details"><summary>Show full path</summary><code>{formatScanPath(result.root)}</code></details>
          <p className="panel-note">Rules used: screenshots {result.rulesUsed.screenshotDays} days, downloads {result.rulesUsed.downloadDays} days, temporary-file candidates {result.rulesUsed.temporaryDays} days, and {result.rulesUsed.excludedPaths.length} relative exclusions.</p>
        </section>

        <section className="content-panel" aria-labelledby="review-items-heading">
          <header className="content-panel__header"><div><h2 id="review-items-heading">Items requiring judgment</h2><p className="panel-note">Sorted by size. Results retain the exact rules used when their scan started.</p></div></header>
          <div className="review-controls">
            <Select label="Filter category" value={filter} onChange={event => setFilter(event.target.value as Filter)}>
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </Select>
            <span className="muted">Showing {filtered.length.toLocaleString()} of {availableItems.length.toLocaleString()} remaining review items.</span>
          </div>
          {filtered.length > 0 ? <Table caption="Review candidates" columns={columns} rows={filtered} rowKey={row => `${row.kind}:${row.path}`} /> : <EmptyState icon={ShieldCheck} title="No matching review candidates">No stored item matches this category. Files within their age threshold are intentionally excluded from this review list.</EmptyState>}
          {(result.itemsTruncated || result.items.length > MAX_VISIBLE_ITEMS) && <p className="panel-note">The interface shows at most 100 matching rows at once, and the native scanner stores at most 500 candidates per scan.</p>}
          <div className="action-lock" role="note"><ShieldCheck size={18} aria-hidden="true" /><span><strong>Permanent deletion is locked.</strong> Quarantine moves one confirmed item into private app storage; Restore is available from the Quarantine screen.</span></div>
        </section>
      </>}

      {selected ? <Dialog title="Move this item to Quarantine?" onClose={() => setSelected(null)}>
        <div className="confirmation-item"><Archive size={20} aria-hidden="true" /><div><strong>{selected.path.split(/[\\/]/).pop()}</strong><p className="panel-note">{CATEGORY_LABELS[selected.category]} · {selected.kind === "folder" ? "empty folder" : formatBytes(selected.bytes)}</p></div></div>
        <p>This moves the item out of its original location. It is not permanently deleted and can be restored from Quarantine.</p>
        <p className="panel-note">The app will stop if the item changed after this scan.</p>
        <div className="dialog__footer dialog__footer--split">
          <Button onClick={() => setSelected(null)} disabled={busyId !== null}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmQuarantine()} disabled={busyId !== null}>{busyId === selected.candidateId ? "Moving…" : "Move to Quarantine"}</Button>
        </div>
      </Dialog> : null}
    </div>
  );
}
