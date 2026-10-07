// Replace one concept card in a data file with a card written in another file, or insert a
// new card after an existing one. The card file holds exactly the card object, as it should
// appear in the array (starting `  { id: '…'` and ending `},`).
//
//   node site/tools/card-splice.mjs <file> replace <card-id> <card.js>
//   node site/tools/card-splice.mjs <file> insert-after <card-id> <card.js>
//   node site/tools/card-splice.mjs git replace three-areas scratch/three-areas.js
//
// <file> is the data file name without .js. A card runs from its line "  { id: '<id>'" to
// just before the next card, the next group comment ("  /* ----") or the closing "];".
// The file is checked by loading it afterwards; nothing is written if it does not load.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const [file, mode, id, cardPath] = process.argv.slice(2);
if (!file || !['replace', 'insert-after'].includes(mode) || !id || !cardPath) {
  console.error('Usage: node site/tools/card-splice.mjs <file> replace|insert-after <card-id> <card.js>');
  process.exit(2);
}
const url = new URL(`../data/en/${file}.js`, import.meta.url);
const src = readFileSync(url, 'utf8');
const card = readFileSync(cardPath, 'utf8').replace(/\s+$/, '');

const start = src.indexOf(`\n  { id: '${id}'`) + 1;
if (start <= 0) {
  console.error(`card ${id} not found in ${file}.js`);
  process.exit(1);
}
const rest = /\n(?:  \{ id: '|  \/\* ----|\];)/g;
rest.lastIndex = start + 1;
const end = rest.exec(src).index + 1;
const segment = src.slice(start, end);
const body = segment.replace(/\s+$/, '');
const trail = segment.slice(body.length);

const out = mode === 'replace'
  ? src.slice(0, start) + card + trail + src.slice(end)
  : src.slice(0, start) + body + '\n\n' + card + trail + src.slice(end);

try {
  vm.runInNewContext(out, { DATA: { en: {} } });
} catch (e) {
  console.error(`not written: ${file}.js would not load: ${e.message}`);
  process.exit(1);
}
writeFileSync(url, out);
console.log(`${mode} ${id}: ${segment.length} -> ${mode === 'replace' ? card.length : segment.length + card.length} chars`);
