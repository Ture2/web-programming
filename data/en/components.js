'use strict';
/* Components: concept cards, rail groups and self-check quiz (React as the worked example). */

DATA.en.COMPONENTS_QUIZ_TOPICS = {
  jsx: 'Components and JSX',
  props: 'Props, children and files',
  lists: 'Lists and keys',
  conditions: 'Conditional rendering',
  events: 'Events and forms',
};

DATA.en.COMPONENTS_GROUPS = [
  { key: 'idea', label: 'Components and JSX', icon: 'component' },
  { key: 'props', label: 'Props and composition', icon: 'tree' },
  { key: 'lists', label: 'Lists and conditions', icon: 'loop' },
  { key: 'events', label: 'Events and forms', icon: 'forms' },
];

DATA.en.COMPONENTS_CONCEPTS = [
  /* ---- 1. Components and JSX --------------------------------------------------------------- */
  { id: 'vite-project', hub: 'idea', topic: 'jsx',
    title: 'A Vite project: from npm create to the browser',
    summary: '**Vite** is the build tool that turns a React project into something a browser can run: `npm run dev` serves it while you work, reloading on every save, and `npm run build` produces the files to publish.',
    html: [
      '<p>Browsers cannot read JSX (the HTML-like syntax of the next cards) or resolve the <code>import</code>s between your files by themselves. Vite does both: it compiles each file as the browser asks for it, and updates the page in place when you save (<strong>hot module replacement</strong>), often without losing what is on screen.</p>',
      '<dl><dt><code>npm install</code></dt><dd>Downloads React and Vite into <code>node_modules/</code> (see <a href="#/server/runtime/package-json">package.json</a>).</dd>'
        + '<dt><code>npm run build</code></dt><dd>Compiles and bundles everything into <code>dist/</code>: plain HTML, CSS and JavaScript that any static server can host. <code>npm run preview</code> serves that build locally.</dd></dl>',
      '<p><strong>Twice in development:</strong> <code>main.jsx</code> wraps the app in <code>&lt;StrictMode&gt;</code>, which renders every component twice to reveal impure code. Double <code>console.log</code> lines are expected while you develop and do not happen in the build (see <a href="#/browser/state-effects/strict-mode">StrictMode</a>).</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'The page is empty until main.jsx hands #root to React.',
      desc: 'The browser loads index.html, which contains an empty div with id root and a script tag. The script is main.jsx, the entry point. main.jsx calls createRoot on the root element, and renders the App component into it; every other component is imported from App.',
      nodes: [
        { id: 'html', label: '`index.html`', note: 'an empty `#root`' },
        { id: 'main', label: '`main.jsx`', note: 'the entry point', key: true },
        { id: 'root', label: '`createRoot`', note: 'takes over `#root`' },
        { id: 'app', label: '`<App />`', note: 'the rest of the app' },
      ],
      edges: [['html', 'main', 'loads'], ['main', 'root'], ['root', 'app', 'renders']],
    },
    code: `# Create, install and run
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev          # http://localhost:5173, reloads on save

<!-- index.html: the only HTML page -->
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>

// src/main.jsx: connect React to #root
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
    example: 'Open the browser\'s developer tools on a running Vite app and look at the Elements panel: `index.html` contains only `<div id="root">`, and everything inside it was created by React. View the page source instead (Ctrl+U) and `#root` is empty: the content does not exist until the JavaScript runs.',
    mistake: 'Opening `index.html` directly from the file explorer (a `file://` address) and getting a blank page. The browser cannot compile JSX or resolve the imports by itself; the page only works through `npm run dev` (development) or after `npm run build` from a server. A blank page with Vite running usually means an error: open the console (F12).' },

  { id: 'what-is-a-component', hub: 'idea', topic: 'jsx',
    title: 'A component: a function from data to UI',
    summary: 'A **component** is a function that receives data and returns a description of a piece of the interface; an app is a tree of components, each responsible for one part of the screen.',
    html: [
      '<p>You never move pieces of the page around yourself: you describe what one part of the screen looks like for some data, and a library produces the page and keeps it matching. Same data, same UI: that is what makes components predictable and reusable. React, Vue, Svelte and Angular all build on this idea; the examples here use React.</p>',
      '<ul><li><strong>A function:</strong> data in, a description of UI out. In React it returns <strong>JSX</strong> (see <a href="#/browser/components/jsx-compiles">JSX is JavaScript</a>).</li>'
        + '<li><strong>A capital letter:</strong> <code>TaskItem</code>, used as a tag, <code>&lt;TaskItem /&gt;</code>. React calls the function when it needs that part of the page; you never call it yourself.</li>'
        + '<li><strong>A tree:</strong> one root component, usually <code>App</code>, renders the others. Each piece is small enough to read in one go, reusable (the same <code>TaskItem</code> for every task) and changeable without touching the rest.</li></ul>',
    ],
    diagram: {
      kind: 'tree',
      title: 'A screen is a tree of components; TaskItem is written once and used for every task.',
      desc: 'App is the root. It renders Header, TaskList and NewTaskForm. TaskList renders one TaskItem for each task, here two.',
      nodes: [
        { id: 'app', label: 'App', note: 'the root', key: true },
        { id: 'header', label: 'Header' },
        { id: 'list', label: 'TaskList' },
        { id: 'item1', label: 'TaskItem' },
        { id: 'item2', label: 'TaskItem' },
        { id: 'form', label: 'NewTaskForm' },
      ],
      edges: [['app', 'header'], ['app', 'list'], ['list', 'item1'], ['list', 'item2'], ['app', 'form']],
    },
    live: { kind: 'react', code: `function TaskItem() {
  return <li>Buy milk</li>;
}

function App() {
  return (
    <main>
      <h1>My tasks</h1>
      <ul>
        <TaskItem />
        <TaskItem />
      </ul>
    </main>
  );
}` },
    example: 'In the box, `App` uses `TaskItem` twice, so React calls the `TaskItem` function twice and the list shows two items. Rename `TaskItem` to `taskItem` (both the function and the tags): the items disappear, and React warns in the console about the casing of the tag. A lowercase tag means "an HTML element called taskitem", not "my component". Both items say "Buy milk" because the component has no input yet: [Props](#/browser/components/props) fixes that.',
    mistake: 'Calling a component as a function, `{TaskItem()}`, instead of rendering it as `<TaskItem />`. It may seem to work, but React no longer sees a separate component, so anything React keeps for each component (its state, see [useState](#/browser/state-effects/use-state)) ends up attached to the parent and breaks in confusing ways. Render components with the tag syntax and let React call them.' },

  { id: 'declarative-ui', hub: 'idea', topic: 'jsx',
    title: 'Describe the result, not the steps',
    summary: 'With the DOM API you write the **steps** that change the page; with components you write **what the page should look like** for the current data, and the library works out the steps. This is **declarative** UI.',
    html: [
      '<p>The UI becomes a function of the data, <code>UI = f(data)</code>: one place says what the screen looks like, so it cannot drift from the data. When the data changes, React calls your component again, compares the new description with the previous one (<strong>reconciliation</strong>) and makes only the DOM changes needed.</p>',
      '<table><caption>Two ways to keep a task list on screen</caption><thead><tr><th scope="col"></th><th scope="col">Imperative (the DOM API)</th><th scope="col">Declarative (a component)</th></tr></thead><tbody>'
        + '<tr><th scope="row">You write</th><td>The steps: create, fill, append, update the counter</td><td>What the page looks like for these tasks</td></tr>'
        + '<tr><th scope="row">A task is added</th><td>You run every step again, by hand</td><td>You add it to the data; React works out the steps</td></tr>'
        + '<tr><th scope="row">A step is forgotten</th><td>The page lies about the data: a stale counter, a "no tasks" message that stays</td><td>Cannot happen: there is one description</td></tr>'
        + '<tr><th scope="row">Changes go through</th><td>The DOM</td><td>The data (state)</td></tr>'
        + '</tbody></table>',
      '<p>The price: every change must be expressed as a <strong>data change</strong>, never as a DOM edit (see <a href="#/browser/state-effects">State and effects</a>). The DOM API itself is in <a href="#/browser/dom">DOM and events</a>.</p>',
    ],
    code: `// Imperative (DOM API): every change is a list of steps
const ul = document.querySelector('#tasks');
const li = document.createElement('li');
li.textContent = 'Call Ana';
ul.appendChild(li);
document.querySelector('#count').textContent = ul.children.length;

// Declarative (a React component): the page for the current data
function TaskList({ tasks }) {
  return (
    <>
      <p>{tasks.length} tasks</p>
      <ul>
        {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
      </ul>
    </>
  );
}`,
    example: 'Add a task in each version of the code. Imperative: you append an `<li>` **and** remember to update the counter (and the empty message, and the "all done" badge…). Declarative: you add the task to the array; React calls `TaskList` again with the new array, sees one more `<li>` and a new number in the `<p>`, and changes exactly those two things in the DOM. (The `key` on each `<li>` is explained in [Keys](#/browser/components/keys).)',
    mistake: 'Mixing both styles: calling `document.querySelector(...).textContent = …` inside a React app to "quickly" update something. React does not know about that change; the next time it re-renders the component it puts back what the component describes, and your edit vanishes (or React gets confused about the DOM it manages). Change the data and let the component describe the result.' },

  { id: 'jsx-compiles', hub: 'idea', topic: 'jsx',
    title: 'JSX is JavaScript: what it compiles to',
    summary: '**JSX** is an HTML-like syntax inside JavaScript: a compiler turns every tag into a function call, `React.createElement(type, props, ...children)`, which returns a plain object describing that piece of UI.',
    html: [
      '<p>Browsers do not understand JSX: before your code runs, the compiler (Vite, as you save) rewrites each tag into a call. Once you see a tag as a function call, its rules stop being arbitrary: attributes are the keys of an object, <code>{…}</code> is an argument, and a component returns one value.</p>',
      '<dl><dt>type</dt><dd>A string for an HTML tag (<code>\'h1\'</code>), or the component function itself (<code>TaskItem</code>, no quotes). That is why components start with a capital letter: the compiler reads a capitalised tag as a variable.</dd>'
        + '<dt>props</dt><dd>An object with the attributes; <code>null</code> when there are none.</dd>'
        + '<dt>children</dt><dd>Everything between the opening and closing tags, compiled the same way, so nested tags become nested calls.</dd></dl>',
      '<p><strong>The automatic runtime:</strong> current projects compile to <code>jsx(\'h1\', { className: \'title\', children: … })</code>, imported for you from <code>react/jsx-runtime</code>. That is why modern files need no <code>import React</code>. The idea is the same: a tag is a call that returns an object.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'A tag is a function call that returns an object.',
      desc: 'You write a JSX tag such as an h1 with some text. The compiler, which Vite runs as you save, rewrites it into a createElement call. When the code runs, that call returns a plain object with a type and props.',
      nodes: [
        { id: 'jsx', label: '`<h1>Hi</h1>`', note: 'what you write' },
        { id: 'compiler', label: 'The compiler', note: 'Vite, on save' },
        { id: 'call', label: '`createElement(…)`', note: 'a function call', key: true },
        { id: 'object', label: 'An object', note: '`{ type, props }`' },
      ],
      edges: [['jsx', 'compiler'], ['compiler', 'call'], ['call', 'object', 'returns']],
    },
    code: `// What you write
const el = (
  <ul className="tasks">
    <li>Buy milk</li>
    <TaskItem title="Call Ana" />
  </ul>
);

// What the compiler writes (classic form)
const el = React.createElement('ul', { className: 'tasks' },
  React.createElement('li', null, 'Buy milk'),
  React.createElement(TaskItem, { title: 'Call Ana' })
);`,
    widget: 'jsx-viewer',
    example: 'In the JSX viewer, pick the example "A component with props and children". Pane 1 shows `React.createElement(Card, { title: "Today" }, React.createElement(\'p\', null, "Buy milk"))`: the type of the outer call is the **function** `Card`, not a string, and the `<p>` is compiled first and passed as an argument. Pane 2 shows the object that call returns.',
    mistake: 'Thinking JSX is HTML and copying HTML habits into it: `class=`, `for=`, unclosed `<input>`, `onclick="save()"` as a string. JSX is JavaScript, so it follows JavaScript names and syntax: `className`, `htmlFor`, `<input />`, `onClick={save}`. See [JSX rules](#/browser/components/jsx-rules).' },

  { id: 'elements-and-rendering', hub: 'idea', topic: 'jsx',
    title: 'Elements, rendering and the DOM',
    summary: 'A **React element** is the plain object a JSX tag produces, `{ type, key, props }`; **rendering** is React calling your components to get a tree of elements, then making the DOM match it.',
    html: [
      '<p>An element is a <strong>description</strong>: creating one is cheap and changes nothing on screen, and elements are never edited, each render produces a new tree. Rendering has two phases. In <strong>render</strong>, React calls your components, and the components they return, until only HTML elements remain. In <strong>commit</strong>, it compares the new tree with the previous one and changes only what differs in the real DOM.</p>',
      '<p>Your component only takes part in the render phase, which is why it must be a pure description (see <a href="#/browser/components/pure-render">Keep rendering pure</a>). Each render calls the function from the top: local variables are recalculated, and nothing survives from the previous call unless React keeps it for you (see <a href="#/browser/state-effects/use-state">useState</a>).</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Your component runs in the render phase; only the commit touches the DOM.',
      desc: 'Step 1: the data a component depends on changes, its state or its props. Step 2: render, React calls the components. Step 3: the result is a tree of elements, plain objects. Step 4: commit, React compares it with the previous tree. Step 5: the DOM changes, but only where the trees differ.',
      nodes: [
        { id: 'change', label: 'Data changes', note: 'state or props' },
        { id: 'render', label: 'Render', note: 'React calls components', key: true },
        { id: 'tree', label: 'Element tree', note: 'plain objects' },
        { id: 'commit', label: 'Commit', note: 'compare with the last' },
        { id: 'dom', label: 'The DOM', note: 'only the differences' },
      ],
      edges: [['change', 'render'], ['render', 'tree'], ['tree', 'commit'], ['commit', 'dom']],
    },
    live: { kind: 'react', code: `function Greeting({ name }) {
  console.log('Greeting renders for', name);
  return <p>Hello, {name}!</p>;
}

function App() {
  const el = <Greeting name="Ana" />;
  console.log('The element is an object:', el.type.name, el.props);
  return (
    <div>
      {el}
      {el}
    </div>
  );
}` },
    example: 'In the box, look at the console: `App` creates the element once, and it is only an object with `type` (the `Greeting` function) and `props` (`{ name: \'Ana\' }`). `Greeting` runs **twice**, once for each place the element appears in the tree, because rendering means React calling the component for every place it is used.',
    mistake: 'Expecting a component to run once, like a script at the end of `<body>`. It runs on every render, possibly many times; a `console.log` in it prints again and again (and twice per render in development, see [StrictMode](#/browser/state-effects/strict-mode)). Code that must run once, or that talks to the outside world (fetching, timers), does not belong in the body of the component.' },

  { id: 'pure-render', hub: 'idea', topic: 'jsx',
    title: 'Keep rendering pure: compute, do not change',
    summary: 'A component\'s body should only **compute** its JSX from its inputs (props and state): no changing variables outside it, no editing props or arrays in place, no requests or timers.',
    html: [
      '<p>React may call your component at any time and any number of times. If the body changes something outside itself, every call changes it again: a global counter goes up twice, <code>tasks.push(…)</code> adds the same item twice, <code>tasks.sort()</code> reorders the parent\'s array behind its back. A <strong>pure</strong> component behaves like a maths function: the same input gives the same output, and nothing else happens.</p>',
      '<table><caption>In the body of a component</caption><thead><tr><th scope="col">Fine</th><th scope="col">Not in the body</th></tr></thead><tbody>'
        + '<tr><th scope="row">Compute with <code>filter</code>, <code>map</code>, <code>toSorted</code>, spread copies</th><td>Mutate with <code>push</code>, <code>sort</code>, <code>props.x = …</code></td></tr>'
        + '<tr><th scope="row">Read props and state</th><td>Change a variable declared outside the component</td></tr>'
        + '<tr><th scope="row">Return JSX</th><td>Fetch data, start a timer, write to <code>localStorage</code></td></tr>'
        + '</tbody></table>',
      '<p><strong>Derived values</strong> (a count, a filtered list, a label) are computed on every render, never stored separately (see <a href="#/browser/state-effects/derived-values">Don\'t store what you can compute</a>). Work that must happen <em>because</em> of a render goes in an <a href="#/browser/state-effects/what-is-effect">effect</a>; work caused by the user goes in an <a href="#/browser/components/events">event handler</a>.</p>',
    ],
    live: { kind: 'react', code: `const tasks = [
  { id: 't1', title: 'Water the plants', done: false },
  { id: 't2', title: 'Buy milk', done: true },
  { id: 't3', title: 'Call Ana', done: false },
];

function TaskSummary({ tasks, search }) {
  // Derived values: computed every render, never stored.
  const pending = tasks.filter((t) => !t.done).length;
  const shown = tasks
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.title.localeCompare(b.title));
  return (
    <>
      <p>{pending} of {tasks.length} left</p>
      <ul>{shown.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}

function App() {
  return <TaskSummary tasks={tasks} search="a" />;
}` },
    example: 'The box sorts with `toSorted`, which returns a new array. Replace it with `.sort(…)` after the `filter`: still fine, because `filter` already made a copy. But `tasks.sort(…)` directly would reorder the shared `tasks` array, so any other component reading it would also see the new order, a change nobody asked for.',
    mistake: 'Storing a derived value in its own state and trying to keep it updated ("when the tasks change, also update `pendingCount`"). Two sources of truth eventually disagree. If it can be computed from what you already have, compute it during render.' },

  { id: 'jsx-rules', hub: 'idea', topic: 'jsx',
    title: 'JSX rules: one parent, closed tags, JavaScript names',
    summary: 'JSX must be valid JavaScript: a component returns **one** root (a fragment `<>…</>` groups without adding an element), **every tag is closed**, and attributes use JavaScript names.',
    html: [
      '<p>Every rule follows from "a tag is a function call". A component returns <strong>one</strong> value, so siblings need a parent: an element, or a <strong>fragment</strong> <code>&lt;&gt;…&lt;/&gt;</code> (<code>React.Fragment</code>), which groups them without adding anything to the DOM. That matters inside lists, tables and flex containers, where an extra <code>&lt;div&gt;</code> breaks the structure.</p>',
      '<table><caption>HTML habits and their JSX form</caption><thead><tr><th scope="col">HTML</th><th scope="col">JSX</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>class="x"</code>, <code>for="email"</code></th><td><code>className="x"</code>, <code>htmlFor="email"</code></td><td><code>class</code> and <code>for</code> are reserved words in JavaScript</td></tr>'
        + '<tr><th scope="row"><code>&lt;input&gt;</code>, <code>&lt;br&gt;</code></th><td><code>&lt;input /&gt;</code>, <code>&lt;br /&gt;</code></td><td>The compiler needs to know where children end; any element may self-close</td></tr>'
        + '<tr><th scope="row"><code>onclick="save()"</code>, <code>tabindex</code></th><td><code>onClick={save}</code>, <code>tabIndex</code></td><td>Multi-word names are camelCase; <code>aria-*</code> and <code>data-*</code> keep their dashes</td></tr>'
        + '<tr><th scope="row"><code>style="color: red"</code></th><td><code>style={{ color: \'red\', marginTop: 8 }}</code></td><td>An object: outer braces open JavaScript, inner ones are the object; numbers get <code>px</code></td></tr>'
        + '<tr><th scope="row"><code>&lt;!-- note --&gt;</code></th><td><code>{/* note */}</code></td><td>A JavaScript comment inside braces</td></tr>'
        + '</tbody></table>',
      '<p>Most styles still belong in CSS classes; the object form is for values computed at runtime (see <a href="#/browser/styling-testing/inline-styles">Inline styles</a>).</p>',
    ],
    live: { kind: 'react', code: `function App() {
  const late = true;
  return (
    <>
      {/* a fragment: no extra element in the DOM */}
      <label htmlFor="email" className="label">Email</label>
      <input id="email" type="email" />
      <img src="data:," alt="" />
      <p style={{ color: late ? 'crimson' : 'green', marginTop: 8 }}>
        {late ? 'Late' : 'On time'}
      </p>
    </>
  );
}` },
    example: 'In the box, delete the `/` of `<input … />`: the preview stops updating and a syntax error points at the line, because the compiler cannot tell where the input ends. Change `className` to `class`: it still renders, but React warns `Invalid DOM property \'class\'. Did you mean \'className\'?` in the console.',
    mistake: 'Wrapping everything in an extra `<div>` "to make the error go away". It works, but it adds a real element to the page: inside a `<ul>` you end up with `<div>` between `<ul>` and `<li>` (invalid HTML), and in a flex or grid container the wrapper becomes the only item, breaking the layout. Use a fragment when you only need grouping.' },

  { id: 'jsx-expressions', hub: 'idea', topic: 'jsx',
    title: 'Expressions in braces: what can go in {…}',
    summary: 'Braces open a window to JavaScript inside JSX: they take any **expression** (something that produces a value), but not statements such as `if` or `for`.',
    html: [
      '<p>Braces become a function argument, so anything you could pass to a function works: <code>{task.title}</code>, <code>{tasks.length * 2}</code>, <code>{formatDate(task.due)}</code>, <code>{done ? \'✓\' : \'…\'}</code>. An <code>if</code> or a <code>for</code> is a statement, not a value: write it before the <code>return</code> and keep the result in a variable, or use the expression forms, the ternary and <code>map</code>.</p>',
      '<table><caption>What renders as a child</caption><thead><tr><th scope="col">Value</th><th scope="col">Renders as</th></tr></thead><tbody>'
        + '<tr><th scope="row">Strings and numbers</th><td>Text (so <code>0</code> shows as 0)</td></tr>'
        + '<tr><th scope="row">Elements</th><td>DOM</td></tr>'
        + '<tr><th scope="row">Arrays</th><td>Each item, in order</td></tr>'
        + '<tr><th scope="row"><code>null</code>, <code>undefined</code>, <code>true</code>, <code>false</code></th><td>Nothing: this is what makes <a href="#/browser/components/conditional-rendering">conditional rendering</a> work</td></tr>'
        + '<tr><th scope="row">A plain object</th><td>An error: "Objects are not valid as a React child"; show one of its fields</td></tr>'
        + '</tbody></table>',
      '<p><strong>In attributes</strong>, quotes mean a fixed string and braces a JavaScript value: <code>title="5"</code> is a string, <code>count={5}</code> a number, <code>done={false}</code> a boolean, <code>src={user.avatarUrl}</code> a variable. <code>"{name}"</code> in quotes is the literal text <code>{name}</code>.</p>',
    ],
    live: { kind: 'react', code: `function App() {
  const task = { title: 'Buy milk', due: '2026-10-07', done: false };
  const tags = ['home', 'shopping'];
  const daysLeft = 2;
  return (
    <article>
      <h2>{task.title.toUpperCase()}</h2>
      <p>Due {task.due}: {daysLeft * 24} hours left</p>
      <p>Status: {task.done ? 'done' : 'to do'}</p>
      <p>Tags: {tags.join(', ')}</p>
      <p>{null}{false}{undefined}(nothing above renders)</p>
    </article>
  );
}` },
    example: 'In the box, add `<p>{task}</p>`: the preview shows the error "Objects are not valid as a React child (found: object with keys {title, due, done})". React cannot guess how to display an object; `{task.title}` or `{JSON.stringify(task)}` (for debugging) can be displayed.',
    mistake: 'Putting an `if` inside JSX: `{if (done) { <p>Done</p> }}` is a syntax error, because braces expect a value. Compute it before the `return` (`let badge = null; if (done) badge = <p>Done</p>;` then `{badge}`), or use an expression: `{done ? <p>Done</p> : null}`. See [Conditional rendering](#/browser/components/conditional-rendering).' },

  /* ---- 2. Props and composition ------------------------------------------------------------ */
  { id: 'props', hub: 'props', topic: 'props',
    title: 'Props: passing data into a component',
    summary: '**Props** (properties) are the inputs of a component: the attributes you write on its tag arrive as one object, the first parameter of the function.',
    html: [
      '<p>Props are to a component what arguments are to a function: <code>&lt;TaskItem title="Buy milk" done={true} /&gt;</code> calls <code>TaskItem</code> with <code>{ title: \'Buy milk\', done: true }</code>. The usual style destructures that object in the parameter, <code>function TaskItem({ title, done })</code>, so the inputs read like a contract at the top. One component then shows different data each time it is used.</p>',
      '<ul><li><strong>Any value:</strong> strings in quotes; numbers, booleans, arrays, objects, elements and functions in braces. A function prop is how a child tells its parent that something happened (see <a href="#/browser/components/events">Events</a>).</li>'
        + '<li><strong>A missing prop</strong> is <code>undefined</code>: give a default in the destructuring when a sensible one exists, <code>{ size = \'medium\' }</code>.</li>'
        + '<li><strong>A bare attribute,</strong> <code>&lt;Badge urgent /&gt;</code>, passes <code>urgent: true</code>.</li>'
        + '<li><strong>One object or separate fields:</strong> <code>task={task}</code> is shorter; <code>title={…} done={…}</code> makes the dependencies explicit. Pick one style per component.</li></ul>',
    ],
    live: { kind: 'react', code: `function TaskItem({ title, done, priority = 'normal' }) {
  return (
    <li>
      {done ? '✓' : '○'} {title}
      {priority === 'high' && <strong> (urgent)</strong>}
    </li>
  );
}

function App() {
  return (
    <ul>
      <TaskItem title="Buy milk" done={true} />
      <TaskItem title="Call Ana" done={false} priority="high" />
      <TaskItem title="Water the plants" />
    </ul>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Practise props in the component playground' },
    example: 'The third `TaskItem` passes no `done`, so `done` is `undefined` (falsy) and the item shows `○`; it passes no `priority`, so the default `\'normal\'` applies. Change `done={true}` to `done="false"`: the first item now shows `✓`, because the **string** `"false"` is truthy. Quotes pass strings; braces pass values.',
    mistake: 'Writing `<TaskItem done="false" count="3" />` and expecting a boolean and a number. Quoted props are always strings: `"false"` is truthy and `"3" + 1` is `"31"`. Use braces for anything that is not text: `done={false}`, `count={3}`.' },

  { id: 'props-read-only', hub: 'props', topic: 'props',
    title: 'Props are read-only: data flows down',
    summary: 'A component must never change its props: data flows **one way**, from parent to child, and a child that needs a change asks the parent by calling a function the parent passed down.',
    html: [
      '<p>Props belong to the parent: they are a snapshot of its data at render time. If a child edited them, the parent would not know (React renders again on new data, not on mutation), and the change could leak into other components sharing the same object. In development React freezes the props object, so <code>props.title = …</code> throws.</p>',
      '<p><strong>State, in one paragraph:</strong> the box keeps its tasks in <strong>state</strong>, a value React remembers between renders. <code>const [tasks, setTasks] = useState(initialTasks)</code> gives the current value and a function to replace it; calling <code>setTasks(newArray)</code> makes React render again with the new value. The full story is in <a href="#/browser/state-effects/use-state">useState and what a re-render is</a>.</p>',
      '<figure data-diagram></figure>',
      '<p>This is <strong>one-way data flow</strong>: data travels down as props, requests travel up as <strong>callbacks</strong>. To find out who can change a value, look upwards for its owner. Choosing which component should own it is <a href="#/browser/shared-state/lifting-state">lifting state up</a>.</p>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'Data goes down as props; requests come back up as callbacks.',
      desc: 'The parent keeps the tasks in state and passes each task down to TaskItem as a prop. When the user clicks, TaskItem calls onToggle, a function the parent passed down. The parent calls setTasks with a new array, and React renders both again with the new data.',
      nodes: [
        { id: 'state', label: 'Parent state', note: '`tasks`', key: true },
        { id: 'child', label: '`TaskItem`', note: 'receives `task`' },
        { id: 'callback', label: '`onToggle()`', note: 'asks the parent' },
        { id: 'set', label: '`setTasks`', note: 'a new array' },
      ],
      edges: [['state', 'child', 'props'], ['child', 'callback', 'click'], ['callback', 'set'], ['set', 'state', 're-render']],
    },
    live: { kind: 'react', code: `import { useState } from 'react';

function TaskItem({ task, onToggle }) {
  // task.done = !task.done;  ← never: props are read-only
  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={onToggle} />
        {task.title}
      </label>
    </li>
  );
}

function App() {
  const [tasks, setTasks] = useState([
    { id: 't1', title: 'Buy milk', done: false },
    { id: 't2', title: 'Call Ana', done: true },
  ]);
  function toggle(id) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  const left = tasks.filter((t) => !t.done).length;
  return (
    <>
      <p>{left} left</p>
      <ul>
        {tasks.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggle(t.id)} />)}
      </ul>
    </>
  );
}` },
    example: 'Tick "Buy milk" in the box. `TaskItem` does not change anything itself: it calls `onToggle`, the parent\'s `toggle` builds a **new** array with a new task object, and React re-renders `App`, so both the checkbox and the "left" counter update together. The counter could never update if the child had flipped `task.done` on its own copy.',
    mistake: 'Copying a prop into the child\'s own state "so it can be edited": `const [title, setTitle] = useState(props.title)`. The copy is taken once, so when the parent later passes a new title the child keeps showing the old one, and now two components disagree about the data. Read the prop directly, and send changes up with a callback (see [State, props and derived values](#/browser/state-effects/what-is-state)).' },

  { id: 'children', hub: 'props', topic: 'props',
    title: 'children: components that wrap other content',
    summary: 'Whatever you put **between** a component\'s opening and closing tags arrives as a special prop, `children`, so you can build wrappers (cards, panels, layouts, dialogs) that do not need to know what they contain.',
    html: [
      '<p><code>&lt;Card title="Today"&gt;&lt;p&gt;Buy milk&lt;/p&gt;&lt;/Card&gt;</code> calls <code>Card</code> with <code>{ title: \'Today\', children: &lt;p&gt;Buy milk&lt;/p&gt; }</code>, and the card decides <strong>where</strong> the content goes by writing <code>{children}</code> in its JSX. With several things inside, <code>children</code> is an array; with none, it is <code>undefined</code>, which renders nothing.</p>',
      '<ul><li><strong>Composition instead of options:</strong> rather than one component with a prop for every variation (<code>showFooter</code>, <code>footerText</code>, <code>icon</code>…), build small pieces and nest them.</li>'
        + '<li><strong>Layouts</strong> are the classic case: a <code>Layout</code> renders the header and the navigation, and puts each page in between with <code>{children}</code>. Forms, dialogs and list sections follow the same pattern.</li>'
        + '<li><strong>More than one slot:</strong> pass elements through ordinary props as well, <code>&lt;Panel title="Tasks" actions={&lt;button&gt;Add&lt;/button&gt;}&gt;…&lt;/Panel&gt;</code>.</li></ul>',
    ],
    live: { kind: 'react', code: `function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function App() {
  return (
    <>
      <Card title="Today">
        <p>Buy milk</p>
        <p>Call Ana</p>
      </Card>
      <Card title="Notes">
        <em>Nothing yet.</em>
      </Card>
    </>
  );
}`, css: `.card { border: 1px solid #ccc; border-radius: 8px; padding: 4px 12px; margin-bottom: 10px; }
.card h2 { font-size: 1.1rem; color: #1a1f6c; }` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Practise children in the component playground' },
    example: 'Both cards share the border, padding and heading style, but contain different content: two paragraphs in the first, an `<em>` in the second. Remove `{children}` from `Card`: the titles stay but the content disappears, because nothing tells React where to put it.',
    mistake: 'Forgetting to destructure or render `children`: the component is written as `function Card({ title })`, the content between the tags is silently dropped, and there is no error. If content you wrote between tags is missing, check that the wrapper renders `{children}`.' },

  { id: 'composition-and-files', hub: 'props', topic: 'props',
    title: 'Composing components and splitting files',
    summary: 'Build screens by **composing** small components, and give each component its own file, connected with `export` and `import`.',
    html: [
      '<p>Draw boxes around the parts of a design and name them. A box that repeats (one per task) or has its own job (the form, the filter bar) is a component; a few tags used once can stay inline. Aim for components you can describe in one sentence, and split a file when it becomes hard to scroll through.</p>',
      '<dl><dt><code>pages/</code></dt><dd>One component per screen: the task list, the task detail, the log-in page.</dd>'
        + '<dt><code>components/</code></dt><dd>Reusable pieces that pages are built from.</dd>'
        + '<dt><code>api/</code>, <code>hooks/</code></dt><dd>Code that is not UI: requests to the server, reusable logic.</dd></dl>',
      '<p>Each component lives in a file named after it (<code>TaskItem.jsx</code>), exported and imported with a relative path. Default and named exports are imported differently (see <a href="#/server/runtime/es-modules">ES modules</a>): pick one convention for components and use it everywhere. The folder names matter less than being consistent, so anyone can guess where a file lives.</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Each folder has one job; screens are built from the pieces below them.',
      desc: 'Three layers. pages holds one component per screen, and pages are built from the reusable components in components. Below them, api holds the code that talks to the server.',
      nodes: [
        { id: 'pages', label: '`pages/`', note: 'one per screen' },
        { id: 'components', label: '`components/`', note: 'reusable pieces' },
        { id: 'api', label: '`api/`', note: 'talks to the server' },
      ],
      edges: [],
    },
    code: `// src/components/TaskItem.jsx
export default function TaskItem({ task }) {
  return <li>{task.title}</li>;
}

// src/components/TaskList.jsx
import TaskItem from './TaskItem.jsx';

export default function TaskList({ tasks }) {
  return (
    <ul>
      {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}

// src/pages/TasksPage.jsx
import TaskList from '../components/TaskList.jsx';

export default function TasksPage() {
  const tasks = [{ id: 't1', title: 'Buy milk' }];
  return <TaskList tasks={tasks} />;
}

/*  src/
      main.jsx        renders <App /> into #root
      App.jsx
      pages/          one component per screen
      components/     reusable pieces
      api/            code that talks to the server       */`,
    example: 'The tasks page imports `TaskList`, which imports `TaskItem`: the import graph mirrors the component tree. If a teammate needs the same task row on a "Search results" page, they import `TaskItem` there too, and a fix to it shows up in both places.',
    mistake: 'Mixing up default and named imports: `import { TaskItem } from \'./TaskItem.jsx\'` when the file has `export default` gives `undefined`, and React then fails with "Element type is invalid: expected a string … but got: undefined". When you see that error, check the import against the export, and the file path.' },

  /* ---- 3. Lists and conditions ------------------------------------------------------------- */
  { id: 'rendering-lists', hub: 'lists', topic: 'lists',
    title: 'Rendering lists with map',
    summary: 'To show a list, turn the array of data into an array of elements with `array.map(item => <Element … />)`; React renders every element of an array, in order.',
    html: [
      '<p>There is no loop tag in JSX, and none is needed: an array of elements is a valid child. <code>tasks.map((task) =&gt; &lt;li key={task.id}&gt;{task.title}&lt;/li&gt;)</code> builds one <code>&lt;li&gt;</code> per task, and the list follows the data automatically.</p>',
      '<ul><li><strong><code>map</code>, not <code>forEach</code>:</strong> <code>map</code> returns the new array; <code>forEach</code> returns <code>undefined</code>, which renders nothing.</li>'
        + '<li><strong>Prepare, then map:</strong> <code>filter</code> to keep some items, <code>toSorted</code> to order them. Never <code>sort</code> the original array: it may be a prop or state. Compute the result in a variable above the <code>return</code> so the JSX stays readable.</li>'
        + '<li><strong>A <code>key</code> on each item</strong> tells React which item is which between renders (see <a href="#/browser/components/keys">Keys</a>). It goes on the element in the <code>map</code>, <code>&lt;TaskItem key={task.id} task={task} /&gt;</code>, not inside <code>TaskItem</code>.</li></ul>',
    ],
    live: { kind: 'react', code: `const tasks = [
  { id: 't1', title: 'Buy milk', done: true },
  { id: 't2', title: 'Call Ana', done: false },
  { id: 't3', title: 'Water the plants', done: false },
];

function App() {
  const pending = tasks.filter((t) => !t.done);
  return (
    <>
      <h2>To do ({pending.length})</h2>
      <ul>
        {pending.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Render a list in the component playground' },
    example: 'The box filters out done tasks, then maps the rest: two `<li>`. Change `map` to `forEach`: the list is empty and there is no error, because `forEach` returns `undefined`, which renders nothing.',
    mistake: 'Using curly braces in the arrow function and forgetting `return`: `tasks.map((t) => { <li>{t.title}</li> })` produces an array of `undefined`, so nothing renders. With braces the body is a block and needs `return`; with parentheses, `(t) => (<li>…</li>)`, the element is returned implicitly.' },

  { id: 'keys', hub: 'lists', topic: 'lists',
    title: 'Keys: telling list items apart',
    summary: 'A **key** is a string or number, unique among siblings, that identifies a list item across renders, so React keeps each item\'s DOM and state with the right item.',
    html: [
      '<p>When a list changes, React matches the old and new items by key, and keeps each item\'s DOM and state (a typed note, a focused input, an open menu) with that item. Without keys it matches by <strong>position</strong>: after an insertion at the top, each piece of state stays at its row number and ends up next to a different item.</p>',
      '<table><caption>Choosing a key</caption><thead><tr><th scope="col">Key</th><th scope="col">The same item keeps it?</th><th scope="col">Verdict</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>task.id</code>, from the data</th><td>Yes</td><td>The right choice</td></tr>'
        + '<tr><th scope="row"><code>crypto.randomUUID()</code>, when the item is created</th><td>Yes: stored with the item</td><td>Right for items made in the browser</td></tr>'
        + '<tr><th scope="row"><code>index</code>, the position</th><td>No: it changes on insert, remove or reorder</td><td>Only for lists that never change order or length</td></tr>'
        + '<tr><th scope="row"><code>Math.random()</code> in the render</th><td>No: new on every render</td><td>Never: every row is recreated each time</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Unique among siblings,</strong> not across the whole app: two lists can reuse the same ids.</li>'
        + '<li><strong>No key at all:</strong> React falls back to the index and warns "Each child in a list should have a unique key prop".</li>'
        + '<li><strong>For React only:</strong> the key is not passed to the component as a prop. Changing a component\'s key on purpose resets it (see <a href="#/browser/shared-state/state-and-position">State belongs to a place in the tree</a>).</li></ul>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

function Row({ title }) {
  return (
    <li>
      {title} <input placeholder="note" />
    </li>
  );
}

function App() {
  const [tasks, setTasks] = useState([
    { id: 'a', title: 'Buy milk' },
    { id: 'b', title: 'Call Ana' },
  ]);
  function addFirst() {
    const id = crypto.randomUUID();
    setTasks([{ id, title: 'New task ' + id.slice(0, 4) }, ...tasks]);
  }
  return (
    <>
      <button onClick={addFirst}>Add at the top</button>
      <ul>
        {tasks.map((task, index) => (
          <Row key={index} title={task.title} />
        ))}
      </ul>
    </>
  );
}` },
    practice: { href: '#/browser/components/practice/jsx-viewer', label: 'Fix a list without keys in the JSX viewer' },
    example: 'In the box, type "2 litres" in the note next to "Buy milk", then press **Add at the top**. The note stays in the **first** row, now next to the new task: with `key={index}` React thinks row 0 is the same item as before and keeps its input. Change it to `key={task.id}` (the preview starts afresh), repeat, and the note travels with "Buy milk".',
    mistake: 'Silencing the warning with `key={index}` or `key={Math.random()}`. The first hides the bug until the list is reordered, filtered or prepended (wrong rows keep the wrong inputs, checkboxes or animations); the second destroys every row on every render (inputs lose focus while you type). Use an id that belongs to the item.' },

  { id: 'conditional-rendering', hub: 'lists', topic: 'conditions',
    title: 'Conditional rendering: if, ternary and &&',
    summary: 'To show different UI for different data, use plain JavaScript: an **early return** for whole alternatives, a **ternary** for either/or inside JSX, and `&&` for "this or nothing".',
    html: [
      '<table><caption>Four tools, from the whole component down to one element</caption><thead><tr><th scope="col">Tool</th><th scope="col">Use it for</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row">Early return</th><td>A whole alternative: loading, error, empty</td><td><code>if (tasks.length === 0) return &lt;p&gt;No tasks yet.&lt;/p&gt;;</code></td></tr>'
        + '<tr><th scope="row">Ternary <code>? :</code></th><td>Either this or that, inside JSX</td><td><code>{done ? &lt;s&gt;{title}&lt;/s&gt; : title}</code></td></tr>'
        + '<tr><th scope="row"><code>&amp;&amp;</code></th><td>This or nothing</td><td><code>{isAdmin &amp;&amp; &lt;button&gt;Delete&lt;/button&gt;}</code></td></tr>'
        + '<tr><th scope="row"><code>return null</code></th><td>A component hiding itself</td><td><code>if (!badge) return null;</code></td></tr>'
        + '</tbody></table>',
      '<p>Early returns keep the main JSX flat: after them, the rest of the function deals only with the normal case. Every screen that shows data needs them for its loading, error and empty states (see <a href="#/browser/data-fetching">Fetching data</a>).</p>',
      '<p><strong>The <code>&amp;&amp;</code> trap:</strong> <code>a &amp;&amp; b</code> returns <code>a</code> when <code>a</code> is falsy. <code>false</code> renders nothing, but the <strong>number 0</strong> renders as <code>0</code>, so <code>{tasks.length &amp;&amp; …}</code> shows a stray 0 when the list is empty (and <code>NaN</code> shows "NaN"). Put a real boolean on the left, <code>tasks.length &gt; 0 &amp;&amp; …</code>, or use a ternary.</p>',
    ],
    live: { kind: 'react', code: `function TaskList({ tasks, isAdmin }) {
  if (tasks.length === 0) {
    return <p>No tasks yet.</p>;
  }
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id}>
          {t.done ? <s>{t.title}</s> : t.title}
          {isAdmin && <button>Delete</button>}
        </li>
      ))}
    </ul>
  );
}

function App() {
  const tasks = [{ id: 't1', title: 'Buy milk', done: true }];
  const none = [];
  return (
    <>
      <TaskList tasks={tasks} isAdmin={true} />
      <TaskList tasks={none} />
      <p>Trap: [{none.length && <b>never shown</b>}]</p>
    </>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Fix an empty-list message in the component playground' },
    example: 'The last line of the box shows `[0]`: `none.length` is `0`, so `0 && …` evaluates to `0` and React prints it. Change it to `none.length > 0 && …` and the brackets are empty. The empty `TaskList` uses an early return, so its main JSX never has to think about the empty case.',
    mistake: 'Writing `{count && <Badge count={count} />}` for a counter that can be zero, or `{items.length && …}` for a list. The page shows a lone 0 exactly when there is nothing to show. Compare explicitly (`count > 0`) or use a ternary.' },

  /* ---- 4. Events and forms ----------------------------------------------------------------- */
  { id: 'events', hub: 'events', topic: 'events',
    title: 'Events: pass a function, do not call it',
    summary: 'Event props such as `onClick`, `onChange` and `onSubmit` take a **function** that React calls when the event happens: `onClick={save}`, not `onClick={save()}`, which calls it during render.',
    html: [
      '<p><code>onClick={save}</code> hands React the function: "call this when someone clicks". <code>onClick={save()}</code> runs <code>save</code> <strong>while rendering</strong> and hands React its return value, usually <code>undefined</code>, so nothing happens on click. And if <code>save</code> changes state, the component renders again, calls <code>save()</code> again, and loops: "Too many re-renders".</p>',
      '<dl><dt><code>onClick={() =&gt; remove(task.id)}</code></dt><dd>Passes an argument: the arrow creates a function that calls <code>remove</code> later, with the right id.</dd>'
        + '<dt><code>e</code>, the event object</dt><dd>React\'s wrapper around the browser event, with the same main fields: <code>e.target</code>, <code>e.target.value</code>, <code>e.preventDefault()</code>, <code>e.stopPropagation()</code> (see <a href="#/browser/dom/event-object">The event object</a> and <a href="#/browser/dom/stop-propagation">stopPropagation</a>).</dd>'
        + '<dt>camelCase names</dt><dd><code>onClick</code>, <code>onChange</code>, <code>onKeyDown</code>, <code>onMouseEnter</code>, on HTML elements.</dd>'
        + '<dt><code>onX</code> on your own components</dt><dd>Just a prop name you choose: <code>&lt;TaskItem onDelete={…} /&gt;</code> does nothing until <code>TaskItem</code> passes it to a real element or calls it. Name handlers <code>handleX</code> inside a component and props <code>onX</code>.</dd></dl>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [log, setLog] = useState([]);
  function add(text) {
    setLog([...log, text]);
  }
  function handleClick(e) {
    add('clicked ' + e.target.textContent);
  }
  return (
    <>
      <button onClick={handleClick}>Save</button>{' '}
      <button onClick={() => add('deleted task t1')}>Delete t1</button>{' '}
      <button onClick={() => setLog([])}>Clear</button>
      <ul>
        {log.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Fix a click handler in the component playground' },
    example: 'Each button in the box adds a line. `handleClick` receives the event and reads the button text; the Delete button needs an argument, so it is wrapped in an arrow. Change `onClick={() => setLog([])}` to `onClick={setLog([])}`: the preview crashes with "Too many re-renders", because clearing during render triggers another render, forever. (The log uses the index as key: acceptable here, lines are only appended, never reordered.)',
    mistake: 'Writing `onClick={handleDelete(task.id)}` to pass the id. It calls `handleDelete` for every task as soon as the list renders, deleting everything or looping. Use `onClick={() => handleDelete(task.id)}`.' },

  { id: 'controlled-inputs', hub: 'events', topic: 'events',
    title: 'Controlled inputs: value and onChange',
    summary: 'A **controlled input** shows a value from state (`value={title}`) and reports every keystroke back (`onChange={(e) => setTitle(e.target.value)}`), so the state is the single source of truth for what the user typed.',
    html: [
      '<p>A plain input keeps its own text inside the DOM. A controlled input reverses the roles: the text lives in your component\'s <a href="#/browser/state-effects/use-state">state</a>, the input only displays it, and each keystroke asks to change it.</p>',
      '<ul><li><strong>Everything else becomes easy:</strong> a live preview, a character count, <code>disabled={title.trim() === \'\'}</code>, clearing after saving with <code>setTitle(\'\')</code>, forcing uppercase with <code>setCode(e.target.value.toUpperCase())</code>.</li>'
        + '<li><strong>Checkboxes</strong> use <code>checked</code> and <code>e.target.checked</code>; <code>&lt;select&gt;</code> and <code>&lt;textarea&gt;</code> use <code>value</code> like an input.</li></ul>',
      '<h3>Two warnings that mean the loop is broken</h3>',
      '<dl><dt><code>value</code> without <code>onChange</code></dt><dd>The input is read-only: every keystroke is undone, and React warns "You provided a <code>value</code> prop to a form field without an <code>onChange</code> handler".</dd>'
        + '<dt>A value that starts as <code>undefined</code></dt><dd>React warns "A component is changing an uncontrolled input to be controlled". Start the state as <code>\'\'</code>, not <code>undefined</code>.</dd></dl>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'The input only displays the state; every keystroke goes round the loop.',
      desc: 'The user types a character. The input\'s onChange handler receives the new text in e.target.value and calls setTitle with it. React renders again, and the input shows title, the new state. The next keystroke starts the loop again.',
      nodes: [
        { id: 'type', label: 'The user types' },
        { id: 'change', label: '`onChange`', note: '`e.target.value`' },
        { id: 'set', label: '`setTitle`', note: 'the new state' },
        { id: 'show', label: 'Input shows `title`', note: 'after the re-render', key: true },
      ],
      edges: [['type', 'change'], ['change', 'set'], ['set', 'show', 're-render'], ['show', 'type']],
    },
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [urgent, setUrgent] = useState(false);
  const empty = title.trim() === '';
  return (
    <div>
      <label htmlFor="t">Title </label>
      <input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        Urgent
      </label>
      <p>Preview: {empty ? '(empty)' : title}{urgent && ' (urgent)'} · {title.length}/40</p>
      <button disabled={empty} onClick={() => setTitle('')}>Clear</button>
    </div>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Build a controlled input in the component playground' },
    example: 'Type in the box: the preview and the counter follow every keystroke, and **Clear** empties the input because the input displays `title`. Remove the `onChange` from the text input: typing does nothing (the input keeps showing `title`, which never changes) and the console shows React\'s warning about `value` without `onChange`.',
    mistake: 'Writing `value={title}` and reading the text later with `document.getElementById(\'t\').value`, or forgetting `onChange`. In React the state is the truth: if it does not change, the input cannot change. Either control the input fully (`value` + `onChange`) or leave it uncontrolled and read it on submit (see [Uncontrolled inputs](#/browser/components/uncontrolled-inputs)).' },

  { id: 'uncontrolled-inputs', hub: 'events', topic: 'events',
    title: 'Uncontrolled inputs: defaultValue and FormData',
    summary: 'An **uncontrolled input** keeps its own value in the DOM: you give it a starting value with `defaultValue` and read every field once, on submit, with `new FormData(e.target)`.',
    html: [
      '<p>Not every field needs state. When you only need the values at the moment the form is sent (a log-in form, a search box submitted with Enter), let the browser keep the text, as plain HTML does, and read it from the form in the submit handler. Each input needs a <code>name</code>: it becomes the key.</p>',
      '<dl><dt><code>defaultValue="…"</code>, <code>defaultChecked</code></dt><dd>The starting value. React sets it once and then leaves the input alone.</dd>'
        + '<dt><code>new FormData(e.target)</code></dt><dd>Reads every named field of the submitted form.</dd>'
        + '<dt><code>Object.fromEntries(formData)</code></dt><dd>Turns it into a plain object such as <code>{ email: \'…\', password: \'…\' }</code>. A checked box gives <code>\'on\'</code>; an unchecked one is left out.</dd>'
        + '<dt><code>e.target.reset()</code></dt><dd>Puts every field back to its default value.</dd></dl>',
      '<table><caption>Controlled or uncontrolled?</caption><thead><tr><th scope="col"></th><th scope="col">Controlled</th><th scope="col">Uncontrolled</th></tr></thead><tbody>'
        + '<tr><th scope="row">The value lives in</th><td>State</td><td>The DOM</td></tr>'
        + '<tr><th scope="row">You read it</th><td>On every keystroke, through <code>value</code></td><td>Once, on submit, through <code>FormData</code></td></tr>'
        + '<tr><th scope="row">Good for</th><td>Live previews, checks as you type, fields that depend on each other</td><td>Simple forms read once: log-in, search</td></tr>'
        + '<tr><th scope="row">Re-renders while typing</th><td>Yes, every keystroke</td><td>No</td></tr>'
        + '</tbody></table>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [sent, setSent] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    setSent(data);
    e.target.reset();               // back to the default values
  }

  return (
    <form onSubmit={handleSubmit}>
      <p><label>Email <input name="email" type="email" defaultValue="ana@example.com" /></label></p>
      <p><label>Password <input name="password" type="password" /></label></p>
      <p><label><input name="remember" type="checkbox" defaultChecked /> Remember me</label></p>
      <button>Log in</button>
      {sent && <pre>{JSON.stringify(sent, null, 2)}</pre>}
    </form>
  );
}` },
    example: 'In the box, type a password and press **Log in**: the object shows all three fields, `remember: "on"`, and the form goes back to its defaults. Untick **Remember me** and log in again: `remember` is missing from the object, because `FormData` leaves unchecked boxes out. Nothing re-rendered while you typed.',
    mistake: 'Writing `value="ana@example.com"` instead of `defaultValue`. `value` makes the input controlled: without an `onChange` it is read-only, and React warns about it. Use `defaultValue` for a starting value you will read on submit, or control the input fully (see [Controlled inputs](#/browser/components/controlled-inputs)).' },

  { id: 'form-submit', hub: 'events', topic: 'events',
    title: 'Forms: onSubmit and preventDefault',
    summary: 'Handle a form with `onSubmit` on the `<form>`, not `onClick` on the button, and call `e.preventDefault()` first: by default the browser submits the form by loading a new page, which wipes your app\'s state.',
    html: [
      '<p>A <code>&lt;form&gt;</code> predates JavaScript apps: when submitted, it sends its fields and <strong>loads the response as a new page</strong>, which would throw away everything in memory. <code>e.preventDefault()</code> cancels that default action (see <a href="#/browser/dom/prevent-default">preventDefault</a>), so your handler deals with the data itself.</p>',
      '<figure data-diagram></figure>',
      '<ol><li><strong>Prevent</strong> the default: <code>e.preventDefault()</code>.</li>'
        + '<li><strong>Validate:</strong> trim the text; if it is empty or invalid, show a message and return early.</li>'
        + '<li><strong>Use</strong> the data: add it to the list, or send it to an API.</li>'
        + '<li><strong>Reset</strong> the fields.</li></ol>',
      '<p><strong>Inside a form, a <code>&lt;button&gt;</code> submits by default:</strong> give the other buttons <code>type="button"</code> (a "Cancel" button that submits is a classic bug). React 19 also accepts a function as the form\'s <code>action</code>; the <code>onSubmit</code> pattern works in every version and is the one most code uses.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Both ways of submitting reach onSubmit; onClick on the button sees only one of them.',
      desc: 'A form is submitted either by clicking its submit button or by pressing Enter in one of its fields. Both reach the onSubmit handler on the form, whose first line, e.preventDefault(), stops the browser from loading a new page.',
      nodes: [
        { id: 'click', label: 'Submit button', note: 'a click' },
        { id: 'enter', label: 'The Enter key', note: 'in any field' },
        { id: 'submit', label: '`onSubmit`', note: 'on the `<form>`', key: true },
        { id: 'prevent', label: '`preventDefault()`', note: 'no new page' },
      ],
      edges: [['click', 'submit'], ['enter', 'submit'], ['submit', 'prevent']],
    },
    live: { kind: 'react', code: `import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setError('Write a title first.');
      return;
    }
    setTasks([...tasks, { id: crypto.randomUUID(), title: clean }]);
    setTitle('');
    setError('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="title">New task </label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Add</button>
      <button type="button" onClick={() => setTasks([])}>Clear all</button>
      {error && <p role="alert">{error}</p>}
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </form>
  );
}` },
    practice: { href: '#/browser/components/practice/component-playground', label: 'Handle a submit in the component playground' },
    example: 'Add two tasks in the box, once with the button and once by pressing Enter: both go through `onSubmit`. Submit an empty title: the error appears and nothing is added. Now delete the line `e.preventDefault();` and add a task: the browser submits the form, the preview reloads and both the list and the input are gone.',
    mistake: 'Putting the logic in `onClick` of the submit button and skipping `preventDefault`. Pressing Enter in the input bypasses the click handler, and the default submission reloads the page; the symptom is "my list flashes and disappears". Use `onSubmit` on the form with `e.preventDefault()` as its first line.' },

  { id: 'form-fields', hub: 'events', topic: 'events',
    title: 'Forms with several fields and field errors',
    summary: 'For a form with several inputs, keep **one state object** with a field per input and one change handler that uses each input\'s `name`; keep the errors in a second object with the **same keys**.',
    html: [
      '<p>One <code>useState</code> per field works for two inputs and becomes noise at six. One object mirrors the form, and one handler serves every input when each has a <code>name</code> matching its key: <code>setValues({ ...values, [e.target.name]: e.target.value })</code>. The spread copies the other fields (state is replaced, never edited in place) and the square brackets use the input\'s name as the key.</p>',
      '<dl><dt><code>values</code></dt><dd><code>{ title: \'\', due: \'\' }</code>: one key per field. Clearing the form is <code>setValues(EMPTY)</code>; a form that creates and edits only changes the initial value.</dd>'
        + '<dt><code>errors</code></dt><dd>The same keys, holding messages: <code>{ title: \'Title is required\' }</code>. Each message renders under its own field.</dd>'
        + '<dt><code>aria-invalid</code>, <code>aria-describedby</code></dt><dd>Connect each field to its message for screen readers (see <a href="#/browser/dom/aria-focus">ARIA attributes and keyboard focus</a>).</dd></dl>',
      '<p>The submit handler reads one object: validate it, set the errors and stop if there are any, otherwise send <code>values</code>. Errors can also come from the server: an API answers <code>400</code> with a list of <code>{ field, message }</code>, which becomes the same object, so both kinds of error display identically (see <a href="#/browser/data-fetching/field-errors">Server validation errors on the right field</a>).</p>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

const EMPTY = { title: '', due: '' };

function validate(v) {
  const errors = {};
  if (!v.title.trim()) errors.title = 'Title is required';
  if (v.due && v.due < '2026-01-01') errors.due = 'Pick a date from 2026';
  return errors;
}

function App() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);
  function handleChange(e) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }
  function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaved(values);
    setValues(EMPTY);
  }
  return (
    <form onSubmit={handleSubmit} noValidate>
      <p><label>Title <input name="title" value={values.title} onChange={handleChange}
        aria-invalid={!!errors.title} aria-describedby="e-title" /></label>
        <small id="e-title"> {errors.title}</small></p>
      <p><label>Due <input type="date" name="due" value={values.due} onChange={handleChange}
        aria-invalid={!!errors.due} aria-describedby="e-due" /></label>
        <small id="e-due"> {errors.due}</small></p>
      <button>Save</button>
      {saved && <p>Saved: {JSON.stringify(saved)}</p>}
    </form>
  );
}` },
    example: 'Press **Save** with an empty form: only the title error appears, under the title. Pick a date in 2025 and save again: now the date error shows as well. Fill both correctly: the object is saved and the form resets in one call. If a server answered `400` with `errors: [{ field: \'title\', message: \'Title already used\' }]`, turning that list into `{ title: \'Title already used\' }` would show the message in the same place.',
    mistake: 'Forgetting the spread: `setValues({ [e.target.name]: e.target.value })` replaces the whole object with one field, so typing in "Due" erases the title (and the title input switches to uncontrolled, with a warning). Always copy the rest: `{ ...values, [name]: value }`.' },
];

