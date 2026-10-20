from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,traceback
O=Path('/workspace/moriarty-v02/evidence');URL='http://127.0.0.1:8081';checks=[];errors=[]
def check(label,ok):
 checks.append({'prueba':label,'ok':ok});print(label,ok,flush=True)
 if not ok:raise AssertionError(label)
def state(pg):return pg.evaluate("JSON.parse(localStorage.getItem('moriarty.library.v1'))")
def nav(pg,v):pg.locator('[data-view="'+v+'"]').click()
def shot(pg,name):pg.screenshot(path=str(O/name),full_page=True)
def create_book(pg,title,synopsis,saga=None):
 pg.locator('#newBook').click();pg.locator('#bookTitle').fill(title);pg.locator('#bookSynopsis').fill(synopsis)
 if saga:pg.locator('#bookSaga').select_option(saga)
 pg.get_by_role('button',name='Crear y escribir',exact=True).click()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 pg=ctx.new_page();pg.on('pageerror',lambda e:(errors.append({'error':str(e),'stack':e.stack,'after':checks[-1]['prueba'] if checks else ''}),print('PAGEERROR',e.stack,flush=True)));pg.on('dialog',lambda d:d.accept('Versión de prueba' if d.type=='prompt' else None))
 try:
  pg.goto(URL);expect(pg.locator('#bookGrid')).to_be_visible();check('Inicio en biblioteca',len(state(pg)['books'])==1)
  pg.locator('#newSaga').click();pg.locator('#sagaTitle').fill('Los archivos de la niebla');pg.locator('#sagaDescription').fill('Tres ciudades, una memoria compartida y secretos que se niegan a desaparecer.');pg.locator('#libraryDialog').get_by_role('button',name='Crear saga',exact=True).click()
  saga=state(pg)['sagas'][0]['id'];check('Crear saga y estado vacío',pg.locator('#emptyNewBook').is_visible())
  create_book(pg,'La carta bajo la lluvia','Una archivista descubre que una carta sin firma puede cambiar el pasado de una ciudad.')
  first=state(pg)['activeBookId'];pg.locator('#chapterTitle').fill('El sobre');pg.locator('#sceneTitle').fill('Medianoche');pg.locator('#text').fill('La lluvia golpeaba los cristales cuando Inés encontró la carta.\n\nNo llevaba firma. Solo una dirección y una hora: medianoche.')
  check('Crear libro en saga',state(pg)['books'][-1]['sagaId']==saga)
  check('Regresión: renombrar escena actualiza selector y lateral',pg.locator('#sceneSelect option:checked').inner_text()=='Medianoche' and 'Medianoche' in pg.locator('[data-scene]').inner_text())
  nav(pg,'archive');pg.locator('#addEntity').click();pg.locator('[data-name]').fill('Inés');pg.locator('[data-notes]').fill('Archivista. Reconoce un sello que no debería existir.')
  nav(pg,'write');pg.locator('#reviewStart').click();pg.locator('#proposal').fill('Texto propuesto para Inés.');pg.locator('#instruction').fill('Revisión manual de prueba.')
  nav(pg,'library');create_book(pg,'El atlas de las voces','Un mapa imposible. Una voz en cada calle. El segundo viaje de Inés.');second=state(pg)['activeBookId']
  pg.locator('#text').fill('El segundo libro conserva su propia voz.');nav(pg,'archive');check('Fichas independientes por libro',pg.locator('[data-entity]').count()==0);nav(pg,'review');check('Revisiones independientes por libro',pg.get_by_text('Tu mesa de revisión.').is_visible())
  nav(pg,'library');pg.locator('[data-scope="independent"]').click();create_book(pg,'El jardín de los días lentos','Una novela independiente sobre las pequeñas decisiones que cambian una vida.');third=state(pg)['activeBookId'];pg.locator('#text').fill('En el jardín, todos los relojes llegaban tarde.')
  nav(pg,'library');pg.locator('[data-scope="all"]').click();check('Biblioteca conserva cuatro libros',len(state(pg)['books'])==4)
  pg.locator('#librarySearch').fill('atlas');check('Búsqueda de biblioteca',pg.locator('.book-card').count()==1);pg.locator('#librarySearch').fill('')
  pg.locator('[data-scope="'+saga+'"]').click();check('Filtrar saga',pg.locator('.book-card').count()==2)
  pg.locator('[data-book-move="'+second+'"][data-delta="-1"]').click();check('Reordenar saga', [x['project']['id'] for x in state(pg)['books'] if x['sagaId']==saga]==[second,first])
  pg.locator('[data-book-move="'+second+'"][data-delta="1"]').click()
  shot(pg,'02-saga-escritorio.png')
  pg.locator('[data-edit-book="'+second+'"]').click();pg.locator('#bookSaga').select_option('');pg.get_by_role('button',name='Guardar cambios',exact=True).click();check('Mover libro fuera de saga',pg.locator('.book-card').count()==1)
  pg.locator('[data-scope="independent"]').click();pg.locator('[data-edit-book="'+second+'"]').click();pg.locator('#bookSaga').select_option(saga);pg.get_by_role('button',name='Guardar cambios',exact=True).click()
  pg.locator('[data-scope="all"]').click();pg.locator('[data-edit-book="'+third+'"]').click();shot(pg,'03-detalles-libro.png');pg.get_by_role('button',name='Cancelar',exact=True).click()
  pg.locator('[data-open-book="'+first+'"]').first.click();check('Cambiar libro recupera manuscrito',pg.locator('#text').input_value().startswith('La lluvia'))
  nav(pg,'archive');check('Cambiar libro recupera fichas',pg.locator('[data-name]').input_value()=='Inés');nav(pg,'review');check('Cambiar libro recupera revisión',pg.locator('#proposal').input_value()=='Texto propuesto para Inés.')
  nav(pg,'write');shot(pg,'04-escritor-iconos.png');nav(pg,'board');check('Tablero renderiza tarjetas con iconos',pg.locator('.chapter-icon svg').count()==1);pg.locator('.chapter-icon').focus();pg.keyboard.press('Enter');check('Tablero abre con teclado',pg.locator('#text').is_visible())
  pg.reload();check('Recarga conserva libro activo',state(pg)['activeBookId']==first);nav(pg,'write');check('Recarga conserva texto',pg.locator('#text').input_value().startswith('La lluvia'))
  pg.locator('#versions').click();pg.locator('#snapshot').click();pg.locator('#back').click();pg.locator('#text').fill('Cambio para recuperar');pg.locator('#versions').click();pg.locator('[data-restore]').first.click();pg.locator('#back').click();check('Versiones siguen recuperando',pg.locator('#text').input_value().startswith('La lluvia'))
  nav(pg,'timeline')
  for title in ['A','B','C']:
   pg.locator('#addEvent').click();pg.locator('[data-title]').last.fill(title)
  pg.locator('[data-event]').nth(1).locator('[data-trash]').click();pg.locator('[data-event]').last.locator('[data-up]').click();check('Regresión: cronología ignora papelera al ordenar',pg.locator('[data-title]').evaluate_all('(els)=>els.map(e=>e.value)')==['C','A'])
  nav(pg,'library');pg.locator('#toast').wait_for(state='hidden');shot(pg,'01-biblioteca-escritorio.png')
  with pg.expect_download() as dl:pg.locator('#backupLibrary').click()
  dl.value.save_as(str(O/'biblioteca-prueba.moriarty.json'));saved=state(pg);check('Respaldo completo',json.loads((O/'biblioteca-prueba.moriarty.json').read_text())==saved)
  pg.locator('[data-open-book="'+first+'"]').first.click()
  with pg.expect_download() as dl:pg.locator('#export').click()
  dl.value.save_as(str(O/'libro-prueba.moriarty.json'));single=json.loads((O/'libro-prueba.moriarty.json').read_text());check('Exportar libro compatible V0.1',single['schemaVersion']==1 and 'chapters' in single and 'books' not in single)
  pg.locator('#file').set_input_files(str(O/'libro-prueba.moriarty.json'));expect(pg.locator('#toast')).to_contain_text('Importado');check('Importar libro añade copia sin reemplazar',len(state(pg)['books'])==5 and state(pg)['books'][:4]==saved['books'])
  before=state(pg);pg.locator('#file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schemaVersion":999}'});expect(pg.locator('#toast')).to_contain_text('inválido');check('Importación inválida no cambia biblioteca',state(pg)==before)
  bad=single.copy();bad['id']='x"><img src=x onerror="document.body.dataset.probe=1">';pg.locator('#file').set_input_files({'name':'id-hostil.json','mimeType':'application/json','buffer':json.dumps(bad).encode()});expect(pg.locator('#toast')).to_contain_text('inválido');check('Regresión: ID HTML rechazado sin ejecución',state(pg)==before and pg.get_attribute('body','data-probe') is None)
  pg.evaluate('navigator.serviceWorker.ready');pg.wait_for_function('navigator.serviceWorker.controller!==null');ctx.set_offline(True);pg.reload();expect(pg.locator('#bookGrid')).to_be_visible();pg.locator('[data-open-book="'+second+'"]').first.click();pg.locator('#text').fill('Escritura offline del segundo libro.');pg.reload();nav(pg,'write');check('Biblioteca y edición disponibles offline',pg.locator('#text').input_value()=='Escritura offline del segundo libro.');ctx.set_offline(False)
  # Migration from the original key at the same origin; no write to the legacy copy.
  mc=b.new_context();mp=mc.new_page();mp.goto(URL);legacy=Path('/workspace/moriarty-review/evidence/proyecto-prueba.moriarty.json').read_text();mp.evaluate('(raw)=>{localStorage.clear();localStorage.setItem("moriarty.project.v1",raw)}',legacy);mp.reload();expect(mp.locator('.book-card')).to_have_count(1);check('Migración conserva V0.1 y crea biblioteca',mp.evaluate('localStorage.getItem("moriarty.project.v1")')==legacy and state(mp)['books'][0]['project']==json.loads(legacy));mc.close()
  cc=b.new_context();cp=cc.new_page();cp.goto(URL);cp.evaluate('localStorage.setItem("moriarty.library.v1","{ilegible")');cp.reload();expect(cp.locator('#recoveryBanner')).to_be_visible();nav(cp,'write');cp.locator('#text').fill('No debe sobrescribir');check('Guardado ilegible protegido',cp.evaluate('localStorage.getItem("moriarty.library.v1")')=='{ilegible');cc.close()
  mobile=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1,accept_downloads=True);m=mobile.new_page();m.on('pageerror',lambda e:(errors.append({'error':str(e),'stack':e.stack,'after':checks[-1]['prueba'] if checks else ''}),print('PAGEERROR',e.stack,flush=True)));m.goto(URL);m.locator('#file').set_input_files(str(O/'biblioteca-prueba.moriarty.json'));expect(m.locator('#toast')).to_contain_text('Importado');check('Importar biblioteca fusiona libros y sagas',len(state(m)['books'])==5 and len(state(m)['sagas'])==1)
  nav(m,'library');m.locator('#toast').wait_for(state='hidden');shot(m,'05-biblioteca-movil.png');msaga=state(m)['sagas'][0]['id'];m.locator('[data-scope="'+msaga+'"]').click();shot(m,'06-saga-movil.png')
  m.locator('#newBook').click();m.locator('#bookTitle').fill('Libro móvil');shot(m,'07-nuevo-libro-movil.png');m.get_by_role('button',name='Crear y escribir',exact=True).click();m.locator('#text').fill('Libro creado desde la interfaz móvil.');nav(m,'library');check('Crear libro en móvil',len(state(m)['books'])==6)
  for width in [320,390,768]:
   m.set_viewport_size({'width':width,'height':844})
   for view in ['library','write','board','archive','timeline','review']:
    nav(m,view);check(f'Sin desborde {view} a {width}px',m.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('Sin errores JavaScript',not errors)
 except Exception:
  checks.append({'prueba':'Recorrido completo','ok':False,'error':traceback.format_exc()});print(traceback.format_exc(),flush=True);shot(pg,'fallo.png')
 finally:
  (O/'resultados-ui.json').write_text(json.dumps({'browser':b.version,'checks':checks,'errors':errors},ensure_ascii=False,indent=2));b.close()
