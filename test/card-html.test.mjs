// Authored card content: every `html` block uses only the allowlisted tags and attributes, is
// one balanced top-level element, and every `diagram` is valid and draws well-formed SVG.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const Diagram = createRequire(import.meta.url)('../js/diagram.js');

const ctx = { DATA: { en: {} } };
ctx.window = ctx;
vm.createContext(ctx);
const DATA = new URL('../data/en/', import.meta.url);
const files = readdirSync(DATA).filter((n) => n.endsWith('.js'));
for (const f of files) vm.runInContext(readFileSync(new URL(f, DATA), 'utf8'), ctx, { filename: f });

const cards = Object.entries(ctx.DATA.en)
  .filter(([k]) => k.endsWith('_CONCEPTS'))
  .flatMap(([k, list]) => list.map((c) => ({ where: `${k}/${c.id}`, c })));

const TAGS = new Set(['p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'h3', 'strong', 'em', 'code', 'pre', 'a',
  'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td', 'figure']);
const ATTRS = { a: { href: /^#\/[\w\-/]*$/ }, th: { scope: /^(col|row)$/ }, figure: { 'data-diagram': /^$/ } };
const DIAGRAM_SLOT = '<figure data-diagram></figure>';

/* Problems in one block; [] when it is fine. */
function checkBlock(b) {
  const errs = [];
  if (typeof b !== 'string') return ['block is not a string'];
  if (b === DIAGRAM_SLOT) return [];
  const stack = [];
  let top = 0;
  const re = /<(\/?)([a-zA-Z0-9]+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*>|<|&(?!(?:lt|gt|amp|quot|#39|nbsp);)/g;
  for (let m = re.exec(b); m; m = re.exec(b)) {
    if (m[0] === '<') { errs.push(`stray "<" at ${m.index} (write &lt;)`); continue; }
    if (m[0] === '&') { errs.push(`stray "&" at ${m.index} (write &amp;)`); continue; }
    const [, close, tagRaw, attrs] = m;
    const tag = tagRaw.toLowerCase();
    if (!TAGS.has(tag)) { errs.push(`tag <${tag}> is not allowed`); continue; }
    if (tag === 'figure') { errs.push('<figure> only as the diagram slot, alone in its block'); continue; }
    if (close) {
      if (stack.pop() !== tag) errs.push(`</${tag}> does not close the open element`);
      continue;
    }
    if (!stack.length) {
      top++;
      if (m.index !== 0) errs.push('text outside the top-level element');
    }
    [...attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].forEach(([, name, value = '']) => {
      const rule = (ATTRS[tag] || {})[name];
      if (!rule) errs.push(`attribute ${name} is not allowed on <${tag}>`);
      else if (!rule.test(value)) errs.push(`${name}="${value}" is not allowed on <${tag}>`);
    });
    stack.push(tag);
  }
  if (stack.length) errs.push(`unclosed <${stack.join('>, <')}>`);
  if (top !== 1) errs.push(`${top} top-level elements (one per block)`);
  if (!/>\s*$/.test(b)) errs.push('text after the top-level element');
  return errs;
}

test('the block checker accepts good HTML and rejects bad HTML', () => {
  assert.deepEqual(checkBlock('<ul><li><strong>V8</strong>: runs <code>a &lt; b</code>.</li></ul>'), []);
  assert.deepEqual(checkBlock('<p>See <a href="#/server/runtime/promises">Promises</a>.</p>'), []);
  assert.deepEqual(checkBlock(DIAGRAM_SLOT), []);
  assert.ok(checkBlock('<p>one</p><p>two</p>').length);
  assert.ok(checkBlock('<p>open <strong>bold</p>').length);
  assert.ok(checkBlock('<div>no</div>').length);
  assert.ok(checkBlock('<p class="x">no</p>').length);
  assert.ok(checkBlock('<p><a href="https://example.com">out</a></p>').length);
  assert.ok(checkBlock('<p>a < b</p>').length);
  assert.ok(checkBlock('<p>Tom & Jerry</p>').length);
});

for (const { where, c } of cards.filter(({ c }) => c.html)) {
  test(`html of ${where} is allowlisted and balanced`, () => {
    assert.ok(Array.isArray(c.html), 'html must be an array of blocks');
    const bad = Array.from(c.html).flatMap((b, i) => checkBlock(b).map((e) => `block ${i}: ${e}`));
    if (c.html.includes(DIAGRAM_SLOT) && !c.diagram) bad.push('diagram slot without a diagram');
    assert.deepEqual(bad, []);
  });
}

for (const { where, c } of cards.filter(({ c }) => c.diagram)) {
  test(`diagram of ${where} is valid and draws`, () => {
    assert.deepEqual(Diagram.validate(c.diagram), []);
    const out = Diagram.html(c.diagram, `dg-${c.id}`);
    assert.match(out, /^<figure class="dg[^"]*">/);
    const svgs = out.match(/<svg[\s\S]*?<\/svg>/g) || [];
    assert.ok(svgs.length >= 1);
    svgs.forEach((s) => {
      assert.match(s, /role="img" aria-labelledby="[\w-]+-t [\w-]+-d"/);
      assert.doesNotMatch(s, /="[^"]*(NaN|undefined|Infinity)/, 'a bad number in an attribute');
      const opens = (s.match(/<(g|text|tspan)\b/g) || []).length;
      const closes = (s.match(/<\/(g|text|tspan)>/g) || []).length;
      assert.equal(opens, closes, 'unbalanced SVG elements');
    });
  });
}

test('Diagram.validate catches a bad spec', () => {
  const errs = Diagram.validate({ kind: 'flow', title: 't', desc: '', nodes: [{ id: 'a', label: 'A' }, { id: 'a', label: 'one two three four' }], edges: [['a', 'z']] });
  assert.ok(errs.some((e) => /desc/.test(e)));
  assert.ok(errs.some((e) => /duplicate/.test(e)));
  assert.ok(errs.some((e) => /3 words/.test(e)));
  assert.ok(errs.some((e) => /unknown node "z"/.test(e)));
});

test('Diagram draws each kind without errors', () => {
  const specs = [
    { kind: 'flow', numbered: true, title: 'f', desc: 'd', nodes: [{ id: 'a', label: 'Request' }, { id: 'b', label: 'Middleware', key: true }, { id: 'c', label: 'Response' }], edges: [['a', 'b', 'arrives'], ['b', 'c']] },
    { kind: 'branch', title: 'b', desc: 'd', nodes: [{ id: 'a', label: 'Code' }, { id: 'b', label: 'V8 engine', key: true }, { id: 'c', label: 'Browser', note: '`document`, `window`' }, { id: 'd', label: 'Node.js', note: '`fs`, `http`' }], edges: [['a', 'b'], ['b', 'c', 'in Chrome'], ['b', 'd', 'in Node.js']] },
    { kind: 'layers', title: 'l', desc: 'd', nodes: [{ id: 'a', label: 'Your code' }, { id: 'b', label: 'Node APIs', row: 1 }, { id: 'c', label: 'npm packages', row: 1 }, { id: 'd', label: 'V8', key: true, row: 2 }], edges: [] },
  ];
  specs.forEach((s) => {
    assert.deepEqual(Diagram.validate(s), []);
    assert.doesNotMatch(Diagram.html(s, 'x'), /NaN|undefined/);
  });
});
