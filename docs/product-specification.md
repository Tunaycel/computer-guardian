# COMPUTER GUARDIAN

## Master Product & Development Specification

You are building a real, production-oriented open-source desktop application called **Computer Guardian**.

The goal is to create a trustworthy, lightweight, native-feeling desktop utility that helps users maintain their computers by finding unnecessary, old, duplicate, temporary and potentially removable files, while also providing optional system-health and security checks.

This is NOT a toy project, NOT a concept demo, NOT a SaaS dashboard and NOT an AI-looking application.

The final product should feel like a piece of software that could have existed for years as a respected desktop utility.

---

# 1. PRODUCT PHILOSOPHY

Computer Guardian should communicate three things:

1. Safety
2. Clarity
3. Control

The application must never make the user feel that the software is secretly modifying their computer.

The user should always understand:

* what was scanned
* why a file was classified
* what will happen if they delete it
* where the file will go
* whether the operation can be reversed

The application should be conservative by default.

NEVER design the product around aggressive automatic deletion.

The philosophy is:

SCAN → UNDERSTAND → REVIEW → QUARANTINE → DELETE

not:

SCAN → DELETE EVERYTHING

---

# 2. IMPORTANT DESIGN REQUIREMENT

The UI MUST NOT look AI-generated.

Avoid the visual language commonly associated with AI-generated startup interfaces.

DO NOT use:

* purple/blue AI gradients
* neon gradients
* excessive glassmorphism
* excessive blur
* glowing borders
* giant rounded cards
* huge pill-shaped buttons
* excessive rounded corners
* unnecessary floating cards
* oversized hero sections
* excessive empty space
* generic SaaS dashboard design
* "AI Powered" badges
* sparkle icons
* robot icons
* excessive emojis
* decorative illustrations
* fake analytics
* meaningless charts
* excessive shadows
* futuristic cyberpunk aesthetics
* excessive animations
* unnecessary micro-interactions
* giant typography
* marketing-style landing page UI inside the application

The application must feel like a serious desktop utility.

Think:

* operating-system utility
* professional disk management software
* developer tooling
* mature desktop application
* file manager
* system administration tool

NOT:

* AI startup
* crypto dashboard
* SaaS analytics product
* Dribbble concept
* marketing landing page

---

# 3. VISUAL CHARACTER

The visual language should be:

* restrained
* technical
* calm
* functional
* compact
* professional
* trustworthy
* slightly utilitarian

Use a neutral interface.

Prefer:

* neutral gray backgrounds
* subtle borders
* restrained accent color
* small corner radius
* normal system typography
* compact spacing
* clear hierarchy
* simple icons
* thin dividers

The UI should look good in both light and dark mode.

Do not make dark mode pure black everywhere.

Use a restrained dark charcoal UI.

The application should feel native to the operating system.

---

# 4. TYPOGRAPHY

Use a clean system-oriented font.

Prefer:

* Inter
* SF Pro / system font on macOS
* Segoe UI on Windows
* system sans-serif on Linux

Do not use futuristic fonts.

Do not use oversized text.

Headings should be modest.

The application is a utility, not a marketing website.

---

# 5. COLOR SYSTEM

Use a neutral base.

Suggested philosophy:

Light mode:

* background: very light neutral gray
* panels: white
* borders: subtle gray
* text: dark gray
* secondary text: muted gray
* accent: restrained blue or green

Dark mode:

* background: dark charcoal
* panels: slightly lighter charcoal
* borders: subtle dark gray
* text: light gray
* secondary text: muted gray
* accent: restrained blue/green

Status colors:

GREEN = healthy / safe
YELLOW = review / attention
RED = danger / destructive action
GRAY = inactive / informational

Do not use gradients.

Do not use more than one strong accent color.

---

# 6. ICONOGRAPHY

Use a consistent professional icon library.

Icons should be simple line icons.

Good examples of concepts:

* folder
* file
* trash
* shield
* hard drive
* search
* settings
* clock
* warning
* check
* restore
* scan

Do not use emojis as primary UI icons.

Do not use cartoon illustrations.

---

# 7. APPLICATION STRUCTURE

The application should have a simple left sidebar.

Suggested navigation:

Dashboard

Cleanup

Storage

Quarantine

Protector

Activity

Settings

The sidebar should be compact.

Do not create dozens of navigation items.

---

# 8. DASHBOARD

The dashboard should NOT be a giant analytics dashboard.

It should be a useful summary.

Example structure:

---

Computer Guardian

System status: Healthy

Storage
412 GB used / 1 TB
[progress bar]

Potential cleanup
12.4 GB

Screenshots       3.2 GB
Downloads         5.8 GB
Temporary files   1.1 GB
Duplicates        2.3 GB

[Review cleanup]

System checks

