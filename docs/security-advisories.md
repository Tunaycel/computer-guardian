# Security advisory review log

This log records dependency findings that cannot yet be removed without a larger platform migration. It is not a waiver and does not mark an advisory as resolved.

## RUSTSEC-2024-0429 — `glib` iterator unsoundness

- **Status:** Open and monitored.
- **Current dependency:** `glib 0.18.5`, introduced by Tauri's Linux GTK/WebKit dependency chain.
- **Affected range:** `>=0.15.0, <0.20.0`.
- **Patched version:** `0.20.0`.
- **Supported build exposure:** The current supported alpha platform is Windows. The affected GTK dependency is selected only for Linux targets and is not compiled into the Windows executable or installers.
- **Why it is not force-upgraded:** The current stable Tauri 2 dependency chain selects GTK 0.18. Forcing a mismatched GTK/glib version or migrating to a Tauri 3 alpha would create greater unreviewed risk.
- **Controls:** CI keeps the advisory visible, fails on other RustSec findings, and documents the single ignored identifier. Linux remains unsupported and must not be released while this exception remains unreviewed.
- **Review trigger:** Every Tauri update, any Linux-support proposal, or the first stable dependency path that upgrades glib to 0.20 or later.

Do not dismiss the corresponding GitHub Dependabot alert while the affected version remains in the dependency graph.
