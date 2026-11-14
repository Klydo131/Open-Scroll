// Open Scroll's programs: what they hold, the templates they start from, and
// the words each kind of church uses. Pure functions only, so they are tested
// in Node (tests/model.test.mjs) and shared by every screen.

export const STORAGE_KEY = 'open-scroll.v2';
export const OLD_STORAGE_KEY = 'open-scroll.programs.v1';

export const LIMITS = {
  programs: 200,
  sections: 8,
  lines: 40,
  nights: 40,
  team: 30,
  checklist: 60,
  details: 12,
  text: 160,
  long: 3000,
  minutes: 300,
};

const makeId = () => globalThis.crypto.randomUUID();

// ---------------------------------------------------------------------------
// Words. A Seventh-day Adventist church and a Sunday-keeping church plan the
// same things under different names. Everything the app says about the week
// comes from here, so neither ever reads the other's words.
// ---------------------------------------------------------------------------

export const TRADITIONS = {
  adventist: {
    label: 'Seventh-day Adventist',
    day: 'Sabbath',
    weekday: 6,
    program: 'Sabbath program',
    school: 'Sabbath School',
    worship: 'Divine Service',
    series: 'Evangelistic series',
    night: 'Night',
  },
  general: {
    label: 'Another church tradition',
    day: 'Sunday',
    weekday: 0,
    program: 'Sunday program',
    school: 'Sunday School',
    worship: 'Worship service',
    series: 'Outreach series',
    night: 'Night',
  },
};

export function words(settings) {
  return TRADITIONS[settings?.tradition] ?? TRADITIONS.adventist;
}

/** "Evangelistic series" → "evangelistic series", but "Sabbath" and "Sunday" keep their capital. */
export function lower(phrase) {
  return /^(Sabbath|Sunday)\b/.test(phrase) ? phrase : phrase.charAt(0).toLowerCase() + phrase.slice(1);
}

/** The parts of the day a new program starts with. */
export const DEFAULT_SECTIONS = { adventist: ['sabbath-school', 'divine-service'], general: ['sunday-school', 'worship'] };

// ---------------------------------------------------------------------------
// Templates. Each part is [what happens, minutes, a hint for the detail].
// No hymn titles or numbers are shipped: the hymnal belongs to its publisher,
// and every church sings its own.
// ---------------------------------------------------------------------------

const P = (part, minutes = 0, hint = '') => ({ part, minutes, hint });

