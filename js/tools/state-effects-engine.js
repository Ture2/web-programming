'use strict';

/* ==========================================================================
   Render-cycle engine (pure, no DOM; also runs in Node: site/test/state-effects-engine.test.mjs).

   A tiny, deterministic model of how React runs one function component: it is NOT React,
   only the rules the cards teach, written out step by step so a student can watch them.

   Each scenario is a short, real React program (`code`, one string per line) plus the same
   component written as data that the engine can run:
     state        initial values of the state variables ({ count: 0 })
     render(s, api)            → the text on the screen; may api.log(...) like console.log in
                                  the component body (s = this render's snapshot of state)
     effects: [{ deps(s) | null, setup(s, api) → cleanup | undefined, line, label }]
                                  deps null = no dependency array; () => [] = empty array
     actions: [{ at, label, line, run(s, api) }] user events at a time in ms (s = the snapshot
                                  of the last committed render: the handler of that render)
              or { at, label, unmount: true } (the parent stops rendering the component)
     until        the clock stops at this time (ms)
     strict       true: wrapped in <StrictMode> (development double render and effect re-run)

   api: log(text, line) · set(name, valueOrUpdater, source, line) · setInterval(fn, ms, line) ·
        clearInterval(id) · controller() → { signal, abort() } ·
        fetch(url, { signal, ms, data, line }, onData, onError)

   RenderCycleEngine.run(id, { strict }) → { scenario, steps, out }
     step = { kind, text, line, t, out, state, screen, pending, render, mounted, logs }
       kind   event | queue | process | bail | render | commit | skip | cleanup | effect |
              log | timer | network | unmount | ignored | strict
       out    the console so far (strings); logs: the lines this step printed
       state  the committed state after this step; pending: queued updates (descriptions)

   Rules modelled (checked against React 19 in a real browser, see the test file):
     · a set function never changes the variable in the running code: it queues an update,
       and the component sees the new value in the NEXT render (state is a snapshot);
     · updates queued in one event are processed together, in order, then ONE render
       (batching); an updater function receives the result of the previous update;
     · a render whose state equals the current state (Object.is) is skipped;
     · after the commit, effects whose dependencies changed (or that have no array) run;
       first every cleanup of the previous run, then every new setup, in source order;
     · unmounting runs every cleanup; a set call after unmount is ignored;
     · StrictMode (development only) renders twice and, on mount, runs setup → cleanup →
       setup to prove the cleanup undoes the setup;
     · abort() rejects the pending fetch with AbortError in a microtask (after the effects).
   ========================================================================== */

