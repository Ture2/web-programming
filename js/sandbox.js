'use strict';

/* ==========================================================================
   Running student code safely, shared by the "Try it" boxes and the tools.

   Sandbox.runJs(code, { timeout, tests }) → Promise<{ logs, error, results }>
     Runs plain JavaScript in a Web Worker built from a Blob: no DOM, no access to
     the page, and an infinite loop is stopped after `timeout` ms. console.log /
     info / warn / error are captured and formatted like the Node/DevTools console.
     Asynchronous code works: the run ends when no timer is pending and the
     microtasks have drained, so output from setTimeout, promises and await is kept,
     in order. Errors thrown later (in a callback, or a rejected promise nobody
     handles) become "Uncaught …" error lines, as in the console. Each line is sent
     to the page as it is printed, so a stopped run still shows what it printed.
     `tests` (optional): JavaScript run after the code, in the same scope, that calls
     check(name, actual, expected) — used by the self-checking exercises.

   Sandbox.consoleHtml(logs, error, emptyText) / lineHtml(line): console output as HTML.

   Sandbox.page({ html, css, js, bridge }) → srcdoc string for an
     <iframe sandbox="allow-scripts"> (opaque origin: the page cannot read the
     site's storage or DOM). With bridge, console output and errors are sent to
     the parent with postMessage and delivered to Sandbox.onConsole listeners.
   ========================================================================== */

