// Unit tests for the component test runner engine (site/js/tools/styling-testing-engine.js):
// roles, accessible names, queries and their error messages over a tiny fake DOM, the matchers,
// mock functions, the describe/it runner, the advice rules and the challenge judge, plus the
// integrity of every component, variant and starter (each one compiles with the vendored Sucrase).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const E = require('../js/tools/styling-testing-engine.js');
const R = require('../js/react-runner.js');

const box = {};
vm.runInNewContext(readFileSync(new URL('../vendor/sucrase/sucrase.js', import.meta.url), 'utf8'), { window: box });
const transform = box.Sucrase.transform;

/* ---- A tiny fake DOM: just what the engine reads ------------------------------------------- */

function text(value) { return { nodeType: 3, nodeValue: value, childNodes: [], parentNode: null }; }
function h(tag, attrs = {}, ...children) {
  const el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    attributes: Object.entries(attrs).filter(([k]) => !['value', 'checked', 'selected'].includes(k) || typeof attrs[k] === 'string').map(([name, value]) => ({ name, value: String(value) })),
    childNodes: [],
    parentNode: null,
    getAttribute(name) { const a = this.attributes.find((x) => x.name === name); return a ? a.value : null; },
  };
  if ('value' in attrs) el.value = String(attrs.value);
  if ('checked' in attrs) el.checked = !!attrs.checked;
  if ('selected' in attrs) el.selected = !!attrs.selected;
  children.flat().forEach((c) => {
    const n = typeof c === 'string' ? text(c) : c;
    n.parentNode = el;
    el.childNodes.push(n);
  });
  return el;
}
function doc(...children) {
  const d = { nodeType: 9, childNodes: [], parentNode: null, activeElement: null };
  const body = h('body', {}, ...children);
  body.parentNode = d;
  d.childNodes.push(body);
  d.body = body;
  return d;
}

/* A page like TodoForm after an empty submit, plus a few other elements. */
function page() {
  return doc(
    h('h1', {}, 'My tasks'),
    h('form', { 'aria-label': 'New task' },
      h('label', { for: 'title' }, 'Task title'),
      h('input', { id: 'title', value: '', placeholder: 'e.g. Buy milk' }),
      h('p', { role: 'alert' }, 'Title is required'),
      h('button', { type: 'submit' }, 'Add task')),
    h('ul', { 'aria-label': 'Tasks' }, h('li', {}, 'Buy milk'), h('li', {}, 'Call Ana')),
    h('p', {}, 'Count: ', h('strong', {}, '1')),
    h('button', { 'aria-pressed': 'true' }, h('span', { 'aria-hidden': 'true' }, '+ '), 'Mute'),
    h('label', {}, 'Done ', h('input', { type: 'checkbox', checked: true })),
    h('img', { alt: 'Logo', src: 'x.png' }),
    h('div', { hidden: '' }, h('button', {}, 'Secret')),
    h('label', {}, 'Orphan label'),
    h('select', { 'aria-label': 'Status' }, h('option', { value: 'all' }, 'All'), h('option', { value: 'done', selected: true }, 'Done')),
  );
}
const q = (d) => E.queries(d.body);

/* ---- Roles and names ------------------------------------------------------------------------ */

test('implicit roles of common elements', () => {
  const cases = [
    [h('button'), 'button'], [h('a', { href: '/' }), 'link'], [h('a'), null], [h('h3'), 'heading'],
    [h('input'), 'textbox'], [h('input', { type: 'email' }), 'textbox'], [h('input', { type: 'checkbox' }), 'checkbox'],
    [h('input', { type: 'submit' }), 'button'], [h('input', { type: 'password' }), null], [h('input', { type: 'number' }), 'spinbutton'],
    [h('input', { type: 'search' }), 'searchbox'], [h('textarea'), 'textbox'], [h('select'), 'combobox'], [h('select', { multiple: '' }), 'listbox'],
    [h('ul'), 'list'], [h('li'), 'listitem'], [h('nav'), 'navigation'], [h('main'), 'main'], [h('img', { alt: 'x' }), 'img'],
    [h('img', { alt: '' }), 'presentation'], [h('p'), 'paragraph'], [h('div'), null], [h('div', { role: 'alert' }), 'alert'],
    [h('section'), null], [h('section', { 'aria-label': 'x' }), 'region'],
  ];
  cases.forEach(([el, role]) => assert.equal(E.roleOf(el), role, `${el.tagName} ${JSON.stringify(el.attributes)}`));
  const inArticle = h('article', {}, h('header'));
  assert.equal(E.roleOf(inArticle.childNodes[0]), null);
  assert.equal(E.roleOf(doc(h('header')).body.childNodes[0]), 'banner');
});

