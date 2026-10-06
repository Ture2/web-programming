// Unit tests for the event-loop visualiser's simulation (site/js/tools/event-loop-engine.js).
//   node --test site/test/
// The key test runs every preset's real code with Node and checks that the engine
// predicts exactly the console output that real JavaScript produces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const EL = require('../js/tools/event-loop-engine.js');

/* Runs a program with Node as a CommonJS file and returns its console lines. */
function realOutput(code) {
  const dir = mkdtempSync(join(tmpdir(), 'event-loop-'));
  try {
    const file = join(dir, 'program.cjs');
    writeFileSync(file, code, 'utf8');
    const res = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 10000 });
    assert.equal(res.status, 0, res.stderr);
    return res.stdout.split(/\r?\n/).filter((l) => l.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const preset of EL.PRESETS) {
  test(`${preset.id}: the engine's output order matches real JavaScript`, () => {
    const run = EL.run(preset.id);
    assert.equal(run.error, null);
    assert.equal(run.truncated, false);
    assert.deepEqual(run.out, realOutput(preset.code.join('\n')));
  });
}

test('every preset: steps are well formed', () => {
  for (const preset of EL.PRESETS) {
    const run = EL.run(preset.id);
    assert.ok(run.steps.length > 3, preset.id);
    run.steps.forEach((s, k) => {
      assert.ok(s.line === null || (s.line >= 0 && s.line < preset.code.length), `${preset.id} step ${k} line ${s.line}`);
      assert.ok(typeof s.text === 'string' && s.text.length > 10, `${preset.id} step ${k} text`);
    });
    const first = run.steps[0];
    const last = run.steps[run.steps.length - 1];
    assert.deepEqual(first.stack, ['main script']);
    assert.deepEqual(last.stack, []);
    assert.deepEqual(last.micro, []);
    assert.deepEqual(last.tasks, []);
    assert.deepEqual(last.waiting, []);
    assert.deepEqual(last.out, run.out);
  }
});

test('output only ever grows, one line at a time', () => {
  for (const preset of EL.PRESETS) {
    const { steps } = EL.run(preset.id);
    for (let k = 1; k < steps.length; k++) {
      const d = steps[k].out.length - steps[k - 1].out.length;
      assert.ok(d === 0 || d === 1, `${preset.id} step ${k}`);
      assert.deepEqual(steps[k].out.slice(0, steps[k - 1].out.length), steps[k - 1].out);
    }
  }
});

test('promise: the then callback is a microtask and runs before the 0 ms timer', () => {
  const run = EL.run('promise');
  assert.deepEqual(run.out, ['script start', 'script end', 'promise', 'timeout']);
  const end = run.steps.find((s) => s.text.includes('leaves the stack'));
  assert.deepEqual(end.micro, ["then callback ('promise')"]);
  assert.deepEqual(end.tasks, ["timer callback ('timeout')"]);
});

test('nothing from a queue runs while the main script is on the stack', () => {
  for (const preset of EL.PRESETS) {
    const { steps } = EL.run(preset.id);
    const endIdx = steps.findIndex((s) => s.stack.length === 0);
    steps.slice(0, endIdx).forEach((s) => assert.equal(s.stack[0], 'main script', preset.id));
  }
});

test('chain: then 2 waits for the promise of then 1, so queueMicrotask overtakes it', () => {
  const run = EL.run('chain');
  assert.deepEqual(run.out, ['sync', 'then 1', 'microtask', 'then 2']);
  const s = run.steps.find((x) => x.waiting.some((w) => w.label === 'then 2 callback'));
  assert.ok(s, 'then 2 is shown as waiting for a pending promise');
  assert.match(s.waiting.find((w) => w.label === 'then 2 callback').detail, /first \.then/);
});

test('async: both functions run up to await before the script ends', () => {
  const run = EL.run('async');
  assert.deepEqual(run.out, ['A start', 'B start', 'sync done', 'A end', 'B end']);
});

test('delays: timers fire by due time, and the clock jumps to each one', () => {
  const run = EL.run('delays');
  assert.deepEqual(run.out, ['three timers scheduled', 'fast: 0 ms', 'medium: 50 ms', 'slow: 100 ms']);
  const times = run.steps.filter((s) => s.text.includes('waits until the next timer')).map((s) => s.now);
  assert.deepEqual(times, [50, 100]);
});

test('blocking: the timer expires during the loop but runs 200 ms late', () => {
  const run = EL.run('blocking');
  const busy = run.steps.find((s) => s.text.includes('busy for 200 ms'));
  assert.equal(busy.now, 200);
  assert.deepEqual(busy.tasks, ['timer callback']);
  assert.ok(run.steps.some((s) => /due at 0 ms but runs at 200 ms/.test(s.text)));
});

test('sleep: the await continuation waits next to the pending promise, then becomes a microtask', () => {
  const run = EL.run('sleep');
  assert.deepEqual(run.out, ['waiting...', 'main() returned a promise', 'timer: 50 ms', '100 ms later']);
  assert.ok(run.steps.some((s) => s.waiting.some((w) => w.label === 'main() after await')));
  assert.ok(run.steps.some((s) => s.micro.includes('main() after await') && s.now === 100));
});

test('node: nextTick before promises; setTimeout 0 counts as 1 ms', () => {
  assert.deepEqual(EL.run('ticks').out, ['sync', 'nextTick', 'promise', 'setImmediate', 'setTimeout 50 ms']);
  const run = EL.run('in-timer');
  assert.deepEqual(run.out, ['outer timer', 'nextTick', 'setImmediate', 'setTimeout 0']);
  const scheduled = run.steps.find((s) => s.waiting.length);
  assert.match(scheduled.waiting[0].detail, /Node: 1 ms/);
});

test('node presets only use Node-only APIs on the node tab', () => {
  for (const preset of EL.PRESETS) {
    const src = preset.code.join('\n');
    const nodeOnly = /process\.nextTick|setImmediate/.test(src);
    assert.equal(nodeOnly, preset.tab === 'node', preset.id);
  }
});

test('challenges: valid presets, unique lines, scrambled start, checking', () => {
  assert.ok(EL.CHALLENGES.length >= 6);
  const ids = new Set();
  for (const c of EL.CHALLENGES) {
    assert.ok(!ids.has(c.id), c.id);
    ids.add(c.id);
    assert.ok(EL.byId(c.preset), c.preset);
    const lines = EL.answer(c.id);
    assert.equal(new Set(lines).size, lines.length, `${c.id}: duplicate console lines`);
    const start = EL.scrambled(c.id);
    assert.deepEqual(start.slice().sort((a, b) => a - b), lines.map((_, k) => k));
    assert.equal(EL.check(c.id, start).ok, false, `${c.id} starts solved`);
    assert.equal(EL.check(c.id, lines.map((_, k) => k)).ok, true);
  }
  const r = EL.check('promise-vs-timeout', [0, 1, 3, 2]);
  assert.deepEqual(r.right, [true, true, false, false]);
  assert.equal(r.score, 2);
});

test('unknown preset reports an error instead of throwing', () => {
  assert.equal(EL.run('nope').error, 'Unknown program nope');
});
