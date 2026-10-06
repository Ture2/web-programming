// Unit tests for the client-side routing engine (site/js/tools/routing-engine.js): the JSX reader,
// React Router's ranking and matching (expected values worked out from React Router 6.4+/7's
// flattenRoutes / computeScore / matchPath), rendering with guards and redirects, the simulated
// history, and every challenge (unsolved at the start, solved by a reference answer).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../js/tools/routing-engine.js');

const parse = (text) => {
  const r = E.parseRoutes(text);
  assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
  return r.routes;
};
const chainAt = (routes, url, opt) => {
  const s = E.createSim(routes, opt);
  E.load(s, url);
  return { s, chain: E.chainOf(s.view).join(' > '), at: E.href(E.current(s)) };
};

/* ---- Reading the configuration --------------------------------------------------------- */

test('parseRoutes reads nested routes, index, guards and Navigate', () => {
  const r = parse(E.PRESETS[0].config);
  assert.equal(r.length, 1);
  const root = r[0];
  assert.equal(root.path, '/');
  assert.equal(root.element.name, 'AppLayout');
  assert.equal(root.children[0].index, true);
  const tasks = root.children[1];
  assert.equal(tasks.children[1].element.name, 'RequireAuth');
  assert.equal(tasks.children[1].element.children[0].name, 'NewTask');
  const todo = root.children.find((x) => x.path === 'todo');
  assert.deepEqual(todo.element.attrs, { to: '/tasks', replace: true });
  const guard = root.children.find((x) => x.path === undefined && !x.index);
  assert.equal(guard.element.name, 'RequireAuth');
  assert.equal(guard.children[0].path, 'settings');
});

test('parseRoutes accepts no <Routes> wrapper, fragments, comments and Component', () => {
  const r = parse(`{/* top */}
<Route path="/" Component={Home} />
<React.Fragment>
  <Route path="a" element={<A></A>} /> // a comment
</React.Fragment>`);
  assert.deepEqual(r.map((x) => [x.path, x.element.name]), [['/', 'Home'], ['a', 'A']]);
});

test('parseRoutes reports syntax errors with a line number', () => {
  const r = E.parseRoutes('<Routes>\n  <Route path="/" element={<Home />}>\n</Routes>');
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /Expected <\/Route>/);
  assert.equal(r.errors[0].line, 3);
  assert.match(E.parseRoutes('<Routes>\n<Route path="/" element={<Home />} />').errors[0].message, /never closed/);
  assert.match(E.parseRoutes('<Routes>\n<Route path="/" element="Home" />\n</Routes>').errors[0].message, /JSX element/);
});

test('parseRoutes enforces React Router rules', () => {
  assert.match(E.parseRoutes('<Routes><div /></Routes>').errors[0].message, /\[div\] is not a <Route> component/);
  assert.match(E.parseRoutes('<Route index element={<A />}><Route path="x" element={<B />} /></Route>').errors[0].message, /index route cannot have child routes/);
  assert.match(E.parseRoutes('<Route path="/tasks" element={<A />}><Route path="/settings" element={<B />} /></Route>').errors[0].message, /Absolute route path "\/settings" nested under path "\/tasks"/);
  assert.equal(E.parseRoutes('<Route path="/tasks" element={<A />}><Route path="/tasks/:id" element={<B />} /></Route>').errors.length, 0);
  assert.match(E.checkPath('files*'), /whole last segment/);
  assert.match(E.checkPath('a/*/b'), /whole last segment/);
  assert.match(E.checkPath('tasks/:'), /not a valid parameter/);
  assert.match(E.checkPath('tasks?page=2'), /query string/);
  assert.equal(E.checkPath('tasks/:id?'), null);
});

test('parseRoutes warns about React Router 5 props', () => {
  const r = E.parseRoutes('<Route exact path="/" component={Home} />');
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 3);              // exact, component, and "matches but renders nothing"
  assert.match(r.warnings.map((w) => w.message).join(' '), /exact.*React Router 5/);
});

/* ---- Ranking (React Router's computeScore) ---------------------------------------------- */