DATA.en.COMPONENTS_QUIZ = [
  /* ---- jsx ---- */
  { type: 'mc', topic: 'jsx', q: 'What is a React component?',
    choices: ['An HTML template file processed on the server', 'A JavaScript function, with a capitalised name, that returns a description of UI', 'A CSS class that styles a part of the page', 'An object you create with `new Component()`'],
    answer: 1, why: 'A component is a function: it receives props and returns elements (usually written as JSX). React calls it whenever it needs that part of the UI.' },
  { type: 'mc', topic: 'jsx', q: 'What does `<p className="note">Hi {name}</p>` compile to (classic form)?',
    choices: ["React.createElement('p', { className: 'note' }, 'Hi ', name)", "React.createElement('p', 'note', 'Hi {name}')", "document.createElement('p')", "new Element('p', { class: 'note' })"],
    answer: 0, why: 'Each tag becomes `createElement(type, props, ...children)`. The attributes form the props object, and the text and the `{name}` expression are separate children.' },
  { type: 'tf', topic: 'jsx', q: 'Creating an element with `const el = <Greeting name="Ana" />` immediately calls the `Greeting` function.',
    answer: false, why: 'It only creates a description object `{ type: Greeting, props: { name: \'Ana\' } }`. React calls `Greeting` later, when it renders that element.' },
  { type: 'mc', topic: 'jsx', q: 'Why does `<taskItem />` (lowercase) not render your `taskItem` component?',
    choices: ['Lowercase names are reserved for hooks', 'The compiler treats lowercase tags as HTML elements, so it becomes the string "taskitem"', 'React only loads components whose file name is capitalised', 'It does render, but without props'],
    answer: 1, why: 'A lowercase tag compiles to the string `\'taskItem\'` (an unknown HTML tag); a capitalised one compiles to the variable `TaskItem`, the function.' },
  { type: 'fib', topic: 'jsx', q: 'To return a `<h1>` and a `<p>` side by side without adding a wrapper element to the DOM, wrap them in a ___ (`<>…</>`).',
    accept: ['fragment', 'React.Fragment', 'Fragment'], why: 'A fragment groups children for JSX (one return value) without creating a DOM element.' },
  { type: 'mc', topic: 'jsx', q: 'Which line is valid JSX?',
    choices: ['<label class="x" for="email">Email</label>', '<input type="text">', '<label className="x" htmlFor="email">Email</label>', '<p style="color: red">Hi</p>'],
    answer: 2, why: 'JSX uses JavaScript names (`className`, `htmlFor`), void elements must be closed (`<input />`), and `style` takes an object (`style={{ color: \'red\' }}`).' },
  { type: 'mc', topic: 'jsx', q: 'Which of these can go inside `{ }` in JSX?',
    choices: ['`if (done) { … }`', '`for (const t of tasks) { … }`', '`done ? \'Yes\' : \'No\'`', '`const x = 1`'],
    answer: 2, why: 'Braces take an **expression** (something with a value), because they become a function argument. `if`, `for` and declarations are statements.' },
  { type: 'tf', topic: 'jsx', q: '`{task}`, where `task` is `{ id: 1, title: \'Buy milk\' }`, renders the task as text.',
    answer: false, why: 'Plain objects are not valid children: React throws "Objects are not valid as a React child". Render a field such as `{task.title}`.' },
  { type: 'mc', topic: 'jsx', q: 'In a Vite project, what does `src/main.jsx` do?',
    choices: ['Defines the routes of the app', 'Finds `#root` in index.html and renders `<App />` into it with `createRoot`', 'Starts the development server', 'Holds the global CSS'],
    answer: 1, why: 'index.html loads main.jsx; main.jsx connects React to the `#root` element. Everything else is components imported from there.' },
  { type: 'tf', topic: 'jsx', q: 'In development, seeing every `console.log` in a component printed twice is expected when the app is wrapped in `<StrictMode>`.',
    answer: true, why: 'StrictMode renders components twice in development to expose impure code. It does not happen in the production build.' },

  { type: 'tf', topic: 'jsx', q: 'Computing `const pending = tasks.filter((t) => !t.done).length` in the component body on every render is good practice.',
    answer: true, why: 'It is a derived value: computing it from the data keeps it always correct. Storing it separately would create a second source of truth.' },
  { type: 'mc', topic: 'jsx', q: 'Which line inside a component body breaks the "pure render" rule?',
    choices: ['`const shown = tasks.filter(matches)`', '`tasks.push(newTask)` where `tasks` is a prop', '`const label = done ? \'Done\' : \'To do\'`', '`if (!user) return null;`'],
    answer: 1, why: 'Rendering must not change data outside the component. `push` mutates the parent\'s array every time React renders.' },

  /* ---- props ---- */
  { type: 'mc', topic: 'props', q: 'How does `TaskItem` receive the props in `<TaskItem title="Buy milk" done={false} />`?',
    choices: ['As two parameters: `TaskItem(title, done)`', 'As one object, the first parameter: `{ title: \'Buy milk\', done: false }`', 'Through a global variable `props`', 'Through `this.title` and `this.done`'],
    answer: 1, why: 'All attributes arrive as one object, usually destructured: `function TaskItem({ title, done })`.' },
  { type: 'mc', topic: 'props', q: '`<Counter start="5" />` then `start + 1` inside `Counter` gives…',
    choices: ['6', '"51"', 'NaN', 'An error'],
    answer: 1, why: 'Quoted props are strings: `"5" + 1` is `"51"`. Use `start={5}` to pass a number.' },
  { type: 'tf', topic: 'props', q: 'A child component may change its props (for example `props.task.done = true`) as long as it re-renders afterwards.',
    answer: false, why: 'Props are read-only. The parent owns the data; the child asks for a change by calling a callback prop, and the parent updates its state.' },
  { type: 'fib', topic: 'props', q: 'Content written between `<Card>` and `</Card>` reaches `Card` in the prop called ___.',
    accept: ['children', 'props.children'], why: '`children` holds whatever is nested between the tags; the component decides where to render it with `{children}`.' },
  { type: 'mc', topic: 'props', q: 'A child needs to tell its parent "the user deleted this task". The usual React way is…',
    choices: ['The child edits the parent\'s array directly', 'The parent passes a function prop (`onDelete`) and the child calls it', 'The child dispatches a DOM event and the parent queries the DOM', 'The child returns the id from the component function'],
    answer: 1, why: 'Data flows down as props; requests flow up as callbacks. The parent changes its own state, and React re-renders.' },
  { type: 'mc', topic: 'props', q: 'A file has `export default function TaskItem…`. Which import works?',
    choices: ["import { TaskItem } from './TaskItem.jsx'", "import TaskItem from './TaskItem.jsx'", "import TaskItem from 'TaskItem'", "require TaskItem"],
    answer: 1, why: 'A default export is imported without braces. With braces you would get the named export `TaskItem`, which does not exist (undefined). A path without `./` looks for an npm package.' },
  { type: 'tf', topic: 'props', q: 'Copying a prop into state with `useState(props.title)` keeps it in sync when the parent passes a new title.',
    answer: false, why: 'The initial value is used only on the first render, so the copy goes stale. Read the prop directly instead.' },
  { type: 'mc', topic: 'props', q: 'A blank page in a running Vite app, with "Element type is invalid … got: undefined" in the console, most likely means…',
    choices: ['The server is down', 'A component import does not match its export (or the path is wrong)', 'JSX is not supported by the browser', 'A key is missing in a list'],
    answer: 1, why: 'React received `undefined` as an element type, which almost always comes from importing a default export with braces or the other way round.' },

  /* ---- lists ---- */
  { type: 'mc', topic: 'lists', q: 'Why do lists use `tasks.map(…)` and not `tasks.forEach(…)` inside JSX?',
    choices: ['`map` is faster', '`map` returns a new array of elements that React can render; `forEach` returns `undefined`', '`forEach` is not allowed in components', 'There is no difference'],
    answer: 1, why: 'JSX needs a value. `map` returns the array of elements; `forEach` returns nothing, so nothing renders.' },
  { type: 'mc', topic: 'lists', q: 'What does React use the `key` of a list item for?',
    choices: ['As the element\'s HTML id', 'To match each item with the same item in the previous render, keeping its DOM and state', 'To sort the list', 'As a prop the component can read'],
    answer: 1, why: 'Keys identify items across renders, so React can move, add and remove the right ones. They are not passed as props.' },
  { type: 'mc', topic: 'lists', q: 'Which key is the best choice for tasks loaded from an API?',
    choices: ['`key={index}`', '`key={Math.random()}`', '`key={task.id}`', '`key={task.title}` even if two tasks can share a title'],
    answer: 2, why: 'A stable, unique id from the data. The index changes when the list changes; a random key changes every render; titles can repeat.' },
  { type: 'tf', topic: 'lists', q: 'Using the array index as key is safe for a list where users can insert items at the top.',
    answer: false, why: 'Inserting at the top shifts every index, so React matches items to the wrong previous items (inputs and state end up on the wrong rows).' },
  { type: 'fib', topic: 'lists', q: 'In `tasks.map((t) => <TaskItem ___={t.id} task={t} />)`, the missing prop name is ___.',
    accept: ['key'], why: 'The key goes on the element returned by `map`, here `<TaskItem>`, not inside `TaskItem`.' },
  { type: 'mc', topic: 'lists', q: '`tasks.map((t) => { <li>{t.title}</li> })` renders nothing. Why?',
    choices: ['`li` needs a key to render', 'The arrow function has a block body and no `return`, so every item is `undefined`', '`map` cannot return JSX', 'Curly braces are not allowed in JSX'],
    answer: 1, why: 'With `{ }` the body is a block and must `return`. Use `(t) => <li>…</li>` or `(t) => (…)` for an implicit return.' },
  { type: 'tf', topic: 'lists', q: 'Keys must be unique among siblings in one list, not across the whole app.',
    answer: true, why: 'React compares keys only among the children of the same parent, so two different lists can reuse the same ids.' },
  { type: 'mc', topic: 'lists', q: 'You need to show tasks sorted by title without changing the `tasks` prop. Which is right?',
    choices: ['`tasks.sort(byTitle).map(…)`', '`tasks.toSorted(byTitle).map(…)`', 'Sort the DOM nodes after rendering', '`tasks.reverse().map(…)`'],
    answer: 1, why: '`sort` and `reverse` change the original array (someone else\'s data). `toSorted` (or `[...tasks].sort(…)`) returns a sorted copy.' },

  /* ---- conditions ---- */
  { type: 'mc', topic: 'conditions', q: 'With `count = 0`, what does `<div>{count && <p>{count} new</p>}</div>` show?',
    choices: ['Nothing', 'The text 0', 'The text false', '0 new'],
    answer: 1, why: '`0 && …` evaluates to `0`, and React renders numbers. Use `count > 0 && …` or a ternary.' },
  { type: 'mc', topic: 'conditions', q: 'Which of these renders nothing as a child?',
    choices: ['`0`', '`NaN`', '`false`', '`\'0\'`'],
    answer: 2, why: '`false`, `true`, `null` and `undefined` render nothing. Numbers (including 0 and NaN) and strings render as text.' },
  { type: 'tf', topic: 'conditions', q: 'A component can return `null` to render nothing.',
    answer: true, why: 'Returning `null` is the way for a component to hide itself, for example a badge with nothing to show.' },
  { type: 'mc', topic: 'conditions', q: 'Showing "Loading…", an error, "No tasks yet" or the list depending on the data is clearest with…',
    choices: ['Nested `&&` inside one big JSX block', 'Early returns: `if (loading) return …; if (error) return …; if (tasks.length === 0) return …;` then the list', 'Hiding elements with CSS', 'Four components rendered at once'],
    answer: 1, why: 'Early returns handle each whole alternative first, so the main JSX only deals with the normal case.' },
  { type: 'fib', topic: 'conditions', q: 'Complete the either/or with the conditional (ternary) operator: `{done ___ <s>{title}</s> : title}`.',
    accept: ['?'], why: '`cond ? a : b` is an expression, so it can go inside braces.' },

  /* ---- events ---- */
  { type: 'mc', topic: 'events', q: 'Which button calls `save` only when clicked?',
    choices: ['`<button onClick={save()}>`', '`<button onClick="save()">`', '`<button onClick={save}>`', '`<button onclick={save}>`'],
    answer: 2, why: 'Pass the function itself. `save()` runs during render; a string is HTML habit (and an error in React); event props are camelCase.' },
  { type: 'mc', topic: 'events', q: 'How do you pass a task id to a delete handler on click?',
    choices: ['`onClick={remove(task.id)}`', '`onClick={() => remove(task.id)}`', '`onClick={remove, task.id}`', '`onClick={remove}` with `id={task.id}`'],
    answer: 1, why: 'The arrow creates a function that calls `remove(task.id)` later, when the click happens.' },
  { type: 'fib', topic: 'events', q: 'Inside a submit handler, call `e.___()` first so the browser does not reload the page.',
    accept: ['preventDefault'], why: '`preventDefault` cancels the default submission, which would load a new page and wipe the app\'s state.' },
  { type: 'mc', topic: 'events', q: 'Why put the logic in `onSubmit` on the `<form>` rather than `onClick` on its button?',
    choices: ['`onClick` does not exist on buttons', '`onSubmit` also fires when the user presses Enter in a field', 'It is faster', 'Buttons cannot be inside forms in React'],
    answer: 1, why: 'A form can be submitted by a submit button or by Enter. `onSubmit` handles both.' },
  { type: 'tf', topic: 'events', q: 'Inside a `<form>`, a `<button>` without a `type` attribute submits the form when clicked.',
    answer: true, why: 'The default type is `submit`. Give buttons that should not submit (Cancel, Clear) `type="button"`.' },
  { type: 'mc', topic: 'events', q: 'An input has `value={title}` but no `onChange`. What happens when the user types?',
    choices: ['The text changes and `title` updates', 'Nothing appears to change, and React warns about `value` without `onChange`', 'The page reloads', 'React throws an error and the app crashes'],
    answer: 1, why: 'A controlled input always shows the state. Without `onChange`, the state never changes, so the input is read-only.' },
  { type: 'mc', topic: 'events', q: 'For a controlled checkbox, which pair is right?',
    choices: ['`value={done}` and `e.target.value`', '`checked={done}` and `e.target.checked`', '`selected={done}` and `e.target.selected`', '`defaultChecked={done}` and `e.target.value`'],
    answer: 1, why: 'Checkboxes are controlled with `checked`, and their new state is `e.target.checked` (a boolean).' },
  { type: 'tf', topic: 'events', q: 'Starting a controlled input\'s state as `undefined` and later setting a string makes React warn about switching from uncontrolled to controlled.',
    answer: true, why: '`value={undefined}` means "uncontrolled". Start the state as `\'\'` so the input is controlled from the first render.' },
  { type: 'mc', topic: 'events', q: 'An input is written `<input name="email" defaultValue="ana@example.com" />`. How do you read what the user typed when the form is submitted?',
    choices: ['From a state variable updated on every keystroke', '`new FormData(e.target).get(\'email\')` in the submit handler', '`e.target.value` on the form element', 'You cannot: an uncontrolled input has no value'],
    answer: 1, why: 'An uncontrolled input keeps its value in the DOM. On submit, `FormData` reads every named field of the form; `Object.fromEntries` turns it into an object.' },
  { type: 'tf', topic: 'events', q: 'An unchecked checkbox appears in `Object.fromEntries(new FormData(form))` with the value `false`.',
    answer: false, why: '`FormData` leaves unchecked boxes out entirely. A checked box gives `\'on\'` (or its `value` attribute).' },
  { type: 'mc', topic: 'events', q: 'Which field is a better fit for a controlled input than an uncontrolled one?',
    choices: ['A log-in form read once on submit', 'A task title with a live preview and a character counter', 'A search box submitted with Enter', 'A newsletter email field read on submit'],
    answer: 1, why: 'A live preview and a counter need the value on every keystroke, which a controlled input keeps in state. Forms read once on submit can stay uncontrolled.' },
  { type: 'mc', topic: 'events', q: 'With one state object for a form, which change handler keeps the other fields?',
    choices: ['`setValues({ [e.target.name]: e.target.value })`', '`setValues({ ...values, [e.target.name]: e.target.value })`', '`values[e.target.name] = e.target.value`', '`setValues(e.target.value)`'],
    answer: 1, why: 'The spread copies the existing fields, then the computed key replaces one. Without it, the other fields are lost; editing `values` directly does not re-render.' },
];
