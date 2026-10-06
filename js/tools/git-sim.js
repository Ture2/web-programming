'use strict';

/* ==========================================================================
   Tool "git-sim": the commit and branch simulator. A terminal (type real git commands), the
   four places your work lives (working directory, staging area, local
   repository, remote origin) and a commit graph, all redrawn after every
   command, with a plain-English line explaining what changed.
   Challenges come from GIT_SIM_CHALLENGES ({ id, title, goal, hint, start,
   check }, data/<lang>/git.js).
   The model and commands live in js/tools/git-engine.js (GitEngine).
   Solved challenges: challengeStore 'git-challenges-v1' (counts towards progress).
   ========================================================================== */

(() => {
  const store = challengeStore('git-challenges-v1');
  const MAX_LOG = 120;

  const FREE = { id: 'free', start: { files: { 'index.html': 'untracked', 'styles.css': 'untracked' }, init: false } };

  const CHALLENGES = langData('GIT_SIM_CHALLENGES', []);

  const sims = {};                       // mode id → { state, log, history, hpos, draft, explain, hint }
  let mode = null;

  const findChallenge = (id) => CHALLENGES.find((c) => c.id === id) || null;
  const startOf = (id) => (id === 'free' ? FREE.start : (findChallenge(id) || {}).start || {});

  function currentMode() {
    if (mode && (mode === 'free' || findChallenge(mode))) return mode;
    const next = CHALLENGES.find((c) => !store.isSolved(c.id));
    mode = next ? next.id : 'free';
    return mode;
  }

  function sim() {
    const id = currentMode();
    if (!sims[id]) sims[id] = { state: GitEngine.createState(startOf(id)), log: [], history: [], hpos: 0, draft: '', explain: '', hint: false };
    return sims[id];
  }

  /* ---- Suggested commands, from the current state -------------------------------------------- */

  function suggestions(s) {
    const out = [];
    const add = (c) => { if (!out.includes(c) && out.length < 7) out.push(c); };
    if (!s.initialized) { add('git init'); add('ls'); return out; }
    const fs = GitEngine.fileStates(s);
    const conflicted = fs.filter((f) => f.conflicted);
    const c = GitEngine.counts(s);
    add('git status');
    if (conflicted.length) {
      add(`cat ${conflicted[0].name}`);
      add(`edit ${conflicted[0].name}`);
      add(`git add ${conflicted[0].name}`);
      add('git commit -m "Merge and resolve conflict"');
      add('git merge --abort');
      return out;
    }
    if (s.merge) { add('git commit -m "Merge and resolve conflict"'); return out; }
    const pending = fs.filter((f) => f.work === 'untracked' || f.work === 'modified' || f.work === 'deleted');
    if (pending.length) { add(`git add ${pending[0].name}`); if (pending.length > 1) add('git add .'); }
    if (c.staged) add('git commit -m "Describe the change"');
    if (c.modified) add('git diff');
    if (c.staged) add(`git restore --staged ${fs.find((f) => f.staged).name}`);
    const branches = Object.keys(s.branches);
    if (GitEngine.tip(s)) {
      add('git log --oneline');
      const other = branches.find((b) => b !== s.head);
      if (other) { add(`git switch ${other}`); add(`git merge ${other}`); } else add('git switch -c feature');
      if (!s.remote) add(`git remote add origin ${GitEngine.URL}`);
      else if (!s.upstream[s.head]) add(`git push -u origin ${s.head}`);
      else {
        const ab = GitEngine.aheadBehind(s);
        if (ab && ab.ahead) add('git push');
        add('git pull');
      }
    }
    if (!pending.length) add(`edit ${Object.keys(s.work)[0] || 'index.html'}`);
    return out;
  }

  /* ---- Rendering -------------------------------------------------------------------------- */

  const FILE_TAG = {
    untracked: ['?', 'untracked'], modified: ['M', 'modified'], deleted: ['D', 'deleted'], clean: ['✓', 'unchanged'], conflicted: ['!', 'conflict'],
  };
  const STAGE_TAG = { new: ['A', 'new file'], modified: ['M', 'modified'], deleted: ['D', 'deleted'] };

  const fileItem = (name, [sym, label], cls) => `<li class="gs-file gs-${cls}"><span class="gs-ico" aria-hidden="true">${esc(sym)}</span><span class="gs-fname">${esc(name)}</span><span class="gs-ftag">${esc(t(label))}</span></li>`;
  const commitItem = (c, extra = '') => `<li class="gs-commit"><code>${esc(GitEngine.short(c.id))}</code> <span>${esc(c.message)}</span>${extra}</li>`;
  const panel = (key, title, sub, inner) => `<section class="gs-area gs-area-${key}" aria-labelledby="gs-a-${key}"><h4 id="gs-a-${key}">${esc(title)}</h4><p class="gs-area-sub">${esc(sub)}</p>${inner}</section>`;
  const empty = (text) => `<p class="gs-empty">${md(text)}</p>`;

  function areasHtml(s) {
    const fs = GitEngine.fileStates(s);
    const work = fs.filter((f) => f.work);
    const workHtml = work.length
      ? `<ul class="gs-files">${work.map((f) => {
        const k = f.conflicted ? 'conflicted' : f.work;
        const tag = !s.initialized ? ['?', 'not tracked'] : FILE_TAG[k];
        return fileItem(f.name, tag, k);
      }).join('')}</ul>`
      : empty(t('No files. Create one with `edit index.html`.'));

    const staged = fs.filter((f) => f.staged && !f.conflicted);
    const stageHtml = !s.initialized ? empty(t('No repository yet.'))
      : staged.length ? `<ul class="gs-files">${staged.map((f) => fileItem(f.name, STAGE_TAG[f.staged], `st-${f.staged}`)).join('')}</ul>`
        : empty(t('Empty: nothing staged. `git add` puts changes here.'));

    let repoHtml;
    if (!s.initialized) repoHtml = empty(t('No repository. `git init` creates one.'));
    else if (!GitEngine.tip(s)) repoHtml = empty(t('No commits yet on `{b}`.', { b: s.head }));
    else {
      const ab = GitEngine.aheadBehind(s);
      const branchList = Object.keys(s.branches).sort().map((b) => `<li class="gs-branch${b === s.head ? ' is-head' : ''}"><span class="gs-bname">${b === s.head ? `<span class="gs-headmark">HEAD →</span> ` : ''}${esc(b)}</span> <code>${esc(GitEngine.short(s.branches[b]))}</code></li>`).join('');
      const hist = GitEngine.history(s, GitEngine.tip(s));
      repoHtml = `<ul class="gs-branches">${branchList}</ul>
        ${ab ? `<p class="gs-ab">${esc(ab.ahead || ab.behind ? t('{b}: {a} ahead, {c} behind origin/{u}', { b: s.head, a: ab.ahead, c: ab.behind, u: ab.upstream }) : t('{b} is up to date with origin/{u}', { b: s.head, u: ab.upstream }))}</p>` : ''}
        <ol class="gs-commits">${hist.slice(0, 4).map((c) => commitItem(c)).join('')}${hist.length > 4 ? `<li class="gs-more">${esc(t('+ {n} older', { n: hist.length - 4 }))}</li>` : ''}</ol>`;
    }

    let remoteHtml;
    if (!s.remote) remoteHtml = empty(t('Not connected. `git remote add origin <url>` links a GitHub repository.'));
    else {
      const names = Object.keys(s.remote.branches).sort();
      const known = new Set(Object.values(s.tracking).flatMap((id) => GitEngine.history(s, id).map((c) => c.id)));
      Object.values(s.branches).forEach((id) => GitEngine.history(s, id).forEach((c) => known.add(c.id)));
      remoteHtml = `<p class="gs-url">${esc(s.remote.url.replace(/^https:\/\//, ''))}</p>`;
      if (!names.length) remoteHtml += empty(t('Empty: nothing pushed yet.'));
      else {
        remoteHtml += names.map((b) => {
          const hist = GitEngine.history(s, s.remote.branches[b]);
          return `<p class="gs-rbranch">${esc(b)} <code>${esc(GitEngine.short(s.remote.branches[b]))}</code></p>
            <ol class="gs-commits">${hist.slice(0, 3).map((c) => commitItem(c, known.has(c.id) ? '' : ` <span class="gs-new">${esc(t('not on your computer'))}</span>`)).join('')}</ol>`;
        }).join('');
      }
    }

    return `<div class="gs-areas">
        ${panel('work', t('Working directory'), t('your files on disk'), workHtml)}
        ${panel('stage', t('Staging area'), t('what the next commit will save'), stageHtml)}
        ${panel('repo', t('Local repository'), t('commits on your computer'), repoHtml)}
        ${panel('remote', t('Remote: origin'), t('the copy on GitHub'), remoteHtml)}
      </div>`;
  }

  /* SVG commit graph: one lane per branch, parents → children, labels above each commit. */
  function graphHtml(s) {
    const g = GitEngine.graph(s);
    if (!g.nodes.length) return `<p class="gs-empty">${esc(t('The commit graph appears after your first commit.'))}</p>`;
    const DX = 78;
    const DY = 46;
    const LH = 20;
    const rows = Math.max(1, ...g.nodes.map((n) => n.labels.length));
    const top = rows * LH + 12;
    const PADX = 26;
    const pos = {};
    g.nodes.forEach((n) => { pos[n.id] = { x: PADX + n.x * DX, y: top + n.lane * DY + 10 }; });
    const width = PADX * 2 + (g.nodes.length - 1) * DX + 120;
    const height = top + g.lanes.length * DY + 16;
    const lane = (k) => `gs-lane${k % 6}`;
    const headTip = GitEngine.tip(s);

    const edges = g.nodes.flatMap((n) => n.parents.map((p) => {
      const a = pos[p];
      const b = pos[n.id];
      const d = a.y === b.y ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} C${a.x + DX * 0.6},${a.y} ${b.x - DX * 0.6},${b.y} ${b.x},${b.y}`;
      return `<path class="gs-edge ${lane(n.lane)}" d="${d}"/>`;
    })).join('');

    const nodes = g.nodes.map((n) => {
      const p = pos[n.id];
      const merge = s.commits[n.id].parents.length > 1;
      const labels = n.labels.map((l, k) => {
        const text = l.kind === 'head' ? `HEAD → ${l.name}` : l.name;
        const w = Math.round(text.length * 6.7 + 14);
        const y = p.y - 16 - (k + 1) * LH + 4;
        return `<g class="gs-label gs-label-${l.kind}"><rect x="${p.x - 10}" y="${y}" width="${w}" height="17" rx="8.5"/><text x="${p.x - 3}" y="${y + 12.5}">${esc(text)}</text></g>`;
      }).join('');
      return `<g class="gs-node${n.id === headTip ? ' is-head' : ''}${merge ? ' is-merge' : ''} ${lane(n.lane)}">
          <title>${esc(`${n.id} ${n.message}`)}</title>
          <circle cx="${p.x}" cy="${p.y}" r="9"/>${merge ? `<circle class="gs-inner" cx="${p.x}" cy="${p.y}" r="4"/>` : ''}
          <text class="gs-id" x="${p.x}" y="${p.y + 24}" text-anchor="middle">${esc(n.id.slice(0, 7))}</text>
          ${labels}
        </g>`;
    }).join('');

    const desc = `${t('{n} commits.', { n: g.nodes.length })} ${Object.keys(s.branches).sort().map((b) => `${b}${b === s.head ? ' (HEAD)' : ''} → ${s.branches[b]}`).join('; ')}${Object.keys(s.tracking).length ? `; ${Object.keys(s.tracking).map((b) => `origin/${b} → ${s.tracking[b]}`).join('; ')}` : ''}.`;
    return `<svg class="gs-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="gs-svg-t gs-svg-d">
        <title id="gs-svg-t">${esc(t('Commit graph'))}</title><desc id="gs-svg-d">${esc(desc)}</desc>
        ${edges}${nodes}
      </svg>`;
  }

  function logHtml(sm) {
    if (!sm.log.length) return `<p class="lr-line gs-note">${esc(t('Type a command below and press Enter. Type help to list every command.'))}</p>`;
    return sm.log.map((e) => `<div class="gs-entry"><p class="lr-line gs-cmd"><span aria-hidden="true">$ </span>${esc(e.cmd)}</p>${e.output ? Sandbox.lineHtml({ level: e.ok ? 'log' : 'error', text: e.output }) : ''}${e.solved ? `<p class="lr-line gs-solved">${esc(e.solved)}</p>` : ''}</div>`).join('');
  }

  function modesHtml() {
    const list = CHALLENGES;
    const cur = currentMode();
    return `<div class="gs-modes"><p class="gs-modes-label" aria-hidden="true">${esc(t('Challenges'))}</p>
        ${Tools.challengePicker({ list, current: cur === 'free' ? 'free' : list.findIndex((c) => c.id === cur), store, action: 'gs-mode', label: t('Challenges'), free: { value: 'free', label: t('Free play') } })}</div>`;
  }

  function goalHtml(sm) {
    const id = currentMode();
    if (id === 'free') {
      return `<div class="tl-goal gs-goal"><p class="gs-goal-title"><strong>${esc(t('Free play'))}</strong></p>
          <p>${md(t('Anything goes: two untracked files and no repository yet. Try `git init`, `git add .`, `git commit -m "First commit"`, branches, merges, `git remote add origin <url>` and `git push`. `remote-commit <file>` plays a teammate who pushes to GitHub.'))}</p>
          <p class="gs-goal-actions"><button type="button" class="btn ghost small-btn" data-action="gs-restart" data-fid="gs-restart">${esc(t('Start again'))}</button></p></div>`;
    }
    const c = findChallenge(id);
    const isDone = store.isSolved(id);
    return `<div class="tl-goal gs-goal${isDone ? ' is-solved' : ''}">
        <p class="gs-goal-title"><strong>${esc(c.title)}</strong>${isDone ? ` <span class="gs-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(c.goal)}</p>
        <p class="gs-goal-actions">
          ${c.hint ? `<button type="button" class="btn ghost small-btn" data-action="gs-hint" data-fid="gs-hint" aria-expanded="${sm.hint}">${esc(sm.hint ? t('Hide hint') : t('Show hint'))}</button>` : ''}
          <button type="button" class="btn ghost small-btn" data-action="gs-restart" data-fid="gs-restart">${esc(t('Restart challenge'))}</button>
        </p>
        ${sm.hint && c.hint ? `<p class="gs-hint">${md(c.hint)}</p>` : ''}
      </div>`;
  }

  function body() {
    const sm = sim();
    const s = sm.state;
    const chips = suggestions(s).map((c) => `<button type="button" class="tl-chip gs-chip" data-action="gs-chip" data-cmd="${esc(c)}" data-fid="gs-chip-${esc(c)}">${esc(c)}</button>`).join('');
    return `<div class="gs">
        ${modesHtml()}
        ${goalHtml(sm)}
        <div class="gs-main">
          <div class="gs-term">
            <div class="lr-console gs-log" data-gs-log tabindex="0" role="region" aria-label="${esc(t('Terminal output'))}">${logHtml(sm)}</div>
            <div class="gs-prompt">
              <label class="sr-only" for="gs-in">${esc(t('Command'))}</label>
              <span class="gs-dollar" aria-hidden="true">$</span>
              <input id="gs-in" class="tl-input gs-input" type="text" data-fid="gs-in" value="${esc(sm.draft)}" placeholder="git status" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
              <button type="button" class="btn small-btn" data-action="gs-run" data-fid="gs-run">${esc(t('Run'))}</button>
            </div>
            <p class="gs-keys muted small">${esc(t('Enter runs · ↑ / ↓ recall earlier commands · a suggestion fills the prompt'))}</p>
            <div class="gs-chips" role="group" aria-label="${esc(t('Suggested commands'))}">${chips}</div>
            <p class="tl-explain gs-explain">${sm.explain ? esc(sm.explain) : esc(t('After each command, this line explains in plain English what changed.'))}</p>
          </div>
          ${areasHtml(s)}
        </div>
        <figure class="gs-graph">
          <figcaption>${esc(t('Commit graph'))} <span class="muted small">${esc(t('· oldest on the left · HEAD = where you are'))}</span></figcaption>
          <div class="gs-graph-scroll" tabindex="0" role="region" aria-label="${esc(t('Commit graph (scrolls sideways)'))}">${graphHtml(s)}</div>
        </figure>
      </div>`;
  }

  function mount(root) {
    const log = root.querySelector('[data-gs-log]');
    if (log) log.scrollTop = log.scrollHeight;
    const g = root.querySelector('.gs-graph-scroll');
    if (g) g.scrollLeft = g.scrollWidth;
  }

  /* ---- Running commands -------------------------------------------------------------------- */

  const firstLines = (s, n) => String(s || '').split('\n').filter(Boolean).slice(0, n).join('. ');

  function runLine(root, line) {
    const sm = sim();
    const cmd = line.trim();
    sm.draft = '';
    if (!cmd) { Tools.refresh('git-sim'); return; }
    if (sm.history[sm.history.length - 1] !== cmd) sm.history.push(cmd);
    sm.hpos = sm.history.length;
    const res = GitEngine.run(sm.state, cmd);
    if (res.clear) sm.log = [];
    else if (res.reset) {
      sm.state = GitEngine.createState(startOf(currentMode()));
      sm.log = [{ cmd, output: res.output, ok: true }];
    } else {
      sm.log.push({ cmd, output: res.output, ok: res.ok });
      if (sm.log.length > MAX_LOG) sm.log.splice(0, sm.log.length - MAX_LOG);
    }
    sm.explain = res.explain;
    let solvedMsg = '';
    const id = currentMode();
    const ch = id === 'free' ? null : findChallenge(id);
    // Every command changes the panels and the graph, so the whole tool is redrawn (the picker included).
    if (ch && ch.check && GitEngine.evaluate(ch.check, sm.state).ok && store.mark(id)) {
      solvedMsg = t('Challenge solved! {title}', { title: ch.title });
      sm.log[sm.log.length - 1].solved = `✓ ${solvedMsg}`;
    }
    Tools.refresh('git-sim');
    Tools.say(root, [firstLines(res.output, 2), res.explain, solvedMsg].filter(Boolean).join(' — '));
    const input = root.querySelector('#gs-in');
    if (input && document.activeElement !== input) input.focus({ preventScroll: true });
  }

  function onKeydown(e, root) {
    const el = e.target;
    if (el.id !== 'gs-in') return;
    const sm = sim();
    if (e.key === 'Enter') { e.preventDefault(); runLine(root, el.value); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!sm.history.length) return;
      e.preventDefault();
      sm.hpos = Math.max(0, Math.min(sm.history.length, sm.hpos + (e.key === 'ArrowUp' ? -1 : 1)));
      el.value = sm.history[sm.hpos] || '';
      sm.draft = el.value;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  function onInput(e) {
    if (e.target.id === 'gs-in') sim().draft = e.target.value;
  }

  function onClick(el, root) {
    const sm = sim();
    switch (el.dataset.action) {
      case 'gs-run': runLine(root, (root.querySelector('#gs-in') || {}).value || ''); break;
      case 'gs-chip': {
        sm.draft = el.dataset.cmd;
        const input = root.querySelector('#gs-in');
        if (input) { input.value = sm.draft; input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        break;
      }
      case 'gs-mode':
        mode = el.dataset.v === 'free' ? 'free' : CHALLENGES[+el.dataset.v].id;
        Tools.refresh('git-sim');
        Tools.say(root, mode === 'free' ? t('Free play') : findChallenge(mode).title);
        break;
      case 'gs-hint':
        sm.hint = !sm.hint;
        Tools.refresh('git-sim');
        break;
      case 'gs-restart':
        delete sims[currentMode()];
        Tools.refresh('git-sim');
        Tools.say(root, t('Started again from the beginning.'));
        break;
      default:
        break;
    }
  }

  Tools.register('git-sim', {
    title: 'Commit and branch simulator',
    intro: 'Type real Git commands and watch your files move between the working directory, the staging area, your local repository and GitHub. Solve the challenges, or explore in free play.',
    body,
    mount,
    onClick,
    onInput,
    onKeydown,
    challenges: { store, label: 'Git challenges', ids: () => CHALLENGES.map((c) => c.id) },
  });
})();
