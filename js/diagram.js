'use strict';

/* ==========================================================================
   Concept-card diagrams (no DOM): a card's `diagram` spec drawn as inline SVG.
     { kind: 'flow' | 'branch' | 'layers' | 'cycle' | 'sequence' | 'tree', title, desc,
       nodes: [{ id, label, note?, key?, row? }], edges: [[from, to, label?]], numbered? }
   flow and branch: boxes in columns joined by arrows (a chain; one box feeding 2–4;
   several boxes may feed one when those arrows carry no label).
   layers: a stack of bands, each one using the band below (nodes on the same `row`
   share a band).
   cycle: 3–5 boxes in a loop; edges go round in node order, the last back to the first.
   sequence: nodes are 2–3 lanes (client, server…); edges are up to 8 ordered messages
   [from, to, label], read top to bottom; [lane, lane, label] is an action on one lane.
   tree: one root and up to 8 more nodes, at most 3 levels below it; edges are
   [parent, child], unlabelled.
   `key: true` marks the one box the card is about. `title` is the
   caption (the takeaway), `desc` says in words everything the picture shows.
   Labels and notes are plain text; `code` in backticks is set in the code face.
   Diagram.html(spec, id) returns a <figure> with a wide and a narrow drawing; CSS
   (styles.css, "Concept diagrams") shows the one that fits the card's width, so
   labels keep their size on phones. Colours come only from CSS classes.
   Diagram.validate(spec) lists what is wrong (test/card-html.test.mjs).
   ========================================================================== */

