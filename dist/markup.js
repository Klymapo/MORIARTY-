// MORIARTY — marcado ligero del manuscrito. El texto sigue siendo texto plano (portable, editable desde un chat).
//   *cursiva*   **negrita**   __subrayado__
//   > párrafo con sangría (cita)        -> párrafo centrado <-
//   ---  (línea sola) salto de página    ***  (línea sola) separador de escena
//   ![descripción](asset:ID) imagen guardada en el libro (p.assets)
// La letra capital se aplica al primer párrafo de cada capítulo al leer y exportar (p.style.dropCap).

const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

// Inline → [{t, i?, b?, u?}]
export function inlines(text) {
  const out = [];
  const re = /(\*\*([^*\n]+)\*\*)|(__([^_\n]+)__)|(\*([^*\n]+)\*)/g;
  let last = 0,
    m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({t: text.slice(last, m.index)});
    if (m[1]) out.push({t: m[2], b: true});
    else if (m[3]) out.push({t: m[4], u: true});
    else out.push({t: m[6], i: true});
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({t: text.slice(last)});
  // Anidados simples: negrita dentro de cursiva, etc. (segunda pasada sobre segmentos con marcas internas)
  return out.flatMap((s) => {
    if (!/\*|__/.test(s.t) || (!s.i && !s.b && !s.u)) return [s];
    return inlines(s.t).map((x) => ({...x, i: x.i || s.i, b: x.b || s.b, u: x.u || s.u}));
  });
}

// Bloques: párrafos separados por línea en blanco; líneas especiales solas.
export function blocks(text) {
  const out = [];
  const chunks = text.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/);
  for (let chunk of chunks) {
    chunk = chunk.trim();
    if (!chunk) continue;
    for (const line of chunk.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      if (l === '---') out.push({type: 'break'});
      else if (/^\*\s*\*\s*\*$/.test(l)) out.push({type: 'sep'});
      else if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(l)) {
        const m = l.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        out.push({type: 'image', alt: m[1], src: m[2]});
      } else if (l.startsWith('> ')) out.push({type: 'quote', inlines: inlines(l.slice(2))});
      else if (l.startsWith('->') && l.endsWith('<-')) out.push({type: 'center', inlines: inlines(l.slice(2, -2).trim())});
      else {
        const prev = out.at(-1);
        // líneas consecutivas sin línea en blanco: mismo párrafo (como en un editor de texto)
        if (prev && prev.type === 'p' && prev.joinable) prev.inlines.push({t: '\n'}, ...inlines(l));
        else out.push({type: 'p', inlines: inlines(l), joinable: true});
      }
    }
    const last = out.at(-1);
    if (last) last.joinable = false;
  }
  return out;
}

const inlineHtml = (segs) =>
  segs
    .map((s) => {
      let h = esc(s.t).replace(/\n/g, '<br>');
      if (s.i) h = `<em>${h}</em>`;
      if (s.b) h = `<strong>${h}</strong>`;
      if (s.u) h = `<u>${h}</u>`;
      return h;
    })
    .join('');

// HTML para leer, imprimir y EPUB. assets: {id: {data, alt}}; resolver una imagen devuelve su src real.
export function toHtml(text, {assets = {}, dropCap = false, imageSrc = (src) => (src.startsWith('asset:') ? assets[src.slice(6)]?.data || '' : '')} = {}) {
  let first = dropCap;
  return blocks(text)
    .map((b) => {
      if (b.type === 'break') return '<div class="page-break"></div>';
      if (b.type === 'sep') return '<p class="sep">* * *</p>';
      if (b.type === 'image') {
        const src = imageSrc(b.src);
        return src ? `<figure><img src="${esc(src)}" alt="${esc(b.alt)}">${b.alt ? `<figcaption>${esc(b.alt)}</figcaption>` : ''}</figure>` : `<p class="muted">[imagen no encontrada: ${esc(b.alt || b.src)}]</p>`;
      }
      if (b.type === 'quote') return `<blockquote><p>${inlineHtml(b.inlines)}</p></blockquote>`;
      if (b.type === 'center') return `<p class="center">${inlineHtml(b.inlines)}</p>`;
      const cls = first ? ' class="dropcap"' : '';
      first = false;
      return `<p${cls}>${inlineHtml(b.inlines)}</p>`;
    })
    .join('');
}

export const plain = (text) =>
  blocks(text)
    .filter((b) => b.inlines)
    .map((b) => b.inlines.map((s) => s.t).join(''))
    .join('\n\n');

// Ayudas para la barra de formato: envolver/desenvolver una selección del textarea.
export function toggleWrap(ta, mark) {
  const {selectionStart: a, selectionEnd: b, value: v} = ta;
  const sel = v.slice(a, b);
  const n = mark.length;
  if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= 2 * n) {
    const inner = sel.slice(n, -n);
    ta.setRangeText(inner, a, b, 'select');
  } else if (v.slice(a - n, a) === mark && v.slice(b, b + n) === mark) {
    ta.setRangeText(sel, a - n, b + n, 'select');
  } else {
    const text = sel || 'texto';
    ta.setRangeText(mark + text + mark, a, b, 'end');
    ta.setSelectionRange(a + n, a + n + text.length);
  }
  ta.dispatchEvent(new Event('input', {bubbles: true}));
  ta.focus();
}
// Prefijo de línea (sangría "> " o centrado "-> <-") sobre las líneas de la selección.
export function toggleLine(ta, kind) {
  const {selectionStart: a, selectionEnd: b, value: v} = ta;
  const start = v.lastIndexOf('\n', a - 1) + 1;
  const endIdx = v.indexOf('\n', b);
  const end = endIdx < 0 ? v.length : endIdx;
  const lines = v.slice(start, end).split('\n');
  const changed = lines.map((l) => {
    if (kind === 'quote') return l.startsWith('> ') ? l.slice(2) : '> ' + l;
    const t = l.trim();
    return t.startsWith('->') && t.endsWith('<-') ? t.slice(2, -2).trim() : `-> ${t} <-`;
  });
  ta.setRangeText(changed.join('\n'), start, end, 'select');
  ta.dispatchEvent(new Event('input', {bubbles: true}));
  ta.focus();
}
export function insertBlock(ta, text) {
  const {selectionStart: a, value: v} = ta;
  const before = v.slice(0, a);
  const pad = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const after = v.slice(a);
  const padAfter = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
  ta.setRangeText(pad + text + padAfter, a, a, 'end');
  ta.dispatchEvent(new Event('input', {bubbles: true}));
  ta.focus();
}
// Autocorrecciones al escribir: "--" → "—", "..." → "…"
export function autoReplace(ta) {
  const a = ta.selectionStart;
  const v = ta.value;
  const two = v.slice(a - 2, a),
    three = v.slice(a - 3, a);
  if (three === '...') {
    ta.setRangeText('…', a - 3, a, 'end');
    return true;
  }
  if (two === '--') {
    ta.setRangeText('—', a - 2, a, 'end');
    return true;
  }
  return false;
}
