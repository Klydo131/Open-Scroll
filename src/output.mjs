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

function lineText(line, opt) {
  return [
    opt.times && line.start ? line.start : '',
    line.part || 'Untitled',
    line.detail,
    opt.leaders ? line.who : '',
    opt.notes && line.note ? `(${line.note})` : '',
  ].filter(Boolean).join(' · ');
}

export function programText(program, { copy = 'congregation', showLeaders = true, nightId = null } = {}) {
  const opt = copyOptions(copy, showLeaders);
  const out = [program.title];
  const head = [program.church, program.date && program.kind === 'service' ? dateLabel(program.date) : '', program.venue].filter(Boolean);
  if (head.length) out.push(head.join(' · '));
  if (program.theme) out.push(program.theme);
  for (const d of program.details.filter(d => d.label && d.value)) out.push(`${d.label}: ${d.value}`);

  if (program.kind === 'service') {
    for (const s of program.sections) {
      out.push('', [s.title.toUpperCase(), clockAt(s.time)].filter(Boolean).join(' · '));
      for (const line of timed(s.lines, s.time).filter(l => l.part || l.detail)) out.push(lineText(line, opt));
    }
  } else {
    const nights = nightId ? program.nights.filter(n => n.id === nightId) : program.nights;
    for (const n of nights) {
      const number = program.nights.indexOf(n) + 1;
      out.push('', `NIGHT ${number}${n.topic ? `: ${n.topic}` : ''}`);
      const when = [dateLabel(n.date), clockAt(n.time)].filter(Boolean).join(' · ');
      if (when) out.push(when);
      if (n.speaker) out.push(`Speaker: ${n.speaker}`);
      if (n.scripture) out.push(`Scripture: ${n.scripture}`);
      // The whole series is a schedule of nights; one night is its full order.
      if (nightId || copy === 'platform') {
        for (const line of timed(n.lines, n.time).filter(l => l.part || l.detail)) out.push(lineText(line, opt));
      }
    }
  }
  if (program.announcements.trim()) out.push('', 'ANNOUNCEMENTS', ...program.announcements.trim().split('\n').map(a => `• ${a.trim()}`).filter(a => a !== '•'));
  if (opt.notes && program.notes.trim()) out.push('', 'PLANNING NOTES', program.notes.trim());
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
