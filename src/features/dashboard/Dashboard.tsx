import { useState } from "react";
import { ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";
import { formatBytes } from "../cleanup/scanPresentation";
import type { ReviewCategory } from "./useFolderScan";
import type { useFolderScan } from "./useFolderScan";

type CategoryRow = { id: ReviewCategory; name: string; rule: string; status: string };
const columns = [
  { key: "name", label: "Category", render: (row: CategoryRow) => row.name },
  { key: "rule", label: "Default review rule", render: (row: CategoryRow) => row.rule },
  { key: "status", label: "Candidates", render: (row: CategoryRow) => <span className="muted">{row.status}</span> },
];

type FolderScan = ReturnType<typeof useFolderScan>;

export function Dashboard({ scan }: { scan: FolderScan }) {
  const [showSafety, setShowSafety] = useState(false);
  const displayedRules = scan.result?.rulesUsed ?? scan.rules;
  const categories: readonly Omit<CategoryRow, "status">[] = [
    { id: "screenshots", name: "Screenshots", rule: `Modified ${displayedRules.screenshotDays}+ days ago` },
    { id: "downloads", name: "Downloads", rule: `Modified ${displayedRules.downloadDays}+ days ago` },
    { id: "temporaryFiles", name: "Temporary files", rule: `Modified ${displayedRules.temporaryDays}+ days ago` },
    { id: "emptyFolders", name: "Empty folders", rule: "Individual review" },
  ];
  const categoryRows: CategoryRow[] = categories.map(category => {
    const summary = scan.result?.categorySummaries.find(item => item.category === category.id);
    return { ...category, status: summary ? `${summary.count.toLocaleString()} · ${formatBytes(summary.bytes)}` : "Not classified" };
  });
  return (
    <div className="page">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Dashboard</h1><p className="page-description">Storage review and maintenance status.</p></div>
        <StatusBadge label={scan.running ? "Scanning" : scan.result ? scan.result.cancelled ? "Cancelled" : scan.result.truncated || scan.result.progress.errors > 0 ? "Partial scan" : "Scanned" : "No scan data"} />
      </header>
      <div className="toolbar">
        <Button variant="primary" disabled={!scan.available || scan.running} onClick={scan.selectAndScan} aria-describedby="scan-availability"><ScanLine size={16} aria-hidden="true" />Choose folder and scan</Button>
        {scan.running && <Button onClick={scan.cancel}>Cancel scan</Button>}
        <span className="muted" id="scan-availability">{scan.available ? "Read-only metadata scan. Nothing is changed or deleted." : "Scanning requires the native desktop app; this browser preview cannot access files."}</span>
      </div>
      <section className="content-panel" aria-labelledby="cleanup-heading">
        <header className="content-panel__header"><h2 id="cleanup-heading">Cleanup overview</h2><span className="muted">Inventory scan: {scan.running ? "In progress" : scan.result ? scan.result.cancelled ? "Cancelled this session" : scan.result.truncated || scan.result.progress.errors > 0 ? "Partial this session" : "Completed this session" : "Never"}</span></header>
        <Table caption="Conservative review categories" columns={columns} rows={categoryRows} rowKey={row => row.id} />
        <p className="panel-note">Age identifies files for review. It does not determine whether a file is safe to remove. {scan.result ? "These are the rules captured when this scan started." : "These saved rules will apply to the next scan."}</p>
      </section>
      <section className="content-panel" aria-label="File handling">
        {scan.error && <p className="error-text" role="alert">{scan.error}</p>}
        {scan.progress && <p className="scan-summary" role="status">{scan.running ? "Scanning:" : scan.result?.cancelled ? "Cancelled:" : "Scan finished:"} {scan.progress.filesSeen.toLocaleString()} files, {scan.progress.foldersSeen.toLocaleString()} folders, {formatBytes(scan.progress.bytesSeen)} counted, {scan.progress.reviewItemsSeen.toLocaleString()} candidates for review. {scan.progress.errors > 0 && `${scan.progress.errors} unreadable entries.`}</p>}
        {scan.result ? <>
          <p className="scan-root">Selected folder: <code>{scan.result.root}</code></p>
          <p className="panel-note">Only metadata was read. Links, junctions, known repository/dependency folders, and {scan.result.rulesUsed.excludedPaths.length.toLocaleString()} saved relative exclusions were skipped. Candidates are signals for review, not a list of safe-to-delete files. {scan.result.truncated && "The scan stopped at its 100,000-entry safety limit."} {scan.result.itemsTruncated && "The review list is limited to 500 items."}</p>
        </> : !scan.running && <EmptyState icon={ShieldCheck} title="No files have been examined">
          {scan.available ? "Choose a folder to start a read-only scan. No folder is accessed automatically." : "Your folders have not been accessed. Open the native app to scan a folder."}
        </EmptyState>}
        <Button onClick={() => setShowSafety(true)}>Review safety model</Button>
      </section>
      <section className="content-panel" aria-labelledby="health-heading">
        <header className="content-panel__header"><h2 id="health-heading">System checks</h2><StatusBadge label="Unavailable" /></header>
        <p className="section-description">Storage, memory, startup, and security checks have not been performed. No health assessment is available.</p>
      </section>
      {showSafety && <Dialog title="Safety model" onClose={() => setShowSafety(false)}>
        <p>The cleanup workflow is designed around individual review and recoverable file operations.</p>
        <ol className="safety-steps">
          <li><strong>Scan</strong><span>Read only the locations you select.</span></li>
          <li><strong>Review</strong><span>Inspect each file and its classification reason.</span></li>
          <li><strong>Quarantine</strong><span>Move selected files while recording their original locations.</span></li>
          <li><strong>Restore or delete</strong><span>Restore without overwriting existing files. Permanent deletion requires a separate action.</span></li>
        </ol>
        <p className="muted">Only read-only folder scanning is enabled in the native build. Quarantine, restore, and deletion are not enabled.</p>
        <footer className="dialog__footer"><Button onClick={() => setShowSafety(false)}>Close</Button></footer>
      </Dialog>}
    </div>
  );
}
