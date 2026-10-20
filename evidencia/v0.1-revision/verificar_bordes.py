from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json
O=Path('/workspace/moriarty-review/evidence'); results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1000}); pg=c.new_page(); pg.on('dialog',lambda d:d.accept()); pg.goto('http://127.0.0.1:8080')
 pg.locator('#chapterTitle').fill('Capítulo de prueba'); pg.locator('#sceneTitle').fill('Nombre actualizado'); pg.screenshot(path=str(O/'15-defecto-nombre-escena.png'),full_page=True)
 results.append({'caso':'Nombre de escena','selector':pg.locator('#sceneSelect').inner_text(),'barra_lateral':pg.locator('[data-scene]').inner_text(),'campo':pg.locator('#sceneTitle').input_value()})
 pg.locator('[data-view="timeline"]').click()
 for title in ['A','B','C']:
  pg.locator('#addEvent').click(); pg.locator('[data-title]').last.fill(title)
 pg.locator('[data-event]').nth(1).locator('[data-trash]').click()
 before=pg.locator('[data-title]').evaluate_all('(els)=>els.map(x=>x.value)'); pg.locator('[data-event]').last.locator('[data-up]').click(); after=pg.locator('[data-title]').evaluate_all('(els)=>els.map(x=>x.value)')
 results.append({'caso':'Mover cronología con evento intermedio en papelera','antes':before,'despues_de_subir_C':after,'fallo':before==after})
 pg.screenshot(path=str(O/'16-defecto-cronologia.png'),full_page=True)
 # Harmless local proof: imported IDs are inserted into HTML without escaping.
 payload=json.loads((O/'proyecto-prueba.moriarty.json').read_text())
 old=payload['chapters'][0]['id']; crafted='chapter-test"><img src="./missing-test.png" onerror="document.body.dataset.importProbe=String(1)"><span data-test="'
 payload['chapters'][0]['id']=crafted
 for e in payload['events']:
  if e['chapterId']==old:e['chapterId']=crafted
 for r in payload['reviews']:
  if r['chapterId']==old:r['chapterId']=crafted
 pg.locator('#file').set_input_files({'name':'prueba-local-id.json','mimeType':'application/json','buffer':json.dumps(payload).encode()})
 expect(pg.locator('#toast')).to_contain_text('Proyecto abierto')
 pg.wait_for_function("document.body.dataset.importProbe === '1'")
 results.append({'caso':'Importación de ID con HTML','ejecucion_marcador_local':pg.get_attribute('body','data-import-probe'),'sin_envio_externo':True})
 (O/'resultados-bordes.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)); print(json.dumps(results,ensure_ascii=False,indent=2))
 # Clean screenshots taken from unchanged V0.1 with the normal test fixture.
 clean=b.new_context(viewport={'width':1440,'height':1000}); page=clean.new_page(); page.on('dialog',lambda d:d.accept()); page.goto('http://127.0.0.1:8080'); page.locator('#file').set_input_files(str(O/'proyecto-prueba.moriarty.json')); expect(page.locator('#toast')).to_contain_text('Proyecto abierto'); page.locator('#toast').wait_for(state='hidden')
 for view,file in [('write','02-escribir-escritorio.png'),('board','04-tablero-escritorio.png'),('archive','06-archivo-escritorio.png'),('timeline','07-cronologia-escritorio.png'),('review','08-revision-escritorio.png')]:
  page.locator('[data-view="'+view+'"]').click()
  if view=='review':page.locator('#reviewSelect').select_option(index=0)
  page.screenshot(path=str(O/file),full_page=True)
 b.close()
