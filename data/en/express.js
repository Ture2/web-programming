'use strict';
/* Routes and middleware: concept cards, rail groups and self-check quiz (Express 4/5 as the
   worked example). Cards explain with `html` blocks and `diagram` specs (js/concept-section.js,
   js/diagram.js). `live` boxes run plain functions only (no require, no network):
   URLSearchParams, a controller called with a fake res, the arity of an error handler.
   `hub` and `topic` keys match EXPRESS_GROUPS and EXPRESS_QUIZ_TOPICS. */

DATA.en.EXPRESS_QUIZ_TOPICS = {
  basics: 'Express and the app',
  routing: 'Routes and parameters',
  reqres: 'Requests and responses',
  middleware: 'Middleware',
  structure: 'Structuring the app',
  errors: 'Errors and 404s',
};

DATA.en.EXPRESS_GROUPS = [
  { key: 'basics', label: 'Express and the app', icon: 'server' },
  { key: 'routing', label: 'Routes and parameters', icon: 'route' },
  { key: 'reqres', label: 'Requests and responses', icon: 'arrow' },
  { key: 'middleware', label: 'Middleware', icon: 'pipeline' },
  { key: 'structure', label: 'Structuring the app', icon: 'split' },
  { key: 'errors', label: 'Errors and 404s', icon: 'shield' },
];

/* Cards merged into another: old links and bookmarks redirect. */
DATA.en.EXPRESS_MOVED = {
  'app-listen': '#/server/routes/what-is-express',
};

