'use strict';

/* ==========================================================================
   Client-side routing engine (pure, no DOM; also runs in Node:
   site/test/routing-engine.test.mjs). Drives the router-sim tool.

   RoutingEngine.parseRoutes(text) → { routes, errors, warnings }
     Reads a React Router configuration written as JSX (<Routes> with nested
     <Route path index element caseSensitive>). element={<X />} may be a page,
     a guard (<RequireAuth><X /></RequireAuth>, or <RequireAuth /> to guard
     the child routes) or a redirect (<Navigate to="/x" replace />).
     errors / warnings: [{ line, message }].
   RoutingEngine.matchRoutes(routes, pathname) → { matches, ranked, winner }
     A port of React Router's matcher (v6.4+ and v7 behave the same):
     flattenRoutes → one branch per route with a path or index; computeScore
     (static segment 10, dynamic :param 3, empty 1, index +2, splat * −2, plus
     one per segment); branches sorted by score, ties between siblings broken
     by their order; the first branch whose every level matches wins.
     matches = [{ route, params, pathname, pathnameBase }], root first.
   RoutingEngine.renderLocation(routes, location, { loggedIn, guardReplace })
     → { match, tree, redirect, notFound }: what renders, level by level
     (each layout's <Outlet /> holds the next level) and the redirect, if a
     guard or a <Navigate> asks for one.
   A simulated browser: createSim(routes, options), then load(sim, url) (a
   full page load: address bar or refresh), link(sim, url) (a <Link> click:
   history push), back / forward, reload, setLoggedIn, submitLogin. Each call
   mutates sim and refills sim.log with what happened ({ kind, text }).
     options: guardReplace (the guard's <Navigate replace>), loginReplace
     (navigate(from, { replace: true }) after log-in), fallback (the server
     answers every path with index.html), persist (the token survives a
     reload, as with localStorage), loggedIn.
   RoutingEngine.CHALLENGES  [{ id, title, kind: 'predict' | 'edit', … }]
     predict: { config, url, choices, answer, why }; edit: { config, url, opt,
     goal, hint, check(routes, opt) → [{ status: 'ok' | 'bad' | 'note', text }] }.
   RoutingEngine.PRESETS     [{ id, title, note, config, url, opt }]
   ========================================================================== */

