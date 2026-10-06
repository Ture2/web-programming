'use strict';
/* Routes and middleware: concept cards, rail groups and self-check quiz (Express 4/5 as the
   worked example). See site/README.md for the data contract.
   `live` boxes run in a Web Worker (no require, no network, synchronous output only), so they
   are used only for plain functions: URLSearchParams, a controller called with a fake res, the
   arity of an error handler.
   `hub` and `topic` keys match EXPRESS_GROUPS and EXPRESS_QUIZ_TOPICS. */

DATA.en.EXPRESS_QUIZ_TOPICS = {
  basics: 'Express, the app and the server',
  routing: 'Routes, req and res',
  middleware: 'Middleware',
  structure: 'Controllers and the request lifecycle',
  errors: 'Errors and 404s',
};

DATA.en.EXPRESS_GROUPS = [
  { key: 'basics', label: 'Express and the app', icon: 'server' },
  { key: 'routing', label: 'Routes, req and res', icon: 'link' },
  { key: 'middleware', label: 'Middleware', icon: 'pipeline' },
  { key: 'structure', label: 'Controllers and the lifecycle', icon: 'split' },
  { key: 'errors', label: 'Errors and 404s', icon: 'shield' },
];

DATA.en.EXPRESS_CONCEPTS = [
  /* ---- 1. Express and the app ----------------------------------------------------- */
  { id: 'what-is-express', hub: 'basics', topic: 'basics', 
    title: 'Why a framework: Express on top of Node',
    summary: '**Express** is a small library for Node.js that turns "one function for every request" into a list of **routes** (method + path → function) and a **middleware pipeline** (small functions every request passes through), with helpers to read requests and send responses.',
    body: [
      'Node can already be a web server: its built-in `http` module calls **one** function for every request that arrives, whatever the method or URL. Everything else is your job: split the URL, compare the method, parse the query string, read the body piece by piece, set the `Content-Type` header, turn objects into JSON. A real API with twenty URLs becomes one giant `if`/`else`. Express is the switchboard in front of that single function: you register "`GET /tasks` goes to this function", and Express picks the right one for each request.',
      'Express adds three things. **Routing**: `app.get(\'/tasks\', handler)`, one call per method and path, with parameters such as `/tasks/:id`. **Middleware**: functions with the shape `(req, res, next)` that run in order for every request (logging, parsing the body, checking a login). **Helpers** on the two objects every function receives: `req` (the request, already parsed: `req.params`, `req.query`, `req.body`) and `res` (the response: `res.status(201).json(task)`).',
      'Express is **unopinionated**: it does not choose your folders, your database or your validation library. That is why projects add their own conventions (routes, controllers, models), and this section follows the most common ones. Express is still a Node program: you install it with npm, `require` it and start it with `node` (see Server-side JavaScript).',
    ],
    code: `// Node's http module alone: you do all the work
const http = require('http');
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3000);

// The same server with Express
const express = require('express');
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000);`,
    example: 'Add `GET /tasks/7` to both versions. With `http` you write a regular expression for `/tasks/<number>`, pull the number out, and remember that `/tasks/7?x=1` has a query string in `req.url`. With Express you add `app.get(\'/tasks/:id\', …)` and read `req.params.id`; the query string is already parsed into `req.query`, and every unknown URL still gets a `404` from Express without one more `else`.',
    mistake: 'Thinking Express is a different server or language that replaces Node. It is an npm package: `express()` returns an ordinary JavaScript function that Node\'s `http` module calls for each request. Every error you see is a Node error, and everything from Server-side JavaScript (modules, `process.env`, `async`/`await`) still applies.' },

  { id: 'app-listen', hub: 'basics', topic: 'basics', 
    title: 'The app object and app.listen',
    summary: '`const app = express()` creates the **app**: an object that stores your middleware and routes in order. `app.listen(port, callback)` starts a Node HTTP server that hands every incoming request to the app.',
    body: [
      'Picture the app as an empty conveyor belt. Each `app.use(…)`, `app.get(…)` or `app.post(…)` bolts one more station onto the belt, in the order the lines run. Nothing moves yet. `app.listen(3000)` switches the belt on: Node opens **port** 3000 (the door number on your computer, see "Anatomy of a URL") and puts every request that arrives on the belt.',
      'The callback of `listen` runs **once**, when the server is ready, not once per request; it is the place for a message such as `Tasks API listening on http://localhost:3000`. The port usually comes from an environment variable with a default: `const PORT = process.env.PORT || 3000`. The process then keeps running: a server waits for requests until you stop it with Ctrl+C.',
      'Order matters from the very first line: Express keeps the stations in registration order and every request visits them from top to bottom. Routes registered after `app.listen` still work (the belt is read for each request), but by convention everything is registered first and `listen` comes last, in its own file (next card).',
    ],
    code: `const express = require('express');
const app = express();                 // an empty pipeline

app.use(express.json());               // station 1
app.get('/health', (req, res) => {     // station 2
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Listening on http://localhost:\${PORT}\`);   // runs once
});`,
    example: 'Run the file with `node --watch src/server.js`. The terminal prints `Listening on http://localhost:3000` once and stays busy. In a second terminal, `curl http://localhost:3000/health` prints `{"status":"ok"}`. Save a change and `--watch` restarts the process, so the message appears again.',
    mistake: 'Starting the server twice (two terminals, or a forgotten one in the background) and getting `Error: listen EADDRINUSE: address already in use :::3000`. Only one program can own a port. Stop the old one (Ctrl+C in its terminal) or start this one on another port: `PORT=3001 node src/server.js`.' },

  { id: 'app-server-split', hub: 'basics', topic: 'basics', 
    title: 'app.js builds, server.js starts',
    summary: 'A well-organised Express project splits the program in two: `src/app.js` **builds** the Express app and exports it with `module.exports = app`; `src/server.js` requires it and calls `app.listen()`. Building and starting are separate jobs, so tests can use the app without opening a port.',
    body: [
      'Think of a car factory and a driver. `app.js` is the factory: it assembles the car (middleware, routers, error handler) and hands it over. `server.js` is the driver who turns the key (`listen`). An inspector (an automated test) wants the finished car without anyone driving it onto the road: with the split, a test file can `require(\'../src/app\')` and send it fake requests in memory. The supertest package does exactly this (see the card **Automated API tests with supertest** in Designing APIs).',
      'The rest of the layout follows the same idea, one job per file: `middleware/logger.js` exports one middleware function, `routes/tasks.js` maps paths to functions, `controllers/tasksController.js` holds what each request does. The folder tree is in "A Node/Express project layout" in Server-side JavaScript; this section explains what runs inside those files.',
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
    mistake: 'Forgetting `module.exports = app` at the end of `app.js`. Then `require(\'./app\')` returns an empty object `{}`, and `server.js` crashes with `TypeError: app.listen is not a function`. The opposite mistake, calling `listen` inside `app.js`, makes every test open a real port.' },

  /* ---- 2. Routes, req and res ----------------------------------------------------- */
  { id: 'routes', hub: 'routing', topic: 'routing', 
    title: 'Routes: method + path + handler',
    summary: 'A **route** connects one HTTP method and one path pattern to a **handler** function: `app.get(\'/tasks\', listTasks)` means "when a GET request for `/tasks` arrives, call `listTasks(req, res)`".',
    body: [
      'A route is one line of a switchboard: **method** + **path** → function. The method is the verb of the request (`GET` reads, `POST` creates…, see "HTTP methods"); there is one Express function per verb: `app.get`, `app.post`, `app.put`, `app.patch`, `app.delete`, plus `app.all` for any method. The path is a pattern: literal text such as `/tasks`, and **parameters** such as `:id` that match any one segment (next card).',
      'A route matches the **whole path**, not just its beginning: `app.get(\'/tasks\')` answers `/tasks` but not `/tasks/7`. Two details are forgiving by default: a trailing slash is optional (`/tasks/` also matches) and letters are **case-insensitive** (`/TASKS` matches too). The query string (`?done=true`) is never part of the match.',
      'When no route matches the method **and** the path, Express answers on its own with `404` and an HTML page `Cannot GET /x`. It does not send `405 Method Not Allowed` when the path exists with another method: a `POST /health` on an app that only has `GET /health` is also `Cannot POST /health`.',
    ],
    code: `app.get('/tasks', listTasks);          // GET    /tasks
app.post('/tasks', createTask);        // POST   /tasks
app.get('/tasks/:id', getTask);        // GET    /tasks/7, /tasks/abc …
app.patch('/tasks/:id', updateTask);   // PATCH  /tasks/7
app.delete('/tasks/:id', deleteTask);  // DELETE /tasks/7`,
    example: 'With the five routes above: `GET /tasks` → `listTasks`; `GET /Tasks/` → `listTasks` too (case and trailing slash ignored); `PUT /tasks/7` → no route has PUT, so Express answers `404 Cannot PUT /tasks/7`; `GET /tasks/7/comments` → `404`, because `/tasks/:id` has two segments and the URL has three.',
    mistake: 'Testing a `POST` route by typing its URL in the browser address bar. The browser always sends `GET`, so you get `Cannot GET /tasks` and conclude the route is broken. Use `curl -X POST …`, Postman or a `fetch` call with `method: \'POST\'`.',
    widget: 'route-matcher' },

  { id: 'route-params', hub: 'routing', topic: 'routing', 
    title: 'Route parameters: req.params',
    summary: 'A segment written `:name` in a route path is a **route parameter**: it matches any one segment of the URL and its value appears, as a **string**, in `req.params.name`.',
    body: [
      'A parameter is a blank in a form: `/tasks/:id` reads "`/tasks/` followed by **one** segment, whatever it is; call that segment `id`". For `/tasks/42`, `req.params` is `{ id: \'42\' }`. A path can have several blanks, `/users/:userId/tasks/:taskId`, and each fills its own key. A segment is the text between two slashes, so a parameter never swallows a `/`.',
      'Parameters identify **which** resource the request is about: the task with id 42, the user with id 7. Express decodes percent-escapes (`/tasks/a%20b` gives `\'a b\'`), and it always gives you **text**: the URL is text, and Express does not guess types. Convert before comparing with numbers: `Number(req.params.id)`.',
      'A parameter matches **anything** in that position, including words: `/tasks/:id` happily matches `/tasks/stats` with `id = \'stats\'`. That is why route order matters (see "Order of routes") and why a controller checks the value it receives.',
    ],
    code: `app.get('/users/:userId/tasks/:taskId', (req, res) => {
  // GET /users/7/tasks/42
  console.log(req.params);           // { userId: '7', taskId: '42' }
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
    body: [
      'A path parameter says **which** thing you want; the query string says **how** you want it: filtered, sorted, a given page. `GET /tasks?done=false&sort=title` is still the tasks list, only narrowed. So the route is just `app.get(\'/tasks\')`, and the handler reads `req.query.done` and `req.query.sort`. The query string is optional: a key the client did not send is simply `undefined`.',
      'Everything in `req.query` is text: `?page=2` gives `\'2\'`, `?done=false` gives the string `\'false\'`, which is **truthy** in an `if`. A key that appears twice (`?tag=css&tag=html`) becomes an array `[\'css\', \'html\']`, and `+` means a space. Express 4 also reads brackets (`?filter[done]=true` gives an object); Express 5 turns that off by default.',
      'The **Try it** box uses `URLSearchParams`, the browser\'s own query-string parser, which follows the same rules for plain keys.',
    ],
    live: { kind: 'js', code: `// What Express does with "?done=false&page=2&tag=css&tag=html&q=hello+world"
const params = new URLSearchParams('done=false&page=2&tag=css&tag=html&q=hello+world');

console.log(params.get('page'), typeof params.get('page'));   // a string
console.log(params.getAll('tag'));                           // repeated key
console.log(params.get('q'));                                // + is a space
console.log(params.get('sort'));                             // missing → null (undefined in req.query)

const done = params.get('done');
if (done) console.log('"false" is a non-empty string, so this runs!');
console.log('compare as text:', done === 'true');` },
    example: 'A tasks API filters on the server: `GET /tasks?done=true`. A correct controller writes `const { done } = req.query; const list = done === undefined ? tasks : tasks.filter((t) => String(t.done) === done);`. `GET /tasks` returns everything, `?done=true` the finished tasks, `?done=false` the others.',
    mistake: 'Putting the query string in the route: `app.get(\'/tasks?done=true\', …)`. Express matches only the path, and `?` has a special meaning in Express 4 patterns, so this route never matches what you expect. Register `/tasks` and read `req.query.done` inside.' },

  { id: 'req-object', hub: 'routing', topic: 'routing', 
    title: 'Reading the request: req',
    summary: '`req` is the request as an object: the method and URL, the route parameters, the parsed query string and body, and the headers. Express fills most of it before your handler runs.',
    body: [
      'Think of `req` as the order slip a waiter brings to the kitchen: what was asked (`req.method`, `req.path`), the details (`req.params`, `req.query`, `req.body`) and notes in the margin (`req.headers`). Middleware can also write on the slip before it reaches your handler: an authentication middleware adds `req.user`, `express.json()` fills `req.body`.',
      'Header names arrive **lower-cased** in `req.headers` (`req.headers[\'content-type\']`), whatever capitals the client used. `req.get(\'Content-Type\')` ignores case for you, so prefer it. Inside a router mounted with a prefix, `req.url` and `req.path` lose that prefix, while `req.originalUrl` keeps the full URL and `req.baseUrl` holds the prefix (see "express.Router()").',
    ],
    table: {
      caption: 'The parts of req you will use (request: POST /api/tasks/7?notify=true, router mounted at /api/tasks)',
      head: ['Property', 'Value in the example', 'Filled by'],
      rows: [
        ['`req.method`', '`\'POST\'`', 'Node'],
        ['`req.originalUrl`', '`\'/api/tasks/7?notify=true\'`', 'Express: the full URL as sent'],
        ['`req.baseUrl`', '`\'/api/tasks\'`', 'Express: the mount path of the current router'],
        ['`req.path`', '`\'/7\'`', 'Express: the path inside this router, without the query'],
        ['`req.params`', '`{ id: \'7\' }`', 'Express, from the route pattern `/:id`'],
        ['`req.query`', '`{ notify: \'true\' }`', 'Express, from the query string'],
        ['`req.body`', '`{ title: \'Study\' }`', '`express.json()` (undefined without it)'],
        ['`req.get(\'Authorization\')`', '`\'Bearer eyJ…\'`', 'Node (headers), read without caring about case'],
        ['`req.user`', '`{ id: 1, name: \'Ana\' }`', 'Your own auth middleware, if any'],
      ],
    },
    example: 'A logger that prints `${req.method} ${req.originalUrl}` shows `POST /api/tasks/7?notify=true` wherever it is registered. A simpler logger that uses `req.url` prints the same thing as long as the logger is registered with `app.use(logger)` at application level; registered inside a router, it would print only `/7?notify=true`.',
    mistake: 'Reading `req.headers[\'Content-Type\']` and getting `undefined`. Node lower-cases every header name, so the key is `\'content-type\'`. Use `req.get(\'Content-Type\')`, which works with any capitalisation.' },

  { id: 'res-object', hub: 'routing', topic: 'routing', 
    title: 'Answering: res',
    summary: '`res` builds the response: `res.status(code)` sets the status, `res.set(name, value)` a header, and one **sending** method ends it: `res.json(data)`, `res.send(text)`, `res.sendStatus(code)` or `res.end()`.',
    body: [
      'Filling in `res` is like preparing a parcel: you can write the label (status) and stick on stickers (headers) in any order, but nothing leaves until you **post** it with a sending method. `res.status(201)` alone posts nothing; `res.status(201).json(task)` sets the status and sends, because `status()` returns `res` itself, so calls can be chained.',
      '`res.json(value)` turns the value into JSON, sets `Content-Type: application/json; charset=utf-8` and sends it: the normal choice for an API (see "Inside an HTTP response" for what goes over the wire). `res.send(\'text\')` sends text as HTML; `res.send(object)` behaves like `res.json`. `res.sendStatus(204)` sends only a status and its reason phrase; `res.end()` sends whatever is set so far with no body, typical after `res.status(204)`. When you do not choose a status, it is `200`.',
    ],
    table: {
      caption: 'The res methods you will use most',
      head: ['Call', 'Sends?', 'Result'],
      rows: [
        ['`res.status(404)`', 'No', 'Sets the status code; returns `res` for chaining'],
        ['`res.set(\'Location\', \'/tasks/8\')`', 'No', 'Sets a header (also `res.location(url)`)'],
        ['`res.json({ id: 8 })`', 'Yes', 'JSON body with `Content-Type: application/json`'],
        ['`res.send(\'<h1>Hi</h1>\')`', 'Yes', 'Text body, `Content-Type: text/html` by default'],
        ['`res.sendStatus(204)`', 'Yes', 'Only the status (and its reason as text, except 204)'],
        ['`res.status(204).end()`', 'Yes', 'No body at all'],
      ],
    },
    example: 'A complete creation answer: `res.status(201).location(`/tasks/${task.id}`).json(task)`. On the wire: `HTTP/1.1 201 Created`, a `Location: /tasks/4` header, `Content-Type: application/json; charset=utf-8`, and the body `{"id":4,"title":"Study","done":false}`.',
    mistake: 'Writing `res.status(201)` and stopping there, expecting it to answer. It only sets a number on the parcel: no sending method was called, so the request **hangs** until the client gives up. Every path through a handler must end with exactly one sending call.' },

  { id: 'one-response', hub: 'routing', topic: 'routing', 
    title: 'Exactly one response per request',
    summary: 'Every request must get **one** response: zero means the request hangs; two means Node throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. Write `return res.…` whenever more code follows.',
    body: [
      'HTTP is a question and **one** answer (see "Client and server"). Once `res.json()` has sent the status line and the headers, they are gone over the network: there is no way to change them. So the first sending call wins, and a second one fails with `ERR_HTTP_HEADERS_SENT`. The client never sees that error; it already has the first answer. You see it in the terminal, often as a confusing 500 in your logs.',
      'The usual cause is an early answer without `return`. `res.status(400).json(…)` sends the response but does **not** stop the function: JavaScript carries on to the next line and tries to send the success response too. `return res.status(400).json(…)` sends and leaves the function in one step. The same applies inside middleware: answer **or** call `next()`, never both.',
      'The other half of the rule: a path through your code that sends nothing (an `if` with no `else`, a `catch` that only logs) leaves the request **open**. Nothing times out on the server side; the browser spins and automated tests fail with a timeout.',
    ],
    code: `// Bug: without return, a body without title sends TWO responses
function createTask(req, res) {
  const { title } = req.body;
  if (!title) res.status(400).json({ error: 'title is required' });
  const task = { id: tasks.length + 1, title, done: false };   // still runs!
  tasks.push(task);
  res.status(201).json(task);   // → Error [ERR_HTTP_HEADERS_SENT]
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

  { id: 'routers', hub: 'routing', topic: 'routing', 
    title: 'express.Router(): routes under a prefix',
    summary: '`express.Router()` creates a mini-app that holds routes (and middleware) for one resource. `app.use(\'/tasks\', tasksRouter)` mounts it: requests whose path starts with `/tasks` enter the router, and inside it the prefix is removed, so `router.get(\'/\')` means `GET /tasks`.',
    body: [
      'A router is a department with its own reception desk. The main entrance (`app`) only reads the first part of the address: "anything for `/tasks` goes to the tasks department". The department then handles the rest of the address on its own: `/` is the list, `/:id` one task. That lets `routes/tasks.js` describe tasks without repeating `/tasks` on every line, and lets you move the whole department (to `/api/tasks`, say) by changing one line in `app.js`.',
      'While a request is inside the router, Express **strips the mount path**: for `GET /tasks/7`, the router sees `req.path === \'/7\'`, `req.baseUrl === \'/tasks\'`, and `req.originalUrl` still holds `/tasks/7`. If no route in the router answers, the request leaves the router and continues with the next layer of the app (the 404 catch-all, for instance).',
      'Parameters in the mount path (`app.use(\'/users/:userId/tasks\', router)`) are **not** visible in the router\'s `req.params` unless you create it with `express.Router({ mergeParams: true })`.',
    ],
    code: `// src/routes/tasks.js — thin: paths → controller functions
const express = require('express');
const { listTasks, createTask, getTask } = require('../controllers/tasksController');

const router = express.Router();
router.get('/', listTasks);       // GET  /tasks
router.post('/', createTask);     // POST /tasks
router.get('/:id', getTask);      // GET  /tasks/7
module.exports = router;

// src/app.js
app.use('/tasks', require('./routes/tasks'));`,
    example: 'Say you move the API under `/api`. Only one line changes: `app.use(\'/api/tasks\', tasksRouter)`. `GET /api/tasks/7` now enters the router, which still sees `/7` and still calls `getTask`; nothing in `routes/tasks.js` or the controller changes.',
    mistake: 'Repeating the prefix inside the router: `router.get(\'/tasks\', listTasks)` while `app.js` mounts it at `/tasks`. The real path becomes `/tasks/tasks`, and `GET /tasks` answers `404`. Inside a router, paths are relative to the mount path.',
    practice: { href: '#/server/routes/practice/route-matcher', label: 'Mount a router in the route matcher' } },

  { id: 'route-order', hub: 'routing', topic: 'routing', 
    title: 'Order of routes: the first match wins',
    summary: 'Express tries routes **in the order they were registered** and runs the first one whose method and path match. It never looks for the "most specific" route, so a pattern like `/tasks/:id` placed before `/tasks/stats` captures `stats` as an id.',
    body: [
      'Express reads your routes like a list of rules from top to bottom and stops at the first rule that fits. `:id` fits **any** single segment, so for `GET /tasks/stats` the rule `/tasks/:id` fits with `id = \'stats\'`. If that rule comes first, it answers (usually with `404 Task not found`, because no task has id `stats`), and the `/tasks/stats` route below it is never reached: it is **shadowed**.',
      'The rule of thumb: **specific before general**. Fixed paths (`/tasks/stats`, `/tasks/export`) go above parameter paths (`/tasks/:id`); catch-alls (`*`, the 404 handler) go after every route. A later route only runs if an earlier match passes the request on with `next()`, which a route handler rarely does.',
    ],
    code: `// Wrong order: GET /tasks/stats → getTask with id 'stats' → 404
router.get('/:id', getTask);
router.get('/stats', taskStats);   // never reached

// Right order
router.get('/stats', taskStats);   // fixed path first
router.get('/:id', getTask);`,
    example: 'A tasks API needs a `GET /tasks/stats` endpoint. A developer adds it at the bottom of `routes/tasks.js`, under `/:id`, and gets `{"error":"Task not found"}`. Nothing is wrong with the stats code: moving the line above `router.get(\'/:id\', …)` fixes it.',
    mistake: '"Express picks the best-matching route." It does not compare routes at all; it walks the list in order. The same goes for middleware: order in the file **is** the configuration.',
    practice: { href: '#/server/routes/practice/route-matcher', label: 'Fix the order in the route matcher' } },

  /* ---- 3. Middleware ---------------------------------------------------------------- */
  { id: 'middleware', hub: 'middleware', topic: 'middleware', 
    title: 'Middleware: (req, res, next)',
    summary: 'A **middleware** is a function `(req, res, next)` that Express runs for each request in registration order. It may change `req` or `res`, and then it must do one of two things: call `next()` to pass the request on, or **send a response** to end it. Doing neither leaves the request hanging.',
    body: [
      'Picture airport security. Every passenger (request) walks through a line of desks (middleware) in a fixed order: one stamps the ticket (logging), one checks the bag (parsing the body), one checks the passport (authentication). Each desk either waves you on (`next()`) or stops you there and sends you back with an answer (`res.status(401).json(…)`). Route handlers are simply the last desks: functions of the same kind that usually answer.',
      '`next` is a function Express hands to each middleware; calling it means "I am done, run the next matching layer". Calling it with an argument, `next(err)`, means "something failed": Express then skips every normal layer and jumps to the error handler (see the errors cards). If a middleware forgets both `next()` and a response, **nothing else ever runs**: no route, no 404, no error; the request waits forever.',
      '`app.use(fn)` registers middleware for **every** method and every path; `app.use(\'/api\', fn)` only for paths that **start with** `/api` (at a slash boundary: `/api/tasks` yes, `/apiary` no). That prefix matching is the big difference from routes, which match the whole path and one method.',
    ],
    code: `// Logs, then passes the request on
function logger(req, res, next) {
  console.log(\`\${req.method} \${req.url}\`);
  next();                        // forget this and every request hangs
}

// Answers early, or passes on
function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send JSON' });   // ends here
  }
  next();
}

app.use(logger);
app.use(requireJson);`,
    example: 'Request `GET /tasks` on a typical tasks app (json parser, logger, `/health`, `/echo/:msg`, the tasks router, 404, error handler): `express.json()` runs and calls `next()` (no body to read); `logger` prints `GET /tasks` and calls `next()`; `GET /health` and `GET /echo/:msg` do not match and are skipped; the router mounted at `/tasks` matches, its `GET /` route runs `listTasks`, which answers `200`. The layers after it (the 404 catch-all, the error handler) never run.',
    mistake: 'Writing a logger without `next()`. The terminal prints `GET /health` (so "the middleware works"), but the browser spins forever and `curl` never returns. Remember the rule: forget `next()` and every request hangs forever.',
    widget: 'middleware-pipeline' },

  { id: 'middleware-order', hub: 'middleware', topic: 'middleware', 
    title: 'Order is configuration',
    summary: 'Express runs layers in the order they were registered, so the order of `app.use` and route lines decides what each request meets: parsers and loggers first, guards before what they protect, routes, then the 404 catch-all, and the error handler last.',
    body: [
      'A layer only affects what comes **after** it in the list. `express.json()` registered below a route has not run yet when that route reads `req.body`. A login check registered below `/api/me` protects nothing, because the route answers before the check is reached. Reading `app.js` from top to bottom is reading the journey of every request.',
      'Middleware can also be attached to **one route**: `app.get(\'/api/me\', requireAuth, getMe)` runs `requireAuth` then `getMe`, only for that route. Or to a group of paths: `app.use(\'/api/admin\', requireAdmin)`. Choose the narrowest place that covers what you need.',
    ],
    points: [
      '1. **Global middleware**: `cors()`, `express.json()`, the logger, `express.static(…)`.',
      '2. **Public routes**: `GET /health`, the login route.',
      '3. **Guards**: `app.use(\'/api\', requireAuth)` (everything below it under `/api` needs a token).',
      '4. **Protected routes and routers**: `app.use(\'/api/tasks\', tasksRouter)`.',
      '5. **404 catch-all**: `app.use((req, res) => res.status(404).json(…))`.',
      '6. **Error handler**, with four parameters, always last.',
    ],
    example: 'In the "Protected API" preset of the pipeline simulator, `GET /api/health` is registered **above** `app.use(\'/api\', requireAuth)`, so it stays public: health checks work without a token. `GET /api/me` is registered below the guard, so without `Authorization: Bearer demo-token` it answers `401`.',
    mistake: 'Moving `app.use(express.json())` to the bottom of `app.js` "to keep the setup tidy". Every route above it now sees `req.body` as `undefined`, and `POST /tasks` crashes with `Cannot destructure property \'title\' of \'req.body\'`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Reorder layers in the pipeline simulator' } },

  { id: 'body-parsing', hub: 'middleware', topic: 'middleware', 
    title: 'express.json() and req.body',
    summary: '`express.json()` is built-in middleware that reads the request body and, **when the request has `Content-Type: application/json`**, parses it into `req.body`. Without it `req.body` is `undefined`; with the wrong `Content-Type` it is `{}` (Express 4); with broken JSON it sends an error with status `400` to your error handler.',
    body: [
      'The body of a request does not arrive as an object. It arrives as raw bytes, possibly in several pieces, after the headers (see "Inside an HTTP request"). Someone has to wait for all the pieces, check what format they are in, and turn the JSON text into a JavaScript object. That someone is `express.json()`: it looks at the `Content-Type` header, and only if it says `application/json` does it read and parse the body.',
      'Three outcomes, worth knowing by heart: no `express.json()` → `req.body` is **undefined**; `express.json()` but the client sent no body or another `Content-Type` → `req.body` is **`{}`** in Express 4 (left `undefined` in Express 5); invalid JSON (`{title: x}`, a missing quote) → the parser calls `next(err)` with `err.status = 400`, so your error handler answers `400`. It also refuses bodies over 100 kB by default (`413`).',
      'An HTML form sends `application/x-www-form-urlencoded`, not JSON (`title=Study&done=on`, built from the `name` attributes of its inputs, see "Forms" in the HTML section). For those, add `express.urlencoded({ extended: false })`.',
    ],
    code: `app.use(express.json());                          // before the routes!

app.post('/tasks', (req, res) => {
  console.log(req.body);                          // { title: 'Buy milk' }
  res.status(201).json({ received: req.body });
});

// The client must say the body is JSON:
// curl -X POST http://localhost:3000/tasks \\
//   -H "Content-Type: application/json" \\
//   -d '{"title":"Buy milk"}'`,
    dialect: 'JavaScript + shell',
    example: 'Run a curl `POST /tasks` command without the `-H "Content-Type: application/json"` line. curl then labels the body `application/x-www-form-urlencoded`, `express.json()` ignores it, and `createTask` receives `req.body = {}`: a controller that echoes the body answers `{"received":{}}`, and a validating controller answers `400 title is required`, although the JSON was right there.',
    mistake: 'Blaming the controller when `req.body` is `undefined`. That value means no body parser ran before the route: `express.json()` is missing or registered after it. `{}` means the parser ran but skipped the body: check the client\'s `Content-Type`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenge 1 of the pipeline simulator' } },

  { id: 'common-middleware', hub: 'middleware', topic: 'middleware', 
    title: 'Middleware you will use: static, cors, logging',
    summary: 'A handful of middleware covers most projects: `express.json()` and `express.urlencoded()` (bodies), `express.static(\'public\')` (files for the browser), `cors()` (calls from other origins) and a request logger (`morgan` or your own). The first three come with Express; `cors` and `morgan` are npm packages you install.',
    body: [
      'Each of these does one cross-cutting job, something every request needs, so no route has to repeat it. They are ordinary `(req, res, next)` functions; the call `express.json()` or `cors()` simply **returns** such a function, configured with your options. That is why you write `app.use(cors())` with brackets but `app.use(logger)` without: `logger` already is the function.',
      '`express.static(\'public\')` answers a `GET` for `/styles.css` with the file `public/styles.css`, and `/` with `public/index.html`. When no file matches, it calls `next()`, so your API routes below still work: this is how a small project serves its front end and its API from one server. The folder name is resolved from the directory where you **ran** `node`; `express.static(path.join(__dirname, \'..\', \'public\'))` is safer.',
      '`cors()` adds the `Access-Control-Allow-Origin` header so that a page from another **origin** (for example a React dev server on port 5173) may read your API\'s responses. It does not protect anything: browsers enforce CORS, `curl` ignores it. The Authentication and security section explains it in full.',
    ],
    table: {
      caption: 'Common middleware',
      head: ['Middleware', 'Comes from', 'What it does', 'Register'],
      rows: [
        ['`express.json()`', 'Express', 'JSON body → `req.body`', 'Early, before routes'],
        ['`express.urlencoded({ extended: false })`', 'Express', 'HTML form body → `req.body`', 'Early, before routes'],
        ['`express.static(\'public\')`', 'Express', 'Sends files from a folder, else `next()`', 'Before the API routes'],
        ['`cors()`', '`npm install cors`', 'Adds CORS headers for browser calls from other origins', 'First, before routes'],
        ['`morgan(\'dev\')`', '`npm install morgan`', 'One log line per request (method, URL, status, time)', 'Early'],
        ['`logger` (yours)', 'Your file', 'Prints `METHOD URL`, then `next()`', 'Early'],
      ],
    },
    example: 'An `app.js` that serves a front end and an API starts with `app.use(cors()); app.use(express.json()); app.use(logger); app.use(express.static(\'public\'));`. A browser asking for `/` gets `public/index.html` from `express.static`; the page\'s script calls `fetch(\'/api/tasks\')`, which finds no file, falls through `express.static`, and reaches the tasks router.',
    mistake: '`Error: Cannot find module \'cors\'`: only `express.json`, `express.urlencoded` and `express.static` ship with Express. `cors` and `morgan` must be installed first (`npm install cors morgan`), which also adds them to `dependencies` in `package.json`.' },

  { id: 'guard-middleware', hub: 'middleware', topic: 'middleware', 
    title: 'Guards: middleware that can stop a request',
    summary: 'A **guard** is middleware that checks something (usually who is calling) and either stops the request with an error response (`401`, `403`) or adds what it learned to `req` (such as `req.user`) and calls `next()`.',
    body: [
      'A guard is the bouncer at a door: no valid ticket, no entry, and the bouncer answers you directly; valid ticket, the bouncer writes your name on a badge (`req.user`) and lets you through. The handlers behind the door can then trust `req.user` without checking again.',
      'The shape is always the same: `return` the error response, otherwise `next()`. Forgetting the `return` sends the `401` **and** runs the protected route, which then tries to answer too (`ERR_HTTP_HEADERS_SENT`). How the ticket is checked (a password hash, a session, a signed JWT) is the subject of the section Authentication and security; here it is a fixed demo token.',
    ],
    code: `function requireAuth(req, res, next) {
  const header = req.get('Authorization');            // "Bearer <token>"
  if (header !== 'Bearer demo-token') {
    return res.status(401).json({ error: 'Log in first' });
  }
  req.user = { id: 1, name: 'Ana' };    // a real app verifies a JWT here
  next();
}

app.get('/api/health', health);         // public: above the guard
app.use('/api', requireAuth);           // guards everything below under /api
app.get('/api/me', (req, res) => res.json({ user: req.user }));`,
    example: '`curl http://localhost:3000/api/me` → `401 {"error":"Log in first"}`. `curl -H "Authorization: Bearer demo-token" http://localhost:3000/api/me` → `200 {"user":{"id":1,"name":"Ana"}}`. `curl http://localhost:3000/api/health` → `200` without a token, because that route is registered before the guard.',
    mistake: 'Registering the guard after the route it should protect. The route answers first, `req.user` is `undefined`, and `res.json({ user: undefined })` sends `{}` with status `200`: no error anywhere, just an unprotected endpoint.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Solve challenges 2 and 3 of the pipeline simulator' } },

  /* ---- 4. Controllers and the lifecycle -------------------------------------------- */
  { id: 'controllers', hub: 'structure', topic: 'structure', 
    title: 'Controllers: thin routes, testable logic',
    summary: 'A **controller** is the plain function that does a route\'s work (read the request, validate, fetch or change data, answer). Controllers live in `controllers/`, the route file only maps paths to them, so each part is short and the logic can be tested on its own.',
    body: [
      'The route file is the restaurant\'s menu: one line per dish, no recipes. The controller is the recipe. Keeping recipes off the menu means you can read every URL of the API on one screen, and you can change how a dish is cooked (an array today, a SQL database tomorrow) without touching the menu. Express has no special "controller" feature: it is a convention, but one almost every Express codebase follows.',
      'A controller is just a function `(req, res, next)`. Because it only uses what it receives, you can call it with **stand-in objects**: a fake `req` with the fields you need and a fake `res` that records what was sent. The **Try it** box does exactly that, with no server and no Express. supertest then tests the whole app through HTTP; both kinds of test are useful.',
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

  { id: 'request-lifecycle', hub: 'structure', topic: 'structure', 
    title: 'The life of a request',
    summary: 'A request travels through one pipeline: Node receives it and hands it to the app; each middleware in order passes it on; the router picks the route; the controller answers. Any `next(err)` or thrown error jumps to the error handler; a request nobody answers reaches Express\'s own 404.',
    body: [
      'Follow a parcel through a sorting centre. It enters at one door (Node\'s HTTP server), passes the same conveyor belt as every other parcel (global middleware), is routed to one department by its address (router and route), where someone deals with it and sends the reply (controller). A damaged parcel is taken off the belt at any point and sent to the claims office at the end (error handler). A parcel with an unknown address reaches the end of the belt and gets a "no such address" slip (the 404).',
      'Three exits, and every request takes exactly one: a **response** (from a controller, a guard, `express.static`, your 404 or your error handler, or Express\'s own final handler); a **hang** (some layer neither answered nor called `next()`); or a **crash** of the whole process (an error nobody caught, such as an unhandled promise rejection in Express 4).',
    ],
    points: [
      '1. Node parses the request line and headers and calls the app.',
      '2. Express adds its helpers (`req.query`, `req.get`, `res.json`…) and the `X-Powered-By: Express` header.',
      '3. Global middleware, in order: `cors()`, `express.json()` (fills `req.body`), the logger.',
      '4. Guards on a prefix: `app.use(\'/api\', requireAuth)` (fills `req.user` or answers `401`).',
      '5. Routes and routers: the first method + path match runs its controller, which sends the response.',
      '6. No match: your 404 catch-all, or Express\'s `Cannot GET /x`.',
      '7. On `next(err)` or a thrown error: everything else is skipped until the 4-parameter error handler.',
    ],
    example: '`POST /tasks` with a broken JSON body: `express.json()` fails to parse it and calls `next(err)` with status 400 (step 3); the logger, the routes and the 404 catch-all are all skipped, because an error is pending (step 7); the error handler answers `400 {"error":"Expected property name or \'}\' in JSON at position 1 …"}`. The controller never ran, and the logger never printed a line.',
    mistake: 'Assuming every middleware runs for every request. A layer only runs if the request **reaches** it: an earlier response ends the journey, an error makes Express skip ordinary layers, and `app.use(\'/api\', …)` never sees `/health`.',
    practice: { href: '#/server/routes/practice/middleware-pipeline', label: 'Trace requests in the pipeline simulator' } },

  /* ---- 5. Errors and 404s ----------------------------------------------------------- */
  { id: 'error-handler', hub: 'errors', topic: 'errors', 
    title: 'The error handler: four parameters, registered last',
    summary: 'An **error-handling middleware** is a function with **four** parameters, `(err, req, res, next)`. Express recognises it only by that count, skips it during normal requests, and sends it every error passed with `next(err)` or thrown in a handler. Register one, after every route.',
    body: [
      'An error handler is the claims office at the end of the belt. Errors only travel **forward**: from the layer that failed, Express walks down the list looking for the next four-parameter function, skipping every ordinary layer. A handler registered at the top is therefore never reached by an error from a route below it. That is why it goes **last**: so that every route is above it.',
      'Express counts the parameters in the function definition (its `length`). With four it is an error handler; with three it is ordinary middleware, even if you name the first parameter `err`. The `next` parameter is required even when you never call it. Inside, log the error and answer one JSON shape for every failure: `res.status(err.status || 500).json({ error: err.message })`. Errors you create can carry their status: `err.status = 404`.',
      'If no error handler answers, Express\'s built-in final handler sends a `500` **HTML** page with the stack trace (only `Internal Server Error` when `NODE_ENV=production`). For an API that is the wrong format and, in development, it leaks file paths.',
    ],
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
    body: [
      'Express wraps every call to your functions in a `try`/`catch`. So an error thrown while your handler is running (a typo, `undefined.title`, an explicit `throw`) is caught and treated exactly like `next(err)`. Both put the request on the "error track": Express skips routes, routers and three-parameter middleware, and only stops at an error handler.',
      'Use `next(err)` when you decide something failed and want the central handler to format it. Give the error a status so the handler answers correctly: `const err = new Error(\'Task not found\'); err.status = 404; return next(err);`. Write `return next(err)` so the function stops there, for the same reason as `return res.…`.',
      'What Express 4 cannot catch: an error thrown **later**, after an `await` or inside a callback, when your handler has already returned. Those need `try`/`catch` + `next(err)` (next card).',
    ],
    code: `// Both reach the error handler
app.get('/boom', (req, res, next) => {
  next(new Error('Boom!'));            // explicit
});
app.get('/boom2', (req, res) => {
  throw new Error('Boom!');            // caught by Express (synchronous)
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
    body: [
      'Express 4 calls your handler and looks only at what happens **during** that call. An `async` function returns a promise straight away; if that promise is rejected a moment later (the database was down), Express 4 has already moved on and ignores it. Nobody handles the rejection, and Node ends the process (see "Errors in async code" in the Node.js section). Every connected user is cut off, not only the one whose request failed. Some tutorials still say "the request just hangs"; with today\'s Node it is worse: a crash.',
      'The fix in Express 4 is the shape you type in every async handler: `try { … await … } catch (err) { next(err); }`. When it gets repetitive, a tiny wrapper does it for every handler: `const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);` and then `router.get(\'/\', asyncHandler(listTasks))`.',
      '**Express 5** checks whether a handler returned a promise and, if it is rejected, calls `next(err)` for you. Careful: `npm install express` in an empty folder installs Express **5** today, while many existing projects\' `package.json` pin Express 4 (`^4.22.3`). Check `npm ls express` to know which rules apply; writing the `try`/`catch` works in both.',
    ],
    code: `// Express 4: a rejection here crashes the process
app.get('/stats', async (req, res) => {
  const stats = await db.getStats();      // rejects: database offline
  res.json(stats);
});

// Works in Express 4 and 5
app.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    next(err);                            // → error handler → 500 JSON
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
    body: [
      'The catch-all is the "no such address" desk at the very end of the belt. `app.use(fn)` without a path matches every request, so any request that **reaches** it has passed every route without being answered: by definition, nothing matched. Placed after the routes and before the error handler, it turns Express\'s HTML page into the same JSON shape as the rest of your API, which is what any client of a JSON API expects.',
      'Two different 404s exist in an API. "No such route" (`GET /tsks`) is the catch-all\'s job. "The route exists but that task does not" (`GET /tasks/999`) is the controller\'s job: it looks for the task and answers `404 Task not found` itself.',
    ],
    code: `// … every route and router above …

app.use((req, res) => {                     // 404 catch-all
  res.status(404).json({ error: \`Not found: \${req.method} \${req.originalUrl}\` });
});

app.use((err, req, res, next) => {          // error handler, last
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
  { type: 'mc', topic: 'basics',
    q: 'Why does a well-organised Express project keep `app.listen()` out of `src/app.js`?',
    choices: ['Express forbids calling listen in a file named app.js', 'So tests can require the app and send it requests without opening a real port', 'Because listen must be called before any route is registered', 'To make the server start faster'],
    answer: 1,
    why: '`app.js` builds and exports; `server.js` starts. supertest uses the exported app in memory.' },
  { type: 'mc', topic: 'basics',
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
    why: 'Express is **unopinionated**: the folders are a course convention, not something Express requires.' },
  { type: 'mc', topic: 'basics',
    q: 'In a project split into `src/app.js` and `src/server.js`, which file do you run to start the API?',
    choices: ['src/app.js', 'src/routes/tasks.js', 'src/server.js', 'package-lock.json'],
    answer: 2,
    why: '`server.js` requires the app and calls `listen`; the `start` script runs `node --watch src/server.js`.' },

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
  { type: 'mc', topic: 'routing',
    q: 'A router is mounted with `app.use(\'/tasks\', router)`. Which line inside the router handles `GET /tasks`?',
    choices: ['`router.get(\'/tasks\', …)`', '`router.get(\'/\', …)`', '`router.get(\'*\', …)`', '`app.get(\'/\', …)`'],
    answer: 1,
    why: 'Inside a router the mount path is stripped: `/tasks` becomes `/`. `router.get(\'/tasks\')` would mean `/tasks/tasks`.' },
  { type: 'mc', topic: 'routing',
    q: 'Inside a router mounted at `/api/tasks`, a request `GET /api/tasks/7?x=1` arrives. What is `req.baseUrl`?',
    choices: ['`/api/tasks`', '`/7`', '`/api/tasks/7?x=1`', '`""`'],
    answer: 0,
    why: '`req.baseUrl` is the mount path; `req.path` is `/7`; `req.originalUrl` is the whole URL.' },
  { type: 'mc', topic: 'routing',
    q: 'Which line sends a 201 response with a JSON body?',
    choices: ['`res.status(201);`', '`res.json(task).status(201);`', '`res.status(201).json(task);`', '`res.set(201, task);`'],
    answer: 2,
    why: '`status()` only sets the code and returns `res`; `json()` sends. In the second choice the response is already sent before `status` runs.' },
  { type: 'fib', topic: 'routing',
    q: 'Sending a second response for the same request throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set ___ after they are sent to the client`.',
    accept: ['headers'],
    why: 'The status line and headers left with the first response; they cannot be changed. Use `return res.…`.' },
  { type: 'mc', topic: 'routing',
    q: '`if (!title) res.status(400).json({ error: \'title is required\' });` is followed by code that sends a 201. What is the fix?',
    choices: ['Add `return` before `res.status(400)`', 'Use `res.send` instead of `res.json`', 'Swap the two responses', 'Add `next()` after the 400'],
    answer: 0,
    why: 'Sending does not stop the function; `return` does. Calling `next()` too would also try to answer twice.' },
  { type: 'tf', topic: 'routing',
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
  { type: 'mc', topic: 'structure',
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
