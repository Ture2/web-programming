'use strict';
/* How the web works: concept cards, rail groups and self-check quiz (client and server, URLs,
   HTTP, status codes, rendering, front end and back end). Cards explain with `html` blocks and
   `diagram` specs (js/concept-section.js, js/diagram.js). Each group is one page and one quiz
   topic: `hub` and `topic` keys match WEB_GROUPS and WEB_QUIZ_TOPICS. */

DATA.en.WEB_QUIZ_TOPICS = {
  clientserver: 'From address to page',
  http: 'HTTP messages',
  status: 'Status codes',
  render: 'In the browser',
  stack: 'Front end, back end and the full stack',
};

DATA.en.WEB_GROUPS = [
  { key: 'clientserver', label: 'From address to page', icon: 'split' },
  { key: 'http', label: 'HTTP messages', icon: 'arrow' },
  { key: 'status', label: 'Status codes', icon: 'table' },
  { key: 'render', label: 'In the browser: rendering and DevTools', icon: 'steps' },
  { key: 'stack', label: 'The big picture', icon: 'pyramid' },
];

DATA.en.WEB_CONCEPTS = [
  /* ---- 1. From address to page ---------------------------------------------------- */
  { id: 'client-server', hub: 'clientserver', topic: 'clientserver',
    title: 'Client and server: a conversation',
    summary: 'The web is a conversation between two programs: a **client** (usually the browser) sends a **request**, and a **server** answers with a **response**.',
    html: [
      '<p>A <strong>resource</strong> is anything a URL can name: a page, a stylesheet, an image, a piece of data. The client asks for one resource per request, and the server answers each request once. Nothing reaches the browser that it did not ask for: every file on screen arrived because the browser requested it.</p>',
      '<dl><dt>Client</dt><dd>The program that starts the conversation: usually the browser, but also command-line tools such as <code>curl</code> and your own JavaScript.</dd>'
        + '<dt>Server</dt><dd>A program that waits for requests, decides how to answer each one and sends a response. The word also names the computer that runs it.</dd>'
        + '<dt>Request and response</dt><dd>Always a pair, and the client always speaks first.</dd></dl>',
      '<p><strong>One page is many conversations.</strong> The HTML arrives first; while reading it, the browser finds stylesheets, scripts and images and sends one more request for each. Each step of the picture has its own card: <a href="#/http/web/url-anatomy">the URL</a>, <a href="#/http/web/dns">DNS</a> and <a href="#/http/web/http-methods">HTTP methods</a>.</p>',
    ],
    diagram: {
      kind: 'sequence',
      numbered: true,
      title: 'Every page load is a short conversation: look up, connect, ask, answer.',
      desc: 'The browser asks the DNS resolver where www.example.com is and gets back an IP address. It connects to the server on port 443 and sends a GET request for the page. The server answers 200 OK with the HTML. The browser reads the HTML, finds the stylesheets, scripts and images, requests each file in the same way, and renders the page.',
      nodes: [
        { id: 'browser', label: 'Browser', note: 'the client', key: true },
        { id: 'dns', label: 'DNS resolver' },
        { id: 'server', label: 'Server' },
      ],
      edges: [
        ['browser', 'dns', 'where is `www.example.com`?'],
        ['dns', 'browser', '`93.184.215.14`'],
        ['browser', 'server', 'connect to port 443'],
        ['browser', 'server', '`GET /` (the request)'],
        ['server', 'browser', '`200 OK` + the HTML'],
        ['browser', 'browser', 'finds CSS, scripts, images'],
        ['browser', 'server', 'one request per file'],
        ['browser', 'browser', 'renders the page'],
      ],
    },
    example: 'You open `https://www.example.com/`. The browser requests `/` and gets HTML that mentions `styles.css`, `logo.png` and `app.js`, so it sends three more requests and gets three more responses: **four** request/response pairs for one page. A real site often needs fifty or more.',
    mistake: 'Thinking the server sends updates on its own. In plain HTTP the server only ever **answers**: if what you see changes, the browser asked again (you reloaded, or JavaScript requested new data).' },

  { id: 'url-anatomy', hub: 'clientserver', topic: 'clientserver',
    title: 'Anatomy of a URL',
    summary: 'A **URL** (Uniform Resource Locator) is the address of one resource: how to talk (scheme), to which server (host and port), what to ask for (path), with which options (query string) and where to look inside the result (fragment).',
    html: [
      '<p>A URL reads from big to small: first the server, then the resource on it, then the options. Everything up to the query string travels to the server; the fragment stays in the browser.</p>',
      '<table><caption>The parts of <code>https://shop.example.com:8443/products/42?color=red&amp;size=m#reviews</code></caption><thead><tr><th scope="col">Part</th><th scope="col">Value here</th><th scope="col">What it does</th></tr></thead><tbody>'
        + '<tr><th scope="row">Scheme</th><td><code>https</code></td><td>The protocol; <code>https</code> is HTTP over an encrypted connection</td></tr>'
        + '<tr><th scope="row">Host</th><td><code>shop.example.com</code></td><td>The server\'s name; DNS turns it into an IP address</td></tr>'
        + '<tr><th scope="row">Port</th><td><code>8443</code></td><td>Which program on that machine</td></tr>'
        + '<tr><th scope="row">Path</th><td><code>/products/42</code></td><td>Which resource on that server</td></tr>'
        + '<tr><th scope="row">Query string</th><td><code>color=red&amp;size=m</code></td><td>Options, as <code>key=value</code> pairs after <code>?</code></td></tr>'
        + '<tr><th scope="row">Fragment</th><td><code>reviews</code></td><td>A position inside the resource; never sent</td></tr>'
        + '</tbody></table>',
      '<dl><dt>Port</dt><dd>Usually left out, because each scheme has a default: <strong>443</strong> for <code>https</code>, <strong>80</strong> for <code>http</code>. You see it while you develop: in <code>http://localhost:3000</code>, <code>localhost</code> is the name of your own computer and 3000 the port your server listens on.</dd>'
        + '<dt>Query string</dt><dd>Starts with <code>?</code> and holds <code>key=value</code> pairs joined by <code>&amp;</code>. Characters not allowed in a URL are <strong>percent-encoded</strong>: a space becomes <code>%20</code>, <code>@</code> becomes <code>%40</code>.</dd>'
        + '<dt>Fragment</dt><dd>After <code>#</code>. The browser keeps it and scrolls to the element whose <code>id</code> matches.</dd></dl>',
    ],
    example: 'In `https://maps.example.com/search?q=madrid&zoom=12#results` the browser contacts `maps.example.com` on port 443 (the https default) and asks for `/search?q=madrid&zoom=12`. Changing `zoom=12` to `zoom=15` asks for the same resource with another option. `#results` is never sent: the browser uses it afterwards to scroll to `id="results"`.',
    mistake: 'Writing a link without the scheme: `<a href="www.example.com">`. Without `https://` the browser reads the value as a **relative path** and looks for a file called `www.example.com` in the current folder, which gives a 404. External links need the full absolute URL.',
    widget: 'url-anatomy' },

  { id: 'dns', hub: 'clientserver', topic: 'clientserver',
    title: 'DNS: from names to addresses',
    summary: 'The **DNS** (Domain Name System) translates a host name such as `www.example.com` into the **IP address** of its server, like a phone book for the internet.',
    html: [
      '<p>Computers reach each other by numeric <strong>IP addresses</strong> (<code>93.184.215.14</code>, or a longer IPv6 address); people remember names. So before any request, the browser looks up the number behind the name: a <strong>DNS query</strong>, the first step of every page load (see <a href="#/http/web/client-server">Client and server</a>).</p>',
      '<ul><li><strong>The resolver answers:</strong> a DNS server normally run by your network or internet provider.</li>'
        + '<li><strong>Cached:</strong> the answer is kept for a while, so the next visit skips the lookup.</li>'
        + '<li><strong>Only the host</strong> takes part: the path, query string and fragment play no role.</li>'
        + '<li><strong><code>localhost</code></strong> always means this same computer (address <code>127.0.0.1</code>): it is how you reach a server running on your own laptop.</li></ul>',
    ],
    example: 'For `https://www.example.com/courses`, the DNS query asks only for `www.example.com` and gets an IP address. The browser connects to it on port 443 and asks for `/courses`, naming the site in a `Host` header, because one IP address can host many sites.',
    mistake: 'Calling every failure "a 404". If the browser says the server\'s address could not be found (Chrome shows `DNS_PROBE_FINISHED_NXDOMAIN`), the lookup failed and **no request was ever sent**, so there is no status code. A `404` is the opposite: the server was found and answered "I do not have that resource" (see [Status code families](#/http/web/status-families)).' },

  { id: 'http-basics', hub: 'clientserver', topic: 'clientserver',
    title: 'HTTP and HTTPS',
    summary: '**HTTP** (HyperText Transfer Protocol) is the agreed format of the request and response messages between client and server; **HTTPS** is the same protocol sent through an encrypted connection.',
    html: [
      '<p>A <strong>protocol</strong> is an agreed format. Because HTTP fixes where the method, the address, the extra information and the content go, any browser can talk to any server, whoever wrote them.</p>',
      '<dl><dt>Message format</dt><dd>In HTTP/1.1 a message is readable text: a <strong>first line</strong>, <strong>headers</strong> (one <code>Name: value</code> per line), an <strong>empty line</strong> and an optional <strong>body</strong>. HTTP/2 and HTTP/3 pack the same information in binary, and DevTools shows them the same way.</dd>'
        + '<dt>Stateless</dt><dd>The server handles each request on its own and does not remember earlier ones. A site "remembers" you only because the browser sends an identifier, a <strong>cookie</strong> or a <strong>token</strong>, with every request (see <a href="#/server/auth/sessions-vs-tokens">Remembering who you are</a>).</dd>'
        + '<dt>HTTPS</dt><dd>HTTP inside <strong>TLS</strong> encryption: nobody on the way (a café Wi-Fi) can read or change the messages, and the server proves its identity with a certificate. The padlock means the connection is private, not that the site is honest.</dd></dl>',
    ],
    diagram: {
      kind: 'layers',
      title: 'HTTPS is HTTP carried inside TLS.',
      desc: 'Three layers, top to bottom. HTTP is the message: method, headers and body. TLS encrypts it; that is the S in HTTPS. The network underneath carries the encrypted packets to the server\'s IP address.',
      nodes: [
        { id: 'http', label: 'HTTP', note: 'method, headers, body', key: true },
        { id: 'tls', label: 'TLS', note: 'encryption: the S in HTTPS' },
        { id: 'net', label: 'The network', note: 'carries packets to an address' },
      ],
      edges: [],
    },
    example: 'HTTP is a postcard: every network it passes through can read it; HTTPS seals it in an envelope. A login form sent over `http://` on a café network travels as readable text; over `https://` the network only sees that you talked to that server.',
    mistake: 'Believing the server "knows" it is you because you visited a second ago. Without a cookie or token sent again, your second request is as anonymous as your first: that is what stateless means.' },

  /* ---- 2. HTTP messages ------------------------------------------------------------ */
  { id: 'http-methods', hub: 'http', topic: 'http',
    title: 'HTTP methods',
    summary: 'The **method** (or verb) is the first word of a request and states the intent: read (`GET`), create or submit (`POST`), replace (`PUT`), partially update (`PATCH`) or remove (`DELETE`).',
    html: [
      '<p>The path says <strong>which</strong> resource; the method says <strong>what to do</strong> with it. The same path <code>/tasks/7</code> can be read with <code>GET</code>, changed with <code>PATCH</code> and removed with <code>DELETE</code>. APIs are designed on this idea: nouns in the URL, verbs in the method (see <a href="#/http/api-design/crud-mapping">CRUD on HTTP</a>).</p>',
      '<table><caption>The five everyday methods, on a to-do list</caption><thead><tr><th scope="col">Method</th><th scope="col">Intent</th><th scope="col">Body?</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>GET</code></th><td>Read a resource or a list</td><td>No</td><td><code>GET /tasks/7</code> returns task 7</td></tr>'
        + '<tr><th scope="row"><code>POST</code></th><td>Create a resource, submit data</td><td>Yes</td><td><code>POST /tasks</code> with a new task creates task 8</td></tr>'
        + '<tr><th scope="row"><code>PUT</code></th><td>Replace a resource completely</td><td>Yes</td><td><code>PUT /tasks/7</code> with the full new version</td></tr>'
        + '<tr><th scope="row"><code>PATCH</code></th><td>Change some fields</td><td>Yes</td><td><code>PATCH /tasks/7</code> with <code>{"done":true}</code></td></tr>'
        + '<tr><th scope="row"><code>DELETE</code></th><td>Remove a resource</td><td>Usually no</td><td><code>DELETE /tasks/7</code></td></tr>'
        + '</tbody></table>',
      '<dl><dt>Safe</dt><dd><code>GET</code> should not change anything on the server, so browsers, caches and search engines may repeat or prefetch it freely.</dd>'
        + '<dt>Idempotent</dt><dd>The same final effect whether sent once or three times: <code>GET</code>, <code>PUT</code>, <code>DELETE</code>. <code>POST</code> is neither: sent twice, it usually creates two things.</dd></dl>',
      '<p>In the browser, typing a URL, clicking a link and loading an image all send <code>GET</code>, and an HTML <code>&lt;form&gt;</code> sends <code>GET</code> or <code>POST</code>. The other methods come from JavaScript or from tools such as <code>curl</code>.</p>',
    ],
    example: 'A user ticks task 7 as done. The front end sends `PATCH /tasks/7` with the body `{"done":true}`: only that field changes. Sending `PUT /tasks/7` with `{"done":true}` would **replace** the task with an object that has no title any more, because PUT means "this is the whole new version".',
    mistake: 'Using GET for actions that change data, such as a link `<a href="/tasks/7/delete">`. Browsers prefetch links, and crawlers and chat-app link previews follow them automatically, so a bot could delete your data. Changes must use POST, PUT, PATCH or DELETE.',
    practice: { href: '#/http/web/practice/http-explorer', label: 'Open the HTTP explorer' } },

  { id: 'http-request', hub: 'http', topic: 'http',
    title: 'Inside an HTTP request',
    summary: 'An HTTP request is made of a **request line** (method, path, HTTP version), **headers**, an empty line and an optional **body**.',
    html: [
      '<p>The <strong>request line</strong> says what you want (<code>GET /products/42</code>). The <strong>headers</strong> describe the request. The <strong>body</strong> carries data, and only when you send some, such as a form.</p>',
      '<dl><dt><code>Host</code></dt><dd>Which site: one IP address can serve many.</dd>'
        + '<dt><code>User-Agent</code></dt><dd>Which browser or tool sent it.</dd>'
        + '<dt><code>Accept</code></dt><dd>Which response formats the client prefers.</dd>'
        + '<dt><code>Content-Type</code></dt><dd>The format of the body, when there is one.</dd>'
        + '<dt><code>Cookie</code>, <code>Authorization</code></dt><dd>Who you are.</dd></dl>',
      '<p>A <code>GET</code> request normally has <strong>no body</strong>: its inputs travel in the path and query string. <code>POST</code>, <code>PUT</code> and <code>PATCH</code> usually carry one, and <code>Content-Type</code> says how to read it: <code>application/x-www-form-urlencoded</code> for a classic HTML form (<code>email=ana%40example.com&amp;remember=on</code>), or <code>application/json</code> for <strong>JSON</strong>, the text format programs use to exchange data, with keys in double quotes: <code>{"email":"ana@example.com"}</code> (see <a href="#/browser/js/json">JSON</a>).</p>',
      '<p>An <strong>API</strong> (Application Programming Interface) is a set of URLs that programs call to get or change data, usually as JSON, such as <code>/api/login</code>.</p>',
    ],
    code: `POST /api/login HTTP/1.1
Host: shop.example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: application/json
Content-Type: application/json
Content-Length: 48

{"email":"ana@example.com","password":"s3cret!"}`,
    dialect: 'HTTP',
    example: 'Read the sample request line by line: the **request line** asks to create something at `/api/login` with HTTP/1.1; `Host` names the site; `Accept` asks for a JSON answer; `Content-Type` and `Content-Length` announce a JSON body of 48 bytes; after the **empty line** comes the **body** with the login data.',
    mistake: 'Putting secrets in the URL of a GET request, as in `/login?password=s3cret!`. URLs are saved in browser history, bookmarks and server logs. Sensitive data belongs in the **body** of a POST request, sent over HTTPS.',
    widget: 'http-explorer' },

  { id: 'http-response', hub: 'http', topic: 'http',
    title: 'Inside an HTTP response',
    summary: 'An HTTP response is made of a **status line** (HTTP version, status code, reason phrase), **headers**, an empty line and usually a **body**.',
    html: [
      '<p>The response mirrors the request: a one-line verdict (<code>HTTP/1.1 200 OK</code>), headers that describe the answer, and the body you asked for: HTML, CSS, an image or JSON data.</p>',
      '<dl><dt><code>Content-Type</code></dt><dd>How to read the body: <code>text/html</code> is shown as a page, <code>text/css</code> applied as styles, <code>application/json</code> treated as data. The most important response header.</dd>'
        + '<dt><code>Content-Length</code></dt><dd>The size of the body in bytes.</dd>'
        + '<dt><code>Location</code></dt><dd>Where to go next: used by redirects and by <code>201 Created</code>.</dd>'
        + '<dt><code>Set-Cookie</code></dt><dd>Asks the browser to store a cookie and send it back with later requests.</dd>'
        + '<dt><code>Cache-Control</code></dt><dd>How long the response may be reused without asking again.</dd></dl>',
    ],
    code: `HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 131
Cache-Control: max-age=600

<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Hello</title></head>
<body><h1>Hello, web!</h1></body>
</html>`,
    dialect: 'HTTP',
    example: 'The sample response says: it worked (`200 OK`); the body is HTML in UTF-8, 131 bytes long, reusable for 600 seconds. An API answering `GET /api/products/42` sends the same structure with `Content-Type: application/json` and a body such as `{"id":42,"name":"Running shoes","price":89.9}`.',
    mistake: 'Judging the result by the body alone. A server can send a friendly page with status `404`, and a badly written API can send `200 OK` with `{"error":"not found"}`. Code that reads a response checks the **status code first**, and a well-designed API treats "200 with an error body" as a bug.' },

  /* ---- 3. Status codes ------------------------------------------------------------- */
  { id: 'status-families', hub: 'status', topic: 'status',
    title: 'Status code families',
    summary: 'Every response carries a three-digit **status code** whose first digit gives the family: 1xx informational, 2xx success, 3xx redirection, 4xx client error, 5xx server error.',
    html: [
      '<p>Read the first digit as "how did it go, and which side must act?": <strong>2</strong>, it worked; <strong>3</strong>, look elsewhere or use what you have; <strong>4</strong>, the request was wrong or not allowed, so the <strong>client side</strong> must change it; <strong>5</strong>, the server failed on a request that may have been valid. That digit tells you where to start debugging.</p>',
      '<table><caption>The five families</caption><thead><tr><th scope="col">Family</th><th scope="col">Meaning</th><th scope="col">Who acts next</th><th scope="col">Typical codes</th></tr></thead><tbody>'
        + '<tr><th scope="row">1xx</th><td>Informational: received, still working</td><td>Nobody; you rarely see these</td><td>100 Continue</td></tr>'
        + '<tr><th scope="row">2xx</th><td>Success</td><td>Nobody: use the body</td><td>200, 201, 204</td></tr>'
        + '<tr><th scope="row">3xx</th><td>Redirection, or "use your cached copy"</td><td>The browser, automatically</td><td>301, 302, 304</td></tr>'
        + '<tr><th scope="row">4xx</th><td>Client error: a bad or forbidden request</td><td>The client: fix the request</td><td>400, 401, 403, 404</td></tr>'
        + '<tr><th scope="row">5xx</th><td>Server error: the server failed</td><td>The server\'s developers</td><td>500, 503</td></tr>'
        + '</tbody></table>',
      '<p>The words after the number (<code>OK</code>, <code>Not Found</code>) are the <strong>reason phrase</strong>, written for people; programs read only the number.</p>',
    ],
    example: 'Your page loads but has no styles. In the Network tab, `styles.css` shows **404**: the server is fine and the path in your `<link href="…">` is wrong, so the fix is in your HTML. A **500** instead would mean the HTML is fine and the bug is in the server code.',
    mistake: '"4xx means the user typed something wrong." It means the **request** was wrong, and requests are often built by your own code: a misspelled `href`, a missing form field, a login token not sent. "Client error" names the side of the conversation, not the person.' },

  { id: 'common-status-codes', hub: 'status', topic: 'status',
    title: 'The status codes you will use',
    summary: 'About a dozen status codes cover almost every situation, best learned in pairs that are easy to confuse: 200/201, 301/302, 401/403, 404/500.',
    html: [
      '<table><caption>Common codes</caption><thead><tr><th scope="col">Code</th><th scope="col">Meaning</th><th scope="col">Typical situation</th></tr></thead><tbody>'
        + '<tr><th scope="row">200 OK</th><td>Success, here is the body</td><td>A page, or a <code>GET</code> on an API</td></tr>'
        + '<tr><th scope="row">201 Created</th><td>A new resource was created</td><td>A successful <code>POST</code>; <code>Location</code> points to it</td></tr>'
        + '<tr><th scope="row">204 No Content</th><td>Success, nothing to send back</td><td>A successful <code>DELETE</code></td></tr>'
        + '<tr><th scope="row">301 Moved Permanently</th><td>The resource has a new URL for good</td><td>A site moved from <code>http://</code> to <code>https://</code></td></tr>'
        + '<tr><th scope="row">302 Found</th><td>Temporarily at another URL</td><td>After logging in, go to the dashboard</td></tr>'
        + '<tr><th scope="row">304 Not Modified</th><td>Your cached copy is still valid</td><td>Reloading a page whose CSS did not change</td></tr>'
        + '<tr><th scope="row">400 Bad Request</th><td>The request is malformed or invalid</td><td>A required field is missing</td></tr>'
        + '<tr><th scope="row">401 Unauthorized</th><td>Not authenticated</td><td>No login token sent, or it expired</td></tr>'
        + '<tr><th scope="row">403 Forbidden</th><td>Authenticated, but not allowed</td><td>A regular user opens the admin panel</td></tr>'
        + '<tr><th scope="row">404 Not Found</th><td>Nothing at that URL</td><td>A misspelled file name in an <code>href</code></td></tr>'
        + '<tr><th scope="row">500 Internal Server Error</th><td>The server code failed</td><td>An error the server code did not handle</td></tr>'
        + '<tr><th scope="row">503 Service Unavailable</th><td>The server cannot answer right now</td><td>Maintenance or overload</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>401 is badly named:</strong> it means <strong>unauthenticated</strong> ("log in first"), while <strong>403</strong> means "I know who you are, and you may not" (see <a href="#/server/auth/authn-vs-authz">Authentication vs authorisation</a>).</li>'
        + '<li><strong>304 is not a redirect:</strong> it is in the 3xx family, but it tells the browser its cached copy is still valid, so no body is sent.</li></ul>',
    ],
    example: 'A task API: `GET /tasks` without logging in returns **401**; logged in as a regular user, `DELETE /tasks/3` (someone else\'s task) returns **403**; `GET /tasks/999` returns **404**; a valid `POST /tasks` returns **201** with `Location: /tasks/8`; a typo in the server code that throws an error returns **500**.',
    mistake: 'Answering or expecting `500` when a resource does not exist. Nothing failed on the server: the client asked for something that is not there, so the right answer is `404`. A `500` always means a bug or crash in the server.',
    practice: { href: '#/http/web/practice/http-explorer', label: 'Try methods and status codes in the HTTP explorer' } },

  /* ---- 4. In the browser ----------------------------------------------------------- */
  { id: 'rendering-pipeline', hub: 'render', topic: 'render',
    title: 'From bytes to pixels: how the browser renders',
    summary: 'The browser parses HTML into the **DOM** and CSS into the **CSSOM**, combines them into a **render tree**, computes the **layout** of every box and **paints** the pixels, repeating the affected steps whenever the page changes.',
    html: [
      '<p>The HTML that arrives is text, and a screen needs boxes and pixels. So the browser first builds two models: the <strong>DOM</strong> (Document Object Model), a tree with one object per element, and the <strong>CSSOM</strong> (CSS Object Model) for the style rules. Only then can it place each box and colour each pixel.</p>',
      '<dl><dt>Render tree</dt><dd>Only the nodes that will be shown, each with its computed styles: an element with <code>display: none</code> is in the DOM but not here.</dd>'
        + '<dt>Layout</dt><dd>The exact size and position of every box, for the current window width.</dd>'
        + '<dt>Paint</dt><dd>The pixels. When JavaScript changes the DOM, or the window is resized, the browser redoes the affected steps.</dd></dl>',
      '<p>While parsing, every <code>&lt;link rel="stylesheet"&gt;</code>, <code>&lt;img&gt;</code> or <code>&lt;script src&gt;</code> it meets triggers a new request. A classic script <strong>pauses the parser</strong> until it has downloaded and run, which is why scripts go at the end of <code>&lt;body&gt;</code> or get <code>defer</code> (see <a href="#/browser/dom/script-loading">Loading scripts</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Two models merge into one render tree; then layout and paint.',
      desc: 'The HTML becomes the DOM and the CSS becomes the CSSOM. Both feed the render tree, the visible nodes with their styles. Layout computes the size and position of every box, and paint draws the pixels.',
      nodes: [
        { id: 'dom', label: 'DOM', note: 'from the HTML' },
        { id: 'cssom', label: 'CSSOM', note: 'from the CSS' },
        { id: 'tree', label: 'Render tree', note: 'visible nodes + styles', key: true },
        { id: 'layout', label: 'Layout', note: 'sizes and positions' },
        { id: 'paint', label: 'Paint', note: 'pixels' },
      ],
      edges: [['dom', 'tree'], ['cssom', 'tree'], ['tree', 'layout'], ['layout', 'paint']],
    },
    example: 'A page links `site.css` in its `<head>` and shows a big image. The browser builds the DOM, requests `site.css` and the image in parallel, waits for the CSS (it does not paint unstyled content), lays out the boxes and paints. When the image arrives its box is filled; if the HTML gave the image no `width` and `height`, the layout is redone and the text below **jumps**.',
    mistake: 'Thinking JavaScript edits the HTML file. The file on the server never changes; JavaScript edits the **DOM**, the live copy in memory. That is why View source (the file as it arrived) and the DevTools Elements tab (the current DOM) can differ, and why a reload brings the original back.' },

  { id: 'devtools-network', hub: 'render', topic: 'render',
    title: 'Watching the conversation: the Network tab',
    summary: 'The **Network** tab of the browser DevTools lists every request a page makes, with its method, status code, type, size and time, and shows the headers and body of each one.',
    html: [
      '<p>Everything in this section is invisible while you browse; the Network tab is the call log of the browser\'s conversation with servers. Each row is one request/response pair.</p>',
      '<ol><li>Open DevTools: F12, or Ctrl+Shift+I (Cmd+Opt+I on macOS).</li>'
        + '<li>Choose <strong>Network</strong>.</li>'
        + '<li><strong>Reload</strong> the page: the tab only records while it is open.</li>'
        + '<li>Click a row: <strong>Headers</strong> shows the request line, the status and both sets of headers; <strong>Response</strong> or <strong>Preview</strong> shows the body.</li></ol>',
      '<dl><dt>Disable cache</dt><dd>See fresh <code>200</code> responses instead of cached ones.</dd>'
        + '<dt>Type filters</dt><dd>Doc, CSS, JS, Img, Fetch/XHR: show one kind of request.</dd>'
        + '<dt>Red rows</dt><dd>Failed requests: 4xx, 5xx or network errors.</dd></dl>',
    ],
    example: 'Open a news site with the Network tab open and reload. The first row is the document itself (type `document`, status `200`, `Content-Type: text/html`); then come dozens of rows for CSS, JavaScript, images and fonts, many from other hosts. If your own page shows a red row `logo.png 404`, the Headers panel shows the exact URL requested, so you can see which part of your `src` path is wrong.',
    mistake: 'Opening the Network tab after the page has loaded and finding it empty. The tab only records while DevTools is open: open it first, then reload.' },

  /* ---- 5. The big picture ---------------------------------------------------------- */
  { id: 'frontend-backend', hub: 'stack', topic: 'stack',
    title: 'Front end and back end',
    summary: 'The **front end** is the code that runs in the user\'s browser (HTML, CSS, JavaScript); the **back end** is the code that runs on the server, together with the database.',
    html: [
      '<p>Ask one question about any code: <strong>where does it run?</strong> In the browser it can draw the page and react to clicks, but the user can read and change it, so it never holds secrets or makes final decisions. On the server it can keep secrets, enforce rules and store data, but it cannot touch the page: it can only send responses.</p>',
      '<table><caption>The two halves</caption><thead><tr><th scope="col"></th><th scope="col">Front end</th><th scope="col">Back end</th></tr></thead><tbody>'
        + '<tr><th scope="row">Runs on</th><td>The user\'s browser</td><td>The server</td></tr>'
        + '<tr><th scope="row">Typical tools</th><td>HTML, CSS, JavaScript, often a front-end framework</td><td>A server runtime such as Node.js, and a database</td></tr>'
        + '<tr><th scope="row">Good at</th><td>Drawing the page, reacting instantly to the user</td><td>Storing data, keeping secrets, enforcing rules</td></tr>'
        + '<tr><th scope="row">Cannot</th><td>Be trusted: the user controls it</td><td>Change the page directly: it only answers requests</td></tr>'
        + '</tbody></table>',
      '<p>The two halves talk over HTTP, usually through an <strong>API</strong> that answers with JSON data rather than whole pages. <strong>Full stack</strong> means working on both halves and on the contract between them; how the layers build up is in <a href="#/http/web/course-map">From static pages to a full-stack app</a>.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'The browser asks; only the server touches the data.',
      desc: 'The front end, running in the browser, sends HTTP requests to the back end, running on the server. Only the back end queries the database, and it answers the front end with data.',
      nodes: [
        { id: 'fe', label: 'Front end', note: 'runs in the browser' },
        { id: 'be', label: 'Back end', note: 'runs on the server' },
        { id: 'db', label: 'Database', note: 'keeps the data' },
      ],
      edges: [['fe', 'be', 'HTTP requests'], ['be', 'db', 'queries']],
    },
    example: 'Adding a task in a to-do app: the front end checks that the title is not empty and shows an error at once (a good experience), then sends `POST /api/tasks`. The back end checks the title **again**, saves it in the database and answers `201 Created` with the new task as JSON, and the front end adds it to the list on screen.',
    mistake: 'Trusting checks done only in the front end. Anyone can open DevTools and delete a `required` attribute, or skip your page and send the request with `curl`. Every rule that matters (prices, permissions, validation) is checked again in the back end.' },

  { id: 'static-dynamic', hub: 'stack', topic: 'stack',
    title: 'Static and dynamic',
    summary: 'A **static** response is a file sent exactly as it is stored, the same for everyone; a **dynamic** response is generated by server code for each request, usually from a database.',
    html: [
      '<p>Static: the server hands out copies of files that already exist (<code>index.html</code>, <code>styles.css</code>, <code>logo.png</code>). Dynamic: the server runs code for each request and builds an answer for that user at that moment, such as an inbox, a cart or search results.</p>',
      '<p>Do not confuse <strong>dynamic</strong> with <strong>interactive</strong>. A static file can include JavaScript that opens menus and reacts to clicks: it is interactive in the browser, but the server still sends the same file to everyone. A <strong>single-page application</strong> (SPA) goes further: one HTML page whose JavaScript fetches data and redraws parts of the page (see <a href="#/browser/routing/mpa-vs-spa">Multi-page sites and single-page apps</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The question is who builds the response: a stored file, or code at that moment.',
      desc: 'A request reaches the server. If the answer is a file that already exists, the server sends it as stored, the same for everyone: static. If code runs to build the answer for this user, usually from a database: dynamic.',
      nodes: [
        { id: 'req', label: 'A request' },
        { id: 'static', label: 'Static', note: 'the stored file, for all' },
        { id: 'dynamic', label: 'Dynamic', note: 'built by code, per user' },
      ],
      edges: [['req', 'static', 'a file exists'], ['req', 'dynamic', 'code runs']],
    },
    example: 'A small football club site (home, fixtures, squad, tickets) is static: you can open `fixtures.html` straight from your disk (`file://…`) without any server. A "My tickets" page listing what the logged-in member bought cannot be static: the server must look the member up in a database, which is a job for a back end (see [Server-side JavaScript](#/server/runtime)).',
    mistake: 'Calling a page "dynamic" because it has animations or a drop-down menu. Those run in the browser; if the server sends the same file to everyone, the site is static.' },

  { id: 'course-map', hub: 'stack', topic: 'stack',
    title: 'From static pages to a full-stack app',
    summary: 'A web application is built in layers: a **static site** (HTML and CSS), made **interactive** with browser JavaScript, backed by a **server API** that answers with JSON and stores data in a **database**, and often topped by a **front-end application** that redraws the page from that data.',
    html: [
      '<p>Inside the browser the three languages have separate jobs: <strong>HTML</strong> gives structure (what each thing is), <strong>CSS</strong> gives presentation (how it looks) and <strong>JavaScript</strong> gives behaviour (what it does). They appeared as HTML (1991), JavaScript (1995) and CSS (1996).</p>',
      '<p>The layers are one project, not separate subjects: each keeps the ones before it and adds one capability.</p>',
      '<table><caption>The layers of a typical web application</caption><thead><tr><th scope="col">Layer</th><th scope="col">What it adds</th><th scope="col">Typical tools</th><th scope="col">Runs on</th></tr></thead><tbody>'
        + '<tr><th scope="row">Static site</th><td>Content and structure, then presentation and layout</td><td>Semantic HTML, CSS (box model, Flexbox, Grid)</td><td>Browser</td></tr>'
        + '<tr><th scope="row">Interactive front end</th><td>Behaviour: reacting to clicks, validating forms, changing the page</td><td>JavaScript and the DOM</td><td>Browser</td></tr>'
        + '<tr><th scope="row">Server and API</th><td>Shared data, rules and secrets, answered as JSON over HTTP</td><td>A server runtime and a web framework, REST design, authentication</td><td>Server</td></tr>'
        + '<tr><th scope="row">Database</th><td>Data that survives restarts and is shared by every user</td><td>A relational database (SQL) or a document database</td><td>Database server</td></tr>'
        + '<tr><th scope="row">Front-end application</th><td>One page that fetches data from the API and redraws only what changed</td><td>Components, state and client-side routing</td><td>Browser</td></tr>'
        + '</tbody></table>',
      '<dl><dt>Front-end developer</dt><dd>The browser side: HTML, CSS, JavaScript, a front-end framework, accessibility and performance.</dd>'
        + '<dt>Back-end developer</dt><dd>The server side: API design, business rules, databases, authentication, security.</dd>'
        + '<dt>Full-stack developer</dt><dd>Both halves, and above all the HTTP contract between them: which URLs exist, what JSON they accept and return, and which status codes they answer.</dd></dl>',
      '<p>Whatever the role, the HTTP vocabulary of this section (methods, status codes, headers, JSON bodies, statelessness) is the shared language of every layer, and version control records every step (see <a href="#/vcs/repositories">Version control</a>).</p>',
    ],
    example: 'A task tracker grows layer by layer: a static `tasks.html` with a form; JavaScript that checks the title is not empty and adds the task to the list; an API where `POST /api/tasks` answers `201 Created` and `GET /api/tasks/999` answers `404`; a database, so the tasks survive a restart and every device sees the same list; finally a front-end app that adds the new task without reloading the page.',
    mistake: 'Treating "how the web works" as theory you can skip. Every later layer assumes it: server frameworks, API design and authentication all talk about headers, status lines, JSON bodies and statelessness without introducing them again.' },
];

