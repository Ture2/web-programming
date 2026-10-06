'use strict';

/* ==========================================================================
   Specificity of CSS selectors (Selectors Level 4), with no DOM: used by the
   specificity and selector-tester tools and by test/specificity.test.mjs.

     specificity('nav a.active')  → [0, 1, 2]   (a = ids, b = classes/attributes/
                                                 pseudo-classes, c = types/pseudo-elements)
                                   For a selector list: the highest item.
     list('h1, .title')           → [{ selector: 'h1', spec: [0,0,1] }, { selector: '.title', spec: [0,1,0] }]
     compare(x, y)                → > 0 when x is more specific, < 0 when less, 0 when equal
     explain('a:not(.x)')         → [{ text, kind, spec }] one part per simple selector / combinator
     format([0,1,2])              → '(0, 1, 2)'

   Rules: :is() / :not() / :has() take the specificity of their most specific
   argument; :where() counts zero; :nth-child(An+B of S) / :nth-last-child() count
   one pseudo-class plus the most specific S; legacy one-colon pseudo-elements
   (:before, :after, :first-line, :first-letter) count as pseudo-elements; the
   universal selector, combinators and namespaces count zero.
   ========================================================================== */

const SpecificityEngine = (() => {
  const LEGACY_ELEMENTS = ['before', 'after', 'first-line', 'first-letter'];
  const MAX_OF_ARGS = ['is', 'not', 'has', 'matches', '-webkit-any', '-moz-any'];
  const ZERO = () => [0, 0, 0];
  const add = (x, y) => [x[0] + y[0], x[1] + y[1], x[2] + y[2]];
  const compare = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);
  const format = (s) => `(${s[0]}, ${s[1]}, ${s[2]})`;

  /* Splits on top-level commas (outside parentheses, brackets and quotes). */
  function splitList(sel) {
    const out = [];
    let depth = 0;
    let quote = null;
    let start = 0;
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '\\') i++;
      else if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) { out.push(sel.slice(start, i)); start = i + 1; }
    }
    out.push(sel.slice(start));
    return out.map((s) => s.trim()).filter(Boolean);
  }

  const isIdent = (ch) => /[A-Za-z0-9_\- -￿]/.test(ch);

  /* Reads an identifier (with escapes) starting at i; returns the end index. */
  function readIdent(s, i) {
    let j = i;
    while (j < s.length) {
      if (s[j] === '\\') j += 2;
      else if (isIdent(s[j])) j++;
      else break;
    }
    return j;
  }

  /* Index just after the parenthesis/bracket group that opens at i. */
  function readGroup(s, i, open, close) {
    let depth = 0;
    let quote = null;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      if (quote) {
        if (ch === '\\') j++;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '\\') j++;
      else if (ch === open) depth++;
      else if (ch === close) { depth--; if (depth === 0) return j + 1; }
    }
    return s.length;
  }

  const maxOf = (sels) => splitList(sels).map(complexSpec).reduce((m, s) => (compare(s, m) > 0 ? s : m), ZERO());

  /* Parts of one complex selector (no top-level commas). */
  function parts(sel) {
    const s = sel.trim();
    const out = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch) || ch === '>' || ch === '+' || ch === '~') {
        let j = i;
        while (j < s.length && (/\s/.test(s[j]) || s[j] === '>' || s[j] === '+' || s[j] === '~')) j++;
        const text = s.slice(i, j).trim() || ' ';
        out.push({ text, kind: 'combinator', spec: ZERO() });
        i = j;
      } else if (ch === '#') {
        const j = readIdent(s, i + 1);
        out.push({ text: s.slice(i, j), kind: 'id', spec: [1, 0, 0] });
        i = j;
      } else if (ch === '.') {
        const j = readIdent(s, i + 1);
        out.push({ text: s.slice(i, j), kind: 'class', spec: [0, 1, 0] });
        i = j;
      } else if (ch === '[') {
        const j = readGroup(s, i, '[', ']');
        out.push({ text: s.slice(i, j), kind: 'attribute', spec: [0, 1, 0] });
        i = j;
      } else if (ch === ':' && s[i + 1] === ':') {
        let j = readIdent(s, i + 2);
        if (s[j] === '(') j = readGroup(s, j, '(', ')');
        out.push({ text: s.slice(i, j), kind: 'pseudo-element', spec: [0, 0, 1] });
        i = j;
      } else if (ch === ':') {
        const nameEnd = readIdent(s, i + 1);
        const name = s.slice(i + 1, nameEnd).toLowerCase();
        let j = nameEnd;
        let args = null;
        if (s[j] === '(') {
          const end = readGroup(s, j, '(', ')');
          args = s.slice(j + 1, end - 1);
          j = end;
        }
        const text = s.slice(i, j);
        if (LEGACY_ELEMENTS.includes(name) && args === null) out.push({ text, kind: 'pseudo-element', spec: [0, 0, 1] });
        else if (name === 'where') out.push({ text, kind: 'where', spec: ZERO() });
        else if (MAX_OF_ARGS.includes(name) && args !== null) out.push({ text, kind: 'functional', spec: maxOf(args) });
        else if ((name === 'nth-child' || name === 'nth-last-child') && args !== null && /\sof\s/i.test(` ${args} `)) {
          const of = args.split(/\sof\s/i).slice(1).join(' of ');
          out.push({ text, kind: 'functional', spec: add([0, 1, 0], maxOf(of)) });
        } else out.push({ text, kind: 'pseudo-class', spec: [0, 1, 0] });
        i = j;
      } else if (ch === '*') {
        out.push({ text: '*', kind: 'universal', spec: ZERO() });
        i++;
      } else if (ch === '|') {
        i++;                                   // namespace separator: counts nothing
      } else if (isIdent(ch) || ch === '\\') {
        const j = readIdent(s, i);
        if (s[j] === '|' && s[j + 1] !== '=') { i = j + 1; continue; }   // ns|type: the namespace counts nothing
        out.push({ text: s.slice(i, j), kind: 'type', spec: [0, 0, 1] });
        i = j;
      } else {
        out.push({ text: ch, kind: 'unknown', spec: ZERO() });
        i++;
      }
    }
    return out;
  }

  function complexSpec(sel) {
    return parts(sel).reduce((acc, p) => add(acc, p.spec), ZERO());
  }

  const list = (sel) => splitList(String(sel)).map((selector) => ({ selector, spec: complexSpec(selector) }));

  function specificity(sel) {
    return list(sel).reduce((m, x) => (compare(x.spec, m) > 0 ? x.spec : m), ZERO());
  }

  /* Parts of a selector (for a list: the parts of every item, separated by ',' parts). */
  function explain(sel) {
    const out = [];
    splitList(String(sel)).forEach((item, k) => {
      if (k) out.push({ text: ',', kind: 'list', spec: ZERO() });
      out.push(...parts(item));
    });
    return out;
  }

  return { specificity, list, compare, explain, format, splitList };
})();

if (typeof module !== 'undefined') module.exports = SpecificityEngine;
