// Unit tests for the auth engine (site/js/tools/auth-engine.js): base64url, JWT decode /
// sign / verify (checked against Node's crypto.createHmac), PBKDF2, and the CORS simulator.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHmac, pbkdf2Sync } from 'node:crypto';

const require = createRequire(import.meta.url);
const A = require('../js/tools/auth-engine.js');

// The example token shown on jwt.io (HS256, secret "your-256-bit-secret").
const JWT_IO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const JWT_IO_SECRET = 'your-256-bit-secret';
const nodeSig = (input, secret) => createHmac('sha256', secret).update(input).digest('base64url');

/* ---- base64url ------------------------------------------------------------------ */

test('base64url: no padding, - and _ instead of + and /', () => {
  assert.equal(A.bytesToB64url(new Uint8Array([0xfb, 0xff, 0xbf])), '-_-_');
  assert.equal(A.textToB64url('a'), 'YQ');
  assert.equal(A.b64urlToText('YQ'), 'a');
  assert.equal(A.textToB64url('{"alg":"HS256","typ":"JWT"}'), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
});

test('base64url: round trip of UTF-8 text', () => {
  const s = '{"name":"Begoña","city":"Málaga ✓"}';
  assert.equal(A.b64urlToText(A.textToB64url(s)), s);
  assert.equal(A.textToB64url(s), Buffer.from(s).toString('base64url'));
});

test('base64url: rejects characters outside the alphabet and impossible lengths', () => {
  assert.throws(() => A.b64urlToBytes('ab+c'));
  assert.throws(() => A.b64urlToBytes('abcde'));
});

/* ---- JWT decode ---------------------------------------------------------------- */

test('parse: the jwt.io token decodes without any secret', () => {
  const p = A.parse(JWT_IO);
  assert.equal(p.ok, true);
  assert.deepEqual(p.header, { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(p.payload, { sub: '1234567890', name: 'John Doe', iat: 1516239022 });
  assert.equal(p.signingInput, JWT_IO.split('.').slice(0, 2).join('.'));
});

test('parse: explains a wrong number of parts, bad base64url and non-JSON', () => {
  assert.match(A.parse('abc.def').error, /three parts/);
  assert.equal(A.parse('').ok, false);
  const bad = A.parse('e$J.e30.sig');
  assert.equal(bad.errorPart, 'header');
  const notJson = A.parse(`${A.textToB64url('hello')}.e30.`);
  assert.match(notJson.error, /not valid JSON/);
  const arr = A.parse(`${A.textToB64url('[1]')}.e30.`);
  assert.match(arr.error, /JSON object/);
});

test('claims: exp / nbf / iat status relative to the clock', () => {
  const now = 1_800_000_000;
  const rows = A.claims({ sub: 42, role: 'user', iat: now - 600, exp: now + 3000, nbf: now + 60 }, now);
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.equal(by.exp.time.status, 'valid');
  assert.equal(by.nbf.time.status, 'not-yet');
  assert.equal(by.iat.time.status, 'past');
  assert.equal(by.role.custom, true);
  assert.equal(by.sub.custom, false);
  assert.equal(A.claims({ exp: now }, now)[0].time.status, 'expired');          // exp is exclusive
  assert.equal(A.claims({ exp: '1h' }, now)[0].time.status, 'invalid');
});

test('timeCheck: same order and messages as jsonwebtoken', () => {
  const now = 1000;
  assert.deepEqual(A.timeCheck({ exp: 2000 }, now).ok, true);
  assert.equal(A.timeCheck({ exp: 1000 }, now).message, 'jwt expired');
  assert.equal(A.timeCheck({ nbf: 1001, exp: 10 }, now).message, 'jwt not active');
  assert.equal(A.timeCheck({ exp: 'soon' }, now).code, 'bad-claim');
});

test('relTime: readable durations', () => {
  assert.equal(A.relTime(45), '45 s');
  assert.equal(A.relTime(3000), '50 min');
  assert.equal(A.relTime(-7200), '2 h');
  assert.equal(A.relTime(3 * 86400), '3 days');
});

/* ---- JWT sign and verify (WebCrypto, checked against node:crypto) ------------- */

test('HMAC-SHA256: the jwt.io signature matches crypto.createHmac', async () => {
  const p = A.parse(JWT_IO);
  assert.equal(nodeSig(p.signingInput, JWT_IO_SECRET), p.signature);
  assert.equal(A.bytesToB64url(await A.hmacSha256(JWT_IO_SECRET, p.signingInput)), p.signature);
});

test('verify: the jwt.io token is valid with its secret, invalid with another', async () => {
  const ok = await A.verify(JWT_IO, JWT_IO_SECRET, { now: 1516239100 });
  assert.equal(ok.status, 'valid');
  assert.equal(ok.signature, 'valid');
  const bad = await A.verify(JWT_IO, 'wrong-secret', { now: 1516239100 });
  assert.equal(bad.status, 'bad-signature');
  assert.equal(bad.message, 'invalid signature');
});

test('sign: same token as an independent HS256 implementation', async () => {
  const payload = { sub: 42, role: 'user', iat: 1_800_000_000, exp: 1_800_003_600 };
  const token = await A.sign(payload, 'dev-secret-change-me');
  const [h, p, s] = token.split('.');
  assert.equal(h, Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'));
  assert.equal(p, Buffer.from(JSON.stringify(payload)).toString('base64url'));
  assert.equal(s, nodeSig(`${h}.${p}`, 'dev-secret-change-me'));
});

test('verify: a tampered payload breaks the signature', async () => {
  const token = await A.sign({ sub: 42, role: 'user' }, 's3cret');
  const forged = A.withPayload(token, { sub: 42, role: 'admin' });
  assert.notEqual(forged, token);
  assert.equal(A.parse(forged).payload.role, 'admin');                       // anyone can decode it…
  assert.equal((await A.verify(forged, 's3cret')).status, 'bad-signature');  // …but it no longer verifies
  assert.equal((await A.verify(token, 's3cret')).status, 'valid');
});

test('verify: expiry is checked only after the signature', async () => {
  const token = await A.sign({ sub: 1, iat: 100, exp: 200 }, 'k');
  assert.equal((await A.verify(token, 'k', { now: 150 })).status, 'valid');
  const late = await A.verify(token, 'k', { now: 200 });
  assert.equal(late.status, 'expired');
  assert.equal(late.signature, 'valid');
  assert.equal((await A.verify(token, 'other', { now: 200 })).status, 'bad-signature');
  const early = await A.sign({ nbf: 500 }, 'k');
  assert.equal((await A.verify(early, 'k', { now: 100 })).message, 'jwt not active');
});

test('verify: alg none is rejected, other algorithms are not checked here', async () => {
  const none = `${A.textToB64url('{"alg":"none","typ":"JWT"}')}.${A.textToB64url('{"sub":1,"role":"admin"}')}.`;
  const r = await A.verify(none, 'anything');
  assert.equal(r.status, 'alg-none');
  assert.equal(r.message, 'jwt signature is required');
  const rs = `${A.textToB64url('{"alg":"RS256"}')}.e30.${A.textToB64url('x')}`;
  assert.equal((await A.verify(rs, 'k')).status, 'alg-unsupported');
  assert.equal((await A.verify(JWT_IO, '')).status, 'no-secret');
  assert.equal((await A.verify('nope', 'k')).status, 'malformed');
});

/* ---- Password hashing ------------------------------------------------------------ */

test('pbkdf2: matches node:crypto pbkdf2Sync (SHA-256, 32 bytes)', async () => {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const mine = await A.pbkdf2('correct horse', salt, 1024);
  assert.equal(A.toHex(mine), pbkdf2Sync('correct horse', Buffer.from(salt), 1024, 32, 'sha256').toString('hex'));
});

test('pbkdf2: the same password with two salts gives two different hashes', async () => {
  const a = await A.pbkdf2('hunter2', A.randomSalt(), 1000);
  const b = await A.pbkdf2('hunter2', A.randomSalt(), 1000);
  assert.notEqual(A.toHex(a), A.toHex(b));
  const salt = A.randomSalt();
  assert.equal(A.toHex(await A.pbkdf2('hunter2', salt, 1000)), A.toHex(await A.pbkdf2('hunter2', salt, 1000)));
});

test('sha256Hex: a known digest', async () => {
  assert.equal(await A.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('attack and formatting: guesses per second and time for a billion', () => {
  const a = A.attack(100, 1);                       // 100 ms per guess → 10 per second
  assert.equal(a.perSecond, 10);
  assert.equal(a.billionSeconds, 1e8);
  assert.equal(A.attack(0.001, 1000).perSecond, 1e9);
  assert.equal(A.formatDuration(0.0000004), '0.4 µs');
  assert.equal(A.formatDuration(0.012), '12 ms');
  assert.equal(A.formatDuration(3600 * 5), '5 h');
  assert.equal(A.formatDuration(1e8), '3.2 years');
  assert.equal(A.formatCount(3_400_000), '3.4 million');
});

/* ---- CORS ---------------------------------------------------------------------- */

const VITE = 'http://localhost:5173';
const API = 'http://localhost:3000/api/tasks';
const req = (over = {}) => ({ client: 'browser', page: VITE, url: API, method: 'GET', headers: [], credentials: false, ...over });

test('origins: scheme, host and port must all match; default ports are filled in', () => {
  const p = A.parseOrigin('https://shop.example.com/cart');
  assert.equal(p.port, '443');
  assert.equal(p.origin, 'https://shop.example.com');
  const c = A.compareOrigins(A.parseOrigin(VITE), A.parseOrigin(API));
  assert.equal(c.same, false);
  assert.deepEqual(c.diffs.map((d) => d.part), ['port']);
  assert.deepEqual(A.compareOrigins(A.parseOrigin('http://127.0.0.1:3000'), A.parseOrigin(API)).diffs.map((d) => d.part), ['host']);
  assert.equal(A.compareOrigins(A.parseOrigin('http://example.com'), A.parseOrigin('http://example.com:80/x')).same, true);
  assert.equal(A.parseOrigin('localhost:3000').ok, false);
});

test('classify: simple requests and the rules that trigger a preflight', () => {
  assert.equal(A.classify({ method: 'GET', headers: [] }).simple, true);
  assert.equal(A.classify({ method: 'POST', headers: [['Content-Type', 'application/x-www-form-urlencoded']] }).simple, true);
  assert.equal(A.classify({ method: 'POST', headers: [['Content-Type', 'text/plain;charset=UTF-8']] }).simple, true);
  const json = A.classify({ method: 'POST', headers: [['Content-Type', 'application/json']] });
  assert.equal(json.simple, false);
  assert.equal(json.reasons[0].code, 'content-type');
  assert.equal(A.classify({ method: 'DELETE', headers: [] }).reasons[0].code, 'method');
  assert.deepEqual(A.classify({ method: 'GET', headers: [['Authorization', 'Bearer x'], ['Content-Type', 'application/json']] }).unsafeHeaders, ['authorization', 'content-type']);
});

test('simulate: no cors middleware → a simple GET is sent and executed, but unreadable', () => {
  const r = A.simulate(req(), null);
  assert.equal(r.kind, 'simple');
  assert.equal(r.executed, true);
  assert.equal(r.readable, false);
  assert.equal(r.fail.code, 'no-acao');
  assert.equal(r.fail.stage, 'response');
  assert.match(r.fail.console[0], /^Access to fetch at 'http:\/\/localhost:3000\/api\/tasks' from origin 'http:\/\/localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header/);
});

test('simulate: cors() defaults let a JSON POST with a token through the preflight', () => {
  const r = A.simulate(req({ method: 'POST', headers: [['Content-Type', 'application/json'], ['Authorization', 'Bearer abc']] }), { origin: '*' });
  assert.equal(r.kind, 'preflight');
  assert.equal(r.preflight.ok, true);
  const allowH = r.preflight.response.headers.find(([n]) => n === 'Access-Control-Allow-Headers');
  assert.equal(allowH[1], 'authorization,content-type');     // reflected from the request
  assert.equal(r.readable, true);
  assert.equal(r.preflight.response.status, 204);
});

test('simulate: a failed preflight means the real request is never sent', () => {
  const r = A.simulate(req({ method: 'DELETE' }), { origin: VITE, methods: ['GET', 'POST'] });
  assert.equal(r.preflight.ok, false);
  assert.equal(r.fail.code, 'method');
  assert.equal(r.actual.sent, false);
  assert.equal(r.executed, false);
  assert.equal(r.fail.console[0].endsWith('Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response.'), true);
});

test('simulate: explicit allowedHeaders must list Authorization', () => {
  const r = A.simulate(req({ headers: [['Authorization', 'Bearer abc']] }), { origin: VITE, allowedHeaders: ['Content-Type'] });
  assert.equal(r.fail.code, 'header');
  assert.equal(r.fail.header, 'authorization');
  const ok = A.simulate(req({ headers: [['Authorization', 'Bearer abc']] }), { origin: VITE, allowedHeaders: ['Content-Type', 'Authorization'] });
  assert.equal(ok.readable, true);
  // a "*" wildcard never covers Authorization
  assert.equal(A.simulate(req({ headers: [['Authorization', 'x']] }), { origin: VITE, allowedHeaders: ['*'] }).fail.code, 'header');
  assert.equal(A.simulate(req({ headers: [['X-Trace', 'x']] }), { origin: VITE, allowedHeaders: ['*'] }).readable, true);
});

test('simulate: credentials need an exact origin and Allow-Credentials: true', () => {
  assert.equal(A.simulate(req({ credentials: true }), { origin: '*' }).fail.code, 'wildcard-credentials');
  assert.equal(A.simulate(req({ credentials: true }), { origin: '*', credentials: true }).fail.code, 'wildcard-credentials');
  assert.equal(A.simulate(req({ credentials: true }), { origin: VITE }).fail.code, 'no-credentials');
  const ok = A.simulate(req({ credentials: true }), { origin: [VITE], credentials: true });
  assert.equal(ok.readable, true);
  assert.ok(ok.actual.request.headers.some(([n]) => n === 'Cookie'));
});

test('simulate: origin lists echo only a listed origin; a single string is always echoed', () => {
  const evil = req({ page: 'https://evil.example' });
  assert.equal(A.simulate(evil, { origin: [VITE] }).fail.code, 'no-acao');
  const s = A.simulate(evil, { origin: VITE });
  assert.equal(s.fail.code, 'mismatch');
  assert.match(s.fail.console[0], /has a value 'http:\/\/localhost:5173' that is not equal to the supplied origin/);
  assert.equal(A.simulate(evil, { origin: true }).readable, true);
});

test('simulate: same origin needs no CORS; curl ignores CORS', () => {
  const same = A.simulate(req({ page: 'http://localhost:3000' }), null);
  assert.equal(same.kind, 'same-origin');
  assert.equal(same.readable, true);
  const curl = A.simulate(req({ client: 'curl' }), null);
  assert.equal(curl.readable, true);
  assert.equal(curl.preflight, null);
});

test('fixAll: never suggests echoing any origin together with credentials', () => {
  const f = A.fixAll(req({ credentials: true }), { origin: true });
  assert.equal(f.readable, true);
  assert.equal(f.options.origin, VITE);
  assert.equal(f.options.credentials, true);
});

test('configCode: mirrors the cors() options', () => {
  assert.equal(A.configCode({ origin: '*' }), 'app.use(cors());');
  assert.equal(A.configCode({ origin: VITE, credentials: true }), "app.use(cors({\n  origin: 'http://localhost:5173',\n  credentials: true,\n}));");
  assert.match(A.configCode({ origin: [VITE], methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'], maxAge: 600 }), /methods: \['GET', 'POST'\],\n  allowedHeaders: \['Content-Type'\],\n  maxAge: 600,/);
  assert.match(A.configCode(null), /no cors middleware/);
});

test('fixAll: every blocked combination becomes readable with the suggested config', () => {
  const servers = [null, { origin: '*' }, { origin: VITE }, { origin: ['http://other.test'] }, { origin: '*', credentials: true },
    { origin: VITE, methods: ['GET'], allowedHeaders: ['Accept'] }];
  const requests = [];
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    for (const ct of ['', 'application/json', 'text/plain']) {
      for (const auth of [false, true]) {
        for (const credentials of [false, true]) {
          const headers = [...(ct ? [['Content-Type', ct]] : []), ...(auth ? [['Authorization', 'Bearer x']] : [])];
          requests.push(req({ method, headers, credentials }));
        }
      }
    }
  }
  let blocked = 0;
  for (const s of servers) {
    for (const r of requests) {
      if (A.simulate(r, s).readable) continue;
      blocked++;
      const f = A.fixAll(r, s);
      assert.equal(f.readable, true, `${A.configCode(s)} ${r.method} ${JSON.stringify(r.headers)} ${r.credentials}`);
    }
  }
  assert.ok(blocked > 50);
});
