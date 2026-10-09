'use strict';

/* ==========================================================================
   Concept section engine, shared by every section (Web overview, HTML, CSS,
   JavaScript, DOM, Git): a navigation rail with hubs (the active hub lists its pages,
   the others open a flyout; the rail collapses to icons), an overview of the
   section, one page per hub (its concepts open one at a time, "Show all" opens
   them all) with Previous / Next between hubs, an optional quiz (multiple choice,
   true/false, fill in the blank) with the best score per topic, and an optional
   practice module drawn inside the same layout.
   Routes, below cfg.base: '' (the overview), <conceptId> (its hub's page, with that concept
   open), quiz[/<topic>], summary (the printable summary sheet, source of the section's PDF),
   and whatever cfg.practice.match(rest) accepts.

   Card fields: id, title, summary, body[], points[], html[] (authored HTML blocks, the
   tag allowlist is in test/card-html.test.mjs), diagram (js/diagram.js), table { caption,
   head, rows }, tables [table, …], code, dialect, example, mistake, practice { href, label? },
   live (a "Try it" box, js/live-runner.js), widget (a tool id, js/tools/registry.js).
   cfg: { base, title(), course(), badge, groups: [{ key, label, icon }] (a hub takes the cards
          whose `hub` is its key), concepts, moved? ({ oldCardId: route }: merged cards
          redirect), quiz?, topics?, quizKey?, perfectText(),
          nextLink?: { href, label() }, pdf: id of the summary PDF (tools/build-pdfs.mjs),
          practice?: { label, match(rest), links(rest | null) → [{ href, label, current }],
                       render(rest) → title (draws into #practice-slot) } }
   Events inside "Try it" boxes and tools are claimed by those modules first (js/main.js).
   ========================================================================== */

/* Rail icons (24×24, stroked). */
const RAIL_ICON = {
  steps: '<path d="M4 18h5v-4h5v-4h6"/><path d="M4 21h16"/>',
  pyramid: '<path d="M12 3 21 20H3Z"/><path d="M7.5 12h9M5.2 16h13.6"/>',
  files: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M4 7v14h11"/>',
  levels: '<path d="M12 3 21 8 12 13 3 8Z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  storage: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M17 16h.01"/>',
  index: '<rect x="9" y="3" width="6" height="4"/><rect x="3" y="15" width="6" height="4"/><rect x="15" y="15" width="6" height="4"/><path d="M12 7v4M6 15v-4h12v4"/>',
  lifecycle: '<path d="M20 12a8 8 0 0 1-14.3 4.9"/><path d="M4 12A8 8 0 0 1 18.3 7.1"/><path d="M18.5 3v4.2h-4.2"/><path d="M5.5 21v-4.2h4.2"/>',
  practice: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/><path d="M14 20h6"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14.5h18M9 9v11"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  special: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  split: '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="6" rx="1"/>',
  arrow: '<path d="M4 8h12"/><path d="M13 5l3 3-3 3"/><path d="M20 16H8"/><path d="M11 13l-3 3 3 3"/>',
  forms: '<path d="M4 20h4v-4H4Z"/><path d="M10 20h4v-8h-4Z"/><path d="M16 20h4V8h-4Z"/>',
  why: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  code: '<path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 4l-3 16"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  cluster: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/><path d="M7 6h.01M7 12h.01M7 18h.01"/>',
  speed: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4.5-6"/><path d="M4 18h16"/>',
  pdf: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M12.5 10v6"/><path d="M10 13.8l2.5 2.5 2.5-2.5"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 7v4M6 16v-3h12v3"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-11.2 7.5"/>',
  func: '<path d="M15 4h-2a3 3 0 0 0-3 3v10a3 3 0 0 1-3 3H5"/><path d="M7 11h8"/>',
  semantic: '<rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="9" width="12" height="12" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.7"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
  pipeline: '<path d="M3 12h4"/><rect x="7" y="8" width="4" height="8" rx="1"/><path d="M11 12h2"/><rect x="13" y="8" width="4" height="8" rx="1"/><path d="M17 12h4"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
  doc: '<path d="M8 4c-2 0-2 1.5-2 3v2c0 1.5-.8 2.5-2 3 1.2.5 2 1.5 2 3v2c0 1.5 0 3 2 3"/><path d="M16 4c2 0 2 1.5 2 3v2c0 1.5.8 2.5 2 3-1.2.5-2 1.5-2 3v2c0 1.5 0 3-2 3"/><path d="M10 9h4M10 12h4M10 15h2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  loop: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  component: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/>',
  state: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3"/><path d="M19.5 8.5A8 8 0 0 0 6 6.3"/><path d="M4.5 15.5A8 8 0 0 0 18 17.7"/><path d="M6 3v3.3h3.3M18 21v-3.3h-3.3"/>',
  fetch: '<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  share: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M10.6 7.2 6.4 16.8M13.4 7.2l4.2 9.6M7.5 19h9"/>',
  brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5Z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2 20 2 20s3.5.5 5.5-1.5S9 15 6 13Z"/>',
  collapse: '<path d="M14 6l-6 6 6 6"/><path d="M20 6l-6 6 6 6"/>',
  expand: '<path d="M10 6l6 6-6 6"/><path d="M4 6l6 6-6 6"/>',
};

const railIcon = (k) => `<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON[k] || ''}</svg>`;

/* Cards opened, per section ({ [base]: { [cardId]: 1 } }), parsed once and written through. */
const readCards = (() => {
  const store = makeStore('read-v1');
  let all = null;
  const load = () => all || (all = store.load());
  return {
    mine: (base) => load()[base] || {},
    mark(base, id) { all = { ...load(), [base]: { ...(load()[base] || {}), [id]: 1 } }; store.save(all); },
  };
})();

/* This viewer's layout choices, shared by every section: the rail collapsed, every concept of
   a hub shown (allOpen), "Try it" boxes open (tryOpen). */
const railUi = (() => {
  const store = makeStore('rail-ui-v1');
  const ui = Object.assign({ sideCollapsed: false }, store.load());
  return { ui, save: () => store.save(ui) };
})();

