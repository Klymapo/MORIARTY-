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
  createChapterPack,
  packConflicts,
  mergePack,
  wordCount,
  logWords,
  validateReviewResponse,
  milestone,
  STATUSES,
  STATUS_LABEL,
  FIELDS,
  ENTITY_TYPES,
} from './model.js';
import {
  activeBook,
  importIntoLibrary,
  importConflicts,
  validateLibrary,
  createLibrary,
} from './library.js';
import {LibraryView} from './library-view.js';
import {icon, actionIcon, decorateIcons, art} from './icons.js';
import {pickImage} from './media.js';
import {loadStored, store, rawStored} from './storage.js';
import {bindMenu, closeMenus} from './menus.js';
import {askPersistence, backupNow, listBackups, readBackup, autoVersion} from './backup.js';
import {toHtml, toggleWrap, toggleLine, insertBlock, autoReplace} from './markup.js';
import {CHAPTER_TEMPLATES, ENTITY_TEMPLATES, chapterFrom, entityFrom} from './templates.js';
import {search as searchBook, replaceOne, replaceAll} from './search.js';
import {diffBlocks, applyBlocks, countChanges} from './diff.js';
import {docx, epub, printHtml} from './exporter.js';
import {trackerView} from './tracker.js';
import {mapView} from './board.js';

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
  migrated = false,
  mapTab = 'mapa';
const darkMedia = matchMedia('(prefers-color-scheme: dark)');
let prefs = {fontSize: 19};
try {
  prefs = {...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')};
} catch {}
function applyTheme() {
  const t = prefs.theme || 'auto';
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.dataset.theme = t;
  root.dataset.scheme = t === 'auto' ? (darkMedia.matches ? 'dark' : 'light') : t;
  const b = $('#theme');
  if (b) {
    b.innerHTML = icon(root.dataset.scheme === 'dark' ? 'moon' : 'sun') + `<span>${{auto: 'Automático', light: 'Claro', dark: 'Oscuro'}[t]}</span>`;
    b.title = `Tema: ${{auto: 'automático (según el sistema)', light: 'claro', dark: 'oscuro'}[t]}. Toca para cambiar.`;
  }
}
function applyPrefs() {
  document.documentElement.style.setProperty('--manuscript-size', prefs.fontSize + 'px');
  applyTheme();
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}
applyPrefs();
darkMedia.addEventListener('change', applyTheme);

try {
  ({library, migrated} = await loadStored());
} catch {
  library = createLibrary();
  loadFailure = true;
}
// Sin libro activo (biblioteca vacía) se trabaja sobre un proyecto suelto que no se guarda: la app solo muestra la Biblioteca.
const NO_BOOK = createProject('Sin libro');
const syncActive = () => (p = activeBook(library)?.project || NO_BOOK);
const hasBook = () => p !== NO_BOOK;
syncActive();

const libraryView = new LibraryView(() => library, {
  onOpen: openBook,
  onChange: () => {
    syncActive();
    if (!hasBook()) view = 'library';
    save();
  },
  onBackup: backupLibrary,
  onExport: (id) => {
    const b = library.books.find((x) => x.project.id === id);
    if (!b) return;
    saveNow();
    download(`MORIARTY_${slug(b.project.title)}.moriarty.json`, JSON.stringify(b.project, null, 2));
    notify(`«${b.project.title}» descargado.`);
  },
  onImport: () => $('#file').click(),
  pickCover: () => pickImage($('#imageFile'), {max: 900, quality: 0.8}),
  notify: (t) => notify(t),
});

function openBook(id) {
  library.activeBookId = id;
  syncActive();
  if (!hasBook()) {
    view = 'library';
    return render();
  }
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
function markExported() {
  prefs.lastExport = Date.now();
  applyPrefs();
}
function backupLibrary() {
  saveNow();
  markExported();
  download('MORIARTY_BIBLIOTECA.moriarty.json', JSON.stringify(library, null, 2));
}
async function downloadRecovery() {
  for (const [key, raw] of await rawStored()) download(key + '.recuperacion.txt', raw, 'text/plain');
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
  const old = {board: 'capitulos', archive: 'fichas', timeline: 'cronologia'};
  if (old[prefs.last.view]) (view = 'map'), (mapTab = old[prefs.last.view]);
  else if (['write', 'map', 'tracker', 'review'].includes(prefs.last.view)) view = prefs.last.view;
  if (prefs.last.mapTab) mapTab = prefs.last.mapTab;
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
  const ok = () => {
    saveFailed = false;
    setSaved(`Guardado ${new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}`);
  };
  const fail = () => {
    setSaved('No se pudo guardar', 'warn');
    // El aviso se ve también en celular, donde el indicador de la cabecera está oculto.
    if (!saveFailed) notify('⚠ No se pudo guardar en este dispositivo. Exporta → Respaldar biblioteca para no perder cambios.', 12000);
    saveFailed = true;
  };
  try {
    if (hasBook()) logWords(p, wordCount(p));
    store(library).then(ok, fail);
    count();
    return true;
  } catch {
    fail();
    count();
    return false;
  }
}
let saveFailed = false;
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
// Donde pintan las vistas: dentro del Pizarrón (#subview) o en #main.
const main = () => $('#subview') || $('#main');
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
  const cur = current();
  el.innerHTML = `<button type="button" class="aside-toggle" id="asideToggle" aria-expanded="${document.body.classList.contains('aside-open')}"><span class="aside-book">${esc(p.title) || 'Libro sin título'}</span><span class="aside-ch">${cur ? esc(cur.title) : 'Manuscrito'}</span>${icon('chevron')}</button><div class="aside-body"><div class="eyebrow">MANUSCRITO</div><input class="field" id="search" placeholder="Buscar texto o capítulo…" aria-label="Buscar"><div id="chapterList"></div>${btn('addChapter', '＋ Nuevo capítulo')}<details><summary>Papelera</summary>${p.chapters
    .filter((c) => c.trashed)
    .map((c) => `<button data-recover="${c.id}">↶ ${esc(c.title)}</button>`)
    .join('') || `<div class="trash-empty">${art('vacio-papelera', 'art art-xs')}<small class="muted">Nada en la papelera.</small></div>`}</details></div>`;
  $('#asideToggle').onclick = () => {
    const open = document.body.classList.toggle('aside-open');
    $('#asideToggle').setAttribute('aria-expanded', open);
    if (open) $('#search').focus({preventScroll: true});
  };
  $('#search').value = filter;
  $('#search').oninput = (e) => {
    filter = e.target.value;
    chapterList();
  };
  chapterList();
  bind('addChapter', async () => {
    const tpl = await choose(
      'Nuevo capítulo',
      `<div class="tpl-list">${CHAPTER_TEMPLATES.map((t, i) => `<label class="tpl"><input type="radio" name="tpl" value="${t.id}" ${i === 0 ? 'checked' : ''}><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></label>`).join('')}</div>`,
      [{value: 'ok', label: 'Crear capítulo', primary: true}],
    );
    if (!tpl) return;
    const c = chapterFrom(choose.lastPick || 'blank');
    const n = p.chapters.length;
    c.x = 40 + (n % 7) * 200;
    c.y = 40 + Math.floor(n / 7) * 160;
    p.chapters.push(c);
    view = 'write';
    reading = false;
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
const openChapters = new Set();
function chapterList() {
  $('#chapterList').innerHTML = p.chapters
    .filter(
      (c) =>
        !c.trashed &&
        `${c.title} ${c.summary} ${c.scenes.map((s) => s.text).join(' ')}`.toLowerCase().includes(filter.toLowerCase()),
    )
    .map((c, i) => {
      const open = openChapters.has(c.id) || (c.id === cid && !openChapters.has('!' + c.id));
      const many = c.scenes.length > 1;
      return `<div class="ch-row ${c.id === cid ? 'current' : ''}"><button class="${c.id === cid ? 'selected' : ''}" data-chapter="${c.id}"><span class="dot status-${c.status}" style="width:7px;height:7px;border-radius:50%;background:currentColor;flex:0 0 auto"></span>${chapterLabel(c, i)}</button>${many ? `<button class="ch-fold" data-fold="${c.id}" aria-expanded="${open}" aria-label="${open ? 'Ocultar' : 'Mostrar'} escenas de ${esc(c.title)}"><small>${c.scenes.length}</small>${icon('chevron')}</button>` : ''}</div>${open && many ? `<div class="scenes">${c.scenes.map((s) => `<button class="scene ${s.id === sid && c.id === cid ? 'selected' : ''}" data-scene="${s.id}" data-of="${c.id}">▱ ${esc(s.title)}</button>`).join('')}</div>` : ''}`;
    })
    .join('');
  $$('#chapterList [data-fold]').forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const id = b.dataset.fold;
        if (openChapters.has(id) || (id === cid && !openChapters.has('!' + id))) {
          openChapters.delete(id);
          if (id === cid) openChapters.add('!' + id);
        } else {
          openChapters.add(id);
          openChapters.delete('!' + id);
        }
        chapterList();
      }),
  );
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
        cid = b.dataset.of;
        sid = b.dataset.scene;
        view = 'write';
        render();
      }),
  );
}

