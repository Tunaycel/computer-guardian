import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuarantinePage } from "./QuarantinePage";

const entry = {
  id: "scan-1",
  originalPath: "C:\\synthetic\\old.tmp",
  name: "old.tmp",
  bytes: 12,
  kind: "file" as const,
  quarantinedAtEpochSecs: 1,
  restoreStatus: "ready" as const,
};

function props(overrides = {}) {
  return {
    available: true,
    entries: [entry],
    loading: false,
    busyId: null,
    error: null,
    notice: null,
    onRestore: vi.fn().mockResolvedValue(true),
    onRefresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("quarantine recovery", () => {
  it("confirms restore and explains the no-overwrite rule", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockResolvedValue(true);
    render(<QuarantinePage {...props({ onRestore })} />);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByText(/Nothing will be overwritten/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Restore item" }));
    expect(onRestore).toHaveBeenCalledWith("scan-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks automatic restore when the original path has a conflict", () => {
    render(<QuarantinePage {...props({ entries: [{ ...entry, restoreStatus: "conflict" }] })} />);
    expect(screen.getByText(/another item now exists/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Restore" })).toBeDisabled();
  });
});