DATA.en.EXPRESS_CONCEPTS = [
  /* ---- 1. Express and the app ----------------------------------------------------- */
  { id: 'what-is-express', hub: 'basics', topic: 'basics',
    title: 'Express on top of Node: the app and app.listen',
    summary: '**Express** is a small Node.js library: `express()` creates an **app** that holds your routes and middleware in order, and `app.listen(port)` starts the server that hands it every request.',
    html: [
      '<p>Node\'s <code>http</code> module calls one function for every request, and the rest is your job (see <a href="#/server/runtime/first-server">A first server</a>). Express turns that one function into an ordered list of small ones, so twenty URLs are twenty short lines instead of one giant <code>if</code>/<code>else</code>. Why a framework at all, and which ones exist: <a href="#/server/runtime/frameworks">Why a framework</a>.</p>',
      '<dl><dt>Routes</dt><dd>Method + path → a function: <code>app.get(\'/tasks\', listTasks)</code> (see <a href="#/server/routes/routes">Routes</a>).</dd>'
        + '<dt>Middleware</dt><dd>Functions every request passes through, in order: logging, parsing the body, checking a login (see <a href="#/server/routes/middleware">Middleware</a>).</dd>'
        + '<dt>Helpers on <code>req</code> and <code>res</code></dt><dd>The request already parsed (<code>req.params</code>, <code>req.query</code>) and one-line answers (<code>res.status(201).json(task)</code>).</dd></dl>',
      '<h3>The app and app.listen</h3>',
      '<ul><li><strong><code>const app = express()</code></strong> creates an empty app. Each <code>app.use</code>, <code>app.get</code> or <code>app.post</code> adds one layer, in the order the lines run.</li>'
        + '<li><strong><code>app.listen(PORT, callback)</code></strong> opens the port and hands every request to the app. The callback runs <strong>once</strong>, when the server is ready, not once per request.</li>'
        + '<li><strong>The port</strong> usually comes from the environment, <code>const PORT = process.env.PORT || 3000</code> (see <a href="#/server/runtime/env-vars">Environment variables</a>). The process then waits for requests until Ctrl+C.</li>'
        + '<li><strong>Unopinionated:</strong> Express chooses no folders, database or validation library; projects add their own conventions (see <a href="#/server/runtime/project-layout">A project layout</a>).</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Node receives the request; the app passes it through its layers to the handler that answers.',
      desc: 'A browser or curl sends a request to the port. The Node http server opened by app.listen hands it to the Express app, which runs its middleware and routes in order until the first matching handler, a function of req and res, answers.',
      nodes: [
        { id: 'client', label: 'Browser or `curl`' },
        { id: 'server', label: 'Node server', note: '`app.listen(3000)`' },
        { id: 'app', label: 'The `app`', note: 'its layers, in order', key: true },
        { id: 'handler', label: 'Your handler', note: '`(req, res)`' },
      ],
      edges: [['client', 'server', 'request'], ['server', 'app'], ['app', 'handler', 'first match']],
    },
    code: `const express = require('express');
// an empty list of layers
const app = express();

// one route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // runs once, when ready
  console.log(\`Listening on http://localhost:\${PORT}\`);
});`,
    example: 'Run it with `node --watch src/server.js`: the terminal prints `Listening on http://localhost:3000` once and stays busy. In a second terminal, `curl http://localhost:3000/health` prints `{"status":"ok"}`. Adding `GET /tasks/:id` is one more line, `app.get(\'/tasks/:id\', getTask)`, with the id waiting in `req.params.id`; any unknown URL still gets a `404` from Express, without another `else`.',
    mistake: 'Thinking Express replaces Node. It is an npm package: `express()` returns an ordinary function that Node\'s `http` server calls for each request, so every error is a Node error and everything in Server-side JavaScript still applies. Starting it twice, for instance, gives Node\'s `EADDRINUSE` (see [A first server](#/server/runtime/first-server)).' },

  { id: 'curl-basics', hub: 'basics', topic: 'basics',
    title: 'curl: sending requests from the terminal',
    summary: '`curl` sends an HTTP request from the terminal and prints the response, so you can try any route, with any method, headers and body, without a browser or a front end.',
    html: [
      '<p>A browser\'s address bar only sends <code>GET</code>. To try <code>POST</code>, <code>PATCH</code> or <code>DELETE</code>, send headers or see the status line, use curl: it comes with Windows 10 and later, macOS and Linux. Each flag adds one part of the request.</p>',
      '<dl><dt><code>curl URL</code></dt><dd>A <code>GET</code> request; prints the response body.</dd>'
        + '<dt><code>-i</code></dt><dd>Also prints the status line and the response headers.</dd>'
        + '<dt><code>-X POST</code></dt><dd>Chooses the method. Without it curl sends <code>GET</code>, or <code>POST</code> when there is a body.</dd>'
        + '<dt><code>-H "Content-Type: application/json"</code></dt><dd>Adds a request header; repeat it for more (<code>-H "Authorization: Bearer …"</code>).</dd>'
        + '<dt><code>-d \'{"title":"Study"}\'</code></dt><dd>Sends a body. Without the <code>Content-Type</code> header curl labels it form data, and the server\'s JSON parser skips it (see <a href="#/server/routes/body-parsing">express.json()</a>).</dd></dl>',
      '<pre><code>curl -i http://localhost:3000/health\n'
        + 'curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d \'{"title":"Study"}\'\n'
        + 'curl -X DELETE http://localhost:3000/tasks/1</code></pre>',
      '<table><caption>Writing the JSON body in each terminal</caption><thead><tr><th scope="col">Terminal</th><th scope="col">How</th></tr></thead><tbody>'
        + '<tr><th scope="row">Git Bash, macOS, Linux</th><td><code>-d \'{"title":"Study"}\'</code></td></tr>'
        + '<tr><th scope="row">Windows PowerShell 5.1</th><td>Type <code>curl.exe</code> (plain <code>curl</code> there is another command) and escape the inner quotes: <code>-d \'{\\"title\\":\\"Study\\"}\'</code></td></tr>'
        + '<tr><th scope="row">Command Prompt (cmd)</th><td><code>-d "{\\"title\\":\\"Study\\"}"</code></td></tr>'
        + '</tbody></table>',
    ],
    example: '`curl -i http://localhost:3000/health` prints the status line `HTTP/1.1 200 OK`, the headers (`Content-Type: application/json; charset=utf-8`, `X-Powered-By: Express`…), a blank line, and the body `{"status":"ok"}`. Without `-i` you see only the body.',
    mistake: 'Sending JSON with `-d` but no `-H "Content-Type: application/json"`. curl labels the body `application/x-www-form-urlencoded`, the server\'s JSON parser skips it, and the route sees an empty body: a `400 title is required` although the JSON was right there.' },

  /* ---- 2. Routes and their parameters ---------------------------------------------- */
  { id: 'routes', hub: 'routing', topic: 'routing',
    title: 'Routes: method + path + handler',
    summary: 'A **route** connects one HTTP method and one path pattern to a **handler** function: `app.get(\'/tasks\', listTasks)` means "when a GET request for `/tasks` arrives, call `listTasks(req, res)`".',
    html: [
      '<p>There is one Express function per method (see <a href="#/http/web/http-methods">HTTP methods</a>): <code>app.get</code>, <code>app.post</code>, <code>app.put</code>, <code>app.patch</code>, <code>app.delete</code>, and <code>app.all</code> for any method. The path is a pattern: fixed text such as <code>/tasks</code>, and <strong>parameters</strong> such as <code>:id</code> that match any one segment (see <a href="#/server/routes/route-params">Route parameters</a>).</p>',
      '<h3>How a route matches</h3>',
      '<ul><li><strong>The whole path,</strong> not its beginning: <code>/tasks</code> answers <code>/tasks</code>, not <code>/tasks/7</code>.</li>'
        + '<li><strong>Forgiving by default:</strong> a trailing slash is optional and letters are case-insensitive, so <code>/TASKS/</code> matches.</li>'
        + '<li><strong>Never the query string:</strong> <code>?done=true</code> plays no part.</li>'
        + '<li><strong>No match:</strong> Express answers <code>404</code> with an HTML page, <code>Cannot GET /x</code>. It sends no <code>405</code> when the path exists with another method: <code>POST /health</code> on an app with only <code>GET /health</code> is <code>Cannot POST /health</code>.</li></ul>',
    ],
    code: `// GET    /tasks
app.get('/tasks', listTasks);
// POST   /tasks
app.post('/tasks', createTask);
// GET    /tasks/7, /tasks/abc …
app.get('/tasks/:id', getTask);
// PATCH  /tasks/7
app.patch('/tasks/:id', updateTask);
// DELETE /tasks/7
app.delete('/tasks/:id', deleteTask);`,
    example: 'With the five routes above: `GET /tasks` → `listTasks`; `GET /Tasks/` → `listTasks` too (case and trailing slash ignored); `PUT /tasks/7` → no route has PUT, so Express answers `404 Cannot PUT /tasks/7`; `GET /tasks/7/comments` → `404`, because `/tasks/:id` has two segments and the URL has three.',
    mistake: 'Testing a `POST` route by typing its URL in the browser\'s address bar. The browser always sends `GET`, so you get `Cannot GET /tasks` and conclude the route is broken. Use [curl](#/server/routes/curl-basics) with `-X POST`, or a `fetch` call with `method: \'POST\'`.',
    widget: 'route-matcher' },

  { id: 'route-params', hub: 'routing', topic: 'routing',
    title: 'Route parameters: req.params',
    summary: 'A segment written `:name` in a route path is a **route parameter**: it matches any one segment of the URL and its value appears, as a **string**, in `req.params.name`.',
    html: [
      '<p><code>/tasks/:id</code> reads "<code>/tasks/</code> followed by <strong>one</strong> segment; call it <code>id</code>". For <code>/tasks/42</code>, <code>req.params</code> is <code>{ id: \'42\' }</code>. A segment is the text between two slashes, so a parameter never swallows a <code>/</code>.</p>',
      '<ul><li><strong>Several parameters:</strong> <code>/users/:userId/tasks/:taskId</code> fills one key each.</li>'
        + '<li><strong>Always text:</strong> the URL is text and Express does not guess types, so convert before comparing with numbers: <code>Number(req.params.id)</code>. Percent-escapes are decoded: <code>/tasks/a%20b</code> gives <code>\'a b\'</code>.</li>'
        + '<li><strong>Any value fits:</strong> <code>/tasks/:id</code> also matches <code>/tasks/stats</code>, with <code>id = \'stats\'</code>. That is why route order matters (see <a href="#/server/routes/route-order">Order of routes</a>) and why a handler checks the value it receives.</li></ul>',
    ],
    code: `app.get('/users/:userId/tasks/:taskId', (req, res) => {
  // GET /users/7/tasks/42
  console.log(req.params);
  // → { userId: '7', taskId: '42' }
  const taskId = Number(req.params.taskId);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ error: 'taskId must be a number' });
  }
  res.json({ userId: req.params.userId, taskId });
});`,
    example: 'An echo route `GET /echo/:msg` answers `{ "echo": req.params.msg }`. `curl http://localhost:3000/echo/hello` gives `{"echo":"hello"}`; `/echo/hello%20world` gives `{"echo":"hello world"}`; `/echo/hello/world` gives `404`, because `:msg` takes exactly one segment.',
    mistake: 'Comparing the raw parameter with a number: `tasks.find((t) => t.id === req.params.id)`. `7 === \'7\'` is `false` (strict equality compares types too), so the task is never found and every request answers `404`. Convert first: `t.id === Number(req.params.id)`.',
    practice: { href: '#/server/routes/practice/route-matcher', label: 'Try params in the route matcher' } },

  { id: 'query-strings', hub: 'routing', topic: 'routing',
    title: 'Query strings: req.query',
    summary: 'The part of the URL after `?` holds optional `key=value` pairs; Express parses it into the object `req.query`, whose values are **strings** (or arrays of strings when a key repeats). It never takes part in route matching.',
    html: [
      '<p>A path parameter says <strong>which</strong> thing you want; the query string says <strong>how</strong>: filtered, sorted, one page. <code>GET /tasks?done=false&amp;sort=title</code> is still the tasks list, so the route is just <code>app.get(\'/tasks\')</code> and the handler reads <code>req.query.done</code>. A key the client did not send is <code>undefined</code>.</p>',
      '<dl><dt><code>?page=2</code></dt><dd><code>\'2\'</code>: every value is a string.</dd>'
        + '<dt><code>?done=false</code></dt><dd>The string <code>\'false\'</code>, which is <strong>truthy</strong> in an <code>if</code>: compare as text, <code>=== \'true\'</code>.</dd>'
        + '<dt><code>?tag=css&amp;tag=html</code></dt><dd>A repeated key becomes an array: <code>[\'css\', \'html\']</code>.</dd>'
        + '<dt><code>?q=hello+world</code></dt><dd><code>+</code> is a space.</dd>'
        + '<dt><code>?filter[done]=true</code></dt><dd>An object in Express 4; Express 5 turns brackets off by default.</dd></dl>',
      '<p>The Try it box uses <code>URLSearchParams</code>, the browser\'s own query-string parser, which follows the same rules for plain keys.</p>',
    ],
    live: { kind: 'js', code: `// What Express does with "?done=false&page=2&tag=css&tag=html&q=hello+world"
const params = new URLSearchParams('done=false&page=2&tag=css&tag=html&q=hello+world');

// a string
console.log(params.get('page'), typeof params.get('page'));
// repeated key
console.log(params.getAll('tag'));
// + is a space
console.log(params.get('q'));
// missing → null (undefined in req.query)
console.log(params.get('sort'));

const done = params.get('done');
if (done) console.log('"false" is a non-empty string, so this runs!');
console.log('compare as text:', done === 'true');` },
    example: 'A tasks API filters on the server: `GET /tasks?done=true`. A correct controller writes `const { done } = req.query; const list = done === undefined ? tasks : tasks.filter((t) => String(t.done) === done);`. `GET /tasks` returns everything, `?done=true` the finished tasks, `?done=false` the others.',
    mistake: 'Putting the query string in the route: `app.get(\'/tasks?done=true\', …)`. Express matches only the path, and `?` has a special meaning in Express 4 patterns, so this route never matches what you expect. Register `/tasks` and read `req.query.done` inside.' },

  { id: 'route-order', hub: 'routing', topic: 'routing',
    title: 'Order of routes: the first match wins',
    summary: 'Express tries routes **in the order they were registered** and runs the first one whose method and path match. It never looks for the "most specific" route, so a pattern like `/tasks/:id` placed before `/tasks/stats` captures `stats` as an id.',
    html: [
      '<p>Express reads routes like a list of rules, top to bottom, and stops at the first one that fits. <code>:id</code> fits any single segment, so for <code>GET /tasks/stats</code> the rule <code>/tasks/:id</code> fits with <code>id = \'stats\'</code>. If it comes first it answers (usually <code>404 Task not found</code>), and the <code>/tasks/stats</code> route below it is <strong>shadowed</strong>: never reached.</p>',
      '<p><strong>Specific before general:</strong> fixed paths (<code>/tasks/stats</code>, <code>/tasks/export</code>) above parameter paths (<code>/tasks/:id</code>), and catch-alls such as the 404 handler after every route.</p>',
    ],
    code: `// Wrong order: GET /tasks/stats → getTask with id 'stats' → 404
app.get('/tasks/:id', getTask);
// never reached
app.get('/tasks/stats', taskStats);

// Right order
// fixed path first
app.get('/tasks/stats', taskStats);
app.get('/tasks/:id', getTask);`,
    example: 'A tasks API needs a `GET /tasks/stats` endpoint. A developer adds it at the bottom of the file, under `app.get(\'/tasks/:id\', getTask)`, and gets `{"error":"Task not found"}`. Nothing is wrong with the stats code: moving its line above the `:id` route fixes it.',
    mistake: '"Express picks the best-matching route." It does not compare routes at all; it walks the list in order. The same goes for middleware (see [Order is configuration](#/server/routes/middleware-order)): order in the file **is** the configuration.',
    practice: { href: '#/server/routes/practice/route-matcher', label: 'Fix the order in the route matcher' } },

  /* ---- 3. Reading the request, sending the answer -------------------------------- */
  { id: 'req-object', hub: 'reqres', topic: 'reqres',
    title: 'Reading the request: req',
    summary: '`req` is the request as an object: the method and URL, the route parameters, the parsed query string and body, and the headers. Express fills most of it before your handler runs.',
    html: [
      '<table><caption>The parts of req you will use (request: PATCH /tasks/7?notify=true with a JSON body)</caption><thead><tr><th scope="col">Property</th><th scope="col">Value in the example</th><th scope="col">Filled by</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>req.method</code></th><td><code>\'PATCH\'</code></td><td>Node</td></tr>'
        + '<tr><th scope="row"><code>req.originalUrl</code></th><td><code>\'/tasks/7?notify=true\'</code></td><td>Express: the full URL as sent</td></tr>'
        + '<tr><th scope="row"><code>req.path</code></th><td><code>\'/tasks/7\'</code></td><td>Express: the path, without the query</td></tr>'
        + '<tr><th scope="row"><code>req.params</code></th><td><code>{ id: \'7\' }</code></td><td>Express, from the route pattern <code>/tasks/:id</code></td></tr>'
        + '<tr><th scope="row"><code>req.query</code></th><td><code>{ notify: \'true\' }</code></td><td>Express, from the query string</td></tr>'
        + '<tr><th scope="row"><code>req.body</code></th><td><code>{ done: true }</code></td><td>The JSON parser, <code>express.json()</code>; <code>undefined</code> without it (see <a href="#/server/routes/body-parsing">express.json()</a>)</td></tr>'
        + '<tr><th scope="row"><code>req.get(\'Content-Type\')</code></th><td><code>\'application/json\'</code></td><td>Node (headers), read without caring about case</td></tr>'
        + '<tr><th scope="row"><code>req.user</code></th><td><code>{ id: 1, name: \'Ana\' }</code></td><td>Your own auth middleware, if any (see <a href="#/server/routes/guard-middleware">Guards</a>)</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Headers arrive lower-cased</strong> in <code>req.headers</code> (<code>req.headers[\'content-type\']</code>), whatever capitals the client used. <code>req.get(\'Content-Type\')</code> ignores case, so prefer it.</li>'
        + '<li><strong>Middleware writes on <code>req</code></strong> before your handler runs: the JSON parser fills <code>req.body</code>, an auth middleware adds <code>req.user</code> (see <a href="#/server/routes/middleware">Middleware</a>).</li>'
        + '<li><strong>Inside a router</strong> <code>req.path</code> loses the router\'s prefix, while <code>req.originalUrl</code> keeps the full URL (see <a href="#/server/routes/routers">express.Router()</a>).</li></ul>',
    ],
    example: 'For that `PATCH /tasks/7?notify=true`: `Number(req.params.id)` is `7`; `req.query.notify === \'true\'` is `true` (compare as text); and `req.body.done` is `true` once the JSON parser has run, because JSON keeps booleans as booleans.',
    mistake: 'Reading `req.headers[\'Content-Type\']` and getting `undefined`. Node lower-cases every header name, so the key is `\'content-type\'`. Use `req.get(\'Content-Type\')`, which works with any capitalisation.' },

  { id: 'res-object', hub: 'reqres', topic: 'reqres',
    title: 'Answering: res',
    summary: '`res` builds the response: `res.status(code)` sets the status, `res.set(name, value)` a header, and one **sending** method ends it: `res.json(data)`, `res.send(text)`, `res.sendStatus(code)` or `res.end()`.',
    html: [
      '<p><code>res.status()</code> and <code>res.set()</code> only prepare the answer; nothing leaves until a <strong>sending</strong> method runs. <code>status()</code> returns <code>res</code> itself, so calls chain: <code>res.status(201).json(task)</code>. When you set no status, it is <code>200</code>.</p>',
      '<table><caption>The res methods you will use most</caption><thead><tr><th scope="col">Call</th><th scope="col">Sends?</th><th scope="col">Result</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>res.status(404)</code></th><td>No</td><td>Sets the status code; returns <code>res</code> for chaining</td></tr>'
        + '<tr><th scope="row"><code>res.set(\'Location\', \'/tasks/8\')</code></th><td>No</td><td>Sets a header (also <code>res.location(url)</code>)</td></tr>'
        + '<tr><th scope="row"><code>res.json({ id: 8 })</code></th><td>Yes</td><td>JSON body with <code>Content-Type: application/json</code></td></tr>'
        + '<tr><th scope="row"><code>res.send(\'&lt;h1&gt;Hi&lt;/h1&gt;\')</code></th><td>Yes</td><td>Text body, <code>Content-Type: text/html</code> by default</td></tr>'
        + '<tr><th scope="row"><code>res.sendStatus(204)</code></th><td>Yes</td><td>Only the status (and its reason as text, except 204)</td></tr>'
        + '<tr><th scope="row"><code>res.status(204).end()</code></th><td>Yes</td><td>No body at all</td></tr>'
        + '</tbody></table>',
      '<p><code>res.json(value)</code> is the normal choice for an API: it turns the value into JSON and sets <code>Content-Type: application/json; charset=utf-8</code> (see <a href="#/http/web/http-response">Inside an HTTP response</a>). <code>res.send(object)</code> behaves the same; <code>res.send(\'text\')</code> sends HTML.</p>',
    ],
    example: 'A complete creation answer: `res.status(201).location(`/tasks/${task.id}`).json(task)`. On the wire: `HTTP/1.1 201 Created`, a `Location: /tasks/4` header, `Content-Type: application/json; charset=utf-8`, and the body `{"id":4,"title":"Study","done":false}`.',
    mistake: 'Writing `res.status(201)` and stopping there, expecting it to answer. It only sets a number: no sending method was called, so the request **hangs** until the client gives up. Every path through a handler must end with exactly one sending call (see [Exactly one response](#/server/routes/one-response)).' },

  { id: 'one-response', hub: 'reqres', topic: 'reqres',
    title: 'Exactly one response per request',
    summary: 'Every request must get **one** response: zero means the request hangs; two means Node throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. Write `return res.…` whenever more code follows.',
    html: [
      '<p>HTTP is a question and one answer. Once <code>res.json()</code> has sent the status line and the headers, they are gone over the network, so the first sending call wins and a second one fails with <code>ERR_HTTP_HEADERS_SENT</code>. The client never sees that error, because it already has the first answer: you see it in the terminal.</p>',
      '<h3>Where the two failures come from</h3>',
      '<ul><li><strong>Two responses:</strong> an early answer without <code>return</code>. <code>res.status(400).json(…)</code> sends but does <strong>not</strong> stop the function, so the next lines run and try to send again. <code>return res.status(400).json(…)</code> sends and leaves in one step.</li>'
        + '<li><strong>No response:</strong> a path that sends nothing, such as an <code>if</code> with no <code>else</code> or a <code>catch</code> that only logs. Nothing times out on the server: the browser spins, and automated tests fail with a timeout.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Every path through a handler must send exactly once.',
      desc: 'A handler can end in three ways. If it sends nothing, the request hangs. If it sends once, the client gets that response. If it sends twice, Node throws ERR_HTTP_HEADERS_SENT.',
      nodes: [
        { id: 'handler', label: 'A handler' },
        { id: 'none', label: 'Sends nothing', note: 'the request hangs' },
        { id: 'one', label: 'Sends once', note: 'the client gets it', key: true },
        { id: 'two', label: 'Sends twice', note: '`ERR_HTTP_HEADERS_SENT`' },
      ],
      edges: [['handler', 'none'], ['handler', 'one'], ['handler', 'two']],
    },
    code: `// Bug: without return, a body without title sends TWO responses
function createTask(req, res) {
  const { title } = req.body;
  if (!title) res.status(400).json({ error: 'title is required' });
  // still runs!
  const task = { id: tasks.length + 1, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
  // → Error [ERR_HTTP_HEADERS_SENT]
}

// Fixed: return stops the function after the 400
function createTask(req, res) {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const task = { id: tasks.length + 1, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
}`,
    example: 'With the buggy version, `POST /tasks` with `{}` returns `400` to the client, which looks right. But the function also pushed a task with `title: undefined` into the array, and the terminal shows `Error [ERR_HTTP_HEADERS_SENT]`. The next `GET /tasks` lists a task with no title: the bug corrupted data while the client saw a correct status.',
    mistake: 'Fixing the error message by wrapping the second `res.json` in `try`/`catch`. The real bug is that the code kept running after it answered; the fix is `return` (or `if`/`else`), so only one branch ever sends.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Fix it in challenge 8 of the pipeline simulator' } },

  /* ---- 4. Middleware --------------------------------------------------------------- */
  { id: 'middleware', hub: 'middleware', topic: 'middleware',
    title: 'Middleware: (req, res, next)',
    summary: 'A **middleware** is a function `(req, res, next)` that Express runs for each request in registration order. It may change `req` or `res`, and then it must do one of two things: call `next()` to pass the request on, or **send a response** to end it. Doing neither leaves the request hanging.',
    html: [
      '<p><code>next</code> is a function Express hands to each middleware: calling it means "I am done, run the next matching layer". Route handlers are the same kind of function at the end of the line, which usually answer instead.</p>',
      '<ul><li><strong><code>app.use(fn)</code></strong> runs <code>fn</code> for every method and every path.</li>'
        + '<li><strong><code>app.use(\'/api\', fn)</code></strong> runs it only for paths that <strong>start with</strong> <code>/api</code>, at a slash boundary: <code>/api/tasks</code> yes, <code>/apiary</code> no. That prefix matching is the big difference from routes, which match the whole path and one method.</li>'
        + '<li><strong><code>next(err)</code></strong> means "something failed": Express skips every ordinary layer up to the error handler (see <a href="#/server/routes/error-handler">The error handler</a>).</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'A middleware ends in one of four ways; only one of them leaves the request stuck.',
      desc: 'A middleware either calls next() and the next layer runs, or sends a response and the request ends there, or calls next(err) and Express jumps to the error handler. If it does none of these, the request hangs.',
      nodes: [
        { id: 'mw', label: 'A middleware', key: true },
        { id: 'next', label: '`next()`', note: 'the next layer runs' },
        { id: 'send', label: '`res.json(…)`', note: 'the request ends here' },
        { id: 'err', label: '`next(err)`', note: 'to the error handler' },
        { id: 'none', label: 'Neither', note: 'the request hangs' },
      ],
      edges: [['mw', 'next'], ['mw', 'send'], ['mw', 'err'], ['mw', 'none']],
    },
    code: `// Logs, then passes the request on
function logger(req, res, next) {
  console.log(\`\${req.method} \${req.url}\`);
  // forget this and every request hangs
  next();
}

// Answers early, or passes on
function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    // ends here
    return res.status(415).json({ error: 'Send JSON' });
  }
  next();
}

app.use(logger);
app.use(requireJson);`,
    example: 'Request `GET /tasks` on a typical tasks app (JSON parser, logger, `/health`, `/echo/:msg`, the tasks routes, 404, error handler): `express.json()` runs and calls `next()` (no body to read); `logger` prints `GET /tasks` and calls `next()`; `GET /health` and `GET /echo/:msg` do not match and are skipped; `GET /tasks` matches and `listTasks` answers `200`. The layers after it (the 404 catch-all, the error handler) never run.',
    mistake: 'Writing a logger without `next()`. The terminal prints `GET /health` (so "the middleware works"), but the browser spins forever and `curl` never returns. Remember the rule: forget `next()` and every request hangs forever.',
    widget: 'middleware-pipeline' },

  { id: 'body-parsing', hub: 'middleware', topic: 'middleware',
    title: 'express.json() and req.body',
    summary: '`express.json()` is built-in middleware that reads the request body and, **when the request has `Content-Type: application/json`**, parses it into `req.body`. Without it `req.body` is `undefined`; with the wrong `Content-Type` it is `{}` (Express 4); with broken JSON it sends an error with status `400` to your error handler.',
    html: [
      '<p>A request body arrives as raw bytes, possibly in several pieces, after the headers (see <a href="#/http/web/http-request">Inside an HTTP request</a>). <code>express.json()</code> waits for all of it, checks the <code>Content-Type</code> header and, only when it says <code>application/json</code>, turns the JSON text into the object <code>req.body</code>.</p>',
      '<table><caption>What a route finds in req.body</caption><thead><tr><th scope="col">Situation</th><th scope="col"><code>req.body</code></th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row">No <code>express.json()</code> before the route</th><td><code>undefined</code></td><td>No parser ran</td></tr>'
        + '<tr><th scope="row">No body, or another <code>Content-Type</code></th><td><code>{}</code> in Express 4 (<code>undefined</code> in Express 5)</td><td>The parser skipped the body</td></tr>'
        + '<tr><th scope="row">Valid JSON</th><td>The object</td><td>Parsed</td></tr>'
        + '<tr><th scope="row">Broken JSON (<code>{title: x}</code>)</th><td>The route never runs: <code>400</code></td><td>The parser calls <code>next(err)</code> with <code>err.status = 400</code></td></tr>'
        + '<tr><th scope="row">A body over 100 kB</th><td>The route never runs: <code>413</code></td><td>The default size limit</td></tr>'
        + '</tbody></table>',
      '<p>An HTML form sends <code>application/x-www-form-urlencoded</code> (<code>title=Study&amp;done=on</code>, built from the inputs\' <code>name</code> attributes, see <a href="#/browser/html/forms-basics">Forms</a>). For those, add <code>express.urlencoded({ extended: false })</code>.</p>',
    ],
    code: `// before the routes!
app.use(express.json());

app.post('/tasks', (req, res) => {
  console.log(req.body);
  // → { title: 'Buy milk' }
  res.status(201).json({ received: req.body });
});

// The client must say the body is JSON:
// curl -X POST http://localhost:3000/tasks \\
//   -H "Content-Type: application/json" \\
//   -d '{"title":"Buy milk"}'`,
    dialect: 'JavaScript + shell',
    example: 'Run the [curl](#/server/routes/curl-basics) `POST /tasks` command without the `-H "Content-Type: application/json"` line. curl then labels the body `application/x-www-form-urlencoded`, `express.json()` skips it, and `req.body` is `{}`: a controller that echoes the body answers `{"received":{}}`, and a validating one answers `400 title is required`, although the JSON was right there.',
    mistake: 'Blaming the controller when `req.body` is `undefined`. That value means no body parser ran before the route: `express.json()` is missing or registered after it. `{}` means the parser ran but skipped the body: check the client\'s `Content-Type`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenge 1 of the pipeline simulator' } },

  { id: 'common-middleware', hub: 'middleware', topic: 'middleware',
    title: 'Middleware you will use: static, cors, logging',
    summary: 'A handful of middleware covers most projects: `express.json()` and `express.urlencoded()` (bodies), `express.static(\'public\')` (files for the browser), `cors()` (calls from other origins) and a request logger (`morgan` or your own). The first three come with Express; `cors` and `morgan` are npm packages you install.',
    html: [
      '<p>Each does one job every request needs, so no route repeats it. <code>express.json()</code> or <code>cors()</code> <strong>returns</strong> a configured <code>(req, res, next)</code> function: that is why you write <code>app.use(cors())</code> with brackets but <code>app.use(logger)</code> without, since <code>logger</code> already is the function.</p>',
      '<table><caption>Common middleware</caption><thead><tr><th scope="col">Middleware</th><th scope="col">Comes from</th><th scope="col">What it does</th><th scope="col">Register</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>express.json()</code></th><td>Express</td><td>JSON body → <code>req.body</code></td><td>Early, before routes</td></tr>'
        + '<tr><th scope="row"><code>express.urlencoded({ extended: false })</code></th><td>Express</td><td>HTML form body → <code>req.body</code></td><td>Early, before routes</td></tr>'
        + '<tr><th scope="row"><code>express.static(\'public\')</code></th><td>Express</td><td>Sends files from a folder, else <code>next()</code></td><td>Before the API routes</td></tr>'
        + '<tr><th scope="row"><code>cors()</code></th><td><code>npm install cors</code></td><td>Adds CORS headers for browser calls from other origins</td><td>First, before routes</td></tr>'
        + '<tr><th scope="row"><code>morgan(\'dev\')</code></th><td><code>npm install morgan</code></td><td>One log line per request (method, URL, status, time)</td><td>Early</td></tr>'
        + '<tr><th scope="row"><code>logger</code> (yours)</th><td>Your file</td><td>Prints <code>METHOD URL</code>, then <code>next()</code></td><td>Early</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong><code>express.static</code></strong> answers <code>GET /styles.css</code> with <code>public/styles.css</code> and <code>/</code> with <code>public/index.html</code>, and calls <code>next()</code> when no file matches, so the API routes below still work. The folder is resolved from where you ran <code>node</code>; <code>path.join(__dirname, \'..\', \'public\')</code> is safer (see <a href="#/server/runtime/files-and-paths">Files and paths</a>).</li>'
        + '<li><strong><code>cors()</code></strong> lets a page from another origin read your responses. It protects nothing: browsers enforce CORS and curl ignores it (see <a href="#/server/auth/cors-headers">CORS: the server says who may read</a>).</li></ul>',
    ],
    example: 'An `app.js` that serves a front end and an API starts with `app.use(cors()); app.use(express.json()); app.use(logger); app.use(express.static(\'public\'));`. A browser asking for `/` gets `public/index.html` from `express.static`; the page\'s script calls `fetch(\'/api/tasks\')`, which finds no file, falls through `express.static`, and reaches the tasks routes.',
    mistake: '`Error: Cannot find module \'cors\'`: only `express.json`, `express.urlencoded` and `express.static` ship with Express. `cors` and `morgan` must be installed first (`npm install cors morgan`), which also adds them to `dependencies` in `package.json`.' },

  { id: 'guard-middleware', hub: 'middleware', topic: 'middleware',
    title: 'Guards: middleware that can stop a request',
    summary: 'A **guard** is middleware that checks something (usually who is calling) and either stops the request with an error response (`401`, `403`) or adds what it learned to `req` (such as `req.user`) and calls `next()`.',
    html: [
      '<p>The shape is always the same: <code>return</code> the error response, otherwise add what you learned to <code>req</code> and call <code>next()</code>. The handlers behind the guard can then trust <code>req.user</code> without checking again. How a real token is verified is in <a href="#/server/auth/auth-middleware">The auth middleware</a>; here it is a fixed demo token.</p>',
      '<p>Forgetting the <code>return</code> sends the <code>401</code> <strong>and</strong> runs the protected route, which then tries to answer too (see <a href="#/server/routes/one-response">Exactly one response</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'A guard either answers and stops, or records who is calling and lets the request through.',
      desc: 'The requireAuth guard reads the Authorization header. Without a valid token it answers 401 and the request stops. With a valid token it sets req.user and calls next(), so the protected route runs.',
      nodes: [
        { id: 'guard', label: '`requireAuth`', key: true },
        { id: 'stop', label: 'Answers 401', note: 'the request stops' },
        { id: 'pass', label: 'Sets `req.user`', note: 'then `next()`: the route runs' },
      ],
      edges: [['guard', 'stop', 'no valid token'], ['guard', 'pass', 'valid token']],
    },
    code: `function requireAuth(req, res, next) {
  const header = req.get('Authorization');
  // → "Bearer <token>"
  if (header !== 'Bearer demo-token') {
    return res.status(401).json({ error: 'Log in first' });
  }
  // a real app verifies a JWT here
  req.user = { id: 1, name: 'Ana' };
  next();
}

// public: above the guard
app.get('/api/health', health);
// guards everything below under /api
app.use('/api', requireAuth);
app.get('/api/me', (req, res) => res.json({ user: req.user }));`,
    example: '`curl http://localhost:3000/api/me` → `401 {"error":"Log in first"}`. `curl -H "Authorization: Bearer demo-token" http://localhost:3000/api/me` → `200 {"user":{"id":1,"name":"Ana"}}`. `curl http://localhost:3000/api/health` → `200` without a token, because that route is registered before the guard.',
    mistake: 'Registering the guard after the route it should protect. The route answers first, `req.user` is `undefined`, and `res.json({ user: undefined })` sends `{}` with status `200`: no error anywhere, just an unprotected endpoint.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenges 2 and 3 of the pipeline simulator' } },

  { id: 'middleware-order', hub: 'middleware', topic: 'middleware',
    title: 'Order is configuration',
    summary: 'Express runs layers in the order they were registered, so the order of `app.use` and route lines decides what each request meets: parsers and loggers first, guards before what they protect, routes, then the 404 catch-all, and the error handler last.',
    html: [
      '<p>A layer only affects what comes <strong>after</strong> it in the list. <code>express.json()</code> registered below a route has not run when that route reads <code>req.body</code>; a guard registered below <code>/api/me</code> protects nothing. Reading <code>app.js</code> from top to bottom is reading the journey of every request.</p>',
      '<figure data-diagram></figure>',
      '<p>Middleware can also be attached to <strong>one route</strong>, <code>app.get(\'/api/me\', requireAuth, getMe)</code>, or to one prefix, <code>app.use(\'/api/admin\', requireAdmin)</code>. Choose the narrowest place that covers what you need.</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Register in this order: each layer only affects the ones below it.',
      desc: 'Six bands, top to bottom, in registration order: global middleware such as cors(), express.json() and the logger; public routes such as /health and the log-in route; guards such as app.use with /api and requireAuth; the protected routes and routers; the 404 catch-all; and the error handler with four parameters, always last.',
      nodes: [
        { id: 'global', label: 'Global middleware', note: '`cors()`, `express.json()`, logger' },
        { id: 'public', label: 'Public routes', note: '`/health`, the log-in route' },
        { id: 'guards', label: 'Guards', note: '`app.use(\'/api\', requireAuth)`', key: true },
        { id: 'protected', label: 'Protected routes', note: 'routers under `/api`' },
        { id: 'notfound', label: '404 catch-all', note: 'nothing matched' },
        { id: 'errors', label: 'Error handler', note: 'four parameters, always last' },
      ],
      edges: [],
    },
    example: 'In the "Protected API" preset of the pipeline simulator, `GET /api/health` is registered **above** `app.use(\'/api\', requireAuth)`, so it stays public: health checks work without a token. `GET /api/me` is registered below the guard, so without `Authorization: Bearer demo-token` it answers `401`.',
    mistake: 'Moving `app.use(express.json())` to the bottom of `app.js` "to keep the setup tidy". Every route above it now sees `req.body` as `undefined`, and `POST /tasks` crashes with `Cannot destructure property \'title\' of \'req.body\'`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Reorder layers in the pipeline simulator' } },

  /* ---- 5. Structuring the app --------------------------------------------------- */
  { id: 'routers', hub: 'structure', topic: 'structure',
    title: 'express.Router(): routes under a prefix',
    summary: '`express.Router()` creates a mini-app that holds routes (and middleware) for one resource. `app.use(\'/tasks\', tasksRouter)` mounts it: requests whose path starts with `/tasks` enter the router, and inside it the prefix is removed, so `router.get(\'/\')` means `GET /tasks`.',
    html: [
      '<p>A router describes one resource without repeating its prefix on every line, and the whole group moves (to <code>/api/tasks</code>, say) by changing one line in <code>app.js</code>. While a request is inside the router, Express <strong>strips the mount path</strong>.</p>',
      '<figure data-diagram></figure>',
      '<dl><dt><code>req.path</code></dt><dd><code>\'/7\'</code> for <code>GET /tasks/7</code>: the path inside the router.</dd>'
        + '<dt><code>req.baseUrl</code></dt><dd><code>\'/tasks\'</code>: the mount path.</dd>'
        + '<dt><code>req.originalUrl</code></dt><dd><code>\'/tasks/7\'</code>: the full URL as sent.</dd></dl>',
      '<ul><li><strong>No match inside:</strong> the request leaves the router and continues with the next layer of the app, such as the 404 catch-all.</li>'
        + '<li><strong>Parameters in the mount path</strong> (<code>app.use(\'/users/:userId/tasks\', router)</code>) reach the router\'s <code>req.params</code> only with <code>express.Router({ mergeParams: true })</code>.</li></ul>',
    ],
    diagram: {
      kind: 'tree',
      title: 'Inside the router, paths are relative to its mount path.',
      desc: 'The app has a /health route and mounts the tasks router at /tasks. Inside the router, GET / is the list, POST / creates a task and GET /:id reads one task; their full paths are /tasks, /tasks and /tasks/7.',
      nodes: [
        { id: 'app', label: 'The `app`' },
        { id: 'health', label: '`GET /health`' },
        { id: 'router', label: '`/tasks` router', key: true },
        { id: 'list', label: '`GET /`', note: 'the list' },
        { id: 'create', label: '`POST /`', note: 'creates a task' },
        { id: 'one', label: '`GET /:id`', note: 'one task' },
      ],
      edges: [['app', 'health'], ['app', 'router'], ['router', 'list'], ['router', 'create'], ['router', 'one']],
    },
    code: `// src/routes/tasks.js — thin: paths → controller functions
const express = require('express');
const { listTasks, createTask, getTask } = require('../controllers/tasksController');

const router = express.Router();
// GET  /tasks
router.get('/', listTasks);
// POST /tasks
router.post('/', createTask);
// GET  /tasks/7
router.get('/:id', getTask);
module.exports = router;

// src/app.js
app.use('/tasks', require('./routes/tasks'));`,
    example: 'Say you move the API under `/api`. Only one line changes: `app.use(\'/api/tasks\', tasksRouter)`. `GET /api/tasks/7` now enters the router, which still sees `/7` and still calls `getTask`; nothing in `routes/tasks.js` or the controller changes.',
    mistake: 'Repeating the prefix inside the router: `router.get(\'/tasks\', listTasks)` while `app.js` mounts it at `/tasks`. The real path becomes `/tasks/tasks`, and `GET /tasks` answers `404`. Inside a router, paths are relative to the mount path.',
    practice: { href: '#/server/routes/practice/route-matcher', label: 'Mount a router in the route matcher' } },

  { id: 'controllers', hub: 'structure', topic: 'structure',
    title: 'Controllers: thin routes, testable logic',
    summary: 'A **controller** is the plain function that does a route\'s work (read the request, validate, fetch or change data, answer). Controllers live in `controllers/`, the route file only maps paths to them, so each part is short and the logic can be tested on its own.',
    html: [
      '<p>The route file maps paths to functions; the controller does the work. You can read every URL of the API on one screen, and change how a request is served (an array today, a database tomorrow) without touching the routes. Express has no controller feature: it is a convention almost every Express codebase follows (see <a href="#/server/runtime/project-layout">A project layout</a>).</p>',
      '<p>A controller is a plain function <code>(req, res, next)</code>, so you can call it with <strong>stand-in objects</strong>: a fake <code>req</code> with the fields you need and a fake <code>res</code> that records what was sent. The Try it box does exactly that, with no server and no Express. supertest then tests the whole app through HTTP (see <a href="#/server/routes/app-server-split">app.js builds, server.js starts</a>); both kinds of test are useful.</p>',
    ],
    live: { kind: 'js', code: `// controllers/tasksController.js (no Express needed here)
const tasks = [{ id: 1, title: 'Write the API skeleton', done: true }];

function getTask(req, res) {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}

// A fake res that remembers what the controller did
function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

const r1 = fakeRes();
getTask({ params: { id: '1' } }, r1);
console.log(r1.statusCode, JSON.stringify(r1.body));

const r2 = fakeRes();
getTask({ params: { id: '99' } }, r2);
console.log(r2.statusCode, JSON.stringify(r2.body));` },
    example: 'A small `routes/tasks.js` has three lines of real code: create a router, `router.get(\'/\', listTasks)`, `router.post(\'/\', createTask)`. When the project gets a database, the array inside `tasksController.js` is replaced by calls to a database model; the route file and `app.js` do not change at all.',
    mistake: 'Writing the logic inline in the route file "because it is only a few lines": `router.post(\'/\', (req, res) => { …30 lines… })`. The file grows unreadable and the logic cannot be tested on its own: keep handlers in `controllers/`. And a controller should never `require` the app or call `app.listen`, so that it stays a plain, testable function.' },

  { id: 'app-server-split', hub: 'structure', topic: 'structure',
    title: 'app.js builds, server.js starts',
    summary: 'A well-organised Express project splits the program in two: `src/app.js` **builds** the Express app and exports it with `module.exports = app`; `src/server.js` requires it and calls `app.listen()`. Building and starting are separate jobs, so tests can use the app without opening a port.',
    html: [
      '<p><code>app.js</code> assembles the app (middleware, routers, error handler) and exports it; <code>server.js</code> requires it and calls <code>listen</code>, nothing else. A test file can then <code>require(\'../src/app\')</code> and send it requests in memory, with no port opened (see <a href="#/http/api-design/automated-tests">Automated API tests with supertest</a>).</p>',
      '<ul><li><strong>One job per file:</strong> <code>middleware/logger.js</code> exports one middleware, <code>routes/tasks.js</code> maps paths, <code>controllers/tasksController.js</code> does the work. The folder tree is in <a href="#/server/runtime/project-layout">A project layout</a>.</li>'
        + '<li><strong>The file you run</strong> is <code>server.js</code>: the <code>start</code> script runs <code>node --watch src/server.js</code>.</li></ul>',
    ],
    code: `// src/app.js — builds and exports; never listens
const express = require('express');
const logger = require('./middleware/logger');
const tasksRouter = require('./routes/tasks');

const app = express();
app.use(express.json());
app.use(logger);
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/tasks', tasksRouter);
// … 404 catch-all and error handler last
module.exports = app;

// src/server.js — one job: start listening
const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Tasks API listening on http://localhost:\${PORT}\`));`,
    example: 'An automated test does `const request = require(\'supertest\'); const app = require(\'../src/app\');` and then `await request(app).get(\'/tasks\')`. supertest gives the app a temporary in-memory connection, so twenty tests can run in a row without port 3000 ever being opened, and without a server left running afterwards.',
    mistake: 'Forgetting `module.exports = app` at the end of `app.js`. Then `require(\'./app\')` returns an empty object `{}`, and `server.js` crashes with `TypeError: app.listen is not a function`. The opposite mistake, calling `listen` inside `app.js`, makes every test open a real port, and a second test file fails with `EADDRINUSE`.' },

  { id: 'request-lifecycle', hub: 'structure', topic: 'structure',
    title: 'The life of a request',
    summary: 'A request travels through one pipeline: Node receives it and hands it to the app; each middleware in order passes it on; the router picks the route; the controller answers. Any `next(err)` or thrown error jumps to the error handler; a request nobody answers reaches Express\'s own 404.',
    html: [
      '<p>Every request walks the same list of layers, in the order <code>app.js</code> registered them (see <a href="#/server/routes/middleware-order">Order is configuration</a>), and leaves it by exactly one of three exits.</p>',
      '<ol><li>Node parses the request line and headers and calls the app.</li>'
        + '<li>Express adds its helpers (<code>req.query</code>, <code>req.get</code>, <code>res.json</code>…) and the <code>X-Powered-By: Express</code> header.</li>'
        + '<li>Each layer whose path matches runs in turn: middleware passes the request on, and the first matching route runs its controller.</li>'
        + '<li>No match: your 404 catch-all, or Express\'s <code>Cannot GET /x</code>.</li>'
        + '<li>On <code>next(err)</code> or a thrown error: everything else is skipped until the four-parameter error handler.</li></ol>',
      '<dl><dt>A response</dt><dd>From a controller, a guard, <code>express.static</code>, your 404 or your error handler, or Express\'s own final handler.</dd>'
        + '<dt>A hang</dt><dd>Some layer neither answered nor called <code>next()</code>.</dd>'
        + '<dt>A crash</dt><dd>An error nobody caught ends the whole process, such as a rejected promise in an Express 4 <code>async</code> handler (see <a href="#/server/routes/express-async-errors">Async handlers</a>).</dd></dl>',
    ],
    example: '`POST /tasks` with a broken JSON body: `express.json()` fails to parse it and calls `next(err)` with status 400 (step 3); the logger, the routes and the 404 catch-all are all skipped, because an error is pending (step 5); the error handler answers `400 {"error":"Expected property name or \'}\' in JSON at position 1 …"}`. The controller never ran, and the logger never printed a line.',
    mistake: 'Assuming every middleware runs for every request. A layer only runs if the request **reaches** it: an earlier response ends the journey, an error makes Express skip ordinary layers, and `app.use(\'/api\', …)` never sees `/health`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Trace requests in the pipeline simulator' } },

  /* ---- 6. Errors and 404s -------------------------------------------------------- */
  { id: 'error-handler', hub: 'errors', topic: 'errors',
    title: 'The error handler: four parameters, registered last',
    summary: 'An **error-handling middleware** is a function with **four** parameters, `(err, req, res, next)`. Express recognises it only by that count, skips it during normal requests, and sends it every error passed with `next(err)` or thrown in a handler. Register one, after every route.',
    html: [
      '<p>Errors only travel <strong>forward</strong>: from the layer that failed, Express walks down the list to the next four-parameter function, skipping every ordinary layer. An error handler registered above a route never receives that route\'s errors: that is why it goes <strong>last</strong>.</p>',
      '<ul><li><strong>Recognised by its parameter count</strong> (<code>fn.length === 4</code>): with three it is ordinary middleware, even if the first one is named <code>err</code>. Keep <code>next</code> even if you never call it.</li>'
        + '<li><strong>One shape for every failure:</strong> log the error, then <code>res.status(err.status || 500).json({ error: err.message })</code>. Errors you create can carry their status: <code>err.status = 404</code>.</li>'
        + '<li><strong>Without one,</strong> Express\'s final handler sends a <code>500</code> <strong>HTML</strong> page with the stack trace (only <code>Internal Server Error</code> when <code>NODE_ENV=production</code>): the wrong format for an API, and in development it leaks file paths.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'An error skips straight to the next four-parameter function.',
      desc: 'A layer calls next(err) or throws. Express skips every ordinary layer after it and runs the next error handler, a function of err, req, res and next, which answers with one JSON error.',
      nodes: [
        { id: 'fail', label: 'A layer fails', note: '`next(err)` or a throw' },
        { id: 'skip', label: 'Ordinary layers', note: 'skipped' },
        { id: 'handler', label: 'Error handler', note: '`(err, req, res, next)`', key: true },
        { id: 'json', label: 'One JSON error', note: '`{ error: … }`' },
      ],
      edges: [['fail', 'skip'], ['skip', 'handler'], ['handler', 'json']],
    },
    live: { kind: 'js', code: `// How Express tells the two kinds apart: it counts the parameters
const errorHandler = (err, req, res, next) => {};
const looksLikeOne = (err, req, res) => {};

console.log('4 parameters →', errorHandler.length, '(error handler)');
console.log('3 parameters →', looksLikeOne.length, '(ordinary middleware!)');

// Express 4, simplified (Layer.handle_error / handle_request):
function isErrorHandler(fn) { return fn.length === 4; }
console.log(isErrorHandler(errorHandler), isErrorHandler(looksLikeOne));` },
    example: 'A test route `GET /boom` calls `next(new Error(\'Boom!\'))`. With `app.use((err, req, res, next) => { console.error(err.message); res.status(err.status || 500).json({ error: err.message }); })` at the bottom, `curl` prints `{"error":"Boom!"}` with status `500`, the terminal prints `Boom!`, and the server keeps running.',
    mistake: 'Deleting the "unused" `next` parameter from the error handler to please a linter. With three parameters it is no longer an error handler: errors skip it, the client gets Express\'s HTML error page, and on normal requests that reach it Express calls it as `(req, res, next)`, so your `res.status` is really `next.status` and it throws `TypeError: res.status is not a function`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenge 5 of the pipeline simulator' } },

  { id: 'next-err', hub: 'errors', topic: 'errors',
    title: 'Raising errors: throw and next(err)',
    summary: 'There are two ways to send a failure to the error handler: call `next(err)` (works everywhere), or `throw` inside a handler while it is still running synchronously (Express catches it). From then on Express skips ordinary layers until a four-parameter error handler.',
    html: [
      '<p>Express wraps every call to your functions in a <code>try</code>/<code>catch</code> (see <a href="#/browser/js/try-catch">try and catch</a>), so an error thrown while your handler is running is treated exactly like <code>next(err)</code>. Both put the request on the error track: Express skips routes, routers and three-parameter middleware until an error handler.</p>',
      '<ul><li><strong><code>return next(err)</code></strong> when you decide something failed, with a status for the handler: <code>err.status = 404</code>. The <code>return</code> stops the function, for the same reason as <code>return res.…</code>.</li>'
        + '<li><strong>Pass an <code>Error</code> object,</strong> never a string: the handler reads <code>err.message</code> and <code>err.status</code>.</li>'
        + '<li><strong>Not caught by Express 4:</strong> an error thrown <em>later</em>, after an <code>await</code> or inside a callback, once your handler has returned (see <a href="#/server/routes/express-async-errors">Async handlers</a>).</li></ul>',
    ],
    code: `// Both reach the error handler
app.get('/boom', (req, res, next) => {
  // explicit
  next(new Error('Boom!'));
});
app.get('/boom2', (req, res) => {
  // caught by Express (synchronous)
  throw new Error('Boom!');
});

// An error with a status, for the central handler
function getTask(req, res, next) {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    return next(err);
  }
  res.json(task);
}`,
    example: 'In a tasks app without `express.json()`, `POST /tasks` makes `createTask` run `const { title } = req.body` with `req.body` undefined. JavaScript throws `TypeError: Cannot destructure property \'title\' of \'req.body\' as it is undefined.`; Express catches it, skips the 404 catch-all, and the error handler answers `500` with that message. The server survives.',
    mistake: 'Calling `next(\'Task not found\')` with a plain string. Express treats it as an error, but the handler\'s `err.message` and `err.status` are `undefined`, so the client gets `500` and `{}`. Always pass an `Error` object (with a `status` when it is not a 500).' },

  { id: 'express-async-errors', hub: 'errors', topic: 'errors',
    title: 'Async handlers: Express 4 versus Express 5',
    summary: 'In **Express 4**, an `async` handler whose promise rejects never reaches your error handler: on Node 15+ the unhandled rejection **crashes the server**. Catch it yourself with `try`/`catch` and `next(err)`. **Express 5** forwards rejected promises to the error handler automatically.',
    html: [
      '<p>Express 4 only watches what happens <strong>during</strong> its call to your handler. An <code>async</code> function returns a promise at once; if it rejects a moment later (the database was down), Express 4 has already moved on, nobody handles the rejection, and Node ends the process (see <a href="#/server/runtime/async-errors">Errors in async code</a>): every connected user is cut off, not only the one whose request failed.</p>',
      '<figure data-diagram></figure>',
      '<table><caption>The same async handler in both versions</caption><thead><tr><th scope="col"></th><th scope="col">Express 4</th><th scope="col">Express 5</th></tr></thead><tbody>'
        + '<tr><th scope="row">A rejected promise</th><td>Not caught: the process crashes</td><td>Forwarded to the error handler</td></tr>'
        + '<tr><th scope="row">What you write</th><td><code>try { … await … } catch (err) { next(err); }</code>, or a wrapper</td><td>Nothing extra (the <code>try</code>/<code>catch</code> still works)</td></tr>'
        + '</tbody></table>',
      '<p>The wrapper does the <code>try</code>/<code>catch</code> for every handler: <code>asyncHandler(fn)</code> calls <code>fn</code> and sends a rejection to <code>next</code>. <code>npm install express</code> installs Express <strong>5</strong> today, while many projects pin Express 4 (<code>^4.22.3</code>): check with <code>npm ls express</code>. Writing the <code>try</code>/<code>catch</code> works in both.</p>',
    ],
    diagram: {
      kind: 'sequence',
      title: 'Express 4 has moved on by the time the promise rejects, so nobody catches it.',
      desc: 'Express 4 calls the async handler, which returns a pending promise at once, and Express moves on. Later the awaited database call rejects inside the handler. Nothing handles the rejection, Node reports an unhandled rejection, and the process exits.',
      nodes: [
        { id: 'express', label: 'Express 4' },
        { id: 'handler', label: 'Async handler', key: true },
        { id: 'node', label: 'Node' },
      ],
      edges: [
        ['express', 'handler', 'calls it'],
        ['handler', 'express', 'a pending promise'],
        ['handler', 'handler', 'the await rejects later'],
        ['handler', 'node', 'unhandled rejection'],
        ['node', 'node', 'the process exits'],
      ],
    },
    code: `// Express 4: a rejection here crashes the process
app.get('/stats', async (req, res) => {
  // rejects: database offline
  const stats = await db.getStats();
  res.json(stats);
});

// Works in Express 4 and 5
app.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
    // → error handler → 500 JSON
  }
});

// Optional helper once the pattern is familiar
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
router.get('/', asyncHandler(listTasks));`,
    example: 'In the pipeline simulator, preset "Bug: async route without try/catch": `GET /stats` with Express 4 ends in a crash and `curl` prints `Empty reply from server`. Switch the version to Express 5 and the same code answers `500 {"error":"Database is offline"}`; or stay on 4 and choose the `try/catch + next(err)` code.',
    mistake: 'Adding `try`/`catch` but only logging: `catch (err) { console.error(err); }`. The crash is gone, but now nothing answers the request, so it hangs. The `catch` must end the request too: `next(err)`, or a response of its own.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Compare Express 4 and 5 (challenge 7)' } },

  { id: 'not-found', hub: 'errors', topic: 'errors',
    title: 'The 404 catch-all',
    summary: 'When no layer answers, Express sends its own `404` HTML page `Cannot GET /x`. An API adds a **catch-all** middleware after every route, `app.use((req, res) => res.status(404).json({ … }))`, so unknown URLs get JSON too.',
    html: [
      '<p><code>app.use(fn)</code> without a path matches every request, so a request that <strong>reaches</strong> the catch-all has passed every route unanswered: by definition, nothing matched. Placed after the routes and before the error handler, it gives unknown URLs the same JSON shape as the rest of the API, which is what a client of a JSON API expects.</p>',
      '<dl><dt>No such route</dt><dd><code>GET /tsks</code>: the catch-all\'s job.</dd>'
        + '<dt>No such resource</dt><dd><code>GET /tasks/999</code>: the route exists, so the controller looks for the task and answers <code>404 Task not found</code> itself.</dd></dl>',
    ],
    code: `// … every route and router above …

app.use((req, res) => {
// → 404 catch-all
  res.status(404).json({ error: \`Not found: \${req.method} \${req.originalUrl}\` });
});

// error handler, last
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});`,
    example: 'Without the catch-all, `curl -i http://localhost:3000/nope` shows `HTTP/1.1 404 Not Found`, `Content-Type: text/html` and a small HTML page with `<pre>Cannot GET /nope</pre>`. With it: `404`, `Content-Type: application/json` and `{"error":"Not found: GET /nope"}`, which a `fetch` call can read with `response.json()`.',
    mistake: 'Registering the catch-all near the top of `app.js`, next to the other `app.use` lines. It matches every request, so every route below it is unreachable and the whole API answers `404`. Its place is after the last route.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenge 6 of the pipeline simulator' } },
];