/* ---------- Render con transiciones ---------- */
function paint() {
  closeMenus();
  const home = view === 'library';
  document.body.classList.remove('aside-open');
  document.body.classList.toggle('library-mode', home);
  $('#projectTitle').value = p.title;
  $('#projectTitle').hidden = home;
  $('#libraryTitle').hidden = !home;
  for (const id of ['exportBook', 'exportPack', 'txt', 'exportDocx', 'exportEpub', 'exportPdf', 'exportSep', 'exportFmtLabel', 'setAuthor']) $('#' + id).hidden = home;
  $('#searchBtn').hidden = home;
  $$('[data-view]').forEach((b) => {
    b.disabled = !hasBook() && b.dataset.view !== 'library';
    b.classList.toggle('active', b.dataset.view === view);
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (home) libraryView.render();
  else {
    $('#main').innerHTML = '';
    sidebar();
    ({write: writeView, map: pizarronView, tracker: () => trackerView(ctx), review: reviewView})[view]();
  }
  $('#recoveryBanner').hidden = !loadFailure;
  count();
  decorateIcons();
}
/* ---------- Pizarrón: mapa, capítulos, fichas, cronología ---------- */
function pizarronView() {
  const tabs = [
    ['mapa', 'Mapa', 'board'],
    ['capitulos', 'Capítulos', 'book'],
    ['fichas', 'Fichas', 'archive'],
    ['cronologia', 'Cronología', 'timeline'],
  ];
  $('#main').innerHTML = `<div class="subtabs" role="tablist">${tabs.map(([id, label, ic]) => `<button role="tab" aria-selected="${mapTab === id}" class="${mapTab === id ? 'active' : ''}" data-tab="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</div><div id="subview"></div>`;
  $$('[data-tab]').forEach((b) => (b.onclick = () => ((mapTab = b.dataset.tab), render())));
  ({mapa: () => mapView(ctx), capitulos: boardView, fichas: archiveView, cronologia: timelineView})[mapTab]();
}
function render() {
  if (!hasBook() && view !== 'library') view = 'library';
  const changed = view !== lastView;
  lastView = view;
  prefs.last = {book: p.id, view, cid, sid, mapTab};
  applyPrefs();
  if (changed && document.startViewTransition && !document.body.classList.contains('focus')) {
    document.startViewTransition(paint);
  } else paint();
}

/* ---------- Escribir ---------- */
let reading = false;
const chapterWords = (c) => c.scenes.reduce((n, s) => n + (s.text.trim() ? s.text.trim().split(/\s+/u).length : 0), 0);
async function insertImage(ta) {
  const r = await pickImage($('#imageFile'), {max: 1400, quality: 0.82});
  if (!r) return;
  if (r.error) return notify(r.error);
  const alt = await choose('Pie de foto', `<label>Descripción o pie de foto (opcional)<input class="field" name="alt" id="imgAlt" maxlength="200" placeholder="Mapa de Verlhaven"></label>`, [{value: 'ok', label: 'Insertar', primary: true}]);
  if (!alt) return;
  const id = uid();
  p.assets[id] = {data: r, alt: choose.lastText || ''};
  insertBlock(ta, `![${choose.lastText || ''}](asset:${id})`);
  save();
}
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
  const cw = chapterWords(c),
    goal = p.goals.chapter;
  const tb = (id, label, title, cls = '') => `<button type="button" class="fmt ${cls}" data-fmt="${id}" title="${esc(title)}" aria-label="${esc(title)}">${label}</button>`;
  $('#main').innerHTML =
    `<article class="editor"><div class="title-row"><input id="chapterTitle" class="title" aria-label="Título del capítulo" value="${esc(c.title)}"><div class="menu" id="chapterMenu"><button id="chapterMenuBtn" data-icon="more" aria-haspopup="true" aria-expanded="false"><span>Capítulo</span></button><div class="menu-list" role="menu"><button id="focus" role="menuitem" data-icon="focus"><div>Modo enfoque<small>Solo el texto; Esc o el botón flotante para salir</small></div></button><div class="menu-row" data-keep><span>Tamaño de letra</span><span class="spacer"></span>${btn('smaller', '', '', 'Letra más pequeña')}${btn('bigger', '', '', 'Letra más grande')}</div><div class="menu-sep"></div><button id="exportChapter" role="menuitem" data-icon="pack"><div>Exportar capítulo (JSON)<small>Para pasarlo a otro dispositivo o a un chat</small></div></button><button id="exportChapterDocx" role="menuitem" data-icon="exportDocx"><div>Capítulo en Word (.docx)</div></button><button id="exportChapterTxt" role="menuitem" data-icon="text"><div>Capítulo en texto (.txt)</div></button><button id="printChapter" role="menuitem" data-icon="exportPdf"><div>Imprimir capítulo / PDF</div></button><div class="menu-sep"></div><button id="reviewStart" role="menuitem" data-icon="review"><div>Revisar escena<small>Crea una solicitud para una IA o una persona</small></div></button><button id="versions" role="menuitem" data-icon="history"><div>Versiones<small>Copias guardadas de este capítulo</small></div></button><div class="menu-sep"></div><button id="trashChapter" role="menuitem" class="danger-text" data-icon="trash"><div>Enviar capítulo a la papelera</div></button></div></div></div><details class="chapter-details" ${prefs.detailsOpen ? 'open' : ''}><summary><span class="chip status-${c.status}"><span class="dot"></span>${STATUS_LABEL[c.status]}</span><span>Detalles del capítulo</span>${c.pov ? `<span class="muted pov-hint">· ${esc(c.pov.length > 24 ? c.pov.slice(0, 23) + '…' : c.pov)}</span>` : ''}${linked.length ? `<span class="muted">· ${linked.length} ${linked.length === 1 ? 'ficha' : 'fichas'}</span>` : ''}<span class="spacer"></span><span class="muted">${cw.toLocaleString('es-MX')}${goal ? ` / ${goal.toLocaleString('es-MX')}` : ''} palabras</span></summary><div class="body"><label>Estado<select class="field" data-status>${STATUSES.map((st) => `<option value="${st}" ${st === c.status ? 'selected' : ''}>${STATUS_LABEL[st]}</option>`).join('')}</select></label><label>Punto de vista<input class="field" data-pov value="${esc(c.pov)}" placeholder="¿Quién narra?"></label><label class="wide">Resumen<textarea class="field" data-summary rows="2" placeholder="Qué pasa en este capítulo, en dos líneas.">${esc(c.summary)}</textarea></label><div class="wide"><label>Fichas en este capítulo</label><div class="chips">${linked.map((e) => `<span class="chip type-${e.type}"><span class="dot"></span>${esc(e.name)}<button data-unlink="${e.id}" aria-label="Quitar ${esc(e.name)}">${icon('close')}</button></span>`).join('')}<select class="field" data-link style="width:auto;padding:4px 8px;font-size:12px"><option value="">＋ Vincular ficha…</option>${live
      .filter((e) => !c.entityIds.includes(e.id))
      .map((e) => `<option value="${e.id}">${esc(e.type)} · ${esc(e.name)}</option>`)
      .join('')}</select></div></div></div></details>${goal ? `<div class="book-progress" style="margin:-6px 0 12px"><span class="status-${c.status}" style="flex:${Math.min(cw, goal)}"></span><span style="flex:${Math.max(goal - cw, 0)};background:transparent"></span></div>` : ''}<div class="toolbar"><select id="sceneSelect" class="field" aria-label="Escena" style="width:auto;flex:1">${c.scenes.map((s) => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>${btn('addScene', '＋ Escena')}</div><input id="sceneTitle" class="subtitle" aria-label="Título de escena" value="${esc(s.title)}"><div class="fmt-bar" role="toolbar" aria-label="Formato">${tb('b', '<b>N</b>', 'Negrita (Ctrl+B)')}${tb('i', '<i>K</i>', 'Cursiva (Ctrl+I)')}${tb('u', '<u>S</u>', 'Subrayado (Ctrl+U)')}<span class="fmt-sep"></span>${tb('quote', icon('indent'), 'Sangría / cita')}${tb('center', icon('center'), 'Centrar')}<span class="fmt-sep"></span>${tb('sep', icon('separator'), 'Separador de escena (* * *)')}${tb('break', icon('pagebreak'), 'Salto de página')}${tb('image', icon('image'), 'Insertar imagen')}<span class="fmt-sep"></span>${tb('dash', '—', 'Raya de diálogo')}${tb('ellipsis', '…', 'Puntos suspensivos')}${tb('quotes', '«»', 'Comillas latinas')}<span class="spacer"></span>${tb('dropcap', icon('dropcap'), 'Letra capital al inicio del capítulo', p.style.dropCap ? 'on' : '')}${tb('help', icon('keyboard'), 'Atajos de teclado')}${tb('search', icon('search'), 'Buscar y reemplazar (Ctrl+Shift+F)')}${tb('read', reading ? icon('edit') : icon('book'), reading ? 'Volver a escribir' : 'Vista de lectura', reading ? 'on' : '')}</div>${
      reading
        ? `<div class="manuscript reading scene-in" id="readingView">${toHtml(s.text, {assets: p.assets, dropCap: p.style.dropCap && c.scenes[0].id === s.id}) || '<p class="muted">Nada escrito todavía.</p>'}</div>`
        : `<textarea id="text" class="manuscript scene-in" aria-label="Texto de la escena" placeholder="Escribe aquí. Esta historia es tuya…" spellcheck="true">${esc(s.text)}</textarea>`
    }<p class="muted">Formato: *cursiva*, **negrita**, __subrayado__, «> » sangría, «---» salto de página. Se ve al leer y al exportar.</p></article>`;
  $('.chapter-details').ontoggle = (e) => {
    prefs.detailsOpen = e.target.open;
    applyPrefs();
  };
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
  const ta = $('#text');
  if (ta) {
    ta.oninput = (e) => {
      if (e.inputType === 'insertText') autoReplace(ta);
      s.text = ta.value;
      autoVersion(c);
      save();
    };
    ta.onkeydown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b') (e.preventDefault(), toggleWrap(ta, '**'));
      else if (k === 'i') (e.preventDefault(), toggleWrap(ta, '*'));
      else if (k === 'u') (e.preventDefault(), toggleWrap(ta, '__'));
    };
  }
  $$('[data-fmt]').forEach((b) => {
    b.onclick = () => {
      const f = b.dataset.fmt;
      if (f === 'read') return ((reading = !reading), writeView());
      if (f === 'search') return searchDialog();
      if (f === 'help') return shortcutsDialog();
      if (f === 'dropcap') {
        p.style.dropCap = !p.style.dropCap;
        save();
        return writeView();
      }
      if (!ta) return notify('Vuelve a escribir para dar formato.');
      if (f === 'b') toggleWrap(ta, '**');
      else if (f === 'i') toggleWrap(ta, '*');
      else if (f === 'u') toggleWrap(ta, '__');
      else if (f === 'quote' || f === 'center') toggleLine(ta, f);
      else if (f === 'sep') insertBlock(ta, '***');
      else if (f === 'break') insertBlock(ta, '---');
      else if (f === 'image') insertImage(ta);
      else if (f === 'dash') (ta.setRangeText('—', ta.selectionStart, ta.selectionEnd, 'end'), ta.dispatchEvent(new Event('input')), ta.focus());
      else if (f === 'ellipsis') (ta.setRangeText('…', ta.selectionStart, ta.selectionEnd, 'end'), ta.dispatchEvent(new Event('input')), ta.focus());
      else if (f === 'quotes') {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        ta.setRangeText('«' + sel + '»', ta.selectionStart, ta.selectionEnd, 'end');
        if (!sel) ta.setSelectionRange(ta.selectionStart - 1, ta.selectionStart - 1);
        ta.dispatchEvent(new Event('input'));
        ta.focus();
      }
    };
  });
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
    document.body.classList.add('focus');
    $('#text')?.focus();
  });
  bind('trashChapter', () => {
    c.trashed = true;
    cid = p.chapters.find((c) => !c.trashed)?.id;
    sid = current()?.scenes[0].id;
    save();
    render();
    notify('Capítulo enviado a la papelera. Puedes recuperarlo desde el manuscrito.');
  });
  menu('chapterMenu', 'chapterMenuBtn');
  bind('versions', versionsView);
  bind('exportChapterDocx', async () => {
    saveNow();
    const author = await authorName();
    const url = URL.createObjectURL(docx(p, {author, only: c.id}));
    Object.assign(document.createElement('a'), {href: url, download: `${slug(p.title)}_${slug(c.title)}.docx`}).click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
  bind('exportChapterTxt', () => download(`${slug(p.title)}_${slug(c.title)}.txt`, c.title + '\n\n' + c.scenes.map((s) => s.title + '\n\n' + s.text).join('\n\n'), 'text/plain;charset=utf-8'));
  bind('printChapter', async () => {
    const author = await authorName();
    const w = window.open('', '_blank');
    if (!w) return notify('El navegador bloqueó la ventana. Permite ventanas emergentes para esta app.');
    w.document.write(printHtml(p, {author, only: c.id}));
    w.document.close();
  });
  bind('exportChapter', () => {
    saveNow();
    download(`MORIARTY_${slug(p.title)}_${slug(c.title)}.capitulo.moriarty.json`, JSON.stringify(createChapterPack(p, c.id), null, 2));
    notify('Capítulo descargado. En el otro dispositivo, abre este libro y usa Cargar.');
  });
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
/* ---------- Atajos ---------- */
function shortcutsDialog() {
  const rows = [
    ['Ctrl + B', 'Negrita'],
    ['Ctrl + I', 'Cursiva'],
    ['Ctrl + U', 'Subrayado'],
    ['Ctrl + Shift + F', 'Buscar y reemplazar'],
    ['--', 'Se convierte en raya (—)'],
    ['...', 'Se convierte en puntos suspensivos (…)'],
    ['Esc', 'Cerrar diálogos y salir del modo enfoque'],
  ];
  choose('Atajos de teclado', `<div class="kbd-list">${rows.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div><p class="muted" style="margin-top:12px">Formato en el texto: *cursiva*, **negrita**, __subrayado__, «> » sangría, «-> texto <-» centrado, «---» salto de página, «***» separador.</p>`, [{value: 'ok', label: 'Entendido', primary: true}]);
}
/* ---------- Buscar y reemplazar ---------- */
const searchState = {q: '', r: '', cs: false, ww: true};
function searchDialog() {
  $('#searchDialog')?.remove();
  const d = document.createElement('dialog');
  d.id = 'searchDialog';
  d.className = 'library-dialog search-dialog';
  d.innerHTML = `<div class="dialog-heading"><h2>Buscar y reemplazar</h2><button type="button" id="closeSearch" aria-label="Cerrar">${icon('close')}</button></div>
  <div class="search-form"><label>Buscar<input class="field" id="sq" value="${esc(searchState.q)}" autocomplete="off"></label><label>Reemplazar por<input class="field" id="sr" value="${esc(searchState.r)}" autocomplete="off"></label></div>
  <div class="toolbar" style="margin:6px 0 10px"><label class="check"><input type="checkbox" id="scs" ${searchState.cs ? 'checked' : ''}> Mayúsculas y minúsculas</label><label class="check"><input type="checkbox" id="sww" ${searchState.ww ? 'checked' : ''}> Palabra completa</label><span class="spacer"></span><span id="sCount" class="muted"></span></div>
  <div id="sResults" class="search-results"></div>
  <div class="dialog-actions"><button type="button" id="sReplaceAll" class="primary" disabled>${icon('replace')}Reemplazar todo</button></div>`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  const run = () => {
    searchState.q = $('#sq').value;
    searchState.r = $('#sr').value;
    searchState.cs = $('#scs').checked;
    searchState.ww = $('#sww').checked;
    const results = searchState.q ? searchBook(p, searchState.q, {caseSensitive: searchState.cs, wholeWord: searchState.ww}) : [];
    $('#sCount').textContent = searchState.q ? `${results.length} ${results.length === 1 ? 'coincidencia' : 'coincidencias'}` : '';
    $('#sReplaceAll').disabled = !results.length;
    $('#sResults').innerHTML = results.length
      ? results
          .slice(0, 200)
          .map(
            (r, i) =>
              `<div class="search-hit"><div class="hit-where">${esc(r.field.where)} <small class="muted">· ${esc(r.field.what)}</small></div><div class="hit-text">${esc(r.before)}<mark>${esc(r.match)}</mark>${esc(r.after)}</div><div class="hit-actions"><button type="button" data-go="${i}">Ir</button><button type="button" data-rep="${i}">Reemplazar</button></div></div>`,
          )
          .join('') + (results.length > 200 ? `<p class="muted">Se muestran 200 de ${results.length}.</p>` : '')
      : searchState.q
        ? `<div class="library-empty">${art('vacio-busqueda', 'art art-sm')}<p class="muted">Sin coincidencias.</p></div>`
        : '';
    $$('[data-rep]', d).forEach(
      (b) =>
        (b.onclick = () => {
          const r = results[Number(b.dataset.rep)];
          if (r.field.kind === 'scene') snapshot(r.field.chapter, 'Antes de reemplazar');
          if (replaceOne(r, searchState.r)) {
            save();
            run();
            if (view === 'write') writeView();
          }
        }),
    );
    $$('[data-go]', d).forEach(
      (b) =>
        (b.onclick = () => {
          const r = results[Number(b.dataset.go)];
          d.close();
          if (r.field.kind === 'scene' || r.field.kind === 'chapter') {
            reading = false;
            view = 'write';
            cid = r.field.chapter.id;
            sid = r.field.scene?.id || r.field.chapter.scenes[0].id;
            render();
            const ta = $('#text');
            if (ta && r.field.what === 'texto') {
              ta.focus();
              ta.setSelectionRange(r.index, r.index + r.length);
              const line = ta.value.slice(0, r.index).split('\n').length;
              ta.scrollTop = Math.max(0, (line - 4) * parseFloat(getComputedStyle(ta).lineHeight));
            }
          } else if (r.field.kind === 'entity') {
            view = 'map';
            mapTab = 'fichas';
            archiveView.type = '';
            render();
            $(`[data-entity="${r.field.entity.id}"]`)?.scrollIntoView({block: 'center'});
          } else if (r.field.kind === 'event') {
            view = 'map';
            mapTab = 'cronologia';
            render();
          } else {
            view = 'tracker';
            render();
          }
        }),
    );
  };
  let t;
  for (const id of ['sq', 'sr']) $('#' + id).oninput = () => (clearTimeout(t), (t = setTimeout(run, 200)));
  for (const id of ['scs', 'sww']) $('#' + id).onchange = run;
  $('#closeSearch').onclick = () => d.close();
  $('#sReplaceAll').onclick = async () => {
    const n = searchBook(p, searchState.q, {caseSensitive: searchState.cs, wholeWord: searchState.ww}).length;
    const ok = await choose('Reemplazar todo', `<p>Se van a cambiar <b>${n}</b> coincidencias de «${esc(searchState.q)}» por «${esc(searchState.r)}» en todo el libro.</p><p class="muted">Cada capítulo tocado guarda antes una versión «Antes de reemplazar».</p>`, [{value: 'go', label: `Reemplazar ${n}`, primary: true}]);
    if (!ok) return;
    const done = replaceAll(p, searchState.q, searchState.r, {caseSensitive: searchState.cs, wholeWord: searchState.ww});
    save();
    notify(`${done} reemplazos hechos.`);
    run();
    if (view !== 'library') paint();
  };
  d.showModal();
  $('#sq').focus();
  if (searchState.q) run();
}
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f' && view !== 'library') {
    e.preventDefault();
    searchDialog();
  }
});

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
  main().innerHTML =
    `<div class="toolbar"><div><div class="eyebrow">ESTRUCTURA NARRATIVA</div><h1>Una historia, pieza por pieza.</h1></div><span class="spacer"></span>${btn('order', 'Orden del libro', free ? '' : 'primary')}${btn('free', 'Lienzo libre', free ? 'primary' : '')}</div><p class="muted">${free ? 'Arrastra los iconos sin cambiar el orden del libro. Selecciona y presiona Enter para abrir.' : 'Un icono por capítulo. Las flechas cambian el orden del manuscrito; Enter o doble clic abre el documento.'}</p><div id="board"></div>`;
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
/* ---------- Fichas: tarjeta reutilizable (Archivo y Pizarrón) ---------- */
function entityTargets() {
  return [
    ...p.entities.filter((e) => !e.trashed).map((e) => ({id: e.id, label: `${e.type} · ${e.name}`})),
    ...p.chapters.filter((c) => !c.trashed).map((c) => ({id: c.id, label: `Capítulo · ${c.title}`})),
  ];
}
function entityCard(e, targets = entityTargets()) {
  return `<section class="panel entry" data-entity="${e.id}" style="border-top:4px solid ${e.color || 'var(--c-' + e.type.toLowerCase() + ')'}"><div class="head"><button class="portrait" data-portrait aria-label="Cambiar imagen de ${esc(e.name)}" title="Cambiar imagen">${e.image ? `<img src="${e.image}" alt="">` : art('ficha-' + e.type.toLowerCase(), 'portrait-default')}</button><div style="flex:1;min-width:0"><span class="eyebrow type-${e.type}">${esc(e.type)}</span><input class="name" data-name value="${esc(e.name)}" aria-label="Nombre"></div></div>${FIELDS[e.type].length ? `<div class="fields">${FIELDS[e.type].map(([k, l]) => `<label>${l}<input class="field" data-field="${k}" value="${esc(e.fields[k] || '')}"></label>`).join('')}</div>` : ''}<label>Descripción y notas<textarea class="field" data-notes rows="4">${esc(e.notes)}</textarea></label><label>Etiquetas <span class="muted">(separadas por coma)</span><input class="field" data-tags value="${esc(e.tags.join(', '))}" placeholder="aliado, acto 2, secreto"></label><div class="relations"><label>Relaciones</label>${e.relations
              .map(
                (r, i) =>
                  `<div class="relation"><input class="field" data-rel-label="${i}" value="${esc(r.label)}" placeholder="vive en, odia a, aparece en…" aria-label="Relación"><select class="field" data-rel-target="${i}" aria-label="Con quién">${targets.map((t) => `<option value="${t.id}" ${t.id === r.targetId ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select><button data-rel-remove="${i}" aria-label="Quitar relación" class="ghost">${icon('close')}</button></div>`,
              )
              .join('')}<button data-add-relation class="ghost" ${targets.length < 2 ? 'disabled' : ''}>${icon('link')}<span>Añadir relación</span></button></div><div class="foot"><div class="color-swatches" role="group" aria-label="Color">${SWATCHES.map((col) => `<button class="swatch ${e.color === col ? 'selected' : ''}" data-color="${col}" style="background:${col || 'var(--line)'}" aria-label="${col || 'Sin color'}"></button>`).join('')}</div><span class="spacer"></span>${e.image ? `<button data-remove-image class="ghost">Quitar imagen</button>` : ''}<button data-trash class="ghost">A papelera</button></div></section>`;
}
// rerender: función que vuelve a pintar la vista que contiene las tarjetas.
function bindEntityCards(targets, rerender, root = document) {
  const archiveView = rerender;
  $$('[data-entity]', root).forEach((el) => {
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
}

function archiveView() {
  const live = p.entities.filter((e) => !e.trashed);
  const targets = [
    ...live.map((e) => ({id: e.id, label: `${e.type} · ${e.name}`})),
    ...p.chapters.filter((c) => !c.trashed).map((c) => ({id: c.id, label: `Capítulo · ${c.title}`})),
  ];
  const typeFilter = archiveView.type || '';
  const shown = live.filter((e) => !typeFilter || e.type === typeFilter);
  main().innerHTML =
    `<div class="toolbar"><div><div class="eyebrow">ARCHIVO NARRATIVO</div><h1>Todo lo que habita tu historia.</h1></div><span class="spacer"></span><select id="entityType" class="field" style="width:auto" aria-label="Tipo de la nueva ficha">${ENTITY_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>${btn('addEntity', '＋ Nueva ficha', 'primary')}</div><div class="chips" style="margin-bottom:14px"><button class="chip ${typeFilter === '' ? 'primary' : ''}" data-filter="">Todas <small>${live.length}</small></button>${ENTITY_TYPES.map((t) => `<button class="chip type-${t} ${typeFilter === t ? 'selected' : ''}" data-filter="${t}" ${typeFilter === t ? 'style="border-color:currentColor"' : ''}><span class="dot"></span>${t}s <small>${live.filter((e) => e.type === t).length}</small></button>`).join('')}</div><div class="grid">${
      shown
        .map((e) => entityCard(e, targets))
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
  bind('addEntity', async () => {
    const type = $('#entityType').value;
    const tpl = await choose(
      `Nueva ficha`,
      `<div class="tpl-list">${ENTITY_TEMPLATES.map((t, i) => `<label class="tpl"><input type="radio" name="tpl" value="${t.id}" ${i === 0 ? 'checked' : ''}><b>${esc(t.name)}</b><small>${esc(t.type ? t.type + ' · ' : type + ' · ')}${esc(t.desc)}</small></label>`).join('')}</div>`,
      [{value: 'ok', label: 'Crear ficha', primary: true}],
    );
    if (!tpl) return;
    const e = entityFrom(choose.lastPick || 'blank', type);
    p.entities.unshift(e);
    archiveView.type = '';
    save();
    archiveView();
    $(`[data-entity="${e.id}"] [data-name]`)?.select();
  });
  bindEntityCards(targets, archiveView);
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
  main().innerHTML =
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
const reviewAccepted = new Map(); // reviewId → Set de cambios aceptados
let reviewEditing = false;
function reviewView() {
  let r = p.reviews.find((r) => r.id === reviewId) || p.reviews.at(-1);
  if (!r) {
    $('#main').innerHTML = `<h1>Tu mesa de revisión.</h1><div class="notice">Abre una escena en Escribir y elige <b>Revisar escena</b>. Descarga la solicitud, pásasela a una IA o a una persona, y carga la respuesta (o pega la propuesta). Aquí verás los cambios uno por uno.</div><details class="panel" style="margin-top:14px"><summary>Formato de la respuesta (para una IA)</summary><pre class="code">{
  "kind": "review-response",
  "reviewId": "(el id de la solicitud)",
  "proposal": "texto completo revisado",
  "notes": "comentarios opcionales"
}</pre></details>`;
    return;
  }
  reviewId = r.id;
  const c = p.chapters.find((c) => c.id === r.chapterId),
    s = c.scenes.find((s) => s.id === r.sceneId);
  const blocks = diffBlocks(r.base, r.proposal);
  const n = countChanges(blocks);
  if (!reviewAccepted.has(r.id)) reviewAccepted.set(r.id, new Set([...Array(n).keys()]));
  const acc = reviewAccepted.get(r.id);
  for (const k of [...acc]) if (k >= n) acc.delete(k);
  const stale = s && s.text !== r.base;
  let k = 0;
  const diffHtml = blocks
    .map((b) => {
      if (b.type === 'same') return esc(b.text).replace(/\n/g, '<br>');
      const i = k++;
      const on = acc.has(i);
      return `<span class="chg ${on ? 'on' : ''}" data-chg="${i}" role="checkbox" aria-checked="${on}" tabindex="0" title="${on ? 'Aceptado · toca para rechazar' : 'Rechazado · toca para aceptar'}"><del>${esc(b.before).replace(/\n/g, '<br>') || '∅'}</del><ins>${esc(b.after).replace(/\n/g, '<br>') || '∅'}</ins></span>`;
    })
    .join('');
  $('#main').innerHTML = `<div class="eyebrow">REVISIÓN · CAMBIO POR CAMBIO</div><h1>Dos miradas sobre la misma escena.</h1>
  <div class="toolbar"><select id="reviewSelect" class="field" style="width:auto" aria-label="Revisión">${p.reviews.map((x, i) => `<option value="${x.id}" ${x.id === r.id ? 'selected' : ''}>Revisión ${i + 1} · ${esc(p.chapters.find((c) => c.id === x.chapterId)?.title || '')}</option>`).join('')}</select><span class="muted">${esc(c.title)} / ${esc(s?.title || 'Escena de otra versión')}</span><span class="spacer"></span>${btn('request', 'Descargar solicitud')}${btn('copyRequest', 'Copiar solicitud')}</div>
  <label>Instrucción de revisión<input id="instruction" class="field" value="${esc(r.instruction)}" placeholder="Corrige puntuación y conserva mi voz"></label>
  ${r.notes ? `<div class="notice"><b>Notas de quien revisó:</b> ${esc(r.notes)}</div>` : ''}
  ${stale ? '<div class="notice">El texto de la escena cambió después de pedir esta revisión. Puedes leer los cambios, pero para aplicarlos inicia otra revisión.</div>' : ''}
  <div class="toolbar review-bar"><span class="muted">${n ? `${acc.size} de ${n} cambios aceptados` : 'Sin diferencias entre el original y la propuesta.'}</span><span class="spacer"></span>${btn('acceptAll', 'Aceptar todos')}${btn('rejectAll', 'Rechazar todos')}${btn('editProposal', reviewEditing ? 'Ver cambios' : 'Editar propuesta')}</div>
  ${reviewEditing ? `<section class="panel"><h2>Propuesta</h2><textarea id="proposal" class="field manuscript" style="min-height:40vh">${esc(r.proposal)}</textarea><p class="muted">Pega aquí la propuesta completa. Al volver a «Ver cambios» se recalculan las diferencias.</p></section>` : `<section class="panel diff-view manuscript">${diffHtml || '<p class="muted">Vacío.</p>'}</section><p class="muted"><del>tachado</del> es lo que se quita; <ins>subrayado</ins> es lo nuevo. Toca un cambio para aceptarlo o rechazarlo.</p>`}
  <div class="toolbar" style="margin-top:14px">${btn('apply', n ? `Aplicar ${acc.size} ${acc.size === 1 ? 'cambio' : 'cambios'}` : 'Nada que aplicar', 'primary')}</div><p class="muted">Aplicar guarda antes una versión del capítulo.</p>`;
  $('#reviewSelect').onchange = (e) => {
    reviewId = e.target.value;
    reviewEditing = false;
    reviewView();
  };
  $('#instruction').oninput = (e) => {
    r.instruction = e.target.value;
    save();
  };
  const pr = $('#proposal');
  if (pr)
    pr.oninput = (e) => {
      r.proposal = e.target.value;
      reviewAccepted.delete(r.id);
      save();
    };
  $$('[data-chg]').forEach((el) => {
    const toggle = () => {
      const i = Number(el.dataset.chg);
      acc.has(i) ? acc.delete(i) : acc.add(i);
      reviewView();
    };
    el.onclick = toggle;
    el.onkeydown = (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggle());
  });
  bind('acceptAll', () => ((reviewAccepted.set(r.id, new Set([...Array(n).keys()])), reviewView())));
  bind('rejectAll', () => ((reviewAccepted.set(r.id, new Set()), reviewView())));
  bind('editProposal', () => ((reviewEditing = !reviewEditing), reviewView()));
  const requestJson = () => JSON.stringify({schemaVersion: 1, kind: 'review-request', id: r.id, reviewId: r.id, chapter: c.title, scene: s?.title || '', instruction: r.instruction, base: r.base, responseFormat: {kind: 'review-response', reviewId: r.id, proposal: '(texto completo revisado)', notes: '(opcional)'}}, null, 2);
  bind('request', () => download('MORIARTY_SOLICITUD.json', requestJson()));
  bind('copyRequest', async () => {
    try {
      await navigator.clipboard.writeText(requestJson());
      notify('Solicitud copiada. Pégala en el chat con la instrucción.');
    } catch {
      notify('No se pudo copiar; descarga la solicitud.');
    }
  });
  bind('apply', () => {
    if (!s) return notify('La escena ya no existe en esta versión.');
    if (!n) return;
    try {
      const merged = applyBlocks(blocks, acc);
      snapshot(c, 'Antes de aplicar revisión');
      applyReview(s, r, merged);
      r.base = merged;
      r.proposal = merged;
      reviewAccepted.delete(r.id);
      save();
      notify(`${acc.size} cambios aplicados. La versión anterior quedó guardada.`);
      reviewView();
    } catch (e) {
      notify(e.message);
    }
  });
}

/* ---------- Diálogo de elección ---------- */
// options: [{value, label, primary?}] → resuelve con el value elegido o null si se cancela.
function choose(title, html, options) {
  return new Promise((resolve) => {
    $('#chooseDialog')?.remove();
    const d = document.createElement('dialog');
    d.id = 'chooseDialog';
    d.className = 'library-dialog';
    d.innerHTML = `<div class="dialog-heading"><h2>${esc(title)}</h2></div>${html}<div class="dialog-actions choice-actions"><button type="button" data-choice="">Cancelar</button>${options.map((o) => `<button type="button" data-choice="${esc(o.value)}" class="${o.primary ? 'primary' : ''}">${esc(o.label)}</button>`).join('')}</div>`;
    document.body.append(d);
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input')) {
        e.preventDefault();
        d.querySelector('[data-choice].primary')?.click();
      }
    });
    let value = null;
    $$('[data-choice]', d).forEach(
      (b) =>
        (b.onclick = () => {
          value = b.dataset.choice || null;
          choose.lastPick = d.querySelector('input[type=radio]:checked')?.value || '';
          choose.lastText = d.querySelector('input[type=text], input:not([type]), textarea')?.value || '';
          choose.lastDate = d.querySelector('input[type=date]')?.value || '';
          choose.lastChecked = !!d.querySelector('input[type=checkbox]:checked');
          d.close();
        }),
    );
    d.addEventListener('close', () => (d.remove(), resolve(value)));
    d.showModal();
  });
}
const listHtml = (items) => `<ul class="choice-list">${items.slice(0, 6).map((t) => `<li>${esc(t)}</li>`).join('')}${items.length > 6 ? `<li class="muted">y ${items.length - 6} más</li>` : ''}</ul>`;

