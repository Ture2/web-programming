'use strict';
/* State and effects: concept cards, rail groups and self-check quiz (React as the worked example). */

DATA.en.STATE_QUIZ_TOPICS = {
  state: 'State and rendering',
  updates: 'Updating objects and arrays',
  effects: 'Effects, dependencies and cleanup',
  fetching: 'Loading data in an effect',
  hooks: 'Rules of hooks and custom hooks',
};

DATA.en.STATE_GROUPS = [
  { key: 'state', label: 'State and rendering', icon: 'state' },
  { key: 'updates', label: 'Updating objects and arrays', icon: 'cluster' },
  { key: 'effects', label: 'Effects', icon: 'lifecycle' },
  { key: 'fetching', label: 'Loading data', icon: 'fetch' },
  { key: 'hooks', label: 'Hooks: rules and reuse', icon: 'func' },
];

DATA.en.STATE_CONCEPTS = [
  /* ---- 1. State and rendering --------------------------------------------------------- */
  { id: 'what-is-state', hub: 'state', topic: 'state',
    title: 'State, props and derived values',
    summary: 'An interface shows three kinds of data: **props** (given by the parent, read-only), **state** (remembered by the component and changed over time, usually by the user) and **derived values** (anything you can compute from the other two during render).',
    body: [
      'Picture a component as a function that turns data into a screen: `screen = f(data)`. The interesting question is where each piece of data comes from. **Props** arrive from outside, like the arguments of a function call; the component must not change them. **State** is the component\'s own memory: a value that has to survive from one render to the next and that changes because something happened (a click, typing, a response from the server). Everything else is **derived**: you can calculate it from props and state every time, so you do not store it anywhere.',
      'The idea is not specific to React: any interface library separates "what the user did" (state) from "what we show because of it" (derived). To decide, ask three questions about a value. Does it come from the parent? Then it is a prop. Can I compute it from props or other state? Then it is derived, a plain `const` in the component body. Does it change over time and nobody else gives it to me? Only then it is state.',
      'In React, a component reads props from its parameter (`function TaskList({ tasks })`), declares state with `useState` (next card) and computes derived values with ordinary JavaScript in the body: `const pending = tasks.filter((t) => !t.done)`. Keeping state **minimal** is the single best habit for avoiding bugs: two stored copies of the same fact will eventually disagree.',
    ],
    table: { caption: 'Which kind of data is it?', head: ['Value', 'Kind', 'Why'],
      rows: [
        ['the list of tasks passed by the parent', 'prop', 'someone else owns it'],
        ['the text typed in the search box', 'state', 'changes over time, nobody else knows it'],
        ['the tasks that match the search', 'derived', 'computed from the list and the text'],
        ['"3 of 5 done"', 'derived', 'counted from the list'],
        ['whether a "Show done" checkbox is ticked', 'state', 'the user changes it'],
      ] },
    example: 'The box below receives `tasks` as a prop, keeps one piece of state (`showDone`) and derives two values (`visible` and `doneCount`). Untick the checkbox: only the state changes, and React recomputes both derived values on the next render.',
    live: { kind: 'react', code: `import { useState } from 'react';

const TASKS = [
  { id: 1, title: 'Write the API skeleton', done: true },
  { id: 2, title: 'Add full CRUD', done: false },
  { id: 3, title: 'Document the endpoints', done: true },
];

function TaskSummary({ tasks }) {                        // prop
  const [showDone, setShowDone] = useState(true);        // state
  const visible = showDone ? tasks : tasks.filter((t) => !t.done);  // derived
  const doneCount = tasks.filter((t) => t.done).length;            // derived

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
    mistake: 'Copying a prop into state: `const [tasks, setTasks] = useState(props.tasks)`. `useState` reads its argument **only on the first render**, so when the parent later passes a new list, this component keeps showing the old one. Read the prop directly; make a copy in state only when you deliberately want an editable draft that ignores later changes.' },

  { id: 'use-state', hub: 'state', topic: 'state',
    title: 'useState and what a re-render is',
    summary: '`const [value, setValue] = useState(initial)` gives a component one piece of memory. Calling `setValue(next)` stores the new value and asks React to **re-render**: to call the component function again and update the page with what it returns.',
    body: [
      'A component is a function, and a function forgets its local variables when it returns. That is why `let count = 0; count++` inside a component never shows anything: the next call starts from 0 again, and nothing tells React to call it. State solves both problems at once. React keeps the value **outside** the function (attached to that spot in the tree), hands it back on every call, and the setter both updates it and **schedules a new render**.',
      'A **render** is React calling your component to get a fresh description of the screen. React then compares it with the previous one and changes only the parts of the real page (the DOM) that differ: that step is the **commit**. So "the screen updates" really means: setter → render (your function runs again, top to bottom, with the new value) → commit (React patches the DOM). Rendering also re-renders the children of that component.',
      '`useState` returns a pair, so you name both halves with array destructuring: `const [count, setCount] = useState(0)`. The convention is `[thing, setThing]`. The initial value is used once, on the first render; after that React ignores the argument. If computing it is expensive (reading and parsing storage, for example), pass a function, `useState(() => load())`, and React calls it only that first time.',
    ],
    points: [
      'Render = React calls your component. Commit = React updates the DOM with the difference.',
      'A setter called with the **same** value (`Object.is`) skips the render.',
      'Each component instance has its own state: two `<Counter />` elements count separately.',
    ],
    example: 'Click both buttons below and watch the box\'s console. The `let clicks` variable is increased, but nothing re-renders and the next render starts it from 0 again. The state button re-renders, and the log shows the component running again with the new value.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  let clicks = 0;                        // a plain local variable
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

  { id: 'state-snapshot', hub: 'state', topic: 'state',
    title: 'State is a snapshot of one render',
    summary: 'Inside one render, a state variable is a **constant**. Calling the setter does not change it; it queues a new value for the **next** render. That is why `setCount(count + 1)` twice in one click adds 1, not 2.',
    body: [
      'Think of each render as a photograph. When React calls your component, it hands it the state as it is at that moment, and every variable, handler and JSX expression created in that call is taken with that photo. The click handler of render 1 sees `count = 0` for as long as it lives, even after React has rendered again. A setter does not edit the photo; it asks React for a **new** photo with the new value.',
      'So `setCount(count + 1); setCount(count + 1);` reads `count` twice from the same photo (0) and twice queues "set it to 1". A `console.log(count)` right after the setter still prints 0. A `setTimeout(() => alert(count), 3000)` started in that click alerts the value of **that** render, even if you click ten more times meanwhile. None of this is asynchrony in the usual sense: the setter does run immediately, it just does not reach back into variables that already exist.',
      'The snapshot model removes a whole class of bugs: the code of one render is consistent from top to bottom. When you really need "the latest value", there are two tools: an **updater function** (next card) for computing new state from the previous one, and reading the value in the next render, where it is already the new one.',
    ],
    example: 'Click **+3?** below: it calls `setCount(count + 1)` three times and logs `count` afterwards. The console says 0, and the screen shows 1. Then use the render-cycle visualiser under this card: choose "Two setCount(count + 1) calls" and step through the queue.',
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

  { id: 'updater-functions', hub: 'state', topic: 'state',
    title: 'Updater functions: new state from the previous state',
    summary: 'Pass the setter a function instead of a value, `setCount((c) => c + 1)`, and React calls it with the **latest** queued value. Use it whenever the next state depends on the previous one.',
    body: [
      'A value tells React "make it this"; a function tells React "whatever it is by then, do this to it". React keeps a queue of the updates of an event and processes them in order on the next render: a value replaces the result so far, an updater receives the result so far and returns the next one. Three `setCount((c) => c + 1)` calls therefore go 0 → 1 → 2 → 3.',
      'Updaters matter most where the code runs **later** than the render it came from: inside a `setInterval` started by an effect, in a promise callback, in a handler that queues several updates. There the captured state variable may be stale, but the argument of the updater never is. The name of the parameter is up to you; a common convention is the first letter of the variable (`c` for count) or `prev`.',
      'An updater must be **pure**: compute and return the next value, nothing else. No `fetch`, no `console.log` you rely on, no changes to other variables: in development, StrictMode calls updaters twice to expose such side effects.',
    ],
    code: `setCount(count + 1);          // "make it 1" (if count is 0 in this render)
setCount((c) => c + 1);       // "add one to whatever it is by then"

// Mixing: value then updater
setCount(10);                 // queue: replace with 10
setCount((c) => c * 2);       // queue: 10 → 20   (next render: 20)`,
    example: 'The box has the same three-call button, this time with updaters, so a click adds 3. The **Reset then +1** button queues a value and then an updater: the queue goes "replace with 0" → "0 + 1", and the screen shows 1.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function resetThenOne() {
    setCount(0);              // a value: replace
    setCount((c) => c + 1);   // an updater: receives 0
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

  { id: 'batching', hub: 'state', topic: 'state',
    title: 'Batching: many updates, one render',
    summary: 'React waits until the code that queued updates has finished (an event handler, a timer callback, a promise callback) and then renders **once** for all of them. This is called **batching**.',
    body: [
      'A waiter takes the whole order of a table before going to the kitchen, instead of running there after every dish. React does the same with updates: while your handler runs, every setter call only writes to a queue. When the handler returns, React processes the queue and renders once. Five setters on three different state variables in one click still mean one render and one commit.',
      'Since React 18 batching is **automatic everywhere**: in event handlers, inside `setTimeout`, after an `await`, in promise callbacks. In older versions only React event handlers were batched, which is why old articles talk about it as an exception.',
      'Batching is also why the screen never shows a half-updated state: if a click sets `loading` to `false` and `tasks` to the response, no render ever sees `loading = false` with the old `tasks`. The rare case where you need the DOM updated before the next line of code (to measure it or scroll to a new element) has a dedicated escape hatch, `flushSync` from `react-dom`, but you will seldom need it.',
    ],
    example: 'Click the button below. The handler updates two variables and also waits for a timer before updating them again. The console shows one render per batch: two renders for the whole click, not four.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('idle');
  console.log(\`render: count = \${count}, status = \${status}\`);

  function handleClick() {
    setCount((c) => c + 1);
    setStatus('saving');            // same batch as the line above
    setTimeout(() => {
      setCount((c) => c + 1);
      setStatus('saved');           // batched too, inside the timer
    }, 1000);
  }

  return <button onClick={handleClick}>{status}: {count}</button>;
}` },
    mistake: 'Expecting a render (and a log in the component body) per setter call, and splitting related state into many variables "so they update separately". They do not: every update of the same event lands in the same render. If two values always change together, consider one state object or one derived value.' },

  { id: 'derived-values', hub: 'state', topic: 'state',
    title: 'Don\'t store what you can compute',
    summary: 'If a value can be calculated from props or existing state, compute it **during render** instead of keeping it in state. Duplicated state has to be kept in sync by hand, and it eventually goes out of sync.',
    body: [
      'Every extra piece of state is a promise to update it at the right moment. Store `tasks` and also `doneCount`, and every place that changes `tasks` must remember to change `doneCount` too; forget once and the screen lies. Compute `const doneCount = tasks.filter((t) => t.done).length` in the body instead, and it is correct by construction, on every render.',
      'Typical derived values: filtered or sorted lists (`tasks` + `search` → `visible`), counts and totals, a full name from first and last name, "is the form valid?", "is this the selected item?". For the selection, store the **id** (`selectedId`), not a copy of the object: the copy goes stale when the list is edited, the id does not.',
      'Recomputing on every render is almost always cheap: filtering a few hundred items takes microseconds. Only when a calculation is truly heavy (and you have measured it) wrap it in `useMemo(() => compute(a, b), [a, b])`, which keeps the result until `a` or `b` change. Never use an effect to compute a value from state: the screen first renders with the stale value, then the effect sets state and React renders again.',
    ],
    code: `// Duplicated state kept in sync with an effect: two renders, one of them wrong
const [tasks, setTasks] = useState([]);
const [visible, setVisible] = useState([]);
useEffect(() => {
  setVisible(tasks.filter((t) => t.title.includes(search)));
}, [tasks, search]);

// Derived during render: one render, always right
const visible = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));`,
    example: 'The box filters a task list as you type. There are exactly two pieces of state, `tasks` and `search`; `visible` and the counter are computed in the body. Toggle a task and the counter stays correct with no extra code.',
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

  /* ---- 2. Updating objects and arrays --------------------------------------------------- */
  { id: 'immutable-objects', hub: 'updates', topic: 'updates',
    title: 'Updating objects in state: replace, never mutate',
    summary: 'Treat objects in state as **read-only**. To change one field, create a new object with the spread syntax, `setTask({ ...task, done: true })`, and pass it to the setter. Changing the existing object (`task.done = true`) does not re-render.',
    body: [
      'React decides whether something changed by comparing the old and new value with `Object.is`, which for objects means "is it the **same** object?", not "does it contain the same data?" (see [Primitive values vs references](#/browser/js/value-reference)). Mutate the object and pass it back, and React sees the very same reference: nothing changed, no render. Even when another update triggers a render, mutation breaks the snapshot model: the previous render\'s object was edited behind its back.',
      'The fix is to copy and change: `{ ...task, done: true }` creates a new object with every property of `task`, then overrides `done`. The order matters: properties written after the spread win. Nested objects need a copy at **every level** you change: `{ ...user, address: { ...user.address, city: \'Madrid\' } }`. The spread is shallow, so the other nested objects are shared, which is fine as long as nobody mutates them.',
      'One handler can update any field by using a computed property name: `setForm({ ...form, [e.target.name]: e.target.value })`, with `name="title"` on the input. If the nesting gets deep, that is often a sign the state shape should be flatter.',
    ],
    code: `const [task, setTask] = useState({ id: 1, title: 'Add full CRUD', done: false });

// Wrong: same object, React sees no change
task.done = true;
setTask(task);

// Right: a new object
setTask({ ...task, done: true });

// Nested: copy each level you touch
setUser({ ...user, address: { ...user.address, city: 'Madrid' } });`,
    example: 'The box has a small edit form whose state is one object. **Toggle (mutating)** changes the object in place and calls the setter: nothing happens on screen. **Toggle (new object)** works. Type in the title after a mutating click and the hidden change suddenly appears, because typing causes a render.',
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [task, setTask] = useState({ title: 'Add full CRUD', done: false });

  function mutate() {
    task.done = !task.done;   // edits the object of this render
    setTask(task);            // same reference: React skips the render
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
    summary: 'Add with spread (`[...tasks, newTask]`), remove with `filter`, change one item with `map` and a new object, and sort a copy (`[...tasks].sort()` or `toSorted()`). Never `push`, `splice`, assign by index or `sort` the array in state.',
    body: [
      'Arrays follow the same rule as objects: React needs a **new array** to notice a change. Luckily the array methods you already know split cleanly into two families (see [Array methods](#/browser/js/array-methods)). `map`, `filter`, `slice`, `concat` and the spread syntax **return a new array**: safe. `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` and `arr[i] = x` **change the array in place**: forbidden on state.',
      'The four operations a list needs, written the safe way: **add** `setTasks([...tasks, task])` (or `[task, ...tasks]` to put it first); **remove** `setTasks(tasks.filter((t) => t.id !== id))`; **update one** `setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))`; **sort** `setTasks([...tasks].sort(byTitle))` or `tasks.toSorted(byTitle)`. Note the update: `map` gives a new array, and the changed item must also be a **new object**; the untouched items can be reused as they are.',
      'When the new list depends on the old one and the update may run later (after an `await`, in a timer), use the updater form: `setTasks((prev) => [...prev, created])`. Two quick additions then both survive, instead of the second overwriting the first with a list based on a stale snapshot.',
    ],
    table: { caption: 'Array operations on state', head: ['Goal', 'Avoid (mutates)', 'Use (new array)'],
      rows: [
        ['add', '`tasks.push(t)`', '`[...tasks, t]`'],
        ['remove', '`tasks.splice(i, 1)`', '`tasks.filter((x) => x.id !== id)`'],
        ['change one', '`tasks[i].done = true`', '`tasks.map((x) => x.id === id ? { ...x, done: true } : x)`'],
        ['sort', '`tasks.sort(cmp)`', '`[...tasks].sort(cmp)` or `tasks.toSorted(cmp)`'],
        ['insert at i', '`tasks.splice(i, 0, t)`', '`[...tasks.slice(0, i), t, ...tasks.slice(i)]`'],
      ] },
    example: 'The box is a complete little task list with add, toggle and delete, all with new arrays. The **Add with push** button shows the broken version: the console proves the item went into the array, but the screen does not show it until some other update renders.',
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
    setTasks(tasks);   // same array: no render
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

  /* ---- 3. Effects ------------------------------------------------------------------------ */
  { id: 'what-is-effect', hub: 'effects', topic: 'effects',
    title: 'Effects: synchronising with something outside React',
    summary: 'An **effect** (`useEffect(setup, deps)`) is code that runs **after** React has updated the page, to keep something outside React in sync with the current props and state: a timer, a network request, a browser API, an event listener, a connection.',
    body: [
      'Rendering must be a pure calculation: given the same props and state, return the same JSX and touch nothing else. But real apps must also talk to the world outside React: start a timer, subscribe to window events, connect to a chat server, load data. Those are **side effects**, and they cannot run during render (React may render several times, or throw a render away). `useEffect` gives them a place: React runs the setup function **after the commit**, once the screen is up to date.',
      'The right mental model is **synchronisation**, not "lifecycle events". An effect says: "while this component is on the screen with these values, the outside world should look like this". The setup starts the synchronisation (connect, subscribe, start the timer); the optional **cleanup** function it returns stops it (disconnect, unsubscribe, clear the timer). When the values change, React stops the old synchronisation and starts a new one. When the component leaves the screen, React stops it for good.',
      'If there is no outside system involved, you probably do not need an effect at all: computing values belongs in render, and reacting to a click belongs in the click handler (see [You might not need an effect](#/browser/state-effects/no-effect-needed)).',
    ],
    code: `import { useEffect } from 'react';

useEffect(() => {
  // setup: runs after the commit
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);     // cleanup: undoes the setup
}, []);                               // dependencies: when to re-synchronise`,
    example: 'The box subscribes to the pointer position only while the checkbox is ticked. The effect depends on `tracking`: ticking starts a `pointermove` listener, unticking runs the cleanup, which removes it. Move the pointer over the preview and watch the console.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function App() {
  const [tracking, setTracking] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!tracking) return;              // nothing to synchronise
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
    summary: 'The second argument of `useEffect` lists the values the effect reads. **No array**: run after every render. **`[]`**: run after the first render only. **`[a, b]`**: run after the first render and again whenever `a` or `b` changed since the last run (compared with `Object.is`).',
    body: [
      'React cannot look inside your effect to know what it depends on, so you tell it. After every commit, React compares each listed value with the one from the previous run; if any differs, it runs the cleanup of the old run and then the effect again. If none differs, it skips the effect. `[]` means "nothing it reads can change", so it only ever runs on mount (and its cleanup on unmount).',
      'The array is not a choice of "when I would like it to run": it must list **every** prop, state variable and value derived from them that the effect reads. Leave one out and the effect keeps using an old value (a stale closure, next card). The ESLint rule `react-hooks/exhaustive-deps`, which Vite\'s React template installs, warns about missing dependencies; treat its warnings as bugs. Setter functions from `useState` and values defined outside the component never change, so they need not be listed.',
      'Objects and functions created during render are **new on every render**, so listing them makes the effect run every time: `[options]` with `const options = { search }` in the body behaves like no array. List the primitive inside instead (`[search]`), or create the object inside the effect.',
    ],
    table: { caption: 'When does the effect run?', head: ['Second argument', 'Runs after', 'Typical use'],
      rows: [
        ['(none)', 'every render', 'rare: syncing with something that depends on everything'],
        ['`[]`', 'the first render only', 'a connection or listener that never changes'],
        ['`[roomId]`', 'the first render and when `roomId` changes', 'fetch or subscribe for the current id'],
      ] },
    example: 'The box has three effects, one of each kind, and logs when each runs. Click **+1** and type in the input: after the click A and C run; after typing only A runs. The render-cycle visualiser has the same component as the scenario "No array, [] and [count]".',
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
    summary: 'A function created during a render **closes over** that render\'s values. If an effect keeps such a function alive (an interval, a listener) without re-running, the function keeps reading old values: a **stale closure**.',
    body: [
      'A **closure** is a function together with the variables it could see when it was created (see [Scope inside functions](#/browser/js/function-scope)). Since each render has its own `count` constant, an interval callback created in render 1 remembers render 1\'s `count` forever. With an empty dependency array the effect never runs again, so the interval is never replaced, and it reports `count = 0` while the button shows 5.',
      'There are two honest fixes. **List the value as a dependency** (`[count]`): every change of `count` cleans up the old interval and starts a new one with a fresh closure. Or **stop reading the value**: if the callback only needs to change the state, give the setter an updater, `setCount((c) => c + 1)`; it receives the current value from React, so `[]` is truthful and one interval is enough.',
      'Stale closures are the reason the dependency rule exists: an incomplete array is not an optimisation, it is a bug that shows up later. The same applies to event listeners added in an effect, `setTimeout` callbacks and promise callbacks that read state.',
    ],
    example: 'In the box, the button belongs to `App`, which passes `count` to a ticker. The **stale** ticker\'s effect has `[]`, so its interval logs 0 forever while you click. Switch to the **fixed** ticker: its effect lists `count`, re-runs after every click, and the log follows the button.',
    live: { kind: 'react', code: `import { useState, useEffect } from 'react';

function StaleTicker({ count }) {
  useEffect(() => {
    const id = setInterval(() => console.log(\`stale ticker sees \${count}\`), 1000);
    return () => clearInterval(id);
  }, []);              // count is missing: the linter would warn
  return <p>Stale ticker running</p>;
}

function FixedTicker({ count }) {
  useEffect(() => {
    const id = setInterval(() => console.log(\`fixed ticker sees \${count}\`), 1000);
    return () => clearInterval(id);
  }, [count]);         // a new interval for every count
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
    mistake: 'Fixing a stale closure by moving the variable out of React (`let latest = 0` at module level) or by reading it from the DOM. The component then has two sources of truth. Use the dependency array or an updater function; a `useRef` mirror is an advanced tool for rare cases.' },

  { id: 'effect-cleanup', hub: 'effects', topic: 'effects',
    title: 'Cleanup: before the next effect and on unmount',
    summary: 'The function an effect returns is its **cleanup**. React runs it before the effect runs again (with the old values) and when the component is removed from the screen (unmount). It undoes the setup: clear the timer, remove the listener, close the connection, abort the request.',
    body: [
      'Picture the effect as "start synchronising with room A" and the cleanup as "stop synchronising with room A". When the room changes to B, React must stop A before starting B, otherwise you stay connected to both. So the order after a commit is: **cleanup of the previous run** (it still sees A, because it closed over render A\'s values), then **setup** of the new run (with B). On unmount only the cleanup runs.',
      'Every setup that starts something that keeps running needs a matching cleanup: `setInterval` ↔ `clearInterval`, `setTimeout` ↔ `clearTimeout`, `addEventListener` ↔ `removeEventListener` (with the **same** function), `connect()` ↔ `disconnect()`, `subscribe()` ↔ `unsubscribe()`, `fetch` ↔ `controller.abort()` (see [Cancelling a fetch](#/browser/state-effects/abort-fetch)). An effect that only does a one-off job with nothing left running needs no cleanup.',
      'Without a cleanup, the work outlives the component: an interval keeps firing after the page changed, every remount adds one more listener, and a slow response arrives and sets state for a screen the user already left. React silently ignores a `setState` on an unmounted component, but the code that called it, and the memory it holds, keep going.',
    ],
    example: 'In the box, the chat room "connects" in an effect that depends on `roomId`. Change the room: the console shows the disconnect from the old room **before** the connect to the new one. Then click **Close the chat**: the last cleanup runs.',
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

  { id: 'strict-mode', hub: 'effects', topic: 'effects',
    title: 'StrictMode: why effects run twice in development',
    summary: '`<StrictMode>` is a development-only checker. On mount it runs every effect, its cleanup and the effect again (setup → cleanup → setup), and it renders each component twice. Production builds do neither.',
    body: [
      'The Vite React template wraps the app in `<StrictMode>` in `main.jsx`, so in `npm run dev` you see `connect`, `disconnect`, `connect` and two requests in the Network tab. This is not a bug in your code or in React: it is a **stress test**. A component can unmount and mount again at any time (navigating away and back, a list reordering, a hidden tab restored), so StrictMode does it once straight away. If your cleanup really undoes your setup, the user sees exactly the same result as with one run.',
      'The double **render** has the same purpose for render code: rendering must be pure, so calling the component twice must give the same JSX. If it does not (a counter incremented in the body, an array pushed during render), StrictMode makes the bug visible early. Since React 19 the console shows the logs of both renders.',
      'The right response to a double effect is to fix or add the cleanup, never to suppress it: removing `<StrictMode>`, or guarding the effect with a "has it run already?" ref, hides the bug until it appears in production. For a fetch, the cleanup aborts (or ignores) the first request, so the result is the same; the duplicate request only happens in development.',
    ],
    code: `// main.jsx, as created by the Vite React template
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
    example: 'The box renders its own root wrapped in `<StrictMode>` (that is why it calls `createRoot` itself). Its console shows `render` twice, then `connect`, `disconnect`, `connect`. Remove the `<StrictMode>` tags and each line appears once.',
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

  { id: 'no-effect-needed', hub: 'effects', topic: 'effects',
    title: 'You might not need an effect',
    summary: 'Effects are for synchronising with **external** systems. To compute a value from props or state, do it during render; to respond to something the user did, do it in the **event handler**. Both are simpler and faster than an effect.',
    body: [
      'Ask one question before writing `useEffect`: **why** does this code run? If the answer is "because the component is on the screen and must stay in sync with something outside" (a connection, a timer, the data for the current id), it is an effect. If the answer is "because the user clicked Save", it belongs in the `onClick` handler, where you know exactly what happened. If the answer is "because some state changed and I need a new value from it", it is a calculation for the render body.',
      'Effects used as "when X changes, set Y" chains cost an extra render each (the screen first shows the old Y), make the order of events hard to follow, and run in cases you did not mean (on mount, in StrictMode twice, after an unrelated re-render that changed X back and forth).',
      'Common replacements: a filtered list → compute it in render; resetting a form after a successful submit → do it in the submit handler after the `await`; resetting all state when an id prop changes → give the component `key={id}` so React treats it as a new instance; notifying the parent of a change → call the parent\'s callback in the same handler that sets the state.',
    ],
    table: { caption: 'Effect or not?', head: ['You want to…', 'Put it in…'],
      rows: [
        ['show tasks filtered by the search text', 'render (a derived `const`)'],
        ['send a POST when the user clicks Save', 'the click / submit handler'],
        ['clear the form after the POST succeeds', 'the same handler, after `await`'],
        ['load the tasks of the user on screen', 'an effect with `[userId]` (or a data library)'],
        ['start a clock while the component is visible', 'an effect with a cleanup'],
      ] },
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
    example: 'The box creates tasks against the mock API: the POST and the reset live in the submit handler, and the list title ("2 tasks") is derived. There is no effect in the component at all.',
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
    setCreated((prev) => [...prev, task]);   // respond to the event here…
    setTitle('');                            // …and reset here, no effect
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

  /* ---- 4. Loading data -------------------------------------------------------------------- */
  { id: 'fetch-in-effect', hub: 'fetching', topic: 'fetching',
    title: 'Fetching data in an effect',
    summary: 'To load data for what is on the screen, start the request in an effect whose dependencies are the inputs of the request (`[]`, `[id]`, `[query]`), check `res.ok`, and store the result in state. The effect function itself cannot be `async`: define an async function inside it and call it.',
    body: [
      'Loading "the tasks of the user on screen" is synchronisation with an external system (the server), so it is an effect: render shows what we have so far, the effect asks the server for the rest, and a `setState` with the response triggers the render that shows it. The dependency array is the list of things the request depends on: when `userId` changes, the data must be loaded again.',
      '`useEffect(async () => …)` is wrong because an async function returns a **promise**, and React expects the effect to return either nothing or a cleanup function. Write `useEffect(() => { async function load() { … } load(); }, [deps])` instead. Inside, remember what `fetch` does (see [async/await](#/server/runtime/async-await)): it rejects only when there is no response at all (network down, aborted); a `404` or `500` still resolves. Check `res.ok` and throw, so one `catch` handles both kinds of failure.',
      'Two things can go wrong with timing: the component can disappear before the response arrives, and a newer request can be overtaken by an older, slower one. The cleanup handles both, either with an **ignore flag** (set in the cleanup, checked before every `setState`) or by **aborting** the request (see [Cancelling a fetch](#/browser/state-effects/abort-fetch)). In a real app this logic usually ends up in a custom hook or a data library, but it is worth writing by hand once.',
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
  return () => { ignore = true; };   // a newer run or an unmount wins
}, [userId]);`,
    example: 'The box loads the tasks of a user from the mock API (it answers `/api/…` after 300 ms and logs each request). Change the user: the effect re-runs with the new id, the cleanup of the previous run flips its `ignore` flag, and the list switches over.',
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

  { id: 'four-ui-states', hub: 'fetching', topic: 'fetching',
    title: 'Loading, error, empty and success',
    summary: 'A view that loads data has **four** states, and the user must be able to tell them apart: **loading** (the request is on its way), **error** (it failed, with a way to retry), **empty** (it worked and there is nothing to show) and **success** (the data).',
    body: [
      'The commonest gap in a front end is designing only for the happy path. Each state answers a question the user is asking: "is something happening?" (loading: a spinner or a skeleton, not a blank area), "did it break, and what can I do?" (error: a message in plain words and a **Try again** button), "is it working but empty?" (empty: "No tasks match "xyz"" or "No tasks yet: create the first one", never an empty list that looks like a bug), and finally the data itself.',
      'A clean way to model this is one `status` variable with exactly one value at a time (`\'loading\' | \'error\' | \'success\'`), plus the data and the error message. Separate booleans (`loading`, `error`) can contradict each other (both true after a retry) and every branch must check both. **Empty** is not a separate request result: it is success with zero items, a derived check (`tasks.length === 0`) inside the success branch.',
      'Render the branches in order: loading first, then error, then empty, then the list. Keep the layout stable (the search box stays on the screen while loading) and announce changes for screen readers: an error message with `role="alert"`, a loading text in a region with `aria-live="polite"`. More patterns for real API calls (tokens, retries, pagination) are in the [Fetching data](#/browser/data-fetching) section.',
    ],
    table: { caption: 'The four states of a list view', head: ['State', 'Condition', 'Show'],
      rows: [
        ['loading', '`status === \'loading\'`', '"Loading tasks…" (or a skeleton)'],
        ['error', '`status === \'error\'`', 'the message + a Try again button'],
        ['empty', '`status === \'success\' && tasks.length === 0`', '"No tasks match …" + what to do next'],
        ['success', '`status === \'success\'`', 'the list'],
      ] },
    example: 'The box searches the mock API with an 800 ms delay so you can see each state. Type `xyz` for the empty state; tick **Break the URL** for the error state (the API answers 404) and then use **Try again** after unticking it.',
    live: { kind: 'react', api: { latency: 800 }, code: `import { useState, useEffect } from 'react';

function App() {
  const [search, setSearch] = useState('');
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    fetch(\`/api/\${broken ? 'taskz' : 'tasks'}?search=\${encodeURIComponent(search)}\`)
      .then((res) => { if (!res.ok) throw new Error(\`The server answered \${res.status}\`); return res.json(); })
      .then((data) => { if (!ignore) { setTasks(data); setStatus('success'); } })
      .catch((err) => { if (!ignore) { setError(err.message); setStatus('error'); } });
    return () => { ignore = true; };
  }, [search, broken, attempt]);

  return (
    <>
      <input placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
      <label><input type="checkbox" checked={broken} onChange={(e) => setBroken(e.target.checked)} /> Break the URL</label>
      <div aria-live="polite">
        {status === 'loading' && <p>Loading tasks…</p>}
        {status === 'error' && (
          <p role="alert">{error}. <button onClick={() => setAttempt(attempt + 1)}>Try again</button></p>
        )}
        {status === 'success' && tasks.length === 0 && <p>No tasks match "{search}".</p>}
        {status === 'success' && tasks.length > 0 && (
          <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
        )}
      </div>
    </>
  );
}` },
    mistake: 'Starting with `loading = false` and `tasks = []`. The very first render then shows the empty state ("No tasks yet") for a moment before the request has even started, which looks like a real answer. Start in the loading state: `useState(\'loading\')`.' },

  { id: 'abort-fetch', hub: 'fetching', topic: 'fetching',
    title: 'Cancelling a fetch with AbortController',
    summary: 'An `AbortController` cancels a request: pass `controller.signal` to `fetch`, and call `controller.abort()` in the effect\'s cleanup. The browser drops the request and the promise rejects with an `AbortError`, which you ignore.',
    body: [
      'When a user types "e", then "en", the effect runs twice and two requests are in flight. Responses do not have to come back in order: if the "e" request is slower, it arrives **last** and overwrites the "en" results, so the list does not match the search box. This is a **race condition**. The cleanup is the natural place to fix it, because React runs it exactly when a request becomes outdated: before the effect runs for the new query, and on unmount.',
      'An `AbortController` is a small browser object with a `signal` (give it to `fetch`) and an `abort()` method. Aborting really cancels the request (the Network tab shows it as cancelled), and the `fetch` promise rejects with an error whose `name` is `\'AbortError\'`. That rejection is expected, not a failure: in the `catch`, return early when `err.name === \'AbortError\'` and do not show an error message.',
      'The **ignore flag** (`let ignore = false` in the effect, `ignore = true` in the cleanup, `if (!ignore) setState(…)`) solves the same race without cancelling: the old request completes, and its result is thrown away. Abort saves bandwidth and server work; the flag also works for any promise, not just `fetch`. Both are correct; pick one per effect. The same signal can cancel several requests at once.',
    ],
    code: `useEffect(() => {
  const controller = new AbortController();
  fetch(\`/api/tasks?search=\${query}\`, { signal: controller.signal })
    .then((res) => { if (!res.ok) throw new Error(\`HTTP \${res.status}\`); return res.json(); })
    .then(setTasks)
    .catch((err) => {
      if (err.name === 'AbortError') return;   // we cancelled it: not an error
      setError(err.message);
    });
  return () => controller.abort();             // outdated: cancel it
}, [query]);`,
    example: 'The box searches with an 800 ms delay and aborts in the cleanup. Type three letters quickly: the console shows the first two requests `cancelled` and only the last one answered. The visualiser has the same situation step by step, and the version without a cleanup where the old response wins.',
    live: { kind: 'react', api: { latency: 800 }, code: `import { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(\`/api/tasks?search=\${encodeURIComponent(query)}\`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(\`HTTP \${res.status}\`); return res.json(); })
      .then((data) => {
        console.log(\`results for "\${query}": \${data.length}\`);
        setTasks(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') console.log(\`"\${query}" aborted\`);
        else console.log('failed:', err.message);
      });
    return () => controller.abort();
  }, [query]);

  return (
    <>
      <input placeholder="Type quickly" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}` },
    practice: { href: '#/browser/state-effects/practice/render-cycle', label: 'Step through "Fetch with AbortController"' },
    mistake: 'Treating the `AbortError` as a failure: the `catch` sets `status = \'error\'`, and every keystroke flashes "Something went wrong". Check `err.name === \'AbortError\'` first and do nothing in that case.' },

  /* ---- 5. Rules of hooks and custom hooks ------------------------------------------------ */
  { id: 'rules-of-hooks', hub: 'hooks', topic: 'hooks',
    title: 'The rules of hooks (and why)',
    summary: 'Call hooks (`useState`, `useEffect`, any `use…` function) only at the **top level** of a component or a custom hook: never inside conditions, loops, nested functions or after an early `return`. React identifies each hook by its **call order**, which must be the same on every render.',
    body: [
      'A hook call carries no name: `useState(0)` does not say "I am the count". React keeps a component\'s state as a **list of slots** and hands them out in order: the first `useState` call of a render gets slot 1, the second gets slot 2, and so on. That is why it works with no names at all, and why the order must never change. If a condition skips a hook on one render, every later hook receives its neighbour\'s slot, and React stops with an error such as "Rendered fewer hooks than expected".',
      'The rules follow from that: call hooks at the top level, in the same order every time; call them only from React components or from custom hooks (functions named `use…`), not from ordinary functions or event handlers. When you need something conditional, put the condition **inside** the hook (`useEffect(() => { if (!enabled) return; … }, [enabled])`) or render a child component conditionally (its hooks then live in the child).',
      'An early `return` counts too: `if (!user) return <Login />;` above a `useState` means the number of hooks depends on `user`. Move every hook above the first `return`. The ESLint rule `react-hooks/rules-of-hooks` (in the Vite template) catches these mistakes as you type.',
    ],
    code: `// Wrong: the hook only runs sometimes
function TaskDetail({ task }) {
  if (!task) return <p>Select a task</p>;
  const [editing, setEditing] = useState(false);   // slot depends on task
  …
}

// Right: every hook first, then the early return
function TaskDetail({ task }) {
  const [editing, setEditing] = useState(false);
  if (!task) return <p>Select a task</p>;
  …
}`,
    example: 'The box breaks the rule on purpose: an extra `useState` runs only when the checkbox is ticked. The first render works; tick the box and React throws, because the second render calls one more hook than the first. Move the hook out of the `if` to fix it.',
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

  { id: 'custom-hooks', hub: 'hooks', topic: 'hooks',
    title: 'Custom hooks: reusing stateful logic',
    summary: 'A **custom hook** is a function whose name starts with `use` and that calls other hooks. It packages a piece of stateful logic (state + effects) so several components can reuse it. Each component that calls it gets its **own** independent state.',
    body: [
      'Components let you reuse **markup**; custom hooks let you reuse **behaviour**. When two components contain the same `useState` + `useEffect` combination (load something, track the window size, remember a value in storage, toggle a boolean), move it into a function, give it a `use` name, and return what the components need. The components become short descriptions of what they show, and the tricky parts (cleanup, abort, error handling) are written and fixed once.',
      'A custom hook shares **logic**, not **state**. Calling `useToggle()` in two components is like calling `useState` in both: two separate values. To share the same value between components, lift it up to a common parent or use context (see [Shared state](#/browser/shared-state)).',
      'The `use` prefix is not decoration: it tells React\'s linter (and readers) that the function calls hooks, so the [rules of hooks](#/browser/state-effects/rules-of-hooks) apply to it and to every call of it. A function that calls no hooks should not start with `use`: it is just a helper. Return whatever shape is handy: a pair like `useState` (`[on, toggle]`) or an object for many values (`{ data, loading, error, reload }`).',
    ],
    code: `function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle];
}

// in any component
const [open, toggleOpen] = useToggle();`,
    example: 'The box defines `useToggle` and uses it in two `Panel` components. Opening one does not open the other: each call has its own state.',
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

  { id: 'use-fetch', hub: 'hooks', topic: 'hooks',
    title: 'A custom hook for loading data: useFetch',
    summary: '`useFetch(url)` wraps the whole loading pattern (status, data, error, abort, retry) and returns `{ data, loading, error, reload }`. Every view that loads something becomes a few lines, and the pattern is fixed in one place.',
    body: [
      'Every component that loads data repeats the same twenty lines: three pieces of state, an effect, `res.ok`, an abort or ignore flag, the four UI states. Repetition invites drift: one copy forgets `res.ok`, another forgets the cleanup. A hook makes the right version the easy version: `const { data, loading, error, reload } = useFetch(\'/api/tasks\')`.',
      'Design notes for a good loading hook. The **URL is the dependency**: when it changes (a new id, a new search), the hook loads again and aborts the previous request. **reload** is a function that bumps an internal counter listed in the dependencies, so the effect runs again on demand (a Try again button, after creating an item). A real app usually also centralises the base URL and the `Authorization` header in one small API module that the hook calls (see [Fetching data](#/browser/data-fetching)).',
      'Data libraries (TanStack Query, SWR) are this idea grown up: caching, deduplication of identical requests, refetch on focus. Writing `useFetch` once yourself is the best way to understand what they do for you.',
    ],
    example: 'The box defines `useFetch` and uses it in two components: a task count and a task list, each with its own request (watch the two `[network]` lines). **Reload** in the list calls `reload()`, which re-runs only that component\'s effect.',
    live: { kind: 'react', api: true, code: `import { useState, useEffect } from 'react';

function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(\`HTTP \${res.status}\`); return res.json(); })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => { if (err.name !== 'AbortError') setState({ data: null, loading: false, error: err.message }); });
    return () => controller.abort();
  }, [url, attempt]);

  return { ...state, reload: () => setAttempt((a) => a + 1) };
}

function TaskCount() {
  const { data, loading } = useFetch('/api/tasks?done=false');
  return <p>{loading ? '…' : \`\${data.length} pending tasks\`}</p>;
}

function TaskList() {
  const { data, loading, error, reload } = useFetch('/api/tasks');
  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error} <button onClick={reload}>Try again</button></p>;
  if (data.length === 0) return <p>No tasks yet.</p>;
  return (<><button onClick={reload}>Reload</button><ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul></>);
}

function App() {
  return (<><TaskCount /><TaskList /></>);
}` },
    mistake: 'Passing a URL built from an object or array that is recreated on every render, or calling `useFetch` with a new options object each time and listing it as a dependency: the effect then re-runs after every render, which means an endless request loop. Keep the dependencies primitive (a URL string, an id).' },

  { id: 'use-local-storage', hub: 'hooks', topic: 'hooks',
    title: 'A custom hook for persistence: useLocalStorage',
    summary: '`useLocalStorage(key, initial)` works like `useState`, but reads its first value from `localStorage` and writes every change back, so the value survives a page reload. Reading happens once, in a lazy initialiser; writing is an effect.',
    body: [
      '`localStorage` is an external system (the browser\'s storage for your site), so keeping it in sync with state follows the usual split. **Reading** the saved value is part of creating the state: use the lazy form `useState(() => read(key, initial))` so storage is read once, on the first render, not on every render. **Writing** is synchronisation, so it is an effect: whenever the value changes, store it.',
      '`localStorage` only stores **strings**: save with `JSON.stringify(value)` and read with `JSON.parse(text)`. Wrap both in `try/catch`: storage can be full, disabled (private browsing, strict privacy settings, sandboxed frames) or contain text that is not valid JSON, and none of those should crash the page. Fall back to the initial value.',
      'Typical uses: a theme or language preference, a draft that should survive a reload, the last filters of a list. A login token stored the same way lets a refresh keep the user logged in; it is usually kept by the authentication provider alongside the user (see [Shared state](#/browser/shared-state)). Never store anything secret you would not want any script on the page to read.',
    ],
    code: `function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : JSON.parse(saved);
    } catch {
      return initial;                      // blocked or invalid: use the default
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ }
  }, [key, value]);

  return [value, setValue];
}

// usage: exactly like useState
const [theme, setTheme] = useLocalStorage('theme', 'light');`,
    example: 'The box uses the hook for a theme choice and a draft note. This preview runs in a locked-down frame where storage is blocked, so the `catch` branches run (the console says so) and the values reset when the preview reloads; in your own app they survive a page reload. That is exactly why the `try/catch` is there.',
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
  /* State and rendering */
  { type: 'mc', topic: 'state',
    q: 'A component receives `tasks` from its parent and shows "2 of 5 done". Where should the number 2 come from?',
    choices: ['A `useState` that is updated whenever `tasks` changes', 'A calculation during render: `tasks.filter((t) => t.done).length`', 'A prop the parent must also pass', 'An effect that counts the tasks after render'],
    answer: 1,
    why: 'It can be computed from a prop, so it is a **derived value**: compute it in the body and it is always right. Storing it would duplicate the data.' },
  { type: 'tf', topic: 'state',
    q: 'Writing `let clicks = 0; clicks++` inside a component is enough to show a click counter on screen.',
    answer: false,
    why: 'A local variable starts again from 0 on every render, and changing it does not tell React to render. State (`useState`) keeps the value between renders and its setter schedules a render.' },
  { type: 'mc', topic: 'state',
    q: 'With `count` equal to 0, a click runs `setCount(count + 1); setCount(count + 1); console.log(count);`. What does the console show, and what does the screen show next?',
    choices: ['0, then 1', '2, then 2', '0, then 2', '1, then 1'],
    answer: 0,
    why: 'State is a snapshot: both calls read `count = 0` and queue "set to 1", and the log still sees the old value. The next render shows 1.' },
  { type: 'mc', topic: 'state',
    q: 'Which call adds 3 to `count` when it appears three times in one click handler?',
    choices: ['`setCount(count + 1)`', '`setCount((c) => c + 1)`', '`count += 1`', '`setCount(count++)`'],
    answer: 1,
    why: 'An **updater function** receives the result of the previous queued update, so the queue goes 0 → 1 → 2 → 3.' },
  { type: 'fib', topic: 'state',
    q: 'React calling your component function again to get a new description of the screen is called a ___.',
    accept: ['render', 're-render', 'rerender'],
    why: 'A **render** is the call; the **commit** is when React updates the DOM with the differences.' },
  { type: 'tf', topic: 'state',
    q: 'In React 18 and later, two state updates made inside a `setTimeout` callback cause one render, not two.',
    answer: true,
    why: 'Batching is automatic everywhere since React 18: event handlers, timers, promises and code after `await`.' },
  { type: 'mc', topic: 'state',
    q: 'A component does `const [title, setTitle] = useState(props.title)`. The parent later passes a different `title`. What does the component show?',
    choices: ['The new title, because props always win', 'The old title: the argument of `useState` is only used on the first render', 'An error', 'Nothing until the page reloads'],
    answer: 1,
    why: 'The initial value is read once. Copying a prop into state freezes it; read the prop directly unless you want an editable draft.' },
  { type: 'mc', topic: 'state',
    q: 'A list lets the user pick one task to show in a detail panel. What is the best state to keep?',
    choices: ['A copy of the selected task object', 'The selected task\'s `id`, and find the task during render', 'The index of the task and a copy of it', 'A boolean per task'],
    answer: 1,
    why: 'An id cannot go stale. A copy keeps the old title after the task is edited; `tasks.find((t) => t.id === selectedId)` is always current.' },
  { type: 'fib', topic: 'state',
    q: 'To read storage only once when creating state, pass `useState` a function: `useState(() => load())`. This is called a ___ initialiser.',
    accept: ['lazy'],
    why: 'React calls the initialiser function only on the first render; with `useState(load())` the call would run on every render.' },

  /* Updating objects and arrays */
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

  /* Effects, dependencies and cleanup */
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
    q: 'A `ChatRoom` effect with `[roomId]` connects in setup and disconnects in cleanup. `roomId` changes from "general" to "travel". In what order do the logs appear?',
    choices: ['connect travel, disconnect general', 'disconnect general, connect travel', 'disconnect travel, connect travel', 'connect travel only'],
    answer: 1,
    why: 'React runs the previous cleanup first (it closed over "general"), then the new setup.' },
  { type: 'fib', topic: 'effects',
    q: 'The function returned by an effect, which React runs before the effect re-runs and on unmount, is called the ___.',
    accept: ['cleanup', 'cleanup function', 'clean-up'],
    why: 'It undoes the setup: clear timers, remove listeners, close connections, abort requests.' },
  { type: 'tf', topic: 'effects',
    q: 'In development with `<StrictMode>`, an effect with `[]` running setup, cleanup and setup again on mount is a sign of a bug in React.',
    answer: false,
    why: 'It is deliberate: StrictMode simulates an unmount and remount to check that your cleanup undoes your setup. Production runs it once.' },
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
  { type: 'mc', topic: 'effects',
    q: 'An effect adds `window.addEventListener(\'resize\', () => setWidth(innerWidth))`. What should the cleanup be?',
    choices: ['`window.removeEventListener(\'resize\', () => setWidth(innerWidth))`', 'Keep the handler in a variable and remove that same function', 'No cleanup is needed for window events', '`window.onresize = null`'],
    answer: 1,
    why: 'Removal needs the **same** function object. A new arrow function is a different function, so nothing would be removed.' },

  /* Loading data in an effect */
  { type: 'tf', topic: 'fetching',
    q: '`useEffect(async () => { … }, [])` is the recommended way to fetch data in an effect.',
    answer: false,
    why: 'An async function returns a promise, but an effect must return nothing or a cleanup. Define an async function inside the effect and call it.' },
  { type: 'mc', topic: 'fetching',
    q: 'The server answers `404`. What does `await fetch(url)` do?',
    choices: ['Throws a TypeError', 'Resolves with a response whose `ok` is `false`', 'Returns `null`', 'Retries automatically'],
    answer: 1,
    why: '`fetch` rejects only when there is no response (network failure, abort). Check `res.ok` and throw yourself.' },
  { type: 'mc', topic: 'fetching',
    q: 'A list request succeeds and returns `[]`. Which of the four UI states should the user see?',
    choices: ['loading', 'error', 'empty: a message such as "No tasks match …"', 'success with an empty `<ul>`'],
    answer: 2,
    why: 'Empty is a successful answer with nothing in it: say so, and suggest what to do next. A bare empty list looks broken.' },
  { type: 'mc', topic: 'fetching',
    q: 'Why model a request with one `status` variable (`\'loading\' | \'error\' | \'success\'`) rather than two booleans `loading` and `error`?',
    choices: ['It uses less memory', 'Two booleans can contradict each other (both true), one status cannot', 'React requires strings in state', 'Booleans cannot trigger a render'],
    answer: 1,
    why: 'Impossible combinations disappear, and every branch checks one value.' },
  { type: 'mc', topic: 'fetching',
    q: 'In an effect with `[query]`, how should the request for the previous query be cancelled?',
    choices: ['Call `controller.abort()` in the effect\'s cleanup', 'Call `controller.abort()` at the top of the next render', 'Reload the page', 'Use `setTimeout` to wait for the user to stop typing'],
    answer: 0,
    why: 'React runs the cleanup exactly when the old request becomes outdated: before the effect runs for the new query, and on unmount.' },
  { type: 'fib', topic: 'fetching',
    q: 'When a fetch is cancelled by its AbortController, the promise rejects with an error whose `name` is \'___\'.',
    accept: ['AbortError'],
    why: 'Check `err.name === \'AbortError\'` and ignore it: you cancelled the request on purpose.' },
  { type: 'tf', topic: 'fetching',
    q: 'Without a cleanup, a slower response for an old search can arrive after the response for the new search and overwrite it.',
    answer: true,
    why: 'Responses can arrive in any order: a race condition. An abort or an ignore flag in the cleanup prevents it.' },

  /* Rules of hooks and custom hooks */
  { type: 'mc', topic: 'hooks',
    q: 'How does React know which `useState` call a value belongs to?',
    choices: ['By the variable name you destructure into', 'By the order of the hook calls in each render', 'By a hidden id written by the compiler', 'By the initial value'],
    answer: 1,
    why: 'State lives in a list of slots handed out in call order, which is why the order must be the same on every render.' },
  { type: 'mc', topic: 'hooks',
    q: 'Which of these breaks the rules of hooks?',
    choices: ['`const [a, setA] = useState(0);` as the first line', '`if (!user) return <Login />;` followed by `useState`', 'A `useEffect` whose setup starts with `if (!enabled) return;`', 'Calling `useToggle()` at the top of a component'],
    answer: 1,
    why: 'The early return makes the number of hooks depend on `user`. Put the condition inside the effect or move the hooks above the return.' },
  { type: 'tf', topic: 'hooks',
    q: 'Two components that call the same custom hook `useCart()` share the same cart state.',
    answer: false,
    why: 'A custom hook shares logic, not state: each call has its own state. Shared data needs one owner (a common parent or a context).' },
  { type: 'fib', topic: 'hooks',
    q: 'The name of a custom hook must start with ___ so the rules of hooks apply to it.',
    accept: ['use'],
    why: 'The `use` prefix tells React\'s linter (and readers) that the function calls hooks.' },
  { type: 'mc', topic: 'hooks',
    q: 'A `useFetch(url)` hook should load again when…',
    choices: ['…any component in the app renders', '…`url` changes, or when its `reload` function is called', '…only on the first render', '…the window gets focus, always'],
    answer: 1,
    why: 'The URL is the dependency; `reload` bumps an internal counter that is also a dependency.' },
  { type: 'mc', topic: 'hooks',
    q: 'What is wrong with `useState(JSON.parse(localStorage.getItem(\'tasks\')))`?',
    choices: ['Nothing', 'It reads and parses storage on every render, and returns `null` when the key is missing', 'localStorage cannot store arrays', 'JSON.parse is asynchronous'],
    answer: 1,
    why: 'Use a lazy initialiser with a default and a `try/catch`: `useState(() => …)` reads once and handles missing or invalid data.' },
  { type: 'tf', topic: 'hooks',
    q: 'A function named `useFormatDate` that only formats a date and calls no hooks is a good custom hook name.',
    answer: false,
    why: 'Without hooks inside, it is a plain helper: name it `formatDate`. The `use` prefix promises that the function calls hooks.' },
];
