// Unit tests for the state-tree model (site/js/tools/shared-state-engine.js).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../js/tools/shared-state-engine.js');
const run = (cfg) => E.analyse(cfg);

test('the tree is consistent: one root, every parent exists and comes earlier', () => {
  assert.equal(E.NODES.filter((n) => n.parent === null).length, 1);
  E.NODES.forEach((n, k) => {
    if (n.parent) assert.ok(E.IDS.indexOf(n.parent) < k, `${n.id} after its parent`);
  });
  assert.equal(E.depth('TaskItem'), 4);
  E.COMPOSED.forEach((id) => assert.equal(E.parentOf(id), 'Layout'));
});

test('composition changes the owner, never the parent', () => {
  assert.equal(E.ownerOf('TaskPage', false), 'Layout');
  assert.equal(E.ownerOf('TaskPage', true), 'App');
  assert.equal(E.parentOf('TaskPage'), 'Layout');
  assert.equal(E.ownerOf('TaskList', true), 'TaskPage');
});

test('lowest common ancestor', () => {
  const up = (x) => E.parentOf(x);
  assert.equal(E.lca(['Toolbar', 'TaskList'], up), 'TaskPage');
  assert.equal(E.lca(['Avatar', 'TaskList'], up), 'Layout');
  assert.equal(E.lca(['TaskItem', 'TaskList'], up), 'TaskList');
  assert.equal(E.lca(['TaskForm'], up), 'TaskForm');
  assert.equal(E.lca([], up), null);
});

test('every item has users that exist, and users of a writer name a callback', () => {
  for (const item of E.ITEMS) {
    assert.ok(item.users.length >= 1, item.id);
    item.users.forEach((u) => { assert.ok(E.IDS.includes(u.node), u.node); assert.ok(u.reads || u.writes); });
    assert.match(item.state, /^const \[\w+, set\w+\] = useState\(/);
  }
});

test('nothing placed → empty; two placements → duplicate', () => {
  assert.equal(run({ item: 'filter', placements: [] }).status, 'empty');
  const r = run({ item: 'filter', placements: ['Toolbar', 'TaskList'] });
  assert.equal(r.status, 'duplicate');
  assert.match(r.notes[0], /one source of truth/);
});

test('props: the closest common parent needs no drilling and is not "too high"', () => {
  const r = run({ item: 'filter', mode: 'props', placements: ['TaskPage'] });
  assert.equal(r.status, 'ok');
  assert.equal(r.lca, 'TaskPage');
  assert.equal(r.tooHigh, false);
  assert.deepEqual(r.drillOnly, []);
  assert.deepEqual(r.edges.map((e) => [e.from, e.to, e.props.join()]),
    [['TaskPage', 'Toolbar', 'filter,onFilterChange'], ['TaskPage', 'TaskList', 'filter']]);
});

test('props: a user outside the holder\'s subtree is flagged', () => {
  const r = run({ item: 'filter', mode: 'props', placements: ['Toolbar'] });
  assert.equal(r.status, 'outside');
  assert.deepEqual(r.outside, ['TaskList']);
});

test('props: placing higher than needed works but drills and warns', () => {
  const r = run({ item: 'filter', mode: 'props', placements: ['App'] });
  assert.equal(r.status, 'ok');
  assert.equal(r.tooHigh, true);
  assert.deepEqual(r.drillOnly, ['Layout', 'TaskPage']);
  assert.match(r.notes.join(' '), /TaskPage is the closest common parent/);
});

test('props: the user in App is drilled through Layout, Header and TaskPage', () => {
  const r = run({ item: 'user', mode: 'props', placements: ['App'] });
  assert.deepEqual(r.drillOnly, ['Layout', 'Header', 'TaskPage']);
  const layout = r.drill.find((d) => d.node === 'Layout');
  assert.deepEqual(layout.props.sort(), ['onLogout', 'user']);
});

test('composition: App passes props straight to the pages, Layout drills nothing', () => {
  const r = run({ item: 'user', mode: 'props', placements: ['App'], composition: true });
  assert.deepEqual(r.drillOnly, ['Header', 'TaskPage']);
  assert.ok(r.edges.some((e) => e.from === 'App' && e.to === 'TaskPage'));
  // with composition, Layout no longer owns the sidebar: theme state in Layout cannot reach ThemeToggle
  assert.equal(run({ item: 'theme', mode: 'props', placements: ['Layout'], composition: true }).status, 'outside');
});

test('a derived prop travels under its source name until the last hop', () => {
  const r = run({ item: 'tasks', mode: 'props', placements: ['TaskPage'] });
  const toList = r.edges.find((e) => e.to === 'TaskList');
  const toItem = r.edges.find((e) => e.to === 'TaskItem');
  assert.deepEqual(toList.props, ['tasks', 'onToggle']);
  assert.deepEqual(toItem.props, ['task', 'onToggle']);
  assert.deepEqual(r.drill, [{ node: 'TaskList', props: ['tasks', 'onToggle'], uses: true }]);
});

test('re-render without memo: the holder and everything it owns', () => {
  assert.deepEqual(run({ item: 'filter', placements: ['TaskPage'] }).rerender, ['TaskPage', 'Toolbar', 'TaskList', 'TaskItem', 'TaskForm']);
  assert.deepEqual(run({ item: 'draft', placements: ['TaskForm'] }).rerender, ['TaskForm']);
  assert.equal(run({ item: 'filter', placements: ['App'] }).rerender.length, E.IDS.length);
});

test('re-render with memo: only components whose props changed; setter-only components skip', () => {
  assert.deepEqual(run({ item: 'filter', placements: ['TaskPage'], memo: true }).rerender, ['TaskPage', 'Toolbar', 'TaskList']);
  const tasks = run({ item: 'tasks', placements: ['TaskPage'], memo: true }).rerender;
  assert.ok(!tasks.includes('TaskForm'));
  assert.ok(tasks.includes('TaskItem'));
  // drilling components re-render even with memo: their prop changed
  assert.deepEqual(run({ item: 'user', placements: ['App'], memo: true }).rerender, ['App', 'Layout', 'Header', 'Avatar', 'TaskPage', 'TaskList']);
});

test('context (wrapper): consumers re-render, plus what they own when there is no memo', () => {
  const r = run({ item: 'user', mode: 'context', placements: ['App'], providerStyle: 'wrapper' });
  assert.equal(r.status, 'ok');
  assert.equal(r.extra, 'AuthProvider');
  assert.deepEqual(r.drillOnly, []);
  assert.deepEqual(r.rerender, ['Avatar', 'LogoutButton', 'TaskList', 'TaskItem']);
  assert.deepEqual(run({ item: 'user', mode: 'context', placements: ['App'], memo: true }).rerender, ['Avatar', 'LogoutButton', 'TaskList']);
});

test('context (inline): the holder re-renders and takes its subtree with it unless memo', () => {
  assert.equal(run({ item: 'user', mode: 'context', placements: ['App'], providerStyle: 'inline' }).rerender.length, E.IDS.length);
  assert.deepEqual(run({ item: 'user', mode: 'context', placements: ['App'], providerStyle: 'inline', memo: true }).rerender,
    ['App', 'Avatar', 'LogoutButton', 'TaskList']);
});

test('context: readers must be inside the provider (render tree), and context notes', () => {
  const r = run({ item: 'theme', mode: 'context', placements: ['TaskPage'] });
  assert.equal(r.status, 'outside');
  assert.deepEqual(r.outside, ['Layout', 'ThemeToggle']);
  assert.equal(run({ item: 'theme', mode: 'context', placements: ['Layout'] }).status, 'ok');
  assert.match(run({ item: 'filter', mode: 'context', placements: ['TaskPage'] }).notes.join(' '), /Plain props would do/);
  assert.match(run({ item: 'draft', mode: 'context', placements: ['TaskForm'] }).notes.join(' '), /overkill/);
});

test('code lines describe the placement', () => {
  const props = E.codeLines(run({ item: 'filter', placements: ['TaskPage'] }));
  assert.ok(props.includes("const [filter, setFilter] = useState('')"));
  assert.ok(props.some((l) => l.startsWith('<Toolbar filter={…} onFilterChange={…} />')));
  const ctx = E.codeLines(run({ item: 'theme', mode: 'context', placements: ['App'] }));
  assert.ok(ctx.includes('const ThemeContext = createContext(null);'));
  assert.ok(ctx.includes('const { theme, setTheme } = useContext(ThemeContext);'));
  assert.deepEqual(E.codeLines(run({ item: 'filter', placements: [] })), []);
});

test('challenges: unique ids, presets valid, place challenges unsolved by their preset', () => {
  const ids = E.CHALLENGES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of E.CHALLENGES) {
    assert.ok(c.title && c.goal && c.why, c.id);
    assert.ok(E.itemById(c.preset.item), c.id);
    if (c.kind === 'place') assert.equal(E.check(c.id, c.preset), false, `${c.id} solved by its preset`);
    else assert.ok(E.answerOf(c).length > 0, c.id);
  }
});