export const SECTION_TEMPLATES = {
  adventist: [
    {
      key: 'sabbath-school', title: 'Sabbath School', time: '09:00',
      blurb: 'Song service, mission story and the lesson study.',
      parts: [
        P('Song service', 10), P('Opening hymn', 4, 'Hymn number'), P('Opening prayer', 2),
        P('Welcome', 3), P('Mission story', 7, 'This week\'s mission story'), P('Special music', 4),
        P('Lesson study', 45, 'Lesson title'), P('Memory text', 2, 'Bible verse'),
        P('Closing hymn', 4, 'Hymn number'), P('Closing prayer', 2),
      ],
    },
    {
      key: 'mission-school', title: 'Sabbath School (mission focus)', time: '09:00',
      blurb: 'Bible study and prayer, fellowship and mission, as Sabbath School Alive! suggests.',
      parts: [
        P('Welcome and prayer', 5), P('World mission report', 5), P('Local outreach story', 5),
        P('Personal ministries moment', 5), P('Lesson study in classes', 45, 'Lesson title'),
        P('Closing hymn', 4, 'Hymn number'), P('Closing prayer', 2),
      ],
    },
    {
      key: 'divine-service', title: 'Divine Service', time: '11:00',
      blurb: 'Call to worship through the sermon and benediction.',
      parts: [
        P('Call to worship', 2), P('Invocation', 2), P('Opening hymn', 4, 'Hymn number'),
        P('Scripture reading', 3, 'Passage'), P('Pastoral prayer', 5), P('Tithes and offering', 5),
        P("Children's story", 6), P('Special music', 4), P('Sermon', 35, 'Sermon title'),
        P('Closing hymn', 4, 'Hymn number'), P('Benediction', 1),
      ],
    },
    {
      key: 'afternoon', title: 'Afternoon program (AY)', time: '15:00',
      blurb: 'Adventist Youth: songs, a topic and testimony.',
      parts: [
        P('Song service', 10), P('Opening prayer', 2), P('Scripture reading', 3, 'Passage'),
        P('Topic', 30, 'Topic'), P('Special music', 4), P('Closing prayer', 2),
      ],
    },
    {
      key: 'vespers', title: 'Sunset vespers', time: '17:30',
      blurb: 'A quiet close to the Sabbath.',
      parts: [P('Hymn', 4, 'Hymn number'), P('Reading', 5, 'Passage'), P('Reflection', 10), P('Closing prayer', 2)],
    },
  ],
  general: [
    {
      key: 'sunday-school', title: 'Sunday School', time: '09:00',
      blurb: 'Singing, prayer and the Bible lesson.',
      parts: [
        P('Opening song', 5), P('Opening prayer', 2), P('Welcome', 3),
        P('Bible lesson', 40, 'Lesson or passage'), P('Memory verse', 2, 'Bible verse'), P('Closing prayer', 2),
      ],
    },
    {
      key: 'worship', title: 'Worship service', time: '10:30',
      blurb: 'Call to worship through the sermon and blessing.',
      parts: [
        P('Prelude', 3), P('Call to worship', 2), P('Opening hymn', 4, 'Hymn or song'),
        P('Opening prayer', 2), P('Scripture reading', 3, 'Passage'), P('Prayers of the people', 5),
        P('Offering', 5), P("Children's message", 5), P('Special music', 4), P('Sermon', 30, 'Sermon title'),
        P('Response hymn', 4, 'Hymn or song'), P('Benediction', 1),
      ],
    },
    {
      key: 'evening', title: 'Evening service', time: '18:00',
      blurb: 'Songs, a message and prayer.',
      parts: [P('Song service', 10), P('Opening prayer', 2), P('Message', 25, 'Title'), P('Closing prayer', 2)],
    },
    {
      key: 'prayer-meeting', title: 'Prayer meeting', time: '19:00',
      blurb: 'Praise, a short devotion and time to pray together.',
      parts: [P('Song', 4), P('Devotional', 10, 'Passage'), P('Prayer requests', 10), P('Prayer time', 20)],
    },
  ],
};

/** The parts of an evangelistic night. The research behind them is in README.md. */
export const NIGHT_TEMPLATE = [
  P('Song service', 15), P('Welcome and opening prayer', 5), P('Health moment', 10, 'Topic'),
  P("Children's story", 5), P('Special music', 5), P('Message', 45, 'Title'),
  P('Appeal and prayer', 5), P("Tomorrow's topic and announcements", 3), P('Closing prayer', 2),
];

export const TEAM_ROLES = [
  'Speaker', 'Host', 'Song leader', 'Musicians', 'Health presenter', "Children's leader",
  'Prayer team', 'Greeters', 'Registration', 'Sound and projection', 'Hospitality', 'Bible workers',
];

export const PREP_CHECKLIST = [
  'Book the venue and confirm the dates',
  'Print invitations and handbills',
  'Prepare registration and decision cards',
  'Prayer team meets 15 minutes before each night',
  'Test sound, lights and projection',
  'Plan who visits each guest',
  'Arrange childcare and the children\'s program',
  'Plan a Bible study or baptismal class to follow',
];

