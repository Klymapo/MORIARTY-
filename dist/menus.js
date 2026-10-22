// MORIARTY — menús desplegables.
// Al abrirse, la lista sale de su contenedor y se dibuja encima de todo (así ninguna tarjeta o cabecera la recorta).
// Escritorio: se coloca junto al botón, hacia abajo o hacia arriba según el espacio. Celular: hoja que sube desde abajo.
const mobile = matchMedia('(max-width: 640px)');
let current = null;
let backdrop = null;

function getBackdrop() {
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', (e) => (e.stopPropagation(), closeMenus()));
    document.body.append(backdrop);
  }
  return backdrop;
}

export function closeMenus() {
  if (!current) return;
  const {m, list, trigger} = current;
  current = null;
  m.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
  list.classList.remove('floating', 'sheet');
  list.style.cssText = '';
  m.append(list);
  getBackdrop().hidden = true;
}

function place(list, trigger) {
  const r = trigger.getBoundingClientRect();
  const gap = 6,
    pad = 8;
  const w = list.offsetWidth;
  const left = Math.max(pad, Math.min(r.right - w, innerWidth - w - pad));
  const below = innerHeight - r.bottom - gap - pad,
    above = r.top - gap - pad;
  const h = list.scrollHeight;
  let top;
  if (h <= below || below >= above) {
    top = r.bottom + gap;
    if (h > below) list.style.maxHeight = below + 'px';
  } else {
    if (h > above) list.style.maxHeight = above + 'px';
    top = r.top - gap - Math.min(h, above);
  }
  list.style.left = left + 'px';
  list.style.top = top + 'px';
}

export function toggleMenu(m, trigger) {
  const same = current?.m === m;
  closeMenus();
  if (same) return false;
  const list = m.querySelector(':scope > .menu-list');
  if (!list) return false;
  m.classList.add('open');
  trigger.setAttribute('aria-expanded', 'true');
  document.body.append(list);
  list.classList.add('floating');
  if (mobile.matches) {
    list.classList.add('sheet');
    getBackdrop().hidden = false;
  } else place(list, trigger);
  current = {m, list, trigger};
  return true;
}

// Conecta un contenedor .menu con su botón. Los botones de la lista cierran el menú salvo los de [data-keep].
export function bindMenu(m, trigger) {
  if (!m || !trigger) return;
  trigger.onclick = (e) => {
    e.stopPropagation();
    toggleMenu(m, trigger);
  };
  for (const b of m.querySelectorAll('.menu-list button')) {
    if (b.closest('[data-keep]')) b.addEventListener('click', (e) => e.stopPropagation());
    else b.addEventListener('click', () => closeMenus());
  }
}

document.addEventListener('click', (e) => {
  if (current && !current.list.contains(e.target)) closeMenus();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenus());
let lastW = innerWidth;
// Solo un cambio de ancho cierra (el teclado del celular cambia el alto y no debe cerrar la hoja).
addEventListener('resize', () => innerWidth !== lastW && ((lastW = innerWidth), closeMenus()));
// En escritorio, al desplazar la página el menú acompaña a su botón; si el botón sale de la vista, se cierra.
addEventListener(
  'scroll',
  (e) => {
    if (!current || mobile.matches || current.list.contains(e.target)) return;
    const r = current.trigger.getBoundingClientRect();
    if (!current.trigger.isConnected || r.bottom < 0 || r.top > innerHeight) return closeMenus();
    current.list.style.maxHeight = '';
    place(current.list, current.trigger);
  },
  true,
);
