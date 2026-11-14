# Open Scroll

Open Scroll helps a church plan its day of worship and its evangelistic meetings, then hand everyone a clear program. It runs in the browser, needs no account, and keeps every program on the device it was made on.

It speaks the words your church uses. Choose **Seventh-day Adventist** and it plans the Sabbath: Sabbath School, the Divine Service and an evangelistic series. Choose **another church tradition** and the same tools plan Sunday School, the worship service and an outreach series.

## What it does

- **Start from a familiar order.** A new program opens with the usual parts of the day already in place, from the song service to the benediction. Rename, reorder or remove anything, or add a part of the day such as an afternoon program or vespers.
- **One line per part.** Each part has room for what it is (a hymn number, a passage, a sermon title) and who leads it. Minutes and a private note sit behind the ⋯ button, and the start time of every part is worked out for you.
- **See who still needs asking.** A ring at the top counts the parts with nobody beside them, and fills as the program comes together.
- **Plan a whole series.** Pick the first night, the evenings you meet and how many nights. Open Scroll lays out the dates, gives each night the usual order and, if you like, a ready list of topics. The series also keeps the team (speaker, song leader, prayer team, greeters and more) and a preparation checklist.
- **Two copies of every program.** The congregation's copy shows the parts, hymns and passages, and leaders only if you want them. The platform copy adds start times and private notes for those leading.
- **Share it the way your church does.** Print it, save it as a picture for a group chat or church page, copy it as text, or add the dates to a calendar.
- **Next week in one step.** *Copy for next Sabbath* (or Sunday) keeps the order and clears the names.
- **Safe by default.** Changes save on their own a moment after you type. Removing a program can be undone. Settings can download a backup file and bring one back in.

Programs made with Open Scroll 0.1 are brought across automatically the first time 0.2 opens.

## How the templates were chosen

The orders are starting points drawn from published practice, not rules. Every church changes them.

- **Sabbath School** follows the common pattern of song service, opening hymn and prayer, welcome, a mission story, special music, then the lesson study from the quarterly Bible study guide, closing with a hymn and prayer. A second option follows *Sabbath School Alive!*, which builds the hour around Bible study and prayer, fellowship and mission.
- **The Divine Service** follows the longer order of worship in the *Church Manual* and the *Elder's Handbook*: call to worship, invocation, hymn, scripture, pastoral prayer, offering, children's story, special music, sermon, closing hymn and benediction.
- **An evangelistic night** follows long practice described in *Ministry* magazine: a song service, a health moment, a children's story, special music, a message of about 45 minutes with an appeal, and the next night's topic. Series commonly meet nightly or three to five nights a week for three to four weeks, with a prayer team meeting before each night and a Bible study or baptismal class to follow.
- **No hymn titles or numbers are included.** Hymnals belong to their publishers, and every church sings its own.

Sources: [Sabbath School (Wikipedia)](https://en.wikipedia.org/wiki/Sabbath_school), [Sabbath School Net](https://ssnet.org/), [Sabbath School & Personal Ministries, General Conference](https://alive.adventist.org/), the Seventh-day Adventist *Church Manual* and *Elder's Handbook*, [Ministry magazine](https://www.ministrymagazine.org/).

## Your data

Open Scroll has no server. It makes no network requests (the page's Content Security Policy forbids them) and stores programs only in this browser. Clearing the browser's site data removes them, so download a backup from Settings now and then. Pictures and calendar files are made on the device.

## Run locally

Use Node.js 22.12 or newer and pnpm. From the project folder:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm preview --host 127.0.0.1
```

Open the address Vite prints. The production Content Security Policy blocks the development server's live-reload connection, so the built preview is the normal way to check a change. Any static host can serve `dist/` over HTTPS; set `base` in the Vite config when serving from a sub-path.

### Where things live

- `src/model.mjs`: programs, templates, the words for each tradition, timing, readiness and tidying of saved data.
- `src/output.mjs`: the text copy and the calendar file. `src/picture.js`: the picture.
- `src/App.jsx` and `src/ui/`: the screens.
- `tests/model.test.mjs`: tests for the model and every output, run by `pnpm test`.

Open Scroll is built with React and the [Astryx](https://astryx.atmeta.com/) Neutral theme. Its planning features were informed by the public documentation of [Open Sentry Beacon](https://github.com/Klydo131/Open-Sentry-Beacon).

## Updates

### 0.2.0

A rebuilt planner. It has words for Adventist and other churches, templates for each part of the day, a "who still needs asking" ring, evangelistic series with dates, topics, team and checklist, congregation and platform copies, picture, text and calendar sharing, automatic saving with undo, backups, dark mode and gentle motion that switches off when your device asks for less.

### 0.1.0

The first planner, for a Sabbath School program or a multi-night evangelistic series.

## License

Open Scroll is released under the [MIT License](./LICENSE).
