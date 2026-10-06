'use strict';
/* Designing APIs: concept cards, rail groups, self-check quiz and the status-chooser scenarios
   (REST over HTTP as the main style, Express 4 for code samples). See site/README.md for the
   data contract. Builds on the HTTP cards of "How the web works" (request/response anatomy,
   methods, status families, JSON, statelessness) without repeating them.
   `hub` and `topic` keys match REST_QUIZ_TOPICS and REST_GROUPS. */

DATA.en.REST_QUIZ_TOPICS = {
  rest: 'What REST is',
  urls: 'Designing URLs',
  methods: 'Methods and CRUD',
  status: 'Status codes and errors',
  contract: 'The API contract',
  build: 'Building and testing',
};

DATA.en.REST_GROUPS = [
  { key: 'rest', label: 'What REST is', icon: 'why' },
  { key: 'urls', label: 'Designing URLs', icon: 'link' },
  { key: 'methods', label: 'Methods and CRUD', icon: 'arrow' },
  { key: 'status', label: 'Status codes and errors', icon: 'table' },
  { key: 'contract', label: 'The API contract', icon: 'doc' },
  { key: 'build', label: 'Building and testing', icon: 'code' },
];

DATA.en.REST_CONCEPTS = [
  /* ---- 1. What REST is ----------------------------------------------------------------- */
  { id: 'rest-what', hub: 'rest', topic: 'rest', 
    title: 'What REST is',
    summary: '**REST** (Representational State Transfer) is a style of designing HTTP APIs: the server exposes **resources** at URLs, and clients read and change them by exchanging **representations** (usually JSON) through the same few HTTP methods, with every request standing on its own.',
    body: [
      'Think of a well-run library. Every book has a fixed shelf mark, and the same small set of actions works on any book: look at it, add a new one, replace it, correct a detail, remove it. Nobody needs a special procedure per book. REST applies that idea to an API: every **thing** the API knows about (one task, the list of all tasks, the tasks of one user) has its own URL, and the same HTTP methods mean the same thing on all of them. Once you have used one endpoint, you can guess the others.',
      'The name has three parts. A **resource** is anything the API lets you name with a URL: one task (`/api/tasks/7`), the collection of tasks (`/api/tasks`). A **representation** is what actually travels: not the task itself (a row in a database) but a description of it in an agreed format, usually JSON: `{"id":7,"title":"Study","done":false}`. **State transfer**: the client learns the current state of a resource by receiving a representation (GET) and changes it by sending one (POST, PUT, PATCH).',
      'REST is a list of **constraints** (rules), defined by Roy Fielding in 2000, not a library or a protocol. The four that shape everyday API design: **client-server** (front end and back end are separate programs that only talk over HTTP), a **uniform interface** (methods, status codes and headers mean the same thing on every resource), **stateless** requests (next card) and **cacheable** responses (a GET answer may be reused). An API that follows them is called **RESTful**.',
      'There is nothing to install. Express does not "do REST": it lets you write any route at all. REST is the set of design decisions you make while writing those routes, which is why two Express APIs can be very RESTful or not at all.',
    ],
    table: {
      caption: 'REST vocabulary',
      head: ['Term', 'Meaning', 'Example'],
      rows: [
        ['Resource', 'A thing the API lets you name', 'a task, a user, a list of tasks'],
        ['Collection', 'The resource that contains many items', '`/api/tasks`'],
        ['Item (member)', 'One resource inside a collection', '`/api/tasks/7`'],
        ['Representation', 'The resource written in a format, sent over HTTP', '`{"id":7,"title":"Study","done":false}`'],
        ['Endpoint', 'One method + path pair your API supports', '`DELETE /api/tasks/:id`'],
        ['Uniform interface', 'The same methods and codes mean the same everywhere', '`DELETE` always removes, `404` always means "not there"'],
      ],
    },
    example: 'The same features designed twice. Action style: `POST /getTask` with `{"id":7}`, `POST /markTaskDone?id=7`, `POST /removeTask?id=7`. REST style: `GET /api/tasks/7`, `PATCH /api/tasks/7` with `{"done":true}`, `DELETE /api/tasks/7`. In the REST version a newcomer who has seen `GET /api/users/3` correctly guesses `DELETE /api/users/3`; in the action version they must read the documentation for every single call.',
    mistake: 'Believing an API is RESTful because it answers JSON. `POST /api/doEverything?action=delete&id=7` answers JSON and breaks every REST rule: the URL names an action, the method is meaningless and the status code tells you nothing. REST is about resources and a uniform interface, not about the format (a REST API could answer XML).',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Explore a RESTful API in the request builder' } },

  { id: 'statelessness', hub: 'rest', topic: 'rest', 
    title: 'Stateless requests',
    summary: 'In a **stateless** API each request carries everything the server needs to handle it (who is calling, which resource, which options); the server keeps no memory of earlier requests from that client.',
    body: [
      'Picture a call centre where you never get the same agent twice. It works because you quote your customer number and your question **every time**: any agent can help you, and an agent going home loses nothing. A stateless server is that call centre: any copy of the server can answer any request, because nothing about "this conversation" is stored inside one copy.',
      'Stateless does **not** mean "the server remembers nothing". The tasks in the database are **resource state**: they are the whole point of the API and of course they persist. What the server must not keep in its own memory is **conversation state** about one client: "this client is logged in", "this client was looking at page 2", "this client chose the filter done=false". That information travels with each request instead: a token in the `Authorization` header, `?page=2&done=false` in the URL.',
      'HTTP itself is stateless (see the card **HTTP and HTTPS** in How the web works). REST asks you not to undo that in your design. The pay-off: you can run ten copies of the API behind a **load balancer** (a server that spreads requests over the copies), restart a copy without logging anybody out, and test each request on its own. The cost: every request is a bit bigger and the server checks the identity again each time. The section Authentication and security shows the two usual answers: a session id looked up in a database, or a signed token (JWT) the server can verify without storing anything.',
    ],
    code: `// ✗ Stateful: the server keeps "who is logged in" in its own memory
let currentUser = null;
app.post('/api/login', (req, res) => {
  currentUser = req.body.email;            // shared by EVERY client of this process
  res.sendStatus(204);
});
app.get('/api/my-books', (req, res) => {
  res.json(books.filter((b) => b.owner === currentUser));
});

// ✓ Stateless: every request says who it comes from
app.get('/api/my-books', requireToken, (req, res) => {
  res.json(books.filter((b) => b.owner === req.user.email));   // req.user set from the token
});`,
    example: 'With the stateful code above, Ana logs in, then Leo logs in: `currentUser` is now Leo, and Ana\'s next `GET /api/my-books` returns **Leo\'s** books. Run two copies of the server and it gets worse: Ana logged in on copy A, her next request lands on copy B, where `currentUser` is `null`. In the stateless version each request carries `Authorization: Bearer <token>`, so it does not matter which copy answers or who logged in last.',
    mistake: 'Thinking "stateless" forbids a database, or forbids remembering a logged-in user. The data lives in the database (resource state), and being logged in is remembered by the **client**, which sends its token with every request. Only per-client memory **inside the server process** is ruled out.' },

  { id: 'rest-vs-graphql', hub: 'rest', topic: 'rest', 
    title: 'REST, GraphQL and other API styles',
    summary: '**GraphQL** is an alternative to REST in which the client sends a typed **query** to one endpoint (`/graphql`) and gets exactly the fields it asked for; REST has many URLs, each with a fixed response shape. It is worth recognising; REST is what the examples here build.',
    body: [
      'REST is a shop with one counter per product: each URL hands you a fixed package. GraphQL is a single counter with an order form: you write down exactly which items and which details you want, and the package is built to order.',
      'That solves two REST annoyances. **Over-fetching**: the list screen only needs titles, but `GET /api/tasks` sends every field of every task. **Under-fetching**: one screen needs several requests in a row (`GET /api/users/2`, then `GET /api/users/2/tasks`). A GraphQL query can ask for the user and their task titles in one round trip, and a **schema** (a typed description of every field) documents what can be asked.',
      'The costs are real. Everything goes to one URL, usually with POST, so HTTP caching by URL no longer works. Errors usually come back as **200 OK** with an `errors` array in the body, the opposite of the REST rule "the status code tells you what happened". And a query that asks for nested data can make the server run one database query for the list plus one per item (the **N+1 problem**).',
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
    table: {
      caption: 'Other API styles (context only)',
      head: ['Style', 'How it talks', 'Good for'],
      rows: [
        ['REST', 'HTTP methods on resource URLs, usually JSON', 'The default: simple, cacheable, every tool understands it'],
        ['GraphQL', 'Typed queries to one HTTP endpoint', 'Screens that need data from many resources at once'],
        ['gRPC', 'Compact binary messages over HTTP/2, typed contracts', 'Fast calls between a company\'s own back-end services'],
        ['WebSockets', 'One connection that stays open, both sides can send', 'Chat, live notifications, multiplayer games'],
        ['Webhooks', 'The server calls **your** URL when something happens', '"Tell me when the payment is completed"'],
      ],
    },
    example: 'A dashboard shows a user\'s name and the titles of their unfinished tasks. REST: `GET /api/users/2` and `GET /api/users/2/tasks?done=false`, two requests, each returning all fields. GraphQL: the single query above, returning only `name` and `title`. For a simple client (one list, one resource) the REST version is simpler and the browser can cache it.',
    mistake: 'Thinking GraphQL is a database or "REST but newer". GraphQL is a query language for an **API**: the server still runs functions (resolvers) that read the database. Most projects start with REST and add GraphQL only where flexible queries pay off.' },

  /* ---- 2. Designing URLs ------------------------------------------------------------- */
  { id: 'resource-naming', hub: 'urls', topic: 'urls', 
    title: 'Naming resources: nouns, plurals, ids and nesting',
    summary: 'A RESTful URL names a **thing**, never an action: a plural noun for the collection (`/api/tasks`), the collection plus an id for one item (`/api/tasks/7`), and a nested path when a resource lives inside another (`/api/users/2/tasks`).',
    body: [
      'Read a URL like a folder path in a filing cabinet: the drawer `tasks`, the folder `7`. Nobody labels a drawer "open-the-drawer": the action is what you do with it, and in HTTP the action is the **method**. So the URL holds nouns and the method holds the verb.',
      'Use one **plural** noun per resource and keep it for both levels: `/api/tasks` (the collection) and `/api/tasks/7` (an item in it), never `/api/task/7`. The **id goes in the path**, because it identifies the resource; the query string is for options (next card). Write paths in lower case with hyphens between words (`/api/study-groups`): paths are case-sensitive, and `/api/Tasks` is a different URL. The `/api` prefix keeps the API apart from the pages the same Express app may serve (for example a front end in `public/`).',
      '**Nesting** expresses "belongs to": `/api/users/2/tasks` is the collection of user 2\'s tasks, and `POST /api/users/2/tasks` creates a task for user 2. Keep it to one level: `/api/users/2/tasks/7/comments/3` is hard to build and to read; once an item has its own id, give it its own top-level path (`/api/comments/3`). A filter often gives the same items: `/api/tasks?userId=2`. Nest when the parent is part of the identity; filter when it is one criterion among others that can be combined (`?userId=2&done=false`).',
      'Actions that are not plain CRUD usually become a **field** or a **resource**: "mark as done" is `PATCH /api/tasks/7` with `{"done":true}`; "log in" can be "create a session", `POST /api/sessions`. Real APIs make a few pragmatic exceptions such as `POST /api/auth/login`; keep them rare and obvious.',
    ],
    table: {
      caption: 'From action URLs to resource URLs',
      head: ['Instead of', 'Write', 'Why'],
      rows: [
        ['`GET /api/getAllTasks`', '`GET /api/tasks`', 'The method already says "get"'],
        ['`POST /api/createTask`', '`POST /api/tasks`', 'Create = POST on the collection'],
        ['`GET /api/task/7`', '`GET /api/tasks/7`', 'One plural noun for collection and items'],
        ['`GET /api/tasks?id=7`', '`GET /api/tasks/7`', 'Identity belongs in the path'],
        ['`POST /api/tasks/7/delete`', '`DELETE /api/tasks/7`', 'The method is the action'],
        ['`PUT /api/tasks/7/markDone`', '`PATCH /api/tasks/7` + `{"done":true}`', 'Changing a field is an update'],
        ['`GET /api/tasksOfUser?user=2`', '`GET /api/users/2/tasks` or `GET /api/tasks?userId=2`', 'Nesting or a filter, not a new name'],
      ],
    },
    example: 'A book club API: `GET /api/books` (all books), `GET /api/books/12` (one book), `POST /api/books` (add one), `GET /api/books/12/reviews` (the reviews of book 12), `POST /api/books/12/reviews` (review book 12), `DELETE /api/reviews/88` (one review, by its own id). Six endpoints, two nouns, and every method means what it always means.',
    mistake: 'Adding a verb "because it is clearer", e.g. `GET /api/books/search`. It reads well, but now `/api/books/search` collides with `/api/books/:id` (Express may take `search` as an id) and clients must memorise one more name. A search is a filter on the collection: `GET /api/books?search=dune`.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Try a verb in a URL in the request builder' } },

  { id: 'query-params', hub: 'urls', topic: 'urls', 
    title: 'Filters, sorting and pagination: the query string',
    summary: 'The path says **which resource**; the **query string** says **which part of it, in what order and how much**: filters (`?done=false`), search (`?search=css`), sorting (`?sort=createdAt&order=desc`) and pagination (`?page=2&limit=10`).',
    body: [
      'The path is the shelf; the query string is the note you hand the librarian: "only the unread ones, newest first, ten at a time". It is still the same resource, just a different view of it, so it gets no new path. Options can be combined in any order and left out, which is exactly what `key=value&key=value` pairs are good at.',
      'Filter on the **server**. The collection may hold thousands of rows; sending all of them so the browser can throw most away wastes bandwidth and can expose data the user should not see. **Pagination** returns a fixed-size window: `?page=2&limit=10` (items 11–20) or, in offset style, `?offset=10&limit=10` (skip 10, take 10). The two are the same window: offset = (page − 1) × limit. Always sort by something stable (an id, a date) or the boundaries between pages shift, and **clamp** the limit (for example at most 100), because someone will try `?limit=1000000`.',
      'The client also needs to know how many items there are in total. Two designs: an **envelope** body, `{ "items": [ … ], "page": 2, "limit": 10, "total": 57 }` (a common pagination design), or a plain **array** body with the numbers in headers, `X-Total-Count: 57` and `Link: </api/tasks?page=3&limit=10>; rel="next"`. The request builder uses the headers design, which keeps `GET /api/tasks` returning an array, so clients and tests written for the plain list keep working. Choose one and document it.',
      'Decide a **policy** for bad parameters: unknown names (`?colour=red`) are usually ignored, malformed values (`?limit=abc`, `?done=maybe`) rejected with **400** and one error per parameter. Never let them crash the server, and never answer **404** for "no matches": an empty list is a valid answer, `200` with `[]`.',
    ],
    live: { kind: 'js', code: `// req.query in Express holds the same thing: every value is a STRING
const params = new URLSearchParams('done=false&page=2&limit=500&tag=a&tag=b');

console.log(params.get('done'), typeof params.get('done'));
console.log(Boolean(params.get('done')));      // the string "false" is truthy!
console.log(params.get('done') === 'true');     // the right test

const page = Math.max(1, Number(params.get('page')) || 1);
const limit = Math.min(100, Number(params.get('limit')) || 20);   // clamped
console.log({ page, limit, offset: (page - 1) * limit });

console.log(params.get('tag'), params.getAll('tag'));   // repeated keys` },
    example: 'With five tasks of which 2, 3 and 4 are unfinished, `GET /api/tasks?done=false&sort=createdAt&order=desc&limit=2` returns `200` with tasks 4 and 3 (the two newest unfinished ones) and `X-Total-Count: 3`, so the client knows a second page exists. `GET /api/tasks?done=false&page=5&limit=2` returns `200` with `[]`: the page is past the end, not "not found".',
    mistake: 'Writing `if (req.query.done) list = list.filter((t) => t.done)`. Query values are strings, and `"false"` is a non-empty string, so `?done=false` returns the **finished** tasks. Compare with the string: `req.query.done === "true"`, and reject anything that is neither `"true"` nor `"false"`.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Filter, sort and paginate in the request builder' } },

  { id: 'versioning', hub: 'urls', topic: 'urls', 
    title: 'Versioning: changing an API without breaking its clients',
    summary: 'A **version** in the URL (`/api/v1/tasks`) or in a header lets you publish an incompatible change as a new version while existing clients keep using the old one.',
    body: [
      'An API is a promise to programs you do not control: a mobile app installed on phones that will not update for months, a partner\'s script, your classmate\'s front end. Think of a textbook: typo fixes go into reprints, but a rewritten chapter is a **second edition**, and the first edition stays valid for whoever owns it.',
      'Sort every change into one of two kinds. **Non-breaking** (old clients keep working): adding a new endpoint, a new optional query parameter or a new field in a response. **Breaking** (old clients fail): renaming or removing a field, changing a type (`done` from a boolean to `"yes"`/`"no"`), making an optional field required, changing a URL or the status code of a case. Only breaking changes need a new version.',
      'The most common place for the version is the start of the path: `/api/v1/tasks`, mounted in Express with `app.use("/api/v1/tasks", tasksRouterV1)`. It is visible, easy to test with curl and easy to route. Some APIs put it in a header instead (`Accept: application/vnd.example.v2+json`), which keeps URLs clean but is harder to try in a browser. When a v2 ships, v1 is announced as **deprecated** (still working, scheduled to be switched off) for a while.',
      'An API with a single client, your own page, can skip the version prefix. The DTO mapping (card **The API contract vs the database row**) is what lets you change the database without ever needing a new API version.',
    ],
    example: 'Version 1 returns `{ "id": 7, "name": "Study" }` and you want the field to be called `title`. A breaking rename would crash every client that reads `task.name`. Instead: in v1, send **both** `name` and `title` (adding is non-breaking); publish `/api/v2/tasks` with only `title`; mark v1 deprecated; switch it off once the clients have moved.',
    mistake: 'Renaming a field "to tidy up" inside the same version, or creating a new version for every small addition (`/v1` … `/v14`). Additions need no version; only breaking changes do.' },

  /* ---- 3. Methods and CRUD ----------------------------------------------------------- */
  { id: 'crud-mapping', hub: 'methods', topic: 'methods', 
    title: 'CRUD on HTTP: the routes of a resource',
    summary: '**CRUD** (Create, Read, Update, Delete) names the four things almost every API does to its data; REST maps them onto HTTP methods applied to two URLs per resource, the **collection** and the **item**.',
    body: [
      'Each resource gets two addresses. The **collection** (`/api/tasks`) is like a drawer: you can look at everything in it or put something new in it. The **item** (`/api/tasks/7`) is like one folder: you can read it, replace it, change part of it or throw it away. A method plus a path is an **endpoint**, and a resource normally has these six.',
      'The four operations give more than four endpoints because two of them have two flavours: **Read** is "list the collection" or "read one item", and **Update** is "replace the whole item" (PUT) or "change some fields" (PATCH). A basic CRUD API has five endpoints (list, read one, create, replace, delete); most real APIs add PATCH as a sixth.',
      'The method also decides the success status: reads answer **200**, a create answers **201 Created** with a `Location` header, updates answer **200** with the new version, a delete answers **204 No Content**. Sending a method an endpoint does not support (for example `DELETE /api/tasks`, deleting the whole collection) gets **405 Method Not Allowed**.',
    ],
    table: {
      caption: 'The endpoints of a resource',
      head: ['CRUD', 'Method + path', 'Request body', 'Success', 'Typical failures'],
      rows: [
        ['Read (list)', '`GET /api/tasks`', 'none', '200 + array', '400 bad query value'],
        ['Read (one)', '`GET /api/tasks/:id`', 'none', '200 + the item', '404'],
        ['Create', '`POST /api/tasks`', 'the new item (no id)', '201 + `Location` + the item', '400'],
        ['Update (replace)', '`PUT /api/tasks/:id`', 'the complete item', '200 + the item', '400 · 404'],
        ['Update (partial)', '`PATCH /api/tasks/:id`', 'only the changed fields', '200 + the item', '400 · 404'],
        ['Delete', '`DELETE /api/tasks/:id`', 'none', '204, no body', '404'],
      ],
    },
    code: `// routes/books.js, mounted in app.js with app.use('/api/books', router)
router.get('/', listBooks);          // GET    /api/books       200 [ … ]
router.post('/', createBook);        // POST   /api/books       201 + Location
router.get('/:id', getBook);         // GET    /api/books/:id   200 | 404
router.put('/:id', replaceBook);     // PUT    /api/books/:id   200 | 400 | 404
router.patch('/:id', patchBook);     // PATCH  /api/books/:id   200 | 400 | 404
router.delete('/:id', deleteBook);   // DELETE /api/books/:id   204 | 404`,
    example: 'One lifecycle in the request builder below: `GET /api/tasks` lists five tasks (200); `POST /api/tasks` with `{"title":"Study REST"}` answers 201 and `Location: /api/tasks/6`; `GET /api/tasks/6` reads it (200); `PATCH /api/tasks/6` with `{"done":true}` changes one field (200); `DELETE /api/tasks/6` removes it (204); a final `GET /api/tasks/6` answers 404. Six requests, one URL pattern, and the status codes tell the whole story.',
    mistake: 'Sending updates to the collection, e.g. `PUT /api/tasks` with `{"id":6,"done":true}` in the body. The URL must name the resource being changed, so the id belongs in the path: `PATCH /api/tasks/6`. On a well-designed API the collection version answers 405.',
    widget: 'api-builder' },

  { id: 'safe-idempotent', hub: 'methods', topic: 'methods', 
    title: 'Safe and idempotent: why retries matter',
    summary: 'A **safe** method changes nothing on the server (GET); an **idempotent** method leaves the server in the same state whether it is sent once or many times (GET, PUT, DELETE). POST is neither, and PATCH is not guaranteed to be.',
    body: [
      'Pressing the lift button five times calls the lift once: that button is **idempotent**. Ordering a coffee five times at the counter gets you five coffees: not idempotent, like POST. Reading the menu changes nothing at all: **safe**, like GET. (The card **HTTP methods** in How the web works introduced the two words; here is why an API designer cares.)',
      'Networks fail in the middle of requests. A phone on a train sends a request, enters a tunnel and never gets the answer. Did the server do it? With an idempotent method the client can simply **send it again**: done twice is the same as done once. With POST, a retry may create a duplicate: two identical tasks, or two payments. That is why browsers ask "Confirm form resubmission?" before repeating a POST, and why some HTTP libraries retry idempotent requests automatically but never POST.',
      'Idempotent is about the **state of the server**, not about the response. The first `DELETE /api/tasks/5` answers 204; the second answers 404 because the task is already gone. DELETE is still idempotent: after one call or after two, task 5 does not exist. A good test suite checks exactly this ("a second DELETE → 404").',
      'PATCH depends on its body. `{"done":true}` gives the same result however often you send it; a PATCH meaning "add one to the counter" does not. HTTP cannot know which kind yours is, so PATCH is listed as not idempotent. To make a POST safe to retry, robust APIs (payment APIs, for example) accept an **idempotency key**: the client invents a unique id for each operation and sends it in a header such as `Idempotency-Key: 6f1c2b…`; the server remembers the keys it has processed and, if the same key arrives again, returns the stored first response instead of creating a second resource.',
    ],
    table: {
      caption: 'The five methods and retries',
      head: ['Method', 'Safe', 'Idempotent', 'Retrying after a timeout…'],
      rows: [
        ['`GET`', 'yes', 'yes', 'is harmless'],
        ['`PUT`', 'no', 'yes', 'sets the same full version again'],
        ['`DELETE`', 'no', 'yes', 'leaves it deleted (the retry may answer 404)'],
        ['`PATCH`', 'no', 'not guaranteed', 'is fine for "set field to X", not for "add 1"'],
        ['`POST`', 'no', 'no', 'may create a duplicate, unless an idempotency key is used'],
      ],
    },
    example: 'The train app sends `POST /api/tasks` with `{"title":"Buy tickets"}`, gets no answer and retries: the list now has two "Buy tickets". With the header `Idempotency-Key: 9b2e…` on both attempts, the server sees the key the second time and answers the same `201 Created` with `Location: /api/tasks/6`, without creating task 7.',
    mistake: '"DELETE is not idempotent, because the second call gets a 404 instead of a 204." Idempotence promises the same **effect on the server**, not the same status code. The response may differ; the state (the task is gone) does not.' },

  { id: 'put-vs-patch', hub: 'methods', topic: 'methods', 
    title: 'PUT replaces, PATCH changes',
    summary: '**PUT** sends the **complete** new version of a resource and replaces it (fields you leave out go back to their defaults, or the request is rejected); **PATCH** sends **only the fields to change** and keeps all the others.',
    body: [
      'PUT is handing in a fresh copy of a form to replace the old one: every box you leave empty is empty in the new version. PATCH is a correction slip: "on line 3, change the date". Same goal (update), very different meaning for the fields you do not mention.',
      'That decides how you validate. **PUT** validates in **full mode**: every required field must be present (a PUT without `title` is a 400) and missing optional fields take their defaults. **PATCH** validates in **partial mode**: only the fields present are checked, and a body with none of the known fields is a 400 ("nothing to change"). In both, the **id comes from the path** and an `id` in the body is ignored. Both answer **200** with the resource as it is now.',
      'Why have both? PUT is simple and clearly idempotent. PATCH is smaller, and it avoids the **lost update**: if two people edit different fields of the same item at the same time, two PATCHes both survive, while the second PUT overwrites the first person\'s change with the old value it still had. The examples here send PATCH bodies as a plain JSON object of the fields to change (formally called a merge patch).',
    ],
    live: { kind: 'js', code: `const task = { id: 2, title: 'Add full CRUD', done: false, userId: 1 };
const body = { done: true };                // what the client sent

// PUT: build the whole new version from the body (+ defaults)
const afterPut = {
  id: task.id,
  title: body.title,                         // undefined → a PUT without title must be a 400
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
    example: 'Task 2 is `{ "title": "Add full CRUD", "done": false, "userId": 1 }`. Leo renames it with `PATCH /api/tasks/2` and `{"title":"Add CRUD + tests"}`. One second later Ana, whose screen still shows the old title, ticks it as done with `PUT /api/tasks/2` and `{"title":"Add full CRUD","done":true,"userId":1}`. Leo\'s new title is gone. Had Ana sent `PATCH` with `{"done":true}`, both changes would be kept.',
    mistake: 'Writing PUT as a merge, e.g. `Object.assign(task, req.body)`. That is PATCH behaviour (fields not sent are kept), so the API no longer has a real PUT, and it also lets the body overwrite `id` or add fields you never meant to store. A PUT builds the new object from the allowed fields only.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Compare PUT and PATCH in the request builder' } },

  /* ---- 4. Status codes and errors --------------------------------------------------- */
  { id: 'status-success', hub: 'status', topic: 'status', 
    title: 'Success codes: 200, 201 and 204',
    summary: 'A successful call answers **200 OK** with a body, **201 Created** with a `Location` header after something was created, or **204 No Content** when there is nothing to send back.',
    body: [
      'Think of a shop counter. **200**: "here is what you asked for". **201**: "done, here is your new order and the number to collect it with". **204**: a nod, "done", with nothing to hand over. The client learns what happened from the number before reading a single byte of the body.',
      '**201 Created** goes with a `Location` header holding the URL of the new resource (a relative URL such as `/api/tasks/6` is fine). The body usually echoes the created resource, including the fields the **server** set (`id`, `createdAt`), so the client does not need another GET. In Express: `res.status(201).location("/api/tasks/" + task.id).json(task)`.',
      '**204 No Content** has **no body at all**: `res.status(204).end()` or `res.sendStatus(204)`. Express drops any body you pass with a 204, and on the client `await res.json()` on a 204 throws "Unexpected end of JSON input". Updates (PUT, PATCH) answer **200** with the new version in the examples here; some APIs answer 204 instead.',
      'Two cases that are not errors: a list with no matches is **200** with `[]`, and a filter or a page past the end is **200** with `[]` too. "I found nothing" is a valid answer about a collection that exists.',
    ],
    table: {
      caption: 'Which success code',
      head: ['Situation', 'Code', 'Body', 'Header to add'],
      rows: [
        ['`GET` a list or one item', '200 OK', 'the data', '(`X-Total-Count` for lists, if you use it)'],
        ['`POST` created something', '201 Created', 'the new resource', '`Location: /api/tasks/6`'],
        ['`PUT` / `PATCH` updated', '200 OK', 'the resource as it is now', ''],
        ['`DELETE` removed', '204 No Content', 'none', ''],
        ['List or search with no matches', '200 OK', '`[]`', ''],
      ],
    },
    code: `res.json(books);                                            // 200 is the default status
res.status(201).location(\`/api/books/\${book.id}\`).json(book);  // created
res.json(updatedBook);                                      // 200 after PUT / PATCH
res.status(204).end();                                      // deleted, no body`,
    example: 'Reading `curl -i -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d \'{"title":"Study"}\'`: the first line `HTTP/1.1 201 Created` and the header `Location: /api/tasks/6` already tell the client everything; the JSON body adds the `id` and `createdAt` the server chose.',
    mistake: 'Writing `res.status(204).json({ message: "Deleted" })` and expecting the client to show the message. A 204 never has a body: Express silently drops it. Either answer 204 with nothing, or 200 with a body.',
    practice: { href: '#/http/api-design/practice/status-chooser', label: 'Practise choosing status codes' } },

  { id: 'status-client-errors', hub: 'status', topic: 'status', 
    title: 'Client errors: choosing the right 4xx',
    summary: 'A **4xx** code tells the caller that **its request** must change, and each code names a different problem: unreadable or invalid (400), no such resource (404), wrong method (405), a clash with stored data (409), a body in the wrong format (415), or valid-looking data that breaks a rule (422, where an API uses it).',
    body: [
      'A well-designed API walks the same checks in the same order for every request, and the **first** check that fails decides the code (the request builder shows this list after every request). Is there a route for this path? If not, **404**. Does it accept this method? If not, **405**, with an `Allow` header listing the methods it does accept. Is the body in a format it reads? If not, **415**; if it says JSON but cannot be parsed, **400**. Does the resource with this id exist? If not, **404**. Are the values valid? If not, **400** (or 422). Does it clash with what is stored, such as an email that is already taken? Then **409**. (Who you are and what you may do, 401 and 403, have their own card.)',
      '**400 or 422?** 400 Bad Request is the general "your request is wrong". Many APIs, including the examples here, use it for both malformed JSON and failed validation. Some APIs keep 400 for "I cannot read this" and use **422 Unprocessable Content** for "I can read it, but the values break the rules" (empty title, negative price). Both conventions are fine; mixing them at random is not. Follow the convention your API documents.',
      '**404 or 405?** 404 says the path names nothing; 405 says the path exists but not with this method. Express answers 404 for an unmatched method unless you add a fallback such as `router.route("/").get(listBooks).post(createBook).all((req, res) => res.set("Allow", "GET, POST").status(405).json({ error: "Method not allowed" }))`. **409 Conflict** is for a request that is fine on its own but clashes with the current state: a duplicate unique field, deleting something other data still points to. **415** is about the body you **send** (`Content-Type`); its cousin **406 Not Acceptable** is about the format you **ask for** (`Accept`).',
    ],
    table: {
      caption: 'The 4xx codes of a REST API',
      head: ['Code', 'Meaning', 'Typical case', 'What the client must fix'],
      rows: [
        ['400 Bad Request', 'Unreadable or invalid request', 'Malformed JSON; `title` missing (if the API uses 400 for validation); `?limit=abc`', 'The syntax or the values'],
        ['404 Not Found', 'Nothing at this URL', '`GET /api/tasks/999`; `/api/taks`', 'The id or the path'],
        ['405 Method Not Allowed', 'Path exists, method does not', '`DELETE /api/tasks` (the whole collection)', 'Use a method from `Allow`'],
        ['406 Not Acceptable', 'Cannot answer in the format asked for', '`Accept: text/html` on a JSON-only API', 'The `Accept` header'],
        ['409 Conflict', 'Clashes with the current state', 'Signing up with an email already registered', 'Different data, or change the state first'],
        ['415 Unsupported Media Type', 'Body format not accepted', 'JSON body sent without `Content-Type: application/json`', 'The `Content-Type` header'],
        ['422 Unprocessable Content', 'Readable but breaks a rule (if the API uses it)', '`{"title":""}` on an API that keeps 400 for parse errors', 'The values'],
      ],
    },
    example: 'Five versions of a sign-up, `POST /api/users`: with the body in plain text, **415**; with `{"name":"Iris",}` (trailing comma), **400** (cannot parse); with `{"name":"","email":"nope"}`, **400** with two field errors (or 422 elsewhere); with a valid body but the email `ana@example.com`, which already exists, **409**; sent as `PATCH /api/users`, **405** with `Allow: GET, POST`.',
    mistake: 'Answering **500** for bad input. If invalid data reaches code that assumes it is valid, `req.body.title.trim()` throws "Cannot read properties of undefined" and the error handler sends 500, telling the client the **server** failed. Validate first and answer 400: the caller made the mistake and can fix it.',
    widget: 'status-chooser' },

  { id: 'status-auth', hub: 'status', topic: 'status', 
    title: '401, 403 or 404: who are you, and may you?',
    summary: '**401 Unauthorized** means the server does not know who you are (no token, a malformed one or an expired one); **403 Forbidden** means it knows and you are not allowed; some APIs answer **404** instead of 403 so as not to reveal that a resource exists.',
    body: [
      'At a nightclub door: no ID, the bouncer says "show me your ID" (**401**). ID fine, but it is a private party and you are not on the list: "you cannot come in" (**403**). A discreet bouncer says "there is no party here" (**404**), so strangers do not even learn that it exists.',
      'Two words to keep apart: **authentication** is proving who you are (logging in, sending a token); **authorisation** is deciding what that person may do. 401 is an authentication failure, despite its name ("Unauthorized" is a historical misnomer), and it comes with a `WWW-Authenticate` header saying how to authenticate (for tokens: `Bearer`). The client\'s fix is to log in, or refresh the token, and try again. 403 is an authorisation failure: repeating the request with the same identity will never work.',
      'Hiding existence: user Leo requests `GET /api/tasks/42`, a task that belongs to Ana. Answering 403 confirms that task 42 exists, and a script can try every id to map what others have. Answering **404** reveals nothing. A common policy: 404 for other people\'s **private** resources; 403 when the caller may see the resource but not do this to it (a student can read a course but not delete it). The checks run in order: identity (401), then permission (403), then existence (404).',
      'The Authentication and security section builds the tokens; this card is only about which code to send.',
    ],
    example: 'In the request builder, `POST /api/users` is for admins. With no `Authorization` header: **401** with `WWW-Authenticate: Bearer`. With `Authorization: Bearer nonsense`: **401** again (an unknown token is no identity). With `Authorization: Bearer student-token`: **403** ("you are a student"). With `Authorization: Bearer admin-token` and a valid body: **201**.',
    mistake: 'Sending 401 for "logged in but not allowed". The front end reacts to 401 by sending the user to the login page; they log in again, get 401 again, and loop forever. "Not allowed" is 403.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Try the tokens in the request builder' } },

  { id: 'error-body', hub: 'status', topic: 'status', 
    title: 'One error shape, and when to use 500',
    summary: 'Every error answer should have the **right status code** and the **same JSON shape**, for example `{ "error": "message" }` plus an `errors` list of `{ field, message }` for validation, so a client handles every error with one piece of code; **500** is only for failures of the server itself.',
    body: [
      'Think of official forms: every rejected application comes back with the same stamp (the status code) and the reasons in the same box (the error body). If each office used its own layout, you would need a manual per office. An API is the same: one shape for every error, everywhere.',
      'A shape that covers both cases: `error` is always present (a short human-readable message) and `errors` is added when there are per-field problems: `{ "error": "Validation failed", "errors": [ { "field": "title", "message": "title is required" } ] }`; a 404 is just `{ "error": "Task 99 not found" }`. A validation failure lists **all** problems at once in `errors`, a missing item answers `{ "error": "Task not found" }`: both fit. (There is also a standard, "Problem Details" (RFC 9457, `Content-Type: application/problem+json`), with fields `type`, `title`, `status` and `detail`.)',
      '**Status first, body second.** Monitoring tools, caches, retry logic and `fetch`\'s `res.ok` look only at the status code. An answer of `200` with `{"error":"not found"}` fools all of them: the error counts as a success. The rule of thumb: if the caller did something wrong, 4xx; if your code did, 5xx.',
      '**500 Internal Server Error** means the server failed: an uncaught exception, a database that is down (**503 Service Unavailable** if it is temporary). One centralised error handler, registered last in `app.js` (see Routes and middleware), turns every thrown error into the same JSON. It logs the details (stack trace, SQL message) on the server and never sends them to the client: they reveal how your code works. In Express 4 an error thrown inside an `async` handler is **not** caught for you: wrap it in `try/catch` and call `next(err)`. Express 5 forwards rejected promises to the error handler automatically.',
    ],
    code: `// app.js: the LAST middleware. Every error leaves in the same shape.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);           // details stay in the server log
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    ...(err.errors ? { errors: err.errors } : {}),   // field errors, when there are any
  });
});`,
    example: 'Because the shape never changes, the client needs one function: `const res = await fetch(url, options); if (!res.ok) { const { error, errors = [] } = await res.json(); errors.forEach((e) => showFieldError(e.field, e.message)); showBanner(error); }`. It works for a 400 with field errors, a 404 and a 500 alike.',
    mistake: 'Answering `res.status(200).json({ success: false, error: "Not found" })`. Every tool that reads status codes now records a success, and `res.ok` is `true` in the browser. Put the meaning in the status code (404) and keep the body for the details.' },

  /* ---- 5. The API contract ---------------------------------------------------------- */
  { id: 'json-conventions', hub: 'contract', topic: 'contract', 
    title: 'JSON in, JSON out: Content-Type and Accept',
    summary: 'A JSON API reads a request body only when its `Content-Type: application/json` header says it is JSON, always answers with `Content-Type: application/json`, and can read the client\'s `Accept` header to see which formats it understands.',
    body: [
      'A parcel needs a label saying what is inside. `Content-Type` is that label, on whatever travels with a body, in either direction. `Accept` is a note the client attaches to its request: "I can read these formats". (The card **Inside an HTTP request** in How the web works introduced both headers.)',
      'In Express, `app.use(express.json())` parses a body **only** when the request\'s `Content-Type` is `application/json`. Otherwise it skips it and, in Express 4, `req.body` is an empty object `{}` (in Express 5 it is `undefined`). That is the classic trap: a curl command without `-H "Content-Type: application/json"` sends a perfect title, and your API answers "title is required". If the header is right but the JSON is broken, `express.json()` raises a 400 error that reaches your error handler. On the way out, `res.json(value)` sets the header and serialises the value for you.',
      'Shared conventions that make an API predictable: keys in **camelCase** (`createdAt`, the JavaScript habit); dates as **ISO 8601** strings in UTC (`"2026-10-05T10:00:00.000Z"`), because JSON has no date type; real booleans (`true`, not `"true"` or `"yes"`); `null` for "no value", always the same way; and a request body that is a JSON **object** at the top level. A strict API answers **415** to a body that is not JSON and **406** when `Accept` rules JSON out; the request builder does both.',
      'On the client side, `fetch` does none of this for you: you set the header and turn the object into text with `JSON.stringify` yourself.',
    ],
    live: { kind: 'js', code: `const book = { title: 'Dune', read: false, due: new Date(Date.UTC(2026, 9, 20)), notes: undefined };

console.log(JSON.stringify(book));        // the Date becomes an ISO string; undefined disappears
console.log(String({ title: 'Dune' }));   // what fetch sends if you forget JSON.stringify

const back = JSON.parse('{"title":"Dune","due":"2026-10-20T00:00:00.000Z"}');
console.log(typeof back.due);              // a string: JSON has no date type

try {
  JSON.parse("{'title':'Dune'}");          // single quotes are not JSON
} catch (e) {
  console.log('400 material:', e.name);
}` },
    example: 'The right fetch call: `fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(book) })`. Leave out the header and an Express 4 API sees `req.body` as `{}`; leave out `JSON.stringify` and the body is the text `[object Object]`, which no JSON parser can read.',
    mistake: 'Debugging the validation code when the real problem is a missing `Content-Type` header. If the API says a field is missing that you can see in your request, check the header first: `curl -i` (or the request builder) shows exactly what was sent.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Send a body without Content-Type in the request builder' } },

  { id: 'dto', hub: 'contract', topic: 'contract', 
    title: 'The API contract vs the database row (DTOs)',
    summary: 'A **DTO** (Data Transfer Object) is the shape of the data your API sends and accepts. It is deliberately different from the database row: it leaves out secrets and internal columns, and renames fields to the JSON convention.',
    body: [
      'A restaurant has a kitchen and a menu. The kitchen holds suppliers, costs and the cleaning rota; the menu shows dishes and prices. Customers order from the menu, so you can reorganise the kitchen without reprinting it. The database row is the kitchen; the DTO is the menu, the public **contract** of your API.',
      'A row often holds columns no client should see: `password_hash` (the stored hash of a password, see Authentication and security), `is_deleted` (a **soft delete** flag: the row is kept but treated as gone), internal notes, foreign keys such as `user_id`. Databases also name columns in **snake_case** (`created_at`) while JSON uses camelCase (`createdAt`). A small function, `toUserDto(row)`, copies the public fields under their public names, and every handler calls it before `res.json`.',
      'Write the DTO as an **allow-list** (copy what you want), never a block-list (delete what you remember to delete): with an allow-list, a column added to the table tomorrow cannot leak by accident. The same applies to input: copy only the fields a client may set. Otherwise a sign-up body with `"role":"admin"` makes the caller an admin; this attack is called **mass assignment**.',
      'The pay-off is stability: you can rename a column, split a table or move to another database and the JSON your clients receive stays identical, because the mapping absorbs the change.',
    ],
    live: { kind: 'js', code: `// One row as the database returns it
const row = { id: 2, email: 'leo@example.com', password_hash: '$2b$10$Qm1x…',
  role: 'student', created_at: '2026-09-02T08:00:00.000Z', is_deleted: false };

// ✗ Block-list: remove what you remembered to remove
const { password_hash, ...leaky } = row;
console.log(leaky);         // is_deleted and created_at leak, and so will any new column

// ✓ Allow-list: copy only the contract
const toUserDto = (r) => ({ id: r.id, email: r.email, role: r.role, createdAt: r.created_at });
console.log(toUserDto(row));` },
    example: 'In the request builder, the server state panel shows the stored user rows with `password_hash`, `created_at` and `is_deleted`. Send `GET /api/users`: every user comes back as `{ "id", "name", "email", "role", "createdAt" }`. Create a user with a password: the 201 body does not contain the password or its hash.',
    mistake: 'Sending the row straight out, `res.json(user)`, or fixing it with `delete user.password_hash`. The first leaks the hash; the second is a block-list that forgets the next secret column (and, with a shared object, deletes the hash from your data too).',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'Compare stored rows and responses in the request builder' } },

  { id: 'openapi', hub: 'contract', topic: 'contract', 
    title: 'Documenting the API: OpenAPI',
    summary: 'An **OpenAPI** document (formerly called Swagger) describes every endpoint of an API in one YAML or JSON file: paths, methods, parameters, request and response bodies and status codes, in a form that people and programs can both read.',
    body: [
      'An OpenAPI file is the floor plan of your API. Visitors use a floor plan to find rooms, inspectors to check the building, builders to construct it. Likewise, people read the spec to learn the API, tools check requests against it, and generators build code from it.',
      'It is usually written in **YAML**, a text format for the same kind of data as JSON that uses indentation instead of braces, `key: value` pairs and `-` for list items. The main parts: `info` (title, version), `paths` (each path, then each method, with its `parameters`, `requestBody` and `responses` per status code) and `components.schemas` (the shapes of your DTOs, written once and referenced with `$ref`).',
      'What tools do with it: **Swagger UI** turns it into an interactive page with a "Try it out" button (in Express, the `swagger-ui-express` package serves it at `/docs`); generators produce an **SDK** (a ready-made client library that wraps your endpoints for a language); validators reject requests that do not match the spec. Keep `openapi.yaml` in the repository and change it in the **same commit** as the code, or it stops being true within a week.',
      'For a small project, an **endpoint table in the README** (method, path, query parameters, success status, error statuses, example request and response) is the minimum; an `openapi.yaml` is a plus. The table and the spec hold the same facts.',
    ],
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
    example: 'A front-end developer asks: "what do I get if the title is missing?" Without a spec they try it, or read your code. With the spec they open `/api/books` → `post` → `responses` and see `400`, "Validation failed (error + errors list)", plus the `NewBook` schema telling them that `title` is required and at most 120 characters long.',
    mistake: 'Writing the documentation at the end and never touching it again. Documentation that disagrees with the API is worse than none, because people trust it. Update the spec, or the README table, in the same commit as each change to a route.' },

  /* ---- 6. Building and testing ------------------------------------------------------ */
  { id: 'crud-in-memory', hub: 'build', topic: 'build', 
    title: 'CRUD with an in-memory array',
    summary: 'Before a database, an API can keep its data in a JavaScript **array** in memory: each handler turns the id from the path into a number, finds the item, answers **404** if it is missing, and changes the array in place, behind function names that a database layer can keep later.',
    body: [
      'The array is a pretend database table and `nextId` is the ticket dispenser at a deli counter: the **server** hands out the numbers, so two items can never get the same one and a client can never choose its own.',
      'Four patterns cover every handler. (1) `Number(req.params.id)`: route parameters are always **strings**, and `"2" === 2` is false, so without the conversion every lookup fails. (2) `find` when you only need the item, `findIndex` when you must replace or remove it by position. (3) **Return early**: `return res.status(404).json(...)`. Without `return` the function carries on and tries to answer a second time, and Express throws "Cannot set headers after they are sent to the client". (4) Build new objects **field by field** from what the client may set.',
      'Point (4) hides a bug in a popular shortcut: `{ id: nextId++, ...req.body }`. The spread comes **after** `id`, so a body containing `"id": 1` overwrites the server\'s id (now two items have id 1), and any extra field (`"isAdmin": true`) is stored too. A safe API does the opposite: a client `id` is ignored and unknown fields are stripped.',
      'The data lives only as long as the process: every restart (and `node --watch` restarts on every save) brings back the seed data, and two copies of the server would each have their own array. That is why a real API replaces the array with a database (see Relational databases), keeping the controller\'s exported function names so that the routes do not change.',
    ],
    code: `let books = [{ id: 1, title: 'Dune', read: true }];
let nextId = 2;

function getBook(req, res) {
  const id = Number(req.params.id);                 // "1" → 1
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
console.log(books.find((b) => b.id === '1'));           // undefined: "1" is not 1
console.log(books.find((b) => b.id === Number('1')));   // found

let nextId = 2;
const body = { id: 1, title: 'Hacked', isAdmin: true };  // what a client could send
console.log({ id: nextId++, ...body });                  // ✗ the body overwrote the id
console.log({ id: nextId++, title: body.title });        // ✓ only the allowed fields` },
    example: '`DELETE /api/books/7` when book 7 does not exist: `findIndex` returns `-1`, the handler answers 404 and returns. Without that check, `books.splice(-1, 1)` would silently remove the **last** book in the array and answer 204: a wrong item deleted and a success reported.',
    mistake: 'Forgetting `return` before an early answer: `if (!book) res.status(404).json(...)` followed by `res.json(book)`. The second call crashes with `ERR_HTTP_HEADERS_SENT`. Every early answer starts with `return`.' },

  { id: 'validation', hub: 'build', topic: 'build', 
    title: 'Validating input: 400 with field errors',
    summary: '**Validation** checks every field of the request body (present, right type, right length or range, allowed value) **before** anything is stored, and rejects a bad request with **400** and a list of **all** the problems, each tied to its field.',
    body: [
      'Validation is the passport check at the border of your data. Everything that arrives over HTTP was written by someone else, maybe not by your form at all but by curl or a script, so it is checked once, at the boundary, and the inside of your program can then trust it. Checks in the front end are for a nice experience; checks in the back end are for correctness and security (see **Front end and back end** in How the web works).',
      'What to check for each field: **required** (present and not empty after `trim()`); **type** (`typeof v === "string"`, `typeof v === "boolean"`: the string `"true"` is not a boolean, and `Number.isInteger` for whole numbers); **length or range** (title at most 120 characters, rating 1 to 5); **closed set** (`["easy", "medium", "hard"].includes(v)`). Then: strip fields you do not know, and ignore any `id` the client sent.',
      'Two modes: **full** for POST and PUT (every required field must be there) and **partial** for PATCH (check only the fields present). Collect **every** error instead of stopping at the first, so the client can show all messages next to their fields at once. Writing the validator as a **pure function** (data in, `{ valid, errors }` out, no `req` or `res`) lets you test it without Express, like any plain function. Libraries such as Zod do the same with less code (see Authentication and security).',
    ],
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
console.log(validateBook({ title: '   ', rating: '5' }));          // two errors, both reported
console.log(validateBook({ rating: 4 }, { partial: true }));       // PATCH: title not needed` },
    example: '`POST /api/books` with `{"title":"   ","rating":"5"}` answers `400` with `{ "error": "Validation failed", "errors": [ { "field": "title", "message": "title is required" }, { "field": "rating", "message": "rating must be a whole number from 1 to 5" } ] }`, and the collection has the same length as before. The client shows each message under its input.',
    mistake: 'Checking only `if (!req.body.title)`. It accepts `"title": 123` and `"title": "   "`, says nothing about the other fields, and reports one problem at a time, so the user fixes, resubmits and gets the next error, again and again.' },

  { id: 'curl-testing', hub: 'build', topic: 'build', 
    title: 'Testing by hand: curl, Postman, Thunder Client',
    summary: '**curl** sends any HTTP request from the terminal and prints the response; four flags, `-i` (show status and headers), `-X` (method), `-H` (header) and `-d` (body), cover every CRUD call. GUI clients such as Postman or Thunder Client do the same with forms and saved collections.',
    body: [
      'curl is a browser without a window: you write the request yourself and see the raw answer, status line and headers included. It is the fastest way to check one route the moment you write it, before any front end exists.',
      'The flags. `-i` includes the status line and the response headers in the output (without it you see only the body, so a 201 looks like a 200). `-X PATCH` sets the method (the default is GET). `-H "Name: value"` adds a header and can be repeated. `-d \'...\'` sends a body; on its own it switches the method to POST and labels the body as a form (`application/x-www-form-urlencoded`), so a JSON body always needs `-H "Content-Type: application/json"` as well. `-v` shows the request too, which is useful when you are not sure what was sent.',
      '**On Windows.** In Windows PowerShell 5.1, `curl` is an alias for a different command (`Invoke-WebRequest`) with other options: type `curl.exe`. Quoting also differs. The single-quoted JSON above works in Git Bash (installed with Git, and available as a terminal in VS Code), macOS and Linux. In `cmd.exe` write `-d "{\\"title\\":\\"Study\\"}"`. In Windows PowerShell 5.1 even single quotes are not enough (`-d \'{\\"title\\":\\"Study\\"}\'`). The simplest way out on any shell: put the JSON in a file and send `-d @task.json` (in PowerShell, quote it: `"@task.json"`).',
      '**GUI clients**: Postman (a desktop app), Thunder Client (a VS Code extension), Insomnia, or `.http` files with the REST Client extension. They save requests in a **collection**, keep variables such as `{{baseUrl}}` and `{{token}}`, and can be shared with your partner. They still only check what you remember to click: automated tests (next card) repeat everything on every change.',
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
    example: 'The POST above prints `HTTP/1.1 201 Created`, then headers including `Location: /api/tasks/6` and `Content-Type: application/json; charset=utf-8`, an empty line, and the JSON body. That is the whole contract of a create in four lines; without `-i` you would only see the JSON and could not tell 201 from 200. Note the quotes around the URL with `&`: unquoted, the shell treats `&` as "run in the background".',
    mistake: 'Typing `curl -X POST ... -H "Content-Type: application/json"` in Windows PowerShell 5.1 and getting "Cannot bind parameter Headers": that is `Invoke-WebRequest` speaking, not curl. Use `curl.exe`, or Git Bash.',
    practice: { href: '#/http/api-design/practice/api-builder', label: 'See the curl command for any request in the request builder' } },

  { id: 'automated-tests', hub: 'build', topic: 'build', 
    title: 'Automated API tests with supertest',
    summary: 'An automated API test sends a request to your Express app **inside the test process** with **supertest**, then checks the status code, the body and, for writes, the change in state; a test runner (**Jest**, or Node\'s built-in `node:test`) runs them all with `npm test`.',
    body: [
      'An automated test suite is a robot that replays every curl command you ever typed and checks every answer, in a second, every time you change something. It catches **regressions**: things that used to work and broke while you were changing something else.',
      'Vocabulary. A **test runner** finds the test files, runs them and reports what passed (Jest: `npm test` runs `jest`). A **test** (`test("…", async () => { … })`) is one case; `describe` groups several. An **assertion** checks one fact and fails the test if it is false: `expect(res.status).toBe(201)`. `toBe` compares with `===`, `toEqual` compares contents, and `toMatchObject` checks that the body contains **at least** the listed fields, ideal when the server adds an `id` and a `createdAt` you cannot predict. With `node:test` the same assertions read `assert.equal(res.status, 201)`.',
      '**supertest** wraps your app: `request(app).post("/api/books").send({ title: "Dune" })` sends the request and resolves to the response (`res.status`, `res.headers.location`, `res.body`). Passing an object to `.send()` sets `Content-Type: application/json` for you; `.set("Authorization", "Bearer …")` adds any header. It starts the app on a temporary port by itself, which only works because `app.js` **exports** the app without calling `app.listen()`; `server.js` is the only file that listens.',
      'Assert the **status**, the important **headers** (`Location`), the **body shape** and, for writes, the **state change**: after a create, a GET finds it; after a delete, a GET gives 404; after a rejected POST, the list has the same length. Tests must not depend on each other\'s data or order: the in-memory array survives from one test to the next, so either each test creates the data it needs or the store is reset before each test (`beforeEach`), which is the more robust choice.',
    ],
    code: `// tests/books.test.js (Jest + supertest)
const request = require('supertest');
const app = require('../src/app');          // the app, NOT server.js

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
    example: 'Run `npm test` and Jest prints one line per test, ✓ or ✕. A failure shows `Expected: 201, Received: 200`: you forgot `res.status(201)` in the create handler. You fix one line, run again, and every other route is checked again for free.',
    mistake: 'Calling `app.listen(3000)` inside `app.js`. Every test file that imports the app now opens port 3000 (`EADDRINUSE` when two files run) and Jest never finishes because a server is still listening. Export the app from `app.js` and listen only in `server.js`.' },
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
  { type: 'mc', topic: 'rest',
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
  { type: 'mc', topic: 'contract',
    q: 'What is an OpenAPI document?',
    choices: ['A JavaScript library for building routes', 'A YAML or JSON file that describes every endpoint, its parameters, bodies and status codes', 'A browser extension for testing APIs', 'A database schema'],
    answer: 1,
    why: 'Tools turn it into interactive docs (Swagger UI), client SDKs and request validators.' },
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
