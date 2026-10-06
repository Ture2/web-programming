'use strict';

/* ==========================================================================
   Components tools (React as the worked example). Pure logic: js/tools/components-engine.js.

   jsx-viewer            edit a small JSX file and see, side by side, what the
                         compiler makes of it (React.createElement calls, by the
                         vendored Sucrase), the element tree those calls build
                         (run in a Web Worker with a recording React), the HTML of
                         the DOM React would create, and a live preview with the
                         real React (its warnings in the console). Presets, and
                         8 challenges ("predict the call" / "fix the JSX"):
                         challengeStore 'jsx-challenges-v1'.
   component-playground  write a component for a goal; "Check" runs it with the
                         real React in a hidden sandboxed frame that clicks, types
                         and submits like a user, and reports DOM snapshots, submit
                         events and console warnings back by postMessage; the
                         engine judges them. 7 challenges: challengeStore
                         'components-challenges-v1'; code kept in
                         'component-playground-work-v1'.
   Frames: <iframe sandbox="allow-scripts"> (opaque origin), React from vendor/react/.
   ========================================================================== */

(() => {
  const E = ComponentsEngine;
  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  const abs = (p) => new URL(p, location.href).href;
  const onFile = () => location.protocol === 'file:';

  /* ======================================================================
     Frames running the real React, reporting by postMessage
     ====================================================================== */

  const CAPTURE = (token) => `<script>(function () {
    var T = ${json(token)};
    window.__cmpLog = [];
    function str(v) {
      if (typeof v === 'string') return v;
      if (v instanceof Error) return v.name + ': ' + v.message;
      try { return v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v); } catch (e) { return String(v); }
    }
    function fmt(args) {
      args = Array.prototype.slice.call(args);
      if (typeof args[0] === 'string' && /%[sdifoOc]/.test(args[0])) {
        var rest = args.slice(1);
        var head = args[0].replace(/%([sdifoOc%])/g, function (m, k) {
          if (k === '%') return '%';
          if (!rest.length) return m;
          var v = rest.shift();
          return k === 'c' ? '' : str(v);
        });
        args = [head].concat(rest);
      }
      return args.map(str).join(' ');
    }
    ['log', 'info', 'warn', 'error'].forEach(function (level) {
      var orig = console[level];
      console[level] = function () {
        var text = fmt(arguments);
        if (text.indexOf('React DevTools') >= 0) return;
        if (window.__cmpLog.length < 300) {
          window.__cmpLog.push({ level: level, text: text });
          parent.postMessage({ __cmp: T, kind: 'console', level: level, text: text }, '*');
        }
        orig.apply(console, arguments);
      };
    });
  })();<\/script>`;

  /* Runs inside the frame after React loaded. opts = { token, steps | null }. */
  const RUNTIME = String(function runtime(__code, __selfRender, __opts) {
    var root = document.getElementById('root');
    var report = { snaps: {}, submits: [], error: null, missing: [] };
    var finished = false;
    function post(m) { m.__cmp = __opts.token; parent.postMessage(m, '*'); }
    function errText(err) { return err && err.name ? err.name + ': ' + err.message : String(err); }
    function show(title, err) {
      var box = document.getElementById('__err') || document.body.appendChild(document.createElement('pre'));
      box.id = '__err';
      box.textContent = title + '\n' + errText(err);
    }
    function fail(title, err) { if (!report.error) report.error = errText(err); show(title, err); console.error(errText(err)); }
    function finish() {
      if (finished || !__opts.steps) return;
      finished = true;
      report.console = window.__cmpLog || [];
      post({ kind: 'report', report: report });
    }
    function req(name) {
      if (name === 'react') return React;
      if (name === 'react-dom' || name === 'react-dom/client') return ReactDOM;
      if (/\.module\.css$/.test(name)) return new Proxy({}, { get: function (o, k) { return k === '__esModule' ? false : String(k); } });
      if (/\.css$/.test(name)) return {};
      throw new Error('"' + name + '" is not available here: this preview only has react and react-dom.');
    }
    var module = { exports: {} };
    try {
      (0, eval)('(function (require, module, exports) {\n' + __code + '\n;if (!exports.default && typeof App === "function") exports.default = App;\n})\n//# sourceURL=App.jsx')(req, module, module.exports);
    } catch (err) { fail('Your code threw an error while it loaded:', err); finish(); return; }
    var App = module.exports.default;
    if (__selfRender && __opts.steps) { report.error = 'Let the checker render App: remove your createRoot call.'; finish(); return; }
    if (__selfRender) return;
    if (typeof App !== 'function') { fail('Nothing to render.', 'Define a component called App, or export one as default.'); finish(); return; }
    var reactRoot = ReactDOM.createRoot(root, { onUncaughtError: function (err) { fail('Your component threw an error while rendering:', err); } });
    if (!__opts.steps) { reactRoot.render(React.createElement(App)); return; }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function snap(n) {
      if (n.nodeType === 3) return n.nodeValue;
      if (n.nodeType !== 1) return null;
      var o = { t: n.tagName.toLowerCase(), a: {}, k: [] };
      Array.prototype.forEach.call(n.attributes, function (a) { o.a[a.name] = a.value; });
      if (/^(input|textarea|select)$/.test(o.t)) o.v = n.value;
      if (o.t === 'input' && (n.type === 'checkbox' || n.type === 'radio')) o.c = n.checked;
      Array.prototype.forEach.call(n.childNodes, function (c) { var s = snap(c); if (s !== null) o.k.push(s); });
      return o;
    }
    function find(sel, text) {
      var all = Array.prototype.slice.call(root.querySelectorAll(sel));
      if (text) all = all.filter(function (e) { return e.textContent.trim() === text; });
      return all[0] || null;
    }
    function render(props) {
      try { ReactDOM.flushSync(function () { reactRoot.render(React.createElement(App, props || null)); }); } catch (err) { fail('Your component threw an error while rendering:', err); }
    }
    (async function () {
      render(null);
      await wait(40);
      for (var i = 0; i < __opts.steps.length && !report.error; i++) {
        var s = __opts.steps[i];
        if (s.snap) { report.snaps[s.snap] = snap(root); continue; }
        if (s.render) render(s.render);
        else if (s.type) {
          var el = find(s.type);
          if (!el) { report.missing.push('the <' + s.type + '>'); break; }
          var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, s.text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (s.click) {
          var b = find(s.click, s.text);
          if (!b) { report.missing.push(s.text ? 'the <' + s.click + '> "' + s.text + '"' : 'the <' + s.click + '>'); break; }
          b.click();
        } else if (s.submit) {
          var f = find(s.submit);
          if (!f) { report.missing.push('the <' + s.submit + '>'); break; }
          var ev = typeof SubmitEvent === 'function' ? new SubmitEvent('submit', { bubbles: true, cancelable: true }) : new Event('submit', { bubbles: true, cancelable: true });
          f.dispatchEvent(ev);
          report.submits.push({ prevented: ev.defaultPrevented });
        }
        await wait(40);
      }
      finish();
    })();
  });

  const FRAME_CSS = '#__err{margin:0;padding:12px;border-left:4px solid #b3261e;background:#fdecea;color:#5c1611;font:13px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap}';

  function framePage(compiled, token, steps) {
    const html = `${CAPTURE(token)}<div id="root"></div><script src="${abs('vendor/react/react.js')}"><\/script>`;
    const js = `(${RUNTIME})(${json(compiled.code)}, ${compiled.selfRender ? 'true' : 'false'}, ${json({ token, steps: steps || null })});`;
    return Sandbox.page({ html, css: FRAME_CSS, js });
  }

  const listeners = {};
  let seq = 0;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d.__cmp !== 'string' || !listeners[d.__cmp]) return;
    listeners[d.__cmp](d);
  });

  /* A visible preview: sets the frame's page; console lines go to onLine. */
  function preview(frame, compiled, onLine) {
    Object.keys(listeners).filter((k) => listeners[k].frame === frame).forEach((k) => delete listeners[k]);
    const token = `cmp-${++seq}`;
    const fn = (d) => { if (d.kind === 'console') onLine({ level: d.level, text: d.text }); };
    fn.frame = frame;
    listeners[token] = fn;
    frame.srcdoc = framePage(compiled, token);
  }

  /* A hidden frame that runs the steps and resolves with the report (or { timeout }). */
  function runSteps(host, compiled, steps) {
    return new Promise((resolve) => {
      const token = `cmp-${++seq}`;
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.title = t('Checker');
      frame.hidden = true;
      const done = (rep) => { clearTimeout(timer); delete listeners[token]; frame.remove(); resolve(rep); };
      const timer = setTimeout(() => done({ timeout: true }), 5000);
      listeners[token] = (d) => { if (d.kind === 'report') done(d.report); };
      frame.srcdoc = framePage(compiled, token, steps);
      host.appendChild(frame);
    });
  }

  const compileErrorHtml = (err) => {
    const at = err.line ? ` ${t('(line {line}, column {col})', { line: err.line, col: (err.column || 0) + 1 })}` : '';
    return `${Sandbox.lineHtml({ level: 'error', text: `SyntaxError: ${err.message}${at}` })}${err.frame ? `<pre class="lr-frame">${esc(err.frame)}</pre>` : ''}`;
  };
  const fileNotice = () => `<p class="lr-line lr-warn">${esc(t('React previews need the page to be served over http(s). Run npm run site:serve and open http://localhost:8080.'))}</p>`;
  const editor = ({ id, fid, label, value, rows, data }) => `<div class="lr-pane">
      <label class="lr-label" for="${id}">${esc(label)}</label>
      <textarea class="lr-code" id="${id}" data-fid="${fid}" ${data} rows="${rows}" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(value)}</textarea>
    </div>`;
  const rowsFor = (s) => Math.min(20, Math.max(6, String(s).split('\n').length + 1));

  /* ======================================================================
     1. JSX viewer
     ====================================================================== */

  const jvStore = challengeStore('jsx-challenges-v1');
  const JVC = E.JV_CHALLENGES;
  let jvMode = null;                    // challenge index, or 'free'
  let jvPreset = E.JV_PRESETS[0].id;
  const jvCode = {};                    // mode key → code
  const jvAnswer = {};                  // challenge id → chosen index
  let jvHint = false;
  let jvExpand = true;
  let jvOut = null;                     // { compiled, error, tree, evalError, logs, html, items }
  let jvLines = [];                     // preview console
  let jvRun = 0;
  let jvJustSolved = '';

  const jvCurrent = () => {
    if (jvMode === null) { const k = JVC.findIndex((c) => !jvStore.isSolved(c.id)); jvMode = k < 0 ? 'free' : k; }
    return jvMode;
  };
  const jvChallenge = () => (jvCurrent() === 'free' ? null : JVC[jvCurrent()]);
  const jvKey = () => (jvChallenge() ? jvChallenge().id : `free:${jvPreset}`);
  const jvSource = () => {
    const k = jvKey();
    if (jvCode[k] === undefined) jvCode[k] = jvChallenge() ? jvChallenge().code : E.JV_PRESETS.find((p) => p.id === jvPreset).code;
    return jvCode[k];
  };
  const jvLocked = () => { const c = jvChallenge(); return !!(c && c.kind === 'predict' && jvAnswer[c.id] === undefined); };

  function treeHtml(n) {
    if (!n) return '';
    switch (n.k) {
      case 'el': {
        const name = E.typeName(n.type);
        const kind = n.type.tag ? 'tag' : n.type.fn ? 'fn' : n.type.frag ? 'frag' : 'bad';
        const label = n.type.tag ? `'${name}'` : n.type.frag ? 'React.Fragment' : name;
        const note = kind === 'fn' ? t('a component: a function') : kind === 'tag' ? t('an HTML tag') : kind === 'frag' ? t('groups children, no DOM element') : t('not a valid type');
        const props = n.props.map(([k, v]) => `<li><code>${esc(k)}: ${esc(E.fmtValue(v))}</code></li>`).join('');
        const kids = n.children ? `<div class="jv-kids"><span class="jv-lbl">props.children:</span>${childHtml(n.children)}</div>` : '';
        const rendered = kind === 'fn' && jvExpand
          ? `<div class="jv-rendered"><span class="jv-lbl">${esc(t('React calls {f}(props); it returns:', { f: name }))}</span>${n.error ? `<p class="tl-bad">${esc(n.error)}</p>` : childHtml(n.rendered)}</div>`
          : '';
        return `<div class="jv-el jv-${kind}">
            <p class="jv-head"><code class="jv-type">type: ${esc(label)}</code> <span class="muted small">${esc(note)}</span>${n.key !== null ? ` <code class="jv-key">key: ${esc(JSON.stringify(n.key))}</code>` : ''}</p>
            ${props ? `<ul class="jv-props" aria-label="${esc(t('props'))}">${props}</ul>` : ''}
            ${kids}${rendered}
          </div>`;
      }
      default: return childHtml(n);
    }
  }
  function childHtml(n) {
    if (!n) return '';
    if (n.k === 'el') return treeHtml(n);
    if (n.k === 'list') {
      return `<ol class="jv-list" aria-label="${esc(t('array of {n}', { n: n.items.length }))}">${n.items.map((x) => `<li>${childHtml(x)}</li>`).join('')}</ol>`;
    }
    if (n.k === 'str') return `<p class="jv-leaf"><code>${esc(JSON.stringify(n.v))}</code> <span class="muted small">${esc(t('text'))}</span></p>`;
    if (n.k === 'num') return `<p class="jv-leaf"><code>${esc(n.v)}</code> <span class="muted small">${esc(t('a number: rendered as text'))}</span></p>`;
    if (n.k === 'empty') return `<p class="jv-leaf"><code>${esc(n.v)}</code> <span class="muted small">${esc(t('renders nothing'))}</span></p>`;
    if (n.k === 'cut') return `<p class="jv-leaf muted small">${esc(t('… (tree cut: too large)'))}</p>`;
    return `<p class="jv-leaf"><code>${esc(E.fmtValue(n))}</code>${n.k === 'obj' ? ` <span class="tl-bad small">${esc(t('an object cannot be a child: React throws'))}</span>` : ''}</p>`;
  }

  function jvGoalHtml() {
    const c = jvChallenge();
    if (!c) {
      return `<div class="tl-goal jv-goal">
          ${Tools.select({ label: t('Example'), fid: 'jv-preset', options: E.JV_PRESETS.map((p) => [p.id, t(p.title)]), current: jvPreset, data: { jv: 'preset' } })}
          <p class="muted small">${esc(t('Edit the code: every pane follows as you type.'))}</p>
        </div>`;
    }
    const done = jvStore.isSolved(c.id);
    let inner;
    if (c.kind === 'predict') {
      const chosen = jvAnswer[c.id];
      inner = `<p>${md(t(c.goal))}</p>
        <pre class="jv-snippet"><code>${esc(c.snippet)}</code></pre>
        <div class="jv-choices" role="group" aria-label="${esc(t('Choices'))}">${c.choices.map((ch, k) => {
          const state = chosen === undefined ? '' : k === c.answer ? ' is-right' : k === chosen ? ' is-wrong' : '';
          return `<button type="button" class="jv-choice${state}" data-action="jv-pick" data-v="${k}" data-fid="jv-pick-${k}" aria-pressed="${chosen === k}"${chosen !== undefined ? ' aria-disabled="true"' : ''}><code>${esc(ch)}</code></button>`;
        }).join('')}</div>
        ${chosen !== undefined ? `<p class="jv-why">${chosen === c.answer ? `${ICON.ok}<strong>${esc(t('Right.'))}</strong>` : `${ICON.bad}<strong>${esc(t('Not quite.'))}</strong>`} ${md(t(c.why))}</p>
          <p><button type="button" class="btn ghost small-btn" data-action="jv-again" data-fid="jv-again">${esc(t('Try again'))}</button></p>` : `<p class="muted small">${esc(t('Answer first: the compiled code and the tree appear below once you choose.'))}</p>`}`;
    } else {
      inner = `<p>${md(t(c.goal))}</p>
        <p class="jv-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="jv-hint" data-fid="jv-hint" aria-expanded="${jvHint}">${esc(jvHint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="jv-reset" data-fid="jv-reset">${esc(t('Restart challenge'))}</button>
        </p>
        ${jvHint ? `<p class="jv-hint">${md(t(c.hint))}</p>` : ''}
        ${jvOut && jvOut.items ? `<ul class="checks">${jvOut.items.map(checkItem).join('')}</ul>` : ''}`;
    }
    return `<div class="tl-goal jv-goal${done ? ' is-solved' : ''}">
        <p class="jv-goal-title"><strong>${esc(t(c.title))}</strong>${done ? ` <span class="jv-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        ${inner}
        ${jvJustSolved ? `<p class="jv-solved">${ICON.ok}<span>${esc(jvJustSolved)}</span></p>` : ''}
      </div>`;
  }

  const locked = () => `<p class="muted small">${esc(t('Choose an answer above first.'))}</p>`;
  const jvParts = {
    'jv-goal': jvGoalHtml,
    'jv-compiled': () => {
      if (onFile()) return fileNotice();
      if (jvLocked()) return locked();
      if (!jvOut) return `<p class="muted small">${esc(t('Compiling…'))}</p>`;
      if (jvOut.error) return compileErrorHtml(jvOut.error);
      return `<pre class="jv-code"><code>${esc(jvOut.compiled)}</code></pre>`;
    },
    'jv-tree': () => {
      if (jvLocked() || !jvOut || jvOut.error || onFile()) return jvLocked() ? locked() : '';
      if (jvOut.evalError) return `<p class="tl-bad">${esc(jvOut.evalError)}</p>`;
      return `<div class="jv-tree">${treeHtml(jvOut.tree)}</div>${jvOut.logs.length ? `<p class="lr-label">${esc(t('console.log while rendering'))}</p><div class="lr-console">${Sandbox.consoleHtml(jvOut.logs, null, null)}</div>` : ''}`;
    },
    'jv-html': () => {
      if (jvLocked() || !jvOut || jvOut.error || jvOut.evalError || onFile()) return jvLocked() ? locked() : '';
      return jvOut.html ? `<pre class="jv-code"><code>${esc(jvOut.html)}</code></pre>` : `<p class="muted small">${esc(t('Nothing: the component renders no DOM.'))}</p>`;
    },
    'jv-console': () => Sandbox.consoleHtml(jvLines, null, t('No warnings or output.')),
  };

  function jvBody() {
    const cur = jvCurrent();
    const code = jvSource();
    return `<div class="jv">
        ${Tools.challengePicker({ list: JVC, current: cur, store: jvStore, action: 'jv-mode', label: t('JSX challenges'), free: { value: 'free', label: t('Free play') } })}
        <div data-part="jv-goal">${jvGoalHtml()}</div>
        <div class="jv-grid">
          ${editor({ id: 'jv-code', fid: 'jv-code', label: 'App.jsx', value: code, rows: rowsFor(code), data: 'data-jv-code="1"' })}
          <section class="jv-pane" aria-labelledby="jv-c-h">
            <h4 class="tl-sub" id="jv-c-h">${esc(t('1. Compiled JavaScript'))}</h4>
            <div data-part="jv-compiled">${jvParts['jv-compiled']()}</div>
          </section>
        </div>
        <div class="jv-grid">
          <section class="jv-pane" aria-labelledby="jv-t-h">
            <h4 class="tl-sub" id="jv-t-h">${esc(t('2. The element tree (what the calls return)'))}</h4>
            <label class="tl-check jv-expand"><input type="checkbox" data-jv="expand" data-fid="jv-expand"${jvExpand ? ' checked' : ''}> ${esc(t('Show what each component returns'))}</label>
            <div data-part="jv-tree">${jvParts['jv-tree']()}</div>
          </section>
          <section class="jv-pane" aria-labelledby="jv-h-h">
            <h4 class="tl-sub" id="jv-h-h">${esc(t('3. The DOM React builds from it (as HTML)'))}</h4>
            <div data-part="jv-html">${jvParts['jv-html']()}</div>
          </section>
        </div>
        <section class="jv-live" aria-labelledby="jv-p-h">
          <h4 class="tl-sub" id="jv-p-h">${esc(t('4. Live preview with the real React'))}</h4>
          <iframe class="lr-preview jv-frame" sandbox="allow-scripts allow-modals allow-forms" title="${esc(t('Preview of the JSX'))}" data-jv-frame></iframe>
          <p class="lr-label">${esc(t('Console (React warnings appear here)'))}</p>
          <div class="lr-console" role="log" data-part="jv-console">${jvParts['jv-console']()}</div>
        </section>
      </div>`;
  }

  function jvPaint() {
    Tools.each('jsx-viewer', (root) => { keepFocus(() => Tools.paint(root, jvParts)); focusableScrollers(root); });
  }

  /* Compiles and evaluates the current code, then paints. */
  async function jvUpdate(say) {
    const run = ++jvRun;
    if (onFile()) { jvPaint(); return; }
    try { await ReactRunner.load(); } catch (e) { jvOut = { error: { message: t('Could not load the JSX compiler. Reload the page to try again.') } }; jvPaint(); return; }
    if (run !== jvRun) return;
    const src = jvSource();
    const c = jvChallenge();
    const r = ReactRunner.compile(src, window.Sucrase.transform);
    if (!r.ok) {
      jvOut = { error: r.error, items: c && c.check ? [{ status: 'bad', text: t('It does not compile yet: see the error in pane 1.') }] : null };
      jvPaint();
      if (say) Tools.each('jsx-viewer', (root) => Tools.say(root, t('Syntax error on line {n}', { n: r.error.line || '?' })));
      return;
    }
    let shown;
    try { shown = E.tidyCompiled(window.Sucrase.transform(src, { transforms: ['jsx'], jsxRuntime: 'classic', production: true }).code); } catch (e) { shown = r.code; }
    const res = await Sandbox.runJs(E.program(r.code), { timeout: 2000 });
    if (run !== jvRun) return;
    const out = E.readResult(res.logs, res.error);
    jvOut = { compiled: shown, error: null, tree: out.tree, evalError: out.error, logs: out.logs, html: out.tree ? E.toHtml(out.tree) : '', items: null };
    jvJustSolved = '';
    if (c && c.check) {
      jvOut.items = out.tree ? c.check(out.tree) : [{ status: 'bad', text: out.error || '' }];
      if (out.tree && jvOut.items.every((i) => i.status === 'ok')) jvSolve(c);
    }
    jvPaint();
    Tools.each('jsx-viewer', (root) => {
      jvPreview(root, r);
      if (say || jvJustSolved) Tools.say(root, jvJustSolved || (out.error ? out.error : t('Compiled: {n} elements in the tree', { n: E.elements(out.tree).length })));
    });
  }

  function jvSolve(c) {
    const index = JVC.indexOf(c);
    let first = false;
    Tools.each('jsx-viewer', (root) => { first = Tools.markSolved(root, { store: jvStore, id: c.id, action: 'jv-mode', index }) || first; });
    if (!first && jvStore.mark(c.id)) first = true;
    if (first) jvJustSolved = t('Challenge solved! {title}', { title: t(c.title) });
  }

  function jvPreview(root, compiled) {
    const frame = root.querySelector('[data-jv-frame]');
    if (!frame) return;
    jvLines = [];
    const paintConsole = debounce(() => Tools.each('jsx-viewer', (r) => Tools.paint(r, { 'jv-console': jvParts['jv-console'] })), 60);
    preview(frame, compiled, (line) => { jvLines.push(line); paintConsole(); });
    Tools.paint(root, { 'jv-console': jvParts['jv-console'] });
  }

  const jvSoon = debounce(() => jvUpdate(false), 350);

  function jvSwitch(root) {
    jvOut = null;
    jvHint = false;
    jvJustSolved = '';
    Tools.refresh('jsx-viewer');
    jvUpdate(false);
    const c = jvChallenge();
    Tools.say(root, c ? t(c.title) : t('Free play'));
  }

  Tools.register('jsx-viewer', {
    title: 'JSX viewer',
    intro: 'JSX is JavaScript in disguise. Edit a component and watch the three stages side by side: the `React.createElement` calls the compiler writes, the tree of plain objects they return, and the DOM React builds from that tree.',
    body: jvBody,
    mount(root) {
      focusableScrollers(root);
      if (onFile()) return;
      if (!jvOut) jvUpdate(false);
      else if (!jvOut.error) {
        ReactRunner.load().then(() => {
          const r = ReactRunner.compile(jvSource(), window.Sucrase.transform);
          if (r.ok) jvPreview(root, r);
        }).catch(() => {});
      }
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'jv-mode') {
        jvMode = el.dataset.v === 'free' ? 'free' : Number(el.dataset.v);
        jvSwitch(root);
      } else if (a === 'jv-pick') {
        const c = jvChallenge();
        if (!c || jvAnswer[c.id] !== undefined) return;
        const k = Number(el.dataset.v);
        jvAnswer[c.id] = k;
        jvJustSolved = '';
        if (k === c.answer) jvSolve(c);
        keepFocus(() => Tools.paint(root, jvParts));
        focusableScrollers(root);
        Tools.say(root, k === c.answer ? (jvJustSolved || t('Right.')) : t('Not quite. The right answer is choice {n}.', { n: c.answer + 1 }));
        jvUpdate(false);
      } else if (a === 'jv-again') {
        delete jvAnswer[jvChallenge().id];
        jvJustSolved = '';
        Tools.refresh('jsx-viewer');
        const first = root.querySelector('[data-fid="jv-pick-0"]');
        if (first) first.focus();
      } else if (a === 'jv-hint') {
        jvHint = !jvHint;
        keepFocus(() => Tools.paint(root, { 'jv-goal': jvGoalHtml }));
      } else if (a === 'jv-reset') {
        delete jvCode[jvKey()];
        jvOut = null;
        jvSwitch(root);
      }
    },
    onChange(e, root) {
      const el = e.target;
      if (el.dataset.jv === 'preset') { jvPreset = el.value; jvOut = null; Tools.refresh('jsx-viewer'); jvUpdate(true); }
      else if (el.dataset.jv === 'expand') { jvExpand = el.checked; keepFocus(() => Tools.paint(root, { 'jv-tree': jvParts['jv-tree'] })); }
    },
    onInput(e) {
      if (!e.target.dataset.jvCode) return;
      jvCode[jvKey()] = e.target.value;
      jvSoon();
    },
    onKeydown(e) {
      if (e.target.dataset.jvCode) codeEditorKeydown(e, () => jvUpdate(true));
    },
    challenges: { store: jvStore, label: 'JSX challenges', ids: () => JVC.map((c) => c.id) },
  });

  /* ======================================================================
     2. Component playground
     ====================================================================== */

  const cpStore = challengeStore('components-challenges-v1');
  const cpWork = makeStore('component-playground-work-v1');
  const CPC = E.CP_CHALLENGES;
  let cpIndex = null;
  let cpCode = null;                     // id → code (loaded lazily from storage)
  let cpHint = false;
  let cpResult = null;                   // { ok, items } | { busy } | { compile }
  let cpLines = [];
  let cpJustSolved = '';

  const cpCurrent = () => {
    if (cpIndex === null) { const k = CPC.findIndex((c) => !cpStore.isSolved(c.id)); cpIndex = k < 0 ? 0 : k; }
    return CPC[cpIndex];
  };
  const codes = () => cpCode || (cpCode = cpWork.load());
  const cpSource = () => { const c = cpCurrent(); return codes()[c.id] !== undefined ? codes()[c.id] : c.starter; };
  const saveSoon = debounce(() => cpWork.save(codes()), 500);

  function cpGoalHtml() {
    const c = cpCurrent();
    const done = cpStore.isSolved(c.id);
    return `<div class="tl-goal cp-goal${done ? ' is-solved' : ''}">
        <p class="cp-goal-title"><strong>${esc(t(c.title))}</strong>${done ? ` <span class="cp-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        <p class="cp-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="cp-hint" data-fid="cp-hint" aria-expanded="${cpHint}">${esc(cpHint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="cp-reset" data-fid="cp-reset">${esc(t('Start over'))}</button>
        </p>
        ${cpHint ? `<p class="cp-hint">${md(t(c.hint))}</p>` : ''}
      </div>`;
  }

  function cpResultHtml() {
    const r = cpResult;
    if (!r) return `<p class="muted small">${esc(t('Press Check (or Ctrl+Enter in the editor): the checker runs your component like a user would.'))}</p>`;
    if (r.busy) return `<p class="muted small">${esc(t('Checking…'))}</p>`;
    if (r.compile) return compileErrorHtml(r.compile);
    return `<ul class="checks">${r.items.map(checkItem).join('')}</ul>
      ${r.ok ? `<p class="cp-solved">${ICON.ok}<span>${esc(cpJustSolved || t('All checks pass.'))}${cpIndex < CPC.length - 1 ? ` <button type="button" class="btn small-btn" data-action="cp-mode" data-v="${cpIndex + 1}" data-fid="cp-next">${esc(t('Next challenge'))}</button>` : ''}</span></p>` : ''}`;
  }

  const cpParts = {
    'cp-goal': cpGoalHtml,
    'cp-result': cpResultHtml,
    'cp-console': () => (onFile() ? fileNotice() : Sandbox.consoleHtml(cpLines, null, t('No warnings or output.'))),
    'cp-compile': () => '',
  };

  function cpBody() {
    const code = cpSource();
    return `<div class="cp">
        ${Tools.challengePicker({ list: CPC, current: cpIndex === null ? CPC.indexOf(cpCurrent()) : cpIndex, store: cpStore, action: 'cp-mode', label: t('Component challenges') })}
        <div data-part="cp-goal">${cpGoalHtml()}</div>
        <div class="cp-grid">
          <div class="cp-edit">
            ${editor({ id: 'cp-code', fid: 'cp-code', label: 'App.jsx', value: code, rows: rowsFor(code), data: 'data-cp-code="1"' })}
            <p class="lr-actions">
              <button type="button" class="btn" data-action="cp-check" data-fid="cp-check">${esc(t('Check'))}</button>
              <span class="muted small">${esc(t('Tab indents · Esc then Tab leaves the editor · your code is kept in this browser'))}</span>
            </p>
          </div>
          <div class="cp-side">
            <p class="lr-label">${esc(t('Preview (try it yourself)'))}</p>
            <div data-part="cp-compile"></div>
            <iframe class="lr-preview cp-frame" sandbox="allow-scripts allow-modals" title="${esc(t('Preview of your component'))}" data-cp-frame></iframe>
            <p class="lr-label">${esc(t('Console'))}</p>
            <div class="lr-console" role="log" data-part="cp-console">${cpParts['cp-console']()}</div>
          </div>
        </div>
        <section class="cp-results" aria-labelledby="cp-r-h">
          <h4 class="tl-sub" id="cp-r-h">${esc(t('Checks'))}</h4>
          <div data-part="cp-result">${cpResultHtml()}</div>
        </section>
        <div data-cp-host></div>
      </div>`;
  }

  async function cpPreview() {
    if (onFile()) return;
    try { await ReactRunner.load(); } catch (e) { return; }
    const r = ReactRunner.compile(cpSource(), window.Sucrase.transform);
    Tools.each('component-playground', (root) => {
      const frame = root.querySelector('[data-cp-frame]');
      const wrap = root.querySelector('[data-part="cp-compile"]');
      if (!frame) return;
      if (!r.ok) { wrap.innerHTML = compileErrorHtml(r.error); frame.classList.add('is-stale'); return; }
      wrap.innerHTML = '';
      frame.classList.remove('is-stale');
      cpLines = [];
      Tools.paint(root, { 'cp-console': cpParts['cp-console'] });
      const paintConsole = debounce(() => Tools.each('component-playground', (x) => Tools.paint(x, { 'cp-console': cpParts['cp-console'] })), 60);
      preview(frame, r, (line) => { cpLines.push(line); paintConsole(); });
    });
  }
  const cpPreviewSoon = debounce(cpPreview, 400);

  async function cpCheck(root) {
    const c = cpCurrent();
    if (onFile()) { Tools.say(root, t('React previews need the page to be served over http(s).')); return; }
    cpResult = { busy: true };
    cpJustSolved = '';
    keepFocus(() => Tools.paint(root, { 'cp-result': cpResultHtml }));
    try { await ReactRunner.load(); } catch (e) { cpResult = { ok: false, items: [{ status: 'bad', text: t('Could not load the JSX compiler. Reload the page to try again.') }] }; Tools.paint(root, { 'cp-result': cpResultHtml }); return; }
    const src = cpSource();
    const r = ReactRunner.compile(src, window.Sucrase.transform);
    if (!r.ok) {
      cpResult = { compile: r.error };
      keepFocus(() => Tools.paint(root, { 'cp-result': cpResultHtml }));
      Tools.say(root, t('Syntax error on line {n}', { n: r.error.line || '?' }));
      return;
    }
    const host = root.querySelector('[data-cp-host]');
    const report = await runSteps(host, r, c.steps);
    if (c !== cpCurrent()) return;
    cpResult = E.judge(c, report, src);
    if (cpResult.ok) {
      if (Tools.markSolved(root, { store: cpStore, id: c.id, action: 'cp-mode', index: CPC.indexOf(c) })) cpJustSolved = t('Challenge solved! {title}', { title: t(c.title) });
    }
    keepFocus(() => Tools.paint(root, { 'cp-result': cpResultHtml, 'cp-goal': cpGoalHtml }));
    const fails = cpResult.items.filter((i) => i.status === 'bad').length;
    Tools.say(root, cpResult.ok ? (cpJustSolved || t('All checks pass.')) : t('{n} checks still fail.', { n: fails }));
  }

  Tools.register('component-playground', {
    title: 'Component playground',
    intro: 'Write a component for each goal. **Check** runs it with the real React in a hidden frame that renders, types, clicks and submits like a user, then tells you what it saw.',
    body: cpBody,
    mount() { cpPreview(); },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'cp-mode') {
        cpIndex = Number(el.dataset.v);
        cpResult = null;
        cpHint = false;
        cpJustSolved = '';
        Tools.refresh('component-playground');
        const ta = root.querySelector('[data-fid="cp-code"]');
        if (el.dataset.fid === 'cp-next' && ta) ta.focus();
        Tools.say(root, t(cpCurrent().title));
      } else if (a === 'cp-check') cpCheck(root);
      else if (a === 'cp-hint') { cpHint = !cpHint; keepFocus(() => Tools.paint(root, { 'cp-goal': cpGoalHtml })); }
      else if (a === 'cp-reset') {
        delete codes()[cpCurrent().id];
        cpWork.save(codes());
        cpResult = null;
        Tools.refresh('component-playground');
        Tools.say(root, t('Code reset'));
      }
    },
    onInput(e) {
      if (!e.target.dataset.cpCode) return;
      codes()[cpCurrent().id] = e.target.value;
      saveSoon();
      cpPreviewSoon();
    },
    onKeydown(e, root) {
      if (e.target.dataset.cpCode) codeEditorKeydown(e, () => cpCheck(root));
    },
    challenges: { store: cpStore, label: 'Component challenges', ids: () => CPC.map((c) => c.id) },
    workKey: 'component-playground-work-v1',
  });
})();
