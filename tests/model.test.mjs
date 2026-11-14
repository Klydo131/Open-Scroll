import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SECTIONS, OLD_STORAGE_KEY, STORAGE_KEY, SECTION_TEMPLATES, lower, TOPIC_SETS, addDays, clockAt, copyForNextWeek, dayKey,
  duplicate, fromVersionOne, needsSomeone, newSeries, newService, nextWeekday, readStore, tidyProgram,
  tidyStore, timed, totalMinutes, words, writeStore,
} from '../src/model.mjs';
import { calendar, copyOptions, fileName, icsText, programText } from '../src/output.mjs';

const ADVENTIST = { tradition: 'adventist', church: 'Riverside Church' };
const GENERAL = { tradition: 'general', church: '' };
const NOW = new Date(2026, 10, 11, 10, 0); // a Wednesday

function memoryStorage() {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), values };
}

test('each tradition speaks its own words and never the other', () => {
  assert.equal(words(ADVENTIST).day, 'Sabbath');
  assert.equal(words(ADVENTIST).worship, 'Divine Service');
  assert.equal(words(GENERAL).day, 'Sunday');
  assert.equal(words(GENERAL).school, 'Sunday School');
  assert.equal(words({}).day, 'Sabbath', 'unknown settings fall back to a known tradition');
  const general = JSON.stringify(SECTION_TEMPLATES.general) + JSON.stringify(TOPIC_SETS.general);
  assert.doesNotMatch(general, /Sabbath|Adventist|AY\b/);
});

test('a new service starts on the next day of worship with the chosen parts in order', () => {
  const p = newService(ADVENTIST, ['divine-service', 'sabbath-school'], NOW);
  assert.equal(p.date, '2026-11-14', 'the Saturday after a Wednesday');
  assert.deepEqual(p.sections.map(s => s.title), ['Divine Service', 'Sabbath School']);
  assert.equal(p.church, 'Riverside Church');
  assert.equal(p.sections[1].lines[0].part, 'Song service');
  assert.ok(p.sections[0].lines.some(l => l.part === 'Sermon'));
  const g = newService(GENERAL, ['nope'], NOW);
  assert.equal(g.date, '2026-11-15', 'a Sunday');
  assert.equal(g.sections[0].title, 'Sunday School', 'an unknown key falls back to the first template');
});

test('no hymn titles or numbers are shipped in any template', () => {
  for (const list of Object.values(SECTION_TEMPLATES)) {
    for (const t of list) for (const p of t.parts) assert.doesNotMatch(p.part, /\d|SDA Hymnal/i, p.part);
  }
});

