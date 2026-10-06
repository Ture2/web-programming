// Specificity engine (site/js/tools/specificity-engine.js). Run: node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../js/tools/specificity-engine.js');

const cases = [
  ['*', [0, 0, 0]],
  ['p', [0, 0, 1]],
  ['div p', [0, 0, 2]],
  ['ul > li + li ~ li', [0, 0, 4]],
  ['.lead', [0, 1, 0]],
  ['p.lead.note', [0, 2, 1]],
  ['#intro', [1, 0, 0]],
  ['#page .article p#intro', [2, 1, 1]],
  ['a[href^="http"]', [0, 1, 1]],
  ['input[type="text" i]', [0, 1, 1]],
  ['a:hover', [0, 1, 1]],
  ['li:nth-child(2n+1)', [0, 1, 1]],
  ['p::before', [0, 0, 2]],
  ['p:before', [0, 0, 2]],
  ['p::first-line', [0, 0, 2]],
  [':where(#a, .b) p', [0, 0, 1]],
  [':is(#a, .b) p', [1, 0, 1]],
  ['a:not(.active)', [0, 1, 1]],
  [':not(#x, p)', [1, 0, 0]],
  ['div:has(> img.hero)', [0, 1, 2]],
  ['li:nth-child(2 of .item)', [0, 2, 1]],
  ['svg|rect', [0, 0, 1]],
  ['.a, #b, c', [1, 0, 0]],
  ['nav a[aria-current="page"]:focus-visible', [0, 2, 2]],
];

for (const [sel, expected] of cases) {
  test(`specificity(${sel})`, () => assert.deepEqual(S.specificity(sel), expected));
}

test('list() gives one entry per selector in a list', () => {
  assert.deepEqual(S.list('h1, .title, #main a'), [
    { selector: 'h1', spec: [0, 0, 1] },
    { selector: '.title', spec: [0, 1, 0] },
    { selector: '#main a', spec: [1, 0, 1] },
  ]);
});

test('commas inside :is() and attribute values do not split the list', () => {
  assert.equal(S.list(':is(h1, h2) a[title="a, b"]').length, 1);
});

test('compare(): ids beat any number of classes; classes beat any number of types', () => {
  assert.ok(S.compare([1, 0, 0], [0, 12, 0]) > 0);
  assert.ok(S.compare([0, 1, 0], [0, 0, 9]) > 0);
  assert.ok(S.compare([0, 2, 1], [0, 2, 3]) < 0);
  assert.equal(S.compare([0, 1, 1], [0, 1, 1]), 0);
});

test('explain() labels every part', () => {
  const kinds = S.explain('nav > a.active:hover::after').map((p) => p.kind);
  assert.deepEqual(kinds, ['type', 'combinator', 'type', 'class', 'pseudo-class', 'pseudo-element']);
});

test('format()', () => assert.equal(S.format([1, 2, 3]), '(1, 2, 3)'));
