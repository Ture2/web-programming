// Redesigned cards (those with `html`) never point by position ("the next card", "the box
// below"): cards move when a section is reordered, and the order of blocks inside a card
// changes with the layout. Name the card and link it instead.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const DATA = new URL('../data/en/', import.meta.url);
const POSITIONAL = /\b(?:next|previous|last|following) card\b|\bcard (?:above|below)\b|\b(?:box|tool|simulator|visuali[sz]er|diagram|table|code) (?:above|below)\b|\b(?:above|below) (?:this|the) (?:card|box)\b/i;

for (const f of readdirSync(DATA).filter((n) => n.endsWith('.js'))) {
  test(`no positional references in redesigned cards of data/en/${f}`, () => {
    const ctx = { DATA: { en: {} } };
    vm.runInNewContext(readFileSync(new URL(f, DATA), 'utf8'), ctx, { filename: f });
    const hits = [];
    Object.entries(ctx.DATA.en).filter(([k]) => k.endsWith('_CONCEPTS')).forEach(([, cards]) => {
      cards.filter((c) => c.html).forEach((c) => {
        [c.summary, ...c.html, c.example, c.mistake].filter(Boolean).forEach((text) => {
          const m = String(text).match(POSITIONAL);
          if (m) hits.push(`${c.id}: "${m[0]}"`);
        });
      });
    });
    assert.deepEqual([...hits], []);
  });
}
