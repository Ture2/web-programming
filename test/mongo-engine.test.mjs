// Unit tests for the document query playground's in-memory engine (site/js/tools/mongo-engine.js).
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../js/tools/mongo-engine.js');

/* Runs the source on a database (fresh seed by default) and returns the last result. */
const last = (src, db = M.createDb()) => { const r = M.run(db, src).results; return r[r.length - 1]; };
const titles = (src, db) => { const r = last(src, db); assert.ok(r.ok, r.error && r.error.message); return r.docs.map((d) => d.title); };
const err = (src, db) => { const r = last(src, db); assert.equal(r.ok, false, `expected an error for ${src}`); return r.error; };

/* ---- Parser ---------------------------------------------------------------------- */

test('parseValue: relaxed literals (unquoted keys, both quotes, numbers, nesting)', () => {
  const v = M.parseValue("{ a: 1, 'b c': \"x\", $gt: -2.5e1, ok: true, no: false, nil: null, list: [1, 'two', { deep: [] },], }");
  assert.deepEqual(v, { a: 1, 'b c': 'x', $gt: -25, ok: true, no: false, nil: null, list: [1, 'two', { deep: [] }] });
});

test('parseValue: escapes, ObjectId, ISODate, new Date and regex literals', () => {
  assert.equal(M.parseValue("'it\\'s\\n'"), "it's\n");
  const id = M.parseValue("ObjectId('650f1c2a9b3e4d5f6a7b8c9d')");
  assert.ok(id instanceof M.ObjectId);
  assert.equal(id.hex, '650f1c2a9b3e4d5f6a7b8c9d');
  assert.ok(M.parseValue('new ObjectId()') instanceof M.ObjectId);
  assert.equal(M.parseValue("ISODate('2026-09-01')").toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(M.parseValue("new Date('2026-09-01T10:30:00Z')").toISOString(), '2026-09-01T10:30:00.000Z');
  const re = M.parseValue('/^wr[a-z]+ \\/x/i');
  assert.ok(re instanceof RegExp);
  assert.equal(re.flags, 'i');
  assert.ok(re.test('Write /x'));
});

test('parseValue: comments are skipped', () => {
  assert.deepEqual(M.parseValue('{ /* block */ a: 1, // line\n b: 2 }'), { a: 1, b: 2 });
});

test('parse errors point at the problem and explain it', () => {
  const dot = err("db.tasks.find({ owner.name: 'Ben' })");
  assert.match(dot.message, /must be quoted: write 'owner\.name'/);
  assert.equal(dot.col, 17);
  assert.equal(dot.excerpt.split('\n')[1], `${' '.repeat(16)}^`);
  assert.match(err('db.tasks.find({ done = false })').message, /Use `:`/);
  assert.match(err('db.tasks.find({ done: false }').message, /Expected `\)` to close find\(/);
  assert.match(err('db.tasks.find({ done: false )').message, /Expected `,` or `}`/);
  assert.match(err('db.tasks.find({ done: flase })').message, /Unknown value `flase`/);
  assert.match(err('db.tasks.find(done: false)').message, /wrap it in braces/);
  assert.match(err("db.tasks.find({ title: 'Buy milk })").message, /string is not closed/);
  assert.match(err('db.tasks.find({ a: 1, a: 2 })').message, /appears twice/);
  assert.match(err("db.tasks.find({ _id: ObjectId('123') })").message, /24 hexadecimal/);
  assert.match(err('tasks.find()').message, /start with `db`/);
  assert.match(err('db.tasks').message, /call a method on it/);
  assert.match(err('db.tasks.find').message, /parentheses/);
  assert.match(err('   ').message, /Type a command/);
  assert.equal(err('db.tasks.find(\n  { done: false\n)').line, 3);
});

test('parseProgram: several statements, chains over lines, db.collection() and show', () => {
  const p = M.parseProgram("db.tasks.find()\n  .sort({ a: 1 })\n  .limit(2);\ndb.collection('users').countDocuments({})\nshow collections");
  assert.equal(p.length, 3);
  assert.deepEqual(p[0].calls.map((c) => c.name), ['find', 'sort', 'limit']);
  assert.equal(p[1].target.name, 'users');
  assert.equal(p[2].target.kind, 'show');
});

test('unknown methods get a suggestion; deprecated ones a replacement', () => {
  assert.match(err('db.tasks.fnd()').message, /Did you mean `find`/);
  assert.match(err('db.tasks.insert({ a: 1 })').message, /insertOne \/ insertMany/);
  assert.match(err('db.tasks.find().count()').message, /countDocuments/);
  assert.match(err('db.tasks.countDocuments().limit(1)').message, /can only follow find\(\) or aggregate\(\)/);
});

/* ---- Query matching ----------------------------------------------------------------- */

const doc = { a: 5, s: 'Hello', tags: ['x', 'y'], o: { n: 'Ana', k: { z: 1 } }, arr: [{ p: 1, q: 'a' }, { p: 2, q: 'b' }], nul: null, d: new Date('2026-09-05T00:00:00Z') };
const m = (f) => M.match(doc, f);

test('equality, implicit AND, missing fields and null', () => {
  assert.ok(m({ a: 5 }));
  assert.ok(!m({ a: '5' }));
  assert.ok(m({ a: 5, s: 'Hello' }));
  assert.ok(!m({ a: 5, s: 'hello' }));
  assert.ok(m({ nul: null }));
  assert.ok(m({ missing: null }), 'null matches a missing field');
  assert.ok(!m({ missing: 1 }));
  assert.ok(m({}));
});

test('$eq $ne $gt $gte $lt $lte with type bracketing', () => {
  assert.ok(m({ a: { $eq: 5 } }));
  assert.ok(m({ a: { $ne: 4 } }));
  assert.ok(m({ missing: { $ne: 4 } }), '$ne matches documents without the field');
  assert.ok(m({ a: { $gt: 4, $lt: 6 } }));
  assert.ok(!m({ a: { $gt: 5 } }));
  assert.ok(m({ a: { $gte: 5, $lte: 5 } }));
  assert.ok(!m({ a: { $gt: '1' } }), 'a number is never compared with a string');
  assert.ok(m({ s: { $gt: 'A' } }));
  assert.ok(m({ d: { $gte: new Date('2026-09-01T00:00:00Z') } }));
});

test('$in $nin $exists', () => {
  assert.ok(m({ a: { $in: [1, 5] } }));
  assert.ok(!m({ a: { $in: [1, 2] } }));
  assert.ok(m({ tags: { $in: ['y', 'z'] } }));
  assert.ok(m({ tags: { $nin: ['z'] } }));
  assert.ok(!m({ tags: { $nin: ['x'] } }));
  assert.ok(m({ s: { $in: [/^he/i] } }));
  assert.ok(m({ nul: { $exists: true } }), 'a null value exists');
  assert.ok(m({ missing: { $exists: false } }));
  assert.ok(!m({ a: { $exists: false } }));
  assert.throws(() => m({ a: { $in: 5 } }), /needs an array/);
});

test('$and $or $nor, and misplaced operators', () => {
  assert.ok(m({ $or: [{ a: 1 }, { s: 'Hello' }] }));
  assert.ok(!m({ $and: [{ a: 5 }, { s: 'x' }] }));
  assert.ok(m({ $nor: [{ a: 1 }, { a: 2 }] }));
  assert.ok(m({ a: 5, $or: [{ tags: 'x' }, { tags: 'q' }] }));
  assert.throws(() => m({ $or: [] }), /non-empty array/);
  assert.throws(() => m({ $gt: 3 }), /unknown top level operator: \$gt/);
  assert.throws(() => m({ a: { $or: [] } }), /top level/);
  assert.throws(() => m({ a: { $get: 3 } }), /unknown operator: \$get \(did you mean \$gt\?\)/);
});

test('$regex and regex literals, with $options', () => {
  assert.ok(m({ s: /ell/ }));
  assert.ok(!m({ s: /ELL/ }));
  assert.ok(m({ s: { $regex: 'ELL', $options: 'i' } }));
  assert.ok(m({ s: { $regex: /^H/ } }));
  assert.ok(m({ tags: /^y$/ }), 'regex looks inside arrays');
  assert.ok(!m({ a: /5/ }), 'regex only matches strings');
});

test('arrays: contains, exact array, $all, $size, $elemMatch', () => {
  assert.ok(m({ tags: 'x' }));
  assert.ok(m({ tags: ['x', 'y'] }));
  assert.ok(!m({ tags: ['y', 'x'] }), 'an exact-array match is order-sensitive');
  assert.ok(m({ tags: { $all: ['y', 'x'] } }));
  assert.ok(m({ tags: { $size: 2 } }));
  assert.ok(!m({ tags: { $size: 1 } }));
  assert.ok(m({ arr: { $elemMatch: { p: 2, q: 'b' } } }));
  assert.ok(!m({ arr: { $elemMatch: { p: 2, q: 'a' } } }));
  assert.ok(m({ 'arr.p': 2, 'arr.q': 'a' }), 'without $elemMatch the conditions may hit different elements');
});

test('dot notation into sub-documents, arrays of sub-documents and positions', () => {
  assert.ok(m({ 'o.n': 'Ana' }));
  assert.ok(m({ 'o.k.z': 1 }));
  assert.ok(m({ 'arr.q': 'b' }));
  assert.ok(m({ 'arr.p': { $gt: 1 } }));
  assert.ok(m({ 'tags.0': 'x' }));
  assert.ok(!m({ 'tags.0': 'y' }));
  assert.ok(m({ 'arr.1.p': 2 }));
  assert.ok(m({ 'o.missing': null }));
  assert.ok(m({ o: { n: 'Ana', k: { z: 1 } } }), 'whole sub-document equality');
  assert.ok(!m({ o: { n: 'Ana' } }), 'a sub-document must match exactly');
});

test('$not', () => {
  assert.ok(m({ a: { $not: { $gt: 6 } } }));
  assert.ok(!m({ a: { $not: { $gt: 4 } } }));
  assert.ok(m({ s: { $not: /^x/ } }));
});

/* ---- find on the seed --------------------------------------------------------------- */

test('seed: 10 tasks and 3 users, in the tasks domain', () => {
  const db = M.createDb();
  assert.equal(db.collections.tasks.length, 10);
  assert.deepEqual(db.collections.users.map((u) => u.email), ['ana@example.com', 'ben@example.com', 'cleo@example.com']);
  assert.ok(db.collections.tasks.every((t) => t._id instanceof M.ObjectId && t.owner.email.endsWith('@example.com')));
});

test('find: filters on the seed', () => {
  assert.equal(titles('db.tasks.find({ done: false })').length, 7);
  assert.deepEqual(titles("db.tasks.find({ tags: 'urgent' })"), ['Set up CI', 'Add pagination', 'Review pull request', 'Draft project plan']);
  assert.deepEqual(titles("db.tasks.find({ 'owner.name': 'Ben' })"), ['Set up CI', 'Review pull request', 'Write API tests']);
  assert.deepEqual(titles("db.tasks.find({ 'comments.author': 'Ben' })"), ['Write the SQL schema', 'Add pagination']);
  assert.deepEqual(titles('db.tasks.find({ due: { $exists: true } })'), ['Set up CI', 'Add pagination', 'Draft project plan']);
  assert.deepEqual(titles('db.tasks.find({ tags: { $size: 0 } })'), ['Book a room for the demo']);
  assert.equal(last('db.tasks.countDocuments({ done: false, tags: \'urgent\' })').value, 3);
  assert.equal(last('db.tasks.countDocuments()').value, 10);
});

test('findOne returns one document or null; _id needs an ObjectId, not a string', () => {
  const db = M.createDb();
  const ben = db.collections.users[1]._id.hex;
  assert.equal(last(`db.users.findOne({ _id: ObjectId('${ben}') })`, db).value.name, 'Ben');
  const miss = last(`db.users.findOne({ _id: '${ben}' })`, db);
  assert.equal(miss.value, null);
  assert.ok(miss.notes.some((n) => /never equal to an ObjectId/.test(n)));
});

test('helpful notes: string vs boolean, unknown collection, unknown field', () => {
  assert.ok(last("db.tasks.find({ done: 'false' })").notes.some((n) => /holds booleans/.test(n)));
  assert.ok(last("db.tasks.find({ priority: '3' })").notes.some((n) => /holds numbers/.test(n)));
  const typo = last('db.task.find()');
  assert.equal(typo.docs.length, 0);
  assert.ok(typo.notes.some((n) => /Did you mean `tasks`/.test(n)));
  assert.ok(last("db.tasks.find({ titel: 'Buy milk' })").notes.some((n) => /did you mean `title`/.test(n)));
});

/* ---- Projection ------------------------------------------------------------------- */

test('projection: inclusion keeps _id unless excluded', () => {
  const r = last("db.tasks.find({ title: 'Buy milk' }, { title: 1 })");
  assert.deepEqual(Object.keys(r.docs[0]), ['_id', 'title']);
  assert.deepEqual(last("db.tasks.find({ title: 'Buy milk' }, { title: 1, _id: 0 })").docs, [{ title: 'Buy milk' }]);
});

test('projection: exclusion, dot paths and arrays of sub-documents', () => {
  const ex = last("db.tasks.find({ title: 'Add pagination' }, { comments: 0, owner: 0, _id: 0 })").docs[0];
  assert.ok(!('comments' in ex) && !('owner' in ex) && !('_id' in ex) && ex.title === 'Add pagination');
  assert.deepEqual(last("db.tasks.find({ title: 'Add pagination' }, { 'owner.name': 1, 'comments.author': 1, _id: 0 })").docs[0],
    { owner: { name: 'Ana' }, comments: [{ author: 'Cleo' }, { author: 'Ben' }] });
  assert.deepEqual(last("db.tasks.find({ title: 'Buy milk' }, { 'owner.email': 0, _id: 0, tags: 0, createdAt: 0 })").docs[0],
    { title: 'Buy milk', done: false, priority: 1, owner: { name: 'Ana' } });
});

test('projection: mixing inclusion and exclusion is an error (except _id)', () => {
  assert.equal(err('db.tasks.find({}, { title: 1, done: 0 })').message, 'Cannot do exclusion on field done in inclusion projection');
  assert.equal(err('db.tasks.find({}, { done: 0, title: 1 })').message, 'Cannot do inclusion on field title in exclusion projection');
  assert.match(err("db.tasks.find({}, { owner: 1, 'owner.name': 1 })").message, /Path collision/);
  assert.match(err("db.tasks.find({}, { who: '$owner.name' })").message, /aggregate with \$project/);
  const node = last('db.tasks.find({}, { projection: { title: 1, _id: 0 } })');
  assert.deepEqual(node.docs[0], { title: 'Buy milk' });
  assert.ok(node.notes.some((n) => /Node\.js driver/.test(n)));
});

/* ---- Sort, skip, limit ------------------------------------------------------------- */

test('sort on several keys, skip and limit', () => {
  assert.deepEqual(titles('db.tasks.find({}, { title: 1 }).sort({ priority: -1, title: 1 }).limit(3)'), ['Set up CI', 'Draft project plan', 'Write the SQL schema']);
  assert.deepEqual(titles('db.tasks.find().sort({ createdAt: 1 }).skip(4).limit(4)'), ['Add pagination', 'Review pull request', 'Draft project plan', 'Design the Mongo schema']);
  assert.deepEqual(titles('db.tasks.find().sort({ createdAt: 1 }).skip(8).limit(4)'), ['Write API tests', 'Book a room for the demo']);
});

test('sort, then skip, then limit, whatever the chain order', () => {
  const a = titles('db.tasks.find().limit(2).skip(1).sort({ title: 1 })');
  const b = titles('db.tasks.find().sort({ title: 1 }).skip(1).limit(2)');
  assert.deepEqual(a, b);
  assert.ok(last('db.tasks.find().limit(2).sort({ title: 1 })').notes.some((n) => /sort first, then skip, then limit/.test(n)));
});

test('sort on arrays uses the smallest element ascending; missing values sort first', () => {
  const docs = M.sortDocs([{ id: 1, v: [5, 9] }, { id: 2, v: 3 }, { id: 3 }, { id: 4, v: [1, 7] }], { v: 1 });
  assert.deepEqual(docs.map((d) => d.id), [3, 4, 2, 1]);
  const desc = M.sortDocs([{ id: 1, v: [5, 9] }, { id: 2, v: 8 }], { v: -1 });
  assert.deepEqual(desc.map((d) => d.id), [1, 2]);
  assert.match(err('db.tasks.find().sort({ title: 2 })').message, /must be 1/);
  assert.match(err('db.tasks.find().limit(-1)').message, /whole number/);
});

/* ---- Writes ------------------------------------------------------------------------- */

test('insertOne adds an _id first; insertMany returns every id; state persists', () => {
  const db = M.createDb();
  const r = last("db.tasks.insertOne({ title: 'New', done: false })", db);
  assert.ok(r.value.insertedId instanceof M.ObjectId);
  const stored = db.collections.tasks[10];
  assert.deepEqual(Object.keys(stored), ['_id', 'title', 'done']);
  const many = last("db.tasks.insertMany([{ title: 'A' }, { title: 'B' }])", db);
  assert.deepEqual(Object.keys(many.value.insertedIds), ['0', '1']);
  assert.equal(last('db.tasks.countDocuments()', db).value, 13);
  assert.match(err('db.tasks.insertOne([{ a: 1 }])', db).message, /insertMany/);
  assert.match(err("db.tasks.insertOne({ $set: { a: 1 } })", db).message, /\$ prefixed/);
});

test('insert into a new collection creates it, with a note', () => {
  const db = M.createDb();
  const r = last("db.notes.insertOne({ text: 'hi' })", db);
  assert.ok(db.collections.notes);
  assert.ok(r.notes.some((n) => /did not exist/.test(n)));
});

test('updateOne with $set changes only the first match; matched vs modified', () => {
  const db = M.createDb();
  const r = last("db.tasks.updateOne({ title: 'Buy milk' }, { $set: { done: true } })", db);
  assert.deepEqual([r.value.matchedCount, r.value.modifiedCount], [1, 1]);
  assert.equal(db.collections.tasks[0].done, true);
  const again = last("db.tasks.updateOne({ title: 'Buy milk' }, { $set: { done: true } })", db);
  assert.equal(again.value.modifiedCount, 0);
  const one = last("db.tasks.updateOne({ 'owner.name': 'Ana' }, { $set: { done: true } })", db);
  assert.ok(one.notes.some((n) => /only the first one/.test(n)));
});

test('updateMany with $inc, $unset and $set on a dot path', () => {
  const db = M.createDb();
  const r = last("db.tasks.updateMany({ tags: 'urgent' }, { $inc: { priority: 1 } })", db);
  assert.equal(r.value.modifiedCount, 4);
  assert.equal(db.collections.tasks[3].priority, 6);
  last("db.tasks.updateMany({}, { $unset: { due: '' } })", db);
  assert.ok(db.collections.tasks.every((t) => !('due' in t)));
  last("db.tasks.updateOne({ title: 'Buy milk' }, { $set: { 'owner.name': 'Ana María', 'meta.source': 'app' } })", db);
  assert.deepEqual(db.collections.tasks[0].owner, { name: 'Ana María', email: 'ana@example.com' });
  assert.deepEqual(db.collections.tasks[0].meta, { source: 'app' });
});

test('$push, $addToSet and $pull (value and condition)', () => {
  const db = M.createDb();
  last("db.tasks.updateOne({ title: 'Read the pg docs' }, { $push: { tags: 'urgent' } })", db);
  assert.deepEqual(db.collections.tasks[2].tags, ['db', 'reading', 'urgent']);
  last("db.tasks.updateOne({ title: 'Read the pg docs' }, { $addToSet: { tags: 'urgent' } })", db);
  assert.deepEqual(db.collections.tasks[2].tags, ['db', 'reading', 'urgent']);
  last("db.tasks.updateOne({ title: 'Read the pg docs' }, { $push: { tags: { $each: ['a', 'b'] } } })", db);
  assert.deepEqual(db.collections.tasks[2].tags, ['db', 'reading', 'urgent', 'a', 'b']);
  last("db.tasks.updateOne({ title: 'Read the pg docs' }, { $pull: { tags: { $in: ['a', 'b'] } } })", db);
  assert.deepEqual(db.collections.tasks[2].tags, ['db', 'reading', 'urgent']);
  last("db.tasks.updateOne({ title: 'Add pagination' }, { $pull: { comments: { author: 'Ben' } } })", db);
  assert.deepEqual(db.collections.tasks[4].comments, [{ author: 'Cleo', text: 'Use skip and limit' }]);
  last("db.tasks.updateOne({ title: 'Buy milk' }, { $push: { comments: { author: 'Ben', text: 'Oat milk' } } })", db);
  assert.equal(db.collections.tasks[0].comments.length, 1);
});

test('update errors match MongoDB', () => {
  assert.match(err("db.tasks.updateOne({ title: 'Buy milk' }, { done: true })").message, /^Update document requires atomic operators/);
  assert.match(err("db.tasks.updateOne({ title: 'Buy milk' }, { $set: { _id: 1 } })").message, /immutable field '_id'/);
  assert.match(err("db.tasks.updateOne({ title: 'Buy milk' }, { $inc: { title: 1 } })").message, /non-numeric type/);
  assert.match(err("db.tasks.updateOne({ title: 'Buy milk' }, { $push: { title: 'x' } })").message, /must be an array/);
  assert.match(err("db.tasks.updateOne({ title: 'Buy milk' }, { $sett: { done: true } })").message, /Unknown modifier: \$sett.*did you mean \$set/);
  assert.match(err("db.tasks.updateOne({}, { $set: { done: true }, $unset: { done: '' } })").message, /conflict/);
});

test('upsert inserts when nothing matches', () => {
  const db = M.createDb();
  const r = last("db.tasks.updateOne({ title: 'Brand new' }, { $set: { done: false } }, { upsert: true })", db);
  assert.equal(r.value.upsertedCount, 1);
  assert.equal(db.collections.tasks[10].title, 'Brand new');
});

test('deleteOne, deleteMany and the empty filter', () => {
  const db = M.createDb();
  assert.equal(last('db.tasks.deleteOne({ done: true })', db).value.deletedCount, 1);
  assert.equal(last('db.tasks.deleteMany({ done: true })', db).value.deletedCount, 2);
  const all = last('db.tasks.deleteMany({})', db);
  assert.equal(all.value.deletedCount, 7);
  assert.ok(all.notes.some((n) => /empty filter \{\} matches every document/.test(n)));
  assert.equal(db.collections.tasks.length, 0);
  assert.match(err('db.tasks.deleteMany()', db).message, /needs a document/);
});

test('a run stops at the first error; earlier writes stay', () => {
  const db = M.createDb();
  const { results } = M.run(db, "db.tasks.deleteOne({ title: 'Buy milk' })\ndb.tasks.find({ $bad: 1 })\ndb.tasks.deleteMany({})");
  assert.equal(results.length, 2);
  assert.equal(results[1].ok, false);
  assert.equal(results[1].error.line, 2);
  assert.equal(db.collections.tasks.length, 9);
});

/* ---- Aggregation ------------------------------------------------------------------ */

const agg = (pipeline, db) => last(`db.tasks.aggregate(${pipeline})`, db);

test('$group with $sum (count and total), $avg, $min, $max, $push', () => {
  const r = agg("[{ $group: { _id: '$owner.name', count: { $sum: 1 }, total: { $sum: '$priority' }, avg: { $avg: '$priority' }, lo: { $min: '$priority' }, hi: { $max: '$priority' }, titles: { $push: '$title' } } }, { $sort: { _id: 1 } }]");
  assert.deepEqual(r.docs.map((d) => [d._id, d.count, d.total, d.lo, d.hi]), [['Ana', 4, 10, 1, 4], ['Ben', 3, 11, 3, 5], ['Cleo', 3, 8, 1, 4]]);
  assert.equal(r.docs[0].avg, 2.5);
  assert.deepEqual(r.docs[1].titles, ['Set up CI', 'Review pull request', 'Write API tests']);
});

test('$match → $group → $sort, and _id: null for one group', () => {
  const r = agg("[{ $match: { done: false } }, { $group: { _id: '$owner.name', avgPriority: { $avg: '$priority' } } }, { $sort: { avgPriority: -1 } }]");
  assert.deepEqual(r.docs, [{ _id: 'Ben', avgPriority: 4 }, { _id: 'Cleo', avgPriority: 3.5 }, { _id: 'Ana', avgPriority: 2 }]);
  assert.deepEqual(agg("[{ $group: { _id: null, n: { $count: {} }, total: { $sum: '$priority' } } }]").docs, [{ _id: null, n: 10, total: 29 }]);
});

test('$group without $ on the key makes one group, with a note', () => {
  const r = agg("[{ $group: { _id: 'owner.name', n: { $sum: 1 } } }]");
  assert.deepEqual(r.docs, [{ _id: 'owner.name', n: 10 }]);
  assert.ok(r.notes.some((n) => /constant string/.test(n)));
  assert.match(err("db.tasks.aggregate([{ $group: { n: { $sum: 1 } } }])").message, /must include an _id/);
  assert.match(err("db.tasks.aggregate([{ $group: { _id: '$done', n: { $total: 1 } } }])").message, /unknown group operator/);
});

test('$unwind gives one document per array element', () => {
  const r = agg("[{ $unwind: '$tags' }, { $group: { _id: '$tags', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 }]");
  assert.deepEqual(r.docs, [{ _id: 'urgent', n: 4 }, { _id: 'db', n: 3 }, { _id: 'api', n: 2 }]);
  assert.equal(agg("[{ $unwind: '$tags' }]").docs.length, 17, 'the task without tags disappears');
  assert.equal(agg("[{ $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }]").docs.length, 18);
  assert.match(err("db.tasks.aggregate([{ $unwind: 'tags' }])").message, /prefixed with a '\$'/);
});

test('$project with expressions, $count, $skip and $lookup', () => {
  const p = agg("[{ $match: { title: 'Add pagination' } }, { $project: { _id: 0, title: 1, who: '$owner.name', n: { $size: '$tags' }, label: { $concat: ['$title', ' (', '$owner.name', ')'] } } }]");
  assert.deepEqual(p.docs, [{ title: 'Add pagination', who: 'Ana', n: 2, label: 'Add pagination (Ana)' }]);
  assert.deepEqual(agg("[{ $match: { done: false } }, { $count: 'open' }]").docs, [{ open: 7 }]);
  assert.deepEqual(agg("[{ $match: { done: 'nope' } }, { $count: 'n' }]").docs, [], '$count of nothing is no document');
  assert.equal(agg('[{ $sort: { createdAt: 1 } }, { $skip: 8 }]').docs.length, 2);
  const l = agg("[{ $match: { title: 'Set up CI' } }, { $lookup: { from: 'users', localField: 'owner.email', foreignField: 'email', as: 'ownerDoc' } }]");
  assert.equal(l.docs[0].ownerDoc.length, 1);
  assert.equal(l.docs[0].ownerDoc[0].role, 'student');
});

test('pipeline errors', () => {
  assert.match(err("db.tasks.aggregate([{ $grup: {} }])").message, /Unrecognized pipeline stage name: '\$grup' \(did you mean \$group\?\)/);
  assert.match(err('db.tasks.aggregate({ $match: {} })').message, /expects an array/);
  assert.match(err('db.tasks.aggregate([{ $match: {}, $limit: 2 }])').message, /exactly one field/);
  assert.match(err('db.tasks.aggregate([{ $limit: 0 }])').message, /positive/);
  assert.match(err("db.tasks.aggregate([{ $project: { n: { $size: '$comments' } } }])").message, /must be an array/);
});

/* ---- Indexes and explain -------------------------------------------------------- */

test('createIndex + explain: COLLSCAN becomes IXSCAN', () => {
  const db = M.createDb();
  const before = last('db.tasks.find({ priority: 5 }).explain()', db).value;
  assert.equal(before.queryPlanner.winningPlan.stage, 'COLLSCAN');
  assert.equal(before.executionStats.totalDocsExamined, 10);
  assert.equal(last('db.tasks.createIndex({ priority: 1 })', db).value, 'priority_1');
  const after = last('db.tasks.find({ priority: 5 }).explain()', db).value;
  assert.equal(after.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN');
  assert.equal(after.executionStats.totalDocsExamined, 1);
  assert.equal(after.executionStats.nReturned, 1);
  assert.deepEqual(last('db.tasks.getIndexes()', db).value.map((i) => i.name), ['_id_', 'priority_1']);
  assert.equal(last("db.tasks.dropIndex('priority_1')", db).ok, true);
  assert.match(err("db.tasks.dropIndex('_id_')", db).message, /cannot drop _id index/);
});

test('compound index: only a prefix of the fields can be used', () => {
  const db = M.createDb();
  last('db.tasks.createIndex({ done: 1, priority: -1 })', db);
  assert.equal(last('db.tasks.find({ priority: 5 }).explain()', db).value.queryPlanner.winningPlan.stage, 'COLLSCAN');
  const hit = last('db.tasks.find({ done: false, priority: { $gte: 4 } }).explain()', db).value;
  assert.equal(hit.queryPlanner.winningPlan.inputStage.indexName, 'done_1_priority_-1');
  assert.equal(hit.executionStats.totalKeysExamined, 2);
});

test('unique index rejects duplicates (E11000)', () => {
  const db = M.createDb();
  last('db.users.createIndex({ email: 1 }, { unique: true })', db);
  const e = err("db.users.insertOne({ name: 'Ana 2', email: 'ana@example.com' })", db);
  assert.match(e.message, /^E11000 duplicate key error collection: app\.users index: email_1/);
  assert.equal(db.collections.users.length, 3);
  assert.match(err("db.tasks.createIndex({ done: 1 }, { unique: true })", db).message, /E11000/);
  const many = err("db.users.insertMany([{ email: 'x@example.com' }, { email: 'x@example.com' }])", db);
  assert.match(many.message, /1 document was inserted before it/);
});

/* ---- Formatting and the SQL bridge ------------------------------------------------ */

test('format: shell style and Extended JSON', () => {
  const v = { _id: new M.ObjectId('650f1c2a9b3e4d5f6a7b8c9d'), at: new Date('2026-09-01T00:00:00Z'), s: "it's", tags: ['a'] };
  assert.equal(M.format(v), "{\n  _id: ObjectId('650f1c2a9b3e4d5f6a7b8c9d'),\n  at: ISODate('2026-09-01T00:00:00.000Z'),\n  s: 'it\\'s',\n  tags: [ 'a' ]\n}");
  assert.deepEqual(JSON.parse(M.format(v, { ejson: true })), { _id: { $oid: '650f1c2a9b3e4d5f6a7b8c9d' }, at: { $date: '2026-09-01T00:00:00.000Z' }, s: "it's", tags: ['a'] });
  assert.equal(M.format({ a: 1 }), '{ a: 1 }');
});

test('SQL bridge: simple finds, joins for embedded fields and arrays, aggregates', () => {
  assert.equal(last('db.tasks.find({ done: false }, { title: 1, _id: 0 }).sort({ priority: -1 }).skip(2).limit(2)').sql.sql,
    'SELECT title\nFROM tasks\nWHERE done = FALSE\nORDER BY priority DESC\nLIMIT 2 OFFSET 2;');
  assert.equal(last("db.tasks.find({ 'owner.name': 'Ben' })").sql.sql, "SELECT t.*\nFROM tasks t\n  JOIN users u ON u.id = t.user_id\nWHERE u.name = 'Ben';");
  assert.match(last("db.tasks.find({ tags: 'urgent' })").sql.sql, /SELECT DISTINCT t\.\*[\s\S]*JOIN task_tags tt[\s\S]*tt\.tag = 'urgent'/);
  assert.equal(last('db.tasks.find({ $or: [{ priority: { $gte: 4 } }, { done: true }] })').sql.sql, 'SELECT *\nFROM tasks\nWHERE priority >= 4 OR done = TRUE;');
  assert.equal(last('db.tasks.find({ title: /^write/i })').sql.sql, "SELECT *\nFROM tasks\nWHERE title ILIKE 'write%';");
  assert.equal(last("db.tasks.aggregate([{ $group: { _id: '$owner.name', count: { $sum: 1 } } }])").sql.sql,
    'SELECT u.name AS _id, COUNT(*) AS count\nFROM tasks t\n  JOIN users u ON u.id = t.user_id\nGROUP BY u.name;');
  assert.match(last("db.tasks.aggregate([{ $unwind: '$tags' }])").sql.why, /child table/);
  assert.match(last('db.tasks.find({}, { comments: 0 })').sql.why, /every column except/);
  assert.equal(last('db.tasks.deleteMany({ done: true })').sql.sql, 'DELETE FROM tasks\nWHERE done = TRUE;');
  assert.match(last("db.tasks.updateOne({ title: 'Buy milk' }, { $set: { done: true } })").sql.sql, /^UPDATE tasks\nSET done = TRUE\nWHERE title = 'Buy milk';/);
});

/* ---- Challenges --------------------------------------------------------------------- */

test('every challenge is solved by its own reference command', () => {
  M.CHALLENGES.forEach((c) => {
    const db = M.createDb();
    const { results } = M.run(db, c.ref);
    assert.deepEqual(M.checkChallenge(c.id, db, results), { ok: true }, c.id);
  });
  assert.ok(M.CHALLENGES.length >= 8);
  assert.equal(new Set(M.CHALLENGES.map((c) => c.id)).size, M.CHALLENGES.length);
});

test('challenges accept equivalent answers and explain wrong ones', () => {
  const check = (id, src) => { const db = M.createDb(); return M.checkChallenge(id, db, M.run(db, src).results); };
  assert.equal(check('open', 'db.tasks.find({ done: { $ne: true } })').ok, true);
  assert.equal(check('urgent', "db.tasks.find({ tags: { $in: ['urgent'] } })").ok, true);
  assert.match(check('open', 'db.tasks.find({ done: true })').reason, /3 documents; the expected result has 7/);
  assert.match(check('titles', 'db.tasks.find({}, { title: 1 })').reason, /fields _id, title; the expected ones have title/);
  assert.match(check('priority', 'db.tasks.find({ priority: { $gte: 3 } }).sort({ createdAt: 1 })').reason, /wrong order/);
  assert.match(check('count', "db.tasks.find({ done: false, tags: 'urgent' })").reason, /single value/);
  assert.match(check('set-done', "db.tasks.updateMany({}, { $set: { done: true } })").reason, /does not match/);
  assert.match(check('push-tag', "db.tasks.updateOne({ title: 'Read the pg docs' }, { $set: { tags: ['urgent'] } })").reason, /does not match/);
  assert.match(check('delete-done', 'db.tasks.find({ done: true })').reason, /run a write command/);
  assert.equal(check('page2', 'db.tasks.find().skip(4).limit(4).sort({ createdAt: 1 })').ok, true);
});
