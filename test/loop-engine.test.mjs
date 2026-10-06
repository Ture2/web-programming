// Unit tests for the loop tracer's simulation (site/js/tools/loop-engine.js).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LoopEngine = require('../js/tools/loop-engine.js');

const last = (run) => run.steps[run.steps.length - 1];

test('count: prints 0..4 then done', () => {
  const run = LoopEngine.trace('count', { start: 0, end: 5, step: 1, cmp: '<' });
  assert.equal(run.error, null);
  assert.equal(run.truncated, false);
  assert.deepEqual(last(run).out, ['0', '1', '2', '3', '4', 'done']);
  assert.equal(last(run).phase, 'after');
});

test('count: the last check is false and runs once more than the body', () => {
  const run = LoopEngine.trace('count', { start: 0, end: 3, step: 1, cmp: '<' });
  const checks = run.steps.filter((s) => s.phase === 'check');
  const bodies = run.steps.filter((s) => s.phase === 'body');
  assert.equal(checks.length, bodies.length + 1);
  assert.equal(checks[checks.length - 1].cond.value, false);
  assert.equal(checks[checks.length - 1].vars.i, 3);
});

test('count: <= includes the end value', () => {
  const run = LoopEngine.trace('count', { start: 1, end: 3, step: 1, cmp: '<=' });
  assert.deepEqual(last(run).out, ['1', '2', '3', 'done']);
});

test('count: a condition false at the start never runs the body', () => {
  const run = LoopEngine.trace('count', { start: 10, end: 5, step: 1, cmp: '<' });
  assert.equal(run.steps.filter((s) => s.phase === 'body').length, 0);
  assert.deepEqual(last(run).out, ['done']);
});

test('count: step 0 is an infinite loop and is truncated', () => {
  const run = LoopEngine.trace('count', { start: 0, end: 5, step: 0, cmp: '<' });
  assert.equal(run.truncated, true);
  assert.equal(run.steps.length, LoopEngine.MAX_STEPS);
});

test('count: wrong direction (> with a growing i) is infinite', () => {
  const run = LoopEngine.trace('count', { start: 1, end: 0, step: 1, cmp: '>' });
  assert.equal(run.truncated, true);
});

test('sum: 1 + 2 + 3 + 4 = 10', () => {
  const run = LoopEngine.trace('sum', { n: 4 });
  assert.deepEqual(last(run).out, ['10']);
  assert.equal(last(run).vars.total, 10);
});

test('countdown: 3, 2, 1, Liftoff!', () => {
  const run = LoopEngine.trace('countdown', { start: 3, step: 1 });
  assert.deepEqual(last(run).out, ['3', '2', '1', 'Liftoff!']);
});

test('countdown: a step of 2 overshoots to a negative n and still stops', () => {
  const run = LoopEngine.trace('countdown', { start: 5, step: 2 });
  assert.deepEqual(last(run).out, ['5', '3', '1', 'Liftoff!']);
  assert.equal(last(run).vars.n, -1);
});

test('forof: lengths of each word', () => {
  const run = LoopEngine.trace('forof', { words: ['cat', 'horse', 'ox'] });
  assert.deepEqual(last(run).out, ['[ 3, 5, 2 ]']);
});

test('forof: empty array gives an empty result', () => {
  const run = LoopEngine.trace('forof', { words: [] });
  assert.deepEqual(last(run).out, ['[]']);
});

test('nested: 2 × 3 times table', () => {
  const run = LoopEngine.trace('nested', { rows: 2, cols: 3 });
  assert.equal(run.truncated, false);
  assert.deepEqual(last(run).out, ['1 2 3 ', '2 4 6 ']);
});

test('invalid parameters report an error instead of throwing', () => {
  const run = LoopEngine.trace('count', { start: 'abc', end: 5, step: 1, cmp: '<' });
  assert.match(run.error, /start/);
  assert.equal(LoopEngine.trace('nope').error, 'Unknown loop nope');
});

test('every step lists line numbers inside the code', () => {
  for (const id of Object.keys(LoopEngine.TEMPLATES)) {
    const run = LoopEngine.trace(id);
    assert.ok(run.steps.length > 0, id);
    run.steps.forEach((s) => assert.ok(s.line >= 0 && s.line < run.code.length, `${id} line ${s.line}`));
  }
});
