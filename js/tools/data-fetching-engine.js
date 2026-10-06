'use strict';

/* ==========================================================================
   Fetch lab engine (pure, no DOM; also runs in Node: site/test/data-fetching-engine.test.mjs).
   The fetch-lab tool (js/tools/data-fetching-tools.js) runs a small React app against
   the mock API (js/tools/mock-api-engine.js) and draws every request on a timeline.

   FetchLabEngine.latencyFor(path, settings) → ms
     Self-contained (the tool copies its source into the preview frame). The base
     latency, plus, with settings.skew ("slow broad searches"), 250 ms for each
     character a ?search= term is shorter than 6: "s" is slower than "status", as a
     broad search often is on a real server. That is what makes responses arrive
     out of order when someone types fast.
   FetchLabEngine.createTimeline() / applyEvent(timeline, ev) → a NEW timeline
     ev = { type: 'start', id, t, method, path, auth }   a request left
        | { type: 'end', id, t, status, total, count }   a response arrived
        | { type: 'cancel', id, t }                       AbortController cancelled it
        | { type: 'fail', id, t, error }                  network failure (fetch rejected)
   FetchLabEngine.rows(timeline) → [{ id, method, path, query, page, limit, auth, start, end,
     duration, outcome: 'pending' | 'done' | 'cancelled' | 'failed', status, total, count }]
   FetchLabEngine.analyzeRace(rows, finalQuery, shownItems) → { verdict, labels, latest }
     verdict: 'none' | 'pending' | 'latest' (the screen matches the last query)
            | 'stale-won' (an older response arrived last and overwrote it) | 'mismatch'
     labels: { [id]: 'latest' | 'superseded' | 'ignored' | 'won' | 'cancelled' | 'failed' | 'pending' }
   FetchLabEngine.SCENARIOS  [{ id, title, intro, code, settings, typing }]
   FetchLabEngine.CHALLENGES [{ id, title, scenario, goal, hint, check(ctx) }]
     ctx = { scenario, rows, snap, settings, typed }; snap is what the preview shows:
     { text, items, buttons: [{ text, disabled }], alerts, busy, invalid, password, input }
   FetchLabEngine.validateScenario(s) → [problems] (data integrity, for the tests)
   ========================================================================== */

