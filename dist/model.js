// MORIARTY — dominio del libro. Formato JSON v2 (compatible con v1 mediante migración).
export const SCHEMA = 2;
export const ENTITY_TYPES = ['Personaje', 'Lugar', 'Objeto', 'Nota'];
export const STATUSES = ['idea', 'borrador', 'revisado', 'listo'];
export const STATUS_LABEL = {idea: 'Idea', borrador: 'Borrador', revisado: 'Revisado', listo: 'Listo'};
// Campos fijos por tipo de ficha (decisión de Admin, 2026-10-22).
export const FIELDS = {
  Personaje: [
    ['edad', 'Edad'],
    ['rol', 'Rol en la historia'],
  ],
  Lugar: [['region', 'Región']],
  Objeto: [['dueno', 'Dueño']],
  Nota: [],
};
export const IMAGE_LIMIT = 1.5 * 1024 * 1024; // caracteres del data URL

export const uid = () => globalThis.crypto.randomUUID();
export const scene = (title = 'Nueva escena', text = '') => ({id: uid(), title, text});
export const chapter = () => ({
  id: uid(),
  title: 'Nuevo capítulo',
  act: 1,
  x: 40,
  y: 40,
  summary: '',
  pov: '',
  status: 'borrador',
  color: '',
  entityIds: [],
  scenes: [scene()],
  versions: [],
  trashed: false,
});
export const entity = (type = 'Personaje') => ({
  id: uid(),
  type,
  name: 'Nueva ficha',
  notes: '',
  image: '',
  color: '',
  tags: [],
  fields: {},
  relations: [],
  x: null,
  y: null,
  trashed: false,
});
export const event = () => ({id: uid(), title: 'Nuevo acontecimiento', when: '', order: 0, chapterId: '', trashed: false});
export const goals = () => ({daily: 500, total: 80000, chapter: 3000, deadline: ''});
export const milestone = (date = '', title = '') => ({id: uid(), date, title, done: false});
export function createProject(title = 'Mi nueva novela') {
  return {
    schemaVersion: SCHEMA,
    id: uid(),
    title,
    cover: '',
    chapters: [chapter()],
    entities: [],
    events: [],
    reviews: [],
    goals: goals(),
    milestones: [],
    log: {},
    assets: {},
    style: {dropCap: true},
  };
}
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (x) => typeof x === 'string';
const safeId = (x) => str(x) && /^[A-Za-z0-9_-]{1,128}$/.test(x);
const color = (x) => x === '' || (str(x) && /^#[0-9a-fA-F]{6}$/.test(x));
const image = (x) =>
  x === '' ||
  (str(x) && x.length <= IMAGE_LIMIT && /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(x));
const fail = (msg = 'Archivo MORIARTY inválido o de versión incompatible.') => {
  throw Error(msg);
};

// v1 → v2: añade los campos nuevos con valores vacíos. No destruye nada.
export function migrate(p) {
  if (!p || typeof p !== 'object') return p;
  if (p.schemaVersion !== 1 && p.schemaVersion !== SCHEMA) return p;
  // También rellena campos omitidos en archivos v2 escritos a mano (p. ej. generados desde un chat).
  const q = structuredClone(p);
  q.schemaVersion = SCHEMA;
  q.cover ??= '';
  for (const c of q.chapters || []) {
    c.summary ??= '';
    c.pov ??= '';
    c.status ??= 'borrador';
    c.color ??= '';
    c.entityIds ??= [];
  }
  for (const e of q.entities || []) {
    e.image ??= '';
    e.color ??= '';
    e.tags ??= [];
    e.fields ??= {};
    e.relations ??= [];
    e.x ??= null;
    e.y ??= null;
  }
  q.goals = {...goals(), ...(q.goals && typeof q.goals === 'object' ? q.goals : {})};
  q.assets ??= {};
  q.style = {dropCap: true, ...(q.style && typeof q.style === 'object' ? q.style : {})};
  q.milestones ??= [];
  q.log ??= {};
  (q.events || []).forEach((e, i) => (e.order ??= i));
  return q;
}

export function validate(input) {
  const p = migrate(input);
  const ids = new Set();
  const id = (x) => {
    if (!safeId(x) || ids.has(x)) fail();
    ids.add(x);
  };
  if (
    !p ||
    p.schemaVersion !== SCHEMA ||
    !str(p.title) ||
    !image(p.cover) ||
    !Array.isArray(p.chapters) ||
    !p.chapters.length ||
    !Array.isArray(p.entities) ||
    !Array.isArray(p.events) ||
    !Array.isArray(p.reviews)
  )
    fail();
  id(p.id);
  const scenes = (a) => {
    if (!Array.isArray(a) || !a.length) fail();
    const seen = new Set();
    for (const s of a) {
      if (!s || !safeId(s.id) || seen.has(s.id) || !str(s.title) || !str(s.text)) fail();
      seen.add(s.id);
    }
  };
  const strList = (a) => Array.isArray(a) && a.every((t) => str(t) && t.length <= 64);
  for (const e of p.entities) {
    if (
      !e ||
      !str(e.name) ||
      !str(e.notes) ||
      !ENTITY_TYPES.includes(e.type) ||
      typeof e.trashed !== 'boolean' ||
      !image(e.image) ||
      !color(e.color) ||
      !strList(e.tags) ||
      !e.fields ||
      typeof e.fields !== 'object' ||
      Array.isArray(e.fields) ||
      !Object.entries(e.fields).every(([k, v]) => /^[a-z]{1,32}$/.test(k) && str(v)) ||
      !Array.isArray(e.relations) ||
      !((e.x === null && e.y === null) || (Number.isFinite(e.x) && Number.isFinite(e.y)))
    )
      fail();
    id(e.id);
  }
  const entityIds = new Set(p.entities.map((e) => e.id));
  for (const c of p.chapters) {
    if (
      !c ||
      !str(c.title) ||
      !Number.isInteger(c.act) ||
      c.act < 1 ||
      c.act > 3 ||
      !Number.isFinite(c.x) ||
      !Number.isFinite(c.y) ||
      typeof c.trashed !== 'boolean' ||
      !Array.isArray(c.versions) ||
      !str(c.summary) ||
      !str(c.pov) ||
      !STATUSES.includes(c.status) ||
      !color(c.color) ||
      !Array.isArray(c.entityIds) ||
      !c.entityIds.every((x) => entityIds.has(x))
    )
      fail();
    id(c.id);
    scenes(c.scenes);
    for (const s of c.scenes) id(s.id);
    for (const v of c.versions) {
      if (!v || !str(v.label) || !str(v.date)) fail();
      id(v.id);
      scenes(v.scenes);
    }
  }
  const chapterIds = new Set(p.chapters.map((c) => c.id));
  for (const e of p.entities)
    for (const r of e.relations)
      if (!r || !str(r.label) || r.label.length > 120 || !(entityIds.has(r.targetId) || chapterIds.has(r.targetId)))
        fail();
  for (const e of p.events) {
    if (
      !e ||
      !str(e.title) ||
      !str(e.when) ||
      !Number.isFinite(e.order) ||
      !str(e.chapterId) ||
      typeof e.trashed !== 'boolean' ||
      (e.chapterId && !chapterIds.has(e.chapterId))
    )
      fail();
    id(e.id);
  }
  const g = p.goals;
  if (
    !g ||
    typeof g !== 'object' ||
    ![g.daily, g.total, g.chapter].every((n) => Number.isInteger(n) && n >= 0 && n <= 10000000) ||
    !(g.deadline === '' || (str(g.deadline) && DATE_RE.test(g.deadline)))
  )
    fail();
  if (!p.assets || typeof p.assets !== 'object' || Array.isArray(p.assets)) fail();
  for (const [k, a] of Object.entries(p.assets)) if (!safeId(k) || !a || !str(a.alt) || !image(a.data) || a.data === '') fail();
  if (!p.style || typeof p.style.dropCap !== 'boolean') fail();
  if (!Array.isArray(p.milestones)) fail();
  for (const m of p.milestones) {
    if (!m || !str(m.title) || m.title.length > 200 || !(m.date === '' || DATE_RE.test(m.date)) || typeof m.done !== 'boolean') fail();
    id(m.id);
  }
  if (!p.log || typeof p.log !== 'object' || Array.isArray(p.log)) fail();
  for (const [k, v] of Object.entries(p.log))
    if (!DATE_RE.test(k) || !v || !Number.isInteger(v.start) || !Number.isInteger(v.end) || v.start < 0 || v.end < 0) fail();
  for (const r of p.reviews) {
    if (
      !r ||
      !str(r.base) ||
      !str(r.proposal) ||
      !safeId(r.sceneId) ||
      !safeId(r.chapterId) ||
      !str(r.instruction) ||
      !chapterIds.has(r.chapterId)
    )
      fail();
    id(r.id);
  }
  return structuredClone(p);
}

export function snapshot(c, label = 'Versión manual') {
  const v = {id: uid(), label, date: new Date().toISOString(), scenes: structuredClone(c.scenes)};
  c.versions.push(v);
  return v;
}
export function restore(c, id) {
  const v = c.versions.find((v) => v.id === id);
  if (!v) throw Error('Versión inexistente');
  const copy = structuredClone(v.scenes);
  snapshot(c, 'Antes de recuperar');
  c.scenes = copy;
}
export function applyReview(s, r, text = r.proposal) {
  if (s.text !== r.base) throw Error('El original cambió. Conservamos la propuesta, pero debes iniciar otra revisión.');
  s.text = text;
}
// Respuesta de revisión (la escribe una IA o una persona a partir de MORIARTY_SOLICITUD.json).
export function validateReviewResponse(data) {
  if (!data || data.kind !== 'review-response') return null;
  if (!safeId(data.reviewId) || !str(data.proposal)) fail('Respuesta de revisión inválida: faltan reviewId o proposal.');
  return {reviewId: data.reviewId, proposal: data.proposal, notes: str(data.notes) ? data.notes : ''};
}
// Bitácora diaria de palabras: log[fecha] = {start, end}. Devuelve las palabras escritas hoy.
export function logWords(p, total, today = new Date().toISOString().slice(0, 10)) {
  const days = Object.keys(p.log).sort();
  const last = days.filter((d) => d < today).at(-1);
  if (!p.log[today]) p.log[today] = {start: last ? p.log[last].end : total, end: total};
  else p.log[today].end = total;
  return p.log[today].end - p.log[today].start;
}

// ---- Paquetes parciales (kind: moriarty-pack) ----
// Permiten cargar solo fichas, solo capítulos o solo acontecimientos en el libro activo.
// Los IDs del paquete son locales al paquete: se reasignan al incorporarlos.
export function createPack(project, parts = {entities: true, chapters: true, events: true}) {
  const p = validate(project);
  const pack = {kind: 'moriarty-pack', schemaVersion: SCHEMA, bookId: p.id, title: p.title, entities: [], chapters: [], events: []};
  if (parts.entities) pack.entities = p.entities.filter((e) => !e.trashed);
  if (parts.chapters)
    pack.chapters = p.chapters
      .filter((c) => !c.trashed)
      .map((c) => ({...c, versions: [], entityIds: parts.entities ? c.entityIds : []}));
  if (parts.events) pack.events = p.events.filter((e) => !e.trashed).map((e) => ({...e, chapterId: parts.chapters ? e.chapterId : ''}));
  return pack;
}

export function validatePack(data) {
  if (!data || data.kind !== 'moriarty-pack' || data.schemaVersion !== SCHEMA) fail('Paquete MORIARTY inválido.');
  const entities = Array.isArray(data.entities) ? data.entities : [];
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  const events = Array.isArray(data.events) ? data.events : [];
  if (!entities.length && !chapters.length && !events.length) fail('El paquete está vacío.');
  if (data.bookId !== undefined && !safeId(data.bookId)) fail('Paquete MORIARTY inválido.');
  // Las referencias pueden apuntar a piezas que no vienen en el paquete (ya existen en el libro).
  // Se validan por forma aquí y se resuelven al incorporarlas.
  const refsOk = (a) => Array.isArray(a) && a.every((x) => safeId(x));
  const relsOk = (a) => a === undefined || (Array.isArray(a) && a.every((r) => r && safeId(r.targetId) && str(r.label) && r.label.length <= 120));
  if (!entities.every((e) => e && relsOk(e.relations))) fail('Paquete MORIARTY inválido.');
  if (!chapters.every((c) => c && (c.entityIds === undefined || refsOk(c.entityIds)))) fail('Paquete MORIARTY inválido.');
  if (!events.every((e) => e && (e.chapterId === undefined || e.chapterId === '' || safeId(e.chapterId)))) fail('Paquete MORIARTY inválido.');
  // Validación completa con un proyecto sintético, sin las referencias externas.
  const probe = createProject(str(data.title) ? data.title : 'Paquete');
  probe.entities = entities.map((e) => ({...entity(e.type), ...e, relations: [], trashed: false}));
  probe.chapters = chapters.length ? chapters.map((c) => ({...chapter(), ...c, entityIds: [], versions: [], trashed: false})) : probe.chapters;
  probe.events = events.map((e, i) => ({...event(), order: i, ...e, chapterId: '', trashed: false}));
  const ok = validate(probe);
  ok.entities.forEach((e, i) => (e.relations = structuredClone(entities[i].relations || [])));
  if (chapters.length) ok.chapters.forEach((c, i) => (c.entityIds = [...(chapters[i].entityIds || [])]));
  ok.events.forEach((e, i) => (e.chapterId = events[i].chapterId || ''));
  return {bookId: data.bookId || '', entities: ok.entities, chapters: chapters.length ? ok.chapters : [], events: ok.events};
}

// Capítulo suelto con su texto, sus fichas vinculadas y sus acontecimientos.
export function createChapterPack(project, chapterId) {
  const p = validate(project);
  const c = p.chapters.find((x) => x.id === chapterId);
  if (!c) throw Error('El capítulo no existe.');
  const entities = p.entities.filter((e) => c.entityIds.includes(e.id));
  return {
    kind: 'moriarty-pack',
    schemaVersion: SCHEMA,
    bookId: p.id,
    bookTitle: p.title,
    title: c.title,
    exportedAt: new Date().toISOString(),
    chapters: [{...c, versions: []}],
    entities,
    events: p.events.filter((e) => !e.trashed && e.chapterId === c.id),
  };
}

// ¿Qué piezas del paquete ya existen en este libro? Solo aplica si el paquete salió de este mismo libro.
export function packConflicts(project, data) {
  const pack = validatePack(data);
  if (pack.bookId !== project.id) return {sameBook: false, chapters: [], entities: []};
  return {
    sameBook: true,
    chapters: pack.chapters.filter((c) => project.chapters.some((x) => x.id === c.id)).map((c) => c.title),
    entities: pack.entities.filter((e) => project.entities.some((x) => x.id === e.id)).map((e) => e.name),
  };
}

// Incorpora un paquete validado al proyecto. Devuelve un proyecto nuevo validado; no toca el original.
// replace=true (solo si el paquete salió de este libro): actualiza por ID; el texto anterior queda como versión.
export function mergePack(project, data, {replace = false} = {}) {
  const pack = validatePack(data);
  const p = structuredClone(project);
  const sameBook = replace && pack.bookId === p.id;
  const ids = new Map();
  const remap = sameBook ? (x) => x : (old) => (ids.has(old) ? ids.get(old) : (ids.set(old, uid()), ids.get(old)));
  const packIds = new Set([...pack.entities.map((e) => e.id), ...pack.chapters.map((c) => c.id)]);
  // Las referencias a piezas fuera del paquete solo se conservan si existen en el libro.
  const resolve = (id) => (packIds.has(id) ? remap(id) : p.entities.some((e) => e.id === id) || p.chapters.some((c) => c.id === id) ? id : null);
  for (const e of pack.entities) {
    e.relations = e.relations.map((r) => ({...r, targetId: resolve(r.targetId)})).filter((r) => r.targetId);
    e.id = remap(e.id);
  }
  for (const c of pack.chapters) {
    c.entityIds = c.entityIds.map(resolve).filter(Boolean);
    c.id = remap(c.id);
    for (const sc of c.scenes) sc.id = remap(sc.id);
  }
  let order = p.events.length ? Math.max(...p.events.map((e) => e.order)) + 1 : 0;
  for (const e of pack.events) {
    e.chapterId = e.chapterId ? resolve(e.chapterId) || '' : '';
    e.id = remap(e.id);
  }
  const upsert = (list, item, onReplace) => {
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = onReplace(list[i], item);
    else return true;
    return false;
  };
  let n = p.chapters.length;
  for (const e of pack.entities) if (upsert(p.entities, e, (_, x) => ({...x, trashed: false}))) p.entities.push(e);
  for (const c of pack.chapters) {
    const added = upsert(p.chapters, c, (old, x) => {
      snapshot(old, 'Antes de importar');
      return {...x, x: old.x, y: old.y, versions: old.versions, trashed: false};
    });
    if (added) {
      c.x = 40 + (n % 7) * 200;
      c.y = 40 + Math.floor(n / 7) * 160;
      n++;
      p.chapters.push(c);
    }
  }
  for (const e of pack.events)
    if (upsert(p.events, e, (old, x) => ({...x, order: old.order, trashed: false}))) p.events.push({...e, order: order++});
  for (const c of p.chapters) c.entityIds = c.entityIds.filter((id) => p.entities.some((e) => e.id === id));
  return validate(p);
}

export const wordCount = (p) =>
  p.chapters
    .filter((c) => !c.trashed)
    .flatMap((c) => c.scenes)
    .map((s) => s.text)
    .join(' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
