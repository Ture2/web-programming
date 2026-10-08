'use strict';
/* Relational databases: concept cards, rail groups and self-check quiz (SQL, with PostgreSQL as the
   worked example and MySQL / SQLite differences noted). Cards explain with `html` blocks and
   `diagram` specs (js/concept-section.js, js/diagram.js).
   `hub` and `topic` keys match SQL_GROUPS and SQL_QUIZ_TOPICS. */

DATA.en.SQL_QUIZ_TOPICS = {
  model: 'Tables, keys and relationships',
  crud: 'Reading and changing rows',
  joins: 'Joins and aggregates',
  schema: 'Indexes and migrations',
  node: 'From Node to SQL',
};

DATA.en.SQL_GROUPS = [
  { key: 'model', label: 'Tables and keys', icon: 'table' },
  { key: 'crud', label: 'Reading and changing rows', icon: 'code' },
  { key: 'joins', label: 'Joins and aggregates', icon: 'link' },
  { key: 'schema', label: 'Indexes and migrations', icon: 'levels' },
  { key: 'node', label: 'From Node to SQL', icon: 'server' },
];

/* Cards merged into another: old links and bookmarks redirect. */
DATA.en.SQL_MOVED = { 'layered-architecture': '#/database/relational/models-layer' };

DATA.en.SQL_CONCEPTS = [
  /* ---- 1. Tables and keys --------------------------------------------------------- */
  { id: 'why-database', hub: 'model', topic: 'model',
    title: 'Why a database?',
    summary: 'A **database** is a separate program that stores the application\'s data on disk, lets many requests read and change it safely at the same time, and answers questions about it in a query language.',
    html: [
      '<p>A first Tasks API often keeps its tasks in a JavaScript array. The array lives in the server process\'s memory, so every restart (a crash, a deploy, <code>node --watch</code> after you save) starts again from an empty array. A database is a separate program that keeps the data on disk: the server sends it questions and changes, and the data outlives the server.</p>',
      '<dl><dt>Persistence</dt><dd>The data is on disk, not in the server\'s memory, so a restart loses nothing.</dd>'
        + '<dt>Concurrency</dt><dd>Two requests changing the same data at once, or two copies of the server side by side, see one consistent version: the database orders and isolates the changes.</dd>'
        + '<dt>Querying</dt><dd>You describe <em>what</em> you want ("the open tasks of user 3, newest first, 10 per page") and the database works out <em>how</em> to find it, even among millions of rows.</dd>'
        + '<dt>Integrity</dt><dd>The database itself refuses data that breaks the rules you declared, such as "every task belongs to a user that exists".</dd></dl>',
      '<p>A <strong>relational database</strong> (PostgreSQL, MySQL, SQLite…) stores data in tables, and you talk to it in <strong>SQL</strong> (Structured Query Language). The server and the database are two programs, often on different machines: the server sends SQL over the network and gets rows back (see <a href="#/database/relational/drivers-pools">Connecting from Node</a>).</p>',
    ],
    example: 'With the array: you `POST /tasks` three times, edit `app.js`, `node --watch` restarts, and `GET /tasks` returns `[]`. With PostgreSQL behind the same routes, the restart changes nothing: `GET /tasks` runs `SELECT … FROM tasks` and the three rows are still there. Run two copies of the server (on ports 3000 and 3001) and both see the same tasks, which two separate arrays never could.',
    mistake: 'Thinking a database is "just a bigger array" that you load whole into memory and filter in JavaScript (`(await getAllTasks()).filter(…)`). That throws away the point: let the database filter, sort, count and page (`WHERE`, `ORDER BY`, `COUNT`, `LIMIT`) and send back only the rows the request needs.' },

  { id: 'tables-types', hub: 'model', topic: 'model',
    title: 'Tables, rows, columns and types',
    summary: 'A **table** stores one kind of thing; each **row** is one item and each **column** is one property with a fixed **data type**. The set of tables, columns, types and rules is the **schema**.',
    html: [
      '<p>A table is a spreadsheet with strict rules: the <strong>table</strong> is the sheet (<code>tasks</code>), each <strong>row</strong> one task, each column a name and a <strong>type</strong> (<code>title</code> is text, <code>done</code> a boolean). Unlike a spreadsheet, the database refuses a row that does not fit: no "yes" in an integer column, and every row has the same columns.</p>',
      '<p><code>CREATE TABLE</code> lists each column with its type. That description, written before any data exists, is the <strong>schema</strong>. The type decides what can be stored, how values are compared and sorted, and how much space they take. The rules that come on top are in <a href="#/database/relational/primary-keys">Primary keys</a>, <a href="#/database/relational/foreign-keys">Foreign keys</a> and <a href="#/database/relational/constraints">Constraints</a>.</p>',
      '<table><caption>Common column types</caption><thead><tr><th scope="col">Kind of data</th><th scope="col">PostgreSQL</th><th scope="col">MySQL</th><th scope="col">Use it for</th></tr></thead><tbody>'
        + '<tr><th scope="row">Whole number</th><td><code>INTEGER</code>, <code>BIGINT</code></td><td><code>INT</code>, <code>BIGINT</code></td><td>Counts, ids, foreign keys</td></tr>'
        + '<tr><th scope="row">Auto-numbered id</th><td><code>SERIAL</code> or <code>INTEGER GENERATED ALWAYS AS IDENTITY</code></td><td><code>INT AUTO_INCREMENT</code></td><td>The primary key</td></tr>'
        + '<tr><th scope="row">Text</th><td><code>TEXT</code>, <code>VARCHAR(n)</code></td><td><code>VARCHAR(n)</code>, <code>TEXT</code></td><td>Titles, emails, names</td></tr>'
        + '<tr><th scope="row">True / false</th><td><code>BOOLEAN</code></td><td><code>BOOLEAN</code> (stored as <code>TINYINT(1)</code>)</td><td>Flags such as <code>done</code></td></tr>'
        + '<tr><th scope="row">Exact decimal</th><td><code>NUMERIC(10,2)</code></td><td><code>DECIMAL(10,2)</code></td><td>Money: never a float</td></tr>'
        + '<tr><th scope="row">Date / date and time</th><td><code>DATE</code>, <code>TIMESTAMP</code></td><td><code>DATE</code>, <code>DATETIME</code></td><td>Due dates, <code>created_at</code></td></tr>'
        + '</tbody></table>',
      '<p>The examples here are written for <strong>PostgreSQL</strong>; where MySQL differs, the card says so.</p>',
    ],
    code: `CREATE TABLE tasks (
  id       INTEGER,
  user_id  INTEGER,
  title    TEXT,
  done     BOOLEAN,
  -- may be empty (NULL): not every task has a date
  due_date DATE
);`,
    dialect: 'SQL (PostgreSQL)',
    example: 'The row `(7, 3, \'Draft project plan\', FALSE, \'2026-10-12\')` fits this table: an id, the id of its owner, a title, a boolean and a date. `INSERT INTO tasks (id, title, done) VALUES (8, \'Study\', \'maybe\')` is refused, because `\'maybe\'` is not a boolean. The columns an `INSERT` leaves out stay empty (NULL) until the table declares a rule for them.',
    mistake: 'Storing everything as text "to keep it simple": dates as `\'06/10/2026\'`, prices as `\'12,50\'`, flags as `\'yes\'`. The database can then no longer sort dates correctly (`\'10/01\'` sorts before `\'9/30\'`), add prices or check that a flag is really a flag. Pick the type that matches the meaning.' },

  { id: 'primary-keys', hub: 'model', topic: 'model',
    title: 'Primary keys',
    summary: 'A **primary key** is the column (or set of columns) whose value identifies exactly one row: it can never be empty (`NULL`) and never repeat.',
    html: [
      '<p>Two users may share a name and an email can change, but the key never repeats, is never empty and is never reused for another row. The API puts it in the URL (<code>/tasks/7</code>), and the database finds row 7 at once because a primary key is always <strong>indexed</strong> (see <a href="#/database/relational/indexes">Indexes</a>).</p>',
      '<dl><dt>Surrogate key</dt><dd>A number with no meaning outside the database, generated as rows are inserted: <code>SERIAL</code> or the standard <code>GENERATED ALWAYS AS IDENTITY</code> in PostgreSQL, <code>INT AUTO_INCREMENT</code> in MySQL. Most tables use one.</dd>'
        + '<dt>UUID</dt><dd>A random 128-bit value such as <code>3f2b…</code>: ids cannot be guessed and can be created outside the database.</dd>'
        + '<dt>Composite key</dt><dd>Two columns together: <code>PRIMARY KEY (task_id, tag_id)</code> in a join table allows each pair only once.</dd></dl>',
      '<p><code>PRIMARY KEY</code> means: required, unique, and "this is the row\'s identity".</p>',
    ],
    code: `CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  -- → 1, 2, 3… chosen by the database
  email TEXT
);
-- MySQL: id INT AUTO_INCREMENT PRIMARY KEY`,
    dialect: 'SQL (PostgreSQL)',
    example: 'The API receives `POST /tasks` with `{ "title": "Study" }` and **does not** send an id: the database picks the next one (say 10) and reports it back (`RETURNING id`, see [INSERT, UPDATE, DELETE](#/database/relational/crud-sql)), so the server can answer `201 Created` with `Location: /tasks/10`. If ana later changes her email, `users.id` stays 1 and every task that points to her still works.',
    mistake: 'Using a value that can change or repeat as the key, such as the email or the task title, or computing the next id in JavaScript (`tasks.length + 1`, as an in-memory array version often does). Two requests arriving together would get the same number. Let the database generate ids.' },

  { id: 'foreign-keys', hub: 'model', topic: 'model',
    title: 'Foreign keys',
    summary: 'A **foreign key** is a column that stores the primary key of a row in another table (`tasks.user_id` → `users.id`); the database then refuses any value that points to a row that does not exist.',
    html: [
      '<p><code>user_id INT REFERENCES users(id)</code> says "every task belongs to an existing user". The database checks it on every insert and update, whatever program writes the data. A check only in the application ("look the user up, then insert") can be skipped by another route, a script, or a second request that deletes the user in between; the foreign key cannot.</p>',
      '<p>The rule also works the other way: when a user is deleted, what happens to their tasks? By default the database <strong>refuses</strong> the delete. <code>ON DELETE</code> chooses another behaviour. <code>SET NULL</code> needs a column that may be empty.</p>',
      '<figure data-diagram></figure>',
      '<p><strong>MySQL:</strong> write the foreign key on its own line, <code>FOREIGN KEY (user_id) REFERENCES users(id)</code>; some versions silently ignore a <code>REFERENCES</code> written inside the column definition.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: '`ON DELETE` decides what happens to the tasks of a deleted user.',
      desc: 'DELETE FROM users WHERE id = 2, where user 2 owns tasks. With ON DELETE CASCADE, the tasks are deleted too. With SET NULL, the tasks are kept and their user_id becomes empty. With RESTRICT, or no ON DELETE at all, the delete is refused.',
      nodes: [
        { id: 'del', label: 'Delete user 2', note: 'who still owns tasks' },
        { id: 'cascade', label: '`CASCADE`', note: 'tasks deleted too', key: true },
        { id: 'setnull', label: '`SET NULL`', note: 'tasks kept, owner empty' },
        { id: 'restrict', label: '`RESTRICT` (default)', note: 'delete refused' },
      ],
      edges: [['del', 'cascade'], ['del', 'setnull'], ['del', 'restrict']],
    },
    code: `CREATE TABLE tasks (
  id      SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT
);

INSERT INTO tasks (user_id, title) VALUES (99, 'Ghost task');
-- ERROR: insert or update on table "tasks" violates foreign key constraint
-- also deletes every task with user_id = 2
DELETE FROM users WHERE id = 2;`,
    dialect: 'SQL (PostgreSQL)',
    example: 'In the sample database ben (user 2) owns three tasks. `DELETE FROM users WHERE id = 2` removes ben **and** tasks 5, 6 and 9, because of `ON DELETE CASCADE`; their rows in `task_tags` go too, since that table cascades from `tasks`. Try the "ON DELETE CASCADE" example in the SQL runner.',
    mistake: 'Thinking `REFERENCES` is only documentation, or that the database "joins the tables for you". A foreign key is a **rule** checked on every change; reading the related rows together is a separate step that you write with `JOIN`.' },

  { id: 'relationships', hub: 'model', topic: 'model',
    title: 'One-to-many and many-to-many',
    summary: 'In a **one-to-many** relationship the foreign key goes in the table on the "many" side; a **many-to-many** relationship needs a third **join table** that holds pairs of foreign keys.',
    html: [
      '<p>Ask the question both ways. How many tasks can one user have? Many. How many users can one task have? One. That is <strong>one-to-many</strong>: the foreign key goes on the "many" side, each task storing its <code>user_id</code>. A user cannot store a list of task ids, because a column holds one value.</p>',
      '<p>Tags are different: one task has several tags, and one tag (<code>urgent</code>) is on many tasks. That is <strong>many-to-many</strong>, and neither table can hold the reference. A third table, the <strong>join table</strong> (or junction table), holds one pair per row: <code>task_tags (task_id, tag_id)</code>, two foreign keys whose pair is the primary key, so it cannot repeat.</p>',
      '<figure data-diagram></figure>',
      '<table><caption>Where the reference goes</caption><thead><tr><th scope="col">Relationship</th><th scope="col">Example</th><th scope="col">The reference</th></tr></thead><tbody>'
        + '<tr><th scope="row">One-to-one</th><td>A user and their profile</td><td>A foreign key that cannot repeat (<code>UNIQUE</code>)</td></tr>'
        + '<tr><th scope="row">One-to-many</th><td>A user and their tasks</td><td><code>tasks.user_id</code>, on the "many" side</td></tr>'
        + '<tr><th scope="row">Many-to-many</th><td>Tasks and tags; students and courses</td><td>A join table: <code>task_tags (task_id, tag_id)</code></td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'flow',
      title: 'A many-to-many relationship goes through a join table.',
      desc: 'tasks and tags are linked through task_tags. Each row of task_tags holds one pair: a task_id pointing to tasks and a tag_id pointing to tags.',
      nodes: [
        { id: 'tasks', label: '`tasks`', note: '`id`, `title`' },
        { id: 'tt', label: '`task_tags`', note: 'one row per pair', key: true },
        { id: 'tags', label: '`tags`', note: '`id`, `name`' },
      ],
      edges: [['tasks', 'tt', '`task_id`'], ['tt', 'tags', '`tag_id`']],
    },
    code: `CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE task_tags (
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  -- each pair at most once
  PRIMARY KEY (task_id, tag_id)
);
-- task 7 has the tags 1 (urgent) and 3 (planning):
INSERT INTO task_tags (task_id, tag_id) VALUES (7, 1), (7, 3);`,
    dialect: 'SQL (PostgreSQL)',
    example: 'In the sample database, the rows `(7, 1)` and `(7, 3)` of `task_tags` say "task 7 is tagged urgent and planning", and `(1, 1)`, `(7, 1)` and `(9, 1)` say "urgent is on tasks 1, 7 and 9". To list a task\'s tags you join three tables (`tasks` → `task_tags` → `tags`): the SQL runner challenge Tasks tagged “urgent”.',
    mistake: 'Storing a list inside one column, such as `tags TEXT` with `\'urgent,study\'`. You can no longer check that each tag exists, rename a tag in one place, or find "all urgent tasks" without slow and fragile text matching (`LIKE \'%urgent%\'` also matches `not-urgent`). One fact per row: that is what the join table does.' },

  { id: 'constraints', hub: 'model', topic: 'model',
    title: 'Constraints: NOT NULL, UNIQUE, CHECK, DEFAULT',
    summary: '**Constraints** are rules written in the schema that the database enforces on every change: `NOT NULL` (a value is required), `UNIQUE` (no duplicates), `CHECK` (a condition must hold) and `DEFAULT` (the value used when none is given).',
    html: [
      '<p>Constraints are checked on every insert and update, whichever route, script or colleague sends it. <a href="#/http/api-design/validation">Validation</a> in the server gives the user friendly messages; constraints are the last line of defence that keeps the data correct even when that code has a bug. Use both.</p>',
      '<dl><dt><code>NOT NULL</code></dt><dd>The column must have a value: <code>title</code>, <code>email</code>.</dd>'
        + '<dt><code>UNIQUE</code></dt><dd>No two rows may share the value: a second account with the same email is refused. In MySQL a unique text column must be <code>VARCHAR(255)</code>, because MySQL cannot index an unbounded <code>TEXT</code>.</dd>'
        + '<dt><code>CHECK (condition)</code></dt><dd>Any rule about the row: <code>CHECK (title &lt;&gt; \'\')</code>, <code>CHECK (price &gt;= 0)</code>.</dd>'
        + '<dt><code>DEFAULT value</code></dt><dd>What is stored when the <code>INSERT</code> leaves the column out: <code>done BOOLEAN NOT NULL DEFAULT FALSE</code>, <code>created_at TIMESTAMP NOT NULL DEFAULT NOW()</code>.</dd></dl>',
      '<table><caption>When a constraint says no (PostgreSQL error codes)</caption><thead><tr><th scope="col">Code</th><th scope="col">Meaning</th><th scope="col">Usual answer</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>23505</code></th><td>Unique violation</td><td><code>409 Conflict</code>: "email already registered"</td></tr>'
        + '<tr><th scope="row"><code>23503</code></th><td>Foreign-key violation</td><td><code>400</code> or <code>422</code></td></tr>'
        + '<tr><th scope="row"><code>23502</code></th><td>Missing required value</td><td><code>400</code> or <code>422</code></td></tr>'
        + '</tbody></table>',
    ],
    code: `CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE tasks (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT NOT NULL CHECK (title <> ''),
  done    BOOLEAN NOT NULL DEFAULT FALSE
);`,
    dialect: 'SQL (PostgreSQL)',
    example: '`INSERT INTO users (email) VALUES (\'ana@example.com\')` gives ana an id and `created_at = NOW()` without naming them. Running it again fails with `duplicate key value violates unique constraint "users_email_key"` (code `23505`), which the controller answers with `409 Conflict`. Run the "Constraints say no" example in the SQL runner to meet each error.',
    mistake: 'Relying on `NOT NULL` to reject empty text. An empty string `\'\'` is a value, not NULL, so `title TEXT NOT NULL` accepts `\'\'`. If empty titles are not allowed, add `CHECK (title <> \'\')`, and validate in the controller for a clear message.' },

  /* ---- 2. Reading and changing rows ------------------------------------------------ */
  { id: 'select-basics', hub: 'crud', topic: 'crud',
    title: 'SELECT: asking for rows',
    summary: '`SELECT` reads data: you name the columns you want, the table (`FROM`), a condition the rows must meet (`WHERE`) and the order (`ORDER BY`); the answer is always a new table of rows.',
    html: [
      '<p>You say <strong>what</strong> you want, never <strong>how</strong> to search: "from <code>tasks</code>, the <code>id</code> and <code>title</code> of the open tasks, sorted by <code>id</code>". The database decides how to find the rows quickly.</p>',
      '<dl><dt><code>SELECT columns</code></dt><dd>The columns of the answer.</dd>'
        + '<dt><code>FROM table</code></dt><dd>Where the rows come from.</dd>'
        + '<dt><code>WHERE condition</code></dt><dd>Which rows to keep: <code>=</code>, <code>&lt;&gt;</code> (not equal), <code>&lt;</code>, <code>&gt;=</code>, <code>AND</code>, <code>OR</code>, <code>NOT</code>, <code>IN (…)</code>, <code>BETWEEN … AND …</code>, <code>LIKE \'%text%\'</code> (<code>%</code> matches any characters).</dd>'
        + '<dt><code>ORDER BY column [ASC | DESC]</code></dt><dd>The order of the rows.</dd>'
        + '<dt><code>LIMIT n</code></dt><dd>At most n rows.</dd></dl>',
      '<p>Text and dates go in <strong>single quotes</strong>: <code>\'ana@example.com\'</code>. You write the clauses in that order, but the database runs them in another, which is why an alias made in <code>SELECT</code> works in <code>ORDER BY</code> but not in <code>WHERE</code>.</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Written first, run third: the order in which the database works through a `SELECT`.',
      desc: 'Step 1, FROM: every row of the table. Step 2, WHERE: keep the matching rows. Step 3, SELECT: keep the named columns. Step 4, ORDER BY: sort. Step 5, LIMIT: keep at most n rows.',
      nodes: [
        { id: 'from', label: '`FROM`', note: 'all 9 tasks' },
        { id: 'where', label: '`WHERE`', note: 'keeps 3 rows' },
        { id: 'select', label: '`SELECT`', note: 'keeps 3 columns', key: true },
        { id: 'order', label: '`ORDER BY`', note: 'sorts them' },
        { id: 'limit', label: '`LIMIT`', note: 'at most n' },
      ],
      edges: [['from', 'where'], ['where', 'select'], ['select', 'order'], ['order', 'limit']],
    },
    code: `SELECT id, title, due_date
FROM tasks
WHERE done = FALSE AND user_id = 1
ORDER BY id;

SELECT id, title FROM tasks WHERE title LIKE '%SQL%';
SELECT email FROM users WHERE id IN (1, 3);`,
    dialect: 'SQL',
    example: 'On the sample data, the first query returns tasks 1, 3 and 4 of ana (task 2 is done). Read it in the order it runs: `FROM tasks` (9 rows) → `WHERE done = FALSE AND user_id = 1` (3 rows) → `SELECT id, title, due_date` (3 columns) → `ORDER BY id`. Load it in the SQL runner and change the `WHERE` to see the result change.',
    mistake: 'Writing `SELECT *` in application code. It returns every column, including ones you add later (a `password_hash`, say), and the API may send them to the client. In a model, name the columns you need: `SELECT id, title, done FROM tasks`.',
    widget: 'sql-runner' },

  { id: 'crud-sql', hub: 'crud', topic: 'crud',
    title: 'INSERT, UPDATE, DELETE: CRUD in SQL',
    summary: 'The four CRUD operations of an API map onto four SQL statements: **C**reate → `INSERT`, **R**ead → `SELECT`, **U**pdate → `UPDATE`, **D**elete → `DELETE`.',
    html: [
      '<p>Each route of the Tasks API becomes one SQL statement, and its result decides the response: if the statement touched no row (the id does not exist), the controller answers <code>404</code>; if it worked, <code>200</code>, <code>201</code> or <code>204</code>.</p>',
      '<dl><dt><code>INSERT INTO table (columns) VALUES (values)</code></dt><dd>Adds a row; columns you leave out take their <code>DEFAULT</code> (or NULL).</dd>'
        + '<dt><code>UPDATE table SET column = value, … WHERE condition</code></dt><dd>Changes the rows that match.</dd>'
        + '<dt><code>DELETE FROM table WHERE condition</code></dt><dd>Removes the rows that match.</dd>'
        + '<dt><code>RETURNING columns</code></dt><dd>PostgreSQL and SQLite: hands back the rows as stored, such as the new id after an <code>INSERT</code>. MySQL has none; mysql2 gives <code>insertId</code> and <code>affectedRows</code> instead.</dd></dl>',
      '<table><caption>From route to SQL to status code (Tasks API)</caption><thead><tr><th scope="col">Route</th><th scope="col">SQL</th><th scope="col">Response</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>POST /tasks</code></th><td><code>INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, done</code></td><td><code>201</code> + the new task</td></tr>'
        + '<tr><th scope="row"><code>GET /tasks</code></th><td><code>SELECT … FROM tasks ORDER BY id</code></td><td><code>200</code> + an array (maybe empty)</td></tr>'
        + '<tr><th scope="row"><code>GET /tasks/:id</code></th><td><code>SELECT … FROM tasks WHERE id = $1</code></td><td><code>200</code>, or <code>404</code> if no row</td></tr>'
        + '<tr><th scope="row"><code>PATCH /tasks/:id</code></th><td><code>UPDATE tasks SET … WHERE id = $1 RETURNING id, user_id, title, done</code></td><td><code>200</code>, or <code>404</code> if 0 rows changed</td></tr>'
        + '<tr><th scope="row"><code>DELETE /tasks/:id</code></th><td><code>DELETE FROM tasks WHERE id = $1</code></td><td><code>204</code>, or <code>404</code> if 0 rows changed</td></tr>'
        + '</tbody></table>',
      '<p><code>$1</code>, <code>$2</code>… are <strong>placeholders</strong>: the server sends the values apart from the SQL text, which keeps user input from becoming SQL (see <a href="#/database/relational/sql-injection">SQL injection</a>). The driver also reports how many rows a statement changed, <code>rowCount</code> in pg (see <a href="#/database/relational/drivers-pools">Connecting from Node</a>): that number tells "updated" from "no such task".</p>',
    ],
    code: `INSERT INTO tasks (user_id, title)
VALUES (3, 'Write tests')
RETURNING id, user_id, title, done;
-- → 10 | 3 | Write tests | false

UPDATE tasks SET done = TRUE WHERE id = 10
RETURNING id, done;
-- → 10 | true   (1 row changed)

DELETE FROM tasks WHERE id = 10;
-- → 1 row changed
DELETE FROM tasks WHERE id = 10;
-- → 0 rows changed → the API answers 404`,
    dialect: 'SQL (PostgreSQL)',
    example: '`PATCH /tasks/5` with `{ "done": true }` runs `UPDATE tasks SET done = TRUE WHERE id = 5 RETURNING id, title, done`: one row changes and comes back, so the controller sends `200` with it. `PATCH /tasks/999` runs the same statement, zero rows change, `rows` is empty, and the controller sends `404`.',
    mistake: 'Running `SELECT` after `INSERT` to "find the row I just added", for example by taking the highest id. Another request may have inserted a row in between, so you would return someone else\'s task. `RETURNING` (or `insertId` in MySQL) gives you exactly your row from the same statement.',
    practice: { href: '#/database/relational/practice/sql-runner', label: 'Try INSERT … RETURNING in the SQL runner' } },

  { id: 'update-delete-where', hub: 'crud', topic: 'crud',
    title: 'UPDATE and DELETE need a WHERE',
    summary: '`UPDATE` and `DELETE` act on **every row that matches the WHERE**; with no `WHERE` at all they change or delete the whole table, and there is no undo.',
    html: [
      '<p>SQL does exactly what you wrote: <code>UPDATE tasks SET done = TRUE</code> marks <strong>every</strong> task done, for every user, and <code>DELETE FROM tasks</code> empties the table. The database does not ask "are you sure?", and once the change is committed only a backup can bring the data back.</p>',
      '<ol><li><strong>Write the <code>WHERE</code> first</strong>, then the rest of the statement.</li>'
        + '<li><strong>Preview</strong> the rows with a <code>SELECT</code> that uses the same <code>WHERE</code>.</li>'
        + '<li><strong>Run it and check the count</strong> the driver reports (<code>rowCount</code>): <code>UPDATE … WHERE id = $1</code> must change 0 or 1 row. For a risky change by hand, use a <a href="#/database/relational/transactions">transaction</a> and <code>ROLLBACK</code> if the count is wrong.</li></ol>',
      '<p>In a model the <code>WHERE</code> always targets the key, <code>WHERE id = $1</code>; when tasks belong to users, <code>WHERE id = $1 AND user_id = $2</code>, so one user can never change another user\'s task (see <a href="#/server/auth/ownership-checks">Ownership and roles</a>).</p>',
    ],
    code: `-- 1. preview: which rows would change?
SELECT id, title FROM tasks WHERE user_id = 2 AND done = TRUE;
-- 2. change exactly those
DELETE FROM tasks WHERE user_id = 2 AND done = TRUE;
-- → 1 row changed

-- The accident:
UPDATE tasks SET done = TRUE;
-- → 9 rows changed: every task is now done`,
    dialect: 'SQL',
    example: 'The preview shows one row (task 6, "Review pull request"), so the `DELETE` with the same `WHERE` reports "1 row changed": the count you expected. Load "UPDATE without WHERE" in the SQL runner to see the accident: the runner warns you, and because every run starts from a fresh copy, nothing is really lost there.',
    mistake: 'Believing a narrow-looking condition is narrow. `DELETE FROM tasks WHERE title LIKE \'%test%\'` also deletes "Contest entry" and "Latest notes". Preview with `SELECT` and read the count before changing anything that is not selected by its key.' },

  { id: 'null-semantics', hub: 'crud', topic: 'crud',
    title: 'NULL: the missing value',
    summary: '`NULL` means "no value / unknown". It is not `0`, not `\'\'` and not `false`; any comparison with NULL is itself unknown, so you test for it with `IS NULL` and `IS NOT NULL`.',
    html: [
      '<p>NULL is a blank field. Ask "is the blank equal to 2026-10-06?" and the honest answer is <strong>unknown</strong>. In SQL, <code>due_date = \'2026-10-06\'</code>, <code>due_date &lt;&gt; \'2026-10-06\'</code> and even <code>due_date = NULL</code> are all unknown when <code>due_date</code> is NULL, and <code>WHERE</code> keeps only the rows whose condition is <strong>true</strong>. So <code>WHERE due_date = NULL</code> never returns a row.</p>',
      '<dl><dt><code>IS NULL</code>, <code>IS NOT NULL</code></dt><dd>The only reliable tests for a missing value.</dd>'
        + '<dt><code>COALESCE(a, b, …)</code></dt><dd>The first argument that is not NULL: <code>COALESCE(due_date, \'no date\')</code>.</dd>'
        + '<dt><code>COUNT(column)</code></dt><dd>Skips NULLs: <code>COUNT(due_date)</code> counts the tasks that have a date, <code>COUNT(*)</code> counts rows.</dd>'
        + '<dt>In JavaScript</dt><dd>pg turns SQL NULL into <code>null</code>.</dd></dl>',
      '<p>A model\'s <code>update</code> uses <code>COALESCE</code> to mean "keep the old value when the client did not send one": <code>SET done = COALESCE($3, done)</code>, with <code>fields.done ?? null</code> as the value. A missing field becomes NULL (keep), while <code>false</code> stays <code>false</code> (change).</p>',
    ],
    code: `-- always 0 rows
SELECT id FROM tasks WHERE due_date = NULL;
-- the tasks with no date
SELECT id FROM tasks WHERE due_date IS NULL;
SELECT id, COALESCE(due_date, 'no date') AS due FROM tasks;

-- PATCH: change only what was sent ($3 is NULL when "done" was not sent)
UPDATE tasks
SET title = COALESCE($2, title),
    done  = COALESCE($3, done)
WHERE id = $1
RETURNING id, title, done;`,
    dialect: 'SQL (PostgreSQL)',
    example: '`PATCH /tasks/4` with `{ "done": true }`: the model sends `[4, null, true]`, so `title = COALESCE(NULL, title)` keeps "Add pagination" and `done = COALESCE(TRUE, done)` sets it. With `{ "done": false }` it sends `[4, null, false]`, and `false` is a real value, so the task is reopened.',
    mistake: 'Writing `fields.done || null` instead of `fields.done ?? null` in the model. `||` treats `false` as missing, so `{ "done": false }` becomes NULL, COALESCE keeps the old `true`, and the client can never reopen a task. `??` replaces only `undefined` and `null`.' },

  { id: 'pagination', hub: 'crud', topic: 'crud',
    title: 'Pagination: LIMIT, OFFSET and ORDER BY',
    summary: '`LIMIT n` keeps at most n rows and `OFFSET k` skips the first k, so page p of size n is `LIMIT n OFFSET (p − 1) × n`; it only works with an `ORDER BY` that gives every row a fixed place.',
    html: [
      '<p><code>LIMIT 10 OFFSET 20</code> means "skip 20 rows, then give me 10": page 3 of 10. What the client sends and what the API answers (<code>?page=3&amp;limit=10</code>, the total in <code>X-Total-Count</code>) is designed in <a href="#/http/api-design/query-params">Filters, sorting and pagination</a>; this card is what the model does with those numbers.</p>',
      '<ul><li><strong>Always <code>ORDER BY</code>:</strong> without it the database may return rows in any order, and the order can change between two queries, so page 2 could repeat a row of page 1 and skip another.</li>'
        + '<li><strong>Make the order unique:</strong> sorting by <code>due_date</code>? Add <code>id</code> as a tie-breaker (<code>ORDER BY due_date, id</code>), because many tasks share a date.</li>'
        + '<li><strong>Cap the limit</strong> (say at 100), or <code>?limit=1000000</code> returns everything anyway (see <a href="#/server/auth/pagination-limits">Pagination limits as protection</a>).</li>'
        + '<li><strong>Deep pages get slow:</strong> <code>OFFSET</code> still reads the rows it skips. Large sites switch to keyset pagination (<code>WHERE id &gt; last_seen_id</code>), which you do not need here.</li></ul>',
      '<p>MySQL accepts the same <code>LIMIT 10 OFFSET 20</code> (and the older <code>LIMIT 20, 10</code>).</p>',
    ],
    code: `-- page 1, 2, 3 of 4 tasks each
-- ids 1–4
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 0;
-- ids 5–8
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 4;
-- id 9
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 8;

-- the model, with parameters (pg)
SELECT id, user_id, title, done FROM tasks
WHERE user_id = $1
ORDER BY id
LIMIT $2 OFFSET $3;`,
    dialect: 'SQL',
    example: '`GET /tasks?page=2&limit=4`: the model computes `offset = (2 − 1) × 4 = 4`, runs `… ORDER BY id LIMIT $1 OFFSET $2` with `[4, 4]` and returns tasks 5, 6, 7 and 8. Page 3 returns only task 9: a short page tells the client it reached the end.',
    mistake: 'Computing the offset from the page number as `page × size`. Pages are usually numbered from 1, so page 1 must skip 0 rows: `offset = (page − 1) × size`. With `page × size`, the first page is never shown.',
    practice: { href: '#/database/relational/practice/sql-runner', label: 'Solve “Page 2 of the list” in the SQL runner' } },

  /* ---- 3. Joins and aggregates ------------------------------------------------------- */
  { id: 'inner-join', hub: 'joins', topic: 'joins',
    title: 'JOIN: combining tables',
    summary: 'A `JOIN` builds one result from two tables by pairing the rows that satisfy the `ON` condition, usually "foreign key = primary key"; an **inner** join (plain `JOIN`) keeps only the rows that found a partner.',
    html: [
      '<p><code>JOIN users u ON u.id = t.user_id</code> pairs each task with the user whose <code>id</code> matches the task\'s <code>user_id</code>. The result row has the columns of both, so the task\'s title can sit next to its owner\'s email. A row with no partner, such as a user with no tasks, is left out: that is what <strong>inner</strong> means.</p>',
      '<dl><dt>Aliases</dt><dd><code>tasks t</code>, <code>users u</code>: short names that say which table a column comes from (<code>t.title</code>, <code>u.email</code>).</dd>'
        + '<dt>Ambiguous columns</dt><dd>When both tables have a column called <code>id</code>, prefix it, or the database answers "column reference id is ambiguous".</dd>'
        + '<dt>Chained joins</dt><dd><code>tasks</code> → <code>task_tags</code> → <code>tags</code> follows a many-to-many relationship through its join table.</dd>'
        + '<dt>After the joins</dt><dd><code>WHERE</code>, <code>ORDER BY</code> and <code>LIMIT</code> work on the combined rows as on any table.</dd></dl>',
    ],
    code: `SELECT t.id, t.title, u.email
FROM tasks t
JOIN users u ON u.id = t.user_id
WHERE u.email = 'ana@example.com' AND t.done = FALSE
ORDER BY t.id DESC;

-- through the join table (many-to-many)
SELECT t.title, g.name AS tag
FROM tasks t
JOIN task_tags tt ON tt.task_id = t.id
JOIN tags g       ON g.id = tt.tag_id;`,
    dialect: 'SQL',
    example: 'The first query pairs 9 tasks with their owners (9 combined rows), keeps ana\'s 3 open ones and sorts them newest first: tasks 4, 3 and 1, each with `ana@example.com`. dan, who owns no tasks, appears in no combined row, so a `JOIN` can never list him: that needs a [LEFT JOIN](#/database/relational/left-join).',
    mistake: 'Forgetting the `ON` condition, or writing `FROM tasks, users` with no condition. Every task is then paired with **every** user (9 × 4 = 36 rows of nonsense), a "cross join". If a join returns far more rows than either table has, check the `ON`.' },

  { id: 'left-join', hub: 'joins', topic: 'joins',
    title: 'LEFT JOIN: keeping rows without a match',
    summary: 'A `LEFT JOIN` keeps **every** row of the table on its left; when a row has no partner on the right, the right-hand columns are filled with NULL.',
    html: [
      '<p><code>FROM users u LEFT JOIN tasks t ON t.user_id = u.id</code> lists every user. A user with three tasks gives three rows; dan, with none, gives <strong>one</strong> row whose task columns are all NULL. That padded row makes three common queries possible.</p>',
      '<table><caption>Using the padded row</caption><thead><tr><th scope="col">You want</th><th scope="col">Write</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row">Users with no tasks</th><td><code>WHERE t.id IS NULL</code></td><td>The task\'s primary key is NULL only in a padded row</td></tr>'
        + '<tr><th scope="row">Tasks per user, zeros included</th><td><code>COUNT(t.id)</code></td><td>It skips the NULL, so dan gets 0; <code>COUNT(*)</code> would count his row and give 1</td></tr>'
        + '<tr><th scope="row">A filter that keeps unmatched users</th><td>In the <code>ON</code>: <code>ON t.user_id = u.id AND t.done = FALSE</code></td><td>In the <code>WHERE</code>, NULL is not FALSE: the padded rows go and the join turns inner</td></tr>'
        + '</tbody></table>',
    ],
    code: `-- every user and how many tasks they own, 0 included
SELECT u.email, COUNT(t.id) AS task_count
FROM users u
LEFT JOIN tasks t ON t.user_id = u.id
GROUP BY u.id, u.email;

-- users with no tasks at all
SELECT u.email
FROM users u
LEFT JOIN tasks t ON t.user_id = u.id
WHERE t.id IS NULL;

-- open tasks per user, still keeping users with none
SELECT u.email, COUNT(t.id) AS open_tasks
FROM users u
LEFT JOIN tasks t ON t.user_id = u.id AND t.done = FALSE
GROUP BY u.id, u.email;`,
    dialect: 'SQL',
    example: 'On the sample data the first query gives ana 4, ben 3, cleo 2 and dan 0; the second returns only `dan@example.com`. This "count per parent, zeros included" report is the classic reason to reach for `LEFT JOIN`. In the SQL runner, try the challenges “Users with no tasks” and “Tasks per user, zeros included”.',
    mistake: 'Using `COUNT(*)` with a `LEFT JOIN` to count children. The padded row is still a row, so a user with no tasks is reported with 1 task. Count a column of the right-hand table, such as `COUNT(t.id)`.',
    widget: 'sql-runner' },

  { id: 'aggregates', hub: 'joins', topic: 'joins',
    title: 'COUNT and GROUP BY',
    summary: '**Aggregate functions** (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) turn many rows into one value; `GROUP BY` makes one group per distinct value and computes the aggregates once per group; `HAVING` filters the groups.',
    html: [
      '<p><code>GROUP BY u.id, u.email</code> makes one group per user, and <code>COUNT(*)</code> is computed once per group. Without <code>GROUP BY</code>, an aggregate treats the whole table as one group: <code>SELECT COUNT(*) FROM tasks</code> gives one row, 9.</p>',
      '<p><strong>One value per group:</strong> every column in <code>SELECT</code> is either in the <code>GROUP BY</code> or inside an aggregate. A group of tasks has one owner but many titles, so "the title of the group" means nothing. PostgreSQL (and MySQL by default) refuse such a query, except that once you group by a table\'s primary key you may select its other columns. SQLite, used by the runner, quietly picks any row, so write it correctly anyway.</p>',
      '<table><caption>Two filters, before and after grouping</caption><thead><tr><th scope="col"></th><th scope="col"><code>WHERE</code></th><th scope="col"><code>HAVING</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">Filters</th><td>Rows, before grouping</td><td>Groups, after counting</td></tr>'
        + '<tr><th scope="row">Example</th><td>Only the open tasks</td><td>Only users with 2 or more</td></tr>'
        + '<tr><th scope="row">Can use <code>COUNT(*)</code></th><td>No: the groups do not exist yet</td><td>Yes</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Rows are filtered, grouped, and then the groups are filtered.',
      desc: 'Step 1: the 9 tasks. Step 2: WHERE keeps the 6 open ones. Step 3: GROUP BY makes one group per user, 3 groups. Step 4: HAVING keeps the 2 groups with at least 2 tasks. Step 5: ORDER BY sorts them, busiest first.',
      nodes: [
        { id: 'rows', label: 'Rows', note: '9 tasks' },
        { id: 'where', label: '`WHERE`', note: '6 open' },
        { id: 'group', label: '`GROUP BY`', note: '3 users', key: true },
        { id: 'having', label: '`HAVING`', note: '2 groups kept' },
        { id: 'order', label: '`ORDER BY`', note: 'busiest first' },
      ],
      edges: [['rows', 'where'], ['where', 'group'], ['group', 'having'], ['having', 'order']],
    },
    code: `-- open tasks per user, busiest first, only users with 2 or more
SELECT u.email, COUNT(*) AS open_tasks
FROM tasks t
JOIN users u ON u.id = t.user_id
-- rows: keep the open tasks
WHERE t.done = FALSE
-- one group per user
GROUP BY u.id, u.email
-- groups: keep the busy users
HAVING COUNT(*) >= 2
ORDER BY open_tasks DESC;`,
    dialect: 'SQL',
    example: 'On the sample data the groups are ana (3 open tasks), ben (2) and cleo (1); `HAVING COUNT(*) >= 2` drops cleo, so the result is `ana@example.com 3`, `ben@example.com 2`. "Who has the most open tasks?" is the same query with `LIMIT 1` instead of `HAVING` (with a tie, `LIMIT 1` silently hides the other users).',
    mistake: 'Expecting a number from pg to arrive as a JavaScript number. `COUNT(*)` returns a `bigint`, and pg sends `bigint` to JavaScript as a **string** (`"3"`) so huge values are not rounded. Convert it in the model (`Number(row.open_tasks)`) or in SQL (`COUNT(*)::int`) before it reaches the JSON.' },

  /* ---- 4. Indexes and migrations ---------------------------------------------------- */
  { id: 'indexes', hub: 'schema', topic: 'schema',
    title: 'Indexes: finding rows fast',
    summary: 'An **index** is an extra sorted structure over one or more columns that lets the database jump to the matching rows instead of reading the whole table; it speeds up reads on those columns and slows writes a little.',
    html: [
      '<p>Like the index at the back of a book, it lets the database jump to the right place instead of reading every page. Without an index, <code>WHERE user_id = 2</code> reads every row of <code>tasks</code> (a <strong>scan</strong>); with one, the database looks up 2 in a sorted tree (a B-tree) and goes straight to those rows (a <strong>search</strong>). With 9 rows you cannot tell the difference; with 10 million you can.</p>',
      '<table><caption>Which columns have an index</caption><thead><tr><th scope="col">Column</th><th scope="col">Index</th></tr></thead><tbody>'
        + '<tr><th scope="row">Primary key</th><td>Created automatically</td></tr>'
        + '<tr><th scope="row"><code>UNIQUE</code> column</th><td>Created automatically: that is how duplicates are found fast</td></tr>'
        + '<tr><th scope="row">Foreign key</th><td>PostgreSQL: <strong>not</strong> automatic, add one (<code>tasks.user_id</code>). MySQL: automatic</td></tr>'
        + '<tr><th scope="row">A column you filter, join or sort by</th><td>Add one when a query on it is slow and frequent</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Not free:</strong> each index takes disk space, and every <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code> must update every index of the table. No index "on every column just in case".</li>'
        + '<li><strong>Check it:</strong> <code>EXPLAIN</code> (PostgreSQL) or <code>EXPLAIN QUERY PLAN</code> (SQLite) shows whether a query uses an index.</li></ul>',
    ],
    code: `CREATE INDEX tasks_user_id_idx ON tasks (user_id);

-- PostgreSQL: how will this query run? (on a big table)
EXPLAIN SELECT id, title FROM tasks WHERE user_id = 2;
--  Index Scan using tasks_user_id_idx on tasks …    (with the index)
--  Seq Scan on tasks  Filter: (user_id = 2)          (without it)`,
    dialect: 'SQL (PostgreSQL)',
    example: 'The sample database has `tasks_user_id_idx`. In the SQL runner, the "Is an index used?" example shows `SEARCH tasks USING INDEX tasks_user_id_idx (user_id=?)` for `WHERE user_id = 2`, but `SCAN tasks` for `WHERE title = \'Set up CI\'`, because no index covers `title`. A `GET /tasks?userId=2` on a big table is fast only in the first case.',
    mistake: 'Believing an index changes what a query returns, or that it makes everything faster. An index only changes **how fast** the same rows are found, and only for queries that filter or sort by the indexed columns; on a table that is mostly written to, extra indexes make it slower.' },

  { id: 'migrations', hub: 'schema', topic: 'schema',
    title: 'Migrations: versioning the schema',
    summary: 'A **migration** is a numbered script that changes the schema one step (create a table, add a column); the scripts live with the code and a tool runs, in order, the ones a database has not run yet.',
    html: [
      '<p>Your code expects a certain schema. When the code changes (tasks get a due date), the schema must change too: on your laptop, on a teammate\'s, on the test server and in production. Doing it by hand ("I ran an <code>ALTER TABLE</code> last week") means someone always forgets. Instead, each change is a numbered file kept with the code: <code>001_create_users.sql</code>, <code>002_create_tasks.sql</code>, <code>003_add_due_date_to_tasks.sql</code>.</p>',
      '<ol><li>The migration tool keeps a table in the database that lists the migrations already run there.</li>'
        + '<li>Running "migrate" compares that list with the files.</li>'
        + '<li>It runs only the missing ones, in number order, and records each one.</li></ol>',
      '<p>Knex, Prisma Migrate, Sequelize CLI or a small script all work this way. A new teammate runs one command and gets exactly the schema the code expects.</p>',
      '<p><strong>Golden rule:</strong> never edit a migration that has already run somewhere. That database will not run it again, so the fix never reaches it; write a new migration instead. Many tools also give each migration a "down" part that undoes it, for rolling back a bad deploy.</p>',
    ],
    code: `-- migrations/001_create_users.sql
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

-- migrations/002_create_tasks.sql
CREATE TABLE tasks (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  done    BOOLEAN NOT NULL DEFAULT FALSE
);

-- migrations/003_add_due_date_to_tasks.sql
ALTER TABLE tasks ADD COLUMN due_date DATE;`,
    dialect: 'SQL (PostgreSQL)',
    example: 'Your production database has run 001 and 002. You push a feature with migration 003. The deploy runs "migrate": the tool sees 001 and 002 in its history table, runs only 003 (`ALTER TABLE … ADD COLUMN due_date`), records it, and existing tasks get `due_date = NULL`. A setup script that starts with `DROP TABLE IF EXISTS` and recreates every table is fine for a throwaway practice database, but it wipes the data each time it runs, which is exactly what migrations avoid.',
    mistake: 'Fixing a typo in `002_create_tasks.sql` after it ran on your teammate\'s database. Their migration history already lists 002, so the fix is never applied there and the two databases silently differ. Add `004_fix_….sql` instead.' },

  /* ---- 5. From Node to SQL ---------------------------------------------------------- */
  { id: 'drivers-pools', hub: 'node', topic: 'node',
    title: 'Connecting from Node: drivers and pools',
    summary: 'A **driver** is the npm package that speaks a database\'s network protocol (`pg` for PostgreSQL, `mysql2` for MySQL); a **pool** keeps a few open connections and lends one to each query, so requests do not pay for a new connection every time.',
    html: [
      '<p>Your server and the database are two programs talking over the network. Opening a <strong>connection</strong> (finding the server, logging in, setting up encryption) takes time, and a database accepts only so many at once. A <strong>pool</strong> keeps a few connections open, lends one to each query and takes it back. Create <strong>one pool for the whole application</strong>, at start-up, not one per request.</p>',
      '<dl><dt><code>DATABASE_URL</code></dt><dd>The connection details (host, port, user, password, database) from the environment, never from the code: <code>postgres://app:secret@localhost:5432/tasks</code> in <code>.env</code> (see <a href="#/server/runtime/env-vars">Environment variables</a>).</dd>'
        + '<dt><code>pool.query(text, params)</code></dt><dd>Runs one statement and returns a promise of the result.</dd>'
        + '<dt><code>result.rows</code></dt><dd>An array of plain objects, one per row, with the column names as keys.</dd>'
        + '<dt><code>result.rowCount</code></dt><dd>How many rows were returned or changed.</dd>'
        + '<dt><code>$1</code>, <code>$2</code>…</dt><dd>Placeholders: the values in <code>params</code> travel apart from the SQL text. mysql2 writes <code>?</code>.</dd></dl>',
      '<h3>Above the driver</h3>',
      '<p><strong>Query builders</strong> (Knex: <code>db("tasks").where({ id })</code>) generate SQL from JavaScript; <strong>ORMs</strong>, object-relational mappers (Prisma, Sequelize), map tables to models and often include migrations. Both write parameterised SQL for you, but you still need SQL to understand and debug them. The examples on this site use the plain <code>pg</code> driver.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'One pool, created at start-up, lends an open connection to every query.',
      desc: 'A model calls pool.query with SQL and parameters. The pool lends one of its open connections. PostgreSQL runs the SQL. The result comes back with rows and rowCount, and the connection returns to the pool.',
      nodes: [
        { id: 'model', label: 'Your model', note: '`pool.query(sql, params)`' },
        { id: 'pool', label: 'The pool', note: 'lends an open connection', key: true },
        { id: 'db', label: 'PostgreSQL', note: 'runs the SQL' },
        { id: 'result', label: 'The result', note: '`rows`, `rowCount`' },
      ],
      edges: [['model', 'pool'], ['pool', 'db'], ['db', 'result']],
    },
    code: `// src/db/pool.js — created once, shared by every model
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;

// anywhere in a model
const result = await pool.query("SELECT id, title FROM tasks WHERE id = $1", [7]);
result.rows;
// → [ { id: 7, title: "Draft project plan" } ]
result.rowCount;
// → 1

// MySQL with mysql2: "?" placeholders, the result is [rows, fields]
const mysql = require("mysql2/promise");
const db = mysql.createPool({ uri: process.env.DATABASE_URL });
const [rows] = await db.query("SELECT id, title FROM tasks WHERE id = ?", [7]);`,
    dialect: 'JavaScript (Node)',
    example: 'A burst of 50 requests arrives. With a pool of 10, the first 10 queries get a connection at once and the others wait a few milliseconds for one to be handed back; the database sees at most 10 connections. Opening a fresh connection per request would mean 50 logins and could exceed the database\'s connection limit.',
    mistake: 'Writing `new Pool()` inside a request handler or a model function. Each call opens new connections that are never closed, and after a few hundred requests the database refuses with "too many clients". Create the pool once in its own module and `require` it, or hand it to the model (see [The models layer](#/database/relational/models-layer)).' },

  { id: 'sql-injection', hub: 'node', topic: 'node',
    title: 'SQL injection and parameterised queries',
    summary: '**SQL injection** happens when user input is pasted into the text of an SQL statement, so the input can change what the statement does; **parameterised queries** send the SQL text and the values separately (`$1` in pg, `?` in mysql2), so input is always just a value.',
    html: [
      '<p>When the server glues input into the SQL string, the database cannot tell your SQL from the user\'s text, and runs both. The server builds <code>"… WHERE u.email = \'" + email + "\'"</code>. A normal email works, but the input <code>\' OR \'1\'=\'1</code> makes <code>WHERE u.email = \'\' OR \'1\'=\'1\'</code>, true for every row, and the API leaks every user\'s tasks.</p>',
      '<ul><li><strong>Worse inputs:</strong> with pg, a query without parameters may contain several statements, so <code>x\'; DELETE FROM tasks; --</code> deletes the table (<code>--</code> comments out the leftover quote).</li>'
        + '<li><strong>Honest users break it too:</strong> the name O\'Brien ends the string early.</li></ul>',
      '<p>The fix is not to clean the input but to keep it out of the SQL text: a <strong>placeholder</strong> plus an array of values. The driver sends the two apart; the database compiles the text first and only then fills in <code>$1</code> as a value, so quotes in the input are just characters.</p>',
      '<p>Placeholders stand for <strong>values</strong> only. A column name, or <code>ASC</code>/<code>DESC</code> from the query string, must be checked against an <strong>allow-list</strong> in code.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The same input: part of the query, or just a value.',
      desc: "The input ' OR '1'='1 reaches the server. Pasted into the SQL text, it becomes SQL and the query matches every row. Sent as the value of $1, it is only an odd email that matches no row.",
      nodes: [
        { id: 'input', label: 'The input', note: "`' OR '1'='1`" },
        { id: 'paste', label: 'Pasted into SQL', note: 'runs as SQL: every row' },
        { id: 'param', label: 'Sent as `$1`', note: 'only a value: no match', key: true },
      ],
      edges: [['input', 'paste'], ['input', 'param']],
    },
    code: `// VULNERABLE: the input becomes SQL
const sql = \`SELECT id, title FROM tasks WHERE user_id = \${req.query.user}\`;
// ?user=1 OR 1=1  → every task
await pool.query(sql);

// SAFE: fixed SQL text + values apart
await pool.query("SELECT id, title FROM tasks WHERE user_id = $1", [req.query.user]);
// mysql2:  db.query("… WHERE user_id = ?", [req.query.user])

// Identifiers cannot be parameters: use an allow-list
const SORTABLE = { id: "id", title: "title", due: "due_date" };
// never the raw input
const column = SORTABLE[req.query.sort] || "id";
await pool.query(\`SELECT id, title FROM tasks ORDER BY \${column} LIMIT $1\`, [limit]);`,
    dialect: 'JavaScript (Node, pg)',
    example: 'In the SQL runner\'s injection demo, type `\' OR \'1\'=\'1`: the concatenated query returns all 9 tasks; the `$1` query returns none, because no user has that strange email. Then try `x\'; DELETE FROM tasks; --` and look at "tasks left afterwards": 0 for concatenation, 9 for the placeholder.',
    mistake: 'Thinking a template literal (a backtick string with `${id}` inside) is safer than `+`. It is still string concatenation: the input still becomes part of the SQL text. Only a placeholder plus a params array keeps it out. Escaping quotes by hand is not enough either: it is easy to miss a case, and numbers need no quotes to inject (`1 OR 1=1`).',
    widget: 'sql-runner' },

  { id: 'transactions', hub: 'node', topic: 'node',
    title: 'Transactions: all or nothing',
    summary: 'A **transaction** groups several statements so that they all take effect (`COMMIT`) or none does (`ROLLBACK`); other requests never see the half-finished state.',
    html: [
      '<p>A bank transfer is two updates: take 50 from Ana\'s account, add 50 to Ben\'s. If the server crashes between them, 50 euros vanish. In a transaction the two updates are one unit: <code>BEGIN</code> starts it, and either <code>COMMIT</code> makes both permanent or <code>ROLLBACK</code> (or a crash) undoes both. Until the commit, other connections keep seeing the old balances.</p>',
      '<p>Every single statement is already a small transaction: a <code>DELETE</code> that fails halfway deletes nothing. Write <code>BEGIN … COMMIT</code> when <strong>one request</strong> makes <strong>several</strong> changes that only make sense together: an order and its order lines, or a task moved to another project with two counters updated.</p>',
      '<h3>In SQL</h3>',
      '<pre><code>BEGIN;\n'
        + 'UPDATE accounts SET balance = balance - 50 WHERE id = 1;\n'
        + 'UPDATE accounts SET balance = balance + 50 WHERE id = 2;\n'
        + '-- or ROLLBACK; to undo both\n'
        + 'COMMIT;</code></pre>',
      '<h3>From Node: one client for the whole transaction</h3>',
      '<p><code>pool.query()</code> may run each call on a different connection (see <a href="#/database/relational/drivers-pools">Connecting from Node</a>), so a <code>BEGIN</code> on one and an <code>UPDATE</code> on another are not one transaction. Take one client with <code>pool.connect()</code>, use it from <code>BEGIN</code> to <code>COMMIT</code>, and always give it back.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'All or nothing: a transaction ends in `COMMIT` or `ROLLBACK`.',
      desc: 'BEGIN starts the transaction and the updates run. If every statement worked, COMMIT makes all the changes permanent. If anything failed, ROLLBACK undoes all of them, as if none had run.',
      nodes: [
        { id: 'begin', label: '`BEGIN` + updates', note: 'one unit', key: true },
        { id: 'commit', label: '`COMMIT`', note: 'all changes stay' },
        { id: 'rollback', label: '`ROLLBACK`', note: 'none of them happened' },
      ],
      edges: [['begin', 'commit', 'all worked'], ['begin', 'rollback', 'an error']],
    },
    code: `// one connection for the whole unit
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [50, fromId]);
  await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [50, toId]);
  // both, or…
  await client.query("COMMIT");
} catch (err) {
  // …neither
  await client.query("ROLLBACK");
  throw err;
} finally {
  // back to the pool, always
  client.release();
}`,
    dialect: 'JavaScript (Node, pg)',
    example: 'In the SQL runner, the "Transaction" example runs `BEGIN`, marks all of ana\'s tasks done, shows them done, then `ROLLBACK`s: the last `SELECT` shows them open again, as if the update never happened. Replace `ROLLBACK` with `COMMIT` and the change stays.',
    mistake: 'Writing `await pool.query("BEGIN")` and then more `pool.query` calls. Each call may borrow a different connection from the pool, so the statements are not inside your transaction, and `ROLLBACK` undoes nothing. Use `pool.connect()` and one `client` from `BEGIN` to `COMMIT`.' },

  { id: 'models-layer', hub: 'node', topic: 'node',
    title: 'The models layer: where the SQL lives',
    summary: 'A **model** is a module of async functions, one per data operation (`findAll`, `findById`, `create`, `update`, `remove`…); each wraps one parameterised query and returns plain data: an object, an array, `null` or `true`/`false`.',
    html: [
      '<p>The API is split into layers with one job each (see <a href="#/server/runtime/project-layout">A Node/Express project layout</a>): routes map a URL to a controller, controllers deal with HTTP, and the <strong>model</strong> is the only code that talks to the database. Swapping an in-memory array for PostgreSQL then changes only the model: each handler line goes from <code>tasks.find(…)</code> to <code>await tasksModel.findById(id)</code>. A later move to a <a href="#/database/documents">document database</a> would again change only the model.</p>',
      '<table><caption>Who does what in the Tasks API</caption><thead><tr><th scope="col">Layer</th><th scope="col">File (typical layout)</th><th scope="col">Its job</th><th scope="col">Never</th></tr></thead><tbody>'
        + '<tr><th scope="row">Routes</th><td><code>src/routes/tasks.js</code></td><td><code>router.get("/:id", controller.getTask)</code></td><td>Contain logic</td></tr>'
        + '<tr><th scope="row">Controller</th><td><code>src/controllers/tasksController.js</code></td><td>Read <code>req</code>, validate, call the model, choose status + JSON</td><td>Write SQL</td></tr>'
        + '<tr><th scope="row">Model</th><td><code>src/models/tasksModel.js</code></td><td>Run parameterised SQL, return plain objects or <code>null</code></td><td>Touch <code>req</code> / <code>res</code></td></tr>'
        + '</tbody></table>',
      '<p>The method names are a <strong>contract</strong>: the controller asks for task 7 (<code>findById(7)</code>) and gets a task or <code>null</code>, never knowing what is behind the model. The array version, the SQL version and a MongoDB version of the same API can keep the same names, so the controller never changes.</p>',
      '<h3>A factory that is handed its database</h3>',
      '<figure data-diagram></figure>',
      '<p><code>createTasksModel(db)</code> takes anything with an async <code>query(text, params)</code> method: the real pg pool in the app, a small fake that returns canned rows in a test. This is <strong>dependency injection</strong>: the model is handed its database instead of <code>require</code>-ing it, so it can be tested with no database running. Each method follows the same steps:</p>',
      '<ol><li>Write the SQL with placeholders.</li>'
        + '<li><code>await db.query(sql, params)</code>.</li>'
        + '<li>Shape the answer: <code>rows</code> for a list, <code>rows[0] ?? null</code> for one item, <code>rowCount &gt; 0</code> for "did it delete?".</li></ol>',
      '<ul><li><strong>Errors pass through:</strong> the model does not catch them; the controller does, and in Express 4 calls <code>next(err)</code> (see <a href="#/server/routes/express-async-errors">Async handlers: Express 4 versus Express 5</a>).</li>'
        + '<li><strong>No SQL in routes:</strong> <code>pool.query</code> straight from route handlers means the same query written five times, a column rename hunted through the whole app, and routes that cannot be tested without a database.</li></ul>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One model, any database object: the real pool in the app, a fake in tests.',
      desc: 'createTagsModel receives a db object. In the app it is the pg pool, connected to PostgreSQL. In a test it is a fake object whose query method returns canned rows, so no database is needed.',
      nodes: [
        { id: 'factory', label: '`createTagsModel(db)`', key: true },
        { id: 'app', label: 'In the app', note: 'the pg pool' },
        { id: 'test', label: 'In a test', note: 'a fake `db`, canned rows' },
      ],
      edges: [['factory', 'app'], ['factory', 'test']],
    },
    code: `// src/models/tagsModel.js — the same pattern as a tasksModel
function createTagsModel(db) {
  return {
    async findAll() {
      const { rows } = await db.query("SELECT id, name FROM tags ORDER BY name", []);
      return rows;
    },
    async findByName(name) {
      const { rows } = await db.query("SELECT id, name FROM tags WHERE name = $1", [name]);
      // one object, or null
      return rows[0] ?? null;
    },
    async create(name) {
      const { rows } = await db.query(
        "INSERT INTO tags (name) VALUES ($1) RETURNING id, name", [name]);
      return rows[0];
    },
  };
}
module.exports = { createTagsModel };

// controller (Express 4): await the model, forward failures
async function getTag(req, res, next) {
  try {
    const tag = await tagsModel.findByName(req.params.name);
    if (!tag) return res.status(404).json({ error: "Tag not found" });
    res.json(tag);
  } catch (err) {
    next(err);
  }
}`,
    dialect: 'JavaScript (Node)',
    example: 'A test needs no database: `const fake = { query: async () => ({ rows: [{ id: 1, name: "urgent" }], rowCount: 1 }) }; const tags = createTagsModel(fake);` and `await tags.findByName("urgent")` returns `{ id: 1, name: "urgent" }`. In the app the same model gets the pool: `createTagsModel(require("./db/pool"))`.',
    mistake: 'Letting the model decide HTTP things: `if (!row) res.status(404)…` inside `findById`, or throwing an error for "not found". A missing row is a normal answer, `null`; the controller turns it into `404`. Keeping HTTP out of the model is what lets the same model serve a route, a script and a test.' },

  { id: 'rows-to-json', hub: 'node', topic: 'node',
    title: 'From rows to JSON',
    summary: 'A database row and the JSON an API returns are two shapes: one mapping function turns `snake_case` columns into `camelCase` keys, converts the types pg returns and lists only the fields the API sends.',
    html: [
      '<p>Why an API sends an explicit list of fields, a <strong>DTO</strong> (Data Transfer Object), instead of the raw row is in <a href="#/http/api-design/dto">The API contract vs the database row</a>. This card is about what pg hands you, and where to map it.</p>',
      '<table><caption>What pg returns and what the JSON needs</caption><thead><tr><th scope="col">In the row</th><th scope="col">pg gives</th><th scope="col">Map it to</th></tr></thead><tbody>'
        + '<tr><th scope="row">Column names</th><td><code>snake_case</code> (<code>user_id</code>, <code>created_at</code>): many databases fold unquoted names to lower case</td><td><code>camelCase</code> keys (<code>userId</code>, <code>createdAt</code>)</td></tr>'
        + '<tr><th scope="row"><code>BIGINT</code>, <code>NUMERIC</code> (such as <code>COUNT(*)</code>)</th><td>A string (<code>"4"</code>), so huge values are not rounded</td><td><code>Number(row.task_count)</code>, or <code>COUNT(*)::int</code> in SQL</td></tr>'
        + '<tr><th scope="row"><code>TIMESTAMP</code></th><td>A <code>Date</code> object</td><td>An ISO string: <code>row.created_at.toISOString()</code></td></tr>'
        + '<tr><th scope="row">Secret columns (<code>password_hash</code>)</th><td>Whatever <code>SELECT</code> asked for</td><td>Nothing: list only the fields to send</td></tr>'
        + '</tbody></table>',
      '<p><strong>Map in one place.</strong> A common choice is <code>toDto(row)</code> in the model, so raw rows never leave it; some codebases map in the controller instead. Either works if every route uses the same layer: mixing them is how an API returns <code>user_id</code> from one route and <code>userId</code> from another.</p>',
    ],
    live: { kind: 'js', code: `// A row as pg returns it from SELECT * FROM users
const row = {
  id: 1,
  email: "ana@example.com",
  password_hash: "$2b$10$Qe3…",
  created_at: new Date("2026-09-01T09:00:00Z"),
  // COUNT(*) is a bigint: pg sends a string
  task_count: "4",
};

// Opt-in mapping: only the listed fields leave the server
function toUserDto(r) {
  return {
    id: r.id,
    email: r.email,
    createdAt: r.created_at.toISOString(),
    taskCount: Number(r.task_count),
  };
}

console.log(toUserDto(row));
console.log("password_hash" in toUserDto(row));
// → false` },
    example: 'Run the Try it box: the DTO has `createdAt`, a real number `taskCount: 4`, and no `password_hash`. Without it, `res.json(row)` would send `password_hash`, `created_at` and `"task_count": "4"` (a string) to every client, and the front end would break the day someone renames a column.',
    mistake: 'Removing secrets with `delete row.password_hash` before `res.json(row)`. It works until someone adds another sensitive column, or forgets the `delete` in one route. An explicit list of the fields to send (`{ id, email, createdAt }`) cannot leak what it does not name.' },
];

