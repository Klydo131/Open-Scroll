// A real PDF of the program: selectable text, set in the standard fonts every
// PDF reader has, paged and numbered. The PDF library is loaded only when
// someone asks for a PDF, so it never slows the first visit.
import { programDoc } from './output.mjs';

const PAPER_POINTS = { letter: [612, 792], a4: [595.28, 841.89] };

function colour(rgb, value, fallback = '#1f3a5f') {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value ?? '') ?? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fallback);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

export async function programPdf(program, options = {}, paper = 'letter') {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = programDoc(program, options);
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  pdf.setAuthor(doc.church || 'Open Scroll');
  pdf.setCreator('Open Scroll');
  pdf.setProducer('Open Scroll');

  const serif = doc.look.style !== 'clean';
  const centred = doc.look.style !== 'clean';
  const font = {
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    head: await pdf.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold),
    headItalic: await pdf.embedFont(serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique),
  };
  // The standard fonts hold Western European text. Anything else prints as ?, never an error.
  const sets = new Map(Object.values(font).map(f => [f, new Set(f.getCharacterSet())]));
  const replaced = new Set();
  const safe = (f, text) => [...String(text ?? '').replace(/[\r\n\t]+/g, ' ')].map(ch => {
    if (sets.get(f).has(ch.codePointAt(0))) return ch;
    replaced.add(ch);
    return '?';
  }).join('');

  const [PW, PH] = PAPER_POINTS[paper] ?? PAPER_POINTS.letter;
  const M = 56;
  const CW = PW - M * 2;
  const accent = colour(rgb, doc.look.accent);
  const ink = rgb(0.11, 0.1, 0.09);
  const grey = rgb(0.34, 0.33, 0.31);
  const faint = rgb(0.47, 0.44, 0.42);

  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage([PW, PH]);
    if (doc.look.style === 'warm') page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: rgb(0.984, 0.965, 0.925) });
    page.drawRectangle({ x: 0, y: PH - 7, width: PW, height: 7, color: accent });
    y = PH - M;
  };
  const room = need => { if (y - need < M + 14) newPage(); };

  function wrap(f, size, text, width) {
    const lines = [];
    let line = '';
    for (const word of safe(f, text).split(' ').filter(Boolean)) {
      let w = word;
      while (f.widthOfTextAtSize(w, size) > width) { // a single word wider than the line: break it
        let cut = w.length - 1;
        while (cut > 1 && f.widthOfTextAtSize(w.slice(0, cut), size) > width) cut -= 1;
        if (line) { lines.push(line); line = ''; }
        lines.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const attempt = line ? `${line} ${w}` : w;
      if (line && f.widthOfTextAtSize(attempt, size) > width) { lines.push(line); line = w; } else line = attempt;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  /** Wrapped text at the cursor; centred or left; moves the cursor down. */
  function write(text, { f = font.body, size = 10.5, color = ink, align = 'left', x = M, width = CW, gap = 0, lh = 1.38 } = {}) {
    const rows = wrap(f, size, text, width);
    for (const row of rows) {
      room(size * lh);
      y -= size * lh;
      const w = f.widthOfTextAtSize(row, size);
      page.drawText(row, { x: align === 'center' ? x + (width - w) / 2 : x, y: y + size * 0.28, size, font: f, color });
    }
    y -= gap;
  }

  newPage();
  y -= 6;
  if (doc.church) write(doc.church.toUpperCase(), { f: font.bold, size: 9, color: accent, align: centred ? 'center' : 'left', gap: 4 });
  write(doc.title, { f: font.head, size: 26, align: centred ? 'center' : 'left', gap: 4, lh: 1.15 });
  const head = doc.head.filter(h => h !== doc.church).join('  ·  ');
  if (head) write(head, { color: grey, align: centred ? 'center' : 'left', gap: 2 });
  if (doc.theme) write(doc.theme, { f: font.headItalic, size: 12.5, color: grey, align: centred ? 'center' : 'left', gap: 4 });
  for (const d of doc.details) {
    const label = `${d.label}: `;
    const lw = font.bold.widthOfTextAtSize(safe(font.bold, label), 10.5);
    room(16);
    const rows = wrap(font.body, 10.5, d.value, CW - lw);
    y -= 14.5;
    page.drawText(safe(font.bold, label), { x: M, y: y + 3, size: 10.5, font: font.bold, color: ink });
    page.drawText(rows[0], { x: M + lw, y: y + 3, size: 10.5, font: font.body, color: ink });
    for (const row of rows.slice(1)) { room(15); y -= 14.5; page.drawText(row, { x: M + lw, y: y + 3, size: 10.5, font: font.body, color: ink }); }
  }

  const heading = (text, aside) => {
    room(60);
    y -= 14;
    const label = safe(font.bold, text.toUpperCase());
    y -= 11;
    page.drawText(label, { x: M, y: y + 3, size: 10.5, font: font.bold, color: accent });
    if (aside) {
      const a = safe(font.body, aside);
      page.drawText(a, { x: M + CW - font.body.widthOfTextAtSize(a, 10), y: y + 3, size: 10, font: font.body, color: grey });
    }
    y -= 5;
    page.drawLine({ start: { x: M, y }, end: { x: M + CW, y }, thickness: 0.7, color: accent, opacity: 0.45 });
    y -= 3;
  };

  for (const s of doc.sections) {
    heading(s.title + (s.topic ? `: ${s.topic}` : ''), s.aside);
    for (const f of s.facts) write(f, { color: grey, size: 10 });
    const timeW = doc.opt.times ? 60 : 0;
    const whoW = doc.opt.leaders ? Math.min(CW * 0.34, Math.max(0, ...s.lines.map(l => font.bold.widthOfTextAtSize(safe(font.bold, l.who), 10.5)))) : 0;
    const partW = CW - timeW - (whoW ? whoW + 12 : 0);
    for (const l of s.lines) {
      const main = safe(font.body, l.part + (l.detail ? ` — ${l.detail}` : ''));
      const rows = wrap(font.body, 10.5, main, partW);
      room(rows.length * 14.5 + 2);
      const top = y;
      rows.forEach(row => { y -= 14.5; page.drawText(row, { x: M + timeW, y: y + 3, size: 10.5, font: font.body, color: ink }); });
      if (l.time) page.drawText(safe(font.body, l.time), { x: M, y: top - 11.5, size: 9.5, font: font.body, color: faint });
      if (l.who) {
        const who = wrap(font.bold, 10.5, l.who, whoW || CW * 0.34)[0];
        page.drawText(who, { x: M + CW - font.bold.widthOfTextAtSize(who, 10.5), y: top - 11.5, size: 10.5, font: font.bold, color: accent });
      }
      if (l.note) write(l.note, { f: font.italic, size: 9, color: faint, x: M + timeW, width: CW - timeW, lh: 1.3 });
      y -= 1.5;
    }
  }

  if (doc.team.length) {
    heading('Team');
    for (const t of doc.team) {
      room(16);
      y -= 14.5;
      page.drawText(safe(font.bold, t.role), { x: M, y: y + 3, size: 10.5, font: font.bold, color: ink });
      if (t.who) page.drawText(wrap(font.body, 10.5, t.who, CW - 150)[0], { x: M + 150, y: y + 3, size: 10.5, font: font.body, color: ink });
    }
  }
  if (doc.checklist.length) {
    heading('Before the first night');
    for (const c of doc.checklist) write(`${c.done ? '[x]' : '[  ]'}  ${c.text}`);
  }
  if (doc.announcements.length) {
    heading('Announcements');
    for (const a of doc.announcements) write(`•  ${a}`, { x: M + 4, width: CW - 4 });
  }
  if (doc.notes) {
    heading('Planning notes');
    for (const n of doc.notes.split('\n')) write(n || ' ', { f: font.italic, color: grey });
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const text = safe(font.body, `${doc.church ? `${doc.church}  ·  ` : ''}Page ${i + 1} of ${pages.length}`);
    p.drawText(text, { x: (PW - font.body.widthOfTextAtSize(text, 8.5)) / 2, y: 26, size: 8.5, font: font.body, color: faint });
  });
  return { bytes: await pdf.save(), replaced: replaced.size };
}
