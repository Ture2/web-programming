'use strict';
/* Document databases: concept cards, rail groups and self-check quiz (MongoDB as the worked example).
   Cards explain with `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js).
   `hub` and `topic` keys match MONGO_GROUPS and MONGO_QUIZ_TOPICS. */

DATA.en.MONGO_QUIZ_TOPICS = {
  model: 'Documents and collections',
  crud: 'CRUD operations',
  query: 'Queries, projection and pagination',
  design: 'Embedding and referencing',
  aggregate: 'Aggregation pipeline',
  app: 'Indexes and the back end',
};

DATA.en.MONGO_GROUPS = [
  { key: 'model', label: 'Documents and collections', icon: 'doc' },
  { key: 'crud', label: 'CRUD operations', icon: 'files' },
  { key: 'query', label: 'Queries', icon: 'key' },
  { key: 'design', label: 'Embedding and referencing', icon: 'tree' },
  { key: 'aggregate', label: 'Aggregation', icon: 'pipeline' },
  { key: 'app', label: 'Indexes and the back end', icon: 'index' },
];

DATA.en.MONGO_CONCEPTS = [
  /* ---- 1. Documents and collections ------------------------------------------------ */
  { id: 'document-model', hub: 'model', topic: 'model',
    title: 'Databases, collections and documents',
    summary: '**MongoDB** is a **document database**: each record is a **document** (a JSON-like object that can contain sub-objects and arrays), similar documents live together in a **collection**, and collections are grouped in a **database**.',
    html: [
      '<p>A document is one record: a set of <code>field: value</code> pairs whose values can themselves be objects and arrays. That is the big difference from a SQL row, which is flat (one value per column): a task document can carry its tags, its comments and its owner\'s name inside itself.</p>',
      '<dl><dt>Document</dt><dd>One record, like a row, except that it can nest objects and arrays.</dd>'
        + '<dt>Field</dt><dd>A named value inside a document, like a column, but not declared in advance and of any type.</dd>'
        + '<dt>Collection</dt><dd>A group of documents, usually of the same kind, like a table.</dd>'
        + '<dt>Database</dt><dd>A group of collections, like a schema in PostgreSQL. One MongoDB server can host several.</dd></dl>',
      '<p>In <strong>mongosh</strong>, the MongoDB shell (the command-line tool you type queries into), <code>db</code> is the database in use and <code>db.tasks.find()</code> asks its <code>tasks</code> collection for documents. Node.js code does the same through the <strong>driver</strong>, the library that speaks MongoDB\'s protocol: <code>db.collection(\'tasks\').find()</code>.</p>',
      '<p>Collections and databases are created <strong>lazily</strong>: there is no <code>CREATE TABLE</code>. The first insert into <code>db.notes</code> creates the <code>notes</code> collection, and reading a collection that does not exist is not an error: it returns no documents.</p>',
    ],
    diagram: {
      kind: 'layers',
      title: 'A server holds databases, a database holds collections, a collection holds documents.',
      desc: 'Four levels, outermost first. A MongoDB server hosts databases, such as app. A database holds collections, such as tasks and users. A collection holds documents, and each document is one record.',
      nodes: [
        { id: 'server', label: 'MongoDB server', note: 'hosts several databases' },
        { id: 'db', label: 'Database', note: '`app`' },
        { id: 'coll', label: 'Collection', note: '`tasks`, `users`' },
        { id: 'doc', label: 'Document', note: 'one record, can nest', key: true },
      ],
      edges: [],
    },
    code: `// one document of the tasks collection (as the shell prints it)
{
  _id: ObjectId('6a9a8890a1b2c3d4e5000104'),
  title: 'Set up CI',
  done: false,
  priority: 5,
  tags: [ 'devops', 'urgent' ],              // an array inside the document
  owner: { name: 'Ben', email: 'ben@example.com' },   // a sub-document
  createdAt: ISODate('2026-09-04T09:00:00.000Z'),
  due: ISODate('2026-09-20T09:00:00.000Z')
}`,
    dialect: 'mongosh',
    example: 'The playground\'s database `app` has two collections: `tasks` (10 documents) and `users` (3). The task in this card\'s code keeps its two tags and its owner inside itself. In the [relational schema](#/database/relational/relationships) the same information is spread over three tables (`tasks`, `users` and a tags table), joined by keys. Run `show collections` in the playground, then `db.tasks.find()`.',
    mistake: 'Misspelling a collection name and trusting the empty result. `db.task.find()` (no "s") returns nothing and raises no error, and `db.task.insertOne(…)` silently creates a second collection called `task`. When a query returns nothing unexpectedly, check the name first with `show collections`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Open the document query playground' } },

  { id: 'bson-objectid', hub: 'model', topic: 'model',
    title: 'BSON, _id and ObjectId',
    summary: 'MongoDB stores documents as **BSON** (binary JSON), which adds types JSON lacks, such as dates and **ObjectId**; every document has an `_id` field, unique in its collection, which by default is an ObjectId.',
    html: [
      '<p>JSON is text and knows only strings, numbers, booleans, <code>null</code>, objects and arrays. A database needs more: a real <strong>date</strong> type to sort by time, exact numeric types and a compact identifier. So MongoDB stores documents as <strong>BSON</strong>, a binary encoding of the same shape with extra types. You write JSON-like literals; the driver converts them to BSON on the way in and back to JavaScript objects on the way out.</p>',
      '<table><caption>The BSON types you will meet</caption><thead><tr><th scope="col">BSON type</th><th scope="col">Shell literal</th><th scope="col">In Node.js</th><th scope="col">In JSON (API response)</th></tr></thead><tbody>'
        + '<tr><th scope="row">String</th><td><code>\'Set up CI\'</code></td><td><code>\'Set up CI\'</code></td><td><code>"Set up CI"</code></td></tr>'
        + '<tr><th scope="row">Double / Int32</th><td><code>5</code>, <code>2.5</code></td><td><code>5</code>, <code>2.5</code></td><td><code>5</code>, <code>2.5</code></td></tr>'
        + '<tr><th scope="row">Date</th><td><code>ISODate(\'2026-09-04\')</code></td><td><code>new Date(\'2026-09-04\')</code></td><td><code>"2026-09-04T00:00:00.000Z"</code> (a string)</td></tr>'
        + '<tr><th scope="row">ObjectId</th><td><code>ObjectId(\'6a9a…104\')</code></td><td><code>new ObjectId(\'6a9a…104\')</code></td><td><code>"6a9a…104"</code> (a string)</td></tr>'
        + '</tbody></table>',
      '<p>Booleans, arrays, objects and <code>null</code> look the same in all three places; dates and ids are the ones that change shape.</p>',
      '<h3>The <code>_id</code> field</h3>',
      '<ul><li><strong>Every document has one:</strong> <code>_id</code> is the primary key (see <a href="#/database/relational/primary-keys">Primary keys</a>). It is unique in the collection and cannot change after the insert.</li>'
        + '<li><strong>An ObjectId by default:</strong> if you give none, the driver generates a 12-byte ObjectId, written as 24 hexadecimal characters.</li>'
        + '<li><strong>Made anywhere:</strong> its first 4 bytes are the creation time in seconds, then 5 random bytes and a 3-byte counter, so any machine can create one without asking the database, and ids sort roughly by creation time.</li></ul>',
      '<h3>Across the API</h3>',
      '<p>In a JSON response the ObjectId becomes a plain string and the date an ISO string. When the string comes back in a URL (<code>/tasks/6a9a…104</code>), the server turns it back into an ObjectId before querying. Tools that print BSON as text without losing the types use <strong>Extended JSON</strong>: <code>{ "$oid": "6a9a…" }</code> for an ObjectId, <code>{ "$date": "2026-09-04T09:00:00Z" }</code> for a date.</p>',
      '<figure data-diagram></figure>',
    ],
    diagram: {
      kind: 'flow',
      title: 'An id leaves the API as a string and must come back as an ObjectId.',
      desc: 'A request arrives for /tasks/6a9a…104: the id is a string. The server checks it with ObjectId.isValid and rejects malformed ids, converts it with new ObjectId(id), queries with findOne({ _id }), and the JSON response carries the id as a string again.',
      nodes: [
        { id: 'url', label: '`/tasks/6a9a…104`', note: 'a string' },
        { id: 'valid', label: '`ObjectId.isValid`', note: 'rejects bad ids' },
        { id: 'conv', label: '`new ObjectId(id)`', note: 'now an ObjectId', key: true },
        { id: 'find', label: '`findOne({ _id })`', note: 'finds the task' },
        { id: 'json', label: 'JSON response', note: 'a string again' },
      ],
      edges: [['url', 'valid'], ['valid', 'conv'], ['conv', 'find'], ['find', 'json']],
    },
    live: { kind: 'js', code: `// JSON has no date type: a Date survives a round trip only as a string.
const task = { title: 'Set up CI', createdAt: new Date('2026-09-04T09:00:00Z') };
const text = JSON.stringify(task);
console.log(text);
const back = JSON.parse(text);
console.log(typeof back.createdAt);          // 'string', not a Date any more
console.log(back.createdAt instanceof Date); // false
// That is why BSON (and Extended JSON) add real date and ObjectId types.` },
    example: 'Ben\'s user document has `_id: ObjectId(\'6a93ea08a1b2c3d4e5000002\')`. In the playground, `db.users.findOne({ _id: ObjectId(\'6a93ea08a1b2c3d4e5000002\') })` returns Ben; the same query with the plain string `\'6a93ea08a1b2c3d4e5000002\'` returns `null`. Switch the data view to **Extended JSON** to see how the same documents look as plain JSON.',
    mistake: 'Querying with the id string from the URL: `tasks.findOne({ _id: req.params.id })`. A string is never equal to an ObjectId, so this always finds nothing and the route answers 404 for every task. Convert first: `{ _id: new ObjectId(req.params.id) }`, after checking the id is well-formed (24 hexadecimal characters, e.g. with `ObjectId.isValid(id)`), otherwise `new ObjectId()` throws.' },

  { id: 'flexible-schema', hub: 'model', topic: 'model',
    title: 'Flexible schema, and who checks the data',
    summary: 'MongoDB does not require the documents of a collection to have the same fields or types; that flexibility moves the job of **validating** data out of the table definition and into your code, a **schema validator** on the collection, or a library.',
    html: [
      '<p>A SQL table refuses a row with a missing <code>NOT NULL</code> value or text in a number column. A MongoDB collection, by default, accepts <strong>any</strong> document. In the playground only some tasks have <code>due</code> or <code>comments</code>, and only Cleo\'s user has <code>interests</code>. That is convenient while the design changes and dangerous with real data: one typo (<code>titel</code> instead of <code>title</code>) creates a document that no query for <code>title</code> will ever find.</p>',
      '<p>"Schema-less" really means <strong>the schema lives somewhere else</strong>. Real projects combine these places:</p>',
      '<table><caption>Where the rules can live</caption><thead><tr><th scope="col">Place</th><th scope="col">Who refuses a bad document</th></tr></thead><tbody>'
        + '<tr><th scope="row">Your API</th><td>Your code, before writing: <code>400 Bad Request</code> (see <a href="#/http/api-design/validation">Validation</a>)</td></tr>'
        + '<tr><th scope="row">A <code>$jsonSchema</code> validator</th><td>MongoDB itself, on every write: <code>Document failed validation</code> (this card\'s code example)</td></tr>'
        + '<tr><th scope="row">An ODM library</th><td>Your Node process, before sending: for example <a href="#/database/documents/mongoose">Mongoose</a></td></tr>'
        + '</tbody></table>',
      '<p><strong>Changing the shape later</strong> needs a plan too. SQL has migrations (<code>ALTER TABLE</code>); in MongoDB you run a script that updates the old documents, or your code handles both the old and the new shape.</p>',
    ],
    code: `// A validator on the collection: MongoDB itself rejects bad documents.
db.createCollection('tasks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'done'],
      properties: {
        title: { bsonType: 'string', minLength: 1 },
        done: { bsonType: 'bool' },
        priority: { bsonType: 'number', minimum: 1, maximum: 5 },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
      },
    },
  },
});

db.tasks.insertOne({ title: 'Study', done: 'no' });
// MongoServerError: Document failed validation`,
    dialect: 'mongosh',
    example: 'Without any validation, `db.tasks.insertOne({ titel: \'Buy bread\', done: \'false\' })` is accepted. The task never appears in `find({ done: false })` (its `done` is the **string** `\'false\'`) nor in a search on `title`. With this card\'s validator, the same insert fails at once; with validation in the API, the request is answered `400` before the database is touched.',
    mistake: 'Taking "schema-less" as "no design needed". The database will not stop you from writing inconsistent documents, so you find them in production. Write the shape of each collection down (fields, types, required ones) before coding, and validate in the API.' },

  /* ---- 2. CRUD ------------------------------------------------------------------------- */
  { id: 'insert', hub: 'crud', topic: 'crud',
    title: 'Creating documents: insertOne and insertMany',
    summary: '`insertOne(doc)` adds one document and `insertMany([docs])` several; if a document has no `_id`, one is generated, and the result reports the new id(s).',
    html: [
      '<p>An insert adds the document to the collection, creating the collection if it does not exist yet. If the document has no <code>_id</code>, one is generated, and the result reports it: <code>{ acknowledged: true, insertedId: ObjectId(\'…\') }</code>. In Node.js that object is what <code>await tasks.insertOne(doc)</code> returns.</p>',
      '<ul><li><strong><code>insertMany</code> stops at the first error</strong> (a duplicate <code>_id</code>, or a duplicate email under a unique index), and the documents before it <strong>stay inserted</strong>. It is not all-or-nothing; that would need a transaction.</li>'
        + '<li><strong>No checks by default:</strong> fields are not validated unless a validator or your code does it (see <a href="#/database/documents/flexible-schema">Flexible schema</a>).</li>'
        + '<li><strong>Dates as dates:</strong> <code>ISODate(…)</code> in the shell, <code>new Date()</code> in Node.js. Dates stored as strings sort as text.</li></ul>',
    ],
    code: `db.tasks.insertOne({
  title: 'Prepare the slides',
  done: false,
  priority: 2,
  tags: ['teaching'],
  owner: { name: 'Cleo', email: 'cleo@example.com' },
  createdAt: ISODate('2026-09-11')
})
// { acknowledged: true, insertedId: ObjectId('…') }

db.users.insertMany([
  { name: 'Dani', email: 'dani@example.com', role: 'student' },
  { name: 'Eva', email: 'eva@example.com', role: 'student' }
])
// { acknowledged: true, insertedIds: { '0': ObjectId('…'), '1': ObjectId('…') } }`,
    dialect: 'mongosh',
    example: 'In the playground, load the example "Insert a task" and run it: the count of `tasks` in the data view goes from 10 to 11 and the new document starts with a generated `_id`. "The same in SQL" explains why there is no single `INSERT`: the `tags` array would be rows of another table.',
    mistake: 'Passing an array to `insertOne` (use `insertMany`), or putting update operators in an insert: `insertOne({ $set: { done: true } })` is rejected because field names cannot start with `$`. `$set` belongs in `updateOne`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Insert documents in the playground' } },

  { id: 'find-basics', hub: 'crud', topic: 'crud',
    title: 'Reading: find, findOne and the filter',
    summary: '`find(filter, projection)` returns every document that matches the **filter** (an object of conditions), `findOne` returns the first match or `null`, and `countDocuments(filter)` returns how many match.',
    html: [
      '<p>A filter is a <strong>template</strong> that documents are held against: <code>{ done: false, priority: 5 }</code> reads "<code>done</code> is <code>false</code> <strong>and</strong> <code>priority</code> is 5". Every field listed must match, like <code>WHERE done = FALSE AND priority = 5</code>. The empty filter <code>{}</code> has no conditions, so it matches every document.</p>',
      '<dl><dt><code>find(filter)</code></dt><dd>Every matching document, as a cursor.</dd>'
        + '<dt><code>findOne(filter)</code></dt><dd>The first match, or <code>null</code>.</dd>'
        + '<dt><code>countDocuments(filter)</code></dt><dd>How many documents match.</dd></dl>',
      '<ul><li><strong>Value and type:</strong> <code>{ priority: 5 }</code> does not match <code>priority: \'5\'</code> (a string), and <code>{ done: \'false\' }</code> does not match <code>done: false</code>.</li>'
        + '<li><strong>Missing matches <code>null</code>:</strong> a missing field never equals a value, but <code>{ due: null }</code> finds tasks with <code>due: null</code> <strong>and</strong> tasks with no <code>due</code> at all.</li>'
        + '<li><strong>A cursor, not an array:</strong> <code>find</code> returns a pointer that fetches documents in batches as you read them. The shell prints the first 20; in Node.js you call <code>.toArray()</code> (or loop with <code>for await</code>), and chain <code>.sort()</code>, <code>.skip()</code> and <code>.limit()</code> before reading.</li></ul>',
    ],
    code: `db.tasks.find({ done: false })                       // every open task
db.tasks.find({ done: false, 'owner.name': 'Ana' })  // AND: both conditions
db.tasks.findOne({ title: 'Buy milk' })              // one document, or null
db.tasks.countDocuments({ done: true })              // 3

// Node.js driver (inside an async function)
const open = await db.collection('tasks').find({ done: false }).toArray();`,
    dialect: 'mongosh',
    example: 'With the seed data, `db.tasks.find({ done: false })` returns 7 documents and `db.tasks.countDocuments({ done: false })` returns `7`. The playground translates the filter to SQL: `SELECT * FROM tasks WHERE done = FALSE;`. Now try `db.tasks.find({ done: \'false\' })`: 0 documents, and a note explains why.',
    mistake: 'Writing the filter as SQL or JavaScript: `find({ done = false })`, `find({ priority > 3 })` or `find(done: false)`. A filter is always an **object** of `field: condition` pairs; comparisons other than equality use operators such as `{ priority: { $gt: 3 } }` (see [Query operators](#/database/documents/query-operators)).',
    widget: 'mongo-playground' },

  { id: 'update-operators', hub: 'crud', topic: 'crud',
    title: 'Updating: updateOne, updateMany and update operators',
    summary: '`updateOne(filter, update)` changes the first matching document and `updateMany` every match; the **update** document uses operators such as `$set`, `$unset`, `$inc`, `$push` and `$pull` to say **what** to change.',
    html: [
      '<p>An update has two halves: <strong>which</strong> documents (the filter, with the same rules as <code>find</code>) and <strong>what to change</strong> (the update document). The second half must be made of <strong>operators</strong>. A plain <code>{ done: true }</code> would be ambiguous (set one field, or replace the whole task?), so it is refused with "Update document requires atomic operators". To replace a whole document on purpose, use <code>replaceOne</code>.</p>',
      '<table><caption>The update operators you will use</caption><thead><tr><th scope="col">Operator</th><th scope="col">What it does</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>$set</code></th><td>Sets fields (creates them if missing); dot paths reach sub-documents</td><td><code>{ $set: { done: true, \'owner.name\': \'Benjamin\' } }</code></td></tr>'
        + '<tr><th scope="row"><code>$unset</code></th><td>Removes fields (the value given is ignored)</td><td><code>{ $unset: { due: \'\' } }</code></td></tr>'
        + '<tr><th scope="row"><code>$inc</code></th><td>Adds a number (negative to subtract); creates the field if missing</td><td><code>{ $inc: { priority: 1 } }</code></td></tr>'
        + '<tr><th scope="row"><code>$push</code></th><td>Appends a value to an array (<code>$each</code> for several)</td><td><code>{ $push: { tags: \'urgent\' } }</code></td></tr>'
        + '<tr><th scope="row"><code>$addToSet</code></th><td>Appends only if the value is not already there</td><td><code>{ $addToSet: { tags: \'urgent\' } }</code></td></tr>'
        + '<tr><th scope="row"><code>$pull</code></th><td>Removes every array element equal to a value or matching a condition</td><td><code>{ $pull: { comments: { author: \'Ben\' } } }</code></td></tr>'
        + '</tbody></table>',
      '<dl><dt><code>matchedCount</code></dt><dd>How many documents the filter found. 0 usually means a wrong filter, and an API answers <code>404</code>.</dd>'
        + '<dt><code>modifiedCount</code></dt><dd>How many actually changed; lower when a document already had the new value.</dd>'
        + '<dt><code>{ upsert: true }</code></dt><dd>A third argument: when nothing matches, a new document is inserted, built from the filter and the update. Use it on purpose ("create the settings document if missing").</dd></dl>',
    ],
    code: `db.tasks.updateOne({ title: 'Set up CI' }, { $set: { done: true } })
// { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }

db.tasks.updateMany({ tags: 'urgent' }, { $inc: { priority: 1 } })
// matchedCount: 4, modifiedCount: 4

db.tasks.updateOne({ title: 'Set up CI' }, { done: true })
// MongoInvalidArgumentError: Update document requires atomic operators`,
    dialect: 'mongosh',
    example: 'Marking a task done from `PATCH /tasks/:id` with body `{ "done": true }`: `await tasks.updateOne({ _id: new ObjectId(id) }, { $set: { done: req.body.done } })`, then answer `404` if `matchedCount` is 0. Running the same `$set` twice gives `matchedCount: 1, modifiedCount: 0` the second time: the task was found but already done.',
    mistake: 'Replacing an array when you meant to add to it: `{ $set: { tags: [\'urgent\'] } }` throws away the existing tags, while `{ $push: { tags: \'urgent\' } }` keeps them. And `updateOne` with a filter that matches several documents changes **only the first one**: use `updateMany` when you mean all of them.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Run updates in the playground (then Reset data)' } },

  { id: 'delete-empty-filter', hub: 'crud', topic: 'crud',
    title: 'Deleting, and the danger of {}',
    summary: '`deleteOne(filter)` removes the first matching document and `deleteMany(filter)` every match; because an empty filter `{}` matches **everything**, `deleteMany({})` empties the collection without asking.',
    html: [
      '<p>A filter selects documents the same way for every method, so the most dangerous filter is the one with no conditions. <code>deleteMany({})</code> empties the collection, like a SQL <code>DELETE</code> without its <code>WHERE</code>, with no confirmation and no undo; <code>updateMany({}, …)</code> changes every document.</p>',
      '<p>Empty filters rarely come from typing <code>{}</code>. They come from code that <strong>builds</strong> the filter from a request and ends up with nothing in it: a missing query parameter, a misspelled property, or a request body that was never parsed.</p>',
      '<h3>Habits that prevent it</h3>',
      '<ul><li><strong>Refuse an empty filter</strong> before any <code>deleteMany</code> or <code>updateMany</code>.</li>'
        + '<li><strong>Delete by <code>_id</code>:</strong> one resource per request, <code>DELETE /tasks/:id</code> runs <code>deleteOne({ _id })</code>.</li>'
        + '<li><strong>Look first:</strong> run the filter with <code>find</code> or <code>countDocuments</code> before deleting.</li>'
        + '<li><strong>Check the result:</strong> a <code>deletedCount</code> of 0 means nothing matched, and an API answers <code>404</code>.</li></ul>',
    ],
    code: `// A clean-up helper: the guard stops the empty filter
async function deleteTasks(tasks, query) {
  const filter = {};
  if (query.done !== undefined) filter.done = query.done === 'true';
  // called without ?done=  →  filter is {}  →  EVERY task would be deleted
  if (Object.keys(filter).length === 0) {
    throw new Error('A filter is required');
  }
  const { deletedCount } = await tasks.deleteMany(filter);
  return deletedCount;
}`,
    dialect: 'js',
    example: 'In the playground, `db.tasks.find({ done: true })` shows 3 tasks; `db.tasks.deleteMany({ done: true })` then reports `deletedCount: 3`. Loading the example "Delete (empty filter!)" deletes all 10 tasks and the result warns you; press **Reset data** to bring them back.',
    mistake: 'Using `deleteOne` to mean "delete this one" with a filter that is not unique, such as `{ title: \'Study\' }`. It removes whichever matching document comes first, which may not be the one the user clicked. Identify the document by `_id`.' },

  /* ---- 3. Queries ------------------------------------------------------------------------ */
  { id: 'query-operators', hub: 'query', topic: 'query',
    title: 'Query operators: comparison and logic',
    summary: 'Conditions other than equality use **query operators**, written as `{ field: { $operator: value } }`: comparison (`$eq $ne $gt $gte $lt $lte`), lists (`$in $nin`), presence (`$exists`), patterns (`$regex`), and `$and` / `$or` to combine whole conditions.',
    html: [
      '<p><code>{ priority: 5 }</code> can only say "equals". For anything else, replace the value by an object whose key is an <strong>operator</strong>: <code>{ priority: { $gt: 3 } }</code> reads "priority greater than 3". The <code>$</code> marks an operator rather than a field name, and several operators in one object all apply: <code>{ priority: { $gte: 2, $lte: 4 } }</code> is "between 2 and 4".</p>',
      '<table><caption>Query operators (SQL equivalent in the last column)</caption><thead><tr><th scope="col">Operator</th><th scope="col">Meaning</th><th scope="col">Example</th><th scope="col">SQL</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>$eq</code> / <code>$ne</code></th><td>Equal / not equal (<code>$ne</code> also matches a missing field)</td><td><code>{ done: { $ne: true } }</code></td><td><code>done &lt;&gt; TRUE</code></td></tr>'
        + '<tr><th scope="row"><code>$gt</code> <code>$gte</code> <code>$lt</code> <code>$lte</code></th><td>Greater / at least / less / at most</td><td><code>{ priority: { $gte: 3 } }</code></td><td><code>priority &gt;= 3</code></td></tr>'
        + '<tr><th scope="row"><code>$in</code> / <code>$nin</code></th><td>Equal to one of a list / to none of it</td><td><code>{ priority: { $in: [1, 5] } }</code></td><td><code>priority IN (1, 5)</code></td></tr>'
        + '<tr><th scope="row"><code>$exists</code></th><td>The field is present (<code>true</code>) or absent (<code>false</code>)</td><td><code>{ due: { $exists: true } }</code></td><td><code>due IS NOT NULL</code> (roughly)</td></tr>'
        + '<tr><th scope="row"><code>$regex</code> or <code>/…/</code></th><td>A string matches a pattern (<code>i</code> = ignore case)</td><td><code>{ title: /^write/i }</code></td><td><code>title ILIKE \'write%\'</code></td></tr>'
        + '<tr><th scope="row"><code>$or</code></th><td>At least one of the filters holds</td><td><code>{ $or: [{ done: true }, { priority: 5 }] }</code></td><td><code>done OR priority = 5</code></td></tr>'
        + '<tr><th scope="row"><code>$and</code></th><td>All the filters hold</td><td><code>{ $and: [{ due: { $exists: true } }, { due: { $lt: ISODate(\'2026-09-26\') } }] }</code></td><td><code>… AND …</code></td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Same type only:</strong> <code>{ priority: { $gt: 3 } }</code> never matches a priority stored as the string <code>\'5\'</code>, one more reason to keep types consistent (see <a href="#/database/documents/flexible-schema">Flexible schema</a>).</li>'
        + '<li><strong>Inside or outside:</strong> comparison operators go <strong>inside</strong> a field; <code>$and</code>, <code>$or</code> and <code>$nor</code> go at the <strong>top</strong> of the filter and take an array of filters.</li>'
        + '<li><strong><code>$and</code> is rarely needed:</strong> conditions on different fields are already combined with AND. Use it only to put two conditions on the <strong>same</strong> field in separate objects.</li></ul>',
    ],
    code: `db.tasks.find({ priority: { $gt: 3 } })                 // 4 or 5
db.tasks.find({ priority: { $gte: 2, $lte: 4 } })       // a range
db.tasks.find({ tags: { $in: ['db', 'api'] } })         // any of these tags
db.tasks.find({ due: { $exists: true } })              // tasks that have a due date
db.tasks.find({ title: /write/i })                      // 'Write …' in any case
db.tasks.find({ $or: [{ priority: 5 }, { done: true }] })`,
    dialect: 'mongosh',
    example: 'In the playground, `db.tasks.find({ $or: [{ priority: 5 }, { done: true }] })` returns 4 tasks: Set up CI (priority 5) plus the 3 finished ones. The SQL panel shows `WHERE priority = 5 OR done = TRUE`. Mistype an operator (`$get`) and the error says `unknown operator: $get (did you mean $gt?)`.',
    mistake: 'Putting the operator in the wrong place: `{ $gt: { priority: 3 } }` (operator outside, field inside) fails with "unknown top level operator", and `{ priority: { $or: [...] } }` fails too. Also avoid writing the same field twice in one object (`{ priority: { $gt: 1 }, priority: { $lt: 5 } }`): in JavaScript the second silently replaces the first; combine them as `{ priority: { $gt: 1, $lt: 5 } }`.',
    widget: 'mongo-playground' },

  { id: 'arrays-dot-notation', hub: 'query', topic: 'query',
    title: 'Dot notation: inside sub-documents and arrays',
    summary: '**Dot notation** (`\'owner.name\'`, `\'comments.author\'`) reaches fields inside sub-documents and inside the elements of arrays; on an array field, a plain value matches arrays that **contain** it.',
    html: [
      '<p><code>\'owner.name\'</code> means "the <code>name</code> inside <code>owner</code>". When a path crosses an <strong>array</strong>, MongoDB looks at <strong>every element</strong>: <code>\'comments.author\': \'Ben\'</code> matches a task if <strong>any</strong> of its comments was written by Ben. Paths with dots go in <strong>quotes</strong>, because <code>owner.name: …</code> is not a valid object key in JavaScript.</p>',
      '<table><caption>Asking about an array of values</caption><thead><tr><th scope="col">Filter</th><th scope="col">Matches</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>{ tags: \'urgent\' }</code></th><td>Arrays that <strong>contain</strong> <code>\'urgent\'</code></td></tr>'
        + '<tr><th scope="row"><code>{ tags: [\'devops\', \'urgent\'] }</code></th><td>Exactly that array, in that order</td></tr>'
        + '<tr><th scope="row"><code>{ tags: { $all: [\'api\', \'urgent\'] } }</code></th><td>Contains all of them, in any order</td></tr>'
        + '<tr><th scope="row"><code>{ tags: { $size: 0 } }</code></th><td>Exactly 0 elements</td></tr>'
        + '<tr><th scope="row"><code>{ \'tags.0\': \'api\' }</code></th><td>The first element is <code>\'api\'</code></td></tr>'
        + '</tbody></table>',
      '<h3>Several conditions on one element</h3>',
      '<p><code>{ \'comments.author\': \'Ben\', \'comments.text\': /done/ }</code> matches if some comment is by Ben and some, possibly <strong>another</strong>, mentions "done". To require <strong>one element</strong> that meets every condition, use <code>$elemMatch</code>: <code>{ comments: { $elemMatch: { author: \'Ben\', text: /done/ } } }</code>.</p>',
    ],
    code: `db.tasks.find({ 'owner.name': 'Ben' })               // inside a sub-document
db.tasks.find({ 'comments.author': 'Ben' })           // inside an array of sub-documents
db.tasks.find({ tags: 'urgent' })                     // the array contains 'urgent'
db.tasks.find({ tags: { $all: ['api', 'urgent'] } })  // contains both
db.tasks.find({ tags: { $size: 0 } })                 // no tags at all
db.tasks.find({ comments: { $elemMatch: { author: 'Ben', text: /sort/i } } })`,
    dialect: 'mongosh',
    example: 'Against the seed data, `{ \'owner.name\': \'Ben\' }` finds 3 tasks, `{ \'comments.author\': \'Ben\' }` finds 2 (Write the SQL schema and Add pagination), and `{ tags: \'urgent\' }` finds 4. The SQL panel shows why these are hard in SQL: each needs a JOIN with `users`, `comments` or `task_tags`.',
    mistake: 'Writing `{ owner: { name: \'Ben\' } }` to find Ben\'s tasks. That asks for an `owner` sub-document **exactly equal** to `{ name: \'Ben\' }`, with no other fields, so it finds nothing (the owner also has an `email`). Use dot notation for one field: `{ \'owner.name\': \'Ben\' }`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Query arrays and sub-documents in the playground' } },

  { id: 'projection', hub: 'query', topic: 'query',
    title: 'Projection: choose the fields you get back',
    summary: 'The second argument of `find` is the **projection**: `{ title: 1 }` returns only the listed fields (plus `_id`), `{ comments: 0 }` returns everything except the listed fields; the two styles cannot be mixed, except for `_id: 0`.',
    html: [
      '<p>A filter chooses <strong>which documents</strong>; a projection chooses <strong>which fields</strong> of them, like the column list after <code>SELECT</code>. Sending only what the client needs saves bandwidth and keeps fields such as a user\'s <code>passwordHash</code> on the server.</p>',
      '<dl><dt>Inclusion: <code>{ title: 1 }</code></dt><dd>Only these fields, plus <code>_id</code>.</dd>'
        + '<dt>Exclusion: <code>{ comments: 0 }</code></dt><dd>Every field except these.</dd>'
        + '<dt><code>_id: 0</code></dt><dd>Hides <code>_id</code>, in either style.</dd></dl>',
      '<ul><li><strong>One style per projection:</strong> <code>{ title: 1, done: 0 }</code> is an error ("Cannot do exclusion on field done in inclusion projection"), because nobody could tell what should happen to the other fields. <code>_id</code> is the only exception.</li>'
        + '<li><strong>Dot paths work:</strong> <code>{ \'owner.name\': 1, _id: 0 }</code> returns <code>{ owner: { name: \'Ben\' } }</code>.</li>'
        + '<li><strong>In Node.js</strong> the projection goes in the options: <code>find(filter, { projection: { title: 1 } })</code>, or <code>find(filter).project({ title: 1 })</code>.</li></ul>',
    ],
    code: `db.tasks.find({}, { title: 1 })            // _id and title
db.tasks.find({}, { title: 1, _id: 0 })    // only title
db.tasks.find({}, { comments: 0, owner: 0 })  // everything except comments and owner
db.tasks.find({}, { title: 1, done: 0 })
// MongoServerError: Cannot do exclusion on field done in inclusion projection

// Node.js driver
await tasks.find({ done: false }, { projection: { title: 1, _id: 0 } }).toArray();`,
    dialect: 'mongosh',
    example: '`db.tasks.find({ done: false }, { title: 1, _id: 0 })` returns 7 small documents such as `{ title: \'Buy milk\' }`, the MongoDB version of `SELECT title FROM tasks WHERE done = FALSE`. An exclusion projection has no SQL twin: SQL cannot say "all columns except", which the playground explains under the result.',
    mistake: 'Passing the projection as the **first** argument: `find({ title: 1 })` is a **filter** ("documents whose title equals 1") and returns nothing. To project every document, give an empty filter first: `find({}, { title: 1 })`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Try projections in the playground' } },

  { id: 'sort-paginate', hub: 'query', topic: 'query',
    title: 'Sorting and pagination: sort, skip, limit',
    summary: '`.sort({ field: 1 })` orders results (1 ascending, -1 descending, several keys allowed), `.skip(n)` jumps over the first n and `.limit(n)` keeps at most n; together they give pages: `skip((page - 1) * limit).limit(limit)`.',
    html: [
      '<p>To show page 3 with 10 items per page: put the list in a fixed order, step over the 20 items of pages 1 and 2, and take the next 10. In SQL that is <code>ORDER BY … LIMIT 10 OFFSET 20</code> (see <a href="#/database/relational/pagination">Pagination in SQL</a>); in MongoDB, <code>.sort({ … }).skip(20).limit(10)</code>. The query string and the shape of the response are part of the API contract (see <a href="#/http/api-design/query-params">Filters, sorting and pagination</a>).</p>',
      '<ul><li><strong>Always sort:</strong> without <code>sort</code>, documents come in <strong>natural order</strong> (roughly the order they were stored), which MongoDB does not promise to keep, so pages could overlap or skip items.</li>'
        + '<li><strong>Add a tie-breaker:</strong> when the sort key can repeat, add a unique field such as <code>_id</code>: <code>.sort({ priority: -1, _id: 1 })</code>.</li>'
        + '<li><strong>The total</strong> comes from <code>countDocuments(filter)</code> with the same filter. The API sends the page as an array and the total in the <code>X-Total-Count</code> header.</li>'
        + '<li><strong>Deep pages are slow:</strong> <code>skip</code> still walks over every skipped document. Large apps page by range instead ("tasks created before the last one I showed").</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'MongoDB always sorts, then skips, then limits, whatever order you chain them in.',
      desc: 'Four steps in a fixed order. The filter keeps the matching documents. Sort puts them in order, by createdAt then _id. Skip steps over (page − 1) × limit documents. Limit keeps the next limit documents: one page.',
      nodes: [
        { id: 'filter', label: 'Filter', note: '`{ done: false }`' },
        { id: 'sort', label: 'Sort', note: 'by `createdAt`, then `_id`', key: true },
        { id: 'skip', label: 'Skip', note: '`(page − 1) × limit`' },
        { id: 'limit', label: 'Limit', note: 'one page' },
      ],
      edges: [['filter', 'sort'], ['sort', 'skip'], ['skip', 'limit']],
    },
    code: `// GET /tasks?page=2&limit=4   (oldest first: an array body, the total in a header)
const page = Number(req.query.page) || 1;
const limit = Math.min(Number(req.query.limit) || 10, 50);   // cap the page size
const filter = { done: false };

const [items, total] = await Promise.all([
  tasks.find(filter).sort({ createdAt: 1, _id: 1 })
    .skip((page - 1) * limit).limit(limit).toArray(),
  tasks.countDocuments(filter),
]);
res.set('X-Total-Count', String(total)).json(items);`,
    dialect: 'js',
    example: 'The seed has 10 tasks. With 4 per page sorted by `createdAt`, page 1 is tasks 1–4, page 2 is `db.tasks.find().sort({ createdAt: 1 }).skip(4).limit(4)` (Add pagination, Review pull request, Draft project plan, Design the Mongo schema), and page 3 holds the last 2. `Math.ceil(10 / 4)` gives 3 pages.',
    mistake: 'Computing `skip(page * limit)`, which makes page 1 start at the second page. Page n skips the **(n − 1) × limit** documents of the pages before it. Also check the input: `Number(\'abc\')` is `NaN`, and a client asking for `limit=100000` should be capped.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Page through the tasks in the playground' } },

  /* ---- 4. Designing documents: embedding and referencing ------------------------------- */
  { id: 'embedding', hub: 'design', topic: 'design',
    title: 'Embedding: keep together what you read together',
    summary: '**Embedding** stores related data inside the parent document, as a **sub-document** or an **array**, so one read returns everything and one write updates it atomically.',
    html: [
      '<p>Embedding puts related data <strong>inside</strong> the document that uses it: a task\'s tags as an array, its comments as an array of sub-documents, its owner\'s name as a sub-document. It fits data that belongs to one parent and is never shown without it, such as a task\'s tags or the lines of an order.</p>',
      '<dl><dt>One read</dt><dd><code>findOne</code> returns the task with its tags and comments: no join.</dd>'
        + '<dt>Atomic writes</dt><dd>A write to one document is all-or-nothing: changing <code>done</code> and pushing a comment in the same <code>updateOne</code> can never half-happen. Across several documents you would need a <strong>transaction</strong>.</dd>'
        + '<dt>Reaching inside</dt><dd>Queries use dot notation: <code>\'comments.author\'</code> (see <a href="#/database/documents/arrays-dot-notation">Dot notation</a>).</dd></dl>',
    ],
    diagram: {
      kind: 'tree',
      title: 'One document holds the task with its tags, owner and comments: one read returns it all.',
      desc: 'A task document contains a tags array of strings, an owner sub-document with name and email, and a comments array of sub-documents: one comment by Cleo and one by Ben.',
      nodes: [
        { id: 'task', label: 'Task document', note: '`title`, `done`', key: true },
        { id: 'tags', label: '`tags`', note: 'array of strings' },
        { id: 'owner', label: '`owner`', note: 'sub-document' },
        { id: 'comments', label: '`comments`', note: 'array of sub-documents' },
        { id: 'c1', label: 'Comment by Cleo' },
        { id: 'c2', label: 'Comment by Ben' },
      ],
      edges: [['task', 'tags'], ['task', 'owner'], ['task', 'comments'], ['comments', 'c1'], ['comments', 'c2']],
    },
    code: `// tasks: comments and tags are embedded (they belong to this task only)
{
  _id: ObjectId('6a9bda10a1b2c3d4e5000105'),
  title: 'Add pagination',
  done: false,
  tags: [ 'api', 'urgent' ],
  comments: [
    { author: 'Cleo', text: 'Use skip and limit' },
    { author: 'Ben', text: 'Sort first!' }
  ]
}

// one atomic write changes the task and its comments together
db.tasks.updateOne(
  { title: 'Add pagination' },
  { $set: { done: true }, $push: { comments: { author: 'Ana', text: 'Done!' } } }
)`,
    dialect: 'mongosh',
    example: 'In SQL, showing "Add pagination" with its tags and comments takes three tables and two joins (`tasks`, `task_tags`, `comments`). In MongoDB it is `db.tasks.findOne({ title: \'Add pagination\' })`: one document, one round trip. Try this card\'s update in the playground and look at the task in the data view.',
    mistake: 'Embedding something that is also needed on its own. If the API has `GET /comments?author=Ben` across all tasks, or comments can be edited from a moderation page, embedded comments make those queries awkward (you must search inside every task). Embed only what is read through its parent.' },

  { id: 'referencing', hub: 'design', topic: 'design',
    title: 'Referencing: store the _id of another document',
    summary: '**Referencing** stores only the `_id` of a related document (for example `ownerId` in a task), keeping each entity in its own collection; you fetch the related document with a second query or with **`$lookup`**.',
    html: [
      '<p>A reference stores only the <code>_id</code> of the related document: the task keeps <code>ownerId: ObjectId(\'…\')</code> and the user stays in <code>users</code>, where it is updated once and read by every task that points to it. This is the foreign-key idea from SQL.</p>',
      '<ul><li><strong>Nothing checks it:</strong> there is no <code>REFERENCES users(id)</code> and no <code>ON DELETE CASCADE</code> (see <a href="#/database/relational/foreign-keys">Foreign keys</a>). A task can point at a user that does not exist, and deleting a user leaves its tasks behind: your code deletes or reassigns them (<code>deleteMany({ ownerId: id })</code>), ideally where it deletes the user.</li>'
        + '<li><strong>Two reads to show both:</strong> find the task, then <code>findOne</code> its user, or join them with <code>$lookup</code> (see <a href="#/database/documents/unwind-lookup">$unwind and $lookup</a>). Both cost more than reading one embedded document, so references are for data that is shared or grows large.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Many tasks point to one user, who is stored once, in their own collection.',
      desc: 'Two task documents, Set up CI and Write API tests, each store ownerId 6a93…0002. That id belongs to Ben\'s document in the users collection, stored once.',
      nodes: [
        { id: 't1', label: '"Set up CI"', note: 'a task, `ownerId: …0002`' },
        { id: 't2', label: '"Write API tests"', note: 'a task, `ownerId: …0002`' },
        { id: 'ben', label: 'Ben in `users`', note: '`_id: …0002`', key: true },
      ],
      edges: [['t1', 'ben'], ['t2', 'ben']],
    },
    code: `// users
{ _id: ObjectId('6a93ea08a1b2c3d4e5000002'), name: 'Ben', email: 'ben@example.com' }

// tasks reference their owner by _id (like tasks.user_id in SQL)
{ _id: ObjectId('…'), title: 'Set up CI', ownerId: ObjectId('6a93ea08a1b2c3d4e5000002') }

// Node.js: two queries
const task = await db.collection('tasks').findOne({ _id: taskId });
const owner = await db.collection('users').findOne({ _id: task.ownerId });`,
    dialect: 'js',
    example: 'A user may own hundreds of tasks over a year, and the API reads tasks one by one (`GET /tasks/:id`) and page by page (`GET /tasks?page=3&limit=10`). Keeping tasks in their own collection with an `ownerId` reference serves both, and `db.tasks.find({ ownerId: benId }).sort({ createdAt: -1 }).limit(10)` (with an index on `ownerId`) lists Ben\'s latest tasks.',
    mistake: 'Assuming MongoDB cleans up like `ON DELETE CASCADE`. After `db.users.deleteOne({ _id: benId })`, Ben\'s tasks are still there, pointing at nobody, and the API may crash when it tries to show their owner. Deleting a parent means deleting or updating its children in your own code.' },

  { id: 'embed-or-reference', hub: 'design', topic: 'design',
    title: 'Embed or reference? Rules of thumb',
    summary: 'Embed data that is **read with its parent, belongs to it alone and stays small**; reference data that **grows without limit, is queried on its own, or is shared** by many documents. A document can never exceed **16 MB**.',
    html: [
      '<p>Decide per relationship, from how the data is <strong>read</strong> and how much it can <strong>grow</strong>. Ask three questions:</p>',
      '<dl><dt>Is it read with the parent?</dt><dd>If every screen that shows a task also shows its tags: embed.</dd>'
        + '<dt>How many can there be?</dt><dd>A few, with a natural limit (tags, an address, the lines of an order): embed. Hundreds, or "it keeps growing" (a user\'s tasks, log entries): reference.</dd>'
        + '<dt>Is it used alone or shared?</dt><dd>If it has its own URL, is edited on its own, or appears on many parents (a user on many tasks): reference.</dd></dl>',
      '<table><caption>Decisions for a tasks app</caption><thead><tr><th scope="col">Related data</th><th scope="col">Typical size</th><th scope="col">Read with parent?</th><th scope="col">Used alone?</th><th scope="col">Choice</th></tr></thead><tbody>'
        + '<tr><th scope="row">A task\'s tags</th><td>A few strings</td><td>Always</td><td>No</td><td><strong>Embed</strong> an array</td></tr>'
        + '<tr><th scope="row">A task\'s comments</th><td>A handful</td><td>Yes, on the task page</td><td>Rarely</td><td><strong>Embed</strong> an array of sub-documents</td></tr>'
        + '<tr><th scope="row">A user\'s tasks</th><td>Grows forever</td><td>Only in pages</td><td>Yes: <code>GET /tasks/:id</code></td><td><strong>Reference</strong>: a <code>tasks</code> collection with <code>ownerId</code></td></tr>'
        + '<tr><th scope="row">The owner\'s name on a task</th><td>One field</td><td>Yes, in lists</td><td>–</td><td><strong>Embed a copy</strong> and keep the reference (accept duplication)</td></tr>'
        + '<tr><th scope="row">Users ↔ projects (many-to-many)</th><td>Many on both sides</td><td>Partly</td><td>Yes</td><td><strong>Reference</strong>: arrays of ids, or a membership collection</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>16 MB per document</strong> is a hard limit. Long before it, a huge document is slow: every read loads it whole and every <code>$push</code> rewrites it. An array that grows without bound will eventually hit the limit.</li>'
        + '<li><strong>The middle way, a copy:</strong> embed the few fields you show often and keep the reference for the rest. The playground\'s tasks embed <code>owner: { name, email }</code>, so a list shows the owner without a second query. The price is <strong>duplication</strong>: if Ben changes his name, every copy must be updated (<code>updateMany({ \'owner.email\': \'ben@example.com\' }, { $set: { \'owner.name\': \'Benjamin\' } })</code>) or it goes stale. Copy only fields that rarely change.</li></ul>',
    ],
    example: 'A tempting first design is a user document with an embedded `tasks` array. By the three questions, that is a poor fit for a tasks API: tasks grow without limit, have their own routes, are paginated and are updated one at a time. A separate `tasks` collection with `ownerId` (plus, if you like, an embedded `owner.name` copy) follows the rules.',
    mistake: 'Deciding by habit: "MongoDB means embed everything" or "always normalise like SQL". Both extremes hurt. Decide per relationship, from how the data is read and how big it can grow.' },

  /* ---- 5. Aggregation ------------------------------------------------------------------- */
  { id: 'aggregation-pipeline', hub: 'aggregate', topic: 'aggregate',
    title: 'The aggregation pipeline',
    summary: 'An **aggregation pipeline** is an array of **stages** (`$match`, `$project`, `$group`, `$sort`, `$limit`…) that documents flow through in order, each stage transforming the output of the previous one.',
    html: [
      '<p>Documents flow through the stages in order, and each stage sees only what the stage before it handed over. You write the pipeline as one array: <code>db.tasks.aggregate([ stage1, stage2, … ])</code>.</p>',
      '<table><caption>The stages you will use most</caption><thead><tr><th scope="col">Stage</th><th scope="col">What it does</th><th scope="col">SQL idea</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>$match</code></th><td>Keeps the documents that match a filter (same syntax as <code>find</code>)</td><td><code>WHERE</code> (or <code>HAVING</code> after <code>$group</code>)</td></tr>'
        + '<tr><th scope="row"><code>$project</code></th><td>Keeps, removes, renames or computes fields</td><td>The <code>SELECT</code> list</td></tr>'
        + '<tr><th scope="row"><code>$group</code></th><td>One output document per group, with accumulators</td><td><code>GROUP BY</code> + <code>COUNT</code>/<code>SUM</code>/<code>AVG</code></td></tr>'
        + '<tr><th scope="row"><code>$sort</code> / <code>$skip</code> / <code>$limit</code></th><td>Order, skip, keep the first n</td><td><code>ORDER BY</code> / <code>OFFSET</code> / <code>LIMIT</code></td></tr>'
        + '<tr><th scope="row"><code>$unwind</code></th><td>One document per element of an array</td><td>Joining a child table</td></tr>'
        + '<tr><th scope="row"><code>$lookup</code></th><td>Adds the matching documents of another collection as an array</td><td><code>LEFT JOIN</code></td></tr>'
        + '<tr><th scope="row"><code>$count</code></th><td>Replaces everything by one document with the number of documents</td><td><code>SELECT COUNT(*)</code></td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>When to use it:</strong> <code>find</code> can filter, project, sort and page. Use <code>aggregate</code> to <strong>compute</strong>: totals per group, new fields, one document per array element, data from another collection. The output documents need not look like the stored ones.</li>'
        + '<li><strong><code>\'$priority\'</code> is a value:</strong> inside stages, a string that starts with <code>$</code> means the value of that field; <code>\'$owner.name\'</code> reaches into a sub-document.</li>'
        + '<li><strong><code>$match</code> first:</strong> every later stage then handles fewer documents, and only a leading <code>$match</code> can use an index.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Each stage works only on what the stage before it handed over.',
      desc: 'This card\'s pipeline, stage by stage. The 10 tasks enter. $match keeps the 7 open ones. $sort orders them by priority. $limit keeps the top 3. $project turns them into 3 small documents with title, owner and tag count.',
      nodes: [
        { id: 'in', label: 'All tasks', note: '10 documents' },
        { id: 'match', label: '`$match`', note: 'open ones: 7', key: true },
        { id: 'sort', label: '`$sort`', note: 'by priority: 7' },
        { id: 'limit', label: '`$limit`', note: 'the top 3' },
        { id: 'project', label: '`$project`', note: '3 small documents' },
      ],
      edges: [['in', 'match'], ['match', 'sort'], ['sort', 'limit'], ['limit', 'project']],
    },
    code: `// The 3 open tasks with the highest priority, as small documents
db.tasks.aggregate([
  { $match: { done: false } },                       // 10 → 7 documents
  { $sort: { priority: -1, createdAt: 1 } },         // order them
  { $limit: 3 },                                     // 7 → 3
  { $project: { _id: 0, title: 1, owner: '$owner.name', tagCount: { $size: '$tags' } } }
])
// { title: 'Set up CI', owner: 'Ben', tagCount: 2 }
// { title: 'Write the SQL schema' … } is not here: it is done.`,
    dialect: 'mongosh',
    example: 'Run this card\'s pipeline in the playground and then remove one stage at a time: without `$limit` you get 7 documents, without `$match` the finished tasks appear, without `$project` you get whole documents. Watching what each stage receives is the fastest way to debug a pipeline.',
    mistake: 'Passing the stages without the array: `aggregate({ $match: … }, { $group: … })`. The pipeline is **one array** of stage objects, and each stage object has exactly one key: `aggregate([ { $match: … }, { $group: … } ])`.',
    widget: 'mongo-playground' },

  { id: 'group-accumulators', hub: 'aggregate', topic: 'aggregate',
    title: '$group: one result per group',
    summary: '`$group` collects documents that share the same **`_id` expression** into one output document per group, and computes **accumulators** for each group: `$sum`, `$avg`, `$min`, `$max`, `$push`, `$addToSet`, `$count`.',
    html: [
      '<p><code>$group</code> puts the documents that share the same <strong><code>_id</code> expression</strong> into one group and writes one output document per group, with <strong>accumulators</strong> computed over it. It is SQL\'s <code>GROUP BY</code> with aggregate functions (see <a href="#/database/relational/aggregates">Aggregates</a>).</p>',
      '<dl><dt><code>_id: \'$owner.name\'</code></dt><dd>The group key: one group per owner name. <code>_id: null</code> makes one group of everything (totals for the whole collection).</dd>'
        + '<dt><code>{ $sum: 1 }</code></dt><dd>Adds 1 per document: a count.</dd>'
        + '<dt><code>{ $sum: \'$priority\' }</code>, <code>{ $avg: \'$priority\' }</code></dt><dd>The total and the average of a field; <code>$min</code> and <code>$max</code> work the same way.</dd>'
        + '<dt><code>{ $push: \'$title\' }</code></dt><dd>Collects the values into an array (<code>$addToSet</code> skips duplicates).</dd></dl>',
      '<ul><li><strong>Only <code>_id</code> and the accumulators survive:</strong> every other field of the input documents is gone.</li>'
        + '<li><strong>Filter groups</strong> by their totals (SQL\'s <code>HAVING</code>) with a <code>$match</code> <strong>after</strong> the <code>$group</code>; order them with a <code>$sort</code> on the new field.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The 7 open tasks become one result per owner.',
      desc: 'The 7 open tasks are grouped by owner name: Ana gets a document with open 3, Ben one with open 2, and Cleo one with open 2.',
      nodes: [
        { id: 'open', label: 'Open tasks', note: '7 documents', key: true },
        { id: 'ana', label: 'Ana', note: '`open: 3`' },
        { id: 'ben', label: 'Ben', note: '`open: 2`' },
        { id: 'cleo', label: 'Cleo', note: '`open: 2`' },
      ],
      edges: [['open', 'ana'], ['open', 'ben'], ['open', 'cleo']],
    },
    code: `// Open tasks per owner, with their average priority, busiest first
db.tasks.aggregate([
  { $match: { done: false } },
  { $group: {
      _id: '$owner.name',
      open: { $sum: 1 },
      avgPriority: { $avg: '$priority' },
      titles: { $push: '$title' }
  } },
  { $sort: { open: -1 } }
])
// { _id: 'Ana',  open: 3, avgPriority: 2,   titles: [ 'Buy milk', … ] }
// { _id: 'Ben',  open: 2, avgPriority: 4,   titles: [ 'Set up CI', 'Write API tests' ] }
// { _id: 'Cleo', open: 2, avgPriority: 3.5, titles: [ … ] }

-- The same in SQL (relational tasks/users schema)
SELECT u.name, COUNT(*) AS open, AVG(t.priority) AS avg_priority
FROM tasks t JOIN users u ON u.id = t.user_id
WHERE t.done = FALSE
GROUP BY u.name
ORDER BY open DESC;`,
    dialect: 'mongosh',
    example: 'An "open tasks per user" pipeline over a different data shape is the same idea (tasks embedded in users): `$unwind` the tasks, `$match` the open ones, then `$group: { _id: \'$email\', openTasks: { $sum: 1 } }`. In the playground, challenge "Tasks per owner" asks for `{ _id: <name>, count: <number> }` per owner.',
    mistake: 'Forgetting the `$` in the group key: `_id: \'owner.name\'` is the constant text "owner.name", so every document lands in **one** group and you get a single result with the total count. Field paths in aggregation expressions always start with `$`. (In a `$match` filter, by contrast, field names never take a `$`.)',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Group and count in the playground' } },

  { id: 'unwind-lookup', hub: 'aggregate', topic: 'aggregate',
    title: '$unwind and $lookup',
    summary: '`$unwind: \'$tags\'` turns one document with an array into **one document per element**; `$lookup` adds, to each document, an **array** of the matching documents of another collection (a left outer join).',
    html: [
      '<dl><dt><code>{ $unwind: \'$tags\' }</code></dt><dd>One document per array element: a task tagged <code>[\'api\', \'urgent\']</code> becomes two documents, identical except that <code>tags</code> is <code>\'api\'</code> in one and <code>\'urgent\'</code> in the other. A <code>$group</code> by <code>\'$tags\'</code> can then count tasks per tag.</dd>'
        + '<dt><code>$lookup</code></dt><dd>Adds to each document an <strong>array</strong> of the matching documents of another collection. You name the collection (<code>from</code>), the field in this document (<code>localField</code>), the matching field there (<code>foreignField</code>) and the new field to fill (<code>as</code>).</dd></dl>',
      '<ul><li><strong>Empty arrays vanish:</strong> documents whose array is empty or missing disappear after <code>$unwind</code>, unless you write <code>{ $unwind: { path: \'$tags\', preserveNullAndEmptyArrays: true } }</code>.</li>'
        + '<li><strong>A left outer join:</strong> every input document stays after <code>$lookup</code>, with an empty <code>as</code> array when nothing matches, like SQL\'s <code>LEFT JOIN</code>, except that the matches arrive as an array inside the document instead of as extra rows.</li>'
        + '<li><strong>A <code>$lookup</code> on every request</strong> hints that the data might be better embedded (see <a href="#/database/documents/embed-or-reference">Embed or reference?</a>). When you do use it, index the <code>foreignField</code>, or every lookup scans the other collection.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: '`$unwind` copies the document once for each element of its array.',
      desc: 'One task with tags api and urgent enters $unwind. Two documents come out: the same task with tags set to api, and the same task with tags set to urgent.',
      nodes: [
        { id: 'task', label: 'One task', note: '`tags: [api, urgent]`', key: true },
        { id: 'a', label: 'Same task', note: '`tags: \'api\'`' },
        { id: 'u', label: 'Same task', note: '`tags: \'urgent\'`' },
      ],
      edges: [['task', 'a'], ['task', 'u']],
    },
    code: `// Tasks per tag
db.tasks.aggregate([
  { $unwind: '$tags' },                         // 10 tasks → 17 (task, tag) documents
  { $group: { _id: '$tags', n: { $sum: 1 } } },
  { $sort: { n: -1, _id: 1 } }
])
// { _id: 'urgent', n: 4 }, { _id: 'db', n: 3 }, { _id: 'api', n: 2 }, …

// Each task with its owner's full user document
db.tasks.aggregate([
  { $match: { title: 'Set up CI' } },
  { $lookup: { from: 'users', localField: 'owner.email', foreignField: 'email', as: 'ownerDoc' } }
])
// { …, title: 'Set up CI', ownerDoc: [ { name: 'Ben', role: 'student', … } ] }`,
    dialect: 'mongosh',
    example: 'In the seed, 9 tasks have tags (17 tags in total) and "Book a room for the demo" has none. `[{ $unwind: \'$tags\' }]` alone returns 17 documents; "Book a room" is not among them. With `preserveNullAndEmptyArrays: true` you get 18.',
    mistake: 'Expecting `$lookup` to return one joined object: `ownerDoc` is always an **array**, even for exactly one match, so `ownerDoc.name` in your code is `undefined`. Read `ownerDoc[0]`, or add `{ $unwind: \'$ownerDoc\' }` after the lookup.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Try $unwind and $lookup in the playground' } },

  /* ---- 6. Indexes and the back end ----------------------------------------------------- */
  { id: 'indexes', hub: 'app', topic: 'app',
    title: 'Indexes: from scanning to looking up',
    summary: 'An **index** is a sorted structure (a **B-tree**) of the values of one or more fields that points to the documents; with it, MongoDB finds matches without reading every document (**IXSCAN** instead of **COLLSCAN**), at the cost of storage and slower writes.',
    html: [
      '<p>An index keeps the values of one or more fields <strong>sorted</strong>, each pointing to its document, so MongoDB finds matches without reading every document. The idea, the B-tree and the cost on every write are the same as in SQL (see <a href="#/database/relational/indexes">Indexes in SQL</a>); this card is the MongoDB side.</p>',
      '<dl><dt><code>createIndex({ priority: 1 })</code></dt><dd>An index on one field: 1 ascending, -1 descending. Every collection already has a unique index on <code>_id</code>.</dd>'
        + '<dt>Compound: <code>{ ownerId: 1, createdAt: -1 }</code></dt><dd>Serves "Ben\'s tasks, newest first", and queries on <code>ownerId</code> alone (a <strong>prefix</strong>), but not queries on <code>createdAt</code> alone.</dd>'
        + '<dt>Unique: <code>{ email: 1 }, { unique: true }</code></dt><dd>The database refuses duplicates: one account per email. A duplicate fails with error <strong>E11000</strong>.</dd>'
        + '<dt><code>.explain(\'executionStats\')</code></dt><dd>Shows the plan: <strong>COLLSCAN</strong> reads every document, <strong>IXSCAN</strong> uses an index. Compare <code>totalDocsExamined</code> with <code>nReturned</code>: examining 10 000 documents to return 10 is a missing index.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'With an index on priority, the same query reads 1 document instead of 10.',
      desc: 'The query find({ priority: 5 }) on the 10 seed tasks. Without an index, the plan is a COLLSCAN that examines all 10 documents. With an index on priority, the plan is an IXSCAN that examines only the 1 matching document.',
      nodes: [
        { id: 'q', label: 'The query', note: '`find({ priority: 5 })`' },
        { id: 'coll', label: 'COLLSCAN', note: 'examines all 10' },
        { id: 'ix', label: 'IXSCAN', note: 'examines 1', key: true },
      ],
      edges: [['q', 'coll', 'no index'], ['q', 'ix', 'index on priority']],
    },
    code: `db.tasks.find({ priority: 5 }).explain('executionStats')
// winningPlan: { stage: 'COLLSCAN' } · totalDocsExamined: 10 · nReturned: 1

db.tasks.createIndex({ priority: 1 })
db.tasks.find({ priority: 5 }).explain('executionStats')
// winningPlan: FETCH ← IXSCAN { priority: 1 } · totalDocsExamined: 1 · nReturned: 1

db.tasks.createIndex({ ownerId: 1, createdAt: -1 })   // compound: owner, then newest first
db.users.createIndex({ email: 1 }, { unique: true })  // one account per email
db.users.insertOne({ name: 'Ana 2', email: 'ana@example.com' })
// MongoServerError: E11000 duplicate key error … index: email_1 dup key: { email: 'ana@example.com' }`,
    dialect: 'mongosh',
    example: 'In the playground, load the example "Index + explain": the first plan is a COLLSCAN that examines all 10 tasks; after `createIndex({ priority: 1 })` the same query is an IXSCAN that examines only the 1 matching task. (The playground\'s planner is simplified, but the before/after is the real behaviour.) The example "Unique index" shows the E11000 error.',
    mistake: 'Indexing "just in case". An index on `email` makes `find({ email })` faster, but makes every **insert**, every **update** that changes `email`, and every **delete** slower, and uses memory. Add an index when a real, frequent query needs it, and check with `explain`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Compare plans with explain() in the playground' } },

  { id: 'node-driver', hub: 'app', topic: 'app',
    title: 'Connecting from Node.js: the official driver',
    summary: 'The official **`mongodb`** package gives you a `MongoClient` that you **connect once** at startup and reuse; `client.db(\'app\').collection(\'tasks\')` returns a collection with the same methods as the shell, all returning Promises.',
    html: [
      '<p>Create one <code>MongoClient</code>, connect it <strong>once</strong> when the server starts and reuse it for every request: it manages a <strong>connection pool</strong>, the same idea as the <code>pg</code> pool (see <a href="#/database/relational/drivers-pools">Drivers and pools</a>). The connection string comes from the environment (<code>process.env.MONGO_URL</code>, such as <code>mongodb://localhost:27017</code>), never from the code, because it may contain a password.</p>',
      '<table><caption>From mongosh to the Node.js driver</caption><thead><tr><th scope="col"></th><th scope="col">mongosh</th><th scope="col">Node.js driver</th></tr></thead><tbody>'
        + '<tr><th scope="row">Results</th><td>Printed</td><td>Promises: <code>await</code> them inside <code>async</code> functions</td></tr>'
        + '<tr><th scope="row"><code>find</code></th><td>Prints the first 20</td><td>A cursor: finish it with <code>.toArray()</code></td></tr>'
        + '<tr><th scope="row">Dates</th><td><code>ISODate(…)</code></td><td><code>new Date(…)</code></td></tr>'
        + '<tr><th scope="row">Ids</th><td><code>ObjectId(…)</code></td><td><code>new ObjectId(…)</code>, imported from <code>mongodb</code></td></tr>'
        + '</tbody></table>',
      '<p>The <strong>models/ seam</strong> of <a href="#/database/relational/models-layer">the models layer</a> stays the same: a factory <code>createTasksModel(db)</code> hides the database and maps <code>_id</code> to the <code>id</code> your API returns. Errors thrown in <code>async</code> handlers reach Express as described in <a href="#/server/routes/express-async-errors">Async handlers</a>.</p>',
    ],
    code: `// db.js: connect once, share the database object
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URL);
let db;
async function connect() {
  await client.connect();
  db = client.db('app');
  return db;
}
module.exports = { connect, getDb: () => db };

// server.js: no top-level await in CommonJS, so wait with .then
const app = require('./app');
const { connect } = require('./db');
connect().then(() => app.listen(3000, () => console.log('API on http://localhost:3000')));

// models/tasksModel.js: the same seam as the SQL model, MongoDB inside
const { ObjectId } = require('mongodb');
function createTasksModel(db) {
  const tasks = db.collection('tasks');
  const toDto = ({ _id, ...rest }) => ({ id: _id.toString(), ...rest });
  return {
    async findById(id) {
      if (!ObjectId.isValid(id)) return null;              // bad id → treated as not found
      const doc = await tasks.findOne({ _id: new ObjectId(id) });
      return doc ? toDto(doc) : null;
    },
    async create({ title, done = false }) {
      const doc = { title, done, createdAt: new Date() };
      const { insertedId } = await tasks.insertOne(doc);
      return toDto({ ...doc, _id: insertedId });
    },
  };
}
module.exports = { createTasksModel };`,
    dialect: 'js',
    example: 'A controller keeps calling `await tasksModel.findById(req.params.id)` and answers 404 on `null`, exactly as with the SQL model; only `models/` changed: swap the storage, keep the shape. The API still returns `{ "id": "6a9a…104", "title": "Set up CI", … }`.',
    mistake: 'Passing request data straight into a filter: `users.findOne({ email: req.body.email, password: req.body.password })`. `express.json()` turns `{"password": {"$ne": null}}` into an object, the filter then means "any password that is not null", and the attacker logs in without knowing it: **NoSQL injection**. Check that values are strings (`typeof x === \'string\'`, or [validate the body](#/http/api-design/validation)) before building filters, and never compare plain passwords anyway: they are stored [hashed](#/server/auth/hash-not-encrypt).' },

  { id: 'mongoose', hub: 'app', topic: 'app',
    title: 'Mongoose: schemas and models on top of the driver',
    summary: '**Mongoose** is an **ODM** (object-document mapper) for Node.js: you declare a **schema** (fields, types, required, defaults, limits) and get a **model** whose methods validate documents before writing them to MongoDB.',
    html: [
      '<p>The driver writes whatever you hand it. With Mongoose you describe once what a task looks like, and every task is checked and completed (defaults, trimmed strings, timestamps) in your Node process before it is saved. Many Express projects and tutorials use it, so you should recognise it.</p>',
      '<dl><dt>Schema</dt><dd>The fields with their types and rules: <code>required</code>, <code>default</code>, <code>min</code> and <code>max</code>, <code>trim</code>.</dd>'
        + '<dt>Model</dt><dd><code>mongoose.model(\'Task\', taskSchema)</code>: a class bound to a collection, named in lower case and plural (<code>tasks</code>). <code>Task.find</code>, <code>Task.create</code> and <code>Task.findById</code> mirror the driver, cast types (an id string becomes an ObjectId) and drop fields that are not in the schema.</dd>'
        + '<dt><code>ref</code> + <code>.populate()</code></dt><dd>Replaces a referenced id by its document: a second query behind the scenes, like a manual <code>$lookup</code>.</dd></dl>',
      '<p><strong>Validation runs on <code>create</code> and <code>save</code>.</strong> Update methods such as <code>findByIdAndUpdate</code> skip it unless you pass <code>{ runValidators: true }</code>.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Mongoose checks and completes each document in your Node process, before MongoDB sees it.',
      desc: 'A plain object such as a task with an untrimmed title goes to the schema, which casts types, adds defaults and validates. The model Task, bound to the tasks collection, then writes the checked document to MongoDB.',
      nodes: [
        { id: 'obj', label: 'Plain object', note: '`title: \'  Study  \'`' },
        { id: 'schema', label: 'Schema', note: 'casts, defaults, validates', key: true },
        { id: 'model', label: 'Model `Task`', note: 'collection `tasks`' },
        { id: 'db', label: 'MongoDB', note: 'stores the document' },
      ],
      edges: [['obj', 'schema'], ['schema', 'model'], ['model', 'db']],
    },
    code: `const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true, maxlength: 100 },
  done:     { type: Boolean, default: false },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  tags:     [String],
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });          // adds createdAt and updatedAt

const Task = mongoose.model('Task', taskSchema);   // collection 'tasks'

// inside async functions (connect once at startup: await mongoose.connect(url))
const task = await Task.create({ title: '  Study  ', owner: userId });   // title → 'Study'
const open = await Task.find({ done: false }).sort({ createdAt: -1 }).limit(10).populate('owner', 'name');
await Task.findByIdAndUpdate(id, { priority: 9 }, { runValidators: true });  // rejected: max 5`,
    dialect: 'js',
    example: '`await Task.create({ owner: userId })` throws a `ValidationError` ("Path `title` is required") without contacting the database, which your error handler can turn into `400 Bad Request`. The same insert through the bare driver would have been stored.',
    mistake: 'Believing Mongoose makes MongoDB itself enforce the schema. The rules live in your Node process: a script, another service or the shell that writes to the same collection bypasses them, and updates skip validation unless you ask for it. For rules that must always hold, add a `$jsonSchema` validator or a unique index in the database too.' },

  { id: 'sql-or-mongo', hub: 'app', topic: 'app',
    title: 'SQL or MongoDB? Choosing honestly',
    summary: 'Choose a **relational database** when your data is many linked entities with stable rules and you want the database to guarantee integrity; choose **MongoDB** when records are self-contained documents read as a whole, or their shape varies. Both can run a typical web API.',
    html: [
      '<p>Start from the data and the questions, not from fashion. A web of entities that refer to each other (users, projects, tasks, comments, permissions), with reports across them, gets joins, foreign keys and constraints for free in SQL. Requests that are "fetch this thing with everything inside it" (a product page with its variants, a submitted form, an article made of blocks), with shapes that vary from record to record, fit documents.</p>',
      '<table><caption>Which way does your project lean?</caption><thead><tr><th scope="col">Question</th><th scope="col">Leans SQL</th><th scope="col">Leans MongoDB</th></tr></thead><tbody>'
        + '<tr><th scope="row">What does a typical read return?</th><td>Rows combined from several tables</td><td>One document with everything inside</td></tr>'
        + '<tr><th scope="row">How stable is the shape?</th><td>Known up front, rarely changes</td><td>Varies per record or changes often</td></tr>'
        + '<tr><th scope="row">Who must enforce the rules?</th><td>The database (<code>NOT NULL</code>, FK, <code>CHECK</code>)</td><td>Your code or a validator is acceptable</td></tr>'
        + '<tr><th scope="row">Relationships</th><td>Many-to-many, shared entities, cascades</td><td>Mostly parent → few children</td></tr>'
        + '<tr><th scope="row">Reports</th><td>Ad-hoc joins and <code>GROUP BY</code> across entities</td><td>Pipelines over one collection</td></tr>'
        + '<tr><th scope="row">Multi-record changes</th><td>Frequent (money transfers, stock)</td><td>Rare: most writes touch one document</td></tr>'
        + '</tbody></table>',
      '<h3>Claims that are out of date</h3>',
      '<ul><li><strong>"MongoDB has no transactions":</strong> multi-document <strong>ACID transactions</strong> exist since MongoDB 4.0 (on replica sets), although single-document writes, which are atomic, remain the normal tool.</li>'
        + '<li><strong>"SQL cannot store JSON":</strong> PostgreSQL has a <code>jsonb</code> column type with indexes.</li>'
        + '<li><strong>"MongoDB scales and SQL does not":</strong> both scale far beyond a small project; at that size, design and indexes matter far more than the engine.</li></ul>',
      '<p><strong>Learn both:</strong> the concepts transfer, and many teams run one of each. With a layered API, switching is cheap: routes and controllers stay identical and only <code>models/</code> changes (see <a href="#/database/relational/models-layer">The models layer</a>).</p>',
    ],
    example: 'A tasks API fits both. SQL: `users` and `tasks` with a foreign key and `ON DELETE CASCADE`, owner checks by `user_id`, `LIMIT/OFFSET` pages. MongoDB: a `tasks` collection with `ownerId` (plus an embedded `owner.name` copy), tags and comments embedded, an index on `{ ownerId: 1, createdAt: -1 }`. A course-enrolment system with students, groups, subjects and grades, queried in every direction, leans clearly towards SQL.',
    mistake: 'Picking MongoDB "to avoid designing a schema". The design work does not disappear; it moves into your code, where the database can no longer help you. Pick it when the document model fits your reads, and then design the documents carefully.' },

  { id: 'sql-bridge', hub: 'app', topic: 'app',
    title: 'From SQL to MongoDB: the vocabulary',
    summary: 'A recap of the section as a dictionary: table → **collection**, row → **document**, column → **field**, primary key → **`_id`**, JOIN → **embedding** or **`$lookup`**, `WHERE` → a **filter** document, `GROUP BY` → **`$group`**.',
    html: [
      '<p>The questions you ask a database stay the same (which records? which fields? in what order? how many per group?); only the way you write them changes. SQL writes a sentence (<code>SELECT … FROM … WHERE …</code>); MongoDB passes JavaScript-like objects to methods (<code>find({ … }, { … })</code>).</p>',
      '<table><caption>The same ideas in both worlds (the tasks/users domain)</caption><thead><tr><th scope="col">Idea</th><th scope="col">SQL (PostgreSQL)</th><th scope="col">MongoDB</th></tr></thead><tbody>'
        + '<tr><th scope="row">A group of similar records</th><td>Table <code>tasks</code></td><td>Collection <code>tasks</code></td></tr>'
        + '<tr><th scope="row">One record</th><td>Row (flat)</td><td>Document (can nest objects and arrays)</td></tr>'
        + '<tr><th scope="row">A named value</th><td>Column (declared, one type)</td><td>Field (not declared; any type)</td></tr>'
        + '<tr><th scope="row">Identity</th><td><code>id SERIAL PRIMARY KEY</code></td><td><code>_id</code> (ObjectId by default)</td></tr>'
        + '<tr><th scope="row">Related data</th><td>Foreign key <code>user_id</code> + <code>JOIN</code></td><td>Embedded sub-document, or an <code>_id</code> reference + <code>$lookup</code></td></tr>'
        + '<tr><th scope="row">Read</th><td><code>SELECT title FROM tasks WHERE done = FALSE</code></td><td><code>db.tasks.find({ done: false }, { title: 1 })</code></td></tr>'
        + '<tr><th scope="row">Sort and page</th><td><code>ORDER BY … LIMIT 10 OFFSET 20</code></td><td><code>.sort({ … }).skip(20).limit(10)</code></td></tr>'
        + '<tr><th scope="row">Count per group</th><td><code>SELECT user_id, COUNT(*) … GROUP BY user_id</code></td><td><code>aggregate([{ $group: { _id: \'$owner\', n: { $sum: 1 } } }])</code></td></tr>'
        + '<tr><th scope="row">Create / change / remove</th><td><code>INSERT</code>, <code>UPDATE … SET</code>, <code>DELETE</code></td><td><code>insertOne</code>, <code>updateOne</code> + <code>$set</code>, <code>deleteOne</code></td></tr>'
        + '<tr><th scope="row">Schema rules</th><td>Enforced by the database (<code>NOT NULL</code>, types, FK)</td><td>Enforced by your code, a validator or Mongoose</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Where related data lives</strong> is the deepest difference: SQL keeps each entity in its own table and joins at query time; MongoDB embeds or references (see <a href="#/database/documents/embed-or-reference">Embed or reference?</a>).</li>'
        + '<li><strong>The database checks less:</strong> no schema unless you add one (see <a href="#/database/documents/flexible-schema">Flexible schema</a>), and no foreign keys: nothing stops a task from pointing at a user that was deleted.</li></ul>',
    ],
    example: 'The relational query "open tasks of ana@example.com" is `SELECT t.title FROM tasks t JOIN users u ON u.id = t.user_id WHERE u.email = \'ana@example.com\' AND t.done = FALSE`. With the owner embedded in each task, MongoDB needs no join: `db.tasks.find({ \'owner.email\': \'ana@example.com\', done: false }, { title: 1 })`. The playground shows "The same in SQL" under each result so you can compare.',
    mistake: 'Translating a SQL schema table by table, with a `task_tags` collection, a `comments` collection and ids everywhere, then joining them with `$lookup` in every query. That keeps all the costs of the relational model and loses its guarantees (no foreign keys, weaker joins). Design documents around how the data is **read**.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Compare queries with SQL in the playground' } },
];

