'use strict';
/* Server-side JavaScript: concept cards, rail groups and self-check quiz (Node.js as the worked
   example). See site/README.md for the data contract.
   `live` boxes run in a Web Worker that captures only synchronous output, so asynchronous
   ordering is shown with static `code` and the event-loop tool instead.
   `hub` and `topic` keys match NODE_GROUPS and NODE_QUIZ_TOPICS. */

DATA.en.NODE_QUIZ_TOPICS = {
  runtime: 'The Node.js runtime',
  modules: 'Modules',
  npm: 'npm and package.json',
  config: 'Project layout and configuration',
  async: 'Asynchronous code',
  loop: 'The event loop',
};

DATA.en.NODE_GROUPS = [
  { key: 'runtime', label: 'The Node.js runtime', icon: 'server' },
  { key: 'modules', label: 'Modules', icon: 'files' },
  { key: 'npm', label: 'npm and package.json', icon: 'storage' },
  { key: 'config', label: 'Layout and configuration', icon: 'key' },
  { key: 'async', label: 'Asynchronous code', icon: 'clock' },
  { key: 'loop', label: 'The event loop', icon: 'loop' },
];

DATA.en.NODE_CONCEPTS = [
  /* ---- 1. The runtime ---------------------------------------------------------------- */
  { id: 'what-is-node', hub: 'runtime', topic: 'runtime', 
    title: 'What Node.js is: JavaScript outside the browser',
    summary: '**Node.js** is a **runtime**: a program that runs JavaScript outside the browser. It packages V8, the JavaScript engine of Chrome, with **platform APIs** for files, the network and processes. It has no page, so there is no `document` and no `window`.',
    body: [
      'Think of the JavaScript **engine** as a car engine and of the **runtime** as the vehicle built around it. Chrome puts the V8 engine in a browser: that vehicle comes with a page to draw on (`document`), a window, buttons and clicks. Node.js puts the **same V8 engine** in a vehicle designed for servers: no page, but it can read and write files, open network connections and start other programs. The language is identical; what changes is what your code can reach.',
      'So everything from the JavaScript section (variables, `if`, loops, functions, arrays, objects, `console.log`) works in Node unchanged. What Node lacks are the browser\'s page APIs: `document`, `window`, `alert`, `localStorage`, DOM events. In their place it has its own **modules** (`fs` for files, `http` for servers, `path`, `os`…) and a few globals: `process` (facts about the running program, such as `process.env` and `process.argv`) and `globalThis` (the global object, which the browser calls `window`). Timers such as `setTimeout`, `console` and `fetch` exist in both.',
      'Why JavaScript on the server? One language on both sides: the same person can write the page and the API, and data travels as JSON, which is JavaScript\'s own object notation. Node also suits the typical shape of a web server: thousands of small requests that spend most of their time **waiting** (for the database, the disk, another API). How it waits without stopping is the subject of the last two groups of this section.',
    ],
    table: {
      caption: 'Same language, two environments',
      head: ['', 'Browser', 'Node.js'],
      rows: [
        ['Engine', 'V8 (Chrome, Edge), SpiderMonkey (Firefox)…', 'V8'],
        ['What runs', 'Scripts loaded by a web page', 'Files you start with `node file.js`'],
        ['The page', '`document`, `window`, DOM events', 'None: `document is not defined`'],
        ['Global object', '`window` (also `globalThis`)', '`globalThis` (no `window`)'],
        ['Files and network', 'Only through the page (`fetch`, uploads); no access to your disk', '`fs` (files), `http` (servers), sockets, processes'],
        ['Program information', '`location`, `navigator`', '`process`: `process.env`, `process.argv`, `process.exit()`'],
        ['`console`, timers, `fetch`', 'Yes', 'Yes (`fetch` since Node 18)'],
      ],
    },
    example: 'Save `hello.js` with `console.log(\'Running on Node\', process.version);` and run `node hello.js`: the terminal prints something like `Running on Node v24.11.0`. Add `console.log(typeof document);` and Node prints `undefined`; add `document.title = \'x\';` and it stops with `ReferenceError: document is not defined`. The examples here target **Node 24 LTS**. An **LTS** (Long-Term Support) release gets fixes for about three years, which makes it the safe choice for anything you deploy; the newer "Current" release line is for trying new features.',
    mistake: 'Thinking Node is a new language or a framework. JavaScript is the language, Node is the **runtime** where it runs, and Express (see Routes and middleware) is a **framework** that runs on Node. A related slip: pasting browser code (`document.querySelector`, `alert`, `localStorage`) into a server file. A server has no page and no user sitting in front of it; it only receives requests and sends responses.' },

  { id: 'running-node', hub: 'runtime', topic: 'runtime', 
    title: 'Running code: node file.js, the REPL and --watch',
    summary: 'You run a file with `node file.js`, try single expressions in the **REPL** (type `node` on its own), and during development use `node --watch file.js`, which restarts the program every time you save.',
    body: [
      'The terminal is your new console. `node app.js` reads the file, runs it top to bottom, and then **keeps running as long as something is left to wait for** (a timer, an open server). A script that only logs ends at once and gives the prompt back; an Express server keeps running until you stop it with **Ctrl+C**. A running server is not frozen: it is waiting for requests.',
      'Typing `node` with no file opens the **REPL** (Read–Eval–Print Loop): you type an expression, Node evaluates it and prints the result, like the browser console. Use it to check a quick idea (`[1, 2, 3].map((n) => n * 2)`); leave with `.exit` or by pressing Ctrl+C twice.',
      'A running Node process does **not** notice when you edit its files: it keeps running the code it loaded at start-up. `node --watch src/server.js` (built into Node, stable since version 22) watches the file and everything it loads, and restarts on every save. It replaces the older `nodemon` package. Projects usually put it in an npm script, so `npm start` does it for you (see "package.json").',
    ],
    points: [
      '`node file.js`: run a file (`node file` works too: `.js` is assumed).',
      '`node`: the REPL; `.exit` to leave.',
      '`node --watch file.js`: restart on every save (development only).',
      '`process.argv`: the words typed on the command line, as strings; `process.argv[2]` is the first word after the file name.',
      '**Ctrl+C** stops the program running in that terminal.',
    ],
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
    example: 'Say a project\'s `npm start` runs `node --watch src/server.js`. You change the `/health` route to answer `{ status: \'ok\', time: Date.now() }` and save: the terminal shows that the process restarted, and the next `curl http://localhost:3000/health` already returns the new field. Started with plain `node`, the server would keep answering with the old code until you pressed Ctrl+C and started it again.',
    mistake: 'Editing the code, retrying the request and seeing no change, because the server was started with plain `node` and still runs the old version. Another one: starting the server again in a second terminal while the first is still running. The second fails with `Error: listen EADDRINUSE: address already in use :::3000`: port 3000 is taken. Stop the old process with Ctrl+C in its terminal, or start the new one on another port.' },

  { id: 'frameworks', hub: 'runtime', topic: 'runtime', 
    title: 'Why a framework, and why Express',
    summary: 'Node gives you the runtime and a low-level `http` module; a **web framework** adds the conventions a real API needs: **routing**, a **middleware** pipeline and a standard structure. The examples on this site use **Express**, the most widely used one and the model for the others.',
    body: [
      'Node\'s built-in `http` module is a plot of land with water and electricity: you **can** build a house on it, but every brick is yours to make. With plain `http`, one function receives every request and must itself read the URL, decide what to do for each method and path, parse the body, set the headers and handle errors. A **framework** is the kit house. It gives you **routing** (this method + this path → this function), **middleware** (functions every request passes through, such as a logger or a JSON body parser) and a standard shape. You still design the rooms.',
      'Express (2010) set the vocabulary: `app.get(path, handler)`, the `req` and `res` objects, `next()`. Fastify, Koa and NestJS reuse those ideas. Express is minimal and **unopinionated**: it imposes no folder structure and no database, so you learn every moving part yourself. That makes it a good first framework, and it is the worked example of the section Routes and middleware.',
      'Versions: many existing projects pin **Express 4** (`"express": "^4.22.3"`), and the examples here use it. Express 5 is now the default on npm; for a beginner the difference that matters most is how errors in `async` handlers are handled (see "Errors in async code").',
    ],
    table: {
      caption: 'Four Node frameworks you will hear about',
      head: ['Framework', 'Style', 'Typical use'],
      rows: [
        ['Express', 'Minimal, unopinionated, huge ecosystem of middleware', 'Small and medium APIs; the worked example on this site'],
        ['Fastify', 'Very fast; validates requests against schemas; plugins', 'APIs where performance matters'],
        ['Koa', 'Minimal; middleware written with `async`/`await`', 'Lightweight custom servers'],
        ['NestJS', 'Structured, TypeScript first, many built-in conventions', 'Large applications built by big teams'],
      ],
    },
    code: `// Plain Node: one function receives every request
const http = require('node:http');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});
server.listen(3000);

// The same route with Express:
// app.get('/health', (req, res) => res.json({ status: 'ok' }));`,
    example: 'Adding `GET /tasks/:id` to the plain `http` server means splitting `req.url` by hand, checking the method, converting the id to a number and repeating the `Content-Type` header in every answer. In Express it is one line, `app.get(\'/tasks/:id\', getTask)`, and `req.params.id` already holds the id. Multiply that by twenty routes and the framework saves days.',
    mistake: '"Express replaces Node." Express is a package that **runs inside** Node: it is installed with npm, loaded with `require(\'express\')`, and uses the `http` module underneath. Everything in this section (modules, npm, `process.env`, the event loop) applies to every Express app.' },

  /* ---- 2. Modules -------------------------------------------------------------------- */
  { id: 'commonjs', hub: 'modules', topic: 'modules', 
    title: 'Modules: require and module.exports',
    summary: 'In Node every file is a **module** with its own private scope. A file shares a value by assigning it to `module.exports`; another file receives that value with `require(\'./path\')`. This system is **CommonJS**, Node\'s original one and the one the server examples here use.',
    body: [
      'Think of each file as a closed shop. Whatever is declared inside (variables, functions) stays in the back room: other files cannot see it, even in the same folder. To share something, the file puts it on its **counter**, `module.exports`, and whoever calls `require` on that file gets exactly what is on the counter. That is how a twenty-file project avoids name clashes: two files can each have a variable called `router` without interfering.',
      'Two shapes cover almost every case. **Export one thing** (a function, the Express app): `module.exports = app;`, and the importer chooses the name: `const app = require(\'./app\');`. **Export several things** in an object: `module.exports = { listTasks, createTask };`, and the importer takes what it needs (the next card shows the `{ }` syntax for that).',
      'A module\'s code runs **once**, the first time it is required. Node then keeps (**caches**) its `module.exports` and hands the same value to every later `require` of that file. So a placeholder `tasks` array in a controller module is shared by every file that requires the controller: there is one array, not one copy per `require`.',
    ],
    points: [
      'Paths to your own files start with `./` (this folder) or `../` (the parent folder); the `.js` can be left out.',
      '`module.exports = value` replaces what the file exports; the last assignment wins.',
      '`exports` is a shortcut that starts as the same object: `exports.total = 1` works, but `exports = { total: 1 }` does **not** (it only re-points the shortcut).',
    ],
    code: `// src/utils/money.js
const VAT = 0.21;                         // private: not exported
function withVat(price) {
  return Math.round(price * (1 + VAT) * 100) / 100;
}
module.exports = withVat;                 // export ONE function

// src/report.js
const withVat = require('./utils/money'); // ./ = relative to THIS file
console.log(withVat(100));                // 121
console.log(typeof VAT);                  // 'undefined': VAT stayed private`,
    live: { kind: 'js', code: `// How Node runs each file (simplified): your code is wrapped in a
// function that receives "module" and "exports".
function runModule(code) {
  const module = { exports: {} };
  code(module, module.exports);
  return module.exports;          // what require() gives back
}

const good = runModule((module) => {
  module.exports = { greet: (name) => 'Hi ' + name };
});
console.log(good.greet('Ana'));   // Hi Ana

const bad = runModule((module, exports) => {
  exports = { greet: (name) => 'Hi ' + name }; // re-points the shortcut only
});
console.log(bad);                 // {}: nothing was exported` },
    example: 'A small Express API can be five files connected only by `require` and `module.exports`: `server.js` requires `./app`; `app.js` requires `express`, `./middleware/logger` and `./routes/tasks`; the router requires `../controllers/tasksController`. Follow the arrows and you have the whole app. The router lives in `src/routes/`, so to reach `src/controllers/` it first goes up one folder with `../`.',
    mistake: 'Forgetting the export. If `logger.js` defines the function but never assigns `module.exports`, `require(\'./middleware/logger\')` returns an empty object `{}`, and `app.use(logger)` throws `TypeError: app.use() requires a middleware function`. When a required value is `{}` or `undefined`, look at the **last lines** of the file you required.' },

  { id: 'module-resolution', hub: 'modules', topic: 'modules', 
    title: 'What require finds: built-in modules, packages and your files',
    summary: '`require` reads its argument in three ways: `node:fs` is a **built-in module** that comes with Node; a bare name such as `express` is a **package** looked up in `node_modules/`; and a path starting with `./` or `../` is **one of your own files**.',
    body: [
      'Read the string inside `require(…)` as an address. With the `node:` prefix it is a **built-in** module: `node:fs`, `node:path`, `node:http`, `node:os`. The prefix is optional (`require(\'fs\')` works too) but recommended, because it shows at a glance that this is part of Node and not an npm package. A **bare name** (`express`, `dotenv`, `pg`) is a **package**: Node looks for a folder of that name in `node_modules/`, first next to the file and then in each parent folder. Anything starting with `./`, `../` or `/` is a **path** to a file, relative to the file that contains the `require`.',
      'Built-ins never need installing; packages always do. If you forget `npm install express`, the first line of `app.js` fails with `Error: Cannot find module \'express\'`.',
      'When a module exports an object, you usually take just the parts you need with **object destructuring**: `const { listTasks, createTask } = require(\'../controllers/tasksController\');` is short for `const c = require(…); const listTasks = c.listTasks; const createTask = c.createTask;`. The names inside `{ }` must match the property names; a name that is not there gives `undefined`.',
    ],
    table: {
      caption: 'Three kinds of require',
      head: ['You write', 'Node loads', 'Install first?'],
      rows: [
        ['`require(\'node:fs\')`', 'The built-in file-system module', 'No: part of Node'],
        ['`require(\'express\')`', '`node_modules/express/` (searching up the folders)', 'Yes: `npm install express`'],
        ['`require(\'./app\')`', '`app.js` (or `app/index.js`) in the same folder as this file', 'No: it is your file'],
        ['`require(\'../controllers/tasksController\')`', 'Up one folder, then `controllers/tasksController.js`', 'No'],
      ],
    },
    live: { kind: 'js', code: `// What a controller module exports: an object with two functions
const tasksController = {
  listTasks() { return 'listing tasks'; },
  createTask() { return 'creating a task'; },
};

// Destructuring takes properties out by name
const { listTasks, createTask } = tasksController;
console.log(listTasks());    // listing tasks
console.log(createTask());   // creating a task

// A name that is not a property gives undefined
const { deleteTask } = tasksController;
console.log(deleteTask);     // undefined` },
    example: 'A typical router file starts with `const express = require("express");` (a package from `node_modules`) and `const { listTasks, createTask } = require("../controllers/tasksController");` (your own file, one folder up). If you later add `deleteTask` to that destructuring but forget it in the controller\'s `module.exports = { … }`, the variable is `undefined` and `router.delete(\'/:id\', deleteTask)` throws at start-up: `Route.delete() requires a callback function but got a [object Undefined]`.',
    mistake: 'Writing `require(\'app\')` for your own `app.js`. Without `./`, Node treats `app` as a **package** name, searches `node_modules`, and fails with `Cannot find module \'app\'`, even though `app.js` is right next to the file. Paths to your own files always start with `./` or `../`.' },

  { id: 'es-modules', hub: 'modules', topic: 'modules', 
    title: 'ES modules: import, export and "type": "module"',
    summary: '**ES modules** (ESM) are the module syntax built into the JavaScript language, `import` and `export`; browsers use them and so do front-end tools such as Vite and React. Node supports both systems: a file is read as ESM when it ends in `.mjs` or when `package.json` says `"type": "module"`.',
    body: [
      'CommonJS (`require`) was Node\'s own invention in 2009, when JavaScript had no modules. In 2015 the language standardised its own: `export` marks what a file shares and `import` takes it. The idea is the same (a private file with a counter); the syntax and a few rules differ. You will write ESM in front-end projects, because Vite and React use it, and many newer packages are written in it.',
      'How Node decides: `.cjs` files are always CommonJS, `.mjs` files are always ESM, and `.js` files follow the `"type"` field of the nearest `package.json`: `"commonjs"` (what `npm init -y` writes in current npm versions) or `"module"`. With no `"type"` at all, current Node versions guess: a `.js` file that contains `import` or `export` is re-run as ESM, with a warning. The server examples here are CommonJS; whichever you use, **do not mix the two styles in one file**.',
      'Differences that bite in ESM: relative imports need the **full file name** (`import app from \'./app.js\'`); `require`, `module.exports`, `__dirname` and `__filename` do not exist (use `import.meta.dirname` for the folder); and `await` is allowed at the top level of the file.',
    ],
    table: {
      caption: 'The same module in both systems',
      head: ['', 'CommonJS (server examples here)', 'ES modules (browsers, Vite, React)'],
      rows: [
        ['Export one thing', '`module.exports = app;`', '`export default app;`'],
        ['Export several', '`module.exports = { a, b };`', '`export function a() {}` or `export { a, b };`'],
        ['Import one thing', '`const app = require(\'./app\');`', '`import app from \'./app.js\';`'],
        ['Import some', '`const { a } = require(\'./lib\');`', '`import { a } from \'./lib.js\';`'],
        ['Chosen by', '`.cjs`, or `.js` with `"type": "commonjs"`', '`.mjs`, or `.js` with `"type": "module"`'],
        ['Top-level `await`', 'No', 'Yes'],
      ],
    },
    example: 'You paste `import express from \'express\';` from a tutorial into an `app.js` whose other lines use `require`. With `"type": "commonjs"` in `package.json` (as `npm init -y` writes it), Node stops with `SyntaxError: Cannot use import statement outside a module`. With no `"type"` (as in many older projects\' `package.json`), Node re-runs the file as an ES module and fails on the next line instead: `ReferenceError: require is not defined in ES module scope`. Either way the fix is the same: write the line in the project\'s style, `const express = require(\'express\');`.',
    mistake: 'Adding `"type": "module"` to `package.json` to make one copied `import` line work. Every `.js` file of the project is then read as ESM, so every `require` and `module.exports` breaks at once. Pick one system per project; the server examples on this site use CommonJS.' },

  /* ---- 3. npm and package.json --------------------------------------------------------- */
  { id: 'package-json', hub: 'npm', topic: 'npm', 
    title: 'package.json: the project\'s manifest',
    summary: '`package.json` describes a Node project: its name and version, the packages it depends on, and the **scripts** you run with `npm`. You create it with `npm init -y`, and it is always committed.',
    body: [
      'Think of `package.json` as the recipe card taped to a box of ingredients. Whoever clones your repository reads it to know which ingredients to fetch (the dependencies) and how to cook (the scripts: how to start, develop or test the app). Your code is the box; `package.json` is what lets someone else reproduce it.',
      '`npm init -y` writes a first version of the file with the default answers (`-y` means "yes to every question"). `npm install <package>` then adds entries to it. You can also edit it by hand, but it must stay **valid JSON**: double quotes around every key and string, no comments, no comma after the last item. One stray comma makes every `npm` command fail.',
      '**Scripts** are named shortcuts for terminal commands. `npm start` and `npm test` run the `start` and `test` scripts; any other name needs `run`, as in `npm run dev`. While a script runs, npm adds `node_modules/.bin` to the search path, so a script can call the command-line tools of installed packages directly (`"test": "jest"`).',
    ],
    table: {
      caption: 'The fields you will meet',
      head: ['Field', 'What it says', 'Example'],
      rows: [
        ['`name`, `version`', 'The project\'s identity', '`"tasks-api"`, `"1.0.0"`'],
        ['`private`', '`true`: npm refuses to publish it to the public registry by accident', '`true`'],
        ['`type`', 'How `.js` files are read: CommonJS or ES modules', '`"commonjs"`'],
        ['`main`', 'The entry file', '`"src/server.js"`'],
        ['`scripts`', 'Commands for `npm start`, `npm test`, `npm run <name>`', '`"dev": "node --watch src/server.js"`'],
        ['`dependencies`', 'Packages the app needs to **run**', '`"express": "^4.22.3"`'],
        ['`devDependencies`', 'Packages needed only to **develop and test**', '`"jest": "^29.7.0"`'],
      ],
    },
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
    example: 'Some projects have a single script, `"start": "node --watch src/server.js"`, so `npm start` both starts the server and restarts it on every save. The more common split: `start` runs plain `node src/server.js` (what a production server runs) and `dev` adds `--watch` for development (`npm run dev`). Both work; what matters is that a teammate finds in one place how to start your project.',
    mistake: 'Typing `npm dev` instead of `npm run dev`. Only a few names (`start`, `test`, `stop`, `restart`) work without `run`; for any other, npm answers `Unknown command: "dev"`. Another classic: adding a comment such as `// my scripts` inside `package.json`. JSON has no comments, so npm stops with a parse error.' },

  { id: 'dependencies', hub: 'npm', topic: 'npm', 
    title: 'Installing packages: dependencies, devDependencies and node_modules',
    summary: '`npm install express` downloads a package into the `node_modules/` folder and records it in `package.json`: under **`dependencies`** if the app needs it to run, or under **`devDependencies`** (`npm install --save-dev jest`) if it is only for developing and testing.',
    body: [
      'A **package** is code someone else published (Express, a database driver, a test runner) that you reuse instead of writing it yourself. **npm** (Node Package Manager) comes with Node: it downloads packages from the public registry at npmjs.com into a folder called `node_modules/` inside your project, which is where `require(\'express\')` looks for them.',
      'Packages depend on other packages, which depend on others: installing Express alone puts about seventy packages into `node_modules`. These are **transitive dependencies**; you never list them, npm works them out. That is why `node_modules` is large, and why it is **never committed**: anyone can rebuild it from `package.json` and `package-lock.json` with one command.',
      'The two lists matter when the app is deployed. A production server installs only `dependencies` (`npm ci --omit=dev`), so anything the running app `require`s must be there. Test runners and other development helpers (`jest`, `supertest`) go in `devDependencies`, so they do not weigh down the server.',
    ],
    table: {
      caption: 'The npm commands you will use most',
      head: ['Command', 'What it does'],
      rows: [
        ['`npm install`', 'Installs everything listed in `package.json` (both lists) into `node_modules/`'],
        ['`npm install express@4`', 'Adds Express 4 to `dependencies` and installs it (`@4` picks the major version)'],
        ['`npm install --save-dev jest`', 'Adds `jest` to `devDependencies` (short form: `npm i -D jest`)'],
        ['`npm uninstall express`', 'Removes it from `node_modules/` and from `package.json`'],
        ['`npm ci`', 'Clean install that follows `package-lock.json` exactly (see "package-lock.json")'],
        ['`npm ls`', 'Shows which packages are installed'],
      ],
    },
    example: 'Setting up a new Express 4 API: `npm init -y`, then `npm install express@4`. Three things appear: an `"express": "^4.x.x"` line under `dependencies`, a `package-lock.json` file, and a `node_modules/` folder with Express and its own dependencies. The `@4` matters: this project wants Express 4, but a plain `npm install express` today installs **Express 5**, the current major version. Later, for automated tests (see Designing APIs), `npm install --save-dev jest supertest` adds two `devDependencies`.',
    mistake: 'Committing `node_modules` to GitHub: thousands of files of other people\'s code, some built specifically for **your** operating system and broken on a teammate\'s. Create a `.gitignore` containing `node_modules/` **before** the first commit. If it is already committed, `git rm -r --cached node_modules` removes it from the repository while keeping it on your disk.' },

  { id: 'semver', hub: 'npm', topic: 'npm', 
    title: 'Version numbers and ranges: what ^4.19.0 means',
    summary: 'Packages use **semantic versioning**: `MAJOR.MINOR.PATCH`. A **caret range** such as `^4.19.0` accepts any later `4.x.y` version but never `5.0.0`; a **tilde range** `~4.19.0` accepts only `4.19.x`.',
    body: [
      'The three numbers are a promise from the package author. **PATCH** (4.19.**1**): bug fixes only. **MINOR** (4.**20**.0): new features, nothing removed, so existing code keeps working. **MAJOR** (**5**.0.0): something changed in a way that **can break** your code. A range in `package.json` tells npm how much change you accept without being asked.',
      'The caret `^` is what `npm install` writes by default. It means "compatible with": the same major version, at least this one. So `"express": "^4.19.0"` accepts 4.19.2, 4.21.0 and 4.22.3, but not 5.0.0. The tilde `~` is stricter (patches only), and a bare number (`"4.19.0"`) means exactly that version. Versions below 1.0 are special: `^0.4.2` accepts only `0.4.x`, because before 1.0 any minor release may break things.',
    ],
    table: {
      caption: 'What each range lets npm install',
      head: ['Range', 'Accepts', 'Rejects'],
      rows: [
        ['`^4.19.0`', '`4.19.0` up to the newest `4.x.y`', '`4.18.2`, `5.0.0`'],
        ['`~4.19.0`', '`4.19.0` up to the newest `4.19.x`', '`4.20.0`'],
        ['`4.19.0`', 'only `4.19.0`', 'everything else'],
        ['`^0.4.2`', '`0.4.2` up to the newest `0.4.x`', '`0.5.0`'],
        ['`*`', 'any version at all', 'nothing: avoid it'],
      ],
    },
    live: { kind: 'js', code: `// A simplified version of npm's caret rule, for versions >= 1.0.0
function caretAccepts(range, version) {
  const r = range.replace('^', '').split('.').map(Number);
  const v = version.split('.').map(Number);
  if (v[0] !== r[0]) return false;      // another MAJOR may break your code
  if (v[1] !== r[1]) return v[1] > r[1]; // a newer MINOR is fine
  return v[2] >= r[2];                  // same MINOR: PATCH must not be older
}

console.log(caretAccepts('^4.19.0', '4.22.3')); // true
console.log(caretAccepts('^4.19.0', '4.18.9')); // false: older
console.log(caretAccepts('^4.19.0', '5.0.0'));  // false: new major` },
    example: 'A project\'s `package.json` once said `"express": "^4.19.2"` and now says `"^4.22.3"`. A developer who installed with the first range in September and a teammate who installs today can get different 4.x versions, both allowed by the caret. That is compatible, but not identical, which is exactly the problem the **lockfile** solves: it records the precise version that was installed, so everyone gets the same one (next card).',
    mistake: 'Reading `^4.19.0` as "version 4.19.0". It means "4.19.0 **or any newer 4.x**". The opposite mistake is changing the major by hand (`"^5.0.0"`) "to update". A new major version may change behaviour your code relies on, so read the package\'s migration guide first.' },

  { id: 'lockfile', hub: 'npm', topic: 'npm', 
    title: 'package-lock.json, npm ci and what to commit',
    summary: '`package-lock.json` records the **exact** version of every installed package, transitive ones included, so every machine installs the same set. Commit it together with `package.json`, and use `npm ci` to install exactly what it lists.',
    body: [
      '`package.json` says what you **accept** (`^4.19.0`); `package-lock.json` says what you **got** (`4.22.3`, plus the exact version and checksum of each of Express\'s own dependencies). It is a shopping list ("milk, any brand") versus the receipt (brand, size, price): to stock an identical fridge you need the receipt.',
      '`npm install` reads both files, installs, and **may update** the lockfile (for example when you add a package or change a range). `npm ci` ("clean install") deletes `node_modules`, installs **exactly** what the lockfile says, never changes it, and stops with an error if the lockfile and `package.json` disagree. Use `npm install` while developing; use `npm ci` on servers and in **CI** (continuous integration: the service that builds and tests every push automatically), or whenever you want an exact copy of a teammate\'s setup.',
      'Never edit `package-lock.json` by hand: it is generated. If it has a merge conflict, resolve `package.json` first and then run `npm install` to regenerate it.',
    ],
    table: {
      caption: 'What goes into the repository',
      head: ['File or folder', 'Commit it?', 'Why'],
      rows: [
        ['`package.json`', 'Yes', 'You write it: dependencies and scripts'],
        ['`package-lock.json`', 'Yes', 'Generated, but it pins the exact versions everyone must get'],
        ['`node_modules/`', '**No**: list it in `.gitignore`', 'Rebuilt by `npm ci` or `npm install`; huge and partly OS-specific'],
        ['`.env`', '**No**: list it in `.gitignore`', 'Holds secrets (see ".env files")'],
        ['`.env.example`', 'Yes', 'Shows which variables are needed, with placeholder values'],
      ],
    },
    code: `# .gitignore for a Node project
node_modules/
.env
npm-debug.log*
.DS_Store`,
    example: 'Your teammate clones the repo, runs `npm install`, and their server behaves differently from yours. The likely cause: `package-lock.json` was never committed, so their install resolved every `^` range again and picked newer versions. With the lockfile in the repository, `npm ci` on their machine installs the very same version of every package you have.',
    mistake: 'Deleting `package-lock.json` "to fix" an installation problem and committing the new one. That silently upgrades every transitive dependency at once. Delete `node_modules/` instead (it is disposable) and run `npm ci`; regenerate the lockfile only on purpose.' },

  /* ---- 4. Layout and configuration ---------------------------------------------------------- */
  { id: 'project-layout', hub: 'config', topic: 'config', 
    title: 'A Node/Express project layout',
    summary: 'A course project keeps its code in `src/`, one folder per job: `routes/` (URL → function), `controllers/` (what each request does), `models/` (database access), `middleware/` (steps shared by many requests) and `config/` (settings). `app.js` builds the app; `server.js` starts it.',
    body: [
      'Organise the code like a restaurant. The **routes** are the menu: which dish (method and URL) goes to which cook. The **controllers** are the cooks: they read the order (`req`), do the work and send the plate (`res`). The **models** are the pantry staff who fetch ingredients from the storeroom (the database). **Middleware** is what happens to every order on its way in: someone checks the reservation (authentication), someone writes it in the log book (logging). **Config** is the noticeboard with today\'s settings. When something breaks, you know which room to walk into.',
      'The split between `app.js` and `server.js` looks odd at first. `app.js` **builds** the Express app (middleware, routes, error handler) and exports it; `server.js` requires it and calls `app.listen(PORT)`, nothing else. Automated tests (with the supertest package, see Designing APIs) import `app.js` and send it fake requests **without opening a real port**.',
      'The layout grows with the project: a first API has `app.js`, `server.js`, `middleware/`, `routes/` and `controllers/`; connecting a database adds `models/`; authentication adds its own middleware and validators. Files that are not code (`package.json`, `.gitignore`, `.env.example`, `README.md`) stay at the root.',
    ],
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
└── tests/                # automated tests (supertest)`,
    dialect: 'Folder tree',
    example: 'Follow `GET /tasks` through this layout: `server.js` started the app → `app.js` passed the request through `express.json()` and the logger middleware → `app.use(\'/tasks\', tasksRouter)` handed it to `routes/tasks.js` → the router matched `GET /` and called `listTasks` from `controllers/tasksController.js` → the controller answered with `res.json(…)`. Five files, one small job each.',
    mistake: 'Calling `app.listen()` inside `app.js` "because it is shorter". It works until the first test file requires the app: every test run then opens a real port, and a second test file fails with `EADDRINUSE`. Keep the rule strict: `app.js` exports, `server.js` listens.' },

  { id: 'env-vars', hub: 'config', topic: 'config', 
    title: 'Environment variables and process.env',
    summary: 'An **environment variable** is a named setting that the system starting a program hands to it, outside the code. Node exposes them in `process.env`, an object whose values are **always strings**, or `undefined` for a variable that was never set.',
    body: [
      'The same code runs in several places: your laptop, a teammate\'s, a test server, production. Some settings must differ between them: the port, the database address, secret keys. Writing them into the code means editing it for every place, and publishing your secrets along with it. Instead, the program **reads its settings from the environment** when it starts, like an actor who checks tonight\'s cast list pinned at the stage door instead of having names printed in the script.',
      'Every running program has an environment: a list of `NAME=value` pairs. In Node, `process.env.PORT` reads the variable `PORT`. Two rules follow. Values are **text**, so convert numbers with `Number(…)` and compare flags as strings (`process.env.DEBUG === \'true\'`). A variable that was never set is `undefined`, so provide a default: `const PORT = process.env.PORT || 3000;`, as a typical `server.js` does. Hosting platforms set `PORT` for you; on your laptop the default applies.',
      'To set a variable for one run, the syntax depends on the terminal. Git Bash, macOS and Linux: `PORT=4000 npm start`. PowerShell: `$env:PORT = 4000; npm start` (it then stays set until you close that window). The next card shows how a `.env` file saves you the typing.',
    ],
    live: { kind: 'js', code: `// In Node this object would be process.env; here we fake it.
const env = { PORT: '4000', DEBUG: 'false' };

const port = env.PORT || 3000;
console.log(port, typeof port);             // 4000 string

const portNumber = Number(env.PORT) || 3000;
console.log(portNumber, typeof portNumber); // 4000 number

if (env.DEBUG) console.log('debug is on?!'); // runs: 'false' is a non-empty string
console.log(env.DEBUG === 'true');           // false: compare the text

console.log(env.DATABASE_URL);              // undefined: never set` },
    example: 'Port 3000 is already used on your teammate\'s laptop. Instead of editing `server.js` (and fighting over it in every merge), they start the API with `PORT=4000 npm start` in Git Bash, or `$env:PORT = 4000; npm start` in PowerShell. `process.env.PORT` is `\'4000\'`, the server listens on 4000, and the code in Git never changed.',
    mistake: 'Testing a flag with `if (process.env.DEBUG)` when it is set to `false`. The value is the **string** `\'false\'`, which is truthy (every non-empty string is), so debug mode switches on. Compare explicitly: `process.env.DEBUG === \'true\'`. The same trap with numbers: `process.env.PORT + 1` is `\'40001\'`, not `4001`.' },

  { id: 'dotenv-secrets', hub: 'config', topic: 'config', 
    title: '.env files, config and keeping secrets out of Git',
    summary: 'A **`.env`** file lists a project\'s environment variables (`NAME=value`, one per line) so you do not type them every time. Because it holds secrets it is **git-ignored**; the repository gets a **`.env.example`** with the same names and placeholder values, and one `config` module reads every variable.',
    body: [
      'A **secret** is any value that grants access: a database password, the key that signs login tokens (JWT, see Authentication and security), an API key for a paid service. Whoever reads it can act as your application. Once a secret is pushed to GitHub, treat it as **public forever**: bots scan new commits for keys within minutes, and deleting the file in a later commit does not remove it from the history. The only real fix is to change (**rotate**) the secret.',
      'So the real values live in `.env`, listed in `.gitignore`, while `.env.example` (same keys, fake values) is committed so a teammate knows what to fill in. Loading `.env` into `process.env` is one step at the very start of the program, before anything reads the variables: either the `dotenv` package (`npm install dotenv`, then `require(\'dotenv\').config();`) or Node\'s built-in option `node --env-file=.env src/server.js` (Node 20.6 or later, no package needed). With both, a variable already set in the real environment (for example by a hosting platform) wins over the file.',
      'Read the variables in **one place**: a `config` module that converts types, supplies defaults and **fails fast**. If a required variable is missing, it throws as soon as the app starts, with a clear message, instead of crashing later on the first request that happens to need it. Controllers `require` the config and never touch `process.env` themselves.',
    ],
    code: `// .env (git-ignored)          // .env.example (committed)
// PORT=3000                    // PORT=3000
// DATABASE_URL=postgres://ana:s3cret@localhost:5432/tasks
//                              // DATABASE_URL=postgres://user:password@localhost:5432/tasks
// JWT_SECRET=k8Jq2v…           // JWT_SECRET=change-me

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
require('dotenv').config();        // or start with: node --env-file=.env src/server.js
const config = require('./config');
const app = require('./app');
app.listen(config.port, () => console.log(\`Listening on http://localhost:\${config.port}\`));`,
    example: 'A new teammate clones the repo, runs `npm ci` and `npm start`, and immediately gets `Error: Missing environment variable DATABASE_URL (see .env.example)`. They copy the example file (`cp .env.example .env` in Git Bash, `Copy-Item .env.example .env` in PowerShell), fill in their own database password and start again. Without fail-fast, the server would have started "fine" and crashed on the first request that touched the database, far from the real cause.',
    mistake: 'Loading `.env` too late. If `server.js` requires `./config` (or `./app`, which requires the config) **before** `require(\'dotenv\').config()`, the config module runs first, finds no variables, and throws "missing variable" although the value is right there in `.env`. Load `.env` on the first line of the entry file, or use `--env-file`. And never "fix" a missing variable by pasting the real secret into the code as a default.' },

  /* ---- 5. Asynchronous code ------------------------------------------------------------- */
  { id: 'why-async', hub: 'async', topic: 'async', 
    title: 'Blocking and non-blocking: why Node code is asynchronous',
    summary: 'A **synchronous** (blocking) call makes the program wait until it has finished. An **asynchronous** (non-blocking) call starts the work, returns at once, and runs a function you supply **later**, when the result is ready. Node uses asynchronous calls for everything slow (disk, network, database), so one thread can serve many requests.',
    body: [
      'Picture a café with one waiter. A **blocking** waiter takes your order, walks to the kitchen and stands there until the dish is ready, while every other table waits. A **non-blocking** waiter passes the order to the kitchen, serves other tables, and comes back when the kitchen rings the bell. Your JavaScript in Node runs on **one thread**, a single waiter: if it blocked on every database query, the server would handle one request at a time. So slow work is handed to the system (the kitchen), and your code says what to do once it is finished.',
      'The simplest asynchronous function is one browsers have too: `setTimeout(fn, ms)` asks the runtime to call `fn` after at least `ms` milliseconds and **returns immediately**, so the lines after it run first. Node\'s file, network and database functions behave the same way: `fs.readFile(path, callback)` starts reading and returns; the callback runs once the data has arrived. **I/O** (input/output) is the general name for this kind of work: reading and writing files, network traffic, database queries.',
      'Some Node functions also come in a synchronous version whose name ends in `Sync`, such as `fs.readFileSync`. They are fine in a one-off script, or at start-up before the server listens. Inside a request handler they are a mistake: while one request waits for the disk, every other request waits too. Who decides when "later" happens is the **event loop** (last group of this section).',
    ],
    code: `const fs = require('node:fs');

// Blocking: the next line waits until the whole file has been read
const text = fs.readFileSync('notes.txt', 'utf8');
console.log('1. read', text.length, 'characters');

// Non-blocking: start reading, hand over a callback, carry on
fs.readFile('notes.txt', 'utf8', (err, data) => {
  console.log('3. the callback runs when the file has arrived');
});
console.log('2. this line runs before the file arrives');`,
    example: 'Two users call your API at the same moment. Handler A runs a database query that takes 80 ms; handler B just answers `{ status: \'ok\' }`. With an asynchronous query, Node starts A\'s query, answers B at once, and finishes A when the database replies: B waits 0 ms. With a blocking query, B would wait the full 80 ms behind A, and with 100 users the last one would wait 8 seconds.',
    mistake: 'Expecting an asynchronous result on the next line: `let data; fs.readFile(\'notes.txt\', \'utf8\', (err, d) => { data = d; }); console.log(data);` prints `undefined`, because the `console.log` runs **before** the callback does. Use the value **inside** the callback, or, better, with `await` (two cards ahead).',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Watch setTimeout wait its turn in the event-loop visualiser' } },

  { id: 'callbacks', hub: 'async', topic: 'async', 
    title: 'Callbacks and the error-first convention',
    summary: 'The original Node style: you pass a **callback** as the last argument, and Node calls it with `(err, result)` when the work is done. `err` is `null` on success and an `Error` object on failure, so every callback starts by checking it.',
    body: [
      'A callback is a function you hand over so that someone else calls it later; you have already met them with `map` and `addEventListener`. For slow work, the callback is how the result comes back: "read this file and, when you are done, **call me back** with what you found". Because the work can fail (the file does not exist, the disk is full), Node agreed on one shape for every such callback: the **first** parameter is the error and the second is the result. This is the **error-first** convention.',
      'Callbacks get hard to read when one slow step depends on another: read a config file, then use it to read a data file, then write a copy. Each step sits **inside** the callback of the previous one, the code drifts to the right, and every level repeats its own `if (err)`. This shape is nicknamed **callback hell**, and promises (next card) were invented to flatten it.',
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
  callback(null, a / b);                         // success: null, then the result
}

divide(10, 2, (err, result) => {
  if (err) return console.log('Error:', err.message);
  console.log('Result:', result);                // Result: 5
});

divide(1, 0, (err, result) => {
  if (err) return console.log('Error:', err.message); // Error: Cannot divide by zero
  console.log('Result:', result);
});` },
    example: '`fs.readFile(\'missing.txt\', \'utf8\', (err, data) => { … })`: the file does not exist, so Node calls the callback with an `Error` whose `code` is `\'ENOENT\'` ("no such file or directory"), and `data` is `undefined`. The line `if (err) return console.error(err);` reports it and stops; without it, the next line would use the missing `data` and crash.',
    mistake: 'Leaving out the `return` in `if (err) callback(err);`. The function reports the error **and then carries on** with the success path, so the callback is called twice or works with a result that does not exist. Write `if (err) return callback(err);`. Also: `try { fs.readFile(…, cb); } catch (e) { … }` does not catch the file error, because the error happens later, after the `try` block has already finished. Callback errors arrive in `err`.' },

  { id: 'promises', hub: 'async', topic: 'async', 
    title: 'Promises: a value that arrives later',
    summary: 'A **promise** is an object that stands for a result that is not ready yet. It starts **pending** and settles once: **fulfilled** with a value or **rejected** with an error. `.then(fn)` runs `fn` with the value, `.catch(fn)` with the error, and the calls chain instead of nesting.',
    body: [
      'A promise is like the buzzer a burger bar gives you: you do not have the food yet, but you hold something that **will** tell you when it is ready, or that the kitchen ran out. You can walk away and do other things; the buzzer goes off once, and only once. In code, a function that starts slow work returns a promise straight away, and you attach what should happen next.',
      'Three states: **pending** (still working), **fulfilled** (it worked: there is a value) and **rejected** (it failed: there is an error). A settled promise never changes again. `.then(onFulfilled)` registers a function for the value, `.catch(onRejected)` one for the error, and `.finally(fn)` one for both (clean-up). Each of them **returns a new promise**, so you can chain them: what one `.then` callback returns is passed to the next, a returned promise is waited for, and one `.catch` at the end handles a failure in any step.',
      'Most modern APIs return promises: `require(\'node:fs/promises\')`, database drivers such as `pg` and `mongodb`, and `fetch`. You can also wrap callback code yourself with `new Promise((resolve, reject) => { … })`: call `resolve(value)` when the work succeeds and `reject(error)` when it fails.',
    ],
    code: `const fs = require('node:fs/promises');

// The three dependent steps of the callback card, flat
fs.readFile('config.json', 'utf8')
  .then((text) => JSON.parse(text))                       // a value → passed on
  .then((config) => fs.readFile(config.dataFile, 'utf8')) // a promise → waited for
  .then((data) => fs.writeFile('copy.txt', data))
  .then(() => console.log('done'))
  .catch((err) => console.error('Something failed:', err.message)); // any step

// Making your own promise: wait ms milliseconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
sleep(500).then(() => console.log('half a second later'));`,
    example: '`fetch(\'http://localhost:3000/tasks/1\')` returns a pending promise at once. `.then((res) => res.json())` runs when the response arrives and returns another promise (reading the JSON body); the next `.then((task) => console.log(task.title))` receives the parsed object. If the server is not running, the first promise is **rejected**: none of the `.then` callbacks run, and the `.catch` at the end prints the error.',
    mistake: 'Starting more async work inside a `.then` without returning it: `.then((config) => { fs.readFile(config.dataFile, \'utf8\'); })`. With braces and no `return`, the callback returns `undefined`, so the next `.then` runs immediately instead of waiting for the file, and a failure of that read escapes the final `.catch`. Write `return fs.readFile(…)`, or use the short arrow form without braces.',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'See where .then callbacks wait in the event-loop visualiser' } },

  { id: 'async-await', hub: 'async', topic: 'async', 
    title: 'async and await',
    summary: 'An `async function` always returns a promise. Inside it, `await promise` **pauses that function** until the promise settles, then gives back its value (or throws its error). The code reads top to bottom like synchronous code, yet the thread is never blocked.',
    body: [
      '`await` is a bookmark. When `copyData` reaches `await fs.readFile(…)`, it places a bookmark on that line and steps aside; Node is free to run other code, such as other requests. When the promise is fulfilled, the function picks up exactly at the bookmark, with the value. Only **this function** waits; the program does not.',
      'Rules: `await` only works inside an `async` function (or at the top level of an ES module). An `async` function **always returns a promise**, even when it says `return 5` (the caller gets a promise fulfilled with 5), so its caller must `await` it too, or use `.then`. That is why `async` spreads upwards: an Express handler that awaits the database must itself be `async`.',
      'Under the hood it is the same machinery as `.then`: when the awaited promise settles, the rest of the function is queued as a **microtask** (see "The event loop"). As a consequence, an `async` function runs **synchronously up to its first `await`**, and only then returns to its caller.',
    ],
    code: `const fs = require('node:fs/promises');

async function copyData() {
  const text = await fs.readFile('config.json', 'utf8'); // pauses here; the thread stays free
  const config = JSON.parse(text);
  const data = await fs.readFile(config.dataFile, 'utf8');
  await fs.writeFile('copy.txt', data);
  return data.length;                                    // fulfils the returned promise
}

copyData().then((n) => console.log(\`copied \${n} characters\`));
console.log('this prints first: copyData() returned a pending promise');`,
    example: 'The `fetch` from the promises card, with `await`: `async function showTask() { const res = await fetch(\'http://localhost:3000/tasks/1\'); const task = await res.json(); console.log(task.title); }`. One `await` per promise, in the order they are needed. An Express handler has the same shape: `app.get(\'/tasks\', async (req, res, next) => { … await … })`.',
    mistake: 'Forgetting `await`: `const task = db.findTask(id); console.log(task.title);` prints `undefined`, because `task` is a **promise**, not the task, and a promise has no `title`. In a route, `res.json(db.findAll())` sends `{}`, the JSON of a promise object. When a value prints as `Promise { <pending> }` or arrives as `{}`, look for the missing `await`.',
    live: { kind: 'js', code: `// The same shape as copyData, with a fake slow read instead of the file system
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readSlowly(name) {
  await sleep(200);                       // pretend this is a disk read
  return \`contents of \${name}\`;
}

async function copyData() {
  console.log('copyData starts');
  const text = await readSlowly('config.json');   // pauses only copyData
  console.log('got:', text);
  return text.length;
}

copyData().then((n) => console.log('copied', n, 'characters'));
console.log('this prints second: copyData() returned a pending promise');` },
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Step through two async functions in the visualiser' } },

  { id: 'async-errors', hub: 'async', topic: 'async', 
    title: 'Errors in async code: try/catch every await',
    summary: 'When an awaited promise is rejected, `await` **throws** the error on that line, so you catch it with an ordinary `try { … } catch (err) { … }`. In an Express 4 route the `catch` must pass the error on with `next(err)`: an error nobody catches stops the whole server.',
    body: [
      '`try`/`catch` is a safety net. The risky lines go inside `try { }`; if one of them throws, JavaScript jumps straight to `catch (err) { }` with the error object, skipping the rest of the `try`. If nothing throws, the `catch` never runs. With `await`, a **rejected** promise becomes a thrown error on the `await` line, so the same net works for asynchronous code.',
      'And when nobody catches it? The `async` function\'s own promise is rejected; if no code handles that rejection, Node treats it as fatal: since Node 15 an **unhandled rejection** prints the error and **ends the process**. For a server, that disconnects every user, not just the one whose request failed. Express 4 ignores the promise an `async` handler returns, so it cannot catch the error for you: wrap the body in `try`/`catch` and call `next(err)`, which hands the error to your error-handling middleware (see Routes and middleware), and that answers with a `500` and a JSON message.',
      '**Express 5** does watch the returned promise and forwards a rejection to the error middleware by itself. With Express 4, still the version of many projects, write the `try`/`catch` (or a small wrapper such as `asyncHandler(fn)` later). The habit is useful with Express 5 too, whenever you want to answer a particular error differently, for example `404` for a task that does not exist.',
    ],
    code: `// Express 4: an error here ends the whole server (unhandled rejection)
app.get('/tasks', async (req, res) => {
  const rows = await db.tasks.findAll();    // rejects if the database is down
  res.json(rows);
});

// Safe pattern: catch, and forward to the error-handling middleware
app.get('/tasks', async (req, res, next) => {
  try {
    const rows = await db.tasks.findAll();
    res.json(rows);
  } catch (err) {
    next(err);                               // → app.use((err, req, res, next) => { … })
  }
});`,
    example: 'The database is restarting when a user calls `GET /tasks`. With the first handler, the terminal prints `Error: connect ECONNREFUSED` with a stack trace and the Node process **exits**: that request never gets an answer, and every other request fails until someone restarts the server (`--watch` restarts on a file change, not after a crash). With the second handler, `next(err)` reaches the error middleware, this one user gets a `500` with `{ "error": "…" }`, and the server keeps serving everyone else.',
    mistake: '"The error middleware will catch it anyway." In Express 4 it only receives errors **thrown synchronously** in a handler or passed with `next(err)`; a throw after an `await` happens later, out of Express\'s reach. A second trap: `try { saveTask(task); } catch (err) { … }` **without** `await`. The call returns a promise immediately, the `try` block ends, and the rejection arrives after the net has been taken down. The `await` must be **inside** the `try`.' },

  { id: 'promise-all', hub: 'async', topic: 'async', 
    title: 'Independent work in parallel: Promise.all',
    summary: 'Awaiting slow operations one after another runs them **in sequence** and adds up their times. When they do not depend on each other, start them all and wait once: `await Promise.all([a(), b()])` takes roughly as long as the slowest one.',
    body: [
      'You do not wait for the pizza to arrive before ordering the salad from another shop. `Promise.all([p1, p2, p3])` takes an array of promises and returns **one** promise, fulfilled with an **array of their values in the same order** once all of them are fulfilled. Calling the functions is what starts the work; `Promise.all` only waits for it. The line `const [user, tasks] = await Promise.all(…)` uses **array destructuring**: the first element goes into `user`, the second into `tasks`.',
      'If **any** of the promises is rejected, `Promise.all` rejects at once with that error (the others keep running, but their results are ignored). That suits a request that needs every piece. When you want all the outcomes even if some fail, `Promise.allSettled` gives `{ status, value }` or `{ status, reason }` for each one.',
      'Only use it for **independent** work. If the second query needs the result of the first (the user\'s id to look up their tasks), they must run one after the other.',
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
    example: 'A dashboard route needs the user, their tasks and their unread notifications: three queries of about 50 ms that each need only the user id from the URL. Awaiting them one by one answers in about 150 ms; `const [user, tasks, notes] = await Promise.all([…])` answers in about 50 ms, three times faster, still inside one `try`/`catch`.',
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
    mistake: 'Writing `await` inside the array: `Promise.all([await a(), await b()])`. The `await`s run one after the other **while the array is being built**, so the work is sequential again and `Promise.all` receives plain values. Pass the promises themselves: `Promise.all([a(), b()])`. Also remember that results come back in the order of the array, not in the order the operations finished.' },

  /* ---- 6. The event loop --------------------------------------------------------------- */
  { id: 'event-loop', hub: 'loop', topic: 'loop', 
    title: 'The event loop: one thread, a call stack and queues',
    summary: 'The **event loop** is how a single JavaScript thread handles many things: code runs on the **call stack** until it is empty; finished timers and I/O put their callbacks in the **task queue**; promise callbacks go to the **microtask queue**; and the loop keeps taking the next callback and running it, one at a time.',
    body: [
      'Imagine one cook (the thread) with one worktop (the **call stack**). The cook works only on what is on the worktop, one job at a time, until it is clear. Anything that involves waiting (an oven timer, a delivery) is handled by **helpers** outside the kitchen: the browser\'s Web APIs, or in Node the **libuv** library and the operating system. A helper that finishes never interrupts the cook; it pins a ticket on the **task queue**. The **event loop** is the cook\'s routine: whenever the worktop is clear, take the next ticket.',
      'The **call stack** records which function is running: calling a function pushes a **frame** on top, returning pops it. Your whole script is the first item, and **nothing else runs until the stack is empty**: a callback never interrupts code that is running. That is why `setTimeout(fn, 0)` runs **after** the rest of the script, despite the 0.',
      'There are two queues with different priorities. The **task queue** (or macrotask queue) holds the callbacks of timers, I/O and events. The **microtask queue** holds promise callbacks (`.then`, `.catch`, the code after an `await`) and `queueMicrotask` callbacks. Every time the stack empties, the loop runs **all** the microtasks, including ones added meanwhile, and only then takes **one** task. So a promise callback always runs before a timer that is already due.',
    ],
    points: [
      '1. Run the script until the call stack is empty.',
      '2. Run every microtask, until the microtask queue is empty.',
      '3. Take one task from the task queue (an expired timer, a finished I/O operation) and run it to the end.',
      '4. Back to step 2. When nothing is left to run or wait for, a Node program exits.',
    ],
    live: { kind: 'js', code: `console.log('script start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('script end');
// Predict the four lines, then press Run.` },
    example: 'In the code above, both plain `console.log` lines run while the script is on the stack. `setTimeout` hands its callback to the timer; after 0 ms it goes to the task queue. `.then` on an already-fulfilled promise puts its callback straight into the microtask queue. When the script ends, the loop empties the microtask queue first (`promise`) and then takes the task (`timeout`). Step through it below with the "Promise.then versus setTimeout" program and watch each callback move.',
    mistake: 'Reading `setTimeout(fn, 1000)` as "run `fn` in exactly one second". It means "put `fn` in the task queue **no sooner than** one second from now". If the stack is still busy then, or other tasks are ahead, it runs later. A timer delay is a minimum, not an appointment.',
    widget: 'event-loop' },

  { id: 'microtasks', hub: 'loop', topic: 'loop', 
    title: 'Microtasks before tasks: predicting the order',
    summary: 'To predict what asynchronous code prints: first all synchronous code; then every microtask (promise callbacks, code after `await`, `queueMicrotask`) in the order they were queued; then tasks such as timers, one at a time, each followed by all the microtasks it created.',
    body: [
      'Think of airport security with a priority lane. Whenever the desk (the call stack) is free, everyone in the priority lane (the microtask queue) goes through, including people who join it meanwhile, before the next person from the normal queue (the task queue). That is why a chain of ten `.then` calls finishes before a `setTimeout(fn, 0)` that was scheduled earlier.',
      'A callback joins a queue only when it is **ready**. In `Promise.resolve().then(a).then(b)`, `a` is queued at once, but `b` waits for the promise that `.then(a)` returned, so it enters the queue only after `a` has run. Likewise, the rest of an `async` function is queued when its awaited promise is fulfilled, and every `async` function runs synchronously until its first `await`.',
      '**Node only.** Node has two more queues that browsers lack. `process.nextTick(fn)` callbacks run **before** promise microtasks (in a CommonJS file). `setImmediate(fn)` callbacks run in the loop\'s **check phase**, which comes right after the phase that handles finished I/O; inside an I/O or timer callback, `setImmediate` therefore runs before a new `setTimeout(fn, 0)`. At the top level of a script, the order of those two is not guaranteed. Express apps rarely need either; it is enough to recognise them.',
    ],
    table: {
      caption: 'Where each kind of callback waits',
      head: ['You write', 'It waits in', 'It runs'],
      rows: [
        ['`console.log(…)`, any plain function call', 'nothing: it runs now', 'Immediately, on the call stack'],
        ['`.then(fn)`, `.catch(fn)`, code after `await`, `queueMicrotask(fn)`', 'Microtask queue', 'As soon as the stack is empty, before any task'],
        ['`setTimeout(fn, ms)`, `setInterval(fn, ms)`', 'Task queue, once the delay has passed', 'One at a time, after all microtasks'],
        ['I/O callbacks: `fs.readFile`, an incoming HTTP request', 'Task queue, once the I/O has finished', 'One at a time, after all microtasks'],
        ['`process.nextTick(fn)` (Node only)', 'nextTick queue', 'Before the promise microtasks'],
        ['`setImmediate(fn)` (Node only)', 'Check queue', 'In the check phase of each loop round'],
      ],
    },
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
    example: 'Applying the rules to the code above: `1` and `6` are synchronous. The `.then` callback is a microtask, so `4` comes next, and it schedules a second timer. Now the first timer\'s task runs and prints `2`; it queues a microtask, which runs before the next task: `3`. Last comes the second timer: `5`. Result: 1, 6, 4, 2, 3, 5.',
    mistake: 'Ordering callbacks by the line they are written on. `setTimeout` on line 2 and `.then` on line 6 say nothing about which runs first. What decides is **which queue** a callback joins and **when** it joins it. Ask two questions about every callback: which queue? When is it queued: now, when the timer expires, or when its promise settles?',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Predict the output: the event-loop challenges' } },

  { id: 'blocking', hub: 'loop', topic: 'loop', 
    title: 'Never block the event loop',
    summary: '**Blocking the event loop** means keeping the call stack busy with long synchronous work. Meanwhile no callback can run: timers fire late and, in a server, **every** other request waits. Await slow I/O, and move heavy computation off the main thread.',
    body: [
      'Back to the single cook: waiting for the oven is cheap, because the waiting happens outside the kitchen. But if the cook starts a two-minute job on the worktop itself, tickets pile up and nobody is served. Node can keep thousands of connections open on one thread only because each callback is **short**: it starts some I/O, returns, and the thread moves on.',
      'What blocks: long loops over big data, `JSON.parse` or `JSON.stringify` of very large values, synchronous APIs in a handler (`fs.readFileSync`, `crypto.pbkdf2Sync`, or `bcrypt.hashSync` when hashing passwords) and badly written regular expressions on long input. These are **CPU-bound** tasks: the processor itself is the bottleneck, not the waiting. What does not block: `await`ing the database, a file read with `fs/promises`, a `fetch`. The thread is free while they wait.',
      'When a request really needs heavy computation, move it off the main thread: Node\'s `worker_threads` module runs JavaScript on another thread, and larger systems send the job to a **queue** handled by a separate worker program. For an ordinary API the rule is simpler: in a route handler, use the asynchronous version of every API and never loop over data of unlimited size (that is exactly why APIs add **pagination**).',
    ],
    code: `// One slow route freezes the whole server
app.get('/slow', (req, res) => {
  const end = Date.now() + 5000;
  while (Date.now() < end) {}     // 5 s of busy waiting on the call stack
  res.json({ done: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
// While /slow runs, GET /health also waits up to 5 s: it is stuck in the queue.`,
    example: 'Start the server, run `curl http://localhost:3000/slow` in one terminal and straight away `curl http://localhost:3000/health` in another. `/health` normally answers in a few milliseconds, but now it waits until the five seconds are over: its request has arrived, but the event loop cannot take it while `/slow` occupies the stack. The visualiser\'s "A blocking loop delays a timer" program shows the same effect with a timer.',
    mistake: 'Thinking `async` makes a function non-blocking. `async function work() { for (let i = 0; i < 1e9; i++) {} }` still blocks for the whole loop: `async` only changes what the function **returns** (a promise). Code stops blocking only where it really waits for something outside the thread (I/O, a timer, a worker), at an `await`.',
    practice: { href: '#/server/runtime/practice/event-loop', label: 'Watch a blocking loop delay a timer' } },
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
    q: 'What does a framework such as Express add on top of Node\'s `http` module?',
    choices: ['Routing, a middleware pipeline and a standard structure', 'The ability to run JavaScript on a server', 'A database', 'The event loop'],
    answer: 0,
    why: 'Node already runs the code, has the event loop and can serve HTTP. Express adds the conventions: method + path → handler, middleware and `next()`.' },
  { type: 'mc', topic: 'runtime',
    q: 'Which Node release should you use for an API you deploy?',
    choices: ['The newest Current release', 'The most recent Active LTS release', 'The oldest version still available', 'Any release: they are all identical'],
    answer: 1,
    why: 'LTS (Long-Term Support) releases receive fixes for years; Current releases are for trying out new features.' },

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
    q: 'In an Express 4 handler, `const rows = await db.findAll();` rejects and there is no `try`/`catch`. What happens (Node 15 or later)?',
    choices: ['Express sends a 500 automatically', 'The client gets an empty 200 response', 'The rejection is unhandled and the Node process exits', 'Nothing: the error is ignored'],
    answer: 2,
    why: 'Express 4 does not watch the promise a handler returns. The unhandled rejection is fatal in modern Node, so the whole server stops.' },
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
