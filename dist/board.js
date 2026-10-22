// MORIARTY — Pizarrón: mapa visual de capítulos, personajes, lugares, objetos y notas, con sus relaciones.
// SVG plano, sin librerías. Zoom con rueda o pellizco, paneo arrastrando el fondo, nodos arrastrables.

const CW = 176,
  CH = 78,
  R = 30;
const state = {k: 1, tx: 0, ty: 0, sel: null, hidden: new Set(), q: '', fitted: null, drag: null, pointers: new Map()};
const typeKey = (t) => (t ? t.toLowerCase() : 'capitulo');
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Posición de cada nodo (las fichas sin posición reciben una automática, sin guardarse).
function typeLayout(p, startY, only = null) {
  // Devuelve posiciones para fichas: bloques por tipo, 8 por fila, con espacio para las etiquetas.
  const out = new Map();
  let y = startY;
  for (const type of ['Personaje', 'Lugar', 'Objeto', 'Nota']) {
    const list = p.entities.filter((e) => !e.trashed && e.type === type && (!only || only(e)));
    if (!list.length) continue;
    list.forEach((e, i) => out.set(e.id, {x: 70 + (i % 8) * 150, y: y + Math.floor(i / 8) * 115}));
    y += Math.ceil(list.length / 8) * 115 + 70;
  }
  return out;
}
function positions(p) {
  const pos = new Map();
  const chapters = p.chapters.filter((c) => !c.trashed);
  chapters.forEach((c) => pos.set(c.id, {x: c.x, y: c.y}));
  const maxY = chapters.reduce((m, c) => Math.max(m, c.y + CH), 0);
  const auto = typeLayout(p, maxY + 130, (e) => e.x === null);
  for (const e of p.entities.filter((e) => !e.trashed)) pos.set(e.id, e.x !== null ? {x: e.x, y: e.y} : auto.get(e.id));
  return pos;
}
export function autoLayout(p, {all = false} = {}) {
  const chapters = p.chapters.filter((c) => !c.trashed);
  if (all) chapters.forEach((c, i) => ((c.x = 40 + (i % 6) * (CW + 30)), (c.y = 40 + Math.floor(i / 6) * (CH + 40))));
  const maxY = chapters.reduce((m, c) => Math.max(m, c.y + CH), 0);
  const auto = typeLayout(p, maxY + 130, all ? null : (e) => e.x === null);
  for (const [id, pt] of auto) {
    const e = p.entities.find((x) => x.id === id);
    e.x = pt.x;
    e.y = pt.y;
  }
}

