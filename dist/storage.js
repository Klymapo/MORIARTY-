// MORIARTY — almacenamiento principal de la biblioteca en IndexedDB.
// localStorage solo admite ~5 MB por sitio: un libro con imágenes lo llena y el guardado falla en silencio.
// IndexedDB admite cientos de MB. localStorage queda como respaldo si IndexedDB no existe (navegación privada antigua).
import {LIBRARY_KEY, LEGACY_KEY, loadLibrary, validateLibrary} from './library.js';

const DB = 'moriarty-datos',
  STORE = 'kv',
  KEY = 'biblioteca',
  MOVED = 'biblioteca-localstorage-migrada';

let dbp = null;
function db() {
  if (!dbp)
    dbp = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) return reject(Error('Sin IndexedDB'));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(Error('IndexedDB bloqueado'));
    });
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || Error('Escritura cancelada'));
  });
}

export let backend = 'indexeddb';

// Carga: IndexedDB primero; si está vacío, migra lo que haya en localStorage (V0.1–V0.4.4).
// La copia de localStorage no se borra: se mueve a IndexedDB con otro nombre y se libera el espacio.
export async function loadStored(storage = localStorage) {
  let raw;
  try {
    raw = await idb('readonly', (s) => s.get(KEY));
  } catch {
    backend = 'localstorage';
    return loadLibrary(storage);
  }
  if (typeof raw === 'string') return {library: validateLibrary(JSON.parse(raw)), migrated: false};
  // Primera vez con IndexedDB.
  const result = loadLibrary(storage); // lanza si lo guardado está dañado: la app lo trata como antes
  const old = storage.getItem(LIBRARY_KEY);
  try {
    await idb('readwrite', (s) => {
      s.put(JSON.stringify(result.library), KEY);
      if (old !== null) s.put(old, MOVED);
    });
    if (old !== null) storage.removeItem(LIBRARY_KEY);
  } catch {
    backend = 'localstorage';
  }
  return {library: result.library, migrated: result.migrated || old !== null};
}

// Guardado: escrituras en serie; si llega otra mientras una está en curso, se guarda solo la última.
let pending = null,
  running = null;
export function store(library, storage = localStorage) {
  const text = JSON.stringify(library);
  if (backend === 'localstorage') {
    storage.setItem(LIBRARY_KEY, text); // lanza QuotaExceededError si no cabe
    return Promise.resolve();
  }
  pending = text;
  if (!running)
    running = (async () => {
      try {
        while (pending !== null) {
          const t = pending;
          pending = null;
          await idb('readwrite', (s) => s.put(t, KEY));
        }
      } finally {
        running = null;
      }
    })();
  return running;
}
// Copia cruda de lo guardado, para descargarla si algo no se puede leer.
export async function rawStored(storage = localStorage) {
  const out = [];
  try {
    for (const k of [KEY, MOVED]) {
      const v = await idb('readonly', (s) => s.get(k));
      if (typeof v === 'string') out.push([k, v]);
    }
  } catch {}
  for (const k of [LIBRARY_KEY, LEGACY_KEY]) {
    const v = storage.getItem(k);
    if (v !== null) out.push([k, v]);
  }
  return out;
}
export const storeName = () => (backend === 'indexeddb' ? 'IndexedDB' : 'localStorage');
