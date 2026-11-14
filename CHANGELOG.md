# Changelog

All notable changes to Open Scroll. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.3.0]

### Added

- **Simple and Advanced**, chosen when you first open the app and changed any time in Settings.
  - Simple shows each part, its hymn or passage and who leads it.
  - Advanced adds minutes and start times, private notes, the platform copy, extra details, nightly counts, planning several weeks at once, and your own templates, topics and words.
  - Switching never deletes anything.
- **Your own templates.** Save any part of the day from the bookmark beside its name. Saved templates keep the order and minutes, never people's names.
- **Your own topic lists**, made in Settings or saved from a series.
- **Your own words.** Rename "Divine Service", "Evangelistic series" and the rest to what your church says.
- **Plan a quarter.** Make up to 26 weekly programs at once. For Adventist churches the last one can become a Thirteenth Sabbath program.
- **New templates:** Thirteenth Sabbath program and Communion service (Adventist), and Communion service (other traditions).
- **Nightly counts for a series:** present, guests, interest cards and decisions, with totals. Numbers only.
- **A Settings page** with church details, a usual place, the default look for new programs, and your data tools.
- **Your data tools:**
  - The backup now includes templates and topic lists.
  - Bringing one in adds what is missing and never overwrites. On a new device, it brings your settings too.
  - Erasing everything asks first and can be undone.
- A "skip to content" link. The ⋯ menu closes with Escape or a tap outside it.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `docs/RESEARCH.md`, issue and pull request templates, and a CI workflow that tests and builds every change.

### Changed

- The new-program sheet remembers the parts of the day you chose last time.
- Colours in Preview have names for screen readers.

### Fixed

- A clean `pnpm install` no longer exits with an error over the design system's install script. That script only prints a setup hint and is now declined explicitly.

## [0.2.0]

### Added

- A rebuilt planner with words for Adventist and other churches.
- Templates for each part of the day.
- A ring showing who still needs to be asked.
- Evangelistic series with dates, topics, team and a checklist.
- Congregation and platform copies.
- Picture, text and calendar sharing.
- Automatic saving with undo, and backups.
- Dark mode and gentle motion.

## [0.1.0]

### Added

- The first planner, for a Sabbath School program or a multi-night evangelistic series.