DATA.en.WEB_QUIZ = [
  /* client and server */
  { type: 'mc', topic: 'clientserver',
    q: 'A page has one HTML file that references 2 stylesheets, 1 script and 5 images. Ignoring caching, how many HTTP requests does the browser send to show it?',
    choices: ['1, because the server bundles everything into the HTML', '8', '9', 'It depends on how many links the user clicks'],
    answer: 2,
    why: 'One request for the HTML, then **one more for each referenced file**: 1 + 2 + 1 + 5 = 9.' },
  { type: 'tf', topic: 'clientserver',
    q: 'In plain HTTP, a server can send a new page to a browser that did not request it.',
    answer: false,
    why: 'HTTP is request/response: the server only **answers**. Changes on screen come from new requests made by the browser.' },
  { type: 'mc', topic: 'clientserver',
    q: 'You open `http://localhost:3000` in your browser while your own server program is running on your laptop. Which statement is correct?',
    choices: ['There is no server involved because nothing leaves your laptop', 'Your laptop is acting as both client (the browser) and server (your server program)', 'localhost is a public website run by your internet provider', 'The browser runs the server code itself'],
    answer: 1,
    why: 'Client and server are **programs**, not machines: here both run on the same computer, and `localhost` points to it.' },

  /* URLs and DNS */
  { type: 'mc', topic: 'clientserver',
    q: 'In `https://api.example.com/users/42?fields=name#top`, which part is the **path**?',
    choices: ['`api.example.com`', '`/users/42`', '`fields=name`', '`top`'],
    answer: 1,
    why: 'Host = `api.example.com`, path = `/users/42`, query string = `fields=name`, fragment = `top`.' },
  { type: 'mc', topic: 'clientserver',
    q: 'Which part of a URL is **never sent** to the server?',
    choices: ['The query string', 'The path', 'The fragment (after `#`)', 'The port'],
    answer: 2,
    why: 'The fragment is used only by the browser, for example to scroll to the element with that `id`.' },
  { type: 'fib', topic: 'clientserver',
    q: 'If an `https` URL does not write a port, the browser connects to port ___.',
    accept: ['443'],
    why: 'Default ports: 443 for `https`, 80 for `http`.' },
  { type: 'mc', topic: 'clientserver',
    q: 'A student writes `<a href="www.wikipedia.org">Wikipedia</a>`. What happens when the link is clicked?',
    choices: ['It opens Wikipedia over HTTPS', 'It opens Wikipedia over HTTP', 'The browser looks for a file called `www.wikipedia.org` relative to the current page, usually giving a 404', 'The browser refuses to render the link'],
    answer: 2,
    why: 'Without a scheme the value is a **relative path**. External links need `https://`.' },
  { type: 'mc', topic: 'clientserver',
    q: 'What does DNS do?',
    choices: ['Translates a host name into an IP address', 'Encrypts the request', 'Chooses the HTTP method', 'Converts HTML into the DOM'],
    answer: 0,
    why: 'DNS is the phone book of the internet: names to numeric addresses. Only the host takes part, not the path.' },
  { type: 'tf', topic: 'clientserver',
    q: 'If the browser cannot find a server\'s address via DNS, the server answers with status code 404.',
    answer: false,
    why: 'If DNS fails, **no HTTP request is sent**, so there is no status code. 404 means the server was found and answered.' },

  /* HTTP messages */
  { type: 'mc', topic: 'http',
    q: 'Which list gives the parts of an HTTP request in order?',
    choices: ['Status line, headers, empty line, body', 'Headers, request line, body', 'Method, body, headers', 'Request line, headers, empty line, optional body'],
    answer: 3,
    why: 'Requests start with a **request line** (method, path, version); responses start with a **status line**.' },
  { type: 'mc', topic: 'http',
    q: 'Which response header tells the browser whether the body is HTML, CSS or JSON?',
    choices: ['`Host`', '`Accept`', '`Content-Type`', '`Location`'],
    answer: 2,
    why: '`Content-Type` (e.g. `text/html`, `text/css`, `application/json`) says how to interpret the body. `Accept` is the client\'s wish list in the request.' },
  { type: 'fib', topic: 'clientserver',
    q: 'HTTP is ___: the server does not automatically remember previous requests from the same client, so identity must be sent with every request (cookie or token).',
    accept: ['stateless'],
    why: 'Statelessness is why a logged-in front end sends a cookie or token with every request.' },
  { type: 'mc', topic: 'http',
    q: 'A login form must send an email and a password. Which choice is best?',
    choices: ['POST, with both values in the body, over HTTPS', 'GET, with both values in the query string', 'GET, with both values in the fragment', 'DELETE, because it removes the logged-out state'],
    answer: 0,
    why: 'URLs end up in history and logs; secrets go in the **body** of a POST, and HTTPS encrypts it.' },
  { type: 'mc', topic: 'http',
    q: 'A user marks task 7 as done. Which request changes **only** that field?',
    choices: ['`GET /tasks/7?done=true`', '`PUT /tasks/7` with `{"done":true}`', '`PATCH /tasks/7` with `{"done":true}`', '`POST /tasks/7/done` with an empty body'],
    answer: 2,
    why: 'PATCH = partial update. PUT replaces the whole resource with what you send; GET must not change data.' },
  { type: 'tf', topic: 'clientserver',
    q: 'The padlock of HTTPS guarantees that the website is honest and safe to give your card number to.',
    answer: false,
    why: 'HTTPS means the **connection** is encrypted and the server is who its certificate says; a scam site can have HTTPS too.' },
  { type: 'mc', topic: 'http',
    q: 'Which of these is **JSON**?',
    choices: ['`<task done="true">Study</task>`', '`title=Study&done=false`', '`{title: Study, done: no}`', '`{"title":"Study","done":false}`'],
    answer: 3,
    why: 'JSON uses `{ }` with **double-quoted keys** and values that are strings, numbers, `true`/`false`, `null`, arrays or objects. `title=Study&done=false` is form encoding.' },

  /* status codes */
  { type: 'mc', topic: 'status',
    q: 'Your page shows no images. In the Network tab, the image requests show status **404**. Where is the problem most likely?',
    choices: ['The server crashed', 'The DNS lookup failed', 'The browser cache is full', 'The `src` paths in your HTML do not match the files'],
    answer: 3,
    why: '4xx = the **request** is wrong; here the requested path does not exist. A crash would be 5xx; a DNS failure gives no status at all.' },
  { type: 'mc', topic: 'status',
    q: 'A logged-in student calls an admin-only API URL. Which status code fits best?',
    choices: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
    answer: 1,
    why: '403 = "I know who you are, but you are not allowed". 401 would mean "I do not know who you are".' },
  { type: 'mc', topic: 'status',
    q: 'A successful `POST /tasks` creates task 8. Which response is the most precise?',
    choices: ['`201 Created` with a `Location: /tasks/8` header', '`200 OK` with `{"error":null}`', '`204 No Content`', '`302 Found`'],
    answer: 0,
    why: '201 says a resource was created, and `Location` says where it is.' },
  { type: 'fib', topic: 'status',
    q: 'A status code of the ___xx family means the server failed while handling a request that may have been valid.',
    accept: ['5', '5xx'],
    why: '5xx = server error (e.g. 500, 503); 4xx = client error.' },
  { type: 'tf', topic: 'status',
    q: '304 Not Modified tells the browser to go to a different URL.',
    answer: false,
    why: 'Although it is in the 3xx family, 304 means "your cached copy is still valid": no new body, no new URL.' },

  /* rendering */
  { type: 'mc', topic: 'render',
    q: 'Which order matches how the browser turns a response into pixels?',
    choices: ['Paint → layout → DOM', 'CSSOM → paint → DOM → layout', 'DOM and CSSOM → render tree → layout → paint', 'Layout → DOM → CSSOM → paint'],
    answer: 2,
    why: 'Build the models (DOM, CSSOM), keep the visible nodes (render tree), compute sizes and positions (layout), then paint.' },
  { type: 'tf', topic: 'render',
    q: 'When JavaScript changes the text of a heading, the HTML file on the server is changed too.',
    answer: false,
    why: 'JavaScript changes the **DOM**, the browser\'s live copy in memory. Reloading brings back the original file.' },
  { type: 'mc', topic: 'render',
    q: 'You open the Network tab on a page that has already finished loading and the list is empty. What should you do?',
    choices: ['Nothing: the page made no requests', 'Reload the page with the Network tab open', 'Open View source instead', 'Clear the browser history'],
    answer: 1,
    why: 'The Network tab records only while DevTools is open.' },

  /* the big picture */
  { type: 'mc', topic: 'stack',
    q: 'Which task belongs to the **back end**?',
    choices: ['Highlighting a button when the mouse is over it', 'Laying out cards in a grid', 'Showing an error next to an empty input before sending the form', 'Checking the password against the stored user in the database'],
    answer: 3,
    why: 'Anything that needs secrets, stored data or trusted decisions runs on the server.' },
  { type: 'tf', topic: 'stack',
    q: 'A static HTML page cannot contain JavaScript, otherwise it would be a dynamic site.',
    answer: false,
    why: 'Static vs dynamic is about whether the **server** builds the response per request. A static file can still run JavaScript in the browser.' },
  { type: 'mc', topic: 'stack',
    q: 'A to-do app must keep the tasks after the browser is closed and show the same list on every device. Which layer has to be added to a static site with JavaScript?',
    choices: ['More CSS', 'A server API backed by a database', 'A larger HTML file', 'A version control repository'],
    answer: 1,
    why: 'Shared, persistent data lives on the **back end**: a server API that stores it in a database. Browser JavaScript alone only changes the page on one device.' },
];