test('computeScore follows React Router', () => {
  assert.equal(E.computeScore('/', false), 4);
  assert.equal(E.computeScore('/', true), 6);
  assert.equal(E.computeScore('/tasks', false), 13);
  assert.equal(E.computeScore('/tasks/', true), 17);
  assert.equal(E.computeScore('/tasks/:id', false), 17);
  assert.equal(E.computeScore('/tasks/new', false), 24);
  assert.equal(E.computeScore('/tasks/:id/edit', false), 28);
  assert.equal(E.computeScore('/*', false), 1);
  assert.equal(E.computeScore('/docs/*', false), 12);
});

test('a static segment beats a dynamic one whatever the order', () => {
  const r = parse('<Routes><Route path="/tasks/:id" element={<D />} /><Route path="/tasks/new" element={<N />} /></Routes>');
  assert.equal(chainAt(r, '/tasks/new').chain, 'N');
  assert.equal(chainAt(r, '/tasks/12').chain, 'D');
});

test('the splat * loses to everything else, and catches the rest', () => {
  const r = parse('<Routes><Route path="*" element={<NotFound />} /><Route path="/" element={<Home />} /><Route path="/tasks" element={<L />} /></Routes>');
  assert.equal(chainAt(r, '/').chain, 'Home');
  assert.equal(chainAt(r, '/tasks').chain, 'L');
  const nf = chainAt(r, '/a/b');
  assert.equal(nf.chain, 'NotFound');
  assert.deepEqual({ ...nf.s.view.params }, { '*': 'a/b' });
});

test('equal scores: the first sibling wins', () => {
  const a = parse('<Route path="/" element={<L />}><Route path=":lang/about" element={<About />} /><Route path="docs/:page" element={<Docs />} /></Route>');
  assert.equal(chainAt(a, '/docs/about').chain, 'L > About');
  const b = parse('<Route path="/" element={<L />}><Route path="docs/:page" element={<Docs />} /><Route path=":lang/about" element={<About />} /></Route>');
  assert.equal(chainAt(b, '/docs/about').chain, 'L > Docs');
});

test('an index route beats its parent at the parent\'s URL', () => {
  const r = parse('<Route path="tasks" element={<Layout />}><Route index element={<List />} /><Route path=":id" element={<D />} /></Route>');
  const m = E.matchRoutes(r, '/tasks');
  assert.equal(m.ranked[m.winner].path, '/tasks/');
  assert.equal(chainAt(r, '/tasks').chain, 'Layout > List');
  const noIndex = parse('<Route path="tasks" element={<Layout />}><Route path=":id" element={<D />} /></Route>');
  const v = chainAt(noIndex, '/tasks');
  assert.equal(v.chain, 'Layout');
  assert.equal(v.s.view.tree[0].emptyOutlet, true);
});

/* ---- Matching ---------------------------------------------------------------------------- */

test('params are strings, decoded; case and trailing slash are ignored', () => {
  const r = parse('<Route path="/tasks/:id" element={<D />} />');
  assert.deepEqual({ ...E.matchRoutes(r, '/tasks/7').matches[0].params }, { id: '7' });
  assert.deepEqual({ ...E.matchRoutes(r, '/Tasks/7/').matches[0].params }, { id: '7' });
  assert.deepEqual({ ...E.matchRoutes(r, '/tasks/caf%C3%A9').matches[0].params }, { id: 'café' });
  assert.equal(E.matchRoutes(r, '/tasks').matches, null);
  assert.equal(E.matchRoutes(r, '/tasks/7/edit').matches, null);
  const cs = parse('<Route path="/Tasks" caseSensitive element={<D />} />');
  assert.equal(E.matchRoutes(cs, '/tasks').matches, null);
});

test('a parent\'s params include the child\'s (one shared object)', () => {
  const r = parse('<Route path="users/:userId" element={<U />}><Route path="tasks/:taskId" element={<T />} /></Route>');
  const m = E.matchRoutes(r, '/users/3/tasks/9').matches;
  assert.deepEqual({ ...m[0].params }, { userId: '3', taskId: '9' });
  assert.equal(m[0].pathname, '/users/3');
  assert.equal(m[1].pathname, '/users/3/tasks/9');
});

