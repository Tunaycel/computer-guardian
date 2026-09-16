import type { ReviewCategory } from "../dashboard/useFolderScan";

export const CATEGORY_LABELS: Record<ReviewCategory, string> = {
  screenshots: "Screenshots",
  downloads: "Downloads",
  temporaryFiles: "Temporary files",
  emptyFolders: "Empty folders",
};

export function formatBytes(bytes: number) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
  const index = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1_000)), units.length - 1) : 0;
  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: units[index],
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(bytes / 1_000 ** index);
}

export function formatModified(epochSeconds: number | null) {
  if (epochSeconds === null) return "Not applicable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(epochSeconds * 1_000);
}

export function formatScanPath(path: string) {
  if (path.startsWith("\\\\?\\UNC\\")) return `\\\\${path.slice(8)}`;
  if (path.startsWith("\\\\?\\")) return path.slice(4);
  return path;
}

export function formatScanRootName(path: string) {
  const cleaned = formatScanPath(path).replace(/[\\/]+$/, "");
  return cleaned.split(/[\\/]/).filter(Boolean).at(-1) ?? cleaned;
}
