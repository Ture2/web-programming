'use strict';

/* ==========================================================================
   Components: pure engine for the section's tools (no DOM; also runs in Node:
   site/test/components-engine.test.mjs). React is the worked example.

   JSX viewer (jsx-viewer)
     program(compiled) → JavaScript that, run in a Web Worker (Sandbox.runJs)
       or a Node vm, defines a recording `React` (createElement builds plain
       { type, key, props } objects, hooks are inert stubs), runs the
       student's compiled code, builds <App /> and prints one line
       "__JV__{json}" with { tree } (a serialised element tree, components
       expanded by calling them) or { error }.
     readResult(logs) → { tree, error, logs } from the console lines.
     Serialised values: { k: 'el', type: { tag } | { fn } | { frag } | { bad },
       key, props: [[name, value]], children?, rendered?, error? }
       | { k: 'str' | 'num' | 'empty' | 'sym', v } | { k: 'fn', name }
       | { k: 'list', items } | { k: 'obj', entries } | { k: 'cut' }.
     tidyCompiled(code) → Sucrase's classic output, made easier to read.
     toHtml(tree) → the HTML of the DOM React would build (pretty-printed).
     elements(tree, { expand }) → every element node; fmtValue(v) → short text.
     JV_CHALLENGES: 'predict' (multiple choice) and 'fix' (check(tree) → items).
     JV_PRESETS: free-play snippets.

   Component playground (component-playground)
     CP_CHALLENGES: { id, title, goal, hint, starter, steps, checks(ctx) }.
       steps run in a sandboxed frame with the real React (js/tools/components-
       tools.js); the frame reports { snaps: { name: domSnapshot }, submits:
       [{ prevented }], console: [{ level, text }], error, missing }.
       DOM snapshot: { t: tag, a: { attr: value }, v?: value, c?: checked, k: [child] }
       with text nodes as strings.
     judge(challenge, report, source) → { ok, items: [{ status, text }] }.
     query(snapshot, selector) (tag, .class, #id, [attr], [attr=v], descendant
       and > combinators), textOf(node), textNodes(node).
     keyFromIndex(source), handlersCalled(source): static checks of the source.
   ========================================================================== */