test('accessible names: label, aria-label, content, alt, hidden content skipped', () => {
  const d = page();
  const all = E.elements(d.body);
  const input = all.find((n) => n.getAttribute('id') === 'title');
  assert.equal(E.accessibleName(input), 'Task title');
  const mute = all.find((n) => n.getAttribute('aria-pressed'));
  assert.equal(E.accessibleName(mute), 'Mute');
  const checkbox = all.find((n) => n.getAttribute('type') === 'checkbox');
  assert.equal(E.accessibleName(checkbox), 'Done');
  assert.equal(E.accessibleName(all.find((n) => n.tagName === 'IMG')), 'Logo');
  assert.equal(E.accessibleName(all.find((n) => n.tagName === 'SELECT')), 'Status');
  assert.equal(E.accessibleName(h('input', { type: 'submit' })), 'Submit');
  assert.equal(E.accessibleName(h('input', { placeholder: 'Search' })), 'Search');
  const labelled = doc(h('h2', { id: 'h' }, 'Today'), h('ul', { 'aria-labelledby': 'h' }));
  assert.equal(E.accessibleName(labelled.body.childNodes[1]), 'Today');
  assert.equal(E.accessibleName(h('button', {}, h('img', { alt: 'Delete' }))), 'Delete');
});

/* ---- Queries -------------------------------------------------------------------------------- */

test('getByRole with name, pressed, checked and level; hidden elements excluded', () => {
  const d = page();
  const s = q(d);
  assert.equal(s.getByRole('button', { name: 'Add task' }).tagName, 'BUTTON');
  assert.equal(s.getByRole('button', { name: /mute/i }).getAttribute('aria-pressed'), 'true');
  assert.equal(s.getByRole('button', { name: 'Mute', pressed: true }).tagName, 'BUTTON');
  assert.equal(s.queryByRole('button', { name: 'Mute', pressed: false }), null);
  assert.equal(s.getByRole('checkbox', { checked: true }).tagName, 'INPUT');
  assert.equal(s.getByRole('heading', { level: 1 }).tagName, 'H1');
  assert.equal(s.queryByRole('button', { name: 'Secret' }), null);
  assert.equal(s.getByRole('button', { name: 'Secret', hidden: true }).tagName, 'BUTTON');
  assert.equal(s.getAllByRole('listitem').length, 2);
  assert.equal(s.getByRole('textbox', { name: 'Task title' }).getAttribute('id'), 'title');
  assert.equal(s.getByRole('alert').childNodes[0].nodeValue, 'Title is required');
});

test('getBy throws on zero and on several; queryBy returns null on zero', () => {
  const s = q(page());
  assert.throws(() => s.getByRole('button'), /Found multiple elements with the role "button"[\s\S]*getAllByText/);
  assert.throws(() => s.queryByRole('listitem'), /Found multiple elements/);
  assert.equal(s.queryByText('Nope'), null);
  assert.deepEqual(s.queryAllByText('Nope'), []);
  assert.throws(() => s.getByRole('button', { name: 'Save' }), (e) => {
    assert.equal(e.name, 'TestingLibraryElementError');
    assert.match(e.message, /Unable to find an accessible element with the role "button" and name "Save"/);
    assert.match(e.message, /Here are the accessible roles:[\s\S]*button "Add task"/);
    assert.doesNotMatch(e.message, /Secret/);
    return true;
  });
});

test('text queries match an element\'s own text, exactly unless exact: false', () => {
  const s = q(page());
  assert.equal(s.getByText('Buy milk').tagName, 'LI');
  assert.equal(s.getByText('Buy milk').tagName, 'LI');
  assert.throws(() => s.getByText('  Buy   milk '), /Unable to find/, 'the text is normalised, the matcher string is not');
  assert.throws(() => s.getByText('Count: 1'), /Unable to find an element with the text: Count: 1\. This could be because the text is broken up/);
  assert.equal(s.getByText('Count:').tagName, 'P');
  assert.equal(s.getByText('buy', { exact: false }).tagName, 'LI');
  assert.equal(s.getByText(/^call/i).tagName, 'LI');
  assert.equal(s.getByText((content, el) => el.tagName === 'STRONG' && content === '1').tagName, 'STRONG');
});