const RoutingEngine = (() => {
  const GUARDS = ['RequireAuth', 'Protected', 'ProtectedRoute', 'PrivateRoute'];
  const LOGIN_PAGES = ['Login', 'LoginPage'];
  const MAX_REDIRECTS = 10;

  /* ======================================================================
     1. Reading the configuration (a small JSX reader for <Routes>/<Route>)
     ====================================================================== */

  class ParseError extends Error {
    constructor(message, at) { super(message); this.at = at; }
  }

  function readTags(src) {
    let i = 0;
    const fail = (msg, at = i) => { throw new ParseError(msg, at); };
    const near = () => JSON.stringify(src.slice(i, i + 14).split('\n')[0]);

    function skip() {
      for (;;) {
        const rest = src.slice(i);
        const m = /^\s+/.exec(rest) || /^\{\s*\/\*[\s\S]*?\*\/\s*\}/.exec(rest) || /^\/\*[\s\S]*?\*\//.exec(rest) || /^\/\/[^\n]*/.exec(rest);
        if (!m) return;
        i += m[0].length;
      }
    }
    const spaces = () => { const m = /^\s*/.exec(src.slice(i)); i += m[0].length; };

    function braces() {
      const open = i;
      i++;
      spaces();
      if (src[i] === '<') {
        const el = tag();
        spaces();
        if (src[i] !== '}') fail('Expected "}" after the element');
        i++;
        return { el };
      }
      let depth = 1;
      let j = i;
      while (j < src.length && depth) {
        const c = src[j];
        if (c === '"' || c === "'" || c === '`') {
          const e = src.indexOf(c, j + 1);
          j = e < 0 ? src.length : e + 1;
          continue;
        }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        j++;
      }
      if (depth) fail('A "{" is never closed', open);
      const raw = src.slice(i, j - 1).trim();
      i = j;
      return { raw };
    }

    function tag() {
      const start = i;
      if (src[i] !== '<') fail(`Expected a tag such as <Route …>, found ${near()}`);
      i++;
      const nm = /^[A-Za-z][\w.]*/.exec(src.slice(i));
      if (!nm) fail('Expected a tag name after "<"');
      const name = nm[0];
      i += name.length;
      const attrs = {};
      for (;;) {
        skip();
        if (i >= src.length) fail(`<${name}> is never closed: end it with "/>" or ">"`, start);
        if (src.startsWith('/>', i)) { i += 2; return { name, attrs, children: [], at: start }; }
        if (src[i] === '>') { i++; break; }
        const an = /^[A-Za-z_][\w-]*/.exec(src.slice(i));
        if (!an) fail(`Unexpected ${near()} inside <${name}>`);
        i += an[0].length;
        spaces();
        let value = { flag: true };
        if (src[i] === '=') {
          i++;
          spaces();
          if (src[i] === '"' || src[i] === "'") {
            const q = src[i];
            const e = src.indexOf(q, i + 1);
            if (e < 0) fail('A string is never closed');
            value = { str: src.slice(i + 1, e) };
            i = e + 1;
          } else if (src[i] === '{') value = braces();
          else fail(`The value of ${an[0]} must be in quotes or braces`);
        }
        attrs[an[0]] = { ...value, at: start };
      }
      const children = [];
      for (;;) {
        skip();
        if (i >= src.length) fail(`<${name}> is opened here but never closed with </${name}>`, start);
        if (src.startsWith('</', i)) {
          const m = /^<\/\s*([A-Za-z][\w.]*)?\s*>/.exec(src.slice(i));
          if (!m) fail('Broken closing tag');
          if ((m[1] || '') !== name) fail(`Expected </${name}> (opened on line ${lineOf(src, start)}), found </${m[1] || ''}>`);
          i += m[0].length;
          return { name, attrs, children, at: start };
        }
        if (src[i] === '<') { children.push(tag()); continue; }
        fail(`Unexpected text ${near()} inside <${name}>: only tags can go here`);
      }
    }

    const top = [];
    skip();
    while (i < src.length) {
      top.push(tag());
      skip();
    }
    return top;
  }

  const lineOf = (src, at) => src.slice(0, at).split('\n').length;

  /* A JSX element given as an attribute value or a child → { name, attrs, children }. */
  function toEl(t) {
    const attrs = {};
    Object.entries(t.attrs).forEach(([k, v]) => {
      if (v.flag) attrs[k] = true;
      else if (v.str !== undefined) attrs[k] = v.str;
      else if (v.raw !== undefined) {
        const lit = /^(["'`])(.*)\1$/.exec(v.raw);
        attrs[k] = v.raw === 'true' ? true : v.raw === 'false' ? false : lit ? lit[2] : { raw: v.raw };
      } else if (v.el) attrs[k] = { el: toEl(v.el) };
    });
    return { name: t.name, attrs, children: t.children.map(toEl) };
  }

  const KNOWN_DATA_PROPS = ['loader', 'action', 'errorElement', 'ErrorBoundary', 'lazy', 'id', 'key', 'handle', 'shouldRevalidate', 'hydrateFallbackElement'];

  function parseRoutes(text) {
    const src = String(text || '');
    const errors = [];
    const warnings = [];
    let top;
    try {
      top = readTags(src);
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      return { routes: [], errors: [{ line: lineOf(src, e.at), message: e.message }], warnings };
    }
    if (top.length === 1 && top[0].name === 'Routes') top = top[0].children;
    else if (top.some((t) => t.name === 'Routes')) {
      errors.push({ line: 1, message: 'Write one <Routes> around all the <Route> elements (or none at all).' });
      return { routes: [], errors, warnings };
    }
    let seq = 0;

    function convert(list, parentPath) {
      const out = [];
      list.forEach((t) => {
        const line = lineOf(src, t.at);
        if (t.name === 'React.Fragment' || t.name === 'Fragment') { out.push(...convert(t.children, parentPath)); return; }
        if (t.name !== 'Route') {
          errors.push({ line, message: `[${t.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>.` });
          return;
        }
        const r = { id: ++seq, line, path: undefined, index: false, caseSensitive: false, element: null, children: [] };
        Object.entries(t.attrs).forEach(([k, v]) => {
          const raw = v.raw !== undefined ? v.raw : null;
          const lit = raw !== null ? /^(["'`])(.*)\1$/.exec(raw) : null;
          if (k === 'path') {
            if (v.str !== undefined) r.path = v.str;
            else if (lit) r.path = lit[2];
            else errors.push({ line, message: 'path takes a string: path="tasks/:id".' });
          } else if (k === 'index' || k === 'caseSensitive') {
            const val = v.flag ? true : raw === 'true' ? true : raw === 'false' ? false : null;
            if (val === null) errors.push({ line, message: `${k} takes true or false (or no value, which means true).` });
            else r[k] = val;
          } else if (k === 'element') {
            if (v.el) r.element = toEl(v.el);
            else if (raw === 'null') r.element = null;
            else errors.push({ line, message: 'element takes a JSX element in braces: element={<TaskList />}.' });
          } else if (k === 'Component') {
            if (raw && /^[A-Z][\w.]*$/.test(raw)) r.element = { name: raw, attrs: {}, children: [] };
            else errors.push({ line, message: 'Component takes the component itself: Component={TaskList}.' });
          } else if (k === 'exact') {
            warnings.push({ line, message: '`exact` is from React Router 5 and does nothing now: every path matches exactly unless it ends in `/*`.' });
          } else if (k === 'component' || k === 'render') {
            warnings.push({ line, message: `\`${k}\` is from React Router 5 and is ignored: this route renders nothing. Write \`element={<Page />}\`.` });
          } else if (KNOWN_DATA_PROPS.includes(k)) {
            warnings.push({ line, message: `\`${k}\` is real, but this simulator ignores it.` });
          } else {
            warnings.push({ line, message: `Unknown prop \`${k}\` on <Route>: ignored.` });
          }
        });
        if (r.path !== undefined) {
          const problem = checkPath(r.path);
          if (problem) errors.push({ line, message: problem });
        }
        let full = parentPath;
        if (r.path !== undefined && r.path.startsWith('/') && !r.path.startsWith(parentPath)) {
          errors.push({ line, message: `Absolute route path "${r.path}" nested under path "${parentPath}" is not valid. An absolute child route path must start with the combined path of all its parent routes.` });
        } else if (r.path !== undefined) {
          full = joinPaths([parentPath, r.path.startsWith('/') ? r.path.slice(parentPath.length) : r.path]);
        }
        r.children = convert(t.children, full);
        if (r.index && r.children.length) errors.push({ line, message: 'An index route cannot have child routes.' });
        if (r.index && r.path !== undefined) warnings.push({ line, message: 'An index route normally has no path: it renders at its parent\'s URL.' });
        if (!r.index && r.path === undefined && !r.children.length) warnings.push({ line, message: 'A route with no path and no children never matches.' });
        if (!r.element && !r.children.length && r.path !== undefined) warnings.push({ line, message: `The route "${r.path}" has no element: it matches but renders nothing.` });
        if (r.element && r.element.name === 'Navigate' && typeof r.element.attrs.to !== 'string') errors.push({ line, message: '<Navigate> needs to="/somewhere".' });
        out.push(r);
      });
      return out;
    }
    const routes = convert(top, '');
    return { routes, errors, warnings };
  }

  /* null, or why the pattern is not valid. */
  function checkPath(p) {
    const segs = p.split('/');
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      if (s.includes('*') && (s !== '*' || k !== segs.length - 1)) return `In "${p}", \`*\` must be the whole last segment: \`*\` or \`files/*\`.`;
      if (s.startsWith(':') && !/^:[\w-]+\??$/.test(s)) return `In "${p}", "${s}" is not a valid parameter: a colon and a name, such as \`:id\`.`;
      if (!s.startsWith(':') && s.includes(':')) return `In "${p}", a parameter must start its segment: \`tasks/:id\`, not \`tasks:id\`.`;
      if (s.slice(0, -1).includes('?')) return `In "${p}", \`?\` may only end a segment (an optional segment); a query string never goes in a route path.`;
    }
    return null;
  }

  /* ======================================================================
     2. Matching and ranking (ported from React Router's matchRoutes)
     ====================================================================== */

  const joinPaths = (paths) => paths.join('/').replace(/\/\/+/g, '/');
  const PARAM_RE = /^:[\w-]+$/;
  const DYNAMIC = 3;
  const INDEX = 2;
  const EMPTY = 1;
  const STATIC = 10;
  const SPLAT = -2;
  const isSplat = (s) => s === '*';

  function computeScore(path, index) {
    const segments = path.split('/');
    let initial = segments.length;
    if (segments.some(isSplat)) initial += SPLAT;
    if (index) initial += INDEX;
    return segments.filter((s) => !isSplat(s)).reduce((score, s) => score + (PARAM_RE.test(s) ? DYNAMIC : s === '' ? EMPTY : STATIC), initial);
  }

  /* "/tasks/:id" → "3 segments + 1 + 10 + 3 = 17": how computeScore got its number. */
  function explainScore(path, index) {
    const segments = path.split('/');
    const parts = [`${segments.length} segment${segments.length === 1 ? '' : 's'}`];
    if (index) parts.push('2 (index)');
    if (segments.some(isSplat)) parts.push('−2 (*)');
    segments.filter((s) => !isSplat(s)).forEach((s) => parts.push(PARAM_RE.test(s) ? '3' : s === '' ? '1' : '10'));
    return `${parts.join(' + ').replace(/\+ −/g, '− ')} = ${computeScore(path, index)}`;
  }

  /* "tasks/:id?" → ["tasks/:id", "tasks"] (optional segments). */
  function explodeOptionalSegments(path) {
    const segments = path.split('/');
    if (segments.length === 0) return [];
    const [first, ...rest] = segments;
    const isOptional = first.endsWith('?');
    const required = first.replace(/\?$/, '');
    if (rest.length === 0) return isOptional ? [required, ''] : [required];
    const restExploded = explodeOptionalSegments(rest.join('/'));
    const result = [];
    result.push(...restExploded.map((sub) => (sub === '' ? required : [required, sub].join('/'))));
    if (isOptional) result.push(...restExploded);
    return result.map((exploded) => (path.startsWith('/') && exploded === '' ? '/' : exploded));
  }

  function flattenRoutes(routes, branches = [], parentsMeta = [], parentPath = '') {
    const flattenRoute = (route, index, relativePath) => {
      const meta = { relativePath: relativePath === undefined ? route.path || '' : relativePath, caseSensitive: route.caseSensitive === true, childrenIndex: index, route };
      if (meta.relativePath.startsWith('/')) {
        if (!meta.relativePath.startsWith(parentPath)) return;      // reported by parseRoutes
        meta.relativePath = meta.relativePath.slice(parentPath.length);
      }
      const path = joinPaths([parentPath, meta.relativePath]);
      const routesMeta = parentsMeta.concat(meta);
      if (route.children && route.children.length > 0 && route.index !== true) flattenRoutes(route.children, branches, routesMeta, path);
      // Routes without a path never match by themselves unless they are index routes.
      if (route.path == null && !route.index) return;
      branches.push({ path, score: computeScore(path, route.index), routesMeta });
    };
    routes.forEach((route, index) => {
      if (route.path === '' || !(route.path || '').includes('?')) flattenRoute(route, index);
      else explodeOptionalSegments(route.path).forEach((exploded) => flattenRoute(route, index, exploded));
    });
    return branches;
  }

  function compareIndexes(a, b) {
    const siblings = a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i]);
    return siblings ? a[a.length - 1] - b[b.length - 1] : 0;
  }

  function rankRouteBranches(branches) {
    return branches
      .map((b, order) => ({ ...b, order }))
      .sort((a, b) => (a.score !== b.score ? b.score - a.score
        : compareIndexes(a.routesMeta.map((m) => m.childrenIndex), b.routesMeta.map((m) => m.childrenIndex)) || a.order - b.order));
  }

  function compilePath(path, caseSensitive = false, end = true) {
    const params = [];
    let source = `^${path
      .replace(/\/*\*?$/, '')
      .replace(/^\/*/, '/')
      .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
      .replace(/\/:([\w-]+)(\?)?/g, (_, paramName, isOptional) => {
        params.push({ paramName, isOptional: isOptional != null });
        return isOptional ? '/?([^\\/]+)?' : '/([^\\/]+)';
      })}`;
    if (path.endsWith('*')) {
      params.push({ paramName: '*' });
      source += path === '*' || path === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$';
    } else if (end) {
      source += '\\/*$';
    } else if (path !== '' && path !== '/') {
      source += '(?:(?=\\/|$))';
    }
    return [new RegExp(source, caseSensitive ? undefined : 'i'), params];
  }

  function matchPath(pattern, pathname) {
    const [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end);
    const match = pathname.match(matcher);
    if (!match) return null;
    const matchedPathname = match[0];
    let pathnameBase = matchedPathname.replace(/(.)\/+$/, '$1');
    const groups = match.slice(1);
    const params = compiledParams.reduce((memo, { paramName, isOptional }, k) => {
      if (paramName === '*') {
        const splat = groups[k] || '';
        pathnameBase = matchedPathname.slice(0, matchedPathname.length - splat.length).replace(/(.)\/+$/, '$1');
      }
      const value = groups[k];
      memo[paramName] = isOptional && !value ? undefined : (value || '').replace(/%2F/g, '/');
      return memo;
    }, {});
    return { params, pathname: matchedPathname, pathnameBase };
  }

  function matchRouteBranch(branch, pathname) {
    const params = {};
    let matchedPathname = '/';
    const matches = [];
    for (let k = 0; k < branch.routesMeta.length; k++) {
      const meta = branch.routesMeta[k];
      const end = k === branch.routesMeta.length - 1;
      const remaining = matchedPathname === '/' ? pathname : pathname.slice(matchedPathname.length) || '/';
      const m = matchPath({ path: meta.relativePath, caseSensitive: meta.caseSensitive, end }, remaining);
      if (!m) return null;
      Object.assign(params, m.params);
      matches.push({ route: meta.route, params, pathname: joinPaths([matchedPathname, m.pathname]), pathnameBase: normalize(joinPaths([matchedPathname, m.pathnameBase])) });
      if (m.pathnameBase !== '/') matchedPathname = joinPaths([matchedPathname, m.pathnameBase]);
    }
    return matches;
  }

  const normalize = (p) => p.replace(/\/+$/, '').replace(/^\/*/, '/');

  function decodePath(p) {
    return p.split('/').map((v) => {
      try { return decodeURIComponent(v).replace(/\//g, '%2F'); } catch (e) { return v; }
    }).join('/');
  }

  /* → { matches | null, ranked: [{ path, score, route, status: 'match' | 'no' | 'skipped' }], winner } */
  function matchRoutes(routes, pathname) {
    const ranked = rankRouteBranches(flattenRoutes(routes));
    const decoded = decodePath(pathname || '/');
    let matches = null;
    let winner = -1;
    const rows = ranked.map((b, k) => {
      const route = b.routesMeta[b.routesMeta.length - 1].route;
      const row = { path: b.path, score: b.score, why: explainScore(b.path, route.index), route, depth: b.routesMeta.length, status: 'skipped' };
      if (matches) return row;
      const m = matchRouteBranch(b, decoded);
      if (m) { matches = m; winner = k; row.status = 'match'; } else row.status = 'no';
      return row;
    });
    return { matches, ranked: rows, winner };
  }

  /* ======================================================================
     3. Rendering a location: layouts, outlets, guards, redirects
     ====================================================================== */

  function parseUrl(input) {
    let s = String(input == null ? '/' : input).trim();
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '');
    if (!s.startsWith('/')) s = `/${s}`;
    let hash = '';
    let search = '';
    const h = s.indexOf('#');
    if (h >= 0) { hash = s.slice(h); s = s.slice(0, h); }
    const q = s.indexOf('?');
    if (q >= 0) { search = s.slice(q); s = s.slice(0, q); }
    return { pathname: s || '/', search: search === '?' ? '' : search, hash: hash === '#' ? '' : hash };
  }
  const href = (loc) => `${loc.pathname}${loc.search}${loc.hash}`;

  /* What useSearchParams() would hold: [[key, value]], with + as a space. */
  function searchEntries(search) {
    return String(search || '').replace(/^\?/, '').split('&').filter(Boolean).map((pair) => {
      const k = pair.indexOf('=');
      const dec = (x) => { try { return decodeURIComponent(x.replace(/\+/g, ' ')); } catch (e) { return x; } };
      return k < 0 ? [dec(pair), ''] : [dec(pair.slice(0, k)), dec(pair.slice(k + 1))];
    });
  }

  /* to relative to a route's matched path ("edit", "..", "../3"); absolute stays as is. */
  function resolveTo(to, base) {
    const t = parseUrl(to.startsWith('/') ? to : '/x');
    if (to.startsWith('/')) return href(t);
    const segs = base.split('/').filter(Boolean);
    const [path, rest = ''] = to.split(/(?=[?#])/);
    path.split('/').forEach((s) => {
      if (s === '..') segs.pop();
      else if (s && s !== '.') segs.push(s);
    });
    return `/${segs.join('/')}${rest}`;
  }

  function renderLocation(routes, loc, opt = {}) {
    const match = matchRoutes(routes, loc.pathname);
    const out = { match, tree: [], redirect: null, notFound: !match.matches, params: match.matches ? match.matches[match.matches.length - 1].params : {} };
    if (!match.matches) return out;
    for (const mt of match.matches) {
      const el = mt.route.element;
      const node = { route: mt.route, pathname: mt.pathname, name: null, guard: null };
      out.tree.push(node);
      if (!el) continue;                                     // no element: the route renders its <Outlet />
      if (GUARDS.includes(el.name)) {
        node.guard = el.name;
        if (!opt.loggedIn) {
          node.name = el.name;
          node.blocked = true;
          out.redirect = { to: '/login', replace: !!opt.guardReplace, state: { from: href(loc) }, by: 'guard', guard: el.name };
          break;
        }
        const inner = el.children[0];
        if (!inner) { node.name = el.name; node.outlet = true; continue; }
        if (inner.name === 'Navigate') { node.name = 'Navigate'; out.redirect = navigateTo(inner, mt); break; }
        node.name = inner.name;
        continue;
      }
      node.name = el.name;
      if (el.name === 'Navigate') { out.redirect = navigateTo(el, mt); break; }
    }
    const last = out.tree[out.tree.length - 1];
    if (!out.redirect && last && last.route.children.length) last.emptyOutlet = true;
    return out;
  }

  const navigateTo = (el, mt) => ({ to: resolveTo(String(el.attrs.to || '/'), mt.pathnameBase), replace: el.attrs.replace === true, state: null, by: 'navigate' });

  /* The components that render, outermost first (guards that only wrap a page are left out). */
  const chainOf = (view) => (view && view.tree ? view.tree.filter((n) => n.name).map((n) => n.name) : []);

  /* ======================================================================
     4. A simulated browser tab running the app
     ====================================================================== */

  const DEFAULT_OPT = { guardReplace: true, loginReplace: true, fallback: true, persist: true, loggedIn: false };

  function createSim(routes, options = {}) {
    const opt = { ...DEFAULT_OPT, ...options };
    return { routes, opt, entries: [], index: -1, loggedIn: !!opt.loggedIn, doc: 0, view: null, app: false, log: [] };
  }

  const current = (s) => s.entries[s.index] || null;
  const say = (s, kind, text) => { s.log.push({ kind, text }); };

  function putEntry(s, url, state, replace, doc) {
    const prev = current(s);
    const entry = { ...parseUrl(url), state: state || null, doc: doc !== undefined ? doc : (prev ? prev.doc : s.doc) };
    if (replace && s.index >= 0) s.entries[s.index] = entry;
    else {
      s.entries = s.entries.slice(0, s.index + 1);
      s.entries.push(entry);
      s.index = s.entries.length - 1;
    }
  }

  /* The browser asks the server for the current URL and starts the app (or gets a 404 page). */
  function boot(s) {
    const loc = current(s);
    if (!s.opt.fallback && loc.pathname !== '/' && loc.pathname !== '/index.html') {
      s.app = false;
      s.view = { server404: true, pathname: loc.pathname };
      say(s, 'server', `The browser asks the server for \`GET ${loc.pathname}\`. There is no such file, and the server is not set to answer every path with \`index.html\`: it sends **404 Not Found**. The app never starts.`);
      return false;
    }
    s.app = true;
    say(s, 'server', `The browser asks the server for \`GET ${loc.pathname}\`; the server answers with \`index.html\`, and the app starts from scratch.`);
    if (s.loggedIn && !s.opt.persist) {
      s.loggedIn = false;
      say(s, 'state', 'Everything kept in memory is gone, including the logged-in user: you are logged out.');
    } else if (s.loggedIn) {
      say(s, 'state', 'Memory was wiped, but the token saved in `localStorage` is read back: you are still logged in.');
    }
    return true;
  }

  /* Renders the current entry and follows redirects (guards, <Navigate>) until the page is stable. */
  function settle(s) {
    for (let n = 0; ; n++) {
      const loc = current(s);
      const v = renderLocation(s.routes, loc, { loggedIn: s.loggedIn, guardReplace: s.opt.guardReplace });
      s.view = v;
      if (!v.redirect) {
        if (v.notFound) say(s, 'warn', `No route matches: the router renders nothing and logs \`No routes matched location "${href(loc)}"\`.`);
        return s;
      }
      if (n >= MAX_REDIRECTS) {
        s.view = { ...v, loop: true };
        say(s, 'error', 'Redirect loop: the page keeps redirecting (in a real app React stops it with "Maximum update depth exceeded" and a blank page). A guard probably protects the log-in page itself.');
        return s;
      }
      const r = v.redirect;
      const how = r.replace ? '**replace**: the current history entry is overwritten' : '**push**: a new history entry is added';
      if (r.by === 'guard') say(s, 'redirect', `\`${r.guard}\`: nobody is logged in, so it renders \`<Navigate to="/login"${r.replace ? ' replace' : ''} state={{ from }} />\` with from = \`${r.state.from}\` (${how}).`);
      else say(s, 'redirect', `A \`<Navigate to="${r.to}"${r.replace ? ' replace' : ''} />\` renders: go to \`${r.to}\` (${how}).`);
      putEntry(s, r.to, r.state, r.replace);
    }
  }

  function load(s, url) {
    s.log = [];
    s.doc++;
    putEntry(s, url, null, false, s.doc);
    say(s, 'nav', `Full page load of \`${href(current(s))}\` (typed in the address bar, a bookmark, or a plain \`<a href>\`).`);
    if (boot(s)) settle(s);
    return s;
  }

  function reload(s) {
    if (s.index < 0) return s;
    s.log = [];
    say(s, 'nav', `Refresh (F5) on \`${href(current(s))}\`: the whole page is requested again.`);
    if (boot(s)) settle(s);
    return s;
  }

  function link(s, url, opts = {}) {
    if (!s.app) return load(s, url);
    s.log = [];
    const replace = !!opts.replace;
    putEntry(s, url, opts.state || null, replace);
    say(s, 'nav', `${opts.label || '`<Link>` click'}: \`${href(current(s))}\` (${replace ? '**replace**' : '**push**'}, \`history.${replace ? 'replaceState' : 'pushState'}\`). No request to the server: the router renders the new route.`);
    settle(s);
    return s;
  }

  function go(s, delta) {
    const j = s.index + delta;
    if (j < 0 || j >= s.entries.length) return s;
    s.log = [];
    const from = current(s);
    const wasApp = s.app;
    s.index = j;
    const to = current(s);
    if (!wasApp || to.doc !== from.doc) {
      say(s, 'nav', `${delta < 0 ? 'Back' : 'Forward'} to \`${href(to)}\`, an entry of another page load: the browser loads it again.`);
      if (boot(s)) settle(s);
      return s;
    }
    say(s, 'nav', `${delta < 0 ? 'Back' : 'Forward'} to \`${href(to)}\`: the browser fires \`popstate\` and the router renders that URL.`);
    settle(s);
    return s;
  }

  /* The routes changed (the student edited them): render the current URL again. */
  function rerender(s, routes) {
    s.routes = routes;
    s.log = [];
    if (!s.app) return s;
    say(s, 'state', 'The routes changed: the router renders the current URL again.');
    settle(s);
    return s;
  }

  const back = (s) => go(s, -1);
  const forward = (s) => go(s, 1);

  function setLoggedIn(s, value) {
    s.log = [];
    s.loggedIn = !!value;
    say(s, 'state', value ? 'Logged in.' : 'Logged out: the token is forgotten and the auth state is now null.');
    if (s.app) settle(s);
    return s;
  }

  const isLoginPage = (s) => !!(s.app && s.view && !s.view.redirect && s.view.tree && s.view.tree.some((n) => LOGIN_PAGES.includes(n.name)));

  function submitLogin(s) {
    if (!isLoginPage(s)) return s;
    s.log = [];
    s.loggedIn = true;
    const loc = current(s);
    const from = (loc.state && loc.state.from) || '/';
    say(s, 'state', `The log-in form is submitted: the user is now logged in. The page reads \`location.state?.from\`: ${loc.state && loc.state.from ? `\`${from}\`` : 'none, so it uses `/`'}.`);
    const replace = !!s.opt.loginReplace;
    putEntry(s, from, null, replace);
    say(s, 'nav', `\`navigate(${JSON.stringify(from)}${replace ? ', { replace: true }' : ''})\` (${replace ? '**replace**: the log-in entry is overwritten' : '**push**: the log-in page stays in the history'}).`);
    settle(s);
    return s;
  }

  /* ======================================================================
     5. Labels and code shown by the tool
     ====================================================================== */

  function elLabel(el) {
    if (!el) return '';
    const attrs = Object.entries(el.attrs).map(([k, v]) => (v === true ? ` ${k}` : typeof v === 'string' ? ` ${k}="${v}"` : v && v.raw ? ` ${k}={${v.raw}}` : '')).join('');
    if (!el.children.length) return `<${el.name}${attrs} />`;
    return `<${el.name}${attrs}>${el.children.map(elLabel).join('')}</${el.name}>`;
  }

  function routeLabel(r) {
    const bits = [];
    if (r.index) bits.push('index');
    if (r.path !== undefined) bits.push(`path="${r.path}"`);
    if (!bits.length) bits.push('(no path)');
    return bits.join(' ');
  }

  /* The guard and log-in code the simulator runs, with the current options. */
  function appCode(opt) {
    const o = { ...DEFAULT_OPT, ...opt };
    return `function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login"${o.guardReplace ? ' replace' : ''} state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from ? from.pathname + from.search : '/';
  async function handleSubmit(e) {
    e.preventDefault();
    await login(email, password);
    navigate(target${o.loginReplace ? ', { replace: true }' : ''});
  }
  // … the form
}`;
  }

  /* ======================================================================
     6. Presets and challenges
     ====================================================================== */

  const APP = `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="tasks" element={<TasksLayout />}>
      <Route index element={<TaskList />} />
      <Route path="new" element={<RequireAuth><NewTask /></RequireAuth>} />
      <Route path=":id" element={<TaskDetail />} />
      <Route path=":id/edit" element={<RequireAuth><EditTask /></RequireAuth>} />
    </Route>
    <Route element={<RequireAuth />}>
      <Route path="settings" element={<Settings />} />
    </Route>
    <Route path="todo" element={<Navigate to="/tasks" replace />} />
    <Route path="login" element={<Login />} />
    <Route path="*" element={<NotFound />} />
  </Route>
</Routes>`;

  const PRESETS = [
    { id: 'app', title: 'A task app (layouts, params, guard, 404)', url: '/tasks/7',
      note: 'Try `/tasks`, `/tasks/new`, `/tasks/7/edit`, `/settings` (logged out, then log in), `/todo` (an old URL that redirects) and `/nope`. Watch the ranking table: `new` beats `:id` because a static segment scores more.',
      config: APP },
    { id: 'flat', title: 'No layout: every page alone', url: '/tasks/3',
      note: 'Without a parent route, each page renders on its own: the header and nav would have to be repeated in every page, and they would be re-created on every navigation.',
      config: `<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/tasks" element={<TaskList />} />
  <Route path="/tasks/:id" element={<TaskDetail />} />
  <Route path="/login" element={<Login />} />
</Routes>` },
    { id: 'loop', title: 'A redirect loop (the guard protects /login)', url: '/settings',
      note: 'The guard wraps every route, `/login` included. Logged out, `/login` redirects to `/login`, forever. Move the `login` route out of the guarded group to fix it.',
      config: `<Routes>
  <Route element={<RequireAuth />}>
    <Route path="/" element={<Home />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/login" element={<Login />} />
  </Route>
</Routes>` },
    { id: 'splat', title: 'Splats and optional segments', url: '/docs/guide/routing',
      note: '`docs/*` matches everything under `/docs`; the rest of the URL is in `params["*"]`. `:lang?` is optional: `/about` and `/en/about` both match.',
      config: `<Routes>
  <Route path="/" element={<Home />} />
  <Route path="docs/*" element={<Docs />} />
  <Route path=":lang?/about" element={<About />} />
  <Route path="*" element={<NotFound />} />
</Routes>` },
  ];

  const tasksPredict = `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route path="tasks" element={<TasksLayout />}>
      <Route index element={<TaskList />} />
      <Route path=":id" element={<TaskDetail />} />
      <Route path=":id/edit" element={<EditTask />} />
    </Route>
  </Route>
</Routes>`;

  const run = (routes, url, opt) => {
    const s = createSim(routes, opt);
    load(s, url);
    return s;
  };
  const show = (names) => (names.length ? `\`${names.join(' › ')}\`` : 'nothing');

  /* One check: url renders exactly `want` (component names, outermost first), with no redirect. */
  function expectChain(routes, url, want, opt) {
    const s = run(routes, url, opt);
    const got = chainOf(s.view);
    const final = current(s).pathname;
    if (s.view.loop) return { status: 'bad', text: `\`${url}\` redirects forever (a loop).` };
    if (final !== parseUrl(url).pathname) return { status: 'bad', text: `\`${url}\` redirects to \`${final}\`; it should render ${show(want)}.` };
    if (s.view.notFound) return { status: 'bad', text: `\`${url}\` matches no route, so nothing renders; it should render ${show(want)}.` };
    const ok = got.length === want.length && got.every((n, k) => n === want[k]);
    return ok ? { status: 'ok', text: `\`${url}\` renders ${show(want)}.` } : { status: 'bad', text: `\`${url}\` renders ${show(got)}; it should render ${show(want)}.` };
  }

  /* url ends on page `leaf` (the innermost component), with no redirect. */
  function expectPage(routes, url, leaf, opt) {
    const s = run(routes, url, opt);
    const got = chainOf(s.view);
    const final = current(s).pathname;
    if (s.view.loop) return { status: 'bad', text: `\`${url}\` redirects forever (a loop).` };
    if (final !== parseUrl(url).pathname) return { status: 'bad', text: `\`${url}\` redirects to \`${final}\`; it should show \`${leaf}\`.` };
    return got[got.length - 1] === leaf ? { status: 'ok', text: `\`${url}\` shows \`${leaf}\`${opt && opt.loggedIn ? ' when logged in' : ''}.` } : { status: 'bad', text: `\`${url}\` shows ${show(got)}; it should show \`${leaf}\`.` };
  }

  function expectRedirect(routes, url, to, opt) {
    const s = run(routes, url, opt);
    const final = current(s).pathname;
    if (s.view.loop) return { status: 'bad', text: `\`${url}\` redirects forever: is \`/login\` itself protected?` };
    return final === to ? { status: 'ok', text: `Logged out, \`${url}\` redirects to \`${to}\`.` } : { status: 'bad', text: `Logged out, \`${url}\` shows ${show(chainOf(s.view))} at \`${final}\`; it should redirect to \`${to}\`.` };
  }

  const CHALLENGES = [
    { id: 'rs-predict-edit', kind: 'predict', title: 'Which components render?',
      goal: 'With this configuration, which components render for **`/tasks/7/edit`**?',
      config: tasksPredict, url: '/tasks/7/edit',
      choices: ['AppLayout › TasksLayout › EditTask', 'AppLayout › TasksLayout › TaskDetail', 'EditTask alone, without the layouts', 'Nothing: no route matches'],
      answer: 0,
      why: 'The branch `/tasks/:id/edit` matches the whole URL. Every route on the way down renders too: `AppLayout` puts `TasksLayout` in its `<Outlet />`, which puts `EditTask` in its own. `:id` alone does not match, because the last route of a branch must match the **whole** rest of the URL (`7/edit` is two segments).' },
    { id: 'rs-predict-new', kind: 'predict', title: 'Ranking, not order',
      goal: '`:id` is written **before** `new`. Which component renders for **`/tasks/new`**?',
      config: `<Routes>
  <Route path="/tasks/:id" element={<TaskDetail />} />
  <Route path="/tasks/new" element={<NewTask />} />
</Routes>`,
      url: '/tasks/new',
      choices: ['TaskDetail, with id = "new"', 'NewTask', 'Both, one after the other', 'An error: the two routes clash'],
      answer: 1,
      why: 'React Router does not take the first route that matches: it ranks them. A static segment (`new`, 10 points) beats a dynamic one (`:id`, 3 points), so `/tasks/new` scores 24 against 17 and wins whatever the order. (An Express server, by contrast, runs the first route registered.)' },
    { id: 'rs-nest', kind: 'edit', title: 'Put the pages in the layout',
      goal: '`AppLayout` draws the header and the nav, but every page renders **alone**. Nest the page routes so that `/tasks` renders `AppLayout › TaskList` and `/tasks/3` renders `AppLayout › TaskDetail` (and `/` still renders `AppLayout`).',
      hint: 'Turn the layout route into an opening and a closing tag, `<Route path="/" element={<AppLayout />}>` … `</Route>`, and move the page routes inside it. Inside, paths are relative: `tasks` and `tasks/:id`.',
      url: '/tasks/3', opt: {},
      config: `<Routes>
  <Route path="/" element={<AppLayout />} />
  <Route path="/tasks" element={<TaskList />} />
  <Route path="/tasks/:id" element={<TaskDetail />} />
</Routes>`,
      check: (routes, opt) => [
        expectChain(routes, '/tasks', ['AppLayout', 'TaskList'], opt),
        expectChain(routes, '/tasks/3', ['AppLayout', 'TaskDetail'], opt),
        expectChain(routes, '/', ['AppLayout'], opt),
      ] },
    { id: 'rs-index', kind: 'edit', title: 'Fill the empty Outlet at /',
      goal: 'At `/` the layout renders with an **empty** `<Outlet />`. Make `/` show `Home` inside `AppLayout`, without changing `/tasks`.',
      hint: 'An **index route** renders at its parent\'s own URL: `<Route index element={<Home />} />` inside the layout route. It has no path.',
      url: '/', opt: {},
      config: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route path="tasks" element={<TaskList />} />
  </Route>
</Routes>`,
      check: (routes, opt) => {
        const items = [expectChain(routes, '/', ['AppLayout', 'Home'], opt), expectChain(routes, '/tasks', ['AppLayout', 'TaskList'], opt)];
        const home = matchRoutes(routes, '/').matches;
        const leaf = home && home[home.length - 1].route;
        if (items.every((x) => x.status === 'ok') && leaf && !leaf.index) items.push({ status: 'note', text: 'It works, but `<Route index element={<Home />} />` says "the default child" more clearly than an empty path.' });
        return items;
      } },
    { id: 'rs-catchall', kind: 'edit', title: 'A 404 page for unknown URLs',
      goal: '`/nope` matches no route, so the page is **blank** (React Router only logs a warning). Make every unknown URL show `NotFound` inside `AppLayout`.',
      hint: 'A route with `path="*"` matches any URL, but it has the lowest score, so it only wins when nothing else matches. Put it inside the layout route so the header stays.',
      url: '/nope', opt: {},
      config: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="tasks" element={<TaskList />} />
    <Route path="tasks/:id" element={<TaskDetail />} />
  </Route>
</Routes>`,
      check: (routes, opt) => [
        expectChain(routes, '/nope', ['AppLayout', 'NotFound'], opt),
        expectChain(routes, '/tasks/3/oops', ['AppLayout', 'NotFound'], opt),
        expectChain(routes, '/tasks', ['AppLayout', 'TaskList'], opt),
        expectChain(routes, '/tasks/3', ['AppLayout', 'TaskDetail'], opt),
      ] },
    { id: 'rs-tie', kind: 'edit', title: 'Equal scores: order breaks the tie',
      goal: '`/docs/about` should open the docs page called "about" (`DocsPage`), but `About` renders. `/en/about` must still render `About`.',
      hint: 'Look at the ranking table: `/:lang/about` and `/docs/:page` both score 17 (one static and one dynamic segment each). On a tie between siblings, the one written **first** wins. Swap the two routes.',
      url: '/docs/about', opt: {},
      config: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route path=":lang/about" element={<About />} />
    <Route path="docs/:page" element={<DocsPage />} />
  </Route>
</Routes>`,
      check: (routes, opt) => [
        expectChain(routes, '/docs/about', ['AppLayout', 'DocsPage'], opt),
        expectChain(routes, '/en/about', ['AppLayout', 'About'], opt),
        expectChain(routes, '/docs/routing', ['AppLayout', 'DocsPage'], opt),
      ] },
    { id: 'rs-protect', kind: 'edit', title: 'Protect the private pages',
      goal: 'Logged out, `/settings` and `/tasks/4/edit` must send the user to `/login`; the other pages stay public. Logged in, both pages show. Use the guard `RequireAuth` (shown under "The app code").',
      hint: 'Either wrap one page, `element={<RequireAuth><Settings /></RequireAuth>}`, or group several routes under a pathless guard route, `<Route element={<RequireAuth />}>` … `</Route>`. Never put `/login` behind the guard.',
      url: '/settings', opt: { loggedIn: false },
      config: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="tasks" element={<TaskList />} />
    <Route path="tasks/:id/edit" element={<EditTask />} />
    <Route path="settings" element={<Settings />} />
    <Route path="login" element={<Login />} />
  </Route>
</Routes>`,
      check: (routes) => [
        expectRedirect(routes, '/settings', '/login', { loggedIn: false }),
        expectRedirect(routes, '/tasks/4/edit', '/login', { loggedIn: false }),
        expectPage(routes, '/tasks', 'TaskList', { loggedIn: false }),
        expectPage(routes, '/login', 'Login', { loggedIn: false }),
        expectPage(routes, '/', 'Home', { loggedIn: false }),
        expectPage(routes, '/settings', 'Settings', { loggedIn: true }),
        expectPage(routes, '/tasks/4/edit', 'EditTask', { loggedIn: true }),
      ] },
    { id: 'rs-back', kind: 'edit', title: 'Make Back skip the log-in page',
      goal: 'Logged out on `/tasks`, the user clicks Settings, is sent to `/login`, logs in and lands on `/settings`. Now **Back** should return to `/tasks`, not to the log-in page. Fix it with the two `replace` switches under "The app code".',
      hint: 'Two entries must not stay in the history: `/settings` before the redirect (the guard should **replace** it with `/login`), and `/login` itself (after log-in, `navigate(from, { replace: true })`). Run the story by hand with the buttons to see the stack.',
      url: '/tasks', opt: { guardReplace: false, loginReplace: false, loggedIn: false },
      config: APP,
      check: (routes, opt) => {
        const s = createSim(routes, { ...opt, loggedIn: false });
        load(s, '/tasks');
        link(s, '/settings');
        const atLogin = current(s).pathname === '/login';
        submitLogin(s);
        const atSettings = current(s).pathname === '/settings';
        const stack = s.entries.map(href);
        back(s);
        const after = current(s).pathname;
        const items = [
          { status: atLogin ? 'ok' : 'bad', text: atLogin ? 'Clicking Settings while logged out leads to `/login`.' : 'Clicking Settings while logged out should lead to `/login`: keep the guard.' },
          { status: atSettings ? 'ok' : 'bad', text: atSettings ? 'After log-in, the user lands on `/settings`.' : 'After log-in, the user should land on `/settings`.' },
          { status: after === '/tasks' ? 'ok' : 'bad', text: after === '/tasks' ? 'Back returns to `/tasks`.' : `Back goes to \`${after}\` (history: ${stack.map((x) => `\`${x}\``).join(' → ')}); it should go to \`/tasks\`.` },
        ];
        return items;
      } },
    { id: 'rs-refresh', kind: 'edit', title: 'Survive a refresh',
      goal: 'Logged in on `/settings`, the user presses **Refresh**: the page should show `Settings` again. Right now the server answers 404, and even with the page served, the user would be logged out. Fix both with the switches.',
      hint: 'A refresh asks the **server** for `/settings`: it must answer every app path with `index.html` (the SPA fallback). Then the app starts from scratch: the log-in must be read back from somewhere that survives a reload, such as `localStorage`.',
      url: '/', opt: { fallback: false, persist: false, loggedIn: true },
      config: APP,
      check: (routes, opt) => {
        const s = createSim(routes, { ...opt, loggedIn: false });
        load(s, '/');
        setLoggedIn(s, true);
        link(s, '/settings');
        reload(s);
        const served = !s.view.server404;
        const items = [{ status: served ? 'ok' : 'bad', text: served ? 'The server answers `/settings` with `index.html`.' : 'The server answers `/settings` with **404**: no file has that name.' }];
        if (served) {
          const ok = current(s).pathname === '/settings' && chainOf(s.view).includes('Settings');
          items.push({ status: ok ? 'ok' : 'bad', text: ok ? 'After the refresh the user is still logged in and sees `Settings`.' : `After the refresh the app forgot the user and redirected to \`${current(s).pathname}\`.` });
        }
        return items;
      } },
  ];

  return {
    GUARDS, LOGIN_PAGES, DEFAULT_OPT, PRESETS, CHALLENGES,
    parseRoutes, checkPath, computeScore, explainScore, explodeOptionalSegments, flattenRoutes, rankRouteBranches, compilePath, matchPath, matchRoutes,
    parseUrl, href, searchEntries, resolveTo, renderLocation, chainOf,
    createSim, current, load, reload, rerender, link, back, forward, go, setLoggedIn, submitLogin, isLoginPage,
    elLabel, routeLabel, appCode,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = RoutingEngine;
