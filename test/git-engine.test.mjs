// Commit and branch simulator engine (site/js/tools/git-engine.js). Run: node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const G = require('../js/tools/git-engine.js');

/* Runs commands in order; returns the last result. Fails if an earlier command failed unexpectedly. */
function sh(s, ...lines) {
  let r;
  lines.forEach((l, k) => {
    r = G.run(s, l);
    if (k < lines.length - 1) assert.ok(r.ok, `"${l}" failed: ${r.output}`);
  });
  return r;
}
const repo = (files = { 'index.html': 'committed' }, remote = false) => G.createState({ files, remote });

test('commands need a repository until git init', () => {
  const s = G.createState({ files: { 'a.txt': 'untracked' } });
  assert.equal(s.initialized, false);
  const r = G.run(s, 'git status');
  assert.equal(r.ok, false);
  assert.match(r.output, /fatal: not a git repository/);
  assert.match(G.run(s, 'git init').output, /Initialized empty Git repository/);
  assert.match(G.run(s, 'git init').output, /Reinitialized/);
});

test('status before the first commit lists untracked files', () => {
  const s = G.createState({ files: { 'a.txt': 'untracked' }, init: true });
  const out = G.run(s, 'git status').output;
  assert.match(out, /On branch main/);
  assert.match(out, /No commits yet/);
  assert.match(out, /Untracked files:\n {2}\(use "git add <file>\.\.\." to include in what will be committed\)\n\ta\.txt/);
  assert.match(out, /nothing added to commit but untracked files present/);
});

test('add and commit create a root commit and a clean tree', () => {
  const s = G.createState({ files: { 'a.txt': 'untracked', 'b.txt': 'untracked' }, init: true });
  const r = sh(s, 'git add .', 'git commit -m "First commit"');
  assert.ok(r.ok);
  assert.match(r.output, /^\[main \(root-commit\) [0-9a-f]{7}\] First commit\n 2 files changed, 2 insertions\(\+\)/);
  assert.match(r.output, /create mode 100644 a\.txt/);
  assert.match(G.run(s, 'git status').output, /nothing to commit, working tree clean/);
  assert.deepEqual(G.evaluate({ commits: 1, clean: true }, s), { ok: true, unmet: [] });
});

test('status separates staged, unstaged and untracked changes', () => {
  const s = repo({ 'index.html': 'committed', 'styles.css': 'modified', 'notes.txt': 'untracked' });
  sh(s, 'edit index.html', 'git add index.html');
  const out = G.run(s, 'git status').output;
  assert.match(out, /Changes to be committed:[\s\S]*\tmodified: {3}index\.html/);
  assert.match(out, /Changes not staged for commit:[\s\S]*\tmodified: {3}styles\.css/);
  assert.match(out, /Untracked files:[\s\S]*\tnotes\.txt/);
  assert.deepEqual(G.counts(s), { staged: 1, modified: 1, untracked: 1, conflicted: 0 });
});

test('git add of a missing file is a pathspec error and changes nothing', () => {
  const s = repo();
  const r = G.run(s, 'git add nope.txt');
  assert.equal(r.ok, false);
  assert.equal(r.output, "fatal: pathspec 'nope.txt' did not match any files");
});

test('restore --staged unstages but keeps the file; restore discards edits', () => {
  const s = repo({ 'index.html': 'modified', '.env': 'untracked' });
  sh(s, 'git add .');
  assert.equal(G.counts(s).staged, 2);
  sh(s, 'git restore --staged .env');
  assert.deepEqual(G.counts(s), { staged: 1, modified: 0, untracked: 1, conflicted: 0 });
  assert.ok('.env' in s.work);
  const t = repo({ 'styles.css': 'modified' });
  sh(t, 'git restore styles.css');
  assert.ok(G.evaluate({ clean: true }, t).ok);
  assert.match(G.run(t, 'git restore ghost.js').output, /did not match any file\(s\) known to git/);
});

test('commit with nothing staged prints the status and fails', () => {
  const s = repo({ 'index.html': 'modified' });
  const r = G.run(s, 'git commit -m "nothing"');
  assert.equal(r.ok, false);
  assert.match(r.output, /no changes added to commit/);
  assert.equal(G.run(s, 'git commit').ok, false);
  assert.match(G.run(s, 'git commit -m ""').output, /empty commit message/);
});

