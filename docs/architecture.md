# Architecture decisions

## Current boundary

The React interface saves appearance and scan-rule preferences and presents drive capacity, approved scan locations, scan summaries, duplicate reports, review candidates, and local quarantine recovery records. The Tauri host owns Windows capacity enumeration, approved-location resolution, folder scanning, duplicate hashing, rule validation, conservative classification, exclusions, cancellation, current-candidate authorization, quarantine, and restore. The native folder picker requires an explicit user choice; the browser preview cannot measure storage, scan, analyze files, or perform file operations. Permanent deletion and automated cleanup remain unavailable. This is still a development milestone, not a production maintenance tool.

## Decisions

- Use React state for small navigation and appearance state. A global state library and client router are unnecessary at this stage.
- Prefer the native dialog element for inert background content and Escape handling; add explicit Tab wrapping and trigger-focus restoration for predictable desktop keyboard navigation.
- Use CSS custom properties for spacing, type, controls, and semantic colors. Theme overrides change tokens instead of reimplementing screen styles.
- Share Button, IconButton, Select, Dialog, Table, EmptyState, StatusBadge, and SidebarItem now. Add Input, Checkbox, Tooltip, and ProgressBar when scanner/review screens use them; do not maintain unused components just to satisfy a catalogue.
- Use black-and-neon as the first-launch theme while keeping system, light, and dark choices available. Persist versioned, validated theme and scan-rule preferences in local storage. A failed write applies the preference for the session and reports the failure. Rust validates scan rules independently before traversal.
- Keep the npm lockfile and use npm ci for repeatable installation. Audit development dependencies as well as runtime dependencies.
- Keep scan results in memory only; they are not persisted or uploaded. Rust assigns every file a conservative category/state, returns at most 500 review candidates, and continues category totals up to a 100,000-entry traversal limit. The review UI renders at most 100 matching rows. The scanner skips known dependency/repository folders and reparse points, records unreadable entries, and can be cancelled.
- Treat age and location as review signals, never proof that a file is unnecessary. Defaults flag screenshots after 30 days, Downloads after 90 days, temporary candidates after 14 days, and empty folders for individual review. Users can set age thresholds from 1 to 3650 days and up to 50 relative-path exclusions. Absolute paths, traversal segments, wildcards, and malformed preferences are rejected. Each result snapshots its applied rules so later setting changes cannot rewrite the explanation of an existing result.
- Keep the latest completed scan's opaque candidate identifiers in Rust memory. Mutation IPC accepts an identifier, never an unrestricted source or destination path. Starting another scan invalidates the previous candidate set.
- Journal quarantine intent in the app's private local data directory before moving a payload. Restore reloads this record, rejects reparse points and changed metadata, validates the original parent against the recorded scan root, and never overwrites an existing item.
- Serialize scanning against quarantine/restore operations. Cross-drive moves and permanent deletion are deliberately unavailable.
- Enumerate only fixed and removable local drives with Windows APIs. Report free and total bytes without traversing those drives. The approved common-location action resolves existing Downloads, Desktop, Pictures/Screenshots, and Windows temporary directories, scans them sequentially under the same cancellation token, and retains the originating root for every candidate.
- Treat duplicate analysis as a separate read-only operation. Group non-empty files by size, stream SHA-256 only for same-size candidates, verify size and modification time around each read, and keep hashes in process memory only. Bound traversal at 100,000 entries, hashing at 50 GB, results at 200 groups, and displayed paths at 50 per group. Duplicate analysis shares the scanner cancellation/serialization lock but does not invalidate cleanup candidate identifiers because it cannot authorize a mutation.
- Defer SQLite until durable activity history is implemented; the current recovery journal is one JSON intent plus state markers per quarantined payload.

## Filesystem boundary

The scanner and duplicate analyzer receive the folder selected by the native dialog and validate it again in Rust. System roots, known protected directories, and links/junctions are rejected. Rust owns traversal, selective content hashing, and cancellation. Quarantine commands only accept opaque identifiers belonging to candidates from the latest completed cleanup scan. Before moving an item, Rust re-canonicalizes its path, verifies that it remains inside the scan root, rejects reparse points and protected paths, compares type, size, and modification time, and rechecks that a folder is empty.

The Windows storage provider is isolated from traversal: capacity measurement does not inspect directory entries. Memory, startup, and security providers remain explicitly unavailable and must not manufacture a healthy state from missing data.

Quarantine writes and flushes intent before a same-volume rename, verifies the source disappeared and payload appeared, then writes a marker. Listing reconciles an interrupted marker write from payload/source presence. Restore refuses collisions and verifies the reverse move. Permanent deletion does not exist. Cross-volume moves, low-level handle-based protection against path replacement races, signed installer distribution, and richer interrupted-operation repair remain hardening work.

Native tests cover temporary file and empty-folder move/restore, stale candidates, and restore collisions. Protected ancestors, reparse points, bounded candidate authorization, failed moves, and interrupted marker recovery are enforced in code. More adversarial race, permission, locked-file, removable-drive, and crash-injection tests are still required before production use. Use temporary test roots exclusively.

## Verification boundary

Vitest verifies navigation and preference behaviour. Playwright runs the actual interface in Edge, checks keyboard interactions and layout, and uses axe in both themes. Screenshots are generated from that running interface, not drawn mockups. CI repeats these frontend checks and keeps failure traces as artifacts.

Rust compilation and scanner/classification/duplicate/quarantine tests using temporary directories, plus native Tauri development and release launches, have passed on Windows. MSI and NSIS development bundles were produced, and the Edge browser suite passed. Browser testing does not validate Tauri IPC or native permissions. Full native UI automation, path-replacement race handling, signing, installer installation/upgrade behavior, and production distribution remain unverified.
