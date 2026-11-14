import React, { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { LIMITS, SECTION_TEMPLATES, newLine, sectionFromTemplate } from '../model.mjs';
import { Field, Icon, IconButton } from './bits.jsx';
import { LineList } from './LineList.jsx';

/** One program for one day: the details on top, then each part of the day. */
export function ServiceEditor({ program, settings, words, onChange }) {
  const [adding, setAdding] = useState(false);
  const set = fields => onChange({ ...program, ...fields });
  const setSection = (id, fields) => set({ sections: program.sections.map(s => (s.id === id ? { ...s, ...fields } : s)) });
  const templates = SECTION_TEMPLATES[settings.tradition] ?? SECTION_TEMPLATES.adventist;
  const addSection = template => {
    const section = template ? sectionFromTemplate(template) : { id: crypto.randomUUID(), title: 'New part of the day', time: '', lines: [newLine('Opening prayer', 2)] };
    set({ sections: [...program.sections, section] });
    setAdding(false);
  };
  const removeSection = id => set({ sections: program.sections.filter(s => s.id !== id) });
  const moveSection = (index, dir) => {
    const next = [...program.sections];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    set({ sections: next });
  };

  return (
    <div className="editor">
      <section className="card head-card rise">
        <input className="title-input" aria-label="Program title" value={program.title} maxLength={LIMITS.text}
          onChange={e => set({ title: e.target.value })} placeholder={words.program} />
        <div className="grid two">
          <Field label="Date" type="date" value={program.date} onChange={v => set({ date: v })} />
          <Field label="Church" value={program.church} onChange={v => set({ church: v })} placeholder="Your church's name" />
          <Field label="Theme or sermon series" value={program.theme} maxLength={200} onChange={v => set({ theme: v })} placeholder="Optional" />
          <Field label="Place" value={program.venue} onChange={v => set({ venue: v })} placeholder="Optional" />
        </div>
      </section>

      {program.sections.map((s, index) => (
        <section key={s.id} className="card section-card rise" style={{ '--i': index + 1 }}>
          <div className="section-head">
            <input className="section-title" aria-label="Name of this part of the day" value={s.title} maxLength={80}
              onChange={e => setSection(s.id, { title: e.target.value })} />
            <label className="time-pick">
              <span className="sr-only">Starts at</span>
              <input type="time" value={s.time} onChange={e => setSection(s.id, { time: e.target.value })} />
            </label>
            <div className="section-tools">
              <IconButton icon="up" label="Move this part earlier" disabled={index === 0} onClick={() => moveSection(index, -1)} />
              <IconButton icon="down" label="Move this part later" disabled={index === program.sections.length - 1} onClick={() => moveSection(index, 1)} />
              <IconButton icon="trash" label={`Remove ${s.title}`} tone="danger" disabled={program.sections.length === 1} onClick={() => removeSection(s.id)} />
            </div>
          </div>
          <LineList lines={s.lines} time={s.time} onChange={lines => setSection(s.id, { lines })} label="Order of service" />
        </section>
      ))}

      <section className="card add-card">
        {!adding ? (
          <button type="button" className="add-section" disabled={program.sections.length >= LIMITS.sections} onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Add another part of the day
          </button>
        ) : (
          <div className="template-pick">
            <p className="muted">Start from a familiar order, then change anything.</p>
            <div className="template-grid">
              {templates.map(t => (
                <button key={t.key} type="button" className="template" onClick={() => addSection(t)}>
                  <strong>{t.title}</strong><span>{t.blurb}</span>
                </button>
              ))}
              <button type="button" className="template blank" onClick={() => addSection(null)}>
                <strong>Blank</strong><span>Name it and add your own parts.</span>
              </button>
            </div>
            <Button label="Cancel" variant="ghost" onClick={() => setAdding(false)} />
          </div>
        )}
      </section>

      <Extras program={program} set={set} />
    </div>
  );
}

/** Announcements, labelled extras (offering for, lesson title…) and private notes. */
export function Extras({ program, set }) {
  const setDetail = (id, fields) => set({ details: program.details.map(d => (d.id === id ? { ...d, ...fields } : d)) });
  return (
    <section className="card rise extras">
      <h3>Announcements</h3>
      <Field label="One per line; they print under the program" multiline rows={4} maxLength={LIMITS.long}
        value={program.announcements} onChange={v => set({ announcements: v })}
        placeholder={'Potluck after the service\nPrayer meeting Wednesday at 7 PM'} />

      <h3>Extra details</h3>
      <p className="muted small">Short facts people look for, such as <em>Offering for</em> or <em>Deacons on duty</em>.</p>
      {program.details.map(d => (
        <div className="detail-row" key={d.id}>
          <input aria-label="Label" placeholder="Label" value={d.label} maxLength={40} onChange={e => setDetail(d.id, { label: e.target.value })} />
          <input aria-label={`${d.label || 'Detail'} value`} placeholder="Value" value={d.value} maxLength={200} onChange={e => setDetail(d.id, { value: e.target.value })} />
          <IconButton icon="trash" label="Remove this detail" tone="danger" onClick={() => set({ details: program.details.filter(x => x.id !== d.id) })} />
        </div>
      ))}
      <button type="button" className="add-btn" disabled={program.details.length >= LIMITS.details}
        onClick={() => set({ details: [...program.details, { id: crypto.randomUUID(), label: '', value: '' }] })}>
        <Icon name="plus" size={16} /> Add a detail
      </button>

      <h3 className="with-icon"><Icon name="lock" size={16} /> Planning notes</h3>
      <Field label="Only on the platform copy, never on the congregation's" multiline rows={3} maxLength={LIMITS.long}
        value={program.notes} onChange={v => set({ notes: v })} />
    </section>
  );
}
