'use strict';
/* Version control: concept cards, quiz, rail groups and the guided challenges of the
   `git-sim` tool (Git and GitHub as the worked example). See site/README.md for the data
   contract. */

DATA.en.GIT_QUIZ_TOPICS = {
  why: 'Version control, Git and GitHub',
  model: 'Three areas, staging and commits',
  setup: 'Install, configure, init/clone, sign-in',
  daily: 'Everyday commands and .gitignore',
  remote: 'Remotes, push, fetch and pull',
  branch: 'Branches, merge and conflicts',
  collab: 'GitHub flow and pull requests',
  undo: 'Undoing safely',
};

DATA.en.GIT_GROUPS = [
  { key: 'why', label: 'Why version control', icon: 'why' },
  { key: 'model', label: 'How Git thinks', icon: 'storage' },
  { key: 'setup', label: 'Setup', icon: 'key' },
  { key: 'daily', label: 'Everyday commands', icon: 'steps' },
  { key: 'remote', label: 'Remotes', icon: 'arrow' },
  { key: 'branch', label: 'Branches and merging', icon: 'split' },
  { key: 'collab', label: 'Working in a team', icon: 'cluster' },
  { key: 'undo', label: 'Undoing safely', icon: 'special' },
];

DATA.en.GIT_CONCEPTS = [
  /* ---- 1. Why version control --------------------------------------------------- */
  { id: 'version-control', hub: 'why', topic: 'why', title: 'What version control is, and why',
    summary: 'Version control is a system that records chosen, labelled states of a whole project over time, so you can see what changed, when and by whom, return to any earlier state, and work in parallel with other people.',
    body: [
      'Mental model: your project becomes a **timeline of checkpoints that you create on purpose**. Each checkpoint is a complete picture of every tracked file, with a description and an author, and the system can compare any two checkpoints line by line. That replaces folders full of `index_final.html`, `index_final_v2.html` and `index_FINAL_really.html`, and it answers the question "what did the site look like on Tuesday, and what exactly have I changed since?"',
      'It gives four benefits: **tracking** (every change is recorded with who, when and why), **collaboration** (several people change the same project without overwriting each other), **rollback** (go back to, or cancel, any earlier change) and **branching** (try an idea on a separate line of work, then combine it or throw it away).',
      '**Git** is the version-control system used in almost every software project and job today. It is **distributed**: every copy of a project holds the complete history, so committing, reading the history and comparing versions all work offline and fast; the network is only needed to exchange work with another copy. Older **centralized** systems (for example Subversion) kept the history only on one server, so most operations needed a connection.',
    ],
    example: 'On Monday you save a checkpoint called "Add contact form". On Wednesday the layout is broken. The history shows three checkpoints since Monday, and comparing Monday with today shows the single line in `styles.css` that changed `display: grid` to `display: flex`. You fix that line instead of guessing.',
    mistake: 'Treating version control as cloud sync (OneDrive, Dropbox, Google Drive). Sync silently keeps the **latest** version of each file; version control keeps **chosen, described, whole-project** checkpoints, and records nothing until you ask it to. Do not keep a Git project inside a synced folder either: sync and Git writing the same hidden files at the same time causes lock errors and damaged repositories.' },

  { id: 'git-vs-github', hub: 'why', topic: 'why', title: 'Git vs GitHub',
    summary: 'Git is the version-control program that runs on your computer; GitHub is a website that stores copies of Git repositories online and adds team features such as pull requests, reviews and issues.',
    body: [
      'Mental model: **Git does all the version control on your machine**; GitHub is simply **one more copy of your project**, kept on a server that you, your partner and your instructor can all reach, with a web interface around it. You can use Git for years without GitHub; GitHub is useless without Git.',
      'Work moves between the two copies only when you say so: `git push` sends your new checkpoints to GitHub, and `git pull` brings down checkpoints that someone else (or you, from another computer) sent there. Alternatives to GitHub, such as GitLab or Bitbucket, work the same way because they host the same Git repositories.',
    ],
    table: {
      caption: 'Who does what',
      head: ['', 'Git', 'GitHub'],
      rows: [
        ['What it is', 'A command-line program you install', 'A website (a hosting service) run by a company'],
        ['Where it runs', 'Your laptop, offline', 'GitHub servers, through the browser or the network'],
        ['Main jobs', 'Stage, commit, branch, merge, read history', 'Store a shared copy, pull requests, code review, access control'],
        ['Account needed?', 'No (only a name and email in its config)', 'Yes, a free github.com account'],
      ],
    },
    example: 'On a train without Wi-Fi you create a repository, make 12 commits and browse the history: that is all Git. At home, `git push` uploads those 12 commits to GitHub, where your teammate sees them and can review them.',
    mistake: '"I committed, so my instructor can see it." A commit exists only in your **local** repository until you run `git push`. The mirror mistake: editing a file on github.com and expecting your laptop to know about it; your local copy changes only after `git pull`.' },

  { id: 'repository', hub: 'why', topic: 'why', title: 'Repository',
    summary: 'A repository (repo) is a project folder whose complete history Git tracks; the history and Git\'s settings live in a hidden `.git` folder at the root of that folder.',
    body: [
      'Mental model: the files you see are your **workbench**, and the hidden `.git` folder is the **archive** behind it, holding every commit, every branch and the link to GitHub. Delete `.git` and the files stay, but all history is gone and the folder is no longer a repository. Copy the folder including `.git` and you have copied the whole history.',
      'Your laptop copy and the GitHub copy are **two separate repositories** of the same project. They are not linked live; they exchange commits only when you push or pull. A file named `README.md` at the root is the project\'s front page: GitHub displays it under the file list, so it should say what the project is and how to run it.',
    ],
    code: `$ cd my-first-repo
$ ls -a
.  ..  .git  README.md  index.html
$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean`,
    dialect: 'shell',
    example: 'A two-person project lives in one repository on GitHub. Each partner has a local repository created by cloning it. Both local repositories hold the full history, so if one laptop dies, nothing committed and pushed is lost.',
    mistake: 'Running `git init` in your home folder or on the Desktop, which turns every file below it into one giant repository, or running it inside a folder that is already a repository (a repository nested in another). Check where you are with `pwd` and `git status` before `git init`: if `git status` already answers "On branch ...", you are inside a repository.' },

  /* ---- 2. How Git thinks ------------------------------------------------------------ */
  { id: 'three-areas', hub: 'model', topic: 'model', title: 'The three areas (and the remote)',
    summary: 'Git keeps your work in three local areas: the **working directory** (the files you edit), the **staging area** or index (the next commit being prepared) and the **repository** (the commits already saved); a remote such as GitHub is a fourth, separate copy.',
    body: [
      'Mental model: you are packing parcels. The **working directory** is your desk, with everything spread out and half-finished. The **staging area** is an open box: `git add` puts a **copy** of a file, exactly as it is now, into the box. `git commit` seals the box, labels it with a message and puts it on the archive shelf, the **repository**. `git push` ships copies of the sealed boxes to the warehouse, the **remote** (GitHub). Nothing reaches the shelf without passing through the box, and nothing reaches the warehouse without first being on the shelf.',
      'Each file has a **status** that compares those areas. **Untracked**: Git has never stored it (a brand-new file). **Unmodified**: it is the same as in the last commit. **Modified**: it changed since the last commit, and the change is not in the box yet. **Staged**: its current content is in the box and will go into the next commit. `git status` reports exactly these statuses.',
      'Commands are just moves between areas: `git add` (desk → box), `git commit` (box → shelf), `git push` (shelf → warehouse), `git pull` (warehouse → shelf and desk), `git restore --staged` (take out of the box) and `git restore` (put the desk back as it was in the box).',
    ],
    table: {
      caption: 'The four places your work can be',
      head: ['Area', 'What it holds', 'Where it lives', 'In / out'],
      rows: [
        ['Working directory', 'The files as you see them in the editor, including unsaved-to-Git experiments', 'The project folder', 'You edit; `git restore` discards edits'],
        ['Staging area (index)', 'The exact content of the next commit', 'A file inside `.git`', '`git add` in; `git restore --staged` out'],
        ['Local repository', 'Every commit, every branch', 'The `.git` folder', '`git commit` in'],
        ['Remote (GitHub)', 'The shared copy of the commits', 'A server', '`git push` up; `git fetch` / `git pull` down'],
      ],
    },
    code: `  working directory  --git add-->  staging area  --git commit-->  local repo  --git push-->  remote
     (your desk)                       (the box)                    (the shelf)               (GitHub)
                     <--git restore--               <--git restore --staged       <--git pull--`,
    dialect: 'diagram',
    example: 'You create `about.html` (untracked) and edit `index.html` (modified). `git add about.html` puts only the new page in the box. `git commit -m "Add about page"` seals it: the about page is now in the repository, while `index.html` is still modified on the desk and in no commit. GitHub has none of this until `git push`.',
    mistake: 'Believing that pressing Ctrl+S in VS Code "saves into Git". Saving writes only to the **working directory**. Until you `git add` and `git commit`, Git has no copy of that change, and until you `git push`, nobody else has one either.',
    widget: 'git-sim',
    practice: { href: '#/vcs/repositories/practice/git-sim', label: 'Open the commit and branch simulator' } },

  { id: 'staging-area', hub: 'model', topic: 'model', title: 'The staging area (index)',
    summary: 'The staging area, also called the **index**, is a draft of your next commit: it holds the exact version of each file that `git commit` will record.',
    body: [
      'Mental model: `git add` takes a **photo** of a file as it is at that moment and pins the photo into the draft of the next commit. If you keep editing afterwards, the draft still holds the old photo; the new edits are left out until you `git add` again. That is why the same file can appear **twice** in `git status`: once under "Changes to be committed" (the photo) and once under "Changes not staged for commit" (the newer edits).',
      'Why two steps instead of one? Because a single afternoon of work usually mixes several unrelated changes. Staging lets you build **one focused commit at a time**: stage the bug fix and commit it, then stage the new feature and commit that, so each commit tells one story and can be undone on its own.',
      'Right after a commit, the draft equals the commit you just made, so `git status` says "nothing to commit". The staging area is never sent to GitHub; only commits are.',
    ],
    code: `$ git add styles.css        # photo of styles.css goes into the draft
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
    example: 'You fix a typo in the heading of `index.html` and, in the same session, start an experimental animation in `styles.css`. `git add index.html` then `git commit -m "Fix typo in main heading"` records only the fix. The animation stays modified in the working directory, out of history, until it works.',
    mistake: 'Thinking that once a file has been added it is "in Git" with whatever content it has later. `git add` stages the content **at that moment**; edits made afterwards need another `git add`, or the commit silently contains the older version. Also, `git add` does not move the file anywhere: it copies its content, and the file stays on your disk.' },

  { id: 'commits', hub: 'model', topic: 'model', title: 'Commits: snapshot, hash, message',
    summary: 'A commit is a saved snapshot of the whole project at one moment, identified by a unique **hash** and stored with an author, a date, a message and a link to its parent commit(s).',
    body: [
      'Mental model: a commit is a **complete photo of every tracked file**, not a list of edits (Git reuses unchanged files internally, so photos are cheap). Each commit points back to the commit before it, its **parent**, so the commits form a chain: that chain **is** the history. Comparing a commit with its parent is how Git shows what changed.',
      'The **hash** is a 40-character hexadecimal identifier (for example `3f9c2a1e…`) computed from the commit\'s content, metadata and parent. Change anything, even one letter of a message, and the hash changes, so history cannot be altered silently. In practice you use the first 7 characters (`3f9c2a1`), which are unique within a project. On GitHub every commit has its own page at `https://github.com/<user>/<repo>/commit/<hash>`; that is the link to paste when a brief asks you to "link the fix commit".',
      'The **message** is written for the person who reads the history later, often you. Convention: a short summary line (about 50 characters) in the imperative mood, as if completing "If applied, this commit will…": "Add search filter to /books", "Fix 404 on missing id". If the reason is not obvious, leave a blank line and explain **why** in a body. One commit = one logical change.',
    ],
    table: {
      caption: 'Commit messages',
      head: ['Weak', 'Better', 'Why'],
      rows: [
        ['`update`', '`Add footer with contact links`', 'Says what the commit does'],
        ['`fix`', '`Fix 400 response when title is empty`', 'Says which bug, so it can be found later'],
        ['`final version!!`', '`Validate year as an integer in PATCH`', 'Nothing is ever final; describe the change'],
        ['`stuff from today`', 'Two commits: `Add /stats route`, `Style the book list`', 'One logical change per commit'],
      ],
    },
    code: `$ git log
commit 3f9c2a1e8b7d4c6a5f0e1d2c3b4a59687f1e2d3c (HEAD -> main, origin/main)
Author: Ana Ruiz <ana.ruiz@example.com>
Date:   Mon Oct 5 10:12:44 2026 +0200

    Add contact form to index.html`,
    dialect: 'shell',
    example: 'A reviewer, a teammate or you three months later asks: "which commit fixed the bug where PATCH wiped other fields?" A history like `a1b2c3d Add Book store module`, `e4f5a6b Validate title and year`, `c7d8e9f Fix PATCH overwriting untouched fields` lets you find and link that fix in seconds; a history of 40 commits called "changes" does not.',
    mistake: 'Saving all work in one huge commit at the end ("final"). You lose the ability to undo one change without the others, your partner cannot review it, and the history no longer shows who did what or why. Commit small and often: each time one thing works.' },

  /* ---- 3. Setup ----------------------------------------------------------------------- */
  { id: 'install-config', hub: 'setup', topic: 'setup', title: 'Install and configure Git',
    summary: 'Install Git once per computer, then tell it who you are (the name and email stamped on every commit), to call the first branch `main`, and which editor to open when it needs a message.',
    body: [
      'Mental model: `git config --global` writes to one settings file in your user profile (`~/.gitconfig`) that **every repository on that computer** reads. A single repository can override a setting by running `git config` without `--global` inside it (stored in its own `.git/config`). You set the global values once per computer, not once per project.',
      'Install: on **Windows**, `winget install Git.Git` or the installer from git-scm.com, which also brings **Git Bash** (a Unix-style terminal) and **Git Credential Manager** (which handles the GitHub sign-in). On **macOS**, `xcode-select --install` installs Git with Apple\'s command-line tools, or `brew install git` if you already use the Homebrew package manager. On **Linux**, `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora). Check with `git --version`; if the command is "not recognized", open a new terminal.',
      'The **default branch name**: Git historically named the first branch `master`; GitHub, and most teams, now use `main` (GitHub\'s default for new repositories since 2020). Setting `init.defaultBranch main` makes `git init` agree with GitHub, so you never have one `master` and one `main` in the same project. Older tutorials still say `master`: read it as `main`.',
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
    example: 'Ana sets her name and the email of her GitHub account on her laptop. Every commit she makes in the team project shows "Ana Ruiz" with her avatar on GitHub, so anyone reading the history can see the work of both partners. Her partner forgot the email step on a shared computer: his commits appear on GitHub as an unlinked author, with no profile picture.',
    mistake: 'Skipping the configuration. Git then refuses to commit with "Please tell me who you are", or (on some systems) guesses an identity like `ana@LAPTOP-7Q2.local` that GitHub cannot link to your account. A second classic: without `core.editor`, a merge opens **Vim** and you cannot get out. In Vim, type `:wq` and press Enter to save and quit.' },

  { id: 'authentication', hub: 'setup', topic: 'setup', title: 'Signing in to GitHub from Git',
    summary: 'GitHub does not accept your account password for Git commands; you prove who you are with a browser sign-in through a credential helper, a personal access token, the GitHub CLI or an SSH key.',
    body: [
      'Mental model: your password opens the **website**. For Git commands from a terminal, GitHub wants a separate **key** that can be limited, given an expiry date and cancelled without changing your password. GitHub stopped accepting account passwords for Git operations in August 2021; typing your password at the prompt fails.',
      'For most beginners the easiest options are the first two in the table. Sign-in happens on your **first push** (or first clone of a private repository); the credential is then stored by the operating system, so you are not asked again.',
    ],
    table: {
      caption: 'Ways to authenticate',
      head: ['Option', 'How', 'Notes'],
      rows: [
        ['Git Credential Manager (HTTPS)', 'Included with Git for Windows. On the first push a browser window opens; sign in to GitHub and approve', 'Nothing to configure on Windows'],
        ['GitHub CLI (HTTPS)', 'Install `gh`, run `gh auth login`, choose HTTPS and "Login with a web browser"', 'Works on Windows, macOS and Linux; also configures Git'],
        ['Personal access token (HTTPS)', 'github.com → Settings → Developer settings → Personal access tokens → generate one; paste it when Git asks for a password', 'Treat it like a password; it expires; never commit it'],
        ['SSH key', '`ssh-keygen -t ed25519 -C "you@example.com"`, add the **public** key (`~/.ssh/id_ed25519.pub`) in Settings → SSH and GPG keys; use the SSH URL `git@github.com:user/repo.git`', 'No prompts afterwards; the private key never leaves your computer'],
      ],
    },
    code: `$ git push
Username for 'https://github.com': ana-ruiz
Password for 'https://ana-ruiz@github.com':      # account password typed here
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed for 'https://github.com/ana-ruiz/portfolio.git/'

$ gh auth login      # fix: sign in once through the browser, then push again
$ git push`,
    dialect: 'shell',
    example: 'On a Windows laptop with Git for Windows, Ana\'s first `git push` opens the browser, she clicks "Authorize", and the push completes. On a shared Linux machine the same push asks for a username and password, so she runs `gh auth login` once instead.',
    mistake: 'Pasting a token into a script, a README or a `.env` that gets committed. A token in a public repository is a leaked key: anyone can push to your repositories with it. If it happens, delete the token on GitHub immediately and generate a new one.' },

  { id: 'init-vs-clone', hub: 'setup', topic: 'setup', title: 'git init vs git clone',
    summary: '`git init` turns a local folder into a new, empty repository with no history and no remote; `git clone <url>` downloads an existing repository, with all its files and history, and links it to its source under the name `origin`.',
    body: [
      'Mental model: `git init` starts a **new, blank notebook**. `git clone` makes a **photocopy of an existing notebook**, every past page included, with the address of the original written on the cover, so you know where to send new pages.',
      'After `git init` there are no commits and no remote: to publish, you create an **empty** repository on GitHub (no README, no .gitignore, no licence), link it with `git remote add origin <url>` and push with `git push -u origin main`. After `git clone`, the remote `origin` already exists and `main` already follows `origin/main`, so a plain `git push` or `git pull` works.',
      'A simple rule for new projects: **create the repository on GitHub first, then clone it**. Use `git init` only when a folder already has work and no GitHub repository exists yet.',
    ],
    table: {
      caption: 'Which one?',
      head: ['', '`git init`', '`git clone <url>`'],
      rows: [
        ['Starts from', 'A local folder', 'A repository that already exists (usually on GitHub)'],
        ['History', 'Empty', 'Complete copy'],
        ['Remote', 'None: add with `git remote add origin <url>`', '`origin` set up automatically'],
        ['First push', '`git push -u origin main`', '`git push`'],
        ['Run it', 'Inside the project folder', 'In the parent folder: it creates the project folder'],
      ],
    },
    code: `# Path A (recommended): repository created on GitHub first
git clone https://github.com/ana-ruiz/books-api.git
cd books-api

# Path B: existing local folder, EMPTY repository created on GitHub
cd my-project
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ana-ruiz/my-project.git
git push -u origin main`,
    dialect: 'shell',
    example: 'For a team project, one partner creates `books-api` on GitHub with a README and adds the other as a collaborator; then **both** run `git clone` on their own laptops. Both local repositories share the same first commit, so their work can later be pushed, pulled and merged.',
    mistake: 'Doing both: creating the GitHub repository **with** a README and also running `git init` and committing locally. The two repositories now have unrelated first commits, `git push` is rejected and `git pull` stops with "refusing to merge unrelated histories". Start again by cloning, and copy your files into the clone.' },

  /* ---- 4. Everyday commands --------------------------------------------------------- */
  { id: 'status-add-commit', hub: 'daily', topic: 'daily', title: 'The daily loop: status, add, commit',
    summary: 'The everyday loop is: edit files, `git status`, `git add` the changes that belong together, `git commit -m "message"`, and repeat; `git status` tells you at every step which area each file is in.',
    body: [
      'Mental model: `git status` is your **dashboard**. Read it before and after every other command while you learn; it lists staged changes ("Changes to be committed"), modified but unstaged files ("Changes not staged for commit") and new files ("Untracked files"), and even prints the command that undoes each state.',
      '`git add <file>` stages one file; you can list several (`git add index.html about.html`). `git add .` stages **every** change in the current folder and all its subfolders: modified files, **new files** and deletions. `git commit -m "message"` records the staged changes as a new commit; without `-m`, Git opens your editor to ask for the message.',
      'A commit records only what is staged. If nothing is staged, `git commit` answers "nothing added to commit" and creates nothing.',
    ],
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
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean`,
    dialect: 'shell',
    example: 'Read the last `git status` above: "ahead of \'origin/main\' by 1 commit" means the commit exists only on your laptop. The loop is finished for GitHub only after `git push`.',
    mistake: 'Running `git add .` without looking. It happily stages `node_modules/` (thousands of files) and `.env` (your secrets) if no `.gitignore` excludes them. Always run `git status` after `git add .` and before `git commit`, and read the list.' },

  { id: 'log-diff', hub: 'daily', topic: 'daily', title: 'Inspecting: git log and git diff',
    summary: '`git log` lists the commits of the current branch, newest first; `git diff` shows line by line what you changed but have not staged, and `git diff --staged` shows what the next commit will contain.',
    body: [
      'Mental model: `git diff` **compares two areas**. Plain `git diff` compares the working directory with the staging area (edits not yet added). `git diff --staged` compares the staging area with the last commit (what `git commit` would record now). `git log` is the history book: one entry per commit, with hash, author, date and message.',
      'Reading a diff: lines starting with `-` were removed, lines starting with `+` were added, lines starting with a space are unchanged context. The `@@ -6,7 +6,7 @@` header means "7 lines starting at line 6, before and after".',
      'Useful forms: `git log --oneline` (one line per commit: short hash and message) and `git log --oneline --graph --all` (all branches drawn as a graph). Long output opens in a pager: use the arrow keys to scroll and press `q` to quit.',
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
4b1e9d2 (HEAD -> main) Add about page and link it from the home page
3f9c2a1 (origin/main) Add contact form to index.html
a07e5c8 Initial commit`,
    dialect: 'shell',
    example: 'Before committing, run `git diff --staged` and read it as your partner would: if you see a `console.log("here")` you forgot to remove, take it out now. The `--oneline` log above also shows, through the labels, that `main` is one commit ahead of `origin/main`.',
    mistake: 'Running `git diff` right after `git add` and seeing nothing, then concluding the changes are lost. They are safe in the staging area; plain `git diff` only shows **unstaged** edits. Use `git diff --staged` to see them.' },

  { id: 'gitignore', hub: 'daily', topic: 'daily', title: '.gitignore: what never goes into Git',
    summary: 'A `.gitignore` file in the repository root lists file patterns Git must not track, such as `node_modules/` (re-created by `npm install`) and `.env` (secrets).',
    body: [
      'Mental model: `.gitignore` is a **doorman at the staging area** for new files. An untracked file that matches a pattern is hidden from `git status` and skipped by `git add .`. The doorman only stops files that are not tracked yet: a file that was already committed stays tracked until you remove it from the index with `git rm --cached <file>`.',
      'Ignore what is **generated or re-installable** (`node_modules/`, `dist/`, `coverage/`), what is **secret** (`.env`) and what is **personal clutter** (`.DS_Store`, `Thumbs.db`). Commit what someone needs to rebuild the project: `package.json`, `package-lock.json`, and a `.env.example` with the variable names and **fake** values.',
      'The `.gitignore` file itself is committed, so the whole team shares the same rules. Create it **before the first `git add .`**.',
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
    example: 'An API reads `DATABASE_URL` and `JWT_SECRET` from `.env`, ships a `.env.example`, and must run "from a clean clone": a reviewer or a new teammate clones it, runs `npm install` (which rebuilds `node_modules/`) and copies `.env.example` to `.env`. A committed `.env` with a real secret is a leak: anyone who can read the repository (or its history) has the key. The `.gitignore` above covers all of that.',
    mistake: 'Adding `.env` to `.gitignore` **after** it was committed and pushed. Git keeps tracking it, and the secret stays readable in the history on GitHub. Fix: `git rm --cached .env`, commit, push, and **change the secret** (new password or key), because the old value is public for ever in the history.' },

  /* ---- 5. Remotes --------------------------------------------------------------------- */
  { id: 'remotes-push', hub: 'remote', topic: 'remote', title: 'Remotes, origin and git push',
    summary: 'A **remote** is a named link to another copy of the repository, usually on GitHub (`origin` is the name `git clone` gives it); `git push` uploads the commits of your current branch that the remote does not have yet.',
    body: [
      'Mental model: a remote is a **contact in your phone book**: a short name (`origin`) and an address (the URL). Git never syncs on its own; you exchange commits explicitly. Your repository also keeps **remote-tracking branches** such as `origin/main`: your last known picture of the remote\'s `main`, updated only when you fetch, pull or push.',
      '`git push` sends **commits** only: not unsaved files, not unstaged edits, not the staging area. The first push of a new branch needs `git push -u origin <branch>`: it creates the branch on GitHub and, with `-u` (upstream), remembers the link so later `git push` and `git pull` need no arguments.',
      'Push is **rejected** if the remote branch has commits you do not have (your partner pushed first). Git refuses to overwrite their work: run `git pull`, resolve any conflict, then push again. Never "solve" a rejection with `git push --force` on a shared branch; it deletes the commits you did not have.',
    ],
    code: `$ git remote -v
origin  https://github.com/ana-ruiz/books-api.git (fetch)
origin  https://github.com/ana-ruiz/books-api.git (push)

$ git push -u origin main       # first push of main
$ git push                      # later pushes

# when your partner pushed first:
$ git push
To https://github.com/ana-ruiz/books-api.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/ana-ruiz/books-api.git'
$ git pull                      # integrate their commits, then
$ git push`,
    dialect: 'shell',
    example: 'Reviewers, teammates and deployment tools read the default branch **on GitHub**, not your laptop. After the final `git push`, open the repository page on github.com and check that the latest commit message and time are yours.',
    mistake: 'Trusting "Your branch is up to date with \'origin/main\'" as live news. It compares with `origin/main` **as of your last fetch or pull**; your partner may have pushed five minutes ago. Run `git fetch` (or `git pull`) first if you need the current truth.' },

  { id: 'fetch-pull', hub: 'remote', topic: 'remote', title: 'git fetch vs git pull',
    summary: '`git fetch` downloads new commits from the remote into `origin/<branch>` without touching your files or your branch; `git pull` is `git fetch` followed by integrating those commits into your current branch (by default with a merge).',
    body: [
      'Mental model: `git fetch` **collects the post and leaves it unopened on the table**: you can look at it (`git log origin/main`) and nothing on your desk changes. `git pull` collects the post **and files it into your binder**: your branch and your files are updated.',
      'If you made no new commits, `pull` simply moves your branch forward (a fast-forward). If both you and the remote have new commits, the histories have **diverged** and pull must combine them, usually with a merge commit, which may produce a conflict. Recent Git versions stop the first time this happens with "Need to specify how to reconcile divergent branches"; tell Git once to merge, which is what this course uses: `git config --global pull.rebase false`.',
      'Habit for pair work: **pull before you start** working and **pull before you push**.',
    ],
    table: {
      caption: 'fetch vs pull',
      head: ['', '`git fetch`', '`git pull`'],
      rows: [
        ['Downloads new commits', 'Yes', 'Yes'],
        ['Updates `origin/main`', 'Yes', 'Yes'],
        ['Changes your branch and files', 'No', 'Yes (merge, or fast-forward)'],
        ['Can cause a conflict', 'Never', 'Yes, if both sides changed the same lines'],
      ],
    },
    code: `# once per computer: make pull merge when histories diverge
git config --global pull.rebase false

git fetch                   # see what arrived without changing anything
git log --oneline main..origin/main   # commits on GitHub you do not have yet
git pull                    # bring them into your branch`,
    dialect: 'shell',
    example: 'Monday morning: your partner pushed the validation module during the weekend. `git pull` brings their three commits into your `main` (a fast-forward, because you had not committed anything since). Only then do you start your own work.',
    mistake: 'Pulling with uncommitted edits to the same files the incoming commits change. Git refuses with "Your local changes to the following files would be overwritten by merge". Commit your work (or discard it with `git restore`) and pull again.' },

  /* ---- 6. Branches and merging ------------------------------------------------------ */
  { id: 'branches', hub: 'branch', topic: 'branch', title: 'Branches and HEAD',
    summary: 'A branch is a **movable label that points to one commit**; when you commit on a branch, its label moves forward to the new commit. `HEAD` marks the branch you are currently on.',
    body: [
      'Mental model: a branch is a **sticky note** on a commit, not a copy of your folder. Creating one writes a tiny file containing a commit hash, which is why it is instant. `HEAD` is the "you are here" marker: it points to the current branch, and the next commit is added after that branch\'s commit and moves that label, and only that label, forward.',
      'Why branch? To work on one feature or experiment **without disturbing `main`**, which stays in a working state. In a pair, each partner works on their own branch, so half-finished code never breaks the other person\'s work.',
      '**Switching** branches (`git switch <name>`) changes the files in your working directory to match that branch\'s latest commit. Git 2.23 (2019) introduced `git switch` and `git restore` to split the old, overloaded `git checkout`; many tutorials still use `git checkout <name>` and `git checkout -b <name>`, which do the same thing.',
    ],
    table: {
      caption: 'Branch commands',
      head: ['Command', 'What it does'],
      rows: [
        ['`git branch`', 'Lists local branches; `*` marks the current one'],
        ['`git branch add-footer`', 'Creates the label at the current commit; you **stay** on your branch'],
        ['`git switch add-footer`', 'Moves `HEAD` to that branch and updates your files (older: `git checkout add-footer`)'],
        ['`git switch -c add-footer`', 'Creates **and** switches in one step (older: `git checkout -b add-footer`)'],
        ['`git branch -d add-footer`', 'Deletes a branch that is already merged (the commits remain)'],
      ],
    },
    code: `$ git switch -c add-footer
Switched to a new branch 'add-footer'
$ git branch
* add-footer
  main
$ # ...edit index.html and save...
$ git commit -am "Add footer"     # -a stages already-tracked modified files
$ git log --oneline --graph --all
* 8e4d7b2 (HEAD -> add-footer) Add footer
* 3f9c2a1 (origin/main, main) Add contact form to index.html`,
    dialect: 'shell',
    example: 'Before the commit above, `main` and `add-footer` both pointed at `3f9c2a1`. After it, only `add-footer` moved to `8e4d7b2`; `main` still points at `3f9c2a1`, so switching back to `main` shows the page without the footer.',
    mistake: 'Creating a branch with `git branch add-footer` and then committing without switching: the commits land on `main`, because `HEAD` never moved. Check the `*` in `git branch` (or the first line of `git status`, "On branch …") before you commit. Also: commit before switching; uncommitted edits travel with you to the other branch, or Git refuses to switch if they would be overwritten.',
    widget: 'git-sim',
    practice: { href: '#/vcs/repositories/practice/git-sim', label: 'Open the commit and branch simulator' } },

  { id: 'merge', hub: 'branch', topic: 'branch', title: 'Merging: fast-forward vs merge commit',
    summary: '`git merge <branch>` brings the commits of `<branch>` into the branch you are on; if your branch has not moved since the other one started, Git just slides your label forward (**fast-forward**), otherwise it creates a **merge commit** with two parents.',
    body: [
      'Mental model: you **stand on the branch that receives** the work and name the branch that gives it: `git switch main`, then `git merge add-footer`. The giving branch is not changed.',
      '**Fast-forward**: `main` has no commits that `add-footer` lacks, so the history is a straight line and Git just moves the `main` label up to the tip of `add-footer`. No new commit is created. **Merge commit** (three-way merge): both branches gained commits since they split. Git compares both tips with their **common ancestor** (the last commit they share), combines the changes, and records a new commit with **two parents**. Git opens your editor for its message; the default "Merge branch \'add-footer\'" is fine.',
      'After merging, delete the branch label with `git branch -d add-footer`: the commits stay in `main`\'s history.',
    ],
    code: `$ git switch main
$ git merge add-footer          # main had not moved: fast-forward
Updating 3f9c2a1..8e4d7b2
Fast-forward
 index.html | 6 ++++++
 1 file changed, 6 insertions(+)

$ git merge add-search          # main had moved too: merge commit
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
    body: [
      'Mental model: a conflict is **a question, not an error**. Git combines changes in different places on its own; when two people rewrote the same line, it cannot know which version is right, so it asks a person. Nothing is lost: both versions are in the file.',
      'The markers: `<<<<<<< HEAD` starts **your** version (the branch you are on); `=======` separates; `>>>>>>> add-footer` ends **their** version (the branch being merged, or the remote commits during a `git pull`). In VS Code, "Current" means HEAD and "Incoming" means the other branch.',
      'To resolve: (1) `git status` lists the files under "Unmerged paths" as "both modified"; (2) edit each file so it contains the final code, keeping yours, theirs, both or a new version, and **delete all three marker lines**; (3) `git add <file>` to mark it resolved; (4) `git commit` (the message is pre-filled). To give up and return to the state before the merge: `git merge --abort`.',
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
$ git commit                      # accept the pre-filled "Merge branch 'add-title'"`,
    dialect: 'shell',
    example: 'In a team API project both partners edit the endpoint table in `README.md`. Luis pushes first; Ana\'s `git pull` stops with a conflict in `README.md`. She keeps both new rows, deletes the markers, runs `git add README.md` and `git commit`, then `git push`. Total: two minutes.',
    mistake: 'Committing with the markers still in the file. The page then shows `<<<<<<< HEAD`, or JavaScript fails with a syntax error. Before `git add`, search the file for `<<<<<<<`. The other panic reaction, deleting the folder and cloning again, throws away your un-pushed commits.' },

  /* ---- 7. Working in a team ----------------------------------------------------------- */
  { id: 'github-flow', hub: 'collab', topic: 'collab', title: 'GitHub flow and pull requests',
    summary: 'GitHub flow is a team workflow: create a branch for each change, push it, open a **pull request** (PR) on GitHub, get it reviewed, merge it into `main`, and everyone pulls the updated `main`.',
    body: [
      'Mental model: `main` is **always working and deliverable**. Every change travels on its own short-lived branch and enters `main` through a **pull request**: a page on GitHub that says "please merge my branch into main", shows the diff and holds the review conversation. Reviewing is how your partner learns your code, so **either of you can explain and maintain any part of the project**.',
      'Before any of this, both partners need push access: the owner opens the repository on GitHub, **Settings → Collaborators → Add people**, and the partner accepts the e-mailed invitation. A **fork** is different: a copy of someone else\'s repository under **your** account, used when you cannot push to the original. A branch lives **inside** the same repository.',
    ],
    points: [
      '1. `git switch main` and `git pull` (start from the latest `main`).',
      '2. `git switch -c validate-form` (one branch per change, named after it).',
      '3. Edit, `git add`, `git commit`: small commits.',
      '4. `git push -u origin validate-form`.',
      '5. On GitHub: **Compare & pull request**, describe what and why, request your partner as reviewer.',
      '6. The reviewer reads the diff, comments or approves; you push fixes to the same branch and the PR updates itself.',
      '7. **Merge pull request** on GitHub, then locally `git switch main`, `git pull`, `git branch -d validate-form`.',
    ],
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
    example: 'A project reaches a first finished version and you want to start the next phase while keeping that version reachable. The simplest way is a branch label on its last commit: `git branch v1-final` then `git push origin v1-final`, and keep working on `main` through pull requests. The README then says: "The first version is on the `v1-final` branch".',
    mistake: 'Long-lived branches: two weeks of work on one branch without pulling `main` produces one enormous PR with dozens of conflicts. Keep each PR to one change and merge it within a day or two. And never keep committing on a branch whose PR was already merged; start a new branch from the updated `main`.' },

  /* ---- 8. Undoing safely ------------------------------------------------------------- */
  { id: 'undo-changes', hub: 'undo', topic: 'undo', title: 'Undo before committing: git restore',
    summary: '`git restore --staged <file>` takes a file out of the staging area but keeps your edits; `git restore <file>` throws away uncommitted edits in the working directory, returning the file to its staged (or last committed) version.',
    body: [
      'Mental model: ask **which area you want to reset, and from where**. `git restore --staged` copies the last commit\'s version back into the **staging area** (unstage; your file is untouched). `git restore` copies the staging area\'s version back onto your **desk** (discard edits). Both are what `git status` itself suggests in its hints.',
      'Unstaging is always safe. **Discarding is permanent**: those edits were never committed, so Git has no copy of them and cannot bring them back. Older tutorials use `git reset HEAD <file>` (unstage) and `git checkout -- <file>` (discard) for the same two jobs.',
    ],
    table: {
      caption: 'Pick the right undo',
      head: ['Situation', 'Command', 'Safe?'],
      rows: [
        ['Staged a file by mistake (e.g. `.env`)', '`git restore --staged .env`', 'Yes: the file and its content stay'],
        ['Want to throw away an unstaged experiment', '`git restore styles.css`', 'No: the edits are lost for good'],
        ['Staged **and** want to discard', '`git restore --staged styles.css` then `git restore styles.css`', 'No: the edits are lost'],
        ['Deleted a tracked file by accident', '`git restore index.html`', 'Yes: it comes back from Git'],
      ],
    },
    code: `$ git add .
$ git status
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   .env
        modified:   index.html

$ git restore --staged .env     # .env back to untracked; the file is untouched
$ git commit -m "Show book count in header"

$ git restore styles.css        # DISCARD the unstaged edits to styles.css`,
    dialect: 'shell',
    example: 'You ran `git add .` and `git status` shows `new file: .env`. Before committing, `git restore --staged .env` takes it out; then add `.env` to `.gitignore` so it never happens again. Nothing has left your laptop, so nothing leaked.',
    mistake: 'Typing `git restore styles.css` when you meant `git restore --staged styles.css`. The first one erases a morning of uncommitted work with no way back. When unsure, commit first (on a branch if it is experimental): committed work can always be recovered.' },

  { id: 'revert-reset', hub: 'undo', topic: 'undo', title: 'Undo after committing: revert, amend, reset',
    summary: 'To undo a commit that is already pushed, use `git revert <hash>`, which adds a new commit that cancels it; `git commit --amend` and `git reset` rewrite history, so use them only on commits that exist only on your laptop.',
    body: [
      'Mental model: an accountant never erases a ledger; a wrong entry is cancelled by a **new correcting entry**. That is `git revert`: history only grows, so your partner\'s copy stays compatible and a normal push works. `git reset` and `--amend` instead **tear pages out** (or replace the last page): fine in your private notebook, a disaster in a shared one.',
      'The rule: **pushed → revert. Not pushed yet → amend or reset are fine.** `HEAD~1` means "the parent of the current commit", one step back.',
    ],
    table: {
      caption: 'Undoing commits (intro level)',
      head: ['Command', 'What it does', 'Rewrites history?', 'OK after push?'],
      rows: [
        ['`git revert <hash>`', 'New commit with the opposite changes', 'No', 'Yes'],
        ['`git commit --amend`', 'Replaces the last commit (fix message, add a forgotten file)', 'Yes', 'No'],
        ['`git reset --soft HEAD~1`', 'Removes the last commit; its changes stay staged', 'Yes', 'No'],
        ['`git reset --hard <hash>`', 'Moves the branch back **and** discards all uncommitted work', 'Yes', 'No; avoid at this level'],
      ],
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
    example: 'Luis pushed a commit that deleted the contact form. Ana, who already pulled it, sees `git revert` arrive as an ordinary new commit "Revert …" on her next pull. Had Luis used `git reset` and `git push --force`, Ana\'s next push would resurrect the bad commit or fail, and work could be lost.',
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
  { type: 'mc', topic: 'setup',
    q: 'On a shared Linux computer, `git push` asks for a username and password. You type your GitHub account password. What happens?',
    choices: ['The push succeeds', 'The push fails: GitHub no longer accepts account passwords for Git; use a token, `gh auth login` or SSH', 'Git creates a new account', 'The push succeeds but the commits are anonymous'],
    answer: 1,
    why: 'Password authentication for Git operations was removed in 2021. Use a personal access token, the GitHub CLI, a credential manager or an SSH key.' },
  { type: 'tf', topic: 'setup',
    q: 'A setting made with `git config --global` applies to every repository of your user on that computer.',
    answer: true,
    why: '`--global` writes to `~/.gitconfig`. Without `--global`, the setting applies to the current repository only.' },
  { type: 'mc', topic: 'setup',
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
