'use strict';
/* Shared state: concept cards, rail groups and self-check quiz (React context as the worked example).
   Cards explain with `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js). */

DATA.en.SHARED_QUIZ_TOPICS = {
  where: 'Where state lives',
  drilling: 'Prop drilling and composition',
  context: 'Context',
  auth: 'An authentication context',
  stores: 'Server state and stores',
};

DATA.en.SHARED_GROUPS = [
  { key: 'where', label: 'Where state lives', icon: 'tree' },
  { key: 'drilling', label: 'Prop drilling and composition', icon: 'levels' },
  { key: 'context', label: 'Context', icon: 'share' },
  { key: 'auth', label: 'An authentication context', icon: 'lock' },
  { key: 'stores', label: 'Server state and stores', icon: 'storage' },
];

const SHARED_TREE_LINK = { href: '#/browser/shared-state/practice/state-tree', label: 'Open the state-tree tool' };

DATA.en.SHARED_CONCEPTS = [
  /* ---- 1. Where state lives ------------------------------------------------------------------------ */
  { id: 'where-state-lives', hub: 'where', topic: 'where',
    title: 'Where a piece of state lives',
    summary: 'Every piece of state has one **owner**, the component that declares it: put it in the **closest common parent** of every component that reads or changes it, and no higher.',
    html: [
      '<p>Data in a component tree only flows <strong>down</strong>: a parent hands values to its children as props, and a child cannot reach up or sideways. So "where does this state live?" has a mechanical answer. List every component that reads or changes the value, walk up the tree from each one, and stop where the paths meet: that <strong>closest common parent</strong> is the lowest component that can hand the value to all of them.</p>',
      '<ul>'
        + '<li><strong>Lower breaks it:</strong> a component outside the owner\'s subtree cannot read the value.</li>'
        + '<li><strong>Higher works, at a cost:</strong> every component on the extra path passes the prop along, and each change re-renders the owner and what it renders.</li>'
        + '<li><strong>Used by one component?</strong> It stays local, in that component.</li>'
        + '<li><strong>Computable from other state or props?</strong> It is a <a href="#/browser/state-effects/derived-values">derived value</a>, not state: store it nowhere.</li></ul>',
      '<table><caption>A task screen: who uses what, and where it lives</caption><thead>'
        + '<tr><th scope="col">Value</th><th scope="col">Read or changed by</th><th scope="col">Lives in</th></tr></thead><tbody>'
        + '<tr><th scope="row">The text being typed in the new-task form</th><td>TaskForm only</td><td>TaskForm (local)</td></tr>'
        + '<tr><th scope="row">The search filter</th><td>Toolbar (the input) and TaskList</td><td>TaskPage, their closest common parent</td></tr>'
        + '<tr><th scope="row">The list of tasks</th><td>Toolbar (count), TaskList, TaskItem (toggle), TaskForm (add)</td><td>TaskPage</td></tr>'
        + '<tr><th scope="row">The logged-in user</th><td>Avatar in the header, TaskList, LogoutButton</td><td>App, or a context provider near the root</td></tr>'
        + '<tr><th scope="row">How many tasks match the filter</th><td>Toolbar</td><td>Nowhere: derived during render</td></tr></tbody></table>',
      '<p>The rule is the same in any component framework; only the syntax of passing values down changes. In React, the owner declares the state with <code>useState</code> (see <a href="#/browser/state-effects/use-state">useState and what a re-render is</a>), passes it down as props, and passes down the functions that change it (see <a href="#/browser/shared-state/lifting-state">Lifting state up</a>).</p>',
    ],
    diagram: {
      kind: 'tree',
      title: 'The filter lives in TaskPage: the closest parent of both components that use it.',
      desc: 'App renders Layout, which renders Header and TaskPage. TaskPage renders Toolbar, which changes the search filter, and TaskList, which reads it. TaskPage is the closest common parent of the two, so it owns the filter; Header and Layout never see it.',
      nodes: [
        { id: 'app', label: 'App' },
        { id: 'layout', label: 'Layout' },
        { id: 'header', label: 'Header' },
        { id: 'page', label: 'TaskPage', note: 'owns the filter', key: true },
        { id: 'toolbar', label: 'Toolbar', note: 'changes it' },
        { id: 'list', label: 'TaskList', note: 'reads it' },
      ],
      edges: [
        ['app', 'layout'],
        ['layout', 'header'],
        ['layout', 'page'],
        ['page', 'toolbar'],
        ['page', 'list'],
      ],
    },
    widget: 'state-tree',
    example: 'In the state-tree tool, choose "Search filter text", then press **Place here** on Toolbar: TaskList is flagged, because it is outside Toolbar\'s subtree. Remove it and place it on App: it works, but Layout and TaskPage pass a prop they never use. Place it on TaskPage: everyone can reach it and nothing is passed on for nothing. Then try the first challenges.',
    mistake: 'Putting every piece of state at the top "so everything can reach it". It works, but each keystroke in a search box then re-renders the whole app, and every component in between has to pass props it does not care about. Start local, and move state up only when a second component needs it.' },

  { id: 'lifting-state', hub: 'where', topic: 'where',
    title: 'Lifting state up: data down, events up',
    summary: '**Lifting state up** moves a piece of state from a child into a parent so siblings can share it: the parent passes the **value** down, and a **callback** so the children can ask it to change.',
    html: [
      '<p>Two siblings cannot share state directly: a component cannot pass props to its sibling. So the state moves up to their closest common parent, which becomes the owner, and the children become <strong>controlled</strong>: they show what they are given and report what happened. In short: <strong>data down, events up</strong>.</p>',
      '<dl>'
        + '<dt>The value, down</dt><dd>As a prop: <code>filter={filter}</code>. The child never changes it (see <a href="#/browser/components/props-read-only">Props are read-only</a>).</dd>'
        + '<dt>The change, up</dt><dd>A callback prop named <code>on</code> + the event: <code>onFilterChange(text)</code>, <code>onToggle(id)</code>, <code>onAdd(task)</code>. The owner updates its state, and React re-renders it and its children with the new value.</dd>'
        + '<dt>Setter or named function?</dt><dd>Passing the setter (<code>onFilterChange={setFilter}</code>) is fine when the child may set any value; a named function (<code>onToggle={toggleTask}</code>) keeps the rules in the owner.</dd></dl>',
      '<p>The owner can also <strong>derive</strong> for its children: owning both the filter and the list, it computes the visible tasks once and passes the result, so the list just shows what it gets.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The owner passes the value down and a callback for changes; the children never own a copy.',
      desc: 'TaskPage owns the filter. It passes Toolbar the filter value and the onFilterChange callback, and passes TaskList the visible tasks it derived from the filter. When the user types, Toolbar calls onFilterChange and TaskPage updates its state.',
      nodes: [
        { id: 'page', label: 'TaskPage', note: 'owns `filter`', key: true },
        { id: 'toolbar', label: 'Toolbar', note: 'calls `onFilterChange`' },
        { id: 'list', label: 'TaskList', note: 'shows what it gets' },
      ],
      edges: [
        ['page', 'toolbar', 'value + callback'],
        ['page', 'list', 'visible tasks'],
      ],
    },
    code: `function TaskPage() {
  const [filter, setFilter] = useState('');                 // lifted here
  return (
    <>
      <Toolbar filter={filter} onFilterChange={setFilter} />  {/* value + callback */}
      <TaskList filter={filter} />                            {/* value only */}
    </>
  );
}

function Toolbar({ filter, onFilterChange }) {
  return <input value={filter} onChange={(e) => onFilterChange(e.target.value)} />;
}`,
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Lift the filter" in the state-tree tool' },
    live: {
      kind: 'react',
      code: `import { useState } from 'react';

const TASKS = [
  { id: 1, title: 'Write the API skeleton' },
  { id: 2, title: 'Add the log-in form' },
  { id: 3, title: 'Write the README' },
];

function Toolbar({ filter, onFilterChange, shown }) {
  return (
    <label>
      Search{' '}
      <input value={filter} onChange={(e) => onFilterChange(e.target.value)} />
      {' '}{shown} shown
    </label>
  );
}

function TaskList({ tasks }) {
  return <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
}

function TaskPage() {
  const [filter, setFilter] = useState('');     // lifted: both children need it
  const visible = TASKS.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()));
  return (
    <section>
      <Toolbar filter={filter} onFilterChange={setFilter} shown={visible.length} />
      <TaskList tasks={visible} />
    </section>
  );
}

function App() {
  return <TaskPage />;
}`,
    },
    example: 'The box lifts the filter into `TaskPage`. `Toolbar` is a controlled input that reports each keystroke with `onFilterChange`; `TaskPage` derives the visible tasks and passes them to `TaskList`. Type in the Try it box: both children update together, because they read the same state.',
    mistake: 'Lifting the value but not the change: the parent passes `filter` down, but the child keeps calling its own local `setFilter`. The input then shows what was typed while the list filters by the parent\'s old value. When state moves up, the child loses its `useState` and reports changes through the callback.' },

  { id: 'single-source-of-truth', hub: 'where', topic: 'where',
    title: 'A single source of truth',
    summary: 'Each fact the interface shows is stored **once**; every other place receives it (as a prop or from a context) or computes it, because two stored copies of the same fact end up disagreeing.',
    html: [
      '<p>If the header keeps its own "number of tasks" and the list keeps the tasks, adding a task updates the list, and the header now lies. No effect or careful code fixes that for good: <strong>delete the copy</strong> and let the header read from the owner.</p>',
      '<h3>How copies sneak in</h3>',
      '<ul>'
        + '<li><strong>Copying a prop into state:</strong> <code>useState(props.count)</code> reads the prop once and ignores later changes (see <a href="#/browser/state-effects/what-is-state">State, props and derived values</a>).</li>'
        + '<li><strong>Storing what you could compute:</strong> a count, a filtered list, an "is valid" flag (see <a href="#/browser/state-effects/derived-values">Don\'t store what you can compute</a>).</li>'
        + '<li><strong>Two components declaring the "same" state,</strong> because each needed it before anyone lifted it.</li></ul>',
      '<p>The fix is always the same: one owner, everyone else reads. One copy is fine on purpose: a <strong>draft</strong>. An edit form may copy a task\'s title into local state so the user can type without touching the real task until Save. That is a different fact ("what is being typed"), and Save hands it back to the owner. Resetting such a draft: <a href="#/browser/shared-state/state-and-position">State belongs to a place in the tree</a>.</p>',
    ],
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "One source of truth" in the state-tree tool' },
    live: {
      kind: 'react',
      code: `import { useState } from 'react';

function Counter({ initial }) {
  const [count] = useState(initial);    // a second copy of "how many tasks"
  return <p>Header says: {count} tasks</p>;
}

function App() {
  const [tasks, setTasks] = useState(['Buy milk', 'Call Ana']);

  function add() {
    setTasks([...tasks, 'Task ' + (tasks.length + 1)]);
  }

  return (
    <main>
      <Counter initial={tasks.length} />
      <p>List says: {tasks.length} tasks</p>
      <button onClick={add}>Add a task</button>
      <ul>{tasks.map((t) => <li key={t}>{t}</li>)}</ul>
    </main>
  );
}`,
    },
    example: 'The box has the bug on purpose: `Counter` copies `tasks.length` into its own state. Add a task: the list says 3, the header still says 2, because `useState` read its argument only once. Fix it: delete the `useState` line in `Counter` and render `{count}` from a prop, `<Counter count={tasks.length} />`.',
    mistake: 'Keeping the copies and "syncing" them with an effect: `useEffect(() => setCount(tasks.length), [tasks])`. It renders once with the wrong number, then again with the right one, and every new copy needs another effect. If a value can be read from the owner or computed, it is not state.' },

  { id: 'state-and-position', hub: 'where', topic: 'where',
    title: 'State belongs to a place in the tree (and key resets it)',
    summary: 'React keeps a component\'s state as long as the **same component type** stays at the **same position** in the tree: changing its props does not reset it; giving it a different `key` does.',
    html: [
      '<p>React attaches state to a <strong>slot</strong> in the tree ("the <code>EditTask</code> that is the second child of <code>App</code>"), not to your variables or props. Re-render with different props and the slot is the same, so the state survives. Usually that is what you want; it is also why switching from task 1 to task 2 can leave task 1\'s draft in the edit form.</p>',
      '<dl>'
        + '<dt>Same type, same position</dt><dd>The state is kept, whatever the props.</dd>'
        + '<dt>A different <code>key</code></dt><dd>A different component to React: the old instance and its state are thrown away and a fresh one mounts. <code>&lt;EditTask key={task.id} task={task} /&gt;</code> starts a new draft for every task, with no effect.</dd>'
        + '<dt>A different type in the same place</dt><dd><code>{isAdmin ? &lt;AdminPanel /&gt; : &lt;UserPanel /&gt;}</code> resets the state.</dd>'
        + '<dt>A different position</dt><dd>Moving a component, inside a new wrapper <code>&lt;div&gt;</code> for example, loses its state.</dd></dl>',
      '<p>This card is about <strong>resetting</strong> with <code>key</code>; giving list items a stable identity is <a href="#/browser/components/keys">Keys: telling list items apart</a>.</p>',
    ],
    live: {
      kind: 'react',
      code: `import { useState } from 'react';

const TASKS = [
  { id: 1, title: 'Buy milk' },
  { id: 2, title: 'Call Ana' },
];

function EditTask({ task }) {
  const [draft, setDraft] = useState(task.title);   // a deliberate copy: the edit in progress
  return (
    <p>
      Editing #{task.id}:{' '}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Title" />
    </p>
  );
}

function App() {
  const [selectedId, setSelectedId] = useState(1);
  const [withKey, setWithKey] = useState(false);
  const task = TASKS.find((t) => t.id === selectedId);

  return (
    <main>
      {TASKS.map((t) => (
        <button key={t.id} onClick={() => setSelectedId(t.id)}>{t.title}</button>
      ))}
      <label>
        <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} />
        {' use key={task.id}'}
      </label>
      {withKey ? <EditTask key={task.id} task={task} /> : <EditTask task={task} />}
    </main>
  );
}`,
    },
    example: 'The box edits the selected task in a form that keeps a draft. Type something, then pick the other task: without a key the old draft stays. Tick the `key` checkbox and repeat: each task gets a fresh form.',
    mistake: 'Resetting the form with an effect: `useEffect(() => setDraft(task.title), [task.id])`. The first render after the switch still shows the old draft, then a second render fixes it, and every new field needs another line. `key={task.id}` resets all of the form\'s state at once, before anything is shown.' },

  /* ---- 2. Prop drilling and composition ------------------------------------------------------------ */
  { id: 'prop-drilling', hub: 'drilling', topic: 'drilling',
    title: 'Prop drilling, and when it actually hurts',
    summary: '**Prop drilling** is passing a prop through components that do not use it, only so it reaches one further down: a level or two is normal and clear; it hurts when many layers forward many props.',
    html: [
      '<p>The user lives in <code>App</code>, and the <code>Avatar</code> in the header needs it. With props, <code>Layout</code> and <code>Header</code> must each accept <code>user</code> and pass it on, though neither shows it: that forwarding is drilling. It is not a bug. The data flow stays explicit and easy to trace with "find usages", which is why props are the right default for one or two levels.</p>',
      '<h3>When it starts to hurt</h3>',
      '<ul>'
        + '<li><strong>A long chain:</strong> four or five components.</li>'
        + '<li><strong>Several values travelling together:</strong> <code>user</code>, <code>onLogout</code>, <code>theme</code>, <code>onToggleTheme</code>…</li>'
        + '<li><strong>Generic middle components:</strong> a <code>Layout</code> or <code>Card</code> reused elsewhere, which should not know about users.</li>'
        + '<li><strong>Every data change edits every signature</strong> on the way. Each of these costs reading and changing time, not speed.</li></ul>',
      '<table><caption>Drilling: fine or painful?</caption><thead>'
        + '<tr><th scope="col">Situation</th><th scope="col">Verdict</th></tr></thead><tbody>'
        + '<tr><th scope="row">A parent passes <code>task</code> and <code>onToggle</code> to its child</th><td>Not drilling: the child uses them</td></tr>'
        + '<tr><th scope="row">One middle component forwards one prop</th><td>Fine: explicit and easy to follow</td></tr>'
        + '<tr><th scope="row">A generic <code>Layout</code> forwards <code>user</code> to the header and the page</th><td>A smell: try composition</td></tr>'
        + '<tr><th scope="row">The theme or the user is read in a dozen places</th><td>A good case for context</td></tr></tbody></table>',
      '<p>Fix it in this order: first <strong>composition</strong>, letting the owner build the deep component and hand it in (see <a href="#/browser/shared-state/composition-children">Composition: pass components, not data</a>); only when the value is needed in many unrelated places, a <strong>context</strong> (see <a href="#/browser/shared-state/what-is-context">Context: a value for a whole subtree</a>).</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Two components carry a value they never use, only to reach the one that does.',
      desc: 'App owns the user. It passes the user to Layout, which passes it to Header, which passes it to Avatar. Only Avatar uses it; Layout and Header just pass it on.',
      nodes: [
        { id: 'app', label: 'App', note: 'owns `user`' },
        { id: 'layout', label: 'Layout', note: 'only passes it on' },
        { id: 'header', label: 'Header', note: 'only passes it on' },
        { id: 'avatar', label: 'Avatar', note: 'uses it', key: true },
      ],
      edges: [
        ['app', 'layout', '`user`'],
        ['layout', 'header', '`user`'],
        ['header', 'avatar', '`user`'],
      ],
    },
    code: `function App() {
  const [user, setUser] = useState({ name: 'Ana' });
  return <Layout user={user} onLogout={() => setUser(null)} />;
}
function Layout({ user, onLogout }) {        // uses neither
  return <><Header user={user} onLogout={onLogout} /><TaskPage user={user} /></>;
}
function Header({ user, onLogout }) {        // uses neither
  return <header><Avatar user={user} /><LogoutButton onLogout={onLogout} /></header>;
}
function TaskPage({ user }) {                // uses it only to pass it on
  return <TaskList user={user} />;
}`,
    practice: SHARED_TREE_LINK,
    example: 'In the state-tree tool, choose "The logged-in user" and place it on **App** with Props: the tree marks Layout, Header and TaskPage as "only passes on". That is the challenge "Spot the drilling".',
    mistake: 'Reaching for context (or a store library) the first time a prop goes through one extra component. Context hides where a value comes from, makes components depend on a provider being present, and can re-render more than you expect. One or two levels of explicit props are easier to read and to test.' },

  { id: 'composition-children', hub: 'drilling', topic: 'drilling',
    title: 'Composition: pass components, not data',
    summary: 'Instead of passing data through a layout so it can build its content, let the owner of the data **build the content itself** and pass the finished elements in as `children` (or other props): the layout no longer needs to know about the data.',
    html: [
      '<p>A prop is passed by the component that <strong>writes the JSX tag</strong>, not by the one that ends up displaying it. If <code>App</code> writes <code>&lt;Layout&gt;&lt;TaskPage user={user} /&gt;&lt;/Layout&gt;</code>, then <code>App</code> gives <code>user</code> to <code>TaskPage</code> directly, and <code>Layout</code> receives a finished element in <code>children</code> and places it. <code>Layout</code> is still the parent on the page, but it is no longer on the data\'s path. How <code>children</code> works: <a href="#/browser/components/children">children: components that wrap other content</a>.</p>',
      '<dl>'
        + '<dt><code>children</code></dt><dd>One area: the content between the tags.</dd>'
        + '<dt>Slots</dt><dd>Several areas, as props that hold elements: <code>&lt;Layout header={&lt;Header user={user} /&gt;} sidebar={&lt;Nav /&gt;}&gt;</code>. <code>Layout</code>, <code>Card</code>, <code>Modal</code> or <code>Page</code> become shells that never change when the data does.</dd></dl>',
      '<p>A bonus: when the layout re-renders for its own reasons (opening a menu, say), the elements in <code>children</code> were created by the parent and are the same objects as before, so React skips them. In the state-tree tool, the "Composition" option shows exactly this: Header, Sidebar and TaskPage are then <strong>created by App, shown inside Layout</strong>.</p>',
    ],
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Composition before context" in the state-tree tool' },
    live: {
      kind: 'react',
      code: `import { useState } from 'react';

function Layout({ header, children }) {        // knows nothing about users
  return (
    <div className="layout">
      <header>{header}</header>
      <main>{children}</main>
    </div>
  );
}

function Avatar({ user }) {
  return <strong>{user.name}</strong>;
}

function TaskPage({ user }) {
  return <p>{user.name}'s tasks go here.</p>;
}

function App() {
  const [user, setUser] = useState({ name: 'Ana' });
  const other = user.name === 'Ana' ? 'Leo' : 'Ana';
  const header = (
    <>
      <Avatar user={user} />{' '}
      <button onClick={() => setUser({ name: other })}>Switch to {other}</button>
    </>
  );
  return (
    <Layout header={header}>
      <TaskPage user={user} />
    </Layout>
  );
}`,
      css: `.layout header { padding: 6px 10px; background: #e8eefc; }
.layout main { padding: 6px 10px; border: 1px solid #ccd; }`,
    },
    example: 'In the Try it box, `Layout` takes a `header` slot and `children`; it never sees `user`. `App` owns the user and passes it straight to `Avatar` and `TaskPage`. Switch the user: both update, and `Layout`\'s code did not have to change.',
    mistake: 'Thinking composition means "the Layout must render TaskPage itself". As soon as `Layout` writes `<TaskPage />` in its own JSX, it is the one that must provide TaskPage\'s props, and drilling is back. Let the owner of the data write the tag and hand the element over.' },

  /* ---- 3. Context ---------------------------------------------------------------------------------- */
  { id: 'what-is-context', hub: 'context', topic: 'context',
    title: 'Context: a value for a whole subtree',
    summary: 'A **context** lets a component provide a value to **every component below it**, at any depth, without passing props: `createContext(default)` makes one, a provider sets the value for its subtree, and `useContext` reads it.',
    html: [
      '<p>A context is a <strong>channel</strong> from a provider to the components under it; the components in between carry nothing. It stores nothing and changes nothing by itself: the value usually comes from the state of the component that renders the provider (see <a href="#/browser/shared-state/provider-component">A provider component that owns the state</a>).</p>',
      '<dl>'
        + '<dt><code>createContext(\'light\')</code></dt><dd>Creates the channel. Its argument is the <strong>default</strong>, used only by a component with <strong>no provider above it</strong>. Create each context once, at the top level of a module (often its own file), and export it.</dd>'
        + '<dt><code>&lt;ThemeContext value="dark"&gt;</code></dt><dd>The provider. In React 19 the context object is itself the provider; React 18 code writes <code>&lt;ThemeContext.Provider value="dark"&gt;</code>, which React 19 still accepts.</dd>'
        + '<dt><code>useContext(ThemeContext)</code></dt><dd>Reads the value of the <strong>nearest</strong> provider above the calling component.</dd></dl>',
      '<p>"Above" means on the page, in the render tree: a component passed as <code>children</code> into a provider is inside it, wherever its JSX was written. Providers can be nested; an inner provider overrides the outer one for its subtree only.</p>',
    ],
    diagram: {
      kind: 'tree',
      title: 'Each reader gets the value of the nearest provider above it, or the default.',
      desc: 'App renders three panels. The first is outside any provider and gets the default, light. The second is inside a provider with the value dark and reads dark. The third is inside a nested provider with the value light, the nearest one, and reads light.',
      nodes: [
        { id: 'app', label: 'App' },
        { id: 'out', label: 'Panel', note: 'gets the default' },
        { id: 'dark', label: '`<ThemeContext>`', note: '`value="dark"`' },
        { id: 'p2', label: 'Panel', note: 'reads "dark"' },
        { id: 'light', label: '`<ThemeContext>`', note: '`value="light"`', key: true },
        { id: 'p3', label: 'Panel', note: 'reads "light"' },
      ],
      edges: [
        ['app', 'out'],
        ['app', 'dark'],
        ['dark', 'p2'],
        ['dark', 'light'],
        ['light', 'p3'],
      ],
    },
    live: {
      kind: 'react',
      code: `import { createContext, useContext } from 'react';

const ThemeContext = createContext('light');    // 'light' is the default: no provider above

function Badge() {
  const theme = useContext(ThemeContext);       // the nearest provider above wins
  return <span className={'badge ' + theme}>{theme}</span>;
}

function Panel({ title }) {                     // no theme prop anywhere
  return <p>{title}: <Badge /></p>;
}

function App() {
  return (
    <>
      <Panel title="Outside any provider" />
      <ThemeContext value="dark">
        <Panel title="Inside a dark provider" />
        <ThemeContext value="light">
          <Panel title="Inside a nested light provider" />
        </ThemeContext>
      </ThemeContext>
    </>
  );
}`,
      css: `.badge { padding: 2px 8px; border-radius: 10px; border: 1px solid #888; }
.badge.dark { background: #222; color: #eee; }
.badge.light { background: #fff; color: #111; }`,
    },
    example: 'The box has one context and three panels. The first is outside any provider and gets the default; the second is inside a "dark" provider; the third is inside a nested "light" provider, the nearest one. No component receives a theme prop.',
    mistake: 'Expecting the default value of `createContext` to be shared state. It is only what a component sees when there is **no provider above it**, usually because the provider was forgotten or placed too low. Many teams use `createContext(null)` and a hook that throws, so a missing provider fails loudly instead of quietly using a default (see [A custom hook for the context](#/browser/shared-state/use-context-hook)).' },

  { id: 'provider-component', hub: 'context', topic: 'context',
    title: 'A provider component that owns the state',
    summary: 'The usual pattern: one component, for example `ThemeProvider`, declares the state, renders the context provider with the state **and the functions that change it** as its value, and renders `{children}` inside it.',
    html: [
      '<p>A context only carries values. To share <strong>state</strong>, something must own it, and the cleanest owner is a small component with that single job: <code>ThemeProvider</code> holds the theme in <code>useState</code> and renders the provider around <code>{children}</code>, with the theme and <code>toggleTheme</code> as its value. Any component inside can read the theme and call <code>toggleTheme</code>, and the change still goes through the owner.</p>',
      '<ul>'
        + '<li><strong>Expose intentions, not raw setters,</strong> when there are rules: <code>toggleTheme()</code>, <code>logIn(email, password)</code>, <code>logOut()</code>. The provider is then the one place that knows how the state changes, and later how it is saved or sent to a server.</li>'
        + '<li><strong>Wrap once, near the root:</strong> <code>&lt;ThemeProvider&gt;&lt;App /&gt;&lt;/ThemeProvider&gt;</code>, usually in <code>main.jsx</code>.</li>'
        + '<li><strong><code>{children}</code> keeps it cheap:</strong> <code>App</code> was created outside the provider, so a state change re-renders only the components that read the context (see <a href="#/browser/shared-state/context-rerenders">What re-renders when a context value changes</a>).</li></ul>',
    ],
    diagram: {
      kind: 'layers',
      title: 'One component owns the state; the context carries it to every reader below.',
      desc: 'Four layers from top to bottom. ThemeProvider owns the theme in state. It renders the ThemeContext provider, whose value carries the theme and toggleTheme. Inside it is App, passed as children, which passes nothing on. At the bottom, any component that calls useContext(ThemeContext) reads the theme and can change it.',
      nodes: [
        { id: 'owner', label: '`ThemeProvider`', note: 'owns `theme` in state', key: true },
        { id: 'ctx', label: '`<ThemeContext value>`', note: 'carries theme and toggleTheme' },
        { id: 'app', label: '`App`, as children', note: 'passes nothing on' },
        { id: 'readers', label: 'Readers', note: '`useContext(ThemeContext)`' },
      ],
      edges: [],
    },
    code: `// ThemeContext.jsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>;
}

// main.jsx
createRoot(document.getElementById('root')).render(
  <ThemeProvider><App /></ThemeProvider>
);`,
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Move the theme into a context"' },
    live: {
      kind: 'react',
      code: `import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return <button onClick={toggleTheme}>Switch to {theme === 'light' ? 'dark' : 'light'}</button>;
}

function Sidebar() {                     // passes nothing on
  return <aside><ThemeToggle /></aside>;
}

function Page() {
  const { theme } = useContext(ThemeContext);
  return (
    <div className={'page ' + theme}>
      <h2>Tasks</h2>
      <Sidebar />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  );
}`,
      css: `.page { padding: 8px 12px; }
.page.dark { background: #1d1f33; color: #eee; }
.page.light { background: #fff; color: #111; }`,
    },
    example: 'In the Try it box, `ThemeToggle` sits inside `Sidebar`, which passes nothing on, yet it reads and changes the theme owned by `ThemeProvider`. `Page` reads the same value to choose its colours.',
    mistake: 'Calling `useContext(ThemeContext)` in the same component that renders the provider and expecting the new value. `useContext` looks **above** the calling component, so the provider\'s own component never sees its own provider: it already has the state in a variable; use that.' },

  { id: 'use-context-hook', hub: 'context', topic: 'context',
    title: 'A custom hook for the context: useAuth()',
    summary: 'Wrap `useContext` in a custom hook such as `useAuth()` that **throws a clear error** when there is no provider: components import the hook, not the context object.',
    html: [
      '<p>With <code>createContext(null)</code>, a component outside the provider gets <code>null</code>, and the crash shows up somewhere else: "Cannot destructure property \'user\' of null", three files away. A hook that checks once turns it into a message that names the problem: "useAuth must be used inside &lt;AuthProvider&gt;". It is a <a href="#/browser/state-effects/custom-hooks">custom hook</a>, so its name starts with <code>use</code> and it follows the rules of hooks.</p>',
      '<ul>'
        + '<li><strong>An interface, not only a check:</strong> export <code>AuthProvider</code> and <code>useAuth</code> and keep the context object private. Readers cannot depend on how the value is built, so you can later split the context, add memoisation or move to a library without touching a single component.</li>'
        + '<li><strong>One file per context:</strong> <code>auth/AuthContext.jsx</code> with the context (not exported), <code>AuthProvider</code> and <code>useAuth</code>. Vite\'s Fast Refresh prefers files that export only components; if the linter complains, move the hook to <code>auth/useAuth.js</code>.</li></ul>',
    ],
    code: `const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}`,
    live: {
      kind: 'react',
      code: `import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const logIn = (name) => setUser({ name });
  const logOut = () => setUser(null);
  return <AuthContext value={{ user, logIn, logOut }}>{children}</AuthContext>;
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function Greeting() {
  const { user, logIn, logOut } = useAuth();
  if (!user) return <button onClick={() => logIn('Ana')}>Log in as Ana</button>;
  return <p>Hello, {user.name} <button onClick={logOut}>Log out</button></p>;
}

// Try: render <Greeting /> outside <AuthProvider> and read the error.
function App() {
  return (
    <AuthProvider>
      <Greeting />
    </AuthProvider>
  );
}`,
    },
    example: 'The box works as written. Then move `<Greeting />` out of `<AuthProvider>` (put it after the closing tag, inside a fragment `<>…</>`): the preview shows the hook\'s error message instead of a confusing crash.',
    mistake: 'Exporting the context object and calling `useContext(AuthContext)` in every component. It works until the first component outside the provider (a test, a storybook page, a new route) receives `null`. A hook gives one place for the check and one name to search for.' },

  { id: 'memo-hooks', hub: 'context', topic: 'context',
    title: 'Memoising: useMemo, useCallback and memo',
    summary: '**Memoising** keeps a result from the last render while its inputs are unchanged: `useMemo` keeps a computed value, `useCallback` keeps a function, and `memo` lets a component skip a re-render when its props are equal.',
    html: [
      '<p>Every render runs the component function again: it recomputes values and creates <strong>new</strong> objects and functions, and a parent\'s re-render re-renders its children. That is usually cheap and fine. Memoising helps in two cases only: a computation that is really slow, and a value whose <strong>identity</strong> someone else compares (a child wrapped in <code>memo</code>, a dependency array, a context value).</p>',
      '<table><caption>Three tools</caption><thead>'
        + '<tr><th scope="col">You write</th><th scope="col">It keeps</th><th scope="col">Until</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>useMemo(() =&gt; compute(a, b), [a, b])</code></th><td>The value the function returned</td><td><code>a</code> or <code>b</code> changes</td></tr>'
        + '<tr><th scope="row"><code>useCallback(fn, [a])</code></th><td>The function itself: the same object</td><td><code>a</code> changes</td></tr>'
        + '<tr><th scope="row"><code>memo(TaskList)</code></th><td>The component\'s last output</td><td>A prop changes (compared one by one with <code>Object.is</code>)</td></tr></tbody></table>',
      '<ul>'
        + '<li><strong>They work together:</strong> <code>memo</code> compares props by identity, so a child wrapped in <code>memo</code> still re-renders when the parent passes a new function or object every time. <code>useCallback</code> and <code>useMemo</code> keep those props the same.</li>'
        + '<li><strong>Never for correctness:</strong> the code must work without them; React may throw a memoised value away.</li>'
        + '<li><strong>Premature by default:</strong> add them when a render is measurably slow (the React DevTools Profiler shows it) or when identity matters, not around every function.</li></ul>',
      '<p>The case this section meets most is a context value: see <a href="#/browser/shared-state/context-rerenders">What re-renders when a context value changes</a>.</p>',
    ],
    live: {
      kind: 'react',
      code: `import { memo, useCallback, useState } from 'react';

let renders = 0;
const TaskList = memo(function TaskList({ onSelect }) {
  renders += 1;                              // counts the times React really ran it
  return (
    <>
      <p>TaskList rendered {renders} times</p>
      <ul>
        {['Buy milk', 'Call Ana'].map((t) => (
          <li key={t}><button onClick={() => onSelect(t)}>{t}</button></li>
        ))}
      </ul>
    </>
  );
});

function App() {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState('none');
  const [stable, setStable] = useState(false);

  const fresh = (t) => setSelected(t);                     // a new function every render
  const kept = useCallback((t) => setSelected(t), []);     // the same function every render
  const onSelect = stable ? kept : fresh;

  return (
    <main>
      <label>
        <input type="checkbox" checked={stable} onChange={(e) => setStable(e.target.checked)} />
        {' '}Stable callback (useCallback)
      </label>
      <p><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here" aria-label="Note" /></p>
      <p>Selected: {selected}</p>
      <TaskList onSelect={onSelect} />
    </main>
  );
}`,
    },
    example: 'In the Try it box, `TaskList` is wrapped in `memo` and shows how many times it rendered. Type in the field: `App` re-renders on every key, `onSelect` is a new function each time, and the count climbs. Tick **Stable callback** and type again: `useCallback` keeps the same function, the props are equal, and `memo` skips the list.',
    mistake: 'Wrapping every function in `useCallback` and every value in `useMemo` "for performance". Each one costs memory and a dependency array to keep right, and saves nothing unless something compares the identity. A wrong dependency array is worse than none: it keeps a stale value.' },

  { id: 'context-rerenders', hub: 'context', topic: 'context',
    title: 'What re-renders when a context value changes',
    summary: 'When the provider\'s `value` changes (compared with `Object.is`), **every component that reads that context re-renders**, even inside `memo`; a new object literal on every render counts as a change, so memoise the value with `useMemo`.',
    html: [
      '<p>React compares the provider\'s new <code>value</code> with the previous one by identity. If it differs, every consumer below re-renders, even one wrapped in <code>memo</code>: reading a context works like an extra, invisible prop. Components that do not read the context are not affected by it, although they may still re-render because their parent did.</p>',
      '<p>The trap: <code>value={{ user, logIn, logOut }}</code> builds a <strong>new object every time the provider renders</strong>, so every consumer re-renders whenever the provider does, although nothing they read changed. <code>useMemo</code> keeps the same object until <code>user</code> changes, and <code>useCallback</code> keeps the functions inside it stable (see <a href="#/browser/shared-state/memo-hooks">Memoising</a>).</p>',
      '<h3>Three habits keep context cheap</h3>',
      '<ul>'
        + '<li><strong>Wrap with <code>{children}</code>:</strong> <code>&lt;AuthProvider&gt;{children}&lt;/AuthProvider&gt;</code>, so a state change re-renders only the consumers.</li>'
        + '<li><strong>Split by speed of change:</strong> <code>AuthContext</code> and <code>ThemeContext</code>, not one <code>AppContext</code>.</li>'
        + '<li><strong>Keep fast data out:</strong> never put the mouse position, or every keystroke of a big form, in a context read by many components.</li></ul>',
    ],
    code: `function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const logIn = useCallback((u) => setUser(u), []);
  const logOut = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ user, logIn, logOut }), [user, logIn, logOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}`,
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Predict the re-renders on log-out in the state-tree tool' },
    live: {
      kind: 'react',
      code: `import { createContext, useContext, useMemo, useState, memo } from 'react';

const AuthContext = createContext(null);

const UserBadge = memo(function UserBadge() {
  const { user } = useContext(AuthContext);
  console.log('UserBadge rendered');
  return <p>Signed in as {user.name}</p>;
});

function App() {
  const [clicks, setClicks] = useState(0);
  const [user, setUser] = useState({ name: 'Ana' });
  const [stable, setStable] = useState(false);

  const fresh = { user, setUser };                               // a new object every render
  const memoised = useMemo(() => ({ user, setUser }), [user]);   // same object until user changes
  const value = stable ? memoised : fresh;

  return (
    <AuthContext value={value}>
      <label>
        <input type="checkbox" checked={stable} onChange={(e) => setStable(e.target.checked)} />
        {' '}Memoise the value (useMemo)
      </label>
      <p><button onClick={() => setClicks((c) => c + 1)}>Unrelated click: {clicks}</button></p>
      <UserBadge />
    </AuthContext>
  );
}`,
    },
    example: 'In the Try it box, `UserBadge` is wrapped in `memo` and reads the context. Press **Unrelated click** and watch the console: `App` re-renders, the value object is new, and the badge re-renders although the user did not change. Tick "Memoise the value" and click again: the badge stays quiet.',
    mistake: 'Putting everything into one big `AppContext` "to keep it simple". Every consumer then re-renders whenever any part changes: typing in a search field stored there re-renders the header, the sidebar and every list item. Separate contexts for separate concerns, and local state for anything only one area uses.' },

  /* ---- 4. An authentication context ---------------------------------------------------------------- */
  { id: 'auth-context', hub: 'auth', topic: 'auth',
    title: 'An authentication context: user, token, log-in, log-out',
    summary: 'An `AuthProvider` owns who is logged in: the **user** and the **token** in state, an async `logIn(email, password)` that calls the API and stores both, and `logOut()` that forgets them; components read it all with `useAuth()`.',
    html: [
      '<p>Being logged in is app-wide, changes rarely and is needed by components far apart (the header shows the name, pages decide what to show, the API client needs the token): the textbook case for a context. The provider is the single source of truth for the session, and nothing else stores a copy of the token.</p>',
      '<dl>'
        + '<dt>State</dt><dd>The <code>token</code> and the public <code>user</code> fields. Never the password.</dd>'
        + '<dt><code>logIn(email, password)</code></dt><dd>Posts the credentials (see <a href="#/browser/data-fetching/login-request">Logging in from the front end</a>) and stores the token and the user. On failure it <strong>throws</strong>, so the form that called it shows the message; the provider knows nothing about forms. Reading the form: <a href="#/browser/components/uncontrolled-inputs">Uncontrolled inputs: defaultValue and FormData</a>.</dd>'
        + '<dt><code>logOut()</code></dt><dd>Clears both, and later the saved copy in storage.</dd>'
        + '<dt>Derived values</dt><dd><code>isLoggedIn = token !== null</code>, <code>isAdmin = user?.role === \'admin\'</code>: computed, not stored.</dd></dl>',
      '<p><strong>The server still decides.</strong> Hiding the "Delete user" button from non-admins is a convenience, not security: anyone can send the request by hand, so the API checks the token and the role on every request (see <a href="#/server/auth/authn-vs-authz">Authentication vs authorisation</a>).</p>',
    ],
    live: {
      kind: 'react',
      api: true,
      code: `import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  async function logIn(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);   // the form shows it
    setToken(data.token);
    setUser(data.user);
  }
  const logOut = () => { setToken(null); setUser(null); };

  return <AuthContext value={{ user, token, logIn, logOut }}>{children}</AuthContext>;
}
const useAuth = () => useContext(AuthContext);

function LoginForm() {
  const { logIn } = useAuth();
  const [error, setError] = useState('');
  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try { await logIn(form.get('email'), form.get('password')); } catch (err) { setError(err.message); }
  }
  return (
    <form onSubmit={handleSubmit}>
      <input name="email" defaultValue="ana@example.com" aria-label="Email" />
      <input name="password" type="password" placeholder="password123" aria-label="Password" />
      <button>Log in</button> {error && <span role="alert">{error}</span>}
    </form>
  );
}

function Header() {
  const { user, token, logOut } = useAuth();
  if (!user) return <LoginForm />;
  return <p>{user.name} ({user.role}) · token <code>{token}</code> <button onClick={logOut}>Log out</button></p>;
}

function App() {
  return <AuthProvider><Header /></AuthProvider>;
}`,
    },
    example: 'The box logs in against the mock API. Use `ana@example.com` (an admin) or `leo@example.com` (a student) with the password `password123`; try a wrong password to see the error come back from `logIn` to the form.',
    mistake: 'Storing the password, or the whole log-in response "just in case", in the context. Once logged in, the front end needs the token and the public user fields only. A password kept in memory can leak through logs, error reports or dev tools; drop it as soon as the request has been sent.' },

  { id: 'persist-session', hub: 'auth', topic: 'auth',
    title: 'Staying logged in after a reload',
    summary: 'State lives in memory, so a reload logs the user out: to keep the session, the provider **restores** the token (and the user) from `localStorage` once, when it is created, and **saves** them whenever they change.',
    html: [
      '<p>A page reload starts the JavaScript from scratch: every <code>useState</code> goes back to its initial value. So restoring is part of <strong>creating</strong> the state, and saving is synchronising with an external system.</p>',
      '<dl>'
        + '<dt>Restore: a lazy initialiser</dt><dd><code>useState(() =&gt; readSaved())</code> runs once, before the first render, so the app never flashes a logged-out screen. The same idea as a reusable hook: <a href="#/browser/state-effects/use-local-storage">A custom hook for persistence: useLocalStorage</a>.</dd>'
        + '<dt>Save: an effect</dt><dd>On every change of the session: write it when it is set, remove it when it is <code>null</code>.</dd>'
        + '<dt>One key, JSON and <code>try</code>/<code>catch</code></dt><dd>Storage holds only strings and can be blocked, full or hold garbage, and the app must still start (logged out). One key, <code>session</code>, for the token and the user, so they cannot drift apart.</dd></dl>',
      '<p>A restored token may be <strong>stale</strong>: it expired while the tab was closed, or the server changed its secret. Either let the first API call find out, so a <code>401</code> with a token logs out in one place (see <a href="#/browser/shared-state/token-and-api-client">Sharing the token with the API client</a>), or ask the server at start-up ("who am I", such as <code>GET /api/auth/me</code> on servers that have one) and keep a third status, <strong>checking</strong>, so protected screens wait instead of redirecting to the log-in page and back.</p>',
    ],
    code: `function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {         // restore once
    try { return JSON.parse(localStorage.getItem('session')) ?? null; }
    catch { return null; }
  });

  useEffect(() => {                                       // save on every change
    try {
      if (session) localStorage.setItem('session', JSON.stringify(session));
      else localStorage.removeItem('session');
    } catch { /* storage blocked: the session lasts until reload */ }
  }, [session]);
  // logIn: setSession({ token: data.token, user: data.user }) · logOut: setSession(null)
  …
}`,
    live: {
      kind: 'react',
      code: `import { createContext, useContext, useEffect, useState } from 'react';

// The preview blocks localStorage, so this falls back to memory. Your app uses localStorage.
const memory = {};
const storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return memory[k] ?? null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { memory[k] = v; } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { delete memory[k]; } },
};

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {          // restore once, on load
    const saved = storage.get('session');
    console.log(saved ? 'restored the saved session' : 'no saved session');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (session) storage.set('session', JSON.stringify(session));
    else storage.remove('session');
  }, [session]);
  const logIn = () => setSession({ token: 'student-token', user: { name: 'Leo' } });
  const logOut = () => setSession(null);
  return <AuthContext value={{ user: session?.user ?? null, logIn, logOut }}>{children}</AuthContext>;
}

function Status() {
  const { user, logIn, logOut } = useContext(AuthContext);
  if (!user) return <p>Logged out <button onClick={logIn}>Log in as Leo</button></p>;
  return <p>Logged in as {user.name} <button onClick={logOut}>Log out</button></p>;
}

function App() {
  const [boot, setBoot] = useState(0);    // a new key = a fresh provider, like a page reload
  return (
    <>
      <button onClick={() => setBoot((b) => b + 1)}>Simulate a reload</button>
      <AuthProvider key={boot}><Status /></AuthProvider>
    </>
  );
}`,
    },
    example: 'The preview frame blocks `localStorage`, so the box falls back to a variable in memory (your app uses the real storage). Log in, then press **Simulate a reload**: the provider is created again (a new `key`), its initialiser finds the saved session and you stay logged in. Log out and reload: the session is gone.',
    mistake: 'Restoring in an effect: `useEffect(() => setToken(localStorage.getItem(\'token\')), [])`. The first render runs with `token = null`, so a protected page redirects to the log-in page before the effect restores the token, and the user lands on the log-in screen although they are logged in. Read storage in the lazy initialiser, before the first render.' },

  { id: 'token-storage', hub: 'auth', topic: 'auth',
    title: 'Where to keep the token: the security trade-off',
    summary: 'A token in **memory** is lost on reload; in **localStorage** it survives but any script on the page can read it; in an **httpOnly cookie** set by the server JavaScript cannot read it at all, but cookies bring their own rules (CSRF, CORS credentials).',
    html: [
      '<p>A bearer token is as good as the password until it expires: whoever holds it is you. The real threat to it in the browser is <strong>XSS</strong> (cross-site scripting): a script that is not yours running in your page, through an injection bug or a compromised npm package. That script can read <code>localStorage</code> and send the token anywhere; it cannot read an <strong>httpOnly</strong> cookie, which the browser never exposes to JavaScript (see <a href="#/server/auth/cookie-flags">Cookie flags</a>).</p>',
      '<table><caption>Three places for the session</caption><thead>'
        + '<tr><th scope="col">Where</th><th scope="col">Survives a reload</th><th scope="col">Readable by any script on the page</th><th scope="col">Sent automatically</th><th scope="col">Watch out for</th></tr></thead><tbody>'
        + '<tr><th scope="row">Memory (state, context)</th><td>No</td><td>Only while the page is open</td><td>No</td><td>Users logged out on every reload</td></tr>'
        + '<tr><th scope="row"><code>localStorage</code></th><td>Yes</td><td>Yes</td><td>No (you add the header)</td><td>XSS steals it</td></tr>'
        + '<tr><th scope="row">httpOnly cookie</th><td>Yes</td><td>No</td><td>Yes, by the browser</td><td>CSRF, CORS credentials</td></tr></tbody></table>',
      '<h3>Cookies have their own rules</h3>',
      '<ul>'
        + '<li><strong>CSRF:</strong> the browser attaches cookies automatically, so another site can make it send a request with them; <code>SameSite=Lax</code> or <code>Strict</code> and checking the <code>Origin</code> header defend against it.</li>'
        + '<li><strong>CORS credentials:</strong> a front end on another origin needs <code>credentials: \'include\'</code> and a server that allows credentials (see <a href="#/server/auth/cors-credentials">CORS with credentials</a>).</li>'
        + '<li><strong>XSS can still use the cookie</strong> by sending requests from the open page; it just cannot steal it for later.</li></ul>',
      '<p><strong>A reasonable path:</strong> start with the token in context plus <code>localStorage</code>, keep tokens short-lived, never render user input as HTML (React escapes text by default; avoid <code>dangerouslySetInnerHTML</code>), and keep dependencies few and updated. When the stakes rise, move to an httpOnly, <code>Secure</code>, <code>SameSite</code> cookie session. The server side of the same choice: <a href="#/server/auth/sessions-vs-tokens">Sessions vs tokens</a> and <a href="#/server/auth/token-transport">How the token travels</a>.</p>',
    ],
    example: 'With a token in `localStorage`, open the browser\'s dev tools on your own app, Application tab, Local Storage: the token is right there in plain text, for you and for any script running in the page. With an httpOnly cookie, the Cookies panel shows it, but `document.cookie` in the console does not include it.',
    mistake: 'Believing that `localStorage` is "encrypted" or private to your code, or that `sessionStorage` is safer against XSS. Both are readable by any script running on the page; `sessionStorage` only differs in lasting until the tab closes. The protection against token theft is preventing XSS, and httpOnly cookies when that is not enough.' },

  { id: 'token-and-api-client', hub: 'auth', topic: 'auth',
    title: 'Sharing the token with the API client',
    summary: 'The **API client** needs the current token, and a refused token must log the user out: let the auth provider build the client with the token and its own `logOut` as the `onUnauthorized` handler, and expose it through the context.',
    html: [
      '<p>The API client is plain JavaScript; the token is React state. The client must never keep its own copy: log out, and it would keep sending the old token. So the provider builds the client with the <strong>current</strong> token and gives it the provider\'s own <code>logOut</code> for refused tokens.</p>',
      '<dl>'
        + '<dt>Built in the provider</dt><dd><code>useMemo(() =&gt; createClient({ token, onUnauthorized: logOut }), [token])</code>, exposed in the context: when the token changes, components get a client with the new one.</dd>'
        + '<dt>A module-level client</dt><dd>With a <code>getToken()</code> callback the provider registers once: suits code outside React, such as a router loader.</dd></dl>',
      '<p>Which responses mean "session expired" (a <code>401</code> <strong>with</strong> a token, never a <code>403</code>) is the rule of <a href="#/browser/data-fetching/handle-401">Handling 401</a>; this card wires it to the provider. With a router, logging out falls back to the log-in page (see <a href="#/browser/routing/protected-routes">Protected routes</a>). Components ask the context for the client (<code>const { api } = useAuth()</code>) and never build headers themselves, so every request carries the same, current token.</p>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'Every request gets the current token, and a refused token logs out in one place.',
      desc: 'AuthProvider owns the token and creates the API client with it. The client sends each request with the token in the Authorization header. When the API refuses the token with 401, the client calls onUnauthorized, which is the provider\'s logOut. logOut sets the token to null in the provider, which creates a new client without it.',
      nodes: [
        { id: 'provider', label: 'AuthProvider', note: 'owns the token', key: true },
        { id: 'client', label: 'API client', note: 'adds `Authorization`' },
        { id: 'api', label: 'The API', note: 'refuses the token' },
        { id: 'logout', label: '`logOut()`', note: 'via `onUnauthorized`' },
      ],
      edges: [
        ['provider', 'client', 'creates'],
        ['client', 'api', 'with the token'],
        ['api', 'logout', '401'],
        ['logout', 'provider', 'token = null'],
      ],
    },
    code: `function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession);
  const logOut = useCallback(() => setSession(null), []);
  const token = session?.token ?? null;
  const api = useMemo(() => createClient({ token, onUnauthorized: logOut }), [token, logOut]);
  const value = useMemo(() => ({ user: session?.user ?? null, api, logOut /* , logIn */ }), [session, api, logOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}`,
    live: {
      kind: 'react',
      api: true,
      code: `import { createContext, useContext, useMemo, useState } from 'react';

function createClient({ token, onUnauthorized }) {
  return async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch('/api' + path, { method, headers, body: body && JSON.stringify(body) });
    if (res.status === 401 && token) { onUnauthorized(); throw new Error('Session expired: log in again'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };
}

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState('expired-token');   // as if restored days later
  const logOut = () => setToken(null);
  const api = useMemo(() => createClient({ token, onUnauthorized: logOut }), [token]);
  async function logIn() {
    const data = await api('/auth/login', { method: 'POST', body: { email: 'ana@example.com', password: 'password123' } });
    setToken(data.token);
  }
  return <AuthContext value={{ token, api, logIn }}>{children}</AuthContext>;
}

function CreateUser() {
  const { token, api, logIn } = useContext(AuthContext);
  const [msg, setMsg] = useState('');
  async function create() {
    try {
      const u = await api('/users', { method: 'POST', body: { name: 'Iris', email: 'iris' + Date.now() + '@example.com', password: 'longpassword' } });
      setMsg('Created user ' + u.id);
    } catch (err) { setMsg(err.message); }
  }
  return (
    <section>
      <p>Token: <code>{token ?? '(none)'}</code> {!token && <button onClick={logIn}>Log in as Ana</button>}</p>
      <button onClick={create}>Create a user (admins only)</button> <output>{msg}</output>
    </section>
  );
}

function App() {
  return <AuthProvider><CreateUser /></AuthProvider>;
}`,
    },
    example: 'The box starts with a token "restored from storage days ago" that the server no longer accepts. Press **Create a user**: the client gets 401 with a token, calls the provider\'s `logOut`, and the token disappears. Log in as Ana (a real call to the mock API) and create again: 201. Log out and try once more: 401 without a token is just an error, not a log-out.',
    mistake: 'Reading the token from `localStorage` inside the client on every request. It looks like a single source, but now there are two: the context says "logged out" while storage still has the token (or the other way round after a failed write), and logging out in one tab behaves differently from another. The provider owns the session; storage is only its backup.' },

  /* ---- 5. Server state and stores ------------------------------------------------------------------ */
  { id: 'server-vs-ui-state', hub: 'stores', topic: 'stores',
    title: 'Server state vs UI state',
    summary: '**UI state** belongs to the interface (is the menu open, what is typed, which tab is active); **server state** is a copy of data that lives on a server (the tasks, the users): it can go stale, is shared by many screens and must be refetched after changes.',
    html: [
      '<p>UI state is <strong>owned</strong> by the front end: it is right by definition. Server state is only <strong>borrowed</strong>: the moment the tasks arrive, someone else may change them; two screens that loaded them separately can disagree; and after you create a task, every copy you hold is out of date until you refetch it.</p>',
      '<table><caption>Which kind is it?</caption><thead>'
        + '<tr><th scope="col">Value</th><th scope="col">Kind</th><th scope="col">Where it goes</th></tr></thead><tbody>'
        + '<tr><th scope="row">Is the side menu open</th><td>UI</td><td>Local state</td></tr>'
        + '<tr><th scope="row">The search text</th><td>UI</td><td>Lifted state, or the URL (<code>?search=</code>)</td></tr>'
        + '<tr><th scope="row">The logged-in user and token</th><td>UI (the session)</td><td>The auth context</td></tr>'
        + '<tr><th scope="row">The tasks from <code>GET /api/tasks</code></th><td>Server</td><td>A fetching hook or a query cache</td></tr>'
        + '<tr><th scope="row">The task being edited (unsaved)</th><td>UI (a draft)</td><td>Local state in the form</td></tr></tbody></table>',
      '<p>Most hard parts of a front end are server-state problems: loading and error states, duplicate requests for the same data, when to refetch, updating lists after a write (see <a href="#/browser/data-fetching/after-write">After a write</a>), cancelling outdated requests. A fetching hook solves them for <strong>one</strong> component (see <a href="#/browser/data-fetching/fetch-hook">A reusable data hook</a>), but it does not share the data: two components that call it make two requests and keep two copies.</p>',
      '<p>So keep the two apart. UI state goes in <code>useState</code>, lifted or in a context. Server state goes in one place per resource (a hook in the closest common parent, which passes it down), or in a <strong>data-fetching cache</strong> when many screens share it (see <a href="#/browser/shared-state/query-cache">Data-fetching caches</a>).</p>',
    ],
    live: {
      kind: 'react',
      api: true,
      code: `import { useEffect, useState } from 'react';

// Each call keeps its OWN copy of the server's tasks.
function useTasks() {
  const [tasks, setTasks] = useState([]);
  async function reload() {
    const res = await fetch('/api/tasks');
    setTasks(await res.json());
  }
  useEffect(() => { reload(); }, []);
  return { tasks, reload };
}

function TaskCount() {
  const { tasks } = useTasks();                  // request 1
  return <p>Header: {tasks.length} tasks</p>;
}

function TaskList() {
  const { tasks, reload } = useTasks();          // request 2, same URL
  async function add() {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New task ' + tasks.length }),
    });
    reload();                                    // refreshes THIS copy only
  }
  return (
    <>
      <p>List: {tasks.length} tasks</p>
      <button onClick={add}>Add a task</button>
    </>
  );
}

function App() {
  return <><TaskCount /><TaskList /></>;
}`,
    },
    example: 'In the Try it box, the header and the list both call the same `useTasks()` hook. The console shows **two** identical requests. Add a task from the list: the list refetches its copy, the header keeps its old count. Two copies of server state, two truths.',
    mistake: 'Loading the tasks once into a global context "so every screen has them" and never refetching. The context now holds a snapshot that ages: another user\'s changes never appear, and each write needs hand-written code to patch the global list. Server data needs a plan for staleness, not just a place to live.' },

  { id: 'query-cache', hub: 'stores', topic: 'stores',
    title: 'Data-fetching caches (TanStack Query)',
    summary: 'A **data-fetching cache** keeps one copy of each server response under a **key** (`[\'tasks\']`), shares it with every component that asks for the same key, removes duplicate requests and refetches when you **invalidate** the key after a write.',
    html: [
      '<p>Components do not own server data: they <strong>subscribe</strong> to it by key. The first component that asks for <code>[\'tasks\']</code> triggers the request, the others wait for the same promise, and everyone re-renders when the data arrives. After a <code>POST</code> you do not patch lists by hand: you mark the key stale (<code>invalidateQueries({ queryKey: [\'tasks\'] })</code>), and the cache refetches once and updates every subscriber.</p>',
      '<ul>'
        + '<li><strong>What the libraries add:</strong> <code>isPending</code> / <code>isError</code> / <code>data</code> states, retries, refetching when the window regains focus, keeping old data while a new page loads, cancelling, and optimistic updates (see <a href="#/browser/data-fetching/optimistic-updates">Optimistic updates</a>).</li>'
        + '<li><strong>Parameters are part of the key:</strong> <code>[\'tasks\', { search, page }]</code> caches each combination separately.</li>'
        + '<li><strong>When to reach for one:</strong> several screens share the same data, the same refetch-after-write code keeps coming back, or going back to a page should feel instant. A hook per resource plus lifting covers small and medium apps.</li></ul>',
      '<p>TanStack Query (formerly React Query) and SWR are the common libraries; TanStack Query installs with <code>npm install @tanstack/react-query</code>. Neither loads in the Try it boxes of this site, so the box writes a toy cache by hand.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One key, one request, one copy shared by every subscriber.',
      desc: 'GET /api/tasks is sent once. Its answer is stored in the cache entry with the key tasks. TaskCount and TaskList both subscribe to that entry, so they show the same copy and both update when it is refetched.',
      nodes: [
        { id: 'req', label: '`GET /api/tasks`', note: 'sent once' },
        { id: 'entry', label: 'Cache entry', note: 'key `[\'tasks\']`', key: true },
        { id: 'count', label: 'TaskCount', note: 'subscribes' },
        { id: 'list', label: 'TaskList', note: 'subscribes' },
      ],
      edges: [
        ['req', 'entry'],
        ['entry', 'count'],
        ['entry', 'list'],
      ],
    },
    code: `// With TanStack Query (wrap the app once in <QueryClientProvider client={queryClient}>)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useTasks(search) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['tasks', { search }], queryFn: () => api('/tasks?search=' + encodeURIComponent(search)) });
}

function useAddTask() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title) => api('/tasks', { method: 'POST', body: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),   // every tasks list refetches
  });
}

// in a component
const { data: tasks, isPending, isError, error } = useTasks(search);`,
    live: {
      kind: 'react',
      api: true,
      code: `import { useEffect, useState } from 'react';

// A toy query cache: one entry per key, shared by every component that asks for it.
const cache = new Map();                          // key → { data, promise, listeners }
function entry(key) {
  if (!cache.has(key)) cache.set(key, { data: undefined, promise: null, listeners: new Set() });
  return cache.get(key);
}
function fetchKey(key, fn) {
  const e = entry(key);
  if (!e.promise) e.promise = fn().then((data) => { e.data = data; e.promise = null; e.listeners.forEach((l) => l(data)); });
  return e.promise;
}
function useQuery(key, fn) {
  const e = entry(key);
  const [data, setData] = useState(e.data);
  useEffect(() => {
    e.listeners.add(setData);
    if (e.data === undefined) fetchKey(key, fn);  // first asker fetches, the others share the promise
    return () => e.listeners.delete(setData);
  }, [key]);
  return data;
}

const getTasks = () => fetch('/api/tasks').then((r) => r.json());

function TaskCount() {
  const tasks = useQuery('tasks', getTasks);
  return <p>Header: {tasks ? tasks.length : '…'} tasks</p>;
}

function TaskList() {
  const tasks = useQuery('tasks', getTasks);
  async function add() {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New task' }) });
    fetchKey('tasks', getTasks);                  // "invalidate": refetch once, notify everyone
  }
  return <><p>List: {tasks ? tasks.length : '…'} tasks</p><button onClick={add}>Add a task</button></>;
}

function App() {
  return <><TaskCount /><TaskList /></>;
}`,
    },
    example: 'The box is the app of [Server state vs UI state](#/browser/shared-state/server-vs-ui-state) with a 20-line toy cache. The console shows **one** request although two components ask for the tasks. Add a task: the cache refetches once and **both** components update.',
    mistake: 'Copying the query\'s data into `useState` (`const [tasks, setTasks] = useState(data)` and an effect to sync it). That recreates the second source of truth the cache exists to remove: the copy misses every refetch. Read `data` from the hook directly; for edits, keep a separate draft.' },

  { id: 'store-libraries', hub: 'stores', topic: 'stores',
    title: 'Store libraries: Redux Toolkit and Zustand',
    summary: 'A **store** is an object outside the component tree that holds app-wide state; components **subscribe to the slice they select** and re-render only when that slice changes. Most apps of moderate size do not need one.',
    html: [
      '<p>A context re-renders every consumer when its value changes. A store changes the deal: each component passes a <strong>selector</strong>, a function that picks what it needs (<code>(s) =&gt; s.cart.count</code>), and re-renders only when the selected value changes. Updates go through named functions or <strong>actions</strong> handled by <strong>reducers</strong>, so every change to shared state happens in one known place and can be logged, replayed or inspected in dev tools.</p>',
      '<dl>'
        + '<dt>Zustand</dt><dd>Small: <code>create((set) =&gt; ({ … }))</code> returns a hook; no provider needed.</dd>'
        + '<dt>Redux Toolkit</dt><dd>Structured: slices with reducers, <code>configureStore</code>, a <code>&lt;Provider&gt;</code>, <code>useSelector</code> and <code>useDispatch</code>. It suits large teams that want strict conventions, and includes RTK Query, a data-fetching cache.</dd></dl>',
      '<p><strong>When a store pays off:</strong> many components read and change the same complex client state (a drawing editor, a cart with rules, an offline-first app), you need fine-grained re-renders, or you want time-travel debugging. For the usual app (a session, a theme, server data and local forms), lifted state, an auth context and a fetching hook or cache are enough, with fewer concepts and dependencies. Neither library loads in the Try it boxes; the box writes the core idea with React\'s own <code>useSyncExternalStore</code>.</p>',
    ],
    code: `// Zustand
import { create } from 'zustand';
export const useCart = create((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
}));
const count = useCart((s) => s.items.length);      // re-renders only when the count changes

// Redux Toolkit
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: { add: (state, action) => { state.items.push(action.payload); } },  // Immer makes this immutable
});
const count = useSelector((s) => s.cart.items.length);
dispatch(cartSlice.actions.add(item));`,
    live: {
      kind: 'react',
      code: `import { useSyncExternalStore } from 'react';

function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (change) => { state = { ...state, ...change(state) }; listeners.forEach((l) => l()); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

const store = createStore({ count: 0, theme: 'light' });
const useStore = (selector) => useSyncExternalStore(store.subscribe, () => selector(store.get()));

function Count() {
  const count = useStore((s) => s.count);
  console.log('Count rendered');
  return <p>count: {count}</p>;
}

function Theme() {
  const theme = useStore((s) => s.theme);
  console.log('Theme rendered');
  return <p>theme: {theme}</p>;
}

function App() {                       // reads nothing, so it never re-renders
  return (
    <>
      <Count />
      <Theme />
      <button onClick={() => store.set((s) => ({ count: s.count + 1 }))}>+1</button>{' '}
      <button onClick={() => store.set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' }))}>Theme</button>
    </>
  );
}`,
    },
    example: 'The box builds a 10-line store with `useSyncExternalStore`. `Count` selects `count`, `Theme` selects `theme`. Press **+1**: only `Count` logs a render. Press **Theme**: only `Theme` does. With one context holding both, both would re-render every time.',
    mistake: 'Moving every piece of state into the store, including form fields and whether a dropdown is open. The store then becomes a global variable with extra steps: components depend on it for things only they use, tests need it set up, and you lose the "state lives where it is used" rule. Keep local state local even when a store exists.' },

  { id: 'choosing-state-home', hub: 'stores', topic: 'stores',
    title: 'Putting it together: a home for every piece of state',
    summary: 'For each value, ask in order: is it derived, used by one component, by a few nearby, part of the URL, app-wide and slow-changing, or server data? Stop at the first yes; a store is for what is left.',
    html: [
      '<ol>'
        + '<li><strong>Can it be computed</strong> from other state or props? Derive it during render and store it nowhere.</li>'
        + '<li><strong>Does only one component use it?</strong> Local state.</li>'
        + '<li><strong>Do siblings, or a parent and a child, use it?</strong> Lift it to the closest common parent and pass props (see <a href="#/browser/shared-state/where-state-lives">Where a piece of state lives</a>).</li>'
        + '<li><strong>Does the path go through wrappers</strong> (Layout, Card, Page)? Composition: pass elements as <code>children</code> or slots.</li>'
        + '<li><strong>Should it survive a reload or be shareable</strong> (the screen, the selected id, the search, the page)? The URL (see <a href="#/browser/routing/search-params">Query strings: useSearchParams</a>).</li>'
        + '<li><strong>Do many components at different depths need it, and does it change rarely</strong> (the user, the theme, the language)? A context with a provider component.</li>'
        + '<li><strong>Is it a copy of server data?</strong> A fetching hook per resource, or a data-fetching cache.</li>'
        + '<li><strong>Is it complex client state that many components change?</strong> A store library.</li></ol>',
      '<h3>Props, composition or context: the trade-off</h3>',
      '<dl>'
        + '<dt>Props</dt><dd>Explicit: you can see where every value comes from. Noisy over long paths.</dd>'
        + '<dt>Composition</dt><dd>Still explicit, and shortens the path, but only when the middle components are wrappers.</dd>'
        + '<dt>Context</dt><dd>Removes the path, at the price of <strong>implicit dependencies</strong>: a component that calls <code>useAuth()</code> works only inside an <code>AuthProvider</code>, and its props no longer show what it needs. Good context values have many readers, a natural owner near the root and a <strong>low rate of change</strong>.</dd></dl>',
      '<p>Context is not a state manager: it shares a value, but it does not cache server data, does not let a component subscribe to part of the value, and does not log changes. That is what <a href="#/browser/shared-state/query-cache">caches</a> and <a href="#/browser/shared-state/store-libraries">stores</a> add.</p>',
      '<table><caption>A home for every value in a task app</caption><thead>'
        + '<tr><th scope="col">Value</th><th scope="col">Home</th></tr></thead><tbody>'
        + '<tr><th scope="row">The number of done tasks</th><td>Derived during render</td></tr>'
        + '<tr><th scope="row">The new-task title being typed</th><td>Local state in the form</td></tr>'
        + '<tr><th scope="row">The selected task in a list + detail split</th><td>Lifted to the page (or <code>/tasks/:id</code> in the URL)</td></tr>'
        + '<tr><th scope="row">The search text and the page number</th><td>The URL query string, or lifted state</td></tr>'
        + '<tr><th scope="row">The logged-in user and token</th><td>An auth context, saved to storage</td></tr>'
        + '<tr><th scope="row">The theme</th><td>A theme context, saved to storage</td></tr>'
        + '<tr><th scope="row">The tasks from the server</th><td>A fetching hook per resource, or a query cache</td></tr>'
        + '<tr><th scope="row">A complex client-side editor document</th><td>A store library</td></tr></tbody></table>',
      '<p>Revisit placements as the app grows: state moves up when a new component needs it, and down when its last distant reader goes.</p>',
    ],
    practice: SHARED_TREE_LINK,
    example: 'Try the state-tree challenges in order: keep local state local, lift the filter, remove a duplicate, spot the drilling, fix it with composition, move the theme into a context, then predict the re-renders. One check of context overkill: choose "Search filter text", switch to Context and place the provider on TaskPage. The analysis says plain props would do, because nothing sits between TaskPage and the two components that use the filter.',
    mistake: 'Deciding the "state management architecture" before writing the screens, or putting the search text, the selected task and the open modal in one root context "so everything can reach it". The right home comes from who uses a value, which you only know once the components exist, and a root context of fast-changing values re-renders every consumer on each keystroke. Start local, lift when needed, and add a context, cache or store when a concrete pain shows up.' },
];

