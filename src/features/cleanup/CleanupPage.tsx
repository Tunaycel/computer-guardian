import { useMemo, useState } from "react";
import { FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Select } from "../../components/Select";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";
import type { ScanItem, ScanResult, ReviewCategory } from "../dashboard/useFolderScan";
import { CATEGORY_LABELS, formatBytes, formatModified } from "./scanPresentation";

type Filter = "all" | ReviewCategory;
const MAX_VISIBLE_ITEMS = 100;

const columns = [
  { key: "path", label: "Item", render: (row: ScanItem) => <div className="review-item"><span className="file-path">{row.path}</span><span className="muted">{row.kind === "folder" ? "Folder" : "File"}</span></div> },
  { key: "category", label: "Category", render: (row: ScanItem) => CATEGORY_LABELS[row.category] },
  { key: "reason", label: "Why it needs review", render: (row: ScanItem) => <span className="review-reason">{row.reason}</span> },
  { key: "size", label: "Size", render: (row: ScanItem) => row.kind === "folder" ? "—" : formatBytes(row.bytes) },
  { key: "modified", label: "Modified", render: (row: ScanItem) => formatModified(row.modifiedAtEpochSecs) },
];

function resultLabel(result: ScanResult) {
  if (result.cancelled) return "Cancelled scan";
  if (result.truncated || result.progress.errors > 0) return "Partial scan";
  return `${result.progress.reviewItemsSeen.toLocaleString()} to review`;
}

export function CleanupPage({ result, running, onOpenDashboard }: { result: ScanResult | null; running: boolean; onOpenDashboard: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => {
    const matching = filter === "all" ? result?.items ?? [] : result?.items.filter(item => item.category === filter) ?? [];
    return matching.slice().sort((a, b) => b.bytes - a.bytes).slice(0, MAX_VISIBLE_ITEMS);
  }, [filter, result]);

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Cleanup</h1><p className="page-description">Understand why an item was identified before any future action.</p></div>
        <StatusBadge label={running ? "Scan in progress" : result ? resultLabel(result) : "No scan data"} tone={result && result.progress.reviewItemsSeen > 0 ? "attention" : "neutral"} />
      </header>

      {!result ? <section className="content-panel">
        <EmptyState icon={FileSearch} title={running ? "Scanning the selected folder" : "Scan a folder first"}>
          {running ? "Results will appear here when the read-only scan finishes." : "Open the Dashboard and choose a folder. No location is scanned automatically."}
        </EmptyState>
        <Button onClick={onOpenDashboard}>{running ? "View scan progress" : "Go to Dashboard"}</Button>
      </section> : <>
        <section className="content-panel review-intro" aria-labelledby="review-summary-heading">
          <header className="content-panel__header"><h2 id="review-summary-heading">Review summary</h2><span className="muted">Read-only · this session</span></header>
          <p><strong>{result.progress.reviewItemsSeen.toLocaleString()}</strong> items matched conservative review rules. Nothing here is described as unnecessary or safe to delete.</p>
          <p className="panel-note">Selected folder: <code>{result.root}</code></p>
        </section>

        <section className="content-panel" aria-labelledby="review-items-heading">
          <header className="content-panel__header"><div><h2 id="review-items-heading">Items requiring judgment</h2><p className="panel-note">Sorted by size. Classification uses fixed default age thresholds in this milestone.</p></div></header>
          <div className="review-controls">
            <Select label="Filter category" value={filter} onChange={event => setFilter(event.target.value as Filter)}>
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </Select>
            <span className="muted">Showing {filtered.length.toLocaleString()} of {result.items.length.toLocaleString()} stored review items.</span>
          </div>
          {filtered.length > 0 ? <Table caption="Review candidates" columns={columns} rows={filtered} rowKey={row => `${row.kind}:${row.path}`} /> : <EmptyState icon={ShieldCheck} title="No matching review candidates">No stored item matches this category. Files within their age threshold are intentionally excluded from this review list.</EmptyState>}
          {(result.itemsTruncated || result.items.length > MAX_VISIBLE_ITEMS) && <p className="panel-note">The interface shows at most 100 matching rows at once, and the native scanner stores at most 500 candidates per scan.</p>}
          <div className="action-lock" role="note"><ShieldCheck size={18} aria-hidden="true" /><span><strong>Actions are locked.</strong> Quarantine, restore, and deletion are not part of this phase.</span></div>
        </section>
      </>}
    </div>
  );
}
