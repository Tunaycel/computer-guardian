# Contributing

Thank you for improving Computer Guardian. Keep changes small, typed, tested, and safety-first.

By contributing, you agree that your contribution is licensed under GNU GPL version 3 only, the same license as the project.

- Never add destructive filesystem operations without protected-path, symlink, and rollback tests.
- Keep file scanning and mutations in Rust services, not frontend JavaScript.
- Never add telemetry, file uploads, cloud classification, or external AI calls without an explicit design review and clear opt-in consent.
- Do not describe the application as antivirus software or present unmeasured health, security, or optimization scores.
- Run `npm run build`, `npm run test`, and `cargo test --manifest-path src-tauri/Cargo.toml` before opening a pull request when the native toolchain is available.

Read [the product specification](docs/product-specification.md), [the quality standard](docs/quality-standard.md), and [architecture decisions](docs/architecture.md) before changing behaviour. Follow the incremental release scope.

For interface changes, also run `npm run test:e2e`, inspect both themes, and verify keyboard navigation. Screenshots must come from the running application. Do not inject metrics into the production interface for presentation.

Use meaningful commit messages, for example `fix(dialog): keep keyboard focus inside the safety explanation`. Describe what changed and why; do not claim unsupported features or passing checks that were not executed.

New runtime dependencies need an identified consumer. File-operation work requires tests using temporary directories, cancellation, and failure recovery before it can be exposed through the UI.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.
