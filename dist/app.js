import {
  uid,
  scene,
  chapter,
  entity,
  event,
  createProject,
  validate,
  snapshot,
  restore,
  applyReview,
  createPack,
  mergePack,
  wordCount,
  STATUSES,
  STATUS_LABEL,
  FIELDS,
  ENTITY_TYPES,
} from './model.js';
import {
  LIBRARY_KEY,
  LEGACY_KEY,
  loadLibrary,
  activeBook,
  importIntoLibrary,
  validateLibrary,
  createLibrary,
} from './library.js';
import {LibraryView} from './library-view.js';
import {icon, actionIcon, decorateIcons, art} from './icons.js';
import {pickImage} from './media.js';

const $ = (s) => document.querySelector(s),
  $$ = (s, root = document) => [...root.querySelectorAll(s)],
  esc = (x) =>
    String(x).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const PREFS_KEY = 'moriarty.prefs.v1';
const SWATCHES = ['', '#286465', '#4a6b8a', '#ba8b56', '#8a6b8d', '#a3473f', '#2f6b4a', '#182b38'];

let library,
  p,
  view = 'library',
  lastView = null,
  cid,
  sid,
  free = false,
  filter = '',
  reviewId = null,
  tab = 'original',
  loadFailure = false,
  migrated = false;
let prefs = {fontSize: 19};
try {
  prefs = {...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')};
} catch {}
applyPrefs();
function applyPrefs() {
  document.documentElement.style.setProperty('--manuscript-size', prefs.fontSize + 'px');
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

try {
  ({library, migrated} = loadLibrary(localStorage));
} catch {
  library = createLibrary();
  loadFailure = true;
}
p = activeBook(library).project;

const libraryView = new LibraryView(() => library, {
  onOpen: openBook,
  onChange: () => {
    p = activeBook(library).project;
    save();
  },
  onBackup: backupLibrary,
  onImport: () => $('#file').click(),
  pickCover: () => pickImage($('#imageFile'), {max: 900, quality: 0.8}),
  notify: (t) => notify(t),
});

function openBook(id) {
  library.activeBookId = id;
  p = activeBook(library).project;
  cid = p.chapters.find((c) => !c.trashed)?.id;
  sid = current()?.scenes[0].id;
  filter = '';
  reviewId = null;
  tab = 'original';
  view = 'write';
  document.body.classList.remove('focus');
  save();
  render();
  $('#chapterTitle')?.focus();
}
function backupLibrary() {
  saveNow();
  download('MORIARTY_BIBLIOTECA.moriarty.json', JSON.stringify(library, null, 2));
}
function downloadRecovery() {
  for (const key of [LIBRARY_KEY, LEGACY_KEY]) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch {}
    if (raw !== null && raw !== undefined) download(key + '.recuperacion.txt', raw, 'text/plain');
  }
}

cid = p.chapters.find((c) => !c.trashed)?.id;
sid = current()?.scenes[0].id;
// Vuelve a donde estabas: espacio, capítulo y escena del libro activo.
if (prefs.last && prefs.last.book === p.id && !loadFailure) {
  const c = p.chapters.find((c) => c.id === prefs.last.cid && !c.trashed);
  if (c) {
    cid = c.id;
    sid = c.scenes.some((s) => s.id === prefs.last.sid) ? prefs.last.sid : c.scenes[0].id;
  }
  if (['write', 'board', 'archive', 'timeline', 'review'].includes(prefs.last.view)) view = prefs.last.view;
}
function current() {
  return p.chapters.find((c) => c.id === cid && !c.trashed);
}
function selectedScene() {
  return current()?.scenes.find((s) => s.id === sid);
}
function notify(t, ms = 4500) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove('show'), ms);
}
function busy(text, value = null) {
  const el = $('#busy');
  if (text === false) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  $('#busyText').textContent = text;
  const bar = $('#busyBar');
  if (value === null) bar.removeAttribute('value');
  else bar.value = value;
}
const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Guardado con pausa corta: cada tecla no escribe en disco, pero nada se pierde al navegar.
function setSaved(text, cls = '') {
  const el = $('#saved');
  el.textContent = text;
  el.className = cls;
}
function saveNow() {
  clearTimeout(saveNow.timer);
  saveNow.timer = null;
  if (loadFailure) {
    setSaved('Guardado bloqueado · Recupera un respaldo', 'warn');
    return false;
  }
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    setSaved('Guardado en este dispositivo');
    count();
    return true;
  } catch {
    setSaved('No se pudo guardar · Respalda la biblioteca', 'warn');
    count();
    return false;
  }
}
function save() {
  if (loadFailure) return saveNow();
  if (saveNow.timer) return;
  setSaved('Guardando…', 'busy');
  saveNow.timer = setTimeout(saveNow, 400);
}
window.addEventListener('beforeunload', () => saveNow.timer && saveNow());
document.addEventListener('visibilitychange', () => document.hidden && saveNow.timer && saveNow());

