'use strict';

/* ==========================================================================
   Express engine (pure, no DOM; also runs in Node: site/test/express-engine.test.mjs).
   Simulates Express 4.x (still pinned by many projects) faithfully
   enough to teach with; Express 5 differences are behind opts.version = 5.

   1. Paths (route-matcher)
      compile(pattern, { end, strict, sensitive })  → { re, keys } (port of
        path-to-regexp 0.1.x, the Express 4 router), for a checked subset:
        literals, ":name", ":name?" and "*".
      checkPattern(pattern) → '' or an error message.
      parseUrl(url) → { pathname, search, hash, query, error }
      parseQuery(search) → req.query (the "extended" qs parser, common subset)
      matchRoutes(routes, method, url) → which route answers first and why
        the others did not; req.params / query / path / baseUrl / originalUrl.

   2. Middleware pipeline (middleware-pipeline)
      Layers are { id, kind: 'use' | 'route' | 'router', mount?, method?,
      path?, fn, variant?, on?, routes? }. Every fn is a behaviour in
      BEHAVIORS: a real JavaScript function run against a simulated req/res,
      so mistakes fail with the same errors as in Node (a 3-parameter error
      handler really calls next.status(), a missing body really throws
      "Cannot destructure property 'title' of 'req.body'...").
      simulate(layers, request, { version }) → { steps, final, response,
        console, headersSentError, req } following Express's dispatch:
        registration order, prefix matching for app.use, method + path for
        routes, next() / next(err), arity 4 = error handler, the default 404
        and error pages (finalhandler), a request that hangs, the
        "Cannot set headers after they are sent" error, and async errors
        (Express 4: unhandled rejection → the process crashes; Express 5:
        forwarded to next(err)).
      PRESETS, presetLayers(id), MW_CHALLENGES / RT_PRESETS / RT_CHALLENGES.
   ========================================================================== */