DATA.en.MONGO_QUIZ = [
  /* documents and collections */
  { type: 'mc', topic: 'model',
    q: 'In `db.orders.find()` typed in mongosh, what is `orders`?',
    choices: ['A database', 'A collection', 'A document', 'A field'],
    answer: 1,
    why: '`db` is the current database; `db.orders` is one of its **collections**; `find()` returns its documents.' },
  { type: 'tf', topic: 'model',
    q: 'Before inserting the first document into `db.logs`, you must create the `logs` collection with a separate command.',
    answer: false,
    why: 'Collections are created **lazily** by the first insert. That is also why a typo in a collection name silently creates a new one.' },
  { type: 'mc', topic: 'model',
    q: 'Why does MongoDB store BSON instead of plain JSON text?',
    choices: ['BSON is easier for people to read', 'BSON adds types JSON lacks, such as dates, ObjectId and exact integers, in a compact binary form', 'JSON cannot represent nested objects', 'BSON encrypts the data on disk'],
    answer: 1,
    why: 'JSON has no date or ObjectId type; BSON keeps the same document shape but with richer types, in binary.' },
  { type: 'mc', topic: 'model',
    q: 'An Express route runs `tasks.findOne({ _id: req.params.id })` with an id copied from a real task, and always gets `null`. Why?',
    choices: ['`findOne` needs `toArray()`', 'The id in the URL is a string, and a string is never equal to an ObjectId', 'Ids must be passed as numbers', 'The `_id` index is missing'],
    answer: 1,
    why: 'Convert it: `{ _id: new ObjectId(req.params.id) }`, after checking it is well-formed.' },
  { type: 'fib', topic: 'model',
    q: 'Every MongoDB document has a unique primary-key field called ___.',
    accept: ['_id'],
    why: 'If you do not provide `_id`, the driver generates an ObjectId for it. It cannot be changed afterwards.' },
  { type: 'tf', topic: 'model',
    q: 'By default, MongoDB rejects a document that has fields the other documents of the collection do not have.',
    answer: false,
    why: 'Collections are schema-flexible unless you add a `$jsonSchema` validator; checks otherwise live in your code (or Mongoose).' },
  { type: 'mc', topic: 'model',
    q: 'Which SQL concept corresponds to a MongoDB **field**?',
    choices: ['Table', 'Row', 'Column', 'Foreign key'],
    answer: 2,
    why: 'Table ↔ collection, row ↔ document, column ↔ field, primary key ↔ `_id`.' },

  /* embedding and referencing */
  { type: 'mc', topic: 'design',
    q: 'A shop stores orders. Each order has 1–20 lines (product, quantity, price) that are always shown with the order and never queried on their own. What fits best?',
    choices: ['A separate `orderLines` collection referenced by id', 'Embed the lines as an array inside each order', 'One collection per order', 'Store the lines as a comma-separated string'],
    answer: 1,
    why: 'Small, bounded, read with the parent and owned by it: the textbook case for **embedding**.' },
  { type: 'mc', topic: 'design',
    q: 'Which situation is the strongest reason to **reference** instead of embedding?',
    choices: ['The child data is always read with its parent', 'The child list grows without limit and children are read on their own (`GET /tasks/:id`)', 'The children are a few strings', 'You want a single atomic write'],
    answer: 1,
    why: 'Unbounded growth (16 MB limit, slow huge documents) and independent access call for a separate collection.' },
  { type: 'fib', topic: 'design',
    q: 'A single MongoDB document can be at most ___ MB.',
    accept: ['16'],
    why: 'An array that keeps growing will eventually hit the 16 MB limit, and becomes slow long before.' },
  { type: 'tf', topic: 'design',
    q: 'Deleting a user in MongoDB automatically deletes the tasks whose `ownerId` points to that user.',
    answer: false,
    why: 'MongoDB has no foreign keys and no `ON DELETE CASCADE`: your code must delete or update the children.' },
  { type: 'mc', topic: 'design',
    q: 'Each task embeds a copy of `owner.name`. What is the cost of that choice?',
    choices: ['Task lists need a `$lookup` to show the name', 'When a user changes name, every task that copied it must be updated, or the copies go stale', 'Tasks can no longer be found by owner', 'The `_id` of the task changes'],
    answer: 1,
    why: 'Duplication buys fast reads (no second query) at the price of extra writes and possible inconsistency.' },
  { type: 'tf', topic: 'design',
    q: 'An `updateOne` that changes a task\'s `done` field and pushes a comment into its embedded `comments` array is atomic: either both changes happen or neither does.',
    answer: true,
    why: 'Writes to a **single document** are atomic, embedded arrays included. Changes across documents need a transaction.' },

  /* CRUD */
  { type: 'mc', topic: 'crud',
    q: 'What does `db.tasks.updateOne({ title: \'Study\' }, { done: true })` do?',
    choices: ['Sets `done` to `true` on the first match', 'Replaces the whole task with `{ done: true }`', 'It is rejected: the update document needs operators such as `$set`', 'Sets `done` on every match'],
    answer: 2,
    why: 'Without operators the update is ambiguous, so the shell and drivers refuse it ("Update document requires atomic operators"). Use `{ $set: { done: true } }`.' },
  { type: 'mc', topic: 'crud',
    q: 'You want to add the tag `\'urgent\'` to a task and keep its other tags. Which update?',
    choices: ['`{ $set: { tags: [\'urgent\'] } }`', '`{ $push: { tags: \'urgent\' } }`', '`{ tags: \'urgent\' }`', '`{ $inc: { tags: \'urgent\' } }`'],
    answer: 1,
    why: '`$push` appends to the array; `$set` would replace the whole array with a new one.' },
  { type: 'mc', topic: 'crud',
    q: 'An update returns `matchedCount: 1, modifiedCount: 0`. What happened?',
    choices: ['The filter matched nothing', 'The document was found but already had those values', 'The update failed with an error', 'A new document was inserted'],
    answer: 1,
    why: '`matchedCount` counts documents found by the filter; `modifiedCount` those that actually changed.' },
  { type: 'tf', topic: 'crud',
    q: '`db.tasks.deleteMany({})` deletes every document in `tasks`.',
    answer: true,
    why: 'An empty filter has no conditions, so it matches every document. There is no confirmation and no undo.' },
  { type: 'fib', topic: 'crud',
    q: 'The update operator that increases a number field by a given amount is ___.',
    accept: ['$inc', 'inc'],
    why: '`{ $inc: { priority: 1 } }` adds 1; a negative number subtracts.' },
  { type: 'mc', topic: 'crud',
    q: 'Three tasks are titled "Study". What does `deleteOne({ title: \'Study\' })` remove?',
    choices: ['All three', 'The first matching one only', 'None: the filter must be unique', 'The most recently created one'],
    answer: 1,
    why: '`deleteOne` removes the first match (natural order). To delete a specific document, filter by `_id`.' },
  { type: 'mc', topic: 'crud',
    q: 'In the Node.js driver, what does `collection.find({ done: false })` return before you call anything else on it?',
    choices: ['An array of documents', 'A Promise of an array', 'A cursor, read with `.toArray()` or `for await`', 'The number of matches'],
    answer: 2,
    why: '`find` returns a **cursor**; chain `sort`/`skip`/`limit`, then `await cursor.toArray()`.' },

  /* queries, projection, pagination */
  { type: 'mc', topic: 'query',
    q: 'Which filter finds tasks with a priority **greater than 3**?',
    choices: ['`{ priority > 3 }`', '`{ priority: { $gt: 3 } }`', '`{ $gt: { priority: 3 } }`', '`{ priority: \'>3\' }`'],
    answer: 1,
    why: 'Comparison operators go **inside** the field: `{ field: { $gt: value } }`.' },
  { type: 'mc', topic: 'query',
    q: 'A task has `tags: [\'api\', \'urgent\']`. Which filter does **not** match it?',
    choices: ['`{ tags: \'urgent\' }`', '`{ tags: { $in: [\'urgent\', \'home\'] } }`', '`{ tags: [\'urgent\', \'api\'] }`', '`{ tags: { $all: [\'urgent\', \'api\'] } }`'],
    answer: 2,
    why: 'A whole array as the value means **exactly** that array, in that order. A single value means "contains"; `$all` ignores order.' },
  { type: 'mc', topic: 'query',
    q: 'How do you find tasks whose embedded `owner` has the name `\'Ben\'`?',
    choices: ['`{ owner: { name: \'Ben\' } }`', '`{ \'owner.name\': \'Ben\' }`', '`{ owner.name: \'Ben\' }`', '`{ owner: \'Ben\' }`'],
    answer: 1,
    why: 'Dot notation, quoted. `{ owner: { name: \'Ben\' } }` demands an owner sub-document equal to exactly `{ name: \'Ben\' }`; the unquoted key is a syntax error.' },
  { type: 'mc', topic: 'query',
    q: 'What does `db.tasks.find({}, { title: 1, done: 0 })` do?',
    choices: ['Returns title only', 'Returns everything but done', 'Fails: inclusion and exclusion cannot be mixed (only `_id: 0` is allowed with inclusion)', 'Returns tasks whose title is 1 and done is 0'],
    answer: 2,
    why: 'A projection is either "only these fields" or "all but these". `_id` is the only exception.' },
  { type: 'tf', topic: 'query',
    q: '`db.tasks.find({ title: 1 })` returns only the title of every task.',
    answer: false,
    why: 'The first argument is the **filter**: this asks for tasks whose title equals the number 1. Projection is the second argument: `find({}, { title: 1 })`.' },
  { type: 'mc', topic: 'query',
    q: 'With 10 tasks per page, which chain returns page 4?',
    choices: ['`.sort({ createdAt: 1 }).skip(40).limit(10)`', '`.sort({ createdAt: 1 }).skip(30).limit(10)`', '`.skip(3).limit(10)`', '`.limit(40).skip(30)` without sort'],
    answer: 1,
    why: 'Page n skips (n − 1) × size = 30 documents. Always sort first so pages are stable.' },
  { type: 'tf', topic: 'query',
    q: '`find().limit(5).skip(10)` and `find().skip(10).limit(5)` return the same documents.',
    answer: true,
    why: 'MongoDB applies sort, then skip, then limit, whatever the order in which you chain them.' },
  { type: 'fib', topic: 'query',
    q: 'The operator that matches documents where a field is present (or absent) is ___.',
    accept: ['$exists', 'exists'],
    why: '`{ due: { $exists: true } }` finds tasks that have a `due` field.' },
  { type: 'mc', topic: 'query',
    q: 'Which filter matches tasks that are done **or** have priority 5?',
    choices: ['`{ done: true, priority: 5 }`', '`{ $or: [{ done: true }, { priority: 5 }] }`', '`{ done: { $or: [true, 5] } }`', '`{ $and: [{ done: true }, { priority: 5 }] }`'],
    answer: 1,
    why: 'Fields listed together are combined with AND; `$or` takes an array of filters at the top level.' },

  /* aggregation */
  { type: 'mc', topic: 'aggregate',
    q: 'Why is `$match` usually the **first** stage of a pipeline?',
    choices: ['It is required by MongoDB', 'Later stages then process fewer documents, and a leading `$match` can use an index', 'It sorts the documents', '`$group` only works after `$match`'],
    answer: 1,
    why: 'Filtering early shrinks the data every later stage sees; only the first `$match` can use an index.' },
  { type: 'mc', topic: 'aggregate',
    q: 'In `{ $group: { _id: \'$owner.name\', n: { $sum: 1 } } }`, what does `$sum: 1` compute?',
    choices: ['The sum of a field called 1', 'The number of documents in each group', 'Always 1', 'The number of groups'],
    answer: 1,
    why: 'It adds 1 per document of the group: a count, like `COUNT(*)` with `GROUP BY`.' },
  { type: 'mc', topic: 'aggregate',
    q: 'A pipeline groups with `_id: \'owner.name\'` (no `$`). What is the result?',
    choices: ['One group per owner name', 'An error', 'A single group, because `\'owner.name\'` is a constant string', 'One group per document'],
    answer: 2,
    why: 'In aggregation expressions, field paths start with `$`. Without it the key is the same text for every document.' },
  { type: 'tf', topic: 'aggregate',
    q: 'After a `$group` stage, the output documents still contain the other fields of the input documents, such as `title`.',
    answer: false,
    why: 'Only `_id` and the accumulator fields remain. Collect what you need with accumulators such as `$push` or `$first`.' },
  { type: 'mc', topic: 'aggregate',
    q: 'A task has `tags: [\'db\', \'sql\', \'urgent\']`. How many documents does `{ $unwind: \'$tags\' }` produce from it?',
    choices: ['1', '2', '3', '0'],
    answer: 2,
    why: 'One document per array element, each with `tags` set to one value.' },
  { type: 'mc', topic: 'aggregate',
    q: 'After `{ $lookup: { from: \'users\', localField: \'ownerId\', foreignField: \'_id\', as: \'owner\' } }`, what is `owner`?',
    choices: ['The user document', 'An array with the matching user documents (possibly empty)', 'The user\'s `_id`', 'A string with the user\'s name'],
    answer: 1,
    why: '`$lookup` always produces an array (a left outer join). Use `owner[0]` or a following `$unwind`.' },
  { type: 'fib', topic: 'aggregate',
    q: 'The aggregation stage that works like SQL\'s `GROUP BY` is ___.',
    accept: ['$group', 'group'],
    why: '`$group` makes one output document per distinct `_id` value, with accumulators for each group.' },
  { type: 'tf', topic: 'aggregate',
    q: 'To keep only the groups with more than 2 tasks, you add a `$match` stage after the `$group`.',
    answer: true,
    why: 'A `$match` after `$group` filters groups by their computed fields, like SQL\'s `HAVING`.' },

  /* indexes and the back end */
  { type: 'mc', topic: 'app',
    q: '`explain(\'executionStats\')` reports `COLLSCAN`, `totalDocsExamined: 50000`, `nReturned: 12`. What does it suggest?',
    choices: ['The query is optimal', 'There is no usable index for this filter, so every document was read', 'The collection is corrupted', 'The result was cached'],
    answer: 1,
    why: 'Examining far more documents than returned, with a collection scan, is the signature of a missing index.' },
  { type: 'mc', topic: 'app',
    q: 'You add an index on `email`. Which operation becomes **faster**?',
    choices: ['Inserting a user', '`find({ email: \'ana@example.com\' })`', 'Deleting a user', 'Updating every user\'s email'],
    answer: 1,
    why: 'Reads that filter on `email` get faster; every insert, delete and email update gets slightly slower because the index must be updated too.' },
  { type: 'mc', topic: 'app',
    q: 'With a compound index `{ ownerId: 1, createdAt: -1 }`, which query **cannot** use it efficiently?',
    choices: ['`find({ ownerId: x })`', '`find({ ownerId: x }).sort({ createdAt: -1 })`', '`find({ createdAt: { $gt: d } })`', '`find({ ownerId: x, createdAt: { $gt: d } })`'],
    answer: 2,
    why: 'A compound index helps queries on a **prefix** of its fields; `createdAt` alone is not a prefix.' },
  { type: 'fib', topic: 'app',
    q: 'Inserting a duplicate value into a field with a unique index fails with the error code E___ (five digits).',
    accept: ['11000', 'e11000'],
    why: 'E11000 duplicate key error: how a unique index on `email` guarantees one account per address.' },
  { type: 'mc', topic: 'app',
    q: 'Where should an Express app create its `MongoClient`?',
    choices: ['Inside every route handler, then close it', 'Once at startup; every request reuses it (it keeps a connection pool)', 'In the browser', 'In each model method'],
    answer: 1,
    why: 'Connecting per request is slow and exhausts connections. Connect once, share the `db` object.' },
  { type: 'mc', topic: 'app',
    q: 'A login runs `users.findOne({ email: req.body.email, password: req.body.password })`. An attacker sends `{"email":"ana@example.com","password":{"$ne":null}}`. What happens?',
    choices: ['The query fails with a syntax error', 'It matches Ana whatever her password: NoSQL injection', 'MongoDB escapes the object automatically', 'It matches nobody'],
    answer: 1,
    why: 'The parsed body becomes an operator. Validate types (strings only) before building filters, and compare password hashes, never plain passwords.' },
  { type: 'tf', topic: 'app',
    q: 'With Mongoose, `Task.findByIdAndUpdate(id, { priority: 9 })` runs the schema\'s `max: 5` validator by default.',
    answer: false,
    why: 'Update methods skip validators unless you pass `{ runValidators: true }`; `create` and `save` validate.' },
  { type: 'tf', topic: 'app',
    q: 'MongoDB cannot run transactions that change several documents.',
    answer: false,
    why: 'Multi-document ACID transactions exist since MongoDB 4.0 (replica sets). Single-document writes are atomic without them.' },
];