function count() {
  if (view === 'library') {
    $('#words').textContent =
      `${library.books.filter((b) => !b.trashed).length} ${library.books.filter((b) => !b.trashed).length === 1 ? 'libro' : 'libros'} · ${library.sagas.length} ${library.sagas.length === 1 ? 'saga' : 'sagas'}`;
    return;
  }
  $('#words').textContent =
    `${wordCount(p).toLocaleString('es-MX')} palabras · ${p.chapters.filter((c) => !c.trashed).length} capítulos`;
}
function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function btn(id, text, cls = '', title = '') {
  return `<button id="${id}" class="${cls}" ${title ? `title="${esc(title)}" aria-label="${esc(title)}"` : ''}>${icon(actionIcon(id))}${text ? `<span>${esc(text.replace(/^[＋←]\s*/u, ''))}</span>` : ''}</button>`;
}
function bind(id, fn) {
  const el = $('#' + id);
  if (el) el.onclick = fn;
}
function select(c, s) {
  cid = c.id;
  sid = s?.id || c.scenes[0].id;
  render();
}
const slug = (t) =>
  (t || 'MORIARTY')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 40) || 'MORIARTY';

// Si el título ya trae su número o es Prólogo/Extra/Epílogo, no se antepone otro.
const ownNumber = (t) => /^\s*(\d+|pr[oó]logo|ep[ií]logo|extra|interludio)\b/i.test(t);
const chapterLabel = (c, i) => (ownNumber(c.title) ? esc(c.title) : `${i + 1}. ${esc(c.title)}`);

/* ---------- Barra lateral ---------- */
function sidebar() {
  const el = $('#sidebar');
  el.innerHTML = `<div class="eyebrow">MANUSCRITO</div><input class="field" id="search" placeholder="Buscar texto o capítulo…" aria-label="Buscar"><div id="chapterList"></div>${btn('addChapter', '＋ Nuevo capítulo')}<details><summary>Papelera</summary>${p.chapters
    .filter((c) => c.trashed)
    .map((c) => `<button data-recover="${c.id}">↶ ${esc(c.title)}</button>`)
    .join('') || `<div class="trash-empty">${art('vacio-papelera', 'art art-xs')}<small class="muted">Nada en la papelera.</small></div>`}</details>`;
  $('#search').value = filter;
  $('#search').oninput = (e) => {
    filter = e.target.value;
    chapterList();
  };
  chapterList();
  bind('addChapter', () => {
    const c = chapter();
    const n = p.chapters.length;
    c.x = 40 + (n % 7) * 200;
    c.y = 40 + Math.floor(n / 7) * 160;
    p.chapters.push(c);
    view = 'write';
    save();
    select(c);
  });
  $$('[data-recover]', el).forEach(
    (b) =>
      (b.onclick = () => {
        p.chapters.find((c) => c.id === b.dataset.recover).trashed = false;
        save();
        render();
      }),
  );
}
function chapterList() {
  $('#chapterList').innerHTML = p.chapters
    .filter(
      (c) =>
        !c.trashed &&
        `${c.title} ${c.summary} ${c.scenes.map((s) => s.text).join(' ')}`.toLowerCase().includes(filter.toLowerCase()),
    )
    .map(
      (c, i) =>
        `<button class="${c.id === cid ? 'selected' : ''}" data-chapter="${c.id}"><span class="dot status-${c.status}" style="width:7px;height:7px;border-radius:50%;background:currentColor;flex:0 0 auto"></span>${chapterLabel(c, i)}</button>${c.id === cid ? c.scenes.map((s) => `<button class="scene ${s.id === sid ? 'selected' : ''}" data-scene="${s.id}">▱ ${esc(s.title)}</button>`).join('') : ''}`,
    )
    .join('');
  $$('#chapterList [data-chapter]').forEach(
    (b) =>
      (b.onclick = () => {
        view = 'write';
        select(p.chapters.find((c) => c.id === b.dataset.chapter));
      }),
  );
  $$('#chapterList [data-scene]').forEach(
    (b) =>
      (b.onclick = () => {
        sid = b.dataset.scene;
        view = 'write';
        render();
      }),
  );
}

/* ---------- Render con transiciones ---------- */
function paint() {
  const home = view === 'library';
  document.body.classList.toggle('library-mode', home);
  $('#projectTitle').value = p.title;
  $('#projectTitle').hidden = home;
  $('#libraryTitle').hidden = !home;
  $('#exportBook').hidden = home;
  $('#exportPack').hidden = home;
  $('#txt').hidden = home;
  $$('[data-view]').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (home) libraryView.render();
  else {
    sidebar();
    ({write: writeView, board: boardView, archive: archiveView, timeline: timelineView, review: reviewView})[view]();
  }
  $('#recoveryBanner').hidden = !loadFailure;
  count();
  decorateIcons();
}
function render() {
  const changed = view !== lastView;
  lastView = view;
  prefs.last = {book: p.id, view, cid, sid};
  applyPrefs();
  if (changed && document.startViewTransition && !document.body.classList.contains('focus')) {
    document.startViewTransition(paint);
  } else paint();
}