/** Series of topics a church can start from. Every title can be changed. */
export const TOPIC_SETS = {
  adventist: [
    {
      key: 'prophecy', label: 'Bible prophecy series',
      topics: [
        'Can we trust the Bible?', 'Daniel 2: A dream of history', 'Who is Jesus?',
        'Saved by grace', 'The second coming of Jesus', 'What happens when we die?',
        "God's law of love", 'The Sabbath: a gift of rest', 'Christ our High Priest',
        'Health: living God\'s way', 'Revelation 14: Heaven\'s last message',
        "God's people today", 'Baptism: a new beginning', 'Heaven: our forever home',
      ],
    },
    {
      key: 'health', label: 'Health and hope',
      topics: [
        'Hope for a better life', 'Rest for the weary', 'Food that heals',
        'Freedom from stress', 'Relationships that last', 'Peace with God', 'A new start',
      ],
    },
  ],
  general: [
    {
      key: 'life', label: 'Questions of life',
      topics: [
        'Is there hope?', 'Who is Jesus?', 'Grace that saves', 'How to pray',
        'Forgiveness', 'The Holy Spirit', 'A church family', 'Baptism', 'Living by faith',
        'The return of Christ',
      ],
    },
    {
      key: 'revival', label: 'Revival week',
      topics: ['Come home', 'A clean heart', 'Walking in the Spirit', 'Faith that works', 'Love one another', 'Go and tell'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Building programs.
// ---------------------------------------------------------------------------

export function newLine(part = '', minutes = 0, hint = '') {
  return { id: makeId(), part, detail: '', who: '', minutes, note: '', hint };
}

function linesFrom(parts) {
  return parts.map(p => newLine(p.part, p.minutes, p.hint));
}

export function sectionFromTemplate(template) {
  return { id: makeId(), title: template.title, time: template.time, lines: linesFrom(template.parts) };
}

/** YYYY-MM-DD in the device's own time zone. */
export function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The next given weekday on or after `from` (today counts). */
export function nextWeekday(weekday, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  return dayKey(d);
}

export function addDays(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

const LOOK = { style: 'classic', accent: '#1f3a5f' };

export function newService(settings, sectionKeys, now = new Date()) {
  const w = words(settings);
  const templates = SECTION_TEMPLATES[settings?.tradition] ?? SECTION_TEMPLATES.adventist;
  const chosen = sectionKeys.map(key => templates.find(t => t.key === key)).filter(Boolean);
  return {
    id: makeId(), kind: 'service', title: w.program, church: settings?.church ?? '',
    date: nextWeekday(w.weekday, now), theme: '', venue: '',
    sections: (chosen.length ? chosen : [templates[0]]).map(sectionFromTemplate),
    details: [], announcements: '', notes: '', look: { ...LOOK }, updated: now.getTime(),
  };
}

/**
 * A series: nights on the chosen weekdays from `start`, as many as `count`,
 * each with the standard parts and, when a topic list was chosen, its topic.
 */
export function newSeries(settings, { title = '', start, count = 7, weekdays = [], time = '19:00', topics = [] }, now = new Date()) {
  const w = words(settings);
  const first = start || addDays(dayKey(now), 7);
  const days = weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6];
  const nights = [];
  let day = first;
  for (let guard = 0; nights.length < Math.min(count, LIMITS.nights) && guard < 400; guard += 1) {
    const [y, m, d] = day.split('-').map(Number);
    if (days.includes(new Date(y, m - 1, d).getDay())) {
      nights.push(newNight(day, time, topics[nights.length] ?? ''));
    }
    day = addDays(day, 1);
  }
  return {
    id: makeId(), kind: 'series', title: title || w.series, church: settings?.church ?? '',
    date: first, theme: '', venue: '', nights,
    team: TEAM_ROLES.slice(0, 8).map(role => ({ id: makeId(), role, who: '' })),
    checklist: PREP_CHECKLIST.map(text => ({ id: makeId(), text, done: false })),
    details: [], announcements: '', notes: '', look: { ...LOOK, accent: '#5b2a3c' }, updated: now.getTime(),
  };
}

export function newNight(date = '', time = '19:00', topic = '') {
  return { id: makeId(), date, time, topic, speaker: '', scripture: '', lines: linesFrom(NIGHT_TEMPLATE) };
}

/** The same program, a week later: same parts, same people cleared, new date. */
export function copyForNextWeek(program, now = new Date()) {
  const date = program.date ? addDays(program.date, 7) : dayKey(now);
  return {
    ...structuredClone(program), id: makeId(), date, theme: '', updated: now.getTime(),
    sections: program.sections.map(s => ({
      ...s, id: makeId(), lines: s.lines.map(l => ({ ...l, id: makeId(), detail: '', who: '', note: '' })),
    })),
    details: program.details.map(d => ({ ...d, id: makeId(), value: '' })),
    announcements: '',
  };
}

export function duplicate(program, now = new Date()) {
  const copy = structuredClone(program);
  const fresh = list => list?.map(x => ({ ...x, id: makeId() }));
  copy.id = makeId();
  copy.title = `${program.title} (copy)`.slice(0, LIMITS.text);
  copy.updated = now.getTime();
  if (copy.sections) copy.sections = copy.sections.map(s => ({ ...s, id: makeId(), lines: fresh(s.lines) }));
  if (copy.nights) copy.nights = copy.nights.map(n => ({ ...n, id: makeId(), lines: fresh(n.lines) }));
  copy.team = fresh(copy.team);
  copy.checklist = fresh(copy.checklist);
  copy.details = fresh(copy.details);
  return copy;
}

// ---------------------------------------------------------------------------
// Time.
// ---------------------------------------------------------------------------

/** "9:05 AM" from "09:00" and 5 minutes; '' when there is no start time. */
export function clockAt(time, offset = 0) {
  if (!/^\d{2}:\d{2}$/.test(time ?? '')) return '';
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + offset) % 1440) + 1440) % 1440;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function totalMinutes(lines) {
  return lines.reduce((sum, l) => sum + (l.minutes || 0), 0);
}

/** Each line with the time it starts, worked out from the minutes before it. */
export function timed(lines, time) {
  let offset = 0;
  return lines.map(line => {
    const row = { ...line, start: clockAt(time, offset) };
    offset += line.minutes || 0;
    return row;
  });
}

export function dateLabel(key, { weekday = true } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key ?? '')) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: weekday ? 'long' : undefined, month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function moveItem(list, index, direction) {
  const next = index + direction;
  if (index < 0 || next < 0 || index >= list.length || next >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

// ---------------------------------------------------------------------------
// Readiness: what still needs a person before the day.
// ---------------------------------------------------------------------------

/** Parts that do not say who leads them. */
export function needsSomeone(program) {
  const lines = program.kind === 'series'
    ? program.nights.flatMap(n => n.lines)
    : program.sections.flatMap(s => s.lines);
  const missing = lines.filter(l => l.part.trim() && !l.who.trim()).length;
  return { missing, total: lines.filter(l => l.part.trim()).length };
}

// ---------------------------------------------------------------------------
// Saving: everything read back is tidied, so a damaged or hand-edited store
// can never put something unexpected on the screen.
// ---------------------------------------------------------------------------

const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩﻿]/g;
const isId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const id = v => (isId(v) ? v : makeId());
const text = (v, max = LIMITS.text) => (typeof v === 'string' ? v.replace(HIDDEN, '').replace(/[\r\n]+/g, ' ').slice(0, max) : '');
const long = v => (typeof v === 'string' ? v.replace(HIDDEN, '').slice(0, LIMITS.long) : '');
const day = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const clock = v => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '');
const mins = v => (Number.isFinite(v) ? Math.max(0, Math.min(LIMITS.minutes, Math.trunc(v))) : 0);
const list = (v, max, each) => (Array.isArray(v) ? v.slice(0, max).map(each).filter(Boolean) : []);
const colour = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : LOOK.accent);

