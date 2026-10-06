// Unit tests for the fetch-lab engine (site/js/tools/data-fetching-engine.js): latency model,
// timeline, race analysis, challenge checks, and the integrity of the scenarios (each one compiles
// with the vendored Sucrase).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const E = require('../js/tools/data-fetching-engine.js');
const R = require('../js/react-runner.js');

const box = {};
vm.runInNewContext(readFileSync(new URL('../vendor/sucrase/sucrase.js', import.meta.url), 'utf8'), { window: box });

/* Builds a timeline from compact events: ['start', id, t, path, extra] / ['end', id, t, status, extra] … */
function timeline(events) {
  let tl = E.createTimeline();
  for (const [type, id, t, a, extra = {}] of events) {
    const ev = { type, id, t, ...extra };
    if (type === 'start') { ev.path = a; ev.method = extra.method || 'GET'; }
    if (type === 'end') ev.status = a;
    tl = E.applyEvent(tl, ev);
  }
  return E.rows(tl);
}

/* Six requests typed 120 ms apart, with the skewed latencies of latencyFor. */
function typed(word, settings, finish = (q) => ({ type: 'end' })) {
  const events = [];
  const ends = [];
  for (let k = 1; k <= word.length; k++) {
    const q = word.slice(0, k);
    const start = (k - 1) * 120;
    const path = `/api/tasks?search=${q}`;
    events.push(['start', k, start, path]);
    ends.push([k, start + E.latencyFor(path, settings), q]);
  }
  ends.sort((a, b) => a[1] - b[1]).forEach(([id, t, q]) => {
    const f = finish(q, id);
    if (f.type === 'cancel') events.push(['cancel', id, t]);
    else events.push(['end', id, t, 200, { count: f.count }]);
  });
  return events;
}

test('latencyFor: base latency, plus 250 ms per missing character of a short search when skewed', () => {
  assert.equal(E.latencyFor('/api/tasks', { latency: 400 }), 400);
  assert.equal(E.latencyFor('/api/tasks?search=s', { latency: 300 }), 300);
  assert.equal(E.latencyFor('/api/tasks?search=s', { latency: 300, skew: true }), 300 + 5 * 250);
  assert.equal(E.latencyFor('/api/tasks?search=status', { latency: 300, skew: true }), 300);
  assert.equal(E.latencyFor('/api/tasks?search=a%20b', { latency: 0, skew: true }), 3 * 250);
  assert.equal(E.latencyFor('/api/tasks?page=2', { latency: 0, skew: true }), 0);
  assert.equal(E.latencyFor('/api/tasks', null), 0);
});

test('latencyFor has no outside references (its source is copied into the preview frame)', () => {
  const copy = vm.runInNewContext(`(${E.latencyFor.toString()})`);
  assert.equal(copy('/api/tasks?search=st', { latency: 100, skew: true }), 100 + 4 * 250);
});

test('timeline: start, end, cancel, fail; events for unknown or finished requests are ignored', () => {
  const rs = timeline([
    ['start', 1, 0, '/api/tasks?page=2&limit=2'],
    ['start', 2, 10, '/api/tasks?search=a+b', { auth: true }],
    ['start', 3, 20, '/api/tasks/9', { method: 'delete' }],
    ['end', 1, 600, 200, { total: '5', count: 2 }],
    ['cancel', 2, 50],
    ['end', 2, 700, 200],
    ['fail', 3, 80, null, { error: 'Failed to fetch' }],
    ['end', 99, 100, 200],
    ['start', 4, 900, '/api/tasks'],
  ]);
  assert.equal(rs.length, 4);
  assert.deepEqual(rs.map((r) => r.outcome), ['done', 'cancelled', 'failed', 'pending']);
  assert.equal(rs[0].page, 2);
  assert.equal(rs[0].limit, 2);
  assert.equal(rs[0].total, 5);
  assert.equal(rs[0].count, 2);
  assert.equal(rs[0].duration, 600);
  assert.equal(rs[1].query, 'a b');
  assert.equal(rs[1].auth, true);
  assert.equal(rs[1].end, 50);
  assert.equal(rs[2].method, 'DELETE');
  assert.equal(rs[2].query, null);
  assert.equal(rs[3].duration, null);
  assert.equal(E.settled(rs), false);
  assert.equal(E.settled(rs.slice(0, 3)), true);
});

test('applyEvent never mutates the timeline it receives', () => {
  const tl = E.applyEvent(E.createTimeline(), { type: 'start', id: 1, t: 0, path: '/api/tasks' });
  const before = JSON.stringify(tl);
  E.applyEvent(tl, { type: 'end', id: 1, t: 5, status: 200 });
  assert.equal(JSON.stringify(tl), before);
});

