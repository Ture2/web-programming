'use strict';

/* ==========================================================================
   sql-runner (Relational databases): real SQL on a small Tasks database
   (users, tasks, tags, task_tags), run by SQLite compiled to
   WebAssembly (sql.js, vendored in vendor/sql.js/, MIT). The engine is loaded the
   first time something runs; nothing leaves the browser. Every run starts from a
   fresh in-memory copy of the sample database, so nothing can be broken for good.

   Three modes:
     editor      free SQL, run statement by statement: result tables (capped) or
                 "n rows changed", the failing statement's number and a plain-English
                 hint, warnings for UPDATE/DELETE without WHERE, "= NULL", LIMIT
                 without ORDER BY and double-quoted text; example queries; Reset.
     challenges  12 goals; the student's result is compared with the reference
                 query's (as a set unless the goal needs an order; column names do
                 not matter); INSERT/UPDATE/DELETE goals compare a verification SELECT.
     inject      the same search built by string concatenation and with a $1
                 placeholder, side by side, for any input the student types.

   The pure part (seed data, statement splitter, checks, comparisons) needs no DOM:
   in Node this file exports it (site/test/sql-runner.test.mjs) and stops before the UI.
   Saved on this device: solved challenges (sql-challenges-v1, progress page) and the
   editor texts (sql-runner-work-v1).
   ========================================================================== */

