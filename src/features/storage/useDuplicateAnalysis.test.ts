import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { DEFAULT_SCAN_RULES } from "../settings/useScanRules";
import { useDuplicateAnalysis } from "./useDuplicateAnalysis";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
  Channel: class { onmessage?: (value: unknown) => void; },
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("duplicate analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not start when folder selection is cancelled", async () => {
    vi.mocked(open).mockResolvedValue(null);
    const { result } = renderHook(() => useDuplicateAnalysis(DEFAULT_SCAN_RULES));
    await act(() => result.current.selectAndAnalyze());
    expect(invoke).not.toHaveBeenCalled();
  });

  it("passes the selected folder and scan rules to the native verifier", async () => {
    vi.mocked(open).mockResolvedValue("C:\\synthetic");
    vi.mocked(invoke).mockResolvedValue({
      root: "C:\\synthetic", groups: [], duplicateFiles: 0, reclaimableBytes: 0,
      cancelled: false, truncated: false, groupsTruncated: false,
      progress: { phase: "complete", filesSeen: 2, foldersSeen: 1, bytesSeen: 20, candidateFiles: 2, filesHashed: 2, bytesHashed: 20, errors: 0 },
    });
    const { result } = renderHook(() => useDuplicateAnalysis(DEFAULT_SCAN_RULES));
    await act(() => result.current.selectAndAnalyze());
    expect(invoke).toHaveBeenCalledWith("start_duplicate_scan", expect.objectContaining({ root: "C:\\synthetic", rules: DEFAULT_SCAN_RULES }));
    expect(result.current.result?.progress.filesHashed).toBe(2);
  });
});
