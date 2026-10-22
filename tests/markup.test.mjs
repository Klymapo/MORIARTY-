import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inlines, blocks, toHtml, plain} from '../dist/markup.js';
import {createProject, validate} from '../dist/model.js';
test('inline marks', () => {
  assert.deepEqual(inlines('a *b* **c** __d__'), [{t: 'a '}, {t: 'b', i: true}, {t: ' '}, {t: 'c', b: true}, {t: ' '}, {t: 'd', u: true}]);
});
test('blocks and html', () => {
  const t = 'Primero\nsegunda línea.\n\n> cita\n\n-> centrado <-\n\n---\n\n***\n\n![mapa](asset:m1)\n\nÚltimo.';
  const b = blocks(t);
  assert.deepEqual(b.map((x) => x.type), ['p', 'quote', 'center', 'break', 'sep', 'image', 'p']);
  const h = toHtml(t, {assets: {m1: {data: 'data:image/png;base64,AAAA', alt: 'mapa'}}, dropCap: true});
  assert.match(h, /^<p class="dropcap">Primero<br>segunda línea\.<\/p>/);
  assert.match(h, /<blockquote><p>cita<\/p><\/blockquote>/);
  assert.match(h, /<figure><img src="data:image\/png;base64,AAAA" alt="mapa">/);
  assert.match(h, /page-break/);
  assert.equal(plain('a *b*\n\n> c'), 'a b\n\nc');
});
test('assets and style validate', () => {
  const p = createProject();
  p.assets.m1 = {data: 'data:image/png;base64,iVBORw0KGgo=', alt: 'mapa'};
  assert.ok(validate(p));
  p.assets['<x>'] = {data: 'data:image/png;base64,iVBORw0KGgo=', alt: ''};
  assert.throws(() => validate(p));
});
