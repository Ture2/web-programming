'use strict';
/* Client-side routing: concept cards, rail groups and self-check quiz (React Router as the worked example).
   Cards explain with `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js). */

DATA.en.ROUTING_QUIZ_TOPICS = {
  spa: 'Single-page apps and URLs',
  matching: 'Routes, links and matching',
  layouts: 'Nested routes and layouts',
  navigation: 'Navigating from code',
  guards: 'Protected routes and data',
};

DATA.en.ROUTING_GROUPS = [
  { key: 'spa', label: 'Single-page apps and URLs', icon: 'web' },
  { key: 'routes', label: 'Routes, links and matching', icon: 'route' },
  { key: 'layouts', label: 'Nested routes and layouts', icon: 'tree' },
  { key: 'navigation', label: 'Navigating from code', icon: 'arrow' },
  { key: 'guards', label: 'Protected routes and data', icon: 'lock' },
];

const ROUTER_SIM = { href: '#/browser/routing/practice/router-sim', label: 'Try it in the router simulator' };

DATA.en.ROUTING_CONCEPTS = [
  /* ---- 1. Single-page apps and URLs -------------------------------------------------------- */
  { id: 'mpa-vs-spa', hub: 'spa', topic: 'spa',
    title: 'Multi-page sites and single-page apps',
    summary: 'In a **multi-page site** every link loads a new HTML page from the server; in a **single-page app** (SPA) the server sends one HTML page once, and the app then swaps screens and changes the URL itself, asking the server only for data.',
    html: [
      '<p>A full page load throws away everything the page held: variables, scroll position, a half-typed form. A single-page app loads once, then replaces only the part of the screen that changes. Every screen still needs its own <strong>URL</strong>, or Back, bookmarks, shared links and refresh break; keeping URL and screen in step is the job of a <strong>client-side router</strong>, code in the browser that reads the URL and decides what to show (React has none built in; React Router is the example here).</p>',
      '<table><caption>What happens when the user clicks "Task 7"</caption><thead><tr><th scope="col"></th><th scope="col">Multi-page site</th><th scope="col">Single-page app</th></tr></thead><tbody>'
        + '<tr><th scope="row">Request</th><td><code>GET /tasks/7</code>: a whole HTML page</td><td>None for the page; <code>GET /api/tasks/7</code>: JSON (see <a href="#/browser/data-fetching">Fetching data</a>)</td></tr>'
        + '<tr><th scope="row">Who builds the screen</th><td>The server</td><td>The app, in the browser</td></tr>'
        + '<tr><th scope="row">JavaScript state (variables, forms)</th><td>Lost</td><td>Kept</td></tr>'
        + '<tr><th scope="row">The URL changes because…</th><td>The browser loaded a new document</td><td>The router called <code>history.pushState</code></td></tr>'
        + '<tr><th scope="row">Back button</th><td>The browser loads the previous page</td><td>The router draws the previous screen</td></tr>'
        + '<tr><th scope="row">First visit</th><td>Fast: one ready-made page</td><td>Slower: the bundle must download and run first</td></tr>'
        + '</tbody></table>',
    ],
    example: 'Open the Network tab (see [Watching the conversation: the Network tab](#/http/web/devtools-network)) on a React app and click around: the "Doc" filter shows one request, the first; "Fetch/XHR" shows the JSON calls each screen makes. On a classic multi-page site every click adds a new "Doc" request.',
    mistake: 'Thinking a single-page app has a single URL. A good SPA has as many URLs as screens (`/tasks`, `/tasks/7`, `/tasks/7/edit`); "single page" means the one HTML document the server sends, not the address bar.' },

  { id: 'history-api', hub: 'spa', topic: 'spa',
    title: 'The History API: changing the URL without a request',
    summary: 'The browser\'s **History API** lets JavaScript change the URL without loading a page: `pushState` adds a history entry, `replaceState` overwrites the current one, and the **`popstate`** event fires on Back and Forward. Every client-side router is built on them.',
    html: [
      '<p>Each tab keeps a <strong>history stack</strong>: entries (a URL and an optional <code>state</code> object) and a pointer to the current one. <code>pushState</code> writes a new address into it, and that is all: <strong>nothing is requested and nothing is redrawn</strong>. Drawing the matching screen is the router\'s job.</p>',
      '<dl><dt><code>history.pushState(state, \'\', \'/tasks\')</code></dt><dd>Adds an entry and moves the pointer to it; the address bar shows <code>/tasks</code>. It does <strong>not</strong> fire <code>popstate</code>, so the router renders right after calling it.</dd>'
        + '<dt><code>history.replaceState(…)</code></dt><dd>Overwrites the current entry, for redirects (see <a href="#/browser/routing/push-vs-replace">Push or replace</a>).</dd>'
        + '<dt><code>popstate</code></dt><dd>Fires on <code>window</code> when Back or Forward moves the pointer; the router reads <code>location.pathname</code> and draws that screen.</dd>'
        + '<dt><code>history.back()</code>, <code>history.go(-2)</code></dt><dd>Move the pointer from code.</dd></dl>',
      '<p>React Router wraps all of this, the link\'s <code>preventDefault()</code> included (see <a href="#/browser/dom/prevent-default">preventDefault</a>); you will rarely call these yourself.</p>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'pushState only writes the address; the router draws, and popstate tells it about Back.',
      desc: 'A link is clicked and the router code cancels the page load with preventDefault. It calls pushState, which adds /tasks to the browser history without any request, and then draws the tasks screen itself. Later the user presses Back: the browser history moves its pointer and fires popstate, and the router draws the URL it restored.',
      nodes: [
        { id: 'router', label: 'Router code' },
        { id: 'history', label: 'Browser history', key: true },
      ],
      edges: [
        ['router', 'router', 'link clicked: `preventDefault()`'],
        ['router', 'history', '`pushState(…, \'/tasks\')`'],
        ['router', 'router', 'draws /tasks'],
        ['history', 'history', 'the user presses Back'],
        ['history', 'router', '`popstate`'],
        ['router', 'router', 'draws the restored URL'],
      ],
    },
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
    example: 'With this hand-made router, on `/` the user clicks `<a href="/tasks" data-link>`: the listener cancels the navigation, `pushState` makes the history `[/, /tasks]`, and `render()` draws "All tasks". Back moves the pointer to `/`, fires `popstate`, and `render()` draws "Home". No request reached the server.',
    mistake: 'Expecting `pushState` to show the new page, or to fire `popstate`. It only changes the address bar and the history; without a render afterwards, the URL says `/tasks` while the screen still shows the home page.' },

  { id: 'server-fallback', hub: 'spa', topic: 'spa',
    title: 'Refresh and deep links: every path must return index.html',
    summary: 'A client-side route such as `/tasks/7` exists only inside the app: on a **refresh** or a shared link the browser asks the **server** for `/tasks/7`, so the server must answer every app path with `index.html` (the **SPA fallback**), or the user gets a 404.',
    html: [
      '<p>The router is JavaScript inside <code>index.html</code>, so it only runs once that page has loaded. A refresh, a bookmark or a pasted link starts from zero: the browser sends <code>GET /tasks/7</code>, a server that only serves files finds no file of that name, and it answers <strong>404</strong>. Clicking around worked; refreshing breaks. With the fallback, the app starts, the router reads <code>location.pathname</code> and draws <code>/tasks/7</code>.</p>',
      '<h3>Where the fallback is set up</h3>',
      '<dl><dt>Vite dev server, <code>vite preview</code></dt><dd>Built in, which is why the problem only appears after deploying.</dd>'
        + '<dt>Netlify, Vercel, Nginx</dt><dd>A rewrite rule: <code>/* /index.html 200</code> in Netlify\'s <code>_redirects</code>, a Vercel rewrite, <code>try_files $uri /index.html</code> in Nginx.</dd>'
        + '<dt>GitHub Pages</dt><dd>Cannot rewrite: copy <code>index.html</code> to <code>404.html</code> (the app works, but deep links answer with status 404), or use <a href="#/browser/routing/hash-vs-path">hash URLs</a>.</dd>'
        + '<dt>Express</dt><dd>One last route after the API and the static files, as in the code.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The API answers JSON, files are files, and every other path gets the app.',
      desc: 'Any GET request that reaches the server goes one of three ways. Paths under /api go to the API routes, which answer JSON, including a JSON 404. Paths of real files, such as /assets/index.js, are sent as files. Every other path, such as /tasks/7, gets index.html with status 200, and the router draws that URL.',
      nodes: [
        { id: 'req', label: 'A GET request', note: 'refresh, link, bookmark' },
        { id: 'api', label: 'API routes', note: 'JSON, even the 404' },
        { id: 'files', label: 'Static files', note: '`/assets/…`' },
        { id: 'app', label: '`index.html`', note: 'status 200, router draws', key: true },
      ],
      edges: [['req', 'api', '`/api/…`'], ['req', 'files', 'a real file'], ['req', 'app', 'any other path']],
    },
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
    example: 'In the router simulator, switch off "The server answers every path with index.html", click a link to `/tasks` (it works: no request is made), then press **Refresh**: the page becomes the server\'s `404 Not Found · Cannot GET /tasks`. Switch the fallback on and refresh again: the app starts and draws `/tasks`.',
    mistake: 'Making the fallback catch everything, API included: `GET /api/tsks` (a typo) then answers `200` with an HTML page, and the front end fails with "Unexpected token \'<\' in JSON". Exclude `/api/` from the fallback, so unknown API paths keep their JSON 404 (see [The 404 catch-all](#/server/routes/not-found)).' },

  { id: 'hash-vs-path', hub: 'spa', topic: 'spa',
    title: 'Hash URLs and path URLs',
    summary: 'A router can keep the screen in the **path** (`/tasks/7`, which needs the server fallback) or in the **hash** (`/#/tasks/7`); the hash is never sent to the server, so hash URLs work on any static host, at the price of uglier URLs.',
    html: [
      '<p>The <strong>fragment</strong>, the part after <code>#</code>, stays in the browser (see <a href="#/http/web/url-anatomy">Anatomy of a URL</a>). It was made for jumping inside a page, so changing it never reloads anything; it fires <code>hashchange</code> instead. A router can use it as its address: <code>https://example.com/#/tasks/7</code> asks the server only for <code>/</code>, which is why this study site uses hash URLs.</p>',
      '<table><caption>The same screen, two kinds of URL</caption><thead><tr><th scope="col"></th><th scope="col">Path: <code>/tasks/7</code></th><th scope="col">Hash: <code>/#/tasks/7</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">What the server receives</th><td><code>GET /tasks/7</code></td><td><code>GET /</code> (the hash is not sent)</td></tr>'
        + '<tr><th scope="row">Server configuration</th><td>SPA fallback needed</td><td>None</td></tr>'
        + '<tr><th scope="row">Browser API underneath</th><td><code>pushState</code> + <code>popstate</code></td><td><code>location.hash</code> + <code>hashchange</code></td></tr>'
        + '<tr><th scope="row">React Router</th><td><code>BrowserRouter</code> / <code>createBrowserRouter</code></td><td><code>HashRouter</code> / <code>createHashRouter</code></td></tr>'
        + '<tr><th scope="row">In-page anchors (<code>#section</code>)</th><td>Work as usual</td><td>Clash with the route</td></tr>'
        + '</tbody></table>',
      '<p>Path URLs are the default for applications: cleaner, the hash stays free for in-page anchors, and servers and search engines see the real path. Routes, links and hooks are written the same way with both.</p>',
    ],
    code: `// A hash router in plain JavaScript: no server configuration needed
function render() {
  const path = location.hash.slice(1) || '/';     // '#/tasks/7' → '/tasks/7'
  document.querySelector('#app').textContent = 'Screen for ' + path;
}
window.addEventListener('hashchange', render);   // links: <a href="#/tasks/7">
render();`,
    example: 'Deploy the same app twice to a static host without rewrites. With `BrowserRouter`, `https://me.github.io/app/tasks/7` gives a 404 on refresh. With `HashRouter`, `https://me.github.io/app/#/tasks/7` always works: the server only ever sees `/app/`.',
    mistake: 'Switching to `HashRouter` while keeping `href="/tasks"` in plain `<a>` tags. Those still point at a path, so they load a page the host does not have. Use the router\'s `<Link to="/tasks">`, which writes the right URL for the router you chose (see [Link instead of a href](#/browser/routing/link-vs-a)).' },

  /* ---- 2. Routes, links and matching ------------------------------------------------------- */
  { id: 'router-setup', hub: 'routes', topic: 'matching',
    title: 'Setting up a router (React Router)',
    summary: 'A router is a component at the top of the app that listens to the URL and lets every component below it read the location; with React Router: `npm install react-router`, wrap the app in `<BrowserRouter>`, and list the screens with `<Routes>` and `<Route>`.',
    html: [
      '<p>The router holds the current location and listens to the History API, so it goes <strong>once, at the top</strong>, usually around <code>&lt;App /&gt;</code> in <code>main.jsx</code>. Every routing hook below it reads from it; a routing hook used outside it throws an error.</p>',
      '<dl><dt><code>useLocation()</code></dt><dd>The current location: <code>pathname</code> (<code>/tasks/7</code>), <code>search</code> (<code>?page=2</code>), <code>hash</code>, and <code>state</code>, data attached to this history entry by the navigation that created it.</dd>'
        + '<dt><code>react-router</code> or <code>react-router-dom</code></dt><dd>Version 7 is installed as <code>react-router</code>; version 6, in many tutorials and existing projects, was <code>react-router-dom</code>, with the same component and hook names. Import from whichever <code>package.json</code> lists.</dd>'
        + '<dt>JSX routes or route objects</dt><dd><code>&lt;BrowserRouter&gt;</code> + <code>&lt;Routes&gt;</code>, used on these cards; or <code>createBrowserRouter([...])</code> + <code>&lt;RouterProvider&gt;</code>, the "data" mode, which adds <code>loader</code> functions that fetch before a route renders. Matching, nesting, params and links work the same.</dd></dl>',
    ],
    diagram: {
      kind: 'tree',
      title: 'One router at the top; every component below it can read the URL.',
      desc: 'BrowserRouter wraps App, which renders Routes. Routes holds three routes: / renders Home, /tasks renders TaskList, and /tasks/:id renders TaskDetail. Any component inside BrowserRouter can read the location.',
      nodes: [
        { id: 'br', label: '`<BrowserRouter>`', note: 'holds the location', key: true },
        { id: 'app', label: '`<App>`' },
        { id: 'routes', label: '`<Routes>`', note: 'picks one route' },
        { id: 'r1', label: '`/`', note: '`<Home />`' },
        { id: 'r2', label: '`/tasks`', note: '`<TaskList />`' },
        { id: 'r3', label: '`/tasks/:id`', note: '`<TaskDetail />`' },
      ],
      edges: [['br', 'app'], ['app', 'routes'], ['routes', 'r1'], ['routes', 'r2'], ['routes', 'r3']],
    },
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
    mistake: 'Calling `useNavigate()` in a component rendered **outside** the router, such as a provider that keeps the logged-in user (see [An authentication context](#/browser/shared-state/auth-context)) placed above `<BrowserRouter>` in `main.jsx`. React Router throws "useNavigate() may be used only in the context of a <Router> component". Put the router at the very top, and any provider that navigates inside it.' },

  { id: 'routes-and-route', hub: 'routes', topic: 'matching',
    title: 'Routes: mapping a URL to a component',
    summary: 'A **route** pairs a URL **pattern** (`path="/tasks/:id"`) with what to render (`element={<TaskDetail />}`); `<Routes>` picks the best match for the current URL, renders its element, and chooses again whenever the URL changes.',
    html: [
      '<p><code>&lt;Routes&gt;</code> works like a <code>switch</code> on the URL that React re-runs on every navigation, and each <code>&lt;Route&gt;</code> is one case. A path must match the <strong>whole</strong> URL, segment by segment, so each screen needs its own route, and "nothing matches" needs one too (<a href="#/browser/routing/not-found-route">the catch-all</a>).</p>',
      '<dl><dt><code>tasks</code></dt><dd>A literal segment: must be equal.</dd>'
        + '<dt><code>:id</code></dt><dd>Any one non-empty segment (see <a href="#/browser/routing/url-params">URL parameters</a>).</dd>'
        + '<dt><code>*</code> at the end</dt><dd>Whatever is left of the URL.</dd></dl>',
      '<ul><li><strong>Ignored when matching:</strong> letter case, a trailing slash, the query string and the hash: <code>/Tasks/7/?tab=notes</code> matches <code>/tasks/:id</code>.</li>'
        + '<li><strong>No match:</strong> React Router renders nothing and only logs a warning in the console.</li>'
        + '<li><strong><code>element</code> takes an element,</strong> <code>&lt;TaskList /&gt;</code>, not the function <code>TaskList</code>, so it can carry props or a wrapper. It renders only while its route matches; navigating away unmounts it and its state is lost (see <a href="#/browser/routing/nested-routes">Nested routes and layouts</a>).</li></ul>',
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
    mistake: 'Writing routes in the React Router 5 style of old tutorials: `<Route exact path="/" component={Home} />` inside a `<Switch>`. In current versions `Switch` does not exist (it is `Routes`), `exact` is gone (every path is exact unless it ends in `/*`) and `component` is ignored, so the route renders nothing. Write `<Route path="/" element={<Home />} />`.' },

  { id: 'link-vs-a', hub: 'routes', topic: 'matching',
    title: '<Link> instead of <a href>',
    summary: 'Inside the app, navigate with `<Link to="/tasks">`: it renders a normal `<a href>` (accessible, can open in a new tab), but the router handles the click, so there is no page load and the app keeps its state; a plain `<a href="/tasks">` reloads the whole app.',
    html: [
      '<p>A plain link tells the browser to leave this document and load another: the running app and all its state are thrown away, and the app starts again. <code>&lt;Link&gt;</code> intercepts the click, cancels the browser\'s navigation and calls the router: <code>pushState</code>, then render. The page never reloads.</p>',
      '<ul><li><strong>Still a real link:</strong> it renders an <code>&lt;a href&gt;</code>, so Ctrl/Cmd-click opens a new tab, the URL shows on hover, screen readers announce a link and Tab reaches it.</li>'
        + '<li><strong>Buttons for actions, links for places:</strong> save, delete and open a dialog are buttons; going somewhere is a link.</li>'
        + '<li><strong><code>&lt;NavLink&gt;</code></strong> knows whether it points at the current page: it adds the class <code>active</code> and <code>aria-current="page"</code>. It is active for its URL <strong>and everything below</strong> (<code>/tasks</code> at <code>/tasks/7</code>); <code>end</code> makes it exact, which the link to <code>/</code> needs.</li>'
        + '<li><strong>Other sites</strong> stay plain <code>&lt;a href="https://…"&gt;</code>.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Same click, two outcomes: the router keeps the app; a plain link restarts it.',
      desc: 'A click on a link inside the app goes one of two ways. With Link, the router changes the URL with pushState: nothing is requested and the app keeps its state. With a plain a href, the browser loads the page again and the app restarts from zero.',
      nodes: [
        { id: 'click', label: 'A click', note: 'on an in-app link' },
        { id: 'link', label: '`<Link to>`', note: 'no request, state kept', key: true },
        { id: 'a', label: '`<a href>`', note: 'page load: app restarts' },
      ],
      edges: [['click', 'link'], ['click', 'a']],
    },
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
    mistake: 'Using `<button onClick={() => navigate(\'/tasks/\' + id)}>` for plain navigation in a list. It works with a mouse, but the user cannot open the task in a new tab or see where it leads, and assistive technology announces a button, not a link. If clicking it goes somewhere, it is a `<Link>`.' },

  { id: 'route-ranking', hub: 'routes', topic: 'matching',
    title: 'How the router picks a route: ranking, not order',
    summary: 'When several routes match a URL, React Router does not take the first one written: it **ranks** them, and the most specific path wins (a literal segment beats a `:param`, which beats `*`), so `/tasks/new` and `/tasks/:id` can be written in any order.',
    html: [
      '<p>Every path gets a <strong>score</strong>: +1 per segment (the leading empty one counts), +10 per literal segment, +3 per <code>:param</code>, +1 for the empty root segment, +2 for an <a href="#/browser/routing/index-routes">index route</a> and −2 for a splat <code>*</code>. React Router tries the paths from the highest score down, and the first that matches the whole URL wins. Order only matters for two <strong>sibling</strong> routes with the <strong>same</strong> score that both match (<code>:lang/about</code> and <code>docs/:page</code> for <code>/docs/about</code>): then the one written first wins.</p>',
      '<table><caption>Scores for some paths (React Router 6 and 7)</caption><thead><tr><th scope="col">Path</th><th scope="col">How the score is made</th><th scope="col">Score</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>/tasks/:id/edit</code></th><td>4 segments + 1 + 10 + 3 + 10</td><td>28</td></tr>'
        + '<tr><th scope="row"><code>/tasks/new</code></th><td>3 segments + 1 + 10 + 10</td><td>24</td></tr>'
        + '<tr><th scope="row"><code>/tasks/:id</code></th><td>3 segments + 1 + 10 + 3</td><td>17</td></tr>'
        + '<tr><th scope="row"><code>/tasks</code> (index child)</th><td>3 segments + 2 (index) + 1 + 10 + 1</td><td>17</td></tr>'
        + '<tr><th scope="row"><code>/tasks</code></th><td>2 segments + 1 + 10</td><td>13</td></tr>'
        + '<tr><th scope="row"><code>/</code></th><td>2 segments + 1 + 1</td><td>4</td></tr>'
        + '<tr><th scope="row"><code>*</code></th><td>2 segments − 2 (splat) + 1</td><td>1</td></tr>'
        + '</tbody></table>',
      '<p>Server routers differ: Express tries routes in the order they were registered, so there <code>/tasks/new</code> must come before <code>/tasks/:id</code> (see <a href="#/server/routes/route-order">Order of routes</a>).</p>',
    ],
    widget: 'router-sim',
    example: 'In the router simulator (example "A task app"), type `/tasks/new` and click the Link: the ranking table at the bottom shows `/tasks/:id/edit` (28) tried and rejected, then `/tasks/new` (24) matching; `/tasks/:id` (17) is never tried. Challenge 2 asks you to predict this, and challenge 6 shows the one case where order decides.',
    mistake: 'Carrying the Express habit over and worrying that `:id` "swallows" `new`, then renaming the route to `/new-task` or adding `if (id === \'new\')` checks in `TaskDetail`. React Router already picks `/tasks/new`; the workaround only adds confusion.' },

  { id: 'url-params', hub: 'routes', topic: 'matching',
    title: 'URL parameters: useParams (always strings)',
    summary: 'A `:name` segment in a route path captures that part of the URL; inside the route\'s components, `useParams()` returns the captured values as an object of **strings**: `{ id: \'7\' }` for `/tasks/7`.',
    html: [
      '<p>The URL carries the answer to "which one", so the page can be bookmarked, shared and refreshed and still show the same task: the URL is the <strong>source of truth</strong>. The component reads it with <code>const { id } = useParams();</code> and fetches that resource (see <a href="#/browser/routing/data-per-route">Loading data for a route</a>).</p>',
      '<ul><li><strong>Always strings,</strong> already decoded (<code>%20</code> becomes a space): <code>id === 7</code> is false when <code>id</code> is <code>\'7\'</code>. Convert with <code>Number(id)</code> and check the result: <code>/tasks/abc</code> also matches, giving <code>NaN</code>.</li>'
        + '<li><strong>One non-empty segment:</strong> <code>/tasks/:id</code> matches neither <code>/tasks/</code> nor <code>/tasks/7/edit</code>.</li>'
        + '<li><strong>Several params</strong> are fine (<code>/users/:userId/tasks/:taskId</code>); a layout route also sees the params of the child that matched below it, and a splat puts the rest of the URL in <code>params[\'*\']</code>.</li>'
        + '<li><strong>Name them</strong> after what they hold (<code>:taskId</code>, not <code>:x</code>). The server reads the same parts with <code>req.params</code> (see <a href="#/server/routes/route-params">Route parameters</a>).</li></ul>',
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
    mistake: 'Comparing the param with a number from the data: `tasks.find((t) => t.id === id)` finds nothing, because `t.id` is the number `7` and `id` is the string `\'7\'`, so the page says "not found" for a task that exists. Convert once, `const taskId = Number(id)`, and compare numbers.' },

  { id: 'search-params', hub: 'routes', topic: 'matching',
    title: 'Query strings: useSearchParams',
    summary: 'The query string (`?done=false&page=2`) holds the **optional** settings of a screen (filters, search text, sort, page); React Router does not use it to choose a route, and the page reads and changes it with `useSearchParams()`.',
    html: [
      '<p>The path says <strong>which</strong> screen (<code>/tasks/7</code>); the query says <strong>how</strong> to show it (<code>/tasks?done=false&amp;sort=title</code>). Filters kept in the URL instead of in <code>useState</code> survive a refresh, Back undoes a filter change, and "my open tasks, page 2" can be shared. The same query often goes straight to the API (see <a href="#/http/api-design/query-params">Filters, sorting and pagination</a>).</p>',
      '<ul><li><strong>Reading:</strong> <code>const [searchParams, setSearchParams] = useSearchParams()</code>. <code>searchParams</code> is a standard <code>URLSearchParams</code>; <code>get(\'page\')</code> returns a <strong>string</strong>, or <code>null</code> when absent, so default and convert: <code>Number(searchParams.get(\'page\') ?? 1)</code>.</li>'
        + '<li><strong>Writing:</strong> <code>setSearchParams({ done: \'false\', page: \'2\' })</code> replaces the whole query and navigates (a new history entry). For keystrokes pass <code>{ replace: true }</code> as a second argument, so Back is not one entry per letter.</li>'
        + '<li><strong>Changing one key:</strong> start from a copy, <code>setSearchParams((prev) =&gt; { const next = new URLSearchParams(prev); next.set(\'page\', \'2\'); return next; })</code>.</li>'
        + '<li><strong>A new filter resets the page to 1</strong> (page 3 of the old results may not exist), and the query values go in the dependencies of the effect that fetches (see <a href="#/browser/data-fetching/pagination-ui">Pagination controls</a>).</li></ul>',
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

  /* ---- 3. Nested routes and layouts -------------------------------------------------------- */
  { id: 'nested-routes', hub: 'layouts', topic: 'layouts',
    title: 'Nested routes and layouts: <Outlet />',
    summary: 'Routes can contain routes: the parent route\'s element is a **layout** (header, navigation, sidebar) that renders `<Outlet />` where the matching child goes, and it stays mounted while the user moves between its children.',
    html: [
      '<p>For <code>/tasks/7</code>, React Router finds the branch "root layout → tasks layout → task detail" and renders every level, each one placing the next in its <code>&lt;Outlet /&gt;</code>. The outlet works like <code>children</code> (see <a href="#/browser/components/children">children: components that wrap other content</a>), except that the router fills it from the URL.</p>',
      '<ul><li><strong>Relative paths:</strong> inside <code>&lt;Route path="tasks"&gt;</code>, <code>path=":id"</code> means <code>/tasks/:id</code>.</li>'
        + '<li><strong>Pathless layouts:</strong> <code>&lt;Route element={&lt;AppLayout /&gt;}&gt;</code> wraps its children in a layout (or a guard) without adding anything to their URLs.</li>'
        + '<li><strong>The layout stays mounted:</strong> its state (an open menu, a search box) survives navigation, and its effects do not run again.</li>'
        + '<li><strong>Relative links:</strong> in <code>/tasks/7</code>, <code>&lt;Link to="edit"&gt;</code> goes to <code>/tasks/7/edit</code> and <code>to=".."</code> to the parent route.</li></ul>',
    ],
    diagram: {
      kind: 'tree',
      title: 'The route tree mirrors the screen: each layout draws the next level in its outlet.',
      desc: 'AppLayout, at /, has two children: Home, its index route, and TasksLayout, at tasks. TasksLayout has two children: TaskList, its index route at /tasks, and TaskDetail, at :id, for /tasks/7. Each layout renders the matching child in its Outlet.',
      nodes: [
        { id: 'root', label: '`AppLayout`', note: '`/`: header and outlet', key: true },
        { id: 'home', label: '`Home`', note: 'index: `/`' },
        { id: 'tl', label: '`TasksLayout`', note: '`tasks`' },
        { id: 'list', label: '`TaskList`', note: 'index: `/tasks`' },
        { id: 'detail', label: '`TaskDetail`', note: '`:id`: `/tasks/7`' },
      ],
      edges: [['root', 'home'], ['root', 'tl'], ['tl', 'list'], ['tl', 'detail']],
    },
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
    example: 'In the box, type something in the header\'s input, then click Home, Tasks and Task 2: only the dashed area (the outlet) changes and your text stays, because `AppLayout` is never unmounted. If every page rendered its own copy of the header, the input would be recreated, and emptied, on every click.',
    mistake: 'Nesting the routes but forgetting `<Outlet />` in the parent\'s element. The URL changes, the parent renders, and the child silently does not appear: there is no error, the router simply has nowhere to put it. If a child route "does not work", check that every element on the way down renders an outlet.' },

  { id: 'index-routes', hub: 'layouts', topic: 'layouts',
    title: 'Index routes: the default child',
    summary: 'An **index route**, `<Route index element={<TaskList />} />`, renders in its parent\'s outlet when the URL is exactly the parent\'s path: it has no path of its own.',
    html: [
      '<p>A layout route with children has a gap at its own URL: with only a <code>:id</code> child, <code>/tasks/7</code> shows the layout and the task, but <code>/tasks</code> shows the layout with an <strong>empty</strong> outlet. The index route fills it: the list, a dashboard, a "pick a task" message.</p>',
      '<ul><li><strong>A ranking bonus</strong> of +2, so at <code>/tasks</code> "layout + index" wins over the layout alone.</li>'
        + '<li><strong>A leaf:</strong> no children and no path of its own; usually written first, for readability.</li>'
        + '<li><strong>At the root:</strong> <code>&lt;Route index element={&lt;Home /&gt;} /&gt;</code> inside the root layout gives the home page its header and navigation.</li>'
        + '<li><strong>A redirect as the index:</strong> <code>&lt;Route index element={&lt;Navigate to="tasks" replace /&gt;} /&gt;</code> makes <code>/tasks</code> the real start page. <code>&lt;Navigate&gt;</code> is a component that navigates as soon as it renders (see <a href="#/browser/routing/use-navigate">Navigating from code</a>, and for <code>replace</code>, <a href="#/browser/routing/push-vs-replace">Push or replace</a>).</li></ul>',
    ],
    diagram: {
      kind: 'tree',
      title: 'The index child fills the outlet at the parent\'s own URL.',
      desc: 'TasksLayout, at tasks, has three children. TaskList is the index route and renders at /tasks. NewTask renders at /tasks/new. TaskDetail renders at /tasks/7.',
      nodes: [
        { id: 'tl', label: '`TasksLayout`', note: '`path="tasks"`' },
        { id: 'idx', label: '`TaskList`', note: 'index: `/tasks`', key: true },
        { id: 'nw', label: '`NewTask`', note: '`new`: `/tasks/new`' },
        { id: 'dt', label: '`TaskDetail`', note: '`:id`: `/tasks/7`' },
      ],
      edges: [['tl', 'idx'], ['tl', 'nw'], ['tl', 'dt']],
    },
    code: `<Route path="tasks" element={<TasksLayout />}>
  <Route index element={<TaskList />} />     {/* /tasks */}
  <Route path="new" element={<NewTask />} />  {/* /tasks/new */}
  <Route path=":id" element={<TaskDetail />} />  {/* /tasks/7 */}
</Route>`,
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Fill an empty outlet in the router simulator (challenge 4)' },
    example: 'With these routes, `/tasks` renders `TasksLayout` with `TaskList` in the outlet. Remove the index route and `/tasks` still matches (the parent has a path), but the outlet is empty: the layout\'s title and buttons with a blank area below.',
    mistake: 'Giving the index route the parent\'s path again, `<Route path="tasks" element={<TaskList />} />` inside `<Route path="tasks">`. Child paths are relative, so this child lives at `/tasks/tasks`, and `/tasks` still has an empty outlet. Use `index`.' },

  { id: 'not-found-route', hub: 'layouts', topic: 'layouts',
    title: 'The catch-all route: a 404 page',
    summary: 'A route with `path="*"` matches **any** URL but has the lowest score, so it only renders when no other route matches: use it for a "Page not found" screen instead of a blank page.',
    html: [
      '<p>Without a catch-all, a mistyped URL or an old link shows an empty page: React Router renders nothing and only logs <code>No routes matched location "/tsks"</code> in the console, which users never see. <code>&lt;Route path="*" element={&lt;NotFound /&gt;} /&gt;</code> shows a short message and a link back.</p>',
      '<ul><li><strong>Position does not matter:</strong> <code>*</code> has the lowest <a href="#/browser/routing/route-ranking">score</a>. Put it <strong>inside</strong> the layout route, so the header and navigation stay on the not-found page.</li>'
        + '<li><strong>Under a path:</strong> <code>path="docs/*"</code> matches everything below <code>/docs</code>; the rest of the URL is in <code>useParams()[\'*\']</code>.</li>'
        + '<li><strong>Missing data is another 404:</strong> <code>/tasks/999</code> matches <code>/tasks/:id</code>, so the catch-all cannot help; the page must handle the API\'s 404 (see <a href="#/browser/routing/data-per-route">Loading data for a route</a>). The server makes the same distinction (see <a href="#/server/routes/not-found">The 404 catch-all</a>).</li></ul>',
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
    example: 'With these routes, `/tsks` and `/tasks/7/oops` both render `AppLayout` with `NotFound` in its outlet: neither matches a real route (`/tasks/:id` takes exactly one segment after `tasks`), so only `*` is left.',
    mistake: 'Redirecting unknown URLs to the home page with `<Route path="*" element={<Navigate to="/" />} />`. The user who mistyped never learns that the page does not exist, and a broken link in your own app becomes impossible to notice. Show a real not-found page.' },

  /* ---- 4. Navigating from code ------------------------------------------------------------- */
  { id: 'use-navigate', hub: 'navigation', topic: 'navigation',
    title: 'Navigating from code: useNavigate',
    summary: '`const navigate = useNavigate()` gives a function that changes the URL from code (`navigate(\'/tasks/12\')` after a save, `navigate(\'/login\')` after logging out, `navigate(-1)` for Back): use it when the navigation is the **result of an action**, not a place the user clicks.',
    html: [
      '<p>Links are for "go there"; <code>navigate</code> is for "this happened, so now go there". The typical moment is the end of an event handler: the API answered 201 with the new task, so <code>navigate(\'/tasks/\' + created.id)</code>. Others: after log-in or log-out, after deleting the item on screen, on a 401 from the API (see <a href="#/browser/data-fetching/handle-401">Handling 401</a>).</p>',
      '<dl><dt><code>navigate(\'/tasks\')</code>, <code>navigate(\'edit\')</code>, <code>navigate(\'..\')</code></dt><dd>The same targets as a <code>&lt;Link&gt;</code>: absolute, or relative to the current route.</dd>'
        + '<dt><code>navigate(-1)</code></dt><dd>A number moves through the history: <code>-1</code> is Back.</dd>'
        + '<dt><code>{ replace: true }</code></dt><dd>Second argument: overwrite the current history entry instead of adding one.</dd>'
        + '<dt><code>{ state: { … } }</code></dt><dd>Second argument: data attached to the new entry, read on the next page with <code>useLocation().state</code>.</dd></dl>',
      '<p><strong>Only in handlers and effects,</strong> never in the body of a component while it renders: navigating is a side effect, and React Router warns "You should call navigate() in a React.useEffect(), not when your component is first rendered". To redirect as part of rendering, return <code>&lt;Navigate to="…" /&gt;</code> instead.</p>',
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
    summary: 'Every navigation either **pushes** a new history entry (Back returns to the current page) or **replaces** the current one (Back skips it); use `replace` for pages the user should not come back to: redirects, the log-in page after logging in, a form after it was saved.',
    html: [
      '<p><strong>Push</strong> cuts off anything after the pointer, puts the new URL on top and moves there; <strong>replace</strong> writes the new URL over the current entry. Ask: "if the user presses Back on the next page, should they see this one again?" A list → detail click: yes, push. A redirect: no.</p>',
      '<h3>The Back-button trap</h3>',
      '<p>A guard sends a logged-out user from <code>/settings</code> to <code>/login</code>. With push, the history is <code>/tasks → /settings → /login</code>: Back goes to <code>/settings</code>, which redirects to <code>/login</code> again, and the user cannot leave by pressing Back. With <code>&lt;Navigate to="/login" replace /&gt;</code> the history is <code>/tasks → /login</code>. After logging in, <code>navigate(from, { replace: true })</code> removes the log-in form from the history the same way.</p>',
      '<table><caption>History after logging in: the user started on /tasks and clicked Settings</caption><thead><tr><th scope="col">Guard</th><th scope="col">After log-in</th><th scope="col">History</th><th scope="col">Back from /settings goes to</th></tr></thead><tbody>'
        + '<tr><th scope="row">push</th><td>push</td><td><code>/tasks</code> → <code>/settings</code> → <code>/login</code> → <code>/settings</code></td><td><code>/login</code> (the form, already logged in)</td></tr>'
        + '<tr><th scope="row">replace</th><td>push</td><td><code>/tasks</code> → <code>/login</code> → <code>/settings</code></td><td><code>/login</code></td></tr>'
        + '<tr><th scope="row">push</th><td>replace</td><td><code>/tasks</code> → <code>/settings</code> → <code>/settings</code></td><td><code>/settings</code> (nothing seems to happen)</td></tr>'
        + '<tr><th scope="row">replace</th><td>replace</td><td><code>/tasks</code> → <code>/settings</code></td><td><code>/tasks</code></td></tr>'
        + '</tbody></table>',
      '<p><code>replace</code> exists on <code>&lt;Navigate replace&gt;</code>, <code>&lt;Link replace&gt;</code>, <code>navigate(to, { replace: true })</code> and <code>setSearchParams(params, { replace: true })</code>.</p>',
    ],
    practice: { href: '#/browser/routing/practice/router-sim', label: 'Make Back skip the log-in page (router simulator, challenge 8)' },
    example: 'In the router simulator, open challenge 8: both switches start off. Click Settings while logged out, log in, then press Back and watch the history stack: you land on `/login`. Switch on the guard\'s replace and the log-in replace, run the story again, and Back returns to `/tasks`.',
    mistake: 'Using `replace` everywhere "to keep the history clean". Then Back skips pages the user did want: from a task\'s detail, Back leaves the app instead of returning to the list. Push is the default for a reason; replace only the entries that should not be revisited.' },

  /* ---- 5. Protected routes and data -------------------------------------------------------- */
  { id: 'protected-routes', hub: 'guards', topic: 'guards',
    title: 'Protected routes: a guard component',
    summary: 'A **protected route** renders its page only for a logged-in user: a small wrapper component, often called `RequireAuth`, renders the page (or `<Outlet />`), or `<Navigate to="/login" replace />` when nobody is logged in.',
    html: [
      '<p>A guard is an ordinary component that decides what to render. It reads the user from wherever the app keeps the logged-in user, usually a context shared by every page (see <a href="#/browser/shared-state/auth-context">An authentication context</a>), and returns its <code>children</code>, or a <code>&lt;Navigate&gt;</code>, which navigates as soon as it renders.</p>',
      '<ul><li><strong>Around one page:</strong> <code>element={&lt;RequireAuth&gt;&lt;Settings /&gt;&lt;/RequireAuth&gt;}</code>.</li>'
        + '<li><strong>Around a group:</strong> a pathless layout route, <code>&lt;Route element={&lt;RequireAuth /&gt;}&gt;…&lt;/Route&gt;</code>, whose guard renders <code>&lt;Outlet /&gt;</code>.</li>'
        + '<li><strong>Never guard <code>/login</code>:</strong> a logged-out user would be sent from <code>/login</code> to <code>/login</code> forever.</li>'
        + '<li><strong>User experience, not security:</strong> anyone can bypass front-end code or call the API directly. The server protects the data by checking the token on every request (see <a href="#/server/auth">Authentication and security</a>).</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The guard decides what renders: a wait, a redirect or the page.',
      desc: 'RequireAuth reads the logged-in user. While the saved token is still being read, it shows a loading message. With no user, it renders Navigate to /login with replace. With a user, it renders the page: its children or the Outlet.',
      nodes: [
        { id: 'guard', label: '`RequireAuth`', note: 'reads the logged-in user', key: true },
        { id: 'wait', label: 'A loading message', note: 'token not read yet' },
        { id: 'nav', label: '`<Navigate>`', note: 'to `/login`, `replace`' },
        { id: 'page', label: 'The page', note: 'children or `<Outlet />`' },
      ],
      edges: [['guard', 'wait', 'still checking'], ['guard', 'nav', 'no user'], ['guard', 'page', 'a user']],
    },
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
    mistake: 'Starting the auth state as "logged out" and restoring the saved token later, in an effect: on a refresh of `/settings` the guard redirects before the token is read, so logged-in users are thrown out on every reload. Read the token in the initial state, or keep a `checking` flag as the code does (see [Staying logged in after a reload](#/browser/shared-state/persist-session)).' },

  { id: 'redirect-after-login', hub: 'guards', topic: 'guards',
    title: 'Back to where you were after log-in',
    summary: 'When the guard redirects, it stores the page the user wanted in the navigation **state** (`<Navigate to="/login" replace state={{ from: location }} />`); after a successful log-in, the log-in page reads `useLocation().state?.from` and navigates there, with `replace`.',
    html: [
      '<p>Without it, every log-in lands on the home page, and a link someone shared loses its target. With it, the guard writes down the destination and the log-in page reads it back.</p>',
      '<ul><li><strong>History state</strong> is data attached to a history entry, invisible in the URL: it survives a refresh of that entry, but not a typed URL or a shared link. Always keep a fallback: <code>location.state?.from?.pathname ?? \'/\'</code>.</li>'
        + '<li><strong>Keep the query string:</strong> <code>from.pathname + from.search</code>, so <code>/tasks?page=3</code> does not come back as <code>/tasks</code>.</li>'
        + '<li><strong>Navigate after success:</strong> <code>await login(email, password)</code> (see <a href="#/browser/data-fetching/login-request">Logging in from the front end</a>), then <code>navigate(from, { replace: true })</code>; on failure, stay and show the error.</li>'
        + '<li><strong>Where the pieces come from:</strong> the form is read with <code>new FormData(e.currentTarget)</code> (see <a href="#/browser/components/uncontrolled-inputs">Uncontrolled inputs</a>); <code>login</code> comes from wherever the app keeps the logged-in user (see <a href="#/browser/shared-state/auth-context">An authentication context</a>).</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'The guard writes down the destination; the log-in page reads it back.',
      desc: 'Step 1: a logged-out user opens /settings. Step 2: the guard redirects to /login and stores from = /settings in the history state. Step 3: the log-in page shows the form. Step 4: the user logs in and the request succeeds. Step 5: the page navigates to from with replace, so Back skips the form.',
      nodes: [
        { id: 'open', label: 'Open `/settings`', note: 'logged out' },
        { id: 'guard', label: 'The guard', note: '`state.from = /settings`' },
        { id: 'login', label: '`/login`', note: 'the form says why' },
        { id: 'ok', label: 'Log in', note: '`await login(…)`' },
        { id: 'back', label: '`navigate(from)`', note: '`replace: true`', key: true },
      ],
      edges: [['open', 'guard'], ['guard', 'login'], ['login', 'ok'], ['ok', 'back']],
    },
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
    summary: 'A page for one resource reads the param (`useParams()`) and fetches that resource in an **effect with the param in its dependencies**, `useEffect(…, [id])`: moving from `/tasks/1` to `/tasks/2` keeps the same component mounted, so only the dependency makes it fetch again.',
    html: [
      '<p>For <code>/tasks/1</code> and <code>/tasks/2</code>, React Router renders the <strong>same</strong> <code>TaskDetail</code> at the same place, so React keeps it mounted and only its params change. With <code>[]</code> the effect ran once, for task 1, and the page keeps showing it under <code>/tasks/2</code>; with <code>[id]</code> it runs again for every new id (see <a href="#/browser/state-effects/dependency-array">The dependency array</a>).</p>',
      '<ul><li><strong>Each page loads its own data:</strong> the detail page must also work when opened from a bookmark, so the list does not hand it the task.</li>'
        + '<li><strong>Handle the answers that belong to a URL:</strong> a <code>404</code> deserves "This task does not exist" and a link to the list; a <code>400</code> usually means the param is not a valid id.</li>'
        + '<li><strong>The rest of the request:</strong> the loading, error, empty and success states in <a href="#/browser/data-fetching/request-states">Loading, error, empty, success</a>; a late answer for the old id in <a href="#/browser/data-fetching/race-conditions">Race conditions</a>.</li>'
        + '<li><strong>Data mode:</strong> a route <code>loader</code> (<code>loader: ({ params }) =&gt; …</code>, read with <code>useLoaderData()</code>) starts the fetch before the page renders; the rules about ids and errors are the same.</li></ul>',
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
  { type: 'fib', topic: 'layouts', q: 'A route whose path is ___ matches any URL that no other route matches, and is used for a "Page not found" screen.',
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
  { type: 'mc', topic: 'matching', q: 'Inside a React app, what is the difference between `<a href="/tasks">` and `<Link to="/tasks">`?',
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
  { type: 'mc', topic: 'matching', q: 'What does `<NavLink to="/tasks">` add when the current URL is `/tasks/7`?',
    choices: ['Nothing: it only matches `/tasks` exactly', 'The class `active` and `aria-current="page"`', 'A `disabled` attribute', 'A redirect to `/tasks`'],
    answer: 1, why: 'By default a NavLink is active for its URL and everything below it; `end` makes it exact (needed for `/`).' },
  { type: 'mc', topic: 'matching', q: 'Which element should navigate to a task\'s detail page from a list?',
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
