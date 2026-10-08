'use strict';
/* State and effects: concept cards, rail groups and self-check quiz (React as the worked example). */

DATA.en.STATE_QUIZ_TOPICS = {
  state: 'State and re-renders',
  snapshot: 'One render\'s snapshot',
  updates: 'What to store and how to update it',
  effects: 'Effects and dependencies',
  cleanup: 'Cleanup, refs and StrictMode',
  practice: 'Effects in practice',
};

DATA.en.STATE_GROUPS = [
  { key: 'state', label: 'State and re-renders', icon: 'state' },
  { key: 'snapshot', label: 'One render\'s snapshot', icon: 'steps' },
  { key: 'updates', label: 'What to store and how to update it', icon: 'cluster' },
  { key: 'effects', label: 'Effects and dependencies', icon: 'lifecycle' },
  { key: 'cleanup', label: 'Cleanup, refs and StrictMode', icon: 'loop' },
  { key: 'practice', label: 'Effects in practice', icon: 'func' },
];

/* Cards merged into their owners in Fetching data (the fetch lifecycle lives there). */
DATA.en.STATE_MOVED = {
  'four-ui-states': '#/browser/data-fetching/request-states',
  'abort-fetch': '#/browser/data-fetching/abort-controller',
  'use-fetch': '#/browser/data-fetching/fetch-hook',
};

