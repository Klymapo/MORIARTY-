import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zip, docx, epub, segments, printHtml} from '../dist/exporter.js';
import {createProject} from '../dist/model.js';
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const book = () => {
  const p = createProject('Prueba «ñ»');
  p.chapters[0].title = '1 · Inicio';
  p.chapters[0].scenes[0].text = 'Primer párrafo con *cursiva* y acentos: áéíóú.\n\nSegundo párrafo.';
  p.chapters[0].scenes.push({id: 'e2', title: 'Escena dos', text: 'Más texto & <símbolos>.'});
  return p;
};
test('segments split italics', () => {
  assert.deepEqual(segments('a *b* c'), [{t: 'a '}, {t: 'b', i: true}, {t: ' c'}]);
});
test('zip is valid (unzip -t) and docx/epub contain the text', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mz-'));
  for (const [name, blob] of [['a.docx', docx(book(), {author: 'Atátoriz'})], ['a.epub', epub(book(), {author: 'Atátoriz'})]]) {
    const path = join(dir, name);
    writeFileSync(path, Buffer.from(await blob.arrayBuffer()));
    const out = execFileSync('unzip', ['-t', path]).toString();
    assert.match(out, /No errors detected/);
    const list = execFileSync('unzip', ['-Z1', path]).toString();
    if (name.endsWith('epub')) assert.ok(list.startsWith('mimetype\n'), 'mimetype primero');
    const text = execFileSync('unzip', ['-p', path, name.endsWith('docx') ? 'word/document.xml' : 'OEBPS/cap001.xhtml']).toString();
    assert.match(text, /cursiva/);
    assert.match(text, /&lt;símbolos&gt;/);
    assert.match(text, name.endsWith('docx') ? /<w:i\/>/ : /<em>cursiva<\/em>/);
  }
});
test('print html escapes and includes chapters', () => {
  const h = printHtml(book());
  assert.match(h, /<em>cursiva<\/em>/);
  assert.match(h, /1 · Inicio/);
  assert.doesNotMatch(h, /<símbolos>/);
});
