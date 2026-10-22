import {addBook, addSaga, moveBook} from './library.js';
import {icon, art, COVERS} from './icons.js';
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c],
  );
const words = (p) =>
  p.chapters
    .filter((c) => !c.trashed)
    .flatMap((c) => c.scenes)
    .map((s) => s.text)
    .join(' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export class LibraryView {
  constructor(getLibrary, callbacks) {
    this.getLibrary = getLibrary;
    this.callbacks = callbacks;
    this.scope = 'all';
    this.query = '';
  }
  render() {
    const lib = this.getLibrary();
    if (!['all', 'independent'].includes(this.scope) && !lib.sagas.some((s) => s.id === this.scope))
      this.scope = 'all';
    const sidebar = document.querySelector('#sidebar');
    const scopeButton = (id, name, type, count) =>
      `<button data-scope="${esc(id)}" class="library-filter ${this.scope === id ? 'selected' : ''}">${icon(type)}<span>${esc(name)}</span><small>${count}</small></button>`;
    sidebar.innerHTML = `<div class="eyebrow">TU ESTANTERÍA</div>${scopeButton('all', 'Todos los libros', 'library', lib.books.length)}${scopeButton('independent', 'Independientes', 'book', lib.books.filter((b) => !b.sagaId).length)}<div class="saga-heading"><h3>Sagas</h3><button id="sidebarNewSaga" aria-label="Crear saga" title="Crear saga">${icon('plus')}</button></div><div class="saga-filters">${lib.sagas.map((s) => scopeButton(s.id, s.title, 'saga', lib.books.filter((b) => b.sagaId === s.id).length)).join('') || '<p class="muted library-hint">Agrupa aquí los libros que comparten una historia.</p>'}</div><div class="library-storage"><span class="eyebrow">TU ESPACIO PERSONAL</span><p>Guardado en este dispositivo. Respalda tu biblioteca para llevarla contigo.</p></div>`;
    sidebar.querySelectorAll('[data-scope]').forEach(
      (btn) =>
        (btn.onclick = () => {
          this.scope = btn.dataset.scope;
          this.query = '';
          this.render();
        }),
    );
    sidebar.querySelector('#sidebarNewSaga').onclick = () => this.sagaDialog();
    const saga = lib.sagas.find((s) => s.id === this.scope);
    const heading =
      saga?.title ||
      (this.scope === 'independent' ? 'Historias con su propio mundo.' : 'Cada historia tiene su lugar.');
    const description =
      saga?.description ||
      (this.scope === 'independent'
        ? 'Tus libros independientes, listos para seguir creciendo.'
        : 'Abre un libro, empieza otro o reúne tus historias en una saga.');
    document.querySelector('#main').innerHTML =
      `<section class="library-page"><div class="library-heading"><div><div class="eyebrow">${saga ? 'COLECCIÓN · SAGA' : 'MORIARTY · BIBLIOTECA'}</div><h1>${esc(heading)}</h1><p class="muted">${esc(description)}</p></div><div class="library-actions">${saga ? `<button id="editSaga">${icon('edit')}Editar saga</button>` : `<button id="newSaga">${icon('saga')}Nueva saga</button>`}<button id="newBook" class="primary">${icon('plus')}Nuevo libro</button></div></div><div class="library-tools"><label class="library-search">${icon('search')}<input id="librarySearch" type="search" placeholder="Buscar un libro…" aria-label="Buscar libros" value="${esc(this.query)}"></label><span id="libraryCount" class="muted"></span><span class="spacer"></span><button id="backupLibrary">${icon('download')}Respaldar biblioteca</button><button id="importLibrary">${icon('upload')}Importar</button></div><div id="bookGrid" class="books-grid"></div><div class="library-note">${icon('book')}<span>Cada libro guarda sus propios capítulos, fichas y revisiones.</span></div></section>`;
    document.querySelector('#newBook').onclick = () => this.bookDialog();
    const ns = document.querySelector('#newSaga');
    if (ns) ns.onclick = () => this.sagaDialog();
    const es = document.querySelector('#editSaga');
    if (es) es.onclick = () => this.sagaDialog(saga);
    document.querySelector('#backupLibrary').onclick = this.callbacks.onBackup;
    document.querySelector('#importLibrary').onclick = this.callbacks.onImport;
    document.querySelector('#librarySearch').oninput = (e) => {
      this.query = e.target.value;
      this.cards();
    };
    this.cards();
  }
  cards() {
    const lib = this.getLibrary();
    const scoped = lib.books.filter(
      (b) => this.scope === 'all' || (this.scope === 'independent' ? !b.sagaId : b.sagaId === this.scope),
    );
    const query = this.query.trim().toLocaleLowerCase();
    const books = scoped.filter((b) =>
      `${b.project.title} ${b.synopsis}`.toLocaleLowerCase().includes(query),
    );
    document.querySelector('#libraryCount').textContent = plural(books.length, 'libro', 'libros');
    const grid = document.querySelector('#bookGrid');
    grid.innerHTML =
      books
        .map((b) => {
          const saga = lib.sagas.find((s) => s.id === b.sagaId),
            siblings = lib.books.filter((x) => x.sagaId === b.sagaId),
            index = siblings.indexOf(b),
            id = esc(b.project.id);
          const color = (saga ? lib.sagas.indexOf(saga) : lib.books.indexOf(b)) % 3;
          const coverUrl = b.project.cover || `img/${COVERS[color]}.webp`;
          return `<article class="book-card" data-book="${id}"><button data-open-book="${id}" aria-label="Abrir ${esc(b.project.title)}" style="background-image:url(${coverUrl})" class="book-cover ${b.project.cover ? 'cover-custom' : 'cover-default'}"><span class="cover-kicker">${saga ? esc(saga.title) : 'LIBRO INDEPENDIENTE'}</span><span></span><span class="cover-title">${esc(b.project.title) || 'Libro sin título'}</span><span class="cover-bottom">${saga ? `VOLUMEN ${String(index + 1).padStart(2, '0')}` : 'MORIARTY'}</span></button><div class="book-info"><div class="book-meta">${saga ? `${icon('saga')}<span>${esc(saga.title)} · ${index + 1}</span>` : `${icon('book')}<span>Independiente</span>`}${lib.activeBookId === b.project.id ? '<span class="current-book">En curso</span>' : ''}</div><p class="book-synopsis ${b.synopsis ? '' : 'muted'}">${esc(b.synopsis) || 'Una historia por descubrir. Añade una sinopsis para darle su lugar.'}</p><div class="book-stats">${plural(b.project.chapters.filter((c) => !c.trashed).length, 'capítulo', 'capítulos')}<span>·</span>${words(b.project).toLocaleString('es-MX')} palabras</div><div class="book-actions"><button class="open-book" data-open-book="${id}">Abrir libro ${icon('arrow')}</button><button data-edit-book="${id}" aria-label="Editar ${esc(b.project.title)}" title="Editar libro">${icon('edit')}</button>${saga ? `<button data-book-move="${id}" data-delta="-1" ${index === 0 ? 'disabled' : ''} aria-label="Adelantar ${esc(b.project.title)} en la saga" title="Adelantar en saga">${icon('up')}</button><button data-book-move="${id}" data-delta="1" ${index === siblings.length - 1 ? 'disabled' : ''} aria-label="Retrasar ${esc(b.project.title)} en la saga" title="Retrasar en saga">${icon('down')}</button>` : ''}</div></div></article>`;
        })
        .join('') ||
      `<div class="library-empty">${art(query ? 'vacio-busqueda' : 'vacio-biblioteca')}<h2>${query ? 'No encontramos ese libro.' : 'Aquí empieza una nueva historia.'}</h2><p class="muted">${query ? 'Prueba con otro título o una palabra de la sinopsis.' : 'Crea el primer libro de esta colección o importa uno que ya tengas.'}</p>${query ? '' : '<button class="primary" id="emptyNewBook">' + icon('plus') + 'Crear un libro</button>'}</div>`;
    grid
      .querySelectorAll('[data-open-book]')
      .forEach((btn) => (btn.onclick = () => this.callbacks.onOpen(btn.dataset.openBook)));
    grid
      .querySelectorAll('[data-edit-book]')
      .forEach(
        (btn) =>
          (btn.onclick = () => this.bookDialog(lib.books.find((b) => b.project.id === btn.dataset.editBook))),
      );
    grid.querySelectorAll('[data-book-move]').forEach(
      (btn) =>
        (btn.onclick = () => {
          moveBook(lib, btn.dataset.bookMove, Number(btn.dataset.delta));
          this.callbacks.onChange();
          this.cards();
          grid.querySelector(`[data-book="${btn.dataset.bookMove}"] [data-edit-book]`)?.focus();
        }),
    );
    const empty = grid.querySelector('#emptyNewBook');
    if (empty) empty.onclick = () => this.bookDialog();
  }
  dialog(title, fields, submitLabel, onSubmit) {
    const old = document.querySelector('#libraryDialog');
    old?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'libraryDialog';
    dialog.className = 'library-dialog';
    dialog.setAttribute('aria-labelledby', 'dialogTitle');
    dialog.innerHTML = `<form><div class="dialog-heading"><h2 id="dialogTitle">${esc(title)}</h2><button type="button" id="closeDialog" aria-label="Cerrar">${icon('close')}</button></div>${fields}<p class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" id="cancelDialog">Cancelar</button><button type="submit" class="primary">${icon('check')}${esc(submitLabel)}</button></div></form>`;
    document.body.append(dialog);
    dialog.querySelector('#closeDialog').onclick = () => dialog.close();
    dialog.querySelector('#cancelDialog').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      try {
        onSubmit(new FormData(e.target));
        dialog.close();
      } catch (err) {
        dialog.querySelector('.dialog-error').textContent = err.message;
      }
    };
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }
  bookDialog(book) {
    const lib = this.getLibrary(),
      sagaId = book?.sagaId || (lib.sagas.some((s) => s.id === this.scope) ? this.scope : '');
    this.dialog(
      book ? 'Detalles del libro' : 'Un nuevo libro',
      `<label>Título del libro<input class="field" name="title" id="bookTitle" value="${esc(book?.project.title || '')}" placeholder="¿Cómo se llama tu historia?" maxlength="200" required autofocus></label><label>Sinopsis<textarea class="field" name="synopsis" id="bookSynopsis" rows="4" placeholder="Una idea, una promesa, un mundo por explorar…">${esc(book?.synopsis || '')}</textarea></label><label>Saga<select class="field" name="sagaId" id="bookSaga"><option value="">Libro independiente</option>${lib.sagas.map((s) => `<option value="${esc(s.id)}" ${s.id === sagaId ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label><label>Portada</label><div class="toolbar" style="margin:0"><button type="button" id="coverPick">${icon('image')}<span>${book?.project.cover ? 'Cambiar portada' : 'Subir portada'}</span></button>${book?.project.cover ? `<button type="button" id="coverRemove" class="ghost">Quitar portada</button>` : ''}<span id="coverState" class="muted"></span></div><p class="muted">Podrás cambiar la saga y el orden del libro cuando quieras.</p>`,
      book ? 'Guardar cambios' : 'Crear y escribir',
      (data) => {
        const title = data.get('title').trim();
        if (!title) throw Error('Escribe un título para el libro.');
        if (book) {
          book.project.title = title;
          book.synopsis = data.get('synopsis');
          book.sagaId = data.get('sagaId');
          if (cover !== undefined) book.project.cover = cover;
          this.callbacks.onChange();
          this.render();
        } else {
          const next = addBook(lib, title, data.get('sagaId'), data.get('synopsis'));
          if (cover) next.project.cover = cover;
          this.callbacks.onOpen(next.project.id);
        }
      },
    );
    let cover;
    const pick = document.querySelector('#coverPick'),
      remove = document.querySelector('#coverRemove'),
      state = document.querySelector('#coverState');
    if (pick)
      pick.onclick = async () => {
        const r = await this.callbacks.pickCover?.();
        if (!r) return;
        if (r.error) {
          state.textContent = r.error;
          return;
        }
        cover = r;
        state.textContent = 'Portada lista; se guarda al confirmar.';
      };
    if (remove)
      remove.onclick = () => {
        cover = '';
        state.textContent = 'La portada se quitará al confirmar.';
      };
  }
  sagaDialog(saga) {
    this.dialog(
      saga ? 'Editar saga' : 'Una nueva saga',
      `<label>Nombre de la saga<input class="field" name="title" id="sagaTitle" value="${esc(saga?.title || '')}" maxlength="200" placeholder="El nombre que une tus historias" required autofocus></label><label>Descripción<textarea class="field" name="description" id="sagaDescription" rows="3" placeholder="¿Qué comparten estos libros?">${esc(saga?.description || '')}</textarea></label>`,
      saga ? 'Guardar cambios' : 'Crear saga',
      (data) => {
        const title = data.get('title').trim();
        if (!title) throw Error('Escribe un nombre para la saga.');
        if (saga) {
          saga.title = title;
          saga.description = data.get('description');
        } else saga = addSaga(this.getLibrary(), title, data.get('description'));
        this.scope = saga.id;
        this.query = '';
        this.callbacks.onChange();
        this.render();
      },
    );
  }
}
