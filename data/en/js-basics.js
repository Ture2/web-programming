'use strict';
/* JavaScript: concept cards, rail groups and self-check quiz. See site/README.md for the data
   contract. `live` snippets run in a Web Worker (no DOM), so every output claimed in the text
   was checked with Node. */

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
  { key: 'vars', label: 'Variables and scope', icon: 'key' },
  { key: 'types', label: 'Types and values', icon: 'table' },
  { key: 'logic', label: 'Logic and control flow', icon: 'split' },
  { key: 'data', label: 'Arrays and objects', icon: 'cluster' },
  { key: 'functions', label: 'Functions', icon: 'code' },
];

DATA.en.JS_CONCEPTS = [
  /* ---- 1. Running JavaScript ---------------------------------------------------- */
  { id: 'what-is-js', hub: 'basics', topic: 'basics', 
    title: 'What JavaScript is and where it runs',
    summary: 'JavaScript is the programming language of the web: browsers run it to make pages react to the user, and Node.js runs the same language outside the browser.',
    body: [
      'Think of a web page in three layers: **HTML** is the structure (the nouns), **CSS** is the presentation (the adjectives) and **JavaScript** is the behaviour (the verbs). A program called a JavaScript **engine** (V8 in Chrome and Node.js, SpiderMonkey in Firefox) reads your code and runs it statement by statement, from top to bottom.',
      'The **core language** (variables, numbers, strings, `if`, loops, functions, arrays, objects) is identical everywhere. What changes is the **environment** around it: in the browser your code also gets `document` (the page, see [What the DOM is](#/browser/dom/what-is-dom)) and `window`; in **Node.js** (see [What Node.js is](#/server/runtime/what-is-node)) there is no page, so no `document`, but there is access to files and the network.',
      'Three words you will meet in almost every description of JavaScript, defined: **dynamically typed** means you never write a type; the value decides it at run time and a variable can hold a number now and a string later. **Single-threaded** means one statement runs at a time: while a long loop runs, the page cannot react to clicks. **Interpreted and JIT-compiled** means there is no separate compile step for you; the engine translates frequently used code into machine code on the fly (**Just-In-Time**) to make it fast.',
    ],
    points: [
      'Three common ways to run JavaScript while learning: the **browser console** (F12 → Console), a `<script>` tag in a page, and `node file.js` in a terminal (or the VS Code Code Runner button).',
      'JavaScript is **not** Java: the names are similar for marketing reasons only.',
      'Every statement can end with `;`. JavaScript inserts missing semicolons automatically, but the code on this site always writes them, which avoids a few surprising edge cases.',
    ],
    example: 'Type `2 + 3` in the browser console and it answers `5`; save `console.log(2 + 3);` in `sum.js` and run `node sum.js`: the terminal prints `5`. Now try `typeof document`: the browser console says `\'object\'`, Node says `\'undefined\'`. Same language, different environment. The Try-it box below runs in a background worker with no page, so it behaves like Node here.',
    mistake: 'Assuming `document` exists everywhere. Running a DOM script with `node app.js` stops with `ReferenceError: document is not defined`: the code is fine, but Node has no page to give it.',
    live: { kind: 'js', code: `console.log('Hello from JavaScript');
console.log(2 + 3);
console.log(typeof 42);
console.log(typeof document); // no page here, like Node` },
    practice: { href: '#/browser/js/practice/playground', label: 'Open the JavaScript playground' } },

  { id: 'console', hub: 'basics', topic: 'basics', 
    title: 'The console: console.log and console.assert',
    summary: 'The console is the developer\'s output window: `console.log` prints values, and `console.assert` prints a message only when a check fails.',
    body: [
      'The console is the program\'s notebook: users of the page never see it, but you can print anything there to look inside the running program. When something "does not work", the first move is to print the values involved and compare them with what you expected.',
      '`console.log(a, b, c)` prints several values separated by spaces; strings appear without quotes, arrays and objects are shown with their contents. `console.error` prints in red (and to the error stream in Node).',
      '`console.assert(condition, message)` is a tiny automatic test: when the condition is truthy it prints **nothing**; when it is falsy it prints `Assertion failed: message`. A silent console therefore means every check passed, which makes it a handy way to check your own functions as you write them.',
    ],
    code: `function double(n) {
  return n * 2;
}

console.log('double(4) is', double(4));     // double(4) is 8

console.assert(double(4) === 8, 'double 4');  // silent: passed
console.assert(double(0) === 1, 'double 0');  // Assertion failed: double 0`,
    example: 'You write `celsiusToF(c)` and want to be sure it works. Add three checks under it: `console.assert(celsiusToF(0) === 32, \'freezing\')`, `console.assert(celsiusToF(100) === 212, \'boiling\')`, `console.assert(celsiusToF(-40) === -40, \'same in both\')`. Reload: an empty console means all three passed; `Assertion failed: boiling` tells you exactly which case to fix.',
    mistake: 'Thinking that printing a value is the same as producing it. `console.log` shows a value **to you**; it does not give the value back to the code that called the function. A function that only logs its result returns `undefined` (see "Functions: parameters, arguments and return").',
    live: { kind: 'js', code: `const price = 20;
const quantity = 3;
console.log('price:', price, 'quantity:', quantity);
console.log('total', price * quantity);
console.log(['a', 'b'], { item: 'pen', price: 2 });
console.error('errors print in red');` } },

  { id: 'reading-errors', hub: 'basics', topic: 'basics', 
    title: 'Reading error messages',
    summary: 'An error message names the kind of problem, describes it and points to the file, line and column where JavaScript had to stop.',
    body: [
      'An error is not a verdict on you; it is the engine reporting the **first point where it could not continue**. Read it in three parts: the **type** (`ReferenceError`), the **message** (`total is not defined`) and the **location** (`app.js:12:5` = file, line 12, column 5). The cause is often on an earlier line: the location tells you where the problem became visible.',
      'Code that runs without errors but prints the wrong value has a **logic bug**. Then compare *expected* with *got*: the wrong value itself is a clue about how the code went wrong.',
    ],
    table: {
      caption: 'The three errors you will meet most (messages as Chrome and Node word them)',
      head: ['Type', 'Meaning', 'Typical message', 'Typical cause'],
      rows: [
        ['`SyntaxError`', 'The code cannot even be read; **nothing** in the file runs', '`Unexpected token \'}\'`', 'A missing or extra bracket, quote or comma'],
        ['`ReferenceError`', 'A name does not exist here', '`totl is not defined`', 'A typo, a variable used outside its scope, or a `let`/`const` used before its line'],
        ['`TypeError`', 'The value exists but is the wrong kind for the operation', '`Cannot read properties of undefined (reading \'name\')`, `x is not a function`, `Assignment to constant variable.`', 'Reading a property of `undefined`/`null`, calling something that is not a function, reassigning a `const`'],
      ],
    },
    example: 'A function `average(list)` is tested with `[]` and prints `NaN` instead of `0`. There is no error, so it is a logic bug. `NaN` is the clue: it comes from `0 / 0`, so the sum (0) was divided by the length (0). The fix is to handle the empty list before dividing.',
    mistake: 'Fixing the line the error points at when the real cause is upstream. `TypeError: Cannot read properties of null` on line 20 usually means the variable became `null` earlier, for example because `document.querySelector(\'#sav\')` had a typo and found nothing. Also: fix the **first** error in the console first; later ones are often consequences of it.',
    live: { kind: 'js', code: `try {
  const user = undefined;
  console.log(user.name);
} catch (err) {
  console.log(err.name);    // TypeError
}

try {
  console.log(totl);        // typo for total
} catch (err) {
  console.log(err.name);    // ReferenceError
}

const list = [];
console.log(0 / list.length); // NaN: no error, but a logic bug` } },

  /* ---- 2. Variables and scope ------------------------------------------------- */
  { id: 'let-const-var', hub: 'vars', topic: 'vars', 
    title: 'Declaring variables: let, const and var',
    summary: 'A variable is a name bound to a value: a `const` name can never be pointed at another value, a `let` name can, and `var` is the older keyword with looser rules.',
    body: [
      'Picture a variable as a **name tag stuck on a value**. With `const` the tag is glued: you cannot move it to a different value later. With `let` you can peel it off and stick it on a new value (reassignment). The rule of thumb: **`const` by default**, `let` only when the name must change (counters, running totals), and `var` never in new code; you only need to recognise it in older code.',
      'A `const` must get its value on the same line (`const x;` is a `SyntaxError`). Reassigning it later is a `TypeError: Assignment to constant variable.`',
    ],
    table: {
      caption: 'The three keywords side by side',
      head: ['Keyword', 'Reassign?', 'Scope', 'Used before its line', 'Declare the same name twice'],
      rows: [
        ['`const`', 'No', 'Block `{ }`', '`ReferenceError`', '`SyntaxError`'],
        ['`let`', 'Yes', 'Block `{ }`', '`ReferenceError`', '`SyntaxError`'],
        ['`var`', 'Yes', 'Whole function (ignores blocks)', 'Silently `undefined`', 'Allowed, silently'],
      ],
    },
    example: 'A shopping cart: `const TAX_RATE = 0.21;` never changes, so `const`. `let total = 0;` grows as items are added (`total = total + price;`), so `let`. `const items = [];` is also `const`: you will add items **into** the array, but the name `items` always points at the same array.',
    mistake: '"`const` means the value can never change." It only freezes the **binding** (which value the name points at). `const items = []; items.push(\'pen\');` is legal, because the array is changed, not replaced. See "Values vs references".',
    live: { kind: 'js', code: `let count = 0;
count = count + 1;
console.log(count);           // 1

const city = 'Madrid';
try {
  city = 'Bilbao';
} catch (err) {
  console.log(err.name);      // TypeError
}

const items = [];
items.push('pen');            // allowed: changes the array
console.log(items);` } },

  { id: 'scope-hoisting', hub: 'vars', topic: 'vars', 
    title: 'Scope, hoisting and the temporal dead zone',
    summary: 'Scope is the region of code where a name is visible; hoisting is the engine registering every declaration before it runs a scope, so `var` reads as `undefined` early while `let` and `const` throw an error.',
    body: [
      'Before running a block or a function, the engine **scans it and lists the names declared inside** (that is hoisting: the declarations behave as if lifted to the top). A `var` goes on the list already set to `undefined`. A `let` or `const` goes on the list **locked**: touching it before its declaration line runs throws a `ReferenceError`. The stretch between the top of the scope and that line is the **temporal dead zone (TDZ)**. A function declaration is hoisted complete, body included.',
      '**Block scope**: any pair of braces (`if`, `for`, `while` or a bare `{ }`) is a block. `let` and `const` live only inside the block where they are declared. `var` ignores blocks and leaks out to the enclosing function (or the whole script). **Nested scopes look outward**: inner code can read outer names, but outer code never sees inner ones.',
    ],
    points: [
      '**Shadowing**: an inner `let x` hides an outer `x` inside its block; the outer one is untouched.',
      'A `for (let i = …)` loop gets a fresh `i` per pass that disappears after the loop; with `var i` the counter survives the loop.',
      'Why the TDZ is a good thing: a bug that would silently give `undefined` with `var` becomes a loud error with `let`/`const`.',
    ],
    example: 'Shadowing plus TDZ: `let x = \'outer\'; { console.log(x); let x = \'inner\'; }` throws `ReferenceError` instead of printing `outer`. The inner `let x` was hoisted to the top of its block and is in its TDZ at the `console.log` line, which proves `let` **is** hoisted, just locked.',
    mistake: '"`let` and `const` are not hoisted." They are; they are just unusable until their line. The visible difference with `var` is the error versus the silent `undefined`, not whether hoisting happens.',
    live: { kind: 'js', code: `console.log(a);          // undefined: var is hoisted with undefined
var a = 1;

try {
  console.log(b);        // b is in its temporal dead zone
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
console.log(i);          // 3: the var counter survived the loop` } },

  /* ---- 3. Types and values ------------------------------------------------------ */
  { id: 'data-types', hub: 'types', topic: 'types', 
    title: 'Data types and typeof',
    summary: 'Every value has a type: JavaScript has seven primitive types plus objects, and the `typeof` operator tells you which one a value is, with two famous quirks.',
    body: [
      'In JavaScript the type belongs to the **value**, not to the variable: `let x = 5; x = \'five\';` is legal. **Primitives** are simple, immutable values: `number`, `string`, `boolean`, `undefined`, `null`, plus `bigint` (huge integers, written `10n`) and `symbol` (unique ids), which you will rarely need in this course. **Everything else is an object**: arrays, plain `{ }` objects, functions, dates.',
      '`undefined` and `null` both mean "no value", with different authors. **`undefined`** is the engine\'s default: a declared variable with no value, a missing property, a missing argument, the result of a function without `return`. **`null`** is written by a programmer to say "intentionally empty".',
    ],
    table: {
      caption: 'What typeof answers',
      head: ['Value', '`typeof` value', 'Note'],
      rows: [
        ['`42`, `3.14`, `NaN`', '`\'number\'`', 'One type for integers and decimals; even "Not a Number" is a number'],
        ['`\'hi\'`, `""`', '`\'string\'`', ''],
        ['`true`', '`\'boolean\'`', ''],
        ['`undefined`', '`\'undefined\'`', 'Also for a name that was never declared'],
        ['`null`', '`\'object\'`', 'A historical bug kept for compatibility: test with `value === null`'],
        ['`[1, 2]`, `{ a: 1 }`', '`\'object\'`', 'Arrays are objects: test with `Array.isArray(value)`'],
        ['`function () {}`', '`\'function\'`', 'Functions are objects too, but `typeof` reports them separately'],
      ],
    },
    example: 'The value of a form field is **always a string**: if the user types 42 into an age box, `typeof input.value` is `\'string\'` and `input.value + 1` is `\'421\'`. Converting with `Number(input.value)` gives the number 42.',
    mistake: 'Testing `typeof x === \'object\'` to mean "x is a real object". `null` passes that test too, and the next line `x.name` then crashes with a `TypeError`. Check `x !== null` as well.',
    live: { kind: 'js', code: `console.log(typeof 42, typeof 'hi', typeof true);
console.log(typeof undefined, typeof null);
console.log(typeof [1, 2], Array.isArray([1, 2]));
console.log(typeof function () {});

let x = 5;
x = 'five';          // the value decides the type
console.log(typeof x);` } },

  { id: 'strings', hub: 'types', topic: 'types', 
    title: 'Strings and template literals',
    summary: 'A string is an immutable sequence of characters; template literals (backticks) can embed expressions with `${…}` and span several lines.',
    body: [
      'Picture a string as a **read-only row of characters**: you can read `s.length`, one character with `s[0]` (indexes start at 0) or walk them with `for (const ch of s)`, but you cannot change a character in place. Every string method **returns a new string** and leaves the original untouched.',
      'Single quotes `\'…\'` and double quotes `"…"` are identical. Backtick quotes create a **template literal**: inside it, `${expression}` is replaced by the value of the expression, and line breaks are kept. It replaces long chains of `+`.',
    ],
    table: {
      caption: 'String tools you will use most',
      head: ['Expression', 'Result for `s = \'Riverside FC\'`', 'What it does'],
      rows: [
        ['`s.length`', '`12`', 'Number of characters (a property, no parentheses)'],
        ['`s[0]`, `s[s.length - 1]`', '`\'R\'`, `\'C\'`', 'One character by index'],
        ['`s.toLowerCase()` / `s.toUpperCase()`', '`\'riverside fc\'` / `\'RIVERSIDE FC\'`', 'Case conversion (new string)'],
        ['`s.includes(\'FC\')`', '`true`', 'Does it contain this text? (case-sensitive)'],
        ['`s.indexOf(\'z\')`', '`-1`', 'Position of the first match, `-1` when absent'],
        ['`s.slice(0, 9)`', '`\'Riverside\'`', 'Characters from index 0 up to (not including) 9'],
        ['`\'  hi \'.trim()`', '`\'hi\'`', 'Removes spaces at both ends (useful on user input)'],
        ['`\'a,b,c\'.split(\',\')`', '`[\'a\', \'b\', \'c\']`', 'Cuts a string into an array'],
        ['`[\'a\', \'b\'].join(\'-\')`', '`\'a-b\'`', 'The opposite: glues an array into a string'],
      ],
    },
    example: 'Building a score line: the template literal `${home} ${homeGoals}–${awayGoals} ${away}`, written between backticks, with `home = \'Riverside\'`, `homeGoals = 2`, `awayGoals = 1`, `away = \'Hillside\'` gives `Riverside 2–1 Hillside`. Any expression fits inside `${…}`, even `${homeGoals > awayGoals ? \'win\' : \'no win\'}`.',
    mistake: 'Expecting a method to change the string: after `club.toUpperCase();` the variable `club` is unchanged. Strings are immutable, so keep the result: `const loud = club.toUpperCase();`. A second classic: writing `\'Hello ${user}\'` with normal quotes, which prints the `${user}` literally; interpolation only works between backticks.',
    live: { kind: 'js', code: `const club = 'Riverside FC';
console.log(club.length);
console.log(club[0], club.toUpperCase());
console.log(club.includes('FC'), club.indexOf('z'));
console.log(club.slice(0, 9));
console.log('a,b,c'.split(','));

const goals = 3;
console.log(\`\${club} scored \${goals} goal\${goals === 1 ? '' : 's'}\`);

club.toLowerCase();       // result thrown away...
console.log(club);        // ...so club is unchanged` } },

  { id: 'numbers', hub: 'types', topic: 'types', 
    title: 'Numbers, arithmetic and the remainder operator',
    summary: 'JavaScript has a single number type for integers and decimals; besides `+ - * /` it has `%` (remainder) and `**` (power), and decimals are stored in binary, so some results are slightly off.',
    body: [
      'Every number is stored as a 64-bit binary floating-point value: like a calculator with about 16 significant digits that works in base 2. Most decimals (0.1, 0.2) cannot be written exactly in base 2, which is why `0.1 + 0.2` prints `0.30000000000000004` and why money is **rounded** before it is shown.',
      'The **remainder operator** `%` gives what is left after whole division: `17 % 5` is `2` because 17 = 3 × 5 + 2. It answers divisibility questions: `n % 2 === 0` means "n is even", `n % d === 0` means "d divides n exactly".',
    ],
    points: [
      'Shorthand: `x += 5` means `x = x + 5` (also `-=`, `*=`, `/=`); `x++` adds 1, `x--` subtracts 1.',
      '`Math.round(x)`, `Math.floor(x)` (down), `Math.ceil(x)` (up), `Math.sqrt(x)`, `Math.abs(x)`. Round to cents: `Math.round(x * 100) / 100`. `x.toFixed(2)` also rounds, but returns a **string**.',
      '`Number(\'42\')` → `42`; `Number(\'abc\')` → `NaN` ("Not a Number", the result of failed maths). `NaN` is not equal to anything, not even itself: test it with `Number.isNaN(x)`.',
      'Dividing by zero does not crash: `1 / 0` is `Infinity`.',
    ],
    example: 'Converting 135 minutes into hours and minutes: `Math.floor(135 / 60)` is `2` whole hours and `135 % 60` is `15` minutes left over, so for `m = 135` the template literal `${Math.floor(m / 60)} h ${m % 60} min` (between backticks) prints `2 h 15 min`.',
    mistake: 'Testing `x === NaN` to detect a failed conversion. It is **always** false, even when `x` is `NaN`, because `NaN` never equals anything. Use `Number.isNaN(x)`.',
    live: { kind: 'js', code: `console.log(17 % 5);             // 2
console.log(10 % 2 === 0);       // true: 10 is even
console.log(0.1 + 0.2);
console.log(Math.round(12.3456 * 100) / 100);
console.log(Number('42') + 1, Number('abc'));
console.log(Number('abc') === NaN, Number.isNaN(Number('abc')));

let score = 10;
score += 5;
score++;
console.log(score);              // 16` } },

  { id: 'coercion-equality', hub: 'types', topic: 'types', 
    title: 'Type coercion and == vs ===',
    summary: 'Coercion is JavaScript converting a value to another type automatically; `===` compares type and value without converting, while `==` converts first, so the safe default (and the one used on this site) is `===`.',
    body: [
      'Many operators expect a particular type. When you give them another one, JavaScript does not stop with an error: it **quietly converts** (coerces) the value. `+` with a string on either side becomes text concatenation (`\'5\' + 1` is `\'51\'`); `-`, `*` and `/` convert to numbers (`\'5\' - 1` is `4`); an `if` converts to a boolean (see "Truthy and falsy values").',
      '**Strict equality `===`** is true only when both sides have the same type **and** the same value; it never converts. **Loose equality `==`** first converts the two sides by a long rule table and then compares, which produces results that are hard to predict and not even consistent: `0 == \'\'` and `0 == \'0\'` are both true, yet `\'\' == \'0\'` is false. Use `===` and `!==` always.',
      'For objects and arrays, `===` compares **identity**: `[1] === [1]` is false because they are two different arrays (see "Values vs references"). To convert on purpose, use `Number(x)`, `String(x)` or `Boolean(x)`.',
    ],
    table: {
      caption: 'Loose versus strict equality',
      head: ['Comparison', '`==`', '`===`'],
      rows: [
        ['`\'5\'` and `5`', 'true', 'false'],
        ['`0` and `\'\'`', 'true', 'false'],
        ['`0` and `false`', 'true', 'false'],
        ['`null` and `undefined`', 'true', 'false'],
        ['`\'\'` and `\'0\'`', 'false', 'false'],
        ['`NaN` and `NaN`', 'false', 'false'],
      ],
    },
    example: 'An age gate reads `const raw = \'18\';` from a form. `raw >= 18` is `true` (coerced), `raw === 18` is `false` (string vs number), and `Number(raw) === 18` is `true`. Converting once, at the point where the input enters your code, makes every later comparison predictable.',
    mistake: 'Comparing form input with a number: `if (input.value === 18)` is never true because `input.value` is the string `\'18\'`. Switching to `==` makes it "work" but hides the real problem; convert with `Number()` instead.',
    live: { kind: 'js', code: `console.log('5' + 1);                 // '51': + joins text
console.log('5' - 1);                 // 4: - converts to number
console.log('5' == 5, '5' === 5);
console.log(0 == '', 0 === '');
console.log(null == undefined, null === undefined);
console.log(NaN === NaN);
console.log([1] === [1]);             // two different arrays` } },

  { id: 'truthy-falsy', hub: 'types', topic: 'types', 
    title: 'Truthy and falsy values',
    summary: 'In a condition every value counts as true or false: the falsy values are `false`, `0`, `-0`, `0n`, `\'\'`, `null`, `undefined` and `NaN`; everything else is truthy.',
    body: [
      'An `if` really asks "is there something here?". The falsy values are the **"nothing" values**: false, zero, the empty string, no value (`null`, `undefined`) and a failed number (`NaN`), plus the BigInt zero `0n` that you will rarely meet. **Everything else is truthy**, including empty containers: `[]` and `{}` are truthy, because an empty box is still a box. The strings `\'0\'`, `\'false\'` and `\' \'` are truthy too: they are not empty.',
      '`Boolean(value)` (or `!!value`) shows the verdict JavaScript will use. Truthiness makes short tests possible: `if (name)` rejects both an empty and a missing name; `if (list.length)` means "the list is not empty".',
    ],
    example: 'A search box: `const query = input.value.trim(); if (!query) { showMessage(\'Type something\'); }`. An empty or all-spaces input becomes `\'\'`, which is falsy, so one test covers both cases.',
    mistake: 'Using truthiness when `0` or `\'\'` is a valid value: `if (stock) { … } else { show(\'no data\') }` shows "no data" when the stock is exactly 0. Test the case you really mean, e.g. `stock !== undefined`. The opposite trap: `if (results)` is always true for an array, even an empty one; test `results.length`.',
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

  /* ---- 4. Logic and control flow --------------------------------------------------- */
  { id: 'logical-operators', hub: 'logic', topic: 'logic', 
    title: 'Logical operators and short-circuiting',
    summary: '`&&`, `||` and `??` combine values and stop as soon as the answer is known, returning one of their operands; `!` turns any value into the opposite boolean.',
    body: [
      'Read the operators as decisions about **which operand to hand back**. `a && b`: "if `a` is falsy the answer is `a`, otherwise it is `b`". `a || b`: "if `a` is truthy the answer is `a`, otherwise `b`". `a ?? b` (nullish coalescing): "if `a` is `null` or `undefined` the answer is `b`, otherwise `a`". In an `if` this behaves like true/false, but in an assignment you get the operand itself: `\'\' || \'guest\'` is `\'guest\'`, not `true`.',
      '**Short-circuiting** means the right-hand side is not evaluated at all when the left side already decides. That is what makes the **guard** `user && user.name` safe: if `user` is `undefined`, `.name` is never read. A function call on the right is skipped too.',
      '`!` always returns a real boolean: `!\'hello\'` is `false`, so `!!value` converts any value to `true`/`false`. Precedence: `!` first, then `&&`, then `||`; add parentheses whenever you mix them.',
    ],
    table: {
      caption: 'Defaults: || versus ??',
      head: ['Expression', 'Result', 'Why'],
      rows: [
        ['`\'\' || \'guest\'`', '`\'guest\'`', '`\'\'` is falsy'],
        ['`\'\' ?? \'guest\'`', '`\'\'`', '`\'\'` is not null/undefined'],
        ['`0 || 50`', '`50`', '`0` is falsy'],
        ['`0 ?? 50`', '`0`', '`0` is a real value'],
        ['`undefined ?? 50`', '`50`', 'No value at all'],
      ],
    },
    points: [
      'Optional chaining `a?.b` is the modern guard: it gives `undefined` instead of crashing when `a` is `null` or `undefined`.',
    ],
    example: 'A greeting: `const display = nickname || fullName || \'guest\';` picks the first non-empty name. A volume setting: `const volume = settings.volume ?? 50;` keeps a deliberate volume of `0`, which `||` would wrongly replace by 50.',
    mistake: 'Using `||` for a default when `0`, `\'\'` or `false` is a legitimate value. `const volume = settings.volume || 50` turns a muted player (volume 0) into volume 50. Use `??` when only "missing" should trigger the default.',
    live: { kind: 'js', code: `console.log(true && 'yes');       // 'yes'
console.log(0 && 'never');        // 0
console.log('' || 'guest');       // 'guest'
console.log(0 || 50, 0 ?? 50);    // 50 0
console.log(null ?? 'default');
console.log(!'hello', !!'hello');

function shout() {
  console.log('shout ran');
  return true;
}
console.log(false && shout());    // shout never runs
const user = undefined;
console.log(user && user.name);   // undefined, no crash` } },

  { id: 'conditionals', hub: 'logic', topic: 'logic', 
    title: 'Conditionals: if/else, the ternary and switch',
    summary: 'Conditionals choose which code runs: `if / else if / else` for general branching, the ternary `cond ? a : b` to pick one of two values, and `switch` to compare one value against fixed cases.',
    body: [
      'An `if / else if / else` chain is a road with several forks: the conditions are tested **top to bottom** and only the **first** truthy branch runs; the rest are skipped. So the order matters: put the most specific condition first.',
      'The ternary `condition ? valueIfTrue : valueIfFalse` is an **expression**: it produces a value you can store or print. Use it to choose a value, not to run long actions, and avoid nesting ternaries.',
      '`switch (value)` compares the value against each `case` with **strict equality (`===`)**. Execution starts at the matching case and **falls through** into the next ones until a `break`; `default` runs when no case matches. Stacking cases without `break` (e.g. `case \'Sat\': case \'Sun\':`) is the one useful form of fall-through.',
    ],
    points: [
      'Comparison operators: `===`, `!==`, `<`, `>`, `<=`, `>=`. A single `=` is assignment, not comparison: `if (x = 5)` assigns 5 and is always truthy.',
      'A **guard clause** (an early `return` at the top of a function for the bad case) avoids deep nesting.',
    ],
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
    body: [
      'A loop is a **condition checked before every pass** (iteration). In `for (let i = 0; i < 3; i++)` the start `let i = 0` runs once; then: check `i < 3`, run the body, run the step `i++`, check again… The loop ends the first time the check is false. Tracing a loop on paper (one row per pass: the value of `i`, the check, what the body did) is the fastest way to understand or debug it.',
      'Use `while (condition)` when you do not know the number of passes in advance. The body must change something the condition depends on, or the loop never ends (an **infinite loop** freezes the tab).',
      '`break` leaves the loop immediately; `continue` skips the rest of the current pass and goes to the next check. Inside a function, `return` leaves the loop **and** the whole function.',
    ],
    points: [
      '**Accumulator pattern**: create the result before the loop (`let total = 0` or `const found = []`), update it inside, use it after the loop.',
      '**Off-by-one**: `<` versus `<=` decides whether the last value is included. Check the first and last pass explicitly.',
    ],
    example: 'How many times can you halve 40 before reaching 1? `let n = 40, steps = 0; while (n > 1) { n = Math.floor(n / 2); steps++; }`. Trace: 40 → 20 → 10 → 5 → 2 → 1, so `steps` ends at 5. You could not know "5" before running, which is why `while` fits.',
    mistake: 'Writing `i <= arr.length` to walk an array. The indexes go from `0` to `arr.length - 1`, so the last pass reads `arr[arr.length]`, which is `undefined`. Use `i < arr.length` (or `for...of`).',
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
  if (i % 3 !== 0) continue;   // skip non-multiples
  if (i > 7) break;            // stop completely
  console.log('multiple of 3:', i);
}` },
    widget: 'loop-tracer',
    practice: { href: '#/browser/js/practice/loop-tracer', label: 'Step through loops in the loop tracer' } },

  { id: 'for-of-in', hub: 'logic', topic: 'logic', 
    title: 'for...of, for...in and looping over strings',
    summary: '`for...of` walks the **values** of an array or the characters of a string; `for...in` walks the **keys** of an object and should not be used on arrays.',
    body: [
      '`for (const item of collection)` reads as "for each thing in this collection". There is no index to manage, so there is no off-by-one to get wrong; it is the modern default for arrays. It works on anything **iterable**: arrays, strings (one character per pass) and the NodeLists returned by `querySelectorAll` (see [Selecting elements](#/browser/dom/selecting)). A plain object is **not** iterable: `for...of` on it throws a `TypeError`.',
      '`for (const key in object)` gives each **property name** (a string). Read the value with bracket notation: `object[key]`. On an array it gives the indexes **as strings** (`\'0\'`, `\'1\'`…) and may also include extra properties, so do not use it there.',
    ],
    table: {
      caption: 'Which loop for which job',
      head: ['You need…', 'Use'],
      rows: [
        ['Every value of an array or every character of a string', '`for (const x of arr)`'],
        ['The index as well, or a custom step', '`for (let i = 0; i < arr.length; i++)`'],
        ['Every key of an object', '`for (const key in obj)` or `Object.keys(obj)`'],
        ['Repeat until something happens', '`while (condition)`'],
      ],
    },
    example: 'Counting capital letters in `\'Hello World\'`: `let caps = 0; for (const ch of \'Hello World\') { if (ch !== ch.toLowerCase()) caps++; }` gives `2`. No index, no length, no off-by-one.',
    mistake: 'Using `for...in` on an array and doing arithmetic with the key: `for (const i in tags) console.log(i + 1)` prints `01`, `11`, `21`, because `i` is the **string** `\'0\'` and `+` concatenates.',
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
  console.log(err.name);        // TypeError: objects are not iterable
}` } },

  /* ---- 5. Arrays and objects ------------------------------------------------------- */
  { id: 'arrays', hub: 'data', topic: 'data', 
    title: 'Arrays: indexes, length, push and pop',
    summary: 'An array is an ordered list of values under one name; each value is read by its position, its **index**, which starts at 0.',
    body: [
      'Picture a row of numbered lockers that starts at **0**. `arr[0]` is the first value, `arr.length` is how many there are, and the last one is at `arr.length - 1`. Reading an index that does not exist gives `undefined`, not an error.',
      '`push(x)` adds at the end and `pop()` removes the last element and returns it; `unshift(x)` and `shift()` do the same at the start. `arr[i] = value` replaces one element. An array can hold any mix of values, including objects: an **array of objects** (a list of records) is the everyday shape of data in web pages and in the JSON returned by almost every API.',
      'Arrays are objects: `typeof [] === \'object\'`, so use `Array.isArray(x)` to recognise one. A `const` array can still be changed (pushed, popped, edited); `const` only stops the name from pointing at another array.',
    ],
    example: 'A squad as an array of objects: `const squad = [{ name: \'Elena\', pos: \'GK\' }, { name: \'Sofia\', pos: \'MF\' }];`. `squad.length` is 2, `squad[1].name` is `\'Sofia\'`, and `squad.push({ name: \'Ines\', pos: \'DF\' })` adds a third player.',
    mistake: 'Reading the last element with `arr[arr.length]`. Because indexes start at 0, that position is one past the end and gives `undefined`. The last element is `arr[arr.length - 1]`.',
    live: { kind: 'js', code: `const students = ['Anna', 'Bob', 'Joan'];
console.log(students[0], students.length);
console.log(students[students.length - 1]);  // last
console.log(students[10]);                   // undefined, no error

students.push('Zoe');
const removed = students.pop();
console.log(removed, students.length);

students[1] = 'Bea';
console.log(students);

const squad = [{ name: 'Elena', pos: 'GK' }, { name: 'Sofia', pos: 'MF' }];
console.log(squad[1].name);` } },

  { id: 'array-methods', hub: 'data', topic: 'data', 
    title: 'Array methods: forEach, map, filter, find, includes',
    summary: 'Array methods run a function you give them (a **callback**) on each element: `forEach` does something, `map` transforms, `filter` keeps some, `find` returns the first match, and `includes` checks membership.',
    body: [
      'Think of an assembly line: the method runs the loop for you, and the small function you hand it says what to do with **one** element. A function passed to another function so that it can be called later is a **callback**. Arrow functions are the usual way to write them: `(price) => price * 2`.',
      'Choose by what you want back. Nothing (just an action per element): `forEach`. A new array of the same length with each element transformed: `map`. A new array with only the elements for which the callback returns a truthy value: `filter`. The first element that matches, or `undefined`: `find`. A plain yes/no for "is this exact value in the array?": `includes`, which compares with `===`.',
    ],
    table: {
      caption: 'What each method returns (none of them changes the original array)',
      head: ['Method', 'The callback returns…', 'The method returns…'],
      rows: [
        ['`arr.forEach(fn)`', 'nothing useful', '`undefined`'],
        ['`arr.map(fn)`', 'the new value for this element', 'a **new array**, same length'],
        ['`arr.filter(fn)`', 'true/false: keep it?', 'a **new array**, possibly shorter or empty'],
        ['`arr.find(fn)`', 'true/false: is this the one?', 'the **first** match, or `undefined`'],
        ['`arr.includes(value)`', '(no callback)', '`true` or `false`'],
      ],
    },
    example: 'Prices `[12, 45, 8, 30]`: `prices.map((p) => p * 2)` gives `[24, 90, 16, 60]`; `prices.filter((p) => p < 20)` gives `[12, 8]`; `prices.find((p) => p > 40)` gives `45`; `prices.includes(8)` is `true` but `prices.includes(\'8\')` is `false` (string versus number). `prices` itself is still `[12, 45, 8, 30]`.',
    mistake: 'Writing a `map` callback with braces but no `return`: `prices.map((p) => { p * 2; })` gives `[undefined, undefined, undefined, undefined]`. With braces, an arrow function needs an explicit `return`; without braces (`(p) => p * 2`) the value is returned automatically. Similarly, `const doubled = prices.forEach(…)` is always `undefined`: `forEach` returns nothing.',
    live: { kind: 'js', code: `const prices = [12, 45, 8, 30];

prices.forEach((p) => console.log('price', p));
console.log(prices.map((p) => p * 2));
console.log(prices.filter((p) => p < 20));
console.log(prices.find((p) => p > 40));
console.log(prices.find((p) => p > 100));   // undefined
console.log(prices.includes(8), prices.includes('8'));
console.log(prices);                         // unchanged

console.log(prices.map((p) => { p * 2; })); // missing return` },
    practice: { href: '#/browser/js/practice/playground', label: 'Try the methods in the JavaScript playground' } },

  { id: 'objects', hub: 'data', topic: 'data', 
    title: 'Objects: properties, dot and bracket notation',
    summary: 'An object groups named values, its **properties**, under one variable; you read and write them with dot notation `obj.key` or bracket notation `obj[\'key\']`.',
    body: [
      'An object is a **record with labelled fields**: each property has a name (the **key**, always a string) and a value of any type, including arrays, other objects and functions. A property whose value is a function is a **method**. Where an array answers "which position?", an object answers "which name?".',
      '**Dot notation** `player.name` is for names you know while writing the code. **Bracket notation** `player[key]` is for names held in a variable, or keys with spaces or dashes (`obj[\'shirt-size\']`). Reading a property that does not exist gives `undefined`; reading a property **of** `undefined` throws a `TypeError`, which is why nested access (`user.address.city`) can crash when a level is missing (`user.address?.city` avoids it).',
      'Assigning a new key adds it (`player.club = \'Riverside\'`); `delete player.club` removes it. `Object.keys(obj)` returns the keys as an array, so `Object.keys(obj).length` counts them. Key order follows insertion order for normal names (integer-like keys come first, ascending), but if order is part of your data, use an array.',
    ],
    table: {
      caption: 'Array or object?',
      head: ['', 'Array', 'Object'],
      rows: [
        ['Look values up by', 'position (0, 1, 2…)', 'name (`\'title\'`, `\'price\'`)'],
        ['Best for', 'a list of similar items', 'one item with named fields'],
        ['Literal', '`[ ]`', '`{ }`'],
        ['Count', '`arr.length`', '`Object.keys(obj).length`'],
      ],
    },
    example: 'A player record: `const player = { name: \'Sofia\', number: 10, stats: { goals: 7, assists: 3 } };`. `player.stats.goals` is `7`. To read whichever stat the user chose, `const field = \'assists\'; player.stats[field]` gives `3`.',
    mistake: 'Using dot notation with a variable: `player.stats.field` looks for a property literally called `"field"` and gives `undefined`. When the key is in a variable, use brackets: `player.stats[field]`.',
    live: { kind: 'js', code: `const player = {
  name: 'Sofia',
  number: 10,
  stats: { goals: 7, assists: 3 },
  celebrate() {                 // method shorthand
    return 'Goal!';
  },
};

console.log(player.name, player['number']);
const field = 'assists';
console.log(player.stats[field], player.stats.field);
console.log(player.club);       // undefined: missing key

player.club = 'Riverside';
console.log(Object.keys(player));
console.log(player.celebrate());` } },

  { id: 'value-reference', hub: 'data', topic: 'data', 
    title: 'Values vs references: copying and mutation',
    summary: 'Assigning a primitive copies the value itself; assigning an object or array copies a **reference** to the same data, so a change made through one variable is visible through the other.',
    body: [
      'A primitive (number, string, boolean…) is written **on the variable\'s sticky note itself**. An object or array lives somewhere in memory and the variable holds its **address**. `b = a` always copies the note: for a primitive that is the value, so `a` and `b` are independent; for an object it is the address, so you get **two notes pointing at one house**.',
      'Distinguish **mutation** (changing the object: `list.push(x)`, `obj.key = v`), which every variable pointing at it will see, from **reassignment** (`b = [ ]`), which only moves the one name. That is also why `const` does not freeze an array: it forbids reassignment, not mutation.',
      'To get an independent copy, use the spread syntax: `[...arr]` for arrays, `{ ...obj }` for objects. These are **shallow** copies: nested arrays or objects inside are still shared (`structuredClone(obj)` makes a deep copy). Equality follows the same model: `===` on objects asks "same address?", so `[1] === [1]` is false.',
    ],
    example: 'A function receives a reference too. `function addBonus(scores) { scores.push(10); }` called with `const mine = [7, 8]` leaves `mine` as `[7, 8, 10]` after the call: the function changed the caller\'s array. Writing `return [...scores, 10];` instead returns a new array and leaves `mine` intact.',
    mistake: '"I copied the array, so editing the copy is safe" after writing `const backup = list;`. That copies only the reference: `backup.push(…)` changes `list` too. Use `const backup = [...list];`.',
    live: { kind: 'js', code: `let a = 5;
let b = a;
b = 6;
console.log(a, b);            // 5 6: independent

const list = ['x'];
const alias = list;           // same array
alias.push('y');
console.log(list);

const copy = [...list];       // a new array
copy.push('z');
console.log(list.length, copy.length);

console.log([1] === [1], list === alias);

const team = { name: 'A', players: ['Ana'] };
const clone = { ...team };    // shallow copy
clone.players.push('Bea');
console.log(team.players);    // nested array is shared` },
    widget: 'value-reference' },

  /* ---- 6. Functions ------------------------------------------------------------------ */
  { id: 'functions', hub: 'functions', topic: 'functions', 
    title: 'Functions: parameters, arguments and return',
    summary: 'A function is a named, reusable block of code: it receives inputs through its **parameters**, runs, and hands one result back with `return`.',
    body: [
      'A function is a **recipe**. The **parameters** are the placeholders written in the recipe (`function area(width, height)`); the **arguments** are the actual values you bring each time you cook (`area(3, 4)`). Writing the recipe does not cook anything: the body only runs when you **call** the function with parentheses.',
      '`return value` does two things at once: it **sends the value back** to the place where the function was called, and it **ends the function immediately**; any line after it is skipped. A function that ends without `return` gives back `undefined`.',
      'JavaScript does not check the number of arguments: a missing one is `undefined` inside the function, an extra one is ignored. A function whose result depends only on its arguments and that changes nothing outside is **pure**: it is the easiest kind to test with `console.assert`.',
    ],
    example: '`function area(width, height) { return width * height; }`. `const a = area(3, 4);` stores `12`; `area(3, 4) + area(1, 2)` is `14`, because each call is replaced by its returned value. `area(3)` gives `NaN`: `height` is `undefined` and `3 * undefined` is not a number.',
    mistake: 'Printing instead of returning. `function total(a, b) { console.log(a + b); }` shows the right number in the console, yet `total(2, 3)` **is** `undefined`, so `total(2, 3) * 2` is `NaN` and any test of its result fails. Return the value; let the caller decide whether to print it.',
    live: { kind: 'js', code: `function area(width, height) {
  return width * height;
}

const a = area(3, 4);
console.log(a);                 // 12
console.log(area(3, 4) + area(1, 2));
console.log(area(3));           // NaN: height is undefined

function logOnly(x) {
  console.log('inside:', x * 2);
}
const r = logOnly(5);
console.log('returned:', r);    // undefined

console.log(typeof area);       // without () you get the function itself` },
    practice: { href: '#/browser/js/practice/playground', label: 'Write functions in the JavaScript playground' } },

  { id: 'function-syntaxes', hub: 'functions', topic: 'functions', 
    title: 'Declarations, expressions and arrow functions',
    summary: 'A function can be written as a **declaration** (`function f() {}`), as an **expression** stored in a variable (`const f = function () {}`), or as an **arrow function** (`const f = () => …`).',
    body: [
      'All three produce the same thing, a function value you can call. They differ in three details: **hoisting** (can it be called before its line?), **brevity**, and **`this`**. A declaration is hoisted complete, so it can be called anywhere in its scope. An expression or an arrow function is stored in a `const`, so it follows the `const` rules: calling it before its line is a `ReferenceError` (temporal dead zone).',
      'Arrow rules: with exactly one parameter the parentheses are optional (`n => n * 2`, though the code on this site keeps them for consistency). A **concise body** (no braces) returns its expression automatically: `(n) => n * 2`. A **block body** (braces) needs an explicit `return`. To return an object literal from a concise body, wrap it in parentheses: `() => ({ ok: true })`, otherwise the braces are read as a block.',
      '`this` is a keyword that, inside a regular function called as a method (`player.describe()`), refers to the object before the dot. Arrow functions do **not** get their own `this`; they use the one of the code around them. Consequence: do not write object methods that use `this` as arrows. In everyday page scripts you rarely need `this` at all; arrows are ideal for callbacks.',
    ],
    table: {
      caption: 'The three forms of the same function',
      head: ['Form', 'Syntax', 'Callable before its line?', 'Typical use'],
      rows: [
        ['Declaration', '`function add(a, b) { return a + b; }`', 'Yes (hoisted)', 'Named helpers at the top level of a file'],
        ['Expression', '`const add = function (a, b) { return a + b; };`', 'No: `ReferenceError`', 'Storing or passing a function as a value'],
        ['Arrow', '`const add = (a, b) => a + b;`', 'No: `ReferenceError`', 'Short helpers and callbacks (`map`, `addEventListener`)'],
      ],
    },
    example: '`const toEuros = (cents) => cents / 100;` (concise body, implicit return) and `const toEuros = (cents) => { return cents / 100; };` (block body) are equivalent; `toEuros(1250)` is `12.5` in both.',
    mistake: 'Adding braces to an arrow function and forgetting `return`: `const square = (n) => { n * n; };` makes `square(4)` return `undefined`. Either remove the braces or write `return n * n;`.',
    live: { kind: 'js', code: `console.log(early(2));     // works: declarations are hoisted
function early(x) {
  return x + 1;
}

try {
  late(2);
} catch (err) {
  console.log(err.name);   // ReferenceError: const not ready yet
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
    body: [
      'The default is a **fallback filled in at call time**, only when the argument is `undefined`, either because it was missing or because `undefined` was passed explicitly. Any other value, including `null`, `0` and `\'\'`, is used as given. The default expression is evaluated on each call and can use earlier parameters: `function box(w, h = w)` makes a square when `h` is missing.',
      'Put parameters with defaults **last**. Arguments are matched by position, so a default in the middle can only be used by passing `undefined` in its place.',
    ],
    example: 'Shipping: `function shippingCost(weightKg, ratePerKg = 4) { return weightKg * ratePerKg; }`. `shippingCost(2)` is `8` (default used), `shippingCost(2, 6)` is `12`, `shippingCost(2, undefined)` is `8`, and `shippingCost(2, null)` is `0`, because `null` is a value and `2 * null` is `0`.',
    mistake: 'Using the old pattern `rate = rate || 4` inside the function. It also replaces a legitimate `0` (free shipping) by 4. A default parameter only replaces `undefined`.',
    live: { kind: 'js', code: `function shippingCost(weightKg, ratePerKg = 4) {
  return weightKg * ratePerKg;
}
console.log(shippingCost(2));            // 8
console.log(shippingCost(2, 6));         // 12
console.log(shippingCost(2, undefined)); // 8
console.log(shippingCost(2, null));      // 0
console.log(shippingCost(2, 0));         // 0: free shipping kept

function box(w, h = w) {
  return w + ' x ' + h;
}
console.log(box(3), box(3, 5));` } },

  { id: 'function-scope', hub: 'functions', topic: 'functions', 
    title: 'Function scope and functions as values',
    summary: 'Variables and parameters declared inside a function exist only inside it, for the duration of each call; and functions are values that can be stored, passed to other functions and returned.',
    body: [
      'Each call of a function gets a **fresh private room** (its scope). From inside, the function can see out of the window: it reads outer variables. From outside, nobody can see in: its local variables and parameters do not exist outside, and they are recreated on every call. That is what lets two functions both use a variable called `total` without interfering.',
      'Functions are **first-class values**: you can store one in a variable, put it in an array or object, pass it as an argument and return it. Passing a function so that someone else calls it later is a **callback**; it is how `map` and `filter` work, and how `addEventListener` works (see [Events and addEventListener](#/browser/dom/add-event-listener)).',
    ],
    points: [
      'Prefer `return` over changing outer variables from inside a function: it keeps functions pure and testable.',
      'Pass the function **name** as a callback, without parentheses: `btn.addEventListener(\'click\', save)`. `save()` would call it immediately and pass its result instead.',
    ],
    example: '`function applyTwice(fn, value) { return fn(fn(value)); }` receives a function as its first argument. `applyTwice((n) => n + 3, 1)` computes `(1 + 3) + 3 = 7`; `applyTwice((s) => s + \'!\', \'hi\')` gives `\'hi!!\'`.',
    mistake: 'Expecting to read a function\'s local variable from outside: after `function scale(x) { const result = x * 2; return result; }`, writing `console.log(result)` at the top level is a `ReferenceError`. Use the returned value: `const r = scale(5);`.',
    live: { kind: 'js', code: `const rate = 2;
function scale(x) {
  const result = x * rate;    // reads the outer rate
  return result;
}
console.log(scale(5));        // 10
console.log(typeof result);   // 'undefined': local to scale

function applyTwice(fn, value) {
  return fn(fn(value));
}
console.log(applyTwice((n) => n + 3, 1));
console.log(applyTwice((s) => s + '!', 'hi'));

const tools = [Math.floor, Math.ceil];
console.log(tools[1](2.1));    // a function stored in an array` } },
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
    q: 'Writing `button.addEventListener(\'click\', save());` passes the function `save` to be called on each click.',
    answer: false,
    why: '`save()` calls the function immediately and passes its return value. Pass the function itself: `addEventListener(\'click\', save)`.' },
  { type: 'fib', topic: 'functions',
    q: 'A function passed as an argument to another function, to be called by it later, is called a ___.',
    accept: ['callback', 'callback function'],
    why: 'Callbacks are how `map`, `filter`, `forEach` and `addEventListener` know what to do.' },
];
