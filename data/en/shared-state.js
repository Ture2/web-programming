'use strict';
/* Shared state: concept cards, rail groups and self-check quiz (React context as the worked example). */

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
  /* ---- 1. Where state lives ----------------------------------------------------------------- */
  { id: 'where-state-lives', hub: 'where', topic: 'where',
    title: 'Where a piece of state lives',
    summary: 'Every piece of state has exactly one **owner**: the component that declares it. Put it in the **closest common parent** of every component that reads or changes it, and no higher.',
    body: [
      'An interface is a tree of components, and data in that tree only flows **down**: a parent can hand a value to a child as a prop, but a child cannot reach up or sideways. So the question "where does this state live?" has a mechanical answer. List every component that **reads** the value or **changes** it, then walk up the tree from each of them until the paths meet. That meeting point, the **closest common parent** (in computer-science terms, the lowest common ancestor), is the lowest component that can hand the value to all of them.',
      'Lower than that does not work: a component outside the owner\'s subtree cannot read it. Higher works, but every component on the extra path has to pass the value along, and every state change re-renders the owner and, by default, everything it renders. So the rule has two halves: **high enough** to reach every user, **as low as possible** to keep the change local. A value that only one component uses stays in that component.',
      'The idea is the same in any component framework (Vue, Svelte, Angular, native mobile): only the syntax of "pass it down" changes. In React, state is declared with `useState` in the owner (see [useState and what a re-render is](#/browser/state-effects/use-state)), passed down as props, and changed through functions the owner passes down too ([next card](#/browser/shared-state/lifting-state)). Before you place anything, check it really is state: a value you can compute from other state or props is a [derived value](#/browser/state-effects/derived-values) and is not stored anywhere.',
    ],
    table: { caption: 'A task screen: who uses what, and where it lives',
      head: ['Value', 'Read or changed by', 'Lives in'],
      rows: [
        ['text being typed in the new-task form', 'TaskForm only', 'TaskForm (local)'],
        ['search filter', 'Toolbar (the input) and TaskList', 'TaskPage, their closest common parent'],
        ['the list of tasks', 'Toolbar (count), TaskList, TaskItem (toggle), TaskForm (add)', 'TaskPage'],
        ['the logged-in user', 'Avatar in the header, TaskList, LogoutButton', 'App, or a context provider near the root'],
        ['how many tasks match the filter', 'Toolbar', 'nowhere: derived during render'],
      ] },
    example: 'In the tool below, choose "Search filter text", then press **Place here** on Toolbar: TaskList is flagged because it is outside Toolbar\'s subtree. Remove it and place it on App: it works, but Layout and TaskPage pass a prop they never use. Place it on TaskPage: everyone can reach it and nothing is passed on for nothing. Then try the first challenges.',
    widget: 'state-tree',
    mistake: 'Putting every piece of state at the top "so everything can reach it". It works, but each keystroke in a search box then re-renders the whole app, and every component in between has to pass props it does not care about. Start local and move state up only when a second component needs it.' },

  { id: 'lifting-state', hub: 'where', topic: 'where',
    title: 'Lifting state up: data down, events up',
    summary: '**Lifting state up** means moving a piece of state from a child into a parent so siblings can share it. The parent passes the **value** down as a prop and a **callback** down so children can ask it to change.',
    body: [
      'When two siblings need the same value, neither can own it: a sibling cannot pass props to another sibling. So you move the state up to their closest common parent. The parent becomes the owner; the children become **controlled** by it: they show what they are given and report what happened. That is the whole pattern, often summarised as **data down, events up**.',
      'The child never changes the value itself (props are read-only, see [Props are read-only](#/browser/components/props-read-only)). It calls a function received as a prop, by convention named `on` + event: `onFilterChange(text)`, `onToggle(id)`, `onAdd(task)`. The parent decides what that means and updates its state; React re-renders the parent and its children with the new value. Passing the setter itself (`onFilterChange={setFilter}`) is fine when the child should be able to set any value; a named function (`onToggle={toggleTask}`) keeps the rules in the owner.',
      'Lifting also lets the owner **derive** things for the children: the parent that owns the filter and the list can compute the visible tasks once and pass the result, so the list stays a simple component that just shows what it gets.',
    ],
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
    example: 'The box lifts the filter into `TaskPage`. `Toolbar` is a controlled input that reports each keystroke with `onFilterChange`; `TaskPage` derives the visible tasks and passes them to `TaskList`. Type in the box: both children update together because they read the same state.',
    live: { kind: 'react', code: `import { useState } from 'react';

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
}` },
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Lift the filter" in the state-tree tool' },
    mistake: 'Lifting the value but not the change: the parent passes `filter` down, but the child keeps calling its own local `setFilter`. The input then shows what it typed while the list filters by the parent\'s old value. When state moves up, the child must lose its `useState` and report changes through the callback.' },

  { id: 'single-source-of-truth', hub: 'where', topic: 'where',
    title: 'A single source of truth',
    summary: 'Each fact the interface shows should be stored **once**. Every other place that needs it receives it (as a prop or from a context) or computes it. Two stored copies of the same fact always end up disagreeing.',
    body: [
      'Think of a team that keeps the same budget in two spreadsheets. Each update goes into one of them, and sooner or later someone forgets the other. State works the same way: if the header keeps its own "number of tasks" and the list keeps the tasks, adding a task updates the list, and the header now lies. No effect, event or careful code fixes this for good; the cure is to **delete the copy** and let the header read from the owner.',
      'Duplication sneaks in three ways. **Copying a prop into state** (`useState(props.count)`, which also ignores later changes; see [State, props and derived values](#/browser/state-effects/what-is-state)). **Storing something you could compute** (a count, a filtered list, an "is valid" flag; see [Derived values](#/browser/state-effects/derived-values)). **Two components each declaring the "same" state** because each needed it before anyone lifted it. In all three, the fix is the same: one owner, everyone else reads.',
      'One copy is fine, and useful: a **draft**. An edit form may copy a task\'s title into local state so the user can type without touching the real task until they press Save. That copy is deliberate: it is a different fact ("what the user is typing"), and Save hands it back to the owner. The [next card](#/browser/shared-state/state-and-position) shows how to reset such a draft.',
    ],
    example: 'The box has the bug on purpose: `Counter` copies `tasks.length` into its own state. Add a task: the list says 3, the header still says 2, because `useState` read its argument only once. Fix it: delete the `useState` line in `Counter` and render `{count}` from a prop `<Counter count={tasks.length} />`.',
    live: { kind: 'react', code: `import { useState } from 'react';

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
}` },
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "One source of truth" in the state-tree tool' },
    mistake: 'Keeping the copies and "syncing" them with an effect: `useEffect(() => setCount(tasks.length), [tasks])`. It renders once with the wrong number, then again with the right one, and every new copy needs another effect. If a value can be read from the owner or computed, it is not state.' },

  { id: 'state-and-position', hub: 'where', topic: 'where',
    title: 'State belongs to a place in the tree (and key resets it)',
    summary: 'React keeps a component\'s state as long as the **same component type** is rendered at the **same position** in the tree. Changing its props does not reset its state; giving it a different `key` does.',
    body: [
      'React does not attach state to your variables or to a prop value; it attaches it to a **slot** in the tree: "the `EditTask` that is the second child of `App`". Re-render with different props and the slot is the same, so the state survives. That is usually what you want (a text box keeps its text while the parent re-renders), and it is also the source of a classic bug: switch from task 1 to task 2, and the edit form still shows the draft typed for task 1, because the form\'s state was created from task 1\'s title and the slot never changed.',
      'A `key` is part of a slot\'s identity, not only for lists (see [Keys](#/browser/components/keys)). `<EditTask key={task.id} task={task} />` tells React "the form for task 2 is a different component from the form for task 1". When the key changes, React throws away the old instance and its state and mounts a fresh one, so the draft is initialised from the new task. No effect is needed to "reset the form when the task changes".',
      'The same rule explains two surprises: rendering a **different component type** in the same place resets the state (`{isAdmin ? <AdminPanel /> : <UserPanel />}`), and moving a component to another position (inside a new wrapper `<div>`, for example) loses its state.',
    ],
    example: 'The box edits the selected task in a form that keeps a draft. Type something, then pick the other task: without a key the old draft stays. Tick the `key` checkbox and repeat: each task gets a fresh form.',
    live: { kind: 'react', code: `import { useState } from 'react';

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
}` },
    mistake: 'Resetting the form with an effect: `useEffect(() => setDraft(task.title), [task.id])`. The first render after the switch still shows the old draft, then a second render fixes it, and every new field needs another line. `key={task.id}` resets all of the form\'s state at once, before anything is shown.' },

  /* ---- 2. Prop drilling and composition ----------------------------------------------------- */
  { id: 'prop-drilling', hub: 'drilling', topic: 'drilling',
    title: 'Prop drilling, and when it actually hurts',
    summary: '**Prop drilling** is passing a prop through components that do not use it, only so it reaches a component further down. A level or two is normal and clear; it hurts when many layers forward many props.',
    body: [
      'Suppose the user lives in `App` and two components deep in the tree need it: the `Avatar` in the header and the `TaskList` in the page. With props, `Layout`, `Header` and `TaskPage` must each accept `user` and pass it on, though none of them shows it. That forwarding is drilling. It is not a bug: the data flow is explicit and easy to trace with "find usages", which is why it is the right default for one or two levels.',
      'It starts to hurt when: the chain is **long** (four, five components); **several** values travel together (`user`, `onLogout`, `theme`, `onToggleTheme`…); the middle components are **generic** (a `Layout` or `Card` you reuse elsewhere and should not know about users); or every change to the data means editing every signature on the way. Each of those is a cost in reading and changing code, not in speed.',
      'Two fixes exist, and the order matters. First try **composition**: let the component that owns the data create the deep component itself and pass it in as `children` ([next card](#/browser/shared-state/composition-children)), which often removes the middle layers from the path entirely. Only when the same value is needed in many unrelated places, use a **context** ([What context is](#/browser/shared-state/what-is-context)).',
    ],
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
    table: { caption: 'Drilling: fine or painful?', head: ['Situation', 'Verdict'],
      rows: [
        ['a parent passes `task` and `onToggle` to its child', 'not drilling: the child uses them'],
        ['one middle component forwards one prop', 'fine: explicit and easy to follow'],
        ['a generic `Layout` forwards `user` to the header and the page', 'a smell: try composition'],
        ['the theme or the user is read in a dozen places across the app', 'a good case for context'],
      ] },
    example: 'In the state-tree tool, choose "The logged-in user", place it on **App** with Props: the tree marks Layout, Header and TaskPage as "only passes on". That is the challenge "Spot the drilling".',
    practice: SHARED_TREE_LINK,
    mistake: 'Reaching for context (or a store library) the first time a prop goes through one extra component. Context hides where a value comes from, makes components depend on a provider being present, and can re-render more than you expect. One or two levels of explicit props are easier to read and to test.' },

  { id: 'composition-children', hub: 'drilling', topic: 'drilling',
    title: 'Composition: pass components, not data',
    summary: 'Instead of passing data through a layout so it can build its content, let the owner of the data **build the content itself** and pass the finished elements in as `children` (or other props). The layout no longer needs to know about the data.',
    body: [
      'A prop is passed by the component that **writes** the JSX tag, not by the component that ends up displaying it. If `App` writes `<Layout><TaskPage user={user} /></Layout>`, then `App` gives `user` to `TaskPage` directly, and `Layout` just receives a ready-made element in `children` and puts it somewhere. `Layout` is still the parent on the page, but it is no longer on the data\'s path. That is why composition removes drilling without any new API (see [children](#/browser/components/children)).',
      'For layouts with several areas, use several props that hold elements, often called **slots**: `<Layout header={<Header user={user} />} sidebar={<Nav />}>…</Layout>`. Components like `Layout`, `Card`, `Modal` or `Page` become reusable shells that never change when the data changes.',
      'A bonus: when the layout re-renders for its own reasons (opening a menu, for example), the elements in `children` were created by the parent and are the same objects as before, so React does not re-render them. In the state-tree tool, the "Composition" option changes exactly this: Header, Sidebar and TaskPage are then **created by App, shown inside Layout**.',
    ],
    example: 'In the box, `Layout` takes a `header` slot and `children`; it never sees `user`. `App` owns the user and passes it straight to `Avatar` and `TaskPage`. Switch the user: both update, and `Layout`\'s code did not have to change.',
    live: { kind: 'react', code: `import { useState } from 'react';

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
      css: '.layout header { padding: 6px 10px; background: #e8eefc; }\n.layout main { padding: 6px 10px; border: 1px solid #ccd; }' },
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Composition before context" in the state-tree tool' },
    mistake: 'Thinking composition means "the Layout must render TaskPage itself". As soon as `Layout` writes `<TaskPage />` in its own JSX, it is the one that must provide TaskPage\'s props, and drilling is back. Let the owner of the data write the tag and hand the element over.' },

  /* ---- 3. Context ----------------------------------------------------------------------------- */
  { id: 'what-is-context', hub: 'context', topic: 'context',
    title: 'Context: a value for a whole subtree',
    summary: 'A **context** lets a component provide a value to **every component below it**, at any depth, without passing props. In React: `createContext(default)` makes one, a provider element sets the value for its subtree, and `useContext(SomeContext)` reads it.',
    body: [
      'Picture a radio station. The provider broadcasts a value on one frequency; any component below it in the tree can tune in with `useContext`, and the components in between do not have to carry anything. Context does not store or change anything on its own: it is only a **channel** from a provider to the components under it. The value usually comes from the state of the component that renders the provider (next card).',
      'Three pieces. `const ThemeContext = createContext(\'light\')` creates the channel; its argument is the **default value**, used only by a component with **no provider above it**. `<ThemeContext value="dark">…</ThemeContext>` is the provider (in React 19, the context object is itself the provider; code for React 18 and earlier writes `<ThemeContext.Provider value="dark">`, which React 19 still accepts). `const theme = useContext(ThemeContext)` reads the value of the **nearest** provider above the calling component.',
      '"Above" means **on the page**, in the render tree: a component passed as `children` into a provider is inside it, wherever its JSX was written. Providers can be nested: an inner provider overrides the outer one for its subtree only. Create each context **once**, at the top level of a module (often its own file, `ThemeContext.js`), and export it, so the provider and the readers use the same object.',
    ],
    example: 'The box has one context and three panels. The first is outside any provider and gets the default; the second is inside a "dark" provider; the third is inside a nested "light" provider, the nearest one. No component receives a theme prop.',
    live: { kind: 'react', code: `import { createContext, useContext } from 'react';

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
      css: '.badge { padding: 2px 8px; border-radius: 10px; border: 1px solid #888; }\n.badge.dark { background: #222; color: #eee; }\n.badge.light { background: #fff; color: #111; }' },
    mistake: 'Expecting the default value of `createContext` to be shared state. It is only what a component sees when there is **no provider above it**, usually because the provider was forgotten or placed too low. Many teams use `createContext(null)` and a hook that throws, so a missing provider fails loudly instead of quietly using a default (see [A custom hook for the context](#/browser/shared-state/use-context-hook)).' },

  { id: 'provider-component', hub: 'context', topic: 'context',
    title: 'A provider component that owns the state',
    summary: 'The usual pattern: one component, for example `ThemeProvider`, declares the state, renders the context provider with the state **and the functions that change it** as its value, and renders `{children}` inside it.',
    body: [
      'A context only carries values; it does not make them change. To share **state**, something must own it, and the cleanest owner is a small component whose only job is that: `ThemeProvider` holds `const [theme, setTheme] = useState(\'light\')` and renders `<ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>`. Any component inside can now read the theme and call `toggleTheme`, and the rule "data down, events up" still holds: the change still goes through the owner.',
      'Expose **intentions**, not raw setters, when there are rules: `toggleTheme()`, `logIn(email, password)`, `logOut()`. The provider is then the one place that knows how the state changes (and later, how it is saved or sent to a server), and readers cannot put it in an invalid state.',
      'The provider wraps the app (or the part of it that needs the value) once, near the root: `<ThemeProvider><App /></ThemeProvider>`, typically in `main.jsx`. Because `App` is passed as `children`, it was created outside the provider: when the provider\'s state changes, only the components that read the context re-render, not everything under it (see [What re-renders when a context changes](#/browser/shared-state/context-rerenders)).',
    ],
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
    example: 'In the box, `ThemeToggle` sits inside `Sidebar`, which passes nothing on, yet it reads and changes the theme owned by `ThemeProvider`. `Page` reads the same value to choose its colours.',
    live: { kind: 'react', code: `import { createContext, useContext, useState } from 'react';

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
      css: '.page { padding: 8px 12px; }\n.page.dark { background: #1d1f33; color: #eee; }\n.page.light { background: #fff; color: #111; }' },
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Solve "Move the theme into a context"' },
    mistake: 'Calling `useContext(ThemeContext)` in the same component that renders the provider and expecting the new value. `useContext` looks **above** the calling component, so the provider\'s own component never sees its own provider: it already has the state in a variable; use that.' },

  { id: 'use-context-hook', hub: 'context', topic: 'context',
    title: 'A custom hook for the context: useAuth()',
    summary: 'Wrap `useContext` in a custom hook such as `useAuth()` that **throws a clear error** when there is no provider. Components import the hook, not the context object.',
    body: [
      'With `createContext(null)`, a component rendered outside the provider gets `null`, and the error shows up somewhere else: "Cannot destructure property \'user\' of null", three files away. A hook that checks once turns that into a message that says exactly what is wrong: "useAuth must be used inside <AuthProvider>". It is a [custom hook](#/browser/state-effects/custom-hooks), so its name starts with `use` and it follows the rules of hooks.',
      'The hook is also an **interface**. Export `AuthProvider` and `useAuth` from one file and keep the context object private. Readers then cannot depend on how the value is built, and you can later split the context in two, add memoisation or move to a library without touching a single component.',
      'One file per context is a common layout: `auth/AuthContext.jsx` with `AuthContext` (not exported), `AuthProvider` and `useAuth`. Some tools (Vite\'s Fast Refresh) prefer a file that exports only components; if the linter complains, move the hook to `auth/useAuth.js`.',
    ],
    code: `const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}`,
    example: 'The box works as written. Then move `<Greeting />` out of `<AuthProvider>` (put it after the closing tag, inside a fragment `<>…</>`): the preview shows the hook\'s error message instead of a confusing crash.',
    live: { kind: 'react', code: `import { createContext, useContext, useState } from 'react';

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
}` },
    mistake: 'Exporting the context object and calling `useContext(AuthContext)` in every component. It works until the first component outside the provider (a test, a storybook page, a new route) receives `null`. A hook gives one place for the check and one name to search for.' },

  { id: 'context-rerenders', hub: 'context', topic: 'context',
    title: 'What re-renders when a context value changes',
    summary: 'When the provider\'s `value` changes (compared with `Object.is`), **every component that reads that context re-renders**, even inside `memo`. A new object literal on every render counts as a change, so memoise the value with `useMemo`.',
    body: [
      'React compares the new `value` with the previous one by identity, like dependencies. If it differs, every consumer below re-renders. Components that do not read the context are not affected by it, though they may still re-render for the usual reason: their parent re-rendered. `memo` (which skips a component when its props are unchanged) does **not** stop a context update: reading a context is like an extra, invisible prop.',
      'The trap is the object literal: `value={{ user, logIn, logOut }}` builds a **new object every time the provider renders**. If the provider re-renders for any reason (its parent re-rendered, another piece of its state changed), every consumer re-renders too, although nothing they read changed. `useMemo(() => ({ user, logIn, logOut }), [user])` keeps the same object until `user` changes; functions inside should then be stable too (`useCallback`, or defined so they do not depend on render values).',
      'Three habits keep context cheap. Wrap the app as `<Provider>{children}</Provider>`, so a state change re-renders only consumers. **Split** values that change at different speeds (`AuthContext` and `ThemeContext`, not one `AppContext`). And never put fast-changing data (mouse position, a value updated on every keystroke of a big form) in a context read by many components.',
    ],
    code: `function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const logIn = useCallback((u) => setUser(u), []);
  const logOut = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ user, logIn, logOut }), [user, logIn, logOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}`,
    example: 'In the box, `UserBadge` is wrapped in `memo` and reads the context. Press **Unrelated click** and watch the console: `App` re-renders, the value object is new, and the badge re-renders although the user did not change. Tick "Memoise the value" and click again: the badge stays quiet.',
    live: { kind: 'react', code: `import { createContext, useContext, useMemo, useState, memo } from 'react';

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
}` },
    practice: { href: '#/browser/shared-state/practice/state-tree', label: 'Predict the re-renders on log-out in the state-tree tool' },
    mistake: 'Putting everything into one big `AppContext` "to keep it simple". Every consumer then re-renders whenever any part changes: typing in a search field stored there re-renders the header, the sidebar and every list item. Separate contexts for separate concerns, and local state for anything only one area uses.' },

  { id: 'when-context', hub: 'context', topic: 'context',
    title: 'Props, composition or context?',
    summary: 'Use **props** by default, **composition** when a layout is in the way, and **context** for values that many components at different depths need and that change rarely: the logged-in user, the theme, the language.',
    body: [
      'Each option trades something. Props are explicit (you can see where every value comes from) but get noisy over long paths. Composition keeps props explicit and shortens the path, but only helps when the middle components are wrappers. Context removes the path entirely, at the price of **implicit dependencies**: a component that calls `useAuth()` only works inside an `AuthProvider`, and you can no longer see from its props what it needs.',
      'Good context values share three traits: many readers spread across the app, a natural owner near the root, and **low frequency** of change. The authenticated user, the theme, the language, feature flags, a toast/notification service: yes. The text of a search box, a form\'s fields, the hover state of a list: no, keep them local or lift them a little.',
      'Context is not a state manager: it shares a value but does not cache server data, does not let a component subscribe to only part of the value, and does not log or undo changes. When you need those, see [Server state vs UI state](#/browser/shared-state/server-vs-ui-state) and [Store libraries](#/browser/shared-state/store-libraries).',
    ],
    table: { caption: 'Choosing how to share a value', head: ['Question', 'If yes'],
      rows: [
        ['Only one component uses it?', 'local state in that component'],
        ['Siblings or a parent and a child need it?', 'lift it to the closest common parent, pass props'],
        ['The path goes through wrappers (Layout, Card, Page)?', 'composition: pass elements as `children` or slots'],
        ['Many components at different depths, changes rarely?', 'context with a provider component'],
        ['It is a copy of data that lives on a server?', 'a data-fetching cache (or a custom hook), not context'],
      ] },
    example: 'The state-tree tool flags the cases where context is overkill. Choose "Search filter text", switch to Context and place the provider on TaskPage: the analysis says plain props would do, because nothing sits between TaskPage and the two components that use the filter.',
    practice: SHARED_TREE_LINK,
    mistake: 'Using context to avoid thinking about where state belongs. A context provider at the root holding the search text, the selected task and the open modal makes the root re-render the whole app\'s consumers on every keystroke, and hides which screen owns what. Place state first; reach for context for the few values that really are app-wide.' },

  /* ---- 4. An authentication context ----------------------------------------------------------- */
  { id: 'auth-context', hub: 'auth', topic: 'auth',
    title: 'An authentication context: user, token, log-in, log-out',
    summary: 'An `AuthProvider` owns who is logged in: the **user** and the **token** in state, an async `logIn(email, password)` that calls the API and stores both, and `logOut()` that forgets them. Components read it all with `useAuth()`.',
    body: [
      'Being logged in is app-wide, changes rarely and is needed by components far apart (the header shows the name, pages decide what to show, the API client needs the token): the textbook case for a context. The provider is the single source of truth for the session; nothing else stores a copy of the token.',
      '`logIn` talks to the server (see [Logging in from the front end](#/browser/data-fetching/login-request)): it posts the credentials, and on success stores `token` and `user` in state. On failure it **throws**, so the form that called it can show "Invalid email or password" next to the fields; the provider does not know about forms. `logOut` clears both (and, later, storage). Derived values such as `isLoggedIn = token !== null` or `isAdmin = user?.role === \'admin\'` are computed, not stored.',
      'The server is still the one that decides what a user may do. Hiding the "Delete user" button from non-admins is a convenience, not security: anyone can send the request by hand, so the API must check the token and the role on every request (see [Authentication vs authorisation](#/server/auth/authn-vs-authz)).',
    ],
    example: 'The box logs in against the mock API. Use `ana@example.com` (an admin) or `leo@example.com` (a student) with the password `password123`; try a wrong password to see the error come back from `logIn` to the form.',
    live: { kind: 'react', api: true, code: `import { createContext, useContext, useState } from 'react';

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
}` },
    mistake: 'Storing the password, or the whole log-in response "just in case", in the context. Once logged in, the front end needs the token and the public user fields only. A password kept in memory can leak through logs, error reports or dev tools; drop it as soon as the request has been sent.' },

  { id: 'persist-session', hub: 'auth', topic: 'auth',
    title: 'Staying logged in after a reload',
    summary: 'State lives in memory, so a reload logs the user out. To keep the session, the provider **saves** the token (and the user) to `localStorage` when they change and **restores** them once, when it is created.',
    body: [
      'A page reload starts the JavaScript from scratch: every `useState` goes back to its initial value. Restoring is therefore part of **creating** the state: read storage in a lazy initialiser, `useState(() => readSaved())`, so it runs once, before the first render, and the app never flashes a logged-out screen (see [useLocalStorage](#/browser/state-effects/use-local-storage) for the same idea as a hook). Saving is synchronisation with an external system, so it is an **effect** on the session: write it when it is set, remove it when it is `null`.',
      'A restored token may be **stale**: it expired while the tab was closed, or the server changed its secret. Two common answers. Let the first API call find out: a `401` with a token triggers log-out in one place (see [Handling 401](#/browser/data-fetching/handle-401) and [Sharing the token with the API client](#/browser/shared-state/token-and-api-client)). Or check at start-up with a "who am I" request (`GET /api/auth/me` on servers that have one) and keep a third status, **checking**, while it runs, so protected screens wait instead of redirecting to the log-in page and back.',
      'Storage only holds strings, so save JSON and parse it in a `try/catch`: storage can be blocked, full or contain garbage, and the app must still start (logged out). Use one key (`session`) for token and user, so they cannot drift apart.',
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
    example: 'The preview frame blocks `localStorage`, so the box falls back to a variable in memory (your app uses the real storage). Log in, then press **Simulate a reload**: the provider is created again (a new `key`), its initialiser finds the saved session and you stay logged in. Log out and reload: the session is gone.',
    live: { kind: 'react', code: `import { createContext, useContext, useEffect, useState } from 'react';

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
}` },
    mistake: 'Restoring in an effect: `useEffect(() => setToken(localStorage.getItem(\'token\')), [])`. The first render runs with `token = null`, so a protected page redirects to the log-in page before the effect restores the token, and the user lands on the log-in screen although they are logged in. Read storage in the lazy initialiser, before the first render.' },

  { id: 'token-storage', hub: 'auth', topic: 'auth',
    title: 'Where to keep the token: the security trade-off',
    summary: 'A token in **memory** is lost on reload; in **localStorage** it survives but any script on the page can read it; in an **httpOnly cookie** set by the server JavaScript cannot read it at all, but cookies bring their own rules (CSRF, CORS credentials).',
    body: [
      'A bearer token is as good as the password until it expires: whoever holds it is you. The real threat to a token in the browser is **XSS** (cross-site scripting): some script that is not yours runs in your page, through an injection bug or a compromised npm package. Such a script can read `localStorage` and send the token anywhere. It cannot read an **httpOnly** cookie, because the browser never exposes that cookie to JavaScript (see [Cookie flags](#/server/auth/cookie-flags)).',
      'That does not make cookies free. The browser attaches cookies **automatically**, so another site can make the user\'s browser send a request with them (**CSRF**); `SameSite=Lax` or `Strict` and checking the `Origin` header defend against it. A front end on another origin also needs `credentials: \'include\'` and a server that allows credentials (see [CORS with credentials](#/server/auth/cors-credentials)). And an XSS script can still *use* the cookie by sending requests from the page while it is open; it just cannot steal it for later.',
      'A reasonable path: start with the token in context plus `localStorage`, keep tokens **short-lived**, never render user input as HTML (React escapes text by default; avoid `dangerouslySetInnerHTML`), and keep dependencies few and updated. When the stakes rise, move to an httpOnly, `Secure`, `SameSite` cookie session. Compare the server side of the same choice in [Sessions vs tokens](#/server/auth/sessions-vs-tokens) and [How the token travels](#/server/auth/token-transport).',
    ],
    table: { caption: 'Three places for the session', head: ['Where', 'Survives a reload', 'Readable by any script on the page', 'Sent automatically', 'Watch out for'],
      rows: [
        ['memory (state / context)', 'no', 'only while the page is open', 'no', 'users logged out on every reload'],
        ['`localStorage`', 'yes', 'yes', 'no (you add the header)', 'XSS steals it'],
        ['httpOnly cookie', 'yes', 'no', 'yes, by the browser', 'CSRF, CORS credentials'],
      ] },
    example: 'With a token in `localStorage`, open the browser\'s dev tools on your own app, Application tab, Local Storage: the token is right there in plain text, and so is it for any script running in the page. With an httpOnly cookie, the Cookies panel shows it, but `document.cookie` in the console does not include it.',
    mistake: 'Believing that `localStorage` is "encrypted" or private to your code, or that `sessionStorage` is safer against XSS. Both are readable by any script running on the page; `sessionStorage` only differs in lasting until the tab closes. The protection against token theft is not the storage name but preventing XSS, and httpOnly cookies when that is not enough.' },

  { id: 'token-and-api-client', hub: 'auth', topic: 'auth',
    title: 'Sharing the token with the API client',
    summary: 'The **API client** needs the current token, and a `401` must log the user out. Let the auth provider create the client with the token and its own `logOut` as the `onUnauthorized` handler, and expose it through the context.',
    body: [
      'The API client is plain JavaScript; the token is React state. The client must never keep its own copy of the token (two sources of truth: log out and the client keeps sending the old token). Two clean ways to connect them. **Build the client in the provider**: `const api = useMemo(() => createClient({ token, onUnauthorized: logOut }), [token])`, and expose `api` in the context; when the token changes, components get a client with the new one. Or keep a **module-level client** with a `getToken()` callback that the provider registers once, which suits code outside React (for example a router loader).',
      'Log-out on 401 belongs in the same place: the client detects "I sent a token and the server refused it" and calls `onUnauthorized`; the provider\'s `logOut` clears the session and storage, and the UI falls back to the logged-out state (with the router, a redirect to `/login`; see [Protected routes](#/browser/routing/protected-routes)). The [Handling 401](#/browser/data-fetching/handle-401) card explains why only a 401 **with** a token means "session expired", and why 403 must not log anyone out.',
      'Components then ask the context for the client (`const { api } = useAuth()`) or use a small hook (`useApi()`), and never build headers themselves. Hooks that load data take the client from there too, so every request in the app carries the same, current token.',
    ],
    code: `function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession);
  const logOut = useCallback(() => setSession(null), []);
  const token = session?.token ?? null;
  const api = useMemo(() => createClient({ token, onUnauthorized: logOut }), [token, logOut]);
  const value = useMemo(() => ({ user: session?.user ?? null, api, logOut /* , logIn */ }), [session, api, logOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}`,
    example: 'The box starts with a token "restored from storage days ago" that the server no longer accepts. Press **Create a user**: the client gets 401 with a token, calls the provider\'s `logOut`, and the token disappears. Log in as Ana (a real call to the mock API) and create again: 201. Log out and try once more: 401 without a token is just an error, not a log-out.',
    live: { kind: 'react', api: true, code: `import { createContext, useContext, useMemo, useState } from 'react';

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
}` },
    mistake: 'Reading the token from `localStorage` inside the client on every request. It looks like a single source, but now there are two: the context says "logged out" while storage still has the token (or the other way round after a failed write), and logging out in one tab behaves differently from another. The provider owns the session; storage is only its backup.' },

  /* ---- 5. Server state and stores ------------------------------------------------------------- */
  { id: 'server-vs-ui-state', hub: 'stores', topic: 'stores',
    title: 'Server state vs UI state',
    summary: '**UI state** belongs to the interface (is the menu open, what is typed, which tab is active). **Server state** is a copy of data that lives on a server (the tasks, the users): it can go stale, is shared by many screens and must be refetched after changes.',
    body: [
      'The two kinds behave differently. UI state is **owned** by the front end: it is right by definition, and nobody else changes it. Server state is only **borrowed**: the moment you receive the tasks, someone else may change them; two screens that loaded them separately can show different versions; and after you create a task, every copy you hold is out of date until you refetch it.',
      'Most of the hard parts of a front end are server-state problems: loading and error states, duplicate requests for the same data, deciding when to refetch, updating the list after a write (see [After a write](#/browser/data-fetching/after-write)), cancelling outdated requests. A custom hook such as [useFetch](#/browser/state-effects/use-fetch) solves them for **one** component; it does not share the data: two components calling it make two requests and keep two copies.',
      'So keep the two apart. UI state: `useState`, lifted or in a context as the previous cards describe. Server state: in one place per resource (a hook used by the closest common parent, which passes it down), and when many screens share the same server data, a **data-fetching cache** ([next card](#/browser/shared-state/query-cache)) that keeps one copy per request.',
    ],
    table: { caption: 'Which kind is it?', head: ['Value', 'Kind', 'Where it goes'],
      rows: [
        ['is the side menu open', 'UI', 'local state'],
        ['the search text', 'UI', 'lifted state, or the URL (`?search=`)'],
        ['the logged-in user and token', 'UI (the session)', 'auth context'],
        ['the list of tasks from `GET /api/tasks`', 'server', 'a fetching hook or a query cache'],
        ['the task being edited (unsaved)', 'UI (a draft)', 'local state in the form'],
      ] },
    example: 'In the box, the header and the list both call the same `useTasks()` hook. The console shows **two** identical requests. Add a task from the list: the list refetches its copy, the header keeps its old count. Two copies of server state, two truths.',
    live: { kind: 'react', api: true, code: `import { useEffect, useState } from 'react';

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
}` },
    mistake: 'Loading the tasks once into a global context "so every screen has them" and never refetching. The context now holds a snapshot that ages: another user\'s changes never appear, and each write needs hand-written code to patch the global list. Server data needs a plan for staleness, not just a place to live.' },

  { id: 'query-cache', hub: 'stores', topic: 'stores',
    title: 'Data-fetching caches (TanStack Query)',
    summary: 'A **data-fetching cache** keeps one copy of each server response under a **key** (`[\'tasks\']`), shares it with every component that asks for the same key, removes duplicate requests and refetches when you **invalidate** the key after a write. TanStack Query (formerly React Query) and SWR are the common libraries.',
    body: [
      'The idea fits in one sentence: components do not own server data, they **subscribe** to it by key. The first component that asks for `[\'tasks\']` triggers the request; the others wait for the same promise; everyone re-renders when the data arrives. After a `POST`, you do not patch lists by hand: you say "the tasks are stale" (`invalidateQueries({ queryKey: [\'tasks\'] })`) and the cache refetches once and updates every subscriber.',
      'On top, the libraries handle what is tedious to write: `isPending` / `isError` / `data` states, retries, refetching when the window regains focus, keeping old data while a new page loads, cancelling, and optimistic updates (see [Optimistic updates](#/browser/data-fetching/optimistic-updates)). The key includes the parameters (`[\'tasks\', { search, page }]`), so each combination is cached separately.',
      'You do not need one to build a solid app: a custom hook per resource plus lifting covers small and medium projects. Reach for a cache when several screens share the same data, when you write the same refetch-after-write code again and again, or when the app should feel instant when going back to a page. The library is a dependency to install (`npm install @tanstack/react-query`); it is not available in the boxes of this site, so the box below writes a toy version by hand.',
    ],
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
    example: 'The box is the previous card\'s app with a 20-line toy cache. The console shows **one** request although two components ask for the tasks. Add a task: the cache refetches once and **both** components update.',
    live: { kind: 'react', api: true, code: `import { useEffect, useState } from 'react';

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
}` },
    mistake: 'Copying the query\'s data into `useState` (`const [tasks, setTasks] = useState(data)` and an effect to sync it). That recreates the second source of truth the cache exists to remove: the copy misses every refetch. Read `data` from the hook directly; for edits, keep a separate draft.' },

  { id: 'store-libraries', hub: 'stores', topic: 'stores',
    title: 'Store libraries: Redux Toolkit and Zustand',
    summary: 'A **store** is an object outside the component tree that holds app-wide state; components **subscribe to the slice they select** and re-render only when that slice changes. Redux Toolkit and Zustand are common libraries; most apps of moderate size do not need one.',
    body: [
      'A context re-renders every consumer when its value changes. A store changes the deal: each component passes a **selector**, a function that picks what it needs (`(s) => s.cart.count`), and re-renders only when the selected value changes. Updates go through named functions (Zustand) or **actions** handled by **reducers** (Redux), so every change to shared state happens in one known place and can be logged, replayed or inspected in dev tools.',
      '**Zustand** is small: `create((set) => ({ count: 0, inc: () => set((s) => ({ count: s.count + 1 })) }))` returns a hook; no provider needed. **Redux Toolkit** is more structured: slices with reducers, a `configureStore`, a `<Provider>` and `useSelector` / `useDispatch`; it suits large teams that want strict conventions, and includes RTK Query, a data-fetching cache. Neither is available in the boxes of this site; the box below hand-writes the core idea with React\'s own `useSyncExternalStore`.',
      'When does a store pay off? Many components change and read the same complex client state (a drawing editor, a cart with rules, an offline-first app), you need fine-grained re-renders, or you want time-travel debugging. For the usual app (a session, a theme, server data and local forms), lifted state, an auth context and a fetching hook or query cache cover it, with fewer concepts and dependencies.',
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
    example: 'The box builds a 10-line store with `useSyncExternalStore`. `Count` selects `count`, `Theme` selects `theme`. Press **+1**: only `Count` logs a render. Press **Theme**: only `Theme` does. With one context holding both, both would re-render every time.',
    live: { kind: 'react', code: `import { useSyncExternalStore } from 'react';

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
}` },
    mistake: 'Moving every piece of state into the store, including form fields and whether a dropdown is open. The store then becomes a global variable with extra steps: components depend on it for things only they use, tests need it set up, and you lose the "state lives where it is used" rule. Keep local state local even when a store exists.' },

  { id: 'choosing-state-home', hub: 'stores', topic: 'stores',
    title: 'Putting it together: a home for every piece of state',
    summary: 'For each value ask, in order: is it derived (compute it), used by one component (local), by a few nearby (lift it), part of the URL (put it there), app-wide and slow-changing (context), or server data (a fetching hook or cache)? A store is for what is left.',
    body: [
      'The questions go from the cheapest answer to the most powerful one, and you stop at the first yes. Most values stop early: in a typical screen, the majority of state is local form input and derived values, a few values are lifted to the page, and the app has one or two contexts.',
      'The **URL** is a place for state too: the current screen, the id of the item shown, and often the search text, filters and page number (`/tasks?search=api&page=2`). State in the URL survives a reload, can be bookmarked and shared, and works with the back button, which lifted state does not. Routers give you hooks to read and write it (see [Query strings: useSearchParams](#/browser/routing/search-params)).',
      'Revisit placements as the app grows: state moves **up** when a new component needs it and **down** when the last distant reader is removed. The state-tree tool is a quick way to check a placement: who reads it, who only passes it on, and who re-renders.',
    ],
    table: { caption: 'A home for every value in a task app', head: ['Value', 'Home'],
      rows: [
        ['number of done tasks', 'derived during render'],
        ['the new-task title being typed', 'local state in the form'],
        ['the selected task in a list + detail split', 'lifted to the page (or `/tasks/:id` in the URL)'],
        ['search text and page number', 'the URL query string, or lifted state'],
        ['the logged-in user and token', 'an auth context, saved to storage'],
        ['the theme', 'a theme context, saved to storage'],
        ['the tasks from the server', 'a fetching hook per resource or a query cache'],
        ['a complex client-side editor document', 'a store library'],
      ] },
    example: 'Try the challenges of the state-tree tool in order: keep local state local, lift the filter, remove a duplicate, spot the drilling, fix it with composition, move the theme into a context, then predict the re-renders with and without `memo` and on log-out.',
    practice: SHARED_TREE_LINK,
    mistake: 'Deciding the "state management architecture" before writing the screens. The right home for a value comes from who uses it, which you only know once the components exist. Start with local state, lift when needed, and introduce a context, cache or store when a concrete pain (drilling, duplicate requests, too many re-renders) shows up.' },
];

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
