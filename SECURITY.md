# Security policy

This project is pre-release and exposes an explicit folder metadata scan, conservative review classification, individually confirmed quarantine, and safe restore in the native app. User exclusions must be relative to the selected root and are independently validated by Rust before traversal. Quarantine accepts only opaque identifiers from the latest completed scan, revalidates the source, journals intent locally, and Restore refuses to overwrite an existing item. Permanent deletion is unavailable. No version is supported for production cleanup.

Do not post private filenames, file contents, credentials, or exploitable details in public issues. This local repository has no configured private reporting destination yet. Before publishing, maintainers must enable GitHub private vulnerability reporting or publish a monitored security contact. Until then, a public report should only request a private contact and omit technical details.

Reports should include the affected revision, platform, impact, and a reproduction using synthetic files. Avoid attaching real user data. Response-time guarantees cannot be made before maintainers and a reporting channel are established.
