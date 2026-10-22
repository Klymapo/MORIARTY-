// MORIARTY — diferencias entre dos textos, por palabras (Myers O(ND)), agrupadas en cambios aceptables uno a uno.

// Divide en palabras y separadores conservando todo (unir los tokens devuelve el texto exacto).
export const tokenize = (text) => text.match(/\s+|[^\s]+/gu) || [];

// Devuelve [{op:'=', a, b}, {op:'-', a}, {op:'+', b}] por token, en orden.
export function diffTokens(a, b) {
  const n = a.length,
    m = b.length,
    max = n + m;
  if (!max) return [];
  const v = new Map([[1, 0]]);
  const trace = [];
  outer: for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? (v.get(k + 1) ?? 0) : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) x++, y++;
      v.set(k, x);
      if (x >= n && y >= m) break outer;
    }
  }
  // Reconstrucción hacia atrás.
  const ops = [];
  let x = n,
    y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vv = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && (vv.get(k - 1) ?? -1) < (vv.get(k + 1) ?? -1)) ? k + 1 : k - 1;
    const prevX = vv.get(prevK) ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) ops.push({op: '=', a: a[x - 1], b: b[y - 1]}), x--, y--;
    if (d > 0) {
      if (x === prevX) ops.push({op: '+', b: b[y - 1]}), y--;
      else ops.push({op: '-', a: a[x - 1]}), x--;
    }
  }
  return ops.reverse();
}

// Agrupa en bloques: {type:'same', text} o {type:'change', before, after}. Los espacios junto a un cambio
// se pegan al cambio para que cada bloque sea legible.
export function diffBlocks(before, after) {
  const ops = diffTokens(tokenize(before), tokenize(after));
  const blocks = [];
  let same = '',
    del = '',
    ins = '',
    inChange = false;
  const flushChange = () => {
    if (inChange) blocks.push({type: 'change', before: del, after: ins});
    del = ins = '';
    inChange = false;
  };
  const flushSame = () => {
    if (same) blocks.push({type: 'same', text: same});
    same = '';
  };
  for (const o of ops) {
    if (o.op === '=') {
      if (inChange && /^\s+$/u.test(o.a)) {
        // espacio dentro de un cambio: se queda con el cambio
        del += o.a;
        ins += o.b;
        continue;
      }
      flushChange();
      same += o.a;
    } else {
      if (!inChange) flushSame();
      inChange = true;
      if (o.op === '-') del += o.a;
      else ins += o.b;
    }
  }
  flushChange();
  flushSame();
  // Fusiona cambios separados solo por un espacio para no fragmentar frases.
  const out = [];
  for (const b of blocks) {
    const prev = out.at(-1),
      prev2 = out.at(-2);
    if (b.type === 'change' && prev?.type === 'same' && /^\s+$/u.test(prev.text) && prev2?.type === 'change') {
      prev2.before += prev.text + b.before;
      prev2.after += prev.text + b.after;
      out.pop();
    } else out.push({...b});
  }
  return out;
}

// Texto resultante aceptando solo los cambios cuyo índice está en `accepted`.
export function applyBlocks(blocks, accepted) {
  let i = 0;
  return blocks.map((b) => (b.type === 'same' ? b.text : accepted.has(i++) ? b.after : b.before)).join('');
}

export const countChanges = (blocks) => blocks.filter((b) => b.type === 'change').length;
