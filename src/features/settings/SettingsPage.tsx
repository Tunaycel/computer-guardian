import { Select } from "../../components/Select";
import { isTheme, type Theme } from "./useAppearance";

interface SettingsPageProps {
  theme: Theme;
  changeTheme: (theme: Theme) => void;
  saveError: string;
}

export function SettingsPage({ theme, changeTheme, saveError }: SettingsPageProps) {
  return (
    <div className="page">
      <header className="page-header"><div><h1 tabIndex={-1}>Settings</h1><p className="page-description">Appearance, privacy, and cleanup defaults.</p></div></header>
      <section className="content-panel" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <Select label="Color theme" value={theme} hint="Saved on this device. System follows your operating system appearance."
          onChange={event => { if (isTheme(event.target.value)) changeTheme(event.target.value); }}>
          <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          <option value="neon">Black &amp; neon</option>
        </Select>
        {saveError && <p role="alert" className="error-text">{saveError}</p>}
      </section>
      <section className="content-panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <dl className="settings-list">
          <div><dt>Telemetry</dt><dd>Not collected</dd></div>
          <div><dt>File uploads</dt><dd>None</dd></div>
          <div><dt>Account</dt><dd>Not required</dd></div>
          <div><dt>Saved preferences</dt><dd>Color theme only</dd></div>
        </dl>
      </section>
      <section className="content-panel" aria-labelledby="maintenance-heading">
        <h2 id="maintenance-heading">Maintenance</h2>
        <p className="section-description">Cleanup rules, exclusions, protected locations, retention, and notifications will be configurable when scanning and quarantine are available.</p>
        <dl className="settings-list">
          <div><dt>Automatic scans</dt><dd>Off · unavailable</dd></div>
          <div><dt>Automatic quarantine</dt><dd>Off · unavailable</dd></div>
          <div><dt>Permanent deletion</dt><dd>Unavailable</dd></div>
        </dl>
      </section>
    </div>
  );
}
