// Unit tests for the Components tools engine (site/js/tools/components-engine.js), with the vendored
// Sucrase compiling the JSX exactly as the page does, plus integrity checks of every challenge.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const E = require('../js/tools/components-engine.js');
const R = require('../js/react-runner.js');

const box = {};
vm.runInNewContext(readFileSync(new URL('../vendor/sucrase/sucrase.js', import.meta.url), 'utf8'), { window: box });
const transform = box.Sucrase.transform;

/* What the JSX viewer does: compile, run the recording program (here in a vm, in the page in a Worker). */
function view(src) {
  const c = R.compile(src, transform);
  if (!c.ok) return { compileError: c.error };
  const logs = [];
  const fmt = (a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  const consoleStub = { log: (...a) => logs.push({ level: 'log', text: fmt(a) }), warn() {}, error() {}, info() {} };
  vm.runInNewContext(E.program(c.code), { console: consoleStub, Proxy, crypto: globalThis.crypto }, { timeout: 2000 });
  return E.readResult(logs);
}
const shown = (src) => E.tidyCompiled(transform(src, { transforms: ['jsx'], jsxRuntime: 'classic', production: true }).code);

/* ---- Compiled code ------------------------------------------------------------------ */

test('tidyCompiled removes Sucrase artefacts but keeps the calls', () => {
  const out = shown('function App() {\n  return (\n    <ul className="t">\n      <li>a</li>\n      <li>b</li>\n    </ul>\n  );\n}');
  assert.match(out, /React\.createElement\('ul', \{ className: "t" \},\n/);
  assert.match(out, /React\.createElement\('li', null, "a"\),\n/);
  assert.doesNotMatch(out, /,\s*\}/);
  assert.doesNotMatch(out, /\n\s*, /);
});

test('tidyCompiled leaves strings alone', () => {
  const out = E.tidyCompiled("const s = 'a ,} b';\nconst t = \"x )\";");
  assert.match(out, /'a ,} b'/);
  assert.match(out, /"x \)"/);
});

test('segments separates strings and comments from code', () => {
  const parts = E.segments("a = 'x'; // c\nb = `t`");
  assert.deepEqual(parts.map(([s, code]) => [s, code]), [['a = ', true], ["'x'", false], ['; ', true], ['// c', false], ['\nb = ', true], ['`t`', false]]);
});

/* ---- Element trees ----------------------------------------------------------------- */

test('an HTML element: type string, props without children, children separate', () => {
  const r = view('function App() {\n  const name = "Ana";\n  return <h1 className="t" id="g">Hi {name}!</h1>;\n}');
  assert.equal(r.error, null);
  const app = r.tree;
  assert.deepEqual(app.type, { fn: 'App' });
  const h1 = app.rendered;
  assert.deepEqual(h1.type, { tag: 'h1' });
  assert.deepEqual(h1.props.map(([k]) => k), ['className', 'id']);
  assert.deepEqual(h1.children, { k: 'list', items: [{ k: 'str', v: 'Hi ' }, { k: 'str', v: 'Ana' }, { k: 'str', v: '!' }] });
  assert.equal(E.toHtml(r.tree), '<h1 class="t" id="g">Hi Ana!</h1>');
});

test('a component element keeps the function as type, children in props, and is expanded', () => {
  const r = view('function Card({ title, children }) {\n  return <section><h2>{title}</h2>{children}</section>;\n}\nfunction App() {\n  return <Card title="Today"><p>Milk</p></Card>;\n}');
  const card = r.tree.rendered;
  assert.deepEqual(card.type, { fn: 'Card' });
  assert.equal(card.children.k, 'el');
  assert.deepEqual(card.children.type, { tag: 'p' });
  assert.equal(card.rendered.type.tag, 'section');
  assert.equal(E.toHtml(r.tree), '<section>\n  <h2>Today</h2>\n  <p>Milk</p>\n</section>');
  assert.equal(E.elements(r.tree, { expand: false }).length, 1);   // App only: its output needs a call
  assert.equal(E.elements(r.tree).length, 6);                      // + section, h2, p again
});

test('lists keep their keys; fragments leave no element in the HTML', () => {
  const r = view("const tasks = [{ id: 't1', title: 'A' }, { id: 't2', title: 'B' }];\nfunction App() {\n  return <><h1>T</h1><ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul></>;\n}");
  const lis = E.elements(r.tree).filter((e) => e.type.tag === 'li');
  assert.deepEqual(lis.map((e) => e.key), ['t1', 't2']);
  assert.equal(E.toHtml(r.tree), '<h1>T</h1>\n<ul>\n  <li>A</li>\n  <li>B</li>\n</ul>');
});

test('0 renders, false/null/undefined do not', () => {
  const r = view('function App() {\n  const n = 0;\n  return <div>{n && <p>x</p>}{false}{null}{undefined}{true}</div>;\n}');
  assert.equal(E.toHtml(r.tree), '<div>0</div>');
});

test('attributes: className, htmlFor, style objects, booleans and handlers', () => {
  const r = view('function App() {\n  return <form><label htmlFor="a" className="l">A</label><input id="a" disabled value="x" onChange={() => {}} /><p style={{ marginTop: 8, opacity: 0.5, color: "red" }}>s</p></form>;\n}');
  assert.equal(E.toHtml(r.tree), '<form>\n  <label for="a" class="l">A</label>\n  <input id="a" disabled="" value="x">\n  <p style="margin-top: 8px; opacity: 0.5; color: red">s</p>\n</form>');
});

test('onClick={save()} records undefined; onClick={save} records a function', () => {
  const bad = view('function save() { return undefined; }\nfunction App() { return <button onClick={save()}>S</button>; }');
  assert.equal(E.fmtValue(E.prop(bad.tree.rendered, 'onClick')), 'undefined');
  const good = view('function save() {}\nfunction App() { return <button onClick={save}>S</button>; }');
  assert.equal(E.fmtValue(E.prop(good.tree.rendered, 'onClick')), 'ƒ save');
});

test('hooks are inert stubs: a component with state still describes its first render', () => {
  const r = view("import { useState } from 'react';\nfunction App() {\n  const [n, setN] = useState(3);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}");
  assert.equal(E.toHtml(r.tree), '<button>3</button>');
});

test('errors are reported, not thrown: missing App, a throwing component, an object child', () => {
  assert.match(view('const x = 1;').error, /define a component called App/);
  const r = view('function Boom() { throw new Error("nope"); }\nfunction App() { return <div><Boom /></div>; }');
  assert.equal(r.error, null);
  assert.match(E.elements(r.tree).find((e) => e.type.fn === 'Boom').error, /Error: nope/);
  assert.match(E.toHtml(r.tree), /Boom threw Error: nope/);
  assert.match(E.toHtml(view('function App() { return <p>{{ a: 1 }}</p>; }').tree), /Objects are not valid/);
});

test("the student's console.log output is kept apart from the result", () => {
  const r = view('function App() { console.log("hello"); return null; }');
  assert.deepEqual(r.logs.map((l) => l.text), ['hello']);
  assert.equal(E.toHtml(r.tree), '');
});

test('readResult without the marker line reports the worker error', () => {
  assert.equal(E.readResult([], 'Stopped after 2 s').error, 'Stopped after 2 s');
});

/* ---- Static checks ----------------------------------------------------------------- */

test('keyFromIndex finds index keys in their usual spellings', () => {
  assert.equal(E.keyFromIndex('tasks.map((t, i) => <li key={i}>{t}</li>)'), 'i');
  assert.equal(E.keyFromIndex('tasks.map(({ id, title }, index) => (\n  <li key={index}>{title}</li>))'), 'index');
  assert.equal(E.keyFromIndex('tasks.map(function (t, k) { return <li key={String(k)} />; })'), 'k');
  assert.equal(E.keyFromIndex('tasks.map((t, i) => <li key={`row-${i}`} />)'), 'i');
  assert.equal(E.keyFromIndex('tasks.map((t, i) => <li key={t.id}>{i + 1}. {t.title}</li>)'), null);
  assert.equal(E.keyFromIndex('tasks.map((t) => <li key={t.id} />)'), null);
});

test('handlersCalled spots onX={fn()} but not arrows or references', () => {
  assert.deepEqual(E.handlersCalled('<button onClick={setCount(count + 1)}>'), [{ prop: 'onClick', call: 'setCount(count + 1)' }]);
  assert.deepEqual(E.handlersCalled('<button onClick={() => save()} onBlur={save}>'), []);
});

/* ---- DOM snapshots ----------------------------------------------------------------- */

const h = (t, a, ...k) => ({ t, a: a || {}, k });
const snap = h('div', { id: 'root' },
  h('section', { class: 'card big' }, h('h2', null, 'Today'), h('p', null, 'Buy ', 'milk'), h('div', null, h('p', null, 'Inner'))),
  h('ul', null, h('li', { 'data-id': 'a' }, 'One'), h('li', null, 'Two')),
  { t: 'input', a: { id: 'name' }, v: 'Ana', k: [] });

test('query supports tags, classes, ids, attributes and both combinators', () => {
  assert.equal(E.query(snap, 'li').length, 2);
  assert.equal(E.query(snap, 'section.card p').length, 2);
  assert.equal(E.query(snap, 'section.card > p').length, 1);
  assert.equal(E.query(snap, '.big > h2')[0].k[0], 'Today');
  assert.equal(E.query(snap, '#name')[0].v, 'Ana');
  assert.equal(E.query(snap, 'li[data-id=a]').length, 1);
  assert.equal(E.query(snap, 'li[data-id]').length, 1);
  assert.equal(E.query(snap, 'table').length, 0);
  assert.deepEqual(E.texts(snap, 'section p'), ['Buy milk', 'Inner']);
  assert.deepEqual(E.textNodes(h('p', null, '0', h('b', null, 'x'))), ['0', 'x']);
});

/* ---- Challenges --------------------------------------------------------------------- */

const JV_FIXES = {
  'jv-fragment': 'function App() {\n  return (\n    <>\n      <h1>Tasks</h1>\n      <p>3 left</p>\n    </>\n  );\n}',
  'jv-attrs': 'function App() {\n  return (\n    <form>\n      <label className="label" htmlFor="email">Email</label>\n      <input id="email" type="email" />\n      <img src="logo.png" alt="Logo" />\n    </form>\n  );\n}',
  'jv-keys': null,   // derived from the starter below
  'jv-handler': "function save() {\n  console.log('Saved!');\n}\n\nfunction App() {\n  return <button onClick={save}>Save</button>;\n}",
};

test('JSX viewer challenges: ids unique, predict answers valid, fix starters fail and fixes pass', () => {
  const ids = E.JV_CHALLENGES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 6);
  for (const c of E.JV_CHALLENGES) {
    assert.ok(c.title && c.goal, c.id);
    if (c.kind === 'predict') {
      assert.ok(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.choices.length, c.id);
      assert.ok(c.why && c.snippet, c.id);
      assert.equal(view(c.code).error, null, `${c.id}: its code runs`);
      continue;
    }
    assert.equal(c.kind, 'fix');
    assert.ok(c.hint, c.id);
    const start = view(c.code);
    const startOk = !start.compileError && c.check(start.tree).every((i) => i.status === 'ok');
    assert.equal(startOk, false, `${c.id}: the starter must not already pass`);
    const fixSrc = c.id === 'jv-keys' ? c.code.replace('<li>', '<li key={task.id}>') : JV_FIXES[c.id];
    const fixed = view(fixSrc);
    assert.ok(!fixed.compileError, `${c.id}: fix compiles`);
    const items = c.check(fixed.tree);
    assert.ok(items.every((i) => i.status === 'ok'), `${c.id}: ${JSON.stringify(items)}`);
  }
});