test('quoted messages keep their spaces; -am stages tracked files', () => {
  const s = repo({ 'index.html': 'modified' });
  const r = G.run(s, "git commit -am 'Fix the header layout'");
  assert.ok(r.ok);
  assert.match(r.output, /\] Fix the header layout\n/);
  assert.match(G.run(s, 'git log --oneline').output, /^[0-9a-f]{7} \(HEAD -> main\) Fix the header layout\n[0-9a-f]{7} Initial commit$/);
  assert.equal(G.tokenize('git commit -m "a b" x').length, 5);
  assert.equal(G.tokenize('git commit -m "open'), null);
  assert.match(G.run(s, 'git commit -m "open').output, /unmatched quote/);
});

test('git log shows full entries with the author', () => {
  const s = repo();
  const out = G.run(s, 'git log').output;
  assert.match(out, /^commit [0-9a-f]{7} \(HEAD -> main\)\nAuthor: Student <student@example\.com>\n\n {4}Initial commit/);
  const e = G.createState({ files: {}, init: true });
  assert.match(G.run(e, 'git log').output, /does not have any commits yet/);
});

test('branch creates a label, switch moves HEAD', () => {
  const s = repo();
  sh(s, 'git branch feature');
  assert.equal(s.head, 'main');
  assert.equal(s.branches.feature, s.branches.main);
  assert.match(G.run(s, 'git branch').output, /\* main\n {2}feature|  feature\n\* main/);
  assert.equal(G.run(s, 'git branch feature').output, "fatal: A branch named 'feature' already exists.");
  assert.equal(G.run(s, 'git switch feature').output, "Switched to branch 'feature'");
  assert.equal(G.run(s, 'git switch -c add-footer').output, "Switched to a new branch 'add-footer'");
  assert.equal(G.run(s, 'git checkout -b x2').output, "Switched to a new branch 'x2'");
  assert.equal(G.run(s, 'git switch nope').output, 'fatal: invalid reference: nope');
  assert.match(G.run(s, 'git checkout nope').output, /pathspec 'nope' did not match/);
  assert.equal(G.run(s, 'git branch "bad name"').ok, false);
});

test('branch before the first commit is not a valid object', () => {
  const s = G.createState({ files: { 'a.txt': 'untracked' }, init: true });
  assert.equal(G.run(s, 'git branch feature').output, "fatal: Not a valid object name: 'main'.");
});

test('switching branches updates the working directory', () => {
  const s = repo();
  sh(s, 'git switch -c feature', 'edit index.html', 'edit about.html', 'git add .', 'git commit -m "Feature"');
  assert.ok('about.html' in s.work);
  sh(s, 'git switch main');
  assert.ok(!('about.html' in s.work));
  assert.equal(s.work['index.html'], 'index.html: first version');
});

test('switch refuses to overwrite uncommitted changes', () => {
  const s = repo();
  sh(s, 'git switch -c feature', 'edit index.html', 'git commit -am "F"', 'git switch main', 'edit index.html');
  const r = G.run(s, 'git switch feature');
  assert.equal(r.ok, false);
  assert.match(r.output, /would be overwritten by checkout:\n\tindex\.html/);
  assert.equal(s.head, 'main');
});

test('merge fast-forwards when main has not moved', () => {
  const s = repo();
  sh(s, 'git switch -c add-contact', 'edit index.html', 'git add index.html', 'git commit -m "Contact"', 'git switch main');
  const r = G.run(s, 'git merge add-contact');
  assert.ok(r.ok);
  assert.match(r.output, /^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}\nFast-forward\n 1 file changed, 1 insertion\(\+\)/);
  assert.equal(s.branches.main, s.branches['add-contact']);
  assert.ok(G.evaluate({ current: 'main', merged: 'add-contact', commits: 2, clean: true }, s).ok);
  assert.equal(G.run(s, 'git merge add-contact').output, 'Already up to date.');
});

test('merge creates a two-parent commit when both sides changed different files', () => {
  const s = repo({ 'index.html': 'committed', 'styles.css': 'committed' });
  sh(s, 'git switch -c feature', 'edit index.html', 'git commit -am "Index"', 'git switch main', 'edit styles.css', 'git commit -am "Styles"');
  const r = G.run(s, 'git merge feature');
  assert.ok(r.ok);
  assert.match(r.output, /Merge made by the 'ort' strategy/);
  const head = s.commits[s.branches.main];
  assert.equal(head.parents.length, 2);
  assert.equal(head.message, "Merge branch 'feature'");
  assert.match(s.work['index.html'], /change/);
  assert.match(s.work['styles.css'], /change/);
});

