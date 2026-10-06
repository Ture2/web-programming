'use strict';

/* ==========================================================================
   JavaScript visual tools.

   truthy-table     pick a value (or type a literal) and see how JavaScript
                    treats it in a condition, with ||, ??, &&, ! and == / ===.
                    Literals are read by a tiny parser: nothing is evaluated.
   value-reference  step through short programs and watch variables (stack)
                    and objects (heap): primitives are copied, objects are
                    shared through references. Arrows are drawn in mount().
   ========================================================================== */

(() => {
  /* ======================================================================
     1. Truthy / falsy
     ====================================================================== */

  /* Reads one JavaScript literal: numbers, strings, booleans, null, undefined,
     NaN, Infinity, BigInt (0n), arrays and simple objects. Throws on anything else. */
  function parseLiteral(src) {
    let i = 0;
    const s = String(src);
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    const fail = () => { throw new Error('bad literal'); };
    function value() {
      ws();
      const c = s[i];
      if (c === '"' || c === "'" || c === '`') {
        i++;
        let out = '';
        while (i < s.length && s[i] !== c) {
          if (s[i] === '\\' && i + 1 < s.length) { i++; out += { n: '\n', t: '\t' }[s[i]] || s[i]; } else out += s[i];
          i++;
        }
        if (s[i] !== c) fail();
        i++;
        return out;
      }
      if (c === '[') {
        i++;
        const arr = [];
        ws();
        if (s[i] === ']') { i++; return arr; }
        for (;;) {
          arr.push(value());
          ws();
          if (s[i] === ',') { i++; continue; }
          if (s[i] === ']') { i++; return arr; }
          fail();
        }
      }
      if (c === '{') {
        i++;
        const obj = {};
        ws();
        if (s[i] === '}') { i++; return obj; }
        for (;;) {
          ws();
          const m = s.slice(i).match(/^([A-Za-z_$][\w$]*)|^"([^"]*)"|^'([^']*)'/);
          if (!m) fail();
          i += m[0].length;
          ws();
          if (s[i] !== ':') fail();
          i++;
          obj[m[1] || m[2] || m[3]] = value();
          ws();
          if (s[i] === ',') { i++; continue; }
          if (s[i] === '}') { i++; return obj; }
          fail();
        }
      }
      const m = s.slice(i).match(/^(-?\d+)n\b|^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?|^-?Infinity\b|^(true|false|null|undefined|NaN)\b/);
      if (!m) fail();
      i += m[0].length;
      if (m[1] !== undefined) return BigInt(m[1]);
      const w = m[0];
      if (w === 'true') return true;
      if (w === 'false') return false;
      if (w === 'null') return null;
      if (w === 'undefined') return undefined;
      if (w === 'NaN') return NaN;
      return Number(w);
    }
    const v = value();
    ws();
    if (i !== s.length) fail();
    return v;
  }

  /* How the console would show a value (strings quoted so '' and ' ' are visible). */
  function show(v) {
    if (typeof v === 'string') return JSON.stringify(v).replace(/^"|"$/g, "'");
    if (typeof v === 'bigint') return `${v}n`;
    if (Object.is(v, -0)) return '-0';
    if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`;
    if (v && typeof v === 'object') { const k = Object.keys(v); return k.length ? `{ ${k.map((x) => `${x}: ${show(v[x])}`).join(', ')} }` : '{}'; }
    return String(v);
  }

  const PRESETS = ['false', '0', '-0', '0n', "''", 'null', 'undefined', 'NaN', "'0'", "'false'", "' '", '[]', '{}', '-1', 'Infinity', "'hello'"];
  const tt = { src: "''", custom: '', error: '' };

  function truthyOut() {
    let v;
    try { v = parseLiteral(tt.src); } catch (e) { return `<p class="tl-bad">${esc(t('Cannot read that value.'))}</p>`; }
    const truthy = !!v;
    const or = v || 'default';
    const nc = v ?? 'default';
    const rows = [
      ['Boolean(v)', show(Boolean(v)), truthy ? t('truthy: counts as true in a condition') : t('falsy: counts as false in a condition')],
      ['if (v) { A } else { B }', truthy ? 'A' : 'B', truthy ? t('the if branch runs') : t('the else branch runs')],
      ["v || 'default'", show(or), truthy ? t('|| keeps the first truthy value: v') : t('v is falsy, so || falls back to the default')],
      ["v ?? 'default'", show(nc), (v === null || v === undefined) ? t('v is null or undefined, so ?? falls back') : t('?? only replaces null and undefined, so v stays')],
      ["v && 'yes'", show(v && 'yes'), truthy ? t('&& continues to the second value when the first is truthy') : t('&& stops at the first falsy value and returns it')],
      ['!v', show(!v), t('! converts to boolean and flips it')],
    ];
    const diff = (or !== nc && !(Number.isNaN(or) && Number.isNaN(nc)));
    const cmp = [[0, '0'], ['', "''"], [null, 'null'], [false, 'false']].map(([x, label]) => {
      // eslint-disable-next-line eqeqeq
      const loose = v == x;
      const strict = v === x;
      return `<tr${loose !== strict ? ' class="is-hit"' : ''}><th scope="row"><code>${esc(label)}</code></th><td>${esc(String(loose))}</td><td>${esc(String(strict))}</td></tr>`;
    }).join('');
    return `<p class="tt-verdict ${truthy ? 'is-truthy' : 'is-falsy'}"><code>${esc(show(v))}</code> ${esc(t('is'))} <strong>${esc(truthy ? t('truthy') : t('falsy'))}</strong> <span class="muted small">(${esc(t('typeof'))} ${esc(typeof v)})</span></p>
      <div class="scroll"><table class="src tt-table"><thead><tr><th scope="col">${esc(t('Expression'))}</th><th scope="col">${esc(t('Result'))}</th><th scope="col">${esc(t('Why'))}</th></tr></thead>
        <tbody>${rows.map(([e, r, w], k) => `<tr${diff && (k === 2 || k === 3) ? ' class="is-hit"' : ''}><th scope="row"><code>${esc(e)}</code></th><td><code>${esc(r)}</code></td><td>${esc(w)}</td></tr>`).join('')}</tbody></table></div>
      ${diff ? `<p class="tl-explain">${md(t('Here `||` and `??` disagree. Use `??` when a value like `0` or `\'\'` is valid and only “missing” (null/undefined) should get the default.'))}</p>` : ''}
      <div class="scroll"><table class="src tt-table"><caption>${esc(t('Comparing v: == converts types first, === never does (highlighted rows differ)'))}</caption>
        <thead><tr><th scope="col">${esc(t('v compared with'))}</th><th scope="col"><code>==</code></th><th scope="col"><code>===</code></th></tr></thead><tbody>${cmp}</tbody></table></div>`;
  }

  Tools.register('truthy-table', {
    title: 'Truthy and falsy',
    intro: 'In a condition, every value counts as true or false. There are exactly eight falsy values; everything else is truthy — even "0", "false" and [].',
    body() {
      return `
        <p class="lr-label">${esc(t('Pick a value'))}</p>
        <div class="tt-chips" role="group" aria-label="${esc(t('Values'))}">
          ${PRESETS.map((p, k) => {
            const v = parseLiteral(p);
            return `<button type="button" class="tl-chip tt-chip ${v ? 'is-truthy' : 'is-falsy'}" data-action="tt-pick" data-v="${esc(p)}" data-fid="tt-${k}" aria-pressed="${tt.src === p}"><code>${esc(p)}</code><span class="sr-only"> ${esc(v ? t('truthy') : t('falsy'))}</span></button>`;
          }).join('')}
        </div>
        <p class="muted small">${esc(t('Orange border: falsy (the eight falsy values come first). Blue: truthy.'))}</p>
        <div class="tl-row">
          <div class="tl-field"><label for="tt-custom">${esc(t('Or type a value'))}</label>
            <input id="tt-custom" class="tl-input" data-tt="custom" data-fid="tt-custom" value="${esc(tt.custom)}" placeholder="[0]" spellcheck="false" autocomplete="off"></div>
          <button type="button" class="btn" data-action="tt-use" data-fid="tt-use">${esc(t('Check'))}</button>
          ${tt.error ? `<p class="tl-bad small" role="alert">${esc(tt.error)}</p>` : ''}
        </div>
        <div data-part="out">${truthyOut()}</div>`;
    },
    onClick(el, root) {
      if (el.dataset.action === 'tt-pick') { tt.src = el.dataset.v; tt.error = ''; }
      else if (el.dataset.action === 'tt-use') useCustom();
      else return;
      Tools.refresh('truthy-table');
      if (!tt.error) Tools.say(root, `${tt.src}: ${parseLiteral(tt.src) ? t('truthy') : t('falsy')}`);
    },
    onInput(e) { if (e.target.dataset.tt === 'custom') tt.custom = e.target.value; },
    onKeydown(e, root) {
      if (e.target.dataset.tt !== 'custom' || e.key !== 'Enter') return;
      e.preventDefault();
      useCustom();
      Tools.refresh('truthy-table');
      if (!tt.error) Tools.say(root, `${tt.src}: ${parseLiteral(tt.src) ? t('truthy') : t('falsy')}`);
    },
  });

  function useCustom() {
    try { parseLiteral(tt.custom); tt.src = tt.custom.trim(); tt.error = ''; } catch (e) {
      tt.error = t('Type a literal value: a number, a quoted string, true, false, null, undefined, NaN, [] or {}.');
    }
  }

  /* ======================================================================
     2. Value vs reference
     ====================================================================== */

  /* A step: line (0-based, -1 = not started), vars [{ name, v } | { name, ref }],
     heap [{ id, kind: 'object' | 'array' | 'function', entries: [[key, v | { ref }]] }],
     out (console lines so far), note, error. */
  const P = (name, v, extra = {}) => ({ name, v, ...extra });
  const R = (name, ref, extra = {}) => ({ name, ref, ...extra });

  const SCENARIOS = [
    { id: 'prim', title: 'Copying a primitive',
      code: ['let a = 5;', 'let b = a;', 'b = 10;', 'console.log(a, b);'],
      steps: [
        { line: 0, vars: [P('a', 5)], heap: [], note: 'A number is a primitive: the variable holds the value itself.' },
        { line: 1, vars: [P('a', 5), P('b', 5)], heap: [], note: 'b gets a **copy** of the value 5. The two variables are independent.' },
        { line: 2, vars: [P('a', 5), P('b', 10)], heap: [], note: 'Changing b does not touch a.' },
        { line: 3, vars: [P('a', 5), P('b', 10)], heap: [], out: ['5 10'], note: 'Strings, numbers, booleans, null and undefined all behave like this.' },
      ] },
    { id: 'shared', title: 'Two names, one object',
      code: ["const p = { name: 'Ana' };", 'const q = p;', "q.name = 'Bo';", 'console.log(p.name);'],
      steps: [
        { line: 0, vars: [R('p', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana']] }], note: 'The object is created in memory (the heap). p holds a **reference**: the address of the object.' },
        { line: 1, vars: [R('p', 'o1', { c: 1 }), R('q', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana']] }], note: 'q = p copies the **reference**, not the object. Both arrows point to the same object.' },
        { line: 2, vars: [R('p', 'o1', { c: 1 }), R('q', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Bo']], changed: 'name' }], note: 'Changing the object through q…' },
        { line: 3, vars: [R('p', 'o1', { c: 1 }), R('q', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Bo']] }], out: ['Bo'], note: '…is visible through p too: there is only one object.' },
      ] },
    { id: 'const', title: 'const and objects',
      code: ['const user = { age: 20 };', 'user.age = 21;', 'user = { age: 30 };'],
      steps: [
        { line: 0, vars: [R('user', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['age', 20]] }], note: '`const` fixes the **variable**: it will always point to this object.' },
        { line: 1, vars: [R('user', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['age', 21]], changed: 'age' }], note: 'Changing the object\'s contents is allowed: the arrow did not move.' },
        { line: 2, vars: [R('user', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['age', 21]] }], error: 'TypeError: Assignment to constant variable.', note: 'Pointing user to a **new** object is reassignment: const forbids it. (const is not “frozen”.)' },
      ] },
    { id: 'param', title: 'Passing an array to a function',
      code: ['function addPear(list) {', "  list.push('pear');", '}', "const cart = ['apple'];", 'addPear(cart);', 'console.log(cart);'],
      steps: [
        { line: 3, vars: [R('addPear', 'f1'), R('cart', 'o1', { c: 1 })], heap: [{ id: 'f1', kind: 'function', entries: [] }, { id: 'o1', kind: 'array', entries: [['0', 'apple']] }], note: 'The function declaration exists from the start; cart points to a new array.' },
        { line: 4, vars: [R('addPear', 'f1'), R('cart', 'o1', { c: 1 }), R('list', 'o1', { c: 1, scope: 'addPear' })], heap: [{ id: 'f1', kind: 'function', entries: [] }, { id: 'o1', kind: 'array', entries: [['0', 'apple']] }], note: 'Calling addPear(cart): the parameter list receives a copy of the **reference**. Same array.' },
        { line: 1, vars: [R('addPear', 'f1'), R('cart', 'o1', { c: 1 }), R('list', 'o1', { c: 1, scope: 'addPear' })], heap: [{ id: 'f1', kind: 'function', entries: [] }, { id: 'o1', kind: 'array', entries: [['0', 'apple'], ['1', 'pear']], changed: '1' }], note: 'push changes the shared array.' },
        { line: 5, vars: [R('addPear', 'f1'), R('cart', 'o1', { c: 1 })], heap: [{ id: 'f1', kind: 'function', entries: [] }, { id: 'o1', kind: 'array', entries: [['0', 'apple'], ['1', 'pear']] }], out: ["[ 'apple', 'pear' ]"], note: 'The function has returned (list is gone), but the change stays: functions can modify the objects you pass them.' },
      ] },
    { id: 'spread', title: 'Spread: a shallow copy',
      code: ["const a = { name: 'Ana', address: { city: 'Madrid' } };", 'const b = { ...a };', "b.name = 'Bo';", "b.address.city = 'Bilbao';", 'console.log(a.name, a.address.city);'],
      steps: [
        { line: 0, vars: [R('a', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o2', kind: 'object', entries: [['city', 'Madrid']] }], note: 'Two objects: the address is a separate object referenced from a.' },
        { line: 1, vars: [R('a', 'o1', { c: 1 }), R('b', 'o3', { c: 2 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o3', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o2', kind: 'object', entries: [['city', 'Madrid']] }], note: '`{ ...a }` makes a **new** object and copies each property. The address property is a reference, so the copy points to the same address object.' },
        { line: 2, vars: [R('a', 'o1', { c: 1 }), R('b', 'o3', { c: 2 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o3', kind: 'object', entries: [['name', 'Bo'], ['address', { ref: 'o2' }]], changed: 'name' }, { id: 'o2', kind: 'object', entries: [['city', 'Madrid']] }], note: 'Top-level properties are independent: a.name is still Ana.' },
        { line: 3, vars: [R('a', 'o1', { c: 1 }), R('b', 'o3', { c: 2 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o3', kind: 'object', entries: [['name', 'Bo'], ['address', { ref: 'o2' }]] }, { id: 'o2', kind: 'object', entries: [['city', 'Bilbao']], changed: 'city' }], note: 'But the nested object is shared: changing it through b changes it for a.' },
        { line: 4, vars: [R('a', 'o1', { c: 1 }), R('b', 'o3', { c: 2 })], heap: [{ id: 'o1', kind: 'object', entries: [['name', 'Ana'], ['address', { ref: 'o2' }]] }, { id: 'o3', kind: 'object', entries: [['name', 'Bo'], ['address', { ref: 'o2' }]] }, { id: 'o2', kind: 'object', entries: [['city', 'Bilbao']] }], out: ['Ana Bilbao'], note: 'Spread copies one level deep (a **shallow** copy). `structuredClone(a)` makes a deep copy.' },
      ] },
    { id: 'compare', title: 'Comparing objects',
      code: ['const x = { n: 1 };', 'const y = { n: 1 };', 'const z = x;', 'console.log(x === y);', 'console.log(x === z);'],
      steps: [
        { line: 0, vars: [R('x', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['n', 1]] }], note: 'One object.' },
        { line: 1, vars: [R('x', 'o1', { c: 1 }), R('y', 'o2', { c: 2 })], heap: [{ id: 'o1', kind: 'object', entries: [['n', 1]] }, { id: 'o2', kind: 'object', entries: [['n', 1]] }], note: 'A second object with the same contents.' },
        { line: 2, vars: [R('x', 'o1', { c: 1 }), R('y', 'o2', { c: 2 }), R('z', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['n', 1]] }, { id: 'o2', kind: 'object', entries: [['n', 1]] }], note: 'z shares x\'s reference.' },
        { line: 3, vars: [R('x', 'o1', { c: 1 }), R('y', 'o2', { c: 2 }), R('z', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['n', 1]] }, { id: 'o2', kind: 'object', entries: [['n', 1]] }], out: ['false'], note: '=== on objects compares **references** (addresses), not contents: different objects are never equal.' },
        { line: 4, vars: [R('x', 'o1', { c: 1 }), R('y', 'o2', { c: 2 }), R('z', 'o1', { c: 1 })], heap: [{ id: 'o1', kind: 'object', entries: [['n', 1]] }, { id: 'o2', kind: 'object', entries: [['n', 1]] }], out: ['false', 'true'], note: 'Same reference, so true.' },
      ] },
  ];

  const vr = { id: 'prim', step: -1 };
  const scn = () => SCENARIOS.find((s) => s.id === vr.id) || SCENARIOS[0];
  const label = (id) => `#${id.slice(1)}`;


  function stateHtml(st) {
    const ids = st.heap.map((h) => h.id);
    const colour = (id) => `vr-c${(ids.indexOf(id) % 4) + 1}`;
    const valHtml = (v) => (v && typeof v === 'object' && v.ref
      ? `<span class="vr-ref ${colour(v.ref)}" data-vr-from="${esc(v.ref)}">→ ${esc(label(v.ref))}</span>`
      : `<code>${esc(show(v))}</code>`);
    const vars = st.vars.map((x) => `<li class="vr-var">
        <span class="vr-name">${x.scope ? `<span class="muted small">${esc(x.scope)}: </span>` : ''}${esc(x.name)}</span>
        ${x.ref ? `<span class="vr-ref ${colour(x.ref)}" data-vr-from="${esc(x.ref)}">→ ${esc(label(x.ref))}</span>` : `<code class="vr-prim">${esc(show(x.v))}</code>`}
      </li>`).join('');
    const heap = st.heap.map((h) => `<li class="vr-obj ${colour(h.id)}" data-vr-to="${esc(h.id)}">
        <span class="vr-id">${esc(label(h.id))} <span class="muted small">${esc(t(h.kind))}</span></span>
        ${h.kind === 'function' ? '<code>ƒ addPear(list)</code>' : `<code class="vr-body">${h.kind === 'array' ? '[' : '{'}${h.entries.map(([k, v]) => `<span class="vr-entry${h.changed === k ? ' is-changed' : ''}">${h.kind === 'array' ? '' : `${esc(k)}: `}${valHtml(v)}</span>`).join(', ')}${h.kind === 'array' ? ']' : '}'}</code>`}
      </li>`).join('');
    return `<div class="vr-mem" data-vr-mem>
        <div class="vr-col"><p class="lr-label">${esc(t('Variables (stack)'))}</p><ul class="vr-list">${vars || `<li class="muted small">${esc(t('none yet'))}</li>`}</ul></div>
        <div class="vr-col"><p class="lr-label">${esc(t('Objects (heap)'))}</p><ul class="vr-list">${heap || `<li class="muted small">${esc(t('none yet'))}</li>`}</ul></div>
        <svg class="vr-arrows" aria-hidden="true" focusable="false"></svg>
      </div>`;
  }

  Tools.register('value-reference', {
    title: 'Value vs reference',
    intro: 'Primitives are copied; objects and arrays are shared through references. Step through each program and follow the arrows.',
    body() {
      const s = scn();
      const st = s.steps[vr.step] || { line: -1, vars: [], heap: [], note: 'Press Next to run the first line.' };
      const out = st.out || [];
      return `
        <div class="tl-row">
          ${Tools.select({ label: t('Program'), fid: 'vr-scn', options: SCENARIOS.map((x) => [x.id, t(x.title)]), current: s.id, data: { vr: 'scenario' } })}
          <div class="tl-row vr-buttons">
            <button type="button" class="btn ghost" data-action="vr-prev" data-fid="vr-prev"${vr.step < 0 ? ' disabled' : ''}>${esc(t('Previous'))}</button>
            <button type="button" class="btn" data-action="vr-next" data-fid="vr-next"${vr.step >= s.steps.length - 1 ? ' disabled' : ''}>${esc(t('Next'))}</button>
            <button type="button" class="btn ghost" data-action="vr-reset" data-fid="vr-reset">${esc(t('Reset'))}</button>
          </div>
        </div>
        <div class="tl-cols">
          <div>
            <ol class="vr-code" aria-label="${esc(t('Program'))}" tabindex="0" data-fid="vr-code">${s.code.map((l, k) => `<li${k === st.line ? ' class="is-current" aria-current="step"' : ''}><code>${esc(l)}</code></li>`).join('')}</ol>
            <p class="lr-label">${esc(t('Console'))}</p>
            <div class="lr-console" role="log">${Sandbox.consoleHtml(out.map((text) => ({ level: 'log', text })), st.error, null)}</div>
          </div>
          <div>${stateHtml(st)}</div>
        </div>
        <p class="tl-explain">${esc(t('Step {n} of {total}', { n: vr.step + 1, total: s.steps.length }))} · ${md(t(st.note))}</p>`;
    },
    mount: drawArrows,
    resize: drawArrows,
    onClick(el, root) {
      const s = scn();
      const a = el.dataset.action;
      if (a === 'vr-next') vr.step = Math.min(s.steps.length - 1, vr.step + 1);
      else if (a === 'vr-prev') vr.step = Math.max(-1, vr.step - 1);
      else if (a === 'vr-reset') vr.step = -1;
      else return;
      Tools.refresh('value-reference');
      const st = s.steps[vr.step];
      Tools.say(root, st ? `${s.code[st.line]} — ${t(st.note).replace(/\*\*/g, '')}` : t('Reset'));
    },
    onChange(e, root) {
      if (e.target.dataset.vr !== 'scenario') return;
      vr.id = e.target.value;
      vr.step = -1;
      Tools.refresh('value-reference');
      Tools.say(root, t(scn().title));
    },
  });

  /* Curved arrows from each reference to its object. */
  function drawArrows(root) {
    const mem = root.querySelector('[data-vr-mem]');
    if (!mem) return;
    const svg = mem.querySelector('.vr-arrows');
    const box = mem.getBoundingClientRect();
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    let paths = '<defs><marker id="vr-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" class="vr-head"/></marker></defs>';
    mem.querySelectorAll('[data-vr-from]').forEach((from) => {
      const to = mem.querySelector(`[data-vr-to="${CSS.escape(from.dataset.vrFrom)}"]`);
      if (!to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      let d;
      const owner = from.closest('.vr-obj');
      if (owner) {
        // Object → object (a nested reference): a loop on the right of the heap column.
        const o = owner.getBoundingClientRect();
        const x1 = o.right - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = b.right - box.left + 2;
        const y2 = b.top + Math.min(b.height / 2, 16) - box.top;
        d = `M${x1} ${y1} C${x1 + 26} ${y1} ${x2 + 26} ${y2} ${x2} ${y2}`;
      } else {
        const x1 = a.right - box.left + 2;
        const y1 = a.top + a.height / 2 - box.top;
        const sideBySide = b.left >= a.right - 4;
        const x2 = sideBySide ? b.left - box.left - 2 : b.left - box.left + 14;
        const y2 = sideBySide ? b.top + Math.min(b.height / 2, 16) - box.top : b.top - box.top - 2;
        const dx = Math.max(30, Math.abs(x2 - x1) / 2);
        d = sideBySide
          ? `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
          : `M${x1} ${y1} C${x1 + 40} ${y1} ${x2} ${y2 - 40} ${x2} ${y2}`;
      }
      paths += `<path d="${d}" class="vr-line" marker-end="url(#vr-head)"/>`;
    });
    svg.innerHTML = paths;
  }

})();
