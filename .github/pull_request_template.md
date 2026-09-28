## Summary

## Safety impact

## Verification

- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run test:e2e` for interface changes
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` for native changes
- [ ] Both themes and keyboard navigation inspected
- [ ] Claims and screenshots match the implemented behaviour
- [ ] No secrets, telemetry, uploads, or unsupported AI/security claims were introduced
- [ ] Filesystem changes preserve protected-path, symlink, cancellation, and recovery guarantees

## Limitations

List any checks not run and the reason.