function tidyLine(l) {
  if (!l || typeof l !== 'object') return null;
  return { id: id(l.id), part: text(l.part), detail: text(l.detail), who: text(l.who), minutes: mins(l.minutes), note: text(l.note, 300), hint: text(l.hint, 60) };
}

export function tidyProgram(p) {
  if (!p || typeof p !== 'object' || (p.kind !== 'service' && p.kind !== 'series')) return null;
  const base = {
    id: id(p.id), kind: p.kind, title: text(p.title) || 'Untitled program', church: text(p.church),
    date: day(p.date), theme: text(p.theme, 200), venue: text(p.venue),
    details: list(p.details, LIMITS.details, d => (d && typeof d === 'object' ? { id: id(d.id), label: text(d.label, 40), value: text(d.value, 200) } : null)),
    announcements: long(p.announcements), notes: long(p.notes),
    look: { style: ['classic', 'clean', 'warm'].includes(p.look?.style) ? p.look.style : 'classic', accent: colour(p.look?.accent) },
    updated: Number.isFinite(p.updated) ? p.updated : 0,
  };
  if (p.kind === 'service') {
    const sections = list(p.sections, LIMITS.sections, s => (s && typeof s === 'object'
      ? { id: id(s.id), title: text(s.title, 80), time: clock(s.time), lines: list(s.lines, LIMITS.lines, tidyLine) } : null));
    return sections.length ? { ...base, sections } : null;
  }
  const nights = list(p.nights, LIMITS.nights, n => (n && typeof n === 'object'
    ? { id: id(n.id), date: day(n.date), time: clock(n.time), topic: text(n.topic), speaker: text(n.speaker), scripture: text(n.scripture), lines: list(n.lines, LIMITS.lines, tidyLine) } : null));
  if (!nights.length) return null;
  return {
    ...base, nights,
    team: list(p.team, LIMITS.team, t => (t && typeof t === 'object' ? { id: id(t.id), role: text(t.role, 60), who: text(t.who) } : null)),
    checklist: list(p.checklist, LIMITS.checklist, c => (c && typeof c === 'object' ? { id: id(c.id), text: text(c.text, 200), done: c.done === true } : null)),
  };
}

