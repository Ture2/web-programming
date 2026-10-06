// Unit tests for the React "Try it" compiler wrapper (site/js/react-runner.js) with the vendored
// Sucrase (site/vendor/sucrase/sucrase.js), plus a compile check of every `kind: 'react'` box in
// site/data/en/*.js (rendering them is checked in the browser by site/tools/check.mjs).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const R = require('../js/react-runner.js');

const box = {};
vm.runInNewContext(readFileSync(new URL('../vendor/sucrase/sucrase.js', import.meta.url), 'utf8'), { window: box });
const transform = box.Sucrase.transform;
const compile = (src) => R.compile(src, transform);

test('JSX becomes React.createElement calls and keeps line numbers', () => {
  const src = 'function App() {\n  const name = "Ana";\n  return <h1 className="t">Hi {name}</h1>;\n}';
  const r = compile(src);
  assert.equal(r.ok, true);
  assert.match(r.code, /React\.createElement\('h1', \{ className: "t",\}, "Hi " *, name\)/);
  assert.equal(r.code.split('\n').findIndex((l) => l.includes('createElement')), 2);
  assert.equal(r.selfRender, false);
});

test('imports from react become require calls; default export is kept', () => {
  const r = compile("import { useState } from 'react';\nexport default function Counter() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}");
  assert.equal(r.ok, true);
  assert.match(r.code, /require\('react'\)/);
  assert.match(r.code, /exports\.default = Counter/);
});

test('fragments compile', () => {
  const r = compile('function App() { return <><b>a</b><i>b</i></>; }');
  assert.equal(r.ok, true);
  assert.match(r.code, /React\.Fragment/);
});

test('code that calls createRoot renders itself', () => {
  const r = compile("import { createRoot } from 'react-dom/client';\nfunction App() { return <p>x</p>; }\ncreateRoot(document.getElementById('root')).render(<App />);");
  assert.equal(r.selfRender, true);
  assert.equal(compile('// createRoot( is done for you\nfunction App() { return null; }').selfRender, false);
});

test('a syntax error reports its line, column and a code frame with a caret', () => {
  const src = 'function App() {\n  return <div><p>hi</div>;\n}';
  const r = compile(src);
  assert.equal(r.ok, false);
  assert.equal(r.error.line, 2);
  assert.equal(typeof r.error.column, 'number');
  assert.doesNotMatch(r.error.message, /\(\d+:\d+\)$/);
  const lines = r.error.frame.split('\n');
  assert.ok(lines.some((l) => l.startsWith('> 2 |')), r.error.frame);
  assert.ok(lines.some((l) => /^\s+\|\s*\^$/.test(l)), r.error.frame);
});

test('two adjacent JSX elements without a parent are a syntax error', () => {
  const r = compile('function App() {\n  return <h1>a</h1><p>b</p>;\n}');
  assert.equal(r.ok, false);
  assert.equal(r.error.line, 2);
});

test('locate maps a stack frame in App.jsx back to the student line', () => {
  assert.deepEqual(R.locate('TypeError: x is undefined\n    at App (App.jsx:4:12)\n    at renderWithHooks (react.js:1:2)'), { line: 3, column: 11 });
  assert.equal(R.locate('Error: boom\n    at foo (react.js:1:2)'), null);
});

test('frame shows the line before and after', () => {
  assert.equal(R.frame('a\nb\nc', 2, 0), '  1 | a\n> 2 | b\n    | ^\n  3 | c');
  assert.equal(R.frame('a', 5, 0), '');
});

/* Every React box in the content compiles. */
const DATA = new URL('../data/en/', import.meta.url);
const ctx = { DATA: { en: {} }, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of readdirSync(DATA).filter((n) => n.endsWith('.js'))) vm.runInContext(readFileSync(new URL(f, DATA), 'utf8'), ctx, { filename: f });
const boxes = [];
Object.entries(ctx.DATA.en).forEach(([key, v]) => {
  if (!/_CONCEPTS$/.test(key) || !Array.isArray(v)) return;
  v.forEach((c) => { if (c.live && c.live.kind === 'react') boxes.push({ key, id: c.id, code: c.live.code }); });
});

test('every kind: react box in the content compiles', () => {
  for (const b of boxes) {
    const r = compile(b.code);
    assert.ok(r.ok, `${b.key} ${b.id}: ${r.ok ? '' : `${r.error.message} (line ${r.error.line})\n${r.error.frame}`}`);
  }
});
