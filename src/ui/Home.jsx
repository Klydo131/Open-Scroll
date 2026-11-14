import React from 'react';
import { dateLabel, dayKey, lower, needsSomeone } from '../model.mjs';
import { Icon, Readiness } from './bits.jsx';
import notebook from '../assets/open-scroll-notebook.webp';

function firstDate(p) {
  return p.kind === 'series' ? (p.nights.find(n => n.date)?.date ?? p.date) : p.date;
}

function lastDate(p) {
  return p.kind === 'series' ? ([...p.nights].reverse().find(n => n.date)?.date ?? p.date) : p.date;
}

function subtitle(p, words) {
  if (p.kind === 'series') {
    const first = firstDate(p);
    return `${p.nights.length} ${p.nights.length === 1 ? 'night' : 'nights'}${first ? ` from ${dateLabel(first, { weekday: false })}` : ''}`;
  }
  return [dateLabel(p.date), p.sections.map(s => s.title).join(' · ')].filter(Boolean).join(' — ') || words.program;
}

function Row({ p, words, onOpen, index }) {
  const r = needsSomeone(p);
  return (
    <li className="program-row rise" style={{ '--i': Math.min(index, 10) }}>
      <button type="button" onClick={() => onOpen(p.id)}>
        <span className={`kind ${p.kind}`} aria-hidden="true"><Icon name={p.kind === 'series' ? 'sunrise' : 'book'} size={20} /></span>
        <span className="row-text">
          <strong>{p.title}</strong>
          <span>{subtitle(p, words)}</span>
        </span>
        <Readiness missing={r.missing} total={r.total} size={32} />
        <Icon name="next" size={18} />
      </button>
    </li>
  );
}

export function Home({ programs, words, settings, onNewService, onNewSeries, onOpen }) {
  const today = dayKey(new Date());
  const sorted = [...programs].sort((a, b) => (firstDate(a) || '9999').localeCompare(firstDate(b) || '9999'));
  const upcoming = sorted.filter(p => !lastDate(p) || lastDate(p) >= today);
  const earlier = sorted.filter(p => lastDate(p) && lastDate(p) < today).reverse();

  return (
    <div className="home">
      <section className="hero rise">
        <div className="hero-text">
          <p className="eyebrow">{settings.church || 'Open Scroll'}</p>
          <h1>Plan this {words.day} with care.</h1>
          <p className="lede">Put the order of service together, see who still needs to be asked, and hand everyone a clear program. It all stays on this device.</p>
        </div>
        <img src={notebook} alt="" className="hero-art" width="345" height="230" />
      </section>

      <div className="start-grid">
        <button type="button" className="start card rise" style={{ '--i': 1 }} onClick={onNewService}>
          <span className="kind service" aria-hidden="true"><Icon name="book" size={22} /></span>
          <strong>New {lower(words.program)}</strong>
          <span>{words.school}, {words.worship} and the rest of the day.</span>
        </button>
        <button type="button" className="start card rise" style={{ '--i': 2 }} onClick={onNewSeries}>
          <span className="kind series" aria-hidden="true"><Icon name="sunrise" size={22} /></span>
          <strong>New {lower(words.series)}</strong>
          <span>Nights, topics, the team and the preparation list.</span>
        </button>
      </div>

      {programs.length === 0 ? (
        <p className="empty-note center rise" style={{ '--i': 3 }}>Your programs will appear here.</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="list-block">
              <h2>Coming up</h2>
              <ul className="program-list">{upcoming.map((p, i) => <Row key={p.id} p={p} words={words} onOpen={onOpen} index={i + 3} />)}</ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section className="list-block">
              <h2>Earlier</h2>
              <ul className="program-list quiet">{earlier.map((p, i) => <Row key={p.id} p={p} words={words} onOpen={onOpen} index={i + 3} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
