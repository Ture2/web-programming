'use strict';

/* ==========================================================================
   Routes and middleware tools (Express as the worked example). Simulation: js/tools/express-engine.js.

   middleware-pipeline  an app.js as a vertical pipeline of layers (switch
                        them on and off, reorder them, pick a code variant)
                        and a request (method, path, Content-Type,
                        Authorization, body). Shows what every layer did,
                        the response (or the hang / crash), the server
                        console and a step-by-step explanation.
                        9 challenges: challengeStore 'middleware-challenges-v1'.
   route-matcher        an editable list of routes (method, optional router
                        mount, path pattern) and a request line: which route
                        answers first, why the others did not, and req.params,
                        req.query, req.path, req.baseUrl.
                        3 challenges: challengeStore 'route-challenges-v1'.
   Typing repaints only the output parts (data-part) so the caret stays put;
   structural changes (toggle, move, add) re-render the tool (keepFocus).
   ========================================================================== */

(() => {
  const EE = ExpressEngine;
  const jsonish = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

  /* ======================================================================
     1. Middleware pipeline
     ====================================================================== */

  const mpStore = challengeStore('middleware-challenges-v1');
  const MPC = EE.MW_CHALLENGES;
  const CTYPES = [['', '(none)'], ['application/json', 'application/json'], ['text/plain', 'text/plain']];
  const mpStates = {};                     // mode → { preset, layers, version, request }
  let mpMode = null;

  const mpCurrentMode = () => {
    if (mpMode !== null) return mpMode;
    const next = MPC.find((c) => !mpStore.isSolved(c.id));
    mpMode = next ? next.id : 'free';
    return mpMode;
  };
  const mpChallenge = () => MPC.find((c) => c.id === mpCurrentMode()) || null;

  function mpFresh(presetId, request) {
    const p = EE.presetById(presetId);
    return { preset: p.id, layers: EE.presetLayers(p.id), version: 4, request: { ...(request || p.request) } };
  }
  function mpState() {
    const id = mpCurrentMode();
    if (!mpStates[id]) {
      const c = mpChallenge();
      mpStates[id] = c ? mpFresh(c.preset, c.request) : mpFresh('lab');
    }
    return mpStates[id];
  }

  let mpRun = null;
  let mpJustSolved = '';
  const simulate = (st, request) => EE.simulate(st.layers, request || st.request, { version: st.version });

  /* Runs the request, then checks the challenge. Returns the solved message (first time only). */
  function mpExecute(root) {
    const st = mpState();
    mpRun = simulate(st);
    const c = mpChallenge();
    mpJustSolved = '';
    if (c && c.check(mpRun, st, (q) => simulate(st, q))) {
      const index = MPC.indexOf(c);
      if (root && Tools.markSolved(root, { store: mpStore, id: c.id, action: 'mp-mode', index })) mpJustSolved = t('Challenge solved! {title}', { title: c.title });
      else if (!root && mpStore.mark(c.id)) mpJustSolved = t('Challenge solved! {title}', { title: c.title });
    }
    return mpJustSolved;
  }

  /* ---- Rendering --------------------------------------------------------------------- */

  const stepsById = () => {
    const map = {};
    if (mpRun) mpRun.steps.forEach((s) => { map[s.id] = s; });
    return map;
  };

  /* The outcome of one layer: [state class, symbol, text]. */
  function outcome(layer, s, isOn) {
    if (!isOn) return ['off', '○', t('Not registered (switched off)')];
    if (!s) return ['unreached', '·', mpRun && mpRun.final.kind !== 'invalid' ? t('Not reached: the request ended earlier') : ''];
    if (s.status === 'skip') {
      const why = {
        path: layer.kind === 'route' ? t('Skipped: the path does not match') : t('Skipped: the path does not start with {m}', { m: layer.mount }),
        method: t('Skipped: wrong method ({m} route, {r} request)', { m: layer.method, r: s.method }),
        'error-route': t('Skipped: an error is pending'),
        'error-router': t('Skipped: an error is pending'),
        'error-mw': t('Skipped: not an error handler ({n} parameters) and an error is pending', { n: s.arity }),
        'no-error': t('Skipped: error handler, and there is no error'),
        decode: t('Error: the URL has a broken %-escape'),
      }[s.reason] || t('Skipped');
      return ['skip', '↷', why];
    }
    if (s.enter) {
      const left = s.actions.find((a) => a.type === 'leave' || a.type === 'leave-err');
      return [left ? 'skip' : 'ran', '↘', left ? t('Entered the router; no route inside answered') : t('Entered the router')];
    }
    const parts = s.actions.map((a) => {
      if (a.type === 'next') return t('next()');
      if (a.type === 'next-err') return t('next(err)');
      if (a.type === 'respond') return t('responded {s}', { s: a.status });
      if (a.type === 'throw') return a.err && a.err.code === 'ERR_HTTP_HEADERS_SENT' ? t('threw ERR_HTTP_HEADERS_SENT') : t('threw {e}', { e: (a.err && a.err.name) || 'an error' });
      if (a.type === 'reject') return a.handled ? t('rejected promise → next(err)') : t('rejected promise: nobody catches it');
      return '';
    }).filter(Boolean);
    if (s.hang) return ['hang', '⏸', t('Ran, then nothing: no next(), no response')];
    const bad = s.actions.some((a) => a.type === 'throw' || a.type === 'next-err' || (a.type === 'reject' && !a.handled));
    const responded = s.actions.some((a) => a.type === 'respond');
    const cls = bad ? 'error' : responded ? 'respond' : 'ran';
    const sym = bad ? '✗' : responded ? '✓' : '→';
    return [cls, sym, `${t('Ran')} → ${parts.join(', ')}`];
  }

  const variantSelect = (layer) => {
    const b = EE.BEHAVIORS[layer.fn];
    if (!b || !b.variants) return '';
    return Tools.select({ label: t('Code'), fid: `mp-var-${layer.id}`, options: b.variants.map(([v, txt]) => [v, t(txt)]), current: layer.variant, data: { 'mp-var': layer.id }, cls: 'mp-var' });
  };

  function codeDetails(layer) {
    const lines = EE.codeOf(layer);
    if (lines.length <= 1) return '';
    return `<details class="mp-code" data-fid="mp-code-${esc(layer.id)}"><summary>${esc(t('Show the code'))}</summary><pre><code>${esc(lines.join('\n'))}</code></pre></details>`;
  }

  function layerHtml(layer, k, total, steps, inRouter, parentOn) {
    const isOn = layer.on !== false && parentOn;
    const s = steps[layer.id];
    const [cls, sym, text] = outcome(layer, s, isOn);
    const title = EE.BEHAVIORS[layer.fn] ? EE.BEHAVIORS[layer.fn].title : layer.name || layer.id;
    const reg = EE.regLine(layer, inRouter);
    const controls = inRouter ? (variantSelect(layer) ? `<div class="mp-ctrl">${variantSelect(layer)}</div>` : '') : `<div class="mp-ctrl">
        <label class="tl-check mp-on"><input type="checkbox" data-mp-on="${esc(layer.id)}" data-fid="mp-on-${esc(layer.id)}"${layer.on !== false ? ' checked' : ''}> ${esc(t('Registered'))}<span class="sr-only"> · ${esc(reg)}</span></label>
        ${variantSelect(layer)}
        <span class="mp-move">
          <button type="button" class="btn ghost small-btn" data-action="mp-up" data-v="${esc(layer.id)}" data-fid="mp-up-${esc(layer.id)}"${k === 0 ? ' disabled' : ''}><span aria-hidden="true">↑</span><span class="sr-only">${esc(t('Move {x} up', { x: title }))}</span></button>
          <button type="button" class="btn ghost small-btn" data-action="mp-down" data-v="${esc(layer.id)}" data-fid="mp-down-${esc(layer.id)}"${k === total - 1 ? ' disabled' : ''}><span aria-hidden="true">↓</span><span class="sr-only">${esc(t('Move {x} down', { x: title }))}</span></button>
        </span>
      </div>`;
    const kids = layer.routes ? `<ol class="mp-pipe mp-kids" aria-label="${esc(t('Routes inside {r}', { r: layer.name || 'router' }))}">${layer.routes.map((r, j) => layerHtml(r, j, layer.routes.length, steps, true, isOn)).join('')}</ol>` : '';
    return `<li class="mp-layer is-${cls}${inRouter ? ' is-child' : ''}">
        <div class="mp-line">
          <span class="mp-n" aria-hidden="true">${s ? s.n : ''}</span>
          <code class="mp-reg">${esc(reg)}</code>
        </div>
        <div class="mp-meta">${text ? `<p class="mp-out"><span class="mp-sym" aria-hidden="true">${sym}</span><span>${s ? `<span class="sr-only">${esc(t('Step {n}:', { n: s.n }))} </span>` : ''}${esc(text)}</span></p>` : ''}
        ${controls}</div>
        ${codeDetails(layer)}
        ${kids}
      </li>`;
  }

  function pipeHtml() {
    const st = mpState();
    const steps = stepsById();
    return st.layers.map((l, k) => layerHtml(l, k, st.layers.length, steps, false, true)).join('');
  }

  function rawResponse(r) {
    const lines = [`HTTP/1.1 ${r.status} ${r.reason}`.trim(), ...r.headers.map(([k, v]) => `${k}: ${v}`), ''];
    return `${lines.join('\n')}\n${r.body}`;
  }

  function resultHtml() {
    const r = mpRun;
    if (!r) return '';
    const f = r.final;
    let main;
    if (f.kind === 'invalid') main = `<p class="tl-bad" role="alert">${esc(f.text)}</p>`;
    else if (f.kind === 'response') {
      main = `<p class="mp-verdict"><span class="mp-badge mp-b${String(r.response.status)[0]}">${esc(r.response.status)}</span> <strong>${esc(r.response.reason)}</strong> <span class="muted small">${esc(r.response.by === 'express' ? t('from Express itself (final handler)') : t('from your code'))}</span></p>
        <div class="scroll"><pre class="mp-raw" aria-label="${esc(t('Raw response'))}">${esc(rawResponse(r.response))}</pre></div>`;
    } else if (f.kind === 'hang') {
      main = `<p class="mp-verdict mp-hang"><span class="mp-badge mp-bx" aria-hidden="true">⏱</span> <strong>${esc(t('No response: the request hangs'))}</strong></p>`;
    } else {
      main = `<p class="mp-verdict mp-crash"><span class="mp-badge mp-bx" aria-hidden="true">✗</span> <strong>${esc(t('No response: the server process crashed'))}</strong></p>`;
    }
    const con = r.console.length ? r.console.map((l) => ({ level: l.level === 'error' ? 'error' : 'log', text: l.text })) : [];
    return `${main}
      ${f.explain ? `<p class="tl-explain">${md(f.explain)}</p>` : ''}
      <p class="lr-label mp-con-l">${esc(t('Server console (the terminal running node)'))}</p>
      <div class="lr-console mp-console" role="log">${Sandbox.consoleHtml(con, null, t('(nothing printed)'))}</div>`;
  }

  function storyHtml() {
    const r = mpRun;
    if (!r || !r.steps.length) return '';
    return `<details class="mp-story" data-fid="mp-story" open><summary>${esc(t('What happened, step by step'))}</summary>
        <ol class="mp-steps">${r.steps.map((s) => `<li>${md(s.explain)}</li>`).join('')}<li class="mp-final-step">${md(r.final.explain)}</li></ol>
      </details>`;
  }

  function goalHtml() {
    const c = mpChallenge();
    if (!c) {
      const st = mpState();
      const p = EE.presetById(st.preset);
      return `<div class="tl-goal mp-goal">
          <div class="tl-row mp-presetrow">
            ${Tools.select({ label: t('App'), fid: 'mp-preset', options: EE.PRESETS.map((x) => [x.id, t(x.title)]), current: st.preset, data: { mp: 'preset' } })}
            <button type="button" class="btn ghost small-btn" data-action="mp-reset" data-fid="mp-reset">${esc(t('Reset this app'))}</button>
          </div>
          <p>${md(t(p.note))}</p>
        </div>`;
    }
    const done = mpStore.isSolved(c.id);
    const st = mpState();
    return `<div class="tl-goal mp-goal${done ? ' is-solved' : ''}">
        <p class="mp-goal-title"><strong>${esc(t(c.title))}</strong>${done ? ` <span class="mp-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        <p class="mp-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="mp-hint" data-fid="mp-hint" aria-expanded="${!!st.hint}">${esc(st.hint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="mp-reset" data-fid="mp-reset">${esc(t('Restart challenge'))}</button>
        </p>
        ${st.hint ? `<p class="mp-hint">${md(t(c.hint))}</p>` : ''}
        ${mpJustSolved ? `<p class="mp-solved">${ICON.ok}<span>${esc(mpJustSolved)}</span></p>` : ''}
      </div>`;
  }

  function requestHtml() {
    const st = mpState();
    const q = st.request;
    const p = EE.presetById(st.preset);
    return `<div class="tl-row mp-req">
        ${Tools.select({ label: t('Method'), fid: 'mp-method', options: EE.METHODS, current: q.method, data: { mpq: 'method' } })}
        <div class="tl-field mp-pathf"><label for="mp-path">${esc(t('Path'))}</label>
          <input id="mp-path" class="tl-input" data-mpq="path" data-fid="mp-path" value="${esc(q.path)}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
      </div>
      <div class="tl-row mp-req">
        ${Tools.select({ label: t('Content-Type header'), fid: 'mp-ctype', options: CTYPES.map(([v, l]) => [v, t(l)]), current: q.contentType, data: { mpq: 'contentType' } })}
        <div class="tl-field mp-authf"><label for="mp-auth">${esc(t('Authorization header'))}</label>
          <input id="mp-auth" class="tl-input" data-mpq="auth" data-fid="mp-auth" value="${esc(q.auth)}" placeholder="${esc(t('(none)'))}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
      </div>
      <div class="tl-field mp-bodyf"><label for="mp-body">${esc(t('Body'))}</label>
        <textarea id="mp-body" class="tl-code" rows="2" data-mpq="body" data-fid="mp-body" spellcheck="false" autocapitalize="off">${esc(q.body)}</textarea></div>
      <div class="tl-row mp-samples" role="group" aria-label="${esc(t('Sample requests'))}">
        ${p.requests.map((x, k) => `<button type="button" class="tl-chip" data-action="mp-sample" data-v="${k}" data-fid="mp-s-${k}"><code>${esc(`${x.method} ${x.path}`)}${x.auth ? ' 🔑' : ''}${x.body ? ' {…}' : ''}</code></button>`).join('')}
      </div>`;
  }

  function modesHtml() {
    const cur = mpCurrentMode();
    return Tools.challengePicker({ list: MPC, current: cur === 'free' ? 'free' : MPC.findIndex((c) => c.id === cur), store: mpStore, action: 'mp-mode', label: t('Middleware challenges'), free: { value: 'free', label: t('Free play') } });
  }

  function mpBody() {
    if (!mpRun) mpExecute(null);
    const st = mpState();
    return `<div class="mp">
        ${modesHtml()}
        <div data-part="mp-goal">${goalHtml()}</div>
        ${Tools.seg({ label: t('Express version'), action: 'mp-version', prop: 'version', values: [['4', t('Express 4')], ['5', t('Express 5')]], current: st.version, fid: 'mp-ver', mono: false })}
        <div class="mp-grid">
          <section class="mp-app" aria-labelledby="mp-app-h">
            <h4 class="tl-sub" id="mp-app-h"><code>src/app.js</code> <span class="muted small">${esc(t('· registration order, top to bottom'))}</span></h4>
            <ol class="mp-pipe" data-part="mp-pipe">${pipeHtml()}</ol>
          </section>
          <section class="mp-io" aria-labelledby="mp-req-h">
            <h4 class="tl-sub" id="mp-req-h">${esc(t('Request'))}</h4>
            ${requestHtml()}
            <h4 class="tl-sub">${esc(t('Response'))}</h4>
            <div data-part="mp-result">${resultHtml()}</div>
          </section>
        </div>
        <div data-part="mp-story">${storyHtml()}</div>
      </div>`;
  }

  const mpParts = { 'mp-goal': goalHtml, 'mp-pipe': pipeHtml, 'mp-result': resultHtml, 'mp-story': storyHtml };

  function summary() {
    const r = mpRun;
    const q = mpState().request;
    if (!r) return '';
    const head = `${q.method} ${q.path}`;
    if (r.final.kind === 'response') return t('{req} → {s} {reason}, after {n} steps', { req: head, s: r.response.status, reason: r.response.reason, n: r.steps.length });
    if (r.final.kind === 'hang') return t('{req} → no response: the request hangs', { req: head });
    if (r.final.kind === 'crash') return t('{req} → the server crashed', { req: head });
    return r.final.text || '';
  }

  /* After a change: run again, then repaint (all = re-render the tool) and announce. */
  function rerun(root, all) {
    const solved = mpExecute(root);
    if (all) Tools.refresh('middleware-pipeline');
    else keepFocus(() => Tools.paint(root, mpParts));
    Tools.say(root, [summary(), solved].filter(Boolean).join(' — '));
  }

  /* Keeps focus usable after a move: a disabled arrow hands focus to its sibling. */
  function fixMoveFocus(root, id) {
    const up = root.querySelector(`[data-fid="mp-up-${CSS.escape(id)}"]`);
    const down = root.querySelector(`[data-fid="mp-down-${CSS.escape(id)}"]`);
    const active = document.activeElement;
    if (active && active.closest && active.closest('[data-widget]') === root && !active.disabled) return;
    const target = up && !up.disabled ? up : down;
    if (target) target.focus({ preventScroll: true });
  }

  Tools.register('middleware-pipeline', {
    title: 'Middleware pipeline',
    intro: 'Every request walks through your `app.js` from top to bottom. Switch layers on and off, move them, change their code, send a request, and watch what each layer does: skip, `next()`, respond, or fail.',
    body: mpBody,
    onClick(el, root) {
      const st = mpState();
      const a = el.dataset.action;
      if (a === 'mp-mode') {
        mpMode = el.dataset.v === 'free' ? 'free' : MPC[+el.dataset.v].id;
        mpRun = null;
        mpExecute(null);
        mpJustSolved = '';
        Tools.refresh('middleware-pipeline');
        Tools.say(root, `${mpChallenge() ? t(mpChallenge().title) : t('Free play')}. ${summary()}`);
        return;
      }
      if (a === 'mp-up' || a === 'mp-down') {
        const k = st.layers.findIndex((l) => l.id === el.dataset.v);
        const j = a === 'mp-up' ? k - 1 : k + 1;
        if (k < 0 || j < 0 || j >= st.layers.length) return;
        [st.layers[k], st.layers[j]] = [st.layers[j], st.layers[k]];
        rerun(root, true);
        fixMoveFocus(root, el.dataset.v);
        return;
      }
      if (a === 'mp-sample') {
        const p = EE.presetById(st.preset);
        st.request = { ...p.requests[+el.dataset.v] };
        rerun(root, true);
        return;
      }
      if (a === 'mp-version') { st.version = Number(el.dataset.v); rerun(root, true); return; }
      if (a === 'mp-hint') { st.hint = !st.hint; keepFocus(() => Tools.paint(root, { 'mp-goal': goalHtml })); return; }
      if (a === 'mp-reset') {
        const c = mpChallenge();
        mpStates[mpCurrentMode()] = c ? mpFresh(c.preset, c.request) : mpFresh(st.preset);
        rerun(root, true);
      }
    },
    onChange(e, root) {
      const el = e.target;
      const st = mpState();
      if (el.dataset.mpOn) {
        const l = st.layers.find((x) => x.id === el.dataset.mpOn);
        if (l) { l.on = el.checked; rerun(root, true); }
      } else if (el.dataset.mpVar) {
        const id = el.dataset.mpVar;
        const l = st.layers.find((x) => x.id === id) || st.layers.flatMap((x) => x.routes || []).find((x) => x.id === id);
        if (l) { l.variant = el.value; rerun(root, true); }
      } else if (el.dataset.mp === 'preset') {
        mpStates.free = mpFresh(el.value);
        rerun(root, true);
      } else if (el.dataset.mpq === 'method' || el.dataset.mpq === 'contentType') {
        st.request[el.dataset.mpq] = el.value;
        rerun(root, false);
      }
    },
    onInput(e, root) {
      const k = e.target.dataset.mpq;
      if (!k || e.target.tagName === 'SELECT') return;
      mpState().request[k] = e.target.value;
      rerun(root, false);
    },
    onKeydown(e) {
      if (e.target.id === 'mp-body' && e.key === 'Escape') e.target.blur();
    },
    challenges: { store: mpStore, label: 'Middleware challenges', ids: () => MPC.map((c) => c.id) },
  });

  /* ======================================================================
     2. Route matcher
     ====================================================================== */

  const rmStore = challengeStore('route-challenges-v1');
  const RTC = EE.RT_CHALLENGES;
  const RM_METHODS = [...EE.METHODS, 'ALL'];
  const rmStates = {};
  let rmMode = null;
  let rmMatch = null;
  let rmJustSolved = '';

  const rmCurrentMode = () => {
    if (rmMode !== null) return rmMode;
    rmMode = 'free';
    return rmMode;
  };
  const rmChallenge = () => RTC.find((c) => c.id === rmCurrentMode()) || null;
  function rmFresh(presetId, c) {
    const p = EE.RT_PRESETS.find((x) => x.id === presetId) || EE.RT_PRESETS[0];
    return { preset: p.id, routes: p.routes.map((r) => ({ ...r })), method: (c && c.method) || p.method, url: (c && c.urlStart) || p.url };
  }
  function rmState() {
    const id = rmCurrentMode();
    if (!rmStates[id]) { const c = rmChallenge(); rmStates[id] = c ? rmFresh(c.preset, c) : rmFresh('order'); }
    return rmStates[id];
  }

  function rmExecute(root) {
    const st = rmState();
    rmMatch = EE.matchRoutes(st.routes, st.method, st.url);
    const c = rmChallenge();
    rmJustSolved = '';
    if (c && c.check(rmMatch, st)) {
      const index = RTC.indexOf(c);
      const first = root ? Tools.markSolved(root, { store: rmStore, id: c.id, action: 'rm-mode', index }) : rmStore.mark(c.id);
      if (first) rmJustSolved = t('Challenge solved! {title}', { title: c.title });
    }
    return rmJustSolved;
  }

  const routeCode = (r) => (r.mount ? `router.${r.method === 'ALL' ? 'all' : r.method.toLowerCase()}('${r.path}', handler)` : `app.${r.method === 'ALL' ? 'all' : r.method.toLowerCase()}('${r.path}', handler)`);

  const RM_STATUS = {
    match: ['ok', '✓', 'Answers: first match'],
    shadowed: ['skip', '↷', 'Would match, but never runs'],
    method: ['bad', '✗', 'Wrong method'],
    path: ['bad', '✗', 'Path does not match'],
    mount: ['bad', '✗', 'Not under the mount path'],
    invalid: ['warn', '!', 'Invalid pattern'],
    decode: ['warn', '!', 'Error 400: broken %-escape'],
    error: ['skip', '↷', 'Skipped: an error is pending'],
  };

  function rmResultHtml(k) {
    if (!rmMatch || rmMatch.url.error) return '';
    const res = rmMatch.results[k];
    if (!res) return '';
    const [cls, sym, label] = RM_STATUS[res.status] || RM_STATUS.path;
    return `<p class="rm-res is-${cls}"><span class="rm-sym" aria-hidden="true">${sym}</span><span><strong>${esc(t(label))}.</strong> ${md(t(res.text))}</span></p>`;
  }

  function routesHtml() {
    const st = rmState();
    return st.routes.map((r, k) => `<li class="rm-route">
        <span class="rm-n" aria-hidden="true">${k + 1}</span>
        <div class="rm-fields" role="group" aria-label="${esc(t('Route {n}', { n: k + 1 }))}">
          ${Tools.select({ label: t('Method'), fid: `rm-m-${k}`, options: RM_METHODS, current: r.method, data: { rm: 'method', k } })}
          <div class="tl-field rm-mountf"><label for="rm-mount-${k}">${esc(t('Router mount (optional)'))}</label>
            <input id="rm-mount-${k}" class="tl-input" data-rm="mount" data-k="${k}" data-fid="rm-mount-${k}" value="${esc(r.mount)}" placeholder="${esc(t('none: app.METHOD'))}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
          <div class="tl-field rm-pathf"><label for="rm-path-${k}">${esc(t('Path pattern'))}</label>
            <input id="rm-path-${k}" class="tl-input" data-rm="path" data-k="${k}" data-fid="rm-path-${k}" value="${esc(r.path)}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
          <span class="rm-btns">
            <button type="button" class="btn ghost small-btn" data-action="rm-up" data-v="${k}" data-fid="rm-up-${k}"${k === 0 ? ' disabled' : ''}><span aria-hidden="true">↑</span><span class="sr-only">${esc(t('Move route {n} up', { n: k + 1 }))}</span></button>
            <button type="button" class="btn ghost small-btn" data-action="rm-down" data-v="${k}" data-fid="rm-down-${k}"${k === st.routes.length - 1 ? ' disabled' : ''}><span aria-hidden="true">↓</span><span class="sr-only">${esc(t('Move route {n} down', { n: k + 1 }))}</span></button>
            <button type="button" class="btn ghost small-btn" data-action="rm-del" data-v="${k}" data-fid="rm-del-${k}"${st.routes.length <= 1 ? ' disabled' : ''}><span aria-hidden="true">✕</span><span class="sr-only">${esc(t('Remove route {n}', { n: k + 1 }))}</span></button>
          </span>
        </div>
        <div data-part="rm-r${k}">${rmResultHtml(k)}</div>
      </li>`).join('');
  }

  function reqTable(m) {
    const st = rmState();
    const q = m.req;
    const rows = [
      ['req.method', st.method],
      ['req.originalUrl', q.originalUrl],
      ['req.baseUrl', q.baseUrl === '' ? '""' : q.baseUrl],
      ['req.path', q.path],
      ['req.params', jsonish(q.params).replace(/^undefined$/, '{}')],
      ['req.query', jsonish(q.query)],
    ];
    const optional = Object.entries(q.params).filter(([, v]) => v === undefined).map(([k2]) => k2);
    return `<div class="scroll"><table class="src rm-req"><caption>${esc(t('What the handler sees'))}</caption>
        <tbody>${rows.map(([k2, v]) => `<tr><th scope="row"><code>${esc(k2)}</code></th><td><code>${esc(v)}</code></td></tr>`).join('')}</tbody></table></div>
      ${optional.length ? `<p class="muted small">${md(t('`req.params.{k}` is `undefined`: the optional segment is missing.', { k: optional[0] }))}</p>` : ''}
      ${Object.keys(q.mountParams || {}).length ? `<p class="tl-explain">${md(t('The mount path captured {p}, but the router does not see it in `req.params`: create it with `express.Router({ mergeParams: true })` to merge the parent\'s params.', { p: Object.entries(q.mountParams).map(([k2, v]) => `\`${k2}: "${v}"\``).join(', ') }))}</p>` : ''}`;
  }

  function rmOutHtml() {
    const m = rmMatch;
    const st = rmState();
    if (!m) return '';
    if (m.url.error) return `<p class="tl-bad" role="alert">${esc(t(m.url.error))}</p>`;
    const notes = [];
    if (m.url.notes.includes('origin')) notes.push(t('The scheme and host are not part of routing: Express only sees the path and the query string.'));
    if (m.url.notes.includes('fragment')) notes.push(t('The `#fragment` is never sent to the server, so routes never see it.'));
    let verdict;
    if (m.winner !== -1) {
      const r = st.routes[m.winner];
      verdict = `<p class="rm-verdict is-ok">${ICON.ok}<span>${md(t('Route {n} answers: `{code}`{mount}.', { n: m.winner + 1, code: routeCode(r), mount: r.mount ? t(' in the router mounted at `{m}`', { m: r.mount }) : '' }))}</span></p>${reqTable(m)}`;
    } else if (m.status === 400) {
      verdict = `<p class="rm-verdict is-bad">${ICON.bad}<span>${md(t('**400 Bad Request**: {e}.', { e: m.decodeError }))}</span></p>`;
    } else {
      const wrongMethod = m.results.some((x) => x.status === 'method');
      verdict = `<p class="rm-verdict is-bad">${ICON.bad}<span>${md(t('No route matches: Express answers **404** with `Cannot {m} {p}`.', { m: st.method, p: m.url.pathname }))}</span></p>
        ${wrongMethod ? `<p class="tl-explain">${md(t('A route matches the path with another method, yet the answer is still 404: Express does not send `405 Method Not Allowed` on its own.'))}</p>` : ''}`;
    }
    const code = st.routes.some((r) => r.mount)
      ? [...new Set(st.routes.filter((r) => r.mount).map((r) => r.mount))].map((mt) => `const router = express.Router();   // mounted at ${mt}\n${st.routes.filter((r) => r.mount === mt).map(routeCode).join('\n')}\napp.use('${mt}', router);`).join('\n\n')
      : '';
    const plain = st.routes.filter((r) => !r.mount).map(routeCode).join('\n');
    return `${verdict}
      ${notes.map((n) => `<p class="muted small">${md(n)}</p>`).join('')}
      <details class="rm-code" data-fid="rm-code"><summary>${esc(t('The same routes as Express code'))}</summary><pre><code>${esc([plain, code].filter(Boolean).join('\n\n'))}</code></pre>
        <p class="muted small">${esc(t('Rows are tried in the order of the list. Rows with a mount path are shown grouped by router.'))}</p></details>
      <details class="rm-regex" data-fid="rm-regex"><summary>${esc(t('Under the hood: the regular expression Express builds'))}</summary>
        <ul class="plain rm-regexes">${st.routes.map((r, k) => {
          if (EE.checkPattern(r.path)) return '';
          const re = r.path === '*' ? '(any path)' : `/${EE.compile(r.path).re.source}/i`;
          return `<li><span class="muted">${k + 1}.</span> <code>${esc(r.path)}</code> → <code>${esc(re)}</code></li>`;
        }).join('')}</ul>
        <p class="muted small">${md(t('Each `:name` becomes a group that captures one segment (`[^/]+?`); `\\/?$` makes the trailing slash optional and the `i` flag ignores case.'))}</p></details>`;
  }

  function rmGoalHtml() {
    const c = rmChallenge();
    const st = rmState();
    if (!c) {
      const p = EE.RT_PRESETS.find((x) => x.id === st.preset);
      return `<div class="tl-goal rm-goal">
          <div class="tl-row">
            ${Tools.select({ label: t('Example'), fid: 'rm-preset', options: EE.RT_PRESETS.map((x) => [x.id, t(x.title)]), current: st.preset, data: { rm: 'preset' } })}
            <button type="button" class="btn ghost small-btn" data-action="rm-reset" data-fid="rm-reset">${esc(t('Reset'))}</button>
          </div>
          <p>${md(t(p.note))}</p>
        </div>`;
    }
    const done = rmStore.isSolved(c.id);
    return `<div class="tl-goal rm-goal${done ? ' is-solved' : ''}">
        <p class="mp-goal-title"><strong>${esc(t(c.title))}</strong>${done ? ` <span class="mp-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        <p class="mp-goal-actions">
          <button type="button" class="btn ghost small-btn" data-action="rm-hint" data-fid="rm-hint" aria-expanded="${!!st.hint}">${esc(st.hint ? t('Hide hint') : t('Show hint'))}</button>
          <button type="button" class="btn ghost small-btn" data-action="rm-reset" data-fid="rm-reset">${esc(t('Restart challenge'))}</button>
        </p>
        ${st.hint ? `<p class="mp-hint">${md(t(c.hint))}</p>` : ''}
        ${rmJustSolved ? `<p class="mp-solved">${ICON.ok}<span>${esc(rmJustSolved)}</span></p>` : ''}
      </div>`;
  }

  function rmBody() {
    if (!rmMatch) rmExecute(null);
    const st = rmState();
    const cur = rmCurrentMode();
    return `<div class="rm">
        ${Tools.challengePicker({ list: RTC, current: cur === 'free' ? 'free' : RTC.findIndex((c) => c.id === cur), store: rmStore, action: 'rm-mode', label: t('Route challenges'), free: { value: 'free', label: t('Examples') } })}
        <div data-part="rm-goal">${rmGoalHtml()}</div>
        <h4 class="tl-sub">${esc(t('Request'))}</h4>
        <div class="tl-row rm-reqrow">
          ${Tools.select({ label: t('Method'), fid: 'rm-method', options: [...EE.METHODS, 'HEAD'], current: st.method, data: { rm: 'reqmethod' } })}
          <div class="tl-field rm-urlf"><label for="rm-url">${esc(t('URL (path and query string)'))}</label>
            <input id="rm-url" class="tl-input" data-rm="url" data-fid="rm-url" value="${esc(st.url)}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
        </div>
        <div data-part="rm-out" class="rm-out">${rmOutHtml()}</div>
        <h4 class="tl-sub">${esc(t('Routes, in registration order'))}</h4>
        <ol class="rm-routes">${routesHtml()}</ol>
        <p><button type="button" class="btn ghost small-btn" data-action="rm-add" data-fid="rm-add">${esc(t('Add a route'))}</button>
          <span class="muted small">${md(t('Supported: literal segments, `:name`, `:name?` (optional) and `*` (Express 4 syntax).'))}</span></p>
      </div>`;
  }

  function rmSummary() {
    const st = rmState();
    const m = rmMatch;
    if (!m || m.url.error) return m ? m.url.error : '';
    if (m.winner !== -1) return t('{m} {u} → route {n} ({p}); params {params}', { m: st.method, u: st.url, n: m.winner + 1, p: st.routes[m.winner].path, params: jsonish(m.req.params) });
    return t('{m} {u} → no route matches: 404', { m: st.method, u: st.url });
  }

  function rmRerun(root, all) {
    const solved = rmExecute(root);
    if (all) Tools.refresh('route-matcher');
    else {
      const parts = { 'rm-out': rmOutHtml, 'rm-goal': rmGoalHtml };
      rmState().routes.forEach((r, k) => { parts[`rm-r${k}`] = () => rmResultHtml(k); });
      keepFocus(() => Tools.paint(root, parts));
    }
    Tools.say(root, [rmSummary(), solved].filter(Boolean).join(' — '));
  }

  Tools.register('route-matcher', {
    title: 'Route matcher',
    intro: 'Express compares the method and the path of a request with each route, in the order the routes were registered, and the first match answers. Edit the routes and the URL to see which one wins, and why the others lose.',
    body: rmBody,
    onClick(el, root) {
      const st = rmState();
      const a = el.dataset.action;
      const k = Number(el.dataset.v);
      if (a === 'rm-mode') {
        rmMode = el.dataset.v === 'free' ? 'free' : RTC[k].id;
        rmMatch = null;
        rmExecute(null);
        rmJustSolved = '';
        Tools.refresh('route-matcher');
        Tools.say(root, `${rmChallenge() ? t(rmChallenge().title) : t('Examples')}. ${rmSummary()}`);
        return;
      }
      if (a === 'rm-up' || a === 'rm-down') {
        const j = a === 'rm-up' ? k - 1 : k + 1;
        if (j < 0 || j >= st.routes.length) return;
        [st.routes[k], st.routes[j]] = [st.routes[j], st.routes[k]];
        rmRerun(root, true);
        const target = root.querySelector(`[data-fid="${a}-${j}"]`);
        const fallback = root.querySelector(`[data-fid="${a === 'rm-up' ? 'rm-down' : 'rm-up'}-${j}"]`);
        if (target && !target.disabled) target.focus({ preventScroll: true });
        else if (fallback) fallback.focus({ preventScroll: true });
        return;
      }
      if (a === 'rm-del') {
        if (st.routes.length <= 1) return;
        st.routes.splice(k, 1);
        rmRerun(root, true);
        const next = root.querySelector(`[data-fid="rm-path-${Math.min(k, st.routes.length - 1)}"]`);
        if (next) next.focus({ preventScroll: true });
        return;
      }
      if (a === 'rm-add') {
        st.routes.push({ method: 'GET', mount: '', path: '/' });
        rmRerun(root, true);
        const input = root.querySelector(`[data-fid="rm-path-${st.routes.length - 1}"]`);
        if (input) input.focus({ preventScroll: true });
        return;
      }
      if (a === 'rm-hint') { st.hint = !st.hint; keepFocus(() => Tools.paint(root, { 'rm-goal': rmGoalHtml })); return; }
      if (a === 'rm-reset') {
        const c = rmChallenge();
        rmStates[rmCurrentMode()] = c ? rmFresh(c.preset, c) : rmFresh(st.preset);
        rmRerun(root, true);
      }
    },
    onChange(e, root) {
      const el = e.target;
      const st = rmState();
      if (el.dataset.rm === 'preset') { rmStates.free = rmFresh(el.value); rmRerun(root, true); }
      else if (el.dataset.rm === 'method') { st.routes[+el.dataset.k].method = el.value; rmRerun(root, false); }
      else if (el.dataset.rm === 'reqmethod') { st.method = el.value; rmRerun(root, false); }
    },
    onInput(e, root) {
      const el = e.target;
      const st = rmState();
      const k = el.dataset.rm;
      if (k === 'url') st.url = el.value;
      else if (k === 'mount' || k === 'path') st.routes[+el.dataset.k][k] = el.value.trim();
      else return;
      rmRerun(root, false);
    },
    challenges: { store: rmStore, label: 'Route challenges', ids: () => RTC.map((c) => c.id) },
  });
})();
