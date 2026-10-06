'use strict';

/* ==========================================================================
   Auth engine (no DOM; also runs in Node ≥ 20: site/test/auth-engine.test.mjs).
   Used by js/tools/auth-tools.js (jwt-inspector, hash-cost, cors-sim).

   JWT      b64url / text helpers, parse(token), claims(payload, now),
            timeCheck(payload, now), sign(payload, secret, header) [async],
            verify(token, secret, { now }) [async], withPayload(token, payload).
            Only HS256 is verified (the jsonwebtoken default with a shared secret).
   Hashing  pbkdf2(password, salt, iterations) [async], sha256Hex(text) [async],
            randomSalt(n), attack(msPerGuess, workers), formatDuration(sec).
   CORS     parseOrigin(url), compareOrigins(page, api), classify(req),
            corsHeaders(options, origin, { preflight, requestHeaders }),
            simulate(req, options), configCode(options), fix(result, options, req).
            `options` mirrors the options of the `cors` npm middleware
            ({ origin, methods, allowedHeaders, credentials, maxAge }); null
            means "no cors middleware at all".
   Crypto comes from WebCrypto (globalThis.crypto.subtle): browsers expose it
   only on https:// and http://localhost pages; hasCrypto() says whether it is there.
   ========================================================================== */

const AuthEngine = (() => {
  const enc = new TextEncoder();

  /* ---------------------------------------------------------------- base64url */

  function bytesToB64url(bytes) {
    let bin = '';
    for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlToBytes(str) {
    const s = String(str);
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('contains characters that are not base64url (only A–Z, a–z, 0–9, - and _ are allowed)');
    if (s.length % 4 === 1) throw new Error('has an impossible length for base64url');
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
    return out;
  }

  const textToB64url = (text) => bytesToB64url(enc.encode(text));
  const b64urlToText = (s) => new TextDecoder('utf-8', { fatal: true }).decode(b64urlToBytes(s));
  const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  /* ---------------------------------------------------------------- JWT: decode */

  const PART_NAMES = ['header', 'payload', 'signature'];

  /* Splits and decodes a token without any secret (anyone can do this).
     → { ok, parts, header, payload, headerText, payloadText, signature, signingInput, error, errorPart } */
  function parse(token) {
    const tok = String(token == null ? '' : token).trim();
    const r = { ok: false, token: tok, parts: [], header: null, payload: null, headerText: '', payloadText: '', signature: '', signingInput: '', error: '', errorPart: '' };
    if (!tok) { r.error = 'Paste a token: three base64url parts separated by dots.'; return r; }
    r.parts = tok.split('.');
    if (r.parts.length !== 3) {
      r.error = `A JWT has exactly three parts separated by two dots; this one has ${r.parts.length} part${r.parts.length === 1 ? '' : 's'}.`;
      return r;
    }
    const [h, p, s] = r.parts;
    for (const [k, seg] of [[0, h], [1, p]]) {
      const name = PART_NAMES[k];
      let text;
      try { text = b64urlToText(seg); } catch (e) { r.error = `The ${name} ${e.message || 'is not valid base64url'}.`; r.errorPart = name; return r; }
      let obj;
      try { obj = JSON.parse(text); } catch (e) { r.error = `The ${name} decodes to text that is not valid JSON: ${text.slice(0, 60)}`; r.errorPart = name; return r; }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { r.error = `The ${name} must be a JSON object ({ … }).`; r.errorPart = name; return r; }
      if (k === 0) { r.header = obj; r.headerText = text; } else { r.payload = obj; r.payloadText = text; }
    }
    try { b64urlToBytes(s); } catch (e) { r.error = `The signature ${e.message}.`; r.errorPart = 'signature'; return r; }
    r.signature = s;
    r.signingInput = `${h}.${p}`;
    r.ok = true;
    return r;
  }

  /* ---------------------------------------------------------------- JWT: claims */

  const CLAIMS = {
    sub: ['Subject', 'Who the token is about: usually the user id. In an Express API, `req.user.sub` is the id used for ownership checks.'],
    iat: ['Issued at', 'When the token was created, in seconds since 1 January 1970 (UTC). `jwt.sign` adds it automatically.'],
    exp: ['Expiration time', 'After this moment `jwt.verify` throws `TokenExpiredError: jwt expired`. `expiresIn: "1h"` sets it to `iat + 3600`.'],
    nbf: ['Not before', 'The token is not valid before this moment (`jwt not active`).'],
    iss: ['Issuer', 'Who created and signed the token (for example your API\'s name).'],
    aud: ['Audience', 'Who the token is meant for; a server can refuse tokens issued for another service.'],
    jti: ['JWT ID', 'A unique id for this token; useful for a denylist of revoked tokens.'],
    role: ['Role (custom claim)', 'Your own claim, not a standard one. Many APIs put `role` here so routes can check permissions without a database lookup.'],
    name: ['Name (custom claim)', 'Readable by anyone who has the token: never put secrets in a payload.'],
    email: ['Email (custom claim)', 'Readable by anyone who has the token: personal data in a payload is visible.'],
    admin: ['Admin flag (custom claim)', 'Trusted only because the signature is valid: change it and the signature breaks.'],
  };
  const TIME_CLAIMS = ['iat', 'nbf', 'exp'];

  /* Human relative time for a number of seconds (always positive): "45 s", "52 min", "3 h 5 min", "2 days". */
  function relTime(sec) {
    const s = Math.abs(Math.round(sec));
    if (s < 90) return `${s} s`;
    const m = Math.round(s / 60);
    if (m < 90) return `${m} min`;
    const h = Math.floor(s / 3600);
    if (h < 48) { const mm = Math.round((s - h * 3600) / 60); return mm ? `${h} h ${mm} min` : `${h} h`; }
    const d = Math.round(s / 86400);
    if (d < 730) return `${d} days`;
    return `${Math.round(d / 365)} years`;
  }

  /* One row per claim: { name, value, label, meaning, custom, time: { seconds, status, text } | null } */
  function claims(payload, now) {
    if (!payload || typeof payload !== 'object') return [];
    return Object.keys(payload).map((name) => {
      const value = payload[name];
      const known = CLAIMS[name];
      const row = {
        name, value,
        label: known ? known[0] : 'Custom claim',
        meaning: known ? known[1] : 'A claim your server chose to add. Anyone can read it; only the signature makes it trustworthy.',
        custom: !['sub', 'iat', 'exp', 'nbf', 'iss', 'aud', 'jti'].includes(name),
        time: null,
      };
      if (TIME_CLAIMS.includes(name)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) row.time = { seconds: null, status: 'invalid', text: `must be a number of seconds, not ${JSON.stringify(value)}` };
        else {
          const d = value - now;
          let status;
          if (name === 'exp') status = now >= value ? 'expired' : 'valid';
          else if (name === 'nbf') status = now < value ? 'not-yet' : 'valid';
          else status = d > 0 ? 'future' : 'past';
          const rel = d >= 0 ? `in ${relTime(d)}` : `${relTime(d)} ago`;
          const text = {
            expired: `expired ${relTime(d)} ago`,
            valid: name === 'exp' ? `valid for another ${relTime(d)}` : `active since ${relTime(d)} ago`,
            'not-yet': `not active yet: starts in ${relTime(d)}`,
            future: `issued in the future (${rel}): the clocks disagree`,
            past: `issued ${relTime(d)} ago`,
          }[status];
          row.time = { seconds: value, status, text };
        }
      }
      return row;
    });
  }

  /* The time checks jwt.verify makes, in its order: nbf then exp (no clock tolerance).
     → { ok, code: 'ok' | 'not-before' | 'expired' | 'bad-claim', message } */
  function timeCheck(payload, now) {
    for (const k of ['nbf', 'exp']) {
      if (payload && k in payload && (typeof payload[k] !== 'number' || !Number.isFinite(payload[k]))) return { ok: false, code: 'bad-claim', message: `invalid ${k} value` };
    }
    if (payload && typeof payload.nbf === 'number' && payload.nbf > now) return { ok: false, code: 'not-before', message: 'jwt not active' };
    if (payload && typeof payload.exp === 'number' && now >= payload.exp) return { ok: false, code: 'expired', message: 'jwt expired' };
    return { ok: true, code: 'ok', message: '' };
  }

  /* ---------------------------------------------------------------- JWT: sign and verify */

  const subtle = () => (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || null;
  const hasCrypto = () => !!subtle();

  async function hmacSha256(secret, data) {
    const s = subtle();
    if (!s) throw new Error('no-crypto');
    const key = await s.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await s.sign('HMAC', key, enc.encode(data)));
  }

  /* jwt.sign(payload, secret) with HS256 (no automatic iat here: the caller decides). */
  async function sign(payload, secret, header = { alg: 'HS256', typ: 'JWT' }) {
    const input = `${textToB64url(JSON.stringify(header))}.${textToB64url(JSON.stringify(payload))}`;
    return `${input}.${bytesToB64url(await hmacSha256(secret, input))}`;
  }

  /* Same header and signature, new payload: what an attacker who edits a token produces. */
  function withPayload(token, payload) {
    const p = String(token).trim().split('.');
    if (p.length !== 3) return token;
    return `${p[0]}.${textToB64url(JSON.stringify(payload))}.${p[2]}`;
  }

  /* Constant-time comparison of two strings (what servers should use for signatures). */
  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let k = 0; k < a.length; k++) diff |= a.charCodeAt(k) ^ b.charCodeAt(k);
    return diff === 0;
  }

  /* What jwt.verify(token, secret) would do, step by step.
     → { status, signature: 'valid' | 'invalid' | 'unchecked', message, expected, parsed }
     status: 'valid' | 'malformed' | 'alg-none' | 'alg-unsupported' | 'no-secret' | 'no-crypto'
           | 'bad-signature' | 'not-before' | 'expired' | 'bad-claim'
     message: the error text jsonwebtoken would throw ('' when valid). */
  async function verify(token, secret, { now = Math.floor(Date.now() / 1000) } = {}) {
    const parsed = parse(token);
    const out = (status, message, extra = {}) => ({ status, message, signature: 'unchecked', expected: '', parsed, ...extra });
    if (!parsed.ok) return out('malformed', 'jwt malformed');
    const alg = String(parsed.header.alg || '');
    if (!alg || alg.toLowerCase() === 'none') return out('alg-none', 'jwt signature is required');
    if (alg !== 'HS256') return out('alg-unsupported', /^HS(384|512)$/.test(alg) ? '' : 'invalid algorithm');
    if (!secret) return out('no-secret', 'secret or public key must be provided');
    if (!hasCrypto()) return out('no-crypto', '');
    const expected = bytesToB64url(await hmacSha256(secret, parsed.signingInput));
    if (!safeEqual(expected, parsed.signature)) return out('bad-signature', 'invalid signature', { signature: 'invalid', expected });
    const tc = timeCheck(parsed.payload, now);
    if (!tc.ok) return out(tc.code, tc.message, { signature: 'valid', expected });
    return out('valid', '', { signature: 'valid', expected });
  }

  /* ---------------------------------------------------------------- password hashing */

  function randomSalt(n = 16) {
    const out = new Uint8Array(n);
    globalThis.crypto.getRandomValues(out);
    return out;
  }

  /* PBKDF2-HMAC-SHA-256 → 32 bytes. One iteration is one HMAC, i.e. two SHA-256 computations. */
  async function pbkdf2(password, salt, iterations) {
    const s = subtle();
    if (!s) throw new Error('no-crypto');
    const key = await s.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await s.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
  }

  async function sha256Hex(text) {
    const s = subtle();
    if (!s) throw new Error('no-crypto');
    return toHex(new Uint8Array(await s.digest('SHA-256', enc.encode(text))));
  }

  /* An attacker who tries passwords at msPerGuess each, on `workers` machines working in parallel. */
  function attack(msPerGuess, workers = 1) {
    const perSecond = msPerGuess > 0 ? (1000 / msPerGuess) * workers : Infinity;
    return { perSecond, billionSeconds: 1e9 / perSecond };
  }

  /* "0.4 µs", "12 ms", "3.1 s", "4.2 min", "6 h", "12 days", "3.4 years", "12,000 years". */
  function formatDuration(sec) {
    if (!Number.isFinite(sec)) return '∞';
    const one = (v) => (v < 10 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v)));
    if (sec < 1e-3) return `${one(sec * 1e6)} µs`;
    if (sec < 1) return `${one(sec * 1e3)} ms`;
    if (sec < 90) return `${one(sec)} s`;
    if (sec < 5400) return `${one(sec / 60)} min`;
    if (sec < 172800) return `${one(sec / 3600)} h`;
    if (sec < 3 * 365 * 86400) return `${one(sec / 86400)} days`;
    const y = sec / (365 * 86400);
    return y < 10000 ? `${one(y)} years` : `${Math.round(y).toLocaleString('en-US')} years`;
  }

  /* "850", "12 thousand", "3.4 million", "2 billion" (per second). */
  function formatCount(n) {
    if (!Number.isFinite(n)) return '∞';
    const one = (v) => (v < 10 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v)));
    if (n < 1000) return one(n);
    if (n < 1e6) return `${one(n / 1e3)} thousand`;
    if (n < 1e9) return `${one(n / 1e6)} million`;
    return `${one(n / 1e9)} billion`;
  }

  /* ---------------------------------------------------------------- CORS */

  const DEFAULT_PORT = { 'http:': '80', 'https:': '443' };
  const CORS_DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
  const SAFE_METHODS = ['GET', 'HEAD', 'POST'];
  const SAFE_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
  const SAFE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type'];
  const STATUS = { GET: [200, 'OK'], HEAD: [200, 'OK'], POST: [201, 'Created'], PUT: [200, 'OK'], PATCH: [200, 'OK'], DELETE: [204, 'No Content'] };

  /* → { ok, scheme, host, port, explicitPort, origin, path, error } */
  function parseOrigin(input) {
    let u;
    try { u = new URL(String(input).trim()); } catch (e) { return { ok: false, error: 'not a full URL (it needs a scheme and a host, like http://localhost:5173)' }; }
    if (!DEFAULT_PORT[u.protocol]) return { ok: false, error: 'use an http:// or https:// address' };
    const port = u.port || DEFAULT_PORT[u.protocol];
    return { ok: true, scheme: u.protocol.slice(0, -1), host: u.hostname, port, explicitPort: !!u.port, origin: u.origin, path: `${u.pathname}${u.search}`, error: '' };
  }

  /* Same origin = same scheme AND same host AND same port. → { same, diffs: [{ part, page, api }] } */
  function compareOrigins(page, api) {
    const diffs = ['scheme', 'host', 'port'].filter((k) => page[k] !== api[k]).map((part) => ({ part, page: page[part], api: api[part] }));
    return { same: diffs.length === 0, diffs };
  }

  const essence = (v) => String(v || '').split(';')[0].trim().toLowerCase();

  /* Is the request "simple" (sent straight away) or does the browser need a preflight first?
     req = { method, headers: [[name, value]] } → { simple, reasons: [{ code, header?, text }], unsafeHeaders } */
  function classify(req) {
    const reasons = [];
    const unsafeHeaders = [];
    const method = String(req.method || 'GET').toUpperCase();
    if (!SAFE_METHODS.includes(method)) reasons.push({ code: 'method', text: `${method} is not GET, HEAD or POST.` });
    (req.headers || []).forEach(([name, value]) => {
      const n = String(name).toLowerCase();
      if (n === 'content-type') {
        if (!SAFE_CONTENT_TYPES.includes(essence(value))) {
          reasons.push({ code: 'content-type', header: n, text: `Content-Type: ${value} is not one of the three form types (application/x-www-form-urlencoded, multipart/form-data, text/plain).` });
          unsafeHeaders.push(n);
        }
      } else if (!SAFE_HEADERS.includes(n)) {
        reasons.push({ code: 'header', header: n, text: `${name} is not a CORS-safelisted header.` });
        unsafeHeaders.push(n);
      }
    });
    return { simple: reasons.length === 0, reasons, unsafeHeaders: [...new Set(unsafeHeaders)].sort() };
  }

  /* Does the `origin` option of cors() allow this request origin? (string: always echoed as is) */
  function originHeader(opt, requestOrigin) {
    if (opt === '*' || opt === undefined) return '*';
    if (opt === true) return requestOrigin || null;
    if (opt === false) return null;
    if (typeof opt === 'string') return opt;
    if (Array.isArray(opt)) return requestOrigin && opt.includes(requestOrigin) ? requestOrigin : null;
    return null;
  }

  /* The headers the cors middleware adds (Vary values are merged into one header, as the
     `vary` helper it uses does). options null = no cors middleware. */
  function corsHeaders(options, requestOrigin, { preflight = false, requestHeaders = '' } = {}) {
    if (!options) return [];
    const h = [];
    const vary = [];
    const acao = originHeader(options.origin, requestOrigin);
    if (acao) h.push(['Access-Control-Allow-Origin', acao]);
    if (options.origin !== '*' && options.origin !== undefined) vary.push('Origin');
    if (options.credentials) h.push(['Access-Control-Allow-Credentials', 'true']);
    if (preflight) {
      h.push(['Access-Control-Allow-Methods', (options.methods || CORS_DEFAULT_METHODS).join(',')]);
      if (options.allowedHeaders && options.allowedHeaders.length) h.push(['Access-Control-Allow-Headers', options.allowedHeaders.join(',')]);
      else if (requestHeaders) { h.push(['Access-Control-Allow-Headers', requestHeaders]); vary.push('Access-Control-Request-Headers'); }
      if (options.maxAge !== undefined && options.maxAge !== null && options.maxAge !== '') h.push(['Access-Control-Max-Age', String(options.maxAge)]);
    }
    if (vary.length) h.push(['Vary', vary.join(', ')]);
    return h;
  }

  const header = (list, name) => {
    const hit = list.find(([n]) => n.toLowerCase() === name.toLowerCase());
    return hit ? hit[1] : null;
  };

  /* The browser's CORS check on a response (preflight or actual). → null when it passes, else a failure. */
  function corsCheck(headers, origin, credentials) {
    const acao = header(headers, 'Access-Control-Allow-Origin');
    if (acao === null) return { code: 'no-acao', reason: "No 'Access-Control-Allow-Origin' header is present on the requested resource." };
    if (acao === '*' && credentials) return { code: 'wildcard-credentials', reason: "The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'." };
    if (acao !== '*' && acao !== origin) return { code: 'mismatch', value: acao, reason: `The 'Access-Control-Allow-Origin' header has a value '${acao}' that is not equal to the supplied origin.` };
    if (credentials && header(headers, 'Access-Control-Allow-Credentials') !== 'true') {
      return { code: 'no-credentials', reason: `The value of the 'Access-Control-Allow-Credentials' header in the response is '${header(headers, 'Access-Control-Allow-Credentials') || ''}' which must be 'true' when the request's credentials mode is 'include'.` };
    }
    return null;
  }

  const splitList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

  /* Simulates one fetch() from a page (or one curl call) against an Express app with `options`.
     req = { client: 'browser' | 'curl', page, url, method, headers: [[n, v]], credentials }
     → { error, client, page, api, compare, sameOrigin, kind, preflight, actual, readable, fail, executed } */
  function simulate(req, options) {
    const client = req.client === 'curl' ? 'curl' : 'browser';
    const api = parseOrigin(req.url);
    const page = client === 'browser' ? parseOrigin(req.page) : { ok: true };
    const r = { error: '', client, page, api, compare: null, sameOrigin: false, kind: null, preflight: null, actual: null, readable: false, fail: null, executed: false };
    if (!api.ok) { r.error = `API URL: ${api.error}.`; return r; }
    if (!page.ok) { r.error = `Page origin: ${page.error}.`; return r; }
    const method = String(req.method || 'GET').toUpperCase();
    const headers = (req.headers || []).filter(([n]) => n);
    const credentials = !!req.credentials;
    const [code, text] = STATUS[method] || [200, 'OK'];
    const body = method !== 'DELETE' && method !== 'HEAD';
    const response = (extra) => ({ status: code, statusText: text, headers: [...(body ? [['Content-Type', 'application/json; charset=utf-8']] : []), ...extra] });

    if (client === 'curl') {
      r.kind = 'none';
      r.actual = { sent: true, request: { line: `${method} ${api.path}`, headers: [['Host', `${api.host}${api.explicitPort ? `:${api.port}` : ''}`], ...headers] }, response: response(corsHeaders(options, null)) };
      r.readable = true;
      r.executed = true;
      return r;
    }

    r.compare = compareOrigins(page, api);
    r.sameOrigin = r.compare.same;
    const host = ['Host', `${api.host}${api.explicitPort ? `:${api.port}` : ''}`];
    const cookie = credentials || r.sameOrigin ? [['Cookie', 'sid=…']] : [];
    if (r.sameOrigin) {
      r.kind = 'same-origin';
      r.actual = { sent: true, request: { line: `${method} ${api.path}`, headers: [host, ...headers, ...cookie] }, response: response(corsHeaders(options, page.origin)) };
      r.readable = true;
      r.executed = true;
      return r;
    }

    const cls = classify({ method, headers });
    r.kind = cls.simple ? 'simple' : 'preflight';
    r.classify = cls;
    const originH = ['Origin', page.origin];

    if (!cls.simple) {
      const reqHeaders = cls.unsafeHeaders.join(',');
      const pfReq = [host, originH, ['Access-Control-Request-Method', method], ...(reqHeaders ? [['Access-Control-Request-Headers', reqHeaders]] : [])];
      const pfRes = options
        ? { status: 204, statusText: 'No Content', headers: [...corsHeaders(options, page.origin, { preflight: true, requestHeaders: reqHeaders }), ['Content-Length', '0']] }
        : { status: 200, statusText: 'OK', headers: [['Allow', 'GET,HEAD,POST,PUT,PATCH,DELETE'], ['Content-Type', 'text/html; charset=utf-8']] };
      let fail = corsCheck(pfRes.headers, page.origin, credentials);
      if (!fail) {
        const allowM = splitList(header(pfRes.headers, 'Access-Control-Allow-Methods'));
        const starM = allowM.includes('*') && !credentials;
        if (!SAFE_METHODS.includes(method) && !allowM.includes(method) && !starM) fail = { code: 'method', method, reason: `Method ${method} is not allowed by Access-Control-Allow-Methods in preflight response.` };
      }
      if (!fail) {
        const allowH = splitList(header(pfRes.headers, 'Access-Control-Allow-Headers')).map((x) => x.toLowerCase());
        const starH = allowH.includes('*') && !credentials;
        const missing = cls.unsafeHeaders.find((n) => !allowH.includes(n) && !(starH && n !== 'authorization'));
        if (missing) fail = { code: 'header', header: missing, reason: `Request header field ${missing} is not allowed by Access-Control-Allow-Headers in preflight response.` };
      }
      r.preflight = { request: { line: `OPTIONS ${api.path}`, headers: pfReq }, response: pfRes, ok: !fail, fail };
      if (fail) {
        r.fail = { ...fail, stage: 'preflight', console: consoleMessage(req.url, page.origin, fail, true, method) };
        r.actual = { sent: false };
        r.executed = false;
        return r;
      }
    }

    const actualRes = response(corsHeaders(options, page.origin));
    r.actual = { sent: true, request: { line: `${method} ${api.path}`, headers: [host, originH, ...headers, ...(credentials ? cookie : [])] }, response: actualRes };
    r.executed = true;
    const fail = corsCheck(actualRes.headers, page.origin, credentials);
    if (fail) r.fail = { ...fail, stage: 'response', console: consoleMessage(req.url, page.origin, fail, false, method, actualRes) };
    r.readable = !fail;
    return r;
  }

  function consoleMessage(url, origin, fail, preflight, method, res) {
    const head = `Access to fetch at '${url}' from origin '${origin}' has been blocked by CORS policy: `;
    const inPre = preflight && fail.code !== 'method' && fail.code !== 'header';
    const tail = fail.code === 'no-acao' && !preflight ? " If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled." : '';
    const net = `${method} ${url} net::ERR_FAILED${res ? ` ${res.status} (${res.statusText})` : ''}`;
    return [`${head}${inPre ? "Response to preflight request doesn't pass access control check: " : ''}${fail.reason}${tail}`, net];
  }

  /* ---------------------------------------------------------------- cors() config as code, and fixes */

  const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
  const arr = (a) => `[${a.map(q).join(', ')}]`;
  const sameList = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);

  /* The Express line that builds this configuration. */
  function configCode(options) {
    if (!options) return '// no cors middleware: the API sends no CORS headers';
    const parts = [];
    const o = options.origin;
    if (o !== '*' && o !== undefined) parts.push(`origin: ${Array.isArray(o) ? arr(o) : typeof o === 'string' ? q(o) : String(o)}`);
    if (options.methods && !sameList(options.methods, CORS_DEFAULT_METHODS)) parts.push(`methods: ${arr(options.methods)}`);
    if (options.allowedHeaders && options.allowedHeaders.length) parts.push(`allowedHeaders: ${arr(options.allowedHeaders)}`);
    if (options.credentials) parts.push('credentials: true');
    if (options.maxAge !== undefined && options.maxAge !== null && options.maxAge !== '') parts.push(`maxAge: ${Number(options.maxAge)}`);
    if (!parts.length) return 'app.use(cors());';
    return `app.use(cors({\n${parts.map((p) => `  ${p},`).join('\n')}\n}));`;
  }

  /* The smallest change to `options` that removes this failure (null when there is none). */
  function fix(result, options, req) {
    const f = result && result.fail;
    if (!f) return null;
    const origin = result.page.origin;
    if (!options) return { origin, ...(req && req.credentials ? { credentials: true } : {}) };
    const o = { ...options };
    if (f.code === 'no-acao' || f.code === 'mismatch') o.origin = Array.isArray(o.origin) ? [...o.origin, origin] : origin;
    else if (f.code === 'wildcard-credentials') { o.origin = origin; o.credentials = true; }
    else if (f.code === 'no-credentials') { o.credentials = true; if (o.origin === true) o.origin = origin; }   // never echo any origin with cookies
    else if (f.code === 'method') o.methods = [...(o.methods || CORS_DEFAULT_METHODS), f.method];
    else if (f.code === 'header' && o.allowedHeaders && o.allowedHeaders.length) {
      o.allowedHeaders = [...o.allowedHeaders, { authorization: 'Authorization', 'content-type': 'Content-Type' }[f.header] || f.header];
    }
    return o;
  }

  /* Applies fix() until the request is readable (at most 5 rounds). → { options, steps, readable } */
  function fixAll(req, options) {
    let o = options;
    let steps = 0;
    let r = simulate(req, o);
    while (!r.readable && !r.error && steps < 5) {
      const next = fix(r, o, req);
      if (!next) break;
      o = next;
      steps++;
      r = simulate(req, o);
    }
    return { options: o, steps, readable: r.readable };
  }

  return {
    // base64url and JWT
    bytesToB64url, b64urlToBytes, textToB64url, b64urlToText, toHex,
    parse, claims, relTime, timeCheck, sign, verify, withPayload, hmacSha256, hasCrypto, CLAIMS,
    // hashing
    randomSalt, pbkdf2, sha256Hex, attack, formatDuration, formatCount,
    // CORS
    parseOrigin, compareOrigins, classify, corsHeaders, corsCheck, simulate, configCode, fix, fixAll,
    CORS_DEFAULT_METHODS, SAFE_METHODS, SAFE_CONTENT_TYPES,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AuthEngine;
