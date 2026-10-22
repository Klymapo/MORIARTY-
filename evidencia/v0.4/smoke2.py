from playwright.sync_api import sync_playwright
import json, re
S='/tmp/claude-0/-home-claude/415e0113-1b48-532b-b7a0-a78f90ccbca8/scratchpad/shots/'
B='/home/claude/moriarty-/historias/EL_BRILLO_AUSENTE.moriarty.json'
ok=[]
def check(name,cond): ok.append((name,bool(cond))); print(('OK  ' if cond else 'FAIL'),name)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    ctx=b.new_context(viewport={'width':1400,'height':900},accept_downloads=True)
    pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8077/'); pg.wait_for_timeout(900)
    pg.set_input_files('#file',B); pg.wait_for_timeout(1800)
    # --- formato
    ta=pg.locator('#text'); ta.click(); ta.evaluate("t=>{t.setSelectionRange(0,5)}")
    pg.click('[data-fmt=b]'); check('negrita', ta.input_value().startswith('**'))
    pg.click('[data-fmt=b]'); check('negrita toggle', not ta.input_value().startswith('**'))
    pg.keyboard.press('Control+i'); check('ctrl+i', '*' in ta.input_value()[:8])
    pg.click('[data-fmt=quote]'); check('sangría', ta.input_value().startswith('> '))
    pg.click('[data-fmt=quote]')
    pg.click('[data-fmt=break]'); check('salto página', '---' in ta.input_value())
    ta.evaluate("t=>{t.setSelectionRange(t.value.length,t.value.length)}")
    pg.keyboard.type('a--b'); check('autoguion', 'a—b' in ta.input_value())
    pg.click('[data-fmt=read]'); pg.wait_for_timeout(300)
    check('lectura', pg.locator('#readingView .dropcap').count()==1 and pg.locator('#readingView .page-break').count()==1)
    pg.screenshot(path=S+'v4-read.png'); pg.click('[data-fmt=read]')
    # --- búsqueda
    pg.keyboard.press('Control+Shift+F'); pg.wait_for_timeout(300)
    check('search dialog', pg.locator('#searchDialog').is_visible())
    pg.fill('#sq','Ashley'); pg.wait_for_timeout(300)
    n=pg.locator('#sResults .search-hit, #sResults li, #sResults [data-hit]').count()
    check('search results', n>0 or 'Ashley' in pg.locator('#sResults').inner_text()); print('  hits', n, pg.locator('#sCount').inner_text())
    pg.fill('#sr','ASHLEYX'); pg.wait_for_timeout(200)
    pg.click('#sReplaceAll'); pg.wait_for_timeout(500); pg.screenshot(path=S+'v4-replace.png')
    d=pg.locator('#chooseDialog');
    if d.count(): pg.click('#chooseDialog .primary'); pg.wait_for_timeout(1200)
    pg.check('#scs'); pg.wait_for_timeout(400)
    check('replace all', pg.locator('#sCount').inner_text().startswith('0'))
    pg.fill('#sq','ASHLEYX'); pg.wait_for_timeout(400); print('  after', pg.locator('#sCount').inner_text())
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # --- tema
    pg.click('#theme'); check('tema light', pg.evaluate("document.documentElement.dataset.theme")=='light')
    pg.click('#theme'); check('tema dark', pg.evaluate("document.documentElement.dataset.scheme")=='dark')
    pg.screenshot(path=S+'v4-dark.png'); pg.click('#theme')
    # --- plantillas capítulo
    pg.click('#addChapter'); pg.wait_for_timeout(400)
    if pg.locator('#chooseDialog').count():
        pg.screenshot(path=S+'v4-tpl.png')
        pg.locator('#chooseDialog .tpl').nth(1).click()
        pg.click('#chooseDialog .primary'); pg.wait_for_timeout(500)
        check('plantilla capítulo', pg.locator('#sceneSelect option').count()>=2)
    else: check('plantilla capítulo (sin diálogo)', False)
    # --- exports
    for id_ in ['exportDocx','exportEpub']:
        pg.click('#export'); pg.wait_for_timeout(200)
        with pg.expect_download(timeout=15000) as dl:
            pg.click('#'+id_); pg.wait_for_timeout(300)
            if pg.locator('#chooseDialog').count(): pg.fill('#chooseDialog input[name=author]','Atátoriz'); pg.click('#chooseDialog .primary')
        path=dl.value.path(); import zipfile
        z=zipfile.ZipFile(path); names=z.namelist(); z.testzip()
        check(id_, ('word/document.xml' in names) or ('OEBPS/content.opf' in names or any('opf' in n for n in names)))
        print('  ', dl.value.suggested_filename, len(names))
    pg.click('#export'); pg.wait_for_timeout(200)
    with ctx.expect_page() as np_: pg.click('#exportPdf')
    pp=np_.value; pp.wait_for_timeout(600); check('print view', pp.locator('h1,h2').count()>0); pp.close()
    # --- revisión
    pg.click('#reviewStart'); pg.wait_for_timeout(600)
    pg.wait_for_timeout(700)
    rv=pg.evaluate("(()=>{const l=JSON.parse(localStorage.getItem('moriarty.library.v1'));const bs=l.books;return bs.map(b=>b.project.reviews||[]).flat().at(-1)})()")
    rid=rv['id']; base=rv['base']
    prop=base.replace('ASHLEYX','Ashley',1)+'\n\nFrase nueva al final.'
    resp=json.dumps({'kind':'review-response','schemaVersion':1,'reviewId':rid,'proposal':prop,'notes':'prueba'})
    pg.click('#import'); pg.wait_for_timeout(200); pg.click('#pasteJson'); pg.wait_for_timeout(300)
    pg.fill('textarea[name=json]',resp); pg.click('dialog[open] button.primary, dialog[open] button[type=submit]'); pg.wait_for_timeout(900)
    pg.screenshot(path=S+'v4-review2.png')
    check('diff cambios', pg.locator('.diff-view .change, .diff-view [data-block]').count()>=2)
    print('  review text', pg.locator('#main').inner_text()[:300].replace('\n',' | '))
    # --- mobile
    m=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page()
    m.on('pageerror',lambda e:errs.append('mobile:'+str(e)))
    m.goto('http://localhost:8077/'); m.wait_for_timeout(800); m.set_input_files('#file',B); m.wait_for_timeout(1500)
    m.screenshot(path=S+'m-write.png')
    for tab in ['map','tracker']:
        m.click(f'[data-view={tab}]'); m.wait_for_timeout(1000); m.screenshot(path=S+f'm-{tab}.png')
    check('mobile sin overflow', m.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    print('ERRS', errs)
    b.close()
print(sum(1 for _,c in ok if c),'/',len(ok))
