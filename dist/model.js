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
export const scene = () => ({id: uid(), title: 'Nueva escena', text: ''});
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
  trashed: false,
});
export const event = () => ({id: uid(), title: 'Nuevo acontecimiento', when: '', order: 0, chapterId: '', trashed: false});
export function createProject(title = 'Mi nueva novela') {
  return {schemaVersion: SCHEMA, id: uid(), title, cover: '', chapters: [chapter()], entities: [], events: [], reviews: []};
}

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
  }
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
      !Array.isArray(e.relations)
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
export function applyReview(s, r) {
  if (s.text !== r.base) throw Error('El original cambió. Conservamos la propuesta, pero debes iniciar otra revisión.');
  s.text = r.proposal;
}

// ---- Paquetes parciales (kind: moriarty-pack) ----
// Permiten cargar solo fichas, solo capítulos o solo acontecimientos en el libro activo.
// Los IDs del paquete son locales al paquete: se reasignan al incorporarlos.
export function createPack(project, parts = {entities: true, chapters: true, events: true}) {
  const p = validate(project);
  const pack = {kind: 'moriarty-pack', schemaVersion: SCHEMA, title: p.title, entities: [], chapters: [], events: []};
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
  // Se valida construyendo un proyecto sintético con las piezas del paquete.
  const probe = createProject(str(data.title) ? data.title : 'Paquete');
  probe.entities = entities.map((e) => ({...entity(e?.type), ...e, trashed: false}));
  probe.chapters = chapters.length ? chapters.map((c) => ({...chapter(), ...c, versions: [], trashed: false})) : probe.chapters;
  probe.events = events.map((e, i) => ({...event(), order: i, ...e, trashed: false}));
  const ok = validate(probe);
  return {entities: ok.entities, chapters: chapters.length ? ok.chapters : [], events: ok.events};
}

// Incorpora un paquete validado al proyecto. Devuelve un proyecto nuevo validado; no toca el original.
export function mergePack(project, data) {
  const pack = validatePack(data);
  const p = structuredClone(project);
  const ids = new Map();
  const remap = (old) => {
    if (!ids.has(old)) ids.set(old, uid());
    return ids.get(old);
  };
  for (const e of pack.entities) e.id = remap(e.id);
  for (const c of pack.chapters) {
    c.id = remap(c.id);
    for (const s of c.scenes) s.id = remap(s.id);
    c.entityIds = c.entityIds.map(remap);
  }
  const known = new Set([...p.entities.map((e) => e.id), ...p.chapters.map((c) => c.id), ...ids.values()]);
  for (const e of pack.entities)
    e.relations = e.relations.map((r) => ({...r, targetId: ids.get(r.targetId) || r.targetId})).filter((r) => known.has(r.targetId));
  const base = p.events.length ? Math.max(...p.events.map((e) => e.order)) + 1 : 0;
  pack.events.forEach((e, i) => {
    e.id = remap(e.id);
    e.order = base + i;
    e.chapterId = e.chapterId ? ids.get(e.chapterId) || (p.chapters.some((c) => c.id === e.chapterId) ? e.chapterId : '') : '';
  });
  const n = p.chapters.length;
  pack.chapters.forEach((c, i) => {
    c.x = 40 + ((n + i) % 7) * 200;
    c.y = 40 + Math.floor((n + i) / 7) * 160;
  });
  p.entities.push(...pack.entities);
  p.chapters.push(...pack.chapters);
  p.events.push(...pack.events);
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
