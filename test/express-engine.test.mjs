// Unit tests for the Express simulators (site/js/tools/express-engine.js): the route matcher
// (path-to-regexp 0.1.x semantics of Express 4) and the middleware pipeline.
// The expected values were checked against real Express 4.22 and 5.2 while writing the engine.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../js/tools/express-engine.js');

const R = (method, path, extra = {}) => ({ method, path, contentType: '', auth: '', body: '', ...extra });
const JSON_CT = 'application/json';
const run = (preset, req, version = 4, edit) => {
  const layers = E.presetLayers(preset);
  if (edit) edit(layers);
  return E.simulate(layers, req, { version });
};
const header = (r, name) => (r.response.headers.find(([k]) => k.toLowerCase() === name.toLowerCase()) || [])[1];
const step = (r, id) => r.steps.find((s) => s.id === id);
const plain = (o) => JSON.parse(JSON.stringify(o));

/* ---- Paths and the route matcher ---------------------------------------------------- */

test('compile: the same regular expression as Express 4', () => {
  assert.equal(E.compile('/tasks/:id').re.source, String.raw`^\/tasks(?:\/([^/]+?))\/?$`);
  assert.equal(E.compile('/tasks/:id').re.flags, 'i');
  assert.deepEqual(E.compile('/posts/:year/:month?').keys.map((k) => [k.name, k.optional]), [['year', false], ['month', true]]);
  assert.equal(E.compile('/api', { end: false }).re.source, '^\\/api\\/?(?=\\/|$)');
});

test('matchPath: params are decoded strings; trailing slash and case are ignored', () => {
  assert.deepEqual(E.matchPath('/tasks/:id', '/TASKS/7/').params, { id: '7' });
  assert.deepEqual(E.matchPath('/tasks/:id', '/tasks/a%20b').params, { id: 'a b' });
  assert.equal(E.matchPath('/tasks/:id', '/tasks/7/x'), null);
  assert.equal(E.matchPath('/tasks/:id', '/tasks/'), null);
  assert.deepEqual(plain(E.matchPath('/posts/:year/:month?', '/posts/2024').params), { year: '2024' });
  assert.ok('month' in E.matchPath('/posts/:year/:month?', '/posts/2024').params);
  assert.deepEqual(E.matchPath('/files/*', '/files/a/b.txt').params, { 0: 'a/b.txt' });
  assert.deepEqual(E.matchPath('/flights/:from-:to', '/flights/MAD-LHR').params, { from: 'MAD', to: 'LHR' });
  assert.throws(() => E.matchPath('/p/:id', '/p/%E0%A4%A'), /Failed to decode param/);
});

test('matchPath: app.use prefixes end at a "/" or at the end', () => {
  assert.equal(E.matchPath('/api', '/api/tasks', false).path, '/api');
  assert.equal(E.matchPath('/api', '/api', false).path, '/api');
  assert.equal(E.matchPath('/api', '/apiary', false), null);
  assert.equal(E.matchPath('/', '/anything', false).path, '');
});

test('checkPattern: rejects what this tool does not model', () => {
  assert.equal(E.checkPattern('/tasks/:id'), '');
  assert.equal(E.checkPattern('/files/*'), '');
  assert.match(E.checkPattern('tasks'), /starts with/);
  assert.match(E.checkPattern('/a(b)'), /supports/);
  assert.match(E.checkPattern('/ab?cd'), /optional/);
  assert.match(E.checkPattern('/x/:'), /parameter name/);
});

test('parseQuery: strings, repeated keys, brackets, + as space', () => {
  assert.deepEqual(plain(E.parseQuery('?tag=a&tag=b&x[]=1&o[k]=v&s=hello+world&e=&n=%C3%B1&flag')),
    { tag: ['a', 'b'], x: ['1'], o: { k: 'v' }, s: 'hello world', e: '', n: 'ñ', flag: '' });
  assert.deepEqual(plain(E.parseQuery('page=2&done=true')), { page: '2', done: 'true' });
  assert.deepEqual(plain(E.parseQuery('__proto__=x&toString=y')), {});
});

