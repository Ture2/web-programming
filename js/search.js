'use strict';

/* ==========================================================================
   Site search: the box in the app bar.
     buildDocs()   one document per concept card and tool, read from SECTIONS
                   (js/sections/sections.js) and the Tools registry. Only titles and
                   keywords are searched: a card's keywords are its rail group, its
                   quiz topic, the **bold** and `code` terms of its summary and an
                   optional authored `keywords` array.
     SearchBar     the box, the topic filter (one section or all), the result list
                   (keyboard: ↑ ↓ Enter Esc, "/" or Ctrl+K to focus), the recent
                   searches (saved in this browser) and the highlighting of the
                   searched words in the page a result opens. Nothing is searched
                   below MIN characters. The engine itself is js/search-engine.js.
   The index is built the first time the box gets focus (a few milliseconds).
   Loaded before js/main.js so its hashchange handler runs after the router has
   drawn the new page.
   ========================================================================== */

const SearchBar = (() => {
  const form = document.getElementById('site-search');
  if (!form) return {};
  const input = form.querySelector('input');
  const topic = form.querySelector('.search-topic');
  const list = form.querySelector('.search-list');
  const { plain, keyTerms, remember } = SearchEngine;
  const MIN = 3;                        // characters typed before anything is searched
  const recent = makeStore('search-recent-v1');

  let index = null;
  let items = [];                       // the list's options: { type: 'hit', hit } | { type: 'recent', q } | { type: 'clear' }
  let words = [];
  let active = -1;
  let pending = null;                   // words to highlight once the next page is drawn

  /* ---- The documents -------------------------------------------------------------------- */

  function buildDocs() {
    const docs = [];
    SECTIONS.forEach((s) => {
      const where = `${t(AREAS[s.area].title)} › ${t(s.title)}`;
      const group = (key) => (s.data.groups.find((g) => g.key === key) || {}).label;
      (s.data.concepts || []).forEach((c, k) => {
        const keywords = [...(c.keywords || []), group(c.hub), s.data.topics[c.topic], ...keyTerms(c.summary)];
        docs.push({ section: where, sectionId: s.id, kind: t('Concept'), href: k === 0 ? s.base : `${s.base}/${c.id}`, title: plain(c.title || ''), summary: plain(c.summary || ''), keywords: keywords.filter(Boolean).map(plain).join(' · ') });
      });
      s.tools.forEach((id) => {
        const intro = Tools.intro(id) || '';
        docs.push({ section: where, sectionId: s.id, kind: t('Tool'), href: `${s.base}/practice/${id}`, title: plain(Tools.title(id) || id), summary: plain(intro), keywords: keyTerms(intro).join(' · ') });
      });
    });
    return docs;
  }

  const ensureIndex = () => index || (index = SearchEngine.create(buildDocs()));

  /* ---- The topic filter: every section, grouped by area --------------------------------- */

  form.querySelector('label[for="search-topic"]').textContent = t('Topic');
  topic.options[0].textContent = t('All topics');
  Object.entries(AREAS).forEach(([area, a]) => {
    const og = document.createElement('optgroup');
    og.label = t(a.title);
    SECTIONS.filter((s) => s.area === area).forEach((s) => og.append(new Option(t(s.title), s.id)));
    if (og.children.length) topic.append(og);
  });

  /* ---- Recent searches (this browser only) ---------------------------------------------- */

  const recentList = () => { const l = recent.load().list; return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : []; };

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
      acceptNode: (n) => (n.parentElement.closest('textarea, script, style, mark, .sr-only, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
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

  function show(html) {
    list.innerHTML = html;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `sr-${active}`); else input.removeAttribute('aria-activedescendant');
  }

  const CLOCK = '<svg class="search-recent-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

  /* Under MIN characters nothing is searched: a hint (once something is typed) and the recent searches. */
  function drawShortcuts(q) {
    const saved = recentList();
    items = saved.length ? [...saved.map((x) => ({ type: 'recent', q: x })), { type: 'clear' }] : [];
    words = [];
    active = -1;
    if ((!q && !items.length) || document.activeElement !== input) { closeList(); return; }
    const row = (it, i) => (it.type === 'recent'
      ? `<li role="option" id="sr-${i}" class="search-item search-recent" data-i="${i}" aria-selected="false">${CLOCK}<span>${esc(it.q)}</span></li>`
      : `<li role="option" id="sr-${i}" class="search-item search-clear" data-i="${i}" aria-selected="false">${esc(t('Clear recent searches'))}</li>`);
    show((q ? `<li class="search-hint" role="presentation">${esc(t('Type at least {n} characters to search.', { n: MIN }))}</li>` : '')
      + (items.length ? `<li class="search-recent-h" role="presentation">${esc(t('Recent searches'))}</li>${items.map(row).join('')}` : ''));
  }

  function draw() {
    const q = input.value.trim();
    if (q.length < MIN) { drawShortcuts(q); return; }
    const section = topic.value;
    const r = ensureIndex().search(q, { where: section ? (d) => d.sectionId === section : undefined });
    const hits = r.hits;
    words = r.words;
    items = hits.map((hit) => ({ type: 'hit', hit }));
    active = hits.length ? 0 : -1;
    const none = section
      ? t('No results for "{q}" in {topic}.', { q, topic: topic.selectedOptions[0].textContent })
      : t('No results for "{q}".', { q });
    show(hits.length
      ? hits.map((h, i) => `<li role="option" id="sr-${i}" class="search-item" data-i="${i}" aria-selected="${i === active}">
          <span class="search-meta">${esc(h.doc.section)} · ${esc(h.doc.kind)}</span>
          <span class="search-title">${esc(h.doc.title)}</span>
          <span class="search-snip">${esc(h.snippet.before)}${h.snippet.hit ? `<mark>${esc(h.snippet.hit)}</mark>` : ''}${esc(h.snippet.after)}</span>
        </li>`).join('')
      : `<li class="search-none" role="presentation">${esc(none)}</li>`);
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

  function choose(i) {
    const it = items[i];
    if (!it) return;
    if (it.type === 'recent') { input.value = it.q; draw(); return; }
    if (it.type === 'clear') { recent.save({ list: [] }); draw(); return; }
    recent.save({ list: remember(recentList(), input.value) });           // a search that led somewhere
    pending = words.slice();
    closeList();
    if (location.hash === it.hit.doc.href) { afterRender(); return; }      // already there: no hashchange
    location.hash = it.hit.doc.href;
  }

  input.addEventListener('focus', () => { ensureIndex(); draw(); });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && list.hidden) { e.preventDefault(); draw(); }
    else if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); mark((active + 1) % items.length); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); mark(active > 0 ? active - 1 : items.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) choose(active); }
    else if (e.key === 'Escape') {
      if (!list.hidden) closeList(); else { input.value = ''; clearMarks(document.getElementById('view')); }
    }
  });
  // The focus stays on the select: on Windows its arrow keys fire 'change' at every step.
  topic.addEventListener('change', () => { if (input.value.trim().length >= MIN) draw(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  list.addEventListener('mousedown', (e) => e.preventDefault());       // keep the focus in the box
  list.addEventListener('click', (e) => { const li = e.target.closest('.search-item'); if (li) choose(+li.dataset.i); });
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
