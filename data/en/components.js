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
  /* ---- 1. Components and JSX ------------------------------------------------------ */
  { id: 'what-is-a-component', hub: 'idea', topic: 'jsx',
    title: 'A component: a function from data to UI',
    summary: 'A **component** is a function that receives data and returns a description of a piece of the interface. An app is a tree of components, each responsible for one part of the screen.',
    body: [
      'Think of a component as a recipe card: "given these ingredients (the data), the dish looks like this (the UI)". You never cook the dish yourself by moving pieces of the page around; you hand the recipe to a library, and it produces the page and keeps it matching the recipe. Give the same data, get the same UI: that is what makes components predictable and easy to reuse.',
      'Most front-end frameworks (React, Vue, Svelte, Angular) are built on this idea; the syntax changes, the idea does not. In React, a component is a plain JavaScript function whose name starts with a **capital letter** and which returns **JSX**, an HTML-like syntax described in the next cards. You do not call it yourself: you use it like a tag, `<TaskList />`, and React calls the function when it needs that part of the page.',
      'Splitting a screen into components is the first design decision of any front end. A task page might be `App` → `Header`, `TaskList` → many `TaskItem`, and `NewTaskForm`. Each piece is small enough to read in one go, can be reused (the same `TaskItem` for every task) and can be changed without touching the others.',
    ],
    points: [
      'A component is a **function**: data in, UI description out.',
      'React components start with a **capital letter** and are used as tags: `<TaskItem />`.',
      'The app is a **tree**: one root component (usually `App`) that renders the others.',
    ],
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
    mistake: 'Calling a component as a function, `{TaskItem()}`, instead of rendering it as `<TaskItem />`. It may seem to work, but React no longer sees a separate component: its state and effects get attached to the parent, and the rules about hooks break in confusing ways. Always render components with the tag syntax and let React call them.' },

  { id: 'declarative-ui', hub: 'idea', topic: 'jsx',
    title: 'Describe the result, not the steps',
    summary: 'With the DOM API you write the **steps** that change the page (create, append, remove). With components you write **what the page should look like** for the current data, and the library works out the steps. This is called **declarative** UI.',
    body: [
      'Imagine giving directions. **Imperative**: "walk 200 m, turn left, take the second right". **Declarative**: "meet me at the station". With the DOM API (see [DOM and events](#/browser/dom)) you give directions: every time a task is added you must remember to create an `<li>`, fill it, append it, update the counter, hide the "no tasks" message. Forget one step and the page lies about the data.',
      'A component gives the destination instead. You write "for this list of tasks, the page shows these `<li>` and this counter". When the data changes, React calls your component again, compares the new description with the previous one and makes only the DOM changes needed. This comparison is often called **reconciliation**; you do not write it, but knowing it exists explains keys, re-renders and why you never touch the DOM directly in a component.',
      'The result: the UI is a function of the data, `UI = f(data)`. There is one place that says what the screen looks like, so it cannot drift from the data. The price is that you must express changes as **data changes** (new state), not as DOM edits; [State and effects](#/browser/state-effects) covers how.',
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
    example: 'Add a task in each version. Imperative: you append an `<li>` **and** remember to update the counter (and the empty message, and the "all done" badge…). Declarative: you add the task to the array; React calls `TaskList` again with the new array, sees one more `<li>` and a new number in the `<p>`, and changes exactly those two things in the DOM.',
    mistake: 'Mixing both styles: calling `document.querySelector(...).textContent = …` inside a React app to "quickly" update something. React does not know about that change; the next time it re-renders the component it puts back what the component describes, and your edit vanishes (or React gets confused about the DOM it manages). Change the data and let the component describe the result.' },

  { id: 'jsx-compiles', hub: 'idea', topic: 'jsx',
    title: 'JSX is JavaScript: what it compiles to',
    summary: '**JSX** is an HTML-like syntax inside JavaScript. A compiler turns every tag into a function call, `React.createElement(type, props, ...children)`, which returns a plain object describing that piece of UI.',
    body: [
      'Browsers do not understand JSX. Before your code runs, a compiler (in a Vite project, the build tool does it as you save) rewrites every tag into a function call. `<h1 className="title">Hello, {name}!</h1>` becomes `React.createElement(\'h1\', { className: \'title\' }, \'Hello, \', name, \'!\')`. Once you see JSX as a function call, its rules stop being arbitrary: attributes are the keys of an object, `{…}` is a function argument, and a component returns one value.',
      'The three arguments are always the same. **type**: a string for an HTML tag (`\'h1\'`) or the component function itself for a component (`TaskItem`, no quotes: this is why components must start with a capital letter, so the compiler knows it is a variable). **props**: an object with the attributes (`null` if there are none). **children**: everything between the opening and closing tag, compiled the same way, so tags nested in tags become calls nested in calls.',
      'Current projects use a newer form of the same idea, the **automatic runtime**: the compiler writes `jsx(\'h1\', { className: \'title\', children: … })` and imports `jsx` for you from `react/jsx-runtime`. That is why modern files do not need `import React from \'react\'`. The idea does not change: a tag is a call that returns an object.',
    ],
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
    summary: 'A **React element** is the plain object a JSX tag produces: `{ type, key, props }`. **Rendering** is React calling your components to get a tree of elements and then making the DOM match that tree.',
    body: [
      'An element is a **description**, like an order slip in a restaurant kitchen: "one `<li>` with the text Buy milk". Creating it is cheap and changes nothing on screen. Elements are immutable: you never edit one, you create a new tree the next time.',
      'Rendering happens in two phases. **Render**: React calls `App()`, gets elements; for each element whose type is a component, it calls that function with the element\'s props, and so on, until only HTML elements remain. **Commit**: React compares this tree with the previous one and applies the differences to the real DOM. Your component only takes part in the first phase, which is why it must be a pure description: given the same props (and state), return the same elements, without changing anything outside.',
      'React renders again when the data a component depends on changes (its state, or the props its parent passes). Each render calls the function from the top: local variables are recalculated, and nothing from the previous call survives unless React keeps it for you (state, covered in [State and effects](#/browser/state-effects)).',
    ],
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
    mistake: 'Expecting a component to run once, like a script at the end of `<body>`. It runs on every render, possibly many times; a `console.log` in it prints again and again (and twice per render in development with `StrictMode`, see [A Vite project](#/browser/components/vite-project)). Code that must run once, or that talks to the outside world (fetching, timers), does not belong in the body of the component.' },

  { id: 'jsx-rules', hub: 'idea', topic: 'jsx',
    title: 'JSX rules: one parent, closed tags, JavaScript names',
    summary: 'JSX must be valid JavaScript: a component returns **one** root (use a fragment `<>…</>` to group), **every tag is closed**, and attributes use JavaScript names (`className`, `htmlFor`, `onClick`, `style={{ … }}`).',
    body: [
      'Every rule follows from "a tag is a function call". **One root**: `return <h1/><p/>` would return two values, which JavaScript cannot do. Wrap them in an element, or in a **fragment** `<>…</>` (`React.Fragment`), which groups children without adding anything to the DOM, useful inside lists, tables and flex containers where an extra `<div>` would break the layout.',
      '**Closed tags**: the compiler needs to know where children end, so void elements are self-closed (`<input />`, `<img />`, `<br />`), and any element may be (`<TaskItem />`). **JavaScript names**: attributes become object keys, so the reserved words `class` and `for` are `className` and `htmlFor`; multi-word attributes and events are camelCase (`tabIndex`, `onClick`, `onChange`); `aria-*` and `data-*` keep their dashes.',
      'Two more differences from HTML. **style** takes an object, not a string: `style={{ color: \'crimson\', marginTop: 8 }}` (the outer braces open JavaScript, the inner ones are the object; numbers get `px`). **Comments** inside JSX are JavaScript comments in braces: `{/* note */}`. In practice styles mostly go in CSS classes; the object form is for values computed at runtime.',
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
    summary: 'Braces open a window to JavaScript inside JSX. They take any **expression** (something that produces a value): variables, calls, `a + b`, ternaries, `map`. Statements such as `if` or `for` cannot go inside.',
    body: [
      'Remember that `{…}` becomes a function argument. Anything you could pass to a function works: `{task.title}`, `{tasks.length * 2}`, `{formatDate(task.due)}`, `{done ? \'✓\' : \'…\'}`. An `if` or a `for` is a **statement**, not a value, so it cannot be an argument; you write it before the `return` (storing the result in a variable) or use the expression forms, the ternary `? :` and `array.map(…)`.',
      'In attributes, quotes mean a fixed string and braces mean a JavaScript value: `title="5"` is the string `"5"`, `count={5}` is the number 5, `done={false}` is the boolean. `className={\'task \' + (done ? \'is-done\' : \'\')}` builds a string; `src={user.avatarUrl}` passes a variable. Never write `"{name}"` with quotes: that is the literal text `{name}`.',
      'What renders as children: **strings and numbers** become text (so `0` shows as `0`); **elements** become DOM; **arrays** render each item; `null`, `undefined`, `true` and `false` render **nothing** (this is what makes conditional rendering work). A plain **object** is not renderable: `{task}` throws "Objects are not valid as a React child"; show one of its fields instead.',
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

  /* ---- 2. Props and composition --------------------------------------------------- */
  { id: 'props', hub: 'props', topic: 'props',
    title: 'Props: passing data into a component',
    summary: '**Props** (properties) are the inputs of a component: the attributes you write on its tag arrive as one object, the first parameter of the function. They let one component show different data each time it is used.',
    body: [
      'Props are to a component what arguments are to a function. `<TaskItem title="Buy milk" done={true} />` calls `TaskItem` with `{ title: \'Buy milk\', done: true }`. The usual style **destructures** the object in the parameter, `function TaskItem({ title, done })`, so the inputs are listed at the top like a contract.',
      'Any value can be a prop: strings (in quotes), numbers, booleans, arrays and objects (in braces), even functions (that is how a child tells its parent something happened, see [Events](#/browser/components/events)) and elements. A prop you do not pass is `undefined`; give a **default value** in the destructuring (`{ size = \'medium\' }`) when a sensible one exists. A tag with no value, `<Badge urgent />`, passes `urgent: true`.',
      'Choosing props is designing an interface: pass what the component needs, named from its own point of view. `<TaskItem task={task} />` (one object) and `<TaskItem title={task.title} done={task.done} />` (separate fields) both work; separate fields make the dependencies explicit, one object is shorter when many fields are used. Pick one style per component and keep it.',
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
    summary: 'A component must never change its props. Data flows **one way**: from parent to child through props. When a child needs something to change, it asks the parent by calling a function the parent passed down.',
    body: [
      'Props belong to the parent: they are a snapshot of the parent\'s data at render time. If the child changed `props.task.title`, the parent would not know (React re-renders on new data, not on mutation), and the next render would overwrite the change or, worse, the change would leak into other components that share the same object. React freezes the props object in development so `props.title = …` throws.',
      'This is **one-way data flow**: data travels down the tree as props; requests travel up as **callbacks**. The parent owns the data and passes both the value and a function to change it: `<TaskItem task={task} onToggle={() => toggle(task.id)} />`. The child calls `onToggle()` when clicked; the parent updates its data; React re-renders both with the new value. Following data is then simple: look for who owns it, upwards.',
      'Where should the data live? In the closest component that needs it, or the closest common parent when several do. Moving it up is called **lifting state up**, covered in [Shared state](#/browser/shared-state).',
    ],
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
    mistake: 'Copying a prop into the child\'s own state "so it can be edited": `const [title, setTitle] = useState(props.title)`. The copy is taken once, so when the parent later passes a new title the child keeps showing the old one, and now two components disagree about the data. Read the prop directly, and send changes up with a callback.' },

  { id: 'children', hub: 'props', topic: 'props',
    title: 'children: components that wrap other content',
    summary: 'Whatever you put **between** a component\'s opening and closing tags arrives as a special prop, `children`. It lets you build wrappers (cards, panels, layouts, modals) that do not need to know what they contain.',
    body: [
      'A picture frame does not care which picture goes inside. `<Card title="Today"><p>Buy milk</p></Card>` calls `Card` with `{ title: \'Today\', children: <p>Buy milk</p> }`; the card decides **where** the content goes by writing `{children}` in its JSX. With several things inside, `children` is an array; with none, it is `undefined`, which renders nothing.',
      'This is **composition**: instead of one component with a dozen props for every possible variation (`showFooter`, `footerText`, `icon`…), you build small pieces and nest them. Layouts are the classic case: a `Layout` renders the header, the navigation and the footer, and puts the page in between with `{children}`. Forms, dialogs and list sections follow the same pattern.',
      '`children` can be anything renderable: text, elements, several components. A component can also take other elements through ordinary props when it has more than one "slot": `<Panel title="Tasks" actions={<button>Add</button>}>…</Panel>`.',
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
    summary: 'Build screens by **composing** small components, and give each component (or each small group) its own file, connected with `export` and `import`. A common layout: `pages/` for screens, `components/` for reusable pieces.',
    body: [
      'How to split a screen: draw boxes around the parts of a design and name them. A box that repeats (one per task) is a component; a box with its own job (the form, the filter bar) is a component; a box that is only a few tags in one place can stay inline. Aim for components you can describe in one sentence. When a file becomes hard to scroll through, split it.',
      'Each component lives in a file named after it (`TaskItem.jsx`) and is **exported**; the files that use it **import** it with a relative path. A **default export** (`export default function TaskItem…`) is imported with any name and no braces: `import TaskItem from \'./TaskItem.jsx\'`. A **named export** (`export function TaskItem…`) is imported with braces and the exact name: `import { TaskItem } from \'./TaskItem.jsx\'`. Pick one convention for components and use it everywhere.',
      'Organise folders by role. **pages/** (or **routes/**) holds one component per screen (the task list, the task detail, the login page); **components/** holds reusable pieces used by pages; other folders hold non-UI code, such as an `api/` module for requests or `hooks/` for reusable logic. The exact names matter less than being consistent, so anyone can guess where a file lives.',
    ],
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

  { id: 'vite-project', hub: 'props', topic: 'props',
    title: 'A Vite project: from npm create to the browser',
    summary: '**Vite** is a build tool: `npm create vite@latest` creates a React project, `npm run dev` starts a development server that compiles JSX on the fly and reloads the page on every save, and `npm run build` produces the files to publish.',
    body: [
      'A React app needs a compiler (for JSX), a way to resolve `import`s and a server for development. Vite does all three. The command `npm create vite@latest my-app -- --template react` writes a starter project; `npm install` downloads React and Vite into `node_modules/`; `npm run dev` starts a server, usually at `http://localhost:5173`. Edit a file, save, and the browser updates in place (**hot module replacement**), often without losing what is on screen.',
      'Follow the request. The browser loads **index.html** (at the project root, not in `public/`), which has an empty `<div id="root"></div>` and a `<script type="module" src="/src/main.jsx">`. **main.jsx** is the entry point: it finds `#root` and tells React to render `<App />` inside it with `createRoot(…).render(…)`. From then on React owns everything inside `#root`; the rest of the app is components imported from `App.jsx`.',
      'For publishing, `npm run build` compiles and bundles everything into **dist/** (plain HTML, CSS and JavaScript any static server can host), and `npm run preview` serves that build locally to test it. In development `main.jsx` wraps the app in `<StrictMode>`, which renders every component **twice** to reveal impure code: double `console.log` lines in development are expected and do not happen in the build.',
    ],
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

  /* ---- 3. Lists and conditions ---------------------------------------------------- */
  { id: 'rendering-lists', hub: 'lists', topic: 'lists',
    title: 'Rendering lists with map',
    summary: 'To show a list, turn the array of data into an array of elements with `array.map(item => <Element … />)`. React renders every element of an array, in order.',
    body: [
      'There is no loop tag in JSX, and none is needed: an array of elements is a valid child. `tasks.map((task) => <li key={task.id}>{task.title}</li>)` builds one `<li>` per task, and the list follows the data automatically. `map` is used rather than `forEach` because it **returns** the new array; `forEach` returns `undefined`, which renders nothing.',
      'Prepare the data first, then map: `filter` keeps some items (`tasks.filter((t) => !t.done)`), `toSorted` or a copy plus `sort` orders them (never sort the original array in place: it may be a prop or state, which must not be mutated). Chain them before the `map`, or compute the result in a variable above the `return` so the JSX stays readable.',
      'Each element produced by `map` needs a `key` prop, which tells React which item is which between renders; the next card explains why. Usually the item becomes its own component, `<TaskItem key={task.id} task={task} />`; the key goes on the element in the `map`, not inside `TaskItem`.',
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
    summary: 'A **key** is a string or number, unique among siblings, that identifies an item across renders. React uses it to match each new element with the old one, so it can keep, move, add or remove the right DOM nodes and component state. Use a stable id from the data, not the position.',
    body: [
      'Picture a cloakroom. Coats are matched to people by their **ticket**, not by where they hang: if someone leaves, everyone still gets their own coat. Without tickets, the attendant goes by position, and the person who was third now gets the coat of whoever moved into third place. Keys are the tickets: when the list changes, React matches old and new items by key, and keeps each item\'s DOM and state (a typed note, a focused input, an open menu) with the right item.',
      'A good key is **stable** (the same item has the same key every render), **unique** among its siblings (not globally), and comes from the data: a database id (`task.id`), or another field that cannot repeat. Generate ids when the data is **created** (`crypto.randomUUID()` when a task is added), never during render: `key={Math.random()}` changes every time, so React throws away and recreates every item on each render.',
      'The **index** (`map((t, i) => <li key={i}>…`) is the position, so it changes when items are inserted, removed or reordered: React then matches the wrong items. It is acceptable only for lists that never change order or length. Without any key React falls back to the index and warns in the console: "Each child in a list should have a unique key prop". The key is for React only: it is not passed to the component as a prop.',
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
    summary: 'To show different UI for different data, use plain JavaScript: an **if with an early return** for whole alternatives, a **ternary** `cond ? a : b` for either/or inside JSX, and `cond && a` for "this or nothing", with a real boolean on the left.',
    body: [
      'A component is a function, so the tools are JavaScript\'s. **Early return**: when the whole output changes (nothing to show yet, an error, an empty list), check first and `return` the alternative; the rest of the function then deals only with the normal case. This keeps the main JSX flat and is the clearest way to handle states such as loading, error, empty and success, which every screen that shows data needs (see [Fetching data](#/browser/data-fetching)).',
      'Inside JSX, use expressions. **Ternary**: `{done ? <s>{title}</s> : title}` picks one of two. **&&**: `{isAdmin && <button>Delete</button>}` shows the button or nothing; it works because `false` renders nothing. **null**: returning `null` from a component renders nothing, a component can hide itself.',
      'The `&&` trap: `a && b` returns `a` when `a` is falsy. With `false` that renders nothing, but with the **number 0** React renders the text `0`. `{tasks.length && <TaskList … />}` shows a stray **0** when the list is empty. Put a real boolean on the left (`tasks.length > 0 && …`) or use a ternary. The same applies to an empty string `\'\'` (renders nothing, so it is harmless) and `NaN` (renders "NaN").',
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

  { id: 'pure-render', hub: 'lists', topic: 'conditions',
    title: 'Keep rendering pure: compute, do not change',
    summary: 'A component\'s body should only **compute** its JSX from props (and state): no changing variables outside it, no editing props or arrays in place, no requests or timers. Derived values (counts, filtered lists, labels) are computed on every render.',
    body: [
      'React may call your component at any time and any number of times (twice per render in development with `StrictMode`). If the body changes something outside itself, each call changes it again: a global counter increments twice, `tasks.push(…)` adds the same item twice, `tasks.sort()` reorders the parent\'s array behind its back. A **pure** component is like a maths function: the same input always gives the same output and nothing else happens.',
      'Most values a screen shows are **derived**: the number of pending tasks, the list after a search filter, "3 left" text, whether the Save button is enabled. Compute them in the body from props and state, with non-mutating methods (`filter`, `map`, `toSorted`, spread copies). Do not store them separately: a copy can fall out of sync with its source, a computation cannot.',
      'Things that must happen **because** of a render but are not part of the result (fetching data, starting a timer, writing to `localStorage`) are **effects**, and event-driven changes belong in **event handlers**. Both are covered in [State and effects](#/browser/state-effects).',
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

  /* ---- 4. Events and forms -------------------------------------------------------- */
  { id: 'events', hub: 'events', topic: 'events',
    title: 'Events: pass a function, do not call it',
    summary: 'Event props such as `onClick`, `onChange` and `onSubmit` take a **function** that React calls when the event happens: `onClick={save}` or `onClick={() => remove(task.id)}`. Writing `onClick={save()}` calls it immediately, during render.',
    body: [
      'Think of leaving your phone number versus calling right now. `onClick={save}` hands React the function: "call this when someone clicks". `onClick={save()}` runs `save` **while rendering** and hands React its return value (usually `undefined`), so nothing happens on click, and if `save` changes state the component re-renders, calls `save()` again, and loops ("Too many re-renders").',
      'To pass an argument, wrap the call in an arrow function: `onClick={() => remove(task.id)}` creates a function that, when called later, calls `remove` with the right id. The handler receives an **event object** (React\'s wrapper around the browser event, with the same main fields): `e.target` is the element, `e.target.value` an input\'s text, `e.preventDefault()` cancels the browser\'s default action, `e.stopPropagation()` stops it bubbling (see [DOM and events](#/browser/dom)).',
      'Event props are camelCase (`onClick`, `onMouseEnter`, `onKeyDown`) and go on HTML elements. On your own components, `onSomething` is just a prop name you choose: `<TaskItem onDelete={…} />` does nothing until `TaskItem` passes it to a real element or calls it. Name handlers `handleX` inside a component and props `onX`, as React\'s own docs do.',
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
    summary: 'A **controlled input** shows a value that comes from state (`value={title}`) and reports every keystroke back (`onChange={(e) => setTitle(e.target.value)}`). The state is then the single source of truth: React can read, validate, reset or transform what the user types.',
    body: [
      'A normal input keeps its own text inside the DOM, so your code has to go and read it. A controlled input reverses the roles: the text lives in your component\'s **state** (a value React remembers between renders, introduced in [State and effects](#/browser/state-effects)), the input only displays it, and each keystroke asks to change it. The loop is: user types → `onChange` → `setTitle(newText)` → re-render → the input shows `title`.',
      'Because the state holds the text, everything else is easy: show a live preview, count characters, disable the button while empty (`disabled={title.trim() === \'\'}`), clear the field after saving (`setTitle(\'\')`), force uppercase (`setCode(e.target.value.toUpperCase())`). Checkboxes use `checked` and `e.target.checked` instead of `value`; a `<select>` and a `<textarea>` use `value` like an input.',
      'Two warnings tell you the loop is broken. `value` **without** `onChange`: the input is read-only (every keystroke is undone) and React warns "You provided a `value` prop to a form field without an `onChange` handler". A value that starts as `undefined` and later becomes a string: React warns "A component is changing an uncontrolled input to be controlled"; start the state as `\'\'`, not `undefined`.',
    ],
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
    mistake: 'Writing `value={title}` and reading the text later with `document.getElementById(\'t\').value`, or forgetting `onChange`. In React the state is the truth: if it does not change, the input cannot change. Either control the input fully (`value` + `onChange`) or leave it uncontrolled (`defaultValue`) and read it from the form on submit.' },

  { id: 'form-submit', hub: 'events', topic: 'events',
    title: 'Forms: onSubmit and preventDefault',
    summary: 'Handle a form with `onSubmit` on the `<form>`, not `onClick` on the button, and call `event.preventDefault()` first: by default the browser **submits** the form by loading a new page, which wipes your app\'s state.',
    body: [
      'A `<form>` predates JavaScript apps: when submitted it sends its fields to the address in `action` and **loads the response as a new page** (with no action, the current page reloads, with the fields in the URL). In a component-based app that means losing everything in memory. `e.preventDefault()` cancels that default action, so your handler can deal with the data itself, typically by updating state or sending a request with `fetch`.',
      'Listen on the **form**, with `onSubmit`, not on the button. A form is submitted by clicking a submit button **or** by pressing Enter in a text field; `onSubmit` catches both, `onClick` on the button only the first. Inside a form, `<button>` is a submit button by default; give other buttons `type="button"` so they do not submit (a "Cancel" button that submits is a classic bug).',
      'A typical handler: prevent the default, **validate** (trim the text, return early if it is empty or invalid, and show a message), **use** the data (add it to the list or send it to an API), then **reset** the fields. React 19 also accepts a function as the form\'s `action`; the `onSubmit` pattern shown here works in every version and is the one most code uses.',
    ],
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
    summary: 'For a form with several inputs, keep **one state object** with a field per input and one change handler that uses each input\'s `name`. Keep errors in a second object with the **same keys**, so each message appears next to its field.',
    body: [
      'One `useState` per field works for two inputs and becomes noise at six. A single object `{ title: \'\', due: \'\', priority: \'normal\' }` mirrors the form, and one handler serves every input if each has a `name` matching its key: `setValues({ ...values, [e.target.name]: e.target.value })`. The spread copies the other fields (state is replaced, never edited in place) and the square brackets use the input\'s name as the key.',
      'Errors work the same way: an object whose keys are field names, `{ title: \'Title is required\' }`. Render each message under its own input and connect them for screen readers with `aria-invalid` and `aria-describedby`. The errors can come from your own checks before sending, **and** from the server: an API that validates the body usually answers `400` with a list of `{ field, message }`, which you turn into the same object, so both kinds of error display identically.',
      'The submit handler then reads one object: validate it, set the errors and stop if there are any, otherwise send `values`. Clearing the form is `setValues(EMPTY)`. When the same form creates and edits (empty values for "new", the existing task for "edit"), the initial value is the only difference.',
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
  { type: 'tf', topic: 'conditions', q: 'Computing `const pending = tasks.filter((t) => !t.done).length` in the component body on every render is good practice.',
    answer: true, why: 'It is a derived value: computing it from the data keeps it always correct. Storing it separately would create a second source of truth.' },
  { type: 'mc', topic: 'conditions', q: 'Which line inside a component body breaks the "pure render" rule?',
    choices: ['`const shown = tasks.filter(matches)`', '`tasks.push(newTask)` where `tasks` is a prop', '`const label = done ? \'Done\' : \'To do\'`', '`if (!user) return null;`'],
    answer: 1, why: 'Rendering must not change data outside the component. `push` mutates the parent\'s array every time React renders.' },

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
  { type: 'mc', topic: 'events', q: 'With one state object for a form, which change handler keeps the other fields?',
    choices: ['`setValues({ [e.target.name]: e.target.value })`', '`setValues({ ...values, [e.target.name]: e.target.value })`', '`values[e.target.name] = e.target.value`', '`setValues(e.target.value)`'],
    answer: 1, why: 'The spread copies the existing fields, then the computed key replaces one. Without it, the other fields are lost; editing `values` directly does not re-render.' },
];
