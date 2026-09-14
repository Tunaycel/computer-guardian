# Architecture decisions

## Current boundary

The React interface renders availability states and saves an appearance preference. The Tauri host embeds frontend assets and initializes logging. No IPC command, filesystem plugin, scan service, or database is enabled. This is a development milestone, not a maintenance tool ready for user data.

## Decisions

- Use React state for small navigation and appearance state. A global state library and client router are unnecessary at this stage.
- Prefer the native dialog element for inert background content and Escape handling; add explicit Tab wrapping and trigger-focus restoration for predictable desktop keyboard navigation.
- Use CSS custom properties for spacing, type, controls, and semantic colors. Theme overrides change tokens instead of reimplementing screen styles.
- Share Button, IconButton, Select, Dialog, Table, EmptyState, StatusBadge, and SidebarItem now. Add Input, Checkbox, Tooltip, and ProgressBar when scanner/review screens use them; do not maintain unused components just to satisfy a catalogue.
- Persist only a versioned, validated theme preference in local storage. A failed write applies the theme for the session and reports the failure.
- Keep the npm lockfile and use npm ci for repeatable installation. Audit development dependencies as well as runtime dependencies.
- Defer SQLite and service interfaces until the scanner and quarantine contracts are concrete. Removed no-op Rust traits and unused serialization dependencies from the initial scaffold.

## Planned filesystem boundary

The frontend will request operations by validated identifiers, not unrestricted destination paths. Rust will own path validation, platform policy, scanning, cancellation, and mutations. Read-only scanning comes before quarantine.

Platform providers will isolate system information, storage, startup, and security queries. An unsupported check must remain explicitly unavailable. They must not manufacture a healthy state from missing data.

Quarantine will require a journaled state machine: record intent, validate the source, move safely, verify the outcome, and commit metadata. Cross-volume moves and crashes between a filesystem action and a database transaction require explicit recovery. A path check followed by a rename is not sufficient protection against replacement races.

Before file mutations are enabled, cover canonical paths, ancestor protection, exclusions, symlinks/junctions, mount boundaries, stale scan results, filename collisions, permissions, locked files, failed moves, interrupted operations, and safe restore. Use temporary test roots exclusively.

## Verification boundary

Vitest verifies navigation and preference behaviour. Playwright runs the actual interface in Edge, checks keyboard interactions and layout, and uses axe in both themes. Screenshots are generated from that running interface, not drawn mockups. CI repeats these frontend checks and keeps failure traces as artifacts.

Rust compilation and native-webview tests are not yet verified locally because Rust is absent. Browser testing cannot validate Tauri IPC, native permissions, filesystem race handling, signing, or installers. The next milestone starts by enabling native build verification.