Storage       Healthy
Memory        Normal
Startup       3 items need review
Security      Healthy

Last scan
Today, 14:32

## [Scan now]

Keep the dashboard compact.

Do not create fake charts just to fill space.

---

# 9. CLEANUP PAGE

This is the primary feature.

The cleanup page should explain what was found.

Example:

---

Cleanup

Last scan: Today, 14:32

Potentially removable files
12.4 GB

Category              Files       Size

Screenshots            842        3.2 GB
Temporary files         97        1.1 GB
Downloads              311        5.8 GB
Duplicates              34        2.3 GB

[Scan again]

---

When clicking a category:

---

Screenshots

842 files
3.2 GB

Rule:
Files older than 30 days

---

[ ] screenshot_001.png
4.2 MB
Pictures/Screenshots
Last modified: 148 days ago

[ ] screenshot_002.png
2.1 MB
Pictures/Screenshots
Last modified: 91 days ago

...

[Select all]

## [Move to Quarantine]

The user must be able to inspect individual files.

---

# 10. FILE CLASSIFICATION

Each discovered file should receive a classification.

Possible states:

SAFE TO REMOVE
REVIEW
PROTECTED
IGNORED

Example:

SAFE TO REMOVE

Old temporary cache file.

REVIEW

Old file located inside a project directory.

PROTECTED

System-critical file or protected directory.

IGNORED

Excluded by user configuration.

Do not pretend the system knows with absolute certainty that a file is useless.

Use language such as:

"Likely safe to remove"

instead of:

"This file is useless."

---

# 11. AGE-BASED RULES

Users should be able to define thresholds.

Examples:

Screenshots:
30 days

Downloads:
90 days

Temporary files:
14 days

Large files:
180 days

Unused files:
180 days

The user can change these values.

The application must never assume that an old file is automatically useless.

Age is one signal, not the only signal.

---

# 12. SCREENSHOT DETECTION

Create a dedicated Screenshot Cleaner.

Detect common screenshot directories.

Support configurable directories.

Examples:

Windows:
Pictures/Screenshots

macOS:
Desktop / configured screenshot locations

Linux:
configured screenshot locations

Also detect screenshot filename patterns where reasonable.

Examples:

Screenshot
Screen Shot
Screenshot_2025
IMG_...
etc.

Do not rely only on filename patterns.

Use file metadata and location as additional signals.

---

# 13. TEMPORARY FILE CLEANER

Detect temporary files conservatively.

Potential candidates:

* .tmp
* application caches where safe
* temporary logs
* known temporary directories

Do NOT blindly delete arbitrary files based only on extension.

System-critical directories must be protected.

---

# 14. EMPTY DIRECTORY DETECTION

Detect empty directories.

However:

Do not automatically delete every empty directory.

Some applications intentionally create empty directories.

Default action:

REVIEW

not DELETE.

---

# 15. DUPLICATE FILE DETECTION

Implement duplicate detection carefully.

Do not compare only filenames.

Use:

1. file size
2. quick hash
3. full hash when necessary

For example:

photo.jpg
photo-copy.jpg
photo (1).jpg

If the contents are identical, classify as duplicates.

Show:

---

Duplicate group

3 identical files
18.4 MB

photo.jpg
Pictures/

photo-copy.jpg
Downloads/

photo (1).jpg
Desktop/

Recommended:
Keep the file in Pictures/

## [Review]

Never automatically delete duplicates without user confirmation.

---

# 16. QUARANTINE

This is a core safety feature.

NEVER immediately permanently delete files during normal cleanup.

Instead:

Move selected files to a Computer Guardian quarantine area.

Example:

Computer Guardian
└── Quarantine
├── item...
├── item...
└── manifest.json

The manifest should contain enough metadata to restore files safely.

The quarantine page should show:

* original path
* quarantine date
* file size
* original filename
* deletion reason/category

Actions:

Restore

Delete permanently

Empty quarantine

Add retention period in settings.

Default retention:

30 days

---

# 17. RESTORE

Users must be able to restore quarantined files.

If the original location no longer exists:

Create it when safe.

If a file with the same name already exists:

Do NOT overwrite automatically.

Offer:

* restore with new name
* choose another location
* cancel

---

# 18. PROTECTED DIRECTORIES

Implement a protection system.

Never scan or modify critical system directories unless the user explicitly enables advanced mode.

Examples conceptually include:

* Windows system directories
* Program Files
* operating system directories
* application bundles
* important configuration directories
* Git repositories
* user Documents unless explicitly configured
* developer project directories

Do not hard-code assumptions without platform-specific logic.

Create platform-specific protection rules.

---

# 19. USER EXCLUSIONS

Allow users to exclude folders.

Example:

Settings → Exclusions

---

Excluded folders

