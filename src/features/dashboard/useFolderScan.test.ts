import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useFolderScan } from "./useFolderScan";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
  Channel: class { onmessage?: (value: unknown) => void; },
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("native folder scan flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not invoke Rust if the folder picker is cancelled", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(useFolderScan);
    await act(async () => result.current.selectAndScan());
    expect(invoke).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it("requests a selected folder and presents only returned metadata", async () => {
    vi.mocked(open).mockResolvedValue("C:\\synthetic");
    vi.mocked(invoke).mockResolvedValue({
      root: "C:\\synthetic", progress: { filesSeen: 1, foldersSeen: 1, bytesSeen: 5, errors: 0, reviewItemsSeen: 1 },
      items: [{ path: "C:\\synthetic\\file.tmp", bytes: 5, kind: "file", category: "temporaryFiles", classification: "review", reason: "Old temporary-file candidate.", modifiedAtEpochSecs: 1 }],
      categorySummaries: [{ category: "temporaryFiles", count: 1, bytes: 5 }],
      cancelled: false, truncated: false, itemsTruncated: false,
    });
    const { result } = renderHook(useFolderScan);
    await act(async () => result.current.selectAndScan());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ directory: true, multiple: false }));
    expect(invoke).toHaveBeenCalledWith("start_scan", expect.objectContaining({ root: "C:\\synthetic" }));
    await waitFor(() => expect(result.current.result?.progress.filesSeen).toBe(1));
    expect(result.current.running).toBe(false);
  });
});