test('jv-keys rejects index keys with a specific message', () => {
  const c = E.JV_CHALLENGES.find((x) => x.id === 'jv-keys');
  const items = c.check(view(c.code.replace('<li>', '<li key={index}>')).tree);
  assert.ok(items.some((i) => i.status === 'bad' && /positions/.test(i.text)));
});

test('jv-fragment accepts a fragment but flags an extra <div>', () => {
  const c = E.JV_CHALLENGES.find((x) => x.id === 'jv-fragment');
  const items = c.check(view('function App() { return <div><h1>T</h1><p>3</p></div>; }').tree);
  assert.ok(items.some((i) => i.status === 'bad' && /extra element/.test(i.text)));
});

test('presets all run and produce HTML', () => {
  for (const p of E.JV_PRESETS) {
    const r = view(p.code);
    assert.equal(r.error, null, p.id);
    assert.ok(E.toHtml(r.tree).length > 0, p.id);
  }
});

test('playground starters and their reference fixes compile', () => {
  for (const c of E.CP_CHALLENGES) {
    assert.ok(R.compile(c.starter, transform).ok, `${c.id} starter`);
    assert.ok(Array.isArray(c.steps) && c.steps.some((s) => s.snap), c.id);
  }
});

/* Fake frame reports: what the hidden frame sends back for a correct and a typical wrong component. */
const judge = (id, report, source = '') => E.judge(E.CP_CHALLENGES.find((c) => c.id === id), report, source);
const ul = (...titles) => h('div', { id: 'root' }, h('ul', null, ...titles.map((x) => h('li', null, x))));
const root = (...k) => h('div', { id: 'root' }, ...k);

