// Words per concept card of one section, to compare a redesign before and after.
// Counts the summary, body, points, html, example, mistake, table cells and diagram labels.
//
//   node site/tools/card-words.mjs <file> [--save before.json] [--compare before.json]
//   node site/tools/card-words.mjs git --save scratch/git-before.json
//
// <file> is the data file name without .js (git, dom, js-basics, web-overview…).
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const [file, ...args] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node site/tools/card-words.mjs <file> [--save out.json] [--compare before.json]');
  process.exit(2);
}
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : '');

const ctx = { DATA: { en: {} } };
vm.runInNewContext(readFileSync(new URL(`../data/en/${file}.js`, import.meta.url), 'utf8'), ctx);
const key = Object.keys(ctx.DATA.en).find((k) => k.endsWith('_CONCEPTS'));
const strip = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\*\*|`/g, '');
const count = (s) => strip(s).split(/\s+/).filter(Boolean).length;
const cells = (c) => [c.table, ...(c.tables || [])].filter(Boolean).flatMap((t) => [t.caption || '', ...t.head, ...t.rows.flat()]);
const labels = (d) => (d ? [d.title, ...d.nodes.flatMap((n) => [n.label, n.note || '']), ...(d.edges || []).map((e) => e[2] || '')] : []);

const words = {};
for (const c of ctx.DATA.en[key]) {
  const parts = [c.summary, ...(c.body || []), ...(c.points || []), ...(c.html || []), c.example, c.mistake, ...cells(c), ...labels(c.diagram)];
  words[c.id] = parts.filter(Boolean).reduce((a, p) => a + count(p), 0);
}

const before = opt('--compare') ? JSON.parse(readFileSync(opt('--compare'), 'utf8')) : null;
let total = 0;
let totalBefore = 0;
for (const [id, w] of Object.entries(words)) {
  total += w;
  const b = before && before[id];
  if (b) totalBefore += b;
  const delta = b ? `${Math.round(((w - b) / b) * 100)}%` : before ? 'new' : '';
  console.log(`${id.padEnd(24)} ${String(b ?? '').padStart(5)} ${before ? '->' : ''} ${String(w).padStart(5)} ${delta}`);
}
console.log(before ? `existing cards: ${totalBefore} -> ${Object.keys(words).filter((id) => before[id]).reduce((a, id) => a + words[id], 0)}; all: ${total}` : `total: ${total}`);
if (opt('--save')) writeFileSync(opt('--save'), JSON.stringify(words, null, 1));