test('optional segments are exploded into two branches', () => {
  assert.deepEqual(E.explodeOptionalSegments('/:lang?/about'), ['/:lang/about', '/about']);
  assert.deepEqual(E.explodeOptionalSegments('tasks/:id?'), ['tasks/:id', 'tasks']);
  const r = parse('<Route path=":lang?/about" element={<About />} />');
  assert.deepEqual({ ...E.matchRoutes(r, '/en/about').matches[0].params }, { lang: 'en' });
  assert.ok(E.matchRoutes(r, '/about').matches);
});

test('a splat under a path keeps the rest of the URL', () => {
  const r = parse('<Route path="docs/*" element={<Docs />} />');
  assert.deepEqual({ ...E.matchRoutes(r, '/docs/guide/routing').matches[0].params }, { '*': 'guide/routing' });
  assert.deepEqual({ ...E.matchRoutes(r, '/docs').matches[0].params }, { '*': '' });
  assert.equal(E.matchRoutes(r, '/docsx').matches, null);
});

test('pathless layout routes wrap their children without using any URL', () => {
  const r = parse('<Route element={<Shell />}><Route path="/a" element={<A />} /></Route>');
  assert.equal(chainAt(r, '/a').chain, 'Shell > A');
  assert.equal(chainAt(r, '/').s.view.notFound, true);
});

test('parseUrl, searchEntries and resolveTo', () => {
  assert.deepEqual(E.parseUrl('http://localhost:5173/tasks?page=2#top'), { pathname: '/tasks', search: '?page=2', hash: '#top' });
  assert.deepEqual(E.parseUrl('tasks'), { pathname: '/tasks', search: '', hash: '' });
  assert.deepEqual(E.searchEntries('?q=buy+milk&done=true&tag=a&tag=b'), [['q', 'buy milk'], ['done', 'true'], ['tag', 'a'], ['tag', 'b']]);
  assert.equal(E.resolveTo('edit', '/tasks/7'), '/tasks/7/edit');
  assert.equal(E.resolveTo('..', '/tasks/7'), '/tasks');
  assert.equal(E.resolveTo('/login?x=1', '/a'), '/login?x=1');
});

/* ---- Rendering, guards and redirects ---------------------------------------------------- */

test('a guard redirects with state.from, and lets the page through when logged in', () => {
  const r = parse(E.PRESETS[0].config);
  const out = chainAt(r, '/settings?tab=2', { loggedIn: false });
  assert.equal(out.at, '/login');
  assert.equal(out.chain, 'AppLayout > Login');
  assert.deepEqual(E.current(out.s).state, { from: '/settings?tab=2' });
  assert.equal(out.s.log.filter((l) => l.kind === 'redirect').length, 1);
  const inn = chainAt(r, '/settings', { loggedIn: true });
  assert.equal(inn.chain, 'AppLayout > RequireAuth > Settings');
  assert.equal(chainAt(r, '/tasks/3/edit', { loggedIn: true }).chain, 'AppLayout > TasksLayout > EditTask');
});

test('the guard passes from to the log-in page through history state', () => {
  const r = parse(E.PRESETS[0].config);
  const s = E.createSim(r, { guardReplace: true });
  E.load(s, '/');
  E.link(s, '/settings?tab=2');
  assert.equal(E.href(E.current(s)), '/login');
  assert.deepEqual(E.current(s).state, { from: '/settings?tab=2' });
  assert.ok(E.isLoginPage(s));
  E.submitLogin(s);
  assert.equal(E.href(E.current(s)), '/settings?tab=2');
});

test('<Navigate> redirects, push or replace', () => {
  const r = parse('<Routes><Route path="/" element={<Home />} /><Route path="/old" element={<Navigate to="/new" replace />} /><Route path="/push" element={<Navigate to="/new" />} /><Route path="/new" element={<New />} /></Routes>');
  const s = E.createSim(r);
  E.load(s, '/');
  E.link(s, '/old');
  assert.deepEqual(s.entries.map(E.href), ['/', '/new']);
  E.link(s, '/push');
  assert.deepEqual(s.entries.map(E.href), ['/', '/new', '/push', '/new']);
});

test('a guard around /login loops, and the loop is reported', () => {
  const r = parse(E.PRESETS.find((p) => p.id === 'loop').config);
  const s = E.createSim(r);
  E.load(s, '/settings');
  assert.equal(s.view.loop, true);
  assert.equal(s.log[s.log.length - 1].kind, 'error');
});

