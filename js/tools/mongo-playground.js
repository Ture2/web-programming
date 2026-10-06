'use strict';

/* ==========================================================================
   mongo-playground: the document query playground (MongoDB syntax as the worked example).
   An in-memory database "app" (collections tasks and users, js/tools/mongo-engine.js)
   that the student queries with shell commands: find with filters, projection,
   sort/skip/limit, countDocuments, aggregate, and writes (insertOne, updateOne,
   updateMany, deleteOne, deleteMany) whose effect persists until "Reset data".
   Every result shows the documents, notes that explain surprises, and "the same
   query in SQL" when the mapping onto the relational tasks/users schema is simple.
   Nothing the student types is evaluated as JavaScript: the engine parses it.
   Challenges: MongoEngine.CHALLENGES, each with its own copy of the data;
   solved ones in challengeStore 'mongo-challenges-v1' (progress page).
   ========================================================================== */

(() => {
  const store = challengeStore('mongo-challenges-v1');
  const CH = MongoEngine.CHALLENGES;
  const EX = MongoEngine.EXAMPLES;
  const FREE_CODE = 'db.tasks.find({ done: false }, { title: 1, _id: 0 })';
  const MAX_DOCS = 50;

  const modes = {};                          // 'free' | challenge id → { db, code, results, check }
  let mode = 'free';
  const view = { coll: 'tasks', ejson: false, example: 0 };

  const challenge = () => CH.find((c) => c.id === mode) || null;
  function current() {
    if (!modes[mode]) {
      const ch = challenge();
      modes[mode] = { db: MongoEngine.createDb(), code: ch ? `// ${ch.title}\ndb.tasks.find()` : FREE_CODE, results: null, check: null };
    }
    return modes[mode];
  }

  /* ---- Rendering ---------------------------------------------------------------- */

  const fmt = (v) => MongoEngine.format(v, { ejson: view.ejson });
  const pre = (text, label, fid) => `<div class="scroll mg-scroll"><pre class="mg-json" tabindex="0" role="region" aria-label="${esc(label)}" data-fid="${fid}"><code>${esc(text)}</code></pre></div>`;
  const firstLine = (src) => { const l = src.split('\n').filter((x) => !/^\s*\/\//.test(x)); const s = (l[0] || src.split('\n')[0]).trim(); return l.length > 1 ? `${s} …` : s; };

  function resultHtml(r, k) {
    if (!r.ok) {
      const e = r.error;
      return `<div class="mg-result is-error">
          <p class="mg-head">${ICON.bad}<span><strong>${esc(e.kind === 'syntax' ? t('Syntax error') : t('MongoDB error'))}</strong>${e.line ? ` <span class="muted small">${esc(t('line {l}, column {c}', { l: e.line, c: e.col }))}</span>` : ''}</span></p>
          <p class="mg-msg">${esc(e.message)}</p>
          ${e.excerpt ? `<div class="scroll"><pre class="mg-excerpt" aria-hidden="true"><code>${esc(e.excerpt)}</code></pre></div>` : ''}
        </div>`;
    }
    let body = '';
    if (r.kind === 'docs') {
      const shown = r.docs.slice(0, MAX_DOCS);
      body = shown.length ? pre(shown.map(fmt).join(view.ejson ? ',\n' : '\n'), t('Result of command {n}', { n: k + 1 }), `mg-res-${k}`) : `<p class="muted mg-empty">${esc(t('No documents.'))}</p>`;
      if (r.docs.length > MAX_DOCS) body += `<p class="muted small">${esc(t('Showing the first {n}.', { n: MAX_DOCS }))}</p>`;
    } else if (r.kind !== 'info' || r.value !== undefined) body = pre(fmt(r.value), t('Result of command {n}', { n: k + 1 }), `mg-res-${k}`);
    const notes = r.notes.length ? `<ul class="checks mg-notes">${r.notes.map((n) => checkItem({ status: 'note', text: n })).join('')}</ul>` : '';
    const sql = r.sql ? `<details class="mg-sql" data-fid="mg-sql-${k}">
          <summary>${esc(r.sql.sql ? t('The same in SQL') : t('Why there is no simple SQL version'))}</summary>
          ${r.sql.sql ? `<div class="scroll"><pre class="mg-sqlcode"><code>${esc(r.sql.sql)}</code></pre></div><p class="muted small">${esc(t('On a relational tasks/users schema: tasks(id, user_id, title, done, …) and users(id, name, email, …); arrays and comments as child tables.'))}</p>` : `<p>${md(r.sql.why)}</p>`}
        </details>` : '';
    return `<div class="mg-result">
        <p class="mg-head">${ICON.ok}<span><code class="mg-cmd">${esc(firstLine(r.src))}</code> <strong class="mg-count">${esc(r.message)}</strong></span></p>
        ${notes}${body}${sql}
      </div>`;
  }

  function outHtml() {
    const s = current();
    if (!s.results) return `<p class="muted small">${esc(t('Results appear here. Ctrl+Enter runs the command.'))}</p>`;
    const failed = s.results.length && !s.results[s.results.length - 1].ok;
    return `${s.results.map(resultHtml).join('')}${failed && s.results.length > 1 ? `<p class="muted small">${esc(t('The commands after the error were not run.'))}</p>` : ''}`;
  }

  function statusHtml() {
    const ch = challenge();
    const s = current();
    if (!ch || !s.check) return '';
    const k = CH.indexOf(ch);
    const next = CH.findIndex((c, i) => i > k && !store.isSolved(c.id));
    return `<p class="mg-status${s.check.ok ? ' is-ok' : ''}">${Tools.statusHtml({
      ok: s.check.ok, okText: t('Solved!'), notYet: s.check.reason,
      next: next >= 0 ? { action: 'mg-pick', v: next, label: t('Next challenge') } : null,
    })}</p>`;
  }

  function dataHtml() {
    const db = current().db;
    const names = Object.keys(db.collections).sort();
    if (!names.includes(view.coll)) view.coll = names.includes('tasks') ? 'tasks' : names[0];
    const docs = view.coll ? db.collections[view.coll] : [];
    const ix = view.coll ? (db.indexes[view.coll] || []).map((i) => i.name + (i.unique && i.name !== '_id_' ? ' (unique)' : '')) : [];
    return `<div class="tl-row mg-datactl">
        ${Tools.seg({ label: t('Collection'), action: 'mg-coll', prop: 'coll', values: names.map((n) => [n, `${n} (${db.collections[n].length})`]), current: view.coll, fid: 'mg-coll', mono: true })}
        ${Tools.seg({ label: t('Show as'), action: 'mg-fmt', prop: 'fmt', values: [['shell', t('Shell')], ['ejson', t('Extended JSON')]], current: view.ejson ? 'ejson' : 'shell', fid: 'mg-fmt', mono: false })}
      </div>
      <p class="muted small mg-ix">${esc(t('Indexes: {list}', { list: ix.join(', ') || '—' }))}</p>
      ${docs.length ? pre(docs.map(fmt).join(view.ejson ? ',\n' : '\n'), t('Documents in {c}', { c: view.coll }), 'mg-data-pre') : `<p class="muted">${esc(t('This collection is empty.'))}</p>`}
      ${view.ejson ? `<p class="muted small">${md(t('Extended JSON is how BSON travels as text: an ObjectId becomes `{"$oid": …}` and a date `{"$date": …}`, because plain JSON has neither type.'))}</p>` : ''}`;
  }

  const PARTS = { out: outHtml, data: dataHtml, status: statusHtml };
  const repaint = (root) => keepFocus(() => Tools.paint(root, PARTS));

  /* ---- Actions ---------------------------------------------------------------------- */

  function run(root) {
    const s = current();
    const ta = root.querySelector('[data-mg="code"]');
    if (ta) s.code = ta.value;
    let out;
    try {
      out = MongoEngine.run(s.db, s.code);
    } catch (e) {
      out = { results: [{ ok: false, src: s.code, kind: 'error', error: { kind: 'server', message: t('The playground could not run this command ({msg}). Simplify it and try again.', { msg: e.message }) } }] };
    }
    s.results = out.results;
    const ch = challenge();
    s.check = ch ? MongoEngine.checkChallenge(ch.id, s.db, s.results) : null;
    if (ta) ta.setAttribute('aria-invalid', String(s.results.some((r) => !r.ok)));
    const lastR = s.results[s.results.length - 1];
    let msg = lastR.ok ? lastR.message : t('Error: {msg}', { msg: lastR.error.message });
    if (s.check && s.check.ok) {
      Tools.markSolved(root, { store, id: ch.id, action: 'mg-pick', index: CH.indexOf(ch) });
      msg += `. ${t('Challenge solved!')}`;
    } else if (s.check) msg += `. ${s.check.reason}`;
    repaint(root);
    Tools.say(root, msg);
  }

  /* ---- The tool ------------------------------------------------------------------------- */

  Tools.register('mongo-playground', {
    title: 'Document query playground',
    intro: 'A small MongoDB database in your browser, with a `tasks` and a `users` collection. Type shell commands such as `db.tasks.find({ done: false })`, run them, and compare each result with the same query in SQL. Writes change the data until you reset it.',
    challenges: { store, label: 'MongoDB challenges', ids: () => CH.map((c) => c.id) },
    body(root, opts = {}) {
      const s = current();
      const ch = challenge();
      const k = ch ? CH.indexOf(ch) : -1;
      const lines = Math.min(14, Math.max(4, s.code.split('\n').length + 1));
      return `
        ${Tools.challengePicker({ list: CH, current: ch ? k : 'free', store, action: 'mg-pick', label: t('MongoDB challenges'), free: { value: 'free', label: t('Free play') } })}
        ${ch ? `<div class="tl-goal mg-goal">
            <p class="mg-goal-title"><strong>${esc(t('Challenge {n}: {title}', { n: k + 1, title: t(ch.title) }))}</strong>${store.isSolved(ch.id) ? ` <span class="tl-ok small">${esc(t('solved'))}</span>` : ''}</p>
            <p>${md(t(ch.goal))}</p>
            <details class="pg-hint" data-fid="mg-hint"><summary>${esc(t('Hint'))}</summary><p>${md(t(ch.hint))}</p></details>
          </div>` : `<p class="muted mg-free">${md(t('Free play: try the examples, or anything from the cards. Each challenge has its own copy of the data.'))}</p>`}
        <div class="mg-cols${opts.full ? ' is-full' : ''}">
          <div class="mg-main">
            <div class="tl-row mg-exrow">
              ${Tools.select({ label: t('Example'), fid: 'mg-ex', options: EX.map((e, i) => [i, t(e.title)]), current: view.example, data: { mg: 'example' }, cls: 'mg-exsel' })}
              <button type="button" class="btn ghost" data-action="mg-load" data-fid="mg-load">${esc(t('Load example'))}</button>
            </div>
            <div class="tl-field">
              <label for="mg-code">${esc(t('Command (shell syntax)'))}</label>
              <textarea id="mg-code" class="tl-code mg-code" rows="${lines}" data-mg="code" data-fid="mg-code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="mg-keys">${esc(s.code)}</textarea>
            </div>
            <p class="lr-actions">
              <button type="button" class="btn" data-action="mg-run" data-fid="mg-run">${esc(t('Run'))}</button>
              <button type="button" class="btn ghost" data-action="mg-reset" data-fid="mg-reset">${esc(t('Reset data'))}</button>
              <span class="muted small" id="mg-keys">${esc(t('Ctrl+Enter runs · several commands run in order · Esc then Tab leaves the editor'))}</span>
            </p>
            <div data-part="status">${statusHtml()}</div>
            <div class="mg-out" data-part="out">${outHtml()}</div>
          </div>
          <details class="mg-data" data-fid="mg-data"${opts.full ? ' open' : ''}>
            <summary>${esc(t('The data'))}</summary>
            <div data-part="data">${dataHtml()}</div>
          </details>
        </div>`;
    },
    onClick(el, root) {
      const a = el.dataset.action;
      const s = current();
      if (a === 'mg-run') run(root);
      else if (a === 'mg-pick') {
        const ta = root.querySelector('[data-mg="code"]');
        if (ta) s.code = ta.value;
        const fromNext = !!el.closest('.mg-status');      // the "Next challenge" button disappears: focus the editor
        mode = el.dataset.v === 'free' ? 'free' : CH[+el.dataset.v].id;
        Tools.refresh('mongo-playground');
        const ch = challenge();
        if (fromNext) { const code = root.querySelector('[data-mg="code"]'); if (code) code.focus(); }
        Tools.say(root, ch ? t('Challenge {n}: {title}', { n: CH.indexOf(ch) + 1, title: t(ch.title) }) : t('Free play'));
      } else if (a === 'mg-load') {
        const ex = EX[view.example];
        s.code = ex.code;
        const ta = root.querySelector('[data-mg="code"]');
        if (ta) {
          ta.value = ex.code;
          ta.rows = Math.min(14, Math.max(4, ex.code.split('\n').length + 1));
          ta.focus();
        }
        Tools.say(root, t('Example loaded: {title}. Press Run or Ctrl+Enter.', { title: t(ex.title) }));
      } else if (a === 'mg-reset') {
        s.db = MongoEngine.createDb();
        s.results = null;
        s.check = null;
        repaint(root);
        Tools.say(root, t('Data reset: 10 tasks and 3 users.'));
      } else if (a === 'mg-coll') {
        view.coll = el.dataset.v;
        repaint(root);
        Tools.say(root, t('Showing {c}', { c: view.coll }));
      } else if (a === 'mg-fmt') {
        view.ejson = el.dataset.v === 'ejson';
        repaint(root);
        Tools.say(root, view.ejson ? t('Showing Extended JSON') : t('Showing shell format'));
      }
    },
    onChange(e) {
      if (e.target.dataset.mg === 'example') view.example = +e.target.value;
    },
    onInput(e) {
      if (e.target.dataset.mg === 'code') current().code = e.target.value;
    },
    onKeydown(e, root) {
      if (e.target.dataset.mg === 'code') codeEditorKeydown(e, () => run(root));
    },
  });
})();