const ExpressEngine = (() => {
  /* ======================================================================
     1. Paths
     ====================================================================== */

  const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const REASON = {
    200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized',
    403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 413: 'Payload Too Large', 415: 'Unsupported Media Type', 500: 'Internal Server Error', 503: 'Service Unavailable',
  };

  /* Which patterns the tool accepts: a safe subset that path-to-regexp 0.1.x handles the same way. */
  function checkPattern(p) {
    if (typeof p !== 'string' || !p.length) return 'Write a path that starts with "/".';
    if (p === '*') return '';
    if (p[0] !== '/') return 'A path starts with "/".';
    if (!/^[A-Za-z0-9_\-.~/:*?]*$/.test(p)) return 'This tool supports letters, digits, "-", "_", ".", "~", "/", ":name", ":name?" and "*".';
    if (/:\w+\??\*/.test(p)) return 'Write "*" as its own segment (for example /files/*), not right after a parameter.';
    const rest = p.replace(/:\w+\??/g, '');
    if (rest.includes(':')) return 'A ":" must be followed by a parameter name, like :id.';
    if (rest.includes('?')) return 'In this tool "?" is allowed only right after a parameter (:name?), to make it optional.';
    return '';
  }

  /* path-to-regexp 0.1.x (Express 4), for string paths. Kept close to the original so the regular
     expression is exactly the one Express builds for the accepted subset. */
  const MATCHING_GROUP = /\\.|\((?:\?<(.*?)>)?(?!\?)/g;
  function compile(path, options = {}) {
    const keys = [];
    const strict = !!options.strict;
    const end = options.end !== false;
    const flags = options.sensitive ? '' : 'i';
    let extraOffset = 0;
    let i = 0;
    let name = 0;
    let pos = 0;
    let backtrack = '';
    let src = path.replace(/\\.|(\/)?(\.)?:(\w+)(\(.*?\))?(\*)?(\?)?|[.*]|\/\(/g, (match, slash, format, key, capture, star, optional, offset) => {
      if (match[0] === '\\') { backtrack += match; pos += 2; return match; }
      if (match === '.') { backtrack += '\\.'; extraOffset += 1; pos += 1; return '\\.'; }
      if (slash || format) backtrack = '';
      else backtrack += path.slice(pos, offset);
      pos = offset + match.length;
      if (match === '*') { backtrack = ''; extraOffset += 3; return '(.*)'; }
      if (match === '/(') { backtrack += '/'; extraOffset += 2; return '/(?:'; }
      slash = slash || '';
      format = format ? '\\.' : '';
      optional = optional || '';
      capture = capture
        ? capture.replace(/\\.|\*/, (m) => (m === '*' ? '(.*)' : m))
        : (backtrack ? `((?:(?!/|${backtrack}).)+?)` : `([^/${format}]+?)`);
      keys.push({ name: key, optional: !!optional, offset: offset + extraOffset });
      const result = `(?:${format}${slash}${capture}${star ? `((?:[/${format}].+?)?)` : ''})${optional}`;
      backtrack = '';
      extraOffset += result.length - match.length;
      return result;
    });
    let m;
    MATCHING_GROUP.lastIndex = 0;
    while ((m = MATCHING_GROUP.exec(src))) {
      if (m[0][0] === '\\') continue;
      if (i === keys.length || keys[i].offset > m.index) keys.splice(i, 0, { name: name++, optional: false, offset: m.index });
      i++;
    }
    src += strict ? '' : src[src.length - 1] === '/' ? '?' : '/?';
    if (end) src += '$';
    else if (src[src.length - 1] !== '/') src += '(?=/|$)';
    return { re: new RegExp(`^${src}`, flags), keys };
  }

  /* Express 4's decode_param: a malformed %-escape is a 400 error. */
  function decodeParam(val) {
    if (typeof val !== 'string' || val.length === 0) return val;
    try { return decodeURIComponent(val); } catch (e) {
      const err = new URIError(`Failed to decode param '${val}'`);
      err.status = 400;
      throw err;
    }
  }

  /* One layer's match (Express 4 Layer.match): { path: matched part, params } or null.
     end: true for routes (whole path), false for app.use / routers (a prefix ending at "/" or the end). */
  function matchPath(pattern, pathname, end = true) {
    const params = {};
    if (!end && (pattern === '/' || pattern === '')) return { path: '', params };   // fast_slash
    if (pattern === '*') return { path: pathname, params: { 0: decodeParam(pathname) } };   // fast_star
    const { re, keys } = compile(pattern, { end });
    const m = re.exec(pathname);
    if (!m) return null;
    for (let k = 1; k < m.length; k++) {
      const prop = keys[k - 1].name;
      const val = decodeParam(m[k]);
      if (val !== undefined || !Object.prototype.hasOwnProperty.call(params, prop)) params[prop] = val;
    }
    return { path: m[0], params };
  }

  /* ---- Query strings (Express 4 "extended" parser: the qs library, common cases) ---- */

  const UNSAFE_KEY = (k) => k === '__proto__' || Object.prototype.hasOwnProperty.call(Object.prototype, k);
  const decodeQ = (s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } };

  function parseQuery(search) {
    const out = {};
    const s = String(search || '').replace(/^\?/, '');
    if (!s) return out;
    s.split('&').forEach((part) => {
      if (!part) return;
      const bracketEq = part.indexOf(']=');
      const eq = bracketEq === -1 ? part.indexOf('=') : bracketEq + 1;
      const key = decodeQ(eq === -1 ? part : part.slice(0, eq));
      const val = eq === -1 ? '' : decodeQ(part.slice(eq + 1));
      if (!key) return;
      const m = /^([^[\]]+)((?:\[[^[\]]*\]){1,5})$/.exec(key);
      if (!m) { if (!UNSAFE_KEY(key)) add(out, key, val); return; }
      const root = m[1];
      if (UNSAFE_KEY(root)) return;
      const segs = m[2].slice(1, -1).split('][');
      setDeep(out, root, segs, val);
    });
    return out;
  }
  function add(obj, key, val) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = val;
    else if (Array.isArray(obj[key])) obj[key].push(val);
    else obj[key] = [obj[key], val];
  }
  function setDeep(obj, key, segs, val) {
    if (!segs.length) { add(obj, key, val); return; }
    const [seg, ...rest] = segs;
    if (seg === '' || /^\d+$/.test(seg)) {                  // a[] or a[0]: an array
      if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = [];
      else if (!Array.isArray(obj[key]) && typeof obj[key] !== 'object') obj[key] = [obj[key]];
      const arr = obj[key];
      if (!rest.length) { if (Array.isArray(arr)) arr.push(val); else add(arr, String(Object.keys(arr).length), val); return; }
      const holder = {};
      setDeep(holder, 'x', rest, val);
      if (Array.isArray(arr)) arr.push(holder.x); else arr[Object.keys(arr).length] = holder.x;
      return;
    }
    if (UNSAFE_KEY(seg)) return;
    if (!Object.prototype.hasOwnProperty.call(obj, key) || typeof obj[key] !== 'object') obj[key] = {};
    setDeep(obj[key], seg, rest, val);
  }

  /* "http://localhost:3000/tasks?done=true#x" or "/tasks?done=true" → its parts. */
  function parseUrl(url) {
    let s = String(url || '').trim();
    const notes = [];
    const origin = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i.exec(s);
    if (origin) { s = s.slice(origin[0].length) || '/'; notes.push('origin'); }
    let hash = '';
    const h = s.indexOf('#');
    if (h !== -1) { hash = s.slice(h); s = s.slice(0, h); notes.push('fragment'); }
    if (!s.startsWith('/')) return { error: 'The request path must start with "/" (for example /tasks/7).', pathname: '', search: '', hash, query: {}, notes };
    if (/\s/.test(s)) return { error: 'A URL cannot contain spaces: write them as %20.', pathname: '', search: '', hash, query: {}, notes };
    const q = s.indexOf('?');
    const pathname = q === -1 ? s : s.slice(0, q);
    const search = q === -1 ? '' : s.slice(q);
    return { pathname, search, hash, query: parseQuery(search), url: pathname + search, notes, error: '' };
  }

  /* Literal segments, ":params" only → a segment-by-segment reason; otherwise a general one. */
  function mismatchReason(pattern, pathname) {
    if (/[*?]/.test(pattern) || /[^/]:\w|:\w+[^/\w]/.test(pattern)) return { code: 'pattern', text: `\`${pathname}\` does not fit the pattern \`${pattern}\`.` };
    const pSegs = pattern.replace(/\/$/, '').split('/').slice(1);
    const uSegs = pathname.replace(/\/$/, '').split('/').slice(1);
    if (pattern === '/') return { code: 'count', text: `\`${pattern}\` matches only \`/\` (the path here is \`${pathname}\`).` };
    for (let k = 0; k < Math.min(pSegs.length, uSegs.length); k++) {
      const ps = pSegs[k];
      const us = uSegs[k];
      if (ps.startsWith(':')) { if (!us) return { code: 'empty', text: `Segment ${k + 1} is empty, but \`${ps}\` needs at least one character.` }; continue; }
      if (ps.toLowerCase() !== us.toLowerCase()) return { code: 'segment', text: `Segment ${k + 1}: \`${us || '(empty)'}\` is not \`${ps}\`.` };
    }
    if (pSegs.length !== uSegs.length) {
      return { code: 'count', text: `\`${pattern}\` has ${pSegs.length} segment${pSegs.length === 1 ? '' : 's'}; \`${pathname}\` has ${uSegs.length}. A route matches the whole path, not the start of it.` };
    }
    return { code: 'pattern', text: `\`${pathname}\` does not fit the pattern \`${pattern}\`.` };
  }

  /* routes: [{ method: 'GET' | … | 'ALL', mount: '' | '/api/tasks', path: '/:id' }]
     Each row is app.METHOD(path) when mount is empty, or router.METHOD(path) with
     app.use(mount, router). The first row that matches answers (every handler responds). */
  function matchRoutes(routes, method, url) {
    const u = parseUrl(url);
    const out = { url: u, method, results: [], winner: -1, req: null, status: 0, decodeError: null };
    if (u.error) return out;
    routes.forEach((r, k) => {
      const res = { index: k, status: 'path', text: '' };
      out.results.push(res);
      const perr = checkPattern(r.path) || (r.mount ? (checkPattern(r.mount) || (/[*?]/.test(r.mount) ? 'This tool supports only literals and :params in a mount path.' : '')) : '');
      if (perr) { res.status = 'invalid'; res.text = perr; return; }
      let rest = u.pathname;
      let baseUrl = '';
      let mountParams = {};
      try {
        if (r.mount) {
          const mm = matchPath(r.mount, u.pathname, false);
          if (!mm) { res.status = 'mount'; res.text = `The URL does not start with the mount path \`${r.mount}\` (followed by \`/\` or the end), so Express never enters this router.`; return; }
          mountParams = mm.params;
          rest = u.pathname.slice(mm.path.length);
          if (rest[0] !== '/') rest = `/${rest}`;
          baseUrl = mm.path.replace(/\/$/, '');
        }
        const pm = matchPath(r.path, rest, true);
        if (!pm) { res.status = 'path'; const why = mismatchReason(r.path, rest); res.code = why.code; res.text = r.mount ? `Inside the router the path is \`${rest}\`. ${why.text}` : why.text; return; }
        const okMethod = r.method === 'ALL' || r.method === method || (method === 'HEAD' && r.method === 'GET');
        if (!okMethod) { res.status = 'method'; res.text = `The path matches, but this route answers ${r.method} only and the request is ${method}.`; return; }
        if (out.winner !== -1) {
          res.status = 'shadowed';
          res.text = `It would match too, but route ${out.winner + 1} already answered: a later route never runs.`;
          return;
        }
        if (out.decodeError) { res.status = 'error'; res.text = 'An error is already pending, so Express skips every remaining route.'; return; }
        out.winner = k;
        res.status = 'match';
        res.text = method === 'HEAD' && r.method === 'GET' ? 'First match: Express answers HEAD with the GET route (headers only, no body).' : 'First match: this handler answers the request.';
        out.req = { params: pm.params, mountParams, query: u.query, path: rest, baseUrl, originalUrl: u.url, url: rest + u.search };
      } catch (e) {
        if (out.winner !== -1) { res.status = 'shadowed'; res.text = `Never reached: route ${out.winner + 1} already answered.`; return; }
        if (out.decodeError) { res.status = 'error'; res.text = 'An error is already pending, so Express skips every remaining route.'; return; }
        out.decodeError = e.message;
        res.status = 'decode';
        res.text = `${e.message}: Express turns this into an error with status 400 and skips every remaining route.`;
      }
    });
    out.status = out.winner !== -1 ? 200 : out.decodeError ? 400 : 404;
    return out;
  }
  /* ======================================================================
     2. Middleware pipeline
     ====================================================================== */

  const TASKS = [
    { id: 1, title: 'Write the API skeleton', done: true, userId: 1 },
    { id: 2, title: 'Add a request logger', done: false, userId: 1 },
    { id: 3, title: 'Split handlers into a controller', done: false, userId: 2 },
  ];
  const TOKEN = 'demo-token';
  const STATIC_FILES = {
    '/index.html': ['text/html; charset=UTF-8', '<!doctype html>\n<html lang="en">\n<head><title>Tasks</title><link rel="stylesheet" href="styles.css"></head>\n<body><h1>My tasks</h1><ul id="list"></ul><script src="app.js"></script></body>\n</html>'],
    '/styles.css': ['text/css; charset=UTF-8', 'body { font-family: system-ui, sans-serif; margin: 2rem; }'],
    '/app.js': ['application/javascript; charset=UTF-8', "fetch('/api/tasks').then((r) => r.json()).then(render);"],
  };
  const REJECTED = Symbol('rejected promise');
  const rejected = (err) => ({ [REJECTED]: err });

  const errName = (e) => {
    if (e === null || e === undefined) return String(e);
    if (typeof e !== 'object') return String(e);
    return e.code ? `${e.name || 'Error'} [${e.code}]` : e.name || 'Error';
  };
  const errText = (e) => (e && typeof e === 'object' && 'message' in e ? `${errName(e)}: ${e.message}` : String(e));
  const short = (v) => {
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  };
  const bytes = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : unescape(encodeURIComponent(s)).length);

  function headersSentError() {
    const e = new Error('Cannot set headers after they are sent to the client');
    e.code = 'ERR_HTTP_HEADERS_SENT';
    return e;
  }

  /* Behaviours: what each layer's function does. code(variant) is what the page shows;
     make(ctx, variant) returns the real function (its .length is what Express checks). */
  const BEHAVIORS = {
    json: {
      title: 'express.json()', expr: 'express.json()',
      code: () => ['// built in: reads a JSON body into req.body', 'express.json()'],
      make: (ctx) => function jsonParser(req, res, next) {
        if (ctx.version === 4) req.body = req.body || {};
        const raw = ctx.rawBody;
        const type = String(req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
        if (!raw) { ctx.say(ctx.version === 4 ? 'No body to read: `req.body` is set to `{}`.' : 'No body to read: Express 5 leaves `req.body` undefined.'); return next(); }
        if (type !== 'application/json') {
          ctx.say(`${type ? `\`Content-Type\` is \`${type}\`` : 'There is no `Content-Type` header'}, not \`application/json\`, so the body is not parsed: \`req.body\` is ${ctx.version === 4 ? '`{}`' : '`undefined` (Express 5)'}.`);
          return next();
        }
        const first = raw.trim()[0];
        let parsed;
        try {
          if (first !== '{' && first !== '[') {                   // strict mode: only objects and arrays
            const at = raw.indexOf(first);
            const partial = `${raw.slice(0, at)}#${raw.slice(at + 1)}`;
            try { JSON.parse(partial); throw new SyntaxError('strict violation'); } catch (e) {
              throw new SyntaxError(e.message.replace(/#+/g, (p) => raw.substring(at, at + p.length)));
            }
          }
          parsed = JSON.parse(raw);
        } catch (e) {
          const err = new SyntaxError(e.message);
          err.status = 400;
          err.type = 'entity.parse.failed';
          ctx.say('The body is not valid JSON: the parser creates an error with `status` 400 and passes it on.');
          return next(err);
        }
        req.body = parsed;
        ctx.say(`Parsed the JSON body: \`req.body\` is now \`${short(parsed)}\`.`);
        next();
      },
    },
    logger: {
      title: 'logger', expr: 'logger',
      variants: [['next', 'calls next()'], ['forget', 'forgets next()']],
      code: (v) => ['function logger(req, res, next) {', '  console.log(`${req.method} ${req.url}`);', v === 'forget' ? '  // next() is missing' : '  next();', '}'],
      make: (ctx, v) => function logger(req, res, next) {
        ctx.console.log(`${req.method} ${req.url}`);
        if (v !== 'forget') next();
      },
    },
    cors: {
      title: 'cors()', expr: 'cors()',
      code: () => ["// npm install cors · const cors = require('cors');", '// adds Access-Control-Allow-Origin to every response', 'cors()'],
      make: () => function corsMiddleware(req, res, next) {
        res.set('Access-Control-Allow-Origin', '*');
        next();
      },
    },
    static: {
      title: "express.static('public')", expr: "express.static('public')",
      code: () => ['// built in: sends files from the public/ folder', '// public/index.html · public/styles.css · public/app.js', "express.static('public')"],
      make: (ctx) => function serveStatic(req, res, next) {
        if (req.method !== 'GET' && req.method !== 'HEAD') { ctx.say(`Only GET and HEAD read files; this is ${req.method}.`); return next(); }
        const p = req.path.endsWith('/') ? `${req.path}index.html` : req.path;
        const file = STATIC_FILES[p];
        if (!file) { ctx.say(`There is no file \`public${p}\`.`); return next(); }
        ctx.say(`Found \`public${p}\` and sends it.`);
        res.set('Content-Type', file[0]);
        res.set('Cache-Control', 'public, max-age=0');
        res.send(file[1]);
      },
    },
    auth: {
      title: 'requireAuth', expr: 'requireAuth',
      code: () => [
        'function requireAuth(req, res, next) {',
        "  const header = req.get('Authorization');",
        `  if (header !== 'Bearer ${TOKEN}') {`,
        "    return res.status(401).json({ error: 'Log in first' });",
        '  }',
        "  req.user = { id: 1, name: 'Ana' };   // a real app verifies a JWT here",
        '  next();',
        '}',
      ],
      make: (ctx) => function requireAuth(req, res, next) {
        const header = req.get('Authorization');
        if (header !== `Bearer ${TOKEN}`) {
          ctx.say(header ? `\`Authorization\` is \`${header}\`, not the expected token: it answers 401.` : 'No `Authorization` header: it answers 401 and does not call `next()`.');
          return res.status(401).json({ error: 'Log in first' });
        }
        req.user = { id: 1, name: 'Ana' };
        ctx.say('The token is valid: it stores the user in `req.user`.');
        next();
      },
    },
    health: {
      title: 'health', expr: "(req, res) => res.json({ status: 'ok' })",
      code: () => ["(req, res) => res.json({ status: 'ok' })"],
      make: () => (req, res) => res.json({ status: 'ok' }),
    },
    echo: {
      title: 'echo', expr: '(req, res) => res.json({ echo: req.params.msg })',
      code: () => ['(req, res) => res.json({ echo: req.params.msg })'],
      make: () => (req, res) => res.json({ echo: req.params.msg }),
    },
    listTasks: {
      title: 'listTasks', expr: 'listTasks',
      code: () => ['function listTasks(req, res) {', '  res.json(tasks);', '}'],
      make: (ctx) => function listTasks(req, res) { res.json(ctx.tasks); },
    },
    getTask: {
      title: 'getTask', expr: 'getTask',
      code: () => [
        'function getTask(req, res) {',
        '  const task = tasks.find((t) => t.id === Number(req.params.id));',
        "  if (!task) return res.status(404).json({ error: 'Task not found' });",
        '  res.json(task);',
        '}',
      ],
      make: (ctx) => function getTask(req, res) {
        const task = ctx.tasks.find((t) => t.id === Number(req.params.id));
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
      },
    },
    createTask: {
      title: 'createTask', expr: 'createTask',
      variants: [['return', 'with return'], ['noreturn', 'without return']],
      code: (v) => [
        'function createTask(req, res) {',
        '  const { title } = req.body;',
        `  if (!title) ${v === 'noreturn' ? '' : 'return '}res.status(400).json({ error: 'title is required' });`,
        '  const task = { id: tasks.length + 1, title, done: false };',
        '  tasks.push(task);',
        '  res.status(201).json(task);',
        '}',
      ],
      make: (ctx, v) => function createTask(req, res) {
        const { title } = req.body;
        if (!title) {
          if (v === 'noreturn') res.status(400).json({ error: 'title is required' });
          else return res.status(400).json({ error: 'title is required' });
        }
        const task = { id: ctx.tasks.length + 1, title, done: false };
        ctx.tasks.push(task);
        res.status(201).json(task);
      },
    },
    boom: {
      title: 'boom', expr: '(req, res, next) => …',
      variants: [['next', 'next(new Error())'], ['throw', 'throw new Error()']],
      code: (v) => (v === 'throw'
        ? ['(req, res, next) => {', "  throw new Error('Boom!');", '}']
        : ['(req, res, next) => {', "  next(new Error('Boom!'));", '}']),
      make: (ctx, v) => (v === 'throw'
        ? function boom(req, res, next) { throw new Error('Boom!'); }   // eslint-disable-line no-unused-vars
        : function boom(req, res, next) { next(new Error('Boom!')); }),
    },
    stats: {
      title: 'stats', expr: 'async (req, res…) => …',
      variants: [['unsafe', 'no try/catch'], ['safe', 'try/catch + next(err)']],
      code: (v) => (v === 'safe'
        ? ['async (req, res, next) => {', '  try {', '    const stats = await db.getStats();   // the database is offline', '    res.json(stats);', '  } catch (err) {', '    next(err);', '  }', '}']
        : ['async (req, res) => {', '  const stats = await db.getStats();   // the database is offline', '  res.json(stats);', '}']),
      make: (ctx, v) => (v === 'safe'
        ? function stats(req, res, next) {
          try {
            ctx.say('`await db.getStats()` rejects: the `catch` block passes the error to `next(err)`.');
            throw new Error('Database is offline');
          } catch (err) {
            next(err);
          }
          return null;
        }
        : function stats(req, res) {  // eslint-disable-line no-unused-vars
          ctx.say('`await db.getStats()` rejects, and nothing in the function catches it.');
          return rejected(new Error('Database is offline'));
        }),
    },
    getMe: {
      title: 'getMe', expr: '(req, res) => res.json({ user: req.user })',
      code: () => ['(req, res) => res.json({ user: req.user })'],
      make: (ctx) => (req, res) => {
        if (req.user === undefined) ctx.say('`req.user` is `undefined` (no guard ran before this route), and `JSON.stringify` drops it: the body is `{}`.');
        res.json({ user: req.user });
      },
    },
    notFound: {
      title: '404 catch-all', expr: '(req, res) => …',
      code: () => ['(req, res) => {', '  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });', '}'],
      make: () => (req, res) => {
        res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
      },
    },
    errorHandler: {
      title: 'error handler', expr: '(err, req, res, next) => …',
      variants: [['4', '4 parameters'], ['3', '3 parameters']],
      code: (v) => [
        v === '3' ? '(err, req, res) => {' : '(err, req, res, next) => {',
        '  console.error(err.message);',
        '  res.status(err.status || 500).json({ error: err.message });',
        '}',
      ],
      make: (ctx, v) => (v === '3'
        ? function errorHandler(err, req, res) {
          ctx.console.error(err.message);
          res.status(err.status || 500).json({ error: err.message });
        }
        : function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
          ctx.console.error(err.message);
          res.status(err.status || 500).json({ error: err.message });
        }),
    },
  };

  /* The registration line of a layer, as it appears in app.js. */
  function regLine(layer, inRouter) {
    const b = BEHAVIORS[layer.fn] || {};
    if (layer.kind === 'router') return `app.use('${layer.mount}', ${layer.name || 'router'});`;
    if (layer.kind === 'route') return `${inRouter ? 'router' : 'app'}.${layer.method.toLowerCase()}('${layer.path}', ${b.expr});`;
    return `app.use(${layer.mount && layer.mount !== '/' ? `'${layer.mount}', ` : ''}${b.expr});`;
  }
  /* A short name for explanations: app.get('/health'), router.post('/'), app.use(logger). */
  const label = (layer, inRouter) => (layer.kind === 'route'
    ? `${inRouter ? 'router' : 'app'}.${layer.method.toLowerCase()}('${layer.path}')`
    : regLine(layer, inRouter).replace(/;$/, ''));
  const codeOf = (layer) => {
    const b = BEHAVIORS[layer.fn];
    return b ? b.code(layer.variant || (b.variants ? b.variants[0][0] : '')) : [];
  };

  /* ---- Presets --------------------------------------------------------------------------- */

  const L = {
    json: { id: 'json', kind: 'use', fn: 'json' },
    logger: { id: 'logger', kind: 'use', fn: 'logger', variant: 'next' },
    cors: { id: 'cors', kind: 'use', fn: 'cors' },
    static: { id: 'static', kind: 'use', fn: 'static' },
    health: { id: 'health', kind: 'route', method: 'GET', path: '/health', fn: 'health' },
    echo: { id: 'echo', kind: 'route', method: 'GET', path: '/echo/:msg', fn: 'echo' },
    tasks: {
      id: 'tasks', kind: 'router', mount: '/tasks', name: 'tasksRouter',
      routes: [
        { id: 'tasks-list', kind: 'route', method: 'GET', path: '/', fn: 'listTasks' },
        { id: 'tasks-create', kind: 'route', method: 'POST', path: '/', fn: 'createTask', variant: 'return' },
        { id: 'tasks-get', kind: 'route', method: 'GET', path: '/:id', fn: 'getTask' },
      ],
    },
    boom: { id: 'boom', kind: 'route', method: 'GET', path: '/boom', fn: 'boom', variant: 'next' },
    stats: { id: 'stats', kind: 'route', method: 'GET', path: '/stats', fn: 'stats', variant: 'unsafe' },
    notFound: { id: 'notFound', kind: 'use', fn: 'notFound' },
    errors: { id: 'errors', kind: 'use', fn: 'errorHandler', variant: '4' },
    apiHealth: { id: 'apiHealth', kind: 'route', method: 'GET', path: '/api/health', fn: 'health' },
    auth: { id: 'auth', kind: 'use', mount: '/api', fn: 'auth' },
    me: { id: 'me', kind: 'route', method: 'GET', path: '/api/me', fn: 'getMe' },
    apiTasks: {
      id: 'apiTasks', kind: 'router', mount: '/api/tasks', name: 'tasksRouter',
      routes: [
        { id: 'api-list', kind: 'route', method: 'GET', path: '/', fn: 'listTasks' },
        { id: 'api-create', kind: 'route', method: 'POST', path: '/', fn: 'createTask', variant: 'return' },
      ],
    },
  };

  const R = (method, path, extra = {}) => ({ method, path, contentType: '', auth: '', body: '', ...extra });
  const JSON_CT = 'application/json';
  const LAB_REQUESTS = [
    R('GET', '/health'), R('GET', '/echo/hello'), R('GET', '/tasks'), R('GET', '/tasks/2'),
    R('POST', '/tasks', { contentType: JSON_CT, body: '{"title":"Buy milk"}' }), R('GET', '/boom'), R('GET', '/nope'),
  ];
  const API_REQUESTS = [
    R('GET', '/api/health'), R('GET', '/api/me'), R('GET', '/api/me', { auth: `Bearer ${TOKEN}` }),
    R('GET', '/api/tasks', { auth: `Bearer ${TOKEN}` }), R('POST', '/api/tasks', { auth: `Bearer ${TOKEN}`, contentType: JSON_CT, body: '{"title":"Buy milk"}' }),
  ];
  const SITE_REQUESTS = [R('GET', '/'), R('GET', '/styles.css'), R('GET', '/api/tasks'), R('GET', '/about.html')];

  const base = {
    lab: ['json', 'logger', 'health', 'echo', 'tasks', 'boom', 'notFound', 'errors'],
    api: ['cors', 'json', 'logger', 'apiHealth', 'auth', 'me', 'apiTasks', 'notFound', 'errors'],
    site: ['logger', 'static', 'json', 'apiTasks', 'notFound', 'errors'],
  };

  /* A preset: base layer list + changes (off, variants, a new order), a sample request, sample requests. */
  const PRESETS = [
    { id: 'lab', group: 'app', title: 'Tasks API (routes, controller, logger)', layers: base.lab, requests: LAB_REQUESTS, request: LAB_REQUESTS[4],
      note: 'A typical first `app.js` for a tasks API, with a JSON 404 catch-all and `GET /tasks/:id` (both part of any finished API).' },
    { id: 'api', group: 'app', title: 'Protected API (auth guard + cors)', layers: base.api, requests: API_REQUESTS, request: API_REQUESTS[1],
      note: '`app.use(\'/api\', requireAuth)` guards every path that starts with `/api` and is registered after it. `GET /api/health` comes first, so it stays public. The valid token is `Bearer demo-token`.' },
    { id: 'site', group: 'app', title: 'Static front end + API', layers: base.site, requests: SITE_REQUESTS, request: SITE_REQUESTS[0],
      note: '`express.static(\'public\')` answers when a file exists and calls `next()` otherwise, so the API routes after it still work.' },
    { id: 'bug-json', group: 'bug', title: 'Bug: express.json() is missing', layers: base.lab, off: ['json'], requests: LAB_REQUESTS, request: LAB_REQUESTS[4],
      note: 'Without the body parser nobody reads the body, so `req.body` is `undefined` and `createTask` crashes on it.' },
    { id: 'bug-err3', group: 'bug', title: 'Bug: error handler with 3 parameters', layers: base.lab, variants: { errors: '3' }, requests: LAB_REQUESTS, request: LAB_REQUESTS[5],
      note: 'Express recognises an error handler only by its 4 parameters. With 3 it is ordinary middleware, so errors skip it.' },
    { id: 'bug-404', group: 'bug', title: 'Bug: 404 handler before the routes', layers: ['json', 'logger', 'notFound', 'health', 'echo', 'tasks', 'boom', 'errors'], requests: LAB_REQUESTS, request: LAB_REQUESTS[0],
      note: '`app.use(handler)` without a path matches every request, so a catch-all registered early answers everything.' },
    { id: 'bug-next', group: 'bug', title: 'Bug: middleware forgets next()', layers: base.lab, variants: { logger: 'forget' }, requests: LAB_REQUESTS, request: LAB_REQUESTS[0],
      note: 'A middleware that neither responds nor calls `next()` leaves the request waiting forever.' },
    { id: 'bug-async', group: 'bug', title: 'Bug: async route without try/catch', layers: ['json', 'logger', 'health', 'tasks', 'stats', 'notFound', 'errors'], requests: [R('GET', '/stats'), R('GET', '/health')], request: R('GET', '/stats'),
      note: 'In Express 4 a rejected promise never reaches the error handler. Compare Express 4 and 5 with the version switch.' },
    { id: 'bug-double', group: 'bug', title: 'Bug: two responses for one request', layers: base.lab, variants: { 'tasks-create': 'noreturn' }, requests: LAB_REQUESTS, request: R('POST', '/tasks', { contentType: JSON_CT, body: '{}' }),
      note: 'Without `return`, the function keeps running after the 400 and tries to send a 201 as well.' },
    { id: 'bug-auth', group: 'bug', title: 'Bug: guard registered after the route', layers: ['cors', 'json', 'logger', 'apiHealth', 'me', 'auth', 'apiTasks', 'notFound', 'errors'], requests: API_REQUESTS, request: API_REQUESTS[1],
      note: 'Middleware protects only what is registered after it.' },
  ];
  const presetById = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* The layer list of a preset, ready to edit: [{ ...layer, on: true, variant }]. */
  function presetLayers(id) {
    const p = presetById(id);
    return p.layers.map((key) => {
      const layer = clone(L[key]);
      layer.on = !(p.off || []).includes(layer.id);
      const fix = (x) => {
        const b = BEHAVIORS[x.fn];
        if (b && b.variants) x.variant = (p.variants || {})[x.id] || x.variant || b.variants[0][0];
      };
      fix(layer);
      (layer.routes || []).forEach(fix);
      return layer;
    });
  }

  /* ---- The simulated request and response ------------------------------------------------ */

  function makeReq(request, u) {
    const headers = { host: 'localhost:3000' };
    if (request.contentType) headers['content-type'] = request.contentType;
    if (request.auth) headers.authorization = request.auth;
    if (request.body) headers['content-length'] = String(bytes(request.body));
    const req = {
      method: request.method,
      url: u.url,
      originalUrl: u.url,
      baseUrl: '',
      params: {},
      query: u.query,
      headers,
      body: undefined,
      get(name) { return this.headers[String(name).toLowerCase()]; },
      header(name) { return this.get(name); },
    };
    Object.defineProperty(req, 'path', { enumerable: true, get() { return this.url.split('?')[0] || '/'; } });
    return req;
  }

  function makeRes(ctx) {
    const headers = [];                                     // [[Name, value]] in the order they were set
    const find = (name) => headers.findIndex(([k]) => k.toLowerCase() === String(name).toLowerCase());
    const res = {
      statusCode: 200,
      headersSent: false,
      locals: {},
      status(code) { this.statusCode = code; return this; },
      set(field, value) {
        if (this.headersSent) throw headersSentError();
        const k = find(field);
        if (k === -1) headers.push([field, String(value)]); else headers[k][1] = String(value);
        return this;
      },
      header(field, value) { return this.set(field, value); },
      get(field) { const k = find(field); return k === -1 ? undefined : headers[k][1]; },
      removeHeader(field) { const k = find(field); if (k !== -1 && !this.headersSent) headers.splice(k, 1); },
      location(url) { return this.set('Location', url); },
      json(obj) {
        const body = JSON.stringify(obj);
        if (!this.get('Content-Type')) this.set('Content-Type', 'application/json');
        return this.send(body);
      },
      send(body) {
        if (body !== null && typeof body === 'object') return this.json(body);
        let chunk = body === undefined || body === null ? '' : String(body);
        if (typeof body === 'string') {
          const type = this.get('Content-Type');
          if (!type) this.set('Content-Type', 'text/html; charset=utf-8');
          else if (!/charset=/i.test(type)) this.set('Content-Type', `${type}; charset=utf-8`);
        }
        if (this.statusCode === 204 || this.statusCode === 304) {
          this.removeHeader('Content-Type'); this.removeHeader('Content-Length'); chunk = '';
        } else if (body !== undefined && body !== null) this.set('Content-Length', bytes(chunk));
        return this.end(ctx.method === 'HEAD' ? '' : chunk);
      },
      sendStatus(code) {
        this.statusCode = code;
        this.set('Content-Type', 'text/plain; charset=utf-8');
        return this.send(REASON[code] || String(code));
      },
      end(chunk) {
        if (this.finished) return this;                    // Node ignores a second end()
        if (chunk && !this.get('Content-Length')) headers.push(['Content-Length', String(bytes(chunk))]);
        this.headersSent = true;
        this.finished = true;
        ctx.response = { status: this.statusCode, reason: REASON[this.statusCode] || '', headers: headers.map((h) => h.slice()), body: chunk || '', by: ctx.active ? ctx.active.id : 'express' };
        if (ctx.active) ctx.active.actions.push({ type: 'respond', status: this.statusCode });
        return this;
      },
    };
    return res;
  }

  /* ---- Dispatch ----------------------------------------------------------------------- */

  const isRejected = (v) => v !== null && typeof v === 'object' && REJECTED in v;

  function simulate(layers, request, opts = {}) {
    const version = opts.version === 5 ? 5 : 4;
    const u = parseUrl(request.path);
    const ctx = {
      version, method: request.method, rawBody: request.body || '', tasks: clone(TASKS),
      steps: [], lines: [], response: null, crashed: null, active: null, finalHandler: null, closed: false,
    };
    const print = (level) => (...a) => {
      const text = a.map(short).join(' ');
      ctx.lines.push({ level, text });
      if (ctx.active) ctx.active.logs.push(text);
    };
    ctx.console = { log: print('log'), error: print('error') };
    ctx.say = (text) => { if (ctx.active) ctx.active.notes.push(text); };
    const result = { version, request: { ...request }, url: u, steps: ctx.steps, console: ctx.lines, final: null, response: null, headersSentError: false, req: null };
    if (u.error) { result.final = { kind: 'invalid', text: u.error }; return result; }

    const req = makeReq(request, u);
    const res = makeRes(ctx);
    res.set('X-Powered-By', 'Express');                     // expressInit

    const on = layers.filter((l) => l.on !== false);
    handle(on, req, res, ctx, (err) => finalHandler(err, req, res, ctx), false);

    result.req = { body: req.body, user: req.user, params: req.params, query: req.query };
    result.headersSentError = ctx.steps.some((s) => s.actions.some((a) => a.err && a.err.code === 'ERR_HTTP_HEADERS_SENT'));
    if (ctx.crashed) {
      result.final = { kind: 'crash', by: ctx.crashed.step.id, err: errText(ctx.crashed.err) };
      ctx.lines.push({ level: 'error', text: `${errText(ctx.crashed.err)}\n    at stats (src/app.js)\nNode.js: an unhandled promise rejection is fatal (Node 15+). The process exits with code 1.` });
    } else if (ctx.response) {
      result.final = { kind: 'response', by: ctx.response.by, closed: ctx.closed };
      result.response = ctx.response;
    } else {
      const ran = ctx.steps.filter((s) => s.status === 'ran');
      const stuck = ran.reverse().find((s) => !s.actions.length);
      if (stuck) stuck.hang = true;
      result.final = { kind: 'hang', by: stuck ? stuck.id : null };
    }
    ctx.steps.forEach((s, k) => { s.n = k + 1; s.explain = explainStep(s, version); });
    result.final.explain = explainFinal(result, ctx);
    return result;
  }

  /* Express 4 router.handle: walk the stack; out(err) when it runs out. */
  function handle(stack, req, res, ctx, out, inRouter) {
    let idx = 0;
    let removed = '';
    let slashAdded = false;
    const parentUrl = req.baseUrl || '';
    const next = (err) => {
      if (ctx.crashed) return;
      if (slashAdded) { req.url = req.url.slice(1); slashAdded = false; }
      if (removed) { req.baseUrl = parentUrl; req.url = removed + req.url; removed = ''; }
      let layerError = err === undefined || err === null || err === false ? null : err;
      while (idx < stack.length) {
        const layer = stack[idx++];
        const path = req.path;
        const step = { id: layer.id, layer, inRouter, path, method: req.method, status: 'skip', reason: '', actions: [], notes: [], logs: [], error: !!layerError };
        ctx.steps.push(step);
        let m;
        try {
          m = layer.kind === 'route' ? matchPath(layer.path, path, true) : matchPath(layer.mount || '/', path, false);
        } catch (e) {
          step.reason = 'decode';
          step.detail = e.message;
          layerError = layerError || e;
          continue;
        }
        if (!m) { step.reason = 'path'; continue; }
        if (layer.kind === 'route') {
          if (layerError) { step.reason = 'error-route'; continue; }
          const okMethod = layer.method === req.method || (req.method === 'HEAD' && layer.method === 'GET');
          if (!okMethod) { step.reason = 'method'; continue; }
        }
        req.params = m.params;
        if (layer.kind === 'route') { call(layer, step, layerError, req, res, ctx, next); return; }
        if (m.path) {                                       // trim_prefix
          removed = m.path;
          req.url = req.url.slice(removed.length);
          if (req.url[0] !== '/') { req.url = `/${req.url}`; slashAdded = true; }
          req.baseUrl = parentUrl + (m.path.endsWith('/') ? m.path.slice(0, -1) : m.path);
        }
        if (layer.kind === 'router') {
          if (layerError) { step.reason = 'error-router'; next(layerError); return; }
          step.status = 'ran';
          step.enter = true;
          step.baseUrl = req.baseUrl;
          const savedParams = req.params;
          handle(layer.routes.filter((r) => r.on !== false), req, res, ctx, (e) => { req.params = savedParams; step.actions.push(e ? { type: 'leave-err', err: e } : { type: 'leave' }); next(e); }, true);
          return;
        }
        call(layer, step, layerError, req, res, ctx, next);
        return;
      }
      out(layerError);
    };
    next();
  }

  /* Layer.handle_request / handle_error, with the try/catch Express wraps around every call. */
  function call(layer, step, layerError, req, res, ctx, next) {
    const b = BEHAVIORS[layer.fn];
    const fn = b.make(ctx, layer.variant);
    step.arity = fn.length;
    if (layerError) {
      if (fn.length !== 4) { step.reason = 'error-mw'; next(layerError); return; }
    } else if (fn.length > 3) { step.reason = 'no-error'; next(); return; }
    step.status = 'ran';
    const wrapped = (e) => {
      if (ctx.crashed) return;
      step.actions.push(e === undefined || e === null ? { type: 'next' } : { type: 'next-err', err: e });
      next(e);
      ctx.active = step;
    };
    const prev = ctx.active;
    ctx.active = step;
    let ret;
    try {
      ret = layerError ? fn(layerError, req, res, wrapped) : fn(req, res, wrapped);
    } catch (e) {
      step.actions.push({ type: 'throw', err: e });
      ctx.active = prev;
      next(e);
      return;
    }
    if (isRejected(ret)) {
      const e = ret[REJECTED];
      if (ctx.version === 5) { step.actions.push({ type: 'reject', err: e, handled: true }); ctx.active = prev; next(e); return; }
      step.actions.push({ type: 'reject', err: e, handled: false });
      ctx.crashed = { err: e, step };
    }
    ctx.active = prev;
  }

  /* finalhandler: Express's own answer when no layer responded. */
  function finalHandler(err, req, res, ctx) {
    ctx.active = null;
    ctx.finalHandler = { err };
    if (!err && res.headersSent) return;                  // ignore a 404 on a response already sent
    let status = 404;
    let msg = `Cannot ${req.method} ${encodeUrl(req.originalUrl.split('?')[0])}`;
    if (err) {
      const s = err.status || err.statusCode;
      status = typeof s === 'number' && s >= 400 && s < 600 ? s : 500;
      msg = `${errText(err)}\n    at … (the stack trace: file names and line numbers)`;
      ctx.lines.push({ level: 'error', text: `${errText(err)}\n    at …` });   // Express logs every unhandled error
      if (res.headersSent) { ctx.closed = true; return; }   // it cannot answer twice: it closes the connection
    }
    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>${escHtml(msg).replace(/\n/g, '<br>').replace(/\x20{2}/g, ' &nbsp;')}</pre>\n</body>\n</html>\n`;
    res.statusCode = status;
    ['Content-Encoding', 'Content-Language', 'Content-Range'].forEach((h) => res.removeHeader(h));
    res.set('Content-Security-Policy', "default-src 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Content-Length', bytes(html));
    res.end(ctx.method === 'HEAD' ? '' : html);
  }
  /* The encodeurl package: encode what a URL cannot contain, keep valid %XX escapes. */
  const encodeUrl = (s) => String(s).replace(/(?:[^!#-;=?-_a-z|~]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g, encodeURI);
  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- Explanations ---------------------------------------------------------------------- */

  function explainStep(s, version) {
    const l = s.layer;
    const where = `\`${label(l, s.inRouter)}\``;
    if (s.status === 'skip') {
      switch (s.reason) {
        case 'path':
          if (l.kind === 'route') return `${where} does not match the path \`${s.path}\`${s.inRouter ? ' (inside the router)' : ''}: skipped.`;
          return `${where} runs only for paths that start with \`${l.mount}\`; this one is \`${s.path}\`: skipped.`;
        case 'method': return `The path matches ${where}, but this route answers ${l.method} only and the request is ${s.method}: skipped, Express keeps looking.`;
        case 'error-route': return `An error is pending, so Express skips the route ${where} and looks for an error handler.`;
        case 'error-router': return `An error is pending, so Express does not enter the router ${where}.`;
        case 'error-mw': return `An error is pending: ${where} has ${s.arity} parameter${s.arity === 1 ? '' : 's'}, not 4, so it is not an error handler and Express skips it.`;
        case 'no-error': return `No error has happened, so Express skips the error handler ${where}.`;
        case 'decode': return `${s.detail}: Express turns this into an error with status 400.`;
        default: return `${where}: skipped.`;
      }
    }
    if (s.enter) {
      const left = s.actions.find((a) => a.type === 'leave' || a.type === 'leave-err');
      return `The path starts with \`${l.mount}\`, so Express enters the router: inside it, \`req.baseUrl\` is \`${s.baseUrl}\` and the path is what follows.${left ? ` No route inside answered, so the request ${left.type === 'leave-err' ? 'leaves the router with the error' : 'leaves the router and continues'}.` : ''}`;
    }
    const parts = [];
    if (s.error && l.fn === 'errorHandler') parts.push(`The error handler ${where} receives the error.`);
    else if (s.arity === 3 && l.fn === 'errorHandler') parts.push(`${where} has 3 parameters, so Express calls it as ordinary middleware: \`err\` is really \`req\`, \`req\` is \`res\` and \`res\` is \`next\`.`);
    else parts.push(`${where} runs.`);
    (s.logs || []).forEach((line) => parts.push(`It prints \`${line}\` in the server console.`));
    s.notes.forEach((n) => parts.push(n));
    s.actions.forEach((a) => {
      if (a.type === 'next') parts.push('It calls `next()`: the request moves on to the next layer.');
      else if (a.type === 'next-err') parts.push(`It calls \`next(err)\` with \`${errText(a.err)}\`: from now on Express skips everything except error handlers (4 parameters).`);
      else if (a.type === 'respond') parts.push(`It sends the response: **${`${a.status} ${REASON[a.status] || ''}`.trim()}**.`);
      else if (a.type === 'throw' && a.err && a.err.code === 'ERR_HTTP_HEADERS_SENT') parts.push('Then it tries to send a second response: Node throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. Express catches it and treats it as `next(err)`.');
      else if (a.type === 'throw') parts.push(`It throws \`${errText(a.err)}\`. Express catches errors thrown synchronously and treats them as \`next(err)\`.`);
      else if (a.type === 'reject' && a.handled) parts.push(`Its promise is rejected (\`${errText(a.err)}\`). Express 5 notices and calls \`next(err)\` for you.`);
      else if (a.type === 'reject') parts.push(`Its promise is rejected (\`${errText(a.err)}\`) and nothing catches it. Express ${version} ignores the promise a handler returns, so no error handler runs.`);
    });
    if (s.hang) parts.push('It neither sends a response nor calls `next()`: nothing else will ever run.');
    return parts.join(' ');
  }

  function explainFinal(r, ctx) {
    const f = r.final;
    if (f.kind === 'crash') return 'The unhandled rejection crashes the Node.js process: no response is sent and every other connected client is cut off too (curl prints `Empty reply from server`). The server stays down: `node --watch` prints "Failed running" and waits for you to save a file before it starts again, and anything kept in memory, like the tasks array, starts again from scratch.';
    if (f.kind === 'hang') return 'No response is ever sent. The request stays open until the client gives up: curl waits indefinitely, a browser shows an endless spinner, and Jest or supertest fail with a timeout.';
    const res = r.response;
    const by = res.by === 'express';
    let text;
    if (by && ctx.finalHandler && ctx.finalHandler.err) text = `No error handler answered, so Express's built-in final handler sends **${res.status}** as an HTML page with the error and its stack trace (with \`NODE_ENV=production\` only the reason phrase). An API should answer JSON from its own error handler instead.`;
    else if (by) text = `No layer sent a response, so Express's built-in final handler answers **404** with the HTML text \`${(/<pre>(.*)<\/pre>/.exec(res.body) || [])[1] || 'Cannot …'}\`. An API usually adds its own JSON 404 catch-all after the routes.`;
    else {
      const step = ctx.steps.find((s) => s.id === res.by);
      text = `The response comes from ${step ? `\`${label(step.layer, step.inRouter)}\`` : 'a layer'}: **${res.status} ${res.reason}**. Later layers do not run.`;
    }
    if (r.headersSentError) text += ' The client got the first response; the second attempt only produced an error on the server.';
    if (f.closed) text += ' Express\'s final handler then found the response already sent and closed the connection.';
    return text;
  }

  /* ---- Challenges ------------------------------------------------------------------------ */

  const resOf = (run) => (run.final && run.final.kind === 'response' ? run.response : null);
  const statusOf = (run) => { const r = resOf(run); return r ? r.status : 0; };
  const headerOf = (run, name) => { const r = resOf(run); const h = r && r.headers.find(([k]) => k.toLowerCase() === name.toLowerCase()); return h ? h[1] : ''; };
  const isJson = (run) => /application\/json/.test(headerOf(run, 'Content-Type'));
  const pathIs = (st, p) => parseUrl(st.request.path).pathname.replace(/\/$/, '').toLowerCase() === p;
  const layerOn = (st, id) => st.layers.some((l) => l.id === id && l.on !== false);

  const MW_CHALLENGES = [
    { id: 'mw-create', title: 'Create a task', preset: 'bug-json', request: R('POST', '/tasks', { body: '{"title":"Buy milk"}' }),
      goal: 'Make `POST /tasks` with the body `{"title":"Buy milk"}` answer **201 Created**.',
      hint: 'Two things are missing: the layer that reads JSON bodies, and the request header that tells it the body is JSON.',
      check: (run, st) => st.request.method === 'POST' && pathIs(st, '/tasks') && statusOf(run) === 201 },
    { id: 'mw-guard', title: 'Lock the door', preset: 'bug-auth', request: R('GET', '/api/me'),
      goal: 'Without a token, `GET /api/me` must answer **401**. Right now it answers 200 to anyone.',
      hint: 'Middleware only guards the layers registered after it. Move `requireAuth` up.',
      check: (run, st) => !String(st.request.auth || '').trim() && pathIs(st, '/api/me') && statusOf(run) === 401 && layerOn(st, 'auth') },
    { id: 'mw-token', title: 'Show your badge', preset: 'api', request: R('GET', '/api/me'),
      goal: 'Make `GET /api/me` answer **200** with Ana\'s user in the body.',
      hint: 'Read the code of `requireAuth`: which `Authorization` header does it accept?',
      check: (run, st) => pathIs(st, '/api/me') && statusOf(run) === 200 && /"name":"Ana"/.test((resOf(run) || {}).body || '') },
    { id: 'mw-hang', title: 'Unstick the request', preset: 'bug-next', request: R('GET', '/health'),
      goal: '`GET /health` hangs. Make it answer **200** while the logger still prints its line.',
      hint: 'Switching the logger off is not a fix: change its code so it passes the request on.',
      check: (run, st) => pathIs(st, '/health') && statusOf(run) === 200 && layerOn(st, 'logger') && run.console.some((l) => /^GET \/health/i.test(l.text)) },
    { id: 'mw-errjson', title: 'Errors as JSON', preset: 'bug-err3', request: R('GET', '/boom'),
      goal: '`GET /boom` returns Express\'s HTML error page. Make it answer **500** with a **JSON** body from your error handler.',
      hint: 'How does Express recognise an error handler?',
      check: (run, st) => pathIs(st, '/boom') && statusOf(run) === 500 && isJson(run) },
    { id: 'mw-order', title: 'Routes before the catch-all', preset: 'bug-404', request: R('GET', '/health'),
      goal: 'Every request answers 404. Make `GET /health` answer **200** and keep the JSON 404 for unknown paths such as `/nope`.',
      hint: 'A catch-all must come after every route it should not hide (and before the error handler).',
      check: (run, st, sim) => pathIs(st, '/health') && st.request.method === 'GET' && statusOf(run) === 200 && layerOn(st, 'notFound')
        && (() => { const r = sim(R('GET', '/nope')); return statusOf(r) === 404 && isJson(r); })() },
    { id: 'mw-async', title: 'Catch the async error', preset: 'bug-async', request: R('GET', '/stats'),
      goal: '`GET /stats` crashes the whole server. Make it answer **500** with a JSON error instead.',
      hint: 'Two fixes work: catch the error yourself and pass it to `next(err)`, or use the Express version that forwards rejected promises.',
      check: (run, st) => pathIs(st, '/stats') && statusOf(run) === 500 && isJson(run) },
    { id: 'mw-double', title: 'One response only', preset: 'bug-double', request: R('POST', '/tasks', { contentType: JSON_CT, body: '{}' }),
      goal: 'A body without `title` must answer **400**, without the `Cannot set headers after they are sent` error in the server console.',
      hint: 'After sending the 400, the function must stop.',
      check: (run, st) => st.request.method === 'POST' && pathIs(st, '/tasks') && statusOf(run) === 400 && !run.headersSentError },
    { id: 'mw-badjson', title: 'Broken JSON', preset: 'lab', request: R('POST', '/tasks', { contentType: JSON_CT, body: '{"title":"Buy milk"}' }),
      goal: 'Send a `POST /tasks` whose body is **not valid JSON** and get a **400** JSON answer. Which layer raised the error?',
      hint: 'Break the body: remove a quote or a brace. Keep the `Content-Type: application/json` header.',
      check: (run, st) => st.request.method === 'POST' && statusOf(run) === 400 && isJson(run)
        && run.steps.some((s) => s.id === 'json' && s.actions.some((a) => a.type === 'next-err')) },
  ];

  /* ---- Route matcher presets and challenges ---------------------------------------------- */

  const RT_PRESETS = [
    { id: 'order', title: 'Order: /tasks/:id before /tasks/stats', method: 'GET', url: '/tasks/stats',
      routes: [{ method: 'GET', mount: '', path: '/tasks' }, { method: 'GET', mount: '', path: '/tasks/:id' }, { method: 'GET', mount: '', path: '/tasks/stats' }],
      note: 'Express tries routes in the order they were registered and the first match answers. `:id` matches any one segment, including `stats`.' },
    { id: 'mount', title: 'A router mounted at /api/tasks', method: 'GET', url: '/api/tasks/7?fields=title',
      routes: [{ method: 'GET', mount: '/api/tasks', path: '/' }, { method: 'POST', mount: '/api/tasks', path: '/' }, { method: 'GET', mount: '/api/tasks', path: '/:id' }, { method: 'GET', mount: '', path: '/health' }],
      note: '`app.use(\'/api/tasks\', router)` strips the prefix: inside the router `/api/tasks/7` is just `/7`, and `req.baseUrl` keeps `/api/tasks`.' },
    { id: 'params', title: 'Two params and a query string', method: 'GET', url: '/users/7/tasks/42?done=true&tag=css&tag=html',
      routes: [{ method: 'GET', mount: '', path: '/users/:userId' }, { method: 'GET', mount: '', path: '/users/:userId/tasks/:taskId' }],
      note: 'Each `:name` captures one segment into `req.params`. The query string is never part of the match; it lands in `req.query`, always as strings (repeated keys become arrays).' },
    { id: 'special', title: 'Optional params and * (Express 4 syntax)', method: 'GET', url: '/files/docs/report.pdf',
      routes: [{ method: 'GET', mount: '', path: '/posts/:year/:month?' }, { method: 'GET', mount: '', path: '/files/*' }, { method: 'ALL', mount: '', path: '*' }],
      note: 'Express 4 only: `:month?` is optional and `*` matches anything (it lands in `req.params[0]`). Express 5 writes these as `{/:month}` and `/*splat`.' },
  ];

  const RT_CHALLENGES = [
    { id: 'rt-stats', title: 'Reach the stats route', preset: 'order',
      goal: 'Make `GET /tasks/stats` answer from the `/tasks/stats` route, without deleting any route.',
      hint: 'Express does not look for the most specific route. It takes the first one that matches.',
      check: (m, st) => /^\/tasks\/stats$/i.test(st.url.split('?')[0]) && m.winner !== -1 && st.routes[m.winner].path === '/tasks/stats' && !st.routes[m.winner].mount
        && st.routes.some((r) => r.path === '/tasks/:id') && st.routes.some((r) => r.path === '/tasks') },
    { id: 'rt-url', title: 'Build the URL', preset: 'params', urlStart: '/users',
      goal: 'Write a request URL so that `req.params` is `{ userId: "7", taskId: "42" }` and `req.query.done` is `"true"`.',
      hint: 'Path segments fill the params; options go after `?` as key=value pairs.',
      check: (m) => !!m.req && m.req.params.userId === '7' && m.req.params.taskId === '42' && m.req.query.done === 'true' },
    { id: 'rt-delete', title: 'Add a DELETE route', preset: 'mount', method: 'DELETE', urlStart: '/api/tasks/9',
      goal: 'Edit or add a route so that `DELETE /api/tasks/9` matches with `req.params.id` equal to `"9"`.',
      hint: 'Inside a router mounted at `/api/tasks`, the path of a task is `/:id`.',
      check: (m, st) => st.method === 'DELETE' && /^\/api\/tasks\/9\/?$/i.test(st.url.split('?')[0]) && m.winner !== -1 && st.routes[m.winner].method === 'DELETE' && !!m.req && m.req.params.id === '9' },
  ];

  return {
    METHODS, REASON, TOKEN, BEHAVIORS, PRESETS, MW_CHALLENGES, RT_PRESETS, RT_CHALLENGES,
    checkPattern, compile, matchPath, parseQuery, parseUrl, matchRoutes,
    presetById, presetLayers, simulate, regLine, codeOf, errText,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ExpressEngine;
