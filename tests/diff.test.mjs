import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokenize, diffTokens, diffBlocks, applyBlocks, countChanges} from '../dist/diff.js';

test('tokens round-trip and Myers diff is exact', () => {
  const a = 'El perro   corre\nrápido por el parque.';
  assert.equal(tokenize(a).join(''), a);
  const b = 'El gato corre\nmuy rápido por el jardín.';
  const ops = diffTokens(tokenize(a), tokenize(b));
  assert.equal(ops.filter((o) => o.op !== '+').map((o) => o.a).join(''), a);
  assert.equal(ops.filter((o) => o.op !== '-').map((o) => o.b).join(''), b);
});
test('blocks: accept all = after, accept none = before, partial works', () => {
  const a = 'Alastor cerró el abrigo. Caminó despacio hacia la universidad. Llovía.';
  const b = 'Alastor se cerró el abrigo. Caminó deprisa hacia la universidad. No llovía.';
  const blocks = diffBlocks(a, b);
  const n = countChanges(blocks);
  assert.ok(n >= 2 && n <= 4, `cambios: ${n}`);
  assert.equal(applyBlocks(blocks, new Set()), a);
  assert.equal(applyBlocks(blocks, new Set([...Array(n).keys()])), b);
  const partial = applyBlocks(blocks, new Set([0]));
  assert.ok(partial.startsWith('Alastor se cerró'));
  assert.ok(partial.endsWith(' Llovía.'));
});
test('identical, empty and long texts', () => {
  assert.deepEqual(diffBlocks('igual', 'igual'), [{type: 'same', text: 'igual'}]);
  assert.equal(countChanges(diffBlocks('', 'nuevo')), 1);
  const long = Array.from({length: 3000}, (_, i) => 'palabra' + (i % 50)).join(' ');
  const edited = long.replace('palabra7 ', 'otra ').replace(/palabra49$/, 'fin');
  const t0 = Date.now();
  const blocks = diffBlocks(long, edited);
  assert.ok(Date.now() - t0 < 2000, 'rápido en textos largos');
  assert.equal(applyBlocks(blocks, new Set([0, 1, 2, 3])), edited);
});
