import assert from 'node:assert/strict';
import test from 'node:test';
import {
  agenda, bulletinText, clockAt, moveItem, newProgram, newSession,
  readPrograms, savePrograms, storageKey, toPublicProgram,
} from '../src/programs.mjs';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('templates, multiple nights and local persistence round-trip', () => {
  const sabbath = newProgram('sabbath');
  const meeting = newProgram('evangelistic');
  meeting.sessions.push(newSession(meeting.type, 2));
  const storage = memoryStorage();
  assert.deepEqual(readPrograms(storage), []);
  savePrograms(storage, [sabbath, meeting]);
  assert.deepEqual(readPrograms(storage), [sabbath, meeting]);
  assert.equal(meeting.sessions[1].title, 'Night 2');
});

test('agenda handles ordering and midnight', () => {
  const [session] = newProgram('sabbath').sessions;
  assert.equal(agenda(session)[1].start, '9:05 AM');
  const reordered = moveItem(session.items, 0, 1);
  assert.equal(reordered[1].id, session.items[0].id);
  assert.equal(agenda({ ...session, items: reordered })[1].start, '9:10 AM');
  assert.equal(clockAt('23:55', 10), '12:05 AM (+1d)');
  assert.equal(clockAt('', 60), '');
});

test('bulletin excludes notes, ids and leader names by default', () => {
  const program = newProgram('sabbath');
  program.notes = 'private rehearsal note';
  program.sessions[0].items[0].leader = 'Example Leader';
  program.sessions[0].items[0].resource = 'Hymn 17';
  const publicProgram = toPublicProgram(program);
  const text = bulletinText(publicProgram);
  assert.match(text, /Hymn 17/);
  for (const privateValue of [program.id, program.notes, 'Example Leader']) assert.equal(text.includes(privateValue), false);
  assert.match(bulletinText(toPublicProgram(program, true)), /Example Leader/);
});

test('invalid saved data is preserved and invalid changes cannot overwrite it', () => {
  const storage = memoryStorage();
  storage.setItem(storageKey, '{bad json');
  assert.throws(() => readPrograms(storage));
  const program = newProgram('sabbath');
  program.sessions[0].date = '2026-02-31';
  assert.throws(() => savePrograms(storage, [program]));
  assert.equal(storage.getItem(storageKey), '{bad json');
});
