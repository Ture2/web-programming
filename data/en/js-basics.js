'use strict';
/* JavaScript: concept cards, rail groups and self-check quiz. Cards explain with `html` blocks
   and `diagram` specs (js/concept-section.js, js/diagram.js). `live` snippets run in a Web
   Worker (no DOM), so every output claimed in the text was checked with Node. */

DATA.en.JS_QUIZ_TOPICS = {
  basics: 'Running JavaScript',
  vars: 'Variables and scope',
  types: 'Types, coercion and equality',
  logic: 'Logic and control flow',
  data: 'Arrays and objects',
  functions: 'Functions',
};

DATA.en.JS_GROUPS = [
  { key: 'basics', label: 'Running JavaScript', icon: 'steps' },
  { key: 'types', label: 'Variables, types and values', icon: 'table' },
  { key: 'logic', label: 'Logic and control flow', icon: 'split' },
  { key: 'data', label: 'Arrays and objects', icon: 'cluster' },
  { key: 'functions', label: 'Functions and scope', icon: 'code' },
];

DATA.en.JS_CONCEPTS = [
  /* ---- 1. Running JavaScript --------------------------------------------------------------- */
  { id: 'what-is-js', hub: 'basics', topic: 'basics',
    title: 'What JavaScript is and where it runs',
    summary: 'JavaScript is the programming language of the web: browsers run it to make pages react to the user, and Node.js runs the same language outside the browser.',
    html: [
      '<p>JavaScript is the <strong>behaviour</strong> of a page, next to HTML for its structure and CSS for its presentation (see <a href="#/http/web/course-map">From static pages to a full-stack app</a>). A program called an <strong>engine</strong> (V8 in Chrome and Node.js, SpiderMonkey in Firefox) reads your code and runs it statement by statement, from top to bottom.</p>',
      '<p>The <strong>core language</strong> (variables, numbers, strings, <code>if</code>, loops, functions, arrays, objects) is the same everywhere. What changes is the <strong>environment</strong> around it: a browser adds <code>document</code> (the page) and <code>window</code>; Node.js has no page, but it can reach files and the network (see <a href="#/server/runtime/what-is-node">What Node.js is</a>).</p>',
      '<dl><dt>Dynamically typed</dt><dd>You never write a type: the value decides it while the program runs, and a variable can hold a number now and a string later.</dd>'
        + '<dt>Single-threaded</dt><dd>One statement runs at a time: while a long loop runs, the page cannot react to clicks (see <a href="#/server/runtime/why-async">Blocking and non-blocking</a>).</dd>'
        + '<dt>Interpreted and JIT-compiled</dt><dd>There is no separate compile step for you: the engine translates frequently used code into machine code on the fly (<strong>Just-In-Time</strong>) to make it fast.</dd>'
        + '</dl>',
      '<h3>Three ways to run it while you learn</h3>',
      '<ul><li><strong>The browser console:</strong> press F12 and open the Console tab.</li>'
        + '<li><strong>A page:</strong> a <code>&lt;script&gt;</code> tag in an HTML file.</li>'
        + '<li><strong>A terminal:</strong> <code>node file.js</code>.</li>'
        + '</ul>',
      '<p>JavaScript is <strong>not</strong> Java: the names are alike for marketing reasons only. Every statement can end with <code>;</code>; the engine inserts missing ones, but the code on this site always writes them, which avoids a few surprising edge cases.</p>',
    ],
    example: 'Type `2 + 3` in the browser console and it answers `5`; save `console.log(2 + 3);` in `sum.js` and run `node sum.js`: the terminal prints `5`. Now try `typeof document`: the browser console says `\'object\'`, Node says `\'undefined\'`. Same language, different environment. The Try it box runs in a background worker with no page, so it behaves like Node.',
    mistake: 'Assuming `document` exists everywhere. Running a page script with `node app.js` stops with `ReferenceError: document is not defined`: the code is fine, but Node has no page to give it.',
    live: { kind: 'js', code: `console.log('Hello from JavaScript');
console.log(2 + 3);
console.log(typeof 42);
console.log(typeof document); // no page here, like Node` },
    practice: { href: '#/browser/js/practice/playground', label: 'Open the JavaScript playground' } },

  { id: 'console', hub: 'basics', topic: 'basics',
    title: 'The console: console.log and console.assert',
    summary: 'The console is the developer\'s output window: `console.log` prints values, and `console.assert` prints a message only when a check fails.',
    html: [
      '<p>Users never see the console, but anything you print there lets you look inside the running program. When something "does not work", the first move is to print the values involved and compare them with what you expected.</p>',
      '<dl><dt><code>console.log(a, b, c)</code></dt><dd>Prints several values separated by spaces. Strings appear without quotes; arrays and objects are shown with their contents.</dd>'
        + '<dt><code>console.error(x)</code></dt><dd>Prints in red (and to the error stream in Node).</dd>'
        + '<dt><code>console.assert(condition, message)</code></dt><dd>A tiny automatic test: when the condition is true it prints <strong>nothing</strong>; when it is false it prints <code>Assertion failed: message</code>. A silent console means every check passed.</dd>'
        + '</dl>',
    ],
    code: `const price = 4;
const total = price * 2;
// total is 8
console.log('total is', total);

// silent: passed
console.assert(total === 8, 'double 4');
// Assertion failed: times zero
console.assert(price * 0 === 1, 'times zero');`,
    example: 'Converting 100 °C to Fahrenheit with `const f = 100 * 9 / 5 + 32;`: add `console.assert(f === 212, \'boiling\')` under it. An empty console means the check passed; if a later edit breaks the formula, `Assertion failed: boiling` tells you exactly which check to look at.',
    mistake: 'Thinking that printing a value is the same as producing it. `console.log` shows a value **to you**; it does not give the value back to the code that asked for it. A function that only logs its result returns `undefined` (see [Functions](#/browser/js/functions)).',
    live: { kind: 'js', code: `const price = 20;
const quantity = 3;
console.log('price:', price, 'quantity:', quantity);
console.log('total', price * quantity);
console.log(['a', 'b'], { item: 'pen', price: 2 });
console.error('errors print in red');` } },

  { id: 'reading-errors', hub: 'basics', topic: 'basics',
    title: 'Reading error messages',
    summary: 'An error message names the kind of problem, describes it and points to the file, line and column where JavaScript had to stop.',
    html: [
      '<p>An error is the engine reporting the <strong>first point where it could not continue</strong>. Read it in three parts: the <strong>type</strong> (<code>ReferenceError</code>), the <strong>message</strong> (<code>total is not defined</code>) and the <strong>location</strong> (<code>app.js:12:5</code>: file, line 12, column 5). The cause is often on an earlier line: the location is where the problem became visible.</p>',
      '<table><caption>The three errors you will meet most (messages as Chrome and Node word them)</caption><thead><tr><th scope="col">Type</th><th scope="col">Meaning</th><th scope="col">Typical message</th><th scope="col">Typical cause</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>SyntaxError</code></th><td>The code cannot even be read; <strong>nothing</strong> in the file runs</td><td><code>Unexpected token \'}\'</code></td><td>A missing or extra bracket, quote or comma</td></tr>'
        + '<tr><th scope="row"><code>ReferenceError</code></th><td>A name does not exist here</td><td><code>totl is not defined</code></td><td>A typo, a variable used outside its scope, or a <code>let</code>/<code>const</code> used before its line</td></tr>'
        + '<tr><th scope="row"><code>TypeError</code></th><td>The value exists but is the wrong kind for the operation</td><td><code>Cannot read properties of undefined (reading \'name\')</code>, <code>x is not a function</code>, <code>Assignment to constant variable.</code></td><td>Reading a property of <code>undefined</code>/<code>null</code>, calling something that is not a function, reassigning a <code>const</code></td></tr>'
        + '</tbody></table>',
      '<p>Code that runs without errors but prints the wrong value has a <strong>logic bug</strong>. Then compare <em>expected</em> with <em>got</em>: the wrong value itself is a clue about how the code went wrong. (The Try it box catches each error so the next one can run: see <a href="#/browser/js/try-catch">try and catch</a>.)</p>',
    ],
    example: 'A function `average(list)` is tested with `[]` and prints `NaN` instead of `0`. There is no error, so it is a logic bug. `NaN` is the clue: it comes from `0 / 0`, so the sum (0) was divided by the length (0). The fix is to handle the empty list before dividing.',
    mistake: 'Fixing the line the error points at when the real cause is upstream. `TypeError: Cannot read properties of null` on line 20 usually means the variable became `null` earlier, for example because a lookup with a misspelt name found nothing. Also: fix the **first** error in the console first; later ones are often consequences of it.',
    live: { kind: 'js', code: `try {
  const user = undefined;
  console.log(user.name);
} catch (err) {
  console.log(err.name);
  // → TypeError
}

try {
  // typo for total
  console.log(totl);
} catch (err) {
  console.log(err.name);
  // → ReferenceError
}

const list = [];
console.log(0 / list.length); // NaN: no error, but a logic bug` } },

  { id: 'try-catch', hub: 'basics', topic: 'basics',
    title: 'try and catch: handling errors',
    summary: '`try { … } catch (err) { … }` runs code that might fail and, if it throws, jumps to the `catch` block with the error instead of stopping the program.',
    html: [
      '<p>An error that nobody catches stops the script at that line: nothing after it runs. <code>try</code> is a safety net around the risky lines. If one of them <strong>throws</strong>, JavaScript skips the rest of the <code>try</code> block and runs the <code>catch</code> block with the error; if nothing throws, the <code>catch</code> block never runs. Either way, the program carries on after the net.</p>',
      '<dl><dt><code>catch (err)</code></dt><dd>Receives the error object: <code>err.name</code> (<code>TypeError</code>…), <code>err.message</code> (the description) and <code>err.stack</code> (where it happened).</dd>'
        + '<dt><code>finally { }</code></dt><dd>Optional. Runs after <code>try</code> or <code>catch</code>, whether or not there was an error: the place for clean-up.</dd>'
        + '<dt><code>throw new Error(\'…\')</code></dt><dd>Raises your own error, with your message, when your code finds a value it cannot work with.</dd>'
        + '<dt><code>throw err</code> inside <code>catch</code></dt><dd><strong>Rethrows</strong>: hands on an error you cannot deal with here, after logging it, to code further out.</dd>'
        + '</dl>',
      '<p>A <code>SyntaxError</code> in the same file is not caught: the file cannot be read, so the <code>try</code> never runs. Errors that happen later, in a timer or after <code>await</code>, need the pattern in <a href="#/server/runtime/async-errors">Errors in async code</a>.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The error jumps to catch; finally runs on both paths.',
      desc: 'The try block runs. If a line throws, the rest of the try block is skipped and the catch block runs with the error. If nothing throws, catch is skipped. On both paths the finally block runs, and then the program continues with the next line.',
      nodes: [
        { id: 'try', label: '`try { }`', note: 'the risky lines' },
        { id: 'catch', label: '`catch (err)`', note: 'only if one throws', key: true },
        { id: 'finally', label: '`finally { }`', note: 'on both paths' },
        { id: 'next', label: 'The next line', note: 'the program goes on' },
      ],
      edges: [['try', 'catch', 'a line throws'], ['try', 'finally', 'no error'], ['catch', 'finally'], ['finally', 'next']],
    },
    example: 'Reading a property of a missing value: `const user = undefined; console.log(user.name);` stops the whole script with a `TypeError`. Inside `try { … } catch (err) { console.log(err.message); }`, the script prints `Cannot read properties of undefined (reading \'name\')` and keeps going.',
    mistake: 'An empty catch: `catch (err) {}`. The error disappears, the program goes on with a wrong or missing value, and nothing tells you where it broke. At least log `err.message`; if this code cannot fix the problem, rethrow it with `throw err`.',
    live: { kind: 'js', code: `try {
  const user = undefined;
  // throws a TypeError
  console.log(user.name);
  console.log('never printed');
} catch (err) {
  console.log(err.name);
  // → TypeError
  // Cannot read properties of undefined (reading 'name')
  console.log(err.message);
} finally {
  console.log('finally runs either way');
}

try {
  throw new Error('Price must be positive');
} catch (err) {
  // Price must be positive
  console.log(err.message);
}
console.log('the program keeps going');` } },

  /* ---- 2. Variables, types and values ------------------------------------------------------ */
  { id: 'let-const-var', hub: 'types', topic: 'vars',
    title: 'Declaring variables: let, const and var',
    summary: 'A variable is a name bound to a value: a `const` name can never be pointed at another value, a `let` name can, and `var` is the older keyword with looser rules.',
    html: [
      '<p>A variable is a <strong>name that points at a value</strong>. The rule of thumb: <strong><code>const</code> by default</strong>, <code>let</code> only when the name must change (counters, running totals), and <code>var</code> never in new code; you only need to recognise it in older code.</p>',
      '<table><caption>The three keywords side by side</caption><thead><tr><th scope="col">Keyword</th><th scope="col">Reassign?</th><th scope="col">Scope</th><th scope="col">Used before its line</th><th scope="col">Declare the same name twice</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>const</code></th><td>No</td><td>Block <code>{ }</code></td><td><code>ReferenceError</code></td><td><code>SyntaxError</code></td></tr>'
        + '<tr><th scope="row"><code>let</code></th><td>Yes</td><td>Block <code>{ }</code></td><td><code>ReferenceError</code></td><td><code>SyntaxError</code></td></tr>'
        + '<tr><th scope="row"><code>var</code></th><td>Yes</td><td>Whole function (ignores blocks)</td><td>Silently <code>undefined</code></td><td>Allowed, silently</td></tr>'
        + '</tbody></table>',
      '<p>A <code>const</code> must get its value on the same line (<code>const x;</code> is a <code>SyntaxError</code>); reassigning it later is a <code>TypeError: Assignment to constant variable.</code> Why a name can be "used before its line" at all is explained in <a href="#/browser/js/scope-hoisting">Scope, hoisting and the temporal dead zone</a>.</p>',
    ],
    example: 'A shopping cart: `const TAX_RATE = 0.21;` never changes, so `const`. `let total = 0;` grows as items are added (`total = total + price;`), so `let`. `const items = [];` is also `const`: you will add items **into** the array, but the name `items` always points at the same array.',
    mistake: '"`const` means the value can never change." It only freezes the **binding** (which value the name points at). `const items = []; items.push(\'pen\');` is legal, because the array is changed, not replaced. See [Values vs references](#/browser/js/value-reference).',
    live: { kind: 'js', code: `let count = 0;
count = count + 1;
console.log(count);
// → 1

const city = 'Madrid';
try {
  city = 'Bilbao';
} catch (err) {
  console.log(err.name);
  // → TypeError
}

const items = [];
// allowed: changes the array
items.push('pen');
console.log(items);` } },

  { id: 'data-types', hub: 'types', topic: 'types',
    title: 'Data types and typeof',
    summary: 'Every value has a type: JavaScript has seven primitive types plus objects, and the `typeof` operator tells you which one a value is, with two famous quirks.',
    html: [
      '<p>In JavaScript the type belongs to the <strong>value</strong>, not to the variable: <code>let x = 5; x = \'five\';</code> is legal. <strong>Primitives</strong> are simple, unchangeable values: <code>number</code>, <code>string</code>, <code>boolean</code>, <code>undefined</code>, <code>null</code>, plus <code>bigint</code> (huge integers, written <code>10n</code>) and <code>symbol</code> (unique ids), which you will rarely need. <strong>Everything else is an object</strong>: arrays, plain <code>{ }</code> objects, functions, dates.</p>',
      '<dl><dt><code>undefined</code></dt><dd>"No value", set by the engine: a declared variable with no value, a missing property, a missing argument, the result of a function without <code>return</code>.</dd>'
        + '<dt><code>null</code></dt><dd>"No value", written by a programmer on purpose: "intentionally empty".</dd>'
        + '</dl>',
      '<table><caption>What typeof answers</caption><thead><tr><th scope="col">Value</th><th scope="col"><code>typeof</code> value</th><th scope="col">Note</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>42</code>, <code>3.14</code>, <code>NaN</code></th><td><code>\'number\'</code></td><td>One type for integers and decimals; even "Not a Number" is a number</td></tr>'
        + '<tr><th scope="row"><code>\'hi\'</code>, <code>""</code></th><td><code>\'string\'</code></td><td></td></tr>'
        + '<tr><th scope="row"><code>true</code></th><td><code>\'boolean\'</code></td><td></td></tr>'
        + '<tr><th scope="row"><code>undefined</code></th><td><code>\'undefined\'</code></td><td>Also for a name that was never declared</td></tr>'
        + '<tr><th scope="row"><code>null</code></th><td><code>\'object\'</code></td><td>A historical bug kept for compatibility: test with <code>value === null</code></td></tr>'
        + '<tr><th scope="row"><code>[1, 2]</code>, <code>{ a: 1 }</code></th><td><code>\'object\'</code></td><td>Arrays are objects: test with <code>Array.isArray(value)</code></td></tr>'
        + '<tr><th scope="row"><code>function () {}</code></th><td><code>\'function\'</code></td><td>Functions are objects too, but <code>typeof</code> reports them separately</td></tr>'
        + '</tbody></table>',
    ],
    example: 'Text typed by a user, or read from a file, always arrives as a **string**: if the user types 42 into an age box, the program receives `\'42\'`, so `typeof` gives `\'string\'` and `\'42\' + 1` is `\'421\'`. Converting with `Number(\'42\')` gives the number 42.',
    mistake: 'Testing `typeof x === \'object\'` to mean "x is a real object". `null` passes that test too, and the next line `x.name` then crashes with a `TypeError`. Check `x !== null` as well.',
    live: { kind: 'js', code: `console.log(typeof 42, typeof 'hi', typeof true);
console.log(typeof undefined, typeof null);
console.log(typeof [1, 2], Array.isArray([1, 2]));
console.log(typeof function () {});

let x = 5;
// the value decides the type
x = 'five';
console.log(typeof x);` } },

  { id: 'strings', hub: 'types', topic: 'types',
    title: 'Strings and template literals',
    summary: 'A string is an unchangeable sequence of characters; template literals (backticks) can embed expressions with `${…}` and span several lines.',
    html: [
      '<p>A string is a <strong>read-only row of characters</strong>: you can read <code>s.length</code> or one character with <code>s[0]</code> (positions start at 0), but you cannot change a character in place. Strings come with <strong>methods</strong>, functions attached to the value and called with a dot (<code>s.toUpperCase()</code>), and every string method <strong>returns a new string</strong>, leaving the original untouched.</p>',
      '<p>Single quotes <code>\'…\'</code> and double quotes <code>"…"</code> are identical. Backtick quotes create a <strong>template literal</strong>: inside it, <code>${expression}</code> is replaced by the value of the expression, and line breaks are kept. It replaces long chains of <code>+</code>.</p>',
      '<table><caption>String tools you will use most, for s = \'Riverside FC\'</caption><thead><tr><th scope="col">Expression</th><th scope="col">Result</th><th scope="col">What it does</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>s.length</code></th><td><code>12</code></td><td>Number of characters (a property, no parentheses)</td></tr>'
        + '<tr><th scope="row"><code>s[0]</code>, <code>s[s.length - 1]</code></th><td><code>\'R\'</code>, <code>\'C\'</code></td><td>One character by position</td></tr>'
        + '<tr><th scope="row"><code>s.toLowerCase()</code> / <code>s.toUpperCase()</code></th><td><code>\'riverside fc\'</code> / <code>\'RIVERSIDE FC\'</code></td><td>Case conversion (a new string)</td></tr>'
        + '<tr><th scope="row"><code>s.includes(\'FC\')</code></th><td><code>true</code></td><td>Does it contain this text? (case-sensitive)</td></tr>'
        + '<tr><th scope="row"><code>s.indexOf(\'z\')</code></th><td><code>-1</code></td><td>Position of the first match, <code>-1</code> when absent</td></tr>'
        + '<tr><th scope="row"><code>s.slice(0, 9)</code></th><td><code>\'Riverside\'</code></td><td>Characters from position 0 up to (not including) 9</td></tr>'
        + '<tr><th scope="row"><code>\'  hi \'.trim()</code></th><td><code>\'hi\'</code></td><td>Removes spaces at both ends (useful on user input)</td></tr>'
        + '<tr><th scope="row"><code>\'a,b,c\'.split(\',\')</code></th><td><code>[\'a\', \'b\', \'c\']</code></td><td>Cuts a string into an array (see <a href="#/browser/js/arrays">Arrays</a>)</td></tr>'
        + '<tr><th scope="row"><code>[\'a\', \'b\'].join(\'-\')</code></th><td><code>\'a-b\'</code></td><td>The opposite: glues an array into a string</td></tr>'
        + '</tbody></table>',
    ],
    example: 'Building a score line: the template literal `${home} ${homeGoals}–${awayGoals} ${away}`, written between backticks, with `home = \'Riverside\'`, `homeGoals = 2`, `awayGoals = 1`, `away = \'Hillside\'` gives `Riverside 2–1 Hillside`. Any expression fits inside `${…}`, even the ternary `${homeGoals > awayGoals ? \'win\' : \'no win\'}` (see [Conditionals](#/browser/js/conditionals)).',
    mistake: 'Expecting a method to change the string: after `club.toUpperCase();` the variable `club` is unchanged. Strings cannot be changed, so keep the result: `const loud = club.toUpperCase();`. A second classic: writing `\'Hello ${user}\'` with normal quotes, which prints the `${user}` literally; interpolation only works between backticks.',
    live: { kind: 'js', code: `const club = 'Riverside FC';
console.log(club.length);
console.log(club[0], club.toUpperCase());
console.log(club.includes('FC'), club.indexOf('z'));
console.log(club.slice(0, 9));
console.log('a,b,c'.split(','));

const goals = 3;
console.log(\`\${club} scored \${goals} goal\${goals === 1 ? '' : 's'}\`);

// result thrown away...
club.toLowerCase();
// ...so club is unchanged
console.log(club);` } },

  { id: 'numbers', hub: 'types', topic: 'types',
    title: 'Numbers, arithmetic and the remainder operator',
    summary: 'JavaScript has a single number type for integers and decimals; besides `+ - * /` it has `%` (remainder) and `**` (power), and decimals are stored in binary, so some results are slightly off.',
    html: [
      '<p>Every number is stored as a 64-bit binary floating-point value, with about 16 significant digits. Most decimals (0.1, 0.2) cannot be written exactly in base 2, which is why <code>0.1 + 0.2</code> prints <code>0.30000000000000004</code> and why money is <strong>rounded</strong> before it is shown.</p>',
      '<p>The <strong>remainder operator</strong> <code>%</code> gives what is left after whole division: <code>17 % 5</code> is <code>2</code> because 17 = 3 × 5 + 2. It answers divisibility questions: <code>n % 2 === 0</code> means "n is even", <code>n % d === 0</code> means "d divides n exactly".</p>',
      '<dl><dt><code>x += 5</code>, <code>x++</code></dt><dd>Shorthand: <code>x = x + 5</code> (also <code>-=</code>, <code>*=</code>, <code>/=</code>); <code>x++</code> adds 1, <code>x--</code> subtracts 1.</dd>'
        + '<dt><code>Math</code></dt><dd><code>Math.round(x)</code>, <code>Math.floor(x)</code> (down), <code>Math.ceil(x)</code> (up), <code>Math.sqrt(x)</code>, <code>Math.abs(x)</code>. To cents: <code>Math.round(x * 100) / 100</code>. <code>x.toFixed(2)</code> also rounds, but returns a <strong>string</strong>.</dd>'
        + '<dt><code>Number(text)</code></dt><dd><code>Number(\'42\')</code> is <code>42</code>; <code>Number(\'abc\')</code> is <code>NaN</code> ("Not a Number", the result of failed maths). <code>NaN</code> equals nothing, not even itself: test it with <code>Number.isNaN(x)</code>.</dd>'
        + '<dt>Division by zero</dt><dd>Does not crash: <code>1 / 0</code> is <code>Infinity</code>.</dd>'
        + '</dl>',
    ],
    example: 'Converting 135 minutes into hours and minutes: `Math.floor(135 / 60)` is `2` whole hours and `135 % 60` is `15` minutes left over, so for `m = 135` the template literal `${Math.floor(m / 60)} h ${m % 60} min` (between backticks) prints `2 h 15 min`.',
    mistake: 'Testing `x === NaN` to detect a failed conversion. It is **always** false, even when `x` is `NaN`, because `NaN` never equals anything. Use `Number.isNaN(x)`.',
    live: { kind: 'js', code: `console.log(17 % 5);
    // → 2
console.log(10 % 2 === 0);
// → true: 10 is even
console.log(0.1 + 0.2);
console.log(Math.round(12.3456 * 100) / 100);
console.log(Number('42') + 1, Number('abc'));
console.log(Number('abc') === NaN, Number.isNaN(Number('abc')));

let score = 10;
score += 5;
score++;
console.log(score);
// → 16` } },

  { id: 'coercion-equality', hub: 'types', topic: 'types',
    title: 'Type coercion and == vs ===',
    summary: 'Coercion is JavaScript converting a value to another type automatically; `===` compares type and value without converting, while `==` converts first, so the safe default (and the one used on this site) is `===`.',
    html: [
      '<p>When an operator gets a type it does not expect, JavaScript does not stop with an error: it <strong>quietly converts</strong> (coerces) the value. <code>+</code> with a string on either side joins text (<code>\'5\' + 1</code> is <code>\'51\'</code>); <code>-</code>, <code>*</code> and <code>/</code> convert to numbers (<code>\'5\' - 1</code> is <code>4</code>); an <code>if</code> converts to a boolean (see <a href="#/browser/js/truthy-falsy">Truthy and falsy values</a>).</p>',
      '<dl><dt>Strict equality <code>===</code></dt><dd>True only when both sides have the same type <strong>and</strong> the same value; it never converts. Use <code>===</code> and <code>!==</code> always.</dd>'
        + '<dt>Loose equality <code>==</code></dt><dd>Converts the two sides by a long rule table, then compares. The results are hard to predict and not even consistent: <code>0 == \'\'</code> and <code>0 == \'0\'</code> are both true, yet <code>\'\' == \'0\'</code> is false.</dd>'
        + '</dl>',
      '<table><caption>Loose versus strict equality</caption><thead><tr><th scope="col">Comparison</th><th scope="col"><code>==</code></th><th scope="col"><code>===</code></th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>\'5\'</code> and <code>5</code></th><td>true</td><td>false</td></tr>'
        + '<tr><th scope="row"><code>0</code> and <code>\'\'</code></th><td>true</td><td>false</td></tr>'
        + '<tr><th scope="row"><code>0</code> and <code>false</code></th><td>true</td><td>false</td></tr>'
        + '<tr><th scope="row"><code>null</code> and <code>undefined</code></th><td>true</td><td>false</td></tr>'
        + '<tr><th scope="row"><code>\'\'</code> and <code>\'0\'</code></th><td>false</td><td>false</td></tr>'
        + '<tr><th scope="row"><code>NaN</code> and <code>NaN</code></th><td>false</td><td>false</td></tr>'
        + '</tbody></table>',
      '<p>For objects and arrays, <code>===</code> compares <strong>identity</strong>: <code>[1] === [1]</code> is false because they are two different arrays (see <a href="#/browser/js/value-reference">Values vs references</a>). To convert on purpose, use <code>Number(x)</code>, <code>String(x)</code> or <code>Boolean(x)</code>.</p>',
    ],
    example: 'An age gate reads `const raw = \'18\';` from a form. `raw >= 18` is `true` (coerced), `raw === 18` is `false` (string vs number), and `Number(raw) === 18` is `true`. Converting once, at the point where the input enters your code, makes every later comparison predictable.',
    mistake: 'Comparing text from a form with a number: `if (age === 18)` is never true while `age` is the string `\'18\'`. Switching to `==` makes it "work" but hides the real problem; convert with `Number()` instead.',
    live: { kind: 'js', code: `console.log('5' + 1);
    // → '51': + joins text
console.log('5' - 1);
// → 4: - converts to number
console.log('5' == 5, '5' === 5);
console.log(0 == '', 0 === '');
console.log(null == undefined, null === undefined);
console.log(NaN === NaN);
// two different arrays
console.log([1] === [1]);` } },

  { id: 'truthy-falsy', hub: 'types', topic: 'types',
    title: 'Truthy and falsy values',
    summary: 'In a condition every value counts as true or false: the falsy values are `false`, `0`, `-0`, `0n`, `\'\'`, `null`, `undefined` and `NaN`; everything else is truthy.',
    html: [
      '<p>An <code>if</code> really asks "is there something here?". The falsy values are the <strong>"nothing" values</strong>: false, zero, the empty string, no value (<code>null</code>, <code>undefined</code>) and a failed number (<code>NaN</code>), plus the BigInt zero <code>0n</code> that you will rarely meet. <strong>Everything else is truthy</strong>, including empty containers (<code>[]</code> and <code>{}</code>) and the strings <code>\'0\'</code>, <code>\'false\'</code> and <code>\' \'</code>, which are not empty.</p>',
      '<ul><li><strong>See the verdict:</strong> <code>Boolean(value)</code> (or <code>!!value</code>) shows the true/false JavaScript will use.</li>'
        + '<li><strong>Short tests:</strong> <code>if (name)</code> rejects both an empty and a missing name; <code>if (list.length)</code> means "the list is not empty".</li>'
        + '</ul>',
    ],
    example: 'A search box: `const query = text.trim(); if (!query) { console.log(\'Type something\'); }`. An empty or all-spaces input becomes `\'\'`, which is falsy, so one test covers both cases.',
    mistake: 'Using truthiness when `0` or `\'\'` is a valid value: `if (stock) { … } else { … \'no data\' }` says "no data" when the stock is exactly 0. Test the case you really mean, for example `stock !== undefined`. The opposite trap: `if (results)` is always true for an array, even an empty one; test `results.length`.',
    live: { kind: 'js', code: `const cases = [
  ['0', 0], ["''", ''], ["' '", ' '], ["'0'", '0'],
  ['null', null], ['undefined', undefined], ['NaN', NaN],
  ['[]', []], ['{}', {}], ['-1', -1],
];
for (const pair of cases) {
  console.log(pair[0], Boolean(pair[1]) ? 'truthy' : 'falsy');
}` },
    widget: 'truthy-table',
    practice: { href: '#/browser/js/practice/truthy-table', label: 'Open the truthy/falsy explorer' } },

  /* ---- 3. Logic and control flow ----------------------------------------------------------- */
  { id: 'logical-operators', hub: 'logic', topic: 'logic',
    title: 'Logical operators and short-circuiting',
    summary: '`&&`, `||` and `??` combine values and stop as soon as the answer is known, returning one of their operands; `!` turns any value into the opposite boolean.',
    html: [
      '<p>Read the operators as decisions about <strong>which operand to hand back</strong>. In an <code>if</code> this behaves like true/false, but in an assignment you get the operand itself: <code>\'\' || \'guest\'</code> is <code>\'guest\'</code>, not <code>true</code>.</p>',
      '<dl><dt><code>a &amp;&amp; b</code></dt><dd>If <code>a</code> is falsy, the answer is <code>a</code>; otherwise it is <code>b</code>.</dd>'
        + '<dt><code>a || b</code></dt><dd>If <code>a</code> is truthy, the answer is <code>a</code>; otherwise it is <code>b</code>.</dd>'
        + '<dt><code>a ?? b</code></dt><dd>Nullish coalescing: if <code>a</code> is <code>null</code> or <code>undefined</code>, the answer is <code>b</code>; otherwise <code>a</code>.</dd>'
        + '<dt><code>!a</code></dt><dd>Always a real boolean: <code>!\'hello\'</code> is <code>false</code>, so <code>!!value</code> converts any value to <code>true</code>/<code>false</code>.</dd>'
        + '</dl>',
      '<p><strong>Short-circuiting:</strong> the right-hand side is not evaluated at all when the left side already decides. That makes the <strong>guard</strong> <code>user &amp;&amp; user.name</code> safe: if <code>user</code> is <code>undefined</code>, <code>.name</code> is never read, and a function call on the right is skipped too. Optional chaining <code>user?.name</code> is the modern guard: <code>undefined</code> instead of a crash. Precedence: <code>!</code>, then <code>&amp;&amp;</code>, then <code>||</code>; add parentheses whenever you mix them.</p>',
      '<table><caption>Defaults: || versus ??</caption><thead><tr><th scope="col">Expression</th><th scope="col">Result</th><th scope="col">Why</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>\'\' || \'guest\'</code></th><td><code>\'guest\'</code></td><td><code>\'\'</code> is falsy</td></tr>'
        + '<tr><th scope="row"><code>\'\' ?? \'guest\'</code></th><td><code>\'\'</code></td><td><code>\'\'</code> is not null/undefined</td></tr>'
        + '<tr><th scope="row"><code>0 || 50</code></th><td><code>50</code></td><td><code>0</code> is falsy</td></tr>'
        + '<tr><th scope="row"><code>0 ?? 50</code></th><td><code>0</code></td><td><code>0</code> is a real value</td></tr>'
        + '<tr><th scope="row"><code>undefined ?? 50</code></th><td><code>50</code></td><td>No value at all</td></tr>'
        + '</tbody></table>',
    ],
    example: 'A greeting: `const display = nickname || fullName || \'guest\';` picks the first non-empty name. A volume setting: `const volume = settings.volume ?? 50;` keeps a deliberate volume of `0`, which `||` would wrongly replace by 50.',
    mistake: 'Using `||` for a default when `0`, `\'\'` or `false` is a legitimate value. `const volume = settings.volume || 50` turns a muted player (volume 0) into volume 50. Use `??` when only "missing" should trigger the default.',
    live: { kind: 'js', code: `console.log(true && 'yes');
    // → 'yes'
console.log(0 && 'never');
// → 0
console.log('' || 'guest');
// → 'guest'
console.log(0 || 50, 0 ?? 50);
// → 50 0
console.log(null ?? 'default');
console.log(!'hello', !!'hello');

function shout() {
  console.log('shout ran');
  return true;
}
// shout never runs
console.log(false && shout());
const user = undefined;
console.log(user && user.name);
// → undefined, no crash` } },

  { id: 'conditionals', hub: 'logic', topic: 'logic',
    title: 'Conditionals: if/else, the ternary and switch',
    summary: 'Conditionals choose which code runs: `if / else if / else` for general branching, the ternary `cond ? a : b` to pick one of two values, and `switch` to compare one value against fixed cases.',
    html: [
      '<p>An <code>if / else if / else</code> chain tests its conditions <strong>top to bottom</strong>, and only the <strong>first</strong> truthy branch runs; the rest are skipped. So the order matters: put the most specific condition first.</p>',
      '<dl><dt>Ternary <code>cond ? a : b</code></dt><dd>An <strong>expression</strong>: it produces a value you can store or print. Use it to choose a value, not to run long actions, and avoid nesting ternaries.</dd>'
        + '<dt><code>switch (value)</code></dt><dd>Compares the value against each <code>case</code> with <strong>strict equality (<code>===</code>)</strong>. Execution starts at the matching case and <strong>falls through</strong> into the next ones until a <code>break</code>; <code>default</code> runs when no case matches. Stacking cases without <code>break</code> (<code>case \'Sat\': case \'Sun\':</code>) is the one useful form of fall-through.</dd>'
        + '</dl>',
      '<ul><li><strong>Comparison operators:</strong> <code>===</code>, <code>!==</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>. A single <code>=</code> is assignment, not comparison: <code>if (x = 5)</code> assigns 5 and is always truthy.</li>'
        + '<li><strong>Guard clause:</strong> inside a function, an early <code>return</code> at the top for the bad case avoids deep nesting.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The conditions are tested top to bottom; the first true one wins.',
      desc: 'With score 7.5, the first test, score of 9 or more, is false. The else-if test, score of 5 or more, is true, so its branch runs and prints Pass. The final else branch, Fail, is never looked at.',
      nodes: [
        { id: 'score', label: '`score` is 7.5', note: 'tested top to bottom' },
        { id: 'out', label: 'Outstanding', note: 'skipped' },
        { id: 'pass', label: 'Pass', note: 'the first true test', key: true },
        { id: 'fail', label: 'Fail', note: 'never looked at' },
      ],
      edges: [['score', 'out', '`>= 9`: false'], ['score', 'pass', '`>= 5`: true'], ['score', 'fail', 'else']],
    },
    example: 'Exam labels: `if (score >= 9) label = \'Outstanding\'; else if (score >= 5) label = \'Pass\'; else label = \'Fail\';`. With `score = 7.5` the first test fails, the second passes, and the `else` is never looked at.',
    mistake: 'Ordering branches from general to specific: `if (score >= 5) { … } else if (score >= 9) { … }`. A 9.5 already matches the first test, so the "Outstanding" branch can never run.',
    live: { kind: 'js', code: `const score = 7.5;
if (score >= 9) {
  console.log('Outstanding');
} else if (score >= 5) {
  console.log('Pass');
} else {
  console.log('Fail');
}

const label = score >= 5 ? 'pass' : 'fail';
console.log(label);

const day = 'Sun';
switch (day) {
  case 'Sat':
  case 'Sun':
    console.log('weekend');
    break;
  default:
    console.log('weekday');
}

const level = '2';
switch (level) {
  case 2:
    console.log('number 2');
    break;
  default:
    console.log('no match: switch uses ===');
}` } },

  { id: 'loops', hub: 'logic', topic: 'logic',
    title: 'Loops: for, while, break and continue',
    summary: 'A loop repeats a block while a condition stays truthy; `for` puts the start, the condition and the step on one line, `while` only has the condition.',
    html: [
      '<p>A loop is a <strong>condition checked before every pass</strong> (iteration). In <code>for (let i = 0; i &lt; 3; i++)</code> the start <code>let i = 0</code> runs once; then the check, the body and the step repeat until the check is false. Tracing a loop on paper, one row per pass with the value of <code>i</code>, the check and what the body did, is the fastest way to understand or debug it.</p>',
      '<p>Use <code>while (condition)</code> when you do not know the number of passes in advance. The body must change something the condition depends on, or the loop never ends: an <strong>infinite loop</strong> freezes the tab.</p>',
      '<dl><dt><code>break</code></dt><dd>Leaves the loop immediately.</dd>'
        + '<dt><code>continue</code></dt><dd>Skips the rest of this pass and goes to the next check.</dd>'
        + '<dt><code>return</code></dt><dd>Inside a function, leaves the loop <strong>and</strong> the whole function.</dd>'
        + '</dl>',
      '<ul><li><strong>Accumulator pattern:</strong> create the result before the loop (<code>let total = 0</code>), update it inside, use it after the loop.</li>'
        + '<li><strong>Off by one:</strong> <code>&lt;</code> versus <code>&lt;=</code> decides whether the last value is included. Check the first and the last pass explicitly.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'cycle',
      title: '`let i = 0` runs once; then check, body and step repeat until the check is false.',
      desc: 'After the start runs once, the loop checks the condition i less than 3. If it is true, the body runs, then the step i++ adds one, and the loop goes back to the check. When the check is false, the loop ends.',
      nodes: [
        { id: 'check', label: 'Check', note: '`i < 3`? false: exit', key: true },
        { id: 'body', label: 'Body', note: 'runs once per pass' },
        { id: 'step', label: 'Step', note: '`i++`' },
      ],
      edges: [['check', 'body', 'true'], ['body', 'step'], ['step', 'check']],
    },
    example: 'How many times can you halve 40 before reaching 1? `let n = 40, steps = 0; while (n > 1) { n = Math.floor(n / 2); steps++; }`. Trace: 40, 20, 10, 5, 2, 1, so `steps` ends at 5. You could not know "5" before running, which is why `while` fits.',
    mistake: 'An off-by-one count: `for (let i = 1; i < 10; i++)` runs 9 times, not 10, because the pass with `i = 10` fails the check. Decide whether the end is included (`<=`) or not (`<`), and check the first and the last pass by hand.',
    live: { kind: 'js', code: `for (let i = 0; i < 3; i++) {
  console.log('pass', i);
}

let n = 40;
let steps = 0;
while (n > 1) {
  n = Math.floor(n / 2);
  steps++;
}
console.log('halvings:', steps);

for (let i = 1; i <= 10; i++) {
  // skip non-multiples
  if (i % 3 !== 0) continue;
  // stop completely
  if (i > 7) break;
  console.log('multiple of 3:', i);
}` },
    widget: 'loop-tracer',
    practice: { href: '#/browser/js/practice/loop-tracer', label: 'Step through loops in the loop tracer' } },

  /* ---- 4. Arrays and objects --------------------------------------------------------------- */
  { id: 'arrays', hub: 'data', topic: 'data',
    title: 'Arrays: indexes, length, push and pop',
    summary: 'An array is an ordered list of values under one name; each value is read by its position, its **index**, which starts at 0.',
    html: [
      '<p>Positions start at <strong>0</strong>: <code>arr[0]</code> is the first value, <code>arr.length</code> is how many there are, and the last one is at <code>arr.length - 1</code>. Reading an index that does not exist gives <code>undefined</code>, not an error.</p>',
      '<dl><dt><code>push(x)</code> / <code>pop()</code></dt><dd>Add at the end / remove the last element and return it.</dd>'
        + '<dt><code>unshift(x)</code> / <code>shift()</code></dt><dd>The same at the start.</dd>'
        + '<dt><code>arr[i] = value</code></dt><dd>Replaces one element.</dd>'
        + '</dl>',
      '<ul><li><strong>Any mix of values,</strong> including objects: an <strong>array of objects</strong> (a list of records, see <a href="#/browser/js/objects">Objects</a>) is the everyday shape of data in pages and in the JSON returned by almost every API.</li>'
        + '<li><strong>Arrays are objects:</strong> <code>typeof []</code> is <code>\'object\'</code>, so recognise one with <code>Array.isArray(x)</code>.</li>'
        + '<li><strong>A <code>const</code> array can still change</strong> (push, pop, edit): <code>const</code> only stops the name from pointing at another array (see <a href="#/browser/js/value-reference">Values vs references</a>).</li>'
        + '</ul>',
    ],
    example: 'A squad as an array of objects: `const squad = [{ name: \'Elena\', pos: \'GK\' }, { name: \'Sofia\', pos: \'MF\' }];`. `squad.length` is 2, `squad[1].name` is `\'Sofia\'`, and `squad.push({ name: \'Ines\', pos: \'DF\' })` adds a third player.',
    mistake: 'Reading the last element with `arr[arr.length]`. Because indexes start at 0, that position is one past the end and gives `undefined`; the last element is `arr[arr.length - 1]`. The same slip in a loop, `for (let i = 0; i <= arr.length; i++)`, reads that missing element on its last pass: use `i < arr.length`.',
    live: { kind: 'js', code: `const students = ['Anna', 'Bob', 'Joan'];
console.log(students[0], students.length);
// last
console.log(students[students.length - 1]);
console.log(students[10]);
// → undefined, no error

students.push('Zoe');
const removed = students.pop();
console.log(removed, students.length);

students[1] = 'Bea';
console.log(students);

const squad = [{ name: 'Elena', pos: 'GK' }, { name: 'Sofia', pos: 'MF' }];
console.log(squad[1].name);` } },

  { id: 'objects', hub: 'data', topic: 'data',
    title: 'Objects: properties, dot and bracket notation',
    summary: 'An object groups named values, its **properties**, under one variable; you read and write them with dot notation `obj.key` or bracket notation `obj[\'key\']`.',
    html: [
      '<p>An object is a <strong>record with labelled fields</strong>: each property has a name (the <strong>key</strong>, always a string) and a value of any type, including arrays, other objects and functions. A property whose value is a function is a <strong>method</strong>. Where an array answers "which position?", an object answers "which name?".</p>',
      '<dl><dt>Dot notation <code>player.name</code></dt><dd>For names you know while writing the code.</dd>'
        + '<dt>Bracket notation <code>player[key]</code></dt><dd>For names held in a variable, or keys with spaces or dashes (<code>obj[\'shirt-size\']</code>).</dd>'
        + '<dt>A missing property</dt><dd>Reading it gives <code>undefined</code>; reading a property <strong>of</strong> <code>undefined</code> throws a <code>TypeError</code>. That is why <code>user.address.city</code> can crash when a level is missing; <code>user.address?.city</code> gives <code>undefined</code> instead.</dd>'
        + '</dl>',
      '<ul><li><strong>Add and remove:</strong> assigning a new key adds it (<code>player.club = \'Riverside\'</code>); <code>delete player.club</code> removes it.</li>'
        + '<li><strong>Count:</strong> <code>Object.keys(obj)</code> returns the keys as an array, so <code>Object.keys(obj).length</code> counts them.</li>'
        + '<li><strong>Order:</strong> keys follow insertion order (integer-like keys come first, ascending). If order is part of your data, use an array.</li>'
        + '</ul>',
      '<table><caption>Array or object?</caption><thead><tr><th scope="col"></th><th scope="col">Array</th><th scope="col">Object</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row">Look values up by</th><td>position (0, 1, 2…)</td><td>name (<code>\'title\'</code>, <code>\'price\'</code>)</td></tr>'
        + '<tr><th scope="row">Best for</th><td>a list of similar items</td><td>one item with named fields</td></tr>'
        + '<tr><th scope="row">Literal</th><td><code>[ ]</code></td><td><code>{ }</code></td></tr>'
        + '<tr><th scope="row">Count</th><td><code>arr.length</code></td><td><code>Object.keys(obj).length</code></td></tr>'
        + '</tbody></table>',
    ],
    example: 'A player record: `const player = { name: \'Sofia\', number: 10, stats: { goals: 7, assists: 3 } };`. `player.stats.goals` is `7`. To read whichever stat the user chose, `const field = \'assists\'; player.stats[field]` gives `3`.',
    mistake: 'Using dot notation with a variable: `player.stats.field` looks for a property literally called `"field"` and gives `undefined`. When the key is in a variable, use brackets: `player.stats[field]`.',
    live: { kind: 'js', code: `const player = {
  name: 'Sofia',
  number: 10,
  stats: { goals: 7, assists: 3 },
  // method shorthand
  celebrate() {
    return 'Goal!';
  },
};

console.log(player.name, player['number']);
const field = 'assists';
console.log(player.stats[field], player.stats.field);
console.log(player.club);
// → undefined: missing key

player.club = 'Riverside';
console.log(Object.keys(player));
console.log(player.celebrate());` } },

  { id: 'for-of-in', hub: 'data', topic: 'logic',
    title: 'for...of, for...in and looping over strings',
    summary: '`for...of` walks the **values** of an array or the characters of a string; `for...in` walks the **keys** of an object and should not be used on arrays.',
    html: [
      '<dl><dt><code>for (const item of collection)</code></dt><dd>"For each thing in this collection." No index to manage, so no off-by-one to get wrong: the modern default for arrays. It works on anything <strong>iterable</strong>: arrays and strings (one character per pass). A plain object is <strong>not</strong> iterable: <code>for...of</code> on it throws a <code>TypeError</code>.</dd>'
        + '<dt><code>for (const key in object)</code></dt><dd>Gives each <strong>property name</strong>, as a string; read the value with <code>object[key]</code>. On an array it gives the indexes <strong>as strings</strong> (<code>\'0\'</code>, <code>\'1\'</code>…) and may also include extra properties, so do not use it there.</dd>'
        + '</dl>',
      '<table><caption>Which loop for which job</caption><thead><tr><th scope="col">You need…</th><th scope="col">Use</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row">Every value of an array or every character of a string</th><td><code>for (const x of arr)</code></td></tr>'
        + '<tr><th scope="row">The index as well, or a custom step</th><td><code>for (let i = 0; i &lt; arr.length; i++)</code></td></tr>'
        + '<tr><th scope="row">Every key of an object</th><td><code>for (const key in obj)</code> or <code>Object.keys(obj)</code></td></tr>'
        + '<tr><th scope="row">Repeat until something happens</th><td><code>while (condition)</code></td></tr>'
        + '</tbody></table>',
    ],
    example: 'Counting capital letters in `\'Hello World\'`: `let caps = 0; for (const ch of \'Hello World\') { if (ch !== ch.toLowerCase()) caps++; }` gives `2`. No index, no length, no off-by-one.',
    mistake: 'Using `for...in` on an array and doing arithmetic with the key: `for (const i in tags) console.log(i + 1)` prints `01`, `11`, `21`, because `i` is the **string** `\'0\'` and `+` joins text.',
    live: { kind: 'js', code: `const tags = ['html', 'css', 'js'];
for (const tag of tags) {
  console.log('value:', tag);
}
for (const i in tags) {
  console.log('key:', i, typeof i);
}

const player = { name: 'Sofia', number: 10 };
for (const key in player) {
  console.log(key, '=', player[key]);
}

for (const ch of 'hey') {
  console.log(ch);
}

try {
  for (const x of player) {}
} catch (err) {
  console.log(err.name);
  // → TypeError: objects are not iterable
}` } },

  { id: 'value-reference', hub: 'data', topic: 'data',
    title: 'Values vs references: copying and mutation',
    summary: 'Assigning a primitive copies the value itself; assigning an object or array copies a **reference** to the same data, so a change made through one variable is visible through the other.',
    html: [
      '<p>A primitive (number, string, boolean…) is stored <strong>in the variable itself</strong>. An object or array lives elsewhere in memory, and the variable holds its <strong>address</strong>. <code>b = a</code> always copies what <code>a</code> holds: for a primitive that is the value, so <code>a</code> and <code>b</code> are independent; for an object it is the address, so both names reach <strong>one</strong> object.</p>',
      '<dl><dt>Mutation</dt><dd>Changing the object (<code>list.push(x)</code>, <code>obj.key = v</code>): every variable pointing at it sees the change.</dd>'
        + '<dt>Reassignment</dt><dd>Pointing one name at something else (<code>b = [ ]</code>): only that name moves. That is why <code>const</code> does not freeze an array: it forbids reassignment, not mutation.</dd>'
        + '</dl>',
      '<ul><li><strong>An independent copy:</strong> <code>[...arr]</code> for arrays, <code>{ ...obj }</code> for objects (the spread syntax).</li>'
        + '<li><strong>Shallow:</strong> arrays or objects nested inside are still shared; <code>structuredClone(obj)</code> makes a deep copy.</li>'
        + '<li><strong>Equality follows the same model:</strong> <code>===</code> on objects asks "same address?", so <code>[1] === [1]</code> is false.</li>'
        + '</ul>',
    ],
    example: 'A function receives a reference too. `function addBonus(scores) { scores.push(10); }` called with `const mine = [7, 8]` leaves `mine` as `[7, 8, 10]` after the call: the function changed the caller\'s array. Writing `return [...scores, 10];` instead returns a new array and leaves `mine` intact.',
    mistake: '"I copied the array, so editing the copy is safe" after writing `const backup = list;`. That copies only the reference: `backup.push(…)` changes `list` too. Use `const backup = [...list];`.',
    live: { kind: 'js', code: `let a = 5;
let b = a;
b = 6;
console.log(a, b);
// → 5 6: independent

const list = ['x'];
// same array
const alias = list;
alias.push('y');
console.log(list);

// a new array
const copy = [...list];
copy.push('z');
console.log(list.length, copy.length);

console.log([1] === [1], list === alias);

const team = { name: 'A', players: ['Ana'] };
// shallow copy
const clone = { ...team };
clone.players.push('Bea');
// nested array is shared
console.log(team.players);` },
    widget: 'value-reference' },

  { id: 'json', hub: 'data', topic: 'data',
    title: 'JSON: data as text',
    summary: 'JSON (JavaScript Object Notation) is a text format for data: `JSON.stringify(value)` turns a value into JSON text, and `JSON.parse(text)` turns the text back into a new value.',
    html: [
      '<p>Data leaves a program as <strong>text</strong>: in a file, or over the network to a server. JSON writes objects and arrays in a syntax close to JavaScript\'s own, but stricter: keys and strings in <strong>double quotes</strong>, no trailing commas, no comments, and only data, never functions.</p>',
      '<table><caption>What survives a round trip, stringify then parse</caption><thead><tr><th scope="col">In the value</th><th scope="col">After the trip</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row">Numbers, strings, <code>true</code>/<code>false</code>, <code>null</code>, arrays, plain objects</th><td>The same data, in a <strong>new</strong> object</td></tr>'
        + '<tr><th scope="row">A property set to <code>undefined</code>, a function</th><td>Dropped</td></tr>'
        + '<tr><th scope="row">A <code>Date</code></th><td>A string such as <code>\'1970-01-01T00:00:00.000Z\'</code></td></tr>'
        + '<tr><th scope="row"><code>NaN</code>, <code>Infinity</code></th><td><code>null</code></td></tr>'
        + '</tbody></table>',
      '<dl><dt><code>JSON.stringify(value, null, 2)</code></dt><dd>Indents the text by two spaces: readable, for files and logs.</dd>'
        + '<dt><code>JSON.parse(text)</code> on bad text</dt><dd>Throws a <code>SyntaxError</code>. Text from outside your program can be broken, so parse it inside <a href="#/browser/js/try-catch">try and catch</a>.</dd>'
        + '</dl>',
    ],
    diagram: {
      kind: 'flow',
      title: 'JSON is the text form of your data; parsing it builds a new copy.',
      desc: 'A JavaScript value, such as an object, goes through JSON.stringify and becomes JSON text, which is a string that can be saved or sent. JSON.parse turns that text back into a new value with the same data, but not the same object.',
      nodes: [
        { id: 'value', label: 'A value', note: 'an object or array' },
        { id: 'text', label: 'JSON text', note: 'a string: save or send', key: true },
        { id: 'copy', label: 'A new value', note: 'same data, new object' },
      ],
      edges: [['value', 'text', '`JSON.stringify`'], ['text', 'copy', '`JSON.parse`']],
    },
    example: 'A task list saved in a file or sent to a server travels as JSON text: `JSON.stringify(tasks)` before it leaves, `JSON.parse(text)` when it comes back. The receiver gets the same data in new objects, so changing them never touches the sender\'s.',
    mistake: 'Treating JSON text as an object: after `const text = JSON.stringify(task);`, `text.title` is `undefined`, because `text` is a string. Parse it first: `JSON.parse(text).title`. The reverse slip: `\'Task: \' + task` gives `\'Task: [object Object]\'`; stringify the object to see its data.',
    live: { kind: 'js', code: `const task = { id: 1, title: 'Buy milk', done: false, tags: ['home'] };
const text = JSON.stringify(task);
console.log(text);
// → {"id":1,"title":"Buy milk","done":false,"tags":["home"]}
// string
console.log(typeof text);

const back = JSON.parse(text);
// Buy milk false: a new object
console.log(back.title, back === task);

console.log(JSON.stringify({ a: undefined, f() {}, when: new Date(0) }));
// {"when":"1970-01-01T00:00:00.000Z"}

try {
  // not JSON: keys and strings need double quotes
  JSON.parse("{ title: 'x' }");
} catch (err) {
  console.log(err.name);
  // → SyntaxError
}` } },

  /* ---- 5. Functions and scope -------------------------------------------------------------- */
  { id: 'functions', hub: 'functions', topic: 'functions',
    title: 'Functions: parameters, arguments and return',
    summary: 'A function is a named, reusable block of code: it receives inputs through its **parameters**, runs, and hands one result back with `return`.',
    html: [
      '<p>The <strong>parameters</strong> are the placeholders in the definition (<code>function area(width, height)</code>); the <strong>arguments</strong> are the actual values you pass each time (<code>area(3, 4)</code>). Defining a function runs nothing: the body only runs when you <strong>call</strong> it with parentheses.</p>',
      '<dl><dt><code>return value</code></dt><dd>Does two things at once: <strong>sends the value back</strong> to the place where the function was called, and <strong>ends the function</strong>; any line after it is skipped. A function that ends without <code>return</code> gives back <code>undefined</code>.</dd>'
        + '<dt>Argument count</dt><dd>Not checked: a missing argument is <code>undefined</code> inside the function, an extra one is ignored.</dd>'
        + '<dt>Pure function</dt><dd>Its result depends only on its arguments and it changes nothing outside: the easiest kind to test with <code>console.assert</code>.</dd>'
        + '</dl>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'A call hands values in; `return` hands one value back.',
      desc: 'The call area(3, 4) passes the arguments 3 and 4. They become the parameters width and height. The body runs. return sends the result back and ends the function, and the call is replaced by 12 where it was written.',
      nodes: [
        { id: 'call', label: 'The call', note: '`area(3, 4)`' },
        { id: 'params', label: 'Parameters', note: '`width`, `height`' },
        { id: 'body', label: 'The body', note: 'runs' },
        { id: 'ret', label: '`return`', note: 'sends 12 back', key: true },
      ],
      edges: [['call', 'params'], ['params', 'body'], ['body', 'ret']],
    },
    example: '`function area(width, height) { return width * height; }`. `const a = area(3, 4);` stores `12`; `area(3, 4) + area(1, 2)` is `14`, because each call is replaced by its returned value. `area(3)` gives `NaN`: `height` is `undefined` and `3 * undefined` is not a number.',
    mistake: 'Printing instead of returning. `function total(a, b) { console.log(a + b); }` shows the right number in the console, yet `total(2, 3)` **is** `undefined`, so `total(2, 3) * 2` is `NaN` and any test of its result fails. Return the value; let the caller decide whether to print it.',
    live: { kind: 'js', code: `function area(width, height) {
  return width * height;
}

const a = area(3, 4);
console.log(a);
// → 12
console.log(area(3, 4) + area(1, 2));
console.log(area(3));
// → NaN: height is undefined

function logOnly(x) {
  console.log('inside:', x * 2);
}
const r = logOnly(5);
console.log('returned:', r);
// → undefined

// without () you get the function itself
console.log(typeof area);` },
    practice: { href: '#/browser/js/practice/playground', label: 'Write functions in the JavaScript playground' } },

  { id: 'scope-hoisting', hub: 'functions', topic: 'vars',
    title: 'Scope, hoisting and the temporal dead zone',
    summary: 'Scope is the region of code where a name is visible; hoisting is the engine registering every declaration before it runs a scope, so `var` reads as `undefined` early while `let` and `const` throw an error.',
    html: [
      '<p>Before running a block or a function, the engine <strong>scans it and lists the names declared inside</strong>: that is hoisting, as if the declarations were lifted to the top. What each name can do before its own line depends on how it was declared. The stretch between the top of the scope and a <code>let</code> or <code>const</code> line is its <strong>temporal dead zone (TDZ)</strong>.</p>',
      '<h3>Block scope</h3>',
      '<ul><li><strong>A block</strong> is any pair of braces: <code>if</code>, <code>for</code>, <code>while</code> or a bare <code>{ }</code>.</li>'
        + '<li><strong><code>let</code> and <code>const</code></strong> live only inside the block where they are declared; <strong><code>var</code></strong> ignores blocks and leaks out to the enclosing function (or the whole script).</li>'
        + '<li><strong>Nested scopes look outward:</strong> inner code can read outer names, but outer code never sees inner ones.</li>'
        + '<li><strong>Shadowing:</strong> an inner <code>let x</code> hides an outer <code>x</code> inside its block; the outer one is untouched.</li>'
        + '<li><strong>Loops:</strong> <code>for (let i = …)</code> gets a fresh <code>i</code> per pass that disappears after the loop; with <code>var i</code> the counter survives the loop.</li>'
        + '</ul>',
      '<p>Why the TDZ is a good thing: a bug that would silently give <code>undefined</code> with <code>var</code> becomes a loud error with <code>let</code>/<code>const</code>.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Every declaration is hoisted; only `let` and `const` are locked until their line.',
      desc: 'Before a scope runs, the engine scans it and registers every declaration. A var is registered with the value undefined. A let or const is registered but locked, in its temporal dead zone, until its line runs. A function declaration is registered complete, body included, so it can be called early.',
      nodes: [
        { id: 'scan', label: 'The engine scans', note: 'the scope, before it runs' },
        { id: 'var', label: '`var`', note: 'set to `undefined`' },
        { id: 'let', label: '`let` / `const`', note: 'locked: the TDZ', key: true },
        { id: 'fn', label: 'Function declaration', note: 'complete, body included' },
      ],
      edges: [['scan', 'var'], ['scan', 'let'], ['scan', 'fn']],
    },
    example: 'Shadowing plus TDZ: `let x = \'outer\'; { console.log(x); let x = \'inner\'; }` throws `ReferenceError` instead of printing `outer`. The inner `let x` was hoisted to the top of its block and is in its TDZ at the `console.log` line, which proves `let` **is** hoisted, just locked.',
    mistake: '"`let` and `const` are not hoisted." They are; they are just unusable until their line. The visible difference with `var` is the error versus the silent `undefined`, not whether hoisting happens.',
    live: { kind: 'js', code: `console.log(a);
    // → undefined: var is hoisted with undefined
var a = 1;

try {
  // b is in its temporal dead zone
  console.log(b);
} catch (err) {
  console.log(err.name); // ReferenceError
}
let b = 2;

if (true) {
  var leaky = 'var escapes the block';
  let tidy = 'let stays inside';
}
console.log(leaky);
console.log(typeof tidy); // 'undefined': not visible out here

for (var i = 0; i < 3; i++) {}
console.log(i);
// → 3: the var counter survived the loop` } },

  { id: 'function-syntaxes', hub: 'functions', topic: 'functions',
    title: 'Declarations, expressions and arrow functions',
    summary: 'A function can be written as a **declaration** (`function f() {}`), as an **expression** stored in a variable (`const f = function () {}`), or as an **arrow function** (`const f = () => …`).',
    html: [
      '<p>All three produce the same thing, a function value you can call. They differ in three details: <strong>hoisting</strong> (can it be called before its line?), <strong>brevity</strong>, and <strong><code>this</code></strong>. A declaration is hoisted complete, so it can be called anywhere in its scope; an expression or an arrow stored in a <code>const</code> follows the <code>const</code> rules, so calling it before its line is a <code>ReferenceError</code> (see <a href="#/browser/js/scope-hoisting">Scope and hoisting</a>).</p>',
      '<table><caption>The three forms of the same function</caption><thead><tr><th scope="col">Form</th><th scope="col">Syntax</th><th scope="col">Callable before its line?</th><th scope="col">Typical use</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row">Declaration</th><td><code>function add(a, b) { return a + b; }</code></td><td>Yes (hoisted)</td><td>Named helpers at the top level of a file</td></tr>'
        + '<tr><th scope="row">Expression</th><td><code>const add = function (a, b) { return a + b; };</code></td><td>No: <code>ReferenceError</code></td><td>Storing or passing a function as a value</td></tr>'
        + '<tr><th scope="row">Arrow</th><td><code>const add = (a, b) =&gt; a + b;</code></td><td>No: <code>ReferenceError</code></td><td>Short helpers and callbacks, functions passed to other functions (see <a href="#/browser/js/function-scope">Functions as values</a>)</td></tr>'
        + '</tbody></table>',
      '<h3>Arrow rules</h3>',
      '<ul><li><strong>One parameter:</strong> the parentheses are optional (<code>n =&gt; n * 2</code>); the code on this site keeps them for consistency.</li>'
        + '<li><strong>Concise body</strong> (no braces): returns its expression automatically, <code>(n) =&gt; n * 2</code>.</li>'
        + '<li><strong>Block body</strong> (braces): needs an explicit <code>return</code>.</li>'
        + '<li><strong>Returning an object literal</strong> from a concise body: wrap it in parentheses, <code>() =&gt; ({ ok: true })</code>, otherwise the braces are read as a block.</li>'
        + '</ul>',
      '<p><strong><code>this</code></strong>, inside a regular function called as a method (<code>player.describe()</code>), is the object before the dot. Arrow functions do <strong>not</strong> get their own <code>this</code>; they use the one of the code around them, so do not write object methods that use <code>this</code> as arrows.</p>',
    ],
    example: '`const toEuros = (cents) => cents / 100;` (concise body, implicit return) and `const toEuros = (cents) => { return cents / 100; };` (block body) are equivalent; `toEuros(1250)` is `12.5` in both.',
    mistake: 'Adding braces to an arrow function and forgetting `return`: `const square = (n) => { n * n; };` makes `square(4)` return `undefined`. Either remove the braces or write `return n * n;`.',
    // works: declarations are hoisted
    live: { kind: 'js', code: `console.log(early(2));
function early(x) {
  return x + 1;
}

try {
  late(2);
} catch (err) {
  console.log(err.name);
  // → ReferenceError: const not ready yet
}
const late = function (x) {
  return x + 1;
};

const square = (n) => n * n;
const squareBraces = (n) => { n * n; };
console.log(square(4), squareBraces(4));

const makeUser = (name) => ({ name: name, active: true });
console.log(makeUser('Ana'));` } },

  { id: 'default-parameters', hub: 'functions', topic: 'functions',
    title: 'Default parameters',
    summary: 'A default parameter (`function f(x = 10)`) supplies the value to use when the caller passes nothing, or passes `undefined`, for that parameter.',
    html: [
      '<p>The default is a <strong>fallback filled in at call time</strong>, only when the argument is <code>undefined</code>: missing, or passed as <code>undefined</code>. Any other value, including <code>null</code>, <code>0</code> and <code>\'\'</code>, is used as given. The default expression is evaluated on each call and can use earlier parameters: <code>function box(w, h = w)</code> makes a square when <code>h</code> is missing.</p>',
      '<p><strong>Put parameters with defaults last.</strong> Arguments are matched by position, so a default in the middle can only be used by passing <code>undefined</code> in its place.</p>',
    ],
    example: 'Shipping: `function shippingCost(weightKg, ratePerKg = 4) { return weightKg * ratePerKg; }`. `shippingCost(2)` is `8` (default used), `shippingCost(2, 6)` is `12`, `shippingCost(2, undefined)` is `8`, and `shippingCost(2, null)` is `0`, because `null` is a value and `2 * null` is `0`.',
    mistake: 'Using the old pattern `rate = rate || 4` inside the function. It also replaces a legitimate `0` (free shipping) by 4. A default parameter only replaces `undefined`.',
    live: { kind: 'js', code: `function shippingCost(weightKg, ratePerKg = 4) {
  return weightKg * ratePerKg;
}
console.log(shippingCost(2));
// → 8
console.log(shippingCost(2, 6));
// → 12
console.log(shippingCost(2, undefined)); // 8
console.log(shippingCost(2, null));
// → 0
console.log(shippingCost(2, 0));
// → 0: free shipping kept

function box(w, h = w) {
  return w + ' x ' + h;
}
console.log(box(3), box(3, 5));` } },

  { id: 'function-scope', hub: 'functions', topic: 'functions',
    title: 'Function scope and functions as values',
    summary: 'Variables and parameters declared inside a function exist only inside it, for the duration of each call; and functions are values that can be stored, passed to other functions and returned.',
    html: [
      '<p>Each call of a function gets a <strong>fresh scope</strong>. From inside, the function can read outer variables; from outside, nobody can see in: its local variables and parameters do not exist outside, and they are recreated on every call. That is what lets two functions both use a variable called <code>total</code> without interfering.</p>',
      '<p>Functions are <strong>first-class values</strong>: you can store one in a variable, put it in an array or object, pass it as an argument and return it. A function passed to another function so that it can be called later is a <strong>callback</strong>; that is how <code>map</code> and <code>filter</code> work (see <a href="#/browser/js/array-methods">Array methods</a>).</p>',
      '<ul><li><strong>Prefer <code>return</code></strong> over changing outer variables from inside a function: it keeps functions pure and testable.</li>'
        + '<li><strong>Pass the name, not a call:</strong> <code>applyTwice(double, 3)</code> hands over the function; <code>applyTwice(double(), 3)</code> calls it immediately and hands over its result.</li>'
        + '</ul>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Inner scopes see outward; outer code never sees in.',
      desc: 'Three nested scopes, innermost first. A block inside a function can read the function\'s variables and the global ones. A function call can read the global scope, where rate lives. The global scope cannot see a function\'s local variables, such as result.',
      nodes: [
        { id: 'block', label: 'A block', note: '`let` inside `{ }`' },
        { id: 'call', label: 'A function call', note: '`x`, `result`', key: true },
        { id: 'global', label: 'The global scope', note: '`rate`' },
      ],
      edges: [],
    },
    example: '`function applyTwice(fn, value) { return fn(fn(value)); }` receives a function as its first argument. `applyTwice((n) => n + 3, 1)` computes `(1 + 3) + 3 = 7`; `applyTwice((s) => s + \'!\', \'hi\')` gives `\'hi!!\'`.',
    mistake: 'Expecting to read a function\'s local variable from outside: after `function scale(x) { const result = x * 2; return result; }`, writing `console.log(result)` at the top level is a `ReferenceError`. Use the returned value: `const r = scale(5);`.',
    live: { kind: 'js', code: `const rate = 2;
function scale(x) {
  // reads the outer rate
  const result = x * rate;
  return result;
}
console.log(scale(5));
// → 10
console.log(typeof result);
// → 'undefined': local to scale

function applyTwice(fn, value) {
  return fn(fn(value));
}
console.log(applyTwice((n) => n + 3, 1));
console.log(applyTwice((s) => s + '!', 'hi'));

const tools = [Math.floor, Math.ceil];
// a function stored in an array
console.log(tools[1](2.1));` } },

  { id: 'array-methods', hub: 'functions', topic: 'data',
    title: 'Array methods: forEach, map, filter, find, includes',
    summary: 'Array methods run a function you give them (a **callback**) on each element: `forEach` does something, `map` transforms, `filter` keeps some, `find` returns the first match, and `includes` checks membership.',
    html: [
      '<p>The method runs the loop for you; the small <a href="#/browser/js/function-scope">callback</a> you hand it says what to do with <strong>one</strong> element, usually written as an arrow function: <code>(price) =&gt; price * 2</code>. Choose the method by what you want back.</p>',
      '<table><caption>What each method returns (none of them changes the original array)</caption><thead><tr><th scope="col">Method</th><th scope="col">The callback returns…</th><th scope="col">The method returns…</th></tr>'
        + '</thead>'
        + '<tbody><tr><th scope="row"><code>arr.forEach(fn)</code></th><td>nothing useful</td><td><code>undefined</code>: use it for an action per element</td></tr>'
        + '<tr><th scope="row"><code>arr.map(fn)</code></th><td>the new value for this element</td><td>a <strong>new array</strong>, same length</td></tr>'
        + '<tr><th scope="row"><code>arr.filter(fn)</code></th><td>true/false: keep it?</td><td>a <strong>new array</strong>, possibly shorter or empty</td></tr>'
        + '<tr><th scope="row"><code>arr.find(fn)</code></th><td>true/false: is this the one?</td><td>the <strong>first</strong> match, or <code>undefined</code></td></tr>'
        + '<tr><th scope="row"><code>arr.includes(value)</code></th><td>(no callback)</td><td><code>true</code> or <code>false</code>, comparing with <code>===</code></td></tr>'
        + '</tbody></table>',
    ],
    example: 'Prices `[12, 45, 8, 30]`: `prices.map((p) => p * 2)` gives `[24, 90, 16, 60]`; `prices.filter((p) => p < 20)` gives `[12, 8]`; `prices.find((p) => p > 40)` gives `45`; `prices.includes(8)` is `true` but `prices.includes(\'8\')` is `false` (string versus number). `prices` itself is still `[12, 45, 8, 30]`.',
    mistake: 'Writing a `map` callback with braces but no `return`: `prices.map((p) => { p * 2; })` gives `[undefined, undefined, undefined, undefined]`. With braces, an arrow function needs an explicit `return`; without braces (`(p) => p * 2`) the value is returned automatically. Similarly, `const doubled = prices.forEach(…)` is always `undefined`: `forEach` returns nothing.',
    live: { kind: 'js', code: `const prices = [12, 45, 8, 30];

prices.forEach((p) => console.log('price', p));
console.log(prices.map((p) => p * 2));
console.log(prices.filter((p) => p < 20));
console.log(prices.find((p) => p > 40));
console.log(prices.find((p) => p > 100));
// → undefined
console.log(prices.includes(8), prices.includes('8'));
// unchanged
console.log(prices);

console.log(prices.map((p) => { p * 2; })); // missing return` },
    practice: { href: '#/browser/js/practice/playground', label: 'Try the methods in the JavaScript playground' } },
];

