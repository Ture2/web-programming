// Unit tests for the SQL runner's pure part (site/js/tools/sql-runner.js), run against the
// vendored SQLite engine (site/vendor/sql.js), so every challenge and example is checked
// on the real database the page uses.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const E = require('../js/tools/sql-runner.js');
const VENDOR = fileURLToPath(new URL('../vendor/sql.js/', import.meta.url));
const initSqlJs = require('../vendor/sql.js/sql-wasm.js');
const SQL = await initSqlJs({ locateFile: (f) => VENDOR + f });
const IMAGE = E.buildImage(SQL);
const makeDb = () => E.freshDb(SQL, IMAGE);
const run = (text) => { const db = makeDb(); try { return E.runScript(db, text); } finally { db.close(); } };
const byId = (id) => E.CHALLENGES.find((c) => c.id === id);

/* ---- Splitting ------------------------------------------------------------------- */

test('splitStatements: semicolons inside strings and comments do not split', () => {
  const s = E.splitStatements("SELECT 'a;b';\n-- c; d\nSELECT 2 /* ; */ ;\n\nSELECT 'it''s; ok'");
  assert.deepEqual(s.map((x) => x.text), ["SELECT 'a;b'", '-- c; d\nSELECT 2 /* ; */', "SELECT 'it''s; ok'"]);
  assert.deepEqual(s.map((x) => x.line), [1, 3, 5]);
});

test('splitStatements: comment-only and empty pieces are dropped', () => {
  assert.deepEqual(E.splitStatements('-- just a note\n;;  \n/* x */'), []);
  assert.equal(E.splitStatements('SELECT 1; -- trailing note').length, 1);
});

test('stmtKind reads the first keyword', () => {
  assert.equal(E.stmtKind('-- hi\n  select 1'), 'select');
  assert.equal(E.stmtKind('(SELECT 1)'), 'select');
  assert.equal(E.stmtKind('WITH x AS (SELECT 1) SELECT * FROM x'), 'select');
  assert.equal(E.stmtKind('WITH x AS (SELECT 1) DELETE FROM tasks'), 'delete');
  assert.equal(E.stmtKind('update tasks set done = 1'), 'update');
  assert.equal(E.stmtKind('BEGIN'), 'begin');
  assert.equal(E.stmtKind('EXPLAIN QUERY PLAN SELECT 1'), 'select');
});

/* ---- Warnings and error hints ---------------------------------------------------- */

test('warnings: UPDATE / DELETE without WHERE', () => {
  assert.deepEqual(E.warnings('UPDATE tasks SET done = TRUE').map((w) => w.code), ['no-where']);
  assert.deepEqual(E.warnings('DELETE FROM tasks').map((w) => w.code), ['no-where']);
  assert.deepEqual(E.warnings('DELETE FROM tasks WHERE id = 1'), []);
  assert.deepEqual(E.warnings("UPDATE tasks SET title = 'where' -- WHERE\n"), [{ code: 'no-where', msg: E.warnings('UPDATE x SET a = 1')[0].msg }]);
});

test('warnings: = NULL, LIMIT without ORDER BY, double-quoted text', () => {
  assert.ok(E.warnings('SELECT * FROM tasks WHERE due_date = NULL').some((w) => w.code === 'eq-null'));
  assert.ok(!E.warnings('SELECT * FROM tasks WHERE due_date IS NULL').length);
  assert.ok(E.warnings('SELECT * FROM tasks LIMIT 3').some((w) => w.code === 'limit-no-order'));
  assert.ok(!E.warnings('SELECT * FROM tasks ORDER BY id LIMIT 3').length);
  assert.ok(E.warnings('SELECT * FROM users WHERE email = "ana@example.com"').some((w) => w.code === 'double-quotes'));
  assert.ok(!E.warnings("SELECT * FROM users WHERE email = 'say \"hi\"'").some((w) => w.code === 'double-quotes'));
});

test('explainError gives a hint for the common SQLite errors', () => {
  const errs = run("INSERT INTO tasks (user_id, title) VALUES (99, 'x')");
  assert.match(errs[0].error, /FOREIGN KEY/);
  assert.match(E.explainError(errs[0].error), /foreign key/i);
  assert.match(E.explainError('UNIQUE constraint failed: users.email'), /users\.email/);
  assert.match(E.explainError('NOT NULL constraint failed: tasks.title'), /tasks\.title/);
  assert.match(E.explainError('no such column: titel'), /titel/);
  assert.match(E.explainError('ambiguous column name: id'), /t\.id/);
  assert.match(E.explainError('near "SELEC": syntax error'), /order of the clauses/);
  assert.equal(E.explainError('something new'), '');
});

