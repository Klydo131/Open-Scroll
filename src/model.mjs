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
  templates: 40,
  topicSets: 20,
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

/** The names a church can change for itself in Settings (Advanced). */
export const OWN_WORDS = ['program', 'school', 'worship', 'series', 'night'];

/** The tradition's words, with any the church renamed for itself. */
export function words(settings) {
  const base = TRADITIONS[settings?.tradition] ?? TRADITIONS.adventist;
  const own = settings?.words ?? {};
  const out = { ...base };
  for (const key of OWN_WORDS) if (typeof own[key] === 'string' && own[key].trim()) out[key] = own[key].trim();
  return out;
}

export const MODES = {
  simple: {
    label: 'Simple',
    summary: 'The essentials: each part, its hymn or passage, and who leads it.',
  },
  advanced: {
    label: 'Advanced',
    summary: 'Adds minutes and start times, private notes, the platform copy, extra details, nightly counts, and your own templates, topics and words.',
  },
};

export const isAdvanced = settings => settings?.mode === 'advanced';

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
      key: 'thirteenth', title: 'Thirteenth Sabbath program', time: '09:00',
      blurb: 'The last Sabbath of the quarter: a mission feature and the special mission offering.',
      parts: [
        P('Song service', 10), P('Opening hymn', 4, 'Hymn number'), P('Opening prayer', 2), P('Welcome', 3),
        P('Mission feature', 15, 'Field of this quarter\'s offering'), P("Children's mission song", 4),
        P('Thirteenth Sabbath offering', 5), P('Lesson review', 25, 'Quarter\'s theme'),
        P('Closing hymn', 4, 'Hymn number'), P('Closing prayer', 2),
      ],
    },
    {
      key: 'communion', title: 'Communion service', time: '11:00',
      blurb: 'The ordinance of humility, then the Lord\'s Supper. Usually once a quarter.',
      parts: [
        P('Call to worship', 2), P('Opening hymn', 4, 'Hymn number'), P('Invocation', 2),
        P('Scripture reading', 3, 'e.g. John 13:1-17'), P('Communion message', 15, 'Title'),
        P('Ordinance of humility (foot washing)', 15), P('Hymn on returning', 4, 'Hymn number'),
        P('The bread', 5, '1 Corinthians 11:23-24'), P('The cup', 5, '1 Corinthians 11:25-26'),
        P('Offering for the poor', 4), P('Closing hymn', 4, 'Hymn number'), P('Benediction', 1),
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
      key: 'communion', title: 'Communion service', time: '10:30',
      blurb: 'Words of institution, the bread and the cup.',
      parts: [
        P('Call to worship', 2), P('Opening hymn', 4, 'Hymn or song'), P('Prayer of confession', 3),
        P('Scripture reading', 3, 'Passage'), P('Communion message', 15, 'Title'),
        P('Words of institution', 3, '1 Corinthians 11:23-26'), P('The bread', 5), P('The cup', 5),
        P('Prayer of thanksgiving', 2), P('Closing hymn', 4, 'Hymn or song'), P('Benediction', 1),
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

/**
 * Every part of the day a church can start from: the built-in orders first
 * (under the church's own names for its school and worship), then the
 * templates it saved itself. A saved template's key is its id.
 */
export function allTemplates(settings, own = []) {
  const base = TRADITIONS[settings?.tradition] ?? TRADITIONS.adventist;
  const w = words(settings);
  const builtIn = (SECTION_TEMPLATES[settings?.tradition] ?? SECTION_TEMPLATES.adventist).map(t => ({
    ...t, own: false,
    title: t.title === base.school ? w.school : t.title === base.worship ? w.worship : t.title,
  }));
  return [...builtIn, ...own.map(t => ({ ...t, key: t.id, own: true, blurb: `${t.parts.length} parts` }))];
}

export function newService(settings, sectionKeys, now = new Date(), own = []) {
  const w = words(settings);
  const templates = allTemplates(settings, own);
  const chosen = sectionKeys.map(key => templates.find(t => t.key === key)).filter(Boolean);
  return {
    id: makeId(), kind: 'service', title: w.program, church: settings?.church ?? '',
    date: nextWeekday(w.weekday, now), theme: '', venue: settings?.venue ?? '',
    sections: (chosen.length ? chosen : [templates[0]]).map(sectionFromTemplate),
    details: [], announcements: '', notes: '', look: { ...LOOK, ...settings?.look }, updated: now.getTime(),
  };
}

/**
 * Several weeks at once, as a superintendent plans a quarter. With
 * `thirteenth`, the last week becomes the Thirteenth Sabbath program in place
 * of the first chosen part of the day.
 */
export function planWeeks(settings, sectionKeys, { start, weeks = 13, thirteenth = false }, now = new Date(), own = []) {
  const first = start || nextWeekday(words(settings).weekday, now);
  const count = Math.max(1, Math.min(weeks, 26));
  return Array.from({ length: count }, (_, i) => {
    const last = i === count - 1;
    const keys = last && thirteenth ? ['thirteenth', ...sectionKeys.slice(1)] : sectionKeys;
    const p = newService(settings, keys, now, own);
    return { ...p, date: addDays(first, i * 7), title: last && thirteenth ? 'Thirteenth Sabbath' : p.title };
  });
}

/** A part of the day saved as the church's own template: its order, never its people. */
export function templateFromSection(section) {
  return {
    id: makeId(), title: section.title, time: section.time,
    parts: section.lines.filter(l => l.part.trim()).map(l => ({ part: l.part, minutes: l.minutes, hint: l.hint })),
  };
}

/** Counts a series keeps for each night: numbers only, never names. */
export const NIGHT_COUNTS = [
  { key: 'attendance', label: 'Present' },
  { key: 'guests', label: 'Guests' },
  { key: 'interests', label: 'Interest cards' },
  { key: 'decisions', label: 'Decisions' },
];

export function seriesTotals(program) {
  const counted = program.nights.filter(n => n.counts && Object.values(n.counts).some(v => v > 0));
  const totals = Object.fromEntries(NIGHT_COUNTS.map(c => [c.key, program.nights.reduce((t, n) => t + (n.counts?.[c.key] ?? 0), 0)]));
  return { ...totals, nightsCounted: counted.length, average: counted.length ? Math.round(totals.attendance / counted.length) : 0 };
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
    date: first, theme: '', venue: settings?.venue ?? '', nights,
    team: TEAM_ROLES.slice(0, 8).map(role => ({ id: makeId(), role, who: '' })),
    checklist: PREP_CHECKLIST.map(text => ({ id: makeId(), text, done: false })),
    details: [], announcements: '', notes: '', look: { ...LOOK, accent: '#5b2a3c', ...settings?.look }, updated: now.getTime(),
  };
}

export function newNight(date = '', time = '19:00', topic = '') {
  return { id: makeId(), date, time, topic, speaker: '', scripture: '', lines: linesFrom(NIGHT_TEMPLATE), counts: emptyCounts() };
}

export function emptyCounts() {
  return Object.fromEntries(NIGHT_COUNTS.map(c => [c.key, 0]));
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
const count = v => (Number.isFinite(v) ? Math.max(0, Math.min(100000, Math.trunc(v))) : 0);
const STYLES = ['classic', 'clean', 'warm'];

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
    ? {
      id: id(n.id), date: day(n.date), time: clock(n.time), topic: text(n.topic), speaker: text(n.speaker), scripture: text(n.scripture),
      lines: list(n.lines, LIMITS.lines, tidyLine),
      counts: Object.fromEntries(NIGHT_COUNTS.map(c => [c.key, count(n.counts?.[c.key])])),
    } : null));
  if (!nights.length) return null;
  return {
    ...base, nights,
    team: list(p.team, LIMITS.team, t => (t && typeof t === 'object' ? { id: id(t.id), role: text(t.role, 60), who: text(t.who) } : null)),
    checklist: list(p.checklist, LIMITS.checklist, c => (c && typeof c === 'object' ? { id: id(c.id), text: text(c.text, 200), done: c.done === true } : null)),
  };
}

