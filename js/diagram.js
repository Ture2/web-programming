'use strict';

/* ==========================================================================
   Concept-card diagrams (no DOM): a card's `diagram` spec drawn as inline SVG.
     { kind: 'flow' | 'branch' | 'layers', title, desc,
       nodes: [{ id, label, note?, key?, row? }], edges: [[from, to, label?]], numbered? }
   flow and branch: boxes in columns joined by arrows (a chain; one box feeding 2–4).
   layers: a stack of bands, each one using the band below (nodes on the same `row`
   share a band). `key: true` marks the one box the card is about. `title` is the
   caption (the takeaway), `desc` says in words everything the picture shows.
   Labels and notes are plain text; `code` in backticks is set in the code face.
   Diagram.html(spec, id) returns a <figure> with a wide and a narrow drawing; CSS
   (styles.css, "Concept diagrams") shows the one that fits the card's width, so
   labels keep their size on phones. Colours come only from CSS classes.
   Diagram.validate(spec) lists what is wrong (test/card-html.test.mjs).
   ========================================================================== */

const Diagram = (() => {
  const KINDS = ['flow', 'branch', 'layers'];
  const MAX_NODES = 6;
  const FS = 14;                 // label size (px at scale 1)
  const FS_NOTE = 12.5;          // note and edge-label size
  const PAD_X = 14;
  const LINE = 18;               // line height inside a box
  const WIDE_MAX = 880;          // wider than this, only the narrow drawing is used
  const STEPS = [480, 520, 560, 600, 640, 680, 720, 760, 800, 840, 880];   // .dg-w<step> in styles.css
  const NARROW_W = 300;          // natural width of the narrow drawing

  const escText = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
  const plainText = (s) => String(s || '').replace(/`/g, '');

  /* ---- Text: width estimates (Arial and the monospace face), wrapping, code spans ---- */

  const segments = (s) => String(s).split('`').map((text, i) => ({ text, code: i % 2 === 1 })).filter((g) => g.text);
  const charW = (ch, size, code) => {
    if (code) return size * 0.61;
    if (/[A-Z]/.test(ch)) return size * 0.67;
    if (/[il.,:;'|!()[\]]/.test(ch)) return size * 0.3;
    if (/[mwMW]/.test(ch)) return size * 0.85;
    return size * 0.56;
  };
  const textW = (s, size) => segments(s).reduce((w, g) => w + [...g.text].reduce((a, ch) => a + charW(ch, size, g.code), 0), 0);

  /* Wraps at spaces outside `code` spans so no line is wider than max px. */
  function wrap(s, size, max) {
    if (!s) return [];
    const tokens = [];
    let tok = '';
    let inCode = false;
    for (const ch of String(s)) {
      if (ch === '`') inCode = !inCode;
      if (!inCode && /\s/.test(ch)) { if (tok) tokens.push(tok); tok = ''; } else tok += ch;
    }
    if (tok) tokens.push(tok);
    const lines = [];
    let cur = '';
    tokens.forEach((tok) => {
      const next = cur ? `${cur} ${tok}` : tok;
      if (cur && textW(next, size) > max) { lines.push(cur); cur = tok; } else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  const tspans = (s) => segments(s).map((g) => (g.code ? `<tspan class="dg-code">${escText(g.text)}</tspan>` : escText(g.text))).join('');

  /* ---- Validation ---- */

  function validate(d) {
    const errs = [];
    if (!d || typeof d !== 'object') return ['diagram is not an object'];
    if (!KINDS.includes(d.kind)) errs.push(`unknown kind "${d.kind}" (use ${KINDS.join(', ')})`);
    if (!d.title || !String(d.title).trim()) errs.push('missing title (the caption: the takeaway)');
    if (!d.desc || !String(d.desc).trim()) errs.push('missing desc (everything the picture shows, in words)');
    const nodes = Array.isArray(d.nodes) ? d.nodes : [];
    if (nodes.length < 2) errs.push('fewer than 2 nodes');
    if (nodes.length > MAX_NODES) errs.push(`${nodes.length} nodes (at most ${MAX_NODES})`);
    const ids = new Set();
    nodes.forEach((n, i) => {
      if (!n || !n.id) errs.push(`node ${i} has no id`);
      else if (ids.has(n.id)) errs.push(`duplicate node id "${n.id}"`);
      else ids.add(n.id);
      if (!n || !n.label) errs.push(`node ${n && n.id} has no label`);
      else if (words(plainText(n.label)).length > 3) errs.push(`label "${n.label}" is longer than 3 words`);
      if (n && n.note && words(plainText(n.note)).length > 5) errs.push(`note "${n.note}" is longer than 5 words`);
    });
    if (nodes.filter((n) => n && n.key).length > 1) errs.push('more than one key node (one emphasis only)');
    const edges = Array.isArray(d.edges) ? d.edges : [];
    if (d.kind !== 'layers' && !edges.length) errs.push('no edges');
    if (d.kind === 'layers' && edges.length) errs.push('layers take no edges (the stack is the relationship)');
    const into = {};
    edges.forEach((e, i) => {
      if (!Array.isArray(e) || e.length < 2) { errs.push(`edge ${i} is not [from, to, label?]`); return; }
      const [a, b, label] = e;
      if (!ids.has(a)) errs.push(`edge ${i} starts at unknown node "${a}"`);
      if (!ids.has(b)) errs.push(`edge ${i} ends at unknown node "${b}"`);
      if (a === b) errs.push(`edge ${i} is a loop`);
      if (label && words(plainText(label)).length > 3) errs.push(`edge label "${label}" is longer than 3 words`);
      if (label) { into[b] = (into[b] || 0) + 1; if (into[b] > 1) errs.push(`node "${b}" has more than one labelled arrow into it`); }
    });
    if (d.kind !== 'layers' && !errs.length) {
      const lv = levelsOf(nodes, edges);
      if (!lv) errs.push('the arrows form a cycle');
      else {
        const perLevel = {};
        Object.values(lv).forEach((l) => { perLevel[l] = (perLevel[l] || 0) + 1; });
        if (Object.values(perLevel).some((n) => n > 4)) errs.push('more than 4 boxes in one column');
        if (d.kind === 'flow' && Object.values(perLevel).some((n) => n > 1)) errs.push('a flow is a single chain (use branch for one box feeding several)');
      }
    }
    return errs;
  }

  /* Column of each node: the longest path from a node with no arrow into it. null on a cycle. */
  function levelsOf(nodes, edges) {
    const lv = {};
    nodes.forEach((n) => { lv[n.id] = 0; });
    for (let pass = 0; pass <= nodes.length; pass++) {
      let changed = false;
      edges.forEach(([a, b]) => { if (lv[b] < lv[a] + 1) { lv[b] = lv[a] + 1; changed = true; } });
      if (!changed) return lv;
    }
    return null;
  }

  /* ---- Boxes ---- */

  /* A box's lines: [{ text, cls }] — edge label (narrow only), label, note. */
  function boxLines(n, inLabel, max) {
    const out = [];
    if (inLabel) wrap(inLabel, FS_NOTE, max).forEach((t) => out.push({ text: t, cls: 'dg-elabel', size: FS_NOTE }));
    wrap(n.label, FS, max).forEach((t) => out.push({ text: t, cls: 'dg-label', size: FS }));
    if (n.note) wrap(n.note, FS_NOTE, max).forEach((t) => out.push({ text: t, cls: 'dg-note', size: FS_NOTE }));
    return out;
  }
  const boxH = (lines) => 14 + lines.length * LINE;

  function boxSvg(n, b, num) {
    const top = b.y + (b.h - b.lines.length * LINE) / 2 + 13;
    const text = b.lines.map((l, i) => `<text class="${l.cls}" x="${b.x + b.w / 2}" y="${top + i * LINE}" text-anchor="middle">${tspans(l.text)}</text>`).join('');
    const badge = num ? `<text class="dg-num" x="${b.x + 8}" y="${b.y + 15}">${num}</text>` : '';
    return `<g class="dg-node${n.key ? ' dg-key' : ''}"><rect class="dg-box" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2"/>${badge}${text}</g>`;
  }

  /* An arrow along points [[x, y], …] with a solid head at the last point. */
  function arrowSvg(pts) {
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
    const [x1, y1] = pts[pts.length - 2];
    const [x2, y2] = pts[pts.length - 1];
    const a = Math.atan2(y2 - y1, x2 - x1);
    const L = 8;
    const W = 4.5;
    const bx = x2 - L * Math.cos(a);
    const by = y2 - L * Math.sin(a);
    const p1 = `${(bx + W * Math.sin(a)).toFixed(1)} ${(by - W * Math.cos(a)).toFixed(1)}`;
    const p2 = `${(bx - W * Math.sin(a)).toFixed(1)} ${(by + W * Math.cos(a)).toFixed(1)}`;
    const line = pts.slice(0, -1).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + `L${bx.toFixed(1)} ${by.toFixed(1)}`;
    return `<path class="dg-edge" d="${pts.length > 1 ? line : d}"/><path class="dg-head" d="M${x2} ${y2}L${p1}L${p2}Z"/>`;
  }

  /* ---- flow / branch: columns left to right (wide), rows top to bottom (narrow) ---- */

  function columns(d) {
    const lv = levelsOf(d.nodes, d.edges);
    const cols = [];
    d.nodes.forEach((n) => { (cols[lv[n.id]] = cols[lv[n.id]] || []).push(n); });
    return cols;
  }
  const edgeLabelInto = (d, id) => (d.edges.find(([, b, l]) => b === id && l) || [])[2] || '';
  const stepNum = (d, n) => (d.numbered ? d.nodes.indexOf(n) + 1 : 0);

  function wide(d) {
    const cols = columns(d);
    const boxes = {};
    const colW = cols.map((col) => Math.max(...col.map((n) => Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0))) + 2 * PAD_X);
    cols.forEach((col, c) => col.forEach((n) => {
      const lines = boxLines(n, '', 220);
      boxes[n.id] = { w: Math.max(84, Math.min(240, colW[c])), lines, h: boxH(lines) };
    }));
    const rowH = Math.max(...Object.values(boxes).map((b) => b.h));
    Object.values(boxes).forEach((b) => { b.h = rowH; });
    const GAP_Y = 22;
    const height = Math.max(...cols.map((col) => col.length * rowH + (col.length - 1) * GAP_Y));
    // Gap before each column: room for the longest edge label that enters it.
    const gaps = cols.map((col) => Math.max(44, ...col.map((n) => textW(edgeLabelInto(d, n.id), FS_NOTE) + 34)));
    let x = 2;
    cols.forEach((col, c) => {
      if (c) x += gaps[c];
      const w = Math.max(...col.map((n) => boxes[n.id].w));
      const h = col.length * rowH + (col.length - 1) * GAP_Y;
      col.forEach((n, i) => { Object.assign(boxes[n.id], { x: x + (w - boxes[n.id].w) / 2, y: 2 + (height - h) / 2 + i * (rowH + GAP_Y) }); });
      x += w;
    });
    const W = x + 2;
    const H = height + 4;
    const arrows = d.edges.map(([a, b, label]) => {
      const s = boxes[a];
      const t = boxes[b];
      const sx = s.x + s.w;
      const sy = s.y + s.h / 2;
      const tx = t.x;
      const ty = t.y + t.h / 2;
      const pts = Math.abs(sy - ty) < 1 ? [[sx, sy], [tx, ty]] : [[sx, sy], [sx + 16, sy], [sx + 16, ty], [tx, ty]];
      const lx = (pts[pts.length - 2][0] + tx) / 2;
      const lab = label ? `<text class="dg-elabel" x="${lx}" y="${ty - 7}" text-anchor="middle">${tspans(label)}</text>` : '';
      return arrowSvg(pts) + lab;
    }).join('');
    const nodes = d.nodes.map((n) => boxSvg(n, boxes[n.id], stepNum(d, n))).join('');
    return { W, H, body: arrows + nodes };
  }

  function narrow(d) {
    const cols = columns(d);
    const GAP_X = 10;
    const GAP_Y = 30;
    const boxes = {};
    let y = 2;
    cols.forEach((row) => {
      const max = (NARROW_W - 4 - (row.length - 1) * GAP_X) / row.length;
      const ws = row.map((n) => Math.min(max, Math.max(84, Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0, textW(edgeLabelInto(d, n.id), FS_NOTE)) + 2 * PAD_X)));
      const total = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * GAP_X;
      let x = (NARROW_W - total) / 2;
      const lines = row.map((n, i) => boxLines(n, edgeLabelInto(d, n.id), ws[i] - 2 * 8));
      const h = Math.max(...lines.map(boxH));
      row.forEach((n, i) => { boxes[n.id] = { x, y, w: ws[i], h, lines: lines[i] }; x += ws[i] + GAP_X; });
      y += h + GAP_Y;
    });
    const H = y - GAP_Y + 2;
    const arrows = d.edges.map(([a, b]) => {
      const s = boxes[a];
      const t = boxes[b];
      const sx = s.x + s.w / 2;
      const sy = s.y + s.h;
      const tx = t.x + t.w / 2;
      const ty = t.y;
      const pts = Math.abs(sx - tx) < 1 ? [[sx, sy], [tx, ty]] : [[sx, sy], [sx, sy + 12], [tx, sy + 12], [tx, ty]];
      return arrowSvg(pts);
    }).join('');
    const nodes = d.nodes.map((n) => boxSvg(n, boxes[n.id], stepNum(d, n))).join('');
    return { W: NARROW_W, H, body: arrows + nodes };
  }

  /* ---- layers: bands top to bottom; nodes with the same `row` share a band ---- */

  function layers(d, width) {
    const rows = [];
    d.nodes.forEach((n, i) => { const r = n.row === undefined ? i : n.row; (rows[r] = rows[r] || []).push(n); });
    const bands = rows.filter(Boolean);
    const GAP = 8;
    const boxes = {};
    let y = 2;
    bands.forEach((band) => {
      const w = (width - 4 - (band.length - 1) * GAP) / band.length;
      const lines = band.map((n) => boxLines(n, '', w - 16));
      const h = Math.max(...lines.map(boxH));
      band.forEach((n, i) => { boxes[n.id] = { x: 2 + i * (w + GAP), y, w, h, lines: lines[i] }; });
      y += h + GAP;
    });
    return { W: width, H: y - GAP + 2, body: d.nodes.map((n) => boxSvg(n, boxes[n.id], 0)).join('') };
  }

  function layersWideWidth(d) {
    const rows = {};
    d.nodes.forEach((n, i) => { const r = n.row === undefined ? i : n.row; rows[r] = (rows[r] || 0) + Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0) + 2 * PAD_X + 8; });
    return Math.min(WIDE_MAX, Math.max(440, ...Object.values(rows)));
  }

  /* ---- Output ---- */

  function svg(d, layout, id, cls) {
    const { W, H } = layout;
    // Coordinates to one decimal (attribute values only: labels keep their own numbers).
    const body = layout.body.replace(/="([^"]*)"/g, (m, v) => `="${v.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10))}"`);
    return `<svg class="dg-svg ${cls}" width="${Math.ceil(W)}" height="${Math.ceil(H)}" viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(H)}" role="img" aria-labelledby="${id}-t ${id}-d">`
      + `<title id="${id}-t">${escText(plainText(d.title))}</title><desc id="${id}-d">${escText(plainText(d.desc))}</desc>${body}</svg>`;
  }

  /* `caption` renders the title as HTML (the card's md()); defaults to escaped text. */
  function html(d, id, caption) {
    const errs = validate(d);
    if (errs.length) {
      if (typeof console !== 'undefined') console.warn(`[data] diagram ${id}: ${errs.join('; ')}`);
      return '';
    }
    const isLayers = d.kind === 'layers';
    const w = isLayers ? layers(d, layersWideWidth(d)) : wide(d);
    const n = isLayers ? layers(d, NARROW_W) : narrow(d);
    // The wide drawing shows only where the figure is at least as wide as it (styles.css
    // switches on .dg-w<step>), so it is never scaled down; a drawing too wide for any card
    // is dropped and the narrow one serves every width.
    const step = STEPS.find((x) => w.W <= x);
    const cap = caption ? caption(d.title) : escText(d.title);
    return `<figure class="dg ${step ? `dg-w${step}` : 'dg-one'}">${step ? svg(d, w, `${id}-w`, 'dg-wide') : ''}${svg(d, n, `${id}-n`, 'dg-narrow')}<figcaption>${cap}</figcaption></figure>`;
  }

  /* The words of a diagram, for site search. */
  const text = (d) => (d ? [d.title, d.desc, ...(d.nodes || []).flatMap((n) => [n.label, n.note]), ...(d.edges || []).map((e) => e[2])].filter(Boolean).map(plainText).join(' · ') : '');

  return { html, validate, text, KINDS, MAX_NODES, _wrap: wrap, _textW: textW };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Diagram;
