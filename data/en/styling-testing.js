'use strict';
/* Styling and testing: concept cards, rail groups and self-check quiz (React as the worked example). */

DATA.en.STYLING_QUIZ_TOPICS = {
  scoping: 'Scoping styles',
  approaches: 'Approaches, themes and layout',
  basics: 'Tests and tooling',
  queries: 'Finding elements',
  interactions: 'Interactions and async UI',
};

DATA.en.STYLING_GROUPS = [
  { key: 'scoping', label: 'Scoping styles', icon: 'brush' },
  { key: 'approaches', label: 'Approaches, themes and layout', icon: 'levels' },
  { key: 'basics', label: 'Tests and tooling', icon: 'pyramid' },
  { key: 'queries', label: 'Finding elements', icon: 'semantic' },
  { key: 'interactions', label: 'Interactions and async UI', icon: 'component' },
];

DATA.en.STYLING_CONCEPTS = [
  /* ---- 1. Scoping styles ---------------------------------------------------------------- */
  { id: 'global-css-collides', hub: 'scoping', topic: 'scoping',
    title: 'Why global CSS collides in a component app',
    summary: 'In a component app every imported CSS file joins **one global stylesheet**, so a class such as `.title` from one component also styles every other `.title` on the page.',
    html: [
      '<p>Importing <code>./TaskCard.css</code> from <code>TaskCard.jsx</code> only tells the build tool to add the file to the page. Once there, CSS no longer knows which component a rule came from: a selector matches <strong>any</strong> element in the document, and with the same <a href="#/browser/css/specificity">specificity</a> the rule loaded <strong>last</strong> wins (<a href="#/browser/css/cascade">the cascade</a>).</p>',
      '<ul><li><strong>Order follows imports:</strong> which file loads last depends on the import order, so a style can change because someone added an import in a file you never opened. The cause is far from the symptom.</li><li><strong>Generic names collide most:</strong> <code>.button</code>, <code>.card</code>, <code>.active</code>, <code>.error</code>, <code>.title</code>.</li></ul>',
      '<h3>Every approach in this section gives each class a unique name</h3>',
      '<dl><dt><a href="#/browser/styling-testing/css-per-component">BEM</a></dt><dd>A naming convention you keep by hand.</dd><dt><a href="#/browser/styling-testing/css-modules">CSS Modules</a></dt><dd>The build tool renames each class per file.</dd><dt><a href="#/browser/styling-testing/utility-first">Utility classes</a></dt><dd>No component names to invent at all.</dd><dt><a href="#/browser/styling-testing/css-in-js">CSS-in-JS</a></dt><dd>A library generates the names.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Two files, one stylesheet: the later .title rule wins for both cards.',
      desc: 'TaskCard.css sets .title to orange and ProfileCard.css, loaded later, sets .title to blue. Both files end up in one global stylesheet, where the later rule wins, so every .title on the page is blue, in both cards.',
      nodes: [
        { id: 'task', label: '`TaskCard.css`', note: '`.title`: orange' },
        { id: 'profile', label: '`ProfileCard.css`', note: '`.title`: blue, loaded later' },
        { id: 'sheet', label: 'One stylesheet', note: 'the later rule wins', key: true },
        { id: 'titles', label: 'Every `.title`', note: 'blue in both cards' },
      ],
      edges: [['task', 'sheet'], ['profile', 'sheet'], ['sheet', 'titles']],
    },
    live: { kind: 'react', code: `function TaskCard() {
  return (
    <article className="card">
      <h2 className="title">Buy milk</h2>
      <p>Due today</p>
    </article>
  );
}

function ProfileCard() {
  return (
    <article className="card">
      <h2 className="title">Ana Ruiz</h2>
      <p>Admin</p>
    </article>
  );
}

export default function App() {
  return (
    <main>
      <TaskCard />
      <ProfileCard />
    </main>
  );
}`, css: `/* TaskCard.css */
.card { border: 1px solid #ccc; padding: 8px 12px; margin-bottom: 8px; }
.title { color: #b84000; font-size: 1.1rem; }

/* ProfileCard.css (loaded later) */
.title { color: #1a1f6c; text-transform: uppercase; }` },
    example: 'In the Try it box, the author of `TaskCard` wrote an orange title, yet both titles are blue and uppercase. Both `.title` rules score (0, 1, 0), so the one later in the stylesheet wins, and it applies to **every** `.title`, not just the profile card. Delete the second rule: now both titles are orange. Rename the classes to `task-card__title` and `profile-card__title` (in the JSX and the CSS) and each card keeps its own look, whatever the order.',
    mistake: 'Fixing a collision by making the selector heavier: `.task-list .card .title`, or `!important`. It wins today and starts a specificity war tomorrow, when someone needs to override it. A collision is a **naming** problem: fix the name, not the weight.' },

  { id: 'css-per-component', hub: 'scoping', topic: 'scoping',
    title: 'One CSS file per component, and BEM names',
    summary: 'The simplest discipline: each component gets its own CSS file next to it, and every class in it starts with the component\'s name, following a convention such as **BEM**: `.task-card`, `.task-card__title`, `.task-card--done`.',
    html: [
      '<p>A naming convention is a namespace you keep by hand: if every class in <code>TaskCard.css</code> starts with <code>task-card</code>, it cannot collide with <code>profile-card__title</code>. Nothing enforces it; the team agrees on it and code review checks it.</p>',
      '<dl><dt>Block: <code>task-card</code></dt><dd>The standalone component.</dd><dt>Element: <code>task-card__title</code></dt><dd>A part that only makes sense inside the block, joined with two underscores.</dd><dt>Modifier: <code>task-card--done</code></dt><dd>A variant or a state, joined with two hyphens (also <code>task-card__title--large</code>).</dd></dl>',
      '<p>Each selector is one class, so specificity stays (0, 1, 0) almost everywhere and the order of the files stops mattering.</p>',
      '<h3>Where the files go</h3>',
      '<ul><li><strong>Side by side:</strong> <code>TaskCard.jsx</code> and <code>TaskCard.css</code>, the CSS imported once at the top of the component. Deleting the component deletes its styles too.</li><li><strong>One global file:</strong> what is truly global (a reset, <code>box-sizing</code>, the body font, <a href="#/browser/styling-testing/design-tokens">design tokens</a>) goes in <code>index.css</code>, imported once in <code>main.jsx</code>.</li></ul>',
    ],
    code: `src/
  components/
    TaskCard.jsx
    TaskCard.css      /* only .task-card… classes */
    ProfileCard.jsx
    ProfileCard.css   /* only .profile-card… classes */
  index.css           /* reset, fonts, tokens: imported once in main.jsx */`,
    dialect: 'Folder tree',
    live: { kind: 'react', code: `import { useState } from 'react';
import './TaskCard.css';

function TaskCard({ title }) {
  const [done, setDone] = useState(false);
  return (
    <article className={done ? 'task-card task-card--done' : 'task-card'}>
      <h2 className="task-card__title">{title}</h2>
      <button className="task-card__button" onClick={() => setDone(!done)}>
        {done ? 'Undo' : 'Done'}
      </button>
    </article>
  );
}

export default function App() {
  return (
    <>
      <TaskCard title="Buy milk" />
      <TaskCard title="Call Ana" />
    </>
  );
}`, css: `.task-card {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 12px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 6px;
}
.task-card__title { margin: 0; font-size: 1rem; }
.task-card__button { padding: 4px 10px; }
.task-card--done { background: #eef6ee; }
.task-card--done .task-card__title { text-decoration: line-through; color: #555; }` },
    example: 'In the Try it box, press **Done** on the first card. Only that `<article>` gets the modifier class `task-card--done`; the CSS for the modifier strikes through the title inside it. The second card is untouched because the modifier is on its own block. The class names tell you, in the DevTools Elements panel, exactly which component and which part you are looking at.',
    mistake: 'Believing the import scopes the CSS: "these rules are in `TaskCard.css`, so they only affect `TaskCard`". Once loaded, they are global, and they stay on the page even when no `TaskCard` is rendered. A rule like `.task-card h2 { … }` is safe only because of the `task-card` prefix; a bare `h2 { … }` in that file restyles every heading in the app.' },

  { id: 'css-modules', hub: 'scoping', topic: 'scoping',
    title: 'CSS Modules: class names scoped to one file',
    summary: 'A **CSS Module** is a CSS file named `*.module.css`: the build tool renames every class in it to a unique name and hands the component an object that maps your names to the real ones, `styles.title` → `"_title_1hy3p_5"`.',
    html: [
      '<p>CSS Modules are BEM done by the machine. You write short names (<code>.card</code>, <code>.title</code>, <code>.done</code>) and the build tool makes them unique per file, so <code>.title</code> in two modules can never meet. In Vite there is nothing to set up: the <code>.module.css</code> file name is the switch.</p>',
      '<ul><li><strong>Read names from the object:</strong> <code>import styles from \'./TaskCard.module.css\'</code>, then <code>className={styles.title}</code>.</li><li><strong>Several classes</strong> are joined into one string: <code>[styles.card, styles.done].join(\' \')</code> (see <a href="#/browser/styling-testing/conditional-classes">Conditional classes</a>).</li><li><strong>Dashes need brackets,</strong> <code>styles[\'is-done\']</code>, which is why many teams write camelCase in modules: <code>.isDone</code> → <code>styles.isDone</code>.</li></ul>',
      '<h3>What is not renamed, and two extras</h3>',
      '<ul><li><strong>Only classes</strong> (and ids and animation names) are renamed. A tag selector such as <code>h2 { … }</code> in a module is still global, so keep module selectors class-based.</li><li><strong><code>composes: base;</code></strong> inside a rule reuses another class of the same file, or of another one: <code>composes: card from \'./Card.module.css\'</code>.</li><li><strong><code>:global(.dark) .card { … }</code></strong> refers on purpose to a global class, for example a theme class on <code>&lt;html&gt;</code>.</li></ul>',
      '<p>The Try it boxes of this site have no build step, so <code>styles.title</code> is simply <code>"title"</code> and the CSS pane styles it with <code>.title</code>. In a real Vite app the same code produces hashed names and behaves the same way.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One short name in, one unique name out, shared by the CSS and the JSX.',
      desc: 'You write .title in TaskCard.module.css. Vite renames it to a unique name, such as _title_1hy3p_5, in the page\'s stylesheet, and gives the component the same name as styles.title for its className.',
      nodes: [
        { id: 'src', label: '`.title`', note: 'in `TaskCard.module.css`' },
        { id: 'vite', label: 'Vite renames it', key: true },
        { id: 'css', label: '`._title_1hy3p_5`', note: 'the rule in the page' },
        { id: 'jsx', label: '`styles.title`', note: 'the same name, for JSX' },
      ],
      edges: [['src', 'vite'], ['vite', 'css'], ['vite', 'jsx']],
    },
    live: { kind: 'react', code: `import { useState } from 'react';
import styles from './TaskCard.module.css';

function TaskCard({ title }) {
  const [done, setDone] = useState(false);
  const cardClass = done ? [styles.card, styles.done].join(' ') : styles.card;
  return (
    <article className={cardClass}>
      <h2 className={styles.title}>{title}</h2>
      <button className={styles.button} onClick={() => setDone(!done)}>
        {done ? 'Undo' : 'Done'}
      </button>
    </article>
  );
}

export default function App() {
  return (
    <>
      <TaskCard title="Write the report" />
      <TaskCard title="Book the dentist" />
    </>
  );
}`, css: `/* TaskCard.module.css: short names, made unique by the build tool */
.card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 6px; }
.title { margin: 0; font-size: 1rem; color: #1a1f6c; }
.button { padding: 4px 10px; }
.done { background: #eef6ee; }
.done .title { text-decoration: line-through; color: #555; }` },
    example: 'In a Vite app, open the Elements panel after rendering this card: you see `<h2 class="_title_1hy3p_5">`, not `title`. Another component can declare its own `.title` in its own module and both keep their colours, in any import order. In the Try it box, press **Done** and watch the class list of the `<article>` become `card done`.',
    mistake: 'Writing the class as a string after importing the module: `className="title"`. The real class is `_title_1hy3p_5`, so the string matches no rule and the styles silently vanish (no error). Always read the name from the object, `className={styles.title}`. A misspelled property, `styles.titel`, is `undefined`, and fails just as silently.' },

  { id: 'conditional-classes', hub: 'scoping', topic: 'scoping',
    title: 'Conditional classes: the state picks the class',
    summary: 'To change how a component looks when its state changes, compute the `className` from the state; the CSS describes each look and React only switches between them.',
    html: [
      '<p>This is the <a href="#/browser/components/declarative-ui">declarative idea</a> applied to styling: for this data, the element has these classes. The visual rules stay in CSS, where hover, transitions and media queries work; you never set colours one by one from JavaScript.</p>',
      '<table><caption>Three ways to build the class string</caption><thead><tr><th scope="col">Case</th><th scope="col">Code</th></tr></thead><tbody><tr><th scope="row">Two cases</th><td><code>className={done ? \'task done\' : \'task\'}</code></td></tr><tr><th scope="row">Several optional classes</th><td><code>[styles.task, done &amp;&amp; styles.done, urgent &amp;&amp; styles.urgent].filter(Boolean).join(\' \')</code>: <code>filter(Boolean)</code> drops the <code>false</code> entries</td></tr><tr><th scope="row">The <code>clsx</code> package</th><td><code>clsx(styles.task, { [styles.done]: done })</code></td></tr></tbody></table>',
      '<p><strong>When the state has a meaning, use an attribute instead of a class:</strong> <code>disabled</code>, <code>aria-pressed="true"</code>, <code>aria-invalid="true"</code>, <code>aria-current="page"</code>. CSS can select it, a screen reader announces it and a test can check it: one source of truth (see <a href="#/browser/styling-testing/interaction-states">Interaction states</a>).</p>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';
import styles from './Task.module.css';

function Task({ title, urgent }) {
  const [done, setDone] = useState(false);
  const className = [styles.task, done && styles.done, urgent && styles.urgent]
    .filter(Boolean)
    .join(' ');
  return (
    <li className={className}>
      <span>{title}</span>
      <button aria-pressed={done} onClick={() => setDone(!done)}>Done</button>
    </li>
  );
}

export default function App() {
  return (
    <ul className={styles.list}>
      <Task title="Pay the rent" urgent />
      <Task title="Water the plants" />
    </ul>
  );
}`, css: `.list { list-style: none; padding: 0; }
.task { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 6px; border-left: 4px solid #ccc; }
.urgent { border-left-color: #b42318; }
.done { opacity: .6; }
.done span { text-decoration: line-through; }
button[aria-pressed="true"] { background: #1a1f6c; color: #fff; }` },
    example: 'In the Try it box, "Pay the rent" starts with `task urgent` (red border). Press its **Done**: the class list becomes `task done urgent` and the button gets `aria-pressed="true"`, which the CSS uses to fill it in. The same attribute tells a screen-reader user that the button is now pressed.',
    mistake: 'Gluing a condition into a template literal, such as `task ${done && \'done\'}` between backticks. When `done` is false the result is `"task false"` (and `"task undefined"` for a missing prop): a junk class that looks harmless until someone names a class `false`. Use a ternary that returns `\'\'`, or `filter(Boolean)`.' },

  { id: 'inline-styles', hub: 'scoping', topic: 'scoping',
    title: 'Inline styles: style={{ }} for values computed at runtime',
    summary: 'The `style` prop takes a JavaScript object with camelCase properties, `style={{ width: \'40%\' }}`: the right tool for values that come from data, and classes for everything else.',
    html: [
      '<p>An inline style applies to one element and wins the cascade against any class rule. That makes it perfect for a number that changes at runtime and poor as a styling system: no <code>:hover</code>, no <code>:focus-visible</code>, no media query, no <code>::before</code>, no reuse, and JSX full of presentation.</p>',
      '<ul><li><strong>camelCase names:</strong> <code>backgroundColor</code>, <code>marginTop</code> (the <a href="#/browser/components/jsx-rules">JSX rules</a>).</li><li><strong>Values</strong> are strings (<code>\'40%\'</code>, <code>\'#1a1f6c\'</code>) or numbers.</li><li><strong>Numbers get <code>px</code></strong> for length properties (<code>marginTop: 8</code> is 8px), but not for unitless ones (<code>lineHeight: 1.5</code>, <code>opacity: 0.5</code>, <code>zIndex: 2</code>).</li></ul>',
      '<h3>The best of both: a custom property</h3>',
      '<p>Pass the runtime value as a CSS custom property and keep the rule in CSS: <code>style={{ \'--progress\': \'40%\' }}</code> on the element, <code>width: var(--progress)</code> in the stylesheet, which keeps its transitions, hover styles and media queries (more in <a href="#/browser/styling-testing/design-tokens">Design tokens</a>).</p>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

export default function App() {
  const [done, setDone] = useState(3);
  const total = 8;
  const percent = Math.round((done / total) * 100) + '%';
  return (
    <section>
      <label>
        Tasks done: {done} of {total}{' '}
        <input type="range" min="0" max={total} value={done}
          onChange={(e) => setDone(Number(e.target.value))} />
      </label>
      <p>1. Inline width:</p>
      <div className="track">
        <div className="fill" style={{ width: percent }} />
      </div>
      <p>2. A custom property, the rule stays in CSS:</p>
      <div className="track meter" style={{ '--progress': percent }} />
    </section>
  );
}`, css: `.track { height: 14px; background: #eee; border-radius: 7px; overflow: hidden; }
.fill { height: 100%; background: #1a1f6c; }
.meter::after {
  content: ''; display: block; height: 100%;
  width: var(--progress); background: #067b86;
  transition: width .3s;
}
.meter:hover::after { background: #b84000; }` },
    example: 'Move the slider. Both bars follow the data, but only the second one animates (the `transition` is in CSS) and changes colour on hover (`:hover` cannot be written inline). The component passes **one number**; the look stays in the stylesheet.',
    mistake: 'Writing the style as an HTML string: `style="width: 40%"`. React throws "The `style` prop expects a mapping from style properties to values, not a string". The prop is an object: `style={{ width: \'40%\' }}`, with the outer braces opening JavaScript and the inner ones creating the object.' },

  /* ---- 2. Approaches, themes and layout ------------------------------------------------------ */
  { id: 'utility-first', hub: 'approaches', topic: 'approaches',
    title: 'Utility-first CSS: Tailwind',
    summary: 'In **utility-first** CSS you combine many tiny classes, each setting one property, directly in the markup (`className="flex items-center gap-2 p-4"`); **Tailwind CSS** is the best-known framework of this kind.',
    html: [
      '<p>Instead of naming things ("is this a <code>task-card__header</code> or a <code>task-card__top</code>?") you describe how they look with a fixed vocabulary taken from a design scale. A utility is an ordinary class, <code>.p-4 { padding: 1rem }</code>; Tailwind\'s build step scans your files and generates <strong>only</strong> the classes you use, so the CSS stays small.</p>',
      '<ul><li><strong>The spacing scale:</strong> one step is 0.25rem, so <code>p-4</code> is 1rem of padding and <code>gap-2</code> is 0.5rem.</li><li><strong>Variants</strong> are prefixes that apply a class under a condition: <code>hover:bg-blue-700</code>, <code>focus-visible:outline-2</code>, <code>disabled:opacity-50</code>, <code>dark:bg-slate-900</code>.</li><li><strong>Breakpoints</strong> are mobile-first prefixes: <code>md:grid-cols-2</code> applies from the <code>md</code> width (48rem) upwards, like a <code>min-width</code> media query.</li></ul>',
      '<dl><dt>Pros</dt><dd>No names to invent, no collisions, no dead CSS left behind, one spacing and colour scale, and the styles are visible where you read the markup.</dd><dt>Cons</dt><dd>Long class strings, a vocabulary to learn, and every visual change is a markup change. Repetition is solved with components, not new CSS: if twelve buttons share twelve classes, write one <code>&lt;Button&gt;</code>.</dd></dl>',
      '<h3>Set-up (Tailwind v4 with Vite)</h3>',
      '<ol><li><code>npm install tailwindcss @tailwindcss/vite</code></li><li>Add <code>tailwindcss()</code> to the <code>plugins</code> of <code>vite.config.js</code>.</li><li>Put <code>@import "tailwindcss";</code> in your main CSS file.</li></ol>',
      '<p>The Try it boxes cannot run Tailwind; the one on this card writes a few utilities by hand, to show that they are plain CSS.</p>',
    ],
    table: { caption: 'Common Tailwind utilities and the CSS they stand for', head: ['Class', 'CSS'], rows: [
      ['`flex` · `grid` · `hidden`', '`display: flex` · `display: grid` · `display: none`'],
      ['`items-center` · `justify-between`', '`align-items: center` · `justify-content: space-between`'],
      ['`gap-2` · `p-4` · `px-3 py-1` · `mt-2`', '`gap: .5rem` · `padding: 1rem` · padding left/right .75rem, top/bottom .25rem · `margin-top: .5rem`'],
      ['`text-sm` · `font-bold` · `text-white`', '`font-size: .875rem` · `font-weight: 700` · `color: white`'],
      ['`bg-blue-600` · `rounded-lg` · `shadow`', 'a blue background from the palette · `border-radius: .5rem` · a box shadow'],
      ['`w-full` · `max-w-md`', '`width: 100%` · `max-width: 28rem`'],
      ['`hover:…` · `focus-visible:…` · `md:…` · `dark:…`', 'the class applies on hover · on keyboard focus · from 48rem wide · in dark mode'],
    ] },
    code: `// With Tailwind installed: no CSS file for this component
function TaskCard({ title, done, onToggle }) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border p-4">
      <h2 className={done ? 'text-gray-500 line-through' : 'font-bold'}>{title}</h2>
      <button
        onClick={onToggle}
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 focus-visible:outline-2"
      >
        {done ? 'Undo' : 'Done'}
      </button>
    </article>
  );
}`,
    live: { kind: 'react', code: `// A few utilities written by hand (see the CSS pane): Tailwind generates
// thousands of them, but each one is this simple.
function TaskCard({ title }) {
  return (
    <article className="flex items-center justify-between gap-2 p-4 rounded-lg border">
      <h2 className="text-sm font-bold">{title}</h2>
      <button className="px-3 py-1 rounded bg-blue-600 text-white">Done</button>
    </article>
  );
}

export default function App() {
  return <TaskCard title="Buy milk" />;
}`, css: `.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: .5rem; }
.p-4 { padding: 1rem; }
.px-3 { padding-left: .75rem; padding-right: .75rem; }
.py-1 { padding-top: .25rem; padding-bottom: .25rem; }
.rounded { border-radius: .25rem; }
.rounded-lg { border-radius: .5rem; }
.border { border: 1px solid #ccc; }
.text-sm { font-size: .875rem; }
.font-bold { font-weight: 700; }
.bg-blue-600 { background: #2563eb; }
.text-white { color: #fff; border: 0; }` },
    example: 'In the Try it box, change `p-4` to `p-1` in the JSX: the card shrinks, without touching the CSS. That is the workflow with utilities: you edit the markup, choosing from a scale, and never write a new rule for one component.',
    mistake: 'Building class names at runtime, such as the template literal `bg-${color}-600`. Tailwind finds classes by scanning the **source text** for complete names; `bg-red-600` never appears whole in the file, so it is never generated and the style silently does not exist. Write the full names and pick one: `{ red: \'bg-red-600\', blue: \'bg-blue-600\' }[color]`.' },

  { id: 'css-in-js', hub: 'approaches', topic: 'approaches',
    title: 'CSS-in-JS: styles written in JavaScript',
    summary: '**CSS-in-JS** libraries such as **styled-components** let you write real CSS inside JavaScript and get back a component with those styles attached, under a generated class name.',
    html: [
      '<p>The component and its styles are one object. <code>styled.button</code> followed by CSS between backticks is a <strong>tagged template</strong>: when <code>&lt;Button&gt;</code> renders, the library turns the CSS into a class with a generated name (such as <code>sc-a1b2c3</code>), inserts the rule in a <code>&lt;style&gt;</code> tag and renders <code>&lt;button class="sc-a1b2c3"&gt;</code>. Scoping is automatic, and a style can depend on props.</p>',
      '<h3>The price: work in the browser</h3>',
      '<ul><li><strong>Extra JavaScript</strong> to download.</li><li><strong>Work during rendering:</strong> the library parses CSS, computes class names and inserts rules while the app runs, again whenever a prop changes the CSS.</li><li><strong>Styles wait for the JavaScript:</strong> they cannot arrive before it.</li></ul>',
      '<p>So the React team recommends generating CSS at build time, and styled-components was put in maintenance mode by its maintainers in 2025. You will still meet it in many existing codebases, so learn to read it.</p>',
      '<dl><dt>Runtime CSS-in-JS</dt><dd>styled-components: CSS produced in the browser.</dd><dt>Zero-runtime CSS-in-JS</dt><dd>vanilla-extract, Linaria, Panda CSS: styles written next to the component in JavaScript or TypeScript, extracted as plain CSS files at build time, like CSS Modules.</dd></dl>',
    ],
    code: `import styled from 'styled-components';

// A component with its CSS. $primary is a "transient" prop:
// the $ keeps it from being passed on to the <button> element.
const Button = styled.button\`
  padding: 6px 14px;
  border-radius: 6px;
  border: 2px solid navy;
  background: \${(props) => (props.$primary ? 'navy' : 'white')};
  color: \${(props) => (props.$primary ? 'white' : 'navy')};

  &:hover { opacity: 0.85; }
\`;

export function Actions() {
  return (
    <>
      <Button $primary>Save</Button>
      <Button>Cancel</Button>
    </>
  );
}`,
    example: 'Rendering `Actions` produces two `<button>` elements with two different generated classes (one for each value of `$primary`) and one `<style>` tag the library added to the `<head>`. Nothing in the project is called `.button`, so nothing can collide with it.',
    mistake: 'Defining a styled component **inside** another component\'s body. Every render then creates a new component type, so React throws away the old `<button>` and mounts a new one (it loses focus and any state below it), and the library generates fresh class names each time. Define styled components at the top level of the module, like any component.' },

  { id: 'choosing-approach', hub: 'approaches', topic: 'approaches',
    title: 'Choosing one styling approach',
    summary: 'Every styling approach solves the same problem, scoping: pick **one** per project, add one global file for the reset and the design tokens, and keep inline styles for values computed at runtime.',
    html: [
      '<p>The approaches answer two questions differently: <strong>where does a class name come from</strong> (you, a convention, the build tool, a library) and <strong>when is the CSS produced</strong> (by hand, at build time, at runtime in the browser).</p>',
      '<p>Consistency matters more than the "best" option: with one approach, anyone knows where a style lives and how to change it. A sensible default for a new Vite + React project is CSS Modules (nothing to install, plain CSS) or Tailwind (when the team wants a design scale); neither costs anything at runtime.</p>',
      '<h3>The global layer every project needs</h3>',
      '<ul><li><strong>A reset:</strong> <code>box-sizing: border-box</code>.</li><li><strong>The body font.</strong></li><li><strong>The <a href="#/browser/styling-testing/design-tokens">design tokens</a></strong> as custom properties.</li><li><strong>A visible focus style.</strong></li></ul>',
    ],
    table: { caption: 'Styling approaches compared', head: ['Approach', 'Scoping', 'Dynamic styles', 'Runtime cost', 'Good fit'], rows: [
      ['Plain CSS + BEM', 'by convention (discipline)', 'classes, attributes, custom properties', 'none', 'small apps; teams fluent in CSS'],
      ['CSS Modules', 'automatic, per file', 'the same, plus `composes`', 'none (build time)', 'the smallest step up from plain CSS'],
      ['Utility classes (Tailwind)', 'no names to collide', 'conditional class strings, variants', 'none (build time)', 'teams that want one design scale'],
      ['Runtime CSS-in-JS (styled-components)', 'automatic', 'props inside the CSS', 'yes: work in the browser', 'existing codebases that use it'],
      ['Inline `style={{ }}`', 'one element', 'any value', 'small', 'values that come from data, only'],
    ] },
    example: 'A task manager styled with CSS Modules: `index.css` holds the reset, the tokens (`--color-primary`, `--space`) and the focus ring; every component has its own `X.module.css` using `var(--…)`; the progress bar passes its percentage through `style={{ \'--progress\': … }}`. A newcomer finds any style in at most two places.',
    mistake: 'Mixing approaches: half the components in Tailwind, some in CSS Modules, a few in styled-components, colours repeated as hexes in each. Every change starts with "how is this one styled?", and the same blue drifts into five slightly different blues. If you must migrate, do it component by component, with shared tokens.' },

  { id: 'design-tokens', hub: 'approaches', topic: 'approaches',
    title: 'Design tokens and themes with CSS custom properties',
    summary: 'A **design token** is a named design decision (the primary colour, the spacing step, the corner radius), stored as a CSS **custom property** such as `--color-primary` and read with `var(--color-primary)`.',
    html: [
      '<p>Components refer to names, not values: "use the surface colour", not "#fff". Change a value in one place and every component follows. Custom properties are real CSS properties, <strong>inherited</strong> down the tree and resolved while the page runs, so a theme can redefine them without rebuilding anything (unlike Sass variables, which disappear at build time).</p>',
      '<ul><li><strong>Define them on <code>:root</code></strong> (the <code>&lt;html&gt;</code> element) so everything inherits them; read them with <code>var(--name)</code>, optionally with a fallback: <code>var(--radius, 6px)</code>.</li><li><strong>Set one from React:</strong> <code>style={{ \'--accent\': color }}</code>; the CSS below that element sees the new value.</li></ul>',
      '<h3>Switching themes</h3>',
      '<ul><li><strong>Follow the operating system:</strong> <code>@media (prefers-color-scheme: dark) { :root { … } }</code>.</li><li><strong>Let the user choose:</strong> <code>:root[data-theme="dark"] { … }</code>, set from React with <code>document.documentElement.dataset.theme = theme</code> and remembered with <a href="#/browser/state-effects/use-local-storage">useLocalStorage</a>.</li><li><strong>Form controls too:</strong> add <code>color-scheme: light dark</code> so inputs and scrollbars follow.</li></ul>',
      '<p>Tokens work with every approach: a CSS Module uses <code>var(--color-primary)</code> like any CSS file, and Tailwind v4 defines its theme as custom properties (the <code>@theme</code> block).</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Components use names; a theme only changes the values.',
      desc: 'Three layers. Component rules use var(--color-primary). The dark theme, :root[data-theme="dark"], redefines the same names with new values. Below them, :root holds the default token values.',
      nodes: [
        { id: 'rules', label: 'Component rules', note: '`var(--color-primary)`' },
        { id: 'dark', label: 'Dark theme', note: '`:root[data-theme="dark"]`' },
        { id: 'root', label: 'Token values', note: '`:root { --color-primary: … }`', key: true },
      ],
      edges: [],
    },
    live: { kind: 'react', code: `import { useEffect, useState } from 'react';

function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <button className="button" aria-pressed={theme === 'dark'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Dark theme
    </button>
  );
}

export default function App() {
  return (
    <main className="card">
      <h1 className="card__title">Tasks</h1>
      <p>Every colour and size on this card is a token.</p>
      <ThemeToggle />
    </main>
  );
}`, css: `:root {
  --color-bg: #f0ece8;
  --color-surface: #ffffff;
  --color-text: #1b1b1b;
  --color-primary: #1a1f6c;
  --color-on-primary: #ffffff;
  --radius: 8px;
  --space: 8px;
}
:root[data-theme="dark"] {
  --color-bg: #12142b;
  --color-surface: #1e2142;
  --color-text: #f0ece8;
  --color-primary: #ffb38a;
  --color-on-primary: #12142b;
}
body { background: var(--color-bg); color: var(--color-text); }
.card { background: var(--color-surface); padding: calc(var(--space) * 2); border-radius: var(--radius); }
.card__title { margin-top: 0; color: var(--color-primary); }
.button {
  background: var(--color-primary); color: var(--color-on-primary);
  border: 0; border-radius: var(--radius); padding: var(--space) calc(var(--space) * 2);
}` },
    example: 'In the Try it box, press **Dark theme**. The effect sets `data-theme="dark"` on `<html>`, the second `:root` rule redefines five tokens, and every rule that uses them repaints: no component rule was duplicated. Change `--radius` to `0` in the first block: the card and the button both become square.',
    mistake: 'Writing dark mode as a second copy of every component rule: `.dark .card { background: … }`, `.dark .button { … }`, and so on for each component. The copies drift apart and every new component needs two sets of rules. Redefine the **tokens** once per theme; components keep using `var(--…)`.' },

  { id: 'responsive-component', hub: 'approaches', topic: 'approaches',
    title: 'A responsive component: breakpoints in its own CSS',
    summary: 'A component can carry its own breakpoint: a media query, or a **container query**, in the component\'s CSS changes its layout above a width, mobile-first.',
    html: [
      '<p>Everything from <a href="#/browser/css/media-queries">Media queries and breakpoints</a> still applies; the query now sits next to the component it changes, in its CSS file or module. The base rules describe the narrow layout, a <code>min-width</code> query adds the wider one, and the viewport <code>&lt;meta&gt;</code> tag from <a href="#/browser/css/responsive-foundations">Responsive foundations</a> is already in Vite\'s <code>index.html</code>.</p>',
      '<table><caption>Media query or container query</caption><thead><tr><th scope="col"></th><th scope="col">Media query</th><th scope="col">Container query</th></tr></thead><tbody><tr><th scope="row">Asks about</th><td>The viewport</td><td>The space the component actually gets</td></tr><tr><th scope="row">Set-up</th><td>None</td><td><code>container-type: inline-size</code> on a wrapper</td></tr><tr><th scope="row">Syntax</th><td><code>@media (min-width: 48rem) { … }</code></td><td><code>@container (min-width: 30rem) { … }</code></td></tr><tr><th scope="row">Best for</th><td>The page layout</td><td>Reusable components that may sit in a page or a narrow sidebar</td></tr></tbody></table>',
      '<p>Both work inside a CSS Module. In Tailwind, breakpoints are prefixes (<code>md:grid-cols-2</code>) and container queries are <code>@container</code> plus <code>@md:…</code>. Inline styles can express neither, one more reason to keep layout in CSS.</p>',
    ],
    live: { kind: 'react', code: `const tasks = ['Buy milk', 'Call Ana', 'Write the report', 'Book the dentist'];

function TaskGrid() {
  return (
    <section className="task-grid" aria-label="Tasks">
      <ul className="task-grid__list">
        {tasks.map((t) => <li key={t} className="task-grid__item">{t}</li>)}
      </ul>
    </section>
  );
}

// Drag the bottom-right corner of the dashed box to resize it.
export default function App() {
  return (
    <div className="resizable">
      <TaskGrid />
    </div>
  );
}`, css: `.resizable { resize: horizontal; overflow: auto; max-width: 100%; min-width: 160px; border: 2px dashed #8c8576; padding: 8px; }
.task-grid { container-type: inline-size; }
.task-grid__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; grid-template-columns: 1fr; }
.task-grid__item { padding: 8px; border: 1px solid #ccc; border-radius: 6px; }

@container (min-width: 320px) {
  .task-grid__list { grid-template-columns: repeat(2, 1fr); }
}
@container (min-width: 560px) {
  .task-grid__list { grid-template-columns: repeat(4, 1fr); }
}` },
    example: 'In the Try it box, drag the corner of the dashed box: below 320px the tasks stack in one column, from 320px they form two, from 560px four. The window did not change size, only the container did; a media query could not have reacted to that.',
    mistake: 'Giving a component a fixed width, `.task-grid { width: 800px; }`, and testing only on a laptop. On a 375px phone it overflows and the page scrolls sideways. Let components fill the space they get (`max-width` instead of `width`) and add columns with a breakpoint.' },

  { id: 'interaction-states', hub: 'approaches', topic: 'approaches',
    title: 'Hover, focus and disabled: interaction states',
    summary: 'Every interactive component needs a visible style for each state: hover, keyboard focus, disabled and "selected", the last one best expressed with attributes such as `[aria-pressed="true"]`.',
    html: [
      '<p>A state style is feedback: "you can click this", "you are here", "this is the active one". Keyboard users rely on the focus ring the way mouse users rely on the pointer, so removing it leaves them lost. The selectors are the <a href="#/browser/css/pseudo-classes">pseudo-classes</a> you already know, written in each component\'s CSS.</p>',
      '<dl><dt><code>:hover</code></dt><dd>The pointer is over the element.</dd><dt><code>:focus-visible</code></dt><dd>The browser decides the focus should be shown, typically when it came from the keyboard and not from a click. Give the ring contrast against the background (at least 3:1) and take its colour from a token.</dd><dt><code>:disabled</code></dt><dd>A control that cannot be used: make it look unavailable.</dd><dt>Selected states</dt><dd>Style the attributes the component already sets for accessibility: <code>a[aria-current="page"]</code> for the current link (router libraries set it on the active link), <code>button[aria-pressed="true"]</code> for a toggle, <code>[aria-invalid="true"]</code> for a field with an error.</dd></dl>',
      '<p>One piece of state then drives the look, what a screen reader says and what a test checks.</p>',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

const pages = ['Tasks', 'Calendar', 'Settings'];

export default function App() {
  const [page, setPage] = useState('Tasks');
  return (
    <nav aria-label="Main" className="nav">
      {pages.map((p) => (
        <a key={p} href={'#' + p.toLowerCase()} className="nav__link"
          aria-current={p === page ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setPage(p); }}>
          {p}
        </a>
      ))}
      <button className="nav__button" disabled>Log out</button>
    </nav>
  );
}`, css: `.nav { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.nav__link { padding: 6px 12px; border-radius: 6px; color: #1a1f6c; text-decoration: none; }
.nav__link:hover { background: #e6eef9; }
.nav__link:focus-visible, .nav__button:focus-visible { outline: 3px solid #ff5700; outline-offset: 2px; }
.nav__link[aria-current="page"] { background: #1a1f6c; color: #fff; }
.nav__button { margin-left: auto; padding: 6px 12px; }
.nav__button:disabled { opacity: .5; cursor: not-allowed; }` },
    example: 'In the Try it box, click inside the preview and press Tab: each link shows the orange ring, but clicking with the mouse does not. Choose **Calendar**: React moves `aria-current="page"` to it, the CSS fills it in, and a screen reader announces "current page". The disabled **Log out** is skipped by Tab and looks unavailable.',
    mistake: 'Removing focus rings because they look "ugly": `*:focus { outline: none; }`. Keyboard users can no longer see where they are, which fails accessibility guidelines. Style `:focus-visible` the way you want instead; mouse users will not see it.' },

  /* ---- 3. Tests and tooling ------------------------------------------------------------------- */
  { id: 'why-test', hub: 'basics', topic: 'basics',
    title: 'Why automated tests',
    summary: 'An **automated test** is code that runs your code and checks the result, so everything can be checked again in seconds after every change.',
    html: [
      '<p>A test is a promise about behaviour, written so that a machine can check it again and again. Checking by hand after each change takes minutes, and people skip the screens they did not touch: that is where <strong>regressions</strong> (something that used to work breaks) hide. Tests re-check everything when you save (watch mode) and when anyone pushes (continuous integration).</p>',
      '<dl><dt>Regressions caught at once</dt><dd>While the change is still fresh in your head.</dd><dt>Safe refactoring</dt><dd><strong>Refactoring</strong> changes how code works inside without changing what it does; the tests confirm the outside still behaves.</dd><dt>Documentation</dt><dd>Test names state the intended behaviour: "disables Reset at zero".</dd><dt>Better design</dt><dd>Code that is hard to test is often doing too much.</dd></dl>',
      '<p>Tests cannot prove there are no bugs: they check only what someone thought of. Test the behaviour that matters to users, not every line. The vocabulary (test runner, test, assertion) is the one of <a href="#/http/api-design/automated-tests">Automated API tests</a>; this group applies it to the browser.</p>',
    ],
    code: `// tasks.js
export function remaining(tasks) {
  return tasks.filter((t) => !t.done).length;
}

// tasks.test.js
import { describe, it, expect } from 'vitest';
import { remaining } from './tasks';

describe('remaining', () => {
  it('counts the tasks that are not done', () => {
    const tasks = [{ done: true }, { done: false }, { done: false }];
    expect(remaining(tasks)).toBe(2);
  });

  it('is 0 for an empty list', () => {
    expect(remaining([])).toBe(0);
  });
});`,
    example: 'Weeks later someone "simplifies" `remaining` and gets the filter backwards: `tasks.filter((t) => t.done)`. In watch mode the first test turns red at once, `expected 1 to be 2`, before the change ever reaches a user. Without the test, the counter on the screen would just be wrong until someone noticed.',
    mistake: 'Trusting a test you have never seen fail. A test with no `expect`, or one that checks a value the test itself set, passes whatever the code does. Make each new test fail once on purpose (break the code or the expected value) to prove it checks something; the [test runner](#/browser/styling-testing/practice/component-tests) challenges do this for you with buggy components.' },

  { id: 'testing-pyramid', hub: 'basics', topic: 'basics',
    title: 'The testing pyramid: unit, component, end-to-end',
    summary: 'Tests come in sizes, **unit**, **component** and **end-to-end**, and the pyramid says: many small, fast tests at the bottom, a few broad, slow ones at the top.',
    html: [
      '<p>The trade-off is confidence against cost. A bigger test catches more kinds of problems (wiring between components, the real network, CSS that hides a button) but is slower, fails more often for random reasons (timing, data) and is harder to debug: "the checkout flow failed" says less than "<code>validateTask</code> accepted an empty title".</p>',
      '<ul><li><strong>jsdom:</strong> component tests run in jsdom, a JavaScript implementation of the DOM that runs in Node without a real browser. It is fast and handles elements, events and attributes, but does no layout or real rendering: it cannot tell you a button is off-screen or the wrong colour.</li><li><strong>The trophy:</strong> many front-end teams put most of their effort in component tests, because they resemble real use while staying fast.</li><li><strong>A healthy mix:</strong> unit tests for logic (validation, formatting, reducers), component tests for each important behaviour of a screen, a handful of end-to-end tests for the critical flows (log in, create a task).</li></ul>',
    ],
    table: { caption: 'Three levels of tests for a React app', head: ['Level', 'What it covers', 'Tools', 'Speed', 'When it fails, you learn'], rows: [
      ['Unit', 'one pure function: `validateTask`, `formatDue`, a reducer', 'Vitest', 'milliseconds', 'exactly which function is wrong'],
      ['Component', 'a component and its children in jsdom, user events, a mocked network', 'Vitest + React Testing Library', 'tens of milliseconds', 'which behaviour of which component broke'],
      ['End-to-end', 'the real app in a real browser, with the real API', 'Playwright, Cypress', 'seconds per test', 'that a user flow broke, somewhere'],
    ] },
    example: 'For a task app: a **unit** test checks that `validateTask({ title: \'\' })` returns "Title is required"; a **component** test checks that `TodoForm` shows that message and does not call `onAdd`; an **E2E** test logs in, creates a task, reloads the page and sees the task still in the list.',
    mistake: 'Testing everything end-to-end because "it is closest to reality". The suite takes twenty minutes, fails now and then for timing reasons, and a red result only says "something in this flow broke". People stop running it. Put each check at the lowest level that can catch the bug.' },

  { id: 'vitest-basics', hub: 'basics', topic: 'basics',
    title: 'Vitest: describe, it, expect',
    summary: '**Vitest** is the test runner made for Vite projects: it finds the `*.test.js` and `*.test.jsx` files, runs them and reports each test as passed or failed.',
    html: [
      '<p>Vitest reuses your Vite configuration, so tests compile JSX and resolve imports exactly as the app does. Its API is compatible with <strong>Jest</strong>, the runner many Node projects use. Each test follows <strong>Arrange, Act, Assert</strong>: prepare the data, do the thing, check the result.</p>',
      '<h3>Set it up and run it</h3>',
      '<ol><li>Install it: <code>npm install -D vitest</code>.</li><li>Add <code>"test": "vitest"</code> to the <code>scripts</code> of <code>package.json</code>.</li><li>Run <code>npm test</code> (or <code>npx vitest</code>): <strong>watch mode</strong>, which reruns the affected tests on every save. <code>npx vitest run</code> runs once, as a CI server does.</li></ol>',
      '<p>Component tests need a simulated page and Testing Library on top: see <a href="#/browser/styling-testing/rtl-philosophy">Testing Library</a>.</p>',
      '<dl><dt><code>describe(\'TaskList\', () =&gt; { … })</code></dt><dd>Groups related tests.</dd><dt><code>it(\'shows the empty message\', () =&gt; { … })</code></dt><dd>One test, named as a sentence about behaviour (<code>test</code> is the same).</dd><dt><code>beforeEach(() =&gt; { … })</code></dt><dd>Runs before every test of the group, so each one starts clean.</dd><dt><code>expect(value).matcher(expected)</code></dt><dd>Checks a value; a failure shows the test name, the expected and received values and the line.</dd></dl>',
      '<table><caption>Matchers you will use most</caption><thead><tr><th scope="col">Matcher</th><th scope="col">Passes when</th></tr></thead><tbody><tr><th scope="row"><code>toBe(x)</code></th><td>The same value (<code>Object.is</code>): strings, numbers, booleans</td></tr><tr><th scope="row"><code>toEqual(x)</code></th><td>The same contents: objects and arrays</td></tr><tr><th scope="row"><code>toContain</code>, <code>toHaveLength</code></th><td>An item is in the array or string; it has that length</td></tr><tr><th scope="row"><code>toBeNull</code>, <code>toBeTruthy</code>, <code>toThrow</code></th><td>The value is null; truthy; the function throws</td></tr><tr><th scope="row"><code>.not.…</code></th><td>Negates any matcher</td></tr><tr><th scope="row"><code>toHaveBeenCalledWith(…)</code></th><td>A <strong>mock function</strong> was called with these arguments: <code>vi.fn()</code> creates one, <code>vi.spyOn(object, \'method\')</code> wraps an existing one</td></tr></tbody></table>',
    ],
    code: `import { describe, it, expect, vi } from 'vitest';
import { addTask } from './tasks';

describe('addTask', () => {
  it('returns a new array with the task at the end', () => {
    const before = [{ id: 1, title: 'Buy milk' }];
    const after = addTask(before, { id: 2, title: 'Call Ana' });
    expect(after).toHaveLength(2);
    expect(after[1]).toEqual({ id: 2, title: 'Call Ana' }); // contents
    expect(after).not.toBe(before);                          // a new array
  });

  it('calls the logger once', () => {
    const log = vi.fn();
    addTask([], { id: 1, title: 'x' }, log);
    expect(log).toHaveBeenCalledTimes(1);
  });
});`,
    example: '`npx vitest` prints `✓ src/tasks.test.js (2 tests)`. Change `toEqual` to `toBe` in the first test and it fails with `expected { id: 2, title: \'Call Ana\' } to be { id: 2, title: \'Call Ana\' } // Object.is equality`: the two objects look the same but are **different objects**, so they are not `Object.is`-equal.',
    mistake: 'Forgetting that a test of asynchronous code must wait: `it(\'loads\', () => { loadTasks().then((t) => expect(t).toHaveLength(5)); })`. The test function returns before the promise settles, so it passes even when `loadTasks` is broken. Make the test `async` and `await` the call (or return the promise).' },

  { id: 'dev-tooling', hub: 'basics', topic: 'basics',
    title: 'Tooling cheat-sheet: ESLint, Prettier, React DevTools',
    summary: 'Three tools catch problems before tests do: **ESLint** finds bugs and broken hook rules, **Prettier** formats the code, and **React DevTools** shows the component tree, props and state.',
    html: [
      '<p>Each acts at a different moment. Prettier when you save: formatting stops being a matter of taste. ESLint while you type: red underlines for unused variables, conditional hooks or missing effect dependencies. DevTools while the app runs: why is this prop <code>undefined</code>, why does this component render so often.</p>',
      '<ul><li><strong>ESLint\'s react-hooks rules</strong> ship with Vite\'s React template: <strong>rules-of-hooks</strong> (<a href="#/browser/state-effects/rules-of-hooks">no hooks in conditions or loops</a>) and <strong>exhaustive-deps</strong> (every value an effect uses is in its dependency array, which prevents <a href="#/browser/state-effects/stale-closures">stale closures</a>).</li><li><strong>Testing plugins:</strong> <code>eslint-plugin-testing-library</code> and <code>eslint-plugin-jest-dom</code> flag the patterns of <a href="#/browser/styling-testing/implementation-details">What not to test</a>; the "Advice" panel of the test runner here imitates a few of their rules.</li><li><strong>React DevTools</strong> (a browser extension): the Components tab shows the tree and lets you edit a component\'s props, state and hooks live; "Highlight updates when components render" flashes every re-render; the Profiler records what rendered and for how long.</li><li><strong>The Elements tab</strong> still matters: it shows the real class names (the hashed ones of CSS Modules) and the computed styles.</li></ul>',
    ],
    table: { caption: 'Tooling cheat-sheet', head: ['Tool', 'Catches', 'Run it', 'Tip'], rows: [
      ['ESLint + react-hooks', 'bugs, unused code, broken hook rules, missing effect dependencies', '`npm run lint` (`eslint .`); editor extension', 'fix warnings; do not silence exhaustive-deps'],
      ['Prettier', 'inconsistent formatting', '`npx prettier --write .`; format on save', 'add `eslint-config-prettier` so ESLint does not fight it'],
      ['React DevTools', 'wrong props or state, unexpected re-renders', 'browser extension: Components and Profiler tabs', 'select a component, then edit its state live'],
      ['Elements tab', 'which classes and styles really apply', 'built into the browser (F12)', 'check hashed CSS Module names and the cascade'],
      ['Vitest', 'regressions in behaviour', '`npx vitest` (watch), `npx vitest run` (once)', 'run it in watch mode while you work'],
    ] },
    example: 'ESLint underlines an effect: "React Hook useEffect has a missing dependency: \'taskId\'. Either include it or remove the dependency array." Adding `taskId` to the array fixes a real bug: without it, the effect kept loading the first task after the user opened another one.',
    mistake: 'Silencing a warning instead of understanding it: `// eslint-disable-next-line react-hooks/exhaustive-deps` above the dependency array. The warning disappears, the stale-value bug it was pointing at stays. Fix the effect (move the function inside it, add the dependency, or use an updater function).' },

  /* ---- 4. Finding elements ------------------------------------------------------------------ */
  { id: 'rtl-philosophy', hub: 'queries', topic: 'queries',
    title: 'Testing Library: test what the user sees',
    summary: '**React Testing Library** renders a component into a simulated page and finds things the way a person does, by role, label and text: the more a test resembles real use, the more confidence it gives.',
    html: [
      '<p>Describe the test as someone who can only see the screen, or hear it through a screen reader: "there is a button called Increment; after clicking it, the text says Count: 1". No state variables, no component instances, no class names. A test like that survives any refactor that keeps the screen the same, and fails exactly when a user would notice a difference.</p>',
      '<h3>Setting it up</h3>',
      '<ol><li>Install the tools as development dependencies: <code>npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom</code>. <code>@testing-library/dom</code> is listed because current versions of the React package expect you to install it yourself.</li><li>In <code>vite.config.js</code>, set <code>environment: \'jsdom\'</code> (tests get a <code>document</code>), <code>globals: true</code> (<code>describe</code>, <code>it</code> and <code>expect</code> without imports, and automatic clean-up after each test) and a <code>setupFiles</code> entry.</li><li>In that setup file, load the DOM matchers once: <code>import \'@testing-library/jest-dom/vitest\';</code>.</li></ol>',
      '<pre><code>// vite.config.js\nimport { defineConfig } from \'vite\';\nimport react from \'@vitejs/plugin-react\';\n\nexport default defineConfig({\n  plugins: [react()],\n  test: {\n    environment: \'jsdom\',\n    globals: true,\n    setupFiles: \'./src/setupTests.js\',\n  },\n});\n\n// src/setupTests.js\nimport \'@testing-library/jest-dom/vitest\';</code></pre>',
      '<dl><dt><code>render(&lt;Counter /&gt;)</code></dt><dd>Mounts the component with the real React into <code>document.body</code>, provided by jsdom. After each test it is unmounted, so tests do not leak into each other.</dd><dt><code>screen</code></dt><dd>Holds the queries for the whole page: <code>screen.getByRole(…)</code>.</dd><dt><code>userEvent</code></dt><dd>Performs realistic clicks and typing (see <a href="#/browser/styling-testing/user-events">Simulating the user</a>).</dd><dt>jest-dom matchers</dt><dd>Assertions about the DOM: <code>toBeInTheDocument</code>, <code>toHaveTextContent</code>, <code>toBeDisabled</code>, <code>toHaveValue</code>.</dd></dl>',
      '<p>A side effect: if you cannot find an element by its role or label, a screen-reader user cannot either, so these tests push the markup towards <a href="#/browser/html/semantic-why">semantic HTML</a> and real <code>&lt;label&gt;</code>s. What you cannot do, on purpose, is read a component\'s state or call its functions.</p>',
    ],
    code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter';

test('the count goes up when the user clicks Increment', async () => {
  const user = userEvent.setup();
  render(<Counter />);                                         // Arrange

  await user.click(screen.getByRole('button', { name: 'Increment' })); // Act

  expect(screen.getByText('Count: 1')).toBeInTheDocument();    // Assert
});`,
    example: 'Read the test aloud: "render the counter; click the button named Increment; the text Count: 1 is on the page". It mentions nothing a user could not see. If `Counter` is rewritten with `useReducer`, split into two components and moved to CSS Modules, the test stays green as long as the screen behaves the same.',
    mistake: 'Looking for the state: wanting to check that `count` is 1, or reaching for a library that exposes component internals. State is a means; the behaviour is what the screen shows. Assert on the text, the attributes and the callbacks, and the test keeps working when the state is reorganised.' },

  { id: 'queries', hub: 'queries', topic: 'queries',
    title: 'Finding elements: by role, label and text',
    summary: 'Queries find elements in the rendered page; prefer the ones a person would use, role and name first and test ids last.',
    html: [
      '<p>The <strong>role</strong> says what an element is (button, link, heading, textbox, checkbox, list, alert); every HTML element has an implicit one, listed in the table. The <strong>accessible name</strong> is what a screen reader announces for it: the text of a button, the <code>&lt;label&gt;</code> of an input, its <code>aria-label</code>, the <code>alt</code> of an image.</p>',
      '<ol><li><code>getByRole</code>, with <code>name</code></li><li><code>getByLabelText</code>, for form fields</li><li><code>getByPlaceholderText</code></li><li><code>getByText</code>, for non-interactive text</li><li><code>getByDisplayValue</code></li><li><code>getByAltText</code>, <code>getByTitle</code></li><li><code>getByTestId</code>, only as a last resort</li></ol>',
      '<ul><li><strong>Options:</strong> <code>screen.getByRole(\'button\', { name: \'Add task\' })</code>; the name can be a regular expression, <code>{ name: /add/i }</code>; headings take <code>{ level: 2 }</code>; toggles and checkboxes take <code>{ pressed: true }</code> or <code>{ checked: true }</code>.</li><li><strong>Read the error:</strong> when nothing matches, it lists every role and name on the page, which usually shows the typo or the missing label.</li><li><strong>Text is exact</strong> after trimming: <code>getByText(\'Count: 1\')</code> does not match "Count: 10". Pass <code>{ exact: false }</code> for a case-insensitive substring, or a regular expression.</li><li><strong>Each element\'s own text:</strong> <code>&lt;p&gt;Count: &lt;strong&gt;1&lt;/strong&gt;&lt;/p&gt;</code> is two pieces, so <code>getByText(\'Count: 1\')</code> finds neither.</li><li><strong>Inside one part of the page:</strong> <code>within(element).getByRole(…)</code>.</li></ul>',
    ],
    table: { caption: 'Implicit roles of common elements', head: ['Element', 'Role', 'Accessible name from'], rows: [
      ['`<button>`, `<input type="submit">`', 'button', 'its text, or `value`'],
      ['`<a href>`', 'link', 'its text'],
      ['`<h1>`…`<h6>`', 'heading (`level` 1–6)', 'its text'],
      ['`<input>` (text, email), `<textarea>`', 'textbox', 'its `<label>` (or `aria-label`)'],
      ['`<input type="checkbox">` / `"radio"`', 'checkbox / radio', 'its `<label>`'],
      ['`<select>`', 'combobox', 'its `<label>`'],
      ['`<ul>`, `<ol>` / `<li>`', 'list / listitem', '`aria-label` (optional)'],
      ['`<img alt="…">`', 'img', '`alt`'],
      ['`<nav>`, `<main>`, `<form>`', 'navigation, main, form', '`aria-label` (optional)'],
      ['`role="alert"` / `role="status"`', 'alert / status', 'its text'],
    ] },
    practice: { href: '#/browser/styling-testing/practice/component-tests', label: 'Open the component test runner' },
    example: 'For a task form: `screen.getByLabelText(\'Task title\')` finds the input through its `<label>`; `screen.getByRole(\'button\', { name: \'Add task\' })` finds the submit button; after an empty submit, `screen.getByRole(\'alert\')` finds the error message. None of them depends on a class, an id or the order of the elements.',
    mistake: 'Switching to `getByPlaceholderText` or a test id because `getByRole(\'textbox\', { name: \'Title\' })` fails. The failure is telling you something: the input has only a placeholder and **no label**, so a screen reader announces it as "edit text" with no name. Fix the markup with a `<label htmlFor>`, and the role query passes.' },

  { id: 'get-query-find', hub: 'queries', topic: 'queries',
    title: 'getBy, queryBy, findBy: present, absent, later',
    summary: 'Every query comes in three flavours: `getBy…` returns the element or **throws**, `queryBy…` returns **null** when it is absent, and `findBy…` returns a **promise** that resolves when it appears.',
    html: [
      '<p>The three ask three questions: "is it here?", "is it gone?" and "will it come?". Choosing the right one makes the test say what you mean and the failure useful: a failed <code>getBy</code> prints the whole page, so you see what was there instead. The <code>…AllBy…</code> versions return arrays.</p>',
      '<ul><li><strong><code>findBy…</code> is <code>getBy…</code> retried</strong> every 50 ms for up to 1 s (change it with <code>findByText(\'…\', {}, { timeout: 3000 })</code>). <code>await</code> it in an <code>async</code> test; while it waits, React keeps rendering, so data from a fetch has time to appear.</li><li><strong>Absence:</strong> <code>expect(screen.queryByRole(\'alert\')).not.toBeInTheDocument()</code> (or <code>.toBeNull()</code>).</li><li><strong>Waiting for something to go:</strong> <code>await waitForElementToBeRemoved(() =&gt; screen.queryByText(\'Loading…\'))</code>, or any assertion inside <code>await waitFor(() =&gt; …)</code>.</li></ul>',
    ],
    table: { caption: 'Which query, for which question', head: ['Query', '0 matches', '1 match', 'More than 1', 'Waits?', 'Use it for'], rows: [
      ['`getBy…`', 'throws', 'the element', 'throws', 'no', 'it is there now'],
      ['`queryBy…`', '`null`', 'the element', 'throws', 'no', 'it is **not** there'],
      ['`findBy…`', 'rejects after 1 s', 'the element', 'rejects', 'yes: `await`', 'it will appear'],
      ['`getAllBy…`', 'throws', '`[el]`', '`[el, el…]`', 'no', 'several are there now'],
      ['`queryAllBy…`', '`[]`', '`[el]`', '`[el, el…]`', 'no', 'counting, possibly zero'],
      ['`findAllBy…`', 'rejects after 1 s', '`[el]`', '`[el, el…]`', 'yes: `await`', 'several will appear'],
    ] },
    practice: { href: '#/browser/styling-testing/practice/component-tests', label: 'Practise in the component test runner' },
    example: 'A form with validation: before submitting, `expect(screen.queryByRole(\'alert\')).not.toBeInTheDocument()`; after an empty submit, `expect(screen.getByRole(\'alert\')).toHaveTextContent(\'Title is required\')`. A list that loads: `expect(await screen.findByText(\'Buy milk\')).toBeInTheDocument()`, then `expect(screen.getAllByRole(\'listitem\')).toHaveLength(5)`.',
    mistake: 'Checking absence with `getBy`: `expect(screen.getByText(\'Loading…\')).not.toBeInTheDocument()`. `getBy` throws **before** `expect` runs, so the test fails with "Unable to find an element" precisely when the loading message is correctly gone. Absence needs `queryBy`.' },

  /* ---- 5. Interactions and async UI -------------------------------------------------------- */
  { id: 'user-events', hub: 'interactions', topic: 'interactions',
    title: 'Simulating the user: userEvent and mock callbacks',
    summary: '`@testing-library/user-event` simulates complete interactions (`await user.click(button)`, `await user.type(input, \'Buy milk\')`), and `vi.fn()` checks what a component tells its parent through callback props.',
    html: [
      '<p>A real click is not one event: the browser sends pointer and mouse "down" events, moves the focus, sends the "up" events and finally <code>click</code>. Typing sends <code>keydown</code>, <code>input</code> and <code>keyup</code> for every character. <code>fireEvent.click(button)</code> dispatches only the <code>click</code>; <code>userEvent</code> plays the whole sequence, so it catches what <code>fireEvent</code> misses: a disabled button that should not react, a handler on <code>keydown</code>, focus that moves.</p>',
      '<dl><dt><code>const user = userEvent.setup()</code></dt><dd>At the start of the test. Every action returns a promise: <code>await</code> each one.</dd><dt><code>user.type(el, \'Call Ana{Enter}\')</code></dt><dd>Types, then presses Enter. <code>user.clear(el)</code> empties a field.</dd><dt><code>user.selectOptions(select, \'done\')</code></dt><dd>Picks an option.</dd><dt><code>user.keyboard(\'{Escape}\')</code>, <code>user.tab()</code></dt><dd>Presses keys on the focused element; moves the focus.</dd></dl>',
      '<h3>Checking callbacks with a mock function</h3>',
      '<p>A component often does not decide what happens next: a form calls <code>onAdd(title)</code> and the parent saves the task. Pass a mock, <code>const onAdd = vi.fn()</code>, and assert on its calls: <code>toHaveBeenCalledWith(\'Buy milk\')</code>, <code>toHaveBeenCalledTimes(1)</code>, <code>not.toHaveBeenCalled()</code>. You test the component\'s contract without the parent.</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'One user click is five events; fireEvent sends only the last.',
      desc: 'A real click in the browser, in order: pointerdown, mousedown, focus moves to the element, pointerup and mouseup, and finally click. userEvent plays all five; fireEvent.click dispatches only the click.',
      nodes: [
        { id: 'pd', label: '`pointerdown`' },
        { id: 'md', label: '`mousedown`' },
        { id: 'focus', label: 'Focus moves' },
        { id: 'up', label: '`mouseup`', note: 'and `pointerup`' },
        { id: 'click', label: '`click`', note: 'all `fireEvent` sends', key: true },
      ],
      edges: [['pd', 'md'], ['md', 'focus'], ['focus', 'up'], ['up', 'click']],
    },
    code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TodoForm from './TodoForm';

test('adds a trimmed task and clears the field', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<TodoForm onAdd={onAdd} />);

  const field = screen.getByLabelText('Task title');
  await user.type(field, '  Buy milk ');
  await user.click(screen.getByRole('button', { name: 'Add task' }));

  expect(onAdd).toHaveBeenCalledWith('Buy milk');
  expect(field).toHaveValue('');
});`,
    practice: { href: '#/browser/styling-testing/practice/component-tests', label: 'Write this test in the runner' },
    example: 'The test types into the field found by its label, clicks the button found by its role and name, and checks the two visible effects of a successful submit: the parent received the trimmed title, and the field is empty again. If the form forgot to trim, the failure reads `expected "spy" to be called with arguments: [ \'Buy milk\' ]` and lists the actual call, `[ \'  Buy milk \' ]`.',
    mistake: 'Forgetting `await`: `user.click(button); expect(onAdd).toHaveBeenCalled();`. The click is still in progress when the assertion runs, so the test fails, or worse, passes by luck and fails later on a slower machine. Every `user.…` call returns a promise: `await` it (the ESLint rule `testing-library/await-async-events` reminds you).' },

  { id: 'async-ui', hub: 'interactions', topic: 'interactions',
    title: 'Testing async UI: waiting and mocking fetch',
    summary: 'A component that loads data shows "Loading…" first and the data later, so its tests must **wait** (`await screen.findBy…`) and **control the network** with a mocked `fetch`.',
    html: [
      '<p>In a test there is no server, and you do not want one: a real API makes tests slow, dependent on its data and red whenever it is down. Each test decides what the "server" answers and checks the matching screen, so the four states of <a href="#/browser/data-fetching/request-states">loading, error, empty and success</a> are four tests.</p>',
      '<table><caption>Making fetch answer, one test at a time</caption><thead><tr><th scope="col">The test needs</th><th scope="col">Code</th></tr></thead><tbody><tr><th scope="row">Data</th><td><code>vi.spyOn(globalThis, \'fetch\').mockResolvedValue(Response.json([{ id: 1, title: \'Buy milk\' }]))</code></td></tr><tr><th scope="row">A server error</th><td><code>.mockResolvedValue(new Response(null, { status: 500 }))</code></td></tr><tr><th scope="row">No connection</th><td><code>.mockRejectedValue(new TypeError(\'Failed to fetch\'))</code></td></tr><tr><th scope="row">The request itself</th><td><code>expect(fetch).toHaveBeenCalledTimes(1)</code></td></tr><tr><th scope="row">Clean-up</th><td><code>vi.restoreAllMocks()</code> in <code>afterEach</code> (or <code>restoreMocks: true</code> in the config)</td></tr></tbody></table>',
      '<dl><dt>Mock the API client</dt><dd>If components call one <a href="#/browser/data-fetching/api-client">API client module</a>, mock it with <code>vi.mock(\'./api/client\')</code> and return plain data.</dd><dt>Mock the network: MSW</dt><dd>Mock Service Worker answers requests at the network level, so the component\'s real <code>fetch</code> code, URL and headers included, runs in the test. In the <a href="#/browser/styling-testing/practice/component-tests">test runner</a> here, a small fake API plays that role for <code>/api/tasks</code>.</dd></dl>',
    ],
    diagram: {
      kind: 'flow',
      title: 'The test controls the answer, then waits exactly as long as needed.',
      desc: 'The test mocks fetch with the answer it needs, renders the component, which shows Loading, then waits with findBy, which retries for up to one second, until the data is on screen to assert on.',
      nodes: [
        { id: 'mock', label: 'Mocked `fetch`', note: 'the answer the test needs' },
        { id: 'render', label: '`render()`', note: 'shows "Loading"' },
        { id: 'find', label: '`findBy…` waits', note: 'retries up to 1 s', key: true },
        { id: 'data', label: 'Data on screen', note: 'assert on it' },
      ],
      edges: [['mock', 'render'], ['render', 'find'], ['find', 'data']],
    },
    code: `import { render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import TaskList from './TaskList';

afterEach(() => vi.restoreAllMocks());

test('shows the tasks once they arrive', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json([{ id: 1, title: 'Buy milk', done: false }])
  );
  render(<TaskList />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(await screen.findByText('Buy milk')).toBeInTheDocument();
});

test('tells the user when the server fails', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
  render(<TaskList />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tasks');
});`,
    practice: { href: '#/browser/styling-testing/practice/component-tests', label: 'Wait for a list and mock a failure' },
    example: 'The first test checks both moments: right after `render` the status says "Loading" (a plain `getBy`, it is there now), and `findByText` then waits for the mocked answer to be rendered. Change `findByText` to `getByText` and the test fails, because the promise from `fetch` has not resolved yet when the line runs.',
    mistake: 'Waiting with a fixed sleep: `await new Promise((r) => setTimeout(r, 2000))`. Every test now takes two seconds, and it still fails on a slow machine where the data needs 2.1. `findBy…` and `waitFor` wait **exactly** as long as needed, up to a timeout, and report what was on the page if it never came.' },

  { id: 'implementation-details', hub: 'interactions', topic: 'interactions',
    title: 'What not to test: implementation details',
    summary: 'An **implementation detail** is anything the user cannot see or use (state names, internal functions, class names, the structure of the markup), and tests that check them fail in both directions.',
    html: [
      '<p>Aim for <strong>inputs → outputs</strong>. Inputs: props, user events, network answers. Outputs: what is on the screen (text, roles, <code>disabled</code>, <code>aria-pressed</code>, <code>aria-invalid</code>), the callbacks called, the requests sent. A refactor that keeps the outputs keeps the tests green.</p>',
      '<dl><dt>False alarm</dt><dd>A class moves from <code>.counter__inc</code> to a CSS Module; nothing changed for users, but a test using <code>container.querySelector(\'.counter__inc\')</code> turns red. After a few of these, people stop trusting red tests.</dd><dt>False confidence</dt><dd>A toggle test checks that the class <code>toggle--on</code> is added, but the code forgot <code>aria-pressed</code>: a screen-reader user cannot tell the button is on, and the test is green.</dd></dl>',
      '<h3>Avoid</h3>',
      '<ul><li>Finding elements by class, id or position (<code>container.querySelector</code>, <code>firstChild</code>).</li><li>Asserting on class names or inline styles to mean a state; reading <code>.textContent</code> or <code>.className</code> yourself.</li><li>Test ids when a role or a label exists.</li><li>Snapshots of whole components: huge diffs that get approved without reading.</li><li>Testing React itself ("setState re-renders").</li></ul>',
      '<p>When a style matters to the user (an element is hidden), test the effect with <code>toBeVisible</code> or presence, not the class that causes it.</p>',
    ],
    table: { caption: 'From brittle to robust', head: ['Brittle', 'Robust'], rows: [
      ['`container.querySelector(\'.btn-primary\')`', '`screen.getByRole(\'button\', { name: \'Save\' })`'],
      ['`getByTestId(\'title-input\')`', '`getByLabelText(\'Task title\')`'],
      ['`expect(p.textContent).toBe(\'Count: 1\')`', '`expect(screen.getByText(\'Count: 1\')).toBeInTheDocument()`'],
      ['`expect(button.className).toContain(\'toggle--on\')`', '`expect(button).toHaveAttribute(\'aria-pressed\', \'true\')`'],
      ['`expect(link).toHaveClass(\'active\')`', '`expect(link).toHaveAttribute(\'aria-current\', \'page\')`'],
      ['a snapshot of the whole form', 'two or three assertions about what the test title promises'],
    ] },
    practice: { href: '#/browser/styling-testing/practice/component-tests', label: 'Rewrite three brittle tests' },
    example: 'The toggle story in code: the brittle test `expect(container.firstChild.className).toBe(\'toggle toggle--on\')` breaks when the styles move to a CSS Module (the class becomes `toggle on`) and still passes when `aria-pressed` is stuck at `false`. The robust one, `expect(screen.getByRole(\'button\', { name: \'Mute\', pressed: true })).toBeInTheDocument()`, survives the refactor and catches the bug.',
    mistake: '"More assertions make a better test": checking every class, every attribute and the exact markup of a component. Each one is a reason for the test to fail on a harmless change, and none adds confidence about behaviour. Assert what the test\'s name promises, and stop.' },

  { id: 'first-component-test', hub: 'interactions', topic: 'interactions',
    title: 'A first component test, end to end',
    summary: 'A first component test from start to finish: set the tools up once, write the test next to the component, run it, then make it fail on purpose and read the failure.',
    html: [
      '<ol><li><strong>Set up once:</strong> install Vitest, jsdom and Testing Library, and configure them (see <a href="#/browser/styling-testing/rtl-philosophy">Testing Library</a>).</li><li><strong>Write the test</strong> next to the component: <code>src/components/TodoForm.test.jsx</code>.</li><li><strong>Run</strong> <code>npm test</code> and watch it go green.</li><li><strong>Break it on purpose</strong> (change the expected text) and read the failure: the message, the page Testing Library printed, the line. Reading that output quickly is half of testing.</li><li><strong>Fix it</strong> and keep watch mode running while you work.</li></ol>',
      '<p>The component test runner on this card runs the same kind of test file in your browser against small components, including broken versions of them.</p>',
    ],
    code: `// src/components/TodoForm.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoForm from './TodoForm';

describe('TodoForm', () => {
  it('shows an error for an empty title', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TodoForm onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(onAdd).not.toHaveBeenCalled();
  });
});`,
    widget: 'component-tests',
    example: '`npm test` prints `✓ src/components/TodoForm.test.jsx (1 test)`. Change the label query to `getByLabelText(\'Title\')` in another test and the failure reads "Unable to find a label with the text of: Title", followed by the rendered HTML, where you can see the label actually says "Task title".',
    mistake: 'Forgetting `environment: \'jsdom\'`. Vitest runs tests in plain Node by default, so the first `render` fails with "ReferenceError: document is not defined". And without the setup file, `toBeInTheDocument` fails with "Invalid Chai property": the jest-dom matchers were never loaded.' },

  { id: 'test-wrappers', hub: 'interactions', topic: 'interactions',
    title: 'Components that need a provider or a router: render with a wrapper',
    summary: 'A component that reads a context or uses router hooks only works inside its provider or router, so a test renders it with one: `render(ui, { wrapper })`.',
    html: [
      '<p>In the app, <code>main.jsx</code> puts the providers and the router above everything. A test renders one component <strong>alone</strong>, so a hook that looks upwards finds nothing: <code>useContext</code> returns the context\'s default value, a custom hook such as <code>useAuth()</code> may throw (see <a href="#/browser/shared-state/use-context-hook">A custom hook for the context</a>), and a router hook throws. The <code>wrapper</code> option rebuilds what the app puts above the component.</p>',
      '<dl><dt><code>render(ui, { wrapper: Wrapper })</code></dt><dd><code>Wrapper</code> is a component that receives <code>children</code> and renders the providers around them. <code>rerender</code> keeps the same wrapper.</dd><dt><code>&lt;MemoryRouter initialEntries={[\'/tasks/7\']}&gt;</code></dt><dd>A router that keeps its history in memory instead of the address bar, starting at the URL the test chooses (see <a href="#/browser/routing/router-setup">Setting up a router</a>).</dd><dt>A <code>renderWithProviders</code> helper</dt><dd>One function, in a test-utilities file, that wraps every provider the app uses and accepts overrides per test (another user, another URL).</dd></dl>',
      '<p>Give the context the value each test needs, a logged-in user or none, and test both sides: what a guest sees is behaviour too.</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'The wrapper rebuilds, around one component, what the app puts above it.',
      desc: 'Three layers, outermost first. A MemoryRouter starting at /tasks/7. Inside it, the auth context with a test user. Inside that, TaskPage, the component under test, which can now read the URL and the user.',
      nodes: [
        { id: 'router', label: '`MemoryRouter`', note: 'starts at `/tasks/7`' },
        { id: 'auth', label: 'Auth context', note: 'a test user' },
        { id: 'page', label: '`TaskPage`', note: 'the component under test', key: true },
      ],
      edges: [],
    },
    code: `// src/test/renderWithProviders.jsx
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthContext } from '../auth/AuthContext';

export function renderWithProviders(ui, { user = { name: 'Ana' }, route = '/' } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthContext value={{ user }}>{children}</AuthContext>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

// src/pages/TaskPage.test.jsx
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router';
import { renderWithProviders } from '../test/renderWithProviders';
import TaskPage from './TaskPage';

test('shows the task in the URL to a logged-in user', async () => {
  renderWithProviders(
    <Routes><Route path="/tasks/:id" element={<TaskPage />} /></Routes>,
    { route: '/tasks/7' },
  );
  expect(await screen.findByRole('heading', { name: /task 7/i })).toBeInTheDocument();
});`,
    example: 'A settings page shows "Log in to see your settings" to guests. `renderWithProviders(<Settings />, { user: null })` checks that message; `renderWithProviders(<Settings />)` checks that Ana\'s email is shown. Same component, two contexts, two tests, and neither needs a real log-in.',
    mistake: 'Rendering a page that calls `useNavigate` or `useParams` with a bare `render(<TaskPage />)`. The test fails before any assertion with "`useNavigate() may be used only in the context of a <Router> component`". The component is fine: the test forgot what the app puts above it. Wrap it in a `MemoryRouter`.' },
];

DATA.en.STYLING_QUIZ = [
  /* ---- scoping ---- */
  { type: 'mc', topic: 'scoping', q: 'Two components each import their own CSS file, and both files define `.title` with the same specificity. What happens on the page?',
    choices: ['Each component gets the rule from its own file', 'Every `.title` element uses the rule that loaded last', 'The build fails with a duplicate class error', 'The first rule loaded wins for both'],
    answer: 1, why: 'Imported CSS is global. With equal specificity the later rule wins, and it applies to every element with that class, in both components.' },
  { type: 'tf', topic: 'scoping', q: 'Importing `./TaskCard.css` inside `TaskCard.jsx` limits those rules to elements rendered by `TaskCard`.',
    answer: false, why: 'The import only makes sure the file is loaded. Once on the page, the rules match any element in the document.' },
  { type: 'mc', topic: 'scoping', q: 'In BEM, which class names a **modifier** of the `task-card` block?',
    choices: ['`task-card__done`', '`task-card--done`', '`done-task-card`', '`task-card .done`'],
    answer: 1, why: 'Elements use two underscores (`task-card__title`); modifiers, variants or states, use two hyphens (`task-card--done`).' },
  { type: 'fib', topic: 'scoping', q: 'A CSS Module must have a file name ending in `.___.css` for Vite to scope its classes.',
    accept: ['module'], why: 'The `.module.css` suffix is the switch: Vite then renames each class and gives you an object of names.' },
  { type: 'mc', topic: 'scoping', q: 'After `import styles from \'./Card.module.css\'`, which JSX applies the `.title` class from that file?',
    choices: ['`className="title"`', '`className={styles.title}`', '`className={styles[\'.title\']}`', '`class={styles.title}`'],
    answer: 1, why: 'The real class name is generated (for example `_title_1hy3p_5`); only the `styles` object knows it. A plain string matches nothing.' },
  { type: 'mc', topic: 'scoping', q: 'With `done` equal to `false`, what string does the template literal `task ${done && \'done\'}` produce?',
    choices: ['`"task"`', '`"task "`', '`"task false"`', '`"task done"`'],
    answer: 2, why: '`false && \'done\'` is `false`, and a template literal turns it into the text "false". Use a ternary returning `\'\'` or `filter(Boolean)`.' },
  { type: 'tf', topic: 'scoping', q: 'An inline `style={{ … }}` object can contain a `:hover` rule.',
    answer: false, why: 'Inline styles apply plain property values to one element; pseudo-classes, pseudo-elements and media queries need a stylesheet.' },
  { type: 'mc', topic: 'scoping', q: 'In a React `style` object, what does `marginTop: 8` mean?',
    choices: ['8 pixels', '8 rem', '8%', 'Nothing: numbers are invalid'],
    answer: 0, why: 'React adds `px` to numbers for length properties. Unitless properties such as `lineHeight` or `opacity` keep the bare number.' },
  { type: 'mc', topic: 'scoping', q: 'A progress bar needs a width computed from data, and a hover colour. What keeps both working?',
    choices: ['Put both in the `style` object', 'Set `style={{ \'--progress\': pct }}` and use `width: var(--progress)` in the CSS, with a `:hover` rule there', 'Generate a class name per percentage', 'Use `!important` on the width'],
    answer: 1, why: 'Passing the runtime value as a custom property keeps the rule, its transitions and its `:hover` in the stylesheet.' },

  /* ---- approaches ---- */
  { type: 'mc', topic: 'approaches', q: 'In Tailwind, what does `p-4` stand for?',
    choices: ['`padding: 4px`', '`padding: 1rem`', '`position: 4`', '`padding: 4rem`'],
    answer: 1, why: 'One step of the spacing scale is 0.25rem, so 4 steps are 1rem.' },
  { type: 'mc', topic: 'approaches', q: 'Why does a class name built at runtime, the template literal `bg-${color}-600`, often produce no style with Tailwind?',
    choices: ['Tailwind forbids template literals', 'Tailwind generates only the class names it finds complete in the source files, and this one is assembled at runtime', 'Colours need the `dark:` prefix', 'React strips dynamic class names'],
    answer: 1, why: 'The build scans the text of your files. Write the full names (`bg-red-600`) and choose between them.' },
  { type: 'tf', topic: 'approaches', q: 'In Tailwind, `md:grid-cols-2` applies two columns only on screens **narrower** than the `md` breakpoint.',
    answer: false, why: 'Breakpoint prefixes are mobile-first: the class applies from that width **upwards**, like `@media (min-width: …)`.' },
  { type: 'mc', topic: 'approaches', q: 'What is the main cost of a **runtime** CSS-in-JS library such as styled-components?',
    choices: ['Class names can collide', 'Styles cannot depend on props', 'Extra JavaScript, and CSS generated and inserted in the browser while rendering', 'It needs a separate CSS file per component'],
    answer: 2, why: 'Scoping is automatic and props work, but the work happens at runtime; zero-runtime libraries move it to build time.' },
  { type: 'fib', topic: 'approaches', q: 'A CSS custom property is read with the function `___(--color-primary)`.',
    accept: ['var'], why: '`var(--name)` reads the property, optionally with a fallback: `var(--name, blue)`.' },
  { type: 'mc', topic: 'approaches', q: 'What is the cleanest way to add a dark theme to an app that uses design tokens?',
    choices: ['Copy every component rule under `.dark …`', 'Redefine the token values in `:root[data-theme="dark"]` (and/or a `prefers-color-scheme` media query)', 'Invert the page with a CSS filter', 'Pass a `dark` prop to every component'],
    answer: 1, why: 'Components keep using `var(--…)`; only the values change, in one place.' },
  { type: 'tf', topic: 'approaches', q: 'Custom properties are inherited, so redefining `--color-primary` on one element changes it for that element\'s descendants.',
    answer: true, why: 'They cascade and inherit like other properties, which is what makes per-section overrides and themes possible.' },
  { type: 'mc', topic: 'approaches', q: 'A card component appears both full-width and inside a narrow sidebar on the same wide screen. Which query lets it adapt to the space it gets?',
    choices: ['A media query on `min-width`', 'A container query (`container-type: inline-size` + `@container`)', '`prefers-color-scheme`', 'An inline style'],
    answer: 1, why: 'Media queries ask about the viewport; container queries ask about the component\'s container.' },
  { type: 'mc', topic: 'approaches', q: 'Which selector shows a focus ring for keyboard users without showing it after every mouse click on a button?',
    choices: ['`:focus`', '`:focus-visible`', '`:hover`', '`:active`'],
    answer: 1, why: '`:focus-visible` matches when the browser decides focus should be shown, typically for keyboard navigation.' },
  { type: 'mc', topic: 'approaches', q: 'A team uses Tailwind in some components, CSS Modules in others and styled-components in a few. What is the main problem?',
    choices: ['It cannot compile', 'Nothing: more tools, more flexibility', 'Every change starts by finding out how that component is styled, and shared values drift', 'CSS Modules break Tailwind'],
    answer: 2, why: 'All three solve scoping. Picking one, plus shared tokens, keeps styling predictable.' },

  /* ---- basics ---- */
  { type: 'mc', topic: 'basics', q: 'What is a **regression**?',
    choices: ['A slow test', 'Something that used to work and breaks after a change', 'A test that never fails', 'Moving code to another file'],
    answer: 1, why: 'Automated tests catch regressions when they happen, instead of when a user finds them.' },
  { type: 'tf', topic: 'basics', q: 'A passing test suite proves the code has no bugs.',
    answer: false, why: 'Tests only check what someone thought to check. They reduce risk; they do not prove correctness.' },
  { type: 'mc', topic: 'basics', q: 'Which level of test drives the real app in a real browser against the real API?',
    choices: ['Unit', 'Component', 'End-to-end', 'Snapshot'],
    answer: 2, why: 'End-to-end tests (Playwright, Cypress) give the broadest confidence and are the slowest; keep a few for critical flows.' },
  { type: 'mc', topic: 'basics', q: 'What is jsdom?',
    choices: ['A real browser without a window', 'A JavaScript implementation of the DOM that runs in Node, without layout or real rendering', 'A plugin that renders React on the server', 'A CSS framework'],
    answer: 1, why: 'Component tests run in jsdom: fast, good for elements and events, blind to layout and colours.' },
  { type: 'mc', topic: 'basics', q: '`expect([1, 2]).toBe([1, 2])` fails. Which matcher compares the contents?',
    choices: ['`toBe`', '`toEqual`', '`toContain`', '`toBeTruthy`'],
    answer: 1, why: '`toBe` uses `Object.is`, so two different arrays are never equal; `toEqual` compares contents.' },
  { type: 'fib', topic: 'basics', q: 'The command `npx vitest ___` runs the tests once instead of in watch mode.',
    accept: ['run'], why: '`npx vitest` watches and reruns on save; `npx vitest run` runs once, as a CI server does.' },
  { type: 'tf', topic: 'basics', q: 'An `it` callback that calls a promise-returning function with `.then` but neither returns nor awaits it can pass even if the assertion inside `.then` would fail.',
    answer: true, why: 'The test ends before the promise settles. Make the test `async` and `await` the call.' },
  { type: 'mc', topic: 'basics', q: 'Which ESLint rule warns that an effect uses a value missing from its dependency array?',
    choices: ['`no-unused-vars`', '`react-hooks/rules-of-hooks`', '`react-hooks/exhaustive-deps`', '`prettier/prettier`'],
    answer: 2, why: '`exhaustive-deps` catches missing dependencies, which otherwise cause stale values.' },
  { type: 'mc', topic: 'basics', q: 'Where can you see and edit a component\'s current props and state while the app runs?',
    choices: ['The Network tab', 'The Components tab of React DevTools', 'Prettier', 'The Vitest output'],
    answer: 1, why: 'Select a component in the Components tab to see its props, state and hooks.' },

  /* ---- queries ---- */
  { type: 'mc', topic: 'queries', q: 'Which query does Testing Library recommend first for a button?',
    choices: ['`getByTestId(\'save\')`', '`getByRole(\'button\', { name: \'Save\' })`', '`container.querySelector(\'button\')`', '`getByText(\'Save\')`'],
    answer: 1, why: 'Role and accessible name is how assistive technology finds it, and it checks that the element really is a button.' },
  { type: 'mc', topic: 'queries', q: 'What is the implicit role of `<input type="text">`?',
    choices: ['input', 'textbox', 'text', 'field'],
    answer: 1, why: 'Text-like inputs and `<textarea>` have the role textbox.' },
  { type: 'mc', topic: 'queries', q: 'A test must check that no error message is shown yet. Which line is right?',
    choices: ['`expect(screen.getByRole(\'alert\')).not.toBeInTheDocument()`', '`expect(screen.queryByRole(\'alert\')).not.toBeInTheDocument()`', '`expect(await screen.findByRole(\'alert\')).toBeNull()`', '`expect(screen.getAllByRole(\'alert\')).toHaveLength(0)`'],
    answer: 1, why: '`queryBy` returns null when absent. `getBy` and `getAllBy` throw before `expect` runs; `findBy` rejects.' },
  { type: 'tf', topic: 'queries', q: '`findByText` returns a promise and retries until the element appears or a timeout (1 s by default) passes.',
    answer: true, why: 'It is `getByText` inside `waitFor`; `await` it.' },
  { type: 'mc', topic: 'queries', q: 'What is the accessible name of `<label htmlFor="t">Task title</label><input id="t" placeholder="e.g. Buy milk" />`?',
    choices: ['"e.g. Buy milk"', '"Task title"', '"t"', 'It has none'],
    answer: 1, why: 'The associated `<label>` gives the name; the placeholder is only a fallback when nothing else names the field.' },
  { type: 'mc', topic: 'queries', q: '`<p>Count: <strong>1</strong></p>` is on the page. Why does `getByText(\'Count: 1\')` fail?',
    choices: ['Text queries are case-sensitive', '`getByText` matches each element\'s own text, which is split between the `<p>` and the `<strong>`', '`<strong>` is hidden from queries', 'Numbers are ignored'],
    answer: 1, why: 'Use a different query, or assert on the paragraph with `toHaveTextContent(\'Count: 1\')`.' },
  { type: 'fib', topic: 'queries', q: 'To find a heading of level 2 named "Tasks": `screen.getByRole(\'heading\', { name: \'Tasks\', ___: 2 })`.',
    accept: ['level'], why: 'The `level` option filters headings by `h1`…`h6` (or `aria-level`).' },
  { type: 'mc', topic: 'queries', q: '`getByRole(\'textbox\', { name: \'Title\' })` fails because the input has only a placeholder. What is the best fix?',
    choices: ['Switch to `getByPlaceholderText`', 'Add a `data-testid`', 'Give the input a proper `<label>` in the component', 'Use `container.querySelector(\'input\')`'],
    answer: 2, why: 'The failure exposed an accessibility bug: an unlabelled field. Fixing the markup fixes both.' },

  /* ---- interactions ---- */
  { type: 'mc', topic: 'interactions', q: 'Why does Testing Library recommend `userEvent` over `fireEvent`?',
    choices: ['It is synchronous', 'It plays the full sequence of events a real interaction causes (pointer, focus, keys, input)', 'It skips React', 'It works without rendering'],
    answer: 1, why: '`fireEvent` dispatches a single event; `userEvent` behaves like a person using a browser.' },
  { type: 'tf', topic: 'interactions', q: '`user.click(button)` from `userEvent.setup()` returns a promise and should be awaited.',
    answer: true, why: 'All user-event actions are asynchronous; without `await` the assertions may run before the click finishes.' },
  { type: 'mc', topic: 'interactions', q: 'How do you check that a form called its `onAdd` prop with "Buy milk"?',
    choices: ['Read the form\'s state', 'Pass `const onAdd = vi.fn()` and `expect(onAdd).toHaveBeenCalledWith(\'Buy milk\')`', 'Check the input\'s class', 'Spy on `useState`'],
    answer: 1, why: 'A mock function records its calls, so the test checks the component\'s contract without a real parent.' },
  { type: 'mc', topic: 'interactions', q: 'How can a component test make `fetch` answer with a server error?',
    choices: ['Stop the backend', '`vi.spyOn(globalThis, \'fetch\').mockResolvedValue(new Response(null, { status: 500 }))`', 'Throw inside the component', 'Set `navigator.onLine = false`'],
    answer: 1, why: 'Each test decides what the network answers, then checks the matching state on screen.' },
  { type: 'mc', topic: 'interactions', q: 'A list loads from an API after the first render. Which assertion waits for it correctly?',
    choices: ['`expect(screen.getByText(\'Buy milk\')).toBeInTheDocument()`', '`expect(await screen.findByText(\'Buy milk\')).toBeInTheDocument()`', '`await new Promise((r) => setTimeout(r, 2000))` then `getByText`', '`expect(screen.queryByText(\'Buy milk\')).toBeNull()`'],
    answer: 1, why: '`findBy…` waits exactly as long as needed. A fixed sleep is slow and still flaky.' },
  { type: 'tf', topic: 'interactions', q: 'A test that checks `button.className` contains `toggle--on` is a good way to verify that a toggle is pressed.',
    answer: false, why: 'The class is an implementation detail. Check what users perceive: `aria-pressed="true"`, or `getByRole(\'button\', { pressed: true })`.' },
  { type: 'mc', topic: 'interactions', q: 'A test fails after styles moved to CSS Modules, although the screen looks and behaves the same. What kind of test was it?',
    choices: ['A robust test', 'A brittle test that relied on implementation details (class names)', 'An end-to-end test', 'A unit test'],
    answer: 1, why: 'A test that breaks on a change users cannot notice is a false alarm; query by role, label or text instead.' },
  { type: 'mc', topic: 'interactions', q: 'Vitest fails with "ReferenceError: document is not defined" on the first `render`. What is missing?',
    choices: ['`globals: true`', '`environment: \'jsdom\'` in the test config', 'The React plugin', '`import React`'],
    answer: 1, why: 'By default Vitest runs tests in plain Node; jsdom provides `document` and the rest of the DOM.' },
  { type: 'fib', topic: 'interactions', q: 'jest-dom\'s matchers are loaded once, in a setup file, with `import \'@testing-library/jest-dom/___\';` when using Vitest.',
    accept: ['vitest'], why: 'The `/vitest` entry point registers `toBeInTheDocument` and the other DOM matchers with Vitest\'s `expect`.' },
  { type: 'mc', topic: 'interactions', q: '`render(<TaskPage />)` fails with "useNavigate() may be used only in the context of a <Router> component". What is the fix?',
    choices: ['Mock `useNavigate` to return nothing', 'Render it inside a router: `render(<TaskPage />, { wrapper: MemoryRouter })` or a wrapper that includes one', 'Add `environment: \'jsdom\'`', 'Call `useNavigate` in the test file'],
    answer: 1, why: 'In the app a router sits above the page; a test renders the page alone, so the wrapper has to put the router back. A `MemoryRouter` keeps its history in memory.' },
  { type: 'fib', topic: 'interactions', q: 'Testing Library\'s `render(ui, { ___: Wrapper })` renders `ui` inside the `Wrapper` component, for example to add a context provider.',
    accept: ['wrapper'], why: 'The `wrapper` option takes a component that receives `children` and renders the providers around them; `rerender` keeps it.' },
  { type: 'tf', topic: 'interactions', q: 'A component that calls `useContext` with no provider above it in a test gets the default value passed to `createContext`.',
    answer: true, why: 'The default is used only when there is no provider. Wrap the component with the provider and the value each test needs, or a custom hook that throws will make the missing provider obvious.' },
];
