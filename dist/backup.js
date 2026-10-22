// MORIARTY — protección contra pérdidas.
// 1) Pide almacenamiento persistente al navegador (evita que Android lo borre por falta de espacio).
// 2) Respaldos automáticos rotativos de toda la biblioteca en IndexedDB (independientes de localStorage).
// 3) Versiones automáticas por capítulo mientras escribes.
import {snapshot} from './model.js';

const DB = 'moriarty-respaldos',
  STORE = 'biblioteca',
  KEEP = 10;
export const AUTO_LABEL = 'Autoguardado';
const AUTO_EVERY = 10 * 60 * 1000; // una versión automática cada 10 minutos de escritura
const AUTO_KEEP = 15; // por capítulo

export async function askPersistence() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(Error('Sin IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, {keyPath: 'at'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

// Lista de respaldos, el más reciente primero: [{at, books, words}]
export async function listBackups() {
  try {
    const db = await open();
    const all = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return all.sort((a, b) => b.at.localeCompare(a.at)).map(({at, books, words}) => ({at, books, words}));
  } catch {
    return [];
  }
}
export async function readBackup(at) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(at);
    req.onsuccess = () => resolve(req.result ? JSON.parse(req.result.data) : null);
    req.onerror = () => reject(req.error);
  });
}

let lastSaved = '';
// Guarda una copia si cambió algo desde la última. Conserva las KEEP más recientes.
export async function backupNow(library, words = 0) {
  try {
    const data = JSON.stringify(library);
    if (data === lastSaved) return false;
    const db = await open();
    const at = new Date().toISOString();
    const books = library.books.filter((b) => !b.trashed).length;
    await tx(db, 'readwrite', (s) => s.put({at, books, words, data}));
    const keys = (await listBackups()).map((b) => b.at);
    if (keys.length > KEEP) await tx(db, 'readwrite', (s) => keys.slice(KEEP).forEach((k) => s.delete(k)));
    lastSaved = data;
    return true;
  } catch {
    return false;
  }
}

// Versión automática del capítulo si pasaron AUTO_EVERY desde la última; poda las automáticas viejas.
export function autoVersion(chapter, now = Date.now()) {
  const autos = chapter.versions.filter((v) => v.label === AUTO_LABEL);
  const last = autos.at(-1);
  if (last && now - Date.parse(last.date) < AUTO_EVERY) return false;
  snapshot(chapter, AUTO_LABEL);
  const extra = chapter.versions.filter((v) => v.label === AUTO_LABEL).length - AUTO_KEEP;
  if (extra > 0) {
    let n = extra;
    chapter.versions = chapter.versions.filter((v) => !(v.label === AUTO_LABEL && n-- > 0));
  }
  return true;
}
