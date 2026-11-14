import React, { useState } from 'react';
import { LIMITS, clockAt, moveItem, newLine, timed, totalMinutes } from '../model.mjs';
import { Icon, IconButton } from './bits.jsx';

const SUGGESTIONS = [
  'Special music', 'Scripture reading', "Children's story", 'Testimony', 'Offering', 'Prayer',
  'Announcements', 'Hymn', 'Health moment', 'Mission story',
];

/**
 * The order of a service: each part on one line, with what it is (hymn,
 * passage, title) and who leads it. Minutes and a private note open under
 * the line, so the common case stays one short row.
 */
export function LineList({ lines, time, onChange, label = 'Order of service', advanced = false }) {
  const [open, setOpen] = useState(null);
  const [fresh, setFresh] = useState(null);
  const rows = timed(lines, time);
  const set = (id, fields) => onChange(lines.map(l => (l.id === id ? { ...l, ...fields } : l)));
  const add = part => {
    const line = newLine(part);
    onChange([...lines, line]);
    setFresh(line.id);
  };
  const remove = id => { onChange(lines.filter(l => l.id !== id)); setOpen(null); };
  const present = new Set(lines.map(l => l.part.toLowerCase()));
  const ideas = SUGGESTIONS.filter(s => !present.has(s.toLowerCase())).slice(0, 5);
  const total = totalMinutes(lines);

  return (
    <div className="lines">
      <div className="lines-head">
        <h3>{label}</h3>
        {advanced && total > 0 && <span className="pill quiet">{total} min{time ? ` · ends ${clockAt(time, total)}` : ''}</span>}
      </div>
      {lines.length === 0 && <p className="empty-note">No parts yet. Add the first one below.</p>}
      <ol className="line-list">
        {rows.map((line, index) => (
          <li key={line.id} className={`line${open === line.id ? ' open' : ''}${fresh === line.id ? ' fresh' : ''}`}
            style={{ '--i': Math.min(index, 12) }}>
            <span className="line-time" aria-hidden="true">{advanced && line.start ? line.start : `${index + 1}`}</span>
            <div className="line-main">
              <input className="line-part" aria-label={`Part ${index + 1}`} placeholder="What happens"
                value={line.part} maxLength={LIMITS.text} autoFocus={fresh === line.id}
                onChange={e => set(line.id, { part: e.target.value })} />
              <input className="line-detail" aria-label={`${line.part || 'Part'}: hymn, passage or title`}
                placeholder={line.hint || 'Hymn, verse'} value={line.detail} maxLength={LIMITS.text}
                onChange={e => set(line.id, { detail: e.target.value })} />
              <input className="line-who" aria-label={`${line.part || 'Part'}: who leads it`} placeholder="Leader"
                value={line.who} maxLength={LIMITS.text} onChange={e => set(line.id, { who: e.target.value })} />
            </div>
            <button type="button" className="icon-btn line-more" aria-expanded={open === line.id}
              aria-label={`More for ${line.part || `part ${index + 1}`}`} onClick={() => setOpen(open === line.id ? null : line.id)}>
              <Icon name="more" size={18} />
            </button>
            {open === line.id && (
              <div className={`line-extra${advanced ? "" : " only-tools"}`}>
                {advanced && <label className="minutes">
                  <span>Minutes</span>
                  <input type="number" inputMode="numeric" min="0" max={LIMITS.minutes} value={line.minutes}
                    onChange={e => set(line.id, { minutes: Math.max(0, Math.min(LIMITS.minutes, Math.trunc(Number(e.target.value) || 0))) })} />
                </label>}
                {advanced && <label className="note">
                  <span>Private note <small>(platform copy only)</small></span>
                  <input value={line.note} maxLength={300} placeholder="e.g. Mic 2, stand at the pulpit"
                    onChange={e => set(line.id, { note: e.target.value })} />
                </label>}
                <div className="line-tools">
                  <IconButton icon="up" label="Move up" disabled={index === 0} onClick={() => onChange(moveItem(lines, index, -1))} />
                  <IconButton icon="down" label="Move down" disabled={index === lines.length - 1} onClick={() => onChange(moveItem(lines, index, 1))} />
                  <IconButton icon="trash" label="Remove this part" tone="danger" onClick={() => remove(line.id)} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="add-row">
        <button type="button" className="add-btn" disabled={lines.length >= LIMITS.lines} onClick={() => add('')}>
          <Icon name="plus" size={16} /> Add a part
        </button>
        {ideas.map(s => (
          <button key={s} type="button" className="chip" disabled={lines.length >= LIMITS.lines} onClick={() => add(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}
