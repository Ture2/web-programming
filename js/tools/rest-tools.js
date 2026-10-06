'use strict';

/* ==========================================================================
   Designing APIs tools (REST over HTTP as the worked example).

   api-builder     a request builder against an in-browser mock REST API (no
                   network: js/tools/mock-api-engine.js is the fake server).
                   Method, path + query string, editable headers with presets,
                   JSON body → raw request and response, "why this status" with
                   the checks the server ran, the same request as curl and
                   fetch(), the in-memory rows and a history. Challenges:
                   challengeStore 'api-challenges-v1' (MockApiEngine.CHALLENGES).
   status-chooser  short API situations; pick the status code. Feedback explains
                   the right code and the tempting wrong one. Scenarios come from
                   REST_STATUS_SCENARIOS (data/<lang>/rest.js); solved ones are
                   kept in challengeStore 'status-challenges-v1'.
   ========================================================================== */

(() => {
  const E = MockApiEngine;
  const reason = (code) => E.REASON[code] || '';

  /* ======================================================================
     1. API request builder
     ====================================================================== */

  const apiStore = challengeStore('api-challenges-v1');
  const CHALLENGES = E.CHALLENGES;
  const MAX_LOG = 40;
  const MAX_HISTORY = 8;
  const JSON_CT = ['Content-Type', 'application/json'];
  const HEADER_PRESETS = [JSON_CT, ['Accept', 'application/json'], ['Authorization', 'Bearer admin-token'], ['Authorization', 'Bearer student-token']];
  const EXAMPLES = [
    { id: 'list', label: 'List tasks', method: 'GET', path: '/api/tasks', headers: [['Accept', 'application/json']] },
    { id: 'one', label: 'Read task 1', method: 'GET', path: '/api/tasks/1', headers: [['Accept', 'application/json']] },
    { id: 'create', label: 'Create a task', method: 'POST', path: '/api/tasks', headers: [JSON_CT], body: '{\n  "title": "Study REST"\n}' },
    { id: 'patch', label: 'Change one field (PATCH)', method: 'PATCH', path: '/api/tasks/2', headers: [JSON_CT], body: '{\n  "done": true\n}' },
    { id: 'put', label: 'Replace a task (PUT)', method: 'PUT', path: '/api/tasks/3', headers: [JSON_CT], body: '{\n  "title": "Return the right status codes",\n  "done": true\n}' },
    { id: 'delete', label: 'Delete a task', method: 'DELETE', path: '/api/tasks/4', headers: [] },
    { id: 'filter', label: 'Filter and sort', method: 'GET', path: '/api/tasks?done=false&sort=createdAt&order=desc', headers: [['Accept', 'application/json']] },
    { id: 'page', label: 'First page of 2', method: 'GET', path: '/api/tasks?page=1&limit=2', headers: [['Accept', 'application/json']] },
    { id: 'nested', label: 'Tasks of user 2 (nested)', method: 'GET', path: '/api/users/2/tasks', headers: [['Accept', 'application/json']] },
    { id: 'users', label: 'List users (DTOs)', method: 'GET', path: '/api/users', headers: [['Accept', 'application/json']] },
    { id: 'user', label: 'Create a user (admin)', method: 'POST', path: '/api/users', headers: [JSON_CT, ['Authorization', 'Bearer admin-token']], body: '{\n  "name": "Iris Vega",\n  "email": "iris@example.com",\n  "password": "longpassword"\n}' },
    { id: 'invalid', label: 'Invalid body', method: 'POST', path: '/api/tasks', headers: [JSON_CT], body: '{\n  "title": "",\n  "done": "yes"\n}' },
  ];

  let hid = 0;
  const hrow = ([name, value]) => ({ k: ++hid, name, value });

  const ab = {
    state: E.createState(),
    method: 'GET',
    path: '/api/tasks',
    headers: [hrow(['Accept', 'application/json'])],
    body: '',
    example: '',
    last: null,        // the last entry (result of MockApiEngine.request)
    diff: null,        // { tasks: { id: 'new' | 'changed' }, users: {…}, gone: [] }
    log: [],           // every entry, oldest first (challenge checks look back)
    mode: null,        // challenge id or 'free'
    hint: false,
    solved: '',
  };

  const findChallenge = (id) => CHALLENGES.find((c) => c.id === id) || null;
  function currentMode() {
    if (ab.mode && (ab.mode === 'free' || findChallenge(ab.mode))) return ab.mode;
    const next = CHALLENGES.find((c) => !apiStore.isSolved(c.id));
    ab.mode = next ? next.id : 'free';
    return ab.mode;
  }

  /* Which rows the last request added or changed (compared by value), and which it removed. */
  function diffState(before, after) {
    const side = (a, b) => {
      const out = {};
      b.forEach((row) => {
        const old = a.find((r) => r.id === row.id);
        if (!old) out[row.id] = 'new';
        else if (JSON.stringify(old) !== JSON.stringify(row)) out[row.id] = 'changed';
      });
      return out;
    };
    const gone = [
      ...before.tasks.filter((r) => !after.tasks.some((x) => x.id === r.id)).map((r) => t('task {id}', { id: r.id })),
      ...before.users.filter((r) => !after.users.some((x) => x.id === r.id)).map((r) => t('user {id}', { id: r.id })),
    ];
    return { tasks: side(before.tasks, after.tasks), users: side(before.users, after.users), gone };
  }

  /* ---- Rendering ---------------------------------------------------------------- */

  function message(kind, raw) {
    const isReq = kind === 'req';
    return `<div class="hx-msg hx-${kind}">
        <p class="hx-title">${esc(isReq ? t('Request (client → server)') : t('Response (server → client)'))}</p>
        <div class="hx-raw" role="group" aria-label="${esc(isReq ? t('Raw request') : t('Raw response'))}">
          <div class="hx-part hx-first"><pre>${esc(raw.first)}</pre><span class="hx-tag">${esc(isReq ? t('Request line') : t('Status line'))}</span></div>
          <div class="hx-part hx-headers"><pre>${raw.headers.length ? raw.headers.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('\n') : `<span class="muted">${esc(t('(no headers)'))}</span>`}</pre><span class="hx-tag">${esc(t('Headers'))}</span></div>
          <div class="hx-part hx-blank"><pre> </pre><span class="hx-tag">${esc(t('Blank line'))}</span></div>
          <div class="hx-part hx-body"><pre>${raw.body ? esc(raw.body) : `<span class="muted">${esc(t('(no body)'))}</span>`}</pre><span class="hx-tag">${esc(t('Body'))}</span></div>
        </div>
      </div>`;
  }

  function modesHtml() {
    const cur = currentMode();
    return Tools.challengePicker({ list: CHALLENGES, current: cur === 'free' ? 'free' : CHALLENGES.findIndex((c) => c.id === cur), store: apiStore, action: 'ab-mode', label: t('API challenges'), free: { value: 'free', label: t('Free play') } });
  }

  function goalHtml() {
    const id = currentMode();
    if (id === 'free') {
      return `<div class="tl-goal"><p><strong>${esc(t('Free play'))}</strong></p>
          <p>${md(t('Send any request to the mock API. It knows `/api/tasks`, `/api/tasks/:id`, `/api/users`, `/api/users/:id` and `/api/users/:id/tasks`. Creating or deleting users needs `Authorization: Bearer admin-token`.'))}</p></div>`;
    }
    const c = findChallenge(id);
    const k = CHALLENGES.indexOf(c);
    const done = apiStore.isSolved(id);
    return `<div class="tl-goal ab-goal">
        <p class="ab-goal-title"><strong>${esc(t('Challenge {n} of {total}: {title}', { n: k + 1, total: CHALLENGES.length, title: t(c.title) }))}</strong>${done ? ` <span class="ab-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        <p class="ab-goal-actions"><button type="button" class="btn ghost small-btn" data-action="ab-hint" data-fid="ab-hint" aria-expanded="${ab.hint}">${esc(ab.hint ? t('Hide hint') : t('Show hint'))}</button></p>
        ${ab.hint ? `<p class="ab-hint">${md(t(c.hint))}</p>` : ''}
        ${ab.solved && ab.solved === id ? `<p class="ab-solved" role="status">${Tools.statusHtml({ ok: true, okText: t('Challenge solved!'), next: k + 1 < CHALLENGES.length ? { action: 'ab-mode', v: k + 1, label: t('Next challenge') } : null })}</p>` : ''}
      </div>`;
  }

  function headersHtml() {
    const rows = ab.headers.map((h) => `<div class="ab-hrow">
        <label class="sr-only" for="ab-hn-${h.k}">${esc(t('Header name'))}</label>
        <input id="ab-hn-${h.k}" class="tl-input ab-hname" data-ab-h="name" data-k="${h.k}" data-fid="ab-hn-${h.k}" value="${esc(h.name)}" placeholder="Name" spellcheck="false" autocomplete="off">
        <span class="ab-colon" aria-hidden="true">:</span>
        <label class="sr-only" for="ab-hv-${h.k}">${esc(t('Value of {name}', { name: h.name || t('this header') }))}</label>
        <input id="ab-hv-${h.k}" class="tl-input ab-hvalue" data-ab-h="value" data-k="${h.k}" data-fid="ab-hv-${h.k}" value="${esc(h.value)}" placeholder="value" spellcheck="false" autocomplete="off">
        <button type="button" class="btn ghost small-btn" data-action="ab-hdel" data-v="${h.k}" data-fid="ab-hdel-${h.k}">${esc(t('Remove'))}<span class="sr-only"> ${esc(h.name || t('header'))}</span></button>
      </div>`).join('');
    return `<fieldset class="ab-headers">
        <legend>${esc(t('Headers'))}</legend>
        ${rows || `<p class="muted small ab-nohdr">${esc(t('No headers. A body needs Content-Type; protected routes need Authorization.'))}</p>`}
        <div class="ab-hpresets" role="group" aria-label="${esc(t('Add a header'))}">
          ${HEADER_PRESETS.map(([k, v], i) => `<button type="button" class="tl-chip" data-action="ab-hpreset" data-v="${i}" data-fid="ab-hp-${i}">+ ${esc(`${k}: ${v}`)}</button>`).join('')}
          <button type="button" class="tl-chip" data-action="ab-hadd" data-fid="ab-hadd">${esc(t('+ empty header'))}</button>
        </div>
      </fieldset>`;
  }

  function stateHtml() {
    const s = ab.state;
    const d = ab.diff || { tasks: {}, users: {}, gone: [] };
    const flag = (map, id) => (map[id] ? ` <span class="ab-flag">${esc(map[id] === 'new' ? t('new') : t('changed'))}</span>` : '');
    const cls = (map, id) => (map[id] ? ' class="is-hit"' : '');
    const val = (v) => (v === null ? '<span class="muted">null</span>' : esc(String(v)));
    const tasks = `<div class="scroll" tabindex="0" role="region" aria-label="${esc(t('tasks table (scrolls sideways)'))}"><table class="src ab-table"><caption>${esc(t('tasks: {n} rows', { n: s.tasks.length }))}</caption>
        <thead><tr><th scope="col">id</th><th scope="col">title</th><th scope="col">done</th><th scope="col">user_id</th><th scope="col">created_at</th></tr></thead>
        <tbody>${s.tasks.map((r) => `<tr${cls(d.tasks, r.id)}><th scope="row">${r.id}${flag(d.tasks, r.id)}</th><td>${esc(r.title)}</td><td>${val(r.done)}</td><td>${val(r.user_id)}</td><td><code>${esc(r.created_at)}</code></td></tr>`).join('') || `<tr><td colspan="5" class="muted">${esc(t('(empty)'))}</td></tr>`}</tbody></table></div>`;
    const users = `<div class="scroll" tabindex="0" role="region" aria-label="${esc(t('users table (scrolls sideways)'))}"><table class="src ab-table"><caption>${esc(t('users: {n} rows', { n: s.users.length }))}</caption>
        <thead><tr><th scope="col">id</th><th scope="col">name</th><th scope="col">email</th><th scope="col">password_hash</th><th scope="col">role</th><th scope="col">created_at</th><th scope="col">is_deleted</th></tr></thead>
        <tbody>${s.users.map((r) => `<tr${cls(d.users, r.id)}><th scope="row">${r.id}${flag(d.users, r.id)}</th><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td><code>${esc(`${r.password_hash.slice(0, 14)}…`)}</code></td><td>${esc(r.role)}</td><td><code>${esc(r.created_at)}</code></td><td>${val(r.is_deleted)}</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="ab-state" aria-labelledby="ab-state-h">
        <div class="ab-state-head">
          <h4 class="tl-sub" id="ab-state-h">${esc(t('Server state: the rows in memory'))}</h4>
          <button type="button" class="btn ghost small-btn" data-action="ab-reset" data-fid="ab-reset">${esc(t('Reset the data'))}</button>
        </div>
        <p class="muted small">${md(t('Stored like database rows (snake_case, `password_hash`, `is_deleted`). Responses never show them as they are: every row goes through a DTO mapping first.'))}</p>
        ${d.gone.length ? `<p class="small">${md(t('Removed by the last request: {list}.', { list: d.gone.join(', ') }))}</p>` : ''}
        ${tasks}
        ${users}
      </section>`;
  }

  function historyHtml() {
    const list = ab.log.slice(-MAX_HISTORY).reverse();
    if (!list.length) return '';
    const start = ab.log.length - 1;
    return `<section class="ab-history" aria-labelledby="ab-hist-h">
        <h4 class="tl-sub" id="ab-hist-h">${esc(t('History'))}</h4>
        <ol class="ab-hist" reversed>${list.map((e, i) => `<li><button type="button" class="tl-chip ab-hbtn" data-action="ab-replay" data-v="${start - i}" data-fid="ab-replay-${start - i}"><span class="sr-only">${esc(t('Load into the form:'))} </span><code>${esc(`${e.req.method} ${e.req.target}`)}</code> → <strong>${e.res.status}</strong></button></li>`).join('')}</ol>
      </section>`;
  }

  function exchangeHtml() {
    const e = ab.last;
    if (!e) {
      return `<p class="tl-explain ab-empty">${md(t('Nothing sent yet. Build a request above (or pick an example) and press **Send**. The fake server runs in this page; nothing goes over the network.'))}</p>`;
    }
    const fam = Math.floor(e.res.status / 100);
    const famText = { 2: t('success'), 4: t('client error'), 5: t('server error') }[fam] || '';
    return `<div class="ab-result">
        <p class="ab-status ab-f${fam}"><span class="ab-code">${e.res.status}</span> ${esc(e.res.reason)} <span class="ab-fam">· ${esc(`${fam}xx ${famText}`)}</span></p>
        <div class="tl-cols hx-pair">
          ${message('req', E.rawRequest(e.req))}
          ${message('res', E.rawResponse(e.res))}
        </div>
        <div class="tl-explain ab-why">
          <p><strong>${esc(t('Why this status'))}</strong> ${md(e.why)}</p>
          <p class="ab-checks-h">${esc(t('The checks the server ran, in order:'))}</p>
          <ul class="checks">${e.trace.map(checkItem).join('')}${e.notes.map((n) => checkItem({ status: 'note', text: n })).join('')}</ul>
        </div>
        <details class="ab-code-d" data-fid="ab-curl-d">
          <summary>${esc(t('The same request with curl'))}</summary>
          <pre class="tl-out">${esc(E.curl(e.req))}</pre>
          <p class="muted small">${md(t('Bash, Git Bash, macOS and Linux. In Windows PowerShell type `curl.exe`, and see the curl card for quoting.'))}</p>
        </details>
        <details class="ab-code-d" data-fid="ab-fetch-d">
          <summary>${esc(t('The same request with fetch()'))}</summary>
          <pre class="tl-out">${esc(E.fetchCode(e.req, e.res))}</pre>
        </details>
      </div>`;
  }

  function apiBody() {
    const isBodyMethod = ab.method === 'POST' || ab.method === 'PUT' || ab.method === 'PATCH';
    return `<div class="ab">
        ${modesHtml()}
        ${goalHtml()}
        <div class="ab-form">
          <div class="tl-row ab-line">
            ${Tools.seg({ label: t('Method'), action: 'ab-method', prop: 'method', values: E.METHODS, current: ab.method, fid: 'ab-m' })}
            <div class="tl-field ab-urlf">
              <label for="ab-path">${esc(t('Path and query string'))}</label>
              <div class="ab-url"><span class="ab-origin" id="ab-origin">${esc(E.ORIGIN)}</span><input id="ab-path" class="tl-input" data-ab="path" data-fid="ab-path" value="${esc(ab.path)}" aria-describedby="ab-origin" spellcheck="false" autocomplete="off" autocapitalize="off" enterkeyhint="send"></div>
            </div>
          </div>
          ${headersHtml()}
          <div class="tl-field ab-bodyf">
            <label for="ab-body">${esc(t('Body (JSON)'))}</label>
            <textarea id="ab-body" class="tl-code" data-ab="body" data-fid="ab-body" rows="5" spellcheck="false" autocomplete="off" aria-describedby="ab-body-note">${esc(ab.body)}</textarea>
            <p class="muted small" id="ab-body-note">${esc(isBodyMethod ? t('Ctrl+Enter sends. Remember the Content-Type header.') : t('{m} requests carry no body: anything typed here is not sent.', { m: ab.method }))}</p>
          </div>
          <div class="tl-row ab-actions">
            <button type="button" class="btn" data-action="ab-send" data-fid="ab-send">${esc(t('Send'))}</button>
            <button type="button" class="btn ghost" data-action="ab-format" data-fid="ab-format">${esc(t('Format JSON'))}</button>
            ${Tools.select({ label: t('Load an example'), fid: 'ab-ex', options: [['', t('Choose…')], ...EXAMPLES.map((x) => [x.id, t(x.label)])], current: ab.example, data: { ab: 'example' }, cls: 'ab-exf' })}
          </div>
        </div>
        <div class="ab-out">${exchangeHtml()}</div>
        ${historyHtml()}
        ${stateHtml()}
      </div>`;
  }

  /* ---- Actions --------------------------------------------------------------------- */

  function load(req) {
    ab.method = req.method;
    ab.path = req.path;
    ab.headers = (req.headers || []).map(hrow);
    ab.body = req.body || '';
  }

  function send(root) {
    const before = ab.state;
    const entry = E.request(before, { method: ab.method, path: ab.path, headers: ab.headers.map((h) => [h.name, h.value]), body: ab.body });
    const prior = ab.log.slice();
    ab.state = entry.state;
    ab.diff = diffState(before, entry.state);
    ab.last = entry;
    ab.log.push(entry);
    if (ab.log.length > MAX_LOG) ab.log.splice(0, ab.log.length - MAX_LOG);
    ab.solved = '';
    let solvedText = '';
    const id = currentMode();
    const ch = id === 'free' ? null : findChallenge(id);
    if (ch && ch.check(entry, prior) && apiStore.mark(ch.id)) {
      ab.solved = ch.id;
      solvedText = t('Challenge solved! {title}', { title: t(ch.title) });
    }
    Tools.refresh('api-builder');
    Tools.say(root, [`${entry.res.status} ${entry.res.reason}`, entry.res.data && entry.res.data.error ? entry.res.data.error : '', solvedText].filter(Boolean).join('. '));
  }

  function apiClick(el, root) {
    const a = el.dataset.action;
    switch (a) {
      case 'ab-method':
        ab.method = el.dataset.v;
        Tools.refresh('api-builder');
        break;
      case 'ab-send': send(root); break;
      case 'ab-format':
        try {
          ab.body = JSON.stringify(JSON.parse(ab.body), null, 2);
          Tools.refresh('api-builder');
          Tools.say(root, t('Body formatted.'));
        } catch (e) {
          Tools.say(root, t('The body is not valid JSON: {msg}', { msg: e.message }));
        }
        break;
      case 'ab-hdel':
        ab.headers = ab.headers.filter((h) => String(h.k) !== el.dataset.v);
        Tools.refresh('api-builder');
        Tools.say(root, t('Header removed.'));
        break;
      case 'ab-hadd':
        ab.headers.push(hrow(['', '']));
        Tools.refresh('api-builder');
        { const inp = root.querySelector(`#ab-hn-${ab.headers[ab.headers.length - 1].k}`); if (inp) inp.focus(); }
        break;
      case 'ab-hpreset': {
        const [name, value] = HEADER_PRESETS[+el.dataset.v];
        const same = ab.headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
        if (same) same.value = value; else ab.headers.push(hrow([name, value]));
        Tools.refresh('api-builder');
        Tools.say(root, t('Header set: {h}', { h: `${name}: ${value}` }));
        break;
      }
      case 'ab-replay': {
        const e = ab.log[+el.dataset.v];
        if (!e) break;
        load({ method: e.req.method, path: e.req.target, headers: e.req.headers, body: e.req.body });
        Tools.refresh('api-builder');
        Tools.say(root, t('Loaded {r} into the form. Press Send to repeat it.', { r: `${e.req.method} ${e.req.target}` }));
        break;
      }
      case 'ab-reset':
        ab.state = E.createState();
        ab.last = null;
        ab.diff = null;
        ab.log = [];
        Tools.refresh('api-builder');
        Tools.say(root, t('The data is back to the seed rows.'));
        break;
      case 'ab-mode':
        ab.mode = el.dataset.v === 'free' ? 'free' : CHALLENGES[+el.dataset.v].id;
        ab.hint = false;
        ab.solved = '';
        Tools.refresh('api-builder');
        Tools.say(root, ab.mode === 'free' ? t('Free play') : t(findChallenge(ab.mode).title));
        break;
      case 'ab-hint':
        ab.hint = !ab.hint;
        Tools.refresh('api-builder');
        break;
      default: break;
    }
  }

  function apiInput(e) {
    const el = e.target;
    if (el.dataset.ab === 'path') ab.path = el.value;
    else if (el.dataset.ab === 'body') ab.body = el.value;
    else if (el.dataset.abH) {
      const h = ab.headers.find((x) => String(x.k) === el.dataset.k);
      if (h) h[el.dataset.abH] = el.value;
    }
  }

  function apiChange(e, root) {
    if (e.target.dataset.ab !== 'example') return;
    const x = EXAMPLES.find((ex) => ex.id === e.target.value);
    ab.example = '';
    if (!x) return;
    load(x);
    Tools.refresh('api-builder');
    Tools.say(root, t('Example loaded: {r}. Press Send.', { r: `${x.method} ${x.path}` }));
  }

  function apiKeydown(e, root) {
    const el = e.target;
    if (el.id === 'ab-body') { codeEditorKeydown(e, () => send(root)); return; }
    if (e.key === 'Enter' && (el.id === 'ab-path' || el.dataset.abH)) { e.preventDefault(); send(root); }
  }

  Tools.register('api-builder', {
    title: 'API request builder',
    intro: 'Send requests to a mock REST API that runs in this page: choose the method, path, headers and JSON body, and read the full response, why the server chose that status, and the same request as curl and fetch(). Solve the challenges, or explore in free play.',
    body: apiBody,
    onClick: apiClick,
    onInput: apiInput,
    onChange: apiChange,
    onKeydown: apiKeydown,
    challenges: { store: apiStore, label: 'REST API challenges', ids: () => CHALLENGES.map((c) => c.id) },
  });

  /* ======================================================================
     2. Status-code chooser
     ====================================================================== */

  const scStore = challengeStore('status-challenges-v1');
  const SCENARIOS = langData('REST_STATUS_SCENARIOS', []);
  const sc = { k: null, picks: {}, reveal: {} };   // picks: id → codes chosen, in order

  function scIndex() {
    if (sc.k !== null && SCENARIOS[sc.k]) return sc.k;
    const next = SCENARIOS.findIndex((s) => !scStore.isSolved(s.id));
    sc.k = next < 0 ? 0 : next;
    return sc.k;
  }

  function feedbackHtml(s) {
    const picks = sc.picks[s.id] || [];
    const lastPick = picks[picks.length - 1];
    const right = picks.includes(s.answer);
    if (right) {
      const k = scIndex();
      return `<div class="sc-feedback is-ok">
          <p>${ICON.ok}<span><strong>${esc(t('Right.'))}</strong> ${md(t(s.why))}</span></p>
          <p class="sc-trap">${md(t('The tempting wrong answer, **{code} {reason}**: {why}', { code: s.trap, reason: reason(s.trap), why: t(s.wrong[s.trap]) }))}</p>
          ${k + 1 < SCENARIOS.length ? `<p><button type="button" class="btn small-btn" data-action="sc-go" data-v="${k + 1}" data-fid="sc-next">${esc(t('Next scenario'))}</button></p>` : `<p>${esc(t('That was the last scenario.'))}</p>`}
        </div>`;
    }
    if (sc.reveal[s.id]) {
      return `<div class="sc-feedback">
          <p>${ICON.note}<span><strong>${esc(t('The answer: {code} {reason}.', { code: s.answer, reason: reason(s.answer) }))}</strong> ${md(t(s.why))}</span></p>
          <p class="muted small">${esc(t('Press it to count the scenario as solved.'))}</p>
        </div>`;
    }
    if (lastPick !== undefined) {
      return `<div class="sc-feedback is-bad">
          <p>${ICON.bad}<span><strong>${esc(t('Not {code} {reason}.', { code: lastPick, reason: reason(lastPick) }))}</strong> ${md(t(s.wrong[lastPick] || ''))}</span></p>
          <p><button type="button" class="btn ghost small-btn" data-action="sc-reveal" data-fid="sc-reveal">${esc(t('Show the answer'))}</button></p>
        </div>`;
    }
    return '';
  }

  function scBody() {
    if (!SCENARIOS.length) return `<p class="muted">${esc(t('No scenarios available.'))}</p>`;
    const k = scIndex();
    const s = SCENARIOS[k];
    const picks = sc.picks[s.id] || [];
    const solved = scStore.isSolved(s.id);
    const count = scStore.count(SCENARIOS.map((x) => x.id));
    return `<div class="sc">
        <p class="sc-count">${esc(t('Solved {n} of {total}', { n: count, total: SCENARIOS.length }))}</p>
        ${Tools.challengePicker({ list: SCENARIOS, current: k, store: scStore, action: 'sc-go', label: t('Scenarios') })}
        <div class="tl-goal sc-scn">
          <p class="sc-title"><strong>${esc(t('Scenario {n}: {title}', { n: k + 1, title: t(s.title) }))}</strong>${solved ? ` <span class="ab-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
          <p>${md(t(s.text))}</p>
          ${s.request ? `<pre class="tl-out sc-req" aria-label="${esc(t('The request'))}">${esc(s.request)}</pre>` : ''}
        </div>
        <p class="sc-q" id="sc-q">${esc(t('Which status code should the API answer?'))}</p>
        <div class="sc-choices" role="group" aria-labelledby="sc-q">
          ${s.choices.map((code) => {
            const tried = picks.includes(code);
            const mark = tried ? (code === s.answer ? 'is-right' : 'is-wrong') : '';
            const srMark = tried ? (code === s.answer ? t('(right)') : t('(not this one)')) : '';
            return `<button type="button" class="sc-choice ${mark}" data-action="sc-pick" data-v="${code}" data-fid="sc-c-${code}">
                <span class="sc-code">${code}</span> <span class="sc-reason">${esc(reason(code))}</span>${tried ? ` <span class="sc-mark" aria-hidden="true">${code === s.answer ? '✓' : '✗'}</span><span class="sr-only"> ${esc(srMark)}</span>` : ''}
              </button>`;
          }).join('')}
        </div>
        <div data-part="sc-fb">${feedbackHtml(s)}</div>
      </div>`;
  }

  function scClick(el, root) {
    const a = el.dataset.action;
    if (a === 'sc-go') {
      sc.k = Math.max(0, Math.min(SCENARIOS.length - 1, +el.dataset.v));
      Tools.refresh('status-chooser');
      const s = SCENARIOS[sc.k];
      Tools.say(root, t('Scenario {n}: {title}. {text}', { n: sc.k + 1, title: t(s.title), text: t(s.text) }));
      const first = root.querySelector('.sc-choice');
      if (el.dataset.fid === 'sc-next' && first) first.focus();
      return;
    }
    const s = SCENARIOS[scIndex()];
    if (a === 'sc-pick') {
      const code = +el.dataset.v;
      const list = sc.picks[s.id] || (sc.picks[s.id] = []);
      if (!list.includes(code)) list.push(code);
      else { list.splice(list.indexOf(code), 1); list.push(code); }
      let text;
      if (code === s.answer) {
        scStore.mark(s.id);
        text = `${t('Right.')} ${t(s.why)}`;
      } else {
        text = `${t('Not {code} {reason}.', { code, reason: reason(code) })} ${t(s.wrong[code] || '')}`;
      }
      Tools.refresh('status-chooser');
      Tools.say(root, text.replace(/\*\*|`/g, ''));
    } else if (a === 'sc-reveal') {
      sc.reveal[s.id] = true;
      Tools.refresh('status-chooser');
      Tools.say(root, `${t('The answer: {code} {reason}.', { code: s.answer, reason: reason(s.answer) })} ${t(s.why)}`.replace(/\*\*|`/g, ''));
      const btn = root.querySelector(`[data-fid="sc-c-${s.answer}"]`);
      if (btn) btn.focus();
    }
  }

  Tools.register('status-chooser', {
    title: 'Status-code chooser',
    intro: 'Short API situations: pick the status code a well-designed API should answer. Every answer explains the right code and why the tempting one is wrong.',
    body: scBody,
    onClick: scClick,
    challenges: { store: scStore, label: 'Status-code scenarios', ids: () => SCENARIOS.map((s) => s.id) },
  });
})();
