import { useState } from "react";

export interface ScanRules {
  screenshotDays: number;
  downloadDays: number;
  temporaryDays: number;
  excludedPaths: string[];
}

export const DEFAULT_SCAN_RULES: ScanRules = {
  screenshotDays: 30,
  downloadDays: 90,
  temporaryDays: 14,
  excludedPaths: [],
};

const STORAGE_KEY = "computer-guardian.scan-rules";
const MAX_AGE_DAYS = 3650;
const MAX_EXCLUSIONS = 50;
const MAX_EXCLUSION_LENGTH = 512;

function validAge(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= MAX_AGE_DAYS;
}

export function normalizeExclusion(value: string) {
  return value.trim().replaceAll("\\", "/");
}

export function validateScanRules(value: ScanRules): string | null {
  if (!validAge(value.screenshotDays) || !validAge(value.downloadDays) || !validAge(value.temporaryDays)) {
    return `Every age threshold must be a whole number from 1 to ${MAX_AGE_DAYS}.`;
  }
  if (value.excludedPaths.length > MAX_EXCLUSIONS) return `Use no more than ${MAX_EXCLUSIONS} exclusions.`;
  for (const rawPath of value.excludedPaths) {
    const path = normalizeExclusion(rawPath);
    const segments = path.split("/");
    if (!path || path.length > MAX_EXCLUSION_LENGTH) return `Each exclusion must contain 1 to ${MAX_EXCLUSION_LENGTH} characters.`;
    if (path.startsWith("/") || /^[a-z]:\//i.test(path) || path.startsWith("//")) return `Exclusions must be relative to the folder selected for a scan: “${rawPath}”.`;
    if (segments.some(segment => !segment || segment === "." || segment === "..")) return `Exclusions cannot contain empty, “.”, or “..” path segments: “${rawPath}”.`;
    if (/[*?\0-\x1f:]/.test(path)) return `Exclusions cannot contain wildcards, control characters, or colons: “${rawPath}”.`;
  }
  return null;
}

function isRules(value: unknown): value is ScanRules {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ScanRules>;
  return Array.isArray(candidate.excludedPaths)
    && candidate.excludedPaths.every(path => typeof path === "string")
    && typeof candidate.screenshotDays === "number"
    && typeof candidate.downloadDays === "number"
    && typeof candidate.temporaryDays === "number"
    && validateScanRules(candidate as ScanRules) === null;
}

function readRules(): ScanRules {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof stored === "object" && stored !== null && "version" in stored && stored.version === 1
      && "rules" in stored && isRules(stored.rules)) {
      return { ...stored.rules, excludedPaths: stored.rules.excludedPaths.map(normalizeExclusion) };
    }
  } catch { /* Invalid or blocked storage falls back to conservative defaults. */ }
  return { ...DEFAULT_SCAN_RULES, excludedPaths: [] };
}

export function useScanRules() {
  const [rules, setRules] = useState<ScanRules>(readRules);
  const [rulesSaveError, setRulesSaveError] = useState("");

  function saveRules(next: ScanRules) {
    const error = validateScanRules(next);
    if (error) return error;
    const normalized = { ...next, excludedPaths: next.excludedPaths.map(normalizeExclusion) };
    setRules(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, rules: normalized }));
      setRulesSaveError("");
    } catch {
      setRulesSaveError("The rules are active for this session, but could not be saved. They will reset when you reopen the application.");
    }
    return null;
  }

  function resetRules() {
    return saveRules({ ...DEFAULT_SCAN_RULES, excludedPaths: [] });
  }

  return { rules, saveRules, resetRules, rulesSaveError };
}
