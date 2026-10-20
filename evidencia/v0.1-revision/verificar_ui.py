from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json, traceback
OUT=Path('/workspace/moriarty-review/evidence')
checks=[]; errors=[]; external=[]; findings=[]
def check(name,ok,details=''):
 checks.append({'prueba':name,'resultado':'OK' if ok else 'FALLO','detalle':details})
 print(checks[-1],flush=True)
def state(page): return page.evaluate("JSON.parse(localStorage.getItem('moriarty.project.v1'))")
def snap(page,name): page.screenshot(path=str(OUT/name),full_page=True)
def nav(page,name): page.locator('[data-view="'+name+'"]').click()
def dialogs(d): d.accept('Punto de prueba' if d.type=='prompt' else None)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 page=ctx.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:8080','blob:','data:')) else None)
 page.on('dialog',dialogs)
 try:
  page.goto('http://127.0.0.1:8080'); expect(page.locator('#saved')).to_contain_text('Guardado en este dispositivo')
  check('Arranque HTTP',True)
  page.locator('#projectTitle').fill('MORIARTY · Proyecto de prueba')
  page.locator('#chapterTitle').fill('La carta bajo la lluvia')
  page.locator('#sceneTitle').fill('El hallazgo')
  original='La lluvia golpeaba los cristales cuando Inés encontró la carta.\n\nNo llevaba firma. Solo una dirección y una hora: medianoche. «¿Quién había vuelto?», se preguntó.\n\nGuardó el sobre en el bolsillo y apagó la lámpara.'
  page.locator('#text').fill(original)
  c1=state(page)['chapters'][0]['id']; s1=state(page)['chapters'][0]['scenes'][0]['id']
  # The scene title selector should update immediately.
  check('Título de escena actualizado en selector',page.locator('#sceneSelect option:checked').inner_text()=='El hallazgo',page.locator('#sceneSelect option:checked').inner_text())
  page.locator('#addScene').click(); page.locator('#sceneTitle').fill('La decisión'); page.locator('#text').fill('Inés salió a la calle. La ciudad seguía despierta.')
  page.locator('#addChapter').click(); page.locator('#chapterTitle').fill('La casa del reloj'); page.locator('#sceneTitle').fill('Medianoche'); page.locator('#text').fill('El reloj se detuvo justo antes de que alguien llamara a la puerta.')
  c2=state(page)['chapters'][1]['id']
  page.locator('#search').fill('cristales'); check('Búsqueda por contenido',page.locator('[data-chapter]').count()==1); page.locator('#search').fill('')
  page.locator('[data-chapter="'+c1+'"]').click(); check('Navegar conserva texto',page.locator('#text').input_value()==original)
  page.reload(); check('Recargar conserva proyecto',state(page)['chapters'][0]['scenes'][0]['text']==original)
  snap(page,'02-escribir-escritorio.png')
  page.locator('#focus').click(); check('Modo enfoque',not page.locator('header').is_visible()); page.locator('#focus').click()
  page.locator('#versions').click(); page.locator('#snapshot').click(); page.locator('#back').click(); page.locator('#text').fill('Estado posterior de prueba')
  page.locator('#versions').click(); page.locator('[data-restore]').first.click();
  check('Recuperación conserva estado anterior',state(page)['chapters'][0]['scenes'][0]['text']==original and state(page)['chapters'][0]['versions'][-1]['scenes'][0]['text']=='Estado posterior de prueba')
  snap(page,'03-versiones-escritorio.png'); page.locator('#back').click()
  nav(page,'board'); snap(page,'04-tablero-escritorio.png')
  page.locator('[data-move="'+c2+'"][data-dir="-1"]').click(); check('Ordenar capítulos',state(page)['chapters'][0]['id']==c2)
  page.locator('[data-move="'+c2+'"][data-dir="1"]').click()
  page.locator('#free').click(); icon=page.locator('[data-open="'+c1+'"]'); box=icon.bounding_box(); page.mouse.move(box['x']+50,box['y']+50); page.mouse.down(); page.mouse.move(box['x']+210,box['y']+150,steps=10); page.mouse.up()
  check('Lienzo mueve sin reordenar',state(page)['chapters'][0]['x']==200 and state(page)['chapters'][0]['id']==c1)
  snap(page,'05-lienzo-escritorio.png'); icon.focus(); page.keyboard.press('Enter'); check('Enter abre capítulo',page.locator('#text').is_visible())
  nav(page,'archive'); page.locator('#addEntity').click(); page.locator('[data-name]').fill('Inés'); page.locator('[data-notes]').fill('Archivista. Reconoce el sello del sobre, pero duda en revelar su origen.\nDatos ficticios para verificar la interfaz.')
  snap(page,'06-archivo-escritorio.png'); page.locator('[data-trash]').click(); page.locator('summary').filter(has_text='Fichas en papelera').click(); page.locator('[data-recover-entity]').click(); check('Papelera de fichas',len([e for e in state(page)['entities'] if not e['trashed']])==1)
  nav(page,'timeline'); page.locator('#addEvent').click(); page.locator('[data-title]').fill('Llega la carta'); page.locator('[data-when]').fill('Tres días antes'); page.locator('[data-event] [data-chapter]').select_option(c1)
  page.locator('#addEvent').click(); page.locator('[data-title]').last.fill('La cita'); page.locator('[data-when]').last.fill('Medianoche'); page.locator('[data-event] [data-chapter]').last.select_option(c2)
  snap(page,'07-cronologia-escritorio.png'); page.locator('[data-up]').last.click(); check('Ordenar cronología',state(page)['events'][0]['title']=='La cita'); page.locator('[data-down]').first.click()
  page.locator('[data-chapter="'+c1+'"]').click(); page.locator('#reviewStart').click(); page.locator('#instruction').fill('Corrige puntuación y conserva mi voz. Ejemplo manual de prueba.')
  proposal=original.replace('Solo una dirección y una hora: medianoche.','Solo contenía una dirección y una hora: medianoche.')
  page.locator('#proposal').fill(proposal); snap(page,'08-revision-escritorio.png')
  with page.expect_download() as dl: page.locator('#request').click()
  dl.value.save_as(str(OUT/'solicitud-prueba.json')); check('Descarga solicitud JSON',json.loads((OUT/'solicitud-prueba.json').read_text())['kind']=='review-request')
  page.locator('#apply').click(); check('Aplicar revisión y conservar versión',state(page)['chapters'][0]['scenes'][0]['text']==proposal and state(page)['chapters'][0]['versions'][-1]['scenes'][0]['text']==original)
  nav(page,'write'); page.locator('#reviewStart').click(); page.locator('#proposal').fill('No debe sobrescribir'); nav(page,'write'); page.locator('#text').fill(proposal+'\nCambio posterior protegido.'); nav(page,'review'); page.locator('#apply').click()
  check('Revisión obsoleta bloqueada',page.locator('#toast').inner_text().startswith('El original cambió') and state(page)['chapters'][0]['scenes'][0]['text'].endswith('Cambio posterior protegido.'))
  nav(page,'write'); page.locator('#trashChapter').click(); page.locator('#sidebar summary').click(); page.locator('[data-recover]').click(); check('Papelera de capítulos',not state(page)['chapters'][0]['trashed'])
  saved=state(page)
  with page.expect_download() as dl: page.locator('#export').click()
  dl.value.save_as(str(OUT/'proyecto-prueba.moriarty.json')); check('Exportación JSON completa',json.loads((OUT/'proyecto-prueba.moriarty.json').read_text())==saved)
  with page.expect_download() as dl: page.locator('#txt').click()
  dl.value.save_as(str(OUT/'manuscrito-prueba.txt')); check('Exportación TXT Unicode','Inés' in (OUT/'manuscrito-prueba.txt').read_text())
  page.locator('#file').set_input_files({'name':'invalido.json','mimeType':'application/json','buffer':b'{"schemaVersion":1}'})
  expect(page.locator('#toast')).to_contain_text('inválido'); check('Importación inválida no reemplaza',state(page)==saved)
  with page.expect_download() as dl: page.locator('#file').set_input_files(str(OUT/'proyecto-prueba.moriarty.json'))
  dl.value.save_as(str(OUT/'respaldo-automatico.json')); expect(page.locator('#toast')).to_contain_text('Proyecto abierto'); check('Reimportación conserva todo y crea respaldo',state(page)==saved and json.loads((OUT/'respaldo-automatico.json').read_text())==saved)
  page.evaluate('navigator.serviceWorker.ready'); page.wait_for_function('navigator.serviceWorker.controller !== null')
  ctx.set_offline(True); page.reload(); expect(page.locator('#text')).to_be_visible(); page.locator('#text').fill(proposal+'\nEscritura sin conexión.'); page.reload(); check('Offline: recarga y escritura persistente',page.locator('#text').input_value().endswith('Escritura sin conexión.')); snap(page,'09-offline-escritorio.png'); ctx.set_offline(False)
  # Isolated corrupted-data case.
  badctx=b.new_context(); bad=badctx.new_page(); bad.goto('http://127.0.0.1:8080'); bad.evaluate("localStorage.setItem('moriarty.project.v1','{ilegible')"); bad.reload(); bad.locator('#text').fill('No debe reemplazar el dato ilegible'); check('Guardado ilegible bloquea sobrescritura',bad.evaluate("localStorage.getItem('moriarty.project.v1')")=='{ilegible' and 'bloqueado' in bad.locator('#saved').inner_text()); badctx.close()
  failctx=b.new_context(); failctx.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')}")
  fail=failctx.new_page(); fail.goto('http://127.0.0.1:8080'); check('Error de guardado visible','No se pudo guardar' in fail.locator('#saved').inner_text()); failctx.close()
  # Mobile emulation in Chromium, no physical-device claim.
  mobile=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
  mp=mobile.new_page(); mp.on('dialog',dialogs); mp.on('pageerror',lambda e:errors.append(str(e))); mp.goto('http://127.0.0.1:8080'); mp.locator('#file').set_input_files(str(OUT/'proyecto-prueba.moriarty.json')); expect(mp.locator('#toast')).to_contain_text('Proyecto abierto')
  mp.locator('#toast').wait_for(state='hidden'); snap(mp,'10-escribir-movil.png')
  for v in ['write','board','archive','timeline','review']:
   nav(mp,v)
   check('Móvil 390: sin desborde en '+v,mp.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(mp.evaluate('({ancho:innerWidth,contenido:document.documentElement.scrollWidth})')))
   if v=='board': snap(mp,'11-tablero-movil.png')
   if v=='review':
    check('Móvil revisión: original visible y propuesta oculta',mp.get_by_label('Original enviado').is_visible() and not mp.locator('#proposal').is_visible()); snap(mp,'12-revision-original-movil.png'); mp.locator('#proposalTab').click(); check('Móvil revisión: pestaña propuesta',mp.locator('#proposal').is_visible() and not mp.get_by_label('Original enviado').is_visible()); snap(mp,'13-revision-propuesta-movil.png')
  for width in [320,360,560,768]:
   mp.set_viewport_size({'width':width,'height':844}); nav(mp,'write'); check('Sin desborde editor ancho '+str(width),mp.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(mp.evaluate('document.documentElement.scrollWidth')))
  mp.set_viewport_size({'width':320,'height':844}); snap(mp,'14-escribir-320px.png')
  check('Sin errores JavaScript',not errors,str(errors)); check('Sin peticiones externas de la app',not external,str(external))
 except Exception as e:
  check('Ejecución completa del recorrido',False,traceback.format_exc()); snap(page,'fallo-recorrido.png')
 finally:
  (OUT/'resultados-ui.json').write_text(json.dumps({'browser':b.version,'checks':checks,'pageerrors':errors,'external_requests':external},ensure_ascii=False,indent=2))
  b.close()
