// MORIARTY — Tracker: metas, calendario de escritura, fechas clave, racha y proyección.
import {wordCount} from './model.js';

const state = {y: null, m: null};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const addDays = (s, n) => {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
const fmtDate = (s, opts = {day: 'numeric', month: 'short'}) => new Date(s + 'T12:00:00').toLocaleDateString('es-MX', opts);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function stats(p, now = today()) {
  const words = (d) => (p.log[d] ? Math.max(0, p.log[d].end - p.log[d].start) : 0);
  const todayWords = words(now);
  // Racha: días seguidos con palabras, contando hoy si ya escribiste o terminando ayer.
  let streak = 0,
    d = todayWords > 0 ? now : addDays(now, -1);
  while (words(d) > 0) streak++, (d = addDays(d, -1));
  const total = wordCount(p);
  const days = Object.keys(p.log).filter((k) => words(k) > 0).sort();
  const recent = days.filter((k) => k >= addDays(now, -13));
  const pace = recent.length ? Math.round(recent.reduce((n, k) => n + words(k), 0) / 14) : 0;
  const remaining = Math.max(0, p.goals.total - total);
  const daysToGoal = pace ? Math.ceil(remaining / pace) : null;
  const projected = daysToGoal !== null ? addDays(now, daysToGoal) : null;
  const deadlineDays = p.goals.deadline ? Math.round((new Date(p.goals.deadline + 'T12:00:00') - new Date(now + 'T12:00:00')) / 86400000) : null;
  const needed = p.goals.deadline && deadlineDays > 0 ? Math.ceil(remaining / deadlineDays) : null;
  const best = days.reduce((m, k) => Math.max(m, words(k)), 0);
  return {todayWords, streak, total, pace, remaining, projected, deadlineDays, needed, best, activeDays: days.length, words};
}

export function trackerView(ctx) {
  const {p, $, $$, esc, btn, bind, save, notify, choose, icon, milestone, STATUSES, STATUS_LABEL, chapterWords} = ctx;
  const now = today();
  if (state.y === null) {
    const d = new Date();
    state.y = d.getFullYear();
    state.m = d.getMonth();
  }
  const st = stats(p, now);
  const g = p.goals;
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const ring = (value, max, label, sub, cls = '') => {
    const r = 34,
      c = 2 * Math.PI * r,
      k = max ? Math.min(1, value / max) : 0;
    return `<div class="stat ${cls}"><svg viewBox="0 0 84 84" class="ring"><circle cx="42" cy="42" r="${r}" class="ring-bg"/><circle cx="42" cy="42" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - k)}"/><text x="42" y="46" text-anchor="middle" class="ring-val">${value.toLocaleString('es-MX')}</text></svg><div><b>${label}</b><small>${sub}</small></div></div>`;
  };
  // Calendario del mes
  const first = new Date(state.y, state.m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(state.y, state.m + 1, 0).getDate();
  const maxWords = Math.max(1, ...Array.from({length: daysInMonth}, (_, i) => st.words(iso(new Date(state.y, state.m, i + 1)))));
  const ms = (d) => p.milestones.filter((m) => m.date === d);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let day = 1; day <= daysInMonth; day++) {
    const d = iso(new Date(state.y, state.m, day));
    const w = st.words(d);
    const heat = w ? Math.max(0.18, w / maxWords) : 0;
    const marks = ms(d);
    const isDeadline = g.deadline === d;
    cells.push(
      `<button class="cal-cell ${d === now ? 'today' : ''} ${d > now ? 'future' : ''} ${isDeadline ? 'deadline' : ''}" data-day="${d}" style="--heat:${heat}" title="${fmtDate(d, {weekday: 'long', day: 'numeric', month: 'long'})}${w ? ` · ${w.toLocaleString('es-MX')} palabras` : ''}${marks.length ? ` · ${marks.map((m) => m.title).join(', ')}` : ''}${isDeadline ? ' · Fecha límite' : ''}"><span class="cal-n">${day}</span>${w ? `<span class="cal-w">${w >= 1000 ? (w / 1000).toFixed(1) + 'k' : w}</span>` : ''}${marks.length ? `<span class="cal-marks">${marks.map((m) => `<i class="${m.done ? 'done' : ''}"></i>`).join('')}</span>` : ''}${isDeadline ? `<span class="cal-flag">${icon('flag')}</span>` : ''}</button>`,
    );
  }
  // Barras de los últimos 14 días
  const last14 = Array.from({length: 14}, (_, i) => addDays(now, i - 13));
  const max14 = Math.max(g.daily || 1, ...last14.map(st.words));
  const bars = `<svg viewBox="0 0 280 90" class="bars" role="img" aria-label="Palabras por día, últimos 14 días">${g.daily ? `<line x1="0" x2="280" y1="${80 - (g.daily / max14) * 70}" y2="${80 - (g.daily / max14) * 70}" class="bar-goal"/>` : ''}${last14.map((d, i) => `<rect x="${i * 20 + 3}" y="${80 - (st.words(d) / max14) * 70}" width="14" height="${(st.words(d) / max14) * 70}" rx="2" class="bar ${st.words(d) >= g.daily && g.daily ? 'hit' : ''}"><title>${fmtDate(d)}: ${st.words(d)} palabras</title></rect>`).join('')}<text x="3" y="89" class="bar-lbl">${fmtDate(last14[0])}</text><text x="277" y="89" text-anchor="end" class="bar-lbl">hoy</text></svg>`;
  const live = p.chapters.filter((c) => !c.trashed);
  const upcoming = [...p.milestones].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  ctx.main().innerHTML = `<div class="toolbar"><div><div class="eyebrow">TRACKER</div><h1>Lo que llevas. Lo que falta.</h1></div><span class="spacer"></span>${btn('addMilestone', '＋ Fecha clave', 'primary')}</div>
  <div class="stats-row">
    ${ring(st.todayWords, g.daily, 'Hoy', g.daily ? `meta ${g.daily.toLocaleString('es-MX')} · ${pct(st.todayWords, g.daily)}%` : 'sin meta diaria', st.todayWords >= g.daily && g.daily ? 'hit' : '')}
    <div class="stat"><div class="big">${st.streak}<small>${st.streak === 1 ? 'día' : 'días'}</small></div><div><b>Racha</b><small>${st.streak ? 'seguidos escribiendo' : st.todayWords ? '' : 'escribe hoy para empezar'}${st.best ? ` · mejor día ${st.best.toLocaleString('es-MX')}` : ''}</small></div></div>
    <div class="stat wide"><div><b>Libro</b><small>${st.total.toLocaleString('es-MX')} de ${g.total.toLocaleString('es-MX')} palabras · ${pct(st.total, g.total)}%</small></div><div class="book-progress"><span class="status-listo" style="flex:${Math.min(st.total, g.total)}"></span><span style="flex:${Math.max(g.total - st.total, 0)};background:transparent"></span></div><small class="muted">${st.pace ? `Ritmo: ${st.pace.toLocaleString('es-MX')} palabras/día (últimas 2 semanas). A este paso terminas el <b>${fmtDate(st.projected, {day: 'numeric', month: 'long', year: 'numeric'})}</b>.` : 'Escribe unos días y te digo a qué ritmo vas.'}</small></div>
    <div class="stat"><div class="big">${st.deadlineDays === null ? '—' : st.deadlineDays}<small>${st.deadlineDays === null ? '' : st.deadlineDays === 1 ? 'día' : 'días'}</small></div><div><b>Fecha límite</b><small>${g.deadline ? `${fmtDate(g.deadline, {day: 'numeric', month: 'long'})}${st.needed ? ` · necesitas ${st.needed.toLocaleString('es-MX')}/día` : st.deadlineDays < 0 ? ' · ya pasó' : ''}` : 'sin fecha · ponla abajo'}</small></div></div>
  </div>
  <div class="tracker-grid">
    <section class="panel">
      <div class="toolbar" style="margin-bottom:8px"><button id="calPrev" aria-label="Mes anterior">${icon('back')}</button><h2 style="margin:0;flex:1;text-align:center">${MESES[state.m]} ${state.y}</h2><button id="calNext" aria-label="Mes siguiente">${icon('arrow')}</button></div>
      <div class="cal-head">${DIAS.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal">${cells.join('')}</div>
      <p class="muted" style="margin:8px 0 0">El color muestra cuánto escribiste cada día. Toca un día para ponerle una fecha clave.</p>
    </section>
    <section class="panel">
      <h2>Metas</h2>
      <div class="fields">
        <label>Palabras al día<input class="field" type="number" min="0" step="50" data-goal="daily" value="${g.daily}"></label>
        <label>Palabras del libro<input class="field" type="number" min="0" step="1000" data-goal="total" value="${g.total}"></label>
        <label>Por capítulo<input class="field" type="number" min="0" step="250" data-goal="chapter" value="${g.chapter}"></label>
        <label>Fecha límite<input class="field" type="date" data-goal="deadline" value="${g.deadline}"></label>
      </div>
      <h2 style="margin-top:16px">Últimos 14 días</h2>${bars}
    </section>
    <section class="panel">
      <h2>Fechas clave</h2>
      ${upcoming.length ? `<ul class="milestones">${upcoming.map((m) => `<li class="${m.done ? 'done' : ''} ${m.date && m.date < now && !m.done ? 'late' : ''}"><label class="check"><input type="checkbox" data-done="${m.id}" ${m.done ? 'checked' : ''}><span class="ms-date">${m.date ? fmtDate(m.date) : 'sin fecha'}</span><span class="ms-title">${esc(m.title)}</span></label><button class="ghost" data-edit-ms="${m.id}" aria-label="Editar">${icon('edit')}</button></li>`).join('')}</ul>` : `<p class="muted">Entregas, lecturas beta, concursos, el día que quieres cerrar el acto 1… Lo que marque tu calendario.</p>`}
    </section>
    <section class="panel">
      <h2>Capítulos</h2>
      <ul class="chapter-progress">${live.map((c, i) => {
        const w = chapterWords(c);
        return `<li><button class="ghost" data-open-ch="${c.id}"><span class="dot status-${c.status}" style="width:8px;height:8px;border-radius:50%;background:currentColor;flex:0 0 auto"></span><span class="ch-title">${ctx.ownNumber(c.title) ? esc(c.title) : `${i + 1}. ${esc(c.title)}`}</span><span class="muted">${w.toLocaleString('es-MX')}${g.chapter ? ` / ${g.chapter.toLocaleString('es-MX')}` : ''}</span></button><div class="book-progress"><span class="status-${c.status}" style="flex:${Math.min(w, g.chapter || w || 1)}"></span><span style="flex:${Math.max((g.chapter || 0) - w, 0)};background:transparent"></span></div></li>`;
      }).join('')}</ul>
      <p class="muted">${STATUSES.map((s) => `<span class="status-${s}">●</span> ${STATUS_LABEL[s]}`).join(' · ')}</p>
    </section>
  </div>`;

  const milestoneDialog = async (m, date = '') => {
    const editing = !!m;
    const r = await choose(
      editing ? 'Fecha clave' : 'Nueva fecha clave',
      `<label>Qué<input class="field" name="title" value="${esc(m?.title || '')}" placeholder="Cerrar el acto 1, entregar a lectores beta…" maxlength="200"></label><label>Cuándo<input class="field" type="date" name="date" id="msDate" value="${esc(m?.date || date)}"></label>${editing ? `<label class="check" style="margin-top:8px"><input type="checkbox" id="msDelete"> Eliminar esta fecha clave</label>` : ''}`,
      [{value: 'ok', label: editing ? 'Guardar' : 'Agregar', primary: true}],
    );
    if (!r) return;
    const title = choose.lastText.trim();
    const d = choose.lastDate || '';
    if (choose.lastChecked) {
      p.milestones = p.milestones.filter((x) => x.id !== m.id);
      notify('Fecha clave eliminada.');
    } else if (!title) return notify('Escribe qué pasa ese día.');
    else if (editing) (m.title = title), (m.date = d);
    else p.milestones.push(milestone(d, title));
    save();
    trackerView(ctx);
  };
  bind('addMilestone', () => milestoneDialog(null, now));
  bind('calPrev', () => ((state.m === 0 ? ((state.m = 11), state.y--) : state.m--), trackerView(ctx)));
  bind('calNext', () => ((state.m === 11 ? ((state.m = 0), state.y++) : state.m++), trackerView(ctx)));
  $$('[data-day]').forEach((b) => (b.onclick = () => {
    const existing = ms(b.dataset.day);
    if (existing.length === 1) milestoneDialog(existing[0]);
    else milestoneDialog(null, b.dataset.day);
  }));
  $$('[data-goal]').forEach((inp) => (inp.onchange = () => {
    const k = inp.dataset.goal;
    if (k === 'deadline') g.deadline = inp.value || '';
    else g[k] = Math.max(0, Math.min(10000000, parseInt(inp.value, 10) || 0));
    save();
    trackerView(ctx);
  }));
  $$('[data-done]').forEach((cb) => (cb.onchange = () => {
    const m = p.milestones.find((x) => x.id === cb.dataset.done);
    m.done = cb.checked;
    save();
    trackerView(ctx);
  }));
  $$('[data-edit-ms]').forEach((b) => (b.onclick = () => milestoneDialog(p.milestones.find((x) => x.id === b.dataset.editMs))));
  $$('[data-open-ch]').forEach((b) => (b.onclick = () => ctx.openChapter(p.chapters.find((c) => c.id === b.dataset.openCh))));
}
