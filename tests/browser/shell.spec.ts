import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("navigation, honest feature states, and modal keyboard containment", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Choose folder and scan" })).toBeDisabled();
  await page.getByRole("button", { name: "Cleanup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scan a folder first" })).toBeVisible();
  await page.getByRole("button", { name: "Protector", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Protector is not an antivirus" })).toBeVisible();
  await expect(page.getByText("Not checked")).toHaveCount(5);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Review safety model" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Safety model" });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  for (const label of ["Cleanup", "Storage", "Quarantine", "Protector", "Activity", "Settings", "Dashboard"]) {
    const navigation = page.getByRole("button", { name: label, exact: true });
    await navigation.click();
    await expect(navigation).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeFocused();
  }
  expect(errors).toEqual([]);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} theme: all screens pass accessibility checks`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("combobox", { name: "Color theme" }).selectOption(colorScheme);
    for (const label of ["Dashboard", "Cleanup", "Storage", "Quarantine", "Protector", "Activity", "Settings"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations, `${colorScheme}: ${label}`).toEqual([]);
    }
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await page.getByRole("heading", { name: "Dashboard", level: 1 }).evaluate(element => (element as HTMLElement).blur());
    await page.screenshot({ path: `docs/screenshots/dashboard-${colorScheme}.png`, fullPage: true });
    await page.getByRole("button", { name: "Review safety model" }).click();
    const modalAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(modalAudit.violations).toEqual([]);
  });
}

test("theme persists and explicit light overrides a dark operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.locator("html").evaluate(element => getComputedStyle(element).colorScheme)).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("scan rules validate, normalize, and persist", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const screenshotDays = page.getByRole("spinbutton", { name: "Screenshots" });
  await screenshotDays.fill("0");
  await page.getByRole("button", { name: "Save scan rules" }).click();
  await expect(page.getByRole("alert")).toContainText("whole number from 1 to 3650");
  await screenshotDays.fill("45");
  await page.getByRole("textbox", { name: "Excluded relative paths" }).fill("Projects\\private\nDownloads/archive");
  await page.getByRole("button", { name: "Save scan rules" }).click();
  await expect(page.getByRole("status")).toContainText("used for the next scan");
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("neon");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Screenshots" })).toHaveValue("45");
  await expect(page.getByRole("textbox", { name: "Excluded relative paths" })).toHaveValue("Projects/private\nDownloads/archive");
  await page.getByRole("heading", { name: "Settings", level: 1 }).evaluate(element => (element as HTMLElement).blur());
  await page.screenshot({ path: "docs/screenshots/settings-neon-rules.png", fullPage: true });
});

test("black and neon theme stays selected and remains accessible", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("neon");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  expect(await page.locator("html").evaluate(element => getComputedStyle(element).colorScheme)).toBe("dark");
  for (const label of ["Settings", "Dashboard", "Cleanup", "Storage", "Quarantine", "Protector", "Activity"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations, `black and neon: ${label}`).toEqual([]);
  }
  await page.getByRole("button", { name: "Protector", exact: true }).click();
  await page.getByRole("heading", { name: "Protector", level: 1 }).evaluate(element => (element as HTMLElement).blur());
  await page.screenshot({ path: "docs/screenshots/protector-neon.png", fullPage: true });
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", level: 1 }).evaluate(element => (element as HTMLElement).blur());
  await page.screenshot({ path: "docs/screenshots/dashboard-neon.png", fullPage: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await page.getByRole("button", { name: "Review safety model" }).click();
  const dialogResult = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(dialogResult.violations).toEqual([]);
});

test("compact width and enlarged text retain labels without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  for (const label of ["Cleanup", "Settings", "Dashboard"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 860, height: 600 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "28px"; });
  expect(await page.getByRole("heading", { name: "Dashboard", level: 1 }).evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(43);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
