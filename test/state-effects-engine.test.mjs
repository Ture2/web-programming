// Unit tests for the render-cycle simulator (site/js/tools/state-effects-engine.js).
//   node --test site/test/
// GOLDEN holds the console of every scenario as recorded from the real React 19.3 (development
// build, site/vendor/react/) in Chromium: each scenario's code compiled with Sucrase, rendered with
// createRoot (wrapped in <StrictMode> for the strict rows), the same clicks and typing at the same
// times. The engine must predict exactly that console.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../js/tools/state-effects-engine.js');

const GOLDEN = [
  { id: 'set-twice', strict: false, out: [
    'render: count = 0',
    'clicked: count is still 0',
    'render: count = 1',
    'clicked: count is still 1',
    'render: count = 2',
  ] },
  { id: 'set-twice', strict: true, out: [
    'render: count = 0',
    'render: count = 0',
    'clicked: count is still 0',
    'render: count = 1',
    'render: count = 1',
    'clicked: count is still 1',
    'render: count = 2',
    'render: count = 2',
  ] },
  { id: 'updater', strict: false, out: [
    'render: count = 0',
    'clicked: count is still 0',
    'render: count = 2',
    'clicked: count is still 2',
    'render: count = 4',
  ] },
  { id: 'batching', strict: false, out: [
    'render: count = 0, label = none',
    'handler finished',
    'render: count = 1, label = clicked',
    'handler finished',
    'render: count = 2, label = clicked',
  ] },
  { id: 'deps', strict: false, out: [
    'render: count = 0, text = ""',
    'A (no array): after every render',
    'B ([]): after the first render only',
    'C ([count]): count is 0',
    'render: count = 1, text = ""',
    'A (no array): after every render',
    'C ([count]): count is 1',
    'render: count = 1, text = "a"',
    'A (no array): after every render',
  ] },
  { id: 'deps', strict: true, out: [
    'render: count = 0, text = ""',
    'render: count = 0, text = ""',
    'A (no array): after every render',
    'B ([]): after the first render only',
    'C ([count]): count is 0',
    'A (no array): after every render',
    'B ([]): after the first render only',
    'C ([count]): count is 0',
    'render: count = 1, text = ""',
    'render: count = 1, text = ""',
    'A (no array): after every render',
    'C ([count]): count is 1',
    'render: count = 1, text = "a"',
    'render: count = 1, text = "a"',
    'A (no array): after every render',
  ] },
  { id: 'chat-room', strict: false, out: [
    'render: room = general',
    'connect to general',
    'render: room = travel',
    'disconnect from general',
    'connect to travel',
    'disconnect from travel',
  ] },
  { id: 'chat-room', strict: true, out: [
    'render: room = general',
    'render: room = general',
    'connect to general',
    'disconnect from general',
    'connect to general',
    'render: room = travel',
    'render: room = travel',
    'disconnect from general',
    'connect to travel',
    'disconnect from travel',
  ] },
  { id: 'no-cleanup', strict: false, out: [
    'render: seconds = 0',
    'tick',
    'render: seconds = 1',
    'tick',
    'tick',
  ] },
  { id: 'no-cleanup', strict: true, out: [
    'render: seconds = 0',
    'render: seconds = 0',
    'tick',
    'tick',
    'render: seconds = 2',
    'render: seconds = 2',
    'tick',
    'tick',
    'tick',
    'tick',
  ] },
  { id: 'stale-interval', strict: false, out: [
    'render: count = 0',
    'render: count = 1',
    'tick: the interval sees count = 0',
    'render: count = 2',
    'tick: the interval sees count = 0',
  ] },
  { id: 'interval-deps', strict: false, out: [
    'render: count = 0',
    'start interval (count = 0)',
    'render: count = 1',
    'clear interval (count = 0)',
    'start interval (count = 1)',
    'tick: count = 1',
    'render: count = 2',
    'clear interval (count = 1)',
    'start interval (count = 2)',
    'tick: count = 2',
  ] },
  { id: 'interval-updater', strict: false, out: [
    'render: seconds = 0',
    'render: seconds = 1',
    'render: seconds = 2',
    'render: seconds = 3',
  ] },
  { id: 'strict-mount', strict: true, out: [
    'render',
    'render',
    'connect',
    'disconnect',
    'connect',
  ] },
  { id: 'fetch-abort', strict: false, out: [
    'render: query = "e", 0 tasks',
    'fetch "e"',
    'render: query = "en", 0 tasks',
    'cleanup: abort "e"',
    'fetch "en"',
    '"e" was aborted',
    'response for "en": 1 tasks',
    'render: query = "en", 1 tasks',
  ] },
  { id: 'fetch-race', strict: false, out: [
    'render: query = "e", 0 tasks',
    'fetch "e"',
    'render: query = "en", 0 tasks',
    'fetch "en"',
    'response for "en": 1 tasks',
    'render: query = "en", 1 tasks',
    'response for "e": 4 tasks',
    'render: query = "en", 4 tasks',
  ] },
  { id: 'fetch-race', strict: true, out: [
    'render: query = "e", 0 tasks',
    'render: query = "e", 0 tasks',
    'fetch "e"',
    'fetch "e"',
    'render: query = "en", 0 tasks',
    'render: query = "en", 0 tasks',
    'fetch "en"',
    'response for "en": 1 tasks',
    'render: query = "en", 1 tasks',
    'render: query = "en", 1 tasks',
    'response for "e": 4 tasks',
    'response for "e": 4 tasks',
    'render: query = "en", 4 tasks',
    'render: query = "en", 4 tasks',
  ] },
];

