'use strict';

/* ==========================================================================
   Site search: the box in the app bar.
     buildDocs()   one document per concept card, quiz question and tool, read
                   from SECTIONS (js/sections/sections.js) and the Tools registry.
     SearchBar     the box, its result list (keyboard: ↑ ↓ Enter Esc, "/" or Ctrl+K
                   to focus) and the highlighting of the searched words in the page
                   a result opens. The engine itself is js/search-engine.js.
   The index is built the first time the box gets focus (a few milliseconds).
   Loaded before js/main.js so its hashchange handler runs after the router has
   drawn the new page.
   ========================================================================== */

const SearchBar = (() => {
  const form = document.getElementById('site-search');
  if (!form) return {};
  const input = form.querySelector('input');
  const list = form.querySelector('.search-list');
  const { plain, strings } = SearchEngine;
  // Technical fields of a card: ids, routing and demo wiring, not prose.
  const SKIP = new Set(['id', 'hub', 'topic', 'icon', 'dialect', 'live', 'widget', 'practice', 'answer', 'accept']);

  let index = null;
  let hits = [];
  let words = [];
  let active = -1;
  let pending = null;                   // words to highlight once the next page is drawn

  /* ---- The documents -------------------------------------------------------------------- */

  function buildDocs() {
    const docs = [];
    SECTIONS.forEach((s) => {
      const where = `${t(AREAS[s.area].title)} › ${t(s.title)}`;
      (s.data.concepts || []).forEach((c, k) => {
        const rest = strings({ ...c, title: undefined, summary: undefined }, SKIP);
        docs.push({ section: where, kind: t('Concept'), href: k === 0 ? s.base : `${s.base}/${c.id}`, title: plain(c.title || ''), summary: plain(c.summary || ''), body: rest.join(' · ') });
      });
      (s.data.quiz || []).forEach((q) => {
        const topicLabel = s.data.topics && s.data.topics[q.topic];
        docs.push({ section: where, kind: t('Quiz'), href: `${s.base}/quiz${q.topic ? `/${q.topic}` : ''}`, title: plain(q.q || ''), summary: '', body: strings([q.choices, q.why, topicLabel], SKIP).join(' · ') });
      });
      s.tools.forEach((id) => {
        docs.push({ section: where, kind: t('Tool'), href: `${s.base}/practice/${id}`, title: plain(Tools.title(id) || id), summary: plain(Tools.intro(id) || ''), body: '' });
      });
    });
    return docs;
  }

  const ensureIndex = () => index || (index = SearchEngine.create(buildDocs()));

  /* ---- Highlighting the searched words in the page ------------------------------------- */

  const CLASSES = { a: 'aáàäâã', e: 'eéèëê', i: 'iíìïî', o: 'oóòöôõ', u: 'uúùüû', n: 'nñ', c: 'cç' };
  const pattern = (word) => [...word].map((ch) => (CLASSES[ch] ? `[${CLASSES[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');

  function clearMarks(root) {
    if (!root) return;
    root.querySelectorAll('mark.search-hit').forEach((m) => { m.replaceWith(document.createTextNode(m.textContent)); });
    root.normalize();
  }

  /* Wraps every occurrence (word starts) of the searched words in <mark>; returns the first one. */
  function highlight(wordList) {
    const root = document.getElementById('view');
    if (!root || !wordList.length) return null;
    clearMarks(root);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${wordList.map(pattern).join('|')})[\\p{L}\\p{N}]*`, 'giu');
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('textarea, script, style, mark, .sr-only') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { re.lastIndex = 0; if (re.test(n.nodeValue)) nodes.push(n); }
    let first = null;
    let count = 0;
    nodes.forEach((n) => {
      if (count > 400) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      re.lastIndex = 0;
      for (let m = re.exec(n.nodeValue); m; m = re.exec(n.nodeValue)) {
        frag.append(n.nodeValue.slice(last, m.index));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = m[0];
        frag.append(mark);
        first = first || mark;
        last = m.index + m[0].length;
        count++;
      }
      frag.append(n.nodeValue.slice(last));
      n.replaceWith(frag);
    });
    if (first) {
      const details = first.closest('details');
      if (details) details.open = true;
      first.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      announce(count === 1 ? t('1 match highlighted on this page.') : t('{n} matches highlighted on this page.', { n: count }));
    }
    return first;
  }

  /* After the router draws the page (its hashchange handler runs first), mark the searched words. */
  const afterRender = () => {
    if (!pending) return;
    const w = pending;
    pending = null;
    requestAnimationFrame(() => requestAnimationFrame(() => highlight(w)));
  };
  window.addEventListener('hashchange', afterRender);

  /* ---- The result list ------------------------------------------------------------------ */

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function draw() {
    const q = input.value.trim();
    if (!q) { closeList(); list.innerHTML = ''; hits = []; return; }
    const r = ensureIndex().search(q);
    hits = r.hits;
    words = r.words;
    active = hits.length ? 0 : -1;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list.innerHTML = hits.length
      ? hits.map((h, i) => `<li role="option" id="sr-${i}" class="search-item" data-i="${i}" aria-selected="${i === active}">
          <span class="search-meta">${esc(h.doc.section)} · ${esc(h.doc.kind)}</span>
          <span class="search-title">${esc(h.doc.title)}</span>
          <span class="search-snip">${esc(h.snippet.before)}${h.snippet.hit ? `<mark>${esc(h.snippet.hit)}</mark>` : ''}${esc(h.snippet.after)}</span>
        </li>`).join('')
      : `<li class="search-none" role="presentation">${esc(t('No results for "{q}".', { q }))}</li>`;
    if (hits.length) input.setAttribute('aria-activedescendant', 'sr-0'); else input.removeAttribute('aria-activedescendant');
    announce(hits.length === 1 ? t('1 result.') : t('{n} results.', { n: hits.length }));
  }

  function mark(i) {
    active = i;
    list.querySelectorAll('.search-item').forEach((li, k) => {
      li.setAttribute('aria-selected', String(k === i));
      if (k === i) li.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', `sr-${i}`);
  }

  function open(i) {
    const h = hits[i];
    if (!h) return;
    pending = words.slice();
    closeList();
    if (location.hash === h.doc.href) { afterRender(); return; }          // already there: no hashchange
    location.hash = h.doc.href;
  }

  input.addEventListener('focus', () => { ensureIndex(); if (input.value.trim()) draw(); });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); mark((active + 1) % hits.length); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); mark((active - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hits.length) open(Math.max(active, 0)); }
    else if (e.key === 'Escape') {
      if (!list.hidden) closeList(); else { input.value = ''; clearMarks(document.getElementById('view')); }
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  list.addEventListener('mousedown', (e) => e.preventDefault());       // keep the focus in the box
  list.addEventListener('click', (e) => { const li = e.target.closest('.search-item'); if (li) open(+li.dataset.i); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#site-search') && !list.hidden) closeList(); });
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); input.focus(); input.select(); }
  });

  input.placeholder = t('Search this site…');
  input.setAttribute('aria-label', t('Search this site'));

  return { highlight };
})();
