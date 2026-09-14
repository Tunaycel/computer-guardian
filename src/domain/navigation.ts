import type { LucideIcon } from "lucide-react";
import {
  Activity,
  HardDrive,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Trash2,
  ArchiveRestore,
} from "lucide-react";

export type PageId = "dashboard" | "cleanup" | "storage" | "quarantine" | "protector" | "activity" | "settings";

export interface NavigationItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const navigationItems: readonly NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cleanup", label: "Cleanup", icon: Trash2 },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "quarantine", label: "Quarantine", icon: ArchiveRestore },
  { id: "protector", label: "Protector", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];
