'use strict';

/* ==========================================================================
   Shared helpers for every section.
   ========================================================================== */

/* Course data in the current language (see js/i18n.js). English fills any gap, with a warning. */
const langData = (key, fallback) => {
  if (DATA[LANG] && DATA[LANG][key]) return DATA[LANG][key];
  if (LANG !== 'en') console.warn(`[i18n] no ${LANG} data for ${key}; using English`);
  if (DATA.en[key]) return DATA.en[key];
  console.warn(`[data] missing ${key}`);
  return fallback;
};

/* The content of one section, from data/<lang>/<file>.js: PREFIX_CONCEPTS, PREFIX_QUIZ,
   PREFIX_QUIZ_TOPICS and PREFIX_GROUPS (rail hubs). */
const sectionData = (prefix) => ({
  concepts: langData(`${prefix}_CONCEPTS`, []),
  quiz: langData(`${prefix}_QUIZ`, []),
  topics: langData(`${prefix}_QUIZ_TOPICS`, {}),
  groups: langData(`${prefix}_GROUPS`, []),
});

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Escapes a text and then turns the only markup allowed in the data, **bold**, `code` and links to
   other pages of the site, [text](#/route), into HTML. Code spans are set aside first, so a
   bracket or asterisk inside code stays literal. */
const md = (s) => {
  const codes = [];
  return esc(s)
    .replace(/`(.+?)`/g, (m, c) => `\u0000${codes.push(c) - 1}\u0000`)
    .replace(/\[([^\]]+)\]\((#\/[\w\-/]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\u0000(\d+)\u0000/g, (m, k) => `<code>${codes[k]}</code>`);
};

const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" style="fill:var(--ok)"/><path d="M5.5 10.5l3 3 6-6.5" fill="none" style="stroke:var(--on-status)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" style="fill:var(--bad)"/><path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" fill="none" style="stroke:var(--on-status)" stroke-width="2" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" style="stroke:var(--muted)" stroke-width="1.6"/><path d="M10 9v5" style="stroke:var(--muted)" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" style="fill:var(--muted)"/></svg>',
};

/* Path of a section's summary PDF in the current language (built by tools/build-pdfs.mjs). */
const summaryPdf = (id) => `assets/pdf/${id}-${LANG}.pdf`;

/* A JSON value saved in the browser (this device only). Works, without saving, when storage is blocked. */
function makeStore(key) {
  return {
    key,
    load() {
      try { const d = JSON.parse(localStorage.getItem(key)); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; }
    },
    save(data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* no storage available */ }
      window.dispatchEvent(new CustomEvent('progress-change', { detail: key }));   // js/progress.js listens
    },
    clear() {
      try { localStorage.removeItem(key); } catch (e) { /* no storage available */ }
    },
  };
}

/* Solved challenge / exercise ids, saved in this browser as { [id]: 1 }. Parsed once and kept in
   memory (every write goes through mark), so pickers can ask isSolved() per button for free. */
function challengeStore(key) {
  const store = makeStore(key);
  let solved = null;
  const all = () => solved || (solved = store.load());
  return {
    key,
    isSolved: (id) => !!all()[id],
    count: (ids) => ids.filter((id) => all()[id]).length,
    /* true only the first time an id is solved */
    mark(id) {
      if (all()[id]) return false;
      solved = { ...all(), [id]: 1 };
      store.save(solved);
      return true;
    },
  };
}

/* fn delayed until calls stop for ms (typing in an editor, dragging, resizing). */
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/* Parses student HTML into an inert document: scripts never run, nothing is fetched. */
const parseHtml = (html) => new DOMParser().parseFromString(html, 'text/html');

/* Removes <script> elements and on* attributes from a parsed document (for previews in
   sandboxed iframes that allow scripts), and returns it. */
function inertHtml(doc) {
  doc.querySelectorAll('script').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); }));
  return doc;
}

/* querySelectorAll that reports an invalid selector instead of throwing: { nodes, error }. */
function queryAll(root, selector) {
  try { return { nodes: [...root.querySelectorAll(selector)], error: '' }; } catch (e) {
    return { nodes: [], error: t('“{s}” is not a valid CSS selector.', { s: selector }) };
  }
}

/* Keys shared by every code editor (textarea): Ctrl/Cmd+Enter runs, Tab indents two spaces,
   Escape then Tab leaves the editor (so keyboard users are never trapped). Returns true when handled. */
function codeEditorKeydown(e, onRun) {
  const ta = e.target;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onRun) { e.preventDefault(); onRun(); return true; }
  if (e.key === 'Escape') { ta.dataset.tabOut = '1'; return true; }
  if (e.key === 'Tab' && !e.shiftKey && !ta.dataset.tabOut) {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en, value } = ta;
    ta.value = `${value.slice(0, s)}  ${value.slice(en)}`;
    ta.selectionStart = ta.selectionEnd = s + 2;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  delete ta.dataset.tabOut;
  return false;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function announce(text) {
  const el = $('#sr-status');
  if (el) el.textContent = text;
}

/* Moves focus to an element and scrolls it into view if needed. */
function reveal(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* Runs a full re-render and gives back what the viewer had (matched by data-fid): focus, the caret
   and scroll position of a text field, and which <details data-fid> were open or closed. */
function keepFocus(fn) {
  const byFid = (id) => document.querySelector(`#view [data-fid="${CSS.escape(id)}"]`);
  const active = document.activeElement;
  const id = active && active.dataset ? active.dataset.fid : null;
  const caret = id && typeof active.selectionStart === 'number'
    ? { start: active.selectionStart, end: active.selectionEnd, top: active.scrollTop } : null;
  const open = [...document.querySelectorAll('#view details[data-fid]')].map((d) => [d.dataset.fid, d.open]);
  fn();
  open.forEach(([fid, isOpen]) => { const d = byFid(fid); if (d) d.open = isOpen; });
  if (!id) return;
  const el = byFid(id);
  if (!el || el.disabled) return;
  el.focus({ preventScroll: true });
  if (caret && typeof el.selectionStart === 'number') {
    el.setSelectionRange(caret.start, caret.end);
    el.scrollTop = caret.top;
  }
}

/* Code blocks and tables that scroll sideways (narrow screens) must be reachable by keyboard so
   they can be scrolled with the arrow keys: they get tabindex="0" only while they overflow. */
function focusableScrollers(scope = document) {
  scope.querySelectorAll('pre, .scroll').forEach((el) => {
    if (el.querySelector('a, button, input, select, textarea, [tabindex]')) return;
    const over = el.scrollWidth > el.clientWidth + 1;
    if (over && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    else if (!over && el.getAttribute('tabindex') === '0' && !el.dataset.fid) el.removeAttribute('tabindex');
  });
}

/* One item of a check list: { status: 'ok' | 'bad' | 'note', text }; the text may use the bold and code markup of md(). */
const checkItem = (c) => `<li>${ICON[c.status]}<span><span class="sr-only">${esc(c.status === 'ok' ? t('Correct: ') : c.status === 'bad' ? t('Problem: ') : t('Note: '))}</span>${md(c.text)}</span></li>`;