test('bars place requests on a common axis', () => {
  const rs = timeline([['start', 1, 100, '/a'], ['start', 2, 300, '/b'], ['end', 1, 500, 200], ['end', 2, 500, 200]]);
  const b = E.bars(rs);
  assert.equal(b.span, 400);
  assert.deepEqual(b.list.map((x) => [x.from, x.width]), [[0, 100], [50, 50]]);
  assert.deepEqual(E.bars([]), { span: 0, list: [] });
});

test('race: unprotected fast typing lets the response for "s" arrive last and win', () => {
  const settings = { latency: 300, skew: true };
  const rs = timeline(typed('status', settings, (q) => ({ count: q === 'status' ? 1 : 3 })));
  const shown = ['Write the API skeleton', 'Write supertest tests', 'Document the endpoints'];
  const a = E.analyzeRace(rs, 'status', shown);
  assert.equal(a.verdict, 'stale-won');
  assert.equal(a.labels[6], 'latest');
  assert.equal(a.labels[1], 'won');
});

test('race: the same responses, but the screen shows the latest → stale ones are "ignored"', () => {
  const rs = timeline(typed('status', { latency: 300, skew: true }, (q) => ({ count: q === 'status' ? 1 : 3 })));
  const a = E.analyzeRace(rs, 'status', ['Return the right status codes']);
  assert.equal(a.verdict, 'latest');
  assert.ok(Object.values(a.labels).includes('ignored'));
});

test('race: with AbortController the older requests are cancelled', () => {
  const rs = timeline(typed('status', { latency: 300, skew: true }, (q) => (q === 'status' ? { count: 1 } : { type: 'cancel' })));
  const a = E.analyzeRace(rs, 'status', ['Return the right status codes']);
  assert.equal(a.verdict, 'latest');
  assert.equal(Object.values(a.labels).filter((l) => l === 'cancelled').length, 5);
});

test('race: none, pending, mismatch', () => {
  assert.equal(E.analyzeRace(timeline([['start', 1, 0, '/api/tasks'], ['end', 1, 9, 200]]), '', []).verdict, 'none');
  assert.equal(E.analyzeRace(timeline([['start', 1, 0, '/api/tasks?search=x']]), 'x', []).verdict, 'pending');
  const rs = timeline([['start', 1, 0, '/api/tasks?search=x'], ['end', 1, 9, 200, { count: 2 }]]);
  assert.equal(E.analyzeRace(rs, 'x', ['x one']).verdict, 'mismatch');
  assert.equal(E.analyzeRace(rs, 'x', ['x one', 'x two']).verdict, 'latest');
});

/* ---- Challenges --------------------------------------------------------------------------- */

const snap = (o = {}) => ({ text: '', items: [], buttons: [], alerts: [], busy: false, invalid: [], password: false, input: '', ...o });
const ctx = (scenario, rows, s, extra = {}) => ({ scenario, rows, snap: snap(s), settings: E.settingsFor(scenario), typed: '', ...extra });
const C = Object.fromEntries(E.CHALLENGES.map((c) => [c.id, c]));

test('error-state: a failure plus an alert on screen; not while loading', () => {
  const rs = timeline([['start', 1, 0, '/api/tasks?search='], ['end', 1, 9, 500]]);
  assert.equal(C['error-state'].check(ctx('states', rs, { alerts: ['Could not load'] })), true);
  assert.equal(C['error-state'].check(ctx('states', rs, { alerts: [] })), false);
  const failed = timeline([['start', 1, 0, '/api/tasks?search='], ['fail', 1, 9]]);
  assert.equal(C['error-state'].check(ctx('states', failed, { alerts: ['x'] })), true);
  assert.equal(C['error-state'].check(ctx('states', failed, { alerts: ['x'], busy: true })), false);
});

test('empty-state: a 200 with no items and the empty message', () => {
  const rs = timeline([['start', 1, 0, '/api/tasks?search=zebra'], ['end', 1, 9, 200, { count: 0 }]]);
  assert.equal(C['empty-state'].check(ctx('states', rs, { text: 'No tasks match "zebra".' })), true);
  assert.equal(C['empty-state'].check(ctx('states', rs, { text: '' })), false);
});