test('challenges: the intended solutions pass, near misses fail', () => {
  assert.ok(E.check('local-draft', { item: 'draft', placements: ['TaskForm'] }));
  assert.ok(!E.check('local-draft', { item: 'draft', placements: ['TaskPage'] }));
  assert.ok(E.check('lift-filter', { item: 'filter', placements: ['TaskPage'] }));
  assert.ok(!E.check('lift-filter', { item: 'filter', placements: ['App'] }));
  assert.ok(E.check('one-source', { item: 'filter', placements: ['TaskPage'] }));
  assert.ok(!E.check('one-source', { item: 'filter', placements: ['TaskPage', 'Toolbar'] }));
  assert.ok(E.check('compose-layout', { item: 'user', placements: ['App'], composition: true }));
  assert.ok(!E.check('compose-layout', { item: 'user', placements: ['App'], composition: false }));
  assert.ok(!E.check('compose-layout', { item: 'user', mode: 'context', placements: ['App'], composition: true }));
  assert.ok(E.check('theme-context', { item: 'theme', mode: 'context', placements: ['App'] }));
  assert.ok(E.check('theme-context', { item: 'theme', mode: 'context', placements: ['Layout'], providerStyle: 'inline' }));
  assert.ok(!E.check('theme-context', { item: 'theme', mode: 'context', placements: ['Sidebar'] }));
  assert.ok(E.check('spot-drilling', null, ['TaskPage', 'Layout', 'Header']));
  assert.ok(!E.check('spot-drilling', null, ['Layout', 'Header']));
  assert.ok(E.check('filter-memo', null, ['TaskPage', 'Toolbar', 'TaskList']));
  assert.ok(E.check('logout-rerenders', null, ['Avatar', 'LogoutButton', 'TaskList', 'TaskItem']));
  assert.ok(!E.check('logout-rerenders', null, ['Avatar', 'LogoutButton', 'TaskList']));
  assert.equal(E.check('nope', {}), false);
});
