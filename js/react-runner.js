'use strict';

/* ==========================================================================
   React "Try it" boxes (card.live.kind === 'react', drawn by js/live-runner.js).
   The student's JSX is compiled in the page with Sucrase (vendor/sucrase/, loaded
   on first use) and run in the usual sandboxed iframe (js/sandbox.js), which loads
   React from vendor/react/ (the development build, so its warnings show up in the
   box's console) and renders <App /> into #root with createRoot.

   ReactRunner.compile(source, transform) → { ok: true, code, selfRender }
                                          | { ok: false, error: { message, line, column, frame } }
     Pure (also runs in Node: site/test/react-runner.test.mjs). `transform` is
     Sucrase's. Imports become require() calls answered inside the frame:
       'react', 'react-dom', 'react-dom/client'  the vendored React
       '*.module.css'                            class names as written (styles.card → 'card')
       '*.css'                                   nothing (the box's CSS pane is the stylesheet)
     The component to render is the default export, else a function called App.
     Code that calls createRoot itself (selfRender) is not rendered a second time.
   ReactRunner.locate(stack) → { line, column } | null: where in the student's code
     a runtime error happened (Sucrase keeps line numbers).
   ReactRunner.frame(source, line, column) → three lines of code with a caret.
   ReactRunner.page({ code, css, api }) → srcdoc for the frame. With `api`, fetch()
     answers /api/… from the mock REST API (js/tools/mock-api-engine.js) after
     api.latency ms (default 300); api.fail = 'network' | 500 | 401 makes every
     request fail that way. Each request is logged to the console ("[network] …").
   ReactRunner.load() → Promise: loads Sucrase once.
   ========================================================================== */

