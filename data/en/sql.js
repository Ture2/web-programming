'use strict';
/* Relational databases: concept cards, rail groups and self-check quiz (SQL, with PostgreSQL as the
   worked example and MySQL / SQLite differences noted). See site/README.md for the data contract.
   `hub` and `topic` keys match SQL_GROUPS and SQL_QUIZ_TOPICS. */

DATA.en.SQL_QUIZ_TOPICS = {
  model: 'Tables, keys and relationships',
  crud: 'Reading and changing rows',
  joins: 'Joins and aggregates',
  schema: 'Indexes, migrations and transactions',
  node: 'From Node to SQL',
};

DATA.en.SQL_GROUPS = [
  { key: 'model', label: 'Tables and keys', icon: 'table' },
  { key: 'crud', label: 'Reading and changing rows', icon: 'code' },
  { key: 'joins', label: 'Joins and aggregates', icon: 'link' },
  { key: 'schema', label: 'Indexes, migrations, transactions', icon: 'levels' },
  { key: 'node', label: 'From Node to SQL', icon: 'server' },
];

DATA.en.SQL_CONCEPTS = [
  /* ---- 1. Tables and keys --------------------------------------------------------- */
  { id: 'why-database', hub: 'model', topic: 'model', 
    title: 'Why a database?',
    summary: 'A **database** is a separate program that stores the application\'s data on disk, lets many requests read and change it safely at the same time, and answers questions about it in a query language.',
    body: [
      'Picture a first version of a Tasks API that keeps its tasks in a JavaScript array inside the server process. That array lives in the process\'s memory, like notes on a whiteboard in a room: when the server stops (a crash, a deploy, `node --watch` restarting after you save), the room is cleaned and every task is gone. A database is the filing cabinet in the next room: the server writes to it and reads from it, and the papers survive whatever happens to the server.',
      'A database solves three problems an array cannot. **Persistence**: the data is written to disk and survives restarts. **Concurrency**: two requests that change the same data at the same moment, or two copies of your server running side by side, see one consistent version, because the database orders and isolates the changes. **Querying**: you describe *what* you want ("the open tasks of user 3, newest first, 10 per page") and the database works out *how* to find it quickly, even among millions of rows.',
      'A **relational database** (PostgreSQL, MySQL, SQLite…) stores data in tables and checks rules you declare, such as "every task belongs to a user that exists". You talk to it in **SQL** (Structured Query Language). The server and the database are two separate programs, usually on different machines, so the server sends SQL over the network and gets rows back: see [Connecting from Node](#/database/relational/drivers-pools).',
    ],
    points: [
      '**Persistence**: data on disk, not in the server\'s memory.',
      '**Concurrency**: many requests and many server copies share one consistent store.',
      '**Querying**: SQL says *what* you want; the database finds it.',
      '**Integrity**: the database itself refuses data that breaks the declared rules.',
    ],
    example: 'With the array: you `POST /tasks` three times, edit `app.js`, `node --watch` restarts, and `GET /tasks` returns `[]`. With PostgreSQL behind the same routes, the restart changes nothing: `GET /tasks` runs `SELECT … FROM tasks` and the three rows are still there. Run two copies of the server (on ports 3000 and 3001) and both see the same tasks, which two separate arrays never could.',
    mistake: 'Thinking a database is "just a bigger array" that you load whole into memory and filter in JavaScript (`(await getAllTasks()).filter(…)`). That throws away the point: let the database filter, sort, count and page (`WHERE`, `ORDER BY`, `COUNT`, `LIMIT`) and send back only the rows the request needs.' },

  { id: 'tables-types', hub: 'model', topic: 'model', 
    title: 'Tables, rows, columns and types',
    summary: 'A **table** stores one kind of thing; each **row** is one item and each **column** is one property with a fixed **data type**. The set of tables, columns, types and rules is the **schema**.',
    body: [
      'Think of a spreadsheet with strict rules. The sheet is the **table** (`tasks`), every line is a **row** (one task) and every column has a name and a type (`title` is text, `done` is a boolean). Unlike a spreadsheet, the database refuses a row that does not fit: you cannot put "yes" in an integer column, and every row has exactly the same columns.',
      'You create a table with `CREATE TABLE`, listing each column with its type and its rules (**constraints**, next cards). This description of the data, written before any data exists, is the **schema**. Each column\'s type decides what can be stored, how it is compared and sorted, and how much space it takes.',
      'Types differ a little between databases; the table below shows the ones you need. The examples here are written for **PostgreSQL**. If you use MySQL instead, three things in a schema like the one below change: `SERIAL` becomes `INT AUTO_INCREMENT`; a `UNIQUE` text column must be `VARCHAR(255)`, because MySQL cannot index an unbounded `TEXT` column; and the foreign key is safest as its own line, `FOREIGN KEY (user_id) REFERENCES users(id)`, because some MySQL versions silently ignore a `REFERENCES` written inside the column definition.',
    ],
    table: {
      caption: 'Common column types',
      head: ['Kind of data', 'PostgreSQL', 'MySQL', 'Use it for'],
      rows: [
        ['Whole number', '`INTEGER`, `BIGINT`', '`INT`, `BIGINT`', 'counts, ids, foreign keys'],
        ['Auto-numbered id', '`SERIAL` or `INTEGER GENERATED ALWAYS AS IDENTITY`', '`INT AUTO_INCREMENT`', 'the primary key'],
        ['Text', '`TEXT`, `VARCHAR(n)`', '`VARCHAR(n)`, `TEXT`', 'titles, emails, names'],
        ['True / false', '`BOOLEAN`', '`BOOLEAN` (stored as `TINYINT(1)`)', 'flags such as `done`'],
        ['Exact decimal', '`NUMERIC(10,2)`', '`DECIMAL(10,2)`', 'money: never a float'],
        ['Date / date and time', '`DATE`, `TIMESTAMP`', '`DATE`, `DATETIME`', 'due dates, `created_at`'],
      ],
    },
    code: `CREATE TABLE tasks (
  id       SERIAL PRIMARY KEY,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  done     BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE              -- may be empty (NULL): not every task has one
);`,
    dialect: 'SQL (PostgreSQL)',
    example: 'The row `(7, 3, \'Draft project plan\', FALSE, \'2026-10-12\')` fits the table above: an id, the id of its owner, a title, a boolean and a date. `INSERT INTO tasks (title, done) VALUES (\'Study\', \'maybe\')` is refused twice: `\'maybe\'` is not a boolean, and `user_id` is missing although it is `NOT NULL`.',
    mistake: 'Storing everything as text "to keep it simple": dates as `\'06/10/2026\'`, prices as `\'12,50\'`, flags as `\'yes\'`. The database can then no longer sort dates correctly (`\'10/01\'` sorts before `\'9/30\'`), add prices or check that a flag is really a flag. Pick the type that matches the meaning.' },

  { id: 'primary-keys', hub: 'model', topic: 'model', 
    title: 'Primary keys',
    summary: 'A **primary key** is the column (or set of columns) whose value identifies exactly one row: it can never be empty (`NULL`) and never repeat.',
    body: [
      'A primary key works like a student ID number. Two students may share a name, an email can change, but the ID is unique, never empty and never reused for someone else. The API puts it in the URL (`/tasks/7`) and the database finds row 7 in a moment because a primary key is always **indexed** (see the indexes card).',
      'Most tables use a **surrogate key**: a number with no meaning outside the database, generated automatically. In PostgreSQL, `SERIAL` (or the newer standard `GENERATED ALWAYS AS IDENTITY`) hands out 1, 2, 3… as rows are inserted; MySQL uses `AUTO_INCREMENT`. Some APIs use a **UUID** instead (a random 128-bit value such as `3f2b…`), so ids cannot be guessed and can be created outside the database.',
      '`PRIMARY KEY` means `NOT NULL` + `UNIQUE` + "this is the row\'s identity". A primary key can also combine two columns: in a join table such as `task_tags`, `PRIMARY KEY (task_id, tag_id)` allows each pair only once.',
    ],
    code: `CREATE TABLE users (
  id    SERIAL PRIMARY KEY,         -- 1, 2, 3… chosen by the database
  email TEXT NOT NULL UNIQUE
);

INSERT INTO users (email) VALUES ('ana@example.com')
RETURNING id;                       -- → 1`,
    dialect: 'SQL (PostgreSQL)',
    example: 'The API receives `POST /tasks` with `{ "title": "Study" }` and **does not** send an id: the database picks the next one (say 10) and `RETURNING id` reports it, so the server can answer `201 Created` with `Location: /tasks/10`. If ana later changes her email, `users.id` stays 1 and every task that points to her still works.',
    mistake: 'Using a value that can change or repeat as the key, such as the email or the task title, or computing the next id in JavaScript (`tasks.length + 1`, as an in-memory array version often does). Two requests arriving together would get the same number. Let the database generate ids.' },

  { id: 'foreign-keys', hub: 'model', topic: 'model', 
    title: 'Foreign keys',
    summary: 'A **foreign key** is a column that stores the primary key of a row in another table (`tasks.user_id` → `users.id`); the database then refuses any value that points to a row that does not exist.',
    body: [
      'A foreign key is a reference number that must lead somewhere, like the order number on a parcel that must match a real order. `user_id INT NOT NULL REFERENCES users(id)` says "every task belongs to an existing user". The database checks it on every insert and update, whatever program writes the data, and that check is the main reason to keep related data in a relational database.',
      'The rule also works the other way: what should happen to the tasks when their user is deleted? By default the database **refuses** to delete a user who still has tasks. You choose another behaviour with `ON DELETE`: **`CASCADE`** deletes the tasks too (the choice in the sample Tasks database: a task cannot exist without its owner), **`SET NULL`** keeps them with an empty owner (the column must then allow NULL), **`RESTRICT`** refuses, like the default.',
      'Foreign keys are why the data stays consistent even when your code has a bug: an application-only check ("look the user up first, then insert") can be skipped by another route, a script or a second request deleting the user in between.',
    ],
    code: `CREATE TABLE tasks (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT NOT NULL
);

INSERT INTO tasks (user_id, title) VALUES (99, 'Ghost task');
-- ERROR: insert or update on table "tasks" violates foreign key constraint
DELETE FROM users WHERE id = 2;   -- also deletes every task with user_id = 2`,
    dialect: 'SQL (PostgreSQL)',
    example: 'In the sample database ben (user 2) owns three tasks. `DELETE FROM users WHERE id = 2` removes ben **and** tasks 5, 6 and 9, because of `ON DELETE CASCADE`; their rows in `task_tags` go too, since that table cascades from `tasks`. Try the "ON DELETE CASCADE" example in the SQL runner.',
    mistake: 'Thinking `REFERENCES` is only documentation, or that the database "joins the tables for you". A foreign key is a **rule** checked on every change; reading the related rows together is a separate step that you write with `JOIN`.' },

  { id: 'relationships', hub: 'model', topic: 'model', 
    title: 'One-to-many and many-to-many',
    summary: 'In a **one-to-many** relationship the foreign key goes in the table on the "many" side; a **many-to-many** relationship needs a third **join table** that holds pairs of foreign keys.',
    body: [
      'Ask the question in both directions. "How many tasks can one user have?" Many. "How many users can one task have?" One. That is **one-to-many**, and the foreign key goes on the many side: each task stores its `user_id`. A user cannot store a list of task ids, because a column holds one value.',
      'Now tags: one task can have several tags, and one tag (`urgent`) is on many tasks. That is **many-to-many**, and neither table can hold the reference. The answer is a **join table** (also called a junction or link table) where each row is one pair: `task_tags (task_id, tag_id)`, both foreign keys, with the pair as the primary key so it cannot repeat.',
      'A **one-to-one** relationship (a user and their profile) is a foreign key that is also `UNIQUE`. In practice one-to-many covers most of an API; you meet many-to-many for tags, team members, enrolments or likes.',
    ],
    code: `CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE task_tags (
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)      -- each pair at most once
);
-- task 7 has the tags 1 (urgent) and 3 (planning):
INSERT INTO task_tags (task_id, tag_id) VALUES (7, 1), (7, 3);`,
    dialect: 'SQL (PostgreSQL)',
    example: 'In the sample database, the rows `(7, 1)` and `(7, 3)` of `task_tags` say "task 7 is tagged urgent and planning", and `(1, 1)`, `(7, 1)` and `(9, 1)` say "urgent is on tasks 1, 7 and 9". To list a task\'s tags you join three tables (`tasks` → `task_tags` → `tags`): challenge "Tasks tagged urgent" in the SQL runner.',
    mistake: 'Storing a list inside one column, such as `tags TEXT` with `\'urgent,study\'`. You can no longer check that each tag exists, rename a tag in one place, or find "all urgent tasks" without slow and fragile text matching (`LIKE \'%urgent%\'` also matches `not-urgent`). One fact per row: that is what the join table does.' },

  { id: 'constraints', hub: 'model', topic: 'model', 
    title: 'Constraints: NOT NULL, UNIQUE, CHECK, DEFAULT',
    summary: '**Constraints** are rules written in the schema that the database enforces on every change: `NOT NULL` (a value is required), `UNIQUE` (no duplicates), `CHECK` (a condition must hold) and `DEFAULT` (the value used when none is given).',
    body: [
      'Constraints are the bouncer at the door of the table: every insert and update must pass them, whichever route, script or colleague sends it. [Validation](#/server/auth/validation) in your server code gives the user friendly messages; constraints are the last line of defence that keeps the data correct even when that code has a bug. Use both.',
      '**`NOT NULL`**: the column must have a value (`title`, `email`). **`UNIQUE`**: no two rows may share the value (two accounts with the same email are refused). **`CHECK (condition)`**: any rule about the row, such as `CHECK (title <> \'\')` or `CHECK (price >= 0)`. **`DEFAULT value`**: what is stored when the `INSERT` leaves the column out (`done BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMP NOT NULL DEFAULT NOW()`).',
      'When a constraint refuses a change, the driver throws an error with a code your controller can turn into the right status: in PostgreSQL `23505` is a unique violation (answer `409 Conflict`: "email already registered"), `23503` a foreign-key violation and `23502` a missing required value (both usually `400` / `422`).',
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
    body: [
      'A `SELECT` is a precise order to a librarian: "from the `tasks` shelf, bring me the `id` and `title` of the tasks where `done` is false, sorted by `id`". You say **what** you want, never **how** to search: the database decides how to find the rows quickly.',
      'The clauses always come in the same order: `SELECT columns` → `FROM table` → `WHERE condition` → `ORDER BY column [ASC | DESC]` → `LIMIT n`. Conditions use `=`, `<>` (not equal), `<`, `>=`, `AND`, `OR`, `NOT`, `IN (…)`, `BETWEEN … AND …` and `LIKE \'%text%\'` (`%` matches any characters). Text and dates go in **single quotes**: `\'ana@example.com\'`.',
      'The database works through the clauses in a different order from how you write them: first `FROM` (which rows exist), then `WHERE` (keep some), then `SELECT` (which columns), then `ORDER BY`, then `LIMIT`. That is why a column alias defined in `SELECT` can be used in `ORDER BY` but not in `WHERE`.',
    ],
    code: `SELECT id, title, due_date
FROM tasks
WHERE done = FALSE AND user_id = 1
ORDER BY id;

SELECT id, title FROM tasks WHERE title LIKE '%SQL%';
SELECT email FROM users WHERE id IN (1, 3);`,
    dialect: 'SQL',
    example: 'On the sample data, the first query returns tasks 1, 3 and 4 of ana (task 2 is done). Read it from the inside out: `FROM tasks` (9 rows) → `WHERE done = FALSE AND user_id = 1` (3 rows) → `SELECT id, title, due_date` (3 columns) → `ORDER BY id`. Load it in the runner below and change the `WHERE` to see the result change.',
    mistake: 'Writing `SELECT *` in application code. It returns every column, including ones you add later (a `password_hash`, say), and the API may send them to the client. In a model, name the columns you need: `SELECT id, title, done FROM tasks`.',
    widget: 'sql-runner' },

  { id: 'crud-sql', hub: 'crud', topic: 'crud', 
    title: 'INSERT, UPDATE, DELETE: CRUD in SQL',
    summary: 'The four CRUD operations of an API map onto four SQL statements: **C**reate → `INSERT`, **R**ead → `SELECT`, **U**pdate → `UPDATE`, **D**elete → `DELETE`.',
    body: [
      'Each route of a Tasks REST API becomes one SQL statement, and the result of that statement decides the response. If the statement touched no row (the id does not exist), the controller answers `404`; if it worked, `200`, `201` or `204`.',
      '`INSERT INTO table (columns) VALUES (values)` adds a row; columns you leave out take their `DEFAULT` (or NULL). `UPDATE table SET column = value, … WHERE condition` changes the rows that match. `DELETE FROM table WHERE condition` removes them. PostgreSQL and SQLite add **`RETURNING columns`** to all three, which hands back the rows as stored: the new id after an `INSERT`, the new values after an `UPDATE`. (MySQL has no `RETURNING`; mysql2 gives you `insertId` and `affectedRows` instead.)',
      'The driver also reports how many rows each statement changed (`rowCount` in pg). That number is how a model tells "updated" from "no such task".',
    ],
    table: {
      caption: 'From route to SQL to status code (Tasks API)',
      head: ['Route', 'SQL', 'Response'],
      rows: [
        ['`POST /tasks`', '`INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, done`', '`201` + the new task'],
        ['`GET /tasks`', '`SELECT … FROM tasks ORDER BY id`', '`200` + an array (maybe empty)'],
        ['`GET /tasks/:id`', '`SELECT … FROM tasks WHERE id = $1`', '`200`, or `404` if no row'],
        ['`PATCH /tasks/:id`', '`UPDATE tasks SET … WHERE id = $1 RETURNING id, user_id, title, done`', '`200`, or `404` if 0 rows changed'],
        ['`DELETE /tasks/:id`', '`DELETE FROM tasks WHERE id = $1`', '`204`, or `404` if 0 rows changed'],
      ],
    },
    code: `INSERT INTO tasks (user_id, title)
VALUES (3, 'Write tests')
RETURNING id, user_id, title, done;      -- → 10 | 3 | Write tests | false

UPDATE tasks SET done = TRUE WHERE id = 10
RETURNING id, done;                       -- → 10 | true   (1 row changed)

DELETE FROM tasks WHERE id = 10;          -- 1 row changed
DELETE FROM tasks WHERE id = 10;          -- 0 rows changed → the API answers 404`,
    dialect: 'SQL (PostgreSQL)',
    example: '`PATCH /tasks/5` with `{ "done": true }` runs `UPDATE tasks SET done = TRUE WHERE id = 5 RETURNING id, title, done`: one row changes and comes back, so the controller sends `200` with it. `PATCH /tasks/999` runs the same statement, zero rows change, `rows` is empty, and the controller sends `404`.',
    mistake: 'Running `SELECT` after `INSERT` to "find the row I just added", for example by taking the highest id. Another request may have inserted a row in between, so you would return someone else\'s task. `RETURNING` (or `insertId` in MySQL) gives you exactly your row from the same statement.',
    practice: { href: '#/database/relational/practice/sql-runner', label: 'Try INSERT … RETURNING in the SQL runner' } },

  { id: 'update-delete-where', hub: 'crud', topic: 'crud', 
    title: 'UPDATE and DELETE need a WHERE',
    summary: '`UPDATE` and `DELETE` act on **every row that matches the WHERE**; with no `WHERE` at all they change or delete the whole table, and there is no undo.',
    body: [
      'An `UPDATE` without `WHERE` is a mail merge sent to the whole address book instead of one person. SQL does exactly what you wrote: `UPDATE tasks SET done = TRUE` marks **every** task done, for every user, and `DELETE FROM tasks` empties the table. The database does not ask "are you sure?", and once the change is committed it cannot be taken back (only a backup can restore it).',
      'Three habits make it safe. **Write the `WHERE` first**, then the rest. **Preview** the rows with a `SELECT` using the same `WHERE` before you change them. **Check the count**: the driver says how many rows changed (`rowCount`); `UPDATE … WHERE id = $1` must change 0 or 1 row. For risky manual changes, wrap them in a transaction and `ROLLBACK` if the count is wrong (see the transactions card).',
      'In a model the `WHERE` always targets the key: `WHERE id = $1`, and when tasks belong to users ([ownership checks](#/server/auth/ownership-checks)), `WHERE id = $1 AND user_id = $2`, so one user can never change another user\'s task.',
    ],
    code: `-- 1. preview: which rows would change?
SELECT id, title FROM tasks WHERE user_id = 2 AND done = TRUE;
-- 2. change exactly those
DELETE FROM tasks WHERE user_id = 2 AND done = TRUE;   -- 1 row changed

-- The accident:
UPDATE tasks SET done = TRUE;      -- 9 rows changed: every task is now done`,
    dialect: 'SQL',
    example: 'The preview shows one row (task 6, "Review pull request"), so the `DELETE` with the same `WHERE` reports "1 row changed": the count you expected. Load "UPDATE without WHERE" in the SQL runner to see the accident: the runner warns you, and because every run starts from a fresh copy, nothing is really lost there.',
    mistake: 'Believing a narrow-looking condition is narrow. `DELETE FROM tasks WHERE title LIKE \'%test%\'` also deletes "Contest entry" and "Latest notes". Preview with `SELECT` and read the count before changing anything that is not selected by its key.' },

  { id: 'null-semantics', hub: 'crud', topic: 'crud', 
    title: 'NULL: the missing value',
    summary: '`NULL` means "no value / unknown". It is not `0`, not `\'\'` and not `false`; any comparison with NULL is itself unknown, so you test for it with `IS NULL` and `IS NOT NULL`.',
    body: [
      'Picture a form where a field was left blank: NULL is the blank, not the word "nothing" and not zero. Ask "is the blank equal to 2026-10-06?" and the honest answer is "unknown". SQL works exactly like that: `due_date = \'2026-10-06\'`, `due_date <> \'2026-10-06\'` and even `due_date = NULL` all give **unknown** when `due_date` is NULL, and `WHERE` keeps only rows whose condition is **true**. So `WHERE due_date = NULL` returns nothing, ever.',
      'Use `IS NULL` / `IS NOT NULL` to test it, and **`COALESCE(a, b, …)`** to replace it: it returns the first argument that is not NULL, as in `COALESCE(due_date, \'no date\')`. Aggregates skip NULLs: `COUNT(due_date)` counts only the tasks that have a date, while `COUNT(*)` counts rows.',
      'A typical model `update` uses `COALESCE` to mean "keep the old value when the client did not send one": `SET done = COALESCE($3, done)`. The model passes `fields.done ?? null`, so a missing field becomes NULL (keep), while `false` stays `false` (change). In JavaScript, pg turns SQL NULL into `null`.',
    ],
    code: `SELECT id FROM tasks WHERE due_date = NULL;      -- always 0 rows
SELECT id FROM tasks WHERE due_date IS NULL;     -- the tasks with no date
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
    body: [
      'An API never returns a million rows at once: it returns pages, like a search engine. `LIMIT 10 OFFSET 20` means "skip 20 rows, then give me 10": page 3 of 10. The client asks with a query string, `GET /tasks?limit=10&offset=20`, and the model passes both numbers as parameters.',
      'Without `ORDER BY`, a database may return rows in **any** order, and the order can change between two queries (after an update, or when it picks a different plan). Page 2 could then repeat a row from page 1 and skip another. Always sort, and make the order unique: if you sort by `due_date`, add `id` as a tie-breaker (`ORDER BY due_date, id`), because many tasks share a date.',
      'The server must also cap `limit` (for example at 100), or a client can ask for `?limit=1000000` and get everything anyway: see [Pagination limits as protection](#/server/auth/pagination-limits). MySQL accepts the same `LIMIT 10 OFFSET 20` (and the older `LIMIT 20, 10`). For very deep pages, `OFFSET` gets slow because the database still reads the skipped rows; large sites then use "keyset" pagination (`WHERE id > last_seen_id`), which you do not need here.',
    ],
    code: `-- page 1, 2, 3 of 4 tasks each
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 0;   -- ids 1–4
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 4;   -- ids 5–8
SELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 8;   -- id 9

-- the model, with parameters (pg)
SELECT id, user_id, title, done FROM tasks
WHERE user_id = $1
ORDER BY id
LIMIT $2 OFFSET $3;`,
    dialect: 'SQL',
    example: '`GET /tasks?limit=4&offset=4` → the model runs `… ORDER BY id LIMIT $1 OFFSET $2` with `[4, 4]` and returns tasks 5, 6, 7 and 8. With `offset=8` it returns only task 9: a short page tells the client it reached the end. A quick test of any paginated endpoint works the same way: two offsets must give two different sets of rows.',
    mistake: 'Computing the offset from the page number as `page × size`. Pages are usually numbered from 1, so page 1 must skip 0 rows: `offset = (page − 1) × size`. With `page × size`, the first page is never shown.',
    practice: { href: '#/database/relational/practice/sql-runner', label: 'Solve “Page 2 of the list” in the SQL runner' } },

  /* ---- 3. Joins and aggregates ------------------------------------------------------- */
  { id: 'inner-join', hub: 'joins', topic: 'joins', 
    title: 'JOIN: combining tables',
    summary: 'A `JOIN` builds one result from two tables by pairing the rows that satisfy the `ON` condition, usually "foreign key = primary key"; an **inner** join (plain `JOIN`) keeps only the rows that found a partner.',
    body: [
      'Picture two piles of cards: tasks, each with a `user_id`, and users, each with an `id`. `JOIN users u ON u.id = t.user_id` staples each task card to the user card whose id matches. The result row has the columns of both, so you can show the task\'s title next to its owner\'s email. A task whose owner does not exist (impossible here, thanks to the foreign key) or a user with no tasks has nothing stapled to it and is left out: that is what **inner** means.',
      'The short names after the tables (`tasks t`, `users u`) are **aliases**: nicknames that save typing and say which table a column comes from (`t.title`, `u.email`). When both tables have a column with the same name, such as `id`, you **must** prefix it, or the database cannot know which one you mean ("column reference id is ambiguous").',
      'You can chain joins: `tasks` → `task_tags` → `tags` follows a many-to-many relationship through its join table. After the joins, `WHERE`, `ORDER BY` and `LIMIT` work on the combined rows as on any table.',
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
    example: 'The first query pairs 9 tasks with their owners (9 combined rows), keeps ana\'s 3 open ones and sorts them newest first: tasks 4, 3 and 1, each with `ana@example.com`. dan, who owns no tasks, appears in no combined row, so a `JOIN` can never list him: that needs a `LEFT JOIN` (next card).',
    mistake: 'Forgetting the `ON` condition, or writing `FROM tasks, users` with no condition. Every task is then paired with **every** user (9 × 4 = 36 rows of nonsense), a "cross join". If a join returns far more rows than either table has, check the `ON`.' },

  { id: 'left-join', hub: 'joins', topic: 'joins', 
    title: 'LEFT JOIN: keeping rows without a match',
    summary: 'A `LEFT JOIN` keeps **every** row of the table on its left; when a row has no partner on the right, the right-hand columns are filled with NULL.',
    body: [
      'A `LEFT JOIN` is the class register: every student is listed, and the "homework handed in" column is blank for those who handed in nothing. `FROM users u LEFT JOIN tasks t ON t.user_id = u.id` lists every user; a user with three tasks gives three rows, and dan, with none, gives **one** row whose task columns are all NULL.',
      'That NULL row is useful twice. To find "users with no tasks", keep only the padded rows: `WHERE t.id IS NULL` (the task\'s primary key can only be NULL in a padded row). To count tasks per user with zeros, count a column of the right table: `COUNT(t.id)` skips the NULL and gives dan 0. `COUNT(*)` would count his padded row and give 1.',
      'Conditions on the right-hand table belong in the `ON`, not in the `WHERE`, if you want to keep the unmatched rows. `WHERE t.done = FALSE` throws away dan\'s padded row (NULL is not FALSE), which silently turns the query back into an inner join.',
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
    example: 'On the sample data the first query gives ana 4, ben 3, cleo 2 and dan 0; the second returns only `dan@example.com`. This "count per parent, zeros included" report is the classic reason to reach for `LEFT JOIN`. The SQL runner below opens on its challenges: try "Users with no tasks" and "Tasks per user, zeros included".',
    mistake: 'Using `COUNT(*)` with a `LEFT JOIN` to count children. The padded row is still a row, so a user with no tasks is reported with 1 task. Count a column of the right-hand table, such as `COUNT(t.id)`.',
    widget: 'sql-runner' },

  { id: 'aggregates', hub: 'joins', topic: 'joins', 
    title: 'COUNT and GROUP BY',
    summary: '**Aggregate functions** (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) turn many rows into one value; `GROUP BY` makes one group per distinct value and computes the aggregates once per group; `HAVING` filters the groups.',
    body: [
      'Think of sorting exam papers into piles, one pile per class, then writing on each pile how many papers it has. `GROUP BY u.id, u.email` makes the piles (one per user) and `COUNT(*)` writes the number. Without `GROUP BY`, an aggregate treats the whole table as one pile: `SELECT COUNT(*) FROM tasks` gives one row, 9.',
      'The rule that keeps results meaningful: every column in `SELECT` must either be in the `GROUP BY` or be inside an aggregate. A pile has one class name but many student names, so "the student name of the pile" makes no sense. PostgreSQL (and MySQL by default) refuse such a query, with one exception: once you group by a table\'s primary key, you may select that table\'s other columns. SQLite, used by the runner, quietly picks any row, so write it correctly anyway.',
      '`WHERE` filters **rows before** grouping ("only open tasks"); `HAVING` filters **groups after** counting ("only users with more than one"). An aggregate cannot go in `WHERE`, because the groups do not exist yet at that point.',
    ],
    code: `-- open tasks per user, busiest first, only users with 2 or more
SELECT u.email, COUNT(*) AS open_tasks
FROM tasks t
JOIN users u ON u.id = t.user_id
WHERE t.done = FALSE          -- rows: keep the open tasks
GROUP BY u.id, u.email        -- one group per user
HAVING COUNT(*) >= 2          -- groups: keep the busy users
ORDER BY open_tasks DESC;`,
    dialect: 'SQL',
    example: 'Step by step on the sample data: 9 tasks → `WHERE` keeps the 6 open ones → `GROUP BY` makes ana (3), ben (2) and cleo (1) → `HAVING COUNT(*) >= 2` drops cleo → result: `ana@example.com 3`, `ben@example.com 2`. "Who has the most open tasks?" is the same query with `LIMIT 1` instead of `HAVING` (with a tie, `LIMIT 1` silently hides the other users).',
    mistake: 'Expecting a number from pg to arrive as a JavaScript number. `COUNT(*)` returns a `bigint`, and pg sends `bigint` to JavaScript as a **string** (`"3"`) so huge values are not rounded. Convert it in the model (`Number(row.open_tasks)`) or in SQL (`COUNT(*)::int`) before it reaches the JSON.' },

  /* ---- 4. Indexes, migrations, transactions ----------------------------------------- */
  { id: 'indexes', hub: 'schema', topic: 'schema', 
    title: 'Indexes: finding rows fast',
    summary: 'An **index** is an extra sorted structure over one or more columns that lets the database jump to the matching rows instead of reading the whole table; it speeds up reads on those columns and slows writes a little.',
    body: [
      'An index is the index at the back of a textbook: to find "foreign key" you look it up alphabetically and jump to page 87, instead of reading every page. Without an index, `WHERE user_id = 2` makes the database read every row of `tasks` (a **scan**); with one, it looks up 2 in a sorted tree (a B-tree) and goes straight to those rows (a **search**). With 9 rows you cannot tell the difference; with 10 million you can.',
      'The database creates some indexes for you: every **primary key** and every **`UNIQUE`** column gets one (that is how it checks for duplicates quickly). PostgreSQL does **not** index foreign-key columns automatically (MySQL does), so index the columns your queries filter, join or sort by, such as `tasks.user_id` for `findByOwner`.',
      'Indexes are not free: each one takes disk space, and every `INSERT`, `UPDATE` and `DELETE` must update every index of the table. Add an index for a query that is slow and frequent, not "on every column just in case". `EXPLAIN` (PostgreSQL) or `EXPLAIN QUERY PLAN` (SQLite) shows whether a query uses an index.',
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
    summary: 'A **migration** is a numbered script that changes the schema one step (create a table, add a column); the scripts live in the repository and a tool runs, in order, the ones a database has not run yet.',
    body: [
      'Migrations are Git for the shape of the database. Your code expects a certain schema; when you change the code (tasks get a due date), the schema must change too, on your laptop, your teammate\'s laptop, the test server and production. Doing it by hand ("I ran an `ALTER TABLE` in psql last week") means someone always forgets. Instead, each change is a file: `001_create_users.sql`, `002_create_tasks.sql`, `003_add_due_date_to_tasks.sql`.',
      'A migration tool (Knex, Prisma Migrate, Sequelize CLI, or a small script) keeps a table in the database listing which migrations already ran. Running "migrate" applies only the missing ones, in number order. A new teammate clones the repository, runs one command and gets exactly the schema the code expects.',
      'Golden rule: **never edit a migration that has already run** somewhere else. Their database will not run it again, so your fix never reaches it. Write a new migration that corrects the old one. Many tools also let each migration have a "down" part that undoes it, for rolling back a bad deploy.',
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

  { id: 'transactions', hub: 'schema', topic: 'schema', 
    title: 'Transactions: all or nothing',
    summary: 'A **transaction** groups several statements so that they all take effect (`COMMIT`) or none does (`ROLLBACK`); other requests never see the half-finished state.',
    body: [
      'A bank transfer is two updates: take 50 from Ana\'s account, add 50 to Ben\'s. If the server crashes between them, 50 euros vanish. Wrapped in a transaction, the two updates are one unit: `BEGIN` starts it, and either `COMMIT` makes both permanent or `ROLLBACK` (or a crash) undoes both. Until the commit, other connections keep seeing the old balances.',
      'Every single statement is already a small transaction: a `DELETE` that fails halfway deletes nothing. You need `BEGIN … COMMIT` when **one request** makes **several** changes that only make sense together: creating an order and its order lines, moving a task to another project and updating two counters.',
      'With a pg pool there is a trap: `pool.query()` may run each call on a different connection, so `BEGIN` on one and `UPDATE` on another are not in the same transaction. Take one client from the pool for the whole transaction, and always give it back.',
    ],
    code: `const client = await pool.connect();          // one connection for the whole unit
try {
  await client.query("BEGIN");
  await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [50, fromId]);
  await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [50, toId]);
  await client.query("COMMIT");                 // both, or…
} catch (err) {
  await client.query("ROLLBACK");               // …neither
  throw err;
} finally {
  client.release();                             // back to the pool, always
}`,
    dialect: 'JavaScript (Node, pg)',
    example: 'In the SQL runner, the "Transaction" example runs `BEGIN`, marks all of ana\'s tasks done, shows them done, then `ROLLBACK`s: the last `SELECT` shows them open again, as if the update never happened. Replace `ROLLBACK` with `COMMIT` and the change stays.',
    mistake: 'Writing `await pool.query("BEGIN")` and then more `pool.query` calls. Each call may borrow a different connection from the pool, so the statements are not inside your transaction, and `ROLLBACK` undoes nothing. Use `pool.connect()` and one `client` from `BEGIN` to `COMMIT`.' },

  /* ---- 5. From Node to SQL ---------------------------------------------------------- */
  { id: 'layered-architecture', hub: 'node', topic: 'node', 
    title: 'Routes → controllers → models → database',
    summary: 'The API is split into layers with one job each: **routes** map a method and URL to a function, **controllers** read the request and choose the response, **models** run the SQL and return plain data, and the **database** stores it.',
    body: [
      'A restaurant again. The menu (routes) says which dish each order means. The waiter (controller) takes the order, checks it makes sense, asks the kitchen and brings back the plate with the right words ("sorry, sold out" is a `404`). The kitchen (model) knows the storeroom (database) and prepares the food, but never talks to customers. Each layer only talks to its neighbour.',
      'That split pays off as soon as the storage changes: when the first version of the API kept its data in an array, moving it to a database changes only the **model**, which now runs SQL. The routes and the controller\'s function names stay the same; each handler line changes from `tasks.find(…)` to `await tasksModel.findById(id)`. Moving from PostgreSQL to a [document database](#/database/documents) such as MongoDB would again change only the models.',
      'Keep the boundaries clean. The model never sees `req` or `res` and never chooses a status code: it returns data (a row, an array, `null`, `true`/`false`) or throws. The controller never writes SQL. Raw database rows stop at the model, which hands the controller plain objects in the shape the API promises (the rows-to-JSON card).',
    ],
    table: {
      caption: 'Who does what in the Tasks API',
      head: ['Layer', 'File (typical layout)', 'Its job', 'Never'],
      rows: [
        ['Routes', '`src/routes/tasks.js`', '`router.get("/:id", controller.getTask)`', 'contain logic'],
        ['Controller', '`src/controllers/tasksController.js`', 'read `req`, validate, call the model, choose status + JSON', 'write SQL'],
        ['Model', '`src/models/tasksModel.js`', 'run parameterised SQL, return plain objects or `null`', 'touch `req` / `res`'],
        ['Database', 'PostgreSQL / MySQL', 'store rows, enforce constraints', '—'],
      ],
    },
    code: `// controller, array version                  // controller, model version
const task = tasks.find((t) => t.id === id);   const task = await tasksModel.findById(id);
if (!task) return res.status(404).json(…);     if (!task) return res.status(404).json(…);
res.json(task);                                 res.json(task);`,
    dialect: 'JavaScript (Express)',
    example: '`GET /tasks/7`: the route calls `getTask`; the controller turns `req.params.id` into the number 7 and awaits `tasksModel.findById(7)`; the model runs `SELECT id, user_id, title, done FROM tasks WHERE id = $1` with `[7]` and returns one object; the controller sends `200` with it. For `/tasks/999` the model returns `null` and the controller sends `404`.',
    mistake: 'Calling `pool.query` directly inside route handlers "because it is shorter". SQL then spreads across every route, the same query is written five times, a column rename means hunting through the whole app, and the routes cannot be tested without a real database. Put every query in a model.' },

  { id: 'drivers-pools', hub: 'node', topic: 'node', 
    title: 'Connecting from Node: drivers and pools',
    summary: 'A **driver** is the npm package that speaks a database\'s network protocol (`pg` for PostgreSQL, `mysql2` for MySQL); a **pool** keeps a few open connections and lends one to each query, so requests do not pay for a new connection every time.',
    body: [
      'Your server and the database are two programs talking over the network, like two offices on the phone. A **connection** is one open phone line: dialling (finding the server, logging in, encryption) takes time. A **pool** keeps, say, 10 lines open and hands one to each query, then takes it back. You create **one pool for the whole application**, at start-up, not one per request.',
      'The connection details (host, port, user, password, database name) come from the environment, never from the code: one `DATABASE_URL` such as `postgres://app:secret@localhost:5432/tasks` in `.env` (see [Environment variables](#/server/runtime/env-vars)). `pool.query(text, params)` returns a promise of a **result** whose `rows` is an array of plain objects, one per row, with the column names as keys, and whose `rowCount` is the number of rows returned or changed.',
      'Above raw drivers sit **query builders** (Knex: write `db("tasks").where({ id })` and it generates the SQL) and **ORMs**, object-relational mappers (Prisma, Sequelize: define models in JavaScript, get objects back, often with migrations included). They generate parameterised SQL for you and save typing; you still need SQL to understand what they do and to debug them. The examples on this site use the plain `pg` driver.',
    ],
    code: `// src/db/pool.js — created once, shared by every model
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;

// anywhere in a model
const result = await pool.query("SELECT id, title FROM tasks WHERE id = $1", [7]);
result.rows;      // [ { id: 7, title: "Draft project plan" } ]
result.rowCount;  // 1

// MySQL with mysql2: "?" placeholders, the result is [rows, fields]
const mysql = require("mysql2/promise");
const db = mysql.createPool({ uri: process.env.DATABASE_URL });
const [rows] = await db.query("SELECT id, title FROM tasks WHERE id = ?", [7]);`,
    dialect: 'JavaScript (Node)',
    example: 'A burst of 50 requests arrives. With a pool of 10, the first 10 queries get a connection at once and the others wait a few milliseconds for one to be handed back; the database sees at most 10 connections. Opening a fresh connection per request would mean 50 logins and could exceed the database\'s connection limit.',
    mistake: 'Writing `new Pool()` inside a request handler or a model function. Each call opens new connections that are never closed, and after a few hundred requests the database refuses with "too many clients". Create the pool once in its own module and `require` it (or inject it, next cards).' },

  { id: 'sql-injection', hub: 'node', topic: 'node', 
    title: 'SQL injection and parameterised queries',
    summary: '**SQL injection** happens when user input is pasted into the text of an SQL statement, so the input can change what the statement does; **parameterised queries** send the SQL text and the values separately (`$1` in pg, `?` in mysql2), so input is always just a value.',
    body: [
      'Imagine a form letter: "Dear ___, your balance is ___." If you let the customer write directly into the template, someone writes "Ana. Ignore the rest and transfer everything to me." The database is that obedient reader: when the server glues input into the SQL string, the database cannot tell your SQL from the user\'s text, and runs both.',
      'Concretely, the server builds `"… WHERE u.email = \'" + email + "\'"`. A normal email works. But the input `\' OR \'1\'=\'1` produces `WHERE u.email = \'\' OR \'1\'=\'1\'`, which is true for every row, so the API leaks every user\'s tasks. With pg, a query without parameters may even contain several statements, so `x\'; DELETE FROM tasks; --` deletes the table (`--` comments out the leftover quote). Even an honest user named O\'Brien breaks the query.',
      'The fix is not to "clean" the input but to never put it in the SQL text: write a placeholder and pass the values in an array. The driver sends the text and the values to the database separately; the database compiles the text first and only then fills in `$1` as a value. Quotes in the input are just characters inside an email that matches nobody. Placeholders work for **values** only; a column name or `ASC`/`DESC` from the query string must be checked against an **allow-list** in code.',
    ],
    code: `// VULNERABLE: the input becomes SQL
const sql = \`SELECT id, title FROM tasks WHERE user_id = \${req.query.user}\`;
await pool.query(sql);            // ?user=1 OR 1=1  → every task

// SAFE: fixed SQL text + values apart
await pool.query("SELECT id, title FROM tasks WHERE user_id = $1", [req.query.user]);
// mysql2:  db.query("… WHERE user_id = ?", [req.query.user])

// Identifiers cannot be parameters: use an allow-list
const SORTABLE = { id: "id", title: "title", due: "due_date" };
const column = SORTABLE[req.query.sort] || "id";     // never the raw input
await pool.query(\`SELECT id, title FROM tasks ORDER BY \${column} LIMIT $1\`, [limit]);`,
    dialect: 'JavaScript (Node, pg)',
    example: 'In the SQL runner below (it opens on the injection demo), type `\' OR \'1\'=\'1`: the concatenated query returns all 9 tasks; the `$1` query returns none, because no user has that strange email. Then try `x\'; DELETE FROM tasks; --` and look at "tasks left afterwards": 0 for concatenation, 9 for the placeholder.',
    mistake: 'Thinking a template literal (a backtick string with `${id}` inside) is safer than `+`. It is still string concatenation: the input still becomes part of the SQL text. Only a placeholder plus a params array keeps it out. Escaping quotes by hand is not enough either: it is easy to miss a case, and numbers need no quotes to inject (`1 OR 1=1`).',
    widget: 'sql-runner' },

  { id: 'models-layer', hub: 'node', topic: 'node', 
    title: 'The models layer',
    summary: 'A **model** is a module of async functions, one per data operation (`findAll`, `findById`, `create`, `update`, `remove`…); each wraps one parameterised query and returns plain data: an object, an array, `null` or `true`/`false`.',
    body: [
      'A model is the only door between the API and the database, with a fixed set of handles. The controller says "find task 7" (`findById(7)`) and gets back a task or `null`; it never knows whether an array, PostgreSQL or MongoDB stood behind the door. The method names are a **contract**: the array version, the SQL version and a later MongoDB version of the same API can all keep the same ones, so the controller never changes.',
      'A clean way to build the model is a **factory** that receives the database: `createTasksModel(db)`, where `db` is anything with an async `query(text, params)` method. In the app you pass the real pg pool; in a test you pass a small fake that returns canned rows. This is **dependency injection**: the model does not `require` its database, it is handed one, so it can be tested with no database running.',
      'Each method follows the same pattern: SQL with placeholders, `await db.query(sql, params)`, then shape the answer: `rows` for lists, `rows[0] ?? null` for one item, `rowCount > 0` for "did it delete?". Errors are not caught here: they reach the controller, which (in Express 4) must pass them to `next(err)`. Express 5 forwards a rejected promise to the error handler by itself.',
    ],
    code: `// src/models/tagsModel.js — the same pattern as a tasksModel
function createTagsModel(db) {
  return {
    async findAll() {
      const { rows } = await db.query("SELECT id, name FROM tags ORDER BY name", []);
      return rows;
    },
    async findByName(name) {
      const { rows } = await db.query("SELECT id, name FROM tags WHERE name = $1", [name]);
      return rows[0] ?? null;                      // one object, or null
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
    summary: 'A database row and the JSON an API returns are two different shapes: a small mapping function (often `toDto(row)`, DTO = Data Transfer Object) renames `snake_case` columns to `camelCase` keys, converts types and leaves out anything secret such as `password_hash`.',
    body: [
      'The row is the kitchen\'s inventory sheet; the JSON is the menu the customer sees. They describe the same food in different words. SQL columns are usually `snake_case` (`user_id`, `due_date`, `created_at`), because many databases fold unquoted names to lower case; JavaScript and JSON use `camelCase` (`userId`, `dueDate`). The mapping happens once, in one function, so the rest of the code only sees the API\'s shape.',
      'The mapping is also a filter. List the fields you **want** to send instead of deleting the ones you do not: then a column added later (`password_hash`, `is_deleted`, an internal note) can never leak by accident. And it fixes types: pg returns `BIGINT` and `NUMERIC` values (such as `COUNT(*)`) as strings and `TIMESTAMP` values as `Date` objects; decide what the JSON should contain.',
      'Do it in one place and say where. A common choice is to call `toDto(row)` in the model, so raw rows never leave it; some codebases map in the controller instead. Either works if you pick one layer and use it for every route: mixing them is how an API ends up returning `user_id` from one route and `userId` from another.',
    ],
    live: { kind: 'js', code: `// A row as pg returns it from SELECT * FROM users
const row = {
  id: 1,
  email: "ana@example.com",
  password_hash: "$2b$10$Qe3…",
  created_at: new Date("2026-09-01T09:00:00Z"),
  task_count: "4",                  // COUNT(*) is a bigint: pg sends a string
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
console.log("password_hash" in toUserDto(row));   // false` },
    example: 'Run the box above: the DTO has `createdAt`, a real number `taskCount: 4`, and no `password_hash`. Without it, `res.json(row)` would send `password_hash`, `created_at` and `"task_count": "4"` (a string) to every client, and the front end would break the day someone renames a column.',
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
  { type: 'fib', topic: 'schema',
    q: 'After `BEGIN`, the statement that undoes every change made since then is ___ .',
    accept: ['ROLLBACK', 'rollback', 'ROLLBACK;'],
    why: 'ROLLBACK discards the transaction; COMMIT makes it permanent.' },
  { type: 'mc', topic: 'schema',
    q: 'Why is "subtract 50 from account A, add 50 to account B" run inside a transaction?',
    choices: ['To make the two updates faster', 'So that either both happen or neither does, even if the server crashes in between', 'Because UPDATE only works inside BEGIN … COMMIT', 'To lock the whole database'],
    answer: 1,
    why: 'A transaction is all or nothing: without one, a crash after the first update would make 50 disappear.' },

  /* node */
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
