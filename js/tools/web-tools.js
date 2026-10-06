'use strict';

/* ==========================================================================
   "How the web works" tools.

   url-anatomy    a URL split into scheme, host, port, path, query and fragment
                  (the browser's own URL parser), plus a relative-link resolver.
   http-explorer  raw HTTP request / response pairs for common scenarios, each
                  part annotated, with the status-code families and the
                  safe / idempotent properties of each method.
   Inputs only repaint the output areas (data-part) so typing is not interrupted.
   ========================================================================== */

(() => {
  /* ======================================================================
     1. URL anatomy
     ====================================================================== */

  const URL_PRESETS = [
    ['shop', 'https://shop.example.com/products/shoes?color=red&size=42#reviews'],
    ['local', 'http://localhost:3000/api/tasks?page=2&limit=10'],
    ['search', 'https://www.google.com/search?q=css+grid'],
    ['port', 'https://example.com:8443/admin/'],
  ];
  const DEFAULT_PORT = { 'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443' };

  /* Example links; relExplain() says what each kind does. */
  const REL_CASES = ['about.html', './img/logo.png', '../index.html', '/contact', '?page=3', '#top', '//cdn.example.org/app.js', 'https://other.org/'];

  const ua = { url: URL_PRESETS[0][1], base: 'https://site.example.com/blog/posts/first.html', rel: 'about.html' };

  function relExplain(rel) {
    const r = rel.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return t('Absolute URL: the base is ignored.');
    if (r.startsWith('//')) return t('Protocol-relative: same scheme, another host.');
    if (r.startsWith('/')) return t('A leading “/” starts from the root of the same host.');
    if (r.startsWith('?')) return t('Only the query changes; the path stays.');
    if (r.startsWith('#')) return t('Only the fragment changes: same page, different spot.');
    if (r.startsWith('../')) return t('“../” goes up one folder (from the folder of the current page).');
    if (r.startsWith('./')) return t('“./” is the current folder.');
    if (!r) return t('An empty link points to the current page itself.');
    return t('Relative to the folder of the current page (the base path up to its last “/”).');
  }

  function urlOut() {
    let u;
    try { u = new URL(ua.url.trim()); } catch (e) {
      return `<p class="tl-bad">${esc(t('That is not a valid absolute URL. A full URL needs at least a scheme and a host, like https://example.com'))}</p>`;
    }
    const port = u.port || DEFAULT_PORT[u.protocol] || '';
    const parts = [
      { k: 'scheme', text: u.protocol + '//', label: t('Scheme'), info: t('How to talk to the server: the protocol. https is http encrypted with TLS.') },
      u.username ? { k: 'user', text: `${u.username}${u.password ? ':' + u.password : ''}@`, label: t('Credentials'), info: t('A user name in the URL: rare and unsafe; avoid it.') } : null,
      { k: 'host', text: u.hostname, label: t('Host'), info: t('Which machine: a domain name that DNS turns into an IP address.') },
      { k: 'port', text: u.port ? ':' + u.port : `:${port}`, label: t('Port'), info: u.port ? t('Which program on that machine. Written because it is not the default.') : t('Not written, so the default for the scheme is used ({port}).', { port }), implicit: !u.port },
      { k: 'path', text: u.pathname, label: t('Path'), info: t('Which resource on the server, like a file path. The server decides what it means.') },
      u.search ? { k: 'query', text: u.search, label: t('Query'), info: t('Extra parameters as key=value pairs after “?”, joined with “&”. Sent to the server.') } : null,
      u.hash ? { k: 'fragment', text: u.hash, label: t('Fragment'), info: t('A spot inside the page (an element id). Never sent to the server: the browser uses it.') } : null,
    ].filter(Boolean);
    const params = [...u.searchParams.entries()];
    return `<p class="ua-url" aria-label="${esc(t('The URL split into parts'))}">${parts.map((p) => `<span class="ua-seg ua-${p.k}${p.implicit ? ' is-implicit' : ''}">${esc(p.text)}</span>`).join('')}</p>
      <dl class="ua-list">${parts.map((p) => `<div class="ua-item"><dt><span class="ua-dot ua-${p.k}" aria-hidden="true"></span>${esc(p.label)} <code>${esc(p.text)}</code></dt><dd>${esc(p.info)}</dd></div>`).join('')}</dl>
      ${params.length ? `<div class="scroll"><table class="src ua-params"><caption>${esc(t('Query parameters (as the server reads them)'))}</caption><thead><tr><th scope="col">${esc(t('Key'))}</th><th scope="col">${esc(t('Value'))}</th></tr></thead><tbody>${params.map(([k, v]) => `<tr><th scope="row"><code>${esc(k)}</code></th><td><code>${esc(v)}</code></td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="tl-explain">${md(t('**Origin** (scheme + host + port): `{origin}`. Browsers use the origin as a security boundary: pages from different origins cannot read each other\'s data.', { origin: u.origin }))}</p>`;
  }

  function relOut() {
    let base;
    try { base = new URL(ua.base.trim()); } catch (e) { return `<p class="tl-bad">${esc(t('The base must be a full URL (the address of the current page).'))}</p>`; }
    let abs;
    try { abs = new URL(ua.rel, base).href; } catch (e) { return `<p class="tl-bad">${esc(t('The browser cannot resolve that link.'))}</p>`; }
    return `<p class="ua-result"><span class="muted small">${esc(t('The browser requests'))}</span> <code>${esc(abs)}</code></p><p class="tl-explain">${esc(relExplain(ua.rel))}</p>`;
  }

  Tools.register('url-anatomy', {
    title: 'URL anatomy',
    intro: 'Type any URL to see its parts, then see how the browser turns a relative link into a full URL.',
    body() {
      return `
        <div class="tl-field">
          <label for="ua-url">${esc(t('URL'))}</label>
          <input id="ua-url" class="tl-input" type="url" data-ua="url" data-fid="ua-url" value="${esc(ua.url)}" spellcheck="false" autocomplete="off">
        </div>
        <div class="tl-row ua-presets" role="group" aria-label="${esc(t('Example URLs'))}">
          ${URL_PRESETS.map(([k, u]) => `<button type="button" class="btn ghost small-btn" data-action="ua-preset" data-v="${esc(u)}" data-fid="ua-p-${k}">${esc(new URL(u).host)}</button>`).join('')}
        </div>
        <div data-part="url">${urlOut()}</div>
        <h4 class="tl-sub">${esc(t('Resolve a relative link'))}</h4>
        <div class="tl-cols">
          <div class="tl-field"><label for="ua-base">${esc(t('Current page (base)'))}</label>
            <input id="ua-base" class="tl-input" type="url" data-ua="base" data-fid="ua-base" value="${esc(ua.base)}" spellcheck="false" autocomplete="off"></div>
          <div class="tl-field"><label for="ua-rel">${esc(t('Link href'))}</label>
            <input id="ua-rel" class="tl-input" type="text" data-ua="rel" data-fid="ua-rel" value="${esc(ua.rel)}" spellcheck="false" autocomplete="off"></div>
        </div>
        <div class="tl-row ua-rels" role="group" aria-label="${esc(t('Example links'))}">
          ${REL_CASES.map((r, k) => `<button type="button" class="tl-chip" data-action="ua-rel" data-v="${esc(r)}" data-fid="ua-r-${k}"><code>${esc(r)}</code></button>`).join('')}
        </div>
        <div data-part="rel">${relOut()}</div>`;
    },
    onClick(el, root) {
      if (el.dataset.action === 'ua-preset') { ua.url = el.dataset.v; Tools.refresh('url-anatomy'); Tools.say(root, t('URL: {url}', { url: ua.url })); }
      if (el.dataset.action === 'ua-rel') { ua.rel = el.dataset.v; Tools.refresh('url-anatomy'); try { Tools.say(root, `${ua.rel} → ${new URL(ua.rel, ua.base).href}`); } catch (e) { /* invalid base: the output explains */ } }
    },
    onInput(e, root) {
      const k = e.target.dataset.ua;
      if (!k) return;
      ua[k] = e.target.value;
      Tools.paint(root, k === 'url' ? { url: urlOut } : { rel: relOut });
    },
  });

  /* ======================================================================
     2. HTTP explorer
     ====================================================================== */

  const JSON_TYPE = 'application/json; charset=utf-8';
  const SCENARIOS = [
    { id: 'page', label: 'Load a page', method: 'GET', path: '/index.html', reqHeaders: [['Host', 'shop.example.com'], ['Accept', 'text/html'], ['User-Agent', 'Mozilla/5.0 (…)']],
      status: 200, resHeaders: [['Content-Type', 'text/html; charset=utf-8'], ['Content-Length', '1342'], ['Cache-Control', 'max-age=600']],
      resBody: '<!doctype html>\n<html lang="en">\n  <head><title>Shop</title>…', note: 'The browser asks for a page; the server sends HTML. The browser then requests every CSS, JS and image file the HTML mentions: one request each.' },
    { id: 'get-json', label: 'GET JSON from an API', method: 'GET', path: '/api/tasks?done=false', reqHeaders: [['Host', 'api.example.com'], ['Accept', 'application/json']],
      status: 200, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '[\n  { "id": 1, "title": "Buy milk", "done": false },\n  { "id": 3, "title": "Study CSS Grid", "done": false }\n]', note: 'An API answers with data (JSON), not a page. JavaScript (fetch) reads it and updates the page.' },
    { id: 'post', label: 'POST: create', method: 'POST', path: '/api/tasks', reqHeaders: [['Host', 'api.example.com'], ['Content-Type', 'application/json'], ['Content-Length', '33']],
      reqBody: '{ "title": "Learn HTTP", "done": false }',
      status: 201, resHeaders: [['Content-Type', JSON_TYPE], ['Location', '/api/tasks/4']],
      resBody: '{ "id": 4, "title": "Learn HTTP", "done": false }', note: 'The request has a body. Content-Type tells the server how to read it. 201 Created plus Location says where the new resource lives.' },
    { id: 'put', label: 'PUT: update', method: 'PUT', path: '/api/tasks/4', reqHeaders: [['Host', 'api.example.com'], ['Content-Type', 'application/json']],
      reqBody: '{ "title": "Learn HTTP", "done": true }',
      status: 200, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '{ "id": 4, "title": "Learn HTTP", "done": true }', note: 'PUT replaces the resource with the body sent. Sending the same PUT twice leaves the same result: it is idempotent.' },
    { id: 'delete', label: 'DELETE', method: 'DELETE', path: '/api/tasks/4', reqHeaders: [['Host', 'api.example.com']],
      status: 204, resHeaders: [],
      resBody: '', note: '204 No Content: it worked and there is nothing to send back, so the response has no body.' },
    { id: '404', label: 'Not found', method: 'GET', path: '/api/tasks/999', reqHeaders: [['Host', 'api.example.com'], ['Accept', 'application/json']],
      status: 404, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '{ "error": "Task 999 not found" }', note: 'A 4xx code means the client asked for something wrong; here, a resource that does not exist. The body still explains the error.' },
    { id: '401', label: 'Unauthorised', method: 'GET', path: '/api/me', reqHeaders: [['Host', 'api.example.com']],
      status: 401, resHeaders: [['WWW-Authenticate', 'Bearer'], ['Content-Type', JSON_TYPE]],
      resBody: '{ "error": "Log in first" }', note: '401: the server does not know who you are (no or invalid credentials). Log in and send the token in an Authorization header.' },
    { id: '403', label: 'Forbidden', method: 'DELETE', path: '/api/users/1', reqHeaders: [['Host', 'api.example.com'], ['Authorization', 'Bearer eyJhbGciOi…']],
      status: 403, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '{ "error": "Only admins can delete users" }', note: '403: the server knows who you are, but you are not allowed to do this. Logging in again will not help.' },
    { id: '422', label: 'Validation error', method: 'POST', path: '/api/tasks', reqHeaders: [['Host', 'api.example.com'], ['Content-Type', 'application/json']],
      reqBody: '{ "title": "" }',
      status: 422, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '{ "error": "title is required" }', note: 'The request was well formed, but the data breaks a rule. Many APIs use 400 Bad Request for the same case.' },
    { id: '301', label: 'Redirect', method: 'GET', path: '/old-page', reqHeaders: [['Host', 'shop.example.com']],
      status: 301, resHeaders: [['Location', 'https://shop.example.com/new-page']],
      resBody: '', note: '3xx: “look elsewhere”. The browser reads Location and makes a second request there by itself.' },
    { id: '500', label: 'Server error', method: 'GET', path: '/api/report', reqHeaders: [['Host', 'api.example.com']],
      status: 500, resHeaders: [['Content-Type', JSON_TYPE]],
      resBody: '{ "error": "Internal server error" }', note: '5xx: the request may be fine, but the server failed (a bug, a database down). Not the client\'s fault.' },
  ];
  const REASON = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 422: 'Unprocessable Content', 500: 'Internal Server Error', 503: 'Service Unavailable' };
  const FAMILIES = [
    ['1xx', 'Informational', 'Still working on it (rare in practice).'],
    ['2xx', 'Success', 'It worked: 200 OK, 201 Created, 204 No Content.'],
    ['3xx', 'Redirection', 'Look elsewhere: 301 / 302 with a Location header, 304 use your cached copy.'],
    ['4xx', 'Client error', 'The request is wrong: 400, 401, 403, 404, 422.'],
    ['5xx', 'Server error', 'The server failed: 500, 503.'],
  ];
  const METHODS = [
    ['GET', 'Read', true, true, false],
    ['POST', 'Create', false, false, true],
    ['PUT', 'Replace', false, true, true],
    ['PATCH', 'Change part', false, false, true],
    ['DELETE', 'Delete', false, true, false],
  ];

  const hx = { id: 'page', method: 'GET', path: '/index.html' };
  const scenario = () => SCENARIOS.find((s) => s.id === hx.id) || SCENARIOS[0];

  /* A raw HTTP message, one annotated row per part. */
  function message(kind, first, headers, body) {
    const firstLabel = kind === 'req' ? t('Request line: method, path, version') : t('Status line: version, status code, reason');
    return `<div class="hx-msg hx-${kind}">
        <p class="hx-title">${esc(kind === 'req' ? t('Request (browser → server)') : t('Response (server → browser)'))}</p>
        <div class="hx-raw" role="group" aria-label="${esc(kind === 'req' ? t('Raw request') : t('Raw response'))}">
          <div class="hx-part hx-first"><pre>${esc(first)}</pre><span class="hx-tag">${esc(firstLabel)}</span></div>
          <div class="hx-part hx-headers"><pre>${headers.length ? headers.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('\n') : `<span class="muted">${esc(t('(no headers needed here)'))}</span>`}</pre><span class="hx-tag">${esc(t('Headers: metadata as Name: value'))}</span></div>
          <div class="hx-part hx-blank"><pre> </pre><span class="hx-tag">${esc(t('Blank line: headers end here'))}</span></div>
          <div class="hx-part hx-body"><pre>${body ? esc(body) : `<span class="muted">${esc(t('(no body)'))}</span>`}</pre><span class="hx-tag">${esc(t('Body: the content (optional)'))}</span></div>
        </div>
      </div>`;
  }

  function httpOut() {
    const s = scenario();
    const method = hx.method;
    const path = hx.path || '/';
    const reason = REASON[s.status] || '';
    const fam = FAMILIES[Math.floor(s.status / 100) - 1];
    const noBodyMethod = (method === 'GET' || method === 'DELETE') && s.reqBody;
    return `<div class="tl-cols hx-pair">
        ${message('req', `${method} ${path} HTTP/1.1`, s.reqHeaders, method === 'GET' ? '' : (s.reqBody || ''))}
        ${message('res', `HTTP/1.1 ${s.status} ${reason}`, s.resHeaders, s.resBody)}
      </div>
      ${noBodyMethod ? `<p class="tl-explain">${esc(t('A GET request normally has no body: its data travels in the path and the query.'))}</p>` : ''}
      <p class="tl-explain"><strong>${esc(`${s.status} ${reason}`)}</strong> · ${esc(fam ? `${fam[0]} ${t(fam[1])}` : '')}. ${esc(t(s.note))}</p>`;
  }

  Tools.register('http-explorer', {
    title: 'HTTP explorer',
    intro: 'Every page, image and API call is one HTTP request and one response. Pick a scenario and read both messages as they travel over the network.',
    body() {
      const s = scenario();
      return `
        <div class="tl-row">
          ${Tools.select({ label: t('Scenario'), fid: 'hx-scn', options: SCENARIOS.map((x) => [x.id, `${t(x.label)} (${x.status})`]), current: s.id, data: { hx: 'scenario' } })}
          ${Tools.select({ label: t('Method'), fid: 'hx-method', options: METHODS.map(([m]) => m), current: hx.method, data: { hx: 'method' } })}
          <div class="tl-field hx-pathf"><label for="hx-path">${esc(t('Path'))}</label>
            <input id="hx-path" class="tl-input" data-hx="path" data-fid="hx-path" value="${esc(hx.path)}" spellcheck="false" autocomplete="off"></div>
        </div>
        <div data-part="http">${httpOut()}</div>
        <div class="tl-cols hx-tables">
          <div class="scroll"><table class="src"><caption>${esc(t('Status code families'))}</caption>
            <thead><tr><th scope="col">${esc(t('Code'))}</th><th scope="col">${esc(t('Meaning'))}</th></tr></thead>
            <tbody>${FAMILIES.map(([c, n, d]) => `<tr${c[0] === String(s.status)[0] ? ' class="is-hit"' : ''}><th scope="row">${c}</th><td><strong>${esc(t(n))}</strong>: ${esc(t(d))}</td></tr>`).join('')}</tbody></table></div>
          <div class="scroll"><table class="src"><caption>${esc(t('Methods: safe = never changes data; idempotent = repeating it gives the same result'))}</caption>
            <thead><tr><th scope="col">${esc(t('Method'))}</th><th scope="col">${esc(t('Use'))}</th><th scope="col">${esc(t('Safe'))}</th><th scope="col">${esc(t('Idempotent'))}</th><th scope="col">${esc(t('Body'))}</th></tr></thead>
            <tbody>${METHODS.map(([m, u, safe, idem, body]) => `<tr${m === hx.method ? ' class="is-hit"' : ''}><th scope="row"><code>${m}</code></th><td>${esc(t(u))}</td><td>${safe ? esc(t('yes')) : esc(t('no'))}</td><td>${idem ? esc(t('yes')) : esc(t('no'))}</td><td>${body ? esc(t('yes')) : esc(t('usually no'))}</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    },
    onChange(e, root) {
      const k = e.target.dataset.hx;
      if (k === 'scenario') {
        hx.id = e.target.value;
        const s = scenario();
        hx.method = s.method;
        hx.path = s.path;
        Tools.refresh('http-explorer');
        Tools.say(root, `${s.method} ${s.path} → ${s.status} ${REASON[s.status] || ''}`);
      } else if (k === 'method') {
        hx.method = e.target.value;
        Tools.refresh('http-explorer');
      }
    },
    onInput(e, root) {
      if (e.target.dataset.hx !== 'path') return;
      hx.path = e.target.value;
      Tools.paint(root, { http: httpOut });
    },
  });
})();
