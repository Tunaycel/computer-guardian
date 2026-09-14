import { useState } from "react";
import { Activity, ArchiveRestore, HardDrive, ShieldCheck, Trash2 } from "lucide-react";
import { Shell } from "./components/Shell";
import type { PageId } from "./domain/navigation";
import { Dashboard } from "./features/dashboard/Dashboard";
import { UnavailablePage } from "./features/availability/UnavailablePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useAppearance } from "./features/settings/useAppearance";

const pageContent = {
  cleanup: { title: "Cleanup", description: "Review files and the reasons they were identified.", icon: Trash2,
    message: "Scanning is not available in this build.", detail: "No folders have been scanned. Cleanup will require selecting locations and reviewing individual files." },
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

  const page = activePage === "dashboard"
    ? <Dashboard />
    : activePage === "settings"
      ? <SettingsPage {...appearance} />
      : <UnavailablePage {...pageContent[activePage]} />;

  return (
    <Shell activePage={activePage} onNavigate={setActivePage}>
      {page}
    </Shell>
  );
}
