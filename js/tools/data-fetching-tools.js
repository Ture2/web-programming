'use strict';

/* ==========================================================================
   Fetching data tools. Pure logic: js/tools/data-fetching-engine.js (FetchLabEngine).

   fetch-lab   a small React app (editable) runs in a sandboxed frame against the
               mock API (js/tools/mock-api-engine.js). A script placed before the
               app wraps fetch(): it adds the latency of FetchLabEngine.latencyFor,
               applies the failure switches (network failure, 500, 401 for
               requests that carry a token), answers from the mock API and posts
               every request (start, end, cancel, fail) and a summary of what the
               preview shows (list items, buttons, alerts, aria-busy, aria-invalid)
               to this page. The page draws the request timeline and checks the
               challenges. "Type fast" types a word into the preview's search box,
               one character every 120 ms.
               8 challenges: challengeStore 'fetch-challenges-v1'.
   Settings reach the running preview by postMessage (no reload); a new
   scenario or an edit of the code rebuilds the preview (and the mock data).
   ========================================================================== */

(() => {
  const E = FetchLabEngine;
  const store = challengeStore('fetch-challenges-v1');
  const CH = E.CHALLENGES;
  const TYPE_GAP = 120;

  const fl = {
    ch: null,                 // challenge index, -1 = free mode (null: not chosen yet)
    scenario: 'states',
    edits: {},                // scenario id → edited code
    settings: {},             // scenario id → settings
    timeline: E.createTimeline(),
    snap: null,
    lastT: 0,
    typed: '',
    typing: false,
    error: '',                // compile error (HTML)
    logs: [],                 // console lines of the preview
    build: 0,
  };

  function mode() {
    if (fl.ch === null) {
      const k = CH.findIndex((c) => !store.isSolved(c.id));
      fl.ch = k;
      if (k >= 0) fl.scenario = CH[k].scenario;
    }
    return fl.ch;
  }
  const challenge = () => (mode() >= 0 ? CH[fl.ch] : null);
  const scenario = () => E.scenarioById(fl.scenario);
  const settings = () => (fl.settings[fl.scenario] = fl.settings[fl.scenario] || E.settingsFor(fl.scenario));
  const code = () => (fl.edits[fl.scenario] !== undefined ? fl.edits[fl.scenario] : scenario().code);
  const rows = () => E.rows(fl.timeline);

  /* ---- The script that runs in the preview before the app ------------------------------- */

  /* Runs inside the frame (no access to this page). S = settings, latencyFor = the engine's. */
  const PRELUDE = String(function prelude(S, latencyFor) {
    var t0 = performance.now();
    var n = 0;
    var state = null;
    function now() { return Math.round(performance.now() - t0); }
    function post(m) { m.__fl = true; try { parent.postMessage(m, '*'); } catch (e) { /* closed */ } }
    function headerList(h) {
      if (!h) return [];
      if (typeof Headers !== 'undefined' && h instanceof Headers) return Array.from(h.entries());
      if (Array.isArray(h)) return h;
      return Object.keys(h).map(function (k) { return [k, String(h[k])]; });
    }
    function wrapped(input, init) {
      init = init || {};
      var url = new URL(typeof input === 'string' ? input : input.url, 'http://localhost:5173/');
      var method = String(init.method || 'GET').toUpperCase();
      var path = url.pathname + url.search;
      var headers = headerList(init.headers);
      var auth = headers.some(function (p) { return /^authorization$/i.test(p[0]) && String(p[1]).trim() !== ''; });
      var id = ++n;
      var start = now();
      post({ kind: 'req', ev: { type: 'start', id: id, t: start, method: method, path: path, auth: auth } });
      var signal = init.signal;
      return new Promise(function (resolve, reject) {
        var done = false;
        function finish(ev) { if (done) return false; done = true; ev.id = id; ev.t = now(); post({ kind: 'req', ev: ev }); return true; }
        function log(text, warn) { console[warn ? 'warn' : 'info']('[network] ' + method + ' ' + path + ' → ' + text + ' (' + (now() - start) + ' ms)'); }
        function abortError() { return new DOMException('signal is aborted without reason', 'AbortError'); }
        function fail(text) { if (finish({ type: 'fail', error: 'Failed to fetch' })) { log('failed: ' + text, true); reject(new TypeError('Failed to fetch')); } }
        function answer(status, reason, resHeaders, body, total, count) {
          if (!finish({ type: 'end', status: status, total: total, count: count })) return;
          log(status + ' ' + reason);
          resolve(new Response(status === 204 || !body ? null : body, { status: status, statusText: reason, headers: resHeaders }));
        }
        if (signal && signal.aborted) { finish({ type: 'cancel' }); reject(abortError()); return; }
        var timer = setTimeout(function () {
          if (url.host !== 'localhost:5173' || !/^\/api(\/|$)/.test(url.pathname)) { fail('this preview only answers /api/… requests'); return; }
          if (S.network) { fail('no connection'); return; }
          var json = [['Content-Type', 'application/json; charset=utf-8']];
          if (S.server500) { answer(500, 'Internal Server Error', json, '{ "error": "Internal server error" }', null, null); return; }
          if (S.expired && auth) { answer(401, 'Unauthorized', json, '{ "error": "Invalid or expired token" }', null, null); return; }
          if (!state) state = MockApiEngine.createState();
          var r = MockApiEngine.request(state, { method: method, path: path, headers: headers, body: init.body == null ? '' : String(init.body) });
          state = r.state;
          var total = null;
          r.res.headers.forEach(function (p) { if (p[0] === 'X-Total-Count') total = p[1]; });
          answer(r.res.status, r.res.reason, r.res.headers, r.res.body, total, Array.isArray(r.res.data) ? r.res.data.length : null);
        }, latencyFor(path, S));
        if (signal) {
          signal.addEventListener('abort', function () {
            clearTimeout(timer);
            if (finish({ type: 'cancel' })) { log('cancelled'); reject(abortError()); }
          });
        }
      });
    }
    // The React runner installs its own fetch later: keep ours.
    Object.defineProperty(window, 'fetch', { configurable: true, get: function () { return wrapped; }, set: function () { /* keep the wrapper above */ } });

    /* What the preview shows, sent after every change (at most every 60 ms). */
    var pending = 0;
    function snapshot() {
      pending = 0;
      var root = document.getElementById('root');
      if (!root) return;
      var all = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
      var text = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
      var input = root.querySelector('input[type="search"]') || root.querySelector('input:not([type="password"])');
      post({ kind: 'snap', snap: {
        t: now(),
        text: text(root).slice(0, 2000),
        items: all('li').map(text),
        buttons: all('button').map(function (b) { return { text: text(b), disabled: b.disabled }; }),
        alerts: all('[role="alert"]').map(text),
        busy: !!root.querySelector('[aria-busy="true"]'),
        invalid: all('[aria-invalid="true"]').map(function (el) { return el.name || el.id || ''; }),
        password: !!root.querySelector('input[type="password"]'),
        input: input ? input.value : '',
      } });
    }
    function soon() { if (!pending) pending = setTimeout(snapshot, 60); }
    document.addEventListener('DOMContentLoaded', function () {
      new MutationObserver(soon).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      document.addEventListener('input', soon, true);
      soon();
    });

    /* Types a word into the search box, one character at a time, as a person would. */
    function typeText(word, gap) {
      var root = document.getElementById('root');
      var el = root && (root.querySelector('input[type="search"]') || root.querySelector('input'));
      if (!el) { post({ kind: 'typed', text: '', error: 'no input' }); return; }
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      var put = function (v) { setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      if (el.value !== '') put('');
      var k = 0;
      (function step() {
        k += 1;
        put(word.slice(0, k));
        if (k < word.length) setTimeout(step, gap);
        else post({ kind: 'typed', text: word });
      })();
    }
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || !d.__fl) return;
      if (d.kind === 'settings') S = d.settings;
      else if (d.kind === 'type') typeText(String(d.text), d.gap || 120);
    });
  });

  const FRAME_CSS = 'label{display:inline-flex;gap:6px;align-items:center;margin:0 8px 8px 0}input{font:inherit;padding:4px 6px}button{font:inherit;padding:4px 10px;margin:0 4px 4px 0}'
    + 'button:disabled{opacity:.5}ul{padding-left:20px}[role=alert]{color:#b3261e}[role=status]{color:#1a1f6c;font-weight:bold}'
    + '.field-error{color:#b3261e;margin:4px 0 8px}[aria-invalid=true]{border:2px solid #b3261e}[aria-busy=true]{color:#555}';

  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

  function srcdoc(compiled) {
    const doc = ReactRunner.page({ code: compiled.code, selfRender: compiled.selfRender, css: FRAME_CSS, api: { latency: 0 } });
    const script = `<script>(${PRELUDE})(${json(settings())}, ${E.latencyFor.toString()});<\/script>`;
    return doc.includes('<body>') ? doc.replace('<body>', `<body>${script}`) : script + doc;
  }

  const frameOf = (root) => root && root.querySelector('[data-fl-frame]');
  const liveFrame = () => frameOf(document.querySelector('[data-widget="fetch-lab"]'));

  function resetRun() {
    fl.timeline = E.createTimeline();
    fl.snap = null;
    fl.lastT = 0;
    fl.typed = '';
    fl.typing = false;
    fl.logs = [];
  }

  async function build(root) {
    const frame = frameOf(root);
    if (!frame) return;
    const run = (fl.build += 1);
    resetRun();
    fl.error = '';
    if (location.protocol === 'file:') {
      fl.error = `<p class="lr-line lr-warn">${esc(t('The preview needs the page to be served over http(s). Run npm run site:serve and open http://localhost:8080.'))}</p>`;
      paintAll(root);
      return;
    }
    try { await ReactRunner.load(); } catch (e) {
      fl.error = Sandbox.lineHtml({ level: 'error', text: t('Could not load the JSX compiler. Reload the page to try again.') });
      paintAll(root);
      return;
    }
    if (run !== fl.build) return;
    const r = ReactRunner.compile(code(), window.Sucrase.transform);
    if (!r.ok) {
      const at = r.error.line ? ` ${t('(line {line}, column {col})', { line: r.error.line, col: r.error.column + 1 })}` : '';
      fl.error = `${Sandbox.lineHtml({ level: 'error', text: `SyntaxError: ${r.error.message}${at}` })}${r.error.frame ? `<pre class="lr-frame">${esc(r.error.frame)}</pre>` : ''}`;
      frame.closest('.fl-preview').classList.add('is-stale');
      paintAll(root);
      return;
    }
    frame.closest('.fl-preview').classList.remove('is-stale');
    frame.srcdoc = srcdoc(r);
    paintAll(root);
  }
  const rebuildSoon = debounce(() => { const root = document.querySelector('[data-widget="fetch-lab"]'); if (root) build(root); }, 600);

  function send(msg) {
    const f = liveFrame();
    if (f && f.contentWindow) f.contentWindow.postMessage({ __fl: true, ...msg }, '*');
  }

  /* ---- Messages from the preview ------------------------------------------------------------ */

  let painter = null;                     // created on first use: the part renderers are defined below
  const repaint = () => (painter = painter || Tools.painter('fetch-lab', { 'fl-timeline': timelineHtml, 'fl-status': statusHtml, 'fl-console': consoleHtml }))();

  window.addEventListener('message', (e) => {
    const f = liveFrame();
    if (!f || e.source !== f.contentWindow || !e.data) return;
    const d = e.data;
    if (d.__sandbox) {
      fl.logs.push({ level: d.level, text: d.text });
      if (fl.logs.length > 200) fl.logs.splice(0, fl.logs.length - 200);
    } else if (d.__fl && d.kind === 'req') {
      fl.timeline = E.applyEvent(fl.timeline, d.ev);
      fl.lastT = Math.max(fl.lastT, Number(d.ev.t) || 0);
    } else if (d.__fl && d.kind === 'snap') {
      fl.snap = d.snap;
      fl.lastT = Math.max(fl.lastT, Number(d.snap.t) || 0);
    } else if (d.__fl && d.kind === 'typed') {
      fl.typing = false;
      fl.typed = d.text;
      const root = f.closest('[data-widget]');
      if (d.error) Tools.say(root, t('The preview has no input to type into.'));
      else Tools.say(root, t('Typed "{w}". {n} requests so far.', { w: d.text, n: rows().length }));
    } else return;
    check(f.closest('[data-widget]'));
    repaint();
  });

  function check(root) {
    const c = challenge();
    if (!c || c.scenario !== fl.scenario || store.isSolved(c.id) || fl.typing) return;
    const ctx = { scenario: fl.scenario, rows: rows(), snap: fl.snap, settings: settings(), typed: fl.typed };
    if (fl.snap && c.check(ctx)) Tools.markSolved(root, { store, id: c.id, action: 'fl-ch', index: fl.ch, say: t('Challenge solved! {title}', { title: t(c.title) }) });
  }

  /* ---- Rendering ---------------------------------------------------------------------------- */

  const LABEL = {
    latest: 'the answer for the current query',
    superseded: 'replaced by a newer request',
    ignored: 'arrived late, after the newer one: ignored',
    won: 'arrived late and overwrote the newer result',
  };

  function outcomeText(r) {
    if (r.outcome === 'pending') return [t('waiting…'), 'pending'];
    if (r.outcome === 'cancelled') return [t('cancelled'), 'cancelled'];
    if (r.outcome === 'failed') return [t('failed (no response)'), 'bad'];
    return [String(r.status), r.status >= 400 ? 'bad' : 'ok'];
  }

  function timelineHtml() {
    const rs = rows();
    if (!rs.length) return `<p class="muted small">${esc(t('No requests yet. Use the preview, or press Reload preview.'))}</p>`;
    const race = fl.snap ? E.analyzeRace(rs, fl.snap.input, fl.snap.items) : { labels: {} };
    const pos = E.bars(rs, rs.some((r) => r.outcome === 'pending') ? fl.lastT : null);
    const t0 = Math.min(...rs.map((r) => r.start));
    return `<ol class="fl-tl">${rs.map((r, k) => {
      const [txt, cls] = outcomeText(r);
      const b = pos.list[k];
      const label = race.labels[r.id] && LABEL[race.labels[r.id]] ? t(LABEL[race.labels[r.id]]) : '';
      const time = r.end == null ? t('started at {a} ms', { a: r.start - t0 }) : t('{a} → {b} ms ({d} ms)', { a: r.start - t0, b: r.end - t0, d: r.duration });
      return `<li class="fl-req fl-${cls}${race.labels[r.id] === 'won' ? ' fl-won' : ''}">
          <p class="fl-req-head"><span class="fl-method">${esc(r.method)}</span> <code class="fl-path">${esc(r.path)}</code>${r.auth ? ` <span class="fl-tag">${esc(t('token'))}</span>` : ''}
            <span class="fl-out">${esc(txt)}</span></p>
          <div class="fl-track" aria-hidden="true"><span class="fl-bar" style="margin-left:${b.from.toFixed(2)}%;width:${Math.min(100 - b.from, b.width).toFixed(2)}%"></span></div>
          <p class="fl-req-meta">${esc(time)}${r.count != null ? ` · ${esc(r.count === 1 ? t('1 item') : t('{n} items', { n: r.count }))}` : ''}${r.total != null ? ` · X-Total-Count ${esc(r.total)}` : ''}${label ? ` · <strong>${esc(label)}</strong>` : ''}</p>
        </li>`;
    }).join('')}</ol>`;
  }

  function statusHtml() {
    const c = challenge();
    const parts = [];
    const rs = rows();
    if (fl.snap) {
      const race = E.analyzeRace(rs, fl.snap.input, fl.snap.items);
      if (race.verdict === 'latest') parts.push(`<p class="tl-ok">${ICON.ok}<span>${esc(t('The list matches the search box ("{q}").', { q: fl.snap.input }))}</span></p>`);
      else if (race.verdict === 'stale-won') parts.push(`<p class="tl-bad">${ICON.bad}<span>${esc(t('Stale response won: the box says "{q}", but an older, slower response arrived last and replaced the list.', { q: fl.snap.input }))}</span></p>`);
      else if (race.verdict === 'mismatch') parts.push(`<p class="tl-bad">${ICON.bad}<span>${esc(t('The list does not match the search box ("{q}").', { q: fl.snap.input }))}</span></p>`);
    }
    const n = rs.length;
    const cancelled = rs.filter((r) => r.outcome === 'cancelled').length;
    parts.push(`<p class="muted small">${esc(t(n === 1 ? '1 request · {c} cancelled · {p} waiting' : '{n} requests · {c} cancelled · {p} waiting', { n, c: cancelled, p: rs.filter((r) => r.outcome === 'pending').length }))}${fl.typing ? ` · ${esc(t('typing…'))}` : ''}</p>`);
    if (c && c.scenario === fl.scenario) {
      parts.push(`<p class="fl-verdict">${Tools.statusHtml({ ok: store.isSolved(c.id), okText: t('Solved!'), notYet: t('Not solved yet.'), next: fl.ch < CH.length - 1 ? { action: 'fl-ch', v: fl.ch + 1, label: t('Next challenge') } : null })}</p>`);
    } else if (c) {
      parts.push(`<p class="muted small">${esc(t('This challenge runs in the scenario "{s}".', { s: t(E.scenarioById(c.scenario).title) }))}</p>`);
    }
    return parts.join('');
  }

  const consoleHtml = () => (fl.error ? fl.error : Sandbox.consoleHtml(fl.logs.slice(-40), null, t('The preview\'s console is empty.')));

  function paintAll(root) {
    Tools.paint(root, { 'fl-timeline': timelineHtml, 'fl-status': statusHtml, 'fl-console': consoleHtml });
  }

  function goalHtml() {
    const c = challenge();
    if (!c) return `<p class="tl-goal">${md(t('**Free mode.** Pick a scenario, slow the network down, switch failures on, edit the code and watch every request on the timeline. Or pick a challenge.'))}</p>`;
    return `<div class="tl-goal"><p><strong>${esc(t('Challenge {n}: {title}', { n: fl.ch + 1, title: t(c.title) }))}</strong></p><p>${md(t(c.goal))}</p>
      <details class="pg-hint" data-fid="fl-hint-${c.id}"><summary>${esc(t('Hint'))}</summary><p>${md(t(c.hint))}</p></details></div>`;
  }

  const check1 = (prop, label, st) => `<label class="tl-check"><input type="checkbox" data-fl-set="${prop}" data-fid="fl-${prop}"${st[prop] ? ' checked' : ''}> ${esc(label)}</label>`;

  function body() {
    mode();
    const s = scenario();
    const st = settings();
    return `${Tools.challengePicker({ list: CH, current: fl.ch, store, action: 'fl-ch', label: t('Fetch lab challenges'), free: { value: -1, label: t('Free') } })}
      ${goalHtml()}
      <div class="tl-row fl-controls">
        ${Tools.select({ label: t('Scenario'), fid: 'fl-scenario', options: E.SCENARIOS.map((x) => [x.id, t(x.title)]), current: fl.scenario, data: { fl: 'scenario' } })}
        ${Tools.range({ label: t('Latency'), prop: 'latency', value: st.latency, min: 0, max: 2000, step: 100, unit: ' ms', fid: 'fl-latency' })}
      </div>
      <p class="fl-intro">${md(t(s.intro))}</p>
      <fieldset class="fl-switches"><legend>${esc(t('Network and server'))}</legend>
        ${check1('skew', t('Slow broad searches'), st)}
        ${check1('network', t('Network failure'), st)}
        ${check1('server500', t('Server error 500'), st)}
        ${check1('expired', t('401 for requests with a token'), st)}
      </fieldset>
      <p class="fl-actions">
        ${s.typing ? `<button type="button" class="btn" data-action="fl-type" data-fid="fl-type">${esc(t('Type "{w}" fast', { w: s.typing }))}</button>` : ''}
        <button type="button" class="btn ghost" data-action="fl-reload" data-fid="fl-reload">${esc(t('Reload preview'))}</button>
        <button type="button" class="btn ghost" data-action="fl-clear" data-fid="fl-clear">${esc(t('Clear timeline'))}</button>
        <button type="button" class="btn ghost" data-action="fl-reset" data-fid="fl-reset"${fl.edits[fl.scenario] === undefined ? ' disabled' : ''}>${esc(t('Reset code'))}</button>
      </p>
      <div class="fl-grid">
        <div class="fl-editor">
          <label class="lr-label" for="fl-code">App.jsx</label>
          <textarea class="tl-code fl-code" id="fl-code" data-fl="code" data-fid="fl-code" rows="18" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(code())}</textarea>
          <p class="muted small">${esc(t('The preview rebuilds when you stop typing (and the mock data starts afresh) · Tab indents · Esc then Tab leaves the editor'))}</p>
        </div>
        <div class="fl-preview">
          <p class="lr-label">${esc(t('Preview'))}</p>
          <iframe class="fl-frame" sandbox="allow-scripts allow-forms" title="${esc(t('Preview of the app'))}" data-fl-frame></iframe>
          <p class="lr-label">${esc(t('Console'))}</p>
          <div class="lr-console fl-console" data-part="fl-console" role="log" aria-label="${esc(t('Console of the preview'))}">${consoleHtml()}</div>
        </div>
      </div>
      <div class="fl-status" data-part="fl-status">${statusHtml()}</div>
      <h4 class="fl-h">${esc(t('Request timeline'))}</h4>
      <div data-part="fl-timeline">${timelineHtml()}</div>`;
  }

  function pickChallenge(root, k) {
    fl.ch = k;
    const c = challenge();
    if (c) fl.scenario = c.scenario;
    Tools.refresh('fetch-lab');
  }

  Tools.register('fetch-lab', {
    title: 'Fetch lab',
    intro: 'A small React app talks to a mock API. Slow the network down, make the server fail, type fast, page through results and log in, and watch every request on the timeline: when it left, when it came back, and whether it was cancelled or ignored.',
    challenges: { store, label: 'Fetch lab challenges', ids: () => CH.map((c) => c.id) },
    body,
    mount(root) { build(root); },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'fl-ch') pickChallenge(root, Number(el.dataset.v));
      else if (a === 'fl-reload') { build(root); Tools.say(root, t('Preview reloaded; the mock data starts afresh.')); } else if (a === 'fl-clear') { fl.timeline = E.createTimeline(); fl.lastT = 0; paintAll(root); Tools.say(root, t('Timeline cleared.')); } else if (a === 'fl-reset') { delete fl.edits[fl.scenario]; Tools.refresh('fetch-lab'); Tools.say(root, t('Code reset.')); } else if (a === 'fl-type') {
        const word = scenario().typing;
        fl.timeline = E.createTimeline();
        fl.lastT = 0;
        fl.typing = true;
        fl.typed = '';
        paintAll(root);
        send({ kind: 'type', text: word, gap: TYPE_GAP });
        Tools.say(root, t('Typing "{w}"…', { w: word }));
      } else return false;
      return true;
    },
    onInput(e, root) {
      const el = e.target;
      if (el.dataset.fl === 'code') {
        fl.edits[fl.scenario] = el.value;
        const reset = root.querySelector('[data-action="fl-reset"]');
        if (reset) reset.disabled = false;
        rebuildSoon();
        return true;
      }
      if (el.dataset.prop === 'latency') {
        settings().latency = Number(el.value);
        Tools.showVal(root, 'latency', `${el.value} ms`);
        send({ kind: 'settings', settings: settings() });
        return true;
      }
      return false;
    },
    onChange(e, root) {
      const el = e.target;
      if (el.dataset.fl === 'scenario') {
        fl.scenario = el.value;
        Tools.refresh('fetch-lab');
        Tools.say(root, t('Scenario: {s}', { s: t(scenario().title) }));
        return true;
      }
      if (el.dataset.flSet) {
        settings()[el.dataset.flSet] = el.checked;
        send({ kind: 'settings', settings: settings() });
        repaint();
        return true;
      }
      return false;
    },
    onKeydown(e) {
      if (e.target.dataset && e.target.dataset.fl === 'code') return codeEditorKeydown(e);
      return false;
    },
  });
})();
