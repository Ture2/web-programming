'use strict';

/* ==========================================================================
   Full-text search engine (no DOM): an inverted index built in the browser.
     term -> { document -> weighted frequency }, terms kept sorted so a typed
   prefix is a binary search. Accents and case are ignored. Fields weigh
   differently (title 6, summary 3, body 1) and are scored TF x IDF; every word
   of the query must appear in a document (if none does, documents with some of
   the words are shown). A word with no match is retried with one typo allowed.
   Used by js/search.js; unit-tested in test/search-engine.test.mjs.
   ========================================================================== */

const SearchEngine = (() => {
  const WEIGHT = { title: 6, summary: 3, body: 1 };

  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plain = (s) => String(s).replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
  const tokenize = (s) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 || /\d/.test(w));

  /* Every string inside a value (arrays and nested objects included), minus the technical keys. */
  function strings(v, skip, out = []) {
    if (typeof v === 'string') out.push(plain(v));
    else if (Array.isArray(v)) v.forEach((x) => strings(x, skip, out));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!skip.has(k)) strings(x, skip, out); });
    return out;
  }

  /* An index over documents { title, summary, body, ...anything else the caller wants back }. */
  function create(input) {
    const docs = input.map((d) => ({ ...d }));
    const postings = new Map();         // term -> Map(doc index -> weighted frequency)

    docs.forEach((doc, i) => {
      doc.len = 0;
      Object.entries(WEIGHT).forEach(([field, w]) => {
        tokenize(doc[field] || '').forEach((tok) => {
          doc.len++;
          let m = postings.get(tok);
          if (!m) postings.set(tok, (m = new Map()));
          m.set(i, (m.get(i) || 0) + w);
        });
      });
      doc.text = [doc.summary, doc.body].filter(Boolean).join(' · ');
      doc.foldedTitle = fold(doc.title);
      doc.foldedText = fold(doc.text);
    });
    const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(docs.length, 1);
    const terms = [...postings.keys()].sort();

    /* Index of the first term >= prefix (binary search). */
    function lowerBound(prefix) {
      let lo = 0;
      let hi = terms.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (terms[mid] < prefix) lo = mid + 1; else hi = mid; }
      return lo;
    }

    const withPrefix = (p) => {
      const out = [];
      for (let i = lowerBound(p); i < terms.length && terms[i].startsWith(p); i++) out.push(terms[i]);
      return out;
    };

    /* True when a and b differ by at most one insertion, deletion, substitution or swap. */
    function near(a, b) {
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      const x = a.slice(i);
      const y = b.slice(i);
      return x.slice(1) === y.slice(1) || x.slice(1) === y || x === y.slice(1) || (x.length > 1 && y.length > 1 && x[0] === y[1] && x[1] === y[0] && x.slice(2) === y.slice(2));
    }

    /* Dictionary words a typed word stands for: itself as a prefix, else words one typo away. */
    function expand(word) {
      const hit = withPrefix(word);
      if (hit.length || word.length < 4) return { words: hit, fuzzy: false };
      return { words: terms.filter((w) => near(word, w) || near(word, w.slice(0, word.length))), fuzzy: true };
    }

    /* Text around the first occurrence of one of the words, as { before, hit, after }. */
    function snippet(doc, words) {
      const text = doc.text || doc.title;
      const folded = fold(text);
      let at = -1;
      let len = 0;
      for (const w of words) {
        const m = new RegExp(`(?<![a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z0-9]*`).exec(folded);
        if (m && (at < 0 || m.index < at)) { at = m.index; len = m[0].length; }
      }
      if (at < 0) return { before: text.slice(0, 120), hit: '', after: '' };
      const from = Math.max(0, at - 50);
      const to = Math.min(text.length, at + len + 80);
      return { before: `${from ? '… ' : ''}${text.slice(from, at)}`, hit: text.slice(at, at + len), after: `${text.slice(at + len, to)}${to < text.length ? ' …' : ''}` };
    }

    /* -> { hits: [{ doc, score, snippet }], words: [searched words found in the index] } */
    function search(query, limit = 12) {
      const typed = tokenize(query);
      if (!typed.length) return { hits: [], words: [] };
      const N = docs.length;
      const per = typed.map((word) => {
        const { words, fuzzy } = expand(word);
        const scores = new Map();
        words.forEach((w) => {
          const post = postings.get(w);
          const idf = Math.log(1 + N / post.size);
          post.forEach((tf, d) => scores.set(d, (scores.get(d) || 0) + tf * idf * (w === word ? 1 : fuzzy ? 0.4 : 0.7)));
        });
        return { word, words, scores };
      });
      const known = per.filter((p) => p.scores.size);
      if (!known.length) return { hits: [], words: [] };
      let ids = [...known[0].scores.keys()].filter((d) => known.every((p) => p.scores.has(d)));
      if (!ids.length) ids = [...new Set(known.flatMap((p) => [...p.scores.keys()]))];     // no document has every word
      const phrase = typed.join(' ');
      const hits = ids.map((d) => {
        const doc = docs[d];
        let score = known.reduce((s, p) => s + (p.scores.get(d) || 0), 0) * (known.every((p) => p.scores.has(d)) ? 2 : 1);
        score /= Math.sqrt(1 + doc.len / avgLen);                       // long documents mention everything: damp them
        const titleWords = new Set(tokenize(doc.title));
        score *= 1 + known.filter((p) => p.words.some((w) => titleWords.has(w))).length / known.length;   // words in the title
        if (typed.length > 1 && doc.foldedTitle.includes(phrase)) score *= 3;       // the exact phrase in the title…
        else if (typed.length > 1 && doc.foldedText.includes(phrase)) score *= 1.5;  // …or in the text
        return { doc, score };
      }).sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
      const words = [...new Set(known.flatMap((p) => (p.words.length > 12 ? [p.word] : p.words.length ? [p.word, ...p.words.filter((w) => !w.startsWith(p.word))] : [p.word])))];
      hits.forEach((h) => { h.snippet = snippet(h.doc, words); });
      return { hits, words };
    }

    return { search, size: () => ({ docs: docs.length, terms: terms.length }) };
  }

  return { create, fold, plain, tokenize, strings };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SearchEngine;