DATA.en.STATE_CONCEPTS = [
  /* ---- 1. State and re-renders --------------------------------------------------------------- */
  { id: 'what-is-state', hub: 'state', topic: 'state',
    title: 'State, props and derived values',
    summary: 'An interface shows three kinds of data: **props** (given by the parent, read-only), **state** (remembered by the component and changed over time) and **derived values** (computed from the other two during render).',
    html: [
      '<p>A component is a function that turns data into a screen: <code>screen = f(data)</code>. What matters is where each piece of data comes from. Props arrive from outside, like the arguments of a call. State is the component\'s own memory: a value that survives from one render to the next and changes because something happened. Everything else is derived, so it is calculated, not stored.</p>',
      '<ol><li><strong>Does it come from the parent?</strong> A prop: read it, never change it.</li>'
        + '<li><strong>Can it be computed from props or other state?</strong> Derived: a plain <code>const</code> in the component body.</li>'
        + '<li><strong>Does it change over time, with nobody else giving it?</strong> Only then it is state, declared with <code>useState</code> (see <a href="#/browser/state-effects/use-state">useState and what a re-render is</a>).</li></ol>',
      '<table><caption>Which kind of data is it?</caption><thead><tr><th scope="col">Value</th><th scope="col">Kind</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row">The list of tasks passed by the parent</th><td>Prop</td><td>Someone else owns it</td></tr>'
        + '<tr><th scope="row">The text typed in the search box</th><td>State</td><td>Changes over time; nobody else knows it</td></tr>'
        + '<tr><th scope="row">The tasks that match the search</th><td>Derived</td><td>Computed from the list and the text</td></tr>'
        + '<tr><th scope="row">"3 of 5 done"</th><td>Derived</td><td>Counted from the list</td></tr>'
        + '<tr><th scope="row">Whether "Show done" is ticked</th><td>State</td><td>The user changes it</td></tr>'
        + '</tbody></table>',
      '<p>Keep state <strong>minimal</strong>: two stored copies of the same fact eventually disagree (see <a href="#/browser/state-effects/derived-values">Don\'t store what you can compute</a>).</p>',
    ],
    example: 'The Try it box receives `tasks` as a prop, keeps one piece of state (`showDone`) and derives two values (`visible` and `doneCount`). Untick the checkbox: only the state changes, and React recomputes both derived values on the next render.',
    live: { kind: 'react', code: `import { useState } from 'react';

const TASKS = [
  { id: 1, title: 'Write the API skeleton', done: true },
  { id: 2, title: 'Add full CRUD', done: false },
  { id: 3, title: 'Document the endpoints', done: true },
];

// prop
function TaskSummary({ tasks }) {
  // state
  const [showDone, setShowDone] = useState(true);
  // derived
  const visible = showDone ? tasks : tasks.filter((t) => !t.done);
  // derived
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <section>
      <label>
        <input type="checkbox" checked={showDone}
          onChange={(e) => setShowDone(e.target.checked)} /> Show done tasks
      </label>
      <p>{doneCount} of {tasks.length} done</p>
      <ul>
        {visible.map((t) => <li key={t.id}>{t.done ? '✓ ' : ''}{t.title}</li>)}
      </ul>
    </section>
  );
}

function App() {
  return <TaskSummary tasks={TASKS} />;
}` },
    mistake: 'Copying a prop into state: `const [tasks, setTasks] = useState(props.tasks)`. `useState` reads its argument **only on the first render**, so when the parent later passes a new list, this component keeps showing the old one. Read the prop directly; copy it into state only for an editable draft that should ignore later changes.' },

  { id: 'use-state', hub: 'state', topic: 'state',
    title: 'useState and what a re-render is',
    summary: '`const [value, setValue] = useState(initial)` gives a component one piece of memory; calling `setValue(next)` stores the new value and asks React to **re-render**.',
    html: [
      '<p>A component is a function, and a function forgets its local variables when it returns. That is why <code>let count = 0; count++</code> inside a component never shows anything: the next call starts from 0 again, and nothing tells React to call it. React keeps state <strong>outside</strong> the function, hands it back on every call, and the setter both updates it and schedules a new render.</p>',
      '<dl><dt>Render</dt><dd>React calls your component again, top to bottom, with the new value, to get a fresh description of the screen. Its children render too.</dd>'
        + '<dt>Commit</dt><dd>React compares that description with the previous one and changes only the parts of the DOM that differ (see <a href="#/browser/components/elements-and-rendering">Elements, rendering and the DOM</a>).</dd>'
        + '<dt>Same value</dt><dd>A setter called with the value it already has (by <code>Object.is</code>) skips the render.</dd></dl>',
      '<ul><li><strong>Naming:</strong> array destructuring, <code>[thing, setThing]</code>: <code>const [count, setCount] = useState(0)</code>.</li>'
        + '<li><strong>The initial value is used once,</strong> on the first render. If computing it is expensive (reading storage, for example), pass a function: <code>useState(() =&gt; load())</code>, a <strong>lazy initialiser</strong> that React calls only that first time.</li>'
        + '<li><strong>Per instance:</strong> two <code>&lt;Counter /&gt;</code> elements count separately.</li></ul>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'Every change goes round the same loop: setter, render, commit.',
      desc: 'The component shows its state. An event calls the setter with a new value. React renders: it calls the component again with the new value. Then it commits: it updates only the parts of the DOM that changed, and the screen shows the new state.',
      nodes: [
        { id: 'state', label: 'State value', note: 'kept by React', key: true },
        { id: 'event', label: 'An event', note: 'calls the setter' },
        { id: 'render', label: 'Render', note: 'your function runs again' },
        { id: 'commit', label: 'Commit', note: 'React patches the DOM' },
      ],
      edges: [['state', 'event'], ['event', 'render', '`setCount(1)`'], ['render', 'commit'], ['commit', 'state']],
    },
    example: 'Click both buttons in the Try it box and watch its console. The `let clicks` variable is increased, but nothing re-renders and the next render starts it from 0 again. The state button re-renders, and the log shows the component running again with the new value.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  // a plain local variable
  let clicks = 0;
  console.log(\`App rendered: count = \${count}, clicks = \${clicks}\`);

  return (
    <>
      <button onClick={() => { clicks++; console.log('clicks is now', clicks); }}>
        Plain variable: {clicks}
      </button>
      <button onClick={() => setCount(count + 1)}>
        State: {count}
      </button>
    </>
  );
}` },
    mistake: 'Assigning to the state variable: `count = count + 1`. With `const` it throws a `TypeError`; with `let` it runs, but nothing tells React, so the screen never changes and the next render brings the old value back. Always go through the setter: the variable is a read-only copy for this render.' },

  { id: 'rules-of-hooks', hub: 'state', topic: 'state',
    title: 'The rules of hooks (and why)',
    summary: 'Call hooks (`useState`, `useEffect`, any `use…` function) only at the **top level** of a component or a custom hook, never inside conditions, loops, nested functions or after an early `return`.',
    html: [
      '<p>A hook call carries no name: <code>useState(0)</code> does not say "I am the count". React keeps a component\'s state as a <strong>list of slots</strong> and hands them out in <strong>call order</strong>: the first <code>useState</code> of a render gets slot 1, the second slot 2. So the order must be the same on every render; if a condition skips a hook once, every later hook receives its neighbour\'s slot, and React stops with "Rendered fewer hooks than expected".</p>',
      '<ul><li><strong>Top level, same order:</strong> no hook inside <code>if</code>, loops or nested functions.</li>'
        + '<li><strong>Before any early <code>return</code>:</strong> <code>if (!user) return &lt;Login /&gt;;</code> above a <code>useState</code> makes the number of hooks depend on <code>user</code>.</li>'
        + '<li><strong>Only from components or custom hooks</strong> (functions named <code>use…</code>), never from ordinary functions or event handlers.</li>'
        + '<li><strong>Conditions go inside the hook:</strong> <code>useEffect(() =&gt; { if (!enabled) return; … }, [enabled])</code>, or render a child conditionally, so its hooks live in the child.</li></ul>',
      '<p>The ESLint rule <code>react-hooks/rules-of-hooks</code>, in the Vite template, catches these mistakes as you type.</p>',
    ],
    code: `// Wrong: the hook only runs sometimes
function TaskDetail({ task }) {
  if (!task) return <p>Select a task</p>;
  // slot depends on task
  const [editing, setEditing] = useState(false);
  …
}

// Right: every hook first, then the early return
function TaskDetail({ task }) {
  const [editing, setEditing] = useState(false);
  if (!task) return <p>Select a task</p>;
  …
}`,
    example: 'The Try it box breaks the rule on purpose: an extra `useState` runs only when the checkbox is ticked. The first render works; tick the checkbox and React throws, because the second render calls one more hook than the first. Move the hook out of the `if` to fix it.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [details, setDetails] = useState(false);

  if (details) {
    // Breaks the rules: this hook only exists on some renders
    const [note, setNote] = useState('a note');
    console.log(note);
  }

  return (
    <label>
      <input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} />
      Show details (this breaks the component)
    </label>
  );
}` },
    mistake: 'Calling a hook inside an event handler: `onClick={() => { const [x, setX] = useState(0); … }}`. Handlers run outside rendering, so React cannot attach the state to the component and throws "Invalid hook call". Declare the state at the top level and use its setter in the handler.' },

  /* ---- 2. One render's snapshot -------------------------------------------------------------- */
  { id: 'state-snapshot', hub: 'snapshot', topic: 'snapshot',
    title: 'State is a snapshot of one render',
    summary: 'Inside one render a state variable is a **constant**: calling the setter does not change it, it queues a new value for the **next** render.',
    html: [
      '<p>When React calls your component, it hands it the state as it is at that moment, and every variable, handler and JSX expression created in that call keeps that value. The click handler of render 1 sees <code>count = 0</code> for as long as it lives, even after React has rendered again. The setter does run immediately; it just cannot reach back into variables that already exist.</p>',
      '<ul><li><strong>Two setters, one value:</strong> <code>setCount(count + 1); setCount(count + 1);</code> reads <code>count</code> twice from the same render (0) and twice queues "set it to 1".</li>'
        + '<li><strong>The log after a setter</strong> still prints the old value.</li>'
        + '<li><strong>A timer started in a click</strong> (<code>setTimeout(() =&gt; alert(count), 3000)</code>) shows that render\'s value, however many times you click meanwhile.</li></ul>',
      '<p>The code of one render is consistent from top to bottom. When the next state depends on the previous one, use an <a href="#/browser/state-effects/updater-functions">updater function</a>; the new value is there in the next render.</p>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'The handler of render 1 queues updates; only render 2 sees the new value.',
      desc: 'With count equal to 0, the click handler of render 1 calls setCount(count + 1) twice: both read 0, so React queues "set to 1" twice. The handler then logs count and still sees 0. React processes the queue and renders again: render 2 sees count equal to 1.',
      nodes: [
        { id: 'h', label: 'Handler (render 1)', note: '`count` is 0' },
        { id: 'q', label: 'React queue' },
        { id: 'r2', label: 'Render 2', key: true },
      ],
      edges: [['h', 'q', 'set to 0 + 1'], ['h', 'q', 'set to 0 + 1'], ['h', 'h', 'logs `count`: 0'], ['q', 'r2', '`count` is 1']],
    },
    example: 'In the Try it box, click **+3?**: it calls `setCount(count + 1)` three times and logs `count` afterwards. The console says 0, and the screen shows 1. Then open the render-cycle visualiser in this card, choose "Two setCount(count + 1) calls" and step through the queue.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    console.log('right after three setters, count is', count);
    setTimeout(() => console.log('3 s later this click still sees', count), 3000);
  }

  return <button onClick={handleClick}>+3? Count: {count}</button>;
}` },
    widget: 'render-cycle',
    mistake: 'Reading state right after setting it to decide something: `setQuery(text); fetchResults(query);` sends the **old** query. Use the value you just computed (`fetchResults(text)`), or let an effect react to the new `query` after the render.' },

  { id: 'updater-functions', hub: 'snapshot', topic: 'snapshot',
    title: 'Updater functions: new state from the previous state',
    summary: 'Pass the setter a function instead of a value, `setCount((c) => c + 1)`, and React calls it with the **latest** queued value; use it whenever the next state depends on the previous one.',
    html: [
      '<p>A value tells React "make it this"; a function tells React "whatever it is by then, do this to it". React keeps a queue of an event\'s updates and processes them in order on the next render: a value replaces the result so far, an updater receives the result so far and returns the next one. Three <code>setCount((c) =&gt; c + 1)</code> calls go 0 → 1 → 2 → 3.</p>',
      '<ul><li><strong>Where it matters most:</strong> code that runs later than its render: an interval started by an effect, a promise callback, a handler that queues several updates. The captured variable may be stale; the updater\'s argument never is.</li>'
        + '<li><strong>Naming:</strong> the parameter is up to you; common choices are the first letter (<code>c</code> for count) or <code>prev</code>.</li>'
        + '<li><strong>Pure:</strong> an updater only computes and returns the next value. No <code>fetch</code>, no changes to other variables: in development, StrictMode calls updaters twice to expose them.</li></ul>',
    ],
    code: `setCount(count + 1);
// → "make it 1" (if count is 0 in this render)
setCount((c) => c + 1);
// → "add one to whatever it is by then"

// Mixing: value then updater
// queue: replace with 10
setCount(10);
// queue: 10 → 20   (next render: 20)
setCount((c) => c * 2);`,
    example: 'The Try it box has the same three-call button, this time with updaters, so a click adds 3. The **Reset then +1** button queues a value and then an updater: the queue goes "replace with 0" → "0 + 1", and the screen shows 1.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function resetThenOne() {
    // a value: replace
    setCount(0);
    // an updater: receives 0
    setCount((c) => c + 1);
  }

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={addThree}>+3</button>
      <button onClick={resetThenOne}>Reset then +1</button>
    </>
  );
}` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Step through "Two updater functions" in the visualiser' },
    mistake: 'Using an updater everywhere "to be safe" while still reading the stale variable inside it: `setTotal((t) => t + price * count)` is fine only if `price` and `count` are current. The updater protects the variable it receives, not every other variable it closes over.' },

  { id: 'batching', hub: 'snapshot', topic: 'snapshot',
    title: 'Batching: many updates, one render',
    summary: 'React waits until the code that queued updates has finished (an event handler, a timer callback, a promise callback) and then renders **once** for all of them: **batching**.',
    html: [
      '<p>While your handler runs, every setter call only writes to a queue. When the handler returns, React processes the queue and renders once: five setters on three state variables in one click still mean one render and one commit. So no render ever sees a half-updated state, such as <code>loading = false</code> with the old <code>tasks</code>.</p>',
      '<ul><li><strong>Everywhere since React 18:</strong> in event handlers, inside <code>setTimeout</code>, after an <code>await</code>, in promise callbacks. Older versions batched only event handlers, which is why old articles call it an exception.</li>'
        + '<li><strong>The escape hatch</strong> for the rare case where the DOM must be updated before the next line (to measure it or scroll to a new element) is <code>flushSync</code> from <code>react-dom</code>.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Setters only queue; React renders once, when the code that queued them returns.',
      desc: 'A click handler runs and calls several setters, which only add updates to a queue. When the handler returns, React processes the whole queue in one render and one commit.',
      nodes: [
        { id: 'run', label: 'Handler runs', note: 'setters only queue' },
        { id: 'ret', label: 'Handler returns' },
        { id: 'render', label: 'One render', note: 'the whole queue', key: true },
        { id: 'commit', label: 'One commit' },
      ],
      edges: [['run', 'ret'], ['ret', 'render'], ['render', 'commit']],
    },
    example: 'Click the button in the Try it box. The handler updates two variables and also waits for a timer before updating them again. The console shows one render per batch: two renders for the whole click, not four.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('idle');
  console.log(\`render: count = \${count}, status = \${status}\`);

  function handleClick() {
    setCount((c) => c + 1);
    // same batch as the line above
    setStatus('saving');
    setTimeout(() => {
      setCount((c) => c + 1);
      // batched too, inside the timer
      setStatus('saved');
    }, 1000);
  }

  return <button onClick={handleClick}>{status}: {count}</button>;
}` },
    mistake: 'Expecting a render (and a log in the component body) per setter call, and splitting related state into many variables "so they update separately". They do not: every update of the same event lands in the same render. If two values always change together, consider one state object or one derived value.' },

  /* ---- 3. What to store and how to update it ------------------------------------------------- */
  { id: 'derived-values', hub: 'updates', topic: 'updates',
    title: 'Don\'t store what you can compute',
    summary: 'If a value can be calculated from props or existing state, compute it **during render** instead of keeping it in state: duplicated state has to be kept in sync by hand, and it eventually goes out of sync.',
    html: [
      '<p>Every extra piece of state is a promise to update it at the right moment. Store <code>tasks</code> and also <code>doneCount</code>, and every place that changes <code>tasks</code> must remember <code>doneCount</code> too; forget once and the screen lies. Compute <code>const doneCount = tasks.filter((t) =&gt; t.done).length</code> in the body instead, and it is correct by construction, on every render.</p>',
      '<ul><li><strong>Typical derived values:</strong> filtered or sorted lists, counts and totals, a full name from its parts, "is the form valid?", "is this the selected item?".</li>'
        + '<li><strong>Store an id, not a copy:</strong> keep <code>selectedId</code> and find the item during render. A copy of the object goes stale when the list is edited; the id does not.</li>'
        + '<li><strong>Recomputing is cheap:</strong> filtering a few hundred items takes microseconds. Only a measured, truly heavy calculation deserves <code>useMemo</code> (see <a href="#/browser/shared-state/memo-hooks">Memoising: useMemo, useCallback and memo</a>).</li>'
        + '<li><strong>Never an effect for it:</strong> an effect that copies a computed value into state renders first with the stale value, then again with the right one (see <a href="#/browser/state-effects/no-effect-needed">You might not need an effect</a>).</li></ul>',
    ],
    code: `// Duplicated: a second list that every update must remember to change
const [tasks, setTasks] = useState(START);
// goes stale on the first missed update
const [visible, setVisible] = useState(START);

// Derived during render: always right
const visible = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));`,
    example: 'The Try it box filters a task list as you type. There are exactly two pieces of state, `tasks` and `search`; `visible` and the counter are computed in the body. Toggle a task and the counter stays correct with no extra code.',
    live: { kind: 'react', code: `import { useState } from 'react';

const START = [
  { id: 1, title: 'Write the API skeleton', done: true },
  { id: 2, title: 'Add full CRUD', done: false },
  { id: 3, title: 'Return the right status codes', done: false },
];

function App() {
  const [tasks, setTasks] = useState(START);
  const [search, setSearch] = useState('');

  const visible = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  const pending = tasks.filter((t) => !t.done).length;

  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <>
      <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <p>{pending} pending · showing {visible.length}</p>
      <ul>
        {visible.map((t) => (
          <li key={t.id}>
            <label><input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} /> {t.title}</label>
          </li>
        ))}
      </ul>
    </>
  );
}` },
    mistake: 'Storing the selected object: `const [selected, setSelected] = useState(task)`. Rename the task in the list and the detail panel still shows the old title, because it holds a separate copy. Store `selectedId` and derive `const selected = tasks.find((t) => t.id === selectedId)`.' },

  { id: 'immutable-objects', hub: 'updates', topic: 'updates',
    title: 'Updating objects in state: replace, never mutate',
    summary: 'Treat objects in state as **read-only**: to change one field, create a new object with the spread syntax, `setTask({ ...task, done: true })`; changing the existing object (`task.done = true`) does not re-render.',
    html: [
      '<p>React decides whether something changed with <code>Object.is</code>, which for objects asks "is it the <strong>same</strong> object?", not "does it hold the same data?" (see <a href="#/browser/js/value-reference">Values vs references</a>). Mutate the object and pass it back, and React sees the same reference: no change, no render. Even when another update renders, the mutation has edited the previous render\'s object behind its back.</p>',
      '<dl><dt><code>{ ...task, done: true }</code></dt><dd>A new object with every property of <code>task</code>; properties written after the spread win.</dd>'
        + '<dt>Nested objects</dt><dd>Copy <strong>every level</strong> you change: <code>{ ...user, address: { ...user.address, city: \'Madrid\' } }</code>. The spread is shallow, so the untouched nested objects are shared, which is fine as long as nobody mutates them.</dd>'
        + '<dt>One handler for every field</dt><dd>A computed property name: <code>setForm({ ...form, [e.target.name]: e.target.value })</code>, with <code>name="title"</code> on the input.</dd></dl>',
      '<p>Deep nesting that needs many copies is often a sign the state shape should be flatter.</p>',
    ],
    code: `const [task, setTask] = useState({ id: 1, title: 'Add full CRUD', done: false });

// Wrong: same object, React sees no change
task.done = true;
setTask(task);

// Right: a new object
setTask({ ...task, done: true });

// Nested: copy each level you touch
setUser({ ...user, address: { ...user.address, city: 'Madrid' } });`,
    example: 'The Try it box has a small edit form whose state is one object. **Toggle (mutating)** changes the object in place and calls the setter: nothing happens on screen. **Toggle (new object)** works. Type in the title after a mutating click and the hidden change suddenly appears, because typing causes a render.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [task, setTask] = useState({ title: 'Add full CRUD', done: false });

  function mutate() {
    // edits the object of this render
    task.done = !task.done;
    // same reference: React skips the render
    setTask(task);
  }

  function replace() {
    setTask({ ...task, done: !task.done });
  }

  return (
    <>
      <input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
      <p>{task.title}: {task.done ? 'done' : 'pending'}</p>
      <button onClick={mutate}>Toggle (mutating)</button>
      <button onClick={replace}>Toggle (new object)</button>
    </>
  );
}` },
    mistake: 'Believing `const` protects the object. `const [task, setTask]` only stops you from reassigning the name; `task.done = true` is still allowed and is exactly the mutation React cannot see.' },

  { id: 'immutable-arrays', hub: 'updates', topic: 'updates',
    title: 'Updating arrays: spread, map and filter',
    summary: 'Add with spread (`[...tasks, newTask]`), remove with `filter`, change one item with `map` and a new object, and sort a copy; never `push`, `splice`, assign by index or `sort` the array in state.',
    html: [
      '<p>Arrays follow the same rule as objects: React needs a <strong>new array</strong> to notice a change. The array methods split into two families (see <a href="#/browser/js/array-methods">Array methods</a>): <code>map</code>, <code>filter</code>, <code>slice</code>, <code>concat</code> and the spread <strong>return a new array</strong>, safe; <code>push</code>, <code>pop</code>, <code>shift</code>, <code>unshift</code>, <code>splice</code>, <code>sort</code>, <code>reverse</code> and <code>arr[i] = x</code> <strong>change it in place</strong>, forbidden on state.</p>',
      '<table><caption>Array operations on state</caption><thead><tr><th scope="col">Goal</th><th scope="col">Avoid (mutates)</th><th scope="col">Use (new array)</th></tr></thead><tbody>'
        + '<tr><th scope="row">Add</th><td><code>tasks.push(t)</code></td><td><code>[...tasks, t]</code></td></tr>'
        + '<tr><th scope="row">Remove</th><td><code>tasks.splice(i, 1)</code></td><td><code>tasks.filter((x) =&gt; x.id !== id)</code></td></tr>'
        + '<tr><th scope="row">Change one</th><td><code>tasks[i].done = true</code></td><td><code>tasks.map((x) =&gt; x.id === id ? { ...x, done: true } : x)</code></td></tr>'
        + '<tr><th scope="row">Sort</th><td><code>tasks.sort(cmp)</code></td><td><code>[...tasks].sort(cmp)</code> or <code>tasks.toSorted(cmp)</code></td></tr>'
        + '<tr><th scope="row">Insert at i</th><td><code>tasks.splice(i, 0, t)</code></td><td><code>[...tasks.slice(0, i), t, ...tasks.slice(i)]</code></td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Changing one item:</strong> <code>map</code> gives a new array, and the changed item must also be a <strong>new object</strong>; untouched items are reused as they are.</li>'
        + '<li><strong>Updates that run later</strong> (after an <code>await</code>, in a timer) use the updater form, <code>setTasks((prev) =&gt; [...prev, created])</code>, so two quick additions both survive.</li></ul>',
    ],
    example: 'The Try it box is a complete little task list with add, toggle and delete, all with new arrays. The **Add with push** button shows the broken version: the console proves the item went into the array, but the screen does not show it until some other update renders.',
    live: { kind: 'react', code: `import { useState } from 'react';

