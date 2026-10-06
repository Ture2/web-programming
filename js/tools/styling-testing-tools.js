'use strict';

/* ==========================================================================
   Styling and testing tools. Pure logic: js/tools/styling-testing-engine.js
   (ComponentTestEngine).

   component-tests   a small test runner in the browser. The student writes a
                     test file (Testing Library style) for a given component;
                     "Run tests" compiles both files with the vendored Sucrase
                     and runs them in hidden sandboxed frames with the real React
                     (development build), the engine (queries, matchers, vi,
                     describe/it) and a fake API for fetch('/api/…'). Each frame
                     posts its results back. In a challenge the same test file
                     runs against the component as given, against buggy versions
                     (a test must fail) and against harmless refactors (every
                     test must still pass): the engine's judge() turns that into
                     checks. 9 challenges: challengeStore
                     'component-tests-challenges-v1'; test files kept in
                     'component-tests-work-v1'.
   Frames: <iframe sandbox="allow-scripts allow-forms"> (opaque origin; forms are
   allowed so that a submit button fires the submit event, as in a browser).
   ========================================================================== */

(() => {
  const E = ComponentTestEngine;
  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  const abs = (p) => new URL(p, location.href).href;
  const onFile = () => location.protocol === 'file:';
  const TEST_TIMEOUT = 3000;
  const RUN_LIMIT = 20000;

  /* ======================================================================
     The frame: console capture, then React, the engines, the runtime
     ====================================================================== */

  const CAPTURE = (token) => `<script>(function () {
    var T = ${json(token)};
    window.__ctLog = [];
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
        if (window.__ctLog.length < 200) window.__ctLog.push({ level: level, text: text.length > 2000 ? text.slice(0, 2000) + '…' : text });
        orig.apply(console, arguments);
      };
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      console.error('Unhandled rejection: ' + (r && r.name ? r.name + ': ' + r.message : String(r)));
    });
  })();<\/script>`;

  /* Runs inside the frame after React, the mock API and the engine loaded. */
  const RUNTIME = String(function runtime(__comp, __test, __opts) {
    var E = ComponentTestEngine;
    var done = false;
    function post(m) { m.__ct = __opts.token; parent.postMessage(m, '*'); }
    function finish(extra) {
      if (done) return;
      done = true;
      extra.console = window.__ctLog || [];
      post(Object.assign({ kind: 'done' }, extra));
    }
    function errText(err) { return err && err.name ? err.name + ': ' + err.message : String(err); }

    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    var act = React.act;
    var uncaught = [];
    var mounted = [];

    /* fetch('/api/…') is answered by the fake API after a short delay, like a mock server would. */
    var apiState = MockApiEngine.createState();
    function headerList(h) {
      if (!h) return [];
      if (typeof Headers !== 'undefined' && h instanceof Headers) return Array.from(h.entries());
      if (Array.isArray(h)) return h;
      return Object.keys(h).map(function (k) { return [k, String(h[k])]; });
    }
    function fakeFetch(input, init) {
      init = init || {};
      var url = new URL(typeof input === 'string' ? input : input.url, 'http://localhost:5173/');
      var method = String(init.method || 'GET').toUpperCase();
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (!/^\/api(\/|$)/.test(url.pathname) || url.host !== 'localhost:5173') { reject(new TypeError('Failed to fetch')); return; }
          var r = MockApiEngine.request(apiState, { method: method, path: url.pathname + url.search, headers: headerList(init.headers), body: init.body == null ? '' : String(init.body) });
          apiState = r.state;
          resolve(new Response(r.res.status === 204 || !r.res.body ? null : r.res.body, { status: r.res.status, statusText: r.res.reason, headers: r.res.headers }));
        }, __opts.latency);
      });
    }
    window.fetch = fakeFetch;

    function flushUncaught() {
      if (!uncaught.length) return;
      var e = uncaught[0];
      uncaught = [];
      throw e;
    }
    function doAct(fn) {
      var out;
      act(function () { out = fn(); });
      flushUncaught();
      return out;
    }
    function waitForAct(cb, o) {
      o = o || {};
      return E.waitFor(function () { flushUncaught(); return cb(); }, {
        timeout: o.timeout, interval: o.interval,
        onStart: function () { globalThis.IS_REACT_ACT_ENVIRONMENT = false; },
        onEnd: function () { globalThis.IS_REACT_ACT_ENVIRONMENT = true; },
      });
    }
    /* The frame is hidden, and a hidden or unfocused frame may refuse real focus: keep track of
       the element a user would have focused, and use the real focus when the browser gives it. */
    var focused = null;
    document.addEventListener('focusin', function (e) { focused = e.target; }, true);
    function focusEl(el) {
      focused = el;
      try { el.focus(); } catch (e) { /* not focusable here */ }
    }
    function activeEl() {
      var a = document.activeElement;
      if (a && a !== document.body && a.isConnected) return a;
      return focused && focused.isConnected ? focused : document.body;
    }
    var env = {
      waitFor: waitForAct,
      activeElement: activeEl,
      computedHidden: function (n) {
        if (!n.isConnected) return false;
        var s = getComputedStyle(n);
        return s.display === 'none' || s.visibility === 'hidden';
      },
    };
    var expect = E.createExpect(env);
    var vi = E.createVi();
    var runner = E.createRunner();

    /* ---- @testing-library/react (subset) ---- */
    function render(ui, options) {
      if (!ui || typeof ui !== 'object' || !ui.$$typeof) throw new TypeError('render() needs a React element, like render(<Counter />).');
      var container = (options && options.container) || document.body.appendChild(document.createElement('div'));
      var root = ReactDOM.createRoot(container, { onUncaughtError: function (err) { uncaught.push(err); } });
      mounted.push({ root: root, container: container });
      doAct(function () { root.render(ui); });
      return Object.assign(E.queries(document.body, env), {
        container: container,
        baseElement: document.body,
        unmount: function () { doAct(function () { root.unmount(); }); },
        rerender: function (el) { doAct(function () { root.render(el); }); },
        debug: function (el) { console.log(E.prettyDom(el || document.body, 4000)); },
      });
    }
    function cleanup() {
      mounted.forEach(function (m) {
        try { act(function () { m.root.unmount(); }); } catch (e) { /* already unmounted */ }
      });
      mounted = [];
      focused = null;
      Array.prototype.slice.call(document.body.childNodes).forEach(function (n) { if (n.nodeName !== 'SCRIPT') document.body.removeChild(n); });
    }
    var screen = Object.assign(E.queries(document.body, env), {
      debug: function (el) { console.log(E.prettyDom(el || document.body, 4000)); },
    });
    function within(el) { return E.queries(el, env); }

    function needEl(el, what) {
      if (!el || typeof el.dispatchEvent !== 'function') throw new TypeError('Unable to fire a "' + what + '" event - please provide a DOM element.');
    }
    function setTarget(el, init) {
      if (!init || !init.target) return;
      Object.keys(init.target).forEach(function (k) {
        var proto = Object.getPrototypeOf(el);
        var d = null;
        while (proto && !d) { d = Object.getOwnPropertyDescriptor(proto, k); proto = Object.getPrototypeOf(proto); }
        if (d && d.set) d.set.call(el, init.target[k]); else el[k] = init.target[k];
      });
    }
    var EVENTS = {
      click: ['MouseEvent', 'click'], dblClick: ['MouseEvent', 'dblclick'], mouseDown: ['MouseEvent', 'mousedown'], mouseUp: ['MouseEvent', 'mouseup'],
      mouseOver: ['MouseEvent', 'mouseover'], mouseOut: ['MouseEvent', 'mouseout'], change: ['Event', 'change'], input: ['InputEvent', 'input'],
      submit: ['Event', 'submit'], keyDown: ['KeyboardEvent', 'keydown'], keyUp: ['KeyboardEvent', 'keyup'],
    };
    function fireEvent(el, ev) { needEl(el, ev && ev.type); return doAct(function () { return el.dispatchEvent(ev); }); }
    Object.keys(EVENTS).forEach(function (name) {
      fireEvent[name] = function (el, init) {
        needEl(el, EVENTS[name][1]);
        setTarget(el, init);
        var opts = { bubbles: true, cancelable: true };
        if (init && !init.target) Object.keys(init).forEach(function (k) { opts[k] = init[k]; });
        var Ctor = window[EVENTS[name][0]] || Event;
        return fireEvent(el, new Ctor(EVENTS[name][1], opts));
      };
    });
    fireEvent.focus = function (el) { needEl(el, 'focus'); doAct(function () { focusEl(el); }); return true; };
    fireEvent.blur = function (el) { needEl(el, 'blur'); doAct(function () { if (focused === el) focused = null; el.blur(); }); return true; };

    /* ---- @testing-library/user-event (subset; every action is async) ---- */
    function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
    function disabled(el) { return !!(el.disabled || (el.closest && el.closest('fieldset[disabled]'))); }
    function focusableOf(el) { return el.closest ? el.closest('button, input, select, textarea, a[href], [tabindex]') : null; }
    function editable(el) {
      if (!el || el.disabled || el.readOnly) return false;
      if (el.tagName === 'TEXTAREA') return true;
      return el.tagName === 'INPUT' && /^(text|search|email|tel|url|password|number|)$/.test(String(el.getAttribute('type') || '').toLowerCase());
    }
    function setValue(el, v) {
      var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    }
    function mouse(type) { return new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, detail: 1 }); }
    function pointer(type) { return typeof PointerEvent === 'function' ? new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse' }) : mouse(type); }
    function needUserEl(el, what) { if (!el || typeof el.dispatchEvent !== 'function') throw new TypeError('user.' + what + '() needs an element: did a query return null?'); }

    async function click(el) {
      needUserEl(el, 'click');
      if (!disabled(el)) {
        doAct(function () {
          el.dispatchEvent(pointer('pointerdown'));
          el.dispatchEvent(mouse('mousedown'));
          var f = focusableOf(el);
          if (f) { if (f !== activeEl()) focusEl(f); } else { focused = null; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
          el.dispatchEvent(pointer('pointerup'));
          el.dispatchEvent(mouse('mouseup'));
          el.dispatchEvent(mouse('click'));
        });
      }
      await tick();
    }
    function keys(text) {
      var out = [];
      var re = /\{\{|\{([A-Za-z]+)\}|[\s\S]/g;
      var m;
      while ((m = re.exec(String(text)))) out.push(m[0] === '{{' ? '{' : m[1] || m[0]);
      return out;
    }
    function press(target, key) {
      doAct(function () {
        var ok = target.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
        if (ok) {
          if (key.length === 1 && editable(target)) {
            setValue(target, target.value + key);
            target.dispatchEvent(new InputEvent('input', { bubbles: true, data: key, inputType: 'insertText' }));
          } else if (key === 'Backspace' && editable(target) && target.value) {
            setValue(target, target.value.slice(0, -1));
            target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
          } else if (key === 'Enter') {
            if (target.tagName === 'TEXTAREA' && editable(target)) {
              setValue(target, target.value + '\n');
              target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertLineBreak' }));
            } else if (target.tagName === 'INPUT' && target.form) {
              var submit = target.form.querySelector('button:not([type]), button[type="submit"], input[type="submit"]');
              if (submit) submit.dispatchEvent(mouse('click'));
              else if (target.form.querySelectorAll('input').length === 1) target.form.requestSubmit();
            } else if (target.tagName === 'BUTTON' || (target.tagName === 'A' && target.href)) target.dispatchEvent(mouse('click'));
          } else if (key === ' ' && target.tagName === 'BUTTON') target.dispatchEvent(mouse('click'));
        }
        target.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true, cancelable: true }));
      });
    }
    async function type(el, text, o) {
      needUserEl(el, 'type');
      if (!o || !o.skipClick) await click(el);
      var list = keys(text);
      for (var i = 0; i < list.length; i++) { press(activeEl() === document.body ? el : activeEl(), list[i]); await tick(); }
    }
    async function keyboard(text) {
      var list = keys(text);
      for (var i = 0; i < list.length; i++) { press(activeEl(), list[i]); await tick(); }
    }
    async function clear(el) {
      needUserEl(el, 'clear');
      doAct(function () {
        focusEl(el);
        if (editable(el) && el.value !== '') {
          setValue(el, '');
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
        }
      });
      await tick();
    }
    async function selectOptions(el, values) {
      needUserEl(el, 'selectOptions');
      var want = [].concat(values).map(String);
      doAct(function () {
        Array.prototype.forEach.call(el.options, function (o) {
          var hit = want.indexOf(o.value) >= 0 || want.indexOf(o.textContent.trim()) >= 0;
          if (el.multiple) { if (hit) o.selected = true; } else if (hit) o.selected = true;
        });
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await tick();
    }
    async function tab() {
      var all = Array.prototype.slice.call(document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]'))
        .filter(function (n) { return !n.disabled && n.tabIndex >= 0; });
      var k = all.indexOf(activeEl());
      var next = all[(k + 1) % all.length];
      if (next) doAct(function () { focusEl(next); });
      await tick();
    }
    async function hover(el) {
      needUserEl(el, 'hover');
      doAct(function () { el.dispatchEvent(pointer('pointerover')); el.dispatchEvent(mouse('mouseover')); el.dispatchEvent(mouse('mouseenter')); });
      await tick();
    }
    async function dblClick(el) { await click(el); await click(el); doAct(function () { el.dispatchEvent(mouse('dblclick')); }); }
    var userApi = { click: click, dblClick: dblClick, type: type, clear: clear, keyboard: keyboard, selectOptions: selectOptions, tab: tab, hover: hover };
    var userEvent = Object.assign({ setup: function () { return Object.assign({}, userApi); } }, userApi);

    /* ---- Modules ---- */
    var rtl = { render: render, screen: screen, within: within, fireEvent: fireEvent, waitFor: waitForAct, cleanup: cleanup, act: act };
    var vitest = { describe: runner.api.describe, it: runner.api.it, test: runner.api.test, expect: expect, vi: vi, beforeEach: runner.api.beforeEach, afterEach: runner.api.afterEach };
    function compRequire(name) {
      if (name === 'react') return React;
      if (name === 'react-dom' || name === 'react-dom/client') return ReactDOM;
      if (/\.module\.css$/.test(name)) return new Proxy({}, { get: function (o, k) { return k === '__esModule' ? false : String(k); } });
      if (/\.css$/.test(name)) return {};
      throw new Error('"' + name + '" is not available here.');
    }
    var compModule = { exports: {} };
    try {
      (0, eval)('(function (require, module, exports) {\n' + __comp + '\n})\n//# sourceURL=' + __opts.compFile)(compRequire, compModule, compModule.exports);
    } catch (err) { finish({ fileError: __opts.compFile + ' could not load: ' + errText(err), results: [] }); return; }

    var base = __opts.compName;
    function testRequire(name) {
      if (name === 'vitest') return vitest;
      if (name === '@testing-library/react') return rtl;
      if (name === '@testing-library/user-event') return { __esModule: true, default: userEvent };
      if (/^@testing-library\/jest-dom(\/vitest)?$/.test(name)) return {};
      if (name === 'react') return React;
      var file = String(name).split('/').pop().replace(/\.(jsx?|tsx?)$/, '');
      if (/^\.\.?\//.test(name) && file === base) return compModule.exports;
      throw new Error('Cannot find module "' + name + '". Here you can import: vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, react and ./' + base + '.');
    }
    var testModule = { exports: {} };
    try {
      (0, eval)('(function (require, module, exports, describe, it, test, expect, vi, beforeEach, afterEach, render, screen) {\n' + __test + '\n})\n//# sourceURL=' + __opts.testFile)(
        testRequire, testModule, testModule.exports, vitest.describe, vitest.it, vitest.test, expect, vi, vitest.beforeEach, vitest.afterEach, render, screen);
    } catch (err) {
      var line = E.lineOf(err && err.stack, __opts.testFile);
      finish({ fileError: errText(err) + (line ? ' (line ' + line + ')' : ''), results: [] });
      return;
    }

    runner.run({
      timeout: __opts.timeout,
      afterEach: function () {
        var pending = uncaught.slice();
        uncaught = [];
        cleanup();
        vi.restoreAllMocks();
        window.fetch = fakeFetch;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        if (pending.length) throw pending[0];
      },
    }).then(function (results) {
      finish({
        results: results.map(function (r) {
          return { name: r.name, status: r.status, duration: r.duration, error: r.error ? { name: r.error.name, message: r.error.message, line: E.lineOf(r.error.stack, __opts.testFile) } : null };
        }),
      });
    }, function (err) { finish({ fileError: errText(err), results: [] }); });
  });

  function framePage(comp, test, opts) {
    const html = `${CAPTURE(opts.token)}${['vendor/react/react.js', 'js/tools/mock-api-engine.js', 'js/tools/styling-testing-engine.js']
      .map((s) => `<script src="${abs(s)}"><\/script>`).join('')}`;
    const js = `(${RUNTIME})(${json(comp)}, ${json(test)}, ${json(opts)});`;
    return Sandbox.page({ html, js });
  }

  const listeners = {};
  let seq = 0;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d.__ct !== 'string' || !listeners[d.__ct]) return;
    listeners[d.__ct](d);
  });

  /* One run in a hidden frame → { results, fileError, console } (or a timeout). */
  function runFrame(host, comp, test, files) {
    return new Promise((resolve) => {
      const token = `ct-${++seq}`;
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts allow-forms');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.title = t('Test runner');
      frame.hidden = true;
      const done = (rep) => { clearTimeout(timer); delete listeners[token]; frame.remove(); resolve(rep); };
      const timer = setTimeout(() => done({ results: [], fileError: t('The tests did not finish within {s} s. Is there an infinite loop, or a promise that never settles?', { s: RUN_LIMIT / 1000 }), console: [] }), RUN_LIMIT);
      listeners[token] = (d) => { if (d.kind === 'done') done(d); };
      frame.srcdoc = framePage(comp, test, { token, timeout: TEST_TIMEOUT, latency: 300, ...files });
      host.appendChild(frame);
    });
  }

  /* ======================================================================
     State
     ====================================================================== */

  const store = challengeStore('component-tests-challenges-v1');
  const work = makeStore('component-tests-work-v1');
  const CH = E.CHALLENGES;
  const ct = {
    ch: null,                 // challenge index, or 'free'
    free: E.FREE[0],          // component id in free mode
    codes: null,              // key → test source (loaded lazily from storage)
    hint: false,
    result: null,             // { busy, done, total } | { compile } | { runs, verdict, advice }
    justSolved: '',
  };

  const current = () => {
    if (ct.ch === null) { const k = CH.findIndex((c) => !store.isSolved(c.id)); ct.ch = k < 0 ? 'free' : k; }
    return ct.ch;
  };
  const challenge = () => (current() === 'free' ? null : CH[current()]);
  const compId = () => (challenge() ? challenge().component : ct.free);
  const comp = () => E.COMPONENTS[compId()];
  const testFile = () => `${comp().name}.test.jsx`;
  const key = () => (challenge() ? challenge().id : `free:${ct.free}`);
  const codes = () => ct.codes || (ct.codes = work.load());
  const starter = () => (challenge() ? challenge().starter : comp().starter);
  const source = () => (codes()[key()] !== undefined ? codes()[key()] : starter());
  const saveSoon = debounce(() => work.save(codes()), 500);

  /* ======================================================================
     Rendering
     ====================================================================== */

  const rowsFor = (s) => Math.min(24, Math.max(10, String(s).split('\n').length + 2));

  function goalHtml() {
    const c = challenge();
    if (!c) {
      return `<div class="tl-goal ct-goal">
          <p class="ct-goal-title"><strong>${esc(t('Free mode'))}</strong></p>
          <p>${md(t('Pick a component, write any tests you like and run them. Try the queries, `userEvent` and the matchers, and read the failure messages.'))}</p>
          ${Tools.select({ label: t('Component under test'), fid: 'ct-free', options: E.FREE.map((id) => [id, E.COMPONENTS[id].title]), current: ct.free, data: { ct: 'free' } })}
        </div>`;
    }
    const done = store.isSolved(c.id);
    return `<div class="tl-goal ct-goal${done ? ' is-solved' : ''}">
        <p class="ct-goal-title"><strong>${esc(t('Challenge {n}: {title}', { n: current() + 1, title: t(c.title) }))}</strong>${done ? ` <span class="ct-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        <p class="ct-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="ct-hint" data-fid="ct-hint" aria-expanded="${ct.hint}">${esc(ct.hint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="ct-reset" data-fid="ct-reset">${esc(t('Start over'))}</button>
        </p>
        ${ct.hint ? `<p class="ct-hint">${md(t(c.hint))}</p>` : ''}
      </div>`;
  }

  const plural = (n, one, many) => (n === 1 ? one : many).replace('{n}', n);

  function runTitle(run, k) {
    const v = run.variant;
    if (v.kind === 'original') return t('{file} as given', { file: comp().file });
    if (v.kind === 'bug') return t('With a bug: {label}', { label: t(v.label) });
    return t('After a refactor: {label}', { label: t(v.label) });
  }

  function runVerdict(run) {
    const fails = !!run.fileError || run.results.some((r) => r.status === 'fail');
    if (run.variant.kind === 'bug') return fails ? ['ok', t('caught')] : ['bad', t('missed')];
    if (run.variant.kind === 'refactor') return fails ? ['bad', t('broke')] : ['ok', t('survived')];
    return fails ? ['bad', t('failing')] : ['ok', t('passing')];
  }

  function testsHtml(run) {
    if (run.fileError) return `<pre class="ct-err">${esc(run.fileError)}</pre>`;
    if (!run.results.length) return `<p class="muted small">${esc(t('No tests found.'))}</p>`;
    return `<ul class="ct-tests">${run.results.map((r) => {
      const mark = r.status === 'pass' ? ICON.ok : r.status === 'fail' ? ICON.bad : '';
      const sr = r.status === 'pass' ? t('Passed: ') : r.status === 'fail' ? t('Failed: ') : t('Skipped: ');
      const err = r.error ? `<pre class="ct-err">${esc(`${r.error.name}: ${r.error.message}`)}${r.error.line ? `\n\n${esc(t('→ {file}, line {line}', { file: testFile(), line: r.error.line }))}` : ''}</pre>` : '';
      return `<li class="ct-test ct-${r.status}">${mark ? `<span class="ct-mark">${mark}</span>` : '<span class="ct-mark ct-skip-mark" aria-hidden="true">–</span>'}<div class="ct-test-body"><p><span class="sr-only">${esc(sr)}</span>${esc(r.name)} <span class="muted small">${esc(r.status === 'skip' ? t('skipped') : `${r.duration} ms`)}</span></p>${err}</div></li>`;
    }).join('')}</ul>`;
  }

  function diffHtml(v) {
    if (!v.edits || !v.edits.length) return '';
    const lines = v.edits.map(([from, to]) => `${from.trim().split('\n').map((l) => `- ${l.trim()}`).join('\n')}\n${to.trim() ? to.trim().split('\n').map((l) => `+ ${l.trim()}`).join('\n') : '+ (removed)'}`).join('\n\n');
    return `<details class="ct-details" data-fid="ct-diff-${esc(v.label)}"><summary>${esc(t('What changed in {file}', { file: comp().file }))}</summary><pre class="ct-diff">${esc(lines)}</pre></details>`;
  }

  function consoleHtml(run) {
    const lines = run.console || [];
    if (!lines.length) return '';
    return `<details class="ct-details"><summary>${esc(plural(lines.length, t('Console (1 line)'), t('Console ({n} lines)')))}</summary><div class="lr-console ct-console">${Sandbox.consoleHtml(lines, null, null)}</div></details>`;
  }

  function resultHtml() {
    const r = ct.result;
    if (onFile()) return `<p class="lr-line lr-warn">${esc(t('The test runner needs the page to be served over http(s). Run npm run site:serve and open http://localhost:8080.'))}</p>`;
    if (!r) return `<p class="muted small">${esc(t('Press Run tests (or Ctrl+Enter in the editor).'))}</p>`;
    if (r.busy) return `<p class="muted small" role="status">${esc(t('Running {n} test file runs…', { n: r.total }))}</p>`;
    if (r.compile) {
      const at = r.compile.line ? ` ${t('(line {line}, column {col})', { line: r.compile.line, col: (r.compile.column || 0) + 1 })}` : '';
      return `<div class="lr-console">${Sandbox.lineHtml({ level: 'error', text: `SyntaxError in ${testFile()}: ${r.compile.message}${at}` })}${r.compile.frame ? `<pre class="lr-frame">${esc(r.compile.frame)}</pre>` : ''}</div>`;
    }
    const c = challenge();
    const checks = r.verdict ? `<ul class="checks ct-checks">${r.verdict.items.map(checkItem).join('')}</ul>
      ${r.verdict.ok ? `<p class="ct-solved">${ICON.ok}<span>${esc(ct.justSolved || t('Every check passes.'))}${c && current() < CH.length - 1 ? ` <button type="button" class="btn small-btn" data-action="ct-mode" data-v="${current() + 1}" data-fid="ct-next">${esc(t('Next challenge'))}</button>` : ''}</span></p>` : ''}` : '';
    const runs = r.runs.map((run, k) => {
      const [cls, word] = runVerdict(run);
      const passed = run.results.filter((x) => x.status === 'pass').length;
      const failed = run.results.filter((x) => x.status === 'fail').length;
      const counts = run.fileError ? t('did not run') : t('{p} passed, {f} failed', { p: passed, f: failed });
      const head = `<span class="ct-run-title">${esc(runTitle(run, k))}</span> <span class="ct-badge ct-badge-${cls}">${esc(word)}</span> <span class="muted small">${esc(counts)}</span>`;
      if (k === 0) return `<section class="ct-run" aria-label="${esc(runTitle(run, k))}"><p class="ct-run-head">${head}</p>${testsHtml(run)}${consoleHtml(run)}</section>`;
      return `<details class="ct-run ct-run-more" data-fid="ct-run-${k}"><summary class="ct-run-head">${head}</summary>${diffHtml(run.variant)}${testsHtml(run)}${consoleHtml(run)}</details>`;
    }).join('');
    const advice = r.advice.length ? `<h5 class="ct-h5">${esc(t('Advice on this test file'))}</h5>
      <ul class="ct-advice">${r.advice.map((a) => `<li class="ct-advice-${a.level}"><span class="ct-rule">${esc(a.level === 'warn' ? t('Warning') : t('Tip'))} · line ${a.line} · ${esc(a.rule)}</span> ${md(t(a.text))}</li>`).join('')}</ul>` : '';
    return `${checks}<div class="ct-runs">${runs}</div>${advice}`;
  }

  const SUPPORTED = [
    ['Vitest', '`test` / `it` (and `.skip`, `.only`), `describe`, `beforeEach`, `afterEach`, `expect` with `.not`, `.resolves`, `.rejects`; `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toContain`, `toHaveLength`, `toMatch`, `toBeGreaterThan`, `toBeLessThan`, `toThrow`; `vi.fn`, `vi.spyOn`, `vi.restoreAllMocks`, `mockReturnValue`, `mockResolvedValue`, `mockRejectedValue`, `mockImplementation` (and the `Once` forms); `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`. Each test has 3 s.'],
    ['React Testing Library', '`render` (returns `container`, `rerender`, `unmount`, `debug` and the queries), `screen`, `within`, `waitFor`, `fireEvent` (`click`, `change`, `input`, `submit`, `keyDown`, `keyUp`, `focus`, `blur`, `mouseOver`…). Cleanup after each test is automatic.'],
    ['Queries', '`getBy`, `getAllBy`, `queryBy`, `queryAllBy`, `findBy`, `findAllBy` × `Role`, `LabelText`, `PlaceholderText`, `Text`, `DisplayValue`, `AltText`, `Title`, `TestId`. Role options: `name`, `level`, `checked`, `pressed`, `expanded`, `selected`, `hidden`; text options: `exact: false`. Matchers: a string, a regular expression or a function.'],
    ['user-event', '`userEvent.setup()`, then `await user.click`, `dblClick`, `type` (with `{Enter}` and `{Backspace}`), `clear`, `keyboard`, `selectOptions`, `tab`, `hover`.'],
    ['jest-dom', '`toBeInTheDocument`, `toHaveTextContent`, `toHaveValue`, `toBeDisabled`, `toBeEnabled`, `toBeChecked`, `toHaveAttribute`, `toHaveClass`, `toBeVisible`, `toHaveFocus`, `toHaveAccessibleName`, `toBeEmptyDOMElement`.'],
    ['Not here', '`vi.mock` (module mocks), fake timers, snapshots, coverage. `fetch(\'/api/…\')` is answered by a small fake API after 300 ms; replace it with `vi.spyOn(globalThis, \'fetch\')` to test other answers.'],
  ];

  function body() {
    const c = challenge();
    const code = source();
    return `<div class="ct">
        ${Tools.challengePicker({ list: CH, current: current(), store, action: 'ct-mode', label: t('Component test challenges'), free: { value: 'free', label: t('Free') } })}
        <div data-part="ct-goal">${goalHtml()}</div>
        <p class="ct-note">${md(t('**A teaching subset.** This runner imitates a small part of Vitest, React Testing Library, user-event and jest-dom, with the real React, in your browser. In a project you install the real libraries (see [A first component test](#/browser/styling-testing/first-component-test)); the code you write here is the same.'))}</p>
        <details class="ct-details ct-supported" data-fid="ct-supported"><summary>${esc(t('What this runner supports'))}</summary>
          <dl class="ct-dl">${SUPPORTED.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${md(t(v))}</dd>`).join('')}</dl>
        </details>
        <div class="ct-grid">
          <div class="ct-pane">
            <p class="lr-label" id="ct-comp-l">${esc(t('{file} · the component under test (read-only)', { file: comp().file }))}</p>
            <pre class="ct-source" tabindex="0" aria-labelledby="ct-comp-l"><code>${esc(comp().code)}</code></pre>
          </div>
          <div class="ct-pane">
            <label class="lr-label" for="ct-code">${esc(testFile())}</label>
            <textarea class="lr-code ct-code" id="ct-code" data-fid="ct-code" data-ct-code="1" rows="${rowsFor(code)}" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(code)}</textarea>
            <p class="lr-actions ct-actions">
              <button type="button" class="btn" data-action="ct-run" data-fid="ct-run">${esc(t('Run tests'))}</button>
              <span class="muted small">${esc(c ? t('Ctrl+Enter runs · Tab indents · Esc then Tab leaves the editor · runs against the component as given and its variants') : t('Ctrl+Enter runs · Tab indents · Esc then Tab leaves the editor'))}</span>
            </p>
          </div>
        </div>
        <section class="ct-results" aria-labelledby="ct-r-h">
          <h4 class="tl-sub" id="ct-r-h">${esc(t('Results'))}</h4>
          <div data-part="ct-result">${resultHtml()}</div>
        </section>
        <div data-ct-host></div>
      </div>`;
  }

  const paint = (root) => keepFocus(() => Tools.paint(root, { 'ct-result': resultHtml, 'ct-goal': goalHtml }));

  /* ======================================================================
     Running
     ====================================================================== */

  let runId = 0;
  async function run(root) {
    if (onFile()) { Tools.say(root, t('The test runner needs the page to be served over http(s).')); return; }
    const c = challenge();
    const id = compId();
    const src = source();
    const variants = c ? E.variantsOf(c) : E.variantsOf(null);
    const mine = ++runId;
    ct.justSolved = '';
    ct.result = { busy: true, total: variants.length };
    paint(root);
    try { await ReactRunner.load(); } catch (e) {
      ct.result = { compile: { message: t('Could not load the JSX compiler. Reload the page to try again.') } };
      paint(root);
      return;
    }
    const compiled = ReactRunner.compile(src, window.Sucrase.transform);
    if (!compiled.ok) {
      ct.result = { compile: compiled.error };
      paint(root);
      Tools.say(root, t('Syntax error on line {n}', { n: compiled.error.line || '?' }));
      return;
    }
    const host = root.querySelector('[data-ct-host]');
    const files = { compFile: E.COMPONENTS[id].file, compName: E.COMPONENTS[id].name, testFile: testFile() };
    const runs = await Promise.all(variants.map((v) => {
      const cc = ReactRunner.compile(E.variantCode(id, v), window.Sucrase.transform);
      if (!cc.ok) return Promise.resolve({ results: [], fileError: cc.error.message, console: [] });
      return runFrame(host, cc.code, compiled.code, files);
    }));
    if (mine !== runId || key() !== (c ? c.id : `free:${id}`)) return;
    const out = runs.map((r, k) => ({ variant: variants[k], results: r.results || [], fileError: r.fileError || null, console: r.console || [] }));
    const verdict = c ? E.judge(c, out, src) : null;
    ct.result = { runs: out, verdict, advice: E.advise(src) };
    if (verdict && verdict.ok && Tools.markSolved(root, { store, id: c.id, action: 'ct-mode', index: current() })) {
      ct.justSolved = t('Challenge solved! {title}', { title: t(c.title) });
    }
    paint(root);
    const first = out[0];
    const passed = first.results.filter((x) => x.status === 'pass').length;
    const failed = first.results.filter((x) => x.status === 'fail').length;
    if (verdict) {
      const bad = verdict.items.filter((i) => i.status === 'bad').length;
      Tools.say(root, verdict.ok ? (ct.justSolved || t('Every check passes.')) : t('{p} passed, {f} failed. {b} checks still fail.', { p: passed, f: failed, b: bad }));
    } else {
      Tools.say(root, first.fileError ? t('The test file did not run.') : t('{p} passed, {f} failed.', { p: passed, f: failed }));
    }
  }

  Tools.register('component-tests', {
    title: 'Component test runner',
    intro: 'Write tests the way React Testing Library teaches: render a component, find things by **role**, **label** or **text**, act like a user, and assert on what the user would see. In the challenges your tests also run against **buggy** versions (a test must fail) and **refactored** ones (every test must still pass).',
    body,
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'ct-mode') {
        ct.ch = el.dataset.v === 'free' ? 'free' : Number(el.dataset.v);
        ct.result = null;
        ct.hint = false;
        ct.justSolved = '';
        Tools.refresh('component-tests');
        if (el.dataset.fid === 'ct-next') { const ta = root.querySelector('[data-fid="ct-code"]'); if (ta) ta.focus(); }
        Tools.say(root, challenge() ? t(challenge().title) : t('Free mode'));
      } else if (a === 'ct-run') run(root);
      else if (a === 'ct-hint') { ct.hint = !ct.hint; paint(root); } else if (a === 'ct-reset') {
        delete codes()[key()];
        work.save(codes());
        ct.result = null;
        Tools.refresh('component-tests');
        Tools.say(root, t('Test file reset.'));
      }
    },
    onInput(e) {
      if (!e.target.dataset.ctCode) return;
      codes()[key()] = e.target.value;
      saveSoon();
    },
    onChange(e, root) {
      if (e.target.dataset.ct !== 'free') return;
      ct.free = e.target.value;
      ct.result = null;
      Tools.refresh('component-tests');
      Tools.say(root, t('Component: {c}', { c: comp().title }));
    },
    onKeydown(e, root) {
      if (e.target.dataset.ctCode) codeEditorKeydown(e, () => run(root));
    },
    challenges: { store, label: 'Component test challenges', ids: () => CH.map((c) => c.id) },
    workKey: 'component-tests-work-v1',
  });
})();
