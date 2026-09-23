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

describe("storage overview", () => {
  it("shows exact capacity text, a non-color warning, and starts the approved scan", async () => {
    const user = userEvent.setup();
    const folderScan = scan();
    render(<StoragePage scan={folderScan} onOpenCleanup={vi.fn()} />);
    expect(screen.getByText("Low free space")).toBeVisible();
    expect(screen.getByText(/5 MB free/)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: /Windows.*95% used/ })).toHaveValue(95);
    expect(screen.getByText(/never scans the whole C: drive/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Scan common locations" }));
    expect(folderScan.scanCommonLocations).toHaveBeenCalledOnce();
  });
});
