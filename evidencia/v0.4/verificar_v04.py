#!/usr/bin/env python3
"""Verificación en navegador de MORIARTY V0.4 (Chromium vía Playwright).
Requiere: python3 -m http.server 8077 --directory dist, en otra terminal.
Uso: python3 evidencia/v0.4/verificar_v03.py [archivo-de-prueba.json]
Las capturas se guardan junto a este script. Las pruebas usan datos de prueba genéricos."""
import json, sys, os, time
from playwright.sync_api import sync_playwright
# La biblioteca vive en IndexedDB desde V0.4.5.
READ_LIB = "() => new Promise((r) => { const q = indexedDB.open('moriarty-datos', 1); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('biblioteca'); g.onsuccess = () => r(g.result ? JSON.parse(g.result) : null); }; })"
def lib(pg, expr='l'):
    return pg.evaluate('(async()=>{const l=await (' + READ_LIB + ')(); return ' + expr + ';})()')


HERE = os.path.dirname(os.path.abspath(__file__))
URL = 'http://localhost:8077/'
def seed_book(pg):
    # Instalación nueva: la biblioteca empieza vacía; se crea un libro como lo haría una persona.
    if pg.locator('#emptyNewBook').count():
        pg.click('#emptyNewBook'); pg.wait_for_timeout(300); pg.fill('#libraryDialog input[name=title]', 'Novela de prueba'); pg.click('#libraryDialog button[type=submit]'); pg.wait_for_timeout(600)
        pg.click('[data-view=library]'); pg.wait_for_timeout(400)
results = []
def check(name, cond):
    results.append({'prueba': name, 'ok': bool(cond)})
    print(('OK  ' if cond else 'FALLA ') + name)