const RenderCycleEngine = (() => {
  const MAX_STEPS = 300;

  /* Index of the n-th line (0-based) of `code` containing `text`. */
  function at(code, text, nth = 0) {
    let seen = 0;
    for (let k = 0; k < code.length; k++) {
      if (code[k].includes(text)) {
        if (seen === nth) return k;
        seen++;
      }
    }
    throw new Error(`line not found: ${text}`);
  }

  const lines = (s) => s.replace(/^\n/, '').split('\n');
  const fake = (n, q) => Array.from({ length: n }, (_, k) => ({ id: k + 1, title: `${q} ${k + 1}` }));

  /* ---- The scenarios ---------------------------------------------------------------- */

  const SET_TWICE = lines(`
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  console.log(\`render: count = \${count}\`);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    console.log(\`clicked: count is still \${count}\`);
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}`);

  const UPDATER = lines(`
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  console.log(\`render: count = \${count}\`);

  function handleClick() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    console.log(\`clicked: count is still \${count}\`);
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}`);

  const BATCHING = lines(`
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState('none');
  console.log(\`render: count = \${count}, label = \${label}\`);

  function handleClick() {
    setCount((c) => c + 1);
    setLabel('clicked');
    console.log('handler finished');
  }

  return <button onClick={handleClick}>{label}: {count}</button>;
}`);

  const DEPS = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  console.log(\`render: count = \${count}, text = "\${text}"\`);

  useEffect(() => {
    console.log('A (no array): after every render');
  });
  useEffect(() => {
    console.log('B ([]): after the first render only');
  }, []);
  useEffect(() => {
    console.log(\`C ([count]): count is \${count}\`);
  }, [count]);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </>
  );
}`);

  const CHAT = lines(`
import { useState, useEffect } from 'react';

function ChatRoom({ roomId }) {
  console.log(\`render: room = \${roomId}\`);
  useEffect(() => {
    console.log(\`connect to \${roomId}\`);
    return () => console.log(\`disconnect from \${roomId}\`);
  }, [roomId]);
  return <h2>Welcome to #{roomId}</h2>;
}

function App() {
  const [roomId, setRoomId] = useState('general');
  const [show, setShow] = useState(true);
  return (
    <>
      <button onClick={() => setRoomId('travel')}>Go to #travel</button>
      <button onClick={() => setShow(false)}>Close the chat</button>
      {show && <ChatRoom roomId={roomId} />}
    </>
  );
}`);

  const NO_CLEANUP = lines(`
import { useState, useEffect } from 'react';

function Clock() {
  const [seconds, setSeconds] = useState(0);
  console.log(\`render: seconds = \${seconds}\`);
  useEffect(() => {
    setInterval(() => {
      console.log('tick');
      setSeconds((s) => s + 1);
    }, 1000);
    // no cleanup: nobody ever stops this interval
  }, []);
  return <p>{seconds} s</p>;
}

function App() {
  const [show, setShow] = useState(true);
  return (
    <>
      <button onClick={() => setShow(false)}>Hide the clock</button>
      {show && <Clock />}
    </>
  );
}`);

  const STALE = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);
  console.log(\`render: count = \${count}\`);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(\`tick: the interval sees count = \${count}\`);
    }, 1000);
    return () => clearInterval(id);
  }, []); // count is used inside, but missing here

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}`);

  const INTERVAL_DEPS = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);
  console.log(\`render: count = \${count}\`);

  useEffect(() => {
    console.log(\`start interval (count = \${count})\`);
    const id = setInterval(() => {
      console.log(\`tick: count = \${count}\`);
    }, 1000);
    return () => {
      console.log(\`clear interval (count = \${count})\`);
      clearInterval(id);
    };
  }, [count]);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}`);

  const INTERVAL_UPDATER = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [seconds, setSeconds] = useState(0);
  console.log(\`render: seconds = \${seconds}\`);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // nothing from the render is read inside: [] is honest

  return <p>{seconds} s</p>;
}`);

  const STRICT = lines(`
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  console.log('render');
  useEffect(() => {
    console.log('connect');
    return () => console.log('disconnect');
  }, []);
  return <p>Connected</p>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`);

  const FETCH_ABORT = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('e');
  const [tasks, setTasks] = useState([]);
  console.log(\`render: query = "\${query}", \${tasks.length} tasks\`);

  useEffect(() => {
    const controller = new AbortController();
    console.log(\`fetch "\${query}"\`);
    fetch(\`/api/tasks?search=\${query}\`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        console.log(\`response for "\${query}": \${data.length} tasks\`);
        setTasks(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') console.log(\`"\${query}" was aborted\`);
      });
    return () => {
      console.log(\`cleanup: abort "\${query}"\`);
      controller.abort();
    };
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}`);

  const FETCH_RACE = lines(`
import { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('e');
  const [tasks, setTasks] = useState([]);
  console.log(\`render: query = "\${query}", \${tasks.length} tasks\`);

  useEffect(() => {
    console.log(\`fetch "\${query}"\`);
    fetch(\`/api/tasks?search=\${query}\`)
      .then((res) => res.json())
      .then((data) => {
        console.log(\`response for "\${query}": \${data.length} tasks\`);
        setTasks(data);
      });
    // no cleanup: a slow, old response can still arrive last
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}`);

  /* Search results of the mock API (seed data) for the queries used below. */
  const RESULTS = { e: 4, en: 1 };

  function fetchEffect(code, withAbort) {
    return {
      label: 'useEffect(…, [query])',
      line: at(code, 'useEffect('),
      deps: (s) => [s.query],
      setup(s, api) {
        const c = withAbort ? api.controller() : null;
        api.log(`fetch "${s.query}"`, at(code, 'console.log(`fetch'));
        api.fetch(`/api/tasks?search=${s.query}`, { signal: c && c.signal, ms: s.query === 'e' && !withAbort ? 600 : 300, data: fake(RESULTS[s.query], s.query), line: at(code, 'fetch(`') },
          (data) => {
            api.log(`response for "${s.query}": ${data.length} tasks`, at(code, 'response for'));
            api.set('tasks', data, 'setTasks(data)', at(code, 'setTasks(data)'));
          },
          (err) => { if (err.name === 'AbortError') api.log(`"${s.query}" was aborted`, at(code, 'was aborted')); });
        if (!withAbort) return undefined;
        return () => {
          api.log(`cleanup: abort "${s.query}"`, at(code, 'cleanup: abort'));
          c.abort();
        };
      },
    };
  }

  const SCENARIOS = [
    { id: 'set-twice', group: 'State updates', title: 'Two setCount(count + 1) calls',
      note: 'The handler calls `setCount(count + 1)` twice. Both calls read `count` from the same render, so both ask for the same value.',
      code: SET_TWICE, state: { count: 0 }, until: 2000,
      render(s, api) { api.log(`render: count = ${s.count}`, at(SET_TWICE, 'console.log(`render')); return `[Count: ${s.count}]`; },
      effects: [],
      actions: [1, 2].map((n) => ({ at: n * 1000, label: 'Click the button', line: at(SET_TWICE, 'onClick'), dom: { click: 0 },
        run(s, api) {
          api.set('count', s.count + 1, 'setCount(count + 1)', at(SET_TWICE, 'setCount(count + 1)', 0));
          api.set('count', s.count + 1, 'setCount(count + 1)', at(SET_TWICE, 'setCount(count + 1)', 1));
          api.log(`clicked: count is still ${s.count}`, at(SET_TWICE, 'clicked:'));
        } })) },

    { id: 'updater', group: 'State updates', title: 'Two updater functions',
      note: 'The same handler with **updater functions**: `setCount((c) => c + 1)` says "add one to whatever the value is by then".',
      code: UPDATER, state: { count: 0 }, until: 2000,
      render(s, api) { api.log(`render: count = ${s.count}`, at(UPDATER, 'console.log(`render')); return `[Count: ${s.count}]`; },
      effects: [],
      actions: [1, 2].map((n) => ({ at: n * 1000, label: 'Click the button', line: at(UPDATER, 'onClick'), dom: { click: 0 },
        run(s, api) {
          api.set('count', (c) => c + 1, 'setCount((c) => c + 1)', at(UPDATER, 'setCount((c)', 0));
          api.set('count', (c) => c + 1, 'setCount((c) => c + 1)', at(UPDATER, 'setCount((c)', 1));
          api.log(`clicked: count is still ${s.count}`, at(UPDATER, 'clicked:'));
        } })) },

    { id: 'batching', group: 'State updates', title: 'Two state variables, one render',
      note: 'One click updates two different state variables. React waits until the handler has finished and renders **once**.',
      code: BATCHING, state: { count: 0, label: 'none' }, until: 2000,
      render(s, api) { api.log(`render: count = ${s.count}, label = ${s.label}`, at(BATCHING, 'console.log(`render')); return `[${s.label}: ${s.count}]`; },
      effects: [],
      actions: [1, 2].map((n) => ({ at: n * 1000, label: 'Click the button', line: at(BATCHING, 'onClick'), dom: { click: 0 },
        run(s, api) {
          api.set('count', (c) => c + 1, 'setCount((c) => c + 1)', at(BATCHING, 'setCount('));
          api.set('label', 'clicked', "setLabel('clicked')", at(BATCHING, 'setLabel('));
          api.log('handler finished', at(BATCHING, 'handler finished'));
        } })) },

    { id: 'deps', group: 'Effects', title: 'No array, [] and [count]',
      note: 'Three effects with different dependency arrays. Click **+1** (changes `count`), then type a letter (changes `text`), and see which effects run after each render.',
      code: DEPS, state: { count: 0, text: '' }, until: 2000,
      render(s, api) { api.log(`render: count = ${s.count}, text = "${s.text}"`, at(DEPS, 'console.log(`render')); return `[+1] [${s.text || ' '}]`; },
      effects: [
        { label: 'effect A (no array)', line: at(DEPS, 'useEffect(', 0), deps: null, setup(s, api) { api.log('A (no array): after every render', at(DEPS, "'A (no")); } },
        { label: 'effect B ([])', line: at(DEPS, 'useEffect(', 1), deps: () => [], setup(s, api) { api.log('B ([]): after the first render only', at(DEPS, "'B ([])")); } },
        { label: 'effect C ([count])', line: at(DEPS, 'useEffect(', 2), deps: (s) => [s.count], setup(s, api) { api.log(`C ([count]): count is ${s.count}`, at(DEPS, 'C ([count])')); } },
      ],
      actions: [
        { at: 1000, label: 'Click +1', line: at(DEPS, 'onClick'), dom: { click: 0 }, run(s, api) { api.set('count', s.count + 1, 'setCount(count + 1)', at(DEPS, 'onClick')); } },
        { at: 2000, label: 'Type "a" in the input', line: at(DEPS, 'onChange'), dom: { type: 'a' }, run(s, api) { api.set('text', 'a', "setText('a')", at(DEPS, 'onChange')); } },
      ] },

    { id: 'chat-room', group: 'Effects', title: 'Cleanup: connect and disconnect',
      note: 'An effect that connects to a chat room and returns a cleanup that disconnects. Change the room, then close the chat. (The parent `App` is not logged; the steps follow `ChatRoom`.)',
      code: CHAT, state: { roomId: 'general' }, until: 2000,
      render(s, api) { api.log(`render: room = ${s.roomId}`, at(CHAT, 'console.log(`render')); return `Welcome to #${s.roomId}`; },
      effects: [{ label: 'useEffect(…, [roomId])', line: at(CHAT, 'useEffect('), deps: (s) => [s.roomId],
        setup(s, api) {
          api.log(`connect to ${s.roomId}`, at(CHAT, 'connect to'));
          return () => api.log(`disconnect from ${s.roomId}`, at(CHAT, 'disconnect from'));
        } }],
      actions: [
        { at: 1000, label: 'Click "Go to #travel" (new roomId prop)', line: at(CHAT, "setRoomId('travel')"), dom: { click: 0 }, run(s, api) { api.set('roomId', 'travel', "setRoomId('travel') in App", at(CHAT, "setRoomId('travel')")); } },
        { at: 2000, label: 'Click "Close the chat": ChatRoom unmounts', line: at(CHAT, 'setShow(false)'), dom: { click: 1 }, unmount: true },
      ] },

    { id: 'no-cleanup', group: 'Effects', title: 'A forgotten cleanup',
      note: 'The effect starts an interval and never stops it. Hide the clock and keep watching the console.',
      code: NO_CLEANUP, state: { seconds: 0 }, until: 3500,
      render(s, api) { api.log(`render: seconds = ${s.seconds}`, at(NO_CLEANUP, 'console.log(`render')); return `${s.seconds} s`; },
      effects: [{ label: 'useEffect(…, [])', line: at(NO_CLEANUP, 'useEffect('), deps: () => [],
        setup(s, api) {
          api.setInterval(() => {
            api.log('tick', at(NO_CLEANUP, "console.log('tick')"));
            api.set('seconds', (x) => x + 1, 'setSeconds((s) => s + 1)', at(NO_CLEANUP, 'setSeconds('));
          }, 1000, at(NO_CLEANUP, 'setInterval('));
        } }],
      actions: [{ at: 1500, label: 'Click "Hide the clock": Clock unmounts', line: at(NO_CLEANUP, 'setShow(false)'), dom: { click: 0 }, unmount: true }] },

    { id: 'stale-interval', group: 'Intervals and closures', title: 'A stale closure in an interval',
      note: 'The interval callback was created in the **first** render, so it reads the `count` of that render forever, while the button shows the real value.',
      code: STALE, state: { count: 0 }, until: 2500,
      render(s, api) { api.log(`render: count = ${s.count}`, at(STALE, 'console.log(`render')); return `[Count: ${s.count}]`; },
      effects: [{ label: 'useEffect(…, [])', line: at(STALE, 'useEffect('), deps: () => [],
        setup(s, api) {
          const id = api.setInterval(() => api.log(`tick: the interval sees count = ${s.count}`, at(STALE, 'tick:')), 1000, at(STALE, 'setInterval('));
          return () => api.clearInterval(id, at(STALE, 'clearInterval'));
        } }],
      actions: [500, 1500].map((ms) => ({ at: ms, label: 'Click the button', line: at(STALE, 'onClick'), dom: { click: 0 }, run(s, api) { api.set('count', s.count + 1, 'setCount(count + 1)', at(STALE, 'onClick')); } })) },

    { id: 'interval-deps', group: 'Intervals and closures', title: 'Fix 1: [count] restarts the interval',
      note: 'With `count` in the array, every change of `count` clears the old interval and starts a new one that sees the new value.',
      code: INTERVAL_DEPS, state: { count: 0 }, until: 3000,
      render(s, api) { api.log(`render: count = ${s.count}`, at(INTERVAL_DEPS, 'console.log(`render')); return `[Count: ${s.count}]`; },
      effects: [{ label: 'useEffect(…, [count])', line: at(INTERVAL_DEPS, 'useEffect('), deps: (s) => [s.count],
        setup(s, api) {
          api.log(`start interval (count = ${s.count})`, at(INTERVAL_DEPS, 'start interval'));
          const id = api.setInterval(() => api.log(`tick: count = ${s.count}`, at(INTERVAL_DEPS, 'tick:')), 1000, at(INTERVAL_DEPS, 'setInterval('));
          return () => {
            api.log(`clear interval (count = ${s.count})`, at(INTERVAL_DEPS, 'clear interval'));
            api.clearInterval(id, at(INTERVAL_DEPS, 'clearInterval(id)'));
          };
        } }],
      actions: [500, 1700].map((ms) => ({ at: ms, label: 'Click the button', line: at(INTERVAL_DEPS, 'onClick'), dom: { click: 0 }, run(s, api) { api.set('count', s.count + 1, 'setCount(count + 1)', at(INTERVAL_DEPS, 'onClick')); } })) },

    { id: 'interval-updater', group: 'Intervals and closures', title: 'Fix 2: an updater inside the interval',
      note: 'The interval never reads `seconds`; it hands React an updater, so one interval started once is enough.',
      code: INTERVAL_UPDATER, state: { seconds: 0 }, until: 3500,
      render(s, api) { api.log(`render: seconds = ${s.seconds}`, at(INTERVAL_UPDATER, 'console.log(`render')); return `${s.seconds} s`; },
      effects: [{ label: 'useEffect(…, [])', line: at(INTERVAL_UPDATER, 'useEffect('), deps: () => [],
        setup(s, api) {
          const id = api.setInterval(() => api.set('seconds', (x) => x + 1, 'setSeconds((s) => s + 1)', at(INTERVAL_UPDATER, 'setSeconds(')), 1000, at(INTERVAL_UPDATER, 'setInterval('));
          return () => api.clearInterval(id, at(INTERVAL_UPDATER, 'clearInterval'));
        } }],
      actions: [] },

    { id: 'strict-mount', group: 'StrictMode', title: 'StrictMode: mount, unmount, mount',
      note: 'In development, `<StrictMode>` renders every component twice and, on mount, runs each effect, its cleanup, and the effect again. A correct cleanup makes this invisible to the user.',
      code: STRICT, state: {}, until: 0, strict: true,
      render(s, api) { api.log('render', at(STRICT, "console.log('render')")); return 'Connected'; },
      effects: [{ label: 'useEffect(…, [])', line: at(STRICT, 'useEffect('), deps: () => [],
        setup(s, api) {
          api.log('connect', at(STRICT, "'connect'"));
          return () => api.log('disconnect', at(STRICT, "'disconnect'"));
        } }],
      actions: [] },

    { id: 'fetch-abort', group: 'Fetching', title: 'Fetch with AbortController',
      note: 'Each `query` starts a request; the cleanup aborts the request of the previous query. The user types a second letter while the first request is still on its way.',
      code: FETCH_ABORT, state: { query: 'e', tasks: [] }, until: 1000,
      render(s, api) { api.log(`render: query = "${s.query}", ${s.tasks.length} tasks`, at(FETCH_ABORT, 'console.log(`render')); return `[${s.query}] ${s.tasks.length} tasks`; },
      effects: [fetchEffect(FETCH_ABORT, true)],
      actions: [{ at: 100, label: 'Type "n": the input now says "en"', line: at(FETCH_ABORT, 'onChange'), dom: { type: 'en' }, run(s, api) { api.set('query', 'en', "setQuery('en')", at(FETCH_ABORT, 'onChange')); } }] },

    { id: 'fetch-race', group: 'Fetching', title: 'No cleanup: the old response wins',
      note: 'The same search without a cleanup. This time the first request is slow (600 ms) and the second is fast (300 ms).',
      code: FETCH_RACE, state: { query: 'e', tasks: [] }, until: 1000,
      render(s, api) { api.log(`render: query = "${s.query}", ${s.tasks.length} tasks`, at(FETCH_RACE, 'console.log(`render')); return `[${s.query}] ${s.tasks.length} tasks`; },
      effects: [fetchEffect(FETCH_RACE, false)],
      actions: [{ at: 100, label: 'Type "n": the input now says "en"', line: at(FETCH_RACE, 'onChange'), dom: { type: 'en' }, run(s, api) { api.set('query', 'en', "setQuery('en')", at(FETCH_RACE, 'onChange')); } }] },
  ];

  const byId = (id) => SCENARIOS.find((s) => s.id === id) || null;

  /* ---- The simulator ------------------------------------------------------------------ */

  const show = (v) => (Array.isArray(v) ? `[${v.length} item${v.length === 1 ? '' : 's'}]` : typeof v === 'string' ? `"${v}"` : String(v));
  const showState = (st) => Object.entries(st).map(([k, v]) => `${k} = ${show(v)}`).join(', ');
  const sameDeps = (a, b) => !!a && !!b && a.length === b.length && a.every((v, k) => Object.is(v, b[k]));

  function run(id, opts = {}) {
    const sc = byId(id);
    if (!sc) throw new Error(`unknown scenario ${id}`);
    const strict = !!sc.strict || !!opts.strict;
    const steps = [];
    const out = [];
    let now = 0;
    let seq = 0;
    let renders = 0;
    let state = { ...sc.state };
    let snap = { ...state };
    let screen = '';
    let mounted = false;
    let inRender = false;
    let buffered = [];
    let queue = [];
    const timeline = [];
    const micro = [];
    const timers = {};
    let timerIds = 0;
    const slots = sc.effects.map(() => ({ deps: undefined, cleanup: null }));

    const describe = (u) => `${u.name}: ${u.src}`;
    function step(kind, text, line, logs = []) {
      if (steps.length >= MAX_STEPS) throw new Error('too many steps');
      steps.push({ kind, text, line: line === undefined ? null : line, t: now, logs, out: out.slice(), state: { ...state }, screen, pending: queue.map(describe), render: renders, mounted });
    }

    const api = {
      log(text, line) {
        out.push(text);
        if (inRender) buffered.push(text);
        else step('log', `\`console.log\` prints "${text}".`, line, [text]);
      },
      set(name, value, src, line) {
        if (!mounted) {
          step('ignored', `\`${src}\` runs, but the component is no longer on the screen: React ignores the update. The code that called it is still running, which is the real leak.`, line);
          return;
        }
        queue.push({ name, value, src });
        const kind = typeof value === 'function' ? 'an **updater function**' : `the value **${show(value)}**`;
        step('queue', `\`${src}\` queues ${kind} for \`${name}\`. Nothing changes yet: the running code still sees \`${name} = ${show(snap[name])}\`.`, line);
      },
      setInterval(fn, ms, line) {
        timerIds++;
        const tid = timerIds;
        timers[tid] = { fn, ms, line, cleared: false };
        timeline.push({ at: now + ms, seq: seq++, kind: 'timer', tid });
        step('timer', `\`setInterval\` asks the browser to call the callback every ${ms} ms (timer #${tid}). The callback is a closure: it remembers the variables of **render ${renders}**.`, line);
        return tid;
      },
      clearInterval(tid, line) {
        if (timers[tid]) timers[tid].cleared = true;
        step('timer', `\`clearInterval\` stops timer #${tid}.`, line);
      },
      controller() {
        const signal = { aborted: false, requests: [] };
        return {
          signal,
          abort() {
            if (signal.aborted) return;
            signal.aborted = true;
            signal.requests.forEach((r) => {
              if (r.done) return;
              r.done = true;
              micro.push(() => {
                step('network', `The request for \`${r.url}\` is cancelled: its promise rejects with an \`AbortError\`, so \`.catch\` runs (in a microtask, after the effects).`, r.line);
                r.onError({ name: 'AbortError' });
              });
            });
          },
        };
      },
      fetch(url, o, onData, onError) {
        const r = { url, line: o.line, data: o.data, onData, onError: onError || (() => {}), done: false };
        if (o.signal) o.signal.requests.push(r);
        timeline.push({ at: now + (o.ms || 300), seq: seq++, kind: 'response', req: r });
        step('network', `\`fetch\` sends \`GET ${url}\`${o.signal ? ' with the controller\'s signal' : ''}. The response will take ${o.ms || 300} ms; the code goes on without waiting.`, o.line);
      },
    };

    function renderOnce(extra) {
      inRender = true;
      buffered = [];
      const s = { ...state };
      const ui = sc.render(s, api);
      inRender = false;
      const logs = buffered;
      buffered = [];
      return { s, ui, logs, extra };
    }

    function render(first) {
      renders++;
      const r = renderOnce();
      step('render', first
        ? `**Render ${renders}** (mount): React calls the component with the initial state: ${showState(r.s) || 'no state'}. It returns a description of the screen.`
        : `**Render ${renders}**: React calls the component again. This render's snapshot: ${showState(r.s)}. Every variable and function created now sees these values.`, null, r.logs);
      if (strict) {
        const again = renderOnce();
        step('strict', `StrictMode (development only) calls the component a **second time** with the same state and throws the result away, to expose impure render code.`, null, again.logs);
      }
      return r;
    }

    function commit(r) {
      screen = r.ui;
      snap = r.s;
      step('commit', `**Commit**: React updates the real page (the DOM) to match. The screen shows: ${r.ui}.`);
    }

    function runEffects(first) {
      const s = snap;
      const plan = sc.effects.map((e, k) => {
        const deps = e.deps ? e.deps(s) : null;
        const prev = slots[k].deps;
        let why;
        let go = true;
        if (first) why = 'first render: every effect runs once';
        else if (deps === null) why = 'no dependency array: it runs after every render';
        else if (sameDeps(prev, deps)) { go = false; why = deps.length ? `its dependencies [${deps.map(show).join(', ')}] did not change` : 'its array is empty: only after the first render'; }
        else why = `a dependency changed: [${prev.map(show).join(', ')}] → [${deps.map(show).join(', ')}]`;
        return { e, k, deps, go, why };
      });
      plan.filter((p) => !p.go).forEach((p) => step('skip', `\`${p.e.label}\` is skipped: ${p.why}.`, p.e.line));
      plan.filter((p) => p.go && slots[p.k].cleanup).forEach((p) => {
        const c = slots[p.k].cleanup;
        slots[p.k].cleanup = null;
        step('cleanup', `**Cleanup** of \`${p.e.label}\` from the previous run, before the effect runs again. It is the function that run returned, so it sees the **old** values.`, p.e.line);
        c();
      });
      plan.filter((p) => p.go).forEach((p) => {
        step('effect', `**Effect** \`${p.e.label}\` runs after the commit (${p.why}).`, p.e.line);
        const c = p.e.setup(s, api);
        slots[p.k].deps = p.deps;
        slots[p.k].cleanup = typeof c === 'function' ? c : null;
      });
      if (first && strict && sc.effects.length) {
        step('strict', 'StrictMode (development only) now **simulates an unmount and a remount**: it runs every cleanup, then every effect again. If the cleanup undoes the setup, the user sees no difference.');
        sc.effects.forEach((e, k) => {
          if (!slots[k].cleanup) return;
          const c = slots[k].cleanup;
          slots[k].cleanup = null;
          step('cleanup', `**Cleanup** of \`${e.label}\` (StrictMode's simulated unmount).`, e.line);
          c();
        });
        sc.effects.forEach((e, k) => {
          step('effect', `**Effect** \`${e.label}\` runs again (StrictMode's simulated remount).`, e.line);
          const c = e.setup(s, api);
          slots[k].cleanup = typeof c === 'function' ? c : null;
        });
      }
    }

    function flush(depth = 0) {
      if (!queue.length || depth > 20) return;
      const next = { ...state };
      const chains = {};
      queue.forEach((u) => {
        const before = next[u.name];
        next[u.name] = typeof u.value === 'function' ? u.value(before) : u.value;
        (chains[u.name] = chains[u.name] || [show(before)]).push(show(next[u.name]));
      });
      queue = [];
      const changed = Object.keys(next).some((k) => !Object.is(next[k], state[k]));
      const text = Object.entries(chains).map(([k, c]) => `\`${k}\`: ${c.join(' → ')}`).join('; ');
      if (!changed) {
        step('bail', `React processes the queue (${text}). The new state equals the current one, so React **skips the render**.`);
        return;
      }
      state = next;
      step('process', `The code that queued the updates has finished. React processes the whole queue, in order: ${text}. One re-render for all of it (batching).`);
      const r = render(false);
      commit(r);
      runEffects(false);
      flush(depth + 1);
    }

    function drainMicro() {
      while (micro.length) {
        micro.shift()();
        flush();
      }
    }

    function unmount() {
      step('unmount', 'The parent stops rendering this component: React **unmounts** it and runs every cleanup.');
      sc.effects.forEach((e, k) => {
        const c = slots[k].cleanup;
        slots[k].cleanup = null;
        if (!c) return;
        step('cleanup', `**Cleanup** of \`${e.label}\` (unmount).`, e.line);
        c();
      });
      mounted = false;
      screen = '(nothing: the component is gone)';
      step('commit', 'The component is removed from the page.');
    }

    // Mount
    mounted = true;
    const first = render(true);
    commit(first);
    runEffects(true);
    flush();
    drainMicro();

    sc.actions.forEach((a) => timeline.push({ at: a.at, seq: seq++, kind: 'action', a }));
    let guard = 0;
    while (timeline.length && guard++ < 200) {
      timeline.sort((x, y) => x.at - y.at || x.seq - y.seq);
      const item = timeline.shift();
      if (item.at > sc.until) break;
      now = item.at;
      if (item.kind === 'action') {
        const a = item.a;
        step('event', `**Event**: ${a.label}.${a.unmount ? '' : ' React calls the handler from the last render, which sees that render\'s values.'}`, a.line);
        if (a.unmount) unmount();
        else a.run(snap, api);
      } else if (item.kind === 'timer') {
        const tm = timers[item.tid];
        if (tm.cleared) continue;
        step('timer', `Timer #${item.tid} fires (t = ${now} ms) and runs its callback${mounted ? '' : ', even though the component is gone'}.`, tm.line);
        tm.fn();
        timeline.push({ at: now + tm.ms, seq: seq++, kind: 'timer', tid: item.tid });
      } else if (item.kind === 'response') {
        const r = item.req;
        if (r.done) continue;
        r.done = true;
        step('network', `The response for \`${r.url}\` arrives: ${r.data.length} tasks.`, r.line);
        r.onData(r.data);
      }
      // Timers and responses due at the same moment run one after another before React
      // renders (updates outside an event are batched too): one render for all of them.
      timeline.sort((x, y) => x.at - y.at || x.seq - y.seq);
      const next = timeline[0];
      if (item.kind !== 'action' && next && next.at === item.at && next.kind !== 'action') continue;
      flush();
      drainMicro();
    }
    return { scenario: sc, strict, steps, out };
  }

  /* ---- "Predict the console" challenges ------------------------------------------------- */

  /* wrong: hand-written wrong logs (common misconceptions); the right one comes from run().
     pos: where the right answer goes among the choices. */
  const CHALLENGES = [
    { id: 'p-set-twice', scenario: 'set-twice', pos: 1,
      title: 'Two setCount(count + 1)',
      why: 'Both calls read `count = 0` from the same render, so both queue "set to 1". The log inside the handler still prints the old value: state is a snapshot. Each click adds **1**, not 2.',
      wrong: [
        ['render: count = 0', 'clicked: count is still 2', 'render: count = 2', 'clicked: count is still 4', 'render: count = 4'],
        ['render: count = 0', 'clicked: count is still 0', 'render: count = 2', 'clicked: count is still 2', 'render: count = 4'],
        ['render: count = 0', 'render: count = 1', 'clicked: count is still 1', 'render: count = 2', 'clicked: count is still 2'],
      ] },
    { id: 'p-updater', scenario: 'updater', pos: 2,
      title: 'Two updater functions',
      why: 'Each updater receives the result of the previous one (0 → 1 → 2), so a click adds 2. The handler\'s `count` is still the snapshot of the render that created it.',
      wrong: [
        ['render: count = 0', 'clicked: count is still 0', 'render: count = 1', 'clicked: count is still 1', 'render: count = 2'],
        ['render: count = 0', 'clicked: count is still 2', 'render: count = 2', 'clicked: count is still 4', 'render: count = 4'],
        ['render: count = 0', 'render: count = 1', 'render: count = 2', 'clicked: count is still 0'],
      ] },
    { id: 'p-batching', scenario: 'batching', pos: 0,
      title: 'Two state variables in one click',
      why: 'React batches every update of the event and renders **once** after the handler finishes: one render per click, not one per `set` call.',
      wrong: [
        ['render: count = 0, label = none', 'render: count = 1, label = none', 'render: count = 1, label = clicked', 'handler finished', 'render: count = 2, label = clicked', 'handler finished'],
        ['render: count = 0, label = none', 'render: count = 1, label = clicked', 'handler finished', 'render: count = 2, label = clicked', 'handler finished'],
      ] },
    { id: 'p-deps', scenario: 'deps', pos: 1,
      title: 'Which effects run?',
      why: 'On mount every effect runs. After the click, A (no array) and C (`count` changed) run; B never runs again. After typing, only A runs: `count` did not change.',
      wrong: [
        ['render: count = 0, text = ""', 'A (no array): after every render', 'render: count = 1, text = ""', 'A (no array): after every render', 'C ([count]): count is 1', 'render: count = 1, text = "a"', 'A (no array): after every render'],
        ['A (no array): after every render', 'B ([]): after the first render only', 'C ([count]): count is 0', 'render: count = 0, text = ""', 'A (no array): after every render', 'C ([count]): count is 1', 'render: count = 1, text = ""', 'A (no array): after every render', 'render: count = 1, text = "a"'],
        ['render: count = 0, text = ""', 'A (no array): after every render', 'B ([]): after the first render only', 'C ([count]): count is 0', 'render: count = 1, text = ""', 'A (no array): after every render', 'C ([count]): count is 1', 'render: count = 1, text = "a"', 'A (no array): after every render', 'C ([count]): count is 1'],
      ] },
    { id: 'p-chat', scenario: 'chat-room', pos: 2,
      title: 'Changing room, then closing',
      why: 'The cleanup runs **before** the next effect and sees the values of its own render: it disconnects from `general`, then the new effect connects to `travel`. Unmounting runs the last cleanup.',
      wrong: [
        ['render: room = general', 'connect to general', 'render: room = travel', 'connect to travel', 'disconnect from general', 'disconnect from travel'],
        ['render: room = general', 'connect to general', 'render: room = travel', 'disconnect from travel', 'connect to travel', 'disconnect from travel'],
        ['render: room = general', 'connect to general', 'render: room = travel', 'connect to travel'],
      ] },
    { id: 'p-stale', scenario: 'stale-interval', pos: 0,
      title: 'The interval and the button',
      why: 'The effect ran once, in render 1, so its interval callback closes over `count = 0` forever: a **stale closure**. The button re-renders with the new value, the interval does not see it.',
      wrong: [
        ['render: count = 0', 'render: count = 1', 'tick: the interval sees count = 1', 'render: count = 2', 'tick: the interval sees count = 2'],
        ['render: count = 0', 'render: count = 1', 'tick: the interval sees count = 0', 'render: count = 2', 'tick: the interval sees count = 2'],
      ] },
    { id: 'p-strict', scenario: 'strict-mount', pos: 1,
      title: 'StrictMode on mount',
      why: 'In development StrictMode renders twice, then runs the effect, its cleanup and the effect again. In a production build you would see `render` and `connect` once.',
      wrong: [
        ['render', 'connect'],
        ['render', 'connect', 'render', 'connect'],
        ['render', 'render', 'connect', 'connect'],
      ] },
    { id: 'p-abort', scenario: 'fetch-abort', pos: 2,
      title: 'Typing while a request is on its way',
      why: 'Typing re-renders with `query = "en"`; the cleanup of the old effect aborts the "e" request, then the new effect starts "en". The `AbortError` reaches `.catch` right after. Only the "en" response ever calls `setTasks`.',
      wrong: [
        ['render: query = "e", 0 tasks', 'fetch "e"', 'render: query = "en", 0 tasks', 'fetch "en"', 'response for "e": 4 tasks', 'render: query = "en", 4 tasks', 'response for "en": 1 tasks', 'render: query = "en", 1 tasks'],
        ['render: query = "e", 0 tasks', 'fetch "e"', 'render: query = "en", 0 tasks', 'fetch "en"', 'cleanup: abort "e"', '"e" was aborted', 'response for "en": 1 tasks', 'render: query = "en", 1 tasks'],
        ['render: query = "e", 0 tasks', 'fetch "e"', 'render: query = "en", 0 tasks', 'cleanup: abort "en"', 'fetch "en"', 'response for "en": 1 tasks', 'render: query = "en", 1 tasks'],
      ] },
    { id: 'p-race', scenario: 'fetch-race', pos: 0,
      title: 'Without a cleanup, who wins?',
      why: 'Nothing cancels the slow "e" request, so it arrives **last** and overwrites the "en" results: the input says "en" but the list shows 4 tasks. A cleanup (abort or an ignore flag) prevents it.',
      wrong: [
        ['render: query = "e", 0 tasks', 'fetch "e"', 'render: query = "en", 0 tasks', 'fetch "en"', 'response for "en": 1 tasks', 'render: query = "en", 1 tasks'],
        ['render: query = "e", 0 tasks', 'fetch "e"', 'render: query = "en", 0 tasks', 'fetch "en"', 'response for "e": 4 tasks', 'render: query = "en", 4 tasks', 'response for "en": 1 tasks', 'render: query = "en", 1 tasks'],
      ] },
  ];

  const answer = (challengeId) => {
    const c = CHALLENGES.find((x) => x.id === challengeId);
    return c ? run(c.scenario).out : [];
  };

  /* The choices of a challenge: the wrong logs with the right one inserted at `pos`. */
  function choices(challengeId) {
    const c = CHALLENGES.find((x) => x.id === challengeId);
    if (!c) return [];
    const list = c.wrong.map((w) => w.slice());
    list.splice(Math.min(c.pos, list.length), 0, answer(c.id));
    return list;
  }

  const check = (challengeId, index) => {
    const c = CHALLENGES.find((x) => x.id === challengeId);
    return !!c && index === Math.min(c.pos, c.wrong.length);
  };

  return { run, byId, choices, check, answer, SCENARIOS, CHALLENGES, MAX_STEPS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = RenderCycleEngine;