~/Projects
~/Documents/Important
~/Photos/Archive

[Add folder]

---

Excluded paths should never be modified by automatic cleanup.

---

# 20. PROTECTOR

The Protector is NOT an antivirus.

Do not market it as an antivirus.

It is a lightweight system health and security-awareness module.

Monitor things such as:

* storage usage
* CPU usage
* memory usage
* startup applications
* operating system update status where available
* firewall status where available
* security software status where accessible
* unusual storage growth
* system health indicators

Clearly label what is actually checked.

Do not claim security guarantees.

---

# 21. PROTECTOR UI

Keep it simple.

Example:

---

Protector

System health

Storage              Healthy
Memory               Normal
CPU                  Normal
Startup              Review
Firewall             Active
Updates              Current

Last check:
Today, 14:32

---

Do not create a fake "security score" unless it is based on clearly defined measurable checks.

If a score is implemented, explain exactly how it is calculated.

---

# 22. ACTIVITY

Create a simple activity log.

Example:

Today

14:32
Scan completed
1,284 files found

14:35
34 files moved to quarantine
2.1 GB

Yesterday

System health check completed

The user should be able to understand what the application did.

---

# 23. SETTINGS

Settings should contain:

General

Cleanup Rules

Protected Locations

Exclusions

Quarantine

Automatic Scans

Notifications

Appearance

Advanced

Privacy

Do not hide important safety settings.

---

# 24. AUTOMATIC MAINTENANCE

Automatic maintenance must be disabled by default.

The user can enable:

Daily scan
Weekly scan

But automatic permanent deletion should be opt-in.

Recommended model:

Automatic scan:
YES

Automatic classification:
YES

Automatic quarantine:
OPTIONAL

Automatic permanent deletion:
OFF BY DEFAULT

If permanent deletion is enabled, show a clear warning.

---

# 25. PRIVACY

Computer Guardian should be local-first.

The application should not upload user files.

Do not send file contents to a cloud AI API.

Do not require an account.

Do not require a server.

Do not add telemetry by default.

If telemetry is ever added, it must be explicit and opt-in.

File paths and filenames can contain sensitive information.

Treat them as sensitive.

---

# 26. NO AI DEPENDENCY

The core application must NOT require an LLM or cloud AI service.

Do not use AI just because the product can be called "smart".

Use deterministic rules for:

* file age
* file type
* location
* size
* hash
* duplicate detection
* system checks

If intelligent classification is added in the future, it should be optional.

The core application must work completely offline.

---

# 27. PERFORMANCE

The application must be lightweight.

Do not continuously scan the entire disk.

Scanning should be explicit or scheduled.

Use asynchronous/background operations.

Never freeze the UI during a scan.

Show progress:

Scanning...

12,482 files checked

Estimated remaining:
...

Allow the user to cancel a scan.

---

# 28. FILE SYSTEM SAFETY

This application modifies user files.

Treat file operations as high-risk.

Every destructive operation must have:

* validation
* permission checks
* path normalization
* protected-path checks
* error handling
* rollback/quarantine where possible
* logging

Avoid symlink traversal vulnerabilities.

Be careful with:

* symbolic links
* junctions
* mount points
* network drives
* external drives
* permission errors
* locked files

Never follow symlinks into protected locations accidentally.

---

# 29. CROSS-PLATFORM ARCHITECTURE

Design the codebase so platform-specific functionality is isolated.

Use interfaces/abstractions such as:

SystemInfoProvider
StorageProvider
StartupAppsProvider
SecurityStatusProvider
FileScanner
QuarantineManager

Then implement platform-specific versions.

Do not create a giant platform-specific conditional mess.

---

# 30. TECHNOLOGY

Preferred architecture:

Frontend:
React + TypeScript

Desktop shell:
Tauri

Core/system functionality:
Rust

Persistence:
SQLite

Configuration:
local configuration files / SQLite as appropriate

Use Rust for filesystem and system-level operations.

Do not implement dangerous filesystem operations purely in frontend JavaScript.

---

# 31. CODE QUALITY

Write production-quality code.

Requirements:

* strong typing
* modular architecture
* meaningful names
* small functions
* clear interfaces
* error handling
* logging
* tests
* no unnecessary dependencies
* no duplicated logic

Do not create huge files containing the entire application.

---

# 32. TESTING

Create tests for:

* file classification
* age calculations
* duplicate detection
* hashing
* protected paths
* exclusions
* quarantine
* restore
* deletion
* path traversal
* symlink handling
* configuration
* scanner cancellation

Destructive file operations must have extensive tests.

Use temporary test directories.

NEVER run destructive tests against real user directories.

---

# 33. DEVELOPMENT STRATEGY

Do not attempt to build the entire product in one pass.

Build incrementally.

Phase 1:

Create application shell and navigation.