test('parseUrl: strips the origin and the fragment', () => {
  const u = E.parseUrl('http://localhost:3000/tasks?done=true#top');
  assert.equal(u.pathname, '/tasks');
  assert.equal(u.search, '?done=true');
  assert.deepEqual(u.notes, ['origin', 'fragment']);
  assert.ok(E.parseUrl('tasks').error);
});

test('matchRoutes: /tasks/:id registered first shadows /tasks/stats', () => {
  const routes = E.RT_PRESETS.find((p) => p.id === 'order').routes;
  const m = E.matchRoutes(routes, 'GET', '/tasks/stats');
  assert.equal(m.winner, 1);
  assert.deepEqual(m.req.params, { id: 'stats' });
  assert.equal(m.results[2].status, 'shadowed');
  assert.equal(m.results[0].status, 'path');
  const fixed = E.matchRoutes([routes[0], routes[2], routes[1]], 'GET', '/tasks/stats');
  assert.equal(fixed.winner, 1);
  assert.equal(fixed.results[2].status, 'shadowed');
});

test('matchRoutes: a mounted router strips its prefix (req.baseUrl / req.path)', () => {
  const routes = [{ method: 'GET', mount: '/api/tasks', path: '/' }, { method: 'GET', mount: '/api/tasks', path: '/:id' }];
  const m = E.matchRoutes(routes, 'GET', '/API/Tasks/7/?fields=title');
  assert.equal(m.winner, 1);
  assert.equal(m.req.baseUrl, '/API/Tasks');
  assert.equal(m.req.path, '/7/');
  assert.equal(m.req.originalUrl, '/API/Tasks/7/?fields=title');
  assert.deepEqual(m.req.query, { fields: 'title' });
  assert.equal(E.matchRoutes(routes, 'GET', '/api/tasksX').status, 404);
  assert.equal(E.matchRoutes(routes, 'GET', '/api/tasks//').winner, 0);
});

test('matchRoutes: mount params are not in req.params (no mergeParams)', () => {
  const m = E.matchRoutes([{ method: 'GET', mount: '/users/:uid', path: '/tasks/:taskId' }], 'GET', '/users/5/tasks/9');
  assert.deepEqual(m.req.params, { taskId: '9' });
  assert.deepEqual(m.req.mountParams, { uid: '5' });
});

test('matchRoutes: wrong method gives 404 (Express sends no 405), HEAD uses GET', () => {
  const routes = [{ method: 'GET', mount: '', path: '/tasks' }];
  const m = E.matchRoutes(routes, 'DELETE', '/tasks');
  assert.equal(m.status, 404);
  assert.equal(m.results[0].status, 'method');
  assert.equal(E.matchRoutes(routes, 'HEAD', '/tasks').winner, 0);
});

test('matchRoutes: segment-level reasons and a 400 for a broken escape', () => {
  const m = E.matchRoutes([{ method: 'GET', mount: '', path: '/users/:id' }, { method: 'GET', mount: '', path: '/tasks/:id' }], 'GET', '/tasks/7/edit');
  assert.match(m.results[0].text, /Segment 1: `tasks` is not `users`/);
  assert.match(m.results[1].text, /2 segments; `\/tasks\/7\/edit` has 3/);
  const d = E.matchRoutes([{ method: 'GET', mount: '', path: '/p/:id' }, { method: 'GET', mount: '', path: '*' }], 'GET', '/p/%E0%A4%A');
  assert.equal(d.status, 400);
  assert.equal(d.results[1].status, 'error');
});

/* ---- The middleware pipeline ---------------------------------------------------------- */

