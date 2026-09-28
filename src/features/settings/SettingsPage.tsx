import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { isTheme, type Theme } from "./useAppearance";
import { DEFAULT_SCAN_RULES, normalizeExclusion, type ScanRules } from "./useScanRules";

interface SettingsPageProps {
  theme: Theme;
  changeTheme: (theme: Theme) => void;
  saveError: string;
  rules: ScanRules;
  saveRules: (rules: ScanRules) => string | null;
  resetRules: () => string | null;
  rulesSaveError: string;
}

interface RulesDraft {
  screenshotDays: string;
  downloadDays: string;
  temporaryDays: string;
  exclusions: string;
}

function toDraft(rules: ScanRules): RulesDraft {
  return {
    screenshotDays: String(rules.screenshotDays),
    downloadDays: String(rules.downloadDays),
    temporaryDays: String(rules.temporaryDays),
    exclusions: rules.excludedPaths.join("\n"),
  };
}

export function SettingsPage({ theme, changeTheme, saveError, rules, saveRules, resetRules, rulesSaveError }: SettingsPageProps) {
  const [draft, setDraft] = useState<RulesDraft>(() => toDraft(rules));
  const [validationError, setValidationError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  function changeDraft(field: keyof RulesDraft, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setValidationError("");
    setSavedMessage("");
  }

  function submitRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const excludedPaths = draft.exclusions.split(/\r?\n/).map(normalizeExclusion).filter(Boolean);
    const next: ScanRules = {
      screenshotDays: Number(draft.screenshotDays),
      downloadDays: Number(draft.downloadDays),
      temporaryDays: Number(draft.temporaryDays),
      excludedPaths: [...new Set(excludedPaths)],
    };
    const error = saveRules(next);
    if (error) {
      setValidationError(error);
      setSavedMessage("");
      return;
    }
    setDraft(toDraft(next));
    setSavedMessage("Scan rules saved. They will be used for the next scan.");
  }

  function restoreDefaults() {
    const error = resetRules();
    if (error) {
      setValidationError(error);
      return;
    }
    setDraft(toDraft(DEFAULT_SCAN_RULES));
    setValidationError("");
    setSavedMessage("Default scan rules restored.");
  }

  return (
    <div className="page">
      <header className="page-header"><div><h1 tabIndex={-1}>Settings</h1><p className="page-description">Appearance, privacy, and conservative scan rules.</p></div></header>
      <section className="content-panel" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <Select label="Color theme" value={theme} hint="Saved on this device. System follows your operating system appearance."
          onChange={event => { if (isTheme(event.target.value)) changeTheme(event.target.value); }}>
          <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          <option value="neon">Black &amp; neon</option>
        </Select>
        {saveError && <p role="alert" className="error-text">{saveError}</p>}
      </section>
      <section className="content-panel" aria-labelledby="scan-rules-heading">
        <header className="content-panel__header"><div><h2 id="scan-rules-heading">Scan rules</h2><p className="section-description">Age only identifies candidates for individual review. It never marks a file as safe to remove.</p></div></header>
        <form onSubmit={submitRules} noValidate>
          <fieldset className="settings-fieldset">
            <legend>Review after</legend>
            <div className="settings-grid">
              <div className="field"><label htmlFor="screenshot-days">Screenshots</label><span className="number-field"><input id="screenshot-days" inputMode="numeric" type="number" min="1" max="3650" step="1" value={draft.screenshotDays} onChange={event => changeDraft("screenshotDays", event.target.value)} /><span>days</span></span></div>
              <div className="field"><label htmlFor="download-days">Downloads</label><span className="number-field"><input id="download-days" inputMode="numeric" type="number" min="1" max="3650" step="1" value={draft.downloadDays} onChange={event => changeDraft("downloadDays", event.target.value)} /><span>days</span></span></div>
              <div className="field"><label htmlFor="temporary-days">Temporary-file candidates</label><span className="number-field"><input id="temporary-days" inputMode="numeric" type="number" min="1" max="3650" step="1" value={draft.temporaryDays} onChange={event => changeDraft("temporaryDays", event.target.value)} /><span>days</span></span></div>
            </div>
            <p className="field__hint">Use whole numbers from 1 to 3650. Empty folders always require individual review.</p>
          </fieldset>
          <div className="field">
            <label htmlFor="scan-exclusions">Excluded relative paths</label>
            <textarea id="scan-exclusions" rows={5} value={draft.exclusions} onChange={event => changeDraft("exclusions", event.target.value)} aria-describedby="scan-exclusions-hint" placeholder={"Projects/private\nDownloads/archive"} />
            <p className="field__hint" id="scan-exclusions-hint">One path per line, relative to the folder you choose. No absolute paths, wildcards, “.”, or “..”. Built-in system and dependency protections cannot be removed.</p>
          </div>
          {(validationError || rulesSaveError) && <p role="alert" className="error-text">{validationError || rulesSaveError}</p>}
          {savedMessage && <p role="status" className="success-text">{savedMessage}</p>}
          <div className="settings-actions"><Button variant="primary" type="submit">Save scan rules</Button><Button onClick={restoreDefaults}>Restore defaults</Button></div>
        </form>
      </section>
      <section className="content-panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <dl className="settings-list">
          <div><dt>Telemetry</dt><dd>Not collected</dd></div>
          <div><dt>File uploads</dt><dd>None</dd></div>
          <div><dt>Account</dt><dd>Not required</dd></div>
          <div><dt>Saved preferences</dt><dd>Color theme, scan thresholds, and relative exclusions</dd></div>
        </dl>
      </section>
      <section className="content-panel" aria-labelledby="maintenance-heading">
        <h2 id="maintenance-heading">Maintenance</h2>
        <p className="section-description">Scanning stays manual. Quarantine and restore require individual confirmation; automatic cleanup and permanent deletion remain unavailable.</p>
        <dl className="settings-list">
          <div><dt>Automatic scans</dt><dd>Off · unavailable</dd></div>
          <div><dt>Automatic quarantine</dt><dd>Off · unavailable</dd></div>
          <div><dt>Permanent deletion</dt><dd>Unavailable</dd></div>
        </dl>
      </section>
      <section className="content-panel" aria-labelledby="legal-heading">
        <h2 id="legal-heading">Legal</h2>
        <p className="section-description">Computer Guardian 0.1.0 development build · Copyright © 2026 Computer Guardian contributors.</p>
        <p className="section-description">This software is licensed under GNU GPL version 3 only and comes with no warranty. The complete terms are in the LICENSE file distributed with the source code.</p>
      </section>
    </div>
  );
}