const ComponentsEngine = (() => {
  /* ======================================================================
     1. The recording React (runs where the student's code runs)
     ====================================================================== */

  /* Runs inside the worker. Kept as a function so it is real, linted code. */
  function recorder() {
    var EL = '__jv_element__';
    var FRAG = { __jvFragment: true };
    var noop = function () {};
    function createElement(type, config) {
      var props = {};
      var key = null;
      if (config) {
        Object.keys(config).forEach(function (k) {
          if (k === 'key') key = config[k] == null ? null : String(config[k]);
          else if (k !== 'ref' && k !== '__self' && k !== '__source') props[k] = config[k];
        });
      }
      var n = arguments.length - 2;
      if (n === 1) props.children = arguments[2];
      else if (n > 1) props.children = Array.prototype.slice.call(arguments, 2);
      return { $$el: EL, type: type, key: key, props: props };
    }
    function createContext(value) {
      var ctx = { __jvValue: value };
      ctx.Provider = function Provider(p) { return p.children; };
      ctx.Consumer = function Consumer(p) { return typeof p.children === 'function' ? p.children(value) : null; };
      return ctx;
    }
    var React = {
      createElement: createElement,
      Fragment: FRAG,
      StrictMode: function StrictMode(p) { return p.children; },
      useState: function (init) { return [typeof init === 'function' ? init() : init, noop]; },
      useReducer: function (r, init, f) { return [f ? f(init) : init, noop]; },
      useEffect: noop,
      useLayoutEffect: noop,
      useInsertionEffect: noop,
      useRef: function (v) { return { current: v }; },
      useMemo: function (fn) { return fn(); },
      useCallback: function (fn) { return fn; },
      useContext: function (c) { return c ? c.__jvValue : undefined; },
      useId: function () { return ':r0:'; },
      createContext: createContext,
      memo: function (c) { return c; },
      forwardRef: function (fn) { return function (p) { return fn(p, null); }; },
      Children: { toArray: function (c) { return [].concat(c == null ? [] : c); } },
    };
    var budget = 600;
    function ser(v, depth) {
      if (--budget < 0) return { k: 'cut' };
      if (v === null || v === undefined || typeof v === 'boolean') return { k: 'empty', v: String(v) };
      if (typeof v === 'string') return { k: 'str', v: v };
      if (typeof v === 'number' || typeof v === 'bigint') return { k: 'num', v: String(v) };
      if (typeof v === 'function') return { k: 'fn', name: v.name || '' };
      if (typeof v === 'symbol') return { k: 'sym', v: v.toString() };
      if (Array.isArray(v)) return { k: 'list', items: v.map(function (x) { return ser(x, depth + 1); }) };
      if (v.$$el === EL) {
        var t = v.type;
        var type = typeof t === 'string' ? { tag: t } : t === FRAG ? { frag: true } : typeof t === 'function' ? { fn: t.name || 'Anonymous' } : { bad: String(t) };
        var out = { k: 'el', type: type, key: v.key, props: [] };
        Object.keys(v.props).forEach(function (k) { if (k !== 'children') out.props.push([k, ser(v.props[k], depth + 1)]); });
        if ('children' in v.props) out.children = ser(v.props.children, depth + 1);
        if (type.fn) {
          if (depth > 40) out.error = 'Too deep: does a component render itself?';
          else {
            try { out.rendered = ser(t(v.props), depth + 1); } catch (e) { out.error = (e && e.name ? e.name + ': ' + e.message : String(e)); }
          }
        }
        return out;
      }
      if (depth > 8) return { k: 'obj', entries: [], cut: true };
      return { k: 'obj', entries: Object.keys(v).slice(0, 20).map(function (k) { return [k, ser(v[k], depth + 1)]; }) };
    }
    return { React: React, ser: ser };
  }

  const MARK = '__JV__';

  function program(compiled) {
    return `var __rec = (${recorder})();
var React = __rec.React;
var module = { exports: {} }, exports = module.exports;
function require(name) {
  if (name === 'react') return React;
  if (name === 'react-dom' || name === 'react-dom/client') return { createRoot: function () { return { render: function () {} }; } };
  if (/\\.module\\.css$/.test(name)) return new Proxy({}, { get: function (o, k) { return String(k); } });
  if (/\\.css$/.test(name)) return {};
  throw new Error('"' + name + '" is not available here: only react and react-dom.');
}
var __out;
try {
  (function () {
${compiled}
;if (!module.exports.default && typeof App === 'function') module.exports.default = App;
  })();
  var __App = module.exports.default;
  if (typeof __App !== 'function') __out = { error: 'Nothing to show: define a component called App (or export one as default).' };
  else __out = { tree: __rec.ser(React.createElement(__App, null), 0) };
} catch (e) {
  __out = { error: (e && e.name ? e.name + ': ' + e.message : String(e)) };
}
console.log('${MARK}' + JSON.stringify(__out));`;
  }

  /* The worker's console lines → { tree, error, logs (the student's own output) }. */
  function readResult(logs, error) {
    const own = [];
    let result = null;
    (logs || []).forEach((l) => {
      if (typeof l.text === 'string' && l.text.startsWith(MARK)) {
        try { result = JSON.parse(l.text.slice(MARK.length)); } catch (e) { result = { error: 'Could not read the result.' }; }
      } else own.push(l);
    });
    if (!result) result = { error: error || 'The code did not finish.' };
    return { tree: result.tree || null, error: result.error || null, logs: own };
  }

  /* ======================================================================
     2. Compiled code, made readable
     ====================================================================== */

  /* Splits code into [text, isCode] runs: strings, template literals and comments are not code. */
  function segments(code) {
    const out = [];
    let buf = '';
    let k = 0;
    const flush = (isCode) => { if (buf) out.push([buf, isCode]); buf = ''; };
    while (k < code.length) {
      const c = code[k];
      const two = code.slice(k, k + 2);
      let end = -1;
      if (c === '"' || c === "'" || c === '`') {
        let j = k + 1;
        while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
        end = Math.min(code.length, j + 1);
      } else if (two === '//') {
        const j = code.indexOf('\n', k);
        end = j < 0 ? code.length : j;
      } else if (two === '/*') {
        const j = code.indexOf('*/', k + 2);
        end = j < 0 ? code.length : j + 2;
      }
      if (end > k) { flush(true); buf = code.slice(k, end); flush(false); k = end; } else { buf += c; k++; }
    }
    flush(true);
    return out;
  }

  function tidyCompiled(code) {
    let s = String(code || '').replace(/^"use strict";\s*/, '');
    s = segments(s).map(([text, isCode]) => (isCode
      ? text.replace(/,\s*\}/g, ' }').replace(/(\S) +\)/g, '$1)').replace(/ ,/g, ',').replace(/\n([ \t]*), /g, ',\n$1 ')
      : text)).join('');
    // ", " moved to the line before: the leading comma left after a "(" is gone too.
    return s.replace(/\(,\n/g, '(\n');
  }

  /* ======================================================================
     3. Reading a serialised element tree
     ====================================================================== */

  const typeName = (type) => (type.tag ? type.tag : type.fn ? type.fn : type.frag ? 'Fragment' : String(type.bad));

  function fmtValue(v, depth = 0) {
    if (!v) return 'undefined';
    switch (v.k) {
      case 'str': return JSON.stringify(v.v);
      case 'num': case 'sym': return v.v;
      case 'empty': return v.v;
      case 'fn': return `ƒ ${v.name || 'anonymous'}`;
      case 'list': return depth > 1 ? `[…${v.items.length}]` : `[${v.items.map((x) => fmtValue(x, depth + 1)).join(', ')}]`;
      case 'obj': return depth > 1 || v.cut ? '{…}' : `{ ${v.entries.map(([k, x]) => `${k}: ${fmtValue(x, depth + 1)}`).join(', ')} }`;
      case 'el': return `<${typeName(v.type)}>`;
      default: return '…';
    }
  }

  /* Every element node, depth first; expand: also the elements components return. */
  function elements(node, { expand = true } = {}) {
    const out = [];
    (function walk(n) {
      if (!n) return;
      if (n.k === 'list') { n.items.forEach(walk); return; }
      if (n.k !== 'el') return;
      out.push(n);
      if (n.children) walk(n.children);
      if (expand && n.rendered) walk(n.rendered);
    }(node));
    return out;
  }
  const prop = (el, name) => { const p = el.props.find(([k]) => k === name); return p ? p[1] : undefined; };
  const isTag = (el, tag) => el.type.tag === tag;

  /* The DOM React builds from a tree (components expanded), as pretty-printed HTML. */
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const BOOL_ATTR = new Set(['disabled', 'checked', 'readOnly', 'required', 'hidden', 'multiple', 'selected', 'autoFocus', 'open']);
  const ATTR_NAME = { className: 'class', htmlFor: 'for', readOnly: 'readonly', autoFocus: 'autofocus', tabIndex: 'tabindex', maxLength: 'maxlength', defaultValue: 'value', defaultChecked: 'checked' };
  const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'zoom']);
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');

  function styleText(v) {
    if (!v || v.k !== 'obj') return null;
    return v.entries.filter(([, x]) => x.k === 'str' || x.k === 'num')
      .map(([k, x]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${x.k === 'num' && !UNITLESS.has(k) && x.v !== '0' ? `${x.v}px` : x.v}`).join('; ');
  }

  function attrs(el) {
    return el.props.map(([k, v]) => {
      if (/^on[A-Z]/.test(k) || k === 'dangerouslySetInnerHTML' || k === 'value' && el.type.tag === 'textarea') return '';
      if (k === 'style') { const s = styleText(v); return s ? ` style="${escAttr(s)}"` : ''; }
      const name = ATTR_NAME[k] || (/^(aria|data)-/.test(k) ? k : k);
      if (BOOL_ATTR.has(k) || k === 'defaultChecked') return v.k === 'empty' ? (v.v === 'true' ? ` ${name}=""` : '') : ` ${name}=""`;
      if (v.k === 'empty') return v.v === 'true' && /^(aria|data)-/.test(k) ? ` ${name}="true"` : '';
      if (v.k === 'str' || v.k === 'num') return ` ${name}="${escAttr(v.v)}"`;
      if (v.k === 'fn' || v.k === 'obj' || v.k === 'list') return '';
      return '';
    }).join('');
  }

  /* Flattens a node to a list of DOM pieces: { text } or { el, kids }. */
  function pieces(n, out = []) {
    if (!n) return out;
    if (n.k === 'str' || n.k === 'num') out.push({ text: n.v });
    else if (n.k === 'list') n.items.forEach((x) => pieces(x, out));
    else if (n.k === 'el') {
      if (n.type.tag) {
        const kids = n.type.tag === 'textarea' && prop(n, 'value') ? [{ text: prop(n, 'value').v }] : pieces(n.children);
        out.push({ el: n, kids });
      } else if (n.type.frag) pieces(n.children, out);
      else if (n.type.fn) {
        if (n.error) out.push({ error: `${n.type.fn} threw ${n.error}` });
        else pieces(n.rendered, out);
      } else out.push({ error: `Invalid element type: ${n.type.bad}` });
    } else if (n.k === 'obj') out.push({ error: 'Objects are not valid as a React child' });
    return out;
  }

  function htmlLines(list, indent, out) {
    // Adjacent texts merge into one text node, as in the DOM.
    const merged = [];
    list.forEach((p) => {
      const last = merged[merged.length - 1];
      if (p.text !== undefined && last && last.text !== undefined) last.text += p.text;
      else merged.push({ ...p });
    });
    merged.forEach((p) => {
      const pad = '  '.repeat(indent);
      if (p.error) { out.push(`${pad}<!-- ${p.error} -->`); return; }
      if (p.text !== undefined) { if (p.text !== '') out.push(pad + escHtml(p.text)); return; }
      const tag = p.el.type.tag;
      const open = `<${tag}${attrs(p.el)}>`;
      if (VOID.has(tag)) { out.push(pad + open); return; }
      const inlineText = p.kids.every((x) => x.text !== undefined);
      if (inlineText) { out.push(`${pad}${open}${escHtml(p.kids.map((x) => x.text).join(''))}</${tag}>`); return; }
      out.push(pad + open);
      htmlLines(p.kids, indent + 1, out);
      out.push(`${pad}</${tag}>`);
    });
    return out;
  }

  const toHtml = (tree) => htmlLines(pieces(tree), 0, []).join('\n');

  /* ======================================================================
     4. Static checks of the source
     ====================================================================== */

  /* The index parameter of every .map(callback) whose element uses it as its key. */
  function keyFromIndex(source) {
    const src = String(source || '');
    const re = /\.map\(\s*(?:function\s*[\w$]*\s*)?\(/g;
    let m;
    while ((m = re.exec(src))) {
      let depth = 1;
      let j = re.lastIndex;
      const start = j;
      while (j < src.length && depth) { if ('([{'.includes(src[j])) depth++; else if (')]}'.includes(src[j])) depth--; j++; }
      const params = src.slice(start, j - 1);
      const parts = [];
      let d = 0;
      let cur = '';
      for (const ch of params) {
        if ('([{'.includes(ch)) d++;
        else if (')]}'.includes(ch)) d--;
        if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
      }
      parts.push(cur);
      const idx = (parts[1] || '').trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(idx)) continue;
      const body = src.slice(j, j + 600);
      const keyRe = new RegExp(`key=\\{\\s*(?:${idx}\\b|String\\(\\s*${idx}\\s*\\)|${idx}\\.toString\\(\\)|\`[^\`]*\\$\\{\\s*${idx}\\s*\\}[^\`]*\`)`);
      if (keyRe.test(body)) return idx;
    }
    return null;
  }

  /* Event props given the result of a call instead of a function: onClick={save()}. */
  function handlersCalled(source) {
    const out = [];
    const re = /\b(on[A-Z]\w*)=\{\s*([A-Za-z_$][\w$.]*)\s*\(([^()]*)\)\s*\}/g;
    let m;
    while ((m = re.exec(String(source || '')))) out.push({ prop: m[1], call: `${m[2]}(${m[3]})` });
    return out;
  }

  /* ======================================================================
     5. DOM snapshots (from the playground frame)
     ====================================================================== */

  const isEl = (n) => n && typeof n === 'object';
  function textOf(n) {
    if (n == null) return '';
    if (typeof n === 'string') return n;
    return (n.k || []).map(textOf).join('');
  }
  function textNodes(n, out = []) {
    if (typeof n === 'string') out.push(n);
    else if (isEl(n)) (n.k || []).forEach((c) => textNodes(c, out));
    return out;
  }

  function parseCompound(s) {
    const c = { tag: null, classes: [], id: null, attrs: [] };
    const re = /([a-zA-Z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]|(\*)/g;
    let m;
    while ((m = re.exec(s))) {
      if (m[1]) c.tag = m[1].toLowerCase();
      else if (m[2]) c.classes.push(m[2]);
      else if (m[3]) c.id = m[3];
      else if (m[4]) c.attrs.push([m[4], m[5]]);
    }
    return c;
  }
  function matches(n, c) {
    if (!isEl(n)) return false;
    const a = n.a || {};
    if (c.tag && n.t !== c.tag) return false;
    if (c.id && a.id !== c.id) return false;
    const cls = String(a.class || '').split(/\s+/);
    if (c.classes.some((x) => !cls.includes(x))) return false;
    return c.attrs.every(([k, v]) => (k in a) && (v === undefined || a[k] === v));
  }
  function descendants(n, out = []) {
    (n.k || []).forEach((c) => { if (isEl(c)) { out.push(c); descendants(c, out); } });
    return out;
  }

  /* Elements of a snapshot that match a selector (document order, no duplicates). */
  function query(snap, selector) {
    if (!isEl(snap)) return [];
    const tokens = String(selector).trim().replace(/\s*>\s*/g, ' > ').split(/\s+/);
    let set = [snap];
    let child = false;
    let first = true;
    tokens.forEach((tok) => {
      if (tok === '>') { child = true; return; }
      const c = parseCompound(tok);
      const next = [];
      set.forEach((n) => {
        const pool = first ? [n, ...descendants(n)] : child ? (n.k || []).filter(isEl) : descendants(n);
        pool.forEach((x) => { if (matches(x, c) && !next.includes(x)) next.push(x); });
      });
      set = next;
      child = false;
      first = false;
    });
    return set;
  }
  const texts = (snap, sel) => query(snap, sel).map((n) => textOf(n).trim().replace(/\s+/g, ' '));

  /* ======================================================================
     6. JSX viewer: presets and challenges
     ====================================================================== */

  const JV_PRESETS = [
    { id: 'element', title: 'An element with props', code: `function App() {
  const name = 'Ana';
  return (
    <h1 className="title" id="greeting">
      Hello, {name}!
    </h1>
  );
}` },
    { id: 'component', title: 'A component with props and children', code: `function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function App() {
  return (
    <Card title="Today">
      <p>Buy milk</p>
    </Card>
  );
}` },
    { id: 'list', title: 'A list with keys', code: `const tasks = [
  { id: 't1', title: 'Buy milk', done: true },
  { id: 't2', title: 'Call Ana', done: false },
];

function App() {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}` },
    { id: 'conditional', title: 'Conditional rendering', code: `function App() {
  const tasks = [];
  const loggedIn = true;
  return (
    <div>
      {loggedIn ? <p>Welcome back</p> : <p>Please log in</p>}
      {tasks.length > 0 && <p>{tasks.length} tasks</p>}
      {tasks.length && <p>This shows a 0</p>}
      {null}{false}{undefined}
    </div>
  );
}` },
    { id: 'fragment', title: 'A fragment', code: `function App() {
  return (
    <>
      <h1>Tasks</h1>
      <p>3 left</p>
    </>
  );
}` },
    { id: 'events', title: 'Event handlers and inputs', code: `function save() {
  console.log('Saved');
}

function App() {
  return (
    <form>
      <label htmlFor="title">Title</label>
      <input id="title" value="Buy milk" onChange={(e) => console.log(e.target.value)} />
      <button type="button" onClick={save}>Save</button>
      <button type="button" style={{ marginLeft: 8, color: 'crimson' }} onClick={() => console.log('Cancel')}>Cancel</button>
    </form>
  );
}` },
  ];

  const appOf = (tree) => (tree && tree.k === 'el' && tree.type.fn ? tree.rendered : tree);
  const ok = (text) => ({ status: 'ok', text });
  const bad = (text) => ({ status: 'bad', text });
  const item = (cond, yes, no) => (cond ? ok(yes) : bad(no));

  const JV_CHALLENGES = [
    { id: 'jv-predict-element', kind: 'predict', title: 'Predict the createElement call',
      goal: 'What does this JSX compile to?',
      snippet: `<h1 className="title">Hello, {name}!</h1>`,
      code: `function App() {
  const name = 'Ana';
  return <h1 className="title">Hello, {name}!</h1>;
}`,
      choices: [
        "React.createElement('h1', { className: 'title' }, 'Hello, ', name, '!')",
        "React.createElement('h1', { class: 'title' }, 'Hello, {name}!')",
        "document.createElement('h1')",
        "React.createElement('h1', 'title', 'Hello, ' + name + '!')",
      ],
      answer: 0,
      why: 'JSX is only a nicer way to write `React.createElement(type, props, ...children)`. The attributes become one props object (with the JavaScript name `className`), and the text around `{name}` becomes separate children: a string, the variable, another string. Nothing touches the page yet: the call returns an object.' },
    { id: 'jv-fragment', kind: 'fix', title: 'Return two siblings',
      goal: 'This component fails to compile: a component returns **one** value, and two elements side by side are two values. Make it return the `<h1>` and the `<p>` without adding an extra `<div>` to the page.',
      hint: 'Wrap them in a fragment: `<>` … `</>`. A fragment groups elements without creating a DOM element.',
      code: `function App() {
  return (
    <h1>Tasks</h1>
    <p>3 left</p>
  );
}`,
      check(tree) {
        const top = appOf(tree);
        const els = elements(top);
        const h1 = els.some((e) => isTag(e, 'h1'));
        const p = els.some((e) => isTag(e, 'p'));
        const wrapped = top && top.k === 'el' && top.type.tag;
        return [
          item(h1 && p, 'App returns both the `<h1>` and the `<p>`.', 'App should still return the `<h1>` and the `<p>`.'),
          item(!wrapped, 'No extra element: the fragment leaves nothing in the DOM.', `It works, but the \`<${top && top.type ? typeName(top.type) : '?'}>\` is an extra element in the page. Use a fragment \`<>…</>\` instead.`),
        ];
      } },
    { id: 'jv-predict-component', kind: 'predict', title: 'Predict a component element',
      goal: 'What does this JSX compile to?',
      snippet: `<Card title="Today">
  <p>Buy milk</p>
</Card>`,
      code: `function Card({ title, children }) {
  return <section><h2>{title}</h2>{children}</section>;
}

function App() {
  return (
    <Card title="Today">
      <p>Buy milk</p>
    </Card>
  );
}`,
      choices: [
        "React.createElement('Card', { title: 'Today' }, React.createElement('p', null, 'Buy milk'))",
        "Card({ title: 'Today', children: '<p>Buy milk</p>' })",
        "React.createElement(Card, { title: 'Today' }, React.createElement('p', null, 'Buy milk'))",
        "React.createElement(Card, { title: 'Today', p: 'Buy milk' })",
      ],
      answer: 2,
      why: 'A capitalised tag is a **variable**: the function `Card` itself is passed as the type, not the string `\'Card\'` (a lowercase or quoted name would be an HTML tag). The content between the tags is compiled too and arrives as the `children` prop. `Card` is not called here: React calls it later, when it renders the element.' },
    { id: 'jv-attrs', kind: 'fix', title: 'Fix the HTML habits',
      goal: 'This was pasted from an HTML page. Make it valid JSX: every tag closed, and the JavaScript names for the two attributes whose HTML names are reserved words in JavaScript.',
      hint: 'Self-close the void elements (`<input … />`, `<img … />`); `class` is `className` and `for` is `htmlFor`.',
      code: `function App() {
  return (
    <form>
      <label class="label" for="email">Email</label>
      <input id="email" type="email">
      <img src="logo.png" alt="Logo">
    </form>
  );
}`,
      check(tree) {
        const els = elements(appOf(tree));
        const label = els.find((e) => isTag(e, 'label'));
        const wrong = els.filter((e) => prop(e, 'class') || prop(e, 'for'));
        return [
          item(els.some((e) => isTag(e, 'input')) && els.some((e) => isTag(e, 'img')), 'The `<input>` and the `<img>` are closed and still there.', 'Keep the `<input>` and the `<img>`, self-closed.'),
          item(label && prop(label, 'className') && prop(label, 'htmlFor'), 'The label uses `className` and `htmlFor`.', 'The `<label>` needs `className` and `htmlFor`.'),
          item(!wrong.length, 'No `class` or `for` props left.', 'A `class` or `for` prop is still there (React would warn: "Invalid DOM property").'),
        ];
      } },
    { id: 'jv-predict-zero', kind: 'predict', title: 'Predict what && renders',
      goal: 'With `count` equal to `0`, what appears inside the `<div>`?',
      snippet: `const count = 0;
<div>{count && <p>{count} new messages</p>}</div>`,
      code: `function App() {
  const count = 0;
  return <div>{count && <p>{count} new messages</p>}</div>;
}`,
      choices: ['Nothing', 'The text 0', 'The text false', 'An error'],
      answer: 1,
      why: '`a && b` gives back `a` when `a` is falsy. `0 && …` is the number `0`, and React renders numbers as text, so a lone `0` appears. (`false`, `null` and `undefined` render nothing.) Write a real boolean: `{count > 0 && …}`, or use a ternary.' },
    { id: 'jv-keys', kind: 'fix', title: 'Key the list',
      goal: 'Give each `<li>` a `key` that identifies its task, so React can tell the items apart when the list changes.',
      hint: 'Use the id the data already has: `key={task.id}` on the element returned by `map`. Not the index.',
      code: `const tasks = [
  { id: 't1', title: 'Buy milk' },
  { id: 't2', title: 'Call Ana' },
  { id: 't3', title: 'Water the plants' },
];

function App() {
  return (
    <ul>
      {tasks.map((task, index) => (
        <li>{task.title}</li>
      ))}
    </ul>
  );
}`,
      check(tree) {
        const lis = elements(appOf(tree)).filter((e) => isTag(e, 'li'));
        const keys = lis.map((e) => e.key);
        return [
          item(lis.length === 3, 'Three `<li>` elements.', `Expected three \`<li>\` elements, found ${lis.length}.`),
          item(keys.every((k) => k !== null), 'Every `<li>` has a key.', 'Some `<li>` has no key: put `key={…}` on the element that `map` returns.'),
          item(keys.join() === 't1,t2,t3', 'The keys are the task ids (`t1`, `t2`, `t3`).', keys.join() === '0,1,2' ? 'The keys are the positions (0, 1, 2): they change when a task is inserted or removed. Use `task.id`.' : 'The keys should be the task ids.'),
        ];
      } },
    { id: 'jv-predict-call', kind: 'predict', title: 'Predict when a component runs',
      goal: 'When this line runs, what happens?',
      snippet: `const el = <Greeting name="Ana" />;`,
      code: `function Greeting({ name }) {
  console.log('Greeting runs for', name);
  return <p>Hello, {name}</p>;
}

function App() {
  const el = <Greeting name="Ana" />;
  return <div>{el}</div>;
}`,
      choices: [
        'Greeting is called and el holds the <p> element it returns',
        'el is a small object { type: Greeting, props: { name: \'Ana\' } }; React calls Greeting later, when it renders',
        'A <p> is added to the page',
        'Greeting is called once now and again every second',
      ],
      answer: 1,
      why: 'Creating an element only **describes** what you want. React decides when to call `Greeting` (when it renders that part of the tree, and again whenever it re-renders it). That is why you never call a component as `Greeting()` yourself.' },
    { id: 'jv-handler', kind: 'fix', title: 'Pass the function, do not call it',
      goal: 'The button never saves. Look at the `onClick` prop in the element tree: it is `undefined`. Make it a **function** React can call on each click.',
      hint: '`onClick={save()}` calls `save` while rendering and passes its result (undefined). Pass the function: `onClick={save}`, or wrap it: `onClick={() => save()}`.',
      code: `function save() {
  console.log('Saved!');
}

function App() {
  return <button onClick={save()}>Save</button>;
}`,
      check(tree) {
        const btn = elements(appOf(tree)).find((e) => isTag(e, 'button'));
        const h = btn && prop(btn, 'onClick');
        return [
          item(!!btn, 'There is a `<button>`.', 'Keep the `<button>`.'),
          item(h && h.k === 'fn', '`onClick` holds a function: React calls it on every click, not while rendering.', `\`onClick\` is ${h ? fmtValue(h) : 'missing'}: it must be a function.`),
        ];
      } },
  ];

  /* ======================================================================
     7. Component playground: challenges and the judge
     ====================================================================== */

  const KEY_WARNING = /unique "key" prop/;
  const CONTROL_WARNING = /uncontrolled input to be controlled|controlled input to be uncontrolled|`value` prop to a form field without an `onChange`/;

  const TASKS = [{ id: 'a1', title: 'Buy milk' }, { id: 'b2', title: 'Call Ana' }];

  const CP_CHALLENGES = [
    { id: 'cp-list', title: 'Render a list with keys',
      goal: 'Show one `<li>` per task inside the `<ul>`, with the task title as its text, built from the array with `map`. Each `<li>` needs a `key`.',
      hint: '`{tasks.map((task) => <li key={task.id}>{task.title}</li>)}` inside the `<ul>`. The key goes on the element `map` returns, and it comes from the data (the id), not from the position.',
      starter: `const tasks = [
  { id: 't1', title: 'Buy milk' },
  { id: 't2', title: 'Call Ana' },
  { id: 't3', title: 'Water the plants' },
];

function App() {
  return (
    <ul>
      {/* one <li> per task, showing its title */}
    </ul>
  );
}`,
      steps: [{ snap: 'start' }],
      checks({ snaps, warned, source }) {
        const t = texts(snaps.start, 'ul > li');
        const idx = keyFromIndex(source);
        return [
          item(t.length === 3, 'The list shows 3 items.', `The list shows ${t.length} items; there are 3 tasks.`),
          item(t.join('|') === 'Buy milk|Call Ana|Water the plants', 'Each item shows its task title, in order.', 'Each `<li>` should show its task title.'),
          item(/\.map\s*\(/.test(source), 'The items are built from the array with `map`.', 'Build the items from `tasks` with `map`, so the list follows the data.'),
          ...(t.length ? [
            item(!warned(KEY_WARNING), 'React did not warn about keys.', 'React warned: "Each child in a list should have a unique key prop".'),
            item(!idx, 'The key comes from the data.', `The key is the position (\`${idx}\`): use \`task.id\`, which stays with the task when the list changes.`),
          ] : []),
        ];
      } },
    { id: 'cp-props', title: 'Pass props to a child',
      goal: '`Greeting` ignores what it is given. Make it read its `name` prop so the page says "Hello, Ana!" and "Hello, Luis!", then add a third greeting for **Marta**.',
      hint: 'Receive the props in the parameter: `function Greeting({ name })`, and write `{name}` in the JSX. The third one is `<Greeting name="Marta" />` in App.',
      starter: `function Greeting() {
  return <p>Hello, someone!</p>;
}

function App() {
  return (
    <div>
      <Greeting name="Ana" />
      <Greeting name="Luis" />
    </div>
  );
}`,
      steps: [{ snap: 'start' }],
      checks({ snaps }) {
        const t = texts(snaps.start, 'p');
        return [
          item(t[0] === 'Hello, Ana!' && t[1] === 'Hello, Luis!', 'Greeting shows the name it receives.', `The greetings read: ${t.map((x) => `"${x}"`).join(', ') || '(none)'}.`),
          item(t.length === 3 && t[2] === 'Hello, Marta!', 'A third Greeting says "Hello, Marta!".', 'Add a third `<Greeting>` for Marta after Luis.'),
        ];
      } },
    { id: 'cp-children', title: 'Wrap content with children',
      goal: '`Card` shows its title but drops what is written between `<Card>` and `</Card>`. Make it show that content under the title.',
      hint: 'Whatever sits between the opening and closing tag arrives as the `children` prop: take it with `function Card({ title, children })` and write `{children}` where it should appear.',
      starter: `function Card({ title }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {/* the content between <Card> and </Card> goes here */}
    </section>
  );
}

function App() {
  return (
    <Card title="Today">
      <p>Buy milk</p>
      <p>Call Ana</p>
    </Card>
  );
}`,
      steps: [{ snap: 'start' }],
      checks({ snaps }) {
        return [
          item(texts(snaps.start, 'section.card > h2')[0] === 'Today', 'The card keeps its `<h2>` title.', 'Keep the `<h2>` with the title inside `section.card`.'),
          item(texts(snaps.start, 'section.card p').join('|') === 'Buy milk|Call Ana', 'Both paragraphs appear inside the card.', 'The two paragraphs should appear inside `section.card`.'),
        ];
      } },
    { id: 'cp-conditional', title: 'Show a message when the list is empty',
      goal: 'With no tasks, this shows a stray **0**. Show `<p>No tasks yet.</p>` when `tasks` is empty, and the list (without the message) when there are tasks. The checker renders `<App tasks={[]} />` and then `<App tasks={[…two tasks]} />`.',
      hint: '`tasks.length && …` gives `0` when the list is empty, and React prints numbers. Use a ternary: `{tasks.length > 0 ? <ul>…</ul> : <p>No tasks yet.</p>}`, or an early `return`.',
      starter: `function App({ tasks = [] }) {
  return (
    <div>
      <h1>Tasks</h1>
      {tasks.length && (
        <ul>
          {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
        </ul>
      )}
    </div>
  );
}`,
      steps: [{ render: { tasks: [] } }, { snap: 'empty' }, { render: { tasks: TASKS } }, { snap: 'full' }],
      checks({ snaps }) {
        const emptyText = textOf(snaps.empty);
        const stray = textNodes(snaps.empty).some((x) => x.trim() === '0');
        return [
          item(/No tasks yet\./.test(emptyText), 'Empty: "No tasks yet." appears.', 'Empty: show `<p>No tasks yet.</p>`.'),
          item(!stray, 'Empty: no stray 0.', 'Empty: a lone 0 is on the page (from `tasks.length && …`).'),
          item(texts(snaps.full, 'li').join('|') === 'Buy milk|Call Ana', 'With tasks: both tasks are listed.', 'With two tasks, both should be listed as `<li>`.'),
          item(!/No tasks yet/.test(textOf(snaps.full)), 'With tasks: the empty message is gone.', 'With tasks, the empty message should not show.'),
        ];
      } },
    { id: 'cp-event', title: 'Fix the click handler',
      goal: 'This counter crashes before it appears. Fix the `onClick` so each click adds one.',
      hint: '`onClick={setCount(count + 1)}` calls `setCount` **while rendering**, which renders again, which calls it again… Pass a function: `onClick={() => setCount(count + 1)}`.',
      starter: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={setCount(count + 1)}>Add one</button>
    </div>
  );
}`,
      steps: [{ snap: 's0' }, { click: 'button' }, { snap: 's1' }, { click: 'button' }, { snap: 's2' }],
      checks({ snaps }) {
        const c = (s) => texts(snaps[s], 'p')[0];
        return [
          item(c('s0') === 'Count: 0', 'It starts at "Count: 0".', `At the start the paragraph should read "Count: 0" (it reads ${c('s0') ? `"${c('s0')}"` : 'nothing'}).`),
          item(c('s1') === 'Count: 1' && c('s2') === 'Count: 2', 'Each click adds one.', 'After two clicks it should read "Count: 1", then "Count: 2".'),
        ];
      } },
    { id: 'cp-controlled', title: 'Make a controlled input',
      goal: 'The greeting ignores the input, and **Clear** cannot empty it. Make the input controlled: its `value` comes from `name`, and every keystroke updates `name`.',
      hint: 'Two props on the `<input>`: `value={name}` and `onChange={(e) => setName(e.target.value)}`. Then the state is the single source of truth, so `setName(\'\')` empties the box too.',
      starter: `import { useState } from 'react';

function App() {
  const [name, setName] = useState('');
  return (
    <div>
      <label htmlFor="name">Your name</label>
      <input id="name" />
      <p>Hello, {name || 'stranger'}!</p>
      <button type="button" onClick={() => setName('')}>Clear</button>
    </div>
  );
}`,
      steps: [{ snap: 's0' }, { type: 'input', text: 'Ana' }, { snap: 'typed' }, { click: 'button', text: 'Clear' }, { snap: 'cleared' }],
      checks({ snaps, warned }) {
        const p = (s) => texts(snaps[s], 'p')[0];
        const input = query(snaps.cleared, 'input')[0];
        return [
          item(p('typed') === 'Hello, Ana!', 'Typing "Ana" updates the greeting.', `After typing "Ana" the greeting reads ${p('typed') ? `"${p('typed')}"` : 'nothing'}: \`onChange\` must update \`name\`.`),
          item(p('cleared') === 'Hello, stranger!' && input && input.v === '', 'Clear empties the state **and** the box.', input && input.v ? `After Clear the box still says "${input.v}": give the input \`value={name}\` so it shows the state.` : 'After Clear the greeting should read "Hello, stranger!" and the box should be empty.'),
          item(!warned(CONTROL_WARNING), 'No controlled-input warnings.', 'React warned about the input: give it both `value` and `onChange`, and start the state as a string.'),
        ];
      } },
    { id: 'cp-form', title: 'Handle a form submit',
      goal: 'Write `handleSubmit` and connect it with `onSubmit` on the form: stop the page reload, ignore an empty title (spaces count as empty), add the task to the list, and clear the input.',
      hint: '`<form onSubmit={handleSubmit}>`. Inside: `event.preventDefault();` then `const clean = title.trim(); if (!clean) return;` then `setTasks([...tasks, { id: crypto.randomUUID(), title: clean }]); setTitle(\'\');`.',
      starter: `import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState([]);

  function handleSubmit(event) {
    // 1. stop the browser from reloading the page
    // 2. ignore an empty title
    // 3. add the task, then clear the input
  }

  return (
    <form>
      <label htmlFor="title">New task</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Add</button>
      <ul>
        {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
      </ul>
    </form>
  );
}`,
      steps: [
        { type: 'input', text: 'Buy bread' }, { submit: 'form' }, { snap: 'one' },
        { type: 'input', text: '   ' }, { submit: 'form' }, { snap: 'blank' },
        { type: 'input', text: 'Call Ana' }, { submit: 'form' }, { snap: 'two' },
      ],
      checks({ snaps, report, warned }) {
        const lis = (s) => texts(snaps[s], 'li');
        const input = query(snaps.one, 'input')[0];
        const prevented = report.submits.length > 0 && report.submits.every((s) => s.prevented);
        return [
          item(prevented, 'Every submit called `preventDefault()`: no page reload.', 'The submit was not prevented: in a real page the browser would reload and the list would be lost. Call `event.preventDefault()` in an `onSubmit` handler on the `<form>`.'),
          item(lis('one').join('|') === 'Buy bread', 'Submitting "Buy bread" adds it to the list.', 'After submitting "Buy bread" the list should hold exactly that task.'),
          item(input && input.v === '', 'The input is cleared after adding.', 'Clear the input after adding: `setTitle(\'\')`.'),
          item(lis('blank').length === 1, 'A blank title is ignored.', 'Submitting spaces added an empty task: check `title.trim()` first.'),
          item(lis('two').join('|') === 'Buy bread|Call Ana', 'A second task is added after the first.', 'After "Call Ana" the list should read "Buy bread", "Call Ana".'),
          item(!warned(KEY_WARNING), 'Every task has a unique key.', 'React warned about keys: give each new task a unique id (for example `crypto.randomUUID()`).'),
        ];
      } },
  ];

  const ERROR_HELP = [
    [/Too many re-renders/, 'A state setter runs during render (often `onClick={setX(…)}`): pass a function instead, `onClick={() => setX(…)}`.'],
    [/Objects are not valid as a React child/, 'You put an object inside `{}`: show one of its fields (`{task.title}`) instead.'],
    [/is not defined/, 'A name is used before it is defined (or misspelled).'],
    [/Cannot read properties of undefined/, 'Something is `undefined`: did you destructure a prop that was not passed?'],
  ];

  function judge(challenge, report, source) {
    const r = report || {};
    const consoleLines = r.console || [];
    if (r.timeout) return { ok: false, items: [bad('The check did not finish within 4 seconds: is there an infinite loop?')] };
    if (r.error) {
      const help = ERROR_HELP.find(([re]) => re.test(r.error));
      const called = handlersCalled(source);
      const items = [bad(`Your component threw an error: ${r.error}`)];
      if (help) items.push({ status: 'note', text: help[1] });
      if (called.length && !help) items.push({ status: 'note', text: `\`${called[0].prop}={${called[0].call}}\` calls the function while rendering.` });
      return { ok: false, items };
    }
    if (r.missing && r.missing.length) return { ok: false, items: r.missing.map((m) => bad(`The checker could not find ${m}: keep it in the page.`)) };
    const warned = (re) => consoleLines.some((l) => (l.level === 'error' || l.level === 'warn') && re.test(l.text));
    const items = challenge.checks({ snaps: r.snaps || {}, report: { submits: r.submits || [] }, warned, source: String(source || '') });
    return { ok: items.every((i) => i.status === 'ok'), items };
  }

  return {
    program, readResult, tidyCompiled, segments, toHtml, elements, fmtValue, typeName, prop,
    keyFromIndex, handlersCalled, query, textOf, textNodes, texts, judge,
    JV_PRESETS, JV_CHALLENGES, CP_CHALLENGES, KEY_WARNING, CONTROL_WARNING,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ComponentsEngine;