const Diagram = (() => {
  const KINDS = ['flow', 'branch', 'layers', 'cycle', 'sequence', 'tree'];
  const MAX_NODES = 6;
  const LIMITS = {                // [fewest nodes, most nodes] per kind
    flow: [2, 6], branch: [2, 6], layers: [2, 6], cycle: [3, 5], sequence: [2, 3], tree: [2, 9],
  };
  const MAX_MESSAGES = 8;        // sequence
  const MAX_DEPTH = 3;           // tree: levels below the root
  const FS = 14;                 // label size (px at scale 1)
  const FS_NOTE = 12.5;          // note and edge-label size
  const PAD_X = 14;
  const LINE = 18;               // line height inside a box
  const WIDE_MAX = 880;          // wider than this, only the narrow drawing is used
  const STEPS = [480, 520, 560, 600, 640, 680, 720, 760, 800, 840, 880];   // .dg-w<step> in styles.css
  const NARROW_W = 300;          // natural width of the narrow drawing
  const NUM_PAD = 14;            // room for a step number in a box (numbered: true)

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
    const [least, most] = LIMITS[d.kind] || [2, MAX_NODES];
    const what = d.kind === 'sequence' ? 'lanes' : 'nodes';
    if (nodes.length < least) errs.push(`${nodes.length} ${what} (at least ${least})`);
    if (nodes.length > most) errs.push(`${nodes.length} ${what} (at most ${most})`);
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
    const isSeq = d.kind === 'sequence';
    const maxLabel = isSeq ? 6 : 3;
    const into = {};
    edges.forEach((e, i) => {
      if (!Array.isArray(e) || e.length < 2) { errs.push(`edge ${i} is not [from, to, label?]`); return; }
      const [a, b, label] = e;
      if (!ids.has(a)) errs.push(`edge ${i} starts at unknown node "${a}"`);
      if (!ids.has(b)) errs.push(`edge ${i} ends at unknown node "${b}"`);
      if (a === b && !isSeq) errs.push(`edge ${i} is a loop`);
      if (isSeq && !label) errs.push(`message ${i} has no label`);
      if (label && words(plainText(label)).length > maxLabel) errs.push(`edge label "${label}" is longer than ${maxLabel} words`);
      if (label && d.kind === 'tree') errs.push('tree edges take no label');
      if (label && !isSeq && d.kind !== 'cycle') { into[b] = (into[b] || 0) + 1; if (into[b] > 1) errs.push(`node "${b}" has more than one labelled arrow into it`); }
    });
    if (isSeq && edges.length > MAX_MESSAGES) errs.push(`${edges.length} messages (at most ${MAX_MESSAGES})`);
    if (d.kind === 'cycle' && !errs.length) {
      const ring = nodes.every((n, i) => edges.some(([a, b]) => a === n.id && b === nodes[(i + 1) % nodes.length].id));
      if (!ring || edges.length !== nodes.length) errs.push('a cycle needs exactly one edge from each node to the next, the last back to the first');
    }
    if (d.kind === 'tree' && !errs.length) {
      const parent = {};
      edges.forEach(([a, b]) => { if (parent[b]) errs.push(`node "${b}" has two parents`); parent[b] = a; });
      const roots = nodes.filter((n) => !parent[n.id]);
      if (roots.length !== 1) errs.push(`a tree needs exactly one root (found ${roots.length})`);
      else {
        const depth = (id, seen = 0) => (parent[id] && seen <= nodes.length ? 1 + depth(parent[id], seen + 1) : 0);
        if (nodes.some((n) => depth(n.id) > nodes.length)) errs.push('the tree edges form a loop');
        else if (nodes.some((n) => depth(n.id) > MAX_DEPTH)) errs.push(`more than ${MAX_DEPTH} levels below the root`);
      }
    }
    if ((d.kind === 'flow' || d.kind === 'branch') && !errs.length) {
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
    // A step number sits in the top-left corner: centre the text in the rest of the box.
    const cx = num ? b.x + NUM_PAD + (b.w - NUM_PAD) / 2 : b.x + b.w / 2;
    const text = b.lines.map((l, i) => `<text class="${l.cls}" x="${cx}" y="${top + i * LINE}" text-anchor="middle">${tspans(l.text)}</text>`).join('');
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
    const colW = cols.map((col) => Math.max(...col.map((n) => Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0))) + 2 * PAD_X + (d.numbered ? NUM_PAD : 0));
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
      const ws = row.map((n) => Math.min(max, Math.max(84, Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0, textW(edgeLabelInto(d, n.id), FS_NOTE)) + 2 * PAD_X + (d.numbered ? NUM_PAD : 0))));
      const total = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * GAP_X;
      let x = (NARROW_W - total) / 2;
      const lines = row.map((n, i) => boxLines(n, edgeLabelInto(d, n.id), ws[i] - 2 * 8 - (d.numbered ? NUM_PAD : 0)));
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

  /* ---- cycle: a row (wide) or column (narrow) of boxes, the last arrow returning ---- */

  function cycleWide(d) {
    const boxes = {};
    d.nodes.forEach((n) => {
      const lines = boxLines(n, '', 200);
      boxes[n.id] = { w: Math.max(84, Math.min(220, Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0) + 2 * PAD_X + (d.numbered ? NUM_PAD : 0))), lines, h: boxH(lines) };
    });
    const rowH = Math.max(...Object.values(boxes).map((b) => b.h));
    const label = (i) => (d.edges.find(([a]) => a === d.nodes[i].id) || [])[2] || '';
    let x = 2;
    d.nodes.forEach((n, i) => {
      if (i) x += Math.max(44, textW(label(i - 1), FS_NOTE) + 34);
      Object.assign(boxes[n.id], { x, y: 2, h: rowH });
      x += boxes[n.id].w;
    });
    const first = boxes[d.nodes[0].id];
    const last = boxes[d.nodes[d.nodes.length - 1].id];
    const back = label(d.nodes.length - 1);
    const yb = 2 + rowH + 22;
    let body = d.nodes.slice(0, -1).map((n, i) => {
      const s = boxes[n.id];
      const t = boxes[d.nodes[i + 1].id];
      const pts = [[s.x + s.w, 2 + rowH / 2], [t.x, 2 + rowH / 2]];
      const lab = label(i) ? `<text class="dg-elabel" x="${(s.x + s.w + t.x) / 2}" y="${2 + rowH / 2 - 7}" text-anchor="middle">${tspans(label(i))}</text>` : '';
      return arrowSvg(pts) + lab;
    }).join('');
    const lx = last.x + last.w / 2;
    const fx = first.x + first.w / 2;
    body += arrowSvg([[lx, 2 + rowH], [lx, yb], [fx, yb], [fx, 2 + rowH]]);
    if (back) body += `<text class="dg-elabel" x="${(lx + fx) / 2}" y="${yb + 16}" text-anchor="middle">${tspans(back)}</text>`;
    body += d.nodes.map((n) => boxSvg(n, boxes[n.id], stepNum(d, n))).join('');
    return { W: x + 2, H: yb + (back ? 22 : 4), body };
  }

  function cycleNarrow(d) {
    const GAP_Y = 30;
    const w = NARROW_W - 44;
    const boxes = {};
    let y = 2;
    d.nodes.forEach((n) => {
      const lines = boxLines(n, edgeLabelInto(d, n.id), w - 16 - (d.numbered ? NUM_PAD : 0));
      boxes[n.id] = { x: 2, y, w, h: boxH(lines), lines };
      y += boxH(lines) + GAP_Y;
    });
    const first = boxes[d.nodes[0].id];
    const last = boxes[d.nodes[d.nodes.length - 1].id];
    const cx = 2 + w / 2;
    let body = d.nodes.slice(0, -1).map((n, i) => arrowSvg([[cx, boxes[n.id].y + boxes[n.id].h], [cx, boxes[d.nodes[i + 1].id].y]])).join('');
    const rx = 2 + w + 22;
    body += arrowSvg([[2 + w, last.y + last.h / 2], [rx, last.y + last.h / 2], [rx, first.y + first.h / 2], [2 + w, first.y + first.h / 2]]);
    body += d.nodes.map((n) => boxSvg(n, boxes[n.id], stepNum(d, n))).join('');
    return { W: NARROW_W, H: y - GAP_Y + 2, body };
  }

  /* ---- sequence: lanes with lifelines; messages top to bottom ---- */

  function sequence(d, colW) {
    const lanes = d.nodes;
    const xs = {};
    lanes.forEach((n, i) => { xs[n.id] = colW / 2 + i * colW; });
    const heads = {};
    lanes.forEach((n) => {
      const lines = boxLines(n, '', colW - 32);
      const w = Math.min(colW - 16, Math.max(84, Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0) + 2 * PAD_X));
      heads[n.id] = { x: xs[n.id] - w / 2, y: 2, w, h: boxH(lines), lines };
    });
    const headH = Math.max(...Object.values(heads).map((b) => b.h));
    Object.values(heads).forEach((b) => { b.h = headH; });
    let y = 2 + headH + 12;
    const parts = [];
    d.edges.forEach(([a, b, label], i) => {
      const text = d.numbered ? `${i + 1}. ${label}` : label;
      if (a === b) {
        // An action on one lane: a small box on its lifeline.
        const lines = wrap(text, FS_NOTE, colW - 40);
        const w = Math.min(colW - 20, Math.max(...lines.map((l) => textW(l, FS_NOTE))) + 20);
        const h = lines.length * 15 + 10;
        parts.push(`<rect class="dg-act" x="${xs[a] - w / 2}" y="${y}" width="${w}" height="${h}" rx="2"/>`
          + lines.map((l, k) => `<text class="dg-elabel" x="${xs[a]}" y="${y + 17 + k * 15}" text-anchor="middle">${tspans(l)}</text>`).join(''));
        y += h + 12;
        return;
      }
      const x1 = xs[a];
      const x2 = xs[b];
      const lines = wrap(text, FS_NOTE, Math.abs(x2 - x1) - 16);
      const ly = y + lines.length * 15;
      // A panel-coloured backing under each label hides another lane's lifeline behind it
      // (lifelines are drawn first). A rectangle, not a text halo: halos bloat printed PDFs.
      const cx = (x1 + x2) / 2;
      parts.push(lines.map((l, k) => {
        const w = textW(l, FS_NOTE) + 8;
        return `<rect class="dg-lbg" x="${cx - w / 2}" y="${y + k * 15}" width="${w}" height="15"/>`
          + `<text class="dg-elabel" x="${cx}" y="${y + 11 + k * 15}" text-anchor="middle">${tspans(l)}</text>`;
      }).join('')
        + arrowSvg([[x1, ly + 4], [x2 + (x2 > x1 ? -1 : 1), ly + 4]]));
      y = ly + 20;
    });
    const H = y + 2;
    const lifelines = lanes.map((n) => `<path class="dg-life" d="M${xs[n.id]} ${2 + headH}V${H - 2}"/>`).join('');
    const headSvg = lanes.map((n) => boxSvg(n, heads[n.id], 0)).join('');
    return { W: colW * lanes.length, H, body: lifelines + parts.join('') + headSvg };
  }

  function sequenceWideCol(d) {
    const pairs = d.edges.filter(([a, b]) => a !== b).map(([a, b, l]) => {
      const gap = Math.abs(d.nodes.findIndex((n) => n.id === a) - d.nodes.findIndex((n) => n.id === b)) || 1;
      return (textW(d.numbered ? `8. ${l}` : l, FS_NOTE) + 40) / gap;
    });
    const heads = d.nodes.map((n) => Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0) + 2 * PAD_X + 24);
    return Math.max(170, Math.min(300, Math.max(...pairs, ...heads)));
  }

  /* ---- tree: top-down (wide); indented rows like a file explorer (narrow) ---- */

  function treeShape(d) {
    const kids = {};
    const parent = {};
    d.edges.forEach(([a, b]) => { (kids[a] = kids[a] || []).push(b); parent[b] = a; });
    const root = d.nodes.find((n) => !parent[n.id]).id;
    const byId = Object.fromEntries(d.nodes.map((n) => [n.id, n]));
    return { kids, root, byId };
  }

  function treeWide(d) {
    const { kids, root, byId } = treeShape(d);
    const GAP_X = 14;
    const GAP_Y = 34;
    const boxes = {};
    d.nodes.forEach((n) => {
      const lines = boxLines(n, '', 190);
      boxes[n.id] = { w: Math.max(84, Math.min(210, Math.max(textW(n.label, FS), n.note ? textW(n.note, FS_NOTE) : 0) + 2 * PAD_X)), lines, h: boxH(lines) };
    });
    const rowH = Math.max(...Object.values(boxes).map((b) => b.h));
    const span = (id) => {
      const c = kids[id] || [];
      const inner = c.reduce((s, k) => s + span(k), 0) + Math.max(0, c.length - 1) * GAP_X;
      return Math.max(boxes[id].w, inner);
    };
    let maxDepth = 0;
    const place = (id, x0, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      const s = span(id);
      Object.assign(boxes[id], { x: x0 + (s - boxes[id].w) / 2, y: 2 + depth * (rowH + GAP_Y), h: rowH });
      const c = kids[id] || [];
      const inner = c.reduce((t, k) => t + span(k), 0) + Math.max(0, c.length - 1) * GAP_X;
      let x = x0 + (s - inner) / 2;
      c.forEach((k) => { place(k, x, depth + 1); x += span(k) + GAP_X; });
    };
    place(root, 2, 0);
    const lines = d.edges.map(([a, b]) => {
      const p = boxes[a];
      const c = boxes[b];
      const px = p.x + p.w / 2;
      const cx = c.x + c.w / 2;
      const my = p.y + p.h + GAP_Y / 2;
      return `<path class="dg-edge" d="M${px} ${p.y + p.h}V${my}H${cx}V${c.y}"/>`;
    }).join('');
    return { W: span(root) + 4, H: 2 + (maxDepth + 1) * rowH + maxDepth * GAP_Y + 2, body: lines + d.nodes.map((n) => boxSvg(byId[n.id], boxes[n.id], 0)).join('') };
  }

  function treeNarrow(d) {
    const { kids, root, byId } = treeShape(d);
    const INDENT = 22;
    const GAP_Y = 8;
    const boxes = {};
    const order = [];
    const walk = (id, depth) => { order.push([id, depth]); (kids[id] || []).forEach((k) => walk(k, depth + 1)); };
    walk(root, 0);
    let y = 2;
    order.forEach(([id, depth]) => {
      const x = 2 + depth * INDENT;
      const w = NARROW_W - 2 - x;
      const lines = boxLines(byId[id], '', w - 16);
      boxes[id] = { x, y, w, h: boxH(lines), lines };
      y += boxH(lines) + GAP_Y;
    });
    const lines = d.edges.map(([a, b]) => {
      const p = boxes[a];
      const c = boxes[b];
      const lx = p.x + 10;
      return `<path class="dg-edge" d="M${lx} ${p.y + p.h}V${c.y + c.h / 2}H${c.x}"/>`;
    }).join('');
    return { W: NARROW_W, H: y - GAP_Y + 2, body: lines + order.map(([id]) => boxSvg(byId[id], boxes[id], 0)).join('') };
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
    const DRAW = {
      layers: [() => layers(d, layersWideWidth(d)), () => layers(d, NARROW_W)],
      cycle: [() => cycleWide(d), () => cycleNarrow(d)],
      sequence: [() => sequence(d, sequenceWideCol(d)), () => sequence(d, NARROW_W / d.nodes.length)],
      tree: [() => treeWide(d), () => treeNarrow(d)],
    }[d.kind] || [() => wide(d), () => narrow(d)];
    const w = DRAW[0]();
    const n = DRAW[1]();
    // The wide drawing shows only where the figure is at least as wide as it (styles.css
    // switches on .dg-w<step>), so it is never scaled down; a drawing too wide for any card
    // is dropped and the narrow one serves every width.
    const step = STEPS.find((x) => w.W <= x);
    const cap = caption ? caption(d.title) : escText(d.title);
    return `<figure class="dg ${step ? `dg-w${step}` : 'dg-one'}">${step ? svg(d, w, `${id}-w`, 'dg-wide') : ''}${svg(d, n, `${id}-n`, 'dg-narrow')}<figcaption>${cap}</figcaption></figure>`;
  }

  return { html, validate, KINDS, MAX_NODES, _wrap: wrap, _textW: textW };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Diagram;
