'use strict';
/* DOM and events: concept cards, rail groups and self-check quiz. See site/README.md for the
   data contract. `live` boxes run in a sandboxed iframe without `allow-forms`, so they use
   buttons and key events instead of form submission; the form version of each pattern is
   shown as static `code`. */

DATA.en.DOM_QUIZ_TOPICS = {
  tree: 'The DOM tree and selecting',
  change: 'Changing the page',
  events: 'Events',
  flow: 'Propagation and delegation',
  patterns: 'Building a small app',
};

DATA.en.DOM_GROUPS = [
  { key: 'tree', label: 'The DOM tree', icon: 'index' },
  { key: 'change', label: 'Changing the page', icon: 'code' },
  { key: 'events', label: 'Events', icon: 'lifecycle' },
  { key: 'flow', label: 'Propagation and delegation', icon: 'arrow' },
  { key: 'patterns', label: 'Putting it together', icon: 'steps' },
];

DATA.en.DOM_CONCEPTS = [
  /* ---- 1. The DOM tree ------------------------------------------------------------ */
  { id: 'what-is-dom', hub: 'tree', topic: 'tree', 
    title: 'What the DOM is',
    summary: 'The DOM (Document Object Model) is the browser\'s live, in-memory tree of objects built from your HTML; JavaScript reads and changes the page through it.',
    body: [
      'Your HTML file is the **blueprint**; the DOM is the **building** the browser constructs from it, and that you can renovate while people are inside. The browser reads the HTML once, builds a tree of **nodes**, and from then on it draws the DOM, not the file. Change the DOM and the screen updates immediately; the file on disk never changes, so a reload brings back the original.',
      'Not every node is a tag. **Element nodes** come from tags (`<li>`); **text nodes** hold the text inside them, including the line breaks and spaces between tags; there are also comment nodes. The global `document` object is the entry point to the tree (`document.body` is the `<body>` element). Nodes are related like a family tree: `el.parentElement`, `el.children` (child **elements** only), `el.firstElementChild`, `el.nextElementSibling`. Their cousins without "Element" (`firstChild`, `childNodes`) include text nodes too.',
      'The DOM is not a copy of your source text: the browser **repairs** markup while building it. It closes unclosed `<p>` tags and inserts a `<tbody>` into every table that lacks one. **View Source** shows the file as downloaded; DevTools\' **Elements** panel shows the current DOM, including everything JavaScript added.',
    ],
    example: 'You write `<table><tr><td>1</td></tr></table>`. In the DOM the row sits inside a `<tbody>` the browser added, so `document.querySelector(\'table > tr\')` finds nothing, while `document.querySelector(\'table tr\')` (any depth) works.',
    mistake: 'Looking for elements created by JavaScript in **View Source** and concluding the code failed. View Source shows the original file; open the **Elements** panel to see the live DOM.',
    live: {
      kind: 'html',
      html: `<ul id="list">
  <li>HTML</li>
  <li>CSS</li>
</ul>`,
      js: `const list = document.getElementById('list');
console.log('child elements:', list.children.length);
console.log('first child node:', list.firstChild.nodeName);
console.log('first child element:', list.firstElementChild.nodeName);

list.firstElementChild.textContent = 'HTML5 (changed by JavaScript)';`,
    },
    widget: 'dom-tree',
    practice: { href: '#/browser/dom/practice/dom-tree', label: 'Explore the live DOM tree' } },

  { id: 'selecting', hub: 'tree', topic: 'tree', 
    title: 'Selecting elements: getElementById, querySelector, querySelectorAll',
    summary: '`document.getElementById(id)` and `document.querySelector(css)` return one element (or `null`); `document.querySelectorAll(css)` returns every match as a NodeList.',
    body: [
      'Selecting is a **search over the tree** written in the CSS selector language you already know from [CSS selectors](#/browser/css/basic-selectors). `querySelector` returns the **first** match in document order; `querySelectorAll` returns **all** matches. Both return something even when nothing matches: `null` for the single version, an empty NodeList for the "all" version.',
      'A **NodeList** is *array-like*, not an array: it has `length`, `list[0]`, `forEach` and works with `for...of`, but it has no `map` or `filter`. Convert it with `Array.from(nodes)` or `[...nodes]` when you need them. The NodeList from `querySelectorAll` is a **snapshot**: elements added to the page later are not in it.',
      'You can search **inside** an element too: `menu.querySelector(\'a\')` only looks among the descendants of `menu`.',
    ],
    table: {
      caption: 'The three selection methods',
      head: ['Call', 'Argument', 'Returns', 'No match'],
      rows: [
        ['`document.getElementById(\'save\')`', 'an id, **without** `#`', 'one element', '`null`'],
        ['`document.querySelector(\'#save\')`', 'any CSS selector', 'the first matching element', '`null`'],
        ['`document.querySelectorAll(\'.item\')`', 'any CSS selector', 'a static NodeList', 'an empty NodeList (`length` 0)'],
      ],
    },
    example: 'In a task list, `document.querySelectorAll(\'.tasks li.done\')` finds the completed tasks, `document.querySelector(\'.tasks li\')` the first task, and `document.querySelector(\'.tasks li:last-child\')` the last one: the same selectors you would write in a stylesheet.',
    mistake: 'Passing a CSS selector to `getElementById`: `document.getElementById(\'#save\')` looks for an element whose id is literally `#save`, returns `null`, and the next line fails with `TypeError: Cannot read properties of null (reading \'addEventListener\')`.',
    live: {
      kind: 'html',
      html: `<ul class="tasks">
  <li class="done">Buy milk</li>
  <li>Write report</li>
  <li class="done">Call Ana</li>
</ul>`,
      js: `const all = document.querySelectorAll('.tasks li');
console.log('tasks:', all.length);

const done = document.querySelectorAll('.tasks li.done');
done.forEach((li) => { li.textContent += ' (done)'; });

console.log(document.querySelector('#nope'));         // null
console.log(document.getElementById('#tasks'));       // null: no # here
console.log(Array.isArray(all), typeof all.map);       // not an array
console.log(Array.from(all).map((li) => li.textContent));`,
    },
    widget: 'dom-tree',
    practice: { href: '#/browser/dom/practice/dom-tree', label: 'Test selectors in the DOM tree tool' } },

  { id: 'script-loading', hub: 'tree', topic: 'tree', 
    title: 'Loading scripts: defer and DOMContentLoaded',
    summary: 'A script can only find elements the browser has already parsed; `<script src="app.js" defer>` (or a script at the end of `<body>`) runs after the whole HTML has been read.',
    body: [
      'The browser reads HTML **top to bottom** and builds the tree as it goes. A plain `<script>` stops the reading and runs immediately, so a plain script in `<head>` runs before any `<body>` element exists: every `querySelector` returns `null`.',
      '`defer` tells the browser: download this script in parallel, but run it only **after the HTML is fully parsed**, in the order the scripts appear. That is why a page that loads its script in `<head>` writes `<script src="app.js" defer></script>`. It is the recommended default for page scripts; scripts with `type="module"` are deferred automatically.',
      'The `DOMContentLoaded` event fires on `document` when the HTML has been parsed (it does not wait for images; the `load` event on `window` does). `document.addEventListener(\'DOMContentLoaded\', start)` is the older way to get the same guarantee. `async` scripts run as soon as they arrive, in any order: fine for independent scripts such as analytics, wrong for code that needs the page.',
    ],
    table: {
      caption: 'Where the script tag goes and what it can see',
      head: ['Script tag', 'Runs…', 'Can it find `<body>` elements?'],
      rows: [
        ['`<script src="app.js">` in `<head>`', 'immediately, blocking the parsing', 'No'],
        ['`<script src="app.js" defer>` in `<head>`', 'after parsing, in order', 'Yes (recommended)'],
        ['`<script src="app.js">` just before `</body>`', 'when the parser reaches it, almost at the end', 'Yes, the elements above it'],
        ['`<script src="app.js" async>`', 'as soon as it is downloaded', 'Not reliably'],
      ],
    },
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>To-do</title>
  <link rel="stylesheet" href="styles.css">
  <script src="app.js" defer></script>
</head>
<body>
  <ul id="list"></ul>
</body>
</html>`,
    example: 'In the Try-it box, the first inline script runs before the paragraph exists and finds nothing; the second, placed after it, finds it; the `DOMContentLoaded` listener runs last, once everything has been parsed.',
    mistake: 'Moving the script into `<head>` without `defer`. The page shows `TypeError: Cannot read properties of null (reading \'addEventListener\')`, not because the selector is wrong but because the element did not exist yet when the line ran.',
    live: {
      kind: 'html',
      html: `<script>
  console.log('before the paragraph, found:', document.querySelector('#msg'));
</script>
<p id="msg">Hello</p>
<script>
  console.log('after the paragraph, found:', document.querySelector('#msg').textContent);
</script>`,
      js: `document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: the whole HTML has been parsed');
});`,
    } },

  /* ---- 2. Changing the page --------------------------------------------------------- */
  { id: 'text-vs-html', hub: 'change', topic: 'change', 
    title: 'textContent vs innerHTML, and the XSS risk',
    summary: '`textContent` reads or writes plain text; `innerHTML` reads or writes HTML that the browser parses into elements, so putting untrusted text into `innerHTML` can run an attacker\'s code (XSS).',
    body: [
      '`textContent` is a **label printer**: whatever string you give it is shown literally, so `<b>` appears as the four characters `<b>`. `innerHTML` is a **builder**: it parses the string as HTML and creates real elements. That power is exactly the danger when the string contains something you did not write.',
      '**XSS (cross-site scripting)** is an attack in which someone gets their markup to run as code in other users\' browsers, for example through a comment, a user name or a to-do text. A `<script>` tag inserted with `innerHTML` does not run, but an attribute such as `onerror="…"` on an `<img>` does. With `textContent` the same text is displayed harmlessly.',
      'Rule of thumb: **data from users or APIs goes into `textContent`** (or into elements built with `createElement`). Use `innerHTML` only for fixed markup you wrote yourself. `el.innerHTML = \'\'` (or `el.replaceChildren()`) is a fine way to empty an element.',
    ],
    points: [
      '`innerHTML +=` re-parses and rebuilds **all** the existing children: listeners attached to them are lost and typed input is reset.',
      '`innerText` is similar to `textContent` but depends on CSS (it skips hidden text) and is slower; prefer `textContent`.',
    ],
    example: 'A comment box. A visitor posts `<img src=x onerror="stealCookies()">`. With `comment.innerHTML = text` every reader of the page runs `stealCookies()`; with `comment.textContent = text` readers just see that odd text. In the Try-it box the "attack" only logs a message, but it proves the code ran.',
    mistake: 'Building list items with `list.innerHTML += \'<li>\' + input.value + \'</li>\'`. It opens an XSS hole (the user controls `input.value`) and destroys the listeners on the existing items. Use `createElement` + `textContent` + `append`.',
    live: {
      kind: 'html',
      html: `<p>textContent: <span id="safe"></span></p>
<p>innerHTML: <span id="unsafe"></span></p>`,
      js: `const comment = '<b>Nice</b> <img src="x" onerror="console.log(\\'injected code ran!\\')">';

document.querySelector('#safe').textContent = comment;
document.querySelector('#unsafe').innerHTML = comment;

console.log('elements created by textContent:', document.querySelector('#safe').children.length);
console.log('elements created by innerHTML:', document.querySelector('#unsafe').children.length);`,
    } },

  { id: 'attributes', hub: 'change', topic: 'change', 
    title: 'Attributes, properties and form values',
    summary: 'HTML attributes become properties of the element object (`el.id`, `img.src`, `input.value`, `btn.disabled`); `getAttribute`/`setAttribute` work with the attribute text, and `data-*` attributes hold your own data in `el.dataset`.',
    body: [
      'An **attribute** is what is written in the HTML: the starting configuration. A **property** is the live state of the element object now. For most attributes they mirror each other, but not for form fields: `input.value` is what the user has typed **now**, while `input.getAttribute(\'value\')` is still the default written in the HTML.',
      '`setAttribute(name, value)`, `getAttribute(name)`, `removeAttribute(name)` and `hasAttribute(name)` work for any attribute, including ARIA ones (`btn.setAttribute(\'aria-expanded\', \'true\')`). Boolean attributes have boolean properties: `btn.disabled = true`, `checkbox.checked`.',
      'Custom data goes in **`data-*` attributes**: `<li data-task-id="7">` is read as `li.dataset.taskId` (the name is converted to camelCase). Like every attribute and every `input.value`, the value is a **string**: convert with `Number()` when you need a number.',
    ],
    example: 'For `<a href="/about">`, `link.getAttribute(\'href\')` is `\'/about\'` (what you wrote) while `link.href` is the full resolved URL such as `\'https://example.com/about\'`. Same attribute, two views.',
    mistake: 'Reading `input.value` once when the script starts (it is still empty) and using that stale value in the click handler. Read `input.value` **inside** the handler, at the moment the user acts.',
    live: {
      kind: 'html',
      html: `<input id="name" value="Ana">
<button id="btn" data-task-id="7">Task button</button>`,
      js: `const input = document.querySelector('#name');
input.value = 'Bea';
console.log(input.value, input.getAttribute('value'));   // Bea Ana

const btn = document.querySelector('#btn');
console.log(btn.dataset.taskId, typeof btn.dataset.taskId);

btn.disabled = true;
console.log(btn.hasAttribute('disabled'));
btn.setAttribute('title', 'Disabled by JavaScript');`,
    } },

  { id: 'class-list', hub: 'change', topic: 'change', 
    title: 'classList: styling through classes',
    summary: '`el.classList` adds, removes, toggles and tests CSS classes, so JavaScript decides **which state** an element is in and CSS decides **how** each state looks.',
    body: [
      'Split the work: JavaScript flips **switches** (classes such as `done`, `open`, `error`); the stylesheet defines what each switch looks like (`.done { text-decoration: line-through; }`). The look stays in one place (the CSS), the class name documents the state, and designers can restyle it without touching the JavaScript.',
      '`el.classList.add(\'a\')`, `.remove(\'a\')`, `.toggle(\'a\')` (adds it if missing, removes it if present, and returns the new state), `.toggle(\'a\', condition)` (forces on or off), `.contains(\'a\')` (true/false) and `.replace(\'a\', \'b\')`. They only touch the class you name.',
      '`el.style.color = \'red\'` writes an **inline style**: it beats almost every stylesheet rule, is hard to undo and scatters the look across the JavaScript. Keep `el.style` for values computed at run time (a width in pixels, a position). Property names are camelCase there: `el.style.backgroundColor`.',
    ],
    example: 'A dark-mode button: `toggleBtn.addEventListener(\'click\', () => document.body.classList.toggle(\'dark\'));`, with all the colours defined under `body.dark { … }` in the CSS.',
    mistake: 'Writing `el.className = \'done\'` to mark a task. `className` is the whole class string, so an element with `class="task urgent"` loses both classes. `el.classList.add(\'done\')` adds one class and keeps the others.',
    live: {
      kind: 'html',
      html: `<p>Click a task to toggle it.</p>
<ul id="list">
  <li class="task">Buy milk</li>
  <li class="task done">Call Ana</li>
</ul>`,
      css: `.task { cursor: pointer; padding: 4px 0; }
.done { text-decoration: line-through; color: #777; }`,
      js: `const items = document.querySelectorAll('#list li');
console.log(items[1].classList.contains('done'));   // true

items.forEach((li) => {
  li.addEventListener('click', () => {
    const nowDone = li.classList.toggle('done');
    console.log(li.textContent, 'done?', nowDone, '| classes:', li.className);
  });
});`,
    } },

  { id: 'create-remove', hub: 'change', topic: 'change', 
    title: 'Creating, adding and removing elements',
    summary: '`document.createElement(tag)` makes a new element that is not on the page yet; `append`/`appendChild` attach it to a parent so it appears, and `el.remove()` takes it out again.',
    body: [
      '`createElement` builds a part **on the workbench**: it exists in memory but is invisible until you attach it to a parent that is already in the page. The recipe is always **create → fill → attach**: create the element, set its `textContent`, classes and attributes, then `parent.append(el)`.',
      '`parent.appendChild(node)` adds one node at the end (the classic form, found in most tutorials); `parent.append(a, b, \'text\')` adds several and accepts strings; `prepend` adds at the start, `el.before(x)` / `el.after(x)` next to an element. A node can only be in one place: appending an element that is already in the page **moves** it.',
      'To remove, `el.remove()` is the modern call; `parent.removeChild(child)` is the older equivalent you will still see in many tutorials. `list.replaceChildren()` (or `list.textContent = \'\'`) empties a list in one go. `list.firstElementChild` is the first **element** child; `list.firstChild` may be a whitespace text node.',
    ],
    code: `const names = ['Ana', 'Bea', 'Carlos'];
const list = document.querySelector('#people');

for (const name of names) {
  const li = document.createElement('li');   // create
  li.textContent = name;                      // fill (safe: plain text)
  li.classList.add('person');
  list.append(li);                            // attach: now visible
}`,
    example: 'Rendering an array: for each name, create an `<li>`, set its `textContent`, append it to the `<ul>`. Three names produce three list items; an empty array produces an empty list, with no special case needed.',
    mistake: 'Creating and filling an element but never attaching it. There is no error at all; the element simply never appears. `el.isConnected` tells you whether it is in the page.',
    live: {
      kind: 'html',
      html: `<ul id="list">
  <li>Item 1</li>
</ul>
<button id="add">Add item</button>
<button id="del">Remove last</button>`,
      js: `const list = document.querySelector('#list');
let n = 1;

const loose = document.createElement('li');
loose.textContent = 'never attached';
console.log('in the page?', loose.isConnected);    // false

document.querySelector('#add').addEventListener('click', () => {
  n++;
  const li = document.createElement('li');
  li.textContent = 'Item ' + n;
  list.append(li);
  console.log('items:', list.children.length);
});

document.querySelector('#del').addEventListener('click', () => {
  const last = list.lastElementChild;
  if (last) last.remove();
  console.log('items:', list.children.length);
});`,
    } },

  /* ---- 3. Events ------------------------------------------------------------------- */
  { id: 'add-event-listener', hub: 'events', topic: 'events', 
    title: 'Events and addEventListener',
    summary: 'An event is the browser\'s signal that something happened (a click, a key, a form submission); `el.addEventListener(type, handler)` registers a function that the browser calls every time that event happens on that element.',
    body: [
      'You do not call a handler; **the browser does**. Registering a listener is like leaving your phone number: "call this function when someone clicks here". Your script runs once when the page loads, registers its listeners and finishes; after that, code runs only in reaction to events. This is the **event-driven** model, and it is why handlers are passed as function values (functions are first-class: see [Function scope and functions as values](#/browser/js/function-scope)).',
      'Pass the function, do not call it: `addEventListener(\'click\', save)` or an inline arrow `addEventListener(\'click\', () => save(42))`. An element can have many listeners for the same event; they run in the order they were added. `removeEventListener` needs the very same function reference, so it only works with named functions.',
    ],
    table: {
      caption: 'Events you will use most',
      head: ['Event', 'Fires when…', 'Typical target'],
      rows: [
        ['`click`', 'the element is clicked (or activated with Enter/Space on a button)', 'buttons, links, list items'],
        ['`input`', 'the value of a field changes, on every keystroke', '`<input>`, `<textarea>`'],
        ['`change`', 'the user commits a change (leaves the field, ticks a box, picks an option)', 'checkboxes, `<select>`'],
        ['`submit`', 'a form is submitted (button click **or** Enter in a text field)', '`<form>`'],
        ['`keydown`', 'a key is pressed; `e.key` says which (`\'Enter\'`, `\'Escape\'`, `\'a\'`)', 'fields, `document`'],
        ['`DOMContentLoaded`', 'the HTML has been fully parsed', '`document`'],
      ],
    },
    example: 'A live character counter: `bio.addEventListener(\'input\', () => { counter.textContent = bio.value.length + \' / 160\'; });`. The handler runs on every keystroke and always reads the current value.',
    mistake: 'Writing `btn.addEventListener(\'click\', handleClick());` with parentheses. `handleClick` runs once, immediately, and its return value (usually `undefined`) is registered as the "handler", so clicks then do nothing. The older `onclick="…"` HTML attribute is also best avoided: it mixes JavaScript into the markup and allows only one handler.',
    live: {
      kind: 'html',
      html: `<button id="btn">Click me</button>
<p id="count">0 clicks</p>
<input id="name" placeholder="Type your name">
<p id="hello"></p>`,
      js: `let clicks = 0;
document.querySelector('#btn').addEventListener('click', () => {
  clicks++;
  document.querySelector('#count').textContent = clicks + ' clicks';
});

const nameInput = document.querySelector('#name');
nameInput.addEventListener('input', () => {
  document.querySelector('#hello').textContent = 'Hello, ' + nameInput.value;
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') console.log('Enter pressed with', nameInput.value);
});`,
    } },

  { id: 'event-object', hub: 'events', topic: 'events', 
    title: 'The event object: target and currentTarget',
    summary: 'Every handler receives an event object describing what happened: `e.type`, `e.target` (the element where the event started), `e.currentTarget` (the element whose listener is running), `e.key` for keys, and methods such as `preventDefault()`.',
    body: [
      'The event object is the **incident report** the browser hands to your function: the first parameter of the handler, usually called `e` or `event`. You do not create it; you just declare the parameter to receive it.',
      '**`e.target`** is the innermost element where the event started: the thing actually clicked. **`e.currentTarget`** is the element the listener was added to. With a listener on a `<ul>` and a click on an `<li>` inside it, `target` is the `<li>` and `currentTarget` is the `<ul>`. They differ whenever the element has children, which is what event delegation relies on.',
      '`e.target.closest(selector)` climbs from the target up through its ancestors (itself included) and returns the first one matching the selector, or `null`. It is the safe way to ask "which item was this click inside?".',
    ],
    points: [
      'Inside a regular `function` handler, `this` is `e.currentTarget`; inside an arrow function, `this` is **not** the element. With arrows, use `e.currentTarget`.',
      'For `input` events, `e.target.value` is the field\'s current text: `console.log(e.target.value)` prints what the user has typed so far.',
    ],
    example: 'A button with an icon: `<button data-id="7"><img src="bin.svg" alt=""> Delete</button>`. Clicking the icon gives `e.target` = the `<img>`, which has no `data-id`. `e.currentTarget.dataset.id` (listener on the button) or `e.target.closest(\'button\').dataset.id` gives `\'7\'` wherever the user clicked.',
    mistake: 'Using `e.target` when you meant "the element I attached the listener to". It works while you click on bare text and breaks as soon as the element contains children (an icon, a `<strong>`, a `<span>`).',
    live: {
      kind: 'html',
      html: `<ul id="list">
  <li>Plain item</li>
  <li>Item with <strong>bold text</strong></li>
</ul>
<p id="out">Click an item, then click the bold text.</p>`,
      css: `#list { padding: 8px 8px 8px 28px; border: 2px dashed #1A1F6C; }
#list li { cursor: pointer; padding: 4px 0; }`,
      js: `const out = document.querySelector('#out');
document.querySelector('#list').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  out.textContent = 'target: ' + e.target.tagName +
    ' | currentTarget: ' + e.currentTarget.tagName +
    ' | closest li: ' + (li ? li.textContent : 'none');
});`,
    } },

  { id: 'prevent-default', hub: 'events', topic: 'events', 
    title: 'preventDefault: forms and links',
    summary: 'Some events have a built-in browser reaction: submitting a form sends it and reloads the page, clicking a link navigates. `e.preventDefault()` cancels that default action so your JavaScript can handle the event instead.',
    body: [
      'The browser has its own reaction to some events that runs **after** your listeners unless you veto it. For a form, the default is to send the data to the `action` URL (or the same page): a full page load that wipes everything your JavaScript added, so a new to-do item flashes and disappears.',
      'Listen for **`submit` on the `<form>`**, not for `click` on its button. `submit` fires for a button click **and** for Enter pressed in a text field (implicit submission), so a to-do list gets "Enter also adds the item" for free. A `<button>` inside a form is `type="submit"` by default; give other buttons `type="button"`. HTML validation such as `required` runs before `submit` fires.',
      '`preventDefault()` only cancels the default action. It does not stop the event from bubbling to ancestors; that is `stopPropagation()`, a different tool with a different job.',
    ],
    code: `<form id="todo-form">
  <label for="todo-input">New task</label>
  <input id="todo-input" required>
  <button>Add</button>          <!-- type="submit" by default -->
</form>

<script>
  const form = document.querySelector('#todo-form');
  const input = document.querySelector('#todo-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();          // no reload: we handle it
    const text = input.value.trim();
    if (!text) return;
    console.log('add', text);
    form.reset();                // empty the field
    input.focus();
  });
</script>`,
    example: 'The classic to-do form handler: `form.addEventListener("submit", (e) => { e.preventDefault(); … })`. Remove the `preventDefault()` line and the page reloads on every submit, so the `<li>` you just appended is gone. (The Try-it box below cannot submit forms, so it shows the same idea on a link and a checkbox.)',
    mistake: 'Attaching a `click` listener to the submit button and forgetting `preventDefault()`: the item is added, the form submits, the page reloads, and the item vanishes. Listening to `submit` on the form is the robust choice: it covers every way of submitting and fires only after HTML validation (`required`) has passed, whereas the button\'s `click` fires before validation.',
    live: {
      kind: 'html',
      html: `<p><a id="link" href="https://example.com">This link does not navigate</a></p>
<p><label><input type="checkbox" id="locked"> This box cannot be ticked</label></p>`,
      js: `document.querySelector('#link').addEventListener('click', (e) => {
  e.preventDefault();
  console.log('navigation cancelled for', e.currentTarget.getAttribute('href'));
});

document.querySelector('#locked').addEventListener('click', (e) => {
  e.preventDefault();
  console.log('tick cancelled');
});`,
    } },

  /* ---- 4. Propagation and delegation ---------------------------------------------------- */
  { id: 'propagation', hub: 'flow', topic: 'flow', 
    title: 'Event propagation: capture, target and bubble',
    summary: 'An event does not stay on the clicked element: it travels from the top of the tree down to the target (capture phase), reaches the target (target phase), and then climbs back up through every ancestor (bubble phase), running their listeners on the way.',
    body: [
      'A click on a button inside a section inside a page is also a click on the section and on the page, like tapping the innermost of a set of nested boxes. The browser walks the path from `window` down to the target (**capture**), then back up from the target to `window` (**bubble**). A listener added with plain `addEventListener(type, fn)` listens during the **bubble** phase, so the innermost handler runs first and then each ancestor\'s, from the inside out.',
      'To listen on the way down, pass a third argument: `addEventListener(\'click\', fn, { capture: true })` (or just `true`). Capture listeners on an ancestor run **before** anything at the target. `e.eventPhase` tells you the phase: 1 = capture, 2 = at target, 3 = bubble.',
      'Most events bubble (`click`, `input`, `submit`, `keydown`). A few do not: `focus`/`blur` (use `focusin`/`focusout` if you need bubbling) and `mouseenter`/`mouseleave`.',
    ],
    example: 'Click the button in the Try-it box: the log shows `capture` on `#outer` first, then the button\'s own listener, then `bubble` on `#middle` and on `#outer`. Click the section padding instead and the button is not on the path at all.',
    mistake: 'Believing a click belongs only to the element that was clicked. In a to-do list, a click on an item\'s delete button **also** reaches the item\'s own click listener (it bubbles), so the item is toggled as it is removed, unless your code checks what was clicked.',
    live: {
      kind: 'html',
      html: `<div id="outer" class="box">div#outer
  <section id="middle" class="box">section#middle
    <button id="inner">button#inner</button>
  </section>
</div>
<ol id="log"></ol>`,
      css: `.box { border: 2px solid #1A1F6C; padding: 12px; margin: 6px 0; }
#middle { border-color: #FF5700; }
#log { font-family: monospace; font-size: 13px; }`,
      js: `const phases = ['none', 'capture', 'target', 'bubble'];
const log = document.querySelector('#log');
function report(e) {
  const li = document.createElement('li');
  li.textContent = phases[e.eventPhase] + ' phase: listener on #' + e.currentTarget.id;
  log.append(li);
}

const outer = document.querySelector('#outer');
outer.addEventListener('click', () => { log.replaceChildren(); }, { capture: true });
outer.addEventListener('click', report, { capture: true });
outer.addEventListener('click', report);
document.querySelector('#middle').addEventListener('click', report);
document.querySelector('#inner').addEventListener('click', report);`,
    },
    widget: 'event-propagation',
    practice: { href: '#/browser/dom/practice/event-propagation', label: 'Watch an event travel in the propagation tool' } },

  { id: 'stop-propagation', hub: 'flow', topic: 'flow', 
    title: 'stopPropagation, and when not to use it',
    summary: '`e.stopPropagation()` stops the event from travelling any further, so listeners on the ancestors do not run; it does not cancel the browser\'s default action.',
    body: [
      'Calling `stopPropagation()` is shouting "handled, do not pass it on". It solves the "delete button inside a clickable item" double reaction, but it is a blunt tool: **every** listener higher up stops receiving that event, including ones you did not write or have forgotten (analytics, a "click outside closes the menu" handler on `document`, a delegated listener on the list).',
      'Often the cleaner fix is in the **ancestor\'s** handler: check what was clicked and ignore clicks that belong to a child control, e.g. `if (e.target.closest(\'.delete\')) return;`. With event delegation this check is natural, and nothing needs to be stopped.',
    ],
    table: {
      caption: 'Two different methods for two different jobs',
      head: ['Method', 'Ancestors\' listeners still run?', 'Browser default (submit, navigate, tick) still happens?'],
      rows: [
        ['nothing', 'Yes', 'Yes'],
        ['`e.preventDefault()`', 'Yes', 'No'],
        ['`e.stopPropagation()`', 'No', 'Yes'],
        ['both', 'No', 'No'],
      ],
    },
    example: 'A card that opens a detail view when clicked contains a "favourite" star button. In the star\'s handler, `e.stopPropagation()` keeps the card from opening. The alternative is in the card\'s handler: `if (e.target.closest(\'.star\')) return;`.',
    mistake: 'Calling `stopPropagation()` to stop a link from navigating or a form from submitting. It stops the travel, not the default: the page still navigates. That job belongs to `preventDefault()`.',
    live: {
      kind: 'html',
      html: `<label><input type="checkbox" id="stop"> call stopPropagation() in the button handler</label>
<ul>
  <li id="item">Buy milk <button id="del">delete</button></li>
</ul>`,
      css: `#item { cursor: pointer; }
.done { text-decoration: line-through; color: #777; }`,
      js: `const item = document.querySelector('#item');
const stop = document.querySelector('#stop');

item.addEventListener('click', () => {
  item.classList.toggle('done');
  console.log('li handler ran: toggled "done"');
});

document.querySelector('#del').addEventListener('click', (e) => {
  if (stop.checked) e.stopPropagation();
  console.log('delete button clicked');
});`,
    } },

  { id: 'event-delegation', hub: 'flow', topic: 'flow', 
    title: 'Event delegation',
    summary: 'Event delegation means attaching **one** listener to a common ancestor (such as the `<ul>`) and using `e.target.closest(…)` to find which child was hit, instead of one listener per child; it also covers children added later.',
    body: [
      'One receptionist at the entrance instead of a guard in every room. Because clicks **bubble**, every click inside the list reaches the `<ul>`, and the event object says where it started. The list\'s single listener asks `e.target.closest(\'li\')` "which item?" and `e.target.closest(\'.delete\')` "was it the delete button?", and acts accordingly.',
      'This is what a to-do list needs. Its items are **created while the page is running**. Code like `document.querySelectorAll(\'li\').forEach((li) => li.addEventListener(…))` runs once at load and only covers the items that existed then: every item added later has no listener. A delegated listener on the `<ul>` (which exists from the start) handles current **and future** items, and it separates "delete" from "toggle" in one place, so the delete click does not also toggle the item.',
      'Recipe: (1) listen on a stable ancestor that is in the HTML from the start; (2) find the relevant element with `e.target.closest(selector)`; (3) if it is `null`, the click was not on anything you care about, so `return`; (4) read identifying data from `data-*` attributes.',
    ],
    code: `list.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete');
  if (deleteBtn) {
    deleteBtn.closest('li').remove();
    return;                        // do not also toggle
  }
  const item = e.target.closest('li');
  if (!item) return;               // click on the list padding
  item.classList.toggle('done');
});`,
    example: 'In the Try-it box, add three new items with the button, then click and delete them: they work immediately, although no listener was ever attached to them. The only listener is the one on the `<ul>`.',
    mistake: 'Using `e.target` directly instead of `closest`. If an item is `<li><span>Buy milk</span> …</li>`, a click on the text gives `e.target` = the `<span>`, so `e.target.classList.toggle(\'done\')` styles the span (or the wrong element), and `e.target.dataset.id` is `undefined`.',
    live: {
      kind: 'html',
      html: `<ul id="list">
  <li><span>Buy milk</span> <button class="delete">delete</button></li>
  <li><span>Call Ana</span> <button class="delete">delete</button></li>
</ul>
<button id="add">Add an item</button>`,
      css: `#list li { cursor: pointer; padding: 3px 0; }
.done span { text-decoration: line-through; color: #777; }`,
      js: `const list = document.querySelector('#list');
let n = 0;

list.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete');
  if (deleteBtn) {
    deleteBtn.closest('li').remove();
    console.log('deleted; items left:', list.children.length);
    return;
  }
  const item = e.target.closest('li');
  if (!item) return;
  item.classList.toggle('done');
  console.log('toggled:', item.querySelector('span').textContent);
});

document.querySelector('#add').addEventListener('click', () => {
  n++;
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = 'New task ' + n;
  const btn = document.createElement('button');
  btn.className = 'delete';
  btn.textContent = 'delete';
  li.append(span, ' ', btn);
  list.append(li);
});`,
    },
    widget: 'event-propagation',
    practice: { href: '#/browser/dom/practice/event-propagation', label: 'Try delegation in the propagation tool' } },

  /* ---- 5. Putting it together ------------------------------------------------------------- */
  { id: 'todo-pattern', hub: 'patterns', topic: 'patterns', 
    title: 'State → render: a small to-do pattern',
    summary: 'Keep the data in a JavaScript array (the **state**), let event handlers change only the state, and call one `render()` function that rebuilds the list from the state after every change.',
    body: [
      'The page is a **picture of your data**. Instead of editing the picture in many places (append an `<li>` here, remove one there, toggle a class somewhere else), you change the data and repaint. There is a single source of truth, so the screen can never disagree with the array, and new features (a "2 of 5 done" counter, a "clear completed" button, saving the list later) only need the state. This is exactly the idea that front-end component libraries such as React automate.',
      'The pieces: **state**, an array of objects such as `{ id: 1, text: \'Buy milk\', done: false }`; **handlers** that add (`push`), toggle (find by id, flip `done`) or remove (`filter`) and then call `render()`; and **`render()`**, which empties the list and creates one `<li>` per item with `textContent` (safe from XSS), a `done` class when needed and a `data-id` attribute that the delegated listener reads.',
    ],
    points: [
      'Clean the input: `input.value.trim()`, and ignore empty text.',
      'Accessibility: a clickable `<li>` cannot be reached with the Tab key. Put the toggle on a real `<button>` (or a checkbox) inside the item, so keyboard users can use it too.',
      'In your own page, use a `<form>` with a `submit` listener and `preventDefault()` (see that card). The sandboxed preview below cannot submit forms, so it listens to the button and to the Enter key directly.',
    ],
    code: `const todos = [];        // state
let nextId = 1;

function render() {
  list.replaceChildren();                       // start from empty
  for (const todo of todos) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    li.classList.toggle('done', todo.done);
    const text = document.createElement('button');
    text.className = 'toggle';
    text.textContent = todo.text;               // never innerHTML
    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = 'x';
    del.setAttribute('aria-label', 'Delete ' + todo.text);
    li.append(text, del);
    list.append(li);
  }
}`,
    example: 'Adding "Buy milk" pushes `{ id: 1, text: \'Buy milk\', done: false }` and renders one item; clicking it flips `done` to `true` and renders again (now crossed out); clicking `x` filters it out of the array and renders an empty list. At every moment `todos` describes exactly what is on screen.',
    mistake: 'Updating the DOM and the array separately. Remove the `<li>` but forget to remove the array item, and it reappears the next time `render()` runs. With state → render, handlers never touch the DOM directly; they change the state and call `render()`.',
    live: {
      kind: 'html',
      html: `<p>
  <input id="todo-input" placeholder="New task" aria-label="New task">
  <button id="add">Add</button>
</p>
<ul id="list"></ul>
<p id="count"></p>`,
      css: `#list { padding-left: 0; list-style: none; }
#list li { display: flex; gap: 8px; margin: 4px 0; }
.toggle { background: none; border: 0; font: inherit; cursor: pointer; text-align: left; }
.done .toggle { text-decoration: line-through; color: #777; }`,
      js: `const input = document.querySelector('#todo-input');
const list = document.querySelector('#list');
let todos = [{ id: 1, text: 'Buy milk', done: false }];
let nextId = 2;

function render() {
  list.replaceChildren();
  for (const todo of todos) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    li.classList.toggle('done', todo.done);
    const text = document.createElement('button');
    text.className = 'toggle';
    text.textContent = todo.text;
    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = 'x';
    del.setAttribute('aria-label', 'Delete ' + todo.text);
    li.append(text, del);
    list.append(li);
  }
  const done = todos.filter((t) => t.done).length;
  document.querySelector('#count').textContent = done + ' of ' + todos.length + ' done';
}

function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: nextId++, text: text, done: false });
  input.value = '';
  render();
}

document.querySelector('#add').addEventListener('click', addTodo);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });

list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const id = Number(li.dataset.id);
  if (e.target.closest('.delete')) {
    todos = todos.filter((t) => t.id !== id);
  } else if (e.target.closest('.toggle')) {
    const todo = todos.find((t) => t.id === id);
    todo.done = !todo.done;
  }
  render();
});

render();`,
    } },
];

DATA.en.DOM_QUIZ = [
  /* tree */
  { type: 'mc', topic: 'tree',
    q: 'A script adds three `<li>` elements to a list. Where can you see them?',
    choices: ['In View Source', 'In the `.html` file on disk', 'In the DevTools Elements panel', 'Nowhere until the page is saved'],
    answer: 2,
    why: 'JavaScript changes the DOM, the live in-memory tree, which the Elements panel shows. View Source and the file show the original HTML.' },
  { type: 'tf', topic: 'tree',
    q: 'Changing `textContent` of an element with JavaScript also changes the HTML file stored on the server.',
    answer: false,
    why: 'The DOM is an in-memory copy built from the file. A reload rebuilds it from the unchanged file.' },
  { type: 'mc', topic: 'tree',
    q: 'In `<ul>` followed by a line break and then `<li>`, what is `ul.firstChild`?',
    choices: ['A text node holding the line break', 'The `<li>` element', '`null`', 'The `<ul>` itself'],
    answer: 0,
    why: 'Whitespace between tags becomes a text node. `ul.firstElementChild` skips text nodes and gives the `<li>`.' },
  { type: 'mc', topic: 'tree',
    q: 'Which call finds the element `<button id="save">`?',
    choices: ['`document.getElementById(\'#save\')`', '`document.querySelector(\'save\')`', '`document.querySelectorAll(\'.save\')`', '`document.querySelector(\'#save\')`'],
    answer: 3,
    why: '`querySelector` takes a CSS selector, so an id needs `#`. `getElementById` takes the bare id (`\'save\'`); `\'save\'` alone as a selector means a `<save>` tag.' },
  { type: 'mc', topic: 'tree',
    q: 'What does `document.querySelector(\'.missing\')` return when no element has that class?',
    choices: ['An empty NodeList', '`null`', '`undefined`', 'It throws an error'],
    answer: 1,
    why: 'The single-element methods return `null` when nothing matches; the error only comes later, when you use the `null` as if it were an element.' },
  { type: 'mc', topic: 'tree',
    q: '`const items = document.querySelectorAll(\'li\');` Which call fails with a `TypeError`?',
    choices: ['`items.map((li) => li.textContent)`', '`items.length`', '`items.forEach((li) => li.remove())`', '`items[0]`'],
    answer: 0,
    why: 'A NodeList is array-like: it has `length`, indexes and `forEach`, but no `map`. Use `Array.from(items).map(…)`.' },
  { type: 'mc', topic: 'tree',
    q: '`app.js` is loaded with a plain `<script src="app.js">` in `<head>` and calls `document.querySelector(\'#list\').append(li)`. It fails with "Cannot read properties of null". What is the simplest fix?',
    choices: ['Use `getElementById` instead', 'Wrap the code in a `for` loop', 'Add `defer` to the script tag', 'Change `#list` to `.list`'],
    answer: 2,
    why: 'The script runs before the body is parsed, so `#list` does not exist yet. `defer` runs it after the HTML has been parsed.' },
  { type: 'fib', topic: 'tree',
    q: 'The event that fires on `document` as soon as the HTML has been completely parsed (without waiting for images) is ___.',
    accept: ['DOMContentLoaded', 'domcontentloaded'],
    why: '`DOMContentLoaded` fires after parsing (and after deferred scripts); `load` waits for images and stylesheets too.' },

  /* change */
  { type: 'mc', topic: 'change',
    q: 'A user types `<b>hi</b>` as their nickname. Which line displays exactly those characters, safely?',
    choices: ['`el.innerHTML = nickname`', '`el.textContent = nickname`', '`el.outerHTML = nickname`', '`el.innerHTML += nickname`'],
    answer: 1,
    why: '`textContent` inserts plain text; the `innerHTML` variants parse it as HTML, which renders bold text here and runs code in a malicious nickname.' },
  { type: 'tf', topic: 'change',
    q: 'Because `<script>` tags inserted with `innerHTML` do not run, `innerHTML` is safe for user input.',
    answer: false,
    why: 'Event-handler attributes still run: `<img src=x onerror="…">` executes its code. Untrusted text belongs in `textContent`.' },
  { type: 'fib', topic: 'change',
    q: 'The attack in which an attacker\'s markup runs as code in other users\' browsers is abbreviated ___.',
    accept: ['XSS'],
    why: 'Cross-site scripting. It is prevented by inserting untrusted data as text, not as HTML.' },
  { type: 'mc', topic: 'change',
    q: 'An element has `class="task urgent"`. Which line marks it done **and keeps** its other classes?',
    choices: ['`el.className = \'done\'`', '`el.setAttribute(\'class\', \'done\')`', '`el.style = \'done\'`', '`el.classList.add(\'done\')`'],
    answer: 3,
    why: '`classList.add` touches one class only. `className` and `setAttribute(\'class\', …)` replace the whole class string.' },
  { type: 'mc', topic: 'change',
    q: 'What does `el.classList.toggle(\'open\')` return when `el` did **not** have the class before?',
    choices: ['`undefined`', '`false`', '`true`', 'The element'],
    answer: 2,
    why: '`toggle` returns the new state: the class was added, so it returns `true`.' },
  { type: 'mc', topic: 'change',
    q: 'Given `<li data-price="12">`, what is `li.dataset.price + 1`?',
    choices: ['`\'121\'`', '`13`', '`NaN`', '`undefined`'],
    answer: 0,
    why: 'Attribute values are always strings, so `+` concatenates. Convert first: `Number(li.dataset.price) + 1`.' },
  { type: 'mc', topic: 'change',
    q: 'The HTML says `<input id="q" value="hello">` and the user has typed `world` into it. What is `q.value`?',
    choices: ['`\'hello\'`', '`null`', '`\'helloworld\'`', '`\'world\'`'],
    answer: 3,
    why: 'The `value` property is the live content of the field. `q.getAttribute(\'value\')` still returns the HTML default `\'hello\'`.' },
  { type: 'tf', topic: 'change',
    q: 'After `const p = document.createElement(\'p\'); p.textContent = \'Hi\';` the paragraph is already visible on the page.',
    answer: false,
    why: 'A created element is detached until you attach it to a parent in the page, e.g. `document.body.append(p)`.' },
  { type: 'mc', topic: 'change',
    q: 'You call `listB.append(item)` where `item` is currently inside `listA`. What happens?',
    choices: ['`item` is copied into `listB` and stays in `listA`', '`item` moves from `listA` to `listB`', 'A `TypeError`', 'Nothing'],
    answer: 1,
    why: 'A node can only be in one place in the tree, so appending an attached node moves it.' },

  /* events */
  { type: 'mc', topic: 'events',
    q: 'Which line registers `save` to run on every click of `btn`?',
    choices: ['`btn.addEventListener(\'click\', save)`', '`btn.addEventListener(\'click\', save())`', '`btn.addEventListener(click, save)`', '`btn.click(save)`'],
    answer: 0,
    why: 'Pass the function value. `save()` calls it immediately and registers its return value; `click` without quotes is an undefined variable.' },
  { type: 'mc', topic: 'events',
    q: 'Which event fires on a text `<input>` on **every** keystroke that changes its value?',
    choices: ['`change`', '`submit`', '`input`', '`load`'],
    answer: 2,
    why: '`input` fires for each change; `change` waits until the user commits the value (for example by leaving the field).' },
  { type: 'mc', topic: 'events',
    q: 'A listener is on a `<ul>`. The user clicks the `<strong>` inside one of its `<li>`s. What are `e.target` and `e.currentTarget`?',
    choices: ['both the `<ul>`', 'target `<strong>`, currentTarget `<ul>`', 'target `<li>`, currentTarget `<ul>`', 'target `<ul>`, currentTarget `<strong>`'],
    answer: 1,
    why: '`target` is the innermost element where the click happened; `currentTarget` is the element whose listener is running.' },
  { type: 'mc', topic: 'events',
    q: 'What does `e.target.closest(\'li\')` return when the click was on the `<ul>`\'s own padding, outside any item?',
    choices: ['The first `<li>`', 'The `<ul>`', 'An empty NodeList', '`null`'],
    answer: 3,
    why: '`closest` checks the element itself and its ancestors; the `<ul>` and above are not `<li>`s, so it returns `null`. Always handle that case.' },
  { type: 'mc', topic: 'events',
    q: 'A to-do form adds an item and the item disappears a split second later. What is missing?',
    choices: ['`e.stopPropagation()` in the submit handler', 'A `defer` attribute', '`e.preventDefault()` in the submit handler', '`type="button"` on the input'],
    answer: 2,
    why: 'Without `preventDefault()` the form is really submitted and the page reloads, wiping what JavaScript added.' },
  { type: 'tf', topic: 'events',
    q: 'Listening to `submit` on the form (rather than `click` on its button) also handles the user pressing Enter in the text field.',
    answer: true,
    why: 'Pressing Enter in a text field triggers implicit submission, which fires `submit` on the form, so one listener covers both the button and the Enter key.' },

  /* flow */
  { type: 'mc', topic: 'flow',
    q: 'A button sits inside a `<section>` inside a `<div>`, each with a plain `addEventListener(\'click\', …)`. In which order do the handlers run when the button is clicked?',
    choices: ['button, section, div', 'div, section, button', 'Only the button\'s', 'In a random order'],
    answer: 0,
    why: 'Plain listeners run in the bubble phase: from the target outwards to its ancestors.' },
  { type: 'mc', topic: 'flow',
    q: 'How do you make a listener on an ancestor run **before** the target\'s own listener?',
    choices: ['Call `e.preventDefault()`', 'Use `onclick` instead', 'Add it first in the file', 'Add it with `{ capture: true }`'],
    answer: 3,
    why: 'Capture listeners run on the way down from the root to the target, before the target and bubble phases.' },
  { type: 'mc', topic: 'flow',
    q: 'Inside a link\'s click handler you call only `e.stopPropagation()`. What happens?',
    choices: ['The page does not navigate and ancestors are not notified', 'The page still navigates, but ancestors\' click listeners do not run', 'The page does not navigate, but ancestors are notified', 'Nothing changes'],
    answer: 1,
    why: '`stopPropagation` stops the travel through the tree; cancelling the default action (navigation) is `preventDefault`\'s job.' },
  { type: 'mc', topic: 'flow',
    q: 'At load, `document.querySelectorAll(\'#list li\').forEach((li) => li.addEventListener(\'click\', toggle));` runs. Later the user adds a new item. What happens when they click it?',
    choices: ['Nothing: the new `<li>` never got a listener', 'It toggles like the others', 'A `TypeError`', 'All items toggle'],
    answer: 0,
    why: 'The loop only ran over the items that existed at that moment. One delegated listener on `#list` would cover future items too.' },
  { type: 'tf', topic: 'flow',
    q: 'Event delegation works because most events bubble from the element where they happened up to its ancestors.',
    answer: true,
    why: 'The ancestor\'s single listener receives every bubbling event from inside it and uses `e.target` to see where it started.' },
  { type: 'fib', topic: 'flow',
    q: 'Inside a delegated handler on a list, `e.target.___(\'li\')` finds the list item that contains whatever was clicked.',
    accept: ['closest'],
    why: '`closest` walks up from the target (itself included) and returns the first ancestor matching the selector, or `null`.' },

  /* patterns */
  { type: 'mc', topic: 'patterns',
    q: 'In the state → render pattern, what should a "delete" click handler do?',
    choices: ['Remove the `<li>` and leave the array alone', 'Reload the page', 'Remove the item from the state array and call `render()`', 'Set the `<li>`\'s `innerHTML` to `\'\'`'],
    answer: 2,
    why: 'Handlers change only the state; `render()` rebuilds the DOM from it, so the screen and the data can never disagree.' },
  { type: 'mc', topic: 'patterns',
    q: 'Why does `render()` create each item\'s text with `textContent` rather than building an HTML string for `innerHTML`?',
    choices: ['`textContent` is required by `render`', 'The to-do text comes from the user, and `textContent` cannot inject markup or code', '`innerHTML` cannot create `<li>` elements', 'It is shorter to write'],
    answer: 1,
    why: 'User-typed text inserted as HTML is an XSS hole; as text it is always displayed literally.' },
  { type: 'tf', topic: 'patterns',
    q: 'Making each `<li>` clickable is enough for keyboard users to toggle tasks.',
    answer: false,
    why: 'A plain `<li>` is not focusable with Tab. A real `<button>` (or checkbox) inside the item is reachable and activates with Enter or Space.' },
];
