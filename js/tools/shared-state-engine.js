'use strict';

/* ==========================================================================
   State-tree engine (pure, no DOM; also runs in Node: site/test/shared-state-engine.test.mjs).

   A small model of "where does this piece of state live?" in a component tree. It is not
   React: it writes down the rules the Shared state cards teach so a student can try them.

   The tree (a task app) has two relations per component:
     parent   where it appears on the page (the render tree): context flows along it
     owner    the component whose JSX creates it: props flow along it, and a re-render of
              the owner re-creates it. Normally owner = parent; with `composition` on,
              Layout receives Header, Sidebar and TaskPage from App (as `children` /
              slots), so their owner is App while their parent is still Layout.

   An item is one piece of state with its users: { node, reads?, via?, writes? } (the prop a
   reader gets, the prop it is made from higher up, e.g. `task` from `tasks`, and the callback
   a writer calls). A configuration places it:
     { item, mode: 'props' | 'context', placements: [nodeId…], composition, memo,
       providerStyle: 'wrapper' | 'inline' }
     props    the state lives in the placed component and travels down with props
     context  a provider at the placed component; users read it with useContext.
              wrapper: a provider component (<ThemeProvider>{children}</…>) holds the
              state and wraps the placed component; inline: the placed component holds the
              state and writes the provider in its own JSX.

   StateTreeEngine.analyse(cfg) →
     { item, status: 'empty' | 'duplicate' | 'outside' | 'ok', users, lca, holder,
       outside: [ids], tooHigh, drill: [{ node, props, uses }], drillOnly: [ids],
       edges: [{ from, to, props }], rerender: [ids], extra: label | null, notes: [text] }
   Re-render rules (when the state changes):
     · the holder re-renders (or the provider component, in context-wrapper mode);
     · without memo, a re-rendering component re-renders everything it owns, all the way
       down (a component passed as children is owned by whoever created it, so it is skipped);
     · with memo (React.memo on every component and stable callbacks: the setter itself or
       useCallback) only components whose props changed re-render: the readers and the
       components that forward the value; components that only forward a callback skip;
     · a context consumer re-renders whenever the provider's value changes, memo or not.
   StateTreeEngine.CHALLENGES  [{ id, title, goal, kind: 'place' | 'pick', preset, … }]
     check(challengeId, cfg, picked) → boolean (picked: node ids for 'pick' challenges)
   ========================================================================== */