DATA.en.SQL_QUIZ = [
  /* model */
  { type: 'mc', topic: 'model',
    q: 'A first version of a Tasks API keeps its tasks in an array. What happens to them when `node --watch` restarts the server after you save a file?',
    choices: ['They are saved to `package.json`', 'They are lost: the array lived in the process\'s memory', 'They are kept until the computer is switched off', 'Express writes them to a temporary file'],
    answer: 1,
    why: 'Memory belongs to the process; a restart starts a new process with a fresh array. A database stores the data on disk, outside the server.' },
  { type: 'mc', topic: 'model',
    q: '`tasks.user_id` is declared `REFERENCES users(id)`, and the users table has ids 1–4. Which statement does the database refuse?',
    choices: ["`INSERT INTO tasks (user_id, title) VALUES (4, 'Plan')`", "`INSERT INTO tasks (user_id, title) VALUES (9, 'Plan')`", "`UPDATE tasks SET title = 'Plan' WHERE user_id = 9`", '`SELECT * FROM tasks WHERE user_id = 9`'],
    answer: 1,
    why: 'A foreign key only accepts values that exist in the referenced column. The UPDATE matches no rows and the SELECT only reads, so neither breaks the rule.' },
  { type: 'mc', topic: 'model',
    q: '`tasks.user_id` has `ON DELETE CASCADE`. What does `DELETE FROM users WHERE id = 2` do?',
    choices: ['Fails because user 2 still has tasks', 'Deletes user 2 and sets their tasks\' `user_id` to NULL', 'Deletes user 2 and every task with `user_id = 2`', 'Deletes only the tasks, not the user'],
    answer: 2,
    why: 'CASCADE propagates the delete to the rows that reference the deleted one. Refusing is the default behaviour (no ON DELETE clause), and SET NULL is a different option.' },
  { type: 'mc', topic: 'model',
    q: 'Students can enrol in many courses and each course has many students. How do you store this?',
    choices: ['A `course_ids TEXT` column in `students` with values such as `\'3,7,9\'`', 'A `student_id` column in `courses`', 'A join table `enrolments (student_id, course_id)` with two foreign keys', 'One table with a row per student and a column per course'],
    answer: 2,
    why: 'Many-to-many needs a third table where each row is one pair. A list in a column cannot be checked by foreign keys, and one `student_id` per course allows only one student.' },
  { type: 'mc', topic: 'model',
    q: 'One user owns many tasks. Where does the foreign key go?',
    choices: ['In `users`: a `task_id` column', 'In `tasks`: a `user_id` column', 'In both tables', 'In a separate join table'],
    answer: 1,
    why: 'In a one-to-many relationship the "many" side stores the reference: each task has exactly one owner, so one `user_id` per task is enough.' },
  { type: 'fib', topic: 'model',
    q: 'The constraint that stops two accounts from registering the same email is ___ .',
    accept: ['UNIQUE', 'unique'],
    why: '`email TEXT NOT NULL UNIQUE`: the database refuses a second row with the same value (pg error code 23505, usually answered with 409 Conflict).' },
  { type: 'tf', topic: 'model',
    q: 'With `done BOOLEAN NOT NULL DEFAULT FALSE`, an INSERT that does not mention `done` stores FALSE.',
    answer: true,
    why: 'DEFAULT gives the value used when the column is left out of the INSERT, so the NOT NULL rule is still met.' },
  { type: 'tf', topic: 'model',
    q: '`title TEXT NOT NULL` also refuses an empty title `\'\'`.',
    answer: false,
    why: 'An empty string is a value, not NULL. To forbid it, add `CHECK (title <> \'\')` (and validate it in the controller).' },
  { type: 'mc', topic: 'model',
    q: 'Which column type should store a product price such as 12.50 €?',
    choices: ['`FLOAT`', '`NUMERIC(10,2)`', '`TEXT`', '`INTEGER`'],
    answer: 1,
    why: 'NUMERIC stores exact decimals. Floating point cannot represent 0.1 exactly, so sums of prices drift; text cannot be added or sorted as numbers.' },

  /* crud */
  { type: 'mc', topic: 'crud',
    q: 'Which SQL statement does `PATCH /tasks/7` with `{ "done": true }` run?',
    choices: ['`INSERT INTO tasks (id, done) VALUES (7, TRUE)`', '`UPDATE tasks SET done = TRUE WHERE id = 7`', '`SELECT done FROM tasks WHERE id = 7`', '`ALTER TABLE tasks SET done = TRUE`'],
    answer: 1,
    why: 'PATCH changes an existing resource: an UPDATE limited by WHERE to that one row. ALTER TABLE changes the schema, not the data.' },
  { type: 'mc', topic: 'crud',
    q: 'What does `UPDATE tasks SET done = TRUE;` do?',
    choices: ['Nothing: UPDATE needs a WHERE', 'Marks the last inserted task as done', 'Marks every task in the table as done', 'Asks for confirmation first'],
    answer: 2,
    why: 'Without WHERE, an UPDATE applies to every row. SQL never asks for confirmation, so preview with a SELECT and check the row count.' },
  { type: 'tf', topic: 'crud',
    q: '`SELECT id FROM tasks WHERE due_date = NULL` returns the tasks that have no due date.',
    answer: false,
    why: 'Comparing anything with NULL gives "unknown", which WHERE treats as not true, so the query returns no rows. Use `due_date IS NULL`.' },
  { type: 'fib', topic: 'crud',
    q: 'Complete the condition that finds the tasks with a due date: `WHERE due_date IS ___ NULL`.',
    accept: ['NOT', 'not'],
    why: '`IS NULL` and `IS NOT NULL` are the only reliable tests for a missing value.' },
  { type: 'mc', topic: 'crud',
    q: 'The API shows 20 tasks per page, ordered by id. Which clause returns page 3?',
    choices: ['`LIMIT 20 OFFSET 60`', '`LIMIT 20 OFFSET 40`', '`LIMIT 3 OFFSET 20`', '`LIMIT 60 OFFSET 40`'],
    answer: 1,
    why: 'Page p skips (p − 1) × size rows: page 3 skips 40 and takes 20, so it shows rows 41–60.' },
  { type: 'tf', topic: 'crud',
    q: 'Without `ORDER BY`, `LIMIT 10 OFFSET 10` is guaranteed to return rows 11–20 in insertion order.',
    answer: false,
    why: 'Without ORDER BY the database may return rows in any order, and the order can change between queries, so pages can overlap or skip rows.' },
  { type: 'mc', topic: 'crud',
    q: 'What does `RETURNING id` add to `INSERT INTO tasks (user_id, title) VALUES (3, \'Test\')` in PostgreSQL?',
    choices: ['It returns the highest id in the table', 'It returns the id the database gave the new row', 'It makes the INSERT undoable', 'It checks that the id is unique'],
    answer: 1,
    why: 'RETURNING sends back columns of the rows the statement wrote, from the same statement, so you get your row\'s id even if other requests insert at the same time.' },
  { type: 'mc', topic: 'crud',
    q: 'How do you write the text value ana@example.com in SQL?',
    choices: ['`"ana@example.com"`', '`\'ana@example.com\'`', '`ana@example.com`', '`(ana@example.com)`'],
    answer: 1,
    why: 'Text values take single quotes. In PostgreSQL, double quotes name a column or table, so `"ana@example.com"` means a column with that odd name and fails.' },
  { type: 'mc', topic: 'crud',
    q: '`DELETE FROM tasks WHERE id = $1` reports `rowCount` 0 for `DELETE /tasks/42`. What should the API answer?',
    choices: ['`204 No Content`', '`200 OK` with an empty body', '`404 Not Found`', '`500 Internal Server Error`'],
    answer: 2,
    why: 'Zero rows changed means there was no task 42 to delete. The model returns false and the controller answers 404; 204 is for a delete that removed the task.' },

  /* joins */
  { type: 'mc', topic: 'joins',
    q: 'dan has no tasks. Does he appear in `SELECT u.email, t.title FROM users u JOIN tasks t ON t.user_id = u.id`?',
    choices: ['Yes, once, with a NULL title', 'Yes, once per task in the table', 'No: an inner join keeps only rows that found a partner', 'Only if he was created first'],
    answer: 2,
    why: 'JOIN (INNER JOIN) drops rows without a match. A LEFT JOIN from users would keep dan with NULL task columns.' },
  { type: 'mc', topic: 'joins',
    q: 'You need every user with their number of tasks, including users with 0. Which query is right?',
    choices: ['`… FROM users u JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.email` with `COUNT(*)`', '`… FROM users u LEFT JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.email` with `COUNT(t.id)`', '`… FROM users u LEFT JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.email` with `COUNT(*)`', '`… FROM tasks GROUP BY user_id` with `COUNT(*)`'],
    answer: 1,
    why: 'LEFT JOIN keeps users with no tasks; COUNT(t.id) skips their NULL padded row and gives 0. COUNT(*) would count that row as 1; the other two never list users without tasks.' },
  { type: 'tf', topic: 'joins',
    q: 'In `users LEFT JOIN tasks`, `COUNT(*)` and `COUNT(t.id)` give the same number for a user who has no tasks.',
    answer: false,
    why: 'The user still gets one padded row: COUNT(*) counts it (1), COUNT(t.id) ignores the NULL (0).' },
  { type: 'mc', topic: 'joins',
    q: 'Which query lists the users who have no tasks?',
    choices: ['`SELECT u.email FROM users u JOIN tasks t ON t.user_id = u.id WHERE t.id IS NULL`', '`SELECT u.email FROM users u LEFT JOIN tasks t ON t.user_id = u.id WHERE t.id IS NULL`', '`SELECT u.email FROM users u LEFT JOIN tasks t ON t.user_id = u.id WHERE t.id = NULL`', '`SELECT email FROM users WHERE tasks = 0`'],
    answer: 1,
    why: 'Only a LEFT JOIN produces the padded rows, and `IS NULL` (never `= NULL`) keeps them. The inner join never has a NULL t.id.' },
  { type: 'mc', topic: 'joins',
    q: 'You want only the users with more than 2 tasks. Where does `COUNT(*) > 2` go?',
    choices: ['In `WHERE`', 'In `HAVING`, after `GROUP BY`', 'In `ON`', 'In `ORDER BY`'],
    answer: 1,
    why: 'WHERE filters rows before grouping, when there is nothing to count yet. HAVING filters the groups after the aggregates are computed.' },
  { type: 'fib', topic: 'joins',
    q: 'To count the tasks of each user you write `SELECT u.email, COUNT(t.id) FROM … ___ u.id, u.email`. Which two words fill the blank?',
    accept: ['GROUP BY', 'group by'],
    why: 'GROUP BY makes one group per user; COUNT then runs once per group.' },
  { type: 'mc', topic: 'joins',
    q: 'PostgreSQL says `column reference "id" is ambiguous` for `SELECT id, title, email FROM tasks t JOIN users u ON u.id = t.user_id`. How do you fix it?',
    choices: ['Rename the `id` columns in the schema', 'Write `t.id` (or `u.id`) to say which table you mean', 'Use `LEFT JOIN`', 'Add `DISTINCT`'],
    answer: 1,
    why: 'Both tables have an `id` column. Prefix it with the alias of the table you want.' },
  { type: 'mc', topic: 'joins',
    q: '`… FROM users u LEFT JOIN tasks t ON t.user_id = u.id WHERE t.done = FALSE` loses the users with no tasks. Why?',
    choices: ['LEFT JOIN cannot be combined with WHERE', 'Their padded row has `t.done` NULL, and NULL is not FALSE, so WHERE drops it', 'FALSE should be written 0', 'The foreign key prevents it'],
    answer: 1,
    why: 'A WHERE condition on the right-hand table removes the padded rows, turning the query into an inner join. Move the condition into ON: `ON t.user_id = u.id AND t.done = FALSE`.' },

  /* schema */
  { type: 'mc', topic: 'schema',
    q: 'Which query gets faster after `CREATE INDEX tasks_user_id_idx ON tasks (user_id)` on a big table?',
    choices: ['`SELECT … FROM tasks WHERE user_id = $1`', '`SELECT … FROM tasks WHERE title = $1`', '`INSERT INTO tasks …`', '`SELECT COUNT(*) FROM users`'],
    answer: 0,
    why: 'An index helps queries that filter, join or sort by its columns. Inserts get slightly slower, since every index must be updated.' },
  { type: 'tf', topic: 'schema',
    q: 'Adding more indexes to a table makes its INSERTs faster.',
    answer: false,
    why: 'Each INSERT must also add an entry to every index, so writes get slower. Indexes speed up reads on the indexed columns.' },
  { type: 'tf', topic: 'schema',
    q: 'In PostgreSQL, a PRIMARY KEY or UNIQUE column gets an index automatically, but a foreign-key column does not.',
    answer: true,
    why: 'The index is how PostgreSQL checks uniqueness quickly. Foreign-key columns are not indexed for you (MySQL\'s InnoDB does index them), so add an index on columns like `tasks.user_id`.' },
  { type: 'mc', topic: 'schema',
    q: 'A teammate added a column to the production database by hand in psql. What is the main problem?',
    choices: ['psql is slower than a migration tool', 'Nothing records the change, so the other databases (laptops, tests) never get it', 'Columns can only be added with Prisma', 'The change is lost when the server restarts'],
    answer: 1,
    why: 'Migrations are numbered scripts in the repository, run in order everywhere. A manual change exists in one database only and the schemas drift apart.' },
  { type: 'mc', topic: 'schema',
    q: 'Migration `003_add_due_date.sql` has already run on every database, and it has a mistake. What do you do?',
    choices: ['Edit 003 and run it again', 'Delete 003 from the repository', 'Write a new migration 004 that fixes it', 'Fix each database by hand'],
    answer: 2,
    why: 'Databases that already ran 003 will never run it again, so edits to it are ignored. A new migration reaches every database in order.' },

  /* node */
  { type: 'fib', topic: 'node',
    q: 'After `BEGIN`, the statement that undoes every change made since then is ___ .',
    accept: ['ROLLBACK', 'rollback', 'ROLLBACK;'],
    why: 'ROLLBACK discards the transaction; COMMIT makes it permanent.' },
  { type: 'mc', topic: 'node',
    q: 'Why is "subtract 50 from account A, add 50 to account B" run inside a transaction?',
    choices: ['To make the two updates faster', 'So that either both happen or neither does, even if the server crashes in between', 'Because UPDATE only works inside BEGIN … COMMIT', 'To lock the whole database'],
    answer: 1,
    why: 'A transaction is all or nothing: without one, a crash after the first update would make 50 disappear.' },
  { type: 'mc', topic: 'node',
    q: 'Which line is vulnerable to SQL injection?',
    choices: ['`pool.query("SELECT * FROM tasks WHERE id = $1", [id])`', '`pool.query("SELECT * FROM tasks WHERE id = " + id)`', '`db.query("SELECT * FROM tasks WHERE id = ?", [id])`', '`pool.query("SELECT * FROM tasks ORDER BY id")`'],
    answer: 1,
    why: '`+` pastes the input into the SQL text (a template literal with `${id}` does exactly the same). The placeholder versions send the value separately, and the last query has no input at all.' },
  { type: 'fib', topic: 'node',
    q: 'With pg you write `$1`; with mysql2 the placeholder for a value is ___ .',
    accept: ['?'],
    why: 'mysql2 uses `?` for each value, in order: `db.query("… WHERE id = ?", [id])`.' },
  { type: 'tf', topic: 'node',
    q: 'Replacing every `\'` in the input with `\'\'` before concatenating it is as safe as using placeholders.',
    answer: false,
    why: 'Hand escaping misses cases (numbers need no quotes: `1 OR 1=1`; encodings; one forgotten route). Placeholders never put the input in the SQL text at all.' },
  { type: 'mc', topic: 'node',
    q: 'The client sends `?sort=title`. How do you put the column in `ORDER BY`?',
    choices: ['`ORDER BY $1` with `[req.query.sort]`', 'Concatenate `req.query.sort` directly', 'Look it up in an allow-list of column names and use the matching one, or a default', 'Wrap it in quotes'],
    answer: 2,
    why: 'Placeholders stand for values, not for column names: `ORDER BY $1` sorts by a constant. Map the input to one of a few known column names in code.' },
  { type: 'mc', topic: 'node',
    q: 'Why does an Express app use a connection pool?',
    choices: ['It encrypts the queries', 'It reuses a few open connections instead of opening (and logging in) one per query', 'It caches query results', 'It lets the app run without a database'],
    answer: 1,
    why: 'Opening a connection is slow and the database accepts a limited number. A pool lends open connections and takes them back.' },
  { type: 'mc', topic: 'node',
    q: 'In the layered architecture, where does the SQL for `GET /tasks/:id` live?',
    choices: ['In the route file', 'In the controller', 'In the model', 'In `server.js`'],
    answer: 2,
    why: 'Routes map URLs to controllers, controllers deal with HTTP, and only the model talks to the database.' },
  { type: 'mc', topic: 'node',
    q: '`tasksModel.findById(999)` finds no row. What should it do?',
    choices: ['Call `res.status(404)`', 'Return `null` and let the controller answer 404', 'Return an empty array', 'Throw an error so Express answers 500'],
    answer: 1,
    why: 'A missing row is a normal result, not a failure. The model returns null; deciding on 404 is the controller\'s job.' },
  { type: 'fib', topic: 'node',
    q: 'With pg, `const result = await pool.query(sql, params)` gives the returned rows in `result.___`.',
    accept: ['rows'],
    why: '`result.rows` is an array of objects keyed by column name; `result.rowCount` says how many rows were returned or changed.' },
  { type: 'tf', topic: 'node',
    q: 'With pg, `SELECT COUNT(*) AS n FROM tasks` gives `rows[0].n` as a JavaScript number.',
    answer: false,
    why: 'COUNT returns a bigint, which pg delivers as a string (`"9"`) to avoid rounding huge values. Convert with `Number()` or `COUNT(*)::int`.' },
  { type: 'mc', topic: 'node',
    q: 'Why map a row with `toDto(row)` instead of sending `res.json(row)`?',
    choices: ['`res.json` cannot send database rows', 'To send only the listed fields in the API\'s shape (camelCase, no `password_hash`)', 'To make the query faster', 'Because JSON cannot contain numbers'],
    answer: 1,
    why: 'The DTO is the API contract: an explicit list of fields, renamed to camelCase, so secrets and internal columns never leak.' },
  { type: 'mc', topic: 'node',
    q: 'In Express 4, an `async` handler does `await tasksModel.findAll()` and the database is down. What must the handler do so the error handler answers?',
    choices: ['Nothing: Express 4 catches rejected promises', 'Wrap the call in `try/catch` and call `next(err)`', 'Call `process.exit()`', 'Return `res.json(err)`'],
    answer: 1,
    why: 'Express 4 does not see rejected promises from async handlers; you pass the error on with `next(err)`. Express 5 forwards them automatically.' },
];