/* ---- Running scripts ------------------------------------------------------------- */

test('seed: the sample database has the expected rows and enforces its constraints', () => {
  const r = run('SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM tasks; SELECT COUNT(*) FROM task_tags');
  assert.deepEqual(r.map((x) => x.rows[0][0]), [4, 9, 7]);
  assert.match(run("INSERT INTO users (email) VALUES ('ana@example.com')")[0].error, /UNIQUE/);
  assert.match(run("INSERT INTO tasks (user_id, title) VALUES (1, '')")[0].error, /CHECK/);
  assert.match(run('INSERT INTO tasks (user_id) VALUES (1)')[0].error, /NOT NULL/);
});

test('runScript: one result per statement, rows changed, stops at the first error', () => {
  const r = run('UPDATE tasks SET done = TRUE WHERE user_id = 1; SELECT id FROM tasks WHERE done = FALSE ORDER BY id; SELEC 1; SELECT 2');
  assert.equal(r.length, 3);
  assert.equal(r[0].changed, 4);
  assert.deepEqual(r[1].rows, [[5], [7], [9]]);
  assert.match(r[2].error, /syntax error/);
});

test('runScript: zero-row SELECTs keep their column names; every run starts fresh', () => {
  const r = run("SELECT id, title FROM tasks WHERE title = 'nope'");
  assert.deepEqual(r[0].cols, ['id', 'title']);
  assert.equal(r[0].rows.length, 0);
  run('DELETE FROM tasks');
  assert.equal(run('SELECT COUNT(*) FROM tasks')[0].rows[0][0], 9);
});

test('runScript: ON DELETE CASCADE and transactions behave as the cards say', () => {
  const c = run("DELETE FROM users WHERE email = 'ben@example.com'; SELECT COUNT(*) FROM tasks WHERE user_id = 2; SELECT COUNT(*) FROM task_tags");
  assert.equal(c[1].rows[0][0], 0);
  assert.equal(c[2].rows[0][0], 5);
  const tx = run('BEGIN; DELETE FROM tasks; ROLLBACK; SELECT COUNT(*) FROM tasks');
  assert.equal(tx[3].rows[0][0], 9);
});

test('runScript: WITH RECURSIVE is refused and the row cap holds', () => {
  assert.match(run('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) SELECT x FROM n')[0].error, /RECURSIVE/);
  const db = makeDb();
  try {
    const r = E.runScript(db, 'SELECT * FROM tasks a, tasks b, tasks c, tasks d', { maxRows: 100 });
    assert.equal(r[0].rows.length, 100);
    assert.equal(r[0].more, true);
  } finally { db.close(); }
});

test('every example runs; only the constraints example fails, at its first statement', () => {
  for (const x of E.EXAMPLES) {
    const r = run(x.sql);
    const bad = r.find((s) => s.error);
    if (x.id === 'constraints') assert.equal(bad && bad.n, 1, x.id);
    else assert.equal(bad, undefined, `${x.id}: ${bad && bad.error}`);
  }
  assert.equal(run(E.DEFAULT_SQL)[0].rows.length, 4);
});

test('the index example shows a SEARCH using the index and a SCAN without it', () => {
  const r = run(E.EXAMPLES.find((x) => x.id === 'index').sql);
  assert.match(r[0].rows.map((row) => row[3]).join(' '), /USING (COVERING )?INDEX tasks_user_id_idx/);
  assert.match(r[1].rows.map((row) => row[3]).join(' '), /^SCAN/);
});

/* ---- Comparing and checking -------------------------------------------------------- */

test('compareResults: columns, rows, values, order', () => {
  const want = { cols: ['a'], rows: [[1], [2]] };
  assert.equal(E.compareResults({ cols: ['a', 'b'], rows: [[1, 1], [2, 2]] }, want).reason, 'cols');
  assert.equal(E.compareResults({ cols: ['x'], rows: [[1]] }, want).reason, 'rows');
  assert.equal(E.compareResults({ cols: ['x'], rows: [[1], [3]] }, want).reason, 'values');
  assert.equal(E.compareResults({ cols: ['x'], rows: [[2], [1]] }, want).ok, true);
  assert.equal(E.compareResults({ cols: ['x'], rows: [[2], [1]] }, want, true).reason, 'order');
  assert.equal(E.compareResults({ cols: ['x'], rows: [[1.00001], [2]] }, want).ok, true);
});

