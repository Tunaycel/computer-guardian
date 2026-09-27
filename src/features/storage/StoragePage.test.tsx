import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SCAN_RULES } from "../settings/useScanRules";
import { StoragePage } from "./StoragePage";

const refresh = vi.fn();

vi.mock("./useStorageOverview", () => ({
  useStorageOverview: () => ({
    available: true,
    loading: false,
    error: null,
    refresh,
    overview: {
      drives: [{ root: "C:\\", name: "Windows (C:)", kind: "Fixed", totalBytes: 100_000_000, freeBytes: 5_000_000, isSystem: true }],
      approvedLocations: [{ id: "downloads", label: "Downloads", path: "C:\\Users\\Example\\Downloads" }],
      measuredAtEpochSecs: 1,
    },
  }),
}));

function scan() {
  return {
    available: true,
    running: false,
    progress: null,
    result: null,
    error: null,
    rules: DEFAULT_SCAN_RULES,
    selectAndScan: vi.fn(),
    scanCommonLocations: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

function duplicates() {
  return {
    available: true,
    running: false,
    progress: null,
    result: null,
    error: null,
    selectAndAnalyze: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

describe("storage overview", () => {
  it("shows exact capacity text, a non-color warning, and starts the approved scan", async () => {
    const user = userEvent.setup();
    const folderScan = scan();
    render(<StoragePage scan={folderScan} duplicates={duplicates()} onOpenCleanup={vi.fn()} />);
    expect(screen.getByText("Low free space")).toBeVisible();
    expect(screen.getByText(/5 MB free/)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: /Windows.*95% used/ })).toHaveValue(95);
    expect(screen.getByText(/never scans the whole C: drive/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Scan common locations" }));
    expect(folderScan.scanCommonLocations).toHaveBeenCalledOnce();
  });

  it("shows verified duplicate groups as a read-only report", async () => {
    const user = userEvent.setup();
    const analysis = {
      ...duplicates(),
      progress: { phase: "complete" as const, filesSeen: 3, foldersSeen: 1, bytesSeen: 48, candidateFiles: 3, filesHashed: 3, bytesHashed: 48, errors: 0 },
      result: {
        root: "C:\\synthetic",
        progress: { phase: "complete" as const, filesSeen: 3, foldersSeen: 1, bytesSeen: 48, candidateFiles: 3, filesHashed: 3, bytesHashed: 48, errors: 0 },
        groups: [{ id: "duplicate-1", bytesPerFile: 16, reclaimableBytes: 16, fileCount: 2, filesTruncated: false, files: [
          { path: "C:\\synthetic\\one.bin", bytes: 16, modifiedAtEpochSecs: null },
          { path: "C:\\synthetic\\two.bin", bytes: 16, modifiedAtEpochSecs: null },
        ] }],
        duplicateFiles: 2,
        reclaimableBytes: 16,
        cancelled: false,
        truncated: false,
        groupsTruncated: false,
      },
    };
    render(<StoragePage scan={scan()} duplicates={analysis} onOpenCleanup={vi.fn()} />);
    expect(screen.getByText("1 verified group")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Duplicate optimization opportunity" })).toHaveValue(33);
    expect(screen.getByText(/not computer health or speed/)).toBeVisible();
    expect(screen.getByText("No files were changed.", { exact: false })).toBeVisible();
    await user.click(screen.getByText("Show file paths"));
    expect(screen.getByText(/one\.bin/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