test('lab: POST /tasks with a JSON body → 201 from the router, one log line', () => {
  const r = run('lab', R('POST', '/tasks', { contentType: JSON_CT, body: '{"title":"Buy milk"}' }));
  assert.equal(r.final.kind, 'response');
  assert.equal(r.response.status, 201);
  assert.equal(header(r, 'Content-Type'), 'application/json; charset=utf-8');
  assert.equal(header(r, 'X-Powered-By'), 'Express');
  assert.equal(r.response.body, '{"id":4,"title":"Buy milk","done":false}');
  assert.equal(header(r, 'Content-Length'), '40');
  assert.deepEqual(r.console.map((l) => l.text), ['POST /tasks']);
  assert.equal(r.response.by, 'tasks-create');
  assert.equal(step(r, 'tasks-list').reason, 'method');
  assert.equal(step(r, 'health').reason, 'path');
});

test('lab: an unknown path reaches the JSON 404 catch-all; without it, Express says Cannot GET', () => {
  const r = run('lab', R('GET', '/nope?x=1'));
  assert.equal(r.response.status, 404);
  assert.equal(r.response.body, '{"error":"Not found: GET /nope?x=1"}');
  const d = run('lab', R('GET', '/nope?x=1'), 4, (ls) => { ls.find((l) => l.id === 'notFound').on = false; });
  assert.equal(d.response.status, 404);
  assert.equal(d.response.by, 'express');
  assert.match(d.response.body, /<pre>Cannot GET \/nope<\/pre>/);
  assert.equal(header(d, 'Content-Type'), 'text/html; charset=utf-8');
});

test('express.json(): missing → req.body undefined; wrong Content-Type → {} (v4) or undefined (v5); bad JSON → 400', () => {
  const missing = run('bug-json', R('POST', '/tasks', { contentType: JSON_CT, body: '{"title":"x"}' }));
  assert.equal(missing.response.status, 500);
  assert.match(missing.response.body, /Cannot destructure property 'title' of 'req.body' as it is undefined/);
  assert.equal(step(missing, 'tasks-create').actions[0].type, 'throw');
  const noType4 = run('lab', R('POST', '/tasks', { body: '{"title":"x"}' }));
  assert.equal(noType4.response.status, 400);
  assert.deepEqual(noType4.req.body, {});
  const noType5 = run('lab', R('POST', '/tasks', { body: '{"title":"x"}' }), 5);
  assert.equal(noType5.response.status, 500);
  assert.equal(noType5.req.body, undefined);
  const bad = run('lab', R('POST', '/tasks', { contentType: JSON_CT, body: '{title: x}' }));
  assert.equal(bad.response.status, 400);
  assert.equal(bad.response.by, 'errors');
  assert.equal(step(bad, 'logger').reason, 'error-mw');
  assert.equal(step(bad, 'tasks').reason, 'error-router');
  const str = run('lab', R('POST', '/tasks', { contentType: JSON_CT, body: '"str"' }));
  assert.equal(str.response.status, 400);
  assert.match(str.response.body, /is not valid JSON/);
});

test('an error handler with 3 parameters is skipped: Express answers with its HTML 500 page', () => {
  const r = run('bug-err3', R('GET', '/boom'));
  assert.equal(r.response.status, 500);
  assert.equal(r.response.by, 'express');
  assert.match(r.response.body, /<pre>Error: Boom!<br>/);
  assert.equal(step(r, 'errors').reason, 'error-mw');
  assert.equal(step(r, 'errors').arity, 3);
  // reached without an error, it runs as ordinary middleware with its arguments shifted
  const n = run('bug-err3', R('GET', '/nope'), 4, (ls) => { ls.find((l) => l.id === 'notFound').on = false; });
  assert.equal(n.response.status, 500);
  assert.match(n.response.body, /TypeError: res.status is not a function/);
});

test('a sync throw and next(err) both reach the 4-parameter error handler', () => {
  const a = run('lab', R('GET', '/boom'));
  const b = run('lab', R('GET', '/boom'), 4, (ls) => { ls.find((l) => l.id === 'boom').variant = 'throw'; });
  [a, b].forEach((r) => {
    assert.equal(r.response.status, 500);
    assert.equal(r.response.body, '{"error":"Boom!"}');
    assert.equal(step(r, 'notFound').reason, 'error-mw');
  });
  assert.equal(step(b, 'boom').actions[0].type, 'throw');
});