/* ---------- Carga de JSON: archivo, pegado o arrastre ---------- */
async function importData(data, sourceName = 'archivo') {
  busy('Validando ' + sourceName + '…', 30);
  await yieldFrame();
  const rr = validateReviewResponse(data);
  if (rr) {
    let target = p.reviews.find((x) => x.id === rr.reviewId);
    if (!target)
      for (const b of library.books) {
        const found = b.project.reviews.find((x) => x.id === rr.reviewId);
        if (found) {
          openBook(b.project.id);
          target = found;
          break;
        }
      }
    if (!target) throw Error('No encuentro una revisión con ese reviewId en tu biblioteca.');
    target.proposal = rr.proposal;
    target.notes = rr.notes;
    reviewAccepted.delete(target.id);
    reviewId = target.id;
    reviewEditing = false;
    view = 'review';
    saveNow();
    render();
    notify('Respuesta de revisión cargada. Acepta o rechaza cada cambio.');
    return;
  }
  if (data?.kind === 'moriarty-pack') {
    if (loadFailure) throw Error('Recupera un respaldo antes de cargar paquetes.');
    const conflicts = packConflicts(p, data);
    let replace = false;
    if (conflicts.sameBook && (conflicts.chapters.length || conflicts.entities.length)) {
      busy(false);
      const what = [...conflicts.chapters.map((t) => `Capítulo · ${t}`), ...conflicts.entities.map((t) => `Ficha · ${t}`)];
      const choice = await choose(
        'Esto ya está en tu libro',
        `<p>El archivo viene de <b>${esc(p.title)}</b> y trae piezas que ya tienes:</p>${listHtml(what)}<p class="muted">Reemplazar actualiza esas piezas con lo del archivo. El texto actual de cada capítulo se guarda antes como versión, así que puedes recuperarlo.</p>`,
        [
          {value: 'copy', label: 'Agregar como copia'},
          {value: 'replace', label: 'Reemplazar', primary: true},
        ],
      );
      if (!choice) return;
      replace = choice === 'replace';
      busy('Incorporando…', 60);
    } else if (data.bookId && data.bookId !== p.id && data.bookTitle) {
      busy(false);
      const choice = await choose(
        'Este capítulo es de otro libro',
        `<p>Salió de <b>${esc(data.bookTitle)}</b> y lo vas a cargar en <b>${esc(p.title)}</b>, que es el libro abierto.</p><p class="muted">Si querías cargarlo en su libro, cancela, abre ese libro desde Biblioteca y vuelve a cargarlo.</p>`,
        [{value: 'go', label: 'Cargar aquí de todos modos', primary: true}],
      );
      if (!choice) return;
      busy('Incorporando…', 60);
    }
    const merged = mergePack(p, data, {replace});
    busy('Incorporando al libro…', 70);
    await yieldFrame();
    const book = activeBook(library);
    if (!book) throw Error('Crea o abre un libro antes de cargar un paquete.');
    book.project = merged;
    p = merged;
    const n = {e: data.entities?.length || 0, c: data.chapters?.length || 0, v: data.events?.length || 0};
    saveNow();
    if (n.c) {
      view = 'write';
      const c = merged.chapters.find((c) => c.title === data.chapters[0].title && !c.trashed) || merged.chapters.at(-1);
      cid = c.id;
      sid = c.scenes[0].id;
    } else view = n.e ? 'archive' : 'timeline';
    render();
    notify(
      `${replace ? 'Actualizado' : 'Paquete cargado'} en «${p.title}»: ${[n.e && `${n.e} fichas`, n.c && `${n.c} capítulos`, n.v && `${n.v} acontecimientos`]
        .filter(Boolean)
        .join(', ')}.`,
    );
    return;
  }
  let mode = 'copy';
  if (!loadFailure) {
    const repeated = importConflicts(library, data);
    if (repeated.length) {
      busy(false);
      const choice = await choose(
        repeated.length === 1 ? 'Ya tienes este libro' : 'Ya tienes estos libros',
        `${listHtml(repeated)}<p>Parece que viene de otro dispositivo. ¿Lo reemplazo con este archivo o agrego una copia aparte?</p><p class="muted">Al reemplazar, la versión que tienes ahora pasa a la papelera de libros como «versión anterior». No se pierde nada.</p>`,
        [
          {value: 'copy', label: 'Agregar copia'},
          {value: 'replace', label: 'Reemplazar', primary: true},
        ],
      );
      if (!choice) return;
      mode = choice;
    }
  }
  const next = loadFailure
    ? data?.kind === 'moriarty-library'
      ? validateLibrary(data)
      : createLibrary(validate(data))
    : importIntoLibrary(library, data, mode);
  if (loadFailure) {
    busy(false);
    if (!confirm('El guardado actual es ilegible. Se descargará una copia de recuperación antes de abrir este respaldo. ¿Continuar?'))
      return;
    await downloadRecovery();
  }
  busy('Guardando…', 80);
  await yieldFrame();
  library = next;
  loadFailure = false;
  openBook(library.activeBookId);
  notify(mode === 'replace' ? 'Reemplazado. La versión anterior quedó en la papelera de libros.' : 'Importado. Tus otros libros se conservan en la biblioteca.');
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
  bindMenu($('#' + id), $('#' + triggerId));
}
menu('exportMenu', 'export');
menu('importMenu', 'import');
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.body.classList.contains('focus') && !document.querySelector('dialog[open]')) document.body.classList.remove('focus');
  }
});
{
  const exit = document.createElement('button');
  exit.className = 'focus-exit';
  exit.innerHTML = icon('close') + '<span>Salir de enfoque</span>';
  exit.onclick = () => document.body.classList.remove('focus');
  document.body.append(exit);
}
// Pista de desplazamiento en la navegación cuando no cabe completa.
{
  const nav = $('nav');
  const wrap = document.createElement('div');
  wrap.className = 'nav-wrap';
  nav.replaceWith(wrap);
  wrap.append(nav);
  const hint = () => wrap.classList.toggle('can-scroll', nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 8);
  nav.addEventListener('scroll', hint, {passive: true});
  window.addEventListener('resize', hint);
  requestAnimationFrame(hint);
}