test('dates: next weekday counts today, and adding days crosses months', () => {
  assert.equal(nextWeekday(3, NOW), '2026-11-11');
  assert.equal(addDays('2026-11-28', 5), '2026-12-03');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('a series puts nights only on the chosen weekdays and gives them topics', () => {
  const topics = TOPIC_SETS.adventist[0].topics;
  const s = newSeries(ADVENTIST, { start: '2026-11-15', count: 6, weekdays: [0, 2, 3, 5, 6], time: '19:30', topics }, NOW);
  assert.equal(s.nights.length, 6);
  assert.deepEqual(s.nights.map(n => n.date), ['2026-11-15', '2026-11-17', '2026-11-18', '2026-11-20', '2026-11-21', '2026-11-22']);
  assert.deepEqual(s.nights.map(n => n.topic), topics.slice(0, 6));
  assert.ok(s.nights.every(n => n.time === '19:30' && n.lines.some(l => l.part === 'Message')));
  assert.equal(s.team.length, 8);
  assert.ok(s.checklist.every(c => c.done === false));
  assert.equal(newSeries(ADVENTIST, { start: '2026-11-15', count: 999, weekdays: [1] }, NOW).nights.length, 40, 'capped');
});

test('start times are worked out from the minutes before each part', () => {
  const rows = timed([{ minutes: 10 }, { minutes: 4 }, { minutes: 0 }], '09:00');
  assert.deepEqual(rows.map(r => r.start), ['9:00 AM', '9:10 AM', '9:14 AM']);
  assert.equal(clockAt('11:50', 25), '12:15 PM');
  assert.equal(clockAt('', 5), '');
  assert.equal(totalMinutes([{ minutes: 5 }, { minutes: 7 }]), 12);
});

test('readiness counts named parts with nobody leading them', () => {
  const p = newService(ADVENTIST, ['vespers'], NOW);
  assert.deepEqual(needsSomeone(p), { missing: 4, total: 4 });
  p.sections[0].lines[0].who = 'Elder';
  p.sections[0].lines[1].part = '   ';
  assert.deepEqual(needsSomeone(p), { missing: 2, total: 3 });
});

test('copy for next week keeps the order, clears the names and moves the date', () => {
  const p = newService(ADVENTIST, ['sabbath-school'], NOW);
  p.sections[0].lines[1].detail = 'Hymn 1';
  p.sections[0].lines[1].who = 'A. Member';
  p.details.push({ id: crypto.randomUUID(), label: 'Offering for', value: 'Local budget' });
  const next = copyForNextWeek(p, NOW);
  assert.equal(next.date, '2026-11-21');
  assert.notEqual(next.id, p.id);
  assert.equal(next.sections[0].lines.length, p.sections[0].lines.length);
  assert.ok(next.sections[0].lines.every(l => !l.who && !l.detail));
  assert.equal(next.details[0].label, 'Offering for');
  assert.equal(next.details[0].value, '');
  assert.equal(p.sections[0].lines[1].who, 'A. Member', 'the original is untouched');
  const copy = duplicate(p, NOW);
  assert.notEqual(copy.sections[0].lines[0].id, p.sections[0].lines[0].id);
});

test('a damaged or hostile store is tidied before anything reaches the screen', () => {
  const p = newService(ADVENTIST, ['vespers'], NOW);
  p.title = `Bad‮title\n<script>${'x'.repeat(500)}`;
  p.sections[0].lines[0].minutes = 1e9;
  p.sections[0].time = '25:99';
  p.look = { style: 'neon', accent: 'red;background:url(x)' };
  const t = tidyProgram(p);
  assert.ok(!t.title.includes('‮') && !t.title.includes('\n'));
  assert.ok(t.title.length <= 160);
  assert.equal(t.sections[0].lines[0].minutes, 300);
  assert.equal(t.sections[0].time, '');
  assert.deepEqual(t.look, { style: 'classic', accent: '#1f3a5f' });
  assert.equal(tidyProgram({ kind: 'service', sections: [] }), null);
  assert.equal(tidyProgram({ kind: 'other' }), null);
  const store = tidyStore({ settings: { tradition: 'x' }, programs: [p, p, 'junk', null] });
  assert.equal(store.settings.tradition, 'adventist');
  assert.equal(store.programs.length, 1, 'duplicates and junk dropped');
});

test('saving round-trips, and programs from the first version are brought across', () => {
  const storage = memoryStorage();
  const store = { settings: { tradition: 'general', church: 'Hillside', chosen: true }, programs: [newService(GENERAL, ['worship'], NOW)] };
  writeStore(storage, store);
  assert.deepEqual(readStore(storage), tidyStore(store));

  const old = memoryStorage();
  old.setItem(OLD_STORAGE_KEY, JSON.stringify([
    { id: crypto.randomUUID(), type: 'sabbath', title: 'Old Sabbath', sessions: [{ id: crypto.randomUUID(), title: 'Sabbath School', date: '2026-01-03', time: '09:30', items: [{ id: crypto.randomUUID(), title: 'Lesson', minutes: 40, leader: 'Teacher', resource: 'Lesson 1' }] }] },
    { id: crypto.randomUUID(), type: 'evangelistic', title: 'Old meetings', sessions: [{ id: crypto.randomUUID(), title: 'Night 1', topic: 'Hope', date: '2026-02-01', time: '19:00', items: [] }] },
  ]));
  const migrated = readStore(old);
  assert.equal(old.getItem(STORAGE_KEY), null, 'reading never writes');
  assert.equal(migrated.programs.length, 2);
  const [svc, series] = migrated.programs;
  assert.equal(svc.kind, 'service');
  assert.deepEqual([svc.sections[0].lines[0].part, svc.sections[0].lines[0].who, svc.sections[0].lines[0].detail], ['Lesson', 'Teacher', 'Lesson 1']);
  assert.equal(series.kind, 'series');
  assert.equal(series.nights[0].topic, 'Hope');
  assert.deepEqual(fromVersionOne('nonsense'), []);
});

test('the congregation copy keeps private notes and times off; the platform copy has them', () => {
  const p = newService(ADVENTIST, ['vespers'], NOW);
  p.sections[0].lines[0] = { ...p.sections[0].lines[0], detail: 'No. 1', who: 'Song leader', note: 'Use the piano' };
  p.notes = 'Ask about the projector';
  const congregation = programText(p, { copy: 'congregation', showLeaders: false });
  assert.doesNotMatch(congregation, /piano|projector|Song leader|5:30 PM ·/);
  assert.match(congregation, /Hymn · No\. 1/);
  const platform = programText(p, { copy: 'platform' });
  assert.match(platform, /5:30 PM · Hymn · No\. 1 · Song leader · \(Use the piano\)/);
  assert.match(platform, /PLANNING NOTES\nAsk about the projector/);
  assert.deepEqual(copyOptions('congregation', true), { leaders: true, times: false, notes: false });
});

test('a series prints its schedule, and one night prints its full order', () => {
  const s = newSeries(ADVENTIST, { start: '2026-11-15', count: 2, weekdays: [0, 1], topics: ['Hope', 'Peace'] }, NOW);
  const whole = programText(s);
  assert.match(whole, /NIGHT 1: Hope/);
  assert.match(whole, /NIGHT 2: Peace/);
  assert.doesNotMatch(whole, /Song service/, 'the schedule does not repeat every order');
  const one = programText(s, { nightId: s.nights[1].id });
  assert.doesNotMatch(one, /NIGHT 1/);
  assert.match(one, /NIGHT 2: Peace[\s\S]*Song service/);
});

test('the calendar file is escaped, folded and one event per part of the day', () => {
  assert.equal(icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const p = newService(ADVENTIST, ['sabbath-school', 'divine-service'], NOW);
  p.title = 'Day, of; rest';
  p.venue = 'x'.repeat(200);
  const ics = calendar(p, NOW);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.match(ics, /DTSTART:20261114T090000/);
  assert.match(ics, /SUMMARY:Sabbath School · Day\\, of\\; rest/);
  assert.ok(ics.split('\r\n').every(line => line.length <= 75), 'lines folded');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  const series = newSeries(ADVENTIST, { start: '2026-11-15', count: 3, weekdays: [0, 1, 2] }, NOW);
  assert.equal((calendar(series, NOW).match(/BEGIN:VEVENT/g) ?? []).length, 3);
});

test('file names are plain and safe', () => {
  assert.equal(fileName({ title: 'Sabbath / ../ Program!', date: '2026-11-14' }, 'png'), 'sabbath-program-2026-11-14.png');
  assert.equal(fileName({ title: '***', date: '' }, 'ics'), 'program.ics');
});

test('names keep their capitals and a new program starts with the two main services', () => {
  assert.equal(lower('Sabbath program'), 'Sabbath program');
  assert.equal(lower('Sunday program'), 'Sunday program');
  assert.equal(lower('Evangelistic series'), 'evangelistic series');
  for (const [tradition, keys] of Object.entries(DEFAULT_SECTIONS)) {
    const titles = newService({ tradition }, keys, NOW).sections.map(s => s.title);
    assert.deepEqual(titles, [words({ tradition }).school, words({ tradition }).worship]);
  }
});