export function mapView(ctx) {
  const {p, $, $$, esc, btn, bind, save, notify, choose, icon, main, ENTITY_TYPES, STATUS_LABEL, ownNumber} = ctx;
  const host = main();
  const chapters = p.chapters.filter((c) => !c.trashed);
  const entities = p.entities.filter((e) => !e.trashed);
  const byId = new Map([...chapters.map((c) => [c.id, c]), ...entities.map((e) => [e.id, e])]);
  const visible = (id) => {
    const n = byId.get(id);
    if (!n) return false;
    return !state.hidden.has(n.type ? n.type : 'Capítulo');
  };
  const q = state.q.trim().toLocaleLowerCase();
  const matches = (n) => !q || `${n.title || n.name} ${n.summary || n.notes || ''} ${(n.tags || []).join(' ')}`.toLocaleLowerCase().includes(q);
  const scheme = document.documentElement.dataset.scheme === 'dark' ? 'oscuro' : 'claro';
  const types = ['Capítulo', ...ENTITY_TYPES];

  host.innerHTML = `<div class="map-tools"><div class="chips">${types.map((t) => `<button class="chip ${t === 'Capítulo' ? 'type-capitulo' : 'type-' + t} ${state.hidden.has(t) ? 'off' : ''}" data-type="${t}"><span class="dot"></span>${t}${t === 'Capítulo' ? 's' : 's'} <small>${t === 'Capítulo' ? chapters.length : entities.filter((e) => e.type === t).length}</small></button>`).join('')}</div><label class="library-search map-search">${icon('search')}<input id="mapQ" type="search" placeholder="Resaltar en el mapa…" value="${esc(state.q)}" aria-label="Buscar en el mapa"></label><span class="spacer"></span><span class="type-size" role="group" aria-label="Zoom">${btn('zoomOut', '', '', 'Alejar')}${btn('zoomIn', '', '', 'Acercar')}${btn('zoomFit', '', '', 'Ver todo')}</span>${btn('layout', 'Ordenar')}${btn('newEntityMap', '＋ Ficha', 'primary')}</div>
  <div class="map-stage"><svg id="mapSvg" class="map" role="application" aria-label="Pizarrón"><defs>${entities.map((e) => `<clipPath id="clip-${e.id}"><circle r="${R - 3}"/></clipPath>`).join('')}</defs><g id="world"><g id="edges"></g><g id="nodes"></g></g></svg><aside id="mapPanel" class="map-panel" hidden></aside><svg id="minimap" class="minimap" aria-hidden="true"></svg>${!chapters.length && !entities.length ? `<div class="map-empty">${ctx.art('vacio-pizarron')}<p class="muted">Crea capítulos y fichas, o carga un libro. Aquí los verás conectados.</p></div>` : ''}</div>
  <div class="timeline-strip" id="mapTimeline"></div>`;

  const svg = $('#mapSvg'),
    world = $('#world'),
    edgesG = $('#edges'),
    nodesG = $('#nodes');
  const pos = positions(p);
  const nodeOf = (id) => byId.get(id);
  const center = (id) => {
    const n = nodeOf(id),
      pt = pos.get(id);
    return n.type ? {x: pt.x, y: pt.y} : {x: pt.x + CW / 2, y: pt.y + CH / 2};
  };
  const chapterIndex = new Map(chapters.map((c, i) => [c.id, i]));
  const imgFor = (e) => e.image || `img/ficha-${typeKey(e.type)}-${scheme}.webp`;

  const nodeHtml = (n) => {
    const pt = pos.get(n.id);
    const dim = !matches(n) ? 'dim' : '';
    const sel = state.sel === n.id ? 'selected' : '';
    if (!n.type) {
      const i = chapterIndex.get(n.id);
      const num = ownNumber(n.title) ? '' : String(i + 1).padStart(2, '0') + ' · ';
      return `<g class="node chapter ${dim} ${sel}" data-id="${n.id}" transform="translate(${pt.x},${pt.y})"><rect class="card" width="${CW}" height="${CH}" rx="12"/><rect class="band" width="6" height="${CH}" rx="3" style="fill:${n.color || 'var(--teal)'}"/><circle class="status status-${n.status}" cx="${CW - 14}" cy="14" r="5"/><text class="n-title" x="16" y="30">${esc(trunc(num + n.title, 24))}</text><text class="n-sub" x="16" y="52">${esc(trunc(n.summary || n.pov || STATUS_LABEL[n.status], 30))}</text><text class="n-sub" x="16" y="68">${n.entityIds.length} fichas · ${n.scenes.length} ${n.scenes.length === 1 ? 'escena' : 'escenas'}</text></g>`;
    }
    const img = n.image
      ? `<image href="${n.image}" x="${-(R - 3)}" y="${-(R - 3)}" width="${2 * (R - 3)}" height="${2 * (R - 3)}" clip-path="url(#clip-${n.id})" preserveAspectRatio="xMidYMid slice"/>`
      : `<image href="${imgFor(n)}" x="${-(R - 3)}" y="${-(R - 3)}" width="${2 * (R - 3)}" height="${2 * (R - 3)}" clip-path="url(#clip-${n.id})" preserveAspectRatio="xMidYMid slice"/>`;
    return `<g class="node entity type-${n.type} ${dim} ${sel}" data-id="${n.id}" transform="translate(${pt.x},${pt.y})"><circle class="ring" r="${R}" style="${n.color ? 'stroke:' + n.color : ''}"/>${img}<text class="n-label" y="${R + 16}" text-anchor="middle">${esc(trunc(n.name, 22))}</text></g>`;
  };
  const edgesHtml = () => {
    const out = [];
    for (const c of chapters)
      if (visible(c.id))
        for (const id of c.entityIds)
          if (visible(id) && pos.has(id)) {
            const a = center(c.id),
              b = center(id);
            out.push(`<line class="edge link" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
          }
    for (const e of entities)
      if (visible(e.id))
        for (const r of e.relations)
          if (visible(r.targetId) && pos.has(r.targetId)) {
            const a = center(e.id),
              b = center(r.targetId);
            const mx = (a.x + b.x) / 2,
              my = (a.y + b.y) / 2;
            out.push(`<line class="edge rel" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${r.label && state.k > 0.6 ? `<g class="edge-label" transform="translate(${mx},${my})"><rect x="${-r.label.length * 3.2 - 5}" y="-9" width="${r.label.length * 6.4 + 10}" height="18" rx="9"/><text y="4" text-anchor="middle">${esc(r.label)}</text></g>` : ''}`);
          }
    return out.join('');
  };
  const drawNodes = () => {
    nodesG.innerHTML = [...chapters, ...entities].filter((n) => visible(n.id)).map(nodeHtml).join('');
    bindNodes();
  };
  const drawEdges = () => (edgesG.innerHTML = edgesHtml());
  const applyTransform = () => {
    world.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.k})`);
    drawMinimap();
  };
  const bbox = () => {
    const pts = [...chapters, ...entities].filter((n) => visible(n.id)).map((n) => ({...pos.get(n.id), c: !!n.type}));
    if (!pts.length) return {x: 0, y: 0, w: 600, h: 400};
    const xs = pts.map((p) => (p.c ? p.x - R : p.x)),
      ys = pts.map((p) => (p.c ? p.y - R : p.y)),
      xe = pts.map((p) => (p.c ? p.x + R : p.x + CW)),
      ye = pts.map((p) => (p.c ? p.y + R + 20 : p.y + CH));
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return {x, y, w: Math.max(...xe) - x, h: Math.max(...ye) - y};
  };
  const fit = () => {
    const b = bbox(),
      W = svg.clientWidth,
      H = svg.clientHeight;
    state.k = Math.min(1.2, Math.max(0.15, Math.min(W / (b.w + 80), H / (b.h + 80))));
    state.tx = (W - b.w * state.k) / 2 - b.x * state.k;
    state.ty = (H - b.h * state.k) / 2 - b.y * state.k;
    applyTransform();
  };
  const zoomAt = (factor, cx, cy) => {
    const k = Math.min(3, Math.max(0.15, state.k * factor));
    state.tx = cx - ((cx - state.tx) * k) / state.k;
    state.ty = cy - ((cy - state.ty) * k) / state.k;
    state.k = k;
    applyTransform();
    drawEdges();
  };
  const drawMinimap = () => {
    const mm = $('#minimap');
    if (!mm) return;
    const b = bbox();
    const MW = 160,
      MH = 100;
    const s = Math.min(MW / (b.w + 40), MH / (b.h + 40));
    const ox = (MW - b.w * s) / 2 - b.x * s,
      oy = (MH - b.h * s) / 2 - b.y * s;
    const W = svg.clientWidth,
      H = svg.clientHeight;
    const vx = -state.tx / state.k,
      vy = -state.ty / state.k,
      vw = W / state.k,
      vh = H / state.k;
    mm.innerHTML = `<rect class="mm-bg" width="${MW}" height="${MH}" rx="8"/>${[...chapters, ...entities]
      .filter((n) => visible(n.id))
      .map((n) => {
        const pt = pos.get(n.id);
        return n.type ? `<circle class="mm-e type-${n.type}" cx="${ox + pt.x * s}" cy="${oy + pt.y * s}" r="2"/>` : `<rect class="mm-c" x="${ox + pt.x * s}" y="${oy + pt.y * s}" width="${CW * s}" height="${CH * s}" rx="1"/>`;
      })
      .join('')}<rect class="mm-view" x="${ox + vx * s}" y="${oy + vy * s}" width="${vw * s}" height="${vh * s}"/>`;
    mm.onclick = (e) => {
      const r = mm.getBoundingClientRect();
      const wx = (e.clientX - r.left - ox) / s,
        wy = (e.clientY - r.top - oy) / s;
      state.tx = W / 2 - wx * state.k;
      state.ty = H / 2 - wy * state.k;
      applyTransform();
    };
  };
  const centerOn = (id) => {
    const c = center(id);
    state.tx = svg.clientWidth / 2 - c.x * state.k;
    state.ty = svg.clientHeight / 2 - c.y * state.k;
    applyTransform();
  };

  // ---- panel lateral
  const panel = $('#mapPanel');
  const showPanel = () => {
    const n = nodeOf(state.sel);
    if (!n) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }
    panel.hidden = false;
    if (n.type) {
      panel.innerHTML = `<div class="panel-head"><span class="eyebrow type-${n.type}">${esc(n.type)}</span><span class="spacer"></span><button id="panelClose" class="ghost" aria-label="Cerrar">${icon('close')}</button></div>${ctx.entityCard(n)}<div class="toolbar" style="margin-top:10px"><span class="muted">Aparece en: ${chapters.filter((c) => c.entityIds.includes(n.id)).map((c) => `<button class="chip" data-focus="${c.id}">${esc(trunc(c.title, 18))}</button>`).join(' ') || '—'}</span></div>`;
      ctx.bindEntityCards(ctx.entityTargets(), () => mapView(ctx), panel);
    } else {
      const i = chapterIndex.get(n.id);
      panel.innerHTML = `<div class="panel-head"><span class="eyebrow">CAPÍTULO ${i + 1}</span><span class="spacer"></span><button id="panelClose" class="ghost" aria-label="Cerrar">${icon('close')}</button></div><section class="panel entry"><input class="name" data-ch-title value="${esc(n.title)}" aria-label="Título"><div class="fields"><label>Estado<select class="field" data-ch-status>${ctx.STATUSES.map((st) => `<option value="${st}" ${st === n.status ? 'selected' : ''}>${STATUS_LABEL[st]}</option>`).join('')}</select></label><label>Punto de vista<input class="field" data-ch-pov value="${esc(n.pov)}"></label></div><label>Resumen<textarea class="field" data-ch-summary rows="4">${esc(n.summary)}</textarea></label><label>Fichas</label><div class="chips">${n.entityIds.map((id) => byId.get(id)).filter(Boolean).map((e) => `<button class="chip type-${e.type}" data-focus="${e.id}"><span class="dot"></span>${esc(trunc(e.name, 20))}</button>`).join('')}<select class="field" data-ch-link style="width:auto;padding:4px 8px;font-size:12px"><option value="">＋ Vincular…</option>${entities.filter((e) => !n.entityIds.includes(e.id)).map((e) => `<option value="${e.id}">${esc(e.type)} · ${esc(e.name)}</option>`).join('')}</select></div><div class="foot"><div class="color-swatches">${['', '#286465', '#4a6b8a', '#ba8b56', '#8a6b8d', '#a3473f', '#2f6b4a', '#182b38'].map((col) => `<button class="swatch ${n.color === col ? 'selected' : ''}" data-ch-color="${col}" style="background:${col || 'var(--line)'}" aria-label="${col || 'Sin color'}"></button>`).join('')}</div><span class="spacer"></span>${btn('openChapter', 'Escribir', 'primary')}</div></section>`;
      const on = (sel, fn, ev = 'oninput') => {
        const el = panel.querySelector(sel);
        if (el) el[ev] = (e) => (fn(e.target.value), save(), redraw());
      };
      on('[data-ch-title]', (v) => (n.title = v));
      on('[data-ch-pov]', (v) => (n.pov = v));
      on('[data-ch-summary]', (v) => (n.summary = v));
      on('[data-ch-status]', (v) => (n.status = v), 'onchange');
      panel.querySelector('[data-ch-link]').onchange = (e) => {
        if (!e.target.value) return;
        n.entityIds.push(e.target.value);
        save();
        mapView(ctx);
      };
      $$('[data-ch-color]', panel).forEach((b) => (b.onclick = () => ((n.color = b.dataset.chColor), save(), mapView(ctx))));
      bind('openChapter', () => ctx.openChapter(n));
    }
    $$('[data-focus]', panel).forEach((b) => (b.onclick = () => ((state.sel = b.dataset.focus), centerOn(state.sel), redraw(), showPanel())));
    $('#panelClose').onclick = () => ((state.sel = null), redraw(), showPanel());
  };
  const redraw = () => {
    drawEdges();
    drawNodes();
    drawMinimap();
    drawTimeline();
  };

  // ---- interacción
  function bindNodes() {
    $$('.node', nodesG).forEach((g) => {
      g.ondblclick = (e) => {
        e.preventDefault();
        const n = nodeOf(g.dataset.id);
        if (!n.type) ctx.openChapter(n);
      };
    });
  }
  const toWorld = (e) => {
    const r = svg.getBoundingClientRect();
    return {x: (e.clientX - r.left - state.tx) / state.k, y: (e.clientY - r.top - state.ty) / state.k};
  };
  svg.onpointerdown = (e) => {
    svg.setPointerCapture(e.pointerId);
    state.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (state.pointers.size === 2) {
      state.drag = null;
      const [a, b] = [...state.pointers.values()];
      state.pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), k: state.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: state.tx, ty: state.ty};
      return;
    }
    const g = e.target.closest('.node');
    const w = toWorld(e);
    if (g) {
      const n = nodeOf(g.dataset.id);
      const pt = pos.get(n.id);
      state.drag = {type: 'node', id: n.id, dx: w.x - pt.x, dy: w.y - pt.y, sx: e.clientX, sy: e.clientY, moved: false, el: g};
    } else state.drag = {type: 'pan', sx: e.clientX, sy: e.clientY, tx: state.tx, ty: state.ty, moved: false};
  };
  svg.onpointermove = (e) => {
    if (state.pointers.has(e.pointerId)) state.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (state.pinch && state.pointers.size === 2) {
      const [a, b] = [...state.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svg.getBoundingClientRect();
      const k = Math.min(3, Math.max(0.15, (state.pinch.k * d) / state.pinch.d));
      const mx = (a.x + b.x) / 2 - r.left,
        my = (a.y + b.y) / 2 - r.top;
      state.tx = mx - ((state.pinch.mx - r.left - state.pinch.tx) * k) / state.pinch.k;
      state.ty = my - ((state.pinch.my - r.top - state.pinch.ty) * k) / state.pinch.k;
      state.k = k;
      applyTransform();
      return;
    }
    const d = state.drag;
    if (!d) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (!d.moved) return;
    if (d.type === 'pan') {
      state.tx = d.tx + (e.clientX - d.sx);
      state.ty = d.ty + (e.clientY - d.sy);
      applyTransform();
    } else {
      const w = toWorld(e);
      const pt = pos.get(d.id);
      pt.x = Math.round(w.x - d.dx);
      pt.y = Math.round(w.y - d.dy);
      d.el.setAttribute('transform', `translate(${pt.x},${pt.y})`);
      drawEdges();
    }
  };
  svg.onpointerup = svg.onpointercancel = (e) => {
    state.pointers.delete(e.pointerId);
    if (state.pointers.size < 2) {
      if (state.pinch) drawEdges();
      state.pinch = null;
    }
    const d = state.drag;
    state.drag = null;
    if (!d) return;
    if (d.type === 'node') {
      const n = nodeOf(d.id),
        pt = pos.get(d.id);
      if (d.moved) {
        n.x = pt.x;
        n.y = pt.y;
        save();
        drawMinimap();
      } else {
        state.sel = state.sel === d.id ? null : d.id;
        redraw();
        showPanel();
      }
    } else if (!d.moved && state.sel) {
      state.sel = null;
      redraw();
      showPanel();
    }
  };
  svg.onwheel = (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  };

  // ---- cronología
  function drawTimeline() {
    const strip = $('#mapTimeline');
    const evs = p.events.filter((e) => !e.trashed).sort((a, b) => a.order - b.order);
    strip.innerHTML = evs.length
      ? `<div class="tl-track">${evs.map((ev) => `<button class="tl-ev ${ev.chapterId && ev.chapterId === state.sel ? 'selected' : ''}" data-ev="${ev.chapterId || ''}" title="${esc(ev.when)}"><b>${esc(trunc(ev.title, 40))}</b><small>${esc(ev.when || ' ')}</small></button>`).join('<span class="tl-line"></span>')}</div>`
      : `<p class="muted" style="margin:6px 0">Sin acontecimientos. Agrégalos en la pestaña Cronología y aquí verás la línea de tiempo.</p>`;
    $$('[data-ev]', strip).forEach((b) => (b.onclick = () => {
      if (!b.dataset.ev || !visible(b.dataset.ev)) return;
      state.sel = b.dataset.ev;
      centerOn(state.sel);
      redraw();
      showPanel();
    }));
  }

  // ---- barra
  $$('[data-type]').forEach((b) => (b.onclick = () => {
    const t = b.dataset.type;
    state.hidden.has(t) ? state.hidden.delete(t) : state.hidden.add(t);
    mapView(ctx);
  }));
  let qt;
  $('#mapQ').oninput = (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => ((state.q = e.target.value), drawNodes()), 150);
  };
  bind('zoomIn', () => zoomAt(1.25, svg.clientWidth / 2, svg.clientHeight / 2));
  bind('zoomOut', () => zoomAt(1 / 1.25, svg.clientWidth / 2, svg.clientHeight / 2));
  bind('zoomFit', fit);
  bind('layout', async () => {
    const r = await choose('Ordenar el pizarrón', `<p>Capítulos en filas por orden del libro; fichas agrupadas por tipo debajo.</p><label class="check"><input type="checkbox" id="layoutAll"> Reacomodar también lo que ya moví a mano</label>`, [{value: 'go', label: 'Ordenar', primary: true}]);
    if (!r) return;
    autoLayout(p, {all: choose.lastChecked});
    save();
    state.fitted = null;
    mapView(ctx);
  });
  bind('newEntityMap', () => ctx.go('map', 'fichas'));

  redraw();
  if (state.fitted !== p.id) {
    state.fitted = p.id;
    requestAnimationFrame(fit);
  } else applyTransform();
  showPanel();
}
