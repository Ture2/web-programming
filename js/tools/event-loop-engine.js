'use strict';

/* ==========================================================================
   Event-loop engine (pure, no DOM; also runs in Node: site/test/event-loop-engine.test.mjs).

   Each preset is a tiny real JavaScript program (`code`, one string per line) plus
   the same program written as data (`main`, a list of instructions). The engine runs
   the instructions on a model of the runtime and records one step per event:

     EventLoopEngine.run(presetId) → { preset, steps, out, error }
     step = { line, text, now, stack, waiting, ticks, micro, tasks, checks, out, fresh }
       line     index into preset.code of the line that runs (null: the event loop itself)
       text     one sentence: what happened and why now (may use `code` markup)
       now      virtual clock in ms (synchronous code takes 0 ms, except `block`)
       stack    call-stack frames, bottom first
       waiting  [{ label, detail }]: timers held by the Web / Node APIs, and callbacks
                waiting for a promise that is still pending (they are in no queue yet)
       ticks    process.nextTick queue (Node tab only)
       micro    microtask queue (promise callbacks, await continuations, queueMicrotask)
       tasks    task (macrotask) queue: expired timer callbacks
       checks   check queue: setImmediate callbacks (Node tab only)
       out      console output so far
       fresh    { panel, label } of the item this step added, or null

   Instructions (op): log, note, call (synchronous function), async (call an async
   function: runs until its first await), await (p: promise id, or null for an
   already-settled value), resolved (Promise.resolve()), then (p → out), micro
   (queueMicrotask), timeout (setTimeout), newPromise (runs the executor now),
   resolve, block (busy loop of ms), tick (process.nextTick), immediate (setImmediate).

   Ordering rules modelled (the order matches real JavaScript: the tests run each
   preset's code with Node and compare the console output):
     · the whole script is the first task; nothing else runs until the stack is empty;
     · after every task the microtask queue is emptied completely (new microtasks too);
     · a timer goes to the task queue when its delay has passed; tasks run one at a time;
     · Node: nextTick callbacks run before promise callbacks; the loop has a timers phase
       and then a check phase (setImmediate); setTimeout(fn, 0) means 1 ms in Node.
   ========================================================================== */

