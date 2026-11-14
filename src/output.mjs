// What leaves the app: text for a group chat, a calendar file, file names.
// Pure, so tests/model.test.mjs checks each one.
import { clockAt, dateLabel, timed } from './model.mjs';

/**
 * Two copies of the same program. The congregation's copy is what people
 * hold: parts, hymns and passages, and who leads only when asked. The
 * platform copy is for the people leading: start times and private notes.
 */
export function copyOptions(copy, showLeaders) {
  return copy === 'platform'
    ? { leaders: true, times: true, notes: true }
    : { leaders: showLeaders, times: false, notes: false };
}

/**
 * Everything a printed or saved copy contains, in the order it appears, with
 * the congregation/platform rules already applied. Text, Markdown, Word,
 * Excel and PDF all read this one shape, so they can never disagree about
 * what a copy is allowed to show.
 */
export function programDoc(program, { copy = 'congregation', showLeaders = true, nightId = null, night = 'Night' } = {}) {
  const opt = copyOptions(copy, showLeaders);
  const series = program.kind === 'series';
  const asLines = (lines, time) => timed(lines, time).filter(l => l.part || l.detail).map(l => ({
    time: opt.times ? l.start : '',
    part: l.part || 'Untitled',
    detail: l.detail,
    who: opt.leaders ? l.who : '',
    note: opt.notes ? l.note : '',
    minutes: l.minutes || 0,
  }));
  const doc = {
    kind: program.kind,
    title: program.title,
    church: program.church,
    date: program.date,
    venue: program.venue,
    head: [program.church, program.date && !series ? dateLabel(program.date) : '', program.venue].filter(Boolean),
    theme: program.theme,
    details: program.details.filter(d => d.label && d.value).map(d => ({ label: d.label, value: d.value })),
    sections: [],
    team: [],
    checklist: [],
    announcements: program.announcements.split('\n').map(a => a.trim()).filter(Boolean),
    notes: opt.notes ? program.notes.trim() : '',
    look: program.look,
    opt,
  };
  if (!series) {
    doc.sections = program.sections.map(s => ({
      title: s.title, topic: '', aside: clockAt(s.time), facts: [], lines: asLines(s.lines, s.time),
    }));
    return doc;
  }
  const full = Boolean(nightId) || copy === 'platform';
  const nights = nightId ? program.nights.filter(n => n.id === nightId) : program.nights;
  doc.sections = nights.map(n => ({
    id: n.id,
    title: `${night} ${program.nights.indexOf(n) + 1}`,
    topic: n.topic,
    aside: '',
    facts: [
      [dateLabel(n.date), clockAt(n.time)].filter(Boolean).join(' · '),
      n.speaker ? `Speaker: ${n.speaker}` : '',
      n.scripture ? `Scripture: ${n.scripture}` : '',
    ].filter(Boolean),
    night: { date: n.date, time: n.time, topic: n.topic, speaker: n.speaker, scripture: n.scripture },
    lines: full ? asLines(n.lines, n.time) : [],
  }));
  // The people serving and the preparation list are for those leading, so only the platform copy has them.
  if (opt.notes) {
    doc.team = program.team.filter(t => t.role || t.who).map(t => ({ role: t.role, who: t.who }));
    doc.checklist = program.checklist.filter(c => c.text).map(c => ({ text: c.text, done: c.done }));
  }
  return doc;
}

function lineText(line) {
  return [line.time, line.part, line.detail, line.who, line.note ? `(${line.note})` : ''].filter(Boolean).join(' · ');
}

export function programText(program, options = {}) {
  const doc = programDoc(program, options);
  const out = [doc.title];
  if (doc.head.length) out.push(doc.head.join(' · '));
  if (doc.theme) out.push(doc.theme);
  for (const d of doc.details) out.push(`${d.label}: ${d.value}`);
  for (const s of doc.sections) {
    out.push('', [s.title.toUpperCase() + (s.topic ? `: ${s.topic}` : ''), s.aside].filter(Boolean).join(' · '), ...s.facts, ...s.lines.map(lineText));
  }
  if (doc.team.length) out.push('', 'TEAM', ...doc.team.map(t => [t.role, t.who].filter(Boolean).join(': ')));
  if (doc.checklist.length) out.push('', 'BEFORE THE FIRST NIGHT', ...doc.checklist.map(c => `[${c.done ? 'x' : ' '}] ${c.text}`));
  if (doc.announcements.length) out.push('', 'ANNOUNCEMENTS', ...doc.announcements.map(a => `• ${a}`));
  if (doc.notes) out.push('', 'PLANNING NOTES', doc.notes);
  return out.join('\n') + '\n';
}

export function fileName(program, ending) {
  const base = `${program.title}${program.date ? ` ${program.date}` : ''}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'program';
  return `${base}.${ending}`;
}

// ---------------------------------------------------------------------------
// Calendar (RFC 5545). Floating local times, so a phone shows the time the
// church wrote, wherever it is.
// ---------------------------------------------------------------------------

export function icsText(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function stamp(date, time, addMinutes = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = (time || '00:00').split(':').map(Number);
  const t = new Date(y, m - 1, d, h, min + addMinutes);
  const two = n => String(n).padStart(2, '0');
  return `${t.getFullYear()}${two(t.getMonth() + 1)}${two(t.getDate())}T${two(t.getHours())}${two(t.getMinutes())}00`;
}

function fold(line) {
  const parts = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

export function calendar(program, now = new Date()) {
  const events = [];
  const add = (uid, date, time, minutes, summary, description) => {
    if (!date) return;
    const timedEvent = Boolean(time);
    events.push([
      'BEGIN:VEVENT', `UID:${uid}@open-scroll`, `DTSTAMP:${stamp(now.toISOString().slice(0, 10), now.toTimeString().slice(0, 5))}`,
      timedEvent ? `DTSTART:${stamp(date, time)}` : `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
      timedEvent ? `DTEND:${stamp(date, time, Math.max(minutes, 30))}` : null,
      `SUMMARY:${icsText(summary)}`, program.venue ? `LOCATION:${icsText(program.venue)}` : null,
      description ? `DESCRIPTION:${icsText(description)}` : null, 'END:VEVENT',
    ].filter(Boolean));
  };
  if (program.kind === 'service') {
    for (const s of program.sections) {
      add(s.id, program.date, s.time, s.lines.reduce((t, l) => t + l.minutes, 0), `${s.title} · ${program.title}`, program.theme);
    }
  } else {
    program.nights.forEach((n, i) => add(n.id, n.date, n.time, n.lines.reduce((t, l) => t + l.minutes, 0),
      `${program.title} · Night ${i + 1}${n.topic ? `: ${n.topic}` : ''}`, n.speaker ? `Speaker: ${n.speaker}` : ''));
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Open Scroll//EN', 'CALSCALE:GREGORIAN', ...events.flat(), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}
