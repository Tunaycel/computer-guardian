# Recruiter-Grade Quality Standard

This project must be built and presented at a level suitable for a professional software engineering portfolio.

Assume that the repository may be reviewed by:

* software engineers
* technical recruiters
* hiring managers
* open-source contributors
* security-conscious users

The project must NOT look like a quickly generated AI demo.

Every visible part of the project should communicate deliberate engineering work.

## Visual quality

Avoid anything that looks generic, auto-generated or unfinished.

Do not use:

* emoji-heavy interfaces
* emojis as feature icons
* generic AI startup visuals
* random gradients
* default Tailwind-looking layouts
* oversized rounded cards
* random shadows
* excessive padding
* stock placeholder copy
* fake metrics
* meaningless dashboards
* low-quality icon mixtures
* inconsistent spacing
* inconsistent typography
* default browser-looking controls
* poorly aligned layouts
* decorative elements without function

Use a consistent professional icon library such as Lucide or an equivalent restrained line-icon set.

Do not mix icon styles.

## Typography

Typography must look intentional.

Do not rely on a generic "AI website" visual hierarchy.

Use system-native typography where appropriate:

Windows:
Segoe UI

macOS:
SF Pro / system-ui

Linux:
system-ui

Inter may be used only where it genuinely improves consistency.

Use a restrained type scale.

Avoid:

* huge headings
* giant bold titles
* marketing typography
* excessive font-weight variation
* random letter spacing

Desktop software should use compact and readable typography.

## Writing quality

All application copy must sound like real software written by a professional product team.

Avoid AI-style copy such as:

"Supercharge your computer"
"Unlock peak performance"
"Experience smarter cleanup"
"Revolutionize your workflow"
"AI-powered protection"
"Boost your productivity instantly"

Use direct language.

Good:

"Scan completed."
"14.2 GB can be reviewed."
"3 files could not be moved to quarantine."
"Last scanned 18 minutes ago."
"This folder is excluded from cleanup."

Bad:

"Great news! We discovered amazing opportunities to optimize your PC!"

Do not use enthusiastic filler.

Do not use emojis inside status text.

## Interface density

This is desktop software.

The UI should be information-dense enough to feel useful.

Prefer:

* tables
* lists
* split views
* toolbars
* context menus
* status bars
* native-feeling dialogs

over large card grids.

Avoid turning every piece of information into a separate card.

## Layout discipline

Use a consistent spacing system.

Example spacing scale:

4
8
12
16
24
32

Do not use arbitrary spacing values everywhere.

Use consistent control heights.

Align labels, buttons, tables and icons carefully.

Nothing should look accidentally positioned.

## Components

Create reusable components for:

Button
IconButton
Input
Select
Checkbox
Dialog
Tooltip
Table
EmptyState
StatusBadge
ProgressBar
SidebarItem

Do not duplicate styling across pages.

## Status presentation

Do not communicate status using color alone.

Good:

Healthy
Needs review
Protected
Excluded
Failed

Bad:

green dot
yellow dot
red dot

Color can support the text but should not replace it.

## Empty states

Empty states must be useful and restrained.

Example:

"No files need review."

Secondary text:

"Run a new scan or adjust cleanup rules."

Avoid illustrations, mascots or emojis.

## Loading states

Use subtle loading states.

Do not use oversized animated loaders.

If scanning:

Scanning Pictures...
8,241 files checked

Include cancel when appropriate.

## Error states

Errors should explain what happened.

Example:

"Could not move the file to quarantine."

Reason:
"Permission denied."

Action:
"Show file"

Do not display raw technical stack traces to normal users.

## README quality

The README is part of the product.

It must not look auto-generated.

Avoid:

* emoji in every heading
* dozens of badges
* huge centered logos
* marketing slogans
* fake testimonials
* excessive screenshots
* generic feature lists
* exaggerated claims

README structure should be professional:

Project name
One-sentence explanation
Application screenshot
Why the project exists
Features
Safety model
Architecture
Installation
Development
Roadmap
Contributing
Security
License

Keep language concise and technical.

## Screenshots

Use real application screenshots.

Do not use mockups pretending to be the actual application once a working UI exists.

Screenshots should show meaningful data.

Do not fill the app with fake unrealistic metrics.

Use a controlled demo dataset if necessary.

## Repository quality

The repository should look maintained.

Include:

README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md

Use meaningful commit messages.

Bad:

fix
update
stuff
final
final2
works now

Good:

feat(scanner): add age-based screenshot detection

fix(quarantine): prevent overwrite during restore

refactor(core): isolate protected-path validation

test(scanner): add symlink traversal cases

## Code quality

Avoid generated-code smell.

Do not:

* create giant components
* duplicate UI structures
* add comments that merely restate code
* create unnecessary abstractions
* add placeholder TODOs everywhere
* use meaningless variable names
* leave dead code
* leave unused dependencies
* over-engineer simple functionality

Comments should explain WHY, not WHAT.

## Product consistency

Before considering a screen finished, verify:

* typography is consistent
* icon size is consistent
* control height is consistent
* spacing is consistent
* borders are consistent
* terminology is consistent
* capitalization is consistent
* destructive actions are clearly differentiated
* keyboard focus works
* dark mode remains readable

## Human-designed requirement

When implementing UI, actively review the result for signs of generated design.

Ask:

"Would a recruiter assume this was generated from a generic AI prompt?"

If yes, simplify and redesign it.

The target should feel closer to:

* a mature file management utility
* a professional system settings application
* a polished developer tool

than:

* a startup landing page
* an AI dashboard
* a portfolio template

Every visual decision should have a reason.

Quality is more important than quantity of features.
