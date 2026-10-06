'use strict';

/* ==========================================================================
   Authentication and security tools. Logic: js/tools/auth-engine.js.

   jwt-inspector  decode a JWT (no secret needed), explain every claim against a
                  clock the learner can shift, verify the HS256 signature with a
                  typed secret, tamper with the payload, and sign new tokens.
   hash-cost      PBKDF2-SHA-256 with a random salt and a 2^n cost (WebCrypto,
                  asynchronous and capped at ~2 s), compared with one plain
                  SHA-256, translated into an attacker's guessing speed.
   cors-sim       a fetch() from a page origin to an API with a cors() config:
                  same-origin check, simple vs preflight, both HTTP exchanges,
                  the verdict, Chrome's console message and the fix.
                  Challenges: challengeStore 'cors-challenges-v1'.
   Actions carry the prefixes jw-, hc- and co-. Typing repaints only the
   data-part output areas; structural changes use Tools.refresh.
   ========================================================================== */

(() => {
  const A = AuthEngine;
  const nowSec = () => Math.floor(Date.now() / 1000);
  const okIcon = (ok) => (ok ? ICON.ok : ICON.bad);
  const noCryptoHtml = () => `<p class="tl-explain au-warn" role="note">${md(t('**Signatures and hashes are switched off here.** They use the browser\'s built-in WebCrypto, which browsers only enable on `https://` pages and on `http://localhost`. Open the site from a local server (`npm run site:serve`) or the published site. Decoding still works: it needs no secret.'))}</p>`;
  const fmtDate = (sec) => {
    try { return new Date(sec * 1000).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { return String(sec); }
  };
  const jsonPretty = (obj) => JSON.stringify(obj, null, 2);

  /* ======================================================================
     1. JWT inspector
     ====================================================================== */

  const JWT_IO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const DEV_SECRET = 'dev-secret-change-me';
  /* Fallbacks when WebCrypto is missing (signed offline with DEV_SECRET, 5 Oct 2026). */
  const STATIC = {
    lab: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQyLCJyb2xlIjoidXNlciIsImlhdCI6MTc5MTE1ODQwMCwiZXhwIjoxNzkxMTYyMDAwfQ.bBwfXwjhhrhPSKKxeaPU5XOLPbHELTwSvnraJ3NX13s',
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQyLCJyb2xlIjoidXNlciIsImlhdCI6MTc5MTE1MTIwMCwiZXhwIjoxNzkxMTU0ODAwfQ.9z_2gr91JWN7WJiURbtTvHVkczJiDbpNpAZXsMAWk90',
  };
  const NONE_TOKEN = `${A.textToB64url('{"alg":"none","typ":"JWT"}')}.${A.textToB64url('{"sub":42,"role":"admin"}')}.`;
  const SAMPLES = [
    ['lab', 'Login token'],
    ['expired', 'Expired token'],
    ['jwtio', 'jwt.io example'],
    ['none', 'alg: none (unsigned)'],
  ];

  const jw = {
    mode: 'decode', token: JWT_IO, secret: 'your-256-bit-secret', offset: 0,
    res: null, resKey: '', seq: 0, note: '',
    build: { payload: '{\n  "sub": 42,\n  "role": "user"\n}', secret: DEV_SECRET, expiresIn: 3600, iat: true, token: '', error: '', payloadOut: null },
  };
  const jwNow = () => nowSec() + jw.offset;
  const verifyKey = () => `${jw.token}\u0000${jw.secret}\u0000${jwNow()}`;

  /* Re-runs the (async) signature check; paints when the newest answer arrives. */
  function reverify(root, announce) {
    const key = verifyKey();
    const seq = ++jw.seq;
    A.verify(jw.token, jw.secret, { now: jwNow() }).then((res) => {
      if (seq !== jw.seq) return;
      jw.res = res;
      jw.resKey = key;
      Tools.paint(root, { 'jw-verify': verifyHtml });
      if (announce) Tools.say(root, verdictText(res));
    }).catch(() => { /* a failed import/sign: the verify part keeps its last state */ });
  }

  function partsHtml(p) {
    const segs = jw.token.trim().split('.');
    const label = [t('Header'), t('Payload'), t('Signature')];
    return `<p class="jw-token" aria-label="${esc(t('The token split into its three parts'))}">${segs.slice(0, 3).map((s, k) => `${k ? '<span class="jw-dot" aria-hidden="true">.</span>' : ''}<span class="jw-seg jw-c${k + 1}"><span class="sr-only">${esc(label[k])}: </span>${esc(s) || `<em>${esc(t('(empty)'))}</em>`}</span>`).join('')}</p>
      <ol class="jw-parts">
        <li class="jw-part jw-b1"><p class="jw-head"><span class="jw-tag jw-c1">1 · ${esc(t('Header'))}</span> <span class="muted small">${esc(t('base64url of a JSON object: which algorithm signed the token'))}</span></p>
          <pre class="jw-json">${esc(jsonPretty(p.header))}</pre></li>
        <li class="jw-part jw-b2"><p class="jw-head"><span class="jw-tag jw-c2">2 · ${esc(t('Payload'))}</span> <span class="muted small">${esc(t('base64url of a JSON object: the claims. Anyone can read this.'))}</span></p>
          <pre class="jw-json">${esc(jsonPretty(p.payload))}</pre></li>
        <li class="jw-part jw-b3"><p class="jw-head"><span class="jw-tag jw-c3">3 · ${esc(t('Signature'))}</span> <span class="muted small">${esc(t('HMAC-SHA256(part 1 + "." + part 2, secret), in base64url'))}</span></p>
          <p class="jw-sigtext">${p.signature ? md(t('{n} bytes of binary data. It decodes to nothing readable: it can only be **recomputed** with the secret and compared.', { n: A.b64urlToBytes(p.signature).length })) : md(t('**Empty.** This token is not signed at all.'))}</p></li>
      </ol>`;
  }

  function claimsHtml(p) {
    const rows = A.claims(p.payload, jwNow());
    if (!rows.length) return `<p class="muted">${esc(t('The payload has no claims.'))}</p>`;
    const status = (r) => {
      if (!r.time) return '';
      if (r.time.status === 'invalid') return `<span class="tl-bad">${esc(t(r.time.text))}</span>`;
      const ok = r.time.status === 'valid' || r.time.status === 'past';
      const cls = r.time.status === 'expired' || r.time.status === 'not-yet' || r.time.status === 'future' ? 'tl-bad' : ok ? 'tl-ok' : '';
      return `<span class="jw-date">${esc(fmtDate(r.time.seconds))}</span><br><span class="${cls}">${esc(t(r.time.text))}</span>`;
    };
    return `<div class="scroll"><table class="src jw-claims"><caption>${esc(t('Claims in the payload, checked against the clock below'))}</caption>
      <thead><tr><th scope="col">${esc(t('Claim'))}</th><th scope="col">${esc(t('Value'))}</th><th scope="col">${esc(t('Meaning'))}</th><th scope="col">${esc(t('Time check'))}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row"><code>${esc(r.name)}</code></th><td><code>${esc(JSON.stringify(r.value))}</code></td><td><strong>${esc(t(r.label))}.</strong> ${md(t(r.meaning))}</td><td>${status(r)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function decodedHtml() {
    const p = A.parse(jw.token);
    if (!p.ok) return `<p class="tl-bad" role="alert">${esc(t(p.error))}</p>`;
    return `${partsHtml(p)}
      <p class="tl-explain">${md(t('Everything above was decoded **without the secret**. A JWT is signed, not encrypted: never put a password or other secret in the payload.'))}</p>
      ${claimsHtml(p)}
      <p class="lr-actions"><button type="button" class="btn ghost small-btn" data-action="jw-tamper" data-fid="jw-tamper">${esc(t('Tamper: change the role without re-signing'))}</button></p>`;
  }

  function verdictText(r) {
    if (!r) return '';
    return {
      valid: t('Signature valid and the token is in date.'),
      'bad-signature': t('Invalid signature.'),
      expired: t('Signature valid, but the token has expired.'),
      'not-before': t('Signature valid, but the token is not active yet.'),
      'bad-claim': t('Signature valid, but a time claim is not a number.'),
      'alg-none': t('Rejected: alg none means the token is not signed.'),
      'alg-unsupported': t('This tool verifies HS256 only.'),
      'no-secret': t('Type the secret to check the signature.'),
      'no-crypto': t('Signature checks need WebCrypto (https or localhost).'),
      malformed: t('Not a well-formed JWT.'),
    }[r.status] || '';
  }

  function verifyHtml() {
    const r = jw.res;
    if (!r || jw.resKey !== verifyKey()) return `<p class="muted" aria-busy="true">${esc(t('Checking the signature…'))}</p>`;
    const payload = r.parsed && r.parsed.payload ? JSON.stringify(r.parsed.payload) : '';
    const alg = r.parsed && r.parsed.header ? String(r.parsed.header.alg) : '';
    const lines = {
      valid: ['ok', t('`jwt.verify(token, secret)` returns the payload, so the auth middleware sets `req.user = {p}` and calls `next()`.', { p: payload })],
      'bad-signature': ['bad', t('Recomputing HMAC-SHA256 over parts 1 and 2 with this secret gives `{e}`, which is not the signature in the token. Either the secret is wrong or someone changed the header or payload. `jwt.verify` throws `JsonWebTokenError: invalid signature`, and the middleware answers **401**.', { e: r.expected })],
      expired: ['bad', t('`jwt.verify` throws `TokenExpiredError: jwt expired` and the middleware answers **401**. The client must log in again to get a new token. Move the clock back to see it pass.')],
      'not-before': ['bad', t('`jwt.verify` throws `NotBeforeError: jwt not active` (**401**).')],
      'bad-claim': ['bad', t('`exp` and `nbf` must be numbers of seconds; `jwt.verify` refuses the token.')],
      'alg-none': ['bad', t('`"alg": "none"` means "not signed": anyone could have written this token, including `"role": "admin"`. A server must refuse it. `jsonwebtoken` does (`jwt signature is required`), and you can make the rule explicit with `jwt.verify(token, secret, { algorithms: [\'HS256\'] })`.')],
      'alg-unsupported': ['note', t('The header says `{a}`. This tool checks HS256 only, the algorithm `jwt.sign` uses by default with a shared secret (the usual choice for a single API). RS256 and ES256 sign with a private key and verify with a public key.', { a: alg })],
      'no-secret': ['note', t('Decoding needed no secret; checking the signature does. The server keeps it in `process.env.JWT_SECRET`.')],
      'no-crypto': ['note', t('Open the site over https or from localhost to verify and sign tokens.')],
      malformed: ['bad', t('`jwt.verify` throws `JsonWebTokenError: jwt malformed` (**401**).')],
    }[r.status] || ['note', ''];
    const ok = r.status === 'valid';
    return `<div class="au-verdict ${ok ? 'is-ok' : lines[0] === 'bad' ? 'is-bad' : 'is-note'}">
        <p class="au-verdict-h">${ICON[lines[0]]}<strong>${esc(verdictText(r))}</strong></p>
        <p>${md(lines[1])}</p>
        ${r.signature !== 'unchecked' ? `<p class="small">${md(t('Signature check: **{s}** · time check: **{c}**', { s: r.signature === 'valid' ? t('passed') : t('failed'), c: r.status === 'valid' ? t('passed') : r.signature === 'valid' ? t('failed') : t('not reached') }))}</p>` : ''}
      </div>`;
  }

  function clockHtml() {
    const shift = jw.offset ? (jw.offset > 0 ? `+${A.relTime(jw.offset)}` : `−${A.relTime(jw.offset)}`) : '';
    return `<p class="jw-now"><strong>${esc(t('Clock'))}:</strong> ${esc(fmtDate(jwNow()))} <span class="muted">(${esc(shift ? t('shifted {s}', { s: shift }) : t('real time'))})</span></p>`;
  }

  function buildHtml() {
    const b = jw.build;
    if (b.error) return `<p class="tl-bad" role="alert">${esc(b.error)}</p>`;
    if (!b.token) return `<p class="muted">${esc(t('Edit the payload and press Sign.'))}</p>`;
    const user = { ...b.payloadOut };
    delete user.iat;
    delete user.exp;
    const opts = b.expiresIn > 0 ? `,\n  { expiresIn: ${b.expiresIn} }   // seconds; "1h" means the same` : '';
    return `<p class="lr-label">${esc(t('Your signed token'))}</p>
      <p class="jw-token">${b.token.split('.').map((s, k) => `${k ? '<span class="jw-dot" aria-hidden="true">.</span>' : ''}<span class="jw-seg jw-c${k + 1}"><span class="sr-only">${esc([t('Header'), t('Payload'), t('Signature')][k])}: </span>${esc(s)}</span>`).join('')}</p>
      <p class="lr-label">${esc(t('The same thing in Node (jsonwebtoken)'))}</p>
      <pre class="tl-out">${esc(`const token = jwt.sign(\n  ${JSON.stringify(user)},\n  process.env.JWT_SECRET${opts}\n);\n// payload actually signed: ${JSON.stringify(b.payloadOut)}`)}</pre>
      <p class="lr-actions"><button type="button" class="btn small-btn" data-action="jw-open" data-fid="jw-open">${esc(t('Inspect it in the decoder'))}</button></p>`;
  }

  async function signBuilt(root) {
    const b = jw.build;
    b.error = '';
    let payload;
    try { payload = JSON.parse(b.payload); } catch (e) { b.error = t('The payload is not valid JSON: {m}', { m: e.message }); }
    if (!b.error && (!payload || typeof payload !== 'object' || Array.isArray(payload))) b.error = t('The payload must be a JSON object, like { "sub": 42 }.');
    if (!b.error && !b.secret) b.error = t('Type a secret: jwt.sign refuses to sign without one.');
    if (!b.error && !A.hasCrypto()) b.error = t('Signing needs WebCrypto: open the site over https or from localhost.');
    if (b.error) { b.token = ''; Tools.paint(root, { 'jw-built': buildHtml }); Tools.say(root, b.error); return; }
    const out = { ...payload };
    if (b.iat) out.iat = jwNow();
    if (b.expiresIn > 0) out.exp = (typeof out.iat === 'number' ? out.iat : jwNow()) + b.expiresIn;
    b.payloadOut = out;
    b.token = await A.sign(out, b.secret);
    Tools.paint(root, { 'jw-built': buildHtml });
    Tools.say(root, t('Token signed.'));
  }

  async function loadSample(id, root) {
    jw.offset = 0;
    if (id === 'jwtio') { jw.token = JWT_IO; jw.secret = 'your-256-bit-secret'; jw.note = t('The example token from jwt.io; its secret is `your-256-bit-secret`. It has no `exp`, so it never expires: a bad idea for real tokens.'); }
    else if (id === 'none') { jw.token = NONE_TOKEN; jw.secret = DEV_SECRET; jw.note = t('An unsigned token claiming `role: admin`. Decoding it is easy; trusting it would be a disaster.'); }
    else {
      const now = nowSec();
      const payload = id === 'expired' ? { sub: 42, role: 'user', iat: now - 7200, exp: now - 3600 } : { sub: 42, role: 'user', iat: now - 300, exp: now - 300 + 3600 };
      jw.token = A.hasCrypto() ? await A.sign(payload, DEV_SECRET) : STATIC[id];
      jw.secret = DEV_SECRET;
      jw.note = id === 'expired'
        ? t('Signed with the development fallback secret two hours ago, with `expiresIn: "1h"`.')
        : t('What a typical Express login returns: `jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" })`, signed 5 minutes ago with the dev fallback secret `dev-secret-change-me`.');
    }
    jw.res = null;
    Tools.refresh('jwt-inspector');
    reverify(root, true);
  }

  Tools.register('jwt-inspector', {
    title: 'JWT inspector',
    intro: 'A JWT is three base64url parts: **header.payload.signature**. Decode one (no secret needed), check its claims against a clock, verify the signature with a secret, then forge one and watch the signature fail.',
    body() {
      const decode = jw.mode === 'decode';
      return `
        ${Tools.seg({ label: t('Mode'), action: 'jw-mode', prop: 'mode', values: [['decode', t('Decode and verify')], ['build', t('Build and sign')]], current: jw.mode, fid: 'jw-mode', mono: false })}
        ${A.hasCrypto() ? '' : noCryptoHtml()}
        ${decode ? `
        <div class="tl-row au-samples" role="group" aria-label="${esc(t('Sample tokens'))}">
          ${SAMPLES.map(([k, l]) => `<button type="button" class="tl-chip" data-action="jw-sample" data-v="${k}" data-fid="jw-s-${k}">${esc(t(l))}</button>`).join('')}
        </div>
        ${jw.note ? `<p class="small muted">${md(jw.note)}</p>` : ''}
        <div class="tl-field"><label for="jw-token">${esc(t('Token (paste one, or edit a character)'))}</label>
          <textarea class="tl-code jw-input" id="jw-token" data-fid="jw-token" data-jw="token" rows="4" spellcheck="false" autocomplete="off">${esc(jw.token)}</textarea></div>
        <div data-part="jw-decoded">${decodedHtml()}</div>
        <h4 class="tl-sub">${esc(t('Verify the signature'))}</h4>
        <div class="tl-field"><label for="jw-secret">${esc(t('Secret (the server\'s JWT_SECRET)'))}</label>
          <input class="tl-input" id="jw-secret" data-fid="jw-secret" data-jw="secret" value="${esc(jw.secret)}" spellcheck="false" autocomplete="off"></div>
        <div data-part="jw-verify" aria-live="off">${verifyHtml()}</div>
        <h4 class="tl-sub">${esc(t('Shift the clock'))}</h4>
        <div data-part="jw-clock">${clockHtml()}</div>
        <div class="tl-row jw-clockbtns" role="group" aria-label="${esc(t('Shift the clock'))}">
          ${[[-86400, '−1 day'], [-3600, '−1 h'], [3600, '+1 h'], [86400, '+1 day']].map(([d, l]) => `<button type="button" class="btn ghost small-btn" data-action="jw-clock" data-v="${d}" data-fid="jw-clock-${d}">${esc(t(l))}</button>`).join('')}
          <button type="button" class="btn ghost small-btn" data-action="jw-clock" data-v="0" data-fid="jw-clock-0">${esc(t('Real time'))}</button>
        </div>` : `
        <p class="tl-goal">${md(t('This is what the server does at login. The header is fixed to `{"alg":"HS256","typ":"JWT"}`. `jwt.sign` adds `iat` (now) and, with `expiresIn`, `exp` = `iat` + the seconds you give.'))}</p>
        <div class="tl-cols">
          <div class="tl-field"><label for="jw-bpayload">${esc(t('Payload (JSON)'))}</label>
            <textarea class="tl-code" id="jw-bpayload" data-fid="jw-bpayload" data-jwb="payload" rows="7" spellcheck="false">${esc(jw.build.payload)}</textarea></div>
          <div>
            <div class="tl-field"><label for="jw-bsecret">${esc(t('Secret'))}</label>
              <input class="tl-input" id="jw-bsecret" data-fid="jw-bsecret" data-jwb="secret" value="${esc(jw.build.secret)}" spellcheck="false" autocomplete="off"></div>
            ${Tools.num({ label: t('expiresIn (seconds, 0 = never)'), fid: 'jw-bexp', value: jw.build.expiresIn, min: 0, step: 60, data: { jwb: 'expiresIn' } })}
            <label class="tl-check"><input type="checkbox" data-fid="jw-biat" data-jwb="iat"${jw.build.iat ? ' checked' : ''}> ${esc(t('Add iat (issued at) like jwt.sign does'))}</label>
            <p class="lr-actions"><button type="button" class="btn" data-action="jw-sign" data-fid="jw-sign">${esc(t('Sign'))}</button></p>
          </div>
        </div>
        <div data-part="jw-built">${buildHtml()}</div>`}`;
    },
    mount(root) {
      if (jw.mode === 'decode' && jw.resKey !== verifyKey()) reverify(root, false);
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'jw-mode') { jw.mode = el.dataset.v; Tools.refresh('jwt-inspector'); Tools.say(root, el.textContent); }
      else if (a === 'jw-sample') loadSample(el.dataset.v, root);
      else if (a === 'jw-clock') {
        const d = Number(el.dataset.v);
        jw.offset = d ? jw.offset + d : 0;
        Tools.paint(root, { 'jw-clock': clockHtml, 'jw-decoded': decodedHtml });
        reverify(root, false);
        Tools.say(root, t('Clock: {d}', { d: fmtDate(jwNow()) }));
      } else if (a === 'jw-tamper') {
        const p = A.parse(jw.token);
        if (!p.ok) return;
        const payload = { ...p.payload, role: p.payload.role === 'admin' ? 'user' : 'admin' };
        jw.token = A.withPayload(jw.token, payload);
        jw.note = t('The payload now says `role: {r}`, but the signature is still the old one, computed over the old payload. Look at the verdict.', { r: payload.role });
        Tools.refresh('jwt-inspector');
        reverify(root, true);
      } else if (a === 'jw-sign') signBuilt(root);
      else if (a === 'jw-open') {
        jw.mode = 'decode';
        jw.token = jw.build.token;
        jw.secret = jw.build.secret;
        jw.offset = 0;
        jw.note = t('Your token from the builder.');
        Tools.refresh('jwt-inspector');
        root.querySelector('#jw-token')?.focus();
      }
    },
    onInput(e, root) {
      const k = e.target.dataset.jw;
      const kb = e.target.dataset.jwb;
      if (k) {
        jw[k] = e.target.value;
        if (k === 'token') { jw.note = ''; Tools.paint(root, { 'jw-decoded': decodedHtml }); }
        Tools.paint(root, { 'jw-verify': verifyHtml });
        reverifySoon(root);
      } else if (kb === 'payload' || kb === 'secret') jw.build[kb] = e.target.value;
      else if (kb === 'expiresIn') jw.build.expiresIn = Math.max(0, Math.floor(Number(e.target.value) || 0));
    },
    onChange(e) {
      if (e.target.dataset.jwb === 'iat') jw.build.iat = e.target.checked;
    },
  });
  const reverifySoon = debounce((root) => reverify(root, true), 250);

  /* ======================================================================
     2. Password hashing cost
     ====================================================================== */

  const HC_MIN = 10;
  const HC_MAX = 22;
  const HC_BUDGET_MS = 2200;        // both hashes together; above this the run is refused
  const WORKERS = [[1, '1 core (this device)'], [100, '100 cores'], [10000, '10,000 cores (a GPU farm)']];

  const hc = { password: 'correct horse battery staple', cost: 16, workers: 1, busy: false, done: 0, res: null, msPerIter: null, error: '', attempt: 'correct horse battery stapel', login: null, loginBusy: false };
  const iters = (n) => 2 ** n;

  function costInfo() {
    const n = hc.cost;
    const est = hc.msPerIter ? iters(n) * hc.msPerIter : null;
    return `<p class="small">${md(t('**2^{n} = {i} iterations** of HMAC-SHA-256. Each +1 doubles the work, exactly like bcrypt\'s cost factor (bcrypt cost 10 = 2^10 rounds of its own, much heavier, step).', { n, i: iters(n).toLocaleString('en-US') }))}${est ? ` ${esc(t('Estimated on this device: about {t} per hash.', { t: A.formatDuration(est / 1000) }))}` : ''}</p>`;
  }

  function statusHtmlHc() {
    if (hc.busy) return `<p class="hc-status" aria-busy="true"><progress max="2" value="${hc.done}" aria-label="${esc(t('Hashing progress'))}"></progress> ${esc(t('Hashing… {d} of 2 hashes done (2^{n} iterations each)', { d: hc.done, n: hc.cost }))}</p>`;
    if (hc.error) return `<p class="tl-bad" role="alert">${esc(hc.error)}</p>`;
    return '';
  }

  function attackRows(r) {
    const shaMs = r.msPerIter / 2;           // one PBKDF2 iteration = one HMAC = two SHA-256 computations
    const slowMs = (r.a.ms + r.b.ms) / 2;
    return [
      [t('SHA-256, no salt (one fast hash)'), shaMs],
      [t('PBKDF2-SHA-256, 2^{n} iterations, salted', { n: r.cost }), slowMs],
    ].map(([label, ms]) => {
      const at = A.attack(ms, hc.workers);
      return `<tr><th scope="row">${esc(label)}</th><td>${esc(A.formatDuration(ms / 1000))}</td><td>${esc(A.formatCount(at.perSecond))}</td><td><strong>${esc(A.formatDuration(at.billionSeconds))}</strong></td></tr>`;
    }).join('');
  }

  function outHc() {
    const r = hc.res;
    if (!r) return `<p class="muted">${esc(t('Press the button to hash the password twice, each time with a new random salt.'))}</p>`;
    const same = r.a.hash === r.b.hash;
    const stored = (x) => `pbkdf2-sha256$${r.iterations}$${x.saltB64}$${x.hashB64}`;
    return `
      <div class="scroll"><table class="src hc-table"><caption>${esc(t('The same password, hashed twice with 2^{n} = {i} iterations', { n: r.cost, i: r.iterations.toLocaleString('en-US') }))}</caption>
        <thead><tr><th scope="col">${esc(t('Run'))}</th><th scope="col">${esc(t('Random salt (hex)'))}</th><th scope="col">${esc(t('Hash (hex)'))}</th><th scope="col">${esc(t('Time'))}</th></tr></thead>
        <tbody>${[['A', r.a], ['B', r.b]].map(([k, x]) => `<tr><th scope="row">${k}</th><td><code class="hc-hex">${esc(x.salt)}</code></td><td><code class="hc-hex">${esc(x.hash)}</code></td><td>${esc(A.formatDuration(x.ms / 1000))}</td></tr>`).join('')}</tbody></table></div>
      <p class="tl-explain">${md(same ? t('The hashes are equal (that should never happen with random salts).') : t('**Same password, different hashes**, because the salts differ. Two users with the same password do not look alike in the database, and an attacker cannot use one precomputed table for everybody: every guess must be hashed again for every user.'))}</p>
      <p class="lr-label">${esc(t('What the database stores for run A (one string: algorithm, cost, salt, hash)'))}</p>
      <pre class="tl-out hc-stored">${esc(stored(r.a))}</pre>
      <p class="small">${md(t('bcrypt packs the same four things into one 60-character string, e.g. `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`: `2b` = algorithm version, `10` = cost, then 22 characters of salt and 31 of hash. That is why `bcrypt.compare(password, hash)` needs no separate salt column.'))}</p>
      <p class="lr-label">${esc(t('Plain SHA-256 of the same password (no salt)'))}</p>
      <pre class="tl-out hc-stored">${esc(r.sha)}</pre>
      <p class="small">${md(t('Identical for every user and every run: whoever has seen this hash once (in a leaked database or a lookup table) knows the password.'))}</p>

      <h4 class="tl-sub">${esc(t('What it means for an attacker with a stolen database'))}</h4>
      ${Tools.seg({ label: t('Attacker hardware'), action: 'hc-workers', prop: 'workers', values: WORKERS.map(([v, l]) => [v, t(l)]), current: hc.workers, fid: 'hc-workers', mono: false })}
      <div class="scroll"><table class="src hc-attack"><caption>${esc(t('Guessing speed per stored hash'))}</caption>
        <thead><tr><th scope="col">${esc(t('Hash'))}</th><th scope="col">${esc(t('Time per guess'))}</th><th scope="col">${esc(t('Guesses per second'))}</th><th scope="col">${esc(t('Time to try 1 billion passwords'))}</th></tr></thead>
        <tbody>${attackRows(r)}</tbody></table></div>
      <ul class="small hc-assume">
        <li>${md(t('**Assumptions.** Each core guesses as fast as your browser did here, and the cores work in parallel. One billion guesses covers a large leaked-password list plus common variations.'))}</li>
        <li>${md(t('The SHA-256 time is derived from the measurement: one PBKDF2 iteration is one HMAC, i.e. **two** SHA-256 computations, so one SHA-256 ≈ half the time of one iteration.'))}</li>
        <li>${md(t('Real attackers use GPUs, which speed up SHA-256 and PBKDF2 enormously. bcrypt and especially argon2 are designed to resist GPUs (argon2 also needs lots of memory per guess), which is why Node APIs usually use bcrypt or argon2 rather than PBKDF2.'))}</li>
      </ul>

      <h4 class="tl-sub">${esc(t('Log in: hash the attempt with the stored salt and compare'))}</h4>
      <div class="tl-row">
        <div class="tl-field hc-attempt"><label for="hc-attempt">${esc(t('Log-in attempt'))}</label>
          <input class="tl-input" id="hc-attempt" data-fid="hc-attempt" data-hc="attempt" value="${esc(hc.attempt)}" spellcheck="false" autocomplete="off"></div>
        <button type="button" class="btn ghost" data-action="hc-login" data-fid="hc-login"${hc.loginBusy ? ' disabled' : ''}>${esc(t('Check against run A'))}</button>
      </div>
      <div data-part="hc-login">${loginHtml()}</div>`;
  }

  function loginHtml() {
    if (hc.loginBusy) return `<p class="muted" aria-busy="true">${esc(t('Hashing the attempt…'))}</p>`;
    const l = hc.login;
    if (!l) return `<p class="small muted">${md(t('This is `bcrypt.compare`: nothing is decrypted, the attempt is hashed again the same way.'))}</p>`;
    return `<p class="au-line">${okIcon(l.ok)}<span>${md(l.ok ? t('**Match.** Same salt + same cost + same password = same hash: the server logs the user in (200 and a token). It took {t}: the server pays the cost on every log-in, too.', { t: A.formatDuration(l.ms / 1000) }) : t('**No match.** The server answers **401** `Invalid credentials`, with the same message it uses for an unknown email.'))}</span></p>`;
  }

  async function timed(password, salt, n) {
    const t0 = performance.now();
    const bytes = await A.pbkdf2(password, salt, n);
    return { bytes, ms: performance.now() - t0 };
  }
  const b64 = (bytes) => A.bytesToB64url(bytes);

  async function runHc(root) {
    if (hc.busy) return;
    hc.error = '';
    if (!A.hasCrypto()) { hc.error = t('Hashing needs WebCrypto: open the site over https or from localhost.'); Tools.paint(root, { 'hc-status': statusHtmlHc }); return; }
    const n = iters(hc.cost);
    try {
      if (!hc.msPerIter) {                       // calibrate on a small cost first
        const c = await timed('calibrate', A.randomSalt(), iters(13));
        hc.msPerIter = Math.max(c.ms, 0.05) / iters(13);
      }
      const predicted = 2 * n * hc.msPerIter;
      if (predicted > HC_BUDGET_MS) {
        let max = hc.cost;
        while (max > HC_MIN && 2 * iters(max) * hc.msPerIter > HC_BUDGET_MS) max--;
        hc.error = t('At 2^{n} this device would need about {t} for the two hashes. The demo stops at about 2 s: try 2^{m} or lower. (Servers aim for roughly 0.1–1 s per log-in.)', { n: hc.cost, t: A.formatDuration(predicted / 1000), m: max });
        Tools.paint(root, { 'hc-status': statusHtmlHc, 'hc-cost': costInfo });
        Tools.say(root, hc.error);
        return;
      }
      hc.busy = true;
      hc.done = 0;
      Tools.paint(root, { 'hc-status': statusHtmlHc });
      root.querySelectorAll('[data-action="hc-run"]').forEach((b) => { b.disabled = true; });
      Tools.say(root, t('Hashing…'));
      const out = { cost: hc.cost, iterations: n };
      for (const k of ['a', 'b']) {
        const salt = A.randomSalt();
        const r = await timed(hc.password, salt, n);
        out[k] = { saltBytes: salt, salt: A.toHex(salt), saltB64: b64(salt), hash: A.toHex(r.bytes), hashB64: b64(r.bytes), ms: r.ms };
        hc.done++;
        Tools.paint(root, { 'hc-status': statusHtmlHc });
      }
      out.sha = await A.sha256Hex(hc.password);
      out.msPerIter = (out.a.ms + out.b.ms) / 2 / n;
      hc.msPerIter = out.msPerIter;
      hc.res = out;
      hc.login = null;
    } catch (e) {
      hc.error = t('The browser could not compute the hash: {m}', { m: e.message });
    }
    hc.busy = false;
    Tools.refresh('hash-cost');
    if (hc.res && !hc.error) Tools.say(root, t('Done. Run A took {a}, run B took {b}; the two hashes are different.', { a: A.formatDuration(hc.res.a.ms / 1000), b: A.formatDuration(hc.res.b.ms / 1000) }));
  }

  async function loginHc(root) {
    const r = hc.res;
    if (!r || hc.loginBusy) return;
    hc.loginBusy = true;
    Tools.paint(root, { 'hc-login': loginHtml });
    try {
      const x = await timed(hc.attempt, r.a.saltBytes, r.iterations);
      hc.login = { ok: A.toHex(x.bytes) === r.a.hash, ms: x.ms };
    } catch (e) { hc.login = null; }
    hc.loginBusy = false;
    Tools.refresh('hash-cost');
    if (hc.login) Tools.say(root, hc.login.ok ? t('Match: logged in.') : t('No match: 401.'));
  }

  Tools.register('hash-cost', {
    title: 'Password hashing cost',
    intro: 'A good password hash is **salted** and **deliberately slow**. Hash a password with a random salt at a cost you choose, and see what that cost does to an attacker who stole the database.',
    body() {
      return `
        <p class="tl-explain">${md(t('**Honest note.** This page uses **PBKDF2-SHA-256** because browsers have it built in (WebCrypto). A Node API would typically use **bcrypt** (the `bcrypt` package, with `bcrypt.hash(password, 10)`). The idea is the same: a random salt per password plus a tunable cost. The numbers differ: OWASP suggests about 600,000 PBKDF2 iterations to match bcrypt at cost 10.'))}</p>
        ${A.hasCrypto() ? '' : noCryptoHtml()}
        <div class="tl-row">
          <div class="tl-field hc-pw"><label for="hc-pw">${esc(t('Password'))}</label>
            <input class="tl-input" id="hc-pw" data-fid="hc-pw" data-hc="password" value="${esc(hc.password)}" spellcheck="false" autocomplete="off"></div>
          ${Tools.range({ label: t('Cost: 2^n iterations, n ='), prop: 'cost', value: hc.cost, min: HC_MIN, max: HC_MAX, unit: '', fid: 'hc-cost' })}
        </div>
        <div data-part="hc-cost">${costInfo()}</div>
        <p class="lr-actions"><button type="button" class="btn" data-action="hc-run" data-fid="hc-run"${hc.busy ? ' disabled' : ''}>${esc(t('Hash with two random salts'))}</button></p>
        <div data-part="hc-status" aria-live="off">${statusHtmlHc()}</div>
        <div data-part="hc-out">${outHc()}</div>`;
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'hc-run') runHc(root);
      else if (a === 'hc-login') loginHc(root);
      else if (a === 'hc-workers') {
        hc.workers = Number(el.dataset.v);
        Tools.refresh('hash-cost');
        Tools.say(root, el.textContent);
      }
    },
    onInput(e, root) {
      const el = e.target;
      if (el.dataset.prop === 'cost') {
        hc.cost = Number(el.value);
        hc.error = '';
        Tools.showVal(root, 'cost', String(hc.cost));
        Tools.paint(root, { 'hc-cost': costInfo, 'hc-status': statusHtmlHc });
      } else if (el.dataset.hc === 'password') hc.password = el.value;
      else if (el.dataset.hc === 'attempt') { hc.attempt = el.value; hc.login = null; Tools.paint(root, { 'hc-login': loginHtml }); }
    },
  });

  /* ======================================================================
     3. CORS simulator
     ====================================================================== */

  const VITE = 'http://localhost:5173';
  const API = 'http://localhost:3000/api/tasks';
  const EVIL = 'https://evil.example';
  const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const CTYPES = [['', '(none)'], ['application/json', 'application/json'], ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded'], ['text/plain', 'text/plain'], ['multipart/form-data', 'multipart/form-data']];
  const PAGE_PRESETS = [[VITE, 'Vite dev server'], ['http://localhost:3000', 'Served by Express'], ['http://127.0.0.1:5173', '127.0.0.1 instead of localhost'], ['https://localhost:5173', 'https'], [EVIL, 'Another site']];
  const DEF_REQ = { client: 'browser', page: VITE, url: API, method: 'GET', contentType: '', auth: false, credentials: false };
  const DEF_SRV = { enabled: false, originMode: '*', originValue: VITE, methods: A.CORS_DEFAULT_METHODS.slice(), headersMode: 'reflect', headersValue: 'Content-Type, Authorization', credentials: false, maxAge: '' };
  const SRV_PRESETS = [
    ['none', 'No cors middleware', {}],
    ['default', 'app.use(cors())', { enabled: true }],
    ['one', "cors({ origin: 'http://localhost:5173' })", { enabled: true, originMode: 'one' }],
    ['deck', "cors({ origin: ['http://localhost:5173'], credentials: true })", { enabled: true, originMode: 'list', credentials: true }],
    ['broken', "cors({ origin: '*', credentials: true })", { enabled: true, credentials: true }],
    ['strict', "cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] })", { enabled: true, originMode: 'one', methods: ['GET', 'POST'], headersMode: 'list', headersValue: 'Content-Type' }],
  ];
  const splitList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

  const options = (srv) => (!srv.enabled ? null : {
    origin: { '*': '*', one: srv.originValue.trim(), list: splitList(srv.originValue), reflect: true }[srv.originMode],
    methods: METHODS.filter((m) => srv.methods.includes(m)).sort((x, y) => A.CORS_DEFAULT_METHODS.indexOf(x) - A.CORS_DEFAULT_METHODS.indexOf(y)),
    allowedHeaders: srv.headersMode === 'list' ? splitList(srv.headersValue) : undefined,
    credentials: srv.credentials,
    maxAge: srv.maxAge === '' ? undefined : Number(srv.maxAge),
  });
  const hasBody = (m) => ['POST', 'PUT', 'PATCH'].includes(m);
  function reqOf(r) {
    const headers = [];
    if (r.contentType) headers.push(['Content-Type', r.contentType]);
    else if (hasBody(r.method)) headers.push(['Content-Type', 'text/plain;charset=UTF-8']);   // what fetch adds for a string body
    if (r.auth) headers.push(['Authorization', 'Bearer eyJhbGciOiJIUzI1NiIs…']);
    return { client: r.client, page: r.page, url: r.url, method: r.method, headers, credentials: r.credentials };
  }

  const isBase = (st) => st.req.client === 'browser' && A.parseOrigin(st.req.page).origin === VITE && A.parseOrigin(st.req.url).origin === 'http://localhost:3000';
  const blockedFor = (st, page) => !A.simulate({ ...reqOf(st.req), page }, options(st.srv)).readable;

  const CHALLENGES = [
    { id: 'vite-get', title: 'GET from the Vite dev server',
      goal: 'Your React app runs on `http://localhost:5173` and calls `GET http://localhost:3000/api/tasks`. Configure the **server** so the page can read the response, while a page on `https://evil.example` stays blocked.',
      hint: 'Turn on the cors middleware and allow exactly one origin (not `*`).',
      start: { srv: {} },
      check: (st, r) => isBase(st) && st.req.method === 'GET' && r.readable && blockedFor(st, EVIL) },
    { id: 'post-json', title: 'POST JSON through the preflight',
      goal: 'The page sends `POST /api/tasks` with `Content-Type: application/json`. The server allows only the `Accept` header, so the preflight fails. Fix the **server** without changing the request.',
      hint: 'application/json is not one of the three "simple" content types, so the browser asks first. Allowed headers must include it.',
      start: { req: { method: 'POST', contentType: 'application/json' }, srv: { enabled: true, originMode: 'one', headersMode: 'list', headersValue: 'Accept' } },
      check: (st, r) => isBase(st) && st.req.method === 'POST' && st.req.contentType === 'application/json' && r.kind === 'preflight' && r.readable },
    { id: 'bearer', title: 'Send the JWT',
      goal: 'Every protected call to a JWT-protected API sends `Authorization: Bearer <token>`. The server allows only `Content-Type`. Make `GET /api/tasks` with the token work.',
      hint: 'Authorization is never a "simple" header, and a `*` wildcard does not cover it: list it by name.',
      start: { req: { auth: true }, srv: { enabled: true, originMode: 'one', headersMode: 'list', headersValue: 'Content-Type' } },
      check: (st, r) => isBase(st) && st.req.auth && r.readable },
    { id: 'delete', title: 'Allow DELETE',
      goal: '`DELETE /api/tasks/7` with the token fails at the preflight. Fix the **server**.',
      hint: 'Only GET, HEAD and POST are always allowed. Look at the methods the server lists.',
      start: { req: { method: 'DELETE', url: `${API}/7`, auth: true }, srv: { enabled: true, originMode: 'one', methods: ['GET', 'POST'], headersMode: 'list', headersValue: 'Content-Type, Authorization' } },
      check: (st, r) => isBase(st) && st.req.method === 'DELETE' && st.req.auth && r.readable },
    { id: 'cookie', title: 'Send a cookie cross-origin',
      goal: 'The page calls with `credentials: \'include\'` so the session cookie goes along. The server uses plain `cors()`. Make it work **for your app only** (`https://evil.example` must stay blocked).',
      hint: 'With credentials the browser refuses the `*` wildcard, and the server must say `Access-Control-Allow-Credentials: true`.',
      start: { req: { credentials: true }, srv: { enabled: true } },
      check: (st, r) => isBase(st) && st.req.credentials && r.readable && blockedFor(st, EVIL) },
    { id: 'same-origin', title: 'No CORS needed',
      goal: 'An Express app can serve the page itself (`app.use(express.static("public"))`). Change **where the page comes from** so the call is same-origin and works with no cors middleware at all.',
      hint: 'Same origin = same scheme, host and port as the API.',
      start: { srv: {} },
      check: (st, r) => !st.srv.enabled && st.req.client === 'browser' && r.sameOrigin && r.readable && A.parseOrigin(st.req.url).origin === 'http://localhost:3000' },
    { id: 'curl-why', title: 'Why does curl work?',
      pick: { q: 'With no cors middleware, `curl -i http://localhost:3000/api/tasks` prints the tasks, but the same request from the React page fails. Why?',
        choices: ['The server recognises curl and lets it through.', 'CORS is enforced by the browser: it is the browser that refuses to hand the response to the page\'s JavaScript. curl is not a browser and never checks CORS headers.', 'curl runs on port 3000, so its request is same-origin.', 'curl automatically adds an Authorization header.'],
        answer: 1,
        why: 'The server answered both requests identically. Only the browser applies the same-origin policy, to protect the user\'s data from other web pages. Switch the client to curl to see it.' },
      start: { srv: {} } },
    { id: 'not-auth', title: 'Is CORS a lock?',
      pick: { q: 'You configure `cors({ origin: \'http://localhost:5173\' })` and forget the auth middleware on `DELETE /api/tasks/:id`. Who can delete tasks?',
        choices: ['Only your React page.', 'Nobody: the preflight blocks DELETE from every other client.', 'Anyone with curl, Postman or a script, and even other web pages (the DELETE is sent; only reading the answer is blocked if it is simple). CORS is not authentication.', 'Only pages on localhost.'],
        answer: 2,
        why: 'CORS only decides which **web pages** may read responses in a browser. Protecting data needs authentication (who are you?) and authorisation (may you touch this task?) on the server.' },
      start: { srv: { enabled: true, originMode: 'one' }, req: { method: 'DELETE', url: `${API}/7`, client: 'curl' } } },
  ];

  const store = challengeStore('cors-challenges-v1');
  const cs = { ch: -1, req: { ...DEF_REQ }, srv: { ...DEF_SRV, methods: DEF_SRV.methods.slice() }, pick: null, picked: false };

  function startChallenge(k) {
    cs.ch = k;
    const s = k >= 0 ? CHALLENGES[k].start : {};
    cs.req = { ...DEF_REQ, ...(s.req || {}) };
    cs.srv = { ...DEF_SRV, methods: DEF_SRV.methods.slice(), ...(s.srv || {}) };
    cs.pick = null;
    cs.picked = false;
  }

  const sim = () => A.simulate(reqOf(cs.req), options(cs.srv));

  /* ---- Output pieces ---- */

  const msg = (title, line, headers, note) => `<div class="co-msg"><p class="co-msg-h">${esc(title)}</p><pre>${esc(`${line} HTTP/1.1`)}\n${headers.map(([n, v]) => (/^(access-control-|origin$|vary$)/i.test(n) ? `<strong>${esc(n)}: ${esc(v)}</strong>` : `${esc(n)}: ${esc(v)}`)).join('\n')}</pre>${note ? `<p class="small muted">${esc(note)}</p>` : ''}</div>`;
  const resLine = (res) => `${res.status} ${res.statusText}`;
  const msgRes = (title, res) => `<div class="co-msg"><p class="co-msg-h">${esc(title)}</p><pre>${esc(`HTTP/1.1 ${resLine(res)}`)}\n${res.headers.map(([n, v]) => (/^(access-control-|vary$)/i.test(n) ? `<strong>${esc(n)}: ${esc(v)}</strong>` : `${esc(n)}: ${esc(v)}`)).join('\n')}</pre></div>`;

  function originTable(r) {
    const parts = [['scheme', t('Scheme')], ['host', t('Host')], ['port', t('Port')]];
    return `<div class="scroll"><table class="src co-origins"><caption>${esc(t('Origin = scheme + host + port'))}</caption>
      <thead><tr><th scope="col">${esc(t('Part'))}</th><th scope="col">${esc(t('Page'))}</th><th scope="col">${esc(t('API'))}</th><th scope="col">${esc(t('Same?'))}</th></tr></thead>
      <tbody>${parts.map(([k, l]) => { const same = r.page[k] === r.api[k]; return `<tr><th scope="row">${esc(l)}</th><td><code>${esc(r.page[k])}</code></td><td><code>${esc(r.api[k])}</code></td><td>${same ? `<span class="tl-ok">${esc(t('same'))}</span>` : `<span class="tl-bad">${esc(t('different'))}</span>`}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function outCs() {
    const r = sim();
    if (r.error) return `<p class="tl-bad" role="alert">${esc(t(r.error))}</p>`;
    const steps = [];
    if (r.client === 'curl') {
      steps.push(`<li><p class="co-step-h">${esc(t('curl is not a browser'))}</p><p>${md(t('No page, no origin, no same-origin policy and no CORS check: curl sends the request and prints whatever comes back. CORS headers in the response are simply ignored.'))}</p></li>`);
    } else {
      steps.push(`<li><p class="co-step-h">${esc(t('1. Same origin?'))}</p>${originTable(r)}<p>${md(r.sameOrigin ? t('**Same origin.** No CORS at all: the browser sends the request (with the page\'s cookies) and the page reads the answer.') : t('**Cross-origin** ({d} differ{s}). The browser lets the page read the answer only if the API says so with CORS headers.', { d: r.compare.diffs.map((x) => t(x.part)).join(', '), s: r.compare.diffs.length === 1 ? 's' : '' }))}</p></li>`);
      if (!r.sameOrigin) {
        steps.push(`<li><p class="co-step-h">${esc(t('2. Simple request or preflight?'))}</p>${r.kind === 'simple'
          ? `<p>${md(t('**Simple request**: GET, HEAD or POST with only safelisted headers (and a form-like Content-Type). The browser sends it straight away and checks the answer afterwards.'))}</p>`
          : `<p>${md(t('**Preflight needed.** Before sending it, the browser asks permission with an `OPTIONS` request, because:'))}</p><ul class="plain co-reasons">${r.classify.reasons.map((x) => `<li>${esc(t(x.text))}</li>`).join('')}</ul>`}
          ${hasBody(cs.req.method) && cs.req.contentType !== 'application/json' ? `<p class="small">${md(t('Note: `express.json()` only parses `application/json` bodies. With this Content-Type, `req.body` stays `{}` on the server, so avoiding the preflight this way breaks your API.'))}</p>` : ''}</li>`);
      }
      if (r.preflight) {
        const p = r.preflight;
        steps.push(`<li><p class="co-step-h">${esc(t('3. Preflight'))}</p><div class="tl-cols">${msg(t('Preflight request (browser → API)'), p.request.line, p.request.headers)}${msgRes(t('Preflight response (API → browser)'), p.response)}</div>
          ${options(cs.srv) ? '' : `<p class="small muted">${md(t('Without the cors middleware, Express answers `OPTIONS` by itself (200 and an `Allow` header) but with no CORS headers.'))}</p>`}
          <p class="au-line">${okIcon(p.ok)}<span>${md(p.ok ? t('**Preflight passed**: origin, method and headers are all allowed{c}.', { c: header(p.response.headers, 'Access-Control-Max-Age') ? t('; the browser may reuse this answer for {s} s without asking again', { s: header(p.response.headers, 'Access-Control-Max-Age') }) : '' }) : t('**Preflight failed.** {r}', { r: p.fail.reason }))}</span></p></li>`);
      }
    }
    const n = r.client === 'curl' ? '' : r.sameOrigin ? '2. ' : r.preflight ? '4. ' : '3. ';
    if (r.actual && r.actual.sent) {
      steps.push(`<li><p class="co-step-h">${esc(n + t('The actual request'))}</p><div class="tl-cols">${msg(t('Request'), r.actual.request.line, r.actual.request.headers)}${msgRes(t('Response'), r.actual.response)}</div></li>`);
    } else if (r.actual) {
      steps.push(`<li><p class="co-step-h">${esc(n + t('The actual request'))}</p><p class="au-line">${ICON.bad}<span>${md(t('**Never sent.** The browser stopped at the preflight, so your route handler did not run.'))}</span></p></li>`);
    }
    return `<ol class="co-steps">${steps.join('')}</ol>${verdictCs(r)}`;
  }

  const header = (list, name) => { const h = list.find(([x]) => x.toLowerCase() === name.toLowerCase()); return h ? h[1] : null; };

  function verdictCs(r) {
    if (r.readable) {
      return `<div class="au-verdict is-ok"><p class="au-verdict-h">${ICON.ok}<strong>${esc(t('The page\'s JavaScript can read the response.'))}</strong></p>
        <p>${md(r.client === 'curl' ? t('curl always can. That is why CORS is **not** a way to protect an API: it only limits what other web pages can do inside a browser.') : r.sameOrigin ? t('Same origin: nothing for CORS to decide.') : t('`await res.json()` gives the data. The API must still check **who** is calling (the token) and **what** they may touch: CORS is not authentication.'))}</p></div>`;
    }
    const f = r.fail;
    const fixed = A.fixAll(reqOf(cs.req), options(cs.srv));
    return `<div class="au-verdict is-bad"><p class="au-verdict-h">${ICON.bad}<strong>${esc(t('Blocked: the page cannot read the response.'))}</strong></p>
        <p>${md(t('In your code, `fetch()` rejects with `TypeError: Failed to fetch`: no status, no body, no details. The details are only in the console:'))}</p>
        <div class="lr-console co-console" role="log" aria-label="${esc(t('Browser console'))}">${f.console.map((l) => `<p class="lr-line lr-error">${esc(l)}</p>`).join('')}</div>
        <p>${md(f.stage === 'response' ? t('**The server received and ran this request** (a POST would have created the task). CORS did not stop the request: it only stopped the page from reading the answer.') : t('The real request was never sent, so nothing changed on the server.'))}</p>
        ${fixed.readable ? `<p class="lr-label">${esc(t('Fix on the server (Express)'))}</p><pre class="tl-out">${esc(`const cors = require('cors');\n${A.configCode(fixed.options)}`)}</pre>` : ''}
      </div>`;
  }

  function fetchCode() {
    const r = cs.req;
    if (r.client === 'curl') {
      const parts = [`curl -i${r.method !== 'GET' ? ` -X ${r.method}` : ''} ${r.url}`];
      if (r.contentType) parts.push(`-H "Content-Type: ${r.contentType}"`);
      if (r.auth) parts.push('-H "Authorization: Bearer $TOKEN"');
      if (hasBody(r.method)) parts.push(`-d '{"title":"Buy milk"}'`);
      return parts.join(' \\\n  ');
    }
    const lines = [];
    if (r.method !== 'GET') lines.push(`  method: '${r.method}',`);
    const hs = [];
    if (r.contentType) hs.push(`    'Content-Type': '${r.contentType}',`);
    if (r.auth) hs.push('    Authorization: `Bearer ${token}`,');
    if (hs.length) lines.push('  headers: {', ...hs, '  },');
    if (r.credentials) lines.push("  credentials: 'include',   // send cookies cross-origin");
    if (hasBody(r.method)) lines.push(`  body: JSON.stringify({ title: 'Buy milk' }),${r.contentType ? '' : '   // no Content-Type: fetch sends text/plain'}`);
    return `// page served from ${r.page}\nconst res = await fetch('${r.url}'${lines.length ? `, {\n${lines.join('\n')}\n}` : ''});`;
  }
  const serverCode = () => `const cors = require('cors');\n${A.configCode(options(cs.srv))}${cs.srv.enabled ? '\napp.use(express.json());\napp.use(\'/api/tasks\', auth, tasksRouter);' : ''}`;

  /* ---- Challenge header ---- */

  function goalHtml() {
    if (cs.ch < 0) return `<p class="tl-goal">${md(t('**Free mode.** Change the page, the request and the server, and watch what the browser does. Or pick a challenge.'))}</p>`;
    const c = CHALLENGES[cs.ch];
    return `<div class="tl-goal"><p><strong>${esc(t('Challenge {n}: {title}', { n: cs.ch + 1, title: t(c.title) }))}</strong></p><p>${md(t(c.pick ? c.pick.q : c.goal))}</p>
      ${c.hint ? `<details class="pg-hint" data-fid="co-hint-${c.id}"><summary>${esc(t('Hint'))}</summary><p>${md(t(c.hint))}</p></details>` : ''}</div>`;
  }

  function pickHtml() {
    const c = CHALLENGES[cs.ch];
    if (!c || !c.pick) return '';
    const p = c.pick;
    const right = cs.picked && cs.pick === p.answer;
    return `<fieldset class="co-pick"><legend>${esc(t('Pick the reason'))}</legend>
        ${p.choices.map((ch, k) => `<label class="co-choice"><input type="radio" name="co-pick-${c.id}" value="${k}" data-cs="pick" data-fid="co-pick-${k}"${cs.pick === k ? ' checked' : ''}> <span>${md(t(ch))}</span></label>`).join('')}
        <p class="lr-actions"><button type="button" class="btn small-btn" data-action="co-check" data-fid="co-check"${cs.pick === null ? ' disabled' : ''}>${esc(t('Check'))}</button></p>
        ${cs.picked ? `<p class="au-line">${okIcon(right)}<span>${md(right ? `${t('**Right.**')} ${t(p.why)}` : t('**Not that one.** Try again; the simulator below can help.'))}</span></p>` : ''}
      </fieldset>`;
  }

  function statusCs(r) {
    if (cs.ch < 0 || CHALLENGES[cs.ch].pick) return '';
    const c = CHALLENGES[cs.ch];
    const ok = c.check(cs, r);
    return `<p class="lk-status${ok ? ' is-ok' : ''}">${Tools.statusHtml({ ok, okText: t('Solved!'), notYet: t('Not solved yet: the verdict at the bottom must turn green, under the conditions of the challenge.'), next: cs.ch < CHALLENGES.length - 1 ? { action: 'co-ch', v: cs.ch + 1, label: t('Next challenge') } : null })}</p>`;
  }

  /* ---- Form ---- */

  function requestForm() {
    const r = cs.req;
    const browser = r.client === 'browser';
    return `<fieldset class="co-box"><legend>${esc(t('The client'))}</legend>
        ${Tools.seg({ label: t('Who sends it'), action: 'co-client', prop: 'client', values: [['browser', t('Browser page (fetch)')], ['curl', t('curl / Postman')]], current: r.client, fid: 'co-client', mono: false })}
        ${browser ? `<div class="tl-field"><label for="co-page">${esc(t('Page origin (where the page was loaded from)'))}</label>
          <input class="tl-input" id="co-page" data-fid="co-page" data-cs="page" value="${esc(r.page)}" spellcheck="false" autocomplete="off"></div>
        <div class="tl-row co-chips" role="group" aria-label="${esc(t('Example page origins'))}">${PAGE_PRESETS.map(([v, l], k) => `<button type="button" class="tl-chip" data-action="co-page" data-v="${esc(v)}" data-fid="co-pp-${k}" title="${esc(v)}">${esc(t(l))}</button>`).join('')}</div>` : ''}
        <div class="tl-field"><label for="co-url">${esc(t('API URL'))}</label>
          <input class="tl-input" id="co-url" data-fid="co-url" data-cs="url" value="${esc(r.url)}" spellcheck="false" autocomplete="off"></div>
        <div class="tl-row">
          ${Tools.select({ label: t('Method'), fid: 'co-method', options: METHODS, current: r.method, data: { cs: 'method' } })}
          ${Tools.select({ label: t('Content-Type'), fid: 'co-ct', options: CTYPES.map(([v, l]) => [v, t(l)]), current: r.contentType, data: { cs: 'contentType' } })}
        </div>
        <label class="tl-check"><input type="checkbox" data-cs="auth" data-fid="co-auth"${r.auth ? ' checked' : ''}> ${esc(t('Send Authorization: Bearer <token>'))}</label>
        ${browser ? `<label class="tl-check"><input type="checkbox" data-cs="credentials" data-fid="co-cred"${r.credentials ? ' checked' : ''}> ${esc(t("credentials: 'include' (send cookies)"))}</label>` : ''}
        <p class="lr-label">${esc(browser ? t('The page\'s code') : t('The command'))}</p>
        <pre class="tl-out" data-part="co-fetch">${esc(fetchCode())}</pre>
      </fieldset>`;
  }

  function serverForm() {
    const s = cs.srv;
    const preset = SRV_PRESETS.find(([, , v]) => JSON.stringify(options({ ...DEF_SRV, methods: DEF_SRV.methods.slice(), ...v })) === JSON.stringify(options(s)));
    return `<fieldset class="co-box"><legend>${esc(t('The API (Express + cors)'))}</legend>
        ${Tools.select({ label: t('Preset'), fid: 'co-preset', options: [...SRV_PRESETS.map(([k, l]) => [k, l]), ['custom', t('(custom)')]], current: preset ? preset[0] : 'custom', data: { cs: 'preset' } })}
        <label class="tl-check"><input type="checkbox" data-cs="enabled" data-fid="co-enabled"${s.enabled ? ' checked' : ''}> ${esc(t('Use the cors middleware'))}</label>
        ${s.enabled ? `
        <div class="tl-row">
          ${Tools.select({ label: t('origin'), fid: 'co-omode', options: [['*', t("'*' (any origin)")], ['one', t('one origin (a string)')], ['list', t('a list of origins (array)')], ['reflect', t('true (echo any caller)')]], current: s.originMode, data: { cs: 'originMode' } })}
          ${s.originMode === 'one' || s.originMode === 'list' ? `<div class="tl-field co-grow"><label for="co-oval">${esc(s.originMode === 'list' ? t('Allowed origins (comma-separated)') : t('Allowed origin'))}</label>
            <input class="tl-input" id="co-oval" data-fid="co-oval" data-cs="originValue" value="${esc(s.originValue)}" spellcheck="false" autocomplete="off"></div>` : ''}
        </div>
        <fieldset class="co-methods"><legend>${esc(t('methods (Access-Control-Allow-Methods)'))}</legend>
          ${A.CORS_DEFAULT_METHODS.map((m) => `<label class="tl-check"><input type="checkbox" data-cs="method-allow" data-v="${m}" data-fid="co-m-${m}"${s.methods.includes(m) ? ' checked' : ''}> ${m}</label>`).join('')}
        </fieldset>
        <div class="tl-row">
          ${Tools.select({ label: t('allowedHeaders'), fid: 'co-hmode', options: [['reflect', t('not set: echo what the browser asks')], ['list', t('a fixed list')]], current: s.headersMode, data: { cs: 'headersMode' } })}
          ${s.headersMode === 'list' ? `<div class="tl-field co-grow"><label for="co-hval">${esc(t('Allowed headers (comma-separated)'))}</label>
            <input class="tl-input" id="co-hval" data-fid="co-hval" data-cs="headersValue" value="${esc(s.headersValue)}" spellcheck="false" autocomplete="off"></div>` : ''}
        </div>
        <div class="tl-row">
          <label class="tl-check"><input type="checkbox" data-cs="srvCred" data-fid="co-scred"${s.credentials ? ' checked' : ''}> ${esc(t('credentials: true'))}</label>
          ${Tools.num({ label: t('maxAge (seconds, empty = not set)'), fid: 'co-maxage', value: s.maxAge, min: 0, step: 60, data: { cs: 'maxAge' } })}
        </div>` : `<p class="small muted">${md(t('No `cors` middleware: the API never sends `Access-Control-*` headers.'))}</p>`}
        <p class="lr-label">${esc(t('The server\'s code'))}</p>
        <pre class="tl-out" data-part="co-server">${esc(serverCode())}</pre>
      </fieldset>`;
  }

  /* Repaints the outputs after typing, and checks the challenge. */
  function update(root) {
    const r = sim();
    Tools.paint(root, { 'co-out': outCs, 'co-fetch': fetchCode, 'co-server': serverCode, 'co-status': () => statusCs(r) });
    afterChange(root, r);
  }

  function afterChange(root, r) {
    const c = CHALLENGES[cs.ch];
    if (c && !c.pick && c.check(cs, r)) Tools.markSolved(root, { store, id: c.id, action: 'co-ch', index: cs.ch, say: t('Challenge solved!') });
    else Tools.say(root, r.error ? t(r.error) : r.readable ? t('Readable by the page.') : t('Blocked by CORS.'));
  }

  function refreshCs(root) {
    Tools.refresh('cors-sim');
    afterChange(root, sim());
  }

  Tools.register('cors-sim', {
    title: 'CORS simulator',
    intro: 'A page may only read responses from its own **origin** unless the API allows it with CORS headers. Set up the page, the request and the server, and follow what the browser does, preflight included.',
    challenges: { store, label: 'CORS challenges', ids: () => CHALLENGES.map((c) => c.id) },
    body() {
      return `
        ${Tools.challengePicker({ list: CHALLENGES, current: cs.ch, store, action: 'co-ch', label: t('CORS challenges'), free: { value: -1, label: t('Free') } })}
        ${goalHtml()}
        ${pickHtml()}
        <div data-part="co-status">${statusCs(sim())}</div>
        <div class="tl-cols co-forms">${requestForm()}${serverForm()}</div>
        <h4 class="tl-sub">${esc(t('What happens'))}</h4>
        <div data-part="co-out">${outCs()}</div>`;
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'co-ch') {
        startChallenge(Number(el.dataset.v));
        Tools.refresh('cors-sim');
        Tools.say(root, cs.ch >= 0 ? t('Challenge {n}: {title}', { n: cs.ch + 1, title: t(CHALLENGES[cs.ch].title) }) : t('Free mode'));
      } else if (a === 'co-client') { cs.req.client = el.dataset.v; refreshCs(root); }
      else if (a === 'co-page') { cs.req.page = el.dataset.v; refreshCs(root); }
      else if (a === 'co-check') {
        cs.picked = true;
        const c = CHALLENGES[cs.ch];
        Tools.refresh('cors-sim');
        if (cs.pick === c.pick.answer) Tools.markSolved(root, { store, id: c.id, action: 'co-ch', index: cs.ch, say: t('Right!') });
        else Tools.say(root, t('Not that one. Try again.'));
      }
    },
    onInput(e, root) {
      const k = e.target.dataset.cs;
      if (['page', 'url'].includes(k)) { cs.req[k] = e.target.value; update(root); }
      else if (['originValue', 'headersValue'].includes(k)) { cs.srv[k] = e.target.value; update(root); }
      else if (k === 'maxAge') { cs.srv.maxAge = e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)); update(root); }
    },
    onChange(e, root) {
      const el = e.target;
      const k = el.dataset.cs;
      if (!k) return;
      if (k === 'method' || k === 'contentType') cs.req[k] = el.value;
      else if (k === 'auth' || k === 'credentials') cs.req[k] = el.checked;
      else if (k === 'enabled') cs.srv.enabled = el.checked;
      else if (k === 'srvCred') cs.srv.credentials = el.checked;
      else if (k === 'originMode' || k === 'headersMode') cs.srv[k] = el.value;
      else if (k === 'method-allow') cs.srv.methods = el.checked ? [...cs.srv.methods, el.dataset.v] : cs.srv.methods.filter((m) => m !== el.dataset.v);
      else if (k === 'preset') {
        const p = SRV_PRESETS.find(([id]) => id === el.value);
        if (!p) return;
        cs.srv = { ...DEF_SRV, methods: DEF_SRV.methods.slice(), ...p[2] };
      } else if (k === 'pick') { cs.pick = Number(el.value); cs.picked = false; Tools.refresh('cors-sim'); return; }
      else return;
      refreshCs(root);
    },
  });
})();
