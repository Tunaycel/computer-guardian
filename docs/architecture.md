# Architecture decisions

## Current boundary

The React interface saves appearance and scan-rule preferences and presents read-only scan summaries and review candidates. The Tauri host owns folder scanning, rule validation, conservative classification, exclusions, and cancellation through two IPC commands. The native folder picker requires an explicit user choice; the browser preview cannot scan. No filesystem mutation or database is enabled. This remains a development milestone, not a maintenance tool ready for cleanup.

## Decisions

- Use React state for small navigation and appearance state. A global state library and client router are unnecessary at this stage.
- Prefer the native dialog element for inert background content and Escape handling; add explicit Tab wrapping and trigger-focus restoration for predictable desktop keyboard navigation.
- Use CSS custom properties for spacing, type, controls, and semantic colors. Theme overrides change tokens instead of reimplementing screen styles.
- Share Button, IconButton, Select, Dialog, Table, EmptyState, StatusBadge, and SidebarItem now. Add Input, Checkbox, Tooltip, and ProgressBar when scanner/review screens use them; do not maintain unused components just to satisfy a catalogue.
- Use black-and-neon as the first-launch theme while keeping system, light, and dark choices available. Persist versioned, validated theme and scan-rule preferences in local storage. A failed write applies the preference for the session and reports the failure. Rust validates scan rules independently before traversal.
- Keep the npm lockfile and use npm ci for repeatable installation. Audit development dependencies as well as runtime dependencies.
- Keep scan results in memory only; they are not persisted or uploaded. Rust assigns every file a conservative category/state, returns at most 500 review candidates, and continues category totals up to a 100,000-entry traversal limit. The review UI renders at most 100 matching rows. The scanner skips known dependency/repository folders and reparse points, records unreadable entries, and can be cancelled.
- Treat age and location as review signals, never proof that a file is unnecessary. Defaults flag screenshots after 30 days, Downloads after 90 days, temporary candidates after 14 days, and empty folders for individual review. Users can set age thresholds from 1 to 3650 days and up to 50 relative-path exclusions. Absolute paths, traversal segments, wildcards, and malformed preferences are rejected. Each result snapshots its applied rules so later setting changes cannot rewrite the explanation of an existing result.
- Defer SQLite and mutation service interfaces until quarantine and restore contracts are concrete.

## Planned filesystem boundary

The current read-only scanner receives the folder selected by the native dialog and validates it again in Rust. System roots, known protected directories, and links/junctions are rejected. Rust owns traversal and cancellation. Future mutation commands must use validated identifiers, not unrestricted destination paths. Read-only scanning comes before quarantine.

Platform providers will isolate system information, storage, startup, and security queries. An unsupported check must remain explicitly unavailable. They must not manufacture a healthy state from missing data.

Quarantine will require a journaled state machine: record intent, validate the source, move safely, verify the outcome, and commit metadata. Cross-volume moves and crashes between a filesystem action and a database transaction require explicit recovery. A path check followed by a rename is not sufficient protection against replacement races.

Before file mutations are enabled, cover canonical paths, ancestor protection, exclusions, symlinks/junctions, mount boundaries, stale scan results, filename collisions, permissions, locked files, failed moves, interrupted operations, and safe restore. Use temporary test roots exclusively.

## Verification boundary

Vitest verifies navigation and preference behaviour. Playwright runs the actual interface in Edge, checks keyboard interactions and layout, and uses axe in both themes. Screenshots are generated from that running interface, not drawn mockups. CI repeats these frontend checks and keeps failure traces as artifacts.

Rust compilation and scanner/classification tests using temporary directories, plus native Tauri development and release launches, have passed on Windows. MSI and NSIS development bundles were produced, and the Edge browser suite passed. Browser testing does not validate Tauri IPC or native permissions, and no test has exercised the native folder picker end to end. Filesystem race handling, signing, installer installation/upgrade behavior, and production distribution remain unverified.