PACK = {"kind": "moriarty-pack", "schemaVersion": 2, "title": "Paquete de prueba",
        "entities": [
            {"id": "heroe", "type": "Personaje", "name": "Héroe de prueba", "notes": "Ficha generada", "tags": ["prueba"], "fields": {"edad": "30", "rol": "Protagonista"}, "relations": [{"targetId": "taller", "label": "trabaja en"}]},
            {"id": "taller", "type": "Lugar", "name": "Taller de prueba", "notes": "", "fields": {"region": "Centro"}}],
        "chapters": [{"id": "cap-x", "title": "Capítulo importado", "summary": "Resumen importado", "status": "listo", "entityIds": ["heroe"], "scenes": [{"id": "esc-x", "title": "Apertura", "text": "Texto importado."}]}],
        "events": [{"id": "ev-x", "title": "Evento importado", "when": "Al inicio", "chapterId": "cap-x"}]}

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    def run(ctx, tag):
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(f'{tag}: {e}'))
        pg.on('console', lambda m: errs.append(f'{tag} console: {m.text}') if m.type == 'error' else None)
        return pg

    # ---- Escritorio, tema claro ----
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light')
    pg = run(ctx, 'escritorio')
    pg.goto(URL); pg.wait_for_timeout(800)
    check('arranque: splash desaparece', pg.locator('#splash').count() == 0)
    check('fuentes locales cargadas', pg.evaluate("document.fonts.check('16px Literata') && document.fonts.check('16px Inter')"))
    check('instalación nueva: biblioteca vacía, sin libro de relleno', pg.locator('[data-open-book]').count() == 0 and pg.locator('#emptyNewBook').count() == 1)
    pg.click('#emptyNewBook'); pg.wait_for_timeout(300); pg.fill('#libraryDialog input[name=title]', 'Novela de prueba'); pg.click('#libraryDialog button[type=submit]'); pg.wait_for_timeout(600)
    pg.click('[data-view=library]'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{HERE}/01-biblioteca-escritorio.png')
    # Cargar paquete por pegado
    pg.click('[data-open-book]'); pg.wait_for_timeout(500)
    pg.click('#import'); pg.wait_for_timeout(200); pg.click('#pasteJson'); pg.wait_for_timeout(300)
    pg.fill('#libraryDialog textarea[name=json]', json.dumps(PACK)); pg.click('#libraryDialog button[type=submit]'); pg.wait_for_timeout(1200)
    check('paquete con capítulo abre ese capítulo en Escribir', pg.input_value('#chapterTitle') == 'Capítulo importado')
    pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=fichas]'); pg.wait_for_timeout(500)
    check('paquete pegado: fichas cargadas en el libro activo', pg.locator('[data-entity]').count() == 2)
    check('paquete pegado: relación conservada', pg.locator('[data-rel-label]').count() == 1)
    pg.screenshot(path=f'{HERE}/02-archivo-escritorio.png')
    pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=capitulos]'); pg.wait_for_timeout(500)
    check('capítulo importado aparece en el tablero con estado', pg.locator('.chapter-icon .status-listo').count() == 1)
    pg.screenshot(path=f'{HERE}/03-tablero-escritorio.png')
    pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=cronologia]'); pg.wait_for_timeout(500)
    check('evento importado vinculado al capítulo', pg.locator('[data-event] [data-chapter]').evaluate("s=>s.selectedOptions[0].textContent") == 'Capítulo importado')
    pg.click('[data-view=write]'); pg.wait_for_timeout(400)
    pg.click('[data-chapter]:nth-of-type(1)'); pg.wait_for_timeout(300)
    pg.locator('[data-chapter]').nth(1).click(); pg.wait_for_timeout(400)
    check('capítulo importado: resumen y ficha vinculada', 'Resumen importado' in pg.input_value('[data-summary]') and pg.locator('[data-unlink]').count() == 1)
    pg.screenshot(path=f'{HERE}/04-escribir-detalles-escritorio.png')
    # Tamaño de letra persistente
    pg.click('#chapterMenuBtn'); pg.wait_for_timeout(200); pg.click('#bigger'); pg.click('#bigger'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    size = pg.evaluate("getComputedStyle(document.querySelector('#text')).fontSize")
    pg.reload(); pg.wait_for_timeout(800)
    check('tamaño de letra persiste tras recargar', pg.evaluate("getComputedStyle(document.querySelector('#text')).fontSize") == size == '21px')
    # Guardado con pausa: escribir y recargar
    pg.fill('#text', 'Persistencia de prueba'); pg.wait_for_timeout(700); pg.reload(); pg.wait_for_timeout(800)
    check('texto escrito persiste tras recargar (guardado con pausa)', pg.input_value('#text') == 'Persistencia de prueba')
    # Exportar paquete de fichas
    pg.click('#export'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl:
        pg.click('#exportPack')
    data = json.load(open(dl.value.path()))
    check('exportar paquete: kind y fichas', data['kind'] == 'moriarty-pack' and len(data['entities']) == 2 and not data['chapters'])
    # Exportar libro v2 y reimportar como libro nuevo
    pg.click('#export'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl:
        pg.click('#exportBook')
    book = json.load(open(dl.value.path()))
    check('exportar libro: schemaVersion 2 con campos nuevos', book['schemaVersion'] == 2 and 'entityIds' in book['chapters'][0] and 'relations' in book['entities'][0])
    pg.set_input_files('#file', dl.value.path()); pg.wait_for_timeout(1000)
    check('reimportar el mismo libro pregunta reemplazar o copiar', pg.locator('#chooseDialog').count() == 1)
    pg.click('#chooseDialog [data-choice=copy]'); pg.wait_for_timeout(1200)
    check('reimportar libro añade copia sin reemplazar', lib(pg, 'l.books.length') == 2)
    # JSON inválido rechazado
    pg.click('#import'); pg.wait_for_timeout(200); pg.click('#pasteJson'); pg.wait_for_timeout(300)
    pg.fill('#libraryDialog textarea[name=json]', '{"kind":"moriarty-pack","schemaVersion":2,"entities":[{"id":"<img src=x>","type":"Nota","name":"x","notes":""}]}')
    pg.click('#libraryDialog button[type=submit]'); pg.wait_for_timeout(800)
    check('paquete con ID inseguro rechazado con aviso', pg.locator('#toast.show').count() == 1 and 'inválido' in pg.text_content('#toast'))
    # Imagen de ficha (PNG generado)
    pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=fichas]'); pg.wait_for_timeout(400)
    png = os.path.join(HERE, '_prueba.png')
    import base64
    open(png, 'wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNBAAAEgTBf5FJqAAAAAASUVORK5CYII='))
    with pg.expect_file_chooser() as fc:
        pg.locator('[data-portrait]').first.click()
    fc.value.set_files(png); pg.wait_for_timeout(800)
    img = lib(pg, 'l.books.find(b=>b.project.id===l.activeBookId).project.entities[0].image')
    check('imagen de ficha comprimida y guardada como data URL', img.startswith('data:image/') and len(img) < 5000)
    os.remove(png)
    pg.screenshot(path=f'{HERE}/05-archivo-con-imagen.png')
    # Modo enfoque
    pg.click('[data-view=write]'); pg.wait_for_timeout(300); pg.click('#chapterMenuBtn'); pg.wait_for_timeout(200); pg.click('#focus'); pg.wait_for_timeout(300)
    check('modo enfoque oculta cabecera', not pg.locator('header').is_visible())
    pg.click('.focus-exit'); pg.wait_for_timeout(200)
    check('botón flotante sale del modo enfoque', pg.locator('header').is_visible())
    ctx.close()

    # ---- Modo oscuro ----
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark')
    pg = run(ctx, 'oscuro'); pg.goto(URL); pg.wait_for_timeout(800); seed_book(pg)
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    check('modo oscuro automático', bg == 'rgb(21, 25, 29)')
    pg.screenshot(path=f'{HERE}/06-biblioteca-oscuro.png')
    pg.click('[data-open-book]'); pg.wait_for_timeout(500); pg.screenshot(path=f'{HERE}/07-escribir-oscuro.png')
    ctx.close()

    # ---- Móvil ----
    for w in (320, 390):
        ctx = b.new_context(viewport={'width': w, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = run(ctx, f'movil{w}'); pg.goto(URL); pg.wait_for_timeout(800); seed_book(pg)
        check(f'móvil {w}px: sin desplazamiento horizontal', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
        pg.screenshot(path=f'{HERE}/08-biblioteca-movil-{w}.png')
        pg.click('[data-open-book]'); pg.wait_for_timeout(500)
        check(f'móvil {w}px: escribir sin desplazamiento horizontal', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
        pg.screenshot(path=f'{HERE}/09-escribir-movil-{w}.png')
        pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=fichas]'); pg.wait_for_timeout(400); pg.click('#addEntity'); pg.wait_for_timeout(300)
        pg.screenshot(path=f'{HERE}/10-archivo-movil-{w}.png')
        ctx.close()

    # ---- Libro grande: cargarlo varias veces no debe perderse al recargar (falla de V0.4.4 con localStorage) ----
    BRILLO = os.path.join(os.path.dirname(HERE), '..', 'historias', 'EL_BRILLO_AUSENTE.moriarty.json')
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pg = run(ctx, 'grande'); pg.goto(URL); pg.wait_for_timeout(800)
    for _ in range(3):
        pg.set_input_files('#file', BRILLO); pg.wait_for_timeout(1800)
        if pg.locator('#chooseDialog').count(): pg.locator('#chooseDialog .primary').first.click(); pg.wait_for_timeout(2200)
    pg.reload(); pg.wait_for_timeout(1500)
    check('libro con 68 imágenes cargado 3 veces sigue ahí tras recargar', lib(pg, 'l.books.length') == 3 and lib(pg, 'l.books.find(b=>!b.trashed).project.entities.filter(e=>e.image).length') == 68)
    ctx.close()

    # ---- Sin conexión ----
    ctx = b.new_context(viewport={'width': 1200, 'height': 800})
    pg = run(ctx, 'offline'); pg.goto(URL); pg.wait_for_timeout(2500)
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
    check('sin conexión: la app recarga desde caché', pg.locator('.brand').count() > 0 and pg.evaluate("document.fonts.check('16px Literata')"))
    pg.screenshot(path=f'{HERE}/11-offline.png')
    ctx.close()

    # ---- Archivo de prueba externo opcional (no se guarda captura) ----
    if len(sys.argv) > 1:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg = run(ctx, 'externo'); pg.goto(URL); pg.wait_for_timeout(800)
        pg.set_input_files('#file', sys.argv[1]); pg.wait_for_timeout(2000)
        n = lib(pg, 'l.books.length')
        check('archivo externo importado como libro', n == 2)
        pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=fichas]'); pg.wait_for_timeout(500)
        check('archivo externo: fichas visibles', pg.locator('[data-entity]').count() > 10)
        pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=capitulos]'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{HERE}/externo-tablero.png')
        pg.click('[data-view=map]'); pg.wait_for_timeout(300); pg.click('[data-tab=fichas]'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{HERE}/externo-archivo.png')
        ctx.close()
    b.close()

ok = sum(r['ok'] for r in results)
print(f'\n{ok}/{len(results)} comprobaciones · errores JS: {len(errs)}')
for e in errs: print('  ', e)
json.dump({'chromium': 'Playwright', 'fecha': time.strftime('%Y-%m-%d'), 'comprobaciones': results, 'errores_js': errs}, open(f'{HERE}/resultados-ui.json', 'w'), ensure_ascii=False, indent=1)
