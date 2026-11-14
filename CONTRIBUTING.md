# Contributing to Open Scroll

Thank you for helping churches plan their worship. Open Scroll is small on purpose, and every change is weighed against the people who use it: a Sabbath School superintendent on a phone, an elder printing the bulletin, a volunteer who has never used a planner before.

## Before you start

- **Look for an existing issue**, or open one describing the problem before writing a large change.
- **Questions and ideas** are welcome as issues. Please say which church tradition you plan for, so suggestions fit the right words.
- **Security problems** go through [SECURITY.md](./SECURITY.md), never a public issue.

## The rules a change must keep

1. **Nothing leaves the device.** Open Scroll makes no network requests. The Content Security Policy in `index.html` sets `connect-src 'none'`; do not loosen it, and do not add analytics, fonts or scripts from other sites.
2. **Simple stays simple.** A new feature belongs in Advanced unless a first-time volunteer needs it. Switching modes must never delete or alter saved data.
3. **Words follow the church.** Anything that names the day or a service comes from `words()` in `src/model.mjs`. A Sunday-keeping church must never read Adventist-only terms, and the reverse.
4. **Saved data is tidied on the way in.** Every new field gets a rule in `tidyProgram`, `tidySettings` or `tidyStore`, with a test that feeds it bad input.
5. **No people in templates or reports.** Saved templates keep the order, never names. Nightly counts are numbers only.
6. **No copyrighted hymn texts, titles or numbers** are shipped in templates.
7. **Accessible by default.** Every control has a visible label or an `aria-label`, works with the keyboard, and has a touch target of at least 40 pixels. Motion uses only opacity and transform and stops under `prefers-reduced-motion`.
8. **Plain words.** Write interface text for someone who is not technical. Prefer "Remove" to "Delete record", "Who leads" to "Assignee".

## Working on the code

Use Node.js 22.12 or newer and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm test        # model and output tests (node --test)
pnpm build       # production build into dist/
pnpm preview     # serve the build
```

The production Content Security Policy blocks the development server's live reload, so check changes with `pnpm build` and `pnpm preview`.

| Path | What lives there |
| --- | --- |
| `src/model.mjs` | Programs, templates, words for each tradition, timing, readiness, and the tidying of saved data. Pure functions. |
| `src/output.mjs` | The text copy and the calendar file. Pure functions. |
| `src/picture.js` | The shareable picture, drawn on a canvas. |
| `src/App.jsx`, `src/ui/` | Screens. They call the model; they hold no rules of their own. |
| `tests/` | `node --test` suites for the model and outputs. |
| `docs/RESEARCH.md` | Why the templates look the way they do, with sources. |

Logic belongs in `model.mjs` or `output.mjs`, where it can be tested without a browser.

## Pull requests

- Keep each pull request to one change, with tests for any new rule in the model.
- `pnpm test` and `pnpm build` must pass; CI runs both.
- Describe what a church will notice, and include before and after screenshots for any visible change, at phone and desktop width.
- New dependencies need a reason. Open Scroll ships React and the Astryx design system and very little else.
- Contributions are accepted under the project's [MIT License](./LICENSE).

## Conduct

Everyone taking part is expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
