import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScanResult } from "../dashboard/useFolderScan";
import { CleanupPage } from "./CleanupPage";

const result: ScanResult = {
  root: "C:\\synthetic",
  progress: { filesSeen: 3, foldersSeen: 2, bytesSeen: 30, errors: 0, reviewItemsSeen: 3 },
  items: [
    { candidateId: "scan-1", path: "C:\\synthetic\\Screenshots\\old.png", bytes: 20, kind: "file", category: "screenshots", classification: "review", reason: "Screenshot was last modified 31 days ago, beyond the default 30-day review threshold.", modifiedAtEpochSecs: 1 },
    { candidateId: "scan-2", path: "C:\\synthetic\\Downloads\\old.pdf", bytes: 10, kind: "file", category: "downloads", classification: "review", reason: "Download was last modified 91 days ago, beyond the default 90-day review threshold.", modifiedAtEpochSecs: 1 },
    { candidateId: "scan-3", path: "C:\\synthetic\\empty", bytes: 0, kind: "folder", category: "emptyFolders", classification: "review", reason: "The folder is empty and needs individual review.", modifiedAtEpochSecs: null },
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

function props(overrides = {}) {
  return {
    result,
    running: false,
    quarantineAvailable: false,
    busyId: null,
    error: null,
    notice: null,
    quarantinedCandidateIds: new Set<string>(),
    onOpenDashboard: vi.fn(),
    onQuarantine: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("cleanup review", () => {
  it("shows reasons while keeping permanent deletion locked", () => {
    render(<CleanupPage {...props()} />);
    expect(screen.getByText(/Screenshot was last modified 31 days ago/)).toBeVisible();
    expect(screen.getByText("Permanent deletion is locked.")).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Quarantine" })[0]).toBeDisabled();
  });

  it("filters review candidates by category", async () => {
    const user = userEvent.setup();
    render(<CleanupPage {...props()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter category" }), "downloads");
    expect(screen.getByText("C:\\synthetic\\Downloads\\old.pdf")).toBeVisible();
    expect(screen.queryByText("C:\\synthetic\\Screenshots\\old.png")).not.toBeInTheDocument();
  });

  it("shows a friendly folder name and keeps the technical path optional", async () => {
    const user = userEvent.setup();
    const extendedPathResult = { ...result, root: "\\\\?\\C:\\Users\\Example\\Computer-Guardian-Test" };
    render(<CleanupPage {...props({ result: extendedPathResult })} />);
    expect(screen.getByText("Computer-Guardian-Test", { selector: "strong" })).toBeVisible();
    expect(screen.queryByText("C:\\Users\\Example\\Computer-Guardian-Test")).not.toBeVisible();
    await user.click(screen.getByText("Show full path"));
    expect(screen.getByText("C:\\Users\\Example\\Computer-Guardian-Test")).toBeVisible();
  });

  it("requires confirmation before quarantining one current scan item", async () => {
    const user = userEvent.setup();
    const onQuarantine = vi.fn().mockResolvedValue(true);
    render(<CleanupPage {...props({ quarantineAvailable: true, onQuarantine })} />);
    await user.click(screen.getAllByRole("button", { name: "Quarantine" })[0]);
    expect(screen.getByRole("dialog", { name: "Move this item to Quarantine?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Move to Quarantine" }));
    expect(onQuarantine).toHaveBeenCalledWith("scan-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