/* ---------- Escribir ---------- */
function writeView() {
  const c = current(),
    s = selectedScene();
  if (!c || !s) {
    $('#main').innerHTML =
      '<h1>Tu siguiente historia empieza aquí.</h1><p>Crea un capítulo en el manuscrito o recupera uno de la papelera.</p>';
    return;
  }
  const live = p.entities.filter((e) => !e.trashed);
  const linked = c.entityIds.map((id) => live.find((e) => e.id === id)).filter(Boolean);
  $('#main').innerHTML =
    `<div class="toolbar"><span class="eyebrow">ESTUDIO DE ESCRITURA</span><span class="spacer"></span><span class="type-size" role="group" aria-label="Tamaño de letra">${btn('smaller', '', '', 'Letra más pequeña')}${btn('bigger', '', '', 'Letra más grande')}</span>${btn('focus', 'Modo enfoque')}${btn('versions', 'Versiones')}${btn('reviewStart', 'Revisar escena')}</div><article class="editor"><input id="chapterTitle" class="title" aria-label="Título del capítulo" value="${esc(c.title)}"><details class="chapter-details" ${c.summary || c.pov || linked.length ? 'open' : ''}><summary><span class="chip status-${c.status}"><span class="dot"></span>${STATUS_LABEL[c.status]}</span><span>Detalles del capítulo</span>${linked.length ? `<span class="muted">· ${linked.length} ${linked.length === 1 ? 'ficha' : 'fichas'}</span>` : ''}</summary><div class="body"><label>Estado<select class="field" data-status>${STATUSES.map((st) => `<option value="${st}" ${st === c.status ? 'selected' : ''}>${STATUS_LABEL[st]}</option>`).join('')}</select></label><label>Punto de vista<input class="field" data-pov value="${esc(c.pov)}" placeholder="¿Quién narra?"></label><label class="wide">Resumen<textarea class="field" data-summary rows="2" placeholder="Qué pasa en este capítulo, en dos líneas.">${esc(c.summary)}</textarea></label><div class="wide"><label>Fichas en este capítulo</label><div class="chips">${linked.map((e) => `<span class="chip type-${e.type}"><span class="dot"></span>${esc(e.name)}<button data-unlink="${e.id}" aria-label="Quitar ${esc(e.name)}">${icon('close')}</button></span>`).join('')}<select class="field" data-link style="width:auto;padding:4px 8px;font-size:12px"><option value="">＋ Vincular ficha…</option>${live
      .filter((e) => !c.entityIds.includes(e.id))
      .map((e) => `<option value="${e.id}">${esc(e.type)} · ${esc(e.name)}</option>`)
      .join('')}</select></div></div></div></details><div class="toolbar"><select id="sceneSelect" class="field" aria-label="Escena" style="width:auto;flex:1">${c.scenes.map((s) => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>${btn('addScene', '＋ Escena')}${btn('trashChapter', 'A papelera')}</div><input id="sceneTitle" class="subtitle" aria-label="Título de escena" value="${esc(s.title)}"><textarea id="text" class="manuscript" aria-label="Texto de la escena" placeholder="Escribe aquí. Esta historia es tuya…" spellcheck="true">${esc(s.text)}</textarea><p class="muted">Texto plano · Guardado local · Exporta un respaldo para llevarlo a otro dispositivo.</p></article>`;
  $('#chapterTitle').oninput = (e) => {
    c.title = e.target.value;
    save();
    chapterList();
  };
  $('#sceneTitle').oninput = (e) => {
    s.title = e.target.value;
    $('#sceneSelect').selectedOptions[0].textContent = s.title;
    chapterList();
    save();
  };
  $('#text').oninput = (e) => {
    s.text = e.target.value;
    save();
  };
  $('#sceneSelect').onchange = (e) => {
    sid = e.target.value;
    render();
  };
  $('[data-status]').onchange = (e) => {
    c.status = e.target.value;
    save();
    writeView();
  };
  $('[data-pov]').oninput = (e) => {
    c.pov = e.target.value;
    save();
  };
  $('[data-summary]').oninput = (e) => {
    c.summary = e.target.value;
    save();
  };
  $('[data-link]').onchange = (e) => {
    if (!e.target.value) return;
    c.entityIds.push(e.target.value);
    save();
    writeView();
  };
  $$('[data-unlink]').forEach(
    (b) =>
      (b.onclick = () => {
        c.entityIds = c.entityIds.filter((id) => id !== b.dataset.unlink);
        save();
        writeView();
      }),
  );
  bind('smaller', () => {
    prefs.fontSize = Math.max(14, prefs.fontSize - 1);
    applyPrefs();
  });
  bind('bigger', () => {
    prefs.fontSize = Math.min(28, prefs.fontSize + 1);
    applyPrefs();
  });
  bind('addScene', () => {
    const s = scene();
    c.scenes.push(s);
    save();
    select(c, s);
  });
  bind('focus', () => {
    const active = document.body.classList.toggle('focus');
    $('#focus').innerHTML = icon('focus') + '<span>' + (active ? 'Salir de enfoque' : 'Modo enfoque') + '</span>';
    $('#text').focus();
  });
  bind('trashChapter', () => {
    c.trashed = true;
    cid = p.chapters.find((c) => !c.trashed)?.id;
    sid = current()?.scenes[0].id;
    save();
    render();
    notify('Capítulo enviado a la papelera. Puedes recuperarlo desde el manuscrito.');
  });
  bind('versions', versionsView);
  bind('reviewStart', () => {
    snapshot(c, 'Antes de revisión');
    const r = {id: uid(), chapterId: c.id, sceneId: s.id, base: s.text, proposal: s.text, instruction: ''};
    p.reviews.push(r);
    reviewId = r.id;
    view = 'review';
    save();
    render();
  });
}
function versionsView() {
  const c = current();
  $('#main').innerHTML =
    `<div class="toolbar">${btn('back', '← Manuscrito')}${btn('snapshot', 'Guardar punto de versión', 'primary')}</div><h1>Versiones de ${esc(c.title)}</h1><p class="muted">Recuperar conserva también una copia del estado actual.</p>${
      c.versions.length
        ? c.versions
            .slice()
            .reverse()
            .map(
              (v) =>
                `<div class="version"><div><b>${esc(v.label)}</b><br><small>${esc(new Date(v.date).toLocaleString('es-MX'))}</small></div><button data-restore="${v.id}">Recuperar</button></div>`,
            )
            .join('')
        : '<div class="panel">Todavía no hay puntos guardados.</div>'
    }`;
  bind('back', render);
  bind('snapshot', () => {
    const label = prompt('Nombre de esta versión', 'Avance de hoy');
    if (label === null) return;
    snapshot(c, label || 'Versión manual');
    save();
    versionsView();
  });
  $$('[data-restore]').forEach(
    (b) =>
      (b.onclick = () => {
        restore(c, b.dataset.restore);
        sid = c.scenes[0].id;
        save();
        versionsView();
        notify('Versión recuperada; el estado anterior quedó conservado.');
      }),
  );
}

