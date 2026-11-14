import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import {
  DEFAULT_SECTIONS, LIMITS, SECTION_TEMPLATES, TOPIC_SETS, TRADITIONS, addDays, lower, copyForNextWeek, dayKey, duplicate,
  needsSomeone, newSeries, newService, nextWeekday, readStore, tidyStore, words as wordsFor, writeStore,
} from './model.mjs';
import { Field, Icon, IconButton, Readiness, Sheet, Toast } from './ui/bits.jsx';
import { Home } from './ui/Home.jsx';
import { ServiceEditor } from './ui/ServiceEditor.jsx';
import { SeriesEditor } from './ui/SeriesEditor.jsx';
import { Preview, saveFile } from './ui/Preview.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function loadStore() {
  try {
    return { store: readStore(window.localStorage), saved: true };
  } catch {
    return { store: tidyStore({}), saved: false };
  }
}

export function App() {
  const [{ store, saved: canSave }, setState] = useState(loadStore);
  const [route, setRoute] = useState({ view: 'home' });
  const [sheet, setSheet] = useState(store.settings.chosen ? null : 'welcome');
  const [toast, setToast] = useState(null);
  const undoRef = useRef(null);
  const w = wordsFor(store.settings);

  const setStore = useCallback(fn => setState(s => ({ ...s, store: fn(s.store) })), []);
  const notify = useCallback((text, undo = null) => { undoRef.current = undo; setToast({ text, undo: Boolean(undo), key: Date.now() }); }, []);

  // Saving is automatic: a moment after the last change, on this device only.
  useEffect(() => {
    if (!canSave) return undefined;
    const t = setTimeout(() => {
      try { writeStore(window.localStorage, store); } catch { notify('This browser is not saving. Download a backup from Settings.'); }
    }, 350);
    return () => clearTimeout(t);
  }, [store, canSave, notify]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.view, route.id]);

  const program = route.id ? store.programs.find(p => p.id === route.id) : null;
  useEffect(() => { if (route.id && !program) setRoute({ view: 'home' }); }, [route.id, program]);

  const put = p => setStore(s => ({ ...s, programs: s.programs.map(x => (x.id === p.id ? { ...p, updated: Date.now() } : x)) }));
  const add = p => {
    if (store.programs.length >= LIMITS.programs) { notify(`Open Scroll keeps up to ${LIMITS.programs} programs. Remove an old one first.`); return; }
    setStore(s => ({ ...s, programs: [p, ...s.programs] }));
    setRoute({ view: 'edit', id: p.id });
  };
  const remove = p => {
    const before = store.programs;
    setStore(s => ({ ...s, programs: s.programs.filter(x => x.id !== p.id) }));
    setRoute({ view: 'home' });
    notify(`“${p.title}” removed.`, () => setStore(s => ({ ...s, programs: before })));
  };
  const setSettings = fields => setStore(s => ({ ...s, settings: { ...s.settings, ...fields } }));

  return (
    <div className="app">
      <header className="topbar">
        {route.view === 'home' ? (
          <span className="brand"><Icon name="book" size={22} /> Open Scroll</span>
        ) : (
          <button type="button" className="back" onClick={() => setRoute({ view: 'home' })}><Icon name="back" size={18} /> All programs</button>
        )}
        <div className="topbar-tools">
          <IconButton icon="help" label="How Open Scroll works" onClick={() => setSheet('help')} />
          <IconButton icon="settings" label="Settings" onClick={() => setSheet('settings')} />
        </div>
      </header>

      {!canSave && <p className="banner">This browser is not keeping changes. Download a backup in Settings before you close the page.</p>}

      <main className="page" key={`${route.view}-${route.id ?? ''}`}>
        {route.view === 'home' && (
          <Home programs={store.programs} words={w} settings={store.settings}
            onNewService={() => setSheet('new-service')} onNewSeries={() => setSheet('new-series')} onOpen={id => setRoute({ view: 'edit', id })} />
        )}
        {program && (
          <>
            <ProgramBar program={program} view={route.view} words={w}
              onView={view => setRoute({ view, id: program.id })}
              onNextWeek={() => { add(copyForNextWeek(program)); notify(`Copied for next ${w.day}. Names were cleared.`); }}
              onDuplicate={() => { add(duplicate(program)); notify('A copy was made.'); }}
              onRemove={() => remove(program)} />
            {route.view === 'edit' && program.kind === 'service' && <ServiceEditor program={program} settings={store.settings} words={w} onChange={put} />}
            {route.view === 'edit' && program.kind === 'series' && <SeriesEditor program={program} words={w} onChange={put} />}
            {route.view === 'preview' && <Preview program={program} words={w} onChange={put} notify={notify} />}
          </>
        )}
      </main>

      <Sheet open={sheet === 'welcome'} onClose={() => { setSettings({ chosen: true }); setSheet(null); }} title="Welcome to Open Scroll">
        <Welcome settings={store.settings} onSave={fields => { setSettings({ ...fields, chosen: true }); setSheet(null); }} />
      </Sheet>
      <Sheet open={sheet === 'new-service'} onClose={() => setSheet(null)} title={`New ${lower(w.program)}`}>
        <NewService settings={store.settings} words={w} onCreate={p => { setSheet(null); add(p); }} />
      </Sheet>
      <Sheet open={sheet === 'new-series'} onClose={() => setSheet(null)} title={`New ${lower(w.series)}`}>
        <NewSeries settings={store.settings} words={w} onCreate={p => { setSheet(null); add(p); }} />
      </Sheet>
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Settings">
        <Settings store={store} setSettings={setSettings} notify={notify}
          onImport={programs => setStore(s => {
            const ids = new Set(s.programs.map(p => p.id));
            return { ...s, programs: [...programs.filter(p => !ids.has(p.id)), ...s.programs].slice(0, LIMITS.programs) };
          })} />
      </Sheet>
      <Sheet open={sheet === 'help'} onClose={() => setSheet(null)} title="How Open Scroll works">
        <Help words={w} />
      </Sheet>

      <Toast toast={toast} onDone={() => setToast(null)} onUndo={() => { undoRef.current?.(); undoRef.current = null; setToast(null); }} />
    </div>
  );
}