test('no match: nothing renders and a warning is logged', () => {
  const r = parse('<Route path="/" element={<Home />} />');
  const s = E.createSim(r);
  E.load(s, '/nope?x=1');
  assert.equal(s.view.notFound, true);
  assert.match(s.log[s.log.length - 1].text, /No routes matched location "\/nope\?x=1"/);
});

/* ---- History ------------------------------------------------------------------------------ */

test('push, back, forward and a new push that drops the forward entries', () => {
  const r = parse(E.PRESETS[0].config);
  const s = E.createSim(r);
  E.load(s, '/');
  E.link(s, '/tasks');
  E.link(s, '/tasks/1');
  E.back(s);
  assert.equal(E.href(E.current(s)), '/tasks');
  E.forward(s);
  assert.equal(E.href(E.current(s)), '/tasks/1');
  E.back(s);
  E.back(s);
  E.link(s, '/tasks/2');
  assert.deepEqual(s.entries.map(E.href), ['/', '/tasks/2']);
  E.back(s);
  E.back(s);
  assert.equal(s.index, 0);
});

test('Back into a guarded page bounces to /login again when the guard pushes', () => {
  const r = parse(E.PRESETS[0].config);
  const s = E.createSim(r, { guardReplace: false });
  E.load(s, '/tasks');
  E.link(s, '/settings');
  assert.deepEqual(s.entries.map(E.href), ['/tasks', '/settings', '/login']);
  E.back(s);                               // to /settings: the guard pushes /login again
  assert.equal(E.href(E.current(s)), '/login');
  assert.deepEqual(s.entries.map(E.href), ['/tasks', '/settings', '/login']);
});

test('refresh: server fallback and persisted log-in', () => {
  const r = parse(E.PRESETS[0].config);
  const noFallback = E.createSim(r, { fallback: false });
  E.load(noFallback, '/tasks');
  assert.equal(noFallback.view.server404, true);
  E.load(noFallback, '/');
  assert.equal(noFallback.app, true);
  const forget = E.createSim(r, { persist: false, loggedIn: true });
  E.load(forget, '/settings');
  assert.equal(forget.loggedIn, false);
  assert.equal(E.href(E.current(forget)), '/login');
  const keep = E.createSim(r, { persist: true, loggedIn: true });
  E.load(keep, '/settings');
  E.reload(keep);
  assert.equal(E.href(E.current(keep)), '/settings');
});

test('Back across page loads reloads the app', () => {
  const r = parse(E.PRESETS[0].config);
  const s = E.createSim(r, { persist: false });
  E.load(s, '/');
  E.setLoggedIn(s, true);
  E.load(s, '/tasks');                     // typed in the address bar: a new page load
  assert.equal(s.loggedIn, false);
  E.back(s);
  assert.equal(s.log[0].text.includes('another page load'), true);
});

test('appCode shows the replace options', () => {
  assert.match(E.appCode({ guardReplace: true, loginReplace: false }), /<Navigate to="\/login" replace state/);
  assert.match(E.appCode({ guardReplace: true, loginReplace: false }), /navigate\(target\);/);
  assert.match(E.appCode({ guardReplace: false, loginReplace: true }), /navigate\(target, \{ replace: true \}\)/);
});

/* ---- Presets and challenges ------------------------------------------------------------- */

test('every preset parses without errors or warnings', () => {
  E.PRESETS.forEach((p) => {
    const r = E.parseRoutes(p.config);
    assert.deepEqual(r.errors, [], p.id);
    assert.deepEqual(r.warnings, [], p.id);
  });
});

