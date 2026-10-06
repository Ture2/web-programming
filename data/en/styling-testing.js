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
  { key: 'components', label: 'Testing components', icon: 'component' },
];

DATA.en.STYLING_CONCEPTS = [
  /* ---- 1. Scoping styles ---------------------------------------------------------------- */
  { id: 'global-css-collides', hub: 'scoping', topic: 'scoping',
    title: 'Why global CSS collides in a component app',
    summary: 'In a component app every CSS file you import ends up in **one global stylesheet**. A class called `.title` in one component\'s file also styles every other `.title` on the page, and the cascade decides which rule wins.',
    body: [
      'Importing `./TaskCard.css` from `TaskCard.jsx` feels like the styles now belong to the card. They do not: the build tool (Vite) simply adds the file to the page as an ordinary stylesheet. Once on the page, CSS has no idea which component a rule came from, and a selector matches **any** element in the document. Two components written by two people, each with a `.title` class, now share one name, and the page follows [the cascade](#/browser/css/cascade): with the same [specificity](#/browser/css/specificity), the rule loaded **last** wins, for both components.',
      'Which file loads last depends on the order in which components are imported, so a style can change because someone added an import in a file you never opened. That is what makes CSS bugs in large apps feel random: the cause is far away from the symptom. The more components, the more generic names collide: `.button`, `.card`, `.active`, `.error`, `.title`.',
      'Every approach in this section solves the same problem in a different way: give each component\'s classes a **unique name**. By a naming convention ([BEM](#/browser/styling-testing/css-per-component)), by a tool that renames classes ([CSS Modules](#/browser/styling-testing/css-modules)), or by not inventing names at all ([utility classes](#/browser/styling-testing/utility-first), [CSS-in-JS](#/browser/styling-testing/css-in-js)).',
    ],
    points: [
      'Imported CSS is **global**: the import says "load this", not "only for this component".',
      'Same specificity → the **later** rule wins, for every element that matches.',
      'The fix is **unique names**, not heavier selectors.',
    ],
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
    example: 'In the box, the author of `TaskCard` wrote an orange title, yet both titles are blue and uppercase. Both `.title` rules score (0, 1, 0), so the one later in the stylesheet wins, and it applies to **every** `.title`, not just the profile card. Delete the second rule: now both titles are orange. Rename the classes to `task-card__title` and `profile-card__title` (in the JSX and the CSS) and each card keeps its own look, whatever the order.',
    mistake: 'Fixing a collision by making the selector heavier: `.task-list .card .title`, or `!important`. It wins today and starts a specificity war tomorrow, when someone needs to override it. A collision is a **naming** problem: fix the name, not the weight.' },

  { id: 'css-per-component', hub: 'scoping', topic: 'scoping',
    title: 'One CSS file per component, and BEM names',
    summary: 'The simplest discipline: each component gets its own CSS file next to it, and every class in it starts with the component\'s name, following a convention such as **BEM** (Block, Element, Modifier): `.task-card`, `.task-card__title`, `.task-card--done`.',
    body: [
      'A naming convention is a namespace you maintain by hand, like surnames in a school: there may be many students called Ana, but only one Ana Ruiz. If every class in `TaskCard.css` starts with `task-card`, it cannot collide with `profile-card__title`. Nothing enforces it; the team agrees on it, and code review checks it.',
      '**BEM** names three kinds of class. The **block** is the standalone component (`task-card`). An **element** is a part that only makes sense inside the block, joined with two underscores (`task-card__title`, `task-card__button`). A **modifier** is a variant or a state, joined with two hyphens (`task-card--done`, `task-card__title--large`). Each selector is one class, so specificity stays (0, 1, 0) almost everywhere and the order of the files stops mattering.',
      'Keep the files together: `TaskCard.jsx` and `TaskCard.css` side by side, the CSS imported once at the top of the component. Deleting the component then deletes its styles too. What is truly global (a reset, `box-sizing`, the body font, [design tokens](#/browser/styling-testing/design-tokens)) goes in a single `index.css` imported once in `main.jsx`.',
    ],
    code: `src/
  components/
    TaskCard.jsx
    TaskCard.css      /* only .task-card… classes */
    ProfileCard.jsx
    ProfileCard.css   /* only .profile-card… classes */
  index.css           /* reset, fonts, tokens: imported once in main.jsx */`,
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
    example: 'In the box, press **Done** on the first card. Only that `<article>` gets the modifier class `task-card--done`; the CSS for the modifier strikes through the title inside it. The second card is untouched because the modifier is on its own block. The class names tell you, in the DevTools Elements panel, exactly which component and which part you are looking at.',
    mistake: 'Believing the import scopes the CSS: "these rules are in `TaskCard.css`, so they only affect `TaskCard`". Once loaded, they are global, and they stay on the page even when no `TaskCard` is rendered. A rule like `.task-card h2 { … }` is safe only because of the `task-card` prefix; a bare `h2 { … }` in that file restyles every heading in the app.' },

  { id: 'css-modules', hub: 'scoping', topic: 'scoping',
    title: 'CSS Modules: class names scoped to one file',
    summary: 'A **CSS Module** is a CSS file named `*.module.css`. When a component imports it, the build tool renames every class to a unique name and hands you an object that maps your names to the real ones: `styles.title` → `"_title_1hy3p_5"`.',
    body: [
      'Think of CSS Modules as BEM done by the machine. You write short, natural names (`.card`, `.title`, `.done`); the build tool makes them unique per file, so `.title` in `TaskCard.module.css` and `.title` in `ProfileCard.module.css` can never meet. Vite supports it with no set-up: the `.module.css` file name is the switch.',
      'In the component, `import styles from \'./TaskCard.module.css\'` gives you an object, and you use its properties as class names: `className={styles.title}`. Several classes are joined into one string, for example `[styles.card, styles.done].join(\' \')` (see [Conditional classes](#/browser/styling-testing/conditional-classes)). Names with a dash need brackets, `styles[\'is-done\']`, which is why many teams write camelCase in module files (`.isDone` → `styles.isDone`).',
      'Only **classes** (and ids, and animation names) are renamed. A tag selector such as `h2 { … }` in a module is still global, so keep module selectors class-based. Two extras: `composes: base;` inside a rule reuses another class of the same file (or `composes: card from \'./Card.module.css\'` from another file), and `:global(.dark) .card { … }` refers on purpose to a global class, for example a theme class set on `<html>`.',
      'In the "Try it" boxes of this site there is no build step, so `styles.title` is simply `"title"`: the CSS pane can style it with `.title`. In a real Vite app the same code produces hashed names, and the behaviour is otherwise identical.',
    ],
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
    example: 'In a Vite app, open the Elements panel after rendering this card: you see `<h2 class="_title_1hy3p_5">`, not `title`. Another component can declare its own `.title` in its own module and both keep their colours, in any import order. In the box, press **Done** and watch the class list of the `<article>` become `card done`.',
    mistake: 'Writing the class as a string after importing the module: `className="title"`. The real class is `_title_1hy3p_5`, so the string matches no rule and the styles silently vanish (no error). Always read the name from the object, `className={styles.title}`. A misspelled property, `styles.titel`, is `undefined`, and fails just as silently.' },

  { id: 'conditional-classes', hub: 'scoping', topic: 'scoping',
    title: 'Conditional classes: the state picks the class',
    summary: 'To change how a component looks when its state changes, compute the `className` from the state: add a class when a condition is true. The CSS describes each look; React only switches between them.',
    body: [
      'This is the [declarative idea](#/browser/components/declarative-ui) applied to styling: for this data, the element has these classes. The visual rules stay in CSS, where hover, transitions and media queries work; the component only decides **which** rules apply. You never set colours one by one from JavaScript.',
      'Three common ways to build the string. A ternary for two cases: `className={done ? \'task done\' : \'task\'}`. An array for several optional classes: `[styles.task, done && styles.done, urgent && styles.urgent].filter(Boolean).join(\' \')`, where `filter(Boolean)` drops the `false` entries. Or the tiny `clsx` package, which does the same with an object: `clsx(styles.task, { [styles.done]: done })`.',
      'When the state has a meaning, prefer an **attribute** over a class: `disabled`, `aria-pressed="true"`, `aria-invalid="true"`, `aria-current="page"`. CSS can select it (`[aria-invalid="true"] { border-color: … }`), a screen reader announces it, and a test can check it. One source of truth for the look, the accessibility and the tests (see [Interaction states](#/browser/styling-testing/interaction-states)).',
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
    example: 'In the box, "Pay the rent" starts with `task urgent` (red border). Press its **Done**: the class list becomes `task done urgent` and the button gets `aria-pressed="true"`, which the CSS uses to fill it in. The same attribute tells a screen-reader user that the button is now pressed.',
    mistake: 'Gluing a condition into a template literal, such as `task ${done && \'done\'}` between backticks. When `done` is false the result is `"task false"` (and `"task undefined"` for a missing prop): a junk class that looks harmless until someone names a class `false`. Use a ternary that returns `\'\'`, or `filter(Boolean)`.' },

  { id: 'inline-styles', hub: 'scoping', topic: 'scoping',
    title: 'Inline styles: style={{ }} for values computed at runtime',
    summary: 'The `style` prop takes a JavaScript object with camelCase properties, such as `style={{ width: \'40%\' }}`. It is the right tool for values that come from data (a width, a position, a colour the user picked); for everything else, classes are better.',
    body: [
      'An inline style is the most local styling there is: it applies to one element and wins the cascade against any class rule. That makes it perfect for a number that changes at runtime and poor as a styling system: there is no `:hover`, no `:focus-visible`, no media query, no `::before`, no reuse, and the JSX fills up with presentation.',
      'The object follows the [JSX rules](#/browser/components/jsx-rules): camelCase names (`backgroundColor`, `marginTop`), values as strings (`\'40%\'`, `\'#1a1f6c\'`) or numbers, and React adds `px` to numbers for length properties (`marginTop: 8` means `8px`), but not to unitless ones (`lineHeight: 1.5`, `opacity: 0.5`, `zIndex: 2`).',
      'The best of both worlds: pass the runtime value as a **CSS custom property** and keep the rule in CSS. `style={{ \'--progress\': \'40%\' }}` sets a variable on the element; the stylesheet uses `width: var(--progress)` and keeps its transitions, hover styles and media queries. More on custom properties in [Design tokens](#/browser/styling-testing/design-tokens).',
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
    summary: 'In **utility-first** CSS you do not write a class per component. You combine many tiny classes that each set one property, directly in the markup: `className="flex items-center gap-2 p-4 rounded-lg"`. **Tailwind CSS** is the best-known framework of this kind.',
    body: [
      'Instead of naming things ("is this a `task-card__header` or a `task-card__top`?") you describe how they look with a fixed vocabulary taken from a design scale. Utility classes are ordinary CSS classes: `.p-4 { padding: 1rem }`. Tailwind\'s build step scans your source files for class names and generates **only** the ones you use, so the final CSS stays small however big the vocabulary is.',
      'Reading the vocabulary takes a day; the table below covers most of a typical screen. Spacing uses a scale where 1 step is 0.25rem: `p-4` is 1rem of padding, `gap-2` is 0.5rem. **Variants** are prefixes that apply a class under a condition: `hover:bg-blue-700`, `focus-visible:outline-2`, `disabled:opacity-50`, `dark:bg-slate-900`, and breakpoints such as `md:grid-cols-2` ("from the `md` width, 48rem, upwards": mobile-first, like a `min-width` media query).',
      'Pros: no names to invent, no collisions, no dead CSS left behind, a consistent spacing and colour scale, and the styles are visible where you read the markup. Cons: long class strings, a vocabulary to learn, and every visual change is a markup change. Repetition is solved with **components**, not new CSS classes: if twelve buttons share the same twelve classes, write one `<Button>` component.',
      'Set-up (Tailwind v4 with Vite): `npm install tailwindcss @tailwindcss/vite`, add `tailwindcss()` to the `plugins` of `vite.config.js`, and put `@import "tailwindcss";` in your main CSS file. The "Try it" boxes here cannot run Tailwind; the box below writes a few utilities by hand to show that they are plain CSS.',
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
    example: 'In the box, change `p-4` to `p-1` in the JSX: the card shrinks, without touching the CSS. That is the workflow with utilities: you edit the markup, choosing from a scale, and never write a new rule for one component.',
    mistake: 'Building class names at runtime, such as the template literal `bg-${color}-600`. Tailwind finds classes by scanning the **source text** for complete names; `bg-red-600` never appears whole in the file, so it is never generated and the style silently does not exist. Write the full names and pick one: `{ red: \'bg-red-600\', blue: \'bg-blue-600\' }[color]`.' },

  { id: 'css-in-js', hub: 'approaches', topic: 'approaches',
    title: 'CSS-in-JS: styles written in JavaScript',
    summary: '**CSS-in-JS** libraries such as **styled-components** let you write real CSS inside JavaScript and get back a component with those styles attached. The library generates a unique class name and inserts the CSS into the page, usually while the app runs.',
    body: [
      'Here the component and its styles are one object. `styled.button` followed by CSS between backticks is a **tagged template**: when `<Button>` renders, the library turns the CSS text into a class with a generated name (such as `sc-a1b2c3`), inserts the rule into a `<style>` tag in the page, and renders `<button class="sc-a1b2c3">`. Scoping is automatic, and because it is JavaScript, a style can depend on props: `${(p) => (p.$primary ? \'navy\' : \'white\')}`.',
      'The price is **runtime work**. A runtime library is extra JavaScript to download, and it parses CSS, computes class names and inserts rules **in the browser, during rendering**, again whenever a prop changes the CSS. Styles cannot arrive before the JavaScript does. For these reasons the React team recommends generating CSS at build time rather than injecting it at runtime, and styled-components itself was put in maintenance mode by its maintainers in 2025.',
      '**Zero-runtime** CSS-in-JS (vanilla-extract, Linaria, Panda CSS) keeps the idea of writing styles next to the component in JavaScript or TypeScript, but extracts plain CSS files at build time, like CSS Modules. You will still meet styled-components in many existing codebases, so it is worth being able to read it.',
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
    summary: 'Plain CSS with a naming convention, CSS Modules, utility classes and CSS-in-JS all solve the same problem, scoping. Pick **one** for a project, add one global file for the reset and the design tokens, and keep inline styles for values computed at runtime.',
    body: [
      'The approaches differ in two questions: **where does a class name come from** (you, a convention, the build tool, a library) and **when is the CSS produced** (written by hand, at build time, or at runtime in the browser). The table compares them on what usually decides the choice.',
      'Consistency matters more than the "best" option. With one approach, every component is styled the same way, so anyone knows where to look and how to change it. A sensible default for a new Vite + React project is CSS Modules (nothing to install, plain CSS knowledge) or Tailwind (if the team wants a design scale); both cost nothing at runtime.',
      'Whatever you pick, the project needs a small **global layer**: `index.css` with the reset (`box-sizing: border-box`), the body font, the [design tokens](#/browser/styling-testing/design-tokens) as custom properties, and a visible focus style. Component styles build on it.',
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
    summary: 'A **design token** is a named design decision: the primary colour, the spacing step, the corner radius. In CSS you store tokens as **custom properties** (`--color-primary: #1a1f6c`) and use them with `var(--color-primary)`. A theme, such as dark mode, is the same names with different values.',
    body: [
      'Components refer to names, not values: "use the surface colour", not "#fff". Change a value in one place and every component follows. Custom properties are real CSS properties: they are **inherited** down the tree and resolved by the browser while the page runs. You can redefine them for a theme or for one part of the page without rebuilding anything (unlike Sass variables, which disappear when the CSS is built).',
      'Define the tokens on `:root` (the `<html>` element) so that everything inherits them, and read them with `var(--name)`, optionally with a fallback, `var(--radius, 6px)`. A custom property can also be set from React, `style={{ \'--accent\': color }}`, and the CSS below that element sees the new value.',
      'Two ways to switch themes, usually combined. Follow the operating system with `@media (prefers-color-scheme: dark) { :root { … } }`. Let the user choose with an attribute, `:root[data-theme="dark"] { … }`, that React sets with `document.documentElement.dataset.theme = theme` (and remembers with [useLocalStorage](#/browser/state-effects/use-local-storage)). Add `color-scheme: light dark` so form controls and scrollbars follow too.',
      'Tokens work with every approach: a CSS Module uses `var(--color-primary)` like any CSS file, and Tailwind v4 defines its own theme as custom properties (the `@theme` block), so your tokens and its utilities can share values.',
    ],
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
    example: 'In the box, press **Dark theme**. The effect sets `data-theme="dark"` on `<html>`, the second `:root` rule redefines five tokens, and every rule that uses them repaints: no component rule was duplicated. Change `--radius` to `0` in the first block: the card and the button both become square.',
    mistake: 'Writing dark mode as a second copy of every component rule: `.dark .card { background: … }`, `.dark .button { … }`, and so on for each component. The copies drift apart and every new component needs two sets of rules. Redefine the **tokens** once per theme; components keep using `var(--…)`.' },

  { id: 'responsive-component', hub: 'approaches', topic: 'approaches',
    title: 'A responsive component: breakpoints in its own CSS',
    summary: 'A component can carry its own breakpoint: a media query (or a **container query**) in the component\'s CSS changes its layout above a width, mobile-first. The rules are those of plain CSS; what changes is where they live.',
    body: [
      'Everything from [Media queries and breakpoints](#/browser/css/media-queries) still applies; in a component app the query simply sits next to the component it changes, in its CSS file or module. Mobile-first: the base rules describe the narrow layout, and `@media (min-width: 48rem) { … }` adds the wider one. The viewport `<meta>` tag from [Responsive foundations](#/browser/css/responsive-foundations) is already in Vite\'s `index.html`.',
      'A media query asks about the **viewport**. A component, however, does not know where it will be placed: the same task list may fill the page or sit in a narrow sidebar on a wide screen. A **container query** asks about the space the component actually gets: mark a wrapper with `container-type: inline-size`, then write `@container (min-width: 30rem) { … }`. All current browsers support it, and it is often the better fit for reusable components.',
      'Inside a CSS Module, `@media` and `@container` work as usual. In Tailwind, breakpoints are prefixes (`md:grid-cols-2`) and container queries are `@container` plus `@md:…`. Inline styles cannot express either, one more reason to keep layout in CSS.',
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
    example: 'In the box, drag the corner of the dashed box: below 320px the tasks stack in one column, from 320px they form two, from 560px four. The window did not change size, only the container did; a media query could not have reacted to that.',
    mistake: 'Giving a component a fixed width, `.task-grid { width: 800px; }`, and testing only on a laptop. On a 375px phone it overflows and the page scrolls sideways. Let components fill the space they get (`max-width` instead of `width`) and add columns with a breakpoint.' },

  { id: 'interaction-states', hub: 'approaches', topic: 'approaches',
    title: 'Hover, focus and disabled: interaction states',
    summary: 'Every interactive component needs visible styles for its states: `:hover` (pointer over it), `:focus-visible` (focused from the keyboard), `:disabled`, and "this one is selected", best expressed with attributes such as `[aria-pressed="true"]` or `[aria-current="page"]`.',
    body: [
      'A state style is feedback: "you can click this", "you are here", "this is the active one". Keyboard users rely on the focus ring the way mouse users rely on the pointer, so removing it leaves them lost on the page. The selectors are the [pseudo-classes](#/browser/css/pseudo-classes) you already know; in a component app they go in each component\'s CSS.',
      '`:focus-visible` matches when the browser decides the focus should be shown, typically when it came from the keyboard and not from a mouse click on a button. You can keep a strong ring for keyboard users without it flashing on every click. Give it contrast against the background (at least 3:1) and take its colour from a token.',
      'Style "selected" states through the attributes the component already sets for accessibility: `a[aria-current="page"]` for the current link in a navigation bar (router libraries usually set it for you on the active link), `button[aria-pressed="true"]` for a toggle, `[aria-invalid="true"]` for a field with an error. One piece of state then drives the look, what a screen reader says, and what a test checks.',
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
    example: 'In the box, click inside the preview and press Tab: each link shows the orange ring, but clicking with the mouse does not. Choose **Calendar**: React moves `aria-current="page"` to it, the CSS fills it in, and a screen reader announces "current page". The disabled **Log out** is skipped by Tab and looks unavailable.',
    mistake: 'Removing focus rings because they look "ugly": `*:focus { outline: none; }`. Keyboard users can no longer see where they are, which fails accessibility guidelines. Style `:focus-visible` the way you want instead; mouse users will not see it.' },

  /* ---- 3. Tests and tooling ------------------------------------------------------------------- */
  { id: 'why-test', hub: 'basics', topic: 'basics',
    title: 'Why automated tests',
    summary: 'An **automated test** is code that runs your code and checks the result, so that everything can be checked again in seconds after every change. Tests catch **regressions** (something that used to work breaks) and give you the confidence to **refactor**.',
    body: [
      'A test is a promise about behaviour, written down so that a machine can check it again and again. Checking by hand, clicking through every screen after each change, takes minutes, and people skip screens they did not touch: that is exactly where regressions hide. Automated tests re-check all of them whenever you save (watch mode) and whenever anyone pushes (continuous integration).',
      'What they give you: a regression is caught the moment you cause it, while the change is fresh in your head; you can **refactor** (change how code works inside without changing what it does) and the tests confirm the outside still behaves; the test names document the intended behaviour ("disables Reset at zero"); and code that is hard to test is often doing too much, so tests nudge the design.',
      'What they cannot do: prove there are no bugs. A test only checks what someone thought of. Good tests check the behaviour that matters to users, not every line. The vocabulary (test runner, test, assertion) is the same as for server tests, see [Automated API tests](#/http/api-design/automated-tests); the next cards apply it to the browser.',
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
    summary: 'Tests come in sizes. **Unit** tests check one function on its own; **component** (or integration) tests render a component with its children and interact with it; **end-to-end** (E2E) tests drive the whole app in a real browser against a real server. The pyramid says: many small, fast tests at the bottom, a few broad, slow ones at the top.',
    body: [
      'The trade-off is confidence against cost. A bigger test catches more kinds of problems (wiring between components, the real network, CSS that hides a button), but it is slower, more likely to fail for random reasons (timing, data) and harder to debug: "the checkout flow failed" says less than "`validateTask` accepted an empty title".',
      'Component tests run in **jsdom**, a JavaScript implementation of the DOM that runs in Node without a real browser. It is fast and good enough for elements, events and attributes, but it does no layout and no real rendering: a component test cannot tell you that a button is off-screen or the wrong colour. That is a job for E2E tests or a person looking.',
      'Many front-end teams draw a **trophy** instead of a pyramid: most of the effort in component tests, because they resemble how the app is used while staying fast. Whatever the shape, a healthy mix is: unit tests for logic (validation, formatting, reducers), component tests for each important behaviour of a screen, and a handful of E2E tests for the critical flows (log in, create a task).',
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
    summary: '**Vitest** is a test runner made for Vite projects: it finds the `*.test.js` and `*.test.jsx` files, runs them and reports each test as passed or failed. A file groups tests with `describe`, defines each one with `it` (or `test`) and checks values with `expect(value).matcher(expected)`.',
    body: [
      'Vitest reuses your Vite configuration, so tests compile JSX and resolve imports exactly as the app does. Its API is compatible with **Jest**, the runner many Node projects use: if you have written server tests with Jest, you already know it.',
      'A test follows **Arrange, Act, Assert**: prepare the data (or render the component), do the thing, check the result. `describe(\'TaskList\', () => { … })` groups related tests; `it(\'shows the empty message\', () => { … })` is one case, named as a sentence about behaviour; `beforeEach(() => { … })` runs before every test of the group, so each test starts from a clean state.',
      '**Matchers** say how to compare. `toBe` uses `Object.is`, right for strings, numbers and booleans; `toEqual` compares contents, right for objects and arrays; `toContain`, `toHaveLength`, `toBeNull`, `toBeTruthy`, `toThrow` cover the rest, and `.not` negates any of them. **Mock functions** record their calls: `vi.fn()` creates one, `vi.spyOn(object, \'method\')` wraps an existing one, and `expect(mock).toHaveBeenCalledWith(…)` checks how it was called.',
      'Running: `npx vitest` starts **watch mode** (it reruns the affected tests every time you save); `npx vitest run` runs once, as a CI server does. Add `"test": "vitest"` to the `scripts` of `package.json` and `npm test` does the same. A failure shows the test name, the expected and received values and the line.',
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
    summary: 'Three tools catch problems before tests do: **ESLint** finds bugs and risky patterns in the code (with the **react-hooks** plugin, broken hook rules), **Prettier** formats the code automatically, and **React DevTools** shows the component tree, props and state in the browser.',
    body: [
      'Each one acts at a different moment. Prettier when you save: formatting stops being a matter of taste or a review comment. ESLint while you type: red underlines for unused variables, hooks called conditionally or missing effect dependencies. DevTools while the app runs: why is this prop `undefined`, what is in this state, why does this component render so often.',
      'The React template of Vite ships an `eslint.config.js` with `eslint-plugin-react-hooks`, whose two rules matter most: **rules-of-hooks** ([no hooks in conditions or loops](#/browser/state-effects/rules-of-hooks)) and **exhaustive-deps** (every value an effect uses is in its dependency array, which prevents [stale closures](#/browser/state-effects/stale-closures)). For tests, `eslint-plugin-testing-library` and `eslint-plugin-jest-dom` flag the patterns the [What not to test](#/browser/styling-testing/implementation-details) card warns about; the "Advice" panel of the test runner here imitates a few of their rules.',
      'React DevTools is a browser extension. The **Components** tab shows the tree; selecting a component shows its props, state and hooks, which you can edit live. "Highlight updates when components render" flashes every re-render, and the **Profiler** tab records what rendered and for how long. The ordinary **Elements** tab still matters: it shows the real class names (the hashed ones of CSS Modules) and the computed styles.',
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

  /* ---- 4. Testing components --------------------------------------------------------------- */
  { id: 'rtl-philosophy', hub: 'components', topic: 'queries',
    title: 'Testing Library: test what the user sees',
    summary: '**React Testing Library** renders a component into a simulated page and gives you ways to find things the way a person does: by role, label and text. Its guiding principle: the more your tests resemble the way your software is used, the more confidence they can give you.',
    body: [
      'Imagine describing the test to someone who can only see the screen, or hear it through a screen reader: "there is a button called Increment; after clicking it, the text says Count: 1". No state variables, no component instances, no class names. A test that reads like that survives any refactor that keeps the screen the same, and fails exactly when a user would notice something different.',
      'The pieces: `render(<Counter />)` mounts the component with the real React into `document.body` (provided by jsdom in Vitest). `screen` holds the queries for the whole page (`screen.getByRole(…)`). `@testing-library/user-event` performs realistic clicks and typing. `@testing-library/jest-dom` adds matchers about the DOM: `toBeInTheDocument`, `toHaveTextContent`, `toBeDisabled`, `toHaveValue`. After each test the component is unmounted, so tests do not leak into each other.',
      'A useful side effect: if you cannot find an element by its role or label, a screen-reader user cannot either. Tests written this way push your markup towards [semantic HTML](#/browser/html/semantic-why) and proper `<label>`s. What you cannot do, on purpose, is read a component\'s state or call its functions: the test sees only what the user sees.',
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

  { id: 'queries', hub: 'components', topic: 'queries',
    title: 'Finding elements: by role, label and text',
    summary: 'Queries find elements in the rendered page. Prefer, in this order: `getByRole` (with `name`), `getByLabelText` for form fields, `getByPlaceholderText`, `getByText` for non-interactive text, `getByDisplayValue`, `getByAltText` / `getByTitle`, and only as a last resort `getByTestId`.',
    body: [
      'The order follows how a person finds things. The **role** says what an element is (button, link, heading, textbox, checkbox, list, alert), and every HTML element has an implicit one: `<button>` is a button, `<h2>` a heading, `<input type="text">` a textbox, `<ul>` a list (the table lists the common ones). The **accessible name** is what a screen reader announces for it: the text of a button, the `<label>` of an input, its `aria-label`, the `alt` of an image.',
      '`screen.getByRole(\'button\', { name: \'Add task\' })` finds the one button named "Add task". The `name` can be a regular expression, `{ name: /add/i }`; headings take `{ level: 2 }`; toggles and checkboxes take `{ pressed: true }` or `{ checked: true }`. When nothing matches, the error lists every role and name on the page: read it, it usually shows the typo or the missing label.',
      'Text matching is exact by default, after trimming and collapsing spaces: `getByText(\'Count: 1\')` does not match "Count: 10". Pass `{ exact: false }` for a case-insensitive substring, or a regular expression. `getByText` looks at each element\'s **own** text, so `<p>Count: <strong>1</strong></p>` is two pieces and `getByText(\'Count: 1\')` finds neither. To search inside one part of the page, use `within(element).getByRole(…)`.',
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

  { id: 'get-query-find', hub: 'components', topic: 'queries',
    title: 'getBy, queryBy, findBy: present, absent, later',
    summary: 'Every query comes in three flavours. `getBy…` returns the element or **throws** (it must be there now); `queryBy…` returns **null** when there is none (to check that something is absent); `findBy…` returns a **promise** that resolves when the element appears (for things that show up later). The `…AllBy…` versions return arrays.',
    body: [
      'The three ask three different questions: "is it here?", "is it gone?" and "will it come?". Choosing the right one makes the test say what you mean, and makes the failure message useful: a failed `getBy` prints the whole page so you can see what was there instead.',
      '`findBy…` is `getBy…` retried: it tries every 50 ms for up to 1 s (change it with `findByText(\'…\', {}, { timeout: 3000 })`) and resolves with the element as soon as it exists, so you must `await` it in an `async` test. While it waits, React keeps rendering, so data that arrives from a fetch has time to appear.',
      'To check absence: `expect(screen.queryByRole(\'alert\')).not.toBeInTheDocument()` (or `.toBeNull()`). To wait until something disappears, such as a loading message: `await waitForElementToBeRemoved(() => screen.queryByText(\'Loading…\'))`, or wrap any assertion in `await waitFor(() => …)`.',
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

  { id: 'user-events', hub: 'components', topic: 'interactions',
    title: 'Simulating the user: userEvent and mock callbacks',
    summary: '`@testing-library/user-event` simulates complete interactions: `await user.click(button)`, `await user.type(input, \'Buy milk\')`, the keyboard, select boxes. Combine it with `vi.fn()` to check what a component tells its parent through callback props.',
    body: [
      'A real click is not one event. The browser sends pointer and mouse "down" events, moves the focus, sends the "up" events and finally `click`; typing one key sends `keydown`, changes the value, sends `input` and `keyup`, character by character. `fireEvent.click(button)` dispatches only the `click`; `userEvent` plays the whole sequence the way a browser does, so it catches bugs that `fireEvent` misses (a disabled button that should not react, a handler on `keydown`, focus that moves).',
      'Create the user at the start of the test, `const user = userEvent.setup()`, and **await** every action: they are asynchronous. `user.type(el, \'Call Ana{Enter}\')` types and presses Enter; `user.clear(el)` empties a field; `user.selectOptions(select, \'done\')` picks an option; `user.keyboard(\'{Escape}\')` presses keys on the focused element; `user.tab()` moves the focus.',
      'A component often does not decide what happens next: a form calls `onAdd(title)` and the parent saves the task. In the test, pass a **mock function**, `const onAdd = vi.fn()`, and assert on its calls: `toHaveBeenCalledWith(\'Buy milk\')`, `toHaveBeenCalledTimes(1)`, `not.toHaveBeenCalled()`. You test the component\'s contract without the parent.',
    ],
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

  { id: 'async-ui', hub: 'components', topic: 'interactions',
    title: 'Testing async UI: waiting and mocking fetch',
    summary: 'A component that loads data first shows "Loading…" and the data later. Its tests must **wait** (`await screen.findBy…`) and must **control the network**: replace `fetch` with a mock that answers what each test needs (data, an empty list, a 500, a network failure).',
    body: [
      'In a test there is no server, and you do not want one: a real API makes tests slow, dependent on its data, and red whenever it is down. Instead each test decides what the "server" answers and checks that the screen shows the matching state: the four states of [loading, error, empty and success](#/browser/data-fetching/request-states) are four tests.',
      'With Vitest, replace the global `fetch` for one test: `vi.spyOn(globalThis, \'fetch\').mockResolvedValue(Response.json([{ id: 1, title: \'Buy milk\' }]))` for data, `new Response(null, { status: 500 })` for a server error, `.mockRejectedValue(new TypeError(\'Failed to fetch\'))` for no connection. Undo it after each test with `vi.restoreAllMocks()` in `afterEach` (or `restoreMocks: true` in the config). You can also check the request: `expect(fetch).toHaveBeenCalledTimes(1)`.',
      'Two other levels are common. If your components call one [API client module](#/browser/data-fetching/api-client), mock that module (`vi.mock(\'./api/client\')`) and return plain data. Or use **MSW** (Mock Service Worker), which answers requests at the network level, so the component\'s real `fetch` code, URL and headers included, runs in the test. In the [test runner](#/browser/styling-testing/practice/component-tests) here, a small fake API plays that role for `/api/tasks`.',
    ],
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

  { id: 'implementation-details', hub: 'components', topic: 'interactions',
    title: 'What not to test: implementation details',
    summary: 'An **implementation detail** is anything the user cannot see or use: state variable names, internal functions, CSS class names, the structure of the markup. Tests that check them break when you refactor (false alarms) and pass when the user-facing behaviour breaks (false confidence).',
    body: [
      'Brittle tests fail in two directions. **False alarm**: the counter\'s class moves from `.counter__inc` to a CSS Module; nothing changed for users, but the test that used `container.querySelector(\'.counter__inc\')` turns red. After a few of these, people stop trusting red tests. **False confidence**: a toggle test checks that the class `toggle--on` is added, but the code forgot to update `aria-pressed`; a screen-reader user cannot tell the button is on, and the test is green.',
      'Avoid: finding elements by class, id or position (`container.querySelector`, `firstChild`); asserting on class names or inline styles to mean a state; reading `.textContent` or `.className` yourself; test ids when a role or a label exists; snapshots of whole components (huge diffs that get approved without reading); testing React itself ("setState re-renders").',
      'Aim for **inputs → outputs**. Inputs: props, user events, network answers. Outputs: what is on the screen (text, roles, `disabled`, `aria-pressed`, `aria-invalid`), the callbacks called, the requests sent. A refactor that keeps the outputs keeps the tests green. When a style matters to the user (an element is hidden), test the effect with `toBeVisible` or presence, not the class that causes it.',
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

  { id: 'first-component-test', hub: 'components', topic: 'interactions',
    title: 'A first component test, end to end',
    summary: 'From a Vite project to a green test: install Vitest, jsdom and the Testing Library packages, tell Vitest to use jsdom, load the jest-dom matchers once, write `TodoForm.test.jsx` next to the component, run `npx vitest`, and read the first failure.',
    body: [
      'Install the tools as development dependencies: `npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom`. `@testing-library/dom` is listed separately because current versions of the React package expect you to install it yourself.',
      'Configure the test environment in `vite.config.js` (code below): `environment: \'jsdom\'` gives tests a `document`; `globals: true` makes `describe`, `it` and `expect` available without imports, and lets Testing Library clean up after each test automatically; `setupFiles` runs a file before every test file, where you load the jest-dom matchers. Add `"test": "vitest"` to the scripts of `package.json`.',
      'Write the test next to the component, `src/components/TodoForm.test.jsx`, run `npm test`, and watch it go green. Then break it on purpose (change the expected text) to see a failure: the message, the page Testing Library printed, and the line. Reading that output quickly is half of testing. The tool below runs the same kind of test file in your browser against small components, including broken versions of them.',
    ],
    code: `// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});

// src/setupTests.js
import '@testing-library/jest-dom/vitest';

// src/components/TodoForm.test.jsx
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
];