test('conflicting merge writes markers and needs edit + add + commit', () => {
  const s = repo();
  sh(s, 'git switch -c fix-title', 'edit index.html', 'git commit -am "Theirs"', 'git switch main', 'edit index.html', 'git commit -am "Ours"');
  const r = G.run(s, 'git merge fix-title');
  assert.equal(r.ok, false);
  assert.match(r.output, /CONFLICT \(content\): Merge conflict in index\.html\nAutomatic merge failed/);
  assert.match(s.work['index.html'], /<<<<<<< HEAD\n[^\n]+\n=======\n[^\n]+\n>>>>>>> fix-title/);
  assert.match(G.run(s, 'git status').output, /You have unmerged paths[\s\S]*both modified: {3}index\.html/);
  assert.match(G.run(s, 'git commit -m "x"').output, /Committing is not possible because you have unmerged files/);
  assert.equal(G.run(s, 'git switch fix-title').ok, false);
  sh(s, 'edit index.html');
  assert.ok(!/<<<<<<<|>>>>>>>|=======/.test(s.work['index.html']));
  sh(s, 'git add index.html');
  assert.match(G.run(s, 'git status').output, /All conflicts fixed but you are still merging/);
  const c = G.run(s, 'git commit -m "Merge fix-title"');
  assert.ok(c.ok);
  assert.equal(s.commits[s.branches.main].parents.length, 2);
  assert.ok(G.evaluate({ current: 'main', merged: 'fix-title', commits: 4, clean: true }, s).ok);
});

test('merge --abort restores the pre-merge state', () => {
  const s = repo();
  sh(s, 'git switch -c b', 'edit index.html', 'git commit -am "B"', 'git switch main', 'edit index.html', 'git commit -am "M"');
  const before = s.work['index.html'];
  G.run(s, 'git merge b');
  sh(s, 'git merge --abort');
  assert.equal(s.merge, null);
  assert.equal(s.work['index.html'], before);
});

test('push needs a remote and an upstream; -u sets it', () => {
  const s = repo();
  assert.match(G.run(s, 'git push').output, /'origin' does not appear to be a git repository/);
  sh(s, 'git remote add origin https://github.com/student/my-site.git');
  assert.match(G.run(s, 'git remote -v').output, /^origin\thttps:\/\/github\.com\/student\/my-site\.git \(fetch\)\norigin\t.* \(push\)$/);
  assert.match(G.run(s, 'git push').output, /has no upstream branch[\s\S]*git push --set-upstream origin main/);
  const r = G.run(s, 'git push -u origin main');
  assert.ok(r.ok);
  assert.match(r.output, / \* \[new branch\] {6}main -> main\nbranch 'main' set up to track 'origin\/main'\./);
  assert.ok(G.evaluate({ pushed: true }, s).ok);
  assert.equal(G.run(s, 'git push').output, 'Everything up-to-date');
});

test('status reports ahead of origin; push publishes', () => {
  const s = repo({ 'styles.css': 'committed' }, true);
  sh(s, 'edit styles.css', 'git commit -am "Style"');
  assert.match(G.run(s, 'git status').output, /ahead of 'origin\/main' by 1 commit\./);
  assert.equal(G.evaluate({ pushed: true }, s).ok, false);
  const r = G.run(s, 'git push');
  assert.match(r.output, /^To https:\/\/github\.com\/student\/my-site\.git\n {3}[0-9a-f]{7}\.\.[0-9a-f]{7} {2}main -> main$/);
  assert.ok(G.evaluate({ current: 'main', commits: 2, pushed: true, clean: true }, s).ok);
});

test('a teammate push makes our push rejected until we pull', () => {
  const s = repo({ 'index.html': 'committed' }, true);
  sh(s, 'remote-commit README.md', 'edit index.html', 'git commit -am "Mine"');
  const r = G.run(s, 'git push');
  assert.equal(r.ok, false);
  assert.match(r.output, /! \[rejected\] {8}main -> main \(fetch first\)/);
  const p = G.run(s, 'git pull');
  assert.ok(p.ok, p.output);
  assert.match(p.output, /From https:\/\/github\.com\/student\/my-site\.git/);
  assert.ok('README.md' in s.work);
  assert.ok(G.run(s, 'git push').ok);
  assert.ok(G.evaluate({ pushed: true }, s).ok);
});

