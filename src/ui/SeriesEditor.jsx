import React, { useState } from 'react';
import { LIMITS, TEAM_ROLES, addDays, dateLabel, clockAt, newNight, needsSomeone } from '../model.mjs';
import { Field, Icon, IconButton, Readiness } from './bits.jsx';
import { LineList } from './LineList.jsx';
import { Extras } from './ServiceEditor.jsx';

const TABS = [
  { key: 'nights', label: 'Nights', icon: 'calendar' },
  { key: 'team', label: 'Team', icon: 'people' },
  { key: 'prep', label: 'Preparation', icon: 'check' },
  { key: 'more', label: 'Notes', icon: 'list' },
];

/** A series of meetings: the nights, the people serving and the work before night one. */
export function SeriesEditor({ program, words, onChange }) {
  const [tab, setTab] = useState('nights');
  const [openNight, setOpenNight] = useState(null);
  const set = fields => onChange({ ...program, ...fields });
  const setNight = (id, fields) => set({ nights: program.nights.map(n => (n.id === id ? { ...n, ...fields } : n)) });
  const done = program.checklist.filter(c => c.done).length;

  const addNight = () => {
    const last = program.nights.at(-1);
    const night = newNight(last?.date ? addDays(last.date, 1) : program.date, last?.time || '19:00');
    set({ nights: [...program.nights, night] });
    setOpenNight(night.id);
  };

  return (
    <div className="editor">
      <section className="card head-card rise">
        <input className="title-input" aria-label="Series title" value={program.title} maxLength={LIMITS.text}
          onChange={e => set({ title: e.target.value })} placeholder={words.series} />
        <div className="grid two">
          <Field label="Theme" value={program.theme} maxLength={200} onChange={v => set({ theme: v })} placeholder="e.g. Hope for today" />
          <Field label="Place" value={program.venue} onChange={v => set({ venue: v })} placeholder="Hall, church or address" />
          <Field label="Church" value={program.church} onChange={v => set({ church: v })} />
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Series sections">
        {TABS.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={16} /> {t.label}
            {t.key === 'nights' && <span className="count">{program.nights.length}</span>}
            {t.key === 'prep' && <span className="count">{done}/{program.checklist.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'nights' && (
        <div className="night-list" key="nights">
          {program.nights.map((n, i) => {
            const open = openNight === n.id;
            const r = needsSomeone({ kind: 'series', nights: [n] });
            return (
              <section key={n.id} className={`card night rise${open ? ' open' : ''}`} style={{ '--i': Math.min(i, 10) }}>
                <button type="button" className="night-summary" aria-expanded={open} onClick={() => setOpenNight(open ? null : n.id)}>
                  <span className="night-no">{i + 1}</span>
                  <span className="night-text">
                    <strong>{n.topic || 'Topic to be chosen'}</strong>
                    <span>{[dateLabel(n.date), clockAt(n.time), n.speaker].filter(Boolean).join(' · ') || 'Set a date'}</span>
                  </span>
                  <Readiness missing={r.missing} total={r.total} size={30} />
                  <Icon name={open ? 'up' : 'down'} size={18} />
                </button>
                {open && (
                  <div className="night-body">
                    <div className="grid two">
                      <Field label="Topic" value={n.topic} onChange={v => setNight(n.id, { topic: v })} />
                      <Field label="Speaker" value={n.speaker} onChange={v => setNight(n.id, { speaker: v })} />
                      <Field label="Date" type="date" value={n.date} onChange={v => setNight(n.id, { date: v })} />
                      <Field label="Starts" type="time" value={n.time} onChange={v => setNight(n.id, { time: v })} />
                      <Field label="Key scripture" value={n.scripture} onChange={v => setNight(n.id, { scripture: v })} placeholder="e.g. John 14:1-3" className="span" />
                    </div>
                    <LineList lines={n.lines} time={n.time} onChange={lines => setNight(n.id, { lines })} label={`${words.night} ${i + 1} order`} />
                    <div className="night-foot">
                      <button type="button" className="text-btn danger" disabled={program.nights.length === 1}
                        onClick={() => { set({ nights: program.nights.filter(x => x.id !== n.id) }); setOpenNight(null); }}>
                        <Icon name="trash" size={16} /> Remove this night
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
          <button type="button" className="add-section" disabled={program.nights.length >= LIMITS.nights} onClick={addNight}>
            <Icon name="plus" size={18} /> Add a night
          </button>
        </div>
      )}

      {tab === 'team' && (
        <section className="card rise" key="team">
          <h3>Who serves</h3>
          <p className="muted small">The roles behind every night. Leave a name empty until someone says yes.</p>
          {program.team.map(t => (
            <div className="detail-row" key={t.id}>
              <input aria-label="Role" value={t.role} maxLength={60} list="roles"
                onChange={e => set({ team: program.team.map(x => (x.id === t.id ? { ...x, role: e.target.value } : x)) })} />
              <input aria-label={`${t.role || 'Role'}: who`} placeholder="Name" value={t.who} maxLength={LIMITS.text}
                onChange={e => set({ team: program.team.map(x => (x.id === t.id ? { ...x, who: e.target.value } : x)) })} />
              <IconButton icon="trash" label={`Remove ${t.role || 'role'}`} tone="danger" onClick={() => set({ team: program.team.filter(x => x.id !== t.id) })} />
            </div>
          ))}
          <datalist id="roles">{TEAM_ROLES.map(r => <option key={r} value={r} />)}</datalist>
          <button type="button" className="add-btn" disabled={program.team.length >= LIMITS.team}
            onClick={() => set({ team: [...program.team, { id: crypto.randomUUID(), role: '', who: '' }] })}>
            <Icon name="plus" size={16} /> Add a role
          </button>
        </section>
      )}

      {tab === 'prep' && (
        <section className="card rise" key="prep">
          <h3>Before night one</h3>
          <div className="progress" aria-hidden="true"><span style={{ transform: `scaleX(${program.checklist.length ? done / program.checklist.length : 0})` }} /></div>
          <ul className="checklist">
            {program.checklist.map(c => (
              <li key={c.id} className={c.done ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={c.done}
                    onChange={e => set({ checklist: program.checklist.map(x => (x.id === c.id ? { ...x, done: e.target.checked } : x)) })} />
                  <span className="box" aria-hidden="true"><Icon name="check" size={14} /></span>
                </label>
                <input className="check-text" aria-label="Task" value={c.text} maxLength={200}
                  onChange={e => set({ checklist: program.checklist.map(x => (x.id === c.id ? { ...x, text: e.target.value } : x)) })} />
                <IconButton icon="trash" label="Remove this task" tone="danger" onClick={() => set({ checklist: program.checklist.filter(x => x.id !== c.id) })} />
              </li>
            ))}
          </ul>
          <button type="button" className="add-btn" disabled={program.checklist.length >= LIMITS.checklist}
            onClick={() => set({ checklist: [...program.checklist, { id: crypto.randomUUID(), text: '', done: false }] })}>
            <Icon name="plus" size={16} /> Add a task
          </button>
        </section>
      )}

      {tab === 'more' && <Extras program={program} set={set} />}
    </div>
  );
}
