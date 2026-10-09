'use strict';
/* Version control: concept cards, quiz, rail groups and the guided challenges of the
   `git-sim` tool (Git and GitHub as the worked example). See site/README.md for the data
   contract. */

DATA.en.GIT_QUIZ_TOPICS = {
  why: 'Version control, Git and GitHub',
  model: 'Three areas, staging and commits',
  setup: 'Install, configure, init and clone',
  daily: 'Everyday commands and .gitignore',
  branch: 'Branches, merge and conflicts',
  remote: 'Remotes, sign-in, push, fetch and pull',
  collab: 'Tags, stash, GitHub flow and pull requests',
  undo: 'Undoing safely',
};

DATA.en.GIT_GROUPS = [
  { key: 'why', label: 'Why version control', icon: 'why' },
  { key: 'model', label: 'How Git thinks', icon: 'storage' },
  { key: 'setup', label: 'Setup', icon: 'key' },
  { key: 'daily', label: 'Everyday commands', icon: 'steps' },
  { key: 'branch', label: 'Branches and merging', icon: 'split' },
  { key: 'remote', label: 'Remotes', icon: 'arrow' },
  { key: 'collab', label: 'Working in a team', icon: 'cluster' },
  { key: 'undo', label: 'Undoing safely', icon: 'special' },
];