const FetchLabEngine = (() => {
  const DEFAULTS = { latency: 600, skew: false, network: false, server500: false, expired: false };

  /* Kept free of outside references: its source is copied into the preview frame. */
  function latencyFor(path, settings) {
    var base = Math.max(0, Number(settings && settings.latency) || 0);
    if (!settings || !settings.skew) return base;
    var m = String(path).match(/[?&]search=([^&#]*)/);
    if (!m) return base;
    var term = '';
    try { term = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { term = m[1]; }
    return base + Math.max(0, 6 - term.trim().length) * 250;
  }

  /* ---- Query string helpers ------------------------------------------------------------ */

  function params(path) {
    const q = String(path || '').split('?')[1] || '';
    const out = {};
    q.split('&').filter(Boolean).forEach((pair) => {
      const [k, v = ''] = pair.split('=');
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { out[k] = v; }
    });
    return out;
  }

  /* ---- Timeline ------------------------------------------------------------------------- */

  const createTimeline = () => ({ requests: [] });

  function applyEvent(tl, ev) {
    const requests = tl.requests.slice();
    if (!ev || ev.id == null) return { requests };
    const k = requests.findIndex((r) => r.id === ev.id);
    if (ev.type === 'start') {
      if (k >= 0) return { requests };
      requests.push({ id: ev.id, method: String(ev.method || 'GET').toUpperCase(), path: String(ev.path || ''), auth: !!ev.auth, start: Number(ev.t) || 0, end: null, outcome: 'pending', status: null, total: null, count: null });
      return { requests };
    }
    if (k < 0 || requests[k].outcome !== 'pending') return { requests };
    const r = { ...requests[k], end: Number(ev.t) || 0 };
    if (ev.type === 'end') {
      r.outcome = 'done';
      r.status = Number(ev.status) || 0;
      r.total = ev.total == null || ev.total === '' ? null : Number(ev.total);
      r.count = ev.count == null ? null : Number(ev.count);
    } else if (ev.type === 'cancel') r.outcome = 'cancelled';
    else if (ev.type === 'fail') { r.outcome = 'failed'; r.error = String(ev.error || 'Failed to fetch'); } else return { requests };
    requests[k] = r;
    return { requests };
  }

  function rows(tl) {
    return tl.requests.slice().sort((a, b) => a.start - b.start || a.id - b.id).map((r) => {
      const p = params(r.path);
      return {
        ...r,
        query: 'search' in p ? p.search : null,
        page: 'page' in p ? Number(p.page) : null,
        limit: 'limit' in p ? Number(p.limit) : null,
        duration: r.end == null ? null : r.end - r.start,
      };
    });
  }

  const settled = (rs) => rs.every((r) => r.outcome !== 'pending');

  /* Where each bar sits on a common time axis: { from, width } in % of the span. */
  function bars(rs, nowT) {
    if (!rs.length) return { span: 0, list: [] };
    const t0 = Math.min(...rs.map((r) => r.start));
    const t1 = Math.max(nowT == null ? 0 : nowT, ...rs.map((r) => (r.end == null ? r.start : r.end)));
    const span = Math.max(1, t1 - t0);
    return {
      span,
      list: rs.map((r) => {
        const end = r.end == null ? (nowT == null ? r.start : Math.max(r.start, nowT)) : r.end;
        return { id: r.id, from: ((r.start - t0) / span) * 100, width: Math.max(0.8, ((end - r.start) / span) * 100) };
      }),
    };
  }

  /* ---- Races ----------------------------------------------------------------------------- */

  const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

  function analyzeRace(rs, finalQuery, shownItems) {
    const search = rs.filter((r) => r.query !== null && r.method === 'GET');
    const labels = {};
    if (!search.length) return { verdict: 'none', labels, latest: null };
    const want = norm(finalQuery);
    const mine = search.filter((r) => norm(r.query) === want);
    const latest = mine.length ? mine[mine.length - 1] : null;
    const items = (shownItems || []).map(norm);
    const shownOk = !!latest && latest.outcome === 'done' && items.every((x) => x.includes(want))
      && (latest.count == null || items.length === latest.count);
    let stale = false;
    search.forEach((r) => {
      if (r === latest) labels[r.id] = r.outcome === 'done' ? 'latest' : r.outcome;
      else if (r.outcome !== 'done') labels[r.id] = r.outcome;
      else if (latest && r.start < latest.start && latest.end != null && r.end > latest.end) { labels[r.id] = shownOk ? 'ignored' : 'won'; stale = true; } else labels[r.id] = 'superseded';
    });
    let verdict;
    if (!latest || latest.outcome === 'pending' || search.some((r) => r.outcome === 'pending')) verdict = 'pending';
    else if (shownOk) verdict = 'latest';
    else verdict = stale ? 'stale-won' : 'mismatch';
    return { verdict, labels, latest: latest ? latest.id : null };
  }

  /* ---- Scenarios ------------------------------------------------------------------------- */

  const SCENARIOS = [
    { id: 'states', title: 'Loading, error and empty',
      intro: 'A list that loads on mount and on Search. Slow it down to see the loading state, switch on a failure to see the error state, and search for something that does not exist to see the empty state.',
      settings: { latency: 900 },
      code: `import { useEffect, useState } from 'react';

function App() {
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | error | success
  const [error, setError] = useState(null);

  async function load(term) {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/tasks?search=' + encodeURIComponent(term));
      if (!res.ok) throw new Error('the server answered ' + res.status);
      setTasks(await res.json());
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(''); }, []);

  return (
    <main>
      <form onSubmit={(e) => { e.preventDefault(); load(search); }}>
        <label>Search <input value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <button>Search</button>
      </form>
      {status === 'loading' && <p aria-busy="true">Loading tasks…</p>}
      {status === 'error' && (
        <p role="alert">Could not load the tasks: {error}. <button onClick={() => load(search)}>Try again</button></p>
      )}
      {status === 'success' && tasks.length === 0 && <p>No tasks match "{search}".</p>}
      {status === 'success' && tasks.length > 0 && (
        <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
      )}
    </main>
  );
}` },
    { id: 'race-naive', title: 'Search as you type (unprotected)',
      intro: 'Every keystroke sends a request, and nothing stops an older response from arriving last. Keep "Slow broad searches" on and press Type "status" fast.',
      settings: { latency: 300, skew: true }, typing: 'status',
      code: `import { useEffect, useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Bug: an older, slower response can arrive last and overwrite a newer one.
    fetch('/api/tasks?search=' + encodeURIComponent(query))
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }, [query]);

  return (
    <main>
      <label>Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <p>Results for "{query}":</p>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </main>
  );
}` },
    { id: 'race-abort', title: 'Search as you type (AbortController)',
      intro: 'The same search, but the effect\'s cleanup aborts the previous request: every keystroke cancels the one before, so only the last response can land.',
      settings: { latency: 300, skew: true }, typing: 'status',
      code: `import { useEffect, useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tasks?search=' + encodeURIComponent(query), { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);   // a cancel is not an error
      });
    return () => controller.abort();   // runs before the next effect: cancels this request
  }, [query]);

  return (
    <main>
      <label>Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <p>Results for "{query}":</p>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </main>
  );
}` },
    { id: 'debounce', title: 'Debounced search',
      intro: 'The request waits until typing pauses for 300 ms. Type "status" fast and count the requests on the timeline.',
      settings: { latency: 300, skew: true }, typing: 'status',
      code: `import { useEffect, useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/tasks?search=' + encodeURIComponent(query), { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setTasks(data))
        .catch((err) => { if (err.name !== 'AbortError') console.error(err); });
    }, 300);   // wait for a pause in the typing
    return () => {
      clearTimeout(timer);   // a new keystroke within 300 ms: this request never leaves
      controller.abort();    // a new keystroke after it left: cancel it
    };
  }, [query]);

  return (
    <main>
      <label>Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <p>Results for "{query}":</p>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </main>
  );
}` },
    { id: 'pagination', title: 'Pagination',
      intro: 'Two tasks per page. The total comes from the X-Total-Count header; Previous and Next are disabled at the ends and while a page loads.',
      settings: { latency: 600 },
      code: `import { useEffect, useState } from 'react';

const LIMIT = 2;

function App() {
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/tasks?page=' + page + '&limit=' + LIMIT, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setTotal(Number(res.headers.get('X-Total-Count')));
        return res.json();
      })
      .then((data) => { setTasks(data); setLoading(false); })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [page]);

  const lastPage = Math.max(1, Math.ceil(total / LIMIT));
  return (
    <main aria-busy={loading}>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
      <nav aria-label="Pages">
        <button onClick={() => setPage(page - 1)} disabled={page === 1 || loading}>Previous</button>
        <span> Page {page} of {lastPage} ({total} tasks) </span>
        <button onClick={() => setPage(page + 1)} disabled={page >= lastPage || loading}>Next</button>
      </nav>
    </main>
  );
}` },
    { id: 'login', title: 'Log in, then the token expires',
      intro: 'Log in (the form is filled in for you), then switch on "401 for requests with a token" and press Reload: the client logs the user out.',
      settings: { latency: 500 },
      code: `import { useEffect, useState } from 'react';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('');
  const [tasks, setTasks] = useState([]);

  // One function for every request: JSON, the token, and what a 401 means.
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401 && token) {
      setToken(null);
      setUser(null);
      setNotice('Your session has expired. Please log in again.');
      throw new Error('Session expired');
    }
    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) throw new Error(data && data.error ? data.error : 'HTTP ' + res.status);
    return data;
  }

  async function logIn(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await api('/api/auth/login', { method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      setToken(data.token);
      setUser(data.user);
      setNotice('');
    } catch (err) { setNotice(err.message); }
  }

  const reload = () => api('/api/tasks').then(setTasks).catch(() => {});
  useEffect(() => { if (token) reload(); }, [token]);

  if (!token) {
    return (
      <form onSubmit={logIn}>
        {notice && <p role="status">{notice}</p>}
        <label>Email <input name="email" defaultValue="ana@example.com" /></label>
        <label>Password <input name="password" type="password" defaultValue="password123" /></label>
        <button>Log in</button>
      </form>
    );
  }
  return (
    <main>
      <p>Logged in as {user.name}. <button onClick={() => setToken(null)}>Log out</button></p>
      <button onClick={reload}>Reload tasks</button>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </main>
  );
}` },
    { id: 'form', title: 'Server errors next to the field',
      intro: 'A create form that lets the server validate: submit an empty title and the 400 error appears under the field it belongs to.',
      settings: { latency: 400 },
      code: `import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState({});
  const [tasks, setTasks] = useState([]);

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.status === 400 && data.errors) {
        // [{ field: 'title', message: '…' }] → { title: '…' }
        setErrors(Object.fromEntries(data.errors.map((x) => [x.field || 'form', x.message])));
        return;
      }
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setTasks([...tasks, data]);
      setTitle('');
    } catch (err) {
      setErrors({ form: 'Could not save: ' + err.message });
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
        aria-invalid={errors.title ? 'true' : undefined}
        aria-describedby={errors.title ? 'title-error' : undefined} />
      {errors.title && <p id="title-error" className="field-error">{errors.title}</p>}
      {errors.form && <p role="alert">{errors.form}</p>}
      <button>Add task</button>
      <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </form>
  );
}` },
  ];

  const scenarioById = (id) => SCENARIOS.find((s) => s.id === id) || null;
  const settingsFor = (id) => ({ ...DEFAULTS, ...((scenarioById(id) || {}).settings || {}) });

  /* ---- Challenges ------------------------------------------------------------------------ */

  const lastDone = (rs, pred) => { const list = rs.filter((r) => r.outcome === 'done' && (!pred || pred(r))); return list[list.length - 1] || null; };
  const quiet = (ctx) => settled(ctx.rows) && ctx.snap && !ctx.snap.busy;
  const searchRows = (ctx) => ctx.rows.filter((r) => r.query !== null && r.method === 'GET');
  const raceOf = (ctx) => analyzeRace(ctx.rows, ctx.snap ? ctx.snap.input : '', ctx.snap ? ctx.snap.items : []);
  const typedFast = (ctx) => !!ctx.typed && ctx.typed.length >= 4 && ctx.snap && norm(ctx.snap.input) === norm(ctx.typed);

  const CHALLENGES = [
    { id: 'error-state', title: 'Show the error state', scenario: 'states',
      goal: 'Make a request **fail** and get the list to show its **error** message (with a Try again button) instead of a blank screen.',
      hint: 'Switch on **Network failure** or **Server error 500**, then press Search (or Reload preview).',
      check: (ctx) => quiet(ctx) && ctx.rows.some((r) => r.outcome === 'failed' || r.status >= 500) && ctx.snap.alerts.length > 0 },
    { id: 'empty-state', title: 'Show the empty state', scenario: 'states',
      goal: 'Get a **successful** answer with **no** tasks, and see the list say so instead of showing nothing.',
      hint: 'Switch the failures off, type a word no task contains (for example `zebra`) and press Search.',
      check: (ctx) => {
        if (!quiet(ctx)) return false;
        const r = lastDone(ctx.rows, (x) => x.method === 'GET');
        return !!r && r.status === 200 && r.count === 0 && ctx.snap.items.length === 0 && !ctx.snap.alerts.length && /no tasks/i.test(ctx.snap.text);
      } },
    { id: 'stale-wins', title: 'Watch the stale response win', scenario: 'race-naive',
      goal: 'With the unprotected search, type fast and catch the bug: the box says "status" but the list shows the results of an **older** query.',
      hint: 'Keep **Slow broad searches** on and press **Type "status" fast**. On the timeline, the bar for `search=s` ends after the one for `search=status`.',
      check: (ctx) => typedFast(ctx) && settled(ctx.rows) && raceOf(ctx).verdict === 'stale-won' },
    { id: 'stale-loses', title: 'Make the stale response lose', scenario: 'race-naive',
      goal: 'Fix the race: with **Slow broad searches** on, type "status" fast and make sure the list shows the results for "status", whatever order the responses arrive in.',
      hint: 'Edit the effect: abort the previous request in the cleanup (`const controller = new AbortController()` … `return () => controller.abort()`), or use an `ignore` flag that the cleanup sets to `true`. The AbortController scenario shows one answer.',
      check: (ctx) => {
        if (!typedFast(ctx) || !settled(ctx.rows) || !ctx.settings.skew) return false;
        const race = raceOf(ctx);
        const rs = searchRows(ctx);
        return race.verdict === 'latest' && rs.length >= 3 && Object.values(race.labels).some((l) => l === 'cancelled' || l === 'ignored');
      } },
    { id: 'debounce', title: 'One request, not six', scenario: 'debounce',
      goal: 'Type "status" fast and get the right results with **at most two** search requests on the timeline.',
      hint: 'The debounced scenario waits for a 300 ms pause before it fetches. Press **Type "status" fast** and count the bars.',
      check: (ctx) => {
        if (!typedFast(ctx) || !settled(ctx.rows)) return false;
        const rs = searchRows(ctx).filter((r) => r.outcome !== 'cancelled');
        return rs.length >= 1 && rs.length <= 2 && raceOf(ctx).verdict === 'latest';
      } },
    { id: 'last-page', title: 'Reach the last page', scenario: 'pagination',
      goal: 'Page through the tasks until **Next** is disabled because you are on the **last** page (not because a page is loading).',
      hint: 'Press Next until the counter reads "Page 3 of 3". Five tasks at two per page make three pages.',
      check: (ctx) => {
        if (!quiet(ctx)) return false;
        const r = lastDone(ctx.rows, (x) => x.page !== null);
        const next = ctx.snap.buttons.find((b) => /^next/i.test(b.text));
        return !!r && r.status === 200 && r.total != null && r.limit > 0 && r.page === Math.max(1, Math.ceil(r.total / r.limit)) && !!next && next.disabled;
      } },
    { id: 'logout-401', title: 'Expired token → log out', scenario: 'login',
      goal: 'Log in, then make the server reject the token with **401**, and see the app log the user out and ask them to log in again.',
      hint: 'Press Log in. Then switch on **401 for requests with a token** and press **Reload tasks**.',
      check: (ctx) => {
        if (!quiet(ctx)) return false;
        const login = ctx.rows.findIndex((r) => r.path.startsWith('/api/auth/login') && r.status === 200);
        if (login < 0) return false;
        return ctx.rows.slice(login + 1).some((r) => r.auth && r.status === 401) && ctx.snap.password && /expired/i.test(ctx.snap.text);
      } },
    { id: 'field-error', title: 'An error next to its field', scenario: 'form',
      goal: 'Send the form so that the **server** rejects it with **400**, and see the message appear under the **Title** field (marked invalid), not as a general alert.',
      hint: 'Leave the title empty (or type only spaces) and press Add task.',
      check: (ctx) => quiet(ctx) && ctx.rows.some((r) => r.method === 'POST' && r.status === 400) && ctx.snap.invalid.includes('title') },
  ];

  /* ---- Integrity ------------------------------------------------------------------------- */

  function validateScenario(s) {
    const problems = [];
    if (!s || !/^[a-z][a-z0-9-]*$/.test(s.id || '')) problems.push('id must be kebab-case');
    if (!s.title || !s.intro) problems.push(`${s.id}: title and intro are required`);
    if (!/function App\s*\(/.test(s.code || '')) problems.push(`${s.id}: the code must define App`);
    if (!/fetch\(/.test(s.code || '')) problems.push(`${s.id}: the code never calls fetch`);
    if (/from ['"](?!react['"])[^'"]+['"]/.test(s.code || '')) problems.push(`${s.id}: imports something other than react`);
    Object.keys(s.settings || {}).forEach((k) => { if (!(k in DEFAULTS)) problems.push(`${s.id}: unknown setting ${k}`); });
    if (s.typing && !/<input[^>]*type="search"/.test(s.code)) problems.push(`${s.id}: a typing scenario needs a search input`);
    return problems;
  }

  return { DEFAULTS, SCENARIOS, CHALLENGES, latencyFor, params, createTimeline, applyEvent, rows, settled, bars, analyzeRace, scenarioById, settingsFor, validateScenario };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = FetchLabEngine;