/* ---------- Tablero ---------- */
function boardView() {
  $('#main').innerHTML =
    `<div class="toolbar"><div><div class="eyebrow">ESTRUCTURA NARRATIVA</div><h1>Una historia, pieza por pieza.</h1></div><span class="spacer"></span>${btn('order', 'Orden del libro', free ? '' : 'primary')}${btn('free', 'Lienzo libre', free ? 'primary' : '')}</div><p class="muted">${free ? 'Arrastra los iconos sin cambiar el orden del libro. Selecciona y presiona Enter para abrir.' : 'Un icono por capítulo. Las flechas cambian el orden del manuscrito; Enter o doble clic abre el documento.'} El Pizarrón visual con fichas y relaciones llega en V0.4.</p><div id="board"></div>`;
  bind('order', () => {
    free = false;
    boardView();
  });
  bind('free', () => {
    free = true;
    boardView();
  });
  const live = p.chapters.filter((c) => !c.trashed);
  const chapterCard = (c, i) =>
    `<button class="chapter-icon" data-open="${c.id}" ${free ? `style="left:${c.x}px;top:${c.y}px"` : ''}><span class="chapter-band" style="background:${c.color || 'transparent'}"></span><span class="status-dot status-${c.status}" title="${STATUS_LABEL[c.status]}"></span>${icon('book', 'chapter-glyph')}<b>${ownNumber(c.title) ? esc(c.title) : `${String(i + 1).padStart(2, '0')} · ${esc(c.title)}`}</b><small>ACTO ${c.act}${c.entityIds.length ? ` · ${c.entityIds.length} FICHAS` : ''}</small></button>`;
  $('#board').innerHTML = free
    ? `<div class="canvas"><div class="canvas-inner">${live.map(chapterCard).join('')}</div></div>`
    : `<div class="grid">${live.map((c, i) => `<div class="chapter-wrap">${chapterCard(c, i)}<div class="toolbar"><button data-move="${c.id}" data-dir="-1" aria-label="Subir capítulo" ${i === 0 ? 'disabled' : ''}>↑</button><button data-move="${c.id}" data-dir="1" aria-label="Bajar capítulo" ${i === live.length - 1 ? 'disabled' : ''}>↓</button><select data-act="${c.id}" aria-label="Acto de ${esc(c.title)}">${[1, 2, 3].map((n) => `<option ${c.act === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`).join('')}</div>`;
  $$('[data-open]').forEach((b) => {
    const c = p.chapters.find((c) => c.id === b.dataset.open);
    const open = () => {
      view = 'write';
      select(c);
    };
    b.ondblclick = open;
    b.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        open();
      }
    };
    if (free) {
      b.onpointerdown = (e) => {
        const x = e.clientX,
          y = e.clientY,
          bx = c.x,
          by = c.y;
        b.setPointerCapture(e.pointerId);
        b.onpointermove = (e) => {
          c.x = Math.max(0, Math.min(1450, bx + e.clientX - x));
          c.y = Math.max(0, Math.min(850, by + e.clientY - y));
          b.style.left = c.x + 'px';
          b.style.top = c.y + 'px';
        };
        b.onpointerup = () => {
          b.onpointermove = null;
          save();
        };
      };
    }
  });
  $$('[data-move]').forEach(
    (b) =>
      (b.onclick = () => {
        const i = p.chapters.findIndex((c) => c.id === b.dataset.move),
          j = live.findIndex((c) => c.id === b.dataset.move) + Number(b.dataset.dir);
        const target = p.chapters.indexOf(live[j]);
        [p.chapters[i], p.chapters[target]] = [p.chapters[target], p.chapters[i]];
        save();
        render();
      }),
  );
  $$('[data-act]').forEach(
    (s) =>
      (s.onchange = () => {
        p.chapters.find((c) => c.id === s.dataset.act).act = Number(s.value);
        save();
      }),
  );
}

/* ---------- Archivo (fichas v2) ---------- */
const typeIcon = {Personaje: 'user', Lugar: 'pin', Objeto: 'box', Nota: 'note'};
function archiveView() {
  const live = p.entities.filter((e) => !e.trashed);
  const targets = [
    ...live.map((e) => ({id: e.id, label: `${e.type} · ${e.name}`})),
    ...p.chapters.filter((c) => !c.trashed).map((c) => ({id: c.id, label: `Capítulo · ${c.title}`})),
  ];
  const typeFilter = archiveView.type || '';
  const shown = live.filter((e) => !typeFilter || e.type === typeFilter);
  $('#main').innerHTML =
    `<div class="toolbar"><div><div class="eyebrow">ARCHIVO NARRATIVO</div><h1>Todo lo que habita tu historia.</h1></div><span class="spacer"></span><select id="entityType" class="field" style="width:auto" aria-label="Tipo de la nueva ficha">${ENTITY_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>${btn('addEntity', '＋ Nueva ficha', 'primary')}</div><div class="chips" style="margin-bottom:14px"><button class="chip ${typeFilter === '' ? 'primary' : ''}" data-filter="">Todas <small>${live.length}</small></button>${ENTITY_TYPES.map((t) => `<button class="chip type-${t} ${typeFilter === t ? 'selected' : ''}" data-filter="${t}" ${typeFilter === t ? 'style="border-color:currentColor"' : ''}><span class="dot"></span>${t}s <small>${live.filter((e) => e.type === t).length}</small></button>`).join('')}</div><div class="grid">${
      shown
        .map(
          (e) =>
            `<section class="panel entry" data-entity="${e.id}" style="border-top:4px solid ${e.color || 'var(--c-' + e.type.toLowerCase() + ')'}"><div class="head"><button class="portrait" data-portrait aria-label="Cambiar imagen de ${esc(e.name)}" title="Cambiar imagen">${e.image ? `<img src="${e.image}" alt="">` : art('ficha-' + e.type.toLowerCase(), 'portrait-default')}</button><div style="flex:1;min-width:0"><span class="eyebrow type-${e.type}">${esc(e.type)}</span><input class="name" data-name value="${esc(e.name)}" aria-label="Nombre"></div></div>${FIELDS[e.type].length ? `<div class="fields">${FIELDS[e.type].map(([k, l]) => `<label>${l}<input class="field" data-field="${k}" value="${esc(e.fields[k] || '')}"></label>`).join('')}</div>` : ''}<label>Descripción y notas<textarea class="field" data-notes rows="4">${esc(e.notes)}</textarea></label><label>Etiquetas <span class="muted">(separadas por coma)</span><input class="field" data-tags value="${esc(e.tags.join(', '))}" placeholder="aliado, acto 2, secreto"></label><div class="relations"><label>Relaciones</label>${e.relations
              .map(
                (r, i) =>
                  `<div class="relation"><input class="field" data-rel-label="${i}" value="${esc(r.label)}" placeholder="vive en, odia a, aparece en…" aria-label="Relación"><select class="field" data-rel-target="${i}" aria-label="Con quién">${targets.map((t) => `<option value="${t.id}" ${t.id === r.targetId ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select><button data-rel-remove="${i}" aria-label="Quitar relación" class="ghost">${icon('close')}</button></div>`,
              )
              .join('')}<button data-add-relation class="ghost" ${targets.length < 2 ? 'disabled' : ''}>${icon('link')}<span>Añadir relación</span></button></div><div class="foot"><div class="color-swatches" role="group" aria-label="Color">${SWATCHES.map((col) => `<button class="swatch ${e.color === col ? 'selected' : ''}" data-color="${col}" style="background:${col || 'var(--line)'}" aria-label="${col || 'Sin color'}"></button>`).join('')}</div><span class="spacer"></span>${e.image ? `<button data-remove-image class="ghost">Quitar imagen</button>` : ''}<button data-trash class="ghost">A papelera</button></div></section>`,
        )
        .join('') ||
      `<div class="library-empty">${typeFilter ? art('ficha-' + typeFilter.toLowerCase(), 'art art-sm') : art('vacio-pizarron')}<h2>${typeFilter ? `Sin ${typeFilter.toLowerCase()}s todavía.` : 'Crea tu primera ficha.'}</h2><p class="muted">Puedes empezar solo con un nombre, o cargar un paquete de fichas desde el menú Cargar.</p></div>`
    }</div><details style="margin-top:18px"><summary class="muted">Fichas en papelera</summary>${p.entities
      .filter((e) => e.trashed)
      .map((e) => `<button data-recover-entity="${e.id}">↶ ${esc(e.name)}</button>`)
      .join('')}</details>`;
  $$('[data-filter]').forEach(
    (b) =>
      (b.onclick = () => {
        archiveView.type = b.dataset.filter;
        archiveView();
      }),
  );
  bind('addEntity', () => {
    const e = entity($('#entityType').value);
    p.entities.unshift(e);
    archiveView.type = '';
    save();
    archiveView();
    $(`[data-entity="${e.id}"] [data-name]`)?.select();
  });
  $$('[data-entity]').forEach((el) => {
    const e = p.entities.find((e) => e.id === el.dataset.entity);
    const on = (sel, fn) => {
      const x = el.querySelector(sel);
      if (x) x.oninput = (ev) => {
        fn(ev.target.value);
        save();
      };
    };
    on('[data-name]', (v) => (e.name = v));
    on('[data-notes]', (v) => (e.notes = v));
    on('[data-tags]', (v) => (e.tags = v.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20)));
    $$('[data-field]', el).forEach((f) => (f.oninput = (ev) => {
      e.fields[f.dataset.field] = ev.target.value;
      save();
    }));
    $$('[data-rel-label]', el).forEach((f) => (f.oninput = (ev) => {
      e.relations[Number(f.dataset.relLabel)].label = ev.target.value;
      save();
    }));
    $$('[data-rel-target]', el).forEach((f) => (f.onchange = (ev) => {
      e.relations[Number(f.dataset.relTarget)].targetId = ev.target.value;
      save();
    }));
    $$('[data-rel-remove]', el).forEach((b) => (b.onclick = () => {
      e.relations.splice(Number(b.dataset.relRemove), 1);
      save();
      archiveView();
    }));
    el.querySelector('[data-add-relation]').onclick = () => {
      const first = targets.find((t) => t.id !== e.id);
      if (!first) return;
      e.relations.push({targetId: first.id, label: ''});
      save();
      archiveView();
      $(`[data-entity="${e.id}"] [data-rel-label="${e.relations.length - 1}"]`)?.focus();
    };
    $$('[data-color]', el).forEach((b) => (b.onclick = () => {
      e.color = b.dataset.color;
      save();
      archiveView();
    }));
    el.querySelector('[data-portrait]').onclick = async () => {
      const r = await pickImage($('#imageFile'), {max: 512});
      if (!r) return;
      if (r.error) return notify(r.error);
      e.image = r;
      save();
      archiveView();
    };
    const rm = el.querySelector('[data-remove-image]');
    if (rm) rm.onclick = () => {
      e.image = '';
      save();
      archiveView();
    };
    el.querySelector('[data-trash]').onclick = () => {
      e.trashed = true;
      for (const c of p.chapters) c.entityIds = c.entityIds.filter((id) => id !== e.id);
      save();
      archiveView();
    };
  });
  $$('[data-recover-entity]').forEach(
    (b) =>
      (b.onclick = () => {
        p.entities.find((e) => e.id === b.dataset.recoverEntity).trashed = false;
        save();
        archiveView();
      }),
  );
}

/* ---------- Cronología ---------- */
function timelineView() {
  const live = p.events.filter((e) => !e.trashed).sort((a, b) => a.order - b.order);
  $('#main').innerHTML =
    `<div class="toolbar"><div><div class="eyebrow">CRONOLOGÍA</div><h1>Lo que ocurrió. Cuándo se cuenta.</h1></div><span class="spacer"></span>${btn('addEvent', '＋ Acontecimiento', 'primary')}</div><p class="muted">Ordena acontecimientos con las flechas. La fecha es libre: “Tres días antes” también sirve. No reordena capítulos.</p><div class="grid">${
      live
        .map(
          (e, i) =>
            `<section class="panel entry" data-event="${e.id}"><div class="toolbar" style="margin-bottom:4px"><span class="eyebrow">${i + 1}</span><span class="spacer"></span><button data-up aria-label="Subir acontecimiento" ${i === 0 ? 'disabled' : ''}>↑</button><button data-down aria-label="Bajar acontecimiento" ${i === live.length - 1 ? 'disabled' : ''}>↓</button></div><label>Acontecimiento<input class="field" data-title value="${esc(e.title)}"></label><label>Cuándo ocurre<input class="field" data-when value="${esc(e.when)}"></label><label>Se cuenta en<select class="field" data-chapter><option value="">Sin vincular</option>${p.chapters
              .filter((c) => !c.trashed || c.id === e.chapterId)
              .map((c) => `<option value="${c.id}" ${c.id === e.chapterId ? 'selected' : ''}>${esc(c.title)}</option>`)
              .join('')}</select></label><div class="foot"><span class="spacer"></span><button data-trash class="ghost">A papelera</button></div></section>`,
        )
        .join('') || `<div class="library-empty">${art('vacio-pizarron')}<h2>Todavía no hay acontecimientos.</h2></div>`
    }</div><details style="margin-top:18px"><summary class="muted">Acontecimientos en papelera</summary>${p.events
      .filter((e) => e.trashed)
      .map((e) => `<button data-recover-event="${e.id}">↶ ${esc(e.title)}</button>`)
      .join('')}</details>`;
  const renumber = () => {
    p.events
      .filter((x) => !x.trashed)
      .sort((a, b) => a.order - b.order)
      .forEach((x, i) => (x.order = i));
  };
  bind('addEvent', () => {
    const e = event();
    e.order = p.events.length ? Math.max(...p.events.map((x) => x.order)) + 1 : 0;
    p.events.push(e);
    save();
    timelineView();
  });
  $$('[data-event]').forEach((el) => {
    const e = p.events.find((e) => e.id === el.dataset.event);
    for (const [sel, key] of [
      ['title', 'title'],
      ['when', 'when'],
      ['chapter', 'chapterId'],
    ])
      el.querySelector('[data-' + sel + ']').oninput = (x) => {
        e[key] = x.target.value;
        save();
      };
    el.querySelector('[data-trash]').onclick = () => {
      e.trashed = true;
      save();
      timelineView();
    };
    for (const [sel, dir] of [
      ['up', -1],
      ['down', 1],
    ])
      el.querySelector('[data-' + sel + ']').onclick = () => {
        renumber();
        const target = live[live.indexOf(e) + dir];
        if (!target) return;
        [e.order, target.order] = [target.order, e.order];
        save();
        timelineView();
      };
  });
  $$('[data-recover-event]').forEach(
    (b) =>
      (b.onclick = () => {
        p.events.find((e) => e.id === b.dataset.recoverEvent).trashed = false;
        save();
        timelineView();
      }),
  );
}

/* ---------- Revisiones ---------- */
function reviewView() {
  let r = p.reviews.find((r) => r.id === reviewId) || p.reviews.at(-1);
  if (!r) {
    $('#main').innerHTML =
      '<h1>Tu mesa de revisión.</h1><div class="notice">Abre una escena en Escribir y elige Revisar escena. Puedes pegar una propuesta manualmente. La conexión con IA y Drive está pendiente.</div>';
    return;
  }
  reviewId = r.id;
  const c = p.chapters.find((c) => c.id === r.chapterId),
    s = c.scenes.find((s) => s.id === r.sceneId);
  $('#main').innerHTML =
    `<div class="eyebrow">REVISIÓN MANUAL · SIN CONEXIÓN IA</div><h1>Dos miradas sobre la misma escena.</h1><div class="toolbar"><select id="reviewSelect" class="field" style="width:auto" aria-label="Revisión">${p.reviews.map((x, i) => `<option value="${x.id}" ${x.id === r.id ? 'selected' : ''}>Revisión ${i + 1}</option>`).join('')}</select><span>${esc(c.title)} / ${esc(s?.title || 'Escena de otra versión')}</span></div><label>Instrucción de revisión<input id="instruction" class="field" value="${esc(r.instruction)}" placeholder="Corrige puntuación y conserva mi voz"></label><div class="tabs">${btn('originalTab', 'Original', tab === 'original' ? 'primary' : '')}${btn('proposalTab', 'Propuesta', tab === 'proposal' ? 'primary' : '')}</div><div class="split"><section class="panel ${tab !== 'original' ? 'mobile-hidden' : ''}"><h2>Original enviado</h2><textarea class="field" readonly aria-label="Original enviado">${esc(r.base)}</textarea></section><section class="panel ${tab !== 'proposal' ? 'mobile-hidden' : ''}"><h2>Propuesta editable</h2><textarea id="proposal" class="field" aria-label="Propuesta de revisión">${esc(r.proposal)}</textarea></section></div><div class="toolbar" style="margin-top:14px">${btn('apply', 'Aplicar propuesta completa', 'primary')}${btn('request', 'Descargar solicitud JSON')}</div><p class="muted">Comparación manual de escena completa; aceptación por cambio y resaltado de diferencias quedan para otra entrega. Aplicar crea una versión previa.</p>`;
  $('#reviewSelect').onchange = (e) => {
    reviewId = e.target.value;
    reviewView();
  };
  $('#instruction').oninput = (e) => {
    r.instruction = e.target.value;
    save();
  };
  $('#proposal').oninput = (e) => {
    r.proposal = e.target.value;
    save();
  };
  bind('originalTab', () => {
    tab = 'original';
    reviewView();
  });
  bind('proposalTab', () => {
    tab = 'proposal';
    reviewView();
  });
  bind('apply', () => {
    if (!s) {
      notify('La escena ya no existe en esta versión.');
      return;
    }
    try {
      if (s.text !== r.base) throw Error('El original cambió. Inicia otra revisión para evitar sobrescribirlo.');
      snapshot(c, 'Antes de aplicar propuesta');
      applyReview(s, r);
      save();
      notify('Propuesta aplicada. La versión anterior quedó guardada.');
    } catch (e) {
      notify(e.message);
    }
  });
  bind('request', () =>
    download('MORIARTY_SOLICITUD.json', JSON.stringify({schemaVersion: 1, kind: 'review-request', ...r}, null, 2)),
  );
}

/* ---------- Carga de JSON: archivo, pegado o arrastre ---------- */
async function importData(data, sourceName = 'archivo') {
  busy('Validando ' + sourceName + '…', 30);
  await yieldFrame();
  if (data?.kind === 'moriarty-pack') {
    if (loadFailure) throw Error('Recupera un respaldo antes de cargar paquetes.');
    const merged = mergePack(p, data);
    busy('Incorporando al libro…', 70);
    await yieldFrame();
    const book = activeBook(library);
    book.project = merged;
    p = merged;
    const n = {e: data.entities?.length || 0, c: data.chapters?.length || 0, v: data.events?.length || 0};
    saveNow();
    view = n.c && !n.e ? 'board' : n.e ? 'archive' : 'timeline';
    render();
    notify(
      `Paquete cargado en «${p.title}»: ${[n.e && `${n.e} fichas`, n.c && `${n.c} capítulos`, n.v && `${n.v} acontecimientos`]
        .filter(Boolean)
        .join(', ')}.`,
    );
    return;
  }
  const next = loadFailure
    ? data?.kind === 'moriarty-library'
      ? validateLibrary(data)
      : createLibrary(validate(data))
    : importIntoLibrary(library, data);
  if (loadFailure) {
    busy(false);
    if (!confirm('El guardado actual es ilegible. Se descargará una copia de recuperación antes de abrir este respaldo. ¿Continuar?'))
      return;
    downloadRecovery();
  }
  busy('Guardando…', 80);
  await yieldFrame();
  library = next;
  loadFailure = false;
  openBook(library.activeBookId);
  notify('Importado. Tus otros libros se conservan en la biblioteca.');
}
async function importText(text, sourceName) {
  try {
    busy('Leyendo ' + sourceName + '…', 10);
    await yieldFrame();
    if (text.length > 25 * 1024 * 1024) throw Error('El archivo supera 25 MB.');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw Error('No es un JSON válido. Revisa comas y comillas.');
    }
    await importData(data, sourceName);
  } catch (err) {
    notify(err.message, 7000);
  } finally {
    busy(false);
  }
}
$('#file').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) importText(await f.text(), f.name);
};
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  dragDepth++;
  $('#drop').hidden = false;
});
window.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $('#drop').hidden = true;
  }
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('#drop').hidden = true;
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (!/\.json$/i.test(f.name) && f.type !== 'application/json') return notify('Solo se aceptan archivos .json.');
  importText(await f.text(), f.name);
});
function pasteDialog() {
  libraryView.dialog(
    'Pegar JSON',
    `<p class="muted" style="margin:0 0 6px">Pega un libro, una biblioteca o un paquete de fichas. Se detecta por su campo <code>kind</code>.</p><label>JSON<textarea class="field" name="json" rows="10" placeholder='{"kind":"moriarty-pack","schemaVersion":2,"entities":[…]}' required style="font-family:ui-monospace,monospace;font-size:12px"></textarea></label>`,
    'Cargar',
    (data) => {
      const text = data.get('json').trim();
      if (!text) throw Error('Pega algo primero.');
      setTimeout(() => importText(text, 'texto pegado'), 0);
    },
  );
}

