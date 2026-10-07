// Every in-site link in the content ([text](#/route) in site/data/en/*.js, and `href: '#/…'`
// practice links) points at an existing section, card, quiz or tool page.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/* Sections: id, data prefix, base and tools, read from js/sections/sections.js without a browser. */
const src = read('../js/sections/sections.js');
const sections = [...src.matchAll(/\{ id: '([\w-]+)', prefix: '(\w+)', base: '([^']+)'[\s\S]*?tools: \[([^\]]*)\]/g)]
  .map(([, id, prefix, base, tools]) => ({ id, prefix, base, tools: [...tools.matchAll(/'([\w-]+)'/g)].map((m) => m[1]) }));

const ctx = { DATA: { en: {} } };
ctx.window = ctx;
vm.createContext(ctx);
const DATA = new URL('../data/en/', import.meta.url);
const files = readdirSync(DATA).filter((n) => n.endsWith('.js'));
for (const f of files) vm.runInContext(readFileSync(new URL(f, DATA), 'utf8'), ctx, { filename: f });

function valid(href) {
  const s = sections.find((x) => href === x.base || href.startsWith(`${x.base}/`));
  if (!s) return false;
  const rest = href.slice(s.base.length + 1);
  if (!rest || rest === 'summary' || rest === 'quiz' || rest.startsWith('quiz/')) return true;
  if (rest.startsWith('practice')) { const tool = rest.split('/')[1]; return !tool || s.tools.includes(tool); }
  return (ctx.DATA.en[`${s.prefix}_CONCEPTS`] || []).some((c) => c.id === rest);
}

test('sections were found', () => assert.ok(sections.length >= 12));

for (const f of files) {
  test(`links in data/en/${f} resolve`, () => {
    const text = readFileSync(new URL(f, DATA), 'utf8');
    // Links inside authored `html` blocks (not the demo pages of "Try it" boxes).
    const one = { DATA: { en: {} } };
    vm.runInNewContext(text, one, { filename: f });
    const html = Object.entries(one.DATA.en).filter(([k]) => k.endsWith('_CONCEPTS'))
      .flatMap(([, list]) => list.flatMap((c) => c.html || [])).join(' ');
    const hrefs = [...text.matchAll(/\]\((#\/[^)\s]*)\)/g), ...text.matchAll(/href: ['"](#\/[^'"]*)['"]/g), ...html.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
    const bad = hrefs.filter((h) => !valid(h));
    assert.deepEqual(bad, []);
  });
}
