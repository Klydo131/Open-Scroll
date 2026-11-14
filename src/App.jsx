import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LIMITS, copyForNextWeek, duplicate, isAdvanced, lower, needsSomeone, readStore, templateFromSection, tidyStore,
  words as wordsFor, writeStore,
} from './model.mjs';
import { Icon, IconButton, Readiness, Sheet, Toast } from './ui/bits.jsx';
import { Home } from './ui/Home.jsx';
import { ServiceEditor } from './ui/ServiceEditor.jsx';
import { SeriesEditor } from './ui/SeriesEditor.jsx';
import { Preview } from './ui/Preview.jsx';
import { Settings } from './ui/Settings.jsx';
import logo from './assets/logo.svg';
import { Help, NewSeries, NewService, Welcome } from './ui/Sheets.jsx';

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
  const advanced = isAdvanced(store.settings);

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
  const addMany = (list, open = true) => {
    const room = LIMITS.programs - store.programs.length;
    if (room < list.length) { notify(`Open Scroll keeps up to ${LIMITS.programs} programs. Remove some old ones first.`); return false; }
    setStore(s => ({ ...s, programs: [...list, ...s.programs] }));
    if (open) setRoute({ view: 'edit', id: list[0].id });
    return true;
  };
  const add = p => addMany([p]);
  const remove = p => {
    const before = store.programs;
    setStore(s => ({ ...s, programs: s.programs.filter(x => x.id !== p.id) }));
    setRoute({ view: 'home' });
    notify(`“${p.title}” removed.`, () => setStore(s => ({ ...s, programs: before })));
  };
  const setSettings = fields => setStore(s => ({ ...s, settings: { ...s.settings, ...fields } }));
  const saveTemplate = section => {
    if (store.templates.length >= LIMITS.templates) { notify(`You can keep up to ${LIMITS.templates} templates. Remove one in Settings first.`); return; }
    const t = templateFromSection(section);
    if (!t.parts.length) { notify('Add at least one part before saving it as a template.'); return; }
    setStore(s => ({ ...s, templates: [...s.templates, t] }));
    notify(`“${t.title}” saved to your templates.`, () => setStore(s => ({ ...s, templates: s.templates.filter(x => x.id !== t.id) })));
  };
  const saveTopics = (label, topics) => {
    if (store.topicSets.length >= LIMITS.topicSets) { notify(`You can keep up to ${LIMITS.topicSets} topic lists.`); return; }
    const set = { id: crypto.randomUUID(), label, topics: topics.filter(Boolean) };
    if (!set.topics.length) { notify('Give the nights topics first.'); return; }
    setStore(s => ({ ...s, topicSets: [...s.topicSets, set] }));
    notify(`“${label}” saved to your topic lists.`);
  };

  const home = () => setRoute({ view: 'home' });

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        {route.view === 'home' ? (
          <span className="brand"><img src={logo} alt="" width="28" height="28" /> Open Scroll</span>
        ) : (
          <button type="button" className="back" onClick={home}><Icon name="back" size={18} /> All programs</button>
        )}
        <div className="topbar-tools">
          <span className={`mode-badge ${advanced ? 'adv' : ''}`} title="Change this in Settings">{advanced ? 'Advanced' : 'Simple'}</span>
          <IconButton icon="help" label="How Open Scroll works" onClick={() => setSheet('help')} />
          <IconButton icon="settings" label="Settings" onClick={() => setRoute({ view: 'settings' })} />
        </div>
      </header>

      {!canSave && <p className="banner">This browser is not keeping changes. Download a backup in Settings before you close the page.</p>}

      <main id="main" className="page" key={`${route.view}-${route.id ?? ''}`}>
        {route.view === 'home' && (
          <Home programs={store.programs} words={w} settings={store.settings}
            onNewService={() => setSheet('new-service')} onNewSeries={() => setSheet('new-series')} onOpen={id => setRoute({ view: 'edit', id })} />
        )}
        {route.view === 'settings' && (
          <Settings store={store} setStore={setStore} setSettings={setSettings} notify={notify} words={w} />
        )}
        {program && (
          <>
            <ProgramBar program={program} view={route.view} words={w}
              onView={view => setRoute({ view, id: program.id })}
              onNextWeek={() => { if (add(copyForNextWeek(program))) notify(`Copied for next ${w.day}. Names were cleared.`); }}
              onDuplicate={() => { if (add(duplicate(program))) notify('A copy was made.'); }}
              onRemove={() => remove(program)} />
            {route.view === 'edit' && program.kind === 'service' && (
              <ServiceEditor program={program} settings={store.settings} templates={store.templates} words={w} advanced={advanced}
                onChange={put} onSaveTemplate={saveTemplate} />
            )}
            {route.view === 'edit' && program.kind === 'series' && (
              <SeriesEditor program={program} words={w} advanced={advanced} onChange={put} onSaveTopics={saveTopics} />
            )}
            {route.view === 'preview' && <Preview program={program} words={w} advanced={advanced} paper={store.settings.paper} onChange={put} notify={notify} />}
          </>
        )}
      </main>

      <Sheet open={sheet === 'welcome'} onClose={() => { setSettings({ chosen: true }); setSheet(null); }} title="Welcome to Open Scroll">
        <Welcome settings={store.settings} onSave={fields => { setSettings({ ...fields, chosen: true }); setSheet(null); }} />
      </Sheet>
      <Sheet open={sheet === 'new-service'} onClose={() => setSheet(null)} title={`New ${lower(w.program)}`}>
        <NewService settings={store.settings} templates={store.templates} words={w} advanced={advanced}
          onCreate={(list, keys) => {
            setSettings({ lastSections: keys });
            setSheet(null);
            if (addMany(list) && list.length > 1) notify(`${list.length} weeks planned. Each one is in your list.`);
          }} />
      </Sheet>
      <Sheet open={sheet === 'new-series'} onClose={() => setSheet(null)} title={`New ${lower(w.series)}`}>
        <NewSeries settings={store.settings} topicSets={store.topicSets} words={w} onCreate={p => { setSheet(null); add(p); }} />
      </Sheet>
      <Sheet open={sheet === 'help'} onClose={() => setSheet(null)} title="How Open Scroll works">
        <Help words={w} advanced={advanced} />
      </Sheet>

      <Toast toast={toast} onDone={() => setToast(null)} onUndo={() => { undoRef.current?.(); undoRef.current = null; setToast(null); }} />
    </div>
  );
}

function ProgramBar({ program, view, words, onView, onNextWeek, onDuplicate, onRemove }) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = e => { if (e.type === 'keydown' ? e.key === 'Escape' : !wrap.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [menu]);
  const r = needsSomeone(program);
  const status = r.total === 0 ? 'No parts yet' : r.missing === 0 ? 'Everyone is in place' : `${r.missing} ${r.missing === 1 ? 'part still needs' : 'parts still need'} someone`;
  return (
    <div className="program-bar">
      <div className="status">
        <Readiness missing={r.missing} total={r.total} size={34} />
        <span>{status}</span>
      </div>
      <div className="segmented big" role="tablist" aria-label="Plan or preview">
        <button type="button" role="tab" aria-selected={view === 'edit'} className={view === 'edit' ? 'on' : ''} onClick={() => onView('edit')}>
          <Icon name="list" size={16} /> Plan
        </button>
        <button type="button" role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => onView('preview')}>
          <Icon name="eye" size={16} /> Preview<span className="wide-only">&amp; share</span>
        </button>
      </div>
      <div className="menu-wrap" ref={wrap}>
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
