'use strict';

/* ==========================================================================
   playground (JavaScript): a code editor with a console, plus
   self-checking exercises. Code runs in a Web Worker (js/sandbox.js): no DOM,
   stopped after 2 s. Each exercise's tests call check(name, actual, expected)
   after the user's code, in the same scope.
   Saved on this device: code per exercise (js-exercises-work-v1) and solved
   exercises (js-exercises-v1, counted on the progress page).
   ========================================================================== */

(() => {
  const EXERCISES = [
    { id: 'fahrenheit', title: 'Celsius to Fahrenheit',
      prompt: 'Write `toFahrenheit(celsius)` that returns the temperature in Fahrenheit: multiply by 9, divide by 5, add 32.',
      starter: 'function toFahrenheit(celsius) {\n  // return …\n}\n\nconsole.log(toFahrenheit(100)); // 212',
      tests: "check('toFahrenheit(0)', toFahrenheit(0), 32);\ncheck('toFahrenheit(100)', toFahrenheit(100), 212);\ncheck('toFahrenheit(-40)', toFahrenheit(-40), -40);\ncheck('toFahrenheit(37)', toFahrenheit(37), 98.6);",
      hint: 'A function hands its result back with `return`. `console.log` only prints it; the caller would get `undefined`.' },
    { id: 'even', title: 'Even or odd',
      prompt: 'Write `isEven(n)` that returns `true` when `n` is even and `false` otherwise.',
      starter: 'function isEven(n) {\n  \n}',
      tests: "check('isEven(4)', isEven(4), true);\ncheck('isEven(7)', isEven(7), false);\ncheck('isEven(0)', isEven(0), true);\ncheck('isEven(-3)', isEven(-3), false);",
      hint: '`n % 2` is the remainder of dividing by 2. A comparison such as `x === 0` is already a boolean: you can return it directly.' },
    { id: 'greet', title: 'Greeting with a default',
      prompt: 'Write `greet(name)` that returns `"Hello, Ana!"` for `greet("Ana")`, and `"Hello, friend!"` when it is called with no argument. Use a template literal and a default parameter.',
      starter: 'function greet(name) {\n  \n}\n\nconsole.log(greet("Ana"));\nconsole.log(greet());',
      tests: "check('greet(\"Ana\")', greet('Ana'), 'Hello, Ana!');\ncheck('greet()', greet(), 'Hello, friend!');\ncheck('greet(\"Luis\")', greet('Luis'), 'Hello, Luis!');",
      hint: 'Default parameter: `function greet(name = "friend")`. Template literal: `` `Hello, ${name}!` `` (backticks, not quotes).' },
    { id: 'sum', title: 'Sum with a loop',
      prompt: 'Write `sumAll(numbers)` that adds every number of the array **with a loop** and returns the total. An empty array sums to `0`.',
      starter: 'function sumAll(numbers) {\n  let total = 0;\n  // loop here\n  return total;\n}',
      tests: "check('sumAll([1, 2, 3])', sumAll([1, 2, 3]), 6);\ncheck('sumAll([])', sumAll([]), 0);\ncheck('sumAll([10, -4, 0.5])', sumAll([10, -4, 0.5]), 6.5);",
      hint: '`for (const n of numbers) { total += n; }` visits each element once. The accumulator starts at 0 *before* the loop.' },
    { id: 'average', title: 'Average',
      prompt: 'Write `average(numbers)` that returns the mean of the array. For an empty array return `0` (not `NaN`).',
      starter: 'function average(numbers) {\n  \n}',
      tests: "check('average([2, 4, 6])', average([2, 4, 6]), 4);\ncheck('average([5])', average([5]), 5);\ncheck('average([])', average([]), 0);\ncheck('average([1, 2])', average([1, 2]), 1.5);",
      hint: 'Sum, then divide by `numbers.length`. 0 / 0 is `NaN`, so handle the empty array first with an early `return 0`.' },
    { id: 'count-char', title: 'Count a letter',
      prompt: 'Write `countChar(text, letter)` that returns how many times `letter` appears in `text`, ignoring upper/lower case.',
      starter: 'function countChar(text, letter) {\n  \n}\n\nconsole.log(countChar("Banana", "a")); // 3',
      tests: "check('countChar(\"Banana\", \"a\")', countChar('Banana', 'a'), 3);\ncheck('countChar(\"Banana\", \"A\")', countChar('Banana', 'A'), 3);\ncheck('countChar(\"\", \"x\")', countChar('', 'x'), 0);\ncheck('countChar(\"Mississippi\", \"s\")', countChar('Mississippi', 's'), 4);",
      hint: 'Lower-case both with `.toLowerCase()`, then walk the text with `for (const ch of text)` and count matches.' },
    { id: 'adults', title: 'Names of adults',
      prompt: 'Write `adultNames(people)`. It receives objects like `{ name: "Ana", age: 20 }` and returns an **array of names** of the people aged 18 or more, in the same order.',
      starter: 'function adultNames(people) {\n  \n}\n\nconst people = [\n  { name: "Ana", age: 20 },\n  { name: "Leo", age: 15 },\n  { name: "Mia", age: 18 },\n];\nconsole.log(adultNames(people));',
      tests: "check('three people', adultNames([{ name: 'Ana', age: 20 }, { name: 'Leo', age: 15 }, { name: 'Mia', age: 18 }]), ['Ana', 'Mia']);\ncheck('nobody', adultNames([]), []);\ncheck('all minors', adultNames([{ name: 'Bo', age: 9 }]), []);",
      hint: '`filter` keeps the objects that pass a test; `map` turns each object into its name: `people.filter(p => p.age >= 18).map(p => p.name)`.' },
    { id: 'initials', title: 'Initials',
      prompt: 'Write `initials(fullName)` that returns the capital initials: `initials("ada lovelace")` → `"AL"`. Extra spaces between words must not break it.',
      starter: 'function initials(fullName) {\n  \n}',
      tests: "check('initials(\"ada lovelace\")', initials('ada lovelace'), 'AL');\ncheck('initials(\"Grace Brewster Hopper\")', initials('Grace Brewster Hopper'), 'GBH');\ncheck('initials(\"  tim   berners-lee \")', initials('  tim   berners-lee '), 'TB');",
      hint: '`fullName.trim().split(/\\s+/)` gives the words even with extra spaces; take `word[0]` of each and `.toUpperCase()`.' },
    { id: 'find-id', title: 'Find by id',
      prompt: 'Write `findById(items, id)` that returns the object whose `id` matches, or `null` when there is none.',
      starter: 'function findById(items, id) {\n  \n}',
      tests: "const __tasks = [{ id: 1, title: 'Buy milk' }, { id: 2, title: 'Study' }];\ncheck('findById(tasks, 2)', findById(__tasks, 2), { id: 2, title: 'Study' });\ncheck('findById(tasks, 9)', findById(__tasks, 9), null);\ncheck('findById([], 1)', findById([], 1), null);",
      hint: '`items.find(item => item.id === id)` returns `undefined` when nothing matches; `?? null` turns that into `null`.' },
    { id: 'ticket', title: 'Ticket price',
      prompt: 'Write `ticketPrice(age)`: children under 12 pay 5, people aged 65 or more pay 6, everybody else pays 10. A negative age is invalid: return `null`.',
      starter: 'function ticketPrice(age) {\n  \n}',
      tests: "check('ticketPrice(8)', ticketPrice(8), 5);\ncheck('ticketPrice(12)', ticketPrice(12), 10);\ncheck('ticketPrice(40)', ticketPrice(40), 10);\ncheck('ticketPrice(65)', ticketPrice(65), 6);\ncheck('ticketPrice(-1)', ticketPrice(-1), null);",
      hint: 'Check the invalid case first, then the special ranges, and finish with the general case. Watch the boundaries: 12 is not under 12; 65 is “65 or more”.' },
    { id: 'unique', title: 'Remove duplicates',
      prompt: 'Write `unique(values)` that returns a **new** array without repeated values, keeping the first appearance order. Do not change the original array.',
      starter: 'function unique(values) {\n  \n}',
      tests: "const __input = [3, 1, 3, 2, 1];\ncheck('unique([3, 1, 3, 2, 1])', unique(__input), [3, 1, 2]);\ncheck('original untouched', __input, [3, 1, 3, 2, 1]);\ncheck('unique([\"a\", \"a\"])', unique(['a', 'a']), ['a']);\ncheck('unique([])', unique([]), []);",
      hint: 'Build a new array: push a value only if `!result.includes(value)`. (Shortcut you may meet later: `[...new Set(values)]`.)' },
    { id: 'word-count', title: 'Count words',
      prompt: 'Write `wordCount(text)` that returns an object with how many times each word appears, in lower case: `wordCount("to be or not to be")` → `{ to: 2, be: 2, or: 1, not: 1 }`.',
      starter: 'function wordCount(text) {\n  const counts = {};\n  \n  return counts;\n}',
      tests: "check('wordCount(\"to be or not to be\")', wordCount('to be or not to be'), { to: 2, be: 2, or: 1, not: 1 });\ncheck('case', wordCount('Hi hi'), { hi: 2 });\ncheck('empty', wordCount(''), {});",
      hint: 'Use bracket notation with a variable key: `counts[word] = (counts[word] || 0) + 1`. Skip empty strings that `split` can produce.' },
  ];

  const FREE = { id: 'free', title: 'Free play', starter: '// Write any JavaScript and press Run (Ctrl+Enter).\nconst fruits = ["apple", "pear", "fig"];\nfor (const fruit of fruits) {\n  console.log(fruit.toUpperCase(), fruit.length);\n}\nconsole.log({ total: fruits.length });' };

  const solvedStore = challengeStore('js-exercises-v1');
  const workStore = makeStore('js-exercises-work-v1');
  const work = workStore.load();
  const saveWork = debounce(() => workStore.save(work), 500);
  const pg = { id: 'free', running: false, last: null };

  const exercise = () => EXERCISES.find((e) => e.id === pg.id) || null;
  const code = () => (work[pg.id] !== undefined ? work[pg.id] : (exercise() || FREE).starter);

  function resultsHtml() {
    const r = pg.last;
    if (!r) return `<p class="muted small">${esc(t('Output appears here.'))}</p>`;
    let tests = '';
    if (exercise() && !r.error) {
      const passed = r.results.filter((x) => x.ok).length;
      const all = r.results.length;
      tests = `<div class="pg-tests">
          <p class="pg-score ${passed === all && all ? 'tl-ok' : 'tl-bad'}">${esc(passed === all && all ? t('All {n} tests pass. Solved!', { n: all }) : t('{p} of {n} tests pass', { p: passed, n: all }))}</p>
          <ul class="checks">${r.results.map((x) => checkItem({ status: x.ok ? 'ok' : 'bad', text: x.ok ? `\`${x.name}\` → \`${x.actual}\`` : t('`{name}` returned `{actual}`, expected `{expected}`', { name: x.name, actual: x.actual, expected: x.expected }) })).join('')}</ul>
        </div>`;
    }
    return `${tests}<p class="lr-label pg-console-h">${esc(t('Console'))}</p><div class="lr-console" role="log" aria-label="${esc(t('Console output'))}">${Sandbox.consoleHtml(r.logs, r.error)}</div>`;
  }

  const solvedBadge = () => {
    const ex = exercise();
    return ex && solvedStore.isSolved(ex.id) ? ` <span class="tl-ok small">${esc(t('solved'))}</span>` : '';
  };
  const PARTS = { out: resultsHtml, badge: solvedBadge };

  async function run(root) {
    if (pg.running) return;
    pg.running = true;
    const ex = exercise();
    Tools.paint(root, { out: () => `<p class="muted small">${esc(t('Running…'))}</p>` });
    const r = await Sandbox.runJs(code(), { tests: ex ? ex.tests : '' });
    pg.running = false;
    pg.last = r;
    let msg;
    if (r.error) msg = t('Error: {msg}', { msg: r.error });
    else if (ex) {
      const ok = r.results.length > 0 && r.results.every((x) => x.ok);
      // Only the output, the picker tick and the "solved" badge change: the editor keeps its caret and undo.
      if (ok) Tools.markSolved(root, { store: solvedStore, id: ex.id, action: 'pg-pick', index: EXERCISES.indexOf(ex) });
      msg = ok ? t('Solved: all tests pass') : t('{p} of {n} tests pass', { p: r.results.filter((x) => x.ok).length, n: r.results.length });
    } else msg = t('{n} lines of output', { n: r.logs.length });
    Tools.paint(root, PARTS);
    Tools.say(root, msg);
  }

  Tools.register('playground', {
    title: 'JavaScript playground',
    intro: 'Write code, run it, read the console. Pick an exercise to have your function checked by tests; your code is saved on this device.',
    challenges: { store: solvedStore, label: 'JS exercises', ids: () => EXERCISES.map((e) => e.id) },
    workKey: workStore.key,
    body() {
      const ex = exercise();
      const lines = Math.min(18, Math.max(8, code().split('\n').length + 2));
      return `
        ${Tools.challengePicker({ list: EXERCISES, current: ex ? EXERCISES.indexOf(ex) : 'free', store: solvedStore, action: 'pg-pick', label: t('Exercises'), free: { value: 'free', label: t('Free play') } })}
        ${ex ? `<div class="tl-goal pg-goal">
            <p class="pg-task-title">${esc(t('Exercise {n}: {title}', { n: EXERCISES.indexOf(ex) + 1, title: t(ex.title) }))}<span data-part="badge">${solvedBadge()}</span></p>
            <p>${md(t(ex.prompt))}</p>
            <details class="pg-hint" data-fid="pg-hint"><summary>${esc(t('Hint'))}</summary><p>${md(t(ex.hint))}</p></details>
          </div>` : `<p class="muted">${esc(t('Free play: nothing is checked. Try anything you saw on the cards.'))}</p>`}
        <div class="tl-field">
          <label for="pg-code">${esc(t('Your code'))}</label>
          <textarea id="pg-code" class="tl-code pg-code" rows="${lines}" data-pg="code" data-fid="pg-code" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(code())}</textarea>
        </div>
        <p class="lr-actions">
          <button type="button" class="btn" data-action="pg-run" data-fid="pg-run">${esc(ex ? t('Run the tests') : t('Run'))}</button>
          <button type="button" class="btn ghost" data-action="pg-reset" data-fid="pg-reset">${esc(t('Reset the code'))}</button>
          <span class="muted small">${esc(t('Ctrl+Enter runs · Tab indents · Esc then Tab leaves the editor'))}</span>
        </p>
        <div data-part="out">${resultsHtml()}</div>`;
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'pg-pick') {
        pg.id = el.dataset.v === 'free' ? 'free' : EXERCISES[+el.dataset.v].id;
        pg.last = null;
        Tools.refresh('playground');
        const ex = exercise();
        Tools.say(root, ex ? t('Exercise: {title}', { title: t(ex.title) }) : t('Free play'));
      } else if (a === 'pg-run') run(root);
      else if (a === 'pg-reset') {
        if (work[pg.id] !== undefined && !window.confirm(t('Replace your code with the starter code?'))) return;
        delete work[pg.id];
        workStore.save(work);           // at once: the reset must survive a reload
        pg.last = null;
        Tools.refresh('playground');
        Tools.say(root, t('Code reset'));
      }
    },
    onInput(e) {
      if (e.target.dataset.pg !== 'code') return;
      work[pg.id] = e.target.value;
      saveWork();
    },
    onKeydown(e, root) {
      if (e.target.dataset.pg === 'code') codeEditorKeydown(e, () => run(root));
    },
  });

})();