/* Cards merged into another: their old addresses redirect (js/concept-section.js). */
DATA.en.SHARED_MOVED = { 'when-context': '#/browser/shared-state/choosing-state-home' };

DATA.en.SHARED_QUIZ = [
  /* Where state lives */
  { type: 'mc', topic: 'where',
    q: '`SearchBox` changes the search text and `ResultList` filters by it. They are siblings inside `SearchPage`. Where should the text live?',
    choices: ['In `SearchBox`', 'In `ResultList`', 'In `SearchPage`, passed down to both', 'In both, kept in sync with an effect'],
    answer: 2,
    why: '`SearchPage` is their **closest common parent**: the lowest component that can pass the value to both.' },
  { type: 'tf', topic: 'where',
    q: 'Putting a piece of state higher than the closest common parent breaks the app.',
    answer: false,
    why: 'It still works; it just makes more components pass the prop along and re-renders more on every change. Higher is wasteful, lower is broken.' },
  { type: 'mc', topic: 'where',
    q: 'After lifting state up, how does a child change it?',
    choices: ['It assigns to the prop', 'It calls a callback prop such as `onChange(value)` that the parent passed down', 'It calls `useState` with the same name', 'It dispatches a DOM event the parent listens to'],
    answer: 1,
    why: 'Data down, events up: the owner passes the value and a function; the child calls the function and the owner updates its state.' },
  { type: 'fib', topic: 'where',
    q: 'The principle that each fact should be stored in exactly one place is called a single source of ___.',
    accept: ['truth'],
    why: 'Two stored copies of the same fact drift apart; everyone else should read the one owner or compute from it.' },
  { type: 'mc', topic: 'where',
    q: 'A `Header` keeps `const [count, setCount] = useState(tasks.length)` and the list keeps `tasks`. What happens when a task is added?',
    choices: ['Both update', 'The header keeps the old count: `useState` read its argument only on the first render', 'React throws an error', 'The header updates one render later'],
    answer: 1,
    why: 'The header holds a second copy. Pass `tasks.length` as a prop (or compute it) instead of storing it.' },
  { type: 'mc', topic: 'where',
    q: 'An `<EditTask task={task} />` form keeps a draft in state. When the user selects another task, the old draft stays. The simplest fix?',
    choices: ['An effect that resets the draft when `task.id` changes', '`<EditTask key={task.id} task={task} />`', 'Move the draft to a context', 'Call `window.location.reload()`'],
    answer: 1,
    why: 'A new `key` makes React treat it as a different component: the old state is thrown away and a fresh form is mounted.' },
  { type: 'tf', topic: 'where',
    q: 'React keeps a component\'s state as long as the same component type stays at the same position in the tree, even if its props change.',
    answer: true,
    why: 'State is attached to the slot in the tree. Changing props keeps it; changing the type, the position or the `key` resets it.' },
  { type: 'mc', topic: 'where',
    q: 'Which of these should NOT be stored in state at all?',
    choices: ['The text typed in a form field', 'Whether a dropdown is open', 'The number of tasks that are done, given the list of tasks', 'The id of the selected task'],
    answer: 2,
    why: 'It can be computed from the list during render: a derived value. Storing it creates a copy that can go wrong.' },

  /* Prop drilling and composition */
  { type: 'mc', topic: 'drilling',
    q: 'What is prop drilling?',
    choices: ['Passing too many props to a component that uses them', 'Passing a prop through components that do not use it, only so it reaches a component deeper down', 'Changing a prop inside a child', 'Reading a context value'],
    answer: 1,
    why: 'The middle components accept and forward the prop without using it.' },
  { type: 'tf', topic: 'drilling',
    q: 'Passing a prop through one intermediate component is a problem you should always solve with context.',
    answer: false,
    why: 'One or two levels of explicit props are clear and easy to trace. Drilling hurts with long chains, many values or generic middle components.' },
  { type: 'mc', topic: 'drilling',
    q: '`App` owns `user`. It renders `<Layout><TaskPage user={user} /></Layout>`, and `Layout` renders `{children}`. Who passes `user` to `TaskPage`?',
    choices: ['`Layout`', '`App`', 'Nobody: `TaskPage` must use context', 'React, automatically'],
    answer: 1,
    why: 'Props are given by the component that writes the tag. `App` creates the element; `Layout` only places it. That is composition.' },
  { type: 'mc', topic: 'drilling',
    q: 'Which is the usual first fix for drilling through a generic `Layout` component?',
    choices: ['A global variable', 'Composition: pass the finished content to `Layout` as `children` or slot props', 'A store library', 'Copying the value into state in `Layout`'],
    answer: 1,
    why: 'Composition removes the layout from the data\'s path without any new API; context comes after, for truly app-wide values.' },
  { type: 'fib', topic: 'drilling',
    q: 'Props that hold elements for different areas of a layout, such as `header={<Header />}`, are often called ___.',
    accept: ['slots', 'slot', 'slot props'],
    why: 'Like `children`, but named: the layout decides where each slot goes, the owner decides what goes in it.' },
  { type: 'tf', topic: 'drilling',
    q: 'When `Layout` re-renders for its own reasons, the elements it received in `children` from its parent are re-rendered too.',
    answer: false,
    why: 'Those elements were created by the parent and are the same objects, so React skips them. Only the parent re-rendering re-creates them.' },
  { type: 'mc', topic: 'drilling',
    q: 'Which situation is NOT prop drilling?',
    choices: ['`TaskList` passes `task` and `onToggle` to `TaskItem`, which uses both', '`Layout` passes `user` to `Header` without using it', '`Page` forwards `theme` to `Section`, which forwards it to `Card`', '`Header` forwards `onLogout` to `Menu` without calling it'],
    answer: 0,
    why: 'TaskList passes props its child really uses: that is normal data flow. Drilling is about the components in between that only forward.' },

  /* Context */
  { type: 'mc', topic: 'context',
    q: 'What does `useContext(ThemeContext)` return?',
    choices: ['The value of the outermost provider in the app', 'The value of the nearest `ThemeContext` provider above the calling component, or the default if there is none', 'The default value always', 'A setter for the theme'],
    answer: 1,
    why: 'The nearest provider above wins; the default of `createContext` is used only without any provider above.' },
  { type: 'tf', topic: 'context',
    q: 'The argument of `createContext(defaultValue)` is shared state that every component can change.',
    answer: false,
    why: 'It is only a fallback for components with no provider above. Shared state comes from the state of the component that renders the provider.' },
  { type: 'fib', topic: 'context',
    q: 'The React hook that reads the current value of a context is ___.',
    accept: ['useContext', 'useContext()'],
    why: '`useContext(SomeContext)` reads the nearest provider\'s value and re-renders the component when it changes.' },
  { type: 'mc', topic: 'context',
    q: 'Why does a `useAuth()` hook often throw when `useContext(AuthContext)` returns `null`?',
    choices: ['React requires it', 'To report a missing provider with a clear message instead of a confusing crash elsewhere', 'To log the user out', 'To make the component render faster'],
    answer: 1,
    why: 'With `createContext(null)`, a component outside the provider gets `null`. The hook turns that into "useAuth must be used inside <AuthProvider>".' },
  { type: 'mc', topic: 'context',
    q: 'A provider writes `value={{ user, logOut }}` and re-renders because its parent re-rendered; `user` did not change. What happens to a consumer wrapped in `memo`?',
    choices: ['Nothing: memo protects it', 'It re-renders: the value is a new object, and context updates go through memo', 'It unmounts', 'It throws'],
    answer: 1,
    why: 'Context changes are compared by identity and bypass memo. `useMemo` on the value keeps the same object until `user` changes.' },
  { type: 'tf', topic: 'context',
    q: 'With `<AuthProvider>{children}</AuthProvider>` at the root, a change of the user re-renders only the components that read the context (and what they render), not the whole app.',
    answer: true,
    why: 'The children were created outside the provider, so the provider\'s re-render does not re-create them; only consumers update.' },
  { type: 'mc', topic: 'context',
    q: 'Which value is the WORST fit for a context read by many components?',
    choices: ['The logged-in user', 'The theme', 'The mouse position, updated on every `mousemove`', 'The interface language'],
    answer: 2,
    why: 'Every change re-renders every consumer. Context suits values that change rarely.' },
  { type: 'mc', topic: 'context',
    q: 'In React 19, which JSX provides a value for `ThemeContext`?',
    choices: ['`<ThemeContext value="dark">…</ThemeContext>` (or the older `<ThemeContext.Provider value="dark">`)', '`<Provider context={ThemeContext} value="dark">`', '`useContext(ThemeContext, "dark")`', '`ThemeContext.set("dark")`'],
    answer: 0,
    why: 'In React 19 the context object is itself the provider; `.Provider` still works and is what React 18 code uses.' },
  { type: 'tf', topic: 'context',
    q: 'A component that renders `<ThemeContext value={theme}>` can read that same value with `useContext(ThemeContext)` in its own body.',
    answer: false,
    why: '`useContext` looks above the calling component. The component that renders the provider already has the value in a variable.' },

  { type: 'mc', topic: 'context',
    q: 'A child is wrapped in `memo`, and its parent passes `onSelect={(t) => setSelected(t)}`. The parent re-renders for an unrelated reason. Does the child re-render?',
    choices: ['No: `memo` always skips it', 'Yes: the arrow function is a new object on every render, so the props are not equal', 'Only if the child reads a context', 'Only in production'],
    answer: 1,
    why: '`memo` compares props by identity. `useCallback` keeps the same function between renders, so `memo` can skip the child.' },
  { type: 'fib', topic: 'context',
    q: 'The hook that keeps the same function object between renders until one of its dependencies changes is ___.',
    accept: ['useCallback', 'useCallback()'],
    why: '`useCallback(fn, deps)` returns the same function while `deps` are unchanged; `useMemo` does the same for a computed value.' },
  { type: 'tf', topic: 'context',
    q: 'Wrapping every function in `useCallback` is a good default that makes any app faster.',
    answer: false,
    why: 'It only helps when something compares the function\'s identity (a `memo` child, a dependency array, a context value). Otherwise it adds cost and a dependency array to keep right.' },
  /* An authentication context */
  { type: 'mc', topic: 'auth',
    q: 'What should an authentication provider keep in state?',
    choices: ['The email and password', 'The token and the public user fields', 'Only `isLoggedIn: true`', 'The whole response, including headers'],
    answer: 1,
    why: 'The token proves who you are on later requests; the user is shown in the interface. The password is dropped once sent; `isLoggedIn` is derived from the token.' },
  { type: 'mc', topic: 'auth',
    q: 'The log-in request answers 401. What should `logIn(email, password)` in the provider do?',
    choices: ['Redirect to the home page', 'Throw an error so the form that called it can show the message', 'Store an empty token', 'Retry with the same password'],
    answer: 1,
    why: 'The provider manages the session; the form shows errors. Throwing hands the failure back to the caller.' },
  { type: 'tf', topic: 'auth',
    q: 'Hiding the admin buttons for non-admin users in the front end is enough to protect admin actions.',
    answer: false,
    why: 'Anyone can send the request by hand. The server must check the token and role on every request; hiding buttons is only a convenience.' },
  { type: 'mc', topic: 'auth',
    q: 'Where should the provider read the saved session from `localStorage` so a reload does not flash the log-in page?',
    choices: ['In an effect with `[]`', 'In a lazy initialiser: `useState(() => readSaved())`', 'In the log-in form', 'In every component that needs the user'],
    answer: 1,
    why: 'The initialiser runs before the first render; an effect runs after it, so the first render would be "logged out".' },
  { type: 'fib', topic: 'auth',
    q: 'A cookie that JavaScript in the page cannot read is marked ___.',
    accept: ['httpOnly', 'HttpOnly', 'http-only', 'httponly'],
    why: 'An httpOnly cookie is sent by the browser automatically but never exposed to scripts, so an XSS script cannot steal it.' },
  { type: 'mc', topic: 'auth',
    q: 'What is the main risk of keeping the token in `localStorage`?',
    choices: ['It is deleted on every reload', 'Any script running in the page (an XSS bug, a compromised package) can read it and send it elsewhere', 'The server cannot read it', 'It is sent automatically to every site'],
    answer: 1,
    why: 'localStorage is readable by any script of the page. It survives reloads and is not sent automatically; httpOnly cookies avoid the theft but bring CSRF concerns.' },
  { type: 'mc', topic: 'auth',
    q: 'A request **with a token** gets 401. Where is the best place to react to it?',
    choices: ['In every component, after each `fetch`', 'Once, in the API client, which calls an `onUnauthorized` handler given by the auth provider (its `logOut`)', 'In the server', 'Nowhere: show "HTTP 401"'],
    answer: 1,
    why: 'One place detects "the token was refused" and the provider decides what logging out means, so every request behaves the same.' },
  { type: 'tf', topic: 'auth',
    q: 'A `403` response should log the user out, just like a `401`.',
    answer: false,
    why: '403 means "known, but not allowed": logging in again would not help. Show a permission message instead.' },
  { type: 'mc', topic: 'auth',
    q: 'Why should the API client not keep its own copy of the token?',
    choices: ['Copies are slower', 'It would be a second source of truth: after log-out the client could keep sending the old token', 'fetch cannot send tokens', 'Tokens must be stored in cookies only'],
    answer: 1,
    why: 'The provider owns the session; the client should receive the current token (built with it, or through `getToken()`).' },

  /* Server state and stores */
  { type: 'mc', topic: 'stores',
    q: 'Which of these is server state?',
    choices: ['Whether the side menu is open', 'The text typed in the search box', 'The list of tasks returned by `GET /api/tasks`', 'The selected tab'],
    answer: 2,
    why: 'It is a copy of data owned by the server: it can go stale and must be refetched after changes.' },
  { type: 'tf', topic: 'stores',
    q: 'Two components that call the same `useFetch(\'/api/tasks\')` hook share one copy of the data.',
    answer: false,
    why: 'Each hook call has its own state and makes its own request. Sharing needs one owner (a common parent) or a cache.' },
  { type: 'mc', topic: 'stores',
    q: 'In TanStack Query, what makes every list of tasks refetch after a successful `POST /api/tasks`?',
    choices: ['Reloading the page', '`queryClient.invalidateQueries({ queryKey: [\'tasks\'] })`', 'Calling `useQuery` again in an effect', 'Clearing localStorage'],
    answer: 1,
    why: 'Invalidating marks the cached data for that key as stale; the cache refetches once and updates every subscriber.' },
  { type: 'fib', topic: 'stores',
    q: 'In a data-fetching cache, each response is stored under a query ___, such as `[\'tasks\', { page: 2 }]`.',
    accept: ['key', 'querykey', 'queryKey'],
    why: 'The key identifies the data: same key, same cached copy; different parameters, different entry.' },
  { type: 'mc', topic: 'stores',
    q: 'What does a store library such as Zustand or Redux Toolkit offer that a plain context does not?',
    choices: ['Faster network requests', 'Components subscribe to a selected slice and re-render only when that slice changes', 'Automatic routing', 'Server-side validation'],
    answer: 1,
    why: 'Selectors give fine-grained re-renders; a context re-renders every consumer on any change of its value.' },
  { type: 'tf', topic: 'stores',
    q: 'Once a project uses a store library, every piece of state, including form fields, should move into the store.',
    answer: false,
    why: 'Local state stays local. Putting everything in the store turns it into a global variable and makes components harder to reuse and test.' },
  { type: 'mc', topic: 'stores',
    q: 'Which is a good reason to keep the search text and page number in the URL (`?search=api&page=2`)?',
    choices: ['It is faster than state', 'It survives a reload, can be bookmarked and shared, and works with the back button', 'It hides the values from the user', 'React requires it'],
    answer: 1,
    why: 'The URL is a place for state that should be linkable; lifted state is lost on reload.' },
  { type: 'mc', topic: 'stores',
    q: 'Order matters when choosing where a value lives. Which question comes first?',
    choices: ['Should it go in a store?', 'Can it be computed from other state or props?', 'Should it go in a context?', 'Should it be cached?'],
    answer: 1,
    why: 'A derived value needs no home at all. Then local, lifted, URL, context, cache, and a store last.' },
];
