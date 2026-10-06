'use strict';

/* ==========================================================================
   Client-side routing tools (React Router as the worked example). Pure logic:
   js/tools/routing-engine.js.

   router-sim  a simulated browser tab running a single-page app: an address
               bar (Link click = history push; Load = a full page load), Back,
               Forward and Refresh, switches for the fake log-in, the server's
               index.html fallback, a log-in that survives reloads and the two
               `replace` options; an editable <Routes> configuration. Shows
               what renders (each layout and what its <Outlet /> holds),
               useParams / useSearchParams / useLocation, every redirect
               (push or replace), the history stack and the ranking of every
               route path. 9 challenges (2 "predict", 7 "fix it"):
               challengeStore 'router-challenges-v1'.
   Typing repaints only the output parts (data-part) so the caret stays put.
   ========================================================================== */

(() => {
  const E = RoutingEngine;
  const store = challengeStore('router-challenges-v1');
  const RC = E.CHALLENGES;

  const SWITCHES = [
    ['loggedIn', 'Logged in (fake auth state)'],
    ['fallback', 'The server answers every path with index.html'],
    ['persist', 'The log-in survives a reload (token in localStorage)'],
    ['guardReplace', 'The guard redirects with replace'],
    ['loginReplace', 'After log-in: navigate(from, { replace: true })'],
  ];

  let mode = null;                       // challenge index or 'free'
  const states = {};                     // mode key → { config, parsed, opt, url, sim, preset, hint }
  const answers = {};                    // predict challenge id → chosen index
  let justSolved = '';

  const currentMode = () => {
    if (mode === null) mode = 'free';
    return mode;
  };
  const challenge = () => (currentMode() === 'free' ? null : RC[currentMode()]);
  const keyOf = () => (challenge() ? challenge().id : 'free');

  function fresh(c, presetId) {
    const p = c || E.PRESETS.find((x) => x.id === presetId) || E.PRESETS[0];
    const opt = { ...E.DEFAULT_OPT, ...(p.opt || {}) };
    const st = { config: p.config, opt, url: p.url, preset: c ? null : p.id, hint: false, parsed: null, sim: null };
    build(st, true);
    return st;
  }

  /* Parses the configuration; with start, opens the start URL in a fresh tab. */
  function build(st, start) {
    st.parsed = E.parseRoutes(st.config);
    if (st.parsed.errors.length) return;
    if (start || !st.sim) {
      st.sim = E.createSim(st.parsed.routes, st.opt);
      E.load(st.sim, st.url);
      st.url = E.href(E.current(st.sim));
    } else {
      E.rerender(st.sim, st.parsed.routes);
    }
  }

  function state() {
    const k = keyOf();
    if (!states[k]) states[k] = fresh(challenge(), 'app');
    return states[k];
  }

  const locked = () => { const c = challenge(); return !!(c && c.kind === 'predict' && answers[c.id] === undefined); };

  /* ---- Checking the current challenge ------------------------------------------------- */

  let checks = null;
  function runCheck(root) {
    const c = challenge();
    checks = null;
    justSolved = '';
    if (!c || c.kind !== 'edit') return;
    const st = state();
    if (st.parsed.errors.length) { checks = [{ status: 'bad', text: t('Fix the errors in the configuration first.') }]; return; }
    checks = c.check(st.parsed.routes, { ...st.opt, loggedIn: st.sim ? st.sim.loggedIn : st.opt.loggedIn });
    if (checks.every((i) => i.status !== 'bad')) solve(root, c);
  }

  function solve(root, c) {
    const index = RC.indexOf(c);
    const first = root ? Tools.markSolved(root, { store, id: c.id, action: 'ro-mode', index }) : store.mark(c.id);
    if (first) justSolved = t('Challenge solved! {title}', { title: t(c.title) });
  }

  /* ---- Parts --------------------------------------------------------------------------- */

  function goalHtml() {
    const c = challenge();
    const st = state();
    if (!c) {
      const p = E.PRESETS.find((x) => x.id === st.preset) || E.PRESETS[0];
      return `<div class="tl-goal ro-goal">
          <div class="tl-row">
            ${Tools.select({ label: t('Example'), fid: 'ro-preset', options: E.PRESETS.map((x) => [x.id, t(x.title)]), current: p.id, data: { rs: 'preset' } })}
            <button type="button" class="btn ghost small-btn" data-action="ro-reset" data-fid="ro-reset">${esc(t('Reset'))}</button>
          </div>
          <p>${md(t(p.note))}</p>
        </div>`;
    }
    const done = store.isSolved(c.id);
    let inner;
    if (c.kind === 'predict') {
      const chosen = answers[c.id];
      inner = `<p>${md(t(c.goal))}</p>
        <pre class="ro-snippet"><code>${esc(c.config)}</code></pre>
        <div class="ro-choices" role="group" aria-label="${esc(t('Choices'))}">${c.choices.map((ch, k) => {
          const cls = chosen === undefined ? '' : k === c.answer ? ' is-right' : k === chosen ? ' is-wrong' : '';
          return `<button type="button" class="ro-choice${cls}" data-action="ro-pick" data-v="${k}" data-fid="ro-pick-${k}" aria-pressed="${chosen === k}"${chosen !== undefined ? ' aria-disabled="true"' : ''}>${esc(t(ch))}</button>`;
        }).join('')}</div>
        ${chosen !== undefined
          ? `<p class="ro-why">${chosen === c.answer ? `${ICON.ok}<strong>${esc(t('Right.'))}</strong>` : `${ICON.bad}<strong>${esc(t('Not quite.'))}</strong>`} ${md(t(c.why))}</p>
             <p class="muted small">${esc(t('The simulator below now runs this configuration: try other URLs.'))}</p>
             <p><button type="button" class="btn ghost small-btn" data-action="ro-again" data-fid="ro-again">${esc(t('Try again'))}</button></p>`
          : `<p class="muted small">${esc(t('Answer first: the simulator runs this configuration once you choose.'))}</p>`}`;
    } else {
      inner = `<p>${md(t(c.goal))}</p>
        <p class="ro-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="ro-hint" data-fid="ro-hint" aria-expanded="${!!st.hint}">${esc(st.hint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="ro-reset" data-fid="ro-reset">${esc(t('Restart challenge'))}</button>
        </p>
        ${st.hint ? `<p class="ro-hint">${md(t(c.hint))}</p>` : ''}
        ${checks ? `<ul class="checks">${checks.map(checkItem).join('')}</ul>` : ''}`;
    }
    return `<div class="tl-goal ro-goal${done ? ' is-solved' : ''}">
        <p class="ro-goal-title"><strong>${esc(t(c.title))}</strong>${done ? ` <span class="ro-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        ${inner}
        ${justSolved ? `<p class="ro-solved">${ICON.ok}<span>${esc(justSolved)}</span></p>` : ''}
      </div>`;
  }

  const LOG_ICON = { nav: '→', server: '⇄', redirect: '↪', state: '•', warn: '!', error: '✗' };

  function boxHtml(view, k) {
    const n = view.tree[k];
    if (!n) return '';
    const inner = boxHtml(view, k + 1);
    const where = `<span class="ro-route"><code>${esc(E.routeLabel(n.route))}</code> ${esc(t('matched {p}', { p: n.pathname }))}</span>`;
    if (!n.name) {
      return `<div class="ro-box ro-pass"><p class="ro-box-head"><span class="muted">${esc(t('No element: the route renders its child route directly'))}</span> ${where}</p>${inner}</div>`;
    }
    const guard = n.guard && n.guard !== n.name && !n.blocked ? ` <span class="ro-badge">${esc(t('inside {g}', { g: n.guard }))}</span>` : '';
    let body = '';
    if (n.blocked) body = `<p class="ro-blocked">${md(t('Nobody is logged in: `{g}` renders `<Navigate to="/login" />` instead of the page.', { g: n.name }))}</p>`;
    else if (n.name === 'Navigate') body = `<p class="ro-blocked">${md(t('Renders nothing visible: it redirects.'))}</p>`;
    else if (inner) body = `<p class="ro-outlet-label"><code>&lt;Outlet /&gt;</code></p>${inner}`;
    else if (n.emptyOutlet || n.outlet) body = `<p class="ro-outlet-label"><code>&lt;Outlet /&gt;</code> <span class="muted">${esc(t('is empty: no child route matches this URL'))}</span></p>`;
    return `<div class="ro-box ro-d${Math.min(k, 3)}"><p class="ro-box-head"><code class="ro-comp">${esc(n.name)}</code>${guard} ${where}</p>${body}</div>`;
  }

  function hooksHtml(st) {
    const s = st.sim;
    const loc = E.current(s);
    const params = s.view && s.view.params ? { ...s.view.params } : {};
    const search = E.searchEntries(loc.search);
    const rows = [
      ['useParams()', JSON.stringify(params)],
      ['useSearchParams()', search.length ? search.map(([k, v]) => `${k} → ${JSON.stringify(v)}`).join(', ') : t('(empty)')],
      ['useLocation().pathname', JSON.stringify(loc.pathname)],
      ['useLocation().search', JSON.stringify(loc.search)],
      ['useLocation().hash', JSON.stringify(loc.hash)],
      ['useLocation().state', JSON.stringify(loc.state)],
    ];
    return `<div class="scroll"><table class="src ro-hooks"><caption>${esc(t('What the page component can read'))}</caption>
        <tbody>${rows.map(([k, v]) => `<tr><th scope="row"><code>${esc(k)}</code></th><td><code>${esc(v)}</code></td></tr>`).join('')}</tbody></table></div>`;
  }

  function outHtml() {
    if (locked()) return `<p class="muted small">${esc(t('Choose an answer above first.'))}</p>`;
    const st = state();
    if (st.parsed.errors.length && !st.sim) return `<p class="muted small">${esc(t('Fix the configuration to run it.'))}</p>`;
    const s = st.sim;
    const v = s.view;
    let page;
    if (v.server404) {
      page = `<div class="ro-page ro-server404" role="group" aria-label="${esc(t('The page in the browser'))}">
          <p class="ro-404"><strong>404 Not Found</strong></p>
          <p><code>Cannot GET ${esc(v.pathname)}</code></p>
          <p class="muted small">${md(t('This page comes from the **server**, not from the app: the app never loaded.'))}</p>
        </div>`;
    } else if (v.loop) {
      page = `<div class="ro-page ro-error" role="group" aria-label="${esc(t('The page in the browser'))}"><p>${ICON.bad}<strong>${esc(t('Blank page: redirect loop'))}</strong></p></div>`;
    } else if (v.notFound) {
      page = `<div class="ro-page ro-blank" role="group" aria-label="${esc(t('The page in the browser'))}"><p class="muted">${md(t('(blank) No route matches `{p}`, so the router renders nothing.', { p: E.current(s).pathname }))}</p></div>`;
    } else {
      page = `<div class="ro-page" role="group" aria-label="${esc(t('The page in the browser'))}">${boxHtml(v, 0)}</div>`;
    }
    const login = E.isLoginPage(s) && !s.loggedIn
      ? `<p class="ro-actions"><button type="button" class="btn small-btn" data-action="ro-login" data-fid="ro-login">${esc(t('Submit the log-in form'))}</button>
          <span class="muted small">${esc(t('logs in, then navigates to where the user came from'))}</span></p>`
      : '';
    const log = s.log.length
      ? `<ol class="ro-log" aria-label="${esc(t('What happened'))}">${s.log.map((l) => `<li class="ro-log-${l.kind}"><span class="ro-log-sym" aria-hidden="true">${LOG_ICON[l.kind] || '•'}</span><span>${md(l.text)}</span></li>`).join('')}</ol>`
      : '';
    return `${st.parsed.errors.length ? `<p class="tl-bad small">${esc(t('The configuration has errors: the simulator keeps running the last valid one.'))}</p>` : ''}
      ${page}${login}
      <h4 class="tl-sub">${esc(t('What happened'))}</h4>${log}
      ${s.app && !v.loop ? hooksHtml(st) : ''}`;
  }

  function histHtml() {
    if (locked()) return '';
    const s = state().sim;
    if (!s) return '';
    return `<ol class="ro-stack" aria-label="${esc(t('History entries, oldest first'))}">${s.entries.map((en, k) => {
      const newDoc = k > 0 && en.doc !== s.entries[k - 1].doc;
      const cur = k === s.index;
      return `<li${cur ? ' aria-current="step" class="is-current"' : ''}><code>${esc(E.href(en))}</code>${en.state ? ` <span class="muted small">state ${esc(JSON.stringify(en.state))}</span>` : ''}${newDoc ? ` <span class="ro-badge">${esc(t('new page load'))}</span>` : ''}${cur ? ` <span class="ro-here">${esc(t('← you are here'))}</span>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  function errorsHtml() {
    const p = state().parsed;
    const items = [
      ...p.errors.map((e) => ({ status: 'bad', text: `${t('Line {n}', { n: e.line })}: ${e.message}` })),
      ...p.warnings.map((w) => ({ status: 'note', text: `${t('Line {n}', { n: w.line })}: ${w.message}` })),
    ];
    return items.length ? `<ul class="checks ro-errors">${items.map(checkItem).join('')}</ul>` : '';
  }

  function rankHtml() {
    if (locked()) return `<p class="muted small">${esc(t('Choose an answer above first.'))}</p>`;
    const st = state();
    if (st.parsed.errors.length) return '';
    const s = st.sim;
    const m = s && s.app && !s.view.server404 ? s.view.match : E.matchRoutes(st.parsed.routes, E.current(s).pathname);
    const STATUS = { match: ['is-match', '✓', t('matches: wins')], no: ['is-no', '✗', t('does not match')], skipped: ['is-skip', '–', t('not tried')] };
    return `<div class="scroll"><table class="src ro-rank"><caption>${md(t('Every route path, best score first, for `{p}`', { p: E.current(s).pathname }))}</caption>
        <thead><tr><th scope="col">${esc(t('Path'))}</th><th scope="col">${esc(t('Route'))}</th><th scope="col">${esc(t('Score'))}</th><th scope="col">${esc(t('Result'))}</th></tr></thead>
        <tbody>${m.ranked.map((r) => {
          const [cls, sym, label] = STATUS[r.status];
          const el = r.route.element ? E.elLabel(r.route.element) : t('(no element)');
          return `<tr class="${cls}"><td><code>${esc(r.path)}</code></td><td><code>${esc(el)}</code></td><td><span class="ro-score">${esc(r.score)}</span> <span class="muted small ro-sw">${esc(r.why)}</span></td><td><span aria-hidden="true">${sym}</span> ${esc(label)}</td></tr>`;
        }).join('')}</tbody></table></div>
      <p class="muted small">${md(t('Score: one point per segment, then 10 for a static segment, 3 for a `:param`, 1 for an empty one, 2 more for an index route, 2 less for `*`. Equal scores: the sibling written first wins.'))}</p>`;
  }

  const codeHtml = () => `<pre class="ro-code"><code>${esc(E.appCode(state().opt))}</code></pre>`;

  const switchesHtml = () => {
    const st = state();
    const s = st.sim;
    return SWITCHES.map(([k, label]) => {
      const on = k === 'loggedIn' ? !!(s ? s.loggedIn : st.opt.loggedIn) : !!st.opt[k];
      return `<label class="tl-check"><input type="checkbox" data-rs="opt" data-k="${k}" data-fid="ro-opt-${k}"${on ? ' checked' : ''}${locked() ? ' disabled' : ''}> ${md(t(label))}</label>`;
    }).join('');
  };

  const navHtml = () => {
    const s = state().sim;
    const dis = locked() || !s;
    return `<button type="button" class="btn ghost small-btn" data-action="ro-back" data-fid="ro-back"${dis || s.index <= 0 ? ' disabled' : ''}><span aria-hidden="true">←</span> ${esc(t('Back'))}</button>
      <button type="button" class="btn ghost small-btn" data-action="ro-forward" data-fid="ro-forward"${dis || s.index >= s.entries.length - 1 ? ' disabled' : ''}>${esc(t('Forward'))} <span aria-hidden="true">→</span></button>
      <button type="button" class="btn ghost small-btn" data-action="ro-reload" data-fid="ro-reload"${dis ? ' disabled' : ''}><span aria-hidden="true">⟳</span> ${esc(t('Refresh'))}</button>`;
  };

  const PARTS = {
    'ro-goal': goalHtml,
    'ro-nav': navHtml,
    'ro-switches': switchesHtml,
    'ro-out': outHtml,
    'ro-hist': histHtml,
    'ro-errors': errorsHtml,
    'ro-rank': rankHtml,
    'ro-code': codeHtml,
  };

  function body() {
    const st = state();
    const cur = currentMode();
    const s = st.sim;
    const rows = Math.min(22, Math.max(8, st.config.split('\n').length + 1));
    return `<div class="rs">
        ${Tools.challengePicker({ list: RC, current: cur, store, action: 'ro-mode', label: t('Routing challenges'), free: { value: 'free', label: t('Free play') } })}
        <div data-part="ro-goal">${goalHtml()}</div>
        <section class="ro-browser" aria-labelledby="ro-b-h">
          <h4 class="tl-sub" id="ro-b-h">${esc(t('The browser tab'))}</h4>
          <form class="ro-bar" data-ro-form>
            <div class="ro-nav" data-part="ro-nav">${navHtml()}</div>
            <div class="tl-field ro-urlf"><label for="ro-url">${esc(t('Address (path, ?query, #hash)'))}</label>
              <input id="ro-url" class="tl-input" data-rs="url" data-fid="ro-url" value="${esc(s ? st.url : '')}" spellcheck="false" autocomplete="off" autocapitalize="off"${locked() ? ' disabled' : ''}></div>
            <div class="ro-go">
              <button type="submit" class="btn small-btn" data-fid="ro-link"${locked() ? ' disabled' : ''}>${esc(t('Click a <Link>'))}</button>
              <button type="button" class="btn ghost small-btn" data-action="ro-load" data-fid="ro-load"${locked() ? ' disabled' : ''}>${esc(t('Load as a new page'))}</button>
            </div>
          </form>
          <fieldset class="ro-switches"><legend>${esc(t('App and server'))}</legend><div data-part="ro-switches">${switchesHtml()}</div></fieldset>
          <div class="ro-grid">
            <div class="ro-main" data-part="ro-out">${outHtml()}</div>
            <div class="ro-side">
              <h4 class="tl-sub">${esc(t('History stack'))}</h4>
              <div data-part="ro-hist">${histHtml()}</div>
            </div>
          </div>
        </section>
        <section class="ro-config" aria-labelledby="ro-c-h">
          <h4 class="tl-sub" id="ro-c-h">${esc(t('The routes'))}</h4>
          <div class="lr-pane">
            <label class="lr-label" for="ro-code">${esc(t('Route configuration (App.jsx)'))}</label>
            <textarea class="lr-code ro-editor" id="ro-code" data-rs="config" data-fid="ro-code" rows="${rows}" spellcheck="false" autocapitalize="off" autocomplete="off"${locked() ? ' readonly' : ''}>${esc(locked() ? '' : st.config)}</textarea>
          </div>
          <p class="muted small">${md(t('Guards: `RequireAuth` (also `Protected`). Log-in page: `Login`. Redirects: `<Navigate to="…" replace />`. Ctrl+Enter or the address bar re-runs the URL.'))}</p>
          <div data-part="ro-errors">${errorsHtml()}</div>
          <div data-part="ro-rank">${rankHtml()}</div>
        </section>
        <details class="ro-appcode" data-fid="ro-appcode"><summary>${esc(t('The app code (the guard and the log-in page)'))}</summary>
          <div data-part="ro-code">${codeHtml()}</div>
        </details>
      </div>`;
  }

  function summary() {
    const st = state();
    const s = st.sim;
    if (locked() || !s) return '';
    const v = s.view;
    const at = E.href(E.current(s));
    if (v.server404) return t('{u}: 404 from the server', { u: at });
    if (v.loop) return t('{u}: redirect loop', { u: at });
    if (v.notFound) return t('{u}: no route matches, blank page', { u: at });
    return t('{u}: {chain}', { u: at, chain: E.chainOf(v).join(' › ') });
  }

  /* Repaints the outputs (or everything), runs the check and announces the result. */
  function update(root, all) {
    runCheck(root);
    if (all) Tools.refresh('router-sim');
    else keepFocus(() => Tools.paint(root, PARTS));
    focusableScrollers(root);
    const s = state().sim;
    if (s && !locked()) {
      const input = root.querySelector('[data-fid="ro-url"]');
      const now = E.href(E.current(s));
      state().url = now;
      if (input && document.activeElement !== input) input.value = now;
    }
    Tools.say(root, [summary(), justSolved].filter(Boolean).join(' — '));
  }

  function act(root, fn) {
    const st = state();
    if (!st.sim || locked()) return;
    fn(st.sim);
    const input = root.querySelector('[data-fid="ro-url"]');
    st.url = E.href(E.current(st.sim));
    if (input) input.value = st.url;
    update(root, false);
  }

  Tools.register('router-sim', {
    title: 'Router simulator',
    intro: 'A browser tab running a single-page app. Type a URL and **click a Link** (no request to the server) or **load it as a new page**, press Back, Forward and Refresh, log in and out, and edit the routes: see which layouts and pages render, the params, every redirect and the history stack.',
    body,
    mount(root) { focusableScrollers(root); },
    onClick(el, root) {
      const a = el.dataset.action;
      const st = state();
      if (a === 'ro-mode') {
        mode = el.dataset.v === 'free' ? 'free' : Number(el.dataset.v);
        justSolved = '';
        checks = null;
        runCheck(null);
        justSolved = '';
        Tools.refresh('router-sim');
        Tools.say(root, `${challenge() ? t(challenge().title) : t('Free play')}. ${summary()}`);
        return;
      }
      if (a === 'ro-pick') {
        const c = challenge();
        if (!c || answers[c.id] !== undefined) return;
        const k = Number(el.dataset.v);
        answers[c.id] = k;
        justSolved = '';
        if (k === c.answer) solve(root, c);
        states[c.id] = fresh(c);
        Tools.refresh('router-sim');
        const why = root.querySelector('.ro-why');
        if (why) why.setAttribute('tabindex', '-1');
        const btn = root.querySelector(`[data-fid="ro-pick-${k}"]`);
        if (btn) btn.focus({ preventScroll: true });
        Tools.say(root, k === c.answer ? (justSolved || t('Right.')) : t('Not quite. The right answer is choice {n}.', { n: c.answer + 1 }));
        return;
      }
      if (a === 'ro-again') {
        const c = challenge();
        delete answers[c.id];
        justSolved = '';
        Tools.refresh('router-sim');
        const first = root.querySelector('[data-fid="ro-pick-0"]');
        if (first) first.focus();
        return;
      }
      if (a === 'ro-hint') { st.hint = !st.hint; keepFocus(() => Tools.paint(root, { 'ro-goal': goalHtml })); return; }
      if (a === 'ro-reset') {
        const c = challenge();
        states[keyOf()] = c ? fresh(c) : fresh(null, st.preset);
        checks = null;
        justSolved = '';
        runCheck(null);
        justSolved = '';
        Tools.refresh('router-sim');
        Tools.say(root, `${t('Reset')}. ${summary()}`);
        return;
      }
      if (a === 'ro-back') act(root, E.back);
      else if (a === 'ro-forward') act(root, E.forward);
      else if (a === 'ro-reload') act(root, E.reload);
      else if (a === 'ro-login') {
        act(root, E.submitLogin);
        const next = root.querySelector('[data-fid="ro-url"]');
        if (next && !root.querySelector('[data-fid="ro-login"]')) next.focus({ preventScroll: true });
      } else if (a === 'ro-load') {
        const input = root.querySelector('[data-fid="ro-url"]');
        act(root, (s) => E.load(s, input ? input.value : st.url));
      }
    },
    onSubmit(form, root) {
      if (!form.hasAttribute('data-ro-form')) return;
      const input = root.querySelector('[data-fid="ro-url"]');
      act(root, (s) => E.link(s, input ? input.value : state().url));
    },
    onChange(e, root) {
      const el = e.target;
      const st = state();
      if (el.dataset.rs === 'preset') {
        states.free = fresh(null, el.value);
        update(root, true);
      } else if (el.dataset.rs === 'opt') {
        const k = el.dataset.k;
        if (k === 'loggedIn') {
          if (st.sim) E.setLoggedIn(st.sim, el.checked);
          st.opt.loggedIn = el.checked;
        } else {
          st.opt[k] = el.checked;
          if (st.sim) st.sim.opt[k] = el.checked;
          if (st.sim) st.sim.log = [{ kind: 'state', text: `\`${k}\` is now ${el.checked ? 'on' : 'off'}: it applies from the next navigation.` }];
        }
        update(root, false);
      }
    },
    onInput(e, root) {
      const el = e.target;
      const st = state();
      if (el.dataset.rs === 'config') {
        st.config = el.value;
        build(st, false);
        update(root, false);
      } else if (el.dataset.rs === 'url') st.url = el.value;
    },
    onKeydown(e, root) {
      if (e.target.dataset.rs === 'config') {
        codeEditorKeydown(e, () => act(root, (s) => E.link(s, E.href(E.current(s)), { label: 'Re-run', replace: true })));
      }
    },
    challenges: { store, label: 'Routing challenges', ids: () => RC.map((c) => c.id) },
  });
})();
