'use strict';
/* DOM and events: concept cards, rail groups and self-check quiz. Cards explain with `html`
   blocks and `diagram` specs (js/concept-section.js, js/diagram.js). `live` boxes use buttons
   and key events rather than form submission to stay small; the form version of each pattern is
   shown as static `code`. */

DATA.en.DOM_QUIZ_TOPICS = {
  tree: 'The DOM tree and selecting',
  events: 'Events',
  change: 'Changing the page',
  flow: 'Propagation and delegation',
  patterns: 'Building a small app',
};

DATA.en.DOM_GROUPS = [
  { key: 'tree', label: 'The DOM tree', icon: 'index' },
  { key: 'events', label: 'Events', icon: 'lifecycle' },
  { key: 'change', label: 'Changing the page', icon: 'code' },
  { key: 'flow', label: 'Propagation and delegation', icon: 'arrow' },
  { key: 'patterns', label: 'Putting it together', icon: 'steps' },
];

DATA.en.DOM_CONCEPTS = [
  /* ---- 1. The DOM tree ----------------------------------------------------------------------- */
  { id: 'what-is-dom', hub: 'tree', topic: 'tree',
    title: 'What the DOM is',
    summary: 'The **DOM** (Document Object Model) is the browser\'s live, in-memory tree of objects built from your HTML; JavaScript reads and changes the page through it.',
    html: [
      '<p>The browser reads your HTML once and builds a tree of <strong>nodes</strong> from it. From then on it draws the DOM, not the file: change the DOM and the screen updates at once, while the file on disk never changes, so a reload brings back the original.</p>',
      '<dl><dt>Element nodes</dt><dd>Come from tags: <code>&lt;li&gt;</code> becomes an element node.</dd>'
        + '<dt>Text nodes</dt><dd>Hold the text inside elements, including the spaces and line breaks between tags.</dd>'
        + '<dt><code>document</code></dt><dd>The entry point to the tree: <code>document.body</code> is the <code>&lt;body&gt;</code> element.</dd>'
        + '</dl>',
      '<table><caption>Moving around the tree</caption><thead><tr><th scope="col">Property</th><th scope="col">Gives</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row"><code>el.parentElement</code></th><td>The parent element</td></tr>'
        + '<tr><th scope="row"><code>el.children</code></th><td>The child <strong>elements</strong> only</td></tr>'
        + '<tr><th scope="row"><code>el.firstElementChild</code>, <code>el.nextElementSibling</code></th><td>The first child element; the next sibling element</td></tr>'
        + '<tr><th scope="row"><code>el.firstChild</code>, <code>el.childNodes</code></th><td>Text nodes too: often a whitespace text node</td></tr>'
        + '</tbody></table>',
      '<p>The DOM is not a copy of your source: the parser <strong>repairs</strong> the markup, closing unclosed <code>&lt;p&gt;</code> tags and adding a <code>&lt;tbody&gt;</code> to every table. <strong>View Source</strong> shows the file as downloaded; the DevTools <strong>Elements</strong> panel shows the current DOM, including everything JavaScript added.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'The screen shows the DOM, not the file; JavaScript edits the DOM.',
      desc: 'The index.html file on disk is read by the parser, which repairs the markup and builds the DOM, a live tree of objects. The screen is drawn from the DOM, so changes JavaScript makes to the DOM appear at once, while the file never changes.',
      nodes: [
        { id: 'file', label: '`index.html`', note: 'the file on disk' },
        { id: 'parser', label: 'The parser', note: 'repairs the markup' },
        { id: 'dom', label: 'The DOM', note: 'live tree of objects', key: true },
        { id: 'screen', label: 'The screen', note: 'drawn from the DOM' },
      ],
      edges: [['file', 'parser'], ['parser', 'dom'], ['dom', 'screen']],
    },
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
    html: [
      '<p>Selecting is a search over the tree, written in the selector language you already know from <a href="#/browser/css/basic-selectors">CSS selectors</a>. Both kinds of call return something even when nothing matches.</p>',
      '<table><caption>The three selection methods</caption><thead><tr><th scope="col">Call</th><th scope="col">Argument</th><th scope="col">Returns</th><th scope="col">No match</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row"><code>document.getElementById(\'save\')</code></th><td>An id, <strong>without</strong> <code>#</code></td><td>One element</td><td><code>null</code></td></tr>'
        + '<tr><th scope="row"><code>document.querySelector(\'#save\')</code></th><td>Any CSS selector</td><td>The first matching element</td><td><code>null</code></td></tr>'
        + '<tr><th scope="row"><code>document.querySelectorAll(\'.item\')</code></th><td>Any CSS selector</td><td>A static NodeList</td><td>An empty NodeList (<code>length</code> 0)</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>A NodeList is array-like:</strong> it has <code>length</code>, <code>list[0]</code>, <code>forEach</code> and works with <code>for...of</code>, but has no <code>map</code> or <code>filter</code>. Convert it with <code>Array.from(nodes)</code> or <code>[...nodes]</code>.</li>'
        + '<li><strong>A snapshot:</strong> elements added to the page later are not in it.</li>'
        + '<li><strong>Search inside an element:</strong> <code>menu.querySelector(\'a\')</code> looks only among the descendants of <code>menu</code>.</li>'
        + '</ul>',
    ],
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
    html: [
      '<p>The browser reads HTML <strong>top to bottom</strong> and builds the tree as it goes. A plain <code>&lt;script&gt;</code> stops the reading and runs at once, so a plain script in <code>&lt;head&gt;</code> runs before any <code>&lt;body&gt;</code> element exists: every <code>querySelector</code> returns <code>null</code>.</p>',
      '<table><caption>Where the script tag goes and what it can see</caption><thead><tr><th scope="col">Script tag</th><th scope="col">Runs</th><th scope="col">Finds <code>&lt;body&gt;</code> elements?</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row"><code>&lt;script src="app.js"&gt;</code> in <code>&lt;head&gt;</code></th><td>At once, blocking the parsing</td><td>No</td></tr>'
        + '<tr><th scope="row"><code>&lt;script src="app.js" defer&gt;</code> in <code>&lt;head&gt;</code></th><td>After parsing, in order</td><td>Yes (recommended)</td></tr>'
        + '<tr><th scope="row"><code>&lt;script src="app.js"&gt;</code> just before <code>&lt;/body&gt;</code></th><td>When the parser reaches it, almost at the end</td><td>Yes, the elements above it</td></tr>'
        + '<tr><th scope="row"><code>&lt;script src="app.js" async&gt;</code></th><td>As soon as it is downloaded</td><td>Not reliably</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong><code>defer</code> is the default to reach for:</strong> the script downloads in parallel and runs after the HTML is parsed, in the order the scripts appear. Scripts with <code>type="module"</code> are deferred automatically.</li>'
        + '<li><strong><code>DOMContentLoaded</code></strong> is an event that fires on <code>document</code> when the HTML has been parsed (it does not wait for images; <code>load</code> on <code>window</code> does). Listening for it (see <a href="#/browser/dom/add-event-listener">Events and addEventListener</a>) is the older way to the same guarantee.</li>'
        + '<li><strong><code>async</code></strong> scripts run as soon as they arrive, in any order: fine for independent scripts such as analytics, wrong for code that needs the page.</li>'
        + '</ul>',
    ],
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
    example: 'In the Try it box, the first inline script runs before the paragraph exists and finds nothing; the second, placed after it, finds it; the `DOMContentLoaded` listener runs last, once everything has been parsed.',
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

  /* ---- 2. Events ----------------------------------------------------------------------------- */
  { id: 'add-event-listener', hub: 'events', topic: 'events',
    title: 'Events and addEventListener',
    summary: 'An **event** is the browser\'s signal that something happened (a click, a key, a form submission); `el.addEventListener(type, handler)` registers a function the browser calls every time that event happens on that element.',
    html: [
      '<p>You do not call a handler; <strong>the browser does</strong>. Your script runs once when the page loads, registers its listeners and ends; after that, code runs only in reaction to events. This <strong>event-driven</strong> model is why handlers are passed as function values (see <a href="#/browser/js/function-scope">functions as values</a>).</p>',
      '<table><caption>Events you will use most</caption><thead><tr><th scope="col">Event</th><th scope="col">Fires when</th><th scope="col">Typical target</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row"><code>click</code></th><td>The element is clicked, or activated with Enter or Space on a button</td><td>Buttons, links, list items</td></tr>'
        + '<tr><th scope="row"><code>input</code></th><td>The value of a field changes, on every keystroke</td><td><code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code></td></tr>'
        + '<tr><th scope="row"><code>change</code></th><td>The user commits a change: leaves the field, ticks a box, picks an option</td><td>Checkboxes, <code>&lt;select&gt;</code></td></tr>'
        + '<tr><th scope="row"><code>submit</code></th><td>A form is submitted: a button click <strong>or</strong> Enter in a text field</td><td><code>&lt;form&gt;</code></td></tr>'
        + '<tr><th scope="row"><code>keydown</code></th><td>A key is pressed; <code>e.key</code> says which (<code>\'Enter\'</code>, <code>\'Escape\'</code>, <code>\'a\'</code>)</td><td>Fields, <code>document</code></td></tr>'
        + '<tr><th scope="row"><code>DOMContentLoaded</code></th><td>The HTML has been fully parsed</td><td><code>document</code></td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Pass the function, do not call it:</strong> <code>addEventListener(\'click\', save)</code>, or an arrow such as <code>() =&gt; save(42)</code>.</li>'
        + '<li><strong>Many listeners</strong> for the same event run in the order they were added.</li>'
        + '<li><strong><code>removeEventListener</code></strong> needs the very same function reference, so only named functions can be removed.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Your script registers and ends; the browser calls your handler on every click.',
      desc: 'Your script runs once at load and registers a listener with addEventListener. The browser then waits for events. Each time the user clicks, the browser calls your handler.',
      nodes: [
        { id: 'script', label: 'Your script', note: 'runs once at load' },
        { id: 'browser', label: 'The browser', note: 'waits for events' },
        { id: 'handler', label: 'Your handler', note: 'runs on every click', key: true },
      ],
      edges: [['script', 'browser', '`addEventListener`'], ['browser', 'handler', 'user clicks']],
    },
    example: 'A live character counter: `bio.addEventListener(\'input\', () => { counter.textContent = bio.value.length + \' / 160\'; });`. The handler runs on every keystroke and always reads the current value.',
    mistake: 'Writing `btn.addEventListener(\'click\', handleClick());` with parentheses. `handleClick` runs once, immediately, and its return value (usually `undefined`) is registered as the "handler", so clicks then do nothing. The older `onclick="…"` HTML attribute is best avoided too: it mixes JavaScript into the markup and allows only one handler.',
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
    summary: 'Every handler receives an **event object** describing what happened: `e.type`, `e.target` (where the event started), `e.currentTarget` (whose listener is running), `e.key` for keys, and methods such as `preventDefault()`.',
    html: [
      '<p>The event object is the browser\'s report of what happened. You do not create it: declare the handler\'s first parameter, usually called <code>e</code> or <code>event</code>, to receive it.</p>',
      '<dl><dt><code>e.target</code></dt><dd>The innermost element where the event started: the thing actually clicked.</dd>'
        + '<dt><code>e.currentTarget</code></dt><dd>The element the listener was added to.</dd>'
        + '<dt><code>e.type</code>, <code>e.key</code></dt><dd>Which event (<code>\'click\'</code>), and for key events which key (<code>\'Enter\'</code>).</dd>'
        + '<dt><code>e.target.value</code></dt><dd>For <code>input</code> events, the field\'s current text.</dd>'
        + '<dt><code>e.preventDefault()</code></dt><dd>Cancels the browser\'s own reaction (see <a href="#/browser/dom/prevent-default">preventDefault</a>).</dd>'
        + '</dl>',
      '<p><code>target</code> and <code>currentTarget</code> differ whenever the element has children: with a listener on a <code>&lt;ul&gt;</code> and a click on an <code>&lt;li&gt;</code>, <code>target</code> is the <code>&lt;li&gt;</code> and <code>currentTarget</code> the <code>&lt;ul&gt;</code>. <a href="#/browser/dom/event-delegation">Event delegation</a> relies on exactly that.</p>',
      '<ul><li><strong><code>e.target.closest(selector)</code></strong> climbs from the target through its ancestors (itself included) and returns the first match, or <code>null</code>: the safe way to ask "which item was this click inside?".</li>'
        + '<li><strong>Arrow functions:</strong> inside an arrow handler, <code>this</code> is not the element; use <code>e.currentTarget</code>. (In a regular <code>function</code> handler, <code>this</code> is <code>e.currentTarget</code>.)</li>'
        + '</ul>',
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
    html: [
      '<p>The browser\'s own reaction runs <strong>after</strong> your listeners unless you veto it. For a form, the default is to send the data to the <code>action</code> URL (or the same page): a full page load that wipes everything your JavaScript added, so a new to-do item flashes and disappears.</p>',
      '<ul><li><strong>Listen for <code>submit</code> on the <code>&lt;form&gt;</code></strong>, not for <code>click</code> on its button: <code>submit</code> fires for a button click <strong>and</strong> for Enter in a text field, and only after HTML validation such as <code>required</code> has passed.</li>'
        + '<li><strong>Buttons in a form submit</strong> by default (<code>type="submit"</code>); give other buttons <code>type="button"</code>.</li>'
        + '<li><strong>Only the default is cancelled:</strong> the event still bubbles to the ancestors. Stopping that is <a href="#/browser/dom/stop-propagation">stopPropagation</a>, a different tool.</li>'
        + '</ul>',
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
    example: 'The classic to-do form handler: `form.addEventListener("submit", (e) => { e.preventDefault(); … })`. Remove the `preventDefault()` line and the page reloads on every submit, so the `<li>` you just appended is gone. (The Try it box shows the same idea on a link and a checkbox.)',
    mistake: 'Attaching a `click` listener to the submit button and forgetting `preventDefault()`: the item is added, the form submits, the page reloads, and the item vanishes. The button\'s `click` also fires before HTML validation, whereas `submit` waits for it.',
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

  /* ---- 3. Changing the page ------------------------------------------------------------------ */
  { id: 'create-remove', hub: 'change', topic: 'change',
    title: 'Creating, adding and removing elements',
    summary: '`document.createElement(tag)` makes a new element that is not on the page yet; `append` attaches it to a parent so it appears, and `el.remove()` takes it out again.',
    html: [
      '<p><code>createElement</code> builds an element in memory: it exists but is invisible until you attach it to a parent that is already in the page.</p>',
      '<table><caption>Adding and removing</caption><thead><tr><th scope="col">Call</th><th scope="col">Does</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row"><code>parent.append(a, b, \'text\')</code></th><td>Adds one or more nodes or strings at the end</td></tr>'
        + '<tr><th scope="row"><code>parent.appendChild(node)</code></th><td>Adds one node at the end: the classic form most tutorials use</td></tr>'
        + '<tr><th scope="row"><code>parent.prepend(x)</code>, <code>el.before(x)</code>, <code>el.after(x)</code></th><td>Adds at the start, or next to an element</td></tr>'
        + '<tr><th scope="row"><code>el.remove()</code></th><td>Takes the element out (older equivalent: <code>parent.removeChild(el)</code>)</td></tr>'
        + '<tr><th scope="row"><code>list.replaceChildren()</code></th><td>Empties the element in one go</td></tr>'
        + '</tbody></table>',
      '<p><strong>A node lives in one place:</strong> appending an element that is already in the page <strong>moves</strong> it.</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Create, fill, attach: nothing shows until the element is attached.',
      desc: 'Step 1: createElement makes the element in memory, invisible. Step 2: fill it with textContent, classes and attributes. Step 3: append attaches it to a parent that is in the page. Step 4: it is visible.',
      nodes: [
        { id: 'create', label: '`createElement`', note: 'in memory, invisible' },
        { id: 'fill', label: 'Fill it', note: '`textContent`, classes' },
        { id: 'attach', label: '`append`', note: 'into the page', key: true },
        { id: 'visible', label: 'Visible' },
      ],
      edges: [['create', 'fill'], ['fill', 'attach'], ['attach', 'visible']],
    },
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

  { id: 'text-vs-html', hub: 'change', topic: 'change',
    title: 'textContent vs innerHTML, and the XSS risk',
    summary: '`textContent` reads or writes plain text; `innerHTML` reads or writes HTML that the browser parses into elements, so putting untrusted text into `innerHTML` can run an attacker\'s code (XSS).',
    html: [
      '<p><code>textContent</code> shows a string literally, so <code>&lt;b&gt;</code> appears as those characters. <code>innerHTML</code> parses the string as HTML and creates real elements: exactly the danger when the string contains something you did not write.</p>',
      '<p><strong>XSS</strong> (cross-site scripting) is an attack in which someone gets their markup to run as code in other users\' browsers, through a comment, a user name or a to-do text. A <code>&lt;script&gt;</code> inserted with <code>innerHTML</code> does not run, but an attribute such as <code>onerror</code> on an <code>&lt;img&gt;</code> does.</p>',
      '<ul><li><strong>Data from users or APIs goes into <code>textContent</code></strong>, or into elements built with <a href="#/browser/dom/create-remove"><code>createElement</code></a>.</li>'
        + '<li><strong><code>innerHTML</code> only for fixed markup you wrote yourself.</strong> <code>el.innerHTML = \'\'</code> (or <code>el.replaceChildren()</code>) is fine to empty an element.</li>'
        + '<li><strong><code>innerHTML +=</code> rebuilds every child:</strong> the listeners on them are lost and typed input is reset.</li>'
        + '<li><strong><code>innerText</code></strong> depends on CSS (it skips hidden text) and is slower; prefer <code>textContent</code>.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The same string: shown as text, or turned into elements that can run code.',
      desc: 'A string a user typed, such as an img tag with an onerror attribute, goes either into textContent, which shows it as plain text, or into innerHTML, which parses it into elements so its onerror code runs.',
      nodes: [
        { id: 'input', label: 'A user\'s text', note: '`<img onerror=…>`' },
        { id: 'text', label: '`textContent`', note: 'shown as plain text', key: true },
        { id: 'html', label: '`innerHTML`', note: 'parsed: its code runs' },
      ],
      edges: [['input', 'text'], ['input', 'html']],
    },
    example: 'A comment box. A visitor posts `<img src=x onerror="stealCookies()">`. With `comment.innerHTML = text` every reader of the page runs `stealCookies()`; with `comment.textContent = text` readers just see that odd text. In the Try it box the "attack" only logs a message, but it proves the code ran.',
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
    html: [
      '<dl><dt>Attribute</dt><dd>What is written in the HTML: the starting configuration. Read and write it with <code>getAttribute</code>, <code>setAttribute</code>, <code>removeAttribute</code> and <code>hasAttribute</code>; they work for any attribute, ARIA ones included (see <a href="#/browser/dom/aria-focus">ARIA and keyboard focus</a>).</dd>'
        + '<dt>Property</dt><dd>The live state of the element object now: <code>el.id</code>, <code>img.src</code>, <code>input.value</code>, and boolean ones such as <code>btn.disabled = true</code> and <code>checkbox.checked</code>.</dd>'
        + '<dt><code>data-*</code> attribute</dt><dd>Your own data: <code>&lt;li data-task-id="7"&gt;</code> is read as <code>li.dataset.taskId</code> (the name turns into camelCase).</dd>'
        + '</dl>',
      '<p>For most attributes the two views mirror each other. Form fields differ: <code>input.value</code> is what the user has typed <strong>now</strong>, while <code>input.getAttribute(\'value\')</code> stays the default written in the HTML. Every attribute value, and every <code>input.value</code>, is a <strong>string</strong>: convert with <code>Number()</code> when you need a number.</p>',
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

  { id: 'aria-focus', hub: 'change', topic: 'change',
    title: 'ARIA attributes and keyboard focus',
    summary: '**ARIA** (Accessible Rich Internet Applications) attributes tell assistive technology what an element is and what state it is in; **keyboard focus** decides which element receives the keys. When JavaScript changes the page, it must keep both right.',
    html: [
      '<p>A <strong>screen reader</strong> reads the page aloud from the DOM, and a keyboard user can only reach elements that take focus. A sighted mouse user sees a menu open; the others only learn it if the DOM says so. So a script that changes the page also updates what is announced and where the focus is.</p>',
      '<dl><dt><code>aria-label</code></dt><dd>A name for an element with no visible text: an icon button <code>&lt;button aria-label="Delete Buy milk"&gt;x&lt;/button&gt;</code>.</dd>'
        + '<dt><code>aria-expanded</code></dt><dd><code>"true"</code> or <code>"false"</code> on the button that opens a menu or panel. Update it in the same handler that opens it.</dd>'
        + '<dt><code>aria-live="polite"</code></dt><dd>A region whose text changes are read out: "Task added".</dd>'
        + '<dt><code>aria-hidden="true"</code></dt><dd>Hides decorative content from assistive technology. Never on something focusable.</dd>'
        + '</dl>',
      '<h3>Keyboard focus</h3>',
      '<ul><li><strong>Tab order follows the DOM order.</strong> Only interactive elements (links, buttons, form fields) take focus.</li>'
        + '<li><strong><code>el.focus()</code></strong> moves the focus: after adding an item, back to the input; after deleting one, to a sensible neighbour. <code>document.activeElement</code> is the element that has it.</li>'
        + '<li><strong><code>tabindex="0"</code></strong> makes another element focusable (prefer a real <code>&lt;button&gt;</code>); <code>tabindex="-1"</code> makes it focusable by script only.</li>'
        + '<li><strong>Show the focus:</strong> never remove the outline; style it with <a href="#/browser/css/pseudo-classes"><code>:focus-visible</code></a>.</li>'
        + '</ul>',
    ],
    example: 'A disclosure button: `btn.setAttribute(\'aria-expanded\', String(!open)); panel.hidden = open;` keeps the announced state in step with what is shown. In the Try it box, Tab to the buttons and press Enter: the console logs the new `aria-expanded` value, and after "Add" the focus is back on the input.',
    mistake: 'Making a clickable `<div>` with a `click` listener. It cannot be reached with Tab, ignores Enter and Space, and a screen reader does not announce it as a button. Adding `role="button"` does not fix it: ARIA describes an element but adds no behaviour. Use a `<button>`, which is focusable and works with Enter and Space for free.',
    live: {
      kind: 'html',
      html: `<button id="toggle" aria-expanded="false" aria-controls="panel">Show details</button>
<div id="panel" hidden>Due Friday. Assigned to Ana.</div>
<p>
  <input id="task" aria-label="New task" placeholder="New task">
  <button id="add">Add</button>
</p>
<p id="status" aria-live="polite"></p>`,
      js: `const toggle = document.querySelector('#toggle');
const panel = document.querySelector('#panel');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  panel.hidden = open;
  console.log('aria-expanded:', toggle.getAttribute('aria-expanded'));
});

const input = document.querySelector('#task');
document.querySelector('#add').addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  document.querySelector('#status').textContent = 'Task added: ' + text;
  input.value = '';
  input.focus();
  console.log('focus is on:', document.activeElement.id);
});`,
    } },

  { id: 'class-list', hub: 'change', topic: 'change',
    title: 'classList: styling through classes',
    summary: '`el.classList` adds, removes, toggles and tests CSS classes, so JavaScript decides **which state** an element is in and CSS decides **how** each state looks.',
    html: [
      '<p>JavaScript flips <strong>switches</strong> (classes such as <code>done</code>, <code>open</code>, <code>error</code>); the stylesheet defines what each switch looks like (<code>.done { text-decoration: line-through; }</code>). The look stays in the CSS, and the class name documents the state.</p>',
      '<dl><dt><code>add(\'a\')</code>, <code>remove(\'a\')</code></dt><dd>Turn one class on or off, leaving the others.</dd>'
        + '<dt><code>toggle(\'a\')</code></dt><dd>Adds it if missing, removes it if present, and returns the new state.</dd>'
        + '<dt><code>toggle(\'a\', condition)</code></dt><dd>Forces it on when the condition is true, off when it is false.</dd>'
        + '<dt><code>contains(\'a\')</code>, <code>replace(\'a\', \'b\')</code></dt><dd>Tests for a class; swaps one for another.</dd>'
        + '</dl>',
      '<p><code>el.style.color = \'red\'</code> writes an <strong>inline style</strong>: it beats almost every stylesheet rule, is hard to undo and scatters the look across the JavaScript. Keep <code>el.style</code> for values computed at run time (a width in pixels, a position); its names are camelCase: <code>el.style.backgroundColor</code>.</p>',
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

  /* ---- 4. Propagation and delegation --------------------------------------------------------- */
  { id: 'propagation', hub: 'flow', topic: 'flow',
    title: 'Event propagation: capture, target and bubble',
    summary: 'An event does not stay on the clicked element: it travels from the top of the tree down to the target (**capture**), reaches the target, then climbs back up through every ancestor (**bubble**), running their listeners on the way.',
    html: [
      '<p>A click on a button inside a section inside a page is also a click on the section and on the page. The browser walks the path from <code>window</code> down to the target, then back up again, and every element on that path can react.</p>',
      '<ul><li><strong>Plain <code>addEventListener(type, fn)</code> listens while the event bubbles:</strong> the innermost handler runs first, then each ancestor\'s, from the inside out.</li>'
        + '<li><strong><code>{ capture: true }</code> listens on the way down:</strong> an ancestor\'s capture listener runs before anything at the target.</li>'
        + '<li><strong><code>e.eventPhase</code></strong> says where the event is: 1 capture, 2 at the target, 3 bubble.</li>'
        + '<li><strong>Most events bubble</strong> (<code>click</code>, <code>input</code>, <code>submit</code>, <code>keydown</code>). <code>focus</code> and <code>blur</code> do not (<code>focusin</code> and <code>focusout</code> do), nor do <code>mouseenter</code> and <code>mouseleave</code>.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'One click visits every ancestor twice: on the way down and on the way up.',
      desc: 'Step 1, capture: the event travels from window down through the ancestors to the target. Step 2, target: it reaches the clicked element. Step 3, bubble: it climbs back up through every ancestor to window. Plain listeners run during the bubble phase.',
      nodes: [
        { id: 'capture', label: 'Capture', note: '`window` down to the parent' },
        { id: 'target', label: 'Target', note: 'the clicked element', key: true },
        { id: 'bubble', label: 'Bubble', note: 'parent up to `window`' },
      ],
      edges: [['capture', 'target'], ['target', 'bubble']],
    },
    example: 'Click the button in the Try it box: the log shows `capture` on `#outer` first, then the button\'s own listener, then `bubble` on `#middle` and on `#outer`. Click the section padding instead and the button is not on the path at all.',
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
    html: [
      '<p>It solves the "delete button inside a clickable item" double reaction, but it is a blunt tool: <strong>every</strong> listener higher up stops receiving that event, including ones you did not write or have forgotten (analytics, a "click outside closes the menu" handler on <code>document</code>, a delegated listener on the list).</p>',
      '<p>The cleaner fix is often in the <strong>ancestor\'s</strong> handler: check what was clicked and ignore clicks that belong to a child control, for example <code>if (e.target.closest(\'.delete\')) return;</code>. With <a href="#/browser/dom/event-delegation">event delegation</a> this check is natural, and nothing needs stopping.</p>',
      '<table><caption>Two methods for two different jobs</caption><thead><tr><th scope="col">Method</th><th scope="col">Ancestors\' listeners still run?</th><th scope="col">Browser default (submit, navigate, tick) still happens?</th></tr>'
        + '</thead><tbody>'
        + '<tr><th scope="row">Neither</th><td>Yes</td><td>Yes</td></tr>'
        + '<tr><th scope="row"><code>e.preventDefault()</code></th><td>Yes</td><td>No</td></tr>'
        + '<tr><th scope="row"><code>e.stopPropagation()</code></th><td>No</td><td>Yes</td></tr>'
        + '<tr><th scope="row">Both</th><td>No</td><td>No</td></tr>'
        + '</tbody></table>',
    ],
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
    summary: '**Event delegation** means attaching **one** listener to a common ancestor (such as the `<ul>`) and using `e.target.closest(…)` to find which child was hit, instead of one listener per child; it also covers children added later.',
    html: [
      '<p>Because clicks <a href="#/browser/dom/propagation">bubble</a>, every click inside the list reaches the <code>&lt;ul&gt;</code>, and the event object says where it started. One listener on the list can ask "which item?" and "was it the delete button?", and act accordingly.</p>',
      '<p>A to-do list needs this: its items are <strong>created while the page runs</strong>. Code like <code>document.querySelectorAll(\'li\').forEach((li) =&gt; li.addEventListener(…))</code> runs once at load and covers only the items that existed then. A listener on the <code>&lt;ul&gt;</code>, which exists from the start, handles current <strong>and future</strong> items.</p>',
      '<ol><li>Listen on a stable ancestor that is in the HTML from the start.</li>'
        + '<li>Find the relevant element with <code>e.target.closest(selector)</code>.</li>'
        + '<li>If it is <code>null</code>, the click was on nothing you care about: <code>return</code>.</li>'
        + '<li>Read identifying data from <code>data-*</code> attributes.</li>'
        + '</ol>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One listener on the list decides what each click means, for current and future items.',
      desc: 'Every click inside the list bubbles to one listener on the ul. If the click was inside a .delete button, the item is removed. Otherwise, if it was inside an li, the item is toggled. If it was inside neither, the handler returns.',
      nodes: [
        { id: 'ul', label: '`<ul>` listener', note: 'every click bubbles here', key: true },
        { id: 'del', label: 'Inside `.delete`?', note: 'remove the item' },
        { id: 'li', label: 'Inside an `li`?', note: 'toggle it' },
        { id: 'none', label: 'Neither', note: '`return`' },
      ],
      edges: [['ul', 'del'], ['ul', 'li'], ['ul', 'none']],
    },
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
    example: 'In the Try it box, add three new items with the button, then click and delete them: they work immediately, although no listener was ever attached to them. The only listener is the one on the `<ul>`.',
    mistake: 'Using `e.target` directly instead of `closest`. If an item is `<li><span>Buy milk</span> …</li>`, a click on the text gives `e.target` = the `<span>`, so `e.target.classList.toggle(\'done\')` styles the span, and `e.target.dataset.id` is `undefined`.',
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

  /* ---- 5. Putting it together ---------------------------------------------------------------- */
  { id: 'todo-pattern', hub: 'patterns', topic: 'patterns',
    title: 'State → render: a small to-do pattern',
    summary: 'Keep the data in a JavaScript array (the **state**), let event handlers change only the state, and call one `render()` function that rebuilds the list from the state after every change.',
    html: [
      '<p>The page is a <strong>picture of your data</strong>. Instead of editing the picture in many places, change the data and repaint. With a single source of truth the screen can never disagree with the array, and new features (a "2 of 5 done" counter, a "clear completed" button) only need the state. Component libraries automate exactly this idea (see <a href="#/browser/components/declarative-ui">Declarative UI</a>).</p>',
      '<dl><dt>State</dt><dd>An array of objects such as <code>{ id: 1, text: \'Buy milk\', done: false }</code>.</dd>'
        + '<dt>Handlers</dt><dd>Add (<code>push</code>), toggle (find by id, flip <code>done</code>) or remove (<code>filter</code>), then call <code>render()</code>. They never touch the DOM.</dd>'
        + '<dt><code>render()</code></dt><dd>Empties the list and creates one <code>&lt;li&gt;</code> per item with <code>textContent</code> (safe from XSS), a <code>done</code> class when needed and a <code>data-id</code> that the delegated listener reads.</dd>'
        + '</dl>',
      '<ul><li><strong>Clean the input:</strong> <code>input.value.trim()</code>, and ignore empty text.</li>'
        + '<li><strong>Keyboard users:</strong> put the toggle on a real <code>&lt;button&gt;</code> inside the item, not on the <code>&lt;li&gt;</code> (see <a href="#/browser/dom/aria-focus">ARIA and keyboard focus</a>).</li>'
        + '<li><strong>In your own page, use a <code>&lt;form&gt;</code></strong> with a <code>submit</code> listener and <code>preventDefault()</code> (see <a href="#/browser/dom/prevent-default">preventDefault</a>). The Try it box keeps it smaller: it listens to the button and to the Enter key directly.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'Handlers change the state; render() repaints the page from it.',
      desc: 'The state, an array of objects, is drawn by render() into the page. When the user clicks, a handler changes only the state, and the loop starts again: render() repaints the page from the new state.',
      nodes: [
        { id: 'state', label: 'State', note: 'an array of objects', key: true },
        { id: 'render', label: '`render()`', note: 'rebuilds the list' },
        { id: 'page', label: 'The page', note: 'a picture of the state' },
        { id: 'handler', label: 'A handler', note: 'changes only the state' },
      ],
      edges: [['state', 'render'], ['render', 'page'], ['page', 'handler', 'user clicks'], ['handler', 'state']],
    },
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
  { type: 'mc', topic: 'change',
    q: 'A button opens a dropdown menu. Which attribute tells a screen reader whether the menu is open?',
    choices: ['`aria-label`', '`aria-expanded`', '`aria-hidden`', '`tabindex`'],
    answer: 1,
    why: '`aria-expanded="true"` or `"false"` goes on the button that opens the menu; update it in the same handler that opens or closes the menu.' },
  { type: 'tf', topic: 'change',
    q: 'Adding `role="button"` to a clickable `<div>` makes it reachable with Tab and activatable with Enter.',
    answer: false,
    why: 'ARIA only describes an element; it adds no behaviour. A real `<button>` is focusable and handles Enter and Space for free.' },
  { type: 'mc', topic: 'change',
    q: 'A user adds a task by typing in a field and clicking "Add". Where should the keyboard focus go next, so they can type the next task?',
    choices: ['Leave it on the Add button', 'Back to the text field, with `input.focus()`', 'To the `<body>`', 'To the browser\'s address bar'],
    answer: 1,
    why: 'Moving the focus back to the field with `input.focus()` lets keyboard users keep typing without reaching for the mouse or pressing Tab repeatedly.' },

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
