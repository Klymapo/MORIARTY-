const paths={
 library:'M4 4h4v16H4z M10 4h4v16h-4z M16 5l4-1 3 15-4 1z',
 book:'M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3z M4 17h16 M8 7h8 M8 11h5',
 write:'m16 3 5 5-12 12H4v-5L16 3z M14 5l5 5',
 board:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 archive:'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
 timeline:'M6 3v18 M3 6h6 M3 12h6 M3 18h6 M13 6h8 M13 12h5 M13 18h8',
 review:'M9 3H4v18h16V8 M9 3v5h11 M9 3l11 5 M8 14l3 3 6-6',
 plus:'M12 5v14 M5 12h14',
 download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
 upload:'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',
 saga:'M12 3v6 M5 15v-4h14v4 M3 16h4v5H3z M10 16h4v5h-4z M17 16h4v5h-4z M10 3h4v4h-4z M12 11v5',
 edit:'m16 3 5 5-12 12H4v-5L16 3z M14 5l5 5',
 arrow:'M4 12h16 m-6-6 6 6-6 6',
 back:'M20 12H4 m6-6-6 6 6 6',
 up:'M12 20V4 m-6 6 6-6 6 6',
 down:'M12 4v16 m-6-6 6 6 6-6',
 trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
 restore:'M3 11a9 9 0 1 1 2 7 M3 4v7h7',
 focus:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
 history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v6l4 2',
 canvas:'M3 3h18v18H3z M7 7h4v4H7z M14 13h4v4h-4z',
 search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 check:'m4 12 5 5L20 6',
 close:'m6 6 12 12 M18 6 6 18',
 text:'M4 4h16 M12 4v16 M8 20h8',
 file:'M4 3h10l6 6v12H4z M14 3v6h6 M8 13h8 M8 17h6'
};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]||paths.book}"/></svg>`;}
const map={export:'download',import:'upload',new:'plus',txt:'text',focus:'focus',versions:'history',reviewStart:'review',addChapter:'plus',addScene:'plus',trashChapter:'trash',back:'back',snapshot:'plus',order:'board',free:'canvas',addEntity:'plus',addEvent:'plus',originalTab:'file',proposalTab:'edit',apply:'check',request:'download'};
export const actionIcon=id=>map[id]||'book';
export function decorateIcons(root=document){
 for(const el of root.querySelectorAll('button[data-icon],button[data-view],button[data-move],button[data-up],button[data-down],button[data-trash],button[data-restore],button[data-recover],button[data-recover-entity],button[data-recover-event]')){
  if(el.querySelector('svg'))continue;
  let name=el.dataset.icon||el.dataset.view;
  if(!name){if(el.hasAttribute('data-move'))name=el.dataset.dir==='-1'?'up':'down';else if(el.hasAttribute('data-up'))name='up';else if(el.hasAttribute('data-down'))name='down';else if(el.hasAttribute('data-trash'))name='trash';else name='restore';}
  const label=el.textContent.replace(/^[✎▦▱◷◇↑↓↶＋]\s*/u,'');
  const text=document.createElement('span');text.textContent=label;
  el.replaceChildren();el.insertAdjacentHTML('beforeend',icon(name));if(label)el.append(text);
 }
}