function ProgramBar({ program, view, words, onView, onNextWeek, onDuplicate, onRemove }) {
  const [menu, setMenu] = useState(false);
  const r = needsSomeone(program);
  const status = r.total === 0 ? 'No parts yet' : r.missing === 0 ? 'Everyone is in place' : `${r.missing} ${r.missing === 1 ? 'part still needs' : 'parts still need'} someone`;
  return (
    <div className="program-bar">
      <div className="status">
        <Readiness missing={r.missing} total={r.total} size={34} />
        <span>{status}</span>
      </div>
      <div className="segmented big" role="tablist" aria-label="Edit or preview">
        <button type="button" role="tab" aria-selected={view === 'edit'} className={view === 'edit' ? 'on' : ''} onClick={() => onView('edit')}>
          <Icon name="list" size={16} /> Plan
        </button>
        <button type="button" role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => onView('preview')}>
          <Icon name="eye" size={16} /> Preview<span className="wide-only">&nbsp;&amp; share</span>
        </button>
      </div>
      <div className="menu-wrap">
        <IconButton icon="more" label="More actions" onClick={() => setMenu(m => !m)} />
        {menu && (
          <div className="menu" role="menu" onClick={() => setMenu(false)}>
            {program.kind === 'service' && <button type="button" role="menuitem" onClick={onNextWeek}><Icon name="repeat" size={16} /> Copy for next {words.day}</button>}
            <button type="button" role="menuitem" onClick={onDuplicate}><Icon name="copy" size={16} /> Make a copy</button>
            <button type="button" role="menuitem" className="danger" onClick={onRemove}><Icon name="trash" size={16} /> Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TraditionPick({ value, onChange }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Your church">
      {Object.entries(TRADITIONS).map(([key, t]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} className={`choice${value === key ? ' on' : ''}`} onClick={() => onChange(key)}>
          <strong>{t.label}</strong>
          <span>{t.day} · {t.school} · {t.worship} · {t.series}</span>
        </button>
      ))}
    </div>
  );
}

function Welcome({ settings, onSave }) {
  const [tradition, setTradition] = useState(settings.tradition);
  const [church, setChurch] = useState(settings.church);
  return (
    <div className="stack">
      <p>Open Scroll helps you plan the order of service and a series of meetings, then print or share them. Which words should it use?</p>
      <TraditionPick value={tradition} onChange={setTradition} />
      <Field label="Church name (optional)" value={church} onChange={setChurch} placeholder="Shown at the top of each program" />
      <p className="muted small with-icon"><Icon name="lock" size={14} /> Everything stays in this browser. There is no account and nothing is sent anywhere.</p>
      <Button label="Start planning" variant="primary" onClick={() => onSave({ tradition, church })} />
    </div>
  );
}

function NewService({ settings, words, onCreate }) {
  const templates = SECTION_TEMPLATES[settings.tradition] ?? SECTION_TEMPLATES.adventist;
  const [chosen, setChosen] = useState(DEFAULT_SECTIONS[settings.tradition] ?? DEFAULT_SECTIONS.adventist);
  const [date, setDate] = useState(nextWeekday(words.weekday));
  const toggle = key => setChosen(c => (c.includes(key) ? c.filter(k => k !== key) : templates.filter(t => c.includes(t.key) || t.key === key).map(t => t.key)));
  return (
    <div className="stack">
      <Field label="Date" type="date" value={date} onChange={setDate} />
      <fieldset className="pick-list">
        <legend>Which parts of the day?</legend>
        {templates.map(t => (
          <label key={t.key} className={`pick${chosen.includes(t.key) ? ' on' : ''}`}>
            <input type="checkbox" checked={chosen.includes(t.key)} onChange={() => toggle(t.key)} />
            <span className="box" aria-hidden="true"><Icon name="check" size={14} /></span>
            <span><strong>{t.title}</strong><small>{t.blurb}</small></span>
          </label>
        ))}
      </fieldset>
      <p className="muted small">Every part comes with the usual order. You can rename, reorder or remove anything.</p>
      <Button label="Create program" variant="primary" isDisabled={!chosen.length}
        onClick={() => onCreate({ ...newService(settings, chosen), date: date || nextWeekday(words.weekday) })} />
    </div>
  );
}

function NewSeries({ settings, words, onCreate }) {
  const sets = TOPIC_SETS[settings.tradition] ?? TOPIC_SETS.adventist;
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(addDays(dayKey(new Date()), 14));
  const [count, setCount] = useState(sets[0].topics.length);
  // Five nights a week for three weeks is the common shape of a campaign.
  const [weekdays, setWeekdays] = useState(settings.tradition === 'general' ? [0, 1, 2, 3, 4] : [0, 2, 3, 5, 6]);
  const [time, setTime] = useState('19:00');
  const [topicSet, setTopicSet] = useState(sets[0].key);
  const topics = sets.find(s => s.key === topicSet)?.topics ?? [];
  const pickSet = key => { setTopicSet(key); const s = sets.find(x => x.key === key); if (s) setCount(s.topics.length); };
  return (
    <div className="stack">
      <Field label="Name of the series" value={title} onChange={setTitle} placeholder={`e.g. Hope for Today`} />
      <div className="grid two">
        <Field label="First night" type="date" value={start} onChange={setStart} />
        <Field label="Starts at" type="time" value={time} onChange={setTime} />
      </div>
      <fieldset className="day-pick">
        <legend>Meets on</legend>
        <div className="chips">
          {DAYS.map((d, i) => (
            <button key={d} type="button" aria-pressed={weekdays.includes(i)} className={`chip${weekdays.includes(i) ? ' on' : ''}`}
              onClick={() => setWeekdays(w => (w.includes(i) ? w.filter(x => x !== i) : [...w, i].sort()))}>{d}</button>
          ))}
        </div>
      </fieldset>
      <label className="control">
        <span className="control-label">Topics</span>
        <select value={topicSet} onChange={e => pickSet(e.target.value)}>
          {sets.map(s => <option key={s.key} value={s.key}>{s.label} ({s.topics.length})</option>)}
          <option value="">I will write my own</option>
        </select>
      </label>
      <label className="control">
        <span className="control-label">How many nights</span>
        <input type="number" inputMode="numeric" min="1" max={LIMITS.nights} value={count}
          onChange={e => setCount(Math.max(1, Math.min(LIMITS.nights, Math.trunc(Number(e.target.value) || 1))))} />
      </label>
      {topics.length > 0 && (
        <ol className="topic-preview">{topics.slice(0, count).map(t => <li key={t}>{t}</li>)}</ol>
      )}
      <Button label="Create series" variant="primary" isDisabled={!weekdays.length || !start}
        onClick={() => onCreate(newSeries(settings, { title, start, count, weekdays, time, topics }))} />
    </div>
  );
}

function Settings({ store, setSettings, onImport, notify }) {
  const fileRef = useRef(null);
  const backup = () => {
    saveFile(new Blob([JSON.stringify(tidyStore(store), null, 2)], { type: 'application/json' }), `open-scroll-backup-${dayKey(new Date())}.json`);
    notify('Backup saved to your downloads.');
  };
  const restore = async file => {
    if (!file) return;
    if (file.size > 2_000_000) { notify('That file is too large to be an Open Scroll backup.'); return; }
    try {
      const incoming = tidyStore(JSON.parse(await file.text())).programs;
      onImport(incoming);
      notify(incoming.length ? `${incoming.length} ${incoming.length === 1 ? 'program' : 'programs'} brought in.` : 'No programs were found in that file.');
    } catch {
      notify('That file could not be read as an Open Scroll backup.');
    }
    fileRef.current.value = '';
  };
  return (
    <div className="stack">
      <h3>Your church</h3>
      <TraditionPick value={store.settings.tradition} onChange={tradition => setSettings({ tradition })} />
      <Field label="Church name" value={store.settings.church} onChange={church => setSettings({ church })} hint="Used on new programs." />
      <h3>Backup</h3>
      <p className="muted small">Programs live only in this browser. Save a backup to move them to another device or keep them safe.</p>
      <div className="row-actions">
        <Button label="Download backup" icon={<Icon name="download" size={16} />} onClick={backup} />
        <Button label="Bring in a backup" onClick={() => fileRef.current.click()} />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files[0])} />
      </div>
      <h3>About</h3>
      <p className="muted small">Open Scroll is free and open source, released under the MIT License. It works offline, keeps no account and sends nothing anywhere.</p>
    </div>
  );
}

function Help({ words }) {
  return (
    <div className="stack help">
      <ol className="steps">
        <li><strong>Start from a familiar order.</strong> Each new {lower(words.program)} begins with the usual parts of {words.school} and {words.worship}; each new {lower(words.series)} begins with its nights and topics.</li>
        <li><strong>Fill in who and what.</strong> Each part has room for the hymn, passage or title, and for who leads it. The circle at the top counts the parts still waiting for someone.</li>
        <li><strong>Preview and share.</strong> Choose the congregation's copy or the platform copy, pick a look, then print, save a picture, copy the text for a group chat or add the dates to a calendar.</li>
        <li><strong>Next week is one tap.</strong> “Copy for next {words.day}” keeps the order and clears the names.</li>
      </ol>
      <p className="muted small">Changes save by themselves on this device. Use Settings to download a backup.</p>
    </div>
  );
}
