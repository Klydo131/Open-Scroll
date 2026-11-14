import React, { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { clockAt, dateLabel, timed } from '../model.mjs';
import { calendar, copyOptions, fileName, programText } from '../output.mjs';
import { FILE_TYPES, docxFile, markdownText, xlsxFile } from '../export.mjs';
import { programPicture } from '../picture.js';
import { Icon } from './bits.jsx';

export const STYLES = [
  { key: 'classic', label: 'Classic' },
  { key: 'clean', label: 'Clean' },
  { key: 'warm', label: 'Warm' },
];
export const ACCENTS = [
  { value: '#1f3a5f', name: 'Navy' }, { value: '#5b2a3c', name: 'Wine' }, { value: '#2f5d50', name: 'Cedar' },
  { value: '#7a5a1e', name: 'Gold' }, { value: '#3f3d56', name: 'Slate' }, { value: '#8a3b2e', name: 'Clay' },
];

export function saveFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Lines({ lines, time, opt }) {
  return (
    <ol className="doc-lines">
      {timed(lines, time).filter(l => l.part || l.detail).map(l => (
        <li key={l.id}>
          {opt.times && <span className="doc-time">{l.start}</span>}
          <span className="doc-part">{l.part}{l.detail && <em>{' — '}{l.detail}</em>}</span>
          {opt.leaders && l.who && <span className="doc-who">{l.who}</span>}
          {opt.notes && l.note && <span className="doc-note">{l.note}</span>}
        </li>
      ))}
    </ol>
  );
}

/** The program as it will be handed out, and every way to send it. */
export function Preview({ program, words, advanced, paper = 'letter', onChange, notify }) {
  const [chosenCopy, setCopy] = useState('congregation');
  // The platform copy belongs to Advanced; Simple always shows the congregation's.
  const copy = advanced ? chosenCopy : 'congregation';
  const [showLeaders, setShowLeaders] = useState(true);
  const [nightId, setNightId] = useState('');
  const opt = copyOptions(copy, showLeaders);
  const look = program.look;
  const setLook = fields => onChange({ ...program, look: { ...look, ...fields } });
  const series = program.kind === 'series';
  const nights = series && nightId ? program.nights.filter(n => n.id === nightId) : series ? program.nights : [];
  const textOptions = { copy, showLeaders, nightId: nightId || null, night: words.night };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(programText(program, textOptions));
      notify('Copied. Paste it into your group chat.');
    } catch {
      notify('This browser would not copy. Try Print instead.');
    }
  };
  const picture = async () => {
    const shown = series && nightId ? { ...program, nights } : program;
    try {
      saveFile(await programPicture(shown, { leaders: opt.leaders }), fileName(program, 'png'));
      notify('Picture saved to your downloads.');
    } catch {
      notify('The picture could not be made in this browser.');
    }
  };
  const ics = () => {
    saveFile(new Blob([calendar(program)], { type: 'text/calendar' }), fileName(program, 'ics'));
    notify('Calendar file saved. Open it to add the dates.');
  };

  // Each file is made on this device from the same copy you are looking at.
  const makers = {
    txt: async () => ({ data: programText(program, textOptions) }),
    md: async () => ({ data: markdownText(program, textOptions) }),
    docx: async () => ({ data: docxFile(program, textOptions, paper) }),
    xlsx: async () => ({ data: xlsxFile(program, textOptions, advanced && copy === 'platform') }),
    pdf: async () => {
      const { programPdf } = await import('../pdf.js');
      const { bytes, replaced } = await programPdf(program, textOptions, paper);
      return { data: bytes, note: replaced ? ` ${replaced} character${replaced === 1 ? '' : 's'} in other alphabets could not be shown; Print, then Save as PDF, keeps them.` : '' };
    },
  };
  const [busy, setBusy] = useState('');
  const download = async kind => {
    const type = FILE_TYPES[kind];
    setBusy(kind);
    try {
      const { data, note = '' } = await makers[kind]();
      saveFile(new Blob([data], { type: type.mime }), fileName(program, type.ending));
      notify(`${type.label} file saved to your downloads.${note}`);
    } catch {
      notify(`The ${type.label} file could not be made in this browser.`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="preview">
      <aside className="controls card rise">
        {advanced && <div className="control">
          <span className="control-label">Which copy</span>
          <div className="segmented" role="radiogroup" aria-label="Which copy">
            {[['congregation', 'Congregation'], ['platform', 'Platform']].map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={copy === k} className={copy === k ? 'on' : ''} onClick={() => setCopy(k)}>{l}</button>
            ))}
          </div>
          <small className="muted">{copy === 'platform' ? 'For those leading: start times, names and private notes.' : 'What people hold in their hands.'}</small>
        </div>}
        {copy === 'congregation' && (
          <label className="switch">
            <input type="checkbox" checked={showLeaders} onChange={e => setShowLeaders(e.target.checked)} />
            <span className="track" aria-hidden="true" /> Show who leads each part
          </label>
        )}
        {series && (
          <label className="control">
            <span className="control-label">Show</span>
            <select value={nightId} onChange={e => setNightId(e.target.value)}>
              <option value="">The whole series</option>
              {program.nights.map((n, i) => <option key={n.id} value={n.id}>{words.night} {i + 1}{n.topic ? `: ${n.topic}` : ''}</option>)}
            </select>
          </label>
        )}
        <div className="control">
          <span className="control-label">Look</span>
          <div className="segmented" role="radiogroup" aria-label="Look">
            {STYLES.map(s => (
              <button key={s.key} type="button" role="radio" aria-checked={look.style === s.key} className={look.style === s.key ? 'on' : ''} onClick={() => setLook({ style: s.key })}>{s.label}</button>
            ))}
          </div>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {ACCENTS.map(c => (
              <button key={c.value} type="button" role="radio" aria-checked={look.accent === c.value} aria-label={c.name} title={c.name}
                className={look.accent === c.value ? 'on' : ''} style={{ '--sw': c.value }} onClick={() => setLook({ accent: c.value })} />
            ))}
          </div>
        </div>
        <div className="share-actions">
          <Button label="Print" variant="primary" icon={<Icon name="print" size={16} />} onClick={() => window.print()} />
          <Button label="Copy text" icon={<Icon name="chat" size={16} />} onClick={copyText} />
        </div>
        <div className="control">
          <span className="control-label">Save a file</span>
          <div className="file-grid">
            <Button label="PDF" icon={<Icon name="file" size={16} />} isDisabled={busy === 'pdf'} onClick={() => download('pdf')} />
            <Button label="Word" icon={<Icon name="file" size={16} />} onClick={() => download('docx')} />
            <Button label="Excel" icon={<Icon name="table" size={16} />} onClick={() => download('xlsx')} />
            <Button label="Text" icon={<Icon name="file" size={16} />} onClick={() => download('txt')} />
            <Button label="Markdown" icon={<Icon name="file" size={16} />} onClick={() => download('md')} />
            <Button label="Picture" icon={<Icon name="image" size={16} />} onClick={picture} />
            <Button label="Calendar" icon={<Icon name="calendar" size={16} />} onClick={ics} />
          </div>
          <small className="muted">Markdown opens in Obsidian and other note apps. Excel puts each part on its own row. Paper size is in Settings.</small>
        </div>
      </aside>

      <article className={`doc look-${look.style}`} style={{ '--accent': look.accent }} aria-label="Program preview">
        <header className="doc-head">
          {program.church && <p className="doc-church">{program.church}</p>}
          <h1>{program.title}</h1>
          {!series && program.date && <p className="doc-date">{dateLabel(program.date)}</p>}
          {program.theme && <p className="doc-theme">{program.theme}</p>}
        </header>

        {!series && program.sections.map(s => (
          <section key={s.id} className="doc-section">
            <h2>{s.title}{s.time && <span>{clockAt(s.time)}</span>}</h2>
            <Lines lines={s.lines} time={s.time} opt={opt} />
          </section>
        ))}

        {series && nights.map(n => {
          const number = program.nights.indexOf(n) + 1;
          return (
            <section key={n.id} className="doc-section">
              <h2>{words.night} {number}<span>{[dateLabel(n.date), clockAt(n.time)].filter(Boolean).join(' · ')}</span></h2>
              <p className="doc-topic">{n.topic || 'Topic to be announced'}</p>
              {(n.speaker || n.scripture) && <p className="doc-meta">{[n.speaker, n.scripture].filter(Boolean).join(' · ')}</p>}
              {(nightId || copy === 'platform') && <Lines lines={n.lines} time={n.time} opt={opt} />}
            </section>
          );
        })}

        {program.details.some(d => d.label && d.value) && (
          <dl className="doc-details">
            {program.details.filter(d => d.label && d.value).map(d => <div key={d.id}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}
          </dl>
        )}
        {program.announcements.trim() && (
          <section className="doc-section">
            <h2>Announcements</h2>
            <ul className="doc-ann">{program.announcements.trim().split('\n').filter(a => a.trim()).map((a, i) => <li key={i}>{a}</li>)}</ul>
          </section>
        )}
        {opt.notes && program.notes.trim() && (
          <section className="doc-section private">
            <h2>Planning notes</h2>
            <p className="doc-notes">{program.notes}</p>
          </section>
        )}
        {program.venue && <footer className="doc-foot">{program.venue}</footer>}
      </article>
    </div>
  );
}
