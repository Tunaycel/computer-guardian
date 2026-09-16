import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScanResult } from "../dashboard/useFolderScan";
import { CleanupPage } from "./CleanupPage";

const result: ScanResult = {
  root: "C:\\synthetic",
  progress: { filesSeen: 3, foldersSeen: 2, bytesSeen: 30, errors: 0, reviewItemsSeen: 3 },
  items: [
    { path: "C:\\synthetic\\Screenshots\\old.png", bytes: 20, kind: "file", category: "screenshots", classification: "review", reason: "Screenshot was last modified 31 days ago, beyond the default 30-day review threshold.", modifiedAtEpochSecs: 1 },
    { path: "C:\\synthetic\\Downloads\\old.pdf", bytes: 10, kind: "file", category: "downloads", classification: "review", reason: "Download was last modified 91 days ago, beyond the default 90-day review threshold.", modifiedAtEpochSecs: 1 },
    { path: "C:\\synthetic\\empty", bytes: 0, kind: "folder", category: "emptyFolders", classification: "review", reason: "The folder is empty and needs individual review.", modifiedAtEpochSecs: null },
  ],
  categorySummaries: [
    { category: "screenshots", count: 1, bytes: 20 },
    { category: "downloads", count: 1, bytes: 10 },
    { category: "temporaryFiles", count: 0, bytes: 0 },
    { category: "emptyFolders", count: 1, bytes: 0 },
  ],
  cancelled: false,
  truncated: false,
  itemsTruncated: false,
  rulesUsed: { screenshotDays: 30, downloadDays: 90, temporaryDays: 14, excludedPaths: [] },
};

describe("cleanup review", () => {
  it("shows reasons but keeps file actions locked", () => {
    render(<CleanupPage result={result} running={false} onOpenDashboard={vi.fn()} />);
    expect(screen.getByText(/Screenshot was last modified 31 days ago/)).toBeVisible();
    expect(screen.getByText("Actions are locked.")).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete|quarantine/i })).not.toBeInTheDocument();
  });

  it("filters review candidates by category", async () => {
    const user = userEvent.setup();
    render(<CleanupPage result={result} running={false} onOpenDashboard={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter category" }), "downloads");
    expect(screen.getByText("C:\\synthetic\\Downloads\\old.pdf")).toBeVisible();
    expect(screen.queryByText("C:\\synthetic\\Screenshots\\old.png")).not.toBeInTheDocument();
  });
});
