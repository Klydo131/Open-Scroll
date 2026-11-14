// Files a church can keep or send: Markdown (for Obsidian and other note
// apps), Word and Excel. Word and Excel files are zip packages of XML, written
// here directly so the app needs no library and nothing leaves the device.
// The PDF lives in pdf.js because it needs a library, loaded only when asked.
import { clockAt } from './model.mjs';
import { programDoc } from './output.mjs';

export const PAPER = {
  letter: { label: 'Letter (8.5 × 11 in)', width: 12240, height: 15840 },
  a4: { label: 'A4 (210 × 297 mm)', width: 11906, height: 16838 },
};

export const FILE_TYPES = {
  pdf: { label: 'PDF', ending: 'pdf', mime: 'application/pdf' },
  docx: { label: 'Word', ending: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xlsx: { label: 'Excel', ending: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  txt: { label: 'Text', ending: 'txt', mime: 'text/plain;charset=utf-8' },
  md: { label: 'Markdown', ending: 'md', mime: 'text/markdown;charset=utf-8' },
};

// ---------------------------------------------------------------------------
// Zip (stored, not compressed: these files are small, and a stored zip is
// valid everywhere and easy to check).
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{ name, data }] with data a string or Uint8Array. Names are plain ASCII paths. */
export function zip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const data = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true); // 1980-01-01, so the same program always makes the same bytes
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const head = new DataView(new ArrayBuffer(46));
    head.setUint32(0, 0x02014b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 20, true);
    head.setUint16(8, 0x0800, true);
    head.setUint16(12, 0, true);
    head.setUint16(14, 0x21, true);
    head.setUint32(16, crc, true);
    head.setUint32(20, data.length, true);
    head.setUint32(24, data.length, true);
    head.setUint16(28, name.length, true);
    head.setUint32(42, offset, true);
    central.push(new Uint8Array(head.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

// ---------------------------------------------------------------------------
// Markdown, for Obsidian and other note apps.
// ---------------------------------------------------------------------------

/** Characters that would turn typed text into formatting, links or tables. */
export function mdEscape(value) {
  return String(value ?? '').replace(/([\\`*_[\]<>|~#])/g, '\\$1');
}

const yaml = value => JSON.stringify(String(value ?? '')); // a JSON string is a valid YAML string

export function markdownText(program, options = {}) {
  const doc = programDoc(program, options);
  const series = program.kind === 'series';
  const dates = series ? program.nights.map(n => n.date).filter(Boolean).sort() : [program.date].filter(Boolean);
  const front = [
    '---',
    `title: ${yaml(doc.title)}`,
    ...(doc.church ? [`church: ${yaml(doc.church)}`] : []),
    ...(dates[0] ? [`date: ${dates[0]}`] : []),
    ...(series && dates.length > 1 ? [`end: ${dates.at(-1)}`] : []),
    `type: ${series ? 'series' : 'program'}`,
    'tags: [open-scroll]',
    `copy: ${doc.opt.notes ? 'platform' : 'congregation'}`,
    '---',
    '',
  ];
  const out = [...front, `# ${mdEscape(doc.title)}`, ''];
  if (doc.head.length) out.push(`*${doc.head.map(mdEscape).join(' · ')}*`, '');
  if (doc.theme) out.push(`> ${mdEscape(doc.theme)}`, '');
  for (const d of doc.details) out.push(`- **${mdEscape(d.label)}:** ${mdEscape(d.value)}`);
  if (doc.details.length) out.push('');
  for (const s of doc.sections) {
    out.push(`## ${[mdEscape(s.title) + (s.topic ? `: ${mdEscape(s.topic)}` : ''), mdEscape(s.aside)].filter(Boolean).join(' · ')}`, '');
    for (const f of s.facts) out.push(`${mdEscape(f)}  `);
    if (s.facts.length) out.push('');
    for (const l of s.lines) {
      const main = `**${mdEscape(l.part)}**${l.detail ? ` — ${mdEscape(l.detail)}` : ''}`;
      out.push(`- ${[l.time ? `\`${l.time}\`` : '', main, l.who ? `*${mdEscape(l.who)}*` : ''].filter(Boolean).join(' · ')}`);
      if (l.note) out.push(`  - ${mdEscape(l.note)}`);
    }
    if (s.lines.length) out.push('');
  }
  if (doc.team.length) out.push('## Team', '', ...doc.team.map(t => `- **${mdEscape(t.role)}**${t.who ? `: ${mdEscape(t.who)}` : ''}`), '');
  if (doc.checklist.length) out.push('## Before the first night', '', ...doc.checklist.map(c => `- [${c.done ? 'x' : ' '}] ${mdEscape(c.text)}`), '');
  if (doc.announcements.length) out.push('## Announcements', '', ...doc.announcements.map(a => `- ${mdEscape(a)}`), '');
  if (doc.notes) out.push('> [!note] Planning notes', ...doc.notes.split('\n').map(n => `> ${mdEscape(n)}`), '');
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

// ---------------------------------------------------------------------------
// XML helpers shared by Word and Excel.
// ---------------------------------------------------------------------------

// XML 1.0 forbids most control characters and lone surrogates; emoji (pairs) are fine.
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function xml(value) {
  return String(value ?? '').replace(NOT_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_OD = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const hex = colour => (/^#[0-9a-f]{6}$/i.test(colour ?? '') ? colour.slice(1).toUpperCase() : '1F3A5F');

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------

export function docxFile(program, options = {}, paper = 'letter') {
  const doc = programDoc(program, options);
  const size = PAPER[paper] ?? PAPER.letter;
  const margin = 1080;
  const textWidth = size.width - margin * 2;
  const accent = hex(doc.look.accent);
  const serif = doc.look.style !== 'clean';
  const centre = doc.look.style !== 'clean';
  const headFont = serif ? 'Georgia' : 'Calibri';
  const timeIndent = 1180;

  const run = (text, { bold, italic, size: sz, color, font, caps } = {}) => {
    const props = [
      font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>` : '',
      bold ? '<w:b/>' : '', italic ? '<w:i/>' : '', caps ? '<w:caps/>' : '',
      color ? `<w:color w:val="${color}"/>` : '',
      sz ? `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` : '',
    ].join('');
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
  };
  const tab = '<w:r><w:tab/></w:r>';
  const para = (runs, { style, jc, tabs, ind, before, after, keepNext } = {}) => {
    const props = [
      style ? `<w:pStyle w:val="${style}"/>` : '',
      keepNext ? '<w:keepNext/>' : '',
      tabs ? `<w:tabs>${tabs.map(([val, pos]) => `<w:tab w:val="${val}" w:pos="${pos}"/>`).join('')}</w:tabs>` : '',
      before !== undefined || after !== undefined ? `<w:spacing${before !== undefined ? ` w:before="${before}"` : ''}${after !== undefined ? ` w:after="${after}"` : ''}/>` : '',
      ind ? `<w:ind w:left="${ind.left}"${ind.hanging ? ` w:hanging="${ind.hanging}"` : ''}/>` : '',
      jc ? `<w:jc w:val="${jc}"/>` : '',
    ].join('');
    return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs}</w:p>`;
  };
  const grey = '57534E';
  const body = [];

  if (doc.church) body.push(para(run(doc.church, { bold: true, size: 18, color: accent, caps: true }), { jc: centre ? 'center' : 'left', after: 40 }));
  body.push(para(run(doc.title), { style: 'Title', jc: centre ? 'center' : 'left' }));
  if (doc.head.filter(h => h !== doc.church).length) {
    body.push(para(run(doc.head.filter(h => h !== doc.church).join(' · '), { color: grey }), { jc: centre ? 'center' : 'left', after: 40 }));
  }
  if (doc.theme) body.push(para(run(doc.theme, { italic: true, font: headFont, color: '44403C', size: 24 }), { jc: centre ? 'center' : 'left', after: 160 }));
  for (const d of doc.details) body.push(para(run(`${d.label}: `, { bold: true }) + run(d.value)));

  const heading = (text, aside) => para(run(text) + (aside ? tab + run(aside, { caps: false, bold: false, color: grey }) : ''),
    { style: 'Heading1', tabs: [['right', textWidth]] });

  for (const s of doc.sections) {
    body.push(heading(s.title + (s.topic ? `: ${s.topic}` : ''), s.aside));
    for (const f of s.facts) body.push(para(run(f, { color: grey })));
    for (const l of s.lines) {
      const hasTime = Boolean(l.time);
      const runs = (hasTime ? run(l.time, { color: grey, size: 20 }) + tab : '')
        + run(l.part, { bold: true }) + (l.detail ? run(` — ${l.detail}`) : '')
        + (l.who ? tab + run(l.who, { color: accent, bold: true }) : '');
      const tabs = [...(hasTime ? [['left', timeIndent]] : []), ...(l.who ? [['right', textWidth]] : [])];
      body.push(para(runs, { tabs: tabs.length ? tabs : undefined, ind: hasTime ? { left: timeIndent, hanging: timeIndent } : undefined, after: l.note ? 0 : 60 }));
      if (l.note) body.push(para(run(l.note, { italic: true, color: grey, size: 19 }), { ind: { left: hasTime ? timeIndent : 0 }, after: 60 }));
    }
  }
  if (doc.team.length) {
    body.push(heading('Team'));
    for (const t of doc.team) body.push(para(run(t.role, { bold: true }) + (t.who ? tab + run(t.who) : ''), { tabs: [['left', 3000]] }));
  }
  if (doc.checklist.length) {
    body.push(heading('Before the first night'));
    for (const c of doc.checklist) body.push(para(run(c.done ? '☑  ' : '☐  ', { color: accent }) + run(c.text)));
  }
  if (doc.announcements.length) {
    body.push(heading('Announcements'));
    for (const a of doc.announcements) body.push(para(run('•  ', { color: accent }) + run(a), { ind: { left: 360, hanging: 360 } }));
  }
  if (doc.notes) {
    body.push(heading('Planning notes'));
    for (const n of doc.notes.split('\n')) body.push(para(run(n, { italic: true, color: grey })));
  }

  const documentXml = `${HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${NS_OD}"><w:body>${body.join('')}`
    + `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="${size.width}" w:h="${size.height}"/>`
    + `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin + 200}" w:left="${margin}" w:header="720" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const styles = `${HEAD}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="${headFont}" w:hAnsi="${headFont}" w:cs="${headFont}"/><w:b/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="${accent}"/></w:pBdr><w:spacing w:before="320" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="${accent}"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>`
    + '</w:styles>';

  const footer = `${HEAD}<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>`
    + `<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">${xml(doc.church ? `${doc.church}  ·  Page ` : 'Page ')}</w:t></w:r>`
    + '<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
    + '<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    + '<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
    + '<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:t>1</w:t></w:r>'
    + '<w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="17"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

  const core = `${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(doc.title)}</dc:title><dc:creator>Open Scroll</dc:creator></cp:coreProperties>`;

  return zip([
    { name: '[Content_Types].xml', data: `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `${HEAD}<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${NS_OD}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `${HEAD}<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${NS_OD}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${NS_OD}/footer" Target="footer1.xml"/></Relationships>` },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/footer1.xml', data: footer },
    { name: 'docProps/core.xml', data: core },
  ]);
}

// ---------------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------------

export function columnName(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) { out = String.fromCharCode(65 + ((n - 1) % 26)) + out; n = Math.floor((n - 1) / 26); }
  return out;
}

/** Sheet names: at most 31 characters, none of []:*?/\ , and no two alike. */
export function sheetNames(names) {
  const seen = new Set();
  return names.map(raw => {
    const base = String(raw).replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet';
    let name = base;
    for (let n = 2; seen.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
    seen.add(name.toLowerCase());
    return name;
  });
}

function sheetXml(sheet) {
  const rows = sheet.rows.map((row, r) => {
    const cells = row.map((value, c) => {
      const ref = `${columnName(c)}${r + 1}`;
      const style = r === 0 ? ' s="1"' : '';
      if (value === null || value === undefined || value === '') return style ? `<c r="${ref}"${style}/>` : '';
      // Text goes in as a literal string, never a formula, whatever it starts with.
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const last = `${columnName(Math.max(sheet.rows[0].length, 1) - 1)}${sheet.rows.length}`;
  return `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${rows}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
}

/** The sheets of a program: always readable on their own, one row per part. */
export function workbookSheets(program, options = {}, counts = false) {
  const doc = programDoc(program, options);
  const series = program.kind === 'series';
  const sheets = [];

  const lineRows = [];
  for (const s of doc.sections) {
    for (const l of s.lines) lineRows.push([s.title + (s.topic ? `: ${s.topic}` : ''), l.time, l.part, l.detail, l.who, doc.opt.times ? l.minutes : null, l.note]);
  }
  const columns = [
    ['Section', 30, true], ['Start', 11, doc.opt.times], ['Part', 30, true], ['Hymn, passage or title', 34, true],
    ['Who leads', 24, doc.opt.leaders], ['Minutes', 9, doc.opt.times], ['Private note', 34, doc.opt.notes],
  ];
  const keep = columns.map(c => c[2]);
  const pick = row => row.filter((_, i) => keep[i]);
  const programSheet = lineRows.length
    ? { name: 'Program', rows: [pick(columns.map(c => c[0])), ...lineRows.map(pick)], widths: columns.filter(c => c[2]).map(c => c[1]) }
    : null;

  if (series) {
    const withCounts = counts && doc.opt.notes;
    const byId = new Map(program.nights.map(n => [n.id, n]));
    const head = ['Night', 'Date', 'Starts', 'Topic', 'Speaker', 'Scripture', ...(withCounts ? ['Present', 'Guests', 'Interest cards', 'Decisions'] : [])];
    const rows = doc.sections.map(s => [
      Number(s.title.replace(/\D+/g, '')) || null, s.night.date, clockAt(s.night.time), s.night.topic, s.night.speaker, s.night.scripture,
      ...(withCounts ? ['attendance', 'guests', 'interests', 'decisions'].map(k => byId.get(s.id)?.counts?.[k] ?? 0) : []),
    ]);
    sheets.push({ name: 'Nights', rows: [head, ...rows], widths: [8, 13, 11, 36, 24, 24, ...(withCounts ? [10, 10, 14, 11] : [])] });
  }
  if (programSheet) sheets.push(programSheet);
  if (doc.team.length) sheets.push({ name: 'Team', rows: [['Role', 'Who'], ...doc.team.map(t => [t.role, t.who])], widths: [28, 36] });
  if (doc.checklist.length) sheets.push({ name: 'Preparation', rows: [['Done', 'Task'], ...doc.checklist.map(c => [c.done ? 'Yes' : '', c.text])], widths: [8, 70] });

  const info = [['Item', 'Value'], ['Title', doc.title]];
  if (doc.church) info.push(['Church', doc.church]);
  if (doc.date && !series) info.push(['Date', doc.date]);
  if (doc.venue) info.push(['Place', doc.venue]);
  if (doc.theme) info.push(['Theme', doc.theme]);
  for (const d of doc.details) info.push([d.label, d.value]);
  for (const a of doc.announcements) info.push(['Announcement', a]);
  if (doc.notes) info.push(['Planning notes', doc.notes]);
  sheets.push({ name: 'Details', rows: info, widths: [20, 80] });
  return sheets;
}

export function xlsxFile(program, options = {}, counts = false) {
  const raw = workbookSheets(program, options, counts);
  const names = sheetNames(raw.map(s => s.name));
  const sheets = raw.map((s, i) => ({ ...s, name: names[i] }));
  const accent = hex(program.look?.accent);
  const styles = `${HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
    + `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${accent}"/><bgColor indexed="64"/></patternFill></fill></fills>`
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return zip([
    { name: '[Content_Types].xml', data: `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `${HEAD}<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${NS_OD}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `${HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS_OD}"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `${HEAD}<Relationships xmlns="${NS_REL}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_OD}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${NS_OD}/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: styles },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ]);
}
