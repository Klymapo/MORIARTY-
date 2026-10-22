const paths = {
  library: 'M4 4h4v16H4z M10 4h4v16h-4z M16 5l4-1 3 15-4 1z',
  book: 'M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3z M4 17h16 M8 7h8 M8 11h5',
  write: 'm16 3 5 5-12 12H4v-5L16 3z M14 5l5 5',
  board: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  archive: 'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
  timeline: 'M6 3v18 M3 6h6 M3 12h6 M3 18h6 M13 6h8 M13 12h5 M13 18h8',
  review: 'M9 3H4v18h16V8 M9 3v5h11 M9 3l11 5 M8 14l3 3 6-6',
  plus: 'M12 5v14 M5 12h14',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
  upload: 'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',
  saga: 'M12 3v6 M5 15v-4h14v4 M3 16h4v5H3z M10 16h4v5h-4z M17 16h4v5h-4z M10 3h4v4h-4z M12 11v5',
  edit: 'm16 3 5 5-12 12H4v-5L16 3z M14 5l5 5',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  back: 'M20 12H4 m6-6-6 6 6 6',
  up: 'M12 20V4 m-6 6 6-6 6 6',
  down: 'M12 4v16 m-6-6 6 6 6-6',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  restore: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7',
  focus: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
  history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v6l4 2',
  canvas: 'M3 3h18v18H3z M7 7h4v4H7z M14 13h4v4h-4z',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  check: 'm4 12 5 5L20 6',
  close: 'm6 6 12 12 M18 6 6 18',
  text: 'M4 4h16 M12 4v16 M8 20h8',
  indent: 'M4 6h16 M10 12h10 M10 18h10 M4 10l3 2-3 2',
  center: 'M4 6h16 M7 12h10 M4 18h16',
  separator: 'M4 12h3 M10 12h4 M17 12h3 M12 6l1.5 2.5h-3z M12 18l1.5-2.5h-3z',
  pagebreak: 'M5 3h10l4 4v3 M5 3v7 M5 14v7h14v-7 M3 12h3 M9 12h3 M15 12h3 M21 12h0',
  dropcap: 'M3 20 8 5l5 15 M4.5 15h7 M15 8h6 M15 12h6 M15 16h6 M15 20h6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7 M12 17h.01',
  keyboard: 'M3 6h18v12H3z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h10',
  file: 'M4 3h10l6 6v12H4z M14 3v6h6 M8 13h8 M8 17h6',
  image: 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6 M16 9a1 1 0 1 0 0-.1',
  tag: 'M3 12V3h9l9 9-9 9-9-9z M7 7h.1',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  textBigger: 'M4 18 9 6l5 12 M6 14h6 M17 8v8 M14 12h6',
  textSmaller: 'M4 18 9 6l5 12 M6 14h6 M14 12h6',
  clipboard: 'M9 4h6v3H9z M7 5H5v16h14V5h-2 M9 11h6 M9 15h6',
  pack: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  pin: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z M12 10a1 1 0 1 0 0-.1',
  box: 'M4 8h16v12H4z M4 8l2-4h12l2 4 M10 12h4',
  note: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5 0-2.5S17 15 18 15a3 3 0 0 0 0-6c-1 0-2 1-2-1s-1-5-4-5z M8 10h.1 M8 14h.1 M12 7h.1',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  more: 'M12 6h.1 M12 12h.1 M12 18h.1',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  flag: 'M5 21V4 M5 4h13l-3 4 3 4H5',
  replace: 'M4 7h11l-3-3 M20 17H9l3 3 M4 7v4 M20 17v-4',
  zoomIn: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-5-5 M10 7v6 M7 10h6',
  zoomOut: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-5-5 M7 10h6',
  fit: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5 M9 9h6v6H9z',
  shuffle: 'M3 7h4l10 10h4 M17 4l4 3-4 3 M3 17h4l3-3 M14 10l3-3h4 M17 20l4-3-4-3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name] || paths.book}"/></svg>`;
}
const map = {
  cover: 'image',
  pasteJson: 'clipboard',
  exportPack: 'pack',
  exportBook: 'download',
  backup: 'download',
  importFile: 'upload',
  bigger: 'textBigger',
  smaller: 'textSmaller',
  addRelation: 'link',
  pizarron: 'board',
  exportChapter: 'download',
  zoomIn: 'zoomIn',
  zoomOut: 'zoomOut',
  zoomFit: 'fit',
  layout: 'shuffle',
  newEntityMap: 'plus',
  addMilestone: 'flag',
  calPrev: 'back',
  calNext: 'arrow',
  acceptAll: 'check',
  rejectAll: 'close',
  editProposal: 'edit',
  copyRequest: 'clipboard',
  openChapter: 'write',
  theme: 'sun',
  search: 'search',
  tracker: 'timeline',
  exportDocx: 'file',
  exportEpub: 'book',
  exportPdf: 'text',
  export: 'download',
  import: 'upload',
  new: 'plus',
  txt: 'text',
  focus: 'focus',
  versions: 'history',
  reviewStart: 'review',
  addChapter: 'plus',
  addScene: 'plus',
  trashChapter: 'trash',
  back: 'back',
  snapshot: 'plus',
  order: 'board',
  free: 'canvas',
  addEntity: 'plus',
  addEvent: 'plus',
  originalTab: 'file',
  proposalTab: 'edit',
  apply: 'check',
  request: 'download',
};
export const actionIcon = (id) => map[id] || 'book';
export function decorateIcons(root = document) {
  for (const el of root.querySelectorAll(
    'button[data-icon],button[data-view],button[data-move],button[data-up],button[data-down],button[data-trash],button[data-restore],button[data-recover],button[data-recover-entity],button[data-recover-event]',
  )) {
    if (el.querySelector('svg')) continue;
    let name = el.dataset.icon || el.dataset.view;
    if (!name) {
      if (el.hasAttribute('data-move')) name = el.dataset.dir === '-1' ? 'up' : 'down';
      else if (el.hasAttribute('data-up')) name = 'up';
      else if (el.hasAttribute('data-down')) name = 'down';
      else if (el.hasAttribute('data-trash')) name = 'trash';
      else name = 'restore';
    }
    const label = el.textContent.replace(/^[✎▦▱◷◇↑↓↶＋]\s*/u, '');
    const text = document.createElement('span');
    text.textContent = label;
    el.replaceChildren();
    el.insertAdjacentHTML('beforeend', icon(name));
    if (label) el.append(text);
  }
}

// Ilustraciones de Argos (dist/img). Devuelve <picture> con versión clara y oscura.
export function art(name, cls = 'art') {
  return `<span class="${cls}"><img class="art-light" src="img/${name}-claro.webp" alt="" decoding="async"><img class="art-dark" src="img/${name}-oscuro.webp" alt="" decoding="async"></span>`;
}
export const COVERS = ['portada-tinta', 'portada-petroleo', 'portada-ambar'];
