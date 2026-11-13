# Open Scroll

Open Scroll is an open-source meeting planner for Sabbath School programs and evangelistic meetings. Anyone can create a program in a browser. Choose a template, assign leaders and hymns or passages, set the schedule, and preview a bulletin for participants.

## Run locally

Use Node.js 22.12+ or a supported newer LTS and pnpm. From the project folder:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm preview --host 127.0.0.1
```

Open the local URL printed by Vite. Rebuild after editing. The production Content Security Policy disables development WebSocket connections, so the production preview is the normal verification path. A static host can serve `dist/` over HTTPS. Set the `base` in Vite when serving from a repository subpath.

## Planning and sharing

- Choose **Sabbath School** or **Evangelistic meeting** on the home screen. Select **How to use** for a walkthrough.
- Add sessions or nights, enter a start time, and add or reorder the agenda. The editor calculates the start of each item from the preceding durations.
- Save to keep the program in this browser. Clearing browser data removes saved programs. The app has no accounts, cloud sync, or built-in audio or video calls.
- Open **Preview bulletin** to download plain text or print to PDF. Planning notes stay out of the bulletin. Leader names are included only when selected. Review the fields shown in the preview before sharing.

Open Scroll uses React and the Astryx Neutral theme and Button components. See the [Astryx fork](https://github.com/Klydo131/astryx) and [Astryx documentation](https://astryx.atmeta.com/). The meeting workflows were informed by the public [Open Sentry Beacon Office documentation](https://github.com/Klydo131/Open-Sentry-Beacon).

## Updates

### 0.1.0

Create a Sabbath School program or a multi-night evangelistic series, then prepare a bulletin for participants. Programs stay in your browser. The home screen opens each template directly, and **How to use** explains the steps from agenda to bulletin.

## License

MIT. Astryx packages are distributed under their own MIT license.
