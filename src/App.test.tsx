import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("application shell", () => {
  it("keeps scanning unavailable and makes its limitation visible", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Scan now" })).toBeDisabled();
    expect(screen.getByText("Scanning is not available in this build.")).toBeVisible();
    expect(screen.queryByText("Ready to scan")).not.toBeInTheDocument();
  });

  it("moves focus to the destination heading and updates navigation state", async () => {
    const user = userEvent.setup();
    render(<App />);
    const destination = screen.getByRole("button", { name: "Cleanup" });
    await user.click(destination);
    expect(screen.getByRole("heading", { name: "Cleanup", level: 1 })).toHaveFocus();
    expect(destination).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Scanning is not available in this build.")).toBeVisible();
  });

  it("persists only appearance and rejects unknown preference versions", async () => {
    localStorage.setItem("computer-guardian.appearance", '{"version":99,"theme":"dark"}');
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const theme = screen.getByRole("combobox", { name: "Color theme" });
    expect(theme).toHaveValue("system");
    await user.selectOptions(theme, "dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(JSON.parse(localStorage.getItem("computer-guardian.appearance")!)).toEqual({ version: 1, theme: "dark" });
  });

  it("recovers from a malformed saved preference", async () => {
    localStorage.setItem("computer-guardian.appearance", "{broken");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("data-theme", "system");
  });
});