DATA.en.GIT_CONCEPTS = [
  /* ---- 1. Why version control --------------------------------------------------- */
  { id: 'version-control', hub: 'why', topic: 'why', title: 'What version control is, and why',
    summary: 'Version control records chosen, labelled states of a whole project over time, so you can see what changed, when and by whom, go back to any earlier state, and work in parallel with other people.',
    html: [
      '<p>Your project becomes a <strong>timeline of checkpoints you create on purpose</strong>. Each checkpoint is a complete picture of every tracked file, with a description and an author, and any two checkpoints can be compared line by line. That replaces <code>index_final.html</code>, <code>index_final_v2.html</code> and <code>index_FINAL_really.html</code>.</p>',
      '<dl><dt>Tracking</dt><dd>Every change is recorded with who, when and why.</dd>'
        + '<dt>Collaboration</dt><dd>Several people change the same project without overwriting each other.</dd>'
        + '<dt>Rollback</dt><dd>Go back to, or cancel, any earlier change.</dd>'
        + '<dt>Branching</dt><dd>Try an idea on a separate line of work, then combine it or throw it away.</dd></dl>',
      '<p><strong>Git</strong> is the version-control system of almost every software project today. It is <strong>distributed</strong>: every copy of a project holds the complete history, so committing, reading the history and comparing versions all work offline; the network is needed only to exchange work with another copy. Older <strong>centralized</strong> systems, such as Subversion, kept the history on one server.</p>',
    ],
    example: 'On Monday you save a checkpoint called "Add contact form". On Wednesday the layout is broken. The history shows three checkpoints since Monday, and comparing Monday with today shows the single line in `styles.css` that changed `display: grid` to `display: flex`. You fix that line instead of guessing.',
    mistake: 'Treating version control as cloud sync (OneDrive, Dropbox, Google Drive). Sync silently keeps the **latest** version of each file; version control keeps **chosen, described, whole-project** checkpoints, and records nothing until you ask. Do not keep a Git project inside a synced folder either: sync and Git writing the same hidden files at once causes lock errors and damaged repositories.' },

  { id: 'git-vs-github', hub: 'why', topic: 'why', title: 'Git vs GitHub',
    summary: 'Git is the version-control program that runs on your computer; GitHub is a website that stores copies of Git repositories online and adds team features such as pull requests, reviews and issues.',
    html: [
      '<p>Git does all the version control on your machine. GitHub is <strong>one more copy of your project</strong>, on a server you and your teammates can all reach, with a website around it. You can use Git without GitHub; GitHub is useless without Git. Work moves between the copies only when you say so (see <a href="#/vcs/repositories/remotes-push">Remotes, origin and git push</a>). GitLab and Bitbucket host Git repositories the same way.</p>',
      '<table><caption>Who does what</caption><thead><tr><th scope="col"></th><th scope="col">Git</th><th scope="col">GitHub</th></tr></thead><tbody>'
        + '<tr><th scope="row">What it is</th><td>A command-line program you install</td><td>A website (a hosting service) run by a company</td></tr>'
        + '<tr><th scope="row">Where it runs</th><td>Your laptop, offline</td><td>GitHub servers, through the browser or the network</td></tr>'
        + '<tr><th scope="row">Main jobs</th><td>Stage, commit, branch, merge, read history</td><td>Store a shared copy, pull requests, code review, access control</td></tr>'
        + '<tr><th scope="row">Account needed?</th><td>No: only a name and email in its settings</td><td>Yes, a free github.com account</td></tr>'
        + '</tbody></table>',
    ],
    example: 'On a train without Wi-Fi you create a repository, make 12 commits and browse the history: that is all Git. At home, `git push` uploads those 12 commits to GitHub, where your teammate sees them and can review them.',
    mistake: '"I committed, so my teammates can see it." A commit exists only in your **local** repository until you run `git push`. The mirror mistake: editing a file on github.com and expecting your laptop to know about it; your local copy changes only after `git pull`.' },

  { id: 'repository', hub: 'why', topic: 'why', title: 'Repository',
    summary: 'A repository (repo) is a project folder whose complete history Git tracks; the history and Git\'s settings live in a hidden `.git` folder at the root of that folder.',
    html: [
      '<p>The files you see are your working copy; the hidden <code>.git</code> folder behind them holds every commit, every branch and the link to GitHub. Delete <code>.git</code> and the files stay, but the history is gone and the folder is no longer a repository. Copy the folder with <code>.git</code> and you copy the whole history.</p>',
      '<ul><li><strong>Two repositories, one project:</strong> your laptop copy and the GitHub copy are separate repositories. They are not linked live; they exchange commits only when you push or pull.</li>'
        + '<li><strong><code>README.md</code></strong> at the root is the project\'s front page: GitHub shows it under the file list, so it says what the project is and how to run it.</li></ul>',
    ],
    code: `$ cd my-first-repo
$ ls -a
.  ..  .git  README.md  index.html
$ git status
On branch main
nothing to commit, working tree clean`,
    dialect: 'shell',
    example: 'A two-person project lives in one repository on GitHub. Each partner has a local repository created by cloning it. Both local repositories hold the full history, so if one laptop dies, nothing committed and pushed is lost.',
    mistake: 'Running `git init` in your home folder or on the Desktop, which turns every file below it into one giant repository, or inside a folder that is already a repository (one repository nested in another). Check where you are with `pwd` and `git status` first: if `git status` already answers "On branch …", you are inside a repository.' },

  /* ---- 2. How Git thinks ------------------------------------------------------------ */
  { id: 'three-areas', hub: 'model', topic: 'model', title: 'The three areas (and the remote)',
    summary: 'Git keeps your work in three local areas: the **working directory** (the files you edit), the **staging area** or index (the next commit being prepared) and the **repository** (the commits already saved); a remote such as GitHub is a fourth, separate copy.',
    html: [
      '<p>Work moves between the areas only when you ask, one command per step. Nothing reaches the repository without passing through the staging area, and nothing reaches GitHub without first being a commit in your repository.</p>',
      '<table><caption>The four places your work can be</caption><thead><tr><th scope="col">Area</th><th scope="col">What it holds</th><th scope="col">Where it lives</th></tr></thead><tbody>'
        + '<tr><th scope="row">Working directory</th><td>The files as you see them in the editor</td><td>The project folder</td></tr>'
        + '<tr><th scope="row">Staging area (index)</th><td>The exact content of the next commit</td><td>A file inside <code>.git</code></td></tr>'
        + '<tr><th scope="row">Repository</th><td>Every commit, every branch</td><td>The <code>.git</code> folder</td></tr>'
        + '<tr><th scope="row">Remote (GitHub)</th><td>The shared copy of the commits</td><td>A server</td></tr>'
        + '</tbody></table>',
      '<h3>Each file has a status, shown by <code>git status</code></h3>',
      '<dl><dt>Untracked</dt><dd>Git has never stored it: a brand-new file.</dd>'
        + '<dt>Unmodified</dt><dd>The same as in the last commit.</dd>'
        + '<dt>Modified</dt><dd>Changed since the last commit; the change is not staged yet.</dd>'
        + '<dt>Staged</dt><dd>Its current content will go into the next commit.</dd></dl>',
      '<p>The moves back (unstage, discard your edits) are in <a href="#/vcs/repositories/undo-changes">Undo before committing</a>.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Work reaches GitHub only by passing through every area, one command at a time.',
      desc: 'git add copies changes from the working directory, where you edit files, into the staging area, which holds the next commit. git commit saves the staged content as a commit in the repository, the .git folder. git push sends commits from the repository to the remote, the shared copy on GitHub.',
      nodes: [
        { id: 'wd', label: 'Working directory', note: 'the files you edit' },
        { id: 'stage', label: 'Staging area', note: 'the next commit', key: true },
        { id: 'repo', label: 'Repository', note: 'saved commits' },
        { id: 'remote', label: 'Remote', note: 'GitHub, shared' },
      ],
      edges: [['wd', 'stage', '`git add`'], ['stage', 'repo', '`git commit`'], ['repo', 'remote', '`git push`']],
    },
    example: 'You create `about.html` (untracked) and edit `index.html` (modified). `git add about.html` stages only the new page. `git commit -m "Add about page"` saves it in the repository, while `index.html` is still modified in the working directory and in no commit. GitHub has none of this until `git push`.',
    mistake: 'Believing that pressing Ctrl+S in VS Code "saves into Git". Saving writes only to the **working directory**. Until you `git add` and `git commit`, Git has no copy of that change, and until you `git push`, nobody else has one either.',
    widget: 'git-sim',
    practice: { href: '#/vcs/repositories/practice/git-sim', label: 'Open the commit and branch simulator' } },

  { id: 'staging-area', hub: 'model', topic: 'model', title: 'The staging area (index)',
    summary: 'The staging area, also called the **index**, is a draft of your next commit: it holds the exact version of each file that `git commit` will record.',
    html: [
      '<p><code>git add</code> takes a <strong>snapshot</strong> of a file as it is at that moment and puts it into the draft. Edits made afterwards are not in the draft until you <code>git add</code> again, which is why one file can appear <strong>twice</strong> in <code>git status</code>: once staged (the snapshot), once not staged (the newer edits).</p>',
      '<h3>Why two steps</h3>',
      '<p>An afternoon of work usually mixes unrelated changes. Staging lets you build one commit at a time: stage the bug fix and commit it, then stage the new feature and commit that (see <a href="#/vcs/repositories/commits">one logical change per commit</a>).</p>',
      '<ul><li><strong>Right after a commit</strong> the draft equals that commit, so <code>git status</code> says "nothing to commit".</li>'
        + '<li><strong>Never sent to GitHub:</strong> only commits travel.</li></ul>',
    ],
    code: `# snapshot of styles.css goes into the draft
$ git add styles.css
$ # ...you edit styles.css again and save...
$ git status
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   styles.css

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   styles.css`,
    dialect: 'shell',
    example: 'You fix a typo in the heading of `index.html` and, in the same session, start an experimental animation in `styles.css`. `git add index.html` then `git commit -m "Fix typo in main heading"` records only the fix. The animation stays modified in the working directory, out of the history, until it works.',
    mistake: 'Thinking that once a file has been added, the commit takes whatever content it has later. Edits after `git add` need another `git add`, or the commit silently contains the older version. Also, `git add` does not move the file anywhere: it copies its content, and the file stays on your disk.' },

  { id: 'commits', hub: 'model', topic: 'model', title: 'Commits: snapshot, hash, message',
    summary: 'A commit is a saved snapshot of the whole project at one moment, identified by a unique **hash** and stored with an author, a date, a message and a link to its parent commit(s).',
    html: [
      '<p>A commit is a <strong>complete photo of every tracked file</strong>, not a list of edits (Git reuses unchanged files, so photos are cheap). Each commit points back to the commit before it, its <strong>parent</strong>, so commits form a chain, and that chain is the history. Comparing a commit with its parent shows what changed.</p>',
      '<dl><dt>Hash</dt><dd>A 40-character hexadecimal identifier computed from the commit\'s content, metadata and parent. Change anything, even one letter of the message, and the hash changes, so history cannot be altered silently. The first 7 characters (<code>3f9c2a1</code>) are enough within a project, and each commit has its own page on GitHub, <code>https://github.com/&lt;user&gt;/&lt;repo&gt;/commit/&lt;hash&gt;</code>: the link to paste when someone asks you to "link the fix commit".</dd>'
        + '<dt>Message</dt><dd>A short summary line (about 50 characters) in the imperative, completing "If applied, this commit will…": "Add search filter to /books". If the reason is not obvious, add a blank line and explain <strong>why</strong>.</dd>'
        + '<dt>Author and date</dt><dd>From your Git settings (see <a href="#/vcs/repositories/install-config">Install and configure Git</a>).</dd></dl>',
      '<table><caption>Commit messages: one logical change per commit</caption><thead><tr><th scope="col">Weak</th><th scope="col">Better</th><th scope="col">Why</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>update</code></th><td><code>Add footer with contact links</code></td><td>Says what the commit does</td></tr>'
        + '<tr><th scope="row"><code>fix</code></th><td><code>Fix 400 response when title is empty</code></td><td>Says which bug, so it can be found later</td></tr>'
        + '<tr><th scope="row"><code>final version!!</code></th><td><code>Validate year as an integer in PATCH</code></td><td>Nothing is ever final; describe the change</td></tr>'
        + '<tr><th scope="row"><code>stuff from today</code></th><td>Two commits: <code>Add /stats route</code>, <code>Style the book list</code></td><td>One logical change per commit</td></tr>'
        + '</tbody></table>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Each commit points to its parent; the chain is the history.',
      desc: 'Three commits, newest first: 4b1e9d2 "Add about page" points to its parent 3f9c2a1 "Add contact form", which points to its parent a07e5c8 "Initial commit".',
      nodes: [
        { id: 'c3', label: '`4b1e9d2`', note: 'Add about page' },
        { id: 'c2', label: '`3f9c2a1`', note: 'Add contact form' },
        { id: 'c1', label: '`a07e5c8`', note: 'Initial commit' },
      ],
      edges: [['c3', 'c2', 'parent'], ['c2', 'c1', 'parent']],
    },
    code: `$ git log
commit 3f9c2a1e8b7d4c6a5f0e1d2c3b4a59687f1e2d3c
Author: Ana Ruiz <ana.ruiz@example.com>
Date:   Mon Oct 5 10:12:44 2026 +0200

    Add contact form to index.html`,
    dialect: 'shell',
    example: 'A teammate, or you three months later, asks: "which commit fixed the bug where PATCH wiped other fields?" A history like `a1b2c3d Add Book store module`, `e4f5a6b Validate title and year`, `c7d8e9f Fix PATCH overwriting untouched fields` gives the answer in seconds; 40 commits called "changes" do not.',
    mistake: 'Saving all work in one huge commit at the end ("final"). You lose the ability to undo one change without the others, your partner cannot review it, and the history no longer shows who did what or why. Commit small and often: each time one thing works.' },

  /* ---- 3. Setup ----------------------------------------------------------------------- */
  { id: 'install-config', hub: 'setup', topic: 'setup', title: 'Install and configure Git',
    summary: 'Install Git once per computer, then tell it who you are (the name and email stamped on every commit), to call the first branch `main`, and which editor to open when it needs a message.',
    html: [
      '<p><code>git config --global</code> writes to one settings file in your user profile (<code>~/.gitconfig</code>) that <strong>every repository on that computer</strong> reads, so you set it once per computer. A repository can override a setting by running <code>git config</code> without <code>--global</code> inside it (stored in its own <code>.git/config</code>).</p>',
      '<table><caption>Installing Git</caption><thead><tr><th scope="col">System</th><th scope="col">How</th></tr></thead><tbody>'
        + '<tr><th scope="row">Windows</th><td><code>winget install Git.Git</code>, or the installer from git-scm.com. It also brings <strong>Git Bash</strong> (a Unix-style terminal) and <strong>Git Credential Manager</strong> (the GitHub sign-in)</td></tr>'
        + '<tr><th scope="row">macOS</th><td><code>xcode-select --install</code> (Apple\'s command-line tools), or <code>brew install git</code> with Homebrew</td></tr>'
        + '<tr><th scope="row">Linux</th><td><code>sudo apt install git</code> (Debian, Ubuntu) or <code>sudo dnf install git</code> (Fedora)</td></tr>'
        + '</tbody></table>',
      '<p>Check with <code>git --version</code>; if the command is "not recognized", open a new terminal.</p>',
      '<dl><dt><code>user.name</code>, <code>user.email</code></dt><dd>Stamped on every commit. Use the email of your GitHub account, so your commits link to your profile.</dd>'
        + '<dt><code>init.defaultBranch main</code></dt><dd>Names the first branch <code>main</code>, as GitHub does since 2020. Git used to call it <code>master</code>: read <code>master</code> in older tutorials as <code>main</code>.</dd>'
        + '<dt><code>core.editor</code></dt><dd>The editor Git opens when it needs a message, for example VS Code with <code>"code --wait"</code>.</dd></dl>',
    ],
    code: `# identity: use the same email as your GitHub account
git config --global user.name "Ana Ruiz"
git config --global user.email "ana.ruiz@example.com"

# name the first branch main, like GitHub
git config --global init.defaultBranch main

# open VS Code (not Vim) when Git needs a message, e.g. for a merge commit
git config --global core.editor "code --wait"

# check everything
git config --list`,
    dialect: 'shell',
    example: 'Ana sets her name and the email of her GitHub account on her laptop. Every commit she makes in the team project shows "Ana Ruiz" with her avatar on GitHub. Her partner skipped the email step on a shared computer: his commits appear on GitHub as an unlinked author, with no profile picture.',
    mistake: 'Skipping the configuration. Git then refuses to commit with "Please tell me who you are", or guesses an identity like `ana@LAPTOP-7Q2.local` that GitHub cannot link to your account. Another classic: without `core.editor`, a merge opens **Vim** and you cannot get out. In Vim, type `:wq` and press Enter to save and quit.' },

  { id: 'init-vs-clone', hub: 'setup', topic: 'setup', title: 'git init vs git clone',
    summary: '`git init` turns a local folder into a new, empty repository; `git clone <url>` downloads an existing repository, with all its files and history, and remembers where it came from.',
    html: [
      '<p><code>git init</code> starts a <strong>new</strong> history; <code>git clone</code> joins an <strong>existing</strong> one. The rule for new projects: <strong>create the repository on GitHub first, then clone it</strong>. Use <code>git init</code> only when a folder already has work and no GitHub repository exists yet.</p>',
      '<table><caption>Which one?</caption><thead><tr><th scope="col"></th><th scope="col"><code>git init</code></th><th scope="col"><code>git clone &lt;url&gt;</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">Starts from</th><td>A local folder</td><td>A repository that already exists, usually on GitHub</td></tr>'
        + '<tr><th scope="row">History</th><td>Empty</td><td>A complete copy</td></tr>'
        + '<tr><th scope="row">Link to GitHub</th><td>None yet: you add it later</td><td>Remembered under the name <code>origin</code></td></tr>'
        + '<tr><th scope="row">Run it</th><td>Inside the project folder</td><td>In the parent folder: it creates the project folder</td></tr>'
        + '</tbody></table>',
      '<p>Linking an initialised folder to GitHub and pushing it the first time: <a href="#/vcs/repositories/remotes-push">Remotes, origin and git push</a>.</p>',
    ],
    code: `# Path A (recommended): repository created on GitHub first
git clone https://github.com/ana-ruiz/books-api.git
cd books-api

# Path B: a local folder that already has work
cd my-project
git init
git add .
git commit -m "Initial commit"`,
    dialect: 'shell',
    example: 'For a team project, one partner creates `books-api` on GitHub with a README and adds the other as a collaborator; then **both** run `git clone` on their own laptops. Both local repositories share the same first commit, so their work can later be pushed, pulled and merged.',
    mistake: 'Doing both: creating the GitHub repository **with** a README and also running `git init` and committing locally. The two repositories now have unrelated first commits, `git push` is rejected and `git pull` stops with "refusing to merge unrelated histories". Start again by cloning, and copy your files into the clone.' },

  /* ---- 4. Everyday commands --------------------------------------------------------- */
  { id: 'status-add-commit', hub: 'daily', topic: 'daily', title: 'The daily loop: status, add, commit',
    summary: 'The everyday loop is: edit files, `git status`, `git add` the changes that belong together, `git commit -m "message"`, and repeat.',
    html: [
      '<p><code>git status</code> is your <strong>dashboard</strong>: read it before and after every other command while you learn. It lists staged changes ("Changes to be committed"), modified files not staged yet ("Changes not staged for commit") and new files ("Untracked files"), and prints the command that undoes each state.</p>',
      '<dl><dt><code>git add &lt;file&gt;</code></dt><dd>Stages one file; list several to stage them together: <code>git add index.html about.html</code>.</dd>'
        + '<dt><code>git add .</code></dt><dd>Stages <strong>every</strong> change in this folder and below: modified files, new files and deletions.</dd>'
        + '<dt><code>git commit -m "message"</code></dt><dd>Records the staged changes as a new commit. Without <code>-m</code>, Git opens your editor for the message. With nothing staged it answers "nothing added to commit" and creates nothing.</dd></dl>',
    ],
    diagram: {
      kind: 'cycle',
      title: 'Every change goes round the same loop once.',
      desc: 'Edit and save files, read git status, git add the changes that belong together, git commit them with a message, and start again with the next change.',
      nodes: [
        { id: 'edit', label: 'Edit and save' },
        { id: 'status', label: '`git status`', note: 'read it' },
        { id: 'add', label: '`git add`', note: 'what belongs together' },
        { id: 'commit', label: '`git commit`', note: 'one change, one message', key: true },
      ],
      edges: [['edit', 'status'], ['status', 'add'], ['add', 'commit'], ['commit', 'edit', 'next change']],
    },
    code: `$ git status
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   index.html

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        about.html

no changes added to commit (use "git add" and/or "git commit -a")

$ git add index.html about.html
$ git commit -m "Add about page and link it from the home page"
[main 4b1e9d2] Add about page and link it from the home page
 2 files changed, 31 insertions(+), 1 deletion(-)
 create mode 100644 about.html

$ git status
On branch main
nothing to commit, working tree clean`,
    dialect: 'shell',
    example: 'In the first `git status` output, `index.html` is modified and `about.html` is untracked. They belong together (the new page and the link to it), so one `git add` with both names and one commit record them. The commit exists only on your laptop until you push it (see [Remotes, origin and git push](#/vcs/repositories/remotes-push)).',
    mistake: 'Running `git add .` without looking. It happily stages `node_modules/` (thousands of files) and `.env` (your secrets) if no `.gitignore` excludes them. Run `git status` after `git add .` and before `git commit`, and read the list.' },

  { id: 'log-diff', hub: 'daily', topic: 'daily', title: 'Inspecting: git log and git diff',
    summary: '`git log` lists the commits of the current branch, newest first; `git diff` shows line by line what you changed but have not staged, and `git diff --staged` shows what the next commit will contain.',
    html: [
      '<p><code>git diff</code> <strong>compares two areas</strong>, and <code>git log</code> is the history book: one entry per commit, with hash, author, date and message.</p>',
      '<table><caption>What each command shows</caption><thead><tr><th scope="col">Command</th><th scope="col">Shows</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>git diff</code></th><td>Working directory vs staging area: the edits not added yet</td></tr>'
        + '<tr><th scope="row"><code>git diff --staged</code></th><td>Staging area vs last commit: what <code>git commit</code> would record now</td></tr>'
        + '<tr><th scope="row"><code>git log</code></th><td>The commits of the current branch, newest first</td></tr>'
        + '<tr><th scope="row"><code>git log --oneline</code></th><td>One line per commit: short hash and message</td></tr>'
        + '<tr><th scope="row"><code>git log --oneline --graph --all</code></th><td>Every branch, drawn as a graph</td></tr>'
        + '</tbody></table>',
      '<h3>Reading a diff</h3>',
      '<ul><li><strong><code>-</code> lines</strong> were removed, <strong><code>+</code> lines</strong> were added, lines starting with a space are unchanged context.</li>'
        + '<li><strong><code>@@ -6,7 +6,7 @@</code></strong> means "7 lines starting at line 6, before and after".</li>'
        + '<li><strong>Long output</strong> opens in a pager: the arrow keys scroll and <code>q</code> quits.</li></ul>',
    ],
    code: `$ git diff
diff --git a/index.html b/index.html
index 8a1f2c3..5d7e9b0 100644
--- a/index.html
+++ b/index.html
@@ -6,7 +6,7 @@
 <body>
   <header>
     <a href="index.html">Home</a>
-    <h1>My Portfolio</h1>
+    <h1>Ana Ruiz - Portfolio</h1>
     <p>Web developer</p>
   </header>
   <main>

$ git log --oneline
4b1e9d2 Add about page and link it from the home page
3f9c2a1 Add contact form to index.html
a07e5c8 Initial commit`,
    dialect: 'shell',
    example: 'Before committing, run `git diff --staged` and read it as your partner would: a forgotten `console.log("here")` comes out now, not in the history. In your own log you will also see labels such as `(HEAD -> main)` next to some hashes: they are branch names (see [Branches and HEAD](#/vcs/repositories/branches)).',
    mistake: 'Running `git diff` right after `git add`, seeing nothing, and concluding the changes are lost. They are safe in the staging area; plain `git diff` shows only **unstaged** edits. Use `git diff --staged` to see them.' },

  { id: 'gitignore', hub: 'daily', topic: 'daily', title: '.gitignore: what never goes into Git',
    summary: 'A `.gitignore` file in the repository root lists file patterns Git must not track, such as `node_modules/` (re-created by `npm install`) and `.env` (secrets).',
    html: [
      '<p>An untracked file that matches a pattern in <code>.gitignore</code> is hidden from <code>git status</code> and skipped by <code>git add .</code>. It filters only files Git does not track yet: a file already committed stays tracked until <code>git rm --cached &lt;file&gt;</code> takes it out of the index.</p>',
      '<table><caption>What to ignore</caption><thead><tr><th scope="col">Kind of file</th><th scope="col">Ignore it?</th><th scope="col">Examples</th></tr></thead><tbody>'
        + '<tr><th scope="row">Generated or re-installable</th><td>Yes</td><td><code>node_modules/</code>, <code>dist/</code>, <code>coverage/</code></td></tr>'
        + '<tr><th scope="row">Secret</th><td>Yes</td><td><code>.env</code></td></tr>'
        + '<tr><th scope="row">Personal clutter</th><td>Yes</td><td><code>.DS_Store</code>, <code>Thumbs.db</code></td></tr>'
        + '<tr><th scope="row">What rebuilds the project</th><td>No: commit it</td><td><code>package.json</code>, <code>package-lock.json</code>, <code>.env.example</code> with fake values</td></tr>'
        + '</tbody></table>',
      '<p>Commit <code>.gitignore</code> itself, so the whole team shares the rules, and create it <strong>before the first <code>git add .</code></strong>. Why secrets never go into a repository: <a href="#/server/runtime/dotenv-secrets">.env files and keeping secrets out of Git</a>.</p>',
    ],
    code: `# dependencies: re-created by npm install
node_modules/

# secrets: never commit; ship .env.example with fake values instead
.env
.env.*
!.env.example

# build output and test reports
dist/
coverage/

# operating-system clutter
.DS_Store
Thumbs.db`,
    dialect: 'gitignore',
    example: 'An API reads `DATABASE_URL` and `JWT_SECRET` from `.env`, ships a `.env.example`, and must work from a fresh clone: a new teammate clones it, runs `npm install` (which rebuilds `node_modules/`) and copies `.env.example` to `.env`. The `.gitignore` in this card covers all of that.',
    mistake: 'Adding `.env` to `.gitignore` **after** it was committed and pushed. Git keeps tracking it, and the secret stays readable in the history on GitHub. Fix: `git rm --cached .env`, commit, push, and **change the secret** (a new password or key), because the old value stays public in the history.' },

  /* ---- 5. Branches and merging ------------------------------------------------------ */
  { id: 'branches', hub: 'branch', topic: 'branch', title: 'Branches and HEAD',
    summary: 'A branch is a **movable label that points to one commit**; when you commit on a branch, its label moves forward to the new commit. `HEAD` marks the branch you are currently on.',
    html: [
      '<p>A branch is a <strong>label on a commit</strong>, not a copy of your folder: creating one writes a tiny file containing a commit hash, which is why it is instant. <code>HEAD</code> is the "you are here" marker: it points to the current branch, and your next commit moves that label, and only that label, forward.</p>',
      '<p>Branch to work on one feature or experiment <strong>without disturbing <code>main</code></strong>, which stays in a working state. In a team, each person works on their own branch, so half-finished code never breaks someone else\'s work.</p>',
      '<table><caption>Branch commands</caption><thead><tr><th scope="col">Command</th><th scope="col">What it does</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>git branch</code></th><td>Lists local branches; <code>*</code> marks the current one</td></tr>'
        + '<tr><th scope="row"><code>git branch add-footer</code></th><td>Creates the label at the current commit; you <strong>stay</strong> on your branch</td></tr>'
        + '<tr><th scope="row"><code>git switch add-footer</code></th><td>Moves <code>HEAD</code> to that branch and updates your files to its latest commit</td></tr>'
        + '<tr><th scope="row"><code>git switch -c add-footer</code></th><td>Creates <strong>and</strong> switches in one step</td></tr>'
        + '<tr><th scope="row"><code>git branch -d add-footer</code></th><td>Deletes a branch that is already merged; its commits remain</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>In a log,</strong> <code>(HEAD -&gt; add-footer)</code> next to a hash shows where <code>HEAD</code> and each branch label point.</li>'
        + '<li><strong>Older commands:</strong> <code>git switch</code> and <code>git restore</code> (Git 2.23, 2019) split the old <code>git checkout</code>. Tutorials that use <code>git checkout add-footer</code> and <code>git checkout -b add-footer</code> mean the same.</li></ul>',
    ],
    code: `$ git switch -c add-footer
Switched to a new branch 'add-footer'
$ git branch
* add-footer
  main
$ # ...edit index.html and save...
# -a stages already-tracked modified files
$ git commit -am "Add footer"
$ git log --oneline --graph --all
* 8e4d7b2 (HEAD -> add-footer) Add footer
* 3f9c2a1 (main) Add contact form to index.html`,
    dialect: 'shell',
    example: 'Before `git commit -am "Add footer"`, `main` and `add-footer` both pointed at `3f9c2a1`. After it, only `add-footer` moved to `8e4d7b2`; `main` still points at `3f9c2a1`, so switching back to `main` shows the page without the footer.',
    mistake: 'Creating a branch with `git branch add-footer` and then committing without switching: the commits land on `main`, because `HEAD` never moved. Check the `*` in `git branch` (or "On branch …" in `git status`) before you commit. Also commit before switching: uncommitted edits travel with you to the other branch, or Git refuses to switch if they would be overwritten.',
    widget: 'git-sim',
    practice: { href: '#/vcs/repositories/practice/git-sim', label: 'Open the commit and branch simulator' } },

  { id: 'merge', hub: 'branch', topic: 'branch', title: 'Merging: fast-forward vs merge commit',
    summary: '`git merge <branch>` brings the commits of `<branch>` into the branch you are on; if your branch has not moved since the other one started, Git just slides your label forward (**fast-forward**), otherwise it creates a **merge commit** with two parents.',
    html: [
      '<p>You <strong>stand on the branch that receives</strong> the work and name the branch that gives it: <code>git switch main</code>, then <code>git merge add-footer</code>. The giving branch does not change.</p>',
      '<dl><dt>Fast-forward</dt><dd><code>main</code> has no commits that <code>add-footer</code> lacks, so the history is a straight line: Git moves the <code>main</code> label up to the tip of <code>add-footer</code>. No new commit.</dd>'
        + '<dt>Merge commit</dt><dd>Both branches gained commits since they split. Git compares both tips with their <strong>common ancestor</strong> (the last commit they share), combines the changes and records a commit with <strong>two parents</strong>. It opens your editor for the message; the default "Merge branch \'add-footer\'" is fine.</dd></dl>',
      '<p>After merging, delete the label with <code>git branch -d add-footer</code>; the commits stay in <code>main</code>\'s history.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'A merge commit has two parents, and both lines meet again at the common ancestor.',
      desc: 'The merge commit d41c9a7 has two parents: 8e4d7b2 "Add footer", the tip of main before the merge, and 5b2e1f0 "Add search box", the tip of add-search. Both of them come from the common ancestor 3f9c2a1.',
      nodes: [
        { id: 'm', label: '`d41c9a7`', note: 'the merge commit', key: true },
        { id: 'a', label: '`8e4d7b2`', note: 'Add footer' },
        { id: 'b', label: '`5b2e1f0`', note: 'Add search box' },
        { id: 'base', label: '`3f9c2a1`', note: 'common ancestor' },
      ],
      edges: [['m', 'a', 'parent 1'], ['m', 'b', 'parent 2'], ['a', 'base'], ['b', 'base']],
    },
    code: `$ git switch main
# main had not moved: fast-forward
$ git merge add-footer
Updating 3f9c2a1..8e4d7b2
Fast-forward
 index.html | 6 ++++++
 1 file changed, 6 insertions(+)

# main had moved too: merge commit
$ git merge add-search
Merge made by the 'ort' strategy.
 app.js | 14 ++++++++++++++
 1 file changed, 14 insertions(+)

$ git log --oneline --graph
*   d41c9a7 (HEAD -> main) Merge branch 'add-search'
|\\
| * 5b2e1f0 (add-search) Add search box
* | 8e4d7b2 (add-footer) Add footer
|/
* 3f9c2a1 Add contact form to index.html`,
    dialect: 'shell',
    example: 'Ana branches `add-search` from `3f9c2a1`. Meanwhile her footer branch is fast-forwarded into `main`, so `main` moves to `8e4d7b2`. When she merges `add-search`, both sides have new commits, so Git creates the merge commit `d41c9a7`, whose parents are `8e4d7b2` and `5b2e1f0`.',
    mistake: 'Merging in the wrong direction: running `git merge main` while on `add-footer` when you meant to bring the footer into `main`. That updates the feature branch instead. Read "On branch …" in `git status` first: you must be **on the receiving branch**.' },

  { id: 'merge-conflicts', hub: 'branch', topic: 'branch', title: 'Merge conflicts',
    summary: 'A merge conflict happens when both sides changed the **same lines** of a file (or one side deleted a file the other edited); Git stops, writes both versions into the file between markers, and waits for you to choose the final content and commit.',
    html: [
      '<p>A conflict is <strong>a question, not an error</strong>. Git combines changes in different places by itself; when two people rewrote the same line, it cannot know which version is right, so it asks you. Nothing is lost: both versions are in the file.</p>',
      '<dl><dt><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code></dt><dd>Starts <strong>your</strong> version, from the branch you are on ("Current" in VS Code).</dd>'
        + '<dt><code>=======</code></dt><dd>Separates the two versions.</dd>'
        + '<dt><code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; add-title</code></dt><dd>Ends <strong>their</strong> version, from the branch being merged ("Incoming" in VS Code). During a <code>git pull</code>, "theirs" is the commits that arrived from GitHub.</dd></dl>',
      '<h3>Resolving it</h3>',
      '<ol><li><code>git status</code> lists the files under "Unmerged paths" as "both modified".</li>'
        + '<li>Edit each file to its final content (yours, theirs, both or something new) and delete all three marker lines.</li>'
        + '<li><code>git add &lt;file&gt;</code> marks it resolved.</li>'
        + '<li><code>git commit</code> completes the merge; the message is pre-filled.</li></ol>',
      '<p>To give up and go back to the state before the merge: <code>git merge --abort</code>.</p>',
    ],
    code: `$ git merge add-title
Auto-merging index.html
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.

# index.html now contains:
<<<<<<< HEAD
    <h1>Ana Ruiz - Portfolio</h1>
=======
    <h1>Ana Ruiz - Web Developer</h1>
>>>>>>> add-title

# edit it to the final line, e.g.  <h1>Ana Ruiz - Web Developer Portfolio</h1>
$ git add index.html
# accept the pre-filled "Merge branch 'add-title'"
$ git commit`,
    dialect: 'shell',
    example: 'Both partners add a row to the endpoint table in `README.md`, each on their own branch. Luis\'s branch is merged first; merging Ana\'s then stops with a conflict in `README.md`. She keeps both new rows, deletes the markers, runs `git add README.md` and `git commit`. Total: two minutes.',
    mistake: 'Committing with the markers still in the file: the page then shows `<<<<<<< HEAD`, or JavaScript fails with a syntax error. Before `git add`, search the file for `<<<<<<<`. The other panic reaction, deleting the folder and cloning again, throws away your un-pushed commits.' },

  /* ---- 6. Remotes --------------------------------------------------------------------- */
  { id: 'authentication', hub: 'remote', topic: 'remote', title: 'Signing in to GitHub from Git',
    summary: 'GitHub does not accept your account password for Git commands; you prove who you are with a browser sign-in through a credential helper, a personal access token, the GitHub CLI or an SSH key.',
    html: [
      '<p>Your password opens the <strong>website</strong>. For Git commands GitHub wants a separate <strong>key</strong> that can be limited, set to expire and cancelled without changing your password; it stopped accepting account passwords for Git in August 2021. You sign in on your <strong>first push</strong> (or first clone of a private repository), and the operating system stores the credential, so you are not asked again.</p>',
      '<table><caption>Ways to sign in; the first two are the easiest</caption><thead><tr><th scope="col">Option</th><th scope="col">How</th><th scope="col">Notes</th></tr></thead><tbody>'
        + '<tr><th scope="row">Git Credential Manager (HTTPS)</th><td>Included with Git for Windows. On the first push a browser window opens; sign in to GitHub and approve</td><td>Nothing to configure on Windows</td></tr>'
        + '<tr><th scope="row">GitHub CLI (HTTPS)</th><td>Install <code>gh</code>, run <code>gh auth login</code>, choose HTTPS and "Login with a web browser"</td><td>Works on Windows, macOS and Linux; also configures Git</td></tr>'
        + '<tr><th scope="row">Personal access token (HTTPS)</th><td>github.com → Settings → Developer settings → Personal access tokens; paste the token when Git asks for a password</td><td>Treat it like a password; it expires; never commit it</td></tr>'
        + '<tr><th scope="row">SSH key</th><td><code>ssh-keygen -t ed25519 -C "you@example.com"</code>; add the <strong>public</strong> key (<code>~/.ssh/id_ed25519.pub</code>) in Settings → SSH and GPG keys; use the SSH URL <code>git@github.com:user/repo.git</code></td><td>No prompts afterwards; the private key never leaves your computer</td></tr>'
        + '</tbody></table>',
    ],
    code: `$ git push
Username for 'https://github.com': ana-ruiz
# account password typed here
Password for 'https://ana-ruiz@github.com':
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed for 'https://github.com/ana-ruiz/portfolio.git/'

# fix: sign in once through the browser, then push again
$ gh auth login
$ git push`,
    dialect: 'shell',
    example: 'On a Windows laptop with Git for Windows, Ana\'s first `git push` opens the browser, she clicks "Authorize", and the push completes. On a shared Linux machine the same push asks for a username and password, so she runs `gh auth login` once instead.',
    mistake: 'Pasting a token into a script, a README or a `.env` that gets committed. A token in a public repository is a leaked key: anyone can push to your repositories with it. If it happens, delete the token on GitHub at once and generate a new one.' },

  { id: 'remotes-push', hub: 'remote', topic: 'remote', title: 'Remotes, origin and git push',
    summary: 'A **remote** is a named link to another copy of the repository, usually on GitHub (`origin` is the name `git clone` gives it); `git push` uploads the commits of your current branch that the remote does not have yet.',
    html: [
      '<p>A remote is a short name for another copy\'s address; <code>git remote -v</code> lists them. Git never syncs on its own: you exchange commits explicitly. Your repository also keeps <strong>remote-tracking branches</strong> such as <code>origin/main</code>, your last known picture of the remote\'s <code>main</code>, updated only when you fetch, pull or push.</p>',
      '<dl><dt><code>git push</code></dt><dd>Uploads the commits of your branch that the remote does not have: commits only, not files, edits or the staging area.</dd>'
        + '<dt><code>git push -u origin &lt;branch&gt;</code></dt><dd>The first push of a branch: creates it on GitHub and, with <code>-u</code> (upstream), remembers the link, so later <code>git push</code> and <code>git pull</code> need no arguments.</dd>'
        + '<dt><code>git remote add origin &lt;url&gt;</code></dt><dd>Links a repository made with <code>git init</code> to an <strong>empty</strong> GitHub repository (no README, no licence). Then push with <code>git push -u origin main</code>.</dd>'
        + '<dt>"ahead of \'origin/main\' by 1 commit"</dt><dd>What <code>git status</code> says when you have commits the remote lacks: push them.</dd></dl>',
      '<p>A push is <strong>rejected</strong> when the remote has commits you lack, for example because your partner pushed first. Git refuses to overwrite them: <code>git pull</code>, resolve any conflict, then push again. Never answer a rejection with <code>git push --force</code> on a shared branch: it deletes the commits you did not have.</p>',
    ],
    code: `$ git remote -v
origin  https://github.com/ana-ruiz/books-api.git (fetch)
origin  https://github.com/ana-ruiz/books-api.git (push)

# first push of main
$ git push -u origin main
# later pushes
$ git push

# when your partner pushed first:
$ git push
To https://github.com/ana-ruiz/books-api.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/ana-ruiz/books-api.git'
# integrate their commits, then
$ git pull
$ git push`,
    dialect: 'shell',
    example: 'Reviewers, teammates and deployment tools read the default branch **on GitHub**, not your laptop. After the final `git push`, open the repository page on github.com and check that the latest commit message and time are yours.',
    mistake: 'Trusting "Your branch is up to date with \'origin/main\'" as live news. It compares with `origin/main` **as of your last fetch or pull**; your partner may have pushed five minutes ago. Run `git fetch` (or `git pull`) first when you need the current state.' },

  { id: 'fetch-pull', hub: 'remote', topic: 'remote', title: 'git fetch vs git pull',
    summary: '`git fetch` downloads new commits from the remote into `origin/<branch>` without touching your files or your branch; `git pull` is `git fetch` followed by integrating those commits into your current branch (by default with a merge).',
    html: [
      '<p><code>git fetch</code> downloads what is new and updates <code>origin/main</code>, and nothing on your branch or in your files changes: you can look first (<code>git log origin/main</code>). <code>git pull</code> does the same and then merges <code>origin/main</code> into your current branch.</p>',
      '<table><caption>fetch vs pull</caption><thead><tr><th scope="col"></th><th scope="col"><code>git fetch</code></th><th scope="col"><code>git pull</code></th></tr></thead><tbody>'
        + '<tr><th scope="row">Downloads new commits</th><td>Yes</td><td>Yes</td></tr>'
        + '<tr><th scope="row">Updates <code>origin/main</code></th><td>Yes</td><td>Yes</td></tr>'
        + '<tr><th scope="row">Changes your branch and files</th><td>No</td><td>Yes: a merge, or a fast-forward</td></tr>'
        + '<tr><th scope="row">Can cause a conflict</th><td>Never</td><td>Yes, if both sides changed the same lines</td></tr>'
        + '</tbody></table>',
      '<p>If you made no commits, pull is a <a href="#/vcs/repositories/merge">fast-forward</a>. If both sides have new commits, the histories have <strong>diverged</strong> and pull creates a merge commit, which may conflict. Recent Git stops the first time with "Need to specify how to reconcile divergent branches": tell it once to merge, the simpler choice, with <code>git config --global pull.rebase false</code>.</p>',
      '<p><strong>Habit for team work:</strong> pull before you start, and pull before you push.</p>',
    ],
    diagram: {
      kind: 'flow',
      title: '`git pull` takes both steps; `git fetch` stops halfway, so you can look first.',
      desc: 'git fetch copies new commits from main on GitHub into origin/main, your local picture of the remote branch. git merge then brings origin/main into your own main and your files. git pull runs both steps.',
      nodes: [
        { id: 'gh', label: 'GitHub', note: '`main` on the server' },
        { id: 'om', label: '`origin/main`', note: 'your picture of it', key: true },
        { id: 'main', label: '`main`', note: 'your branch and files' },
      ],
      edges: [['gh', 'om', '`git fetch`'], ['om', 'main', '`git merge`']],
    },
    code: `# once per computer: make pull merge when histories diverge
git config --global pull.rebase false

# see what arrived without changing anything
git fetch
# commits on GitHub you do not have yet
git log --oneline main..origin/main
# bring them into your branch
git pull`,
    dialect: 'shell',
    example: 'Monday morning: your partner pushed the validation module during the weekend. `git pull` brings their three commits into your `main` (a fast-forward, because you had not committed anything since). Only then do you start your own work.',
    mistake: 'Pulling with uncommitted edits to files the incoming commits change. Git refuses with "Your local changes to the following files would be overwritten by merge". Commit your work, set it aside with `git stash` (see [Tags and stash](#/vcs/repositories/tags-stash)), or discard it, then pull again.' },

  /* ---- 7. Working in a team ----------------------------------------------------------- */
  { id: 'tags-stash', hub: 'collab', topic: 'collab', title: 'Tags and stash: marking versions, setting work aside',
    summary: 'A **tag** is a permanent name for one commit, such as `v1.0`; `git stash` sets uncommitted changes aside so the working directory is clean, and `git stash pop` brings them back.',
    html: [
      '<p>A branch label moves forward with every commit; a <strong>tag never moves</strong>. That makes a tag the way to mark a version you release, deploy or want to find again. The stash is the quick way to clear your working directory for a moment without making a commit.</p>',
      '<h3>Tags</h3>',
      '<dl><dt><code>git tag -a v1.0 -m "First release"</code></dt><dd>Creates an annotated tag, with author, date and message, on the current commit.</dd>'
        + '<dt><code>git tag</code></dt><dd>Lists the tags.</dd>'
        + '<dt><code>git push origin v1.0</code></dt><dd>Tags are not pushed with your commits: push each one, or all of them with <code>git push --tags</code>. GitHub lists them under Tags and Releases.</dd>'
        + '<dt><code>git switch --detach v1.0</code></dt><dd>Shows that version. You are on no branch ("detached HEAD"), so create a branch before committing there.</dd></dl>',
      '<h3>Stash</h3>',
      '<dl><dt><code>git stash</code></dt><dd>Saves your uncommitted changes to tracked files, staged or not, and cleans the working directory.</dd>'
        + '<dt><code>git stash -u</code></dt><dd>Includes untracked files too.</dd>'
        + '<dt><code>git stash list</code></dt><dd>The saved stashes, newest first.</dd>'
        + '<dt><code>git stash pop</code></dt><dd>Re-applies the newest stash and removes it from the list.</dd></dl>',
    ],
    code: `# mark the version you deliver
git tag -a v1.0 -m "First finished version"
git push origin v1.0

# a pull refused because of local edits
# edits set aside, working directory clean
git stash
git pull
# edits back, on top of the new commits
git stash pop`,
    dialect: 'shell',
    example: '`git pull` refuses: "Your local changes to the following files would be overwritten by merge", and your edits are not ready to commit. `git stash`, `git pull`, `git stash pop`: your partner\'s commits arrive and your edits land back on top. If both touched the same lines, `pop` stops with a conflict, which you resolve like a [merge conflict](#/vcs/repositories/merge-conflicts).',
    mistake: 'Forgetting a stash. Stashed work is in no commit and on no branch, so weeks later it is easy to lose: check `git stash list` before you delete a clone, and keep anything you need for longer than a few minutes as a commit on a branch. Also, a plain `git stash` leaves new files behind; add `-u` to include them.' },

  { id: 'github-flow', hub: 'collab', topic: 'collab', title: 'GitHub flow and pull requests',
    summary: 'GitHub flow is a team workflow: create a branch for each change, push it, open a **pull request** (PR) on GitHub, get it reviewed, merge it into `main`, and everyone pulls the updated `main`.',
    html: [
      '<p><code>main</code> is <strong>always working and deliverable</strong>. Every change travels on its own short-lived branch and enters <code>main</code> through a <strong>pull request</strong>: a page on GitHub that asks "please merge my branch into main", shows the diff and holds the review conversation. Reviewing is how your partner learns your code, so either of you can explain and maintain any part of the project.</p>',
      '<h3>On GitHub</h3>',
      '<ul><li><strong>Open the PR:</strong> Compare &amp; pull request; describe what and why; request your partner as reviewer.</li>'
        + '<li><strong>Review:</strong> the reviewer reads the diff and comments or approves; fixes you push to the same branch update the PR.</li>'
        + '<li><strong>Merge:</strong> Merge pull request. Then everyone runs <code>git switch main</code> and <code>git pull</code>, and deletes the branch with <code>git branch -d</code>.</li></ul>',
      '<p><strong>Push access:</strong> the owner adds the partner in the repository\'s Settings → Collaborators → Add people, and the partner accepts the invitation. A <strong>fork</strong> is different: a copy of someone else\'s repository under your own account, used when you cannot push to the original. A branch lives inside the same repository.</p>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'Every change reaches `main` the same way: through a reviewed pull request.',
      desc: 'First create a branch with git switch -c. Then make small commits on it and push the branch with git push -u. Open a pull request on GitHub, your partner reviews and approves it, and it is merged into main.',
      nodes: [
        { id: 'branch', label: 'Branch', note: '`git switch -c`' },
        { id: 'push', label: 'Commit and push', note: '`git push -u`' },
        { id: 'pr', label: 'Pull request', note: 'on GitHub', key: true },
        { id: 'review', label: 'Review', note: 'partner approves' },
        { id: 'merge', label: 'Merge', note: 'into `main`' },
      ],
      edges: [['branch', 'push'], ['push', 'pr'], ['pr', 'review'], ['review', 'merge']],
    },
    code: `git switch main
git pull
git switch -c validate-form
# ...edit, git add, git commit (several small commits)...
git push -u origin validate-form
# on github.com: Compare & pull request -> request review -> Merge pull request
git switch main
git pull
git branch -d validate-form`,
    dialect: 'shell',
    example: 'A first version is finished and you want to start the next phase while keeping that version easy to find: `git tag -a v1.0 -m "First finished version"`, `git push origin v1.0`, and keep working on `main` through pull requests. The README says: "The first version is the tag `v1.0`" (see [Tags and stash](#/vcs/repositories/tags-stash)).',
    mistake: 'Long-lived branches: two weeks of work on one branch without pulling `main` produces one enormous PR with dozens of conflicts. Keep each PR to one change and merge it within a day or two. And never keep committing on a branch whose PR was already merged; start a new branch from the updated `main`.' },

  /* ---- 8. Undoing safely ------------------------------------------------------------- */
  { id: 'undo-changes', hub: 'undo', topic: 'undo', title: 'Undo before committing: git restore',
    summary: '`git restore --staged <file>` takes a file out of the staging area but keeps your edits; `git restore <file>` throws away uncommitted edits in the working directory, returning the file to its staged (or last committed) version.',
    html: [
      '<p>Ask <strong>which area you want to reset</strong>. <code>git restore --staged</code> copies the last commit\'s version back into the <strong>staging area</strong> (unstage; your file is untouched). <code>git restore</code> copies the staging area\'s version back over your <strong>working file</strong> (discard your edits). <code>git status</code> suggests both in its hints.</p>',
      '<table><caption>Pick the right undo</caption><thead><tr><th scope="col">Situation</th><th scope="col">Command</th><th scope="col">Safe?</th></tr></thead><tbody>'
        + '<tr><th scope="row">Staged a file by mistake (e.g. <code>.env</code>)</th><td><code>git restore --staged .env</code></td><td>Yes: the file and its content stay</td></tr>'
        + '<tr><th scope="row">Throw away an unstaged experiment</th><td><code>git restore styles.css</code></td><td>No: the edits are lost for good</td></tr>'
        + '<tr><th scope="row">Staged <strong>and</strong> want to discard</th><td><code>git restore --staged styles.css</code>, then <code>git restore styles.css</code></td><td>No: the edits are lost</td></tr>'
        + '<tr><th scope="row">Deleted a tracked file by accident</th><td><code>git restore index.html</code></td><td>Yes: it comes back from Git</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Unstaging is always safe.</strong></li>'
        + '<li><strong>Discarding is permanent:</strong> those edits were never committed, so Git has no copy of them.</li>'
        + '<li><strong>Older tutorials</strong> use <code>git reset HEAD &lt;file&gt;</code> to unstage and <code>git checkout -- &lt;file&gt;</code> to discard.</li></ul>',
    ],
    code: `$ git add .
$ git status
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   .env
        modified:   index.html

# .env back to untracked; the file is untouched
$ git restore --staged .env
$ git commit -m "Show book count in header"

# DISCARD the unstaged edits to styles.css
$ git restore styles.css`,
    dialect: 'shell',
    example: 'You ran `git add .` and `git status` shows `new file: .env`. Before committing, `git restore --staged .env` takes it out; then add `.env` to `.gitignore` so it never happens again. Nothing has left your laptop, so nothing leaked.',
    mistake: 'Typing `git restore styles.css` when you meant `git restore --staged styles.css`. The first one erases a morning of uncommitted work with no way back. When unsure, commit first (on a branch if it is experimental): committed work can always be recovered.' },

  { id: 'revert-reset', hub: 'undo', topic: 'undo', title: 'Undo after committing: revert, amend, reset',
    summary: 'To undo a commit that is already pushed, use `git revert <hash>`, which adds a new commit that cancels it; `git commit --amend` and `git reset` rewrite history, so use them only on commits that exist only on your laptop.',
    html: [
      '<p><code>git revert</code> never erases: it adds a <strong>new commit</strong> that cancels the old one, so history only grows, your partner\'s copy stays compatible and a normal push works. <code>git commit --amend</code> and <code>git reset</code> instead <strong>rewrite</strong> history: fine for commits that exist only on your laptop, harmful once others have them.</p>',
      '<table><caption>Undoing commits</caption><thead><tr><th scope="col">Command</th><th scope="col">What it does</th><th scope="col">Rewrites history?</th><th scope="col">OK after push?</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>git revert &lt;hash&gt;</code></th><td>New commit with the opposite changes</td><td>No</td><td>Yes</td></tr>'
        + '<tr><th scope="row"><code>git commit --amend</code></th><td>Replaces the last commit: fix the message, add a forgotten file</td><td>Yes</td><td>No</td></tr>'
        + '<tr><th scope="row"><code>git reset --soft HEAD~1</code></th><td>Removes the last commit; its changes stay staged</td><td>Yes</td><td>No</td></tr>'
        + '<tr><th scope="row"><code>git reset --hard &lt;hash&gt;</code></th><td>Moves the branch back <strong>and</strong> discards all uncommitted work</td><td>Yes</td><td>No; avoid it unless you are sure</td></tr>'
        + '</tbody></table>',
      '<p><code>HEAD~1</code> means "the parent of the current commit", one step back.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Pushed: revert. Not pushed yet: amend or reset are fine.',
      desc: 'To undo a commit, first ask whether it is already pushed. If yes, use git revert, which adds a new commit that cancels it. If not, git commit --amend or git reset can rewrite your own history.',
      nodes: [
        { id: 'q', label: 'Already pushed?' },
        { id: 'revert', label: '`git revert`', note: 'a new cancelling commit', key: true },
        { id: 'local', label: '`--amend` or `reset`', note: 'rewrite your own history' },
      ],
      edges: [['q', 'revert', 'yes'], ['q', 'local', 'no']],
    },
    code: `# a pushed commit broke the page: cancel it with a new commit
$ git log --oneline
8e4d7b2 (HEAD -> main, origin/main) Remove contact form
3f9c2a1 Add contact form to index.html
$ git revert --no-edit 8e4d7b2
[main c71a0f4] Revert "Remove contact form"
 1 file changed, 12 insertions(+)
$ git push

# forgot a file in the last commit, NOT pushed yet:
$ git add about.html
$ git commit --amend --no-edit`,
    dialect: 'shell',
    example: 'Luis pushed a commit that deleted the contact form. Ana, who already pulled it, sees `git revert` arrive as an ordinary new commit "Revert …" on her next pull. Had Luis used `git reset` and `git push --force`, Ana\'s next push would bring the bad commit back or fail, and work could be lost.',
    mistake: 'Amending or resetting a commit that was already pushed, then "fixing" the rejected push with `git push --force`. That replaces the shared history and can delete your partner\'s commits. On a shared branch, use `git revert`.' },
];

