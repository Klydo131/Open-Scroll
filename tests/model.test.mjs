import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SECTIONS, OLD_STORAGE_KEY, STORAGE_KEY, SECTION_TEMPLATES, lower, allTemplates, allTopicSets, planWeeks,
  seriesTotals, templateFromSection, tidySettings, TOPIC_SETS, addDays, clockAt, copyForNextWeek, dayKey,
  duplicate, fromVersionOne, needsSomeone, newSeries, newService, nextWeekday, readStore, tidyProgram,
  tidyStore, timed, totalMinutes, words, writeStore,
} from '../src/model.mjs';
import { calendar, copyOptions, fileName, icsText, programText } from '../src/output.mjs';
import { columnName, crc32, docxFile, markdownText, mdEscape, sheetNames, workbookSheets, xlsxFile, xml, zip } from '../src/export.mjs';
import { programPdf } from '../src/pdf.js';

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

test('Simple is the default, and switching modes keeps every saved detail', () => {
  assert.equal(tidySettings({}).mode, 'simple');
  assert.equal(tidySettings({ mode: 'advanced' }).mode, 'advanced');
  assert.equal(tidySettings({ mode: 'expert' }).mode, 'simple', 'unknown modes fall back to Simple');
  const p = newService(ADVENTIST, ['vespers'], NOW);
  p.sections[0].lines[0] = { ...p.sections[0].lines[0], minutes: 7, note: 'Piano' };
  p.notes = 'Private';
  const store = tidyStore({ settings: { mode: 'advanced' }, programs: [p] });
  const simple = tidyStore({ ...store, settings: { ...store.settings, mode: 'simple' } });
  assert.deepEqual(simple.programs, store.programs, 'the mode never touches programs');
});

test('a church can rename its words, and built-in parts of the day follow', () => {
  const settings = { tradition: 'adventist', words: { worship: 'Worship Hour', series: '  ', night: 'Evening' } };
  const w = words(settings);
  assert.equal(w.worship, 'Worship Hour');
  assert.equal(w.series, 'Evangelistic series', 'blank keeps the usual word');
  assert.equal(w.night, 'Evening');
  assert.equal(w.day, 'Sabbath', 'the day itself is not renameable');
  const titles = allTemplates(settings).map(t => t.title);
  assert.ok(titles.includes('Worship Hour') && !titles.includes('Divine Service'));
  assert.equal(tidySettings({ words: { program: 'x'.repeat(99), bogus: 'y' } }).words.program.length, 40);
  assert.equal('bogus' in tidySettings({ words: { bogus: 'y' } }).words, false);
});

test('a saved template keeps the order and minutes but never the people', () => {
  const p = newService(ADVENTIST, ['vespers'], NOW);
  p.sections[0].lines[0] = { ...p.sections[0].lines[0], who: 'A. Member', detail: 'No. 7', note: 'secret' };
  p.sections[0].title = 'Our vespers';
  const t = templateFromSection(p.sections[0]);
  assert.equal(t.title, 'Our vespers');
  assert.deepEqual(Object.keys(t.parts[0]).sort(), ['hint', 'minutes', 'part']);
  assert.doesNotMatch(JSON.stringify(t), /A\. Member|No\. 7|secret/);
  const made = newService(ADVENTIST, [t.id], NOW, [t]);
  assert.equal(made.sections[0].title, 'Our vespers');
  assert.equal(made.sections[0].lines.length, 4);
  assert.ok(allTemplates(ADVENTIST, [t]).at(-1).own);
});

test('planning a quarter makes one program a week and ends on the Thirteenth Sabbath', () => {
  const list = planWeeks(ADVENTIST, ['sabbath-school', 'divine-service'], { start: '2026-12-26', weeks: 13, thirteenth: true }, NOW);
  assert.equal(list.length, 13);
  assert.equal(list[1].date, '2027-01-02');
  assert.equal(list[12].date, '2027-03-20');
  assert.equal(new Set(list.map(p => p.id)).size, 13);
  assert.deepEqual(list[12].sections.map(s => s.title), ['Thirteenth Sabbath program', 'Divine Service']);
  assert.deepEqual(list[0].sections.map(s => s.title), ['Sabbath School', 'Divine Service']);
  assert.equal(planWeeks(GENERAL, ['worship'], { start: '2026-11-15', weeks: 99 }, NOW).length, 26, 'capped');
});

test('nightly counts are numbers only, tidied, and add up', () => {
  const s = newSeries(ADVENTIST, { start: '2026-11-15', count: 3, weekdays: [0, 1, 2] }, NOW);
  s.nights[0].counts = { attendance: 80, guests: 12, interests: 9, decisions: 2 };
  s.nights[1].counts = { attendance: 100, guests: 8, interests: 4, decisions: 1, name: 'Somebody' };
  const t = tidyProgram(s);
  assert.deepEqual(Object.keys(t.nights[1].counts).sort(), ['attendance', 'decisions', 'guests', 'interests']);
  assert.deepEqual(seriesTotals(t), { attendance: 180, guests: 20, interests: 13, decisions: 3, nightsCounted: 2, average: 90 });
  s.nights[2].counts = { attendance: -5, guests: 1e12, interests: 'many' };
  assert.deepEqual(tidyProgram(s).nights[2].counts, { attendance: 0, guests: 100000, interests: 0, decisions: 0 });
  assert.doesNotMatch(programText(t, { copy: 'platform' }), /180|Interest/, 'counts never print on a program');
});