test('a 404 catch-all registered before the routes answers everything', () => {
  const r = run('bug-404', R('GET', '/health'));
  assert.equal(r.response.status, 404);
  assert.equal(step(r, 'health'), undefined);
});

test('middleware that forgets next() leaves the request hanging', () => {
  const r = run('bug-next', R('GET', '/health'));
  assert.equal(r.final.kind, 'hang');
  assert.equal(r.final.by, 'logger');
  assert.equal(step(r, 'logger').hang, true);
  assert.equal(r.response, null);
});

test('async errors: Express 4 crashes the process, Express 5 forwards them; try/catch works in both', () => {
  const v4 = run('bug-async', R('GET', '/stats'), 4);
  assert.equal(v4.final.kind, 'crash');
  assert.match(v4.console[v4.console.length - 1].text, /Database is offline/);
  const v5 = run('bug-async', R('GET', '/stats'), 5);
  assert.equal(v5.response.status, 500);
  assert.equal(v5.response.body, '{"error":"Database is offline"}');
  const safe = run('bug-async', R('GET', '/stats'), 4, (ls) => { ls.find((l) => l.id === 'stats').variant = 'safe'; });
  assert.equal(safe.response.status, 500);
});

test('two responses: the client gets the first; the second throws ERR_HTTP_HEADERS_SENT', () => {
  const r = run('bug-double', R('POST', '/tasks', { contentType: JSON_CT, body: '{}' }));
  assert.equal(r.response.status, 400);
  assert.equal(r.headersSentError, true);
  const thrown = step(r, 'tasks-create').actions.find((a) => a.type === 'throw');
  assert.equal(thrown.err.code, 'ERR_HTTP_HEADERS_SENT');
  assert.equal(r.final.closed, true);
  const fixed = run('lab', R('POST', '/tasks', { contentType: JSON_CT, body: '{}' }));
  assert.equal(fixed.headersSentError, false);
});

test('guards: order decides what they protect; a valid token sets req.user', () => {
  const open = run('bug-auth', R('GET', '/api/me'));
  assert.equal(open.response.status, 200);
  assert.equal(open.response.body, '{}');
  const locked = run('api', R('GET', '/api/me'));
  assert.equal(locked.response.status, 401);
  assert.equal(header(locked, 'Access-Control-Allow-Origin'), '*');
  const ok = run('api', R('GET', '/api/me', { auth: `Bearer ${E.TOKEN}` }));
  assert.equal(ok.response.body, '{"user":{"id":1,"name":"Ana"}}');
  assert.equal(run('api', R('GET', '/api/health')).response.status, 200);
});

test('express.static serves files and falls through to the API', () => {
  const page = run('site', R('GET', '/'));
  assert.equal(page.response.status, 200);
  assert.equal(header(page, 'Content-Type'), 'text/html; charset=UTF-8');
  assert.equal(run('site', R('GET', '/api/tasks')).response.by, 'api-list');
  assert.equal(run('site', R('POST', '/index.html')).response.status, 404);
});

test('router: req.baseUrl inside, restored outside; params from the route', () => {
  const r = run('lab', R('GET', '/tasks/2'));
  assert.equal(r.response.status, 200);
  assert.equal(step(r, 'tasks').baseUrl, '/tasks');
  assert.equal(step(r, 'tasks-get').path, '/2');
  assert.deepEqual(r.req.params, { id: '2' });
  assert.equal(run('lab', R('GET', '/tasks/99')).response.status, 404);
});

test('every step has a number and an explanation', () => {
  E.PRESETS.forEach((p) => p.requests.forEach((q) => {
    const r = run(p.id, q);
    r.steps.forEach((s, k) => { assert.equal(s.n, k + 1); assert.ok(s.explain.length > 10, `${p.id} ${s.id}`); });
    assert.ok(r.final.explain.length > 10);
  }));
});

/* ---- Challenges: unsolved at the start, solved by the intended fix --------------------- */