test('stale-wins, stale-loses and debounce read the race and the typing', () => {
  const settings = { latency: 300, skew: true };
  const naive = timeline(typed('status', settings, (q) => ({ count: q === 'status' ? 1 : 3 })));
  const extra = { typed: 'status', settings: { ...E.DEFAULTS, ...settings } };
  assert.equal(C['stale-wins'].check(ctx('race-naive', naive, { input: 'status', items: ['a', 'b', 'c'] }, extra)), true);
  assert.equal(C['stale-wins'].check(ctx('race-naive', naive, { input: 'status', items: ['a', 'b', 'c'] })), false, 'needs the typing');
  const aborted = timeline(typed('status', settings, (q) => (q === 'status' ? { count: 1 } : { type: 'cancel' })));
  assert.equal(C['stale-loses'].check(ctx('race-naive', aborted, { input: 'status', items: ['Return the right status codes'] }, extra)), true);
  assert.equal(C['stale-loses'].check(ctx('race-naive', aborted, { input: 'status', items: ['Return the right status codes'] }, { ...extra, settings: E.DEFAULTS })), false, 'skew must be on');
  assert.equal(C['stale-loses'].check(ctx('race-naive', naive, { input: 'status', items: ['Return the right status codes'] }, extra)), true, 'an ignore flag also counts');
  const once = timeline([['start', 1, 700, '/api/tasks?search=status'], ['end', 1, 1000, 200, { count: 1 }]]);
  assert.equal(C.debounce.check(ctx('debounce', once, { input: 'status', items: ['Return the right status codes'] }, extra)), true);
  assert.equal(C.debounce.check(ctx('debounce', naive, { input: 'status', items: ['Return the right status codes'] }, extra)), false, 'six requests are too many');
});

test('last-page: the last page loaded and Next disabled', () => {
  const rs = timeline([['start', 1, 0, '/api/tasks?page=3&limit=2'], ['end', 1, 9, 200, { total: 5, count: 1 }]]);
  assert.equal(C['last-page'].check(ctx('pagination', rs, { buttons: [{ text: 'Previous', disabled: false }, { text: 'Next', disabled: true }] })), true);
  assert.equal(C['last-page'].check(ctx('pagination', rs, { buttons: [{ text: 'Next', disabled: false }] })), false);
  const two = timeline([['start', 1, 0, '/api/tasks?page=2&limit=2'], ['end', 1, 9, 200, { total: 5, count: 2 }]]);
  assert.equal(C['last-page'].check(ctx('pagination', two, { buttons: [{ text: 'Next', disabled: true }] })), false);
});

test('logout-401: a log-in, then a 401 on a request with a token, then the log-in form again', () => {
  const rs = timeline([
    ['start', 1, 0, '/api/auth/login', { method: 'POST' }], ['end', 1, 5, 200],
    ['start', 2, 10, '/api/tasks', { auth: true }], ['end', 2, 15, 401],
  ]);
  assert.equal(C['logout-401'].check(ctx('login', rs, { password: true, text: 'Your session has expired.' })), true);
  assert.equal(C['logout-401'].check(ctx('login', rs.slice(1), { password: true, text: 'Your session has expired.' })), false);
});

test('field-error: a 400 from a POST and the title field marked invalid', () => {
  const rs = timeline([['start', 1, 0, '/api/tasks', { method: 'POST' }], ['end', 1, 5, 400]]);
  assert.equal(C['field-error'].check(ctx('form', rs, { invalid: ['title'] })), true);
  assert.equal(C['field-error'].check(ctx('form', rs, { invalid: [] })), false);
});

/* ---- Integrity ------------------------------------------------------------------------------ */

test('scenarios: unique ids, valid data, and the code compiles', () => {
  const ids = new Set();
  for (const s of E.SCENARIOS) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    assert.deepEqual(E.validateScenario(s), []);
    const r = R.compile(s.code, box.Sucrase.transform);
    assert.equal(r.ok, true, `${s.id}: ${r.error && r.error.message}`);
  }
});

test('challenges: unique ids, an existing scenario, goal, hint and check', () => {
  const ids = new Set();
  for (const c of E.CHALLENGES) {
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`);
    ids.add(c.id);
    assert.ok(E.scenarioById(c.scenario), `${c.id}: unknown scenario ${c.scenario}`);
    assert.ok(c.title && c.goal && c.hint && typeof c.check === 'function', c.id);
    assert.equal(c.check(ctx(c.scenario, [], {})), false, `${c.id} is solved by nothing`);
  }
});

test('validateScenario catches broken scenarios', () => {
  assert.ok(E.validateScenario({ id: 'X', title: '', code: 'const a = 1;', settings: { speed: 1 } }).length >= 4);
});
