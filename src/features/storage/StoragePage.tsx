import { HardDrive, RefreshCw, ScanSearch, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatBytes, formatScanPath } from "../cleanup/scanPresentation";
import type { useFolderScan } from "../dashboard/useFolderScan";
import { useStorageOverview } from "./useStorageOverview";

type FolderScan = ReturnType<typeof useFolderScan>;

function driveNumbers(totalBytes: number, freeBytes: number) {
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const usedPercent = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;
  return { usedBytes, usedPercent, freePercent: 100 - usedPercent };
}

export function StoragePage({ scan, onOpenCleanup }: { scan: FolderScan; onOpenCleanup: () => void }) {
  const storage = useStorageOverview();
  const commonResult = scan.result?.root === "Approved common locations" ? scan.result : null;

  return (
    <div className="page">
      <header className="page-header">
        <div><h1 tabIndex={-1}>Storage</h1><p className="page-description">Read-only drive capacity and approved-location review.</p></div>
        <StatusBadge label={!storage.available ? "Desktop app required" : storage.loading ? "Measuring" : storage.error ? "Unavailable" : "Measured locally"} tone={storage.overview ? "healthy" : "neutral"} />
      </header>

      {!storage.available ? <section className="content-panel">
        <EmptyState icon={HardDrive} title="Storage access requires the native desktop app">
          This browser preview cannot read drive capacity or folders. No storage information has been collected.
        </EmptyState>
      </section> : <>
        <div className="toolbar">
          <Button onClick={storage.refresh} disabled={storage.loading}><RefreshCw size={16} aria-hidden="true" />{storage.loading ? "Measuring storage" : "Refresh capacity"}</Button>
          <span className="muted">Capacity is measured locally using Windows. No file contents are opened or uploaded.</span>
        </div>
        {storage.error ? <p className="error-text" role="alert">{storage.error} Try Refresh capacity again.</p> : null}

        <section className="content-panel" aria-labelledby="drive-capacity-heading">
          <header className="content-panel__header">
            <div><h2 id="drive-capacity-heading">Drive capacity</h2><p className="panel-note">Exact values are shown with a visual meter and text.</p></div>
            {storage.overview ? <span className="muted">{storage.overview.drives.length.toLocaleString()} local drive{storage.overview.drives.length === 1 ? "" : "s"}</span> : null}
          </header>
          {storage.overview?.drives.length ? <div className="drive-grid">
            {storage.overview.drives.map(drive => {
              const numbers = driveNumbers(drive.totalBytes, drive.freeBytes);
              const lowSpace = numbers.freePercent < 10;
              return <article className="drive-card" key={drive.root}>
                <header className="drive-card__header">
                  <div><h3>{drive.name}</h3><p className="muted">{drive.kind}{drive.isSystem ? " · Windows system drive" : ""}</p></div>
                  <StatusBadge label={lowSpace ? "Low free space" : "Capacity available"} tone={lowSpace ? "attention" : "healthy"} />
                </header>
                <progress className="drive-meter" max={100} value={numbers.usedPercent} aria-label={`${drive.name}: ${numbers.usedPercent}% used`} />
                <p className="drive-card__numbers"><strong>{formatBytes(drive.freeBytes)} free</strong><span>{formatBytes(numbers.usedBytes)} used of {formatBytes(drive.totalBytes)} · {numbers.usedPercent}% used</span></p>
                {lowSpace ? <p className="panel-note">Less than 10% is free. This is a review signal, not a Windows health score.</p> : null}
              </article>;
            })}
          </div> : storage.loading ? <p role="status">Measuring local drives…</p> : <EmptyState icon={HardDrive} title="No local drives were reported">Windows did not return a fixed or removable drive that could be measured.</EmptyState>}
        </section>

        <section className="content-panel" aria-labelledby="common-scan-heading">
          <header className="content-panel__header"><div><h2 id="common-scan-heading">Approved common locations</h2><p className="panel-note">Downloads, Desktop, Screenshots, and Windows temporary files when those folders exist.</p></div><StatusBadge label="Read only" /></header>
          {storage.overview?.approvedLocations.length ? <ul className="location-list">
            {storage.overview.approvedLocations.map(location => <li key={location.id}>
              <div><strong>{location.label}</strong><span className="muted">Included in this bounded scan</span></div>
              <details className="path-details"><summary>Show path</summary><code>{formatScanPath(location.path)}</code></details>
            </li>)}
          </ul> : <p className="section-description">No approved common folders are available for this Windows account.</p>}
          <div className="storage-actions">
            <Button variant="primary" onClick={scan.scanCommonLocations} disabled={scan.running || !storage.overview?.approvedLocations.length} aria-describedby="common-scan-safety"><ScanSearch size={16} aria-hidden="true" />Scan common locations</Button>
            {scan.running ? <Button onClick={scan.cancel}>Cancel scan</Button> : null}
          </div>
          <p className="panel-note" id="common-scan-safety"><ShieldCheck size={15} aria-hidden="true" /> This replaces the latest scan. It never scans the whole C: drive, Windows, Documents, or program folders, and it never deletes automatically.</p>
          {scan.error ? <p className="error-text" role="alert">{scan.error}</p> : null}
          {scan.progress ? <p className="scan-summary" role="status">{scan.running ? "Scanning:" : commonResult?.cancelled ? "Cancelled:" : "Latest scan:"} {scan.progress.filesSeen.toLocaleString()} files, {scan.progress.foldersSeen.toLocaleString()} folders, {formatBytes(scan.progress.bytesSeen)} counted, {scan.progress.reviewItemsSeen.toLocaleString()} candidates for review.</p> : null}
          {commonResult && !scan.running ? <div className="scan-result-action"><span>{commonResult.items.length.toLocaleString()} stored candidate{commonResult.items.length === 1 ? "" : "s"} ready for individual review.</span><Button onClick={onOpenCleanup}>Review candidates</Button></div> : null}
        </section>
      </>}
    </div>
  );
}