test('judge cp-list: right list passes; index keys, a missing key or a hand-written list fail', () => {
  const good = { snaps: { start: ul('Buy milk', 'Call Ana', 'Water the plants') }, console: [] };
  assert.equal(judge('cp-list', good, 'tasks.map((task) => <li key={task.id}>{task.title}</li>)').ok, true);
  const idx = judge('cp-list', good, 'tasks.map((task, i) => <li key={i}>{task.title}</li>)');
  assert.equal(idx.ok, false);
  assert.ok(idx.items.some((i) => i.status === 'bad' && /position/.test(i.text)));
  const warned = judge('cp-list', { ...good, console: [{ level: 'error', text: 'Each child in a list should have a unique "key" prop.' }] }, 'tasks.map((t) => <li>{t.title}</li>)');
  assert.equal(warned.ok, false);
  assert.equal(judge('cp-list', good, '<li>Buy milk</li><li>Call Ana</li><li>Water the plants</li>').ok, false);
  assert.equal(judge('cp-list', { snaps: { start: ul() }, console: [] }, '').ok, false);
});

test('judge cp-props and cp-children', () => {
  const ps = (...t) => root(h('div', null, ...t.map((x) => h('p', null, x))));
  assert.equal(judge('cp-props', { snaps: { start: ps('Hello, Ana!', 'Hello, Luis!', 'Hello, Marta!') } }).ok, true);
  assert.equal(judge('cp-props', { snaps: { start: ps('Hello, Ana!', 'Hello, Luis!') } }).ok, false);
  assert.equal(judge('cp-props', { snaps: { start: ps('Hello, someone!', 'Hello, someone!') } }).ok, false);
  const card = (...k) => root(h('section', { class: 'card' }, h('h2', null, 'Today'), ...k));
  assert.equal(judge('cp-children', { snaps: { start: card(h('p', null, 'Buy milk'), h('p', null, 'Call Ana')) } }).ok, true);
  assert.equal(judge('cp-children', { snaps: { start: card() } }).ok, false);
});

