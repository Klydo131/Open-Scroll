export const storageKey = 'open-scroll.programs.v1';
export const types = { sabbath: 'Sabbath School', evangelistic: 'Evangelistic meeting' };
export const maxPrograms = 100;
export const maxSessions = 30;
export const maxItems = 50;

const makeId = () => globalThis.crypto.randomUUID();
const examples = {
  sabbath: [['Welcome and opening prayer', 5], ['Mission spotlight', 10], ['Lesson discussion', 40], ['Closing prayer', 5]],
  evangelistic: [['Welcome and prayer', 5], ['Music', 15], ['Bible message', 35], ['Response and closing prayer', 10]],
};

export function newItem(title = '', minutes = 5) {
  return { id: makeId(), title, minutes, leader: '', resource: '' };
}

export function newSession(type, index) {
  const sabbath = type === 'sabbath';
  return {
    id: makeId(), title: sabbath ? 'Sabbath School' : `Night ${index}`, date: '',
    time: sabbath ? '09:00' : '18:30', topic: '',
    items: examples[type].map(([title, minutes]) => newItem(title, minutes)),
  };
}

export function newProgram(type) {
  return { id: makeId(), type, title: types[type], venue: '', notes: '', sessions: [newSession(type, 1)] };
}

export function minutesOf(session) {
  return session.items.reduce((total, item) => total + item.minutes, 0);
}

export function clockAt(time, offset) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + offset;
  const day = Math.floor(total / 1440);
  const hour = Math.floor((total % 1440) / 60);
  const minute = total % 60;
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  return day ? `${label} (+${day}d)` : label;
}

export function agenda(session) {
  let offset = 0;
  return session.items.map(item => {
    const row = { ...item, start: clockAt(session.time, offset) };
    offset += item.minutes;
    return row;
  });
}

export function moveItem(items, index, direction) {
  const next = index + direction;
  if (index < 0 || index >= items.length || next < 0 || next >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
  return reordered;
}

export function toPublicProgram(program, includeLeaders = false) {
  return {
    title: program.title.trim() || types[program.type], type: program.type, venue: program.venue.trim(),
    sessions: program.sessions.map(session => ({
      title: session.title.trim(), date: session.date, time: session.time, topic: session.topic.trim(),
      items: session.items.map(({ title, leader, resource, minutes }) => ({
        title: title.trim(), leader: includeLeaders ? leader.trim() : '', resource: resource.trim(), minutes,
      })),
    })),
  };
}

export function bulletinText(program) {
  const lines = [program.title, types[program.type], program.venue].filter(Boolean);
  for (const session of program.sessions) {
    lines.push('', session.title || 'Session');
    const when = [session.date, clockAt(session.time, 0)].filter(Boolean).join(' · ');
    if (when) lines.push(when);
    if (session.topic) lines.push(session.topic);
    for (const item of agenda(session)) {
      lines.push([item.start, item.title || 'Untitled item', item.leader, item.resource, `${item.minutes} min`].filter(Boolean).join(' · '));
    }
  }
  return lines.join('\n') + '\n';
}

function validList(list, min, max, valid) {
  return Array.isArray(list) && list.length >= min && list.length <= max &&
    list.every(valid) && new Set(list.map(item => item.id)).size === list.length;
}

const str = (value, max) => typeof value === 'string' && value.length <= max;
const id = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const date = value => value === '' || (typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toJSON()?.slice(0, 10) === value);
const validItem = item => Boolean(item && id(item.id) && str(item.title, 120) && str(item.leader, 100) &&
  str(item.resource, 120) && Number.isInteger(item.minutes) && item.minutes >= 0 && item.minutes <= 360);
const validSession = session => Boolean(session && id(session.id) && str(session.title, 100) &&
  str(session.topic, 160) && date(session.date) && (session.time === '' ||
    (typeof session.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(session.time))) &&
  validList(session.items, 0, maxItems, validItem));
const validProgram = program => Boolean(program && id(program.id) && Object.hasOwn(types, program.type) &&
  str(program.title, 120) && str(program.venue, 160) && str(program.notes, 2000) &&
  validList(program.sessions, 1, maxSessions, validSession));

export function readPrograms(storage) {
  const raw = storage.getItem(storageKey);
  if (raw === null) return [];
  const programs = JSON.parse(raw);
  if (!validList(programs, 0, maxPrograms, validProgram)) throw new Error('Invalid saved programs');
  return programs;
}

export function savePrograms(storage, programs) {
  if (!validList(programs, 0, maxPrograms, validProgram)) throw new Error('Invalid programs');
  storage.setItem(storageKey, JSON.stringify(programs));
}