const SOLUTIONS = {
  'rs-nest': { config: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route path="tasks" element={<TaskList />} />
    <Route path="tasks/:id" element={<TaskDetail />} />
  </Route>
</Routes>` },
  'rs-index': { config: `<Route path="/" element={<AppLayout />}>
  <Route index element={<Home />} />
  <Route path="tasks" element={<TaskList />} />
</Route>` },
  'rs-catchall': { config: `<Route path="/" element={<AppLayout />}>
  <Route index element={<Home />} />
  <Route path="tasks" element={<TaskList />} />
  <Route path="tasks/:id" element={<TaskDetail />} />
  <Route path="*" element={<NotFound />} />
</Route>` },
  'rs-tie': { config: `<Route path="/" element={<AppLayout />}>
  <Route path="docs/:page" element={<DocsPage />} />
  <Route path=":lang/about" element={<About />} />
</Route>` },
  'rs-protect': { config: `<Route path="/" element={<AppLayout />}>
  <Route index element={<Home />} />
  <Route path="tasks" element={<TaskList />} />
  <Route element={<RequireAuth />}>
    <Route path="tasks/:id/edit" element={<EditTask />} />
  </Route>
  <Route path="settings" element={<RequireAuth><Settings /></RequireAuth>} />
  <Route path="login" element={<Login />} />
</Route>` },
  'rs-back': { opt: { guardReplace: true, loginReplace: true } },
  'rs-refresh': { opt: { fallback: true, persist: true } },
};

const allOk = (items) => items.length > 0 && items.every((i) => i.status !== 'bad');

test('challenges are well formed', () => {
  const ids = new Set();
  E.CHALLENGES.forEach((c) => {
    assert.ok(!ids.has(c.id), c.id);
    ids.add(c.id);
    assert.ok(c.title && c.goal, c.id);
    assert.deepEqual(E.parseRoutes(c.config).errors, [], c.id);
    if (c.kind === 'predict') {
      assert.ok(c.choices.length >= 3 && c.answer >= 0 && c.answer < c.choices.length && c.why, c.id);
    } else {
      assert.equal(c.kind, 'edit', c.id);
      assert.ok(c.hint && typeof c.check === 'function' && SOLUTIONS[c.id], c.id);
    }
  });
});

test('predict challenges: the stated answer is what the engine renders', () => {
  E.CHALLENGES.filter((c) => c.kind === 'predict').forEach((c) => {
    const { chain } = chainAt(parse(c.config), c.url);
    assert.ok(c.choices[c.answer].replace(/,.*$/, '').startsWith(chain.replace(/ > /g, ' › ')), `${c.id}: ${chain}`);
  });
});

test('edit challenges start unsolved and are solved by the reference answer', () => {
  E.CHALLENGES.filter((c) => c.kind === 'edit').forEach((c) => {
    const opt = { ...E.DEFAULT_OPT, ...c.opt };
    assert.ok(!allOk(c.check(parse(c.config), opt)), `${c.id} is solved at the start`);
    const sol = SOLUTIONS[c.id];
    const items = c.check(parse(sol.config || c.config), { ...opt, ...(sol.opt || {}) });
    assert.ok(allOk(items), `${c.id}: ${JSON.stringify(items)}`);
  });
});

test('half answers do not solve the two-switch challenges', () => {
  const back = E.CHALLENGES.find((c) => c.id === 'rs-back');
  const routes = parse(back.config);
  assert.ok(!allOk(back.check(routes, { ...E.DEFAULT_OPT, guardReplace: true, loginReplace: false })));
  assert.ok(!allOk(back.check(routes, { ...E.DEFAULT_OPT, guardReplace: false, loginReplace: true })));
  const refresh = E.CHALLENGES.find((c) => c.id === 'rs-refresh');
  assert.ok(!allOk(refresh.check(routes, { ...E.DEFAULT_OPT, fallback: true, persist: false })));
  assert.ok(!allOk(refresh.check(routes, { ...E.DEFAULT_OPT, fallback: false, persist: true })));
});

test('protecting /login too is caught as a loop', () => {
  const c = E.CHALLENGES.find((x) => x.id === 'rs-protect');
  const routes = parse(`<Route path="/" element={<AppLayout />}>
  <Route index element={<Home />} />
  <Route path="tasks" element={<TaskList />} />
  <Route element={<RequireAuth />}>
    <Route path="tasks/:id/edit" element={<EditTask />} />
    <Route path="settings" element={<Settings />} />
    <Route path="login" element={<Login />} />
  </Route>
</Route>`);
  const items = c.check(routes, E.DEFAULT_OPT);
  assert.ok(items.some((i) => i.status === 'bad' && /forever/.test(i.text)));
});
