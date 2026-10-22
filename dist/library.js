import {uid, createProject, validate} from './model.js';
export const LIBRARY_KEY = 'moriarty.library.v1';
export const LEGACY_KEY = 'moriarty.project.v1';
const safeId = (x) => typeof x === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(x);
const fail = () => {
  throw Error('Biblioteca MORIARTY inválida o de versión incompatible.');
};
export function createLibrary(project = createProject('Mi primer libro')) {
  const book = {project: validate(project), sagaId: '', synopsis: ''};
  return {
    kind: 'moriarty-library',
    schemaVersion: 1,
    activeBookId: book.project.id,
    books: [book],
    sagas: [],
  };
}
export function validateLibrary(data) {
  if (
    !data ||
    data.kind !== 'moriarty-library' ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.books) ||
    !data.books.length ||
    !Array.isArray(data.sagas)
  )
    fail();
  const sagas = new Set(),
    books = new Set();
  for (const s of data.sagas) {
    if (
      !s ||
      !safeId(s.id) ||
      sagas.has(s.id) ||
      typeof s.title !== 'string' ||
      !s.title.trim() ||
      typeof s.description !== 'string'
    )
      fail();
    sagas.add(s.id);
  }
  for (const b of data.books) {
    if (
      !b ||
      typeof b.synopsis !== 'string' ||
      typeof b.sagaId !== 'string' ||
      (b.sagaId && !sagas.has(b.sagaId)) ||
      (b.trashed !== undefined && typeof b.trashed !== 'boolean')
    )
      fail();
    validate(b.project);
    if (books.has(b.project.id)) fail();
    books.add(b.project.id);
  }
  if (!books.has(data.activeBookId)) fail();
  return structuredClone(data);
}
export function loadLibrary(storage) {
  const raw = storage.getItem(LIBRARY_KEY);
  if (raw !== null) return {library: validateLibrary(JSON.parse(raw)), migrated: false};
  const old = storage.getItem(LEGACY_KEY);
  return {
    library: createLibrary(old !== null ? validate(JSON.parse(old)) : undefined),
    migrated: old !== null,
  };
}
export const activeBook = (library) => library.books.find((b) => b.project.id === library.activeBookId);
export function addBook(library, title, sagaId = '', synopsis = '') {
  if (!title.trim()) throw Error('Escribe un título para el libro.');
  if (sagaId && !library.sagas.some((s) => s.id === sagaId)) throw Error('La saga no existe.');
  const book = {project: createProject(title.trim()), sagaId, synopsis};
  library.books.push(book);
  library.activeBookId = book.project.id;
  return book;
}
export function addSaga(library, title, description = '') {
  if (!title.trim()) throw Error('Escribe un nombre para la saga.');
  const saga = {id: uid(), title: title.trim(), description};
  library.sagas.push(saga);
  return saga;
}
export function moveBook(library, id, delta) {
  const book = library.books.find((b) => b.project.id === id);
  if (!book || ![1, -1].includes(delta)) return;
  const group = library.books.filter((b) => b.sagaId === book.sagaId && !b.trashed);
  const target = group[group.indexOf(book) + delta];
  if (!target) return;
  const i = library.books.indexOf(book),
    j = library.books.indexOf(target);
  [library.books[i], library.books[j]] = [library.books[j], library.books[i]];
}
export function cloneProject(project) {
  const p = validate(project),
    ids = new Map();
  const remap = (id) => {
    if (!ids.has(id)) ids.set(id, uid());
    return ids.get(id);
  };
  p.id = remap(p.id);
  for (const c of p.chapters) {
    c.id = remap(c.id);
    for (const s of c.scenes) s.id = remap(s.id);
    for (const v of c.versions) {
      v.id = remap(v.id);
      for (const s of v.scenes) s.id = remap(s.id);
    }
  }
  for (const e of p.entities) e.id = remap(e.id);
  for (const c of p.chapters) c.entityIds = c.entityIds.map(remap);
  for (const e of p.entities) e.relations = e.relations.map((r) => ({...r, targetId: remap(r.targetId)}));
  for (const e of p.events) {
    e.id = remap(e.id);
    if (e.chapterId) e.chapterId = remap(e.chapterId);
  }
  for (const r of p.reviews) {
    r.id = remap(r.id);
    r.chapterId = remap(r.chapterId);
    r.sceneId = remap(r.sceneId);
  }
  return validate(p);
}
export function importIntoLibrary(library, data) {
  // Validate the whole import before changing the current collection.
  const incoming = data?.kind === 'moriarty-library' ? validateLibrary(data) : createLibrary(validate(data));
  const next = structuredClone(library),
    sagas = new Map();
  for (const s of incoming.sagas) {
    const id = uid();
    sagas.set(s.id, id);
    next.sagas.push({...s, id});
  }
  const imported = incoming.books.map((b) => ({
    project: cloneProject(b.project),
    sagaId: sagas.get(b.sagaId) || '',
    synopsis: b.synopsis,
    trashed: false,
  }));
  next.books.push(...imported);
  next.activeBookId = imported.find(
    (b, i) => incoming.books[i].project.id === incoming.activeBookId,
  ).project.id;
  return validateLibrary(next);
}

// ---- Papelera de libros (no destructiva hasta "Eliminar definitivamente") ----
export const liveBooks = (library) => library.books.filter((b) => !b.trashed);
function ensureActive(library) {
  const active = activeBook(library);
  if (active && !active.trashed) return;
  const next = liveBooks(library)[0] || addBook(library, 'Mi nuevo libro');
  library.activeBookId = next.project.id;
}
export function trashBook(library, id) {
  const book = library.books.find((b) => b.project.id === id);
  if (!book) throw Error('El libro no existe.');
  book.trashed = true;
  ensureActive(library);
  return book;
}
export function restoreBook(library, id) {
  const book = library.books.find((b) => b.project.id === id);
  if (!book) throw Error('El libro no existe.');
  book.trashed = false;
  return book;
}
export function purgeBook(library, id) {
  const i = library.books.findIndex((b) => b.project.id === id);
  if (i < 0) throw Error('El libro no existe.');
  if (!library.books[i].trashed) throw Error('Primero envía el libro a la papelera.');
  library.books.splice(i, 1);
  ensureActive(library);
}
