'use strict';
/* Server-side JavaScript: concept cards, rail groups and self-check quiz (Node.js as the worked
   example). Cards explain with `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js).
   `hub` and `topic` keys match NODE_GROUPS and NODE_QUIZ_TOPICS. */

DATA.en.NODE_QUIZ_TOPICS = {
  runtime: 'The Node.js runtime',
  modules: 'Modules',
  npm: 'npm and package.json',
  async: 'Asynchronous code',
  loop: 'The event loop',
  config: 'Configuration and app structure',
};

DATA.en.NODE_GROUPS = [
  { key: 'runtime', label: 'The Node.js runtime', icon: 'server' },
  { key: 'modules', label: 'Modules', icon: 'files' },
  { key: 'npm', label: 'npm and package.json', icon: 'storage' },
  { key: 'async', label: 'Asynchronous code', icon: 'clock' },
  { key: 'loop', label: 'The event loop', icon: 'loop' },
  { key: 'config', label: 'Configuration and app structure', icon: 'key' },
];

DATA.en.NODE_CONCEPTS = [
  /* ---- 1. The runtime ---------------------------------------------------------------------- */
  { id: 'what-is-node', hub: 'runtime', topic: 'runtime',
    title: 'What Node.js is: JavaScript outside the browser',
    summary: '**Node.js** is a **runtime**: a program that runs JavaScript outside the browser, on your computer or on a server.',
    html: [
      '<p>A runtime is two things: an <strong>engine</strong> that executes the language, and <strong>APIs</strong> that decide what your code can reach. Chrome and Node.js use the same engine, <strong>V8</strong>, so the language is identical. Only the APIs around it differ.</p>',
      '<table><caption>What your code can reach</caption><thead><tr><th scope="col"></th><th scope="col">In the browser</th><th scope="col">In Node.js</th></tr></thead><tbody>'
        + '<tr><th scope="row">The page</th><td><code>document</code>, <code>window</code>, DOM events, <code>alert</code>, <code>localStorage</code></td><td>None: <code>document is not defined</code></td></tr>'
        + '<tr><th scope="row">Files and network</th><td>No access to your disk; only <code>fetch</code> and uploads</td><td><code>fs</code> (files), <code>http</code> (servers), <code>path</code>, <code>os</code></td></tr>'
        + '<tr><th scope="row">The running program</th><td><code>location</code>, <code>navigator</code></td><td><code>process</code>: <code>process.env</code>, <code>process.argv</code>, <code>process.exit()</code></td></tr>'
        + '<tr><th scope="row">Global object</th><td><code>window</code> (also <code>globalThis</code>)</td><td><code>globalThis</code></td></tr>'
        + '</tbody></table>',
      '<p><strong>The same in both:</strong> the whole language (variables, functions, arrays, objects), <code>console</code>, timers such as <code>setTimeout</code>, and <code>fetch</code> (in Node since version 18).</p>',
      '<h3>Why JavaScript on a server</h3>',
      '<ul><li><strong>One language</strong> for the page and the API, and data travels as JSON, which is JavaScript\'s own object notation.</li>'
        + '<li><strong>Built for waiting:</strong> a web server spends most of its time waiting for the database, the disk or another API, and Node keeps working while it waits (see <a href="#/server/runtime/why-async">Blocking and non-blocking</a>).</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One engine; the APIs around it make the difference.',
      desc: 'Your JavaScript runs on the V8 engine. In the browser, V8 comes with page APIs such as document, window and DOM events. In Node.js, V8 comes with system APIs such as fs, http and process.',
      nodes: [
        { id: 'code', label: 'Your JavaScript' },
        { id: 'v8', label: 'V8 engine' },
        { id: 'browser', label: 'Browser', note: '`document`, `window`, events' },
        { id: 'node', label: 'Node.js', note: '`fs`, `http`, `process`', key: true },
      ],
      edges: [['code', 'v8'], ['v8', 'browser'], ['v8', 'node']],
    },
    example: 'Save `hello.js` with `console.log(process.version);` and run `node hello.js`: it prints the version, such as `v24.11.0`. Add `document.title = \'x\';` and it stops with `ReferenceError: document is not defined`. These pages target **Node 24 LTS** (Long-Term Support: about three years of fixes, the safe choice to deploy).',
    mistake: 'Calling Node a language or a framework. JavaScript is the language, Node is the **runtime**, and Express is a **framework** that runs on Node. The same confusion leads to pasting browser code (`document.querySelector`, `alert`) into a server file: a server has no page and no user in front of it.' },

  { id: 'running-node', hub: 'runtime', topic: 'runtime',
    title: 'Running code: node file.js, the REPL and --watch',
    summary: '`node file.js` runs a file from a terminal: top to bottom, then it stays alive only while something is left to wait for.',
    html: [
      '<p>A script that only logs ends at once and gives the prompt back. A server keeps running, because an open server is always waiting for the next request. It is not frozen: it is <strong>waiting</strong>, until you stop it.</p>',
      '<dl><dt><code>node file.js</code></dt><dd>Runs a file (<code>node file</code> also works: <code>.js</code> is assumed).</dd>'
        + '<dt><code>node</code></dt><dd>Opens the <strong>REPL</strong> (Read–Eval–Print Loop): type an expression and see its value, as in the browser console. Leave with <code>.exit</code>.</dd>'
        + '<dt><code>node --watch file.js</code></dt><dd>Restarts the program every time you save. Without it, a running program ignores your edits: it keeps the code it loaded at start-up. Built in since Node 22 (it replaces the <code>nodemon</code> package).</dd>'
        + '<dt>Ctrl+C</dt><dd>Stops the program running in that terminal (press it twice to leave the REPL).</dd>'
        + '<dt><code>process.argv</code></dt><dd>The words typed on the command line, as strings. <code>process.argv[2]</code> is the first word after the file name.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'A program ends when nothing is left to wait for.',
      desc: 'node app.js runs the file from top to bottom. If nothing is pending, the program exits and the prompt comes back. If a timer or an open server is pending, the program keeps running, waiting, until Ctrl+C.',
      nodes: [
        { id: 'start', label: '`node app.js`' },
        { id: 'run', label: 'Runs the file', note: 'top to bottom' },
        { id: 'exit', label: 'Exits', note: 'the prompt comes back' },
        { id: 'wait', label: 'Keeps running', note: 'waiting, until Ctrl+C', key: true },
      ],
      edges: [['start', 'run'], ['run', 'exit', 'nothing pending'], ['run', 'wait', 'timer or server']],
    },
    code: `// greet.js
const name = process.argv[2] || 'stranger';
console.log(\`Hello, \${name}!\`);

// In the terminal:
// $ node greet.js Ana
// Hello, Ana!
// $ node greet.js
// Hello, stranger!
// $ node
// > 2 ** 10
// 1024
// > .exit`,
    example: 'Run `node --watch greet.js Ana`, change `Hello` to `Hi` and save: the terminal reports a restart and prints `Hi, Ana!`, without retyping the command. Projects keep that command in an npm script, so `npm start` runs it (see [package.json](#/server/runtime/package-json)).',
    mistake: 'Editing a server\'s code, retrying and seeing no change. The server was started with plain `node`, so it still runs the code it loaded at start-up. Stop it with Ctrl+C and start it again, or run it with `--watch`.' },

  { id: 'first-server', hub: 'runtime', topic: 'runtime',
    title: 'A first server: the http module, ports and listen',
    summary: 'A **server** is a program that waits on a **port** for requests and answers each one; Node\'s built-in `http` module is enough to write one.',
    html: [
      '<p>Many programs on one computer use the network. The <strong>port</strong>, a number from 0 to 65535, says which program a request is for: <code>localhost:3000</code> means "this computer, the program listening on port 3000". <code>server.listen(3000)</code> claims the port, and from then on <strong>one function</strong> receives every request and builds its response.</p>',
      '<pre><code>// server.js\n'
        + '// Node\'s built-in http module\n'
        + 'const http = require(\'node:http\');\n\n'
        + 'const server = http.createServer((req, res) =&gt; {\n'
        + '  if (req.method === \'GET\' &amp;&amp; req.url === \'/health\') {\n'
        + '    res.writeHead(200, { \'Content-Type\': \'application/json\' });\n'
        + '    res.end(JSON.stringify({ status: \'ok\' }));\n'
        + '  } else {\n'
        + '    res.writeHead(404, { \'Content-Type\': \'application/json\' });\n'
        + '    res.end(JSON.stringify({ error: \'Not found\' }));\n'
        + '  }\n'
        + '});\n\n'
        + 'server.listen(3000, () =&gt; console.log(\'Listening on http://localhost:3000\'));</code></pre>',
      '<dl><dt><code>req</code></dt><dd>The request: <code>req.method</code> (<code>GET</code>, <code>POST</code>…) and <code>req.url</code> (the path and query, such as <code>/health</code>).</dd>'
        + '<dt><code>res</code></dt><dd>The response you build: <code>res.writeHead(status, headers)</code>, then <code>res.end(body)</code> sends it. A request whose response never ends leaves the client waiting.</dd>'
        + '<dt><code>require(\'node:http\')</code></dt><dd>Loads a module that comes with Node; the <code>node:</code> prefix marks it as built in (see <a href="#/server/runtime/commonjs">Modules</a>).</dd></dl>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Every request reaches one function, which builds the response.',
      desc: 'A client, such as a browser or curl, sends a request to port 3000. The server listening on that port passes it to your function, which receives req and res and sends back a response with a status, headers and a body.',
      nodes: [
        { id: 'client', label: 'Browser or `curl`' },
        { id: 'port', label: 'Port 3000', note: '`server.listen(3000)`' },
        { id: 'fn', label: 'Your function', note: '`(req, res) => …`', key: true },
        { id: 'res', label: 'Response', note: 'status, headers, body' },
      ],
      edges: [['client', 'port', 'request'], ['port', 'fn'], ['fn', 'res']],
    },
    example: 'Run `node server.js` and open `http://localhost:3000/health`: the browser shows `{"status":"ok"}`. Any other path answers `404`. From a terminal, `curl http://localhost:3000/health` (a tool that sends a request and prints the response) shows the same. Each new route is one more `if`, which is why frameworks exist (see [Why a framework](#/server/runtime/frameworks)).',
    mistake: 'Starting the server again in a second terminal while the first is still running. The second one fails with `Error: listen EADDRINUSE: address already in use :::3000`: only one program can listen on a port. Stop the first with Ctrl+C in its terminal, or use another port.' },

  /* ---- 2. Modules -------------------------------------------------------------------------- */
  { id: 'commonjs', hub: 'modules', topic: 'modules',
    title: 'Modules: require and module.exports',
    summary: 'In Node every file is a **module** with its own private scope: it shares a value by assigning it to `module.exports`, and another file gets that value with `require(\'./path\')`.',
    html: [
      '<p>What a file declares stays inside it: other files cannot see its variables or functions, even in the same folder. That is why twenty files can each have a variable called <code>count</code> without clashing. A file chooses what to share by putting it on <code>module.exports</code>, and <code>require</code> returns exactly that value. This system is <strong>CommonJS</strong>, Node\'s original one, used by the server examples here.</p>',
      '<table><caption>Two shapes of export</caption><thead><tr><th scope="col"></th><th scope="col">In the exporting file</th><th scope="col">In the importing file</th></tr></thead><tbody>'
        + '<tr><th scope="row">One thing</th><td><code>module.exports = withVat;</code></td><td><code>const withVat = require(\'./money\');</code> (you choose the name)</td></tr>'
        + '<tr><th scope="row">Several things</th><td><code>module.exports = { listTasks, createTask };</code></td><td><code>const { listTasks } = require(\'./tasks\');</code> (see <a href="#/server/runtime/module-resolution">What require finds</a>)</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Paths</strong> to your own files start with <code>./</code> (this folder) or <code>../</code> (the parent folder); <code>.js</code> can be left out.</li>'
        + '<li><strong>Runs once:</strong> a module\'s code runs the first time it is required. Node keeps (caches) its <code>module.exports</code> and gives the same value to every later <code>require</code>.</li>'
        + '<li><strong>Last assignment wins:</strong> <code>module.exports = value</code> replaces whatever the file exported before.</li>'
        + '<li><strong><code>exports</code> is only a shortcut</strong> to the same object: <code>exports.total = 1</code> works, <code>exports = { total: 1 }</code> does not, because it only re-points the shortcut (the Try it box shows why).</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Only what a file puts on module.exports leaves it.',
      desc: 'money.js keeps VAT private and assigns the withVat function to module.exports. report.js calls require on ./money and receives withVat, and nothing else.',
      nodes: [
        { id: 'money', label: '`money.js`', note: '`VAT` stays private' },
        { id: 'exp', label: '`module.exports`', note: 'the `withVat` function', key: true },
        { id: 'report', label: '`report.js`', note: 'gets `withVat` only' },
      ],
      edges: [['money', 'exp'], ['exp', 'report', '`require`']],
    },
    code: `// src/utils/money.js
// private: not exported
const VAT = 0.21;
function withVat(price) {
  return Math.round(price * (1 + VAT) * 100) / 100;
}
// export ONE function
module.exports = withVat;

// src/report.js
const withVat = require('./utils/money'); // ./ = relative to THIS file
console.log(withVat(100));
// → 121
console.log(typeof VAT);
// → 'undefined': VAT stayed private`,
    live: { kind: 'js', code: `// How Node runs each file (simplified): your code is wrapped in a
// function that receives "module" and "exports".
function runModule(code) {
  const module = { exports: {} };
  code(module, module.exports);
  // what require() gives back
  return module.exports;
}

const good = runModule((module) => {
  module.exports = { greet: (name) => 'Hi ' + name };
});
console.log(good.greet('Ana'));
// → Hi Ana

const bad = runModule((module, exports) => {
  exports = { greet: (name) => 'Hi ' + name }; // re-points the shortcut only
});
console.log(bad);
// → {}: nothing was exported` },
    example: '`store.js` holds `const tasks = []; module.exports = tasks;`. `add.js` requires it and pushes a task; `list.js` requires `./store` and sees that task. The module ran once, so there is **one** array shared by every file, not one copy per `require`.',
    mistake: 'Forgetting the export. If `money.js` defines `withVat` but never assigns `module.exports`, `require(\'./utils/money\')` returns an empty object `{}`, and `withVat(100)` throws `TypeError: withVat is not a function`. When a required value is `{}` or `undefined`, look at the last lines of the file you required.' },

  { id: 'module-resolution', hub: 'modules', topic: 'modules',
    title: 'What require finds: built-in modules, packages and your files',
    summary: 'The string you pass to `require` is an address: its first characters tell Node whether to load a **built-in module**, a **package** from `node_modules/` or **one of your own files**.',
    html: [
      '<table><caption>Three kinds of require</caption><thead><tr><th scope="col">You write</th><th scope="col">Node loads</th><th scope="col">Install first?</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>require(\'node:fs\')</code></th><td>The built-in file-system module</td><td>No: part of Node</td></tr>'
        + '<tr><th scope="row"><code>require(\'express\')</code></th><td>A <strong>package</strong>: <code>node_modules/express/</code>, searching up the folders</td><td>Yes: <code>npm install express</code></td></tr>'
        + '<tr><th scope="row"><code>require(\'./app\')</code></th><td><code>app.js</code> (or <code>app/index.js</code>) in the folder of <em>this</em> file</td><td>No: it is your file</td></tr>'
        + '<tr><th scope="row"><code>require(\'../lib/tasks\')</code></th><td>Up one folder, then <code>lib/tasks.js</code></td><td>No</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>The <code>node:</code> prefix</strong> is optional (<code>require(\'fs\')</code> works too) but recommended: it shows at a glance that the module comes with Node and is not an npm package.</li>'
        + '<li><strong>A bare name is always a package.</strong> Node looks in <code>node_modules/</code> next to the file, then in each parent folder. If the package was never installed, the first line fails with <code>Error: Cannot find module \'express\'</code>.</li>'
        + '<li><strong>A path</strong> starts with <code>./</code>, <code>../</code> or <code>/</code>, and is relative to the file that contains the <code>require</code>, not to the folder you started Node in.</li></ul>',
      '<h3>Taking several exports at once</h3>',
      '<p>When a module exports an object, <strong>object destructuring</strong> takes the parts you need by name: <code>const { listTasks, createTask } = require(\'./tasks\');</code> is short for reading <code>.listTasks</code> and <code>.createTask</code> from the object <code>require</code> returns. The names must match the property names; a name that is not there gives <code>undefined</code>.</p>',
    ],
    live: { kind: 'js', code: `// What a tasks module exports: an object with two functions
const tasks = {
  listTasks() { return 'listing tasks'; },
  createTask() { return 'creating a task'; },
};

// Destructuring takes properties out by name
const { listTasks, createTask } = tasks;
// listing tasks
console.log(listTasks());
// creating a task
console.log(createTask());

// A name that is not a property gives undefined
const { deleteTask } = tasks;
console.log(deleteTask);
// → undefined` },
    example: 'You add `deleteTask` to `const { listTasks, deleteTask } = require(\'./tasks\');` but forget it in the `module.exports = { … }` of `tasks.js`. The variable is `undefined`, and the first call fails with `TypeError: deleteTask is not a function`. Check the export list of the file you required.',
    mistake: 'Writing `require(\'app\')` for your own `app.js`. Without `./`, Node reads `app` as a **package** name, searches `node_modules/`, and fails with `Cannot find module \'app\'`, even though `app.js` sits next to the file. Paths to your own files always start with `./` or `../`.' },

  { id: 'es-modules', hub: 'modules', topic: 'modules',
    title: 'ES modules: import, export and "type": "module"',
    summary: '**ES modules** (ESM) are the module syntax built into the language, `import` and `export`; browsers and front-end tools such as Vite use them, and Node supports them next to CommonJS.',
    html: [
      '<p>CommonJS was Node\'s own system, from 2009, when JavaScript had no modules. In 2015 the language gained its own: <code>export</code> marks what a file shares and <code>import</code> takes it. The idea is the same, a private file that chooses what to share; the syntax and a few rules differ.</p>',
      '<table><caption>The same module in both systems</caption><thead><tr><th scope="col"></th><th scope="col">CommonJS (server examples here)</th><th scope="col">ES modules (browsers, Vite, React)</th></tr></thead><tbody>'
        + '<tr><th scope="row">Export one thing</th><td><code>module.exports = app;</code></td><td><code>export default app;</code></td></tr>'
        + '<tr><th scope="row">Export several</th><td><code>module.exports = { a, b };</code></td><td><code>export function a() {}</code> or <code>export { a, b };</code></td></tr>'
        + '<tr><th scope="row">Import one thing</th><td><code>const app = require(\'./app\');</code></td><td><code>import app from \'./app.js\';</code></td></tr>'
        + '<tr><th scope="row">Import some</th><td><code>const { a } = require(\'./lib\');</code></td><td><code>import { a } from \'./lib.js\';</code></td></tr>'
        + '</tbody></table>',
      '<h3>Which system a file uses</h3>',
      '<dl><dt><code>.cjs</code></dt><dd>Always CommonJS.</dd>'
        + '<dt><code>.mjs</code></dt><dd>Always ES module.</dd>'
        + '<dt><code>.js</code></dt><dd>Follows the <code>"type"</code> field of the nearest <code>package.json</code>: <code>"commonjs"</code> (what <code>npm init -y</code> writes) or <code>"module"</code>. With no <code>"type"</code>, Node guesses: a file that contains <code>import</code> or <code>export</code> is re-run as an ES module, with a warning.</dd></dl>',
      '<h3>What changes in an ES module</h3>',
      '<ul><li><strong>Full file names</strong> in relative imports: <code>import app from \'./app.js\'</code>, not <code>\'./app\'</code>.</li>'
        + '<li><strong>No CommonJS names:</strong> <code>require</code>, <code>module.exports</code>, <code>__dirname</code> and <code>__filename</code> do not exist; <code>import.meta.dirname</code> gives the folder.</li>'
        + '<li><strong>Top-level <code>await</code></strong> is allowed: <code>await</code> outside any function.</li></ul>',
    ],
    example: 'You paste `import express from \'express\';` from a tutorial into an `app.js` that uses `require` everywhere else. With `"type": "commonjs"`, Node stops with `SyntaxError: Cannot use import statement outside a module`. With no `"type"`, it re-runs the file as ESM and fails on the next line: `ReferenceError: require is not defined in ES module scope`. Fix: write the line in the project\'s style, `const express = require(\'express\');`.',
    mistake: 'Adding `"type": "module"` to `package.json` to make one copied `import` work. Every `.js` file of the project is then read as ESM, so every `require` and `module.exports` breaks at once. Pick one system per project and never mix the two in one file.' },

  { id: 'files-and-paths', hub: 'modules', topic: 'modules',
    title: 'Files and paths: fs, path and __dirname',
    summary: 'The built-in `node:fs` module reads and writes files, `node:path` builds file paths, and `__dirname` is the folder of the current file.',
    html: [
      '<p>A relative path such as <code>\'tasks.json\'</code> is resolved from the folder you <strong>started Node in</strong> (the working directory, <code>process.cwd()</code>), not from the file that contains the code (unlike a <code>require</code> path; see <a href="#/server/runtime/module-resolution">What require finds</a>). Start the same program from another folder and the path points somewhere else. <code>path.join(__dirname, \'tasks.json\')</code> anchors it to the file\'s own folder.</p>',
      '<table><caption>The same line in <code>src/load.js</code>, started from two folders</caption><thead><tr><th scope="col">Node started in</th><th scope="col"><code>\'tasks.json\'</code> opens</th><th scope="col"><code>path.join(__dirname, \'tasks.json\')</code> opens</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>src/</code></th><td><code>src/tasks.json</code></td><td><code>src/tasks.json</code></td></tr>'
        + '<tr><th scope="row">The project folder</th><td><code>tasks.json</code> in the project folder: <code>ENOENT</code> if there is none</td><td><code>src/tasks.json</code></td></tr>'
        + '</tbody></table>',
      '<dl><dt><code>fs.readFileSync(file, \'utf8\')</code></dt><dd>Reads a file as text and waits until it is done. Fine at start-up; never inside a request handler (see <a href="#/server/runtime/blocking">Never block the event loop</a>).</dd>'
        + '<dt><code>fs.promises.readFile(file, \'utf8\')</code></dt><dd>The same without waiting: it returns a promise, used with <code>await</code> (see <a href="#/server/runtime/async-await">async and await</a>).</dd>'
        + '<dt><code>fs.writeFileSync(file, text)</code></dt><dd>Creates the file, or replaces its contents.</dd>'
        + '<dt><code>path.join(\'data\', \'tasks.json\')</code></dt><dd>Joins parts with the separator of the operating system: <code>/</code> on macOS and Linux, <code>\\</code> on Windows.</dd>'
        + '<dt><code>JSON.parse(text)</code></dt><dd>Turns a JSON file\'s text into a value; <code>JSON.stringify(value, null, 2)</code> writes it back (see <a href="#/browser/js/json">JSON</a>).</dd>'
        + '<dt><code>__dirname</code></dt><dd>The folder of the current file, in CommonJS. In an ES module: <code>import.meta.dirname</code>.</dd></dl>',
    ],
    code: `// src/load.js
const fs = require('node:fs');
const path = require('node:path');

// next to this file, wherever Node starts
const file = path.join(__dirname, 'tasks.json');
const tasks = JSON.parse(fs.readFileSync(file, 'utf8'));
tasks.push({ id: tasks.length + 1, title: 'Write the report', done: false });
fs.writeFileSync(file, JSON.stringify(tasks, null, 2));
// → null, 2: indent by two spaces
console.log(tasks.length, 'tasks saved');`,
    example: 'Running `node src/load.js` from the project folder and `node load.js` from inside `src/` both find `src/tasks.json`, because the path is built from `__dirname`. With the plain `\'tasks.json\'`, the first command fails with `Error: ENOENT: no such file or directory`, and the full path in the message shows where Node looked: in the project folder, not in `src/`.',
    mistake: 'Leaving out `\'utf8\'`. Without an encoding, `readFileSync` returns a **Buffer** (the raw bytes), and `console.log` prints `<Buffer 5b 0a 20 20 7b …>` instead of the text. Pass `\'utf8\'` whenever you want the file as a string.' },

  /* ---- 3. npm and package.json ------------------------------------------------------------- */
  { id: 'package-json', hub: 'npm', topic: 'npm',
    title: 'package.json: the project\'s manifest',
    summary: '`package.json` describes a Node project: its name and version, the packages it depends on, and the **scripts** that start, develop and test it.',
    html: [
      '<p>Whoever clones your repository reads <code>package.json</code> to know which packages to install and how to run the app. <code>npm init -y</code> writes a first version (<code>-y</code>: "yes" to every question), <code>npm install</code> adds to it, and it is always committed.</p>',
      '<table><caption>The fields you will meet</caption><thead><tr><th scope="col">Field</th><th scope="col">What it says</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>name</code>, <code>version</code></th><td>The project\'s identity</td><td><code>"tasks-api"</code>, <code>"1.0.0"</code></td></tr>'
        + '<tr><th scope="row"><code>private</code></th><td><code>true</code>: npm refuses to publish it by accident</td><td><code>true</code></td></tr>'
        + '<tr><th scope="row"><code>type</code></th><td>How <code>.js</code> files are read (see <a href="#/server/runtime/es-modules">ES modules</a>)</td><td><code>"commonjs"</code></td></tr>'
        + '<tr><th scope="row"><code>main</code></th><td>The entry file</td><td><code>"src/server.js"</code></td></tr>'
        + '<tr><th scope="row"><code>scripts</code></th><td>Named commands for <code>npm start</code>, <code>npm test</code>, <code>npm run &lt;name&gt;</code></td><td><code>"dev": "node --watch src/server.js"</code></td></tr>'
        + '<tr><th scope="row"><code>dependencies</code></th><td>Packages the app needs to <strong>run</strong></td><td><code>"express": "^4.22.3"</code></td></tr>'
        + '<tr><th scope="row"><code>devDependencies</code></th><td>Packages needed only to <strong>develop and test</strong></td><td><code>"jest": "^29.7.0"</code></td></tr>'
        + '</tbody></table>',
      '<h3>Scripts</h3>',
      '<ul><li><strong>Named shortcuts</strong> for terminal commands, listed under <code>"scripts"</code>.</li>'
        + '<li><strong><code>npm start</code> and <code>npm test</code></strong> run the <code>start</code> and <code>test</code> scripts; any other name needs <code>run</code>: <code>npm run dev</code>.</li>'
        + '<li><strong>Installed tools by name:</strong> while a script runs, npm adds <code>node_modules/.bin</code> to the search path, so <code>"test": "jest"</code> works without a path.</li></ul>',
      '<p><strong>Strict JSON</strong> when you edit it by hand: double quotes around every key and string, no comments, no comma after the last item. One stray comma makes every <code>npm</code> command fail.</p>',
    ],
    code: `{
  "name": "tasks-api",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.22.3"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}`,
    dialect: 'JSON',
    example: 'The usual split: `start` runs plain `node src/server.js`, what a production server runs, and `dev` adds `--watch` for development (`npm run dev`). A teammate finds in one place how to start your project.',
    mistake: 'Typing `npm dev` instead of `npm run dev`. Only `start`, `test`, `stop` and `restart` work without `run`; for any other name npm answers `Unknown command: "dev"`.' },

  { id: 'dependencies', hub: 'npm', topic: 'npm',
    title: 'Installing packages: dependencies, devDependencies and node_modules',
    summary: '`npm install express` downloads a package into `node_modules/` and records it in `package.json`, so anyone can install the same packages again.',
    html: [
      '<p>A <strong>package</strong> is code someone else published (a web framework, a database driver, a test runner) that you reuse instead of writing it. <strong>npm</strong>, the Node Package Manager, comes with Node: it downloads packages from the public registry at npmjs.com into <code>node_modules/</code>, which is where <code>require</code> looks for them.</p>',
      '<h3>Two lists in package.json</h3>',
      '<dl><dt><code>dependencies</code></dt><dd>What the app needs to <strong>run</strong>: <code>npm install express</code>. A production server installs only this list (<code>npm ci --omit=dev</code>), so everything the running app requires must be here.</dd>'
        + '<dt><code>devDependencies</code></dt><dd>What you need only to <strong>develop and test</strong>: <code>npm install --save-dev jest</code> (short form: <code>npm i -D jest</code>).</dd></dl>',
      '<p>Packages depend on other packages: installing Express puts about seventy into <code>node_modules/</code>. You never list these <strong>transitive dependencies</strong>; npm works them out. That is why <code>node_modules/</code> is large, and why it is <strong>never committed</strong>: one command rebuilds it.</p>',
      '<table><caption>The npm commands you will use most</caption><thead><tr><th scope="col">Command</th><th scope="col">What it does</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>npm install</code></th><td>Installs everything <code>package.json</code> lists (both lists)</td></tr>'
        + '<tr><th scope="row"><code>npm install express@4</code></th><td>Adds Express 4 to <code>dependencies</code>; <code>@4</code> picks the major version</td></tr>'
        + '<tr><th scope="row"><code>npm install --save-dev jest</code></th><td>Adds <code>jest</code> to <code>devDependencies</code></td></tr>'
        + '<tr><th scope="row"><code>npm uninstall express</code></th><td>Removes it from <code>node_modules/</code> and from <code>package.json</code></td></tr>'
        + '<tr><th scope="row"><code>npm ci</code></th><td>Installs exactly what the lockfile lists (see <a href="#/server/runtime/lockfile">package-lock.json</a>)</td></tr>'
        + '<tr><th scope="row"><code>npm ls</code></th><td>Shows what is installed</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One command, three results: the code, the record and the exact versions.',
      desc: 'npm install express downloads Express from the npm registry. Three things change: node_modules gets Express and its own dependencies, package.json records the range ^4.22.3 under dependencies, and package-lock.json records the exact versions installed.',
      nodes: [
        { id: 'cmd', label: '`npm install express`', key: true },
        { id: 'nm', label: '`node_modules/`', note: 'Express + ~70 packages' },
        { id: 'pj', label: '`package.json`', note: 'records `^4.22.3`' },
        { id: 'lock', label: '`package-lock.json`', note: 'exact versions' },
      ],
      edges: [['cmd', 'nm'], ['cmd', 'pj'], ['cmd', 'lock']],
    },
    example: 'Starting an API on Express 4: `npm init -y`, then `npm install express@4`. The `@4` matters: a plain `npm install express` today installs **Express 5**, the current major version.',
    mistake: 'Committing `node_modules/`: thousands of files of other people\'s code, some built for **your** operating system and broken on a teammate\'s. Put `node_modules/` in `.gitignore` **before** the first commit. If it is already committed, `git rm -r --cached node_modules` removes it from the repository and keeps it on your disk.' },

  { id: 'semver', hub: 'npm', topic: 'npm',
    title: 'Version numbers and ranges: what ^4.19.0 means',
    summary: 'Packages use **semantic versioning**, `MAJOR.MINOR.PATCH`, and `package.json` stores a **range** of versions you accept, such as `^4.19.0`.',
    html: [
      '<p>The three numbers are a promise from the package author about what changed. A range says how much change you accept without being asked.</p>',
      '<dl><dt>MAJOR: <code>5.0.0</code></dt><dd>Something changed in a way that <strong>can break</strong> your code.</dd>'
        + '<dt>MINOR: <code>4.20.0</code></dt><dd>New features, nothing removed: existing code keeps working.</dd>'
        + '<dt>PATCH: <code>4.19.1</code></dt><dd>Bug fixes only.</dd></dl>',
      '<table><caption>What each range lets npm install</caption><thead><tr><th scope="col">Range</th><th scope="col">Accepts</th><th scope="col">Rejects</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>^4.19.0</code> (caret)</th><td><code>4.19.0</code> up to the newest <code>4.x.y</code></td><td><code>4.18.2</code>, <code>5.0.0</code></td></tr>'
        + '<tr><th scope="row"><code>~4.19.0</code> (tilde)</th><td><code>4.19.0</code> up to the newest <code>4.19.x</code></td><td><code>4.20.0</code></td></tr>'
        + '<tr><th scope="row"><code>4.19.0</code></th><td>Only <code>4.19.0</code></td><td>Everything else</td></tr>'
        + '<tr><th scope="row"><code>^0.4.2</code></th><td><code>0.4.2</code> up to the newest <code>0.4.x</code></td><td><code>0.5.0</code></td></tr>'
        + '<tr><th scope="row"><code>*</code></th><td>Any version at all</td><td>Nothing: avoid it</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>The caret is the default:</strong> <code>npm install</code> writes <code>^</code>, which means "compatible with": the same major version, at least this one.</li>'
        + '<li><strong>Below 1.0 is different:</strong> <code>^0.4.2</code> accepts only <code>0.4.x</code>, because before 1.0 any minor release may break things.</li></ul>',
    ],
    live: { kind: 'js', code: `// A simplified version of npm's caret rule, for versions >= 1.0.0
function caretAccepts(range, version) {
  const r = range.replace('^', '').split('.').map(Number);
  const v = version.split('.').map(Number);
  // another MAJOR may break your code
  if (v[0] !== r[0]) return false;
  if (v[1] !== r[1]) return v[1] > r[1]; // a newer MINOR is fine
  // same MINOR: PATCH must not be older
  return v[2] >= r[2];
}

console.log(caretAccepts('^4.19.0', '4.22.3')); // true
console.log(caretAccepts('^4.19.0', '4.18.9')); // false: older
console.log(caretAccepts('^4.19.0', '5.0.0'));
// → false: new major` },
    example: 'With `"express": "^4.19.2"`, a developer who installed last year and a teammate who installs today can get different 4.x versions, both allowed by the caret: compatible, but not identical. The **lockfile** records the exact version, so everyone gets the same one (see [package-lock.json](#/server/runtime/lockfile)).',
    mistake: 'Reading `^4.19.0` as "version 4.19.0": it means "4.19.0 **or any newer 4.x**". The opposite slip is changing the major by hand (`"^5.0.0"`) "to update": a new major may change behaviour your code relies on, so read the package\'s migration guide first.' },

  { id: 'lockfile', hub: 'npm', topic: 'npm',
    title: 'package-lock.json, npm ci and what to commit',
    summary: '`package-lock.json` records the **exact** version of every installed package, transitive ones included, so every machine can install the same set.',
    html: [
      '<p><code>package.json</code> says what you <strong>accept</strong> (<code>^4.19.0</code>); <code>package-lock.json</code> says what you <strong>got</strong> (<code>4.22.3</code>, plus the exact version and checksum of each of Express\'s own dependencies). Commit both.</p>',
      '<table><caption>Two ways to install</caption><thead><tr><th scope="col"></th><th scope="col"><code>npm install</code></th><th scope="col"><code>npm ci</code> (clean install)</th></tr></thead><tbody>'
        + '<tr><th scope="row">Use it</th><td>While developing</td><td>On servers, in CI, or to copy a teammate\'s exact setup</td></tr>'
        + '<tr><th scope="row">The lockfile</th><td>May update it (a new package, a changed range)</td><td>Never changes it</td></tr>'
        + '<tr><th scope="row"><code>node_modules/</code></th><td>Updates it</td><td>Deletes it and installs exactly what the lockfile lists</td></tr>'
        + '<tr><th scope="row">Lockfile and <code>package.json</code> disagree</th><td>Updates the lockfile</td><td>Stops with an error</td></tr>'
        + '</tbody></table>',
      '<p><strong>CI</strong> (continuous integration) is the service that builds and tests every push automatically. The lockfile is generated: never edit it by hand. On a merge conflict, fix <code>package.json</code>, then run <code>npm install</code> to regenerate it.</p>',
      '<table><caption>What goes into the repository</caption><thead><tr><th scope="col">File or folder</th><th scope="col">Commit it?</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>package.json</code></th><td>Yes</td><td>You write it: dependencies and scripts</td></tr>'
        + '<tr><th scope="row"><code>package-lock.json</code></th><td>Yes</td><td>It pins the exact versions everyone must get</td></tr>'
        + '<tr><th scope="row"><code>node_modules/</code></th><td><strong>No</strong>: list it in <code>.gitignore</code></td><td>Rebuilt by <code>npm ci</code>; huge and partly specific to each operating system</td></tr>'
        + '<tr><th scope="row"><code>.env</code></th><td><strong>No</strong>: list it in <code>.gitignore</code></td><td>Holds secrets (see <a href="#/server/runtime/dotenv-secrets">.env files</a>)</td></tr>'
        + '<tr><th scope="row"><code>.env.example</code></th><td>Yes</td><td>Lists the variables needed, with placeholder values</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'flow',
      title: 'The lockfile carries the exact versions from your machine to every other.',
      desc: 'package.json accepts the range ^4.19.0. npm install picks a version and writes it to package-lock.json, for example 4.22.3. On any other machine, npm ci reads the lockfile and installs exactly those versions into node_modules.',
      nodes: [
        { id: 'pj', label: '`package.json`', note: 'accepts `^4.19.0`' },
        { id: 'lock', label: '`package-lock.json`', note: 'records `4.22.3`', key: true },
        { id: 'nm', label: '`node_modules/`', note: 'the same on every machine' },
      ],
      edges: [['pj', 'lock', '`npm install`'], ['lock', 'nm', '`npm ci`']],
    },
    code: `# .gitignore for a Node project
node_modules/
.env
npm-debug.log*
.DS_Store`,
    example: 'A teammate clones the repo, runs `npm install`, and their server behaves differently from yours. The likely cause: the lockfile was never committed, so their install resolved every `^` range again and picked newer versions. With the lockfile in the repository, `npm ci` gives them the very same versions you have.',
    mistake: 'Deleting `package-lock.json` "to fix" an installation problem and committing the new one: that silently upgrades every transitive dependency at once. Delete `node_modules/` instead (it is disposable) and run `npm ci`; regenerate the lockfile only on purpose.' },

  /* ---- 4. Asynchronous code ---------------------------------------------------------------- */
  { id: 'why-async', hub: 'async', topic: 'async',
    title: 'Blocking and non-blocking: why Node code is asynchronous',
    summary: 'A **synchronous** (blocking) call waits until its work is done; an **asynchronous** (non-blocking) call starts the work, returns at once, and hands the result to a function **later**.',
    html: [
      '<p>Your JavaScript in Node runs on <strong>one thread</strong>: one line at a time. If that thread stood still during every database query, a server could serve only one request at a time. So slow work, <strong>I/O</strong> (input/output: files, network, databases), is handed to the system, and your code says what to do once it is done.</p>',
      '<table><caption>Two ways to call slow work</caption><thead><tr><th scope="col"></th><th scope="col">Synchronous (blocking)</th><th scope="col">Asynchronous (non-blocking)</th></tr></thead><tbody>'
        + '<tr><th scope="row">The call</th><td>Waits until the work is done</td><td>Returns at once; the next line runs</td></tr>'
        + '<tr><th scope="row">The result</th><td>The return value</td><td>Passed later to a callback, or through a promise</td></tr>'
        + '<tr><th scope="row">Examples</th><td><code>fs.readFileSync</code> (names end in <code>Sync</code>)</td><td><code>fs.readFile</code>, <code>setTimeout</code>, <code>fetch</code>, database queries</td></tr>'
        + '<tr><th scope="row">Fine for</th><td>One-off scripts; start-up, before the server listens</td><td>Everything a server does while requests arrive</td></tr>'
        + '</tbody></table>',
      '<p>Who decides when "later" happens is the <strong>event loop</strong> (see <a href="#/server/runtime/event-loop">The event loop</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The call returns at once; the result comes back later, through the callback.',
      desc: 'fs.readFile hands the read to the system and returns at once, so your next lines run immediately. Meanwhile the disk reads the file. When the data is ready, your callback runs with it.',
      nodes: [
        { id: 'call', label: '`fs.readFile(…)`' },
        { id: 'next', label: 'Your next lines', note: 'run at once', key: true },
        { id: 'disk', label: 'The system', note: 'reads the file' },
        { id: 'cb', label: 'Your callback', note: 'runs with the data' },
      ],
      edges: [['call', 'next', 'returns'], ['call', 'disk', 'hands over'], ['disk', 'cb', 'data ready']],
    },
    code: `const fs = require('node:fs');

// Blocking: the next line waits until the whole file has been read
const text = fs.readFileSync('notes.txt', 'utf8');
console.log('1. read', text.length, 'characters');

// Non-blocking: start reading, hand over a callback, carry on
fs.readFile('notes.txt', 'utf8', (err, data) => {
  console.log('3. the callback runs when the file has arrived');
});
console.log('2. this line runs before the file arrives');`,
    example: 'Two users call your API at the same moment. Request A runs a database query that takes 80 ms; request B just answers `{ status: \'ok\' }`. With an asynchronous query, Node starts A\'s query, answers B at once and finishes A when the database replies. With a blocking query, B waits 80 ms behind A, and with 100 users the last one waits 8 seconds.',
    mistake: 'Expecting an asynchronous result on the next line: `let data; fs.readFile(\'notes.txt\', \'utf8\', (err, d) => { data = d; }); console.log(data);` prints `undefined`, because the `console.log` runs **before** the callback. Use the value inside the callback or, better, with `await` (see [async and await](#/server/runtime/async-await)).',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Watch setTimeout wait its turn in the event-loop visualiser' } },

  { id: 'callbacks', hub: 'async', topic: 'async',
    title: 'Callbacks and the error-first convention',
    summary: 'In Node\'s original style you pass a **callback** as the last argument, and Node calls it with `(err, result)` when the work is done.',
    html: [
      '<p>A <strong>callback</strong> is a function you hand over so that someone else calls it later, as with <code>map</code> or <code>addEventListener</code>. For slow work it is how the result comes back: "read this file and <strong>call me back</strong> with what you found". Because the work can fail, every Node callback has the same shape, the <strong>error-first</strong> convention.</p>',
      '<dl><dt><code>err</code>, first</dt><dd><code>null</code> on success; an <code>Error</code> object on failure. So every callback starts with <code>if (err) return …</code>.</dd>'
        + '<dt><code>result</code>, second</dt><dd>The value, such as the text of the file. <code>undefined</code> when there was an error.</dd></dl>',
      '<h3>Callback hell</h3>',
      '<p>When one slow step depends on another (read a config file, then the data file it names, then write a copy), each step sits <strong>inside</strong> the previous callback. The code drifts to the right and every level repeats its own <code>if (err)</code>. Promises were invented to flatten this (see <a href="#/server/runtime/promises">Promises</a>).</p>',
    ],
    code: `const fs = require('node:fs');

// Three steps that depend on each other: "callback hell"
fs.readFile('config.json', 'utf8', (err, text) => {
  if (err) return console.error(err);
  const config = JSON.parse(text);
  fs.readFile(config.dataFile, 'utf8', (err, data) => {
    if (err) return console.error(err);
    fs.writeFile('copy.txt', data, (err) => {
      if (err) return console.error(err);
      console.log('done');
    });
  });
});`,
    live: { kind: 'js', code: `// A function written in Node's callback style (this one answers at once)
function divide(a, b, callback) {
  if (b === 0) {
    callback(new Error('Cannot divide by zero')); // failure: the error first
    return;
  }
  // success: null, then the result
  callback(null, a / b);
}

divide(10, 2, (err, result) => {
  if (err) return console.log('Error:', err.message);
  // Result: 5
  console.log('Result:', result);
});

divide(1, 0, (err, result) => {
  if (err) return console.log('Error:', err.message); // Error: Cannot divide by zero
  console.log('Result:', result);
});` },
    example: '`fs.readFile(\'missing.txt\', \'utf8\', (err, data) => { … })`: the file does not exist, so `err` is an `Error` whose `code` is `\'ENOENT\'` ("no such file or directory") and `data` is `undefined`. `if (err) return console.error(err);` reports it and stops; without it, the next line would use the missing `data` and crash.',
    mistake: 'Leaving out the `return` in `if (err) callback(err);`: the function reports the error and then **carries on** with the success path, so the callback runs twice. Write `if (err) return callback(err);`. Also, a `try`/`catch` around `fs.readFile(…, cb)` does not catch the file error: it arrives later, after the `try` has finished (see [Errors in async code](#/server/runtime/async-errors)).' },

  { id: 'promises', hub: 'async', topic: 'async',
    title: 'Promises: a value that arrives later',
    summary: 'A **promise** is an object that stands for a result that is not ready yet; it settles once, with a value or with an error.',
    html: [
      '<p>A function that starts slow work can return a promise straight away. You attach what should happen next and carry on; the promise calls your function when the result is ready. Most modern APIs return promises: <code>require(\'node:fs/promises\')</code>, database drivers and <code>fetch</code>.</p>',
      '<dl><dt><code>.then(fn)</code></dt><dd>Runs <code>fn</code> with the value. Returns a <strong>new</strong> promise, so calls chain instead of nesting.</dd>'
        + '<dt><code>.catch(fn)</code></dt><dd>Runs <code>fn</code> with the error of any earlier step.</dd>'
        + '<dt><code>.finally(fn)</code></dt><dd>Runs <code>fn</code> either way: clean-up.</dd></dl>',
      '<h3>How a chain passes values</h3>',
      '<ul><li><strong>A returned value</strong> is passed to the next <code>.then</code>.</li>'
        + '<li><strong>A returned promise</strong> is waited for; its value is passed on.</li>'
        + '<li><strong>One <code>.catch</code> at the end</strong> handles a failure in any step.</li></ul>',
      '<p>To turn callback code into a promise, wrap it: <code>new Promise((resolve, reject) =&gt; { … })</code>, and call <code>resolve(value)</code> when the work succeeds or <code>reject(error)</code> when it fails.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'A promise settles once, and never changes again.',
      desc: 'A promise starts pending, while the work runs. If it works, the promise is fulfilled with a value, which goes to .then. If it fails, the promise is rejected with an error, which goes to .catch.',
      nodes: [
        { id: 'pending', label: 'Pending', note: 'the work is running', key: true },
        { id: 'ok', label: 'Fulfilled', note: 'its value goes to `.then`' },
        { id: 'bad', label: 'Rejected', note: 'its error goes to `.catch`' },
      ],
      edges: [['pending', 'ok', 'it worked'], ['pending', 'bad', 'it failed']],
    },
    code: `const fs = require('node:fs/promises');

// The three dependent steps of the callback card, flat
fs.readFile('config.json', 'utf8')
  // a value: passed on
  .then((text) => JSON.parse(text))
  .then((config) => fs.readFile(config.dataFile, 'utf8')) // a promise: waited for
  .then((data) => fs.writeFile('copy.txt', data))
  .then(() => console.log('done'))
  .catch((err) => console.error('Something failed:', err.message)); // any step

// Making your own promise: wait ms milliseconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
sleep(500).then(() => console.log('half a second later'));`,
    example: '`fetch(\'http://localhost:3000/health\')` returns a pending promise at once. `.then((res) => res.json())` runs when the response arrives and returns another promise (reading the body); the next `.then((body) => console.log(body.status))` gets the parsed object. If the server is not running, the first promise is **rejected**: no `.then` runs, and the final `.catch` prints the error.',
    mistake: 'Starting more async work inside a `.then` without returning it: `.then((config) => { fs.readFile(config.dataFile, \'utf8\'); })`. With braces and no `return`, the callback returns `undefined`, so the next `.then` runs at once instead of waiting, and a failed read escapes the final `.catch`. Write `return fs.readFile(…)`, or use the short arrow form without braces.',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'See where .then callbacks wait in the event-loop visualiser' } },

  { id: 'async-await', hub: 'async', topic: 'async',
    title: 'async and await',
    summary: 'Inside an `async function`, `await promise` **pauses that function** until the promise settles, then gives back its value; the code reads top to bottom, yet the thread is never blocked.',
    html: [
      '<p><code>await</code> works like a bookmark. The function stops at that line and steps aside, so Node can run other code, such as other requests. When the promise is fulfilled, the function picks up at the bookmark with the value. Only <strong>this function</strong> waits; the program does not.</p>',
      '<ul><li><strong>Always a promise:</strong> an <code>async</code> function returns a promise, even when it says <code>return 5</code>. Its caller must <code>await</code> it too, or use <code>.then</code>, which is why <code>async</code> spreads upwards to the callers.</li>'
        + '<li><strong>Only inside <code>async</code>:</strong> <code>await</code> works inside an <code>async</code> function, or at the top level of an ES module.</li>'
        + '<li><strong>Same machinery as <code>.then</code>:</strong> the rest of the function is queued as a <strong>microtask</strong> when the promise settles (see <a href="#/server/runtime/microtasks">Microtasks before tasks</a>).</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Only the async function waits; the thread keeps working.',
      desc: 'Step 1: the async function runs synchronously up to its first await. Step 2: it pauses there and its caller receives a pending promise. Step 3: other code runs, such as other requests. Step 4: when the awaited promise is fulfilled, the function resumes at the same line with the value.',
      nodes: [
        { id: 'run', label: 'Runs to `await`', note: 'synchronously' },
        { id: 'pause', label: 'Pauses', note: 'caller gets a promise', key: true },
        { id: 'other', label: 'Other code runs', note: 'other requests' },
        { id: 'resume', label: 'Resumes', note: 'with the value' },
      ],
      edges: [['run', 'pause'], ['pause', 'other'], ['other', 'resume']],
    },
    code: `const fs = require('node:fs/promises');

async function copyData() {
  const text = await fs.readFile('config.json', 'utf8'); // pauses here; the thread stays free
  const config = JSON.parse(text);
  const data = await fs.readFile(config.dataFile, 'utf8');
  await fs.writeFile('copy.txt', data);
  // fulfils the returned promise
  return data.length;
}

copyData().then((n) => console.log(\`copied \${n} characters\`));
console.log('this prints first: copyData() returned a pending promise');`,
    example: 'The `fetch` of the promises card, with `await`: `async function checkHealth() { const res = await fetch(\'http://localhost:3000/health\'); const body = await res.json(); console.log(body.status); }`. One `await` per promise, in the order the values are needed.',
    mistake: 'Forgetting `await`: `const task = db.findTask(id); console.log(task.title);` prints `undefined`, because `task` is a **promise**, which has no `title`. Sent as JSON, a promise becomes `{}`. When a value prints as `Promise { <pending> }` or arrives as `{}`, look for the missing `await`.',
    live: { kind: 'js', code: `// The same shape as copyData, with a fake slow read instead of the file system
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readSlowly(name) {
  // pretend this is a disk read
  await sleep(200);
  return \`contents of \${name}\`;
}

async function copyData() {
  console.log('copyData starts');
  // pauses only copyData
  const text = await readSlowly('config.json');
  console.log('got:', text);
  return text.length;
}

copyData().then((n) => console.log('copied', n, 'characters'));
console.log('this prints second: copyData() returned a pending promise');` },
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Step through two async functions in the visualiser' } },

  { id: 'async-errors', hub: 'async', topic: 'async',
    title: 'Errors in async code: try/catch every await',
    summary: 'When an awaited promise is rejected, `await` **throws** the error on that line, so an ordinary `try { … } catch (err) { … }` catches it; an error nobody catches stops the whole server.',
    html: [
      '<p><code>try</code>/<code>catch</code> is a safety net: the risky lines go inside <code>try { }</code>, and if one of them throws, JavaScript jumps to <code>catch (err) { }</code> with the error, skipping the rest of the <code>try</code> (see <a href="#/browser/js/try-catch">try and catch</a>). With <code>await</code>, a rejected promise becomes a thrown error on the <code>await</code> line, so the same net works for asynchronous code.</p>',
      '<p>An error nobody catches rejects the <code>async</code> function\'s own promise. Since Node 15, an <strong>unhandled rejection</strong> prints the error and <strong>ends the process</strong>: for a server, every user is disconnected, not only the one whose request failed.</p>',
      '<p><strong>With a framework</strong> the <code>catch</code> hands the error to one shared error handler: in Express 4 it calls <code>next(err)</code>; Express 5 forwards a rejected promise by itself (see <a href="#/server/runtime/frameworks">Why a framework</a>).</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The same failure: one user gets an error, or every user loses the server.',
      desc: 'An awaited promise is rejected, so await throws. If the await is inside a try, the catch block answers that one request with a 500 and the server keeps serving everyone. If nothing catches it, the rejection is unhandled and the Node process exits.',
      nodes: [
        { id: 'throw', label: '`await` throws', note: 'a rejected promise' },
        { id: 'catch', label: '`catch (err)`', note: 'one 500, server keeps running', key: true },
        { id: 'crash', label: 'Nobody catches', note: 'the process exits' },
      ],
      edges: [['throw', 'catch', 'inside `try`'], ['throw', 'crash', 'no `try`']],
    },
    code: `const http = require('node:http');
// db stands for a database client whose queries return promises

const server = http.createServer(async (req, res) => {
  try {
    // rejects if the database is down
    const tasks = await db.tasks.findAll();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tasks));
  } catch (err) {
    // the details stay in the server log
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Something went wrong' }));
  }
});`,
    example: 'The database is restarting when a user asks for the tasks. Without the `try`, the terminal prints `Error: connect ECONNREFUSED` and the process **exits**: every later request fails until someone restarts it (`--watch` restarts on a file change, not after a crash). With it, this one user gets a `500` and the server keeps serving everyone else.',
    mistake: '`try { saveTask(task); } catch (err) { … }` **without** `await`. The call returns a promise at once, the `try` ends, and the rejection arrives after the net is gone. The `await` must be **inside** the `try`.' },

  { id: 'promise-all', hub: 'async', topic: 'async',
    title: 'Independent work in parallel: Promise.all',
    summary: '`await Promise.all([a(), b()])` runs independent operations at the same time and waits once, so it takes about as long as the slowest one instead of their sum.',
    html: [
      '<p>Calling a function that returns a promise is what <strong>starts</strong> the work; <code>await</code> only waits for it. Awaiting one call before making the next runs them in sequence. Making all the calls first, then waiting once, runs them together.</p>',
      '<table><caption>Two queries of 100 ms and 120 ms</caption><thead><tr><th scope="col"></th><th scope="col">One after the other</th><th scope="col">In parallel</th></tr></thead><tbody>'
        + '<tr><th scope="row">Code</th><td><code>await a(); await b();</code></td><td><code>await Promise.all([a(), b()])</code></td></tr>'
        + '<tr><th scope="row">Takes</th><td>100 + 120 = 220 ms</td><td>The slowest: 120 ms</td></tr>'
        + '<tr><th scope="row">Use it when</th><td><code>b</code> needs the result of <code>a</code></td><td>The operations are independent</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>The result</strong> is one array of the values, in the order of the input array, not in the order they finished. <code>const [user, tasks] = await Promise.all(…)</code> takes them out by position (<strong>array destructuring</strong>).</li>'
        + '<li><strong>One failure rejects it all,</strong> at once, with that error. The other operations keep running, but their results are ignored. That suits a request that needs every piece.</li>'
        + '<li><strong>Every outcome, even failures:</strong> <code>Promise.allSettled</code> gives <code>{ status, value }</code> or <code>{ status, reason }</code> for each one.</li></ul>',
    ],
    code: `async function loadDashboard(id) {
  // Sequential: about 100 ms + 120 ms = 220 ms
  // const user = await db.users.findById(id);
  // const tasks = await db.tasks.findByOwner(id);

  // Parallel: both start now; about max(100, 120) = 120 ms
  const [user, tasks] = await Promise.all([
    db.users.findById(id),
    db.tasks.findByOwner(id),
  ]);
  return { user, tasks };
}`,
    example: 'A dashboard needs the user, their tasks and their unread notifications: three queries of about 50 ms that each need only the user id. Awaiting them one by one answers in about 150 ms; `const [user, tasks, notes] = await Promise.all([…])` answers in about 50 ms, still inside one `try`/`catch`.',
    live: { kind: 'js', code: `// Fake queries: each answers after ms milliseconds
const sleep = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const findUser = () => sleep(100, { name: 'Ana' });
const findTasks = () => sleep(120, ['Buy milk', 'Study']);

async function sequential() {
  const t0 = Date.now();
  const user = await findUser();
  const tasks = await findTasks();
  console.log('sequential:', Date.now() - t0, 'ms', user.name, tasks.length);
}

async function parallel() {
  const t0 = Date.now();
  const [user, tasks] = await Promise.all([findUser(), findTasks()]);
  console.log('parallel:', Date.now() - t0, 'ms', user.name, tasks.length);
}

sequential().then(parallel);` },
    mistake: 'Writing `await` inside the array: `Promise.all([await a(), await b()])`. The `await`s run one after the other **while the array is being built**, so the work is sequential again. Pass the promises themselves: `Promise.all([a(), b()])`.' },

  /* ---- 5. The event loop ------------------------------------------------------------------- */
  { id: 'event-loop', hub: 'loop', topic: 'loop',
    title: 'The event loop: one thread, a call stack and queues',
    summary: 'The **event loop** is how one JavaScript thread handles many things: finished work queues a callback, and the loop runs the callbacks one at a time, whenever the call stack is empty.',
    html: [
      '<p>Your code runs on one thread, which works only on the <strong>call stack</strong>: the functions running right now (a call pushes a frame on top, a return pops it). Waiting happens elsewhere: timers and I/O are handled by <strong>libuv</strong>, the library under Node, and by the operating system (in a browser, by its Web APIs). When their work is done they never interrupt your code; they queue a callback.</p>',
      '<h3>One round of the loop</h3>',
      '<ol><li>Run the script until the call stack is empty.</li>'
        + '<li>Run every microtask (promise callbacks, the code after an <code>await</code>), until the microtask queue is empty, including microtasks added meanwhile.</li>'
        + '<li>Take <strong>one</strong> task (an expired timer, a finished I/O operation) and run it to the end.</li>'
        + '<li>Back to step 2. When nothing is left to run or wait for, a Node program exits.</li></ol>',
      '<p>Nothing interrupts code that is running: a callback waits until the stack is empty. That is why <code>setTimeout(fn, 0)</code> runs <strong>after</strong> the rest of the script, despite the 0. How to predict a whole order: <a href="#/server/runtime/microtasks">Microtasks before tasks</a>.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Callbacks wait in queues; the loop moves one to the stack only when it is empty.',
      desc: 'Timers and I/O, handled by libuv and the operating system, put their callbacks in the task queue, which gives one task per round. Promises put their callbacks in the microtask queue, which is emptied first. The event loop takes callbacks from the queues and runs them on the call stack whenever the stack is empty.',
      nodes: [
        { id: 'io', label: 'Timers and I/O', note: 'libuv and the OS' },
        { id: 'prom', label: 'Promises', note: '`.then`, `await`' },
        { id: 'tasks', label: 'Task queue', note: 'one per round' },
        { id: 'micro', label: 'Microtask queue', note: 'all, before any task' },
        { id: 'loop', label: 'Event loop', note: 'when the stack is empty', key: true },
        { id: 'stack', label: 'Call stack', note: 'one callback at a time' },
      ],
      edges: [['io', 'tasks'], ['prom', 'micro'], ['tasks', 'loop'], ['micro', 'loop'], ['loop', 'stack']],
    },
    live: { kind: 'js', code: `console.log('script start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('script end');
// Predict the four lines, then press Run.` },
    example: 'In the Try it box, both plain `console.log` lines run while the script is on the stack. `setTimeout` hands its callback to the timer, which queues it as a task after 0 ms. `.then` on a fulfilled promise queues a microtask. When the script ends, the loop empties the microtask queue (`promise`), then takes the task (`timeout`). Step through it below with the "Promise.then versus setTimeout" program.',
    mistake: 'Reading `setTimeout(fn, 1000)` as "run `fn` in exactly one second". It means "queue `fn` **no sooner than** one second from now"; if the stack is busy or other tasks are ahead, it runs later. A timer delay is a minimum, not an appointment.',
    widget: 'event-loop' },

  { id: 'microtasks', hub: 'loop', topic: 'loop',
    title: 'Microtasks before tasks: predicting the order',
    summary: 'Asynchronous code prints in this order: all synchronous code; then every microtask, in the order queued; then tasks such as timers, one at a time, each followed by the microtasks it created.',
    html: [
      '<p>The <a href="#/server/runtime/event-loop">event loop</a> empties the microtask queue before it takes the next task. So a chain of ten <code>.then</code> calls finishes before a <code>setTimeout(fn, 0)</code> that was scheduled earlier. To predict an order, ask two questions about every callback: <strong>which queue</strong> does it join, and <strong>when</strong> does it join it?</p>',
      '<table><caption>Where each kind of callback waits</caption><thead><tr><th scope="col">You write</th><th scope="col">It waits in</th><th scope="col">It runs</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>console.log(…)</code>, any plain call</th><td>Nothing: it runs now</td><td>Immediately, on the call stack</td></tr>'
        + '<tr><th scope="row"><code>.then(fn)</code>, <code>.catch(fn)</code>, code after <code>await</code>, <code>queueMicrotask(fn)</code></th><td>Microtask queue</td><td>As soon as the stack is empty, before any task</td></tr>'
        + '<tr><th scope="row"><code>setTimeout(fn, ms)</code>, <code>setInterval(fn, ms)</code></th><td>Task queue, once the delay has passed</td><td>One at a time, after all microtasks</td></tr>'
        + '<tr><th scope="row">I/O callbacks: <code>fs.readFile</code>, an incoming request</th><td>Task queue, once the I/O has finished</td><td>One at a time, after all microtasks</td></tr>'
        + '</tbody></table>',
      '<h3>A callback is queued only when it is ready</h3>',
      '<ul><li><strong>Chains:</strong> in <code>Promise.resolve().then(a).then(b)</code>, <code>a</code> is queued at once, but <code>b</code> waits for the promise that <code>.then(a)</code> returned, so it is queued only after <code>a</code> has run.</li>'
        + '<li><strong><code>async</code> functions</strong> run synchronously up to their first <code>await</code>; the rest is queued when the awaited promise is fulfilled.</li>'
        + '<li><strong>Timers and I/O</strong> are queued when the delay has passed or the I/O has finished, not when you write the line.</li></ul>',
      '<h3>Two more queues, in Node only</h3>',
      '<dl><dt><code>process.nextTick(fn)</code></dt><dd>Runs <strong>before</strong> the promise microtasks (in a CommonJS file).</dd>'
        + '<dt><code>setImmediate(fn)</code></dt><dd>Runs in the loop\'s <strong>check phase</strong>, right after the phase that handles finished I/O. Inside an I/O or timer callback it runs before a new <code>setTimeout(fn, 0)</code>; at the top level of a script their order is not guaranteed.</dd></dl>',
      '<p>Server code rarely needs either; it is enough to recognise them.</p>',
    ],
    live: { kind: 'js', code: `console.log('1');
setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);
Promise.resolve().then(() => {
  console.log('4');
  setTimeout(() => console.log('5'), 0);
});
console.log('6');
// Predict the order, then press Run. Then swap two lines and predict again.` },
    example: 'In the Try it box: `1` and `6` are synchronous. The `.then` callback is a microtask, so `4` comes next, and it schedules a second timer. The first timer\'s task prints `2` and queues a microtask, which runs before the next task: `3`. Last, the second timer: `5`. Result: 1, 6, 4, 2, 3, 5.',
    mistake: 'Ordering callbacks by the line they are written on. `setTimeout` on line 2 and `.then` on line 6 say nothing about which runs first: the queue a callback joins, and when it joins, decide.',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Predict the output: the event-loop challenges' } },

  { id: 'blocking', hub: 'loop', topic: 'loop',
    title: 'Never block the event loop',
    summary: '**Blocking the event loop** means keeping the call stack busy with long synchronous work: no other callback can run, so in a server **every** other request waits.',
    html: [
      '<p>Node keeps thousands of connections open on one thread only because each callback is <strong>short</strong>: it starts some I/O, returns, and the thread moves on. A callback that computes for seconds holds the call stack, and no request, timer or promise callback can run until it ends.</p>',
      '<h3>What blocks</h3>',
      '<ul><li><strong>Long loops</strong> over big data.</li>'
        + '<li><strong><code>JSON.parse</code> or <code>JSON.stringify</code></strong> of very large values.</li>'
        + '<li><strong>Synchronous APIs in a request handler:</strong> <code>fs.readFileSync</code>, <code>crypto.pbkdf2Sync</code>, <code>bcrypt.hashSync</code> for passwords.</li>'
        + '<li><strong>Badly written regular expressions</strong> on long input.</li></ul>',
      '<p>These are <strong>CPU-bound</strong>: the processor itself is the bottleneck. What does <strong>not</strong> block: <code>await</code>ing the database, a file read with <code>fs/promises</code>, a <code>fetch</code>. The thread is free while they wait.</p>',
      '<h3>When work really is heavy</h3>',
      '<p>Move it off the main thread: the <code>worker_threads</code> module runs JavaScript on another thread, and larger systems send the job to a queue handled by a separate worker program. For an ordinary API the rule is simpler: in a request handler, use the asynchronous version of every API, and never loop over data of unlimited size (one reason APIs add <strong>pagination</strong>).</p>',
    ],
    code: `const http = require('node:http');

// One slow route freezes the whole server
http.createServer((req, res) => {
  if (req.url === '/slow') {
    const end = Date.now() + 5000;
    while (Date.now() < end) {}
    // → 5 s of busy waiting on the call stack
  }
  res.end(\`done: \${req.url}\`);
}).listen(3000);
// While /slow runs, a request to /health waits too: it is stuck in the queue.`,
    example: 'Start the server, run `curl http://localhost:3000/slow` in one terminal and straight away `curl http://localhost:3000/health` in another. `/health` normally answers in milliseconds; now it waits until the five seconds are over, because the event loop cannot take its request while `/slow` holds the stack. The visualiser\'s "A blocking loop delays a timer" program shows the same with a timer.',
    mistake: 'Thinking `async` makes a function non-blocking. `async function work() { for (let i = 0; i < 1e9; i++) {} }` still blocks for the whole loop: `async` only changes what the function **returns** (a promise). Code stops blocking only where it really waits for something outside the thread, at an `await`.',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Watch a blocking loop delay a timer' } },

  /* ---- 6. Configuration and app structure -------------------------------------------------- */
  { id: 'env-vars', hub: 'config', topic: 'config',
    title: 'Environment variables and process.env',
    summary: 'An **environment variable** is a named setting handed to a program by whatever starts it, outside the code; Node exposes them in `process.env`.',
    html: [
      '<p>The same code runs on your laptop, a teammate\'s, a test server and in production, and some settings must differ: the port, the database address, secret keys. Written into the code, they would need an edit for every place, and your secrets would be published with it. So the program <strong>reads its settings from the environment</strong> when it starts: a list of <code>NAME=value</code> pairs, read as <code>process.env.NAME</code>.</p>',
      '<ul><li><strong>Always text:</strong> convert numbers with <code>Number(…)</code>, and compare flags as strings: <code>process.env.DEBUG === \'true\'</code>.</li>'
        + '<li><strong><code>undefined</code> when never set,</strong> so give a default: <code>const PORT = process.env.PORT || 3000;</code>. Hosting platforms set <code>PORT</code> for you; on your laptop the default applies.</li></ul>',
      '<table><caption>Setting a variable for one run</caption><thead><tr><th scope="col">Terminal</th><th scope="col">Command</th></tr></thead><tbody>'
        + '<tr><th scope="row">Git Bash, macOS, Linux</th><td><code>PORT=4000 npm start</code></td></tr>'
        + '<tr><th scope="row">PowerShell</th><td><code>$env:PORT = 4000; npm start</code> (stays set until you close the window)</td></tr>'
        + '</tbody></table>',
      '<p>A <code>.env</code> file saves the typing (see <a href="#/server/runtime/dotenv-secrets">.env files</a>).</p>',
    ],
    live: { kind: 'js', code: `// In Node this object would be process.env; here we fake it.
const env = { PORT: '4000', DEBUG: 'false' };

const port = env.PORT || 3000;
console.log(port, typeof port);
// → 4000 string

const portNumber = Number(env.PORT) || 3000;
console.log(portNumber, typeof portNumber); // 4000 number

if (env.DEBUG) console.log('debug is on?!'); // runs: 'false' is a non-empty string
console.log(env.DEBUG === 'true');
// → false: compare the text

console.log(env.DATABASE_URL);
// → undefined: never set` },
    example: 'Port 3000 is taken on a teammate\'s laptop. Instead of editing `server.js` (and fighting over it in every merge), they run `PORT=4000 npm start`. `process.env.PORT` is `\'4000\'`, the server listens on 4000, and the code in Git never changed.',
    mistake: 'Testing a flag with `if (process.env.DEBUG)` when it is set to `false`. The value is the **string** `\'false\'`, which is truthy (every non-empty string is), so debug mode switches on. The same trap with numbers: `process.env.PORT + 1` is `\'40001\'`, not `4001`.' },

  { id: 'dotenv-secrets', hub: 'config', topic: 'config',
    title: '.env files, config and keeping secrets out of Git',
    summary: 'A **`.env`** file lists a project\'s environment variables, one `NAME=value` per line; it holds secrets, so it never goes into Git.',
    html: [
      '<p>A <strong>secret</strong> is any value that grants access: a database password, the key that signs login tokens, an API key for a paid service. Whoever reads it can act as your application. Once a secret is pushed to GitHub, treat it as <strong>public forever</strong>: bots scan new commits for keys within minutes, and deleting the file later does not remove it from the history. The only real fix is to change (<strong>rotate</strong>) the secret.</p>',
      '<dl><dt><code>.env</code></dt><dd>The real values. Listed in <code>.gitignore</code>, never committed.</dd>'
        + '<dt><code>.env.example</code></dt><dd>The same names with placeholder values. Committed, so a teammate knows what to fill in.</dd></dl>',
      '<h3>Loading it, before anything reads it</h3>',
      '<ul><li><strong><code>node --env-file=.env src/server.js</code></strong>: built into Node 20.6 and later, nothing to install.</li>'
        + '<li><strong><code>require(\'dotenv\').config();</code></strong> on the first line of the entry file, after <code>npm install dotenv</code>.</li>'
        + '<li><strong>The real environment wins:</strong> a variable already set, for example by a hosting platform, is not replaced by the file.</li></ul>',
      '<p>Read the variables in <strong>one place</strong>, a <code>config</code> module that converts types, supplies defaults and <strong>fails fast</strong>: a missing required variable throws at start-up with a clear message, not on the first request that needs it. The rest of the code requires the config and never touches <code>process.env</code>.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Secrets stay out of Git and enter the app through one door.',
      desc: 'The git-ignored .env file is loaded into process.env, with node --env-file or the dotenv package. The config module reads process.env, converts and checks every value, and fails fast if one is missing. The rest of the app reads only the config module.',
      nodes: [
        { id: 'file', label: '`.env`', note: 'git-ignored' },
        { id: 'env', label: '`process.env`', note: 'strings or `undefined`' },
        { id: 'config', label: '`config` module', note: 'converts, checks, fails fast', key: true },
        { id: 'app', label: 'The rest', note: 'reads only `config`' },
      ],
      edges: [['file', 'env', 'loaded'], ['env', 'config'], ['config', 'app']],
    },
    code: `// .env.example (committed)
// .env (git-ignored)
// PORT=3000
// PORT=3000
// DATABASE_URL=postgres://ana:s3cret@localhost:5432/tasks
// DATABASE_URL=postgres://user:password@localhost:5432/tasks
//
// JWT_SECRET=change-me
// JWT_SECRET=k8Jq2v…

// src/config/index.js: the only file that reads process.env
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing environment variable \${name} (see .env.example)\`);
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
};

// src/server.js: load .env FIRST, before anything reads the config
// or start with: node --env-file=.env src/server.js
require('dotenv').config();
const config = require('./config');
const app = require('./app');
app.listen(config.port, () => console.log(\`Listening on http://localhost:\${config.port}\`));`,
    example: 'A new teammate clones the repo, runs `npm ci` and `npm start`, and gets `Error: Missing environment variable DATABASE_URL (see .env.example)` at once. They copy the example (`cp .env.example .env` in Git Bash, `Copy-Item .env.example .env` in PowerShell), fill in their own password and start again. Without fail-fast, the server would start "fine" and crash on the first request that touched the database.',
    mistake: 'Loading `.env` too late. If `server.js` requires `./config` **before** `require(\'dotenv\').config()`, the config module runs first, finds nothing, and reports a missing variable that is right there in `.env`. Load it on the first line, or use `--env-file`. And never "fix" a missing variable by pasting the real secret into the code as a default.' },

  { id: 'frameworks', hub: 'config', topic: 'config',
    title: 'Why a framework, and why Express',
    summary: 'A **web framework** does the chores every server repeats, so each route is one line instead of one more `if`; the examples on this site use **Express**.',
    html: [
      '<p>The <a href="#/server/runtime/first-server">plain http server</a> calls one function for every request, and everything else is yours: split the URL, compare the method, read the body, set the headers, turn objects into JSON. With twenty routes that becomes one giant <code>if</code>/<code>else</code>. A framework gives that work a standard shape.</p>',
      '<dl><dt>Routing</dt><dd>Method + path → a function: <code>app.get(\'/tasks\', listTasks)</code>.</dd>'
        + '<dt>Middleware</dt><dd>Functions every request passes through, in order: a logger, a body parser, a login check.</dd>'
        + '<dt>Structure</dt><dd>Conventions most projects share (see <a href="#/server/runtime/project-layout">A project layout</a>).</dd></dl>',
      '<table><caption>Four Node frameworks you will hear about</caption><thead><tr><th scope="col">Framework</th><th scope="col">Style</th><th scope="col">Typical use</th></tr></thead><tbody>'
        + '<tr><th scope="row">Express</th><td>Minimal, unopinionated, a huge choice of middleware</td><td>Small and medium APIs; the worked example on this site</td></tr>'
        + '<tr><th scope="row">Fastify</th><td>Very fast; validates requests against schemas; plugins</td><td>APIs where performance matters</td></tr>'
        + '<tr><th scope="row">Koa</th><td>Minimal; middleware written with <code>async</code>/<code>await</code></td><td>Lightweight custom servers</td></tr>'
        + '<tr><th scope="row">NestJS</th><td>Structured, TypeScript first, many built-in conventions</td><td>Large applications built by big teams</td></tr>'
        + '</tbody></table>',
      '<p>Express is <strong>unopinionated</strong>: no fixed folders, no database, so you meet every moving part. Many projects pin <strong>Express 4</strong> (<code>"express": "^4.22.3"</code>), as the examples here do; Express 5 is the npm default today, and the first difference you will notice is how it handles errors in <code>async</code> handlers (see <a href="#/server/runtime/async-errors">Errors in async code</a> and <a href="#/server/routes/express-async-errors">Async handlers: Express 4 versus Express 5</a>). Express itself is the subject of <a href="#/server/routes/what-is-express">Routes and middleware</a>.</p>',
    ],
    code: `// The server of "A first server", with Express
const express = require('express');
const app = express();

// one line per route
app.get('/health', (req, res) => res.json({ status: 'ok' }));
// Any other path: Express answers 404 by itself

app.listen(3000, () => console.log('Listening on http://localhost:3000'));`,
    example: 'Adding `GET /tasks/:id` to the plain `http` server means splitting `req.url` by hand, checking the method, converting the id and repeating the `Content-Type` header. In Express it is `app.get(\'/tasks/:id\', getTask)`, and `req.params.id` already holds the id. Multiply that by twenty routes.',
    mistake: '"Express replaces Node." Express is a package that **runs inside** Node: installed with npm, loaded with `require(\'express\')`, built on the `http` module. Everything in this section (modules, npm, the event loop, `process.env`) applies to every Express app.' },

  { id: 'project-layout', hub: 'config', topic: 'config',
    title: 'A Node/Express project layout',
    summary: 'A typical Node API keeps its code in `src/`, one folder per job, and splits building the app (`app.js`) from starting it (`server.js`).',
    html: [
      '<p>One job per folder means that when something breaks, you know which file to open. The layout grows with the project: a first API has <code>app.js</code>, <code>server.js</code>, <code>routes/</code> and <code>controllers/</code>; a database adds <code>models/</code>; authentication adds middleware. Files that are not code (<code>package.json</code>, <code>.gitignore</code>, <code>.env.example</code>, <code>README.md</code>) stay at the root.</p>',
      '<dl><dt><code>routes/</code></dt><dd>Which function answers each method and URL.</dd>'
        + '<dt><code>controllers/</code></dt><dd>What each request does: read <code>req</code>, do the work, send <code>res</code>.</dd>'
        + '<dt><code>models/</code></dt><dd>The database queries, once there is a database.</dd>'
        + '<dt><code>middleware/</code></dt><dd>Steps shared by many requests: logging, checking a login, the error handler.</dd>'
        + '<dt><code>config/</code></dt><dd>Reads <code>process.env</code> in one place (see <a href="#/server/runtime/dotenv-secrets">.env files</a>).</dd>'
        + '<dt><code>app.js</code>, <code>server.js</code></dt><dd><code>app.js</code> builds and exports the app; <code>server.js</code> requires it and calls <code>listen</code>. Tests can then load the app without opening a port (see <a href="#/server/routes/app-server-split">app.js builds, server.js starts</a>).</dd></dl>',
    ],
    diagram: {
      kind: 'layers',
      title: 'Each folder calls only the one below it.',
      desc: 'Four layers, top to bottom. Routes pick the controller function for each method and URL. Controllers do the work of each request and call the models. Models run the queries against the database, at the bottom.',
      nodes: [
        { id: 'routes', label: '`routes/`', note: 'which function answers' },
        { id: 'controllers', label: '`controllers/`', note: 'what each request does' },
        { id: 'models', label: '`models/`', note: 'the queries' },
        { id: 'db', label: 'The database' },
      ],
      edges: [],
    },
    code: `my-api/
├── package.json
├── package-lock.json
├── .gitignore            # node_modules/ and .env
├── .env                  # real settings: NOT committed
├── .env.example          # same keys, placeholder values: committed
├── README.md
├── src/
│   ├── server.js         # requires app, calls app.listen()
│   ├── app.js            # builds and exports the Express app
│   ├── routes/           # method + URL → controller function
│   ├── controllers/      # request logic: read req, send res
│   ├── models/           # database queries (once there is a database)
│   ├── middleware/       # logger, auth, error handler
│   └── config/           # reads process.env in one place
└── tests/                # automated tests`,
    dialect: 'Folder tree',
    example: 'Follow `GET /tasks`: `server.js` started the app; `app.js` ran the shared middleware (the logger, the body parser) and passed the request to `routes/tasks.js`; the route called `listTasks` in `controllers/tasksController.js`, which asked `models/task.js` for the rows and sent them as JSON. Five files, one small job each.',
    mistake: 'Calling `app.listen()` inside `app.js` "because it is shorter". It works until the first test file requires the app: every test run then opens a real port, and a second test file fails with `EADDRINUSE`. Keep the rule strict: `app.js` exports, `server.js` listens.' },
];

DATA.en.NODE_QUIZ = [
  /* runtime */
  { type: 'mc', topic: 'runtime',
    q: 'Which statement about Node.js is correct?',
    choices: ['It is a new programming language based on JavaScript', 'It is a web framework, like Express', 'It is a runtime that runs JavaScript outside the browser, built on the V8 engine', 'It is a browser without a window'],
    answer: 2,
    why: 'Node is the environment (runtime) around the V8 engine. The language is plain JavaScript; Express is a framework that runs on Node.' },
  { type: 'tf', topic: 'runtime',
    q: '`document.querySelector` works in a Node.js script once Express is installed.',
    answer: false,
    why: 'Node has no page, so there is no `document`; Express handles HTTP requests and adds no DOM.' },
  { type: 'mc', topic: 'runtime',
    q: 'Which of these exists in Node but not in a browser page?',
    choices: ['`console.log`', '`process.env`', '`setTimeout`', '`JSON.parse`'],
    answer: 1,
    why: '`process` describes the running Node program. The other three belong to both environments.' },
  { type: 'fib', topic: 'runtime',
    q: 'To start a server that restarts every time you save a file, with no extra package, you run `node ___ src/server.js`.',
    accept: ['--watch'],
    why: '`--watch` is built into Node and restarts the process when the file, or anything it loads, changes.' },
  { type: 'mc', topic: 'runtime',
    q: 'A server is already running on port 3000. You start `node src/server.js` again in a second terminal. What happens?',
    choices: ['Both servers share port 3000', 'The first server stops automatically', 'The second one moves to port 3001', 'The second one fails with `EADDRINUSE`: the port is already in use'],
    answer: 3,
    why: 'Only one program can listen on a port. Stop the first one with Ctrl+C, or start the second on another port.' },
  { type: 'mc', topic: 'runtime',
    q: 'Which Node release should you use for an API you deploy?',
    choices: ['The newest Current release', 'The most recent Active LTS release', 'The oldest version still available', 'Any release: they are all identical'],
    answer: 1,
    why: 'LTS (Long-Term Support) releases receive fixes for years; Current releases are for trying out new features.' },

  { type: 'fib', topic: 'runtime',
    q: 'After `const server = http.createServer(handler);`, the call `server.___(3000)` makes the program wait for requests on port 3000.',
    accept: ['listen'],
    why: '`listen` claims the port; from then on Node calls the handler for every request that arrives on it.' },
  { type: 'mc', topic: 'runtime',
    q: 'A plain `http` server answers `GET /health`. What decides which code answers `GET /tasks`?',
    choices: ['Node runs the file whose name matches the path', 'Your one handler function, which must check `req.method` and `req.url` itself', 'The browser', 'The port number'],
    answer: 1,
    why: 'The `http` module calls one function for every request; routing by method and path is your job, or a framework\'s.' },

  /* modules */
  { type: 'mc', topic: 'modules',
    q: '`math.js` defines `function add(a, b) { … }` but never assigns `module.exports`. What does `require(\'./math\')` return?',
    choices: ['The `add` function', '`undefined`', 'An empty object `{}`', 'It throws `Cannot find module`'],
    answer: 2,
    why: 'Every module starts with `module.exports = {}`. Without an assignment, that empty object is what `require` returns.' },
  { type: 'mc', topic: 'modules',
    q: 'Which line exports two functions from a CommonJS module?',
    choices: ['`exports = { listTasks, createTask };`', '`module.exports = { listTasks, createTask };`', '`module.export = { listTasks, createTask };`', '`export { listTasks, createTask };`'],
    answer: 1,
    why: '`exports = …` only re-points the shortcut, `module.export` (no s) is a typo that creates an unused property, and `export { }` is ES-module syntax.' },
  { type: 'mc', topic: 'modules',
    q: '`src/routes/tasks.js` needs `src/controllers/tasksController.js`. Which `require` is right?',
    choices: ['`require(\'controllers/tasksController\')`', '`require(\'./controllers/tasksController\')`', '`require(\'/controllers/tasksController\')`', '`require(\'../controllers/tasksController\')`'],
    answer: 3,
    why: 'Paths are relative to the file that contains the `require`: from `src/routes/`, `../` goes up to `src/`, then into `controllers/`. Without `./` or `../`, Node would look for a package.' },
  { type: 'tf', topic: 'modules',
    q: '`require(\'express\')` works without `npm install`, because Express is part of Node.',
    answer: false,
    why: 'Express is a package: it must be installed into `node_modules`. Built-in modules such as `node:fs` need no installation.' },
  { type: 'fib', topic: 'modules',
    q: 'In `const { listTasks } = require(\'./controller\');` the `{ }` on the left takes the `listTasks` property out of the exported object. This syntax is called object ___.',
    accept: ['destructuring'],
    why: 'Destructuring copies properties into variables of the same name; a missing property gives `undefined`.' },
  { type: 'mc', topic: 'modules',
    q: '`package.json` has `"type": "commonjs"`, and `app.js` starts with `import express from \'express\';`. What happens when you run it?',
    choices: ['It works: Node accepts both styles in any file', '`SyntaxError: Cannot use import statement outside a module`', 'Express is imported as `undefined`', 'npm rewrites the line into `require`'],
    answer: 1,
    why: 'With `"type": "commonjs"`, `.js` files are CommonJS, where `import` statements are not allowed. Use `require`, or switch the whole project to ES modules.' },
  { type: 'tf', topic: 'modules',
    q: 'The top-level code of a module runs again every time another file requires it.',
    answer: false,
    why: 'A module runs once; Node caches its `module.exports` and returns the same value to every later `require`.' },

  { type: 'mc', topic: 'modules',
    q: 'You run `node src/load.js` from the project folder, and `load.js` calls `fs.readFileSync(\'tasks.json\', \'utf8\')`. Which file does it try to open?',
    choices: ['`src/tasks.json`, next to `load.js`', '`tasks.json` in the project folder, where Node was started', 'Both, in that order', '`node_modules/tasks.json`'],
    answer: 1,
    why: 'Relative file paths are resolved from the folder Node was started in, not from the file. `path.join(__dirname, \'tasks.json\')` would point next to `load.js`.' },
  { type: 'fib', topic: 'modules',
    q: 'In a CommonJS file, `path.join(___, \'tasks.json\')` builds the path of `tasks.json` in the same folder as the current file.',
    accept: ['__dirname'],
    why: '`__dirname` is the folder of the current file, whatever folder Node was started in.' },
  { type: 'tf', topic: 'modules',
    q: 'Without `\'utf8\'`, `fs.readFileSync(\'notes.txt\')` returns the text of the file as a string.',
    answer: false,
    why: 'Without an encoding it returns a Buffer, the raw bytes. Pass `\'utf8\'` to get a string.' },

  /* npm */
  { type: 'mc', topic: 'npm',
    q: '`package.json` lists `"express": "^4.19.0"`. Which version may npm install?',
    choices: ['`4.18.2`', 'Only `4.19.0`', '`5.0.0`', '`4.22.3`'],
    answer: 3,
    why: 'The caret accepts any version with the same major that is not older: 4.19.0 or newer, but never 5.x.' },
  { type: 'mc', topic: 'npm',
    q: 'Which range accepts `4.19.5` but rejects `4.20.0`?',
    choices: ['`~4.19.0`', '`^4.19.0`', '`*`', '`>=4.19.0`'],
    answer: 0,
    why: 'The tilde allows only patch updates within 4.19; the caret would also allow 4.20.0.' },
  { type: 'tf', topic: 'npm',
    q: '`node_modules/` should be committed so that teammates do not have to install anything.',
    answer: false,
    why: 'It is rebuilt from `package.json` and `package-lock.json` with `npm ci`; it is huge and partly specific to your operating system. List it in `.gitignore`.' },
  { type: 'mc', topic: 'npm',
    q: 'A teammate clones your repo, runs `npm install`, and gets different package versions from yours. Which file was most likely never committed?',
    choices: ['`package-lock.json`', '`node_modules/`', '`.env`', '`README.md`'],
    answer: 0,
    why: 'The lockfile records the exact versions you installed. Without it, the ranges in `package.json` are resolved again and may pick newer versions.' },
  { type: 'mc', topic: 'npm',
    q: 'What does `npm ci` do differently from `npm install`?',
    choices: ['It installs the newest versions the ranges allow', 'It installs only the devDependencies', 'It installs exactly what `package-lock.json` lists, never changes it, and fails if it disagrees with `package.json`', 'It commits the lockfile to Git'],
    answer: 2,
    why: '`npm ci` is the reproducible install for servers and CI; `npm install` may update the lockfile.' },
  { type: 'mc', topic: 'npm',
    q: 'Where should `jest`, the test runner, be listed?',
    choices: ['`dependencies`', '`devDependencies`', '`scripts`', 'Nowhere: install it globally only'],
    answer: 1,
    why: 'It is needed to develop and test, not to run the app, so `npm install --save-dev jest` puts it in `devDependencies`.' },
  { type: 'fib', topic: 'npm',
    q: 'With `"dev": "node --watch src/server.js"` under `scripts`, you start it by typing `npm ___ dev`.',
    accept: ['run'],
    why: 'Only a few script names (`start`, `test`) work without `run`; `npm dev` gives "Unknown command".' },

  /* config */
  { type: 'mc', topic: 'config',
    q: '`server.js` has `const PORT = process.env.PORT || 3000;` and is started with `PORT=4000 npm start`. What is `PORT`?',
    choices: ['The number `4000`', '`3000`', 'The string `\'4000\'`', '`undefined`'],
    answer: 2,
    why: 'Environment variables are always strings. `app.listen` accepts it, but convert with `Number(…)` before doing arithmetic.' },
  { type: 'tf', topic: 'config',
    q: 'With `DEBUG=false` in the environment, the block of `if (process.env.DEBUG) { … }` does not run.',
    answer: false,
    why: 'The value is the string `\'false\'`, and every non-empty string is truthy. Compare explicitly: `process.env.DEBUG === \'true\'`.' },
  { type: 'mc', topic: 'config',
    q: 'Which file belongs in the Git repository?',
    choices: ['`.env` with the real database password', '`.env.example` with the variable names and placeholder values', '`node_modules/`', 'A copy of `.env` called `.env.backup`'],
    answer: 1,
    why: 'The example file tells teammates which variables to set without revealing any secret; `.env` and `node_modules/` are git-ignored.' },
  { type: 'mc', topic: 'config',
    q: 'You pushed a commit containing the real JWT secret, then deleted the file in the next commit. What must you do?',
    choices: ['Nothing: the file is gone', 'Rename the variable', 'Make the repository private and keep the secret', 'Change (rotate) the secret: it is still in the Git history'],
    answer: 3,
    why: 'Every commit keeps its files, and pushed secrets can be copied within minutes. Only a new secret makes the leaked one useless.' },
  { type: 'mc', topic: 'config',
    q: 'Why does a well-organised Express project keep `app.js` (builds and exports the app) separate from `server.js` (calls `app.listen`)?',
    choices: ['So tests can import the app without opening a network port', 'Express needs two files to start', 'It makes the server faster', 'Because `listen` must live in its own folder'],
    answer: 0,
    why: 'Tests with supertest require `app.js` and send fake requests to it; only `server.js` opens a real port.' },
  { type: 'fib', topic: 'config',
    q: 'Node 20.6 and later can load a `.env` file without any package: `node ___=.env src/server.js`.',
    accept: ['--env-file'],
    why: '`--env-file` reads the file into `process.env` before your code runs; the `dotenv` package does the same from inside the code.' },
  { type: 'mc', topic: 'config',
    q: 'What does a framework such as Express add on top of Node\'s `http` module?',
    choices: ['Routing, a middleware pipeline and a standard structure', 'The ability to run JavaScript on a server', 'A database', 'The event loop'],
    answer: 0,
    why: 'Node already runs the code, has the event loop and can serve HTTP. Express adds the conventions: method + path → handler, middleware and `next()`.' },
  { type: 'mc', topic: 'config',
    q: 'What does "fail fast" mean for configuration?',
    choices: ['Retry each request until the variable appears', 'Use a default value for every missing secret', 'Stop with a clear error at start-up when a required variable is missing', 'Hide configuration errors from the logs'],
    answer: 2,
    why: 'Crashing at start-up with "Missing DATABASE_URL" points straight at the cause; crashing on the first request that needs it hides it.' },

  /* async */
  { type: 'mc', topic: 'async',
    q: '`let data; fs.readFile(\'a.txt\', \'utf8\', (err, d) => { data = d; }); console.log(data);` What is printed?',
    choices: ['The contents of `a.txt`', '`null`', '`undefined`', 'An error'],
    answer: 2,
    why: '`readFile` returns at once; the callback runs later, after `console.log` has already printed the still-empty `data`.' },
  { type: 'mc', topic: 'async',
    q: 'In Node\'s error-first convention, what is the first argument passed to the callback when the operation succeeds?',
    choices: ['The result', '`null`', '`true`', 'The name of the operation'],
    answer: 1,
    why: 'The first parameter is reserved for the error: `null` means there was none, and the result comes second.' },
  { type: 'mc', topic: 'async',
    q: 'Which is **not** one of the states of a promise?',
    choices: ['pending', 'fulfilled', 'rejected', 'cancelled'],
    answer: 3,
    why: 'A promise is pending until it settles, once, as fulfilled (a value) or rejected (an error). Standard promises cannot be cancelled.' },
  { type: 'tf', topic: 'async',
    q: 'An `async` function that ends with `return 5` gives its caller the number 5.',
    answer: false,
    why: 'An `async` function always returns a promise; here it is fulfilled with 5, so the caller needs `await` or `.then` to get the number.' },
  { type: 'mc', topic: 'async',
    q: 'In a request handler, `const rows = await db.findAll();` rejects and no `try`/`catch` surrounds it. What happens (Node 15 or later)?',
    choices: ['The server sends a 500 automatically', 'The client gets an empty 200 response', 'The rejection is unhandled and the Node process exits', 'Nothing: the error is ignored'],
    answer: 2,
    why: 'Nothing catches the rejected promise, and an unhandled rejection is fatal in modern Node: the whole server stops, for every user. (Express 4 does not catch it for you either.)' },
  { type: 'fib', topic: 'async',
    q: 'Inside `catch (err) { … }` of an Express 4 route, you hand the error to the error-handling middleware by calling ___(err).',
    accept: ['next', 'next(err)'],
    why: '`next(err)` skips the remaining routes and jumps to the middleware with four parameters, `(err, req, res, next)`.' },
  { type: 'mc', topic: 'async',
    q: 'Three independent queries take 40, 60 and 50 ms. About how long does `await Promise.all([q1(), q2(), q3()])` take?',
    choices: ['40 ms', '50 ms', '60 ms', '150 ms'],
    answer: 2,
    why: 'All three start at once, so the wait is about as long as the slowest one. Awaiting them one by one would take about 150 ms.' },
  { type: 'mc', topic: 'async',
    q: 'A route does `res.json(db.findAll());`, forgetting `await`, and `findAll` returns a promise. What does the client receive?',
    choices: ['The rows', '`{}`', 'A 500 error', 'An array of promises'],
    answer: 1,
    why: 'A promise object has no own enumerable properties, so it turns into `{}` as JSON. Add `await` to send the rows.' },

  /* loop */
  { type: 'mc', topic: 'loop',
    q: 'What does `setTimeout(() => console.log(\'A\'), 0); Promise.resolve().then(() => console.log(\'B\')); console.log(\'C\');` print?',
    choices: ['A B C', 'C A B', 'B C A', 'C B A'],
    answer: 3,
    why: 'Synchronous code first (C), then the microtask queue (B), then the task queue (A), even though the timer asked for 0 ms.' },
  { type: 'tf', topic: 'loop',
    q: '`setTimeout(fn, 0)` runs `fn` before the rest of the current script.',
    answer: false,
    why: 'Its callback waits in the task queue until the call stack is empty, that is, until the whole script has finished.' },
  { type: 'mc', topic: 'loop',
    q: 'When does the event loop take the next callback from the task queue?',
    choices: ['As soon as a timer expires, interrupting the running code', 'Every 4 ms', 'When the call stack is empty and the microtask queue has been emptied', 'Only after every timer has expired'],
    answer: 2,
    why: 'Running code is never interrupted. Once the stack is empty, all microtasks run first, then one task.' },
  { type: 'mc', topic: 'loop',
    q: 'Once the promise it awaits is fulfilled, where does the rest of an `async` function wait before it runs?',
    choices: ['The microtask queue', 'The task queue', 'The call stack', 'The timer list'],
    answer: 0,
    why: 'The code after `await` is a promise reaction, so it is queued as a microtask.' },
  { type: 'mc', topic: 'loop',
    q: 'What does `async function f() { console.log(1); await null; console.log(3); } f(); console.log(2);` print?',
    choices: ['1 3 2', '1 2 3', '2 1 3', '3 1 2'],
    answer: 1,
    why: 'An `async` function runs synchronously until its first `await` (1); then it returns, the script continues (2), and the rest of `f` runs as a microtask (3).' },
  { type: 'mc', topic: 'loop',
    q: 'A route runs a synchronous loop that lasts 3 seconds. What happens to other requests meanwhile?',
    choices: ['Other threads handle them', 'They run between iterations of the loop', 'They are rejected with 503', 'They wait: the only JavaScript thread is busy'],
    answer: 3,
    why: 'Your code runs on one thread, and the event loop can only take a new callback when the call stack is empty.' },
  { type: 'mc', topic: 'loop',
    q: 'Node only: in a CommonJS file, after the synchronous code, which runs first: a `process.nextTick` callback or a `Promise.resolve().then` callback?',
    choices: ['The `process.nextTick` callback', 'The promise callback', 'It is random', 'Whichever line comes first in the file'],
    answer: 0,
    why: 'Node empties the nextTick queue before the promise microtasks.' },
  { type: 'tf', topic: 'loop',
    q: 'Declaring a CPU-heavy function `async` stops it from blocking the event loop.',
    answer: false,
    why: '`async` only makes the function return a promise. Its loop still runs on the call stack until it ends; only waiting at an `await` frees the thread.' },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.NODE_VIDEOS = [
  {
    "id": "async-code",
    "group": "async",
    "title": "Code that waits",
    "mp4": "assets/video/async-code/async-code.mp4",
    "poster": "assets/video/async-code/async-code-poster.jpg",
    "captions": "assets/video/async-code/async-code.vtt",
    "duration": "3:16",
    "chapters": [
      {
        "t": 5.7,
        "title": "The line that waits"
      },
      {
        "t": 34.9,
        "title": "Callbacks"
      },
      {
        "t": 61.9,
        "title": "Promises"
      },
      {
        "t": 85.3,
        "title": "async and await"
      },
      {
        "t": 106.1,
        "title": "Forgot await"
      },
      {
        "t": 127,
        "title": "Nobody catches it"
      },
      {
        "t": 153.7,
        "title": "One after another or together"
      }
    ],
    "transcript": [
      "Code that waits. The same job, written three ways.",
      "Two requests reach your server. The first reads a file with `readFileSync`. That line waits for the disk. The second request waits behind it. Say eighty milliseconds each. With a hundred users, the last one waits eight seconds. Plain `readFile` starts the work and returns at once. The next line runs straight away. The data arrives later, in a callback.",
      "Here is the job. Read `config.json`. Read the data file it names. Write a copy. With callbacks, each step sits inside the one before. The code drifts to the right. Every callback receives the error first, then the result. So every level repeats: if error, return. Three steps, three levels, three error checks.",
      "A promise is an object standing for a result that is not ready yet. It starts pending. Then it settles once: fulfilled with a value, or rejected with an error. `.then` receives the value and returns a new promise. So the steps chain flat. One `.catch` at the end handles a failure in any step.",
      "`async` and `await` write the same chain as ordinary lines. `await` pauses this function until the promise settles, then hands back the value. It reads top to bottom. The function waits; the thread stays free. Same three steps. Only the spelling changed.",
      "Now the classic mistakes. Forget `await`, and you hold a promise, not the task. `task.title` is `undefined`. Log the task, and you see `Promise { <pending> }`. Sent as JSON, a promise becomes an empty object. Missing await: look there first.",
      "A rejected promise makes `await` throw on that line. So `try` and `catch` works. Without it, an unhandled rejection ends the Node process. Every user is disconnected, not just the one whose request failed. With the catch, that one user gets a `500`. And the `await` must sit inside the `try`. Otherwise the error arrives after the net is gone.",
      "Last: two independent queries. `findUser` takes 100 milliseconds. `findTasks` takes 120. `await` one, then the other, and the waits stack. 220 milliseconds. Calling the function starts the work. Await only waits. So start both, then wait once. `Promise.all` takes about the slowest: 120. The results come back in order. Use it when the work is independent. One rejection rejects them all.",
      "Practise it with the event-loop visualiser in Server-side JavaScript."
    ]
  },
  {
    "id": "event-loop",
    "group": "loop",
    "title": "One thread, many tasks",
    "mp4": "assets/video/event-loop/event-loop.mp4",
    "poster": "assets/video/event-loop/event-loop-poster.jpg",
    "captions": "assets/video/event-loop/event-loop.vtt",
    "duration": "3:08",
    "chapters": [
      {
        "t": 7.4,
        "title": "One cook, one counter"
      },
      {
        "t": 23.5,
        "title": "Waiting happens elsewhere"
      },
      {
        "t": 39.3,
        "title": "Two rails"
      },
      {
        "t": 49.3,
        "title": "The loop glances"
      },
      {
        "t": 63.9,
        "title": "Step through it"
      },
      {
        "t": 100,
        "title": "Predict the order"
      },
      {
        "t": 131.8,
        "title": "Blocking the cook"
      },
      {
        "t": 157.2,
        "title": "await frees the cook"
      }
    ],
    "transcript": [
      "One thread, many tasks. How Node serves a crowd while doing one thing at a time.",
      "Your JavaScript runs on one thread. Picture one cook at one counter. The counter is the call stack: the function running right now. A call puts a frame on the counter. A return takes it off.",
      "But the cook never stands waiting for the oven. Timers and file or network work belong to libuv and the operating system. They never interrupt the cook. When they finish, they put a ticket on a rail.",
      "There are two rails. Promise callbacks go on the microtask rail. Timer and I/O callbacks go on the task rail.",
      "The event loop is the cook, glancing at the rails. But only when the counter is empty. First, every microtask. Then one task. Then the rails again.",
      "Four lines. script start prints straight away. setTimeout hands its callback to the timer. The ticket reaches the task rail. Then .then() on a finished promise puts a ticket on the microtask rail. script end is printed. The counter is empty. Now the cook looks. Microtasks first: promise. Then the task: timeout. The timer said 0 milliseconds, yet it ran last. A delay is a minimum, not an appointment.",
      "Now a harder one. Predict the order before you look. 1 and 6 are plain calls. They print first. .then() is a microtask, so 4 comes next. It schedules another timer. Then the first timer's task prints 2, and queues a microtask. That prints 3 before the next task. Last, the second timer: 5. 1, 6, 4, 2, 3, 5.",
      "Now give the cook a long job. A loop that runs for 200 milliseconds. The timer finishes at once. Its ticket waits on the rail. Nothing interrupts the cook, so nothing else runs. In a server, every request waits. Long synchronous work blocks. Waiting for a database or a fetch does not.",
      "So how do you wait without blocking? With await. In checkHealth, await fetch() sends the request, and the function pauses. The cook is free. Other requests run. When the response arrives, the rest of the function is a microtask on the rail. await means: pause this function, free the cook.",
      "Practise it with the event-loop visualiser in Server-side JavaScript."
    ]
  }
];
// </topic-videos>