DATA.en.EXPRESS_QUIZ = [
  /* Express, the app and the server */
  { type: 'mc', topic: 'basics',
    q: 'Which of these does Express add on top of Node\'s built-in `http` module?',
    choices: ['The ability to open a port and receive requests', 'A routing API (method + path → function) and a middleware pipeline', 'A database', 'A way to run JavaScript outside the browser'],
    answer: 1,
    why: 'Node\'s `http` already listens on ports; Node itself runs JavaScript outside the browser. Express adds **routing**, **middleware** and helpers on `req`/`res`.' },
  { type: 'tf', topic: 'basics',
    q: 'The callback passed to `app.listen(3000, callback)` runs once for every request.',
    answer: false,
    why: 'It runs **once**, when the server starts listening. Per-request code goes in middleware and routes.' },
  { type: 'mc', topic: 'basics',
    q: 'You start `node src/server.js` and get `Error: listen EADDRINUSE: address already in use :::3000`. What is the most likely cause?',
    choices: ['express is not installed', 'A route has a typo', 'Another program (often an earlier copy of your server) is already listening on port 3000', 'app.js does not export the app'],
    answer: 2,
    why: 'Only one program can own a port. Stop the old server or use another port.' },
  { type: 'mc', topic: 'structure',
    q: 'Why does a well-organised Express project keep `app.listen()` out of `src/app.js`?',
    choices: ['Express forbids calling listen in a file named app.js', 'So tests can require the app and send it requests without opening a real port', 'Because listen must be called before any route is registered', 'To make the server start faster'],
    answer: 1,
    why: '`app.js` builds and exports; `server.js` starts. supertest uses the exported app in memory.' },
  { type: 'mc', topic: 'structure',
    q: '`server.js` crashes with `TypeError: app.listen is not a function`. What is missing?',
    choices: ['`module.exports = app;` at the end of app.js', '`npm install`', 'A port number', 'express.json()'],
    answer: 0,
    why: 'Without the export, `require(\'./app\')` returns `{}`, which has no `listen` method.' },
  { type: 'fib', topic: 'basics',
    q: '`const app = ___();` creates an Express application (write the function name).',
    accept: ['express'],
    why: 'After `const express = require(\'express\')`, calling `express()` returns a new app.' },
  { type: 'tf', topic: 'basics',
    q: 'Express decides your project\'s folder structure (routes/, controllers/, models/) for you.',
    answer: false,
    why: 'Express is **unopinionated**: the folders are a common convention, not something Express requires.' },
  { type: 'mc', topic: 'structure',
    q: 'In a project split into `src/app.js` and `src/server.js`, which file do you run to start the API?',
    choices: ['src/app.js', 'src/routes/tasks.js', 'src/server.js', 'package-lock.json'],
    answer: 2,
    why: '`server.js` requires the app and calls `listen`; the `start` script runs `node --watch src/server.js`.' },

  { type: 'mc', topic: 'basics',
    q: 'Which curl flag also prints the status line and the response headers?',
    choices: ['`-d`', '`-i`', '`-H`', '`-X`'],
    answer: 1,
    why: '`-i` includes the status line and headers; `-d` sends a body, `-H` adds a request header and `-X` chooses the method.' },
  { type: 'fib', topic: 'basics',
    q: '`curl -X ___ http://localhost:3000/tasks/1` sends a request that deletes task 1.',
    accept: ['DELETE', 'delete'],
    why: '`-X` chooses the method; without it curl sends GET, or POST when there is a body.' },
  { type: 'tf', topic: 'basics',
    q: 'In Windows PowerShell 5.1, typing `curl` runs the curl program.',
    answer: false,
    why: 'There `curl` is another command (`Invoke-WebRequest`). Type `curl.exe` to run curl itself.' },

  /* Routes, req and res */
  { type: 'mc', topic: 'routing',
    q: 'With `app.get(\'/tasks/:id\', getTask)`, what is `req.params.id` for `GET /tasks/42`?',
    choices: ['The number 42', 'The string "42"', '`undefined`', '`{ id: 42 }`'],
    answer: 1,
    why: 'URL parts are text: route parameters are always **strings**. Convert with `Number(…)`.' },
  { type: 'mc', topic: 'routing',
    q: 'For `GET /tasks?done=false&page=2`, which route definition matches?',
    choices: ['`app.get(\'/tasks?done=false\')`', '`app.get(\'/tasks\')`', '`app.get(\'/tasks/:done\')`', '`app.get(\'/tasks/page/2\')`'],
    answer: 1,
    why: 'The query string is never part of route matching; it is parsed into `req.query`.' },
  { type: 'tf', topic: 'routing',
    q: 'For `GET /tasks?done=false`, the condition `if (req.query.done)` is false.',
    answer: false,
    why: '`req.query.done` is the **string** `"false"`, which is non-empty and therefore truthy. Compare with `=== \'true\'`.' },
  { type: 'mc', topic: 'routing',
    q: 'An app only has `app.get(\'/health\', …)`. What does `POST /health` return?',
    choices: ['200, because the path exists', '405 Method Not Allowed', '404 with `Cannot POST /health`', 'The request hangs'],
    answer: 2,
    why: 'A route must match method **and** path. Express sends no automatic 405: the request falls through to its 404.' },
  { type: 'mc', topic: 'routing',
    q: 'Routes are registered in this order: `GET /tasks/:id`, then `GET /tasks/stats`. What happens on `GET /tasks/stats`?',
    choices: ['The stats route runs because it is more specific', 'The `:id` route runs with `id = "stats"`', 'Both routes run', 'Express reports a conflict at start-up'],
    answer: 1,
    why: 'The first match wins and `:id` matches any segment. Put fixed paths before parameter paths.' },
  { type: 'mc', topic: 'structure',
    q: 'A router is mounted with `app.use(\'/tasks\', router)`. Which line inside the router handles `GET /tasks`?',
    choices: ['`router.get(\'/tasks\', …)`', '`router.get(\'/\', …)`', '`router.get(\'*\', …)`', '`app.get(\'/\', …)`'],
    answer: 1,
    why: 'Inside a router the mount path is stripped: `/tasks` becomes `/`. `router.get(\'/tasks\')` would mean `/tasks/tasks`.' },
  { type: 'mc', topic: 'structure',
    q: 'Inside a router mounted at `/api/tasks`, a request `GET /api/tasks/7?x=1` arrives. What is `req.baseUrl`?',
    choices: ['`/api/tasks`', '`/7`', '`/api/tasks/7?x=1`', '`""`'],
    answer: 0,
    why: '`req.baseUrl` is the mount path; `req.path` is `/7`; `req.originalUrl` is the whole URL.' },
  { type: 'mc', topic: 'reqres',
    q: 'Which line sends a 201 response with a JSON body?',
    choices: ['`res.status(201);`', '`res.json(task).status(201);`', '`res.status(201).json(task);`', '`res.set(201, task);`'],
    answer: 2,
    why: '`status()` only sets the code and returns `res`; `json()` sends. In the second choice the response is already sent before `status` runs.' },
  { type: 'fib', topic: 'reqres',
    q: 'Sending a second response for the same request throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set ___ after they are sent to the client`.',
    accept: ['headers'],
    why: 'The status line and headers left with the first response; they cannot be changed. Use `return res.…`.' },
  { type: 'mc', topic: 'reqres',
    q: '`if (!title) res.status(400).json({ error: \'title is required\' });` is followed by code that sends a 201. What is the fix?',
    choices: ['Add `return` before `res.status(400)`', 'Use `res.send` instead of `res.json`', 'Swap the two responses', 'Add `next()` after the 400'],
    answer: 0,
    why: 'Sending does not stop the function; `return` does. Calling `next()` too would also try to answer twice.' },
  { type: 'tf', topic: 'reqres',
    q: '`req.headers[\'Content-Type\']` is the reliable way to read the request\'s content type.',
    answer: false,
    why: 'Node lower-cases header names, so that key is `undefined`. Use `req.get(\'Content-Type\')` or `req.headers[\'content-type\']`.' },

  /* Middleware */
  { type: 'mc', topic: 'middleware',
    q: 'A middleware function must, before it finishes its work for a request…',
    choices: ['always call next()', 'either call next() or send a response', 'always send a response', 'return a value'],
    answer: 1,
    why: 'Pass the request on, or end it. Neither leaves the request hanging; both sends two responses.' },
  { type: 'mc', topic: 'middleware',
    q: 'Your logger prints `GET /health`, but the browser spins forever. What is the most likely bug?',
    choices: ['The logger forgot to call next()', 'The route has the wrong method', 'express.json() is missing', 'The port is wrong'],
    answer: 0,
    why: 'The logger ran (it printed), but it never passed the request on, so nothing else ever ran.' },
  { type: 'mc', topic: 'middleware',
    q: 'Which paths does `app.use(\'/api\', fn)` run for?',
    choices: ['Only `/api` exactly', '`/api`, `/api/tasks`, `/api/tasks/7`, but not `/apiary`', 'Every path containing "api"', 'Only GET requests to /api'],
    answer: 1,
    why: '`app.use` matches a path **prefix** at a slash boundary, for every method. Routes match the whole path.' },
  { type: 'mc', topic: 'middleware',
    q: 'A route reads `req.body` and gets `undefined`. What does that tell you?',
    choices: ['The client sent an empty JSON object', 'No body parser ran before this route (express.json() missing or registered later)', 'The JSON was invalid', 'The client used GET'],
    answer: 1,
    why: 'With express.json() in place (Express 4), a missing or non-JSON body gives `{}`; invalid JSON gives a 400 error. `undefined` means no parser ran.' },
  { type: 'mc', topic: 'middleware',
    q: 'express.json() is in place, but `req.body` is `{}` although curl sent `-d \'{"title":"Study"}\'`. What is missing?',
    choices: ['`-X GET`', 'The header `-H "Content-Type: application/json"`', 'A trailing slash in the URL', 'A second express.json()'],
    answer: 1,
    why: 'express.json() only parses bodies labelled `application/json`. Without the header, curl labels it as form data.' },
  { type: 'tf', topic: 'middleware',
    q: 'Middleware registered after a route still runs before that route\'s handler.',
    answer: false,
    why: 'Layers run in registration order. A layer below a route only runs if the request gets past that route.' },
  { type: 'mc', topic: 'middleware',
    q: 'Why does an `app.js` write `app.use(logger)` but `app.use(express.json())`, with brackets?',
    choices: ['logger is async', '`express.json()` returns the middleware function; `logger` already is one', 'Brackets make middleware run first', 'It is only a style choice'],
    answer: 1,
    why: 'Calling `express.json()` (or `cors()`) builds a configured `(req, res, next)` function. `logger` is the function itself.' },
  { type: 'mc', topic: 'middleware',
    q: 'An auth guard is registered with `app.use(\'/api\', requireAuth)` **after** `app.get(\'/api/me\', getMe)`. A request without a token calls `/api/me`. What happens?',
    choices: ['401: the guard runs first anyway', 'getMe answers, unprotected', 'The request hangs', '404'],
    answer: 1,
    why: 'The route is earlier in the list, so it answers before the guard is reached.' },
  { type: 'fib', topic: 'middleware',
    q: 'The built-in middleware that sends files such as `public/index.html` to the browser is `express.___(\'public\')`.',
    accept: ['static'],
    why: '`express.static` answers when a file exists and calls `next()` otherwise.' },

  /* Controllers and the request lifecycle */
  { type: 'mc', topic: 'structure',
    q: 'In a routes/controllers layout, what belongs in `routes/tasks.js`?',
    choices: ['The tasks array and the validation logic', 'Only the mapping from paths to controller functions', 'app.listen()', 'The error handler'],
    answer: 1,
    why: 'Thin routes: paths → functions. The logic and data live in the controller.' },
  { type: 'tf', topic: 'structure',
    q: 'A controller function can be tested without starting a server, by calling it with a fake `req` and a fake `res`.',
    answer: true,
    why: 'It is a plain function `(req, res, next)`; stand-in objects that record status and body are enough.' },
  { type: 'mc', topic: 'structure',
    q: 'What is the main benefit of moving handlers into `controllers/`?',
    choices: ['Express runs controllers faster', 'Route files stay short and the logic can change (array → database) or be tested without touching the routes', 'Controllers do not need `req` and `res`', 'It removes the need for an error handler'],
    answer: 1,
    why: 'Adding a database later swaps the array for queries inside the controller; routes and app.js do not change.' },
  { type: 'mc', topic: 'structure',
    q: 'A request ends in one of three ways. Which list is right?',
    choices: ['200, 404 or 500', 'A response, a hang, or a crash of the process', 'next(), next(err) or return', 'GET, POST or DELETE'],
    answer: 1,
    why: 'Someone answers (any status), nobody answers and nothing calls next (hang), or an uncaught error ends the process (crash).' },
  { type: 'mc', topic: 'structure',
    q: 'A POST with broken JSON arrives at an app with json parser, logger, routes, 404 and error handler. Which layers actually run?',
    choices: ['All of them', 'express.json() and then the error handler', 'Only the controller', 'The logger and the 404 handler'],
    answer: 1,
    why: 'The parser calls `next(err)`; with an error pending, Express skips every ordinary layer until the error handler.' },
  { type: 'tf', topic: 'structure',
    q: 'Every middleware registered with app.use runs for every request.',
    answer: false,
    why: 'Only for requests that **reach** it and whose path matches its prefix; an earlier response or a pending error stops that.' },
  { type: 'mc', topic: 'middleware',
    q: 'Who adds `req.user` in a protected route?',
    choices: ['Express itself', 'Node\'s http module', 'Your own auth middleware, before the route runs', 'The browser'],
    answer: 2,
    why: 'Middleware can write on `req`; a guard that verifies the token stores the user there and calls `next()`.' },

  /* Errors and 404s */
  { type: 'mc', topic: 'errors',
    q: 'How does Express recognise an error-handling middleware?',
    choices: ['Its name contains "error"', 'It is registered last', 'It declares four parameters: (err, req, res, next)', 'It calls res.status(500)'],
    answer: 2,
    why: 'Express checks the function\'s parameter count (`fn.length === 4`). Being last is where it must be, not how it is recognised.' },
  { type: 'mc', topic: 'errors',
    q: 'Why must the error handler be registered after the routes?',
    choices: ['Because Express reads app.js backwards', 'Errors only travel forward: Express looks for the next error handler after the layer that failed', 'So it runs on every request', 'Because it must call app.listen'],
    answer: 1,
    why: 'An error handler above a route can never receive that route\'s errors.' },
  { type: 'mc', topic: 'errors',
    q: 'Your error handler is written `(err, req, res) => { … }`. `GET /boom` calls `next(new Error(\'Boom!\'))`. What does the client get?',
    choices: ['Your JSON error with status 500', 'Express\'s default HTML 500 page', 'A 404', 'Nothing: the request hangs'],
    answer: 1,
    why: 'With three parameters it is ordinary middleware, so errors skip it and Express\'s final handler answers in HTML.' },
  { type: 'tf', topic: 'errors',
    q: 'In Express 4, an error thrown synchronously inside a route handler (for example reading a property of `undefined`) reaches the error handler.',
    answer: true,
    why: 'Express wraps each call in try/catch, so a synchronous throw becomes `next(err)`.' },
  { type: 'mc', topic: 'errors',
    q: 'In Express 4 on a current Node version, an `async` route awaits a promise that rejects, with no try/catch. What happens?',
    choices: ['The error handler answers 500', 'The route answers 200 with an empty body', 'The rejection is unhandled and the Node process crashes', 'Express retries the route'],
    answer: 2,
    why: 'Express 4 ignores the returned promise; Node 15+ treats an unhandled rejection as fatal. Use try/catch + next(err), or Express 5.' },
  { type: 'mc', topic: 'errors',
    q: 'Which Express version forwards a rejected promise from an async handler to the error handler by itself?',
    choices: ['Express 4', 'Express 5', 'Both', 'Neither'],
    answer: 1,
    why: 'Express 5 checks the returned promise and calls next(err) on rejection.' },
  { type: 'mc', topic: 'errors',
    q: 'Where does a JSON 404 catch-all `app.use((req, res) => res.status(404).json(…))` go?',
    choices: ['First, before the routes', 'After every route, before the error handler', 'Inside each router', 'After app.listen'],
    answer: 1,
    why: 'Without a path it matches every request; placed early it would hide all routes.' },
  { type: 'fib', topic: 'errors',
    q: 'Without a catch-all, Express answers an unknown `GET /nope` with status 404 and the text `Cannot ___ /nope`.',
    accept: ['GET', 'get'],
    why: 'Express\'s final handler writes `Cannot <METHOD> <path>` in a small HTML page.' },
  { type: 'mc', topic: 'errors',
    q: 'A controller cannot find task 999. What should it do?',
    choices: ['Throw a string', 'Answer 404 itself, or call next(err) with err.status = 404', 'Answer 500', 'Call next() so the catch-all answers'],
    answer: 1,
    why: 'The route exists but the resource does not: a 404 with a clear message, directly or via the error handler.' },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.EXPRESS_VIDEOS = [
  {
    "id": "request-life",
    "group": "structure",
    "title": "The life of a request",
    "mp4": "assets/video/request-life/request-life.mp4",
    "poster": "assets/video/request-life/request-life-poster.jpg",
    "captions": "assets/video/request-life/request-life.vtt",
    "duration": "3:31",
    "chapters": [
      {
        "t": 6,
        "title": "A corridor of checkpoints"
      },
      {
        "t": 32.1,
        "title": "A GET request walks through"
      },
      {
        "t": 68.3,
        "title": "Pass it on or answer"
      },
      {
        "t": 94.3,
        "title": "The guard"
      },
      {
        "t": 116.2,
        "title": "Order is configuration"
      },
      {
        "t": 145.3,
        "title": "The error shortcut"
      },
      {
        "t": 178.8,
        "title": "Nobody answers"
      }
    ],
    "transcript": [
      "The life of a request: from the moment it reaches your app to the answer.",
      "A request reaches your server. Does it go straight to your code? No. First it walks a corridor of checkpoints. Each one is a middleware. A middleware is just a function with three parameters: req, res, and next. Their order is the order you wrote them in app.js. Reading the file from top to bottom is reading the journey.",
      "Take a GET request for /tasks. express.json() looks for a body. There isn't one, so it passes the request on. The logger prints the method and the path, then passes it on too. Notice what they do to req. express.json() fills req.body. Later layers can rely on it. /health and /echo don't match this URL. They are skipped. /tasks matches. The door opens, listTasks runs, and a 200 goes back with the JSON.",
      "Every checkpoint makes the same choice. Call next(), and the request moves on. Or send a response, and the request turns back right there. Do neither, and it waits forever. The browser just spins. The classic bug: a logger that forgets next. The terminal prints the line, so it seems fine. But nothing ever comes back.",
      "That second choice is how a guard works. requireAuth reads the Authorization header. Without the demo token, it answers 401, and your route never runs. With Bearer demo-token, it writes Ana onto req.user and calls next(). /api/me answers 200.",
      "Now move that guard below the route. Same code, different file order. The route answers first. Nobody is checked, and there is no error anywhere. Just an open door. A layer only affects what comes after it. That is why order is configuration. Same with express.json() at the bottom. Every route above it sees req.body as undefined, and a POST crashes.",
      "Now a POST to /tasks with broken JSON. express.json() can't parse it, so it calls next(err) with an error. The logger, the routes and the catch-all are all skipped. The request jumps ahead to the error handler. Express recognises it by its four parameters. It answers 400, and your route never ran. A throw inside a handler takes the same road. And without an error handler, Express sends an HTML page with the stack trace.",
      "One last path. A request for a URL nobody handles. It passes every route unanswered and reaches the catch-all, which answers 404 in JSON. Without it, the client gets Express's own HTML page, Cannot GET /nope. Not much use to a fetch call. That's why it sits after the last route, and before the error handler.",
      "Practise it with the Middleware pipeline in Routes and middleware."
    ]
  }
];
// </topic-videos>