for (const g of GOLDEN) {
  test(`${g.id}${g.strict ? ' (StrictMode)' : ''}: the console matches real React`, () => {
    assert.deepEqual(E.run(g.id, { strict: g.strict }).out, g.out);
  });
}

test('every scenario has a golden console', () => {
  for (const s of E.SCENARIOS) assert.ok(GOLDEN.some((g) => g.id === s.id), s.id);
});

const KINDS = new Set(['event', 'queue', 'process', 'bail', 'render', 'commit', 'skip', 'cleanup', 'effect', 'log', 'timer', 'network', 'unmount', 'ignored', 'strict']);

test('every scenario, with and without StrictMode: steps are well formed', () => {
  for (const s of E.SCENARIOS) {
    for (const strict of [false, true]) {
      const r = E.run(s.id, { strict });
      assert.ok(r.steps.length > 2 && r.steps.length < E.MAX_STEPS, s.id);
      let t = 0;
      let printed = 0;
      for (const st of r.steps) {
        assert.ok(KINDS.has(st.kind), `${s.id}: kind ${st.kind}`);
        assert.ok(st.text && typeof st.text === 'string', s.id);
        assert.ok(st.line === null || (Number.isInteger(st.line) && st.line >= 0 && st.line < s.code.length), `${s.id}: line ${st.line}`);
        assert.ok(st.t >= t, `${s.id}: time goes forwards`);
        t = st.t;
        printed += st.logs.length;
        if (st.logs.length) assert.deepEqual(st.out.slice(-st.logs.length), st.logs);
      }
      assert.equal(printed, r.out.length, `${s.id}: every console line belongs to one step`);
      assert.deepEqual(r.steps[r.steps.length - 1].out, r.out);
    }
  }
});

test('ids are unique and every scenario has code, a title and a note', () => {
  const ids = E.SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of E.SCENARIOS) {
    assert.ok(s.title && s.note && s.group, s.id);
    assert.ok(s.code.length > 5 && s.code.length <= 40, `${s.id}: ${s.code.length} lines`);
  }
});

test('state is a snapshot: two set calls, the handler still logs the old value', () => {
  const r = E.run('set-twice');
  assert.equal(r.steps.filter((s) => s.kind === 'queue').length, 4);
  assert.equal(r.steps.filter((s) => s.kind === 'render').length, 3);
  assert.equal(r.steps[r.steps.length - 1].state.count, 2);
});

test('batching: one render per click with two state variables', () => {
  assert.equal(E.run('batching').steps.filter((s) => s.kind === 'render').length, 3);
});

test('dependencies: B is skipped after the first render, C only when count does not change', () => {
  const skips = E.run('deps').steps.filter((s) => s.kind === 'skip').map((s) => s.text);
  assert.equal(skips.filter((x) => x.includes('effect B')).length, 2);
  assert.equal(skips.filter((x) => x.includes('effect C')).length, 1);
});

test('cleanup runs before the next effect and on unmount', () => {
  const kinds = E.run('chat-room').steps.filter((s) => ['cleanup', 'effect', 'unmount'].includes(s.kind)).map((s) => s.kind);
  assert.deepEqual(kinds, ['effect', 'cleanup', 'effect', 'unmount', 'cleanup']);
});

test('after unmount, a leaked interval still runs and its set calls are ignored', () => {
  const r = E.run('no-cleanup');
  assert.ok(r.steps.some((s) => s.kind === 'ignored'));
  assert.equal(r.steps[r.steps.length - 1].mounted, false);
});

test('StrictMode runs setup, cleanup, setup on mount only', () => {
  const r = E.run('chat-room', { strict: true });
  const first = r.steps.findIndex((s) => s.kind === 'event');
  const mount = r.steps.slice(0, first).filter((s) => s.kind === 'cleanup' || s.kind === 'effect').map((s) => s.kind);
  assert.deepEqual(mount, ['effect', 'cleanup', 'effect']);
});

test('an aborted request never calls setTasks; without a cleanup the old response wins', () => {
  const r = E.run('fetch-abort');
  assert.equal(r.steps.filter((s) => s.kind === 'queue').length, 2);
  assert.equal(r.steps[r.steps.length - 1].state.tasks.length, 1);
  assert.equal(E.run('fetch-race').steps.at(-1).state.tasks.length, 4);
});

/* ---- Challenges -------------------------------------------------------------------------- */

test('challenges: unique ids, existing scenarios, the right log appears exactly once', () => {
  const ids = E.CHALLENGES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of E.CHALLENGES) {
    assert.ok(E.byId(c.scenario), c.id);
    assert.ok(c.title && c.why, c.id);
    const right = JSON.stringify(E.answer(c.id));
    const all = E.choices(c.id).map((x) => JSON.stringify(x));
    assert.equal(new Set(all).size, all.length, `${c.id}: choices are distinct`);
    assert.equal(all.filter((x) => x === right).length, 1, c.id);
    const k = all.indexOf(right);
    assert.equal(E.check(c.id, k), true, c.id);
    all.forEach((_, j) => { if (j !== k) assert.equal(E.check(c.id, j), false, c.id); });
  }
});

test('challenges: the right answer is not always in the same place', () => {
  const places = new Set(E.CHALLENGES.map((c) => E.choices(c.id).map((x) => JSON.stringify(x)).indexOf(JSON.stringify(E.answer(c.id)))));
  assert.ok(places.size >= 3);
});
