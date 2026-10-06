'use strict';

/* ==========================================================================
   Mock REST API engine (pure, no DOM; also runs in Node:
   site/test/mock-api-engine.test.mjs). A fake server for the api-builder tool:
   nothing goes over the network.

   MockApiEngine.createState() → a fresh in-memory "database" (seed rows)
   MockApiEngine.request(state, { method, path, headers, body }) →
     { state, req, res: { status, reason, headers, body, data }, trace, why, notes }
     state is a NEW object (the input is never changed); trace lists the checks
     the server ran in order ({ status: 'ok' | 'bad' | 'note', text }); why is a
     one-paragraph "why this status"; notes are extra remarks (ignored fields…).
   MockApiEngine.curl(req) / fetchCode(req, res) / rawRequest(req) / rawResponse(res)
     the same request as a curl command, as fetch() code, and as raw HTTP text.
   MockApiEngine.CHALLENGES  [{ id, title, goal, hint, check(entry, history) }]
     entry = the result of request(); history = earlier entries, oldest first.

   The API it imitates (a well-designed REST API in the style the cards teach):
     /api/tasks                GET (filter, sort, paginate) · POST
     /api/tasks/:id            GET · PUT · PATCH · DELETE
     /api/users                GET · POST (admin token)
     /api/users/:id            GET · DELETE (admin token)
     /api/users/:id/tasks      GET (same query parameters) · POST
     /api/auth/login           POST { email, password } → 200 { token, user }; 400 with
                               field errors when a field is missing or not a string; 401
                               "Invalid email or password" otherwise. The demo accounts:
                               ana@example.com (admin → admin-token) and leo@example.com
                               (student → student-token), password "password123" for both;
                               other users have no demo token, so they get 401 too.
   Validation errors are 400 with { error, errors: [{ field, message }] }, the
   convention the Designing APIs cards use. Rows are stored like a
   database (snake_case, password_hash, is_deleted); responses go through a
   DTO mapping (camelCase, no secrets).
   ========================================================================== */