test('pull fast-forwards when we have no local commits', () => {
  const s = repo({ 'index.html': 'committed' }, true);
  sh(s, 'remote-commit index.html');
  assert.match(G.run(s, 'git status').output, /up to date/);
  sh(s, 'git fetch');
  assert.match(G.run(s, 'git status').output, /behind 'origin\/main' by 1 commit, and can be fast-forwarded/);
  const p = G.run(s, 'git pull');
  assert.match(p.output, /Fast-forward/);
  assert.equal(s.branches.main, s.remote.branches.main);
});

test('push a new branch with -u for a pull request', () => {
  const s = repo({ 'index.html': 'committed', 'app.js': 'committed' }, true);
  sh(s, 'git switch -c validate-form', 'edit app.js', 'git add app.js', 'git commit -m "Validate form fields"', 'git push -u origin validate-form');
  assert.ok(G.evaluate({ branches: ['main', 'validate-form'], current: 'validate-form', commits: 2, pushed: true, clean: true }, s).ok);
  assert.equal(s.upstream['validate-form'], 'validate-form');
});

test('diff summarises unstaged edits with +/- counts', () => {
  const s = repo({ 'styles.css': 'modified' });
  const r = G.run(s, 'git diff');
  assert.match(r.output, /^ styles\.css \| 1 \+\n 1 file changed, 1 insertion\(\+\), 0 deletions\(-\)/);
  assert.match(r.output, /\+styles\.css: change \d+/);
  sh(s, 'git add styles.css');
  assert.equal(G.run(s, 'git diff').output, '');
  assert.match(G.run(s, 'git diff --staged').output, /styles\.css \| 1 \+/);
});

test('evaluate reports unmet checks', () => {
  const s = repo({ 'index.html': 'committed', 'notes.txt': 'untracked' });
  const r = G.evaluate({ commits: 2, untracked: 1, clean: true, branches: ['main', 'dev'], current: 'main' }, s);
  assert.equal(r.ok, false);
  assert.deepEqual(r.unmet.sort(), ['branches', 'clean', 'commits']);
  assert.ok(G.evaluate({ staged: 0, modified: 0, untracked: 1 }, s).ok);
  assert.equal(G.evaluate({ merged: 'nope' }, s).ok, false);
});

test('helpers and unknown commands give helpful messages', () => {
  const s = repo();
  assert.equal(G.run(s, 'cat nope').output, 'cat: nope: No such file or directory');
  assert.match(G.run(s, 'git stash').output, /real Git has this command, but this simulator does not/);
  assert.match(G.run(s, 'git comit -m x').output, /'comit' is not a git command/);
  assert.match(G.run(s, 'npm start').output, /command not found/);
  assert.ok(G.run(s, 'clear').clear);
  assert.ok(G.run(s, 'reset-sim').reset);
  sh(s, 'rm index.html');
  assert.match(G.run(s, 'git status').output, /\tdeleted: {4}index\.html/);
  sh(s, 'git add index.html');
  assert.match(G.run(s, 'git status').output, /Changes to be committed:[\s\S]*\tdeleted: {4}index\.html/);
});

test('graph lists commits with lanes and labels', () => {
  const s = repo({ 'index.html': 'committed' }, true);
  sh(s, 'git switch -c feature', 'edit index.html', 'git commit -am "F"');
  const g = G.graph(s);
  assert.equal(g.nodes.length, 2);
  assert.deepEqual(g.lanes, ['main', 'feature']);
  const last = g.nodes[1];
  assert.equal(last.lane, 1);
  assert.deepEqual(last.labels, [{ name: 'feature', kind: 'head' }]);
  assert.deepEqual(g.nodes[0].labels.map((l) => l.name), ['main', 'origin/main']);
});

test('switch to a branch that only exists on origin creates a tracking branch', () => {
  const s = repo({ 'index.html': 'committed' }, true);
  s.remote.branches.dev = s.branches.main;
  sh(s, 'git fetch');
  const r = G.run(s, 'git switch dev');
  assert.match(r.output, /branch 'dev' set up to track 'origin\/dev'\.\nSwitched to a new branch 'dev'/);
  assert.equal(s.upstream.dev, 'dev');
});
