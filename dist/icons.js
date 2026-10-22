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