const StateTreeEngine = (() => {
  /* ---- The tree --------------------------------------------------------------------------- */

  // In display order; `parent` is the render tree. `role` is a one-line description.
  const NODES = [
    { id: 'App', parent: null, role: 'the root component' },
    { id: 'Layout', parent: 'App', role: 'page frame: header, sidebar, main area' },
    { id: 'Header', parent: 'Layout', role: 'top bar' },
    { id: 'Avatar', parent: 'Header', role: 'shows who is logged in' },
    { id: 'LogoutButton', parent: 'Header', role: 'logs the user out' },
    { id: 'Sidebar', parent: 'Layout', role: 'side navigation' },
    { id: 'ThemeToggle', parent: 'Sidebar', role: 'switches light / dark' },
    { id: 'TaskPage', parent: 'Layout', role: 'the tasks screen' },
    { id: 'Toolbar', parent: 'TaskPage', role: 'search box and task count' },
    { id: 'TaskList', parent: 'TaskPage', role: 'the visible tasks' },
    { id: 'TaskItem', parent: 'TaskList', role: 'one task with a done checkbox' },
    { id: 'TaskForm', parent: 'TaskPage', role: 'new-task form' },
  ];
  const IDS = NODES.map((n) => n.id);
  const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const COMPOSED = ['Header', 'Sidebar', 'TaskPage'];   // passed into Layout by App when composition is on

  const parentOf = (id) => NODE[id].parent;
  const ownerOf = (id, composition) => (composition && COMPOSED.includes(id) ? 'App' : NODE[id].parent);
  const depth = (id) => { let d = 0; for (let p = parentOf(id); p; p = parentOf(p)) d++; return d; };

  /* chain from id up to the root (id first), along `up` */
  function chain(id, up) { const out = []; for (let x = id; x; x = up(x)) out.push(x); return out; }

  /* lowest common ancestor (inclusive) of ids along `up` */
  function lca(ids, up) {
    if (!ids.length) return null;
    const common = chain(ids[0], up);
    return common.find((a) => ids.every((id) => chain(id, up).includes(a))) || null;
  }

  /* everything `id` owns, directly or not (not including id) */
  function ownedBy(id, composition) {
    const out = [];
    for (const n of IDS) if (n !== id && chain(n, (x) => ownerOf(x, composition)).includes(id)) out.push(n);
    return out;
  }

  /* ---- The pieces of state ---------------------------------------------------------------- */

  const ITEMS = [
    { id: 'draft', label: 'New-task title (the text being typed)', state: "const [title, setTitle] = useState('')",
      ctx: 'DraftContext', provider: 'DraftProvider', hook: 'useDraft',
      users: [{ node: 'TaskForm', reads: 'title', writes: 'setTitle' }] },
    { id: 'filter', label: 'Search filter text', state: "const [filter, setFilter] = useState('')",
      ctx: 'FilterContext', provider: 'FilterProvider', hook: 'useFilter',
      users: [{ node: 'Toolbar', reads: 'filter', writes: 'onFilterChange' }, { node: 'TaskList', reads: 'filter' }] },
    { id: 'tasks', label: 'The list of tasks', state: 'const [tasks, setTasks] = useState([])',
      ctx: 'TasksContext', provider: 'TasksProvider', hook: 'useTasks',
      users: [{ node: 'Toolbar', reads: 'tasks' }, { node: 'TaskList', reads: 'tasks' },
        { node: 'TaskItem', reads: 'task', via: 'tasks', writes: 'onToggle' }, { node: 'TaskForm', writes: 'onAdd' }] },
    { id: 'user', label: 'The logged-in user', state: 'const [user, setUser] = useState(null)',
      ctx: 'AuthContext', provider: 'AuthProvider', hook: 'useAuth',
      users: [{ node: 'Avatar', reads: 'user' }, { node: 'LogoutButton', writes: 'onLogout' }, { node: 'TaskList', reads: 'user' }] },
    { id: 'theme', label: 'Light or dark theme', state: "const [theme, setTheme] = useState('light')",
      ctx: 'ThemeContext', provider: 'ThemeProvider', hook: 'useTheme',
      users: [{ node: 'Layout', reads: 'theme' }, { node: 'ThemeToggle', reads: 'theme', writes: 'onToggleTheme' }, { node: 'TaskItem', reads: 'theme' }] },
  ];
  const itemById = (id) => ITEMS.find((i) => i.id === id) || null;

  const DEFAULT = { item: 'filter', mode: 'props', placements: [], composition: false, memo: false, providerStyle: 'wrapper' };
  const norm = (cfg) => {
    const c = { ...DEFAULT, ...(cfg || {}) };
    c.placements = [...new Set((c.placements || []).filter((p) => NODE[p]))];
    return c;
  };

  /* ---- Analysis --------------------------------------------------------------------------- */

  function analyse(cfgIn) {
    const cfg = norm(cfgIn);
    const item = itemById(cfg.item);
    if (!item) throw new Error(`Unknown item: ${cfg.item}`);
    const ownerUp = (x) => ownerOf(x, cfg.composition);
    const userIds = item.users.map((u) => u.node);
    const propsLca = lca(userIds, ownerUp);
    const renderLca = lca(userIds, parentOf);
    const res = {
      item, cfg, users: item.users, lca: cfg.mode === 'context' ? renderLca : propsLca, propsLca, renderLca,
      holder: null, status: 'ok', outside: [], tooHigh: false, drill: [], drillOnly: [], edges: [],
      rerender: [], extra: null, notes: [],
    };
    if (!cfg.placements.length) { res.status = 'empty'; return res; }
    if (cfg.placements.length > 1) {
      res.status = 'duplicate';
      res.holder = null;
      res.notes.push(`${cfg.placements.length} copies of the same state (${cfg.placements.join(', ')}): each copy changes on its own, so they drift apart. Keep one source of truth.`);
      return res;
    }
    const at = cfg.placements[0];
    res.holder = at;

    if (cfg.mode === 'props') {
      res.outside = userIds.filter((u) => !chain(u, ownerUp).includes(at));
      if (res.outside.length) { res.status = 'outside'; return res; }
      res.tooHigh = at !== propsLca;
      // props each edge carries, and which components only pass things on
      const edgeMap = new Map();
      const forwards = new Map();                    // node → Set(props it receives to pass on)
      for (const u of item.users) {
        const path = chain(u.node, ownerUp);         // u … at
        const stop = path.indexOf(at);
        for (let k = 0; k < stop; k++) {
          // the last hop carries the prop the user reads; earlier hops may carry what it is made from
          const names = [k === 0 ? u.reads : (u.via || u.reads), u.writes].filter(Boolean);
          const to = path[k];
          const from = path[k + 1];
          const key = `${from}>${to}`;
          if (!edgeMap.has(key)) edgeMap.set(key, { from, to, props: [] });
          const e = edgeMap.get(key);
          names.forEach((n) => { if (!e.props.includes(n)) e.props.push(n); });
          if (k > 0) {                               // `to` is between the holder and the user
            if (!forwards.has(to)) forwards.set(to, new Set());
            names.forEach((n) => forwards.get(to).add(n));
          }
        }
      }
      res.edges = [...edgeMap.values()].sort((a, b) => IDS.indexOf(a.to) - IDS.indexOf(b.to));
      res.drill = [...forwards.entries()].map(([node, set]) => ({ node, props: [...set], uses: userIds.includes(node) }))
        .sort((a, b) => IDS.indexOf(a.node) - IDS.indexOf(b.node));
      res.drillOnly = res.drill.filter((d) => !d.uses).map((d) => d.node);

      // re-renders when the state changes
      let set;
      if (!cfg.memo) set = [at, ...ownedBy(at, cfg.composition)];
      else {
        set = [at];
        for (const u of item.users) {
          if (!u.reads) continue;                    // a writer gets only the (stable) setter
          const path = chain(u.node, ownerUp);
          set.push(...path.slice(0, path.indexOf(at)));
        }
      }
      res.rerender = order(set);
      if (res.tooHigh) res.notes.push(`Higher than needed: ${propsLca} is the closest common parent of everyone who uses it.`);
      if (userIds.length === 1 && at === userIds[0]) res.notes.push('Only one component uses it, so it stays local: no props at all.');
    } else {
      res.outside = userIds.filter((u) => !chain(u, parentOf).includes(at));
      if (res.outside.length) { res.status = 'outside'; return res; }
      const consumers = userIds.filter((u) => !(cfg.providerStyle === 'inline' && u === at));
      let set;
      if (cfg.providerStyle === 'wrapper') {
        res.extra = item.provider;
        set = [...consumers];
        if (!cfg.memo) consumers.forEach((c) => set.push(...ownedBy(c, cfg.composition)));
      } else {
        set = [at, ...consumers];
        if (!cfg.memo) [at, ...consumers].forEach((c) => set.push(...ownedBy(c, cfg.composition)));
      }
      res.rerender = order(set);
      res.edges = [];
      if (userIds.length === 1) res.notes.push('Only one component uses it: a context is overkill, keep it local state.');
      else {
        const asProps = analyse({ ...cfg, mode: 'props', placements: [propsLca] });
        if (!asProps.drillOnly.length) res.notes.push(`Plain props would do here: with the state in ${propsLca}, no component would pass on a prop it does not use.`);
      }
    }
    return res;
  }

  const order = (ids) => IDS.filter((id) => ids.includes(id));

  /* Code the configuration stands for: a few lines a student can compare with their own. */
  function codeLines(res) {
    const { item, cfg } = res;
    if (res.status !== 'ok') return [];
    const out = [];
    if (cfg.mode === 'props') {
      out.push(`// in ${res.holder}`, item.state);
      for (const e of res.edges) out.push(`<${e.to} ${e.props.map((p) => `${p}={…}`).join(' ')} />   // in ${e.from}`);
    } else {
      const provided = item.state.match(/\[(\w+), (\w+)\]/);
      const value = provided ? `{ ${provided[1]}, ${provided[2]} }` : 'value';
      out.push(`const ${item.ctx} = createContext(null);`);
      if (cfg.providerStyle === 'wrapper') {
        out.push(`function ${item.provider}({ children }) {`, `  ${item.state};`, `  return <${item.ctx} value={${value}}>{children}</${item.ctx}>;`, '}');
        out.push(`<${item.provider}><${res.holder} /></${item.provider}>`);
      } else {
        out.push(`// in ${res.holder}`, item.state, `<${item.ctx} value={${value}}> … </${item.ctx}>`);
      }
      const readers = res.users.map((u) => u.node).filter((n) => !(cfg.providerStyle === 'inline' && n === res.holder));
      out.push(`// in ${readers.join(', ')}`, `const ${value} = useContext(${item.ctx});`);
    }
    return out;
  }

  /* ---- Challenges ------------------------------------------------------------------------- */

  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  const CHALLENGES = [
    { id: 'local-draft', kind: 'place', title: 'Keep local state local',
      goal: 'The title of a new task is typed in **TaskForm** and read nowhere else. Place its state where it belongs.',
      preset: { item: 'draft', mode: 'props', placements: [] },
      hint: 'If only one component uses a value, that component owns it.',
      why: 'One user, so the state stays in **TaskForm**: no props, and typing re-renders only the form.',
      ok: (r) => r.cfg.mode === 'props' && r.status === 'ok' && r.holder === 'TaskForm' },
    { id: 'lift-filter', kind: 'place', title: 'Lift the filter',
      goal: '**Toolbar** shows the search box and **TaskList** filters by it. Place the filter state so both share it with the least drilling.',
      preset: { item: 'filter', mode: 'props', placements: [] },
      hint: 'Find the closest component that has both of them below it.',
      why: '**TaskPage** is the closest common parent: it passes `filter` and `onFilterChange` to Toolbar and `filter` to TaskList, nothing more.',
      ok: (r) => r.cfg.mode === 'props' && r.status === 'ok' && r.holder === 'TaskPage' },
    { id: 'one-source', kind: 'place', title: 'One source of truth',
      goal: 'Someone kept one copy of the filter in **Toolbar** and another in **TaskList**: typing changes only the Toolbar copy. Remove the duplicate.',
      preset: { item: 'filter', mode: 'props', placements: ['Toolbar', 'TaskList'] },
      hint: 'Two copies always drift apart. Take both out and keep one, higher up.',
      why: 'One copy in **TaskPage**: Toolbar changes it through a callback, TaskList reads it, and they can never disagree.',
      ok: (r) => r.cfg.mode === 'props' && r.status === 'ok' && r.holder === 'TaskPage' },
    { id: 'spot-drilling', kind: 'pick', ask: 'drill', title: 'Spot the drilling',
      goal: 'The user lives in **App** and travels down with props. Select every component that receives `user` or `onLogout` **only to pass it on**.',
      preset: { item: 'user', mode: 'props', placements: ['App'], composition: false, memo: false },
      why: '**Layout**, **Header** and **TaskPage** use neither prop: they forward it to Avatar, LogoutButton and TaskList. That is prop drilling.' },
    { id: 'compose-layout', kind: 'place', title: 'Composition before context',
      goal: 'Keep props (no context), but make **Layout** drill nothing.',
      preset: { item: 'user', mode: 'props', placements: ['App'], composition: false },
      hint: 'If App creates Header and TaskPage itself and hands them to Layout as children, who passes them props?',
      why: 'With composition, App creates Header and TaskPage and gives them to Layout as `children`, so App passes them props directly and Layout never sees `user`.',
      ok: (r) => r.cfg.mode === 'props' && r.status === 'ok' && r.holder === 'App' && r.cfg.composition && !r.drill.some((d) => d.node === 'Layout') },
    { id: 'theme-context', kind: 'place', title: 'Move the theme into a context',
      goal: 'Layout, ThemeToggle and TaskItem need the theme. Put it in a **context** so no component passes it on.',
      preset: { item: 'theme', mode: 'props', placements: ['Layout'], composition: false },
      hint: 'Switch to Context, then place the provider above every component that reads it.',
      why: 'A provider at **Layout** or above reaches every reader through the render tree; each reads the theme with `useContext`, and no component in between mentions it.',
      ok: (r) => r.cfg.mode === 'context' && r.status === 'ok' },
    { id: 'filter-rerenders', kind: 'pick', ask: 'rerender', title: 'Who re-renders? (no memo)',
      goal: 'The filter lives in **TaskPage** (props, no memo). The user types a letter. Select every component that re-renders.',
      preset: { item: 'filter', mode: 'props', placements: ['TaskPage'], composition: false, memo: false },
      why: 'TaskPage\'s state changed, so TaskPage re-renders, and with it **everything it creates**: Toolbar, TaskList, every TaskItem and TaskForm, even the form, which does not use the filter. Nothing above TaskPage re-renders.' },
    { id: 'filter-memo', kind: 'pick', ask: 'rerender', title: 'Who re-renders? (with memo)',
      goal: 'Same filter in **TaskPage**, but every component is wrapped in `memo` and the callbacks are stable. The user types a letter. Select every component that re-renders.',
      preset: { item: 'filter', mode: 'props', placements: ['TaskPage'], composition: false, memo: true },
      why: '`memo` skips a component whose props did not change: TaskForm and each TaskItem get the same props as before. TaskPage (the owner), Toolbar and TaskList (their `filter` prop changed) re-render.' },
    { id: 'logout-rerenders', kind: 'pick', ask: 'rerender', title: 'Who re-renders on log-out?',
      goal: 'The user is in an **AuthProvider** component that wraps App (`{children}`), no memo. The user clicks Log out. Select every component that re-renders (AuthProvider itself is counted for you).',
      preset: { item: 'user', mode: 'context', placements: ['App'], composition: false, memo: false, providerStyle: 'wrapper' },
      why: 'The consumers re-render: **Avatar**, **LogoutButton** and **TaskList**. TaskList creates the TaskItems, so they re-render with it. App, Layout, Header and the rest do not: they were created outside AuthProvider (its `children`), so its re-render does not touch them.' },
  ];

  function answerOf(c) {
    const r = analyse(c.preset);
    return c.ask === 'drill' ? r.drillOnly : r.rerender;
  }

  function check(challengeId, cfg, picked = []) {
    const c = CHALLENGES.find((x) => x.id === challengeId);
    if (!c) return false;
    if (c.kind === 'pick') return same(order(picked), answerOf(c));
    return !!c.ok(analyse(cfg));
  }

  return { NODES, IDS, ITEMS, COMPOSED, DEFAULT, CHALLENGES, parentOf, ownerOf, depth, lca, ownedBy, itemById, analyse, codeLines, check, answerOf, norm };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = StateTreeEngine;
