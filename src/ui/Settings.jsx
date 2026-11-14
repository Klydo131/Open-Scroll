import React, { useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { LIMITS, OWN_WORDS, TRADITIONS, dayKey, tidyStore } from '../model.mjs';
import { version } from '../../package.json';
import { Field, Icon, IconButton } from './bits.jsx';
import { ModePick, TraditionPick } from './Sheets.jsx';
import { PAPER } from '../export.mjs';
import { ACCENTS, STYLES, saveFile } from './Preview.jsx';

const WORD_LABELS = {
  program: 'A program for the day',
  school: 'The Bible school hour',
  worship: 'The main worship service',
  series: 'A series of meetings',
  night: 'One meeting in a series',
};

function Group({ id, title, intro, children }) {
  return (
    <section className="card settings-group rise" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {intro && <p className="muted small">{intro}</p>}
      <div className="stack">{children}</div>
    </section>
  );
}

/**
 * Settings, in the order a church sets itself up: who you are, how much to
 * show, how programs look, then (in Advanced) the templates, topics and words
 * that make the app your church's own, and last, your data.
 */
export function Settings({ store, setStore, setSettings, notify }) {
  const { settings } = store;
  const advanced = settings.mode === 'advanced';
  const base = TRADITIONS[settings.tradition];
  const look = { style: 'classic', accent: ACCENTS[0], ...settings.look };

  return (
    <div className="settings">
      <header className="settings-head rise">
        <h1>Settings</h1>
        <p className="muted">Changes save as you make them.</p>
      </header>

      <Group id="s-church" title="Your church" intro="Used for every new program. Programs you already made keep what they have.">
        <TraditionPick value={settings.tradition} onChange={tradition => setSettings({ tradition, lastSections: [] })} />
        <div className="grid two">
          <Field label="Church name" value={settings.church} onChange={church => setSettings({ church })} placeholder="Shown at the top of each program" />
          <Field label="Usual place" value={settings.venue} onChange={venue => setSettings({ venue })} placeholder="e.g. Main sanctuary" />
        </div>
      </Group>

      <Group id="s-mode" title="How much to show"
        intro="Switching never deletes anything. Details added in Advanced stay saved while hidden, and come back when you switch again.">
        <ModePick value={settings.mode} onChange={mode => setSettings({ mode })} />
      </Group>

      <Group id="s-look" title="Look and paper" intro="The look is for new programs; each program can still change its own in Preview. Paper size is used for PDF and Word files.">
        <div className="segmented" role="radiogroup" aria-label="Look">
          {STYLES.map(s => (
            <button key={s.key} type="button" role="radio" aria-checked={look.style === s.key} className={look.style === s.key ? 'on' : ''}
              onClick={() => setSettings({ look: { ...settings.look, style: s.key } })}>{s.label}</button>
          ))}
        </div>
        <div className="swatches" role="radiogroup" aria-label="Colour">
          {ACCENTS.map(c => (
            <button key={c.value} type="button" role="radio" aria-checked={look.accent === c.value} aria-label={c.name} title={c.name}
              className={look.accent === c.value ? 'on' : ''} style={{ '--sw': c.value }} onClick={() => setSettings({ look: { ...settings.look, accent: c.value } })} />
          ))}
        </div>
        <div className="segmented" role="radiogroup" aria-label="Paper size">
          {Object.entries(PAPER).map(([key, p]) => (
            <button key={key} type="button" role="radio" aria-checked={settings.paper === key} className={settings.paper === key ? 'on' : ''}
              onClick={() => setSettings({ paper: key })}>{p.label}</button>
          ))}
        </div>
      </Group>

      {advanced ? (
        <>
          <Group id="s-templates" title="Your templates"
            intro="Save any part of the day as a template from the bookmark button beside its name. Saved templates appear when you start a new program. They keep the order and minutes, never the names of people.">
            <OwnTemplates store={store} setStore={setStore} notify={notify} />
          </Group>
          <Group id="s-topics" title="Your topic lists" intro="Topic lists you can choose when you start a series. One topic per line.">
            <OwnTopics store={store} setStore={setStore} notify={notify} />
          </Group>
          <Group id="s-words" title="Your words" intro="Call things what your church calls them. Leave a box empty to use the usual word.">
            <div className="grid two">
              {OWN_WORDS.map(key => (
                <Field key={key} label={WORD_LABELS[key]} value={settings.words[key]} maxLength={40} placeholder={base[key]}
                  onChange={v => setSettings({ words: { ...settings.words, [key]: v } })} />
              ))}
            </div>
          </Group>
        </>
      ) : (
        <section className="card settings-group locked rise">
          <h2 className="with-icon"><Icon name="settings" size={18} /> Make it your church's own</h2>
          <p className="muted small">In Advanced you can save your own templates, keep your own topic lists, plan a whole quarter at once and rename the words Open Scroll uses.
            {store.templates.length + store.topicSets.length > 0 && ` Your ${store.templates.length + store.topicSets.length === 1 ? 'saved template or topic list is' : 'saved templates and topic lists are'} kept while Simple is on.`}</p>
          <div><Button label="Switch to Advanced" onClick={() => setSettings({ mode: 'advanced' })} /></div>
        </section>
      )}

      <Group id="s-data" title="Your data" intro="Open Scroll keeps everything in this browser only. There is no account, and nothing is ever sent anywhere.">
        <DataTools store={store} setStore={setStore} notify={notify} />
      </Group>

      <Group id="s-about" title="About">
        <p className="small">Open Scroll {version}. Free and open source under the MIT License.</p>
        <p className="small"><a href="https://github.com/Klydo131/Open-Scroll" rel="noopener noreferrer" target="_blank">Source code, questions and suggestions</a></p>
      </Group>
    </div>
  );
}

function OwnTemplates({ store, setStore, notify }) {
  const set = (id, fields) => setStore(s => ({ ...s, templates: s.templates.map(t => (t.id === id ? { ...t, ...fields } : t)) }));
  const remove = t => {
    const before = store.templates;
    setStore(s => ({ ...s, templates: s.templates.filter(x => x.id !== t.id) }));
    notify(`“${t.title}” removed.`, () => setStore(s => ({ ...s, templates: before })));
  };
  if (!store.templates.length) return <p className="empty-note">No templates yet.</p>;
  return (
    <ul className="own-list">
      {store.templates.map(t => (
        <li key={t.id}>
          <input aria-label="Template name" value={t.title} maxLength={80} onChange={e => set(t.id, { title: e.target.value })} />
          <span className="muted small">{t.parts.length} parts{t.time ? ` · ${t.time}` : ''}</span>
          <IconButton icon="trash" label={`Remove ${t.title}`} tone="danger" onClick={() => remove(t)} />
        </li>
      ))}
    </ul>
  );
}

function OwnTopics({ store, setStore, notify }) {
  const set = (id, fields) => setStore(s => ({ ...s, topicSets: s.topicSets.map(t => (t.id === id ? { ...t, ...fields } : t)) }));
  const remove = t => {
    const before = store.topicSets;
    setStore(s => ({ ...s, topicSets: s.topicSets.filter(x => x.id !== t.id) }));
    notify(`“${t.label}” removed.`, () => setStore(s => ({ ...s, topicSets: before })));
  };
  const add = () => setStore(s => ({ ...s, topicSets: [...s.topicSets, { id: crypto.randomUUID(), label: 'My topics', topics: [''] }] }));
  return (
    <>
      {store.topicSets.map(t => (
        <div key={t.id} className="topic-set">
          <div className="detail-row">
            <input aria-label="List name" value={t.label} maxLength={80} onChange={e => set(t.id, { label: e.target.value })} />
            <span className="muted small">{t.topics.filter(Boolean).length} topics</span>
            <IconButton icon="trash" label={`Remove ${t.label}`} tone="danger" onClick={() => remove(t)} />
          </div>
          <Field label="Topics, one per line" multiline rows={5} maxLength={LIMITS.nights * 80}
            value={t.topics.join('\n')} onChange={v => set(t.id, { topics: v.split('\n').slice(0, LIMITS.nights).map(x => x.slice(0, LIMITS.text)) })} />
        </div>
      ))}
      <button type="button" className="add-btn" disabled={store.topicSets.length >= LIMITS.topicSets} onClick={add}>
        <Icon name="plus" size={16} /> New topic list
      </button>
    </>
  );
}

function DataTools({ store, setStore, notify }) {
  const fileRef = useRef(null);
  const [erasing, setErasing] = useState(false);
  const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  const counts = `${n(store.programs.length, 'program', 'programs')}, ${n(store.templates.length, 'template', 'templates')}, ${n(store.topicSets.length, 'topic list', 'topic lists')}`;
  const backup = () => {
    saveFile(new Blob([JSON.stringify({ app: 'open-scroll', version: 2, ...tidyStore(store) }, null, 2)], { type: 'application/json' }), `open-scroll-backup-${dayKey(new Date())}.json`);
    notify('Backup saved to your downloads.');
  };
  const restore = async file => {
    if (!file) return;
    try {
      if (file.size > 3_000_000) throw new Error('too large');
      const raw = JSON.parse(await file.text());
      const incoming = tidyStore(raw);
      setStore(s => {
        // On a device with nothing saved yet (a new phone, or after erasing), the backup's settings come too.
        const empty = !s.programs.length && !s.templates.length && !s.topicSets.length;
        const settings = empty && raw.settings ? { ...incoming.settings, chosen: true } : s.settings;
        const merge = (key, max) => {
          const ids = new Set(s[key].map(x => x.id));
          return [...s[key], ...incoming[key].filter(x => !ids.has(x.id))].slice(0, max);
        };
        return { ...s, settings, programs: merge('programs', LIMITS.programs), templates: merge('templates', LIMITS.templates), topicSets: merge('topicSets', LIMITS.topicSets) };
      });
      const n = incoming.programs.length + incoming.templates.length + incoming.topicSets.length;
      notify(n ? 'Backup brought in. Anything you already had was kept as it was.' : 'Nothing to bring in was found in that file.');
    } catch {
      notify('That file could not be read as an Open Scroll backup.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const erase = () => {
    const before = store;
    setStore(() => ({ ...tidyStore({}), settings: { ...tidyStore({}).settings, chosen: true } }));
    setErasing(false);
    notify('Everything on this device was erased.', () => setStore(() => before));
  };
  return (
    <>
      <p className="small">On this device: {counts}.</p>
      <div className="row-actions">
        <Button label="Download backup" icon={<Icon name="download" size={16} />} onClick={backup} />
        <Button label="Bring in a backup" icon={<Icon name="upload" size={16} />} onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files[0])} />
      </div>
      <p className="muted small">A backup holds your programs, templates, topic lists and settings. Bringing one in adds what is missing and never overwrites what you have. On a device with nothing saved yet, it brings your settings too.</p>
      {!erasing ? (
        <div><button type="button" className="text-btn danger" onClick={() => setErasing(true)}><Icon name="trash" size={16} /> Erase everything on this device…</button></div>
      ) : (
        <div className="confirm" role="alert">
          <p><strong>Erase {counts} and your settings?</strong> Download a backup first if you may want them again. You can undo for a few seconds afterwards.</p>
          <div className="row-actions">
            <Button label="Yes, erase everything" variant="destructive" onClick={erase} />
            <Button label="Keep everything" variant="ghost" onClick={() => setErasing(false)} />
          </div>
        </div>
      )}
    </>
  );
}