export function tidyStore(raw) {
  const store = raw && typeof raw === 'object' ? raw : {};
  const tradition = Object.hasOwn(TRADITIONS, store.settings?.tradition) ? store.settings.tradition : 'adventist';
  const seen = new Set();
  const programs = list(store.programs, LIMITS.programs, tidyProgram).filter(p => !seen.has(p.id) && seen.add(p.id));
  return {
    settings: { tradition, church: text(store.settings?.church), chosen: store.settings?.chosen === true },
    programs,
  };
}

/**
 * Programs saved by Open Scroll 0.1, in the new shape. A Sabbath School program
 * becomes a service with one part of the day per session; an evangelistic
 * meeting becomes a series with one night per session.
 */
export function fromVersionOne(old) {
  if (!Array.isArray(old)) return [];
  return old.map(p => {
    if (!p || typeof p !== 'object' || !Array.isArray(p.sessions)) return null;
    const lines = items => (Array.isArray(items) ? items : []).map(i => ({
      id: i.id, part: i.title, detail: i.resource, who: i.leader, minutes: i.minutes, note: '',
    }));
    const common = { id: p.id, title: p.title, venue: p.venue, notes: p.notes, details: [], announcements: '', updated: Date.now() };
    if (p.type === 'evangelistic') {
      return tidyProgram({
        ...common, kind: 'series', date: p.sessions[0]?.date,
        nights: p.sessions.map(s => ({ id: s.id, date: s.date, time: s.time, topic: s.topic || s.title, lines: lines(s.items) })),
        team: [], checklist: [],
      });
    }
    return tidyProgram({
      ...common, kind: 'service', date: p.sessions[0]?.date, theme: p.sessions[0]?.topic,
      sections: p.sessions.map(s => ({ id: s.id, title: s.title, time: s.time, lines: lines(s.items) })),
    });
  }).filter(Boolean);
}

export function readStore(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw !== null) return tidyStore(JSON.parse(raw));
  const old = storage.getItem(OLD_STORAGE_KEY);
  const store = tidyStore({});
  if (old !== null) store.programs = fromVersionOne(JSON.parse(old));
  return store;
}

export function writeStore(storage, store) {
  storage.setItem(STORAGE_KEY, JSON.stringify(tidyStore(store)));
}
