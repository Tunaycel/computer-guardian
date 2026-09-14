import { useState } from "react";
import { ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";
import type { useFolderScan } from "./useFolderScan";

const categories = [
  { name: "Screenshots", rule: "Older than 30 days", status: "Not classified" },
  { name: "Downloads", rule: "Older than 90 days", status: "Not classified" },
  { name: "Temporary files", rule: "Older than 14 days", status: "Not classified" },
  { name: "Empty folders", rule: "Individual review", status: "Not classified" },
];
const columns = [
  { key: "name", label: "Category", render: (row: typeof categories[number]) => row.name },
  { key: "rule", label: "Planned default rule", render: (row: typeof categories[number]) => row.rule },
  { key: "status", label: "Classification", render: (row: typeof categories[number]) => <span className="muted">{row.status}</span> },
];

type FolderScan = ReturnType<typeof useFolderScan>;

function formatBytes(bytes: number) {
  return new Intl.NumberFormat(undefined, { style: "unit", unit: "byte", unitDisplay: "short" }).format(bytes);
}

export function Dashboard({ scan }: { scan: FolderScan }) {
  const [showSafety, setShowSafety] = useState(false);
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
        <Table caption="Planned cleanup categories" columns={columns} rows={categories} rowKey={row => row.name} />
        <p className="panel-note">Age identifies files for review. It does not determine whether a file is safe to remove.</p>
      </section>
      <section className="content-panel" aria-label="File handling">
        {scan.error && <p className="error-text" role="alert">{scan.error}</p>}
        {scan.progress && <p className="scan-summary" role="status">{scan.running ? "Scanning:" : scan.result?.cancelled ? "Cancelled:" : "Scan finished:"} {scan.progress.filesSeen.toLocaleString()} files, {scan.progress.foldersSeen.toLocaleString()} folders, {formatBytes(scan.progress.bytesSeen)} counted. {scan.progress.errors > 0 && `${scan.progress.errors} unreadable entries.`}</p>}
        {scan.result ? <>
          <p className="scan-root">Selected folder: <code>{scan.result.root}</code></p>
          <p className="panel-note">Only metadata was read. Links, junctions, and known repository/dependency folders were skipped. This is an inventory, not a list of safe-to-delete files. {scan.result.truncated && "The scan stopped at its 100,000-entry safety limit."} {scan.result.progress.filesSeen > scan.result.files.length && `Showing the first ${scan.result.files.length} files.`}</p>
          {scan.result.files.length > 0 && <Table caption="Scanned file inventory" columns={[
            { key: "path", label: "File path", render: (row: typeof scan.result.files[number]) => <span className="file-path">{row.path}</span> },
            { key: "bytes", label: "Size", render: (row: typeof scan.result.files[number]) => formatBytes(row.bytes) },
          ]} rows={scan.result.files} rowKey={row => row.path} />}
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
