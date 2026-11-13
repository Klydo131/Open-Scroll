import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@astryxdesign/core/Button';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './style.css';
import {
  agenda, bulletinText, clockAt, maxItems, maxPrograms, maxSessions, minutesOf, moveItem,
  newItem, newProgram, newSession, readPrograms, savePrograms, storageKey, toPublicProgram, types,
} from './programs.mjs';

function Glyph({ name, size = 20 }) {
  const icons = {
    book: <><path d="M12 6.5C9 4.5 5.9 4.4 3 5.5v13c2.9-1.1 6-1 9 1 3-2 6.1-2.1 9-1v-13c-2.9-1.1-6-1-9 1Z"/><path d="M12 6.5v13"/></>,
    sun: <><path d="M3 18h18M7 15a5 5 0 0 1 10 0M12 3v3M4.2 7.2l2.1 2.1m13.5-2.1-2.1 2.1M2 13h3m14 0h3"/></>,
    arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
    lock: <><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
}

const templates = [
  { type: 'sabbath', icon: 'book', label: 'Sabbath School', description: 'Plan the lesson discussion and order of service.' },
  { type: 'evangelistic', icon: 'sun', label: 'Evangelistic meeting', description: 'Plan one evening or a series of meetings.' },
];

function Action({ children, primary = false, onClick, disabled = false, className }) {
  return <Button className={className} label={children} variant={primary ? 'primary' : 'secondary'} onClick={onClick} isDisabled={disabled} />;
}

function Field({ label, value, onChange, maxLength, type = 'text', inputRef, error, required }) {
  const id = useId();
  const errorId = id + '-error';
  return <div className="field">
    <label htmlFor={id}>{label}{required && ' (required)'}</label>
    <input id={id} ref={inputRef} type={type} value={value} maxLength={maxLength} required={required}
      aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
      min={type === 'date' ? '0001-01-01' : undefined} max={type === 'date' ? '9999-12-31' : undefined}
      onChange={e => onChange(e.target.value)} />
    {error && <span className="field-error" id={errorId}>{error}</span>}
  </div>;
}

function readLocal() {
  try {
    return { programs: readPrograms(window.localStorage), unavailable: false };
  } catch {
    return { programs: [], unavailable: true };
  }
}

function withProgramLock(change) {
  return navigator.locks ? navigator.locks.request(storageKey, change) : change();
}

function App() {
  const [library, setLibrary] = useState(readLocal);
  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [preview, setPreview] = useState(false);
  const [includeLeaders, setIncludeLeaders] = useState(false);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('all');
  const [titleError, setTitleError] = useState(false);
  const nameField = useRef(null);
  const previewHeading = useRef(null);
  const help = useRef(null);
  const templatesHeading = useRef(null);
  const heading = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const session = draft?.sessions.find(value => value.id === sessionId);

  useEffect(() => {
    const sync = event => {
      if (event.key === storageKey || event.key === null) setLibrary(readLocal());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = true; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { heading.current?.focus(); }, [draft?.id]);
  useEffect(() => {
    if (preview) previewHeading.current?.focus();
    if (!preview && titleError) nameField.current?.focus();
  }, [preview, titleError]);

  function open(program, isNew = false) {
    if (dirty && !window.confirm('Discard the changes to this program?')) return;
    setOriginal(isNew ? null : program);
    setDraft(program);
    setSessionId(program.sessions[0].id);
    setPreview(false);
    setTitleError(false);
    setIncludeLeaders(false);
    setStatus('');
  }

  function goHome() {
    if (dirty && !window.confirm('Discard the changes to this program?')) return;
    setDraft(null);
    setOriginal(null);
    setPreview(false);
    setTitleError(false);
    setStatus('');
  }

  function updateProgram(fields) {
    setDraft(current => ({ ...current, ...fields }));
    setStatus('');
  }

  function updateSession(fields) {
    updateProgram({ sessions: draft.sessions.map(value => value.id === sessionId ? { ...value, ...fields } : value) });
  }

  function updateItem(id, fields) {
    updateSession({ items: session.items.map(item => item.id === id ? { ...item, ...fields } : item) });
  }

  function latestPrograms() {
    let stored;
    try {
      stored = readPrograms(window.localStorage);
    } catch {
      setStatus('Unable to save or delete. Your browser storage could not be read. Your edits are still open.');
      return null;
    }
    const latest = stored.find(program => program.id === draft.id) ?? null;
    if (JSON.stringify(latest) !== JSON.stringify(original)) {
      setStatus('This program changed in another tab. Your edits are still here. Reopen the program for the latest saved version.');
      return null;
    }
    return stored;
  }

  async function save() {
    if (!draft.title.trim()) {
      setTitleError(true);
      setPreview(false);
      nameField.current?.focus();
      setStatus('Enter a program name before saving.');
      return;
    }
    try {
      await withProgramLock(() => {
        const stored = latestPrograms();
        if (!stored) return;
        if (!original && stored.length >= maxPrograms) {
          setStatus('This browser has reached its program limit. Delete a saved program before adding another.');
          return;
        }
        const next = { ...draft, title: draft.title.trim() };
        const programs = [next, ...stored.filter(program => program.id !== draft.id)];
        savePrograms(window.localStorage, programs);
        setOriginal(next);
        setDraft(next);
        setLibrary({ programs, unavailable: false });
        setStatus('Program saved on this device.');
      });
    } catch {
      setStatus('Unable to save this program. Your edits are still open. Check your browser storage or download a bulletin.');
    }
  }

  async function remove() {
    if (!window.confirm('Delete this saved program from this browser?')) return;
    try {
      await withProgramLock(() => {
        const stored = latestPrograms();
        if (!stored) return;
        const programs = stored.filter(program => program.id !== draft.id);
        savePrograms(window.localStorage, programs);
        setLibrary({ programs, unavailable: false });
        setOriginal(null);
        setDraft(null);
        setStatus('Program deleted.');
      });
    } catch {
      setStatus('Unable to delete this program. Check your browser storage and try again.');
    }
  }

  function addSession() {
    const next = newSession(draft.type, draft.sessions.length + 1);
    updateProgram({ sessions: [...draft.sessions, next] });
    setSessionId(next.id);
  }

  function removeSession() {
    if (!window.confirm('Remove this session and its agenda?')) return;
    const sessions = draft.sessions.filter(value => value.id !== sessionId);
    updateProgram({ sessions });
    setSessionId(sessions[0].id);
  }

  const publicProgram = preview && draft && toPublicProgram(draft, includeLeaders);

  function download() {
    const url = URL.createObjectURL(new Blob([bulletinText(publicProgram)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'open-scroll-bulletin.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const saved = library.programs.filter(program => filter === 'all' || program.type === filter);

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="header"><div className="shell header-inner">
      <button className="brand" onClick={goHome}>
        <span className="brand-mark"><Glyph name="book" size={21} /></span><span>Open Scroll</span>
      </button>
      <div className="header-tools"><Action onClick={() => help.current.showModal()}>How to use</Action></div>
    </div></header>
    <main className="shell" id="main" tabIndex={-1}>
      {library.unavailable && <p className="warning" role="alert">Saved programs could not be read. Existing browser data is preserved. You can still plan a program and download its bulletin.</p>}
      {!draft ? <>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-art" aria-hidden="true"></div>
          <div className="hero-copy"><h1 id="page-title" ref={heading} tabIndex={-1}>Plan your next<br /><em>gathering.</em></h1>
          <p>Build the order of service for Sabbath School or plan an evangelistic series one night at a time.</p>
          <a className="hero-action" href="#template-title" onClick={() => templatesHeading.current.focus()}>Choose a template <Glyph name="arrow" size={16} /></a></div>
        </section>
        <section className="templates" aria-labelledby="template-title">
          <h2 id="template-title" ref={templatesHeading} tabIndex={-1}>Choose a program type</h2>
          <div className="template-grid">{templates.map(template => <button key={template.type} className={'template-card ' + template.type} type="button" aria-labelledby={template.type + '-card-title'} aria-describedby={template.type + '-card-description'} onClick={() => open(newProgram(template.type), true)}>
            <span className="template-icon"><Glyph name={template.icon} size={25} /></span>
            <span className="template-copy"><strong id={template.type + '-card-title'}>{template.label}</strong><span id={template.type + '-card-description'}>{template.description}</span></span>
            <span className="template-arrow"><Glyph name="arrow" size={18} /></span>
          </button>)}</div>
        </section>
        <section className="programs" aria-labelledby="program-list">
          <div className="section-head"><h2 id="program-list">Saved programs</h2><div className="filter"><label htmlFor="program-filter">Program type</label><select id="program-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All programs</option><option value="sabbath">Sabbath School</option><option value="evangelistic">Evangelistic meetings</option>
          </select></div></div>
          {saved.length ? <ul className="cards">{saved.map(program => <li key={program.id} className="card">
            <span className={'tag ' + program.type}>{types[program.type]}</span><h3>{program.title}</h3>
            <p>{program.sessions.length} {program.sessions.length === 1 ? 'session' : 'sessions'}{program.sessions[0].date && ' · ' + program.sessions[0].date}</p>
            <Action onClick={() => open(program)}>Open program</Action>
          </li>)}</ul> : <div className="empty empty-library"><Glyph name="folder" size={20} /><span>{filter === 'all' ? 'Your saved programs will appear here.' : 'There are no saved programs of this type.'}</span></div>}
        </section>
      </> : <>
        <div className="back-row no-print"><button className="back-link" type="button" onClick={goHome}><span aria-hidden="true">←</span> All programs</button></div>
        <section className="editor-head no-print">
          <div><span className={'tag ' + draft.type}>{types[draft.type]}</span><h1 ref={heading} tabIndex={-1}>{draft.title.trim() || 'Untitled program'}</h1></div>
          <div className="editor-actions"><div className="actions"><Action onClick={() => setPreview(!preview)}>{preview ? 'Back to editor' : 'Preview bulletin'}</Action><Action primary onClick={save}>Save program</Action></div><span className="save-state">{dirty ? 'Unsaved changes' : 'Saved in this browser'}</span></div>
        </section>
        {!preview && <section className="panel program-basics" aria-label="Program details">
            <Field label="Program name" value={draft.title} maxLength={120} inputRef={nameField} required
              error={titleError ? 'Enter a program name.' : undefined} onChange={title => { setTitleError(false); updateProgram({ title }); }} />
            <Field label="Venue" value={draft.venue} maxLength={160} onChange={venue => updateProgram({ venue })} />
        </section>}
        {preview ? <section className="preview" aria-labelledby="bulletin-title">
          <div className="section-head no-print"><h2 id="bulletin-title" ref={previewHeading} tabIndex={-1}>Bulletin preview</h2><div className="actions"><Action onClick={download}>Download bulletin</Action><Action onClick={() => window.print()}>Print or save PDF</Action></div></div>
          <div className="preview-options no-print"><label className="check"><input type="checkbox" checked={includeLeaders} onChange={e => setIncludeLeaders(e.target.checked)} />Include leader names</label><p>Review the bulletin for personal information before sharing it.</p></div>
          <article className="bulletin"><div className="bulletin-top"><span className="bulletin-icon"><Glyph name="book" size={26} /></span><h2>{publicProgram.title}</h2>{publicProgram.venue && <p>{publicProgram.venue}</p>}</div>
            {publicProgram.sessions.map((value, index) => <section key={draft.sessions[index].id}>
              <h3>{value.title || 'Session'}</h3>
              {(value.date || value.time) && <p>{[value.date, clockAt(value.time, 0)].filter(Boolean).join(' · ')}</p>}
              {value.topic && <p>{value.topic}</p>}
              <ol>{agenda(value).map((item, i) => <li key={draft.sessions[index].items[i].id}><span>{item.start || item.minutes + ' min'}</span><div><strong>{item.title || 'Untitled item'}</strong>{(item.leader || item.resource) && <small>{[item.leader, item.resource].filter(Boolean).join(' · ')}</small>}</div></li>)}</ol>
            </section>)}
          </article>
        </section> : <div className="workbench">
          <section className="panel agenda" aria-labelledby="agenda"><div className="section-head"><h2 id="agenda">Agenda</h2><Action disabled={draft.sessions.length >= maxSessions} onClick={addSession}>{draft.type === 'evangelistic' ? 'Add night' : 'Add session'}</Action></div>
            <div className="field session-picker" hidden={draft.sessions.length === 1}><label htmlFor="session-picker">{draft.type === 'evangelistic' ? 'Night to edit' : 'Session to edit'}</label><select id="session-picker" value={sessionId} onChange={e => setSessionId(e.target.value)}>{draft.sessions.map((value, index) => <option key={value.id} value={value.id}>{value.title || 'Session ' + (index + 1)}</option>)}</select></div>
            <div className="session-fields">
              <Field label={draft.type === 'evangelistic' ? 'Night name' : 'Session name'} value={session.title} maxLength={100} onChange={title => updateSession({ title })} />
              <Field label="Date" type="date" value={session.date} onChange={date => updateSession({ date })} />
              <Field label="Start time" type="time" value={session.time} onChange={time => updateSession({ time })} />
              <Field label="Topic" value={session.topic} maxLength={160} onChange={topic => updateSession({ topic })} />
            </div>
            <div className="section-head agenda-head"><h3>Order of service</h3><span className="time-total">{minutesOf(session)} min total</span></div>
            <p className="agenda-note">Enter the activities in order. Start times update as you change the minutes.</p>
            {session.items.length === 0 && <p className="empty">Add the first agenda item.</p>}
            <ol className="agenda-items">{agenda(session).map((item, index) => <li className="agenda-item" key={item.id}>
              <div className="section-head item-head"><strong>{item.start || 'Item ' + (index + 1)}</strong><div className="row-tools">
                <button type="button" disabled={index === 0} aria-label={`Move item ${index + 1} up`} onClick={() => updateSession({ items: moveItem(session.items, index, -1) })}>↑</button>
                <button type="button" disabled={index === session.items.length - 1} aria-label={`Move item ${index + 1} down`} onClick={() => updateSession({ items: moveItem(session.items, index, 1) })}>↓</button>
                <button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => { if (window.confirm("Remove this agenda item?")) updateSession({ items: session.items.filter(value => value.id !== item.id) }); }}>×</button>
              </div></div>
              <div className="item-fields">
                <Field label="Activity" value={item.title} maxLength={120} onChange={title => updateItem(item.id, { title })} />
                <div className="field"><label htmlFor={'minutes-' + item.id}>Minutes</label><input id={'minutes-' + item.id} type="number" inputMode="numeric" min="0" max="360" value={item.minutes} onChange={e => updateItem(item.id, { minutes: Math.max(0, Math.min(360, Math.trunc(Number(e.target.value) || 0))) })} /></div>
                <details className="item-extra"><summary>{item.leader || item.resource ? 'Leader or resource added' : 'Add leader or resource'}</summary><div className="item-fields">
                <Field label="Leader" value={item.leader} maxLength={100} onChange={leader => updateItem(item.id, { leader })} />
                <Field label="Hymn, passage or resource" value={item.resource} maxLength={120} onChange={resource => updateItem(item.id, { resource })} />
                </div></details>
              </div>
            </li>)}</ol>
            <div className="actions"><Action disabled={session.items.length >= maxItems} onClick={() => updateSession({ items: [...session.items, newItem()] })}>Add agenda item</Action>
              {draft.sessions.length > 1 && <Action onClick={removeSession}>Remove session</Action>}</div>
          </section>
          <section className="panel details" aria-labelledby="details"><h2 id="details">Planning notes</h2>
            <details className="private-notes"><summary>Private notes</summary><div className="field"><label htmlFor="planning-notes">Private planning notes</label><textarea id="planning-notes" rows="4" maxLength={2000} value={draft.notes} onChange={e => updateProgram({ notes: e.target.value })} /><small>These notes stay out of the bulletin.</small></div></details>
            {original && <Action onClick={remove}>Delete program</Action>}
          </section>
        </div>}
      </>}
      <div className="status no-print" role="status" aria-live="polite">{status}</div>
      <dialog ref={help} aria-labelledby="help-title"><div className="dialog-inner">
        <div className="section-head"><h2 id="help-title">How to use Open Scroll</h2><form method="dialog"><button type="submit" className="close" aria-label="Close">×</button></form></div>
        <ol className="help-steps">
          <li><strong>Choose your program type.</strong><p>Sabbath School starts with an order of service. Choose Evangelistic meeting for one evening or use <b>Add night</b> to plan a series.</p></li>
          <li><strong>Fill in the agenda.</strong><p>Set a date and start time, then edit the sample activities. Enter the minutes for each activity. Use the arrows to change the order.</p></li>
          <li><strong>Save your work.</strong><p>Use <b>Save program</b> to keep it in this browser. Find it again under <b>Saved programs</b>.</p></li>
          <li><strong>Share the bulletin.</strong><p>Open <b>Preview bulletin</b>, then download it or print it as a PDF. Private notes stay out. You can choose whether to include leader names.</p></li>
        </ol>
      </div></dialog>
    </main>
    <footer className="shell footer"><Glyph name="lock" size={15} /> Programs are saved in this browser.</footer>
  </>;
}

createRoot(document.getElementById('root')).render(<Theme theme={neutralTheme}><App /></Theme>);
