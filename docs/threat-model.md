# Threat model

This document describes Computer Guardian's current security boundaries. It is a development-stage Windows desktop utility, not antivirus software, and it must not be treated as authorization to remove files automatically.

## Assets to protect

- User files and directory structure.
- Credentials, private filenames, and file contents encountered during scanning.
- The integrity and recoverability of quarantined items.
- The local quarantine journal and application data directory.
- The build and release process used to distribute installers.

## Trust boundaries

- The React interface is untrusted for filesystem authorization. It may request an operation, but Rust must validate every path, rule, identifier, and state transition.
- A folder-picker result is user intent, not proof that every descendant is safe to inspect or move.
- Filesystem metadata can change between scan and quarantine. Scan results are therefore stale by default until Rust revalidates them.
- Repository contributions and third-party GitHub Actions are untrusted until reviewed and verified by required checks.
- Dependency names, update pull requests, build artifacts, and release metadata must not be trusted solely because they came from automation.

## Main threats and current controls

### Destructive or over-broad file operations

Threats include selecting a protected directory, escaping a scan root, accepting a forged path from the interface, or recursively changing more data than the user approved.

Current controls:

- Mutation commands accept opaque identifiers from the latest completed scan instead of arbitrary source paths.
- Rust canonicalizes and revalidates the scan root and candidate before quarantine.
- Protected paths, traversal segments, malformed exclusions, links, junctions, and reparse points are rejected.
- A new cleanup scan invalidates the previous candidate set.
- Permanent deletion and cross-drive quarantine are unavailable.

### Time-of-check/time-of-use replacement

An attacker or another process may replace a candidate after it was scanned but before it is moved.

Current controls:

- Type, size, modification time, containment, protected-path status, and reparse status are checked again immediately before quarantine.
- Empty directories are checked again before they are moved.
- Scanning, quarantine, and restore operations are serialized.

Residual risk:

- Validation and rename are separate filesystem operations. Handle-based Windows operations are still required to close the remaining path-replacement race before production use.

### Quarantine corruption or unsafe restore

Threats include partial moves, forged or damaged journal data, restore collisions, and redirecting a restore outside its original root.

Current controls:

- Intent is written and flushed before a same-volume rename.
- Recovery reconciles journal markers with source and payload presence.
- Restore validates the recorded identifier, original root, payload, and reparse status.
- Restore never overwrites an existing item.

Residual risk:

- Crash-injection, permission-denial, locked-file, removable-drive, and disk-full testing needs broader coverage.

### Privacy leakage

Scanned paths and filenames can disclose sensitive information through telemetry, logs, screenshots, issues, or crash reports.

Current controls:

- Scanning, classification, and duplicate hashing are local.
- File contents and hashes are not uploaded or persisted.
- Telemetry, accounts, cloud classification, and external AI calls are absent.
- Security reports must use synthetic files and GitHub's private vulnerability-reporting channel.

### Resource exhaustion

Large or adversarial directory trees can consume time, memory, disk bandwidth, or interface resources.

Current controls:

- Traversal, candidate, duplicate-group, displayed-path, and duplicate-hashing limits are enforced.
- Scans are cancellable and execute outside the interface thread.
- Links and known repository/dependency directories are skipped.

### Supply-chain compromise

Threats include malicious dependencies, compromised automation, overly broad workflow tokens, tampered artifacts, and unreviewed changes to `main`.

Current controls:

- CI builds and tests both frontend and native code.
- npm audit, RustSec, and CodeQL workflows are present.
- GitHub Actions are pinned to full commit hashes and checkout credentials are not persisted.
- Workflow permissions are explicitly restricted and jobs have time limits.
- Dependabot proposes npm, Cargo, and GitHub Actions updates through pull requests.
- CODEOWNERS assigns repository-wide ownership.

Required before a public production release:

- Protect `main` with pull-request and successful-check requirements; block force-push and deletion.
- Enable secret scanning, push protection, private vulnerability reporting, and CodeQL alerts.
- Produce checksums, an SBOM, and build provenance for release artifacts.
- Sign Windows installers with a protected signing identity.

## Security invariants for contributors

- Age, location, extension, and duplicate status are review signals, never proof that an item is safe to remove.
- The interface never authorizes a filesystem path by itself.
- No automatic quarantine or deletion is introduced without a separate design review and adversarial tests.
- No operation follows a link or junction into another location.
- Restore is non-destructive and refuses destination collisions.
- No file content, filename, or path leaves the device without explicit, informed user consent.

## Verification priorities

Before production distribution, add adversarial tests for path replacement races, junction creation during traversal, malformed recovery journals, interrupted operations, locked files, permission changes, disk-full behavior, and removable-drive disconnects. Release testing must also cover signed installer installation, upgrade, rollback, and uninstallation on supported Windows versions.

Review this threat model whenever filesystem authorization, quarantine, restore, updater, telemetry, cloud integration, installer, or release automation changes.
