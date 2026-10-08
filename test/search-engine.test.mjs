// Unit tests for the search engine (site/js/search-engine.js): tokenizing, ranking on titles
// and keywords only, prefix and typo matching, accents, the AND-then-OR fallback, the topic
// filter, key terms and the recent-search list.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../js/search-engine.js');

const docs = [
  { title: 'Flexbox layout', keywords: 'Flexbox · main axis · justify-content', summary: 'One-dimensional layout along a main axis.', sectionId: 'css' },
  { title: 'CSS Grid', keywords: 'Grid · rows · columns · grid-template-columns', summary: 'Two-dimensional layout in tracks.', sectionId: 'css' },
  { title: 'Fetching data', keywords: 'fetch · async · error state', summary: 'Calling an API from the front end.', sectionId: 'data-fetching' },
  { title: 'Cómo funciona la caché', keywords: '', summary: 'Accented words fold.', sectionId: 'overview' },
  { title: 'Response headers', keywords: 'headers · Content-Type', summary: 'Every layout of a response starts with headers.', sectionId: 'overview' },
];
const index = S.create(docs);
const titles = (q, opts) => index.search(q, opts).hits.map((h) => h.doc.title);

test('tokenize folds accents and case and drops single letters', () => {
  assert.deepEqual(S.tokenize('Cómo A b2 flex-wrap'), ['como', 'b2', 'flex', 'wrap']);
});

test('plain strips markdown markers', () => {
  assert.equal(S.plain('a **bold** `code`  word'), 'a bold code word');
});

test('keyTerms returns the bold and code spans of a summary, once each', () => {
  assert.deepEqual(S.keyTerms('A CSS **rule** pairs a `selector` with **declarations**; a **rule** again, **`useState`** too.'), ['rule', 'selector', 'declarations', 'useState']);
  assert.deepEqual(S.keyTerms(''), []);
  assert.deepEqual(S.keyTerms(undefined), []);
});

test('remember puts the newest search first, once, and keeps at most max', () => {
  assert.deepEqual(S.remember(['grid', 'fetch'], 'flexbox'), ['flexbox', 'grid', 'fetch']);
  assert.deepEqual(S.remember(['grid', 'Caché', 'fetch'], '  cache '), ['cache', 'grid', 'fetch']);
  assert.deepEqual(S.remember(['a1', 'a2', 'a3'], 'a4', 3), ['a4', 'a1', 'a2']);
  assert.deepEqual(S.remember(['grid'], '   '), ['grid']);
});

test('an exact word finds its document first', () => {
  assert.equal(titles('flexbox')[0], 'Flexbox layout');
});

test('a prefix matches', () => {
  assert.equal(titles('fetc')[0], 'Fetching data');
});

test('one typo is tolerated for words of 4+ letters', () => {
  assert.equal(titles('flexbxo')[0], 'Flexbox layout');
  assert.equal(titles('layuot')[0], 'Flexbox layout');
});

test('accents are ignored in both directions', () => {
  assert.equal(titles('cache')[0], 'Cómo funciona la caché');
  assert.equal(titles('cómo')[0], 'Cómo funciona la caché');
});

test('the summary is shown but never searched', () => {
  assert.deepEqual(titles('dimensional'), []);
  assert.deepEqual(titles('layout'), ['Flexbox layout']);   // "layout" is in three summaries, one title
});

test('keywords are searched, and a title match outranks a keyword match', () => {
  assert.equal(titles('justify')[0], 'Flexbox layout');
  assert.deepEqual(titles('headers'), ['Response headers']);
  const both = S.create([{ title: 'Columns', keywords: '' }, { title: 'Tables', keywords: 'columns' }]);
  assert.deepEqual(both.search('columns').hits.map((h) => h.doc.title), ['Columns', 'Tables']);
});

test('all words must match; otherwise any word does', () => {
  assert.deepEqual(titles('grid columns'), ['CSS Grid']);
  assert.ok(titles('grid fetch').length >= 2);
});

test('where keeps only the documents of a topic', () => {
  assert.deepEqual(titles('grid fetch', { where: (d) => d.sectionId === 'css' }), ['CSS Grid']);
  assert.deepEqual(titles('fetch', { where: (d) => d.sectionId === 'css' }), []);
  assert.equal(titles('flexbox', { limit: 1 }).length, 1);
});

test('unknown words give no results', () => {
  assert.deepEqual(index.search('zzzqqq'), { hits: [], words: [] });
  assert.deepEqual(index.search('   '), { hits: [], words: [] });
});

test('snippets come from the summary and surround the match', () => {
  const h = index.search('flexbox').hits[0];
  assert.equal(h.snippet.before, 'One-dimensional layout along a main axis.');
  assert.equal(index.search('main axis').hits[0].snippet.hit, 'main');
});