export function tidyTemplate(t) {
  if (!t || typeof t !== 'object') return null;
  const parts = list(t.parts, LIMITS.lines, p => (p && typeof p === 'object' && text(p.part)
    ? { part: text(p.part), minutes: mins(p.minutes), hint: text(p.hint, 60) } : null));
  return parts.length ? { id: id(t.id), title: text(t.title, 80) || 'My template', time: clock(t.time), parts } : null;
}

export function tidyTopicSet(s) {
  if (!s || typeof s !== 'object') return null;
  const topics = list(s.topics, LIMITS.nights, v => text(v) || null);
  return topics.length ? { id: id(s.id), label: text(s.label, 80) || 'My topics', topics } : null;
}

export function tidySettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const look = s.look && typeof s.look === 'object' ? s.look : {};
  const tidyLook = {};
  if (STYLES.includes(look.style)) tidyLook.style = look.style;
  if (/^#[0-9a-f]{6}$/i.test(look.accent ?? '')) tidyLook.accent = look.accent;
  return {
    tradition: Object.hasOwn(TRADITIONS, s.tradition) ? s.tradition : 'adventist',
    mode: s.mode === 'advanced' ? 'advanced' : 'simple',
    church: text(s.church),
    venue: text(s.venue),
    paper: s.paper === 'a4' ? 'a4' : 'letter',
    words: Object.fromEntries(OWN_WORDS.map(k => [k, text(s.words?.[k], 40)])),
    look: tidyLook,
    lastSections: list(s.lastSections, LIMITS.sections, k => (typeof k === 'string' && /^[a-z0-9-]{1,40}$/i.test(k) ? k : null)),
    chosen: s.chosen === true,
  };
}

export function tidyStore(raw) {
  const store = raw && typeof raw === 'object' ? raw : {};
  const unique = items => { const seen = new Set(); return items.filter(x => !seen.has(x.id) && seen.add(x.id)); };
  return {
    settings: tidySettings(store.settings),
    programs: unique(list(store.programs, LIMITS.programs, tidyProgram)),
    templates: unique(list(store.templates, LIMITS.templates, tidyTemplate)),
    topicSets: unique(list(store.topicSets, LIMITS.topicSets, tidyTopicSet)),
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

/** Built-in topic lists for the tradition, then the church's own. */
export function allTopicSets(settings, own = []) {
  return [...(TOPIC_SETS[settings?.tradition] ?? TOPIC_SETS.adventist), ...own.map(s => ({ ...s, key: s.id, own: true }))];
}
