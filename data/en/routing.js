'use strict';
/* Client-side routing: concept cards, rail groups and self-check quiz (React Router as the worked example). */

DATA.en.ROUTING_QUIZ_TOPICS = {
  spa: 'Single-page apps and URLs',
  matching: 'Routes and matching',
  layouts: 'Nested routes and layouts',
  navigation: 'Navigating',
  guards: 'Protected routes and data',
};

DATA.en.ROUTING_GROUPS = [
  { key: 'spa', label: 'Single-page apps and URLs', icon: 'web' },
  { key: 'routes', label: 'Routes and matching', icon: 'route' },
  { key: 'layouts', label: 'Nested routes and layouts', icon: 'tree' },
  { key: 'navigation', label: 'Navigating', icon: 'arrow' },
  { key: 'guards', label: 'Protected routes and data', icon: 'lock' },
];

const ROUTER_SIM = { href: '#/browser/routing/practice/router-sim', label: 'Try it in the router simulator' };

DATA.en.ROUTING_CONCEPTS = [
  /* ---- 1. Single-page apps and URLs ------------------------------------------------ */
  { id: 'mpa-vs-spa', hub: 'spa', topic: 'spa',
    title: 'Multi-page sites and single-page apps',
    summary: 'In a **multi-page site** every link asks the server for a new HTML page. In a **single-page app** (SPA) the server sends one HTML page and the JavaScript bundle once; after that, the app itself swaps screens and changes the URL, asking the server only for data.',
    body: [
      'Picture two restaurants. In the first, every time you want another dish, the waiter takes away the whole table, plates, glasses and your coat included, and lays a new one. That is a multi-page site: each click is a full page load, the browser throws away the page (with its JavaScript variables, scroll position and half-typed form) and draws the new one the server sent. In the second restaurant the table stays; only the plate changes. That is a single-page app: one page load, then the app replaces the part of the screen that changes.',
      'What travels over the network is the clearest difference. Multi-page: each navigation is `GET /tasks/7` and the answer is a complete HTML document built for that URL (by Express templates, PHP, Django… or static files). Single-page: the first visit gets `index.html` and the JavaScript bundle; from then on, clicking "Task 7" sends no HTML request at all, the app draws the task screen itself, and only the data travels, as JSON: `GET /api/tasks/7` (see [Fetching data](#/browser/data-fetching)).',
      'An SPA must still give every screen its own **URL**, otherwise the Back button, bookmarks, shared links and refresh all break. Keeping the URL and the screen in step, without asking the server for pages, is the job of a **client-side router**: a piece of code in the browser that reads the URL, decides which components to show, and updates the URL when the user moves around. React does not include one; React Router is the usual choice, and it is the example on these cards.',
    ],
    table: { caption: 'What happens when the user clicks "Task 7"',
      head: ['', 'Multi-page site', 'Single-page app'],
      rows: [
        ['Request', '`GET /tasks/7` → a whole HTML page', 'none for the page; `GET /api/tasks/7` → JSON'],
        ['Who builds the screen', 'the server', 'the app, in the browser'],
        ['JavaScript state (variables, forms)', 'lost', 'kept'],
        ['The URL changes because…', 'the browser loaded a new document', 'the router called `history.pushState`'],
        ['Back button', 'the browser loads the previous page', 'the router draws the previous screen'],
        ['First visit', 'fast: one ready-made page', 'slower: the bundle must download and run first'],
      ] },
    points: [
      'SPA: **one** HTML page, many screens, each with its own URL.',
      'After the first load, an SPA asks the server for **data**, not pages.',
      'The **client-side router** keeps the URL and the screen in step.',
    ],
    example: 'Open the Network tab of the browser\'s developer tools (see [DevTools: the Network tab](#/http/web/devtools-network)) on any React app and click around: the "Doc" filter shows one request, the first one; the "Fetch/XHR" filter shows the JSON calls each screen makes. Do the same on a classic multi-page site: every click adds a new "Doc" request.',
    mistake: 'Thinking that a single-page app has a single URL. A good SPA has as many URLs as screens (`/tasks`, `/tasks/7`, `/tasks/7/edit`); "single page" refers to the one HTML document the server sends, not to the address bar.' },

  { id: 'history-api', hub: 'spa', topic: 'spa',
    title: 'The History API: changing the URL without a request',
    summary: 'The browser\'s **History API** lets JavaScript change the URL without loading a page: `history.pushState(state, \'\', \'/tasks/7\')` adds an entry to the history, `replaceState` overwrites the current one, and the **`popstate`** event fires when the user presses Back or Forward. Every client-side router is built on these three.',
    body: [
      'The browser keeps a **history stack** per tab: a list of entries (URL plus an optional `state` object) and a pointer to the current one. Normally only page loads add entries. `pushState` lets your code add one too, and here is the trick: the address bar shows the new URL, but **nothing is requested and nothing is redrawn**. The browser just writes the new address down. Drawing the matching screen is your job.',
      'The other direction matters as much. When the user presses Back, the browser moves the pointer to the previous entry, puts its URL in the address bar and fires `popstate` on `window` (again without a request, if the entry was created by `pushState`). A router listens to `popstate`, reads `location.pathname` and draws that screen. `pushState` and `replaceState` themselves do **not** fire `popstate`, so the router redraws right after calling them.',
      'Three methods and an event make a router: on a link click, `preventDefault()` (see [preventDefault](#/browser/dom/prevent-default)), `pushState`, render; on `popstate`, render. `replaceState` is for "go there, but do not leave the current page in the history" (redirects, see [Push or replace](#/browser/routing/push-vs-replace)). `history.back()`, `history.forward()` and `history.go(-2)` move the pointer from code. React Router wraps all of this; you will rarely call these yourself.',
    ],
    code: `// A hand-made router in plain JavaScript: what a library like React Router does underneath
const routes = {
  '/': () => '<h1>Home</h1>',
  '/tasks': () => '<h1>All tasks</h1>',
};

function render() {
  const page = routes[location.pathname] || (() => '<h1>Not found</h1>');
  document.querySelector('#app').innerHTML = page();
}

// 1. Links: change the URL without a request, then draw
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  e.preventDefault();                       // stop the browser loading a page
  history.pushState(null, '', a.getAttribute('href'));
  render();                                 // pushState does not fire popstate
});

// 2. Back and Forward: the browser fires popstate, we draw the URL it restored
window.addEventListener('popstate', render);

render();                                   // 3. the first load`,
    practice: ROUTER_SIM,
    example: 'With the code above, on `/` the user clicks `<a href="/tasks" data-link>`: the listener cancels the navigation, `pushState` makes the history `[/, /tasks]` with the pointer on `/tasks`, and `render()` draws "All tasks". Back moves the pointer to `/` and fires `popstate`, so `render()` draws "Home". No request reached the server in either step.',
    mistake: 'Expecting `pushState` to show the new page by itself, or to fire `popstate`. It only changes the address bar and the history; if your code does not render afterwards, the URL says `/tasks` while the screen still shows the home page.' },

  { id: 'server-fallback', hub: 'spa', topic: 'spa',
    title: 'Refresh and deep links: every path must return index.html',
    summary: 'A client-side route such as `/tasks/7` exists only inside the app. When the user **refreshes** or opens a shared link, the browser asks the **server** for `/tasks/7`; unless the server answers every app path with `index.html` (the **SPA fallback**), the user gets a 404 instead of the app.',
    body: [
      'Remember who knows about which URL. The **router** knows `/tasks/7`, but the router is JavaScript inside `index.html`, so it only runs once that page is loaded. A refresh, a bookmark, a link pasted in a chat or a URL typed in the address bar all start from zero: the browser sends `GET /tasks/7` to the server. A server that only serves files looks for a file called `tasks/7`, finds none and answers **404 Not Found**. Clicking around worked; refreshing breaks. That is the symptom.',
      'The fix is on the **server**: for any path that is not a real file and not the API, send `index.html` with status 200. The app starts, the router reads `location.pathname`, which is still `/tasks/7`, and draws the right screen. This rule is called the SPA fallback (or "history fallback", or a "rewrite").',
      'Where you meet it: the **Vite dev server** already does it, which is why the problem only appears after deploying. `vite preview` does it too. A static host needs a rule: Netlify a `_redirects` file with `/* /index.html 200`, Vercel a rewrite, Nginx `try_files $uri /index.html`. GitHub Pages cannot rewrite at all; there, people copy `index.html` to `404.html` (the app works, but each deep link answers with status 404) or use [hash URLs](#/browser/routing/hash-vs-path). When Express serves the built app, add a last route after the API and the static files.',
    ],
    code: `// Express serving the built React app (the dist/ folder from npm run build)
const path = require('path');
const dist = path.join(__dirname, '..', 'client', 'dist');

app.use('/api', apiRouter);                 // 1. the API first
app.use(express.static(dist));              // 2. real files: /assets/index-3f2a.js …

// 3. the SPA fallback: any other GET that is not /api/… gets index.html
app.get(/^\\/(?!api\\/).*/, (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));   // 4. unknown /api/… routes`,
    practice: ROUTER_SIM,
    example: 'In the router simulator, switch off "The server answers every path with index.html", click a link to `/tasks` (it works: no request is made), then press **Refresh**: the page becomes the server\'s `404 Not Found · Cannot GET /tasks`, and the history shows a new page load. Switch the fallback on and refresh again: the app starts and draws `/tasks`.',
    mistake: 'Making the fallback catch everything, API included: `GET /api/tsks` (a typo) then answers `200` with an HTML page, and the front end fails with "Unexpected token \'<\' in JSON". Exclude `/api/` from the fallback so unknown API paths keep their JSON 404 (see [The 404 catch-all](#/server/routes/not-found)).' },

  { id: 'hash-vs-path', hub: 'spa', topic: 'spa',
    title: 'Hash URLs and path URLs',
    summary: 'A router can keep the screen in the **path** (`/tasks/7`, needs the server fallback) or in the **hash** (`/#/tasks/7`). The hash, everything after `#`, is never sent to the server, so hash URLs work on any static host, at the price of uglier URLs.',
    body: [
      'Recall the parts of a URL (see [Anatomy of a URL](#/http/web/url-anatomy)): the **fragment** or hash, the part after `#`, stays in the browser. It was invented to jump to a place in the page (`#comments`), so changing it never reloads anything. A router can use it as its address: `https://example.com/#/tasks/7` asks the server only for `/`, and the router reads `#/tasks/7`. Changing the hash fires the `hashchange` event, the hash version of `popstate`.',
      'That is why hash routing needs no server configuration: every URL of the app is, for the server, the same file. It is a good fit for hosts that cannot rewrite (GitHub Pages, a folder on a shared server, a file opened from disk). This study site uses hash URLs, `#/browser/routing`, for exactly that reason.',
      'Path URLs are the default for applications: they are cleaner, the hash stays free for in-page anchors, and servers and search engines see the real path. In React Router you choose with the router component: `BrowserRouter` (or `createBrowserRouter`) for paths, `HashRouter` (or `createHashRouter`) for hashes. Routes, links and hooks are written the same way with both.',
    ],
    table: { caption: 'The same screen, two kinds of URL',
      head: ['', 'Path: `/tasks/7`', 'Hash: `/#/tasks/7`'],
      rows: [
        ['What the server receives', '`GET /tasks/7`', '`GET /` (the hash is not sent)'],
        ['Server configuration', 'SPA fallback needed', 'none'],
        ['Browser API underneath', '`pushState` + `popstate`', '`location.hash` + `hashchange`'],
        ['React Router', '`BrowserRouter` / `createBrowserRouter`', '`HashRouter` / `createHashRouter`'],
        ['In-page anchors (`#section`)', 'work as usual', 'clash with the route'],
      ] },
    code: `// A hash router in plain JavaScript: no server configuration needed
function render() {
  const path = location.hash.slice(1) || '/';     // '#/tasks/7' → '/tasks/7'
  document.querySelector('#app').textContent = 'Screen for ' + path;
}
window.addEventListener('hashchange', render);   // links: <a href="#/tasks/7">
render();`,
    example: 'Deploy the same app twice to a static host without rewrites. With `BrowserRouter`, `https://me.github.io/app/tasks/7` gives a 404 on refresh. With `HashRouter`, `https://me.github.io/app/#/tasks/7` always works: the server only ever sees `/app/`.',
    mistake: 'Switching to `HashRouter` while keeping `href="/tasks"` in plain `<a>` tags. Those still point at a path, so they trigger a full page load to a URL the host does not have. Use the router\'s `<Link to="/tasks">`, which writes the right URL for the router you chose.' },

  /* ---- 2. Routes and matching --------------------------------------------------------- */
  { id: 'router-setup', hub: 'routes', topic: 'matching',
    title: 'Setting up a router (React Router)',
    summary: 'In React, a router is a component at the top of the app that listens to the URL and gives every component below it access to the current location. With React Router: `npm install react-router`, wrap the app in `<BrowserRouter>`, and describe the screens with `<Routes>` and `<Route>`.',
    body: [
      'The router is the switchboard of the app: it holds the current location (path, query string, hash, state), listens to the History API, and lets any component below it read the location or navigate. That is why it goes at the **top**, once, usually in `main.jsx` around `<App />`: hooks such as `useParams` or `useNavigate` throw an error in a component that is not inside a router.',
      'Package names changed over time. React Router 7 is installed as `react-router`; version 6, used by many tutorials and existing projects, was `react-router-dom`, and its components and hooks have the same names. Imports therefore look like `import { Link } from \'react-router\'` in new projects and `from \'react-router-dom\'` in older ones; check `package.json` and use what is installed.',
      'React Router offers two ways to declare routes. **JSX routes** (`<BrowserRouter>` + `<Routes>`), the simplest, used on these cards. A **route object** created with `createBrowserRouter([...])` and rendered with `<RouterProvider router={router} />` (the "data" mode), which adds `loader` functions that fetch a route\'s data before it renders. Matching, nesting, params and links work the same in both.',
    ],
    code: `// main.jsx: one router, at the top
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';    // version 6: 'react-router-dom'
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// App.jsx: which component renders for which URL
import { Routes, Route } from 'react-router';
import Home from './pages/Home.jsx';
import TaskList from './pages/TaskList.jsx';
import TaskDetail from './pages/TaskDetail.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tasks" element={<TaskList />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
    </Routes>
  );
}

// The same routes as objects (data mode)
// const router = createBrowserRouter([
//   { path: '/', element: <Home /> },
//   { path: '/tasks', element: <TaskList /> },
//   { path: '/tasks/:id', element: <TaskDetail /> },
// ]);
// createRoot(root).render(<RouterProvider router={router} />);`,
    example: 'A typical layout of files: `src/pages/` holds one component per screen (`TaskList.jsx`, `TaskDetail.jsx`, `Login.jsx`), `src/components/` the pieces they share (`TaskItem`, `NavBar`), and `App.jsx` the route table that connects URLs to pages. Reading `App.jsx` alone tells you every screen the app has.',
    mistake: 'Calling `useNavigate()` in a component that is rendered **outside** the router, for example an auth provider placed above `<BrowserRouter>` in `main.jsx`. React Router throws "useNavigate() may be used only in the context of a <Router> component". Put the router at the very top, and any provider that navigates inside it.' },

  { id: 'routes-and-route', hub: 'routes', topic: 'matching',
    title: 'Routes: mapping a URL to a component',
    summary: 'A **route** pairs a URL **pattern** (`path="/tasks/:id"`) with what to render for it (`element={<TaskDetail />}`). `<Routes>` looks at the current URL, chooses the best matching route and renders its element; when the URL changes, it chooses again.',
    body: [
      'Think of `<Routes>` as a switch statement on the URL that React re-runs on every navigation: "if the path looks like this, show that". Each `<Route>` is one case. The **path** is a pattern, not a fixed string: literal segments (`tasks`) must be equal, a segment starting with a colon (`:id`) matches any single segment, and a final `*` matches whatever is left. Matching ignores letter case and a trailing slash, and it ignores the query string and the hash: `/Tasks/7/?tab=notes` matches `/tasks/:id`.',
      'A path must match the **whole** URL, segment by segment: `/tasks/:id` matches `/tasks/7` but not `/tasks` (one segment missing) nor `/tasks/7/edit` (one too many). Each screen therefore gets its own route, and the "nothing matches" case needs one too ([the catch-all](#/browser/routing/not-found-route)). When nothing matches, React Router renders nothing and only writes a warning in the console.',
      '`element` takes a JSX **element**, `<TaskList />`, not the function `TaskList`: you can pass props there (`element={<TaskList filter="open" />}`) and wrap it (`element={<RequireAuth><Settings /></RequireAuth>}`). The component is only rendered while its route matches; navigating away unmounts it, so its state is lost unless it lives higher up (see [Nested routes and layouts](#/browser/routing/nested-routes)).',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

// A hand-made router, to see the idea: the URL lives in state,
// and a table of routes says what to render for it.
// (React Router reads the real URL; these boxes cannot change it.)
const routes = [
  { path: '/', element: <h2>Home</h2> },
  { path: '/tasks', element: <h2>All tasks</h2> },
  { path: '/about', element: <h2>About this app</h2> },
];

function App() {
  const [path, setPath] = useState('/');
  const route = routes.find((r) => r.path === path.toLowerCase().replace(/(.)\\/$/, '$1'));
  return (
    <>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['/', '/tasks', '/about', '/Tasks/', '/nope'].map((p) => (
          <button key={p} onClick={() => setPath(p)} aria-pressed={p === path}>{p}</button>
        ))}
      </nav>
      <p>URL: <code>{path}</code></p>
      {route ? route.element : <p>(nothing: no route matches)</p>}
    </>
  );
}` },
    example: 'In the box, click `/Tasks/`: it still shows "All tasks", because the toy matcher, like React Router, ignores case and a trailing slash. Click `/nope`: no route matches and nothing renders, which is what React Router does too (plus a console warning `No routes matched location "/nope"`).',
    mistake: 'Writing routes in the React Router 5 style found in old tutorials: `<Route exact path="/" component={Home} />` inside a `<Switch>`. In current versions `Switch` does not exist (it is `Routes`), `exact` is gone (every path is exact unless it ends in `/*`) and `component` is ignored, so the route renders nothing. Write `<Route path="/" element={<Home />} />`.' },

  { id: 'route-ranking', hub: 'routes', topic: 'matching',
    title: 'How the router picks a route: ranking, not order',
    summary: 'When several routes match a URL, React Router does not take the first one written: it **ranks** them, and the most specific path wins. A literal segment beats a `:param`, which beats `*`. So `/tasks/new` and `/tasks/:id` can be written in any order.',
    body: [
      'Ranking is like sorting addresses by how precisely they describe a place: "12 Baker Street" beats "any house on Baker Street", which beats "anywhere". React Router gives every route path a **score**: one point per segment, then **10** for each literal segment (`tasks`), **3** for each dynamic one (`:id`), **1** for an empty one (the root `/`), **2** more for an [index route](#/browser/routing/index-routes), and **2** less for a splat `*`. It sorts the paths by score and tries them from the top; the first that matches the whole URL wins.',
      'So for `/tasks/new`, the path `/tasks/new` (3 segments + 1 + 10 + 10 = 24) is tried before `/tasks/:id` (3 + 1 + 10 + 3 = 17), and `*` (score 1) is tried last. Order only matters when two **sibling** routes have the **same** score and both match, for example `:lang/about` and `docs/:page` for `/docs/about`: then the one written first wins.',
      'This is a real difference from server routers. Express tries routes in the order they were registered and the first match answers, so there `/tasks/new` must come before `/tasks/:id` (see [Route order](#/server/routes/route-order)). In React Router you can group routes the way that reads best.',
    ],
    table: { caption: 'Scores for some paths (React Router 6 and 7)',
      head: ['Path', 'How the score is made', 'Score'],
      rows: [
        ['`/tasks/:id/edit`', '4 segments + 1 + 10 + 3 + 10', '28'],
        ['`/tasks/new`', '3 segments + 1 + 10 + 10', '24'],
        ['`/tasks/:id`', '3 segments + 1 + 10 + 3', '17'],
        ['`/tasks` (index child)', '3 segments + 2 (index) + 1 + 10 + 1', '17'],
        ['`/tasks`', '2 segments + 1 + 10', '13'],
        ['`/`', '2 segments + 1 + 1', '4'],
        ['`*`', '2 segments − 2 (splat) + 1', '1'],
      ] },
    widget: 'router-sim',
    example: 'In the simulator above (example "A task app"), type `/tasks/new` and click the Link: the ranking table at the bottom shows `/tasks/:id/edit` (28) tried and rejected, then `/tasks/new` (24) matching. `/tasks/:id` (17) is never tried. Challenge 2 asks you to predict this, and challenge 6 shows the one case where order decides.',
    mistake: 'Carrying the Express habit over and worrying that `:id` "swallows" `new`, then renaming the route to `/new-task` or adding checks such as `if (id === \'new\')` in `TaskDetail`. React Router already picks `/tasks/new`; the workaround only adds confusion.' },

  { id: 'url-params', hub: 'routes', topic: 'matching',
    title: 'URL parameters: useParams (always strings)',
    summary: 'A `:name` segment in a route path captures that part of the URL. Inside the route\'s components, `useParams()` returns them as an object: for `path="/tasks/:id"` and the URL `/tasks/7`, `useParams()` is `{ id: \'7\' }`, a **string**.',
    body: [
      'A parameter is a blank in a form: `/tasks/___` where `___` is "which task". The URL carries the answer, so the page can be bookmarked, shared and refreshed and still show the same task: the URL is the **source of truth** for "which one". The component reads it with `const { id } = useParams();` and uses it to fetch the data (see [Loading data for a route](#/browser/routing/data-per-route)).',
      'Everything in a URL is text, so every param is a **string** (already decoded: `%20` becomes a space). `id === 7` is `false` when `id` is `\'7\'`; convert when you need a number, `Number(id)`, and check the result: `/tasks/abc` also matches `/tasks/:id`, giving `NaN`. A route can have several params (`/users/:userId/tasks/:taskId`); a layout route also sees the params of the child route that matched below it. A splat `*` puts the rest of the URL in `params[\'*\']`.',
      'A param matches exactly one non-empty segment: `/tasks/:id` does not match `/tasks/` nor `/tasks/7/edit`. Name params after what they hold (`:taskId` rather than `:x`), especially when several routes are nested; and remember the server side does the same thing with `req.params` (see [Route parameters](#/server/routes/route-params)).',
    ],
    code: `// App.jsx
<Route path="/tasks/:id" element={<TaskDetail />} />

// TaskDetail.jsx
import { useParams } from 'react-router';

export default function TaskDetail() {
  const { id } = useParams();               // '7' for /tasks/7: a string
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId < 1) return <p>There is no task "{id}".</p>;
  return <h1>Task {taskId}</h1>;
}`,
    live: { kind: 'react', code: `import { useState } from 'react';

// A hand-made matcher for one pattern, to see what useParams() returns.
function matchPath(pattern, path) {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) {
      if (!got[i]) return null;               // a param needs a non-empty segment
      try { params[want[i].slice(1)] = decodeURIComponent(got[i]); } catch { return null; }
    } else if (want[i] !== got[i]) return null;
  }
  return params;
}

function App() {
  const [path, setPath] = useState('/tasks/7');
  const params = matchPath('/tasks/:id', path);
  return (
    <>
      <label>URL <input value={path} onChange={(e) => setPath(e.target.value)} /></label>
      <p>Pattern: <code>/tasks/:id</code></p>
      {params ? (
        <ul>
          <li>params: <code>{JSON.stringify(params)}</code></li>
          <li>typeof params.id: <code>{typeof params.id}</code></li>
          <li>params.id === 7: <code>{String(params.id === 7)}</code></li>
          <li>Number(params.id) === 7: <code>{String(Number(params.id) === 7)}</code></li>
        </ul>
      ) : <p>No match: the URL has a different shape.</p>}
    </>
  );
}` },
    example: 'In the box, the URL `/tasks/7` gives `{"id":"7"}`: `typeof` is `string`, `params.id === 7` is false and `Number(params.id) === 7` is true. Type `/tasks/buy%20milk`: the param is decoded to `buy milk`. Type `/tasks/7/edit` or `/tasks/`: no match, the shape is different.',
    mistake: 'Comparing the param with a number from the data: `tasks.find((t) => t.id === id)` finds nothing, because `t.id` is the number `7` and `id` is the string `\'7\'`, and the page shows "not found" for a task that exists. Convert once, `const taskId = Number(id)`, and compare numbers.' },

  { id: 'search-params', hub: 'routes', topic: 'matching',
    title: 'Query strings: useSearchParams',
    summary: 'The query string (`?done=false&page=2`) holds **optional** settings of a screen: filters, search text, sort, page. React Router does not use it to choose a route; the page reads and changes it with `const [searchParams, setSearchParams] = useSearchParams()`.',
    body: [
      'Path or query? The path says **which** screen or resource (`/tasks/7`); the query says **how** to show it (`/tasks?done=false&sort=title`). Putting filters and the page number in the URL instead of in `useState` means a refresh keeps them, the Back button undoes a filter change, and a link like "my open tasks, page 2" can be shared. The same query string often goes straight to the API: `/tasks?done=false&page=2` in the address bar, `GET /api/tasks?done=false&page=2` to the server (see [Query parameters](#/http/api-design/query-params)).',
      '`searchParams` is a standard `URLSearchParams` object: `searchParams.get(\'page\')` returns a **string** or `null` when absent, so give a default and convert, `Number(searchParams.get(\'page\') ?? 1)`. `setSearchParams({ done: \'false\', page: \'2\' })` replaces the whole query string and navigates (a new history entry; pass `{ replace: true }` as a second argument for keystrokes, so Back is not filled with one entry per letter).',
      'To change one key and keep the others, start from a copy: `setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set(\'page\', \'2\'); return next; })`. When a filter changes, reset the page to 1 (page 3 of the old results may not exist), and add the query values to the dependencies of the effect that fetches (see [Pagination controls](#/browser/data-fetching/pagination-ui)).',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

const TASKS = [
  { id: 1, title: 'Buy milk', done: true },
  { id: 2, title: 'Call Ana', done: false },
  { id: 3, title: 'Write the report', done: false },
];

function App() {
  // A hand-made URL in state; useSearchParams() would read the real one.
  const [url, setUrl] = useState('/tasks?done=false');
  const [pathname, query = ''] = url.split('?');
  const searchParams = new URLSearchParams(query);
  const done = searchParams.get('done');          // 'true', 'false' or null
  const q = searchParams.get('q') ?? '';

  function update(key, value) {                   // what setSearchParams does
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    const s = next.toString();
    setUrl(pathname + (s ? '?' + s : ''));
  }

  const shown = TASKS.filter((t) => (done === null || String(t.done) === done)
    && t.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <p>URL: <code>{url}</code></p>
      <label>Search <input value={q} onChange={(e) => update('q', e.target.value)} /></label>{' '}
      <select value={done ?? ''} onChange={(e) => update('done', e.target.value)} aria-label="Status">
        <option value="">All</option><option value="false">To do</option><option value="true">Done</option>
      </select>
      <ul>{shown.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}` },
    example: 'In the box, choose "All": the `done` key disappears from the URL and all three tasks show. Type "rep" in Search: the URL becomes `/tasks?q=rep` and the list follows. Every filter is in the URL, so a reload (or a shared link) would show exactly this list.',
    mistake: 'Writing the query string into the route path, `path="/tasks?done=:done"`. Route paths never include the query string (React Router matches only the path), so this route never matches. Keep `path="/tasks"` and read the filter with `useSearchParams`.' },

  { id: 'not-found-route', hub: 'routes', topic: 'matching',
    title: 'The catch-all route: a 404 page',
    summary: 'A route with `path="*"` matches **any** URL, but it has the lowest score, so it only renders when no other route matches. Use it for a "Page not found" screen instead of a blank page.',
    body: [
      'Without a catch-all, a mistyped URL or an old link shows an empty page: React Router renders nothing and only logs `No routes matched location "/tsks"` in the console, which users never see. A catch-all is the "no such address" desk: `<Route path="*" element={<NotFound />} />` with a short message and a link back to somewhere useful.',
      'Because of [ranking](#/browser/routing/route-ranking), its position in the list does not matter: `*` loses to every other matching path. Place it **inside** the layout route so the header and navigation stay on the not-found page. A splat can also sit under a path: `path="docs/*"` matches everything below `/docs`, and the rest of the URL is in `useParams()[\'*\']`.',
      'There is a second kind of "not found": the URL is valid but the **data** is missing, such as `/tasks/999` when task 999 does not exist. The route matched, so the catch-all cannot help; the page itself must handle the API\'s `404` and show a message (see [Loading data for a route](#/browser/routing/data-per-route)). The server makes the same distinction (see [The 404 catch-all](#/server/routes/not-found)).',
    ],
    code: `<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="tasks" element={<TaskList />} />
    <Route path="tasks/:id" element={<TaskDetail />} />
    <Route path="*" element={<NotFound />} />     {/* last resort, inside the layout */}
  </Route>
</Routes>

function NotFound() {
  const location = useLocation();
  return (
    <section>
      <h1>Page not found</h1>
      <p>Nothing lives at <code>{location.pathname}</code>.</p>
      <Link to="/tasks">Back to your tasks</Link>
    </section>
  );
}`,
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Add a catch-all in the router simulator (challenge 5)' },
    example: 'With the routes above, `/tsks` and `/tasks/7/oops` both render `AppLayout` with `NotFound` in its outlet: neither matches a real route (`/tasks/:id` takes exactly one segment after `tasks`), so only `*` is left.',
    mistake: 'Redirecting unknown URLs to the home page with `<Route path="*" element={<Navigate to="/" />} />`. The user who mistyped never learns that the page does not exist, and a broken link in your own app becomes impossible to notice. Show a real not-found page.' },

  /* ---- 3. Nested routes and layouts ---------------------------------------------------- */
  { id: 'nested-routes', hub: 'layouts', topic: 'layouts',
    title: 'Nested routes and layouts: <Outlet />',
    summary: 'Routes can contain routes. The parent route\'s element is a **layout** (header, navigation, sidebar) and renders `<Outlet />` where the matching child goes. The layout stays mounted while the user moves between its children; only the outlet\'s content changes.',
    body: [
      'Think of a picture frame on a wall: the frame (the layout) stays, and you swap the picture inside it (the child route). Nesting `<Route>` elements describes this: for `/tasks/7`, React Router finds the branch "root layout → tasks layout → task detail" and renders each level, each one placing the next in its `<Outlet />`. The outlet works like `children` (see [children](#/browser/components/children)), except that the router chooses what goes in it from the URL.',
      'Paths of child routes are **relative** to their parent: inside `<Route path="tasks">`, `path=":id"` means `/tasks/:id` (an absolute child path is allowed only if it starts with the parent\'s full path). A parent route may have **no path** at all: `<Route element={<AppLayout />}>` wraps its children with the layout without adding anything to the URL, which is how you put a layout (or a guard) around a group of unrelated URLs.',
      'Because the layout is not unmounted, its state survives navigation: an open menu, a search box in the header, a scroll position in the sidebar. Its effects do not re-run either, so data the layout loads once (the user\'s name) is loaded once. Links inside nested routes can be relative too: in `/tasks/7`, `<Link to="edit">` goes to `/tasks/7/edit` and `<Link to="..">` to the parent route.',
    ],
    code: `// App.jsx: the route tree mirrors the screen tree
<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="tasks" element={<TasksLayout />}>
      <Route index element={<TaskList />} />
      <Route path=":id" element={<TaskDetail />} />
    </Route>
  </Route>
</Routes>

// AppLayout.jsx: drawn on every page
import { Outlet, NavLink } from 'react-router';

export default function AppLayout() {
  return (
    <>
      <header>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />              {/* the matching child route renders here */}
      </main>
    </>
  );
}`,
    live: { kind: 'react', code: `import { useState } from 'react';

// Hand-made nesting: the layout receives the child page as "outlet"
// (in React Router it would write <Outlet /> instead).
function AppLayout({ outlet, go }) {
  const [note, setNote] = useState('');
  return (
    <div style={{ border: '2px solid teal', padding: 8 }}>
      <header>
        <strong>Tasks app</strong>{' '}
        <button onClick={() => go('/')}>Home</button>
        <button onClick={() => go('/tasks')}>Tasks</button>
        <button onClick={() => go('/tasks/2')}>Task 2</button>
        <p><input placeholder="Type here, then navigate" value={note}
          onChange={(e) => setNote(e.target.value)} /></p>
      </header>
      <main style={{ border: '2px dashed orange', padding: 8 }}>{outlet}</main>
    </div>
  );
}

function App() {
  const [path, setPath] = useState('/tasks');
  let page = <p>Not found</p>;
  if (path === '/') page = <h2>Home</h2>;
  else if (path === '/tasks') page = <h2>All tasks</h2>;
  else if (path.startsWith('/tasks/')) page = <h2>Task {path.split('/')[2]}</h2>;
  return <AppLayout outlet={page} go={setPath} />;
}` },
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Nest pages in a layout in the router simulator (challenge 3)' },
    example: 'In the box, type something in the header\'s input, then click Home, Tasks and Task 2: only the dashed area (the outlet) changes and your text stays, because `AppLayout` is never unmounted. With every page rendering its own copy of the header, the input would be recreated, and emptied, on every click.',
    mistake: 'Nesting the routes but forgetting `<Outlet />` in the parent\'s element. The URL changes, the parent renders, and the child silently does not appear: there is no error, the router simply has nowhere to put it. If a child route "does not work", check that every element on the way down renders an outlet.' },

  { id: 'index-routes', hub: 'layouts', topic: 'layouts',
    title: 'Index routes: the default child',
    summary: 'An **index route**, `<Route index element={<TaskList />} />`, renders in its parent\'s outlet when the URL is exactly the parent\'s path. It has no path of its own: it fills the outlet at `/tasks`, while `/tasks/7` shows another child.',
    body: [
      'A layout route with children has a gap at its own URL. With `<Route path="tasks" element={<TasksLayout />}>` and only a `:id` child, `/tasks/7` shows the layout and the task, but `/tasks` shows the layout with an **empty** outlet. The index route is the answer to "what goes in the outlet when no child path is added": the list of tasks, a dashboard, a "pick a task on the left" message.',
      'Index routes get a small bonus in the ranking (+2), so at `/tasks` the branch "layout + index" beats the layout alone. An index route cannot have children (it is a leaf), and it should not have a path. A route can have at most one meaningful index child; it is commonly the first child, for readability.',
      'Two uses at the root: `<Route index element={<Home />} />` inside the root layout gives the home page its header and navigation. And `<Route index element={<Navigate to="tasks" replace />} />` makes `/tasks` the real start page (see [Push or replace](#/browser/routing/push-vs-replace) for `replace`).',
    ],
    code: `<Route path="tasks" element={<TasksLayout />}>
  <Route index element={<TaskList />} />     {/* /tasks */}
  <Route path="new" element={<NewTask />} />  {/* /tasks/new */}
  <Route path=":id" element={<TaskDetail />} />  {/* /tasks/7 */}
</Route>`,
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Fill an empty outlet in the router simulator (challenge 4)' },
    example: 'With the routes above, `/tasks` renders `TasksLayout` with `TaskList` in the outlet. Remove the index route and `/tasks` still matches (the parent has a path), but the outlet is empty: the layout\'s title and buttons with a blank area below.',
    mistake: 'Giving the index route the parent\'s path again, `<Route path="tasks" element={<TaskList />} />` inside `<Route path="tasks">`. Child paths are relative, so this child lives at `/tasks/tasks`, and `/tasks` still has an empty outlet. Use `index`.' },

  /* ---- 4. Navigating -------------------------------------------------------------------- */
  { id: 'link-vs-a', hub: 'navigation', topic: 'navigation',
    title: '<Link> instead of <a href>',
    summary: 'Inside the app, navigate with `<Link to="/tasks">`. It renders a normal `<a href>` (so it is accessible and can be opened in a new tab), but a click is handled by the router: no page load, no request, the app\'s state is kept. A plain `<a href="/tasks">` reloads the whole app.',
    body: [
      'A plain link is an order to the browser: "leave this document and load that one". The browser obeys, throws away the running app (every piece of state, the logged-in user if it was only in memory, the half-filled form) and downloads and starts the app again. `<Link>` intercepts the click, cancels the browser\'s navigation (`preventDefault`) and calls the router\'s navigate function: `pushState`, then render the matching route. The page never reloads.',
      'Because `<Link>` renders a real `<a>` with a real `href`, everything users expect from links still works: Ctrl/Cmd-click or middle-click opens a new tab (the router lets the browser handle those), the URL shows on hover, screen readers announce a link, and the link can be focused with Tab. Use buttons for actions (save, delete, open a dialog) and links for going somewhere.',
      '`<NavLink>` is a `<Link>` that knows whether it points at the current page: it adds the class `active` and `aria-current="page"`, so the navigation bar can highlight where the user is. By default a NavLink is active for its URL **and everything below it** (`/tasks` is active at `/tasks/7`); add `end` to require an exact match, which the link to `/` always needs. Links to other sites stay plain `<a href="https://…">`.',
    ],
    code: `import { Link, NavLink } from 'react-router';

function NavBar() {
  return (
    <nav aria-label="Main">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/tasks">Tasks</NavLink>
      <NavLink to="/tasks/new" className={({ isActive }) => (isActive ? 'tab current' : 'tab')}>
        New task
      </NavLink>
    </nav>
  );
}

// In a list: a link per item, built from the data
<li key={task.id}><Link to={'/tasks/' + task.id}>{task.title}</Link></li>

/* CSS: highlight the current page */
/* nav a.active, nav a[aria-current="page"] { font-weight: 700; border-bottom: 3px solid; } */`,
    live: { kind: 'react', code: `import { useState } from 'react';

// Simulated: a full page load is a new start of the app,
// imitated here by giving the app a new key (React remounts it from zero).
function TheApp({ path, go, fullLoad }) {
  const [clicks, setClicks] = useState(0);         // state kept in memory
  return (
    <>
      <p>State in memory: <strong>{clicks}</strong>{' '}
        <button onClick={() => setClicks(clicks + 1)}>+1</button></p>
      <p>
        <button onClick={() => go('/tasks')}>{'<Link to="/tasks">'}</button>{' '}
        <button onClick={() => fullLoad('/tasks')}>{'<a href="/tasks">'}</button>{' '}
        <button onClick={() => go('/')}>{'<Link to="/">'}</button>
      </p>
      <p>Page: <code>{path}</code></p>
    </>
  );
}

function App() {
  const [path, setPath] = useState('/');
  const [loads, setLoads] = useState(1);
  function fullLoad(to) {
    setPath(to);
    setLoads(loads + 1);                           // the browser starts the app again
  }
  return (
    <>
      <p>Page loads (requests for index.html): {loads}</p>
      <TheApp key={loads} path={path} go={setPath} fullLoad={fullLoad} />
    </>
  );
}` },
    example: 'In the box, press +1 a few times, then use the two "Link" buttons: the page changes and the counter stays. Press the `<a href>` button: "Page loads" goes up and the counter is back to 0, because the whole app started again, which is what a real `<a href>` inside an SPA does to all its state.',
    mistake: 'Using `<button onClick={() => navigate(\'/tasks/\' + id)}>` for plain navigation in a list. It works with a mouse, but the user cannot open the task in a new tab, cannot see where it leads, and assistive technology announces a button, not a link. If clicking it goes somewhere, it is a `<Link>`.' },

  { id: 'use-navigate', hub: 'navigation', topic: 'navigation',
    title: 'Navigating from code: useNavigate',
    summary: '`const navigate = useNavigate()` gives a function that changes the URL from code: `navigate(\'/tasks/12\')` after a form is saved, `navigate(\'/login\')` after logging out, `navigate(-1)` for "back". Use it when the navigation is the **result of an action**, not a place the user clicks.',
    body: [
      'Links are for "go there"; `navigate` is for "this happened, so now go there". The typical moment is the end of an event handler: the form was submitted, the API answered 201 with the new task, now show it with `navigate(\'/tasks/\' + created.id)`. Other examples: after log-in, after log-out, after deleting the item being viewed, and on a `401` from the API (see [Handling 401](#/browser/data-fetching/handle-401)).',
      'The call takes the same kinds of target as a `<Link>`: an absolute path (`\'/tasks\'`), a path relative to the current route (`\'edit\'`, `\'..\'`), or a number to move in the history (`-1` is Back). Options go in a second argument: `{ replace: true }` overwrites the current history entry instead of adding one, and `{ state: { … } }` attaches data to the new entry that the next page can read with `useLocation().state`.',
      'Call `navigate` in **event handlers** and effects, never in the body of a component while it renders: navigating is a side effect, and React Router warns "You should call navigate() in a React.useEffect(), not when your component is first rendered". To redirect as part of rendering ("this page is not for you"), render the `<Navigate to="…" />` component instead.',
    ],
    live: { kind: 'react', code: `import { useState } from 'react';

// Hand-made: the history is an array of URLs; navigate() adds one (push)
// or overwrites the last one (replace). This toy Back forgets the forward page.
function App() {
  const [stack, setStack] = useState(['/tasks', '/tasks/new']);
  const [tasks, setTasks] = useState([{ id: 1, title: 'Buy milk' }]);
  const [title, setTitle] = useState('');
  const path = stack[stack.length - 1];
  const navigate = (to, { replace = false } = {}) =>
    setStack((s) => (replace ? [...s.slice(0, -1), to] : [...s, to]));

  function handleSubmit(e) {
    e.preventDefault();
    const task = { id: tasks.length + 1, title };
    setTasks([...tasks, task]);
    setTitle('');
    navigate('/tasks/' + task.id);                 // try { replace: true }
  }

  let page = <ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
  if (path === '/tasks/new') page = (
    <form onSubmit={handleSubmit}>
      <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
      <button>Save</button>
    </form>
  );
  else if (path !== '/tasks') page = <h2>{tasks.find((t) => '/tasks/' + t.id === path)?.title}</h2>;
  return (
    <>
      <p><button onClick={() => setStack((s) => s.slice(0, -1))} disabled={stack.length < 2}>Back</button>{' '}
        <code>{path}</code></p>
      {page}
      <p>History: {stack.join(' → ')}</p>
    </>
  );
}` },
    example: 'In the box, save a task called "Call Ana": the app shows it at `/tasks/2` and the history is `/tasks → /tasks/new → /tasks/2`. Press Back: you land on the empty form again, which is rarely what users want. Change the call to `navigate(\'/tasks/\' + task.id, { replace: true })` and repeat: the form\'s entry is overwritten, and Back goes straight to the list.',
    mistake: 'Navigating before the work is done: `api.createTask(values); navigate(\'/tasks\');` without `await`. The list page mounts and fetches while the POST is still on its way, so the new task is missing, and if the POST fails the user never sees the error. `await` the request, check it succeeded, then navigate.' },

  { id: 'push-vs-replace', hub: 'navigation', topic: 'navigation',
    title: 'Push or replace: what the Back button will do',
    summary: 'Every navigation either **pushes** a new history entry (Back returns to the current page) or **replaces** the current one (Back skips it). Use `replace` for pages the user should not come back to: redirects, the log-in page after logging in, a form after it was saved.',
    body: [
      'The history is a stack of pages with a pointer. **Push** cuts off anything after the pointer, puts the new URL on top and moves the pointer there. **Replace** writes the new URL over the current entry, so the stack does not grow. Choose by asking "if the user presses Back on the next page, should they see this one again?" A list → detail click: yes, push. A redirect from `/` to `/tasks`: no, otherwise Back takes them to `/`, which immediately sends them to `/tasks` again.',
      'That second case is the **Back-button trap**, and redirects cause it. A guard sends a logged-out user from `/settings` to `/login`; with push, the history is `/tasks → /settings → /login`. Back goes to `/settings`, which redirects to `/login` again: the user cannot leave by pressing Back. With `<Navigate to="/login" replace />` the history is `/tasks → /login`, and Back works.',
      'The same thinking applies after logging in. `navigate(from, { replace: true })` overwrites the `/login` entry with the page the user wanted, so Back from it does not show the log-in form to someone who is already logged in. In React Router, `replace` exists on `<Navigate replace>`, `<Link replace>`, `navigate(to, { replace: true })` and `setSearchParams(params, { replace: true })`.',
    ],
    table: { caption: 'History after logging in: the user started on /tasks and clicked Settings',
      head: ['Guard', 'After log-in', 'History', 'Back from /settings goes to'],
      rows: [
        ['push', 'push', '`/tasks` → `/settings` → `/login` → `/settings`', '`/login` (the form, already logged in)'],
        ['replace', 'push', '`/tasks` → `/login` → `/settings`', '`/login`'],
        ['push', 'replace', '`/tasks` → `/settings` → `/settings`', '`/settings` (nothing seems to happen)'],
        ['replace', 'replace', '`/tasks` → `/settings`', '`/tasks`'],
      ] },
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Make Back skip the log-in page (router simulator, challenge 8)' },
    example: 'In the router simulator, open challenge 8: both switches start off. Click Settings while logged out, log in, then press Back and watch the history stack: you land on `/login`. Switch on the guard\'s replace and the log-in replace, run the story again, and Back returns to `/tasks`.',
    mistake: 'Using `replace` everywhere "to keep the history clean". Then Back skips pages the user did want: from a task\'s detail, Back leaves the app instead of returning to the list. Push is the default for a reason; replace only the entries that should not be revisited.' },

  /* ---- 5. Protected routes and data ---------------------------------------------------- */
  { id: 'protected-routes', hub: 'guards', topic: 'guards',
    title: 'Protected routes: a guard component',
    summary: 'A **protected route** renders its page only for a logged-in user. It is a small wrapper component, often called `RequireAuth`: it reads the auth state and renders the page (or `<Outlet />`), or `<Navigate to="/login" replace />` when nobody is logged in.',
    body: [
      'A guard is the receptionist in front of the offices: logged in, you go through; otherwise you are sent to the front desk, the log-in page. In React it is an ordinary component that decides what to render. It reads the user from wherever the app keeps authentication, usually a context shared by every page (see [Shared state](#/browser/shared-state)), and either returns its `children` or a `<Navigate>` element, which navigates as soon as it renders.',
      'There are two ways to place it. Wrap one page: `element={<RequireAuth><Settings /></RequireAuth>}`. Or make it a **pathless layout route** and nest every private route inside it, `<Route element={<RequireAuth />}>…</Route>`, where the guard renders `<Outlet />`. Never put the log-in page behind the guard: a logged-out user would be sent from `/login` to `/login` forever.',
      'A guard on the front end is about **user experience**, not security. Anyone can open the developer tools and render the settings page, or call the API directly. What protects the data is the server, which checks the token on every request and answers `401` or `403` (see [Authentication and security](#/server/auth)). The guard just avoids showing a page that would fail, and sends the user to log in first.',
    ],
    code: `// RequireAuth.jsx
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <p>Loading…</p>;                  // still reading the saved token
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;     // wraps one page, or a group of child routes
}

// App.jsx
<Route path="/" element={<AppLayout />}>
  <Route index element={<Home />} />
  <Route path="login" element={<Login />} />               {/* public, never guarded */}
  <Route element={<RequireAuth />}>                         {/* every route inside is private */}
    <Route path="tasks/new" element={<NewTask />} />
    <Route path="tasks/:id/edit" element={<EditTask />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Route>`,
    live: { kind: 'react', code: `import { useEffect, useState } from 'react';

// Hand-made pieces that imitate React Router: the location in state,
// a <Navigate> that redirects once it renders, and a guard.
function Navigate({ to, state, navigate }) {
  useEffect(() => { navigate(to, { state }); }, [to]);
  return null;
}

function RequireAuth({ user, location, navigate, children }) {
  if (!user) return <Navigate to="/login" state={{ from: location.path }} navigate={navigate} />;
  return children;
}

function App() {
  const [location, setLocation] = useState({ path: '/', state: null });
  const [user, setUser] = useState(null);
  const navigate = (path, opts = {}) => setLocation({ path, state: opts.state ?? null });

  let page = <h2>Home (public)</h2>;
  if (location.path === '/settings') page = (
    <RequireAuth user={user} location={location} navigate={navigate}>
      <h2>Settings of {user?.name}</h2>
    </RequireAuth>
  );
  if (location.path === '/login') page = (
    <button onClick={() => { setUser({ name: 'Ana' }); navigate(location.state?.from ?? '/'); }}>
      Log in as Ana
    </button>
  );
  return (
    <>
      <nav>
        <button onClick={() => navigate('/')}>Home</button>{' '}
        <button onClick={() => navigate('/settings')}>Settings</button>{' '}
        {user && <button onClick={() => setUser(null)}>Log out</button>}
      </nav>
      <p>URL <code>{location.path}</code> · state <code>{JSON.stringify(location.state)}</code> · user: {user ? user.name : 'nobody'}</p>
      {page}
    </>
  );
}` },
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Protect two pages in the router simulator (challenge 7)' },
    example: 'In the box, click Settings while logged out: the guard renders the redirect, the URL becomes `/login` and the state remembers `{"from":"/settings"}`. Log in: you land on Settings. Click Log out while on Settings: the guard runs again and sends you back to `/login`.',
    mistake: 'Starting the auth state as "logged out" and restoring the saved token in an effect. On a refresh of `/settings`, the first render has no user yet, the guard redirects to `/login`, and only then does the effect find the token: logged-in users are thrown out on every reload. Read the token synchronously in the initial state (`useState(() => localStorage.getItem(\'token\'))`), or keep a `checking` flag and render "Loading…" until it is known, as the code above does.' },

  { id: 'redirect-after-login', hub: 'guards', topic: 'guards',
    title: 'Back to where you were after log-in',
    summary: 'When the guard redirects, it stores the page the user wanted in the navigation **state**: `<Navigate to="/login" replace state={{ from: location }} />`. After a successful log-in, the log-in page reads it with `useLocation().state?.from` and navigates there, with `replace`.',
    body: [
      'Picture a cloakroom ticket. The guard takes the user\'s destination and hands over a ticket (`state.from`); the log-in page reads the ticket and sends the user to the right place. Without it, every log-in lands on the home page and users must find their way back to the link they had opened, a small annoyance that becomes a real one with shared links.',
      'History **state** is data attached to a history entry, invisible in the URL: it survives a refresh of that entry, but not a URL typed by hand or a shared link. So `from` must always have a fallback, `location.state?.from?.pathname ?? \'/\'`. Include `search` too if the page had a query string (`from.pathname + from.search`), so `/tasks?page=3` does not come back as `/tasks`.',
      'Navigate after the log-in has **succeeded**: `await login(email, password)` (which calls the API and stores the token, see [The log-in request](#/browser/data-fetching/login-request)), then `navigate(from, { replace: true })`. With `replace`, the log-in page disappears from the history (see [Push or replace](#/browser/routing/push-vs-replace)). If the log-in fails, stay on the page and show the error.',
    ],
    code: `// Login.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from './AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from ? from.pathname + from.search : '/tasks';
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await login(form.get('email'), form.get('password'));
      navigate(target, { replace: true });            // back where they wanted to go
    } catch (err) {
      setError(err.message);                          // stay here and explain
    }
  }
  return (
    <form onSubmit={handleSubmit}>
      {from && <p>Log in to see {from.pathname}.</p>}
      {/* email and password fields, the error, a submit button */}
    </form>
  );
}`,
    practice: ROUTER_SIM,
    example: 'A colleague sends a link to `/tasks/12/edit`. Logged out, the user opens it: the guard redirects to `/login` with `state.from` = `{ pathname: \'/tasks/12/edit\', search: \'\' }`, and the form says "Log in to see /tasks/12/edit". After logging in, `navigate(\'/tasks/12/edit\', { replace: true })` opens the edit page, and Back leaves for the page they came from, not the log-in form.',
    mistake: 'Putting the destination in the query string, `/login?next=/tasks/12`, and navigating to it without checking. Anyone can then craft a log-in link that sends users to `?next=https://evil.example` after logging in (an "open redirect"). Prefer history state, or accept only paths that start with a single `/`.' },

  { id: 'data-per-route', hub: 'guards', topic: 'guards',
    title: 'Loading data for a route',
    summary: 'A page for one resource reads the param (`useParams()`) and fetches that resource in an **effect with the param in its dependencies**: `useEffect(…, [id])`. When the user moves from `/tasks/1` to `/tasks/2`, the same component stays mounted, so only the dependency makes it fetch again.',
    body: [
      'The URL decides **what** to show; the page component decides **how** to get it. The detail page is the standard case: `const { id } = useParams();` then an effect that fetches `/api/tasks/` + id and keeps the usual loading / error / data states (see [The four states of a request](#/browser/state-effects/four-ui-states)). Each route\'s page loads its own data; the list page does not pass its tasks to the detail page, because the detail page must also work when opened directly from a link.',
      'Why `[id]` and not `[]`: when the user clicks from task 1 to task 2, React Router renders the **same** `TaskDetail` element at the same place in the tree, so React keeps the component mounted and only its params change. With `[]` the effect ran once, for task 1, and the page keeps showing task 1 under the URL `/tasks/2`. With `[id]`, the effect runs again for every new id (see [The dependency array](#/browser/state-effects/dependency-array)), and its cleanup ignores the answer for the old id if it arrives late (see [Race conditions](#/browser/data-fetching/race-conditions)).',
      'Handle the answers that are specific to a URL: `404` (the task was deleted, or the id was mistyped) deserves a "This task does not exist" message with a link to the list, not a generic error; `400` usually means the param is not a valid id; and `401` on a private page means the session expired. React Router\'s data mode can move the fetch into a route `loader` (`loader: ({ params }) => …`, read with `useLoaderData()`), which starts it before the page renders; the rules about ids and errors are the same.',
    ],
    live: { kind: 'react', api: true, code: `import { useEffect, useState } from 'react';

function TaskDetail({ id }) {        // in React Router: const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let ignore = false;
    setTask(null);
    setError(null);
    fetch('/api/tasks/' + id)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(res.status === 404 ? 'This task does not exist.' : body.error);
        return body;
      })
      .then((t) => { if (!ignore) setTask(t); })
      .catch((e) => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };   // a newer id arrived: ignore this answer
  }, [id]);                             // a new id in the URL → fetch again
  if (error) return <p role="alert">Task {id}: {error}</p>;
  if (!task) return <p>Loading task {id}…</p>;
  return <h2>#{task.id} {task.title} {task.done ? '(done)' : ''}</h2>;
}

function App() {
  const [path, setPath] = useState('/tasks/1');
  const id = path.split('/')[2];
  return (
    <>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['1', '2', '3', '999', 'abc'].map((n) => (
          <button key={n} onClick={() => setPath('/tasks/' + n)}>/tasks/{n}</button>
        ))}
      </nav>
      <p>URL: <code>{path}</code></p>
      <TaskDetail id={id} />
    </>
  );
}` },
    example: 'In the box, click through `/tasks/1`, `/tasks/2` and `/tasks/3`: each click shows "Loading…" then the task, because `id` changed and the effect ran again (the console lists one request per click). `/tasks/999` shows "This task does not exist." (the API answered 404) and `/tasks/abc` the API\'s validation error (400). Change `[id]` to `[]` and click around: the URL changes, the task does not.',
    mistake: 'Fetching all tasks on the detail page and picking one, `tasks.find((t) => t.id === id)`, or relying on the list page to pass the task in navigation state. The first downloads everything to show one item (and compares a number with the string param); the second breaks as soon as someone opens `/tasks/7` from a bookmark. Fetch the one resource the URL names.' },
];

DATA.en.ROUTING_QUIZ = [
  /* ---- spa ---- */
  { type: 'mc', topic: 'spa', q: 'In a single-page app, the user clicks a link from the task list to "Task 7". What does the browser request from the server?',
    choices: ['A new HTML page for `/tasks/7`', 'Nothing for the page; at most the task\'s data, such as `GET /api/tasks/7`', 'The whole JavaScript bundle again', '`index.html` again, then the data'],
    answer: 1, why: 'After the first load, the router draws the new screen in the browser. Only data travels, as JSON.' },
  { type: 'tf', topic: 'spa', q: '`history.pushState(null, \'\', \'/tasks\')` changes the address bar and immediately shows the tasks page.',
    answer: false, why: 'It only records the new URL in the history. Drawing the matching screen is the router\'s job, right after the call.' },
  { type: 'fib', topic: 'spa', q: 'When the user presses Back on an entry created with `pushState`, the browser fires the ___ event on `window`.',
    accept: ['popstate'], why: 'A router listens to `popstate`, reads `location.pathname` and draws that screen.' },
  { type: 'mc', topic: 'spa', q: 'Clicking around a deployed React app works, but refreshing `/tasks/7` shows "404 Not Found". What is missing?',
    choices: ['A `<Route path="*">` in the app', 'The server must answer every app path with `index.html`', 'A `key` on the `<Routes>` element', '`npm run build` was not run'],
    answer: 1, why: 'A refresh asks the server for `/tasks/7`. Without the SPA fallback, the server looks for a file of that name and answers 404 before the app even loads.' },
  { type: 'tf', topic: 'spa', q: 'The Vite development server already answers unknown paths with `index.html`, so the refresh problem often appears only after deploying.',
    answer: true, why: 'Vite (and `vite preview`) include the SPA fallback; static hosts and plain file servers need it configured.' },
  { type: 'mc', topic: 'spa', q: 'Why do hash URLs (`/#/tasks/7`) work on any static host without configuration?',
    choices: ['Hosts treat `#` as a wildcard', 'The part after `#` is never sent to the server, which always receives the same path', 'Browsers cache hash pages forever', 'React Router converts them to query strings'],
    answer: 1, why: 'The fragment stays in the browser. The server sees `GET /` for every screen of the app.' },
  { type: 'mc', topic: 'spa', q: 'An Express server serves a built React app with a fallback `app.get(\'*\', send index.html)` placed **before** the API routes. What happens to `fetch(\'/api/tasks\')`?',
    choices: ['It works as before', 'It receives `index.html`, and `res.json()` fails with "Unexpected token \'<\'"', 'It gets a 404', 'Express throws at start-up'],
    answer: 1, why: 'The fallback answers first. Register the API and the static files first, and exclude `/api/` from the fallback.' },
  { type: 'tf', topic: 'spa', q: 'In a multi-page site, the JavaScript variables of the current page survive when the user follows a link to another page.',
    answer: false, why: 'Each link loads a new document; the old page and everything in its memory are thrown away.' },

  /* ---- matching ---- */
  { type: 'mc', topic: 'matching', q: 'Which URL does `<Route path="/tasks/:id" … />` match?',
    choices: ['`/tasks`', '`/tasks/7/edit`', '`/Tasks/7/`', '`/tasks/`'],
    answer: 2, why: 'Matching ignores case and a trailing slash. `:id` needs exactly one non-empty segment, so the other three do not match.' },
  { type: 'mc', topic: 'matching', q: 'Routes are written in this order: `/tasks/:id`, then `/tasks/new`. Which renders for `/tasks/new`?',
    choices: ['The `:id` route, because it comes first', 'The `new` route, because a static segment ranks higher', 'Both', 'Neither: React Router reports a conflict'],
    answer: 1, why: 'React Router ranks matching paths: `new` scores 10, `:id` 3. Order only breaks ties between siblings with equal scores.' },
  { type: 'mc', topic: 'matching', q: 'For the URL `/tasks/7` and `path="/tasks/:id"`, what is `useParams()`?',
    choices: ['`{ id: 7 }`', '`{ id: \'7\' }`', '`[\'7\']`', '`\'7\'`'],
    answer: 1, why: 'An object with one key per param; values are strings, because URLs are text.' },
  { type: 'tf', topic: 'matching', q: '`tasks.find((t) => t.id === id)`, with `id` from `useParams()` and numeric ids in the data, finds the task.',
    answer: false, why: '`7 === \'7\'` is false. Convert first: `Number(id)`.' },
  { type: 'mc', topic: 'matching', q: 'On `/tasks?done=false&page=2`, what does `searchParams.get(\'page\')` return?',
    choices: ['`2`', '`\'2\'`', '`[\'2\']`', '`undefined`'],
    answer: 1, why: 'Query values are strings; a missing key gives `null`. Convert with `Number(searchParams.get(\'page\') ?? 1)`.' },
  { type: 'tf', topic: 'matching', q: '`<Route path="/tasks?done=:done" … />` lets the router choose a route by the query string.',
    answer: false, why: 'Route paths never contain the query string. Match `/tasks` and read the query with `useSearchParams`.' },
  { type: 'fib', topic: 'matching', q: 'A route whose path is ___ matches any URL that no other route matches, and is used for a "Page not found" screen.',
    accept: ['*', '"*"', "'*'", '/*'], why: 'The splat has the lowest score, so it only wins when nothing else matches.' },
  { type: 'mc', topic: 'matching', q: 'What does `<Route exact path="/" component={Home} />` render with React Router 6 or 7?',
    choices: ['`Home`, only at `/`', '`Home` on every page', 'Nothing: `component` is an old prop that is ignored', 'An error at start-up'],
    answer: 2, why: 'These are React Router 5 props. Current versions use `element={<Home />}`, and every path is exact unless it ends in `/*`.' },
  { type: 'mc', topic: 'matching', q: 'Where should the router (`<BrowserRouter>`) be placed?',
    choices: ['Inside each page that uses links', 'Once, at the top of the app, around everything that uses routes, links or navigation hooks', 'Inside `<Routes>`', 'Only around the navigation bar'],
    answer: 1, why: 'Hooks like `useNavigate` and `useParams` only work inside a router, so it goes at the top, once.' },

  /* ---- layouts ---- */
  { type: 'mc', topic: 'layouts', q: 'In a parent route\'s element, what does `<Outlet />` do?',
    choices: ['Opens the page in a new tab', 'Marks where the matching child route renders', 'Lists all child routes as links', 'Reloads the child route'],
    answer: 1, why: 'The parent is a layout; the outlet is the slot the router fills with the matching child.' },
  { type: 'tf', topic: 'layouts', q: 'When the user goes from `/tasks/1` to `/tasks/2`, a layout route rendered at `/tasks` is unmounted and mounted again.',
    answer: false, why: 'The layout matches both URLs, so it stays mounted (keeping its state); only the content of its outlet changes.' },
  { type: 'mc', topic: 'layouts', q: 'Inside `<Route path="tasks" element={<TasksLayout />}>`, which child renders at exactly `/tasks`?',
    choices: ['`<Route path="tasks" element={<TaskList />} />`', '`<Route index element={<TaskList />} />`', '`<Route path="*" element={<TaskList />} />`', '`<Route path=":id" element={<TaskList />} />`'],
    answer: 1, why: 'The index route fills the outlet at the parent\'s own URL. A child `path="tasks"` would live at `/tasks/tasks`.' },
  { type: 'mc', topic: 'layouts', q: 'A child route is defined and the URL matches it, but only the parent layout shows. The most likely cause?',
    choices: ['The child needs `exact`', 'The parent\'s element does not render `<Outlet />`', 'Child routes need absolute paths', 'The child must be listed first'],
    answer: 1, why: 'Without an outlet the router has nowhere to put the child, and it does not report an error.' },
  { type: 'fib', topic: 'layouts', q: 'Inside `<Route path="tasks">`, a child with `path=":id/edit"` matches the full URL `/tasks/7/___`.',
    accept: ['edit'], why: 'Child paths are relative to their parent: `tasks` + `:id/edit`.' },
  { type: 'tf', topic: 'layouts', q: 'A route with an element but no path, `<Route element={<AppLayout />}>…</Route>`, wraps its children in the layout without adding a segment to their URLs.',
    answer: true, why: 'Pathless layout routes group routes for a shared layout (or a guard) without changing the URLs.' },
  { type: 'mc', topic: 'layouts', q: 'Where should the catch-all `*` route go so that the not-found page keeps the header and navigation?',
    choices: ['Outside every layout, at the top level', 'Inside the root layout route, next to the other pages', 'First in the list', 'In a separate `<Routes>`'],
    answer: 1, why: 'Inside the layout route it renders in the layout\'s outlet. Its position among the siblings does not matter, thanks to ranking.' },
  { type: 'tf', topic: 'layouts', q: 'An index route can have its own child routes.',
    answer: false, why: 'Index routes are leaves: React Router throws "An index route cannot have child routes".' },

  /* ---- navigation ---- */
  { type: 'mc', topic: 'navigation', q: 'Inside a React app, what is the difference between `<a href="/tasks">` and `<Link to="/tasks">`?',
    choices: ['None: `Link` is a styled `a`', '`<a href>` reloads the whole page and the app restarts; `<Link>` changes the URL through the router and keeps the app running', '`<Link>` cannot be opened in a new tab', '`<a href>` does not change the URL'],
    answer: 1, why: '`Link` renders an `<a>`, but intercepts normal clicks and navigates with the History API.' },
  { type: 'mc', topic: 'navigation', q: 'After a form creates a task and the API answers 201, how do you show the new task?',
    choices: ['`<Link to={\'/tasks/\' + created.id} />` returned from the handler', '`navigate(\'/tasks/\' + created.id)` in the submit handler, after the request succeeded', '`window.location.href = \'/tasks/\' + created.id`', 'Call `navigate` in the body of the component'],
    answer: 1, why: 'Navigation caused by an action belongs in its handler, after the work succeeded. `location.href` would reload the app.' },
  { type: 'fib', topic: 'navigation', q: '`navigate(___)` does the same as the browser\'s Back button.',
    accept: ['-1'], why: 'A number moves through the history: -1 is one step back.' },
  { type: 'mc', topic: 'navigation', q: 'A logged-out user on `/tasks` clicks Settings and the guard redirects with `<Navigate to="/login" />` (no `replace`). On `/login`, they press Back. What happens?',
    choices: ['They return to `/tasks`', 'They go to `/settings`, which redirects them to `/login` again', 'The app crashes', 'Back is disabled'],
    answer: 1, why: 'The redirect pushed `/login` on top of `/settings`. Back returns to `/settings`, whose guard redirects again: a Back-button trap. Use `replace`.' },
  { type: 'tf', topic: 'navigation', q: '`navigate(\'/tasks\', { replace: true })` adds a new entry to the history.',
    answer: false, why: 'It overwrites the current entry, so Back skips the page you were on.' },
  { type: 'mc', topic: 'navigation', q: 'What does `<NavLink to="/tasks">` add when the current URL is `/tasks/7`?',
    choices: ['Nothing: it only matches `/tasks` exactly', 'The class `active` and `aria-current="page"`', 'A `disabled` attribute', 'A redirect to `/tasks`'],
    answer: 1, why: 'By default a NavLink is active for its URL and everything below it; `end` makes it exact (needed for `/`).' },
  { type: 'mc', topic: 'navigation', q: 'Which element should navigate to a task\'s detail page from a list?',
    choices: ['`<button onClick={() => navigate(url)}>`', '`<Link to={url}>`', '`<div onClick={() => navigate(url)}>`', '`<span role="link">`'],
    answer: 1, why: 'It is a navigation, so it is a link: it can be opened in a new tab, shows its target, and is announced as a link.' },
  { type: 'tf', topic: 'navigation', q: 'Calling `navigate(\'/login\')` directly in the body of a component, while it renders, is the recommended way to redirect.',
    answer: false, why: 'Navigation is a side effect. In rendering, return `<Navigate to="/login" replace />`; from code, call `navigate` in a handler or an effect.' },

  /* ---- guards ---- */
  { type: 'mc', topic: 'guards', q: 'What does a `RequireAuth` guard render when nobody is logged in?',
    choices: ['`null`', 'The page, with a warning', '`<Navigate to="/login" replace state={{ from: location }} />`', 'An error boundary'],
    answer: 2, why: 'It redirects to the log-in page, replacing the history entry and remembering where the user wanted to go.' },
  { type: 'tf', topic: 'guards', q: 'A protected route on the front end is enough to keep private data safe.',
    answer: false, why: 'Anyone can bypass front-end code or call the API directly. The server must check the token on every request.' },
  { type: 'mc', topic: 'guards', q: 'Every route of the app, `/login` included, is nested inside `<Route element={<RequireAuth />}>`. What happens to a logged-out user?',
    choices: ['They see the log-in page', 'An endless redirect from `/login` to `/login`', 'They see every page', 'They get a 401 from the server'],
    answer: 1, why: 'The guard protects the page it redirects to. Keep `/login` outside the guarded group.' },
  { type: 'mc', topic: 'guards', q: 'After a successful log-in, which call sends the user to the page they wanted and keeps Back sensible?',
    choices: ['`navigate(\'/\')`', '`navigate(location.state?.from?.pathname ?? \'/\', { replace: true })`', '`navigate(-1)`', '`window.location.reload()`'],
    answer: 1, why: 'The guard stored the destination in `state.from`; `replace` removes the log-in page from the history. Always keep a fallback.' },
  { type: 'tf', topic: 'guards', q: 'Logged-in users are sent to `/login` every time they refresh a private page. A likely cause is an auth state that starts as "no user" and reads the saved token later, in an effect.',
    answer: true, why: 'The guard runs on the first render, before the effect. Read the token in the initial state, or render "Loading…" while checking.' },
  { type: 'mc', topic: 'guards', q: 'A detail page fetches in `useEffect(() => { … fetch(\'/api/tasks/\' + id) … }, [])`. The user clicks from task 1 to task 2. What do they see?',
    choices: ['Task 2', 'Task 1, under the URL `/tasks/2`', 'A loading spinner forever', 'An error'],
    answer: 1, why: 'The same component stays mounted with a new param; with `[]` the effect does not run again. Use `[id]`.' },
  { type: 'fib', topic: 'guards', q: 'To refetch whenever the URL\'s task changes, the effect\'s dependency array is `[___]`.',
    accept: ['id', 'taskId'], why: 'The param read with `useParams()` is the input of the fetch, so it is a dependency.' },
  { type: 'mc', topic: 'guards', q: '`/tasks/999` matches `/tasks/:id`, but the API answers 404. Who shows "This task does not exist"?',
    choices: ['The catch-all `*` route', 'The detail page, from the API\'s 404', 'The server\'s SPA fallback', 'React Router, automatically'],
    answer: 1, why: 'The route matched, so the catch-all is not involved. The page must handle the 404 of its own request.' },
  { type: 'mc', topic: 'guards', q: 'Why should a detail page fetch its own task instead of receiving it from the list page in navigation state?',
    choices: ['State cannot hold objects', 'The page must also work when opened directly from a bookmark or a shared link, where no list page ran', 'Fetching is always faster', 'Navigation state is sent to the server'],
    answer: 1, why: 'Each URL must be able to stand alone. State only exists when the user arrived by that one navigation.' },
];