const ReactRunner = (() => {
  const FILE = 'App.jsx';
  const WRAP_LINES = 1;                  // the wrapper adds one line before the student's code

  function frame(source, line, column) {
    const lines = String(source).split('\n');
    if (!line || line > lines.length) return '';
    const from = Math.max(1, line - 1);
    const width = String(line + 1).length;
    const out = [];
    for (let k = from; k <= Math.min(lines.length, line + 1); k++) {
      out.push(`${k === line ? '>' : ' '} ${String(k).padStart(width)} | ${lines[k - 1]}`);
      if (k === line && column != null) out.push(`  ${' '.repeat(width)} | ${' '.repeat(Math.max(0, column))}^`);
    }
    return out.join('\n');
  }

  function compile(source, transform) {
    const src = String(source || '');
    let code;
    try {
      code = transform(src, { transforms: ['jsx', 'imports'], jsxRuntime: 'classic', production: true }).code;
    } catch (e) {
      const loc = e.loc || {};
      const message = String(e.message || e).replace(/\s*\(\d+:\d+\)\s*$/, '');
      return { ok: false, error: { message, line: loc.line || null, column: loc.column != null ? loc.column : null, frame: frame(src, loc.line, loc.column) } };
    }
    // A comment, not code, may mention createRoot: look at the compiled code without comments.
    // Sucrase turns an imported createRoot(…) into _client.createRoot.call(void 0, …).
    const selfRender = /\bcreateRoot(?:\.call)?\s*\(/.test(code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
    return { ok: true, code, selfRender };
  }

  function locate(stack) {
    const m = String(stack || '').match(new RegExp(`${FILE.replace('.', '\\.')}:(\\d+):(\\d+)`));
    if (!m) return null;
    return { line: Math.max(1, Number(m[1]) - WRAP_LINES), column: Math.max(0, Number(m[2]) - 1) };
  }

  /* ---- The frame ------------------------------------------------------------------ */

  const abs = (path) => (typeof location !== 'undefined' ? new URL(path, location.href).href : path);
  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

  /* Runs inside the frame, after React (and the mock API) have loaded. */
  const RUNTIME = String(function runtime(__code, __selfRender, __api) {
    var root = document.getElementById('root');
    function where(err) {
      var m = String(err && err.stack || '').match(/App\.jsx:(\d+):(\d+)/);
      return m ? ' (line ' + Math.max(1, m[1] - 1) + ')' : '';
    }
    function show(title, err, extra) {
      var box = document.getElementById('__err') || document.body.appendChild(document.createElement('pre'));
      box.id = '__err';
      box.textContent = title + '\n' + (err && err.name ? err.name + ': ' + err.message : String(err)) + where(err) + (extra || '');
      console.error((err && err.name ? err.name + ': ' + err.message : String(err)) + where(err));
    }
    function req(name) {
      if (name === 'react') return React;
      if (name === 'react-dom' || name === 'react-dom/client') return ReactDOM;
      if (/\.module\.css$/.test(name)) return new Proxy({}, { get: function (o, k) { return k === '__esModule' ? false : String(k); } });
      if (/\.css$/.test(name)) return {};
      throw new Error('"' + name + '" is not available here: this preview only has react and react-dom.');
    }
    if (__api) {
      var state = MockApiEngine.createState();
      var latency = __api.latency == null ? 300 : __api.latency;
      var headerList = function (h) {
        if (!h) return [];
        if (typeof Headers !== 'undefined' && h instanceof Headers) return Array.from(h.entries());
        if (Array.isArray(h)) return h;
        return Object.keys(h).map(function (k) { return [k, String(h[k])]; });
      };
      window.fetch = function (input, init) {
        init = init || {};
        var url = new URL(typeof input === 'string' ? input : input.url, 'http://localhost:5173/');
        var method = String(init.method || 'GET').toUpperCase();
        var path = url.pathname + url.search;
        var started = Date.now();
        return new Promise(function (resolve, reject) {
          var signal = init.signal;
          var abortError = function () { return new DOMException('signal is aborted without reason', 'AbortError'); };
          if (signal && signal.aborted) { reject(abortError()); return; }
          var timer = setTimeout(function () {
            var ms = ' (' + (Date.now() - started) + ' ms)';
            if (!/^\/api(\/|$)/.test(url.pathname) || url.host !== 'localhost:5173') {
              console.warn('[network] ' + method + ' ' + url.href + ' → failed: this preview only answers /api/… requests');
              reject(new TypeError('Failed to fetch'));
              return;
            }
            if (__api.fail === 'network') { console.warn('[network] ' + method + ' ' + path + ' → failed: no connection' + ms); reject(new TypeError('Failed to fetch')); return; }
            var r;
            if (__api.fail === 500 || __api.fail === 401) {
              var data = { error: __api.fail === 500 ? 'Internal server error' : 'Missing or invalid token' };
              r = { res: { status: __api.fail, reason: __api.fail === 500 ? 'Internal Server Error' : 'Unauthorized', headers: [['Content-Type', 'application/json; charset=utf-8']], body: JSON.stringify(data) } };
            } else {
              r = MockApiEngine.request(state, { method: method, path: path, headers: headerList(init.headers), body: init.body == null ? '' : String(init.body) });
              state = r.state;
            }
            console.info('[network] ' + method + ' ' + path + ' → ' + r.res.status + ' ' + r.res.reason + ms);
            resolve(new Response(r.res.status === 204 || !r.res.body ? null : r.res.body, { status: r.res.status, statusText: r.res.reason, headers: r.res.headers }));
          }, latency);
          if (signal) signal.addEventListener('abort', function () { clearTimeout(timer); console.info('[network] ' + method + ' ' + path + ' → cancelled'); reject(abortError()); });
        });
      };
    }
    var module = { exports: {} };
    try {
      (0, eval)('(function (require, module, exports) {\n' + __code + '\n;if (!exports.default && typeof App === "function") exports.default = App;\n})\n//# sourceURL=App.jsx')(req, module, module.exports);
    } catch (err) { show('Your code threw an error while it loaded:', err); return; }
    if (__selfRender) return;
    var App = module.exports.default;
    if (typeof App !== 'function') { show('Nothing to render.', 'Define a component called App, or export one as default.'); return; }
    ReactDOM.createRoot(root, {
      onUncaughtError: function (err, info) {
        // "at App (App.jsx:4:46)" → "at App (line 3)": the student's line numbers.
        var stack = info && info.componentStack ? String(info.componentStack).replace(/\(?(?:[^\s()]*\/)?App\.jsx:(\d+):\d+\)?/g, function (m, l) { return '(line ' + Math.max(1, l - 1) + ')'; }) : '';
        show('Your component threw an error while rendering:', err, stack ? '\n\nComponent stack:' + stack : '');
      },
    }).render(React.createElement(App));
  });

  const FRAME_CSS = '#__err{margin:0;padding:12px;border-left:4px solid #b3261e;background:#fdecea;color:#5c1611;font:13px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap}';

  function page({ code, selfRender = false, css = '', api = null }) {
    const scripts = [abs('vendor/react/react.js'), ...(api ? [abs('js/tools/mock-api-engine.js')] : [])];
    // React's development build announces its DevTools once: noise in a preview.
    const quiet = '<script>(function(){var i=console.info;console.info=function(a){if(typeof a==="string"&&a.indexOf("React DevTools")>=0)return;return i.apply(console,arguments);};})();<\/script>';
    const html = `<div id="root"></div>${scripts.map((s) => `<script src="${s}"><\/script>`).join('')}`;
    const js = `(${RUNTIME})(${json(code)}, ${selfRender ? 'true' : 'false'}, ${api ? json(api === true ? {} : api) : 'null'});`;
    return Sandbox.page({ html: quiet + html, css: FRAME_CSS + css, js, bridge: true });
  }

  let loading = null;
  function load() {
    if (typeof window !== 'undefined' && window.Sucrase) return Promise.resolve();
    return loading || (loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/sucrase/sucrase.js';
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error('Could not load the JSX compiler')); };
      document.head.appendChild(s);
    }));
  }

  return { compile, locate, frame, page, load, FILE };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ReactRunner;
