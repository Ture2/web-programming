'use strict';

/* ==========================================================================
   Commit and branch simulator engine: a small, pure model of a repository and an
   interpreter for the commands learners practise. No DOM: it runs in the
   browser (global GitEngine, used by js/tools/git-sim.js) and in Node
   (site/test/git-engine.test.mjs).

   State (plain object, mutated in place by run()):
     initialized   a repository exists (git init)
     work          working directory: { file: content }
     index         staging area: the full snapshot the next commit will store
     commits       { id: { id, message, parents[], snapshot, branch, n } } (local and remote)
     branches      local branches { name: commit id } (an unborn branch is absent)
     head          name of the current branch
     remote        null | { name: 'origin', url, branches: { name: commit id } } (what GitHub has)
     tracking      remote-tracking refs { branch: commit id } (what we last saw: origin/<branch>)
     upstream      { localBranch: remoteBranch } (set by push -u, clone, switch from origin/x)
     merge         null | { theirs, name, files: [conflicted] } while a merge is in progress

   API: createState(start), run(state, line) → { output, explain, ok, clear?, reset? },
        evaluate(check, state) → { ok, unmet[] }, fileStates, counts, graph, history, tip,
        aheadBehind, tokenize, short(id); URL is the sample remote address.
   ========================================================================== */

