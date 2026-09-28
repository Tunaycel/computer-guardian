# Computer Guardian review instructions

Review every change as safety-sensitive desktop software.

- Keep the workflow scan → understand → review → quarantine → delete. Permanent deletion and automatic cleanup are out of scope unless a separately reviewed milestone explicitly adds them.
- Rust owns filesystem traversal and mutation. The frontend may request an operation and display its result, but it must not bypass Rust validation.
- Preserve bounded traversal, cancellation, protected-path checks, symlink and junction rejection, stale-item detection, no-overwrite restore, journaling, and rollback or recovery behaviour.
- Use temporary directories and synthetic data in tests. Never access a contributor's real personal folders during a test.
- Keep processing local-first. Flag telemetry, uploads, remote file classification, external AI calls, credentials, or hidden networking.
- Do not infer that old, duplicate, large, or temporary-looking files are safe to remove. Every label and explanation must accurately describe evidence and limitations.
- Reject antivirus claims, fake security or health scores, invented performance gains, and screenshots containing injected production metrics.
- Require an explicit consumer and risk review for every new runtime dependency. Do not dismiss security advisories without a documented, time-bounded rationale.
- Preserve keyboard access, visible focus, semantic labels, honest feature-availability messages, and browser/native capability distinctions.
- Require tests appropriate to the risk, including cancellation and failure recovery for filesystem work.