const challengeRun = (c, edit, reqEdit, version = 4) => {
  const layers = E.presetLayers(c.preset);
  const st = { layers, request: { ...c.request }, version };
  if (edit) edit(layers, st);
  if (reqEdit) reqEdit(st.request);
  const sim = (q) => E.simulate(layers, q, { version: st.version });
  return c.check(sim(st.request), st, sim);
};
const move = (ls, id, to) => { const k = ls.findIndex((l) => l.id === id); const [l] = ls.splice(k, 1); ls.splice(to, 0, l); };
const byId = (ls, id) => ls.find((l) => l.id === id) || ls.flatMap((l) => l.routes || []).find((r) => r.id === id);

const FIXES = {
  'mw-create': [(ls) => { byId(ls, 'json').on = true; }, (q) => { q.contentType = JSON_CT; }],
  'mw-guard': [(ls) => move(ls, 'auth', 4)],
  'mw-token': [null, (q) => { q.auth = `Bearer ${E.TOKEN}`; }],
  'mw-hang': [(ls) => { byId(ls, 'logger').variant = 'next'; }],
  'mw-errjson': [(ls) => { byId(ls, 'errors').variant = '4'; }],
  'mw-order': [(ls) => move(ls, 'notFound', ls.length - 2)],
  'mw-async': [(ls) => { byId(ls, 'stats').variant = 'safe'; }],
  'mw-double': [(ls) => { byId(ls, 'tasks-create').variant = 'return'; }],
  'mw-badjson': [null, (q) => { q.body = '{"title":"Buy milk"'; }],
};

test('middleware challenges: 9, unique ids, unsolved at the start, solvable', () => {
  assert.equal(E.MW_CHALLENGES.length, 9);
  assert.equal(new Set(E.MW_CHALLENGES.map((c) => c.id)).size, 9);
  E.MW_CHALLENGES.forEach((c) => {
    assert.equal(challengeRun(c), false, `${c.id} solved at the start`);
    const [edit, reqEdit] = FIXES[c.id];
    assert.equal(challengeRun(c, edit, reqEdit), true, `${c.id} not solved by its fix`);
  });
  // the shortcuts do not count
  const hang = E.MW_CHALLENGES.find((c) => c.id === 'mw-hang');
  assert.equal(challengeRun(hang, (ls) => { byId(ls, 'logger').on = false; }), false);
  const order = E.MW_CHALLENGES.find((c) => c.id === 'mw-order');
  assert.equal(challengeRun(order, (ls) => { byId(ls, 'notFound').on = false; }), false);
  const create = E.MW_CHALLENGES.find((c) => c.id === 'mw-create');
  assert.equal(challengeRun(create, (ls) => { byId(ls, 'json').on = true; }), false);
  // Express 5 also fixes the async challenge
  const asyncC = E.MW_CHALLENGES.find((c) => c.id === 'mw-async');
  assert.equal(challengeRun(asyncC, null, null, 5), true);
});

test('route challenges: unsolved at the start, solvable', () => {
  const st = (c, patch = {}) => {
    const p = E.RT_PRESETS.find((x) => x.id === c.preset);
    return { routes: JSON.parse(JSON.stringify(p.routes)), method: c.method || p.method, url: c.urlStart || p.url, ...patch };
  };
  const ok = (c, s) => c.check(E.matchRoutes(s.routes, s.method, s.url), s);
  const [stats, url, del] = E.RT_CHALLENGES;
  assert.equal(ok(stats, st(stats)), false);
  const s1 = st(stats); s1.routes = [s1.routes[0], s1.routes[2], s1.routes[1]];
  assert.equal(ok(stats, s1), true);
  assert.equal(ok(url, st(url)), false);
  assert.equal(ok(url, st(url, { url: '/users/7/tasks/42?done=true' })), true);
  assert.equal(ok(del, st(del)), false);
  const s3 = st(del); s3.routes.push({ method: 'DELETE', mount: '/api/tasks', path: '/:id' });
  assert.equal(ok(del, s3), true);
});