function ConceptSection(cfg) {
  const BASE = cfg.base;
  const groups = cfg.groups && cfg.groups.length ? cfg.groups : [{ key: 'all', label: cfg.title(), icon: 'code' }];
  const CONCEPTS = cfg.concepts || [];
  const QUIZ = cfg.quiz || [];
  const TOPICS = cfg.topics || {};
  const HAS_QUIZ = QUIZ.length > 0;
  const PRACTICE = cfg.practice || null;
  const VIDEOS = cfg.videos || [];
  const watchedStore = VIDEOS.length ? makeStore('video-watched-v2') : null;
  const isWatched = (id) => !!(watchedStore && watchedStore.load()[id]);
  const store = HAS_QUIZ ? makeStore(cfg.quizKey) : null;
  const best = store ? store.load() : {};              // topic ('all' or a key) -> best score
  const quiz = { topic: null, order: [], i: 0, score: 0, picked: null, typed: '', missed: [], done: false };
  let route = { page: 'concept', concept: 0, topic: 'all', rest: '' };
  let lastPage = null;                                  // to move focus only when navigating inside the section
  const { ui } = railUi;

  const view = () => $('#view');

  /* ---- Layout: sidebar (a dropdown on narrow screens) + main area ------------ */

  /* The section root is the overview; every concept, the first included, has its own route. */
  const conceptHref = (i) => `${BASE}/${CONCEPTS[i].id}`;

  /* Hubs with their concept indexes (static, computed once); a card whose hub is unknown joins the last hub. */
  const HUBS = (() => {
    const list = groups.map((g) => ({ ...g, items: [] }));
    CONCEPTS.forEach((c, k) => (list.find((g) => g.key === c.hub) || list[list.length - 1]).items.push(k));
    return list.filter((g) => g.items.length);
  })();
  const hubOf = (k) => HUBS.findIndex((h) => h.items.includes(k));
  /* The videos of a group (PREFIX_VIDEOS entries whose `group` is the group key), and the page of a video. */
  const videosOf = (h) => VIDEOS.filter((v) => v.group === h.key);
  const videoHref = (v) => VideoHtml.hrefOf(v, { base: BASE, concepts: CONCEPTS, groups });

  function sideHtml() {
    const onQuiz = route.page !== 'concept';         // the overview, a quiz or a practice page: no card is current
    const collapsed = ui.sideCollapsed;
    const conceptLink = (k) => `<li><a href="${conceptHref(k)}"${!onQuiz && k === route.concept ? ' aria-current="page"' : ''}><span class="rail-n">${k + 1}</span><span class="rail-text">${esc(CONCEPTS[k].title)}</span></a></li>`;

    const hubHtml = (h) => {
      const active = !onQuiz && h.items.includes(route.concept);
      const label = esc(t(h.label));
      return `<li class="rail-hub${active ? ' is-active' : ''}">
          <a class="rail-head" href="${conceptHref(h.items[0])}"${active ? ' aria-current="true"' : ''} title="${label}">${railIcon(h.icon)}<span class="rail-label">${label}</span></a>
          <div class="rail-pages">
            <p class="rail-fly-title" aria-hidden="true">${label}</p>
            <ol>${h.items.map(conceptLink).join('')}</ol>
          </div>
        </li>`;
    };

    const quizLink = (tp) => {
      const n = pool(tp).length;
      const b = best[tp] ? `<span class="rail-score" title="${esc(t('Best: {score} of {total}', { score: best[tp], total: n }))}">${best[tp]}/${n}</span>` : `<span class="rail-count">${n}</span>`;
      const cur = onQuizPage && route.topic === tp;
      return `<li><a href="${BASE}/quiz${tp === 'all' ? '' : `/${tp}`}"${cur ? ' aria-current="page"' : ''}><span class="rail-text">${esc(tp === 'all' ? t('All topics') : TOPICS[tp])}</span>${b}</a></li>`;
    };
    const quizLabel = esc(t('Test yourself'));
    const onQuizPage = route.page === 'quiz';
    const quizHub = !HAS_QUIZ ? '' : `<li class="rail-hub rail-quiz${onQuizPage ? ' is-active' : ''}">
        <a class="rail-head" href="${BASE}/quiz"${onQuizPage ? ' aria-current="true"' : ''} title="${quizLabel}">${railIcon('quiz')}<span class="rail-label">${quizLabel}</span></a>
        <div class="rail-pages">
          <p class="rail-fly-title" aria-hidden="true">${quizLabel}</p>
          <ol>${QUIZ_TOPICS.map(quizLink).join('')}</ol>
        </div>
      </li>`;

    /* The practice hub: links supplied by the practice module (exercise sets, quizzes). */
    const onPractice = route.page === 'practice';
    const pLinks = PRACTICE ? PRACTICE.links(onPractice ? route.rest : null) : [];
    const pLabel = PRACTICE ? esc(t(PRACTICE.label)) : '';
    const practiceHub = !PRACTICE ? '' : `<li class="rail-hub rail-practice${onPractice ? ' is-active' : ''}">
        <a class="rail-head" href="${pLinks[0].href}"${onPractice ? ' aria-current="true"' : ''} title="${pLabel}">${railIcon('practice')}<span class="rail-label">${pLabel}</span></a>
        <div class="rail-pages">
          <p class="rail-fly-title" aria-hidden="true">${pLabel}</p>
          <ol>${pLinks.map((l) => `<li><a href="${l.href}"${l.current ? ' aria-current="page"' : ''}><span class="rail-text">${esc(l.label)}</span></a></li>`).join('')}</ol>
        </div>
      </li>`;

    const toggle = collapsed ? t('Expand') : t('Collapse');
    const options = CONCEPTS.map((c, k) => `<option value="${conceptHref(k)}"${!onQuiz && k === route.concept ? ' selected' : ''}>${k + 1} · ${esc(c.title)}</option>`).join('');
    const quizOption = esc(t('Quiz: {n} questions', { n: QUIZ.length }));
    return `
      <nav class="rail" id="cs-side" aria-label="${esc(cfg.title())}">
        <a class="rail-top" href="${BASE}" title="${esc(cfg.title())}"${route.page === 'overview' ? ' aria-current="page"' : ''}><span class="rail-badge" aria-hidden="true">${esc(cfg.badge)}</span><span class="rail-label">${esc(cfg.title())}</span></a>
        ${pdfLink('rail-pdf')}
        <ul class="rail-hubs">${HUBS.map(hubHtml).join('')}</ul>
        <ul class="rail-hubs rail-hubs-end">${practiceHub}${quizHub}</ul>
        <button type="button" class="rail-toggle" data-action="toggle-side" data-fid="toggle-side" aria-expanded="${!collapsed}" title="${esc(toggle)}">${toggleInner()}</button>
      </nav>
      <div class="side-select">
        <label for="side-go">${esc(t('Go to'))}</label>
        <select id="side-go">
          <option value="${BASE}"${route.page === 'overview' ? ' selected' : ''}>${esc(t('Overview'))}</option>
          <optgroup label="${esc(t('Concepts'))}">${options}</optgroup>
          ${PRACTICE ? `<optgroup label="${pLabel}">${pLinks.map((l) => `<option value="${l.href}"${l.current ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}</optgroup>` : ''}
          ${HAS_QUIZ ? `<optgroup label="${esc(t('Test yourself'))}"><option value="${BASE}/quiz"${route.page === 'quiz' ? ' selected' : ''}>${quizOption}</option></optgroup>` : ''}
        </select>
        ${pdfLink('side-pdf')}
      </div>`;
  }

  /* Download link of the section's summary PDF, in the current language. */
  function pdfLink(cls) {
    if (!cfg.pdf) return '';
    const label = t('Summary (PDF)');
    const title = t('Download the summary of {section} (PDF)', { section: cfg.title() });
    return `<a class="${cls}" href="${summaryPdf(cfg.pdf)}" download title="${esc(title)}" aria-label="${esc(title)}">${railIcon('pdf')}<span class="rail-label">${esc(label)}</span></a>`;
  }

  const layout = (main, cls = '') => `<div class="cs-layout${ui.sideCollapsed ? ' is-collapsed' : ''}"><aside class="cs-aside">${sideHtml()}</aside><div class="cs-main${cls ? ` ${cls}` : ''}">${main}</div></div>`;

  const toggleLabel = () => (ui.sideCollapsed ? t('Expand') : t('Collapse'));
  const toggleInner = () => `${railIcon(ui.sideCollapsed ? 'expand' : 'collapse')}<span class="rail-label">${esc(toggleLabel())}</span>`;

  /* Collapses the rail to its icons, or expands it, in place; the choice is remembered. */
  function toggleSide() {
    ui.sideCollapsed = !ui.sideCollapsed;
    railUi.save();
    $('.cs-layout')?.classList.toggle('is-collapsed', ui.sideCollapsed);
    const btn = $('.rail-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', String(!ui.sideCollapsed));
      btn.title = toggleLabel();
      btn.innerHTML = toggleInner();
    }
    announce(ui.sideCollapsed ? t('Navigation collapsed') : t('Navigation expanded'));
  }

  /* ---- Concept cards (parts shared with the summary sheet) ----------------------- */

  const pointsHtml = (c) => (c.points && c.points.length ? `<ul class="plain">${c.points.map((p) => `<li>${md(p)}</li>`).join('')}</ul>` : '');
  const noteHtml = (cls, label, text) => (text ? `<p class="${cls}"><strong>${esc(t(label))}</strong> ${md(text)}</p>` : '');
  const tablesHtml = (c) => [c.table, ...(c.tables || [])].filter(Boolean).map(tableHtml).join('');

  /* Authored HTML blocks (trusted, allowlisted by a test): tables and code blocks get the
     card's own classes; the diagram goes where a block is <figure data-diagram></figure>,
     else after the first block. `only` filters the blocks (the summary sheet keeps lists). */
  const DIAGRAM_SLOT = '<figure data-diagram></figure>';
  const diagramHtml = (c) => (c.diagram ? Diagram.html(c.diagram, `dg-${c.id}`, md) : '');
  const blockHtml = (b) => (b.startsWith('<table') ? stackableTable(b) : b.replace(/^<pre>/, '<pre class="concept-code">'));

  /* On a narrow card the rows of an authored table stack (styles.css): each cell carries its
     column's name in data-label, and explicit roles keep the table semantics when the CSS
     changes its display. */
  function stackableTable(b) {
    const head = ((b.match(/<thead>([\s\S]*?)<\/thead>/) || [])[1] || '').match(/<th\b[^>]*>[\s\S]*?<\/th>/g) || [];
    const labels = head.map((h) => esc(h.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()));
    const rows = b.replace(/<tr>([\s\S]*?)<\/tr>/g, (m, cells) => {
      let k = 0;
      return `<tr role="row">${cells.replace(/<(th|td)\b([^>]*)>/g, (c, tag, attrs) => {
        const label = labels[k++] || '';
        const role = tag === 'td' ? 'cell' : / scope="col"/.test(attrs) ? 'columnheader' : 'rowheader';
        return `<${tag}${attrs} role="${role}"${tag === 'td' && label ? ` data-label="${label}"` : ''}>`;
      })}</tr>`;
    });
    const table = rows.replace('<table>', '<table class="src" role="table">').replace('<thead>', '<thead role="rowgroup">').replace('<tbody>', '<tbody role="rowgroup">');
    return `<div class="scroll concept-table">${table}</div>`;
  }
  function htmlBlocks(c, only) {
    const all = c.html || [];
    const keep = (b) => b === DIAGRAM_SLOT || !only || only.test(b);
    // A heading stays when the block it introduces stays.
    const blocks = all.filter((b, i) => keep(b) || (/^<h3>/.test(b) && i + 1 < all.length && keep(all[i + 1])));
    const dg = diagramHtml(c);
    // On the card the diagram follows the first block (the mental model); on the summary,
    // which drops paragraphs, it comes first.
    if (dg && !blocks.includes(DIAGRAM_SLOT)) blocks.splice(only ? 0 : Math.min(1, blocks.length), 0, DIAGRAM_SLOT);
    return blocks.map((b) => (b === DIAGRAM_SLOT ? dg : blockHtml(b))).join('');
  }
  const cxHtml = (c, only) => (c.html || c.diagram ? `<div class="cx">${htmlBlocks(c, only)}</div>` : '');

  const CHEVRON = '<svg class="cc-chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>';

  /* On a group page a "Try it" box or a tool is a disclosure. It starts closed until the reader
     opens one; from then on they start open on this device (closing one makes them start closed). */
  const tryHtml = (g, inner, label) => (!g ? inner : `<details class="try"${ui.tryOpen ? ' open' : ''}>
      <summary><span class="tool-badge">${esc(t('Try it'))}</span><span class="try-label">${esc(label)}</span>${CHEVRON}</summary>
      ${inner}
    </details>`);

  /* On a group page (g = { n, open, next? }) a concept is a disclosure: its title (a button)
     and its definition always show, the rest is a panel that opens one concept at a time.
     hidden="until-found" lets find-in-page reach a closed panel (beforematch opens it).
     The quiz call-out moves to the end of the group (groupQuizHtml). */
  function cardHtml(c, g) {
    const n = c.topic && !g ? pool(c.topic).length : 0;
    const topic = TOPICS[c.topic] || c.topic;
    const id = esc(c.id);
    const head = g
      ? `<h2 id="c-${id}-h" class="cc-h"><button type="button" class="cc-toggle" data-action="concept-toggle" data-id="${id}" data-fid="cc-${id}" aria-expanded="${g.open}" aria-controls="c-${id}-p"><span class="cc-n" aria-hidden="true">${g.n}</span><span class="cc-title">${esc(c.title)}</span>${CHEVRON}</button></h2>
          <p class="summary">${md(c.summary)}</p>
          <div class="concept-panel" id="c-${id}-p"${g.open ? '' : ' hidden="until-found"'}>`
      : `<h2 id="c-${id}-h" tabindex="-1">${esc(c.title)}</h2>
          <p class="summary">${md(c.summary)}</p>`;
    return `
      <article class="concept${g ? ` cc${g.open ? ' is-open' : ''}` : ''}" id="c-${id}" aria-labelledby="c-${id}-h">
        ${g ? head : ''}
        <div class="concept-text">
          ${g ? '' : head}
          ${(c.body || []).map((p) => `<p>${md(p)}</p>`).join('')}
          ${pointsHtml(c)}
          ${cxHtml(c)}
          ${c.html ? `${tablesHtml(c)}${c.code ? codeHtml(c) : ''}` : ''}
          ${noteHtml('example', 'Example.', c.example)}
          ${c.html ? '' : `${tablesHtml(c)}${c.code ? codeHtml(c) : ''}`}
          ${noteHtml('mistake', 'Common mistake.', c.mistake)}
        </div>
        ${c.live ? tryHtml(g, LiveRunner.html(c), t({ js: 'Edit the code and run it', react: 'Edit the component: the preview updates as you type' }[c.live.kind] || 'Edit the code: the preview updates as you type')) : ''}
        ${c.widget ? tryHtml(g, Tools.html(c.widget), Tools.title(c.widget)) : ''}
        ${c.practice ? `<aside class="concept-quiz concept-practice" aria-labelledby="cp-${esc(c.id)}">
            ${railIcon('practice').replace('rail-icon', 'cq-icon')}
            <div class="cq-text">
              <p class="cq-title" id="cp-${esc(c.id)}">${esc(t('Practise it'))}</p>
            </div>
            <a class="btn" href="${c.practice.href}">${esc(c.practice.label || t('Start the exercise'))}</a>
          </aside>` : ''}
        ${n ? `<aside class="concept-quiz" aria-labelledby="cq-${esc(c.id)}">
            ${railIcon('quiz').replace('rail-icon', 'cq-icon')}
            <div class="cq-text">
              <p class="cq-title" id="cq-${esc(c.id)}">${esc(t('Test yourself'))}</p>
              <p class="cq-sub">${esc(n === 1 ? t('1 question on {topic}', { topic }) : t('{n} questions on {topic}', { n, topic }))}</p>
            </div>
            <a class="btn" href="${BASE}/quiz/${esc(c.topic)}">${esc(t('Start the quiz'))}</a>
          </aside>` : ''}
        ${g && g.next ? `<p class="cc-next"><button type="button" class="btn ghost" data-action="concept-next" data-id="${esc(g.next.id)}">${esc(t('Next: {title}', { title: g.next.title }))} ↓</button></p>` : ''}
        ${g ? `<span class="concept-end" data-read="${id}" aria-hidden="true"></span></div>` : ''}
      </article>`;
  }

  /* A code block with its dialect label (e.g. shell). */
  const codeHtml = (c) => `${c.dialect ? `<p class="ss-label"><span class="dialect">${esc(c.dialect)}</span></p>` : ''}<pre class="concept-code"><code>${esc(c.code)}</code></pre>`;

  /* A small data table inside a card: { caption?, head: [...], rows: [[...]] }; cells use md(). */
  const tableHtml = (tb) => `<div class="scroll concept-table"><table class="src">${tb.caption ? `<caption>${md(tb.caption)}</caption>` : ''}
      <thead><tr>${tb.head.map((h) => `<th scope="col">${md(h)}</th>`).join('')}</tr></thead>
      <tbody>${tb.rows.map((r) => `<tr>${r.map((v, k) => (k === 0 ? `<th scope="row">${md(v)}</th>` : `<td>${md(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;

  /* A concept counts as read when the end of it scrolls into view (js/progress.js). */
  function markRead(id) {
    if (readCards.mine(BASE)[id]) return;
    readCards.mark(BASE, id);
  }

  /* Reading time: the card's own text (not the "Try it" code), at 200 words a minute. */
  const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\*\*|`/g, '');
  const wordsOf = (c) => plain([c.summary, ...(c.body || []), ...(c.points || []), ...(c.html || []), c.example, c.mistake].join(' ')).split(/\s+/).filter(Boolean).length;
  const minutes = (ks) => Math.max(1, Math.round(ks.reduce((n, k) => n + wordsOf(CONCEPTS[k]), 0) / 200));
  const groupMeta = (h) => {
    const tries = h.items.filter((k) => CONCEPTS[k].live || CONCEPTS[k].widget).length;
    return [
      h.items.length === 1 ? t('1 concept') : t('{n} concepts', { n: h.items.length }),
      t('about {n} min', { n: minutes(h.items) }),
      tries ? (tries === 1 ? t('1 thing to try') : t('{n} things to try', { n: tries })) : '',
    ].filter(Boolean).join(' · ');
  };

  /* Where the section goes when the last group is done. */
  function afterLastGroup() {
    if (HAS_QUIZ) return { href: `${BASE}/quiz`, label: t('Test yourself') };
    if (PRACTICE) return { href: PRACTICE.links(null)[0].href, label: t(PRACTICE.label) };
    return cfg.nextLink ? { href: cfg.nextLink.href, label: cfg.nextLink.label() } : null;
  }

  /* One "Test yourself" per group, with a button per quiz topic its concepts belong to
     (quiz topics were cut per card, so a group can span two). */
  function groupQuizHtml(h) {
    const topics = [...new Set(h.items.map((k) => CONCEPTS[k].topic).filter((tp) => tp && pool(tp).length))];
    if (!topics.length) return '';
    const n = topics.reduce((sum, tp) => sum + pool(tp).length, 0);
    const one = topics.length === 1;
    return `<aside class="concept-quiz" aria-labelledby="gq-title">
        ${railIcon('quiz').replace('rail-icon', 'cq-icon')}
        <div class="cq-text">
          <p class="cq-title" id="gq-title">${esc(t('Test yourself'))}</p>
          <p class="cq-sub">${esc(one ? t('{n} questions on {topic}', { n, topic: TOPICS[topics[0]] }) : t('{n} questions on this group', { n }))}</p>
        </div>
        <div class="gq-actions">${topics.map((tp) => `<a class="btn${one ? '' : ' ghost'}" href="${BASE}/quiz/${esc(tp)}">${esc(one ? t('Start the quiz') : `${TOPICS[tp]} (${pool(tp).length})`)}</a>`).join('')}</div>
      </aside>`;
  }

  /* The section root: every group with its concepts and their one-sentence definitions. */
  function renderOverview() {
    const all = CONCEPTS.map((c, k) => k);
    const blurb = cfg.blurb ? cfg.blurb() : '';
    view().innerHTML = layout(`
      <header class="group-head">
        <h1 id="ov-h" tabindex="-1">${esc(cfg.title())}</h1>
        ${blurb ? `<p class="story">${esc(blurb)}</p>` : ''}
        <p class="group-meta">${esc([HUBS.length === 1 ? t('1 group') : t('{n} groups', { n: HUBS.length }), t('{n} concepts', { n: CONCEPTS.length }), t('about {n} min of reading', { n: minutes(all) })].join(' · '))}</p>
        <p class="ov-actions">
          <a class="btn" href="${conceptHref(HUBS[0].items[0])}">${esc(t('Start with {group}', { group: t(HUBS[0].label) }))}</a>
          ${HAS_QUIZ ? `<a class="btn ghost" href="${BASE}/quiz">${esc(t('Test yourself'))}</a>` : ''}
          ${cfg.pdf ? `<a class="btn ghost" href="${summaryPdf(cfg.pdf)}" download>${esc(t('Summary (PDF)'))}</a>` : ''}
        </p>
      </header>
      ${VideoHtml.list(VIDEOS, { t, hrefFor: (v) => videoHref(v), watched: isWatched })}
      <ol class="ov-groups">
        ${HUBS.map((h, g) => `<li class="ov-group">
            <h2><span class="ov-n" aria-hidden="true">${g + 1}</span><a href="${conceptHref(h.items[0])}">${esc(t(h.label))}</a></h2>
            <p class="group-meta">${esc(groupMeta(h))}</p>
            <ul class="ov-list">${h.items.map((k) => `<li><a href="${conceptHref(k)}">${esc(CONCEPTS[k].title)}</a><span class="ov-sum">${md(CONCEPTS[k].summary)}</span></li>`).join('')}</ul>
          </li>`).join('')}
      </ol>`);
  }

  /* A group page: the group's concepts one after another, then its quiz and the next group. */
  function renderGroup() {
    const g = hubOf(route.concept);
    const h = HUBS[g];
    const prev = g > 0 ? { href: conceptHref(HUBS[g - 1].items[0]), label: t(HUBS[g - 1].label), kind: t('Previous') } : null;
    const last = afterLastGroup();
    const next = g < HUBS.length - 1
      ? { href: conceptHref(HUBS[g + 1].items[0]), label: t(HUBS[g + 1].label), kind: t('Next') }
      : last && { ...last, kind: t('Finished reading?') };
    view().innerHTML = layout(`
      <header class="group-head">
        <p class="concept-count"><a href="${BASE}">${esc(cfg.title())}</a> · ${esc(t('Group {n} of {total}', { n: g + 1, total: HUBS.length }))}</p>
        <h1 id="group-h" tabindex="-1">${esc(t(h.label))}</h1>
        <div class="group-head-row">
          <p class="group-meta">${esc(groupMeta(h))}</p>
          ${h.items.length > 1 ? `<p class="group-tools"><button type="button" class="btn ghost" data-action="concepts-all" data-fid="concepts-all" aria-pressed="${!!ui.allOpen}">${esc(t('Show all concepts'))}</button></p>` : ''}
        </div>
      </header>
      ${videosOf(h).map((v) => VideoHtml.figure(v, { t, watched: isWatched(v.id) })).join('')}
      <div class="group-body">${h.items.map((k, j) => cardHtml(CONCEPTS[k], {
        n: j + 1,
        open: !!ui.allOpen || h.items.length === 1 || k === route.concept,
        next: j < h.items.length - 1 ? CONCEPTS[h.items[j + 1]] : null,
      })).join('')}</div>
      <div class="group-end">${groupQuizHtml(h)}</div>
      <nav class="pager" aria-label="${esc(t('Groups'))}">
        ${prev ? `<a class="prev" href="${prev.href}"><span>← ${esc(prev.kind)}</span>${esc(prev.label)}</a>` : ''}
        ${next ? `<a class="next" href="${next.href}"><span>${esc(next.kind)} →</span>${esc(next.label)}</a>` : ''}
      </nav>`, 'is-group');
    watchGroup();
  }

  /* While a group page is open: mark each concept read when its end is seen, and keep the
     rail, the dropdown and the address on the concept being read (without a new history entry). */
  let observers = [];
  function watchGroup() {
    observers.forEach((o) => o.disconnect());
    observers = [];
    if (typeof IntersectionObserver === 'undefined') return;
    const ends = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { markRead(e.target.dataset.read); ProgressPage.updateButton(); }
    }), { rootMargin: '-120px 0px 0px 0px' });   // not the end of the concept just above a jump target
    view().querySelectorAll('.concept-end').forEach((el) => ends.observe(el));
    // With every concept shown, the one crossing the top quarter of the screen is the current one.
    const spy = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting && e.target.classList.contains('is-open')).pop();
      if (hit && hit.target.isConnected) setCurrent(CONCEPTS.findIndex((c) => `c-${c.id}` === hit.target.id));
    }, { rootMargin: '0px 0px -75% 0px' });
    view().querySelectorAll('.group-body > .concept').forEach((el) => spy.observe(el));
    observers = [ends, spy];
    // Find-in-page reached a closed panel: open it the same way a click would.
    view().querySelectorAll('.concept-panel').forEach((p) => p.addEventListener('beforematch', () => openConcept(p.closest('.concept'), false)));
    // An opened "Try it" box or tool measures itself again (it was laid out while closed).
    // The last choice becomes the default for every "Try it". A newly opened one measures itself again.
    view().querySelectorAll('details.try').forEach((d) => d.addEventListener('toggle', () => {
      if (!!ui.tryOpen !== d.open) { ui.tryOpen = d.open; railUi.save(); }
      if (d.open) window.dispatchEvent(new Event('resize'));
    }));
  }

  /* Rail, dropdown and address follow the current concept (no new history entry). */
  function setCurrent(k) {
    if (k < 0 || k === route.concept) return;
    route = { ...route, concept: k, rest: CONCEPTS[k].id };
    document.querySelectorAll('.rail-pages a[aria-current="page"]').forEach((a) => a.removeAttribute('aria-current'));
    $(`.rail-pages a[href="${conceptHref(k)}"]`)?.setAttribute('aria-current', 'page');
    const sel = $('#side-go');
    if (sel) sel.value = conceptHref(k);
    try { history.replaceState(null, '', conceptHref(k)); } catch (e) { /* file:// or sandbox */ }
  }

  function setOpen(art, open) {
    art.classList.toggle('is-open', open);
    art.querySelector('.cc-toggle').setAttribute('aria-expanded', String(open));
    const panel = art.querySelector('.concept-panel');
    if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', 'until-found');
  }

  /* Opens one concept and, unless every concept is shown, closes the others. Closing a long
     concept above it moves the page, so the opened title is brought back to the top. */
  function openConcept(art, scroll) {
    if (!ui.allOpen) view().querySelectorAll('.group-body > .cc.is-open').forEach((o) => { if (o !== art) setOpen(o, false); });
    setOpen(art, true);
    setCurrent(CONCEPTS.findIndex((c) => `c-${c.id}` === art.id));
    window.dispatchEvent(new Event('resize'));   // tools and scrollers measure again now that they are visible
    if (scroll && (art.getBoundingClientRect().top < 0 || art.getBoundingClientRect().top > innerHeight / 3)) art.scrollIntoView({ block: 'start' });
  }

  function toggleConcept(el) {
    const art = el.closest('.concept');
    if (art.classList.contains('is-open')) setOpen(art, false);
    else openConcept(art, true);
  }

  /* "Show all concepts": every panel open (to read straight through or print), remembered. */
  function toggleAll(btn) {
    ui.allOpen = !ui.allOpen;
    railUi.save();
    btn.setAttribute('aria-pressed', String(ui.allOpen));
    const arts = [...view().querySelectorAll('.group-body > .cc')];
    if (ui.allOpen) arts.forEach((a) => setOpen(a, true));
    else arts.forEach((a) => setOpen(a, a.id === `c-${CONCEPTS[route.concept].id}`));
    window.dispatchEvent(new Event('resize'));
    announce(ui.allOpen ? t('All concepts shown') : t('One concept at a time'));
  }

  /* Called by the router after it scrolled to the top: a link to a concept that is not the
     first of its group scrolls to it. Focus goes to the heading the reader lands on. */
  let target = null;
  function afterNavigate() {
    const t0 = target;
    target = null;
    if (!t0) return;
    const el = $(t0.selector);
    if (!el) return;
    if (t0.scroll) el.closest('.concept')?.scrollIntoView({ block: 'start' });
    if (t0.focus) el.focus({ preventScroll: true });
  }

  /* ---- Summary sheet (print source of the section PDF) ------------------------- */

  /* The card without its long paragraphs, widgets and call-outs. */
  const summaryCard = (c) => `<article class="ss-card">
      <h3>${esc(c.title)}</h3>
      <p class="summary">${md(c.summary)}</p>
      ${pointsHtml(c)}
      ${cxHtml(c, /^<(ul|ol|dl|table|pre)\b/)}
      ${tablesHtml(c)}
      ${c.code ? codeHtml(c) : ''}
      ${c.live && (c.live.kind === 'js' || c.live.kind === 'react') ? `<pre class="concept-code"><code>${esc(c.live.code)}</code></pre>` : ''}
      ${noteHtml('example', 'Example.', c.example)}
      ${noteHtml('mistake', 'Common mistake.', c.mistake)}
    </article>`;

  function renderSummary() {
    view().innerHTML = `
      <div class="summary-sheet">
        <header class="ss-head">
          <img src="assets/cunef-logo.png" width="114" height="40" alt="CUNEF Universidad">
          <div>
            <p class="ss-course">${esc(cfg.course())} · ${esc(t('Web Application Programming'))}</p>
            <h1>${esc(cfg.title())}: ${esc(t('summary'))}</h1>
          </div>
        </header>
        <nav class="ss-toc" aria-label="${esc(t('Contents'))}"><ol>${HUBS.map((h) => `<li><strong>${esc(t(h.label))}</strong>: ${h.items.map((k) => esc(CONCEPTS[k].title)).join(' · ')}</li>`).join('')}</ol></nav>
        ${HUBS.map((h) => `<section class="ss-hub"><h2>${esc(t(h.label))}</h2>${h.items.map((k) => summaryCard(CONCEPTS[k])).join('')}</section>`).join('')}
      </div>`;
    return `${t('Summary')} · ${cfg.title()}`;
  }

  /* ---- Quiz ---------------------------------------------------------------- */

  /* Question indexes per topic ('all' included), computed once. */
  const POOLS = { all: QUIZ.map((q, k) => k) };
  QUIZ.forEach((q, k) => { (POOLS[q.topic] = POOLS[q.topic] || []).push(k); });
  const pool = (topic) => POOLS[topic] || [];

  function startQuiz(topic) {
    Object.assign(quiz, { topic, order: shuffle(pool(topic)), i: 0, score: 0, picked: null, typed: '', missed: [], done: false });
  }

  const normAnswer = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isRight = (q, picked) => {
    if (q.type === 'fib') return q.accept.some((a) => normAnswer(a) === normAnswer(picked));
    if (q.type === 'tf') return picked === (q.answer ? 1 : 0);
    return picked === q.answer;
  };
  const answerText = (q) => (q.type === 'fib' ? q.accept[0] : q.type === 'tf' ? (q.answer ? t('True') : t('False')) : q.choices[q.answer]);

  /* 'all' plus every topic that has questions. */
  const QUIZ_TOPICS = ['all', ...Object.keys(TOPICS).filter((tp) => pool(tp).length)];

  function topicsHtml() {
    return `<div class="topic-pick">
        <label for="quiz-topic">${esc(t('Topic'))}</label>
        <select id="quiz-topic">${QUIZ_TOPICS.map((tp) => `<option value="${tp}"${quiz.topic === tp ? ' selected' : ''}>${esc(t('{topic} ({n} questions)', { topic: tp === 'all' ? t('All topics') : TOPICS[tp], n: pool(tp).length }))}</option>`).join('')}</select>
      </div>`;
  }

  function renderQuiz() {
    if (quiz.topic !== route.topic || !quiz.order.length) startQuiz(route.topic);
    if (!quiz.order.length) {
      view().innerHTML = layout(`<p class="story">${esc(t('There are no questions for this topic yet.'))}</p>`);
      return;
    }
    if (quiz.done) { renderQuizEnd(); return; }
    const q = QUIZ[quiz.order[quiz.i]];
    const answered = quiz.picked !== null;
    const right = answered && isRight(q, quiz.picked);
    const last = quiz.i === quiz.order.length - 1;

    let answerUi;
    if (q.type === 'fib') {
      answerUi = `<form class="fib" data-action="fib-form">
          <label for="fib-in">${esc(t('Your answer'))}</label>
          <div class="fib-row">
            <input id="fib-in" type="text" autocomplete="off" spellcheck="false" value="${esc(quiz.typed)}"${answered ? ' disabled' : ''}>
            <button type="submit" class="btn" data-fid="fib-go"${answered ? ' disabled' : ''}>${esc(t('Check'))}</button>
          </div>
        </form>`;
    } else {
      const labels = q.type === 'tf' ? [t('False'), t('True')] : q.choices;
      const order = q.type === 'tf' ? [1, 0] : labels.map((_, k) => k);
      const correctIdx = q.type === 'tf' ? (q.answer ? 1 : 0) : q.answer;
      answerUi = `<div class="options" role="group" aria-label="${esc(t('Choose an answer'))}">${order.map((k) => {
        let cls = 'opt';
        let tag = '';
        if (answered) {
          if (k === correctIdx) { cls += ' correct'; tag = `<span class="tag">${esc(t('Correct'))}</span>`; }
          else if (k === quiz.picked) { cls += ' wrong'; tag = `<span class="tag">${esc(t('Your answer'))}</span>`; }
        }
        const letter = q.type === 'mc' ? `<span class="letter">${'ABCDEFG'[k]}</span>` : '';
        return `<button type="button" class="${cls}" data-action="answer" data-i="${k}"${answered ? ' disabled' : ''}><span class="opt-text">${letter}<span>${md(labels[k])}</span></span>${tag}</button>`;
      }).join('')}</div>`;
    }

    const verdict = answered
      ? `<section class="feedback ${right ? 'ok' : 'bad'}" aria-labelledby="qf-title">
           <h3 id="qf-title" tabindex="-1">${esc(right ? t('Correct') : t('Not quite'))}</h3>
           <p>${right ? '' : `${md(t('The answer is “{answer}”.', { answer: answerText(q) }))} `}${md(q.why || '')}</p>
         </section>
         <p class="actions"><button type="button" class="btn" data-action="next" data-fid="next">${esc(last ? t('See result') : t('Next question'))}</button></p>`
      : '';

    const kind = { mc: t('Multiple choice'), tf: t('True or false'), fib: t('Fill in the blank') }[q.type];
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <p class="q-progress">${esc(t('Question {n} of {total} · {kind} · {topic}. Correct: {score}.', { n: quiz.i + 1, total: quiz.order.length, kind, topic: TOPICS[q.topic] || '', score: quiz.score }))}</p>
        <h2 id="q-title" class="q-text">${md(q.q).replace(/_{3,}/g, '<span class="blank">_____</span>')}</h2>
        ${answerUi}
        <div id="q-fb">${verdict}</div>
      </article>`);
  }

  function renderQuizEnd() {
    const total = quiz.order.length;
    const missed = quiz.missed.map((k) => QUIZ[k]);
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <h2 id="q-title" tabindex="-1">${esc(t('You got {score} of {total} right', { score: quiz.score, total }))}</h2>
        <p class="meta">${esc(t('Best result on this device for this topic: {best} of {total}.', { best: best[quiz.topic] || 0, total }))}</p>
        ${missed.length
          ? `<h3>${esc(t('To review'))}</h3><ul class="plain review">${missed.map((q) => `<li>${md(q.q).replace(/_{3,}/g, '_____')} <strong>${md(t('Answer: {answer}.', { answer: answerText(q) }))}</strong> ${md(q.why || '')}</li>`).join('')}</ul>`
          : `<p class="story">${esc(cfg.perfectText())}</p>`}
        <p class="actions">
          <button type="button" class="btn" data-action="restart" data-fid="restart">${esc(t('Repeat in a different order'))}</button>
          <a class="btn ghost" href="${BASE}">${esc(t('Review the concepts'))}</a>
          ${cfg.nextLink ? `<a class="btn ghost" href="${cfg.nextLink.href}">${esc(cfg.nextLink.label())}</a>` : ''}
        </p>
      </article>`);
    $('#q-title')?.focus({ preventScroll: true });
  }

  function answer(value) {
    if (quiz.picked !== null) return;
    const qi = quiz.order[quiz.i];
    quiz.picked = value;
    if (isRight(QUIZ[qi], value)) quiz.score++; else quiz.missed.push(qi);
    renderQuiz();
    reveal($('#qf-title'));
  }

  /* Events inside "Try it" boxes and tools never reach here: js/main.js gives them to those modules. */
  function onClick(el) {
    switch (el.dataset.action) {
      case 'answer': answer(+el.dataset.i); break;
      case 'next':
        if (quiz.i < quiz.order.length - 1) { quiz.i++; quiz.picked = null; quiz.typed = ''; }
        else {
          quiz.done = true;
          if (quiz.score > (best[quiz.topic] || 0)) { best[quiz.topic] = quiz.score; store.save(best); }
        }
        renderQuiz();
        (quiz.done ? $('#q-title') : $('#fib-in') || $('.options .opt'))?.focus({ preventScroll: true });
        break;
      case 'toggle-side': toggleSide(); break;
      case 'concept-toggle': toggleConcept(el); break;
      case 'concept-next': {
        const art = $(`#c-${CSS.escape(el.dataset.id)}`);
        if (art) { openConcept(art, true); art.querySelector('.cc-toggle').focus({ preventScroll: true }); }
        break;
      }
      case 'concepts-all': toggleAll(el); break;
      case 'video-watched':
        if (watchedStore) { const all = watchedStore.load(); all[el.dataset.id] = !!el.checked; watchedStore.save(all); }
        break;
      case 'restart':
        startQuiz(quiz.topic);
        renderQuiz();
        $('#q-title')?.focus({ preventScroll: true });
        break;
      default:
        break;
    }
  }

  function onSubmit(form) {
    if (form.dataset.action !== 'fib-form') return;
    const input = $('#fib-in');
    const v = input ? input.value.trim() : '';
    if (!v) { input?.focus(); return; }
    quiz.typed = v;
    answer(v);
  }

  /* The two dropdowns navigate as soon as a new option is picked. */
  function onChange(e) {
    const el = e.target;
    if (el.id === 'side-go') { location.hash = el.value; return; }
    if (el.id === 'quiz-topic') location.hash = `${BASE}/quiz${el.value === 'all' ? '' : `/${el.value}`}`;
  }

  function render(rest) {
    const r = rest || '';
    const m = r.match(/^quiz(?:\/([a-z-]+))?$/);
    const from = lastPage;
    if (PRACTICE && PRACTICE.match(r)) {
      route = { page: 'practice', concept: route.concept, topic: 'all', rest: r };
      lastPage = 'practice';
      view().innerHTML = layout('<div id="practice-slot"></div>');
      return `${PRACTICE.render(r)} · ${cfg.title()}`;
    }
    if (r === 'summary') {
      route = { page: 'summary', concept: route.concept, topic: 'all', rest: r };
      lastPage = 'summary';
      return renderSummary();
    }
    if (m && HAS_QUIZ) {
      route = { page: 'quiz', concept: route.concept, topic: m[1] && TOPICS[m[1]] ? m[1] : 'all', rest: r };
      lastPage = 'quiz';
      renderQuiz();
      return `${t('Test yourself')}${route.topic !== 'all' ? `: ${TOPICS[route.topic]}` : ''} · ${cfg.title()}`;
    }
    const i = CONCEPTS.findIndex((c) => c.id === r);
    // A card merged into another (cfg.moved): send old links and bookmarks to its new home.
    if (i < 0 && cfg.moved && cfg.moved[r]) {
      location.replace(cfg.moved[r]);
      return cfg.title();
    }
    observers.forEach((o) => o.disconnect());
    if (!CONCEPTS.length) {
      view().innerHTML = layout(`<p class="story">${esc(t('This section is being written.'))}</p>`);
      return cfg.title();
    }
    if (i < 0) {
      route = { page: 'overview', concept: route.concept, topic: 'all', rest: '' };
      lastPage = 'overview';
      renderOverview();
      target = from && from !== lastPage ? { selector: '#ov-h', focus: true } : null;
      return cfg.title();
    }
    route = { page: 'concept', concept: i, topic: 'all', rest: r };
    const h = HUBS[hubOf(i)];
    const first = h.items[0] === i;
    const page = `group-${hubOf(i)}`;
    renderGroup();
    // Put screen readers on the heading the reader lands on: the group's, or the concept's.
    target = { selector: first ? '#group-h' : `#c-${CSS.escape(CONCEPTS[i].id)}-h .cc-toggle`, scroll: !first, focus: !!from && (from !== page || !first) };
    lastPage = page;
    return first ? `${t(h.label)} · ${cfg.title()}` : `${CONCEPTS[i].title} · ${cfg.title()}`;
  }

  /* Console warnings for inconsistent quiz data. */
  (function selfTest() {
    QUIZ.forEach((q, i) => {
      const where = `${cfg.quizKey} question ${i}`;
      if (!TOPICS[q.topic]) console.warn(`${where}: unknown topic ${q.topic}`);
      if (q.type === 'mc' && !(q.answer >= 0 && q.answer < q.choices.length)) console.warn(`${where}: answer out of range`);
      if (q.type === 'fib' && !(q.accept && q.accept.length)) console.warn(`${where}: no accepted answers`);
    });
  })();

  /* For js/progress.js: reading and best quiz score ("all topics" run, or the sum of the topic runs). */
  function progress() {
    const mine = readCards.mine(BASE);
    const k = CONCEPTS.findIndex((c) => !mine[c.id]);
    const parts = [{ label: t('Reading'), done: CONCEPTS.filter((c) => mine[c.id]).length, total: CONCEPTS.length, next: k < 0 ? null : { href: conceptHref(k), label: CONCEPTS[k].title } }];
    if (HAS_QUIZ) {
      const byTopic = Object.entries(best).filter(([tp]) => tp !== 'all').reduce((sum, [, v]) => sum + (+v || 0), 0);
      parts.push({ label: t('Quiz'), done: Math.min(QUIZ.length, Math.max(+best.all || 0, byTopic)), total: QUIZ.length, next: { href: `${BASE}/quiz`, label: t('Test yourself') } });
    }
    parts.unshift(...VIDEOS.map((v) => ({ label: t('Watch: {title}', { title: v.title }), done: isWatched(v.id) ? 1 : 0, total: 1, next: { href: videoHref(v), label: t('Watch: {title}', { title: v.title }) } })));
    return parts;
  }

  /* For the home review queue: best score per quiz topic (not "all"), on this device. */
  function topicScores() {
    return QUIZ_TOPICS.filter((tp) => tp !== 'all').map((tp) => ({
      topic: tp, label: TOPICS[tp], href: `${BASE}/quiz/${tp}`, best: +best[tp] || 0, total: pool(tp).length, tried: tp in best,
    }));
  }

  return { render, afterNavigate, onClick, onChange, onSubmit, progress, topicScores, progressKeys: ['read-v1', ...(HAS_QUIZ ? [cfg.quizKey] : []), ...(VIDEOS.length ? ['video-watched-v2'] : [])], wide: true };
}