DATA.en.JS_QUIZ = [
  /* basics */
  { type: 'mc', topic: 'basics',
    q: 'You run a script with `node app.js` and it stops with `ReferenceError: document is not defined`. What is the most likely reason?',
    choices: ['The file has a syntax error', 'You must declare `document` with `let` first', 'Node.js has no web page, so the browser\'s `document` object does not exist there', 'Node.js only runs TypeScript'],
    answer: 2,
    why: 'The core language is the same, but `document` is provided by the browser environment. Node.js has no page to represent.' },
  { type: 'tf', topic: 'basics',
    q: '"Single-threaded" means that while a long `for` loop is running, the page cannot respond to a click until the loop ends.',
    answer: true,
    why: 'One statement runs at a time on the single thread; a click handler has to wait until the running code finishes.' },
  { type: 'mc', topic: 'basics',
    q: 'A file contains `console.assert(2 + 2 === 4, \'maths\');` and `console.assert(\'a\' === \'A\', \'case\');`. What appears in the console?',
    choices: ['Only `Assertion failed: case`', '`maths` and `case`', 'Only `Assertion failed: maths`', 'Nothing at all'],
    answer: 0,
    why: '`console.assert` is silent when its condition is true and prints `Assertion failed: …` only when it is false. `\'a\' === \'A\'` is false (comparison is case-sensitive).' },
  { type: 'mc', topic: 'basics',
    q: 'Which error type do you get when a closing brace is missing, so that the engine cannot read the file at all?',
    choices: ['`ReferenceError`', '`TypeError`', '`RangeError`', '`SyntaxError`'],
    answer: 3,
    why: 'A `SyntaxError` is raised while parsing: none of the file runs. Reference and type errors happen while the code is running.' },
  { type: 'mc', topic: 'basics',
    q: 'The console shows `TypeError: Cannot read properties of undefined (reading \'price\')` for the line `total += item.price;`. What does it tell you?',
    choices: ['`price` is misspelled', '`item` is `undefined` at that moment', '`total` is a `const`', '`+=` does not work with numbers'],
    answer: 1,
    why: 'The message says it tried to read `price` **of** `undefined`: the value before the dot is `undefined`. The cause is upstream, where `item` was supposed to get a value.' },
  { type: 'mc', topic: 'basics',
    q: 'What does this print? `try { console.log(\'a\'); throw new Error(\'x\'); console.log(\'b\'); } catch (err) { console.log(\'c\'); } finally { console.log(\'d\'); }`',
    choices: ['a b c d', 'a c d', 'a c', 'a d'],
    answer: 1,
    why: 'The `throw` skips the rest of the `try` block (no `b`), the `catch` block runs (`c`), and `finally` runs on every path (`d`).' },
  { type: 'tf', topic: 'basics',
    q: 'When no line inside the `try` block throws, the `catch` block still runs once, with `err` set to `undefined`.',
    answer: false,
    why: 'The `catch` block runs only when something in the `try` block throws. Without an error it is skipped; only `finally` runs on both paths.' },

  /* vars */
  { type: 'mc', topic: 'vars',
    q: 'Which declaration fits a running total that a loop increases on every pass?',
    choices: ['`let total = 0;`', '`const total = 0;`', '`var total;` inside the loop', '`total = 0;` with no keyword'],
    answer: 0,
    why: 'The name must be reassigned (`total = total + x`), so it needs `let`; `const` would throw a `TypeError` on the first reassignment.' },
  { type: 'tf', topic: 'vars',
    q: '`const tags = []; tags.push(\'js\');` throws an error because `tags` is a constant.',
    answer: false,
    why: '`const` stops the name from being reassigned, not the array from being changed. `push` mutates the same array, which is allowed.' },
  { type: 'mc', topic: 'vars',
    q: 'What does this print? `console.log(x); var x = 3;`',
    choices: ['`3`', '`ReferenceError`', '`undefined`', '`null`'],
    answer: 2,
    why: '`var` declarations are hoisted and initialised to `undefined`; the assignment `= 3` only happens when its line runs.' },
  { type: 'mc', topic: 'vars',
    q: 'What does this print? `console.log(y); let y = 3;`',
    choices: ['`3`', 'It throws a `ReferenceError`', '`undefined`', '`null`'],
    answer: 1,
    why: '`let` is hoisted but stays in the temporal dead zone until its line runs, so reading it earlier throws a `ReferenceError`.' },
  { type: 'mc', topic: 'vars',
    q: 'After `if (true) { let a = 1; var b = 2; }`, which names can be read on the next line, outside the block?',
    choices: ['Both `a` and `b`', 'Only `a`', 'Neither', 'Only `b`'],
    answer: 3,
    why: '`let` is block-scoped, so `a` exists only inside the braces. `var` ignores blocks and leaks out to the enclosing function or script.' },
  { type: 'fib', topic: 'vars',
    q: 'The stretch of a block where a `let` or `const` already exists but cannot be touched yet is called the temporal ___ zone.',
    accept: ['dead'],
    why: 'The temporal dead zone runs from the top of the scope to the declaration line; reading the name there throws a `ReferenceError`.' },

  /* types */
  { type: 'mc', topic: 'types',
    q: 'What is `typeof null`?',
    choices: ['`\'null\'`', '`\'undefined\'`', '`\'object\'`', '`\'boolean\'`'],
    answer: 2,
    why: 'A historical bug that was never fixed for compatibility. Test for null with `value === null`.' },
  { type: 'mc', topic: 'types',
    q: 'Which is the reliable way to check that `value` is an array?',
    choices: ['`Array.isArray(value)`', '`typeof value === \'object\'`', '`typeof value === \'array\'`', '`value.length > 0`'],
    answer: 0,
    why: '`typeof` reports `\'object\'` for arrays, plain objects and `null` alike; `Array.isArray` answers exactly the question.' },
  { type: 'mc', topic: 'types',
    q: 'What is `\'7\' + 3`?',
    choices: ['`10`', '`NaN`', '`\'10\'`', '`\'73\'`'],
    answer: 3,
    why: 'With a string on either side, `+` concatenates: the number 3 is coerced to `\'3\'`.' },
  { type: 'mc', topic: 'types',
    q: 'What is `\'7\' - 3`?',
    choices: ['`\'73\'`', '`4`', '`\'4\'`', '`NaN`'],
    answer: 1,
    why: '`-` only works on numbers, so `\'7\'` is coerced to 7 and the result is the number 4.' },
  { type: 'tf', topic: 'types',
    q: '`0 == \'\'` and `0 === \'\'` are both true.',
    answer: false,
    why: '`==` converts `\'\'` to 0 and says true; `===` compares types first (number vs string) and says false.' },
  { type: 'mc', topic: 'types',
    q: 'Which of these values is **truthy**?',
    choices: ['`[]`', '`\'\'`', '`0`', '`NaN`'],
    answer: 0,
    why: 'An empty array is an object, and every object is truthy. `0`, `\'\'` and `NaN` are on the short falsy list.' },
  { type: 'mc', topic: 'types',
    q: 'Which value is **falsy**?',
    choices: ['`\'0\'`', '`\'false\'`', '`undefined`', '`-1`'],
    answer: 2,
    why: '`\'0\'` and `\'false\'` are non-empty strings and `-1` is a non-zero number, so all three are truthy.' },
  { type: 'fib', topic: 'types',
    q: 'Complete the remainder: `23 % 4` evaluates to ___.',
    accept: ['3'],
    why: '23 = 5 × 4 + 3, so the remainder is 3.' },
  { type: 'mc', topic: 'types',
    q: '`const n = Number(\'twelve\');` What is the correct way to detect that the conversion failed?',
    choices: ['`n === NaN`', '`Number.isNaN(n)`', '`n == NaN`', '`n === undefined`'],
    answer: 1,
    why: '`NaN` is not equal to anything, not even itself, so both comparisons are always false. `Number.isNaN` is the dedicated test.' },
  { type: 'mc', topic: 'types',
    q: 'With `const team = \'Riverside\';`, what does the template literal `${team} has ${team.length} letters` (written between backticks) produce?',
    choices: ['A `SyntaxError`', '`${team} has ${team.length} letters`', '`Riverside has team.length letters`', '`Riverside has 9 letters`'],
    answer: 3,
    why: 'Inside backticks, each `${…}` is replaced by the value of its expression; `\'Riverside\'.length` is 9.' },
  { type: 'tf', topic: 'types',
    q: 'After `let s = \'hi\'; s.toUpperCase();`, the variable `s` contains `\'HI\'`.',
    answer: false,
    why: 'Strings are immutable: `toUpperCase` returns a new string, which was discarded. You would need `s = s.toUpperCase();`.' },

  /* logic */
  { type: 'mc', topic: 'logic',
    q: 'What does `\'\' || \'anonymous\'` evaluate to?',
    choices: ['`true`', '`\'\'`', '`\'anonymous\'`', '`false`'],
    answer: 2,
    why: '`||` returns the first truthy operand, or the last one if none is truthy. `\'\'` is falsy, so it returns `\'anonymous\'` itself, not `true`.' },
  { type: 'mc', topic: 'logic',
    q: 'A user set their daily notification limit to `0` on purpose (no notifications at all). Which line keeps that 0 and falls back to 5 only when the setting is missing?',
    choices: ['`const limit = setting ?? 5;`', '`const limit = setting || 5;`', '`const limit = setting && 5;`', '`const limit = !setting;`'],
    answer: 0,
    why: '`??` only falls back on `null` or `undefined`; `||` would also replace the legitimate falsy value `0`.' },
  { type: 'tf', topic: 'logic',
    q: 'In `false && sendEmail()`, the function `sendEmail` is never called.',
    answer: true,
    why: 'Short-circuit: once the left side of `&&` is falsy the result is known, so the right side is not evaluated.' },
  { type: 'mc', topic: 'logic',
    q: 'With `const temp = 30;`, what is stored by `const msg = temp > 25 ? \'hot\' : \'mild\';`?',
    choices: ['`true`', '`30`', '`\'mild\'`', '`\'hot\'`'],
    answer: 3,
    why: 'The ternary is an expression: the condition is true, so it produces the value before the colon.' },
  { type: 'mc', topic: 'logic',
    q: 'In a `switch`, a matching `case` has no `break`. What happens?',
    choices: ['A `SyntaxError`', 'Execution falls through into the following cases until a `break` or the end', 'Only that case runs', 'The `default` branch runs instead'],
    answer: 1,
    why: 'Without `break`, the code of the next cases runs too (fall-through). That is why each case normally ends with `break`.' },
  { type: 'mc', topic: 'logic',
    q: 'How many times does the body of `for (let i = 2; i < 8; i += 2) { … }` run?',
    choices: ['2', '3', '4', '6'],
    answer: 1,
    why: 'Trace it: i = 2, 4, 6 pass the check; at i = 8 the check `8 < 8` is false. Three passes.' },
  { type: 'mc', topic: 'logic',
    q: 'What does this print? `for (const ch of \'abc\') console.log(ch);`',
    choices: ['`0`, `1`, `2`', '`abc` once', '`a`, `b`, `c`', 'A `TypeError`: strings are not iterable'],
    answer: 2,
    why: '`for...of` walks the values of an iterable; for a string, each value is one character.' },
  { type: 'mc', topic: 'logic',
    q: 'Inside a loop, what does `continue` do?',
    choices: ['Leaves the loop completely', 'Skips the rest of the current pass and moves on to the next one', 'Restarts the loop from the first pass', 'Pauses the program'],
    answer: 1,
    why: '`continue` jumps to the next check of the loop; `break` is the one that leaves it.' },
  { type: 'tf', topic: 'logic',
    q: '`for (const i in [\'a\', \'b\'])` gives `i` the numbers 0 and 1.',
    answer: false,
    why: '`for...in` gives property names, which are strings: `\'0\'` and `\'1\'`. That is one reason to avoid it on arrays.' },

  /* data */
  { type: 'mc', topic: 'data',
    q: 'For `const days = [\'Mon\', \'Tue\', \'Wed\', \'Thu\'];`, which expression gives `\'Thu\'` and keeps working if more days are added?',
    choices: ['`days[4]`', '`days[days.length]`', '`days.last`', '`days[days.length - 1]`'],
    answer: 3,
    why: 'Indexes run from 0 to `length - 1`, so the last element is at `length - 1`. `days[4]` and `days[days.length]` are past the end (`undefined`).' },
  { type: 'mc', topic: 'data',
    q: 'What does `[3, 8, 1].map((n) => n * 10)` return?',
    choices: ['`undefined`', '`90`', '`[30, 80, 10]`', '`[3, 8, 1]` changed in place'],
    answer: 2,
    why: '`map` builds a new array of the same length from the values the callback returns; the original stays as it was.' },
  { type: 'mc', topic: 'data',
    q: 'What does `[5, 12, 7, 20].find((n) => n > 10)` return?',
    choices: ['`12`', '`[12, 20]`', '`true`', '`1`'],
    answer: 0,
    why: '`find` returns the first element for which the callback is truthy. `filter` would return the array `[12, 20]`.' },
  { type: 'mc', topic: 'data',
    q: 'With `const key = \'email\';` and `const user = { email: \'a@b.es\' };`, which expression returns `\'a@b.es\'`?',
    choices: ['`user.key`', '`user.[key]`', '`user[\'key\']`', '`user[key]`'],
    answer: 3,
    why: 'Bracket notation evaluates the expression inside, so `user[key]` is `user[\'email\']`. `user.key` and `user[\'key\']` look for a property literally named `key`.' },
  { type: 'mc', topic: 'data',
    q: 'What does this print? `const a = [1, 2]; const b = a; b.push(3); console.log(a.length);`',
    choices: ['`2`', '`3`', '`undefined`', 'A `TypeError` because `a` is `const`'],
    answer: 1,
    why: '`b = a` copies the reference, so both names point at the same array; pushing through `b` is visible through `a`.' },
  { type: 'tf', topic: 'data',
    q: '`[1, 2] === [1, 2]` is `true` because both arrays contain the same values.',
    answer: false,
    why: '`===` on objects compares identity (the same array in memory), not contents. These are two different arrays.' },
  { type: 'fib', topic: 'data',
    q: 'To make an independent (shallow) copy of the array `list`, write `const copy = [___list];`.',
    accept: ['...'],
    why: 'The spread syntax `...` puts every element of `list` into a brand-new array.' },
  { type: 'mc', topic: 'data',
    q: 'What does `const r = [1, 2].forEach((n) => n * 2);` store in `r`?',
    choices: ['`undefined`', '`[1, 2]`', '`[2, 4]`', '`6`'],
    answer: 0,
    why: '`forEach` runs the callback for its effect and returns nothing. Use `map` to collect the transformed values.' },

  { type: 'mc', topic: 'data',
    q: 'What does `JSON.stringify({ name: \'Ana\', age: undefined, greet() {} })` return?',
    choices: ['`\'{"name":"Ana"}\'`', '`\'{"name":"Ana","age":undefined}\'`', '`{ name: \'Ana\' }`, an object', '`\'{"name":"Ana","age":null,"greet":null}\'`'],
    answer: 0,
    why: 'JSON has no `undefined` and no functions, so those properties are dropped. The result is a **string** of JSON text, not an object.' },
  { type: 'fib', topic: 'data',
    q: 'To turn the JSON text `\'{"title":"Buy milk"}\'` back into an object you can read with `.title`, call `JSON.___(text)`.',
    accept: ['parse', 'parse(text)'],
    why: '`JSON.parse` reads JSON text and builds a new value; `JSON.stringify` goes the other way. Bad text makes `parse` throw a `SyntaxError`.' },

  /* functions */
  { type: 'mc', topic: 'functions',
    q: 'In the call `convert(100, \'USD\')`, what are `100` and `\'USD\'`?',
    choices: ['Parameters', 'Return values', 'Arguments', 'Default values'],
    answer: 2,
    why: 'Arguments are the actual values supplied at call time; parameters are the names in the function definition that receive them.' },
  { type: 'mc', topic: 'functions',
    q: 'What does `half(9)` return? `function half(n) { console.log(n / 2); }`',
    choices: ['`4.5`', '`undefined`', '`4`', '`\'4.5\'`'],
    answer: 1,
    why: 'The function prints 4.5 but has no `return`, so the value given back to the caller is `undefined`.' },
  { type: 'mc', topic: 'functions',
    q: 'Which arrow function returns an **object** with a property `ok` set to `true`?',
    choices: ['`() => { ok: true }`', '`() => return { ok: true }`', '`() => [ok: true]`', '`() => ({ ok: true })`'],
    answer: 3,
    why: 'Without parentheses the braces are read as a block body (containing a label), so the function returns `undefined`. Parentheses make them an object literal.' },
  { type: 'mc', topic: 'functions',
    q: 'Which function can be called on a line **above** its definition without an error?',
    choices: ['`const f = () => {};`', '`const f = function () {};`', '`function f() {}`', '`let f = () => {};`'],
    answer: 2,
    why: 'Declarations are hoisted with their body. The other three are values stored in `const`/`let`, which are in the temporal dead zone until their line.' },
  { type: 'mc', topic: 'functions',
    q: 'With `function tag(text, level = 1) { return \'h\' + level + \':\' + text; }`, what is `tag(\'Hi\', null)`?',
    choices: ['`\'hnull:Hi\'`', '`\'h1:Hi\'`', '`\'h0:Hi\'`', '`\'hundefined:Hi\'`'],
    answer: 0,
    why: 'A default only replaces `undefined`. `null` is a real value, so it is used and concatenated as `\'null\'`.' },
  { type: 'tf', topic: 'functions',
    q: 'Writing `applyTwice(double(), 3)` passes the function `double` for `applyTwice` to call.',
    answer: false,
    why: '`double()` calls the function immediately and passes its return value. Pass the function itself, without parentheses: `applyTwice(double, 3)`.' },
  { type: 'fib', topic: 'functions',
    q: 'A function passed as an argument to another function, to be called by it later, is called a ___.',
    accept: ['callback', 'callback function'],
    why: 'Callbacks are how `map`, `filter` and `forEach` know what to do with each element.' },
];