(() => {
  /* ======================================================================
     1. Pure part
     ====================================================================== */

  /* The sample database. `create` is the SQLite DDL shown to students (with the
     PostgreSQL spelling in comments); rows are inserted in this order. */
  const TABLES = [
    { name: 'users',
      create: `CREATE TABLE users (
  id INTEGER PRIMARY KEY,         -- PostgreSQL: SERIAL
  email TEXT NOT NULL UNIQUE,
  -- PostgreSQL: TIMESTAMP NOT NULL DEFAULT NOW()
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
      cols: ['id', 'email', 'created_at'],
      rows: [
        [1, 'ana@example.com', '2026-09-01 09:00:00'],
        [2, 'ben@example.com', '2026-09-02 10:30:00'],
        [3, 'cleo@example.com', '2026-09-03 16:45:00'],
        [4, 'dan@example.com', '2026-09-20 12:00:00'],
      ] },
    { name: 'tasks',
      create: `CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (title <> ''),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  due_date TEXT   -- NULL = no date (PostgreSQL: DATE)
)`,
      cols: ['id', 'user_id', 'title', 'done', 'due_date'],
      rows: [
        [1, 1, 'Buy milk', false, '2026-10-06'],
        [2, 1, 'Write the SQL schema', true, null],
        [3, 1, 'Read the pg docs', false, '2026-10-09'],
        [4, 1, 'Add pagination', false, null],
        [5, 2, 'Set up CI', false, '2026-10-08'],
        [6, 2, 'Review pull request', true, '2026-10-05'],
        [7, 3, 'Draft project plan', false, '2026-10-12'],
        [8, 3, 'Book the demo room', true, null],
        [9, 2, 'Fix the login bug', false, null],
      ] },
    { name: 'tags',
      create: `CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
)`,
      cols: ['id', 'name'],
      rows: [[1, 'urgent'], [2, 'study'], [3, 'planning']] },
    { name: 'task_tags',
      create: `-- join table (many-to-many)
CREATE TABLE task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
)`,
      cols: ['task_id', 'tag_id'],
      rows: [[1, 1], [3, 2], [4, 3], [5, 3], [7, 1], [7, 3], [9, 1]] },
  ];
  const INDEXES = ['CREATE INDEX tasks_user_id_idx ON tasks (user_id)'];

  /* A JS value as an SQL literal (booleans as TRUE / FALSE, as PostgreSQL writes them). */
  const sqlLiteral = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  /* The whole seed script: tables, index, rows. */
  function seedSql() {
    const creates = TABLES.map((tb) => `${tb.create};`);
    const inserts = TABLES.map((tb) => `INSERT INTO ${tb.name} (${tb.cols.join(', ')}) VALUES\n  ${tb.rows.map((r) => `(${r.map(sqlLiteral).join(', ')})`).join(',\n  ')};`);
    return [...creates, ...INDEXES.map((s) => `${s};`), ...inserts].join('\n\n');
  }

  const countNl = (s) => (s.match(/\n/g) || []).length;

  /* Splits a script into statements at the semicolons that are not inside quotes or
     comments. Comment-only pieces are dropped. → [{ text, line }] (line: first code line). */
  function splitStatements(text) {
    const src = String(text);
    const out = [];
    const n = src.length;
    let buf = '';
    let has = false;
    let line = 1;
    let start = 1;
    const push = () => {
      if (has) out.push({ text: buf.trim(), line: start });
      buf = '';
      has = false;
    };
    const begin = () => { if (!has) { has = true; start = line; } };
    let i = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '-' && d === '-') {
        const j = src.indexOf('\n', i);
        const end = j === -1 ? n : j;
        buf += src.slice(i, end);
        i = end;
      } else if (c === '/' && d === '*') {
        const j = src.indexOf('*/', i + 2);
        const end = j === -1 ? n : j + 2;
        const chunk = src.slice(i, end);
        line += countNl(chunk);
        buf += chunk;
        i = end;
      } else if (c === "'" || c === '"' || c === '`') {
        let j = i + 1;
        while (j < n) {
          if (src[j] === c) {
            if (src[j + 1] === c) { j += 2; continue; }   // '' inside a string is one quote
            break;
          }
          j++;
        }
        const end = Math.min(j + 1, n);
        const chunk = src.slice(i, end);
        begin();
        line += countNl(chunk);
        buf += chunk;
        i = end;
      } else if (c === ';') {
        push();
        i++;
      } else {
        if (c === '\n') line++;
        else if (!/\s/.test(c)) begin();
        buf += c;
        i++;
      }
    }
    push();
    return out;
  }

  /* The statement without its comments (to look for keywords). */
  const stripComments = (sql) => String(sql).replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  /* ... and without the contents of its quoted strings. */
  const codeOnly = (sql) => stripComments(sql).replace(/'(?:[^']|'')*'/g, "''");

  /* What a statement does, from its first keyword. */
  function stmtKind(sql) {
    const s = codeOnly(sql).replace(/^[\s(]+/, '');
    const w = (s.match(/^[A-Za-z]+/) || [''])[0].toUpperCase();
    if (w === 'WITH') {
      const m = s.match(/\)\s*(SELECT|INSERT|UPDATE|DELETE)\b/i);
      return m ? m[1].toLowerCase() : 'select';
    }
    if (w === 'EXPLAIN' || w === 'VALUES') return 'select';
    if (w === 'START' || w === 'BEGIN') return 'begin';
    if (w === 'END') return 'commit';
    const k = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'COMMIT', 'ROLLBACK', 'PRAGMA', 'REPLACE'];
    return k.includes(w) ? w.toLowerCase() : 'other';
  }
  const CHANGES = new Set(['insert', 'update', 'delete', 'replace']);

  /* Advice on a statement that runs but probably does not do what was meant, or that would
     behave differently on PostgreSQL. → [{ code, msg }] (msg in English, for t()). */
  function warnings(sql) {
    const s = codeOnly(sql);
    const kind = stmtKind(sql);
    const out = [];
    if ((kind === 'update' || kind === 'delete') && !/\bWHERE\b/i.test(s)) {
      out.push({ code: 'no-where', msg: kind === 'update'
        ? 'This UPDATE has no WHERE, so it changes every row of the table.'
        : 'This DELETE has no WHERE, so it deletes every row of the table.' });
    }
    if (/(?:=|<>|!=)\s*NULL\b/i.test(s)) {
      out.push({ code: 'eq-null', msg: '`= NULL` is never true, because NULL means "unknown". Use `IS NULL` or `IS NOT NULL`.' });
    }
    if (/\bLIMIT\b/i.test(s) && !/\bORDER\s+BY\b/i.test(s) && kind === 'select') {
      out.push({ code: 'limit-no-order', msg: 'LIMIT without ORDER BY: the database may return the rows in any order, so pages can overlap or skip rows.' });
    }
    if (/(?:=|<>|!=|\bLIKE|\bIN\s*\(|,)\s*"[^"]*"/i.test(stripComments(sql))) {
      out.push({ code: 'double-quotes', msg: 'Text values take single quotes: `\'ana@example.com\'`. SQLite forgives double quotes, but PostgreSQL reads `"…"` as a column name and fails.' });
    }
    return out;
  }

  /* A plain-English hint for an SQLite error message, or '' when there is none. */
  function explainError(message) {
    const m = String(message);
    let x;
    if (/FOREIGN KEY constraint failed/i.test(m)) return 'A foreign key refused the change: a row would point to a row that does not exist (for example a `user_id` with no user), or a row that others point to would disappear.';
    if ((x = m.match(/UNIQUE constraint failed: ([\w.]+(?:, [\w.]+)*)/i))) return `Another row already has this value in \`${x[1]}\`: UNIQUE (and PRIMARY KEY) forbid duplicates.`;
    if ((x = m.match(/NOT NULL constraint failed: ([\w.]+)/i))) return `\`${x[1]}\` is NOT NULL: give it a value (columns with a DEFAULT can be left out of the INSERT).`;
    if (/CHECK constraint failed/i.test(m)) return 'The value breaks a CHECK rule of the table (here: a task title cannot be empty).';
    if ((x = m.match(/no such table: ([\w.]+)/i))) return `There is no table \`${x[1]}\`. The tables are users, tasks, tags and task_tags.`;
    if ((x = m.match(/no such column: ([\w.]+)/i))) return `There is no column \`${x[1]}\` here. Check the spelling, the table alias (\`t.title\`) and that the table is in FROM or JOIN.`;
    if ((x = m.match(/ambiguous column name: ([\w.]+)/i))) return `Two tables in the query have a column \`${x[1]}\`: write which one, e.g. \`t.${x[1]}\` or \`u.${x[1]}\`.`;
    if (/incomplete input/i.test(m)) return 'The statement ends too early: a quote, a bracket or a clause is not closed.';
    if (/syntax error/i.test(m)) return 'SQLite could not read the statement at that word. Check commas, quotes and the order of the clauses: SELECT … FROM … JOIN … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT … OFFSET.';
    if (/misuse of aggregate/i.test(m)) return 'COUNT, SUM and the other aggregates cannot go in WHERE (it filters rows before grouping). Filter groups with HAVING.';
    if (/cannot (start|commit|rollback)/i.test(m)) return 'BEGIN, COMMIT and ROLLBACK must alternate: start a transaction once, then end it once.';
    return '';
  }

  /* Runs a script on a sql.js Database, one statement at a time, stopping at the first error.
     → [{ n, line, text, kind, cols, rows, more, changed, error, warnings }] */
  function runScript(db, text, { maxRows = 2000 } = {}) {
    const results = [];
    const stmts = splitStatements(text);
    for (let k = 0; k < stmts.length; k++) {
      const s = stmts[k];
      const r = { n: k + 1, line: s.line, text: s.text, kind: stmtKind(s.text), cols: [], rows: [], more: false, changed: 0, error: null, warnings: warnings(s.text) };
      results.push(r);
      if (/\bRECURSIVE\b/i.test(codeOnly(s.text))) {
        r.error = 'WITH RECURSIVE is switched off in this practice runner (a recursive query can run forever and freeze the page).';
        break;
      }
      let st = null;
      try {
        st = db.prepare(s.text);
        r.cols = st.getColumnNames();
        while (st.step()) {
          if (r.rows.length >= maxRows) { r.more = true; break; }
          r.rows.push(st.get());
        }
        if (CHANGES.has(r.kind)) r.changed = db.getRowsModified();
      } catch (e) {
        r.error = String((e && e.message) || e);
        break;
      } finally {
        if (st) st.free();
      }
    }
    return results;
  }

  /* The database image (bytes) built from the seed, and a fresh copy of it. */
  function buildImage(SQL) {
    const db = new SQL.Database();
    try {
      db.run('PRAGMA foreign_keys = ON;');
      db.exec(seedSql());
      return db.export();
    } finally { db.close(); }
  }
  function freshDb(SQL, image) {
    const db = new SQL.Database(image);
    db.run('PRAGMA foreign_keys = ON;');   // per connection: set it on every copy
    return db;
  }

  /* ---- Comparing results ---------------------------------------------------------- */

  const norm = (v) => (v === null || v === undefined ? null : typeof v === 'number' ? Math.round(v * 10000) / 10000 : String(v));
  const rowKey = (row) => JSON.stringify(row.map(norm));

  /* got / want: { cols, rows }. → { ok, reason: 'cols' | 'rows' | 'order' | 'values' | '' } */
  function compareResults(got, want, ordered) {
    if (got.cols.length !== want.cols.length) return { ok: false, reason: 'cols' };
    if (got.rows.length !== want.rows.length) return { ok: false, reason: 'rows' };
    const a = got.rows.map(rowKey);
    const b = want.rows.map(rowKey);
    const same = (x, y) => x.every((k, i) => k === y[i]);
    if (!same([...a].sort(), [...b].sort())) return { ok: false, reason: 'values' };
    if (ordered && !same(a, b)) return { ok: false, reason: 'order' };
    return { ok: true, reason: '' };
  }

  /* ---- Challenges ------------------------------------------------------------------ */

  /* verify: a SELECT run after the student's statements (for INSERT / UPDATE / DELETE goals).
     requires: words the SQL must contain. ordered: the row order is part of the answer. */
  const CHALLENGES = [
    { id: 'open-tasks', title: 'Unfinished tasks',
      prompt: 'List the `id` and `title` of every task that is **not done**.',
      hint: '`done` is a boolean column: filter with `WHERE done = FALSE` (SQLite stores it as 0 and 1, so `done = 0` works here too).',
      solution: 'SELECT id, title\nFROM tasks\nWHERE done = FALSE;' },
    { id: 'newest-three', title: 'The three newest tasks', ordered: true,
      prompt: 'Return the `id` and `title` of the **three newest** tasks, newest first. (No `created_at` on tasks: a higher id means a newer row.)',
      hint: 'Sort with `ORDER BY id DESC`, then keep the first rows with `LIMIT`.',
      solution: 'SELECT id, title\nFROM tasks\nORDER BY id DESC\nLIMIT 3;' },
    { id: 'page-two', title: 'Page 2 of the list', ordered: true,
      prompt: 'The API lists tasks **4 per page**, ordered by `id`. Return **page 2**: `id` and `title`.',
      hint: 'Page p with n rows per page skips (p − 1) × n rows: `LIMIT 4 OFFSET 4`. Without `ORDER BY` the pages are not stable.',
      solution: 'SELECT id, title\nFROM tasks\nORDER BY id\nLIMIT 4 OFFSET 4;' },
    { id: 'no-due-date', title: 'Open tasks with no due date',
      prompt: 'Return the `id` and `title` of the tasks that are **not done** and have **no due date**.',
      hint: 'A missing value is NULL. `due_date = NULL` is never true: test it with `due_date IS NULL`, and join both conditions with `AND`.',
      solution: 'SELECT id, title\nFROM tasks\nWHERE done = FALSE AND due_date IS NULL;' },
    { id: 'ana-join', title: 'Ana\'s tasks, with a JOIN', requires: ['JOIN'],
      prompt: 'Return the `title` of every task owned by `ana@example.com`. Find her through the `users` table with a **JOIN** (do not type her id).',
      hint: '`FROM tasks t JOIN users u ON u.id = t.user_id` pairs each task with its owner; then filter on `u.email`.',
      solution: "SELECT t.title\nFROM tasks t\nJOIN users u ON u.id = t.user_id\nWHERE u.email = 'ana@example.com';" },
    { id: 'urgent-tags', title: 'Tasks tagged “urgent”', requires: ['JOIN'],
      prompt: 'Return the `title` of every task tagged `urgent`. Tags are many-to-many: go through the join table `task_tags`.',
      hint: 'Two joins: `tasks` → `task_tags` (on `tt.task_id = t.id`) → `tags` (on `g.id = tt.tag_id`), then `WHERE g.name = \'urgent\'`.',
      solution: "SELECT t.title\nFROM tasks t\nJOIN task_tags tt ON tt.task_id = t.id\nJOIN tags g ON g.id = tt.tag_id\nWHERE g.name = 'urgent';" },
    { id: 'count-per-user', title: 'Tasks per user, zeros included', requires: ['GROUP BY'],
      prompt: 'For **every** user, return the `email` and the number of tasks they own. Users with no tasks must appear with **0**.',
      hint: 'An inner JOIN drops users without tasks: use `LEFT JOIN`. Then count a column of `tasks`, `COUNT(t.id)`: `COUNT(*)` counts the padded row and gives 1, not 0.',
      solution: 'SELECT u.email, COUNT(t.id) AS task_count\nFROM users u\nLEFT JOIN tasks t ON t.user_id = u.id\nGROUP BY u.id, u.email;' },
    { id: 'no-tasks', title: 'Users with no tasks',
      prompt: 'Return the `email` of the users who have **no tasks at all**.',
      hint: '`LEFT JOIN tasks` keeps every user; for a user with no tasks the task columns are NULL. Keep those rows with `WHERE t.id IS NULL`.',
      solution: 'SELECT u.email\nFROM users u\nLEFT JOIN tasks t ON t.user_id = u.id\nWHERE t.id IS NULL;' },
    { id: 'busy-users', title: 'More than one open task', requires: ['GROUP BY'],
      prompt: 'Return the `email` and the number of **open** (not done) tasks of the users who have **more than one** open task.',
      hint: '`WHERE` filters rows before grouping (keep the open tasks); `HAVING COUNT(*) > 1` filters the groups after counting.',
      solution: 'SELECT u.email, COUNT(*) AS open_tasks\nFROM tasks t\nJOIN users u ON u.id = t.user_id\nWHERE t.done = FALSE\nGROUP BY u.id, u.email\nHAVING COUNT(*) > 1;' },
    { id: 'finish-task', title: 'Mark one task done', requires: ['UPDATE'],
      prompt: 'Ben has finished **Set up CI** (task 5). Mark it as done, **and nothing else**. The check then reads every task\'s `id` and `done`.',
      hint: '`UPDATE tasks SET done = TRUE WHERE …`. Without WHERE, every task becomes done.',
      solution: 'UPDATE tasks\nSET done = TRUE\nWHERE id = 5;',
      verify: 'SELECT id, done FROM tasks ORDER BY id' },
    { id: 'add-task', title: 'Create a task', requires: ['INSERT'],
      prompt: 'Add the task **Write tests** for cleo (user 3): not done, no due date. Let the database choose the `id`. The check then reads every task.',
      hint: 'Name the columns you give: `INSERT INTO tasks (user_id, title) VALUES (…, …)`. `done` takes its DEFAULT (FALSE) and `due_date` stays NULL.',
      solution: "INSERT INTO tasks (user_id, title)\nVALUES (3, 'Write tests');",
      verify: 'SELECT user_id, title, done, due_date FROM tasks ORDER BY id' },
    { id: 'delete-done', title: 'Clear the finished tasks', requires: ['DELETE'],
      prompt: 'Delete **every task that is done**, and only those. The check then reads the ids of the tasks that are left.',
      hint: '`DELETE FROM tasks WHERE …`. Their rows in `task_tags` go too, thanks to `ON DELETE CASCADE`.',
      solution: 'DELETE FROM tasks\nWHERE done = TRUE;',
      verify: 'SELECT id FROM tasks ORDER BY id' },
  ];

  /* Runs the student's script (and the challenge's verification SELECT) on a fresh database.
     → { error: result | null, final: { cols, rows } | null, results } */
  function evaluate(makeDb, text, verify) {
    const db = makeDb();
    try {
      const results = runScript(db, text);
      const failed = results.find((r) => r.error);
      if (failed) return { error: failed, final: null, results };
      let final = null;
      if (verify) {
        const v = runScript(db, verify);
        const last = v[v.length - 1];
        final = last ? { cols: last.cols, rows: last.rows } : null;
      } else {
        const last = [...results].reverse().find((r) => r.cols.length);
        final = last ? { cols: last.cols, rows: last.rows } : null;
      }
      return { error: null, final, results };
    } finally { db.close(); }
  }

  /* → { ok, checks: [{ status, msg, vars }], got: { cols, rows } | null, error } */
  function checkChallenge(makeDb, ch, text) {
    const checks = [];
    const code = codeOnly(text);
    if (!code.trim()) return { ok: false, checks: [{ status: 'bad', msg: 'Write your SQL first.' }], got: null, error: null };
    const missing = (ch.requires || []).filter((w) => !new RegExp(`\\b${w.replace(/ /g, '\\s+')}\\b`, 'i').test(code));
    const got = evaluate(makeDb, text, ch.verify);
    if (got.error) {
      checks.push({ status: 'bad', msg: 'Statement {n} failed: {error}', vars: { n: got.error.n, error: got.error.error } });
      return { ok: false, checks, got: null, error: got.error };
    }
    if (!ch.verify && !got.final) {
      checks.push({ status: 'bad', msg: 'Your SQL must end with a SELECT that returns the answer.' });
      return { ok: false, checks, got: null, error: null };
    }
    const want = evaluate(makeDb, ch.solution, ch.verify);
    const cmp = compareResults(got.final, want.final, ch.ordered);
    const g = got.final;
    const w = want.final;
    if (cmp.reason === 'cols') checks.push({ status: 'bad', msg: 'Your result has {n} columns; the answer has {m}.', vars: { n: g.cols.length, m: w.cols.length } });
    else if (cmp.reason === 'rows') checks.push({ status: 'bad', msg: ch.verify ? 'After your SQL the table has {n} rows; it should have {m}.' : 'Your result has {n} rows; the answer has {m}.', vars: { n: g.rows.length, m: w.rows.length } });
    else if (cmp.reason === 'values') checks.push({ status: 'bad', msg: ch.verify ? 'The right number of rows, but some values differ: check which rows your WHERE touched.' : 'The right number of rows and columns, but some values differ: check the filter, the join and the counts.' });
    else if (cmp.reason === 'order') checks.push({ status: 'bad', msg: 'The rows are right but not in the order the goal asks for: add or fix ORDER BY.' });
    else checks.push({ status: 'ok', msg: ch.verify ? 'The table now holds exactly the expected rows.' : 'Your result matches the expected one.' });
    if (missing.length) checks.push({ status: 'bad', msg: 'This challenge asks you to use {words}.', vars: { words: missing.join(', ') } });
    got.results.forEach((r) => r.warnings.forEach((x) => checks.push({ status: 'note', msg: x.msg })));
    return { ok: cmp.ok && !missing.length, checks, got: g, error: null };
  }

  /* ---- Example queries for the editor ------------------------------------------------ */

  const EXAMPLES = [
    { id: 'open', label: 'Open tasks',
      sql: '-- Unfinished tasks, oldest first\nSELECT id, title, due_date\nFROM tasks\nWHERE done = FALSE\nORDER BY id;' },
    { id: 'join', label: 'JOIN the owner',
      sql: '-- Each task with its owner\'s email\nSELECT t.id, t.title, u.email\nFROM tasks t\nJOIN users u ON u.id = t.user_id\nORDER BY t.id;' },
    { id: 'count', label: 'Count per user',
      sql: '-- LEFT JOIN keeps dan, who has no tasks; COUNT(t.id) gives him 0\nSELECT u.email, COUNT(t.id) AS task_count\nFROM users u\nLEFT JOIN tasks t ON t.user_id = u.id\nGROUP BY u.id, u.email\nORDER BY task_count DESC, u.email;' },
    { id: 'page', label: 'Pagination',
      sql: '-- Page 1 and page 2, 4 tasks per page\nSELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 0;\nSELECT id, title FROM tasks ORDER BY id LIMIT 4 OFFSET 4;' },
    { id: 'null', label: 'The NULL trap',
      sql: '-- = NULL is never true: 0 rows\nSELECT id, title FROM tasks WHERE due_date = NULL;\n\n-- IS NULL is the right test\nSELECT id, title FROM tasks WHERE due_date IS NULL;\n\n-- COALESCE gives a fallback for display\nSELECT id, COALESCE(due_date, \'no date\') AS due FROM tasks ORDER BY id;' },
    { id: 'tags', label: 'Tags (many-to-many)',
      sql: '-- Each task with its tags, through the join table task_tags\nSELECT t.title, g.name AS tag\nFROM tasks t\nJOIN task_tags tt ON tt.task_id = t.id\nJOIN tags g ON g.id = tt.tag_id\nORDER BY t.id, g.name;' },
    { id: 'insert', label: 'INSERT … RETURNING',
      sql: "-- RETURNING hands back the stored row, with the id the database chose\nINSERT INTO tasks (user_id, title)\nVALUES (4, 'Say hello to the team')\nRETURNING id, user_id, title, done;" },
    { id: 'nowhere', label: 'UPDATE without WHERE',
      sql: '-- Forgot the WHERE: every task is now done\nUPDATE tasks SET done = TRUE;\nSELECT id, title, done FROM tasks;\n-- (Each Run starts from a fresh copy, so nothing is lost here.)' },
    { id: 'constraints', label: 'Constraints say no',
      sql: "-- Each statement breaks one rule; run, read the error, then delete that line\nINSERT INTO tasks (user_id, title) VALUES (99, 'Ghost task');\nINSERT INTO users (email) VALUES ('ana@example.com');\nINSERT INTO tasks (user_id, title) VALUES (1, '');\nINSERT INTO tasks (user_id) VALUES (1);" },
    { id: 'cascade', label: 'ON DELETE CASCADE',
      sql: "SELECT COUNT(*) AS ben_tasks FROM tasks WHERE user_id = 2;\n\n-- Deleting ben also deletes his tasks (and their tags)\nDELETE FROM users WHERE email = 'ben@example.com';\n\nSELECT COUNT(*) AS ben_tasks FROM tasks WHERE user_id = 2;" },
    { id: 'tx', label: 'Transaction',
      sql: '-- All or nothing: ROLLBACK undoes everything since BEGIN\nBEGIN;\nUPDATE tasks SET done = TRUE WHERE user_id = 1;\nSELECT id, done FROM tasks WHERE user_id = 1;\nROLLBACK;\nSELECT id, done FROM tasks WHERE user_id = 1;' },
    { id: 'index', label: 'Is an index used?',
      sql: "-- SQLite's EXPLAIN QUERY PLAN (PostgreSQL: EXPLAIN)\n-- SEARCH … USING INDEX = the index is used; SCAN = every row is read\nEXPLAIN QUERY PLAN SELECT title FROM tasks WHERE user_id = 2;\nEXPLAIN QUERY PLAN SELECT id FROM tasks WHERE title = 'Set up CI';" },
  ];
  const DEFAULT_SQL = '-- Write SQL and press Run (Ctrl+Enter). Several statements run in order.\nSELECT id, title, done\nFROM tasks\nWHERE user_id = 1\nORDER BY id;';

  /* ---- SQL injection demo ------------------------------------------------------------ */

  const INJ_BASE = 'SELECT t.id, t.title FROM tasks t JOIN users u ON u.id = t.user_id WHERE u.email = ';
  const INJ_SAFE = `${INJ_BASE}$1`;
  /* The SQL text a server builds by gluing the input between quotes. */
  const injectionSql = (input) => `${INJ_BASE}'${input}'`;
  const INJ_PRESETS = ['ana@example.com', 'nobody@example.com', "' OR '1'='1", "x' OR 1=1 --", "x'; DELETE FROM tasks; --"];

  const countTasks = (db) => {
    const r = runScript(db, 'SELECT COUNT(*) FROM tasks');
    return r[0] && r[0].rows[0] ? r[0].rows[0][0] : 0;
  };

  /* Runs the input both ways on two fresh copies. pg runs several statements when a query has
     no parameters, so the concatenated text runs statement by statement here too. */
  function runInjection(makeDb, input) {
    const a = makeDb();
    let unsafe;
    try {
      const sql = injectionSql(input);
      const results = runScript(a, sql);
      unsafe = { sql, results, left: countTasks(a) };
    } finally { a.close(); }
    const b = makeDb();
    let safe;
    try {
      const st = b.prepare(INJ_SAFE);
      const rows = [];
      try {
        st.bind({ $1: input });
        while (st.step()) rows.push(st.get());
        safe = { cols: st.getColumnNames(), rows, left: countTasks(b) };
      } finally { st.free(); }
    } finally { b.close(); }
    return { unsafe, safe };
  }

  const Engine = {
    TABLES, INDEXES, sqlLiteral, seedSql, splitStatements, stmtKind, warnings, explainError, runScript,
    buildImage, freshDb, compareResults, CHALLENGES, evaluate, checkChallenge, EXAMPLES, DEFAULT_SQL,
    INJ_SAFE, INJ_PRESETS, injectionSql, runInjection,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
    return;
  }

  /* ======================================================================
     2. The tool (browser only)
     ====================================================================== */

  const VENDOR = 'vendor/sql.js/';
  const SHOW_ROWS = 50;
  const solvedStore = challengeStore('sql-challenges-v1');
  const workStore = makeStore('sql-runner-work-v1');
  const work = Object.assign({ editor: DEFAULT_SQL, ch: {} }, workStore.load());
  if (typeof work.editor !== 'string') work.editor = DEFAULT_SQL;
  if (!work.ch || typeof work.ch !== 'object') work.ch = {};
  const saveWork = debounce(() => workStore.save(work), 500);

  const st = {
    mode: 'editor',          // editor | challenges | inject
    out: null,               // last editor run: results[] | { loadError }
    ch: 0,                   // current challenge index
    chOut: null,             // last check: { ok, checks, got } | { loadError }
    inj: { input: "' OR '1'='1", out: null },
    busy: false,
    card: '',                // the card this tool was last mounted in
  };
  /* A card that shows this tool opens it in the mode it talks about. */
  const CARD_MODE = { 'c-select-basics': 'editor', 'c-left-join': 'challenges', 'c-sql-injection': 'inject' };

  /* ---- Loading sql.js (once, on the first run) --------------------------------------- */

  let engine = null;   // Promise<{ SQL, image }>
  function loadEngine() {
    if (engine) return engine;
    // Browsers refuse to fetch the .wasm file into a page opened from disk: say so at once.
    if (location.protocol === 'file:') return Promise.reject(new Error('file'));
    engine = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 20000);
      const init = () => window.initSqlJs({ locateFile: (f) => `${VENDOR}${f}` })
        .then((SQL) => { clearTimeout(timer); resolve({ SQL, image: buildImage(SQL) }); }, (e) => { clearTimeout(timer); reject(e); });
      if (typeof window.initSqlJs === 'function') { init(); return; }
      const s = document.createElement('script');
      s.src = `${VENDOR}sql-wasm.js`;
      s.onload = init;
      s.onerror = () => { clearTimeout(timer); reject(new Error('script')); };
      document.head.appendChild(s);
    });
    engine.catch(() => { engine = null; });   // a later click may retry
    return engine;
  }
  const makeDbFrom = (eng) => () => freshDb(eng.SQL, eng.image);

  const loadErrorHtml = () => `<section class="feedback bad sq-load"><p>${md(location.protocol === 'file:'
    ? t('The SQL engine runs on WebAssembly, and browsers do not load it into a page opened as a file. Serve the site instead: in the repository run `npm run site:serve` and open `http://localhost:8080`. You can still read and copy the SQL.')
    : t('The SQL engine could not load. Reload the page and try again; you can still read and copy the SQL.'))}</p></section>`;

  /* ---- Output pieces ----------------------------------------------------------------- */

  const cell = (v) => {
    if (v === null || v === undefined) return `<td class="sq-null">NULL</td>`;
    if (v instanceof Uint8Array) return `<td>${esc(t('[{n} bytes]', { n: v.length }))}</td>`;
    return `<td${typeof v === 'number' ? ' class="sq-num"' : ''}>${esc(v)}</td>`;
  };

  /* A wide table scrolls sideways inside its own box, which must then be reachable by keyboard. */
  const scrollOpen = (label, fid) => `<div class="scroll" tabindex="0" role="region" aria-label="${esc(label)}" data-fid="${esc(fid)}">`;

  function tableHtml(cols, rows, caption, fid, more) {
    const shown = rows.slice(0, SHOW_ROWS);
    const extra = rows.length > SHOW_ROWS || more;
    return `${scrollOpen(caption, fid)}<table class="src sq-table"><caption class="sr-only">${esc(caption)}</caption>
        <thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${shown.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div>
      ${extra ? `<p class="meta">${esc(more ? t('Showing the first {n} rows (the runner stops reading after {max}).', { n: shown.length, max: rows.length }) : t('Showing {n} of {total} rows.', { n: shown.length, total: rows.length }))}</p>` : ''}`;
  }

  const firstLine = (sql) => {
    const line = sql.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('--')) || sql.trim();
    return line.length > 70 ? `${line.slice(0, 68)}…` : line;
  };

  const rowsWord = (n) => (n === 1 ? t('1 row') : t('{n} rows', { n }));

  function doneText(r) {
    switch (r.kind) {
      case 'insert': case 'update': case 'delete': case 'replace':
        return r.changed === 1 ? t('1 row changed.') : t('{n} rows changed.', { n: r.changed });
      case 'create': return /\bINDEX\b/i.test(r.text) ? t('Index created.') : /\bVIEW\b/i.test(r.text) ? t('View created.') : t('Table created.');
      case 'drop': return t('Dropped.');
      case 'alter': return t('Table altered.');
      case 'begin': return t('Transaction started: the next changes are provisional until COMMIT or ROLLBACK.');
      case 'commit': return t('Committed: the changes since BEGIN are now permanent.');
      case 'rollback': return t('Rolled back: every change since BEGIN is undone.');
      default: return t('Done.');
    }
  }

  const warnHtml = (list, r) => list.map((x) => `<p class="sq-warn">${ICON.note}<span><span class="sr-only">${esc(t('Note: '))}</span>${md(t(x.msg))}${x.code === 'no-where' && r ? ` ${esc(t('Here: {n}.', { n: rowsWord(r.changed) }))}` : ''}</span></p>`).join('');

  /* One statement of a run: its number, first line, then its rows / changes / error. */
  function stmtHtml(r) {
    let body;
    if (r.error) {
      const hint = explainError(r.error);
      body = `<div class="feedback bad sq-err"><p><strong>${esc(t('Statement {n} failed', { n: r.n }))}</strong> <span class="muted small">${esc(t('(line {line})', { line: r.line }))}</span></p>
          <p><code>${esc(r.error)}</code></p>${hint ? `<p class="sq-hint">${md(t(hint))}</p>` : ''}</div>`;
    } else if (r.cols.length) {
      const changed = CHANGES.has(r.kind) ? ` · ${doneText(r)}` : '';
      body = r.rows.length
        ? `${tableHtml(r.cols, r.rows, t('Result of statement {n}', { n: r.n }), `sq-res-${r.n}`, r.more)}<p class="meta">${esc(rowsWord(r.rows.length))}${esc(changed)}</p>`
        : `<p class="meta">${esc(t('No rows match.'))}${esc(changed)} <span class="sq-cols">${esc(t('Columns: {cols}', { cols: r.cols.join(', ') }))}</span></p>`;
    } else body = `<p class="meta">${esc(doneText(r))}</p>`;
    return `<div class="sq-stmt"><p class="sq-stmt-h"><span class="sq-n" aria-hidden="true">${r.n}</span><span class="sr-only">${esc(t('Statement {n}:', { n: r.n }))} </span><code>${esc(firstLine(r.text))}</code></p>
        ${warnHtml(r.warnings, r)}${body}</div>`;
  }

  function editorOut() {
    const o = st.out;
    if (st.busy && st.mode === 'editor') return `<p class="meta">${esc(t('Loading the SQL engine (first run only) and running…'))}</p>`;
    if (!o) return `<p class="muted small">${esc(t('Results appear here. Every run starts from a fresh copy of the sample database.'))}</p>`;
    if (o.loadError) return loadErrorHtml();
    if (!o.results.length) return `<p class="meta">${esc(t('Nothing to run: the editor has no SQL statements.'))}</p>`;
    const failed = o.results.some((r) => r.error);
    const total = splitStatements(work.editor).length;
    return `${o.results.map(stmtHtml).join('')}
      <p class="sq-time">${esc(failed
    ? t('Stopped at statement {n} of {total}: the statements after it did not run.', { n: o.results.length, total })
    : (o.results.length === 1 ? t('1 statement ran in {ms} ms.', { ms: o.ms.toFixed(1) }) : t('{n} statements ran in {ms} ms.', { n: o.results.length, ms: o.ms.toFixed(1) })))}</p>`;
  }

  /* ---- The sample database panel -------------------------------------------------------- */

  const sampleCell = (v) => (v === null ? '<td class="sq-null">NULL</td>' : typeof v === 'boolean' ? `<td class="sq-num">${v ? 1 : 0}</td>` : `<td${typeof v === 'number' ? ' class="sq-num"' : ''}>${esc(v)}</td>`);

  const schemaHtml = () => `<details class="sq-schema" data-fid="sq-schema">
      <summary>${esc(t('The sample database: users, tasks, tags, task_tags'))}</summary>
      <p class="meta">${md(t('A small Tasks schema: `users` and `tasks` (with a nullable `due_date` and a user who owns no tasks), and a `tags` / `task_tags` pair to show a many-to-many relationship. Booleans show as 0 and 1 in SQLite.'))}</p>
      <div class="sq-tables">${TABLES.map((tb) => `<section class="sq-tb" aria-labelledby="sq-tb-${tb.name}">
          <h4 id="sq-tb-${tb.name}" class="sq-tb-h"><code>${esc(tb.name)}</code> <span class="muted small">${esc(rowsWord(tb.rows.length))}</span></h4>
          <pre class="sq-ddl"><code>${esc(`${tb.create};`)}</code></pre>
          ${scrollOpen(t('Sample rows of {table}', { table: tb.name }), `sq-tb-${tb.name}-rows`)}<table class="src sq-table"><caption class="sr-only">${esc(t('Sample rows of {table}', { table: tb.name }))}</caption>
            <thead><tr>${tb.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>${tb.rows.map((r) => `<tr>${r.map(sampleCell).join('')}</tr>`).join('')}</tbody></table></div>
        </section>`).join('')}</div>
      <pre class="sq-ddl"><code>${esc(INDEXES.map((s) => `${s};`).join('\n'))}</code></pre>
    </details>`;

  const DIFFS = [
    ['Auto-numbered id', '`INTEGER PRIMARY KEY`', '`SERIAL` or `GENERATED ALWAYS AS IDENTITY`', '`INT AUTO_INCREMENT`'],
    ['Booleans', '`0` / `1` (TRUE and FALSE accepted)', '`true` / `false`', '`0` / `1` (`TINYINT`)'],
    ['Dates and times', 'text such as `\'2026-10-06\'`', '`DATE`, `TIMESTAMP`; `NOW()`', '`DATE`, `DATETIME`; `NOW()`'],
    ['Text values', '`\'single quotes\'` (forgives `"double"`)', '`\'single quotes\'` only', '`\'single quotes\'`'],
    ['Placeholders from Node', '`?` or `$1`', '`$1`, `$2`… (pg)', '`?` (mysql2)'],
    ['GROUP BY', 'lets you select columns that are not grouped', 'error unless every selected column is grouped or aggregated', 'error by default (ONLY_FULL_GROUP_BY)'],
    ['Foreign keys', 'checked only after `PRAGMA foreign_keys = ON` (on here)', 'always checked', 'checked (InnoDB)'],
    ['RETURNING', 'yes', 'yes', 'no: read `insertId` from the result'],
  ];
  const diffHtml = () => `<details class="sq-diff" data-fid="sq-diff">
      <summary>${esc(t('SQLite here vs PostgreSQL / MySQL'))}</summary>
      ${scrollOpen(t('Differences between SQLite, PostgreSQL and MySQL'), 'sq-diff-t')}<table class="src"><caption class="sr-only">${esc(t('Differences between SQLite, PostgreSQL and MySQL'))}</caption>
        <thead><tr><th scope="col">${esc(t('Topic'))}</th><th scope="col">SQLite</th><th scope="col">PostgreSQL</th><th scope="col">MySQL</th></tr></thead>
        <tbody>${DIFFS.map(([a, ...r]) => `<tr><th scope="row">${esc(t(a))}</th>${r.map((x) => `<td>${md(t(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </details>`;

  const editorRows = (text) => Math.min(16, Math.max(6, text.split('\n').length + 1));

  /* ---- Editor mode ---------------------------------------------------------------------- */

  function editorBody() {
    return `
      <div class="tl-row sq-examples" role="group" aria-label="${esc(t('Example queries (load and run)'))}">
        ${EXAMPLES.map((x, k) => `<button type="button" class="tl-chip sq-chip" data-action="sq-example" data-v="${k}" data-fid="sq-ex-${x.id}">${esc(t(x.label))}</button>`).join('')}
      </div>
      <div class="tl-field">
        <label for="sq-editor">${esc(t('Your SQL'))}</label>
        <textarea id="sq-editor" class="tl-code sq-code" rows="${editorRows(work.editor)}" data-sq="editor" data-fid="sq-editor" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(work.editor)}</textarea>
      </div>
      <p class="lr-actions">
        <button type="button" class="btn" data-action="sq-run" data-fid="sq-run">${esc(t('Run'))}</button>
        <button type="button" class="btn ghost" data-action="sq-reset" data-fid="sq-reset">${esc(t('Reset'))}</button>
        <span class="muted small">${esc(t('Ctrl+Enter runs · Tab indents · Esc then Tab leaves the editor'))}</span>
      </p>
      <div class="sq-out" data-part="out">${editorOut()}</div>`;
  }

  async function runEditor(root) {
    if (st.busy) return;
    st.busy = true;
    Tools.paint(root, { out: editorOut });
    try {
      const eng = await loadEngine();
      const db = makeDbFrom(eng)();
      const t0 = performance.now();
      try { st.out = { results: runScript(db, work.editor), ms: performance.now() - t0 }; } finally { db.close(); }
    } catch (e) {
      st.out = { loadError: true };
    }
    st.busy = false;
    Tools.each('sql-runner', (r) => Tools.paint(r, { out: editorOut }));
    const o = st.out;
    if (o.loadError) Tools.say(root, t('The SQL engine could not load'));
    else {
      const bad = o.results.find((r) => r.error);
      const last = o.results[o.results.length - 1];
      Tools.say(root, bad ? t('Statement {n} failed: {msg}', { n: bad.n, msg: bad.error })
        : !last ? t('Nothing to run')
          : `${o.results.length === 1 ? t('1 statement ran.') : t('{n} statements ran.', { n: o.results.length })} ${last.cols.length
            ? t('The last one returned {rows}.', { rows: rowsWord(last.rows.length) })
            : doneText(last)}`);
    }
  }

  /* ---- Challenges mode -------------------------------------------------------------------- */

  const challenge = () => CHALLENGES[st.ch] || CHALLENGES[0];
  const chText = (ch) => (typeof work.ch[ch.id] === 'string' ? work.ch[ch.id] : '');
  const solvedBadge = () => (solvedStore.isSolved(challenge().id) ? ` <span class="tl-ok small">${esc(t('solved'))}</span>` : '');

  function chOut() {
    if (st.busy && st.mode === 'challenges') return `<p class="meta">${esc(t('Loading the SQL engine (first run only) and checking…'))}</p>`;
    const o = st.chOut;
    if (!o) return '';
    if (o.loadError) return loadErrorHtml();
    const ch = challenge();
    return `<section class="feedback ${o.ok ? 'ok' : 'bad'} sq-verdict" aria-labelledby="sq-verdict-h">
        <h4 id="sq-verdict-h">${esc(o.ok ? t('Correct') : t('Not yet'))}</h4>
        <ul class="checks">${o.checks.map((c) => checkItem({ status: c.status, text: c.status === 'bad' && c.vars && c.vars.error ? t(c.msg, { ...c.vars, error: `\`${c.vars.error}\`` }) : t(c.msg, c.vars) })).join('')}</ul>
        ${o.error && explainError(o.error.error) ? `<p class="sq-hint">${md(t(explainError(o.error.error)))}</p>` : ''}
        ${o.got && o.got.cols.length ? `<p class="lr-label sq-your">${esc(ch.verify ? t('The table after your SQL (the check query)') : t('Your result'))}</p>${tableHtml(o.got.cols, o.got.rows, t('Your result'), 'sq-ch-res')}` : ''}
        ${o.ok && st.ch < CHALLENGES.length - 1 ? `<p class="lr-actions"><button type="button" class="btn small-btn" data-action="sq-pick" data-v="${st.ch + 1}" data-fid="sq-next">${esc(t('Next challenge'))}</button></p>` : ''}
      </section>`;
  }

  function challengesBody() {
    const ch = challenge();
    const text = chText(ch);
    return `
      ${Tools.challengePicker({ list: CHALLENGES, current: st.ch, store: solvedStore, action: 'sq-pick', label: t('SQL challenges') })}
      <div class="tl-goal">
        <p class="sq-ch-title">${esc(t('Challenge {n}: {title}', { n: st.ch + 1, title: t(ch.title) }))}<span data-part="badge">${solvedBadge()}</span></p>
        <p>${md(t(ch.prompt))}</p>
        <p class="muted small">${esc(ch.ordered ? t('The order of the rows matters here.') : t('Any row order is accepted; column names do not matter.'))}</p>
        <details class="sq-hintbox" data-fid="sq-hint-${ch.id}"><summary>${esc(t('Hint'))}</summary><p>${md(t(ch.hint))}</p></details>
      </div>
      <div class="tl-field">
        <label for="sq-ch-editor">${esc(t('Your SQL for challenge {n}', { n: st.ch + 1 }))}</label>
        <textarea id="sq-ch-editor" class="tl-code sq-code" rows="${editorRows(text || '\n\n\n')}" data-sq="ch" data-fid="sq-ch-editor" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="SELECT …">${esc(text)}</textarea>
      </div>
      <p class="lr-actions">
        <button type="button" class="btn" data-action="sq-check" data-fid="sq-check">${esc(t('Check'))}</button>
        <button type="button" class="btn ghost" data-action="sq-ch-clear" data-fid="sq-ch-clear">${esc(t('Clear'))}</button>
        <span class="muted small">${esc(t('Ctrl+Enter checks'))}</span>
      </p>
      <div class="sq-out" data-part="chout">${chOut()}</div>
      <details class="sq-sol" data-fid="sq-sol-${ch.id}"><summary>${esc(t('Show a solution'))}</summary>
        <pre class="sq-ddl"><code>${esc(ch.solution)}</code></pre>
        ${ch.verify ? `<p class="meta">${md(t('Checked with: `{q}`', { q: ch.verify }))}</p>` : ''}
      </details>`;
  }

  async function check(root) {
    if (st.busy) return;
    const ch = challenge();
    st.busy = true;
    Tools.paint(root, { chout: chOut });
    try {
      const eng = await loadEngine();
      st.chOut = checkChallenge(makeDbFrom(eng), ch, chText(ch));
    } catch (e) {
      st.chOut = { loadError: true };
    }
    st.busy = false;
    const o = st.chOut;
    if (o.ok) Tools.markSolved(root, { store: solvedStore, id: ch.id, action: 'sq-pick', index: st.ch });
    Tools.each('sql-runner', (r) => Tools.paint(r, { chout: chOut, badge: solvedBadge }));
    Tools.say(root, o.loadError ? t('The SQL engine could not load') : o.ok ? t('Correct: challenge {n} solved', { n: st.ch + 1 }) : t('Not yet: {why}', { why: t(o.checks[0].msg, o.checks[0].vars) }));
  }

  /* ---- Injection mode ---------------------------------------------------------------------- */

  function markInput(sql, input) {
    const at = sql.length - input.length - 1;   // the input sits just before the closing quote
    return `${esc(sql.slice(0, at))}<mark class="sq-mark">${esc(input)}</mark>${esc(sql.slice(at + input.length))}`;
  }

  function injOut() {
    if (st.busy && st.mode === 'inject') return `<p class="meta">${esc(t('Loading the SQL engine (first run only) and running…'))}</p>`;
    const o = st.inj.out;
    if (!o) return `<p class="muted small">${esc(t('Press “Run both” to send the input through each version.'))}</p>`;
    if (o.loadError) return loadErrorHtml();
    const u = o.unsafe;
    const bad = u.results.find((r) => r.error);
    const sel = u.results[0];
    const extra = u.results.length - 1;
    const total = TABLES[1].rows.length;
    const leftLine = (n) => `<p class="meta">${esc(t('Tasks left in the table afterwards: {n} of {total}.', { n, total }))}</p>`;
    const verdict = (rows, leaked) => (leaked
      ? `<p class="sq-flag is-bad">${ICON.bad}<span>${esc(t('Leak: rows of other users came back.'))}</span></p>`
      : `<p class="sq-flag is-ok">${ICON.ok}<span>${esc(rows ? t('Only the matching user\'s rows.') : t('No user has that email, so no rows: correct.'))}</span></p>`);
    // The placeholder version returns exactly the right rows; anything more is a leak.
    const unsafeLeak = !bad && sel && sel.rows.length > o.safe.rows.length;
    return `<div class="tl-cols sq-inj">
        <section class="sq-side" aria-labelledby="sq-inj-u">
          <h4 id="sq-inj-u" class="sq-side-h">${esc(t('Concatenated string (vulnerable)'))}</h4>
          <p class="lr-label">${esc(t('SQL text the database receives'))}</p>
          <pre class="sq-ddl"><code>${markInput(u.sql, o.input)}</code></pre>
          <p class="muted small">${esc(t('Highlighted: the part that came from the user. The database cannot tell it apart from your SQL.'))}</p>
          ${bad ? `<div class="feedback bad sq-err"><p><strong>${esc(t('Statement {n} failed', { n: bad.n }))}</strong></p><p><code>${esc(bad.error)}</code></p><p class="sq-hint">${esc(t('The input broke the SQL. An error like this is often the first clue an attacker looks for.'))}</p></div>` : ''}
          ${!bad && sel ? `${extra > 0 ? `<p class="sq-flag is-bad">${ICON.bad}<span>${esc(t('The input added {n} more statement(s) to your SQL, and they ran.', { n: extra }))}</span></p>` : ''}
            ${sel.rows.length ? tableHtml(sel.cols, sel.rows, t('Rows returned by the concatenated query'), 'sq-inj-u-res') : `<p class="meta">${esc(t('No rows match.'))}</p>`}
            ${verdict(sel.rows.length, unsafeLeak)}` : ''}
          ${leftLine(u.left)}
        </section>
        <section class="sq-side" aria-labelledby="sq-inj-s">
          <h4 id="sq-inj-s" class="sq-side-h">${esc(t('Placeholder $1 (safe)'))}</h4>
          <p class="lr-label">${esc(t('SQL text (fixed) and the value, sent separately'))}</p>
          <pre class="sq-ddl"><code>${esc(INJ_SAFE)}\n-- params: ${esc(JSON.stringify([o.input]))}</code></pre>
          <p class="muted small">${esc(t('The whole input is one text value compared with email. Quotes inside it are just characters.'))}</p>
          ${o.safe.rows.length ? tableHtml(o.safe.cols, o.safe.rows, t('Rows returned by the parameterised query'), 'sq-inj-s-res') : `<p class="meta">${esc(t('No rows match.'))}</p>`}
          ${verdict(o.safe.rows.length, false)}
          ${leftLine(o.safe.left)}
        </section>
      </div>`;
  }

  function injectBody() {
    return `
      <p class="tl-explain">${md(t('A search box sends an email to `GET /tasks?email=…`, and the model looks up that user\'s tasks. Type what a user (or an attacker) could type, and compare the two ways of building the query. The code in Node:'))}</p>
      <div class="tl-cols sq-inj-code">
        <pre class="sq-ddl" aria-label="${esc(t('Vulnerable Node code'))}"><code>${esc('// Vulnerable: the input becomes part of the SQL\nconst sql = "SELECT t.id, t.title FROM tasks t " +\n  "JOIN users u ON u.id = t.user_id " +\n  "WHERE u.email = \'" + email + "\'";\nconst { rows } = await pool.query(sql);')}</code></pre>
        <pre class="sq-ddl" aria-label="${esc(t('Safe Node code'))}"><code>${esc('// Safe: fixed SQL, the value travels apart\nconst { rows } = await pool.query(\n  "SELECT t.id, t.title FROM tasks t " +\n  "JOIN users u ON u.id = t.user_id " +\n  "WHERE u.email = $1",\n  [email]\n);')}</code></pre>
      </div>
      <div class="tl-field sq-inj-field">
        <label for="sq-inj">${esc(t('What the user typed in the email box'))}</label>
        <input id="sq-inj" class="tl-input sq-mono" type="text" data-sq="inj" data-fid="sq-inj" value="${esc(st.inj.input)}" spellcheck="false" autocomplete="off" autocapitalize="off">
      </div>
      <div class="tl-row sq-examples" role="group" aria-label="${esc(t('Inputs to try'))}">
        ${INJ_PRESETS.map((p, k) => `<button type="button" class="tl-chip" data-action="sq-inj-preset" data-v="${k}" data-fid="sq-inj-p${k}"><code>${esc(p)}</code></button>`).join('')}
      </div>
      <p class="lr-actions"><button type="button" class="btn" data-action="sq-inj-run" data-fid="sq-inj-run">${esc(t('Run both'))}</button>
        <span class="muted small">${esc(t('Enter runs'))}</span></p>
      <div class="sq-out" data-part="inj">${injOut()}</div>
      <p class="meta">${md(t('With no parameters, pg sends the text as a simple query, which may hold several statements: that is how `x\'; DELETE FROM tasks; --` deletes data. mysql2 refuses several statements unless `multipleStatements` is on, but the `OR` tricks work on both. Placeholders stop all of them.'))}</p>`;
  }

  async function runInject(root) {
    if (st.busy) return;
    st.busy = true;
    Tools.paint(root, { inj: injOut });
    try {
      const eng = await loadEngine();
      st.inj.out = { ...runInjection(makeDbFrom(eng), st.inj.input), input: st.inj.input };
    } catch (e) {
      st.inj.out = { loadError: true };
    }
    st.busy = false;
    Tools.each('sql-runner', (r) => Tools.paint(r, { inj: injOut }));
    const o = st.inj.out;
    if (o.loadError) { Tools.say(root, t('The SQL engine could not load')); return; }
    const sel = o.unsafe.results[0];
    const bad = o.unsafe.results.find((r) => r.error);
    Tools.say(root, t('Concatenated: {u}. Placeholder: {s}.', {
      u: bad ? t('error in statement {n}', { n: bad.n }) : t('{rows}, {left} tasks left', { rows: rowsWord(sel ? sel.rows.length : 0), left: o.unsafe.left }),
      s: t('{rows}, {left} tasks left', { rows: rowsWord(o.safe.rows.length), left: o.safe.left }),
    }));
  }

  /* ---- Registration -------------------------------------------------------------------- */

  const MODES = [['editor', 'SQL editor'], ['challenges', 'Challenges'], ['inject', 'SQL injection demo']];

  Tools.register('sql-runner', {
    title: 'SQL runner',
    intro: 'Real SQL on a small Tasks database, run by SQLite in your browser. Write queries, solve the challenges, and see why placeholders stop SQL injection.',
    challenges: { store: solvedStore, label: 'SQL challenges', ids: () => CHALLENGES.map((c) => c.id) },
    workKey: workStore.key,
    body() {
      const inner = st.mode === 'challenges' ? challengesBody() : st.mode === 'inject' ? injectBody() : editorBody();
      return `
        <p class="sq-tag">${esc(t('SQLite in your browser; production APIs usually run PostgreSQL or MySQL — differences noted where they matter.'))}</p>
        <div class="tl-row">${Tools.seg({ label: t('Mode'), action: 'sq-mode', prop: 'mode', values: MODES.map(([v, l]) => [v, t(l)]), current: st.mode, fid: 'sq-mode', mono: false })}</div>
        ${schemaHtml()}
        ${diffHtml()}
        <div class="sq-mode">${inner}</div>`;
    },
    mount(root) {
      const card = root.closest('article.concept');
      const id = card ? card.id : '';
      if (id === st.card) return;
      st.card = id;
      const m = CARD_MODE[id];
      if (m && m !== st.mode) {
        st.mode = m;
        Tools.refresh('sql-runner');
      }
    },
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'sq-mode') {
        st.mode = el.dataset.v;
        Tools.refresh('sql-runner');
        Tools.say(root, t('Mode: {m}', { m: t((MODES.find(([v]) => v === st.mode) || MODES[0])[1]) }));
      } else if (a === 'sq-run') runEditor(root);
      else if (a === 'sq-reset') {
        work.editor = DEFAULT_SQL;
        workStore.save(work);
        st.out = null;
        Tools.refresh('sql-runner');
        Tools.say(root, t('Editor reset to the starting query'));
      } else if (a === 'sq-example') {
        const x = EXAMPLES[+el.dataset.v];
        if (!x) return;
        work.editor = x.sql;
        workStore.save(work);
        st.out = null;
        Tools.refresh('sql-runner');
        runEditor(root);
      } else if (a === 'sq-pick') {
        const k = +el.dataset.v;
        if (!CHALLENGES[k]) return;
        st.ch = k;
        st.chOut = null;
        Tools.refresh('sql-runner');
        Tools.say(root, t('Challenge {n}: {title}', { n: k + 1, title: t(CHALLENGES[k].title) }));
        if (el.dataset.fid === 'sq-next') {
          const ed = root.querySelector('#sq-ch-editor');
          if (ed) ed.focus();
        }
      } else if (a === 'sq-check') check(root);
      else if (a === 'sq-ch-clear') {
        work.ch[challenge().id] = '';
        workStore.save(work);
        st.chOut = null;
        Tools.refresh('sql-runner');
        const ed = root.querySelector('#sq-ch-editor');
        if (ed) ed.focus();
        Tools.say(root, t('Editor cleared'));
      } else if (a === 'sq-inj-preset') {
        st.inj.input = INJ_PRESETS[+el.dataset.v] || '';
        Tools.refresh('sql-runner');
        runInject(root);
      } else if (a === 'sq-inj-run') runInject(root);
    },
    onInput(e) {
      const k = e.target.dataset.sq;
      if (k === 'editor') { work.editor = e.target.value; saveWork(); } else if (k === 'ch') { work.ch[challenge().id] = e.target.value; saveWork(); } else if (k === 'inj') st.inj.input = e.target.value;
    },
    onKeydown(e, root) {
      const k = e.target.dataset.sq;
      if (k === 'editor') codeEditorKeydown(e, () => runEditor(root));
      else if (k === 'ch') codeEditorKeydown(e, () => check(root));
      else if (k === 'inj' && e.key === 'Enter') { e.preventDefault(); runInject(root); }
    },
  });
})();
