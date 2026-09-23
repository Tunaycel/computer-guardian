import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useStorageOverview } from "./useStorageOverview";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
}));

const overview = {
  drives: [{ root: "C:\\", name: "Windows (C:)", kind: "Fixed", totalBytes: 100, freeBytes: 25, isSystem: true }],
  approvedLocations: [{ id: "downloads", label: "Downloads", path: "C:\\Users\\Example\\Downloads" }],
  measuredAtEpochSecs: 1,
};

describe("native storage overview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads on entry and supports an explicit refresh", async () => {
    vi.mocked(invoke).mockResolvedValue(overview);
    const { result } = renderHook(() => useStorageOverview());
    await waitFor(() => expect(result.current.overview?.drives[0].freeBytes).toBe(25));
    expect(invoke).toHaveBeenCalledTimes(1);
    await act(async () => result.current.refresh());
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith("get_storage_overview");
  });
});
