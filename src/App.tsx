import { useState } from "react";
import { Activity, ArchiveRestore, HardDrive } from "lucide-react";
import { Shell } from "./components/Shell";
import type { PageId } from "./domain/navigation";
import { Dashboard } from "./features/dashboard/Dashboard";
import { useFolderScan } from "./features/dashboard/useFolderScan";
import { CleanupPage } from "./features/cleanup/CleanupPage";
import { ProtectorPage } from "./features/protector/ProtectorPage";
import { UnavailablePage } from "./features/availability/UnavailablePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useAppearance } from "./features/settings/useAppearance";
import { useScanRules } from "./features/settings/useScanRules";

const pageContent = {
  storage: { title: "Storage", description: "Disk capacity and usage.", icon: HardDrive,
    message: "Storage information is unavailable.", detail: "This build does not read disk usage. No storage measurements have been collected." },
  quarantine: { title: "Quarantine", description: "Review files moved out of their original locations.", icon: ArchiveRestore,
    message: "Quarantine is not available in this build.", detail: "No files have been moved. Quarantine and restore must both be available before cleanup is enabled." },
  activity: { title: "Activity", description: "Scan history and file operation results.", icon: Activity,
    message: "No activity recorded.", detail: "No file operations have been performed. Scan and cleanup history will appear here when those features are available." },
} as const;

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const appearance = useAppearance();
  const scanRules = useScanRules();
  const scan = useFolderScan(scanRules.rules);

  const page = activePage === "dashboard"
    ? <Dashboard scan={scan} />
    : activePage === "cleanup"
      ? <CleanupPage result={scan.result} running={scan.running} onOpenDashboard={() => setActivePage("dashboard")} />
      : activePage === "protector"
        ? <ProtectorPage />
    : activePage === "settings"
      ? <SettingsPage {...appearance} {...scanRules} />
      : <UnavailablePage {...pageContent[activePage]} />;

  return (
    <Shell activePage={activePage} onNavigate={setActivePage} fileAccess={scan.running ? "read-only scan in progress" : "inactive"}>
      {page}
    </Shell>
  );
}