Phase 2:

Implement file scanner.

Phase 3:

Implement screenshot detection.

Phase 4:

Implement age rules.

Phase 5:

Implement cleanup review UI.

Phase 6:

Implement quarantine.

Phase 7:

Implement restore.

Phase 8:

Implement duplicate detection.

Phase 9:

Implement scheduler.

Phase 10:

Implement Protector.

Phase 11:

Implement packaging.

Phase 12:

Testing and security hardening.

After each phase:

* run tests
* verify build
* inspect UI
* fix errors
* do not continue blindly if the current phase is broken

---

# 34. UI IMPLEMENTATION RULE

Before implementing each screen, think like a desktop software designer.

Ask:

"What information does the user actually need here?"

Do not add UI elements merely to make the interface look impressive.

Every element should have a purpose.

Prefer:

one useful table

over:

five decorative cards.

Prefer:

a clear list of files

over:

a meaningless chart.

Prefer:

a simple confirmation dialog

over:

a complicated animated flow.

---

# 35. ANTI-AI-DESIGN CHECKLIST

Before considering a UI complete, inspect it for:

* gradient overload
* excessive rounded corners
* excessive cards
* excessive whitespace
* unnecessary icons
* emojis
* glow
* glassmorphism
* oversized typography
* meaningless charts
* AI terminology
* excessive animations

If any of these make the interface look like a generated startup template, simplify it.

The result should look intentionally designed by a human software product designer.

---

# 36. ACCESSIBILITY

Support:

* keyboard navigation
* visible focus states
* sufficient contrast
* readable text
* screen reader-friendly labels
* confirmation dialogs
* clear error messages

Do not rely only on color to communicate state.

Example:

Instead of:

RED = dangerous

also display:

"Dangerous"

---

# 37. ERROR HANDLING

Never silently fail.

If a file cannot be deleted:

"Could not move file to quarantine."

Then provide:

Reason:
File is currently in use.

Do not display raw stack traces to normal users.

Keep technical details in logs.

---

# 38. LOGGING

Create structured logs.

Useful information:

timestamp
operation
file/path where appropriate
result
error
operation ID

Avoid unnecessarily storing sensitive file information.

Provide a way for users to export diagnostic logs.

---

# 39. CLI / DEBUG MODE

Optionally create a CLI or developer mode for debugging.

Examples:

computer-guardian scan
computer-guardian scan --path ~/Pictures
computer-guardian quarantine list
computer-guardian restore <id>

But normal users should use the GUI.

---

# 40. GITHUB OPEN SOURCE REQUIREMENTS

Prepare the project as a serious open-source repository.

Include:

README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
CHANGELOG.md

Create:

.github/
workflows/
ISSUE_TEMPLATE/
pull_request_template.md

README must contain:

* project description
* screenshots
* features
* installation
* supported platforms
* safety model
* privacy model
* roadmap
* contribution guide
* license

---

# 41. README POSITIONING

The README should communicate:

Computer Guardian is an open-source desktop utility for maintaining computer storage and system health.

It is:

* local-first
* privacy-focused
* user-controlled
* conservative
* transparent
* open-source

Do not market it as "AI-powered".

Do not use marketing language like:

"Revolutionary"
"Next-generation AI"
"10x cleaner"
"Supercharged"

Keep the tone technical and credible.

---

# 42. FIRST RELEASE

The first release should be intentionally small.

Version:

0.1.0

Support:

* file scanning
* screenshot detection
* age-based filtering
* temporary file detection
* empty folder detection
* review UI
* manual quarantine

Do NOT implement automatic permanent deletion in v0.1.0.

Do NOT implement the full Protector yet.

Make the first release stable.

---

# 43. DEFINITION OF DONE

A feature is NOT done because the UI exists.

A feature is done when:

* UI works
* backend logic works
* edge cases are handled
* errors are handled
* tests exist
* destructive behavior is safe
* cancellation works
* permissions are handled
* logs are generated where appropriate
* documentation exists

---

# 44. IMPORTANT EXECUTION INSTRUCTION

Start by inspecting the current repository.

If the repository is empty, initialize the project structure.

Do NOT immediately generate the entire application.

First establish:

1. architecture
2. folder structure
3. dependency strategy
4. design system
5. navigation shell
6. testing foundation

Then implement Phase 1.

After Phase 1 is working, continue incrementally.

At every step, prioritize correctness and safety over feature count.

The final application should feel like a mature desktop utility, not an AI-generated interface.

The most important principles are:

SAFETY FIRST.
USER CONTROL.
LOCAL FIRST.
NO UNNECESSARY AI.
NO PERMANENT DELETION BY DEFAULT.
NO AI-LOOKING UI.
SIMPLE, PROFESSIONAL DESKTOP SOFTWARE.