test('label, placeholder, display value, alt text and test id queries', () => {
  const s = q(page());
  assert.equal(s.getByLabelText('Task title').getAttribute('id'), 'title');
  assert.equal(s.getByLabelText('Done').getAttribute('type'), 'checkbox');
  assert.equal(s.getByLabelText('New task').tagName, 'FORM');
  assert.equal(s.getByPlaceholderText('e.g. Buy milk').tagName, 'INPUT');
  assert.equal(s.getByDisplayValue('Done').tagName, 'SELECT');
  assert.equal(s.getByAltText('Logo').tagName, 'IMG');
  assert.throws(() => s.getByLabelText('Orphan label'), /Found a label with the text of: Orphan label, however no form control was found/);
  assert.throws(() => s.getByLabelText('Title'), /Unable to find a label with the text of: Title/);
  assert.throws(() => s.getByTestId('x'), /Unable to find an element by: \[data-testid="x"\]/);
  const d = doc(h('button', { 'data-testid': 'go' }, 'Go'));
  assert.equal(q(d).getByTestId('go').tagName, 'BUTTON');
});

test('findBy waits until the element appears, or rejects with the last error', async () => {
  const d = doc(h('p', {}, 'Loading…'));
  setTimeout(() => {
    const li = h('li', {}, 'Buy milk');
    li.parentNode = d.body;
    d.body.childNodes.push(li);
  }, 60);
  const el = await q(d).findByText('Buy milk', {}, { timeout: 500, interval: 10 });
  assert.equal(el.tagName, 'LI');
  await assert.rejects(q(d).findByText('Never', {}, { timeout: 60, interval: 10 }), /Unable to find an element with the text: Never/);
});

test('waitFor calls onStart and onEnd once and returns the callback value', async () => {
  const log = [];
  let k = 0;
  const v = await E.waitFor(() => { k += 1; if (k < 3) throw new Error('not yet'); return 'ok'; }, { interval: 5, onStart: () => log.push('start'), onEnd: () => log.push('end') });
  assert.equal(v, 'ok');
  assert.deepEqual(log, ['start', 'end']);
});

/* ---- expect --------------------------------------------------------------------------------- */

test('core matchers pass and fail with Vitest-style messages', () => {
  const expect = E.createExpect();
  expect(1 + 1).toBe(2);
  expect({ a: [1, { b: 2 }] }).toEqual({ a: [1, { b: 2 }] });
  expect({ a: 1, b: undefined }).toEqual({ a: 1 });
  expect([1, 2]).not.toBe([1, 2]);
  expect('Buy milk').toContain('milk');
  expect([1, 2, 3]).toHaveLength(3);
  expect(null).toBeNull();
  expect(() => { throw new Error('boom'); }).toThrow('boom');
  assert.throws(() => expect(1).toBe(2), (e) => e.name === 'AssertionError' && e.message === 'expected 1 to be 2 // Object.is equality');
  assert.throws(() => expect({ id: 1 }).toBe({ id: 1 }), /expected \{ id: 1 \} to be \{ id: 1 \} \/\/ Object\.is equality\n\nIf it should pass with deep equality, replace "toBe" with "toStrictEqual"/);
  assert.throws(() => expect('a').not.toBe('a'), /expected 'a' not to be 'a'/);
  assert.throws(() => expect([1]).toEqual([2]), /expected \[ 1 \] to deeply equal \[ 2 \]/);
  assert.throws(() => expect([1, 2]).toHaveLength(3), /to have a length of 3 but got 2/);
});

test('resolves and rejects', async () => {
  const expect = E.createExpect();
  await expect(Promise.resolve(3)).resolves.toBe(3);
  await expect(Promise.reject(new Error('no'))).rejects.toThrow('no');
  await assert.rejects(expect(Promise.resolve(3)).rejects.toBe(3), /promise resolved 3 instead of rejecting/);
});

