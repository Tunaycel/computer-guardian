import { useState } from "react";
import { ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Table } from "../../components/Table";

const categories = [
  { name: "Screenshots", rule: "Older than 30 days", status: "Not scanned" },
  { name: "Downloads", rule: "Older than 90 days", status: "Not scanned" },
  { name: "Temporary files", rule: "Older than 14 days", status: "Not scanned" },
  { name: "Empty folders", rule: "Individual review", status: "Not scanned" },
];
const columns = [
  { key: "name", label: "Category", render: (row: typeof categories[number]) => row.name },
  { key: "rule", label: "Planned default rule", render: (row: typeof categories[number]) => row.rule },
  { key: "status", label: "Status", render: (row: typeof categories[number]) => <span className="muted">{row.status}</span> },
];

export function Dashboard() {
  const [showSafety, setShowSafety] = useState(false);
  return (
    <div className="page">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Dashboard</h1><p className="page-description">Storage review and maintenance status.</p></div>
        <StatusBadge label="No scan data" />
      </header>
      <div className="toolbar">
        <Button variant="primary" disabled aria-describedby="scan-availability"><ScanLine size={16} aria-hidden="true" />Scan now</Button>
        <span className="muted" id="scan-availability">Scanning is not available in this build.</span>
      </div>
      <section className="content-panel" aria-labelledby="cleanup-heading">
        <header className="content-panel__header"><h2 id="cleanup-heading">Cleanup overview</h2><span className="muted">Last scan: Never</span></header>
        <Table caption="Planned cleanup categories" columns={columns} rows={categories} rowKey={row => row.name} />
        <p className="panel-note">Age identifies files for review. It does not determine whether a file is safe to remove.</p>
      </section>
      <section className="content-panel" aria-label="File handling">
        <EmptyState icon={ShieldCheck} title="No files have been examined">
          File scanning and cleanup are unavailable in this development build. Your folders have not been accessed.
        </EmptyState>
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
        <p className="muted">Scanning, quarantine, restore, and deletion are not enabled in this build.</p>
        <footer className="dialog__footer"><Button onClick={() => setShowSafety(false)}>Close</Button></footer>
      </Dialog>}
    </div>
  );
}
