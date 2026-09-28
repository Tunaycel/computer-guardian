# Public alpha release checklist

The repository stays private until every required item is complete and the owner gives final confirmation.

## Before changing visibility

- [ ] Review the full Git history for secrets and private data, not only the current files.
- [ ] Decide whether to keep the personal email in existing commit metadata or rewrite it to the GitHub private `noreply` address before publication.
- [ ] Review GitHub Actions logs and uploaded artifacts because existing logs may become public with the repository.
- [ ] Confirm the GPL-3.0-only license, contribution terms, and branding policy are visible and consistent.
- [ ] Confirm `main` passes frontend, browser accessibility, Rust formatting, Rust tests, npm audit, and RustSec audit checks.
- [ ] Confirm screenshots show the current black-and-neon application and no personal paths or files.
- [ ] Enable GitHub private vulnerability reporting and verify the **Report a vulnerability** path.
- [ ] Confirm no production, antivirus, performance, or compatibility claim exceeds the tested evidence.
- [ ] Obtain the owner's explicit final approval to change the repository from private to public.

## Immediately after changing visibility

- [ ] Re-check branch protection and push rulesets. GitHub disables push rulesets when repository visibility changes.
- [ ] Enable and verify secret scanning and push protection.
- [ ] Verify dependency graph, Dependabot alerts, and automated security updates.
- [ ] Verify CodeQL runs successfully on the public repository.
- [ ] Open the repository in a signed-out browser and verify README, license, security reporting, and screenshots.

## First release candidate

- [ ] Tag `v0.1.0-alpha.1` only after the public checks pass.
- [ ] Publish it as a GitHub **pre-release**, not a production release.
- [ ] Attach the verified Windows MSI and NSIS artifacts with SHA-256 checksums.
- [ ] State that installers are unsigned, Windows-only development artifacts and may trigger operating-system warnings.
- [ ] State that malware detection, automatic cleanup, permanent deletion, and production support are not provided.
- [ ] Test installation, launch, sample-folder scan, duplicate analysis, quarantine, restore, and uninstall on a clean Windows account.

## Release stop conditions

Do not publish if a secret is found, CI is red, recovery is unverified, the installer is untested, private vulnerability reporting is unavailable, or any user-facing claim is misleading.
