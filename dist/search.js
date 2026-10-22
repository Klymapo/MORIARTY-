// MORIARTY — buscar y reemplazar en todo el libro (texto, títulos, fichas, acontecimientos, hitos).
import {snapshot} from './model.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function buildRegex(query, {caseSensitive = false, wholeWord = false} = {}) {
  if (!query) return null;
  let src = escapeRe(query);
  if (wholeWord) src = `(?<![\\p{L}\\p{N}_])${src}(?![\\p{L}\\p{N}_])`;
  return new RegExp(src, (caseSensitive ? '' : 'i') + 'gu');
}

// Lugares donde se puede buscar: cada uno con get/set sobre el proyecto.
export function fields(p) {
  const out = [];
  p.chapters
    .filter((c) => !c.trashed)
    .forEach((c, ci) => {
      out.push({where: `Capítulo ${ci + 1}`, what: 'título', kind: 'chapter', chapter: c, get: () => c.title, set: (v) => (c.title = v)});
      out.push({where: `Capítulo ${ci + 1}`, what: 'resumen', kind: 'chapter', chapter: c, get: () => c.summary, set: (v) => (c.summary = v)});
      out.push({where: `Capítulo ${ci + 1}`, what: 'punto de vista', kind: 'chapter', chapter: c, get: () => c.pov, set: (v) => (c.pov = v)});
      c.scenes.forEach((s) => {
        out.push({where: `${c.title} › ${s.title}`, what: 'título de escena', kind: 'scene', chapter: c, scene: s, get: () => s.title, set: (v) => (s.title = v)});
        out.push({where: `${c.title} › ${s.title}`, what: 'texto', kind: 'scene', chapter: c, scene: s, get: () => s.text, set: (v) => (s.text = v)});
      });
    });
  p.entities
    .filter((e) => !e.trashed)
    .forEach((e) => {
      out.push({where: `${e.type} · ${e.name}`, what: 'nombre', kind: 'entity', entity: e, get: () => e.name, set: (v) => (e.name = v)});
      out.push({where: `${e.type} · ${e.name}`, what: 'notas', kind: 'entity', entity: e, get: () => e.notes, set: (v) => (e.notes = v)});
      for (const k of Object.keys(e.fields)) out.push({where: `${e.type} · ${e.name}`, what: k, kind: 'entity', entity: e, get: () => e.fields[k], set: (v) => (e.fields[k] = v)});
      e.tags.forEach((_, i) => out.push({where: `${e.type} · ${e.name}`, what: 'etiqueta', kind: 'entity', entity: e, get: () => e.tags[i], set: (v) => (e.tags[i] = v)}));
      e.relations.forEach((r) => out.push({where: `${e.type} · ${e.name}`, what: 'relación', kind: 'entity', entity: e, get: () => r.label, set: (v) => (r.label = v)}));
    });
  p.events.filter((e) => !e.trashed).forEach((e) => {
    out.push({where: 'Cronología', what: e.title, kind: 'event', get: () => e.title, set: (v) => (e.title = v)});
    out.push({where: 'Cronología', what: 'cuándo', kind: 'event', get: () => e.when, set: (v) => (e.when = v)});
  });
  (p.milestones || []).forEach((m) => out.push({where: 'Tracker', what: 'fecha clave', kind: 'milestone', get: () => m.title, set: (v) => (m.title = v)}));
  return out;
}

// Resultados: una entrada por coincidencia, con contexto.
export function search(p, query, opts) {
  const re = buildRegex(query, opts);
  if (!re) return [];
  const results = [];
  for (const f of fields(p)) {
    const text = f.get() || '';
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const a = Math.max(0, m.index - 40),
        b = Math.min(text.length, m.index + m[0].length + 40);
      results.push({field: f, index: m.index, length: m[0].length, before: (a ? '…' : '') + text.slice(a, m.index), match: m[0], after: text.slice(m.index + m[0].length, b) + (b < text.length ? '…' : '')});
      if (!m[0].length) re.lastIndex++;
    }
  }
  return results;
}

// Reemplaza una coincidencia concreta (por posición). Devuelve true si se hizo.
export function replaceOne(result, replacement) {
  const text = result.field.get() || '';
  if (text.slice(result.index, result.index + result.length) !== result.match) return false;
  result.field.set(text.slice(0, result.index) + replacement + text.slice(result.index + result.length));
  return true;
}

// Reemplaza todo. Guarda una versión de cada capítulo tocado antes de cambiar su texto.
export function replaceAll(p, query, replacement, opts) {
  const re = buildRegex(query, opts);
  if (!re) return 0;
  let n = 0;
  const snapped = new Set();
  for (const f of fields(p)) {
    const text = f.get() || '';
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    if (f.kind === 'scene' && !snapped.has(f.chapter)) {
      snapshot(f.chapter, 'Antes de reemplazar');
      snapped.add(f.chapter);
    }
    re.lastIndex = 0;
    f.set(text.replace(re, () => (n++, replacement)));
  }
  return n;
}
