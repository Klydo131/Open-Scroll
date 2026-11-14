import React, { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import {
  DEFAULT_SECTIONS, LIMITS, MODES, TRADITIONS, addDays, allTemplates, allTopicSets, dateLabel, dayKey, lower,
  newSeries, newService, nextWeekday, planWeeks,
} from '../model.mjs';
import { Field, Icon } from './bits.jsx';
import logo from '../assets/logo.svg';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TraditionPick({ value, onChange }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Your church's tradition">
      {Object.entries(TRADITIONS).map(([key, t]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} className={`choice${value === key ? ' on' : ''}`} onClick={() => onChange(key)}>
          <strong>{t.label}</strong>
          <span>{t.day} · {t.school} · {t.worship} · {t.series}</span>
        </button>
      ))}
    </div>
  );
}

export function ModePick({ value, onChange }) {
  return (
    <div className="choice-grid two" role="radiogroup" aria-label="How much to show">
      {Object.entries(MODES).map(([key, m]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} className={`choice${value === key ? ' on' : ''}`} onClick={() => onChange(key)}>
          <strong>{m.label}</strong>
          <span>{m.summary}</span>
        </button>
      ))}
    </div>
  );
}

export function Welcome({ settings, onSave }) {
  const [tradition, setTradition] = useState(settings.tradition);
  const [church, setChurch] = useState(settings.church);
  const [mode, setMode] = useState(settings.mode);
  return (
    <div className="stack">
      <img className="welcome-logo" src={logo} alt="" width="56" height="56" />
      <p>Open Scroll helps you plan the order of service and a series of meetings, then print or share them. Three quick choices, all of which you can change later in Settings.</p>
      <h3>Which words should it use?</h3>
      <TraditionPick value={tradition} onChange={setTradition} />
      <Field label="Church name (optional)" value={church} onChange={setChurch} placeholder="Shown at the top of each program" />
      <h3>How much should it show?</h3>
      <ModePick value={mode} onChange={setMode} />
      <p className="muted small with-icon"><Icon name="lock" size={14} /> Everything stays in this browser. There is no account and nothing is sent anywhere.</p>
      <Button label="Start planning" variant="primary" onClick={() => onSave({ tradition, church, mode })} />
    </div>
  );
}

export function NewService({ settings, templates: own, words, advanced, onCreate }) {
  const templates = allTemplates(settings, own);
  const remembered = settings.lastSections.filter(k => templates.some(t => t.key === k));
  const [chosen, setChosen] = useState(remembered.length ? remembered : (DEFAULT_SECTIONS[settings.tradition] ?? DEFAULT_SECTIONS.adventist));
  const [date, setDate] = useState(nextWeekday(words.weekday));
  const [weeks, setWeeks] = useState(1);
  const [thirteenth, setThirteenth] = useState(true);
  const canThirteenth = templates.some(t => t.key === 'thirteenth') && weeks > 1;
  const toggle = key => setChosen(c => (c.includes(key) ? c.filter(k => k !== key) : templates.filter(t => c.includes(t.key) || t.key === key).map(t => t.key)));
  const create = () => {
    const start = date || nextWeekday(words.weekday);
    const list = weeks > 1
      ? planWeeks(settings, chosen, { start, weeks, thirteenth: canThirteenth && thirteenth }, new Date(), own)
      : [{ ...newService(settings, chosen, new Date(), own), date: start }];
    onCreate(list, chosen);
  };
  const group = (title, items) => items.length > 0 && (
    <fieldset className="pick-list">
      <legend>{title}</legend>
      {items.map(t => (
        <label key={t.key} className={`pick${chosen.includes(t.key) ? ' on' : ''}`}>
          <input type="checkbox" checked={chosen.includes(t.key)} onChange={() => toggle(t.key)} />
          <span className="box" aria-hidden="true"><Icon name="check" size={14} /></span>
          <span><strong>{t.title}</strong><small>{t.blurb}</small></span>
        </label>
      ))}
    </fieldset>
  );
  return (
    <div className="stack">
      <Field label={weeks > 1 ? 'First week' : 'Date'} type="date" value={date} onChange={setDate} />
      {group('Which parts of the day?', templates.filter(t => !t.own))}
      {group('Your templates', templates.filter(t => t.own))}
      <p className="muted small">Each part comes with its usual order. You can rename, reorder or remove anything afterwards.</p>
      {advanced && (
        <div className="weeks card-inset">
          <label className="control">
            <span className="control-label">How many weeks to plan</span>
            <input type="number" inputMode="numeric" min="1" max="26" value={weeks}
              onChange={e => setWeeks(Math.max(1, Math.min(26, Math.trunc(Number(e.target.value) || 1))))} />
          </label>
          {weeks > 1 && <p className="muted small">One program each week from {dateLabel(date, { weekday: false })} to {dateLabel(addDays(date, (weeks - 1) * 7), { weekday: false })}. A quarter is 13 weeks.</p>}
          {canThirteenth && (
            <label className="switch">
              <input type="checkbox" checked={thirteenth} onChange={e => setThirteenth(e.target.checked)} />
              <span className="track" aria-hidden="true" /> Make the last week a Thirteenth Sabbath program
            </label>
          )}
        </div>
      )}
      <Button label={weeks > 1 ? `Plan ${weeks} weeks` : 'Create program'} variant="primary" isDisabled={!chosen.length || !date} onClick={create} />
    </div>
  );
}

