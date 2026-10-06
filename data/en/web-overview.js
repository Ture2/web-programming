'use strict';
/* How the web works: concept cards, rail groups and self-check quiz (client and server, URLs,
   HTTP, status codes, rendering, front end and back end). See site/README.md for the data
   contract. `hub` and `topic` keys match WEB_QUIZ_TOPICS and WEB_GROUPS. */

DATA.en.WEB_QUIZ_TOPICS = {
  clientserver: 'Client and server',
  url: 'URLs and DNS',
  http: 'HTTP requests and responses',
  status: 'Status codes',
  render: 'How the browser renders',
  stack: 'Front end, back end and the full stack',
};

DATA.en.WEB_GROUPS = [
  { key: 'clientserver', label: 'Client and server', icon: 'split' },
  { key: 'url', label: 'URLs and DNS', icon: 'link' },
  { key: 'http', label: 'HTTP messages', icon: 'arrow' },
  { key: 'status', label: 'Status codes', icon: 'table' },
  { key: 'render', label: 'Rendering and DevTools', icon: 'steps' },
  { key: 'stack', label: 'The big picture', icon: 'pyramid' },
];

DATA.en.WEB_CONCEPTS = [
  /* ---- 1. Client and server ------------------------------------------------------- */
  { id: 'client-server', hub: 'clientserver', topic: 'clientserver', 
    title: 'Client and server: a conversation',
    summary: 'The web works as a conversation between two programs: a **client** (usually the browser) sends a **request**, and a **server** answers with a **response**.',
    body: [
      'Think of a restaurant. You (the client) order from the waiter; the kitchen (the server) prepares the dish and sends it back. Nothing arrives at your table until you order it. On the web it is the same: the browser never receives a page it did not ask for. Every file it shows arrived because it sent a request for that file.',
      'The **client** is the program that starts the conversation: usually the browser (but also command-line tools such as `curl` and your own JavaScript code). The **server** is a program that waits for requests, decides how to answer each one and sends a response. The word "server" is also used for the computer that runs that program. Both are just software: when you build a back end you run a server on your own laptop at `http://localhost:3000`, so the same machine is client and server at once.',
      'One page is usually **many conversations**. The browser first requests the HTML; while reading it, it finds references to other files (stylesheets, scripts, images, fonts) and sends **one more request for each of them**.',
    ],
    points: [
      '**Request**: what the client asks for (which resource, what to do with it, extra information).',
      '**Response**: the answer (how it went, plus the content, e.g. the HTML of a page).',
      'Requests and responses always come in **pairs**, and the client always speaks first.',
    ],
    example: 'You open `https://www.cunef.edu/`. (1) The browser sends a request for the page `/`. (2) The server answers with a response that contains HTML. (3) The HTML mentions `styles.css`, `logo.png` and `app.js`, so the browser sends three more requests and gets three more responses. Loading that one page took **four** request/response pairs, and a real site often needs fifty or more.',
    mistake: 'Thinking the website "lives" in your browser, or that the server keeps sending updates on its own. In plain HTTP the server only ever **answers**. If what you see changes, it is because the browser asked again (you reloaded, or JavaScript requested new data).' },

  /* ---- 2. URLs and DNS ------------------------------------------------------------ */
  { id: 'url-anatomy', hub: 'url', topic: 'url', 
    title: 'Anatomy of a URL',
    summary: 'A **URL** (Uniform Resource Locator) is the address of one resource: it says how to talk (scheme), to which server (host and port), what to ask for (path), with which options (query string), and where to look inside the result (fragment).',
    body: [
      'Read a URL like a postal address, from big to small: the **scheme** is the kind of delivery, the **host** is the building, the **port** is the door, the **path** is the flat, the **query string** is a note with extra instructions and the **fragment** is a sticky note saying which page of the letter to open first.',
      'The **port** is usually omitted because each scheme has a default: **80** for `http` and **443** for `https`. You will see it written when a server listens on another port, as in `http://localhost:3000` while you develop a server on your own laptop.',
      'The **query string** starts with `?` and holds `key=value` pairs joined by `&`. Characters that are not allowed in a URL (spaces, accents, `@`) are **percent-encoded**: a space becomes `%20`, `@` becomes `%40`.',
      'The **fragment** (after `#`) is special: the browser **never sends it to the server**. It is used only in the browser, typically to scroll to the element whose `id` matches it.',
    ],
    table: {
      caption: 'The parts of `https://shop.example.com:8443/products/42?color=red&size=m#reviews`',
      head: ['Part', 'Value here', 'What it does'],
      rows: [
        ['Scheme', '`https`', 'Protocol to use; `https` means HTTP over an encrypted connection.'],
        ['Host', '`shop.example.com`', 'Name of the server; DNS turns it into an IP address.'],
        ['Port', '`8443`', 'Which program on that machine; default 443 for https, 80 for http.'],
        ['Path', '`/products/42`', 'Which resource on that server.'],
        ['Query string', '`color=red&size=m`', 'Options for the request, as `key=value` pairs after `?`.'],
        ['Fragment', '`reviews`', 'A position inside the resource; stays in the browser.'],
      ],
    },
    example: 'In `https://maps.example.com/search?q=madrid&zoom=12#results` the browser contacts `maps.example.com` on port 443 (the default for https) and asks for `/search?q=madrid&zoom=12`. Changing `zoom=12` to `zoom=15` asks the same resource with a different option. The `#results` part is never sent: the browser uses it afterwards to scroll to the element with `id="results"`.',
    mistake: 'Writing a link without the scheme: `<a href="www.example.com">`. Without `https://` the browser treats the value as a **relative path** and looks for a file called `www.example.com` in the current folder, which gives a 404. External links need the full absolute URL.',
    widget: 'url-anatomy' },

  { id: 'dns', hub: 'url', topic: 'url', 
    title: 'DNS: from names to addresses',
    summary: 'The **DNS** (Domain Name System) is the phone book of the internet: it translates a host name such as `www.cunef.edu` into the **IP address** of the server.',
    body: [
      'Computers reach each other by numeric **IP addresses** (for example `93.184.215.14`, or a longer IPv6 address), the way phones use numbers. People remember names. So before the browser can send any request, it looks up the number behind the name: that lookup is a **DNS query**.',
      'The browser asks a **DNS resolver** (normally run by your network or internet provider). The answer is cached for a while, so the next visit skips the lookup. Only the **host** takes part in the lookup; the path, query string and fragment play no role in DNS.',
      'The name `localhost` is special: it always means "this same computer" (address `127.0.0.1`). You use it to reach a server running on your own laptop while you develop it.',
    ],
    points: [
      '1. You type or click a URL.',
      '2. **DNS**: the host name is translated into an IP address.',
      '3. The browser opens a connection to that IP address and port (for `https`, it also sets up encryption).',
      '4. It sends the **HTTP request**.',
      '5. It receives the **HTTP response**.',
      '6. It **renders** the page, requesting any further files it needs (each one repeats steps 2-5, with DNS answers usually cached).',
    ],
    example: 'For `https://www.cunef.edu/grados`, the DNS query asks only for `www.cunef.edu` and returns an IP address. The browser connects to that address on port 443 and sends `GET /grados`, adding a `Host: www.cunef.edu` header, because one IP address can host many different sites and the server needs to know which one you want.',
    mistake: 'Calling every failure "a 404". If the browser says the server\'s address could not be found (Chrome shows `DNS_PROBE_FINISHED_NXDOMAIN`), the DNS lookup failed and **no HTTP request was ever sent**, so there is no status code at all. A `404` means the opposite: the server was found and it answered "I do not have that resource".' },

  /* ---- 3. HTTP messages ----------------------------------------------------------- */
  { id: 'http-basics', hub: 'http', topic: 'http', 
    title: 'HTTP and HTTPS',
    summary: '**HTTP** (HyperText Transfer Protocol) is the agreed format of the request and response messages between client and server; **HTTPS** is the same protocol sent through an encrypted connection.',
    body: [
      'A **protocol** is an agreed format, like the layout of a formal letter: everyone knows where to find the date, the addressee and the signature. Because HTTP fixes where the method, the address, the extra information and the content go, any browser can talk to any server, whoever wrote them.',
      'In HTTP/1.1 each message is readable text: a **first line**, some **headers** (one `Name: value` per line), an **empty line**, and an optional **body**. Newer versions (HTTP/2 and HTTP/3) pack the same information in a compact binary form, but the meaning is identical, and DevTools shows the method, path, headers, status and body the same way for all of them.',
      'HTTP is **stateless**: the server handles each request on its own and does not automatically remember earlier requests from the same client. When a site "remembers" you (you stay logged in, your cart keeps its items), it is because the browser sends an identifier **with every request**, usually a **cookie** or a **token** in a header. Every login system is built on this idea (see [Authentication and security](#/server/auth)).',
      '**HTTPS** wraps HTTP in **TLS** encryption: nobody between you and the server (for example on public Wi-Fi) can read or modify the messages, and the server proves its identity with a certificate. The padlock in the address bar means the connection is private; it does not mean the site itself is honest.',
    ],
    example: 'HTTP is a postcard: every post office it passes through can read it. HTTPS puts the same postcard in a sealed envelope. If a login form were sent over `http://` on a café network, the email and password would travel as readable text; over `https://` the network only sees that you talked to that server.',
    mistake: 'Believing the server "knows" it is you because you visited a second ago. Without a cookie or token sent again, your second request is as anonymous to the server as your first one: that is what stateless means.' },

  { id: 'http-request', hub: 'http', topic: 'http', 
    title: 'Inside an HTTP request',
    summary: 'An HTTP request is made of a **request line** (method, path, HTTP version), **headers**, an empty line and an optional **body**.',
    body: [
      'Picture an envelope with a form inside. The **request line** says what you want (`GET /products/42`). The **headers** are labels on the envelope: which site, which browser, which formats you accept, what kind of content is inside, who you are. The **body** is the content of the envelope, and it is only there when you send data, such as a form or JSON.',
      'Common request headers: `Host` (which site; one IP address can serve many), `User-Agent` (which browser or tool), `Accept` (which response formats the client prefers), `Content-Type` (the format of the body, when there is one), and `Cookie` or `Authorization` (who you are).',
      'A `GET` request normally has **no body**: its inputs travel in the URL (path and query string). `POST`, `PUT` and `PATCH` usually carry a body, and then `Content-Type` tells the server how to read it: `application/x-www-form-urlencoded` for a classic HTML form (`email=ana%40example.com&remember=on`), `application/json` for JSON.',
    ],
    code: `POST /api/login HTTP/1.1
Host: shop.example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: application/json
Content-Type: application/json
Content-Length: 48

{"email":"ana@example.com","password":"s3cret!"}`,
    dialect: 'HTTP',
    example: 'Reading the request above line by line: the **request line** says "create something at `/api/login` using HTTP/1.1"; `Host` names the site; `Accept` asks for a JSON answer; `Content-Type` announces that the body is JSON and `Content-Length` that it is 48 bytes long; after the **empty line** comes the **body** with the login data. On the server, a framework such as Express parses that body into an object (`req.body`).',
    mistake: 'Putting secrets in the URL of a GET request, e.g. `/login?password=s3cret!`. URLs are saved in browser history, bookmarks and server logs. Sensitive data belongs in the **body** of a POST request, sent over HTTPS.',
    widget: 'http-explorer' },

  { id: 'http-response', hub: 'http', topic: 'http', 
    title: 'Inside an HTTP response',
    summary: 'An HTTP response is made of a **status line** (HTTP version, status code, reason phrase), **headers**, an empty line and usually a **body**.',
    body: [
      'The response mirrors the request. The **status line** is the one-line verdict (`HTTP/1.1 200 OK`). The **headers** describe the answer. The **body** is the thing you asked for: the HTML of a page, a CSS file, an image or JSON data.',
      'The key response header is `Content-Type`: it tells the client how to interpret the bytes of the body. The browser shows a body as a web page if it arrives as `text/html`, applies it as styles if it is `text/css`, and treats it as data if it is `application/json`. Other headers you will meet: `Content-Length` (size of the body in bytes), `Location` (where to go next, used by redirects and by `201 Created`), `Set-Cookie` (asks the browser to store a cookie) and `Cache-Control` (how long the response may be reused).',
      '**JSON** (JavaScript Object Notation) is the text format APIs use to send data: objects in `{ }` with keys in double quotes, arrays in `[ ]`, and values that are strings, numbers, `true`/`false` or `null`. A server API answers with JSON bodies, and front-end JavaScript (by hand or through a framework such as React) reads them and builds the page.',
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
    example: 'The response above says: it worked (`200 OK`); the body is HTML encoded as UTF-8; it is 131 bytes long; you may reuse it for 600 seconds. An API answering `GET /api/products/42` would send the same structure with `Content-Type: application/json` and a body such as `{"id":42,"name":"Running shoes","price":89.9,"inStock":true}`.',
    mistake: 'Judging the result by the body alone. A server can send a friendly page with status `404`, and a badly written API can send `200 OK` with `{"error":"not found"}` in the body. Code that reads a response should check the **status code first**, and a well-designed API treats "200 with an error body" as a bug.' },

  { id: 'http-methods', hub: 'http', topic: 'http', 
    title: 'HTTP methods',
    summary: 'The **method** (or verb) is the first word of a request and states the intent: read (`GET`), create or submit (`POST`), replace (`PUT`), partially update (`PATCH`) or remove (`DELETE`).',
    body: [
      'The path says **which** resource; the method says **what to do** with it. The same path `/tasks/7` can be read with `GET`, changed with `PATCH` and removed with `DELETE`. REST APIs are designed on this idea: nouns in the URL, verbs in the method (see [Designing APIs](#/http/api-design)).',
      'In the browser, typing a URL, clicking a link and loading an image all send `GET`. An HTML `<form>` can send only `GET` or `POST`. The other methods are sent from JavaScript or from tools such as `curl` and Postman.',
      'Two properties matter later. A **safe** method (`GET`) should not change anything on the server, so browsers, caches and search engines may repeat or prefetch it freely. An **idempotent** method (`GET`, `PUT`, `DELETE`) has the same final effect whether you send it once or three times. `POST` is neither: sending it twice usually creates two things.',
    ],
    table: {
      caption: 'The five everyday methods, on a to-do list API',
      head: ['Method', 'Intent', 'Body?', 'Example'],
      rows: [
        ['`GET`', 'Read a resource or a list', 'No', '`GET /tasks/7` returns task 7'],
        ['`POST`', 'Create a resource / submit data', 'Yes', '`POST /tasks` with the new task creates task 8'],
        ['`PUT`', 'Replace a resource completely', 'Yes', '`PUT /tasks/7` with the full new version of task 7'],
        ['`PATCH`', 'Change some fields of a resource', 'Yes', '`PATCH /tasks/7` with `{"done":true}`'],
        ['`DELETE`', 'Remove a resource', 'Usually no', '`DELETE /tasks/7`'],
      ],
    },
    example: 'A user ticks task 7 as done. The front end sends `PATCH /tasks/7` with the body `{"done":true}`: only that field changes. If it sent `PUT /tasks/7` with `{"done":true}`, the task would be **replaced** by an object that has no title any more, because PUT means "this is the whole new version".',
    mistake: 'Using GET for actions that change data, e.g. a link `<a href="/tasks/7/delete">`. Browsers prefetch links, and crawlers and chat-app link previews follow GET links automatically, so a bot could delete your data. Changes must use POST, PUT, PATCH or DELETE.',
    practice: { href: '#/http/web/practice/http-explorer', label: 'Open the HTTP explorer' } },

  /* ---- 4. Status codes ------------------------------------------------------------ */
  { id: 'status-families', hub: 'status', topic: 'status', 
    title: 'Status code families',
    summary: 'Every response carries a three-digit **status code**; its first digit gives the family: 1xx informational, 2xx success, 3xx redirection, 4xx client error, 5xx server error.',
    body: [
      'Read the first digit as the answer to "how did it go, and which side must act?". **2** = it worked. **3** = look somewhere else (or use what you already have). **4** = the request was wrong or not allowed, so the **client side** must change something. **5** = the server failed on a request that may have been perfectly valid. That single digit tells you where to start debugging.',
      'The words after the number (`OK`, `Not Found`) are the **reason phrase**: a human-readable label. Programs only look at the number.',
    ],
    table: {
      caption: 'The five families',
      head: ['Family', 'Meaning', 'Who acts next', 'Typical codes'],
      rows: [
        ['1xx', 'Informational: received, still working', 'Nobody; you rarely see these', '100 Continue'],
        ['2xx', 'Success', 'Nobody: use the body', '200 OK · 201 Created · 204 No Content'],
        ['3xx', 'Redirection or "use your cached copy"', 'The browser, automatically', '301 · 302 · 304'],
        ['4xx', 'Client error: bad or forbidden request', 'The client: fix the request', '400 · 401 · 403 · 404'],
        ['5xx', 'Server error: the server failed', 'The server\'s developers', '500 · 503'],
      ],
    },
    example: 'Your page loads but has no styles. In the Network tab, `styles.css` shows **404**: the server is fine, the path in your `<link href="...">` is wrong, so the fix is in your HTML. If it showed **500** instead, the HTML would be fine and the bug would be in the server code.',
    mistake: '"4xx means the user typed something wrong." It means the **request** was wrong, and requests are often built by your own code: a misspelled `href`, a form field missing, a login token not sent. "Client error" names the side of the conversation, not the person.' },

  { id: 'common-status-codes', hub: 'status', topic: 'status', 
    title: 'The status codes you will use',
    summary: 'About a dozen codes cover almost every situation; learn them in pairs that are easy to confuse: 200/201, 301/302, 401/403, 404/500.',
    body: [
      'Think of status codes as the server\'s short answers at a ticket office: "here you are" (200), "done, here is your new ticket" (201), "that counter moved, go there" (301/302), "the ticket you have is still valid" (304), "your form is filled in wrong" (400), "show me your ID" (401), "your ID is fine but this area is staff-only" (403), "no such event" (404), "our system crashed" (500), "closed for maintenance, come back later" (503).',
      '**401 Unauthorized** is badly named: it really means **unauthenticated** ("I do not know who you are, log in"). **403 Forbidden** means "I know who you are, and you are not allowed". **304 Not Modified** belongs to the 3xx family but is not a real redirect: it tells the browser that its cached copy is still valid, so the body is not sent again.',
    ],
    table: {
      caption: 'Common codes',
      head: ['Code', 'Meaning', 'Typical situation'],
      rows: [
        ['200 OK', 'Success, here is the body', 'A page or a `GET` on an API'],
        ['201 Created', 'A new resource was created', 'A successful `POST`; `Location` header points to it'],
        ['204 No Content', 'Success, nothing to send back', 'A successful `DELETE`'],
        ['301 Moved Permanently', 'The resource has a new URL for good', 'A site moved from `http://` to `https://`'],
        ['302 Found', 'Temporarily at another URL', 'After logging in, go to the dashboard'],
        ['304 Not Modified', 'Your cached copy is still valid', 'Reloading a page whose CSS did not change'],
        ['400 Bad Request', 'The request is malformed or invalid', 'A required field is missing'],
        ['401 Unauthorized', 'Not authenticated', 'No login token sent, or it expired'],
        ['403 Forbidden', 'Authenticated but not allowed', 'A student opens the admin panel'],
        ['404 Not Found', 'No resource at that URL', 'A misspelled file name in an `href`'],
        ['500 Internal Server Error', 'The server code failed', 'An uncaught exception in a route'],
        ['503 Service Unavailable', 'The server cannot answer right now', 'Maintenance or overload'],
      ],
    },
    example: 'A task API: `GET /tasks` without logging in returns **401**; logged in as a student, `DELETE /tasks/3` (a task owned by someone else) returns **403**; `GET /tasks/999` returns **404**; a valid `POST /tasks` returns **201** with `Location: /tasks/8`; a typo in the server code that throws an error returns **500**.',
    mistake: 'Answering or expecting `500` when a resource does not exist. Nothing failed on the server: the client asked for something that is not there, so the right answer is `404`. A `500` should always mean a bug or crash in the server.',
    practice: { href: '#/http/web/practice/http-explorer', label: 'Try methods and status codes in the HTTP explorer' } },

  /* ---- 5. Rendering --------------------------------------------------------------- */
  { id: 'rendering-pipeline', hub: 'render', topic: 'render', 
    title: 'From bytes to pixels: how the browser renders',
    summary: 'The browser parses HTML into the **DOM** and CSS into the **CSSOM**, combines them into a **render tree**, computes the **layout** (size and position of every box) and **paints** the pixels; JavaScript can change the DOM, and the browser repeats the steps that are affected.',
    body: [
      'The HTML that arrives is just text, and a screen cannot show "text about a page". Like a builder who first turns a written description into a plan, the browser first builds a model of the page: the **DOM** (Document Object Model), a tree with one object per element. It builds a second model for the style rules, the **CSSOM** (CSS Object Model). Only then can it decide where each box goes and what colour each pixel is.',
      'While parsing the HTML, every `<link rel="stylesheet">`, `<img>` or `<script src="...">` it meets triggers a new request. A classic `<script>` **pauses the HTML parser** until the script is downloaded and run, because the script might change the document. That is why scripts are placed at the end of `<body>` or given the `defer` attribute, which matters as soon as your JavaScript works with the DOM (see [DOM and events](#/browser/dom)).',
    ],
    points: [
      '1. **Parse HTML → DOM**: elements become nodes of a tree (`html` → `head`, `body` → ...).',
      '2. **Parse CSS → CSSOM**: all style rules that apply, from the browser defaults and your stylesheets.',
      '3. **Render tree**: only the nodes that will be shown, each with its computed styles (an element with `display: none` is in the DOM but not in the render tree).',
      '4. **Layout**: the exact size and position of every box for the current window width.',
      '5. **Paint**: pixels on the screen.',
      'When JavaScript changes the DOM, or you resize the window, the browser redoes the affected steps.',
    ],
    example: 'A page with `<link rel="stylesheet" href="site.css">` in the `<head>` and a big hero image. The browser builds the DOM, requests `site.css` and the image in parallel, waits for the CSS (it does not want to paint unstyled content), lays out the boxes and paints. When the image arrives, its box gets filled; if the HTML did not give the image a `width` and `height`, the layout must be redone and the text below **jumps**.',
    mistake: 'Thinking JavaScript edits the HTML file. The file on the server never changes; JavaScript edits the **DOM**, the live copy in memory. That is why "View source" (the file as it arrived) and the DevTools Elements tab (the current DOM) can show different things, and why a reload brings the original back.' },

  { id: 'devtools-network', hub: 'render', topic: 'render', 
    title: 'Watching the conversation: the Network tab',
    summary: 'The **Network** tab of the browser DevTools lists every request a page makes, with its method, status code, type, size and time, and shows the headers and body of each one.',
    body: [
      'Everything in this section is invisible while you browse. The Network tab makes it visible: it is the call log of the browser\'s conversation with servers.',
      'Open DevTools (F12, or Ctrl+Shift+I / Cmd+Opt+I on macOS), choose **Network**, then **reload** the page: the tab only records while it is open. Each row is one request/response pair. Click a row: **Headers** shows the request line, the status and both sets of headers; **Response** (or **Preview**) shows the body.',
      'Useful options: **Disable cache** (to see fresh `200` responses instead of cached ones), the type filters (Doc, CSS, JS, Img, Fetch/XHR) and the red rows, which are failed requests (4xx, 5xx or network errors).',
    ],
    example: 'Open a news site with the Network tab open and reload. The first row is the document itself (type `document`, status `200`, `Content-Type: text/html`). Then come dozens of rows for CSS, JavaScript, images and fonts, many from other hosts. If your own page shows a red row `logo.png 404`, the Headers panel shows the exact URL that was requested, so you can see which part of your `src` path is wrong.',
    mistake: 'Opening the Network tab after the page has loaded and finding it empty. The tab only records while DevTools is open: open it first, then reload.' },

  /* ---- 6. The big picture --------------------------------------------------------- */
  { id: 'frontend-backend', hub: 'stack', topic: 'stack', 
    title: 'Front end and back end',
    summary: 'The **front end** is the code that runs in the user\'s browser (HTML, CSS, JavaScript); the **back end** is the code that runs on the server (for example Node.js with Express) together with the database.',
    body: [
      'Ask one question about any piece of code: **where does it run?** If it runs in the browser, on the user\'s device, it is front end: it can draw the page and react to clicks, but the user can read and change it, so it can never hold secrets or make final decisions. If it runs on the server, it is back end: it can keep secrets (such as the database password), enforce rules and store data, but it cannot touch the page directly; it can only send responses.',
      'The two halves talk over HTTP. Often the back end offers an **API** (Application Programming Interface): a set of URLs that return **data** (usually JSON) instead of whole pages, such as `GET /api/tasks`. The front end calls the API and builds the page from that data.',
      '**Full stack** means working on both halves: a full-stack developer can build the pages, the API behind them and the database the API reads from, and knows where each rule belongs.',
    ],
    table: {
      caption: 'The two halves',
      head: ['', 'Front end', 'Back end'],
      rows: [
        ['Runs on', 'The user\'s browser', 'The server'],
        ['Typical tools', 'HTML, CSS, JavaScript, often a framework such as React', 'A server runtime (e.g. Node.js with Express) and a database (SQL or a document store such as MongoDB)'],
        ['Good at', 'Drawing the page, reacting instantly to the user', 'Storing data, keeping secrets, enforcing rules'],
        ['Cannot', 'Be trusted: the user controls it', 'Change the page directly; it only answers requests'],
      ],
    },
    example: 'Adding a task in a to-do app: the front end checks that the title is not empty and shows an error immediately (good experience); it then sends `POST /api/tasks`. The back end checks the title **again**, saves it in the database and answers `201 Created` with the new task as JSON; the front end adds it to the list on screen.',
    mistake: 'Trusting checks done only in the front end. Anyone can open DevTools and delete a `required` attribute, or skip your page entirely and send the request with `curl`. Every rule that matters (prices, permissions, validation) must be checked again in the back end.' },

  { id: 'static-dynamic', hub: 'stack', topic: 'stack', 
    title: 'Static and dynamic',
    summary: 'A **static** response is a file sent exactly as it is stored, the same for everyone; a **dynamic** response is generated by server code for each request, usually from a database.',
    body: [
      'A static site is like a stack of printed brochures: the server just hands out copies of files that already exist (`index.html`, `styles.css`, `logo.png`). A dynamic site is like a waiter writing your bill: the server runs code for each request and builds an answer for that user at that moment (your inbox, your cart, your search results).',
      'Do not confuse **dynamic** with **interactive**. A static HTML file can include JavaScript that opens menus and reacts to clicks in the browser: it is interactive on the client, but the server still sends the same file to everyone. "Dynamic" is about the **content of the response** being computed on the server.',
      'Most web applications grow along the same path: static pages, made interactive with client-side JavaScript; then a dynamic server that answers with JSON from a database; then often a **single-page application** (SPA): one HTML page whose JavaScript requests data from the API and redraws parts of the page without full reloads.',
    ],
    example: 'A small football club website (home, fixtures, squad, tickets, login) is static: you can open `fixtures.html` straight from your disk (`file://...`) and it works without any server. A "My tickets" page that lists what the logged-in member bought cannot be static: the server must look up that member in a database and build the answer: that is a job for a back end (see [Server-side JavaScript](#/server/runtime)).',
    mistake: 'Calling a page "dynamic" because it has animations or a drop-down menu. Those run in the browser. If the server sends the same file to everyone, it is a static site.' },

  { id: 'course-map', hub: 'stack', topic: 'stack', 
    title: 'From static pages to a full-stack app',
    summary: 'A web application is usually built in layers: a **static site** (HTML and CSS), made **interactive** with browser JavaScript, backed by a **server API** that answers with JSON, which stores its data in a **database**, and often topped by a **front-end application** that redraws the page from that data.',
    body: [
      'Place each layer on the client-server picture. The first two layers are what the browser receives and runs; the server and the database are the back end that answers it; a front-end app rebuilds the browser side so it talks to that API. Inside the browser, the three languages have separate jobs: **HTML** gives structure (what each thing is), **CSS** gives presentation (how it looks), **JavaScript** gives behaviour (what it does). Historically they appeared as HTML (1991), JavaScript (1995) and CSS (1996).',
      'The layers are one project, not separate subjects. Each one keeps the previous ones and adds a capability: the same pages get styles, then validation in JavaScript, then a server that stores real data and checks logins, then a front-end app that updates parts of the page without reloading. Throughout, **version control** (see [Version control](#/vcs/repositories)) records every step.',
    ],
    table: {
      caption: 'The layers of a typical web application',
      head: ['Layer', 'What it adds', 'Typical tools', 'Where the code runs'],
      rows: [
        ['Static site', 'Content and structure, then presentation and layout', 'Semantic HTML, CSS (box model, Flexbox, Grid)', 'Browser'],
        ['Interactive front end', 'Behaviour: reacting to clicks, validating forms, changing the page', 'JavaScript and the DOM', 'Browser'],
        ['Server and API', 'Shared data, rules and secrets, answered as JSON over HTTP', 'A server runtime and a routing framework (e.g. Node.js and Express), REST design, authentication', 'Server'],
        ['Database', 'Data that survives restarts and is shared by every user', 'A relational database (SQL) or a document database (e.g. MongoDB)', 'Server (database server)'],
        ['Front-end application', 'One page that fetches data from the API and redraws only what changed', 'Components, state and client-side routing (e.g. React)', 'Browser'],
      ],
    },
    points: [
      '**Front-end developer**: the browser side (HTML, CSS, JavaScript, a front-end framework), plus accessibility and performance.',
      '**Back-end developer**: the server side (API design, business rules, databases, authentication, security).',
      '**Full-stack developer**: both halves, and above all the HTTP contract between them: which URLs exist, what JSON they accept and return, and which status codes they answer.',
      'Whatever the role, the HTTP vocabulary of this section (methods, status codes, headers, JSON bodies, statelessness) is the shared language of every layer.',
    ],
    example: 'A task tracker grows layer by layer: a static `tasks.html` with a form; JavaScript that checks the title is not empty and adds the task to the list; an API where `POST /api/tasks` answers `201 Created` and `GET /api/tasks/999` answers `404`; a database so the tasks survive a server restart and every device sees the same list; finally a front-end app that adds the new task to the screen without reloading the page.',
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
    q: 'You open `http://localhost:3000` in your browser while your Express app is running on your laptop. Which statement is correct?',
    choices: ['There is no server involved because nothing leaves your laptop', 'Your laptop is acting as both client (the browser) and server (the Express program)', 'localhost is a public website run by your internet provider', 'The browser runs the Express code itself'],
    answer: 1,
    why: 'Client and server are **programs**, not machines: here both run on the same computer, and `localhost` points to it.' },

  /* URLs and DNS */
  { type: 'mc', topic: 'url',
    q: 'In `https://api.example.com/users/42?fields=name#top`, which part is the **path**?',
    choices: ['`api.example.com`', '`/users/42`', '`fields=name`', '`top`'],
    answer: 1,
    why: 'Host = `api.example.com`, path = `/users/42`, query string = `fields=name`, fragment = `top`.' },
  { type: 'mc', topic: 'url',
    q: 'Which part of a URL is **never sent** to the server?',
    choices: ['The query string', 'The path', 'The fragment (after `#`)', 'The port'],
    answer: 2,
    why: 'The fragment is used only by the browser, for example to scroll to the element with that `id`.' },
  { type: 'fib', topic: 'url',
    q: 'If an `https` URL does not write a port, the browser connects to port ___.',
    accept: ['443'],
    why: 'Default ports: 443 for `https`, 80 for `http`.' },
  { type: 'mc', topic: 'url',
    q: 'A student writes `<a href="www.wikipedia.org">Wikipedia</a>`. What happens when the link is clicked?',
    choices: ['It opens Wikipedia over HTTPS', 'It opens Wikipedia over HTTP', 'The browser looks for a file called `www.wikipedia.org` relative to the current page, usually giving a 404', 'The browser refuses to render the link'],
    answer: 2,
    why: 'Without a scheme the value is a **relative path**. External links need `https://`.' },
  { type: 'mc', topic: 'url',
    q: 'What does DNS do?',
    choices: ['Translates a host name into an IP address', 'Encrypts the request', 'Chooses the HTTP method', 'Converts HTML into the DOM'],
    answer: 0,
    why: 'DNS is the phone book of the internet: names to numeric addresses. Only the host takes part, not the path.' },
  { type: 'tf', topic: 'url',
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
  { type: 'fib', topic: 'http',
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
  { type: 'tf', topic: 'http',
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
    q: 'A logged-in student calls an admin-only API route. Which status code fits best?',
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
