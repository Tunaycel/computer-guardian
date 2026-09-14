# Architecture decisions

## Current boundary

The React interface saves an appearance preference and presents read-only scan results. The Tauri host owns folder scanning and cancellation through two IPC commands. The native folder picker requires an explicit user choice; the browser preview cannot scan. No filesystem mutation or database is enabled. This remains a development milestone, not a maintenance tool ready for cleanup.

## Decisions

- Use React state for small navigation and appearance state. A global state library and client router are unnecessary at this stage.
- Prefer the native dialog element for inert background content and Escape handling; add explicit Tab wrapping and trigger-focus restoration for predictable desktop keyboard navigation.
- Use CSS custom properties for spacing, type, controls, and semantic colors. Theme overrides change tokens instead of reimplementing screen styles.
- Share Button, IconButton, Select, Dialog, Table, EmptyState, StatusBadge, and SidebarItem now. Add Input, Checkbox, Tooltip, and ProgressBar when scanner/review screens use them; do not maintain unused components just to satisfy a catalogue.
- Persist only a versioned, validated theme preference in local storage. A failed write applies the theme for the session and reports the failure.
- Keep the npm lockfile and use npm ci for repeatable installation. Audit development dependencies as well as runtime dependencies.
- Keep scan results in memory only; they are not persisted or uploaded. The first 500 file paths are shown, while counts continue up to a 100,000-entry limit. The scanner skips known dependency/repository folders and reparse points, records unreadable entries, and can be cancelled.
- Defer SQLite and mutation service interfaces until quarantine and restore contracts are concrete.

## Planned filesystem boundary

The current read-only scanner receives the folder selected by the native dialog and validates it again in Rust. System roots, known protected directories, and links/junctions are rejected. Rust owns traversal and cancellation. Future mutation commands must use validated identifiers, not unrestricted destination paths. Read-only scanning comes before quarantine.

Platform providers will isolate system information, storage, startup, and security queries. An unsupported check must remain explicitly unavailable. They must not manufacture a healthy state from missing data.

Quarantine will require a journaled state machine: record intent, validate the source, move safely, verify the outcome, and commit metadata. Cross-volume moves and crashes between a filesystem action and a database transaction require explicit recovery. A path check followed by a rename is not sufficient protection against replacement races.

Before file mutations are enabled, cover canonical paths, ancestor protection, exclusions, symlinks/junctions, mount boundaries, stale scan results, filename collisions, permissions, locked files, failed moves, interrupted operations, and safe restore. Use temporary test roots exclusively.

## Verification boundary

Vitest verifies navigation and preference behaviour. Playwright runs the actual interface in Edge, checks keyboard interactions and layout, and uses axe in both themes. Screenshots are generated from that running interface, not drawn mockups. CI repeats these frontend checks and keeps failure traces as artifacts.

Rust compilation, five scanner tests using temporary directories, and a native Tauri development-window launch passed on Windows. The Edge browser suite also passed. Browser testing does not validate Tauri IPC or native permissions, and the launch check did not exercise the native folder picker end to end. Filesystem race handling, signing, packaging, and installers remain unverified.
