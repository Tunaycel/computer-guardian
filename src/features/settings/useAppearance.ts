import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "computer-guardian.appearance";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

function readTheme(): Theme {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof value === "object" && value !== null && "version" in value && value.version === 1
      && "theme" in value && isTheme(value.theme)) return value.theme;
  } catch { /* A blocked or invalid preference must not prevent startup. */ }
  return "system";
}

export function useAppearance() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [saveError, setSaveError] = useState("");

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  function changeTheme(value: Theme) {
    setTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, theme: value }));
      setSaveError("");
    } catch {
      setSaveError("The theme was applied, but could not be saved. It will reset when you reopen the application.");
    }
  }

  return { theme, changeTheme, saveError };
}
