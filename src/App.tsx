import { useState } from "react";
import { Activity } from "lucide-react";
import { Shell } from "./components/Shell";
import type { PageId } from "./domain/navigation";
import { Dashboard } from "./features/dashboard/Dashboard";
import { useFolderScan } from "./features/dashboard/useFolderScan";
import { CleanupPage } from "./features/cleanup/CleanupPage";
import { ProtectorPage } from "./features/protector/ProtectorPage";
import { QuarantinePage } from "./features/quarantine/QuarantinePage";
import { useQuarantine } from "./features/quarantine/useQuarantine";
import { UnavailablePage } from "./features/availability/UnavailablePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useAppearance } from "./features/settings/useAppearance";
import { useScanRules } from "./features/settings/useScanRules";
import { StoragePage } from "./features/storage/StoragePage";

const pageContent = {
  activity: { title: "Activity", description: "Scan history and file operation results.", icon: Activity,
    message: "Activity history is not available yet.", detail: "This build does not persist a timeline. Open Quarantine to see items that are currently stored and restorable." },
} as const;

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const appearance = useAppearance();
  const scanRules = useScanRules();
  const scan = useFolderScan(scanRules.rules);
  const quarantine = useQuarantine();

  const page = activePage === "dashboard"
    ? <Dashboard scan={scan} />
    : activePage === "cleanup"
      ? <CleanupPage
        result={scan.result}
        running={scan.running}
        quarantineAvailable={quarantine.available}
        busyId={quarantine.busyId}
        error={quarantine.error}
        notice={quarantine.notice}
        quarantinedCandidateIds={quarantine.quarantinedCandidateIds}
        onOpenDashboard={() => setActivePage("dashboard")}
        onQuarantine={quarantine.quarantine}
      />
      : activePage === "quarantine"
        ? <QuarantinePage
          available={quarantine.available}
          entries={quarantine.entries}
          loading={quarantine.loading}
          busyId={quarantine.busyId}
          error={quarantine.error}
          notice={quarantine.notice}
          onRestore={quarantine.restore}
          onRefresh={quarantine.refresh}
        />
      : activePage === "storage"
        ? <StoragePage scan={scan} onOpenCleanup={() => setActivePage("cleanup")} />
      : activePage === "protector"
        ? <ProtectorPage />
    : activePage === "settings"
      ? <SettingsPage {...appearance} {...scanRules} />
      : <UnavailablePage {...pageContent[activePage]} />;

  return (
    <Shell activePage={activePage} onNavigate={setActivePage} fileAccess={quarantine.busyId ? "confirmed move in progress" : scan.running ? "read-only scan in progress" : "inactive"}>
      {page}
    </Shell>
  );
}
