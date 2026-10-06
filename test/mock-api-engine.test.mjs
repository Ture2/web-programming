// Unit tests for the mock REST API behind the api-builder tool (site/js/tools/mock-api-engine.js),
// plus an integrity check of the status-chooser scenarios (site/data/en/rest.js).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Api = require('../js/tools/mock-api-engine.js');

const JSON_H = [['Content-Type', 'application/json']];
const ADMIN = [...JSON_H, ['Authorization', 'Bearer admin-token']];

/* Sends one request; returns the entry and keeps the new state in `box.s`. */
function client() {
  const box = { s: Api.createState(), history: [] };
  box.send = (method, path, { headers = [], body = '' } = {}) => {
    const e = Api.request(box.s, { method, path, headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
    box.s = e.state;
    box.history.push(e);
    return e;
  };
  return box;
}
const header = (e, name) => (e.res.headers.find(([k]) => k === name) || [])[1];

test('GET /api/tasks lists the seed tasks as DTOs (camelCase, no snake_case)', () => {
  const c = client();
  const e = c.send('GET', '/api/tasks');
  assert.equal(e.res.status, 200);
  assert.equal(e.res.data.length, 5);
  assert.deepEqual(Object.keys(e.res.data[0]), ['id', 'title', 'done', 'userId', 'createdAt']);
  assert.equal(header(e, 'X-Total-Count'), '5');
  assert.match(header(e, 'Content-Type'), /^application\/json/);
});

test('request() never mutates the state it receives', () => {
  const s = Api.createState();
  const before = JSON.stringify(s);
  Api.request(s, { method: 'DELETE', path: '/api/tasks/1' });
  Api.request(s, { method: 'POST', path: '/api/tasks', headers: JSON_H, body: '{"title":"x"}' });
  assert.equal(JSON.stringify(s), before);
});

test('filter, search, sort and order in the query string', () => {
  const c = client();
  const undone = c.send('GET', '/api/tasks?done=false');
  assert.deepEqual(undone.res.data.map((t) => t.id), [2, 3, 4]);
  assert.deepEqual(c.send('GET', '/api/tasks?userId=2').res.data.map((t) => t.id), [3, 4]);
  assert.deepEqual(c.send('GET', '/api/tasks?search=TEST').res.data.map((t) => t.id), [4]);
  assert.deepEqual(c.send('GET', '/api/tasks?sort=createdAt&order=desc').res.data.map((t) => t.id), [5, 4, 3, 2, 1]);
  assert.deepEqual(c.send('GET', '/api/tasks?sort=title').res.data.map((t) => t.title)[0], 'Add full CRUD');
});

test('pagination: page/limit and offset/limit give the same window, metadata in headers', () => {
  const c = client();
  const p = c.send('GET', '/api/tasks?page=2&limit=2');
  assert.equal(p.res.status, 200);
  assert.deepEqual(p.res.data.map((t) => t.id), [3, 4]);
  assert.equal(header(p, 'X-Total-Count'), '5');
  assert.match(header(p, 'Link'), /page=3&limit=2>; rel="next"/);
  assert.match(header(p, 'Link'), /page=1&limit=2>; rel="prev"/);
  const o = c.send('GET', '/api/tasks?offset=2&limit=2');
  assert.deepEqual(o.res.data.map((t) => t.id), [3, 4]);
  const past = c.send('GET', '/api/tasks?page=9&limit=2');
  assert.equal(past.res.status, 200);
  assert.deepEqual(past.res.data, []);
});

test('malformed query values are rejected with 400 and one error per parameter; unknown names are ignored', () => {
  const c = client();
  const bad = c.send('GET', '/api/tasks?done=maybe&limit=abc&page=0');
  assert.equal(bad.res.status, 400);
  assert.deepEqual(bad.res.data.errors.map((x) => x.field).sort(), ['done', 'limit', 'page']);
  const both = c.send('GET', '/api/tasks?page=1&offset=2');
  assert.equal(both.res.status, 400);
  const unknown = c.send('GET', '/api/tasks?colour=red');
  assert.equal(unknown.res.status, 200);
  assert.ok(unknown.notes.some((n) => n.includes('colour')));
  const clamp = c.send('GET', '/api/tasks?limit=5000');
  assert.equal(clamp.res.status, 200);
  assert.ok(clamp.notes.some((n) => n.includes('clamped')));
});

test('POST creates: 201, Location, server-set id and createdAt, unknown fields and client id ignored', () => {
  const c = client();
  const e = c.send('POST', '/api/tasks', { headers: JSON_H, body: { id: 1, title: '  Study REST ', priority: 'high' } });
  assert.equal(e.res.status, 201);
  assert.equal(header(e, 'Location'), '/api/tasks/6');
  assert.deepEqual(e.res.data, { id: 6, title: 'Study REST', done: false, userId: null, createdAt: e.res.data.createdAt });
  assert.match(e.res.data.createdAt, /^2026-10-05T10:01:00/);
  assert.equal(c.s.tasks.length, 6);
  assert.equal(c.s.tasks.filter((t) => t.id === 1).length, 1);
  assert.ok(e.notes.some((n) => n.includes('`id`')));
  assert.ok(e.notes.some((n) => n.includes('priority')));
  const again = c.send('POST', '/api/tasks', { headers: JSON_H, body: { title: 'Study REST' } });
  assert.equal(again.res.data.id, 7, 'POST is not idempotent: a second task');
});

test('POST validation: 400 with every field error, nothing stored', () => {
  const c = client();
  const e = c.send('POST', '/api/tasks', { headers: JSON_H, body: { title: '', done: 'yes', userId: 99 } });
  assert.equal(e.res.status, 400);
  assert.equal(e.res.data.error, 'Validation failed');
  assert.deepEqual(e.res.data.errors.map((x) => x.field), ['title', 'done', 'userId']);
  assert.equal(c.s.tasks.length, 5);
  const missing = c.send('POST', '/api/tasks', { headers: JSON_H, body: '' });
  assert.equal(missing.res.status, 400);
  assert.equal(missing.res.data.errors[0].message, 'title is required');
});

test('body problems: 415 without a JSON Content-Type, 400 for malformed JSON or a non-object', () => {
  const c = client();
  assert.equal(c.send('POST', '/api/tasks', { body: '{"title":"x"}' }).res.status, 415);
  assert.equal(c.send('POST', '/api/tasks', { headers: [['Content-Type', 'text/plain']], body: '{"title":"x"}' }).res.status, 415);
  const bad = c.send('POST', '/api/tasks', { headers: JSON_H, body: "{ 'title': 'x' }" });
  assert.equal(bad.res.status, 400);
  assert.match(bad.res.data.error, /^Malformed JSON/);
  assert.equal(c.send('POST', '/api/tasks', { headers: JSON_H, body: '[1,2]' }).res.status, 400);
  assert.equal(c.send('POST', '/api/tasks', { headers: [['Content-Type', 'application/json; charset=utf-8']], body: '{"title":"ok"}' }).res.status, 201);
});

test('GET one, 404 for an unknown id, 400 for a non-numeric id', () => {
  const c = client();
  assert.equal(c.send('GET', '/api/tasks/3').res.data.title, 'Return the right status codes');
  const nf = c.send('GET', '/api/tasks/999');
  assert.equal(nf.res.status, 404);
  assert.deepEqual(nf.res.data, { error: 'Task 999 not found' });
  assert.equal(c.send('GET', '/api/tasks/abc').res.status, 400);
});

test('PATCH changes only the fields sent; PUT replaces and resets omitted fields', () => {
  const c = client();
  const p = c.send('PATCH', '/api/tasks/2', { headers: JSON_H, body: { done: true } });
  assert.equal(p.res.status, 200);
  assert.deepEqual([p.res.data.title, p.res.data.done, p.res.data.userId], ['Add full CRUD', true, 1]);
  const u = c.send('PUT', '/api/tasks/2', { headers: JSON_H, body: { title: 'Renamed' } });
  assert.equal(u.res.status, 200);
  assert.deepEqual([u.res.data.title, u.res.data.done, u.res.data.userId], ['Renamed', false, null]);
  assert.ok(u.notes.some((n) => n.includes('PUT replaces')));
  assert.equal(c.send('PUT', '/api/tasks/2', { headers: JSON_H, body: { done: true } }).res.status, 400, 'PUT needs the whole resource');
  const empty = c.send('PATCH', '/api/tasks/2', { headers: JSON_H, body: {} });
  assert.equal(empty.res.status, 400);
  assert.equal(c.send('PATCH', '/api/tasks/77', { headers: JSON_H, body: { done: true } }).res.status, 404);
});

test('PUT is idempotent: the same PUT twice leaves the same state', () => {
  const c = client();
  const body = { title: 'Same', done: true, userId: 2 };
  c.send('PUT', '/api/tasks/4', { headers: JSON_H, body });
  const once = JSON.stringify(c.s.tasks);
  c.send('PUT', '/api/tasks/4', { headers: JSON_H, body });
  assert.equal(JSON.stringify(c.s.tasks), once);
});

test('DELETE: 204 with no body, then 404 for GET and for a second DELETE', () => {
  const c = client();
  const d = c.send('DELETE', '/api/tasks/5');
  assert.equal(d.res.status, 204);
  assert.equal(d.res.body, '');
  assert.equal(header(d, 'Content-Type'), undefined);
  assert.equal(c.send('GET', '/api/tasks/5').res.status, 404);
  assert.equal(c.send('DELETE', '/api/tasks/5').res.status, 404);
});

test('405 with an Allow header for a method the path does not support', () => {
  const c = client();
  const e = c.send('DELETE', '/api/tasks');
  assert.equal(e.res.status, 405);
  assert.equal(header(e, 'Allow'), 'GET, POST');
  assert.equal(header(c.send('POST', '/api/tasks/1'), 'Allow'), 'GET, PUT, PATCH, DELETE');
  assert.equal(c.send('PATCH', '/api/users/1').res.status, 405);
});

test('404 for an unknown route, with a hint when the URL contains a verb', () => {
  const c = client();
  const e = c.send('GET', '/api/getTasks');
  assert.equal(e.res.status, 404);
  assert.match(e.why, /not actions/);
  assert.doesNotMatch(c.send('GET', '/api/addresses').why, /not actions/);
  assert.match(c.send('GET', '/api/Tasks').why, /case-sensitive/);
  assert.equal(c.send('GET', 'api/tasks/').res.status, 200, 'missing leading slash and trailing slash are tolerated');
  assert.equal(c.send('GET', 'http://localhost:3000/api/tasks?done=true').res.data.length, 2, 'a full URL is accepted');
});

test('406 when Accept excludes JSON; */* and lists with JSON are fine', () => {
  const c = client();
  assert.equal(c.send('GET', '/api/tasks', { headers: [['Accept', 'text/html']] }).res.status, 406);
  assert.equal(c.send('GET', '/api/tasks', { headers: [['Accept', '*/*']] }).res.status, 200);
  assert.equal(c.send('GET', '/api/tasks', { headers: [['accept', 'text/html, application/json;q=0.9']] }).res.status, 200);
});

test('protected user routes: 401 without or with a bad token, 403 for a student, 201 for an admin, 409 on a duplicate email', () => {
  const c = client();
  const body = { name: 'Iris', email: 'iris@example.com', password: 'longpassword' };
  const none = c.send('POST', '/api/users', { headers: JSON_H, body });
  assert.equal(none.res.status, 401);
  assert.equal(header(none, 'WWW-Authenticate'), 'Bearer');
  assert.equal(c.send('POST', '/api/users', { headers: [...JSON_H, ['Authorization', 'admin-token']], body }).res.status, 401);
  assert.equal(c.send('POST', '/api/users', { headers: [...JSON_H, ['Authorization', 'Bearer nope']], body }).res.status, 401);
  assert.equal(c.send('POST', '/api/users', { headers: [...JSON_H, ['Authorization', 'Bearer student-token']], body }).res.status, 403);
  const ok = c.send('POST', '/api/users', { headers: ADMIN, body });
  assert.equal(ok.res.status, 201);
  assert.equal(header(ok, 'Location'), '/api/users/4');
  assert.equal(ok.res.data.password, undefined);
  assert.equal(ok.res.data.password_hash, undefined);
  assert.ok(c.s.users[3].password_hash.startsWith('$2b$'));
  const dup = c.send('POST', '/api/users', { headers: ADMIN, body: { ...body, email: 'ANA@example.com' } });
  assert.equal(dup.res.status, 409);
  const invalid = c.send('POST', '/api/users', { headers: ADMIN, body: { name: '', email: 'nope', password: 'short' } });
  assert.equal(invalid.res.status, 400);
  assert.deepEqual(invalid.res.data.errors.map((x) => x.field), ['name', 'email', 'password']);
});

test('user DTO never leaks password_hash or is_deleted', () => {
  const c = client();
  const list = c.send('GET', '/api/users');
  list.res.data.forEach((u) => assert.deepEqual(Object.keys(u), ['id', 'name', 'email', 'role', 'createdAt']));
  assert.doesNotMatch(list.res.body, /password|is_deleted|created_at/);
});

test('deleting a user who still owns tasks is a 409; after removing the tasks it is a 204', () => {
  const c = client();
  assert.equal(c.send('DELETE', '/api/users/3', { headers: ADMIN }).res.status, 409);
  c.send('DELETE', '/api/tasks/5');
  assert.equal(c.send('DELETE', '/api/users/3', { headers: ADMIN }).res.status, 204);
  assert.equal(c.send('GET', '/api/users/3').res.status, 404);
});

test('nested route /api/users/:id/tasks: list and create for that user, 404 for an unknown user', () => {
  const c = client();
  assert.deepEqual(c.send('GET', '/api/users/2/tasks').res.data.map((t) => t.id), [3, 4]);
  assert.deepEqual(c.send('GET', '/api/users/2/tasks?done=false&limit=1').res.data.map((t) => t.id), [3]);
  const created = c.send('POST', '/api/users/3/tasks', { headers: JSON_H, body: { title: 'Nested', userId: 1 } });
  assert.equal(created.res.status, 201);
  assert.equal(created.res.data.userId, 3);
  assert.equal(header(created, 'Location'), `/api/tasks/${created.res.data.id}`);
  assert.equal(c.send('GET', '/api/users/42/tasks').res.status, 404);
});

test('a body on GET or DELETE is not sent, and a note says so', () => {
  const c = client();
  const e = c.send('GET', '/api/tasks/1', { body: '{"x":1}' });
  assert.equal(e.res.status, 200);
  assert.equal(e.req.body, '');
  assert.ok(e.notes.some((n) => n.includes('no body')));
});

test('curl, fetch and raw HTTP renderings', () => {
  const c = client();
  const e = c.send('PATCH', '/api/tasks/2?x=1', { headers: JSON_H, body: '{ "done": true }' });
  assert.equal(Api.curl(e.req), "curl -i -X PATCH 'http://localhost:3000/api/tasks/2?x=1' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"done\":true}'");
  const f = Api.fetchCode(e.req, e.res);
  assert.match(f, /method: 'PATCH'/);
  assert.match(f, /body: JSON\.stringify\(\{"done":true\}\)/);
  assert.match(f, /await res\.json\(\)/);
  const g = c.send('GET', '/api/tasks');
  assert.equal(Api.curl(g.req), 'curl -i http://localhost:3000/api/tasks');
  assert.equal(Api.fetchCode(g.req, g.res).split('\n')[0], "const res = await fetch('http://localhost:3000/api/tasks');");
  const d = c.send('DELETE', '/api/tasks/1');
  assert.match(Api.fetchCode(d.req, d.res), /do not call res\.json/);
  const it = c.send('POST', '/api/tasks', { headers: JSON_H, body: { title: "it's" } });
  assert.match(Api.curl(it.req), /-d '\{"title":"it'\\''s"\}'/);
  const raw = Api.rawRequest(e.req);
  assert.equal(raw.first, 'PATCH /api/tasks/2?x=1 HTTP/1.1');
  assert.deepEqual(raw.headers[0], ['Host', 'localhost:3000']);
  assert.ok(raw.headers.some(([k, v]) => k === 'Content-Length' && v === '16'));
  assert.equal(Api.rawResponse(e.res).first, 'HTTP/1.1 200 OK');
});

test('Content-Length counts UTF-8 bytes', () => {
  const c = client();
  const e = c.send('GET', '/api/users/2');
  assert.equal(header(e, 'Content-Length'), String(Buffer.byteLength(e.res.body, 'utf8')));
});

test('every challenge can be solved by its hinted requests, and not by a plain GET', () => {
  const ids = Api.CHALLENGES.map((ch) => ch.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 6);
  const solve = {
    'create-task': (c) => c.send('POST', '/api/tasks', { headers: JSON_H, body: { title: 'Study REST' } }),
    'patch-done': (c) => c.send('PATCH', '/api/tasks/2', { headers: JSON_H, body: { done: true } }),
    'list-undone': (c) => c.send('GET', '/api/tasks?done=false'),
    'page-two': (c) => c.send('GET', '/api/tasks?page=2&limit=2'),
    'newest-first': (c) => c.send('GET', '/api/tasks?sort=createdAt&order=desc'),
    'user-tasks': (c) => c.send('GET', '/api/users/2/tasks'),
    validation: (c) => c.send('POST', '/api/tasks', { headers: JSON_H, body: { title: '', done: 'yes' } }),
    'delete-proof': (c) => { c.send('DELETE', '/api/tasks/5'); return c.send('GET', '/api/tasks/5'); },
    'not-allowed': (c) => c.send('DELETE', '/api/tasks'),
    'media-type': (c) => c.send('POST', '/api/tasks', { body: '{"title":"x"}' }),
    'admin-user': (c) => c.send('POST', '/api/users', { headers: ADMIN, body: { name: 'Iris', email: 'iris@example.com', password: 'longpassword' } }),
    conflict: (c) => c.send('POST', '/api/users', { headers: ADMIN, body: { name: 'Ana', email: 'ana@example.com', password: 'longpassword' } }),
  };
  Api.CHALLENGES.forEach((ch) => {
    assert.ok(solve[ch.id], `no solver for ${ch.id}`);
    assert.ok(ch.title && ch.goal && ch.hint, `${ch.id} needs title, goal and hint`);
    const c = client();
    const e = solve[ch.id](c);
    assert.equal(ch.check(e, c.history.slice(0, -1)), true, `${ch.id} should be solved`);
    const plain = client().send('GET', '/api/tasks');
    assert.equal(ch.check(plain, []), false, `${ch.id} must not be solved by a plain GET`);
  });
});

test('delete-proof needs the DELETE first: a 404 on its own does not count', () => {
  const ch = Api.CHALLENGES.find((x) => x.id === 'delete-proof');
  const c = client();
  const e = c.send('GET', '/api/tasks/99');
  assert.equal(ch.check(e, []), false);
});

test('status-chooser scenarios: unique ids, the answer among the choices, a reason for every wrong choice', () => {
  const src = readFileSync(new URL('../data/en/rest.js', import.meta.url), 'utf8');
  const ctx = { DATA: { en: {} } };
  vm.runInNewContext(src, ctx);
  const list = ctx.DATA.en.REST_STATUS_SCENARIOS;
  assert.ok(Array.isArray(list) && list.length >= 12);
  const ids = list.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  list.forEach((s) => {
    assert.ok(s.title && s.text && s.why, `${s.id}: title, text, why`);
    assert.ok(s.choices.includes(s.answer), `${s.id}: answer among choices`);
    assert.equal(new Set(s.choices).size, s.choices.length, `${s.id}: no duplicate choices`);
    s.choices.filter((code) => code !== s.answer).forEach((code) => assert.ok(s.wrong[code], `${s.id}: reason for ${code}`));
    assert.ok(s.choices.includes(s.trap) && s.trap !== s.answer, `${s.id}: trap is a wrong choice`);
    s.choices.forEach((code) => assert.ok(Api.REASON[code], `${s.id}: ${code} has a reason phrase`));
  });
});

/* POST /api/auth/login (used by the Fetching data section). */
test('login: 200 with the demo token and the user DTO for each demo account', () => {
  const c = client();
  const a = c.send('POST', '/api/auth/login', { headers: JSON_H, body: { email: 'ana@example.com', password: 'password123' } });
  assert.equal(a.res.status, 200);
  assert.equal(a.res.data.token, 'admin-token');
  assert.deepEqual(Object.keys(a.res.data.user), ['id', 'name', 'email', 'role', 'createdAt']);
  assert.equal(a.res.data.user.role, 'admin');
  const l = c.send('POST', '/api/auth/login', { headers: JSON_H, body: { email: ' LEO@example.com ', password: Api.LOGIN_PASSWORD } });
  assert.equal(l.res.status, 200);
  assert.equal(l.res.data.token, 'student-token');
  assert.equal(l.res.data.user.id, 2);
  assert.ok(!('password_hash' in l.res.data.user));
});

test('login: 401 for a wrong password, an unknown email, or a user with no demo token', () => {
  const c = client();
  for (const body of [
    { email: 'ana@example.com', password: 'nope' },
    { email: 'nobody@example.com', password: 'password123' },
    { email: 'sara@example.com', password: 'password123' },
  ]) {
    const e = c.send('POST', '/api/auth/login', { headers: JSON_H, body });
    assert.equal(e.res.status, 401, JSON.stringify(body));
    assert.equal(e.res.data.error, 'Invalid email or password');
  }
});

test('login: 400 with field errors for missing or non-string fields; 405 for GET; 415 without JSON', () => {
  const c = client();
  const e = c.send('POST', '/api/auth/login', { headers: JSON_H, body: { email: 'ana@example.com', password: 42 } });
  assert.equal(e.res.status, 400);
  assert.deepEqual(e.res.data.errors, [{ field: 'password', message: 'password must be a string' }]);
  const both = c.send('POST', '/api/auth/login', { headers: JSON_H, body: {} });
  assert.deepEqual(both.res.data.errors.map((x) => x.field), ['email', 'password']);
  assert.equal(c.send('GET', '/api/auth/login').res.status, 405);
  assert.equal(c.send('POST', '/api/auth/login', { body: { email: 'a', password: 'b' } }).res.status, 415);
});

test('login does not change the stored data', () => {
  const s = Api.createState();
  const e = Api.request(s, { method: 'POST', path: '/api/auth/login', headers: JSON_H, body: JSON.stringify({ email: 'ana@example.com', password: 'password123' }) });
  assert.deepEqual(e.state.users, s.users);
  assert.deepEqual(e.state.tasks, s.tasks);
});
