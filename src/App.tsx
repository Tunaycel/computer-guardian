import { useState } from "react";
import { Activity, ArchiveRestore, HardDrive, ShieldCheck, Trash2 } from "lucide-react";
import { Shell } from "./components/Shell";
import type { PageId } from "./domain/navigation";
import { Dashboard } from "./features/dashboard/Dashboard";
import { useFolderScan } from "./features/dashboard/useFolderScan";
import { UnavailablePage } from "./features/availability/UnavailablePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useAppearance } from "./features/settings/useAppearance";

const pageContent = {
  cleanup: { title: "Cleanup", description: "Review files before any cleanup action.", icon: Trash2,
    message: "Cleanup actions are unavailable.", detail: "The dashboard can scan a chosen folder and show file metadata. Classification, quarantine, restore, and deletion are not enabled." },
  storage: { title: "Storage", description: "Disk capacity and usage.", icon: HardDrive,
    message: "Storage information is unavailable.", detail: "This build does not read disk usage. No storage measurements have been collected." },
  quarantine: { title: "Quarantine", description: "Review files moved out of their original locations.", icon: ArchiveRestore,
    message: "Quarantine is not available in this build.", detail: "No files have been moved. Quarantine and restore must both be available before cleanup is enabled." },
  protector: { title: "Protector", description: "System health and security status where supported.", icon: ShieldCheck,
    message: "System checks are not available.", detail: "No health or security assessment has been performed. Protector is not an antivirus and does not provide security guarantees." },
  activity: { title: "Activity", description: "Scan history and file operation results.", icon: Activity,
    message: "No activity recorded.", detail: "No file operations have been performed. Scan and cleanup history will appear here when those features are available." },
} as const;

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const appearance = useAppearance();
  const scan = useFolderScan();

  const page = activePage === "dashboard"
    ? <Dashboard scan={scan} />
    : activePage === "settings"
      ? <SettingsPage {...appearance} />
      : <UnavailablePage {...pageContent[activePage]} />;

  return (
    <Shell activePage={activePage} onNavigate={setActivePage} fileAccess={scan.running ? "read-only scan in progress" : "inactive"}>
      {page}
    </Shell>
  );
}