const MockApiEngine = (() => {
  const ORIGIN = 'http://localhost:3000';
  const HOST = 'localhost:3000';
  const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const REASON = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 409: 'Conflict', 410: 'Gone', 415: 'Unsupported Media Type',
    422: 'Unprocessable Content', 500: 'Internal Server Error', 503: 'Service Unavailable',
  };
  const JSON_TYPE = 'application/json; charset=utf-8';
  const TOKENS = { 'admin-token': { userId: 1, role: 'admin' }, 'student-token': { userId: 2, role: 'student' } };
  const LOGIN_PASSWORD = 'password123';
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 10;
  const TASK_FIELDS = ['title', 'done', 'userId'];
  const TASK_READONLY = ['id', 'createdAt'];
  const USER_FIELDS = ['name', 'email', 'password', 'role'];
  const SORTABLE = { id: 'id', title: 'title', done: 'done', createdAt: 'created_at' };
  const LIST_PARAMS = ['done', 'userId', 'search', 'sort', 'order', 'page', 'limit', 'offset'];

  /* ---- State --------------------------------------------------------------------------------- */

  const day = (d, h = 9) => `2026-10-0${d}T${String(h).padStart(2, '0')}:00:00.000Z`;

  function createState() {
    return {
      users: [
        { id: 1, name: 'Ana Ruiz', email: 'ana@example.com', password_hash: '$2b$10$fakeHashForTheDemoOnlyAnaXXXXXXXXXXXXXXXXXXXXXXXX', role: 'admin', created_at: '2026-09-01T08:00:00.000Z', is_deleted: false },
        { id: 2, name: 'Leo Martín', email: 'leo@example.com', password_hash: '$2b$10$fakeHashForTheDemoOnlyLeoXXXXXXXXXXXXXXXXXXXXXXXX', role: 'student', created_at: '2026-09-02T08:00:00.000Z', is_deleted: false },
        { id: 3, name: 'Sara Gil', email: 'sara@example.com', password_hash: '$2b$10$fakeHashForTheDemoOnlySaraXXXXXXXXXXXXXXXXXXXXXXX', role: 'student', created_at: '2026-09-03T08:00:00.000Z', is_deleted: false },
      ],
      tasks: [
        { id: 1, title: 'Write the API skeleton', done: true, user_id: 1, created_at: day(1) },
        { id: 2, title: 'Add full CRUD', done: false, user_id: 1, created_at: day(2) },
        { id: 3, title: 'Return the right status codes', done: false, user_id: 2, created_at: day(3) },
        { id: 4, title: 'Write supertest tests', done: false, user_id: 2, created_at: day(4) },
        { id: 5, title: 'Document the endpoints', done: true, user_id: 3, created_at: day(5) },
      ],
      nextTaskId: 6,
      nextUserId: 4,
      tick: 0,
    };
  }

  const clone = (s) => JSON.parse(JSON.stringify(s));
  const now = (s) => {
    s.tick += 1;
    return new Date(Date.UTC(2026, 9, 5, 10, s.tick)).toISOString();
  };

  /* ---- DTOs: the API contract, not the database row ------------------------------------------ */

  const taskDto = (r) => ({ id: r.id, title: r.title, done: r.done, userId: r.user_id, createdAt: r.created_at });
  const userDto = (r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at });

  /* ---- Small helpers ------------------------------------------------------------------------- */

  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const isPosInt = (s) => /^[1-9]\d*$/.test(String(s));

  function byteLength(str) {
    let n = 0;
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    return n;
  }

  /* JSON for the response body: objects one key per line, array items one per line
     (`{ "id": 1, "title": "…" }`), so a list stays readable. Still valid JSON. */
  const inline = (v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
    : JSON.stringify(v));
  function pretty(v, depth = 0) {
    const pad = '  '.repeat(depth + 1);
    const end = '  '.repeat(depth);
    if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + inline(x)).join(',\n')}\n${end}]` : '[]';
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      return keys.length ? `{\n${keys.map((k) => `${pad}${JSON.stringify(k)}: ${pretty(v[k], depth + 1)}`).join(',\n')}\n${end}}` : '{}';
    }
    return JSON.stringify(v);
  }

  /* Headers as [[name, value]] (or a plain object) → { lower-case name: value }; the last one wins. */
  function headerMap(headers) {
    const list = Array.isArray(headers) ? headers : Object.entries(headers || {});
    const map = {};
    list.forEach(([k, v]) => {
      const name = String(k || '').trim().toLowerCase();
      if (name) map[name] = String(v == null ? '' : v).trim();
    });
    return map;
  }

  function cleanHeaders(headers) {
    const list = Array.isArray(headers) ? headers : Object.entries(headers || {});
    return list.map(([k, v]) => [String(k || '').trim(), String(v == null ? '' : v).trim()]).filter(([k]) => k);
  }

  /* Splits what the user typed into a path and its query parameters. */
  function parseTarget(input) {
    let raw = String(input || '').trim() || '/';
    if (/^https?:\/\//i.test(raw)) {
      const m = raw.match(/^https?:\/\/[^/?#]*(.*)$/i);
      raw = m[1] || '/';
    }
    if (!raw.startsWith('/')) raw = `/${raw}`;
    raw = raw.split('#')[0];
    const q = raw.indexOf('?');
    let path = q >= 0 ? raw.slice(0, q) : raw;
    const search = q >= 0 ? raw.slice(q + 1) : '';
    if (path.length > 1) path = path.replace(/\/+$/, '');
    let decoded = path;
    try { decoded = decodeURIComponent(path); } catch (e) { /* keep it as typed */ }
    const query = [...new URLSearchParams(search).entries()];
    return { path: decoded, search, query, target: search ? `${path}?${search}` : path };
  }

  /* ---- Routes --------------------------------------------------------------------------------- */

  const ROUTES = [
    { pattern: '/api/tasks', re: /^\/api\/tasks$/, allow: ['GET', 'POST'] },
    { pattern: '/api/tasks/:id', re: /^\/api\/tasks\/([^/]+)$/, allow: ['GET', 'PUT', 'PATCH', 'DELETE'] },
    { pattern: '/api/users', re: /^\/api\/users$/, allow: ['GET', 'POST'], protect: ['POST'] },
    { pattern: '/api/users/:id', re: /^\/api\/users\/([^/]+)$/, allow: ['GET', 'DELETE'], protect: ['DELETE'] },
    { pattern: '/api/users/:id/tasks', re: /^\/api\/users\/([^/]+)\/tasks$/, allow: ['GET', 'POST'] },
    { pattern: '/api/auth/login', re: /^\/api\/auth\/login$/, allow: ['POST'] },
  ];

  function matchRoute(path) {
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (m) return { route: r, id: m[1] };
    }
    return null;
  }

  /* A verb at the start of a path segment, e.g. /getTasks, /delete-task, /tasks/2/delete. */
  const VERB_IN_URL = /(^|\/)(get|create|add|update|edit|delete|remove|list|fetch|save)(?=[A-Z_\-/]|$)/;
  const VERB_METHOD = { get: 'GET', list: 'GET', fetch: 'GET', create: 'POST', add: 'POST', save: 'POST', update: 'PATCH', edit: 'PATCH', delete: 'DELETE', remove: 'DELETE' };

  /* ---- Validation ----------------------------------------------------------------------------- */

  /* Checks a task body; full mode (POST, PUT) or partial mode (PATCH: only the fields present). */
  function validateTask(body, { partial, users, userIdFromPath }) {
    const errors = [];
    const notes = [];
    const clean = {};
    Object.keys(body).forEach((k) => {
      if (TASK_READONLY.includes(k)) notes.push(`\`${k}\` is set by the server, so the value you sent was ignored.`);
      else if (k === 'userId' && userIdFromPath != null) notes.push('`userId` comes from the URL (`/api/users/:id/tasks`), so the one in the body was ignored.');
      else if (!TASK_FIELDS.includes(k)) notes.push(`Unknown field \`${k}\` was stripped: only ${TASK_FIELDS.map((f) => `\`${f}\``).join(', ')} are accepted.`);
    });
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k) && !(k === 'userId' && userIdFromPath != null);

    if (has('title') || !partial) {
      const v = body.title;
      if (v === undefined || v === null) errors.push({ field: 'title', message: 'title is required' });
      else if (typeof v !== 'string') errors.push({ field: 'title', message: `title must be a string, not ${typeOf(v)}` });
      else if (!v.trim()) errors.push({ field: 'title', message: 'title must not be empty' });
      else if (v.trim().length > 120) errors.push({ field: 'title', message: 'title must be at most 120 characters' });
      else clean.title = v.trim();
    }
    if (has('done')) {
      const v = body.done;
      if (typeof v !== 'boolean') errors.push({ field: 'done', message: `done must be true or false, not ${typeOf(v) === 'string' ? `the string "${v}"` : typeOf(v)}` });
      else clean.done = v;
    } else if (!partial) clean.done = false;
    if (userIdFromPath != null) clean.userId = userIdFromPath;
    else if (has('userId')) {
      const v = body.userId;
      if (v === null) clean.userId = null;
      else if (!Number.isInteger(v)) errors.push({ field: 'userId', message: `userId must be an integer or null, not ${typeOf(v)}` });
      else if (!users.some((u) => u.id === v)) errors.push({ field: 'userId', message: `userId ${v} does not match any user` });
      else clean.userId = v;
    } else if (!partial) clean.userId = null;

    if (partial && !errors.length && !Object.keys(clean).length) {
      errors.push({ field: null, message: `send at least one of ${TASK_FIELDS.join(', ')}` });
    }
    return { errors, notes, clean };
  }

  function validateUser(body) {
    const errors = [];
    const notes = [];
    const clean = {};
    Object.keys(body).forEach((k) => {
      if (k === 'id' || k === 'createdAt') notes.push(`\`${k}\` is set by the server, so the value you sent was ignored.`);
      else if (!USER_FIELDS.includes(k)) notes.push(`Unknown field \`${k}\` was stripped.`);
    });
    const str = (k, min, max, label) => {
      const v = body[k];
      if (v === undefined || v === null || v === '') { errors.push({ field: k, message: `${k} is required` }); return; }
      if (typeof v !== 'string') { errors.push({ field: k, message: `${k} must be a string` }); return; }
      if (v.trim().length < min) { errors.push({ field: k, message: `${k} must be at least ${min} ${label}` }); return; }
      if (v.trim().length > max) { errors.push({ field: k, message: `${k} must be at most ${max} characters` }); return; }
      clean[k] = k === 'password' ? v : v.trim();
    };
    str('name', 1, 60, 'character');
    str('email', 3, 120, 'characters');
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      errors.push({ field: 'email', message: 'email must look like name@example.com' });
      delete clean.email;
    }
    str('password', 8, 200, 'characters');
    if (body.role !== undefined) {
      if (body.role !== 'admin' && body.role !== 'student') errors.push({ field: 'role', message: 'role must be "admin" or "student"' });
      else clean.role = body.role;
    } else clean.role = 'student';
    return { errors, notes, clean };
  }

  /* Query parameters of a task list: reject malformed values (400), ignore unknown names. */
  function listOptions(query) {
    const errors = [];
    const notes = [];
    const get = (k) => { const hit = query.filter(([n]) => n === k); return hit.length ? hit[hit.length - 1][1] : undefined; };
    query.forEach(([k]) => { if (!LIST_PARAMS.includes(k) && !notes.some((n) => n.includes(`\`${k}\``))) notes.push(`Unknown query parameter \`${k}\` was ignored (this API's policy: ignore unknown names, reject malformed values).`); });
    const o = { filters: [] };
    const done = get('done');
    if (done !== undefined) {
      if (done === 'true' || done === 'false') o.done = done === 'true';
      else errors.push({ field: 'done', message: 'done must be true or false' });
    }
    const userId = get('userId');
    if (userId !== undefined) {
      if (isPosInt(userId)) o.userId = Number(userId);
      else errors.push({ field: 'userId', message: 'userId must be a positive integer' });
    }
    const search = get('search');
    if (search !== undefined && search.trim()) o.search = search.trim().toLowerCase();
    const sort = get('sort');
    if (sort !== undefined) {
      if (SORTABLE[sort]) o.sort = sort;
      else errors.push({ field: 'sort', message: `sort must be one of ${Object.keys(SORTABLE).join(', ')}` });
    }
    const order = get('order');
    if (order !== undefined) {
      if (order === 'asc' || order === 'desc') o.order = order;
      else errors.push({ field: 'order', message: 'order must be asc or desc' });
    }
    const page = get('page');
    const limit = get('limit');
    const offset = get('offset');
    if (page !== undefined && offset !== undefined) errors.push({ field: 'page', message: 'use either page or offset, not both' });
    if (page !== undefined) {
      if (isPosInt(page)) o.page = Number(page);
      else errors.push({ field: 'page', message: 'page must be an integer, 1 or more' });
    }
    if (offset !== undefined) {
      if (/^\d+$/.test(offset)) o.offset = Number(offset);
      else errors.push({ field: 'offset', message: 'offset must be an integer, 0 or more' });
    }
    if (limit !== undefined) {
      if (!isPosInt(limit)) errors.push({ field: 'limit', message: 'limit must be an integer, 1 or more' });
      else if (Number(limit) > MAX_LIMIT) { o.limit = MAX_LIMIT; notes.push(`\`limit=${limit}\` was clamped to ${MAX_LIMIT}: a client must not be able to ask for a million rows.`); } else o.limit = Number(limit);
    }
    o.paged = o.page !== undefined || o.offset !== undefined || o.limit !== undefined;
    return { errors, notes, o };
  }

  function listTasks(rows, o) {
    let list = rows.slice();
    if (o.done !== undefined) list = list.filter((r) => r.done === o.done);
    if (o.userId !== undefined) list = list.filter((r) => r.user_id === o.userId);
    if (o.search) list = list.filter((r) => r.title.toLowerCase().includes(o.search));
    const col = SORTABLE[o.sort || 'id'];
    const dir = o.order === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const x = a[col];
      const y = b[col];
      const c = typeof x === 'string' ? x.localeCompare(y) : Number(x) - Number(y);
      return (c || a.id - b.id) * dir;
    });
    const total = list.length;
    if (!o.paged) return { items: list, total };
    const limit = o.limit || DEFAULT_LIMIT;
    const offset = o.offset !== undefined ? o.offset : ((o.page || 1) - 1) * limit;
    return { items: list.slice(offset, offset + limit), total, limit, offset, page: Math.floor(offset / limit) + 1 };
  }

  /* ---- The request handler -------------------------------------------------------------------- */

  function request(stateIn, input = {}) {
    const state = clone(stateIn || createState());
    const method = String(input.method || 'GET').trim().toUpperCase();
    const target = parseTarget(input.path);
    const headers = cleanHeaders(input.headers);
    const h = headerMap(headers);
    const rawBody = typeof input.body === 'string' ? input.body : (input.body == null ? '' : JSON.stringify(input.body));
    const sendsBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
    const req = { method, path: target.path, target: target.target, query: target.query, headers, body: sendsBody ? rawBody : '' };
    const trace = [];
    const notes = [];
    const ok = (text) => trace.push({ status: 'ok', text });
    const note = (text) => notes.push(text);
    let resHeaders = [];

    function reply(status, data, why, extra = []) {
      const body = data === undefined ? '' : pretty(data);
      resHeaders = [...(body ? [['Content-Type', JSON_TYPE], ['Content-Length', String(byteLength(body))]] : []), ...extra];
      if (status >= 400) trace.push({ status: 'bad', text: `${status} ${REASON[status]}: ${data && data.error ? data.error : ''}` });
      return {
        state: status < 400 ? state : clone(stateIn || createState()),
        req,
        res: { status, reason: REASON[status] || '', headers: resHeaders, body, data: data === undefined ? null : data },
        trace,
        why,
        notes,
      };
    }
    const fail = (status, message, why, extra) => reply(status, { error: message }, why, extra);

    if (!METHODS.includes(method)) {
      return fail(405, `Method ${method} is not supported`, `This server only understands ${METHODS.join(', ')}.`, [['Allow', METHODS.join(', ')]]);
    }
    if (!sendsBody && rawBody.trim()) note(`A ${method} request carries no body, so the body you typed was not sent (\`fetch()\` even refuses to send one).`);

    // 1. Route
    const hit = matchRoute(target.path);
    if (!hit) {
      const verb = target.path.match(VERB_IN_URL);
      const hint = verb ? ` URLs name **resources** (nouns), not actions: the action is the method. Try \`${VERB_METHOD[verb[2]]} /api/tasks…\` instead.` : '';
      const caseHint = /[A-Z]/.test(target.path) && matchRoute(target.path.toLowerCase()) ? ' Paths are case-sensitive: use lower case.' : '';
      return fail(404, `No route for ${method} ${target.path}`, `No route matches \`${target.path}\`, so the server answers **404 Not Found**. This API has \`/api/tasks\`, \`/api/tasks/:id\`, \`/api/users\`, \`/api/users/:id\` and \`/api/users/:id/tasks\`.${hint}${caseHint}`);
    }
    const { route } = hit;
    ok(`Route matched: \`${route.pattern}\`${hit.id !== undefined ? ` with \`:id\` = \`${hit.id}\`` : ''}.`);

    // 2. Method
    if (!route.allow.includes(method)) {
      return fail(405, `Method ${method} not allowed on ${route.pattern}`,
        `The path exists, but it does not support ${method}. A well-designed API answers **405 Method Not Allowed** (not 404, which would say the path does not exist) and lists what it supports in the \`Allow\` header: ${route.allow.join(', ')}.${route.pattern === '/api/tasks' && method !== 'GET' && method !== 'POST' ? ' To change or delete one task, put its id in the path: `/api/tasks/2`.' : ''}${/:id$/.test(route.pattern) && method === 'POST' ? ' You create inside a **collection** (`POST /api/tasks`), not on an item.' : ''}`,
        [['Allow', route.allow.join(', ')]]);
    }
    ok(`Method ${method} is allowed here (Allow: ${route.allow.join(', ')}).`);

    // 3. Authentication and authorisation (only on protected routes)
    let who = null;
    if (route.protect && route.protect.includes(method)) {
      const auth = h.authorization;
      const challenge = [['WWW-Authenticate', 'Bearer']];
      if (!auth) {
        return fail(401, 'Authentication required: send Authorization: Bearer <token>',
          `\`${method} ${route.pattern}\` is protected and the request has no \`Authorization\` header, so the server does not know who you are: **401 Unauthorized** (really "unauthenticated"). Add the header \`Authorization: Bearer admin-token\`.`, challenge);
      }
      const m = auth.match(/^Bearer\s+(\S+)$/i);
      if (!m) {
        return fail(401, 'Malformed Authorization header: expected "Bearer <token>"',
          `The \`Authorization\` header must read \`Bearer <token>\` (the word Bearer, a space, the token). This one does not, so the caller is still unknown: **401**.`, challenge);
      }
      who = TOKENS[m[1]];
      if (!who) {
        return fail(401, 'Invalid or expired token', `The token \`${m[1]}\` is not one this server issued (the demo knows \`admin-token\` and \`student-token\`). An unknown or expired token is the same as no token: **401**.`, challenge);
      }
      ok(`Token accepted: user ${who.userId} (role ${who.role}).`);
      if (who.role !== 'admin') {
        return fail(403, 'Only admins can do this',
          `The server **knows** who you are (user ${who.userId}, a student), but this action is for admins only: **403 Forbidden**. Logging in again will not help; a different account would. Compare 401, which means "I do not know who you are".`);
      }
      ok('Role admin: allowed.');
    }

    // 4. Accept
    const accept = h.accept;
    if (accept && !/(^|,)\s*(\*\/\*|application\/\*|application\/json)\s*(;|,|$)/i.test(accept)) {
      return reply(406, { error: 'This API only produces application/json' },
        `The \`Accept\` header asks for \`${accept}\`, but this API can only answer in JSON: **406 Not Acceptable**. Send \`Accept: application/json\` (or leave the header out). Do not confuse it with 415, which is about the format of the body **you** send.`);
    }
    if (accept) ok('Accept allows JSON.');

    // 5. Body: Content-Type, then JSON.parse
    let body = null;
    if (sendsBody) {
      const ctype = (h['content-type'] || '').toLowerCase();
      if (rawBody.trim()) {
        if (!/^application\/json\s*(;|$)/.test(ctype)) {
          return fail(415, 'Content-Type must be application/json',
            `The request has a body but ${ctype ? `says it is \`${ctype}\`` : 'no `Content-Type` header'}, so the server will not try to read it: **415 Unsupported Media Type**. Add \`Content-Type: application/json\`. (A plain Express app with \`express.json()\` would silently skip such a body and leave \`req.body\` empty, which then looks like a validation error: this is the most common reason for "title is required" when you did send a title.)`);
        }
        try { body = JSON.parse(rawBody); } catch (e) {
          return fail(400, `Malformed JSON: ${e.message}`,
            `The body says it is JSON but \`JSON.parse\` cannot read it (${e.message}). The server cannot even look at the fields: **400 Bad Request**. Check for single quotes, unquoted keys and trailing commas: JSON allows none of them.`);
        }
        if (typeOf(body) !== 'object') {
          return fail(400, 'The body must be a JSON object', `The body is valid JSON but it is ${typeOf(body) === 'array' ? 'an array' : `a ${typeOf(body)}`}, not an object like \`{ "title": "…" }\`: **400 Bad Request**.`);
        }
        ok('Body is valid JSON (Content-Type: application/json).');
      } else {
        body = {};
        trace.push({ status: 'note', text: 'The body is empty, so it is read as `{}`.' });
      }
    }

    // 6. The :id in the path
    let id = null;
    if (hit.id !== undefined) {
      if (!isPosInt(hit.id)) {
        return reply(400, { error: 'Validation failed', errors: [{ field: 'id', message: 'id must be a positive integer' }] },
          `\`${hit.id}\` is not a valid id (ids here are positive integers), so the request is malformed: **400 Bad Request**. (Some APIs answer 404 instead: "no resource has that id". Either is defensible; pick one policy.)`);
      }
      id = Number(hit.id);
    }

    const tasksUrl = (tid) => `/api/tasks/${tid}`;

    /* ---------- /api/auth/login ---------- */
    if (route.pattern === '/api/auth/login') {
      const errors = ['email', 'password'].filter((k) => typeof body[k] !== 'string' || !body[k].trim())
        .map((k) => ({ field: k, message: body[k] === undefined || body[k] === null || body[k] === '' ? `${k} is required` : `${k} must be a string` }));
      if (errors.length) {
        return reply(400, { error: 'Validation failed', errors }, `A log-in needs both \`email\` and \`password\` as strings (${errors.map((e) => e.message).join('; ')}): **400 Bad Request**, one entry per field.`);
      }
      ok('Body has an email and a password.');
      const user = state.users.find((u) => !u.is_deleted && u.email.toLowerCase() === body.email.trim().toLowerCase());
      const token = user && Object.keys(TOKENS).find((k) => TOKENS[k].userId === user.id);
      if (!user || !token || body.password !== LOGIN_PASSWORD) {
        return fail(401, 'Invalid email or password',
          'The email is unknown or the password is wrong: **401 Unauthorized**. The message does not say which of the two failed, so an attacker cannot use the log-in form to find out which emails have an account. (Demo accounts: `ana@example.com` and `leo@example.com`, password `password123`.)');
      }
      ok(`Password matches: user ${user.id} (role ${user.role}).`);
      return reply(200, { token, user: userDto(user) },
        `Logged in: **200 OK** with a token and the user (as a DTO, no password hash). The client keeps the token and sends it on later requests as \`Authorization: Bearer ${token}\`. A log-in creates no resource, so it is 200, not 201.`);
    }

    /* ---------- /api/tasks and /api/users/:id/tasks (collections) ---------- */
    if (route.pattern === '/api/tasks' || route.pattern === '/api/users/:id/tasks') {
      let ownerId = null;
      if (route.pattern === '/api/users/:id/tasks') {
        const owner = state.users.find((u) => u.id === id);
        if (!owner) return fail(404, `User ${id} not found`, `There is no user ${id}, so there is no collection of their tasks either: **404 Not Found**.`);
        ownerId = id;
        ok(`User ${id} exists.`);
      }
      if (method === 'GET') {
        const { errors, notes: qn, o } = listOptions(target.query);
        qn.forEach(note);
        if (errors.length) {
          return reply(400, { error: 'Invalid query parameters', errors },
            `A query parameter has a value the API cannot use (${errors.map((e) => `\`${e.field}\`: ${e.message}`).join('; ')}): **400 Bad Request**, with one entry per problem so the client can fix them all at once.`);
        }
        if (ownerId != null) {
          if (o.userId !== undefined && o.userId !== ownerId) note('`userId` in the query was ignored: the user comes from the path.');
          o.userId = ownerId;
        }
        const r = listTasks(state.tasks, o);
        const items = r.items.map(taskDto);
        const extra = [['X-Total-Count', String(r.total)]];
        if (r.limit) {
          const base = route.pattern === '/api/tasks' ? '/api/tasks' : `/api/users/${ownerId}/tasks`;
          const keep = target.query.filter(([k]) => k !== 'page' && k !== 'offset' && k !== 'limit');
          const link = (p) => `<${base}?${new URLSearchParams([...keep, ['page', String(p)], ['limit', String(r.limit)]]).toString()}>`;
          const last = Math.max(1, Math.ceil(r.total / r.limit));
          const parts = [];
          if (r.offset + r.limit < r.total) parts.push(`${link(r.page + 1)}; rel="next"`);
          if (r.page > 1) parts.push(`${link(Math.min(r.page - 1, last))}; rel="prev"`);
          parts.push(`${link(last)}; rel="last"`);
          extra.push(['Link', parts.join(', ')]);
        }
        const filterText = [o.done !== undefined ? `done = ${o.done}` : '', o.userId !== undefined ? `userId = ${o.userId}` : '', o.search ? `title contains "${o.search}"` : ''].filter(Boolean);
        ok(`Filters: ${filterText.length ? filterText.join(', ') : 'none'} · sorted by ${o.sort || 'id'} ${o.order || 'asc'}${r.limit ? ` · page of ${r.limit} starting at item ${r.offset + 1}` : ''}.`);
        const why = `A successful read: **200 OK** with a JSON **array** of ${items.length} task${items.length === 1 ? '' : 's'}${r.total !== items.length ? ` (out of ${r.total} that match)` : ''}. ${r.limit
          ? `The body stays an array, and the pagination metadata travels in headers: \`X-Total-Count\` (how many match in total) and \`Link\` (where the next and last pages are).${items.length === 0 ? ' This page is past the end, and an empty page is still a valid answer: 200 with `[]`, not 404.' : ''}`
          : `\`X-Total-Count\` says how many tasks match. Filters, sorting and pagination go in the **query string** because they choose **which** items of the same resource you see.${items.length === 0 ? ' No task matches, and an empty list is a valid answer: 200 with `[]`, not 404.' : ''}`}`;
        return reply(200, items, why, extra);
      }
      // POST: create
      const v = validateTask(body, { partial: false, users: state.users, userIdFromPath: ownerId });
      v.notes.forEach(note);
      if (v.errors.length) {
        return reply(400, { error: 'Validation failed', errors: v.errors },
          `The JSON is readable, but the data breaks the rules (${v.errors.map((e) => e.message).join('; ')}): **400 Bad Request** with a field-level error list, and **nothing was created**. This API uses 400 for validation errors; some APIs use 422 Unprocessable Content for the same case.`);
      }
      ok('Validation passed.');
      const row = { id: state.nextTaskId, title: v.clean.title, done: v.clean.done, user_id: v.clean.userId, created_at: now(state) };
      state.nextTaskId += 1;
      state.tasks.push(row);
      ok(`Stored as task ${row.id}.`);
      return reply(201, taskDto(row),
        `A new resource was created: **201 Created**. The \`Location\` header tells the client the URL of the new task (\`${tasksUrl(row.id)}\`), and the body echoes it with the fields the **server** set (\`id\`, \`createdAt\`). Sending the same POST again would create a second task: POST is not idempotent.`,
        [['Location', tasksUrl(row.id)]]);
    }

    /* ---------- /api/tasks/:id ---------- */
    if (route.pattern === '/api/tasks/:id') {
      const idx = state.tasks.findIndex((r) => r.id === id);
      if (idx < 0) {
        return fail(404, `Task ${id} not found`, `No task has id ${id}${id < state.nextTaskId ? ' (it may have been deleted)' : ''}, so the server answers **404 Not Found**. The path is fine; the resource it names does not exist.${method === 'DELETE' ? ' A second DELETE of the same task gets this 404, yet DELETE is still idempotent: the state of the server (task gone) is the same after one call or two.' : ''}`);
      }
      ok(`Task ${id} exists.`);
      const row = state.tasks[idx];
      if (method === 'GET') return reply(200, taskDto(row), `A successful read of one resource: **200 OK** with the task as JSON.`);
      if (method === 'DELETE') {
        state.tasks.splice(idx, 1);
        ok(`Task ${id} removed.`);
        return reply(204, undefined, `Deleted: **204 No Content**. Success, and nothing to send back, so the response has **no body** (and no \`Content-Type\`). A \`GET ${tasksUrl(id)}\` now gives 404.`);
      }
      const partial = method === 'PATCH';
      const v = validateTask(body, { partial, users: state.users, userIdFromPath: null });
      v.notes.forEach(note);
      if (v.errors.length) {
        return reply(400, { error: 'Validation failed', errors: v.errors },
          `The data breaks the rules (${v.errors.map((e) => e.message).join('; ')}): **400 Bad Request** with a field-level error list. Task ${id} was **not** changed.`);
      }
      ok('Validation passed.');
      const changed = [];
      if (partial) {
        if ('title' in v.clean) { row.title = v.clean.title; changed.push('title'); }
        if ('done' in v.clean) { row.done = v.clean.done; changed.push('done'); }
        if ('userId' in v.clean) { row.user_id = v.clean.userId; changed.push('userId'); }
      } else {
        const before = taskDto(row);
        row.title = v.clean.title;
        row.done = v.clean.done;
        row.user_id = v.clean.userId;
        TASK_FIELDS.forEach((f) => { if (before[f] !== taskDto(row)[f]) changed.push(f); });
        const reset = TASK_FIELDS.filter((f) => !Object.prototype.hasOwnProperty.call(body, f) && before[f] !== taskDto(row)[f]);
        if (reset.length) note(`PUT replaces the whole task: you did not send ${reset.map((f) => `\`${f}\``).join(', ')}, so ${reset.length === 1 ? 'it was' : 'they were'} reset to the default. With PATCH ${reset.length === 1 ? 'it' : 'they'} would have been kept.`);
      }
      ok(changed.length ? `Changed: ${changed.join(', ')}.` : 'Nothing actually changed (same values).');
      return reply(200, taskDto(row), partial
        ? `Updated: **200 OK** with the task as it is now. PATCH changed only the fields you sent (${Object.keys(v.clean).join(', ')}) and kept the rest.`
        : `Replaced: **200 OK** with the new version. PUT means "here is the **whole** resource": every field you leave out goes back to its default (\`done: false\`, \`userId: null\`). Sending the same PUT twice leaves the same result: PUT is idempotent.`);
    }

    /* ---------- /api/users ---------- */
    if (route.pattern === '/api/users') {
      if (method === 'GET') {
        if (target.query.length) note('`/api/users` takes no query parameters in this demo; they were ignored.');
        const list = state.users.filter((u) => !u.is_deleted).map(userDto);
        return reply(200, list, `**200 OK** with the users. Look at the server state: each row has a \`password_hash\` and an \`is_deleted\` flag, but the response has neither. Every row passes through a **DTO** mapping (\`toUserDto(row)\`) that copies only the public fields and renames \`created_at\` to \`createdAt\`.`, [['X-Total-Count', String(list.length)]]);
      }
      const v = validateUser(body);
      v.notes.forEach(note);
      if (v.errors.length) {
        return reply(400, { error: 'Validation failed', errors: v.errors }, `The data breaks the rules (${v.errors.map((e) => e.message).join('; ')}): **400 Bad Request**, one entry per field, and nothing was created.`);
      }
      ok('Validation passed.');
      const clash = state.users.find((u) => u.email.toLowerCase() === v.clean.email.toLowerCase());
      if (clash) {
        return fail(409, `A user with email ${clash.email} already exists`,
          `The data is valid on its own, but it **conflicts** with what is already stored: email addresses must be unique and user ${clash.id} has that one. **409 Conflict** (not 400: nothing is wrong with the format, and the same request would succeed with another email).`);
      }
      ok('Email is not taken.');
      const row = { id: state.nextUserId, name: v.clean.name, email: v.clean.email, password_hash: `$2b$10$fakeHashForTheDemoOnly${'X'.repeat(26)}`, role: v.clean.role, created_at: now(state), is_deleted: false };
      state.nextUserId += 1;
      state.users.push(row);
      ok(`Stored as user ${row.id}; the password is stored only as a hash.`);
      return reply(201, userDto(row), `**201 Created** with \`Location: /api/users/${row.id}\`. The response is the **DTO**: the password you sent and its hash are never echoed back.`, [['Location', `/api/users/${row.id}`]]);
    }

    /* ---------- /api/users/:id ---------- */
    const idx = state.users.findIndex((u) => u.id === id && !u.is_deleted);
    if (idx < 0) return fail(404, `User ${id} not found`, `No user has id ${id}: **404 Not Found**.`);
    ok(`User ${id} exists.`);
    if (method === 'GET') return reply(200, userDto(state.users[idx]), '**200 OK** with one user, mapped to the DTO: no `password_hash`, no `is_deleted`, `createdAt` in camelCase.');
    const owned = state.tasks.filter((r) => r.user_id === id);
    if (owned.length) {
      return fail(409, `User ${id} still owns ${owned.length} task${owned.length === 1 ? '' : 's'}`,
        `User ${id} still owns task${owned.length === 1 ? '' : 's'} ${owned.map((r) => r.id).join(', ')}. Deleting the user would leave them pointing at nobody, so the request **conflicts** with the current state: **409 Conflict**. Delete or reassign those tasks first.`);
    }
    state.users.splice(idx, 1);
    ok(`User ${id} removed.`);
    return reply(204, undefined, '**204 No Content**: deleted, nothing to send back.');
  }

  /* ---- The same request in other forms ------------------------------------------------------ */

  /* The body as compact JSON when it parses, else as typed. */
  function compactBody(body) {
    try { return JSON.stringify(JSON.parse(body)); } catch (e) { return body; }
  }

  const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

  function curl(req) {
    const url = ORIGIN + req.target;
    const parts = ['curl -i'];
    if (req.method !== 'GET') parts[0] += ` -X ${req.method}`;
    parts[0] += ` ${/[?&*\s'"]/.test(url) ? shq(url) : url}`;
    req.headers.forEach(([k, v]) => parts.push(`-H ${shq(`${k}: ${v}`)}`));
    if (req.body && req.body.trim()) parts.push(`-d ${shq(compactBody(req.body))}`);
    return parts.join(' \\\n  ');
  }

  const jsq = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  function fetchCode(req, res) {
    const url = ORIGIN + req.target;
    const opts = [];
    if (req.method !== 'GET') opts.push(`  method: '${req.method}',`);
    if (req.headers.length) {
      opts.push('  headers: {');
      req.headers.forEach(([k, v]) => opts.push(`    ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : jsq(k)}: ${jsq(v)},`));
      opts.push('  },');
    }
    if (req.body && req.body.trim()) {
      let isJson = true;
      try { JSON.parse(req.body); } catch (e) { isJson = false; }
      opts.push(isJson ? `  body: JSON.stringify(${compactBody(req.body)}),` : `  body: ${jsq(req.body)},`);
    }
    const lines = [opts.length ? `const res = await fetch(${jsq(url)}, {\n${opts.join('\n')}\n});` : `const res = await fetch(${jsq(url)});`];
    lines.push('console.log(res.status, res.ok);   // fetch does not throw on 4xx/5xx: check res.ok');
    if (res && res.status === 204) lines.push('// 204 No Content: there is no body, so do not call res.json()');
    else lines.push('const data = await res.json();');
    if (res && res.headers.some(([k]) => k === 'Location')) lines.push("console.log(res.headers.get('Location'));");
    if (res && res.headers.some(([k]) => k === 'X-Total-Count')) lines.push("console.log(res.headers.get('X-Total-Count'));");
    return lines.join('\n');
  }

  /* Raw HTTP/1.1 text: { first, headers: [[k, v]], body }. Host (and Content-Length) are added as a client would. */
  function rawRequest(req) {
    const headers = [['Host', HOST], ...req.headers.filter(([k]) => k.toLowerCase() !== 'host')];
    if (req.body && req.body.trim()) headers.push(['Content-Length', String(byteLength(req.body))]);
    return { first: `${req.method} ${req.target} HTTP/1.1`, headers, body: req.body || '' };
  }

  const rawResponse = (res) => ({ first: `HTTP/1.1 ${res.status} ${res.reason}`, headers: res.headers, body: res.body });

  /* ---- Challenges ------------------------------------------------------------------------------ */

  const q = (entry, k) => { const hit = entry.req.query.filter(([n]) => n === k); return hit.length ? hit[hit.length - 1][1] : undefined; };
  const isList = (entry) => entry.req.method === 'GET' && entry.req.path === '/api/tasks' && entry.res.status === 200 && Array.isArray(entry.res.data);
  const taskAfter = (entry, tid) => entry.state.tasks.find((r) => r.id === tid);

  const CHALLENGES = [
    { id: 'create-task', title: 'Create a task',
      goal: 'Create a new task and get a **201 Created**. Then read the `Location` header: it is the URL of the new task.',
      hint: 'Method `POST`, path `/api/tasks`, header `Content-Type: application/json`, body `{ "title": "Study REST" }`.',
      check: (e) => e.req.method === 'POST' && e.res.status === 201 && /^\/api\/tasks\/\d+$/.test((e.res.headers.find(([k]) => k === 'Location') || [])[1] || '') },
    { id: 'patch-done', title: 'Mark task 2 as done',
      goal: 'Task 2 is not done yet. Mark it as done **with PATCH**, changing only that field.',
      hint: '`PATCH /api/tasks/2` with `Content-Type: application/json` and the body `{ "done": true }`.',
      check: (e) => e.req.method === 'PATCH' && e.req.path === '/api/tasks/2' && e.res.status === 200 && !!taskAfter(e, 2) && taskAfter(e, 2).done === true },
    { id: 'list-undone', title: 'Only unfinished tasks',
      goal: 'List **only** the tasks that are not done yet, letting the server do the filtering.',
      hint: 'A filter belongs in the query string: `GET /api/tasks?done=false`.',
      check: (e) => isList(e) && q(e, 'done') === 'false' && e.res.data.length > 0 && e.res.data.every((t) => t.done === false) },
    { id: 'page-two', title: 'Page 2, two per page',
      goal: 'Get the **second page** of tasks with **2 tasks per page**. Then look at the `X-Total-Count` and `Link` headers.',
      hint: '`GET /api/tasks?page=2&limit=2` (or, in offset style, `?offset=2&limit=2`).',
      check: (e) => isList(e) && q(e, 'limit') === '2' && (q(e, 'page') === '2' || q(e, 'offset') === '2') && e.res.data.length > 0 },
    { id: 'newest-first', title: 'Newest first',
      goal: 'List the tasks sorted by creation date, **newest first**.',
      hint: '`GET /api/tasks?sort=createdAt&order=desc`',
      check: (e) => isList(e) && q(e, 'sort') === 'createdAt' && q(e, 'order') === 'desc' },
    { id: 'user-tasks', title: 'The tasks of user 2',
      goal: 'Read the tasks that belong to **user 2** using the **nested** route (a sub-collection of that user).',
      hint: '`GET /api/users/2/tasks`. (The filter `GET /api/tasks?userId=2` gives the same items; here, use the nested path.)',
      check: (e) => e.req.method === 'GET' && e.req.path === '/api/users/2/tasks' && e.res.status === 200 },
    { id: 'validation', title: 'Read a validation error',
      goal: 'Send a create or update that breaks a rule, get a **400** and read the field-level `errors` list. Can you trigger two errors at once?',
      hint: 'Try `POST /api/tasks` with `{ "title": "", "done": "yes" }`.',
      check: (e) => ['POST', 'PUT', 'PATCH'].includes(e.req.method) && e.res.status === 400 && e.res.data && Array.isArray(e.res.data.errors) && e.res.data.errors.some((x) => x.field && x.field !== 'id') },
    { id: 'delete-proof', title: 'Delete, then prove it is gone',
      goal: 'Delete a task (**204**), then request that same task and get a **404**.',
      hint: '`DELETE /api/tasks/5`, then `GET /api/tasks/5`.',
      check: (e, history) => {
        const m = e.req.path.match(/^\/api\/tasks\/(\d+)$/);
        return e.req.method === 'GET' && !!m && e.res.status === 404
          && history.some((h) => h.req.method === 'DELETE' && h.req.path === e.req.path && h.res.status === 204);
      } },
    { id: 'not-allowed', title: 'A method the path does not support',
      goal: 'Get a **405 Method Not Allowed** and read the `Allow` header that comes with it.',
      hint: 'Try to delete the whole collection: `DELETE /api/tasks`. Or `POST /api/tasks/1`.',
      check: (e) => e.res.status === 405 && e.res.headers.some(([k]) => k === 'Allow') },
    { id: 'media-type', title: 'Forget the Content-Type',
      goal: 'Send a JSON body **without** saying it is JSON and get a **415 Unsupported Media Type**.',
      hint: 'A `POST /api/tasks` with a body but with the `Content-Type` header removed (or set to `text/plain`).',
      check: (e) => e.res.status === 415 },
    { id: 'admin-user', title: 'Create a user (admins only)',
      goal: 'Create a user with `POST /api/users`. First send it with **no token** (401) and with the **student** token (403); then use the admin token and get **201**.',
      hint: 'Body `{ "name": "Iris", "email": "iris@example.com", "password": "longpassword" }` and the header `Authorization: Bearer admin-token`.',
      check: (e) => e.req.method === 'POST' && e.req.path === '/api/users' && e.res.status === 201 },
    { id: 'conflict', title: 'A conflicting create',
      goal: 'Try to create a user whose email **already exists** and get a **409 Conflict**.',
      hint: 'With the admin token, `POST /api/users` with the email `ana@example.com`.',
      check: (e) => e.req.path === '/api/users' && e.res.status === 409 },
  ];

  return { ORIGIN, METHODS, REASON, TOKENS, LOGIN_PASSWORD, ROUTES, CHALLENGES, createState, request, curl, fetchCode, rawRequest, rawResponse, taskDto, userDto, parseTarget };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MockApiEngine;