/* ---------- Acciones globales ---------- */
$$('[data-view]').forEach(
  (b) =>
    (b.onclick = () => {
      if (!hasBook() && b.dataset.view !== 'library') return notify('Crea o abre un libro primero.');
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
  markExported();
  download(`MORIARTY_${slug(p.title)}.moriarty.json`, JSON.stringify(p, null, 2));
});
bind('exportPack', () => {
  saveNow();
  download(
    `MORIARTY_${slug(p.title)}_FICHAS.moriarty.json`,
    JSON.stringify(createPack(p, {entities: true, chapters: false, events: false}), null, 2),
  );
});
async function authorName() {
  if (prefs.author !== undefined) return prefs.author;
  await choose('Nombre de autor', `<label>Cómo quieres firmar (puedes dejarlo vacío)<input class="field" name="author" placeholder="Atátoriz"></label><p class="muted">Se guarda en este dispositivo y lo puedes cambiar desde Exportar.</p>`, [{value: 'ok', label: 'Guardar', primary: true}]);
  prefs.author = choose.lastText || '';
  applyPrefs();
  return prefs.author;
}
bind('exportDocx', async () => {
  saveNow();
  const author = await authorName();
  busy('Armando el DOCX…');
  await yieldFrame();
  try {
    const blob = docx(p, {author});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href: url, download: `${slug(p.title)}.docx`});
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    markExported();
  } finally {
    busy(false);
  }
});
bind('exportEpub', async () => {
  saveNow();
  const author = await authorName();
  busy('Armando el EPUB…');
  await yieldFrame();
  try {
    const blob = epub(p, {author});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href: url, download: `${slug(p.title)}.epub`});
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    markExported();
  } finally {
    busy(false);
  }
});
bind('exportPdf', async () => {
  saveNow();
  const author = await authorName();
  const w = window.open('', '_blank');
  if (!w) return notify('El navegador bloqueó la ventana. Permite ventanas emergentes para esta app.');
  w.document.write(printHtml(p, {author}));
  w.document.close();
  markExported();
});
bind('setAuthor', async () => {
  prefs.author = undefined;
  await authorName();
  notify(prefs.author ? `Firmarás como «${prefs.author}».` : 'Sin nombre de autor.');
});
bind('theme', () => {
  prefs.theme = {auto: 'light', light: 'dark', dark: 'auto'}[prefs.theme || 'auto'];
  applyPrefs();
});
bind('searchBtn', () => view !== 'library' && searchDialog());
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
bind('restoreBackup', async () => {
  const list = await listBackups();
  if (!list.length) return notify('Todavía no hay respaldos automáticos. Se crean solos mientras usas la app.');
  const fmt = (at) => new Date(at).toLocaleString('es-MX', {dateStyle: 'medium', timeStyle: 'short'});
  const choice = await choose(
    'Respaldos automáticos',
    `<p class="muted">La app guarda sola una copia de toda tu biblioteca al abrirla y cada 15 minutos si hubo cambios. Se conservan las últimas 10, en este navegador.</p><ul class="choice-list" style="list-style:none;padding:0">${list.map((b) => `<li><label style="display:flex;gap:8px;align-items:center;color:var(--text);font-size:14px;margin:4px 0"><input type="radio" name="bk" value="${esc(b.at)}">${esc(fmt(b.at))} · ${b.books} ${b.books === 1 ? 'libro' : 'libros'} · ${b.words.toLocaleString('es-MX')} palabras</label></li>`).join('')}</ul><p class="muted">Restaurar reemplaza la biblioteca actual. Antes de hacerlo se guarda un respaldo de cómo está ahora.</p>`,
    [{value: 'restore', label: 'Restaurar el elegido', primary: true}],
  );
  const picked = document.querySelector('#chooseDialog input[name=bk]:checked')?.value || choose.lastPick;
  if (choice !== 'restore' || !picked) return choice === 'restore' && notify('Elige un respaldo de la lista.');
  try {
    const data = validateLibrary(await readBackup(picked));
    await backupNow(library, totalWords());
    library = data;
    loadFailure = false;
    syncActive();
    cid = p.chapters.find((c) => !c.trashed)?.id;
    sid = current()?.scenes[0].id;
    view = 'library';
    saveNow();
    render();
    notify(`Biblioteca restaurada al ${fmt(picked)}.`);
  } catch (e) {
    notify('No se pudo restaurar ese respaldo: ' + e.message);
  }
});
bind('new', () => {
  if (loadFailure) {
    notify('Recupera un respaldo antes de crear libros. El guardado ilegible se conserva.');
    return;
  }
  libraryView.bookDialog();
});
bind('downloadRecovery', downloadRecovery);
bind('resetLibrary', async () => {
  if (!confirm('Se descargará el guardado ilegible para recuperarlo antes de iniciar una biblioteca nueva. ¿Continuar?'))
    return;
  await downloadRecovery();
  library = createLibrary();
  syncActive();
  loadFailure = false;
  cid = undefined;
  sid = undefined;
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

/* ---------- Contexto compartido con los módulos (tracker, pizarrón) ---------- */
const ctx = {
  get p() { return p; },
  get library() { return library; },
  get cid() { return cid; },
  set cid(v) { cid = v; },
  get sid() { return sid; },
  set sid(v) { sid = v; },
  get prefs() { return prefs; },
  applyPrefs,
  $, $$, esc, btn, bind, save, saveNow, notify, download, choose, listHtml, icon, art,
  main, entityCard, bindEntityCards, entityTargets, chapterLabel, ownNumber, chapterWords,
  go(v, tab) { view = v; if (tab) mapTab = tab; render(); },
  openChapter(c) { view = 'write'; reading = false; select(c); },
  rerender: () => paint(),
  uid, milestone, STATUSES, STATUS_LABEL, ENTITY_TYPES,
};

/* ---------- Arranque ---------- */
render();
if (loadFailure) {
  setSaved('No se pudo leer la biblioteca · Guardado bloqueado', 'warn');
} else {
  saveNow();
  if (migrated) notify('Tu libro de V0.1 ya está en la biblioteca. Conservamos el guardado original.');
}
const totalWords = () => library.books.filter((b) => !b.trashed).reduce((n, b) => n + wordCount(b.project), 0);
askPersistence();
if (!loadFailure) {
  backupNow(library, totalWords());
  setInterval(() => !loadFailure && backupNow(library, totalWords()), 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.hidden && !loadFailure && backupNow(library, totalWords()));
  const days = prefs.lastExport ? Math.floor((Date.now() - prefs.lastExport) / 86400000) : null;
  const today = new Date().toDateString();
  if (totalWords() > 0 && (days === null || days >= 7) && prefs.remindedOn !== today) {
    prefs.remindedOn = today;
    applyPrefs();
    setTimeout(
      () =>
        notify(
          days === null
            ? 'Consejo: exporta tu biblioteca de vez en cuando (Exportar → Respaldar biblioteca). Es tu copia fuera de este navegador.'
            : `Hace ${days} días que no exportas. Exportar → Respaldar biblioteca te deja una copia fuera de este navegador.`,
          9000,
        ),
      1500,
    );
  }
}
const iconObserver = new MutationObserver(() => decorateIcons());
iconObserver.observe(document.body, {childList: true, subtree: true});
requestAnimationFrame(() => {
  const splash = $('#splash');
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 400);
});
const APP_VERSION = '0.4.6';
$('#appVersion').textContent = `Tienes la ${APP_VERSION}. Trae la última versión publicada.`;
let swReg = null;
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      swReg = reg;
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'activated' && navigator.serviceWorker.controller) notify('Hay una versión nueva de MORIARTY. Cargar → Actualizar la app.', 8000);
        });
      });
    })
    .catch(() => notify('Modo sin conexión no disponible en este navegador.'));
}
bind('updateApp', async () => {
  if (!navigator.onLine) return notify('Sin conexión: la app se actualiza cuando vuelvas a tener internet.');
  saveNow();
  busy('Buscando la última versión…');
  try {
    if (swReg) await swReg.update();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('moriarty-')).map((k) => caches.delete(k)));
  } catch {}
  location.reload();
});