test('jest-dom matchers on elements', () => {
  const d = page();
  const s = q(d);
  const expect = E.createExpect();
  const alert = s.getByRole('alert');
  expect(alert).toBeInTheDocument();
  expect(alert).toHaveTextContent('Title is required');
  expect(alert).toHaveTextContent('required');
  expect(alert).toHaveTextContent(/^Title/);
  expect(s.getByText('Count:')).toHaveTextContent('Count: 1');
  expect(s.getByLabelText('Task title')).toHaveValue('');
  expect(s.getByRole('checkbox')).toBeChecked();
  expect(s.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
  expect(s.getByRole('button', { name: 'Add task' })).toBeEnabled();
  expect(s.getByRole('button', { name: 'Mute' })).toHaveAccessibleName('Mute');
  expect(s.queryByText('Nope')).not.toBeInTheDocument();
  expect(s.getByRole('button', { name: 'Secret', hidden: true })).not.toBeVisible();
  const detached = h('p', {}, 'x');
  expect(detached).not.toBeInTheDocument();
  assert.throws(() => expect(alert).toHaveTextContent('Saved'), (e) => {
    assert.equal(e.message, 'expect(element).toHaveTextContent()\n\nExpected element to have text content:\n  Saved\nReceived:\n  Title is required');
    return true;
  });
  assert.throws(() => expect(null).toBeInTheDocument(), /received value must be an HTMLElement or an SVGElement\.\nReceived has value: null/);
  assert.throws(() => expect(alert).not.toBeInTheDocument(), /expected document not to contain element, found <p role="alert">Title is required<\/p> instead/);
  assert.throws(() => expect(s.getByRole('button', { name: 'Add task' })).toBeDisabled(), /Received element is not disabled/);
  assert.throws(() => expect(alert).toHaveTextContent(''), /Checking with empty string will always match/);
  expect(h('button', { disabled: '' })).toBeDisabled();
  expect(h('button', { class: 'toggle on' })).toHaveClass('on');
});

test('mock functions and their matchers', () => {
  const vi = E.createVi();
  const expect = E.createExpect();
  const onAdd = vi.fn();
  expect(onAdd).not.toHaveBeenCalled();
  onAdd('  Buy milk ');
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith('  Buy milk ');
  assert.throws(() => expect(onAdd).toHaveBeenCalledWith('Buy milk'), /expected "spy" to be called with arguments: \[ 'Buy milk' \]\n\nReceived:\n  1st spy call: \[ '  Buy milk ' \]\n\nNumber of calls: 1/);
  assert.throws(() => expect(() => {}).toHaveBeenCalled(), /is not a spy or a call to a spy!/);
  const f = vi.fn().mockReturnValueOnce(1).mockReturnValue(2);
  assert.deepEqual([f(), f(), f()], [1, 2, 2]);
});

test('spyOn calls through, can be mocked, and restoreAllMocks puts the original back', async () => {
  const vi = E.createVi();
  const api = { get: (x) => `real ${x}` };
  const original = api.get;
  const spy = vi.spyOn(api, 'get');
  assert.equal(api.get('a'), 'real a');
  spy.mockResolvedValue('fake');
  assert.equal(await api.get('b'), 'fake');
  assert.equal(spy.mock.calls.length, 2);
  assert.equal(spy.getMockName(), 'get');
  vi.restoreAllMocks();
  assert.equal(api.get, original);
});

/* ---- Runner -------------------------------------------------------------------------------- */

test('the runner runs describe/it with beforeEach and afterEach, and reports failures and timeouts', async () => {
  const r = E.createRunner();
  const { describe, it, beforeEach, afterEach } = r.api;
  const log = [];
  describe('Counter', () => {
    beforeEach(() => log.push('before'));
    afterEach(() => log.push('after'));
    it('passes', () => log.push('test 1'));
    it('fails', () => { throw new Error('nope'); });
    it.skip('skipped', () => {});
    it('async passes', async () => { await new Promise((res) => setTimeout(res, 5)); });
  });
  it('times out', () => new Promise(() => {}), 30);
  let cleaned = 0;
  const results = await r.run({ timeout: 1000, afterEach: () => { cleaned += 1; } });
  assert.deepEqual(results.map((x) => [x.name, x.status]), [
    ['Counter > passes', 'pass'], ['Counter > fails', 'fail'], ['Counter > skipped', 'skip'], ['Counter > async passes', 'pass'], ['times out', 'fail'],
  ]);
  assert.equal(results[1].error.message, 'nope');
  assert.match(results[4].error.message, /^Test timed out in 30ms/);
  assert.deepEqual(log.slice(0, 3), ['before', 'test 1', 'after']);
  assert.equal(cleaned, 4);
});

test('only runs the .only tests; a test inside a test is an error', async () => {
  const r = E.createRunner();
  r.api.test('a', () => {});
  r.api.test.only('b', () => {});
  let inner = null;
  r.api.test('c', () => { try { r.api.test('d', () => {}); } catch (e) { inner = e; } });
  const res = await r.run();
  assert.deepEqual(res.map((x) => x.status), ['skip', 'pass', 'skip']);
  const r2 = E.createRunner();
  r2.api.test('c', () => { r2.api.test('d', () => {}); });
  const res2 = await r2.run();
  assert.match(res2[0].error.message, /inside another test function is not allowed/);
  assert.equal(inner, null);
});

test('lineOf maps a stack frame back to the line of the student file', () => {
  assert.equal(E.lineOf('AssertionError: x\n    at Object.<anonymous> (Counter.test.jsx:10:20)\n    at run (engine.js:1:1)', 'Counter.test.jsx'), 9);
  assert.equal(E.lineOf('@Counter.test.jsx:4:3', 'Counter.test.jsx'), 3);
  assert.equal(E.lineOf('no frames', 'Counter.test.jsx'), null);
});

/* ---- Advice --------------------------------------------------------------------------------- */

test('advice flags brittle and unsafe patterns, with their line', () => {
  const rules = (src) => E.advise(src).map((a) => a.rule);
  assert.deepEqual(rules("test('x', () => {\n  const { container } = render(<A />);\n  fireEvent.click(container.querySelector('.inc'));\n  expect(container.querySelector('p').textContent).toBe('1');\n});"),
    ['no-node-access', 'prefer-user-event', 'prefer-to-have-text-content']);
  assert.ok(rules("expect(screen.getByText('Loading')).not.toBeInTheDocument();").includes('prefer-presence-queries'));
  assert.ok(rules("const el = screen.findByText('x');").includes('await-async-queries'));
  assert.ok(!rules("const el = await screen.findByText('x');").includes('await-async-queries'));
  assert.ok(rules("user.click(btn);").includes('await-async-events'));
  assert.ok(!rules("await user.click(btn);").includes('await-async-events'));
  assert.ok(rules("screen.getByTestId('x')").includes('no-test-id'));
  assert.ok(rules("test('x', () => {\n  render(<A />);\n});").includes('expect-expect'));
  assert.ok(rules("await waitFor(() => screen.getByText('x'));").includes('prefer-find-by'));
  assert.ok(rules("const { getByText } = render(<A />);").includes('prefer-screen-queries'));
  assert.deepEqual(rules("// container.querySelector in a comment\nexpect(screen.getByRole('button')).toBeInTheDocument();"), []);
  assert.equal(E.advise("a\nb\nscreen.getByTestId('x')")[0].line, 3);
});

/* ---- Format and equality --------------------------------------------------------------------- */

test('format and equals', () => {
  assert.equal(E.format('a'), "'a'");
  assert.equal(E.format([1, 'b', { c: null }]), "[ 1, 'b', { c: null } ]");
  assert.equal(E.format(h('button', { type: 'submit' }, 'Add task')), '<button type="submit">Add task</button>');
  assert.equal(E.format(new Error('x')), '[Error: x]');
  assert.ok(E.equals({ a: [1, 2] }, { a: [1, 2] }));
  assert.ok(!E.equals([1, 2], [2, 1]));
  assert.ok(!E.equals({ a: 1 }, { a: 1, b: 2 }));
  assert.ok(E.equals(NaN, NaN));
});

test('prettyDom indents elements and text, and truncates', () => {
  const d = doc(h('ul', { class: 'x' }, h('li', {}, 'Buy milk')), h('input', { id: 'a' }));
  assert.equal(E.prettyDom(d.body), '<body>\n  <ul class="x">\n    <li>\n      Buy milk\n    </li>\n  </ul>\n  <input id="a" />\n</body>');
  assert.match(E.prettyDom(d.body, 10), /…$/);
});

/* ---- Challenges ---------------------------------------------------------------------------- */

const compileOk = (label, src) => {
  const r = R.compile(src, transform);
  assert.ok(r.ok, `${label}: ${r.ok ? '' : `${r.error.message} (line ${r.error.line})\n${r.error.frame}`}`);
};

test('every component, variant, free starter and challenge starter compiles', () => {
  Object.entries(E.COMPONENTS).forEach(([id, c]) => {
    compileOk(id, c.code);
    if (c.starter) compileOk(`${id} starter`, c.starter);
  });
  E.FREE.forEach((id) => assert.ok(E.COMPONENTS[id].starter, `${id} needs a free-mode starter`));
  E.CHALLENGES.forEach((c) => {
    compileOk(`${c.id} starter`, c.starter);
    c.variants.forEach((v) => compileOk(`${c.id} / ${v.label}`, E.variantCode(c.component, v)));
  });
});

test('challenges are complete and their variants apply', () => {
  const problems = E.CHALLENGES.flatMap(E.validateChallenge);
  assert.deepEqual(problems, []);
  const ids = E.CHALLENGES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(E.CHALLENGES.length >= 8);
  assert.throws(() => E.variantCode('counter', { label: 'x', edits: [['not in the file', 'y']] }), /not found/);
});

test('brittle starters are flagged by the challenge itself (forbids) and by the advice', () => {
  E.CHALLENGES.filter((c) => c.forbids).forEach((c) => {
    assert.ok(c.forbids.some((f) => f.re.test(c.starter)), `${c.id}: the brittle starter should break a "forbids" rule`);
    assert.ok(E.advise(c.starter).length > 0, `${c.id}: the advice should flag the brittle starter`);
  });
});

/* judge: the original run must pass, bugs must make a test fail, refactors must keep tests green. */
const pass = [{ name: 't', status: 'pass', error: null, duration: 1 }];
const fail = [{ name: 't', status: 'fail', error: { name: 'AssertionError', message: 'x' }, duration: 1 }];

test('judge: solved only when the original passes, every bug is caught and every refactor survives', () => {
  const c = E.CHALLENGES.find((x) => x.id === 'brittle-counter');
  const variants = E.variantsOf(c);
  const good = "await user.click(screen.getByRole('button', { name: 'Increment' }));\nexpect(screen.getByText('Count: 1')).toBeInTheDocument();";
  const runs = (outcomes) => variants.map((v, k) => ({ variant: v, results: outcomes[k] ? pass : fail, fileError: null }));
  // order: original, refactor, refactor, bug
  assert.equal(E.judge(c, runs([true, true, true, false]), good).ok, true);
  const brittle = E.judge(c, runs([true, false, true, false]), good);
  assert.equal(brittle.ok, false);
  assert.ok(brittle.items.some((i) => i.status === 'bad' && /Brittle/.test(i.text)));
  const missed = E.judge(c, runs([true, true, true, true]), good);
  assert.ok(missed.items.some((i) => i.status === 'bad' && /Bug missed/.test(i.text)));
  const forbidden = E.judge(c, runs([true, true, true, false]), `${good}\ncontainer.querySelector('p')`);
  assert.equal(forbidden.ok, false);
  const commented = E.judge(c, runs([true, true, true, false]), `${good}\n// container.querySelector('p') was brittle`);
  assert.equal(commented.ok, true, 'comments do not count');
  const broken = E.judge(c, [{ variant: variants[0], results: [], fileError: 'SyntaxError' }], good);
  assert.equal(broken.ok, false);
  const empty = E.judge(c, runs([true, true, true, false]).map((r) => ({ ...r, results: [] })), good);
  assert.ok(empty.items.some((i) => /No test found/.test(i.text)));
});

test('judge: requirements are checked on the source', () => {
  const c = E.CHALLENGES.find((x) => x.id === 'label-and-submit');
  const runs = E.variantsOf(c).map((v, k) => ({ variant: v, results: k === 0 ? pass : fail, fileError: null }));
  assert.equal(E.judge(c, runs, "screen.getByLabelText('Task title'); expect(1).toBe(1);").ok, true);
  const r = E.judge(c, runs, "screen.getByPlaceholderText('x'); expect(1).toBe(1);");
  assert.equal(r.ok, false);
  assert.ok(r.items.some((i) => /getByLabelText/.test(i.text)));
});
