// Unit tests for the search engine (site/js/search-engine.js): tokenizing, ranking,
// prefix and typo matching, accents, and the AND-then-OR fallback.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../js/search-engine.js');

const docs = [
  { title: 'Flexbox layout', summary: 'One-dimensional layout with a main axis.', body: 'justify-content aligns items along the main axis' },
  { title: 'CSS Grid', summary: 'Two-dimensional layout in rows and columns.', body: 'grid-template-columns defines the tracks' },
  { title: 'Fetching data', summary: 'Calling an API from the front end.', body: 'use fetch with async await and handle the error state' },
  { title: 'Cómo funciona la caché', summary: 'Accented words fold.', body: '' },
];
const index = S.create(docs);
const titles = (q) => index.search(q).hits.map((h) => h.doc.title);

test('tokenize folds accents and case and drops single letters', () => {
  assert.deepEqual(S.tokenize('Cómo A b2 flex-wrap'), ['como', 'b2', 'flex', 'wrap']);
});

test('plain strips markdown markers', () => {
  assert.equal(S.plain('a **bold** `code`  word'), 'a bold code word');
});

test('strings collects nested strings and honours the skip set', () => {
  const out = S.strings({ id: 'x', body: ['one', { text: 'two' }], live: { code: 'no' } }, new Set(['id', 'live']));
  assert.deepEqual(out, ['one', 'two']);
});

test('an exact word finds its document first', () => {
  assert.equal(titles('flexbox')[0], 'Flexbox layout');
});

test('a prefix matches', () => {
  assert.equal(titles('fetc')[0], 'Fetching data');
});

test('one typo is tolerated for words of 4+ letters', () => {
  assert.equal(titles('flexbxo')[0], 'Flexbox layout');
  assert.equal(titles('layuot').length, 2);
});

test('accents are ignored in both directions', () => {
  assert.equal(titles('cache')[0], 'Cómo funciona la caché');
  assert.equal(titles('cómo')[0], 'Cómo funciona la caché');
});

test('a title match outranks a body match', () => {
  assert.equal(titles('layout')[0], 'Flexbox layout');
});

test('all words must match; otherwise any word does', () => {
  assert.deepEqual(titles('grid columns'), ['CSS Grid']);
  assert.ok(titles('grid fetch').length >= 2);
});

test('unknown words give no results', () => {
  assert.deepEqual(index.search('zzzqqq'), { hits: [], words: [] });
  assert.deepEqual(index.search('   '), { hits: [], words: [] });
});

test('snippets surround the match', () => {
  const h = index.search('tracks').hits[0];
  assert.equal(h.snippet.hit, 'tracks');
});