const Sandbox = (() => {
  /* Formats a value like the browser console does (strings quoted inside structures). */
  const FORMAT = `
    function __fmt(v, depth, inner) {
      if (depth > 4) return '…';
      if (typeof v === 'string') return inner ? "'" + v + "'" : v;
      if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined || typeof v === 'bigint') return String(v) + (typeof v === 'bigint' ? 'n' : '');
      if (typeof v === 'symbol') return v.toString();
      if (typeof v === 'function') return '[Function: ' + (v.name || 'anonymous') + ']';
      if (v instanceof Error) return v.name + ': ' + v.message;
      if (Array.isArray(v)) return v.length ? '[ ' + v.map(function (x) { return __fmt(x, depth + 1, true); }).join(', ') + ' ]' : '[]';
      if (v instanceof Map) return 'Map(' + v.size + ') { ' + Array.from(v).map(function (p) { return __fmt(p[0], depth + 1, true) + ' => ' + __fmt(p[1], depth + 1, true); }).join(', ') + ' }';
      if (v instanceof Set) return 'Set(' + v.size + ') { ' + Array.from(v).map(function (x) { return __fmt(x, depth + 1, true); }).join(', ') + ' }';
      if (typeof v === 'object') {
        var keys = Object.keys(v);
        if (!keys.length) return '{}';
        return '{ ' + keys.map(function (k) { return (/^[A-Za-z_$][\\w$]*$/.test(k) ? k : "'" + k + "'") + ': ' + __fmt(v[k], depth + 1, true); }).join(', ') + ' }';
      }
      return String(v);
    }
    /* A first argument with %s / %d / %i / %f / %o / %O / %c is a format string, as in the console
       (React's warnings use it); %c styling is dropped. */
    function __line(args) {
      args = Array.prototype.slice.call(args);
      if (typeof args[0] === 'string' && /%[sdifoOc]/.test(args[0]) && args.length > 1) {
        var rest = args.slice(1);
        var head = args[0].replace(/%([sdifoOc%])/g, function (m, k) {
          if (k === '%') return '%';
          if (!rest.length) return m;
          var v = rest.shift();
          if (k === 'c') return '';
          if (k === 'd' || k === 'i') return String(parseInt(v, 10));
          if (k === 'f') return String(parseFloat(v));
          return __fmt(v, 0, k !== 's');
        });
        args = [head].concat(rest);
      }
      return args.map(function (a) { return __fmt(a, 0, false); }).join(' ');
    }`;

  const WORKER = `${FORMAT}
    var __sent = 0, __MAX = 2000;   /* lines sent to the page: enough to show that output was cut (consoleHtml shows 500) */
    function __emit(level, text) {
      if (__sent++ < __MAX) postMessage({ type: 'log', line: { level: level, text: text } });
    }
    ['log', 'info', 'warn', 'error', 'table'].forEach(function (level) {
      console[level] = function () { __emit(level === 'table' ? 'log' : level, __line(arguments)); };
    });
    function __errText(err) { return err && err.name ? err.name + ': ' + err.message : String(err); }
    /* Timers are counted: the run is over when none is pending. */
    var __st = setTimeout, __ct = clearTimeout, __si = setInterval, __ci = clearInterval;
    var __timers = new Set(), __finished = false, __error = null, __results = [];
    function __call(fn, args) {
      try { if (typeof fn === 'function') fn.apply(null, args); }
      catch (err) { __emit('error', 'Uncaught ' + __errText(err)); }
    }
    function __maybeDone() {
      if (__timers.size || __finished) return;
      /* Two tasks later: every pending microtask (then, await) has run, and so has the
         browser's report of a rejected promise that nobody handled. */
      __st(function () {
        __st(function () {
          if (__timers.size || __finished) return;
          __finished = true;
          postMessage({ type: 'done', error: __error, results: __results });
        }, 0);
      }, 0);
    }
    setTimeout = function (fn, ms) {
      var args = Array.prototype.slice.call(arguments, 2);
      var id = __st(function () { __timers.delete(id); __call(fn, args); __maybeDone(); }, ms);
      __timers.add(id);
      return id;
    };
    clearTimeout = function (id) { __timers.delete(id); __ct(id); __maybeDone(); };
    setInterval = function (fn, ms) {
      var args = Array.prototype.slice.call(arguments, 2);
      var id = __si(function () { __call(fn, args); }, ms);
      __timers.add(id);
      return id;
    };
    clearInterval = function (id) { __timers.delete(id); __ci(id); __maybeDone(); };
    self.addEventListener('unhandledrejection', function (e) {
      e.preventDefault();
      __emit('error', 'Uncaught (in promise) ' + __errText(e.reason));
    });
    /* Deep equality that ignores object key order (arrays keep their order). */
    function __canon(v) {
      if (Array.isArray(v)) return v.map(__canon);
      if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = __canon(v[k]); }); return o; }
      if (typeof v === 'number' && isNaN(v)) return '__NaN__';
      if (v === undefined) return '__undefined__';
      return v;
    }
    function check(name, actual, expected) {
      var ok = JSON.stringify(__canon(actual)) === JSON.stringify(__canon(expected));
      __results.push({ name: name, ok: ok, actual: __fmt(actual, 0, true), expected: __fmt(expected, 0, true) });
    }
    onmessage = function (e) {
      try { (0, eval)(e.data.code + '\\n;' +(e.data.tests || '')); }
      catch (err) { __error = __errText(err); }
      postMessage({ type: 'sync' });
      __maybeDone();
    };`;

  let workerUrl = null;
  const url = () => workerUrl || (workerUrl = URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));

  function runJs(code, { timeout = 2000, tests = '' } = {}) {
    return new Promise((resolve) => {
      let w;
      try { w = new Worker(url()); } catch (e) {
        resolve({ logs: [], error: t('Your browser blocked the code runner: {msg}', { msg: e.message }), results: [] });
        return;
      }
      const logs = [];
      let syncDone = false;
      const finish = (out) => { clearTimeout(timer); w.terminate(); resolve({ logs, ...out }); };
      const timer = setTimeout(() => finish({
        error: syncDone
          ? t('Stopped after {s} s: a timer was still waiting (an interval that is never cleared, or a long delay).', { s: timeout / 1000 })
          : t('Stopped after {s} s: is there an infinite loop?', { s: timeout / 1000 }),
        results: [],
      }), timeout);
      w.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'log') logs.push(m.line);
        else if (m.type === 'sync') syncDone = true;
        else if (m.type === 'done') finish({ error: m.error, results: m.results });
      };
      w.onerror = (e) => { e.preventDefault(); finish({ error: e.message || 'SyntaxError', results: [] }); };
      w.postMessage({ code, tests });
    });
  }

  /* ---- Pages in a sandboxed iframe --------------------------------------------- */

  const BRIDGE = `<script>${FORMAT}
    (function () {
      function send(level, text) { parent.postMessage({ __sandbox: true, level: level, text: text }, '*'); }
      ['log', 'info', 'warn', 'error'].forEach(function (level) {
        var orig = console[level];
        console[level] = function () { send(level, __line(arguments)); orig.apply(console, arguments); };
      });
      window.addEventListener('error', function (e) { send('error', e.message); });
    })();
  <\/script>`;

  const BASE_CSS = 'body{font:15px/1.45 Arial,Helvetica,sans-serif;margin:12px;color:#111;background:#fff}';

  /* A whole document for srcdoc. js runs after the body (like a script at the end of <body>). */
  function page({ html = '', css = '', js = '', bridge = false, baseCss = true } = {}) {
    const safeJs = js ? `<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script>` : '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${bridge ? BRIDGE : ''}<style>${baseCss ? BASE_CSS : ''}${css}</style></head><body>${html}${safeJs}</body></html>`;
  }

  /* Console messages from sandboxed frames: the listener gets (frameWindow, { level, text }). */
  let consoleListener = null;
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.__sandbox || !consoleListener) return;
    consoleListener(e.source, { level: e.data.level, text: e.data.text });
  });
  const onConsole = (fn) => { consoleListener = fn; };

  /* Console output as HTML (.lr-console lines): logs = [{ level, text }] (at most MAX_LINES), then the
     error, if any. With no output: emptyText (default: a hint to use console.log; null for nothing). */
  const MAX_LINES = 500;
  const lineHtml = (l) => `<p class="lr-line lr-${esc(l.level)}">${esc(l.text)}</p>`;
  function consoleHtml(logs, error, emptyText) {
    const shown = logs.slice(0, MAX_LINES).map(lineHtml).join('')
      + (logs.length > MAX_LINES ? lineHtml({ level: 'warn', text: t('… {n} more lines not shown', { n: logs.length - MAX_LINES }) }) : '')
      + (error ? lineHtml({ level: 'error', text: error }) : '');
    const empty = emptyText === undefined ? t('No output. Use console.log(…) to print values.') : emptyText;
    return shown || (empty ? `<p class="muted small">${esc(empty)}</p>` : '');
  }

  return { runJs, page, onConsole, lineHtml, consoleHtml, MAX_LINES };
})();
