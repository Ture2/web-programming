'use strict';
/* Designing APIs: concept cards, rail groups, self-check quiz and the status-chooser scenarios
   (REST over HTTP as the main style, Express 4 for code samples). Cards explain with `html`
   blocks and `diagram` specs (js/concept-section.js, js/diagram.js). Builds on "How the web
   works" and "Routes and middleware" and links them instead of repeating them.
   `hub` and `topic` keys match REST_QUIZ_TOPICS and REST_GROUPS (one topic per group). */

DATA.en.REST_QUIZ_TOPICS = {
  rest: 'What REST is',
  urls: 'Designing URLs',
  methods: 'Methods and CRUD',
  status: 'Status codes and errors',
  contract: 'The API contract',
  build: 'Building and testing',
  beyond: 'Documenting and other API styles',
};

DATA.en.REST_GROUPS = [
  { key: 'rest', label: 'What REST is', icon: 'why' },
  { key: 'urls', label: 'Designing URLs', icon: 'link' },
  { key: 'methods', label: 'Methods and CRUD', icon: 'arrow' },
  { key: 'status', label: 'Status codes and errors', icon: 'table' },
  { key: 'contract', label: 'The API contract', icon: 'doc' },
  { key: 'build', label: 'Building and testing', icon: 'code' },
  { key: 'beyond', label: 'Documenting and other API styles', icon: 'web' },
];