test('own templates and topic lists are tidied, and junk is dropped', () => {
  const store = tidyStore({
    templates: [{ title: 'Ours', parts: [{ part: 'Hymn', minutes: 4 }, { part: '' }, 7] }, { title: 'Empty', parts: [] }, null],
    topicSets: [{ label: 'Ours', topics: ['Hope', '', 3, 'Peace'] }, { label: 'none', topics: [] }],
  });
  assert.equal(store.templates.length, 1);
  assert.deepEqual(store.templates[0].parts, [{ part: 'Hymn', minutes: 4, hint: '' }]);
  assert.deepEqual(store.topicSets[0].topics, ['Hope', 'Peace']);
  assert.equal(allTopicSets(ADVENTIST, store.topicSets).at(-1).label, 'Ours');
});

test('the researched templates are present for each tradition', () => {
  const keys = t => SECTION_TEMPLATES[t].map(x => x.key);
  assert.ok(['thirteenth', 'communion'].every(k => keys('adventist').includes(k)));
  assert.ok(keys('general').includes('communion'));
  const communion = SECTION_TEMPLATES.adventist.find(t => t.key === 'communion').parts.map(p => p.part);
  assert.ok(communion.indexOf('Ordinance of humility (foot washing)') < communion.indexOf('The bread'), 'foot washing comes before the bread');
});

// ---------------------------------------------------------------------------
// Files: Markdown, Word, Excel, PDF
// ---------------------------------------------------------------------------

function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, 'end-of-archive record');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = {};
  for (let i = 0; i < count; i += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    assert.equal(crc32(data), crc, `${name} checksum`);
    files[name] = new TextDecoder().decode(data);
    at += 46 + nameLen;
  }
  return files;
}

const awkward = () => {
  const p = newService(ADVENTIST, ['vespers'], NOW);
  p.title = 'Peace & <Hope> "now"';
  p.church = 'Riverside [[Church]]';
  p.sections[0].lines[0] = { ...p.sections[0].lines[0], detail: '=1+1 | #5 *bold*', who: 'Ana', note: 'Mic 2', minutes: 4 };
  p.announcements = 'Potluck\nPrayer meeting';
  p.notes = 'Private\nthing';
  return tidyProgram(p);
};

test('a zip is valid: every entry has the right checksum and the same bytes always come out', () => {
  const a = zip([{ name: 'a.txt', data: 'héllo' }, { name: 'dir/b.bin', data: new Uint8Array([0, 1, 2, 255]) }]);
  const files = readZip(a);
  assert.equal(files['a.txt'], 'héllo');
  assert.deepEqual(Object.keys(files), ['a.txt', 'dir/b.bin']);
  assert.deepEqual(a, zip([{ name: 'a.txt', data: 'héllo' }, { name: 'dir/b.bin', data: new Uint8Array([0, 1, 2, 255]) }]));
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926, 'the standard CRC-32 check value');
});

