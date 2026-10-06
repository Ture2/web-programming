'use strict';

/* ==========================================================================
   Loop engine (pure, no DOM; also runs in Node: site/test/loop-engine.test.mjs).
   LoopEngine.trace(templateId, params) → { code: [lines], steps, truncated, error }
   simulates one of a few small loop programs and records every step:
     { line, phase, vars: { name: value }, cond?: { expr, value }, out: [lines so far] }
   phase: 'init' | 'check' | 'body' | 'update' | 'after' (code after the loop).
   A run stops after MAX_STEPS steps (truncated: true) — an infinite loop.
   ========================================================================== */

const LoopEngine = (() => {
  const MAX_STEPS = 200;

  const TEMPLATES = {
    count: {
      title: 'Counting with for',
      params: { start: 0, end: 5, step: 1, cmp: '<' },
      code: (p) => [`for (let i = ${p.start}; i ${p.cmp} ${p.end}; i += ${p.step}) {`, '  console.log(i);', '}', "console.log('done');"],
    },
    sum: {
      title: 'Adding up (accumulator)',
      params: { n: 4 },
      code: (p) => ['let total = 0;', `for (let i = 1; i <= ${p.n}; i++) {`, '  total += i;', '}', 'console.log(total);'],
    },
    countdown: {
      title: 'Countdown with while',
      params: { start: 5, step: 1 },
      code: (p) => [`let n = ${p.start};`, 'while (n > 0) {', '  console.log(n);', `  n -= ${p.step};`, '}', "console.log('Liftoff!');"],
    },
    forof: {
      title: 'for…of over an array',
      params: { words: ['cat', 'horse', 'ox'] },
      code: (p) => [`const words = ${JSON.stringify(p.words)};`, 'const lengths = [];', 'for (const word of words) {', '  lengths.push(word.length);', '}', 'console.log(lengths);'],
    },
    nested: {
      title: 'Nested loops (times table)',
      params: { rows: 3, cols: 3 },
      code: (p) => [`for (let row = 1; row <= ${p.rows}; row++) {`, "  let line = '';", `  for (let col = 1; col <= ${p.cols}; col++) {`, "    line += row * col + ' ';", '  }', '  console.log(line);', '}'],
    },
  };

  const CMP = {
    '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, '!==': (a, b) => a !== b,
  };

  /* Console-like formatting of an array of numbers / strings. */
  const fmt = (v) => (Array.isArray(v) ? (v.length ? `[ ${v.map((x) => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ')} ]` : '[]') : String(v));

  function num(v, name) {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
    return n;
  }

  function trace(id, input = {}) {
    const tpl = TEMPLATES[id];
    if (!tpl) return { code: [], steps: [], truncated: false, error: `Unknown loop ${id}` };
    const p = { ...tpl.params, ...input };
    const steps = [];
    const out = [];
    let truncated = false;
    const push = (line, phase, vars, cond) => {
      if (steps.length >= MAX_STEPS) { truncated = true; return false; }
      steps.push({ line, phase, vars: { ...vars }, cond: cond || null, out: out.slice() });
      return true;
    };
    try {
      if (id === 'count') {
        p.start = num(p.start, 'start'); p.end = num(p.end, 'end'); p.step = num(p.step, 'step');
        if (!CMP[p.cmp]) throw new Error('unknown comparison');
        let i = p.start;
        push(0, 'init', { i });
        for (;;) {
          const ok = CMP[p.cmp](i, p.end);
          if (!push(0, 'check', { i }, { expr: `i ${p.cmp} ${p.end}`, value: ok })) break;
          if (!ok) break;
          out.push(String(i));
          if (!push(1, 'body', { i })) break;
          i += p.step;
          if (!push(0, 'update', { i })) break;
        }
        if (!truncated) { out.push('done'); push(3, 'after', {}); }
      } else if (id === 'sum') {
        p.n = num(p.n, 'n');
        let total = 0;
        push(0, 'init', { total });
        let i = 1;
        push(1, 'init', { total, i });
        for (;;) {
          const ok = i <= p.n;
          if (!push(1, 'check', { total, i }, { expr: `i <= ${p.n}`, value: ok })) break;
          if (!ok) break;
          total += i;
          if (!push(2, 'body', { total, i })) break;
          i++;
          if (!push(1, 'update', { total, i })) break;
        }
        if (!truncated) { out.push(String(total)); push(4, 'after', { total }); }
      } else if (id === 'countdown') {
        p.start = num(p.start, 'start'); p.step = num(p.step, 'step');
        let n = p.start;
        push(0, 'init', { n });
        for (;;) {
          const ok = n > 0;
          if (!push(1, 'check', { n }, { expr: 'n > 0', value: ok })) break;
          if (!ok) break;
          out.push(String(n));
          if (!push(2, 'body', { n })) break;
          n -= p.step;
          if (!push(3, 'update', { n })) break;
        }
        if (!truncated) { out.push('Liftoff!'); push(5, 'after', { n }); }
      } else if (id === 'forof') {
        if (!Array.isArray(p.words)) throw new Error('words must be an array');
        const words = p.words.map(String);
        const lengths = [];
        push(0, 'init', { words: fmt(words) });
        push(1, 'init', { words: fmt(words), lengths: fmt(lengths) });
        for (let k = 0; k <= words.length; k++) {
          const has = k < words.length;
          if (!push(2, 'check', has ? { word: `'${words[k]}'`, lengths: fmt(lengths) } : { lengths: fmt(lengths) }, { expr: has ? `next element: words[${k}]` : 'no elements left', value: has })) break;
          if (!has) break;
          lengths.push(words[k].length);
          if (!push(3, 'body', { word: `'${words[k]}'`, lengths: fmt(lengths) })) break;
        }
        if (!truncated) { out.push(fmt(lengths)); push(5, 'after', { lengths: fmt(lengths) }); }
      } else if (id === 'nested') {
        p.rows = num(p.rows, 'rows'); p.cols = num(p.cols, 'cols');
        let row = 1;
        push(0, 'init', { row });
        outer: for (;;) {
          const okR = row <= p.rows;
          if (!push(0, 'check', { row }, { expr: `row <= ${p.rows}`, value: okR })) break;
          if (!okR) break;
          let line = '';
          if (!push(1, 'body', { row, line: `'${line}'` })) break;
          let col = 1;
          if (!push(2, 'init', { row, line: `'${line}'`, col })) break;
          for (;;) {
            const okC = col <= p.cols;
            if (!push(2, 'check', { row, line: `'${line}'`, col }, { expr: `col <= ${p.cols}`, value: okC })) break outer;
            if (!okC) break;
            line += `${row * col} `;
            if (!push(3, 'body', { row, line: `'${line}'`, col })) break outer;
            col++;
            if (!push(2, 'update', { row, line: `'${line}'`, col })) break outer;
          }
          out.push(line);
          if (!push(5, 'body', { row, line: `'${line}'` })) break;
          row++;
          if (!push(0, 'update', { row })) break;
        }
      }
    } catch (e) {
      return { code: tpl.code(p), steps: [], truncated: false, error: e.message };
    }
    return { code: tpl.code(p), steps, truncated, error: null };
  }

  return { trace, TEMPLATES, MAX_STEPS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LoopEngine;