DATA.en.GIT_QUIZ = [
  /* ---- why -------------------------------------------------------------------------- */
  { type: 'mc', topic: 'why',
    q: 'A classmate says: "We don\'t need Git, our project folder is synced to OneDrive." What does Git give you that a sync service does not?',
    choices: ['A copy of the latest version of each file in the cloud', 'Deliberate, described checkpoints of the whole project that can be compared and restored', 'Automatic saving every few seconds', 'Faster file transfers'],
    answer: 1,
    why: 'Sync keeps the **latest** files; version control keeps **chosen whole-project checkpoints** with messages, comparable line by line and restorable.' },
  { type: 'tf', topic: 'why',
    q: 'Because Git is distributed, you can commit and read the full history without an internet connection.',
    answer: true,
    why: 'Every clone holds the complete history. Only exchanging commits with another copy (push, pull, fetch) needs the network.' },
  { type: 'mc', topic: 'why',
    q: 'Which statement about Git and GitHub is correct?',
    choices: ['GitHub is the newer version of Git', 'Git is a website; GitHub is the program you install', 'Git is the version-control program on your computer; GitHub hosts copies of repositories online', 'You cannot commit without a GitHub account'],
    answer: 2,
    why: 'Git does the version control locally; GitHub is a hosting service that stores another copy and adds pull requests and reviews.' },
  { type: 'fib', topic: 'why',
    q: 'The complete history of a repository is stored in a hidden folder named ___ at its root.',
    accept: ['.git', '`.git`'],
    why: 'Deleting `.git` leaves your files but erases all history; the folder stops being a repository.' },

  /* ---- model ------------------------------------------------------------------------ */
  { type: 'mc', topic: 'model',
    q: 'You edit `styles.css`, run `git add styles.css`, edit `styles.css` again, and run `git commit -m "Style nav"` without adding again. What does the commit contain?',
    choices: ['The latest version of `styles.css`', 'The version of `styles.css` at the moment of `git add`', 'No change: the commit is empty', 'Both versions, one after the other'],
    answer: 1,
    why: '`git add` stages a snapshot of the content **at that moment**. Later edits stay in the working directory until you add again.' },
  { type: 'mc', topic: 'model',
    q: '`git status` lists `index.html` both under "Changes to be committed" and under "Changes not staged for commit". What happened?',
    choices: ['Git is corrupted', 'The file was staged, then edited again after staging', 'There is a merge conflict', 'The file is listed in `.gitignore`'],
    answer: 1,
    why: 'The staged photo is older than the file on disk. `git add index.html` again to include the new edits.' },
  { type: 'tf', topic: 'model',
    q: '`git add` moves a file out of your working directory into the staging area.',
    answer: false,
    why: 'It **copies** the file\'s current content into the staging area; the file stays on your disk, unchanged.' },
  { type: 'mc', topic: 'model',
    q: 'You create `contact.html` and have never run `git add` on it. How does `git status` describe it?',
    choices: ['Modified', 'Staged', 'Untracked', 'Committed'],
    answer: 2,
    why: 'Untracked means Git has never stored the file. "Modified" applies only to files that already exist in a commit.' },
  { type: 'fib', topic: 'model',
    q: 'The staging area is also called the ___.',
    accept: ['index'],
    why: 'Git\'s own documentation uses "index"; it is the draft of the next commit.' },
  { type: 'mc', topic: 'model',
    q: 'Which statement about a Git commit is true?',
    choices: ['It stores only the lines you changed, without the rest of the project', 'It is a snapshot of all tracked files, with an author, date, message and parent link, identified by a hash', 'Its hash is a sequential number: 1, 2, 3…', 'It is uploaded to GitHub automatically'],
    answer: 1,
    why: 'A commit is a whole-project snapshot. The hash is computed from its content and parent, and nothing reaches GitHub without `git push`.' },
  { type: 'mc', topic: 'model',
    q: 'Which commit message best follows the usual conventions?',
    choices: ['`changes`', '`Fixed stuff and also some styling!!!`', '`Fix 404 when a book id does not exist`', '`final final v3`'],
    answer: 2,
    why: 'A short imperative summary of **one** logical change, specific enough to find later.' },

  /* ---- setup ------------------------------------------------------------------------ */
  { type: 'mc', topic: 'setup',
    q: 'Your partner created the team repository on GitHub with a README. How should you get it onto your laptop?',
    choices: ['`git init` in a new folder, then copy the README by hand', '`git clone <url>`', '`git pull <url>` in your Documents folder', 'Download the ZIP from GitHub'],
    answer: 1,
    why: '`git clone` copies files **and** history and sets up `origin`, so push and pull work immediately. A ZIP or `git init` would have no link to the shared history.' },
  { type: 'mc', topic: 'remote',
    q: 'On a shared Linux computer, `git push` asks for a username and password. You type your GitHub account password. What happens?',
    choices: ['The push succeeds', 'The push fails: GitHub no longer accepts account passwords for Git; use a token, `gh auth login` or SSH', 'Git creates a new account', 'The push succeeds but the commits are anonymous'],
    answer: 1,
    why: 'Password authentication for Git operations was removed in 2021. Use a personal access token, the GitHub CLI, a credential manager or an SSH key.' },
  { type: 'tf', topic: 'setup',
    q: 'A setting made with `git config --global` applies to every repository of your user on that computer.',
    answer: true,
    why: '`--global` writes to `~/.gitconfig`. Without `--global`, the setting applies to the current repository only.' },
  { type: 'mc', topic: 'remote',
    q: 'You ran `git init`, `git add .` and `git commit` in a new folder. `git push` fails with "No configured push destination". What is missing?',
    choices: ['A `.gitignore` file', 'A remote: `git remote add origin <url>`, then `git push -u origin main`', 'Another commit', 'Running `git init` again'],
    answer: 1,
    why: 'A repository created with `git init` has no remote. Link it to an empty GitHub repository and push with `-u` the first time.' },
  { type: 'fib', topic: 'setup',
    q: 'Complete the command so `git init` names the first branch main: `git config --global init.___ main`',
    accept: ['defaultBranch', 'defaultbranch'],
    why: 'Without it, Git may name the first branch `master` while GitHub uses `main`.' },

  /* ---- daily ------------------------------------------------------------------------ */
  { type: 'mc', topic: 'daily',
    q: 'You staged your changes with `git add .` and now `git diff` prints nothing. How do you see what the next commit will contain?',
    choices: ['`git log`', '`git diff --staged`', '`git status --all`', 'Nothing: the changes were lost'],
    answer: 1,
    why: 'Plain `git diff` compares the working directory with the staging area. `git diff --staged` compares the staging area with the last commit.' },
  { type: 'mc', topic: 'daily',
    q: 'In a Node.js project, which of these should be listed in `.gitignore`?',
    choices: ['`package.json`', '`package-lock.json`', '`node_modules/`', '`.env.example`'],
    answer: 2,
    why: '`node_modules/` is re-created by `npm install` from `package.json` and `package-lock.json`, which **are** committed, as is `.env.example`.' },
  { type: 'mc', topic: 'daily',
    q: 'A `.env` with a real database password was committed and pushed. You then add `.env` to `.gitignore`. What is true?',
    choices: ['The file disappears from GitHub and its history', 'Git keeps tracking it and the password stays in the history; run `git rm --cached .env`, commit, and change the password', 'Nothing needs to be done', 'GitHub deletes the repository automatically'],
    answer: 1,
    why: '`.gitignore` only affects **untracked** files. The old value remains readable in history, so the secret must be changed.' },
  { type: 'tf', topic: 'daily',
    q: '`git add .` stages only files that were modified; new files must always be added one by one.',
    answer: false,
    why: '`git add .` stages modified, **new** and deleted files in the current folder and subfolders. That is exactly why a `.gitignore` is needed.' },

  /* ---- remote ----------------------------------------------------------------------- */
  { type: 'mc', topic: 'remote',
    q: '`git status` says "Your branch is up to date with \'origin/main\'", yet your partner pushed a commit five minutes ago. Why?',
    choices: ['Your partner\'s push failed', 'The comparison uses your local `origin/main`, last updated when you fetched or pulled', 'GitHub hides recent commits for an hour', '`git status` only checks staged files'],
    answer: 1,
    why: '`origin/main` is your last **known** picture of the remote. Run `git fetch` (or `git pull`) to refresh it.' },
  { type: 'mc', topic: 'remote',
    q: '`git push` is rejected with "(fetch first)". What is the correct next step?',
    choices: ['`git push --force`', 'Delete the folder and clone again', '`git pull`, resolve any conflict, then `git push`', 'Create a new repository'],
    answer: 2,
    why: 'The remote has commits you lack. Integrate them first; forcing would delete your partner\'s commits.' },
  { type: 'mc', topic: 'remote',
    q: 'What is the difference between `git fetch` and `git pull`?',
    choices: ['None, they are synonyms', '`fetch` downloads commits without changing your branch or files; `pull` fetches and then integrates them into your branch', '`fetch` uploads, `pull` downloads', '`pull` only works on `main`'],
    answer: 1,
    why: '`git pull` = `git fetch` + merge (or fast-forward) into the current branch.' },
  { type: 'fib', topic: 'remote',
    q: 'The default name `git clone` gives to the remote you cloned from is ___.',
    accept: ['origin'],
    why: '`git remote -v` lists it with its fetch and push URLs.' },

  /* ---- branch ----------------------------------------------------------------------- */
  { type: 'mc', topic: 'branch',
    q: 'What is a branch in Git?',
    choices: ['A copy of the project folder', 'A movable label pointing to a commit, which moves forward when you commit on it', 'A second repository on GitHub', 'A backup of the staging area'],
    answer: 1,
    why: 'Branches are pointers, which is why creating one is instant. `HEAD` marks the current one.' },
  { type: 'mc', topic: 'branch',
    q: 'On `main` you run `git branch add-footer`, then edit, add and commit. Which branch receives the commit?',
    choices: ['`add-footer`', '`main`', 'Both', 'Neither: Git refuses'],
    answer: 1,
    why: '`git branch <name>` creates a label but does not switch. Use `git switch -c add-footer` to create **and** switch.' },
  { type: 'mc', topic: 'branch',
    q: 'You branched `add-footer` from `main` and committed twice on it. `main` has not changed. On `main` you run `git merge add-footer`. What happens?',
    choices: ['A merge commit with two parents is created', 'A fast-forward: the `main` label moves to the tip of `add-footer`, no new commit', 'A merge conflict', '`add-footer` is deleted'],
    answer: 1,
    why: 'With no divergent commits on `main`, Git only moves the label forward.' },
  { type: 'mc', topic: 'branch',
    q: 'During `git merge add-title` you see `<<<<<<< HEAD`, a line, `=======`, another line, `>>>>>>> add-title`. What is the text between `<<<<<<< HEAD` and `=======`?',
    choices: ['The version from `add-title`', 'The version from the branch you are on', 'The common ancestor\'s version', 'An error message from Git'],
    answer: 1,
    why: '`HEAD` is your current branch ("Current" in VS Code); the part after `=======` comes from the branch being merged ("Incoming").' },
  { type: 'mc', topic: 'branch',
    q: 'You have edited a conflicted file into its final form and removed the markers. What comes next?',
    choices: ['`git merge --abort`', '`git add <file>` then `git commit`', '`git push --force`', '`git restore <file>`'],
    answer: 1,
    why: '`git add` marks the conflict as resolved; `git commit` completes the merge. `--abort` would throw the merge away, and `restore` would discard your resolution.' },
  { type: 'tf', topic: 'branch',
    q: 'A merge conflict means Git has damaged your files, and the safest fix is to delete the folder and clone again.',
    answer: false,
    why: 'A conflict is a question: both versions are in the file for you to choose. Re-cloning throws away un-pushed commits; `git merge --abort` is the clean way back.' },

  /* ---- collab ----------------------------------------------------------------------- */
  { type: 'mc', topic: 'collab',
    q: 'What is a pull request on GitHub?',
    choices: ['The `git pull` command run on the server', 'A proposal to merge one branch into another, with its diff and a review conversation', 'A request to download a repository', 'A message asking the owner for collaborator access'],
    answer: 1,
    why: 'Despite the name, a PR is about **merging**: the reviewer reads the diff and approves before it enters `main`.' },
  { type: 'mc', topic: 'collab',
    q: 'Your project partner cloned your repository, but their `git push` is denied with a permission error. What is the most likely fix?',
    choices: ['They should use `git push --force`', 'Add them in the repository\'s Settings → Collaborators, and they accept the invitation', 'Make the repository private', 'They should run `git init` again'],
    answer: 1,
    why: 'Anyone can clone a public repository, but only collaborators can push to it.' },
  { type: 'mc', topic: 'collab',
    q: 'Which order follows GitHub flow?',
    choices: ['Commit on `main` → push → open PR', 'Pull `main` → create branch → commit → push branch → open PR → review → merge → pull `main`', 'Fork → force push → merge', 'Create PR → create branch → commit'],
    answer: 1,
    why: 'Each change gets its own branch and enters `main` only through a reviewed pull request.' },
  { type: 'mc', topic: 'collab',
    q: 'You tag the commit you deliver as `v1.0` and keep committing on `main` for a week. Where does `v1.0` point now?',
    choices: ['At the newest commit on `main`', 'At the same commit as when you created it', 'Nowhere: tags expire after a release', 'At the first commit of the repository'],
    answer: 1,
    why: 'A tag never moves; a branch label moves forward with each commit. That is why a tag marks a version.' },
  { type: 'tf', topic: 'collab',
    q: '`git push` sends your tags to GitHub together with your commits.',
    answer: false,
    why: 'Tags are pushed explicitly: `git push origin v1.0`, or all of them with `git push --tags`.' },
  { type: 'fib', topic: 'collab',
    q: 'After `git stash` and `git pull`, you bring your set-aside edits back with `git stash ___`.',
    accept: ['pop'],
    why: '`pop` re-applies the newest stash and removes it from the list (`git stash apply` re-applies it and keeps it).' },

  /* ---- undo ------------------------------------------------------------------------- */
  { type: 'mc', topic: 'undo',
    q: 'After `git add .`, `git status` shows `new file: .env`. You have not committed. How do you take `.env` out of the next commit but keep the file?',
    choices: ['`git restore .env`', '`git restore --staged .env`', '`git revert .env`', 'Delete the file'],
    answer: 1,
    why: '`--staged` unstages and leaves the file untouched. Then add `.env` to `.gitignore`.' },
  { type: 'mc', topic: 'undo',
    q: 'A commit that broke the site is already on GitHub and your partner has pulled it. What is the safest way to undo it?',
    choices: ['`git reset --hard HEAD~1` and `git push --force`', '`git revert <hash>` and `git push`', '`git commit --amend`', 'Delete the repository on GitHub'],
    answer: 1,
    why: 'Revert adds a new commit that cancels the bad one, so shared history only grows and everyone stays compatible.' },
  { type: 'tf', topic: 'undo',
    q: 'If you discard unstaged edits with `git restore <file>`, you can recover them later from Git.',
    answer: false,
    why: 'Those edits were never committed or staged, so Git never had a copy. Discarding is permanent.' },
];

