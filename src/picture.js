// A picture of the program, 1080 pixels wide: what people post in a group
// chat or on a church page. Drawn on a canvas in the browser, so nothing is
// uploaded anywhere.
import { clockAt, dateLabel, timed } from './model.mjs';

const WIDTH = 1080;
const PAD = 84;
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width > width && line) { lines.push(line); line = word; } else line = tryLine;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Every block to draw, top to bottom, each with its own height. */
function layout(ctx, program, opt) {
  const blocks = [];
  const add = (font, color, text, gap, { align = 'left', size, indent = 0 } = {}) => {
    ctx.font = font;
    const rows = wrap(ctx, text, WIDTH - PAD * 2 - indent);
    blocks.push({ font, color, rows, gap, align, size, indent });
  };
  const serifHead = program.look.style !== 'clean';
  const centre = program.look.style === 'classic' ? 'center' : 'left';
  if (program.church) add(`600 26px ${SANS}`, program.look.accent, program.church.toUpperCase(), 0, { align: centre, size: 34 });
  add(`600 64px ${serifHead ? SERIF : SANS}`, '#1c1917', program.title, 14, { align: centre, size: 74 });
  const when = program.kind === 'service' ? dateLabel(program.date) : '';
  if (when) add(`400 30px ${SANS}`, '#57534e', when, 10, { align: centre, size: 40 });
  if (program.theme) add(`italic 400 32px ${SERIF}`, '#44403c', program.theme, 10, { align: centre, size: 42 });

  const lineRow = line => [line.part, line.detail].filter(Boolean).join(' — ') + (opt.leaders && line.who ? `  ·  ${line.who}` : '');
  if (program.kind === 'service') {
    for (const s of program.sections) {
      add(`700 28px ${SANS}`, program.look.accent, [s.title.toUpperCase(), clockAt(s.time)].filter(Boolean).join('   '), 46, { size: 38 });
      for (const l of timed(s.lines, s.time).filter(l => l.part || l.detail)) add(`400 30px ${SANS}`, '#292524', lineRow(l), 10, { size: 42, indent: 0 });
    }
  } else {
    program.nights.forEach((n, i) => {
      add(`700 28px ${SANS}`, program.look.accent, `NIGHT ${i + 1}${n.date ? `  ·  ${dateLabel(n.date, { weekday: true })}` : ''}`, 40, { size: 38 });
      add(`600 34px ${serifHead ? SERIF : SANS}`, '#1c1917', n.topic || 'Topic to be announced', 6, { size: 44 });
      if (n.speaker || n.time) add(`400 28px ${SANS}`, '#57534e', [clockAt(n.time), n.speaker].filter(Boolean).join('  ·  '), 4, { size: 38 });
    });
  }
  if (program.venue) add(`400 28px ${SANS}`, '#57534e', program.venue, 46, { align: centre, size: 38 });
  return blocks;
}

export function drawProgram(program, opt, doc = document) {
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const blocks = layout(ctx, program, opt);
  const height = Math.max(1080, PAD * 2 + 24 + blocks.reduce((h, b) => h + b.gap + b.rows.length * b.size, 0));
  canvas.width = WIDTH;
  canvas.height = Math.ceil(height);
  const warm = program.look.style === 'warm';
  ctx.fillStyle = warm ? '#fbf6ec' : '#ffffff';
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  ctx.fillStyle = program.look.accent;
  ctx.fillRect(0, 0, WIDTH, 14);
  let y = PAD;
  for (const b of blocks) {
    y += b.gap;
    ctx.font = b.font;
    ctx.fillStyle = b.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = b.align;
    for (const row of b.rows) {
      ctx.fillText(row, b.align === 'center' ? WIDTH / 2 : PAD + b.indent, y);
      y += b.size;
    }
  }
  ctx.textAlign = 'left';
  return canvas;
}

export function programPicture(program, opt) {
  const canvas = drawProgram(program, opt);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No picture'))), 'image/png'));
}
