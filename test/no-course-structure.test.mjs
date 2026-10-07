// Guard: the published site must not expose the internal course structure (session numbers,
// blocks, session-numbered labs, the practice schedule, grading). People outside the course use
// it too, and the course may change frameworks. The session ↔ card mapping lives only in
// internal files kept outside this repository.
// Scans every published text file (index.html, *.css, js/, data/; not vendor/), comments included,
// since published JavaScript is readable.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const RULES = [
  { name: 'session number', re: /\bsessions?\s*(?:\d|[–-]\s*\d)/i },
  { name: 'session field', re: /\bsession\s*:\s*['"]?\d/i },
  { name: 'block', re: /\bBlocks?\s+(?:I{1,3}|[1-3])\b|\bBlock\s+(?:one|two|three)\b/ },
  { name: 'practice', re: /\bpracti[cs]es?\s*[12]\b|\bpractise\d/i },
  { name: 'lab', re: /\b(?:the|this|your|each|a|first|second|next|previous|same) labs?\b|\blabs\b|\blab[ -](?:brief|session|starter|solution|sheet)s?\b|lab-sessions/i },
  { name: 'class', re: /\bin class\b|\bclassroom\b|\bin the course\b|\bthe course (?:labs?|practice|project|quiz)/i },
  { name: 'grading', re: /\bgrad(?:ed|ing|er)\b|\brubric\b/i },
  { name: 'solutions folder', re: /\bsolutions\// },
  { name: 'teaching context', re: /\b(?:my|your|the|a|our) (?:instructor|teacher|lecturer|professor)s?\b|\bthis course\b|\bthe slides\b|\b(?:at this|intro) level\b|\bstudent-sized\b/i },
  { name: 'lab project name', re: /\bDevNews\b/ },
];

/* Genuine, non-course uses: [file (relative to site/), rule name, regular expression on the line]. */
const ALLOW = [
  ['data/en/mongo.js', 'teaching context', /Prepare the slides/],          // a sample task title
  ['js/tools/mongo-engine.js', 'teaching context', /Prepare the slides/],
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const PUBLISHED = [
  join(ROOT, 'index.html'),
  ...readdirSync(ROOT).filter((f) => f.endsWith('.css')).map((f) => join(ROOT, f)),
  ...files(join(ROOT, 'js')),
  ...files(join(ROOT, 'data')),
].filter((f) => /\.(html|css|js)$/.test(f));

test('published files exist', () => {
  assert.ok(PUBLISHED.length > 20, `only ${PUBLISHED.length} files found`);
});

for (const file of PUBLISHED) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  test(`no course structure in ${rel}`, () => {
    const hits = [];
    readFileSync(file, 'utf8').split('\n').forEach((line, k) => {
      for (const rule of RULES) {
        const m = line.match(rule.re);
        if (!m) continue;
        if (ALLOW.some(([f, r, re]) => f === rel && r === rule.name && re.test(line))) continue;
        hits.push(`${rel}:${k + 1} [${rule.name}] "${m[0]}" in: ${line.trim().slice(0, 140)}`);
      }
    });
    assert.deepEqual(hits, [], `\n${hits.join('\n')}`);
  });
}
