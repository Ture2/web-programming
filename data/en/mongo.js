'use strict';
/* Document databases: concept cards, rail groups and self-check quiz (MongoDB as the worked example).
   See site/README.md for the data contract. `hub` and `topic` keys match MONGO_GROUPS and
   MONGO_QUIZ_TOPICS. */

DATA.en.MONGO_QUIZ_TOPICS = {
  model: 'Documents and collections',
  design: 'Embedding and referencing',
  crud: 'CRUD operations',
  query: 'Queries, projection and pagination',
  aggregate: 'Aggregation pipeline',
  app: 'Indexes and the back end',
};

DATA.en.MONGO_GROUPS = [
  { key: 'model', label: 'Documents and collections', icon: 'doc' },
  { key: 'design', label: 'Embedding and referencing', icon: 'tree' },
  { key: 'crud', label: 'CRUD operations', icon: 'files' },
  { key: 'query', label: 'Queries', icon: 'key' },
  { key: 'aggregate', label: 'Aggregation', icon: 'pipeline' },
  { key: 'app', label: 'Indexes and the back end', icon: 'index' },
];

DATA.en.MONGO_CONCEPTS = [
  /* ---- 1. Documents and collections ------------------------------------------------ */
  { id: 'document-model', hub: 'model', topic: 'model', 
    title: 'Databases, collections and documents',
    summary: '**MongoDB** is a **document database**: each record is a **document** (a JSON-like object that can contain sub-objects and arrays), similar documents live together in a **collection**, and collections are grouped in a **database**.',
    body: [
      'Think of a filing cabinet. The **database** is the cabinet (here called `app`), each **collection** is a drawer (`tasks`, `users`) and each **document** is one folder in a drawer. A folder holds a complete filled-in form, with its sub-sections and lists, not one line of a spreadsheet. That is the big difference from the SQL section: a SQL row is flat (one value per column), while a document can carry its tags, its comments or its owner\'s name inside itself.',
      'One MongoDB **server** can host several databases. In the MongoDB shell, **mongosh** (the command-line tool you type queries into), `db` means "the database I am using", and `db.tasks` is its `tasks` collection: `db.tasks.find()` asks that collection for its documents. Your Node.js code does the same through the **driver** (the library that speaks MongoDB\'s protocol), as `db.collection(\'tasks\').find()`.',
      'Collections and databases are created **lazily**: there is no `CREATE TABLE`. The first time you insert into `db.notes`, MongoDB creates the `notes` collection. Reading from a collection that does not exist is not an error either: it simply returns no documents.',
    ],
    points: [
      '**Document**: one record, a set of `field: value` pairs (values can be objects and arrays).',
      '**Collection**: a group of documents, usually of the same kind (like a table).',
      '**Database**: a group of collections (like a schema in PostgreSQL).',
    ],
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
    example: 'The playground\'s database `app` has two collections: `tasks` (10 documents) and `users` (3). The task above keeps its two tags and its owner inside itself. In the [relational schema](#/database/relational/relationships) the same information is spread over three tables (`tasks`, `users` and a tags table), joined by keys. Run `show collections` in the playground, then `db.tasks.find()`.',
    mistake: 'Misspelling a collection name and trusting the empty result. `db.task.find()` (no "s") returns nothing and raises no error, and `db.task.insertOne(…)` silently creates a second collection called `task`. When a query returns nothing unexpectedly, check the name first with `show collections`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Open the document query playground' } },

  { id: 'bson-objectid', hub: 'model', topic: 'model', 
    title: 'BSON, `_id` and ObjectId',
    summary: 'MongoDB stores documents as **BSON** (binary JSON), which adds types JSON lacks, such as dates and **ObjectId**; every document has an `_id` field, unique in its collection, which by default is an ObjectId.',
    body: [
      'JSON is text and knows only strings, numbers, booleans, `null`, objects and arrays. A database needs more: a real **date** type to sort by time, exact integer and decimal types, and a compact identifier. So MongoDB stores documents in **BSON**, a binary encoding of the same shape with extra types. You write JSON-like literals; the driver converts them to BSON on the way in and back to JavaScript objects on the way out.',
      'Every document needs an `_id`: it is the **primary key** (see the SQL section). It must be unique in the collection, it cannot be changed after the insert, and if you do not supply one the driver generates an **ObjectId**: a 12-byte value written as 24 hexadecimal characters. Its first 4 bytes are the creation time in seconds, followed by 5 random bytes and a 3-byte counter, so ids can be generated on any machine without asking the database, and they sort roughly by creation time.',
      'When a document leaves your API as JSON (`res.json(task)`), the ObjectId becomes a plain string and the date an ISO string. When the string comes back in a URL (`/tasks/6a9a…104`), the server must turn it back into an ObjectId before querying. To print BSON as text without losing the types, tools use **Extended JSON**: `{ "$oid": "6a9a…" }` for an ObjectId, `{ "$date": "2026-09-04T09:00:00Z" }` for a date.',
    ],
    table: {
      caption: 'The BSON types you will meet',
      head: ['BSON type', 'Shell literal', 'In Node.js', 'In JSON (API response)'],
      rows: [
        ['String', '`\'Set up CI\'`', '`\'Set up CI\'`', '`"Set up CI"`'],
        ['Double / Int32', '`5`, `2.5`', '`5`, `2.5`', '`5`, `2.5`'],
        ['Boolean', '`true`', '`true`', '`true`'],
        ['Date', '`ISODate(\'2026-09-04\')`', '`new Date(\'2026-09-04\')`', '`"2026-09-04T00:00:00.000Z"` (a string)'],
        ['ObjectId', '`ObjectId(\'6a9a…104\')`', '`new ObjectId(\'6a9a…104\')`', '`"6a9a…104"` (a string)'],
        ['Array / Object', '`[ … ]`, `{ … }`', '`[ … ]`, `{ … }`', '`[ … ]`, `{ … }`'],
        ['Null', '`null`', '`null`', '`null`'],
      ],
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

  { id: 'sql-bridge', hub: 'model', topic: 'model', 
    title: 'From SQL to MongoDB: the vocabulary',
    summary: 'Most SQL ideas have a MongoDB counterpart: table → **collection**, row → **document**, column → **field**, primary key → **`_id`**, JOIN → **embedding** or **`$lookup`**, `WHERE` → a **filter** document, `GROUP BY` → **`$group`**.',
    body: [
      'Learning MongoDB after SQL is like learning a second language with the same grammar: the questions you ask a database stay the same (which records? which fields? in what order? how many per group?), only the way you write them changes. SQL writes them as a sentence (`SELECT … FROM … WHERE …`); MongoDB writes them as JavaScript-like objects passed to methods (`find({ … }, { … })`).',
      'The deepest difference is **where related data lives**. SQL keeps every entity in its own table and joins them at query time using foreign keys (see [Foreign keys](#/database/relational/foreign-keys): the relational tasks schema links `tasks.user_id` to `users.id`). MongoDB lets you **embed** related data inside the document that uses it, or **reference** another document by its `_id` and fetch it separately or with `$lookup`. Choosing between the two is the main design decision (see the Embedding and referencing cards).',
      'Two more differences matter in practice. The database does not enforce a schema unless you ask it to (next card). And there are no foreign-key constraints: nothing stops a task from pointing at a user that was deleted.',
    ],
    table: {
      caption: 'The same ideas in both worlds (the tasks/users domain)',
      head: ['Idea', 'SQL (PostgreSQL)', 'MongoDB'],
      rows: [
        ['A group of similar records', 'Table `tasks`', 'Collection `tasks`'],
        ['One record', 'Row (flat)', 'Document (can nest objects and arrays)'],
        ['A named value', 'Column (declared, one type)', 'Field (not declared; any type)'],
        ['Identity', '`id SERIAL PRIMARY KEY`', '`_id` (ObjectId by default)'],
        ['Related data', 'Foreign key `user_id` + `JOIN`', 'Embedded sub-document, or an `_id` reference + `$lookup`'],
        ['Read', '`SELECT title FROM tasks WHERE done = FALSE`', '`db.tasks.find({ done: false }, { title: 1 })`'],
        ['Sort and page', '`ORDER BY … LIMIT 10 OFFSET 20`', '`.sort({ … }).skip(20).limit(10)`'],
        ['Count per group', '`SELECT user_id, COUNT(*) … GROUP BY user_id`', '`aggregate([{ $group: { _id: \'$owner\', n: { $sum: 1 } } }])`'],
        ['Create / change / remove', '`INSERT`, `UPDATE … SET`, `DELETE`', '`insertOne`, `updateOne` + `$set`, `deleteOne`'],
        ['Schema rules', 'Enforced by the database (`NOT NULL`, types, FK)', 'Enforced by your code, a validator or Mongoose'],
      ],
    },
    example: 'The relational query "open tasks of ana@example.com" is `SELECT t.title FROM tasks t JOIN users u ON u.id = t.user_id WHERE u.email = \'ana@example.com\' AND t.done = FALSE`. With the owner embedded in each task, MongoDB needs no join: `db.tasks.find({ \'owner.email\': \'ana@example.com\', done: false }, { title: 1 })`. The playground shows "The same in SQL" under each result so you can compare.',
    mistake: 'Translating a SQL schema table by table, with a `task_tags` collection, a `comments` collection and ids everywhere, then joining them with `$lookup` in every query. That keeps all the costs of the relational model and loses its guarantees (no foreign keys, weaker joins). Design documents around how the data is **read**.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Compare queries with SQL in the playground' } },

  { id: 'flexible-schema', hub: 'model', topic: 'model', 
    title: 'Flexible schema, and who checks the data',
    summary: 'MongoDB does not require every document of a collection to have the same fields or types; that flexibility moves the job of **validating** data from the database to your code, a **schema validator** on the collection, or a library such as **Mongoose**.',
    body: [
      'A SQL table is a printed form: every row has the same boxes, and the database refuses a row with a missing `NOT NULL` value or text in a number column. A MongoDB collection is a folder of free-form notes: by default it accepts any document. In the playground only some tasks have `due` or `comments`, and only Cleo\'s user document has `interests`. That is convenient while the design is changing, and dangerous once real data arrives: one typo (`titel` instead of `title`) creates a document that no query for `title` will ever find.',
      '"Schema-less" really means **the schema lives somewhere else**. You have three places to put it, and real projects combine them: (1) **validation in your API** before writing (for example Zod schemas in a `validators/` folder); (2) a **`$jsonSchema` validator** on the collection, so the database itself rejects bad documents with "Document failed validation"; (3) an **ODM** (object-document mapper) such as **Mongoose**, which declares a schema in JavaScript and checks documents before sending them (see the Mongoose card).',
      'Changing the shape later also needs discipline. SQL has migrations (`ALTER TABLE`); in MongoDB you write a script that updates old documents (`updateMany({ priority: { $exists: false } }, { $set: { priority: 3 } })`), or your code must handle both the old and the new shape.',
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
    example: 'Without any validation, `db.tasks.insertOne({ titel: \'Buy bread\', done: \'false\' })` is accepted. The task never appears in `find({ done: false })` (its `done` is the **string** `\'false\'`) nor in a search on `title`. With the validator above, the same insert fails at once; with Zod in the API, the request is answered `400 Bad Request` before the database is touched.',
    mistake: 'Taking "schema-less" as "no design needed". It is one of the most common beginner mistakes with document databases: the database will not stop you from writing inconsistent documents, so you find them in production. Write the shape of each collection down (fields, types, required ones) before coding, and validate in the API.' },

  /* ---- 2. Embedding and referencing ------------------------------------------------ */
  { id: 'embedding', hub: 'design', topic: 'design', 
    title: 'Embedding: keep together what you read together',
    summary: '**Embedding** stores related data inside the parent document, as a **sub-document** or an **array**, so one read returns everything and one write updates it atomically.',
    body: [
      'Picture an order receipt. Its lines (product, quantity, price) are printed on the receipt itself: you never look them up in a separate book, they belong to that receipt only, and they are never shown without it. That is the ideal case for embedding. A task\'s `tags`, an order\'s lines and a user\'s address behave the same way.',
      'Embedding gives you two things SQL would need extra work for. **One read**: `findOne` returns the task with its tags and comments, with no join. **Atomic writes**: a write to one document is all-or-nothing, so `$push`-ing a comment and changing `done` in the same `updateOne` can never half-happen. Across several documents you would need a **transaction**.',
      'You query embedded data with **dot notation**: `\'owner.name\'` reaches into a sub-document and `\'comments.author\'` into every element of an array of sub-documents (see the Dot notation card).',
    ],
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
    example: 'In SQL, showing "Add pagination" with its tags and comments takes three tables and two joins (`tasks`, `task_tags`, `comments`). In MongoDB it is `db.tasks.findOne({ title: \'Add pagination\' })`: one document, one round trip. Try the update above in the playground and look at the task in the data view.',
    mistake: 'Embedding something that is also needed on its own. If the API has `GET /comments?author=Ben` across all tasks, or comments can be edited from a moderation page, embedded comments make those queries awkward (you must search inside every task). Embed only what is read through its parent.' },

  { id: 'referencing', hub: 'design', topic: 'design', 
    title: 'Referencing: store the `_id` of another document',
    summary: '**Referencing** stores only the `_id` of a related document (for example `ownerId` in a task), keeping each entity in its own collection; you fetch the related document with a second query or with **`$lookup`**.',
    body: [
      'A library card does not contain the books you borrowed: it lists their **codes**, and the books stay on their shelves where anyone can find them. A reference works the same way: the task keeps `ownerId: ObjectId(\'…\')` and the user stays in `users`, where it can be updated once and read by every task that points to it. This is the foreign-key idea from SQL.',
      'The difference is that MongoDB **does not check references**. There is no `REFERENCES users(id)` and no `ON DELETE CASCADE` (the [relational tasks schema](#/database/relational/foreign-keys) relies on both): you can insert a task whose `ownerId` matches no user, and deleting a user leaves its tasks behind. Your code must delete or reassign them (`deleteMany({ ownerId: id })`), ideally in the same place that deletes the user.',
      'To show a task with its owner you either run two queries (find the task, then `findOne` the user) or use the aggregation stage `$lookup`, a left outer join (see the $unwind and $lookup card). Both cost more than reading one embedded document, which is why references are kept for data that really is shared or large.',
    ],
    code: `// users
{ _id: ObjectId('6a93ea08a1b2c3d4e5000002'), name: 'Ben', email: 'ben@example.com' }

// tasks reference their owner by _id (like tasks.user_id in SQL)
{ _id: ObjectId('…'), title: 'Set up CI', ownerId: ObjectId('6a93ea08a1b2c3d4e5000002') }

// Node.js: two queries
const task = await db.collection('tasks').findOne({ _id: taskId });
const owner = await db.collection('users').findOne({ _id: task.ownerId });`,
    dialect: 'js',
    example: 'A user may own hundreds of tasks over a year, and the API reads tasks one by one (`GET /tasks/:id`) and page by page (`GET /tasks?limit=10&offset=20`). Keeping tasks in their own collection with an `ownerId` reference serves both, and `db.tasks.find({ ownerId: benId }).sort({ createdAt: -1 }).limit(10)` (with an index on `ownerId`) lists Ben\'s latest tasks.',
    mistake: 'Assuming MongoDB cleans up like `ON DELETE CASCADE`. After `db.users.deleteOne({ _id: benId })`, Ben\'s tasks are still there, pointing at nobody, and the API may crash when it tries to show their owner. Deleting a parent means deleting or updating its children in your own code.' },

  { id: 'embed-or-reference', hub: 'design', topic: 'design', 
    title: 'Embed or reference? Rules of thumb',
    summary: 'Embed data that is **read with its parent, belongs to it alone and stays small**; reference data that **grows without limit, is queried on its own, or is shared** by many documents. A document can never exceed **16 MB**.',
    body: [
      'Ask three questions about the related data. (1) **Is it read together with the parent?** If every screen that shows a task also shows its tags, embed them. (2) **How many can there be?** A few, with a natural limit (tags, an address, the lines of one order): embed. Hundreds or "it keeps growing" (a user\'s tasks, a post\'s comments on a popular site, log entries): reference. (3) **Is it used on its own or by many parents?** If it has its own URL, is edited independently or is shared (a user shown on many tasks), reference.',
      'Size is a hard limit, not a style choice. A single document can be at most **16 MB**, and long before that a huge document is slow: every read loads it whole and every `$push` rewrites it. An array that grows without bound (say, a user document holding **all** of that user\'s tasks) will eventually hit the limit, and it makes "page 3 of my tasks" or "task 42" awkward queries.',
      'There is a middle way: **embed a copy of the few fields you show often** and keep the reference for the rest. The playground\'s tasks embed `owner: { name, email }`: the list screen shows the owner\'s name without a second query, and `owner.email` still identifies the user. The price is **duplication**: if Ben changes his name, every task that copied it must be updated (`updateMany({ \'owner.email\': \'ben@example.com\' }, { $set: { \'owner.name\': \'Benjamin\' } })`), or the copies go stale. Copy only fields that rarely change.',
    ],
    table: {
      caption: 'Decisions for a tasks app',
      head: ['Related data', 'Typical size', 'Read with parent?', 'Used alone?', 'Choice'],
      rows: [
        ['A task\'s tags', 'A few strings', 'Always', 'No', '**Embed** an array'],
        ['A task\'s comments', 'A handful', 'Yes, on the task page', 'Rarely', '**Embed** an array of sub-documents'],
        ['A user\'s tasks', 'Grows forever', 'Only in pages', 'Yes: `GET /tasks/:id`', '**Reference**: `tasks` collection with `ownerId`'],
        ['The owner\'s name on a task', 'One field', 'Yes, in lists', '–', '**Embed a copy** + keep the reference (accept duplication)'],
        ['Users ↔ projects (many-to-many)', 'Many on both sides', 'Partly', 'Yes', '**Reference**: arrays of ids, or a membership collection'],
      ],
    },
    example: 'A tempting first design is a user document with an embedded `tasks` array. By the rule above (embed only small, bounded data that is never queried on its own) that is a poor fit for a tasks API: tasks grow without limit, have their own routes, are paginated and are updated one at a time. A separate `tasks` collection with `ownerId` (plus, if you like, an embedded `owner.name` copy) follows the rule.',
    mistake: 'Deciding by habit: "MongoDB means embed everything" or "always normalise like SQL". Both extremes hurt. Decide per relationship, from how the data is read and how big it can grow.' },

  /* ---- 3. CRUD ------------------------------------------------------------------------- */
  { id: 'insert', hub: 'crud', topic: 'crud', 
    title: 'Creating documents: insertOne and insertMany',
    summary: '`insertOne(doc)` adds one document and `insertMany([docs])` several; if a document has no `_id`, one is generated, and the result reports the new id(s).',
    body: [
      'Inserting is handing a filled-in form to the clerk: the clerk stamps it with a reference number (`_id`) and files it in the right drawer, creating the drawer if it did not exist. You get a receipt back: `{ acknowledged: true, insertedId: ObjectId(\'…\') }`. In the Node.js driver the same receipt is the resolved value of `await tasks.insertOne(doc)`.',
      '`insertMany` is **ordered** by default: it inserts in array order and **stops at the first error** (for example a duplicate `_id`, or a duplicate email when there is a unique index), and the documents before the error **stay inserted**. It is not all-or-nothing; that would need a transaction.',
      'An insert does not check fields unless a validator or your code does (previous section). Dates should be real dates (`ISODate(…)` in the shell, `new Date()` in Node), not strings, or sorting by date will compare text.',
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
    body: [
      'A filter is a **template** that documents are held against: `{ done: false, priority: 5 }` reads "documents whose `done` is `false` **and** whose `priority` is `5`". Each field listed is one condition and **all of them must hold** (an implicit AND, like `WHERE done = FALSE AND priority = 5`). An empty filter `{}` has no conditions, so it matches every document.',
      'Matching is by **value and type**: `{ priority: 5 }` does not match `priority: \'5\'` (a string), and `{ done: \'false\' }` does not match `done: false`. A field that is missing never equals a value, but it does match `null`: `{ due: null }` finds tasks with `due: null` **and** tasks with no `due` at all.',
      '`find` does not hand back an array: it returns a **cursor**, a pointer that fetches documents in batches as you read them. The shell prints the first 20; in Node.js you call `.toArray()` (or loop with `for await`) to read them, and chain `.sort()`, `.skip()` and `.limit()` before reading.',
    ],
    code: `db.tasks.find({ done: false })                       // every open task
db.tasks.find({ done: false, 'owner.name': 'Ana' })  // AND: both conditions
db.tasks.findOne({ title: 'Buy milk' })              // one document, or null
db.tasks.countDocuments({ done: true })              // 3

// Node.js driver (inside an async function)
const open = await db.collection('tasks').find({ done: false }).toArray();`,
    dialect: 'mongosh',
    example: 'With the seed data, `db.tasks.find({ done: false })` returns 7 documents and `db.tasks.countDocuments({ done: false })` returns `7`. The playground translates the filter to SQL: `SELECT * FROM tasks WHERE done = FALSE;`. Now try `db.tasks.find({ done: \'false\' })`: 0 documents, and a note explains why.',
    mistake: 'Writing the filter as SQL or JavaScript: `find({ done = false })`, `find({ priority > 3 })` or `find(done: false)`. A filter is always an **object** of `field: condition` pairs; comparisons other than equality use operators such as `{ priority: { $gt: 3 } }` (next section).',
    widget: 'mongo-playground' },

  { id: 'update-operators', hub: 'crud', topic: 'crud', 
    title: 'Updating: updateOne, updateMany and update operators',
    summary: '`updateOne(filter, update)` changes the first matching document and `updateMany` every match; the **update** document uses operators such as `$set`, `$unset`, `$inc`, `$push` and `$pull` to say **what** to change.',
    body: [
      'An update has two halves, like a work order: **which** documents (the filter, same rules as `find`) and **what to do** to them (the update document). The second half must be made of **operators**, because a plain object would be ambiguous: does `{ done: true }` mean "set `done`" or "replace the whole task with `{ done: true }`"? The shell and drivers refuse it with "Update document requires atomic operators". To replace a whole document on purpose there is `replaceOne`.',
      'The result tells you what happened: `matchedCount` (how many documents the filter found) and `modifiedCount` (how many actually changed). They differ when a document already had the new value. A `matchedCount` of 0 usually means a wrong filter, and your API should answer `404`.',
      'With `{ upsert: true }` as a third argument, an update that matches nothing **inserts** a new document built from the filter and the update. Use it deliberately (for example "create the settings document if missing").',
    ],
    table: {
      caption: 'The update operators you will use',
      head: ['Operator', 'What it does', 'Example'],
      rows: [
        ['`$set`', 'Sets fields (creates them if missing); dot paths reach sub-documents', '`{ $set: { done: true, \'owner.name\': \'Benjamin\' } }`'],
        ['`$unset`', 'Removes fields (the value given is ignored)', '`{ $unset: { due: \'\' } }`'],
        ['`$inc`', 'Adds a number (negative to subtract); creates the field if missing', '`{ $inc: { priority: 1 } }`'],
        ['`$push`', 'Appends a value to an array (`$each` for several)', '`{ $push: { tags: \'urgent\' } }`'],
        ['`$addToSet`', 'Appends only if the value is not already there', '`{ $addToSet: { tags: \'urgent\' } }`'],
        ['`$pull`', 'Removes every array element equal to a value or matching a condition', '`{ $pull: { comments: { author: \'Ben\' } } }`'],
      ],
    },
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
    title: 'Deleting, and the danger of `{}`',
    summary: '`deleteOne(filter)` removes the first matching document and `deleteMany(filter)` every match; because an empty filter `{}` matches **everything**, `deleteMany({})` empties the collection without asking.',
    body: [
      'A filter selects documents the same way for every method, so the most dangerous filter is the one with no conditions. In SQL, forgetting the `WHERE` of a `DELETE` deletes every row; in MongoDB `{}` plays that role, and there is no confirmation and no undo. The same goes for `updateMany({}, …)`, which changes every document.',
      'Empty filters rarely come from typing `{}`. They come from code that **builds** a filter from the request and ends up with nothing in it: a missing query parameter, a misspelled property, or a body that was not parsed because `express.json()` is missing. Guard every write: refuse to run `deleteMany` or `updateMany` when the filter is empty, and prefer deleting by `_id`.',
      'Good habits: run the filter with `find` (or `countDocuments`) **before** deleting, check `deletedCount` afterwards, and in an API delete one resource per request (`DELETE /tasks/:id` → `deleteOne({ _id })`, answering `404` when `deletedCount` is 0).',
    ],
    code: `// A "clean up" route with a hidden bug
app.delete('/tasks', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.done) filter.done = req.query.done === 'true';
    // DELETE /tasks          → filter is {}  → EVERY task is deleted
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({ error: 'A filter is required' });
    }
    const { deletedCount } = await req.app.locals.db.collection('tasks').deleteMany(filter);
    res.json({ deletedCount });
  } catch (err) {
    next(err);            // Express 4 does not catch async errors by itself
  }
});`,
    dialect: 'js',
    example: 'In the playground, `db.tasks.find({ done: true })` shows 3 tasks; `db.tasks.deleteMany({ done: true })` then reports `deletedCount: 3`. Loading the example "Delete (empty filter!)" deletes all 10 tasks and the result warns you; press **Reset data** to bring them back.',
    mistake: 'Using `deleteOne` to mean "delete this one" with a filter that is not unique, such as `{ title: \'Study\' }`. It removes whichever matching document comes first, which may not be the one the user clicked. Identify the document by `_id`.' },

  /* ---- 4. Queries ------------------------------------------------------------------------ */
  { id: 'query-operators', hub: 'query', topic: 'query', 
    title: 'Query operators: comparison and logic',
    summary: 'Conditions other than equality use **query operators**, written as `{ field: { $operator: value } }`: comparison (`$eq $ne $gt $gte $lt $lte`), lists (`$in $nin`), presence (`$exists`), patterns (`$regex`), and `$and` / `$or` to combine whole conditions.',
    body: [
      'A filter like `{ priority: 5 }` can only say "equals". To say "greater than", you replace the value by an object whose key is an **operator**: `{ priority: { $gt: 3 } }` reads "priority greater than 3". The `$` marks a word as an operator rather than a field name. Several operators in the same object all apply: `{ priority: { $gte: 2, $lte: 4 } }` is "between 2 and 4".',
      'Comparisons only compare values of the **same type**: `{ priority: { $gt: 3 } }` never matches a priority stored as the string `\'5\'`. That is one more reason to keep types consistent (the Flexible schema card).',
      'Conditions on different fields are already combined with AND. You need `$and` only to put two conditions on the **same** field in separate objects, and `$or` when **either** of several conditions may hold. `$and`, `$or` and `$nor` go at the **top level** of the filter and take an array of filters.',
    ],
    table: {
      caption: 'Query operators (SQL equivalent in the last column)',
      head: ['Operator', 'Meaning', 'Example', 'SQL'],
      rows: [
        ['`$eq` / `$ne`', 'Equal / not equal (`$ne` also matches a missing field)', '`{ done: { $ne: true } }`', '`done <> TRUE`'],
        ['`$gt` `$gte` `$lt` `$lte`', 'Greater / at least / less / at most', '`{ priority: { $gte: 3 } }`', '`priority >= 3`'],
        ['`$in` / `$nin`', 'Equal to one of a list / to none of it', '`{ priority: { $in: [1, 5] } }`', '`priority IN (1, 5)`'],
        ['`$exists`', 'The field is present (`true`) or absent (`false`)', '`{ due: { $exists: true } }`', '`due IS NOT NULL` (roughly)'],
        ['`$regex` or `/…/`', 'A string matches a pattern (`i` = ignore case)', '`{ title: /^write/i }`', '`title ILIKE \'write%\'`'],
        ['`$or`', 'At least one of the filters holds', '`{ $or: [{ done: true }, { priority: 5 }] }`', '`done OR priority = 5`'],
        ['`$and`', 'All the filters hold', '`{ $and: [{ due: { $exists: true } }, { due: { $lt: ISODate(\'2026-09-26\') } }] }`', '`… AND …`'],
      ],
    },
    code: `db.tasks.find({ priority: { $gt: 3 } })                 // 4 or 5
db.tasks.find({ priority: { $gte: 2, $lte: 4 } })       // a range
db.tasks.find({ tags: { $in: ['db', 'api'] } })         // any of these tags
db.tasks.find({ due: { $exists: true } })              // tasks that have a due date
db.tasks.find({ title: /write/i })                      // 'Write …' in any case
db.tasks.find({ $or: [{ priority: 5 }, { done: true }] })`,
    dialect: 'mongosh',
    example: 'In the playground, `db.tasks.find({ $or: [{ priority: 5 }, { done: true }] })` returns 4 tasks: Set up CI (priority 5) plus the 3 finished ones. The SQL panel shows `WHERE priority = 5 OR done = TRUE`. Mistype an operator (`$get`) and the error says `unknown operator: $get (did you mean $gt?)`.',
    mistake: 'Putting the operator in the wrong place: `{ $gt: { priority: 3 } }` (operator outside, field inside) fails with "unknown top level operator", and `{ priority: { $or: [...] } }` fails too. Comparison operators go **inside** the field; `$and`/`$or` go **outside**, at the top. Also avoid writing the same field twice in one object (`{ priority: { $gt: 1 }, priority: { $lt: 5 } }`): in JavaScript the second silently replaces the first; combine them as `{ priority: { $gt: 1, $lt: 5 } }`.',
    widget: 'mongo-playground' },

  { id: 'arrays-dot-notation', hub: 'query', topic: 'query', 
    title: 'Dot notation: inside sub-documents and arrays',
    summary: '**Dot notation** (`\'owner.name\'`, `\'comments.author\'`) reaches fields inside sub-documents and inside the elements of arrays; on an array field, a plain value matches arrays that **contain** it.',
    body: [
      'A path is like a postal address read from the outside in: `\'owner.name\'` means "the `name` inside `owner`". When the path crosses an **array**, MongoDB looks at **every element**: `\'comments.author\': \'Ben\'` matches a task if **any** of its comments was written by Ben. Paths with dots must be written in **quotes**, because `owner.name: …` is not a valid object key in JavaScript.',
      'For arrays of plain values, equality means **contains**: `{ tags: \'urgent\' }` matches `[\'devops\', \'urgent\']`. Writing the whole array, `{ tags: [\'devops\', \'urgent\'] }`, asks for **exactly** that array, in that order. Other array tools: `$all` (contains all of these, any order), `$size` (exactly n elements), and a position such as `\'tags.0\'` (the first element).',
      'Several conditions on an array of sub-documents may be satisfied by **different** elements: `{ \'comments.author\': \'Ben\', \'comments.text\': /done/ }` matches if some comment is by Ben and some (possibly other) comment mentions "done". To require **one element** that meets all conditions, use `$elemMatch`: `{ comments: { $elemMatch: { author: \'Ben\', text: /done/ } } }`.',
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
    body: [
      'A filter chooses **which documents**; a projection chooses **which fields** of them, like the column list after `SELECT`. Sending only what the client needs saves bandwidth and avoids leaking fields (for example a user\'s `passwordHash`, which must never leave the server).',
      'There are two styles. **Inclusion** (`1` or `true`): "only these fields". **Exclusion** (`0` or `false`): "everything but these". A projection must use one style: `{ title: 1, done: 0 }` is an error ("Cannot do exclusion on field done in inclusion projection"), because it is unclear what should happen to the other fields. The only exception is `_id`, which is included by default and can be hidden in either style with `_id: 0`.',
      'Dot paths work here too: `{ \'owner.name\': 1, _id: 0 }` returns `{ owner: { name: \'Ben\' } }`. In the Node.js driver the projection goes in an options object: `find(filter, { projection: { title: 1 } })`, or `find(filter).project({ title: 1 })`.',
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
    summary: '`.sort({ field: 1 })` orders results (1 ascending, -1 descending, several keys allowed), `.skip(n)` jumps over the first n and `.limit(n)` keeps at most n; together they give pages: `skip((page - 1) * size).limit(size)`.',
    body: [
      'Pagination is reading a long list one screen at a time. To show page 3 with 10 items per page you must (1) put the list in a fixed order, (2) step over the 20 items of pages 1 and 2, (3) take the next 10. In SQL that is `ORDER BY … LIMIT 10 OFFSET 20` (the SQL section\'s pagination card); in MongoDB it is `.sort({ … }).skip(20).limit(10)`.',
      'The order of application is always **sort, then skip, then limit**, whatever order you chain them in: `.limit(10).skip(20).sort(…)` gives the same page. Without `sort`, documents come in **natural order** (roughly the order they were stored), which MongoDB does not promise to keep: pages could overlap or skip items. Add a unique tie-breaker, such as `_id`, when the sort key can repeat: `.sort({ priority: -1, _id: 1 })`.',
      'For the page count, ask `countDocuments(filter)` with the same filter. `skip` still walks over every skipped document, so very deep pages get slow on big collections; large apps page with a range instead ("tasks created before the last one I showed").',
    ],
    code: `// GET /tasks?page=2&size=4   (sorted by creation date, oldest first)
const page = Number(req.query.page) || 1;
const size = Math.min(Number(req.query.size) || 10, 50);   // cap the page size
const filter = { ownerId: req.user.id };

const [items, total] = await Promise.all([
  tasks.find(filter).sort({ createdAt: 1, _id: 1 })
    .skip((page - 1) * size).limit(size).toArray(),
  tasks.countDocuments(filter),
]);
res.json({ items, page, size, total, pages: Math.ceil(total / size) });`,
    dialect: 'js',
    example: 'The seed has 10 tasks. With 4 per page sorted by `createdAt`, page 1 is tasks 1–4, page 2 is `db.tasks.find().sort({ createdAt: 1 }).skip(4).limit(4)` (Add pagination, Review pull request, Draft project plan, Design the Mongo schema), and page 3 holds the last 2. `Math.ceil(10 / 4)` gives 3 pages.',
    mistake: 'Computing `skip(page * size)`, which makes page 1 start at the second page. Page n skips the **(n − 1) × size** documents of the pages before it. Also check the input: `Number(\'abc\')` is `NaN`, and a client asking for `size=100000` should be capped.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Page through the tasks in the playground' } },

  /* ---- 5. Aggregation ------------------------------------------------------------------- */
  { id: 'aggregation-pipeline', hub: 'aggregate', topic: 'aggregate', 
    title: 'The aggregation pipeline',
    summary: 'An **aggregation pipeline** is an array of **stages** (`$match`, `$project`, `$group`, `$sort`, `$limit`…) that documents flow through in order, each stage transforming the output of the previous one, like commands joined by a Unix pipe.',
    body: [
      'Picture a factory line. Documents enter at one end; the first station throws away the ones that do not qualify, the next reshapes each one, another sorts them into groups and counts them, the last keeps the top three. Each station only sees what the previous one handed over. In a Unix shell, `cat tasks | grep open | sort | head -3` works the same way; in MongoDB you write the line as an array: `db.tasks.aggregate([ stage1, stage2, … ])`.',
      '`find` can filter, project, sort and page. Use `aggregate` when you need to **compute** something: totals and averages per group (`$group`), new fields (`$project` with expressions), one document per array element (`$unwind`) or data from another collection (`$lookup`). The result is a cursor of new documents, which do not need to look like the stored ones.',
      'Inside stages, a string that starts with `$` means **the value of a field**: `\'$priority\'` is "this document\'s priority", `\'$owner.name\'` reaches into a sub-document. Put `$match` **first** whenever you can: every later stage then works on fewer documents, and only a leading `$match` can use an index.',
    ],
    table: {
      caption: 'The stages you will use most',
      head: ['Stage', 'What it does', 'SQL idea'],
      rows: [
        ['`$match`', 'Keeps the documents that match a filter (same syntax as `find`)', '`WHERE` (or `HAVING` after `$group`)'],
        ['`$project`', 'Keeps, removes, renames or computes fields', 'The `SELECT` list'],
        ['`$group`', 'One output document per group, with accumulators', '`GROUP BY` + `COUNT`/`SUM`/`AVG`'],
        ['`$sort` / `$skip` / `$limit`', 'Order, skip, keep the first n', '`ORDER BY` / `OFFSET` / `LIMIT`'],
        ['`$unwind`', 'One document per element of an array', 'Joining a child table'],
        ['`$lookup`', 'Adds the matching documents of another collection as an array', '`LEFT JOIN`'],
        ['`$count`', 'Replaces everything by one document with the number of documents', '`SELECT COUNT(*)`'],
      ],
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
    example: 'Run the pipeline above in the playground and then remove one stage at a time: without `$limit` you get 7 documents, without `$match` the finished tasks appear, without `$project` you get whole documents. Watching what each stage receives is the fastest way to debug a pipeline.',
    mistake: 'Passing the stages without the array: `aggregate({ $match: … }, { $group: … })`. The pipeline is **one array** of stage objects, and each stage object has exactly one key: `aggregate([ { $match: … }, { $group: … } ])`.',
    widget: 'mongo-playground' },

  { id: 'group-accumulators', hub: 'aggregate', topic: 'aggregate', 
    title: '`$group`: one result per group',
    summary: '`$group` collects documents that share the same **`_id` expression** into one output document per group, and computes **accumulators** for each group: `$sum`, `$avg`, `$min`, `$max`, `$push`, `$addToSet`, `$count`.',
    body: [
      'Imagine sorting a pile of task cards into one tray per owner, then writing on a sticky note for each tray "how many cards, average priority". `$group` does exactly that: the `_id` you give says **which tray** a document goes into, and every other field of the stage is a sticky-note calculation. It is SQL\'s `GROUP BY` with aggregate functions (the SQL section\'s aggregates card).',
      'The `_id` is usually a field path with `$`: `_id: \'$owner.name\'` groups by owner name. `_id: null` puts every document in a single group (totals for the whole collection). Each accumulator is an object with one operator: `{ $sum: 1 }` adds 1 per document (a count), `{ $sum: \'$priority\' }` adds the priorities, `{ $avg: \'$priority\' }` averages them, `{ $push: \'$title\' }` collects the titles into an array.',
      'The output contains **only** `_id` and the accumulator fields; every other field of the input documents is gone. To filter groups by their totals (SQL\'s `HAVING`), add a `$match` **after** the `$group`; to order them, a `$sort` on the new field.',
    ],
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
    title: '`$unwind` and `$lookup`',
    summary: '`$unwind: \'$tags\'` turns one document with an array into **one document per element**; `$lookup` adds, to each document, an **array** of the matching documents of another collection (a left outer join).',
    body: [
      '`$unwind` is like photocopying a form once per line of a list it contains: a task with tags `[\'api\', \'urgent\']` becomes two documents, identical except that `tags` is `\'api\'` in one and `\'urgent\'` in the other. After that, `$group` by `\'$tags\'` can count tasks per tag. Documents whose array is empty or missing **disappear** unless you write `{ $unwind: { path: \'$tags\', preserveNullAndEmptyArrays: true } }`.',
      '`$lookup` brings referenced data in. You name the other collection (`from`), the field in this document (`localField`), the matching field in the other collection (`foreignField`) and the new field to fill (`as`). Every input document stays, even if nothing matches (then `as` is an empty array): that is a **left outer join**, like SQL\'s `LEFT JOIN`, except that the matches arrive as an array inside the document instead of as extra rows.',
      'A `$lookup` per request is a sign that the data might be better embedded (see Embed or reference?). When you do use it, index the `foreignField` in the other collection, or every lookup scans that whole collection.',
    ],
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
    body: [
      'Finding "priority 5" without an index is like finding a word in a book with no index: you read every page. MongoDB calls that a **collection scan** (COLLSCAN): the work grows in proportion to the number of documents. An index is the alphabetical index at the back of the book: the values are kept **sorted** in a tree (a **B-tree**: a balanced tree in which every node holds many sorted keys), so a lookup takes a few steps down the tree. Doubling the collection adds about one more step instead of doubling the work. Indexes also make sorting on the indexed field cheap.',
      'Every collection has a unique index on `_id`. You add others with `createIndex({ field: 1 })` (1 ascending, -1 descending). A **compound** index covers several fields in order: `{ ownerId: 1, createdAt: -1 }` serves "Ben\'s tasks, newest first", and also queries on `ownerId` alone (a **prefix**), but not queries on `createdAt` alone. A **unique** index makes the database refuse duplicates, which is how you guarantee one account per email (the error code is **E11000**).',
      'Indexes are not free: each one takes space, and **every insert, update and delete must also update every index**. Index the fields your frequent or slow queries filter or sort on, not every field. To check whether a query uses an index, run it with `.explain(\'executionStats\')` and compare `totalDocsExamined` with `nReturned`: examining 10 000 documents to return 10 is a missing index.',
    ],
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
    mistake: 'Indexing "just in case". Ask the right question first: an index on `email` makes `find({ email })` faster, but makes every **insert**, every **update** that changes `email`, and every **delete** slower, and uses memory. Add an index when a real, frequent query needs it, and check with `explain`.',
    practice: { href: '#/database/documents/practice/mongo-playground', label: 'Compare plans with explain() in the playground' } },

  { id: 'node-driver', hub: 'app', topic: 'app', 
    title: 'Connecting from Node.js: the official driver',
    summary: 'The official **`mongodb`** package gives you a `MongoClient` that you **connect once** at startup and reuse; `client.db(\'app\').collection(\'tasks\')` returns a collection with the same methods as the shell, all returning Promises.',
    body: [
      'A `MongoClient` is like a phone line kept open to the database: dialling for every request would be slow, so you connect **once** when the server starts and every request reuses the same client. It manages a **connection pool** for you (the same idea as the `pg` Pool in the SQL section). The connection string comes from the environment (`process.env.MONGO_URL`, e.g. `mongodb://localhost:27017`), never hard-coded, because it may contain a password.',
      'The collection methods are the ones you used in the shell, with three differences: they return **Promises** (use `await` inside `async` functions), `find` returns a cursor you finish with `.toArray()`, and shell helpers become JavaScript: `ISODate(…)` is `new Date(…)` and `ObjectId(…)` is `new ObjectId(…)` (imported from `mongodb`). The **models/ seam** of the [models layer](#/database/relational/models-layer) stays the same: a factory `createTasksModel(db)` hides the database, and maps `_id` to the `id` your API returns.',
      'In **Express 4** an error thrown inside an `async` route handler is not passed to your error handler automatically: catch it and call `next(err)`. (Express 5 forwards rejected promises by itself.)',
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
    mistake: 'Passing request data straight into a filter: `users.findOne({ email: req.body.email, password: req.body.password })`. `express.json()` turns `{"password": {"$ne": null}}` into an object, the filter then means "any password that is not null", and the attacker logs in without knowing it (**NoSQL injection**). Validate that values are strings (Zod, or `typeof x === \'string\'`) before building filters, and never compare plain passwords anyway (passwords are hashed: see the Authentication section).' },

  { id: 'mongoose', hub: 'app', topic: 'app', 
    title: 'Mongoose: schemas and models on top of the driver',
    summary: '**Mongoose** is an **ODM** (object-document mapper) for Node.js: you declare a **schema** (fields, types, required, defaults, limits) and get a **model** whose methods validate documents before writing them to MongoDB.',
    body: [
      'The driver is a blank notebook: it writes whatever you hand it. Mongoose is a notebook with printed forms: you describe once what a task looks like, and every task is checked and filled in (defaults, trimmed strings, timestamps) before it is saved. Most tutorials and many Express projects use it, so you should recognise it.',
      'A **schema** lists the fields with their types and rules. A **model** (`mongoose.model(\'Task\', taskSchema)`) is a class bound to a collection: by default the name is lower-cased and pluralised, so `Task` uses `tasks`. Its methods mirror the driver (`Task.find`, `Task.create`, `Task.findById`, `Task.updateOne`) but return Mongoose documents, cast types (the string `\'6a9a…\'` becomes an ObjectId automatically) and drop fields that are not in the schema.',
      'Validation runs on `create` and `save`. Update methods such as `findByIdAndUpdate` do **not** run validators unless you pass `{ runValidators: true }`. A `ref` plus `.populate(\'owner\')` replaces a referenced id by the referenced document (a second query behind the scenes, like a manual `$lookup`).',
    ],
    code: `const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true, maxlength: 100 },
  done:     { type: Boolean, default: false },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  tags:     [String],
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });          // adds createdAt and updatedAt

const Task = mongoose.model('Task', taskSchema);   // collection 'tasks'

// inside async controllers (connect once at startup: await mongoose.connect(url))
const task = await Task.create({ title: '  Study  ', owner: req.user.id }); // title → 'Study'
const open = await Task.find({ done: false }).sort({ createdAt: -1 }).limit(10).populate('owner', 'name');
await Task.findByIdAndUpdate(id, { priority: 9 }, { runValidators: true });  // rejected: max 5`,
    dialect: 'js',
    example: '`await Task.create({ owner: userId })` throws a `ValidationError` ("Path `title` is required") without contacting the database, which your error handler can turn into `400 Bad Request`. The same insert through the bare driver would have been stored.',
    mistake: 'Believing Mongoose makes MongoDB itself enforce the schema. The rules live in your Node process: a script, another service or the shell that writes to the same collection bypasses them, and updates skip validation unless you ask for it. For rules that must always hold, add a `$jsonSchema` validator or a unique index in the database too.' },

  { id: 'sql-or-mongo', hub: 'app', topic: 'app', 
    title: 'SQL or MongoDB? Choosing honestly',
    summary: 'Choose a **relational database** when your data is many linked entities with stable rules and you want the database to guarantee integrity; choose **MongoDB** when records are self-contained documents read as a whole, or their shape varies. Both can run a typical web API.',
    body: [
      'Start from the data and the questions, not from fashion. If your app is a web of entities that refer to each other (users, projects, tasks, comments, permissions) and you need reports across them, the relational model gives you joins, foreign keys and constraints for free. If most requests are "fetch this thing with everything inside it" (a product page with its variants, a submitted form, a CMS article with blocks) and the shape varies from record to record, documents fit naturally.',
      'Some common claims are out of date. "MongoDB has no transactions": multi-document **ACID transactions** exist since MongoDB 4.0 (on replica sets), although single-document writes, which are atomic, are the normal tool. "SQL cannot store JSON": PostgreSQL has a `jsonb` column type with indexes. "MongoDB scales and SQL does not": both scale far beyond a small project; at that size, design and indexes matter far more than the engine.',
      'Learn both: the concepts transfer, and many teams run one of each. If the API is layered, switching is cheap either way: routes and controllers stay identical, only `models/` changes. Writing the same model twice, once with SQL and once with MongoDB, is the best way to feel the difference (see [The models layer](#/database/relational/models-layer)).',
    ],
    table: {
      caption: 'Which way does your project lean?',
      head: ['Question', 'Leans SQL', 'Leans MongoDB'],
      rows: [
        ['What does a typical read return?', 'Rows combined from several tables', 'One document with everything inside'],
        ['How stable is the shape?', 'Known up front, rarely changes', 'Varies per record or changes often'],
        ['Who must enforce the rules?', 'The database (`NOT NULL`, FK, `CHECK`)', 'Your code / validator is acceptable'],
        ['Relationships', 'Many-to-many, shared entities, cascades', 'Mostly parent → few children'],
        ['Reports', 'Ad-hoc joins and `GROUP BY` across entities', 'Pipelines over one collection'],
        ['Multi-record changes', 'Frequent (money transfers, stock)', 'Rare: most writes touch one document'],
      ],
    },
    example: 'A tasks API fits both. SQL: `users` and `tasks` with a foreign key and `ON DELETE CASCADE`, owner checks by `user_id`, `LIMIT/OFFSET` pages. MongoDB: a `tasks` collection with `ownerId` (plus an embedded `owner.name` copy), tags and comments embedded, an index on `{ ownerId: 1, createdAt: -1 }`. A course-enrolment system with students, groups, subjects and grades, queried in every direction, leans clearly towards SQL.',
    mistake: 'Picking MongoDB "to avoid designing a schema". The design work does not disappear; it moves into your code, where the database can no longer help you. Pick it when the document model fits your reads, and then design the documents carefully.' },
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