test('judge cp-conditional catches the stray 0', () => {
  const full = root(h('div', null, h('h1', null, 'Tasks'), h('ul', null, h('li', null, 'Buy milk'), h('li', null, 'Call Ana'))));
  const good = { snaps: { empty: root(h('div', null, h('h1', null, 'Tasks'), h('p', null, 'No tasks yet.'))), full } };
  assert.equal(judge('cp-conditional', good).ok, true);
  const zero = { snaps: { empty: root(h('div', null, h('h1', null, 'Tasks'), '0')), full } };
  const r = judge('cp-conditional', zero);
  assert.equal(r.ok, false);
  assert.ok(r.items.some((i) => i.status === 'bad' && /lone 0/.test(i.text)));
});

test('judge cp-event: a render error explains the onClick={setX()} loop', () => {
  const r = judge('cp-event', { error: 'Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.' }, '<button onClick={setCount(count + 1)}>');
  assert.equal(r.ok, false);
  assert.ok(r.items.some((i) => i.status === 'note' && /onClick=\{\(\) =>/.test(i.text)));
  const p = (n) => root(h('div', null, h('p', null, `Count: ${n}`), h('button', null, 'Add one')));
  assert.equal(judge('cp-event', { snaps: { s0: p(0), s1: p(1), s2: p(2) } }).ok, true);
  assert.equal(judge('cp-event', { snaps: { s0: p(0), s1: p(2), s2: p(4) } }).ok, false);
});

test('judge cp-controlled needs the box emptied by state, and no warnings', () => {
  const view2 = (name, value) => root(h('div', null, { t: 'input', a: { id: 'name' }, v: value, k: [] }, h('p', null, `Hello, ${name}!`)));
  const good = { snaps: { s0: view2('stranger', ''), typed: view2('Ana', 'Ana'), cleared: view2('stranger', '') }, console: [] };
  assert.equal(judge('cp-controlled', good).ok, true);
  const uncontrolled = { snaps: { ...good.snaps, cleared: view2('stranger', 'Ana') }, console: [] };
  const r = judge('cp-controlled', uncontrolled);
  assert.equal(r.ok, false);
  assert.ok(r.items.some((i) => /value=\{name\}/.test(i.text)));
  const warn = { ...good, console: [{ level: 'error', text: 'You provided a `value` prop to a form field without an `onChange` handler.' }] };
  assert.equal(judge('cp-controlled', warn).ok, false);
});

test('judge cp-form: submits must be prevented, blanks ignored, input cleared', () => {
  const form = (value, ...titles) => root(h('form', null, { t: 'input', a: { id: 'title' }, v: value, k: [] }, h('ul', null, ...titles.map((x) => h('li', null, x)))));
  const good = {
    snaps: { one: form('', 'Buy bread'), blank: form('', 'Buy bread'), two: form('', 'Buy bread', 'Call Ana') },
    submits: [{ prevented: true }, { prevented: true }, { prevented: true }],
    console: [],
  };
  assert.equal(judge('cp-form', good).ok, true);
  const reload = judge('cp-form', { ...good, submits: [{ prevented: false }, { prevented: true }, { prevented: true }] });
  assert.equal(reload.ok, false);
  assert.ok(reload.items.some((i) => i.status === 'bad' && /preventDefault/.test(i.text)));
  assert.equal(judge('cp-form', { ...good, snaps: { ...good.snaps, blank: form('', 'Buy bread', '   ') } }).ok, false);
  assert.equal(judge('cp-form', { ...good, snaps: { ...good.snaps, one: form('Buy bread', 'Buy bread') } }).ok, false);
  assert.equal(judge('cp-form', { ...good, submits: [] }).ok, false);
});

test('judge: timeouts and missing elements are reported', () => {
  assert.match(judge('cp-list', { timeout: true }).items[0].text, /infinite loop/);
  assert.match(judge('cp-controlled', { missing: ['the <input>'] }).items[0].text, /could not find the <input>/);
});