/* Guided challenges for the `git-sim` tool.
   start.files: each file starts 'untracked' (new), 'modified' (committed earlier, then edited)
   or 'committed' (unchanged since the last commit). Files that are 'modified' or 'committed'
   come from one initial commit on `main`. start.remote: true = an `origin` remote exists and
   its `main` equals the local `main`.
   check keys (all must hold): commits (min commits on the current branch), staged, untracked,
   modified (exact counts), branches (must exist), current (current branch), pushed (current
   branch equals its remote branch), merged (that branch's tip is an ancestor of the current
   branch), clean (nothing staged, modified or untracked). */
DATA.en.GIT_SIM_CHALLENGES = [
  { id: 'first-commit', title: '1. Your first commit',
    start: { files: { 'index.html': 'untracked', 'styles.css': 'untracked' }, remote: false },
    goal: 'Two new files sit in the working directory and Git has never stored them. Make this folder a repository with `git init` (if it already is one, Git just re-initializes it, which is harmless), stage **both** files and record them in one commit with a descriptive message. Finish with a clean `git status`.',
    hint: '`git init`, then `git add .` (or `git add index.html styles.css`), then `git commit -m "Add home page and styles"`. Run `git status` between steps to watch the files move from untracked to staged to committed.',
    check: { commits: 1, clean: true } },

  { id: 'stage-some', title: '2. Commit only part of your work',
    start: { files: { 'index.html': 'committed', 'styles.css': 'modified', 'notes.txt': 'untracked' }, remote: false },
    goal: 'You finished a change in `styles.css`, but `notes.txt` is a private scratch file that must not be committed. Commit **only** `styles.css`. When you finish, `notes.txt` must still be untracked and nothing else may be pending.',
    hint: 'Do not use `git add .` here. Stage the single file with `git add styles.css`, check with `git status` that only it is under "Changes to be committed", then commit.',
    check: { commits: 2, staged: 0, modified: 0, untracked: 1 } },

  { id: 'unstage-secret', title: '3. Fix a staging mistake',
    start: { files: { 'index.html': 'modified', 'app.js': 'modified', '.env': 'untracked' }, remote: false },
    goal: 'Run `git add .` to stage everything, then read `git status`: the secrets file `.env` is staged too. Take **only** `.env` out of the staging area, keeping the file on disk, and commit the other two changes. `.env` must end up untracked.',
    hint: '`git restore --staged .env` unstages it without touching the file. Check `git status`, then `git commit -m "..."`. In a real project you would also add `.env` to `.gitignore`.',
    check: { commits: 2, staged: 0, modified: 0, untracked: 1 } },

  { id: 'discard-edit', title: '4. Throw away a failed experiment',
    start: { files: { 'index.html': 'committed', 'styles.css': 'modified' }, remote: false },
    goal: 'Your edits to `styles.css` broke the layout and you want the last committed version back. Discard the uncommitted edits so the working directory is clean, **without** making a new commit.',
    hint: '`git diff` shows what you are about to lose. `git restore styles.css` copies the committed version back over your edits. This cannot be undone in real Git, so read the diff first.',
    check: { commits: 1, clean: true } },

  { id: 'branch-commit', title: '5. Work on a branch',
    start: { files: { 'index.html': 'committed', 'styles.css': 'committed' }, remote: false },
    goal: 'Create a branch called `add-footer` and switch to it in one command. On that branch, edit `index.html` and commit the change. `main` must stay where it was; watch the graph: only the `add-footer` label moves.',
    hint: '`git switch -c add-footer` (or `git checkout -b add-footer`), then `edit index.html`, `git add index.html`, `git commit -m "Add footer"`. `git branch` shows a `*` next to the current branch.',
    check: { branches: ['main', 'add-footer'], current: 'add-footer', commits: 2, clean: true } },

  { id: 'merge-back', title: '6. Merge a feature into main',
    start: { files: { 'index.html': 'committed', 'styles.css': 'committed' }, remote: false },
    goal: 'Create a branch `add-contact`, commit a change to `index.html` on it, then bring that work into `main`. You must end **on `main`**, with the `add-contact` commit in its history and a clean working directory.',
    hint: 'Merge from the receiving branch: `git switch -c add-contact`, `edit index.html`, `git add index.html`, `git commit -m "Add contact section"`, then `git switch main` and `git merge add-contact`. Because `main` did not move, this is a fast-forward.',
    check: { current: 'main', merged: 'add-contact', commits: 2, clean: true } },

  { id: 'push-origin', title: '7. Publish to GitHub',
    start: { files: { 'index.html': 'committed', 'styles.css': 'committed' }, remote: true },
    goal: 'This repository was cloned from GitHub (`origin`). Edit `styles.css`, commit the change, and publish it so that `origin/main` matches your local `main`.',
    hint: '`git remote -v` shows the remote. After `edit styles.css`, `git add styles.css` and `git commit -m "..."`, run `git status`: "ahead of \'origin/main\' by 1 commit". Then `git push`.',
    check: { current: 'main', commits: 2, pushed: true, clean: true } },

  { id: 'push-branch', title: '8. Push a branch for a pull request',
    start: { files: { 'index.html': 'committed', 'app.js': 'committed' }, remote: true },
    goal: 'GitHub flow: create a branch `validate-form`, commit a change to `app.js` on it, and push the branch to `origin`, setting its upstream, so that it is ready for a pull request on GitHub. Stay on `validate-form`.',
    hint: '`git switch -c validate-form`, `edit app.js`, `git add app.js`, `git commit -m "Validate form fields"`, then `git push -u origin validate-form`. On the real GitHub you would now click "Compare & pull request".',
    check: { branches: ['main', 'validate-form'], current: 'validate-form', commits: 2, pushed: true, clean: true } },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.GIT_VIDEOS = [
  {
    "id": "git-three-areas",
    "group": "model",
    "title": "Where your changes live",
    "mp4": "assets/video/git-three-areas/git-three-areas.mp4",
    "poster": "assets/video/git-three-areas/git-three-areas-poster.jpg",
    "captions": "assets/video/git-three-areas/git-three-areas.vtt",
    "duration": "2:37",
    "transcript": [
      "Where your changes live. Saving a file is not saving it in Git.",
      "You create about.html, edit index.html, and press Ctrl+S. Both files are saved. Git has stored nothing. Your project has three rooms, and a fourth copy far away. The working directory holds the files you edit. The staging area holds the next commit, being prepared. The repository holds the commits already saved. The fourth room, the remote, is GitHub. It stays dark for now.",
      "At every step, one command asks the same question: where is everything? git status. index.html is modified. about.html is untracked: Git has never stored it. Both still sit in the working directory.",
      "git add, then both names. Git copies a snapshot of each file into the staging area. Now git diff shows nothing. The changes are not lost. They are staged. Edit a file after adding it, and the staged copy stays the old one. Add it again. That is the point: the staging area holds exactly what the next commit will contain.",
      "git diff compares the working directory with the staging area: edits not added yet. git diff --staged compares the staging area with the last commit. That is what a commit would record right now. Read it before you commit.",
      "git commit, with a message. Everything staged is sealed into a commit. A commit is a complete snapshot of the project, named by a hash. It also points to its parent, the commit before it. Nothing is staged now. git status says: nothing to commit, working tree clean.",
      "git log --oneline lists the history, newest first. Each commit points to its parent. That chain is the history. Change even one letter of a message, and the hash changes. History cannot be altered silently.",
      "So far, only your laptop knows. git status now says: ahead of origin/main by 1 commit. git push uploads the commits the remote does not have yet. Only commits travel, never loose edits. Now the fourth room lights up.",
      "Practise it with the commit and branch simulator, in Version control."
    ]
  },
  {
    "id": "git-branch-merge",
    "group": "branch",
    "title": "Branches and merging",
    "mp4": "assets/video/git-branch-merge/git-branch-merge.mp4",
    "poster": "assets/video/git-branch-merge/git-branch-merge-poster.jpg",
    "captions": "assets/video/git-branch-merge/git-branch-merge.vtt",
    "duration": "3:16",
    "transcript": [
      "Branches and merging. Work on something new without breaking what already works.",
      "A branch sounds like a copy of your whole project. It isn't. It's a label stuck to one commit. Here, main points at the contact form commit. Run git switch -c add-footer. Git writes one tiny label. Nothing is copied, so it's instant. git branch on its own lists them all. A star marks the one you're on.",
      "HEAD is a you-are-here pin. It now sits on add-footer. Edit, then commit. The new commit appears, and only the branch you're on moves forward. Main stays behind. Switch back to it, and the footer is gone. A classic slip: git branch alone makes the label but never moves HEAD. Your commits then land on main.",
      "To bring the footer in, stand on the receiving branch. Switch to main, then git merge add-footer. Main has nothing new, so the history is one straight line. Git just slides the label up. That's a fast-forward. No new commit. Same history, one label moved. Afterwards, git branch -d add-footer removes the label. The commits stay in main's history.",
      "Now the harder case. Ana starts add-search from the old commit. While she works, main moves ahead. The history forks. Merge add-search into main. Git finds the common ancestor, combines both sets of changes, and ties the knot with a merge commit. It has two parents: the tip of main, and the tip of add-search. The log shows it as a picture: two lines that split, then meet again.",
      "One habit. Check which branch you're standing on before you merge. Merge main into add-footer, and you've updated the wrong branch.",
      "Sometimes Git can't tie the knot. Two branches rewrote the same line: the heading. Everything else, Git still combines by itself. Only that one line needs you. The merge stops with a conflict in index.html. It isn't an error. It's a question. git status lists the file as both modified. Both versions sit in the file, between markers. Above the ======= is yours. Below is theirs.",
      "Edit the line into what you want: yours, theirs, both, or something new. Delete all three markers. Then git add the file, and git commit. The merge is complete. Search for the markers before you commit, or they end up on your page. And if you panic, git merge --abort puts everything back.",
      "Practise it with the Commit and branch simulator, in Version control."
    ]
  },
  {
    "id": "git-remote-pr",
    "group": "remote",
    "title": "Working with a remote",
    "mp4": "assets/video/git-remote-pr/git-remote-pr.mp4",
    "poster": "assets/video/git-remote-pr/git-remote-pr-poster.jpg",
    "captions": "assets/video/git-remote-pr/git-remote-pr.vtt",
    "duration": "2:48",
    "transcript": [
      "Working with a remote. Your commits stay on your laptop until you say so.",
      "Ana has a project on her laptop. Another copy lives on GitHub. Git never syncs them by itself. The copy on GitHub has a name: origin. She creates a branch, validate-form, and makes a commit. It exists only on her laptop. Reviewers and deployment tools read GitHub, not her laptop.",
      "To share it, she pushes. The first time, she adds -u, so Git remembers the link. Commits fly up. Only commits: not files, not edits. On GitHub, the branch validate-form now exists.",
      "Her laptop also keeps a picture of the remote: origin/main. It's a ghost label. It moves only when she talks to GitHub. So when Luis pushes to main, her picture is already out of date. git status says: up to date with origin/main. That means the picture. Not GitHub, live.",
      "git fetch asks GitHub what's new. Luis's commits fly down. Only the ghost label moves. Her branch and her files don't change. git log origin/main shows what arrived. Now she can look first. A fetch can never cause a conflict.",
      "git pull is a fetch, followed by a merge into your current branch. The ghost label moves, and then main catches up. If she had no new commits, it's a fast-forward. If both sides have new commits, pull makes a merge commit, and it may conflict. Her habit: pull before you start, and pull before you push. Skip it, and her next push is rejected: fetch first. Never force it. Pull, then push again.",
      "Back on validate-form, her branch is on GitHub. Now she opens a pull request. She says what changed and why, and asks Luis to review. It's a page that says: please merge this branch into main. It shows the diff. Luis reads it and leaves a comment. Ana fixes it and pushes to the same branch. The pull request updates. Luis approves.",
      "She clicks Merge pull request. On GitHub, validate-form joins main. Her laptop doesn't know yet. She switches to main, and pulls. Now both copies agree. She deletes the branch with git branch -d, and starts the next one. Keep each pull request to one change, and merge it within a day or two.",
      "Practise it with the commit and branch simulator in Version control."
    ]
  }
];
// </topic-videos>