test('Markdown is a note an Obsidian vault can use, and typed text cannot become markup', () => {
  const md = markdownText(awkward(), { copy: 'platform' });
  assert.match(md, /^---\ntitle: "Peace & <Hope> \\"now\\""\nchurch: "Riverside \[\[Church\]\]"\ndate: 2026-/);
  assert.match(md, /\ntype: program\ntags: \[open-scroll\]\ncopy: platform\n---\n/);
  assert.match(md, /\n# Peace & \\<Hope\\> "now"\n/);
  assert.match(md, /Riverside \\\[\\\[Church\\\]\\\]/, 'no accidental wiki links');
  assert.match(md, /\*\*Hymn\*\* — =1\+1 \\\| \\#5 \\\*bold\\\*/);
  assert.match(md, /> \[!note\] Planning notes\n> Private\n> thing/);
  const congregation = markdownText(awkward(), { copy: 'congregation', showLeaders: false });
  assert.doesNotMatch(congregation, /Mic 2|Private|Ana|`5:30 PM`/);
  assert.match(congregation, /copy: congregation/);
  assert.equal(mdEscape('a_b*c[d]'), 'a\\_b\\*c\\[d\\]');
});

test('a series in Markdown has a date range, a checklist and the team on the platform copy only', () => {
  const s = tidyProgram(newSeries(ADVENTIST, { start: '2026-11-15', count: 3, weekdays: [0, 2] }, NOW));
  s.team[0].who = 'Pastor Reyes';
  const platform = markdownText(s, { copy: 'platform' });
  assert.match(platform, /type: series\n/);
  assert.match(platform, /end: 2026-11-/);
  assert.match(platform, /## Team\n\n- \*\*Speaker\*\*: Pastor Reyes/);
  assert.match(platform, /- \[ \] Book the venue/);
  const congregation = markdownText(s, { copy: 'congregation' });
  assert.doesNotMatch(congregation, /## Team|Pastor Reyes|Book the venue/);
});

test('a Word file is a valid package, escapes everything, and follows the copy rules', () => {
  const files = readZip(docxFile(awkward(), { copy: 'platform' }, 'a4'));
  assert.deepEqual(Object.keys(files).sort(), ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/footer1.xml', 'word/styles.xml']);
  const body = files['word/document.xml'];
  assert.match(body, /Peace &amp; &lt;Hope&gt; &quot;now&quot;/);
  assert.doesNotMatch(body, /<Hope>/);
  assert.match(body, /w:pgSz w:w="11906" w:h="16838"/, 'A4');
  assert.match(body, /Mic 2/);
  assert.match(readZip(docxFile(awkward(), { copy: 'platform' }))['word/document.xml'], /w:pgSz w:w="12240" w:h="15840"/, 'Letter by default');
  const congregation = readZip(docxFile(awkward(), { copy: 'congregation', showLeaders: false }))['word/document.xml'];
  assert.doesNotMatch(congregation, /Mic 2|Private|>Ana</);
});

test('characters XML cannot hold are dropped, and emoji survive', () => {
  assert.equal(xml('a\u0000b\u000Bc\uD800d'), 'abcd');
  assert.equal(xml('🙏 <&>'), '🙏 &lt;&amp;&gt;');
});

test('an Excel file has one row per part, literal text, safe sheet names, and counts only when asked', () => {
  const s = tidyProgram(newSeries(ADVENTIST, { start: '2026-11-15', count: 2, weekdays: [0, 1], topics: ['=SUM(A1)', 'Peace'] }, NOW));
  s.nights[0].counts = { attendance: 80, guests: 10, interests: 5, decisions: 1 };
  const withCounts = readZip(xlsxFile(s, { copy: 'platform' }, true));
  const nights = withCounts['xl/worksheets/sheet1.xml'];
  assert.match(nights, /<t xml:space="preserve">=SUM\(A1\)<\/t>/, 'stored as text, never as a formula');
  assert.doesNotMatch(nights, /<f>/);
  assert.match(nights, /<c r="G2"><v>80<\/v><\/c>/);
  assert.match(withCounts['xl/workbook.xml'], /name="Nights"[\s\S]*name="Program"[\s\S]*name="Team"[\s\S]*name="Preparation"[\s\S]*name="Details"/);
  const without = readZip(xlsxFile(s, { copy: 'platform' }, false))['xl/worksheets/sheet1.xml'];
  assert.doesNotMatch(without, /Decisions|<v>80<\/v>/);
  const congregation = readZip(xlsxFile(s, { copy: 'congregation' }));
  assert.doesNotMatch(congregation['xl/workbook.xml'], /Team|Preparation|Program/, 'a schedule has no private sheets');
  assert.doesNotMatch(congregation['xl/worksheets/sheet1.xml'], /Decisions/);
  const service = workbookSheets(awkward(), { copy: 'platform' });
  assert.deepEqual(service[0].rows[0], ['Section', 'Start', 'Part', 'Hymn, passage or title', 'Who leads', 'Minutes', 'Private note']);
  assert.equal(workbookSheets(awkward(), { copy: 'congregation', showLeaders: false })[0].rows[0].includes('Who leads'), false);
});

test('sheet names and column letters follow Excel rules', () => {
  assert.deepEqual(sheetNames(['A/B:C', 'a/b:c', 'x'.repeat(40), '']), ['A B C', 'a b c 2', 'x'.repeat(31), 'Sheet']);
  assert.deepEqual([0, 25, 26, 51, 52, 701, 702].map(columnName), ['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
});

test('a PDF is made with real text, any paper, and says when characters could not be shown', async () => {
  const plain = await programPdf(awkward(), { copy: 'platform' }, 'a4');
  assert.equal(new TextDecoder().decode(plain.bytes.subarray(0, 5)), '%PDF-');
  assert.equal(plain.replaced, 0);
  const p = awkward();
  p.sections[0].lines[0].detail = 'Verse 🙏 日本語 José';
  p.sections[0].lines[1].detail = 'x'.repeat(400);
  const other = await programPdf(p, { copy: 'congregation' }, 'letter');
  assert.ok(other.replaced >= 2, 'emoji and Japanese are counted');
  assert.ok(other.bytes.length > 1000);
});

test('paper size is Letter or A4 and nothing else', () => {
  assert.equal(tidySettings({}).paper, 'letter');
  assert.equal(tidySettings({ paper: 'a4' }).paper, 'a4');
  assert.equal(tidySettings({ paper: 'legal; drop table' }).paper, 'letter');
});