/* ---------- Menús ---------- */
function menu(id, triggerId) {
  const m = $('#' + id),
    t = $('#' + triggerId);
  t.onclick = (e) => {
    e.stopPropagation();
    const open = m.classList.toggle('open');
    t.setAttribute('aria-expanded', open);
    $$('.menu').forEach((x) => x !== m && x.classList.remove('open'));
  };
  $$('.menu-list button', m).forEach((b) => b.addEventListener('click', () => m.classList.remove('open')));
}
menu('exportMenu', 'export');
menu('importMenu', 'import');
document.addEventListener('click', () => $$('.menu').forEach((x) => x.classList.remove('open')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.menu').forEach((x) => x.classList.remove('open'));
});

/* ---------- Acciones globales ---------- */
$$('[data-view]').forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      document.body.classList.remove('focus');
      render();
    }),
);
$('#projectTitle').oninput = (e) => {
  p.title = e.target.value;
  save();
};
bind('backup', backupLibrary);
bind('exportBook', () => {
  saveNow();
  download(`MORIARTY_${slug(p.title)}.moriarty.json`, JSON.stringify(p, null, 2));
});
bind('exportPack', () => {
  saveNow();
  download(
    `MORIARTY_${slug(p.title)}_FICHAS.moriarty.json`,
    JSON.stringify(createPack(p, {entities: true, chapters: false, events: false}), null, 2),
  );
});
bind('txt', () =>
  download(
    `MORIARTY_${slug(p.title)}.txt`,
    p.title +
      '\n\n' +
      p.chapters
        .filter((c) => !c.trashed)
        .map((c) => c.title + '\n\n' + c.scenes.map((s) => s.title + '\n\n' + s.text).join('\n\n'))
        .join('\n\n────────\n\n'),
    'text/plain;charset=utf-8',
  ),
);
bind('importFile', () => $('#file').click());
bind('pasteJson', pasteDialog);
bind('new', () => {
  if (loadFailure) {
    notify('Recupera un respaldo antes de crear libros. El guardado ilegible se conserva.');
    return;
  }
  libraryView.bookDialog();
});
bind('downloadRecovery', downloadRecovery);
bind('resetLibrary', () => {
  if (!confirm('Se descargará el guardado ilegible para recuperarlo antes de iniciar una biblioteca nueva. ¿Continuar?'))
    return;
  downloadRecovery();
  library = createLibrary();
  p = activeBook(library).project;
  loadFailure = false;
  cid = p.chapters[0].id;
  sid = current().scenes[0].id;
  view = 'library';
  save();
  render();
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveNow();
    notify('Guardado.');
  }
});

/* ---------- Arranque ---------- */
render();
if (loadFailure) {
  setSaved('No se pudo leer la biblioteca · Guardado bloqueado', 'warn');
} else {
  saveNow();
  if (migrated) notify('Tu libro de V0.1 ya está en la biblioteca. Conservamos el guardado original.');
}
const iconObserver = new MutationObserver(() => decorateIcons());
iconObserver.observe(document.body, {childList: true, subtree: true});
requestAnimationFrame(() => {
  const splash = $('#splash');
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 400);
});
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('./sw.js').catch(() => notify('Modo sin conexión no disponible en este navegador.'));