const GitEngine = (() => {
  const URL = 'https://github.com/student/my-site.git';
  const AUTHOR = 'Student <student@example.com>';
  const REPO = '/home/student/my-site';
  const SUPPORTED = [
    'git init', 'git status', 'git add <file>|.', 'git restore <file>', 'git restore --staged <file>',
    'git commit -m "msg"', 'git log [--oneline]', 'git branch [name]', 'git switch [-c] <name>',
    'git checkout [-b] <name>', 'git merge <name>', 'git push [-u origin <branch>]', 'git pull', 'git fetch',
    'git remote -v', 'git remote add origin <url>', 'git diff',
  ];
  const HELPERS = ['edit <file>', 'rm <file>', 'ls', 'cat <file>', 'remote-commit <file>', 'clear', 'help', 'reset-sim'];
  const UNSUPPORTED = ['stash', 'rebase', 'reset', 'clone', 'tag', 'cherry-pick', 'revert', 'rm', 'mv', 'show', 'config',
    'bisect', 'blame', 'reflog', 'am', 'apply', 'clean', 'grep', 'describe', 'gc', 'submodule', 'worktree', 'notes', 'shortlog', 'switch-branch'];

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const get = (o, k) => (has(o, k) ? o[k] : undefined);
  const union = (...objs) => [...new Set(objs.flatMap((o) => Object.keys(o)))].sort();
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const list = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

  const ok = (output = '', explain = '', extra = {}) => ({ output, explain, ok: true, ...extra });
  const fail = (output, explain = '') => ({ output, explain, ok: false });

  /* ---- State --------------------------------------------------------------------- */

  function blank() {
    return { initialized: false, work: {}, index: {}, commits: {}, counter: 0, edits: 0, branches: {}, head: 'main',
      remote: null, tracking: {}, upstream: {}, merge: null };
  }

  const firstVersion = (name) => `${name}: first version`;

  function hashId(s, seed) {
    let h = 5381;
    let id;
    for (let salt = 0; ; salt++) {
      const str = `${seed}#${salt}`;
      for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
      id = (h.toString(16) + 'a7c3e91').slice(0, 7);
      if (!s.commits[id]) return id;
    }
  }

  function makeCommit(s, message, parents, snapshot, branch) {
    s.counter++;
    const id = hashId(s, `${s.counter}|${message}|${parents.join(',')}`);
    s.commits[id] = { id, message, parents: parents.slice(), snapshot: { ...snapshot }, branch, n: s.counter };
    return id;
  }

  /* start: { files: { name: 'untracked' | 'modified' | 'committed' }, remote: bool, init?: bool }.
     Committed and modified files are stored in one initial commit; modified files are then edited.
     Without init, the folder is a repository when something is committed or a remote exists. */
  function createState(start = {}) {
    const s = blank();
    const files = start.files || {};
    const tracked = Object.keys(files).filter((f) => files[f] === 'committed' || files[f] === 'modified');
    s.initialized = start.init !== undefined ? !!start.init : (tracked.length > 0 || !!start.remote);
    Object.keys(files).forEach((f) => { s.work[f] = firstVersion(f); });
    if (s.initialized && tracked.length) {
      const snap = {};
      tracked.forEach((f) => { snap[f] = s.work[f]; });
      s.index = { ...snap };
      s.branches.main = makeCommit(s, 'Initial commit', [], snap, 'main');
    }
    Object.keys(files).filter((f) => files[f] === 'modified').forEach((f) => { s.work[f] = editContent(s, f, s.work[f]); });
    if (start.remote) {
      s.remote = { name: 'origin', url: URL, branches: {} };
      if (s.branches.main) {
        s.remote.branches.main = s.branches.main;
        s.tracking.main = s.branches.main;
        s.upstream.main = 'main';
      }
    }
    return s;
  }

  function editContent(s, name, old) {
    s.edits++;
    const line = `${name}: change ${s.edits}`;
    return old === undefined ? firstVersion(name) : `${old}\n${line}`;
  }

  /* ---- Queries ------------------------------------------------------------------------ */

  const tip = (s, b = s.head) => s.branches[b] || null;
  const tree = (s, id) => (id ? s.commits[id].snapshot : {});
  const headTree = (s) => tree(s, tip(s));
  const short = (id) => (id ? id.slice(0, 7) : '0000000');

  function ancestors(s, id) {
    const seen = new Set();
    const stack = id ? [id] : [];
    while (stack.length) {
      const c = stack.pop();
      if (seen.has(c) || !s.commits[c]) continue;
      seen.add(c);
      stack.push(...s.commits[c].parents);
    }
    return seen;
  }
  /* a is an ancestor of b (or the same commit). Nothing (null) is an ancestor of everything. */
  const isAncestor = (s, a, b) => !a || ancestors(s, b).has(a);

  function mergeBase(s, a, b) {
    const A = ancestors(s, a);
    let best = null;
    ancestors(s, b).forEach((c) => { if (A.has(c) && (!best || s.commits[c].n > s.commits[best].n)) best = c; });
    return best;
  }

  /* Commits in `from` not reachable from `to`. */
  const countOnly = (s, from, to) => {
    const T = ancestors(s, to);
    return [...ancestors(s, from)].filter((c) => !T.has(c)).length;
  };

  function aheadBehind(s, b = s.head) {
    const up = s.upstream[b];
    if (!up || !tip(s, b)) return null;
    const remoteRef = s.tracking[up] || null;
    return { upstream: up, ahead: countOnly(s, tip(s, b), remoteRef), behind: countOnly(s, remoteRef, tip(s, b)) };
  }

  const isConflicted = (s, f) => !!(s.merge && s.merge.files.includes(f));

  /* Per file: staged ('new' | 'modified' | 'deleted' | null), work ('untracked' | 'modified' | 'deleted' | 'clean' | null),
     conflicted (bool). Before git init every file is 'untracked'. */
  function fileStates(s) {
    const head = headTree(s);
    return union(head, s.index, s.work).map((name) => {
      if (!s.initialized) return { name, staged: null, work: 'untracked', conflicted: false };
      const inIdx = has(s.index, name);
      let staged = null;
      if (get(s.index, name) !== get(head, name)) staged = inIdx ? (has(head, name) ? 'modified' : 'new') : 'deleted';
      let work = null;
      if (!inIdx) work = has(s.work, name) ? 'untracked' : null;
      else if (!has(s.work, name)) work = 'deleted';
      else work = s.work[name] !== s.index[name] ? 'modified' : 'clean';
      return { name, staged, work, conflicted: isConflicted(s, name) };
    });
  }

  function counts(s) {
    const fs = fileStates(s);
    return {
      staged: fs.filter((f) => f.staged && !f.conflicted).length,
      modified: fs.filter((f) => (f.work === 'modified' || f.work === 'deleted') && !f.conflicted).length,
      untracked: fs.filter((f) => f.work === 'untracked').length,
      conflicted: fs.filter((f) => f.conflicted).length,
    };
  }

  /* ---- Diffs --------------------------------------------------------------------------- */

  const linesOf = (c) => (c === undefined || c === '' ? [] : String(c).split('\n'));

  /* Lines removed and added between two versions (a multiset comparison: enough for appended edits). */
  function diffLines(a, b) {
    const left = linesOf(a);
    const right = linesOf(b);
    const pool = new Map();
    left.forEach((l) => pool.set(l, (pool.get(l) || 0) + 1));
    const plus = [];
    right.forEach((l) => { if (pool.get(l)) pool.set(l, pool.get(l) - 1); else plus.push(l); });
    const minus = [];
    const pool2 = new Map();
    right.forEach((l) => pool2.set(l, (pool2.get(l) || 0) + 1));
    left.forEach((l) => { if (pool2.get(l)) pool2.set(l, pool2.get(l) - 1); else minus.push(l); });
    return { plus, minus };
  }

  /* " 2 files changed, 3 insertions(+), 1 deletion(-)" plus create/delete mode lines, between two trees. */
  function statText(from, to, withModes = false) {
    const names = union(from, to).filter((n) => get(from, n) !== get(to, n));
    let ins = 0;
    let del = 0;
    names.forEach((n) => { const d = diffLines(get(from, n), get(to, n)); ins += d.plus.length; del += d.minus.length; });
    let out = ` ${plural(names.length, 'file')} changed`;
    if (ins || !del) out += `, ${ins} insertion${ins === 1 ? '' : 's'}(+)`;
    if (del) out += `, ${del} deletion${del === 1 ? '' : 's'}(-)`;
    if (withModes) {
      names.forEach((n) => {
        if (!has(from, n)) out += `\n create mode 100644 ${n}`;
        else if (!has(to, n)) out += `\n delete mode 100644 ${n}`;
      });
    }
    return { text: out, files: names.length };
  }

  /* ---- Working directory updates ------------------------------------------------------------ */

  /* Moves index and working directory from HEAD's tree to the tree of targetId, keeping
     uncommitted changes that do not clash (like git switch). Returns an error text or null. */
  function checkoutTree(s, targetId, verb = 'checkout') {
    const oldTree = headTree(s);
    const newTree = tree(s, targetId);
    const names = union(oldTree, newTree, s.index, s.work);
    const dirtyOf = (n) => get(s.index, n) !== get(oldTree, n) || (has(s.index, n) && get(s.work, n) !== get(s.index, n));
    const clash = names.filter((n) => dirtyOf(n) && get(newTree, n) !== get(oldTree, n));
    if (clash.length) {
      return `error: Your local changes to the following files would be overwritten by ${verb}:\n${clash.map((n) => `\t${n}`).join('\n')}\nPlease commit your changes or stash them before you ${verb === 'checkout' ? 'switch branches' : verb}.\nAborting`;
    }
    const untracked = names.filter((n) => !has(s.index, n) && !has(oldTree, n) && has(s.work, n) && has(newTree, n) && s.work[n] !== newTree[n]);
    if (untracked.length) {
      return `error: The following untracked working tree files would be overwritten by ${verb}:\n${untracked.map((n) => `\t${n}`).join('\n')}\nPlease move or remove them before you ${verb === 'checkout' ? 'switch branches' : verb}.\nAborting`;
    }
    names.forEach((n) => {
      if (dirtyOf(n)) return;
      if (has(newTree, n)) { s.index[n] = newTree[n]; s.work[n] = newTree[n]; } else if (has(oldTree, n) || has(s.index, n)) { delete s.index[n]; delete s.work[n]; }
    });
    return null;
  }

  /* Files with staged or unstaged changes to tracked files (merge refuses to start with them). */
  const dirtyTracked = (s) => fileStates(s).filter((f) => f.staged || f.work === 'modified' || f.work === 'deleted').map((f) => f.name);

  /* ---- Command line --------------------------------------------------------------------------- */

  /* Splits a command line into words; "double" and 'single' quotes group words. */
  function tokenize(line) {
    const out = [];
    let cur = '';
    let quote = null;
    let inWord = false;
    for (const ch of line) {
      if (quote) {
        if (ch === quote) quote = null; else cur += ch;
      } else if (ch === '"' || ch === "'") { quote = ch; inWord = true; } else if (/\s/.test(ch)) {
        if (inWord) { out.push(cur); cur = ''; inWord = false; }
      } else { cur += ch; inWord = true; }
    }
    if (quote) return null;
    if (inWord) out.push(cur);
    return out;
  }

  const helpText = () => `Git commands in this simulator:\n${SUPPORTED.map((c) => `  ${c}`).join('\n')}\n\nHelpers (not Git, they stand in for your editor and your team):\n  edit <file>           create or change a file (resolves a conflicted file)\n  rm <file>             delete a file\n  ls / cat <file>       list files / show a file\n  remote-commit <file>  a teammate pushes a change to origin\n  clear                 clear the terminal\n  reset-sim             start this exercise again`;

  function run(s, line) {
    const raw = String(line || '').trim();
    if (!raw) return ok('');
    const argv = tokenize(raw);
    if (!argv) return fail('error: unmatched quote', 'A quote was opened but not closed. Wrap the whole message in "double quotes".');
    const [cmd, ...args] = argv;
    switch (cmd) {
      case 'git': return git(s, args);
      case 'edit': return edit(s, args);
      case 'rm': return rmFile(s, args);
      case 'ls': return ok(Object.keys(s.work).sort().join('  '), 'ls lists the files in the working directory (your project folder).');
      case 'cat': {
        if (!args[0]) return fail('cat: missing file operand');
        return has(s.work, args[0]) ? ok(s.work[args[0]], `This is the content of ${args[0]} in the working directory.`) : fail(`cat: ${args[0]}: No such file or directory`);
      }
      case 'remote-commit': return remoteCommit(s, args);
      case 'clear': return ok('', '', { clear: true });
      case 'help': return ok(helpText());
      case 'reset-sim': return ok('Simulator reset.', 'Everything is back to how this exercise started.', { reset: true });
      default:
        return fail(`${cmd}: command not found`, `This simulator understands git commands and the helpers ${HELPERS.join(', ')}. Type help to see them all.`);
    }
  }

  const NOT_REPO = () => fail('fatal: not a git repository (or any of the parent directories): .git', 'There is no repository here yet: run git init first.');

  function git(s, args) {
    const sub = args[0];
    const rest = args.slice(1);
    if (!sub || sub === 'help' || sub === '--help') return ok(`usage: git <command> [<args>]\n\n${helpText()}`);
    if (sub === '--version' || sub === 'version') return ok('git version 2.47.0 (simulator)');
    if (sub !== 'init' && !s.initialized) {
      if (!UNSUPPORTED.includes(sub) && !COMMANDS[sub]) return unknown(sub);
      return NOT_REPO();
    }
    if (COMMANDS[sub]) return COMMANDS[sub](s, rest);
    return unknown(sub);
  }

  function unknown(sub) {
    if (UNSUPPORTED.includes(sub)) {
      return fail(`git ${sub}: real Git has this command, but this simulator does not.`, `This simulator supports: ${SUPPORTED.join(', ')}.`);
    }
    return fail(`git: '${sub}' is not a git command. See 'git --help'.`, 'Check the spelling. Type help to list the commands this simulator supports.');
  }

  /* ---- git init / status ------------------------------------------------------------------------ */

  function init(s) {
    if (s.initialized) return ok(`Reinitialized existing Git repository in ${REPO}/.git/`, 'This folder already was a repository: nothing changed.');
    s.initialized = true;
    return ok(`Initialized empty Git repository in ${REPO}/.git/`,
      'git init created a hidden .git folder: this folder is now a repository. Nothing is tracked yet, so every file is untracked.');
  }

  function trackingLines(s) {
    const ab = aheadBehind(s);
    if (!ab) return [];
    const ref = `'origin/${ab.upstream}'`;
    if (!ab.ahead && !ab.behind) return [`Your branch is up to date with ${ref}.`];
    if (ab.ahead && !ab.behind) return [`Your branch is ahead of ${ref} by ${plural(ab.ahead, 'commit')}.`, '  (use "git push" to publish your local commits)'];
    if (!ab.ahead) return [`Your branch is behind ${ref} by ${plural(ab.behind, 'commit')}, and can be fast-forwarded.`, '  (use "git pull" to update your local branch)'];
    return [`Your branch and ${ref} have diverged,`, `and have ${ab.ahead} and ${ab.behind} different commits each, respectively.`, '  (use "git pull" if you want to integrate the remote branch with yours)'];
  }

  function statusText(s) {
    const fs = fileStates(s);
    const staged = fs.filter((f) => f.staged && !f.conflicted);
    const unmerged = fs.filter((f) => f.conflicted);
    const modified = fs.filter((f) => (f.work === 'modified' || f.work === 'deleted') && !f.conflicted);
    const untracked = fs.filter((f) => f.work === 'untracked');
    const out = [`On branch ${s.head}`];
    out.push(...trackingLines(s));
    if (!tip(s)) out.push('', 'No commits yet');
    if (s.merge) {
      out.push('');
      if (unmerged.length) out.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)');
      else out.push('All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)');
    }
    const pad = (label) => `${label}:`.padEnd(12);
    if (staged.length) {
      out.push('', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)');
      staged.forEach((f) => out.push(`\t${pad({ new: 'new file', modified: 'modified', deleted: 'deleted' }[f.staged])}${f.name}`));
    }
    if (unmerged.length) {
      out.push('', 'Unmerged paths:', '  (use "git add <file>..." to mark resolution)');
      unmerged.forEach((f) => out.push(`\tboth modified:   ${f.name}`));
    }
    if (modified.length) {
      out.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)');
      modified.forEach((f) => out.push(`\t${pad(f.work)}${f.name}`));
    }
    if (untracked.length) {
      out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)');
      untracked.forEach((f) => out.push(`\t${f.name}`));
    }
    if (!staged.length && !unmerged.length && !s.merge) {
      out.push('');
      if (modified.length) out.push('no changes added to commit (use "git add" and/or "git commit -a")');
      else if (untracked.length) out.push('nothing added to commit but untracked files present (use "git add" to track)');
      else out.push(tip(s) ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)');
    }
    return out.join('\n');
  }

  function status(s) {
    const c = counts(s);
    const parts = [];
    if (c.conflicted) parts.push(`${c.conflicted} conflicted`);
    parts.push(`${c.staged} staged`, `${c.modified} modified but not staged`, `${c.untracked} untracked`);
    return ok(statusText(s), `git status only reports, it changes nothing: ${list(parts)}.`);
  }

  /* ---- add / restore ------------------------------------------------------------------------------ */

  function add(s, args) {
    const paths = args.filter((a) => !a.startsWith('-') || a === '-A');
    const all = args.some((a) => a === '.' || a === '-A' || a === '--all');
    if (!paths.length && !all) return fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?", 'Name the files to stage, or use git add . for all of them.');
    const names = all ? union(s.work, s.index) : paths;
    const missing = names.filter((n) => !has(s.work, n) && !has(s.index, n));
    if (missing.length) return fail(`fatal: pathspec '${missing[0]}' did not match any files`, `There is no file called ${missing[0]}. Check the name with ls.`);
    const changed = [];
    const resolved = [];
    const withMarkers = [];
    names.forEach((n) => {
      const before = get(s.index, n);
      if (has(s.work, n)) s.index[n] = s.work[n]; else delete s.index[n];
      if (isConflicted(s, n)) {
        s.merge.files = s.merge.files.filter((f) => f !== n);
        resolved.push(n);
        if (/^<<<<<<< /m.test(get(s.work, n) || '')) withMarkers.push(n);
      } else if (get(s.index, n) !== before) changed.push(n);
    });
    let explain;
    if (resolved.length) {
      explain = `git add marked ${list(resolved)} as resolved.${withMarkers.length ? ` Careful: ${list(withMarkers)} still contains conflict markers (<<<<<<<), which would be committed as text.` : ''}${s.merge.files.length ? ` Still conflicted: ${list(s.merge.files)}.` : ' All conflicts are resolved: git commit concludes the merge.'}`;
    } else if (!changed.length) explain = 'Nothing changed: the staging area already matched those files.';
    else {
      const deleted = changed.filter((n) => !has(s.index, n));
      explain = `git add copied ${list(changed)} into the staging area: ${changed.length === 1 ? 'it' : 'they'} will be part of the next commit.${deleted.length ? ` (${list(deleted)}: the deletion is staged.)` : ''}`;
    }
    return ok('', explain);
  }

  function restore(s, args) {
    const staged = args.includes('--staged') || args.includes('-S');
    const paths = args.filter((a) => !a.startsWith('-'));
    if (!paths.length) return fail('fatal: you must specify path(s) to restore', 'Name the file: git restore <file> or git restore --staged <file>.');
    const head = headTree(s);
    const names = paths.includes('.') ? union(s.index, head) : paths;
    for (const n of names) {
      if (!has(s.index, n) && !has(head, n)) return fail(`error: pathspec '${n}' did not match any file(s) known to git`, `Git does not track ${n}: there is nothing to restore it from.`);
      if (!staged && isConflicted(s, n)) return fail(`error: path '${n}' is unmerged`, 'Resolve the conflict (edit the file), then git add it.');
    }
    if (staged) {
      names.forEach((n) => { if (has(head, n)) s.index[n] = head[n]; else delete s.index[n]; });
      return ok('', `git restore --staged took ${list(names)} out of the staging area. Your edits are still in the working directory; only the next commit changed.`);
    }
    const lost = names.filter((n) => has(s.index, n) && get(s.work, n) !== s.index[n]);
    names.forEach((n) => { if (has(s.index, n)) s.work[n] = s.index[n]; });
    return ok('', lost.length
      ? `git restore threw away your unstaged edits to ${list(lost)}: the file is back to its staged (or last committed) version. In real Git this cannot be undone.`
      : 'Nothing to discard: the working directory already matched the staging area.');
  }

  /* ---- commit / log --------------------------------------------------------------------------------- */

  function commit(s, args) {
    let msg = null;
    let all = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-m' || a === '--message') { msg = args[++i]; } else if (a === '-am' || a === '-a' && args[i + 1] === '-m') {
        all = true;
        if (a === '-a') i++;
        msg = args[++i];
      } else if (a === '-a' || a === '--all') all = true;
      else if (a.startsWith('--message=')) msg = a.slice(10);
      else if (a.startsWith('-m') && a.length > 2) msg = a.slice(2);
      else return fail(`error: unknown option '${a.replace(/^-+/, '')}'`, 'Use git commit -m "Describe the change".');
    }
    if (msg === null || msg === undefined) return fail('This simulator needs the message on the command line: git commit -m "Describe the change"', 'Real Git would open a text editor for the message; here, give it with -m.');
    if (!msg.trim()) return fail('Aborting commit due to empty commit message.', 'A commit needs a message that says what changed.');
    if (s.merge && s.merge.files.length) {
      return fail("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.",
        `Resolve ${list(s.merge.files)} first: edit the file, then git add it.`);
    }
    if (all) fileStates(s).filter((f) => f.work === 'modified' || f.work === 'deleted').forEach((f) => { if (has(s.work, f.name)) s.index[f.name] = s.work[f.name]; else delete s.index[f.name]; });
    const before = headTree(s);
    const stat = statText(before, s.index, true);
    if (!stat.files && !s.merge) return fail(statusText(s), 'Nothing is staged, so there is nothing to commit. Stage changes with git add first.');
    const parents = tip(s) ? [tip(s)] : [];
    const merging = s.merge;
    if (merging) parents.push(merging.theirs);
    const id = makeCommit(s, msg, parents, s.index, s.head);
    s.branches[s.head] = id;
    s.merge = null;
    const explain = merging
      ? `This merge commit ${id} has two parents (${short(parents[0])} and ${short(parents[1])}): ${s.head} now contains the work of ${merging.name}.`
      : `git commit saved the staging area as a snapshot, commit ${id}, on ${s.head}. The ${s.head} label moved to the new commit.${parents.length ? '' : ' It is the first (root) commit of the repository.'}`;
    return ok(`[${s.head}${parents.length ? '' : ' (root-commit)'} ${id}] ${msg}\n${stat.text}`, explain);
  }

  function decorations(s, id) {
    const out = [];
    if (tip(s) === id) out.push(`HEAD -> ${s.head}`);
    Object.keys(s.branches).sort().forEach((b) => { if (b !== s.head && s.branches[b] === id) out.push(b); });
    Object.keys(s.tracking).sort().forEach((b) => { if (s.tracking[b] === id) out.push(`origin/${b}`); });
    return out;
  }

  function log(s, args) {
    const oneline = args.includes('--oneline');
    const all = args.includes('--all');
    if (!tip(s) && !all) return fail(`fatal: your current branch '${s.head}' does not have any commits yet`, 'Make a first commit, then git log has something to show.');
    const starts = all ? [...Object.values(s.branches), ...Object.values(s.tracking)] : [tip(s)];
    const ids = [...new Set(starts.flatMap((id) => [...ancestors(s, id)]))].sort((a, b) => s.commits[b].n - s.commits[a].n);
    const lines = ids.map((id) => {
      const c = s.commits[id];
      const dec = decorations(s, id);
      const d = dec.length ? ` (${dec.join(', ')})` : '';
      if (oneline) return `${id}${d} ${c.message}`;
      return `commit ${id}${d}\n${c.parents.length > 1 ? `Merge: ${c.parents.map(short).join(' ')}\n` : ''}Author: ${AUTHOR}\n\n    ${c.message}\n`;
    });
    return ok(lines.join('\n'), `git log lists the ${plural(ids.length, 'commit')} reachable from ${all ? 'every branch' : `HEAD (${s.head})`}, newest first. HEAD -> ${s.head} marks where you are.`);
  }

  /* ---- branches ------------------------------------------------------------------------------------------ */

  const validName = (n) => /^[A-Za-z0-9._/-]+$/.test(n) && !n.startsWith('-') && !n.startsWith('/') && !n.endsWith('/') && !n.includes('..') && !n.endsWith('.lock');

  function branch(s, args) {
    if (!args.length || args.every((a) => a === '-a' || a === '--all' || a === '-v' || a === '-r')) {
      const local = args.includes('-r') ? [] : Object.keys(s.branches).sort().map((b) => `${b === s.head ? '*' : ' '} ${b}`);
      if (!tip(s) && !args.includes('-r')) local.unshift(`* ${s.head}`);
      const remote = args.includes('-a') || args.includes('--all') || args.includes('-r') ? Object.keys(s.tracking).sort().map((b) => `  remotes/origin/${b}`) : [];
      return ok([...new Set(local)].concat(remote).join('\n'), `The * marks the branch you are on: HEAD points to ${s.head}.${tip(s) ? '' : ' (It has no commits yet, so it is not really created until the first commit.)'}`);
    }
    const up = args.find((a) => a.startsWith('--set-upstream-to='));
    if (up || args[0] === '-u') {
      const ref = up ? up.slice(18) : args[1];
      const b = (up ? args.find((a) => a !== up) : args[2]) || s.head;
      const rb = String(ref || '').replace(/^origin\//, '');
      if (!has(s.tracking, rb)) return fail(`error: the requested upstream branch '${ref}' does not exist`, 'Run git fetch first, or push the branch with git push -u origin <branch>.');
      s.upstream[b] = rb;
      return ok(`branch '${b}' set up to track 'origin/${rb}'.`, `${b} now tracks origin/${rb}: git pull and git push know where to go.`);
    }
    if (args[0] === '-d' || args[0] === '-D') {
      const n = args[1];
      if (!n) return fail('fatal: branch name required');
      if (!has(s.branches, n)) return fail(`error: branch '${n}' not found`);
      if (n === s.head) return fail(`error: Cannot delete branch '${n}' checked out at '${REPO}'`, 'Switch to another branch first.');
      if (args[0] === '-d' && !isAncestor(s, s.branches[n], tip(s))) {
        return fail(`error: The branch '${n}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${n}'.`, `${n} has commits that ${s.head} does not: deleting the label would lose track of them.`);
      }
      const was = s.branches[n];
      delete s.branches[n];
      delete s.upstream[n];
      return ok(`Deleted branch ${n} (was ${short(was)}).`, `Only the label ${n} was deleted; commits reachable from other branches are kept.`);
    }
    const n = args[0];
    if (args[0].startsWith('-')) return fail(`error: unknown switch '${args[0].replace(/^-+/, '')}'`, 'This simulator supports git branch, git branch <name> and git branch -d <name>.');
    if (!validName(n)) return fail(`fatal: '${n}' is not a valid branch name`, 'Use letters, numbers, - and /, for example add-footer or feature/login.');
    if (has(s.branches, n)) return fail(`fatal: A branch named '${n}' already exists.`);
    if (!tip(s)) return fail(`fatal: Not a valid object name: '${s.head}'.`, 'A branch is a label on a commit, and there are no commits yet. Commit first.');
    s.branches[n] = tip(s);
    return ok('', `git branch created the label ${n} on commit ${tip(s)}. You are still on ${s.head}: use git switch ${n} to move to it.`);
  }

  function switchTo(s, name, create, cmd) {
    if (s.merge) return fail(`error: you need to resolve your current index first\n${s.merge.files.map((f) => `${f}: needs merge`).join('\n')}`, 'Finish the merge (resolve, git add, git commit) or run git merge --abort.');
    if (!name) return fail(cmd === 'switch' ? 'fatal: missing branch or commit argument' : 'fatal: you must specify a branch', `Example: git ${cmd} ${create ? (cmd === 'switch' ? '-c' : '-b') + ' ' : ''}feature`);
    if (create) {
      if (!validName(name)) return fail(`fatal: '${name}' is not a valid branch name`, 'Use letters, numbers, - and /, for example add-footer.');
      if (has(s.branches, name)) return fail(`fatal: a branch named '${name}' already exists`, `Use git ${cmd} ${name} (without ${cmd === 'switch' ? '-c' : '-b'}) to move to it.`);
      const from = tip(s);
      if (from) s.branches[name] = from;
      const prev = s.head;
      s.head = name;
      return ok(`Switched to a new branch '${name}'`, from
        ? `Created the label ${name} on ${from} (where ${prev} is) and moved HEAD to it. New commits will now go on ${name}; ${prev} stays where it is.`
        : `HEAD now points to ${name}. It has no commits yet; your first commit will create it.`);
    }
    if (name === s.head) return ok(`Already on '${name}'`, `You are already on ${name}.`);
    let created = '';
    if (!has(s.branches, name)) {
      if (has(s.tracking, name)) {
        s.branches[name] = s.tracking[name];
        const err = checkoutTree(s, s.branches[name]);
        if (err) { delete s.branches[name]; return fail(err, 'Commit (or restore) your changes first.'); }
        s.upstream[name] = name;
        s.head = name;
        return ok(`branch '${name}' set up to track 'origin/${name}'.\nSwitched to a new branch '${name}'`, `Git found origin/${name} and created a local ${name} from it, tracking the remote branch.`);
      }
      if (cmd === 'checkout') {
        if (has(s.index, name)) return restore(s, [name]);
        return fail(`error: pathspec '${name}' did not match any file(s) known to git`, `There is no branch called ${name}. List them with git branch, or create it with git checkout -b ${name}.`);
      }
      return fail(`fatal: invalid reference: ${name}`, `There is no branch called ${name}. List them with git branch, or create it with git switch -c ${name}.`);
    }
    const err = checkoutTree(s, s.branches[name]);
    if (err) return fail(err, 'Your uncommitted changes would be lost by switching. Commit them (or git restore them) first.');
    s.head = name;
    const carried = dirtyTracked(s);
    created = carried.length ? `\n${carried.map((f) => `M\t${f}`).join('\n')}` : '';
    return ok(`Switched to branch '${name}'${created}`, `HEAD now points to ${name}. The working directory now shows ${name}'s latest commit (${tip(s)}).${carried.length ? ` Your uncommitted changes to ${list(carried)} came with you.` : ''}`);
  }

  function switchCmd(s, args) {
    const create = args.includes('-c') || args.includes('-C') || args.includes('--create');
    const name = args.find((a) => !a.startsWith('-'));
    return switchTo(s, name, create, 'switch');
  }

  function checkout(s, args) {
    if (args[0] === '--') {
      if (!args[1]) return fail('fatal: you must specify path(s) to restore');
      const r = restore(s, args.slice(1));
      if (r.ok) r.explain = `${r.explain} (git checkout -- <file> is the older way to write git restore <file>.)`;
      return r;
    }
    const create = args.includes('-b') || args.includes('-B');
    const name = args.find((a) => !a.startsWith('-'));
    return switchTo(s, name, create, 'checkout');
  }

  /* ---- merge ------------------------------------------------------------------------------------------------ */

  /* Content of a conflicted file: common lines, then both versions between markers. */
  function conflictText(ours, theirs, label) {
    const o = linesOf(ours);
    const t = linesOf(theirs);
    let p = 0;
    while (p < o.length && p < t.length && o[p] === t[p]) p++;
    let q = 0;
    while (q < o.length - p && q < t.length - p && o[o.length - 1 - q] === t[t.length - 1 - q]) q++;
    return [...o.slice(0, p), '<<<<<<< HEAD', ...o.slice(p, o.length - q), '=======', ...t.slice(p, t.length - q), `>>>>>>> ${label}`, ...o.slice(o.length - q)].join('\n');
  }

  /* Merges commit `target` into the current branch. label names it in messages (feature, origin/main). */
  function mergeCommit(s, target, label, message) {
    const current = tip(s);
    if (!current) {
      const err = checkoutTree(s, target, 'merge');
      if (err) return fail(err);
      s.branches[s.head] = target;
      return ok(`Fast-forward\n${statText({}, tree(s, target)).text}`, `${s.head} had no commits, so it now simply points to ${target}.`);
    }
    if (target === current || isAncestor(s, target, current)) return ok('Already up to date.', `${s.head} already contains every commit of ${label}: nothing to merge.`);
    const dirty = dirtyTracked(s);
    if (dirty.length) {
      return fail(`error: Your local changes to the following files would be overwritten by merge:\n${dirty.map((f) => `\t${f}`).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting`,
        'Commit (or restore) your changes first, so the merge starts from a clean working directory.');
    }
    if (isAncestor(s, current, target)) {
      const stat = statText(headTree(s), tree(s, target), true);
      const err = checkoutTree(s, target, 'merge');
      if (err) return fail(err);
      s.branches[s.head] = target;
      return ok(`Updating ${short(current)}..${short(target)}\nFast-forward\n${stat.text}`,
        `Fast-forward: ${s.head} had no new commits of its own, so Git just moved the ${s.head} label forward to ${target}. No merge commit was needed.`);
    }
    const base = mergeBase(s, current, target);
    const B = tree(s, base);
    const O = headTree(s);
    const T = tree(s, target);
    const result = {};
    const conflicts = [];
    union(B, O, T).forEach((n) => {
      const b = get(B, n);
      const o = get(O, n);
      const t = get(T, n);
      let r;
      if (o === t) r = o;
      else if (o === b) r = t;
      else if (t === b) r = o;
      else { conflicts.push(n); r = o; }
      if (r !== undefined) result[n] = r;
    });
    const before = { ...O };
    union(O, result).forEach((n) => {
      if (has(result, n)) { s.index[n] = result[n]; s.work[n] = result[n]; } else { delete s.index[n]; delete s.work[n]; }
    });
    if (conflicts.length) {
      conflicts.forEach((n) => { s.work[n] = conflictText(get(O, n), get(T, n), label); });
      s.merge = { theirs: target, name: label, files: conflicts.slice() };
      const autos = union(O, T).filter((n) => get(O, n) !== get(T, n));
      return fail(`${autos.map((n) => `Auto-merging ${n}`).join('\n')}\n${conflicts.map((n) => `CONFLICT (content): Merge conflict in ${n}`).join('\n')}\nAutomatic merge failed; fix conflicts and then commit the result.`,
        `Both branches changed the same lines of ${list(conflicts)}, so Git cannot choose. It wrote both versions into the file between <<<<<<< and >>>>>>> markers. Fix it (here: edit ${conflicts[0]}), then git add ${conflicts[0]} and git commit.`);
    }
    const id = makeCommit(s, message, [current, target], result, s.head);
    s.branches[s.head] = id;
    return ok(`Merge made by the 'ort' strategy.\n${statText(before, result, true).text}`,
      `Both ${s.head} and ${label} had new commits since they split at ${short(base)}, so Git combined them in a merge commit (${id}) with two parents.`);
  }

  function merge(s, args) {
    if (args.includes('--abort')) {
      if (!s.merge) return fail('fatal: There is no merge to abort (MERGE_HEAD missing).');
      const H = headTree(s);
      union(H, s.index).forEach((n) => { if (has(H, n)) { s.index[n] = H[n]; s.work[n] = H[n]; } else { delete s.index[n]; delete s.work[n]; } });
      s.merge = null;
      return ok('', `Merge aborted: ${s.head} and the working directory are back to how they were before git merge.`);
    }
    if (s.merge) {
      return fail(s.merge.files.length
        ? "error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict."
        : 'fatal: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge.', 'Finish the current merge first.');
    }
    const name = args.find((a) => !a.startsWith('-'));
    if (!name) return fail('fatal: No remote for the current branch.', 'Say which branch to merge into the current one: git merge <branch>.');
    let target = null;
    if (has(s.branches, name)) target = s.branches[name];
    else if (name.startsWith('origin/') && has(s.tracking, name.slice(7))) target = s.tracking[name.slice(7)];
    if (!target) return fail(`merge: ${name} - not something we can merge`, `There is no branch called ${name}. git branch lists them.`);
    if (name === s.head) return ok('Already up to date.', 'You cannot merge a branch into itself.');
    return mergeCommit(s, target, name, s.head === 'main' ? `Merge branch '${name}'` : `Merge branch '${name}' into ${s.head}`);
  }

  /* ---- remotes ---------------------------------------------------------------------------------------------- */

  const NO_REMOTE = (name = 'origin') => fail(`fatal: '${name}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`,
    `There is no remote called ${name}. Connect one with git remote add origin <url> (the URL of your GitHub repository).`);

  function remote(s, args) {
    if (args[0] === 'add') {
      const [, name, url] = args;
      if (!name || !url) return fail('usage: git remote add <name> <url>');
      if (name !== 'origin') return fail('This simulator supports one remote, called origin.', 'Use git remote add origin <url>.');
      if (s.remote) return fail('error: remote origin already exists.', 'git remote -v shows it.');
      s.remote = { name: 'origin', url, branches: {} };
      return ok('', `origin is now a short name for ${url}. Publish a branch with git push -u origin ${s.head}.`);
    }
    if (args.length && !(args[0] === '-v' || args[0] === '--verbose')) return fail(`error: unknown subcommand: ${args[0]}`, 'This simulator supports git remote, git remote -v and git remote add origin <url>.');
    if (!s.remote) return ok('', 'No remotes yet: this repository only exists on your computer.');
    const verbose = args[0] === '-v' || args[0] === '--verbose';
    return ok(verbose ? `origin\t${s.remote.url} (fetch)\norigin\t${s.remote.url} (push)` : 'origin', 'origin is the short name for the GitHub repository this one talks to.');
  }

  function fetchRefs(s, only) {
    const lines = [];
    Object.keys(s.remote.branches).sort().forEach((b) => {
      if (only && b !== only) return;
      const now = s.remote.branches[b];
      const was = s.tracking[b];
      if (now === was) return;
      lines.push(was ? `   ${short(was)}..${short(now)}  ${b.padEnd(10)} -> origin/${b}` : ` * [new branch]      ${b.padEnd(10)} -> origin/${b}`);
      s.tracking[b] = now;
    });
    return lines.length ? `From ${s.remote.url}\n${lines.join('\n')}` : '';
  }

  function fetch(s, args) {
    if (args[0] && args[0] !== 'origin') return NO_REMOTE(args[0]);
    if (!s.remote) return NO_REMOTE();
    const out = fetchRefs(s);
    return ok(out, out ? 'git fetch downloaded the new commits and moved the origin/... labels. Your own branches did not change: merge or pull to bring the work in.' : 'Nothing new on origin.');
  }

  function push(s, args) {
    const setUp = args.includes('-u') || args.includes('--set-upstream');
    const pos = args.filter((a) => !a.startsWith('-'));
    const remoteName = pos[0];
    if (remoteName && remoteName !== 'origin') return NO_REMOTE(remoteName);
    if (!s.remote) return NO_REMOTE();
    const b = pos[1] || (remoteName ? s.head : s.upstream[s.head]);
    if (!b) {
      return fail(`fatal: The current branch ${s.head} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${s.head}\n`,
        `Git does not know where ${s.head} goes on GitHub yet. The first time, use git push -u origin ${s.head}.`);
    }
    const local = s.branches[b];
    if (!local) return fail(`error: src refspec ${b} does not match any\nerror: failed to push some refs to '${s.remote.url}'`, `There is no local branch ${b} with commits to push. Commit first.`);
    const remoteTip = s.remote.branches[b] || null;
    const upLine = setUp ? `\nbranch '${b}' set up to track 'origin/${b}'.` : '';
    if (remoteTip === local) {
      if (setUp) s.upstream[b] = b;
      s.tracking[b] = local;
      return ok(`Everything up-to-date${upLine}`, `origin/${b} already has every commit of ${b}.`);
    }
    if (remoteTip && !isAncestor(s, remoteTip, local)) {
      return fail(`To ${s.remote.url}\n ! [rejected]        ${b} -> ${b} (fetch first)\nerror: failed to push some refs to '${s.remote.url}'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.`,
        `origin/${b} has commits you do not have (a teammate pushed). Git refuses to overwrite them: git pull first, then git push.`);
    }
    const sent = countOnly(s, local, remoteTip);
    s.remote.branches[b] = local;
    s.tracking[b] = local;
    if (setUp) s.upstream[b] = b;
    const line = remoteTip ? `   ${short(remoteTip)}..${short(local)}  ${b} -> ${b}` : ` * [new branch]      ${b} -> ${b}`;
    return ok(`To ${s.remote.url}\n${line}${upLine}`,
      `git push uploaded ${plural(sent, 'commit')} to GitHub: origin/${b} now points to ${local}, the same commit as your ${b}.${setUp ? ` ${b} now tracks origin/${b}, so next time plain git push is enough.` : ''}`);
  }

  function pull(s, args) {
    const pos = args.filter((a) => !a.startsWith('-'));
    if (pos[0] && pos[0] !== 'origin') return NO_REMOTE(pos[0]);
    if (!s.remote) return NO_REMOTE();
    const b = pos[1] || s.upstream[s.head];
    if (!b) {
      return fail(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull origin <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/${s.head} ${s.head}\n`,
        `${s.head} does not track a remote branch yet. Use git pull origin <branch>, or push it once with git push -u origin ${s.head}.`);
    }
    if (!has(s.remote.branches, b)) return fail(`fatal: couldn't find remote ref ${b}`, `GitHub has no branch called ${b}.`);
    if (s.merge) return fail("error: Pulling is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.");
    const fetched = fetchRefs(s, b);
    const r = mergeCommit(s, s.tracking[b], `origin/${b}`, `Merge branch '${b}' of ${s.remote.url}`);
    r.output = [fetched, r.output].filter(Boolean).join('\n');
    r.explain = `git pull = git fetch (download origin/${b}) + git merge origin/${b}. ${r.explain}`;
    return r;
  }

  function diff(s, args) {
    const cached = args.includes('--staged') || args.includes('--cached');
    const from = cached ? headTree(s) : s.index;
    const to = cached ? s.index : s.work;
    const names = (cached ? union(from, to) : Object.keys(s.index).sort()).filter((n) => get(from, n) !== get(to, n) && !isConflicted(s, n));
    if (!names.length) {
      return ok('', cached ? 'Nothing is staged: the staging area matches the last commit.' : 'No unstaged changes: every tracked file matches the staging area. (Untracked files never show in git diff.)');
    }
    let ins = 0;
    let del = 0;
    const blocks = names.map((n) => {
      const d = diffLines(get(from, n), get(to, n));
      ins += d.plus.length;
      del += d.minus.length;
      return [`diff --git a/${n} b/${n}`, `--- ${has(from, n) ? `a/${n}` : '/dev/null'}`, `+++ ${has(to, n) ? `b/${n}` : '/dev/null'}`, ...d.minus.map((l) => `-${l}`), ...d.plus.map((l) => `+${l}`)].join('\n');
    });
    const statLines = names.map((n) => { const d = diffLines(get(from, n), get(to, n)); return ` ${n} | ${d.plus.length + d.minus.length} ${'+'.repeat(d.plus.length)}${'-'.repeat(d.minus.length)}`; });
    return ok(`${statLines.join('\n')}\n ${plural(names.length, 'file')} changed, ${ins} insertion${ins === 1 ? '' : 's'}(+), ${del} deletion${del === 1 ? '' : 's'}(-)\n\n${blocks.join('\n')}`,
      cached ? 'git diff --staged shows what the next commit would add (+) and remove (-).' : 'git diff shows edits you have not staged yet: + lines were added, - lines were removed.');
  }

  const COMMANDS = {
    init, status, add, restore, commit, log, branch, merge, remote, fetch, push, pull, diff, checkout,
    switch: switchCmd,
  };

  /* ---- helpers: edit, rm, remote-commit -------------------------------------------------------------------------- */

  const validFile = (n) => /^[\w.\-/]+$/.test(n) && !n.includes('..');

  function edit(s, args) {
    if (!args.length) return fail('usage: edit <file>', 'Example: edit index.html');
    const done = [];
    for (const n of args) {
      if (!validFile(n)) return fail(`edit: invalid file name '${n}'`, 'Use names like index.html or css/styles.css.');
      const c = get(s.work, n);
      if (c !== undefined && /^<<<<<<< /m.test(c)) {
        s.work[n] = c.split('\n').filter((l) => !/^(<<<<<<< |=======$|>>>>>>> )/.test(l)).join('\n');
        done.push({ n, kind: 'resolved' });
      } else {
        const existed = c !== undefined;
        s.work[n] = editContent(s, n, c);
        done.push({ n, kind: existed ? 'changed' : 'created' });
      }
    }
    const tracked = (n) => has(s.index, n);
    const msg = done.map(({ n, kind }) => {
      if (kind === 'resolved') return `You resolved the conflict in ${n}: the markers are gone and both changes are kept. Now mark it resolved with git add ${n}.`;
      if (kind === 'created') return `You created ${n}. Git sees it as untracked until you git add it.`;
      return tracked(n) ? `You changed ${n} in the working directory. Git sees it as modified (not staged yet).` : `You changed ${n}; it is still untracked.`;
    }).join(' ');
    return ok('', msg);
  }

  function rmFile(s, args) {
    if (!args.length) return fail('rm: missing operand');
    const n = args[0];
    if (!has(s.work, n)) return fail(`rm: cannot remove '${n}': No such file or directory`);
    delete s.work[n];
    return ok('', has(s.index, n)
      ? `You deleted ${n}. Git sees it as deleted; git add ${n} stages the deletion (or git restore ${n} brings it back).`
      : `You deleted ${n}. It was untracked, so Git never had a copy.`);
  }

  function remoteCommit(s, args) {
    if (!s.remote) return fail('remote-commit: there is no remote yet', 'Connect one first: git remote add origin <url>.');
    const names = Object.keys(s.remote.branches);
    if (!names.length) return fail('remote-commit: the remote has no commits yet', 'Push first; then a teammate can add commits.');
    const b = (s.upstream[s.head] && has(s.remote.branches, s.upstream[s.head])) ? s.upstream[s.head] : (has(s.remote.branches, 'main') ? 'main' : names[0]);
    const n = args[0] || 'README.md';
    if (!validFile(n)) return fail(`remote-commit: invalid file name '${n}'`);
    const parent = s.remote.branches[b];
    const snap = { ...tree(s, parent) };
    snap[n] = editContent(s, n, snap[n]).replace(/: change (\d+)$/, ': teammate change $1');
    const id = makeCommit(s, `Update ${n}`, [parent], snap, b);
    s.remote.branches[b] = id;
    return ok(`(simulated) A teammate pushed commit ${id} "Update ${n}" to origin/${b}.`,
      `GitHub now has a commit you do not. Your computer does not know yet: git status still trusts its old origin/${b} until git fetch or git pull. A git push now would be rejected.`);
  }

  /* ---- Challenge checks ----------------------------------------------------------------------------------------- */

  /* check keys: commits (minimum reachable from HEAD), staged / untracked / modified (exact counts),
     branches (must exist), current, pushed, merged (that branch's tip is in HEAD's history), clean. */
  function evaluate(check = {}, s) {
    const c = counts(s);
    const head = tip(s);
    const unmet = [];
    const test = (key, cond) => { if (!cond) unmet.push(key); };
    if (check.commits !== undefined) test('commits', s.initialized && ancestors(s, head).size >= check.commits);
    if (check.staged !== undefined) test('staged', s.initialized && c.staged === check.staged);
    if (check.untracked !== undefined) test('untracked', c.untracked === check.untracked);
    if (check.modified !== undefined) test('modified', s.initialized && c.modified === check.modified);
    if (check.branches) test('branches', check.branches.every((b) => has(s.branches, b)));
    if (check.current !== undefined) test('current', s.head === check.current);
    if (check.pushed) test('pushed', !!(s.remote && head && s.remote.branches[s.head] === head));
    if (check.merged !== undefined) test('merged', has(s.branches, check.merged) && !!head && isAncestor(s, s.branches[check.merged], head));
    if (check.clean) test('clean', s.initialized && !c.staged && !c.modified && !c.untracked && !c.conflicted && !s.merge);
    return { ok: unmet.length === 0, unmet };
  }

  /* ---- Graph data (for the SVG in git-sim.js) ------------------------------------------------------------------- */

  /* Commits the local repository knows (local branches, origin/... refs, a merge in progress), oldest first,
     each with a lane (one per branch name, main first) and its labels. */
  function graph(s) {
    const starts = [...Object.values(s.branches), ...Object.values(s.tracking), ...(s.merge ? [s.merge.theirs] : [])];
    const ids = [...new Set(starts.flatMap((id) => [...ancestors(s, id)]))].sort((a, b) => s.commits[a].n - s.commits[b].n);
    const lanes = ['main'];
    ids.forEach((id) => { const b = s.commits[id].branch; if (!lanes.includes(b)) lanes.push(b); });
    const nodes = ids.map((id, x) => {
      const c = s.commits[id];
      const labels = [];
      Object.keys(s.branches).sort().forEach((b) => { if (s.branches[b] === id) labels.push({ name: b, kind: b === s.head ? 'head' : 'local' }); });
      Object.keys(s.tracking).sort().forEach((b) => { if (s.tracking[b] === id) labels.push({ name: `origin/${b}`, kind: 'remote' }); });
      return { id, message: c.message, parents: c.parents.filter((p) => ids.includes(p)), x, lane: lanes.indexOf(c.branch), labels };
    });
    return { nodes, lanes };
  }

  /* Commits reachable from a ref, newest first (for the area panels). */
  const history = (s, id) => [...ancestors(s, id)].sort((a, b) => s.commits[b].n - s.commits[a].n).map((c) => s.commits[c]);

  return {
    URL, createState, run, evaluate, fileStates, counts, graph, history, tip, aheadBehind, tokenize, short,
  };
})();

if (typeof module !== 'undefined') module.exports = GitEngine;