export function NewSeries({ settings, topicSets: own, words, onCreate }) {
  const sets = allTopicSets(settings, own);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(addDays(dayKey(new Date()), 14));
  const [count, setCount] = useState(sets[0].topics.length);
  // Five nights a week for three weeks is the common shape of a campaign.
  const [weekdays, setWeekdays] = useState(settings.tradition === 'general' ? [0, 1, 2, 3, 4] : [0, 2, 3, 5, 6]);
  const [time, setTime] = useState('19:00');
  const [topicSet, setTopicSet] = useState(sets[0].key);
  const topics = sets.find(s => s.key === topicSet)?.topics ?? [];
  const pickSet = key => { setTopicSet(key); const s = sets.find(x => x.key === key); if (s) setCount(Math.min(s.topics.length, LIMITS.nights)); };
  return (
    <div className="stack">
      <Field label="Name of the series" value={title} onChange={setTitle} placeholder={`e.g. Hope for Today (or leave it as “${words.series}”)`} />
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
          {sets.map(s => <option key={s.key} value={s.key}>{s.own ? '★ ' : ''}{s.label} ({s.topics.length})</option>)}
          <option value="">I will write my own</option>
        </select>
      </label>
      <label className="control">
        <span className="control-label">How many nights</span>
        <input type="number" inputMode="numeric" min="1" max={LIMITS.nights} value={count}
          onChange={e => setCount(Math.max(1, Math.min(LIMITS.nights, Math.trunc(Number(e.target.value) || 1))))} />
      </label>
      {topics.length > 0 && <ol className="topic-preview">{topics.slice(0, count).map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ol>}
      <Button label="Create series" variant="primary" isDisabled={!weekdays.length || !start}
        onClick={() => onCreate(newSeries(settings, { title, start, count, weekdays, time, topics }))} />
    </div>
  );
}

export function Help({ words, advanced }) {
  return (
    <div className="stack help">
      <ol className="steps">
        <li><strong>Start from a familiar order.</strong> Each new {lower(words.program)} begins with the usual parts of {words.school} and {words.worship}; each new {lower(words.series)} begins with its nights and topics.</li>
        <li><strong>Fill in who and what.</strong> Each part has room for the hymn, passage or title, and for who leads it. The circle at the top counts the parts still waiting for someone.</li>
        <li><strong>Preview and share.</strong> Pick a look, then print, save a picture, copy the text for a group chat or add the dates to a calendar.</li>
        <li><strong>Next week is one step.</strong> “Copy for next {words.day}” in the ⋯ menu keeps the order and clears the names.</li>
        {advanced ? (
          <li><strong>Make it yours.</strong> Save any part of the day as your own template, plan a whole quarter at once, keep your own topic lists, and rename the words Open Scroll uses, all in Settings.</li>
        ) : (
          <li><strong>Want more?</strong> Switch to Advanced in Settings for timing, private notes, the platform copy, planning a quarter at once, and your own templates and words. Nothing is lost when you switch back.</li>
        )}
      </ol>
      <p className="muted small">Changes save by themselves on this device. Use Settings to download a backup.</p>
    </div>
  );
}
