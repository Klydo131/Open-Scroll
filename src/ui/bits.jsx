import React, { useEffect, useId, useRef } from 'react';

const PATHS = {
  book: <><path d="M12 6.5C9 4.5 5.9 4.4 3 5.5v13c2.9-1.1 6-1 9 1 3-2 6.1-2.1 9-1v-13c-2.9-1.1-6-1-9 1Z" /><path d="M12 6.5v13" /></>,
  sunrise: <><path d="M3 18h18M7 15a5 5 0 0 1 10 0M12 3v4M4.2 8.2l2.1 2.1m13.5-2.1-2.1 2.1M2 14h2m16 0h2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  print: <><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" /><rect x="7" y="14" width="10" height="7" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4m8-4v4" /></>,
  chat: <path d="M4 5h16v11H9l-5 4Z" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></>,
  download: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></>,
  bookmark: <path d="M6 4h12v17l-6-4-6 4Z" />,
  upload: <path d="M12 20V9m-5 5 5-5 5 5M5 4h14" />,
  lock: <><rect x="6" y="10" width="12" height="10" rx="2" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{PATHS[name]}</svg>
  );
}

/** A plain round button with only an icon; the label is for screen readers and the tooltip. */
export function IconButton({ icon, label, onClick, disabled, tone = '' }) {
  return (
    <button type="button" className={`icon-btn ${tone}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export function Field({ label, value, onChange, type = 'text', placeholder, maxLength = 160, hint, multiline, rows = 3, className = '' }) {
  const id = useId();
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} type={multiline ? undefined : type} value={value} placeholder={placeholder}
        maxLength={maxLength} rows={multiline ? rows : undefined} onChange={e => onChange(e.target.value)} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

/**
 * A sheet: a native <dialog>, so focus, Escape and the backdrop behave the
 * way every browser already knows. It rises from the bottom on a phone and
 * settles in the middle on a computer (style.css, .sheet).
 */
export function Sheet({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`sheet${wide ? ' wide' : ''}`} aria-labelledby={titleId}
      onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-inner">
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

/** A circle that fills as parts are given to someone. */
export function Readiness({ missing, total, size = 36 }) {
  const done = total ? (total - missing) / total : 0;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const label = total === 0 ? 'No parts yet' : missing === 0 ? 'Everyone is in place' : `${missing} ${missing === 1 ? 'part still needs' : 'parts still need'} someone`;
  return (
    <span className={`ring${missing === 0 && total ? ' ready' : ''}`} title={label} aria-label={label} role="img"
      style={{ width: size, height: size, fontSize: missing > 99 ? size * 0.26 : undefined }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - done)} />
      </svg>
      {missing === 0 && total ? <Icon name="check" size={14} /> : <span>{missing}</span>}
    </span>
  );
}

export function Toast({ toast, onUndo, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, toast.undo ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.key}>
          <span>{toast.text}</span>
          {toast.undo && <button type="button" onClick={onUndo}>Undo</button>}
        </div>
      )}
    </div>
  );
}