const EventLoopEngine = (() => {
  const MAX_STEPS = 400;

  /* ---- Shorthands to write programs as data ---------------------------------------- */
  const fn = (name, line, end, body) => ({ name, line, end, body });
  const log = (line, text) => ({ op: 'log', line, text });
  const note = (line, say) => ({ op: 'note', line, say });
  const call = (line, f) => ({ op: 'call', line, fn: f });
  const asyncCall = (line, f, ret) => ({ op: 'async', line, fn: f, ret });
  const awaitOn = (line, p) => ({ op: 'await', line, p });
  const resolved = (p, line) => ({ op: 'resolved', p, line });
  const then = (line, p, f, out) => ({ op: 'then', line, p, fn: f, out });
  const micro = (line, f) => ({ op: 'micro', line, fn: f });
  const timeout = (line, delay, f) => ({ op: 'timeout', line, delay, fn: f });
  const newPromise = (line, p, executor) => ({ op: 'newPromise', line, p, fn: executor });
  const resolve = (line, p) => ({ op: 'resolve', line, p });
  const block = (line, ms) => ({ op: 'block', line, ms });
  const tick = (line, f) => ({ op: 'tick', line, fn: f });
  const immediate = (line, f) => ({ op: 'immediate', line, fn: f });

  /* ---- The programs ------------------------------------------------------------------ */
  const PRESETS = [
    { id: 'sync', tab: 'js', title: 'Synchronous code: top to bottom',
      code: [
        "console.log('A');",
        'function greet(name) {',
        "  console.log('Hello, ' + name);",
        '}',
        "greet('Ana');",
        "console.log('B');",
      ],
      main: [
        log(0, 'A'),
        note(1, 'This only **defines** `greet`: the function is stored, but its body does not run until someone calls it.'),
        call(4, fn("greet('Ana')", 2, 3, [log(2, 'Hello, Ana')])),
        log(5, 'B'),
      ] },

    { id: 'timeout0', tab: 'js', title: 'setTimeout(fn, 0) waits its turn',
      code: [
        "console.log('start');",
        'setTimeout(() => {',
        "  console.log('timeout');",
        '}, 0);',
        "console.log('end');",
      ],
      main: [
        log(0, 'start'),
        timeout(1, 0, fn('timer callback', 1, 3, [log(2, 'timeout')])),
        log(4, 'end'),
      ] },

    { id: 'delays', tab: 'js', title: 'Timers with different delays',
      code: [
        "setTimeout(() => console.log('slow: 100 ms'), 100);",
        "setTimeout(() => console.log('fast: 0 ms'), 0);",
        "setTimeout(() => console.log('medium: 50 ms'), 50);",
        "console.log('three timers scheduled');",
      ],
      main: [
        timeout(0, 100, fn("timer callback ('slow')", 0, 0, [log(0, 'slow: 100 ms')])),
        timeout(1, 0, fn("timer callback ('fast')", 1, 1, [log(1, 'fast: 0 ms')])),
        timeout(2, 50, fn("timer callback ('medium')", 2, 2, [log(2, 'medium: 50 ms')])),
        log(3, 'three timers scheduled'),
      ] },

    { id: 'promise', tab: 'js', title: 'Promise.then versus setTimeout',
      code: [
        "console.log('script start');",
        "setTimeout(() => console.log('timeout'), 0);",
        "Promise.resolve().then(() => console.log('promise'));",
        "console.log('script end');",
      ],
      main: [
        log(0, 'script start'),
        timeout(1, 0, fn("timer callback ('timeout')", 1, 1, [log(1, 'timeout')])),
        resolved('p'),
        then(2, 'p', fn("then callback ('promise')", 2, 2, [log(2, 'promise')])),
        log(3, 'script end'),
      ] },

    { id: 'chain', tab: 'js', title: 'Chained .then and queueMicrotask',
      code: [
        'Promise.resolve()',
        "  .then(() => console.log('then 1'))",
        "  .then(() => console.log('then 2'));",
        "queueMicrotask(() => console.log('microtask'));",
        "console.log('sync');",
      ],
      labels: { p1: 'the promise returned by the first .then' },
      main: [
        resolved('p0', 0),
        then(1, 'p0', fn("then 1 callback", 1, 1, [log(1, 'then 1')]), 'p1'),
        then(2, 'p1', fn("then 2 callback", 2, 2, [log(2, 'then 2')]), 'p2'),
        micro(3, fn('queueMicrotask callback', 3, 3, [log(3, 'microtask')])),
        log(4, 'sync'),
      ] },

    { id: 'async', tab: 'js', title: 'Two async functions with await',
      code: [
        'async function task(name) {',
        "  console.log(name + ' start');",
        '  await null;',
        "  console.log(name + ' end');",
        '}',
        "task('A');",
        "task('B');",
        "console.log('sync done');",
      ],
      main: [
        note(0, 'This only **defines** the async function `task`; nothing runs yet.'),
        asyncCall(5, fn("task('A')", 0, 4, [log(1, 'A start'), awaitOn(2, null), log(3, 'A end')])),
        asyncCall(6, fn("task('B')", 0, 4, [log(1, 'B start'), awaitOn(2, null), log(3, 'B end')])),
        log(7, 'sync done'),
      ] },

    { id: 'sleep', tab: 'js', title: 'A timer that resolves a promise (sleep)',
      code: [
        'function sleep(ms) {',
        '  return new Promise((resolve) => setTimeout(resolve, ms));',
        '}',
        'async function main() {',
        "  console.log('waiting...');",
        '  await sleep(100);',
        "  console.log('100 ms later');",
        '}',
        'main();',
        "setTimeout(() => console.log('timer: 50 ms'), 50);",
        "console.log('main() returned a promise');",
      ],
      labels: { ps: 'the promise returned by sleep(100)' },
      main: [
        note(0, 'Lines 1 to 8 only **define** two functions, `sleep` and `main`. Nothing runs until line 9 calls `main()`.'),
        asyncCall(8, fn('main()', 3, 7, [
          log(4, 'waiting...'),
          call(5, fn('sleep(100)', 1, 2, [
            newPromise(1, 'ps', fn('Promise executor', 1, 1, [
              timeout(1, 100, fn('resolve (from sleep)', 1, 1, [resolve(1, 'ps')])),
            ])),
          ])),
          awaitOn(5, 'ps'),
          log(6, '100 ms later'),
        ])),
        timeout(9, 50, fn("timer callback ('timer: 50 ms')", 9, 9, [log(9, 'timer: 50 ms')])),
        log(10, 'main() returned a promise'),
      ] },

    { id: 'mixed', tab: 'js', title: 'Timers and promises inside each other',
      code: [
        "console.log('1');",
        'setTimeout(() => {',
        "  console.log('2');",
        "  Promise.resolve().then(() => console.log('3'));",
        '}, 0);',
        'Promise.resolve().then(() => {',
        "  console.log('4');",
        "  setTimeout(() => console.log('5'), 0);",
        '});',
        "console.log('6');",
      ],
      main: [
        log(0, '1'),
        timeout(1, 0, fn('timer callback (prints 2)', 1, 4, [
          log(2, '2'),
          resolved('pa'),
          then(3, 'pa', fn('then callback (prints 3)', 3, 3, [log(3, '3')])),
        ])),
        resolved('pb'),
        then(5, 'pb', fn('then callback (prints 4)', 5, 8, [
          log(6, '4'),
          timeout(7, 0, fn('timer callback (prints 5)', 7, 7, [log(7, '5')])),
        ])),
        log(9, '6'),
      ] },

    { id: 'blocking', tab: 'js', title: 'A blocking loop delays a timer',
      code: [
        "setTimeout(() => console.log('timer: asked for 0 ms'), 0);",
        'const start = Date.now();',
        'while (Date.now() - start < 200) {',
        '  // busy: nothing else can run',
        '}',
        "console.log('loop done after 200 ms');",
      ],
      main: [
        timeout(0, 0, fn('timer callback', 0, 0, [log(0, 'timer: asked for 0 ms')])),
        block(2, 200),
        log(5, 'loop done after 200 ms'),
      ] },

    { id: 'ticks', tab: 'node', title: 'Node: nextTick, promise, setImmediate',
      code: [
        "setImmediate(() => console.log('setImmediate'));",
        "setTimeout(() => console.log('setTimeout 50 ms'), 50);",
        "Promise.resolve().then(() => console.log('promise'));",
        "process.nextTick(() => console.log('nextTick'));",
        "console.log('sync');",
      ],
      main: [
        immediate(0, fn('setImmediate callback', 0, 0, [log(0, 'setImmediate')])),
        timeout(1, 50, fn('timer callback (50 ms)', 1, 1, [log(1, 'setTimeout 50 ms')])),
        resolved('p'),
        then(2, 'p', fn('then callback', 2, 2, [log(2, 'promise')])),
        tick(3, fn('nextTick callback', 3, 3, [log(3, 'nextTick')])),
        log(4, 'sync'),
      ] },

    { id: 'in-timer', tab: 'node', title: 'Node: inside a timer, setImmediate wins',
      code: [
        'setTimeout(() => {',
        "  setTimeout(() => console.log('setTimeout 0'), 0);",
        "  setImmediate(() => console.log('setImmediate'));",
        "  process.nextTick(() => console.log('nextTick'));",
        "  console.log('outer timer');",
        '}, 0);',
      ],
      main: [
        timeout(0, 0, fn('outer timer callback', 0, 5, [
          timeout(1, 0, fn('inner timer callback', 1, 1, [log(1, 'setTimeout 0')])),
          immediate(2, fn('setImmediate callback', 2, 2, [log(2, 'setImmediate')])),
          tick(3, fn('nextTick callback', 3, 3, [log(3, 'nextTick')])),
          log(4, 'outer timer'),
        ])),
      ] },
  ];

  /* "Predict the output" challenges: put the console lines of a preset in order. */
  const CHALLENGES = [
    { id: 'promise-vs-timeout', preset: 'promise', title: 'A promise or a timer first?',
      why: 'Synchronous lines run first. Then the microtask queue is emptied (the `.then` callback), and only then does the event loop take a task (the timer), even with a 0 ms delay.' },
    { id: 'timer-delays', preset: 'delays', title: 'Three timers',
      why: 'The synchronous `console.log` runs while the timers are still waiting. The timers then fire in order of when they are due (0, 50, 100 ms), not in the order they were written.' },
    { id: 'then-chain', preset: 'chain', title: 'A chain and a microtask',
      why: '`then 2` cannot be queued until `then 1` has run, because it waits for the promise that `then 1` returns. By then `microtask` is already in the queue, so it goes first.' },
    { id: 'two-awaits', preset: 'async', title: 'Two async calls',
      why: 'Each call runs synchronously up to its `await`, then pauses and gives control back. Both continuations wait in the microtask queue until the script has finished, then run in the order they were queued.' },
    { id: 'sleep', preset: 'sleep', title: 'Sleeping with a promise',
      why: '`await sleep(100)` pauses `main` and returns control to the script. The 50 ms timer fires before the 100 ms one; when the 100 ms timer calls `resolve`, the rest of `main` is queued as a microtask and runs.' },
    { id: 'mixed', preset: 'mixed', title: 'Timers and promises inside each other',
      why: '1 and 6 are synchronous. The promise callback (4) is a microtask, so it runs before any timer. The first timer (2) queues a microtask (3), which runs before the next task: the timer that 4 created (5).' },
    { id: 'blocked-timer', preset: 'blocking', title: 'A blocked timer',
      why: 'A delay is a minimum, not a guarantee. The timer expires at 0 ms, but its callback can only run when the call stack is empty, which happens after the 200 ms loop.' },
    { id: 'node-queues', preset: 'ticks', title: 'Node: nextTick, promise, setImmediate',
      why: 'In a Node CommonJS file the nextTick queue is emptied before the promise microtasks. setImmediate runs in the check phase of the first loop round; the 50 ms timer is not due yet, so it comes last.' },
  ];

  const byId = (id) => PRESETS.find((p) => p.id === id) || null;

  /* ---- The simulation ---------------------------------------------------------------- */
  function run(id) {
    const preset = byId(id);
    if (!preset) return { preset: null, steps: [], out: [], error: `Unknown program ${id}` };
    const node = preset.tab === 'node';
    const labels = preset.labels || {};
    const apis = node ? 'Node’s timers' : 'the runtime’s timers (a Web API in the browser, libuv in Node)';

    const stack = [];
    const out = [];
    const micro = [];
    const tasks = [];
    const ticks = [];
    const checks = [];
    const timers = [];                       // { cb, delay, due, seq } held by the APIs
    const promises = {};                     // id → { state, reactions: [job], order }
    let now = 0;
    let seq = 0;
    let order = 0;
    const steps = [];
    let truncated = false;

    const waitingList = () => [
      ...timers.slice().sort((a, b) => a.seq - b.seq).map((tm) => ({
        label: tm.cb.name,
        detail: `timer: ${tm.delay} ms${node && tm.delay < 1 ? ' (Node: 1 ms)' : ''} · due at ${tm.due} ms`,
      })),
      ...Object.entries(promises).filter(([, p]) => p.state === 'pending').sort((a, b) => a[1].order - b[1].order)
        .flatMap(([pid, p]) => p.reactions.map((job) => ({ label: job.label, detail: `waits for ${labels[pid] || 'a pending promise'}` }))),
    ];

    function snap(line, text, fresh) {
      if (steps.length >= MAX_STEPS) { truncated = true; return; }
      steps.push({
        line: line === undefined ? null : line,
        text,
        now,
        stack: stack.slice(),
        waiting: waitingList(),
        ticks: ticks.map((j) => j.label),
        micro: micro.map((j) => j.label),
        tasks: tasks.map((j) => j.label),
        checks: checks.map((j) => j.label),
        out: out.slice(),
        fresh: fresh || null,
      });
    }

    const promise = (pid) => {
      if (!promises[pid]) promises[pid] = { state: 'pending', reactions: [], order: order++ };
      return promises[pid];
    };

    /* Settles a promise: every callback waiting for it moves to the microtask queue. */
    function settle(pid, line, who) {
      const p = promise(pid);
      if (p.state !== 'pending') return;
      p.state = 'fulfilled';
      const waiting = p.reactions.splice(0);
      waiting.forEach((job) => micro.push(job));
      if (who === undefined) return;
      if (waiting.length) {
        snap(line, `${who} fulfils ${labels[pid] || 'the promise'}, so the callback waiting for it, “${waiting[0].label}”, moves to the microtask queue.`, { panel: 'micro', label: waiting[0].label });
      } else {
        snap(line, `${who} fulfils ${labels[pid] || 'the promise'}. Nobody is waiting for it, so nothing is queued.`);
      }
    }

    function addTimer(st) {
      const delay = st.delay;
      const due = now + (node ? Math.max(1, delay) : delay);
      timers.push({ cb: st.fn, delay, due, seq: seq++ });
      snap(st.line, `\`setTimeout\` hands “${st.fn.name}” to ${apis} with a ${delay} ms delay and returns at once. The callback is not in any queue yet.`, { panel: 'waiting', label: st.fn.name });
    }

    /* Timers whose delay has passed go to the task queue, earliest first. Returns their names. */
    function moveDue() {
      const due = timers.filter((tm) => tm.due <= now).sort((a, b) => a.due - b.due || a.seq - b.seq);
      due.forEach((tm) => {
        timers.splice(timers.indexOf(tm), 1);
        tasks.push({ label: tm.cb.name, cb: tm.cb, due: tm.due, kind: 'timer' });
      });
      return due.map((tm) => tm.cb.name);
    }

    /* Runs a list of instructions. Returns 'suspended' when an await pauses the async function. */
    function exec(body, ctx) {
      for (let i = 0; i < body.length; i++) {
        if (truncated) return 'done';
        const st = body[i];
        switch (st.op) {
          case 'log':
            out.push(st.text);
            snap(st.line, `\`console.log\` prints “${st.text}” straight away: it is synchronous.`, { panel: 'out', label: st.text });
            break;
          case 'note':
            snap(st.line, st.say);
            break;
          case 'call':
            stack.push(st.fn.name);
            snap(st.line, `Calling \`${st.fn.name}\` pushes a new frame on top of the call stack; the code below the call waits until it returns.`, { panel: 'stack', label: st.fn.name });
            exec(st.fn.body, null);
            stack.pop();
            snap(st.fn.end, `\`${st.fn.name}\` returns: its frame is popped and the caller continues on the next line.`);
            break;
          case 'async': {
            const name = st.fn.name;
            stack.push(name);
            snap(st.line, `Calling the async function \`${name}\`: its body starts running **synchronously**, like any function, until the first \`await\`.`, { panel: 'stack', label: name });
            const r = exec(st.fn.body, { name, ret: st.ret, end: st.fn.end });
            stack.pop();
            if (r === 'done') {
              if (st.ret) settle(st.ret);
              snap(st.fn.end, `\`${name}\` reached its end without pausing; its promise is fulfilled.`);
            } else {
              snap(st.line, `\`${name}\` is paused, so it returns a **pending promise** to its caller and leaves the stack. The script continues with the next line.`);
            }
            break;
          }
          case 'await': {
            const job = { label: `${ctx.name} after await`, kind: 'resume', body: body.slice(i + 1), ctx, line: st.line };
            if (!st.p || promise(st.p).state !== 'pending') {
              micro.push(job);
              snap(st.line, `\`await\` pauses \`${ctx.name}\` (not the whole program). The value is already there, so the rest of the function is queued as a microtask.`, { panel: 'micro', label: job.label });
            } else {
              promise(st.p).reactions.push(job);
              snap(st.line, `\`await\` pauses \`${ctx.name}\` until ${labels[st.p] || 'the promise'} is fulfilled. The rest of the function waits next to that promise, in no queue yet.`, { panel: 'waiting', label: job.label });
            }
            return 'suspended';
          }
          case 'resolved':
            promise(st.p).state = 'fulfilled';
            if (st.line !== undefined) snap(st.line, '`Promise.resolve()` creates a promise that is **already fulfilled**. Nothing is queued yet: no callback is attached to it.');
            break;
          case 'then': {
            const job = { label: st.fn.name, kind: 'then', cb: st.fn, out: st.out };
            const p = promise(st.p);
            if (st.out) promise(st.out);
            if (p.state === 'pending') {
              p.reactions.push(job);
              snap(st.line, `\`.then\` on a promise that is still **pending**: “${st.fn.name}” cannot be queued yet; it waits for ${labels[st.p] || 'that promise'}.`, { panel: 'waiting', label: job.label });
            } else {
              micro.push(job);
              snap(st.line, `The promise is already fulfilled, so \`.then\` puts “${st.fn.name}” straight into the **microtask queue**. It will run only once the call stack is empty.`, { panel: 'micro', label: job.label });
            }
            break;
          }
          case 'micro': {
            const job = { label: st.fn.name, kind: 'then', cb: st.fn };
            micro.push(job);
            snap(st.line, `\`queueMicrotask\` puts “${st.fn.name}” at the end of the **microtask queue**, behind the microtasks already there.`, { panel: 'micro', label: job.label });
            break;
          }
          case 'timeout':
            addTimer(st);
            break;
          case 'newPromise':
            promise(st.p);
            stack.push(st.fn.name);
            snap(st.line, '`new Promise(executor)` creates a **pending** promise and runs the executor function immediately, synchronously.', { panel: 'stack', label: st.fn.name });
            exec(st.fn.body, null);
            stack.pop();
            snap(st.line, 'The executor returns. The promise stays **pending** until someone calls `resolve`.');
            break;
          case 'resolve':
            settle(st.p, st.line, 'Calling `resolve`');
            break;
          case 'block': {
            now += st.ms;
            const moved = node ? [] : moveDue();
            snap(st.line, `This loop keeps the call stack busy for ${st.ms} ms: nothing else can run, not even a timer.${moved.length ? ` Meanwhile the timer expires and “${moved[0]}” is put in the task queue, but it has to wait.` : ''}`, moved.length ? { panel: 'tasks', label: moved[0] } : null);
            break;
          }
          case 'tick': {
            const job = { label: st.fn.name, kind: 'then', cb: st.fn };
            ticks.push(job);
            snap(st.line, `\`process.nextTick\` (Node only) puts “${st.fn.name}” in the **nextTick queue**, which Node empties even before the promise microtasks.`, { panel: 'ticks', label: job.label });
            break;
          }
          case 'immediate': {
            const job = { label: st.fn.name, kind: 'then', cb: st.fn };
            checks.push(job);
            snap(st.line, `\`setImmediate\` (Node only) puts “${st.fn.name}” in the **check queue**: it runs in the check phase of the event loop, after the timers phase.`, { panel: 'checks', label: job.label });
            break;
          }
          default:
            throw new Error(`unknown op ${st.op}`);
        }
      }
      return 'done';
    }

    /* Runs one queued job (microtask, nextTick, timer or immediate callback). */
    function runJob(job, from) {
      if (job.kind === 'resume') {
        const { ctx } = job;
        stack.push(ctx.name);
        snap(job.line, `The stack is empty, so the event loop takes the first microtask: \`${ctx.name}\` resumes right after its \`await\`.`, { panel: 'stack', label: ctx.name });
        const r = exec(job.body, ctx);
        stack.pop();
        if (r === 'done') {
          if (ctx.ret) settle(ctx.ret);
          snap(ctx.end, `\`${ctx.name}\` reaches its end: its frame is popped and the promise it returned is fulfilled.`);
        } else {
          snap(job.line, `\`${ctx.name}\` pauses again at the next \`await\` and leaves the stack.`);
        }
        return;
      }
      const cb = job.cb;
      stack.push(cb.name);
      let why;
      if (from === 'micro') why = `The call stack is empty, so the event loop empties the **microtask queue** first: it runs “${cb.name}”.`;
      else if (from === 'ticks') why = `Before any promise callback, Node empties the **nextTick queue**: it runs “${cb.name}”.`;
      else if (from === 'checks') why = `**Check phase**: Node runs the setImmediate callback “${cb.name}”.`;
      else {
        const late = now - job.due;
        why = node
          ? `Node runs the expired timer callback “${cb.name}” (it was due at ${job.due} ms).`
          : `The stack and the microtask queue are empty, so the event loop takes the **first task**: “${cb.name}”.${late > 0 ? ` It was due at ${job.due} ms but runs at ${now} ms: a delay is a minimum, not a promise.` : ''}`;
      }
      snap(cb.line, why, { panel: 'stack', label: cb.name });
      exec(cb.body, null);
      stack.pop();
      const outP = job.out;
      if (outP && promises[outP] && promises[outP].reactions.length) {
        settle(outP, cb.end, `“${cb.name}” returns. That`);
      } else {
        if (outP) settle(outP);
        snap(cb.end, `“${cb.name}” has finished: its frame is popped and the call stack is empty again.`);
      }
    }

    function drain() {
      for (;;) {
        if (truncated) return;
        if (ticks.length) { runJob(ticks.shift(), 'ticks'); continue; }
        if (micro.length) {
          while (micro.length && !truncated) runJob(micro.shift(), 'micro');
          continue;
        }
        return;
      }
    }

    /* ---- The script, then the event loop ------------------------------------------------ */
    try {
      stack.push('main script');
      snap(null, 'The engine starts running the file. The whole script is the first task, so “main script” goes on the call stack.', { panel: 'stack', label: 'main script' });
      exec(preset.main, null);
      stack.pop();
      if (!node) {
        const moved = moveDue();
        snap(null, `The last line has run and “main script” leaves the stack. ${moved.length
          ? `The 0 ms timer has already expired, so “${moved[0]}” is waiting in the task queue. But before taking any task, the event loop empties the microtask queue.`
          : 'The stack is empty: now the event loop can look at the queues.'}`, moved.length ? { panel: 'tasks', label: moved[0] } : null);
      } else {
        snap(null, 'The last line has run and “main script” leaves the stack. Node now empties the nextTick queue, then the microtask queue, before the event loop starts.');
      }

      for (let guard = 0; guard < 100 && !truncated; guard++) {
        drain();
        if (truncated) break;
        if (!node) {
          const moved = moveDue();
          if (moved.length) snap(null, `The timer for “${moved[0]}” has expired: its callback goes to the task queue.`, { panel: 'tasks', label: moved[0] });
          if (tasks.length) { runJob(tasks.shift(), 'tasks'); continue; }
        } else {
          let ran = false;
          const moved = moveDue();
          if (moved.length) {
            snap(null, `The event loop enters the **timers phase**: ${moved.length === 1 ? 'one timer is' : `${moved.length} timers are`} due at ${now} ms.`, { panel: 'tasks', label: moved[0] });
            while (tasks.length && !truncated) { runJob(tasks.shift(), 'tasks'); drain(); }
            ran = true;
          }
          if (checks.length) {
            const n = checks.length;
            snap(null, `The event loop moves on to the **check phase**, where setImmediate callbacks run.`);
            for (let k = 0; k < n && !truncated; k++) { runJob(checks.shift(), 'checks'); drain(); }
            ran = true;
          }
          if (ran) continue;
        }
        if (timers.length) {
          const next = Math.min(...timers.map((tm) => tm.due));
          now = next;
          snap(null, `Nothing can run: the stack and the queues are empty. The event loop waits until the next timer is due, at ${next} ms.`);
          continue;
        }
        snap(null, `Every queue is empty and no timer is waiting: the program has finished.${node ? ' Node exits.' : ' (In a browser tab the page simply stays idle, waiting for events.)'}`);
        break;
      }
    } catch (e) {
      return { preset, steps, out, error: e.message, truncated };
    }
    return { preset, steps, out, error: null, truncated };
  }

  /* ---- "Predict the output" helpers ------------------------------------------------------ */
  const answer = (challengeId) => {
    const c = CHALLENGES.find((x) => x.id === challengeId);
    return c ? run(c.preset).out : [];
  };

  /* A fixed starting order for the user (indexes into the answer), never already correct. */
  function scrambled(challengeId) {
    const lines = answer(challengeId);
    const idx = lines.map((_, k) => k).sort((a, b) => (lines[a] < lines[b] ? -1 : lines[a] > lines[b] ? 1 : 0));
    if (idx.every((v, k) => v === k)) idx.reverse();
    if (idx.every((v, k) => v === k) && idx.length > 1) idx.push(idx.shift());
    return idx;
  }

  /* order: indexes into the answer, in the user's order → { ok, right: [bool per position], score } */
  function check(challengeId, order) {
    const lines = answer(challengeId);
    const right = order.map((v, k) => v === k);
    const score = right.filter(Boolean).length;
    return { ok: order.length === lines.length && score === lines.length, right, score };
  }

  return { run, check, scrambled, answer, PRESETS, CHALLENGES, MAX_STEPS, byId };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = EventLoopEngine;
