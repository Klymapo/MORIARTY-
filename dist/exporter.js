// MORIARTY — exportar el manuscrito a DOCX, EPUB y PDF (por impresión). Sin dependencias.
// Formato: el marcado ligero de markup.js (cursiva, negrita, subrayado, sangría, centrado, salto de página, imágenes, letra capital).
import {blocks, toHtml} from './markup.js';

const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

// ---- ZIP mínimo (método "stored", sin compresión) ----
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (bytes) => {
    let c = -1;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();
export function zip(files) {
  // files: [{name, data: string|Uint8Array}] — el orden se respeta (EPUB exige mimetype primero).
  const enc = new TextEncoder();
  const parts = [],
    central = [];
  let offset = 0;
  const le16 = (n) => [n & 255, (n >> 8) & 255];
  const le32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = CRC(data);
    const head = new Uint8Array([
      ...le32(0x04034b50), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(dosTime), ...le16(dosDate),
      ...le32(crc), ...le32(data.length), ...le32(data.length), ...le16(name.length), ...le16(0),
    ]);
    parts.push(head, name, data);
    central.push(
      new Uint8Array([
        ...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(dosTime), ...le16(dosDate),
        ...le32(crc), ...le32(data.length), ...le32(data.length), ...le16(name.length), ...le16(0), ...le16(0),
        ...le16(0), ...le16(0), ...le32(0), ...le32(offset),
      ]),
      name,
    );
    offset += head.length + name.length + data.length;
  }
  const cdStart = offset;
  let cdLen = 0;
  for (const c of central) cdLen += c.length;
  const end = new Uint8Array([
    ...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(files.length), ...le16(files.length), ...le32(cdLen), ...le32(cdStart), ...le16(0),
  ]);
  return new Blob([...parts, ...central, end], {type: 'application/zip'});
}

// ---- Texto con *cursivas* → segmentos ----
export function segments(text) {
  const out = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0,
    m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({t: text.slice(last, m.index)});
    out.push({t: m[1], i: true});
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({t: text.slice(last)});
  return out;
}
// `only` (ID de capítulo) limita la exportación a ese capítulo.
const liveChapters = (p, only) => p.chapters.filter((c) => !c.trashed && (!only || c.id === only));
const assetOf = (p, src) => (src.startsWith('asset:') ? p.assets?.[src.slice(6)] : null);
const dataUrlParts = (d) => d.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
const extOf = (mime) => ({'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg'}[mime] || 'img');