test('every challenge: its solution passes and returns rows', () => {
  assert.ok(E.CHALLENGES.length >= 8);
  assert.equal(new Set(E.CHALLENGES.map((c) => c.id)).size, E.CHALLENGES.length);
  for (const ch of E.CHALLENGES) {
    const r = E.checkChallenge(makeDb, ch, ch.solution);
    assert.equal(r.ok, true, `${ch.id}: ${JSON.stringify(r.checks)}`);
    assert.ok(r.got.rows.length > 0, ch.id);
  }
});

test('challenges reject the classic mistakes', () => {
  const no = (id, sql, reason) => {
    const r = E.checkChallenge(makeDb, byId(id), sql);
    assert.equal(r.ok, false, `${id} accepted: ${sql}`);
    if (reason) assert.match(r.checks.map((c) => c.msg.replace(/\{(\w+)\}/g, (m, k) => (c.vars && k in c.vars ? c.vars[k] : m))).join(' | '), reason);
    return r;
  };
  no('count-per-user', 'SELECT u.email, COUNT(*) FROM users u LEFT JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.email', /values differ/);
  no('count-per-user', 'SELECT u.email, COUNT(*) FROM users u JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.email', /rows/);
  no('no-due-date', 'SELECT id, title FROM tasks WHERE done = FALSE AND due_date = NULL', /NULL/);
  no('finish-task', 'UPDATE tasks SET done = TRUE', /values differ/);
  no('page-two', 'SELECT id, title FROM tasks ORDER BY id DESC LIMIT 4 OFFSET 4', /values differ|order/);
  no('newest-three', 'SELECT id, title FROM tasks WHERE id >= 7', /order/);
  no('ana-join', "SELECT title FROM tasks WHERE user_id = 1", /JOIN/);
  no('open-tasks', 'SELECT id FROM tasks WHERE done = FALSE', /columns/);
  no('delete-done', 'DELETE FROM tasks', /rows/);
  no('open-tasks', '', /first/);
  no('add-task', "INSERT INTO tasks (user_id, title) VALUES (33, 'Write tests')", /failed/);
  no('open-tasks', 'UPDATE tasks SET done = FALSE WHERE id = 1', /must end with a SELECT/);
});

test('challenges accept other correct answers', () => {
  const yes = (id, sql) => assert.equal(E.checkChallenge(makeDb, byId(id), sql).ok, true, `${id}: ${sql}`);
  yes('open-tasks', 'select id, title from tasks where done = 0 order by title');
  yes('no-tasks', 'SELECT email FROM users WHERE id NOT IN (SELECT user_id FROM tasks)');
  yes('finish-task', "UPDATE tasks SET done = 1 WHERE title = 'Set up CI'");
  yes('add-task', "INSERT INTO tasks (user_id, title, done, due_date) VALUES (3, 'Write tests', FALSE, NULL);");
  yes('ana-join', "SELECT t.title FROM users u INNER JOIN tasks t ON t.user_id = u.id WHERE u.email = 'ana@example.com' ORDER BY t.title");
});

/* ---- Injection demo ------------------------------------------------------------------ */

test('injection: concatenation leaks or deletes, the placeholder does not', () => {
  assert.equal(E.injectionSql("' OR '1'='1"), "SELECT t.id, t.title FROM tasks t JOIN users u ON u.id = t.user_id WHERE u.email = '' OR '1'='1'");
  const normal = E.runInjection(makeDb, 'ana@example.com');
  assert.equal(normal.unsafe.results[0].rows.length, 4);
  assert.equal(normal.safe.rows.length, 4);
  const leak = E.runInjection(makeDb, "' OR '1'='1");
  assert.equal(leak.unsafe.results[0].rows.length, 9);
  assert.equal(leak.safe.rows.length, 0);
  const comment = E.runInjection(makeDb, "x' OR 1=1 --");
  assert.equal(comment.unsafe.results[0].rows.length, 9);
  const stacked = E.runInjection(makeDb, "x'; DELETE FROM tasks; --");
  assert.equal(stacked.unsafe.results.length, 2);
  assert.equal(stacked.unsafe.left, 0);
  assert.equal(stacked.safe.left, 9);
  const broken = E.runInjection(makeDb, "O'Brien");
  assert.ok(broken.unsafe.results[0].error);
  assert.equal(broken.safe.rows.length, 0);
});

test('seedSql writes valid literals', () => {
  assert.equal(E.sqlLiteral("it's"), "'it''s'");
  assert.equal(E.sqlLiteral(null), 'NULL');
  assert.equal(E.sqlLiteral(false), 'FALSE');
  assert.match(E.seedSql(), /CREATE TABLE task_tags/);
});