let nextId = 3;

function App() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Write the API skeleton', done: true },
    { id: 2, title: 'Add full CRUD', done: false },
  ]);

  const add = () => setTasks([...tasks, { id: nextId++, title: \`Task \${nextId - 1}\`, done: false }]);
  const addWithPush = () => {
    tasks.push({ id: nextId++, title: 'Pushed task', done: false });
    console.log('array length is now', tasks.length);
    // same array: no render
    setTasks(tasks);
  };
  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTasks(tasks.filter((t) => t.id !== id));

  return (
    <>
      <button onClick={add}>Add</button> <button onClick={addWithPush}>Add with push</button>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <label><input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} /> {t.title}</label>
            <button onClick={() => remove(t.id)} aria-label={\`Delete \${t.title}\`}>✕</button>
          </li>
        ))}
      </ul>
    </>
  );
}` },
    mistake: 'Sorting for display with `tasks.sort(...)` inside the JSX or the body. It reorders the state array in place during render, so the "original" order is lost and other components that share the array see it change. Sort a copy, or better, derive a sorted copy: `const sorted = tasks.toSorted(byTitle)`.' },

  /* ---- 4. Effects and dependencies ----------------------------------------------------------- */
  { id: 'what-is-effect', hub: 'effects', topic: 'effects',
    title: 'Effects: synchronising with something outside React',
    summary: 'An **effect** (`useEffect(setup, deps)`) is code that runs **after** React has updated the page, to keep something outside React in sync with the current props and state: a timer, a request, a browser API, a listener, a connection.',
    html: [
      '<p>Rendering must be a pure calculation: same props and state, same JSX, nothing else touched. But apps must also talk to the world outside React, and those <strong>side effects</strong> cannot run during render (React may render several times, or throw a render away). <code>useEffect</code> gives them a place: React runs the setup <strong>after the commit</strong>, once the screen is up to date.</p>',
      '<dl><dt>Setup</dt><dd>Starts the synchronisation: connect, subscribe, start the timer.</dd>'
        + '<dt>Cleanup</dt><dd>The function the setup returns. It stops the synchronisation: disconnect, unsubscribe, clear the timer (see <a href="#/browser/state-effects/effect-cleanup">Cleanup</a>).</dd>'
        + '<dt>Dependencies</dt><dd>The values the effect reads. When they change, React stops the old synchronisation and starts a new one (see <a href="#/browser/state-effects/dependency-array">The dependency array</a>).</dd></dl>',
      '<p>Think <strong>synchronisation</strong>, not "lifecycle events": "while this component is on the screen with these values, the outside world should look like this". With no outside system involved you probably need no effect at all (see <a href="#/browser/state-effects/no-effect-needed">You might not need an effect</a>).</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'An effect runs after the page is up to date, never during render.',
      desc: 'React renders the component, which only calculates the JSX. It commits the changes to the DOM. Only then does the effect\'s setup run, to synchronise something outside React.',
      nodes: [
        { id: 'render', label: 'Render', note: 'pure: computes JSX' },
        { id: 'commit', label: 'Commit', note: 'the DOM is updated' },
        { id: 'setup', label: 'Effect setup', note: 'syncs the outside world', key: true },
      ],
      edges: [['render', 'commit'], ['commit', 'setup']],
    },
    code: `import { useEffect } from 'react';

useEffect(() => {
  // setup: runs after the commit
  const id = setInterval(tick, 1000);
  // cleanup: undoes the setup
  return () => clearInterval(id);
// dependencies: when to re-synchronise
}, []);`,
    example: 'The Try it box subscribes to the pointer position only while the checkbox is ticked. The effect depends on `tracking`: ticking starts a `pointermove` listener, unticking runs the cleanup, which removes it. Move the pointer over the preview and watch the console.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function App() {
  const [tracking, setTracking] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // nothing to synchronise
    if (!tracking) return;
    console.log('subscribe to pointermove');
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    return () => {
      console.log('unsubscribe');
      window.removeEventListener('pointermove', onMove);
    };
  }, [tracking]);

  return (
    <div style={{ minHeight: 160 }}>
      <label>
        <input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} />
        Track the pointer
      </label>
      <p>x = {pos.x}, y = {pos.y}</p>
    </div>
  );
}` },
    mistake: 'Calling `fetch`, `setInterval` or `addEventListener` directly in the component body. The body runs on **every** render: each keystroke adds another listener or timer, and a `setState` in the body triggers another render, which runs the body again: an infinite loop.' },

  { id: 'dependency-array', hub: 'effects', topic: 'effects',
    title: 'The dependency array: none, [] and [x]',
    summary: 'The second argument of `useEffect` lists the values the effect reads, and decides when it runs: after every render, after the first render only, or whenever a listed value changed.',
    html: [
      '<p>React cannot look inside your effect, so you tell it what the effect depends on. After every commit React compares each listed value with the previous run (with <code>Object.is</code>); if any differs, it runs the old cleanup and then the effect again. If none differs, it skips the effect.</p>',
      '<table><caption>When does the effect run?</caption><thead><tr><th scope="col">Second argument</th><th scope="col">Runs after</th><th scope="col">Typical use</th></tr></thead><tbody>'
        + '<tr><th scope="row">(none)</th><td>Every render</td><td>Rare: syncing with something that depends on everything</td></tr>'
        + '<tr><th scope="row"><code>[]</code></th><td>The first render only (and its cleanup on unmount)</td><td>A connection or listener that never changes</td></tr>'
        + '<tr><th scope="row"><code>[roomId]</code></th><td>The first render, and when <code>roomId</code> changes</td><td>Fetch or subscribe for the current id</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>List every value the effect reads:</strong> props, state and values derived from them. Leave one out and the effect keeps using an old value (see <a href="#/browser/state-effects/stale-closures">Stale closures</a>). The ESLint rule <code>react-hooks/exhaustive-deps</code>, installed by Vite\'s React template, warns about missing ones: treat its warnings as bugs.</li>'
        + '<li><strong>Need not be listed:</strong> setters from <code>useState</code> and values defined outside the component never change.</li>'
        + '<li><strong>Objects and functions made during render are new every time:</strong> <code>[options]</code> with <code>const options = { search }</code> in the body behaves like no array. List the primitive (<code>[search]</code>) or build the object inside the effect.</li></ul>',
    ],
    example: 'The Try it box has three effects, one of each kind, and logs when each runs. Click **+1** and type in the input: after the click A and C run; after typing only A runs. The render-cycle visualiser has the same component as the scenario "No array, [] and [count]".',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  console.log(\`render: count = \${count}, text = "\${text}"\`);

  useEffect(() => {
    console.log('A (no array): after every render');
  });
  useEffect(() => {
    console.log('B ([]): after the first render only');
  }, []);
  useEffect(() => {
    console.log(\`C ([count]): count is \${count}\`);
  }, [count]);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </>
  );
}` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Predict which effects run in the visualiser' },
    mistake: 'Removing a dependency to stop an effect from running "too often", for example deleting `query` from `[query]`. The effect stops re-running, but it now fetches the old query forever. If an effect runs too often, fix the reason (an object created in render, a value that should be derived), never the array.' },

  { id: 'stale-closures', hub: 'effects', topic: 'effects',
    title: 'Stale closures in effects and timers',
    summary: 'A function created during a render **closes over** that render\'s values; if an effect keeps it alive (an interval, a listener) without re-running, it keeps reading old values: a **stale closure**.',
    html: [
      '<p>A <strong>closure</strong> is a function together with the variables it could see when it was created (see <a href="#/browser/js/function-scope">Function scope</a>). Each render has its own <code>count</code> constant, so an interval callback created in render 1 remembers render 1\'s <code>count</code> forever. With an empty dependency array the effect never runs again, the interval is never replaced, and it reports 0 while the button shows 5.</p>',
      '<dl><dt>Fix 1: list the value</dt><dd><code>[count]</code>: every change cleans up the old interval and starts a new one with a fresh closure.</dd>'
        + '<dt>Fix 2: stop reading it</dt><dd>If the callback only changes the state, give the setter an updater, <code>setCount((c) =&gt; c + 1)</code>. React passes the current value, so <code>[]</code> is truthful and one interval is enough.</dd>'
        + '<dt>Rare cases</dt><dd>A callback that must read the latest value without restarting can read it from a ref (see <a href="#/browser/state-effects/use-ref">useRef</a>).</dd></dl>',
      '<p>The same applies to listeners added in an effect, <code>setTimeout</code> callbacks and promise callbacks that read state. An incomplete dependency array is not an optimisation: it is a bug that shows up later.</p>',
    ],
    diagram: {
      kind: 'sequence',
      title: 'The interval was made in render 1, so it reads render 1\'s count forever.',
      desc: 'Render 1 has count 0 and its effect, with an empty dependency array, starts an interval. The user clicks five times: renders 2 to 6 show count 5, but the effect never runs again. Every second the interval, still the one from render 1, logs 0.',
      nodes: [
        { id: 'c', label: 'Component' },
        { id: 'i', label: 'Interval (render 1)', key: true },
      ],
      edges: [['c', 'c', 'render 1: count is 0'], ['c', 'i', 'effect `[]` starts it'], ['c', 'c', 'renders 2–6: count is 5'], ['i', 'i', 'logs 0, every second']],
    },
    example: 'In the Try it box, the button belongs to `App`, which passes `count` to a ticker. The **stale** ticker\'s effect has `[]`, so its interval logs 0 forever while you click. Switch to the **fixed** ticker: its effect lists `count`, re-runs after every click, and the log follows the button.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function StaleTicker({ count }) {
  useEffect(() => {
    const id = setInterval(() => console.log(\`stale ticker sees \${count}\`), 1000);
    return () => clearInterval(id);
  // count is missing: the linter would warn
  }, []);
  return <p>Stale ticker running</p>;
}

function FixedTicker({ count }) {
  useEffect(() => {
    const id = setInterval(() => console.log(\`fixed ticker sees \${count}\`), 1000);
    return () => clearInterval(id);
  // a new interval for every count
  }, [count]);
  return <p>Fixed ticker running</p>;
}

function App() {
  const [count, setCount] = useState(0);
  const [fixed, setFixed] = useState(false);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <label>
        <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
        Use the fixed ticker
      </label>
      {fixed ? <FixedTicker count={count} /> : <StaleTicker count={count} />}
    </>
  );
}` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Watch "A stale closure in an interval" step by step' },
    mistake: 'Fixing a stale closure by moving the variable out of React (`let latest = 0` at module level) or by reading it from the DOM. The component then has two sources of truth. Use the dependency array or an updater function first.' },

  { id: 'no-effect-needed', hub: 'effects', topic: 'effects',
    title: 'You might not need an effect',
    summary: 'Effects are for synchronising with **external** systems: compute values from props or state during render, and respond to what the user did in the **event handler**.',
    html: [
      '<p>Before writing <code>useEffect</code>, ask <strong>why</strong> the code runs. "Because the component is on screen and must stay in sync with something outside" is an effect. "Because the user clicked Save" belongs in the click handler, where you know exactly what happened. "Because some state changed and I need a value from it" is a calculation for the render body.</p>',
      '<p>"When X changes, set Y" effects cost an extra render each (the screen first shows the old Y), make the order of events hard to follow, and also run when you did not mean them to: on mount, twice in StrictMode, after X changes back and forth.</p>',
      '<table><caption>Effect or not?</caption><thead><tr><th scope="col">You want to…</th><th scope="col">Put it in…</th></tr></thead><tbody>'
        + '<tr><th scope="row">Show tasks filtered by the search text</th><td>Render (a derived <code>const</code>)</td></tr>'
        + '<tr><th scope="row">Send a POST when the user clicks Save</th><td>The click or submit handler</td></tr>'
        + '<tr><th scope="row">Clear the form after the POST succeeds</th><td>The same handler, after <code>await</code></td></tr>'
        + '<tr><th scope="row">Reset all state when an id prop changes</th><td><code>key={id}</code> on the component (see <a href="#/browser/shared-state/state-and-position">State belongs to a place in the tree</a>)</td></tr>'
        + '<tr><th scope="row">Tell the parent about a change</th><td>Call its callback in the handler that sets the state</td></tr>'
        + '<tr><th scope="row">Load the tasks of the user on screen</th><td>An effect with <code>[userId]</code> (or a data library)</td></tr>'
        + '<tr><th scope="row">Run a clock while the component is visible</th><td>An effect with a cleanup</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Why the code runs decides where it goes.',
      desc: 'Ask why the code runs. If it computes a value from state, it goes in render. If it responds to something the user did, it goes in the event handler. Only if it keeps something outside React in sync with the screen is it an effect.',
      nodes: [
        { id: 'why', label: 'Why it runs' },
        { id: 'render', label: 'In render', note: 'a value from state' },
        { id: 'handler', label: 'In the handler', note: 'the user did something' },
        { id: 'effect', label: 'In an effect', note: 'sync with the outside', key: true },
      ],
      edges: [['why', 'render', 'compute'], ['why', 'handler', 'user action'], ['why', 'effect', 'external system']],
    },
    code: `// Not needed: an effect that reacts to "submitted"
useEffect(() => {
  if (submitted) { postTask(title); setTitle(''); }
}, [submitted]);

// Better: do it where it happens
async function handleSubmit(e) {
  e.preventDefault();
  await postTask(title);
  setTitle('');
}`,
    example: 'The Try it box creates tasks against the mock API: the POST and the reset live in the submit handler, and the list title ("2 tasks") is derived. There is no effect in the component at all.',
    live: { kind: 'react', api: true, code: `import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [created, setCreated] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, done: false, userId: 1 }),
    });
    if (!res.ok) { console.log('could not create:', res.status); return; }
    const task = await res.json();
    // respond to the event here…
    setCreated((prev) => [...prev, task]);
    // …and reset here, no effect
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" />
      <button disabled={!title.trim()}>Add</button>
      <p>{created.length} {created.length === 1 ? 'task' : 'tasks'} created</p>
      <ul>{created.map((t) => <li key={t.id}>#{t.id} {t.title}</li>)}</ul>
    </form>
  );
}` },
    mistake: 'Using an effect to "watch" props and copy them into state: `useEffect(() => setName(user.name), [user])`. The first render shows the old name, a second render fixes it, and any edit the user made is overwritten when `user` changes. Read `user.name` directly, or reset the form with a `key`.' },

  /* ---- 5. Cleanup, refs and StrictMode ------------------------------------------------------- */
  { id: 'effect-cleanup', hub: 'cleanup', topic: 'cleanup',
    title: 'Cleanup: before the next effect and on unmount',
    summary: 'The function an effect returns is its **cleanup**: React runs it before the effect runs again (with the old values) and when the component is removed from the screen (unmount), to undo the setup.',
    html: [
      '<p>The effect says "start synchronising with room A"; its cleanup says "stop synchronising with room A". When the room changes to B, React must stop A before starting B, otherwise you stay connected to both. So after a commit the order is: the <strong>cleanup of the previous run</strong> (it still sees A, because it closed over that render\'s values), then the <strong>setup</strong> of the new run. On unmount only the cleanup runs.</p>',
      '<table><caption>Every setup that keeps running has a matching cleanup</caption><thead><tr><th scope="col">Setup</th><th scope="col">Cleanup</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>setInterval</code>, <code>setTimeout</code></th><td><code>clearInterval</code>, <code>clearTimeout</code></td></tr>'
        + '<tr><th scope="row"><code>addEventListener(type, fn)</code></th><td><code>removeEventListener(type, fn)</code>, with the <strong>same</strong> function</td></tr>'
        + '<tr><th scope="row"><code>connect()</code>, <code>subscribe()</code></th><td><code>disconnect()</code>, <code>unsubscribe()</code></td></tr>'
        + '<tr><th scope="row"><code>fetch</code></th><td>An ignore flag or <code>controller.abort()</code> (see <a href="#/browser/data-fetching/abort-controller">Cancelling with AbortController</a>)</td></tr>'
        + '</tbody></table>',
      '<p>An effect that does a one-off job with nothing left running needs no cleanup. Without one where it is needed, the work outlives the component: an interval keeps firing after the page changed, every remount adds one more listener, and the memory they hold stays in use.</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'The old cleanup always runs before the new setup, and once more on unmount.',
      desc: 'The chat mounts and its effect connects to #general. The room changes to travel: React first runs the cleanup of the general run, which disconnects from #general, then the new setup connects to #travel. When the chat closes, the cleanup of the travel run disconnects from #travel.',
      nodes: [
        { id: 's1', label: 'Connect #general', note: 'setup' },
        { id: 'c1', label: 'Disconnect #general', note: 'cleanup, room changed', key: true },
        { id: 's2', label: 'Connect #travel', note: 'setup' },
        { id: 'c2', label: 'Disconnect #travel', note: 'cleanup on unmount' },
      ],
      edges: [['s1', 'c1'], ['c1', 's2'], ['s2', 'c2']],
    },
    example: 'In the Try it box, the chat room "connects" in an effect that depends on `roomId`. Change the room: the console shows the disconnect from the old room **before** the connect to the new one. Then click **Close the chat**: the last cleanup runs.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function ChatRoom({ roomId }) {
  useEffect(() => {
    console.log(\`connect to #\${roomId}\`);
    return () => console.log(\`disconnect from #\${roomId}\`);
  }, [roomId]);
  return <h2>Welcome to #{roomId}</h2>;
}

function App() {
  const [roomId, setRoomId] = useState('general');
  const [show, setShow] = useState(true);
  return (
    <>
      <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
        <option value="general">general</option>
        <option value="travel">travel</option>
        <option value="music">music</option>
      </select>
      <button onClick={() => setShow(!show)}>{show ? 'Close the chat' : 'Open the chat'}</button>
      {show && <ChatRoom roomId={roomId} />}
    </>
  );
}` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Compare "Cleanup" and "A forgotten cleanup" in the visualiser' },
    mistake: 'Writing the cleanup with a new function: `window.addEventListener(\'resize\', () => update())` and later `window.removeEventListener(\'resize\', () => update())`. Two arrow functions are two different objects, so nothing is removed. Keep the handler in a variable inside the effect and pass that same variable to both calls.' },

  { id: 'use-ref', hub: 'cleanup', topic: 'cleanup',
    title: 'useRef: a box that survives renders without causing one',
    summary: '`useRef(initial)` returns an object `{ current }` that React keeps for the component\'s whole life; you can read and change `.current` freely, and changing it does **not** re-render.',
    html: [
      '<p>State is for values the screen shows: changing it re-renders. Some values must survive from one render to the next but never appear on screen: a timer id, an element of the page, the latest value an interval should read. A ref holds them: the same object on every render, and React never notices when <code>.current</code> changes.</p>',
      '<dl><dt>An element of the page</dt><dd><code>const inputRef = useRef(null)</code> and <code>&lt;input ref={inputRef} /&gt;</code>: after the commit, React puts the DOM element in <code>inputRef.current</code>, so a handler can call <code>inputRef.current.focus()</code>.</dd>'
        + '<dt>A timer id</dt><dd>Keep the id of <code>setInterval</code> in a ref, so a Stop button can clear it later.</dd>'
        + '<dt>The latest value</dt><dd>An interval or listener that must not restart can read <code>latestRef.current</code>, updated in an effect or a handler, instead of a stale variable (see <a href="#/browser/state-effects/stale-closures">Stale closures</a>).</dd></dl>',
      '<table><caption>State or ref?</caption><thead><tr><th scope="col"></th><th scope="col"><code>useState</code></th><th scope="col"><code>useRef</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">Changing it</th><td>Re-renders</td><td>Does not re-render</td></tr>'
        + '<tr><th scope="row">Read during render</th><td>Yes: the snapshot of this render</td><td>Avoid: the screen would not follow it</td></tr>'
        + '<tr><th scope="row">Use it for</th><td>What the screen shows</td><td>DOM elements, timer ids, values only your code reads</td></tr>'
        + '</tbody></table>',
    ],
    example: 'In the Try it box, **Start** begins a timer whose id lives in a ref, and **Stop** clears it. **Focus the input** uses a DOM ref. **Count without rendering** increases `clicksRef.current`: the console logs the growing count, but no new "render" line appears, because changing a ref never re-renders.',
    live: { kind: 'react', code: `import { useState, useRef } from 'react';

function App() {
  const [seconds, setSeconds] = useState(0);
  // the timer id: never shown
  const intervalRef = useRef(null);
  // the <input> element, after the commit
  const inputRef = useRef(null);
  // changes without re-rendering
  const clicksRef = useRef(0);
  console.log('render');

  function start() {
    // already running
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stop() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  function countSilently() {
    clicksRef.current += 1;
    console.log('clicks so far:', clicksRef.current);
  }

  return (
    <>
      <p>{seconds} s</p>
      <button onClick={start}>Start</button> <button onClick={stop}>Stop</button>
      <p>
        <input ref={inputRef} placeholder="Name" />{' '}
        <button onClick={() => inputRef.current.focus()}>Focus the input</button>
      </p>
      <button onClick={countSilently}>Count without rendering</button>
    </>
  );
}` },
    mistake: 'Showing a ref on screen: `<p>{clicksRef.current} clicks</p>`. The number only changes when something else happens to re-render, because changing a ref never does. If the screen shows it, it is state.' },

  { id: 'strict-mode', hub: 'cleanup', topic: 'cleanup',
    title: 'StrictMode: why effects run twice in development',
    summary: '`<StrictMode>` is a development-only checker: on mount it runs every effect, its cleanup and the effect again (setup → cleanup → setup), and it renders each component twice; production builds do neither.',
    html: [
      '<p>The Vite React template wraps the app in <code>&lt;StrictMode&gt;</code> in <code>main.jsx</code>, so <code>npm run dev</code> shows <code>connect</code>, <code>disconnect</code>, <code>connect</code> and two requests in the Network tab. It is a <strong>stress test</strong>: a component can unmount and mount again at any time (navigating away and back, a list reordering, a restored tab), so StrictMode does it once straight away. If your cleanup really undoes your setup, the user sees exactly the same result as with one run.</p>',
      '<ul><li><strong>The double render</strong> checks render code the same way: rendering must be pure, so two calls must give the same JSX. A counter incremented in the body or an array pushed during render shows up early. Since React 19 the console shows the logs of both renders.</li>'
        + '<li><strong>Fix, never suppress:</strong> add or correct the cleanup. Removing <code>&lt;StrictMode&gt;</code>, or guarding the effect with a "has it run already?" ref, hides the bug until production.</li>'
        + '<li><strong>A fetch</strong> is aborted or ignored by its cleanup, so the result is the same; the duplicate request only happens in development.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'In development, every mount is tested: setup, cleanup, setup.',
      desc: 'With StrictMode on, in development, React mounts the component and runs the effect\'s setup, then simulates an unmount by running the cleanup, then mounts again and runs the setup once more. If the cleanup undoes the setup, the final state is the same as a single run.',
      nodes: [
        { id: 's1', label: 'Setup', note: 'mount' },
        { id: 'c', label: 'Cleanup', note: 'simulated unmount', key: true },
        { id: 's2', label: 'Setup again', note: 'same result if cleanup works' },
      ],
      edges: [['s1', 'c'], ['c', 's2']],
    },
    code: `// main.jsx, as created by the Vite React template
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
    example: 'The Try it box renders its own root wrapped in `<StrictMode>` (that is why it calls `createRoot` itself). Its console shows `render` twice, then `connect`, `disconnect`, `connect`. Remove the `<StrictMode>` tags and each line appears once.',
    live: { kind: 'react', code: `import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  console.log('render');
  useEffect(() => {
    console.log('connect');
    return () => console.log('disconnect');
  }, []);
  return <p>Connected (look at the console)</p>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Turn StrictMode on for any scenario in the visualiser' },
    mistake: 'Adding a `didRun` flag to make an effect run once "because it runs twice". The effect would also run once without a cleanup, so the real bug (no cleanup) survives, and the flag breaks the remount that StrictMode is simulating.' },

  /* ---- 6. Effects in practice ---------------------------------------------------------------- */
  { id: 'fetch-in-effect', hub: 'practice', topic: 'practice',
    title: 'Fetching data in an effect',
    summary: 'To load data for what is on the screen, start the request in an effect whose dependencies are the inputs of the request (`[]`, `[id]`, `[query]`), check `res.ok`, store the result in state, and let the cleanup discard an outdated answer.',
    html: [
      '<p>Loading "the tasks of the user on screen" is synchronisation with an external system, the server, so it is an effect: render shows what we have so far, the effect asks the server for the rest, and a <code>setState</code> with the response renders it. The dependencies are what the request depends on: when <code>userId</code> changes, the data must be loaded again.</p>',
      '<dl><dt>No <code>async</code> effect function</dt><dd>An async function returns a promise, but an effect must return nothing or a cleanup. Define an async function inside the effect and call it.</dd>'
        + '<dt><code>res.ok</code></dt><dd><code>fetch</code> rejects only when there is no response at all; a <code>404</code> or <code>500</code> still resolves. Check <code>res.ok</code> and throw, so one <code>catch</code> handles both kinds of failure (see <a href="#/server/runtime/async-await">async and await</a>).</dd>'
        + '<dt>An ignore flag in the cleanup</dt><dd>The component may disappear, or a newer request may start, before the answer arrives. The cleanup sets <code>ignore = true</code>, and every <code>setState</code> checks it first.</dd></dl>',
      '<p>The rest of the loading story belongs to <a href="#/browser/data-fetching">Fetching data</a>: <a href="#/browser/data-fetching/request-states">the four UI states</a>, <a href="#/browser/data-fetching/race-conditions">race conditions</a>, <a href="#/browser/data-fetching/abort-controller">cancelling with AbortController</a> and <a href="#/browser/data-fetching/fetch-hook">a reusable data hook</a>.</p>',
    ],
    code: `useEffect(() => {
  let ignore = false;
  async function load() {
    try {
      const res = await fetch(\`/api/tasks?userId=\${userId}\`);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data = await res.json();
      if (!ignore) setTasks(data);
    } catch (err) {
      if (!ignore) setError(err.message);
    }
  }
  load();
  // a newer run or an unmount wins
  return () => { ignore = true; };
}, [userId]);`,
    example: 'The Try it box loads the tasks of a user from the mock API (it answers `/api/…` after 300 ms and logs each request). Change the user: the effect re-runs with the new id, the cleanup of the previous run flips its `ignore` flag, and the list switches over.',
    live: { kind: 'react', api: true, code: `import { useState, useEffect } from 'react';

function App() {
  const [userId, setUserId] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(\`/api/tasks?userId=\${userId}\`);
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const data = await res.json();
        if (!ignore) { setTasks(data); setError(null); }
      } catch (err) {
        if (!ignore) setError(err.message);
      }
    }
    load();
    return () => { ignore = true; };
  }, [userId]);

  return (
    <>
      <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
        <option value={1}>User 1</option>
        <option value={2}>User 2</option>
        <option value={3}>User 3</option>
      </select>
      {error && <p role="alert">Could not load: {error}</p>}
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}` },
    mistake: 'Fetching in the component body: `fetch(url).then((r) => r.json()).then(setTasks)`. Every render starts a request, every response sets state, every state change renders again: an endless loop of requests. Fetches that load data for the screen go in an effect; fetches caused by a click go in the handler.' },

  { id: 'custom-hooks', hub: 'practice', topic: 'practice',
    title: 'Custom hooks: reusing stateful logic',
    summary: 'A **custom hook** is a function whose name starts with `use` and that calls other hooks: it packages stateful logic (state and effects) so several components can reuse it, each with its **own** independent state.',
    html: [
      '<p>Components reuse <strong>markup</strong>; custom hooks reuse <strong>behaviour</strong>. When two components contain the same <code>useState</code> + <code>useEffect</code> combination (load something, track the window size, remember a value, toggle a boolean), move it into a <code>use…</code> function and return what the components need. The components become short descriptions of what they show, and the tricky parts are written and fixed once.</p>',
      '<ul><li><strong>Logic, not state:</strong> calling <code>useToggle()</code> in two components is like calling <code>useState</code> in both: two separate values. To share one value, lift it to a common parent or use context (see <a href="#/browser/shared-state/lifting-state">Lifting state up</a>).</li>'
        + '<li><strong>The <code>use</code> prefix</strong> tells React\'s linter and readers that the function calls hooks, so the <a href="#/browser/state-effects/rules-of-hooks">rules of hooks</a> apply to it. A function that calls no hooks is a plain helper and should not start with <code>use</code>.</li>'
        + '<li><strong>Any return shape:</strong> a pair like <code>useState</code> (<code>[on, toggle]</code>) or an object for many values, such as the <a href="#/browser/data-fetching/fetch-hook">data hook</a> <code>{ data, loading, error, reload }</code>.</li></ul>',
    ],
    code: `function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle];
}

// in any component
const [open, toggleOpen] = useToggle();`,
    example: 'The Try it box defines `useToggle` and uses it in two `Panel` components. Opening one does not open the other: each call has its own state.',
    live: { kind: 'react', code: `import { useState } from 'react';

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle];
}

function Panel({ title, children }) {
  const [open, toggleOpen] = useToggle();
  return (
    <section>
      <button aria-expanded={open} onClick={toggleOpen}>{open ? '▾' : '▸'} {title}</button>
      {open && <p>{children}</p>}
    </section>
  );
}

function App() {
  return (
    <>
      <Panel title="What is state?">Data a component remembers between renders.</Panel>
      <Panel title="What is an effect?">Code that synchronises with something outside React.</Panel>
    </>
  );
}` },
    mistake: 'Expecting two components that call the same custom hook to see the same data, for example a `useCart()` in the header and in the product page. Each call has its own state, so adding to one cart does not change the other. Shared data needs one owner: a common parent or a context provider.' },

  { id: 'use-local-storage', hub: 'practice', topic: 'practice',
    title: 'A custom hook for persistence: useLocalStorage',
    summary: '`useLocalStorage(key, initial)` works like `useState`, but reads its first value from `localStorage` and writes every change back, so the value survives a page reload.',
    html: [
      '<p><code>localStorage</code> is an external system (the browser\'s storage for your site), so keeping it in sync with state follows the usual split. <strong>Reading</strong> the saved value is part of creating the state: a lazy initialiser, <code>useState(() =&gt; read(key, initial))</code>, reads once, on the first render. <strong>Writing</strong> is synchronisation, so it is an effect: whenever the value changes, store it.</p>',
      '<ul><li><strong>Strings only:</strong> save with <code>JSON.stringify(value)</code> and read with <code>JSON.parse(text)</code> (see <a href="#/browser/js/json">JSON</a>).</li>'
        + '<li><strong>Wrap both in <code>try</code>/<code>catch</code>:</strong> storage can be full, disabled (private browsing, strict privacy settings, sandboxed frames) or hold text that is not valid JSON. Fall back to the initial value instead of crashing.</li>'
        + '<li><strong>Typical uses:</strong> a theme or language preference, a draft that should survive a reload, the last filters of a list. Keeping a user logged in after a reload builds on the same idea (see <a href="#/browser/shared-state/persist-session">Staying logged in after a reload</a>).</li>'
        + '<li><strong>Nothing secret:</strong> any script on the page can read it.</li></ul>',
    ],
    code: `function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : JSON.parse(saved);
    } catch {
      // blocked or invalid: use the default
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ }
  }, [key, value]);

  return [value, setValue];
}

// usage: exactly like useState
const [theme, setTheme] = useLocalStorage('theme', 'light');`,
    example: 'The Try it box uses the hook for a theme choice and a draft note. The preview runs in a locked-down frame where storage is blocked, so the `catch` branches run (the console says so) and the values reset when the preview reloads; in your own app they survive a page reload. That is exactly why the `try/catch` is there.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : JSON.parse(saved);
    } catch {
      console.log(\`storage blocked: "\${key}" starts from its default\`);
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { console.log(\`storage blocked: "\${key}" kept in memory only\`); }
  }, [key, value]);

  return [value, setValue];
}

function App() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [draft, setDraft] = useLocalStorage('draft', '');
  return (
    <div style={{ padding: 8, background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#eee' : '#111' }}>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Theme: {theme}</button>
      <p><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft note" /></p>
    </div>
  );
}` },
    mistake: 'Reading storage in the body without the lazy initialiser: `useState(JSON.parse(localStorage.getItem(\'tasks\')))`. It parses on every render (the result is ignored after the first), and the first time it runs `JSON.parse(null)`, which returns `null` instead of your default, so `tasks.map` crashes.' },
];

DATA.en.STATE_QUIZ = [
  /* State and re-renders */
  { type: 'tf', topic: 'state',
    q: 'Writing `let clicks = 0; clicks++` inside a component is enough to show a click counter on screen.',
    answer: false,
    why: 'A local variable starts again from 0 on every render, and changing it does not tell React to render. State (`useState`) keeps the value between renders and its setter schedules a render.' },
  { type: 'fib', topic: 'state',
    q: 'React calling your component function again to get a new description of the screen is called a ___.',
    accept: ['render', 're-render', 'rerender'],
    why: 'A **render** is the call; the **commit** is when React updates the DOM with the differences.' },
  { type: 'mc', topic: 'state',
    q: 'A component does `const [title, setTitle] = useState(props.title)`. The parent later passes a different `title`. What does the component show?',
    choices: ['The new title, because props always win', 'The old title: the argument of `useState` is only used on the first render', 'An error', 'Nothing until the page reloads'],
    answer: 1,
    why: 'The initial value is read once. Copying a prop into state freezes it; read the prop directly unless you want an editable draft.' },
  { type: 'fib', topic: 'state',
    q: 'To read storage only once when creating state, pass `useState` a function: `useState(() => load())`. This is called a ___ initialiser.',
    accept: ['lazy'],
    why: 'React calls the initialiser function only on the first render; with `useState(load())` the call would run on every render.' },
  { type: 'mc', topic: 'state',
    q: 'How does React know which `useState` call a value belongs to?',
    choices: ['By the variable name you destructure into', 'By the order of the hook calls in each render', 'By a hidden id written by the compiler', 'By the initial value'],
    answer: 1,
    why: 'State lives in a list of slots handed out in call order, which is why the order must be the same on every render.' },
  { type: 'mc', topic: 'state',
    q: 'Which of these breaks the rules of hooks?',
    choices: ['`const [a, setA] = useState(0);` as the first line', '`if (!user) return <Login />;` followed by `useState`', 'A `useEffect` whose setup starts with `if (!enabled) return;`', 'Calling `useToggle()` at the top of a component'],
    answer: 1,
    why: 'The early return makes the number of hooks depend on `user`. Put the condition inside the effect or move the hooks above the return.' },

  /* One render's snapshot */
  { type: 'mc', topic: 'snapshot',
    q: 'With `count` equal to 0, a click runs `setCount(count + 1); setCount(count + 1); console.log(count);`. What does the console show, and what does the screen show next?',
    choices: ['0, then 1', '2, then 2', '0, then 2', '1, then 1'],
    answer: 0,
    why: 'State is a snapshot: both calls read `count = 0` and queue "set to 1", and the log still sees the old value. The next render shows 1.' },
  { type: 'mc', topic: 'snapshot',
    q: 'Which call adds 3 to `count` when it appears three times in one click handler?',
    choices: ['`setCount(count + 1)`', '`setCount((c) => c + 1)`', '`count += 1`', '`setCount(count++)`'],
    answer: 1,
    why: 'An **updater function** receives the result of the previous queued update, so the queue goes 0 → 1 → 2 → 3.' },
  { type: 'tf', topic: 'snapshot',
    q: 'In React 18 and later, two state updates made inside a `setTimeout` callback cause one render, not two.',
    answer: true,
    why: 'Batching is automatic everywhere since React 18: event handlers, timers, promises and code after `await`.' },

  /* What to store and how to update it */
  { type: 'mc', topic: 'updates',
    q: 'A component receives `tasks` from its parent and shows "2 of 5 done". Where should the number 2 come from?',
    choices: ['A `useState` that is updated whenever `tasks` changes', 'A calculation during render: `tasks.filter((t) => t.done).length`', 'A prop the parent must also pass', 'An effect that counts the tasks after render'],
    answer: 1,
    why: 'It can be computed from a prop, so it is a **derived value**: compute it in the body and it is always right. Storing it would duplicate the data.' },
  { type: 'mc', topic: 'updates',
    q: 'A list lets the user pick one task to show in a detail panel. What is the best state to keep?',
    choices: ['A copy of the selected task object', 'The selected task\'s `id`, and find the task during render', 'The index of the task and a copy of it', 'A boolean per task'],
    answer: 1,
    why: 'An id cannot go stale. A copy keeps the old title after the task is edited; `tasks.find((t) => t.id === selectedId)` is always current.' },
  { type: 'mc', topic: 'updates',
    q: 'Which line correctly marks the task in state as done?',
    choices: ['`task.done = true; setTask(task);`', '`setTask({ ...task, done: true });`', '`setTask(task.done = true);`', '`Object.assign(task, { done: true }); setTask(task);`'],
    answer: 1,
    why: 'React compares references with `Object.is`. Only a **new** object signals a change; the others mutate the same object.' },
  { type: 'mc', topic: 'updates',
    q: 'Which update removes the task with id 7 from the `tasks` state?',
    choices: ['`tasks.splice(tasks.findIndex((t) => t.id === 7), 1)`', '`setTasks(tasks.filter((t) => t.id !== 7))`', '`delete tasks[7]; setTasks(tasks)`', '`setTasks(tasks.pop())`'],
    answer: 1,
    why: '`filter` returns a **new** array without the item. `splice`, `delete` and `pop` change the existing array.' },
  { type: 'tf', topic: 'updates',
    q: '`setTasks(tasks.sort(byTitle))` is a safe way to sort the list in state.',
    answer: false,
    why: '`sort` sorts the same array in place and returns it, so React sees the same reference. Use `[...tasks].sort(byTitle)` or `tasks.toSorted(byTitle)`.' },
  { type: 'mc', topic: 'updates',
    q: 'To toggle one task in a list, which expression is right?',
    choices: ['`tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))`', '`tasks.map((t) => { if (t.id === id) t.done = !t.done; return t; })`', '`tasks.forEach((t) => t.id === id && (t.done = !t.done))`', '`[...tasks].find((t) => t.id === id).done = true`'],
    answer: 0,
    why: 'A new array **and** a new object for the changed item. The other options edit the existing task object, which the previous render still uses.' },
  { type: 'fib', topic: 'updates',
    q: 'Complete the update that adds `task` at the end of the list: `setTasks([___, task])`.',
    accept: ['...tasks'],
    why: 'The spread copies every existing item into a new array, then `task` is added.' },
  { type: 'mc', topic: 'updates',
    q: 'State is `user = { name: \'Ana\', address: { city: \'Lyon\', zip: \'69001\' } }`. Which update changes only the city?',
    choices: ['`setUser({ ...user, city: \'Madrid\' })`', '`setUser({ ...user, address: { ...user.address, city: \'Madrid\' } })`', '`setUser({ address: { city: \'Madrid\' } })`', '`user.address.city = \'Madrid\'; setUser({ ...user })`'],
    answer: 1,
    why: 'Copy every level you change. The first adds a stray `city`; the third loses `name` and `zip`; the fourth mutates the nested object shared with the previous render.' },
  { type: 'tf', topic: 'updates',
    q: 'Declaring state with `const` (`const [task, setTask] = useState(…)`) prevents `task.done = true` from running.',
    answer: false,
    why: '`const` only forbids reassigning the name. Properties of the object can still be changed, which is exactly the mutation to avoid.' },

  /* Effects and dependencies */
  { type: 'mc', topic: 'effects',
    q: 'When does React run the setup function of `useEffect`?',
    choices: ['While rendering, before the JSX is returned', 'After the commit, once the page shows the new render', 'Only when the user clicks', 'Before the first render'],
    answer: 1,
    why: 'Effects run **after** React has updated the DOM, so render stays pure and the screen is already up to date.' },
  { type: 'mc', topic: 'effects',
    q: 'An effect has the dependency array `[userId]`. When does it run?',
    choices: ['After every render', 'Only after the first render', 'After the first render and after any render where `userId` changed', 'Only when `userId` changes, never on mount'],
    answer: 2,
    why: 'It always runs on mount, then again whenever a listed value differs (by `Object.is`) from the previous run.' },
  { type: 'tf', topic: 'effects',
    q: 'An effect with no dependency array at all runs only once, like `[]`.',
    answer: false,
    why: 'No array means "after **every** render". `[]` means "after the first render only".' },
  { type: 'mc', topic: 'effects',
    q: 'An effect with `[]` starts `setInterval(() => console.log(count), 1000)`. The user clicks a +1 button five times. What does the interval log?',
    choices: ['1, 2, 3, 4, 5', '0 every time: it closes over the first render\'s `count`', 'undefined', 'Nothing: intervals stop when state changes'],
    answer: 1,
    why: 'A **stale closure**: the effect never re-runs, so its callback keeps render 1\'s value. List `count` or use an updater.' },
  { type: 'mc', topic: 'effects',
    q: 'Which situation does NOT need an effect?',
    choices: ['Keeping a WebSocket connected while the chat is visible', 'Showing the tasks that match the search text', 'Starting a clock while the component is on the screen', 'Loading the tasks for the `userId` on screen'],
    answer: 1,
    why: 'Filtering is a calculation from state: do it during render. The others synchronise with something outside React.' },
  { type: 'mc', topic: 'effects',
    q: 'Why does `useEffect(() => { … }, [options])` run after every render when `const options = { search }` is defined in the component body?',
    choices: ['Because objects cannot be dependencies', 'Because a new object is created on every render, so `Object.is` sees a change each time', 'Because `search` is a string', 'It does not: it runs once'],
    answer: 1,
    why: 'Every render creates a fresh object. List the primitive (`[search]`) or build the object inside the effect.' },

  /* Cleanup, refs and StrictMode */
  { type: 'mc', topic: 'cleanup',
    q: 'A `ChatRoom` effect with `[roomId]` connects in setup and disconnects in cleanup. `roomId` changes from "general" to "travel". In what order do the logs appear?',
    choices: ['connect travel, disconnect general', 'disconnect general, connect travel', 'disconnect travel, connect travel', 'connect travel only'],
    answer: 1,
    why: 'React runs the previous cleanup first (it closed over "general"), then the new setup.' },
  { type: 'fib', topic: 'cleanup',
    q: 'The function returned by an effect, which React runs before the effect re-runs and on unmount, is called the ___.',
    accept: ['cleanup', 'cleanup function', 'clean-up'],
    why: 'It undoes the setup: clear timers, remove listeners, close connections, abort requests.' },
  { type: 'tf', topic: 'cleanup',
    q: 'In development with `<StrictMode>`, an effect with `[]` running setup, cleanup and setup again on mount is a sign of a bug in React.',
    answer: false,
    why: 'It is deliberate: StrictMode simulates an unmount and remount to check that your cleanup undoes your setup. Production runs it once.' },
  { type: 'mc', topic: 'cleanup',
    q: 'An effect adds `window.addEventListener(\'resize\', () => setWidth(innerWidth))`. What should the cleanup be?',
    choices: ['`window.removeEventListener(\'resize\', () => setWidth(innerWidth))`', 'Keep the handler in a variable and remove that same function', 'No cleanup is needed for window events', '`window.onresize = null`'],
    answer: 1,
    why: 'Removal needs the **same** function object. A new arrow function is a different function, so nothing would be removed.' },
  { type: 'mc', topic: 'cleanup',
    q: 'A handler runs `clicksRef.current += 1`. What happens on screen?',
    choices: ['The component re-renders with the new value', 'Nothing re-renders: changing a ref never causes a render', 'React throws, because refs are read-only', 'Only the children re-render'],
    answer: 1,
    why: 'A ref is a box React keeps between renders without watching it. If the screen must show the value, it is state.' },
  { type: 'tf', topic: 'cleanup',
    q: 'To let a Stop button clear an interval started by a Start button, keep the interval id in a ref.',
    answer: true,
    why: 'The id must survive renders but is never shown, which is exactly what `useRef` is for. In state it would cause a useless render.' },
  { type: 'fib', topic: 'cleanup',
    q: 'To focus an input from a handler, create `const inputRef = ___(null)`, pass `ref={inputRef}` to the input, and call `inputRef.current.focus()`.',
    accept: ['useRef'],
    why: 'After the commit React puts the DOM element in `inputRef.current`.' },

  /* Effects in practice */
  { type: 'tf', topic: 'practice',
    q: '`useEffect(async () => { … }, [])` is the recommended way to fetch data in an effect.',
    answer: false,
    why: 'An async function returns a promise, but an effect must return nothing or a cleanup. Define an async function inside the effect and call it.' },
  { type: 'mc', topic: 'practice',
    q: 'The server answers `404`. What does `await fetch(url)` do?',
    choices: ['Throws a TypeError', 'Resolves with a response whose `ok` is `false`', 'Returns `null`', 'Retries automatically'],
    answer: 1,
    why: '`fetch` rejects only when there is no response (network failure, abort). Check `res.ok` and throw yourself.' },
  { type: 'mc', topic: 'practice',
    q: 'An effect with `[userId]` loads the user\'s tasks. The user switches from 1 to 2, and the slower answer for user 1 arrives last. What keeps it from replacing user 2\'s tasks?',
    choices: ['Checking `res.ok` before `setTasks`', 'A cleanup that sets an `ignore` flag, checked before every `setState`', 'Making the effect function `async`', 'Listing `tasks` in the dependency array'],
    answer: 1,
    why: 'React runs the cleanup of the user-1 run before the user-2 run starts, so that run\'s flag is true by the time its answer arrives. Cancelling with `AbortController` works too (see Fetching data).' },
  { type: 'tf', topic: 'practice',
    q: 'Without a cleanup, a slower response for an old search can arrive after the response for the new search and overwrite it.',
    answer: true,
    why: 'Responses can arrive in any order: a race condition. An abort or an ignore flag in the cleanup prevents it.' },
  { type: 'tf', topic: 'practice',
    q: 'Two components that call the same custom hook `useCart()` share the same cart state.',
    answer: false,
    why: 'A custom hook shares logic, not state: each call has its own state. Shared data needs one owner (a common parent or a context).' },
  { type: 'fib', topic: 'practice',
    q: 'The name of a custom hook must start with ___ so the rules of hooks apply to it.',
    accept: ['use'],
    why: 'The `use` prefix tells React\'s linter (and readers) that the function calls hooks.' },
  { type: 'mc', topic: 'practice',
    q: 'What is wrong with `useState(JSON.parse(localStorage.getItem(\'tasks\')))`?',
    choices: ['Nothing', 'It reads and parses storage on every render, and returns `null` when the key is missing', 'localStorage cannot store arrays', 'JSON.parse is asynchronous'],
    answer: 1,
    why: 'Use a lazy initialiser with a default and a `try/catch`: `useState(() => …)` reads once and handles missing or invalid data.' },
  { type: 'tf', topic: 'practice',
    q: 'A function named `useFormatDate` that only formats a date and calls no hooks is a good custom hook name.',
    answer: false,
    why: 'Without hooks inside, it is a plain helper: name it `formatDate`. The `use` prefix promises that the function calls hooks.' },
];