// ---- DOCX ----
export function docx(p, {author = '', only = ''} = {}) {
  const dropCap = p.style?.dropCap !== false;
  const run = (seg) => {
    const pr = [seg.b ? '<w:b/>' : '', seg.i ? '<w:i/>' : '', seg.u ? '<w:u w:val="single"/>' : ''].join('');
    return seg.t
      .split('\n')
      .map((t) => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`)
      .join('<w:r><w:br/></w:r>');
  };
  const para = (segs, style, extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>${segs.map(run).join('')}</w:p>`;
  const media = [];
  const image = (src, alt) => {
    const a = assetOf(p, src);
    const parts = a && dataUrlParts(a.data);
    if (!parts) return para([{t: `[imagen: ${alt || src}]`}], 'Separator');
    const id = media.length + 1;
    media.push({name: `image${id}.${extOf(parts[1])}`, data: Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0)), mime: parts[1]});
    const cx = 5400000, cy = 3600000; // ~15 × 10 cm; Word respeta la proporción al abrir si se ajusta a mano
    return `<w:p><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagen ${id}" descr="${esc(alt)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Imagen ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rImg${id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>${alt ? para([{t: alt, i: true}], 'Separator') : ''}`;
  };
  const body = [];
  body.push(para([{t: p.title}], 'Title'));
  if (author) body.push(para([{t: author}], 'Subtitle'));
  liveChapters(p, only).forEach((c) => {
    body.push(`<w:p><w:pPr><w:pageBreakBefore/><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">${esc(c.title)}</w:t></w:r></w:p>`);
    let first = dropCap;
    c.scenes.forEach((s, j) => {
      if (c.scenes.length > 1) body.push(para([{t: s.title}], 'Heading2'));
      else if (j > 0) body.push(para([{t: '* * *'}], 'Separator'));
      for (const b of blocks(s.text)) {
        if (b.type === 'break') body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        else if (b.type === 'sep') body.push(para([{t: '* * *'}], 'Separator'));
        else if (b.type === 'image') body.push(image(b.src, b.alt));
        else if (b.type === 'quote') body.push(para(b.inlines, 'Quote'));
        else if (b.type === 'center') body.push(para(b.inlines, 'Separator'));
        else if (first) {
          // Letra capital: la primera letra en un run grande (Word muestra una capital simple sin marco).
          first = false;
          const segs = structuredClone(b.inlines);
          const head = segs[0];
          const ch = head.t.slice(0, 1);
          head.t = head.t.slice(1);
          body.push(`<w:p><w:pPr><w:ind w:firstLine="0"/></w:pPr><w:r><w:rPr><w:sz w:val="56"/></w:rPr><w:t xml:space="preserve">${esc(ch)}</w:t></w:r>${segs.map(run).join('')}</w:p>`);
        } else body.push(para(b.inlines));
      }
    });
  });
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="567"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="4000" w:after="400"/></w:pPr><w:rPr><w:sz w:val="56"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr><w:rPr><w:sz w:val="28"/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="2400" w:after="720"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:ind w:firstLine="0"/><w:spacing w:before="480" w:after="240"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:i/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Separator"><w:name w:val="Separator"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="240" w:after="240"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="1134" w:right="567" w:firstLine="0"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`;
  const files = [
    {name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="webp" ContentType="image/webp"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`},
    {name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`},
    {name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((m, i) => `<Relationship Id="rImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`},
    {name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(p.title)}</dc:title><dc:creator>${esc(author)}</dc:creator></cp:coreProperties>`},
    {name: 'word/styles.xml', data: styles},
    {name: 'word/document.xml', data: document},
    ...media.map((m) => ({name: 'word/media/' + m.name, data: m.data})),
  ];
  return zip(files);
}

// ---- EPUB 3 ----
export function epub(p, {author = '', lang = 'es-MX'} = {}) {
  const uidv = 'urn:uuid:' + (p.id.length >= 32 ? p.id : p.id + '-moriarty');
  const dropCap = p.style?.dropCap !== false;
  const images = [];
  const imageSrc = (src) => {
    const a = assetOf(p, src);
    const parts = a && dataUrlParts(a.data);
    if (!parts) return '';
    let im = images.find((x) => x.src === src);
    if (!im) {
      im = {src, name: `img${images.length + 1}.${extOf(parts[1])}`, mime: parts[1], data: Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0))};
      images.push(im);
    }
    return im.name;
  };
  const chapterHtml = (c) =>
    c.scenes
      .map((s, j) => {
        const head = c.scenes.length > 1 ? `<h2>${esc(s.title)}</h2>` : j ? '<p class="sep">* * *</p>' : '';
        return head + toHtml(s.text, {dropCap: dropCap && j === 0, imageSrc});
      })
      .join('');
  const page = (title, bodyHtml) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${bodyHtml}</body></html>`;
  const chapters = liveChapters(p);
  const items = chapters.map((c, i) => {
    const file = `cap${String(i + 1).padStart(3, '0')}.xhtml`;
    const body = `<section epub:type="chapter"><h1>${esc(c.title)}</h1>${chapterHtml(c)}</section>`;
    return {file, title: c.title, data: page(c.title, body)};
  });
  const cover = p.cover ? p.cover.match(/^data:(image\/[a-z+]+);base64,(.+)$/) : null;
  const coverExt = cover ? ({'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg'}[cover[1]] || 'img') : '';
  const coverBytes = cover ? Uint8Array.from(atob(cover[2]), (c) => c.charCodeAt(0)) : null;
  const manifest = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    ...(cover ? [`<item id="cover-img" href="cover.${coverExt}" media-type="${cover[1]}" properties="cover-image"/>`, `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`] : []),
    ...items.map((it, i) => `<item id="c${i}" href="${it.file}" media-type="application/xhtml+xml"/>`),
    ...images.map((im, i) => `<item id="img${i}" href="${im.name}" media-type="${im.mime}"/>`),
  ].join('');
  const spine = [...(cover ? ['<itemref idref="cover"/>'] : []), '<itemref idref="title"/>', ...items.map((_, i) => `<itemref idref="c${i}"/>`)].join('');
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${esc(uidv)}</dc:identifier><dc:title>${esc(p.title)}</dc:title><dc:creator>${esc(author)}</dc:creator><dc:language>${lang}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`;
  const nav = page('Índice', `<nav epub:type="toc"><h1>Índice</h1><ol>${items.map((it) => `<li><a href="${it.file}">${esc(it.title)}</a></li>`).join('')}</ol></nav>`);
  const css = `p.dropcap::first-letter{font-size:3.2em;float:left;line-height:.85;padding:.05em .08em 0 0}blockquote{margin:1em 2em;font-style:italic}blockquote p{text-indent:0}p.center{text-align:center;text-indent:0}.page-break{page-break-after:always;break-after:page}figure{margin:1.2em 0;text-align:center}figure img{max-width:100%;max-height:80vh}figcaption{font-style:italic;font-size:.9em;margin-top:.4em}u{text-decoration:underline}
body{font-family:Georgia,serif;line-height:1.6;margin:1em}h1{text-align:center;margin:3em 0 1.5em;font-weight:normal}h2{font-style:italic;font-weight:normal;margin:1.5em 0 .5em}p{text-indent:1.5em;margin:0;text-align:justify}p.sep{text-align:center;text-indent:0;margin:1em 0}h1+p,h2+p,.sep+p{text-indent:0}.title{text-align:center;margin-top:30vh}.title h1{margin:0 0 .3em}.title p{text-indent:0;font-style:italic}`;
  const files = [
    {name: 'mimetype', data: 'application/epub+zip'},
    {name: 'META-INF/container.xml', data: `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`},
    {name: 'OEBPS/content.opf', data: opf},
    {name: 'OEBPS/nav.xhtml', data: nav},
    {name: 'OEBPS/style.css', data: css},
    {name: 'OEBPS/title.xhtml', data: page(p.title, `<div class="title"><h1>${esc(p.title)}</h1>${author ? `<p>${esc(author)}</p>` : ''}</div>`)},
    ...(cover ? [{name: `OEBPS/cover.${coverExt}`, data: coverBytes}, {name: 'OEBPS/cover.xhtml', data: page('Portada', `<div style="text-align:center"><img src="cover.${coverExt}" alt="Portada" style="max-height:95vh"/></div>`)}] : []),
    ...items.map((it) => ({name: 'OEBPS/' + it.file, data: it.data})),
    ...images.map((im) => ({name: 'OEBPS/' + im.name, data: im.data})),
  ];
  return zip(files);
}

// ---- PDF: vista de impresión (el navegador guarda como PDF) ----
export function printHtml(p, {author = '', only = ''} = {}) {
  const dropCap = p.style?.dropCap !== false;
  const body = liveChapters(p, only)
    .map(
      (c) =>
        `<section class="chapter"><h1>${esc(c.title)}</h1>${c.scenes
          .map((s, j) => (c.scenes.length > 1 ? `<h2>${esc(s.title)}</h2>` : j ? '<p class="sep">* * *</p>' : '') + toHtml(s.text, {assets: p.assets || {}, dropCap: dropCap && j === 0}))
          .join('')}</section>`,
    )
    .join('');
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>${esc(p.title)}</title><style>
@page{size:A4;margin:2.5cm 2.2cm}body{font:12pt/1.65 Georgia,'Times New Roman',serif;color:#111;max-width:17cm;margin:0 auto;padding:1cm}
.title{text-align:center;page-break-after:always;padding-top:35vh}.title h1{font-weight:normal;font-size:28pt;margin:0 0 .3em}.title p{font-style:italic;margin:0}
.chapter{page-break-before:always}.chapter h1{font-weight:normal;font-size:20pt;text-align:center;margin:4em 0 2em}h2{font-weight:normal;font-style:italic;font-size:13pt;margin:1.8em 0 .6em}
p{margin:0;text-indent:1.5em;text-align:justify;orphans:2;widows:2}h1+p,h2+p,.sep+p,figure+p,blockquote+p,.page-break+p{text-indent:0}.sep{text-align:center;text-indent:0;margin:1em 0}
p.dropcap{text-indent:0}p.dropcap::first-letter{font-size:3.4em;float:left;line-height:.8;padding:.06em .1em 0 0}blockquote{margin:1em 2.5em;font-style:italic}blockquote p{text-indent:0}p.center{text-align:center;text-indent:0}.page-break{page-break-after:always;break-after:page;height:0}figure{margin:1.2em 0;text-align:center;page-break-inside:avoid}figure img{max-width:100%;max-height:70vh}figcaption{font-style:italic;font-size:.9em;margin-top:.4em}u{text-decoration:underline}
.hint{position:fixed;top:0;left:0;right:0;background:#182b38;color:#f6f2ea;font:14px system-ui,sans-serif;padding:10px 16px;display:flex;gap:12px;align-items:center}.hint button{font:inherit;padding:6px 12px;border-radius:6px;border:1px solid #889;background:transparent;color:inherit;cursor:pointer}@media print{.hint{display:none}body{padding:0}}
</style></head><body><div class="hint"><span>Vista de impresión. Usa <b>Imprimir → Guardar como PDF</b>.</span><button onclick="print()">Imprimir / Guardar PDF</button><button onclick="close()">Cerrar</button></div><div class="title"><h1>${esc(p.title)}</h1>${author ? `<p>${esc(author)}</p>` : ''}</div>${body}</body></html>`;
}
