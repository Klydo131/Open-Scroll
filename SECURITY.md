# Security policy

## What Open Scroll protects

Open Scroll runs entirely in the browser. It has no server, no account and no network requests. Programs, templates and settings are stored in the browser's local storage on the user's own device, and backups are plain files the user downloads.

The protections that matter most are:

- **No data leaves the device.** The Content Security Policy forbids network connections (`connect-src 'none'`), outside scripts, frames, plug-ins and form submissions.
- **Saved data cannot run code.** Everything read from storage or from a backup file passes through the tidying functions in `src/model.mjs`, which accept only known fields, strip hidden control and direction-changing characters, and limit every length and number. React escapes all text it shows.
- **Every saved file is made on the device and escapes text for its format:** calendar, Word and Excel (XML), Markdown (formatting, links and tables), and PDF (unsupported characters are replaced). Text in an Excel cell is always stored as a literal string, never a formula.

## Supported versions

Security fixes are made on the latest release on the `main` branch.

## Reporting a vulnerability

Please report a vulnerability privately through GitHub's **Report a vulnerability** button on this repository's **Security** tab. Do not open a public issue, pull request or discussion about it.

If private reporting is unavailable, open an issue that says only that you have a security report and would like a private way to send it. Include no details.

A good report says what an attacker could do, the steps to show it, and the browser and version you used. You will get an acknowledgement within a week. Once a fix is released, you will be credited if you wish.

## Out of scope

- Anyone with access to an unlocked device can read what is stored in that browser. Open Scroll does not encrypt local storage; keep devices locked and backups somewhere safe.
- Issues that need a modified copy of the app or browser extensions with full page access.