DATA.en.REST_CONCEPTS = [
  /* ---- 1. What REST is ----------------------------------------------------------------- */
  { id: 'rest-what', hub: 'rest', topic: 'rest',
    title: 'What REST is',
    summary: '**REST** (Representational State Transfer) is a way of designing HTTP APIs: every thing the API knows about has its own URL, and the same few HTTP methods read and change all of them.',
    html: [
      '<p>Once every task, user and list has its own URL, and <code>GET</code>, <code>POST</code>, <code>PATCH</code> and <code>DELETE</code> mean the same thing on all of them, a client that has used one endpoint can guess the others. REST is that predictability: a set of design rules, not a library. Express lets you write any route at all; REST is the decisions you make while writing them.</p>',
      '<table><caption>REST vocabulary</caption><thead><tr><th scope="col">Term</th><th scope="col">Meaning</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row">Resource</th><td>A thing the API lets you name with a URL</td><td>a task, a user, the list of tasks</td></tr>'
        + '<tr><th scope="row">Collection</th><td>The resource that holds many items</td><td><code>/api/tasks</code></td></tr>'
        + '<tr><th scope="row">Item</th><td>One resource inside a collection</td><td><code>/api/tasks/7</code></td></tr>'
        + '<tr><th scope="row">Representation</th><td>The resource written in a format and sent over HTTP: not the stored record, a description of it</td><td><code>{"id":7,"title":"Study","done":false}</code></td></tr>'
        + '<tr><th scope="row">Endpoint</th><td>One method + path pair the API supports</td><td><code>DELETE /api/tasks/:id</code></td></tr>'
        + '</tbody></table>',
      '<h3>The rules that shape everyday design</h3>',
      '<dl><dt>Client-server</dt><dd>The front end and the back end are separate programs that only talk over HTTP.</dd>'
        + '<dt>Uniform interface</dt><dd>Methods, status codes and headers mean the same on every resource: <code>DELETE</code> always removes, <code>404</code> always means "not there".</dd>'
        + '<dt>Stateless</dt><dd>Every request carries everything needed to answer it (see <a href="#/http/api-design/statelessness">Stateless requests</a>).</dd>'
        + '<dt>Cacheable</dt><dd>A <code>GET</code> answer may be reused.</dd></dl>',
      '<p>An API that follows them is called <strong>RESTful</strong>. The rules were written down by Roy Fielding in 2000.</p>',
    ],
    example: 'The same features designed twice. Action style: `POST /getTask` with `{"id":7}`, `POST /markTaskDone?id=7`, `POST /removeTask?id=7`. REST style: `GET /api/tasks/7`, `PATCH /api/tasks/7` with `{"done":true}`, `DELETE /api/tasks/7`. A newcomer who has seen `GET /api/users/3` guesses `DELETE /api/users/3`; the action version needs the documentation for every call.',
    mistake: 'Believing an API is RESTful because it answers JSON. `POST /api/doEverything?action=delete&id=7` answers JSON and breaks every rule: the URL names an action, the method means nothing and the status code says nothing. REST is about resources and a uniform interface, not the format.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Explore a RESTful API in the request builder' } },

  { id: 'statelessness', hub: 'rest', topic: 'rest',
    title: 'Stateless requests',
    summary: 'In a **stateless** API each request carries everything the server needs to handle it (who is calling, which resource, which options), and the server keeps no memory of that client between requests.',
    html: [
      '<p>Because no copy of the server remembers "this conversation", any copy can answer any request. That is what lets you run several copies behind a <strong>load balancer</strong> (a server that spreads requests over them), restart one without logging anybody out, and test each request on its own. HTTP is already stateless (see <a href="#/http/web/http-basics">HTTP and HTTPS</a>); REST asks you not to undo it.</p>',
      '<dl><dt>Resource state: stored</dt><dd>The tasks themselves. They are the point of the API and they persist, in memory now and in a database later.</dd>'
        + '<dt>Conversation state: not in the server</dt><dd>"This client is logged in", "this client is on page 2", "this client chose done=false". It travels with each request instead: a token in the <code>Authorization</code> header, <code>?page=2&amp;done=false</code> in the URL.</dd></dl>',
      '<p>A <strong>token</strong> is a string the server gave the client at log-in; the client sends it back on every request. How tokens and sessions are built is in <a href="#/server/auth/sessions-vs-tokens">Sessions and tokens</a>. The cost of statelessness: every request is a little bigger, and the server checks the identity every time.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The request carries the context, so it does not matter which copy answers.',
      desc: 'A request carrying a token and its options reaches a load balancer, which may send it to copy A, copy B or copy C of the API. Each copy can answer it, because nothing about the client is stored inside a copy.',
      nodes: [
        { id: 'req', label: 'Request', note: 'token + options', key: true },
        { id: 'lb', label: 'Load balancer' },
        { id: 'a', label: 'Copy A' },
        { id: 'b', label: 'Copy B' },
        { id: 'c', label: 'Copy C' },
      ],
      edges: [['req', 'lb'], ['lb', 'a'], ['lb', 'b'], ['lb', 'c']],
    },
    code: `// ✗ Stateful: the server keeps "who is logged in" in its own memory
let currentUser = null;
app.post('/api/login', (req, res) => {
  // shared by EVERY client of this process
  currentUser = req.body.email;
  res.sendStatus(204);
});
app.get('/api/my-books', (req, res) => {
  res.json(books.filter((b) => b.owner === currentUser));
});

// ✓ Stateless: every request says who it comes from
app.get('/api/my-books', requireToken, (req, res) => {
  // req.user set from the token
  res.json(books.filter((b) => b.owner === req.user.email));
});`,
    example: 'With the stateful code, Ana logs in, then Leo logs in: `currentUser` is now Leo, and Ana\'s next `GET /api/my-books` returns **Leo\'s** books. With two copies it gets worse: Ana logged in on copy A, her next request lands on copy B, where `currentUser` is `null`. In the stateless version each request carries `Authorization: Bearer <token>`, so who logged in last, or which copy answers, no longer matters.',
    mistake: 'Thinking "stateless" forbids a database, or forbids remembering a logged-in user. The data lives in storage (resource state), and the **client** remembers being logged in by sending its token every time. Only per-client memory **inside the server process** is ruled out.' },

  /* ---- 2. Designing URLs ------------------------------------------------------------- */
  { id: 'resource-naming', hub: 'urls', topic: 'urls',
    title: 'Naming resources: nouns, plurals, ids and nesting',
    summary: 'A RESTful URL names a **thing**, never an action: a plural noun for the collection (`/api/tasks`), the collection plus an id for one item (`/api/tasks/7`), and a nested path when a resource belongs to another (`/api/users/2/tasks`).',
    html: [
      '<p>The URL holds the noun; the <strong>method</strong> holds the verb. <code>GET</code>, <code>POST</code>, <code>PATCH</code> and <code>DELETE</code> already say what to do, so a path such as <code>/api/deleteTask</code> says it twice, and differently on every endpoint.</p>',
      '<ul><li><strong>One plural noun per resource,</strong> for both levels: <code>/api/tasks</code> and <code>/api/tasks/7</code>, never <code>/api/task/7</code>.</li>'
        + '<li><strong>The id goes in the path,</strong> because it identifies the resource; the query string is for options (see <a href="#/http/api-design/query-params">Filters, sorting and pagination</a>).</li>'
        + '<li><strong>Lower case with hyphens:</strong> <code>/api/study-groups</code>. Paths are case-sensitive, so <code>/api/Tasks</code> is another URL.</li>'
        + '<li><strong>An <code>/api</code> prefix</strong> keeps the API apart from pages the same server may serve.</li></ul>',
      '<h3>Nesting or a filter?</h3>',
      '<p><code>/api/users/2/tasks</code> and <code>/api/tasks?userId=2</code> can return the same items. Nest when the parent is part of the identity ("user 2\'s tasks"); filter when it is one criterion among others that combine (<code>?userId=2&amp;done=false</code>). Keep nesting to one level: once an item has its own id, give it its own path (<code>/api/comments/3</code>, not <code>/api/users/2/tasks/7/comments/3</code>).</p>',
      '<p>Actions that are not plain CRUD usually become a <strong>field</strong> or a <strong>resource</strong>: "mark as done" is <code>PATCH /api/tasks/7</code> with <code>{"done":true}</code>. A few pragmatic exceptions such as <code>POST /api/auth/login</code> are fine if they stay rare and obvious.</p>',
      '<table><caption>From action URLs to resource URLs</caption><thead><tr><th scope="col">Instead of</th><th scope="col">Write</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>GET /api/getAllTasks</code></th><td><code>GET /api/tasks</code></td><td>The method already says "get"</td></tr>'
        + '<tr><th scope="row"><code>POST /api/createTask</code></th><td><code>POST /api/tasks</code></td><td>Create = POST on the collection</td></tr>'
        + '<tr><th scope="row"><code>GET /api/tasks?id=7</code></th><td><code>GET /api/tasks/7</code></td><td>Identity belongs in the path</td></tr>'
        + '<tr><th scope="row"><code>POST /api/tasks/7/delete</code></th><td><code>DELETE /api/tasks/7</code></td><td>The method is the action</td></tr>'
        + '<tr><th scope="row"><code>PUT /api/tasks/7/markDone</code></th><td><code>PATCH /api/tasks/7</code> + <code>{"done":true}</code></td><td>Changing a field is an update</td></tr>'
        + '<tr><th scope="row"><code>GET /api/tasksOfUser?user=2</code></th><td><code>GET /api/users/2/tasks</code> or <code>?userId=2</code></td><td>Nesting or a filter, not a new name</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'tree',
      title: 'Paths read like folders: a collection, its items, and at most one level of nesting.',
      desc: 'Under /api there are two collections, tasks and users. tasks holds item 7. users holds item 2, and user 2 has a nested collection of its tasks.',
      nodes: [
        { id: 'api', label: '`/api`' },
        { id: 'tasks', label: '`tasks`', note: 'collection', key: true },
        { id: 't7', label: '`7`', note: 'one task' },
        { id: 'users', label: '`users`', note: 'collection' },
        { id: 'u2', label: '`2`', note: 'one user' },
        { id: 'u2tasks', label: '`tasks`', note: 'user 2\'s tasks' },
      ],
      edges: [['api', 'tasks'], ['tasks', 't7'], ['api', 'users'], ['users', 'u2'], ['u2', 'u2tasks']],
    },
    example: 'A book club API: `GET /api/books` (all books), `GET /api/books/12` (one book), `POST /api/books` (add one), `GET /api/books/12/reviews` (the reviews of book 12), `POST /api/books/12/reviews` (review it), `DELETE /api/reviews/88` (one review, by its own id). Six endpoints, two nouns, and every method means what it always means.',
    mistake: 'Adding a verb "because it is clearer", such as `GET /api/books/search`. Now `/api/books/search` collides with `/api/books/:id` (Express may read `search` as an id) and clients learn one more name. A search is a filter on the collection: `GET /api/books?search=dune`.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Try a verb in a URL in the request builder' } },

  { id: 'query-params', hub: 'urls', topic: 'urls',
    title: 'Filters, sorting and pagination: the query string',
    summary: 'The path says **which resource**; the **query string** says **which part of it, in what order and how much**: filters (`?done=false`), search (`?search=css`), sorting (`?sort=createdAt&order=desc`) and pagination (`?page=2&limit=10`).',
    html: [
      '<p>A filtered, sorted or paged list is still the same resource, only a different view of it, so it gets no new path. Options combine in any order and can be left out, which is what <code>key=value&amp;key=value</code> pairs are good at. Every value arrives as a <strong>string</strong> (see <a href="#/server/routes/query-strings">Query strings: req.query</a>).</p>',
      '<h3>The pagination contract</h3>',
      '<dl><dt>Request</dt><dd><code>?page=2&amp;limit=10</code>: items 11–20. The same window as offset style, <code>?offset=10&amp;limit=10</code>: offset = (page − 1) × limit.</dd>'
        + '<dt>Response body</dt><dd>A plain JSON <strong>array</strong> of the items on that page, so <code>GET /api/tasks</code> stays a list.</dd>'
        + '<dt>Response headers</dt><dd><code>X-Total-Count: 57</code> (how many match in total) and, optionally, <code>Link: &lt;/api/tasks?page=3&amp;limit=10&gt;; rel="next"</code>.</dd>'
        + '<dt>Order</dt><dd>Always sort by something stable, with a tie-breaker (<code>createdAt</code>, then <code>id</code>), or items move between pages.</dd>'
        + '<dt>Limits</dt><dd>Default the page size and cap it (at most 100, say): someone will try <code>?limit=1000000</code> (see <a href="#/server/auth/pagination-limits">Limits that protect the API</a>).</dd></dl>',
      '<p>This is the convention every example on this site follows, including the request builder; the SQL and MongoDB cards show how to fetch one page (<a href="#/database/relational/pagination">LIMIT and OFFSET</a>, <a href="#/database/documents/sort-paginate">sort, skip and limit</a>). Some APIs put the numbers in an <strong>envelope</strong> body instead (<code>{ "items": […], "total": 57 }</code>): both work; pick one and document it.</p>',
      '<ul><li><strong>Filter on the server,</strong> never by sending everything to the browser: it wastes bandwidth and can expose data the user should not see.</li>'
        + '<li><strong>Bad parameters:</strong> ignore unknown names (<code>?colour=red</code>); reject malformed values (<code>?limit=abc</code>, <code>?done=maybe</code>) with <strong>400</strong>, one error per parameter.</li>'
        + '<li><strong>No matches is not an error:</strong> <code>200</code> with <code>[]</code>, never <code>404</code>.</li></ul>',
    ],
    live: { kind: 'js', code: `// req.query in Express holds the same thing: every value is a STRING
const params = new URLSearchParams('done=false&page=2&limit=500&tag=a&tag=b');

console.log(params.get('done'), typeof params.get('done'));
// the string "false" is truthy!
console.log(Boolean(params.get('done')));
// the right test
console.log(params.get('done') === 'true');

const page = Math.max(1, Number(params.get('page')) || 1);
// clamped
const limit = Math.min(100, Number(params.get('limit')) || 20);
console.log({ page, limit, offset: (page - 1) * limit });

// repeated keys
console.log(params.get('tag'), params.getAll('tag'));` },
    example: 'Five tasks, of which 2, 3 and 4 are unfinished. `GET /api/tasks?done=false&sort=createdAt&order=desc&limit=2` returns `200` with tasks 4 and 3 and `X-Total-Count: 3`, so the client knows a second page exists. `GET /api/tasks?done=false&page=5&limit=2` returns `200` with `[]`: the page is past the end, not "not found".',
    mistake: 'Paging without a stable order. Sorted only by `createdAt`, two tasks created in the same millisecond can swap places between requests: one appears on page 1 **and** page 2, the other on neither. Add a tie-breaker that is unique, such as the `id`.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Filter, sort and paginate in the request builder' } },

  { id: 'versioning', hub: 'urls', topic: 'urls',
    title: 'Versioning: changing an API without breaking its clients',
    summary: 'A **version** in the URL (`/api/v1/tasks`) or in a header lets you publish an incompatible change as a new version while existing clients keep using the old one.',
    html: [
      '<p>An API is a promise to programs you do not control: a phone app that will not update for months, a partner\'s script, a front end someone else maintains. So sort every change into one of two kinds, and only one kind needs a new version.</p>',
      '<table><caption>Which changes break clients</caption><thead><tr><th scope="col">Kind</th><th scope="col">Examples</th><th scope="col">New version?</th></tr></thead><tbody>'
        + '<tr><th scope="row">Non-breaking</th><td>A new endpoint, a new optional query parameter, a new field in a response</td><td>No</td></tr>'
        + '<tr><th scope="row">Breaking</th><td>Renaming or removing a field; changing a type (<code>done</code> from a boolean to <code>"yes"</code>); making an optional field required; changing a URL or a status code</td><td>Yes</td></tr>'
        + '</tbody></table>',
      '<dl><dt>In the path</dt><dd><code>/api/v1/tasks</code>, mounted with <code>app.use(\'/api/v1/tasks\', tasksRouterV1)</code>. Visible, easy to try with curl, easy to route. The most common choice.</dd>'
        + '<dt>In a header</dt><dd><code>Accept: application/vnd.example.v2+json</code>. Clean URLs, but harder to try in a browser.</dd>'
        + '<dt>Deprecated</dt><dd>When v2 ships, v1 keeps working for a while, announced as scheduled to be switched off.</dd></dl>',
      '<p>An API with a single client, your own front end, can skip the prefix. A mapping between what is stored and what is sent (see <a href="#/http/api-design/dto">The API contract and DTOs</a>) lets you change the storage without ever needing a new version.</p>',
    ],
    example: 'Version 1 returns `{ "id": 7, "name": "Study" }` and the field should be called `title`. Renaming it would crash every client that reads `task.name`. Instead: in v1 send **both** `name` and `title` (adding is non-breaking); publish `/api/v2/tasks` with only `title`; mark v1 deprecated; switch it off once the clients have moved.',
    mistake: 'Renaming a field "to tidy up" inside the same version, or creating a version for every small addition (`/v1` … `/v14`). Additions need no version; only breaking changes do.' },

  /* ---- 3. Methods and CRUD ----------------------------------------------------------- */
  { id: 'crud-mapping', hub: 'methods', topic: 'methods',
    title: 'CRUD on HTTP: the routes of a resource',
    summary: '**CRUD** (Create, Read, Update, Delete) names the four things almost every API does to its data; REST maps them onto HTTP methods applied to two URLs per resource, the **collection** and the **item**.',
    html: [
      '<p>The collection (<code>/api/tasks</code>) is where you list everything or add something new; the item (<code>/api/tasks/7</code>) is where you read, replace, change or remove one thing. Read and Update each come in two flavours (list or one; replace or change some fields), so a resource usually has six endpoints. The method also decides the success status, so the client knows what happened before it reads the body.</p>',
      '<table><caption>The endpoints of a resource</caption><thead><tr><th scope="col">CRUD</th><th scope="col">Method + path</th><th scope="col">Request body</th><th scope="col">Success</th><th scope="col">Typical failures</th></tr></thead><tbody>'
        + '<tr><th scope="row">Read (list)</th><td><code>GET /api/tasks</code></td><td>none</td><td>200 + array</td><td>400 bad query value</td></tr>'
        + '<tr><th scope="row">Read (one)</th><td><code>GET /api/tasks/:id</code></td><td>none</td><td>200 + the item</td><td>404</td></tr>'
        + '<tr><th scope="row">Create</th><td><code>POST /api/tasks</code></td><td>the new item (no id)</td><td>201 + <code>Location</code> + the item</td><td>400</td></tr>'
        + '<tr><th scope="row">Update (replace)</th><td><code>PUT /api/tasks/:id</code></td><td>the complete item</td><td>200 + the item</td><td>400, 404</td></tr>'
        + '<tr><th scope="row">Update (partial)</th><td><code>PATCH /api/tasks/:id</code></td><td>only the changed fields</td><td>200 + the item</td><td>400, 404</td></tr>'
        + '<tr><th scope="row">Delete</th><td><code>DELETE /api/tasks/:id</code></td><td>none</td><td>204, no body</td><td>404</td></tr>'
        + '</tbody></table>',
      '<p>A method an endpoint does not support (<code>DELETE /api/tasks</code>, deleting the whole collection) gets <strong>405 Method Not Allowed</strong> (see <a href="#/http/api-design/status-client-errors">Client errors</a>).</p>',
    ],
    code: `// routes/books.js, mounted in app.js with app.use('/api/books', router)
// GET    /api/books       200 [ … ]
router.get('/', listBooks);
// POST   /api/books       201 + Location
router.post('/', createBook);
// GET    /api/books/:id   200 | 404
router.get('/:id', getBook);
// PUT    /api/books/:id   200 | 400 | 404
router.put('/:id', replaceBook);
// PATCH  /api/books/:id   200 | 400 | 404
router.patch('/:id', patchBook);
// DELETE /api/books/:id   204 | 404
router.delete('/:id', deleteBook);`,
    example: 'One lifecycle in the request builder: `GET /api/tasks` lists five tasks (200); `POST /api/tasks` with `{"title":"Study REST"}` answers 201 and `Location: /api/tasks/6`; `GET /api/tasks/6` reads it (200); `PATCH /api/tasks/6` with `{"done":true}` changes one field (200); `DELETE /api/tasks/6` removes it (204); a last `GET /api/tasks/6` answers 404. One URL pattern, and the status codes tell the whole story.',
    mistake: 'Sending updates to the collection, such as `PUT /api/tasks` with `{"id":6,"done":true}` in the body. The URL must name the resource being changed, so the id belongs in the path: `PATCH /api/tasks/6`. On a well-designed API the collection version answers 405.',
    widget: 'api-builder' },

  { id: 'safe-idempotent', hub: 'methods', topic: 'methods',
    title: 'Safe and idempotent: why retries matter',
    summary: 'A **safe** method changes nothing on the server (GET); an **idempotent** method leaves the server in the same state whether it is sent once or many times (GET, PUT, DELETE); POST is neither, and PATCH is not guaranteed to be.',
    html: [
      '<p>The two words come from <a href="#/http/web/http-methods">HTTP methods</a>; an API designer cares because networks fail mid-request. A phone on a train sends a request, enters a tunnel and never gets the answer. Did the server do it? With an idempotent method the client can simply <strong>send it again</strong>. With POST, the retry may create a duplicate task, or a second payment.</p>',
      '<table><caption>Retrying after a timeout</caption><thead><tr><th scope="col">Method</th><th scope="col">Safe</th><th scope="col">Idempotent</th><th scope="col">A retry…</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>GET</code></th><td>yes</td><td>yes</td><td>is harmless</td></tr>'
        + '<tr><th scope="row"><code>PUT</code></th><td>no</td><td>yes</td><td>sets the same full version again</td></tr>'
        + '<tr><th scope="row"><code>DELETE</code></th><td>no</td><td>yes</td><td>leaves it deleted (the retry may answer 404)</td></tr>'
        + '<tr><th scope="row"><code>PATCH</code></th><td>no</td><td>not guaranteed</td><td>is fine for "set a field to X", not for "add 1"</td></tr>'
        + '<tr><th scope="row"><code>POST</code></th><td>no</td><td>no</td><td>may create a duplicate, unless an idempotency key is used</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Idempotent is about the server\'s state,</strong> not the response: the second <code>DELETE /api/tasks/5</code> answers 404, but task 5 is gone either way.</li>'
        + '<li><strong>An idempotency key</strong> makes a POST safe to retry: the client invents a unique id per operation and sends it in a header (<code>Idempotency-Key: 9b2e…</code>); the server remembers the keys it has processed and answers a repeated key with the stored first response. Payment APIs work this way.</li>'
        + '<li><strong>Clients know it too:</strong> browsers ask "Confirm form resubmission?" before repeating a POST, and some HTTP libraries retry idempotent requests automatically but never POST.</li></ul>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'With the same key on both attempts, the retry gets the first answer instead of a duplicate.',
      desc: 'The app sends POST /api/tasks with an idempotency key. The server creates task 6, but the answer is lost in a tunnel. The app retries with the same key. The server recognises the key and answers 201 for task 6 again, without creating task 7.',
      nodes: [{ id: 'app', label: 'Phone app' }, { id: 'api', label: 'API', key: true }],
      edges: [
        ['app', 'api', 'POST + `Idempotency-Key`'],
        ['api', 'api', 'creates task 6'],
        ['api', 'app', '201, lost in a tunnel'],
        ['app', 'api', 'same POST, same key'],
        ['api', 'app', '201 for task 6 again'],
      ],
    },
    example: 'The train app sends `POST /api/tasks` with `{"title":"Buy tickets"}`, gets no answer and retries: without a key, the list now has two "Buy tickets". With `Idempotency-Key: 9b2e…` on both attempts, the server recognises the key and answers the same `201 Created` with `Location: /api/tasks/6`, without creating task 7.',
    mistake: '"DELETE is not idempotent, because the second call gets a 404 instead of a 204." Idempotence promises the same **effect on the server**, not the same status code. The response may differ; the state (the task is gone) does not.' },

  { id: 'put-vs-patch', hub: 'methods', topic: 'methods',
    title: 'PUT replaces, PATCH changes',
    summary: '**PUT** sends the **complete** new version of a resource and replaces it (fields left out go back to their defaults, or the request is rejected); **PATCH** sends **only the fields to change** and keeps all the others.',
    html: [
      '<p>Both update, but they mean opposite things for the fields you do not mention: PUT forgets them, PATCH keeps them. That one difference decides how you validate, and what happens when two people edit at once.</p>',
      '<table><caption>PUT vs PATCH</caption><thead><tr><th scope="col"></th><th scope="col"><code>PUT</code></th><th scope="col"><code>PATCH</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">The body</th><td>The complete item</td><td>Only the fields to change (a plain JSON object, formally a "merge patch")</td></tr>'
        + '<tr><th scope="row">Fields left out</th><td>Back to their defaults; a missing required one is a 400</td><td>Kept as they are</td></tr>'
        + '<tr><th scope="row">Validation</th><td>Full mode: every required field</td><td>Partial mode: only the fields present; a body with none is a 400</td></tr>'
        + '<tr><th scope="row">Idempotent</th><td>Yes</td><td>Not guaranteed</td></tr>'
        + '</tbody></table>',
      '<p>In both, the <strong>id comes from the path</strong> and an <code>id</code> in the body is ignored; both answer <strong>200</strong> with the resource as it is now. PATCH also avoids the <strong>lost update</strong>: when two people change different fields at the same time, two PATCHes both survive, while a PUT writes back the old values its sender still had.</p>',
    ],
    diagram: {
      kind: 'sequence',
      title: 'A PUT sends every field, so it overwrites a change it never saw.',
      desc: 'Leo sends PATCH with a new title. A second later Ana, whose screen still shows the old title, sends PUT with the old title and done true. The API stores Ana\'s complete version, so Leo\'s new title is lost.',
      nodes: [{ id: 'leo', label: 'Leo' }, { id: 'api', label: 'API', key: true }, { id: 'ana', label: 'Ana' }],
      edges: [
        ['leo', 'api', 'PATCH: a new title'],
        ['ana', 'api', 'PUT: old title, done'],
        ['api', 'api', 'Leo\'s title is lost'],
      ],
    },
    live: { kind: 'js', code: `const task = { id: 2, title: 'Add full CRUD', done: false, userId: 1 };
// what the client sent
const body = { done: true };

// PUT: build the whole new version from the body (+ defaults)
const afterPut = {
  id: task.id,
  title: body.title,
  // → undefined → a PUT without title must be a 400
  done: body.done ?? false,
  userId: body.userId ?? null,
};
console.log('PUT  ', afterPut);

// PATCH: keep everything, overwrite only the allowed fields that were sent
const afterPatch = { ...task };
for (const key of ['title', 'done', 'userId']) {
  if (key in body) afterPatch[key] = body[key];
}
console.log('PATCH', afterPatch);` },
    example: 'Task 2 is `{ "title": "Add full CRUD", "done": false, "userId": 1 }`. Leo renames it with `PATCH /api/tasks/2` and `{"title":"Add CRUD + tests"}`. A second later Ana, whose screen still shows the old title, ticks it with `PUT /api/tasks/2` and `{"title":"Add full CRUD","done":true,"userId":1}`: Leo\'s title is gone. Had Ana sent `PATCH` with `{"done":true}`, both changes would be kept.',
    mistake: 'Writing PUT as a merge, such as `Object.assign(task, req.body)`. That is PATCH behaviour (fields not sent are kept), so the API has no real PUT, and the body can also overwrite `id` or add fields you never meant to store. A PUT builds the new object from the allowed fields only.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Compare PUT and PATCH in the request builder' } },

  /* ---- 4. Status codes and errors --------------------------------------------------- */
  { id: 'status-success', hub: 'status', topic: 'status',
    title: 'Success codes: 200, 201 and 204',
    summary: 'A successful call answers **200 OK** with a body, **201 Created** with a `Location` header after something was created, or **204 No Content** when there is nothing to send back.',
    html: [
      '<p>The client learns what happened from the number before it reads a single byte of the body (the families and common codes are in <a href="#/http/web/common-status-codes">Common status codes</a>). An API makes the number precise: which success, and what comes with it.</p>',
      '<table><caption>Which success code</caption><thead><tr><th scope="col">Situation</th><th scope="col">Code</th><th scope="col">Body</th><th scope="col">Header to add</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>GET</code> a list or one item</th><td>200 OK</td><td>the data</td><td><code>X-Total-Count</code> for paged lists</td></tr>'
        + '<tr><th scope="row"><code>POST</code> created something</th><td>201 Created</td><td>the new resource</td><td><code>Location: /api/tasks/6</code></td></tr>'
        + '<tr><th scope="row"><code>PUT</code> / <code>PATCH</code> updated</th><td>200 OK</td><td>the resource as it is now</td><td></td></tr>'
        + '<tr><th scope="row"><code>DELETE</code> removed</th><td>204 No Content</td><td>none</td><td></td></tr>'
        + '<tr><th scope="row">List or search with no matches</th><td>200 OK</td><td><code>[]</code></td><td></td></tr>'
        + '</tbody></table>',
      '<dl><dt>201 Created</dt><dd>Goes with <code>Location</code>, the URL of the new resource (relative is fine). The body echoes it, including the fields the server set (<code>id</code>, <code>createdAt</code>), so the client needs no extra GET.</dd>'
        + '<dt>204 No Content</dt><dd>Has <strong>no body at all</strong>: Express drops one if you pass it, and <code>await res.json()</code> on a 204 throws "Unexpected end of JSON input".</dd></dl>',
    ],
    code: `res.json(books);
// → 200 is the default status
// created
res.status(201).location(\`/api/books/\${book.id}\`).json(book);
res.json(updatedBook);
// → 200 after PUT / PATCH
// deleted, no body
res.status(204).end();`,
    example: 'With curl (see [curl in five flags](#/server/routes/curl-basics)), `curl -i -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d \'{"title":"Study"}\'` prints `HTTP/1.1 201 Created` and `Location: /api/tasks/6` before the body: the client already knows everything; the JSON adds the `id` and `createdAt` the server chose.',
    mistake: 'Writing `res.status(204).json({ message: "Deleted" })` and expecting the client to show the message. A 204 never has a body: Express silently drops it. Either answer 204 with nothing, or 200 with a body.',
    practice: { href: '#/http/api-design/practice/status-chooser', label: 'Practise choosing status codes' } },

  { id: 'status-client-errors', hub: 'status', topic: 'status',
    title: 'Client errors: choosing the right 4xx',
    summary: 'A **4xx** code tells the caller that **its request** must change, and each code names a different problem: unreadable or invalid (400), no such resource (404), wrong method (405), a clash with stored data (409), a body in the wrong format (415), or readable data that breaks a rule (422, where an API uses it).',
    html: [
      '<p>A well-designed API walks the same checks in the same order for every request, and the <strong>first</strong> check that fails decides the code. The request builder shows this list after every request. Who you are and what you may do (401, 403) are checked first, in <a href="#/http/api-design/status-auth">401, 403 or 404</a>.</p>',
      '<table><caption>The 4xx codes of a REST API</caption><thead><tr><th scope="col">Code</th><th scope="col">Typical case</th><th scope="col">What the client must fix</th></tr></thead><tbody>'
        + '<tr><th scope="row">400 Bad Request</th><td>Malformed JSON; a missing <code>title</code> (if the API uses 400 for validation); <code>?limit=abc</code></td><td>The syntax or the values</td></tr>'
        + '<tr><th scope="row">404 Not Found</th><td><code>GET /api/tasks/999</code>; <code>/api/taks</code></td><td>The id or the path</td></tr>'
        + '<tr><th scope="row">405 Method Not Allowed</th><td><code>DELETE /api/tasks</code> (the whole collection)</td><td>Use a method from the <code>Allow</code> header</td></tr>'
        + '<tr><th scope="row">406 Not Acceptable</th><td><code>Accept: text/html</code> on a JSON-only API</td><td>The <code>Accept</code> header (the format it <em>asks for</em>)</td></tr>'
        + '<tr><th scope="row">409 Conflict</th><td>Fine on its own but clashes with stored data: an email already registered, deleting something other data points to</td><td>Different data, or change the state first</td></tr>'
        + '<tr><th scope="row">415 Unsupported Media Type</th><td>A JSON body sent without <code>Content-Type: application/json</code></td><td>The <code>Content-Type</code> header (the format it <em>sends</em>)</td></tr>'
        + '<tr><th scope="row">422 Unprocessable Content</th><td><code>{"title":""}</code> on an API that keeps 400 for parse errors</td><td>The values</td></tr>'
        + '</tbody></table>',
      '<dl><dt>400 or 422?</dt><dd>Many APIs, including the examples here, use 400 for both "cannot read it" and "the values break a rule". Others keep 422 for the second. Both are fine; follow the one your API documents, and never mix them.</dd>'
        + '<dt>404 or 405?</dt><dd>404: the path names nothing. 405: the path exists, but not with this method. Express answers 404 for an unmatched method unless you add a fallback, as in the code sample.</dd></dl>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'The first check that fails decides the code.',
      desc: 'Six checks in order. Is there a route for the path? If not, 404. Does it accept the method? If not, 405. Is the body in a readable format? If not, 415, or 400 if it cannot be parsed. Does the resource exist? If not, 404. Are the values valid? If not, 400 or 422. Does it clash with stored data? Then 409.',
      nodes: [
        { id: 'route', label: 'Route exists?', note: 'else 404' },
        { id: 'method', label: 'Method allowed?', note: 'else 405' },
        { id: 'format', label: 'Body readable?', note: 'else 415 / 400' },
        { id: 'exists', label: 'Resource exists?', note: 'else 404' },
        { id: 'valid', label: 'Values valid?', note: 'else 400 / 422', key: true },
        { id: 'clash', label: 'No clash?', note: 'else 409' },
      ],
      edges: [['route', 'method'], ['method', 'format'], ['format', 'exists'], ['exists', 'valid'], ['valid', 'clash']],
    },
    code: `// router.route(path) attaches several methods to one path; .all() catches the rest
router.route('/')
  .get(listBooks)
  .post(createBook)
  .all((req, res) => res.set('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed' }));`,
    example: 'Five versions of a sign-up, `POST /api/users`: with the body in plain text, **415**; with `{"name":"Iris",}` (a trailing comma), **400** (cannot parse); with `{"name":"","email":"nope"}`, **400** with two field errors (or 422 elsewhere); with a valid body but an email that already exists, **409**; sent as `PATCH /api/users`, **405** with `Allow: GET, POST`.',
    mistake: 'Answering **500** for bad input. If invalid data reaches code that assumes it is valid, `req.body.title.trim()` throws "Cannot read properties of undefined" and the error handler sends 500, telling the client the **server** failed. Validate first and answer 400: the caller made the mistake and can fix it.',
    widget: 'status-chooser' },

  { id: 'status-auth', hub: 'status', topic: 'status',
    title: '401, 403 or 404: who are you, and may you?',
    summary: '**401** means the server does not know who you are, **403** means it knows and you are not allowed, and some APIs answer **404** instead of 403 so as not to reveal that a resource exists.',
    html: [
      '<p>The checks run in this order, before the ones in <a href="#/http/api-design/status-client-errors">Client errors</a>. How identity and permissions work, and when to hide with 404, is taught in <a href="#/server/auth/authn-vs-authz">Authentication vs authorisation</a> and <a href="#/server/auth/ownership-checks">Ownership checks</a>; this card is only about which code an API sends.</p>',
      '<table><caption>Identity and permission codes</caption><thead><tr><th scope="col">Code</th><th scope="col">When</th><th scope="col">What the client does</th></tr></thead><tbody>'
        + '<tr><th scope="row">401 Unauthorized</th><td>No token, a malformed one or an expired one. Despite its name, it is about <em>identity</em>. It comes with <code>WWW-Authenticate: Bearer</code>.</td><td>Logs in (or refreshes the token) and tries again</td></tr>'
        + '<tr><th scope="row">403 Forbidden</th><td>A known identity that may not do this</td><td>Nothing: the same request will never work</td></tr>'
        + '<tr><th scope="row">404 Not Found</th><td>Another user\'s private resource: 403 would confirm that it exists</td><td>Treats it as missing</td></tr>'
        + '</tbody></table>',
    ],
    example: 'In the request builder, `POST /api/users` is for admins. With no `Authorization` header: **401** with `WWW-Authenticate: Bearer`. With `Authorization: Bearer nonsense`: **401** again (an unknown token is no identity). With `Authorization: Bearer student-token`: **403** ("you are a student"). With `Authorization: Bearer admin-token` and a valid body: **201**.',
    mistake: 'Sending 401 for "logged in but not allowed". The front end reacts to 401 by sending the user to the log-in page; they log in again, get 401 again, and loop forever. "Not allowed" is 403.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Try the tokens in the request builder' } },

  { id: 'error-body', hub: 'status', topic: 'status',
    title: 'One error shape, and when to use 500',
    summary: 'Every error answer should have the **right status code** and the **same JSON shape**, for example `{ "error": "message" }` plus an `errors` list of `{ field, message }` for validation, so a client handles every error with one piece of code; **500** is only for failures of the server itself.',
    html: [
      '<p><strong>Status first, body second.</strong> Monitoring tools, caches, retry logic and <code>fetch</code>\'s <code>res.ok</code> look only at the status code, so an answer of <code>200</code> with <code>{"error":"not found"}</code> counts as a success everywhere. The rule of thumb: if the caller did something wrong, 4xx; if your code did, 5xx.</p>',
      '<dl><dt><code>error</code></dt><dd>Always present: a short human-readable message, such as <code>"Task 99 not found"</code>.</dd>'
        + '<dt><code>errors</code></dt><dd>Added when there are per-field problems, listing <strong>all</strong> of them: <code>[ { "field": "title", "message": "title is required" } ]</code> (see <a href="#/http/api-design/validation">Validating input</a>).</dd></dl>',
      '<p>There is also a standard shape, "Problem Details" (RFC 9457, <code>Content-Type: application/problem+json</code>, with <code>type</code>, <code>title</code>, <code>status</code> and <code>detail</code>). Any shape works if every error uses it.</p>',
      '<p><strong>500 Internal Server Error</strong> means the server failed: an uncaught exception, a store that is down (<strong>503 Service Unavailable</strong> if it is temporary). One error handler, registered last (see <a href="#/server/routes/error-handler">The error handler</a>), turns every thrown error into the same JSON, logs the details on the server and never sends them to the client: a stack trace reveals how your code works. Errors in <code>async</code> handlers need care in Express 4 (see <a href="#/server/routes/express-async-errors">Async handlers</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The caller\'s mistakes are explained; the server\'s failures are only logged.',
      desc: 'An error becomes an answer in the same JSON shape. A 4xx error, the caller\'s mistake, sends its message and any field errors. A 5xx error, the server\'s failure, sends a generic message, while the details stay in the server log.',
      nodes: [
        { id: 'err', label: 'An error', note: 'same JSON shape', key: true },
        { id: 'c4', label: '4xx: the caller', note: 'message + field errors' },
        { id: 'c5', label: '5xx: the server', note: 'generic message, details logged' },
      ],
      edges: [['err', 'c4'], ['err', 'c5']],
    },
    code: `// app.js: the LAST middleware. Every error leaves in the same shape.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  // details stay in the server log
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    // field errors, when there are any
    ...(err.errors ? { errors: err.errors } : {}),
  });
});`,
    example: 'Because the shape never changes, the client needs one function: `const res = await fetch(url, options); if (!res.ok) { const { error, errors = [] } = await res.json(); errors.forEach((e) => showFieldError(e.field, e.message)); showBanner(error); }`. It works for a 400 with field errors, a 404 and a 500 alike.',
    mistake: 'Answering `res.status(200).json({ success: false, error: "Not found" })`. Every tool that reads status codes now records a success, and `res.ok` is `true` in the browser. Put the meaning in the status code (404) and keep the body for the details.' },

  /* ---- 5. The API contract ---------------------------------------------------------- */
  { id: 'json-conventions', hub: 'contract', topic: 'contract',
    title: 'JSON in, JSON out: Content-Type and Accept',
    summary: 'A JSON API reads a request body only when its `Content-Type: application/json` header says it is JSON, always answers with `Content-Type: application/json`, and can read the client\'s `Accept` header to see which formats it understands.',
    html: [
      '<p><code>Content-Type</code> labels whatever body travels, in either direction; <code>Accept</code> is the client saying which formats it can read (both were introduced in <a href="#/http/web/http-request">Inside an HTTP request</a>). In Express, <code>express.json()</code> parses a body <strong>only</strong> when the label says JSON; what <code>req.body</code> holds otherwise is in <a href="#/server/routes/body-parsing">express.json() and req.body</a>. On the way out, <code>res.json(value)</code> sets the header and turns the value into text (see <a href="#/browser/js/json">JSON</a>).</p>',
      '<h3>Conventions that make an API predictable</h3>',
      '<ul><li><strong>Keys in camelCase:</strong> <code>createdAt</code>, the JavaScript habit.</li>'
        + '<li><strong>Dates as ISO 8601 strings in UTC:</strong> <code>"2026-10-05T10:00:00.000Z"</code>, because JSON has no date type.</li>'
        + '<li><strong>Real booleans:</strong> <code>true</code>, never <code>"true"</code> or <code>"yes"</code>.</li>'
        + '<li><strong><code>null</code> for "no value",</strong> always the same way.</li>'
        + '<li><strong>A JSON object</strong> at the top level of a request body.</li>'
        + '<li><strong>Strict answers:</strong> <strong>415</strong> to a body that is not JSON, <strong>406</strong> when <code>Accept</code> rules JSON out. The request builder does both.</li></ul>',
      '<p>On the client, <code>fetch</code> does none of this for you: you set the header and call <code>JSON.stringify</code> yourself.</p>',
    ],
    live: { kind: 'js', code: `const book = { title: 'Dune', read: false, due: new Date(Date.UTC(2026, 9, 20)), notes: undefined };

// the Date becomes an ISO string; undefined disappears
console.log(JSON.stringify(book));
// what fetch sends if you forget JSON.stringify
console.log(String({ title: 'Dune' }));

const back = JSON.parse('{"title":"Dune","due":"2026-10-20T00:00:00.000Z"}');
// a string: JSON has no date type
console.log(typeof back.due);

try {
  // single quotes are not JSON
  JSON.parse("{'title':'Dune'}");
} catch (e) {
  console.log('400 material:', e.name);
}` },
    example: 'The right `fetch` call: `fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(book) })`. Leave out the header and an Express 4 API sees `req.body` as `{}`; leave out `JSON.stringify` and the body is the text `[object Object]`, which no JSON parser can read.',
    mistake: 'Debugging the validation code when the real problem is a missing `Content-Type` header. If the API says a field is missing that you can see in your request, check the header first: `curl -i` (or the request builder) shows exactly what was sent.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Send a body without Content-Type in the request builder' } },

  { id: 'dto', hub: 'contract', topic: 'contract',
    title: 'The API contract vs the stored record (DTOs)',
    summary: 'A **DTO** (Data Transfer Object) is the shape of the data your API sends and accepts. It is deliberately different from what the server stores: it leaves out secrets and internal fields, and uses the JSON naming convention.',
    html: [
      '<p>What the server stores is its own business; the DTO is the public <strong>contract</strong>. Keep them apart and you can rename a stored field, split a table or change the database while the JSON your clients receive stays identical: the mapping absorbs the change.</p>',
      '<dl><dt>Secrets</dt><dd><code>password_hash</code>: the stored, one-way scrambled form of a password (see <a href="#/server/auth/hash-not-encrypt">Hashing, not encryption</a>). It must never leave the server.</dd>'
        + '<dt>Internal fields</dt><dd>A <strong>soft-delete</strong> flag such as <code>is_deleted</code> (the record is kept but treated as gone), internal notes, references to other records.</dd>'
        + '<dt>Naming</dt><dd>Databases usually name fields in <strong>snake_case</strong> (<code>created_at</code>); JSON uses <strong>camelCase</strong> (<code>createdAt</code>). The mapping renames them (the SQL side is in <a href="#/database/relational/rows-to-json">From rows to JSON</a>).</dd></dl>',
      '<ul><li><strong>Map with an allow-list:</strong> copy the fields you want (<code>toUserDto(record)</code>), never delete the ones you remember. A field added tomorrow cannot leak by accident.</li>'
        + '<li><strong>The same on the way in:</strong> copy only the fields a client may set. Otherwise a sign-up body with <code>"role":"admin"</code> makes the caller an admin: <strong>mass assignment</strong>.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Only the fields on the allow-list reach the client.',
      desc: 'A stored user record holds id, email, role, created_at, password_hash and is_deleted. The toUserDto function copies only the allowed fields, renamed. The JSON sent holds id, email, role and createdAt.',
      nodes: [
        { id: 'row', label: 'Stored record', note: '+ `password_hash`, `is_deleted`' },
        { id: 'map', label: '`toUserDto()`', note: 'the allow-list', key: true },
        { id: 'json', label: 'JSON sent', note: 'id, email, role, createdAt' },
      ],
      edges: [['row', 'map'], ['map', 'json']],
    },
    live: { kind: 'js', code: `// One row as the database returns it
const row = { id: 2, email: 'leo@example.com', password_hash: '$2b$10$Qm1x…',
  role: 'student', created_at: '2026-09-02T08:00:00.000Z', is_deleted: false };

// ✗ Block-list: remove what you remembered to remove
const { password_hash, ...leaky } = row;
// is_deleted and created_at leak, and so will any new column
console.log(leaky);

// ✓ Allow-list: copy only the contract
const toUserDto = (r) => ({ id: r.id, email: r.email, role: r.role, createdAt: r.created_at });
console.log(toUserDto(row));` },
    example: 'In the request builder, the server state panel shows the stored user rows with `password_hash`, `created_at` and `is_deleted`. Send `GET /api/users`: every user comes back as `{ "id", "name", "email", "role", "createdAt" }`. Create a user with a password: the 201 body contains neither the password nor its hash.',
    mistake: 'Sending the record straight out, `res.json(user)`, or fixing it with `delete user.password_hash`. The first leaks the hash; the second is a block-list that forgets the next secret field (and, on a shared object, deletes the hash from your data too).',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Compare stored rows and responses in the request builder' } },

  /* ---- 6. Building and testing ------------------------------------------------------ */
  { id: 'crud-in-memory', hub: 'build', topic: 'build',
    title: 'CRUD with an in-memory array',
    summary: 'Before a database, an API can keep its data in a JavaScript **array** in memory: each handler finds the item by its id, answers **404** if it is missing, and changes the array in place, behind function names that a database layer can keep later.',
    html: [
      '<p>The array is a stand-in for a database table, and <code>nextId</code> is the counter that hands out ids: the <strong>server</strong> chooses every id, so two items can never share one and a client can never pick its own. The data lives only as long as the process: every restart (and <code>node --watch</code> restarts on every save) brings back the starting data, and two copies of the server would each have their own array. A real API later swaps the array for a database (see <a href="#/database/relational/models-layer">The models layer</a>) and keeps the function names, so the routes do not change.</p>',
      '<ol><li><strong>Turn the id into a number:</strong> route parameters are strings (see <a href="#/server/routes/route-params">Route parameters</a>), and <code>"2" === 2</code> is false.</li>'
        + '<li><strong>Find it:</strong> <code>find</code> when you only need the item, <code>findIndex</code> when you must replace or remove it.</li>'
        + '<li><strong>Missing? Return early:</strong> <code>return res.status(404).json(…)</code>. Without <code>return</code> the handler answers twice (see <a href="#/server/routes/one-response">Exactly one response per request</a>).</li>'
        + '<li><strong>Build new objects field by field</strong> from what the client may set.</li></ol>',
      '<p>Step 4 hides a bug in a popular shortcut, <code>{ id: nextId++, ...req.body }</code>: the spread comes <strong>after</strong> <code>id</code>, so a body with <code>"id": 1</code> overwrites the server\'s id, and any extra field (<code>"isAdmin": true</code>) is stored too.</p>',
    ],
    code: `let books = [{ id: 1, title: 'Dune', read: true }];
let nextId = 2;

function getBook(req, res) {
  const id = Number(req.params.id);
  // → "1" → 1
  const book = books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ error: \`Book \${id} not found\` });
  res.json(book);
}

function deleteBook(req, res) {
  const i = books.findIndex((b) => b.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Book not found' });
  books.splice(i, 1);
  res.status(204).end();
}`,
    live: { kind: 'js', code: `const books = [{ id: 1, title: 'Dune' }];
console.log(books.find((b) => b.id === '1'));
// → undefined: "1" is not 1
// found
console.log(books.find((b) => b.id === Number('1')));

let nextId = 2;
// what a client could send
const body = { id: 1, title: 'Hacked', isAdmin: true };
// ✗ the body overwrote the id
console.log({ id: nextId++, ...body });
// ✓ only the allowed fields
console.log({ id: nextId++, title: body.title });` },
    example: '`DELETE /api/books/7` when book 7 does not exist: `findIndex` returns `-1`, the handler answers 404 and returns. Without that check, `books.splice(-1, 1)` would silently remove the **last** book and answer 204: the wrong item deleted, and a success reported.',
    mistake: 'Forgetting `return` before an early answer: `if (!book) res.status(404).json(...)` followed by `res.json(book)`. The second call crashes with `ERR_HTTP_HEADERS_SENT`. Every early answer starts with `return`.' },

  { id: 'validation', hub: 'build', topic: 'build',
    title: 'Validating input: 400 with field errors',
    summary: '**Validation** checks every field of the request body (present, right type, right length or range, allowed value) **before** anything is stored, and rejects a bad request with **400** and a list of **all** the problems, each tied to its field.',
    html: [
      '<p>Everything that arrives over HTTP was written by someone else, maybe not by your form at all but by curl or a script. So it is checked once, at the boundary, and the rest of the program can trust it. Checks in the front end make a nicer experience; checks in the back end are for correctness and security.</p>',
      '<dl><dt>Required</dt><dd>Present, and not empty after <code>trim()</code>.</dd>'
        + '<dt>Type</dt><dd><code>typeof v === "string"</code>; <code>typeof v === "boolean"</code> (the string <code>"true"</code> is not a boolean); <code>Number.isInteger</code> for whole numbers.</dd>'
        + '<dt>Length or range</dt><dd>A title of at most 120 characters, a rating from 1 to 5.</dd>'
        + '<dt>Closed set</dt><dd><code>["easy", "medium", "hard"].includes(v)</code>.</dd>'
        + '<dt>Unknown fields and <code>id</code></dt><dd>Stripped and ignored.</dd></dl>',
      '<ul><li><strong>Two modes:</strong> full for POST and PUT (every required field must be there), partial for PATCH (only the fields present).</li>'
        + '<li><strong>Collect every error</strong> instead of stopping at the first, so the client shows all messages at once.</li>'
        + '<li><strong>A pure function</strong> (data in, <code>{ valid, errors }</code> out, no <code>req</code> or <code>res</code>) can be tested without Express. Schema libraries such as Zod do the same with less code (see <a href="#/server/auth/validation">Validation with a schema</a>).</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Bad input stops at the boundary; only clean data reaches the controller.',
      desc: 'A request body goes through the validator. If any field is wrong, the API answers 400 with every field error and stores nothing. If all fields are valid, the cleaned data, without unknown fields, goes on to the controller.',
      nodes: [
        { id: 'body', label: 'Request body' },
        { id: 'check', label: 'Validator', note: 'every field, every rule', key: true },
        { id: 'bad', label: '400', note: 'all field errors' },
        { id: 'ok', label: 'Controller', note: 'clean data only' },
      ],
      edges: [['body', 'check'], ['check', 'bad', 'any error'], ['check', 'ok', 'all valid']],
    },
    live: { kind: 'js', code: `function validateBook(body, { partial = false } = {}) {
  const errors = [];
  const has = (k) => body[k] !== undefined;
  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      errors.push({ field: 'title', message: 'title is required' });
    }
  }
  if (has('rating') && !(Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5)) {
    errors.push({ field: 'rating', message: 'rating must be a whole number from 1 to 5' });
  }
  return { valid: errors.length === 0, errors };
}

console.log(validateBook({ title: 'Dune', rating: 5 }));
// two errors, both reported
console.log(validateBook({ title: '   ', rating: '5' }));
// PATCH: title not needed
console.log(validateBook({ rating: 4 }, { partial: true }));` },
    example: '`POST /api/books` with `{"title":"   ","rating":"5"}` answers `400` with `{ "error": "Validation failed", "errors": [ { "field": "title", "message": "title is required" }, { "field": "rating", "message": "rating must be a whole number from 1 to 5" } ] }`, and the collection has the same length as before. The client shows each message under its input.',
    mistake: 'Checking only `if (!req.body.title)`. It accepts `"title": 123` and `"title": "   "`, says nothing about the other fields, and reports one problem at a time, so the user fixes, resubmits and gets the next error, again and again.' },

  { id: 'curl-testing', hub: 'build', topic: 'build',
    title: 'Testing by hand: curl, Postman, Thunder Client',
    summary: 'Testing an API by hand means sending each request yourself and reading the raw answer, status and headers included: with **curl** in a terminal, or with a GUI client such as Postman or Thunder Client that saves requests in collections.',
    html: [
      '<p>Check each route the moment you write it, before any front end exists. The curl flags themselves (<code>-i</code>, <code>-X</code>, <code>-H</code>, <code>-d</code>) are in <a href="#/server/routes/curl-basics">curl in five flags</a>; here are the habits that make hand testing tell the truth.</p>',
      '<ul><li><strong>Always <code>-i</code>:</strong> without it you see only the body, and a 201 looks like a 200.</li>'
        + '<li><strong>A JSON body needs its header:</strong> <code>-d</code> alone labels the body as a form, so add <code>-H "Content-Type: application/json"</code>.</li>'
        + '<li><strong>Quote URLs with <code>&amp;</code>:</strong> unquoted, the shell reads <code>&amp;</code> as "run in the background".</li>'
        + '<li><strong>Not sure what was sent?</strong> <code>-v</code> shows the request too.</li></ul>',
      '<h3>On Windows</h3>',
      '<dl><dt>Windows PowerShell 5.1</dt><dd><code>curl</code> is an alias for another command (<code>Invoke-WebRequest</code>): type <code>curl.exe</code>. Even single quotes are not enough for JSON there: <code>-d \'{\\"title\\":\\"Study\\"}\'</code>.</dd>'
        + '<dt><code>cmd.exe</code></dt><dd>Write <code>-d "{\\"title\\":\\"Study\\"}"</code>.</dd>'
        + '<dt>Any shell</dt><dd>Put the JSON in a file and send <code>-d @task.json</code> (in PowerShell, quote it: <code>"@task.json"</code>). The single-quoted JSON in the code sample works in Git Bash, macOS and Linux.</dd></dl>',
      '<p><strong>GUI clients</strong> (Postman, the Thunder Client extension for VS Code, Insomnia, or <code>.http</code> files with the REST Client extension) save requests in a <strong>collection</strong>, keep variables such as <code>{{baseUrl}}</code> and <code>{{token}}</code>, and can be shared. They still only check what you remember to click; <a href="#/http/api-design/automated-tests">automated tests</a> repeat everything on every change.</p>',
    ],
    code: `curl -i http://localhost:3000/api/tasks
curl -i "http://localhost:3000/api/tasks?done=false&sort=createdAt&order=desc"
curl -i -X POST http://localhost:3000/api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Study REST"}'
curl -i -X PATCH http://localhost:3000/api/tasks/2 \\
  -H "Content-Type: application/json" -d '{"done":true}'
curl -i -X DELETE http://localhost:3000/api/tasks/2
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me`,
    dialect: 'shell (Git Bash, macOS, Linux)',
    example: 'The POST in the code sample prints `HTTP/1.1 201 Created`, then headers including `Location: /api/tasks/6` and `Content-Type: application/json; charset=utf-8`, an empty line, and the JSON body. That is the whole contract of a create; without `-i` you would only see the JSON and could not tell 201 from 200.',
    mistake: 'Typing `curl -X POST ... -H "Content-Type: application/json"` in Windows PowerShell 5.1 and getting "Cannot bind parameter Headers": that is `Invoke-WebRequest` speaking, not curl. Use `curl.exe`, or Git Bash.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'See the curl command for any request in the request builder' } },

  { id: 'automated-tests', hub: 'build', topic: 'build',
    title: 'Automated API tests with supertest',
    summary: 'An automated API test sends a request to your Express app **inside the test process** with **supertest**, then checks the status code, the body and, for writes, the change in state; a test runner (**Jest**, or Node\'s built-in `node:test`) runs them all with `npm test`.',
    html: [
      '<p>A test suite replays every request you would check by hand, in a second, every time you change something. It catches <strong>regressions</strong>: things that used to work and broke while you changed something else.</p>',
      '<dl><dt>Test runner</dt><dd>Finds the test files, runs them and reports what passed (Jest: <code>npm test</code> runs <code>jest</code>).</dd>'
        + '<dt>Test</dt><dd>One case: <code>test("…", async () =&gt; { … })</code>; <code>describe</code> groups several.</dd>'
        + '<dt>Assertion</dt><dd>Checks one fact and fails the test if it is false: <code>expect(res.status).toBe(201)</code>. <code>toBe</code> compares with <code>===</code>, <code>toEqual</code> compares contents, <code>toMatchObject</code> checks the body contains <strong>at least</strong> the listed fields (ideal when the server adds an <code>id</code>). With <code>node:test</code>: <code>assert.equal(res.status, 201)</code>.</dd>'
        + '<dt>supertest</dt><dd><code>request(app).post("/api/books").send({ title: "Dune" })</code> sends the request and resolves to the response (<code>res.status</code>, <code>res.headers.location</code>, <code>res.body</code>). <code>.send(object)</code> sets the JSON header; <code>.set("Authorization", "Bearer …")</code> adds any header. It needs the app exported without listening: an <code>app.js</code> that calls <code>app.listen()</code> opens a real port in every test file (see <a href="#/server/routes/app-server-split">app.js builds, server.js starts</a>).</dd></dl>',
      '<ul><li><strong>Assert four things:</strong> the status, the important headers (<code>Location</code>), the body shape and, for writes, the state change: after a create a GET finds it; after a delete a GET gives 404; after a rejected POST the list has the same length.</li>'
        + '<li><strong>Keep tests independent:</strong> the in-memory array survives from one test to the next, so reset the store before each test (<code>beforeEach</code>) or let each test create the data it needs.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'No port, no browser: the request goes straight into the app.',
      desc: 'A test file calls supertest, which sends the request to the Express app running inside the test process, with no real port. The response comes back to the test, whose assertions check the status, headers, body and state.',
      nodes: [
        { id: 'test', label: 'Test file' },
        { id: 'st', label: 'supertest', key: true },
        { id: 'app', label: 'Your app', note: 'in memory, no port' },
        { id: 'assert', label: 'Assertions', note: 'status, headers, body' },
      ],
      edges: [['test', 'st'], ['st', 'app', 'request'], ['app', 'assert', 'response']],
    },
    code: `// tests/books.test.js (Jest + supertest)
const request = require('supertest');
// the app, NOT server.js
const app = require('../src/app');

test('POST /api/books → 201 with Location and a server id', async () => {
  const res = await request(app).post('/api/books').send({ title: 'Dune' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ title: 'Dune' });
  expect(res.headers.location).toBe(\`/api/books/\${res.body.id}\`);
});

test('POST without a title → 400, and nothing is added', async () => {
  const before = await request(app).get('/api/books');
  const res = await request(app).post('/api/books').send({});
  expect(res.status).toBe(400);
  const after = await request(app).get('/api/books');
  expect(after.body.length).toBe(before.body.length);
});`,
    example: 'Run `npm test` and Jest prints one line per test, ✓ or ✕. A failure shows `Expected: 201, Received: 200`: the create handler is missing `res.status(201)`. You fix one line, run again, and every other route is checked again for free.',
    mistake: 'Tests that depend on each other. The first test creates book 2, and the second assumes the list has two books: run the second alone, or in another order, and it fails although the API is fine. Reset the store in `beforeEach`, so every test starts from the same data.' },

  /* ---- 7. Documenting and other API styles --------------------------------------- */
  { id: 'openapi', hub: 'beyond', topic: 'beyond',
    title: 'Documenting the API: OpenAPI',
    summary: 'An **OpenAPI** document (formerly called Swagger) describes every endpoint of an API in one YAML or JSON file: paths, methods, parameters, request and response bodies and status codes, in a form that people and programs can both read.',
    html: [
      '<p>One file, three readers: people read it to learn the API, tools check requests against it, and generators build code from it. It is usually written in <strong>YAML</strong>, a text format for the same kind of data as JSON that uses indentation instead of braces, <code>key: value</code> pairs and <code>-</code> for list items.</p>',
      '<dl><dt><code>info</code></dt><dd>Title and version.</dd>'
        + '<dt><code>paths</code></dt><dd>Each path, then each method, with its <code>parameters</code>, <code>requestBody</code> and <code>responses</code> per status code.</dd>'
        + '<dt><code>components.schemas</code></dt><dd>The shapes of your DTOs, written once and referenced with <code>$ref</code>.</dd></dl>',
      '<ul><li><strong>Keep it in the repository</strong> and change it in the <strong>same commit</strong> as the code, or it stops being true within a week.</li>'
        + '<li><strong>The minimum for a small project:</strong> an endpoint table in the README (method, path, query parameters, success status, error statuses, an example request and response). An <code>openapi.yaml</code> holds the same facts.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Written once, the spec feeds people, tools and generators.',
      desc: 'One openapi.yaml file feeds Swagger UI, an interactive documentation page; a code generator that builds a client library (an SDK); and a validator that rejects requests that do not match the spec.',
      nodes: [
        { id: 'spec', label: '`openapi.yaml`', key: true },
        { id: 'ui', label: 'Swagger UI', note: 'docs with "Try it out"' },
        { id: 'sdk', label: 'SDK generator', note: 'a ready-made client' },
        { id: 'val', label: 'Validator', note: 'rejects bad requests' },
      ],
      edges: [['spec', 'ui'], ['spec', 'sdk'], ['spec', 'val']],
    },
    code: `openapi: 3.0.3
info: { title: Books API, version: 1.0.0 }
paths:
  /api/books:
    post:
      summary: Add a book
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/NewBook' }
      responses:
        '201':
          description: Created. Location holds the URL of the new book.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Book' }
        '400': { description: Validation failed (error + errors list) }
  /api/books/{id}:
    get:
      parameters:
        - { in: path, name: id, required: true, schema: { type: integer } }
      responses:
        '200': { description: OK }
        '404': { description: No book with that id }
components:
  schemas:
    NewBook:
      type: object
      required: [title]
      properties:
        title: { type: string, minLength: 1, maxLength: 120 }
        read: { type: boolean, default: false }
    Book:
      allOf:
        - $ref: '#/components/schemas/NewBook'
        - properties:
            id: { type: integer }
            createdAt: { type: string, format: date-time }`,
    dialect: 'YAML',
    example: 'A front-end developer asks: "what do I get if the title is missing?" With the spec they open `/api/books` → `post` → `responses` and see `400`, "Validation failed (error + errors list)", plus the `NewBook` schema saying that `title` is required and at most 120 characters long. In Express, the `swagger-ui-express` package serves the same file as a page at `/docs`.',
    mistake: 'Writing the documentation at the end and never touching it again. Documentation that disagrees with the API is worse than none, because people trust it. Update the spec, or the README table, in the same commit as each change to a route.' },

  { id: 'rest-vs-graphql', hub: 'beyond', topic: 'beyond',
    title: 'REST, GraphQL and other API styles',
    summary: '**GraphQL** is an alternative to REST in which the client sends a typed **query** to one endpoint (`/graphql`) and gets exactly the fields it asked for; REST has many URLs, each with a fixed response shape.',
    html: [
      '<p>Everything in this section builds REST APIs, and REST is the default most projects start with. GraphQL is worth recognising because it answers two REST annoyances, at a price.</p>',
      '<table><caption>REST vs GraphQL</caption><thead><tr><th scope="col"></th><th scope="col">REST</th><th scope="col">GraphQL</th></tr></thead><tbody>'
        + '<tr><th scope="row">Endpoints</th><td>Many URLs, one per resource</td><td>One URL, usually <code>POST /graphql</code></td></tr>'
        + '<tr><th scope="row">Response shape</th><td>Fixed per endpoint: the list screen gets every field (<strong>over-fetching</strong>)</td><td>Exactly the fields asked for</td></tr>'
        + '<tr><th scope="row">One screen, several resources</th><td>Several requests in a row (<strong>under-fetching</strong>)</td><td>One query, one round trip</td></tr>'
        + '<tr><th scope="row">Describing the API</th><td>OpenAPI, optional</td><td>A typed <strong>schema</strong>, required</td></tr>'
        + '<tr><th scope="row">Caching</th><td>By URL, for free</td><td>Not by URL: everything goes to one</td></tr>'
        + '<tr><th scope="row">Errors</th><td>The status code says what happened</td><td>Usually <strong>200 OK</strong> with an <code>errors</code> array in the body</td></tr>'
        + '</tbody></table>',
      '<p>One more cost: a query that asks for nested data can make the server run one lookup for the list plus one per item (the <strong>N+1 problem</strong>). GraphQL is a query language for an <strong>API</strong>, not a database: the server still runs functions (resolvers) that read the data.</p>',
      '<dl><dt>gRPC</dt><dd>Compact binary messages over HTTP/2 with typed contracts: fast calls between a company\'s own back-end services.</dd>'
        + '<dt>WebSockets</dt><dd>One connection that stays open, where both sides can send: chat, live notifications, games.</dd>'
        + '<dt>Webhooks</dt><dd>The server calls <strong>your</strong> URL when something happens: "tell me when the payment is completed".</dd></dl>',
    ],
    code: `# One request: POST /graphql
query {
  user(id: 2) {
    name
    tasks(done: false) { title }
  }
}

# The answer (status 200 OK, even when part of it failed)
{ "data": { "user": { "name": "Leo Martín",
    "tasks": [ { "title": "Return the right status codes" } ] } } }`,
    dialect: 'GraphQL',
    example: 'A dashboard shows a user\'s name and the titles of their unfinished tasks. REST: `GET /api/users/2` and `GET /api/users/2/tasks?done=false`, two requests, each returning all fields. GraphQL: the single query in the code sample, returning only `name` and `title`. For a simple client (one list, one resource) the REST version is simpler, and the browser can cache it.',
    mistake: 'Thinking GraphQL is a database, or "REST but newer". It is a different way to shape an API, with its own costs; most projects start with REST and add GraphQL only where flexible queries pay off.' },
];

DATA.en.REST_QUIZ = [
  /* what REST is */
  { type: 'mc', topic: 'rest',
    q: 'In REST, what is a **representation**?',
    choices: ['The database row where a resource is stored', 'The resource written in an agreed format (usually JSON) and sent over HTTP', 'The URL of a resource', 'The HTTP method used on a resource'],
    answer: 1,
    why: 'Clients never touch the stored resource; they exchange descriptions of it, such as `{"id":7,"title":"Study"}`.' },
  { type: 'tf', topic: 'rest',
    q: 'An API is RESTful as long as it answers in JSON.',
    answer: false,
    why: 'REST is about resources at URLs and a uniform interface (methods and status codes with fixed meanings). `POST /api/doEverything?action=delete` can answer JSON and still break every rule.' },
  { type: 'mc', topic: 'rest',
    q: 'What does the **uniform interface** constraint give the users of an API?',
    choices: ['Every endpoint returns the same JSON', 'Every resource is stored in the same table', 'Methods and status codes mean the same thing on every resource, so one endpoint teaches you the others', 'All requests go to one URL'],
    answer: 2,
    why: 'If `DELETE /api/users/3` works, `DELETE /api/tasks/7` works the same way, with the same codes.' },
  { type: 'mc', topic: 'rest',
    q: 'Which design breaks **statelessness**?',
    choices: ['The server stores tasks in a database', 'The client sends `Authorization: Bearer <token>` with every request', 'The page number travels as `?page=3`', 'After `POST /api/login` the server saves the user in a global variable and uses it for later requests'],
    answer: 3,
    why: 'Per-client conversation state inside the server process is what statelessness forbids. Data in a database is resource state and is fine.' },
  { type: 'fib', topic: 'rest',
    q: 'Because a stateless API keeps no per-client memory, you can run several copies behind a load ___ and any copy can answer any request.',
    accept: ['balancer'],
    why: 'A load balancer spreads requests over the copies; statelessness is what makes that safe.' },
  { type: 'mc', topic: 'beyond',
    q: 'Which is a real drawback of GraphQL compared with REST?',
    choices: ['It cannot return nested data', 'Errors usually come back as 200 OK, and caching by URL stops working', 'It only works with SQL databases', 'Clients cannot choose which fields they get'],
    answer: 1,
    why: 'One endpoint, usually POST, with errors in the body: tools that rely on URLs and status codes lose information.' },

  /* designing URLs */
  { type: 'mc', topic: 'urls',
    q: 'Which URL design is RESTful for reading task 7?',
    choices: ['`GET /api/getTask?id=7`', '`GET /api/task/7`', '`GET /api/tasks/7`', '`POST /api/tasks/read/7`'],
    answer: 2,
    why: 'A plural noun for the collection, the id in the path, and the verb in the method.' },
  { type: 'mc', topic: 'urls',
    q: 'Which request is the RESTful way to mark task 4 as done?',
    choices: ['`POST /api/tasks/4/markDone`', '`PATCH /api/tasks/4` with `{"done":true}`', '`GET /api/tasks/4?done=true`', '`PUT /api/markDone` with `{"id":4}`'],
    answer: 1,
    why: 'An action on one field is an update of the item. GET must never change data.' },
  { type: 'mc', topic: 'urls',
    q: 'Where should a **filter** such as "only unfinished tasks" go?',
    choices: ['In the query string: `/api/tasks?done=false`', 'In a new path: `/api/unfinished-tasks`', 'In a request header', 'In the body of a GET request'],
    answer: 0,
    why: 'Same resource, different view: options go in the query string, where they can be combined and omitted.' },
  { type: 'tf', topic: 'urls',
    q: 'A search that matches nothing should answer 404 Not Found.',
    answer: false,
    why: 'The collection exists; an empty result is a valid answer: 200 with `[]`.' },
  { type: 'mc', topic: 'urls',
    q: 'In Express, `GET /api/tasks?done=false` arrives. What is `req.query.done`, and what does `if (req.query.done)` do?',
    choices: ['The boolean `false`; the condition is false', 'The string `"false"`; the condition is true', '`undefined`; the condition is false', 'The number 0; the condition is false'],
    answer: 1,
    why: 'Query values are strings, and a non-empty string is truthy. Compare with `=== "true"` instead.' },
  { type: 'fib', topic: 'urls',
    q: 'With `?page=3&limit=10`, the matching offset (number of items to skip) is ___.',
    accept: ['20'],
    why: 'offset = (page − 1) × limit = 2 × 10 = 20, so page 3 shows items 21–30.' },
  { type: 'mc', topic: 'urls',
    q: 'Which change to version 1 of an API is **non-breaking**?',
    choices: ['Renaming `name` to `title`', 'Making the optional field `dueDate` required', 'Adding a new optional field `priority` to responses', 'Changing `done` from `true`/`false` to `"yes"`/`"no"`'],
    answer: 2,
    why: 'Old clients ignore a field they do not know. Renames, type changes and new requirements break them and need a new version.' },
  { type: 'tf', topic: 'urls',
    q: '`/api/users/2/tasks` and `/api/tasks?userId=2` can return the same items; nesting fits when the parent is part of the identity, a filter when it is one criterion among others.',
    answer: true,
    why: 'Both are valid designs; nesting reads as "belongs to", filters combine freely (`?userId=2&done=false`).' },

  /* methods and CRUD */
  { type: 'mc', topic: 'methods',
    q: 'Which request creates a new task?',
    choices: ['`PUT /api/tasks`', '`POST /api/tasks`', '`POST /api/tasks/6`', '`PATCH /api/tasks`'],
    answer: 1,
    why: 'Create = POST on the **collection**; the server picks the id and returns it in `Location`.' },
  { type: 'mc', topic: 'methods',
    q: 'Which methods are **idempotent**?',
    choices: ['GET, PUT and DELETE', 'Only GET', 'POST and PATCH', 'All five'],
    answer: 0,
    why: 'Sending them twice leaves the server in the same state as sending them once. POST is not; PATCH is not guaranteed.' },
  { type: 'tf', topic: 'methods',
    q: 'Because the second `DELETE /api/tasks/5` answers 404 while the first answered 204, DELETE is not idempotent.',
    answer: false,
    why: 'Idempotence is about the **state** of the server (task 5 is gone either way), not about getting the same status code.' },
  { type: 'mc', topic: 'methods',
    q: 'A mobile app retries a `POST /api/payments` after a timeout. What lets the server avoid charging twice?',
    choices: ['Switching to GET', 'An `Idempotency-Key` header with the same unique value on both attempts', 'A longer timeout', 'Answering 204 instead of 201'],
    answer: 1,
    why: 'The server remembers processed keys and returns the stored first response when a key repeats.' },
  { type: 'mc', topic: 'methods',
    q: 'Task 3 is `{"title":"Read","done":false,"userId":2}`. After `PUT /api/tasks/3` with `{"title":"Read","done":true}`, on an API where missing optional fields take their defaults, what is `userId`?',
    choices: ['2, because PUT keeps fields you do not send', '`null`, the default: PUT replaces the whole resource', 'The request fails with 404', '`true`'],
    answer: 1,
    why: 'PUT sends the complete new version. With PATCH, `userId` would have stayed 2.' },
  { type: 'fib', topic: 'methods',
    q: 'Two people edit different fields of the same item; the second full replacement overwrites the first person\'s change. This is called a lost ___.',
    accept: ['update'],
    why: 'PATCH avoids it by sending only the fields each person changed.' },
  { type: 'mc', topic: 'methods',
    q: 'Which implementation is a correct **PUT** handler body for a task with fields `title`, `done`, `userId`?',
    choices: ['`Object.assign(task, req.body)`', '`tasks[i] = { ...tasks[i], ...req.body }`', '`tasks[i] = { id: tasks[i].id, title: body.title, done: body.done ?? false, userId: body.userId ?? null }` after validating', '`tasks[i] = req.body`'],
    answer: 2,
    why: 'A PUT builds the whole new object from allowed fields and keeps the id from the path. The first two are merges (PATCH behaviour, and the body can overwrite `id`); the last stores whatever arrives.' },

  /* status codes and errors */
  { type: 'mc', topic: 'status',
    q: 'A `POST /api/tasks` succeeds. What should the response contain?',
    choices: ['200 and an empty body', '201, a `Location` header with the new URL, and usually the created task', '204 and the created task in the body', '302 redirecting to `/api/tasks`'],
    answer: 1,
    why: '201 says a resource was created; `Location` says where; echoing the body saves a GET.' },
  { type: 'tf', topic: 'status',
    q: '`res.status(204).json({ message: "Deleted" })` sends the message to the client.',
    answer: false,
    why: 'A 204 never has a body; Express drops it. Use 204 with nothing, or 200 with a body.' },
  { type: 'mc', topic: 'status',
    q: '`DELETE /api/tasks` (the whole collection) is not supported by the API. Which answer is most precise?',
    choices: ['404 Not Found', '400 Bad Request', '405 Method Not Allowed with `Allow: GET, POST`', '500 Internal Server Error'],
    answer: 2,
    why: 'The path exists, only the method is wrong. 404 would claim the path does not exist.' },
  { type: 'mc', topic: 'status',
    q: 'A client sends a JSON body with `Content-Type: text/plain`. A strict JSON API answers…',
    choices: ['415 Unsupported Media Type', '406 Not Acceptable', '404 Not Found', '201 Created, ignoring the header'],
    answer: 0,
    why: '415 is about the format of the body you **send**; 406 is about the format you **ask for** in `Accept`.' },
  { type: 'mc', topic: 'status',
    q: 'Signing up with an email that is already registered should return…',
    choices: ['400, because the body is malformed', '409 Conflict', '404 Not Found', '500, because the database refused it'],
    answer: 1,
    why: 'The body is well formed and valid on its own; it clashes with the stored data. The same request with another email would succeed.' },
  { type: 'mc', topic: 'status',
    q: 'A request has a valid token for user Leo, who is a student, and tries an admin-only action. Which code?',
    choices: ['401 Unauthorized', '403 Forbidden', '400 Bad Request', '409 Conflict'],
    answer: 1,
    why: 'The server knows who it is (authenticated) but the action is not allowed (authorisation): 403. 401 means "I do not know who you are".' },
  { type: 'tf', topic: 'status',
    q: 'Answering 404 instead of 403 for another user\'s private task avoids revealing that the task exists.',
    answer: true,
    why: 'A 403 confirms the id exists; a script could map other users\' data by trying ids.' },
  { type: 'mc', topic: 'status',
    q: 'Why is `200 OK` with `{"error":"Task not found"}` a bug?',
    choices: ['JSON bodies cannot contain the word "error"', 'Status-reading tools, caches and `res.ok` all treat it as a success', 'Express refuses to send it', 'It is fine if the front end reads the body'],
    answer: 1,
    why: 'The status code is the first thing every client and tool reads; the meaning belongs there (404).' },
  { type: 'tf', topic: 'status',
    q: 'In Express 4, an error thrown inside an `async` route handler automatically reaches the error-handling middleware.',
    answer: false,
    why: 'Express 4 does not catch rejected promises: use `try/catch` and `next(err)`. Express 5 forwards them automatically.' },

  /* the API contract */
  { type: 'mc', topic: 'contract',
    q: 'A curl POST to an Express 4 API sends `-d \'{"title":"Study"}\'` but no `Content-Type` header. What does the handler see?',
    choices: ['`req.body.title === "Study"`', '`req.body` is `{}`, so validation says the title is missing', 'Express answers 415 automatically', 'The request never reaches Express'],
    answer: 1,
    why: '`express.json()` only parses bodies labelled `application/json`; otherwise Express 4 leaves `req.body` as `{}`.' },
  { type: 'mc', topic: 'contract',
    q: 'How should a date travel in a JSON body?',
    choices: ['As a JavaScript `Date` object', 'As an ISO 8601 string such as `"2026-10-05T10:00:00.000Z"`', 'As `"05/10/2026"`', 'Dates cannot be sent in JSON'],
    answer: 1,
    why: 'JSON has no date type; ISO 8601 in UTC is unambiguous and is what `JSON.stringify` produces for a Date.' },
  { type: 'mc', topic: 'contract',
    q: 'What is a DTO in an API?',
    choices: ['A database table', 'The shape of the data the API sends and accepts, mapped from the stored row', 'A test file', 'A type of HTTP header'],
    answer: 1,
    why: 'Data Transfer Object: the public contract. It hides secrets and internal columns and renames fields.' },
  { type: 'mc', topic: 'contract',
    q: 'Why write the DTO mapping as an **allow-list** (copy chosen fields) instead of deleting secret fields?',
    choices: ['It is faster', 'A column added to the table later cannot leak by accident', 'JSON requires it', 'It makes ids strings'],
    answer: 1,
    why: 'A block-list only protects against the secrets you remembered; an allow-list sends nothing you did not choose.' },
  { type: 'tf', topic: 'contract',
    q: 'A sign-up handler that stores `{ ...req.body }` lets a client make itself an admin by sending `"role":"admin"`.',
    answer: true,
    why: 'That is mass assignment: copy only the fields a client may set.' },
  { type: 'mc', topic: 'beyond',
    q: 'What is an OpenAPI document?',
    choices: ['A JavaScript library for building routes', 'A YAML or JSON file that describes every endpoint, its parameters, bodies and status codes', 'A browser extension for testing APIs', 'A database schema'],
    answer: 1,
    why: 'Tools turn it into interactive docs (Swagger UI), client SDKs and request validators.' },
  { type: 'fib', topic: 'beyond',
    q: 'In an OpenAPI document, a reusable shape such as `NewBook` is written once under `components.___` and referenced elsewhere with `$ref`.',
    accept: ['schemas'],
    why: '`components.schemas` holds the shapes of your DTOs; paths point at them with `$ref: \'#/components/schemas/NewBook\'`, so each shape is described once.' },
  { type: 'tf', topic: 'beyond',
    q: 'A GraphQL API usually answers `200 OK` even when part of a query failed, and lists the problems in an `errors` array in the body.',
    answer: true,
    why: 'That is a real difference from REST, where the status code itself says what happened. Tools that only read status codes count such an answer as a success.' },
  { type: 'fib', topic: 'contract',
    q: 'Database columns are often in snake_case (`created_at`); in the JSON of the API the same field is usually written in ___Case (`createdAt`).',
    accept: ['camel', 'camelcase'],
    why: 'camelCase is the JavaScript convention; the DTO renames the field.' },

  /* building and testing */
  { type: 'mc', topic: 'build',
    q: 'Why does `tasks.find((t) => t.id === req.params.id)` never find anything?',
    choices: ['`find` does not work on arrays of objects', '`req.params.id` is a string and the ids are numbers', 'The router strips the id', 'Ids must be compared with `==` in Express'],
    answer: 1,
    why: 'Route parameters are always strings: convert with `Number(req.params.id)`.' },
  { type: 'mc', topic: 'build',
    q: 'What is wrong with `const task = { id: nextId++, ...req.body };`?',
    choices: ['Nothing', 'The spread comes after `id`, so a body with `"id"` overwrites it, and unknown fields are stored', 'Spread syntax does not work in Node', '`nextId++` returns the next id plus one'],
    answer: 1,
    why: 'Later properties win. Build the object from the allowed fields only, and let the server set the id.' },
  { type: 'mc', topic: 'build',
    q: 'A handler has `if (!book) res.status(404).json({ error: "Not found" });` followed by `res.json(book);`. What happens for a missing book?',
    choices: ['It answers 404 correctly', 'It answers 200 with `null`', 'It sends the 404, then crashes with "Cannot set headers after they are sent"', 'It answers 500 before anything else'],
    answer: 2,
    why: 'Without `return`, the function continues and tries to answer twice.' },
  { type: 'tf', topic: 'build',
    q: 'A validator should stop at the first error so the client is not overwhelmed.',
    answer: false,
    why: 'Report every problem at once, each with its field, so the form can show all messages together.' },
  { type: 'mc', topic: 'build',
    q: 'Which curl flag prints the status line and the response headers?',
    choices: ['`-d`', '`-X`', '`-i`', '`-H`'],
    answer: 2,
    why: '`-i` = include headers. `-X` sets the method, `-H` adds a request header, `-d` sends a body.' },
  { type: 'mc', topic: 'build',
    q: 'In Windows PowerShell 5.1, `curl -X POST …` fails with an error about parameters. Why?',
    choices: ['curl cannot send POST requests', 'There `curl` is an alias for `Invoke-WebRequest`; use `curl.exe`', 'PowerShell needs `sudo`', 'The API is down'],
    answer: 1,
    why: 'The alias has different options. `curl.exe` (or Git Bash) runs the real curl.' },
  { type: 'mc', topic: 'build',
    q: 'Why must `app.js` export the app without calling `app.listen()`?',
    choices: ['Express forbids it', 'So supertest can import the app and drive it in-process without opening a fixed port', 'So the app runs faster', 'Because `listen` only works in production'],
    answer: 1,
    why: 'Tests import `app`; only `server.js` listens. Otherwise tests clash on the port and never finish.' },
  { type: 'fib', topic: 'build',
    q: 'In Jest, the matcher that checks a body contains **at least** the given fields (ignoring extra ones like `id`) is `to___Object`.',
    accept: ['match', 'matchobject', 'tomatchobject'],
    why: '`toMatchObject({ title: "Study" })` passes even though the body also has `id` and `createdAt`.' },
];

/* status-chooser: one API situation each; the reader picks a code. `wrong` explains every
   other choice; `trap` is the tempting wrong answer, explained again after a correct pick. */
DATA.en.REST_STATUS_SCENARIOS = [
  { id: 'created', title: 'A new task',
    text: 'A client creates a task with a valid body. The server stores it as task 6.',
    request: 'POST /api/tasks\nContent-Type: application/json\n\n{ "title": "Study REST" }',
    choices: [200, 201, 204, 202], answer: 201, trap: 200,
    why: '**201 Created**: a new resource exists now. Send `Location: /api/tasks/6` and, usually, the task in the body.',
    wrong: {
      200: '200 says "it worked" but not that something new was **created**; the client also loses the `Location` header convention.',
      204: '204 means "nothing to send back", but the client needs the new id: answer 201 with the task in the body.',
      202: '202 Accepted means "queued, not done yet". The task was stored right away, so the work is finished.',
    } },
  { id: 'deleted', title: 'Delete a task',
    text: 'A client deletes task 7, which exists. The API has nothing useful to send back.',
    request: 'DELETE /api/tasks/7',
    choices: [200, 204, 404, 410], answer: 204, trap: 200,
    why: '**204 No Content**: success, and the response has no body at all.',
    wrong: {
      200: '200 is allowed if you send a body, but here there is nothing to return; the usual convention for a delete is 204.',
      404: 'Task 7 exists, so it was found and removed. 404 is what a **second** delete of task 7 gets.',
      410: '410 Gone is a rare code for "this URL used to exist and will never come back". The delete itself succeeded: 2xx.',
    } },
  { id: 'patched', title: 'Tick a task as done',
    text: 'A client changes one field of task 2 and the server answers with the task as it is now.',
    request: 'PATCH /api/tasks/2\nContent-Type: application/json\n\n{ "done": true }',
    choices: [200, 201, 204, 409], answer: 200, trap: 201,
    why: '**200 OK** with the updated task in the body.',
    wrong: {
      201: 'Nothing new was created; an existing resource changed. 201 is only for creates.',
      204: '204 would be right if the server sent no body, but here it returns the updated task, so 200.',
      409: 'Nothing conflicts: the task exists and `done: true` is a valid value.',
    } },
  { id: 'unknown-id', title: 'A task that is not there',
    text: 'A client asks for task 999. The highest id ever used is 6.',
    request: 'GET /api/tasks/999',
    choices: [400, 404, 500, 200], answer: 404, trap: 500,
    why: '**404 Not Found**: the path pattern is right, but no resource has that id.',
    wrong: {
      400: 'The request is perfectly well formed (999 is a valid id format); the resource just does not exist.',
      500: 'Nothing failed on the server. A missing resource is the client asking for something that is not there.',
      200: '200 with `null` or `{"error":…}` hides the failure from every tool that reads status codes.',
    } },
  { id: 'no-method', title: 'Delete everything?',
    text: 'A client tries to delete the whole collection. The API supports only GET and POST on that path.',
    request: 'DELETE /api/tasks',
    choices: [404, 405, 403, 400], answer: 405, trap: 404,
    why: '**405 Method Not Allowed**, with the header `Allow: GET, POST`.',
    wrong: {
      404: '404 would say the path does not exist, but `/api/tasks` exists: only the method is unsupported.',
      403: '403 is about **who** you are. Nobody, not even an admin, can DELETE this path: the method itself is not supported.',
      400: '400 is vague here; 405 tells the client exactly what is wrong and, with `Allow`, what would work.',
    } },
  { id: 'bad-json', title: 'A trailing comma',
    text: 'The body cannot be parsed: it has a trailing comma.',
    request: 'POST /api/tasks\nContent-Type: application/json\n\n{ "title": "Study", }',
    choices: [400, 422, 415, 500], answer: 400, trap: 422,
    why: '**400 Bad Request**: the server cannot even read the fields. Every convention agrees on this one.',
    wrong: {
      422: '422 means "I could read it, but the values break a rule". This body cannot be read at all.',
      415: 'The `Content-Type` is right (JSON); the content is just broken JSON. 415 is for a body in a format the API does not accept.',
      500: 'The server did not fail; the client sent invalid JSON. `express.json()` turns this into a 400 error for you.',
    } },
  { id: 'course-validation', title: 'Missing title (API that uses 400)',
    text: 'This API\'s documentation says: "400 for any invalid request, with a field-level `errors` list". A POST arrives without the required title. The JSON itself is fine.',
    request: 'POST /api/tasks\nContent-Type: application/json\n\n{ "done": false }',
    choices: [400, 422, 404, 409], answer: 400, trap: 422,
    why: '**400 Bad Request** with a field-level `errors` list: this API uses 400 for failed validation.',
    wrong: {
      422: 'Many APIs would send 422 here, and it is a fine convention, but this contract says 400. Follow the API\'s documented convention.',
      404: 'The URL is right; the problem is in the body.',
      409: 'Nothing clashes with stored data; the body is simply incomplete.',
    } },
  { id: 'doc-422', title: 'Empty title (API that uses 422)',
    text: 'This API\'s documentation says: "400 = the body cannot be parsed; 422 = parsed, but a value breaks a rule". The body parses, but the title is empty.',
    request: 'POST /api/tasks\nContent-Type: application/json\n\n{ "title": "" }',
    choices: [400, 422, 200, 415], answer: 422, trap: 400,
    why: '**422 Unprocessable Content**: by this API\'s convention, readable but invalid data is 422.',
    wrong: {
      400: 'On this API 400 is reserved for bodies that cannot be parsed. This one parses; a value breaks a rule.',
      200: 'Storing a task with an empty title would let invalid data in. Reject it.',
      415: 'The body is JSON with the right `Content-Type`; only a value is wrong.',
    } },
  { id: 'duplicate', title: 'An email that is taken',
    text: 'An admin creates a user with a valid body, but the email address is already registered and emails must be unique.',
    request: 'POST /api/users\nAuthorization: Bearer admin-token\nContent-Type: application/json\n\n{ "name": "Ana", "email": "ana@example.com", "password": "longpassword" }',
    choices: [409, 400, 422, 403], answer: 409, trap: 400,
    why: '**409 Conflict**: the request is fine on its own but clashes with the current state of the server.',
    wrong: {
      400: 'Nothing is wrong with the format or the values; the same body with another email would succeed. The problem is the stored data.',
      422: 'The values pass every rule; it is the clash with an existing user that fails.',
      403: 'The caller is an admin and may create users; this is not about permission.',
    } },
  { id: 'wrong-type', title: 'Plain text body',
    text: 'A client sends a body that looks like JSON, but labels it as plain text.',
    request: 'POST /api/tasks\nContent-Type: text/plain\n\n{"title":"Study"}',
    choices: [415, 406, 400, 201], answer: 415, trap: 406,
    why: '**415 Unsupported Media Type**: the API only accepts bodies labelled `application/json`.',
    wrong: {
      406: '406 is about the `Accept` header (the format the client wants **back**). Here the problem is the format of the body sent.',
      400: 'Some APIs would, but 415 tells the client exactly what to fix: the `Content-Type` header.',
      201: 'Guessing the format of a body is how bugs and security holes start. The client must label it correctly.',
    } },
  { id: 'accept', title: 'Asking for HTML',
    text: 'A JSON-only API receives a request whose only `Accept` value is `text/html`.',
    request: 'GET /api/tasks\nAccept: text/html',
    choices: [406, 415, 404, 200], answer: 406, trap: 415,
    why: '**406 Not Acceptable**: the API cannot produce any format the client accepts. (Many APIs simply answer JSON anyway; a strict one says 406.)',
    wrong: {
      415: '415 is about the body the client **sends**. This GET sends no body; it asks for an answer in a format the API does not produce.',
      404: 'The resource exists; only the requested format is unavailable.',
      200: 'Sending JSON to a client that said it only reads HTML is what a lenient API does, but the precise answer is 406.',
    } },
  { id: 'no-token', title: 'No token',
    text: 'A protected route receives a request with no `Authorization` header at all.',
    request: 'GET /api/me',
    choices: [401, 403, 404, 400], answer: 401, trap: 403,
    why: '**401 Unauthorized** (really "unauthenticated"), with `WWW-Authenticate: Bearer`: the server does not know who you are.',
    wrong: {
      403: '403 means "I know who you are and you may not". Without a token the server does not know who you are yet.',
      404: '`/api/me` exists; it just needs an identity.',
      400: 'The request is well formed; it lacks credentials, which has its own code.',
    } },
  { id: 'expired', title: 'An expired token',
    text: 'The `Authorization: Bearer …` token was valid yesterday but has expired.',
    request: 'GET /api/me\nAuthorization: Bearer eyJhbGciOi…(expired)',
    choices: [401, 403, 400, 500], answer: 401, trap: 403,
    why: '**401**: an expired token proves nothing, so the caller is unauthenticated. The client should log in again (or refresh the token).',
    wrong: {
      403: '403 would tell the client "logging in again will not help", which is wrong: a fresh token fixes this.',
      400: 'The header is well formed; the credentials are just no longer valid.',
      500: 'Nothing failed on the server; it correctly refused an expired credential.',
    } },
  { id: 'role', title: 'A student deletes a user',
    text: 'A valid token for a student (not an admin) is used on an admin-only route.',
    request: 'DELETE /api/users/3\nAuthorization: Bearer student-token',
    choices: [403, 401, 404, 405], answer: 403, trap: 401,
    why: '**403 Forbidden**: identity known, action not allowed. Repeating it with the same account will never work.',
    wrong: {
      401: 'The server knows exactly who this is. 401 would send the student to log in again, in a loop.',
      404: 'User 3 exists and its existence is not secret here; the issue is permission.',
      405: 'DELETE is supported on this path (for admins); the method is fine.',
    } },
  { id: 'hide', title: 'Someone else\'s private task',
    text: 'Leo, logged in, requests task 42, which belongs to Ana. Policy: users must not be able to discover which task ids exist for other users.',
    request: 'GET /api/tasks/42\nAuthorization: Bearer <Leo\'s token>',
    choices: [404, 403, 401, 200], answer: 404, trap: 403,
    why: '**404 Not Found**: from Leo\'s point of view, there is no task 42. Answering 403 would confirm that it exists.',
    wrong: {
      403: '403 is honest but leaks information: a script could try every id and learn which ones exist. The policy rules that out.',
      401: 'Leo is authenticated; his token is valid.',
      200: 'Sending Ana\'s private task to Leo is a data leak.',
    } },
  { id: 'crash', title: 'A bug in the handler',
    text: 'A typo in the handler (`task.titel.trim()`) throws a TypeError for every request to this route.',
    request: 'GET /api/tasks/3',
    choices: [500, 400, 404, 503], answer: 500, trap: 400,
    why: '**500 Internal Server Error**: the server\'s own code failed. The error handler logs the details and sends a generic message.',
    wrong: {
      400: 'The request is fine; the same request will work once the code is fixed. 4xx would wrongly blame the client.',
      404: 'Task 3 exists; the code crashed before it could answer.',
      503: '503 is for a server that is temporarily unavailable (overloaded, in maintenance); this is a bug that will not go away by waiting.',
    } },
  { id: 'empty-page', title: 'Past the last page',
    text: 'There are 5 tasks. A client asks for page 9 with 10 tasks per page.',
    request: 'GET /api/tasks?page=9&limit=10',
    choices: [200, 404, 204, 400], answer: 200, trap: 404,
    why: '**200 OK** with an empty array `[]` (and `X-Total-Count: 5`, if you send it): the collection exists, this window of it is empty.',
    wrong: {
      404: 'The collection `/api/tasks` exists. "No items on this page" is an answer, not a missing resource.',
      204: 'A client reading a list expects an array; `[]` is clearer than no body at all.',
      400: 'page=9 is a well-formed value; it is just beyond the end. (A **malformed** value like `page=abc` would be 400.)',
    } },
  { id: 'bad-limit', title: 'A malformed query value',
    text: 'This API documents its policy: "unknown query parameters are ignored; malformed values are rejected".',
    request: 'GET /api/tasks?limit=abc',
    choices: [400, 200, 404, 422], answer: 400, trap: 200,
    why: '**400 Bad Request** with `{ "errors": [ { "field": "limit", "message": "limit must be an integer, 1 or more" } ] }`.',
    wrong: {
      200: 'Silently ignoring a malformed value is the policy for **unknown names** here, not for bad values. The documented policy says reject.',
      404: 'The resource exists; the query value is the problem.',
      422: '422 is for a request body that breaks a rule on APIs that use it; this API documents 400 for bad query values.',
    } },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.REST_VIDEOS = [
  {
    "id": "rest-endpoints",
    "group": "methods",
    "title": "One resource, six endpoints",
    "mp4": "assets/video/rest-endpoints/rest-endpoints.mp4",
    "poster": "assets/video/rest-endpoints/rest-endpoints-poster.jpg",
    "captions": "assets/video/rest-endpoints/rest-endpoints.vtt",
    "duration": "2:55",
    "chapters": [
      {
        "t": 8.5,
        "title": "Verbs in the address"
      },
      {
        "t": 32.7,
        "title": "List the tasks"
      },
      {
        "t": 46.8,
        "title": "Create a task"
      },
      {
        "t": 62.5,
        "title": "Read it"
      },
      {
        "t": 75.8,
        "title": "Change one field"
      },
      {
        "t": 95.2,
        "title": "Delete it"
      },
      {
        "t": 116.4,
        "title": "Send it twice"
      },
      {
        "t": 147.6,
        "title": "The endpoint map"
      }
    ],
    "transcript": [
      "One resource, six endpoints. The address names the thing. The method says what to do to it.",
      "A task list needs create, delete, update. So the beginner writes /createTask, and /deleteTask?id=6. Every action gets its own address, and every API invents different ones. REST turns it round: one address per thing, and the HTTP method is the action.",
      "Our thing is tasks. A GET request to /api/tasks lists them. 200: five tasks. One plural noun for the collection. Never a verb.",
      "To add one, POST to the same address, with a title in the body: Study REST. 201 Created. The Location header gives the new address: /api/tasks/6.",
      "That address is the task. A GET to it answers 200, with the task. A GET changes nothing, so asking twice is harmless. That's what safe means.",
      "To tick it off, send a PATCH to the same address, with only the field that changes: done: true. 200 again. Every other field stays as it was. A PUT would replace the whole task, so it has to send every field. A PATCH changes just one.",
      "DELETE the same address. 204 No Content. Nothing to send back. Ask for it once more. 404. The address never changed. Only the task is gone. The client knew what happened from the number alone, before it read a single byte of body.",
      "Now a train enters a tunnel, and the answer is lost. Did the server act? The app can only send it again. Send DELETE twice: the second answers 404, but the state is identical. The task is gone either way. Same for PUT. Send POST twice, and there's a duplicate: task 7. The cure is an Idempotency-Key header. Same key on the retry, and the server repeats its first answer.",
      "Look at what the story wrote. One address for the collection, one for the item, and a method and a status for each line. Add PUT, which replaces the whole task, and that's the full set of six. Nouns in the address. Verbs in the method. The story in the status code.",
      "Practise it with the API request builder in Designing APIs."
    ]
  }
];
// </topic-videos>
